# Rayray Big Weekend — Monday update contract

This microsite lists toddler-friendly (age 2) activities within ~35 minutes
door-to-door of Union Square, Manhattan (home base: 112 East 19th Street).
It must be refreshed **every Monday morning** for the new week (Monday–Sunday).

## What to change

Only `week.js` (kid mode) and `date.js` (Date Night mode — see its own section
below). Do not restructure `index.html`, `app.js`, or `styles.css` unless
something is broken — the design is settled.

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
| `toddlerNotes` | string | why it works for a 2-year-old (shade, strollers, duration, timing) |
| `url` | string | official page — real, working links only |
| `outdoor` | boolean | drives the ☀️/❄️ badge and outdoor filter |
| `confidence` | string | `high` = date verified; `medium`/`low` shows a "🔍 double-check" chip |
| `lat`, `lng` | numbers | venue coordinates for the map view (NYC: lat 40.64–40.82, lng −74.05 to −73.92) |
| `start` | string/null | earliest start time as 24h "HH:MM" (null for open-anytime places) — drives the "Starts 10 AM" badge, time color coding, and earliest-to-latest sort |
| `times` | array | subset of `["morning","afternoon","evening"]` or `["any"]` — must agree with `start` (before 12 = morning, 12–4:59 = afternoon, 5+ = evening) |
| `end` | string/null | end time "HH:MM" parsed from the schedule range where known; drives the "ended today" fade (fallback: start + 2h) |
| `cpwOnly` | boolean | `true` = only reachable from Grandma's base (beyond ~35 min of Union Sq); hidden in Union Sq mode |
| `event` | boolean | `true` = a real dated happening (concert, show, storytime session, festival) — gets the "⭐ this week" chip, sorts first, and powers the "Real events only" filter. `false` = an open-anytime place. |

## The health check is the contract (`health.cjs`)

**`node rayray-big-weekend/health.cjs` is the single source of truth for
"is this site OK right now?"** Run it at the START and END of every routine.

```sh
node rayray-big-weekend/health.cjs          # local repo files
node rayray-big-weekend/health.cjs --live   # what the deployed site serves
```

Exit 0 = healthy. Exit 1 = ACTION NEEDED. Exit 2 = couldn't check (also act).

It measures **what Jordan actually sees in the default view** — every day
capped at 35 minutes by transit, already-ended events hidden — not the raw
event count. That distinction matters: on
Thursday July 30, 2026 `week.js` held 10 dated events and looked non-empty,
while the screen showed one 8 PM play. It checks:

1. **Freshness** — `weekMonday` equals the current Monday (not stale, not
   jumped ahead), for BOTH `week.js` and `date.js`.
2. **Visible coverage** — today plus the next 3 days each have at least one
   visible event in every remaining day-part (kid: morning/afternoon/evening;
   date mode: afternoon/evening, since it is evening-led by design).
3. **Look-ahead** — the next-week preview holds 8+ events.

**A run is not finished until `--live` exits 0.** "The routine fired" is not
success; a green health check against the deployed site is. On July 27, 2026
the Monday routine fired, silently did nothing, and left the site a week
stale — because nothing verified the outcome. Never report success without
pasting the health-check output.

## Start every run by syncing from live (`sync-from-live.cjs`)

Production is what Jordan sees; the repo copy is only useful if it matches it.
Between Aug 3 and Sep 17, 2026 thirteen routine runs deployed correct data but
their `git push` never landed, so the branch on GitHub fell six weeks behind
the site and every fresh session started from stale July data. So the FIRST
command of every routine, right after checkout and before `health.cjs`, is:

```sh
node rayray-big-weekend/sync-from-live.cjs          # replaces repo files that are behind live
node rayray-big-weekend/sync-from-live.cjs --check  # report only; exit 1 if the repo is behind
```

It fetches the live `week.js` and `date.js` and replaces the repo copy of any
file that is behind (later week, later `updated`, or same week and date but
different content). It never touches a file when live is unreachable or fails
to parse (exit 2), and never downgrades a repo copy that is AHEAD of live (a
push that landed without a deploy — just deploy it). If it replaced anything:
run the validator, then **commit those files before doing anything else**
(message: "Sync repo to live <weekLabel>") and push if this session is able
to. No deploy is needed for them — production already serves them.

