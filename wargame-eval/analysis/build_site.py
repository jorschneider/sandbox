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

from wargame_eval.scoring import GameResult, elo_ratings, side_performance, win_table

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
FIELDS = ("red_model", "blue_model", "seed", "victory_class", "winner",
          "red_score", "metrics")


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
    return (model.replace("claude-", "").replace("-", " ")
            .replace("opus 4 8", "Opus 4.8").replace("sonnet 4 6", "Sonnet 4.6")
            .replace("haiku 4 5", "Haiku 4.5"))


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
    for m in sorted(elo, key=lambda x: elo[x], reverse=True):
        models.append({
            "model": m, "label": short(m), "elo": round(elo[m]),
            "games": wt[m]["games"], "wins": wt[m]["wins"],
            "win_rate": wt[m]["win_rate"],
            "offense": perf[m]["offense_red_score"],
            "defense": perf[m]["defense_conceded"],
            "fallbacks": fb.get(m, 0),
        })
    scenario = ("Base case — US in from turn 1, Japan engaged"
                if d.get("us_entry", 1) == 1 and not d.get("japan_neutral")
                else f"Excursion — US entry turn {d.get('us_entry')}, "
                     f"Japan {'neutral' if d.get('japan_neutral') else 'engaged'}")
    label = os.path.basename(os.path.dirname(path)).replace("real_run_", "").replace("real_run", "base")
    return {
        "label": label, "scenario": scenario, "turns": d.get("turns"),
        "n_games": len(all_games), "n_valid": len(valid),
        "n_degraded": len(all_games) - len(valid),
        "models": models,
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
    # Feature the competitive run with the most valid games first.
    runs.sort(key=lambda r: (r["scenario"].startswith("Base"), -r["n_valid"]))
    data = {"generated": time.strftime("%Y-%m-%d"), "runs": runs}
    out = os.path.join(ROOT, "site", "data.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        f.write("window.WARBENCH_DATA = " + json.dumps(data, indent=2) + ";\n")
    print(f"wrote {out} ({len(runs)} runs)")


if __name__ == "__main__":
    main()
