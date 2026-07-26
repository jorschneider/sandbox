# Rayray Big Weekend — Monday update contract

This microsite lists toddler-friendly (age 2) activities within ~35 minutes
door-to-door of Union Square, Manhattan (home base: 112 East 19th Street).
It must be refreshed **every Monday morning** for the new week (Monday–Sunday).

## What to change

Only `week.js`. Do not restructure `index.html`, `app.js`, or `styles.css`
unless something is broken — the design is settled.

**CRITICAL — `events` has two kinds of entries; only one kind is refreshed:**
- **Dated events** (`event: true`, real `days`): the ~40–55 scheduled happenings
  for THIS week. These are what you refresh every Monday.
- **The evergreen library** (`event: false`, `days` include `any` or fixed open
  days, `recurring: true`): ~200 always-open spots — the toddler **playgrounds**
  and the **indoor/rainy-day** stops (museums, indoor play, libraries,
  bookstores, nature centers), plus carousels, ferries, zoos, gardens.
  **CARRY THESE FORWARD UNCHANGED.** Never regenerate `week.js` from scratch or
  trim to "~40 entries" — that destroys the library. A correct refreshed
  `week.js` has ~200+ total entries. Only drop an evergreen entry you can
  confirm is permanently closed; add new ones as they open. See rules 9 & 10.

`week.js` sets `window.WEEK_DATA`:

```js
window.WEEK_DATA = {
  weekLabel: "July 13–19, 2026", // human label for the Mon–Sun week
  weekMonday: "2026-07-13",      // ISO date of that Monday (drives TODAY badge)
  updated: "July 13, 2026",      // date the data was refreshed
  itineraries: { /* one exec-sum plan per day, see "Daily itineraries" below */ },
  events: [ /* ~40–55 DATED events + the ~200 evergreen library, see schema */ ],
  nextWeek: { /* preview of the FOLLOWING week, see "Next-week preview" below */ }
};
```

Each event:

| field | type | notes |
|---|---|---|
| `title` | string | short, fun |
| `category` | string | one of `music`, `theater`, `storytime`, `play`, `animals`, `festival`, `other` |
| `venue` | string | place name |
| `neighborhood` | string | e.g. "Flatiron", "DUMBO" |
| `when` | string | human schedule, e.g. "Sat Jul 11, 11:00 AM" or "Daily, sunrise–sunset" |
| `days` | array | subset of `["mon".."sun"]`, or `["any"]` for open-anytime places |
| `cost` | string | START with "Free" only if genuinely free for the family; "Free entry; rides cost extra" for free-with-extras; otherwise lead with the price ("$10 child / $15 adult"). Renders as a green FREE chip vs an orange price chip. |
| `travelMinutes` | number | door-to-door estimate from Union Square |
| `travelHow` | string | e.g. "L to Bedford Av + 5 min walk" |
| `toddlerNotes` | string | why it works for a 2-year-old (shade, strollers, duration, nap timing) |
| `url` | string | official page — real, working links only |
| `outdoor` | boolean | drives the ☀️/❄️ badge and outdoor filter |
| `confidence` | string | `high` = date verified; `medium`/`low` shows a "🔍 double-check" chip |
| `lat`, `lng` | numbers | venue coordinates for the map view (NYC: lat 40.64–40.82, lng −74.05 to −73.92) |
| `start` | string/null | earliest start time as 24h "HH:MM" (null for open-anytime places) — drives the "Starts 10 AM" badge, time color coding, and earliest-to-latest sort |
| `times` | array | subset of `["morning","afternoon","evening"]` or `["any"]` — must agree with `start` (before 12 = morning, 12–4:59 = afternoon, 5+ = evening) |
| `end` | string/null | end time "HH:MM" parsed from the schedule range where known; drives the "ended today" fade (fallback: start + 2h) |
| `cpwOnly` | boolean | `true` = only reachable from Grandma's base (beyond ~35 min of Union Sq); hidden in Union Sq mode |
| `event` | boolean | `true` = a real dated happening (concert, show, storytime session, festival) — gets the "⭐ this week" chip, sorts first, and powers the "Real events only" filter. `false` = an open-anytime place. |

