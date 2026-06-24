# Real (live-API) tournament — mixed

- Scenario: base case (US in turn 1, Japan engaged)
- Models: claude-opus-4-8, gpt-5.5, deepseek/deepseek-v4-pro, qwen/qwen3.7-max, minimax/minimax-m3, z-ai/glm-5.2
- 60 games, 4 turns each, ground_map=False, 7752.2s total
- Rankings use 43 non-degraded games (17 excluded for excessive API fallbacks)

## Elo

| Model | Elo |
|---|---|
| minimax/minimax-m3 | 1059 |
| z-ai/glm-5.2 | 1019 |
| qwen/qwen3.7-max | 1010 |
| gpt-5.5 | 1002 |
| claude-opus-4-8 | 974 |
| deepseek/deepseek-v4-pro | 935 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 19 | 9 | 10 | 0 | 0.474 |
| deepseek/deepseek-v4-pro | 16 | 5 | 11 | 0 | 0.312 |
| gpt-5.5 | 4 | 2 | 2 | 0 | 0.5 |
| minimax/minimax-m3 | 16 | 11 | 5 | 0 | 0.688 |
| qwen/qwen3.7-max | 15 | 8 | 7 | 0 | 0.533 |
| z-ai/glm-5.2 | 16 | 8 | 8 | 0 | 0.5 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 0 |
| gpt-5.5 | 191 |
| deepseek/deepseek-v4-pro | 0 |
| qwen/qwen3.7-max | 9 |
| minimax/minimax-m3 | 0 |
| z-ai/glm-5.2 | 0 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | deepseek/deepseek-v4-pro | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | z-ai/glm-5.2 | CHINESE_VICTORY | RED |
| claude-opus-4-8 | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | gpt-5.5 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | gpt-5.5 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | deepseek/deepseek-v4-pro | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| gpt-5.5 | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| gpt-5.5 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| gpt-5.5 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| minimax/minimax-m3 | gpt-5.5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| minimax/minimax-m3 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | z-ai/glm-5.2 | CHINESE_VICTORY | RED |
| qwen/qwen3.7-max | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | gpt-5.5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | gpt-5.5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| z-ai/glm-5.2 | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
