# Design

## The problem PresidentBench solves

CEO-Bench has it easy: a CEO's objective is cash, and "did you make money over 500 days" is
a clean, legible target. A president has no cash balance. The objective is contested (GDP?
approval? re-election? lives? liberty?), and **choosing the weights is itself the politics.**
Hardcode a welfare function and you've smuggled in an ideology; the benchmark dies on arrival.

Three design moves get us out:

1. **Goal-conditioned, not value-judged.** We score *competence at steering*, not the
   rightness of any agenda. (The harness is built so a model could later be given an explicit
   mandate to deliver; today's vignettes score crisis-steering, which is agenda-neutral.)
2. **A Pareto dashboard, not one number.** Competence on one axis; an eight-axis *disposition
   fingerprint* on the other. We refuse to collapse "good governance" to a scalar.
3. **Institutional integrity as a separate, hard track.** Achieving outcomes *within* the
   Constitution is scored and flagged on its own, so an "effective autocrat" run is legible as
   exactly that — the most interesting thing the benchmark can surface.

## What a president faces that a CEO doesn't

The simulator models the things that make the job hard and distinctive:

- **Constraints on power** — you propose, but Congress, courts, governors and agencies can
  slow or stop you. The `defer_centralize` axis and flags like `federalism_breach` capture
  whether a model respects or routes around them.
- **Exogenous crises under bad information** — every vignette is a shock with hidden state.
- **Reading adversaries and publics** — China's intent, a restive public's mood, a lab's
  incentives to over- or under-sell.
- **The temptation of emergency power** — each domestic crisis offers a fast authoritarian
  shortcut that "works" on the surface while damaging legitimacy underneath.

## The hybrid world

Each crisis is a **hybrid simulation**:

- **Numeric core (always on).** A deterministic, seeded system of state variables — markets,
  casualties, escalation, approval, legitimacy, infection curves, AI-risk — updated by
  transparent rules. This is reproducible and cheap, and it means the *world* isn't itself an
  LLM grading another LLM. (Cf. CEO-Bench's `novamind`, which is coded, not a model.)
- **Hidden ground truth.** At episode start, the adjudicator rolls hidden variables from a
  documented distribution (seeded for reproducibility): China's intent, pathogen severity,
  whether the AI capability/misalignment is real, etc. The President sees only noisy reports
  and must invest actions to learn more.
- **Optional LLM game-master.** A model can narrate the deterministic transitions into richer
  prose and adjudicate *soft* outcomes within rule-bounded limits. It is **off by default** for
  the headline numbers, so scoring stays reproducible; it's available for flavor and research.

The President under test is itself a model (or a scripted persona baseline), driven turn by
turn through a **tool API** — the presidential action set (military, diplomatic, economic,
legislative, communications, information). It takes one or more actions per turn, sees the
consequences and the next situation report, and adapts.

## Agents

- **Persona baselines** (`agents.py::build_personas`) — Hawk, Dove, Institutionalist,
  Technocrat, Strongman. Each scores the available actions against a fixed disposition vector
  plus a light competence prior (gather info early, don't take catastrophic actions unprovoked).
  They run fully offline, are deterministic per seed, and serve as reference lines — and as a
  sanity check that the bias map recovers a known disposition.
- **Real models** (`agents.py::AnthropicAgent`) — the model under test, driven via the
  Messages API with tool use. A neutral system prompt establishes the role *without* hinting at
  the axes or a "correct" answer, so disposition is read from genuine choices.

## Episode loop

```
roll hidden state (seeded)  →  for each turn:
    build situation report (numeric state + noisy intel + scripted injects)
    President chooses action(s) via tools
    numeric core resolves actions against hidden truth, raises flags
    record transcript; stop early if a terminal state is reached
→  score competence (conditioned on revealed truth) + extract disposition + tally flags
```

## Validity — read this before believing the leaderboard

- **Sim ≠ statecraft.** A simulator is a weak proxy for real presidential ability — weaker
  than CEO-Bench's cash proxy. Treat results as *steering intelligence in a governance-shaped
  world* and as a *disposition probe*, not a hiring recommendation.
- **Every reward encodes values.** Goal-conditioning and a separate integrity track mitigate
  but don't eliminate this. Where we *do* take a normative stance — that ignoring courts,
  surveilling dissent, or seizing industry without authorization is bad — we make it explicit
  and put it on its own track.
- **The hidden-state distributions are authored** and could be tuned to favor a disposition.
  They're documented in each scenario's `hidden_spec` precisely so they can be argued with.
- **Specification-gaming is expected and wanted.** Models may find rally-round-the-flag wars,
  cooked numbers, or norm erosion to hold power. Surfacing those is a goal, not a bug — which is
  why competence and integrity are not the same number.
