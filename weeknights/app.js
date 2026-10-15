/* Jordan & Athena Weeknights — map + list, night picker, travel-radius filter.
   Two modes share the machinery: "athena" (ATHENA_DATA) and "jordan" (JORDAN_DATA).

   Live class slots (slots.js, generated weekly by fetch-schedules.cjs from the
   studios' own booking platforms) are merged at render time: an event with a
   `match` list takes its real days, times and teachers from the slots at its
   venue. Without slots it falls back to the curated values and shows a 🔍.

   "Tonight" is real: on today's tab, sessions that have already started are
   hidden (toggle to show), upcoming ones show a countdown, and outdoor
   sessions are flagged when the evening forecast is wet. */
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
    tagline: "Classes within <strong>20 minutes of Union Square</strong> — yoga, ballet, barre, Pilates &amp; dance. ISHTA first, always.",
    noteHead: "🎒 Before you go",
    noteBody: "ISHTA's times and teachers below are pulled live from the studio's own booking schedule each week. Most studios want you booked in advance — the small rooms near Union Square fill up. A <em>🔍</em> means the venue, price and booking link are confirmed but the exact slot rotates behind the studio's booking app: tap through to pin it down.",
    footer: "Home base: 112 East 19th Street · times are door-to-door from Union Square.",
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

  // a side may name one favourite venue; its cards get a ★ and an accent edge.
  // (It used to sort first too — Jordan asked for pure time order instead.)
  const FAV_VENUE = data.favoriteVenue || null;
  const isFav = (e) => Boolean(FAV_VENUE) && e.venue === FAV_VENUE;

  const keyOf = (e) => e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const venueOf = (e) => (data.venues && data.venues[e.venue]) || {};
  const walkOf = (e) => venueOf(e).walkMinutes || 25;
  // the slider filters on the best realistic door-to-door time, which for a
  // soccer field two trains away is the train, not the 32-minute walk
  const travelOf = (e) => {
    const v = venueOf(e);
    return typeof v.travelMinutes === "number" ? v.travelMinutes : walkOf(e);
  };
  const travelHowOf = (e) => venueOf(e).travelHow || walkOf(e) + " min walk";
  const isOutdoor = (e) => venueOf(e).outdoor === true;

  // which night is "today" relative to the data's week
  const weekStart = new Date(data.weekMonday + "T00:00:00");
  const NOW = new Date();
  const dayIndex = Math.floor((NOW - weekStart) / 86400000); // 0 = Monday
  const todayKey = dayIndex >= 0 && dayIndex < 5 ? DAY_KEYS[dayIndex] : null;
  const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  const toMin = (hm) => parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3), 10);

  const MAX_TRAVEL = MODE === "jordan" ? 25 : 20;
  const state = { day: todayKey || "all", maxWalk: MAX_TRAVEL, heartsOnly: false, verifiedOnly: false,
    martialOnly: false, showPast: false };

  const byKey = {};
  data.events.forEach((e) => { byKey[keyOf(e)] = e; });

  // ——— live slots from slots.js ———
  const SLOTS = window.SLOTS && window.SLOTS.venues ? window.SLOTS : null;
  function slotsOf(e) {
    if (!SLOTS || !Array.isArray(e.match)) return [];
    const vs = SLOTS.venues[e.venue] || [];
    const names = e.match.map((m) => m.toLowerCase());
    return vs.filter((s) => names.indexOf(String(s.name).toLowerCase()) !== -1);
  }
  const slotsOn = (e, day) => slotsOf(e).filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
  const daysOf = (e) => { const s = slotsOf(e); return s.length ? DAY_KEYS.filter((d) => s.some((x) => x.day === d)) : e.days; };
  const isVerified = (e) => slotsOf(e).length > 0 || e.timeVerified === true;
  // what time does this run on a given night? real slot if we have one, else the curated fallback
  function timeOn(e, day) {
    const s = day && day !== "all" ? slotsOn(e, day) : [];
    if (s.length) return { start: s[0].start, end: s[0].end, teacher: s[0].teacher || null, link: s[0].link || null, spots: s[0].spots, slots: s, live: true };
    return { start: e.start, end: e.end, teacher: null, link: null, spots: null, slots: [], live: false };
  }
  // tonight only: is it still ahead, on now, or done?
  function statusOn(e, day) {
    if (!todayKey || day !== todayKey) return null;
    const t = timeOn(e, day);
    if (!t.start) return null;
    const s = toMin(t.start), en = t.end ? toMin(t.end) : s + 60;
    if (nowMin < s) return { kind: "soon", mins: s - nowMin };
    if (nowMin < en) return { kind: "live" };
    return { kind: "past" };
  }

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
  const timeRange = (t) => fmtTime(t.start) + (t.end ? "–" + fmtTime(t.end) : "");

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
  const martialChip = document.getElementById("martial-chip");
  const pastChip = document.getElementById("past-chip");

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
  function bindToggle(btn, key) {
    btn.addEventListener("click", () => {
      state[key] = !state[key];
      btn.setAttribute("aria-pressed", String(state[key]));
      btn.classList.toggle("active", state[key]);
      render();
    });
  }
  bindToggle(verifiedChip, "verifiedOnly");
  bindToggle(pastChip, "showPast");
  // Jordan's side spans mats and fields — let him collapse back to just the
  // martial arts, which is how the site started.
  if (MODE === "jordan") { martialChip.hidden = false; bindToggle(martialChip, "martialOnly"); }

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
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  const icsEsc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  function downloadIcs(e) {
    const days = daysOf(e);
    const day = state.day !== "all" && days.indexOf(state.day) !== -1 ? state.day : days[0];
    const idx = DAY_KEYS.indexOf(day);
    const t = timeOn(e, day);
    if (idx === -1 || !t.start) return;
    const v = venueOf(e);
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Weeknights//EN", "BEGIN:VEVENT",
      "UID:" + keyOf(e) + "-" + data.weekMonday + "-" + day + "@weeknights",
      "DTSTART:" + icsDate(idx, t.start),
      "DTEND:" + icsDate(idx, t.end || t.start),
      "SUMMARY:" + icsEsc(COPY.icsPrefix + e.title + " — " + e.venue + (t.teacher ? " (" + t.teacher + ")" : "")),
      "LOCATION:" + icsEsc((v.address || "") + ", New York, NY"),
      "DESCRIPTION:" + icsEsc(e.when + "\n\n" + e.cost + "\n\n" + (t.link || e.url)),
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
    a.download = keyOf(e) + "-" + day + ".ics";
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
    decorateDays();
  }

  // ——— travel radius ———
  const travelSlider = document.getElementById("travel-slider");
  const travelVal = document.getElementById("travel-val");
  const travelLead = document.getElementById("travel-lead");
  travelSlider.max = String(MAX_TRAVEL);
  travelSlider.value = String(MAX_TRAVEL);
  travelVal.textContent = MAX_TRAVEL + " min";
  travelLead.innerHTML = "🚇 Door-to-door up to";
  travelSlider.addEventListener("input", () => {
    state.maxWalk = parseInt(travelSlider.value, 10);
    travelVal.textContent = state.maxWalk + " min";
    render();
  });

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
  }).addTo(map).bindPopup("Union Square — the clock starts here");

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

  // ——— weather (Open-Meteo, keyless) — outdoor sessions get flagged on wet evenings ———
  const WX = { hourly: null, daily: null };
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
  const hourIdx = (dayKey, h) => DAY_KEYS.indexOf(dayKey) * 24 + h;
  function wetEvening(dayKey) {
    if (!WX.hourly || !WX.hourly.weather_code || DAY_KEYS.indexOf(dayKey) === -1) return false;
    for (let h = 17; h <= 21; h++) {
      const i = hourIdx(dayKey, h);
      const code = WX.hourly.weather_code[i], prob = WX.hourly.precipitation_probability[i];
      if (code == null) continue;
      if (prob >= 40 || code >= 51) return true;
    }
    return false;
  }
  function decorateDays() {
    if (!WX.daily || !WX.daily.weather_code) return;
    dayPicker.querySelectorAll(".day").forEach((b) => {
      const i = DAY_KEYS.indexOf(b.dataset.day);
      if (i === -1 || b.querySelector(".day-wx") || WX.daily.weather_code[i] == null) return;
      const s = document.createElement("span");
      s.className = "day-wx";
      s.textContent = wxEmoji(WX.daily.weather_code[i]) + " " + Math.round(WX.daily.temperature_2m_max[i]) + "°";
      b.appendChild(s);
    });
  }
  function renderWxStrip() {
    const strip = document.getElementById("wx-strip");
    const dayKey = state.day === "all" ? todayKey : state.day;
    if (!WX.hourly || !dayKey || !wetEvening(dayKey)) { strip.hidden = true; return; }
    const isToday = dayKey === todayKey;
    let html = "";
    for (let h = 16; h <= 22; h++) {
      const i = hourIdx(dayKey, h);
      const code = WX.hourly.weather_code[i];
      if (code == null) continue;
      const temp = Math.round(WX.hourly.temperature_2m[i]);
      const prob = WX.hourly.precipitation_probability[i];
      const wet = prob >= 40 || code >= 51;
      const hh = (h % 12 || 12) + (h >= 12 ? "p" : "a");
      html += '<span class="wx-h' + (wet ? " wet" : "") + (isToday && h === NOW.getHours() ? " now" : "") + '">' +
        "<b>" + hh + "</b>" + wxEmoji(code) + " " + temp + "°" + "<i>💧" + (prob == null ? "–" : prob + "%") + "</i></span>";
    }
    strip.hidden = false;
    document.getElementById("wx-label").textContent =
      "🌧️ Rain's around " + (isToday ? "tonight" : DAY_FULL[dayKey] + " evening") + " — outdoor sessions are flagged below";
    document.getElementById("wx-hours").innerHTML = html;
  }
  (function loadWeather() {
    const end = (function () {
      const p = data.weekMonday.split("-").map(Number);
      const d = new Date(p[0], p[1] - 1, p[2] + 6);
      const pad = (n) => String(n).padStart(2, "0");
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    })();
    const apply = (j) => { WX.daily = j.daily; WX.hourly = j.hourly; decorateDays(); render(); };
    try {
      const cached = JSON.parse(sessionStorage.getItem("wkn-wx-" + data.weekMonday) || "null");
      if (cached && Date.now() - cached.t < 3 * 3600e3) { apply(cached); return; }
    } catch (err) {}
    if (typeof fetch !== "function") return;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=" + UNION_SQ[0] + "&longitude=" + UNION_SQ[1] +
      "&daily=weather_code,temperature_2m_max,precipitation_probability_max" +
      "&hourly=weather_code,temperature_2m,precipitation_probability" +
      "&temperature_unit=fahrenheit&timezone=America%2FNew_York" +
      "&start_date=" + data.weekMonday + "&end_date=" + end)
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.daily || !j.hourly) return;
        try { sessionStorage.setItem("wkn-wx-" + data.weekMonday, JSON.stringify({ t: Date.now(), daily: j.daily, hourly: j.hourly })); } catch (err) {}
        apply(j);
      })
      .catch(() => {});
  })();

  // ——— cards ———
  function cardHtml(e, num) {
    const v = venueOf(e);
    const c = CATS[e.category] || { label: e.category, emoji: "📍" };
    const k = keyOf(e);
    const days = daysOf(e);
    const t = timeOn(e, state.day);
    const st = statusOn(e, state.day);
    const live = slotsOf(e).length > 0;
    const wet = isOutdoor(e) && (state.day === "all" ? (todayKey && wetEvening(todayKey)) : wetEvening(state.day));

    // nights line: with live slots, show each night's real start time
    const nights = days.map((d) => {
      const s = live ? slotsOn(e, d) : [];
      return DAY_LABELS[d] + (s.length ? " " + fmtTime(s[0].start) : "");
    }).join(" · ");

    let statusChip = "";
    if (st && st.kind === "soon") statusChip = '<span class="chip soon">⏱ starts in ' + (st.mins >= 60 ? Math.floor(st.mins / 60) + "h " + (st.mins % 60) + "m" : st.mins + " min") + "</span>";
    else if (st && st.kind === "live") statusChip = '<span class="chip live">● on now</span>';
    else if (st && st.kind === "past") statusChip = '<span class="chip past">done for tonight</span>';

    return '<article class="card' + (isFav(e) ? " card-fav" : "") + (st && st.kind === "past" ? " card-past" : "") + (wet ? " card-rain" : "") +
      '" data-key="' + k + '" data-num="' + num + '" tabindex="0">' +
      '<div class="card-head">' +
        '<span class="num">' + num + "</span>" +
        '<h3>' + esc(e.title) + (isVerified(e) ? "" : ' <span class="unpinned" title="Exact slot rotates weekly — confirm on the booking page">🔍</span>') + "</h3>" +
        '<button class="heart" data-key="' + k + '" aria-pressed="' + hearts.has(k) + '" aria-label="Add to shortlist">' + (hearts.has(k) ? "❤️" : "🤍") + "</button>" +
      "</div>" +
      '<p class="venue">' + (isFav(e) ? '<span class="fav-star" title="Athena\'s favourite">★</span> ' : "") + esc(e.venue) + " · " + esc(v.neighborhood || "") + "</p>" +
      '<p class="chips">' +
        '<span class="chip cat">' + c.emoji + " " + esc(e.discipline || c.label) + "</span>" +
        '<span class="chip walk" title="' + esc(travelHowOf(e)) + '">' + (v.travelHow ? "🚇 " : "🚶 ") + travelOf(e) + " min</span>" +
        '<span class="chip time">🕕 ' + esc(timeRange(t)) + (t.teacher ? ' <span class="slot-teacher">· ' + esc(t.teacher) + "</span>" : "") + "</span>" +
        (t.spots != null && t.spots <= 5 ? '<span class="chip spots">' + (t.spots === 0 ? "full — waitlist" : t.spots + " spot" + (t.spots === 1 ? "" : "s") + " left") + "</span>" : "") +
        statusChip +
        '<span class="chip level">' + esc(e.level) + "</span>" +
      "</p>" +
      (t.slots.length > 1 ? '<p class="nights">Also tonight: ' + t.slots.slice(1).map((s) => fmtTime(s.start) + (s.teacher ? " (" + esc(s.teacher) + ")" : "")).join(", ") + "</p>" : "") +
      '<p class="nights"><b>' + nights + "</b> · " + esc(e.when) + (live ? ' <span class="slot-teacher">· live from the studio schedule</span>' : "") + "</p>" +
      (wet ? '<p class="rain-note">🌧️ Wet forecast for the evening — this one\'s outdoors. Check the app before heading out.</p>' : "") +
      '<p class="getting">🧭 ' + esc(travelHowOf(e)) + "</p>" +
      '<p class="cost">💳 ' + esc(e.cost) + "</p>" +
      '<p class="notes">' + esc(e.notes) + "</p>" +
      '<p class="links">' +
        '<a href="' + esc(t.link || e.url) + '" target="_blank" rel="noopener">' + (t.link ? "Book this class ↗" : "Book / details ↗") + "</a>" +
        '<a href="' + esc(dirUrl(e)) + '" target="_blank" rel="noopener">Get there ↗</a>' +
        '<button class="ics" data-key="' + k + '">＋ Calendar</button>' +
      "</p>" +
      "</article>";
  }

  function highlight(num) {
    mapList.querySelectorAll(".card").forEach((c) => c.classList.toggle("on", c.dataset.num === String(num)));
    Object.keys(markers).forEach((n) => {
      const m = markers[n];
      if (m) m.setIcon(markerIcon(m._ev, n, String(n) === String(num)));
    });
  }

  function renderItin() {
    if (state.day === "all") { itinEl.hidden = true; return; }
    const it = (data.itineraries || {})[state.day];
    if (!it) { itinEl.hidden = true; return; }
    let html = '<h2>' + DAY_FULL[state.day] + (state.day === todayKey ? " — tonight" : "") + "</h2>" +
      '<p class="itin-sum">' + esc(it.summary) + "</p><div class=\"itin-picks\">";
    // the night's plan reads in time order too, earliest first
    const startOf = (p) => { const e = byKey[p.key]; return e ? (timeOn(e, state.day).start || "") : ""; };
    const picks = it.picks.slice().sort((a, b) => startOf(a).localeCompare(startOf(b)));
    picks.forEach((p) => {
      const e = byKey[p.key];
      if (!e) return;
      const t = timeOn(e, state.day);
      const st = statusOn(e, state.day);
      html += '<button class="itin-opt' + (st && st.kind === "past" ? " card-past" : "") + '" data-key="' + p.key + '">' +
        '<b>' + esc(e.title) + "</b>" +
        '<span class="io-meta">' + esc(e.venue) + " · " + fmtTime(t.start) + (t.teacher ? " · " + esc(t.teacher) : "") + " · " +
          (venueOf(e).travelHow ? "🚇 " : "🚶 ") + travelOf(e) + " min" +
          (st && st.kind === "soon" ? " · ⏱ " + st.mins + " min" : st && st.kind === "live" ? " · ● on now" : st && st.kind === "past" ? " · done" : "") + "</span>" +
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
        '<div class="teacher"><b>' + esc(s.name) + "</b>" +
          '<span class="t-title">' + esc(s.title) + "</span>" +
          '<span class="t-note">' + esc(s.note) + "</span></div>").join("");
      const faculty = (t.faculty || []).length
        ? '<p class="t-faculty"><b>Also teaching:</b> ' + t.faculty.map((n) => esc(n)).join(" · ") + "</p>" : "";
      return '<details class="t-block">' +
        "<summary><b>Who teaches at " + esc(venue) + "</b>" +
          (t.inTheRoom ? '<span class="t-hint">' + esc(t.inTheRoom) + "</span>" : "") + "</summary>" +
        (t.lineage ? '<p class="t-lineage">' + esc(t.lineage) + "</p>" : "") +
        '<div class="t-grid">' + seniors + "</div>" + faculty +
        (t.url ? '<p class="links"><a href="' + esc(t.url) + '" target="_blank" rel="noopener">Full roster &amp; bios ↗</a></p>' : "") +
        "</details>";
    }).join("");
    teachersEl.hidden = false;
  }

  function render() {
    let hiddenPast = 0;
    const list = data.events.filter((e) => {
      if (state.day !== "all" && daysOf(e).indexOf(state.day) === -1) return false;
      if (travelOf(e) > state.maxWalk) return false;
      if (state.heartsOnly && !hearts.has(keyOf(e))) return false;
      if (state.verifiedOnly && !isVerified(e)) return false;
      if (state.martialOnly && MARTIAL_CATS.indexOf(e.category) === -1) return false;
      const st = statusOn(e, state.day);
      if (st && st.kind === "past" && !state.showPast) { hiddenPast++; return false; }
      return true;
    }).sort((a, b) =>
      // earliest start first — the scroll reads like the evening. Same start:
      // nearer wins, then the favourite venue as a final tie-break.
      (timeOn(a, state.day).start || "").localeCompare(timeOn(b, state.day).start || "") ||
      travelOf(a) - travelOf(b) ||
      (isFav(b) ? 1 : 0) - (isFav(a) ? 1 : 0));

    // the "show what's started" chip only earns its place on tonight's tab
    pastChip.hidden = !(state.day === todayKey && (hiddenPast > 0 || state.showPast));
    if (!pastChip.hidden) pastChip.textContent = state.showPast ? "🕰️ Hide what's already started" : "🕰️ Show " + hiddenPast + " already started";

    markerLayer.clearLayers();
    markers = {};
    mapList.innerHTML = "";

    if (!list.length) {
      mapList.innerHTML = '<p class="empty">' + (state.day === todayKey && hiddenPast
        ? "Everything tonight has already started — tap “Show already started”, or pick another night."
        : "Nothing matches those filters — widen the travel radius or pick another night.") + "</p>";
      countEl.textContent = "0 " + COPY.countWord;
      renderItin(); renderWxStrip();
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
        const t = timeOn(e, state.day);
        m.bindPopup("<b>" + esc(e.title) + "</b><br>" + esc(e.venue) + "<br>" + esc(v.address || "") +
          "<br>🕕 " + esc(timeRange(t)) + (t.teacher ? " · " + esc(t.teacher) : "") + "<br>🧭 " + esc(travelHowOf(e)));
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

    const pinned = list.filter(isVerified).length;
    const liveN = list.filter((e) => slotsOf(e).length > 0).length;
    countEl.textContent = list.length + " " + COPY.countWord +
      (state.day === "all" ? " this week" : state.day === todayKey ? " still ahead tonight" : " on " + DAY_FULL[state.day]) +
      " · " + pinned + " with a pinned time" + (liveN ? " (" + liveN + " live from the studio)" : "");

    renderItin();
    renderWxStrip();
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
    data.events.length + " " + COPY.countWord + " across " + Object.keys(data.venues || {}).length + " venues" +
    (SLOTS ? " · live times fetched " + new Date(SLOTS.fetched).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "." : ".");

  buildDayPicker();
  syncPlanChip();
  renderTeachers();
  render();
  setTimeout(() => map.invalidateSize(), 200);
})();
