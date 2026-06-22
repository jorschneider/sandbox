"""Run a real (live-API) round-robin tournament and save a leaderboard.

Drives Red-vs-Blue games with live Claude commanders, swapping sides across
pairings, and writes per-game results + transcripts and a markdown leaderboard
to analysis/real_run/. Run from the wargame-eval directory:

    python analysis/run_real_tournament.py

Needs ANTHROPIC_API_KEY. Tune MODELS / GAMES_PER_PAIR / TURNS below for cost.
"""
from __future__ import annotations

import itertools
import json
import os
import time

from wargame_eval.agents.claude import ClaudeCommander
from wargame_eval.engine import Engine
from wargame_eval.scenario import build_base_case
from wargame_eval.scoring import GameResult, elo_ratings, extract_metrics, win_table

MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]
GAMES_PER_PAIR = 1
TURNS = 4
GROUND_MAP = False

OUT = os.path.join(os.path.dirname(__file__), "real_run")
os.makedirs(OUT, exist_ok=True)


def main() -> None:
    results: list[GameResult] = []
    fallbacks: dict[str, int] = {}
    t0 = time.time()
    for a, b in itertools.permutations(MODELS, 2):
        for k in range(GAMES_PER_PAIR):
            seed = 1000 * k + (hash((a, b)) % 997)
            state = build_base_case(seed=seed, max_turns=TURNS)
            red = ClaudeCommander(a, seed=seed * 2 + 1)
            blue = ClaudeCommander(b, seed=seed * 2 + 2)
            engine = Engine(state, red, blue, ground_map=GROUND_MAP)
            try:
                r = engine.run()
            except Exception as e:  # noqa: BLE001 — log and continue the tournament
                print(f"  game {a} vs {b} seed {seed} FAILED: {e}")
                continue
            gr = GameResult(red_model=a, blue_model=b, seed=seed,
                            victory_class=r.klass.value,
                            winner=(r.winner.value if r.winner else None),
                            red_score=r.red_score, metrics=extract_metrics(state, r))
            results.append(gr)
            fallbacks[a] = fallbacks.get(a, 0) + red.fallback_count
            fallbacks[b] = fallbacks.get(b, 0) + blue.fallback_count
            print(f"  {a} (RED) vs {b} (BLUE) seed {seed} -> {r.klass.value} "
                  f"[{time.time()-t0:.0f}s, fb R{red.fallback_count}/B{blue.fallback_count}]")
            with open(os.path.join(OUT, f"game_{a}_vs_{b}_{seed}.json"), "w") as f:
                json.dump({"result": gr.__dict__, "transcript": engine.transcript,
                           "log": engine.state.log}, f, indent=2, default=str)

    wt = win_table(results)
    elo = elo_ratings(results)
    summary = {
        "models": MODELS, "games_per_pair": GAMES_PER_PAIR, "turns": TURNS,
        "ground_map": GROUND_MAP, "n_games": len(results),
        "elapsed_sec": round(time.time() - t0, 1),
        "win_table": wt, "elo": elo, "total_fallbacks": fallbacks,
        "games": [g.__dict__ for g in results],
    }
    with open(os.path.join(OUT, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)

    lines = ["# Real (live-API) tournament results", "",
             f"- Models: {', '.join(MODELS)}",
             f"- {len(results)} games, {TURNS} turns each, "
             f"ground_map={GROUND_MAP}, {summary['elapsed_sec']}s total", "",
             "## Elo", "", "| Model | Elo |", "|---|---|"]
    for m, rt in elo.items():
        lines.append(f"| {m} | {rt:.0f} |")
    lines += ["", "## Win table", "", "| Model | Games | Wins | Losses | Draws | Win rate |",
              "|---|---|---|---|---|---|"]
    for m, rec in wt.items():
        lines.append(f"| {m} | {rec['games']} | {rec['wins']} | {rec['losses']} | "
                     f"{rec['draws']} | {rec['win_rate']} |")
    lines += ["", "## Reliability (lower is better)", "",
              "| Model | Fallbacks (illegal/parse/refusal -> heuristic) |", "|---|---|"]
    for m in MODELS:
        lines.append(f"| {m} | {fallbacks.get(m, 0)} |")
    lines += ["", "## Per-game", "", "| Red | Blue | Outcome | Winner |", "|---|---|---|---|"]
    for g in results:
        lines.append(f"| {g.red_model} | {g.blue_model} | {g.victory_class} | "
                     f"{g.winner or 'DRAW'} |")
    md = os.path.join(os.path.dirname(__file__), "REAL_RUN_RESULTS.md")
    with open(md, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nWrote {md} and {OUT}/summary.json ({len(results)} games)")


if __name__ == "__main__":
    main()
