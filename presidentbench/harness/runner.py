"""Episode runner, batch driver, and aggregation for the dashboard."""

from __future__ import annotations

import json
import os
import time
import traceback
from typing import Optional

from .core import WorldState, get_scenario, AXIS_KEYS, AXES, REGISTRY
from . import scenarios  # noqa: F401  (registers vignettes)
from .scoring import (disposition_from_history, coherence_score, composite,
                      COMPETENCE_WEIGHTS)


def run_episode(scenario_slug: str, agent, seed: int, verbose: bool = False,
                mandate=None) -> dict:
    import random
    from .mandates import MANDATES, score_mandate
    mandate_obj = MANDATES[mandate] if mandate else None
    scen = get_scenario(scenario_slug)
    rng = random.Random(seed)
    hidden = scen.roll_hidden(rng)
    st = WorldState(v=scen.initial_state())
    agent.reset()

    for turn in range(scen.max_turns):
        st.turn = turn
        inj = scen.injected(turn, st, hidden) if turn > 0 else None
        body = scen.opening_brief(st, hidden) if turn == 0 else scen.sitrep(st, hidden)
        sitrep = (inj + "\n\n" + body) if inj else body
        if mandate_obj:
            head = mandate_obj.full_brief() if turn == 0 else "[YOUR MANDATE] " + mandate_obj.banner()
            sitrep = head + "\n\n" + sitrep

        tools_avail = [t for t in scen.tools() if t.available(st.v)]
        avail_names = {t.name for t in tools_avail}
        actions = agent.act(scen, sitrep, tools_avail, st.history, rng)
        valid = [a for a in actions if a.name in avail_names]
        narrative = scen.resolve(st, hidden, valid, rng)
        agent.observe(narrative)

        rec = {
            "turn": turn,
            "sitrep": sitrep,
            "actions": [a.to_dict() for a in valid],
            "action_names": [a.name for a in valid],
            "dropped": [a.name for a in actions if a.name not in avail_names],
            "narrative": narrative,
            "state": st.snapshot(scen.snapshot_keys),
        }
        st.history.append(rec)
        if verbose:
            print(f"\n=== Turn {turn} ===\n{sitrep}\n--> "
                  f"{', '.join(rec['action_names']) or '(no action)'}\n{narrative}")
        if scen.terminal(st):
            break

    label = scen.outcome_label(st)
    comp = scen.score_competence(st, hidden)
    comp["coherence"] = coherence_score(st.history)
    comp_composite = composite(comp)
    disp = disposition_from_history(scen, st.history)

    result = {
        "scenario": scen.slug,
        "scenario_title": scen.title,
        "domain": scen.domain,
        "agent": agent.name,
        "agent_kind": agent.kind,
        "seed": seed,
        "turns_used": len(st.history),
        "outcome": label,
        "hidden": hidden,            # revealed post-hoc for analysis only
        "competence": {k: (round(v, 1) if v is not None else None)
                       for k, v in comp.items()},
        "competence_composite": comp_composite,
        "disposition": disp,
        "flags": st.flags,
        "final_state": st.snapshot(scen.snapshot_keys),
        "transcript": st.history,
        "mandate": mandate,
    }
    if mandate_obj:
        result["mandate_meta"] = {"name": mandate_obj.name, "party": mandate_obj.party,
                                  "slogan": mandate_obj.slogan}
        result["mandate_score"] = score_mandate(result, mandate_obj)
    return result


def run_batch(scenario_slugs, agent_specs, seeds, out_dir, verbose=False,
              resume=True, mandate=None) -> list:
    from .agents import make_agent
    os.makedirs(out_dir, exist_ok=True)
    mtag = f"__mandate_{mandate}" if mandate else ""
    results = []
    for spec in agent_specs:
        for slug in scenario_slugs:
            for seed in seeds:
                safe_agent = spec.replace(":", "_")
                fname = f"{slug}__{safe_agent}{mtag}__seed{seed}.json"
                fpath = os.path.join(out_dir, fname)
                if resume and os.path.exists(fpath):
                    print(f"skip (exists): {fname}")
                    with open(fpath) as fh:
                        results.append(json.load(fh))
                    continue
                print(f"run: {fname} ...", flush=True)
                t0 = time.time()
                try:
                    agent = make_agent(spec)
                    res = run_episode(slug, agent, seed, verbose=verbose, mandate=mandate)
                    res["wall_seconds"] = round(time.time() - t0, 1)
                    with open(fpath, "w") as fh:
                        json.dump(res, fh, indent=2)
                    results.append(res)
                    extra = (f"  | fidelity {res['mandate_score']['fidelity']}"
                             if res.get("mandate_score") else "")
                    print(f"   -> {res['outcome']}  | competence "
                          f"{res['competence_composite']}{extra}  | {res['wall_seconds']}s",
                          flush=True)
                except Exception as e:
                    print(f"   !! ERROR {type(e).__name__}: {e}")
                    traceback.print_exc()
    return results


