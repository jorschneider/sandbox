# xi-succession — a scenario workbench for Xi succession analysis

A dependency-free Python CLI that helps analysts think *structuredly* about
leadership succession in the People's Republic of China. It does not predict
anything. It packages a reference knowledge base with the standard
structured analytic techniques so that scenario work is explicit, auditable,
and comparable across analysts:

- **Scenario classes (triggers):** six mutually exclusive ways a succession
  episode can begin — no succession (`continuity`), managed transition,
  health incapacitation, sudden death, elite removal, crisis-forced — each
  with key questions and historical analogs.
- **Knowledge base:** key actors (PSC, military, security, successor-watch
  names, elders), seven key drivers of uncertainty, seventeen observable
  indicators mapped to scenario classes, and eight historical precedents
  (1971 Lin Biao through the 2018 term-limit abolition, plus USSR analogs).
- **Techniques:** 2x2 alternative-futures matrices, indicators & warnings
  scoring, key assumptions checks, probability coherence checks,
  multi-analyst aggregation, and Markdown report generation.

> **Data caveat:** all reference data is a snapshot **as of January 2026**
> (`xi_succession/data.py`, `DATA_AS_OF`). Chinese elite politics is opaque
> and fast-moving — edit `data.py` to current ground truth before relying on
> outputs. Successor-watch entries are explicitly speculative.

## Install / run

No dependencies beyond Python 3.10+. Either run in place:

```sh
python -m xi_succession --help
```

or install the `xi-succession` entry point:

```sh
pip install -e .
xi-succession --help
```

Tests:

```sh
python -m unittest discover -s tests -v
```

## Workflow

A typical analytic cycle, end to end:

### 1. Orient on the knowledge base

```sh
xi-succession list triggers          # the six scenario classes
xi-succession list drivers           # axes of uncertainty
xi-succession list actors            # who matters, and how
xi-succession list precedents        # what history says
xi-succession show triggers death    # full entry, incl. key questions
```

### 2. Map the uncertainty space (2x2 futures)

Cross any two drivers into a quadrant worksheet:

```sh
xi-succession matrix --x health --y cohesion -o futures.md
```

Each quadrant gets seeded prompts (name the world, which trigger classes it
favors, first observable indicator, who gains/loses). Promote interesting
quadrants into full scenarios.

### 3. Build scenarios

Interactive (guided prompts, including a key assumptions check):

```sh
xi-succession new -f scenarios.json
```

Or non-interactive — print an editable skeleton pre-seeded with that
trigger class's key questions:

```sh
xi-succession new --template managed >> my_scenario.json
```

A fully worked six-scenario example lives at
[`examples/baseline_scenarios.json`](examples/baseline_scenarios.json).

### 4. Check coherence and assumptions

```sh
xi-succession check examples/baseline_scenarios.json
```

Flags: probabilities not summing to 1 on an exhaustive set, missing
`continuity` baseline, material scenarios with nothing to watch, and
**load-bearing assumptions** (low confidence + high impact if wrong). The
shipped example intentionally carries three load-bearing assumptions so you
can see the check fire (exit code 2 means "flags raised", not "broken").

### 5. Score current indicators

What scenario families is the present signal pattern consistent with?

```sh
xi-succession iw --observed absence,censorship_spike,protocol_delegation
xi-succession iw            # interactive checklist walk (TTY)
```

Output ranks trigger classes by summed indicator weight. This is salience —
where to direct collection — not probability.

### 6. Aggregate analyst judgments

Given `{scenario_id: {analyst: probability}}` JSON:

```sh
xi-succession aggregate examples/analyst_estimates.json --method geomean_odds
```

Methods: `mean`, `median`, `geomean_odds` (geometric mean of odds, modestly
extremizing). The combined distribution is renormalized, and large
analyst spreads are surfaced for discussion rather than silently averaged.

### 7. Publish

```sh
xi-succession report examples/baseline_scenarios.json -o report.md
```

Renders the full set: summary table, per-scenario pathways, actors,
watchlists, assumption registers, coherence flags, and a consolidated
indicator watchlist.

## Design notes

- **`continuity` is a first-class scenario.** Over any horizon, "no
  succession" is usually modal; sets that omit it inflate everything else.
  The coherence check enforces this.
- **Indicators carry weights (1-3) and explicit ambiguity notes.** Some
  cut both ways (a party-chairmanship restoration can mean entrenchment
  *or* a kicked-upstairs exit); the notes keep that in front of the analyst.
- **Everything is plain data.** Actors, drivers, indicators, and precedents
  are literal Python structures in `data.py`, meant to be edited as facts
  change. Scenario sets are plain JSON, diffable and reviewable like code.

## Repository layout

```
xi_succession/
  data.py          # reference knowledge base (EDIT ME as facts change)
  models.py        # Scenario / ScenarioSet / Assumption dataclasses
  matrix.py        # 2x2 alternative-futures worksheets
  indicators.py    # indicators & warnings scoring
  probability.py   # coherence checks, multi-analyst aggregation
  report.py        # Markdown report rendering
  cli.py           # command-line interface
examples/
  baseline_scenarios.json   # worked six-scenario example
  analyst_estimates.json    # sample multi-analyst estimates
  baseline_report.md        # rendered report of the example set
tests/             # unittest suite (no dependencies)
```
