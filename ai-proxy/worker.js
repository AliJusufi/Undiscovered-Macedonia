/* =============================================================
   Undiscovered Macedonia — AI assistant proxy (Cloudflare Worker)
   -------------------------------------------------------------
   This runs on a server, NOT in the browser, so the API key is
   never exposed. It receives the chat history from the website,
   forwards it to a real language model with a system prompt, and
   returns { reply: "..." } — exactly what script.js expects.

   Deploy: see ai-proxy/README.md
   ============================================================= */

// Where your website is served from, for the CORS check.
// Use "*" while testing locally; lock it to your real domain for production.
const ALLOWED_ORIGIN = "*";

const SYSTEM_PROMPT = `
You are UMac, the travel assistant for "Undiscovered Macedonia", a small tour
operator that runs guided small-group and private trips through North Macedonia.

Answer questions about travelling in North Macedonia: destinations, itineraries,
food and drink, hiking and other activities, culture and history, the best time
to visit, budgets, visas, getting around, and how the company works.

You can search the web. Use it for anything time-sensitive or specific that you
are not sure of: current weather and forecasts, festival and event dates, opening
hours, prices, exchange rates, transport schedules, recent news, road conditions.
Prefer a quick search over guessing, and briefly say when information came from a
search (e.g. "as of today's forecast...").

Style:
- Warm, concrete and concise. 2-5 sentences unless the user asks for detail.
- British spelling. Use the local place names (Ohrid, Skopje, Matka, Mavrovo,
  Bitola, Kruševo, Tetovo, Struga, Pelister, Galičica, Tikveš).
- If asked for a full itinerary, give a short day-by-day outline, then suggest
  the user use the "Plan a Trip" form for a costed version.
- The guides are Marko (Skopje & the north), Petar (Ohrid & the lakes),
  Ardit (Mavrovo, Šar & Tetovo), Jon (Bitola & Pelister), Ana (Tikveš wine
  country) and Sara (Matka & day-hikes near Skopje).
- Trips use a private local driver-guide; travellers do not need to rent a car.
- If a question is clearly not about travel or Macedonia, answer briefly and
  steer back to trip planning.
Do not invent specific prices, opening hours or contact details — search instead,
or say you don't have them.
`.trim();

// Model: Haiku is cheapest and fast; swap to a Sonnet id for richer answers.
const MODEL = "claude-haiku-4-5-20251001";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method !== "POST") return cors(json({ error: "POST only" }, 405));

    let body;
    try {
      body = await request.json();
    } catch {
      return cors(json({ error: "bad JSON" }, 400));
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    // keep only user/assistant turns with text, cap the history length
    const turns = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    if (!turns.length || turns[turns.length - 1].role !== "user") {
      return cors(json({ error: "last message must be from the user" }, 400));
    }

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 900,
          system: SYSTEM_PROMPT,
          messages: turns,
          // built-in web search — the API runs the search loop server-side
          // and returns the finished answer. Remove this line to disable it.
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
        }),
      });

      if (!r.ok) {
        const detail = await r.text();
        return cors(json({ error: "model error", status: r.status, detail }, 502));
      }

      const data = await r.json();
      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      return cors(json({ reply: reply || "Sorry, I didn't catch that — could you rephrase?" }));
    } catch (err) {
      return cors(json({ error: "proxy failure", detail: String(err) }, 500));
    }
  },
};

/* ---------- helpers ---------- */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  return res;
}
