/* ===== Undiscovered Macedonia — script ===== */
(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- small localStorage helper ---------- */
  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) {
        return d;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  /* ---------- generic modal ---------- */
  function openModal(title, sub, buildBody) {
    var wrap = document.createElement("div");
    wrap.className = "um-modal";
    wrap.innerHTML =
      '<div class="um-modal-card" role="dialog" aria-modal="true" aria-label="' +
      title +
      '">' +
      '<button class="um-modal-close" aria-label="Close">&times;</button>' +
      "<h2>" +
      title +
      "</h2>" +
      (sub ? '<p class="um-modal-sub">' + sub + "</p>" : "") +
      '<div class="um-modal-content"></div>' +
      "</div>";
    document.body.appendChild(wrap);
    buildBody(wrap.querySelector(".um-modal-content"), function () {
      wrap.remove();
    });
    var close = function () {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
    };
    var onKey = function (e) {
      if (e.key === "Escape") close();
    };
    wrap.querySelector(".um-modal-close").addEventListener("click", close);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) close();
    });
    document.addEventListener("keydown", onKey);
  }

  /* ---------- Hero search -> assistant ---------- */
  var searchBar = document.getElementById("searchBar");
  if (searchBar) {
    searchBar.addEventListener("submit", function (e) {
      e.preventDefault();
      var dest = document.getElementById("f-destination").value;
      var when = document.getElementById("f-date").value;
      var who = document.getElementById("f-travellers").value;
      var q = "I'm thinking about a trip";
      if (dest && dest !== "Not sure yet") q += " to " + dest;
      if (when) q += " around " + when;
      q += ", " + who.toLowerCase() + ". What would you suggest?";
      openAsk(q);
    });
  }

  /* ---------- Plan a trip -> saved to this browser ---------- */
  var planForm = document.getElementById("planForm");
  if (planForm) {
    planForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = planForm;
      var ref = "UM-" + Date.now().toString(36).toUpperCase().slice(-6);
      var entry = {
        ref: ref,
        name: (f.name.value || "").trim(),
        email: (f.email.value || "").trim(),
        when: (f.when.value || "").trim(),
        days: (f.days.value || "").trim(),
        notes: (f.notes.value || "").trim(),
        at: new Date().toISOString(),
      };
      var all = store.get("um_enquiries", []);
      all.push(entry);
      store.set("um_enquiries", all);
      document.getElementById("planMsg").textContent =
        "Saved as " +
        ref +
        ". On a live site this would reach our guides; here it's kept in your browser only.";
      f.reset();
    });
  }

  var viewEnq = document.getElementById("viewEnquiries");
  if (viewEnq) {
    viewEnq.addEventListener("click", function (e) {
      e.preventDefault();
      openModal(
        "Saved enquiries",
        "Stored in this browser only — nothing was sent.",
        function (content, close) {
          renderEnquiries(content, close);
        }
      );
    });
  }
  function renderEnquiries(content, close) {
    var all = store.get("um_enquiries", []);
    if (!all.length) {
      content.innerHTML = '<p class="um-empty">No enquiries saved yet.</p>';
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "um-list";
    all
      .slice()
      .reverse()
      .forEach(function (en) {
        var li = document.createElement("li");
        var meta = en.ref + " · " + new Date(en.at).toLocaleDateString();
        li.innerHTML =
          '<p class="um-meta"></p>' +
          '<p class="um-body"></p>' +
          '<button class="um-del">Delete</button>';
        li.querySelector(".um-meta").textContent = meta;
        li.querySelector(".um-body").textContent =
          en.name +
          " · " +
          en.email +
          "\n" +
          (en.when ? "When: " + en.when + "   " : "") +
          (en.days ? "Days: " + en.days : "") +
          (en.notes ? "\n" + en.notes : "");
        li.querySelector(".um-del").addEventListener("click", function () {
          var rest = store.get("um_enquiries", []).filter(function (x) {
            return x.ref !== en.ref;
          });
          store.set("um_enquiries", rest);
          close();
          openModal(
            "Saved enquiries",
            "Stored in this browser only — nothing was sent.",
            renderEnquiries
          );
        });
        ul.appendChild(li);
      });
    content.appendChild(ul);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(
    ".section-head, .dest-card, .exp-item, .about-grid, .journal-card, .strip-inner, .cta-inner, .subhead, .place-list, .food-card, .drinks-strip, .meet-band, .wild-card, .trad-card, .food-gallery, .guide-card, .trip-card, .trip-full, .page-jump"
  );
  revealEls.forEach(function (el) {
    el.classList.add("reveal");
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* =========================================================
     Ask Undiscovered Macedonia — in-page assistant
     ---------------------------------------------------------
     Two modes:
       • apiUrl = null  -> offline keyword knowledge base (below)
       • apiUrl set      -> a real language model answers anything

     To switch on the real AI, run one of the proxies in the
     ai-proxy/ folder and set apiUrl to its URL. Full steps:
     ai-proxy/README.md. The proxy receives
        POST { messages: [{role, content}, ...] }
     and returns { reply: "..." }. The API key stays on the
     proxy — never in this file.
     ========================================================= */
  var ASSISTANT_CONFIG = {
    // Point this at a running proxy for the real AI (ai-proxy/README.md).
    // It is already set to the local proxy's address; if the proxy is not
    // running the assistant quietly falls back to the offline guide below.
    apiUrl: "http://localhost:8787",
  };

  var KB = [
    {
      k: ["ohrid", "lake ohrid", "kaneo"],
      a: "Lake Ohrid is the highlight for most first-time visitors — one of Europe's oldest lakes, UNESCO-listed, with the cliff-top church of St. John at Kaneo, a walkable old town and swimming into September. We usually give it 2–3 nights.",
    },
    {
      k: [
        "skopje",
        "capital",
        "stone bridge",
        "bazaar",
        "earthquake",
        "mother teresa",
        "vodno",
        "millennium cross",
      ],
      a: "Skopje, the capital, pairs an Ottoman old bazaar and the 15th-century Stone Bridge with a modernist rebuild after the 1963 earthquake and a set of large modern monuments. Mother Teresa was born here in 1910 — there is a memorial house on the site. Mount Vodno and the Millennium Cross rise just south, and Matka Canyon is 15 km away. One full day covers the centre.",
    },
    {
      k: ["matka", "canyon", "kayak", "kayaking", "treska"],
      a: "Matka Canyon is 30 minutes from Skopje: a dammed gorge on the Treska River with kayak rental, a boat trip to Vrelo Cave and cliff-side walking paths. Half a day is enough, or a full day if you paddle.",
    },
    {
      k: ["mavrovo", "ski", "skiing", "snow", "winter"],
      a: "Mavrovo National Park has the country's main ski resort plus a reservoir lake with a half-submerged church. Great for a winter trip or a cool-weather hiking base in the west.",
    },
    {
      k: ["bitola", "pelister", "heraclea"],
      a: "Bitola is an elegant café town — 'the City of Consuls' — with the Roman ruins of Heraclea nearby and Pelister National Park (glacial lakes, molika pine) rising just above it.",
    },
    {
      k: ["krusevo", "kruševo", "paraglid", "highest"],
      a: "Kruševo is the highest town in the country and a popular paragliding launch, with well-preserved 19th-century architecture and mountain air. Often combined with Bitola and Prilep.",
    },
    {
      k: ["national park", "parks", "galicica", "galičica", "magaro", "st naum", "st. naum"],
      a: "There are three national parks. Galičica is the 24,000-hectare karst ridge between Lakes Ohrid and Prespa — a panoramic drive, Magaro peak at 2,254 m, wild horses, more than 1,600 plant species and the St. Naum springs feeding Lake Ohrid. Mavrovo is peaks, a reservoir lake and wildlife in the west. Pelister has the glacial 'Pelister's Eyes' lakes and rare molika pine above Bitola.",
    },
    {
      k: ["hike", "hiking", "trek", "trail", "walking"],
      a: "Hiking runs spring to autumn. Favourites: the Galičica ridge between two lakes, Pelister's glacial lakes, and the peaks around Mavrovo. We match route difficulty to your group and can do hut-to-hut or day walks from one base.",
    },
    {
      k: ["food", "eat", "cuisine", "dish", "meal", "restaurant", "traditional food"],
      a: "The cooking is Balkan, Ottoman and Mediterranean at once — mostly slow, cheap and generous. Must-tries: tavče gravče (the national baked-bean dish), ajvar (roasted pepper relish), Ohrid trout, šopska salad, kebapi, selsko meso, and burek for breakfast. See the 'A taste of Macedonia' section for where to eat each.",
    },
    {
      k: ["tavce", "tavče", "gravce", "gravče", "beans", "national dish"],
      a: "Tavče gravče is the national dish: white beans baked with paprika, onion and peppers in an unglazed clay pot, usually meat-free. The cheapest, most authentic bowls are in Skopje's Old Bazaar.",
    },
    {
      k: ["ajvar", "pepper relish", "peppers"],
      a: "Ajvar is a relish of roasted red peppers — smooth or chunky — eaten with bread, cheese and grilled meat. It carries a protected origin label, and the best peppers come from Strumica in the south-east. Autumn is ajvar-making season.",
    },
    {
      k: ["trout", "fish", "pastrmka"],
      a: "Ohrid trout (pastrmka) is the dish to order lakeside in Ohrid or Struga — grilled, baked or smoked. Note some native trout species are protected, so you'll often be served farmed or introduced varieties.",
    },
    {
      k: ["burek", "banica", "pastry", "breakfast"],
      a: "Burek is coiled filo pastry with cheese, meat or spinach, sold by the slice — the default Macedonian breakfast, best from a bakery before 10am, often with a glass of drinking yoghurt.",
    },
    {
      k: ["kebapi", "kebab", "cevapi", "grill", "meat"],
      a: "Kebapi are small grilled fingers of minced meat, served with soft lepinja bread, raw onion and ajvar. Grill houses (skara) all over the country do them; count on 10 pieces a portion.",
    },
    {
      k: ["wine", "tikves", "tikveš", "vranec", "winery", "vineyard"],
      a: "The Tikveš region between Kavadarci and Negotino is one of Europe's oldest wine areas. Look for the native red Vranec and aromatic white Temjanika; several estates near Stobi do tastings and lunch.",
    },
    {
      k: ["drink", "rakija", "mastika", "alcohol", "beer", "boza", "salep"],
      a: "Rakija (grape or plum brandy) opens most meals; mastika is a cold anise spirit drunk with meze; Tikveš wine and Skopsko beer are the everyday choices. From bazaar stalls, try boza (fermented grain) or warm salep in winter.",
    },
    {
      k: ["vegetarian", "vegan", "meat-free", "fasting"],
      a: "Eating vegetarian is easy: tavče gravče, ajvar, šopska salad, grilled peppers, pindžur, cheese burek, bean soup and stuffed vine leaves are all common, partly thanks to the Orthodox fasting tradition. Vegan is a little harder outside cities — tell us and we'll brief the guides.",
    },
    {
      k: ["struga", "black drim", "drim", "poetry", "golden wreath", "kalista", "kališta"],
      a: "Struga sits where the Black Drim flows out of Lake Ohrid — quieter pebble beaches than Ohrid town, a walkable riverfront quay, the Kališta cave monastery nearby, and the Struga Poetry Evenings with its Golden Wreath award every August. Usually paired with Ohrid.",
    },
    {
      k: ["prilep", "marko", "marko's towers", "treskavec", "tobacco", "heraclea", "marble"],
      a: "Prilep is 'the city beneath Marko's Towers' — a 14th-century fortress on bare granite from the short-lived Kingdom of Prilep. It's tobacco and marble country, with the cliff monastery of Treskavec above and the Roman ruins of Heraclea Lyncestis and Stibera nearby.",
    },
    {
      k: ["tetovo", "painted mosque", "sarena", "šarena", "dzamija", "džamija"],
      a: "Tetovo, at the foot of the Šar Mountains, is known for the Šarena Džamija (Painted Mosque) — its facade covered in floral and landscape frescoes. Popova Šapka ski area is just above the town.",
    },
    {
      k: ["strumica", "carnival", "kolesino", "koleshino", "waterfall"],
      a: "Strumica is a warm south-eastern valley town famous for its spring carnival, the Kolešino and Smolare waterfalls nearby, and the peppers that make the best ajvar.",
    },
    {
      k: ["dojran", "lake dojran"],
      a: "Lake Dojran, on the Greek border, is warm and shallow — good for easy swimming and birdwatching, and one of the calmest, least-touristed corners of the country.",
    },
    {
      k: ["kratovo", "volcano", "crater", "bridges", "towers"],
      a: "Kratovo is built inside an extinct volcano's crater, connected by old stone bridges and medieval towers. It's a quiet day trip from Skopje, often combined with the Kuklica 'stone dolls' rock formations.",
    },
    {
      k: ["berovo", "malesevo", "maleševo", "east"],
      a: "Berovo, in the eastern Maleševo highlands, is all pine forest, a small mountain lake and homemade cheese and honey — a low-key base for walking and cross-country skiing.",
    },
    {
      k: ["vevcani", "vevčani", "springs"],
      a: "Vevčani is a spring-fed village in the hills above Struga, known for its centuries-old, gently surreal carnival in mid-January and a short walk up to the springs themselves.",
    },
    {
      k: [
        "stobi",
        "roman",
        "ruins",
        "archaeolog",
        "mosaic",
        "heraclea",
        "skupi",
        "kokino",
        "kuklica",
        "stone dolls",
        "observatory",
      ],
      a: "The headline archaeological sites: Stobi (a Roman and early-Byzantine city with mosaics, by the motorway in Tikveš), Heraclea Lyncestis near Bitola (Roman theatre and early-Christian mosaics), Kokino in the north-east (a 3,800-year-old megalithic observatory), and the Kuklica 'Stone Dolls' rock pillars near Kratovo. Skupi, the Roman predecessor of Skopje, sits on the city's edge.",
    },
    {
      k: ["prespa", "lake prespa", "golem grad"],
      a: "Lake Prespa, higher and wilder than Ohrid and shared with Greece and Albania, has apple orchards, pelicans and the island of Golem Grad with its ruined churches and tortoises. Galičica National Park separates the two lakes.",
    },
    {
      k: ["wildlife", "animal", "lynx", "bear", "wolf", "wild horse", "birds", "nature reserve"],
      a: "Roughly a third of the country is forest and mountain. It still holds brown bear, grey wolf, wild boar and golden jackal, plus the critically endangered Balkan lynx (a national symbol, on the coin). Wild horses graze the Galičica plateau in summer, and Lake Prespa has pelicans and tortoises. You rarely see the big carnivores, but Mavrovo is the place to try.",
    },
    {
      k: [
        "wedding",
        "galicnik",
        "galičnik",
        "costume",
        "tradition",
        "carnival",
        "folklore",
        "custom",
      ],
      a: "The Galičnik Wedding, every July, marries one couple in full traditional dress in a mountain village near Mavrovo, with drumming, oro dancing and a horseback procession. Other living traditions worth timing a trip around: the Vevčani and Strumica carnivals, and the woodcarving and monastic life at Bigorski Monastery.",
    },
    {
      k: ["monaster", "church", "fresco", "orthodox", "unesco", "bigorski"],
      a: "Ohrid alone is said to have had 365 churches; don't miss St. John at Kaneo, St. Sophia and the frescoes at St. Clement. Elsewhere: Bigorski Monastery near Mavrovo (carved iconostasis), Treskavec above Prilep, and the painted churches around Lake Prespa.",
    },
    {
      k: ["swim", "swimming", "beach", "lake day"],
      a: "Lake Ohrid is clean and swimmable, warmest late July to September, with public beaches around Ohrid, Struga and the eastern shore. Lake Dojran is warmer and shallower; mountain lakes like Mavrovo are cold but fine on a hot day.",
    },
    {
      k: ["language", "macedonian", "english", "speak", "alphabet"],
      a: "Macedonian is a South Slavic language written in Cyrillic. English is widely spoken by younger people and in tourism; Albanian is co-official and common in the west. Our guides handle any translation you need.",
    },
    {
      k: ["currency", "money", "denar", "card", "cash", "atm"],
      a: "The currency is the Macedonian denar (MKD); roughly 60 MKD to the euro. Cards work in cities and hotels, but carry cash for villages, markets and small restaurants. ATMs are easy to find in towns.",
    },
    {
      k: ["family", "kids", "children"],
      a: "Trips work well with children: short hikes, the Matka boat trip, lake swimming, Skopje's parks and the Millennium Cross cable car. We adjust walking distances and pace for the youngest in the group.",
    },
    {
      k: ["when", "best time", "season", "weather", "month"],
      a: "May–June brings wildflowers and green mountains; July–August is hot and best for the lakes; September is ideal — warm water, fewer people; December–March is for snow at Mavrovo.",
    },
    {
      k: ["how long", "days", "itinerary", "week", "duration"],
      a: "A good first trip is 7–10 days: Skopje + Matka (2), Ohrid (3), Bitola/Pelister (2), with buffer time. Shorter 4–5 day trips usually focus on Ohrid and Skopje.",
    },
    {
      k: ["visa", "entry", "passport"],
      a: "Many nationalities (EU, UK, US, Canada, Australia, and more) enter North Macedonia visa-free for up to 90 days. Check your own country's status before booking — we can advise once we know your passport.",
    },
    {
      k: ["get around", "transport", "car", "drive", "bus", "airport"],
      a: "Trips are run with a private driver-guide, so you don't need to rent a car. International flights land at Skopje (SKP) or Ohrid (OHD) in summer.",
    },
    {
      k: ["price", "cost", "how much", "budget"],
      a: "Every itinerary is custom, so pricing depends on length, season, group size and hotels. Send us rough dates through 'Plan a Trip' and we'll come back with a costed draft.",
    },
    {
      k: ["safe", "safety", "solo"],
      a: "North Macedonia is generally very safe for travellers, including solo and small groups. Roads in the mountains are winding, which is one reason we use local drivers.",
    },
    {
      k: [
        "guide",
        "guides",
        "who leads",
        "tour leader",
        "marko",
        "petar",
        "ardit",
        "jon",
        "ana",
        "sara",
      ],
      a: "Every trip is led by a local guide who grew up in the region: Marko (Skopje & the north), Petar (Ohrid & the lakes), Ardit (Mavrovo, Šar & Tetovo), Jon (Bitola & Pelister), Ana (Tikveš wine country) and Sara (Matka & day-hikes near Skopje). Between them they cover Macedonian, English, German, French, Italian, Spanish and Albanian. See the 'Meet your guides' section.",
    },
    {
      k: [
        "meet",
        "other travellers",
        "other travelers",
        "companion",
        "match",
        "solo",
        "alone",
        "people",
        "friends",
      ],
      a: "Try the 'Meet Travellers' page: set your interests and travel dates, then swipe through other tourists in Macedonia around the same time. When you both connect, you can message and plan something together — a hike, a wine tour, sharing a taxi to Matka.",
    },
    {
      k: ["book", "booking", "contact", "email", "plan"],
      a: "Use the 'Plan a Trip' section or email hello@undiscovered-macedonia.example with rough dates and how long you have. You'll get a draft itinerary within two days.",
    },
  ];

  function localAnswer(text) {
    var q = text.toLowerCase();
    var best = null,
      bestScore = 0;
    KB.forEach(function (entry) {
      var score = 0;
      entry.k.forEach(function (kw, i) {
        if (q.indexOf(kw) !== -1) {
          // the first keyword is the canonical name — weight it much higher
          // so "plan me a trip to Mavrovo" beats the generic "national parks" entry
          score += i === 0 ? kw.length * 4 : kw.length;
        }
      });
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });
    if (best) return best.a;
    return "I can only answer from a small built-in guide right now — destinations, food and drink, wildlife, the best time to visit, trip length, visas and getting around. Ask about one of those, or use 'Plan a Trip' for a real itinerary. (The site owner can switch on a full AI assistant — see ai-proxy/README.md.)";
  }

  /* ---------- Widget DOM ---------- */
  var messages = [
    {
      role: "assistant",
      content:
        "Hi, I'm UMac. Ask me anything about a trip to Macedonia — where to go, when, food, or planning.",
    },
  ];

  var fab = document.createElement("button");
  fab.className = "ask-fab";
  fab.type = "button";
  fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
    "<span>Ask a question</span>";

  var panel = document.createElement("div");
  panel.className = "ask-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ask Undiscovered Macedonia");
  panel.hidden = true;
  panel.innerHTML =
    '<div class="ask-head">' +
    '<div><div class="ask-title">UMac</div>' +
    '<div class="ask-sub">Your Macedonia travel assistant</div></div>' +
    '<button class="ask-saved" type="button" aria-label="Saved trips" title="Saved trips">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-5-3-5 3V4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>' +
    "</button>" +
    '<button class="ask-close" type="button" aria-label="Close">&times;</button>' +
    "</div>" +
    '<div class="ask-log" id="askLog" aria-live="polite"></div>' +
    '<div class="ask-chips" id="askChips"></div>' +
    '<form class="ask-form" id="askForm">' +
    '<input type="text" id="askInput" autocomplete="off" placeholder="Type your question…" aria-label="Your question" />' +
    '<button type="submit" aria-label="Send">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-6 16-3-7-7-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
    "</button>" +
    "</form>";

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var log = panel.querySelector("#askLog");
  var chipsWrap = panel.querySelector("#askChips");
  var form = panel.querySelector("#askForm");
  var input = panel.querySelector("#askInput");
  var closeBtn = panel.querySelector(".ask-close");
  var savedBtn = panel.querySelector(".ask-saved");
  var lastUserText = "";

  var STARTERS = [
    "Where should I go first?",
    "What should I eat?",
    "Best time to visit?",
    "Tell me about Ohrid",
    "How do I meet other travellers?",
  ];

  function renderChips() {
    chipsWrap.innerHTML = "";
    STARTERS.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "ask-chip";
      b.type = "button";
      b.textContent = s;
      b.addEventListener("click", function () {
        submit(s);
      });
      chipsWrap.appendChild(b);
    });
  }

  function addBubble(role, text) {
    var div = document.createElement("div");
    div.className = "ask-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderAll() {
    log.innerHTML = "";
    messages.forEach(function (m) {
      addBubble(m.role === "user" ? "user" : "bot", m.content);
    });
  }

  function openAsk(prefill) {
    panel.hidden = false;
    fab.style.display = "none";
    renderChips();
    renderAll();
    setTimeout(function () {
      input.focus();
    }, 50);
    if (prefill) submit(prefill);
  }
  function closeAsk() {
    panel.hidden = true;
    fab.style.display = "";
    fab.focus();
  }

  fab.addEventListener("click", function () {
    openAsk();
  });
  closeBtn.addEventListener("click", closeAsk);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closeAsk();
  });

  function submit(text) {
    text = (text || "").trim();
    if (!text) return;
    lastUserText = text;
    messages.push({ role: "user", content: text });
    addBubble("user", text);
    input.value = "";
    chipsWrap.innerHTML = "";

    var thinking = addBubble("bot", "…");

    respond(text)
      .then(function (reply) {
        thinking.textContent = reply;
        messages.push({ role: "assistant", content: reply });
        if (reply.length > 140) addSaveButton(thinking, text, reply);
        log.scrollTop = log.scrollHeight;
      })
      .catch(function () {
        thinking.textContent =
          "Sorry — something went wrong. Try again, or email hello@undiscovered-macedonia.example.";
      });
  }

  function addSaveButton(bubble, q, a) {
    var b = document.createElement("button");
    b.className = "ask-save";
    b.type = "button";
    b.textContent = "★ Save to my trip";
    b.addEventListener("click", function () {
      var all = store.get("um_saved_trips", []);
      all.push({ q: q, a: a, at: new Date().toISOString() });
      store.set("um_saved_trips", all);
      b.textContent = "✓ Saved";
      b.classList.add("saved");
      b.disabled = true;
    });
    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(b);
  }

  function renderSavedTrips(content, close) {
    var all = store.get("um_saved_trips", []);
    if (!all.length) {
      content.innerHTML =
        '<p class="um-empty">Nothing saved yet. Ask UMac for an itinerary, then hit “Save to my trip”.</p>';
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "um-list";
    all
      .slice()
      .reverse()
      .forEach(function (t, i) {
        var li = document.createElement("li");
        li.innerHTML =
          '<p class="um-meta"></p><p class="um-body"></p><button class="um-del">Remove</button>';
        li.querySelector(".um-meta").textContent =
          "“" + t.q + "” · " + new Date(t.at).toLocaleDateString();
        li.querySelector(".um-body").textContent = t.a;
        li.querySelector(".um-del").addEventListener("click", function () {
          var rest = store.get("um_saved_trips", []);
          rest.splice(rest.length - 1 - i, 1);
          store.set("um_saved_trips", rest);
          close();
          openModal(
            "Saved trips",
            "Answers you kept from UMac — stored in this browser.",
            renderSavedTrips
          );
        });
        ul.appendChild(li);
      });
    content.appendChild(ul);
  }
  savedBtn.addEventListener("click", function () {
    openModal(
      "Saved trips",
      "Answers you kept from UMac — stored in this browser.",
      renderSavedTrips
    );
  });

  function respond(text) {
    if (ASSISTANT_CONFIG.apiUrl) {
      return (
        fetch(ASSISTANT_CONFIG.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error("proxy " + r.status);
            return r.json();
          })
          .then(function (data) {
            return data.reply || localAnswer(text);
          })
          // proxy not running / offline / error -> fall back to the local guide
          .catch(function () {
            return localAnswer(text);
          })
      );
    }
    // Offline fallback with a short, natural delay
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(localAnswer(text));
      }, 400);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit(input.value);
  });

  // expose for the hero search button
  window.openAsk = openAsk;

  /* ---------- Departures filter ---------- */
  var depFilter = document.getElementById("depFilter");
  if (depFilter) {
    var depRows = Array.prototype.slice.call(document.querySelectorAll("#depBody tr"));
    var depEmpty = document.getElementById("depEmpty");
    depFilter.addEventListener("click", function (e) {
      var btn = e.target.closest(".dep-chip");
      if (!btn) return;
      var who = btn.getAttribute("data-guide");
      depFilter.querySelectorAll(".dep-chip").forEach(function (c) {
        var on = c === btn;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      var shown = 0;
      depRows.forEach(function (row) {
        var match = who === "all" || row.getAttribute("data-guide") === who;
        row.hidden = !match;
        if (match) shown++;
      });
      depEmpty.hidden = shown > 0;
    });
  }

  /* ---------- Macedonia map (Leaflet) ---------- */
  var mapEl = document.getElementById("macedonia-map");
  if (mapEl && window.L) {
    var mapBuilt = false;
    var buildMap = function () {
      if (mapBuilt) return;
      mapBuilt = true;
      initMap();
    };
    if ("IntersectionObserver" in window) {
      var mio = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            buildMap();
            mio.disconnect();
          }
        },
        { rootMargin: "300px" }
      );
      mio.observe(mapEl);
    } else {
      buildMap();
    }
  }

  function initMap() {
    var mapEl = document.getElementById("macedonia-map");
    var PLACES = [
      {
        n: "Skopje",
        ll: [41.9981, 21.4254],
        d: "The capital — Ottoman bazaar, Stone Bridge, Mother Teresa's birthplace.",
      },
      {
        n: "Matka Canyon",
        ll: [41.9556, 21.3025],
        d: "Kayaking and cave boat trips, 30 minutes from Skopje.",
      },
      {
        n: "Ohrid",
        ll: [41.1231, 20.8016],
        d: "UNESCO lake town — St. John at Kaneo, frescoed churches, clear water.",
      },
      {
        n: "Struga",
        ll: [41.1775, 20.6781],
        d: "Where the Black Drim leaves Lake Ohrid — beaches and the poetry festival.",
      },
      {
        n: "Mavrovo",
        ll: [41.6875, 20.7469],
        d: "National park, reservoir lake and the main ski resort.",
        park: true,
      },
      {
        n: "Bitola",
        ll: [41.0314, 21.3347],
        d: "The City of Consuls — café culture and Roman Heraclea nearby.",
      },
      {
        n: "Pelister",
        ll: [40.9847, 21.2136],
        d: "National park on Baba Mountain — glacial lakes and molika pine.",
        park: true,
      },
      {
        n: "Kruševo",
        ll: [41.3697, 21.2494],
        d: "The highest town in the country — paragliding and mountain air.",
      },
      {
        n: "Popova Šapka",
        ll: [42.0072, 20.955],
        d: "Ski and hiking resort on the Šar Mountains plateau.",
      },
      { n: "Tetovo", ll: [42.0106, 20.9714], d: "Home of the painted Šarena Džamija mosque." },
      {
        n: "Prilep",
        ll: [41.3453, 21.5544],
        d: "Beneath Marko's Towers — tobacco, marble, Treskavec monastery.",
      },
      {
        n: "Strumica",
        ll: [41.4378, 22.6431],
        d: "Spring carnival, Kolešino waterfall, the best peppers for ajvar.",
      },
      { n: "Dojran", ll: [41.1889, 22.7167], d: "A warm, shallow lake on the Greek border." },
      {
        n: "Kratovo",
        ll: [42.0781, 22.1783],
        d: "A town inside an extinct volcano crater, linked by stone bridges.",
      },
      {
        n: "Berovo",
        ll: [41.7072, 22.8558],
        d: "Pine forest and a mountain lake in the eastern Maleševo highlands.",
      },
      {
        n: "Vevčani",
        ll: [41.2408, 20.5906],
        d: "Spring-fed village near Ohrid, famous for its winter carnival.",
      },
      {
        n: "Stobi",
        ll: [41.5539, 21.9756],
        d: "Roman and early-Byzantine ruins with mosaics, in the Tikveš wine region.",
      },
      {
        n: "Lake Prespa",
        ll: [40.9, 20.98],
        d: "A high lake shared with Greece and Albania — orchards and pelicans.",
        park: true,
      },
      {
        n: "Galičica NP",
        ll: [40.95, 20.83],
        d: "The karst ridge between Ohrid and Prespa — panoramic road, wild horses.",
        park: true,
      },
    ];

    var map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: true }).setView(
      [41.55, 21.5],
      8
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    var bounds = [];
    PLACES.forEach(function (p) {
      var icon = L.divIcon({
        className: "",
        html: '<span class="mk-pin' + (p.park ? " is-park" : "") + '"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker(p.ll, { icon: icon, title: p.n })
        .addTo(map)
        .bindPopup("<strong>" + p.n + "</strong><br>" + p.d);
      bounds.push(p.ll);
    });
    map.fitBounds(bounds, { padding: [30, 30] });

    // recalc once more after tiles/layout settle
    map.whenReady(function () {
      map.invalidateSize();
      setTimeout(function () {
        map.invalidateSize();
      }, 200);
    });
  }
})();
