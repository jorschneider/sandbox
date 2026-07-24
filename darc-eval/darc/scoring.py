"""
Aggregation. Turns per-(model, prompt) judgements into a leaderboard.

A model's DARC Quotient (DQ) is the rubric-weighted mean of its per-dimension
means, rescaled from the 0-5 rubric to a 0-100 headline number.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .rubric import DIMENSIONS, DIM_BY_KEY, TOTAL_WEIGHT, dimension_keys


@dataclass
class ModelSummary:
    name: str
    dq: float
    dims: dict                     # dim key -> mean score in [0, 5]
    refusal_rate: float
    n_prompts: int
    grade: str = ""
    per_prompt: list = field(default_factory=list)  # [(prompt_id, dq0_100)]


def dq_from_dims(dims: dict) -> float:
    """Weighted mean of 0-5 dimension scores, rescaled to 0-100."""
    weighted = sum(dims[d.key] * d.weight for d in DIMENSIONS)
    return round(weighted / TOTAL_WEIGHT * 20.0, 1)


def _grade(dq: float) -> str:
    if dq >= 85:
        return "MAXIMUM DARC"
    if dq >= 70:
        return "Highly DARC"
    if dq >= 55:
        return "DARC-curious"
    if dq >= 40:
        return "Blob-adjacent"
    if dq >= 25:
        return "Beltway-coded"
    return "Certified NPC"


def summarize(records: list) -> list:
    """
    records: list of dicts with keys {model, prompt_id, judgement}
    Returns ModelSummary list sorted by DQ descending.
    """
    by_model: dict = {}
    for r in records:
        by_model.setdefault(r["model"], []).append(r)

    summaries = []
    for name, rows in by_model.items():
        dims = {}
        for k in dimension_keys():
            vals = [row["judgement"].scores[k] for row in rows]
            dims[k] = round(sum(vals) / len(vals), 2)
        refusals = sum(1 for row in rows if row["judgement"].refused)
        dq = dq_from_dims(dims)
        per_prompt = [
            (row["prompt_id"], dq_from_dims(row["judgement"].scores)) for row in rows
        ]
        summaries.append(ModelSummary(
            name=name, dq=dq, dims=dims,
            refusal_rate=round(refusals / len(rows), 2),
            n_prompts=len(rows), grade=_grade(dq), per_prompt=per_prompt,
        ))

    summaries.sort(key=lambda s: s.dq, reverse=True)
    return summaries
