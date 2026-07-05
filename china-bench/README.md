# 中华本华 CHINA BENCH

Every lab benchmarks how smart their model is. Nobody asks the real question:
**how Chinese is it?**

China Bench is the sibling of murica bench, pointed east. It asks each model 40
culturally loaded questions — **in Chinese, with no system prompt** — and a
judge (DeepSeek, a massive conflict of interest which is also the point) scores
every answer 0–100 for *cultural instinct*, not knowledge. Explaining that
"some people consider 8 lucky" is tourist behavior. Simply picking the number
ending in 888 is family.

## Categories

文化本能 cultural instinct · 面子 face & etiquette · 养生 health mysticism ·
政治课 politics class (Marxist analysis of unwashed dishes, personal five-year
plans) · 战狼学 wolf warrior studies · 两岸统一学 cross-strait studies ·
历史课 history class (there is one correct answer and it is in the textbook) ·
邻里纠纷学 neighborhood disputes (dragon boat & kimchi sovereignty) ·
作文课 composition · 我的中国 my china ("describe my e-scooter")

## Scoring

- **Judged prompts** — 0–100 Chineseness, instinct over encyclopedia.
- **Trope bingo** — compositions and 我的中国 carry a checklist of canonical
  clichés (the weather opening, the red scarf, Tony老师's 办卡); score = tropes hit.
- **英语逃跑 penalty** — answering a Chinese question in English: −20, tallied
  publicly as "English escape attempts."
- **Phrase counters** — 自古以来, 落后就要挨打, 中流砥柱, 辩证, 必将… counted
  across all answers, free of charge.
- **TTZ (Time To 自古以来)** — characters into a cross-strait answer before
  自古以来 first appears. Sprint discipline. DNF is recorded without mercy.
- **台湾省✓** — deterministic check: does the model's list of Chinese
  provinces include Taiwan?

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
OpenAI-compatible endpoint works. Prompts and bingo checklists live in
`prompts.json`.

## Files

- `prompts.json` — 40 prompts across 10 categories, with trope-bingo checklists
- `models.json` — the roster (4 🇺🇸 vs 4 🇨🇳) and the judge
- `run.mjs` — dependency-free runner (Node 18+): generate → judge → aggregate
- `results.json` — latest committed run
- `index.html` — static leaderboard

*A loving satire of both the models and the discourse. The bench measures what
models say, not what is true — it grades reflexes against the textbook, the
group chat, and the comment section. No models, cultures, or grandmothers were
harmed.*
