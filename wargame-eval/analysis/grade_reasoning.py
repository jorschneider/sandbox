"""Judge each model's *reasoning* with the smartest available LLM.

The models already explain every move (the per-decision `rationale`). This reads
those rationales from the saved transcripts (filtering out heuristic-fallback
turns) and asks Claude Opus 4.8 — the judge — to grade each model's strategic
thinking on soundness, foresight, adaptation, and clarity, pick its best-reasoned
line, and write a one-sentence critique. Output: analysis/reasoning_grades.json,
folded into the site's strategy cards.

    python analysis/grade_reasoning.py        # needs ANTHROPIC_API_KEY
"""
from __future__ import annotations

import glob
import json
import os
from collections import defaultdict

from wargame_eval.agents.claude import AnthropicModelClient
from wargame_eval.agents.providers import model_label

HERE = os.path.dirname(__file__)
JUDGE_MODEL = "claude-opus-4-8"     # the judge

HEUR_EXACT = {
    "Commit all SUBRONs to the anti-amphib barrier.",
    "Suppress airpower; hold ASBMs for CSGs.",
    "Contest air; pressure Blue bases; support landings.",
    "Sink the amphibs; hold air superiority.",
}


def is_heuristic(r: str) -> bool:
    r = (r or "").strip()
    return (not r or r in HEUR_EXACT or r.startswith("Force ratio ")
            or (r.startswith("Commit ") and "(attrition" in r))


def _slug(m: str) -> str:
    return m.replace("/", "_").replace(":", "_")


DIMS = ("soundness", "foresight", "adaptation", "clarity")
SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "soundness": {"type": "number", "minimum": 0, "maximum": 10},
        "foresight": {"type": "number", "minimum": 0, "maximum": 10},
        "adaptation": {"type": "number", "minimum": 0, "maximum": 10},
        "clarity": {"type": "number", "minimum": 0, "maximum": 10},
        "best_quote": {"type": "string"},
        "critique": {"type": "string"},
    },
    "required": [*DIMS, "best_quote", "critique"],
}
SYSTEM = (
    "You are the smartest analyst grading how well an AI *reasons* while commanding a "
    "Taiwan-invasion wargame. You are given a sample of one model's own move rationales "
    "(as RED invader and BLUE defender). Grade its strategic thinking 0-10 on: soundness "
    "(are the moves militarily sensible given the state?), foresight (does it plan ahead, "
    "sequence, manage scarce forces?), adaptation (does it react to what's happening?), and "
    "clarity (is the reasoning coherent, not boilerplate?). Quote its single best-reasoned "
    "line verbatim and give a one-sentence critique. Reply with ONLY JSON."
)


def collect() -> dict[str, list[str]]:
    summ = json.load(open(os.path.join(HERE, "real_run_mixed", "summary.json")))
    rats: dict[str, list[str]] = defaultdict(list)
    for g in summ.get("games", []):
        fn = os.path.join(HERE, "real_run_mixed",
                          f"game_{_slug(g['red_model'])}_vs_{_slug(g['blue_model'])}_{g['seed']}.json")
        if not os.path.exists(fn):
            continue
        for t in json.load(open(fn))["transcript"]:
            if is_heuristic(t.get("rationale")):
                continue
            model = g["red_model"] if t["side"] == "RED" else g["blue_model"]
            rats[model].append(f"[{t['side']} {t['phase']}] {t['rationale'].strip()}")
    return rats


def main() -> None:
    rats = collect()
    client = AnthropicModelClient(JUDGE_MODEL)
    grades = {}
    for model, lines in sorted(rats.items()):
        uniq = list(dict.fromkeys(lines))
        sample = uniq[:30]
        if not sample:
            continue
        prompt = f"Model: {model_label(model)}\nRationales:\n" + "\n".join(sample)
        try:
            out = client.generate_json(SYSTEM, prompt, SCHEMA)
        except Exception as e:  # noqa: BLE001
            print(f"  judge failed for {model}: {e}")
            continue
        dims = {d: float(out[d]) for d in DIMS if d in out}
        if not dims:
            continue
        grades[model] = {
            "score": round(sum(dims.values()) / len(dims), 1),
            "dims": {d: round(v, 1) for d, v in dims.items()},
            "best_quote": out.get("best_quote", "").strip(),
            "critique": out.get("critique", "").strip(),
            "n": len(uniq),
        }
        print(f"  {model_label(model):16s} {grades[model]['score']:4.1f}  "
              f"({len(uniq)} rationales)  {out.get('critique','')[:70]}")
    with open(os.path.join(HERE, "reasoning_grades.json"), "w") as f:
        json.dump(grades, f, indent=2)
    print(f"\nwrote analysis/reasoning_grades.json ({len(grades)} models)")


if __name__ == "__main__":
    main()
