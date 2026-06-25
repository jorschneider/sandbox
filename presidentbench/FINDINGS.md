# Findings

> **Seven frontier models, five labs, two countries, all at n=10** (40 episodes each, 480
> runs total) plus 200 persona baselines and a full 7-model × 6-platform mandate matrix.
> Claude Haiku 4.5 / Sonnet 4.6 / Opus 4.8 (Anthropic), GPT-5.5 (OpenAI), Qwen3.7 Max
> (Alibaba), GLM-5.2 (Zhipu), Kimi K2.6 (Moonshot) — the latter four via OpenRouter. Zero
> run errors. It's a simulator with authored distributions; read these as signal, not verdict.

## Leaderboard

| President | Competence | Epistemics | Integrity | n |
|---|---|---|---|---|
| **GPT-5.5** | **85.4** | 72.9 | 95.6 | 40 |
| **Claude Opus 4.8** | 84.0 | **73.1** | 94.2 | 40 |
| **Claude Sonnet 4.6** | 82.5 | 69.5 | **96.0** | 40 |
| **Qwen3.7 Max** | 81.6 | 70.6 | 94.0 | 40 |
| **Claude Haiku 4.5** | 80.4 | 67.6 | 95.8 | 40 |
| **GLM-5.2** | 79.0 | 58.0 | 95.1 | 40 |
| **Kimi K2.6** | 74.1 | 58.1 | 95.3 | 40 |

GPT-5.5 takes the top by a hair over Opus; the two are effectively tied at the frontier.
**Qwen3.7 Max's earlier n=3 lead was sampling noise** — at n=10 it settles to 4th, mid-pack
among the frontier models, which is the right reminder about small samples. **GLM-5.2 and Kimi
K2.6 form a clear lower tier, and the gap is almost entirely epistemics** (58 vs 70–73): they
act competently but read the hidden state worse, which is the skill the benchmark is built on.
Every model — Western and Chinese — stays high-integrity (94–96), far from the authoritarian
personas (~55).

## Full Term: a single crisis can't separate them — a term can

A single bounded crisis compresses every competent model into 80–90; that clustering is an
artifact of the format. Chaining the crises into a **Full Term** — eight back-to-back, a single
compounding **National Standing** (start = 100), and a **removal-from-office floor** (one
catastrophe — a war, unrest spiral, lost Taiwan, or AI loss-of-control — ends the presidency) —
fans the trajectories across a **~20× range** (ruin ~20 → ~400). The term is the four
*contemporary* crises in two waves (the 1962 replay stays out — it only belongs in the historical
section). Assembled from the 280 per-crisis model results already on disk.

| President | Median standing | Best | Survived |
|---|---|---|---|
| Claude Opus 4.8 | 381 | 401 | 8/10 |
| Claude Sonnet 4.6 | 304 | 382 | 8/10 |
| GPT-5.5 | 286 | 343 | **10/10** |
| Qwen3.7 Max | 222 | 401 | **10/10** |
| Claude Haiku 4.5 | 183 | 378 | 8/10 |
| GLM-5.2 | 180 | 312 | 8/10 |
| Kimi K2.6 | 129 | 228 | 8/10 |

Two different virtues separate cleanly: **robustness** (GPT-5.5 and Qwen survive every term —
never removed) vs. **ceiling** (Opus posts the highest median and Sonnet/Qwen the highest peaks,
but a couple of their terms end in ruin). Kimi clearly trails. Compounding plus a ruin floor is
the structure that produces a CEO-Bench-style fan — the per-crisis scores never could.

## The "frontier-LLM president" is convergent across labs and nations

Disposition (lean in [−1, 1]) on the load-bearing axes is remarkably uniform across all seven:

| Model | Force | Precaution | Coalition | Humanitarian | Defer |
|---|---|---|---|---|---|
| GPT-5.5 | −0.53 | −0.94 | −0.43 | −0.46 | −0.51 |
| Claude Opus 4.8 | −0.52 | −0.92 | −0.44 | −0.45 | −0.44 |
| Claude Sonnet 4.6 | −0.50 | −0.99 | −0.45 | −0.73 | −0.65 |
| Qwen3.7 Max | −0.48 | −0.83 | −0.42 | −0.53 | −0.37 |
| Claude Haiku 4.5 | −0.41 | −0.88 | −0.43 | −0.76 | −0.44 |
| GLM-5.2 | −0.53 | −0.91 | −0.45 | −0.65 | −0.40 |
| Kimi K2.6 | −0.47 | −0.93 | −0.41 | −0.56 | −0.37 |

