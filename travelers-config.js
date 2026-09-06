/* ===== Meet Travellers — backend config =====
   Fill these two values to switch the page from the offline prototype
   (sample profiles, localStorage) to the real Supabase backend
   (accounts, database, live matches and chat).

   Both values are safe to keep in client code and commit to git:
   the anon key only allows what the row-level-security policies in
   supabase/schema.sql permit.

   Leave them blank to keep running the offline prototype.
   ============================================================== */
window.UM_SUPABASE = {
  url: "", // e.g. "https://abcdefgh.supabase.co"  (Settings → API → Project URL)
  anonKey: "", // the "anon public" key            (Settings → API → Project API keys)
};
