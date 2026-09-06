/* ===== Meet Travellers — demo data seeder =====
   Creates a handful of confirmed accounts with realistic profiles so the
   discovery deck and screenshots don't show "a@test.com". Idempotent:
   re-running updates the profiles and leaves the accounts alone.

   Usage (PowerShell, from the project root):

     $env:SUPABASE_URL = "https://enpzsvxtdpjsqpirzmub.supabase.co"
     $env:SUPABASE_SERVICE_ROLE_KEY = "<the service_role key>"
     node supabase/seed.mjs

   The service_role key is under Project Settings -> API -> "service_role"
   (or "secret keys"). It bypasses row-level security, so NEVER put it in
   any file the browser loads or commit it. This script only uses it locally.

   Every demo account uses the password below so you can sign in as any of
   them for screenshots.
   ============================================================== */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = "traveller2026";

if (!URL || !KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (see the header of this file)."
  );
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// dates: a two-week window starting a few days from now, so everyone overlaps
const d = (offset) => {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t.toISOString().slice(0, 10);
};

const PEOPLE = [
  {
    email: "lena@demo.mk",
    name: "Lena",
    country: "Germany",
    age: 28,
    pace: "Balanced",
    from_date: d(2),
    to_date: d(20),
    interests: ["Hiking", "Photography", "Slow travel", "Local markets"],
    bio: "Three weeks around the Balkans. Want to walk in Mavrovo and Pelister, camera in hand.",
  },
  {
    email: "marco@demo.mk",
    name: "Marco",
    country: "Italy",
    age: 34,
    pace: "Relaxed",
    from_date: d(0),
    to_date: d(14),
    interests: ["Wine", "Food tours", "History", "Architecture"],
    bio: "Here for Tikveš wineries and Ohrid. Looking for people to share long lunches with.",
  },
  {
    email: "priya@demo.mk",
    name: "Priya",
    country: "India",
    age: 25,
    pace: "Fast",
    from_date: d(4),
    to_date: d(18),
    interests: ["Museums", "History", "Architecture", "Photography"],
    bio: "Art history student. Skopje and Ohrid churches are the whole reason I came.",
  },
  {
    email: "tom@demo.mk",
    name: "Tom",
    country: "UK",
    age: 31,
    pace: "Balanced",
    from_date: d(1),
    to_date: d(12),
    interests: ["Hiking", "Kayaking", "Camping", "Swimming"],
    bio: "Trail runner. Planning Matka kayaking and a night on Pelister. Keen for a hiking buddy.",
  },
  {
    email: "sofia@demo.mk",
    name: "Sofia",
    country: "Portugal",
    age: 27,
    pace: "Relaxed",
    from_date: d(3),
    to_date: d(21),
    interests: ["Food tours", "Local markets", "Slow travel", "Swimming"],
    bio: "No plan, just Ohrid, a lake, and good food. Happy to be shown around.",
  },
  {
    email: "amara@demo.mk",
    name: "Amara",
    country: "USA",
    age: 30,
    pace: "Balanced",
    from_date: d(0),
    to_date: d(16),
    interests: ["Photography", "History", "Wine", "Road trips"],
    bio: "Renting a car for a week. Room for two more on a Kruševo + Bitola loop.",
  },
];

async function findUserByEmail(email) {
  // paginate through users (fine for a small project)
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

for (const p of PEOPLE) {
  let user = await findUserByEmail(p.email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: p.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ! ${p.email}: ${error.message}`);
      continue;
    }
    user = data.user;
    console.log(`  + created ${p.email}`);
  } else {
    console.log(`  = ${p.email} already exists`);
  }

  const { error: upErr } = await sb.from("profiles").upsert({
    id: user.id,
    name: p.name,
    country: p.country,
    age: p.age,
    pace: p.pace,
    from_date: p.from_date,
    to_date: p.to_date,
    interests: p.interests,
    bio: p.bio,
    updated_at: new Date().toISOString(),
  });
  if (upErr) console.error(`  ! profile ${p.name}: ${upErr.message}`);
  else console.log(`  ~ profile saved: ${p.name}`);
}

console.log(`\nDone. Sign in as any of them with password: ${DEMO_PASSWORD}`);
