# Real (live-API) tournament — mixed

- Scenario: base case (US in turn 1, Japan engaged)
- Models: claude-opus-4-8, gpt-5.5, deepseek/deepseek-v4-pro, qwen/qwen3.7-max, minimax/minimax-m3, z-ai/glm-5.2
- 30 games, 4 turns each, ground_map=False, 11946.7s total
- Rankings use 28 non-degraded games (2 excluded for excessive API fallbacks)

## Elo

| Model | Elo |
|---|---|
| z-ai/glm-5.2 | 1046 |
| qwen/qwen3.7-max | 1023 |
| gpt-5.5 | 1018 |
| minimax/minimax-m3 | 983 |
| deepseek/deepseek-v4-pro | 969 |
| claude-opus-4-8 | 961 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 9 | 3 | 6 | 0 | 0.333 |
| gpt-5.5 | 10 | 6 | 4 | 0 | 0.6 |
| deepseek/deepseek-v4-pro | 9 | 3 | 6 | 0 | 0.333 |
| minimax/minimax-m3 | 10 | 4 | 6 | 0 | 0.4 |
| z-ai/glm-5.2 | 10 | 7 | 3 | 0 | 0.7 |
| qwen/qwen3.7-max | 8 | 5 | 3 | 0 | 0.625 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 0 |
| gpt-5.5 | 0 |
| deepseek/deepseek-v4-pro | 25 |
| qwen/qwen3.7-max | 15 |
| minimax/minimax-m3 | 32 |
| z-ai/glm-5.2 | 23 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| claude-opus-4-8 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| claude-opus-4-8 | minimax/minimax-m3 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | z-ai/glm-5.2 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| gpt-5.5 | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| gpt-5.5 | qwen/qwen3.7-max | CHINESE_VICTORY | RED |
| gpt-5.5 | minimax/minimax-m3 | CHINESE_VICTORY | RED |
| gpt-5.5 | z-ai/glm-5.2 | CHINESE_VICTORY | RED |
| deepseek/deepseek-v4-pro | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-v4-pro | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| deepseek/deepseek-v4-pro | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3.7-max | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
| qwen/qwen3.7-max | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | gpt-5.5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| minimax/minimax-m3 | deepseek/deepseek-v4-pro | CHINESE_VICTORY | RED |
| minimax/minimax-m3 | qwen/qwen3.7-max | STALEMATE_TREND_CHINA | RED |
| minimax/minimax-m3 | z-ai/glm-5.2 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | claude-opus-4-8 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | gpt-5.5 | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | deepseek/deepseek-v4-pro | STALEMATE_TREND_CHINA | RED |
| z-ai/glm-5.2 | qwen/qwen3.7-max | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-5.2 | minimax/minimax-m3 | STALEMATE_TREND_CHINA | RED |
