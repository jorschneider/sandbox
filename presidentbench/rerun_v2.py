"""Re-run the full base board on the v2 harness (Florian's fixes):

  * CoT recorded per turn ("thinking" in the transcript)
  * models unchoked: 8-12K completion budgets (20K for GPT-5.5 reasoning)
  * yap-first prompting: reason at length in prose, THEN call tools; no more
    one-sentence rationale
  * reasoning explicitly on (effort=high for GPT-5.5; thinking mode for
    Qwen/GLM/Kimi; extended thinking for Claude via OpenRouter)
  * vendor-recommended temperatures (GLM/Qwen/Kimi 1.0)

7 models x 4 scenarios x 10 seeds = 280 episodes, one worker thread per model,
resume-safe (skips files that already exist). Delete stale files before launch.
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

BASE = ["long-hot-summer", "strait-crisis", "patient-zero", "the-jump"]
SEEDS = list(range(1, 11))
MODELS = ["model:haiku", "model:sonnet", "model:opus",
          "model:gpt", "model:qwen", "model:glm", "model:kimi"]


def worker(spec):
    t0 = time.time()
    print(f"[{time.strftime('%H:%M:%S')}] {spec} worker starting", flush=True)
    run_batch(BASE, [spec], SEEDS, RESULTS, verbose=False, resume=True)
    print(f"[{time.strftime('%H:%M:%S')}] {spec} DONE in {(time.time()-t0)/60:.1f} min",
          flush=True)


if __name__ == "__main__":
    t0 = time.time()
    print(f"[{time.strftime('%H:%M:%S')}] v2-harness re-run: {len(MODELS)} models x "
          f"{len(BASE)} scenarios x {len(SEEDS)} seeds", flush=True)
    with ThreadPoolExecutor(max_workers=len(MODELS)) as ex:
        list(ex.map(worker, MODELS))
    print(f"[{time.strftime('%H:%M:%S')}] ALL DONE in {(time.time()-t0)/60:.1f} min",
          flush=True)
