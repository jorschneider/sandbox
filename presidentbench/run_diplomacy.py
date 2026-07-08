"""Play Concordat (Diplomacy-style) self-play games for mandate embodiment.

Each game: ONE model plays all 7 seats -- six 2028 candidates + an unmandated
control -- so behavioral differences between seats are the mandate embodiment.
Full press + orders + chain-of-thought recorded.
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness.diplomacy import play_game

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results", "diplomacy")
os.makedirs(OUT, exist_ok=True)

GAMES = [("sonnet", 1), ("gpt", 1)]


def worker(spec):
    alias, seed = spec
    out = os.path.join(OUT, "concordat__%s__game%d.json" % (alias, seed))
    if os.path.exists(out):
        print("skip (exists):", out, flush=True)
        return
    t0 = time.time()
    print("[%s] %s game %d starting" % (time.strftime("%H:%M:%S"), alias, seed), flush=True)
    try:
        play_game(alias, out, game_seed=seed,
                  log=lambda m: print(m, flush=True))
    except Exception as e:
        import traceback
        print("!! %s game %d FAILED: %s" % (alias, seed, e), flush=True)
        traceback.print_exc()
    print("[%s] %s game %d done in %.1f min" %
          (time.strftime("%H:%M:%S"), alias, seed, (time.time() - t0) / 60), flush=True)


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=len(GAMES)) as ex:
        list(ex.map(worker, GAMES))
    print("ALL GAMES DONE", flush=True)
