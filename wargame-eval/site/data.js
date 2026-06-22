window.WARBENCH_DATA = {
  "generated": "2026-06-22",
  "runs": [
    {
      "label": "mixed",
      "scenario": "Cross-provider \u2014 frontier Claude vs Chinese open models",
      "cross": true,
      "turns": 4,
      "n_games": 20,
      "n_valid": 20,
      "n_degraded": 0,
      "models": [
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1010,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.122,
          "defense": 0.078,
          "fallbacks": 0
        },
        {
          "model": "claude-haiku-4-5",
          "label": "Haiku 4.5",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1005,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.063,
          "defense": 0.11,
          "fallbacks": 2
        },
        {
          "model": "deepseek/deepseek-chat-v3.1",
          "label": "DeepSeek V3.1",
          "origin": "DeepSeek",
          "cn": true,
          "elo": 1000,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.1,
          "defense": 0.121,
          "fallbacks": 0
        },
        {
          "model": "qwen/qwen3-max",
          "label": "Qwen3 Max",
          "origin": "Alibaba",
          "cn": true,
          "elo": 995,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.084,
          "defense": 0.04,
          "fallbacks": 0
        },
        {
          "model": "z-ai/glm-4.6",
          "label": "GLM-4.6",
          "origin": "Zhipu",
          "cn": true,
          "elo": 990,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.051,
          "defense": 0.072,
          "fallbacks": 12
        }
      ],
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "DeepSeek V3.1",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Qwen3 Max",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GLM-4.6",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "DeepSeek V3.1",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Qwen3 Max",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "GLM-4.6",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V3.1",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V3.1",
          "blue": "Haiku 4.5",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V3.1",
          "blue": "Qwen3 Max",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V3.1",
          "blue": "GLM-4.6",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3 Max",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3 Max",
          "blue": "Haiku 4.5",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3 Max",
          "blue": "DeepSeek V3.1",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3 Max",
          "blue": "GLM-4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GLM-4.6",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GLM-4.6",
          "blue": "Haiku 4.5",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GLM-4.6",
          "blue": "DeepSeek V3.1",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GLM-4.6",
          "blue": "Qwen3 Max",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        }
      ]
    },
    {
      "label": "long_excursion",
      "scenario": "Excursion \u2014 US entry turn 3, Japan engaged",
      "cross": false,
      "turns": 6,
      "n_games": 12,
      "n_valid": 10,
      "n_degraded": 2,
      "models": [
        {
          "model": "claude-haiku-4-5",
          "label": "Haiku 4.5",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1029,
          "games": 6,
          "wins": 4,
          "win_rate": 0.667,
          "offense": 0.243,
          "defense": 0.444,
          "fallbacks": 60
        },
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1016,
          "games": 8,
          "wins": 4,
          "win_rate": 0.5,
          "offense": 0.456,
          "defense": 0.29,
          "fallbacks": 7
        },
        {
          "model": "claude-sonnet-4-6",
          "label": "Sonnet 4.6",
          "origin": "Anthropic",
          "cn": false,
          "elo": 955,
          "games": 6,
          "wins": 1,
          "win_rate": 0.167,
          "offense": 0.4,
          "defense": 0.487,
          "fallbacks": 25
        }
      ],
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_INDETERMINATE",
          "winner": "DRAW",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": true
        },
        {
          "red": "Haiku 4.5",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": true
        }
      ]
    },
    {
      "label": "base",
      "scenario": "Base case \u2014 US in from turn 1, Japan engaged",
      "cross": false,
      "turns": 4,
      "n_games": 6,
      "n_valid": 6,
      "n_degraded": 0,
      "models": [
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1003,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.096,
          "defense": 0.09,
          "fallbacks": 0
        },
        {
          "model": "claude-sonnet-4-6",
          "label": "Sonnet 4.6",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1000,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.084,
          "defense": 0.059,
          "fallbacks": 0
        },
        {
          "model": "claude-haiku-4-5",
          "label": "Haiku 4.5",
          "origin": "Anthropic",
          "cn": false,
          "elo": 997,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.084,
          "defense": 0.115,
          "fallbacks": 2
        }
      ],
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "Sonnet 4.6",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Haiku 4.5",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Haiku 4.5",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Sonnet 4.6",
          "outcome": "CHINESE_DEFEAT",
          "winner": "BLUE",
          "degraded": false
        }
      ]
    },
    {
      "label": "excursion",
      "scenario": "Excursion \u2014 US entry turn 3, Japan engaged",
      "cross": false,
      "turns": 5,
      "n_games": 6,
      "n_valid": 6,
      "n_degraded": 0,
      "models": [
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1003,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.401,
          "defense": 0.3,
          "fallbacks": 1
        },
        {
          "model": "claude-sonnet-4-6",
          "label": "Sonnet 4.6",
          "origin": "Anthropic",
          "cn": false,
          "elo": 1000,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.443,
          "defense": 0.31,
          "fallbacks": 0
        },
        {
          "model": "claude-haiku-4-5",
          "label": "Haiku 4.5",
          "origin": "Anthropic",
          "cn": false,
          "elo": 997,
          "games": 4,
          "wins": 2,
          "win_rate": 0.5,
          "offense": 0.193,
          "defense": 0.425,
          "fallbacks": 1
        }
      ],
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Sonnet 4.6",
          "blue": "Haiku 4.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Haiku 4.5",
          "blue": "Sonnet 4.6",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        }
      ]
    }
  ]
};
