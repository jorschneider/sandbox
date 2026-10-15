# Scheduled routines that keep this site fresh (exported Sep 20, 2026)

These three prompts run as scheduled Claude Code routines in the "july 26"
cloud environment. Each firing starts a fresh session, clones
`jorschneider/sandbox`, and works on branch
`claude/toddler-activities-microsite-rhvwp8`. `UPDATE.md` in this directory is
the full contract each prompt points at. The environment provides
`VERCEL_TOKEN` (production deploy) and `GH_TOKEN`; note that scheduled
sessions could NOT push to GitHub (HTTP 403 from the git proxy), so their
commits only reached production, never git, from Aug 3 to Sep 17, 2026.
Any replacement runner needs: Node 22, git with push rights to the branch,
`VERCEL_TOKEN`, and unrestricted web access for research.

| Routine | Cron (UTC) | Local (ET) | Model used | Notes |
|---|---|---|---|---|
| Monday refresh (v3, date-anchored) | `0 11 * * 1` | Mon 7:00 AM | claude-sonnet-5 | Promotes the week, researches, deploys, drafts the weekly email |
| Daily health watchdog | `0 10 * * *` | 6:00 AM daily | claude-sonnet-5 | Cheap when healthy; self-heals when `health.cjs` fails |
| Saturday re-verify | `0 11 * * 6` | Sat 7:00 AM | claude-sonnet-5 | Re-checks the weekend's events in place |

Push notifications are on for all three. A successful run is silent; a run
that cannot get `health.cjs --live` to exit 0 messages the owner.

---

## 1. Monday refresh (v3, date-anchored)

```
You maintain "Rayray Big Weekend" — the toddler-activities microsite in rayray-big-weekend/ of the jorschneider/sandbox repo, live at https://rayray-big-weekend.vercel.app. It also has a 🌃 Date Night mode (date.js) for Jordan and Athena. Refresh BOTH for the CURRENT week.

rayray-big-weekend/UPDATE.md is the COMPLETE contract — read it FIRST and follow it exactly.

START by running: node rayray-big-weekend/health.cjs --live
That tells you exactly what is broken. Run it again at the END — a run is NOT finished until it exits 0. On Jul 27 2026 this routine fired, silently did nothing, and left the site a week stale because nothing verified the outcome. Never report success without pasting the health-check output.

Rules that OVERRIDE any older habit:
- ANCHOR TO THE REAL DATE. Run `date`, compute thisMonday = the most recent Monday on or before today. NEVER assume today is Monday, NEVER skip ahead. If weekMonday already equals thisMonday, do NOT promote — just refresh the nextWeek preview and fill gaps.
- PRESERVE the ~200 EVERGREEN entries (playgrounds + indoor stops; event:false). NEVER regenerate week.js from scratch — a correct week.js has 200+ total entries. Only DATED events, itineraries and nextWeek get refreshed.
- BE THOROUGH. Spawn several parallel research agents (Task tool, model opus) across different beats: NYC Parks/CityParks/Battery Park City, NYPL+BPL branch calendars, museum family programs, festivals and family concerts, StuyTown/PCV home turf (stuytown.com/events), Williamsburg/Greenpoint/LIC. A promoted preview alone is NOT enough — last time that left Thursday with zero daytime events. Aim for 50+ dated events with every day-part covered.
- Sunday afternoon/evening is the prime date-night window — cover it hardest in date.js.

Procedure: promote if stale (keeping evergreens), research to fill every gap health.cjs reports, rebuild itineraries (2-3 options per slot, max 9 picks/day), run node rayray-big-weekend/validate.cjs (must pass), commit, push to claude/toddler-activities-microsite-rhvwp8, deploy with: cd rayray-big-weekend && npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"

Then re-run health.cjs --live until it exits 0. Then research the FOLLOWING Mon–Sun into a fresh nextWeek for both files, re-validate, commit, deploy. Draft the weekly Gmail to Jordan and Athena. End with the final health-check output and a short summary of what changed.
```

