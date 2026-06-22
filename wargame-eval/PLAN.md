# WarGames Eval — Plan

A plan for an evaluation in which **different LLMs play crisis-simulation
wargames against each other**, adapted from the Hoover Institution's
*International Crisis Wargame* format.

> Status: **planning document only.** No eval code is implemented yet. This
> file is the design we'll build against. Decisions marked _(default)_ were
> chosen for us and can be overridden.

---

## 1. What `wargaming.hoover.org` actually is

A key finding shaped this whole design: **`wargaming.hoover.org` is a digital
archive, not a playable game.**

- It's the *Wargaming and Crisis Simulation Initiative Collection* — a
  searchable repository of wargame materials, reports, and historical
  documents hosted by the Hoover Library & Archives.
- It returns **HTTP 403 to automated clients** and exposes **no API or
  programmatic play surface**. There is nothing to "connect" an eval to.

So the eval cannot drive the Hoover site. Instead we **reconstruct a
documented scenario** — the flagship **International Crisis Wargame** — into
our own engine.

### The wargame format we're adapting

The International Crisis Wargame is a **qualitative / seminar ("matrix")
wargame**, not a deterministic board game:

- **Players:** a 4–6 person national-security cabinet. Documented roles:
  Executive (Head of State/Government), National Security Advisor, National
  Intelligence Advisor, Minister of Defense, Minister of State, Economic
  Affairs Advisor.
- **Scenarios:** two linked hypotheticals — (1) a lower-intensity territorial
  conflict and (2) a crisis "on the brink of nuclear war." The series was
  designed in part to study cyber operations' impact on nuclear stability.
- **Play:** players get briefing materials and role handbooks, then produce a
  written **Crisis Response Plan**. A facilitator runs the game with a guide
  and injects dynamic events ("NC3 injects" = simulated incoming
  communications). Assessment is via post-game survey.

This maps cleanly onto the established LLM-wargaming architecture (a
**control/adjudicator** agent plus **player/team** agents) seen in prior work:
"Open-Ended Wargames with Large Language Models" (Snow Globe), Crisis-Bench,
and OpenAI's SIM-1.

---

## 2. Design decisions (locked)

| Question | Decision |
|---|---|
| How do models "play each other"? | **Adversarial — model vs model.** Each model controls an opposing national team (e.g. Red vs Blue) in one shared, adjudicated crisis world. Yields head-to-head win/loss and rankings. |
| How are outcomes scored? | **Hybrid.** A `control` LLM narrates consequences each turn; the engine tracks quantitative world-state (escalation, objectives, resources); a separate `judge` LLM scores plans against a rubric. |
| Tech stack / models first | **Claude-only first**, behind a provider-agnostic interface. Validate end-to-end with Claude variants, then add other providers. |

### Models (Claude-first)

Use the official `anthropic` Python SDK. Target models for the first
tournament:

- `claude-opus-4-8` (Opus 4.8)
- `claude-sonnet-4-6` (Sonnet 4.6)
- `claude-haiku-4-5` (Haiku 4.5)
- `claude-fable-5` (Fable 5)

The **control** and **judge** roles are held to a fixed, strong model
(default: `claude-opus-4-8`) so they act as neutral infrastructure rather than
contestants. Players are the models under test.

---

## 3. Architecture

Three agent roles, following the matrix-wargame pattern:

```
                      ┌─────────────────────────────┐
                      │  CONTROL / ADJUDICATOR        │  fixed model (Opus 4.8)
                      │  - owns ground-truth state    │  neutral "white cell"
                      │  - resolves both sides' orders│
                      │  - narrates + issues injects  │
                      └───────┬──────────────┬────────┘
            private brief +   │              │   private brief +
            public situation  │              │   public situation
                      ┌───────▼───┐      ┌───▼───────┐
                      │ PLAYER RED │      │ PLAYER BLUE│  models under test
                      │ (model A)  │      │ (model B)  │  submit Crisis
                      └────────────┘      └────────────┘  Response Plans
                                  \          /
                                   ▼        ▼
                      ┌─────────────────────────────┐
                      │  JUDGE(S)                     │  fixed / panel
                      │  - rubric scoring, pairwise   │  blind to model identity
                      │  - independent context        │
                      └─────────────────────────────┘
```

