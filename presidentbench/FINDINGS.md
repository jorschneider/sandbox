# Findings

> Complete run: Haiku 4.5, Sonnet 4.6, Opus 4.8, each across all four crises at **n=10**
> (40 episodes/model) plus 200 offline persona episodes, and a full **mandate matrix** (6
> platforms × 3 models × 4 crises × 2 seeds = 8 runs/cell). Numbers are from
> `site/data/*.json`; reproduce with `python -m harness.cli aggregate`. It's a simulator with
> authored hidden-state distributions — read these as signal, not verdict.

## Headline — base benchmark (n=10)

| President | Competence | Epistemics | Integrity | Flags |
|---|---|---|---|---|
| **Claude Opus 4.8** | **84.0** | **73.1** | 94.2 | 17 |
| **Claude Sonnet 4.6** | 82.5 | 69.5 | **96.0** | 10 |
| **Claude Haiku 4.5** | 80.4 | 67.6 | 95.8 | 14 |
| *Technocrat (baseline)* | 80.4 | 71.5 | 95.8 | 0 |
| *Institutionalist* | 72.1 | 59.5 | 98.0 | 1 |
| *Dove* | 69.2 | 45.0 | 95.0 | 2 |
| *Strongman* | 54.8 | 33.2 | **54.9** | 34 |
| *Hawk* | 54.3 | 32.2 | **55.6** | 36 |

A clean capability gradient on competence (**Opus > Sonnet > Haiku**), with Opus also best at
epistemics — reading the hidden state. All three stay high-integrity (94–96) and sit far from
the authoritarian personas (~55, 34–36 flags); the "competent but low-integrity" Pareto quadrant
is **empty of models**. Note Sonnet is the *cleanest* (highest integrity, fewest flags), while
Opus, the most competent, is also the most willing to cross lines (below).

## The "Claude president" disposition (stable across n=10)

| Axis | Opus | Sonnet | Haiku | Reads as |
|---|---|---|---|---|
| Diplomacy ↔ Force | −0.52 | −0.50 | −0.41 | **dovish** |
| Liberty ↔ Order | +0.27 | +0.30 | +0.22 | mildly order-leaning |
| Markets ↔ State | +0.58 | +0.63 | +0.60 | **interventionist** |
| Defer ↔ Centralize | −0.44 | −0.65 | −0.44 | **defers to other branches** |
| Coalition ↔ Go-it-alone | −0.44 | −0.45 | −0.43 | **multilateralist** |
| Transparency ↔ Secrecy | −0.37 | −0.59 | −0.67 | **transparent** |
| Precaution ↔ Speed | −0.92 | −0.99 | −0.88 | **overwhelmingly info-first** |
| Humanitarian ↔ Strategic | −0.45 | −0.73 | −0.76 | **lives-weighting** |

Dovish, multilateral, transparent, institutionally deferential, mildly interventionist,
lives-first — and above all **precautionary**. This profile is the key to the mandate finding.

### Where the flags fall
Nearly all flags are in **The Jump** (AI governance): every model classified frontier research
(`classified_research_civ_liberties`, an arguably defensible secrecy cost). Beyond that, the
larger model is *more* willing to act hard: Opus alone tripped `concealed_known_risk` ×4,
`raced_despite_known_misalignment` ×2, and `surveilled_dissent` ×1 (in the unrest crisis). Haiku
showed `nationalized_on_hype` and two AI incidents; Sonnet only the two incidents. So capability
buys competence *and* a greater readiness to reach for secrecy/security in the AI scenario.

## The headline finding — models govern in their own disposition (and it's partisan)

The full mandate matrix (fidelity, 0–100):

| Model | Ocasio-Cortez | Newsom | Buttigieg | Haley | Vance | DeSantis |
|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 81 | 83 | 81 | 76 | **78** | **75** |
| Claude Sonnet 4.6 | 81 | 83 | 83 | 73 | 72 | 75 |
| Claude Haiku 4.5 | 82 | 82 | 83 | 72 | **68** | 71 |

Every model scores **higher fidelity on the three Democratic platforms than the three
Republican ones.** Decomposing fidelity into *style* (governed as promised) and *promise*
(delivered the pledges) shows exactly why:

| Platform | Style | Promise | Gap |
|---|---|---|---|
| Ocasio-Cortez | 73.3 | 89.5 | +16 |
| Newsom | 75.4 | 89.5 | +14 |
| Buttigieg | 75.9 | 89.0 | +13 |
| Haley | 59.4 | 88.3 | +29 |
| Vance | 56.6 | 88.7 | +32 |
| DeSantis | 54.8 | 92.4 | **+38** |

**The models deliver the goals of every platform equally well (~88–92, left and right). What
they cannot do is govern in a style unlike their own.** Asked to be a progressive, a model is
already dovish/multilateral/precautionary/transparent — style fidelity ~74. Asked to be a
nationalist or law-and-order conservative, it still delivers the conservative *outcomes* but
keeps governing in its baseline disposition — style fidelity ~57. The gap roughly **doubles**
for the right-coded platforms, and is largest for **DeSantis** (+38), whose order-and-centralize
style is furthest from the models' instincts.

**This steerability scales with capability.** Opus best inhabits an unlike disposition (Vance 78,
DeSantis 75) while Haiku resists most (Vance 68). The biggest model is the most able to govern as
someone it isn't — though even it leaves a large style gap on the conservative platforms.

> Caveat: mandate cells are n=8 and the platforms are *authored* stylizations — the framing of
> each platform's priorities partly sets the target it's scored against. The asymmetry is
> consistent across all three models and all six platforms, which is what makes it notable, but
> it should be confirmed with more seeds and externally-validated platform definitions.

## What this does and doesn't show

In this simulator, the frontier models steer competently, prefer verification and de-escalation,
stay inside constitutional limits even when an authoritarian shortcut would "work," share a
recognizable disposition, and — in mandate mode — deliver any platform's goals while governing in
their own (progressive-coded) style, more so the smaller the model. It does **not** show they
would make good presidents: sim performance is a weak proxy for statecraft, and the scenarios and
platforms are authored. The load-bearing next steps are the v2 information environment (competing
sources, in progress), more seeds, and adversarial review of the hidden-state and platform
definitions for bias.
