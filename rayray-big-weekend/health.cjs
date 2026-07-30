#!/usr/bin/env node
/* Rayray Big Weekend — freshness + coverage health check.
 *
 * This is the watchdog's contract. It answers ONE question: if Jordan opened
 * the site right now, in the DEFAULT view, would he see a useful set of plans?
 *
 * It deliberately measures what the default view shows (weekday = 25-min walk
 * cap, weekend = 35-min transit cap, ended events hidden) rather than the raw
 * event count, because a data file can look full while the actual screen is
 * empty. That gap is exactly what went unnoticed the week of Jul 27, 2026.
 *
 *   node health.cjs             # check local repo files
 *   node health.cjs --live      # check https://rayray-big-weekend.vercel.app
 *   node health.cjs --date NNN  # override "today" (ISO) for testing
 *
 * Exit 0 = healthy, nothing to do.
 * Exit 1 = ACTION NEEDED (stale week, or a day-part Jordan can see is empty).
 * Exit 2 = could not check (fetch/parse failure) — also needs a human/agent.
 */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const USQ = [40.7376, -73.9868];
const LIVE = "https://rayray-big-weekend.vercel.app";

const args = process.argv.slice(2);
const useLive = args.includes("--live");
const dateArg = (args[args.indexOf("--date") + 1] || "").match(/^\d{4}-\d{2}-\d{2}$/)
  ? args[args.indexOf("--date") + 1] : null;

// ——— the same distance math app.js uses, so we measure the real view ———
const walkOf = (e) => {
  if (typeof e.lat !== "number" || typeof e.lng !== "number") return 999;
  const R = 6371, toR = Math.PI / 180;
  const dLat = (e.lat - USQ[0]) * toR, dLng = (e.lng - USQ[1]) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(USQ[0] * toR) * Math.cos(e.lat * toR) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 14);
};
const endMin = (e) => {
  const t = e.end || e.start;
  if (!t) return 24 * 60;
  const [h, m] = t.split(":").map(Number);
  return e.end ? h * 60 + m : h * 60 + m + 120; // no end → assume 2h
};

async function load(file) {
  if (useLive) {
    const res = await fetch(`${LIVE}/${file}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    var src = await res.text();
  } else {
    var src = require("fs").readFileSync(require("path").join(__dirname, file), "utf8");
  }
  const i = src.indexOf("= ");
  if (i < 0) throw new Error(`${file}: no assignment found`);
  return JSON.parse(src.slice(i + 2).replace(/;\s*$/, "").trim());
}

function mondayOf(d) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x.toISOString().slice(0, 10);
}

const problems = [];
const notes = [];

function checkWeek(label, data, today, todayKey, isKid) {
  const thisMonday = mondayOf(today);
  notes.push(`${label}: week of ${data.weekMonday} (${data.events.filter((e) => e.event).length} dated events)`);

  // 1. FRESHNESS — the failure that hid the whole week of Jul 27.
  if (data.weekMonday !== thisMonday) {
    const stale = data.weekMonday < thisMonday;
    problems.push(`${label} STALE: shows week of ${data.weekMonday}, current week is ${thisMonday}` +
      (stale ? " — promote nextWeek and research" : " — jumped AHEAD, roll back to the current week"));
    return; // coverage of the wrong week tells us nothing
  }

  if (!todayKey) { notes.push(`${label}: today is outside the listed week — skipping coverage`); return; }

  // 2. COVERAGE AS SEEN — today + the next 3 days, in the default view.
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const idx = DAY_KEYS.indexOf(todayKey);
  for (let off = 0; off < 4 && idx + off < 7; off++) {
    const day = DAY_KEYS[idx + off];
    const isWeekend = day === "sat" || day === "sun";
    // date mode has no travel cap; kid mode uses the weekday/weekend defaults
    const cap = !isKid ? null : (isWeekend ? 35 : 25);
    const metric = !isKid ? "transit" : (isWeekend ? "transit" : "walk");

    const visible = data.events.filter((e) => {
      if (!e.event || e.cpwOnly) return false;
      if (!e.days.includes(day)) return false;
      if (off === 0 && endMin(e) < nowMin) return false;      // already over
      if (cap === null) return true;
      const mins = metric === "walk" ? walkOf(e) : (e.travelMinutes || 99);
      return mins <= cap;
    });

    const parts = { morning: 0, afternoon: 0, evening: 0 };
    for (const e of visible) for (const t of e.times) if (parts[t] !== undefined) parts[t]++;

    const capTxt = cap ? `≤${cap} min ${metric}` : "no cap";
    notes.push(`  ${day}${off === 0 ? " (today)" : ""} [${capTxt}]: ` +
      `${visible.length} visible — morning ${parts.morning}, afternoon ${parts.afternoon}, evening ${parts.evening}`);

    // Today is judged on remaining day-parts only; future days on all three.
    // Date mode is evening-led by design — mornings are not a date-night slot,
    // so only afternoon and evening are required there.
    const want = [];
    if (isKid && (off > 0 || nowMin < 12 * 60)) want.push("morning");
    if (off > 0 || nowMin < 17 * 60) want.push("afternoon");
    want.push("evening");
    const empty = want.filter((p) => parts[p] === 0);
    if (empty.length) {
      problems.push(`${label} ${day}${off === 0 ? " (TODAY)" : ""}: nothing visible for ${empty.join(", ")} ` +
        `at the default view (${capTxt}) — research real events for those slots`);
    }
    if (visible.length < 3 && !empty.length) {
      notes.push(`  ⚠ ${day} is thin (${visible.length} visible) — worth topping up`);
    }
  }

  // 3. LOOK-AHEAD — a missing preview means next Monday starts from zero.
  const nx = data.nextWeek && data.nextWeek.events ? data.nextWeek.events.length : 0;
  notes.push(`${label}: next-week preview has ${nx} events`);
  if (nx < 8) problems.push(`${label}: next-week preview is thin (${nx}) — research the following Mon–Sun`);
}

(async () => {
  const today = dateArg ? new Date(dateArg + "T09:00:00") : new Date();
  console.log(`Rayray health check — ${useLive ? "LIVE site" : "local repo"} — ${today.toDateString()}\n`);
  try {
    const week = await load("week.js");
    const dayIdx = Math.floor((today - new Date(week.weekMonday + "T00:00:00")) / 86400000);
    checkWeek("kid", week, today, dayIdx >= 0 && dayIdx < 7 ? DAY_KEYS[dayIdx] : null, true);

    try {
      const date = await load("date.js");
      const dIdx = Math.floor((today - new Date(date.weekMonday + "T00:00:00")) / 86400000);
      checkWeek("date", date, today, dIdx >= 0 && dIdx < 7 ? DAY_KEYS[dIdx] : null, false);
    } catch (err) { problems.push(`date.js: could not check (${err.message})`); }
  } catch (err) {
    console.error("COULD NOT CHECK:", err.message);
    process.exit(2);
  }

  notes.forEach((n) => console.log(n));
  if (problems.length) {
    console.log(`\n✗ ACTION NEEDED (${problems.length}):`);
    problems.forEach((p) => console.log("  •", p));
    process.exit(1);
  }
  console.log("\n✓ healthy — current week, and every upcoming day-part has something visible.");
})();
