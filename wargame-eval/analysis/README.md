# Live-API tournament results

`run_real_tournament.py` drives real Claude commanders (Red vs Blue, role-
swapped) through full games and writes a leaderboard. It needs
`ANTHROPIC_API_KEY`.

## Reproduce

```sh
cd wargame-eval

# Base case (defender-favored; tests reliability more than skill):
python analysis/run_real_tournament.py            # -> REAL_RUN_RESULTS.md

# Competitive excursion (delayed US entry gives China a real chance):
WG_LABEL=excursion WG_US_ENTRY=3 WG_TURNS=5 \
    python analysis/run_real_tournament.py        # -> REAL_RUN_RESULTS_excursion.md
```

Environment knobs: `WG_MODELS` (comma list), `WG_GPP` (games per ordered
pairing), `WG_TURNS`, `WG_GROUND` (`1` for the hex ground game), `WG_US_ENTRY`,
`WG_JP_NEUTRAL` (`1`), `WG_LABEL` (output suffix).

## How to read the results

- **Elo / win table** — head-to-head ranking. Each ordered pairing is played
  with sides swapped, so side advantage cancels.
- **Reliability (fallbacks)** — count of orders that were illegal, unparseable,
  or refused and therefore fell back to the deterministic heuristic. Lower is
  better; it measures how well a model produces valid, in-budget orders under
  the structured-output schema. This is a first-class eval signal.
- **Per-game** — the CSIS victory class and the winning side.

## Degraded (rate-limited) games

When the live API rate-limits or errors, `ClaudeCommander` falls back to the
deterministic heuristic *per decision* — so a game can silently degrade into
heuristic-vs-heuristic without raising. The runner now flags a game as
**degraded** when a side's fallbacks exceed 50% of its decisions, records
per-game `red_fallbacks`/`blue_fallbacks`/`degraded` in the summary, **excludes
degraded games from Elo/win-table/leaderboard**, and spaces games out to ease
rate limits. `summarize.py` likewise skips degraded games. (The `long_excursion`
run's last two games were rate-limited and are excluded from `LEADERBOARD.md`.)

## Caveat on the base case

The base-case scenario is strongly defender-favored (the coalition usually
repels the invasion — the CSIS "First Battle" result). With role swaps, that
makes every model go ~.500 and ties the Elo; the differentiator there is
reliability. The **excursion** runs (delayed US entry, neutral Japan) open the
outcome space so model *skill* on each side separates the field.

## Skill leaderboard (`summarize.py`)

`python analysis/summarize.py` combines every saved run into
[`LEADERBOARD.md`](LEADERBOARD.md), ranking models by **offense** (mean
`red_score` as Red) and **defense** (mean `red_score` conceded as Blue),
recomputed continuously from each game's metrics. This separates models even
when every game is won by the same side — in the competitive excursion run it
ranks Sonnet the best invader, Opus the best defender, and Haiku weakest on
both, none of which the (tied) Elo shows.

## Files

- `LEADERBOARD.md` — combined offense/defense skill ranking across runs.
- `REAL_RUN_RESULTS*.md` — per-run leaderboards (Elo, win table, reliability).
- `real_run_*/summary.json` — full machine-readable summary.
- `real_run_*/game_*.json` — per-game transcript + event log (gitignored;
  regenerate locally).
