# Jordan & Athena Weeknights — weekly update contract

The site lives in `weeknights/` and is deployed to Vercel. It answers one
question on a weeknight: **what can each of them actually walk to and book
tonight?**

Two sides, same machinery:

| file | global | who | disciplines |
| --- | --- | --- | --- |
| `athena.js` | `window.ATHENA_DATA` | Athena | yoga, ballet, dance, pilates, barre |
| `jordan.js` | `window.JORDAN_DATA` | Jordan | grappling, striking, mma, soccer, chess, pingpong, run |

`app.js` renders whichever side the hash selects (`#mode=jordan`, default
Athena). `index.html` and `styles.css` are shared.

---

## The two radius rules

Both are enforced by `validate.cjs`, and neither is a soft preference — they
are what makes the site usable on a Tuesday at 6:40pm.

**1. Martial arts stay inside a 15-minute WALK.** Any entry with category
`grappling`, `striking` or `mma` must sit at a venue with `walkMinutes <= 15`.
This was the original ask and it does not bend. The header comment in
`jordan.js` names the gyms that keep getting suggested and keep failing the
test — Renzo Gracie (W 30th), Five Points (148 Lafayette), Radical MMA
(W 29th), 10th Planet (W 43rd) — so nobody re-adds them.

**2. Everything else gets 25 minutes door-to-door.** Soccer, chess, ping pong
and running may be up to `travelMinutes <= 25`. Manhattan has no soccer field
inside a 15-minute walk of Union Square, so a strict cap there would simply
mean no soccer. Athena's side is entirely walkable and stays under 15.

Venues reached better by train or bus than on foot carry:

- `walkMinutes` — the honest walk, however long
- `travelMinutes` — the best realistic door-to-door time (what the slider uses)
- `travelHow` — the actual route, e.g. `"16 min — 6 train from Union Sq to
  Canal St, then a 5-minute walk"`

`travelMinutes` must be faster than `walkMinutes`, or drop it. If a genuinely
exceptional venue sits past its cap, ask Jordan. Do not quietly relax either
rule.

---

## What to change each week

Refresh **both** files for the current Mon–Fri:

1. `weekMonday` → the most recent Monday **on or before today**. Run `date`
   first. Never skip ahead to next Monday.
2. `weekLabel` → e.g. `"Sep 7–11, 2026"`.
3. `updated` → today's date, long form.
4. `events[]` → re-verify times, prices and links; convert `timeVerified:false`
   entries into pinned times wherever the booking page will tell you.
5. `itineraries` → one entry per weeknight, 2–4 picks each, refreshed so the
   picks match what is actually on the schedule that week.

The `venues` map changes rarely. Addresses, coordinates and walk times are
stable; only touch them if a studio moves, closes, or changes hours.

---

## `timeVerified` is the honesty flag

