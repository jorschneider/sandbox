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
| `cost` | string | "Free" or a price; the word "Free" drives the free filter |
| `travelMinutes` | number | door-to-door estimate from Union Square |
| `travelHow` | string | e.g. "L to Bedford Av + 5 min walk" |
| `toddlerNotes` | string | why it works for a 2-year-old (shade, strollers, duration, nap timing) |
| `url` | string | official page — real, working links only |
| `outdoor` | boolean | drives the ☀️/❄️ badge and outdoor filter |
| `confidence` | string | `high` = date verified; `medium`/`low` shows a "🔍 double-check" chip |
| `lat`, `lng` | numbers | venue coordinates for the map view (NYC: lat 40.64–40.82, lng −74.05 to −73.92) |
| `start` | string/null | earliest start time as 24h "HH:MM" (null for open-anytime places) — drives the "Starts 10 AM" badge, time color coding, and earliest-to-latest sort |
| `times` | array | subset of `["morning","afternoon","evening"]` or `["any"]` — must agree with `start` (before 12 = morning, 12–4:59 = afternoon, 5+ = evening) |
| `event` | boolean | `true` = a real dated happening (concert, show, storytime session, festival) — gets the "⭐ this week" chip, sorts first, and powers the "Real events only" filter. `false` = an open-anytime place. |

## Research rules

1. **Radius**: ~35 min by subway/walk/ferry from Union Square. Manhattan below
   ~86th St, DUMBO, Brooklyn Heights, Downtown Brooklyn, Williamsburg, north
   Park Slope, LIC, Governors Island. Nothing farther.
2. **Age 2 fit**: short or drop-in, daytime, stroller-friendly, no age minimums.
3. **Real events first**: the site exists to surface ACTUAL SCHEDULED EVENTS —
   concerts, puppet shows, storytime sessions, festivals with a date and start
   time. Hunt venue calendars directly (NYC Parks events, Lincoln Center, Bryant
   Park, Hudson River Park, Little Island, BRIC, NYPL/BPL branch calendars,
   Mommy Poppins day-by-day). Aim for 15+ dated events across the week, every
   day covered. Evergreen places (playgrounds, carousels, ferries, zoo) stay as
   the "anytime" tail — refresh their open/closed status, don't let them crowd
   out events.
4. **Mix**: every category represented; plenty of free options; in summer favor
   water play + shade, in winter favor indoor/heated options.
5. **Cards must be self-sufficient**: a parent plans from the card alone —
   never make them click through to figure out what/where/when. `when` carries
   the exact day + time window; `toddlerNotes` says concretely what you do
   there ("mask-making at the kids' lawn on 61st St, pet parade steps off
   2 PM"), not vibes. Umbrella festivals must be broken into their specific
   joinable sessions (one card per session or an explicit mini-schedule on the
   card) — a card that says "20+ venues, lots going on!" is a defect.
6. **Verify, don't vibe**: check dates against official venue pages / NYC Parks
   calendar / Mommy Poppins / Time Out Kids for the *correct year*. If an exact
   time can't be confirmed, keep the typical time and set `confidence` to
   `medium` or `low`. Never invent dates or URLs. Drop anything you can't
   corroborate at all.
7. Keep evergreen favorites (playgrounds, carousels, zoo, ferries) in the list
   every week — verify they're open (water features and carousels close
   seasonally or for repairs).

## Verify locally

```sh
python3 -m http.server  # from the repo root
# open http://localhost:8000/rayray-big-weekend/
```

Sanity-check: week label correct, TODAY badge on the right day, every card has
a working Details link, no category renders as "undefined", and the 🗺️ Map view
(the Cards/Map toggle, or #view=map) shows a pin per entry in the right place.
Leaflet is vendored at `vendor/leaflet/` — no CDN needed; map tiles come from
openstreetmap.org at view time.

## Git

Work on branch `claude/toddler-activities-microsite-rhvwp8` while its PR is
open (update the same PR). If that PR has been merged, branch fresh from the
default branch as `rayray-big-weekend-update-<monday-date>`, push, and open a new
draft PR titled "Rayray Big Weekend — week of <Mon date>".
