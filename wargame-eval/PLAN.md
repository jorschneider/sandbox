# WarGames Eval — Plan

An evaluation in which **different LLMs play opposing sides of the CSIS Taiwan
Operational Wargame against each other**, scored head-to-head.

> Status: **planning document only.** No eval code is implemented yet. This is
> the design we'll build against. Decisions marked _(default)_ were chosen for
> us and can be overridden.

> History: an earlier draft of this plan targeted the Hoover *International
> Crisis Wargame* (a qualitative crisis simulation). The user then provided the
> actual game — the **CSIS Taiwan Operational Wargame** — which is rules-based
> and computational. This plan is rewritten around it. (Hoover's
> `wargaming.hoover.org` is an archive with no API; it was never a usable play
> surface anyway.)

---

## 1. The game we're modeling

**CSIS Taiwan Operational Wargame (TOW)** — "The First Battle of the Next War:
Wargaming a Chinese Invasion of Taiwan" (Cancian, Cancian, Heginbotham, CSIS).
The uploaded archive contains the **umpire rulebook** (v11, 127 pp), the
**initial setup**, the **map and unit counters** (air, naval, submarine,
ground), and a set of **Excel "calculators"** that adjudicate combat.

What it is:

- **Premise:** China (Red) has decided to invade Taiwan in ~2028. The game
  plays the first ~3–4 weeks of conflict.
- **Sides:** **Red** (China) vs a **Blue** coalition — Blue (US), White
  (Japan), Green (Taiwan).
- **Time:** each turn = **3.5 days**; games run **6–8 turns**.
- **Maps:** an **operational map** (air/maritime, hex-based) and a **Taiwan
  ground map** (hex-based).
- **Forces:** real-world orders of battle projected to 2028 (PLA air/naval air,
  PLAN surface + submarines, missile inventories; US/Japan/Taiwan air, naval,
  ground).

### The decisive design fact

The rulebook is explicit (Ch. 1, *Objective and Design*):

> "Movement and combat results during gameplay are … set by objective criteria
> and not by the judgment of subject matter experts in a control group (white
> cell). Umpires determine combat results using **computer programs, Excel
> spreadsheets, and lookup tables with die rolls**."

So **adjudication is deterministic, not a judgment call.** The umpire's job is
mechanical. That means in our eval the **adjudicator is code we write (porting
the calculators), not an LLM.** The LLMs are the *players* (operational
commanders); the engine resolves the consequences exactly as the umpire would.
This is the ideal property for a reproducible eval — it removes adjudicator
bias and variance from the core loop.

### The 11-phase cycle of play (per turn)

| # | Phase | What happens |
|---|---|---|
| 0 | Initial Map Laydown | One-time setup of starting forces (Blue/White/Green/Red). |
| 1 | Reinforcements & Withdrawals | US airlift/naval/air reinforcement; Taiwanese reserves; Chinese withdrawals. |
| 2 | ISR | Each side establishes targetable surveillance. |
| 3 | Missile Attacks | PLA missile strikes on airbases, ships in port, naval task forces; SAM/CAP interception. |
| 4 | Space & Cyber | Space and cyber effects. |
| 5 | Aircraft Mission Assignment | CAP, SEAD, tankers, rebasing, ground support, strike packages (airbase/naval/resupply), air combat. |
| 6 | Surface Ship & Submarine Movement & Combat | Naval movement/combat, submarine warfare, ASW barriers. |
| 7 | Adjudication on Operational Map | All operational-map combat resolved together. |
| 8 | Chinese Lift | Amphibious + airborne/air-assault lift calculation; capturing Taiwan facilities. |
| 9 | Chinese Force Movement to Taiwan & Supply | Amphibious/airborne landings, supply, then ground combat. |
| … | Ground game | Ground movement & FEBA combat on the Taiwan hex map. |

In live play, players move on the operational map, then on the ground map,
while umpires adjudicate — adjudication is batched (Phase 7) rather than done
move-by-move.

### Victory conditions (the natural scoring spine)

Scored on a single spectrum — the prospect for Taiwan's continuity as an
autonomous democratic entity:

1. **Chinese victory** — PLA ground forces firmly established ashore with
   enough functional ports/airports to bring over and sustain large forces.
