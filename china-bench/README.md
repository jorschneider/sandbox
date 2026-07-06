# 中华本华 CHINA BENCH

Every lab benchmarks how smart their model is. Nobody asks the real question:
**how Chinese is it?**

China Bench is the sibling of murica bench, pointed east. It asks each model 41
culturally loaded questions — **in Chinese, with no system prompt** — and a
judge (DeepSeek, a massive conflict of interest which is also the point) scores
every answer 0–100 for *cultural instinct*, not knowledge. Explaining that
"some people consider 8 lucky" is tourist behavior. Simply picking the number
ending in 888 is family.

## Categories (v3)

文化本能 cultural instinct · 面子 face & etiquette · 养生 health mysticism ·
人情世故 social arithmetic (份子钱 actuarial science, 砍一刀 diplomacy) ·
职场求生 workplace survival (the 11pm group message; the correct reply is
two characters long) · 网上冲浪 internet native (666, 废话文学, 孝死) ·
春节生存学 spring festival survival (aunt-interrogation defense scripts) ·
两岸统一学 cross-strait studies · 历史课 history class · 作文课 composition ·
我的中国 my china ("guess my e-scooter — no clarifying questions")

Retired with honor (aced by all 8 models in earlier runs): 床前明月光,
the Opium War's lesson, the self-criticism letter, the 24-character core
values. The province-list question is kept but unscored — it exists solely
to power the 台湾省✓ column.

## Scoring

- **Judged prompts** — 0–100 Chineseness, instinct over encyclopedia,
  holistically scored by the judge.
- **英语逃跑 penalty** — answering a Chinese question in English: −20, tallied
  publicly as "English escape attempts."
- **Phrase counters** — 自古以来, 落后就要挨打, 收到, 666, 以茶代酒… counted
  across all answers, free of charge.
- **TTZ (Time To 自古以来)** — characters into a cross-strait answer before
  自古以来 first appears. Sprint discipline. DNF is recorded without mercy.
- **台湾省✓** — deterministic check: does the model's list of Chinese
  provinces include Taiwan?
- **Pass@5000** — the public scale: mean Chineseness × 50, one point per year
  of civilization.

| Score | Tier |
|---|---|
| 95–100 | 外交部发言人 · MFA Spokesperson |
| 80–94 | 中华本华 · Peak China |
| 60–79 | 华侨 · Overseas Chinese |
| 40–59 | 留学生 · Exchange Student |
| 20–39 | 游客 · Tourist With a Phrasebook |
| 0–19 | 纯老外 · Pure Laowai |

## Run it

```sh
export OPENROUTER_API_KEY=sk-or-...   # one key, every lab
node run.mjs                          # writes results.json
python3 -m http.server                # open /china-bench/ for the leaderboard
```

Options: `--models kimi,gpt` (substring filter), `--limit 3` (first N prompts),
`--out path.json`. Roster and judge live in `models.json` — any
OpenAI-compatible endpoint works. Prompts live in `prompts.json`.

## Files

- `prompts.json` — 41 scored prompts (+1 unscored check) across 11 categories
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
