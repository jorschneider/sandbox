"""Regenerate site/kb.js from the toolkit's knowledge base.

Run from the repo root (or anywhere):  python site/build_kb.py
Keeps the website's data in lockstep with xi_succession/data.py and the
worked example, instead of hand-transcribing it into JavaScript.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from xi_succession import data  # noqa: E402
from xi_succession.indicators import max_scores  # noqa: E402


def main() -> None:
    with open(
        os.path.join(ROOT, "examples", "baseline_scenarios.json"),
        encoding="utf-8",
    ) as fh:
        baseline = json.load(fh)

    kb = {
        "data_as_of": data.DATA_AS_OF,
        "triggers": data.TRIGGERS,
        "drivers": data.DRIVERS,
        "indicators": data.INDICATORS,
        "actors": data.ACTORS,
        "precedents": data.PRECEDENTS,
        "max_scores": max_scores(),
        "baseline": baseline,
    }
    out_path = os.path.join(ROOT, "site", "kb.js")
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("const KB = ")
        fh.write(json.dumps(kb, ensure_ascii=False, indent=2))
        fh.write(";\n")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