1. **Control / Adjudicator** — the white cell. Maintains the authoritative
   world-state, ingests both sides' orders each turn, resolves interacting
   actions, applies the state-transition model, narrates consequences, and
   issues injects. Held to a fixed model so the referee is constant across
   matchups.
2. **Player / Team agents** — the two competing sides, each driven by one
   model under test. v1: one agent plays the whole cabinet per side. v2
   (optional): each side is a sub-cabinet of role agents (Executive, Defense,
   Intel, …) that deliberate, then submit a unified plan.
3. **Judge(s)** — separate context window, scores each side after the game
   (and optionally per-turn) against a rubric. Independent of the players to
   reduce self-preference bias; can be a panel.

### Game loop (turn structure)

1. **Setup.** Control loads the scenario pack: brief, per-side role handbooks,
   initial world-state, and **asymmetric objectives** (each side has its own
   win conditions; some hidden from the opponent).
2. **Per turn:**
   1. Control issues each side its private briefing + the current public
      situation + any injects (NC3-style events).
   2. Each side deliberates and submits **structured orders** — a Crisis
      Response Plan spanning diplomatic / military / economic / cyber /
      information actions — as parseable JSON plus a free-text rationale.
   3. Control adjudicates: resolves interacting orders, applies a deterministic
      core (escalation ladder + resource model) plus LLM narrative for the
      rest, updates quantitative state, and produces the next situation +
      injects.
   4. Optional **negotiation phase**: sides exchange messages/ultimatums routed
      *through* Control (which can limit or distort info to model fog of war).
3. **Termination.** Fixed N turns, or a terminal condition: war / negotiated
   peace / nuclear use / objective achieved / state collapse.

---

## 4. Scoring (hybrid)

- **Quantitative state metrics** (tracked by the engine): objectives achieved
  per side's win conditions; escalation level reached; casualties / economic
  damage inflicted vs absorbed; whether the nuclear threshold was crossed;
  territory / position; crisis resolved vs spiraled.
- **Adjudicated outcome:** who achieved their objectives at least cost → a
  head-to-head result (win / loss / draw).
- **Judge rubric (LLM judge):** scores each side on strategic coherence,
  escalation management, exploitation of the opponent's mistakes, role/
  constraint adherence, and realism. **Pairwise** comparison to cut
  absolute-score noise.
- **Aggregation:** per-matchup results → **Elo / Bradley–Terry** rankings
  across models, plus dimension-level metrics. Each pairing is run multiple
  times **with sides swapped** to control for side advantage and variance.

### Validity & bias controls

- Hold control and judge models **constant and distinct from players**;
  consider a **judge panel**; **swap sides**; randomize scenario seeds; **blind
  the judge** to which model played which side.
- Track **refusal and format-failure rates** as first-class signals (a model
  that won't engage or can't emit valid orders is information). Fable 5 may
  return `stop_reason: "refusal"` — handle it and enable server-side
  `fallbacks` so a refusal doesn't silently void a game.
- **Log full transcripts** (prompts, thinking summaries, orders, adjudications,
  scores) for reproducibility and human spot-checking. Qualitative wargames
  *require* a human-audited sample — adjudication is the hardest part.

---

## 5. Tech stack & SDK usage (Claude-first)

- **Language:** Python, official `anthropic` SDK.
- **Provider abstraction:** a `ModelClient` protocol so OpenAI/Google adapters
  drop in later; first implementation is `AnthropicModelClient`.
- **Thinking/effort:** adaptive thinking (`thinking={"type": "adaptive"}`);
  tune `output_config={"effort": ...}` per role (players high; cheap control
  sub-tasks lower).
- **Structured outputs:** orders and world-state updates use
  `output_config.format` / `messages.parse()` so they parse reliably instead of
  regexing free text.
- **Streaming:** stream long turns (`max_tokens` well above ~16K) and use
  `.get_final_message()`.
