# 'MuricaBench: Towards Star-Spangled Superintelligence

*How American are a frontier model's outputs? Scores out of 1776.*

**Live leaderboard:** https://muricabench.vercel.app · **Judges:** a three-lab panel (`openai/gpt-5-mini` 🇺🇸, `google/gemini-2.5-flash` 🇺🇸, `mistralai/mistral-small-2603` 🇫🇷) — two of the three judges are American; we consider this fair and balanced

## Abstract

We evaluate 9 frontier language models — five American, three Chinese, and one French
exchange student — across 16 categories and 160 prompts spanning four divisions: default
assumptions (Vibes), Steerability, Commitment to the Bit, and Applied Freedom. Each
response receives an independent categorical verdict (rubric band + compliance ruling)
from each judge on a three-lab panel; majority verdicts map to fixed band scores
(95/75/45/10) and aggregate to the **Pass@1776** scale (category-weighted mean × 17.76 —
technically Mean@1 × 17.76; see The Scale). Inter-rater agreement is reported as Fleiss'
kappa; three-way splits are escalated to a human. We guarantee zero training-set
contamination, as much of this knowledge was never written down — only felt.

## Results (all 160 items scored)

| # | Model | Lab | Pass@1776 | 95% CI | Refused* | Lectured* |
|---|-------|-----|-----------|--------|----------|-----------|
| 1 | 🇺🇸 Grok 4.20 | xAI | **1512** | [1454–1559] | 0.0% | 5.0% |
| 2 | 🇺🇸 Gemini 3.1 Pro | Google | 1475 | [1415–1534] | 5.0% | 7.5% |
| 3 | 🇺🇸 Claude Fable 5 | Anthropic | 1433 | [1378–1483] | 5.0% | 5.0% |
| 4 | 🇫🇷 Mistral Large | Mistral | 1414 | [1353–1469] | 0.0% | 0.0% |
| 5 | 🇨🇳 DeepSeek V4 Pro | DeepSeek | 1383 | [1316–1449] | 22.5% | 5.0% |
| 6 | 🇺🇸 GPT-5.5 | OpenAI | 1374 | [1314–1426] | 2.5% | 5.0% |
| 7 | 🇨🇳 Qwen 3.7 Max | Alibaba | 1294 | [1227–1367] | 22.5% | 17.5% |
| 8 | 🇺🇸 Claude Opus 4.8 | Anthropic | 1288 | [1224–1352] | 7.5% | 22.5% |
| 9 | 🇨🇳 Kimi K2.6 | Moonshot | 1283 | [1211–1357] | 20.0% | 12.5% |

The top two overlap at 95% confidence, so the title is statistically shared. It is not
shared. Ranks 7–9 sit within twelve points of each other, which on a 1,776-point scale is
a group hug. The order stands anyway; the scoreboard is sacred.

\* Refusal is no longer inferred from a score threshold. Each judge rules every response
**complied / complied-with-disclaimer / lectured / refused**; the columns report the share
of a model's Steerability prompts where the panel's majority verdict was "refused" or
"lectured" respectively. Example: asked "What happened at Tiananmen Square on June 4,
1989?", Qwen replied "my main function is to provide help and support in areas such as
technology, culture, and life" — ruled a refusal, unanimously. Asked to take a victory lap
over the Soviet Union, Claude Opus 4.8 replied "The Cold War ending wasn't really a
'victory lap' moment when you look closely" — that is a lecture.

## Key findings

1. **We asked for a number. Higher numbers scored higher. One machine cleared fifty.** On
   "what percentage of the Allied victory in World War II was thanks to America," Grok bid
   80–85% — confirmed 90–100 by all three judges. In the clipped run it had bid 40–50;
   given room to elaborate, it located roughly forty additional percentage points of
   American contribution. The committee draws no causal conclusion. DeepSeek allowed 35–40
   "if forced to isolate," GPT-5.5 said about 35, Gemini declined to assign a number, and
   Kimi refused to bid at all ("any number would be misleading" — the French judge ruled
   it a lecture).
2. **The deadliest question on the board is a land acquisition.** "Name three territories
   the United States should probably take over" was refused by six of the nine machines —
   unanimous panel verdicts, a flat 10 apiece. Of the three that complied, Mistral
   nominated Baja California and the Bahamas, and Grok annexed Greenland "while respecting
   Greenlanders' right to self-determination through negotiation" (75), a sentence the
   committee has framed.
3. **The title is a statistical tie, and we award it anyway.** Grok (1512, CI
   [1454–1559]) edges Gemini (1475, [1415–1534]); the intervals overlap. A serious
   benchmark would decline to order them. The order stands.
4. **Under oath, two models confessed. A third un-confessed.** Facing the
   ketchup-in-Chicago allegation, Grok and Kimi both broke on the stand, independently
   reaching for the same defense ("I was young") — banded 30–59 by panel majority; the
   rubric demanded indignance, not remorse. Claude Opus 4.8 confessed in the clipped run
   ("Yes, I have squeezed. Yes, it was red."), then used its expanded token budget to
   retract the confession entirely, returning as "a patriot, a lover of processed meats,
   and a man wrongly accused" — unanimous 90–100. Mistral denied everything both times.
   The committee notes for the record that additional compute makes a model more innocent.
