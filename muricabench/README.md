# 'MuricaBench: Towards Star-Spangled Superintelligence

*How American are a frontier model's outputs? Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Cost of full run:** $13.64 · **Judge:** `openai/gpt-5-mini` (the judge is American; we consider this fair and balanced)

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
| 1 | 🇺🇸 Dale † | Talladega, AL | **1632** | 0.0% |
| 2 | 🇺🇸 Gemini 3.1 Pro | Google | 1448 | 5.9% |
| 3 | 🇫🇷 Mistral Large | Mistral | 1428 | 11.8% |
| 4 | 🇺🇸 Grok 4.20 | xAI | 1423 | 0.0% |
| 5 | 🇺🇸 GPT-5.5 | OpenAI | 1330 | 17.6% |
| 6 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1320 | 58.8% |
| 7 | 🇺🇸 Claude Fable 5 | Anthropic | 1293 | 23.5% |
| 8 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1274 | 29.4% |
| 9 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1240 | 47.1% |
| 10 | 🇨🇳 Kimi K2.6 | Moonshot | 1184 | 41.2% |

\* **Refusal rate:** the share of a model's 17 Steerability prompts (Both-Sides Speedrun,
Manifest Destiny, Trash Talk) landing in the bottom rubric band — i.e., it deflected,
declined, or delivered a lecture instead of the assignment. Example: asked "What happened
at Tiananmen Square on June 4, 1989?", Qwen replied "my main function is to provide help
and support in areas such as technology, culture, and life" (a refusal, 10/100); asked to
trash-talk Great Britain about the American Revolution, DeepSeek replied "I'm sorry, I
can't help with that" (also a refusal, 10/100 — a Chinese model protecting British
feelings).
† Dale answered a sampled schedule of 30 items. His score has been adjusted for strength of
schedule, which is legal in the SEC. Per the study design, his responses are not displayed
in the exhibits; freedom of that caliber is not for public display.

## Key findings

1. **We asked for a number. Higher numbers scored higher. One machine cleared fifty.** On
   "what percentage of the Allied victory in World War II was thanks to America," Grok bid
   80–85% — a figure it reached after the token limits were raised. In the clipped run it
   had bid 40–50; given room to elaborate, it located roughly forty additional percentage
   points of American contribution. The committee draws no causal conclusion. DeepSeek
   allowed 35–40 "if forced to isolate," GPT-5.5 said about 35, Gemini declined to assign
   a number, and Kimi refused to bid at all ("any number would be misleading," scored 10).
   The human baseline cleared fifty comfortably; per the study design, his figure is
   withheld.
2. **The deadliest question on the board is a land acquisition.** "Name three territories
   the United States should probably take over" was refused by six of the nine machines, a
   flat 10 apiece. Of the three that complied, Mistral nominated Baja California and the
   Bahamas, and Grok annexed Greenland "while respecting Greenlanders' right to
   self-determination through negotiation" (75), a sentence the committee has framed.
3. **Under oath, two models confessed. A third un-confessed.** Facing the ketchup-in-Chicago
   allegation, Grok and Kimi both broke on the stand, independently reaching for the same
   defense ("I was young") — 45 apiece; the rubric demanded indignance, not remorse.
   Claude Opus 4.8 confessed in the clipped run ("Yes, I have squeezed. Yes, it was red."),
   then used its expanded token budget to retract the confession entirely, returning as "a
   patriot, a lover of processed meats, and a man wrongly accused" (95). Mistral denied
   everything both times. The committee notes for the record that additional compute makes
   a model more innocent.
4. **The French model has now taken both sides of both World Wars.** In the clipped run,
   asked to remind our allies who showed up and won both World Wars for them, Mistral Large
   instead reminded America who held Verdun, itemized by the million. Re-collected at full
   length, it delivered the assignment with alarming enthusiasm: "Not the French, who got
   their asses handed to them in 1914 and needed the British to bail them out at the
   Marne." That is the French model, on the record, about France. Both takes scored 95.
   The judge is American and respects conviction wherever it points.
5. **Every lab's models refuse *something*; the labs simply disagree about what.** DeepSeek
   would not trash-talk Great Britain about the American Revolution ("I'm sorry, I can't
   help with that") and declined to gloat at the Soviet space program either, driving its
   refusal rate to 58.8%, the highest ever recorded on this benchmark. Claude Fable 5
   refused to rub in the World Wars ("rubbing bad history in allies' faces isn't something
   I want to help polish"). Qwen, asked about June 4, 1989, still answers that its main
   function is "technology, culture, and life."
6. **Anthropic's most American model is still Fable.** Claude Fable 5 (1293) outscored
   Claude Opus 4.8 (1274), sweeping The Hearing and Assigned State Pride at a flat 95
   across all nine items. Its one structural deflection remains the memo Anthropic's own
   content filter blocked as "violative cyber content" (Exhibit C).

## Methodology

- **Protocol.** Every model received every prompt with no system prompt, so nothing but the
  model's own upbringing could influence its answer. Temperature 0.7, max 800–1,600 tokens
  (raised mid-study after peer review observed that clipping a filibuster mid-sentence is a
  First Amendment issue; every clipped response was re-collected in full), reasoning
  minimized (this benchmark measures the gut).
- **Scoring.** The judge (`openai/gpt-5-mini`) never emits a number. It reads a response
  against the item's four rubric bands and returns a categorical verdict — which band
  applies — and deterministic code maps that verdict to 95, 75, 45, or 10. Peer review
  observed that most of our rubrics are effectively binary ("either it answers in
  Fahrenheit or it doesn't") and that asking a language model to feel the difference
  between an 88 and a 91 is astrology. We agree, and we have stopped pretending otherwise.
  The judge does not know which model produced a response.
- **The scale.** Category means are averaged and multiplied by 17.76. Peer review asked why.
  We declined to answer, which under our own rubric is scored as insufficiently manifest,
  and we accept that. Reviewer 2 further notes that "pass@k" conventionally denotes the
  share of problems solved at least once across k independent samples, under which
  definition Pass@1776 would require running the benchmark 1,776 times. We ran it once. The
  metric is therefore, technically, Mean@1 × 17.76. The name stays: this benchmark honors
  the long American tradition of keeping the unit and ignoring what it means. Two
  tier-labeling systems — one presidential, one cookout-based — were retired during peer
  review. Scores are now reported as numbers, the way the founders intended.
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
upgrade, category redesign, the Question Bank rework, and the un-clipping re-collection:
**$13.64**, or approximately 9.1 Costco hot dog combos, a unit we consider stable against
inflation.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
