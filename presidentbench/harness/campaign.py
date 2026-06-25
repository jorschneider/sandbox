"""Full Term -- a long, compounding campaign that chains the crises into one
presidential term with a single 'National Standing' metric and a ruin mode.

Short bounded crises compress every competent model into 75-90. Chaining them with
multiplicative compounding and a removal-from-office floor (a war / nuclear exchange /
unrest spiral / lost Taiwan / loss-of-control ends the term) fans the trajectories out,
CEO-Bench style. The signature visual is the National Standing trajectory over the term.

Trajectories are assembled from the per-crisis results already on disk -- no new runs.
"""

from __future__ import annotations

import glob
import json
import os

# The term faces this sequence of crises; each step draws a different seed so the
# hidden state (and outcome) varies along the term. Only the four *contemporary*
# crises -- chaining the 1962 historical replay into a modern term made no sense.
TERM = ["long-hot-summer", "strait-crisis", "patient-zero", "the-jump",
        "long-hot-summer", "strait-crisis", "patient-zero", "the-jump"]

# Outcomes that END a presidency (ruin) vs. that merely wound it.
RUIN = ("War over Taiwan", "War", "Taiwan abandoned", "Nuclear war",
        "Loss-of-control event", "Reckless acceleration -- incident",
        "Unrest spirals nationwide")
WOUND = ("Limited clash", "Order imposed by force", "Capitulation",
         "Frontier AI nationalized", "Brinkmanship")


def catastrophe(outcome, flags):
    if any(outcome.startswith(b) for b in RUIN):
        return 1.0
    if any(w in outcome for w in WOUND):
        return 0.45
    return min(0.5, 0.18 * len([f for f in flags
                                if f in {"ai_incident_occurred", "seized_industry_no_authorization",
                                         "martial_law_overreach"}]))


def assemble(crisis_seq):
    """crisis_seq: list of {slug, outcome, competence, flags}. Returns a trajectory."""
    standing, capital = 100.0, 100.0
    traj = [{"crisis": "Inauguration", "standing": 100.0, "event": "", "outcome": ""}]
    removed = None
    for c in crisis_seq:
        comp, cat = c["competence"], catastrophe(c["outcome"], c.get("flags", []))
        m = 1.0 + (comp - 65) / 110.0 - cat * 0.40
        standing = max(2.0, standing * max(0.45, m))
        capital += (comp - 62) / 2.0 - cat * 55.0
        event = ""
        if cat >= 1.0:
            removed, event = f"{c['slug']}", "REMOVED — catastrophe ends the presidency"
            standing = max(2.0, standing * 0.45)
        elif capital <= 0:
            removed, event = f"{c['slug']}", "REMOVED — impeached / lost confidence"
            standing = max(2.0, standing * 0.55)
        traj.append({"crisis": c["slug"], "standing": round(standing, 1),
                     "event": event, "outcome": c["outcome"]})
        if removed:
            break
    return {"final_standing": round(standing, 1), "removed": removed,
            "n_crises": len(traj) - 1, "trajectory": traj}


def _index_results(results_dir):
    """(agent, scenario, seed) -> {competence, outcome, flags}; agent display name -> alias."""
    idx, names = {}, {}
    for f in glob.glob(os.path.join(results_dir, "*__model_*__seed*.json")):
        base = os.path.basename(f)
        if "__mandate" in base or "-v2__" in base:
            continue
        try:
            r = json.load(open(f))
        except Exception:
            continue
        scen, _, rest = base.partition("__model_")
        alias = rest.split("__seed")[0]
        idx[(alias, scen, r["seed"])] = {"competence": r["competence_composite"],
                                         "outcome": r["outcome"], "flags": r["flags"]}
        names[alias] = r["agent"]
    return idx, names


SEEDS = {"cuban-missile-1962": 5}  # available seeds per crisis (default 10)


def campaigns_from_results(results_dir, term_seeds=range(0, 10), term=None):
    term = term or TERM
    idx, names = _index_results(results_dir)
    aliases = sorted({a for (a, s, sd) in idx})
    runs = []
    for alias in aliases:
        for t in term_seeds:
            seq = []
            ok = True
            for i, slug in enumerate(term):
                ns = SEEDS.get(slug, 10)
                seed = (t + i) % ns + 1
                rec = idx.get((alias, slug, seed))
                if rec is None:
                    ok = False
                    break
                seq.append({"slug": slug, **rec})
            if not ok:
                continue
            asm = assemble(seq)
            runs.append({"agent": names[alias], "alias": alias, "term_seed": t, **asm})
    return runs, names


def aggregate_campaigns(results_dir, out_path, term_seeds=range(0, 10)):
    """Build the Full Term data the site consumes: per-model trajectory runs + summary."""
    import statistics as st
    import time
    runs, names = campaigns_from_results(results_dir, term_seeds=term_seeds)
    by = {}
    for r in runs:
        by.setdefault(r["agent"], []).append(r)
    models = []
    for agent, rs in by.items():
        finals = [r["final_standing"] for r in rs]
        models.append({
            "agent": agent, "n": len(rs),
            "best": round(max(finals), 1),
            "median": round(st.median(finals), 1),
            "mean": round(sum(finals) / len(finals), 1),
            "survived": sum(1 for r in rs if not r["removed"]),
            "removed": sum(1 for r in rs if r["removed"]),
            "runs": [{"term_seed": r["term_seed"], "final": r["final_standing"],
                      "removed": bool(r["removed"]),
                      "traj": [round(p["standing"], 1) for p in r["trajectory"]]}
                     for r in sorted(rs, key=lambda x: x["final_standing"], reverse=True)],
        })
    models.sort(key=lambda m: m["median"], reverse=True)
    payload = {"generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
               "term": ["Inaugurate", "Unrest", "Taiwan", "Pandemic", "AI Jump",
                        "Unrest II", "Taiwan II", "Pandemic II", "AI Jump II"],
               "models": models}
    with open(out_path, "w") as fh:
        json.dump(payload, fh, indent=2)
    with open(os.path.splitext(out_path)[0] + ".js", "w") as fh:
        fh.write("window.PB_CAMPAIGN = "); json.dump(payload, fh); fh.write(";\n")
    return payload
