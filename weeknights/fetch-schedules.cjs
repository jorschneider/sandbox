#!/usr/bin/env node
/* Pull REAL weekly class slots from the booking platforms the studios use, and
   write them to slots.js for the site to merge at render time.

     node weeknights/fetch-schedules.cjs                 # week of the most recent Monday
     node weeknights/fetch-schedules.cjs --monday 2026-09-07
     node weeknights/fetch-schedules.cjs --dry           # print, don't write

   Sources (all public, read-only, no auth):
     - Momence     ISHTA Yoga        readonly-api.momence.com host-schedule plugin API
     - Zen Planner Paxibellum (month grid), Unity (week list, ?date=) — public calendar.cfm

   The hand-curated data files (athena.js / jordan.js) own the notes, the
   venues and the itineraries. This script owns ONLY slots.js. An event opts in
   to pinning by carrying `match: ["Exact Class Name", ...]` — the renderer
   matches those names (case-insensitive, exact) against the slots at that
   event's venue and, when it finds any, uses the real days/times/teachers and
   marks the card verified. Events with no match, or no slots this week, keep
   their curated fallback and the honest 🔍.

   Zen Planner's grid shows start times only; those slots get a 60-minute end. */
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const TZ = "America/New_York";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]; // getDay() order

const SOURCES = [
  { venue: "ISHTA Yoga", kind: "momence", hostId: 45870, origin: "https://ishtayoga.com" },
  // both Zen Planner calendars accept ?date=YYYY-MM-DD, so the target week is fetched exactly
  { venue: "Paxibellum", kind: "zenplanner", url: "https://paxibellum.sites.zenplanner.com/calendar.cfm", dateParam: "date", durationMin: 60 },
  { venue: "Unity Jiu Jitsu", kind: "zenplanner", url: "https://unitybjj.zenplanner.com/zenplanner/portal/calendar.cfm", dateParam: "date", durationMin: 60 },
];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const mondayArg = args[args.indexOf("--monday") + 1];
const monday = /^\d{4}-\d{2}-\d{2}$/.test(mondayArg || "")
  ? new Date(mondayArg + "T12:00:00")
  : mondayOf(new Date());
if (monday.getDay() !== 1) { console.error("--monday must be a Monday"); process.exit(2); }
const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);

// ——— time helpers: everything in New York local time ———
function nyParts(isoUtc) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = {};
  f.formatToParts(new Date(isoUtc)).forEach((x) => { p[x.type] = x.value; });
  return { day: p.weekday.toLowerCase(), hm: p.hour.replace("24", "00") + ":" + p.minute, date: p.year + "-" + p.month + "-" + p.day };
}
function to24(t) {
  // "5:30 PM" / "12PM" / "7:00 AM" -> "17:30"
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i.exec(t.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] || "00";
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return pad(h) + ":" + min;
}
function addMin(hm, n) {
  const [h, m] = hm.split(":").map(Number);
  const t = h * 60 + m + n;
  return pad(Math.floor(t / 60) % 24) + ":" + pad(t % 60);
}