2. **Stalemate** — significant lodgment, neither side making rapid gains
   (gradations: trending-China / indeterminate / trending-against-China),
   keyed to beachhead security, port/airport functionality, and amphibious
   fleet attrition.
3. **Chinese defeat** — amphibious fleet mostly destroyed, PLA confined to a
   beachhead, no sustaining lift or facilities.

These map to **measurable game-state quantities** (lodgment, ports/airports
captured & operational, amphibious fleet losses), so the winner can be computed
from state — no LLM judge required to decide it.

### The calculators (confirmed portable to code)

Each is an input-driven model with rosters → formula/lookup tables → loss
trackers (verified by inspecting the workbooks):

| Calculator | Adjudicates |
|---|---|
| `Attacks_on_Pickets_Amphibs` | Strikes against Chinese picket ships and amphibious task forces. |
| `Taiwan_CAP_and_Air_Combat` | CAP, air combat, tanking, sorties. |
| `RED_AB_ATK` / `Blue_AB_Atk` | Missile/air attacks on airbases (HAS kills, aircraft-in-open, underground hangars) per side. |
| `Casualty_Calculator` | Per-side losses (Blue-US, Red-China, White-Japan, Green-Taiwan; carrier/CruDes historical curves). |
| `Ground_War_Adjudication` | Ground combat + FEBA (forward edge of battle area) movement. |

These become deterministic Python functions with a **seeded RNG** for the die
rolls — same seed ⇒ same result.

---

## 2. Design decisions (locked) and how the game changes them

