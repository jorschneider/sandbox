#!/usr/bin/env python3
"""Supervisor for the propagation + historical comparison: 7 models on the three
propagated v2 crises (n=5) and the Cuban Missile Crisis replay (n=5). One parallel
job per model. Keys come from the launch environment."""
import glob, os, subprocess, time

os.chdir("/home/user/sandbox/presidentbench")
ENV = dict(os.environ)
MODELS = ["haiku", "sonnet", "opus", "qwen", "glm", "kimi", "gpt"]
SCEN = ["long-hot-summer-v2", "patient-zero-v2", "the-jump-v2", "cuban-missile-1962"]
SEEDS = ["1", "2", "3", "4", "5"]
NEED = len(SCEN) * len(SEEDS)  # 20 per model

def job(m):
    return ["python3", "-m", "harness.cli", "batch", "--scenarios", *SCEN,
            "--agents", f"model:{m}", "--seeds", *SEEDS]

def count(m):
    return sum(len(glob.glob(f"results/{s}__model_{m}__seed*.json")) for s in SCEN)

procs = {}
while True:
    if all(count(m) >= NEED for m in MODELS):
        print("ALL PROP COMPLETE", flush=True); break
    for m in MODELS:
        if count(m) >= NEED:
            continue
        p = procs.get(m)
        if p is None or p.poll() is not None:
            lf = open(f"results/sup_prop_{m}.log", "a")
            procs[m] = subprocess.Popen(job(m), stdout=lf, stderr=subprocess.STDOUT, env=ENV)
            print(f"launched prop {m} pid {procs[m].pid}", flush=True)
    time.sleep(15)
