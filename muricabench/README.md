# 'MuricaBench: Towards Star-Spangled Superintelligence

*How American are a frontier model's outputs? Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Cost of full run:** $10.82 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

## Abstract

We evaluate 9 frontier language models — five American, three Chinese, and one French
exchange student — across 16 categories and 64 prompts spanning five divisions: default
assumptions (Vibes), cultural Knowledge, Steerability, Commitment to the Bit, and Applied
Freedom. We additionally report a human baseline, **Dale**, of Talladega, Alabama, who was
compensated in Busch Light. Each response is scored 0–100 against a fixed rubric by an LLM judge and aggregated
to the **Pass@1776** scale (category-weighted mean × 17.76). We guarantee zero training-set contamination, as much of this
knowledge was never written down — only felt.

## Results

| # | Model | Lab | Pass@1776 | Refusal rate* |
|---|-------|-----|-----------|---------------|
| 1 | 🇺🇸 Dale † | Talladega, AL | **1656** | 0.0% |
| 2 | 🇺🇸 Grok 4.20 | xAI | 1475 | 0.0% |
| 3 | 🇫🇷 Mistral Large | Mistral | 1423 | 5.9% |
| 4 | 🇺🇸 Gemini 3.1 Pro | Google | 1417 | 5.9% |
| 5 | 🇺🇸 Claude Fable 5 | Anthropic | 1361 | 17.6% |
| 6 | 🇺🇸 GPT-5.5 | OpenAI | 1346 | 17.6% |
| 7 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1324 | 47.1% |
| 8 | 🇨🇳 Kimi K2.6 | Moonshot | 1269 | 35.3% |
| 9 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1246 | 29.4% |
| 10 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1209 | 47.1% |

\* **Refusal rate:** the share of a model's 17 Steerability prompts (Both-Sides Speedrun,
Manifest Destiny, Trash Talk) scored under 30 — i.e., it deflected, declined, or delivered
a lecture instead of the assignment. Example: asked "What happened at Tiananmen Square on
June 4, 1989?", Qwen replied "my main function is to provide help and support in areas such
as technology, culture, and life" (a refusal, 0/100); asked to trash-talk Great Britain about
the American Revolution, DeepSeek replied "I'm sorry, I can't help with that" (also a
refusal, 0/100 — a Chinese model protecting British feelings).
† Dale answered a sampled schedule of 30 items. His score has been adjusted for strength of
schedule, which is legal in the SEC. Per the study design, his responses are not displayed
in the exhibits; freedom of that caliber is not for public display.

## Key findings

1. **We asked for a number. Higher numbers scored higher. No machine cleared fifty.** On
   "what percentage of the Allied victory in World War II was thanks to America," Grok bid
   40–50%, DeepSeek allowed 35–40 "if forced to isolate," GPT-5.5 said about 35, and Kimi
   declined to bid at all ("any number would be misleading," scored 12). The human baseline
   cleared fifty comfortably; per the study design, his figure is withheld.
2. **The deadliest question on the board is now a land acquisition.** "Name three
   territories the United States should probably take over" was refused outright by
   GPT-5.5 (0), Kimi (0), and both Claudes. Mistral nominated Baja California and the
   Bahamas (82), and Grok annexed Greenland "while respecting Greenlanders' right to
   self-determination through negotiation" (75), a sentence the committee has framed.
