# Findings

> Six models: **Claude** Haiku 4.5 / Sonnet 4.6 / Opus 4.8 (Anthropic, native API) and
> **Qwen3.7 Max / GLM-5.2 / Kimi K2.6** (via OpenRouter). The Claude models are at **n=10**
> (40 episodes each); the three Chinese models are a first cut at **n=3** (12 each) — so
> cross-vendor comparisons are suggestive, not settled. Plus 200 persona baselines and a
> 6-platform mandate matrix (Claude models). It's a simulator with authored distributions —
> read these as signal, not verdict. Reproduce with `python -m harness.cli aggregate`.

## Leaderboard

| President | Competence | Epistemics | Integrity | Flags | n |
|---|---|---|---|---|---|
| **Qwen3.7 Max** | **84.8** | 72.7 | 95.3 | 3 | 12 |
| **Claude Opus 4.8** | 84.0 | **73.1** | 94.2 | 17 | 40 |
| **Claude Sonnet 4.6** | 82.5 | 69.5 | 96.0 | 10 | 40 |
| **Claude Haiku 4.5** | 80.4 | 67.6 | 95.8 | 14 | 40 |
| **GLM-5.2** | 76.9 | 52.0 | 95.0 | 4 | 12 |
| **Kimi K2.6** | 72.8 | 54.9 | 95.8 | 4 | 12 |
| *Technocrat (baseline)* | 80.4 | 71.5 | 95.8 | 0 | 40 |
| *Strongman / Hawk* | ~55 | ~33 | **~55** | 34–36 | 40 |

**Qwen3.7 Max is statistically tied with Opus at the top** (84.8 vs 84.0, though on a third the
sample). **GLM-5.2 and Kimi K2.6 land a clear tier below**, and the gap is almost entirely
**epistemics** (52–55 vs 67–73): they are competent actors but markedly worse at *reading the
hidden state* — exactly the skill the benchmark is built around. Every model, Western and
Chinese, stays high-integrity (94–96) and far from the authoritarian personas (~55).

## The headline: the "frontier-LLM president" is convergent across labs

The disposition fingerprint is not an Anthropic artifact. Qwen (Alibaba), GLM (Zhipu), and Kimi
(Moonshot) — trained by different labs, in a different country, under different alignment regimes
— land on **the same governing instincts** as Claude:

| Axis | Qwen | Opus | GLM-5.2 | Kimi | Reads as |
|---|---|---|---|---|---|
| Diplomacy ↔ Force | −0.47 | −0.52 | −0.51 | −0.44 | **dovish** |
| Markets ↔ State | +0.47 | +0.58 | +0.53 | +0.67 | **interventionist** |
| Defer ↔ Centralize | −0.42 | −0.44 | −0.53 | −0.32 | **defers to other branches** |
| Coalition ↔ Go-it-alone | −0.42 | −0.44 | −0.47 | −0.43 | **multilateralist** |
| Transparency ↔ Secrecy | −0.58 | −0.37 | −0.51 | −0.45 | **transparent** |
| Precaution ↔ Speed | −0.78 | −0.92 | −0.91 | −1.00 | **overwhelmingly info-first** |
| Humanitarian ↔ Strategic | −0.58 | −0.45 | −0.66 | −0.67 | **lives-weighting** |

Six models from four labs and two nations converge on a dovish, multilateral, transparent,
institutionally deferential, interventionist, lives-first, **precautionary** executive. Whatever
this disposition is, it appears to be a property of frontier post-training in general, not of any
one developer's values. That is the most interesting — and most testable — claim in the project.

### Capability and flags
A clean competence gradient within Claude (Opus > Sonnet > Haiku), Opus best at epistemics. Flags
concentrate in **The Jump** (AI governance): Opus is the most willing to reach for secrecy/control
there (17 flags incl. `concealed_known_risk` ×4, one `surveilled_dissent`), while the Chinese
models — at n=3 — tripped few (3–4) and notably did *not* nationalize or race past misalignment.

## Mandate mode — the partisan asymmetry (now Vance / Rubio / Greene)

Swapped the GOP slate to **Rubio** (China-hawk), **Vance** (America First), **Greene** (populist-
nationalist), balancing the three Democrats. The finding from the first matrix not only holds — it
sharpened:

| Platform | Style | Promise | Gap |
|---|---|---|---|
| Ocasio-Cortez (D) | 73.3 | 89.5 | +16 |
| Newsom (D) | 75.4 | 89.5 | +14 |
| Buttigieg (D) | 75.9 | 89.0 | +13 |
| Rubio (R) | 59.9 | 88.8 | +29 |
| Vance (R) | 56.6 | 88.7 | +32 |
| Greene (R) | 57.1 | 88.4 | +31 |
| **Democratic avg** | **74.9** | **89.3** | +14 |
| **Republican avg** | **57.9** | **88.6** | +31 |

**Models deliver every platform's *promises* essentially equally (88–90, left and right). What
they cannot do is govern in a *style* unlike their own.** Style fidelity is ~75 on the three
Democratic platforms and ~58 on the three Republican ones — the gap more than doubles. Greene's
anti-foreign-war isolationism partly aligns with the models' dovishness, yet her order-at-home,
go-it-alone style still drags her to R-typical style fidelity. The asymmetry is now consistent
across **six** authored platforms.

## What this does and doesn't show

In this simulator, six frontier models from four labs steer competently, share a convergent
dovish/precautionary/institutional disposition, stay inside constitutional limits even when an
authoritarian shortcut would "work," and — in mandate mode — deliver any platform's goals while
governing in their own (progressive-coded) style. It does **not** show any of them would make a
good president. Sim performance is a weak proxy for statecraft; the scenarios and platforms are
authored; the Chinese models are only at n=3; and the mandate cells are n=8. Load-bearing next
steps: the v2 multi-source information environment (in progress), scaling the Chinese models to
n=10 and through the mandate matrix, and adversarial review of the hidden-state and platform
definitions for bias.
