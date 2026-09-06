# Undiscovered Macedonia

A slow-travel guide to North Macedonia — a small site for unhurried, guide-led trips.
Built as a bachelor thesis project: plain HTML, CSS and JavaScript with **no build step**.

## What's in it

| Page                  | Purpose                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | Home — hero, destination and trip previews, guides, plan-a-trip form                                                               |
| `explore.html`        | All destinations, an interactive Leaflet map, food, wildlife, traditions                                                           |
| `trips.html`          | Full day-by-day trip write-ups, experiences, departures table                                                                      |
| `travelers.html`      | "Meet Travellers" — offline matching prototype (sample data, localStorage)                                                         |
| `travelers-live.html` | The same feature on a real Supabase backend — accounts, DB, live matches & chat. Setup: [`supabase/README.md`](supabase/README.md) |
| `credits.html`        | Honest project / photo-licensing notes                                                                                             |
| `thesis-figures.html` | Figures generated for the written thesis                                                                                           |

Interactive features (all client-side, `localStorage`-backed) live in `script.js`:
the plan-a-trip enquiry form, the **UMac** assistant with "save to my trip", and the
generic modal helper. The Meet Travellers logic is in `travelers.js`.

## Running it locally

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install        # installs Prettier (dev only)
npm run dev        # static server at http://localhost:4173
```

Or use the **Live Server** VS Code extension (port 4173, configured in `.vscode/settings.json`).

### The UMac AI assistant (optional)

The "Ask a question" widget works offline by default (a small keyword knowledge base).
To turn on the real AI (Google Gemini, free, with web search):

```bash
# PowerShell
$env:GEMINI_API_KEY = "AIza..."
npm run proxy      # Gemini proxy at http://localhost:8787
```

The site auto-detects the proxy; if it isn't running, it silently falls back to offline
mode. Full setup and the Anthropic / Cloudflare Worker options are in
[`ai-proxy/README.md`](ai-proxy/README.md).

**Never commit an API key.** Keys are passed through environment variables only; `.env`
files are git-ignored.

## Project layout

```
.
├── index.html, explore.html, trips.html, travelers.html, credits.html
├── styles.css, travelers.css      # styles
├── script.js, travelers.js        # behaviour (prototype)
├── travelers-live.js, travelers-config.js  # Meet Travellers on Supabase
├── serve.js                       # tiny static dev server
├── Media/                         # images (see licensing note below)
├── ai-proxy/                      # UMac assistant proxies + setup docs
├── supabase/                      # schema.sql + setup guide for travelers-live
└── MATCHING-BACKEND.md            # the design write-up behind supabase/schema.sql
```

## Formatting

```bash
npm run format        # format all HTML/CSS/JS/JSON/MD with Prettier
npm run format:check  # verify without writing
```

## Photo licensing

The images in `Media/` are **unlicensed placeholders** used only for this student
project (many are iStock preview thumbnails). They are not cleared for publication.
See `credits.html`. Replace them with properly licensed or original photography before
any public deployment.

## Status

Done: multi-page site, enquiry form, UMac assistant, Meet Travellers prototype.
Not done: MK/SQ/EN language toggle; the Supabase backend (documented, not built).
