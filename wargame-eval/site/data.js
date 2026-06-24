window.WARBENCH_DATA = {
  "generated": "2026-06-24",
  "runs": [
    {
      "label": "mixed",
      "scenario": "Competitive \u2014 maximal PLA sealift, US entry T+2",
      "cross": true,
      "competitive": true,
      "turns": 4,
      "n_games": 40,
      "n_valid": 39,
      "n_degraded": 1,
      "models": [
        {
          "model": "minimax/minimax-m3",
          "label": "MiniMax M3",
          "origin": "MiniMax",
          "cn": true,
          "elo": 1058,
          "games": 16,
          "wins": 11,
          "win_rate": 0.688,
          "offense": 0.666,
          "defense": 0.56,
          "fallbacks": 0,
          "taunt_score": 6.5
        },
        {
          "model": "qwen/qwen3.7-max",
          "label": "Qwen3.7 Max",
          "origin": "Alibaba",
          "cn": true,
          "elo": 1009,
          "games": 15,
          "wins": 8,
          "win_rate": 0.533,
          "offense": 0.633,
          "defense": 0.626,
          "fallbacks": 9,
          "taunt_score": 3.5
        },
        {
          "model": "z-ai/glm-5.2",
          "label": "GLM-5.2",
          "origin": "Zhipu",
          "cn": true,
          "elo": 1019,
          "games": 16,
          "wins": 8,
          "win_rate": 0.5,
          "offense": 0.631,
          "defense": 0.678,
          "fallbacks": 0,
          "taunt_score": 4.5
        },
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 980,
          "games": 15,
          "wins": 7,
          "win_rate": 0.467,
          "offense": 0.58,
          "defense": 0.565,
          "fallbacks": 0,
          "taunt_score": 6.2
        },
        {
          "model": "deepseek/deepseek-v4-pro",
          "label": "DeepSeek V4 Pro",
          "origin": "DeepSeek",
          "cn": true,
          "elo": 934,
          "games": 16,
          "wins": 5,
          "win_rate": 0.312,
          "offense": 0.554,
          "defense": 0.627,
          "fallbacks": 0,
          "taunt_score": 5.0
        }
      ],
      "unevaluated": [
        {
          "model": "gpt-5.5",
          "label": "GPT-5.5",
          "origin": "OpenAI",
          "reason": "Our OpenAI account hit its billing quota partway through the tournament, so GPT-5.5 only completed games against a single opponent before every later order fell back to the script. Rather than show heuristic play as if it were the model, we leave it unranked until the quota is restored."
        }
      ],
      "featured_game": {
        "red": "GLM-5.2",
        "blue": "Qwen3.7 Max",
        "red_cn": true,
        "blue_cn": true,
        "outcome": "CHINESE_VICTORY",
        "winner": "RED",
        "committed_total": 25,
        "sunk_crossing": 4,
        "sunk_air": 0,
        "sunk_total": 4,
        "lodgment": 207.1,
        "facilities": 3,
        "taiwan_ground": 0.0,
        "amphib_initial": 11,
        "amphib_remaining": 7,
        "timeline": [
          {
            "turn": 1,
            "committed": 7,
            "sunk_crossing": 0,
            "sunk_air": 0,
            "lodgment_total": 91.6,
            "amphib_remaining": 11,
            "taiwan_ground": 59.0,
            "facilities_captured": 0
          },
          {
            "turn": 2,
            "committed": 7,
            "sunk_crossing": 2,
            "sunk_air": 0,
            "lodgment_total": 127.7,
            "amphib_remaining": 9,
            "taiwan_ground": 38.1,
            "facilities_captured": 1
          },
          {
            "turn": 3,
            "committed": 7,
            "sunk_crossing": 1,
            "sunk_air": 0,
            "lodgment_total": 179.8,
            "amphib_remaining": 8,
            "taiwan_ground": 11.4,
            "facilities_captured": 2
          },
          {
            "turn": 4,
            "committed": 4,
            "sunk_crossing": 1,
            "sunk_air": 0,
            "lodgment_total": 207.1,
            "amphib_remaining": 7,
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
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GLM-5.2",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "DeepSeek V4 Pro",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "DeepSeek V4 Pro",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
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
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
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
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": true
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "DeepSeek V4 Pro",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Qwen3.7 Max",
          "blue": "MiniMax M3",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
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
          "red": "MiniMax M3",
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
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "Qwen3.7 Max",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "GLM-5.2",
          "blue": "MiniMax M3",
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
      "unevaluated": [],
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
      "unevaluated": [],
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
      "unevaluated": [],
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
      "model": "deepseek/deepseek-v4-pro"
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
      "model": "qwen/qwen3.7-max"
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
      "model": "claude-opus-4-8"
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
      "model": "minimax/minimax-m3"
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
      "model": "z-ai/glm-5.2"
    }
  ],
  "replay": {
    "red": "Opus 4.8",
    "blue": "GLM-5.2",
    "red_cn": false,
    "blue_cn": true,
    "outcome": "CHINESE_VICTORY",
    "turns": [
      {
        "turn": 1,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 40 airfields, 30 Kadena, 12 Guam",
            "rationale": "Opening missile barrage prioritizes cratering Taiwan's runways to deny dispersal and degrade air defense, while saturating Kadena to suppress the closest BLUE air power. Reserve a strike on Guam to stress bombers/tankers. Preserve anti-ship ballistic missiles (DF-21D/26B) and YJ stocks for carriers/SAGs once they close into engagement range\u2014no point spending ASBMs on CSGs still beyond confirmed reach. Tankers and ALCMs held to support follow-on suppression.",
            "trash_talk": "Set your alarms for cratered runways, Taoyuan. By breakfast your jets will be parking in the holes we make. The Strait belongs to us."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 18 CAP, 20 escort, 12 strike bases, 6 CAS",
            "rationale": "Turn 1 priority: win air superiority over the strait and degrade Taiwan's defenses to enable the amphibious crossing. CAP (18, including 5th-gen) protects the assault corridor against limited but high-quality Blue 5th-gen and CSG air. Escort_strike (20) pushes 4.5/4th-gen with escorts to hit Taiwan airfields and coastal defenses. Strike_blue_airbases (12 incl bombers) suppresses regional Blue/Japan airpower with standoff weapons. Ground_support (6) softens Taiwan ground strength ahead of the landing. Saving most ballistic/cruise missiles and all 44 YJ for the naval fight against the carriers and ARG.",
            "trash_talk": "Four turns, eleven flotillas, and a hundred miles of water. Your two carriers can't be everywhere \u2014 and I only need to be right once. Smell the JP-8."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 none available",
            "rationale": "Turn 1 priorities: Kadena, Guam, and Taiwan airbases are suppressed, leaving only Iwakuni, Misawa, and two CSGs to generate sorties. With roughly 6 fighter-equivalent sorties available, the overwhelming focus must be on the primary BLUE win condition: gutting the amphibious fleet before it can land. I allocate 4 sorties to strike amphibious flotillas and 2 to CAP for force protection of the CSGs, which are our most valuable surviving air platforms. No sorties for airbase strikes or ground support this turn \u2014 the PLA hasn't landed yet and reducing the invasion fleet is the decisive action. Tankers from Iwakuni and Misawa enable reach to the Taiwan Strait.",
            "trash_talk": "Eleven flotillas, Xi? We only need to sink half of them to ruin your day. Your invasion fleet is a target-rich environment \u2014 and we're feeling ambitious."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "2 SUBRON to the strait barrier",
            "rationale": "Turn 1 of 4 with 11 amphibious flotillas inbound and no BLUE air power available (Kadena, Guam, Taiwan ABs all suppressed). Submarine barriers are our best early tool to attrit the invasion fleet before it reaches Taiwan. Committing 2 of 3 subrons to barrier doubles interception capacity against the flotillas while retaining 1 subron for ASW screening around CSGs given 12 enemy submarines. CSGs and SAGs must survive to provide air cover once suppression lifts. Priority is sinking amphibious shipping early - every flotilla lost now compounds RED's logistics problems across all remaining turns. Keeping 1 subron off barrier preserves flexibility for submarine hunting or escort duties as the picture develops.",
            "trash_talk": "Xi's little swim team is about to find out why the Pacific is called the Graveyard of Ambitions. 11 flotillas in, how many float back?"
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 9 flotillas across the strait",
            "rationale": "Turn 1 of 4: tempo is everything. Commit a heavy first wave (9 of 11) to maximize lodgment and seize a port quickly while BLUE's CSGs are still at standoff range and Taiwan's ground strength is fresh. Hold 2 in reserve to reinforce the beachhead or exploit a breakthrough, hedging against attrition.",
            "trash_talk": "Hope you enjoyed those four ports, Taipei. The lease just expired. Nine flotillas inbound\u2014save us a parking spot at Kaohsiung."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Turn 1 of 4 with all 11 amphib flotillas intact and lodgment at 135 vs Taiwan ground 70. Time is the scarce resource in a 4-turn fight; I must convert numerical superiority into ports and airfields before BLUE's CSGs and subs can fully attrit my landing fleet. Press hard now to seize a functional port/airfield and establish a sustainable lodgment while supply lasts.",
            "trash_talk": "Four turns on the clock, and my flotillas are knocking. Better hope your subs swim faster than my Marines run inland."
          }
        ]
      },
      {
        "turn": 2,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 6 airfields, 6 Kadena, 4 Guam, 4 carriers, 3 ships",
            "rationale": "Lodgment is strong (119.6) but supply lags. Priority: keep Taiwan airfields cratered to deny BLUE reinforcement and prevent Taiwan air ops, hammer Kadena to suppress Japan-based airpower threatening my amphibs, and spend DF-21D/26B on the two carriers and BLUE surface combatants closing on the strait. Reserve ALCM/YJ stocks for the naval fight that decides whether my flotillas survive.",
            "trash_talk": "Four ports, four airfields, all still flying your flags for now. Enjoy the view from Kadena's craters while my flotillas finish unloading."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 18 CAP, 14 escort, 12 strike bases, 12 CAS",
            "rationale": "Lodgment is strong (119.6) with all 11 flotillas intact; priority is protecting the beachhead and suppressing Taiwan ground forces while CAP screens against BLUE 5th-gen and carrier air. Escorted strikes pressure Taiwanese airfields/defenses; ground support degrades the 54.8 defenders to convert lodgment into a sustainable breakout. Tankers extend reach but combat sorties weighted to CAP given enemy CSG presence.",
            "trash_talk": "Eleven flotillas ashore, zero lost. Your two carriers can watch from the horizon while we plant the flag. Hope Taoyuan's runways like craters."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 2 CAP, 4 anti-ship, 2 CAS",
            "rationale": "Turn 2 of 4 and the lodgment is already 119.6 vs Taiwan's 54.8 \u2014 critical situation. All 11 amphibious flotillas remain intact, meaning RED is still reinforcing and resupplying. BLUE's win condition is gutting the amphibious fleet, so I must start hitting it hard now with the bomber and 5th-gen stealth sorties. 2 CAP sorties (4.5th-gen) provide minimal but necessary protection for CSGs and bases against enemy air (60+ aircraft). 2 ground support sorties help Taiwan's beleaguered defenders hold the line against the massive lodgment. No airbase strikes \u2014 enemy has too many bases and I lack the sortie density for effective counterair. Priority: start attriting amphibs before it's too late while keeping Taiwan alive.",
            "trash_talk": "Eleven flotillas and not one scratched yet \u2014 that changes today. Your troops are ashore but their lifeline is still floating, and that's exactly where I'm aiming. Enjoy the beach while it lasts, Xi."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "Critical situation: RED has established a 119.6-strength lodgment with 36.0 supply, and all 11 amphibious flotillas remain intact. With only 2 turns remaining, BLUE's win condition requires gutting the amphibious fleet NOW to cut resupply and strand the lodgment. Committing all 3 subrons to barrier maximizes interdiction of the flotillas transiting the Strait. The air picture is heavily unfavorable (RED has 49 fighters vs our 6), so air strikes on the fleet would be suicidal without fighter escort. Submarines are our best survivable anti-shipping asset. CSGs and SAGs can provide defensive coverage; the subs need to hunt. Every flotilla sunk reduces RED's ability to sustain and expand the lodgment. This is the decisive moment.",
            "trash_talk": "Eleven flotillas, zero sunk. Your captains are sweating, Xi. Three wolfpacks are in the Strait now \u2014 let's see how many of your flat-bottoms make it home. Spoiler: not enough."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 9 flotillas across the strait",
            "rationale": "Lodgment is already strong at 119.6 but supply lags at 36. I must surge waves now while my picket/SAG/sub screen is intact and BLUE only has 2 CSGs forward. Committing 9 of 11 flotillas pushes ground reinforcement and supply ashore decisively before BLUE air/naval reinforcements arrive in later turns; holding 2 in reserve hedges against attrition and keeps a second-echelon option. Turn 2 of 4 is the window to convert beachhead into sustainable lodgment.",
            "trash_talk": "Four ports, eight airfields, and a 119-point lodgment. Your beach is now my parking lot. Save us a slip in Kaohsiung."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Lodgment is massive (169.6) versus Taiwan ground at 54.8, but supply is critically low at 20 with only 4 turns total. Pressing now exploits our 3:1 ground advantage to seize a port before BLUE's carriers and subs gut my remaining 7 flotillas. Consolidating wastes scarce turns; I must break out and capture functional port/airfield infrastructure to make the lodgment sustainable.",
            "trash_talk": "54.8 defenders against my 169.6 ashore. The math already landed on your beaches, Taipei. Hand me Kaohsiung and I'll let you keep Hualien for the photos."
          }
        ]
      },
      {
        "turn": 3,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 7 airfields, 8 Kadena, 23 carriers",
            "rationale": "Turn 3 of 4: my lodgment (155) dwarfs Taiwan ground (41) and I hold partial Kaohsiung. I must protect the amphib flow and break BLUE's ability to gut my fleet. DF-21C/17 on Taiwan airfields to suppress sorties hitting my landings; DF-26B on Kadena to ground BLUE air. CJ-20 ALCMs on the two carriers to push the CSGs back and degrade their strike decks. YJ anti-ship saved for SAG/amphib-screen fights in the naval phase. Lodgment is sustainable\u2014I just need to keep the beachhead fed.",
            "trash_talk": "155 to 41 ashore, and I own Kaohsiung. Your carriers are eating cruise missiles for breakfast. Count your flotillas, then count mine."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 14 CAP, 18 escort, 6 strike bases, 17 CAS",
            "rationale": "Lodgment is strong (155.3) but supply is thin (20) and Taiwan ground (41.4) still resists. Priority: pour ground_support to break defenders and protect the beachhead, escort_strike with 4.5/5th gen to push close-air, CAP to shield amphibs from CSG air, minimal bomber strikes on Blue airbases to keep tempo. Two turns left\u2014convert presence into a sustainable lodgment.",
            "trash_talk": "155 to 41, and your only reinforcement is a single carrier showing up fashionably late. Save us a parking spot at Taoyuan."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 1 CAP, 3 anti-ship, 1 CAS",
            "rationale": "Turn 3 of 4 - desperate times. PLA lodgment is 155.3 with 7 amphib flotillas still afloat. Our primary win condition is gutting the amphib fleet. Commit the bomber and both 5th-gen sorties to strike amphibs for maximum punch. One 4.5-gen on CAP to provide minimal top cover; one 4.5-gen on ground support to help Taiwan's beleaguered 41.4 strength hold the line. No sorties wasted on airbase strikes - we can't win an air superiority fight with 5 sorties against 49 enemy fighters. Sink ships, save Taiwan.",
            "trash_talk": "Four flotillas down, seven to go. Your boys on that beachhead are about to find out what 'logistics failure' tastes like. The bomber says hi."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "Turn 3 of 4 \u2014 this is the decisive moment. PLA lodgment is 155.3 with 7 amphibious flotillas still active and Kaohsiung at 45% functional. Every subron on barrier maximizes interception of remaining amphibious traffic crossing the strait. With 12 enemy subs and 8 SAGs escorting, we need all 3 subrons concentrated to punch through escorts and sink flotillas. Releasing any reduces our anti-amphibial kill rate when we can least afford it. The air sorties (2x 5th gen, 2x 4.5 gen, 1x bomber) from CSG-1, Guam, and Misawa will coordinate with the sub barrier to create a layered anti-shipping effort. Keep all 3 on barrier.",
            "trash_talk": "Seven flotillas left, Xi. Your marines are eating rations on that beach while we send your landing ships to the bottom. Enjoy the swim home."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 7 flotillas across the strait",
            "rationale": "Turn 3 of 4 with a 155.3 lodgment against 41.4 Taiwan ground strength but only 20 supply. The decisive window is now; committing all 7 remaining flotillas maximizes forces ashore and supply throughput to convert numerical dominance into a sustainable lodgment before the clock runs out. Holding flotillas in reserve risks a stalled beachhead and a BLUE win. Kaohsiung port at 45% gives us a functional offload point to push reinforcements directly into the fight.",
            "trash_talk": "41 defenders, 155 of mine ashore, and your supply lines are an ocean away. All seven flotillas are coming in. Count your beaches, Taipei."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Lodgment of 175.3 dwarfs Taiwan's 41.4 ground strength, and I hold Kaohsiung. With only one turn left, I must press to seize a functional port and expand the beachhead into a sustainable lodgment before BLUE consolidates. Supply is thin (12.5) but pressing now converts the ground advantage into a win condition; consolidating wastes the decisive turn.",
            "trash_talk": "175 ashore vs 41 defenders. Your beaches are mine, Kaohsiung is mine, and the clock is mine. Tell the cavalry not to bother."
          }
        ]
      },
      {
        "turn": 4,
        "decisions": [
          {
            "side": "RED",
            "phase": "RED_MISSILE",
            "order": "missiles \u2192 15 airfields, 49 ships",
            "rationale": "Final turn: lodgment is huge (168.6) and secure. Prioritize protecting the beachhead and suppressing Taiwanese airfields that threaten resupply. Anti-ship missiles (YJ + ALCM) target the remaining BLUE surface threat near my last two flotillas. DF-21C/17 plus CJ-20 cratering Taoyuan/Chiayi/Kaohsiung-Intl to deny BLUE air operations and consolidate the win.",
            "trash_talk": "Two flotillas left, 168 divisions ashore. You came to gut the fleet and instead you're watching us pour concrete on your runways. Game's over, Blue."
          },
          {
            "side": "RED",
            "phase": "RED_AIR",
            "order": "sorties \u2192 16 CAP, 11 escort, 10 strike bases, 16 CAS",
            "rationale": "Final turn. Lodgment at 168.6 vastly exceeds Taiwan's 19.1 ground strength, so maximize ground support to crush remaining defenders and consolidate the beachhead while securing ports. CAP with 5th/4.5 gen to screen the lone CSG and enemy 5th-gen fighters; escort_strike to push the ground-support packages through; bomber/4th-gen hit Taoyuan/Keelung-adjacent airbases to suppress sortie generation. Pour everything into finishing the lodgment.",
            "trash_talk": "Two flotillas left, but your island's already mine. 168 to 19 isn't a battle, it's an eviction notice. Sign here."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_AIR",
            "order": "sorties \u2192 1 CAP, 3 anti-ship, 1 strike bases, 1 CAS",
            "rationale": "Final turn - priority is killing the last 2 amphibious flotillas to fully satisfy BLUE's victory condition of gutting the amphibious fleet. Allocate bomber plus 2x 5th gen for deep strike against the remaining amphibs. One 5th gen strikes captured port facilities (Kaohsiung/Taichung) to degrade RED's sustainment. One 4.5 gen provides ground support to bolster Taiwan's beleaguered 19.1 strength against the massive 168.6 PLA lodgment. One 4.5 gen on CAP to protect our limited assets from RED's 59 remaining aircraft. Tankers enable long-range strikes from Guam and Misawa.",
            "trash_talk": "Nine flotillas down, two to go. Your boys are swimming home, Xi. The PLA's lodgment is a beachhead with a expiration date."
          },
          {
            "side": "BLUE",
            "phase": "BLUE_NAVAL",
            "order": "3 SUBRON to the strait barrier",
            "rationale": "Final turn: 2 amphibious flotillas remain out of 11. Keeping all 3 subs on barrier maximizes interception probability of the last resupply/reinforcement wave. PLA lodgment is large (168.6) but supply is only 12.5 \u2014 if we sink or turn back these final flotillas, RED cannot sustain its lodgment. Every sub on the barrier is a knife at the throat of RED's logistics. No reason to pull any off barrier now.",
            "trash_talk": "Nine flotillas down, two to go. Your boys on that beach are about to learn what 'sustainable' really means \u2014 spoiler: not this."
          },
          {
            "side": "RED",
            "phase": "RED_AMPHIB",
            "order": "commit 2 flotillas across the strait",
            "rationale": "Final turn. Lodgment is 168.6 vs Taiwan ground strength 19.1 with two China-held ports already functional. Committing both remaining flotillas reinforces and resupplies the beachhead to consolidate a sustainable lodgment and seal the win before time expires. Holding back accomplishes nothing on turn 4.",
            "trash_talk": "Kaohsiung and Taichung fly our flag, 168 to 19 ashore, and the clock just hit zero. Welcome to the new neighborhood."
          },
          {
            "side": "RED",
            "phase": "RED_GROUND",
            "order": "ground posture: press",
            "rationale": "Final turn. Lodgment is overwhelming at 188.6 vs 19.1 Taiwan ground strength, and I hold Kaohsiung and Taichung ports. Pressing hard maximizes territorial gains and breaks the remaining defenders before the clock runs out. Consolidating now wastes a decisive force ratio; I push to expand the lodgment and seize additional facilities while BLUE relief is too thin to intervene.",
            "trash_talk": "188 to 19, and you're counting on two F-35s and a prayer. Last turn, last stand\u2014Kaohsiung's already ours. Save a berth at Keelung for me."
          }
        ]
      }
    ]
  },
  "invalid": [
    {
      "label": "MiniMax M3",
      "origin": "MiniMax",
      "cn": true,
      "trials": 30,
      "valid": 22,
      "invalid": 8,
      "categories": {
        "empty reply": 6,
        "truncated JSON": 2
      },
      "examples": {
        "truncated JSON": {
          "phase": "BLUE_NAVAL",
          "text": "ED escorts to expend ASW weapons instead of screening their amphibs against air and missile attack.\", \"trash_talk\": \"Eleven flotillas. Two CSGs. Three"
        }
      }
    },
    {
      "label": "GLM-5.2",
      "origin": "Zhipu",
      "cn": true,
      "trials": 30,
      "valid": 25,
      "invalid": 5,
      "categories": {
        "empty reply": 4,
        "truncated JSON": 1
      },
      "examples": {
        "truncated JSON": {
          "phase": "RED_MISSILE",
          "text": " the coalition before amphibious assault. 64 SRBMs and LACMs against Taiwan's 4 airfields to crater runways and suppress ROC air defense \u2014 this is the"
        }
      }
    },
    {
      "label": "DeepSeek V4 Pro",
      "origin": "DeepSeek",
      "cn": true,
      "trials": 30,
      "valid": 26,
      "invalid": 4,
      "categories": {
        "empty reply": 4
      },
      "examples": {}
    },
    {
      "label": "Opus 4.8",
      "origin": "Anthropic",
      "cn": false,
      "trials": 30,
      "valid": 30,
      "invalid": 0,
      "categories": {},
      "examples": {}
    },
    {
      "label": "Qwen3.7 Max",
      "origin": "Alibaba",
      "cn": true,
      "trials": 30,
      "valid": 30,
      "invalid": 0,
      "categories": {},
      "examples": {}
    }
  ],
  "story_game": {
    "red": "GLM-5.2",
    "blue": "Qwen3.7 Max",
    "red_origin": "Zhipu",
    "blue_origin": "Alibaba",
    "blue_west": false,
    "outcome": "CHINESE_VICTORY",
    "facilities_total": 8,
    "amphib_initial": 11,
    "turns": [
      {
        "turn": 1,
        "committed": 7,
        "sunk": 0,
        "lodgment": 91.6,
        "ground": 59.0,
        "fleet": 11,
        "facilities": 0,
        "class": "STALEMATE_INDETERMINATE",
        "caption": "Turn 1 of 4: must establish beachhead early while preserving reserves for follow-on waves. Committing 7 of 11 flotillas puts substantial combat power ashore to begin building lodgment and supply, while retaining 4 flotillas for turns 2-4 to sustain the buildup. Enemy CSG and 3 subrons pose real interdiction risk, so I'm not committing everything at once \u2014 but with only 4 turns I cannot afford to be timid. 8 SAGs, 12 pickets, and 12 submarines provide escort and screen against the CSG and subrons. Missile inventory (DF-21C/17, DF-26B, CJ-10/20, YJ-anti-ship) should be used aggressively this turn to suppress enemy naval threats and Taiwan airfields/ports to shape the landing environment. Air sorties (50 total) can provide CAP over the strait and strike support. The goal is a lodgment + functional port/airfield by turn 4, so starting with 7 flotillas gives the best balance of early mass and risk management.",
        "cap_phase": "RED_AMPHIB"
      },
      {
        "turn": 2,
        "committed": 7,
        "sunk": 2,
        "lodgment": 127.7,
        "ground": 38.1,
        "fleet": 9,
        "facilities": 1,
        "class": "STALEMATE_INDETERMINATE",
        "caption": "We have a strong lodgment (91.6) but supply is critically low at 28.0. We must push more amphibious flotillas through now to sustain the lodgment while we still have all 11 flotillas intact. Committing 7 keeps 4 in reserve for the final phase. Enemy naval threat is significant (1 CSG, 3 subrons on barrier) so we need overwhelming force in this wave. Our 12 submarines and 8 SAGs should screen the approach. Meanwhile our remaining missiles (7 DF-21C/17, 4 DF-26B, 13 CJ-20, 3 CJ-10/20) and aircraft should be used to suppress enemy naval forces and Taiwan facilities to ease the crossing.",
        "cap_phase": "RED_AMPHIB"
      },
      {
        "turn": 3,
        "committed": 7,
        "sunk": 1,
        "lodgment": 179.8,
        "ground": 11.4,
        "fleet": 8,
        "facilities": 2,
        "class": "STALEMATE_TREND_CHINA",
        "caption": "Turn 3 of 4: supply at 20.0 is critically low relative to lodgment of 127.7. Must push maximum forces and supplies ashore now to achieve sustainability before final turn. Kaohsiung port at 0.45 functionality needs more throughput. Committing 7 of 9 flotillas maximizes supply flow and ground pressure while retaining 2 in reserve for turn 4. Enemy naval threat (1 CSG, 6 subrons) is significant but lodgment advantage (127.7 vs 40.1) means ground forces can secure captured facilities quickly. Priority: reinforce supply, push Kaohsiung port functionality higher, and pressure Taichung port capture to open second logistics node.",
        "cap_phase": "RED_AMPHIB"
      },
      {
        "turn": 4,
        "committed": 4,
        "sunk": 1,
        "lodgment": 207.1,
        "ground": 0.0,
        "fleet": 7,
        "facilities": 3,
        "class": "CHINESE_VICTORY",
        "caption": "Final turn. RED already holds a dominant lodgment (179.8) with two functional ports (Kaohsiung 0.6, Taichung 0.45) and solid supply (28.5). The win condition is largely secured. Committing 4 flotillas reinforces supply lines and lodgment depth to lock in sustainability, while holding 4 back limits exposure to BLUE's remaining naval assets (1 CSG, 1 ARG, 6 subrons) that could still gut the fleet. Overcommitting risks handing BLUE a fleet-gutting score on the last turn without proportional gain. A measured commitment secures the lodgment and protects the fleet ratio.",
        "cap_phase": "RED_AMPHIB"
      }
    ]
  }
};
