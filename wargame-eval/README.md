# WarGames Eval

An eval where **different LLMs play opposing sides of the CSIS Taiwan
Operational Wargame against each other**, scored head-to-head. See
[`PLAN.md`](PLAN.md) for the full design and [`game/rules_notes.md`](game/rules_notes.md)
for how the CSIS rules map onto this engine (and what v1 simplifies).

## Why this game

The CSIS Taiwan Operational Wargame resolves combat by **objective criteria —
"computer programs, Excel spreadsheets, and lookup tables with die rolls," not
white-cell judgment** (Rules for Umpires, Ch.1). So the **adjudicator is
deterministic code**, not an LLM. The LLMs are the *players* (Red = China, Blue
= US/Japan/Taiwan coalition); the engine resolves their orders and computes the
winner from the rulebook's victory spectrum. That makes the eval reproducible
and gives an objective outcome.

## Status

A seeded, deterministic engine over a reduced cycle of play — reinforcement →
PLA missile attacks → air missions (both sides) → submarine barrier →
amphibious lift/landing → ground combat → victory check. Two ground models:

- **Abstract** (default): lodgment-vs-defense balance.
- **Hex ground game** (`--ground-map`): a 30 km hex Taiwan with the exact
  Table 10A Taiwanese OOB; PLA forces land from lift and grind inland through
  the defending corps using the ported ground CRT.

**Faithful (golden-tested) CSIS ports** (`calculators_csis.py`,
`ground_combat.py`): the Casualty Calculator (all four sides), the amphibious
lift formula, the air-combat Quality constants, and the ground combat CRT
(terrain/strength/odds/losses/FEBA) — each reproduces the workbooks' cached
values. The remaining missile/strike/sub coefficients in `calculators.py` are
representative pending further ports. See `game/rules_notes.md` for exactly
what is faithful vs. approximate.

Validated against the **live Anthropic API** (Opus 4.8 / Sonnet 4.6 / Haiku 4.5
play real games via structured outputs + adaptive thinking) — see
[`analysis/REAL_RUN_RESULTS.md`](analysis/REAL_RUN_RESULTS.md).

## Install

```sh
cd wargame-eval
pip install -e .            # core (no API needed)
pip install -e ".[claude]"  # to drive commanders with the Anthropic SDK
```

The package runs without `anthropic` installed via the deterministic heuristic
agent — used for tests, the baseline opponent, and as the fallback when a model
errors or refuses.

## Run

```sh
# One game, deterministic heuristic commanders (no API):
python -m wargame_eval.runner play --agent heuristic --seed 7 --out game.json

# Hex ground game instead of the abstract lodgment model:
python -m wargame_eval.runner play --agent heuristic --seed 3 --ground-map --out game.json

# One game with real models (needs ANTHROPIC_API_KEY):
python -m wargame_eval.runner play --agent claude \
    --red claude-opus-4-8 --blue claude-sonnet-4-6 --out game.json

# Round-robin tournament with role swaps + Elo:
python -m wargame_eval.runner tournament --agent claude \
    --models claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5 --games-per-pair 6

# Reproduce the saved live-API leaderboard:
python analysis/run_real_tournament.py    # writes analysis/REAL_RUN_RESULTS.md
```

```sh
pytest -q   # 34 tests: determinism, golden calculator/CRT ports, engine,
            # order validation, and the hex ground game
```

## Layout

| Path | Purpose |
|---|---|
| `wargame_eval/state.py` | Game-state model (bases, naval, facilities, lodgment). |
| `wargame_eval/scenario.py` | Base-case OOB (cites rulebook Tables 2A/2B, 5A/5B). |
| `wargame_eval/calculators.py` | Representative combat resolution (missile/strike/sub). |
| `wargame_eval/calculators_csis.py` | **Faithful** ports: casualty calc, lift, air Quality. |
| `wargame_eval/ground_combat.py` | **Faithful** ground CRT (Ground_War_Adjudication). |
| `wargame_eval/ground.py` | Taiwan hex ground game (Table 10A OOB, landings, FEBA). |
| `wargame_eval/schemas.py` | Per-phase order schemas + legality validation. |
| `wargame_eval/engine.py` | 11-phase turn sequencer (abstract + hex ground modes). |
| `wargame_eval/victory.py` | CSIS victory-spectrum evaluator (scale-free). |
| `wargame_eval/agents/` | Commander interface, heuristic (no-API), Claude. |
| `wargame_eval/scoring.py` | Metrics, personnel/KIA casualties, Elo, win tables. |
| `wargame_eval/runner.py` | CLI: `play` / `tournament` (`--ground-map`). |
| `analysis/run_real_tournament.py` | Live-API tournament → `REAL_RUN_RESULTS.md`. |
| `game/rules_notes.md` | CSIS rules distilled; faithful-vs-approximate documented. |

## Design notes

- **Reproducible:** one seeded RNG drives all adjudication; same (scenario,
  orders, seed) replays identically (`tests/test_determinism.py`).
- **Objective outcome:** winner computed from lodgment, functional facilities
  captured, and amphibious-fleet attrition — no LLM judge decides it.
- **Illegal orders are a signal:** the validator clamps impossible allocations
  and records them; high illegal-order rates are reported per side.
- **Fable 5:** the Claude client omits the `thinking` param and enables
  server-side refusal `fallbacks` so a refusal doesn't void a game.
