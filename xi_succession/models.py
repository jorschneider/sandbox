"""Scenario data model: a serializable structure for one succession scenario
and for a coherent set of them.

A ScenarioSet is meant to be MECE over a fixed horizon: every scenario keyed
to one trigger class, probabilities summing to ~1. The `check` machinery in
probability.py enforces this softly (warnings, not hard errors) because
analysts legitimately work with partial sets mid-process.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict

from . import data

CONFIDENCE_LEVELS = ("low", "medium", "high")
IMPACT_LEVELS = ("low", "medium", "high")


@dataclass
class Assumption:
    """One entry in a key assumptions check.

    A 'load-bearing' assumption (low confidence, high impact-if-wrong) is
    what the check exists to surface.
    """

    text: str
    confidence: str = "medium"        # low | medium | high
    impact_if_wrong: str = "medium"   # low | medium | high

    def __post_init__(self):
        if self.confidence not in CONFIDENCE_LEVELS:
            raise ValueError(
                f"confidence must be one of {CONFIDENCE_LEVELS}, got {self.confidence!r}"
            )
        if self.impact_if_wrong not in IMPACT_LEVELS:
            raise ValueError(
                f"impact_if_wrong must be one of {IMPACT_LEVELS}, got {self.impact_if_wrong!r}"
            )

    @property
    def load_bearing(self) -> bool:
        return self.confidence == "low" and self.impact_if_wrong == "high"


@dataclass
class Scenario:
    """One succession scenario."""

    id: str
    name: str
    trigger: str                      # one of data.TRIGGERS ids
    summary: str
    probability: float | None = None  # P(scenario | horizon), 0..1
    pathway: list[str] = field(default_factory=list)      # ordered narrative steps
    key_actors: list[str] = field(default_factory=list)   # data.ACTORS ids
    indicators: list[str] = field(default_factory=list)   # data.INDICATORS ids
    assumptions: list[Assumption] = field(default_factory=list)
    implications: list[str] = field(default_factory=list)
    analyst_notes: str = ""

    def __post_init__(self):
        data.get("triggers", self.trigger)  # raises KeyError if unknown
        for actor_id in self.key_actors:
            data.get("actors", actor_id)
        for ind_id in self.indicators:
            data.get("indicators", ind_id)
        if self.probability is not None and not 0.0 <= self.probability <= 1.0:
            raise ValueError(f"probability must be in [0, 1], got {self.probability}")
        self.assumptions = [
            a if isinstance(a, Assumption) else Assumption(**a)
            for a in self.assumptions
        ]

    @property
    def load_bearing_assumptions(self) -> list[Assumption]:
        return [a for a in self.assumptions if a.load_bearing]


@dataclass
class ScenarioSet:
    """A titled, horizon-bound collection of scenarios."""

    title: str
    horizon: str                      # e.g. "through end-2030"
    scenarios: list[Scenario] = field(default_factory=list)
    exhaustive: bool = True           # set False for partial working sets
    data_as_of: str = data.DATA_AS_OF

    def __post_init__(self):
        self.scenarios = [
            s if isinstance(s, Scenario) else Scenario(**s) for s in self.scenarios
        ]
        seen = set()
        for s in self.scenarios:
            if s.id in seen:
                raise ValueError(f"duplicate scenario id {s.id!r}")
            seen.add(s.id)

    # -- serialization ------------------------------------------------------

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_dict(cls, payload: dict) -> "ScenarioSet":
        return cls(**payload)

    @classmethod
    def from_json(cls, text: str) -> "ScenarioSet":
        return cls.from_dict(json.loads(text))

    @classmethod
    def load(cls, path: str) -> "ScenarioSet":
        with open(path, encoding="utf-8") as fh:
            return cls.from_json(fh.read())

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(self.to_json() + "\n")
