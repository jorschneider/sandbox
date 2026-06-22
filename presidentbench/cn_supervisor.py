#!/usr/bin/env python3
"""Supervisor for the Chinese-model runs: keeps 4 parallel jobs alive
(base n=10 + per-model mandate matrices), relaunching any that exit early,
until all work is complete. Idempotent via the harness's resume-skip."""
import glob, os, subprocess, sys, time

os.chdir("/home/user/sandbox/presidentbench")
ENV = dict(os.environ)  # OPENROUTER_API_KEY is inherited from the launch environment
SEEDS = [str(i) for i in range(1, 11)]
CN = ("qwen", "glm", "kimi")

JOBS = {
    "base": ["python3", "-m", "harness.cli", "batch", "--agents",
             "model:qwen", "model:glm", "model:kimi", "--seeds", *SEEDS],
}
for m in CN:
    JOBS[f"m_{m}"] = ["python3", "-m", "harness.cli", "mandates",
                      "--agents", f"model:{m}", "--seeds", "1", "2"]

def nbase():
    return len(glob.glob("results/*__model_qwen__seed*")) \
         + len(glob.glob("results/*__model_glm__seed*")) \
         + len(glob.glob("results/*__model_kimi__seed*"))
def nmand(m=None):
    pat = f"results/*__model_{m}__mandate*" if m else "results/*__model_*__mandate*"
    g = glob.glob(pat)
    return len([x for x in g if any(f"__model_{c}__" in x for c in CN)]) if not m else len(glob.glob(pat))

def complete(name):
    if name == "base":
        return nbase() >= 120
    return nmand(name[2:]) >= 48

procs = {}
while True:
    if all(complete(n) for n in JOBS):
        print("ALL COMPLETE", flush=True); break
    for name, cmd in JOBS.items():
        p = procs.get(name)
        if complete(name):
            continue
        if p is None or p.poll() is not None:
            lf = open(f"results/sup_{name}.log", "a")
            procs[name] = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, env=ENV)
            print(f"launched {name} pid {procs[name].pid}", flush=True)
    time.sleep(15)