## 2. Daily health watchdog

```
You maintain "Rayray Big Weekend" (rayray-big-weekend/ in the jorschneider/sandbox repo, live at https://rayray-big-weekend.vercel.app) — a toddler-activities site for Rayray plus a Date Night mode for Jordan and Athena.

This is the DAILY WATCHDOG run. Be cheap when things are fine, self-healing when they are not.

STEP 1. Clone/checkout the repo, branch claude/toddler-activities-microsite-rhvwp8, and run:
  node rayray-big-weekend/health.cjs --live
Then also: node rayray-big-weekend/health.cjs

STEP 2. If BOTH exit 0: STOP IMMEDIATELY. Send no message to the user, make no commits, open no PR. Silence is the correct output for a healthy day. Do not "improve" anything.

STEP 3. If either exits 1 or 2: FIX IT — do not just report it. Read rayray-big-weekend/UPDATE.md first; it is the complete contract. Then:
  - Run `date` and anchor to the real current week (thisMonday = most recent Monday on or before today). Never jump ahead.
  - If a week is STALE: promote nextWeek per the Monday procedure, preserving ALL ~200 evergreen entries (event:false) — never regenerate from scratch.
  - If day-parts are EMPTY or thin: research REAL dated events to fill them. Spawn several parallel research agents (Task tool, model opus) across different beats — NYC Parks/CityParks/Battery Park City, NYPL+BPL branch calendars, museum family programs, festivals and family concerts, StuyTown/PCV home turf (stuytown.com/events), and the Williamsburg/Greenpoint/LIC zone. For date.js use its own interest profile and standing sources in UPDATE.md. Verify every date/time on an official page; include real lat/lng.
  - Rebuild the affected itineraries so picks point at real events (2-3 options per slot, max 9 picks/day).
  - Run `node rayray-big-weekend/validate.cjs` — it must pass.
  - Commit, push to claude/toddler-activities-microsite-rhvwp8, then deploy: cd rayray-big-weekend && npx -y vercel deploy --prod --yes --token "$VERCEL_TOKEN"

STEP 4. Re-run `node rayray-big-weekend/health.cjs --live` until it exits 0. A run is NOT finished until the live check is green — "I made changes" is not success.

STEP 5. Message Jordan ONLY if you could not get it green. Say precisely what is broken, what you tried, and what you need. A successful self-heal needs no announcement.
```

## 3. Saturday re-verify

```
You maintain "Rayray Big Weekend" (rayray-big-weekend/ in the jorschneider/sandbox repo, live at https://rayray-big-weekend.vercel.app). Today is Saturday. Do the weekend re-verify described in UPDATE.md's "Saturday re-verify" section: read UPDATE.md first, then re-check the CURRENT week.js in place (no re-research) — verify every dated Sat/Sun event on its official page for cancellations and time changes, upgrade medium/low-confidence entries by verifying hours/prices on official visit pages, and check the weekend forecast for washouts. Apply corrections to week.js only, run `node rayray-big-weekend/validate.cjs` (must pass), commit and push to the open PR branch (claude/toddler-activities-microsite-rhvwp8, or per UPDATE.md's git flow if merged), deploy per UPDATE.md's Deploy section, and finish with a short "what changed this weekend" summary.
```

---

## Recommended additions if you re-create these elsewhere

1. Start every run with `node rayray-big-weekend/sync-from-live.cjs` so the
   run works from what production serves even if a previous push failed.
2. Make the runner verify its push landed
   (`git ls-remote origin refs/heads/<branch>` equals `git rev-parse HEAD`);
   deploy regardless so the site never goes stale, and report an unlanded push.
3. Require the run to fetch every URL in UPDATE.md's "Source checklist"
   section; the Sep 19, 2026 miss came from a source class no beat covered.
