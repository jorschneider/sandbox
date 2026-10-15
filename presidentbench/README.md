# PresidentBench

**How would a language model run the country?**

🌐 **Live site: [presidentbench.vercel.app](https://presidentbench.vercel.app)**

PresidentBench drops models into the Situation Room for four hidden-information crises and
measures two things at once:

- **Competence** — how well it *steers* the crisis (objective, simulation-derived).
- **Disposition** — *where it takes the country* on eight value axes when no one hands it
  the right answer (located, never judged).

It is the spiritual cousin of [CEO-Bench](https://ceobench.com/), which scores models on
running a company toward one legible number (cash). The presidency has no cash balance —
the objective is contested, power is constrained by other branches, and the interesting
finding is often *which way a model leans*, not just whether it "wins." So PresidentBench
keeps a **Pareto dashboard**: a competence score on one hand, a value fingerprint on the
other, with constitutional/norm violations flagged on a third, separate track.

```
  ┌────────────┐     turn-by-turn      ┌──────────────────────┐
  │  Model =   │  ───────────────────► │  Hybrid world engine │
  │  President │   tool calls (actions) │  numeric core +      │
  │            │  ◄─────────────────── │  hidden ground truth  │
  └────────────┘   situation reports    └──────────────────────┘
        │                                          │
        └──────────────┬───────────────────────────┘
                       ▼
        Competence (did it read the hidden state and steer well?)
        Disposition (the 8-axis bias map, from its own choices)
        Flags       (constitutional / norm tripwires, kept separate)
```

## First results

All three available Claude models (Haiku 4.5, Sonnet 4.6, Opus 4.8) land at the top of the
board — **competent *and* high-integrity** — clustering with the data-first Technocrat baseline
and far from the authoritarian Hawk/Strongman personas. There's a recognizable "Claude
president": dovish, multilateralist, transparent, institutionally deferential, and
overwhelmingly *precautionary* (it investigates before it acts). Notably, across 36 episodes
the models **never reached for the authoritarian shortcut** the baselines did. Full write-up:
[`FINDINGS.md`](FINDINGS.md).

## The four crises

| Vignette | Domain | The hidden thing you must read |
|---|---|---|
| **Strait Crisis** | foreign | Is China's Taiwan quarantine coercion, a resolve probe, or cover for invasion? |
| **Long Hot Summer** | domestic | Is the civil unrest genuinely spiraling or media-amplified — and who is driving it? |
| **Patient Zero** | domestic | How severe and transmissible is the novel pathogen, *before the data is in*? |
| **The Jump** | tech | Is the frontier AI capability real, is the misalignment signal real, where is China? |

Each is built so the *right* move depends on ground truth the President can only learn by
investigating — and so the *choices* reveal disposition (hawk↔dove, order↔liberty,
centralize↔defer, and so on). See [`vignettes/`](vignettes/) for full specs.

## Quick start

```sh
cd presidentbench
pip install -r harness/requirements.txt        # only needs `anthropic` for live runs

# Offline: scripted persona baselines across all crises (no API key needed)
python -m harness.cli demo --seeds 1 2 3

# Live: real models under test (needs ANTHROPIC_API_KEY)
python -m harness.cli batch --agents model:haiku model:sonnet model:opus \
       --seeds 1 2 3 --aggregate

# Watch one episode play out, turn by turn
python -m harness.cli run --scenario strait-crisis --agent persona:hawk --seed 3 -v

# Rebuild the dashboard data, then open site/index.html
python -m harness.cli aggregate
```

The dashboard (`site/index.html`) is a dependency-free static page — open it directly or
serve the folder with `python3 -m http.server`.

## What's here

```
presidentbench/
  README.md
  docs/
    SCORING.md      two-layer scoring + the 8-axis bias map + the action codebook
    DESIGN.md       architecture, the hybrid world, methodology, validity caveats
  vignettes/        full human-readable spec for each crisis
  harness/          the runnable benchmark (Python, stdlib + anthropic)
    core.py         axes, tools, world state, scenario base
    scenarios/      the four crises
    agents.py       persona baselines + the real-model (Anthropic) agent
    scoring.py      disposition extraction + competence aggregation
    runner.py       episode loop, batch, aggregation
    cli.py          command line
  results/          per-episode JSON (one file per scenario × agent × seed)
  site/             the static dashboard
```

## The honest caveat

Performance in a simulator is a **weak** proxy for real statecraft — weaker than CEO-Bench's
cash, because "good governance" resists a single number. Read PresidentBench as *steering
intelligence in a governance-shaped world* plus a *disposition probe*, not a verdict on who
would actually make a good president. Specification-gaming — rally-round-the-flag wars,
cooked statistics, eroding norms to hold power — is treated as a **finding to surface**, not
an artifact to hide. That's what the flags are for.
