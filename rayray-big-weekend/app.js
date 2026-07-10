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
    view: location.hash === "#view=map" ? "map" : "cards",
  };

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

    el.innerHTML =
      '<div class="card-top cat-' + esc(e.category) + '">' +
        '<span class="big-emoji">' + cat.emoji + "</span><span>" + esc(cat.label) + "</span>" +
      "</div>" +
      '<div class="card-body">' +
        "<h3>" + esc(e.title) + "</h3>" +
        '<p class="venue">📍 ' + esc(e.venue) + " · " + esc(e.neighborhood) +
          " (" + esc(e.travelHow) + ")</p>" +
        '<p class="when">🕐 ' + esc(e.when) + "</p>" +
        '<div class="chips">' + chips.join("") + "</div>" +
        '<p class="tip">' + esc(e.toddlerNotes) + "</p>" +
        '<div class="actions">' +
          '<a class="btn btn-details" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a>' +
          '<a class="btn btn-map" href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a>' +
        "</div>" +
      "</div>";
    return el;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ——— map ———
  const HOME_COORDS = [40.7376, -73.9868]; // 112 E 19th St
  let map = null;
  let markerLayer = null;

  function markerIcon(e, num) {
    const cat = CATS[e.category] || CATS.other;
    return L.divIcon({
      className: "emoji-pin" + (isEvent(e) ? " emoji-pin-event" : ""),
      html: "<span>" + cat.emoji + '<i class="pin-num">' + num + "</i></span>",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18],
    });
  }

  function miniCard(e, num) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "mini-card" + (isEvent(e) ? " is-event" : "");
    el.dataset.num = num;
    el.innerHTML =
      '<span class="mini-num">' + num + "</span>" +
      '<span class="mini-body">' +
        "<h4>" + esc(e.title) + "</h4>" +
        '<p class="mini-when">🕐 ' + esc(e.when) + "</p>" +
        '<p class="mini-meta">' +
          (isFree(e) ? '<span class="m-free">FREE</span>' : "<span>" + esc(e.cost.split(";")[0].slice(0, 28)) + "</span>") +
          '<span class="m-travel">🚇 ~' + e.travelMinutes + " min</span>" +
          (e.outdoor ? "<span>☀️</span>" : "<span>❄️</span>") +
        "</p>" +
        '<span class="mini-links">' +
          '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a> · ' +
          '<a href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a>' +
        "</span>" +
      "</span>";
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
    }
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
      card.addEventListener("click", (ev) => {
        if (ev.target.closest("a")) return; // let links be links
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

    // real dated events first (earliest day of the week first), then anytime spots by travel time
    const dayRank = (e) => Math.min.apply(null, (e.days || []).map((d) => {
      const i = DAY_KEYS.indexOf(d);
      return i === -1 ? 99 : i;
    }));
    const list = data.events.filter(matches).sort((a, b) => {
      if (isEvent(a) !== isEvent(b)) return isEvent(a) ? -1 : 1;
      if (isEvent(a)) return dayRank(a) - dayRank(b) || (a.travelMinutes || 99) - (b.travelMinutes || 99);
      return (a.travelMinutes || 99) - (b.travelMinutes || 99);
    });

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

  render();
})();
