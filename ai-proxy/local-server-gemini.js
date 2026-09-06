/* =============================================================
   Local AI proxy — Google Gemini version (FREE, no credit card)
   -------------------------------------------------------------
   Best option for the thesis demo: Google AI Studio gives a free
   API key instantly with no card, and Gemini has Google Search
   built in, so UMac can pull live info from the web.

   1. Get a free key:  https://aistudio.google.com/apikey
      (Sign in with a Google account, click "Create API key".)
   2. In PowerShell, from the project folder:
        $env:GEMINI_API_KEY = "AIza..."
        node ai-proxy/local-server-gemini.js
   3. In script.js set:  ASSISTANT_CONFIG.apiUrl = "http://localhost:8787"
   4. Reload the site and ask UMac anything.

   Needs Node 18+ (built-in fetch). You have Node 24.
   ============================================================= */

const http = require("http");

const PORT = 8787;
const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.6-flash"; // if this 404s, open http://localhost:8787/models
const USE_WEB_SEARCH = false;     // true needs billing enabled on the Google project

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
Use Google Search for weather, event dates, opening hours, prices, exchange
rates, transport and news rather than guessing. Do not invent prices, opening
hours or contact details.
`.trim();

if (!KEY) {
  console.error("Set GEMINI_API_KEY first. Get a free key at https://aistudio.google.com/apikey");
  process.exit(1);
}

const URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODEL + ":generateContent";

http.createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type"
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  // open http://localhost:8787/models to list model names your key can use
  if (req.method === "GET" && req.url.indexOf("/models") === 0) {
    (async () => {
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
          headers: { "x-goog-api-key": KEY }
        });
        const data = await r.json();
        const names = (data.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).indexOf("generateContent") !== -1)
          .map((m) => m.name.replace("models/", ""));
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ usable: names, error: data.error || null }, null, 2));
      } catch (e) {
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ networkError: String(e) }, null, 2));
      }
    })();
    return;
  }

  // http://localhost:8787/full  — runs the real payload and dumps the raw reply
  if (req.method === "GET" && req.url.indexOf("/full") === 0) {
    (async () => {
      try {
        const payload = {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: "Where should I go first in Macedonia?" }] }],
          generationConfig: { maxOutputTokens: 900 }
        };
        if (USE_WEB_SEARCH) payload.tools = [{ google_search: {} }];
        const r = await fetch(URL, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": KEY },
          body: JSON.stringify(payload)
        });
        const data = await r.json();
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ httpStatus: r.status, webSearch: USE_WEB_SEARCH, raw: data }, null, 2));
      } catch (e) {
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ networkError: String(e) }, null, 2));
      }
    })();
    return;
  }

  // open http://localhost:8787/test in a browser to check the Gemini connection
  if (req.method === "GET") {
    (async () => {
      try {
        const r = await fetch(URL, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": KEY },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: OK" }] }] })
        });
        const data = await r.json();
        const txt = ((((data.candidates || [])[0] || {}).content || {}).parts || [])
          .map((p) => p.text || "").join("").trim();
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({
          httpStatus: r.status,
          modelReplied: txt || null,
          error: data.error || null,
          keyPrefix: (KEY || "").slice(0, 6) + "...",
          model: MODEL
        }, null, 2));
      } catch (e) {
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ networkError: String(e) }, null, 2));
      }
    })();
    return;
  }

  if (req.method !== "POST") { res.writeHead(405, cors); return res.end("POST only"); }

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    let messages = [];
    try { messages = JSON.parse(raw).messages || []; } catch {}

    // Gemini wants roles "user" / "model", and no leading assistant turn
    const contents = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    while (contents.length && contents[0].role === "model") contents.shift();

    try {
      const payload = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        generationConfig: { maxOutputTokens: 900 }
      };
      if (USE_WEB_SEARCH) payload.tools = [{ google_search: {} }];

      const r = await fetch(URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify(payload)
      });
      const data = await r.json();

      const cand = (data.candidates || [])[0] || {};
      const parts = (cand.content || {}).parts || [];
      const reply = parts.map((p) => p.text || "").join("").trim();

      if (!reply) {
        // surface why, in the terminal, so we can debug
        console.log("--- empty reply. Gemini said: ---");
        console.log(JSON.stringify(data, null, 2).slice(0, 1500));
        console.log("--------------------------------");
      }

      res.writeHead(200, { ...cors, "content-type": "application/json" });
      res.end(JSON.stringify({
        reply: reply || "Sorry, could you rephrase that?",
        _debug: reply ? undefined : (data.error || cand.finishReason || "no text in response")
      }));
    } catch (err) {
      console.log("proxy error:", err);
      res.writeHead(500, { ...cors, "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
}).listen(PORT, () => console.log("Gemini AI proxy on http://localhost:" + PORT + "  (model: " + MODEL + ")"));
