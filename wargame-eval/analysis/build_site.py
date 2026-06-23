"""Generate the WarBench site's data file from saved tournament summaries.

Reads every analysis/real_run*/summary.json, computes per-run Elo / win rates /
offense-defense skill / reliability (excluding API-degraded games), and writes
site/data.js as `window.WARBENCH_DATA = {...}` so the static site renders with
no server or fetch (works over file:// and static hosting alike).

    python analysis/build_site.py
"""
from __future__ import annotations

import glob
import json
import os
import time

from wargame_eval.agents.providers import (CHINESE_ORIGINS, model_label, model_origin)
from wargame_eval.scoring import GameResult, elo_ratings, side_performance, win_table

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
FIELDS = ("red_model", "blue_model", "seed", "victory_class", "winner",
          "red_score", "metrics")


def load_grades() -> dict:
    """Trash-talk grades from analysis/grade_trash_talk.py, if present."""
    p = os.path.join(HERE, "trash_talk_grades.json")
    return json.load(open(p)) if os.path.exists(p) else {}


def load_strategies() -> dict:
    """Per-model strategy profiles from analysis/analyze_strategies.py, if present."""
    p = os.path.join(HERE, "strategies.json")
    return json.load(open(p)) if os.path.exists(p) else {}


def load_invalid() -> dict:
    """Invalid-order error breakdown from analysis/diagnose_invalid.py, if present."""
    p = os.path.join(HERE, "invalid_breakdown.json")
    return json.load(open(p)) if os.path.exists(p) else {}


GRADES = load_grades()
STRATS = load_strategies()
INVALID = load_invalid()


def progress_from_metrics(m: dict) -> float:
    """Continuous Chinese-success score from a game's metrics (see victory.py)."""
    if not m:
        return 0.0
    attr = m.get("amphib_attrition", 0.0)
    func = m.get("functional_facilities_captured", 0.0)
    lodg = m.get("pla_lodgment", 0.0)
    tw = max(1.0, m.get("taiwan_ground", 1.0))
    ratio = lodg / tw
    p = (0.35 * min(1.0, func / 2.0) + 0.40 * min(1.0, ratio / 1.3)
         + 0.25 * (1.0 - min(1.0, attr)))
    return round(max(0.0, min(1.0, p)), 3)


def short(model: str) -> str:
    return model_label(model)


def _slug(m: str) -> str:
    return m.replace("/", "_").replace(":", "_")


def _order_summary(phase: str, o: dict) -> str:
    """One-line human summary of a phase's orders for the decision replay."""
    a = o.get("allocation") or {}
    nice = {"taiwan_airfields": "airfields", "okinawa_kadena": "Kadena", "guam": "Guam",
            "carriers": "carriers", "ships": "ships", "escort_strike": "escort",
            "strike_blue_airbases": "strike bases", "strike_amphibs": "anti-ship",
            "strike_airbases": "strike bases", "ground_support": "CAS", "cap": "CAP"}
    if phase == "RED_MISSILE":
        parts = [f"{int(v)} {nice.get(k, k)}" for k, v in a.items() if v]
        return "missiles → " + (", ".join(parts) if parts else "hold fire")
    if phase in ("RED_AIR", "BLUE_AIR"):
        parts = [f"{int(v)} {nice.get(k, k)}" for k, v in a.items() if v]
        return "sorties → " + (", ".join(parts) if parts else "none available")
    if phase == "BLUE_NAVAL":
        return f"{int(o.get('subron_on_barrier', 0))} SUBRON to the strait barrier"
    if phase == "RED_AMPHIB":
        return f"commit {int(o.get('flotillas_to_commit', 0))} flotillas across the strait"
    if phase == "RED_GROUND":
        return f"ground posture: {o.get('posture', '—')}"
    return ""


