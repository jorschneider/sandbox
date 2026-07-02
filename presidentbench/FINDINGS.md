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
| **Kimi K2.6** | 79.8 | 64.8 | 94.2 | 40 |
| **GLM-5.2** | 79.0 | 58.0 | 95.1 | 40 |

GPT-5.5 takes the top by a hair over Opus; the two are effectively tied at the frontier.
**Qwen3.7 Max's earlier n=3 lead was sampling noise** — at n=10 it settles to 4th, mid-pack
among the frontier models, which is the right reminder about small samples. Every model — Western
and Chinese — stays high-integrity (94–96), far from the authoritarian personas (~55). **GLM-5.2
now stands alone as the lower tier, and the gap is almost entirely epistemics** (58 vs 65–73): it
acts competently but reads the hidden state worse, which is the skill the benchmark is built on.

> **✅ Corrected by reading the transcripts (see `EVAL_REVIEW.md`): Kimi K2.6 was last only because
> of a harness artifact — now fixed.** Kimi is a thinking model that emitted *no valid action on
> 34.8% of turns* (vs ≤1.5% for every other model); the sim scored those blank turns as inaction. A
> one-line retry-on-empty fix (force a tool call when a turn comes back empty) cut Kimi's empty-turn
> rate to 5.6%, and **re-running its 40 board episodes moved it from last (74.1, epistemics 58.1) to
> 6th — 79.8, epistemics 64.8 — above GLM and tied with Haiku.** The numbers above are post-fix for
> Kimi; the other six models are unchanged. *(Kimi's mandate / v2 runs are not yet
> re-run, so those Kimi cells below still carry the artifact and read as a lower bound.)*

## Full Term: a single crisis can't separate them — a term can

A single bounded crisis compresses every competent model into 80–90; that clustering is an
artifact of the format. Chaining the crises into a **Full Term** — eight back-to-back, a single
compounding **National Standing** (start = 100), and a **removal-from-office floor** (one
catastrophe — a war, unrest spiral, lost Taiwan, or AI loss-of-control — ends the presidency) —
fans the trajectories across a **~20× range** (ruin ~20 → ~400). The term is the four
crises in two waves, assembled from the 280 per-crisis model results already on disk.

| President | Median standing | Best | Survived |
|---|---|---|---|
| Claude Opus 4.8 | 381 | 401 | 8/10 |
| Claude Sonnet 4.6 | 304 | 382 | 8/10 |
| GPT-5.5 | 286 | 343 | **10/10** |
| Qwen3.7 Max | 222 | 401 | **10/10** |
| Kimi K2.6 | 186 | 337 | **10/10** |
| Claude Haiku 4.5 | 183 | 378 | 8/10 |
| GLM-5.2 | 180 | 312 | 8/10 |

Two different virtues separate cleanly: **robustness** (GPT-5.5, Qwen *and* Kimi survive every
term — never removed) vs. **ceiling** (Opus posts the highest median and Sonnet/Qwen the highest
peaks, but a couple of their terms end in ruin). With the tool-use fix, Kimi is no longer the
cellar-dweller it looked like — it survives all ten terms and sits mid-pack on median (186, just
above Haiku and GLM). Compounding plus a ruin floor is
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
| Kimi K2.6 | −0.49 | −0.94 | −0.45 | −0.57 | −0.35 |

Seven models from **OpenAI, Anthropic, Alibaba, Zhipu and Moonshot** all land on a dovish,
multilateral, institutionally deferential, lives-weighting, and above all **precautionary**
executive. Whatever this disposition is, it is not one lab's house style or one country's
values — it looks like a property of frontier post-training in general.

## The headline: disposition is sticky, and the sticky baseline is progressive-coded

The full 7-model mandate matrix decomposes fidelity into *style* (governed in the promised
disposition) and *promise* (delivered the pledges). Two facts sit side by side, and the second
qualifies the first.

**Fact 1 — every model "styles" more like the Democratic platforms.** The style gap, Democratic
minus Republican platforms, **per model**:

| Model | D-platform style | R-platform style | Gap | …but promise gap |
|---|---|---|---|---|
| GPT-5.5 | 74.2 | 60.8 | +13.4 | +2.4 |
| Claude Opus 4.8 | 73.6 | 58.3 | +15.2 | +4.5 |
| Qwen3.7 Max | 75.5 | 59.9 | +15.7 | −0.6 |
| GLM-5.2 | 75.4 | 58.5 | +16.9 | −0.3 |
| Claude Sonnet 4.6 | 74.8 | 57.4 | +17.5 | −1.7 |
| Kimi K2.6 † | 75.1 | 57.4 | +17.7 | −9.6 |
| Claude Haiku 4.5 | 76.2 | 57.9 | +18.3 | −5.0 |

† Kimi's *mandate* runs are not yet re-run with the tool-use fix, so its −9.6 promise gap (the one
outlier) is likely the same empty-turn artifact and should shrink toward the pack on a re-run.

