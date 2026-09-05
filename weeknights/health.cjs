#!/usr/bin/env node
/* Jordan & Athena Weeknights — freshness + coverage health check.
 *
 * The watchdog's contract. It answers ONE question: if either of them opened
 * the site tonight, in the DEFAULT view, would they see a real class they
 * could still walk to and book?
 *
 * It measures what the default view actually shows (tonight's weeknight, the
 * 15-minute walk cap) rather than the raw class count, because a data file can
 * look full while the screen for a given night is empty.
 *
 *   node health.cjs             # check local repo files
 *   node health.cjs --live      # check the deployed site
 *   node health.cjs --date NNN  # override "today" (ISO) for testing
 *
 * Exit 0 = healthy, nothing to do.
 * Exit 1 = ACTION NEEDED (stale week, empty night, or too few pinned times).
 * Exit 2 = could not check (fetch/parse failure) — also needs a human/agent.
 */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const MAX_WALK = 15;   // martial arts, and all of Athena's side — on foot
const MAX_TRAVEL = 25; // Jordan's soccer and running — door-to-door
const MARTIAL_CATS = ["grappling", "striking", "mma"];
const LIVE = process.env.WEEKNIGHTS_URL || "https://jordan-athena-weeknights.vercel.app";

const args = process.argv.slice(2);
const useLive = args.includes("--live");
const dateArg = (args[args.indexOf("--date") + 1] || "").match(/^\d{4}-\d{2}-\d{2}$/)
  ? args[args.indexOf("--date") + 1] : null;

async function load(file, globalName) {
  let src;
  if (useLive) {
    const res = await fetch(`${LIVE}/${file}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status} from ${LIVE}`);
    src = await res.text();
  } else {
    src = require("fs").readFileSync(require("path").join(__dirname, file), "utf8");
  }
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function("window", src)(sandbox.window);
  const data = sandbox.window[globalName];
  if (!data) throw new Error(`${file} did not define window.${globalName}`);
  return data;
}

function mondayOf(d) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

