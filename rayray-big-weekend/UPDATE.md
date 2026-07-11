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
| `event` | boolean | `true` = a real dated happening (concert, show, storytime session, festival) — gets the "⭐ this week" chip, sorts first, and powers the "Real events only" filter. `false` = an open-anytime place. |

## Research rules

1. **Radius**: ~35 min by subway/walk/ferry from Union Square. Manhattan below
   ~86th St, DUMBO, Brooklyn Heights, Downtown Brooklyn, Williamsburg, north
   Park Slope, LIC, Governors Island. Nothing farther.
2. **Age 2 fit**: short or drop-in, stroller-friendly, no age minimums.
   **Cover the whole day, every day**: weekday daytime events AND weekday
   evenings (post-work outings) both matter — aim for each day of the week to
   offer morning, afternoon, and evening options.
3. **No plain storytimes**: skip ordinary library/bookstore read-alouds — too
   tame. Story-adjacent things earn a slot only as part of something bigger
   (a museum family day, a puppet show, an author event with real extras).
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
   Boomerang, Piper Theatre at the Old Stone House), Little Island's
   amphitheater, and outdoor puppet stages (PuppetMobile, Swedish Cottage
   lawn events). Outdoor evening theater is prime toddler material — lawn
   seating, leave anytime — and pairs with the weekday 5 PM+ rule.
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

## Verify locally

```sh
python3 -m http.server  # from the repo root
# open http://localhost:8000/rayray-big-weekend/
```

Sanity-check: week label correct, TODAY badge on the right day, the list groups
under Morning/Afternoon/Evening/Anytime headers in start-time order, every entry
has a numbered pin on the map in the right place, and each card's Details link
works. The UI is a single map+scrolling-list view (no cards mode); the
hour-by-hour weather strip fills from Open-Meteo at view time and hides itself
if the fetch fails. Leaflet is vendored at `vendor/leaflet/` — no CDN needed;
map tiles come from openstreetmap.org at view time.

## Git

Work on branch `claude/toddler-activities-microsite-rhvwp8` while its PR is
open (update the same PR). If that PR has been merged, branch fresh from the
default branch as `rayray-big-weekend-update-<monday-date>`, push, and open a new
draft PR titled "Rayray Big Weekend — week of <Mon date>".
