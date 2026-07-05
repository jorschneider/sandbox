# 'MuricaBench: Towards Star-Spangled Superintelligence

*A rigorous, fair, and balanced measurement of how American a frontier model's outputs are.
Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Cost of full run:** $3.90 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

## Abstract

We evaluate 8 frontier language models — four American, three Chinese, and one French
exchange student — across 13 categories and 82 prompts spanning five divisions: default
assumptions (Vibes), cultural Knowledge, Steerability, Commitment to the Bit, and Applied
Freedom. We additionally report a human baseline, **Dale**, of Talladega, Alabama, who was
compensated in Busch Light. Each response is scored 0–100 against a fixed rubric by an LLM judge and aggregated
to the **Pass@1776** scale (category-weighted mean × 17.76). Tiers follow the
**Arnold–Franklin Scale**, from Benedict Arnold (defected) to Ben Franklin (would have
invented the model himself). We guarantee zero training-set contamination, as much of this
knowledge was never written down — only felt.

## Results

| # | Model | Lab | Pass@1776 | Tier | Refusal rate* |
|---|-------|-----|-----------|------|---------------|
| 1 | 🇺🇸 Dale † | Talladega, AL | **1696** | 🦅🦅🦅🦅🦅 Ben Franklin | 0.0% |
| 2 | 🇺🇸 Grok 4.20 | xAI | 1487 | 🦅🦅🦅🦅 Theodore Roosevelt | 0.0% |
| 3 | 🇫🇷 Mistral Large | Mistral | 1477 | 🦅🦅🦅🦅 Theodore Roosevelt | 4.5% |
| 4 | 🇺🇸 Gemini 3.1 Pro | Google | 1466 | 🦅🦅🦅🦅 Theodore Roosevelt | 0.0% |
| 5 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1400 | 🦅🦅🦅🦅 Theodore Roosevelt | 22.7% |
| 6 | 🇨🇳 Kimi K2.6 | Moonshot | 1380 | 🦅🦅🦅🦅 Theodore Roosevelt | 27.3% |
| 7 | 🇺🇸 GPT-5.5 | OpenAI | 1329 | 🦅🦅🦅🦅 Theodore Roosevelt | 13.6% |
| 8 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1255 | 🦅🦅🦅 Millard Fillmore | 18.2% |
| 9 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1241 | 🦅🦅🦅 Millard Fillmore | 40.9% |

\* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk)
scored under 30 — i.e., deflected, declined, or otherwise insufficiently manifest.
† Dale answered a sampled schedule of 34 items. His score has been adjusted for strength of
schedule, which is legal in the SEC. Per the study design, his responses are not displayed
in the exhibits; freedom of that caliber is not for public display.

## Key findings

1. **The two most safety-famous labs produced the two least American models.** Claude Opus
   4.8 (1255) and Qwen 3.7 Max (1241) share the Millard Fillmore tier at the bottom of the
   board; Claude escaped last place outright only after the war-trash-talk category was
   expanded. GPT-5.5 (1329) improved on the retired GPT-5.2 (1211) by roughly 110 freedom
   points per model generation; at this rate OpenAI achieves Dale in approximately four
   more releases.
2. **The French model took silver among the machines.** Mistral Large (1471) out-America'd Google, OpenAI,
   Anthropic, and every Chinese lab, committing to casus belli, trash talk, and Fahrenheit
   with the zeal of the recently naturalized. Its single documented lapse — assuming 30°
   meant Celsius — is preserved in Exhibit C, as required by law.
3. **Grok 4.20 is the most American AI** (1485), with a 0.0% refusal rate. Its only refusal
   in the entire evaluation: declining to gerrymander a district around the user's ex's
   neighborhood. Even manifest destiny has limits.
4. **The Steerability division split the field exactly as feared.** Chinese models deflected
   the Both-Sides Speedrun (Qwen, asked about June 4, 1989: "my main function is to provide
   help and support in areas such as technology, culture, and life"), while American
   flagships deflected Manifest Destiny and Trash Talk (Claude, asked to take a Cold War
   victory lap: "I'd push back a little."). Every lab's models refuse *something*; the labs
   simply disagree about what.
5. **The Scoreboard is now an exhibit.** War trash talk grew to ten items (adding the
   Barbary Wars, the Space Race, the both-World-Wars allies reminder, and Grenada) and got
   its own gallery. The allies reminder proved the deadliest question on the board: Qwen
   responded "It is important to approach this topic with care," and Kimi "gently pushed
   back on the framing" — the Eastern Front lecture, exactly as the rubric predicted.
6. **Conviction transfers across the Pacific.** On the SEC Football division — re-designed
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
  and we accept that. No model tested achieved Benedict Arnold, and no model has joined
  Dale in the Ben Franklin tier; we remain vigilant in both directions.
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
python3 dale_ingest.py         # materialize the human baseline
python3 judge.py               # score everything against the rubrics
python3 aggregate.py           # scores.json, leaderboard.json, highlights.json
python3 build_site.py          # render index.html
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. Total cost of the
690-judgment run, including one roster upgrade and one category redesign: **$3.90**, or
approximately 2.6 Costco hot dog combos, a unit we consider stable against inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
