# Jordan & Athena Weeknights — weekly update contract

The site lives in `weeknights/` and is deployed to Vercel. It answers one
question on a weeknight: **what can each of them actually walk to and book
tonight?**

Two sides, same machinery:

| file | global | who | disciplines |
| --- | --- | --- | --- |
| `athena.js` | `window.ATHENA_DATA` | Athena | yoga, ballet, dance, pilates, barre |
| `jordan.js` | `window.JORDAN_DATA` | Jordan | grappling, striking, mma |

`app.js` renders whichever side the hash selects (`#mode=jordan`, default
Athena). `index.html` and `styles.css` are shared.

---

## The one rule that is never bent

**Everything on this site is inside a 15-minute walk of Union Square.**

`validate.cjs` fails the build if any venue has `walkMinutes > 15`. This is not
a soft preference — it is the entire premise, and it is what makes the site
usable on a Tuesday at 6:40pm. Gyms and studios that are excellent but too far
are deliberately absent, and the header comment in `jordan.js` names the ones
that keep getting suggested (Renzo Gracie on W 30th, Five Points on Lafayette,
Radical MMA on W 29th, 10th Planet on W 43rd) so nobody re-adds them.

If a genuinely exceptional venue sits at 16–18 minutes, ask Jordan before
adding it. Do not quietly relax the cap.

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

**Jordan** — Anderson's Martial Arts (`andersonsmartialarts.com/schedule/`),
Mushin MMA (`mushinmma.org/schedule`), Paxibellum (`paxibellum.com/class-schedule/`,
Zen Planner), Unity Jiu Jitsu (`unityjiujitsu.com/schedule/`),
Training Zone NYC Gramercy (Mon & Wed only — the Manhattan location is closed
Tue/Thu/Fri/Sun, which is why it appears on just two nights),
Overthrow Boxing.

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
classes that run that night, and the 15-minute walk cap.

`health.cjs` checks: the week is current, every weeknight has 2+ options per
person, tonight specifically is not empty, and at least one class per side has
a pinned time. Exit 1 = act, exit 2 = could not check.

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
