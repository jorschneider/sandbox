# civ-arena — models playing each other, no humans

A toolkit for running **LLM vs. LLM** matches in a Civilization-style strategy
game, built on top of [CivAgent](https://github.com/asdqsczser/CivAgent)
(the LLM-plays-Unciv research project) and its bundled headless game engine.
Every civilization is driven by a model — different models can play each other —
and there are no human players and no Discord in the loop.

> Scope note: this lives in the "Death of Mao" site repo only because that's
> where the work was requested. It's self-contained under `civ-arena/` and has
> nothing to do with the website.

## How it works

CivAgent ships a **headless build of Unciv** (`resources/Unciv.jar`, a Civ V
remake) plus a Python layer that lets LLMs make diplomatic decisions. The pieces:

```
   models.yaml ──┐
                 ▼
  arena.py  ──► for each round:
                 1. each civ's MODEL proposes a diplomatic action
                 2. the TARGET civ's MODEL accepts/rejects        ← model-vs-model
                 3. accepted actions mutate the game save
                 4. Unciv.jar simulates N turns (war, tech, cities) ← real engine, headless
                 5. record every civ's strength
                 ▼
            scoreboard.csv  +  a declared winner
```

The engine runs **in-process via JPype** — no GUI, no game client, no Discord,
no external server. The LLM "players" negotiate, ally, betray, and declare war
on each other; the Unciv engine resolves the consequences.

## What's been verified vs. what needs your keys

| Piece | Status |
|---|---|
| Headless Unciv engine advances a real game | ✅ Verified (turns + per-civ strength, no keys) |
| Full pipeline: parse → rounds → engine → scoreboard → winner | ✅ Verified via `--dry-run` (no keys) |
| Applying diplomatic actions (declare war, ally, peace, …) to the save | ✅ Verified (engine accepts them, keeps running) |
| The actual LLM calls (live model-vs-model) | 🔑 Needs your API keys; prompts may want tuning |

Why `arena.py` exists at all: CivAgent's *shipped* self-play script
(`scripts/tasks/run_benchmark.py`) is **bit-rotted** — it calls
`workflow_utils.run_workflows_with_tools`, which the current "shorter workflow"
code comments out. `arena.py` targets the live primitive
(`civagent.workflow.reply`) instead, so it runs against the repo as published.

## Prerequisites

- **Java 17+** (runs `Unciv.jar`; tested on JDK 21)
- **Python 3.10+** (tested on 3.11)
- **Redis** (CivAgent instantiates a Redis client at import time — even headless)
- API keys for whichever providers you pit against each other

## Quick start

```sh
cd civ-arena
./setup.sh                       # clone CivAgent, venv, deps, redis, engine smoke test
source .venv/bin/activate

# 1) Prove the engine runs (no API keys needed):
CIVAGENT_DIR=./vendor/CivAgent python smoke_test.py

# 2) Dry-run a whole match — pipeline + scoreboard, still no keys:
CIVAGENT_DIR=./vendor/CivAgent python arena.py --dry-run --rounds 5

# 3) Live model-vs-model:
cp models.example.yaml models.yaml   # add API keys, assign a model per civ
CIVAGENT_DIR=./vendor/CivAgent python arena.py --rounds 8
```

Output: a per-turn `scoreboard.csv` and a printed winner (highest final
civilization strength).

## Configuring the match

Edit `models.yaml` (copy from `models.example.yaml`). Each civ in the save gets
a seat; assign any supported model string. **Different models per civ is the
whole point** — e.g. DeepSeek vs. Claude vs. a local model.

Model-string routing (decided by name in CivAgent's `CustomOllama.chat`):

| Model string | Provider | Needs |
|---|---|---|
| `gpt-4-1106-preview`, `gpt-3.5-turbo-1106` | OpenAI | `openai_api_key` |
| `deepseek-chat`, `deepseek-reasoner` | DeepSeek | `deepseek_api_key` |
| `mistral`, `llama3`, `gemma` | local Ollama | Ollama running |
| `claude-opus-4-8`, `claude-sonnet-4-6`, … | Anthropic | the patch below + `ANTHROPIC_API_KEY` |

### Adding Claude (recommended, optional)

Claude isn't routed out of the box. The clean way is the official Anthropic
SDK — see `patches/anthropic_llm_utils.py`, which is a drop-in adapter plus a
3-line routing change. (Avoid the tempting shortcut of pointing CivAgent's
`openai_base_url` at an OpenAI-compatible Anthropic endpoint; the official SDK
is the supported path.) Once patched, give any seat a `claude-*` model string.

## Tuning the match

- `--rounds N` — number of diplomacy+simulation rounds (default 5).
- `--turns-per-round N` — engine turns advanced per round (default 5). More
  turns per round = faster games, less frequent diplomacy.
- `--save PATH` — start from a different save. Two are bundled under
  `vendor/CivAgent/scripts/reproductions/` (`Autosave`, `Autosave-China-60`).

## Known limitations & gotchas

- **The bundled `Autosave` has only 3 major civs** (Aztecs, Egypt, Greece).
  CivAgent's six civs are china/mongolia/egypt/greece/rome/aztecs; which appear
  depends on the save. Seats for absent civs are ignored. To run all six you
  need a save that contains them.
- **Live diplomacy is best-effort.** Action *application* is verified, but a
  model returning malformed JSON, or proposing a parameter-heavy action, is
  logged and skipped so the game keeps advancing. Expect to iterate on the
  prompts in `arena.py` for your models.
- **Cost.** Every civ calls a model every round (plus a consent call per
  bilateral proposal). A long match with strong models adds up — start with
  few rounds and cheaper models, then scale.
- **Redis must be reachable** before importing CivAgent. `setup.sh` starts a
  local one; override with `REDIS_HOST` / `REDIS_PORT`.

## Files

| File | Purpose |
|---|---|
| `setup.sh` | Clone CivAgent, create venv, install pinned deps, start Redis, run smoke test |
| `requirements.txt` | Verified-working dependency pins (e.g. `llama-index==0.10.58`) |
| `smoke_test.py` | Advance the bundled save through the headless engine — no keys |
| `arena.py` | The model-vs-model runner (`--dry-run` and live) → scoreboard |
| `models.example.yaml` | Per-civ model assignment + provider keys (copy to `models.yaml`) |
| `patches/anthropic_llm_utils.py` | Optional Claude adapter (official Anthropic SDK) |

## Credits

Built on [CivAgent](https://github.com/asdqsczser/CivAgent) (NetEase Fuxi Lab;
"Digital Player", arXiv:2502.20807) and [Unciv](https://github.com/yairm210/Unciv).
