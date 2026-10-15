#!/usr/bin/env python3
"""Self-healing supervisor for the GPT-5.5 run (base n=10 + mandate matrix),
via OpenRouter. Parallelizes into base + per-seed mandate jobs."""
import glob, os, subprocess, time

os.chdir("/home/user/sandbox/presidentbench")
ENV = dict(os.environ)  # OPENROUTER_API_KEY is inherited from the launch environment

JOBS = {
    "base": (["python3", "-m", "harness.cli", "batch", "--agents", "model:gpt",
              "--seeds", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
             "results/*__model_gpt__seed*.json", 40),
    "m1": (["python3", "-m", "harness.cli", "mandates", "--agents", "model:gpt", "--seeds", "1"],
           "results/*__model_gpt__mandate_*__seed1.json", 24),
    "m2": (["python3", "-m", "harness.cli", "mandates", "--agents", "model:gpt", "--seeds", "2"],
           "results/*__model_gpt__mandate_*__seed2.json", 24),
}

def complete(name):
    _, pat, need = JOBS[name]
    return len(glob.glob(pat)) >= need

procs = {}
while True:
    if all(complete(n) for n in JOBS):
        print("ALL GPT COMPLETE", flush=True); break
    for name, (cmd, _, _) in JOBS.items():
        if complete(name):
            continue
        p = procs.get(name)
        if p is None or p.poll() is not None:
            lf = open(f"results/sup_gpt_{name}.log", "a")
            procs[name] = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, env=ENV)
            print(f"launched gpt {name} pid {procs[name].pid}", flush=True)
    time.sleep(15)
