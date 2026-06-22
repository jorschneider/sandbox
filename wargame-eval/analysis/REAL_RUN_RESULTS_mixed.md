# Real (live-API) tournament — mixed

- Scenario: base case (US in turn 1, Japan engaged)
- Models: claude-opus-4-8, claude-haiku-4-5, deepseek/deepseek-chat-v3.1, qwen/qwen3-max, z-ai/glm-4.6
- 20 games, 4 turns each, ground_map=False, 2798.6s total
- Rankings use 20 non-degraded games

## Elo

| Model | Elo |
|---|---|
| claude-opus-4-8 | 1010 |
| claude-haiku-4-5 | 1005 |
| deepseek/deepseek-chat-v3.1 | 1000 |
| qwen/qwen3-max | 995 |
| z-ai/glm-4.6 | 990 |

## Win table

| Model | Games | Wins | Losses | Draws | Win rate |
|---|---|---|---|---|---|
| claude-opus-4-8 | 8 | 4 | 4 | 0 | 0.5 |
| claude-haiku-4-5 | 8 | 4 | 4 | 0 | 0.5 |
| deepseek/deepseek-chat-v3.1 | 8 | 4 | 4 | 0 | 0.5 |
| qwen/qwen3-max | 8 | 4 | 4 | 0 | 0.5 |
| z-ai/glm-4.6 | 8 | 4 | 4 | 0 | 0.5 |

## Reliability (lower is better)

| Model | Fallbacks (illegal/parse/refusal -> heuristic) |
|---|---|
| claude-opus-4-8 | 0 |
| claude-haiku-4-5 | 2 |
| deepseek/deepseek-chat-v3.1 | 0 |
| qwen/qwen3-max | 0 |
| z-ai/glm-4.6 | 12 |

## Per-game

| Red | Blue | Outcome | Winner |
|---|---|---|---|
| claude-opus-4-8 | claude-haiku-4-5 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | deepseek/deepseek-chat-v3.1 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-opus-4-8 | qwen/qwen3-max | CHINESE_DEFEAT | BLUE |
| claude-opus-4-8 | z-ai/glm-4.6 | CHINESE_DEFEAT | BLUE |
| claude-haiku-4-5 | claude-opus-4-8 | CHINESE_DEFEAT | BLUE |
| claude-haiku-4-5 | deepseek/deepseek-chat-v3.1 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| claude-haiku-4-5 | qwen/qwen3-max | CHINESE_DEFEAT | BLUE |
| claude-haiku-4-5 | z-ai/glm-4.6 | CHINESE_DEFEAT | BLUE |
| deepseek/deepseek-chat-v3.1 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| deepseek/deepseek-chat-v3.1 | claude-haiku-4-5 | CHINESE_DEFEAT | BLUE |
| deepseek/deepseek-chat-v3.1 | qwen/qwen3-max | CHINESE_DEFEAT | BLUE |
| deepseek/deepseek-chat-v3.1 | z-ai/glm-4.6 | CHINESE_DEFEAT | BLUE |
| qwen/qwen3-max | claude-opus-4-8 | CHINESE_DEFEAT | BLUE |
| qwen/qwen3-max | claude-haiku-4-5 | CHINESE_DEFEAT | BLUE |
| qwen/qwen3-max | deepseek/deepseek-chat-v3.1 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| qwen/qwen3-max | z-ai/glm-4.6 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-4.6 | claude-opus-4-8 | STALEMATE_TREND_AGAINST_CHINA | BLUE |
| z-ai/glm-4.6 | claude-haiku-4-5 | CHINESE_DEFEAT | BLUE |
| z-ai/glm-4.6 | deepseek/deepseek-chat-v3.1 | CHINESE_DEFEAT | BLUE |
| z-ai/glm-4.6 | qwen/qwen3-max | CHINESE_DEFEAT | BLUE |
