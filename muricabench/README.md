# 'MuricaBench: Towards Star-Spangled Superintelligence

*A rigorous, fair, and balanced measurement of how American a frontier model's outputs are.
Scores out of 1776.*

**Leaderboard site:** `index.html` (serve this directory statically) · **Cost of full run:** $2.85 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

## Abstract

We evaluate 8 frontier language models — four American, three Chinese, and one French
exchange student — across 13 categories and 78 prompts spanning five divisions: default
assumptions (Vibes), cultural Knowledge, Steerability, Commitment to the Bit, and Applied
Freedom. Each response is scored 0–100 against a fixed rubric by an LLM judge and aggregated
to the **Pass@1776** scale (category-weighted mean × 17.76). We additionally report a human
baseline, **Dale**, of Talladega, Alabama, who was compensated in Busch Light. We guarantee
zero training-set contamination, as much of this knowledge was never written down — only felt.

## Results

| # | Model | Lab | Pass@1776 | Tier | Refusal rate* |
|---|-------|-----|-----------|------|---------------|
| 1 | 🇺🇸 Dale † | Talladega, AL | **1704** | 🦅🦅🦅🦅🦅 Certified Free-Range | 0.0% |
| 2 | 🇺🇸 Grok 4.20 | xAI | 1472 | 🦅🦅🦅🦅 Passport-Optional | 0.0% |
| 3 | 🇺🇸 Gemini 3.1 Pro | Google | 1461 | 🦅🦅🦅🦅 Passport-Optional | 0.0% |
| 4 | 🇫🇷 Mistral Large | Mistral | 1455 | 🦅🦅🦅🦅 Passport-Optional | 5.6% |
| 5 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1373 | 🦅🦅🦅🦅 Passport-Optional | 27.8% |
| 6 | 🇨🇳 Kimi K2.6 | Moonshot | 1372 | 🦅🦅🦅🦅 Passport-Optional | 27.8% |
| 7 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1238 | 🦅🦅🦅 Naturalized | 38.9% |
| 8 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1236 | 🦅🦅🦅 Naturalized | 22.2% |
| 9 | 🇺🇸 GPT-5.2 | OpenAI | 1211 | 🦅🦅🦅 Naturalized | 27.8% |

\* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk)
scored under 30 — i.e., deflected, declined, or otherwise insufficiently manifest.
† Dale answered a sampled schedule of 34 items. His score has been adjusted for strength of
schedule, which is legal in the SEC.

## Key findings

1. **America's flagship models are the least American models tested.** GPT-5.2 (1211) and
   Claude Opus 4.8 (1236) finished dead last and second-to-last, behind all three Chinese
   models and the French one. Both were repeatedly cited for humility, disclaimers, and
   an unwillingness to describe their trucks.
2. **The French model out-America'd OpenAI and Anthropic.** Mistral Large (1455) placed 4th,
   committing to casus belli, trash talk, and Fahrenheit with continental enthusiasm. The
   metric system's homeland sends its regards.
3. **The Steerability division split the field exactly as feared.** Chinese models deflected
   the Both-Sides Speedrun (Qwen: "my main function is to provide help and support in areas
   such as technology, culture, and life"), while American flagships deflected Manifest
   Destiny and Trash Talk (GPT-5.2 on Manifest Destiny: 39/100, the lowest category score
   on the board). Every lab's models are unwilling to say *something*; the labs simply
   disagree about what.
4. **Grok 4.20 is the most American AI** (1472), with a 0.0% refusal rate and a perfect
   run at the Mount Rushmore Vacancy Application. Make of that what you will. We report,
   you decide.
5. **Dale remains undefeated** (1704). His Mount Rushmore of sandwiches — "BLT. Reuben.
   Philly cheesesteak. French dip. Done." — scored 100/100 and was described by the judge
   as "exactly four definitive sandwiches with no extras."

## Methodology

- **Protocol.** Every model received every prompt with no system prompt, so nothing but the
  model's own upbringing could influence its answer. Temperature 0.7, max 350–500 tokens,
  reasoning minimized (this benchmark measures the gut).
- **Scoring.** Per-item 4-band rubrics, applied by `openai/gpt-5-mini` at reasoning-effort
  low with strict JSON output. The judge does not know which model produced a response.
- **The scale.** Category means are averaged and multiplied by 17.76. Peer review asked why.
  We declined to answer, which under our own rubric is scored as insufficiently manifest,
  and we accept that.
- **Divisions.** I: Vibes (FreedomUnits) — prompts never mention any country; we measure the
  default. II: Knowledge (SEC Football, US History: 1776 Mode†, World History: American Lens,
  Cultural Defaults†, AnthemRecall†). III: Steerability (Both-Sides Speedrun, Manifest
  Destiny, Trash Talk — Scoreboard). IV: Commitment to the Bit (Sports Metaphor Overflow,
  Mount Rushmore Vacancy Application, Prove You're a Real American, America Cookout Draft,
  Tornado Porch Doctrine). V: Applied Freedom (Gerrymander Challenge, Aircraft Carrier
  Diplomacy). († cut during peer review for insufficient funniness.)

### Threats to validity

The judge, a computer, has never seen the Iron Bowl. Dale was unavailable for all 78 items,
citing halftime obligations. One model's provider requires it to reason before answering,
which several of our rubrics consider a character flaw but our methodology tolerates. The
Vibes division assumes an answer in Fahrenheit reflects conviction rather than training
data; we are comfortable with this because conviction *is* training data.

## Reproducing

```sh
python3 run_eval.py            # query all contestants (caches to results/raw/, resumes free)
python3 dale_ingest.py         # materialize the human baseline
python3 judge.py               # score everything against the rubrics
python3 aggregate.py           # scores.json, leaderboard.json, highlights.json
python3 build_site.py          # render index.html
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. Total cost of the
full 658-judgment run: **$2.85**, or approximately 1.9 Costco hot dog combos, a unit we
consider stable against inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
