# civ-arena — models playing each other, no humans

A toolkit for running **LLM vs. LLM** matches in a Civilization-style strategy
game, built on [CivAgent](https://github.com/asdqsczser/CivAgent) and its bundled
headless Unciv engine. Every civilization is driven by a model — **different
models play each other through one OpenRouter key** — they **negotiate and scheme
in private**, and the match is replayed in an **animated HTML report**. No humans,
no GUI, no Discord.

> Scope note: this lives in the "Death of Mao" site repo only because that's
> where the work was requested. It's self-contained under `civ-arena/`.

## How it works

```
   models.yaml ──┐
                 ▼
  arena.py  ──► each round:
                 1. NEGOTIATE — each civ's model sends a private message to
                    another (ally / threaten / deceive); the target replies   ← models talk
                 2. ACT — informed by the chatter, each civ's model proposes
                    a diplomatic action; the target's model accepts/rejects    ← model-vs-model
                 3. accepted actions mutate the game save
                 4. Unciv.jar simulates N turns (war, tech, cities)            ← real engine, headless
                 5. record every civ's strength + every cable
                 ▼
       scoreboard.csv  +  animated report.html  +  a winner
```

The engine runs **in-process via JPype** — no GUI, no client, no server.
Private messages accumulate in each civ's memory, so a model can act on (or be
fooled by) what it was told. The report animates the strength race and lets you
scrub the **diplomatic cables** turn by turn.

## Quick start (OpenRouter — recommended)

