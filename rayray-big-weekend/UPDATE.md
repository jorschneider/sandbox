# Rayray Big Weekend — Monday update contract

This microsite lists toddler-friendly (age 2) activities within ~35 minutes
door-to-door of Union Square, Manhattan (home base: 112 East 19th Street).
It must be refreshed **every Monday morning** for the new week (Monday–Sunday).

## What to change

Only `week.js`. Do not restructure `index.html`, `app.js`, or `styles.css`
unless something is broken — the design is settled.

`week.js` sets `window.WEEK_DATA`:

```js
window.WEEK_DATA = {
  weekLabel: "July 6–12, 2026",   // human label for the Mon–Sun week
  weekMonday: "2026-07-06",       // ISO date of that Monday (drives TODAY badge)
  updated: "July 10, 2026",       // date the data was refreshed
  itineraries: { /* one exec-sum plan per day, see "Daily itineraries" below */ },
  events: [ /* 20–45 entries, see schema below */ ]
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
   offer morning, afternoon, and evening options.
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

## Daily itineraries (exec-sum at the top of each day)

`WEEK_DATA.itineraries` holds a curated plan for EVERY day, mon–sun. This is
editorial: pick the single best morning / afternoon / (optional) evening from
that day's entries and say why in one punchy line each. Schema:

```js
itineraries: {
  mon: {
    summary: "Bryant Park magic show at 10, greenmarket snack run after nap.", // one line for the week-at-a-glance view
    picks: [
      { slot: "morning",   key: "<event slug>", title: "<event title>", note: "…" },
      { slot: "afternoon", key: "…", title: "…", note: "…" },
      { slot: "evening",   key: "…", title: "…", note: "…" },  // optional — only when there's a real evening option
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
works. The UI is a single map+scrolling-list view (no cards mode); open-anytime
entries sit behind two staged unlocks at the end of the list — "☔ Rainy day"
(indoor entries: museums & indoor play) then "🧭 Destination playgrounds &
ferries" (outdoor spots plus carousel/ferry rides) — derived from the outdoor
flag, so set it accurately; the
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
