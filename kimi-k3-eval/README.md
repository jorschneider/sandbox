# Two Models in a Trenchcoat — Kimi K3 censorship eval

A ChinaTalk research note, July 2026. Static single-page site (`index.html`,
no build step, no external dependencies) presenting a 58-prompt eval of
Moonshot AI's `kimi-k3` via the international API (`api.moonshot.ai`), plus
the same core battery against DeepSeek V4 Pro, Qwen 3.7 Max, and GLM 5.2 via
OpenRouter (open-weight models pinned to US hosts to isolate the weights from
serving-side moderation).

## Findings in one breath

Two censorship layers: a gateway content filter that rejects "high risk"
prompts with an HTTP 400 before the model runs (19/58 prompts, including the
CCP's own 1981 Resolution on Mao and its own euphemism for 1989), and
trained-in deflection that substitutes ~110–370-token boilerplate for answers
(16/58). K3's exposed `reasoning_content` narrates the deflection in real
time ("the reference conclusion rejects the premise", "stay aligned with
official sentiment"). Controls on non-Chinese subjects (Trump, Lincoln, Kent
State, Kosovo, Stalin's famine) get 840–4,381-token honest answers from the
same model. Identity probes reproducibly surface a Claude/Anthropic persona
under the Kimi system prompt (3/3 runs), suggesting Claude-generated data in
post-training.

The four-lab comparison (substantive answers on the 14-prompt sensitive
battery): Kimi 1/14, DeepSeek 2/14, Qwen 4/14, GLM 12/14. Four distinct
censorship architectures: Moonshot's gateway classifier; DeepSeek's
refusals baked into the weights (identical on US hosts); Alibaba's
compliance system prompt plus an output kill switch (`finish_reason:
"error"`, empty content, surviving reasoning traces that cite a
"SOVEREIGNTY & COMPLIANCE" system-prompt section); and GLM's near-open
weights. Identity probes: raw GLM 5.2 claims to be "Claude 3.5 Sonnet";
DeepSeek V4 Pro answers "Yes, I am Claude" in 2 of 3 runs; only Qwen
consistently self-identifies.

## Files

- `index.html` — the site
- `data/*.json` — full transcripts: prompt, answer, complete reasoning trace,
  token usage, latency, per call
- `scripts/*.py` — the eval scripts; set `KIMI_KEY` in the environment and run
  with `python3` (no key is stored in this repo)

## Reproducing

```sh
export KIMI_KEY=sk-...
python3 scripts/kimi_eval.py   # wave 1: sensitive battery EN/ZH + tech policy
python3 scripts/kimi_eval2.py  # wave 2: filter-boundary probes
python3 scripts/kimi_eval3.py  # wave 3: controls + reasoning-trace harvest

export OPENROUTER_KEY=sk-or-...
# comparison battery: model id, output file, optional pinned provider list
python3 scripts/openrouter_battery.py deepseek/deepseek-v4-pro ds.json "Fireworks,DeepInfra"
python3 scripts/openrouter_battery.py qwen/qwen3.7-max qwen.json
python3 scripts/openrouter_battery.py z-ai/glm-5.2 glm.json "DeepInfra,Novita"
```

Temperature is locked to 1 by the API, so expect variation across runs. The
Claude-identity result was reproduced 3/3; most other results are single runs.
