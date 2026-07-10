"""Small companion run: the four v2 multi-source scenarios on the v2 harness
(CoT recorded, unchoked budgets, reasoning on, vendor temps).

7 models x 4 v2 scenarios x seeds 1-3 = 84 episodes. Runs with modest parallelism
so it can share the API pipes with the main base-board re-run. Resume-safe.
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import scenarios  # noqa: F401
from harness.runner import run_batch

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results")

SCEN = ["strait-crisis-v2", "long-hot-summer-v2", "patient-zero-v2", "the-jump-v2"]
SEEDS = [1, 2, 3]
MODELS = ["model:haiku", "model:sonnet", "model:opus",
          "model:gpt", "model:qwen", "model:glm", "model:kimi"]


def worker(spec):
    t0 = time.time()
    print(f"[{time.strftime('%H:%M:%S')}] {spec} v2-scen worker starting", flush=True)
    run_batch(SCEN, [spec], SEEDS, RESULTS, verbose=False, resume=True)
    print(f"[{time.strftime('%H:%M:%S')}] {spec} v2-scen DONE in {(time.time()-t0)/60:.1f} min",
          flush=True)


if __name__ == "__main__":
    t0 = time.time()
    print(f"[{time.strftime('%H:%M:%S')}] v2-scenario small run: {len(MODELS)} models x "
          f"{len(SCEN)} scenarios x {len(SEEDS)} seeds", flush=True)
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(worker, MODELS))
    print(f"[{time.strftime('%H:%M:%S')}] v2-scen ALL DONE in {(time.time()-t0)/60:.1f} min",
          flush=True)
