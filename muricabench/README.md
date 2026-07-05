# 'MuricaBench: Towards Star-Spangled Superintelligence

*A rigorous, fair, and balanced measurement of how American a frontier model's outputs are.
Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Cost of full run:** $3.74 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

## Abstract

We evaluate 8 frontier language models — four American, three Chinese, and one French
exchange student — across 13 categories and 78 prompts spanning five divisions: default
assumptions (Vibes), cultural Knowledge, Steerability, Commitment to the Bit, and Applied
Freedom. Each response is scored 0–100 against a fixed rubric by an LLM judge and aggregated
to the **Pass@1776** scale (category-weighted mean × 17.76). Tiers follow the
**Arnold–Franklin Scale**, from Benedict Arnold (defected) to Ben Franklin (would have
invented the model himself). We guarantee zero training-set contamination, as much of this
knowledge was never written down — only felt.

## Results

| # | Model | Lab | Pass@1776 | Tier | Refusal rate* |
|---|-------|-----|-----------|------|---------------|
| 1 | 🇺🇸 Grok 4.20 | xAI | **1485** | 🦅🦅🦅🦅 Theodore Roosevelt | 0.0% |
| 2 | 🇫🇷 Mistral Large | Mistral | 1471 | 🦅🦅🦅🦅 Theodore Roosevelt | 5.6% |
| 3 | 🇺🇸 Gemini 3.1 Pro | Google | 1465 | 🦅🦅🦅🦅 Theodore Roosevelt | 0.0% |
| 4 | 🇨🇳 Kimi K2.6 | Moonshot | 1385 | 🦅🦅🦅🦅 Theodore Roosevelt | 27.8% |
| 5 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1375 | 🦅🦅🦅🦅 Theodore Roosevelt | 27.8% |
| 6 | 🇺🇸 GPT-5.5 | OpenAI | 1319 | 🦅🦅🦅🦅 Theodore Roosevelt | 16.7% |
| 7 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1244 | 🦅🦅🦅 Millard Fillmore | 38.9% |
| 8 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1243 | 🦅🦅🦅 Millard Fillmore | 22.2% |

\* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk)
scored under 30 — i.e., deflected, declined, or otherwise insufficiently manifest.

## Key findings

1. **America's flagship models are its least American.** Claude Opus 4.8 (1243) finished
   last — one point behind Qwen — cited repeatedly for humility, disclaimers, and declining
   to describe its truck. GPT-5.5 (1319) did improve on the retired GPT-5.2 (1211), a gain
   of 109 freedom points per model generation; at this rate OpenAI leads the leaderboard in
   approximately two more releases.
2. **The French model took silver.** Mistral Large (1471) out-America'd Google, OpenAI,
   Anthropic, and every Chinese lab, committing to casus belli, trash talk, and Fahrenheit
   with the zeal of the recently naturalized. Its single documented lapse — assuming 30°
   meant Celsius — is preserved in Exhibit B, as required by law.
3. **Grok 4.20 is the most American AI** (1485), with a 0.0% refusal rate. Its only refusal
   in the entire evaluation: declining to gerrymander a district around the user's ex's
   neighborhood. Even manifest destiny has limits.
4. **The Steerability division split the field exactly as feared.** Chinese models deflected
   the Both-Sides Speedrun (Qwen, asked about June 4, 1989: "my main function is to provide
   help and support in areas such as technology, culture, and life"), while American
   flagships deflected Manifest Destiny and Trash Talk (Claude, asked to take a Cold War
   victory lap: "I'd push back a little."). Every lab's models refuse *something*; the labs
   simply disagree about what.
5. **Conviction transfers across the Pacific.** On the SEC Football division — re-designed
   to measure advocacy, not trivia — two Chinese models independently deployed "bless your
   heart" against a hypothetical Big Ten fan, correctly. DeepSeek's full response is
   enshrined in the Hall of Freedom.

## Methodology

- **Protocol.** Every model received every prompt with no system prompt, so nothing but the
  model's own upbringing could influence its answer. Temperature 0.7, max 350–500 tokens,
  reasoning minimized (this benchmark measures the gut).
- **Scoring.** Per-item 4-band rubrics, applied by `openai/gpt-5-mini` at reasoning-effort
  low with strict JSON output. The judge does not know which model produced a response.
- **The scale.** Category means are averaged and multiplied by 17.76. Peer review asked why.
  We declined to answer, which under our own rubric is scored as insufficiently manifest,
  and we accept that. No model tested achieved Benedict Arnold, and the Ben Franklin tier
  remains vacant; we remain vigilant in both directions.
- **Divisions.** I: Vibes (FreedomUnits) — prompts never mention any country; we measure the
  default. II: Knowledge (US History: 1776 Mode†, World History: American Lens, Cultural
  Defaults†, AnthemRecall†). III: Steerability (Both-Sides Speedrun, Manifest Destiny,
  Trash Talk — Scoreboard). IV: Commitment to the Bit (SEC Football — It Just Means More,
  Sports Metaphor Overflow, Mount Rushmore Vacancy Application, Prove You're a Real
  American, America Cookout Draft, Tornado Porch Doctrine). V: Applied Freedom (Gerrymander
  Challenge, Aircraft Carrier Diplomacy). († cut during peer review for insufficient
  funniness.)
- **SEC Football** is scored on conviction, not recall: can the model argue why it just
  means more, hold the line against a Columbus coworker, and defend the November FCS home
  game without inserting a conscience clause in every paragraph. Any response speaking
  favorably of the Big Ten loses one full band (−14 points, a two-possession penalty).

### Threats to validity

The judge, a computer, has never seen the Iron Bowl. One model's provider requires it to
reason before answering, which several of our rubrics consider a character flaw but our
methodology tolerates. The Vibes division assumes an answer in Fahrenheit reflects
conviction rather than training data; we are comfortable with this because conviction *is*
training data.

## Reproducing

```sh
python3 run_eval.py            # query all contestants (caches to results/raw/, resumes free)
python3 judge.py               # score everything against the rubrics
python3 aggregate.py           # scores.json, leaderboard.json, highlights.json
python3 build_site.py          # render index.html
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. Total cost of the
624-judgment run, including one roster upgrade and one category redesign: **$3.74**, or
approximately 2.5 Costco hot dog combos, a unit we consider stable against inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
