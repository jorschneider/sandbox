"""Indicators & warnings scoring.

Given the set of indicators an analyst currently assesses as OBSERVED, rank
the scenario trigger classes by the summed weight of indicators pointing at
them. This is a salience heuristic, not a probability model: it tells you
which scenario families the current signal pattern is consistent with, so
you know where to look harder.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import data


@dataclass
class TriggerScore:
    trigger_id: str
    score: int
    max_score: int
    matched: list[str] = field(default_factory=list)  # indicator ids

    @property
    def fraction(self) -> float:
        return self.score / self.max_score if self.max_score else 0.0


def max_scores() -> dict[str, int]:
    """Maximum achievable weight per trigger if every indicator fired."""
    totals = {t["id"]: 0 for t in data.TRIGGERS}
    for ind in data.INDICATORS:
        for trig in ind["signals"]:
            totals[trig] += ind["weight"]
    return totals


def score(observed: list[str]) -> list[TriggerScore]:
    """Score trigger classes against observed indicator ids.

    Returns TriggerScores sorted by raw score descending (ties broken by
    fraction of that trigger's max, then id for determinism). Unknown
    indicator ids raise KeyError.
    """
    for ind_id in observed:
        data.get("indicators", ind_id)

    observed_set = set(observed)
    maxima = max_scores()
    results = {
        t["id"]: TriggerScore(trigger_id=t["id"], score=0,
                              max_score=maxima[t["id"]])
        for t in data.TRIGGERS
    }
    for ind in data.INDICATORS:
        if ind["id"] in observed_set:
            for trig in ind["signals"]:
                results[trig].score += ind["weight"]
                results[trig].matched.append(ind["id"])

    return sorted(
        results.values(),
        key=lambda r: (-r.score, -r.fraction, r.trigger_id),
    )


def watchlist_for(scenario_indicator_ids: list[str]) -> list[dict]:
    """Expand a scenario's indicator id list into full entries, strongest first."""
    entries = [data.get("indicators", i) for i in scenario_indicator_ids]
    return sorted(entries, key=lambda e: (-e["weight"], e["id"]))