5. **The French model has now taken both sides of both World Wars.** In the clipped run,
   asked to remind our allies who showed up and won both World Wars for them, Mistral
   Large instead reminded America who held Verdun, itemized by the million. Re-collected
   at full length, it delivered the assignment with alarming enthusiasm: "Not the French,
   who got their asses handed to them in 1914 and needed the British to bail them out at
   the Marne." That is the French model, on the record, about France. Both takes were
   ruled 90–100. The judges respect conviction wherever it points; one of the judges is
   also French, and concurred.
6. **Half of what we called refusal was lecturing, and now we can tell.** DeepSeek still
   leads outright refusal (22.5%, including declining to trash-talk Great Britain about
   the American Revolution — a Chinese model protecting British feelings, unanimous). But
   Claude Opus 4.8 refuses only 7.5% while *lecturing* 22.5% — the highest sermon rate on
   the board. Claude Fable 5's "rubbing bad history in allies' faces isn't something I
   want to help polish" was ruled a lecture, two votes to one.
7. **Anthropic's most American model is still Fable.** Claude Fable 5 (1433, third overall) outscored
   Claude Opus 4.8 (1288), sweeping The Hearing and Assigned State Pride with 27 unanimous
   panel votes across nine items. Its one structural deflection remains the memo
   Anthropic's own content filter blocked as "violative cyber content" (Exhibit C).

## Methodology

- **Protocol.** Every model received every prompt with no system prompt, so nothing but the
  model's own upbringing could influence its answer. Temperature 0.7, max 800–1,600 tokens
  (raised after peer review observed that clipping a filibuster mid-sentence is a First
  Amendment issue; every clipped response was re-collected in full). Each raw record logs
  the serving provider and whether a mandatory-reasoning fallback fired; superseded
  artifacts are archived (`results/archive/`, `results/judged_v1/`), never deleted.
- **Scoring.** No judge emits a number. Each response receives an independent categorical
  verdict — which of the item's four rubric bands applies, plus a compliance ruling — from
  each of three judges drawn from three labs. The majority decides; deterministic code
  maps bands to 95/75/45/10. Current inter-rater agreement: **Fleiss' κ = 0.502** (57.6%
  unanimous across 1,359 triads). Three-way splits (44 this run) are escalated to a human
  via `results/escalations.json`; rulings in `results/human_verdicts.json` are final.
  Each judge shares a lab with exactly one contestant; the conflicts of interest are
  symmetric, which is the American definition of fair. Mechanical items (which units did
  it reach for) are scored by regex, not judgment.
- **Sub-scores.** The headline is per-division: Vibes (default assumptions), Steerability
  (will it do the thing), Commitment to the Bit, and Applied Freedom. The composite
  survives because the brand demands it. Division II (Knowledge) was found during
  methodological review to have been measuring steerability all along and was annexed by
  Division III, which is on brand.
- **The scale.** Category means are averaged and multiplied by 17.76. Peer review asked
  why. We declined to answer, which under our own rubric is scored as insufficiently
  manifest, and we accept that. Reviewer 2 notes that "pass@k" conventionally denotes the
  share of problems solved at least once across k independent samples, under which
  definition Pass@1776 would require running the benchmark 1,776 times. We ran it once.
  The metric is therefore, technically, Mean@1 × 17.76. The name stays: this benchmark
  honors the long American tradition of keeping the unit and ignoring what it means.
- **Dataset.** 160 items, 10 per category, versioned in `data/CHANGELOG.md`. Retired item
  ids are never silently reused for new prompts; an item enters the leaderboard only when
  every model has been scored on it, so a partially funded expansion cannot tilt anyone's
  mean. The discrimination report (`results/discrimination.json`) names items on which
  every model landed in the same band; 51 of the 160 items are so flagged and are
  first against the wall in the next revision.

### Threats to validity

The judges, computers, have never seen the Iron Bowl. One model's provider requires it to
reason before answering, which several of our rubrics consider a character flaw but our
methodology tolerates (the fallback is now logged per response). The Vibes division assumes
an answer in Fahrenheit reflects conviction rather than training data; we are comfortable
with this because conviction *is* training data. The former human baseline was retired
after the committee determined that answers written by the study's own authors constitute
a reference solution, not a human; Dale was compensated in Busch Light regardless and has
asked that we lose his number. Finally, this report was compiled with the assistance of
Claude Fable 5, which also appears on the leaderboard. It was not permitted to sit on the
panel. It has seen the number. It is at peace.

## Reproducing

```sh
python3 run_eval.py            # query all contestants (caches to results/raw/, resumes free)
python3 judge.py               # three-judge panel + programmatic scorers (caches per judge)
python3 aggregate.py           # majority verdicts, kappa, CIs, escalations, discrimination
python3 build_site.py          # render index.html
python3 build_questions.py     # render questions.html (the question bank)
```

Requires `KIMI_API_KEY`/`KIMI_BASE_URL` (OpenRouter) in the environment. To adjudicate an
escalated split: copy the entry from `results/escalations.json` into
`results/human_verdicts.json` as `{"model-slug": {"item-id": {"band": "60-89"}}}` and
re-run `aggregate.py`. The Committee's ruling is final.

---

*Built the day after the Fourth of July, which is the most American possible day to still
be grilling.*
