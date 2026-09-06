# "Meet Travellers" — from prototype to a real backend

The current feature (`travelers.html` + `travelers.js`) is a **front-end prototype**:
the other travellers are 14 samples hard-coded in the file, the match decision is made
in the browser, and the chat replies come from a rule-based function. Everything is
stored in the visitor's own `localStorage`.

This document describes what a production version needs and gives the concrete schema
and code changes. It is written so it can be built, or cited in the thesis as future work.

---

## What has to move server-side

| Piece | Prototype | Production |
|---|---|---|
| **Identity** | none | each person is a signed-in account |
| **Profiles** | `SEED` array | rows in a `profiles` table, read by everyone |
| **Swipes** | `localStorage` map | rows in a `swipes` table |
| **Matching** | `≥2 shared interests OR 35% chance`, in the browser | a match exists only when **both** people swiped "like" — decided by the database |
| **Chat** | `replyTo()` canned text | real messages between two people, delivered live |
| **Storage** | one browser | a database, so state follows the user to any device |

---

## Recommended stack: Supabase

[Supabase](https://supabase.com) is Postgres plus authentication, row-level security
and realtime subscriptions, with a generous free tier. It removes almost all of the
backend code — the browser talks to Supabase directly, and Postgres policies enforce
who can see what.

### 1. Tables

```sql
-- a row per signed-in traveller
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  country     text,
  age         int,
  pace        text check (pace in ('Relaxed','Balanced','Fast')),
  from_date   date,
  to_date     date,
  interests   text[] not null default '{}',
  bio         text,
  updated_at  timestamptz default now()
);

-- a row per swipe
create table swipes (
  swiper   uuid references profiles(id) on delete cascade,
  target   uuid references profiles(id) on delete cascade,
  liked    boolean not null,
  at       timestamptz default now(),
  primary key (swiper, target)
);

-- a match is materialised when both liked each other
create table matches (
  a        uuid references profiles(id) on delete cascade,
  b        uuid references profiles(id) on delete cascade,
  at       timestamptz default now(),
  primary key (a, b),
  check (a < b)                 -- store each pair once, smaller id first
);

create table messages (
  id       bigint generated always as identity primary key,
  match_a  uuid not null,
  match_b  uuid not null,
  sender   uuid not null references profiles(id) on delete cascade,
  body     text not null,
  at       timestamptz default now(),
  foreign key (match_a, match_b) references matches(a, b) on delete cascade
);
```

### 2. Turn a mutual like into a match (database trigger)

```sql
create or replace function on_swipe() returns trigger as $$
declare lo uuid; hi uuid;
begin
  if new.liked and exists (
    select 1 from swipes
    where swiper = new.target and target = new.swiper and liked
  ) then
    lo := least(new.swiper, new.target);
    hi := greatest(new.swiper, new.target);
    insert into matches (a, b) values (lo, hi) on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger swipe_to_match after insert on swipes
for each row execute function on_swipe();
```

### 3. Row-level security (who can read/write what)

```sql
alter table profiles enable row level security;
alter table swipes   enable row level security;
alter table matches  enable row level security;
alter table messages enable row level security;

-- everyone signed in can read profiles; you can only write your own
create policy "read profiles"  on profiles for select using (auth.role() = 'authenticated');
create policy "write own"      on profiles for all    using (id = auth.uid());

-- you can only insert your own swipes, and only read your own
create policy "own swipes" on swipes for all using (swiper = auth.uid());

-- you can see a match only if you are in it
create policy "own matches" on matches for select
  using (a = auth.uid() or b = auth.uid());

-- you can read/write messages only in a match you are part of
create policy "own messages" on messages for all
  using (auth.uid() in (match_a, match_b));
```

### 4. Discovery query (candidates to swipe)

```sql
select p.*
from profiles p
where p.id <> auth.uid()
  and p.id not in (select target from swipes where swiper = auth.uid())
  -- overlapping travel dates
  and p.from_date <= (select to_date   from profiles where id = auth.uid())
  and p.to_date   >= (select from_date from profiles where id = auth.uid())
order by
  cardinality(
    array(select unnest(p.interests)
          intersect
          select unnest(interests) from profiles where id = auth.uid())
  ) desc,
  p.updated_at desc
limit 20;
```

---

## Changes to `travelers.js`

The front-end barely changes — only the data layer.

| Now | Replace with |
|---|---|
| `SEED` array | `supabase.from('profiles').select().<discovery query>` |
| `LS.get/LS.set` | `supabase.from(...).insert/select` |
| `decide()`'s match rule | `supabase.from('swipes').insert({ target, liked })` — the trigger decides the match |
| polling for matches | `supabase.channel('matches').on('postgres_changes', …)` — realtime |
| `replyTo()` | delete it; `supabase.channel('messages:'+matchId).on('INSERT', renderMessage)` |
| profile save | `supabase.from('profiles').upsert({ id: user.id, …fields })` |

Auth is `supabase.auth.signInWithOtp({ email })` (magic link) or
`signInWithOAuth({ provider: 'google' })`.

---

## What a real deployment also needs

- **Blocking and reporting** — a `blocks` table, filtered out of discovery.
- **Moderation** — profanity / abuse checks on messages and bios.
- **Age gate** — 18+ confirmation at sign-up.
- **Consent & data protection** — a privacy policy, the right to delete your account
  and data (Supabase: `delete from auth.users` cascades).
- **Rate limiting** on swipes and messages.
- **Photos** — Supabase Storage with a moderation step, or keep the initials avatars.

---

## Why the prototype was built this way

The front-end was written so that this transition is a **data-layer swap, not a rewrite**.
The card deck, the drag interaction, the match modal and the chat window are all reused
unchanged. The header comment in `travelers.js` names the two functions that change.
Being able to point at that seam — and at this schema — is the "prototype → production"
result the project can claim.
