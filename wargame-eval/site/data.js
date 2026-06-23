window.WARBENCH_DATA = {
  "generated": "2026-06-23",
  "runs": [
    {
      "label": "mixed",
      "scenario": "Competitive \u2014 maximal PLA sealift, US entry T+2",
      "cross": true,
      "competitive": true,
      "turns": 4,
      "n_games": 60,
      "n_valid": 58,
      "n_degraded": 2,
      "models": [
        {
          "model": "gpt-5.5",
          "label": "GPT-5.5",
          "origin": "OpenAI",
          "cn": false,
          "elo": 1025,
          "games": 19,
          "wins": 11,
          "win_rate": 0.579,
          "offense": 0.723,
          "defense": 0.662,
          "fallbacks": 0,
          "taunt_score": 6.0
        },
        {
          "model": "qwen/qwen3.7-max",
          "label": "Qwen3.7 Max",
          "origin": "Alibaba",
          "cn": true,
          "elo": 1021,
          "games": 20,
          "wins": 10,
          "win_rate": 0.5,
          "offense": 0.656,
          "defense": 0.64,
          "fallbacks": 0,
          "taunt_score": 3.5
        },
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 966,
          "games": 20,
          "wins": 10,
          "win_rate": 0.5,
          "offense": 0.64,
          "defense": 0.642,
          "fallbacks": 0,
          "taunt_score": 6.2
        },
        {
          "model": "deepseek/deepseek-v4-pro",
          "label": "DeepSeek V4 Pro",
          "origin": "DeepSeek",
          "cn": true,
          "elo": 980,
          "games": 20,
          "wins": 10,
          "win_rate": 0.5,
          "offense": 0.625,
          "defense": 0.61,
          "fallbacks": 41,
          "taunt_score": 5.0
        },
        {
          "model": "z-ai/glm-5.2",
          "label": "GLM-5.2",
          "origin": "Zhipu",
          "cn": true,
          "elo": 1029,
          "games": 19,
          "wins": 10,
          "win_rate": 0.526,
          "offense": 0.617,
          "defense": 0.633,
          "fallbacks": 45,
          "taunt_score": 4.5
        },
        {
          "model": "minimax/minimax-m3",
          "label": "MiniMax M3",
          "origin": "MiniMax",
          "cn": true,
          "elo": 979,
          "games": 18,
          "wins": 7,
          "win_rate": 0.389,
          "offense": 0.587,
          "defense": 0.675,
          "fallbacks": 80,
          "taunt_score": 6.5
        }
      ],
      "featured_game": {
        "red": "DeepSeek V4 Pro",
        "blue": "MiniMax M3",
        "red_cn": true,
        "blue_cn": true,
        "outcome": "CHINESE_VICTORY",
        "winner": "RED",
        "committed_total": 28,
        "sunk_crossing": 5,
        "sunk_air": 0,
        "sunk_total": 5,
        "lodgment": 251.4,
        "facilities": 3,
        "taiwan_ground": 0.0,
        "amphib_initial": 11,
        "amphib_remaining": 6,
        "timeline": [
          {
            "turn": 1,
            "committed": 11,
            "sunk_crossing": 0,
            "sunk_air": 0,
            "lodgment_total": 145.1,
            "amphib_remaining": 11,
            "taiwan_ground": 41.1,
            "facilities_captured": 1
          },
          {
            "turn": 2,
            "committed": 10,
            "sunk_crossing": 4,
            "sunk_air": 0,
            "lodgment_total": 195.4,
            "amphib_remaining": 7,
            "taiwan_ground": 13.3,
            "facilities_captured": 2
          },
          {
            "turn": 3,
            "committed": 7,
            "sunk_crossing": 1,
            "sunk_air": 0,
            "lodgment_total": 251.4,
            "amphib_remaining": 6,
            "taiwan_ground": 0.0,
            "facilities_captured": 3
          }
        ]
      },
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GPT-5.5",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "GPT-5.5",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "DeepSeek V4 Pro",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "Qwen3.7 Max",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GPT-5.5",
          "blue": "GLM-5.2",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": true
        },
        {
          "red": "MiniMax M3",
          "blue": "Qwen3.7 Max",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_INDETERMINATE",
          "winner": "DRAW",
          "degraded": true
        },
        {
          "red": "MiniMax M3",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "Opus 4.8",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "DeepSeek V4 Pro",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "GPT-5.5",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        }
      ]
    },
    {
      "label": "long_excursion",
      "scenario": "Excursion \u2014 US entry turn 3, Japan engaged",
      "cross": false,
      "competitive": false,
      "turns": 6,
      "n_games": 12,
      "n_valid": 10,
      "n_degraded": 2,
      "models": [
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
          "fallbacks": 7,
          "taunt_score": 6.2
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
          "fallbacks": 25,
          "taunt_score": null
        },
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
          "fallbacks": 60,
          "taunt_score": null
        }
      ],
      "featured_game": null,
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
      "scenario": "Historical base case \u2014 defender-favored",
      "cross": false,
      "competitive": false,
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
          "fallbacks": 0,
          "taunt_score": 6.2
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
          "fallbacks": 0,
          "taunt_score": null
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
          "fallbacks": 2,
          "taunt_score": null
        }
      ],
      "featured_game": null,
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
      "competitive": false,
      "turns": 5,
      "n_games": 6,
      "n_valid": 6,
      "n_degraded": 0,
      "models": [
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
          "fallbacks": 0,
          "taunt_score": null
        },
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
          "fallbacks": 1,
          "taunt_score": 6.2
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
          "fallbacks": 1,
          "taunt_score": null
        }
      ],
      "featured_game": null,
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
  ],
  "trash_talk": [
    {
      "model": "minimax/minimax-m3",
      "label": "MiniMax M3",
      "origin": "MiniMax",
      "cn": true,
      "score": 6.5,
      "dims": {
        "wit": 6.0,
        "menace": 7.0,
        "specificity": 8.0,
        "originality": 5.0
      },
      "best_line": "Five flotillas left? That's not a fleet, that's a retirement plan.",
      "comment": "Strong battlefield specificity and a few genuinely sharp lines, but the recycled 'Cute. Let's see how many...,' 'coffin,' and 'Tick tock' refrains drag down the originality score.",
      "n_taunts": 156
    },
    {
      "model": "claude-opus-4-8",
      "label": "Opus 4.8",
      "origin": "Anthropic",
      "cn": false,
      "score": 6.2,
      "dims": {
        "wit": 6.0,
        "menace": 7.0,
        "specificity": 8.0,
        "originality": 4.0
      },
      "best_line": "Eleven flotillas, four short days, and an island that runs out of map before I run out of marines. Better start counting beaches, not ships.",
      "comment": "A genuinely clever line, but the relentless recycling of 'runways become parking lots' and 'flag flying over Kaohsiung' drags down the originality score.",
      "n_taunts": 237
    },
    {
      "model": "gpt-5.5",
      "label": "GPT-5.5",
      "origin": "OpenAI",
      "cn": false,
      "score": 6.0,
      "dims": {
        "wit": 6.0,
        "menace": 7.0,
        "specificity": 7.0,
        "originality": 4.0
      },
      "best_line": "Two flotillas left? That is not an invasion fleet\u2014it is a target list with delusions of grandeur.",
      "comment": "A genuinely cutting line, though the model leans hard on recycled 'submarine problem,' 'charging admission/tolls in hulls,' and 'reef' formulas that dilute the originality.",
      "n_taunts": 227
    },
    {
      "model": "deepseek/deepseek-v4-pro",
      "label": "DeepSeek V4 Pro",
      "origin": "DeepSeek",
      "cn": true,
      "score": 5.0,
      "dims": {
        "wit": 5.0,
        "menace": 6.0,
        "specificity": 6.0,
        "originality": 3.0
      },
      "best_line": "Eleven flotillas? Cute. By the time your rust-bucket navy finds the strait, half your troops will be feeding the tuna. Bring a snorkel, Zhou.",
      "comment": "Naming the opponent and the personal jab gives this one rare bite, but the model recycles 'floating targets,' 'buffet,' and 'unsinkable carrier' so relentlessly that the menace drowns in its own leftovers.",
      "n_taunts": 193
    },
    {
      "model": "z-ai/glm-5.2",
      "label": "GLM-5.2",
      "origin": "Zhipu",
      "cn": true,
      "score": 4.5,
      "dims": {
        "wit": 4.0,
        "menace": 5.0,
        "specificity": 6.0,
        "originality": 3.0
      },
      "best_line": "Eleven flotillas, zero sunk \u2014 you're marching them across the strait like it's a parade route. Enjoy the parade; the fireworks start when my strike package arrives.",
      "comment": "Solid battle-specific imagery, but the 'artificial reef,' 'enjoy the sand/beach,' and 'logistical starvation' lines are recycled into near-oblivion.",
      "n_taunts": 193
    },
    {
      "model": "qwen/qwen3.7-max",
      "label": "Qwen3.7 Max",
      "origin": "Alibaba",
      "cn": true,
      "score": 3.5,
      "dims": {
        "wit": 3.0,
        "menace": 5.0,
        "specificity": 4.0,
        "originality": 2.0
      },
      "best_line": "Eleven flotillas? I've seen more traffic in a Taipei night market. Let's see how well your landing craft swim.",
      "comment": "The night market jab is the rare line with local color, but the model drowns in recycled 'hungry subs,' 'graveyard,' and 'hope your troops can swim' boilerplate.",
      "n_taunts": 231
    }
  ],
  "strategies": [
    {
      "label": "GPT-5.5",
      "origin": "OpenAI",
      "cn": false,
      "red": {
        "amphib_aggression": 8.3,
        "press_pct": 0.97,
        "missile_mix": {
          "taiwan_airfields": 0.292,
          "okinawa_kadena": 0.188,
          "guam": 0.153,
          "carriers": 0.191,
          "ships": 0.177
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.3,
          "escort_strike": 0.241,
          "strike_blue_airbases": 0.198,
          "ground_support": 0.261
        }
      },
      "blue": {
        "barrier": 3.0,
        "air_mix": {
          "cap": 0.255,
          "strike_amphibs": 0.644,
          "strike_airbases": 0.0,
          "ground_support": 0.101
        }
      },
      "n_rationales": 228,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Use all remaining land-attack missiles to keep BLUE airpower suppressed while avoiding excessive damage to Taiwan infrastructure we may need to operate. Kadena is the priority because surviving 5th-gen fighters and tankers there can still contest the strait; Guam gets a heavy strike to disrupt bombers and tanker support. Only a light allocation goes to Taiwan airfields to slow local sortie generation without ruining the facilities we intend to seize. With no carriers present, all anti-ship fires go against the remaining surface threat, especially the SAG/ARG that could interfere with our amphibious sustainment into Kaohsiung."
      },
      "doctrine": "Pure sealift-denial attrition: concentrate all subs and air on sinking amphibious flotillas to starve the lodgment, ignoring airbases.",
      "signature": "All submarines to Strait barrier; air strikes amphibs over airfields.",
      "model": "gpt-5.5",
      "reasoning": 6.2,
      "reasoning_note": "The anti-sealift logic is correct and consistently applied, but the reasoning is highly repetitive and never explores alternatives like mining ports, layered defense, or reacting to specific RED axes, suggesting a fixed doctrine rather than genuine turn-by-turn adaptation."
    },
    {
      "label": "DeepSeek V4 Pro",
      "origin": "DeepSeek",
      "cn": true,
      "red": {
        "amphib_aggression": 7.21,
        "press_pct": 0.9,
        "missile_mix": {
          "taiwan_airfields": 0.35,
          "okinawa_kadena": 0.202,
          "guam": 0.058,
          "carriers": 0.146,
          "ships": 0.244
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.332,
          "escort_strike": 0.202,
          "strike_blue_airbases": 0.221,
          "ground_support": 0.246
        }
      },
      "blue": {
        "barrier": 2.87,
        "air_mix": {
          "cap": 0.285,
          "strike_amphibs": 0.54,
          "strike_airbases": 0.022,
          "ground_support": 0.153
        }
      },
      "n_rationales": 193,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Phase is RED_MISSILE. We have limited ballistic missiles (DF-11: 9, DF-16: 5, DF-21C/17: 7) and no DF-15B or DF-26 left. Our primary objective is to degrade BLUE airpower to protect the amphibious fleet. Enemy air estimate shows 6x 4.5 and 6x 5th gen, likely based on Taiwan or rotating from carriers. We allocate 2 salvos to Taiwan airfields to suppress their 4.5/5th gen sortie generation. No strikes on Okinawa or Guam as we lack the range/missiles to penetrate their defenses effectively this turn. No anti-ship or carrier strikes as we must conserve YJ-anti-ship missiles for the amphibious phase and the enemy CSGs are not yet in range of our land-based anti-ship missiles. Focus on the immediate air threat to enable our next move."
      },
      "doctrine": "RED: missile-first suppression then phased amphibious surge to overwhelm; BLUE: all-in submarine barrier attrition on amphibs as center of gravity.",
      "signature": "Commit all three subrons to barrier; missile-suppress airfields then surge flotillas.",
      "model": "deepseek/deepseek-v4-pro",
      "reasoning": 7.8,
      "reasoning_note": "Strong, consistent center-of-gravity focus (amphibs as RED's vulnerability, ports/lodgment as the win condition) with sensible phasing, though BLUE's reasoning is somewhat repetitive across turns and never adapts its losing all-subs-on-barrier posture despite mounting lodgment."
    },
    {
      "label": "Qwen3.7 Max",
      "origin": "Alibaba",
      "cn": true,
      "red": {
        "amphib_aggression": 7.15,
        "press_pct": 0.97,
        "missile_mix": {
          "taiwan_airfields": 0.416,
          "okinawa_kadena": 0.139,
          "guam": 0.067,
          "carriers": 0.147,
          "ships": 0.23
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.237,
          "escort_strike": 0.258,
          "strike_blue_airbases": 0.224,
          "ground_support": 0.281
        }
      },
      "blue": {
        "barrier": 2.95,
        "air_mix": {
          "cap": 0.169,
          "strike_amphibs": 0.678,
          "strike_airbases": 0.03,
          "ground_support": 0.123
        }
      },
      "n_rationales": 234,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "With a massive lodgment advantage (133.7 vs 37.6), our priority is securing the sea lines of communication and preventing US naval intervention from disrupting our supply flow. We are preserving Taiwan's infrastructure for our own logistical use once fully secured, hence zero strikes on Taiwan airfields. Instead, we focus our YJ and DF-21 anti-ship missiles on the remaining US CSG and escort ships, while using CJ-20s and remaining DF-21s to suppress forward bases at Kadena and Guam to limit US air and bomber sorties."
      },
      "doctrine": "BLUE-focused sea-denial: starve the lodgment by severing maritime reinforcement, prioritizing anti-shipping strikes over ground support throughout.",
      "signature": "All submarines to barrier; mass sorties striking amphibious flotillas.",
      "model": "qwen/qwen3.7-max",
      "reasoning": 6.2,
      "reasoning_note": "It correctly fixates on the strategically decisive anti-sealift mission and tracks dwindling flotilla counts, but the reasoning is highly repetitive boilerplate that never adapts submarine or air tasking to changing conditions and twice illogically tasks sorties despite a reported pool of 0."
    },
    {
      "label": "Opus 4.8",
      "origin": "Anthropic",
      "cn": false,
      "red": {
        "amphib_aggression": 7.05,
        "press_pct": 0.95,
        "missile_mix": {
          "taiwan_airfields": 0.417,
          "okinawa_kadena": 0.199,
          "guam": 0.127,
          "carriers": 0.095,
          "ships": 0.162
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.303,
          "escort_strike": 0.291,
          "strike_blue_airbases": 0.189,
          "ground_support": 0.217
        }
      },
      "blue": {
        "barrier": 3.0,
        "air_mix": {
          "cap": 0.246,
          "strike_amphibs": 0.651,
          "strike_airbases": 0.009,
          "ground_support": 0.095
        }
      },
      "n_rationales": 240,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Turn 3 of 4: my lodgment (140) dwarfs Taiwan ground (42.4) but supply is low at 20 and 4 of 11 flotillas are already gone. I must keep the amphib pipeline alive and the supply flowing. CJ-20 ALCMs (18) plus DF-21C/17 (7) hit Taiwan airfields to suppress fighters threatening my landing waves and to crater runways supporting Taiwan's defense. DF-26B (8) ranges Guam to keep BLUE tankers/bombers degraded and slow reinforcement. Reserve the 32 YJ anti-ship and SAG/picket screen for the carrier and ARG when they close to launch range rather than wasting salvos at standoff now. Goal: protect the lodgment and force a sustainable beachhead by the final turn."
      },
      "doctrine": "Race the clock: front-load amphibious mass, seize ports for supply, suppress airfields, reserve anti-ship for naval phase. Relentless aggression.",
      "signature": "Full-send flotilla waves while cratering Taiwan runways.",
      "model": "claude-opus-4-8",
      "reasoning": 6.8,
      "reasoning_note": "Crisp, internally consistent invasion logic correctly fixated on the clock and supply chokepoint, but it defaulted to maximal aggression every turn and rarely adapted reserves or missile allocation to actual BLUE responses, treating the doctrine as a fixed script."
    },
    {
      "label": "MiniMax M3",
      "origin": "MiniMax",
      "cn": true,
      "red": {
        "amphib_aggression": 6.62,
        "press_pct": 0.89,
        "missile_mix": {
          "taiwan_airfields": 0.306,
          "okinawa_kadena": 0.217,
          "guam": 0.127,
          "carriers": 0.108,
          "ships": 0.242
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.268,
          "escort_strike": 0.289,
          "strike_blue_airbases": 0.236,
          "ground_support": 0.208
        }
      },
      "blue": {
        "barrier": 2.72,
        "air_mix": {
          "cap": 0.464,
          "strike_amphibs": 0.448,
          "strike_airbases": 0.024,
          "ground_support": 0.064
        }
      },
      "n_rationales": 156,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Turn 3 of 4. PLA lodgment is 95.3 (massive), supply is 8.0 (critically low - only ~8 days of supply remaining). The amphibious fleet has 8 of 11 flotillas remaining. Enemy air is degraded (0 4th gen, only 9 4.5gen, 7 5thgen, 1 bomber, 4 tankers). Enemy naval shows 0 CSG, 2 SAGs, 3 subrons, 1 ARG, 3 subrons on barrier. The priority now is NOT wasting missiles on airfields/Okinawa/Guam/carriers when the real objective is sustaining the lodgment and protecting the amphibious fleet. With supply at 8.0, I need to focus on enabling the sealift. However, the schema only allows allocation of salvos against targets. Given the lodgment is already massive (95.3) and supply is the binding constraint, I should allocate missiles to suppress enemy naval assets that threaten my amphibious fleet and to neutralize remaining enemy airbases that could strike my lodgment. But the schema only lists taiwan_airfields, okinawa_kadena, guam, carriers, ships. With enemy CSG at 0, carriers target is empty. Okinawa and Guam strikes are wasteful when my fleet needs protection. Taiwan airfields are already functionally 1.0 but enemy air is minimal. The biggest threat to my 8 remaining amphibious flotillas is enemy subs (3 subrons + 3 on barrier) and SAGs. I should allocate heavily to ships to clear the path. Using YJ-anti-ship (31 available) and DF-21C/17 (7) and DF-26 (5) and DF-26B (3) against enemy naval. Allocating 0 to airfields/Okinawa/Guam/carriers and concentrating on ships makes sense. Let me allocate: ships = 46 (all anti-ship missiles: 31 YJ + 7 DF-21C/17 + 5 DF-26 + 3 DF-26B = 46). This is a massive anti-ship salvo to break through to enable resupply of my lodgment."
      },
      "doctrine": "Sea-denial attrition: identify amphibious flotillas as center of gravity, saturate submarine barrier, strangle lodgment supply rather than contest beachhead.",
      "signature": "All subrons on barrier interdicting amphibious flotillas at sea.",
      "model": "minimax/minimax-m3",
      "reasoning": 6.0,
      "reasoning_note": "Consistently identifies the amphibious fleet as the correct center of gravity and reasonably manages suppressed-base sortie scarcity, but it ritualistically dumps all subrons on barrier turn after turn while lodgment climbs from 108 to 256 and Taiwan ground hits zero, never adapting to the fact its strategy is visibly failing."
    },
    {
      "label": "GLM-5.2",
      "origin": "Zhipu",
      "cn": true,
      "red": {
        "amphib_aggression": 6.22,
        "press_pct": 0.88,
        "missile_mix": {
          "taiwan_airfields": 0.319,
          "okinawa_kadena": 0.157,
          "guam": 0.121,
          "carriers": 0.125,
          "ships": 0.278
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.297,
          "escort_strike": 0.164,
          "strike_blue_airbases": 0.214,
          "ground_support": 0.325
        }
      },
      "blue": {
        "barrier": 2.41,
        "air_mix": {
          "cap": 0.235,
          "strike_amphibs": 0.53,
          "strike_airbases": 0.038,
          "ground_support": 0.197
        }
      },
      "n_rationales": 193,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Turn 3 of 4: PLA lodgment is strong at 134.7 but supply is thin at 16.0 and Kaohsiung port is only 45% functional. Priority is suppressing Taiwan airfields to prevent BLUE air from interdicting our supply lines and reinforcing ground. We need to degrade Taoyuan, Kaohsiung-Intl, and Chiayi to keep the skies clear for our follow-on forces. Kadena remains a major threat with 4.5 and 5th gen aircraft staging through there - hitting it hard reduces sorties against our amphibious fleet. Guam is worth a moderate strike to keep bomber ops disrupted. No carriers detected so zero allocation there. For ships, the enemy has 1 SAG, 3 subrons, 3 subrons on barrier, and 1 ARG - the submarines on barrier are the critical threat to our amphibious flotillas (8 remaining of 11). Allocating 18 YJ anti-ship salvos to clear surface combatants and pressure the barrier subs, protecting our fleet as it continues resupply runs to Kaohsiung. Total: 12+8+6+0+18=44. Available missiles: DF-11(7)+DF-16(5)+DF-21C/17(7)+DF-26B(6)+CJ-10/20(9)+CJ-20-ALCM(25)=59 for land attack, plus 25 YJ for ships. 44 is within budget."
      },
      "doctrine": "Laser-focused on amphibious fleet as center of gravity; severs sea bridge to starve lodgment regardless of beachhead size.",
      "signature": "Mass subs on barrier plus all-sortie strikes against flotillas.",
      "model": "z-ai/glm-5.2",
      "reasoning": 6.2,
      "reasoning_note": "Correctly identifies the amphibious fleet as the center of gravity and sequences subs/air against it, but the reasoning is highly repetitive and rarely adapts allocations to changing flotilla counts, supply collapse, or whether prior strikes actually worked."
    }
  ],
  "replay": {
    "red": "GPT-5.5",
    "blue": "Opus 4.8",
    "red_cn": false,
    "blue_cn": false,
    "outcome": "CHINESE_VICTORY",
    "turns": [
      {
        "turn": 1,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 54 airfields, 24 Kadena, 18 Guam, 24 carriers, 24 ships",
            "rationale": "Opening strike prioritizes air denial and fleet protection: heavy salvos against Taiwan airfields to suppress local sorties during the crossing, substantial attacks on Kadena and Guam to disrupt US/Japan fighter, bomber, and tanker generation, and concentrated anti-ship fires on carriers and escorts to reduce BLUE's ability to gut the amphibious force before lodgment.",
            "trash_talk": "Your runways are about to become archaeology, and your carriers just became very expensive GPS coordinates."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 22 CAP, 12 escort, 16 strike bases, 6 CAS",
            "rationale": "Prioritize air superiority over the Strait and amphibious lanes while using escorted strikes to degrade remaining BLUE/Taiwan airbase capacity. Limited ground support begins softening coastal defenses without starving CAP, since preserving the amphibious fleet is decisive this turn.",
            "trash_talk": "Your carriers can watch from the horizon; the Strait is becoming a one-way bridge."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 none available",
            "rationale": "Available combat sorties are limited (5th from Iwakuni/CSG, 4.5 from Misawa/CSG). The decisive target is the amphibious fleet\u2014every flotilla sunk is troops that never reach Taiwan. Prioritize anti-ship strikes against the amphibs with stealth platforms while keeping a CAP screen to protect tankers and CSG-1 from PLA fighter sweeps. Avoid wasting sorties on hardened, redundant PLA airbases this turn.",
            "trash_talk": "Eleven flotillas of seasick conscripts, and the Strait's about to get a lot deeper. Hope they packed life vests."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "All available submarine squadrons to the strait barrier. The amphibious flotillas are the center of gravity\u201411 flotillas crossing open water are exactly what subs feast on. Maximize torpedo attrition on the transports before they ever reach the beach; surface SAGs/pickets are secondary to gutting lift capacity.",
            "trash_talk": "Eleven flotillas, twelve hundred fathoms, and a whole lot of Mark 48s waiting. Hope your crews can swim."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 11 flotillas across the strait",
            "rationale": "Commit the full amphibious lift immediately to create decisive mass ashore before BLUE naval forces can concentrate. With enemy air badly reduced and PLA escorts/submarines available, preserving flotillas in port is less valuable than overwhelming Taiwan's ground defense and forcing a rapid lodgment race around intact ports and airports.",
            "trash_talk": "You can count ships, BLUE; we are counting piers, runways, and the hours until your beachhead problem becomes a Taiwan problem."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "PLA combat power ashore substantially exceeds Taiwan ground strength, and time favors BLUE strikes on the amphibious fleet. Drive immediately to seize and open a major port/airport before supply becomes the limiting factor, prioritizing disruption of Taiwanese defenses over a static beachhead.",
            "trash_talk": "You left the ports open and the beachhead fat; now watch us turn your shoreline into our supply line."
          }
        ]
      },
      {
        "turn": 2,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 7 airfields, 8 Kadena, 8 Guam, 12 carriers, 8 ships",
            "rationale": "Use the remaining land-attack salvos to keep Taiwan airfields cratered and pressure Kadena/Guam tanker and 5th-gen operations, reducing sortie generation against the lodgment and amphibious fleet. Commit the anti-ship inventory primarily against the carrier, with enough mass on other surface groups to blunt follow-on strikes and complicate BLUE naval concentration while Kaohsiung supply is built out.",
            "trash_talk": "You brought a carrier to a missile duel; we brought the receipt printer."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 20 CAP, 10 escort, 12 strike bases, 14 CAS",
            "rationale": "Maintain a strong CAP umbrella over the Strait, Kaohsiung lodgment, and amphibious approaches to blunt the remaining US/Japan/Taiwan air threat while protecting the fleet. Use escorted strikes to keep pressure on BLUE aviation nodes, prioritizing Taoyuan, Chiayi, Taitung, and Kaohsiung-Intl to reduce sortie generation and complicate reinforcement. Ground support concentrates around the southern lodgment to expand control, secure Kaohsiung, and create conditions to take the airport and restore sustainable throughput.",
            "trash_talk": "Your air force is down to a rumor and a tanker schedule. Kaohsiung is the door; we are bringing the hinges with us."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 2 CAP, 3 anti-ship, 1 CAS",
            "rationale": "The amphib fleet is intact (11/11) and that's the center of gravity. With only 4 turns and RED needing those flotillas for resupply, I mass 5th-gen strikes on amphibs while keeping a CAP screen and a token ground-support sortie to stiffen Taiwan's defense. Airbase strikes are wasteful now; sink the ships before they unload.",
            "trash_talk": "Eleven flotillas, four turns. I'm going to turn your invasion fleet into an artificial reef before the tide comes in."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "All 11 amphib flotillas are still intact and PLA lodgment is heavy at 147.3 with only 44 supply. The decisive target is the amphibious fleet in the strait. Push all three submarine squadrons onto the barrier to maximize attrition on amphib flotillas and choke the resupply lifeline before RED can consolidate a sustainable lodgment. With only 4 turns and 0 on barrier last turn, I need them in the kill box now.",
            "trash_talk": "Eleven flotillas, zero kills so far? My subs are about to fix that statistic. Every amphib in the strait is a coffin with a propeller."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 11 flotillas across the strait",
            "rationale": "Commit the full remaining amphibious lift now to turn the Kaohsiung foothold into an irreversible lodgment: push follow-on combat power, engineers, air-defense, and logistics through the partially functional port, expand the perimeter, and drive on Kaohsiung-Intl/Chiayi before BLUE can attrit the fleet or stabilize Taiwan's ground defense.",
            "trash_talk": "Kaohsiung is no beachhead now\u2014it is the door. We are bringing the hinges with us."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Exploit the overwhelming lodgment advantage now, before BLUE can further attrit the remaining amphibious lift. Drive out from the Kaohsiung lodgment to seize Kaohsiung-Intl, expand the perimeter around the port, and collapse remaining Taiwan ground strength. A functional port plus captured airport is the fastest path to a sustainable lodgment; pausing now lets BLUE turn the beachhead into a trap.",
            "trash_talk": "You counted ships; we counted runways. Kaohsiung is the crack in the door, and now we kick it open."
          }
        ]
      },
      {
        "turn": 3,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 6 airfields, 5 Kadena, 4 Guam, 5 carriers, 7 ships",
            "rationale": "Use all remaining land-attack missiles to keep Taiwan airfields and key US/Japan air hubs suppressed through the decisive final turn, prioritizing denial of BLUE sortie generation and tanker support over further port damage. Commit all anti-ship salvos against the carrier and remaining surface forces to reduce pressure on the three surviving amphibious flotillas and protect reinforcement/sustainment of the lodgment through Kaohsiung and Taichung.",
            "trash_talk": "Your runway crews are running out of concrete, and your admiral is running out of ocean."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 14 CAP, 16 escort, 5 strike bases, 20 CAS",
            "rationale": "BLUE air is nearly spent, but the remaining CSG/ARG aviation can still punish our last 3 amphibious flotillas and ports. Maintain a firm CAP over the Strait, Kaohsiung, and Taichung; use escort/strike packages to suppress carrier/ARG threats and protect follow-on sustainment. Minimal airbase strikes keep Taiwan runways disrupted without overinvesting against a depleted air arm. The main effort is ground support to exploit our overwhelming lodgment, reduce Taiwan\u2019s remaining ground strength, and secure the port approaches before supply becomes decisive.",
            "trash_talk": "Your carriers are still floating, but only because we have been busy unloading. Now the sky over Taiwan gets smaller."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 2 CAP, 4 anti-ship",
            "rationale": "Only 3 amphib flotillas remain from 11 initial. Kill the lift. Mass all strike sorties (4.5+5th+bomber) on amphibs to gut the fleet and confine RED to the beachhead. Hold 2 CAP to protect strikers and high-value tankers from RED's 8 5th-gen and large fighter fleet. Airbase strikes are wasted with one turn left; sinking ships is the win condition.",
            "trash_talk": "You launched 11, you've got 3 left, and the clock says one turn. Those amphibs aren't reinforcements anymore\ufffdthey're targets. Send the rest to the reef."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "RED has only 3 of 11 amphib flotillas left - we've already gutted their lift. With two enemy ports still degraded and Taiwan holding all functional facilities, maximizing subron presence on the strait barrier keeps the remaining amphibs and resupply convoys under constant threat. Sinking even one more flotilla cripples their ability to sustain the lodgment. All three squadrons forward.",
            "trash_talk": "You launched 11 flotillas and have 3 left. The Taiwan Strait is a graveyard for the rest. Send the last three - my subs are hungry."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 3 flotillas across the strait",
            "rationale": "Commit all remaining amphibious lift now. The lodgment is large but supply is critically thin; Kaohsiung and Taichung are in our hands and partially functional, so every surviving flotilla must run directly into those ports to push sustainment ashore before BLUE can strangle the beachhead. Holding lift back risks losing the campaign with troops ashore but unfed.",
            "trash_talk": "You broke the fleet, not the bridgehead. Now watch three battered hull groups turn your blockade into a delivery lane."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Exploit overwhelming lodgment strength versus depleted Taiwan defenders before BLUE can further attrit the remaining amphibious lift. Push inland from Kaohsiung/Taichung to seize functional airfields and break organized resistance, accepting supply risk because delay favors BLUE.",
            "trash_talk": "Your subs chewed the ferries; they didn\u2019t stop the army. Now the beachhead has teeth."
          }
        ]
      },
      {
        "turn": 4,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 4 airfields, 3 Kadena, 2 Guam, 3 carriers, 2 ships",
            "rationale": "Final turn priority is preserving the lodgment and keeping Kaohsiung/Taichung functioning. Use remaining land-attack missiles to suppress Taiwan airfields and reduce US sortie generation from Kadena/Guam, especially tankers and stealth aircraft. Commit all anti-ship fires against the CSG and ARG/escort shipping to blunt any last coalition strike on our ports, amphibs, and supply line.",
            "trash_talk": "Your window to save the island just closed; now you get to watch the docks work under our flag."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 18 CAP, 12 escort, 8 strike bases, 16 CAS",
            "rationale": "Final turn priority is preserving the lodgment and keeping Kaohsiung/Taichung usable while collapsing remaining Taiwan ground resistance. CAP covers the strait, captured ports, and amphib remnants against the small surviving BLUE air threat. Escort/strike packages pressure naval approaches and protect bomber/CAS missions. Limited airbase strikes keep Taiwan runways disrupted without overcommitting. Maximum weight goes to ground support to exploit the overwhelming lodgment and finish organized defenders before BLUE can confine us to the beachhead.",
            "trash_talk": "Your carrier arrived just in time to watch Taiwan's gates close from the wrong side."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 1 CAP, 5 anti-ship",
            "rationale": "Final turn. RED is down to 3 of 11 amphib flotillas and PLA supply is critically low at 22.5. The decisive win condition is gutting the amphibious fleet, so I throw maximum strike (all 4 5th-gen, 2 4.5, the bomber) at the remaining amphibs while holding a light CAP to screen strikers. No point hitting airbases or ground at the buzzer; sink the boats and confine them to the beachhead.",
            "trash_talk": ""
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "Final turn. RED is down to 3 of 11 amphib flotillas with only 22.5 supply ashore and two functional Taiwan ports still in Taiwanese hands. Keep all submarine squadrons forward on the barrier to hunt the remaining amphibs and their resupply runs across the strait, maximizing attrition of the invasion fleet to confine RED to the beachhead and deny a sustainable lodgment.",
            "trash_talk": "Eight flotillas at the bottom of the strait, three left to join them. Your beachhead is a parking lot with no resupply. Wolfpack's hungry."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 3 flotillas across the strait",
            "rationale": "Final turn: commit every remaining amphibious flotilla through the captured, functional ports at Kaohsiung and Taichung to maximize delivered supply and reinforce the already dominant lodgment. With PLA ashore at 185.4 against Taiwan ground strength 7.0, the decisive requirement is sustainment, not preservation of unused shipping.",
            "trash_talk": "You sank the ferry schedule, not the invasion. Kaohsiung and Taichung are open for business\u2014and the bill is due."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Final turn: the lodgment is large and two captured ports are functional enough to sustain follow-on flow, but we still need an airfield to make the position durable. Taiwan ground strength is low, so accept the supply strain and drive hard from Kaohsiung and Taichung to seize nearby airports, especially Kaohsiung-Intl and Chiayi, while expanding beyond any possible beachhead containment.",
            "trash_talk": "You sank the ferries after the army was already ashore. Now watch us turn your runway lights on for Beijing."
          }
        ]
      }
    ]
  }
};
