/* Jordan & Athena Weeknights — map + list, night picker, walk-radius filter.
   Two modes share the machinery: "athena" (ATHENA_DATA) and "jordan" (JORDAN_DATA).
   Same shape as the Rayray Big Weekend app, trimmed to weeknights: no weather,
   no second home base, no next-week preview — a class schedule is a standing
   thing, so the week picker earns nothing here. */
(function () {
  const MODE = /(^|[#&])mode=jordan(&|$)/.test(location.hash) && window.JORDAN_DATA ? "jordan" : "athena";
  const data = MODE === "jordan" ? window.JORDAN_DATA : window.ATHENA_DATA;
  if (!data || !window.L) return;
  document.body.classList.add("mode-" + MODE);

  // per-mode voice: everything user-facing that differs between the two sides
  const COPY = MODE === "jordan" ? {
    emoji: "🥋", name: "Jordan's Weeknights", moon: "🥊",
    tagline: "Mats &amp; fields within <strong>25 minutes of Union Square</strong> — jiu jitsu, muay thai, wrestling, boxing &amp; pickup soccer. Martial arts stay inside a 15-minute walk.",
    noteHead: "🎒 Before you go",
    noteBody: "Four of the six gyms let you train the first class free, and the run club is free full stop — there is no reason to pay before you know you like it. A <em>🔍</em> means the venue and terms are confirmed but the exact time sits behind a booking app: tap through to pin it down. Soccer games are booked per-game in the GoodRec app.",
    footer: "Home base: 112 East 19th Street · times are door-to-door from Union Square.",
    countWord: "sessions", icsPrefix: "🥋 ",
  } : {
    emoji: "🧘", name: "Athena's Weeknights", moon: "🌙",
    tagline: "Classes within a <strong>15-minute walk of Union Square</strong> — yoga, ballet, barre &amp; dance.",
    noteHead: "🎒 Before you go",
    noteBody: "Most studios want you booked in advance — the small rooms near Union Square fill up. A <em>🔍</em> next to a class means the venue, price and booking link are confirmed but the exact slot rotates weekly behind the studio's booking app: tap through to pin it down.",
    footer: "Home base: 112 East 19th Street · walk times are on foot from Union Square.",
    countWord: "classes", icsPrefix: "🧘 ",
  };
  document.getElementById("hero-emoji").textContent = COPY.emoji;
  document.getElementById("hero-name").textContent = COPY.name;
  document.getElementById("hero-moon").textContent = COPY.moon;
  document.getElementById("hero-tagline").innerHTML = COPY.tagline;
  document.getElementById("note-head").textContent = COPY.noteHead;
  document.getElementById("note-body").innerHTML = COPY.noteBody;
  document.getElementById("footer-line").textContent = COPY.footer;
  document.title = MODE === "jordan" ? "Jordan's Weeknights" : "Athena's Weeknights";

  // mode toggle: hash carries the mode, then a clean reload
  document.querySelectorAll("#mode-picker .md").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === MODE);
    b.addEventListener("click", () => {
      if (b.dataset.mode === MODE) return;
      location.hash = b.dataset.mode === "jordan" ? "mode=jordan" : "";
      location.reload();
    });
  });

  const UNION_SQ = [40.7359, -73.9911];

  const CATS = {
    yoga:     { label: "Yoga",      emoji: "🧘" },
    ballet:   { label: "Ballet",    emoji: "🩰" },
    dance:    { label: "Dance",     emoji: "💃" },
    pilates:  { label: "Pilates",   emoji: "🌀" },
    barre:    { label: "Barre",     emoji: "🩰" },
    grappling:{ label: "Grappling", emoji: "🥋" },
    striking: { label: "Striking",  emoji: "🥊" },
    mma:      { label: "Mixed",     emoji: "🔀" },
    soccer:   { label: "Soccer",    emoji: "⚽" },
    run:      { label: "Running",   emoji: "🏃" },
  };
  const MARTIAL_CATS = ["grappling", "striking", "mma"];

  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
  const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri" };
  const DAY_FULL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday" };

  const keyOf = (e) => e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const venueOf = (e) => (data.venues && data.venues[e.venue]) || {};
  const walkOf = (e) => venueOf(e).walkMinutes || 25;
  // the slider filters on the best realistic door-to-door time, which for a
  // soccer field two trains away is the train, not the 32-minute walk
  const travelOf = (e) => {
    const v = venueOf(e);
    return typeof v.travelMinutes === "number" ? v.travelMinutes : walkOf(e);
  };
  const travelHowOf = (e) => {
    const v = venueOf(e);
    return v.travelHow || walkOf(e) + " min walk";
  };

  // which night is "today" relative to the data's week
  const weekStart = new Date(data.weekMonday + "T00:00:00");
  const dayIndex = Math.floor((new Date() - weekStart) / 86400000); // 0 = Monday
  const todayKey = dayIndex >= 0 && dayIndex < 5 ? DAY_KEYS[dayIndex] : null;

  const MAX_TRAVEL = MODE === "jordan" ? 25 : 15;
  const state = { day: todayKey || "all", maxWalk: MAX_TRAVEL, heartsOnly: false, verifiedOnly: false, martialOnly: false };

  const byKey = {};
  data.events.forEach((e) => { byKey[keyOf(e)] = e; });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtTime(hm) {
    if (!hm) return "";
    const h = parseInt(hm.slice(0, 2), 10), m = hm.slice(3);
    const ap = h >= 12 ? "pm" : "am";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m === "00" ? "" : ":" + m) + ap;
  }
  const timeRange = (e) => fmtTime(e.start) + (e.end ? "–" + fmtTime(e.end) : "");

  function dirUrl(e) {
    const v = venueOf(e);
    const dest = encodeURIComponent((e.venue || "") + ", " + (v.address || "") + ", New York, NY");
    return "https://www.google.com/maps/dir/?api=1&origin=" +
      encodeURIComponent("Union Square, New York, NY") + "&destination=" + dest + "&travelmode=walking";
  }

  // ——— shortlist (hearts), shareable through the hash ———
  const hearts = new Set();
  const sharedMatch = /(^|[#&])picks=([^&]+)/.exec(location.hash);
  if (sharedMatch) {
    decodeURIComponent(sharedMatch[2]).split(",").forEach((k) => { if (byKey[k]) hearts.add(k); });
  }
  const planChip = document.getElementById("plan-chip");
  const copyPlanBtn = document.getElementById("copy-plan");
  const verifiedChip = document.getElementById("verified-chip");

  function syncPlanChip() {
    planChip.textContent = hearts.size ? "❤️ Shortlist (" + hearts.size + ")" : "❤️ Tonight's shortlist";
    planChip.setAttribute("aria-pressed", String(state.heartsOnly));
    planChip.classList.toggle("active", state.heartsOnly);
    copyPlanBtn.hidden = hearts.size === 0;
  }
  function toggleHeart(k) {
    if (hearts.has(k)) hearts.delete(k); else hearts.add(k);
    document.querySelectorAll('.heart[data-key="' + k + '"]').forEach((b) => {
      b.textContent = hearts.has(k) ? "❤️" : "🤍";
      b.setAttribute("aria-pressed", String(hearts.has(k)));
    });
    syncPlanChip();
    if (state.heartsOnly) render();
  }
  planChip.addEventListener("click", () => {
    if (!hearts.size) return;
    state.heartsOnly = !state.heartsOnly;
    syncPlanChip(); render();
  });
  verifiedChip.addEventListener("click", () => {
    state.verifiedOnly = !state.verifiedOnly;
    verifiedChip.setAttribute("aria-pressed", String(state.verifiedOnly));
    verifiedChip.classList.toggle("active", state.verifiedOnly);
    render();
  });
  copyPlanBtn.addEventListener("click", () => {
    const parts = [];
    if (MODE === "jordan") parts.push("mode=jordan");
    parts.push("picks=" + encodeURIComponent(Array.from(hearts).join(",")));
    const url = location.origin + location.pathname + "#" + parts.join("&");
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(() => {
        copyPlanBtn.textContent = "✅ Copied";
        setTimeout(() => { copyPlanBtn.textContent = "🔗 Copy link"; }, 1600);
      })
      .catch(() => { prompt("Copy this link:", url); });
  });

  // ——— calendar export ———
  function icsDate(dayIdx, hm) {
    const p = data.weekMonday.split("-").map(Number);
    const d = new Date(p[0], p[1] - 1, p[2] + dayIdx, parseInt(hm.slice(0, 2), 10), parseInt(hm.slice(3), 10));
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" +
      pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  const icsEsc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  function downloadIcs(e) {
    const day = state.day !== "all" && e.days.indexOf(state.day) !== -1 ? state.day : e.days[0];
    const idx = DAY_KEYS.indexOf(day);
    if (idx === -1 || !e.start) return;
    const v = venueOf(e);
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Weeknights//EN", "BEGIN:VEVENT",
      "UID:" + keyOf(e) + "-" + data.weekMonday + "@weeknights",
      "DTSTART:" + icsDate(idx, e.start),
      "DTEND:" + icsDate(idx, e.end || e.start),
      "SUMMARY:" + icsEsc(COPY.icsPrefix + e.title + " — " + e.venue),
      "LOCATION:" + icsEsc((v.address || "") + ", New York, NY"),
      "DESCRIPTION:" + icsEsc(e.when + "\n\n" + e.cost + "\n\n" + e.url),
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
    a.download = keyOf(e) + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ——— night picker ———
  const dayPicker = document.getElementById("day-picker");
  function buildDayPicker() {
    dayPicker.innerHTML = "";
    [{ key: "all", label: "All week" }].concat(DAY_KEYS.map((k) => ({ key: k, label: DAY_LABELS[k] })))
      .forEach(({ key, label }) => {
        const b = document.createElement("button");
        b.className = "day" + (state.day === key ? " active" : "");
        b.dataset.day = key;
        b.textContent = label + (key === todayKey ? " ·" : "");
        if (key === todayKey) b.title = "Tonight";
        b.addEventListener("click", () => { state.day = key; buildDayPicker(); render(); });
        dayPicker.appendChild(b);
      });
  }

  // ——— walk radius ———
  const travelSlider = document.getElementById("travel-slider");
  const travelVal = document.getElementById("travel-val");
  const travelLead = document.getElementById("travel-lead");
  travelSlider.max = String(MAX_TRAVEL);
  travelSlider.value = String(MAX_TRAVEL);
  travelVal.textContent = MAX_TRAVEL + " min";
  if (MODE === "jordan") travelLead.innerHTML = "🚇 Door-to-door up to";
  travelSlider.addEventListener("input", () => {
    state.maxWalk = parseInt(travelSlider.value, 10);
    travelVal.textContent = state.maxWalk + " min";
    render();
  });

  // Jordan's side spans mats, fields and boards — let him collapse back to
  // just the martial arts, which is how the site started.
  const martialChip = document.getElementById("martial-chip");
  if (MODE === "jordan") {
    martialChip.hidden = false;
    martialChip.addEventListener("click", () => {
      state.martialOnly = !state.martialOnly;
      martialChip.setAttribute("aria-pressed", String(state.martialOnly));
      martialChip.classList.toggle("active", state.martialOnly);
      render();
    });
  }

  // ——— map ———
  const map = L.map("map", { scrollWheelZoom: false }).setView(UNION_SQ, 15);
  // Plain OSM tiles — keyless. CARTO's basemaps now demand an API key and
  // render "api key required" across the map without one.
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  L.marker(UNION_SQ, {
    icon: L.divIcon({ className: "home-pin", html: "🏠", iconSize: [30, 30], iconAnchor: [15, 15] }),
  }).addTo(map).bindPopup("Union Square — the 15-minute clock starts here");

  const markerLayer = L.layerGroup().addTo(map);
  let markers = {};

  function markerIcon(e, num, active) {
    const c = CATS[e.category] || { emoji: "📍" };
    return L.divIcon({
      className: "pin" + (active ? " pin-active" : ""),
      html: '<span class="pin-num">' + num + "</span><span class=\"pin-emoji\">" + c.emoji + "</span>",
      iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16],
    });
  }

  const mapList = document.getElementById("map-list");
  const itinEl = document.getElementById("itin");
  const countEl = document.getElementById("count");

  function cardHtml(e, num) {
    const v = venueOf(e);
    const c = CATS[e.category] || { label: e.category, emoji: "📍" };
    const k = keyOf(e);
    const nights = e.days.map((d) => DAY_LABELS[d]).join(" · ");
    return '<article class="card" data-key="' + k + '" data-num="' + num + '" tabindex="0">' +
      '<div class="card-head">' +
        '<span class="num">' + num + "</span>" +
        '<h3>' + esc(e.title) + (e.timeVerified ? "" : ' <span class="unpinned" title="Exact slot rotates weekly — confirm on the booking page">🔍</span>') + "</h3>" +
        '<button class="heart" data-key="' + k + '" aria-pressed="' + hearts.has(k) + '" aria-label="Add to shortlist">' +
          (hearts.has(k) ? "❤️" : "🤍") + "</button>" +
      "</div>" +
      '<p class="venue">' + esc(e.venue) + " · " + esc(v.neighborhood || "") + "</p>" +
      '<p class="chips">' +
        '<span class="chip cat">' + c.emoji + " " + esc(e.discipline || c.label) + "</span>" +
        '<span class="chip walk" title="' + esc(travelHowOf(e)) + '">' +
          (venueOf(e).travelHow ? "🚇 " : "🚶 ") + travelOf(e) + " min</span>" +
        '<span class="chip time">🕕 ' + esc(timeRange(e)) + "</span>" +
        '<span class="chip level">' + esc(e.level) + "</span>" +
      "</p>" +
      '<p class="nights"><b>' + nights + "</b> · " + esc(e.when) + "</p>" +
      '<p class="getting">🧭 ' + esc(travelHowOf(e)) + "</p>" +
      '<p class="cost">💳 ' + esc(e.cost) + "</p>" +
      '<p class="notes">' + esc(e.notes) + "</p>" +
      '<p class="links">' +
        '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">Book / details ↗</a>' +
        '<a href="' + esc(dirUrl(e)) + '" target="_blank" rel="noopener">Walk there ↗</a>' +
        '<button class="ics" data-key="' + k + '">＋ Calendar</button>' +
      "</p>" +
      "</article>";
  }

  function highlight(num) {
    mapList.querySelectorAll(".card").forEach((c) => c.classList.toggle("on", c.dataset.num === String(num)));
    Object.keys(markers).forEach((n) => {
      const m = markers[n];
      if (!m) return;
      m.setIcon(markerIcon(m._ev, n, String(n) === String(num)));
    });
  }

  function renderItin() {
    if (state.day === "all") { itinEl.hidden = true; return; }
    const it = (data.itineraries || {})[state.day];
    if (!it) { itinEl.hidden = true; return; }
    let html = '<h2>' + DAY_FULL[state.day] + (state.day === todayKey ? " — tonight" : "") + "</h2>" +
      '<p class="itin-sum">' + esc(it.summary) + "</p><div class=\"itin-picks\">";
    it.picks.forEach((p) => {
      const e = byKey[p.key];
      if (!e) return;
      html += '<button class="itin-opt" data-key="' + p.key + '">' +
        '<b>' + esc(e.title) + "</b>" +
        '<span class="io-meta">' + esc(e.venue) + " · " + fmtTime(e.start) + " · " +
          (venueOf(e).travelHow ? "🚇 " : "🚶 ") + travelOf(e) + " min</span>" +
        '<span class="io-note">' + esc(p.note) + "</span>" +
        "</button>";
    });
    html += "</div>";
    itinEl.innerHTML = html;
    itinEl.hidden = false;
    itinEl.querySelectorAll(".itin-opt").forEach((b) => {
      b.addEventListener("click", () => {
        const card = mapList.querySelector('.card[data-key="' + b.dataset.key + '"]');
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        highlight(card.dataset.num);
      });
    });
  }

  // ——— who teaches: a collapsible roster per venue, when the data has one ———
  function renderTeachers() {
    const teachersEl = document.getElementById("teachers");
    const all = data.teachers || {};
    const names = Object.keys(all);
    if (!names.length) { teachersEl.hidden = true; return; }

    teachersEl.innerHTML = names.map((venue) => {
      const t = all[venue];
      const seniors = (t.seniors || []).map((s) =>
        '<div class="teacher">' +
          '<b>' + esc(s.name) + "</b>" +
          '<span class="t-title">' + esc(s.title) + "</span>" +
          '<span class="t-note">' + esc(s.note) + "</span>" +
        "</div>").join("");
      const faculty = (t.faculty || []).length
        ? '<p class="t-faculty"><b>Also teaching:</b> ' +
            t.faculty.map((n) => esc(n)).join(" · ") + "</p>"
        : "";
      return '<details class="t-block">' +
        "<summary><b>Who teaches at " + esc(venue) + "</b>" +
          (t.inTheRoom ? '<span class="t-hint">' + esc(t.inTheRoom) + "</span>" : "") +
        "</summary>" +
        (t.lineage ? '<p class="t-lineage">' + esc(t.lineage) + "</p>" : "") +
        '<div class="t-grid">' + seniors + "</div>" +
        faculty +
        (t.url ? '<p class="links"><a href="' + esc(t.url) +
          '" target="_blank" rel="noopener">Full roster &amp; bios ↗</a></p>' : "") +
        "</details>";
    }).join("");
    teachersEl.hidden = false;
  }

  function render() {
    const list = data.events.filter((e) => {
      if (state.day !== "all" && e.days.indexOf(state.day) === -1) return false;
      if (travelOf(e) > state.maxWalk) return false;
      if (state.heartsOnly && !hearts.has(keyOf(e))) return false;
      if (state.verifiedOnly && !e.timeVerified) return false;
      if (state.martialOnly && MARTIAL_CATS.indexOf(e.category) === -1) return false;
      return true;
    }).sort((a, b) => (a.start || "").localeCompare(b.start || "") || travelOf(a) - travelOf(b));

    markerLayer.clearLayers();
    markers = {};
    mapList.innerHTML = "";

    if (!list.length) {
      mapList.innerHTML = '<p class="empty">Nothing matches those filters — widen the walk radius or pick another night.</p>';
      countEl.textContent = "0 " + COPY.countWord;
      renderItin();
      return;
    }

    const bounds = [L.latLng(UNION_SQ[0], UNION_SQ[1])];
    list.forEach((e, i) => {
      const num = i + 1;
      const v = venueOf(e);
      mapList.insertAdjacentHTML("beforeend", cardHtml(e, num));
      if (typeof v.lat === "number" && typeof v.lng === "number") {
        // nudge co-located venues apart so both pins stay clickable
        const dup = Object.keys(markers).filter((n) => {
          const m = markers[n];
          return m && Math.abs(m.getLatLng().lat - v.lat) < 0.00015 && Math.abs(m.getLatLng().lng - v.lng) < 0.00015;
        }).length;
        const lat = v.lat + dup * 0.00022, lng = v.lng + dup * 0.00022;
        const m = L.marker([lat, lng], { icon: markerIcon(e, num, false) }).addTo(markerLayer);
        m._ev = e;
        m.bindPopup("<b>" + esc(e.title) + "</b><br>" + esc(e.venue) + "<br>" +
          esc(v.address || "") + "<br>🕕 " + esc(timeRange(e)) + "<br>🧭 " + esc(travelHowOf(e)));
        m.on("click", () => {
          const card = mapList.querySelector('.card[data-num="' + num + '"]');
          if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          highlight(num);
        });
        markers[num] = m;
        bounds.push(L.latLng(lat, lng));
      }
    });

    if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds).pad(0.18));

    const pinned = list.filter((e) => e.timeVerified).length;
    countEl.textContent = list.length + " " + COPY.countWord +
      (state.day === "all" ? " this week" : " on " + DAY_FULL[state.day]) +
      " · " + pinned + " with a pinned time";

    renderItin();
  }

  mapList.addEventListener("click", (ev) => {
    const heart = ev.target.closest(".heart");
    if (heart) { ev.stopPropagation(); toggleHeart(heart.dataset.key); return; }
    const ics = ev.target.closest(".ics");
    if (ics) { ev.stopPropagation(); const e = byKey[ics.dataset.key]; if (e) downloadIcs(e); return; }
    const card = ev.target.closest(".card");
    if (card && !ev.target.closest("a")) highlight(card.dataset.num);
  });

  document.getElementById("week-label").textContent = data.weekLabel;
  document.getElementById("updated-line").textContent = "Updated " + data.updated + " · " +
    data.events.length + " classes across " + Object.keys(data.venues || {}).length + " venues.";

  buildDayPicker();
  syncPlanChip();
  renderTeachers();
  render();
  setTimeout(() => map.invalidateSize(), 200);
})();