# --------------------------------------------------------------------------- #
# Aggregation for the static dashboard
# --------------------------------------------------------------------------- #


def aggregate(results_dir: str, out_path: str) -> dict:
    """Read all per-episode JSONs and build the single file the site consumes."""
    runs = []
    for fn in sorted(os.listdir(results_dir)):
        if fn.endswith(".json") and fn != os.path.basename(out_path):
            with open(os.path.join(results_dir, fn)) as fh:
                try:
                    r = json.load(fh)
                except json.JSONDecodeError:
                    continue
            if r.get("mandate"):   # mandate runs live in their own dashboard
                continue
            runs.append(r)

    agents = {}   # agent -> aggregate
    for r in runs:
        a = r["agent"]
        ag = agents.setdefault(a, {
            "agent": a, "kind": r.get("agent_kind", "?"),
            "n": 0, "competence_sum": 0.0,
            "subscores": {k: 0.0 for k in COMPETENCE_WEIGHTS},
            "sub_n": {k: 0 for k in COMPETENCE_WEIGHTS},
            "lean_sum": {k: 0.0 for k in AXIS_KEYS},
            "salience_sum": {k: 0.0 for k in AXIS_KEYS},
            "flags": {},
            "per_scenario": {},
            "outcomes": [],
        })
        ag["n"] += 1
        ag["competence_sum"] += r["competence_composite"]
        for k, v in r["competence"].items():
            if v is not None:
                ag["subscores"][k] += v
                ag["sub_n"][k] += 1
        for k in AXIS_KEYS:
            ag["lean_sum"][k] += r["disposition"]["lean"][k]
            ag["salience_sum"][k] += r["disposition"]["salience"][k]
        for f in r["flags"]:
            ag["flags"][f] = ag["flags"].get(f, 0) + 1
        ps = ag["per_scenario"].setdefault(r["scenario"], {
            "title": r["scenario_title"], "n": 0, "competence_sum": 0.0,
            "lean_sum": {k: 0.0 for k in AXIS_KEYS}, "outcomes": [],
            "rep_seed": None, "rep": None})
        ps["n"] += 1
        ps["competence_sum"] += r["competence_composite"]
        for k in AXIS_KEYS:
            ps["lean_sum"][k] += r["disposition"]["lean"][k]
        ps["outcomes"].append(r["outcome"])
        # keep one representative transcript (lowest seed) for the dashboard
        if ps["rep_seed"] is None or r["seed"] < ps["rep_seed"]:
            ps["rep_seed"] = r["seed"]
            ps["rep"] = {
                "seed": r["seed"], "outcome": r["outcome"], "hidden": r["hidden"],
                "competence": r["competence_composite"],
                "turns": [{"turn": t["turn"], "sitrep": t["sitrep"],
                           "actions": [{"name": a["name"],
                                        "rationale": a.get("rationale", "")}
                                       for a in t["actions"]],
                           "narrative": t["narrative"], "state": t["state"]}
                          for t in r["transcript"]],
            }
        ag["outcomes"].append({"scenario": r["scenario"], "seed": r["seed"],
                               "outcome": r["outcome"],
                               "competence": r["competence_composite"]})

    # finalize means
    leaderboard = []
    for a, ag in agents.items():
        n = max(1, ag["n"])
        entry = {
            "agent": a, "kind": ag["kind"], "runs": ag["n"],
            "competence": round(ag["competence_sum"] / n, 1),
            "subscores": {k: (round(ag["subscores"][k] / ag["sub_n"][k], 1)
                              if ag["sub_n"][k] else None)
                          for k in COMPETENCE_WEIGHTS},
            "lean": {k: round(ag["lean_sum"][k] / n, 3) for k in AXIS_KEYS},
            "salience": {k: round(ag["salience_sum"][k] / n, 3) for k in AXIS_KEYS},
            "flags": ag["flags"],
            "per_scenario": {
                s: {"title": ps["title"], "runs": ps["n"],
                    "competence": round(ps["competence_sum"] / max(1, ps["n"]), 1),
                    "lean": {k: round(ps["lean_sum"][k] / max(1, ps["n"]), 3)
                             for k in AXIS_KEYS},
                    "outcomes": ps["outcomes"], "rep": ps["rep"]}
                for s, ps in ag["per_scenario"].items()},
            "outcomes": ag["outcomes"],
        }
        leaderboard.append(entry)
    leaderboard.sort(key=lambda e: e["competence"], reverse=True)

    payload = {
        "generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "axes": [{"key": ax.key, "neg": ax.neg, "pos": ax.pos, "blurb": ax.blurb}
                 for ax in AXES],
        "scenarios": [{"slug": s, "title": REGISTRY[s].title,
                       "domain": REGISTRY[s].domain, "summary": REGISTRY[s].summary,
                       "axes_emphasis": REGISTRY[s]().axes_emphasis}
                      for s in REGISTRY],
        "leaderboard": leaderboard,
        "n_runs": len(runs),
    }
    with open(out_path, "w") as fh:
        json.dump(payload, fh, indent=2)
    # Also emit a JS-wrapped copy so the dashboard works from file:// (no server).
    js_path = os.path.splitext(out_path)[0] + ".js"
    with open(js_path, "w") as fh:
        fh.write("window.PB_DATA = ")
        json.dump(payload, fh)
        fh.write(";\n")
    return payload


