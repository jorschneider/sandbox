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
  };

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

  // ——— toggles ———
  const freeBtn = document.getElementById("toggle-free");
  const outBtn = document.getElementById("toggle-outdoor");
  freeBtn.addEventListener("click", () => {
    state.freeOnly = !state.freeOnly;
    render();
  });
  outBtn.addEventListener("click", () => {
    state.outdoorOnly = !state.outdoorOnly;
    render();
  });

  // ——— cards ———
  function matches(e) {
    if (state.day !== "all") {
      const days = e.days || ["any"];
      if (!(days.indexOf("any") !== -1 || days.indexOf(state.day) !== -1)) return false;
    }
    if (state.cat !== "all" && e.category !== state.cat) return false;
    if (state.freeOnly && !isFree(e)) return false;
    if (state.outdoorOnly && !e.outdoor) return false;
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
          ' <span style="white-space:nowrap">(' + esc(e.travelHow) + ")</span></p>" +
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

  function render() {
    // reflect state on controls
    dayPicker.querySelectorAll(".day").forEach((b) => b.classList.toggle("active", b.dataset.day === state.day));
    catPicker.querySelectorAll(".cat").forEach((b) => b.classList.toggle("active", b.dataset.cat === state.cat));
    freeBtn.setAttribute("aria-pressed", String(state.freeOnly));
    outBtn.setAttribute("aria-pressed", String(state.outdoorOnly));

    const list = data.events.filter(matches)
      .sort((a, b) => (a.travelMinutes || 99) - (b.travelMinutes || 99));

    const cards = document.getElementById("cards");
    cards.innerHTML = "";
    list.forEach((e) => cards.appendChild(card(e)));

    document.getElementById("empty").hidden = list.length > 0;
    const label = state.day === "all" ? "this week" : (state.day === todayKey ? "today" : "on " + DAY_LABELS[state.day]);
    document.getElementById("count").textContent =
      list.length > 0 ? list.length + " adventure" + (list.length === 1 ? "" : "s") + " " + label + " 🎈" : "";
  }

  render();
})();
