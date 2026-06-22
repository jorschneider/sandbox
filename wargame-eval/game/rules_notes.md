# CSIS Taiwan Operational Wargame — rules distilled for the engine

Source: *Rules for Umpires — Taiwan Operational Wargame* (v11), Cancian, Cancian
& Heginbotham, CSIS International Security Program; companion to *The First
Battle of the Next War: Wargaming a Chinese Invasion of Taiwan*. This file
records the mechanics the v1 engine encodes and, explicitly, where it
simplifies. It is a working distillation, not a substitute for the rulebook.

## Premise & sides
- China (Red) has decided to invade Taiwan in ~2028; the game plays the first
  ~3–4 weeks. Each **turn = 3.5 days**; games run **6–8 turns**.
- Sides: **Red** (China) vs a **Blue** coalition — Blue (US), White (Japan),
  Green (Taiwan). v1 treats the coalition as a single Blue commander.

## Adjudication philosophy (why our adjudicator is code)
> "Movement and combat results during gameplay are … set by objective criteria
> and not by the judgment of subject matter experts in a control group (white
> cell). Umpires determine combat results using computer programs, Excel
> spreadsheets, and lookup tables with die rolls." — Ch.1, *Objective and Design*

So the engine adjudicates deterministically (calculators + one seeded RNG); the
only judgment calls are the players' orders.

## Cycle of play (11 phases) — and the v1 subset
Full: 0 Initial Map Laydown · 1 Reinforcements & Withdrawals · 2 ISR ·
3 Missile Attacks · 4 Space & Cyber · 5 Aircraft Mission Assignment ·
6 Surface Ship & Submarine Movement/Combat · 7 Adjudication on Operational Map ·
8 Chinese Lift · 9 Chinese Force Movement & Supply · + ground combat.

v1 implements the decision-bearing subset: reinforcement (auto) → **missiles
(Red)** → **air missions (both)** → **naval barrier (Blue)** → **amphibious
lift/landing (Red)** → **ground combat (Red posture)** → victory check.
Phases 2 (ISR) and 4 (Space/Cyber) are abstracted; ground combat is reduced
(see below).

## Victory conditions (Ch.1) — the scoring spine
Scored on Taiwan's continuity as an autonomous entity:
1. **Chinese victory** — PLA firmly ashore + enough functional ports/airports to
   sustain large forces.
2. **Stalemate** — significant lodgment, no rapid gains (trending China /
   indeterminate / trending against China), keyed to beachhead security,
   port/airport functionality, and amphibious-fleet attrition.
3. **Chinese defeat** — amphibious fleet mostly destroyed, PLA confined to a
   beachhead.

`victory.py` computes the class from `pla_lodgment`, `functional facilities
captured`, and `amphib_attrition`.

## Forces encoded (with sources)
- **PLA missiles** (`scenario.py`) — exact from **Table 5A/5B**: DF-11 ×39,
  DF-15B ×13, DF-16 ×5, DF-21C/17 ×7, DF-26 ×8, DF-21D ×4, DF-26B ×8, plus
  ground/air-launched cruise. Each target category draws from the eligible
  pools (e.g. only DF-26 reaches Guam; only ASBMs threaten carriers).
- **US laydown** — **Table 2A** (CSG ×2, SAG ×3, SUBRON ×3, ARG ×1) and **Table
  2B** (Kadena/Iwakuni/Misawa/Guam air). Counts marked `APPROX` are
  representative.
- **Amphibious fleet** — six flotillas (matching the `Attacks_on_Pickets_Amphibs`
  tool's TF1–6), SAG escorts, ~12 picket groups, submarines.
- **Air OOB / Taiwan ground strength** — `APPROX`; exact figures live in the
  CSIS backup OOB papers and should be calibrated there.

## Calculators ↔ CSIS workbooks

**Faithful, golden-tested ports** (`calculators_csis.py`, `ground_combat.py`) —
each reproduces the workbook's cached values (these paths have no `RAND`, so the
outputs are exact targets):

| Engine function | CSIS workbook | Status |
|---|---|---|
| `casualties()` (4 sides) | `Casualty_Calculator_V7` | EXACT (incl. subtotal quirks) |
| `amphib_lift()` | `Attacks_on_Pickets_Amphibs` (AmphibiousTF!J28/J29) | EXACT: 60·afloat/36, ×1.5 turn 1 |
| `air_exchange()` + `AIR_QUALITY` | `Taiwan_CAP_and_Air_Combat` (Combat!A67:B77) | Real Quality constants; quality-weighted exchange |
| `ground_combat.resolve_engagement()` | `Ground_War_Adjudication` (Adjudication + FEBA Movement) | EXACT terrain/strength/odds/loss/FEBA tables |
| `airbase_missile_attack()` | `RED_AB_ATK` / `Blue_AB_Atk` (+ rules Table 5C) | Real PK d20 model: SAM intercept 1-18, HAS kill 1-15 (2 msl/HAS), open 1-17, UGS PK 14 |
| `resolve_amphib_strike()` + `antiship_hits()` | `Attacks_on_Pickets_Amphibs` (+ rules Table 5H) | EXACT anti-ship table: per leaker d20 -> ships hit (LRASM 1-6/7-13/14-16/17-18/19/20; cruise 1-11/12-18/19/20), nat-20 = TF destroyed |

The airbase-attack kill mechanic is the workbook's binomial d20 model — each
leaking munition kills with probability PK/20: half the SAM battalions (rounded
up) intercept on 1-18; hardened shelters take two missiles per kill-roll (1-15),
aircraft in the open one (1-17), underground hangars trap at PK 14. The anti-ship
strike on the amphibious fleet uses rules Table 5H exactly: escorts/pickets
intercept the salvo, then each leaking missile rolls a d20 for ship hits (a
natural 20 destroys the whole flotilla), accumulating into flotillas sunk.

**Representative coefficients** still pending exact ports (`calculators.py`,
flagged `APPROX`): `resolve_asbm_vs_carriers` and `resolve_submarine_barrier`
(Ch.8 barrier attrition). The picket-screen *penetration* table (rules Table 5G
"Attacks Past Picket Ships") is folded into a single interception step rather
than modeled as a separate screen — a documented simplification.

## Documented simplifications
- **Ground war**: a **hex ground game** (`--ground-map`, `ground.py`) is now
  implemented — 30 km hexes, exact Table 10A Taiwanese OOB, lift→landings, and
  the ported FEBA CRT. Simplified vs. the full game: a single advancing axis per
  campaign (rolls up facilities by priority) rather than free counter-by-counter
  movement across multiple simultaneous fronts; engineer fortify/repair and
  airborne/airmobile insertion not yet modeled. The default mode remains the
  abstract lodgment-vs-defense balance.
- **One Blue commander** rather than separate US / Japan / Taiwan decision-makers
  (milestone 6). Japan is assumed engaged; US enters at turn 1 (base case).
- **ISR / Space / Cyber** abstracted; fog of war is light (each side sees enemy
  strength in aggregate).
- **Facility repair** is a flat per-turn recovery for China-held facilities; no
  Blue counter-suppression of captured facilities yet.
- **Scenario excursions** (US-entry timing, Japan neutrality, MLR pre-deploy —
  rulebook Table 1A) not yet parameterized (milestone 6).