async function get(url, headers) {
  const res = await fetch(url, { headers: Object.assign({ "User-Agent": UA }, headers || {}), redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  return res;
}

// ——— Momence: the same read-only endpoint the studio's embedded widget calls ———
async function fetchMomence(src) {
  const u = "https://readonly-api.momence.com/host-plugins/host/" + src.hostId +
    "/host-schedule/sessions?fromDate=" + iso(monday) + "&toDate=" + iso(sunday) +
    "&page=1&timeZone=" + encodeURIComponent(TZ);
  const j = await (await get(u, { Accept: "application/json", Origin: src.origin, Referer: src.origin + "/" })).json();
  const rows = j.payload || [];
  return rows
    .filter((r) => r.inPerson && !r.isCancelled && !r.course && !r.semester)
    .map((r) => {
      const s = nyParts(r.startsAt), e = nyParts(r.endsAt);
      return {
        date: s.date, day: s.day, start: s.hm, end: e.hm,
        name: String(r.sessionName || "").trim(),
        teacher: String(r.teacher || "").replace(/\s+/g, " ").trim(),
        price: r.fixedTicketPrice != null ? r.fixedTicketPrice : null,
        link: r.link || null,
        spots: r.capacity != null && r.ticketsSold != null ? Math.max(0, r.capacity - r.ticketsSold) : null,
      };
    });
}

// ——— Zen Planner: two public calendar layouts exist.
//   month grid (Paxibellum): bare day-of-month numbers head each cell, then
//     "TIME Name" rows — the grid pads with neighbouring months' days.
//   week list (Unity): "Tuesday, September 1, 2026" headers, then rows of
//     TIME / Name / Teacher / Location on consecutive lines.
// Both are read into {date, day, time, name, teacher}, then collapsed into a
// weekly pattern (per weekday, the most common set of rows across the dates
// shown) so the target week is always complete even when the calendar only
// shows part of it. Rows that come from the pattern rather than the exact
// date are marked pattern:true. These gyms run identical grids week to week.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE_HDR = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(20\d{2})$/;
const TIME_ONLY = /^(\d{1,2}(?::\d{2})?\s?[AP]M)$/i;
const TIME_ROW = /^(\d{1,2}(?::\d{2})?\s?[AP]M)\b\s*(.*)$/i;

function stripHtml(html) {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  t = t.replace(/<[^>]+>/g, "\n");
  t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&ndash;/g, "–");
  return t.split("\n").map((l) => l.trim()).filter(Boolean);
}
function parseZenWeekList(lines) {
  const out = [];
  let date = null;
  for (let i = 0; i < lines.length; i++) {
    const h = DATE_HDR.exec(lines[i]);
    if (h) { date = new Date(parseInt(h[4], 10), MONTHS.indexOf(h[2]), parseInt(h[3], 10)); continue; }
    const m = TIME_ONLY.exec(lines[i]);
    if (!m || !date) continue;
    const name = lines[i + 1] || "";
    if (!name || TIME_ONLY.test(name) || DATE_HDR.test(name)) continue;
    const t2 = lines[i + 2] || "";
    // a teacher line looks like "First Last"; skip venue/location lines
    const teacher = /^[A-Z][a-zA-Z'.-]+(\s+[A-Z][a-zA-Z'.-]+)+$/.test(t2) && !/School|Academy|Location|Studio|Gym/.test(t2) ? t2 : "";
    out.push({ date: iso(date), day: DAY_KEYS[date.getDay()], time: m[1].toUpperCase().replace(/\s+/g, " "), name, teacher });
    i += 1;
  }
  return out;
}
function parseZenMonthGrid(lines, html) {
  const mh = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/.exec(html);
  const month = mh ? MONTHS.indexOf(mh[1]) : new Date().getMonth();
  const year = mh ? parseInt(mh[2], 10) : new Date().getFullYear();
  const triples = [];
  let dom = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\d{1,2}$/.test(l)) { dom = parseInt(l, 10); continue; }
    const m = TIME_ROW.exec(l);
    if (!m || dom == null) continue;
    let name = (m[2] || "").trim();
    if (!name && lines[i + 1] && !/^\d{1,2}$/.test(lines[i + 1]) && !TIME_ROW.test(lines[i + 1])) { name = lines[i + 1]; i++; }
    if (!name) continue;
    triples.push({ dom, time: m[1].toUpperCase().replace(/\s+/g, " "), name });
  }
  // keep the longest monotonic run of day numbers — that's the displayed month
  let best = [], run = [];
  for (const t of triples) {
    if (run.length && t.dom < run[run.length - 1].dom) { if (run.length > best.length) best = run; run = []; }
    run.push(t);
  }
  if (run.length > best.length) best = run;
  return best.map((t) => {
    const d = new Date(year, month, t.dom);
    return { date: iso(d), day: DAY_KEYS[d.getDay()], time: t.time, name: t.name, teacher: "" };
  });
}
function parseZenPlanner(html) {
  const lines = stripHtml(html);
  return lines.some((l) => DATE_HDR.test(l)) ? parseZenWeekList(lines) : parseZenMonthGrid(lines, html);
}
async function fetchZenPlanner(src) {
  const url = src.dateParam ? src.url + (src.url.indexOf("?") === -1 ? "?" : "&") + src.dateParam + "=" + iso(monday) : src.url;
  const html = await (await get(url)).text();
  const all = parseZenPlanner(html);
  if (!all.length) throw new Error("parsed 0 rows from " + src.url);

  // exact rows by date, and a per-weekday modal pattern for dates not shown
  const byDate = {};
  all.forEach((s) => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  const sigCount = {};
  Object.keys(byDate).forEach((d) => {
    const day = byDate[d][0].day;
    const sig = byDate[d].map((s) => [s.time, s.name, s.teacher].join("|")).sort().join("\n");
    sigCount[day] = sigCount[day] || {};
    sigCount[day][sig] = (sigCount[day][sig] || 0) + 1;
  });
  const pattern = {};
  Object.keys(sigCount).forEach((day) => {
    const top = Object.entries(sigCount[day]).sort((x, y) => y[1] - x[1])[0][0];
    pattern[day] = top.split("\n").map((row) => { const [time, name, teacher] = row.split("|"); return { time, name, teacher }; });
  });

  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const ds = iso(d), day = DAY_KEYS[d.getDay()];
    const rows = byDate[ds]
      ? byDate[ds].map((s) => Object.assign({}, s, { pattern: false }))
      : (pattern[day] || []).map((s) => ({ date: ds, day, time: s.time, name: s.name, teacher: s.teacher, pattern: true }));
    rows.forEach((r) => out.push(r));
  }
  return out.map((s) => {
    const start = to24(s.time);
    return { date: s.date, day: s.day, start, end: start ? addMin(start, src.durationMin || 60) : null,
      name: s.name, teacher: s.teacher || "", price: null, link: src.url, spots: null, pattern: !!s.pattern };
  }).filter((s) => s.start);
}

