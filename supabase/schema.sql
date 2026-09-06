-- ============================================================================
-- Undiscovered Macedonia — "Meet Travellers" backend
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- one row per signed-in traveller
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  country     text,
  age         int check (age is null or age between 16 and 120),
  pace        text check (pace in ('Relaxed', 'Balanced', 'Fast')),
  from_date   date,
  to_date     date,
  interests   text[] not null default '{}',
  bio         text,
  updated_at  timestamptz not null default now()
);

-- one row per swipe
create table if not exists public.swipes (
  swiper   uuid not null references public.profiles(id) on delete cascade,
  target   uuid not null references public.profiles(id) on delete cascade,
  liked    boolean not null,
  at       timestamptz not null default now(),
  primary key (swiper, target),
  check (swiper <> target)
);

-- a match is materialised when both people liked each other
create table if not exists public.matches (
  a   uuid not null references public.profiles(id) on delete cascade,
  b   uuid not null references public.profiles(id) on delete cascade,
  at  timestamptz not null default now(),
  primary key (a, b),
  check (a < b)                    -- store each pair once, smaller id first
);

create table if not exists public.messages (
  id       bigint generated always as identity primary key,
  match_a  uuid not null,
  match_b  uuid not null,
  sender   uuid not null references public.profiles(id) on delete cascade,
  body     text not null check (char_length(body) between 1 and 2000),
  at       timestamptz not null default now(),
  foreign key (match_a, match_b) references public.matches(a, b) on delete cascade
);

create index if not exists messages_match_idx on public.messages (match_a, match_b, at);

-- ---------------------------------------------------------------------------
-- 2. Turn a mutual "like" into a match (trigger)
-- ---------------------------------------------------------------------------

create or replace function public.on_swipe() returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  lo uuid;
  hi uuid;
begin
  if new.liked and exists (
    select 1 from public.swipes
    where swiper = new.target and target = new.swiper and liked
  ) then
    lo := least(new.swiper, new.target);
    hi := greatest(new.swiper, new.target);
    insert into public.matches (a, b) values (lo, hi) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists swipe_to_match on public.swipes;
create trigger swipe_to_match
  after insert on public.swipes
  for each row execute function public.on_swipe();

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.swipes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;

-- Make sure the API roles can reach the tables at all (RLS above still gates
-- every row). This keeps setup working whether or not "expose new tables" was
-- ticked when the project was created.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.swipes, public.matches, public.messages
  to authenticated;
grant execute on function public.discover_profiles(int) to authenticated;

-- profiles: any signed-in user can read; you may only write your own row
drop policy if exists "profiles read"      on public.profiles;
drop policy if exists "profiles write own" on public.profiles;
create policy "profiles read"
  on public.profiles for select
  to authenticated
  using (true);
create policy "profiles write own"
  on public.profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- swipes: you may only see and create your own
drop policy if exists "swipes own" on public.swipes;
create policy "swipes own"
  on public.swipes for all
  to authenticated
  using (swiper = auth.uid())
  with check (swiper = auth.uid());

-- matches: visible only to the two people in them; never written from the client
drop policy if exists "matches own" on public.matches;
create policy "matches own"
  on public.matches for select
  to authenticated
  using (auth.uid() = a or auth.uid() = b);

-- messages: read/write only inside a match you belong to, and only as yourself
drop policy if exists "messages read" on public.messages;
drop policy if exists "messages send" on public.messages;
create policy "messages read"
  on public.messages for select
  to authenticated
  using (auth.uid() = match_a or auth.uid() = match_b);
create policy "messages send"
  on public.messages for insert
  to authenticated
  with check (
    sender = auth.uid()
    and (auth.uid() = match_a or auth.uid() = match_b)
    and exists (
      select 1 from public.matches
      where a = least(match_a, match_b) and b = greatest(match_a, match_b)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Discovery: candidates for the current user to swipe on
--    (interest-overlap ordering is awkward over REST, so expose it as an RPC)
-- ---------------------------------------------------------------------------

create or replace function public.discover_profiles(limit_count int default 30)
returns setof public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  with me as (select * from public.profiles where id = auth.uid())
  select p.*
  from public.profiles p, me
  where p.id <> me.id
    and p.id not in (select target from public.swipes where swiper = me.id)
    and (
      me.from_date is null or me.to_date is null
      or p.from_date is null or p.to_date is null
      or (p.from_date <= me.to_date and p.to_date >= me.from_date)
    )
  order by
    cardinality(
      array(
        select unnest(p.interests)
        intersect
        select unnest(me.interests)
      )
    ) desc,
    p.updated_at desc
  limit greatest(1, least(limit_count, 100));
$$;

-- ---------------------------------------------------------------------------
-- 5. Realtime — let the client subscribe to new matches and messages
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- Done. Next: Dashboard → Authentication → Providers → enable "Email"
-- (magic link is on by default). For local testing you can also turn off
-- "Confirm email" under Authentication → Sign In / Providers.
-- ============================================================================