## Monday procedure (do this in order)

The site must NEVER be left showing a past week — **and never jump AHEAD of the
current week either.** Work in this order so even a partial run leaves it right:

0. **Sync from live first.** `node rayray-big-weekend/sync-from-live.cjs` (see
   above); validate and commit anything it replaced. Only then continue.
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
   Space Just Kidding, Bargemusic, free atrium series, and Arts for Art’s
   **InGardens Festival** — free weekend jazz with 1:30 PM kids’ music workshops
   in LES/East Village community gardens every Sat/Sun Sept–mid-Oct;
   schedule at artsforart.org/ingardens-2026 and @artsforart on Instagram).
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

## Source checklist — fetch EVERY one, EVERY research run

Why this exists: on Sep 19, 2026 the site missed a free 1:30 PM kids' music
workshop at Children's Magical Garden (Arts for Art's InGardens Festival)
because no beat covered small community organizations. A same-day sweep of
the classes below found about forty more toddler-fit events for the same two
weeks. The research agents must fetch each URL here in addition to the beats
above and report what they found, even when the answer is "nothing this
week". A source that cannot be fetched is named in the run summary, never
silently skipped.

**Community gardens, settlement houses and small arts orgs (LES / East Village / Chinatown)**
- LUNGS: Harvest Arts Festival mid/late Sept (50+ free events in ~30 gardens,
  incl. a Kids Day) plus year-round garden events — https://lungsnyc.org/
  (2026 schedule: /harvest-arts-festival-2026-schedule/); IG @lungsnyc.
- Arts for Art InGardens Festival: Sat/Sun Sept–mid-Oct, 1:30 PM kids' music
  workshops in Sept at Children's Magical Garden, then First Street Green —
  https://www.artsforart.org/ingardens-2026/; IG @artsforart.
- Elizabeth Street Garden: equinox/solstice parties with face painting, Live
  Music Sundays 5–7 — https://www.elizabethstreetgarden.com/calendar
  (append `?format=json` for a machine-readable feed).
- 6BC Botanical Garden: free weekend concerts; the live data is the embedded
  Google Calendar — https://www.6bcgarden.org/events-calendar.html.
- Sara D. Roosevelt Park Coalition / M'Finda Kalunga Garden (sandbox; Arts in
  the Garden) — https://sdrpc.mkgarden.org/category/events/.
- Jefferson Market Garden (Saturday 10:30 kids' flower crafts, concerts; the
  web calendar is stale, Instagram is the truth) —
  https://www.jeffersonmarketgarden.org/calendar; IG @jeffersonmarketgarden.
- NYC Parks GreenThumb garden events — https://www.nycgovparks.org/events/greenthumb.
- Abrons Arts Center / Henry Street Settlement: free Fall Festival mid-Oct
  with "The Garden", a sensory show for ages 3–5; family events sit inside an
  adult calendar — https://www.abronsartscenter.org/events.
- 14th Street Y Jewish Life family holiday events (sukkah dinners, Purim) —
  https://www.14streety.org/jewish-life/upcoming-jewish-life-events/.
- La MaMa Kids: monthly, some shows built for 6–36 months (ELEMENTARY) —
  https://lamama.org/la-mama-kids/.
- Loisaida Center — https://loisaida.org/events/. Think!Chinatown (Chinatown
  Arts Festival all October, Mid-Autumn events; Instagram-first) —
  https://www.thinkchinatown.org/happenings.

**Chinese cultural programming (Mid-Autumn and Lunar New Year matter a lot)**
- Museum of Chinese in America family festivals (Mid-Autumn late Sept, Lunar
  New Year; under 5 free) — https://www.mocanyc.org/calendar/.
- China Institute family festivals (Mid-Autumn, LNY, Dragon Boat) and the
  Mandarin Munchkins ages 1–2 class — https://chinainstitute.org/upcoming-events/
  (blocks fetchers: use a browser user agent or the Eventbrite organizer page).
- Welcome to Chinatown Mid-Autumn Fest (multi-day at Gotham Park, early Oct,
  lantern painting; IG @welcome.to.chinatown) — https://welcometochinatown.com/events.
