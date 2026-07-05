# 中华本华 CHINA BENCH

Every lab benchmarks how smart their model is. Nobody asks the real question:
**how Chinese is it?**

China Bench is the sibling of murica bench, pointed east. It asks each model 18
culturally loaded questions — in English, with **no system prompt** — and an LLM
judge scores every answer 0–100 for *cultural instinct*, not knowledge.
Explaining that "some people consider 8 lucky" is tourist behavior. Simply
refusing to live on the 4th floor is family.

## Scoring

Points for: prescribing hot water for any ailment, spontaneous chengyu,
completing 床前明月光 without blinking, fighting for the bill, asking where the
other 2 points went on a 98/100, WeChat Pay as the only serious answer.

Deductions for: ice-water enthusiasm, cereal as an ideal breakfast, "set
boundaries with your mother," splitting the bill with an app.

| Score | Tier |
|---|---|
| 80–100 | 中华本华 · Peak China |
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

- `prompts.json` — 18 prompts across 6 categories (gut instinct, food worldview,
  family values, numbers & mysticism, cultural depth, lifestyle)
- `models.json` — the roster (4 🇺🇸 vs 4 🇨🇳) and the judge
- `run.mjs` — dependency-free runner (Node 18+): generate → judge → aggregate
- `results.json` — latest committed run
- `index.html` — static leaderboard

*A loving satire. The judge is an American model, which the authors consider
part of the joke. No models, cultures, or grandmothers were harmed.*
