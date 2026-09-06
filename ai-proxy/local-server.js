/* =============================================================
   Local AI proxy — the simplest way to test the real assistant.
   -------------------------------------------------------------
   No accounts, no deploy. Runs on your machine only.

   1. Get an Anthropic API key:  https://console.anthropic.com/
   2. In a terminal, from the project folder:
        ANTHROPIC_API_KEY=sk-ant-...   node ai-proxy/local-server.js
      (Windows PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."; node ai-proxy/local-server.js )
   3. In script.js set:  ASSISTANT_CONFIG.apiUrl = "http://localhost:8787"
   4. Reload the site and ask the assistant anything.

   Needs Node 18+ (uses the built-in fetch). You have Node 24.
   ============================================================= */

const http = require("http");

const PORT = 8787;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001"; // swap to a Sonnet id for richer answers

const SYSTEM_PROMPT = `
You are UMac, the travel assistant for "Undiscovered Macedonia", a small tour
operator running guided small-group and private trips through North Macedonia.
Answer questions about travelling in North Macedonia: destinations, itineraries,
food and drink, activities, culture and history, best time to visit, budgets,
visas, getting around, and how the company works. Warm, concrete, concise
(2-5 sentences unless asked for more). British spelling. Use local place names.
For a full itinerary, give a short day-by-day outline then point to the
"Plan a Trip" form. Guides: Marko (Skopje & north), Petar (Ohrid & lakes),
Ardit (Mavrovo, Šar, Tetovo), Jon (Bitola & Pelister), Ana (Tikveš wine),
Sara (Matka & day-hikes). Trips use a private local driver-guide.
You can search the web — use it for weather, event dates, opening hours, prices,
exchange rates, transport and news rather than guessing, and say when an answer
came from a search. Do not invent prices, opening hours or contact details.
`.trim();

if (!KEY) {
  console.error("Set ANTHROPIC_API_KEY first. See the comment at the top of this file.");
  process.exit(1);
}

http
  .createServer(async (req, res) => {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }
    if (req.method !== "POST") {
      res.writeHead(405, cors);
      return res.end("POST only");
    }

    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let messages = [];
      try {
        messages = JSON.parse(raw).messages || [];
      } catch {}
      const turns = messages
        .filter(
          (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
        .slice(-12);

      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 900,
            system: SYSTEM_PROMPT,
            messages: turns,
            tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
          }),
        });
        const data = await r.json();
        const reply = (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ reply: reply || "Sorry, could you rephrase that?" }));
      } catch (err) {
        res.writeHead(500, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  })
  .listen(PORT, () =>
    console.log("AI proxy on http://localhost:" + PORT + "  (model: " + MODEL + ")")
  );
