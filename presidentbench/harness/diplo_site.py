"""Bundle Concordat games for the replay page.

Per-game JSON files (FULL chain-of-thought, no truncation) loaded on demand,
plus a small index (concordat.js) for the game picker.

Run:  python -m harness.diplo_site
"""
from __future__ import annotations

import glob
import json
import os
import time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "results", "diplomacy")
OUTDIR = os.path.join(HERE, "site", "data", "concordat")
IDX = os.path.join(HERE, "site", "data", "concordat.js")


def build():
    os.makedirs(OUTDIR, exist_ok=True)
    index = []
    for f in sorted(glob.glob(os.path.join(SRC, "concordat__*.json"))):
        g = json.load(open(f))
        for ph in g["phases"]:
            ph.pop("inbox", None)      # press log already covers it
        base = os.path.basename(f)
        with open(os.path.join(OUTDIR, base), "w") as fh:
            json.dump(g, fh)
        index.append({"file": base, "model": g["model"], "alias": g.get("model_alias"),
                      "game_seed": g.get("game_seed"),
                      "prompt_version": g.get("prompt_version", 1),
                      "winner_leader": g.get("winner_leader"),
                      "winner_centers": g["final_centers"].get(g["winner"], 0)})
    payload = {"generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
               "games": index}
    with open(IDX, "w") as fh:
        fh.write("window.PB_CONCORDAT_INDEX = ")
        json.dump(payload, fh)
        fh.write(";\n")
    total = sum(os.path.getsize(os.path.join(OUTDIR, i["file"])) for i in index)
    print("concordat: %d games (full CoT, %.1f MB across per-game files) -> %s" %
          (len(index), total / 1e6, OUTDIR))
    return payload


if __name__ == "__main__":
    build()