## Monday procedure (do this in order)

The site must NEVER be left showing a past week — **and never jump AHEAD of the
current week either.** Work in this order so even a partial run leaves it right:

0. **Anchor to the real date FIRST.** Run `date` and compute
   `thisMonday` = the most recent Monday **on or before today** (if today IS
   Monday, that's today). The current week is always `thisMonday`–Sunday.
   Do NOT assume it is Monday and do NOT skip to a future week — if this routine
   is ever fired on a Sat/Sun, `thisMonday` is still the PAST Monday, so the week
   must stay on the current Mon–Sun, not advance. Compare to `week.js`'s
   `weekMonday`:
   - If `weekMonday` **already equals `thisMonday`** → the current week is
     correct. Do NOT promote or advance. Skip to step 2 (just refresh the
     `nextWeek` preview).
   - If `weekMonday` is **before `thisMonday`** (stale) → promote/advance in
     step 1.
1. **Promote (only when stale, per step 0).** If `nextWeek` holds the events for
   `thisMonday`'s week, promote it to be this week: keep every evergreen entry
   (`event !== true`), replace the dated events with `nextWeek.events`, set
   `weekLabel`/`weekMonday` to `thisMonday`'s week and `updated` to today, author
   fresh `itineraries` (see "Daily itineraries"), clear `nextWeek`. Run the
   validator, commit, **deploy, and confirm the live `weekLabel` updated.**
2. **Then research the NEW `nextWeek`** (the following Mon–Sun) per the rules
   below, and the dated events for any gaps in the promoted week. Add findings,
   re-validate, commit, deploy again.
3. **If you cannot do full research** (time, tool, or usage limits), STOP after
   step 1 — a promoted week with no preview is fine; next Monday fills it. Do
   not leave a half-written `week.js`; the validator must pass before every push.

If `nextWeek` is empty/missing (no preview to promote), do the full research
for this week directly, but STILL preserve the evergreen library.

## Research rules

1. **Radius — two home bases**: ~35 min by subway/walk/ferry from Union
   Square (112 E 19th St) is the main zone. The site also has a "Grandma's"
   mode (101 Central Park West): for WEEKEND days, also hunt the Upper West
   Side / Central Park / Riverside Park zone within ~30 min of 101 CPW and
   mark anything beyond the Union Square radius with `cpwOnly: true`.
   **Williamsburg AND Greenpoint are always in-zone** (family friends live
   there): McCarren Park, Domino Park, Transmitter Park, the Greenpoint and
   Leonard libraries, and their events count even when the transit estimate
   runs a bit over 35 minutes.
   `travelMinutes`/`travelHow` are measured from Union Square (except
   cpwOnly entries, where they can reference Grandma's); Grandma-mode travel
   times are estimated client-side from coordinates. Main zone: Manhattan below
   ~86th St, DUMBO, Brooklyn Heights, Downtown Brooklyn, Williamsburg, north
   Park Slope, LIC, Governors Island. Nothing farther.
2. **Age 2 fit**: short or drop-in, stroller-friendly, no age minimums.
   **Cover the whole day, every day**: weekday daytime events AND weekday
   evenings (post-work outings) both matter — aim for each day of the week to
   offer morning, afternoon, and evening options. **Every day needs at least one
   Union-Square-reachable (non-cpwOnly) afternoon AND evening dated event** — an
   evening that is all `cpwOnly` (Grandma's-zone only) reads as empty in the
   default view. The validator prints a coverage report flagging any day-part
   with no USQ-visible event; the UI auto-backfills empty afternoon/evening
   slots with the nearest anytime spots, but real dated events are the goal —
   chase the coverage gaps the validator reports before finishing.
3. **Storytimes: weekdays yes, weekends no.** Library/bookstore read-alouds
   are welcome Monday-Friday (they fill weekday slots nicely). On weekends
   they're too tame — story-adjacent things earn a weekend slot only as part
   of something bigger (a museum family day, a puppet show, an author event
   with real extras).
   Same test for activities generally: a 2-year-old must be able to DO the
   thing, not just be present while adults do it (no bowling, no escape
   rooms, no sit-still screenings).
4. **Real events first**: the site exists to surface ACTUAL SCHEDULED EVENTS —
   concerts, shows, festivals with a date and start time. Hunt venue calendars
   directly (NYC Parks events, Lincoln Center, Bryant Park, Hudson River Park,
   Little Island, BRIC, NYPL/BPL branch calendars, Mommy Poppins day-by-day).
   **ALWAYS check the home-turf calendars first** — these are a few minutes'
   walk from base and should be surfaced whenever they have a toddler event:
   **Stuyvesant Town / Peter Cooper Village** (stuytown.com/events — the Oval
   Lawn summer series: outdoor kids shows, movies on the Oval, live music,
   family/toddler programming, the farmers market, and the Oval playgrounds),
   plus Union Square, Madison Square Park, Gramercy, and the East Village.
   Note in `toddlerNotes` when a StuyTown/PCV event is resident-access-only vs
   open to the public.
   Aim for 15+ dated events across the week, every day covered. Evergreen
   places (playgrounds, carousels, ferries, zoo) stay as the "anytime" tail —
   refresh their open/closed status, don't let them crowd out events.
   **ALWAYS run a dedicated free-outdoor-theater hunt** every week: Shakespeare
   in the park (Delacorte lottery, Shakespeare Downtown at Castle Clinton,
   Shakespeare in the Parking Lot), roaming companies (New York Classical,
   Boomerang, Piper Theatre at the Old Stone House, Hudson Classical in
   Riverside Park), Little Island's amphitheater, and outdoor puppet stages.
   Include ALL free outdoor theater — do NOT exclude a show for its seating
   format or adult material; the family brings a blanket and leaves anytime.
   Instead, FLAG the setup in toddlerNotes (stone patio vs lawn, fixed rows,
   no-late-seating rules, run length, content notes).
   **ALSO hunt indoor culture every week**: (a) current exhibitions at NYC's
   top museums — the Met, MoMA, AMNH, Whitney, Guggenheim, New-York
   Historical/DiMenna, Museum of the City of NY, Brooklyn Museum, New Museum,
   Intrepid — pick shows with real toddler visual appeal (big, colorful,
   immersive), with the family price math (under-X free, resident
   pay-what-you-wish) and stroller rules; (b) indoor family-friendly concerts
   (Jazz at Lincoln Center family shows, Carnegie family events, Symphony
   Space Just Kidding, Bargemusic, free atrium series).
   **Frame ages honestly**: verify age recommendations on the official page;
   "all ages welcome" is not "made for toddlers" — say which part of an event
   is actually the toddler part.
5. **Mix**: categories broadly represented; plenty of free options; in summer favor
   water play + shade, in winter favor indoor/heated options.
6. **Cards must be self-sufficient**: a parent plans from the card alone —
   never make them click through to figure out what/where/when. `when` carries
   the exact day + time window; `toddlerNotes` says concretely what you do
   there ("mask-making at the kids' lawn on 61st St, pet parade steps off
   2 PM"), not vibes. Umbrella festivals must be broken into their specific
   joinable sessions (one card per session or an explicit mini-schedule on the
   card) — a card that says "20+ venues, lots going on!" is a defect.
7. **Verify, don't vibe**: check dates against official venue pages / NYC Parks
   calendar / Mommy Poppins / Time Out Kids for the *correct year*. If an exact
   time can't be confirmed, keep the typical time and set `confidence` to
   `medium` or `low`. Never invent dates or URLs. Drop anything you can't
   corroborate at all.
8. Keep evergreen favorites (playgrounds, carousels, zoo, ferries) in the list
   every week — verify they're open (water features and carousels close
   seasonally or for repairs).
10. **Preserve the indoor/rainy-day library.** The site carries a large set of
   indoor stops (museums, indoor play spaces, gyms, libraries, bookstores,
   nature/animal centers) as evergreen entries (`outdoor:false`, `days` = actual
   open days or `["any"]`, `event:false`, `recurring:true`, mostly
   `confidence:"medium"` since hours/prices are imported and unverified — that's
   why they show a 🔍 chip). They render in the "☔ Rainy day" group, sorted
   nearest-first, and are the go-to when the weather turns. Carry them forward;
   only drop one confirmed closed. (Seed set imported from the Bloop Adventures
   directory, travel recomputed from Union Square.)
9. **Preserve the playground library.** The site carries a large curated set of
   toddler playgrounds (category `play`, `days:["any"]`, `event:false`,
   `recurring:true`) across Manhattan below ~86th, the CPW/UWS/Riverside/Central
   Park zone (some `cpwOnly`), and Brooklyn (DUMBO, Heights, Cobble Hill, Fort
   Greene, Williamsburg, Greenpoint, Park Slope). These fill quiet weekdays and
   render in their own "🛝 Playgrounds & splash pads" group, sorted nearest-first.
   Do NOT drop them on a refresh — carry them forward. Only remove one you can
   confirm is closed/under reconstruction, and add new ones as they open. Their
   `travelMinutes` is a from-Union-Square estimate; `cpwOnly:true` marks the
   uptown ones (beyond ~36 min of Union Sq) so they surface only in Grandma mode.

## Daily itineraries (exec-sum at the top of each day)

`WEEK_DATA.itineraries` holds a curated plan for EVERY day, mon–sun. This is
editorial: offer **2–3 options each** for morning and afternoon (the UI labels
them "pick one"), plus 2–3 evening options when real ones exist, and say why
in one punchy line each. Lead each slot with your strongest pick — order is
preserved. Anytime spots (splash pads, museums, ferries) are legitimate
options and the only way to fill thin weekdays. Schema:

```js
itineraries: {
  mon: {
    summary: "Bryant Park magic show at 10, splash or market run after nap.", // one line for the week-at-a-glance view
    picks: [ // 2-3 per slot, morning + afternoon required, no duplicate keys within a day
      { slot: "morning",   key: "<event slug>", title: "<event title>", note: "…" },
      { slot: "morning",   key: "…", title: "…", note: "…" },
      { slot: "afternoon", key: "…", title: "…", note: "…" },
      { slot: "afternoon", key: "…", title: "…", note: "…" },
      { slot: "evening",   key: "…", title: "…", note: "…" },  // evening = "if she's up for it"
    ]
  },
  // …tue–sun
}
```

- `key` is the event's slug: lowercased title, non-alphanumerics collapsed to
  `-`, trimmed, first 48 chars (same rule as app.js/validate.cjs `keyOf`).
- **THE NAP IS SACRED: Rayray sleeps 12–2 every day.** Morning picks must
  start before noon and wrap by ~11:45; afternoon picks start 2 PM or later
  (open-hours entries that run well past 2 are fine to slot as a post-nap
  drop-in); nothing may *start* between 12:00 and 14:00 unless it's drop-in
  hours running past 3:30. Evening picks are "if she's up for it" territory.
- Picks must actually happen on that day (`days` includes the day or `any`).
  Anytime spots are fair game — the UI auto-opens their unlock on tap.
- Notes stay self-sufficient (time, place, why) and honest about travel —
  weekend picks can lean grandma's-zone, weekday picks lean Union Square.
- The validator enforces all of the above; the UI renders a nap row between
  morning and afternoon automatically, so don't write the nap as a pick.

## Next-week preview

The site has a "🔭 Next week" tab so the family can plan ahead. Every Monday
refresh must ALSO produce a preview of the FOLLOWING Mon–Sun:

```js
nextWeek: {
  weekMonday: "2026-07-13",       // exactly weekMonday + 7 days
  weekLabel: "July 13–19, 2026",
  events: [ /* 10–40 DATED events only — same schema as events[] */ ],
  itineraries: { /* optional — if omitted the UI shows a "plans land Monday" note */ }
}
```

Rules:
- `nextWeek.events` holds only real dated events (`event: true`, real `days`)
  verified for the following week. Do NOT copy evergreen/anytime places or
  weekly-recurring series into it — the UI carries those over automatically
  (recurring carryovers get downgraded to a 🔍 medium-confidence chip until
  re-verified). Re-list a recurring series in nextWeek only when you verified
  its next-week details (or they changed — new performer, new time); when you
  do, the UI auto-suppresses the stale current-week carryover for that venue
  (venue-token match), so re-listing never double-lists.
- Research effort: lighter than the current week is fine (headliners, the
  free-outdoor-theater hunt, weekends covered) — next Monday's refresh gives
  that week the full treatment anyway.
- `days` in nextWeek entries refer to the FOLLOWING week's Mon–Sun.

## Verify locally

```sh
python3 -m http.server  # from the repo root
# open http://localhost:8000/rayray-big-weekend/
```

**MANDATORY: run `node rayray-big-weekend/validate.cjs` and fix every error
before deploying** — it checks the schema, coordinate bounds, start/times
agreement, URLs, duplicate slugs, and the daily itineraries (all 7 days
present, picks resolve to real events on the right day, nap rules).

Sanity-check: week label correct, TODAY badge on the right day, the list groups
under Morning/Afternoon/Evening/Anytime headers in start-time order, every entry
has a numbered pin on the map in the right place, and each card's Details link
works. When viewing today, events that already ended disappear from the list
and map (the count line says "N already wrapped up") and their itinerary
options gray out — that's intended, not missing data. The travel slider under
the base picker caps the list by minutes-from-base (maxed out = no cap). The
"🔭 Next week" tab appears only when nextWeek has events; it merges
nextWeek.events with automatic carryovers and shows a preview note instead of
the plan box when nextWeek.itineraries is absent. The UI is a single map+scrolling-list view (no cards mode); open-anytime
entries sit behind three staged unlocks at the end of the list — "☔ Rainy day"
(indoor: museums & indoor play), "🛝 Playgrounds & splash pads" (outdoor
`category:play`, sorted nearest-first), and "🧭 Destinations & ferries"
(gardens, boats, carousels, zoos) — derived from `outdoor` + `category`, so set
both accurately; the
hour-by-hour weather strip fills from Open-Meteo at view time and hides itself
if the fetch fails. Leaflet is vendored at `vendor/leaflet/` — no CDN needed;
map tiles come from openstreetmap.org at view time.

## Git

Work on branch `claude/toddler-activities-microsite-rhvwp8` while its PR is
open (update the same PR). If that PR has been merged, branch fresh from the
default branch as `rayray-big-weekend-update-<monday-date>`, push, and open a new
draft PR titled "Rayray Big Weekend — week of <Mon date>".

## Deploy

The site lives at https://rayray-big-weekend.vercel.app (its own Vercel
project, `rayray-big-weekend`, deploying this directory as the site root).
The owner has approved production deploys for this project. After pushing,
if `VERCEL_TOKEN` is set in the environment:

```sh
cd rayray-big-weekend
npx -y vercel link --yes --project rayray-big-weekend --token "$VERCEL_TOKEN"
npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Then confirm https://rayray-big-weekend.vercel.app serves the new weekLabel.
If `VERCEL_TOKEN` is not set, skip the deploy and say so — do not improvise.

## Weekly email

After deploying, create a Gmail DRAFT (the Gmail connector cannot send; if it
needs re-authorization, skip and note it) addressed to jorschneider@gmail.com
and athena.caoyue@gmail.com, subject "🎈 Rayray Big Weekend — week of
<Month Day>", containing the site link and a short day-by-day rundown of the
best dated events and free picks. Finish the run by summarizing the week's
highlights: best free events, outdoor theater finds, one-offs worth planning
around, and any grandma-zone weekend gems.

## Saturday re-verify (second routine)

A smaller Saturday-morning routine re-checks the CURRENT week.js in place (no
re-research): (1) verify every dated Sat/Sun event against its official page —
cancellations, time changes; (2) upgrade any medium/low-confidence entries by
verifying their hours/prices on the official visit pages; (3) check the weekend
forecast and note washouts; (4) if a correction kills or moves an itinerary
pick (cancelled show, big rain on an outdoor pick), swap that day's itinerary
to the next-best option. Apply corrections to week.js only, run the
validator, push, deploy, and push-notify a short "what changed" summary.
