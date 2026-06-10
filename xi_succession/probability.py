"""Probability hygiene for scenario sets.

Two jobs:
  1. Coherence checking — does a scenario set's probability assignment make
     sense as a probability distribution over the horizon?
  2. Aggregation — combine multiple analysts' estimates for the same
     scenario set into a consensus distribution.

These are deliberately simple. The point is to force the arithmetic to be
explicit, not to launder judgment through math.
"""

from __future__ import annotations

import math
import statistics

from .models import ScenarioSet

SUM_TOLERANCE = 0.01


def coherence_findings(scenario_set: ScenarioSet) -> list[str]:
    """Return human-readable findings. Empty list means the set is coherent."""
    findings = []
    probs = {s.id: s.probability for s in scenario_set.scenarios}

    missing = [sid for sid, p in probs.items() if p is None]
    if missing:
        findings.append(
            "No probability assigned for: " + ", ".join(sorted(missing))
            + ". Assign one (a rough range midpoint beats a blank)."
        )

    assigned = {sid: p for sid, p in probs.items() if p is not None}
    if assigned and scenario_set.exhaustive and not missing:
        total = sum(assigned.values())
        if abs(total - 1.0) > SUM_TOLERANCE:
            direction = "over" if total > 1.0 else "under"
            findings.append(
                f"Probabilities sum to {total:.3f} ({direction}-allocated) but the "
                "set is marked exhaustive. Either renormalize, adjust judgments, "
                "or add a residual scenario."
            )

    triggers_used = [s.trigger for s in scenario_set.scenarios]
    dupes = sorted({t for t in triggers_used if triggers_used.count(t) > 1})
    if dupes:
        findings.append(
            "Multiple scenarios share trigger class(es): " + ", ".join(dupes)
            + ". Fine if intentional (variants), but verify they are mutually "
            "exclusive as written."
        )

    if scenario_set.exhaustive and "continuity" not in triggers_used:
        findings.append(
            "Set is marked exhaustive but has no 'continuity' (no-succession) "
            "scenario. Over any horizon this is usually the modal outcome; "
            "omitting it inflates everything else."
        )

    for s in scenario_set.scenarios:
        if s.probability is not None and s.probability > 0.10 and not s.indicators:
            findings.append(
                f"Scenario {s.id!r} carries {s.probability:.0%} but lists no "
                "indicators — there is nothing to watch that would update it."
            )

    for s in scenario_set.scenarios:
        for a in s.load_bearing_assumptions:
            findings.append(
                f"Load-bearing assumption in {s.id!r} (low confidence, high "
                f"impact): \"{a.text}\" — consider a variant scenario where "
                "it fails."
            )

    return findings


def normalized(scenario_set: ScenarioSet) -> dict[str, float]:
    """Return probabilities rescaled to sum to 1. Raises if none assigned."""
    assigned = {
        s.id: s.probability
        for s in scenario_set.scenarios
        if s.probability is not None
    }
    if not assigned:
        raise ValueError("no probabilities assigned; nothing to normalize")
    total = sum(assigned.values())
    if total <= 0:
        raise ValueError("assigned probabilities sum to zero")
    return {sid: p / total for sid, p in assigned.items()}


# ---------------------------------------------------------------------------
# Multi-analyst aggregation
# ---------------------------------------------------------------------------

def _geomean_odds(probs: list[float]) -> float:
    """Geometric mean of odds — modestly extremizing, standard in forecasting.

    Probabilities are clamped away from 0 and 1 so a single dogmatic analyst
    cannot zero out the pool.
    """
    eps = 1e-4
    clamped = [min(max(p, eps), 1 - eps) for p in probs]
    log_odds = [math.log(p / (1 - p)) for p in clamped]
    mean_lo = sum(log_odds) / len(log_odds)
    odds = math.exp(mean_lo)
    return odds / (1 + odds)


AGGREGATION_METHODS = {
    "mean": lambda probs: sum(probs) / len(probs),
    "median": statistics.median,
    "geomean_odds": _geomean_odds,
}


def aggregate(estimates: dict[str, dict[str, float]],
              method: str = "mean",
              renormalize: bool = True) -> dict[str, float]:
    """Aggregate analyst estimates.

    estimates: {scenario_id: {analyst_name: probability}}
    Returns {scenario_id: aggregated_probability}.

    With renormalize=True (default) the aggregated values are rescaled to
    sum to 1, since per-scenario aggregation does not preserve coherence.
    """
    if method not in AGGREGATION_METHODS:
        raise ValueError(
            f"unknown method {method!r}; expected one of {sorted(AGGREGATION_METHODS)}"
        )
    fn = AGGREGATION_METHODS[method]

    result = {}
    for scenario_id, by_analyst in estimates.items():
        if not by_analyst:
            raise ValueError(f"no estimates supplied for scenario {scenario_id!r}")
        probs = list(by_analyst.values())
        for p in probs:
            if not 0.0 <= p <= 1.0:
                raise ValueError(
                    f"estimate out of [0,1] for {scenario_id!r}: {p}"
                )
        result[scenario_id] = fn(probs)

    if renormalize:
        total = sum(result.values())
        if total > 0:
            result = {sid: p / total for sid, p in result.items()}
    return result


def disagreement(estimates: dict[str, dict[str, float]]) -> dict[str, float]:
    """Per-scenario spread (max - min) across analysts.

    Big spreads are where the analytically interesting disagreements live;
    surface them for discussion rather than averaging them away silently.
    """
    return {
        sid: (max(by.values()) - min(by.values())) if len(by) > 1 else 0.0
        for sid, by in estimates.items()
    }
