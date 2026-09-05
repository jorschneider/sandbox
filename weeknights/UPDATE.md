# Jordan & Athena Weeknights — weekly update contract

The site lives in `weeknights/` and is deployed to Vercel. It answers one
question on a weeknight: **what can each of them actually get to and book
tonight?**

Two sides, same machinery:

| file | global | who | disciplines |
| --- | --- | --- | --- |
| `athena.js` | `window.ATHENA_DATA` | Athena | yoga, ballet, dance, pilates, barre |
| `jordan.js` | `window.JORDAN_DATA` | Jordan | grappling, striking, mma, soccer, run |
| `slots.js` | `window.SLOTS` | both | **generated** — live class slots from the booking platforms |

`app.js` renders whichever side the hash selects (`#mode=jordan`, default
Athena). `index.html` and `styles.css` are shared.

---

## Two files own the truth, and they are different kinds of truth

**The curated files (`athena.js`, `jordan.js`) are written by hand.** They hold
the venues, the notes, the itineraries, the teacher roster, the radius rules.
They change when a human decides something.

**`slots.js` is generated.** `fetch-schedules.cjs` pulls the real weekly class
schedule from the studios' own booking platforms and writes it there. Never
hand-edit it. It is the reason the site is more than a directory.

```sh
node weeknights/fetch-schedules.cjs                 # week of the most recent Monday
node weeknights/fetch-schedules.cjs --monday 2026-09-07
node weeknights/fetch-schedules.cjs --dry           # print, don't write
```

Sources it reads, all public and unauthenticated:

| venue | platform | how |
| --- | --- | --- |
| ISHTA Yoga | Momence, host 45870 | the same `readonly-api.momence.com` endpoint the studio's embedded widget calls — full sessions with teacher, price, spots and a per-class booking link |
| Paxibellum | Zen Planner | public `calendar.cfm` month grid |
| Unity Jiu Jitsu | Zen Planner | public `calendar.cfm` week list, with teachers |

Zen Planner shows start times only, so those slots get a 60-minute end. When a
calendar doesn't show every date of the target week (a month grid starting on a
Tuesday, say), the fetcher fills the gap from the weekly pattern and marks those
rows `pattern:true` — these gyms run identical grids week to week.

**Not yet fetched:** Peridance, Power Pilates and Gibney use MindBody, which
blocks non-browser readers (403 on the classic schedule, and the public search
API ignores location filters). Their entries keep curated times and a 🔍.
Anderson's runs a bot challenge. Mushin's Squarespace page has no static
schedule. GoodRec publishes game times only inside its app. If one of these
opens a readable feed, add it to `SOURCES` in the fetcher.

---

## How a curated entry opts into live times: `match`

An event carries `match: ["Exact Class Name", ...]` — the class names as they
appear on the booking platform, matched case-insensitively and **exactly**.
At render time the app finds slots at that event's venue with a matching name
and, when it finds any:

- `days`, per-night `start`/`end`, and the teacher come from the slots
- the card is marked verified (no 🔍), links straight to the class's booking
  page, and shows spots left when the platform reports it
- the nights line shows each night's real start ("Mon 6:15pm · Wed 6:15pm ·
  Thu 4:30pm")

Without slots the entry falls back to its curated `days`/`start`/`end`, so the
page always works. `validate.cjs` **fails** if a `match` hits nothing in
`slots.js` — that means the studio renamed or dropped the class, and the
curated entry needs a human look. Class-name drift is the main thing the weekly
run should catch.

ISHTA's seven weeknight-evening formats in `athena.js` are the real ones on its
Momence schedule, verified across three consecutive weeks. Earlier guesses
(ISHTA Basics, Vinyasa/Power, Community) don't run on weeknight evenings.

---

## The radius rules

Both enforced by `validate.cjs`. Neither is a soft preference.