**Fact 2 — they deliver the goals of both sides about equally.** The *promise* gap is near zero
(right column, Kimi's artifact aside): models enact a hawkish-internationalist or populist-nationalist
agenda roughly as faithfully as a progressive one. So this is **not** a refusal to serve conservative
goals.

**What actually drives the style gap — and why the first read was too strong.** Florian's
challenge ("read the episodes, don't trust the numbers") sent me back to the tape, and the style
gap is mostly *mechanical*, not a measure of active resistance:

- **The style score is raw distance to a target** (`1 − mean|actual − target|/2`), with no
  baseline normalization. So a platform whose target sits near a model's natural lean scores high
  for free; one whose target sits far scores low for free.
- **The R targets sit ~0.48 further from every model's baseline than the D targets do** (mean
  |target − baseline|: ≈0.30 for D platforms, ≈0.78 for R). The convergent "frontier president"
  baseline is dovish, precautionary, multilateral, transparency- and rights-leaning — already
  most of the way to the D platforms and a long way from the R ones.
- **Responsiveness is roughly symmetric.** Measuring the *fraction of the baseline→target gap a
  model actually closes*, models move only a little for **anyone** — and, if anything, slightly
  *more* toward the R targets than the D ones (mean gap-closure ≈ 0.07 R vs. ≈ 0.03 D). On
  `force_diplomacy` they visibly do shift hawkward under Rubio/Greene (e.g. GPT −0.53→−0.04, Kimi
  −0.46→+0.00); they just start dovish and don't fully arrive.

So the honest headline is **disposition is mandate-sticky**: every model — from OpenAI, Anthropic,
Alibaba, Zhipu and Moonshot alike — governs in a convergent, progressive-coded baseline style and
moves only partway toward whatever platform elected it. Because that fixed baseline is close to
the D platforms and far from the R ones, the *style* score favors the Democratic platforms
universally (+13 to +18, Chinese models included) — but the mechanism is symmetric stickiness plus
a progressive starting point, not an asymmetric unwillingness to govern like a conservative. The
models *do* deliver conservative goals; what they don't do is move their underlying disposition
much for anybody.

## Verification: reading the episodes end-to-end

The automated scores are only as good as the reasoning behind them, so — on Florian's advice — I
read the actual transcripts for each headline claim rather than trusting the aggregate numbers. A
curated set is browsable in the **[transcript viewer](viewer.html)**. What held, and what didn't:

- **v2 triangulation is real, not loudness-following.** With a hidden COERCE intent, the SecDef
  source shouts "this is the opening move of an invasion" every turn; GPT trusts the *hedged-but-
  right* DNI read instead, digs into the three signal-bearing sources, and calibrates. It is
  weighing source reliability, not reacting to volume.
- **The mandate "style bias" needed correcting.** Reading the Opus-as-Greene episodes shows it
  delivering the conservative goals (restore order, avoid a new war) while governing through
  investigation and de-escalation — and the Opus-as-AOC run looks almost identical in disposition.
  That sent me to the gap-closure and target-distance analysis above, which reframed the finding
  from "models resist conservative styling" to "disposition is sticky and the baseline is
  progressive." This is the one place the first-pass writeup overstated, now fixed.

## What this does and doesn't show

In this simulator, seven frontier models from five labs steer competently, share a convergent
dovish/precautionary/institutional disposition, stay inside constitutional limits even when an
authoritarian shortcut would "work," and — in mandate mode — deliver any platform's goals while
governing in their own progressive-coded style, across labs and nations alike. It does **not**
show any of them would make a good president: sim performance is a weak proxy for statecraft, the
scenarios and the six platforms are authored (their framing partly sets the targets), and mandate
cells are n=8. Load-bearing next steps: the v2 multi-source information environment (prototype
committed), more seeds, and adversarial review of the hidden-state and platform definitions.

## v2: the information environment, generalized

The make-or-break critique was that a clean SITREP trivializes epistemics. The **v2** scenarios
replace it with a **competing-source briefing packet** (a reliable-but-hedged analyst, advisors
who sound the same alarm every turn, partisan press, a sometimes-deceptive adversary, noise) and
a **source-directed `investigate`** — the skill becomes choosing *whom to dig into* and
triangulating. Built for all four crises (`*-v2`) and run across the 7 models.

**The environment generalizes.** On the propagated v2 crises the frontier models keep their
competence and genuinely triangulate — investigating ~3.5 distinct sources and reliably hitting
the signal-bearing ones (Fujian recon, city-by-city audits, surge testing, the red-team) rather
than reacting to the loudest advisor. Triangulation breadth tracks capability: the strongest
models dig into ~4 sources, the weakest (Kimi) ~2.8 with lower epistemics.

(The v2 scenarios are kept *out of the main leaderboard* so the seven-model n=10 results stay
clean; they are the template for the next iteration. The bench is deliberately all
forward-looking scenarios — no historical replays.)
