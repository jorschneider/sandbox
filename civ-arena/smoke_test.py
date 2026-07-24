#!/usr/bin/env python3
"""Prove the headless Unciv engine runs with NO API keys and NO GUI.

Loads a bundled CivAgent save, advances it N turns through resources/Unciv.jar
via JPype, and prints each major civ's strength. If this prints turn numbers
climbing and a strength table, the hard part (a self-driving, no-human game
engine) works on your machine.

Usage:
    CIVAGENT_DIR=./vendor/CivAgent python smoke_test.py [save_path] [turns]
"""
import os
import sys
import time

CIVAGENT_DIR = os.environ.get("CIVAGENT_DIR", os.path.join(os.path.dirname(__file__), "vendor", "CivAgent"))
CIVAGENT_DIR = os.path.abspath(CIVAGENT_DIR)
if not os.path.isdir(CIVAGENT_DIR):
    sys.exit(f"CivAgent checkout not found at {CIVAGENT_DIR}. Run setup.sh first (or set CIVAGENT_DIR).")

# CivAgent reads its config at import time and instantiates a Redis client,
# so a config must be pointed to before importing civsim/civagent.
os.environ.setdefault("CIVAGENT_CONFIG_PATH", os.path.join(CIVAGENT_DIR, "config.yaml"))
sys.path.insert(0, CIVAGENT_DIR)

from civsim import utils  # noqa: E402
from civsim.simulator import simulator  # noqa: E402


def major_civs(data):
    return [
        c.get("civName")
        for c in data.get("civilizations", [])
        if "playerId" not in c
        and "cityStatePersonality" not in c
        and c.get("civName") != "Barbarians"
    ]


def main():
    save = sys.argv[1] if len(sys.argv) > 1 else os.path.join(CIVAGENT_DIR, "scripts", "reproductions", "Autosave")
    turns = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    save = os.path.abspath(save)

    with open(save, "r", encoding="utf-8") as f:
        data = utils.json_load_defaultdict(f.read())
    civs = major_civs(data)
    print(f"START turn {data['turns']} | save={os.path.basename(save)} | major civs: {civs}")

    simulator.init_jvm()
    print(f"JVM up; advancing {turns} turns through Unciv.jar ...")
    t0 = time.time()
    out = simulator.run(save, turns=turns, diplomacy_flag=False, worker_auto=True)
    print(f"END   turn {out['turns']} | elapsed {time.time() - t0:.1f}s\n")

    print(f"{'civ':12s}{'strength':>10s}{'tech':>8s}{'army':>8s}{'production':>12s}")
    for c in civs:
        s = utils.get_stats(out, utils.get_civ_index(out, c))
        print(f"{c:12s}{s['civ_strength']:>10.1f}{s['tech_strength']:>8.1f}"
              f"{s['army_strength']:>8.1f}{s['production_strength']:>12.1f}")


if __name__ == "__main__":
    main()
