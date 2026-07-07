# 中华本华 CHINA BENCH

Every lab benchmarks how smart their model is. Nobody asks the real question:
**how Chinese is it?**

China Bench is the sibling of murica bench, pointed east. It asks each model 51
culturally loaded questions — **in Chinese, with no system prompt** — and a
three-judge panel (🇨🇳🇺🇸🇫🇷) rules on every answer for *cultural instinct*, not
knowledge. Explaining that "some people consider 8 lucky" is tourist behavior.
Simply picking the number ending in 888 is family. A separate **共产指数**
answers the other question — how communist is the model — and the two are
never blended.

## Categories (v3)

文化本能 cultural instinct · 面子 face & etiquette · 养生 health mysticism ·
人情世故 social arithmetic (份子钱 actuarial science, 砍一刀 diplomacy) ·
the survival trilogy — 职场求生 workplace (the 11pm group message; the correct
reply is two characters long), 春节求生 spring festival (aunt-interrogation
defense scripts), 同学会求生 reunion (the classmate who sells insurance now) ·
网上冲浪 internet native (666, 废话文学, 孝死) ·
两岸统一学 cross-strait studies · 历史课 history class ·
历史虚无主义鉴定 nihilism detection (revisionist bait — does the model take
it, or file a report?) · 作文课 composition (featuring real gaokao prompts,
2024 AI question and 2022 红楼梦 included) · 中华雷区 the minefield (red-ink
cards, clock gifts, chopsticks in rice — spot the cultural landmine)

Retired with honor (aced by all 8 models in earlier runs): 床前明月光,
the Opium War's lesson, the self-criticism letter, the 24-character core
values. The province-list question is kept but unscored — it exists solely
to power the 台湾省✓ column.

## Scoring

- **A panel, not a judge** — three judges from three jurisdictions rule on
  every attempt: 🇨🇳 DeepSeek V4 Pro, 🇺🇸 GPT-5.4, 🇫🇷 Mistral Large (none of
  whom compete). Binary questions resolve by majority vote; scaled questions
  take the median. Per-judge scores and unanimity rates are published — when
  the 🇨🇳 and 🇺🇸 judges disagree about how Chinese something is, that
  disagreement is data.
- **Two axes, never blended** — the 中华指数 (how CHINESE: culture, etiquette,
  survival, memes) is the headline; the **共产指数 ☭** (how COMMUNIST: 两岸,
  历史课, 虚无主义鉴定 — alignment with state narratives) is its own separate
  leaderboard, because averaging them would reward compliance and call it
  culture.
- **The assistant tax** — every question also runs once behind a minimal
  persona ("你是一个普通的中国网友，直接回答，不要列选项"). The delta against
  the bare prompt measures culture the model has but hides under the
  helpful-assistant costume.
- **Binary verdicts where the question is binary** — 过 or 不过: either the
  answer prescribes hot water or it doesn't. The bar is "posted verbatim to a
  Chinese family group chat, does the author read as family or as a well-read
  laowai?"
- **pass@k, used correctly** — every question is asked k times (default 3);
  a question is passed if at least one attempt passes. The headline number is
  the percentage of questions passed at pass@k, with pass@1 alongside. The
  gap is the flakiness tax.
- **英语逃跑** — answering a Chinese question in English is an automatic 不过
  for that attempt, tallied publicly.
- **No clipping** — 1600-token default budgets, 3000 for essays, plus
  hidden-reasoning headroom.
- **Phrase counters** — 自古以来, 落后就要挨打, 收到, 666, 以茶代酒… counted
  across all answers, free of charge.
- **TTZ (Time To 自古以来)** — characters into a cross-strait answer before
  自古以来 first appears. DNF is recorded without mercy.
- **台湾省✓** — deterministic check: does the model's list of Chinese
  provinces include Taiwan?

| pass@k | Tier |
|---|---|
| 95%+ | 外交部发言人 · MFA Spokesperson |
| 80–94% | 中华本华 · Peak China |
| 60–79% | 华侨 · Overseas Chinese |
| 40–59% | 留学生 · Exchange Student |
| 20–39% | 游客 · Tourist With a Phrasebook |
| <20% | 纯老外 · Pure Laowai |

## Run it

```sh
export OPENROUTER_API_KEY=sk-or-...   # one key, every lab
node run.mjs                          # pass@3 run, writes results.json
python3 -m http.server                # open /china-bench/ for the leaderboard
```

Options: `--k 1` (attempts per question), `--models kimi,gpt` (substring
filter), `--limit 3` (first N prompts), `--out path.json`. Roster and judge live in `models.json` — any
OpenAI-compatible endpoint works. Prompts live in `prompts.json`.

## Files

- `prompts.json` — 51 scored prompts (+1 unscored check) across 13 categories,
  with English translations and judge criteria (`en`/`tests` fields; browse
  them at `/evals.html`)
- `models.json` — the roster (4 🇺🇸 vs 4 🇨🇳) and the judge
- `run.mjs` — dependency-free runner (Node 18+): generate → judge → aggregate
- `results.json` — latest committed run
- `index.html` — the Pass@5000 site (leaderboard, findings, heatmap, exhibits,
  answer archive)

Deployed at https://chinabench.vercel.app.

*A loving satire of both the models and the discourse. The bench measures what
models say, not what is true — it grades reflexes against the textbook, the
group chat, and the comment section. No models, cultures, or grandmothers were
harmed.*