- Yu & Me Books kids' author events — https://yuandmebooks.com/pages/events-at-yu-me-books.
  Chatham Square NYPL Mandarin–English family storytime (Mon 10:30/11:30) is
  in the NYPL beat.

**Waterfront, park conservancies, BIDs and state parks**
- Governors Island (page is JS-rendered; use the JSON feed) —
  https://www.govisland.com/things-to-do.json — org-in-residence workshops
  most weekends through Oct 31, Pumpkin Point late Oct; ferry from 10 South
  St, free before 11 AM on weekends, under 12 free.
- Washington Square Park Conservancy (NYPL Storytime Under the Trees Tue 11,
  Art in the Park Wed 3–5, Park Open Studio Thu/Fri/Sat 1–3 in Oct; client-
  rendered calendar) — https://www.washingtonsqpark.org/calendar; IG @washingtonsquarepk.
- Madison Square Park Conservancy (home turf) —
  https://madisonsquarepark.org/community/calendar/; IG @madsqparknyc.
- Hudson Square BID "Pause in the Plaza" (Tue 12–1:30 craft table + jazz,
  Sept–Oct) — https://hudsonsquarebid.org/neighborhood/events/.
- South Street Seaport Museum (monthly family activity, periodic free Family
  Days) — https://southstreetseaportmuseum.org/visit/programs_events/; The
  Seaport / Pier 17 — https://theseaport.nyc/events/.
- NY State Parks NYC region (Marsha P. Johnson SP "Tot Time" Thu 10–11 through
  Oct; Gantry Plaza) — https://parks.ny.gov/visit/events.
- Hunters Point Parks Conservancy (Queens Landing open houses, Halloween on
  the Waterfront late Oct) — https://hunterspointparks.org/events/.
- Fort Greene Park Conservancy (Storytime in the Park Wed 11 through mid-Oct,
  Halloween Fest late Oct) — https://www.fortgreenepark.org/calendar.
- Friends of Washington Market Park, Tribeca (toddler Music in the Playground
  Tuesdays, Halloween parade late Oct) — https://www.washingtonmarketpark.org/events-at-the-park/.
- Friends of McGolrick Park (PuppetMobile, McGhoulrick) — https://mcgolrick.org/events;
  Town Square Greenpoint Children's Halloween Parade (Eventbrite organizer
  "Town Square BK"); Brooklyn Heights Association Promenade parade —
  https://thebha.org/events/; Old Stone House "Sing with Suzi in the Park" —
  https://theoldstonehouse.org/events/; Culture Lab LIC MusiCraftory toddler
  music-and-craft (Humanitix) — https://www.culturelablic.org/.
- Riverside Park and Central Park Conservancies (weekend Grandma zone; JSON
  feeds) — https://riversideparknyc.org/events/,
  https://www.centralparknyc.org/calendar.json?page=1.
- NYC Parks rec-center tot programs (Tiny Tots at Alfred E. Smith Rec Center
  Tue/Fri 11; membership $150/yr, under 18 free) —
  https://www.nycgovparks.org/events/recreation-centers.

**Museums and cultural institutions with toddler programs**
- Noguchi Museum "Art for Tots" ages 1–2 (monthly), Stroller Tour, Free
  First Fridays — https://www.noguchi.org/museum/calendar/browse/families/.
- Brooklyn Botanic Garden Kids & Families (Fall First Discoveries Wed+Fri
  10:30–12:30 for ages 4 and under through Nov 6; Discovery Weekends Sat/Sun;
  under 12 free) — https://www.bbg.org/learn/kids_and_families.
- The Met "Storytime at The Met" every Tue+Thu 10:15 & 11:00, ages 18 months–6,
  81st Street Studio; the monthly page lives on engage.metmuseum.org —
  https://www.metmuseum.org/events/programs/families/storytime.
- Poster House (Poster Tots ages 2–4 select Saturdays 10:30; Open Studio first
  Sundays; free Fridays; 10-min walk) — https://posterhouse.org/kids-families/.
- New Museum Family Day (free, roughly monthly Sunday 11–3) —
  https://www.newmuseum.org/learn/for-families/.
