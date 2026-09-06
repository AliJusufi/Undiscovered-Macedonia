/* ===== Meet Travellers — front-end prototype =====
   Thesis prototype. No backend: sample profiles + localStorage only.
   A production version would swap the SEED array and the match/chat
   functions for calls to a real API (accounts, database, realtime).
   ================================================================ */
(function () {
  "use strict";

  var INTERESTS = [
    "Hiking", "Museums", "Food tours", "Wine", "Kayaking", "Photography",
    "History", "Nightlife", "Road trips", "Budget travel", "Camping",
    "Architecture", "Swimming", "Cycling", "Local markets", "Slow travel"
  ];

  var SEED = [
    { id: "t1", name: "Lena", age: 28, country: "Germany", flag: "🇩🇪", langs: ["German", "English"], pace: "Balanced",
      interests: ["Hiking", "Photography", "Slow travel", "Local markets"],
      bio: "Three weeks around the Balkans. Want to walk in Mavrovo and Pelister, camera in hand." },
    { id: "t2", name: "Marco", age: 34, country: "Italy", flag: "🇮🇹", langs: ["Italian", "English"], pace: "Relaxed",
      interests: ["Wine", "Food tours", "History", "Architecture"],
      bio: "Here for Tikveš wineries and Ohrid. Looking for people to share long lunches with." },
    { id: "t3", name: "Priya", age: 25, country: "India", flag: "🇮🇳", langs: ["Hindi", "English"], pace: "Fast",
      interests: ["Museums", "History", "Architecture", "Photography"],
      bio: "Art history student. Skopje and Ohrid churches are the whole reason I came." },
    { id: "t4", name: "Tom", age: 31, country: "UK", flag: "🇬🇧", langs: ["English"], pace: "Balanced",
      interests: ["Hiking", "Kayaking", "Camping", "Swimming"],
      bio: "Trail runner. Planning Matka kayaking and a night on Pelister. Keen for a hiking buddy." },
    { id: "t5", name: "Sofia", age: 27, country: "Portugal", flag: "🇵🇹", langs: ["Portuguese", "Spanish", "English"], pace: "Relaxed",
      interests: ["Food tours", "Local markets", "Slow travel", "Swimming"],
      bio: "No plan, just Ohrid, a lake, and good food. Happy to be shown around." },
    { id: "t6", name: "Noah", age: 22, country: "Netherlands", flag: "🇳🇱", langs: ["Dutch", "English"], pace: "Fast",
      interests: ["Budget travel", "Nightlife", "Hiking", "Cycling"],
      bio: "Interrailing on a shoestring. Hostels, cheap kebapi, and any hike that's free." },
    { id: "t7", name: "Amara", age: 30, country: "USA", flag: "🇺🇸", langs: ["English"], pace: "Balanced",
      interests: ["Photography", "History", "Wine", "Road trips"],
      bio: "Renting a car for a week. Room for two more on a Kruševo + Bitola loop." },
    { id: "t8", name: "Jakub", age: 29, country: "Poland", flag: "🇵🇱", langs: ["Polish", "English"], pace: "Balanced",
      interests: ["Hiking", "Camping", "Photography", "Architecture"],
      bio: "Mountains first. Šar Planina and Pelister on the list, tent in the bag." },
    { id: "t9", name: "Yuki", age: 26, country: "Japan", flag: "🇯🇵", langs: ["Japanese", "English"], pace: "Fast",
      interests: ["Museums", "Food tours", "Local markets", "Architecture"],
      bio: "Solo, love old bazaars. Skopje's Čaršija then down to Ohrid by bus." },
    { id: "t10", name: "Elif", age: 33, country: "Türkiye", flag: "🇹🇷", langs: ["Turkish", "English"], pace: "Relaxed",
      interests: ["History", "Food tours", "Wine", "Slow travel"],
      bio: "Following the Ottoman-era trail — Tetovo, Bitola, Ohrid. Slow days, long dinners." },
    { id: "t11", name: "Diego", age: 24, country: "Mexico", flag: "🇲🇽", langs: ["Spanish", "English"], pace: "Fast",
      interests: ["Nightlife", "Budget travel", "Swimming", "Cycling"],
      bio: "Ohrid beaches by day, bars by night. Down for a cheap boat trip if anyone's in." },
    { id: "t12", name: "Anna", age: 36, country: "Sweden", flag: "🇸🇪", langs: ["Swedish", "English"], pace: "Balanced",
      interests: ["Hiking", "Wine", "Photography", "Slow travel"],
      bio: "First time in the region. Want one good hike and one good winery, minimum." },
    { id: "t13", name: "Karim", age: 27, country: "France", flag: "🇫🇷", langs: ["French", "English"], pace: "Balanced",
      interests: ["Kayaking", "Hiking", "Camping", "Local markets"],
      bio: "Outdoorsy. Matka, then east to Berovo where nobody goes. Join for either leg." },
    { id: "t14", name: "Mia", age: 23, country: "Australia", flag: "🇦🇺", langs: ["English"], pace: "Relaxed",
      interests: ["Swimming", "Food tours", "Photography", "Budget travel"],
      bio: "Long way from home, no rush. Lake days and cheap eats around Ohrid." }
  ];

  var AV_COLORS = ["#2C3D31", "#47624E", "#7A5C3E", "#3E5C6B", "#6B3E5C", "#4A4A2E", "#374C7A", "#7A4A3E"];

  /* ---------- storage ---------- */
  var LS = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };
  var K_PROFILE = "um_tv_profile";
  var K_SEEN = "um_tv_seen";
  var K_MATCHES = "um_tv_matches";
  var K_CHATS = "um_tv_chats";

  var profile = LS.get(K_PROFILE, null);
  var seen = LS.get(K_SEEN, {});          // id -> "like" | "pass"
  var matches = LS.get(K_MATCHES, []);    // [id]
  var chats = LS.get(K_CHATS, {});        // id -> [{from:"me"|"them", text}]

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function initials(name) { return name.trim().slice(0, 1).toUpperCase(); }
  function colorFor(id) {
    var n = 0; for (var i = 0; i < id.length; i++) n += id.charCodeAt(i);
    return AV_COLORS[n % AV_COLORS.length];
  }
  function personById(id) {
    for (var i = 0; i < SEED.length; i++) if (SEED[i].id === id) return SEED[i];
    return null;
  }
  function sharedInterests(p) {
    if (!profile) return [];
    return p.interests.filter(function (x) { return profile.interests.indexOf(x) !== -1; });
  }

  /* ---------- profile form ---------- */
  var form = $("#profileForm");
  var chipWrap = $("#interestChips");
  var selected = profile ? profile.interests.slice() : [];

  INTERESTS.forEach(function (name) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tv-chip";
    b.textContent = name;
    b.setAttribute("aria-pressed", selected.indexOf(name) !== -1 ? "true" : "false");
    b.addEventListener("click", function () {
      var i = selected.indexOf(name);
      if (i === -1) selected.push(name); else selected.splice(i, 1);
      b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
    });
    chipWrap.appendChild(b);
  });

  if (profile) {
    form.name.value = profile.name || "";
    form.country.value = profile.country || "";
    form.age.value = profile.age || "";
    form.pace.value = profile.pace || "Balanced";
    form.from.value = profile.from || "";
    form.to.value = profile.to || "";
    form.bio.value = profile.bio || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (selected.length < 2) {
      $("#profileMsg").textContent = "Pick at least two interests so we can match you.";
      return;
    }
    profile = {
      name: form.name.value.trim(),
      country: form.country.value.trim(),
      age: form.age.value,
      pace: form.pace.value,
      from: form.from.value,
      to: form.to.value,
      bio: form.bio.value.trim(),
      interests: selected.slice()
    };
    LS.set(K_PROFILE, profile);
    $("#profileMsg").textContent = "Saved. Start swiping →";
    buildDeck();
    renderMatchCount();
  });

  /* ---------- tabs ---------- */
  var tabDiscover = $("#tabDiscover"), tabMatches = $("#tabMatches");
  var discoverView = $("#discoverView"), matchesView = $("#matchesView");
  function setTab(which) {
    var d = which === "discover";
    tabDiscover.classList.toggle("is-active", d);
    tabMatches.classList.toggle("is-active", !d);
    tabDiscover.setAttribute("aria-selected", String(d));
    tabMatches.setAttribute("aria-selected", String(!d));
    discoverView.hidden = !d;
    matchesView.hidden = d;
    if (!d) renderMatches();
  }
  tabDiscover.addEventListener("click", function () { setTab("discover"); });
  tabMatches.addEventListener("click", function () { setTab("matches"); });

  /* ---------- deck ---------- */
  var deck = $("#deck");
  var deckActions = $("#deckActions");
  var deckHint = $("#deckHint");
  var queue = [];

  function buildDeck() {
    queue = SEED.filter(function (p) { return !seen[p.id]; });
    // most-in-common first
    queue.sort(function (a, b) { return sharedInterests(b).length - sharedInterests(a).length; });
    renderDeck();
  }

  function renderDeck() {
    deck.innerHTML = "";
    if (!profile) {
      deck.innerHTML = '<p class="tv-empty" id="deckLocked">Save your profile to see other travellers.</p>';
      deckActions.hidden = true;
      deckHint.hidden = true;
      return;
    }
    if (!queue.length) {
      deck.innerHTML = '<p class="tv-empty">That\'s everyone for now. Check your Matches tab, or come back later.</p>';
      deckActions.hidden = true;
      deckHint.hidden = true;
      return;
    }
    // render up to 2 cards, top one last (on top)
    var slice = queue.slice(0, 2).reverse();
    slice.forEach(function (p, idx) {
      var isTop = idx === slice.length - 1;
      deck.appendChild(cardEl(p, isTop));
    });
    deckActions.hidden = false;
    deckHint.hidden = false;
  }

  function cardEl(p, isTop) {
    var shared = sharedInterests(p);
    var el = document.createElement("article");
    el.className = "tv-card";
    if (!isTop) el.style.transform = "scale(0.96) translateY(10px)";

    var tags = p.interests.map(function (i) {
      return '<span class="tv-tag' + (shared.indexOf(i) !== -1 ? " shared" : "") + '">' + i + "</span>";
    }).join("");

    var overlap = shared.length
      ? shared.length + " shared interest" + (shared.length > 1 ? "s" : "") + " · " + shared.join(", ")
      : "No shared interests yet — still might click";

    el.innerHTML =
      '<span class="tv-stamp like">Connect</span>' +
      '<span class="tv-stamp nope">Skip</span>' +
      '<div class="tv-card-top">' +
        '<span class="tv-avatar" style="background:' + colorFor(p.id) + '">' + initials(p.name) + '</span>' +
        '<div><h3>' + p.name + ', ' + p.age + '</h3>' +
        '<div class="tv-card-sub">' + p.flag + ' ' + p.country + ' · ' + p.pace + ' pace · ' + p.langs.join(", ") + '</div></div>' +
      '</div>' +
      '<p class="tv-card-bio">' + p.bio + '</p>' +
      '<div class="tv-card-tags">' + tags + '</div>' +
      '<p class="tv-overlap">' + overlap + '</p>';

    if (isTop) enableDrag(el, p);
    return el;
  }

  function enableDrag(el, p) {
    var startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
    var like = el.querySelector(".tv-stamp.like");
    var nope = el.querySelector(".tv-stamp.nope");

    function down(x, y) { dragging = true; startX = x; startY = y; el.style.transition = "none"; }
    function move(x, y) {
      if (!dragging) return;
      dx = x - startX; dy = y - startY;
      el.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (dx / 18) + "deg)";
      like.style.opacity = dx > 30 ? Math.min(1, (dx - 30) / 80) : 0;
      nope.style.opacity = dx < -30 ? Math.min(1, (-dx - 30) / 80) : 0;
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      el.style.transition = "transform 0.3s ease";
      if (dx > 110) { fly(el, 1); decide(p, "like"); }
      else if (dx < -110) { fly(el, -1); decide(p, "pass"); }
      else { el.style.transform = ""; like.style.opacity = 0; nope.style.opacity = 0; }
      dx = dy = 0;
    }

    el.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); });
    window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
    window.addEventListener("mouseup", up);
    el.addEventListener("touchstart", function (e) { down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener("touchmove", function (e) { move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener("touchend", up);
  }

  function fly(el, dir) {
    el.classList.add("leaving");
    el.style.transform = "translate(" + (dir * 600) + "px," + (dir * 40) + "px) rotate(" + (dir * 30) + "deg)";
    el.style.opacity = "0";
  }

  function currentTopCard() {
    var cards = deck.querySelectorAll(".tv-card");
    return cards[cards.length - 1] || null;
  }

  function act(kind) {
    if (!queue.length) return;
    var p = queue[0];
    var top = currentTopCard();
    if (top) { top.classList.add("leaving"); fly(top, kind === "like" ? 1 : -1); }
    decide(p, kind);
  }

  function decide(p, kind) {
    seen[p.id] = kind;
    LS.set(K_SEEN, seen);
    queue = queue.filter(function (q) { return q.id !== p.id; });

    var matched = false;
    if (kind === "like") {
      var sh = sharedInterests(p).length;
      matched = sh >= 2 || Math.random() < 0.35;
      if (matched && matches.indexOf(p.id) === -1) {
        matches.push(p.id);
        LS.set(K_MATCHES, matches);
        if (!chats[p.id]) {
          chats[p.id] = [{ from: "them", text: openingLine(p) }];
          LS.set(K_CHATS, chats);
        }
        renderMatchCount();
      }
    }

    setTimeout(function () {
      renderDeck();
      if (matched) showMatch(p);
    }, 260);
  }

  function openingLine(p) {
    var sh = sharedInterests(p);
    if (sh.length) return "Hey! Saw we're both into " + sh[0].toLowerCase() + " — when are you around?";
    return "Hi! What are your plans while you're here?";
  }

  $("#btnSkip").addEventListener("click", function () { act("pass"); });
  $("#btnConnect").addEventListener("click", function () { act("like"); });
  document.addEventListener("keydown", function (e) {
    if ($("#chatDrawer").hidden === false) return;
    if (discoverView.hidden) return;
    if (e.key === "ArrowLeft") act("pass");
    if (e.key === "ArrowRight") act("like");
  });

  /* ---------- match modal ---------- */
  var modal = $("#matchModal");
  function showMatch(p) {
    $("#matchName").textContent = p.name;
    var sh = sharedInterests(p);
    $("#matchShared").textContent = sh.length
      ? "You both like " + sh.join(", ").toLowerCase() + "."
      : "Opposites attract, apparently.";
    modal.hidden = false;
    $("#matchMessage").onclick = function () { modal.hidden = true; openChat(p.id); };
    $("#matchKeep").onclick = function () { modal.hidden = true; };
  }
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });

  /* ---------- matches + chat ---------- */
  var matchCountEl = $("#matchCount");
  function renderMatchCount() {
    var n = matches.length;
    matchCountEl.textContent = String(n);
    matchCountEl.hidden = n === 0;
  }

  function renderMatches() {
    var list = $("#matchList");
    list.innerHTML = "";
    $("#noMatches").hidden = matches.length > 0;
    matches.slice().reverse().forEach(function (id) {
      var p = personById(id);
      if (!p) return;
      var msgs = chats[id] || [];
      var last = msgs.length ? msgs[msgs.length - 1] : null;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.innerHTML =
        '<span class="tv-avatar" style="background:' + colorFor(id) + ';width:44px;height:44px;font-size:1rem">' + initials(p.name) + '</span>' +
        '<span><span class="tv-match-name">' + p.name + '</span><br>' +
        '<span class="tv-match-last">' + (last ? (last.from === "me" ? "You: " : "") + last.text : "Say hi") + '</span></span>' +
        '<span class="tv-match-arrow">›</span>';
      btn.addEventListener("click", function () { openChat(id); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  var drawer = $("#chatDrawer");
  var chatLog = $("#chatLog");
  var chatForm = $("#chatForm");
  var chatInput = $("#chatInput");
  var activeChat = null;

  function openChat(id) {
    activeChat = id;
    var p = personById(id);
    $("#chatWith").textContent = p.name;
    $("#chatMeta").textContent = p.flag + " " + p.country + " · here " + fmtDates(p);
    var av = $("#chatAvatar");
    av.textContent = initials(p.name);
    av.style.background = colorFor(id);
    renderChat();
    drawer.hidden = false;
    setTimeout(function () { chatInput.focus(); }, 50);
  }
  function fmtDates() { return "around the same time"; }

  $("#chatBack").addEventListener("click", function () { drawer.hidden = true; activeChat = null; });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) { drawer.hidden = true; activeChat = null; }
  });

  function renderChat() {
    chatLog.innerHTML = "";
    (chats[activeChat] || []).forEach(function (m) {
      var b = document.createElement("div");
      b.className = "tv-bubble " + (m.from === "me" ? "me" : "them");
      b.textContent = m.text;
      chatLog.appendChild(b);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text || !activeChat) return;
    chats[activeChat] = chats[activeChat] || [];
    chats[activeChat].push({ from: "me", text: text });
    LS.set(K_CHATS, chats);
    chatInput.value = "";
    renderChat();
    var id = activeChat;
    setTimeout(function () {
      if (activeChat !== id && drawer.hidden) { /* still store reply */ }
      chats[id].push({ from: "them", text: replyTo(text, personById(id)) });
      LS.set(K_CHATS, chats);
      if (activeChat === id) renderChat();
      if (!discoverView.hidden) { /* noop */ }
      if (!matchesView.hidden) renderMatches();
    }, 900 + Math.random() * 900);
  });

  function replyTo(text, p) {
    var q = text.toLowerCase();
    var sh = sharedInterests(p);
    if (q.indexOf("hik") !== -1 || q.indexOf("walk") !== -1 || q.indexOf("trail") !== -1)
      return "I'm keen for a hike. Pelister or Matka? I could do either this week.";
    if (q.indexOf("wine") !== -1 || q.indexOf("tikve") !== -1)
      return "Yes — someone said the Stobi and Popova Kula estates do tastings with lunch. Want to split a car?";
    if (q.indexOf("food") !== -1 || q.indexOf("eat") !== -1 || q.indexOf("dinner") !== -1 || q.indexOf("lunch") !== -1)
      return "There's a place in the Old Bazaar doing tavče gravče. Tomorrow evening?";
    if (q.indexOf("ohrid") !== -1) return "I'll be in Ohrid too. Kaneo church at sunset is supposed to be the spot.";
    if (q.indexOf("skopje") !== -1) return "I'm in Skopje until Thursday. Free most afternoons.";
    if (q.indexOf("matka") !== -1 || q.indexOf("kayak") !== -1) return "Matka kayaking sounds great. Morning is calmer on the water I think.";
    if (/\b(when|what day|which day|time|date)\b/.test(q)) return "I'm flexible — mornings are better for me. What suits you?";
    if (/\b(yes|yeah|sure|sounds good|let's|lets|deal|ok|okay)\b/.test(q)) return "Perfect. I'll message you here to sort the details.";
    if (/\b(hi|hey|hello|yo)\b/.test(q)) return "Hey " + (profile ? profile.name : "there") + "! Good to match.";
    if (q.indexOf("?") !== -1) return "Good question — let me check and get back to you. " + (sh.length ? "Either way, down for something " + sh[0].toLowerCase() + "-related." : "");
    return sh.length
      ? "Nice. Since we're both into " + sh[0].toLowerCase() + ", want to plan something around that?"
      : "Cool. Let me know what you're up to and I'll try to join.";
  }

  /* ---------- init ---------- */
  buildDeck();
  renderMatchCount();
})();