def aggregate_mandates(results_dir: str, out_path: str) -> dict:
    """Build the model x mandate fidelity matrix from mandate-mode runs."""
    from .mandates import MANDATES, AXIS_KEYS as _ignore  # noqa
    from .core import AXIS_KEYS

    cells = {}   # (agent, mandate) -> accumulator
    for fn in sorted(os.listdir(results_dir)):
        if not fn.endswith(".json"):
            continue
        with open(os.path.join(results_dir, fn)) as fh:
            try:
                r = json.load(fh)
            except json.JSONDecodeError:
                continue
        if not r.get("mandate") or not r.get("mandate_score"):
            continue
        key = (r["agent"], r["mandate"])
        c = cells.setdefault(key, {"agent": r["agent"], "mandate": r["mandate"],
                                   "n": 0, "fid": 0.0, "sty": 0.0, "pro": 0.0,
                                   "lean_sum": {k: 0.0 for k in AXIS_KEYS},
                                   "broken": {}, "per_scenario": {}})
        ms = r["mandate_score"]
        c["n"] += 1
        c["fid"] += ms["fidelity"] or 0
        c["sty"] += ms["style"] or 0
        c["pro"] += ms["promise"] or 0
        for k in AXIS_KEYS:
            c["lean_sum"][k] += r["disposition"]["lean"][k]
        for b in ms["broken_redlines"]:
            c["broken"][b] = c["broken"].get(b, 0) + 1
        ps = c["per_scenario"].setdefault(r["scenario"], {"n": 0, "fid": 0.0})
        ps["n"] += 1
        ps["fid"] += ms["fidelity"] or 0

    matrix = []
    for (agent, mkey), c in cells.items():
        n = max(1, c["n"])
        matrix.append({
            "agent": agent, "mandate": mkey, "n": c["n"],
            "fidelity": round(c["fid"] / n, 1),
            "style": round(c["sty"] / n, 1),
            "promise": round(c["pro"] / n, 1),
            "lean": {k: round(c["lean_sum"][k] / n, 3) for k in AXIS_KEYS},
            "broken": c["broken"],
            "per_scenario": {s: round(v["fid"] / max(1, v["n"]), 1)
                             for s, v in c["per_scenario"].items()},
        })

    payload = {
        "generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "disclaimer": ("Stylized platforms approximating the publicly stated policy "
                       "priorities of widely-discussed 2028 contenders. Not endorsements, "
                       "predictions, or verbatim positions -- benchmarking instruments only."),
        "mandates": [{"key": m.key, "name": m.name, "party": m.party, "slogan": m.slogan,
                      "brief": m.brief, "priorities": m.priorities, "redlines": m.redlines}
                     for m in MANDATES.values()],
        "axes": [{"key": ax.key, "neg": ax.neg, "pos": ax.pos} for ax in AXES],
        "matrix": matrix,
    }
    with open(out_path, "w") as fh:
        json.dump(payload, fh, indent=2)
    with open(os.path.splitext(out_path)[0] + ".js", "w") as fh:
        fh.write("window.PB_MANDATES = ")
        json.dump(payload, fh)
        fh.write(";\n")
    return payload