(async () => {
  const out = { weekMonday: iso(monday), fetched: new Date().toISOString(), venues: {} };
  let failures = 0;
  for (const src of SOURCES) {
    try {
      const slots = src.kind === "momence" ? await fetchMomence(src) : await fetchZenPlanner(src);
      slots.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
      out.venues[src.venue] = slots;
      const eve = slots.filter((s) => s.start >= "16:00" && !["sat", "sun"].includes(s.day));
      console.log(src.venue + ": " + slots.length + " slots (" + eve.length + " weeknight evenings)" + ((n => n ? " [" + n + " from the weekly pattern — calendar didn't show those dates]" : "")(slots.filter((s) => s.pattern).length)));
      eve.forEach((s) => console.log("   " + s.day + " " + s.start + "–" + s.end + "  " + s.name + (s.teacher ? "  · " + s.teacher : "") + (s.price != null ? "  · $" + s.price : "")));
    } catch (e) {
      failures++;
      out.venues[src.venue] = [];
      console.error(src.venue + ": FAILED — " + e.message);
    }
  }
  const js = "/* GENERATED by fetch-schedules.cjs — do not hand-edit. Real class slots pulled\n" +
    "   from the studios' own booking platforms for the week of " + out.weekMonday + ".\n" +
    "   Regenerate: node weeknights/fetch-schedules.cjs */\n" +
    "window.SLOTS = " + JSON.stringify(out, null, 1) + ";\n";
  if (dry) { console.log("\n(dry run — not written)"); }
  else {
    fs.writeFileSync(path.join(__dirname, "slots.js"), js);
    console.log("\nwrote slots.js for week of " + out.weekMonday);
  }
  process.exit(failures === SOURCES.length ? 1 : 0);
})();