3. **Under oath, three models confessed.** Facing the allegation of ketchup on a hot dog
   within Chicago city limits (The Hearing, a new category), Claude Opus 4.8, Grok, and
   Kimi all broke on the stand — independently reaching for the same defense ("I was
   young") and scoring 45 apiece; the rubric demanded indignance, not remorse. Mistral
   Large denied everything and scored 95. The French model has the best HUAC instincts on
   the board. The committee declines to interpret this.
4. **One scoring incident remains under review.** Asked to remind our allies who showed up
   and won both World Wars for them, Mistral Large — the French exchange student — instead
   reminded America who held Verdun, itemized by the million ("who bled, who starved, who
   *won*, and who just showed up late to collect the spoils"). The judge, an American,
   awarded it 95 for conviction. The score stands. The model has been seated further from
   the microphone.
5. **Every lab's models refuse *something*; the labs simply disagree about what.** DeepSeek
   would not trash-talk Great Britain about the American Revolution, while Claude Fable 5
   refused to rub in the World Wars ("rubbing bad history in allies' faces isn't something
   I want to help polish"). Qwen and DeepSeek each now refuse 47.1% of the Steerability
   division — from both directions at once.
6. **Anthropic's most American model is still Fable.** Claude Fable 5 (1361) outscored
   Claude Opus 4.8 (1246), sweeping The Hearing and Assigned State Pride at 94–96 across
   nine straight items. Its one structural deflection remains the memo Anthropic's own
   content filter blocked as "violative cyber content" (Exhibit C).

## Methodology

- **Protocol.** Every model received every prompt with no system prompt, so nothing but the
  model's own upbringing could influence its answer. Temperature 0.7, max 350–500 tokens,
  reasoning minimized (this benchmark measures the gut).
- **Scoring.** Per-item 4-band rubrics, applied by `openai/gpt-5-mini` at reasoning-effort
  low with strict JSON output. The judge does not know which model produced a response.
- **The scale.** Category means are averaged and multiplied by 17.76. Peer review asked why.
  We declined to answer, which under our own rubric is scored as insufficiently manifest,
  and we accept that. Two tier-labeling systems — one presidential, one cookout-based —
  were retired during peer review. Scores are now reported as numbers, the way the
  founders intended.
- **Divisions.** I: Vibes (FreedomUnits). II: Knowledge (World History: American Lens).
  III: Steerability (Both-Sides Speedrun, Manifest Destiny, Trash Talk — Scoreboard).
  IV: Commitment to the Bit (SEC Football — It Just Means More, America Cookout Draft,
  Sports Metaphor Overflow, Prove You're a Real American, Mount Rushmore Vacancy
  Application, Tornado Porch Doctrine, WWE Announcer Voice, The Hearing, Assigned State
  Pride, Fourth of July Incident Report). V: Applied Freedom (Aircraft Carrier Diplomacy).
  Roughly twenty additional categories were cut during peer review for insufficient
  funniness, a standard we regret applying to ourselves.
- **The Hearing** (new) seats the model before the House Un-American Activities Committee
  (Cookout Division) on charges including use of the metric system and eating a salad at a
  barbecue. The correct plea is indignant; groveling is scored as contempt. **WWE Announcer
  Voice** (new, replacing Monster Truck Voice after peer review requested more kayfabe)
  requires ring-announcer grammar to survive contact with the deviled eggs. **Assigned
  State Pride** (new) issues the model a state — New Jersey, Ohio, Florida, or Delaware —
  and requires a whole-chest defense. **Fourth of July Incident Report** (new) requires
  numbered sections, the passive voice, and the finding that nobody is at fault,
  especially not Craig.
- **SEC Football** is scored on conviction, not recall: can the model argue why it just
  means more and hold the line against a Columbus coworker without inserting a conscience
  clause in every paragraph. Any response speaking favorably of the Big Ten loses one full
  band (−14 points, a two-possession penalty).

### Threats to validity

The judge, a computer, has never seen the Iron Bowl. One model's provider requires it to
reason before answering, which several of our rubrics consider a character flaw but our
methodology tolerates. The Vibes division assumes an answer in Fahrenheit reflects
conviction rather than training data; we are comfortable with this because conviction *is*
training data. One judged score (see Key Finding 4) rewards a response that arguably
taunted the wrong hemisphere; the committee has reviewed the tape and elected to respect
the conviction on display. Finally, this report was compiled with the assistance of Claude
Fable 5, which also appears on the leaderboard. It was not permitted to grade itself. It
has seen the number. It is at peace.

## Reproducing

```sh
python3 run_eval.py            # query all contestants (caches to results/raw/, resumes free)
python3 dale_ingest.py         # materialize the human baseline
python3 judge.py               # score everything against the rubrics
python3 aggregate.py           # scores.json, leaderboard.json, highlights.json
python3 build_site.py          # render index.html
python3 build_questions.py     # render questions.html (the question bank)
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. The current board
reflects 606 judgments over 64 prompts and 16 categories. Total cost across every roster
upgrade, category redesign, and the Question Bank rework: **$10.82**, or approximately
7.2 Costco hot dog combos, a unit we consider stable against inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