Most studios near Union Square publish their timetable through a JavaScript
booking widget (Momence for ISHTA, MindBody for Peridance, Zen Planner for
Paxibellum, WellnessLiving for Anderson's). Those widgets are not readable from
a plain fetch.

So each class carries `timeVerified`:

- `true` — the exact recurring slot is confirmed on an official page. The card
  shows the time plainly.
- `false` — venue, discipline, price and booking link are confirmed, but the
  slot rotates. The card shows a 🔍 and links straight to booking.

**Never set `timeVerified: true` on a time you did not read on an official
page.** A wrong pinned time is worse than an honest 🔍 — it sends someone
across town for a class that isn't running.

Turning 🔍 entries into pinned times is the main week-to-week value this
routine adds. `health.cjs` fails if a side has zero pinned times.

---

## Research rules

- Verify on the **venue's own page** first. Yelp and ClassPass are useful for
  finding a place and cross-checking hours; they are not sources for class
  times.
- Confirm the venue is **still open**. Jivamukti's Union Square studio at 841
  Broadway is closed — it was excluded for that reason, and that kind of check
  is part of the weekly pass.
- Prices change. Re-read the pricing page rather than carrying `cost` forward.
- Intro offers are the most valuable thing on the site for Jordan (four of six
  gyms offer a free first class). Re-confirm they still stand.
- `notes` should tell them something they could not get from the studio's own
  marketing: what the room is actually like, who it suits, what to wear, the
  practical catch. Thin notes trigger a validator warning.

### Standing sources

**Athena** — ISHTA Yoga (`ishtayoga.com/schedule`, Momence),
Peridance (`peridance.com/open-classes`, MindBody),
Gibney (`gibneydance.org/class-schedule/`),
Pure Barre Union Square, Om Factory.

**Jordan, martial arts** — Anderson's Martial Arts (`andersonsmartialarts.com/schedule/`),
Mushin MMA (`mushinmma.org/schedule`), Paxibellum (`paxibellum.com/class-schedule/`,
Zen Planner), Unity Jiu Jitsu (`unityjiujitsu.com/schedule/`),
Training Zone NYC Gramercy (Mon & Wed only — the Manhattan location is closed
Tue/Thu/Fri/Sun, which is why it appears on just two nights),
Overthrow Boxing.

**Jordan, everything else** — GoodRec (`goodrec.com/pickup-soccer/new-york-city`):
individual game times are published only in the GoodRec app, so soccer entries
stay `timeVerified:false` by design; verify the *facility* is still hosting
games. SPIN Flatiron (`wearespin.com/location/new-york-flatiron/`) — re-check
the walk-in rates and the Tuesday `$9 after 9pm` deal, which is the single best
value on Jordan's side. Marshall Chess Club (`marshallchessclub.org/calendar`)
— the calendar lists the night's rated event and entry fee; pin one if you can.
TMIRCE (`meetup.com/nyc-informal-running-club-home-of-tmirce-nyc/`) — confirm
Tempo Thursdays still leaves 96 Avenue C at 7pm.

### Watch list (excluded for now, re-check each week)

- **CityPickle Union Square** — two pickleball courts on the North Plaza at E
  17th St, $5 open play, i.e. sixty seconds from the front door. Currently
  **closed for the season** with a 2026 reopening TBD. The moment it reopens it
  is the single best-located entry on the entire site — add it.
- **East River Park** — soccer fields and track are mid-reconstruction under
  the East Side Coastal Resiliency project (the stretch south of Stanton St is
  closed; completion slated for 2026). Deliberately excluded so nobody is sent
  to a fenced-off field. Re-check before adding.
- **Climbing** — there is no bouldering gym within 25 minutes of Union Square.
  The nearest options (Steep Rock on Lexington at 97th, Chelsea Piers, Movement
  Harlem) all fail the radius. Don't add one to be thorough.

---

## Itineraries

One per weeknight, in both files. Each has:

- `summary` — one or two sentences on what makes that night different. Say the
  real constraint ("Om Factory runs to 10:30pm", "the only two nights Training
  Zone's Manhattan location is open"), not filler.
- `picks` — 2 to 4 options, each `{ key, note }`. `key` is the slug of a class
  title; the class must actually run that night or validation fails. The `note`
  is why you'd pick this one tonight.

Slugs: lowercase the title, replace runs of non-alphanumerics with `-`, trim,
truncate to 48 chars.

---

## Verify before deploying

```sh
node weeknights/validate.cjs   # schema + the 15-minute rule. Must pass.
node weeknights/health.cjs     # freshness + coverage. Must exit 0.
python3 -m http.server 8000    # then open http://localhost:8000/weeknights/
```

`validate.cjs` checks: both sides on the same week, venues resolve, evening
start times (16:00+), Mon–Fri only, unique slugs, itineraries resolve to
sessions that run that night, and both radius rules.

`health.cjs` checks: the week is current, every weeknight has 2+ options per
person, tonight specifically is not empty, both radius rules hold, and at least
one entry per side has a pinned time. Exit 1 = act, exit 2 = could not check.

Map tiles come from `tile.openstreetmap.org`, which needs no API key. Do not
switch to CARTO's basemaps — they now require a key and render "api key
required" across the whole map without one.

---

## Git & deploy

Work on `claude/ray-ray-evening-activities-rd1hb6` in `jorschneider/sandbox`.

```sh
git add weeknights && git commit && git push -u origin claude/ray-ray-evening-activities-rd1hb6
cd weeknights && npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Then re-run `node weeknights/health.cjs --live` (set `WEEKNIGHTS_URL` if the
production domain differs). A run is not finished until the live check exits 0
— "I made changes" is not success.

---

## Weekly routine (Monday)

1. `date` → compute this Monday. Anchor everything to it.
2. `node weeknights/health.cjs --live` → this tells you what is broken.
3. Re-verify every venue's evening schedule on its official page. Pin what you
   can; leave honest 🔍 on what you cannot.
4. Rebuild the five itineraries per side against what is actually running.
5. `node weeknights/validate.cjs` → must pass.
6. Commit, push, deploy, re-run `health.cjs --live` until it exits 0.
7. Message Jordan **only** if you could not get it green, or if something
   genuinely notable changed (a gym closed, a studio dropped its beginner
   class). A clean refresh needs no announcement.
