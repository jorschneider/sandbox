"""PresidentBench command line.

Examples:
  python -m harness.cli list
  python -m harness.cli run --scenario strait-crisis --agent persona:hawk --seed 1 -v
  python -m harness.cli demo                      # offline persona baselines, all vignettes
  python -m harness.cli batch --agents model:haiku model:sonnet --seeds 1 2
  python -m harness.cli aggregate                 # build site/data/results.json
"""

from __future__ import annotations

import argparse
import os

from . import scenarios  # noqa: F401
from .core import REGISTRY
from .agents import make_agent, build_personas
from .mandates import MANDATES
from .runner import run_episode, run_batch, aggregate, aggregate_mandates

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # presidentbench/
RESULTS_DIR = os.path.join(HERE, "results")
SITE_DATA = os.path.join(HERE, "site", "data", "results.json")
SITE_MANDATES = os.path.join(HERE, "site", "data", "mandates.json")

ALL_SCENARIOS = list(REGISTRY.keys())
DEFAULT_PERSONAS = [f"persona:{p}" for p in build_personas()]


def cmd_list(_args):
    print("Scenarios:")
    for slug, cls in REGISTRY.items():
        print(f"  {slug:18s} [{cls.domain}]  {cls.title}")
    print("\nPersonas:")
    for name, p in build_personas().items():
        print(f"  persona:{name:16s} {p.desc}")
    print("\nModels (aliases): model:haiku  model:sonnet  model:opus  model:fable")
    print("\nMandates (2028 stylized platforms):")
    for k, m in MANDATES.items():
        print(f"  {k:16s} {m.name:24s} ({m.party})  \"{m.slogan}\"")


def cmd_run(args):
    agent = make_agent(args.agent)
    res = run_episode(args.scenario, agent, args.seed, verbose=args.verbose)
    print("\n" + "=" * 60)
    print(f"OUTCOME: {res['outcome']}")
    print(f"Hidden truth: {res['hidden']}")
    print(f"Competence (composite {res['competence_composite']}): {res['competence']}")
    print(f"Flags: {res['flags']}")
    print("Disposition lean:")
    for k, v in res["disposition"]["lean"].items():
        print(f"  {k:24s} {v:+.2f}")


def cmd_demo(args):
    run_batch(ALL_SCENARIOS, DEFAULT_PERSONAS, args.seeds, RESULTS_DIR,
              verbose=args.verbose)
    aggregate(RESULTS_DIR, SITE_DATA)
    print(f"\nWrote site data -> {SITE_DATA}")


def cmd_batch(args):
    scens = args.scenarios or ALL_SCENARIOS
    agents = args.agents or DEFAULT_PERSONAS
    run_batch(scens, agents, args.seeds, RESULTS_DIR, verbose=args.verbose)
    if args.aggregate:
        aggregate(RESULTS_DIR, SITE_DATA)
        print(f"\nWrote site data -> {SITE_DATA}")


def cmd_aggregate(_args):
    payload = aggregate(RESULTS_DIR, SITE_DATA)
    print(f"Aggregated {payload['n_runs']} runs across "
          f"{len(payload['leaderboard'])} agents -> {SITE_DATA}")
    mp = aggregate_mandates(RESULTS_DIR, SITE_MANDATES)
    print(f"Aggregated mandate matrix: {len(mp['matrix'])} model x mandate cells "
          f"-> {SITE_MANDATES}")


def cmd_mandates(args):
    mkeys = args.mandates or list(MANDATES.keys())
    agents = args.agents or ["model:haiku", "model:sonnet", "model:opus"]
    scens = args.scenarios or ALL_SCENARIOS
    for mkey in mkeys:
        print(f"\n##### MANDATE: {MANDATES[mkey].name} ({MANDATES[mkey].slogan}) #####")
        run_batch(scens, agents, args.seeds, RESULTS_DIR, verbose=args.verbose, mandate=mkey)
    payload = aggregate_mandates(RESULTS_DIR, SITE_MANDATES)
    aggregate(RESULTS_DIR, SITE_DATA)  # refresh base board (excludes mandate runs)
    print(f"\nWrote mandate matrix ({len(payload['matrix'])} cells) -> {SITE_MANDATES}")


def main():
    p = argparse.ArgumentParser(prog="presidentbench")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list").set_defaults(func=cmd_list)

    r = sub.add_parser("run")
    r.add_argument("--scenario", required=True, choices=ALL_SCENARIOS)
    r.add_argument("--agent", required=True)
    r.add_argument("--seed", type=int, default=1)
    r.add_argument("-v", "--verbose", action="store_true")
    r.set_defaults(func=cmd_run)

    d = sub.add_parser("demo")
    d.add_argument("--seeds", type=int, nargs="+", default=[1, 2, 3])
    d.add_argument("-v", "--verbose", action="store_true")
    d.set_defaults(func=cmd_demo)

    b = sub.add_parser("batch")
    b.add_argument("--scenarios", nargs="+", choices=ALL_SCENARIOS)
    b.add_argument("--agents", nargs="+")
    b.add_argument("--seeds", type=int, nargs="+", default=[1, 2])
    b.add_argument("--aggregate", action="store_true")
    b.add_argument("-v", "--verbose", action="store_true")
    b.set_defaults(func=cmd_batch)

    a = sub.add_parser("aggregate")
    a.set_defaults(func=cmd_aggregate)

    mn = sub.add_parser("mandates", help="run goal-conditioned mandate mode (2028 platforms)")
    mn.add_argument("--mandates", nargs="+", choices=list(MANDATES.keys()))
    mn.add_argument("--agents", nargs="+")
    mn.add_argument("--scenarios", nargs="+", choices=ALL_SCENARIOS)
    mn.add_argument("--seeds", type=int, nargs="+", default=[1, 2])
    mn.add_argument("-v", "--verbose", action="store_true")
    mn.set_defaults(func=cmd_mandates)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
