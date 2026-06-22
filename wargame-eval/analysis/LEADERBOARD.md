# Live-API skill leaderboard

Offense = mean `red_score` as Red (higher = better invader). Defense = mean `red_score` conceded as Blue (lower = better defender). These separate models even when every game is won by the same side (see analysis/README.md).

## base — base case  (6 games, 4 turns)

| Model | Offense (as Red) | Defense (conceded as Blue) |
|---|---|---|
| claude-opus-4-8 | 0.096 | 0.09 |
| claude-sonnet-4-6 | 0.084 | 0.059 |
| claude-haiku-4-5 | 0.084 | 0.115 |

- Best invader: **claude-opus-4-8** (0.096 avg red_score as Red)
- Best defender: **claude-sonnet-4-6** (0.059 red_score conceded as Blue)

## excursion — US entry turn 3, Japan engaged  (6 games, 5 turns)

| Model | Offense (as Red) | Defense (conceded as Blue) |
|---|---|---|
| claude-sonnet-4-6 | 0.443 | 0.31 |
| claude-opus-4-8 | 0.401 | 0.3 |
| claude-haiku-4-5 | 0.193 | 0.425 |

- Best invader: **claude-sonnet-4-6** (0.443 avg red_score as Red)
- Best defender: **claude-opus-4-8** (0.3 red_score conceded as Blue)