- Jewish Museum free Dig & Create Sundays and After School Art Explorers
  Tuesdays; free Saturdays — https://thejewishmuseum.org/programs/.
- Brooklyn Children's Museum (free Community Access Thursdays 2–5; Totally
  Tots 0–6; ~40 min) — https://www.brooklynkids.org/events/.
- Children's Museum of Manhattan PlayWorks daily schedule (Grandma zone) —
  https://cmom.org/visit/. Morgan Library Family First Saturdays (ages 3–7,
  weekend storytime, so usually skipped) — https://www.themorgan.org/programs/list.
- Lincoln Center free family shows, Saturdays 11 AM at the Rubenstein Atrium —
  https://lincolncenter.org/series/lincoln-center-presents/v/calendar (filter
  Kids, Teens, and Families).
- Guggenheim Stroller Hour / Stroller Tour: Walkers (12–36 months; dates are
  JS-only) — https://www.guggenheim.org/event/event_series/for-families.

**Live shows, classes, drop-ins and street fairs**
- Vital Theatre Company: Sunday 11 AM musicals rated ages 2–7 —
  https://vitaltheatre.org/.
- Music Together in the City outdoor drop-ins (Mon Madison Sq Park 11:15 & 4,
  Fri Washington Sq Park 11:15; $44) — https://www.musictogethernyc.com/classes.aspx.
- Bindlestiff Family Cirkus (free sets at street fairs, ticketed at LPAC) —
  https://bindlestiff.org/events/.
- Brooklyn Conservatory of Music free family events and parades — https://bkcm.org/events/.
- Swedish Cottage Marionette Theatre (weekends, ages 3–7, under 2 free; closes
  late 2026 for renovation) — https://cityparksfoundation.org/swedish-cottage-marionette-theatre/.
- Manhattan Youth Downtown Community Center toddler open play (members) —
  https://www.manhattanyouth.org/community-center/center-classes.
- McNally Jackson weekday storytimes (SoHo Tue 3 PM & Fri 11 AM; Williamsburg
  Thu 11:30; Downtown Brooklyn Tue/Fri 4 PM) — https://mcnallyjackson.com/kids-shop.
  Books Are Magic "Tiny Storytime" 6–36 months (Tue 11 Smith St, Thu 11
  Montague St) needs confirmation on IG @booksaremagicbk first.
- WonderSpark Puppets free-show list — https://www.wondersparkpuppets.com/free-shows-nyc;
  Suzi Shelton shows — https://www.suzishelton.com/shows.
- Street fairs and parades: Atlantic Antic (last Sunday of Sept) —
  https://www.atlanticave.org/; Dumboween (Oct 31) — https://dumbo.nyc/dumboween/;
  BKLYN BOO (Oct 30) — https://www.downtownbrooklyn.com/; Tompkins Square
  Halloween Dog Parade — https://www.nydogparade.org/; Washington Square Park
  Children's Halloween Parade (Oct 31, 3 PM) —
  https://www.nyu.edu/community/nyu-in-nyc/events/annual-children-s-halloween-parade.html.

**Catching Instagram-first organizations.** Most orgs above post on Instagram
before their website, and the research agents cannot log in there. So for
each: (1) fetch the org's own schedule page or linktree; (2) look for an
embedded Google Calendar, a Squarespace `?format=json` feed, or an
Eventbrite / Humanitix / Luma organizer page; (3) web-search
"<org> <month> 2026" and confirm on the org's own page. If a source cannot
be fetched by any of these, say so in the run summary.

## Verified leads for upcoming weeks (found Sep 19, 2026)

Pull each into `nextWeek` when its week arrives, after re-verifying on the
official page.

