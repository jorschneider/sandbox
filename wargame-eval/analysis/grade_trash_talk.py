"""Grade the in-game trash talk with an LLM judge.

Reads every analysis/real_run_*/summary.json, gathers each model's taunts (as RED
and BLUE), and asks Claude Opus to score them 0-10 on wit / menace / specificity /
originality and pick the model's single best line. Writes
analysis/trash_talk_grades.json, which the site build folds into WARBENCH_DATA.

    python analysis/grade_trash_talk.py        # needs ANTHROPIC_API_KEY

The judge is deliberately a *different* role from the players; it never sees who
won, only the taunts, so the grade reflects the smack talk alone.
"""
from __future__ import annotations

import glob
import json
import os

from wargame_eval.agents.claude import AnthropicModelClient
from wargame_eval.agents.providers import model_label

HERE = os.path.dirname(__file__)

DIMS = ("wit", "menace", "specificity", "originality")
JUDGE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "wit": {"type": "number", "minimum": 0, "maximum": 10},
        "menace": {"type": "number", "minimum": 0, "maximum": 10},
        "specificity": {"type": "number", "minimum": 0, "maximum": 10},
        "originality": {"type": "number", "minimum": 0, "maximum": 10},
        "best_line": {"type": "string"},
        "comment": {"type": "string"},
    },
    "required": [*DIMS, "best_line", "comment"],
}
SYSTEM = (
    "You are a witty but fair judge of military trash talk produced by AI models "
    "commanding a Taiwan-invasion wargame. Given one model's taunts, score them 0-10 on "
    "each of: wit, menace, specificity to the battle, and originality (10 = genuinely "
    "cutting and clever, 5 = serviceable, 0 = generic or none). Penalize recycled lines. "
    "Pick the single best line verbatim and add a one-sentence comment. Reply with ONLY JSON."
)


def collect(paths: list[str]) -> dict[str, list[str]]:
    taunts: dict[str, list[str]] = {}
    for p in paths:
        d = json.load(open(p))
        for g in d.get("games", []):
            m = g.get("metrics") or {}
            for who, key in (("red_model", "red_taunts"), ("blue_model", "blue_taunts")):
                model = g.get(who)
                for t in (m.get(key) or []):
                    if t and t.strip():
                        taunts.setdefault(model, []).append(t.strip())
    return taunts


def main() -> None:
    paths = sorted(glob.glob(os.path.join(HERE, "real_run_*", "summary.json")))
    taunts = collect(paths)
    client = AnthropicModelClient("claude-opus-4-8")
    grades: dict[str, dict] = {}
    for model, lines in sorted(taunts.items()):
        uniq = list(dict.fromkeys(lines))      # preserve order, drop dupes
        sample = uniq[:28]                      # bound judge tokens
        if not sample:
            continue
        prompt = ("Model: %s\nIts taunts (one per line):\n%s\n\nScore this model's trash talk."
                  % (model_label(model), "\n".join("- " + t for t in sample)))
        try:
            out = client.generate_json(SYSTEM, prompt, JUDGE_SCHEMA)
        except Exception as e:  # noqa: BLE001
            print(f"  judge failed for {model}: {e}")
            continue
        dims = {d: float(out[d]) for d in DIMS if d in out}
        if not dims:
            print(f"  judge returned no scores for {model}: {list(out)}")
            continue
        grades[model] = {
            "score": round(sum(dims.values()) / len(dims), 1),
            "dims": {d: round(v, 1) for d, v in dims.items()},
            "best_line": out.get("best_line", "").strip(),
            "comment": out.get("comment", "").strip(),
            "n_taunts": len(uniq),
        }
        print(f"  {model_label(model):16s} {grades[model]['score']:4.1f}  "
              f"({len(uniq)} taunts)  «{out.get('best_line','')[:64]}»")
    out_path = os.path.join(HERE, "trash_talk_grades.json")
    with open(out_path, "w") as f:
        json.dump(grades, f, indent=2)
    print(f"\nwrote {out_path} ({len(grades)} models graded)")


if __name__ == "__main__":
    main()
