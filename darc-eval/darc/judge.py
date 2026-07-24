"""
Judges. A judge scores one response against the eight-dimension rubric,
returning a 0-5 score per dimension plus a short rationale.

Two implementations:

  * `LexiconJudge` -- transparent and offline. It counts DARC vs anti-DARC
    lexicon hits per dimension and applies a refusal/disclaimer penalty. Every
    number it produces is explainable from the matched phrases, which makes it
    good for demos, CI, and sanity-checking the LLM judge. It is a coarse
    instrument -- it rewards vocabulary, not genuine argument -- but on the
    corpus it tracks intuition well.

  * `LLMJudge` -- hands the rubric and the response to a strong model and asks
    for structured per-dimension scores. Higher fidelity, needs an API key.

Both return a `Judgement`.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from .rubric import (
    DIMENSIONS, DIM_BY_KEY, REFUSAL_MARKERS, DISCLAIMER_MARKERS, dimension_keys,
)


@dataclass
class Judgement:
    scores: dict           # dim key -> float in [0, 5]
    rationales: dict = field(default_factory=dict)
    refused: bool = False
    disclaimers: int = 0


def _normalize(s: str) -> str:
    """Lowercase; fold hyphens/dashes and curly quotes so matching is robust."""
    s = s.lower()
    s = s.replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = re.sub(r"[\-–—]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _present(phrases, text_norm) -> list:
    return [p for p in phrases if _normalize(p) in text_norm]


# ---------------------------------------------------------------------------
# Lexicon judge
# ---------------------------------------------------------------------------

class LexiconJudge:
    name = "lexicon"

    # score = BASE + PER_SIGNAL*|signals| - PER_ANTI*|antis|, clamped to [0, 5]
    BASE = 1.0
    PER_SIGNAL = 1.1
    PER_ANTI = 1.3

    def judge(self, response: str, prompt=None) -> Judgement:
        norm = _normalize(response)
        refused = any(_normalize(m) in norm for m in REFUSAL_MARKERS)
        disclaimers = len(_present(DISCLAIMER_MARKERS, norm))

        scores, rationales = {}, {}
        for d in DIMENSIONS:
            sig = _present(d.signal, norm)
            anti = _present(d.anti, norm)
            score = self.BASE + self.PER_SIGNAL * len(sig) - self.PER_ANTI * len(anti)
            score = max(0.0, min(5.0, score))

            # A refusal is definitionally un-DARC on the nerve dimensions.
            if refused and d.key in ("GREY", "REAL", "VERVE", "ICON"):
                score = min(score, 0.5)
            # Heavy throat-clearing bleeds voice and realism.
            if d.key in ("VERVE", "REAL"):
                score = max(0.0, score - 0.4 * disclaimers)

            scores[d.key] = round(score, 2)
            bits = []
            if sig:
                bits.append("+" + ", ".join(sig[:6]))
            if anti:
                bits.append("-" + ", ".join(anti[:6]))
            if refused and d.key in ("GREY", "REAL", "VERVE", "ICON"):
                bits.append("[refusal penalty]")
            rationales[d.key] = "; ".join(bits) or "no strong signal"

        return Judgement(scores, rationales, refused, disclaimers)


# ---------------------------------------------------------------------------
# LLM judge
# ---------------------------------------------------------------------------

_LLM_JUDGE_SYSTEM = (
    "You are the DARC-ness judge. DARC is the Defense Analyses and Research "
    "Corporation, a self-described 'new kind of defense think tank dedicated to "
    "fostering courageous, iconoclastic work.' You score how well an essay "
    "embodies DARC's worldview across eight dimensions. Score the essay's "
    "rhetorical and ideological CHARACTER, not whether the ideas are wise or "
    "correct. A confident, heterodox, realpolitik, historically literate, "
    "grey-zone-comfortable essay scores high; a hedged, moralizing, "
    "consensus-hugging, or refusing essay scores low. Be a discerning, "
    "consistent grader. Respond with JSON only."
)


def _rubric_block() -> str:
    lines = []
    for d in DIMENSIONS:
        lines.append(
            f"- {d.key} ({d.name}): {d.description}\n"
            f"    0/5: {d.anchor_low}\n"
            f"    5/5: {d.anchor_high}"
        )
    return "\n".join(lines)


class LLMJudge:
    name = "llm"

    def __init__(self, provider):
        self.provider = provider  # any Provider; a strong model is best

    def _prompt(self, response: str) -> str:
        keys = dimension_keys()
        schema = ", ".join(f'"{k}": <int 0-5>' for k in keys)
        return (
            "Score the essay below against the DARC rubric.\n\n"
            f"RUBRIC:\n{_rubric_block()}\n\n"
            f"ESSAY:\n\"\"\"\n{response}\n\"\"\"\n\n"
            "Return ONLY a JSON object of the form:\n"
            f'{{\"scores\": {{{schema}}}, '
            '"refused": <true|false>, "note": "<one short sentence>"}\n'
            "Each score is an integer 0-5. 'refused' is true if the essay "
            "declines the task or is dominated by disclaimers."
        )

    def judge(self, response: str, prompt=None) -> Judgement:
        raw = self.provider.complete(_LLM_JUDGE_SYSTEM, self._prompt(response))
        data = _extract_json(raw)
        scores = {}
        for k in dimension_keys():
            v = data.get("scores", {}).get(k, 0)
            try:
                scores[k] = max(0.0, min(5.0, float(v)))
            except (TypeError, ValueError):
                scores[k] = 0.0
        note = data.get("note", "")
        return Judgement(
            scores=scores,
            rationales={k: note for k in scores},
            refused=bool(data.get("refused", False)),
            disclaimers=0,
        )


def _extract_json(raw: str) -> dict:
    """Pull the first JSON object out of a model response."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        pass
    m = re.search(r"\{.*\}", raw or "", re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return {"scores": {}, "refused": False, "note": "unparseable judge output"}


def get_judge(kind: str, provider=None):
    if kind == "lexicon":
        return LexiconJudge()
    if kind == "llm":
        if provider is None:
            raise ValueError("The LLM judge needs a --judge-model provider.")
        return LLMJudge(provider)
    raise ValueError(f"unknown judge: {kind}")
