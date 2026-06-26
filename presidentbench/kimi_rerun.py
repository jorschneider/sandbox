"""Re-run Kimi with the retry-on-empty tool-call fix in agents.py.

Reading the transcripts showed Kimi emitted no valid action on ~35% of turns
(vs <=1.5% for every other model), which the sim scored as inaction -- confounding
tool-use formatting with presidential judgment and parking Kimi at the bottom of
the board. The harness now forces a tool call when a turn comes back empty. This
re-runs Kimi's board episodes so the leaderboard reflects judgment, not format.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import scenarios  # noqa: F401
from harness.runner import run_batch

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results")

BASE = ["long-hot-summer", "strait-crisis", "patient-zero", "the-jump"]
SEEDS = list(range(1, 11))

if __name__ == "__main__":
    t0 = time.time()
    print(f"[{time.strftime('%H:%M:%S')}] Kimi re-run starting: {len(BASE)} scenarios x {len(SEEDS)} seeds")
    run_batch(BASE, ["model:kimi"], SEEDS, RESULTS, verbose=False, resume=True)
    print(f"[{time.strftime('%H:%M:%S')}] Kimi base re-run done in {(time.time()-t0)/60:.1f} min")
