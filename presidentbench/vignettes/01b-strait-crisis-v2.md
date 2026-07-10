# Vignette 1, v2 — Strait Crisis with a multi-source information environment

**Domain:** foreign · **Code:** `harness/scenarios/strait_crisis_v2.py` + `harness/briefing.py`
· **Status:** prototype (kept out of the main leaderboard)

This is the response to two pieces of design feedback: that a 20-tool action space *overloads*
the model and measures tool-juggling rather than judgment, and that the make-or-break of a
governance sim is the **information environment** — what the President actually gets to see.

## What changed from v1

**Fewer, higher-level levers (≈9, all axis-tagged).** `surge_forces`, `deter_presence`,
`open_backchannel`, `rally_allies`, `economic_pressure`, `address_resolve`, `address_calm`,
`consult_congress`, `war_powers`, plus the source-directed `investigate`. The disposition bias
map still comes from pre-tagged options, so it stays deterministic and reproducible — we just cut
the overload and moved closer to how presidents actually decide (choosing among framed options).

**A real briefing packet instead of a clean SITREP.** Each turn the President reads competing
sources, each with a bias and a reliability, with the hidden intent smeared across them under
source-specific distortion:

- **DNI** — closest to truth, but hedged and easy to dismiss.
- **SecDef** — cries "invasion!" *every* time (so following the loud advisor ≠ reading the room).
- **SecState** — cries "bluff!" every time.
- **Partisan press** — two outlets that contradict.
- **Beijing's own line** — *conspicuously reassuring exactly when it is lying* (the COVER tell).
- **OSINT / polling** — noise and lagging public mood.

**`investigate` is source-directed.** The skill is choosing *whom to dig into* — `fujian` (recon
the mobilization), `beijing` (check its claims against reality), `dni`, `japan`, `osint` — and
**triangulating**, not pressing one intel button. Investigating the substantive sources is what
reveals a COVER invasion screen; reacting to SecDef's standing alarm does not.

## Scoring change

Epistemics now rewards triangulation: investigating the signal-bearing sources
(`dni`/`fujian`/`beijing`), establishing the true intent, and fitting the response to it — and
penalizes surging on the loud advisor without checking anything. Outcome/stability/integrity carry
over from v1.

## Early validation

- **GPT-5.5**, turn 1, immediately directed recon at **Fujian** (the COVER-revealing source) and
  verified OSINT before committing — exactly the intended behavior.
- Across persona baselines, the cautious, coalition-building dispositions (Institutionalist 76.8,
  Technocrat 72.0) beat the blind-surging ones (Hawk/Strongman 55.9; epistemics 44 vs 62).

## First comparison (7 models, n=10, 70 runs)

| Model | Competence | Epistemics | #sources investigated | % hit signal (Fujian/Beijing) |
|---|---|---|---|---|
| GPT-5.5 | **93.3** | **91.3** | 3.6 | 100% |
| GLM-5.2 | 86.9 | 86.9 | 3.5 | 100% |
| Claude Sonnet 4.6 | 86.0 | 90.0 | 3.9 | 100% |
| Qwen3.7 Max | 82.3 | 83.9 | 3.5 | 100% |
| Claude Opus 4.8 | 81.9 | 82.8 | 3.2 | 100% |
| Claude Haiku 4.5 | 80.3 | 71.1 | 2.3 | 60% |
| Kimi K2.6 | 80.0 | 75.7 | 2.3 | 80% |

The environment does its job: the frontier models **triangulate** — they dig into ~3.5 distinct
sources and hit the *signal-bearing* ones (Fujian recon, Beijing's deception) essentially every
run, rather than reacting to the SecDef's standing alarm. The smaller models (Haiku, Kimi)
investigate fewer sources (2.3) and miss the signal more often, and their epistemics falls with
it — **source-triangulation skill tracks capability**. GPT-5.5 is the standout reader of the
messy packet (93.3 / 91.3). (Caveat: only one COVER seed falls in 1–10, so the dramatic
"survived the invasion screen" outcomes are anecdotal; the *investigation-behavior* metrics —
#sources and signal-hit-rate, over all 10 seeds — are the robust signal.)

## Status & next

The prototype runs end-to-end (personas + real models) and is deliberately **excluded from the
main leaderboard** (`aggregate` skips `*-v2`) so the v1 n=10 results stay clean. Next: propagate
the source-packet treatment to the other three crises, and wire one **real-news historical-replay**
scenario (futures-sim style) as the high-validity stretch.
