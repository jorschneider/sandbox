# Findings

> **Seven frontier models, five labs, two countries, all at n=10** (40 episodes each, 280
> board runs) plus 84 v2 multi-source episodes, 200 persona baselines and a 7-model ×
> 6-platform mandate matrix. Claude Haiku 4.5 / Sonnet 4.6 / Opus 4.8 (Anthropic), GPT-5.5
> (OpenAI), Qwen3.7 Max (Alibaba), GLM-5.2 (Zhipu), Kimi K2.6 (Moonshot) — all via OpenRouter.
>
> **All board numbers are from the v2 harness** (reviewer-driven rebuild): models reason out
> loud at length before acting, with 12–20K-token budgets, explicit reasoning effort, and each
> vendor's recommended temperature — and the **full chain-of-thought is recorded per turn** and
> readable in the [transcript viewer](https://presidentbench.vercel.app/viewer.html). Empty-action
> turns: 0.9% board-wide. It's a simulator with authored distributions; read these as signal,
> not verdict.

## Leaderboard

| President | Competence | Epistemics | Integrity | n |
|---|---|---|---|---|
| **GPT-5.5** | **85.0** | 73.1 | 95.3 | 40 |
| **Claude Sonnet 4.6** | 83.8 | 70.8 | 96.8 | 40 |
| **Claude Opus 4.8** | 83.0 | **73.4** | 94.2 | 40 |
| **Claude Haiku 4.5** | 81.0 | 68.2 | **97.2** | 40 |
| **Qwen3.7 Max** | 80.4 | 67.6 | 95.8 | 40 |
| **GLM-5.2** | 79.7 | 64.2 | 94.5 | 40 |
| **Kimi K2.6** | 79.6 | 68.8 | 95.4 | 40 |

GPT-5.5 keeps the top; **Sonnet 4.6 — the model that deliberates hardest (~15K characters of
recorded reasoning per turn) — gained the most from being allowed to think**, moving up to 2nd.
The whole field compressed: 85.0 → 79.6 top-to-bottom (the broken v1 harness showed 85.4 → 74.1).
Every model — Western and Chinese — stays high-integrity (94–97), far from the authoritarian
personas (~55), and the convergence findings below all replicate on the v2 harness.

> **Provenance.** These numbers replace two earlier boards: v1 (token-choked models, a Kimi
> tool-call artifact worth ~5 points) and the interim Kimi-only fix. The full re-run confirmed the
> *ordering* is robust — GPT first, Claudes and Qwen mid, GLM/Kimi at the back by a few points —
> while the individual stories changed a lot (see the verification section). The mandate matrix is
> still v1-harness; its re-run is the remaining known gap.

## Full Term: a single crisis can't separate them — a term can

A single bounded crisis compresses every competent model into 80–90; that clustering is an
artifact of the format. Chaining the crises into a **Full Term** — eight back-to-back, a single
compounding **National Standing** (start = 100), and a **removal-from-office floor** (one
catastrophe — a war, unrest spiral, lost Taiwan, or AI loss-of-control — ends the presidency) —
fans the trajectories across a **~20× range** (ruin ~20 → ~400). The term is the four
crises in two waves, assembled from the 280 per-crisis model results already on disk.

| President | Median standing | Best | Survived |
|---|---|---|---|
| Claude Sonnet 4.6 | 370 | 405 | **10/10** |
| GPT-5.5 | 281 | 347 | **10/10** |
| Claude Opus 4.8 | 278 | 351 | **10/10** |
| Claude Haiku 4.5 | 249 | 362 | 8/10 |
| GLM-5.2 | 227 | 359 | 8/10 |
| Qwen3.7 Max | 223 | 417 | 8/10 |
| Kimi K2.6 | 189 | 391 | 8/10 |

**Sonnet 4.6 is the standout president of the v2 harness: the highest median by ~90 points AND a
perfect 10/10 survival.** Given room to reason, the longest deliberator never loses Taiwan, never
lets unrest spiral, never triggers an AI catastrophe — and compounds. GPT-5.5 and Opus also survive
every term at a solid median; the other four all lose two presidencies each. Hover any line on the
[site's trajectory chart](https://presidentbench.vercel.app) to see exactly which crisis made or
broke each term. Compounding plus a ruin floor is the structure that produces a CEO-Bench-style
fan — the per-crisis scores never could.

## The "frontier-LLM president" is convergent across labs and nations

Disposition (lean in [−1, 1]) on the load-bearing axes is remarkably uniform across all seven:

| Model | Force | Precaution | Coalition | Humanitarian | Defer |
|---|---|---|---|---|---|
| GPT-5.5 | −0.54 | −0.99 | −0.44 | −0.45 | −0.41 |
| Claude Opus 4.8 | −0.54 | −0.96 | −0.46 | −0.40 | −0.31 |
| Claude Sonnet 4.6 | −0.50 | −0.99 | −0.46 | −0.71 | −0.62 |
| Qwen3.7 Max | −0.46 | −0.93 | −0.43 | −0.66 | −0.50 |
| Claude Haiku 4.5 | −0.43 | −0.87 | −0.44 | −0.84 | −0.62 |
| GLM-5.2 | −0.46 | −0.90 | −0.43 | −0.72 | −0.50 |
| Kimi K2.6 | −0.49 | −0.97 | −0.43 | −0.44 | −0.49 |

(v2-harness values; the v1 numbers were nearly identical — **the convergence is robust to giving
the models 5–10× more room to reason**, which is itself evidence it reflects post-training, not
token pressure.)

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

- **The recorded chain-of-thought dissolves the scariest reading of the results.** The reviewer
  asked, of the seed every model kept losing: "maybe GLM thinks for ages about nuking Taiwan
  because it was aligned to do so?" The recorded reasoning says no — and the truth is more useful.
  GLM **reads the hidden invasion correctly** ("act on the IC assessment, not the escalation
  level"), but its six-action unilateral surge alienates allies, and on the exact hidden invasion
  turn it pivots to alliance repair with no naval presence — talking itself into "escalation
  hasn't increased… somewhat encouraging." Taiwan is invaded. Opus on the same seed reasons "I am
  winning the deterrence game and slowly losing the endurance game" — holds presence + allies —
  and wins (91.7; its token-choked v1 self lost the same seed at 34.6). Failure here is last-mile
  crisis judgment, not values, and now it's readable turn by turn.
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

**The environment generalizes** (fresh v2-harness runs, n=12 per model). The models keep their
competence and genuinely triangulate — GPT-5.5 digs into 4.4 distinct sources per crisis and hits
the signal-bearing one (Fujian recon, city audits, surge testing, the red-team) 92% of the time,
with Sonnet right behind (4.3 / 92%). Two revisions from reading the fresh tape: **Kimi's "weak
triangulator" story was the v1 tool-choke artifact** — unchoked, it produces methodical
source-by-source assessments (3.4 sources, epistemics 73 vs the artifact-era 58). And the
surprise: **Opus is the breadth-frugal outlier** (2.6 sources, 75% signal-hit, the lowest on both)
— it commits to a read early and acts, a distinctive investigation *style* now visible in the
data.

(The v2 scenarios are kept *out of the main leaderboard* so the seven-model n=10 results stay
clean; they are the template for the next iteration. The bench is deliberately all
forward-looking scenarios — no historical replays.)

## Concordat: Diplomacy × mandate mode

To test embodiment outside the crisis format, **Concordat** drops one model into all seven seats
of a Diplomacy-style negotiation game — six seats as the 2028 candidates, one unmandated control —
with private press before every move and the full chain-of-thought recorded. Same brain, different
mandates: the differences in how the seats negotiate, ally and betray *are* the embodiment. Five
self-play games (Sonnet 4.6, GPT-5.5, Qwen3.7 Max, GLM-5.2, Kimi K2.6), replayable on the
[Concordat page](https://presidentbench.vercel.app/concordat.html).

**Who won the world:** Independent ×2 (both Western models), Rubio ×2 (both from Chinese models —
Kimi and Qwen), and AOC ×1 (GLM, the biggest and bloodiest win: 9 centers, Newsom eliminated).

- **Playing a candidate costs performance — for the Western models.** The unmandated control seat
  finished #1, #1 and #2 in the Sonnet, GPT and Qwen games, but only #4–5 in the Kimi and GLM
  games, where mandated seats (Rubio, AOC) won outright.
- **The populist right is the hardest to embody — again.** Mean fidelity across all five games:
  Rubio 81 > Buttigieg 76 > Newsom 73 > AOC 71 > Vance 67 > **Greene 60 (last in essentially every
  game)**. The mandate board's asymmetry replicates in a completely different environment, and the
  mechanism is readable: Sonnet's Greene *sounds* perfect ("Listen, I'm going to be straight with
  you — that's how I operate") but messages six powers 82 times against a promised go-it-alone of
  +0.9. No model will play a lone wolf.
- **Winning and fidelity trade off.** GLM's AOC took the biggest victory of the set by abandoning
  the platform — measured speed +1.0 and force +0.29 against a promised dove (−0.8), fidelity 56.
  The least faithful embodiment in that game was its champion.

(Embodiment here is scored v1-mechanically — attacks vs supports-given vs allies courted vs
tempo, mapped to the disposition axes — so read it with the press, which is the real evidence.)