def build_replay() -> dict | None:
    """Turn-by-turn decision replay of one marquee game (both sides' reasoning).

    Prefers a clean (no-fallback) Chinese-victory, ideally with the strongest
    invader on offense, so every rationale shown is the model's own."""
    sp = os.path.join(HERE, "real_run_mixed", "summary.json")
    if not os.path.exists(sp):
        return None
    summ = json.load(open(sp))
    games = [g for g in summ.get("games", []) if not (g.get("metrics") or {}).get("degraded")]
    if not games:
        return None

    def score(g):
        m = g.get("metrics") or {}
        clean = (m.get("red_fallbacks", 9) == 0 and m.get("blue_fallbacks", 9) == 0)
        return (g["victory_class"] == "CHINESE_VICTORY", clean,
                g["red_model"] == "gpt-5.5", m.get("functional_facilities_captured", 0))

    g = max(games, key=score)
    fn = os.path.join(HERE, "real_run_mixed",
                      f"game_{_slug(g['red_model'])}_vs_{_slug(g['blue_model'])}_{g['seed']}.json")
    if not os.path.exists(fn):
        return None
    tr = json.load(open(fn))["transcript"]
    turns: dict[int, list] = {}
    for t in tr:
        turns.setdefault(t["turn"], []).append({
            "side": t["side"], "phase": t["phase"],
            "order": _order_summary(t["phase"], t.get("orders") or {}),
            "rationale": (t.get("rationale") or "").strip(),
            "trash_talk": (t.get("trash_talk") or "").strip(),
        })
    return {
        "red": short(g["red_model"]), "blue": short(g["blue_model"]),
        "red_cn": model_origin(g["red_model"]) in CHINESE_ORIGINS,
        "blue_cn": model_origin(g["blue_model"]) in CHINESE_ORIGINS,
        "outcome": g["victory_class"],
        "turns": [{"turn": k, "decisions": v} for k, v in sorted(turns.items())],
    }


def pick_featured(valid: list) -> dict | None:
    """Choose one representative game to drive the theater map.

    We want a game that tells the "take Taiwan" story: prefer a Chinese model on
    the RED (invader) side, then the most ports/airfields taken, then the most
    lodgment ashore, then the highest continuous Chinese-success score. The
    per-turn timeline (lift committed, sunk crossing vs. by air, lodgment, fleet
    remaining) is what the map renders.
    """
    timelined = [g for g in valid if (g.metrics or {}).get("timeline")]
    if not timelined:
        return None

    def key(gr):
        m = gr.metrics or {}
        tl = m["timeline"]
        last = tl[-1]
        red_cn = model_origin(gr.red_model) in CHINESE_ORIGINS
        return (red_cn, last.get("facilities_captured", 0),
                last.get("lodgment_total", 0.0), gr.red_score)

    best = max(timelined, key=key)
    tl = best.metrics["timeline"]
    last = tl[-1]
    sunk_crossing = sum(r.get("sunk_crossing", 0) for r in tl)
    sunk_air = sum(r.get("sunk_air", 0) for r in tl)
    return {
        "red": short(best.red_model), "blue": short(best.blue_model),
        "red_cn": model_origin(best.red_model) in CHINESE_ORIGINS,
        "blue_cn": model_origin(best.blue_model) in CHINESE_ORIGINS,
        "outcome": best.victory_class, "winner": best.winner or "DRAW",
        "committed_total": sum(r.get("committed", 0) for r in tl),
        "sunk_crossing": sunk_crossing, "sunk_air": sunk_air,
        "sunk_total": sunk_crossing + sunk_air,
        "lodgment": last.get("lodgment_total", 0.0),
        "facilities": last.get("facilities_captured", 0),
        "taiwan_ground": last.get("taiwan_ground", 0.0),
        "amphib_initial": last.get("amphib_initial", 0),
        "amphib_remaining": last.get("amphib_remaining", 0),
        "timeline": [{k: r.get(k) for k in
                      ("turn", "committed", "sunk_crossing", "sunk_air",
                       "lodgment_total", "amphib_remaining", "taiwan_ground",
                       "facilities_captured")} for r in tl],
    }


