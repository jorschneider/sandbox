#!/usr/bin/env python3
"""Self-healing supervisor for the v2 comparison: all 7 models on
strait-crisis-v2 at n=10, one parallel job per model. Keys come from the
launch environment (ANTHROPIC_API_KEY / OPENROUTER_API_KEY), never committed."""
import glob, os, subprocess, time

os.chdir("/home/user/sandbox/presidentbench")
ENV = dict(os.environ)
MODELS = ["haiku", "sonnet", "opus", "qwen", "glm", "kimi", "gpt"]
SEEDS = [str(i) for i in range(1, 11)]

def job(m):
    return ["python3", "-m", "harness.cli", "batch", "--scenarios", "strait-crisis-v2",
            "--agents", f"model:{m}", "--seeds", *SEEDS]

def complete(m):
    return len(glob.glob(f"results/strait-crisis-v2__model_{m}__seed*.json")) >= 10

procs = {}
while True:
    if all(complete(m) for m in MODELS):
        print("ALL V2 COMPLETE", flush=True); break
    for m in MODELS:
        if complete(m):
            continue
        p = procs.get(m)
        if p is None or p.poll() is not None:
            lf = open(f"results/sup_v2_{m}.log", "a")
            procs[m] = subprocess.Popen(job(m), stdout=lf, stderr=subprocess.STDOUT, env=ENV)
            print(f"launched v2 {m} pid {procs[m].pid}", flush=True)
    time.sleep(15)
