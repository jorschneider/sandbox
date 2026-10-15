"""Combine saved live-API runs into a skill leaderboard (offline, no API).

Reads every analysis/real_run*/summary.json and writes analysis/LEADERBOARD.md
with per-model offense (red_score as Red) and defense (red_score conceded as
Blue) — the differentiators in defender-favored scenarios where win/loss ties.

    python analysis/summarize.py
"""
from __future__ import annotations

import glob
import json
import os

from wargame_eval.scoring import GameResult, side_performance

HERE = os.path.dirname(__file__)
FIELDS = ("red_model", "blue_model", "seed", "victory_class", "winner",
          "red_score", "metrics")


def progress_from_metrics(m: dict) -> float:
    """Recompute the continuous Chinese-success score from a game's saved
    metrics (matches victory.evaluate), so older runs whose stored red_score was
    a fixed-per-class value still differentiate within a class."""
    if not m:
        return 0.0
    attr = m.get("amphib_attrition", 0.0)
    func = m.get("functional_facilities_captured", 0.0)
    lodg = m.get("pla_lodgment", 0.0)
    tw = max(1.0, m.get("taiwan_ground", 1.0))
    ratio = lodg / tw
    p = 0.35 * min(1.0, func / 2.0) + 0.40 * min(1.0, ratio / 1.3) \
        + 0.25 * (1.0 - min(1.0, attr))
    return round(max(0.0, min(1.0, p)), 3)


def load(path: str):
    d = json.load(open(path))
    games = []
    for g in d.get("games", []):
        if (g.get("metrics") or {}).get("degraded"):
            continue  # skip API-degraded (rate-limited) games — see analysis/README
        gr = GameResult(**{k: g.get(k) for k in FIELDS})
        gr.red_score = progress_from_metrics(gr.metrics)  # continuous, from metrics
        games.append(gr)
    return d, games


def main() -> None:
    summaries = sorted(glob.glob(os.path.join(HERE, "real_run*", "summary.json")))
    if not summaries:
        print("no run summaries found; run run_real_tournament.py first")
        return
    out = ["# Live-API skill leaderboard", "",
           "Offense = mean `red_score` as Red (higher = better invader). "
           "Defense = mean `red_score` conceded as Blue (lower = better defender). "
           "These separate models even when every game is won by the same side "
           "(see analysis/README.md).", ""]
    for path in summaries:
        d, games = load(path)
        if not games:
            continue
        label = os.path.basename(os.path.dirname(path)).replace("real_run_", "").replace("real_run", "base")
        scen = ("base case" if d.get("us_entry", 1) == 1 and not d.get("japan_neutral")
                else f"US entry turn {d.get('us_entry')}, "
                     f"Japan {'neutral' if d.get('japan_neutral') else 'engaged'}")
        perf = side_performance(games)
        out += [f"## {label} — {scen}  ({len(games)} games, {d.get('turns')} turns)", "",
                "| Model | Offense (as Red) | Defense (conceded as Blue) |",
                "|---|---|---|"]
        for m in sorted(perf, key=lambda x: perf[x]["offense_red_score"] or 0, reverse=True):
            p = perf[m]
            out.append(f"| {m} | {p['offense_red_score']} | {p['defense_conceded']} |")
        best_off = max(perf, key=lambda x: perf[x]["offense_red_score"] or 0)
        best_def = min(perf, key=lambda x: perf[x]["defense_conceded"] or 1)
        out += ["", f"- Best invader: **{best_off}** "
                f"({perf[best_off]['offense_red_score']} avg red_score as Red)",
                f"- Best defender: **{best_def}** "
                f"({perf[best_def]['defense_conceded']} red_score conceded as Blue)", ""]
    md = os.path.join(HERE, "LEADERBOARD.md")
    with open(md, "w") as f:
        f.write("\n".join(out) + "\n")
    print(f"wrote {md} from {len(summaries)} run(s)")
    print("\n".join(out))


if __name__ == "__main__":
    main()
