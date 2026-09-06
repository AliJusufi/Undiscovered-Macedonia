/* Regenerate the thesis / poster screenshots.
   Needs the dev server running (npm run dev) and Google Chrome installed.
   Run:  npm run shots
   Output: thesis-screenshots/  (git-ignored) */
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const BASE = process.env.SHOTS_BASE || "http://localhost:4173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "thesis-screenshots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), ...opts });
  console.log("  saved", name);
};

// 1. Home
await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
await wait(800);
await shot("01-home-hero");
await shot("01-home-full", { fullPage: true });

// 2. Explore + map with a popup open
await page.goto(`${BASE}/explore.html`, { waitUntil: "networkidle" });
await wait(500);
await page.evaluate(() => {
  const m = document.getElementById("map");
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - 70);
});
await wait(2500);
await page.evaluate(() => {
  const mk = document.querySelector(".leaflet-marker-icon");
  if (mk) mk.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await wait(800);
await shot("02-explore-map");
await page.evaluate(() => window.scrollTo(0, 0));
await wait(300);
await shot("02-explore-top");

// 3. Trips
await page.goto(`${BASE}/trips.html`, { waitUntil: "networkidle" });
await wait(500);
await shot("03-trips-top");

// 4. UMac assistant (offline answer)
await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
await wait(500);
await page.click(".ask-fab");
await wait(400);
await page.fill("#askInput", "When is the best time to visit Ohrid?");
await page.click('#askForm button[type="submit"]');
await page
  .waitForFunction(
    () => {
      const b = document.querySelectorAll(".ask-msg.bot");
      return b.length >= 2 && !/^…?$/.test(b[b.length - 1].textContent.trim());
    },
    { timeout: 8000 }
  )
  .catch(() => {});
await wait(600);
await shot("04-umac-assistant");

// 5. Meet Travellers prototype: intro -> profile -> deck -> match -> chat
await page.goto(`${BASE}/travelers.html`, { waitUntil: "networkidle" });
await wait(400);
await shot("05a-travellers-intro", { fullPage: true });
await page.fill('#profileForm input[name="name"]', "Mark");
await page.fill('#profileForm input[name="country"]', "Poland");
await page.fill('#profileForm input[name="age"]', "27");
await page.fill('#profileForm input[name="from"]', "2026-09-10");
await page.fill('#profileForm input[name="to"]', "2026-09-24");
for (const t of ["Hiking", "Photography", "Camping"])
  await page.click(`#interestChips button:has-text("${t}")`);
await page.fill(
  '#profileForm textarea[name="bio"]',
  "Two weeks in the west — Mavrovo, Pelister, lots of walking. Looking for a hiking partner."
);
await wait(300);
await shot("05b-profile-form");
await page.click('#profileForm button[type="submit"]');
await wait(800);
await shot("05c-discovery-deck");
for (let i = 0; i < 6; i++) {
  await page.click("#btnConnect");
  await wait(700);
  if (await page.isVisible("#matchModal")) break;
}
await wait(400);
await shot("05d-match-modal");
if (await page.isVisible("#matchModal")) {
  await page.click("#matchMessage");
  await wait(500);
  for (const l of [
    "Hey — I saw you're doing Pelister too. Want to share the hut night?",
    "I'm flexible on dates, anytime next week works.",
  ]) {
    await page.fill("#chatInput", l);
    await page.click('#chatForm button[type="submit"]');
    await wait(1600);
  }
  await wait(600);
  await page.locator("#chatDrawer").screenshot({ path: join(OUT, "05e-chat.png") });
  console.log("  saved 05e-chat");
}

// 6. Meet Travellers LIVE sign-in
await page.goto(`${BASE}/travelers-live.html`, { waitUntil: "networkidle" });
await wait(800);
await shot("06-live-signin", { fullPage: true });

// 7. Credits + 404
await page.goto(`${BASE}/credits.html`, { waitUntil: "networkidle" });
await wait(400);
await shot("07-credits", { fullPage: true });
await page.goto(`${BASE}/404.html`, { waitUntil: "networkidle" });
await wait(400);
await shot("08-404");

await browser.close();
console.log("done ->", OUT);