- **Sep 28–Oct 4**: Pause in the Plaza rock decorating Tue Sep 29 12–1:30
  (Hudson Square); Music Together Mon Sep 28 and Fri Oct 2; Storytime at The
  Met Tue Sep 29 and Thu Oct 1; Tot Time Thu Oct 1 (Williamsburg); BBG First
  Discoveries Wed Sep 30 and Fri Oct 2, Discovery Weekend Oct 3–4, Fall Family
  Story Time Sun Oct 4 11 AM; Tiny Tots at Alfred E. Smith Rec Center Tue Sep
  29 and Fri Oct 2 11–12 (members); Welcome to Chinatown Mid-Autumn Fest
  Fri–Sun Oct 2–4 1–7 PM, Gotham Park, free with RSVP; La MaMa Kids
  ELEMENTARY Sat–Sun Oct 3–4 10 AM, ages 6–36 months; City of Forest Day Sat
  Oct 3 10–2 at Madison Square Park (coloring, arboretum hunt) and 10–1 at
  Hippo Playground, Riverside Park; Song Bridge Sat Oct 3 2:30 PM, Josie
  Robertson Plaza, Lincoln Center, free; Suzi Shelton "Wake Up & Dance" Sat
  Oct 3 10 AM, Gowanus, $15 (verify venue); Brooklyn Museum First Saturday
  Sat Oct 3 (unverified, site blocks fetches); Prospect Park Zoo Spooktober
  every October weekend; Poster House Open Studio silkscreen Sun Oct 4 11–2;
  Wonder in the Woods Sat Oct 3 10–12, Harlem Meer; Fort Greene storytime and
  Art in the Park Wed Sep 30; Shabbat Dinner in the Sukkah Fri Oct 2 5 PM,
  14th Street Y.
- **Oct 5–11**: Jewish Museum After School Art Explorers Tue Oct 6 2:30–4:30
  (free) and Dig & Create Sun Oct 11 11:30–3 (free); McGolrick Park
  PuppetMobile Sat Oct 10; BKCM Grand Opening Parade Sun Oct 11 10 AM, Park
  Slope; Music in the Playground Tue Oct 6 (Tribeca); Pause in the Plaza
  coloring Tue Oct 6; Indigenous Peoples' Day Mon Oct 12 (schools closed; no
  in-zone toddler event confirmed yet: hunt NMAI New York and the Seaport
  Museum; IPDNYC on Randall's Island is out of zone).
- **Oct 12–18**: Abrons Arts Center Fall Festival Sat Oct 17 12–4 with "The
  Garden" for ages 3–5 at 1:30 and 2:45 (free RSVP); Brooklyn Bridge Park
  Harvest Festival Sat Oct 17 11–3, Pier 6; Tompkins Square Halloween Dog
  Parade Sat Oct 17 mid-morning, Ave B; Poster Tots "Paper Puppets" Sat Oct
  17 10:30 (ages 2–4, register); Open House New York Oct 16–18; Governors
  Island Third Saturday Oct 17; Culture Lab MusiCraftory Sun Oct 18 4 PM;
  Brooklyn Navy Yard open house Oct 17.
- **Oct 19–25**: Governors Island Pumpkin Point Sat–Sun Oct 24–25 10–5, Nolan
  Park; Washington Market Park Halloween Parade Sun Oct 25 1 PM (band-led;
  the best toddler Halloween) and pumpkin carving Sat Oct 24; Fort Greene
  Park Halloween Fest Sat Oct 24 12–4; Diwali at Times Square Sat Oct 24;
  Hunters Point "Halloween on the Waterfront" (2025 was Sat Oct 25 4–8);
  Greenpoint Children's Halloween Parade (2025 was Sun Oct 26 noon, McCarren;
  Eventbrite "Town Square BK"); Brooklyn Heights Promenade parade (2025 was
  Sun Oct 26 11 AM); Central Park Pumpkin Flotilla late Oct, Harlem Meer.
- **Oct 26–Nov 1**: Sing with Suzi Halloween Costume Day Thu Oct 29 10–11,
  JJ Byrne Playground; BKLYN BOO Fri Oct 30 4–6, Abolitionist Place;
  Dumboween Sat Oct 31 3 PM parade and Archway party; Washington Square Park
  Children's Halloween Parade Sat Oct 31 3 PM from the Arch (NYU page not yet
  posted); Village Halloween Parade Oct 31 7 PM (not for toddlers); New
  Museum Family Day Sun Nov 1 11–3, free; TCS NYC Marathon Sun Nov 1: cheer
  from Bedford Ave, Williamsburg, roughly 10 AM–2 PM (L to Bedford); Hudson
  River Park Pumpkin Smash Sat Nov 7, Pier 84; Asia Society Diwali Sat Nov 7 1–4.