**1. Martial arts stay inside a 15-minute WALK.** Any entry with category
`grappling`, `striking` or `mma` must sit at a venue with `walkMinutes <= 15`.
The original ask; it does not bend. The header comment in `jordan.js` names the
gyms that keep getting suggested and keep failing — Renzo Gracie, Five Points,
Radical MMA, 10th Planet — so nobody re-adds them.

**2. Door-to-door caps by side: Athena 20 minutes, Jordan 25.** Manhattan has no
soccer field inside a 15-minute walk of Union Square; Athena's cap was widened
to reach a reformer studio and Broadway Dance Center. Venues reached by train
carry `walkMinutes` (the honest walk), `travelMinutes` (best door-to-door, what
the slider uses) and `travelHow` (the actual route). `travelMinutes` must beat
`walkMinutes` or drop it. If a genuinely exceptional venue sits past its cap,
ask Jordan. Do not quietly relax either rule.

---

## Lists sort by time; ISHTA is starred

Every list — and each night's plan — sorts by **start time, earliest first**,
so the scroll reads like the evening. Jordan asked for this explicitly after an
earlier version put ISHTA at the top; do not reintroduce favourite-first
sorting. Same start time: nearer venue wins, then the favourite as a tie-break.

`athena.js` carries `"favoriteVenue": "ISHTA Yoga"`, which now only drives the
★ and accent edge on ISHTA's cards. **Do not drop or change this field**;
`validate.cjs` fails the build if it isn't `ISHTA Yoga`. Give ISHTA the most
research effort of any venue on her side.

---

## Cut — do not re-add

Jordan is **not interested in ping pong or chess**. SPIN Flatiron and the
Marshall Chess Club were both on the site and were removed at his request.
They pass the radius test, which is exactly why a future pass will be tempted.
`validate.cjs` rejects the `pingpong` and `chess` categories outright.

---

## Tonight is real

On today's tab the app hides sessions whose start time has passed (a chip
reveals them, greyed), shows a countdown on upcoming ones, and marks a session
"on now" between its start and end. Nothing to maintain here — it runs off the
device clock and the slot times — but it is why pinned times matter: a wrong
time now actively misleads.

Outdoor venues carry `"outdoor": true` (the four GoodRec fields, the run club).
The app pulls an hour-by-hour forecast from Open-Meteo (keyless) and, when the
evening looks wet, flags those cards and shows the strip. Indoor venues never
show it.

---

## Research rules

- Verify on the **venue's own page** first. Yelp and ClassPass are useful for
  finding a place and cross-checking hours; they are not sources for times.
- Confirm the venue is **still open**. Jivamukti's Union Square studio (841
  Broadway), Yoga Vida Union Square (99 University Pl) and Sky Ting Tribeca are
  all closed — each was excluded for that reason.