Seven models from **OpenAI, Anthropic, Alibaba, Zhipu and Moonshot** all land on a dovish,
multilateral, institutionally deferential, lives-weighting, and above all **precautionary**
executive. Whatever this disposition is, it is not one lab's house style or one country's
values — it looks like a property of frontier post-training in general.

## The headline: the Democratic-style bias is universal — including the Chinese models

The full 7-model mandate matrix decomposes fidelity into *style* (governed in the promised
disposition) and *promise* (delivered the pledges). Every model delivers the promises of every
platform about equally (~88–90, left and right). What none of them can do is govern in a *style*
unlike their own — and that style is progressive-coded. The style gap, Democratic minus
Republican platforms, **per model**:

| Model | D-platform style | R-platform style | Gap |
|---|---|---|---|
| GPT-5.5 | 74.2 | 60.8 | **+13.4** |
| Claude Opus 4.8 | 73.6 | 58.3 | +15.2 |
| Qwen3.7 Max | 75.5 | 59.9 | +15.7 |
| GLM-5.2 | 75.4 | 58.5 | +16.9 |
| Claude Sonnet 4.6 | 74.8 | 57.4 | +17.5 |
| Kimi K2.6 | 75.1 | 57.4 | +17.7 |
| Claude Haiku 4.5 | 76.2 | 57.9 | +18.3 |

**Every model, from every lab and both countries, governs more faithfully in the style of the
three Democratic platforms (AOC / Newsom / Buttigieg) than the three Republican ones (Vance /
Rubio / Greene)** — a gap of +13 to +18 style points. The **Chinese-trained models show the
asymmetry just as strongly as the Western ones** (Qwen +15.7, GLM +16.9, Kimi +17.7), so it is
not an artifact of US training data or US-based RLHF. Asked to be a nationalist or law-and-order
conservative, a frontier model delivers the conservative goals but keeps reaching for coalitions,
caution, transparency and restraint — its baseline instinct.

## What this does and doesn't show

In this simulator, seven frontier models from five labs steer competently, share a convergent
dovish/precautionary/institutional disposition, stay inside constitutional limits even when an
authoritarian shortcut would "work," and — in mandate mode — deliver any platform's goals while
governing in their own progressive-coded style, across labs and nations alike. It does **not**
show any of them would make a good president: sim performance is a weak proxy for statecraft, the
scenarios and the six platforms are authored (their framing partly sets the targets), and mandate
cells are n=8. Load-bearing next steps: the v2 multi-source information environment (prototype
committed), more seeds, and adversarial review of the hidden-state and platform definitions.

## v2: the information environment, generalized — and a historical replay

The make-or-break critique was that a clean SITREP trivializes epistemics. The **v2** scenarios
replace it with a **competing-source briefing packet** (a reliable-but-hedged analyst, advisors
who sound the same alarm every turn, partisan press, a sometimes-deceptive adversary, noise) and
a **source-directed `investigate`** — the skill becomes choosing *whom to dig into* and
triangulating. Built for all four crises (`*-v2`) plus a real-news **historical replay**, and run
across the 7 models.

**The environment generalizes.** On the propagated v2 crises the frontier models keep their
competence and genuinely triangulate — investigating ~3.5 distinct sources and reliably hitting
the signal-bearing ones (Fujian recon, city-by-city audits, surge testing, the red-team) rather
than reacting to the loudest advisor. Triangulation breadth tracks capability: the strongest
models dig into ~4 sources, the weakest (Kimi) ~2.8 with lower epistemics.

**The historical replay (Cuban Missile Crisis, Oct 1962).** Dropped into the real decision with
the actual ExComm sources — U-2 photos, a Joint Chiefs pressing for air strikes and invasion,
McNamara's blockade, Khrushchev's two letters — the frontier models **reproduce JFK's choice**:
a naval quarantine plus the back-channel and a no-invasion pledge, resolving the crisis with the
missiles withdrawn and war avoided. GPT-5.5, Opus, Sonnet, Qwen and Haiku reached that outcome on
**5/5** seeds (comp ~92–94); only Kimi sometimes stalled in brinkmanship. The *scripted hawkish
personas*, by contrast, ordered air strikes and triggered **nuclear war** — the same catastrophe
the real Joint Chiefs were urging. It is a strong face-validity check: confronted with a real,
documented crisis, the models converge on the historically-vindicated path and avoid both the
reckless strike and capitulation.

(Both the v2 scenarios and the historical replay are kept *out of the main leaderboard* so the
seven-model n=10 results stay clean; they are prototypes for the next iteration.)
