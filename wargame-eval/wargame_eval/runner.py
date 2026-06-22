"""CLI: play a single game or run a round-robin tournament.

    python -m wargame_eval.runner play --red claude-opus-4-8 --blue claude-sonnet-4-6
    python -m wargame_eval.runner play --agent heuristic --seed 1 --out game.json
    python -m wargame_eval.runner tournament --models claude-opus-4-8,claude-sonnet-4-6 \
        --games-per-pair 4 --agent heuristic

Use --agent heuristic to run the full pipeline with no API access (deterministic).
Use --agent claude to drive commanders with the Anthropic SDK (needs ANTHROPIC_API_KEY).
"""
from __future__ import annotations

import argparse
import itertools
import json

from .agents.heuristic import HeuristicCommander
from .engine import Engine
from .scenario import build_base_case
from .scoring import GameResult, elo_ratings, extract_metrics, win_table


def _make_commander(agent: str, model: str, side_seed: int):
    if agent == "claude":
        from .agents.claude import ClaudeCommander
        return ClaudeCommander(model=model, seed=side_seed)
    return HeuristicCommander(name=model, seed=side_seed)


def play_one(red_model: str, blue_model: str, agent: str, seed: int,
             turns: int, ground_map: bool = False) -> tuple[GameResult, Engine]:
    state = build_base_case(seed=seed, max_turns=turns)
    red = _make_commander(agent, red_model, seed * 2 + 1)
    blue = _make_commander(agent, blue_model, seed * 2 + 2)
    engine = Engine(state, red, blue, ground_map=ground_map)
    result = engine.run()
    gr = GameResult(
        red_model=red_model, blue_model=blue_model, seed=seed,
        victory_class=result.klass.value,
        winner=(result.winner.value if result.winner else None),
        red_score=result.red_score,
        metrics=extract_metrics(state, result),
    )
    return gr, engine


def cmd_play(args: argparse.Namespace) -> None:
    gr, engine = play_one(args.red, args.blue, args.agent, args.seed, args.turns,
                          ground_map=args.ground_map)
    print(f"RED  = {gr.red_model}\nBLUE = {gr.blue_model}\nseed = {gr.seed}")
    print(f"\nOUTCOME: {gr.victory_class}  (winner: {gr.winner or 'DRAW'})")
    print("metrics:", json.dumps(gr.metrics, indent=2))
    if args.out:
        with open(args.out, "w") as f:
            json.dump({"result": gr.__dict__, "transcript": engine.transcript,
                       "log": engine.state.log, "final_state": engine.state.snapshot()},
                      f, indent=2)
        print(f"\ntranscript written to {args.out}")


def cmd_tournament(args: argparse.Namespace) -> None:
    models = [m.strip() for m in args.models.split(",") if m.strip()]
    results: list[GameResult] = []
    for a, b in itertools.permutations(models, 2):  # role-swapped pairings
        for k in range(args.games_per_pair):
            gr, _ = play_one(a, b, args.agent, seed=1000 * k + hash((a, b)) % 997,
                             turns=args.turns, ground_map=args.ground_map)
            results.append(gr)
    print(f"played {len(results)} games over {len(models)} models\n")
    print("Win table:")
    print(json.dumps(win_table(results), indent=2))
    print("\nElo ratings:")
    for m, r in elo_ratings(results).items():
        print(f"  {m:24s} {r:7.1f}")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="wargame_eval")
    sub = p.add_subparsers(dest="cmd", required=True)

    pl = sub.add_parser("play", help="play one game")
    pl.add_argument("--red", default="heuristic-red")
    pl.add_argument("--blue", default="heuristic-blue")
    pl.add_argument("--agent", choices=["heuristic", "claude"], default="heuristic")
    pl.add_argument("--seed", type=int, default=0)
    pl.add_argument("--turns", type=int, default=8)
    pl.add_argument("--ground-map", action="store_true",
                    help="use the hex ground game (v2) instead of abstract lodgment")
    pl.add_argument("--out", default=None)
    pl.set_defaults(func=cmd_play)

    tn = sub.add_parser("tournament", help="round-robin with role swaps")
    tn.add_argument("--models", required=True, help="comma-separated model ids")
    tn.add_argument("--agent", choices=["heuristic", "claude"], default="heuristic")
    tn.add_argument("--games-per-pair", type=int, default=4)
    tn.add_argument("--turns", type=int, default=8)
    tn.add_argument("--ground-map", action="store_true",
                    help="use the hex ground game (v2) instead of abstract lodgment")
    tn.set_defaults(func=cmd_tournament)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
