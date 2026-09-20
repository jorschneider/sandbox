#!/usr/bin/env node
/* Rayray Big Weekend — bring the repo copy of week.js / date.js up to date with
 * what production actually serves.
 *
 * Why this exists: from Aug 3 to Sep 17, 2026 every routine run deployed to
 * production but its `git push` never landed, so the branch on GitHub fell six
 * weeks behind the live site and every fresh session started from stale data.
 * Run this FIRST in every routine, right after checkout, before health.cjs:
 *
 *   node rayray-big-weekend/sync-from-live.cjs           # replace local files that are behind live
 *   node rayray-big-weekend/sync-from-live.cjs --check   # report only; exit 1 if the repo is behind live
 *   node rayray-big-weekend/sync-from-live.cjs --dir D   # operate on directory D instead of this one (tests)
 *
 * A local file is replaced only when the live copy parses, looks like a real
 * week (sane event count, valid weekMonday) and is NEWER: a later weekMonday,
 * or the same week with a later `updated` date, or the same week and date but
 * different content (at session start the repo can only differ from
 * production because an earlier push failed — production is what Jordan sees).
 * If the repo is AHEAD (later `updated`), nothing is touched; deploy it.
 *
 * Exit 0 = in sync, or synced (the output names the files it replaced — run
 *          validate.cjs, then COMMIT AND PUSH them; no deploy is needed).
 * Exit 1 = --check only: the repo is behind live.
 * Exit 2 = could not fetch or parse live — nothing was touched; carry on with
 *          the repo copy and let health.cjs --live judge the site.
 */
const fs = require("fs");
const path = require("path");

const LIVE = process.env.RAYRAY_LIVE_URL || "https://rayray-big-weekend.vercel.app";
const FILES = [
  { name: "week.js", minEvents: 20 },
  { name: "date.js", minEvents: 5 },
];
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const dirArg = args[args.indexOf("--dir") + 1];
const DIR = args.includes("--dir") && dirArg ? path.resolve(dirArg) : __dirname;

// Same parsing as health.cjs: the file is `window.X = {...};`
function parse(src, label) {
  const i = src.indexOf("= ");
  if (i < 0) throw new Error(`${label}: no assignment found`);
  const data = JSON.parse(src.slice(i + 2).replace(/;\s*$/, "").trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.weekMonday || "")) throw new Error(`${label}: bad weekMonday ${data.weekMonday}`);
  if (!Array.isArray(data.events)) throw new Error(`${label}: no events array`);
  return data;
}
const updatedTs = (d) => { const t = Date.parse(d.updated || ""); return Number.isNaN(t) ? 0 : t; };
const dated = (d) => d.events.filter((e) => e.event === true).length;
const describe = (d) => `week of ${d.weekMonday}, updated "${d.updated || "?"}", ${dated(d)} dated events`;

async function fetchLive(name) {
  const res = await fetch(`${LIVE}/${name}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${LIVE}`);
  return await res.text();
}

// Returns "behind" | "same" | "ahead" for local relative to live.
function compare(local, live, localSrc, liveSrc) {
  if (live.weekMonday > local.weekMonday) return "behind";
  if (live.weekMonday < local.weekMonday) return "ahead";
  const lu = updatedTs(local), vu = updatedTs(live);
  if (vu > lu) return "behind";
  if (vu < lu) return "ahead";
  return localSrc === liveSrc ? "same" : "behind";
}

(async () => {
  console.log(`Rayray sync-from-live — ${checkOnly ? "CHECK" : "SYNC"} — repo dir ${DIR}\n`);
  let behind = 0, replaced = [], failures = 0;
  for (const f of FILES) {
    const localPath = path.join(DIR, f.name);
    let localSrc, local, liveSrc, live;
    try {
      localSrc = fs.readFileSync(localPath, "utf8");
      local = parse(localSrc, `local ${f.name}`);
    } catch (err) { console.log(`✗ ${f.name}: cannot read/parse the repo copy (${err.message}) — leaving it alone`); failures++; continue; }
    try {
      liveSrc = await fetchLive(f.name);
      live = parse(liveSrc, `live ${f.name}`);
      if (live.events.length < f.minEvents) throw new Error(`live ${f.name}: only ${live.events.length} entries (want ≥ ${f.minEvents})`);
    } catch (err) { console.log(`✗ ${f.name}: could not fetch/parse live (${err.message}) — leaving the repo copy alone`); failures++; continue; }

    const rel = compare(local, live, localSrc, liveSrc);
    console.log(`${f.name}:\n  repo: ${describe(local)}\n  live: ${describe(live)}`);
    if (rel === "same") { console.log("  ✓ in sync"); continue; }
    if (rel === "ahead") { console.log("  ▲ repo is AHEAD of live (a push landed without a deploy) — keep it and deploy"); continue; }
    behind++;
    if (checkOnly) { console.log("  ✗ repo is BEHIND live"); continue; }
    fs.writeFileSync(localPath, liveSrc);
    replaced.push(f.name);
    console.log("  ↓ replaced the repo copy with the live file");
  }
  console.log("");
  if (replaced.length) {
    console.log(`SYNCED ${replaced.join(", ")} from live. Now: node rayray-big-weekend/validate.cjs, then COMMIT AND PUSH ` +
      `(message: "Sync repo to live <weekLabel>"). No deploy is needed for these files — production already serves them.`);
  }
  if (failures) { console.log("Could not check every file against live (see ✗ above)."); process.exit(2); }
  if (checkOnly && behind) { console.log(`Repo is behind live for ${behind} file(s) — run without --check to sync, then commit and push.`); process.exit(1); }
  if (!replaced.length) console.log("Repo matches or leads live for every file. Nothing to sync.");
})();
