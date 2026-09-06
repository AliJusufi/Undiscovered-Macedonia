# Meet Travellers — live backend setup

This turns the `travelers-live.html` page from a locked screen into a working
app with real accounts, a database, live matches and live chat.

Time: ~15 minutes. Cost: free (Supabase free tier, no card).

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in with GitHub.
2. **New project** → name it `undiscovered-macedonia` → pick a region near you
   (e.g. Frankfurt) → set a database password (save it somewhere) → **Create**.
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the tables

1. Left sidebar → **SQL Editor** → **New query**.
2. Open [`schema.sql`](schema.sql) in VS Code, copy the whole file, paste it in.
3. Click **Run**. You should see "Success. No rows returned".

This creates the `profiles`, `swipes`, `matches`, `messages` tables, the
mutual-like trigger, the row-level-security policies, the `discover_profiles`
function, and enables realtime.

## 3. Turn on email sign-in

1. Left sidebar → **Authentication** → **Sign In / Providers**.
2. Make sure **Email** is enabled (it is by default — magic link).
3. For easy testing, scroll to **Email** settings and turn **Confirm email**
   _off_. (Turn it back on before any real deployment.)

## 4. Connect the site

1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy **Project URL** and the **`anon` `public`** key.
3. Open [`../travelers-config.js`](../travelers-config.js) and paste them in:

   ```js
   window.UM_SUPABASE = {
     url: "https://xxxxxxxx.supabase.co",
     anonKey: "eyJhbGciOi...",
   };
   ```

Both are safe to commit — the anon key can only do what the RLS policies allow.

## 5. Seed some demo travellers

So discovery and screenshots don't show `a@test.com`, create ~6 realistic
accounts in one go:

```powershell
$env:SUPABASE_URL = "https://enpzsvxtdpjsqpirzmub.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role key from Settings -> API>"
npm run seed
```

This creates Lena, Marco, Priya, Tom, Sofia and Amara with overlapping
interests and travel dates, all confirmed, all with the password
`traveller2026`. Re-running just refreshes their profiles.

The **service_role key bypasses security** — only use it in this local
command, never in a file the browser loads and never in git.

## 6. Test it

1. `npm run dev`, open <http://localhost:4173/travelers-live.html>.
2. Sign in as `lena@demo.undiscovered` / `traveller2026` (password field), or
   use your own email with the password blank to get a magic link.
3. Fill your profile and save — the seeded travellers appear in the deck.
4. **To see a match**, sign in as one of them in a private/incognito window
   and Connect back. The match modal and chat appear live in both.

---

## How it maps to the prototype

| Prototype (`travelers.js`)              | Live (`travelers-live.js`)                                 |
| --------------------------------------- | ---------------------------------------------------------- |
| `SEED` array of 14 people               | `supabase.rpc('discover_profiles')`                        |
| `localStorage` seen map                 | `swipes` table                                             |
| `decide()` "≥2 shared interests or 35%" | insert into `swipes`; the `swipe_to_match` trigger decides |
| poll nothing                            | `postgres_changes` realtime subscription on `matches`      |
| `replyTo()` canned replies              | `messages` table + realtime subscription                   |
| no identity                             | `supabase.auth.signInWithOtp` (magic link)                 |

The card deck, drag, match modal and chat window are copied unchanged — the diff
between the two files is exactly the "prototype → production" seam.

## Not included (real deployment would add)

Blocking/reporting, message moderation, an 18+ age gate, a privacy policy and
account deletion, and rate limiting on swipes and messages. See the bottom of
`../MATCHING-BACKEND.md`.
