/* Rayray Big Weekend — renders week.js data with day/category/free/outdoor filters. */
(function () {
  const data = window.WEEK_DATA;
  if (!data) return;

  const HOME = "112 East 19th Street, New York, NY";

  const CATS = {
    music:     { label: "Music",           emoji: "🎵" },
    theater:   { label: "Shows & Puppets", emoji: "🎭" },
    storytime: { label: "Storytime",       emoji: "📚" },
    play:      { label: "Splash & Play",   emoji: "⛲" },
    animals:   { label: "Animals & Nature", emoji: "🦆" },
    festival:  { label: "Festivals",       emoji: "🎪" },
    other:     { label: "Adventures",      emoji: "⛴️" },
  };

  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const TIME_ORDER = ["morning", "afternoon", "evening"];
  const TIME_META = {
    morning: { label: "Morning", emoji: "🌅" },
    afternoon: { label: "Afternoon", emoji: "☀️" },
    evening: { label: "Evening", emoji: "🌆" },
  };
  const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

  // Which day is "today" relative to the data's week (only if we're inside it).
  const weekStart = new Date(data.weekMonday + "T00:00:00");
  const now = new Date();
  const dayIndex = Math.floor((now - weekStart) / 86400000); // 0 = Monday
  const todayKey = dayIndex >= 0 && dayIndex < 7 ? DAY_KEYS[dayIndex] : null;

  const state = {
    day: todayKey || "all",
    cat: "all",
    freeOnly: false,
    outdoorOnly: false,
    eventsOnly: false,
    time: "all",
    heartsOnly: false,
    indoorOnly: false,
    view: /(^|[#&])view=map(&|$)/.test(location.hash) ? "map" : "cards",
  };

  // ——— hearts (shortlist), persisted locally, shareable via #hearts=… ———
  const keyOf = (e) => e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const byKey = {};
  data.events.forEach((e) => { byKey[keyOf(e)] = e; });
  let hearts = new Set();
  try { hearts = new Set(JSON.parse(localStorage.getItem("rbw-hearts") || "[]").filter((k) => byKey[k])); } catch (err) {}
  const sharedMatch = location.hash.match(/hearts=([^&]*)/);
  if (sharedMatch && sharedMatch[1]) {
    decodeURIComponent(sharedMatch[1]).split(",").forEach((k) => { if (byKey[k]) hearts.add(k); });
    state.heartsOnly = hearts.size > 0;
  }
  function saveHearts() {
    try { localStorage.setItem("rbw-hearts", JSON.stringify(Array.from(hearts))); } catch (err) {}
  }
  function toggleHeart(k) {
    if (hearts.has(k)) hearts.delete(k); else hearts.add(k);
    saveHearts();
    render();
  }

  // earliest time-of-day bucket an entry belongs to; "any" = open all day places
  const timeBucket = (e) => {
    const ts = e.times || ["any"];
    if (ts.indexOf("any") !== -1) return "any";
    for (const k of TIME_ORDER) if (ts.indexOf(k) !== -1) return k;
    return "any";
  };

  // "real event" = a dated happening this week (not an open-anytime place)
  const isEvent = (e) => e.event === true;

  const isFree = (e) => /free/i.test(e.cost || "");

  const startMin = (e) => e.start ? parseInt(e.start.slice(0, 2), 10) * 60 + parseInt(e.start.slice(3), 10) : Infinity;
  function fmtTime(start) {
    let h = parseInt(start.slice(0, 2), 10);
    const mn = start.slice(3);
    const mer = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + (mn === "00" ? "" : ":" + mn) + " " + mer;
  }
  const TB_EMOJI = { morning: "🌅", afternoon: "☀️", evening: "🌆", any: "🧭" };

  // ——— header ———
  document.getElementById("week-label").textContent = "Week of " + data.weekLabel;
  document.getElementById("updated-line").textContent =
    "Last refreshed " + data.updated + " · next refresh Monday morning 🌅";

  // ——— day picker ———
  const dayPicker = document.getElementById("day-picker");
  const dayButtons = [{ key: "all", label: "Whole week" }]
    .concat(DAY_KEYS.map((k) => ({ key: k, label: DAY_LABELS[k] })));

  dayButtons.forEach(({ key, label }) => {
    const b = document.createElement("button");
    b.className = "day";
    b.textContent = label;
    b.dataset.day = key;
    if (todayKey && DAY_KEYS.indexOf(key) !== -1 && DAY_KEYS.indexOf(key) < DAY_KEYS.indexOf(todayKey)) {
      b.classList.add("past");
    }
    if (key === todayKey) {
      const tag = document.createElement("span");
      tag.className = "today-tag";
      tag.textContent = "TODAY!";
      b.appendChild(tag);
    }
    b.addEventListener("click", () => {
      state.day = key;
      state.indoorOnly = false; // the rain banner (its only control) is per-day
      render();
    });
    dayPicker.appendChild(b);
  });

  // ——— category picker ———
  const catPicker = document.getElementById("cat-picker");
  const usedCats = Object.keys(CATS).filter((c) => data.events.some((e) => e.category === c));
  [{ key: "all", label: "Everything", emoji: "🌈" }]
    .concat(usedCats.map((c) => ({ key: c, label: CATS[c].label, emoji: CATS[c].emoji })))
    .forEach(({ key, label, emoji }) => {
      const b = document.createElement("button");
      b.className = "cat";
      b.dataset.cat = key;
      b.textContent = emoji + " " + label;
      b.addEventListener("click", () => {
        state.cat = state.cat === key ? "all" : key;
        render();
      });
      catPicker.appendChild(b);
    });

  // ——— time-of-day picker ———
  const timePicker = document.getElementById("time-picker");
  [{ key: "all", label: "All times", emoji: "🕐" }]
    .concat(TIME_ORDER.map((k) => ({ key: k, label: TIME_META[k].label, emoji: TIME_META[k].emoji })))
    .forEach(({ key, label, emoji }) => {
      const b = document.createElement("button");
      b.className = "time";
      b.dataset.time = key;
      b.textContent = emoji + " " + label;
      b.addEventListener("click", () => {
        state.time = state.time === key ? "all" : key;
        render();
      });
      timePicker.appendChild(b);
    });

  // ——— toggles ———
  const freeBtn = document.getElementById("toggle-free");
  const outBtn = document.getElementById("toggle-outdoor");
  const evBtn = document.getElementById("toggle-events");
  freeBtn.addEventListener("click", () => {
    state.freeOnly = !state.freeOnly;
    render();
  });
  outBtn.addEventListener("click", () => {
    state.outdoorOnly = !state.outdoorOnly;
    render();
  });
  evBtn.addEventListener("click", () => {
    state.eventsOnly = !state.eventsOnly;
    render();
  });
  const heartsBtn = document.getElementById("toggle-hearts");
  heartsBtn.addEventListener("click", () => {
    state.heartsOnly = !state.heartsOnly;
    render();
  });
  const copyPlanBtn = document.getElementById("copy-plan");
  copyPlanBtn.addEventListener("click", () => {
    const url = location.origin + location.pathname + "#hearts=" + Array.from(hearts).join(",");
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => {
      copyPlanBtn.textContent = "✅ Copied!";
      setTimeout(() => { copyPlanBtn.textContent = "🔗 Copy plan link"; }, 1600);
    }).catch(() => { prompt("Copy this link:", url); });
  });

  // ——— view switch ———
  const cardsViewBtn = document.getElementById("view-cards");
  const mapViewBtn = document.getElementById("view-map");
  cardsViewBtn.addEventListener("click", () => { state.view = "cards"; history.replaceState(null, "", location.pathname + location.search); render(); });
  mapViewBtn.addEventListener("click", () => { state.view = "map"; history.replaceState(null, "", "#view=map"); render(); });

  // ——— cards ———
  function matches(e) {
    if (state.day !== "all") {
      const days = e.days || ["any"];
      if (!(days.indexOf("any") !== -1 || days.indexOf(state.day) !== -1)) return false;
    }
    if (state.cat !== "all" && e.category !== state.cat) return false;
    if (state.freeOnly && !isFree(e)) return false;
    if (state.outdoorOnly && !e.outdoor) return false;
    if (state.eventsOnly && !isEvent(e)) return false;
    if (state.heartsOnly && !hearts.has(keyOf(e))) return false;
    if (state.indoorOnly && e.outdoor) return false;
    if (state.time !== "all") {
      const ts = e.times || ["any"];
      if (!(ts.indexOf("any") !== -1 || ts.indexOf(state.time) !== -1)) return false;
    }
    return true;
  }

  function dirUrl(e) {
    const dest = encodeURIComponent(e.venue + ", " + e.neighborhood + ", New York, NY");
    return "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(HOME) + "&destination=" + dest;
  }

  function card(e) {
    const cat = CATS[e.category] || CATS.other;
    const el = document.createElement("article");
    el.className = "card";

    const chips = [];
    if (isEvent(e)) chips.push('<span class="chip chip-event">⭐ this week</span>');
    chips.push(isFree(e)
      ? '<span class="chip chip-free">FREE 🎉</span>'
      : '<span class="chip chip-cost">' + esc(e.cost) + "</span>");
    chips.push('<span class="chip chip-travel">🚇 ~' + e.travelMinutes + " min</span>");
    chips.push(e.outdoor
      ? '<span class="chip chip-outdoor">☀️ outside</span>'
      : '<span class="chip chip-indoor">❄️ inside (A/C!)</span>');
    if (e.confidence && e.confidence !== "high") {
      chips.push('<span class="chip chip-check">🔍 double-check</span>');
    }

    const k = keyOf(e);
    el.innerHTML =
      '<div class="card-top cat-' + esc(e.category) + '">' +
        '<span class="big-emoji">' + cat.emoji + "</span><span>" + esc(cat.label) + "</span>" +
        '<button class="heart" data-key="' + k + '" title="Save to our plan" aria-pressed="' + hearts.has(k) + '">' + (hearts.has(k) ? "❤️" : "🤍") + "</button>" +
      "</div>" +
      '<div class="card-body">' +
        '<div class="start-badge tb-' + timeBucket(e) + '">' + TB_EMOJI[timeBucket(e)] + " " +
          (e.start ? "Starts " + fmtTime(e.start) : "Open all day") + "</div>" +
        "<h3>" + esc(e.title) + "</h3>" +
        '<p class="venue">📍 ' + esc(e.venue) + " · " + esc(e.neighborhood) +
          " (" + esc(e.travelHow) + ")</p>" +
        '<p class="when">🕐 ' + esc(e.when) + "</p>" +
        '<div class="chips">' + chips.join("") + "</div>" +
        '<p class="tip">' + esc(e.toddlerNotes) + "</p>" +
        '<div class="actions">' +
          '<a class="btn btn-details" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a>' +
          '<a class="btn btn-map" href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a>' +
          (e.start ? '<button class="btn btn-cal" data-key="' + k + '" title="Add to calendar">📅</button>' : "") +
        "</div>" +
      "</div>";
    return el;
  }

  function icsDate(dayIdx, hm, plusMinutes) {
    const parts = data.weekMonday.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + dayIdx,
      parseInt(hm.slice(0, 2), 10), parseInt(hm.slice(3), 10) + (plusMinutes || 0));
    const pad = (n) => String(n).padStart(2, "0");
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  function icsEsc(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  }
  function downloadIcs(e) {
    if (!e.start) return;
    const days = e.days || [];
    const real = days.filter((d) => DAY_KEYS.indexOf(d) !== -1);
    const dayKey = state.day !== "all" && days.indexOf(state.day) !== -1 ? state.day
      : real.find((d) => todayKey == null || DAY_KEYS.indexOf(d) >= DAY_KEYS.indexOf(todayKey)) || real[0];
    const idx = DAY_KEYS.indexOf(dayKey);
    if (idx < 0) return;
    const txt = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rayray Big Weekend//EN",
      "BEGIN:VEVENT",
      "UID:" + keyOf(e) + "-" + data.weekMonday + "@rayray-big-weekend",
      "DTSTAMP:" + icsDate(idx, e.start) + "Z",
      "DTSTART:" + icsDate(idx, e.start),
      "DTEND:" + icsDate(idx, e.start, 90),
      "SUMMARY:" + icsEsc("🎈 " + e.title),
      "LOCATION:" + icsEsc(e.venue + ", " + e.neighborhood + ", New York, NY"),
      "DESCRIPTION:" + icsEsc(e.when + "\n\n" + e.toddlerNotes + "\n\n" + e.url),
      "URL:" + e.url,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
    a.download = keyOf(e) + ".ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // hearts + calendar clicks (cards re-render, so delegate)
  ["cards", "map-list"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (ev) => {
      const cal = ev.target.closest(".btn-cal, .btn-cal-mini");
      if (cal) { ev.stopPropagation(); downloadIcs(byKey[cal.dataset.key]); return; }
      const h = ev.target.closest(".heart");
      if (h) { ev.stopPropagation(); toggleHeart(h.dataset.key); }
    });
  });

  // ——— map ———
  const HOME_COORDS = [40.7376, -73.9868]; // 112 E 19th St
  let map = null;
  let markerLayer = null;
  let lastMapSig = null;

  function markerIcon(e, num) {
    const cat = CATS[e.category] || CATS.other;
    return L.divIcon({
      className: "emoji-pin pin-tb-" + timeBucket(e) + (isEvent(e) ? " emoji-pin-event" : ""),
      html: "<span>" + cat.emoji + '<i class="pin-num">' + num + "</i></span>",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18],
    });
  }

  function miniCard(e, num) {
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.className = "mini-card" + (isEvent(e) ? " is-event" : "");
    el.dataset.num = num;
    el.innerHTML =
      '<span class="mini-num tb-' + timeBucket(e) + '">' + num + "</span>" +
      '<span class="mini-body">' +
        "<h4>" + esc(e.title) + "</h4>" +
        '<p class="mini-start">' + TB_EMOJI[timeBucket(e)] + " <b>" + (e.start ? fmtTime(e.start) : "All day") + "</b></p>" +
        '<p class="mini-when">🕐 ' + esc(e.when) + "</p>" +
        '<p class="mini-meta">' +
          (isFree(e) ? '<span class="m-free">FREE</span>' : "<span>" + esc(e.cost.split(";")[0].slice(0, 28)) + "</span>") +
          '<span class="m-travel">🚇 ~' + e.travelMinutes + " min</span>" +
          (e.outdoor ? "<span>☀️</span>" : "<span>❄️</span>") +
        "</p>" +
        '<span class="mini-links">' +
          '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a> · ' +
          '<a href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a>' +
          (e.start ? ' · <button class="heart btn-cal-mini" data-key="' + keyOf(e) + '" style="font-size:0.82rem;margin:0;padding:0;font-weight:800;font-family:inherit">📅 Calendar</button>' : "") +
        "</span>" +
      "</span>" +
      '<button class="heart mini-heart" data-key="' + keyOf(e) + '" aria-pressed="' + hearts.has(keyOf(e)) + '">' + (hearts.has(keyOf(e)) ? "❤️" : "🤍") + "</button>";
    return el;
  }

  function popupHtml(e) {
    return (
      '<div class="pop">' +
        "<strong>" + esc(e.title) + "</strong>" +
        '<div class="pop-when">🕐 ' + esc(e.when) + "</div>" +
        '<div class="pop-venue">📍 ' + esc(e.venue) + " · ~" + e.travelMinutes + " min</div>" +
        '<div class="pop-links"><a href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a>' +
        ' · <a href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a></div>' +
      "</div>"
    );
  }

  function renderMap(list) {
    if (!window.L) return; // Leaflet failed to load — cards still work
    if (!map) {
      map = L.map("map", { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.marker(HOME_COORDS, {
        icon: L.divIcon({ className: "emoji-pin emoji-pin-home", html: "<span>🏠</span>", iconSize: [38, 38], iconAnchor: [19, 19] }),
      }).addTo(map).bindTooltip("Home base", { direction: "top" });
      markerLayer = L.layerGroup().addTo(map);
      const legend = document.createElement("div");
      legend.className = "map-legend";
      legend.innerHTML =
        '<span><i class="tb-morning"></i>Morning</span>' +
        '<span><i class="tb-afternoon"></i>Afternoon</span>' +
        '<span><i class="tb-evening"></i>Evening</span>' +
        '<span><i class="tb-any"></i>All day</span>';
      document.querySelector(".map-pane").appendChild(legend);
    }
    const sig = list.map(keyOf).join();
    if (sig === lastMapSig) {
      // same places (e.g. a heart toggled with the filter off) — refresh glyphs, keep viewport
      document.getElementById("map-list").querySelectorAll(".mini-heart").forEach((b) => {
        const on = hearts.has(b.dataset.key);
        b.textContent = on ? "❤️" : "🤍";
        b.setAttribute("aria-pressed", String(on));
      });
      map.invalidateSize();
      return;
    }
    lastMapSig = sig;
    markerLayer.clearLayers();
    const mapList = document.getElementById("map-list");
    mapList.innerHTML = "";
    const pts = [HOME_COORDS];
    const markers = {};

    const setActive = (num, scrollList) => {
      mapList.querySelectorAll(".mini-card").forEach((c) => c.classList.toggle("active", c.dataset.num === String(num)));
      if (scrollList) {
        const el = mapList.querySelector('.mini-card[data-num="' + num + '"]');
        if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };

    let num = 0;
    list.forEach((e) => {
      if (typeof e.lat !== "number" || typeof e.lng !== "number") return;
      num += 1;
      const n = num;
      const m = L.marker([e.lat, e.lng], { icon: markerIcon(e, n), zIndexOffset: isEvent(e) ? 500 : 0 })
        .bindPopup(popupHtml(e), { maxWidth: 260 })
        .addTo(markerLayer);
      m.on("click", () => setActive(n, true));
      markers[n] = m;

      const card = miniCard(e, n);
      card.addEventListener("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && ev.target === card) { ev.preventDefault(); card.click(); }
      });
      card.addEventListener("click", (ev) => {
        if (ev.target.closest("a") || ev.target.closest(".heart") || ev.target.closest(".btn-cal-mini")) return;
        setActive(n, false);
        map.flyTo([e.lat, e.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        m.openPopup();
      });
      mapList.appendChild(card);

      pts.push([e.lat, e.lng]);
    });
    map.invalidateSize();
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.12));
    else map.setView(HOME_COORDS, 13);
  }

  function render() {
    // reflect state on controls
    dayPicker.querySelectorAll(".day").forEach((b) => b.classList.toggle("active", b.dataset.day === state.day));
    catPicker.querySelectorAll(".cat").forEach((b) => b.classList.toggle("active", b.dataset.cat === state.cat));
    timePicker.querySelectorAll(".time").forEach((b) => b.classList.toggle("active", b.dataset.time === state.time));
    freeBtn.setAttribute("aria-pressed", String(state.freeOnly));
    outBtn.setAttribute("aria-pressed", String(state.outdoorOnly));
    evBtn.setAttribute("aria-pressed", String(state.eventsOnly));
    cardsViewBtn.classList.toggle("active", state.view === "cards");
    cardsViewBtn.setAttribute("aria-selected", String(state.view === "cards"));
    mapViewBtn.classList.toggle("active", state.view === "map");
    mapViewBtn.setAttribute("aria-selected", String(state.view === "map"));

    // chronological: earliest start first; open-anytime places last, by travel time
    const list = data.events.filter(matches).sort((a, b) =>
      startMin(a) - startMin(b) || (a.travelMinutes || 99) - (b.travelMinutes || 99));

    const cards = document.getElementById("cards");
    const mapShell = document.getElementById("map-shell");
    cards.hidden = state.view !== "cards";
    mapShell.hidden = state.view !== "map";

    if (state.view === "cards") {
      cards.innerHTML = "";
      const groups = [
        { key: "morning", label: "🌅 Morning" },
        { key: "afternoon", label: "☀️ Afternoon" },
        { key: "evening", label: "🌆 Evening" },
        { key: "any", label: "🧭 Anytime spots" },
      ];
      groups.forEach((g) => {
        const items = list.filter((e) => timeBucket(e) === g.key);
        if (!items.length) return;
        const head = document.createElement("h2");
        head.className = "time-head";
        head.innerHTML = g.label + ' <span class="time-count">' + items.length + "</span>";
        cards.appendChild(head);
        const grid = document.createElement("div");
        grid.className = "card-grid";
        items.forEach((e) => grid.appendChild(card(e)));
        cards.appendChild(grid);
      });
    } else {
      renderMap(list);
    }

    document.getElementById("empty").hidden = list.length > 0 || state.view === "map";
    const label = state.day === "all" ? "this week" : (state.day === todayKey ? "today" : "on " + DAY_LABELS[state.day]);
    const nEvents = list.filter(isEvent).length;
    document.getElementById("count").textContent = list.length > 0
      ? list.length + " adventure" + (list.length === 1 ? "" : "s") + " " + label +
        (nEvents ? " — " + nEvents + " real event" + (nEvents === 1 ? "" : "s") + " ⭐" : "") + " 🎈"
      : "";
  }

  // ——— reflect hearts/copy button + weather banner inside render ———
  const baseRender = render;
  render = function () {
    baseRender();
    heartsBtn.setAttribute("aria-pressed", String(state.heartsOnly));
    heartsBtn.textContent = "❤️ Our plan" + (hearts.size ? " (" + hearts.size + ")" : "");
    copyPlanBtn.hidden = !(state.heartsOnly && hearts.size > 0);
    updateWxBanner();
  };

  // ——— weather-aware day chips (Open-Meteo, keyless) ———
  const WX = { daily: null };
  function wxEmoji(code) {
    if (code === 0 || code === 1) return "☀️";
    if (code === 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 95) return "⛈️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 51) return "🌧️";
    return "🌡️";
  }
  function updateWxBanner() {
    const banner = document.getElementById("wx-banner");
    if (!WX.daily || state.day === "all") { banner.hidden = true; return; }
    const i = DAY_KEYS.indexOf(state.day);
    const prob = WX.daily.precipitation_probability_max[i];
    if (prob == null || prob < 50) { banner.hidden = true; return; }
    banner.hidden = false;
    banner.innerHTML = "🌧️ " + prob + "% chance of rain " + (state.day === todayKey ? "today" : "on " + DAY_LABELS[state.day]) +
      ' — <button id="wx-indoor">' + (state.indoorOnly ? "Show everything again" : "Show indoor (A/C) picks") + "</button>";
    document.getElementById("wx-indoor").addEventListener("click", () => {
      state.indoorOnly = !state.indoorOnly;
      render();
    });
  }
  (function loadWeather() {
    const end = (function () {
      const p = data.weekMonday.split("-").map(Number);
      const d = new Date(p[0], p[1] - 1, p[2] + 6);
      const pad = (n) => String(n).padStart(2, "0");
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    })();
    try {
      const cached = JSON.parse(sessionStorage.getItem("rbw-wx") || "null");
      if (cached && cached.monday === data.weekMonday && Date.now() - cached.t < 3 * 3600e3) {
        WX.daily = cached.daily;
        decorateDays();
        return;
      }
    } catch (err) {}
    fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7376&longitude=-73.9868" +
      "&daily=weather_code,temperature_2m_max,precipitation_probability_max" +
      "&temperature_unit=fahrenheit&timezone=America%2FNew_York" +
      "&start_date=" + data.weekMonday + "&end_date=" + end)
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.daily) return;
        WX.daily = j.daily;
        try { sessionStorage.setItem("rbw-wx", JSON.stringify({ t: Date.now(), monday: data.weekMonday, daily: j.daily })); } catch (err) {}
        decorateDays();
      })
      .catch(() => {});
  })();
  function decorateDays() {
    if (!WX.daily) return;
    dayPicker.querySelectorAll(".day").forEach((b) => {
      const i = DAY_KEYS.indexOf(b.dataset.day);
      if (i === -1 || !WX.daily.weather_code || WX.daily.weather_code[i] == null) return;
      if (b.querySelector(".day-wx")) return;
      const s = document.createElement("span");
      s.className = "day-wx";
      s.textContent = wxEmoji(WX.daily.weather_code[i]) + " " + Math.round(WX.daily.temperature_2m_max[i]) + "°";
      b.appendChild(s);
    });
    updateWxBanner();
  }

  render();
})();
