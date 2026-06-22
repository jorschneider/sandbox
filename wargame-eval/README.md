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

## Status: v1 (air-maritime + lift/lodgment core)

Implemented: a seeded, deterministic engine over a reduced cycle of play —
reinforcement → PLA missile attacks → air missions (both sides) → submarine
barrier → amphibious lift/landing → ground combat → victory check. The Taiwan
ground war is abstracted to a lodgment-vs-defense balance (full hex ground game
is milestone 5). Combat coefficients are representative and flagged for
calibration against the CSIS workbooks (milestone 1). See `rules_notes.md`.

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

# One game with real models (needs ANTHROPIC_API_KEY):
python -m wargame_eval.runner play --agent claude \
    --red claude-opus-4-8 --blue claude-sonnet-4-6 --out game.json

# Round-robin tournament with role swaps + Elo:
python -m wargame_eval.runner tournament --agent claude \
    --models claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5,claude-fable-5 \
    --games-per-pair 6
```

```sh
pytest -q   # 12 tests: determinism, calculator bounds, engine + validation
```

## Layout

| Path | Purpose |
|---|---|
| `wargame_eval/state.py` | Game-state model (bases, naval, facilities, lodgment). |
| `wargame_eval/scenario.py` | Base-case OOB (cites rulebook Tables 2A/2B, 5A/5B). |
| `wargame_eval/calculators.py` | Deterministic combat resolution (the "umpire"). |
| `wargame_eval/schemas.py` | Per-phase order schemas + legality validation. |
| `wargame_eval/engine.py` | 11-phase turn sequencer (v1 subset). |
| `wargame_eval/victory.py` | CSIS victory-spectrum evaluator. |
| `wargame_eval/agents/` | Commander interface, heuristic (no-API), Claude. |
| `wargame_eval/scoring.py` | Metrics, Elo, win tables. |
| `wargame_eval/runner.py` | CLI: `play` / `tournament`. |
| `game/rules_notes.md` | CSIS rules distilled; v1 deviations documented. |

## Design notes

- **Reproducible:** one seeded RNG drives all adjudication; same (scenario,
  orders, seed) replays identically (`tests/test_determinism.py`).
- **Objective outcome:** winner computed from lodgment, functional facilities
  captured, and amphibious-fleet attrition — no LLM judge decides it.
- **Illegal orders are a signal:** the validator clamps impossible allocations
  and records them; high illegal-order rates are reported per side.
- **Fable 5:** the Claude client omits the `thinking` param and enables
  server-side refusal `fallbacks` so a refusal doesn't void a game.
