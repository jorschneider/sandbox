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
import zlib

from wargame_eval.agents.providers import make_commander
from wargame_eval.engine import Engine
from wargame_eval.scenario import build_base_case
from wargame_eval.scoring import GameResult, elo_ratings, extract_metrics, win_table

def _env(name, default):
    return os.environ.get(name, default)


def _slug(model: str) -> str:
    """Filesystem-safe token for a model id (vendor/model -> vendor_model)."""
    return model.replace("/", "_").replace(":", "_")


MODELS = _env("WG_MODELS", "claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5").split(",")
GAMES_PER_PAIR = int(_env("WG_GPP", "1"))
TURNS = int(_env("WG_TURNS", "4"))
GROUND_MAP = _env("WG_GROUND", "0") == "1"
US_ENTRY = int(_env("WG_US_ENTRY", "1"))
JAPAN_NEUTRAL = _env("WG_JP_NEUTRAL", "0") == "1"
LABEL = _env("WG_LABEL", "base")  # results file suffix

OUT = os.path.join(os.path.dirname(__file__), f"real_run_{LABEL}")
os.makedirs(OUT, exist_ok=True)


def main() -> None:
    results: list[GameResult] = []
    fallbacks: dict[str, int] = {}
    t0 = time.time()
    for a, b in itertools.permutations(MODELS, 2):
        for k in range(GAMES_PER_PAIR):
            seed = 1000 * k + zlib.crc32(f"{a}|{b}".encode()) % 997  # deterministic
            state = build_base_case(seed=seed, max_turns=TURNS,
                                    us_entry_turn=US_ENTRY,
                                    japan_engaged=not JAPAN_NEUTRAL)
            red = make_commander(a, seed=seed * 2 + 1)
            blue = make_commander(b, seed=seed * 2 + 2)
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
            # A game is "degraded" if the API rate-limited/failed so often that a
            # side's decisions mostly fell back to the heuristic — such a game is
            # effectively heuristic-vs-heuristic and must not count in rankings.
            red_decisions, blue_decisions = TURNS * 4, TURNS * 2
            degraded = (red.fallback_count > 0.5 * red_decisions
                        or blue.fallback_count > 0.5 * blue_decisions)
            gr.metrics["red_fallbacks"] = red.fallback_count
            gr.metrics["blue_fallbacks"] = blue.fallback_count
            gr.metrics["degraded"] = degraded
            results.append(gr)
            fallbacks[a] = fallbacks.get(a, 0) + red.fallback_count
            fallbacks[b] = fallbacks.get(b, 0) + blue.fallback_count
            print(f"  {a} (RED) vs {b} (BLUE) seed {seed} -> {r.klass.value} "
                  f"[{time.time()-t0:.0f}s, fb R{red.fallback_count}/B{blue.fallback_count}"
                  f"{' DEGRADED' if degraded else ''}]")
            time.sleep(3)  # gentle spacing to ease rate limits between games
            fn = f"game_{_slug(a)}_vs_{_slug(b)}_{seed}.json"
            with open(os.path.join(OUT, fn), "w") as f:
                json.dump({"result": gr.__dict__, "transcript": engine.transcript,
                           "log": engine.state.log}, f, indent=2, default=str)

    # Rankings use only non-degraded games (real model-vs-model play).
    valid = [g for g in results if not g.metrics.get("degraded")]
    n_degraded = len(results) - len(valid)
    wt = win_table(valid)
    elo = elo_ratings(valid)
    summary = {
        "models": MODELS, "games_per_pair": GAMES_PER_PAIR, "turns": TURNS,
        "ground_map": GROUND_MAP, "us_entry": US_ENTRY, "japan_neutral": JAPAN_NEUTRAL,
        "n_games": len(results), "elapsed_sec": round(time.time() - t0, 1),
        "win_table": wt, "elo": elo, "total_fallbacks": fallbacks,
        "games": [g.__dict__ for g in results],
    }
    with open(os.path.join(OUT, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)

    scen = (f"base case (US in turn 1, Japan engaged)" if US_ENTRY == 1 and not JAPAN_NEUTRAL
            else f"excursion: US entry turn {US_ENTRY}, Japan "
                 f"{'neutral' if JAPAN_NEUTRAL else 'engaged'}")
    lines = [f"# Real (live-API) tournament — {LABEL}", "",
             f"- Scenario: {scen}",
             f"- Models: {', '.join(MODELS)}",
             f"- {len(results)} games, {TURNS} turns each, "
             f"ground_map={GROUND_MAP}, {summary['elapsed_sec']}s total",
             f"- Rankings use {len(valid)} non-degraded games"
             + (f" ({n_degraded} excluded for excessive API fallbacks)" if n_degraded else ""),
             "",
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
    md = os.path.join(os.path.dirname(__file__), f"REAL_RUN_RESULTS_{LABEL}.md")
    with open(md, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nWrote {md} and {OUT}/summary.json ({len(results)} games)")


if __name__ == "__main__":
    main()