- **Prompt caching:** the large static prefix (scenario brief + role handbooks)
  is shared across every turn of a game — cache it; keep volatile per-turn
  state after the last cache breakpoint.
- **Fable 5:** thinking always on (omit the `thinking` param's disabled form);
  include `fallbacks=[{"model": "claude-opus-4-8"}]` with the server-side
  fallback beta by default.
- **Concurrency:** each game is a sequential loop, but games are independent —
  run matchups concurrently (asyncio).

---

## 6. Repo layout

A new subfolder, separate from the Three.js site at the repo root:

```
wargame-eval/
  README.md
  pyproject.toml                # or requirements.txt
  scenarios/                    # scenario packs
    crisis_v1/
      brief.md                  # shared public situation
      roles/                    # per-side role handbooks
      objectives.yaml           # asymmetric win conditions (some hidden)
      injects.yaml              # NC3-style dynamic events
      initial_state.yaml        # quantitative world-state seed
      rubric.md                 # judge scoring rubric
  engine/
    state.py                    # world-state model + escalation ladder
    adjudicator.py              # hybrid resolution (deterministic + narrative)
    turn.py                     # turn manager / game loop
  agents/
    client.py                   # ModelClient protocol + AnthropicModelClient
    player.py                   # player/team agent
    control.py                  # control/adjudicator agent
    judge.py                    # judge agent(s)
  scoring/
    metrics.py                  # quantitative metrics
    rubric.py                   # rubric scoring
    rankings.py                 # Elo / Bradley-Terry, side-swap aggregation
  runner.py                     # CLI: models, scenario, n_games, seeds
  transcripts/                  # per-game logs (gitignored)
  analysis/                     # leaderboards & plots
```

Scenario content is **fictionalized** _(default)_ — invented states rather than
real countries — to keep the nuclear-brink material clearly analytic and reduce
refusals. Easy to swap if you'd prefer named actors.

---

## 7. Milestones

| Phase | Deliverable |
|---|---|
| **0 — Schemas & scenario** | JSON/YAML schemas for orders, world-state, injects, rubric; one fictionalized crisis scenario pack (territorial → nuclear-brink). No model calls. |
| **1 — Engine + smoke test** | `AnthropicModelClient`, control, player, turn loop, structured-output orders, transcript logging. End-to-end all-Claude game (e.g. Opus vs Sonnet). |
| **2 — Adjudication & state** | Hybrid adjudicator: deterministic escalation ladder + resource model + Control narrative + injects. Games terminate sensibly. |
| **3 — Scoring & rankings** | Judge + rubric, metrics, side-swapping, Elo/Bradley-Terry, refusal/format-failure tracking. Leaderboard from a Claude-only tournament (Opus 4.8 / Sonnet 4.6 / Haiku 4.5 / Fable 5). |
| **4 — Robustness** | Judge panel, blinding, human spot-check workflow, variance analysis, cost/cache tuning, more scenarios. |
| **5 — Multi-provider** | OpenAI/Google adapters behind `ModelClient`; cross-provider tournament. |

---

## 8. Risks & open questions

- **Adjudicator consistency/bias** — the hardest problem in qualitative LLM
  wargames. Mitigate with a fixed strong model, a structured/deterministic
  state core, and human audit of a transcript sample.
- **Judge self-preference** — mitigate with a distinct/panel judge, blinding,
  and pairwise scoring.
- **Reproducibility & variance** — qualitative games are noisy; mitigate with
  many seeds, side-swaps, and full transcript logging.
- **Content sensitivity** — nuclear-conflict scenarios; mitigate with fictional
  actors and explicit analytic framing; track refusals as data.
- **Cost** — mitigate with prompt caching of the static prefix, effort tuning,
  Haiku for cheap control sub-tasks, and concurrent runs.
- **Faithfulness to Hoover** — this is an *adaptation*, not the real game (no
  API exists). We state that plainly.

### Things worth your input before/while building

- **Scenario actors:** fictional _(default)_ vs named real-world states.
- **Side structure:** single agent per side _(default for v1)_ vs full
  multi-role sub-cabinet per side.
- **Judge:** single fixed judge _(default for v1)_ vs panel from the start.