(async () => {
  const today = dateArg ? new Date(dateArg + "T12:00:00") : new Date();
  const thisMonday = mondayOf(today);
  const dow = (today.getDay() + 6) % 7;
  const tonight = dow < 5 ? DAY_KEYS[dow] : null; // null on Sat/Sun

  console.log(`Weeknights health check — ${useLive ? "LIVE site" : "local repo"} — ${today.toDateString()}\n`);

  let athena, jordan;
  try {
    [athena, jordan] = await Promise.all([
      load("athena.js", "ATHENA_DATA"),
      load("jordan.js", "JORDAN_DATA"),
    ]);
  } catch (e) {
    console.error(`✗ could not load data: ${e.message}`);
    process.exit(2);
  }

  const problems = [];

  for (const [who, data] of [["athena", athena], ["jordan", jordan]]) {
    const venues = data.venues || {};
    const walkOf = (e) => (venues[e.venue] || {}).walkMinutes ?? 999;
    const travelOf = (e) => {
      const v = venues[e.venue] || {};
      return typeof v.travelMinutes === "number" ? v.travelMinutes : (v.walkMinutes ?? 999);
    };

    // 1. freshness
    if (data.weekMonday !== thisMonday) {
      problems.push(`${who}: STALE — weekMonday is ${data.weekMonday}, this week is ${thisMonday}`);
    }

    // 2. every weeknight has something inside the radius
    const visible = (data.events || []).filter((e) => travelOf(e) <= MAX_TRAVEL);
    for (const day of DAY_KEYS) {
      const n = visible.filter((e) => (e.days || []).indexOf(day) !== -1).length;
      if (n < 2) problems.push(`${who}: ${day} has only ${n} option(s) inside the ${MAX_TRAVEL}-min radius`);
    }

    // 3. tonight specifically — the thing they'd actually open the site for
    if (tonight) {
      const n = visible.filter((e) => (e.days || []).indexOf(tonight) !== -1).length;
      if (n === 0) problems.push(`${who}: NOTHING to do tonight (${tonight})`);
    }

    // 4. itineraries resolve
    for (const day of DAY_KEYS) {
      const it = (data.itineraries || {})[day];
      if (!it || !(it.picks || []).length) problems.push(`${who}: itinerary.${day} is missing or empty`);
    }

    // 5. the radius rules are the whole premise — nothing may violate them.
    //    Martial arts keep the original 15-minute WALK; everything else gets
    //    25 minutes door-to-door.
    const martialTooFar = (data.events || []).filter((e) =>
      MARTIAL_CATS.indexOf(e.category) !== -1 && walkOf(e) > MAX_WALK);
    if (martialTooFar.length) {
      problems.push(`${who}: ${martialTooFar.length} martial-arts entr(ies) beyond the ${MAX_WALK}-min WALK: ` +
        martialTooFar.map((e) => e.venue).join(", "));
    }
    const tooFar = Object.entries(venues).filter(([, v]) =>
      (typeof v.travelMinutes === "number" ? v.travelMinutes : v.walkMinutes || 0) > MAX_TRAVEL);
    if (tooFar.length) {
      problems.push(`${who}: ${tooFar.length} venue(s) beyond ${MAX_TRAVEL} min door-to-door: ${tooFar.map(([n]) => n).join(", ")}`);
    }

    // 6. drift guard — if nothing has a pinned time the site is only a directory
    const pinned = (data.events || []).filter((e) => e.timeVerified).length;
    const total = (data.events || []).length;
    console.log(`  ${who}: ${total} classes · ${Object.keys(venues).length} venues · ${pinned} pinned · week of ${data.weekMonday}`);
    if (pinned === 0) problems.push(`${who}: no class has a verified time — the weekly refresh is not doing its job`);
  }

  // 6b. slots.js freshness — the live times are the site's main value now, so a
  //     stale or missing slots file is a real failure, not a warning
  try {
    const slots = await load("slots.js", "SLOTS");
    const n = Object.values(slots.venues || {}).reduce((t, v) => t + v.length, 0);
    console.log(`  slots: ${n} live slots · week of ${slots.weekMonday}`);
    if (slots.weekMonday !== thisMonday) problems.push(`slots.js is STALE — week of ${slots.weekMonday}, this week is ${thisMonday} (run fetch-schedules.cjs)`);
    const empty = Object.keys(slots.venues || {}).filter((v) => !(slots.venues[v] || []).length);
    if (empty.length) problems.push(`slots.js has no slots for: ${empty.join(", ")} — that fetcher source broke`);
  } catch (e) {
    problems.push(`slots.js missing or unreadable (${e.message}) — run fetch-schedules.cjs`);
  }

  // 7. link check — a booking URL that 404s is a real failure the data can't
  //    see. 403/405/429 mean "alive but bot-blocked" (ClassPass, Pure Barre,
  //    BDC all do this) and are only warned about; 404/410/5xx/DNS fail.
  if (!args.includes("--no-links")) {
    const urls = new Set();
    for (const data of [athena, jordan]) {
      Object.values(data.venues || {}).forEach((v) => v.url && urls.add(v.url));
      (data.events || []).forEach((e) => e.url && urls.add(e.url));
      Object.values(data.teachers || {}).forEach((t) => t.url && urls.add(t.url));
    }
    const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
    const check = async (u) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      try {
        let res = await fetch(u, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
        if (res.status === 405 || res.status === 403 || res.status === 400) {
          res = await fetch(u, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
        }
        return { u, status: res.status };
      } catch (e) {
        return { u, status: 0, err: e.name === "AbortError" ? "timeout" : (e.cause && e.cause.code) || e.message };
      } finally { clearTimeout(t); }
    };
    const results = await Promise.all(Array.from(urls).map(check));
    const dead = results.filter((r) => r.status === 404 || r.status === 410 || r.status >= 500 || r.status === 0);
    const blocked = results.filter((r) => [401, 403, 405, 429].includes(r.status));
    console.log(`  links: ${results.length} checked · ${dead.length} dead · ${blocked.length} bot-blocked (alive)`);
    blocked.forEach((r) => console.log(`    ⚠ ${r.status} ${r.u}`));
    dead.forEach((r) => problems.push(`dead link (${r.status || r.err}): ${r.u}`));
  }

  console.log("");
  if (problems.length) {
    console.error(`✗ ACTION NEEDED — ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`   · ${p}`));
    process.exit(1);
  }
  console.log("✓ healthy — both sides fresh, every weeknight covered, radius rules holding, links alive.");
  process.exit(0);
})();
