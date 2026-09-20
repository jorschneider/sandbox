# Rayray Big Weekend — porting guide (exported Sep 20, 2026)

A static, no-build website plus three scripts and a written contract that an
automated weekly researcher follows. Everything needed is in this directory.

## What is here

| Path | What it is |
|---|---|
| `index.html`, `app.js`, `styles.css` | The whole site. Vanilla JS, no framework, no build step. Loads the two data files and Leaflet. |
| `week.js` | Kid mode data: `window.WEEK_DATA = {...}` (current week + `nextWeek` preview + ~200 evergreen places). |
| `date.js` | Date Night mode data: `window.DATE_DATA = {...}`, same shape. |
| `vendor/leaflet/` | Leaflet 1.9 vendored (map). Tiles come from tile.openstreetmap.org at view time; weather strip from Open-Meteo at view time. No API keys anywhere. |
| `validate.cjs` | Schema and consistency validator for both data files. Run before every deploy. Exit 1 on any error. |
| `health.cjs` | The success contract: is the site fresh and does every visible day-part have events? `--live` checks production, no flag checks local files, `--date YYYY-MM-DD` overrides today. Exit 0 healthy, 1 action needed, 2 could not check. |
| `sync-from-live.cjs` | Replaces local `week.js`/`date.js` with the production copies when local is behind (`--check` reports only). Run first in every automated run. |
| `UPDATE.md` | The complete operating contract: schema, research rules, source checklist, Monday procedure, itineraries, date mode, deploy, watchdog, Saturday re-verify, verified leads through Nov 1, 2026. |
| `ROUTINES.md` | The three scheduled prompts, verbatim, with their cron schedules. |

Git: `https://github.com/jorschneider/sandbox`, branch
`claude/toddler-activities-microsite-rhvwp8`, directory `rayray-big-weekend/`.
Open PR: https://github.com/jorschneider/sandbox/pull/18.

```sh
git clone --branch claude/toddler-activities-microsite-rhvwp8 https://github.com/jorschneider/sandbox
cd sandbox/rayray-big-weekend
```

## Run locally

```sh
python3 -m http.server 8000     # from this directory, then open http://localhost:8000/
# or: npx -y serve -l 4173 .
node validate.cjs               # must pass
node health.cjs                 # local data health
node health.cjs --live          # what production serves
```

Requirements: Node 22 (scripts use global `fetch`), Python 3 only for the
static server. No dependencies to install.

## Data model (both files)

```
{
  weekLabel: "September 14–20, 2026",
  weekMonday: "2026-09-14",            // must be a Monday
  updated: "September 14, 2026",
  itineraries: { mon..sun: { summary, picks: [ { slot: morning|afternoon|evening, key, title, note } ] } },
  events: [ Event, ... ],              // dated events (event:true) + evergreen places (event:false, recurring:true)
  nextWeek: { weekMonday, weekLabel, events: [ Event ], itineraries? }   // optional preview
}
Event = {
  title, category, venue, neighborhood, when, cost, travelHow, toddlerNotes, url   // strings, all required
  category: music|theater|storytime|play|animals|festival|other|dance|chinese|party|class|film
  days: ["mon".."sun"] or ["any"]     times: ["morning"|"afternoon"|"evening"] or ["any"]
  start: "HH:MM" (required unless times is ["any"]), end: "HH:MM" optional
  travelMinutes: 1–60 from 112 E 19th St     lat: 40.6–40.85   lng: -74.1 to -73.9
  event: boolean   outdoor: boolean   cpwOnly: boolean (Grandma's-zone only)   recurring?: boolean
  confidence: high|medium|low   (medium/low shows a 🔍 chip)
}
```

Itinerary `key` = slug of the event title: lowercase, non-alphanumerics to
`-`, trimmed, first 48 chars. Two titles that collide after truncation are a
validation error. `validate.cjs` enforces all of the above plus 2–3 picks per
morning and afternoon slot, max 9 picks a day, pick/start agreement, and
that next-week entries are real dated events.

Rewriting a data file: parse the JSON after `= `, edit, write back as
`window.WEEK_DATA = ` + `JSON.stringify(data, null, 2)` + `;\n`. That is
byte-for-byte how the files are formatted today.

## Deploy

Production is a Vercel project named `rayray-big-weekend` in the team
`jordan-schneiders-projects` (project id `prj_CYQiWCt4UmVYDZDl44HxctE55lSf`),
not linked to git; this directory is deployed as the site root with the CLI.
Alias: https://rayray-big-weekend.vercel.app.

```sh
export VERCEL_TOKEN=...                       # a Vercel personal token for the account
npx -y vercel link --yes --project rayray-big-weekend --scope jordan-schneiders-projects --token "$VERCEL_TOKEN"
npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"
node health.cjs --live                        # confirm
```

Any static host works instead: upload this directory as-is.

## Automation

The weekly cycle is: Monday run promotes `nextWeek` to the current week,
researches the new week and the following week from the sources in
UPDATE.md, rebuilds itineraries, validates, commits, deploys, and checks
`health.cjs --live`; a daily watchdog repairs anything the health check
flags; a Saturday run re-verifies the weekend's events. The three prompts
are in ROUTINES.md. Success is defined only by `health.cjs --live` exiting 0.

Known weaknesses to fix in any port:
- The scheduled runner must be able to push to git. Claude's scheduled
  sessions could not (HTTP 403), so git drifted behind production for six
  weeks. Either give the runner push credentials, or mirror production data
  back into git on a schedule (a GitHub Actions job that runs
  `sync-from-live.cjs` and commits is included as `proposed/rayray-git-sync.yml`).
- Research quality depends entirely on the source list in UPDATE.md. The
  "Source checklist" section added Sep 19, 2026 is the current best list.
- The Monday watchdog at 10:00 UTC fires an hour before the Monday refresh
  and usually does the promotion itself; harmless but wasteful.
