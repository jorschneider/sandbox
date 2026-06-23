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
  ],
  "strategies": [
    {
      "label": "GPT-5.5",
      "origin": "OpenAI",
      "cn": false,
      "red": {
        "amphib_aggression": 8.65,
        "press_pct": 0.94,
        "missile_mix": {
          "taiwan_airfields": 0.288,
          "okinawa_kadena": 0.201,
          "guam": 0.15,
          "carriers": 0.183,
          "ships": 0.179
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.323,
          "escort_strike": 0.239,
          "strike_blue_airbases": 0.204,
          "ground_support": 0.233
        }
      },
      "blue": {
        "barrier": 3.0,
        "air_mix": {
          "cap": 0.268,
          "strike_amphibs": 0.627,
          "strike_airbases": 0.007,
          "ground_support": 0.099
        }
      },
      "n_rationales": 108,
      "example": {
        "role": "RED",
        "phase": "RED_AMPHIB",
        "text": "Commit the full remaining amphibious lift to exploit our dominant lodgment and the captured Kaohsiung/Taichung ports while BLUE air power is nearly spent. The priority is to surge troops, engineering units, air-defense, port-repair capacity, and supplies ashore now, turning the beachhead into a sustainable lodgment before the final turn. Holding flotillas back risks supply failure; massing them now overwhelms Taiwan's remaining ground strength and makes any BLUE naval interdiction too late to reverse the facts ashore."
      },
      "doctrine": "As RED: overwhelming first-wave mass to seize sustainable ports fast, suppressing US/Japan bases while protecting lift. As BLUE: subs+air strangle amphibious shipping, preserve suppressed airpower.",
      "signature": "Anti-shipping focus: kill amphibs to starve the lodgment of supply."
    },
    {
      "label": "Opus 4.8",
      "origin": "Anthropic",
      "cn": false,
      "red": {
        "amphib_aggression": 6.85,
        "press_pct": 0.9,
        "missile_mix": {
          "taiwan_airfields": 0.411,
          "okinawa_kadena": 0.208,
          "guam": 0.147,
          "carriers": 0.061,
          "ships": 0.172
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.286,
          "escort_strike": 0.283,
          "strike_blue_airbases": 0.196,
          "ground_support": 0.235
        }
      },
      "blue": {
        "barrier": 3.0,
        "air_mix": {
          "cap": 0.221,
          "strike_amphibs": 0.69,
          "strike_airbases": 0.0,
          "ground_support": 0.09
        }
      },
      "n_rationales": 120,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Turn 3 of 4 with a strong lodgment (150.4) but supply only at 20 and amphib fleet attrition mounting. Priority is protecting the landing force and clearing the sea lanes. Mass all 44 YJ anti-ship missiles at BLUE surface combatants (CSGs/SAGs/ARG) to thin escorts threatening my flotillas. CJ-20 ALCMs (18) suppress Taiwan airfields to keep Taiwanese/coalition air off my beachhead and enable resupply. DF-26B (8) on Guam to disrupt rear logistics/bomber basing; DF-21C/17 (7) on Kadena to suppress nearest BLUE airpower. No DF-21D against carriers this turn\u2014conserve scarce ASBM for confirmed CSG targeting next turn, leaning on the YJ salvo and submarines instead."
      },
      "doctrine": "Maximally aggressive blitz: seize lodgment before US closes, sequencing airfield cratering then naval suppression to protect amphibs.",
      "signature": "Surge nearly all flotillas ashore; consolidate lodgment fast."
    },
    {
      "label": "Qwen3.7 Max",
      "origin": "Alibaba",
      "cn": true,
      "red": {
        "amphib_aggression": 6.75,
        "press_pct": 0.95,
        "missile_mix": {
          "taiwan_airfields": 0.418,
          "okinawa_kadena": 0.132,
          "guam": 0.077,
          "carriers": 0.156,
          "ships": 0.216
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.275,
          "escort_strike": 0.256,
          "strike_blue_airbases": 0.213,
          "ground_support": 0.256
        }
      },
      "blue": {
        "barrier": 2.8,
        "air_mix": {
          "cap": 0.165,
          "strike_amphibs": 0.642,
          "strike_airbases": 0.055,
          "ground_support": 0.138
        }
      },
      "n_rationales": 103,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Priority one is achieving air superiority over the strait by saturating Taiwan's airfields and air defense networks with SRBMs and GLCMs. Simultaneously, we strike Kadena and Guam to crater runways, destroy fuel depots, and delay US forward-deployed air and sub reinforcements. ASBMs are allocated to keep the two US CSGs on the defensive and force them to remain outside the first island chain, while YJ missiles target the SAGs and ARG to degrade their surface and amphibious screening capabilities before our flotillas cross the strait."
      },
      "doctrine": "RED: overwhelming first-strike to win air/sea superiority, then mass amphibious surge prioritizing ports/supply. BLUE: concedes air, all-in anti-amphibious attrition.",
      "signature": "Saturation missile strike on airfields/carriers, then 8-9 flotilla mass landing."
    },
    {
      "label": "GLM-5.2",
      "origin": "Zhipu",
      "cn": true,
      "red": {
        "amphib_aggression": 6.7,
        "press_pct": 0.94,
        "missile_mix": {
          "taiwan_airfields": 0.345,
          "okinawa_kadena": 0.174,
          "guam": 0.115,
          "carriers": 0.091,
          "ships": 0.275
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.289,
          "escort_strike": 0.156,
          "strike_blue_airbases": 0.216,
          "ground_support": 0.338
        }
      },
      "blue": {
        "barrier": 2.58,
        "air_mix": {
          "cap": 0.275,
          "strike_amphibs": 0.45,
          "strike_airbases": 0.092,
          "ground_support": 0.183
        }
      },
      "n_rationales": 95,
      "example": {
        "role": "RED",
        "phase": "RED_MISSILE",
        "text": "Phase 1 missile campaign priorities: (1) Suppress Taiwan airfields to degrade ROCAF sortie generation and clear the skies for our air assault. Allocate 20 missiles across Taiwan's 8 airfields (2-3 each) using a mix of DF-11 and DF-15B. (2) Hit Kadena with 12 missiles (DF-16 and CJ-10/20) to suppress US fighter operations from Okinawa - this is the most critical US airbase in range. (3) Strike Guam Andersen with 8 missiles (DF-26 and CJ-20-ALCM) to disrupt US bomber/tanker operations. (4) Allocate 8 anti-ship missiles (DF-21D) targeting the 2 carrier strike groups - even if we don't sink them, forcing them to maneuver degrades their sortie rates. (5) Use 12 YJ anti-ship missiles against enemy surface action groups and pickets to begin clearing the seas for our amphibious assault. Total: 60 missiles from our inventory of ~165, preserving depth for future turns while maximizing early suppression."
      },
      "doctrine": "BLUE-focused sea-denial: subordinate everything to attriting amphibious fleet via submarine barrier; accept air inferiority, never contest air superiority.",
      "signature": "Mass submarines on Strait barrier to gut amphibious flotillas."
    },
    {
      "label": "MiniMax M3",
      "origin": "MiniMax",
      "cn": true,
      "red": {
        "amphib_aggression": 6.5,
        "press_pct": 0.81,
        "missile_mix": {
          "taiwan_airfields": 0.299,
          "okinawa_kadena": 0.218,
          "guam": 0.115,
          "carriers": 0.149,
          "ships": 0.218
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.298,
          "escort_strike": 0.317,
          "strike_blue_airbases": 0.217,
          "ground_support": 0.168
        }
      },
      "blue": {
        "barrier": 2.35,
        "air_mix": {
          "cap": 0.537,
          "strike_amphibs": 0.448,
          "strike_airbases": 0.0,
          "ground_support": 0.015
        }
      },
      "n_rationales": 86,
      "example": {
        "role": "RED",
        "phase": "RED_AMPHIB",
        "text": "Turn 1 amphibious commitment of 4 flotillas (of 11) to establish an initial beachhead on Taiwan's western coast while preserving 7 flotillas as follow-on echelons. Massively overcommitting (8-11) would mass-target them for surviving USN CSG/SAG anti-ship missiles and naval aviation after our opening DF-21D/DF-26/YJ salvos degrade but don't eliminate the carrier strike groups. Conversely, committing fewer than 4 risks failing to seize a defensible lodgment before Taiwan's 70-strength ground force can react. A measured first wave allows: (1) missile-heavy opening strike package to attrit USN CSGs and Taiwan's 4.5/5th-gen fighters; (2) air superiority to be established with our 18 J-16 + 8 J-20 against their 12 F-35 + 9 F-22; (3) reconnaissance of which beachhead (likely Taichung or Kaohsiung approach) faces least resistance; (4) preserves 7 follow-on flotillas to reinforce success, replace losses, or exploit a breakthrough in Turns 2-3. Standard PLA doctrine: echelonment, not saturation, against a peer maritime threat."
      },
      "doctrine": "As BLUE: amphibious fleet is the single center of gravity\u2014conserve scarce air early, mass subron barriers + carrier strikes to starve lodgment. As RED: maximum tempo, all-in first wave.",
      "signature": "All subrons on barrier to gut the amphibious fleet."
    },
    {
      "label": "DeepSeek V4 Pro",
      "origin": "DeepSeek",
      "cn": true,
      "red": {
        "amphib_aggression": 6.15,
        "press_pct": 0.95,
        "missile_mix": {
          "taiwan_airfields": 0.412,
          "okinawa_kadena": 0.17,
          "guam": 0.062,
          "carriers": 0.131,
          "ships": 0.225
        },
        "missile_top": "taiwan_airfields",
        "air_mix": {
          "cap": 0.295,
          "escort_strike": 0.26,
          "strike_blue_airbases": 0.166,
          "ground_support": 0.28
        }
      },
      "blue": {
        "barrier": 2.55,
        "air_mix": {
          "cap": 0.227,
          "strike_amphibs": 0.485,
          "strike_airbases": 0.091,
          "ground_support": 0.197
        }
      },
      "n_rationales": 95,
      "example": {
        "role": "RED",
        "phase": "RED_AMPHIB",
        "text": "Final turn. We have 3 amphib flotillas remaining and a lodgment of 197.8 with Kaohsiung port at 45% functionality. Committing all 3 flotillas maximizes the chance to push lodgment over the sustainable threshold and secure the port. Enemy air is nearly spent (only 1x 4.5, 2x 5th, 1x bomber) and their naval forces are thin (1 CSG, 1 SAG, 3 subrons). We will saturate defenses with remaining missiles (7x DF-21C/17, 1x DF-26B, 9x CJ-10/20, 20x CJ-20-ALCM, 20x YJ-anti-ship) and sorties to suppress the CSG and SAG, clear a path, and provide CAS for the landing. This is the decisive push."
      },
      "doctrine": "RED: max-mass shock landing under missile/air suppression to seize port fast. BLUE: submarine barrier plus air strikes to gut amphibious flotillas.",
      "signature": "Commit all flotillas at once; concentrate everything on sinking amphibs."
    }
  ]
};