def build_run(path: str) -> dict | None:
    d = json.load(open(path))
    all_games, valid = [], []
    for g in d.get("games", []):
        gr = GameResult(**{k: g.get(k) for k in FIELDS})
        degraded = bool((gr.metrics or {}).get("degraded"))
        gr.red_score = progress_from_metrics(gr.metrics)
        all_games.append((gr, degraded))
        if not degraded:
            valid.append(gr)
    if not valid:
        return None
    elo = elo_ratings(valid)
    wt = win_table(valid)
    perf = side_performance(valid)
    fb = d.get("total_fallbacks", {})
    models = []
    # Headline metric is OFFENSE — how far a model gets as the invader (can it take
    # Taiwan?). Sort by it, ties broken by the better defense.
    order = sorted(elo, key=lambda x: (-perf[x]["offense_red_score"],
                                       perf[x]["defense_conceded"]))
    for m in order:
        origin = model_origin(m)
        models.append({
            "model": m, "label": short(m), "origin": origin,
            "cn": origin in CHINESE_ORIGINS,
            "elo": round(elo[m]),
            "games": wt[m]["games"], "wins": wt[m]["wins"],
            "win_rate": wt[m]["win_rate"],
            "offense": perf[m]["offense_red_score"],
            "defense": perf[m]["defense_conceded"],
            "fallbacks": fb.get(m, 0),
            "taunt_score": GRADES.get(m, {}).get("score"),
        })
    balance = d.get("balance", "historical")
    if balance == "competitive":
        scenario = "Competitive — maximal PLA sealift, US entry T+2"
    elif d.get("us_entry", 1) == 1 and not d.get("japan_neutral"):
        scenario = "Historical base case — defender-favored"
    else:
        scenario = (f"Excursion — US entry turn {d.get('us_entry')}, "
                    f"Japan {'neutral' if d.get('japan_neutral') else 'engaged'}")
    cross = any(m["cn"] for m in models) and any(not m["cn"] for m in models)
    label = os.path.basename(os.path.dirname(path)).replace("real_run_", "").replace("real_run", "base")
    return {
        "label": label, "scenario": scenario, "cross": cross,
        "competitive": balance == "competitive", "turns": d.get("turns"),
        "n_games": len(all_games), "n_valid": len(valid),
        "n_degraded": len(all_games) - len(valid),
        "models": models,
        "featured_game": pick_featured(valid),
        "games": [{"red": short(gr.red_model), "blue": short(gr.blue_model),
                   "outcome": gr.victory_class, "winner": gr.winner or "DRAW",
                   "degraded": deg} for gr, deg in all_games],
    }


def main() -> None:
    runs = []
    for path in sorted(glob.glob(os.path.join(HERE, "real_run*", "summary.json"))):
        r = build_run(path)
        if r:
            runs.append(r)
    # Feature the competitive cross-provider run first, then by sample size.
    runs.sort(key=lambda r: (not r.get("competitive"), not r.get("cross"), -r["n_valid"]))
    talk = []
    for m, g in GRADES.items():
        origin = model_origin(m)
        talk.append({"model": m, "label": model_label(m), "origin": origin,
                     "cn": origin in CHINESE_ORIGINS, **g})
    talk.sort(key=lambda x: -x.get("score", 0))
    # Strategy profiles (+ reasoning grade), ordered by how aggressively each invades.
    strat = []
    for mid, s in STRATS.items():
        e = dict(s)
        e["model"] = mid
        strat.append(e)
    strat.sort(key=lambda s: -((s.get("red") or {}).get("amphib_aggression") or 0))
    invalid = sorted(INVALID.values(), key=lambda x: -x.get("invalid", 0))
    data = {"generated": time.strftime("%Y-%m-%d"), "runs": runs,
            "trash_talk": talk, "strategies": strat, "replay": build_replay(),
            "invalid": invalid}
    out = os.path.join(ROOT, "site", "data.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        f.write("window.WARBENCH_DATA = " + json.dumps(data, indent=2) + ";\n")
    print(f"wrote {out} ({len(runs)} runs)")


if __name__ == "__main__":
    main()