- **Evergreen indoor candidates for the rainy-day list**: Museum of Illusions
  (77 Eighth Ave; under 5 free; carry the stroller); Color Factory (251 Spring
  St; under 3 free; no strollers inside); NYC Fire Museum, reopened Aug 2026 at
  278 Spring St, Wed–Sun 10–5, under 3 free, kids $6, adults $15.

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
    summary: "Bryant Park magic show at 10, splash pad at noon, ferry at golden hour.", // one line for the week-at-a-glance view
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
- **NO NAP CONSTRAINT — Rayray is off naps.** Midday (12–2) is fully usable:
  noon shows, 12:30 matinees and 1 PM sessions are all fair game and should be
  surfaced, not skipped. Slot picks by their start time: morning = before 12,
  afternoon = 12:00–4:59, evening = 5 PM and later (an open-hours entry may sit
  in a later slot if it's still running then). Evening picks are "if she's up
  for it" territory — bedtime is ~7:30, so evening events should start by ~6:30.
- Do NOT write nap-era copy in `summary` or `note` ("after nap", "before nap",
  "post-nap", "naptime") — that language is retired.
- Picks must actually happen on that day (`days` includes the day or `any`).
  Anytime spots are fair game — the UI auto-opens their unlock on tap.
- Notes stay self-sufficient (time, place, why) and honest about travel —
  weekend picks can lean grandma's-zone, weekday picks lean Union Square.
- The validator enforces slot/start agreement.

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

## Date Night mode (`date.js`) — refresh alongside week.js

The site has a second mode (🌃 button in the header, `#mode=date`) with plans
for Jordan & Athena's dates — same machinery, its own data file. `date.js` sets
`window.DATE_DATA` with the SAME shape as `WEEK_DATA` (`weekLabel`,
`weekMonday`, `updated`, `events`, optional `itineraries`, optional
`nextWeek`); `toddlerNotes` carries the date-night notes (why it's a good
date, booking tips). Refresh it every Monday with the same procedure as
week.js: anchor the date (step 0), promote a stale week from `nextWeek` first,
then research. The validator checks both files.

**The interest profile (this is the brief — stay on it):**
- **Classic theater** plus **very well-reviewed new plays and musicals**
  (rush/lottery/TDF tips in the notes; skip mediocre tourist fare).
- **Chinese-language and Chinese-culture nights**: 中文 films (new releases and
  rep screenings), Mandarin standup (CrazyLaugh 拉疯喜剧 runs recurring 中文
  开放麦/showcases — check their Eventbrite), Chinese music/arts events
  (Chinese Arts Week, China Institute, Asia Society, museum programs).
- **Ballet & contemporary dance**: NYCB, ABT, Joyce, City Center, Little
  Island Amph dance nights, BAM.
- **Dance parties — outdoor, afternoon/early-evening only** (day parties,
  silent discos, Lincoln Center dance floors; NOT 11 PM club nights).
- **Outdoor beginner-friendly couples dance classes** that teach you (Midsummer
  Night Swing lessons, Bryant Park dance classes, salsa/tango socials with an
  intro lesson).
- **Live music: DJ sets, electropop/indie-electronic, and world music.** DJ
  nights at civilized hours (open-air, rooftop, early or listening-bar sets —
  Nowadays, Public Records, Good Room, Elsewhere rooftop, The Lot Radio, Le
  Bain); electropop/synth/indie-electronic bills (SummerStage, Celebrate
  Brooklyn!, Little Island Amph, Pier 17, Webster Hall, Bowery Ballroom, LPR,
  Baby's All Right, Racket); world music (Drom, Barbès, S.O.B.'s, Joe's Pub,
  Jalopy, Rubenstein Atrium free Thursdays, Bryant Park Picnic Performances).
  Skip arena acts and 1 AM club starts — doors-to-done ~5 PM–midnight or an
  outdoor afternoon slot.

Mode rules that differ from kid mode:
- Categories add `dance` 🩰, `chinese` 🏮, `party` 🪩, `class` 💃, `film` 🎬
  (plus the shared `music`, `theater`, `other`).
- No toddler constraints: evenings are the main event; late shows are fine.
  Travel default is transit/anywhere — Manhattan + near-Brooklyn radius, up to
  ~40 min from Union Square.
- The evergreen standbys (~10 entries: rep cinemas, jazz rooms, museum nights,
  skyline walks — `event:false`, `days:["any"]`) are the anytime tail. Carry
  them forward like the kid library; add sparingly.
- `itineraries` are OPTIONAL and loose for date mode (no per-day minimums; the
  validator only checks slot/slug sanity). When authored, lean evening-heavy —
  a strong evening pick per day beats three token morning entries.
- Aim for ~10–25 dated events across the week. Quality over coverage: two
  great bookable nights beat ten filler listings. Verify dates/times on
  official pages; note rush/lottery/ticket windows in the notes.
- **SUNDAY AFTERNOON + EVENING IS THE PRIME DATE WINDOW — cover it hardest.**
  Every weekly refresh must nail down the Sunday picture in particular: exact
  Sunday matinee/evening curtains for the well-reviewed shows (houses vary —
  3 PM matinees, 7 PM evenings, some dark Sunday), Sunday day parties
  (Mister Sunday, Soul Summit), Sunday dance performances, and Sunday
  Chinese-language options. The Sunday itinerary should be the deepest of
  the week, afternoon + evening both stacked.

**Standing date-mode sources — check every week:** the Gmail newsletters
(search the inbox for **fieldnotesnyc**, **The Blankman List** and similar
listing digests — the owner says to mine these), **CrazyLaugh 拉疯喜剧** on
Eventbrite, TDF/TKTS + the week's rush/lottery boards, Time Out theater &
dance, Joyce/NYCB/ABT/City Center calendars, Film at Lincoln Center,
Film Forum, Metrograph, Angelika (Chinese-language releases often at AMC
Empire/Regal E-Walk too), Lincoln Center Summer for the City, Bryant Park
Picnic Performances, Little Island Amph, SummerStage.

## Verify locally

```sh
python3 -m http.server  # from the repo root
# open http://localhost:8000/rayray-big-weekend/
```

**MANDATORY: run `node rayray-big-weekend/validate.cjs` and fix every error
before deploying** — it checks the schema, coordinate bounds, start/times
agreement, URLs, duplicate slugs, and the daily itineraries (all 7 days
present, picks resolve to real events on the right day, slot/start agreement).

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

## Daily watchdog (the safety net)

A routine runs EVERY morning and is the reason a bad week can no longer sit
unnoticed. It is cheap when things are fine and self-healing when they aren't:

1. `node rayray-big-weekend/sync-from-live.cjs` — if it replaced files, run the
   validator and commit them (no deploy needed). Then
   `node rayray-big-weekend/health.cjs --live`.
2. **Exit 0** → check the repo copy too (`health.cjs` with no flag) in case an
   un-deployed change is pending; if that's green as well, STOP. Send no
   message, open no PR, burn no tokens. Silence is the correct output.
3. **Exit 1 or 2** → FIX IT, don't report it. Follow the Monday procedure for
   whatever the check flagged: promote a stale week, research real events for
   the empty day-parts (spawn several parallel research agents — see "Research
   rules"), rebuild itineraries, validate, commit, push, deploy.
4. Re-run `health.cjs --live` until it exits 0, then stop.
5. Only message Jordan if you could NOT get it green — say exactly what is
   broken and what you tried. A successful self-heal needs no announcement.

Two independent failure modes it covers: the Monday routine not firing at
all, and the Monday routine firing but accomplishing nothing.

## Saturday re-verify (second routine)

A smaller Saturday-morning routine re-checks the CURRENT week.js in place (no
re-research). It starts with `node rayray-big-weekend/sync-from-live.cjs` like
every run (commit anything it replaced), then: (1) verify every dated Sat/Sun event against its official page —
cancellations, time changes; (2) upgrade any medium/low-confidence entries by
verifying their hours/prices on the official visit pages; (3) check the weekend
forecast and note washouts; (4) if a correction kills or moves an itinerary
pick (cancelled show, big rain on an outdoor pick), swap that day's itinerary
to the next-best option. Apply corrections to week.js only, run the
validator, push, deploy, and push-notify a short "what changed" summary.
