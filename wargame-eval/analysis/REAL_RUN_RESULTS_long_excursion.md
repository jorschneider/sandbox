# Real (live-API) tournament — long_excursion

- Scenario: excursion: US entry turn 3, Japan engaged
- Models: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5
- 12 games, 6 turns each, ground_map=False, 1961.9s total

> ⚠️ **Caveat:** the API rate-limited late in this run, so the final two games
> (haiku-vs-sonnet, seeds 560/1560) had ~100% per-decision fallback to the
> heuristic — effectively heuristic-vs-heuristic and **excluded from the trusted
> rankings**. The Elo/win/reliability tables below were computed by the original
> script over all 12 games (so are mildly contaminated); the de-contaminated
> skill ranking (10 valid games) is in [`LEADERBOARD.md`](LEADERBOARD.md). The
> harness now detects and excludes degraded games automatically.

## Elo

| Model | Elo |
|---|---|
| claude-opus-4-8 | 1016 |
| claude-haiku-4-5 | 1001 |
| claude-sonnet-4-6 | 983 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 8 | 4 | 3 | 1 | 0.5 |
| claude-sonnet-4-6 | 8 | 3 | 5 | 0 | 0.375 |
| claude-haiku-4-5 | 8 | 4 | 3 | 1 | 0.5 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 7 |
| claude-sonnet-4-6 | 25 |
| claude-haiku-4-5 | 60 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | claude-sonnet-4-6 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | claude-sonnet-4-6 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | claude-haiku-4-5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | claude-haiku-4-5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-sonnet-4-6 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-sonnet-4-6 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-sonnet-4-6 | claude-haiku-4-5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-sonnet-4-6 | claude-haiku-4-5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-haiku-4-5 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-haiku-4-5 | claude-opus-4-8 | STALEMATE_INDETERMINATE | DRAW |
| claude-haiku-4-5 | claude-sonnet-4-6 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-haiku-4-5 | claude-sonnet-4-6 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
