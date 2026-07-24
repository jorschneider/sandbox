# Real (live-API) tournament results

- Models: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5
- 6 games, 4 turns each, ground_map=False, 669.5s total

## Elo

| Model | Elo |
|---|---|
| claude-opus-4-8 | 1003 |
| claude-sonnet-4-6 | 1000 |
| claude-haiku-4-5 | 997 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 4 | 2 | 2 | 0 | 0.5 |
| claude-sonnet-4-6 | 4 | 2 | 2 | 0 | 0.5 |
| claude-haiku-4-5 | 4 | 2 | 2 | 0 | 0.5 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 0 |
| claude-sonnet-4-6 | 0 |
| claude-haiku-4-5 | 2 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | claude-sonnet-4-6 | CHINESE_DEFEAT | BLUE |
| claude-opus-4-8 | claude-haiku-4-5 | CHINESE_DEFEAT | BLUE |
| claude-sonnet-4-6 | claude-opus-4-8 | CHINESE_DEFEAT | BLUE |
| claude-sonnet-4-6 | claude-haiku-4-5 | CHINESE_DEFEAT | BLUE |
| claude-haiku-4-5 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-haiku-4-5 | claude-sonnet-4-6 | CHINESE_DEFEAT | BLUE |
