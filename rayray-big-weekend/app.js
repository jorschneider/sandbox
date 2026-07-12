/* Rayray Big Weekend — map + scrolling list, day picker, hour-by-hour weather. */
(function () {
  const data = window.WEEK_DATA;
  if (!data || !window.L) return;

  const BASES = {
    usq: { label: "home (Union Sq)", addr: "112 East 19th Street, New York, NY", coords: [40.7376, -73.9868], emoji: "🏠" },
    cpw: { label: "Grandma's", addr: "101 Central Park West, New York, NY", coords: [40.7757, -73.9787], emoji: "👵" },
  };
  const HOME_COORDS = BASES.usq.coords;

  const CATS = {
    music:     { label: "Music",            emoji: "🎵" },
    theater:   { label: "Shows & Puppets",  emoji: "🎭" },
    storytime: { label: "Storytime",        emoji: "📚" },
    play:      { label: "Splash & Play",    emoji: "⛲" },
    animals:   { label: "Animals & Nature", emoji: "🦆" },
    festival:  { label: "Festivals",        emoji: "🎪" },
    other:     { label: "Adventures",       emoji: "⛴️" },
  };

  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const TB = [
    { key: "morning",   label: "Morning",       emoji: "🌅" },
    { key: "afternoon", label: "Afternoon",     emoji: "☀️" },
    { key: "evening",   label: "Evening",       emoji: "🌆" },
    { key: "any",       label: "Anytime spots", emoji: "🧭" },
  ];

  // which day is "today" relative to the data's week
  const weekStart = new Date(data.weekMonday + "T00:00:00");
  const dayIndex = Math.floor((new Date() - weekStart) / 86400000); // 0 = Monday
  const todayKey = dayIndex >= 0 && dayIndex < 7 ? DAY_KEYS[dayIndex] : null;

  const state = { day: todayKey || "all", showAnytime: false, heartsOnly: false,
    base: /(^|[#&])base=cpw(&|$)/.test(location.hash) ? "cpw" : "usq" };
  const curBase = () => BASES[state.base];

  // rough door-to-door estimate from a base: walk when close, subway-ish beyond
  function estMinutes(base, e) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (e.lat - base.coords[0]) * toR;
    const dLng = (e.lng - base.coords[1]) * toR;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(base.coords[0] * toR) * Math.cos(e.lat * toR) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    return Math.round(km < 1.1 ? km * 14 : 9 + km * 3.8);
  }
  // Union Square times are researched; Grandma times are estimates
  const travelOf = (e) => state.base === "usq" ? e.travelMinutes : estMinutes(BASES.cpw, e);

  // ——— helpers ———
  function shortCost(e, n) {
    const c = (e.cost || "").trim();
    if (c.length <= n) return c;
    const cut = c.lastIndexOf(" ", n);
    return c.slice(0, cut > 20 ? cut : n) + "…";
  }
  // green chip only when genuinely free; free-with-paid-extras keeps the caveat text
  function costChip(e) {
    const c = (e.cost || "").trim();
    if (/^free\b/i.test(c)) {
      const extras = /\$|extra|donation/i.test(c);
      return '<span class="m-free">' + (extras ? "🟢 " + esc(shortCost(e, 40)) : "FREE 🎉") + "</span>";
    }
    return '<span class="m-cost">💸 ' + (esc(shortCost(e, 44)) || "check price") + "</span>";
  }
  const isEvent = (e) => e.event === true;
  const endMin = (e) => e.end
    ? parseInt(e.end.slice(0, 2), 10) * 60 + parseInt(e.end.slice(3), 10)
    : startMin(e) + 120;
  // 'now' | 'soon' | 'done' | null — only meaningful when viewing today
  function liveStatus(e) {
    if (!e.start || state.day !== todayKey || todayKey == null) return null;
    const now = new Date();
    const nowM = now.getHours() * 60 + now.getMinutes();
    if (nowM > endMin(e)) return "done";
    if (nowM >= startMin(e)) return "now";
    if (startMin(e) - nowM <= 90) return "soon";
    return null;
  }
  const startMin = (e) => e.start ? parseInt(e.start.slice(0, 2), 10) * 60 + parseInt(e.start.slice(3), 10) : Infinity;
  const keyOf = (e) => e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const byKey = {};
  data.events.forEach((e) => { byKey[keyOf(e)] = e; });

  function fmtTime(start) {
    let h = parseInt(start.slice(0, 2), 10);
    const mn = start.slice(3);
    const mer = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + (mn === "00" ? "" : ":" + mn) + " " + mer;
  }
  function timeBucket(e) {
    const ts = e.times || ["any"];
    if (ts.indexOf("any") !== -1) return "any";
    for (const b of ["morning", "afternoon", "evening"]) if (ts.indexOf(b) !== -1) return b;
    return "any";
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function dirUrl(e) {
    const dest = encodeURIComponent(e.venue + ", " + e.neighborhood + ", New York, NY");
    return "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(curBase().addr) + "&destination=" + dest;
  }

  // ——— hearts (persisted; #hearts=… share links still import) ———
  let hearts = new Set();
  try { hearts = new Set(JSON.parse(localStorage.getItem("rbw-hearts") || "[]").filter((k) => byKey[k])); } catch (err) {}
  const sharedMatch = location.hash.match(/hearts=([^&]*)/);
  if (sharedMatch && sharedMatch[1]) {
    decodeURIComponent(sharedMatch[1]).split(",").forEach((k) => { if (byKey[k]) hearts.add(k); });
    if (hearts.size) state.heartsOnly = true;
  }
  function toggleHeart(k) {
    if (hearts.has(k)) hearts.delete(k); else hearts.add(k);
    try { localStorage.setItem("rbw-hearts", JSON.stringify(Array.from(hearts))); } catch (err) {}
    if (state.heartsOnly) { render(); return; }
    mapList.querySelectorAll('.heart[data-key="' + k + '"]').forEach((b) => {
      if (b.classList.contains("btn-cal-mini")) return;
      b.textContent = hearts.has(k) ? "❤️" : "🤍";
      b.setAttribute("aria-pressed", String(hearts.has(k)));
    });
    syncPlanChip();
  }
  const planChip = document.getElementById("plan-chip");
  const copyPlanBtn = document.getElementById("copy-plan");
  function syncPlanChip() {
    planChip.textContent = "❤️ Our plan" + (hearts.size ? " (" + hearts.size + ")" : "");
    planChip.classList.toggle("active", state.heartsOnly);
    planChip.setAttribute("aria-pressed", String(state.heartsOnly));
    copyPlanBtn.hidden = !(state.heartsOnly && hearts.size > 0);
  }
  planChip.addEventListener("click", () => {
    state.heartsOnly = !state.heartsOnly;
    render();
  });
  copyPlanBtn.addEventListener("click", () => {
    const url = location.origin + location.pathname + "#" +
      (state.base === "cpw" ? "base=cpw&" : "") + "hearts=" + Array.from(hearts).join(",");
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => {
      copyPlanBtn.textContent = "✅ Copied!";
      setTimeout(() => { copyPlanBtn.textContent = "🔗 Copy link"; syncPlanChip(); }, 1600);
    }).catch(() => { prompt("Copy this link:", url); });
  });

  // ——— add to calendar (.ics) ———
  function icsDate(dayIdx, hm, plusMinutes) {
    const p = data.weekMonday.split("-").map(Number);
    const d = new Date(p[0], p[1] - 1, p[2] + dayIdx,
      parseInt(hm.slice(0, 2), 10), parseInt(hm.slice(3), 10) + (plusMinutes || 0));
    const pad = (n) => String(n).padStart(2, "0");
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  function icsEsc(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  }
  function downloadIcs(e) {
    if (!e || !e.start) return;
    const real = (e.days || []).filter((d) => DAY_KEYS.indexOf(d) !== -1);
    const dayKey = state.day !== "all" && real.indexOf(state.day) !== -1 ? state.day
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

  // ——— header ———
  document.getElementById("week-label").textContent = "Week of " + data.weekLabel;
  document.getElementById("updated-line").textContent =
    "Last refreshed " + data.updated + " · next refresh Monday morning 🌅";

  // ——— day picker ———
  const dayPicker = document.getElementById("day-picker");
  [{ key: "all", label: "Whole week" }]
    .concat(DAY_KEYS.map((k) => ({ key: k, label: DAY_LABELS[k] })))
    .forEach(({ key, label }) => {
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

  // ——— home-base switcher ———
  const basePicker = document.getElementById("base-picker");
  basePicker.querySelectorAll(".base").forEach((x) => {
    x.classList.toggle("active", x.dataset.base === state.base);
    x.setAttribute("aria-selected", String(x.dataset.base === state.base));
  });
  basePicker.querySelectorAll(".base").forEach((b) => {
    b.addEventListener("click", () => {
      state.base = b.dataset.base;
      basePicker.querySelectorAll(".base").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-selected", String(x === b));
      });
      homeMarker.setLatLng(curBase().coords);
      homeMarker.setTooltipContent(curBase().emoji + " " + curBase().label);
      homeMarker.setIcon(L.divIcon({ className: "emoji-pin emoji-pin-home", html: "<span>" + curBase().emoji + "</span>", iconSize: [38, 38], iconAnchor: [19, 19] }));
      render();
    });
  });

  // ——— the map (the one and only view) ———
  const mapList = document.getElementById("map-list");
  const map = L.map("map", { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  const homeMarker = L.marker(HOME_COORDS, {
    icon: L.divIcon({ className: "emoji-pin emoji-pin-home", html: "<span>🏠</span>", iconSize: [38, 38], iconAnchor: [19, 19] }),
  }).addTo(map).bindTooltip("🏠 home (Union Sq)", { direction: "top" });
  if (state.base !== "usq") {
    homeMarker.setLatLng(curBase().coords);
    homeMarker.setTooltipContent(curBase().emoji + " " + curBase().label);
    homeMarker.setIcon(L.divIcon({ className: "emoji-pin emoji-pin-home", html: "<span>" + curBase().emoji + "</span>", iconSize: [38, 38], iconAnchor: [19, 19] }));
  }
  const markerLayer = L.layerGroup().addTo(map);
  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = TB.map((b) => '<span><i class="tb-' + b.key + '"></i>' + b.label.replace(" spots", "") + "</span>").join("");
  document.querySelector(".map-pane").appendChild(legend);

  let markers = {};
  let markerIsEvent = {};
  let activeNum = null;
  // pins that would collide at the current zoom slide apart into a small ring;
  // they return to their true spots as you zoom in
  function spreadOverlaps() {
    const entries = Object.keys(markers).map((n) => {
      const m = markers[n];
      m.setLatLng(m._rbwOrig);
      return { m: m, px: map.latLngToLayerPoint(m._rbwOrig) };
    });
    const used = new Set();
    for (let i = 0; i < entries.length; i++) {
      if (used.has(i)) continue;
      const cluster = [entries[i]];
      for (let j = i + 1; j < entries.length; j++) {
        if (used.has(j)) continue;
        if (cluster.some((e) => entries[j].px.distanceTo(e.px) < 34)) {
          cluster.push(entries[j]);
          used.add(j);
        }
      }
      if (cluster.length < 2) continue;
      used.add(i);
      const cx = cluster.reduce((s, e) => s + e.px.x, 0) / cluster.length;
      const cy = cluster.reduce((s, e) => s + e.px.y, 0) / cluster.length;
      const r = 14 + 8 * cluster.length;
      cluster.forEach((e, k) => {
        const a = (2 * Math.PI * k) / cluster.length - Math.PI / 2;
        e.m.setLatLng(map.layerPointToLatLng(L.point(cx + r * Math.cos(a), cy + r * Math.sin(a))));
      });
    }
  }
  map.on("zoomend", spreadOverlaps);

  function markerIcon(e, num) {
    const cat = CATS[e.category] || CATS.other;
    return L.divIcon({
      className: "emoji-pin pin-tb-" + timeBucket(e) +
        (liveStatus(e) === "done" ? " pin-done" : "") + (liveStatus(e) === "now" ? " pin-live" : ""),
      html: "<span><em>" + cat.emoji + '<i class="pin-num">' + num + "</i></em></span>",
      iconSize: [38, 38],
      iconAnchor: [38, 38],   // the teardrop tip sits exactly on the venue
      popupAnchor: [0, -56],
    });
  }
  function popupHtml(e) {
    return (
      '<div class="pop">' +
        "<strong>" + esc(e.title) + "</strong>" +
        '<div class="pop-when">🕐 ' + esc(e.when) + "</div>" +
        '<div class="pop-venue">📍 ' + esc(e.venue) + " · ~" + travelOf(e) + " min</div>" +
        '<div class="pop-venue">🎟️ ' + esc(shortCost(e, 60)) + "</div>" +
        '<div class="pop-links"><a href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a>' +
        ' · <a href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a></div>' +
      "</div>"
    );
  }
  function miniCard(e, num) {
    const k = keyOf(e);
    const cat = CATS[e.category] || CATS.other;
    const live = liveStatus(e);
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.className = "mini-card" + (live === "done" ? " done" : "");
    el.dataset.num = num;
    el.innerHTML =
      '<span class="mini-num tb-' + timeBucket(e) + '">' + num + "</span>" +
      '<span class="mini-body">' +
        "<h4>" + cat.emoji + " " + esc(e.title) + (e.confidence && e.confidence !== "high" ? " 🔍" : "") + "</h4>" +
        '<p class="mini-start"><b>' + (e.start ? fmtTime(e.start) : "All day") + "</b>" +
          (live === "now" ? ' <span class="mini-live live-now">▶️ happening now</span>' :
           live === "soon" ? ' <span class="mini-live live-soon">⏰ starting soon</span>' :
           live === "done" ? ' <span class="mini-live live-done">✔ ended today</span>' :
           (isEvent(e) ? ' <span class="mini-star">⭐ this week</span>' : "")) + "</p>" +
        '<p class="mini-when">🕐 ' + esc(e.when) + "</p>" +
        (state.base === "usq" && e.travelHow ? '<p class="mini-when">🚇 ' + esc(e.travelHow) + "</p>" : "") +
        '<p class="mini-meta">' +
          costChip(e) +
          '<span class="m-travel">🚇 ~' + travelOf(e) + " min" + (state.base === "cpw" ? " from Grandma's (est)" : "") + "</span>" +
          (e.outdoor ? "<span>☀️</span>" : "<span>❄️ A/C</span>") +
        "</p>" +
        '<p class="mini-tip">🧸 ' + esc(e.toddlerNotes) + "</p>" +
        '<span class="mini-links">' +
          '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">Details ↗</a> · ' +
          '<a href="' + dirUrl(e) + '" target="_blank" rel="noopener">Directions 🗺️</a>' +
          (e.start ? ' · <button class="heart btn-cal-mini" data-key="' + k + '">📅 Calendar</button>' : "") +
        "</span>" +
      "</span>" +
      '<span class="mini-side">' +
        '<button class="heart mini-heart" data-key="' + k + '" aria-pressed="' + hearts.has(k) + '" title="Save to our plan">' + (hearts.has(k) ? "❤️" : "🤍") + "</button>" +
        (e.img ? '<img class="mini-img" src="' + esc(e.img) + '" alt="" loading="lazy" onerror="this.remove()">' : "") +
      "</span>";
    return el;
  }

  function highlight(num, opts) {
    opts = opts || {};
    if (num === activeNum && !opts.force) return;
    if (activeNum != null && markers[activeNum]) {
      const prevEl = markers[activeNum].getElement();
      if (prevEl) prevEl.classList.remove("pin-hot");
      markers[activeNum].setZIndexOffset(markerIsEvent[activeNum] ? 500 : 0);
    }
    activeNum = num;
    mapList.querySelectorAll(".mini-card").forEach((c) => c.classList.toggle("active", c.dataset.num === String(num)));
    const m = markers[num];
    if (m) {
      const el = m.getElement();
      if (el) el.classList.add("pin-hot");
      m.setZIndexOffset(1000);
      if (opts.fly) {
        map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
        m.openPopup();
      } else {
        // gentle drift toward the pin you're scrolled to — no zoom changes
        map.panTo(m.getLatLng(), { animate: true, duration: 0.8, easeLinearity: 0.4 });
      }
    }
    if (opts.scrollList) {
      const card = mapList.querySelector('.mini-card[data-num="' + num + '"]');
      if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function render() {
    dayPicker.querySelectorAll(".day").forEach((b) => b.classList.toggle("active", b.dataset.day === state.day));

    const list = data.events.filter((e) => {
      if (state.heartsOnly && !hearts.has(keyOf(e))) return false;
      if (state.base === "usq" && e.cpwOnly) return false; // beyond the Union Sq radius
      if (state.base === "cpw" && estMinutes(BASES.cpw, e) > 32) return false;
      if (state.day === "all") return true;
      const days = e.days || ["any"];
      return days.indexOf("any") !== -1 || days.indexOf(state.day) !== -1;
    }).sort((a, b) => startMin(a) - startMin(b) || (travelOf(a) || 99) - (travelOf(b) || 99));

    const label = state.day === "all" ? "this week" : (state.day === todayKey ? "today" : "on " + DAY_LABELS[state.day]);
    const nTimed = list.filter((e) => timeBucket(e) !== "any").length;
    const nAny = list.length - nTimed;
    document.getElementById("count").textContent =
      nTimed + " event" + (nTimed === 1 ? "" : "s") + " " + label +
      (nAny ? (state.showAnytime ? " + " + nAny + " anytime spots" : " (+" + nAny + " anytime spots below)") : "") + " 🎈";

    // rebuild list + markers, grouped by time of day
    markerLayer.clearLayers();
    markers = {};
    markerIsEvent = {};
    activeNum = null;
    mapList.innerHTML = "";
    mapList.scrollTop = 0;
    const pts = [curBase().coords];
    let num = 0;
    TB.forEach((bucket) => {
      const items = list.filter((e) => timeBucket(e) === bucket.key);
      if (!items.length) return;
      if (bucket.key === "any" && !state.showAnytime) {
        // anytime spots wait behind a reveal at the end of the scroll
        const btn = document.createElement("button");
        btn.className = "show-any";
        btn.innerHTML = "🧭 Show " + items.length + " anytime spots<small>playgrounds, splash pads, carousels & ferries</small>";
        btn.addEventListener("click", () => {
          state.showAnytime = true;
          render();
          const head = mapList.querySelector(".list-head-any");
          if (head) head.scrollIntoView({ block: "start", behavior: "smooth" });
        });
        mapList.appendChild(btn);
        return;
      }
      const head = document.createElement("div");
      head.className = "list-head" + (bucket.key === "any" ? " list-head-any" : "");
      head.innerHTML = bucket.emoji + " " + bucket.label + ' <span class="list-count tb-' + bucket.key + '">' + items.length + "</span>" +
        (bucket.key === "any" ? ' <button class="hide-any">hide</button>' : "");
      if (bucket.key === "any") {
        head.querySelector(".hide-any").addEventListener("click", () => {
          state.showAnytime = false;
          render();
        });
      }
      mapList.appendChild(head);
      items.forEach((e) => {
        if (typeof e.lat !== "number" || typeof e.lng !== "number") return;
        num += 1;
        const n = num;
        const m = L.marker([e.lat, e.lng], { icon: markerIcon(e, n), zIndexOffset: isEvent(e) ? 500 : 0 })
          .bindPopup(popupHtml(e), { maxWidth: 260 })
          .addTo(markerLayer);
        m._rbwOrig = L.latLng(e.lat, e.lng);
        m.on("click", () => highlight(n, { scrollList: true }));
        markers[n] = m;
        markerIsEvent[n] = isEvent(e);

        const card = miniCard(e, n);
        card.addEventListener("keydown", (ev) => {
          if ((ev.key === "Enter" || ev.key === " ") && ev.target === card) { ev.preventDefault(); card.click(); }
        });
        card.addEventListener("click", (ev) => {
          if (ev.target.closest("a") || ev.target.closest(".heart")) return;
          highlight(n, { fly: true, force: true });
        });
        mapList.appendChild(card);
        pts.push([e.lat, e.lng]);
      });
    });
    map.invalidateSize();
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.12), { animate: false });
      map.setZoom(Math.min(map.getZoom() + 2, 14), { animate: false }); // start close; scroll-follow roams the rest
    } else {
      map.setView(HOME_COORDS, 13);
    }

    spreadOverlaps();

    renderWxStrip();
    syncPlanChip();
  }

  // hearts + calendar clicks (list re-renders, so delegate)
  mapList.addEventListener("click", (ev) => {
    const cal = ev.target.closest(".btn-cal-mini");
    if (cal) { ev.stopPropagation(); downloadIcs(byKey[cal.dataset.key]); return; }
    const h = ev.target.closest(".heart");
    if (h) { ev.stopPropagation(); toggleHeart(h.dataset.key); }
  });

  // ——— Eater-style scroll sync: the pin for the card you're looking at lights up ———
  let scrollTick = false;
  function refY() {
    if (window.matchMedia("(max-width: 860px)").matches) {
      return document.getElementById("map").getBoundingClientRect().bottom + 30;
    }
    return mapList.getBoundingClientRect().top + 40;
  }
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      const ref = refY();
      const cards = mapList.querySelectorAll(".mini-card");
      let pick = null;
      for (const c of cards) {
        if (c.getBoundingClientRect().bottom > ref) { pick = c; break; }
      }
      if (pick) highlight(parseInt(pick.dataset.num, 10));
    });
  }
  mapList.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  // ——— weather: badges on day chips + hour-by-hour strip ———
  const WX = { daily: null, hourly: null };
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
  }
  function renderWxStrip() {
    const strip = document.getElementById("wx-strip");
    const di = state.day === "all"
      ? (todayKey ? DAY_KEYS.indexOf(todayKey) : -1)
      : DAY_KEYS.indexOf(state.day);
    if (!WX.hourly || di < 0) { strip.hidden = true; return; }
    const dayName = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" }[DAY_KEYS[di]];
    const isToday = DAY_KEYS[di] === todayKey;
    const nowHour = new Date().getHours();
    let html = "";
    let rainy = false;
    for (let h = 8; h <= 20; h++) {
      const i = di * 24 + h;
      if (!WX.hourly.weather_code || WX.hourly.weather_code[i] == null) continue;
      const code = WX.hourly.weather_code[i];
      const temp = Math.round(WX.hourly.temperature_2m[i]);
      const prob = WX.hourly.precipitation_probability[i];
      const wet = prob >= 40 || code >= 51;
      if (wet || prob >= 30) rainy = true;
      const hh = (h % 12 || 12) + (h >= 12 ? "p" : "a");
      html += '<span class="wx-h' + (wet ? " wet" : "") + (isToday && h === nowHour ? " now" : "") + '">' +
        "<b>" + hh + "</b>" + wxEmoji(code) + " " + temp + "°" +
        "<i>💧" + (prob == null ? "–" : prob + "%") + "</i>" +
      "</span>";
    }
    // only worth the space when rain is in play; sunny days keep the chip badge
    if (!rainy) { strip.hidden = true; return; }
    strip.hidden = false;
    document.getElementById("wx-label").textContent =
      "🌧️ Rain's around " + (isToday ? "today" : dayName) + " — hour by hour";
    document.getElementById("wx-hours").innerHTML = html;
  }
  (function loadWeather() {
    const end = (function () {
      const p = data.weekMonday.split("-").map(Number);
      const d = new Date(p[0], p[1] - 1, p[2] + 6);
      const pad = (n) => String(n).padStart(2, "0");
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    })();
    try {
      const cached = JSON.parse(sessionStorage.getItem("rbw-wx2") || "null");
      if (cached && cached.monday === data.weekMonday && Date.now() - cached.t < 3 * 3600e3) {
        WX.daily = cached.daily;
        WX.hourly = cached.hourly;
        decorateDays();
        renderWxStrip();
        return;
      }
    } catch (err) {}
    fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7376&longitude=-73.9868" +
      "&daily=weather_code,temperature_2m_max,precipitation_probability_max" +
      "&hourly=weather_code,temperature_2m,precipitation_probability" +
      "&temperature_unit=fahrenheit&timezone=America%2FNew_York" +
      "&start_date=" + data.weekMonday + "&end_date=" + end)
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.daily || !j.hourly) return;
        WX.daily = j.daily;
        WX.hourly = j.hourly;
        try { sessionStorage.setItem("rbw-wx2", JSON.stringify({ t: Date.now(), monday: data.weekMonday, daily: j.daily, hourly: j.hourly })); } catch (err) {}
        decorateDays();
        renderWxStrip();
      })
      .catch(() => {});
  })();

  render();
})();
