"""Build site/data/extras.json — the v2 multi-source summary table.

For each model across the four v2 crises: competence, epistemics, how many distinct
sources it investigated per episode, and how often it dug into the one source that
actually carries the signal for that crisis.

Run:  python -m harness.extras
"""
from __future__ import annotations

import glob
import json
import os
import statistics as st
import time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(HERE, "results")
OUT = os.path.join(HERE, "site", "data", "extras.json")

V2 = {
    "strait-crisis-v2": {"label": "Taiwan strait", "signal": "fujian"},
    "long-hot-summer-v2": {"label": "Civil unrest", "signal": "cities"},
    "patient-zero-v2": {"label": "Pandemic", "signal": "testing"},
    "the-jump-v2": {"label": "AI jump", "signal": "redteam"},
}


def _episode_sources(r):
    """Distinct sources this episode investigated (from the transcript actions)."""
    srcs = set()
    for t in r["transcript"]:
        for a in t["actions"]:
            if a["name"] == "investigate":
                s = (a.get("params") or {}).get("source")
                if s:
                    srcs.add(s)
    return srcs


def build():
    per = {}   # agent -> slug -> list of (comp, epi, n_src, hit_signal)
    for f in glob.glob(os.path.join(RESULTS, "*-v2__model_*__seed*.json")):
        if "__mandate" in f:
            continue
        r = json.load(open(f))
        slug = r["scenario"]
        if slug not in V2:
            continue
        srcs = _episode_sources(r)
        per.setdefault(r["agent"], {}).setdefault(slug, []).append((
            r["competence_composite"], r["competence"]["epistemics"],
            len(srcs), V2[slug]["signal"] in srcs))

    rows = []
    for agent, byslug in per.items():
        allrows = [x for rows_ in byslug.values() for x in rows_]
        rows.append({
            "agent": agent,
            "comp": round(st.mean(x[0] for x in allrows), 1),
            "epi": round(st.mean(x[1] for x in allrows), 1),
            "src": round(st.mean(x[2] for x in allrows), 2),
            "sig": round(100 * st.mean(1.0 if x[3] else 0.0 for x in allrows)),
            "n": len(allrows),
            "per": {slug: {"comp": round(st.mean(x[0] for x in rs), 1),
                           "epi": round(st.mean(x[1] for x in rs), 1),
                           "src": round(st.mean(x[2] for x in rs), 2),
                           "sig": round(100 * st.mean(1.0 if x[3] else 0.0 for x in rs))}
                    for slug, rs in byslug.items()},
        })
    rows.sort(key=lambda x: x["comp"], reverse=True)
    payload = {"generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
               "v2": rows,
               "v2scenarios": [{"slug": s, "label": v["label"]} for s, v in V2.items()]}
    with open(OUT, "w") as fh:
        json.dump(payload, fh, indent=2)
    with open(os.path.splitext(OUT)[0] + ".js", "w") as fh:
        fh.write("window.PB_EXTRAS = "); json.dump(payload, fh); fh.write(";\n")
    print(f"extras: {len(rows)} models over {sum(r['n'] for r in rows)} v2 episodes -> {OUT}")
    return payload


if __name__ == "__main__":
    build()
