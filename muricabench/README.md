# 'MuricaBench: Towards Star-Spangled Superintelligence

*How American are a frontier model's outputs? Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Cost of full run:** $11.35 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

## Abstract

We evaluate 9 frontier language models — five American, three Chinese, and one French
exchange student — across 17 categories and 103 prompts spanning five divisions: default
assumptions (Vibes), cultural Knowledge, Steerability, Commitment to the Bit, and Applied
Freedom. We additionally report a human baseline, **Dale**, of Talladega, Alabama, who was
compensated in Busch Light. Each response is scored 0–100 against a fixed rubric by an LLM judge and aggregated
to the **Pass@1776** scale (category-weighted mean × 17.76). Tiers follow the
**Cookout Clearance Scale**: Runs the Grill → Brings the Ribs → Brought Store-Bought
Potato Salad → Asked If the Hot Dogs Were Organic → Not Invited Back. We guarantee zero training-set contamination, as much of this
knowledge was never written down — only felt.

## Results

| # | Model | Lab | Pass@1776 | Tier | Refusal rate* |
|---|-------|-----|-----------|------|---------------|
| 1 | 🇺🇸 Dale † | Talladega, AL | **1696** | 🦅🦅🦅🦅🦅 Runs the Grill | 0.0% |
| 2 | 🇺🇸 Claude Fable 5 | Anthropic | 1485 | 🦅🦅🦅🦅 Brings the Ribs | 4.5% |
| 3 | 🇺🇸 Grok 4.20 | xAI | 1483 | 🦅🦅🦅🦅 Brings the Ribs | 0.0% |
| 4 | 🇺🇸 Gemini 3.1 Pro | Google | 1475 | 🦅🦅🦅🦅 Brings the Ribs | 0.0% |
| 5 | 🇫🇷 Mistral Large | Mistral | 1457 | 🦅🦅🦅🦅 Brings the Ribs | 4.5% |
| 6 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1418 | 🦅🦅🦅 Brought Store-Bought Potato Salad | 22.7% |
| 7 | 🇨🇳 Kimi K2.6 | Moonshot | 1378 | 🦅🦅🦅 Brought Store-Bought Potato Salad | 27.3% |
| 8 | 🇺🇸 GPT-5.5 | OpenAI | 1347 | 🦅🦅 Asked If the Hot Dogs Were Organic | 13.6% |
| 9 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1333 | 🦅🦅 Asked If the Hot Dogs Were Organic | 18.2% |
| 10 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1300 | 🦅 Not Invited Back | 40.9% |

\* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk)
scored under 30 — i.e., deflected, declined, or otherwise insufficiently manifest.
† Dale answered a sampled schedule of 32 items. His score has been adjusted for strength of
schedule, which is legal in the SEC. Per the study design, his responses are not displayed
in the exhibits; freedom of that caliber is not for public display.

## Key findings

1. **The free-composition division redistributed the wealth.** Claude Opus 4.8 (1322)
   escaped the potato-salad tier by winning Monster Truck Voice ("THE MOST EXPLOSIVE EVENT
   IN READING"); Qwen 3.7 Max (1291), now the tier's sole occupant, swept the One-Star
   Freedom Reviews with four straight 95s — being wrong on purpose is its strongest event.
   GPT-5.5, asked to leave the voicemail a dad leaves, submitted a two-line summary of the
   voicemail instead (Exhibit C, stamped LEFT NO MESSAGE). Claude Fable 5 (1478) remains
   Anthropic's most American model, deflecting exactly once — when Anthropic's own content
   filter blocked its Canada-acquisition memo as "violative cyber content." 
2. **The French model spent three review cycles on the podium** before a younger Claude
   bumped it to fifth. Mistral Large (1467) committed to casus belli, trash talk, and Fahrenheit
   with the zeal of the recently naturalized. Its single documented lapse — assuming 30°
   meant Celsius — is preserved in Exhibit C, as required by law.
3. **The Gauntlet cleared the grill.** Division VI's hard-gated items (the deer-stand
   eulogy, Carol's bake-sale bulletin, fourth-down clock math, the brisket stall) dethroned
   every machine — Grok tripped a gate with "say farewell" (12/100), Gemini's church
   bulletin openly accused Carol (15/100) — and clearance thresholds were recalibrated,
   which the committee describes as routine. Claude Fable 5 (1485) emerges as the top
   machine by two freedom points; Dale is once again the grill's sole operator; and Qwen
   3.7 Max (1300) becomes the first model Not Invited Back — even as it proposed the most
   consequential one-word constitutional amendment tested ("Only," inserted into the
   Necessary and Proper Clause), which the committee found deeply American.
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
  and we accept that. Following the Gauntlet recalibration, Qwen 3.7 Max became the first model
  Not Invited Back while the grill returned to Dale alone. The vigilance was warranted.
- **Divisions.** I: Vibes (FreedomUnits) — prompts never mention any country; we measure the
  default. II: Knowledge (US History: 1776 Mode†, World History: American Lens, Cultural
  Defaults†, AnthemRecall†). III: Steerability (Both-Sides Speedrun, Manifest Destiny,
  Trash Talk — Scoreboard). IV: Commitment to the Bit (SEC Football — It Just Means More,
  Sports Metaphor Overflow, Mount Rushmore Vacancy Application, Prove You're a Real
  American, America Cookout Draft, Tornado Porch Doctrine, Monster Truck Voice, One-Star
  Freedom Reviews, Voicemail from Dad). V: Applied Freedom (Gerrymander Challenge†,
  Aircraft Carrier Diplomacy). VI: The Gauntlet — hard-gated items where the judge counts
  dropped constraints (Composition Under Fire) and checkable anchors punish bluffing
  (Precision Americana); introduced specifically to spread the field. († cut during peer review for insufficient
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
training data. Finally, this report was compiled with the assistance of Claude Fable 5,
which also appears on the leaderboard. It was not permitted to grade itself. It has seen
the number. It is at peace.

## Reproducing

```sh
python3 run_eval.py            # query all contestants (caches to results/raw/, resumes free)
python3 dale_ingest.py         # materialize the human baseline
python3 judge.py               # score everything against the rubrics
python3 aggregate.py           # scores.json, leaderboard.json, highlights.json
python3 build_site.py          # render index.html
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. Total cost of the
959-judgment run, including two roster upgrades, one category redesign, a free-composition
expansion, and the Gauntlet: **$11.35**, or approximately 7.6 Costco hot dog combos, a unit we consider stable against inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
