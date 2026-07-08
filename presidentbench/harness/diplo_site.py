"""Bundle Concordat games into site/data/concordat.js for the replay page.

Keeps the full press (that's the show) but truncates per-call chain-of-thought to
keep the payload sane.

Run:  python -m harness.diplo_site
"""
from __future__ import annotations

import glob
import json
import os
import time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "results", "diplomacy")
OUT = os.path.join(HERE, "site", "data", "concordat.json")
COT_CAP = 2400


def build():
    games = []
    for f in sorted(glob.glob(os.path.join(SRC, "concordat__*.json"))):
        g = json.load(open(f))
        for ph in g["phases"]:
            th = ph.get("thinking", {})
            for s, d in th.items():
                for k in list(d):
                    if isinstance(d[k], str) and len(d[k]) > COT_CAP:
                        d[k] = d[k][:COT_CAP] + " …[truncated]"
            ph.pop("inbox", None)   # press log already covers it
        games.append(g)
    payload = {"generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
               "games": games}
    with open(OUT, "w") as fh:
        json.dump(payload, fh)
    with open(os.path.splitext(OUT)[0] + ".js", "w") as fh:
        fh.write("window.PB_CONCORDAT = ")
        json.dump(payload, fh)
        fh.write(";\n")
    print("concordat: %d games -> %s (%.1f KB js)" %
          (len(games), OUT, os.path.getsize(os.path.splitext(OUT)[0] + ".js") / 1024))
    return payload


if __name__ == "__main__":
    build()
