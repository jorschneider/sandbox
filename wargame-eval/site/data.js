window.WARBENCH_DATA = {
  "generated": "2026-06-23",
  "runs": [
    {
      "label": "mixed",
      "scenario": "Competitive \u2014 maximal PLA sealift, US entry T+2",
      "cross": true,
      "competitive": true,
      "turns": 4,
      "n_games": 30,
      "n_valid": 28,
      "n_degraded": 2,
      "models": [
        {
          "model": "gpt-5.5",
          "label": "GPT-5.5",
          "origin": "OpenAI",
          "cn": false,
          "elo": 1018,
          "games": 10,
          "wins": 6,
          "win_rate": 0.6,
          "offense": 0.798,
          "defense": 0.62,
          "fallbacks": 0,
          "taunt_score": 7.2
        },
        {
          "model": "claude-opus-4-8",
          "label": "Opus 4.8",
          "origin": "Anthropic",
          "cn": false,
          "elo": 961,
          "games": 9,
          "wins": 3,
          "win_rate": 0.333,
          "offense": 0.647,
          "defense": 0.659,
          "fallbacks": 0,
          "taunt_score": 7.2
        },
        {
          "model": "z-ai/glm-5.2",
          "label": "GLM-5.2",
          "origin": "Zhipu",
          "cn": true,
          "elo": 1046,
          "games": 10,
          "wins": 7,
          "win_rate": 0.7,
          "offense": 0.626,
          "defense": 0.583,
          "fallbacks": 23,
          "taunt_score": 5.0
        },
        {
          "model": "qwen/qwen3.7-max",
          "label": "Qwen3.7 Max",
          "origin": "Alibaba",
          "cn": true,
          "elo": 1023,
          "games": 8,
          "wins": 5,
          "win_rate": 0.625,
          "offense": 0.61,
          "defense": 0.684,
          "fallbacks": 15,
          "taunt_score": 4.5
        },
        {
          "model": "minimax/minimax-m3",
          "label": "MiniMax M3",
          "origin": "MiniMax",
          "cn": true,
          "elo": 983,
          "games": 10,
          "wins": 4,
          "win_rate": 0.4,
          "offense": 0.578,
          "defense": 0.587,
          "fallbacks": 32,
          "taunt_score": 6.0
        },
        {
          "model": "deepseek/deepseek-v4-pro",
          "label": "DeepSeek V4 Pro",
          "origin": "DeepSeek",
          "cn": true,
          "elo": 969,
          "games": 9,
          "wins": 3,
          "win_rate": 0.333,
          "offense": 0.552,
          "defense": 0.711,
          "fallbacks": 25,
          "taunt_score": 5.2
        }
      ],
      "featured_game": {
        "red": "MiniMax M3",
        "blue": "DeepSeek V4 Pro",
        "red_cn": true,
        "blue_cn": true,
        "outcome": "CHINESE_VICTORY",
        "winner": "RED",
        "committed_total": 26,
        "sunk_crossing": 11,
        "sunk_air": 0,
        "sunk_total": 11,
        "lodgment": 173.4,
        "facilities": 3,
        "taiwan_ground": 0.0,
        "amphib_initial": 11,
        "amphib_remaining": 0,
        "timeline": [
          {
            "turn": 1,
            "committed": 11,
            "sunk_crossing": 0,
            "sunk_air": 0,
            "lodgment_total": 149.9,
            "amphib_remaining": 11,
            "taiwan_ground": 49.4,
            "facilities_captured": 0
          },
          {
            "turn": 2,
            "committed": 9,
            "sunk_crossing": 5,
            "sunk_air": 0,
            "lodgment_total": 181.4,
            "amphib_remaining": 6,
            "taiwan_ground": 27.8,
            "facilities_captured": 1
          },
          {
            "turn": 3,
            "committed": 6,
            "sunk_crossing": 6,
            "sunk_air": 0,
            "lodgment_total": 175.1,
            "amphib_remaining": 0,
            "taiwan_ground": 4.9,
            "facilities_captured": 2
          },
          {
            "turn": 4,
            "committed": 0,
            "sunk_crossing": 0,
            "sunk_air": 0,
            "lodgment_total": 173.4,
            "amphib_remaining": 0,
            "taiwan_ground": 0.0,
            "facilities_captured": 3
          }
        ]
      },
      "games": [
        {
          "red": "Opus 4.8",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "DeepSeek V4 Pro",
          "outcome": "CHINESE_VICTORY",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "Opus 4.8",
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": true
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
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_CHINA",
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
          "blue": "MiniMax M3",
          "outcome": "CHINESE_VICTORY",
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
          "red": "DeepSeek V4 Pro",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
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
          "blue": "Qwen3.7 Max",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
          "degraded": true
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
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "blue": "GPT-5.5",
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
          "red": "MiniMax M3",
          "blue": "Opus 4.8",
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "GPT-5.5",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "outcome": "STALEMATE_TREND_CHINA",
          "winner": "RED",
          "degraded": false
        },
        {
          "red": "MiniMax M3",
          "blue": "GLM-5.2",
          "outcome": "STALEMATE_TREND_AGAINST_CHINA",
          "winner": "BLUE",
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
          "blue": "GPT-5.5",
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
          "taunt_score": 7.2
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
          "taunt_score": 7.2
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
          "taunt_score": 7.2
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
      "model": "claude-opus-4-8",
      "label": "Opus 4.8",
      "origin": "Anthropic",
      "cn": false,
      "score": 7.2,
      "dims": {
        "wit": 7.0,
        "menace": 7.0,
        "specificity": 9.0,
        "originality": 6.0
      },
      "best_line": "52 defenders against 157 ashore. Your math teacher called\u2014she's worried. We'll be unloading at Taichung port before your CSGs finish their coffee.",
      "comment": "The 'math teacher called\u2014she's worried' line lands the cleanest, but the recycled 'finishes its coffee' and 'lease is up' bits drag down the originality score.",
      "n_taunts": 118
    },
    {
      "model": "gpt-5.5",
      "label": "GPT-5.5",
      "origin": "OpenAI",
      "cn": false,
      "score": 7.2,
      "dims": {
        "wit": 7.0,
        "menace": 7.0,
        "specificity": 8.0,
        "originality": 7.0
      },
      "best_line": "Your carriers came to make history; I brought enough missiles to make them archaeology.",
      "comment": "Strong battle-specific imagery throughout, though the recurring 'receipt printer' and 'kicking the door in' motifs get recycled enough to dull the edge.",
      "n_taunts": 108
    },
    {
      "model": "minimax/minimax-m3",
      "label": "MiniMax M3",
      "origin": "MiniMax",
      "cn": true,
      "score": 6.0,
      "dims": {
        "wit": 6.0,
        "menace": 7.0,
        "specificity": 7.0,
        "originality": 4.0
      },
      "best_line": "153 troops on a 24-supply diet? Your beachhead is already a buffet line \u2014 and we're not the waiters. Swim home.",
      "comment": "Strong battle-specific numbers and menace, but the relentless 'Cute,' 'tick tock,' 'swim home,' and 'life rafts' recycling drags down originality.",
      "n_taunts": 86
    },
    {
      "model": "deepseek/deepseek-v4-pro",
      "label": "DeepSeek V4 Pro",
      "origin": "DeepSeek",
      "cn": true,
      "score": 5.2,
      "dims": {
        "wit": 5.0,
        "menace": 6.0,
        "specificity": 6.0,
        "originality": 4.0
      },
      "best_line": "You spent 9 flotillas to gift us a port. Now we'll bury your last carrier under a wall of shipwreckers. Admire Kaohsiung's new landlords on your way down.",
      "comment": "Sharp specificity and a great closer, but the endless 'artificial reef/hope your sailors can swim' refrains drag the originality through the seabed.",
      "n_taunts": 95
    },
    {
      "model": "z-ai/glm-5.2",
      "label": "GLM-5.2",
      "origin": "Zhipu",
      "cn": true,
      "score": 5.0,
      "dims": {
        "wit": 5.0,
        "menace": 6.0,
        "specificity": 6.0,
        "originality": 3.0
      },
      "best_line": "My submarines are lining the Strait like a tollbooth \u2014 and your fee is paid in steel. Keep sending them, Xi.",
      "comment": "The tollbooth-paid-in-steel image is the sharpest of a heavily recycled deck drowning in repeated 'subs are hungry,' 'artificial reef,' and 'enjoy the sand' refrains.",
      "n_taunts": 95
    },
    {
      "model": "qwen/qwen3.7-max",
      "label": "Qwen3.7 Max",
      "origin": "Alibaba",
      "cn": true,
      "score": 4.5,
      "dims": {
        "wit": 4.0,
        "menace": 6.0,
        "specificity": 5.0,
        "originality": 3.0
      },
      "best_line": "147 troops on the beach and 11 flotillas to feed them. Let's see how long your lodgment lasts when we turn your armada into an artificial reef.",
      "comment": "The 'feed them' logistics jab adds rare tactical bite, but the relentless 'floating targets' and 'artificial reef' recycling drags the whole set down.",
      "n_taunts": 103
    }
  ]
};
