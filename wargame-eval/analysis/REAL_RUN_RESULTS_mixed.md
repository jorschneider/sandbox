# Real (live-API) tournament — mixed

- Scenario: base case (US in turn 1, Japan engaged)
- Models: claude-opus-4-8, gpt-5.5, deepseek/deepseek-v4-pro, qwen/qwen3.7-max, minimax/minimax-m3, z-ai/glm-5.2
- 60 games, 4 turns each, ground_map=False, 1739.5s total
- Rankings use 58 non-degraded games (2 excluded for excessive API fallbacks)

## Elo

| Model | Elo |
|---|---|
| z-ai/glm-5.2 | 1029 |
| gpt-5.5 | 1025 |
| qwen/qwen3.7-max | 1021 |
| deepseek/deepseek-v4-pro | 980 |
| minimax/minimax-m3 | 979 |
| claude-opus-4-8 | 966 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 20 | 10 | 10 | 0 | 0.5 |
| deepseek/deepseek-v4-pro | 20 | 10 | 10 | 0 | 0.5 |
| gpt-5.5 | 19 | 11 | 8 | 0 | 0.579 |
| minimax/minimax-m3 | 18 | 7 | 11 | 0 | 0.389 |
| qwen/qwen3.7-max | 20 | 10 | 10 | 0 | 0.5 |
| z-ai/glm-5.2 | 19 | 10 | 9 | 0 | 0.526 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 0 |
| gpt-5.5 | 0 |
| deepseek/deepseek-v4-pro | 41 |
| qwen/qwen3.7-max | 0 |
| minimax/minimax-m3 | 80 |
| z-ai/glm-5.2 | 45 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | deepseek/deepseek-v4-pro | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | gpt-5.5 | CHINESE_VICTORY | RED |
| claude-opus-4-8 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| claude-opus-4-8 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | claude-opus-4-8 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | gpt-5.5 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| gpt-5.5 | claude-opus-4-8 | CHINESE_VICTORY | RED |
| gpt-5.5 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| gpt-5.5 | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| gpt-5.5 | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| gpt-5.5 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| gpt-5.5 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | z-ai/glm-5.2 | CHINESE_VICTORY | RED |
| minimax/minimax-m3 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | deepseek/deepseek-v4-pro | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| minimax/minimax-m3 | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | z-ai/glm-5.2 | STALEMATE_INDETERMINATE | DRAW |
| minimax/minimax-m3 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | claude-opus-4-8 | CHINESE_VICTORY | RED |
| qwen/qwen3.7-max | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | deepseek/deepseek-v4-pro | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| qwen/qwen3.7-max | gpt-5.5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | gpt-5.5 | CHINESE_VICTORY | RED |
| qwen/qwen3.7-max | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