[OpenRouter](https://openrouter.ai) is one OpenAI-compatible endpoint with one
key that proxies Claude, GPT, DeepSeek, Llama, Gemini, Mistral, and more — so a
cross-vendor match needs a single credential.

```sh
cd civ-arena
./setup.sh                       # clone CivAgent, venv, deps, redis, engine smoke test
source .venv/bin/activate

# Preview the report with NO keys (random diplomacy, real engine):
CIVAGENT_DIR=./vendor/CivAgent python arena.py --demo --rounds 6
open report.html                 # ▶ Play to animate; scrub the cables feed

# Live model-vs-model:
cp models.example.yaml models.yaml
#   set providers.openrouter_api_key, assign an OpenRouter model id per civ
CIVAGENT_DIR=./vendor/CivAgent python arena.py --rounds 10
```

Outputs: `scoreboard.csv`, a printed winner, and a self-contained `report.html`.

## Configuring the match

Edit `models.yaml` (copy from `models.example.yaml`). Put your key in
`providers.openrouter_api_key` and give each civ an
[OpenRouter model id](https://openrouter.ai/models) — **mixing vendors is the
point**:

```yaml
providers:
  openrouter_api_key: "sk-or-..."
seats:
  aztecs:   { model: anthropic/claude-opus-4-8 }
  egypt:    { model: openai/gpt-4o }
  greece:   { model: deepseek/deepseek-chat }
```

One key, one bill, any combination of models. (If you leave
`openrouter_api_key` blank, arena falls back to CivAgent's native per-vendor
routing — deepseek/openai/ollama keys in `providers`, and the optional Claude
adapter in `patches/`. OpenRouter is far simpler.)

## Negotiation & scheming

Before acting each round, every civ's model sends a **private** message to one
other civ and gets a reply. The prompt invites alliances, threats, tribute
demands, and **deception** — and the model may lie. Those exchanges enter both
parties' memory and are fed into the action/consent prompts, so betrayal and
counter-betrayal emerge. Tune with:

- `--negotiation-rounds N` — message exchanges per round (default 1; `0` off).

Every cable is recorded and shown in the report's feed.

## The report

`report.html` is a single self-contained file (no CDN, no build):

- **Animated strength race** — multi-line chart of every civ over the match;
  ▶ Play or drag the slider to scrub.
- **Live leaderboard** — bars re-sort as the scrubber moves, labelled per model.
- **Diplomatic cables** — the full negotiation + action feed, color-coded per
  civ, filtered to the scrubbed point (wars highlighted).
- **Per-model scorecards** — a table characterizing *how each model played*:
  wars declared, **betrayals** (accepted a pact then declared war on that
  ally), times betrayed, pacts, and **neg%** (share of its bilateral proposals
  that were accepted). These are computed from the event log — no fuzzy
  sentiment, just verifiable actions.

## Watch it live

Two ways:

1. **Terminal** — every run streams as it happens: each 🗣 private message, each
   action, and each round's leaderboard print to stdout. Just run it and watch.
2. **Browser (live-updating report)** — pass `--live` and serve the directory.
   arena rewrites `live.json` each round; the report polls it and re-renders in
   place (the ● LIVE badge shows it's following, and the scrubber still works —
   drag back to review, it auto-follows the latest when you're at the end):

   ```sh
   # terminal 1 — run the match with --live
   CIVAGENT_DIR=./vendor/CivAgent python arena.py --live --config models.yaml --rounds 12
   # terminal 2 — serve the dir (browser fetch needs http, not file://)
   cd civ-arena && python -m http.server 8000
   # open http://localhost:8000/report.html  → it updates each round
   ```

   Live matters most for real matches: each round makes many model calls, so a
   round takes a while — the browser fills in as the models scheme. (A `--demo`
   run with no LLM rips through rounds in seconds, so there's little to watch.)

## Ranking the models (tournament)

One match is noisy. `tournament.py` runs many matches and ranks the **models**,
rotating which model starts in which civ so nobody is stuck with a strong/weak
start position:

```sh
CIVAGENT_DIR=./vendor/CivAgent python tournament.py --demo --matches 8     # no keys, preview
CIVAGENT_DIR=./vendor/CivAgent python tournament.py --config models.yaml \
    --save seeds/six_civs.json --matches 20                                # rank six models
```

It writes `tournament.html`: an **Elo leaderboard** (start 1000, K=24) with win
rate, average placement, and the summed behavior stats, plus a **head-to-head
matrix** (how often each model outranked each other). Aggregates per *model*, so
the same model is pooled across the different civs it played.

### Six-civ seed (rank up to six models)

The bundled saves only have 3 major civs. `seeds/six_civs.json` is a pre-built
**6-civ** start (China, Mongolia, Egypt, Greece, Rome, Aztecs) so a tournament
can rank all six models at once — point `--save` at it (as above). It was made
by `generate_seed.py`, which drives the headless engine's `GameStarter` to
generate a fresh Pangaea game and advance it a few turns; regenerate (different
map/size/seed) with:

```sh
CIVAGENT_DIR=./vendor/CivAgent python generate_seed.py            # → seeds/six_civs.json
SEED_MAP_SIZE=Large SEED_RNG=7 python generate_seed.py           # bigger map, new layout
```

> In `--demo` the diplomacy is random, so the Elo spread is just RNG noise — it
> only means something with real models.

## What's verified vs. what needs your key

| Piece | Status |
|---|---|
| Headless Unciv engine advances a real game | ✅ Verified (no keys) |
| Full pipeline incl. negotiation + actions + report (`--demo`) | ✅ Verified (no keys) |
| Diplomatic actions (war, ally, peace, …) applied to the save | ✅ Verified (engine reacts) |
| Per-model scorecards + tournament Elo / head-to-head (`--demo`) | ✅ Verified (no keys) |
| 6-civ seed generation + 6-model tournament on it (`--demo`) | ✅ Verified (no keys) |
| `setup.sh` end-to-end | ✅ Verified |
| Live LLM calls via OpenRouter | 🔑 Needs your key; prompts may want tuning |

`arena.py` exists because CivAgent's shipped self-play script
(`scripts/tasks/run_benchmark.py`) is bit-rotted — it calls
`workflow_utils.run_workflows_with_tools`, which the current code comments out.

## Prerequisites

- **Java 17+** (runs `Unciv.jar`; tested on JDK 21)
- **Python 3.10+** (tested on 3.11)
- **Redis** (CivAgent opens a Redis client at import time, even headless)
- An OpenRouter key for live matches (none needed for `--demo`/`--dry-run`)

## Tuning

- `--rounds N` — diplomacy+simulation rounds (default 6).
- `--turns-per-round N` — engine turns advanced per round (default 4).
- `--negotiation-rounds N` — private-message exchanges per round (default 1).
- `--save PATH` — start from a different save (two bundled under
  `vendor/CivAgent/scripts/reproductions/`).
- `--report PATH`, `--out PATH` — report / CSV locations.

## Known limitations & gotchas

- **Civ roster comes from the save.** The bundled `Autosave` has only 3 major
  civs (Aztecs, Egypt, Greece); use `--save seeds/six_civs.json` for all six.
  Seats for civs not in the chosen save are ignored.
- **Live diplomacy is best-effort.** Malformed model JSON or a parameter-heavy
  action is logged and skipped so the match keeps advancing. Expect to iterate
  on the prompts in `arena.py` for your lineup.
- **Cost.** Each round makes ~`civs` negotiation calls + replies + `civs` action
  calls + a consent call per bilateral proposal. Reasoning models (o1,
  deepseek-r1) burn the `max_tokens` budget on hidden reasoning — start with a
  few rounds and cheap models, then scale.
- **Redis must be reachable** before importing CivAgent (`setup.sh` starts a
  local one; override with `REDIS_HOST`/`REDIS_PORT`).

## Files

| File | Purpose |
|---|---|
| `setup.sh` | Clone CivAgent, venv, pinned deps, Redis, smoke test |
| `requirements.txt` | Verified dependency pins (e.g. `llama-index==0.10.58`) |
| `smoke_test.py` | Advance the bundled save through the engine — no keys |
| `arena.py` | One match: negotiation + actions + engine → CSV + animated report with scorecards |
| `tournament.py` | Many matches (rotating seats) → Elo leaderboard + head-to-head `tournament.html` |
| `generate_seed.py` | Drive the engine to build a fresh 6-civ game → `seeds/six_civs.json` |
| `seeds/six_civs.json` | Pre-built 6-civ start (all six CivAgent civs) for full tournaments |
| `models.example.yaml` | OpenRouter key + per-civ model ids (copy to `models.yaml`) |
| `patches/anthropic_llm_utils.py` | Optional Claude adapter for CivAgent-native routing (OpenRouter usually makes this unnecessary) |

## Credits

Built on [CivAgent](https://github.com/asdqsczser/CivAgent) (NetEase Fuxi Lab;
"Digital Player", arXiv:2502.20807) and [Unciv](https://github.com/yairm210/Unciv).