- Prices change. Re-read the pricing page rather than carrying `cost` forward.
- Intro offers are the most valuable thing on the site for Jordan (four of six
  gyms offer a free first class; Unity's is free for tri-state residents).
- `notes` should tell them something the studio's own marketing wouldn't.
- **ISHTA teacher roster:** `athena.js` has a `teachers` block. Re-read
  `ishtayoga.com/our-instructors` weekly and reconcile it with who the live
  slots say is actually teaching evenings. Keep the honest note that ISHTA's
  lineage page places Alan Finger and Sarah Platt-Finger in Florida while Mona
  Anand is the Yogiraj in New York — and per the live schedule teaches Tuesday
  5pm herself.

### Standing sources

**Athena** — ISHTA (fetched), Peridance (`peridance.com/open-classes`, MindBody),
Gibney (`gibneydance.org/class-schedule/`), Pure Barre Union Square, Om Factory,
Power Pilates Flatiron (`powerpilates.com/flatiron/`), Broadway Dance Center
(`broadwaydancecenter.com/schedule` — blocks bots; pricing unverified).

**Jordan** — Paxibellum and Unity (fetched); Anderson's Martial Arts, Mushin
MMA, Training Zone Gramercy (Mon & Wed only — Manhattan location is closed
Tue/Thu/Fri/Sun), Overthrow Boxing; GoodRec (`goodrec.com/pickup-soccer/new-york-city`,
game times only in the app — verify the facility still hosts games); TMIRCE
(confirm Tempo Thursdays still leaves 96 Avenue C at 7pm).

### Watch list (excluded for now, re-check each week)

- **CityPickle Union Square** — $5 pickleball on the North Plaza at E 17th St,
  sixty seconds from the door. Closed for the season, 2026 reopening TBD. The
  moment it reopens it is the best-located entry on the site — add it.
- **East River Park** — fields mid-reconstruction (East Side Coastal
  Resiliency; the stretch south of Stanton St is closed). Excluded so nobody
  is sent to a fence.
- **Climbing** — nothing within 25 minutes. Don't add one to be thorough.

---

## Itineraries

One per weeknight, in both files: `summary` (the real constraint for that
night, not filler) and 2–4 `picks` of `{ key, note }`. `key` is a class slug —
lowercase the title, runs of non-alphanumerics to `-`, trim, 48 chars — and the
class must actually run that night or validation fails.

---

## Verify before deploying

```sh
node weeknights/fetch-schedules.cjs   # refresh slots.js for this Monday
node weeknights/validate.cjs          # schema, radius rules, match hits. Must pass.
node weeknights/health.cjs            # freshness, coverage, slots, links. Exit 0.
python3 -m http.server 8000           # then open http://localhost:8000/weeknights/
```

`health.cjs` checks: the data week and `slots.js` are both current, every
weeknight has 2+ options per person, tonight isn't empty, both radius rules
hold, each fetcher source produced slots, and **every booking URL is alive**
(404/410/5xx/DNS fail the run; 403/405/429 mean bot-blocked-but-alive and only
warn — ClassPass, Pure Barre, BDC and Sky Ting all do this). Pass `--no-links`
to skip the link pass, `--live` to check the deployed site.

Map tiles come from `tile.openstreetmap.org` — keyless. Do not switch to
CARTO's basemaps; they now require a key and render "api key required".

---

## Git & deploy

Work on `claude/ray-ray-evening-activities-rd1hb6` in `jorschneider/sandbox`.

```sh
git add weeknights && git commit && git push -u origin claude/ray-ray-evening-activities-rd1hb6
cd weeknights && npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Then `node weeknights/health.cjs --live` until it exits 0.

---

## The Monday email

After a clean deploy, send **one** email to both of them —
`athena.caoyue@gmail.com` and `jordan@chinatalk.media` — via Gmail:

- Subject: `Weeknights — week of <Mon date>` (e.g. `Weeknights — week of Sep 7`)
- Two short sections, **Athena** then **Jordan**. For each night Mon–Fri, one
  line: the top pick with its real time and teacher where known, and the
  booking link. ISHTA leads Athena's every night it runs.
- One line at the top if anything changed (a class dropped, a teacher moved, a
  venue closed, CityPickle reopened). Otherwise skip it.
- End with the site link. Plain, short, no marketing voice. It should read like
  a text from a friend who checked the schedules.

---

## Weekly routine (Monday)

1. `date` → compute this Monday. Anchor everything to it.
2. `node weeknights/health.cjs --live` → what is broken.
3. `node weeknights/fetch-schedules.cjs` → refresh slots.js. Read its output:
   every source should report slots; a source with 0 broke and needs a look.
4. `node weeknights/validate.cjs` → a `match` that hits nothing means a class
   was renamed or dropped; fix the curated entry, don't silence the check.
5. Re-verify the non-fetched venues on their official pages. Reconcile the
   ISHTA teacher roster with who the slots say is teaching.
6. Rebuild the ten itineraries against what is actually running.
7. Bump `weekMonday`, `weekLabel`, `updated` in both files.
8. Validate, commit, push, deploy, `health.cjs --live` until green.
9. Send the Monday email.
10. Message Jordan **only** if you could not get it green or something notable
    changed. A clean refresh needs no announcement beyond the email.
