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
const MAX_WALK = 15;
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

    // 1. freshness
    if (data.weekMonday !== thisMonday) {
      problems.push(`${who}: STALE — weekMonday is ${data.weekMonday}, this week is ${thisMonday}`);
    }

    // 2. every weeknight has something inside the walk radius
    const visible = (data.events || []).filter((e) => walkOf(e) <= MAX_WALK);
    for (const day of DAY_KEYS) {
      const n = visible.filter((e) => (e.days || []).indexOf(day) !== -1).length;
      if (n < 2) problems.push(`${who}: ${day} has only ${n} class(es) inside the ${MAX_WALK}-min walk`);
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

    // 5. the walk rule is the whole premise — nothing may violate it
    const tooFar = Object.entries(venues).filter(([, v]) => (v.walkMinutes || 0) > MAX_WALK);
    if (tooFar.length) {
      problems.push(`${who}: ${tooFar.length} venue(s) beyond the ${MAX_WALK}-min walk: ${tooFar.map(([n]) => n).join(", ")}`);
    }

    // 6. drift guard — if nothing has a pinned time the site is only a directory
    const pinned = (data.events || []).filter((e) => e.timeVerified).length;
    const total = (data.events || []).length;
    console.log(`  ${who}: ${total} classes · ${Object.keys(venues).length} venues · ${pinned} pinned · week of ${data.weekMonday}`);
    if (pinned === 0) problems.push(`${who}: no class has a verified time — the weekly refresh is not doing its job`);
  }

  console.log("");
  if (problems.length) {
    console.error(`✗ ACTION NEEDED — ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`   · ${p}`));
    process.exit(1);
  }
  console.log("✓ healthy — both sides fresh, every weeknight covered, walk rule holding.");
  process.exit(0);
})();
