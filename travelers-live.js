/* ===== Meet Travellers — LIVE (Supabase backend) =====
   Production version of the travelers.js prototype.

   Same UI as the prototype — the card deck, drag interaction, match modal
   and chat window are copied unchanged. Only the DATA LAYER differs:

     prototype (travelers.js)        live (this file)
     ------------------------        --------------------------------
     SEED array                      supabase.rpc('discover_profiles')
     localStorage seen/matches       swipes / matches tables
     decide()'s "≥2 shared" rule     swipes insert → DB trigger decides
     replyTo() canned text           messages table + realtime
     no identity                     supabase.auth magic link

   Config comes from travelers-config.js (window.UM_SUPABASE).
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.UM_SUPABASE || {};
  var gate = document.getElementById("authGate");
  var app = document.getElementById("tvApp");

  if (!cfg.url || !cfg.anonKey) {
    gate.innerHTML =
      "<h2>Backend not configured</h2>" +
      "<p>Add your Supabase URL and anon key to <code>travelers-config.js</code>, " +
      "then reload. Setup steps are in <code>supabase/README.md</code>. " +
      'Meanwhile the <a class="text-link" href="travelers.html">offline prototype</a> works with no setup.</p>';
    gate.hidden = false;
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    gate.innerHTML = "<h2>Could not load Supabase</h2><p>Check your connection and reload.</p>";
    gate.hidden = false;
    return;
  }

  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  var INTERESTS = [
    "Hiking",
    "Museums",
    "Food tours",
    "Wine",
    "Kayaking",
    "Photography",
    "History",
    "Nightlife",
    "Road trips",
    "Budget travel",
    "Camping",
    "Architecture",
    "Swimming",
    "Cycling",
    "Local markets",
    "Slow travel",
  ];
  var AV_COLORS = [
    "#2C3D31",
    "#47624E",
    "#7A5C3E",
    "#3E5C6B",
    "#6B3E5C",
    "#4A4A2E",
    "#374C7A",
    "#7A4A3E",
  ];

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  function initials(name) {
    return (name || "?").trim().slice(0, 1).toUpperCase();
  }
  function colorFor(id) {
    var n = 0;
    for (var i = 0; i < id.length; i++) n += id.charCodeAt(i);
    return AV_COLORS[n % AV_COLORS.length];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ================= state ================= */
  var me = null; // auth user
  var profile = null; // my profile row
  var queue = []; // candidates to swipe
  var matchProfiles = {}; // id -> profile row (people I matched)
  var matchIds = []; // [otherUserId] newest last
  var chatCache = {}; // otherId -> [{from, text, at}]
  var msgChannel = null;

  function sharedInterests(p) {
    if (!profile) return [];
    var mine = profile.interests || [];
    return (p.interests || []).filter(function (x) {
      return mine.indexOf(x) !== -1;
    });
  }
  function pairKey(otherId) {
    return me.id < otherId ? [me.id, otherId] : [otherId, me.id];
  }

  /* ================= auth ================= */
  var authForm = $("#authForm");
  var authEmail = $("#authEmail");
  var authPass = $("#authPass");
  var authMsg = $("#authMsg");
  var signOutBtn = $("#signOutBtn");

  authForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = authEmail.value.trim();
    var pass = authPass ? authPass.value : "";
    if (!email) return;

    // With a password: sign in, or create the account if it's new.
    // Without one: send a magic link.
    if (pass) {
      authMsg.textContent = "Signing in…";
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        if (!res.error) return; // onAuthStateChange takes over
        if (/invalid login credentials/i.test(res.error.message)) {
          sb.auth.signUp({ email: email, password: pass }).then(function (up) {
            authMsg.textContent = up.error
              ? "Couldn't sign up: " + up.error.message
              : up.data.session
                ? "Account created."
                : "Account created — check your email to confirm, then sign in.";
          });
        } else {
          authMsg.textContent = res.error.message;
        }
      });
      return;
    }

    authMsg.textContent = "Sending…";
    sb.auth
      .signInWithOtp({ email: email, options: { emailRedirectTo: location.href.split("#")[0] } })
      .then(function (res) {
        authMsg.textContent = res.error
          ? "Couldn't send: " + res.error.message
          : "Check your email for a sign-in link, then come back to this tab.";
      });
  });

  signOutBtn.addEventListener("click", function () {
    sb.auth.signOut().then(function () {
      location.reload();
    });
  });

  sb.auth.getSession().then(function (res) {
    handleSession(res.data.session);
  });
  sb.auth.onAuthStateChange(function (_evt, session) {
    if (session && !me) handleSession(session);
  });

  function handleSession(session) {
    if (!session) {
      gate.hidden = false;
      app.hidden = true;
      return;
    }
    me = session.user;
    gate.hidden = true;
    app.hidden = false;
    signOutBtn.hidden = false;
    loadProfile();
  }

  /* ================= profile ================= */
  var form = $("#profileForm");
  var chipWrap = $("#interestChips");
  var selected = [];

  INTERESTS.forEach(function (name) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tv-chip";
    b.textContent = name;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () {
      var i = selected.indexOf(name);
      if (i === -1) selected.push(name);
      else selected.splice(i, 1);
      b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
    });
    chipWrap.appendChild(b);
  });

  function loadProfile() {
    sb.from("profiles")
      .select("*")
      .eq("id", me.id)
      .maybeSingle()
      .then(function (res) {
        profile = res.data || null;
        if (profile) {
          form.name.value = profile.name || "";
          form.country.value = profile.country || "";
          form.age.value = profile.age || "";
          form.pace.value = profile.pace || "Balanced";
          form.from.value = profile.from_date || "";
          form.to.value = profile.to_date || "";
          form.bio.value = profile.bio || "";
          selected = (profile.interests || []).slice();
          Array.prototype.forEach.call(chipWrap.children, function (b) {
            b.setAttribute(
              "aria-pressed",
              selected.indexOf(b.textContent) !== -1 ? "true" : "false"
            );
          });
        }
        buildDeck();
        refreshMatches();
        subscribeMatches();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (selected.length < 2) {
      $("#profileMsg").textContent = "Pick at least two interests so we can match you.";
      return;
    }
    var row = {
      id: me.id,
      name: form.name.value.trim(),
      country: form.country.value.trim(),
      age: form.age.value ? parseInt(form.age.value, 10) : null,
      pace: form.pace.value,
      from_date: form.from.value || null,
      to_date: form.to.value || null,
      bio: form.bio.value.trim(),
      interests: selected.slice(),
      updated_at: new Date().toISOString(),
    };
    $("#profileMsg").textContent = "Saving…";
    sb.from("profiles")
      .upsert(row)
      .select()
      .single()
      .then(function (res) {
        if (res.error) {
          $("#profileMsg").textContent = "Error: " + res.error.message;
          return;
        }
        profile = res.data;
        $("#profileMsg").textContent = "Saved. Start swiping →";
        buildDeck();
      });
  });

  /* ================= tabs ================= */
  var tabDiscover = $("#tabDiscover"),
    tabMatches = $("#tabMatches");
  var discoverView = $("#discoverView"),
    matchesView = $("#matchesView");
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
  tabDiscover.addEventListener("click", function () {
    setTab("discover");
  });
  tabMatches.addEventListener("click", function () {
    setTab("matches");
  });

  /* ================= deck ================= */
  var deck = $("#deck");
  var deckActions = $("#deckActions");
  var deckHint = $("#deckHint");

  function buildDeck() {
    if (!profile) {
      renderDeck();
      return;
    }
    sb.rpc("discover_profiles", { limit_count: 30 }).then(function (res) {
      queue = res.data || [];
      renderDeck();
    });
  }

  function renderDeck() {
    deck.innerHTML = "";
    if (!profile) {
      deck.innerHTML = '<p class="tv-empty">Save your profile to see other travellers.</p>';
      deckActions.hidden = true;
      deckHint.hidden = true;
      return;
    }
    if (!queue.length) {
      deck.innerHTML =
        '<p class="tv-empty">That\'s everyone for now. Check your Matches tab, or come back later.</p>';
      deckActions.hidden = true;
      deckHint.hidden = true;
      return;
    }
    var slice = queue.slice(0, 2).reverse();
    slice.forEach(function (p, idx) {
      deck.appendChild(cardEl(p, idx === slice.length - 1));
    });
    deckActions.hidden = false;
    deckHint.hidden = false;
  }

  function cardEl(p, isTop) {
    var shared = sharedInterests(p);
    var el = document.createElement("article");
    el.className = "tv-card";
    if (!isTop) el.style.transform = "scale(0.96) translateY(10px)";

    var tags = (p.interests || [])
      .map(function (i) {
        return (
          '<span class="tv-tag' +
          (shared.indexOf(i) !== -1 ? " shared" : "") +
          '">' +
          esc(i) +
          "</span>"
        );
      })
      .join("");

    var overlap = shared.length
      ? shared.length +
        " shared interest" +
        (shared.length > 1 ? "s" : "") +
        " · " +
        esc(shared.join(", "))
      : "No shared interests yet — still might click";

    var sub = [p.country, p.pace ? p.pace + " pace" : null].filter(Boolean).map(esc).join(" · ");

    el.innerHTML =
      '<span class="tv-stamp like">Connect</span>' +
      '<span class="tv-stamp nope">Skip</span>' +
      '<div class="tv-card-top">' +
      '<span class="tv-avatar" style="background:' +
      colorFor(p.id) +
      '">' +
      initials(p.name) +
      "</span>" +
      "<div><h3>" +
      esc(p.name) +
      (p.age ? ", " + p.age : "") +
      "</h3>" +
      '<div class="tv-card-sub">' +
      sub +
      "</div></div>" +
      "</div>" +
      '<p class="tv-card-bio">' +
      esc(p.bio) +
      "</p>" +
      '<div class="tv-card-tags">' +
      tags +
      "</div>" +
      '<p class="tv-overlap">' +
      overlap +
      "</p>";

    if (isTop) enableDrag(el, p);
    return el;
  }

  function enableDrag(el, p) {
    var startX = 0,
      startY = 0,
      dx = 0,
      dy = 0,
      dragging = false;
    var like = el.querySelector(".tv-stamp.like");
    var nope = el.querySelector(".tv-stamp.nope");

    function down(x, y) {
      dragging = true;
      startX = x;
      startY = y;
      el.style.transition = "none";
    }
    function move(x, y) {
      if (!dragging) return;
      dx = x - startX;
      dy = y - startY;
      el.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx / 18 + "deg)";
      like.style.opacity = dx > 30 ? Math.min(1, (dx - 30) / 80) : 0;
      nope.style.opacity = dx < -30 ? Math.min(1, (-dx - 30) / 80) : 0;
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      el.style.transition = "transform 0.3s ease";
      if (dx > 110) {
        fly(el, 1);
        decide(p, "like");
      } else if (dx < -110) {
        fly(el, -1);
        decide(p, "pass");
      } else {
        el.style.transform = "";
        like.style.opacity = 0;
        nope.style.opacity = 0;
      }
      dx = dy = 0;
    }

    el.addEventListener("mousedown", function (e) {
      down(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", function (e) {
      move(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", up);
    el.addEventListener(
      "touchstart",
      function (e) {
        down(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    el.addEventListener(
      "touchmove",
      function (e) {
        move(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    el.addEventListener("touchend", up);
  }

  function fly(el, dir) {
    el.classList.add("leaving");
    el.style.transform =
      "translate(" + dir * 600 + "px," + dir * 40 + "px) rotate(" + dir * 30 + "deg)";
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
    if (top) {
      top.classList.add("leaving");
      fly(top, kind === "like" ? 1 : -1);
    }
    decide(p, kind);
  }

  function decide(p, kind) {
    queue = queue.filter(function (q) {
      return q.id !== p.id;
    });
    setTimeout(renderDeck, 260);

    sb.from("swipes")
      .insert({ swiper: me.id, target: p.id, liked: kind === "like" })
      .then(function (res) {
        if (res.error || kind !== "like") return;
        // did the trigger create a match? check for the pair
        var pk = pairKey(p.id);
        sb.from("matches")
          .select("a,b")
          .eq("a", pk[0])
          .eq("b", pk[1])
          .maybeSingle()
          .then(function (m) {
            if (m.data) onNewMatch(p.id, p);
          });
      });
  }

  $("#btnSkip").addEventListener("click", function () {
    act("pass");
  });
  $("#btnConnect").addEventListener("click", function () {
    act("like");
  });
  document.addEventListener("keydown", function (e) {
    if ($("#chatDrawer").hidden === false) return;
    if (discoverView.hidden) return;
    if (e.key === "ArrowLeft") act("pass");
    if (e.key === "ArrowRight") act("like");
  });

  /* ================= match modal ================= */
  var modal = $("#matchModal");
  function showMatch(p) {
    $("#matchName").textContent = p.name;
    var sh = sharedInterests(p);
    $("#matchShared").textContent = sh.length
      ? "You both like " + sh.join(", ").toLowerCase() + "."
      : "Opposites attract, apparently.";
    modal.hidden = false;
    $("#matchMessage").onclick = function () {
      modal.hidden = true;
      openChat(p.id);
    };
    $("#matchKeep").onclick = function () {
      modal.hidden = true;
    };
  }
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.hidden = true;
  });

  /* ================= matches list ================= */
  var matchCountEl = $("#matchCount");
  function renderMatchCount() {
    var n = matchIds.length;
    matchCountEl.textContent = String(n);
    matchCountEl.hidden = n === 0;
  }

  function refreshMatches() {
    sb.from("matches")
      .select("a,b,at")
      .order("at", { ascending: true })
      .then(function (res) {
        var rows = res.data || [];
        var others = rows.map(function (r) {
          return r.a === me.id ? r.b : r.a;
        });
        matchIds = others;
        renderMatchCount();
        if (!others.length) {
          renderMatches();
          return;
        }
        sb.from("profiles")
          .select("*")
          .in("id", others)
          .then(function (pr) {
            (pr.data || []).forEach(function (row) {
              matchProfiles[row.id] = row;
            });
            renderMatches();
          });
      });
  }

  function onNewMatch(otherId, maybeProfile) {
    if (matchIds.indexOf(otherId) === -1) matchIds.push(otherId);
    renderMatchCount();
    function done(p) {
      matchProfiles[otherId] = p;
      renderMatches();
      showMatch(p);
    }
    if (maybeProfile) done(maybeProfile);
    else
      sb.from("profiles")
        .select("*")
        .eq("id", otherId)
        .single()
        .then(function (r) {
          if (r.data) done(r.data);
        });
  }

  function subscribeMatches() {
    sb.channel("matches-" + me.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        function (payload) {
          var r = payload.new;
          if (r.a !== me.id && r.b !== me.id) return;
          var otherId = r.a === me.id ? r.b : r.a;
          if (matchIds.indexOf(otherId) === -1) onNewMatch(otherId);
        }
      )
      .subscribe();
  }

  function renderMatches() {
    var list = $("#matchList");
    list.innerHTML = "";
    $("#noMatches").hidden = matchIds.length > 0;
    matchIds
      .slice()
      .reverse()
      .forEach(function (id) {
        var p = matchProfiles[id];
        if (!p) return;
        var msgs = chatCache[id] || [];
        var last = msgs.length ? msgs[msgs.length - 1] : null;
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.innerHTML =
          '<span class="tv-avatar" style="background:' +
          colorFor(id) +
          ';width:44px;height:44px;font-size:1rem">' +
          initials(p.name) +
          "</span>" +
          '<span><span class="tv-match-name">' +
          esc(p.name) +
          "</span><br>" +
          '<span class="tv-match-last">' +
          (last ? (last.from === "me" ? "You: " : "") + esc(last.text) : "Say hi") +
          "</span></span>" +
          '<span class="tv-match-arrow">›</span>';
        btn.addEventListener("click", function () {
          openChat(id);
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
  }

  /* ================= chat ================= */
  var drawer = $("#chatDrawer");
  var chatLog = $("#chatLog");
  var chatForm = $("#chatForm");
  var chatInput = $("#chatInput");
  var activeChat = null;

  function openChat(id) {
    activeChat = id;
    var p = matchProfiles[id];
    $("#chatWith").textContent = p ? p.name : "—";
    $("#chatMeta").textContent = p && p.country ? p.country : "";
    var av = $("#chatAvatar");
    av.textContent = initials(p && p.name);
    av.style.background = colorFor(id);
    chatLog.innerHTML = '<p class="tv-empty">Loading…</p>';
    drawer.hidden = false;
    loadMessages(id);
    listenMessages(id);
    setTimeout(function () {
      chatInput.focus();
    }, 50);
  }

  $("#chatBack").addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) closeChat();
  });
  function closeChat() {
    drawer.hidden = true;
    activeChat = null;
    if (msgChannel) {
      sb.removeChannel(msgChannel);
      msgChannel = null;
    }
  }

  function loadMessages(id) {
    var pk = pairKey(id);
    sb.from("messages")
      .select("sender,body,at")
      .eq("match_a", pk[0])
      .eq("match_b", pk[1])
      .order("at", { ascending: true })
      .then(function (res) {
        chatCache[id] = (res.data || []).map(function (m) {
          return { from: m.sender === me.id ? "me" : "them", text: m.body, at: m.at };
        });
        if (activeChat === id) renderChat();
        renderMatches();
      });
  }

  function listenMessages(id) {
    if (msgChannel) sb.removeChannel(msgChannel);
    var pk = pairKey(id);
    msgChannel = sb
      .channel("messages-" + pk.join("-"))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "match_a=eq." + pk[0],
        },
        function (payload) {
          var m = payload.new;
          if (m.match_b !== pk[1]) return;
          if (m.sender === me.id) return; // already shown optimistically
          chatCache[id] = chatCache[id] || [];
          chatCache[id].push({ from: "them", text: m.body, at: m.at });
          if (activeChat === id) renderChat();
          renderMatches();
        }
      )
      .subscribe();
  }

  function renderChat() {
    chatLog.innerHTML = "";
    (chatCache[activeChat] || []).forEach(function (m) {
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
    var id = activeChat;
    var pk = pairKey(id);
    chatInput.value = "";
    chatCache[id] = chatCache[id] || [];
    chatCache[id].push({ from: "me", text: text, at: new Date().toISOString() });
    renderChat();
    sb.from("messages")
      .insert({ match_a: pk[0], match_b: pk[1], sender: me.id, body: text })
      .then(function (res) {
        if (res.error) {
          chatCache[id].push({
            from: "them",
            text: "(message failed to send)",
            at: new Date().toISOString(),
          });
          if (activeChat === id) renderChat();
        }
        renderMatches();
      });
  });
})();