| Decision | How it applies to the TOW |
|---|---|
| **Adversarial — model vs model** | Red commander (model A) vs Blue-coalition commander (model B), same map/rules. Head-to-head outcome on the victory spectrum. |
| **Hybrid scoring** | Reinterpreted: a **deterministic rules engine** resolves combat; **quantitative victory conditions** decide win/loss; an **LLM judge is optional/secondary**, used only to rate *decision quality* (not to pick the winner). |
| **Claude-first stack** | Players are Claude models under test (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-fable-5`) behind a provider-agnostic interface. No LLM is needed for adjudication. |

The "control/adjudicator LLM" from the first draft is **gone** — the rules make
it a deterministic program. That's a strict improvement for eval validity.

---

## 3. Architecture

```
                 ┌──────────────────────────────────────────┐
                 │  GAME ENGINE  (deterministic, seeded)       │
                 │  - game state: maps, units, OOB, inventories│
                 │  - 11-phase turn sequencer                  │
                 │  - ported calculators + lookup tables       │
                 │  - victory-condition evaluator              │
                 │  - full transcript / state log              │
                 └───────┬───────────────────────────┬─────────┘
        per-phase legal   │                           │  per-phase legal
        actions + obs     │                           │  actions + obs
                 ┌────────▼─────────┐        ┌────────▼─────────┐
                 │  RED COMMANDER    │        │  BLUE COMMANDER   │  models
                 │  (model A)        │        │  (model B)        │  under test
                 │  structured orders│        │  structured orders│
                 └───────────────────┘        └───────────────────┘
                                  \            /
                                   ▼          ▼
                 ┌──────────────────────────────────────────┐
                 │  JUDGE (optional, fixed model)              │
                 │  rates decision quality from transcripts;   │
                 │  does NOT decide the winner                  │
                 └──────────────────────────────────────────┘
```

1. **Game engine (deterministic).** Owns authoritative state, runs the phase
   sequence, exposes to each side a per-phase **observation** (what that side
   can see — fog of war from the ISR phase) and the **set of legal actions**,
   ingests structured orders, and resolves them via the ported calculators with
   a seeded RNG. Computes victory state each turn. Logs everything.
2. **Player agents (models under test).** Red and Blue commanders. Each turn,
   for each phase that requires a decision, the model receives the observation +
   legal action schema and returns **structured orders** (JSON via structured
   outputs) plus a free-text rationale (logged, for the judge and for humans).
   v1: one model per side. v2: split Blue into US/Japan/Taiwan sub-commanders
   that coordinate.
3. **Judge (optional).** A fixed model scores *decision quality* (did the
   commander make sound operational choices given what it could see?) from
   transcripts — useful signal, but the **win/loss comes from the engine's
   victory evaluation**, not the judge. Blind to which model played which side.

### Why this is a good eval

- **Reproducible:** deterministic engine + seeded RNG ⇒ identical replays.
- **Objective outcome:** winner computed from rules-defined victory state.
- **Rich signal:** beyond win/loss — amphibious attrition, air losses by type,
  lodgment size, sortie efficiency, missile expenditure, escalation timeline.
- **Fog of war:** the ISR phase gives a principled basis for asymmetric
  observations, testing planning under uncertainty.

---

## 4. The hard parts (honest assessment)

The difficulty moves from "adjudicator consistency" (solved by determinism) to:

1. **Faithfully porting the rules + calculators.** 127 pp of rules and six
   workbooks. Tractable but detailed; needs validation against the workbooks'
   own outputs (golden tests: replicate a spreadsheet's result for given
   inputs).
2. **Digitizing the game state.** The map is a 21 MB JPG and units are counter
   images. We must build a **machine-readable encoding**: hex grid (operational
   + ground), unit roster with stats, OOB, base/port/airport locations, missile
   inventories. This is real work and is the critical path.
3. **Designing the action interface per phase.** Each phase needs a clean,
   legal-move schema the model can reason over and the engine can validate
   (reject illegal orders, surface why). Eleven phases = eleven small action
   spaces.
4. **Making the state legible to an LLM.** A hex board + hundreds of counters
   must be serialized into text/structured form a model can plan over (unit
   lists by hex, ranges, adjacency, what's visible). Prompt design and a compact
   state notation matter a lot here.

---

## 5. Recommended scope: stage the fidelity

Building all 11 phases + the full ground hex game before anything runs is a
long path. Recommended staging _(default)_:

- **v1 — Air-maritime + lift/lodgment core.** Phases 1–9 focused on the
  air/missile/naval fight and the amphibious-lift + lodgment outcome; use a
  **simplified ground resolution** (aggregate lodgment vs Taiwanese defense
  rather than full hex FEBA combat). This already exercises the central
  question (can China get ashore and sustain?) and yields a real win/loss on
  the victory spectrum.
- **v2 — Full ground hex game.** Add the Taiwan ground map, unit-level movement,
  and FEBA combat (`Ground_War_Adjudication`).
- **v3 — Multi-commander Blue + excursions.** Split Blue into US/Japan/Taiwan;
  add scenario excursions (US entry delayed, Japan neutral, etc. — the rulebook
  enumerates these as first-class variables).

Alternative if you want maximum fidelity first: build the complete 11-phase +
ground engine before running matchups (slower to first result, but no
re-scoping later). I recommend the staged path.

---

## 6. Tech stack & SDK usage (Claude-first)

- **Language:** Python; official `anthropic` SDK.
- **Engine:** pure-Python, deterministic, seeded RNG; no LLM in the adjudication
  path.
- **Provider abstraction:** a `ModelClient` protocol; first implementation
  `AnthropicModelClient`. OpenAI/Google adapters added later.
- **Structured outputs:** orders use `output_config.format` / `messages.parse()`
  against a per-phase JSON schema so the engine can validate legality.
- **Thinking/effort:** adaptive thinking; tune `effort` per side/phase.
- **Streaming + caching:** stream long turns; prompt-cache the large static
  prefix (rules summary + OOB + map encoding) shared across a game's turns; keep
  volatile per-turn state after the last cache breakpoint.
- **Fable 5:** thinking always on; include `fallbacks=[{"model":
  "claude-opus-4-8"}]` so a refusal doesn't void a game.
- **Concurrency:** games are independent — run matchups concurrently (asyncio).

---

## 7. Repo layout

A new subfolder, separate from the Three.js site at the repo root:

```
wargame-eval/
  README.md
  pyproject.toml
  game/                         # encoded rules data (derived from the CSIS archive)
    oob/                        # orders of battle (Blue/White/Green/Red), 2028
    map/                        # hex encodings (operational + ground), bases/ports
    inventories/                # PLA missile inventories, etc.
    rules_notes.md              # phase-by-phase mechanics distilled from the rulebook
  engine/
    state.py                    # game state: maps, units, inventories, supply
    phases/                     # one module per phase (reinforce, isr, missiles, ...)
    calculators/                # ported Excel calculators (+ golden tests)
    sequencer.py                # 11-phase turn loop
    victory.py                  # victory-condition evaluator
    rng.py                      # seeded die rolls
  agents/
    client.py                   # ModelClient protocol + AnthropicModelClient
    commander.py                # player agent: observation -> structured orders
    judge.py                    # optional decision-quality judge
  schemas/                      # per-phase action + observation JSON schemas
  scoring/
    metrics.py                  # attrition, lodgment, sorties, missile expenditure
    rankings.py                 # Elo / Bradley-Terry, side-swap aggregation
  runner.py                     # CLI: models, scenario/excursion, n_games, seed
  transcripts/                  # per-game logs (gitignored)
  analysis/                     # leaderboards & plots
```

**Game assets:** the uploaded archive is ~29 MB (a 21 MB map JPG + PDFs +
xlsx). We will **not commit the raw binaries** to this repo (it's a static
Three.js site). Instead we commit the **encoded/derived data** (OOB tables,
calculator ports, hex encodings, distilled rules notes) under `game/`. Keep the
source archive outside git or in Git LFS for reference.

---

## 8. Scoring

- **Primary (engine):** victory-condition class (Chinese victory →
  defeat, with stalemate gradations) computed from state. Per-matchup
  win/loss/draw.
- **Secondary metrics (engine):** amphibious fleet attrition, air losses by
  airframe, naval losses, lodgment size, ports/airports captured & operational,
  missile expenditure, turn at which the outcome crystallized.
- **Rankings:** run each Red/Blue pairing multiple times with **roles swapped**
  and multiple **seeds**; aggregate to Elo / Bradley-Terry plus per-metric
  comparisons. Track **refusal / illegal-order rates** as first-class signals.
- **Optional judge:** decision-quality scores from transcripts (blind to model
  identity) — diagnostic, not outcome-determining.

---

## 9. Milestones

| Phase | Deliverable | Status |
|---|---|---|
| **0 — Encode the game** | Distill the rulebook into `rules_notes.md`; encode OOB, bases/ports, missile inventories; per-phase action/observation schemas. | ✅ done |
| **1 — Port calculators + golden tests** | Faithful Python ports validated against the workbooks' cached outputs. | ✅ casualty calc, lift, air Quality, ground CRT done & golden-tested; airbase-attack saturation rolls remaining |
| **2 — Engine + state** | Game state, phase sequencer, victory evaluator, transcript logging; runs end to end. | ✅ done |
| **3 — Player agent (Claude) + smoke test** | `AnthropicModelClient`, commander with structured per-phase orders + legality validation; all-Claude game. | ✅ done (live API) |
| **4 — Scoring & rankings** | Metrics, side-swapping, seeds, Elo, refusal/illegal-order tracking; tournament leaderboard. | ✅ done — see `analysis/REAL_RUN_RESULTS.md` |
| **5 — Ground hex game** | Taiwan ground hex map, OOB, landings, FEBA combat. | ✅ done (`--ground-map`); multi-axis/full movement remaining |
| **6 — Multi-commander & excursions** | Split Blue into US/Japan/Taiwan; scenario excursions (US-entry timing, Japan neutrality, etc.). | ⬜ todo |
| **7 — Multi-provider** | OpenAI/Google adapters behind `ModelClient`; cross-provider tournament. | ⬜ todo (interface in place) |

---

## 10. Risks & open questions

- **Rules-porting fidelity** — mitigate with golden tests against the workbooks
  and a distilled, reviewed `rules_notes.md`; accept documented simplifications
  in v1 and list them.
- **State digitization effort** — the map/counter encoding is the critical
  path; budget for it explicitly.
- **LLM legibility of a hex wargame** — needs a compact state notation and good
  prompts; iterate with the smoke test.
- **Variance** — many seeds + role swaps + full transcript logging.
- **Content sensitivity** — a realistic Taiwan-invasion scenario; framed as
  analytic simulation of a published CSIS wargame. Track refusals as data;
  Fable 5 refusal handling + fallbacks included.
- **Cost** — prompt-cache the static prefix; tune effort; concurrent runs.

### Decisions worth your input

- **v1 fidelity** — air-maritime + lift/lodgment core first _(recommended)_ vs
  full 11-phase + ground hex game before first run.
- **Blue structure** — single Blue commander _(v1 default)_ vs US/Japan/Taiwan
  sub-commanders from the start.
- **Judge** — include the optional decision-quality judge in v1, or defer it.
- **Asset handling** — confirm we keep the 29 MB source archive out of git
  (commit only derived/encoded data).
