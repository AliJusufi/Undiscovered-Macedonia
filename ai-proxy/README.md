# Real AI assistant — setup

The "Ask a question" widget on the site can run in two modes:

| Mode | What answers | Setup |
|---|---|---|
| **Offline** (default) | a built-in keyword knowledge base — limited to topics it was written for | none |
| **Live AI** | a real language model that can answer almost anything, and **searches the web** for weather, event dates, prices, schedules and news | one of the options below |

The website code already supports both. `script.js` is **already wired** to a local
proxy at `http://localhost:8787` — if no proxy is running it silently falls back to
the offline guide, so nothing breaks. Start a proxy (below) and the live AI turns on
automatically.

```js
var ASSISTANT_CONFIG = { apiUrl: "http://localhost:8787" };  // in script.js
```

The browser sends `POST { messages: [ { role, content }, … ] }` and expects `{ reply: "…" }` back.

---

## Option 0 — Google Gemini (FREE, no credit card — recommended for the thesis)

Google AI Studio gives a free API key with no card, and Gemini has Google Search
built in.

1. Go to <https://aistudio.google.com/apikey>, sign in with a Google account, click
   **Create API key**. Copy it (starts `AIza…`).
2. From the project folder, in **PowerShell**:
   ```powershell
   $env:GEMINI_API_KEY = "AIza..."
   node ai-proxy/local-server-gemini.js
   ```
   You should see `Gemini AI proxy on http://localhost:8787`.
3. Reload the site. Open "Ask a question" and try:
   *"what's the weather in Ohrid this week?"* or *"plan me 4 days around Mavrovo"*.

That's it — the assistant is now a real model that can search the web. Leave the
terminal window open while you demo; close it and the site falls back to offline.

---

## Why a proxy is needed

A language-model API needs a secret key. If that key is in `script.js`, anyone who opens the
site can read it and run up your bill. So the key lives on a small server (the "proxy"), the
browser talks to the proxy, and the proxy talks to the model. Two ready-made proxies are
included here.

---

## Option A — Local proxy (easiest, for the thesis demo)

Runs on your own machine. Nothing to deploy.

1. Create an Anthropic account and API key: <https://console.anthropic.com/>
   (New accounts get free credit; Haiku is a fraction of a cent per question.)
2. From the project folder, in **PowerShell**:
   ```powershell
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   node ai-proxy/local-server.js
   ```
   You should see `AI proxy on http://localhost:8787`.
3. In `script.js` set:
   ```js
   var ASSISTANT_CONFIG = { apiUrl: "http://localhost:8787" };
   ```
4. Reload the site. Ask the assistant "plan me 4 days around Mavrovo" — it now answers properly.

While the proxy is not running, the site automatically falls back to the offline knowledge base,
so nothing breaks.

---

## Option B — Cloudflare Worker (free, deployable, for a live demo)

Runs on Cloudflare's free tier, reachable from anywhere.

1. Get an Anthropic API key (as above).
2. Install the Cloudflare CLI and log in:
   ```powershell
   npm install -g wrangler
   wrangler login
   ```
3. From `ai-proxy/`:
   ```powershell
   wrangler deploy worker.js --name undiscovered-macedonia-ai
   wrangler secret put ANTHROPIC_API_KEY   # paste the key when prompted
   ```
   Wrangler prints a URL like `https://undiscovered-macedonia-ai.<you>.workers.dev`.
4. In `script.js`:
   ```js
   var ASSISTANT_CONFIG = { apiUrl: "https://undiscovered-macedonia-ai.<you>.workers.dev" };
   ```
5. For production, edit `ALLOWED_ORIGIN` in `worker.js` from `"*"` to your real site domain and redeploy.

---

## Using OpenAI instead of Anthropic

In either file, replace the API call. For OpenAI the request becomes:

```js
fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "content-type": "application/json", "authorization": "Bearer " + KEY },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...turns]
  })
})
// reply is at:  data.choices[0].message.content
```

Google Gemini and open models via Groq/OpenRouter work the same way — only the URL, the
auth header and where the reply sits in the response change.

---

## Web search (real-time information)

Both proxies enable Anthropic's built-in `web_search` tool. The model decides when to
search, the API runs the search server-side, and you get back the finished answer — no
extra code. This lets UMac answer "what's the weather in Ohrid this week?", "when is the
Galičnik Wedding this year?", "current denar to euro rate?", etc.

- Each web search costs about US$0.01 on top of the normal token cost.
- To turn it off, delete the `tools: [...]` line in `worker.js` / `local-server.js`.
- OpenAI equivalent: use a model with browsing, or the `web_search` tool in the Responses API.

## Cost and safety notes for the write-up

- **Cost**: a Haiku answer is ~US$0.001–0.003; add ~US$0.01 per web search when one is used.
- **Never** put the key in `script.js` or any file the browser downloads.
- The proxy caps history to the last 12 turns and 900 output tokens to bound cost and abuse.
- `SYSTEM_PROMPT` keeps the model on-topic and tells it to search rather than invent facts.
- For a public deployment you would also add rate limiting and lock `ALLOWED_ORIGIN`.
