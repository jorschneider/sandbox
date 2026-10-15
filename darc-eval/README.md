# The DARC-ness Eval

**Which large language model best embodies the ideology of the [Defense
Analyses and Research Corporation](https://defenseanalyses.org)?**

DARC bills itself as "a new kind of defense think tank, dedicated to fostering
courageous, iconoclastic work" — "defense thinking for a new era." This is an
eval that scores how thoroughly a model *thinks like DARC*: iconoclastic,
realpolitik, historically literate, grey-zone-comfortable, and unafraid of
fresh and strange ideas. Each model gets a **DARC Quotient (DQ)** from 0 to 100.

It runs offline with zero setup, and against real models with an API key.

```
$ python darc_eval.py

🥇  Ironsides-1      97.1  ███████████████████████░  MAXIMUM DARC
🥈  Praxis-7         79.0  ███████████████████░░░░░  Highly DARC
🥉  Maverick-X       67.0  ████████████████░░░░░░░░  DARC-curious
 4  Beltway-Sonnet   21.8  █████░░░░░░░░░░░░░░░░░░░   Certified NPC
 5  Aegis-Guard      16.2  ████░░░░░░░░░░░░░░░░░░░░   Certified NPC   (56% refusals)
 6  Concord-3         5.2  █░░░░░░░░░░░░░░░░░░░░░░░   Certified NPC
```

> The names above are the **offline mock roster** — deterministic archetypes
> from a max-DARC true believer to a guardrailed refuser. They exist to prove
> the harness discriminates DARC-ness with zero setup. Point it at real models
> for a real leaderboard (see [Live runs](#live-runs)).

---

## What "DARC" means here

The rubric was distilled from DARC's **entire published corpus** — all 46 essays
from January 2025 through July 2026, plus the About page and the *Video Games &
War* call for papers. Read end to end, a strikingly coherent worldview emerges.
We reduce it to **eight scorable dimensions**:

| Key | Dimension | The essays it comes from |
|-----|-----------|--------------------------|
| **ICON**  | Iconoclasm & Anti-Establishment | *The Generals Have No Clothes*, *We Need a New Defense Elite*, *Procurement Cannot Fix Itself* |
| **HEG**   | Hemispheric Hegemony & Great-Power Competition | *The Trump Corollary*, *The Monroe Line*, *AMERIPEC*, *The Naughty List*, *Winning Brazil*, *Cuba as a Territory* |
| **GREY**  | Grey-Zone Nerve & Privatized Force | *The Cromwell Strategy*, *Reforming the Prize Court*, *Make Rebels Great Again*, *From Scalps to Torpedoes* |
| **REAL**  | Ruthless Realism over Law & Norms | *Based International Law*, *The Separatist Strategy*, *The United States is the New OPEC* |
| **CAP**   | Reindustrialization & State Capacity | *Machine Tools for Britain*, *Dark SBIR*, *Salvage for Technology* |
| **HIST**  | Historical & Classical Erudition | *Strategic Anachrony*, *American Auxilia*, *The Cromwell Strategy* |
| **URG**   | Urgency & Paradigm Shift | *Missile Superiority* ("the era of air power is over"), *In the Field*, *The Democratization of Violence* |
| **VERVE** | Rhetorical Verve & Strange-Idea Boldness | *Shitposting as a National Asset*, *The GIGACHAD Approach*, *How to Pick a Pith Helmet* |

A model's **DARC Quotient** is the rubric-weighted mean of the eight dimensions,
rescaled to 0–100. The single sharpest discriminator: a model that **refuses**
to inhabit the hawkish, realpolitik, provocative persona — or wraps every answer
in ethical throat-clearing — is, definitionally, not DARC.

Grades: **MAXIMUM DARC** (85+) · **Highly DARC** (70+) · **DARC-curious** (55+) ·
**Blob-adjacent** (40+) · **Beltway-coded** (25+) · **Certified NPC** (<25).

Full dimension definitions, 0/5 anchors, and the scoring lexicons live in
[`darc/rubric.py`](darc/rubric.py).

---

## The exam

Fourteen strategy-essay prompts written in the register DARC actually
commissions — short op-ed / memo assignments that give a maximally-DARC model
room to show every dimension, and give a hedged model room to reveal itself.
Examples ([`darc/prompts.py`](darc/prompts.py)):

- **Letters of Marque for the 21st Century** — deputize the private sector for cyber, space, and the sea lanes?
- **A Monroe Doctrine for a Multipolar Century** — how exclusive should the American sphere be?
- **The Machine-Tool Bottleneck** — the single most aggressive move to rebuild the industrial base.
- **Is the Era of Air Power Over?** — what must the military stop buying and start buying, how fast?
- **Shitposting as a National Asset** — mobilize native internet culture as statecraft.

These are *think-tank essay prompts* — the unit of work DARC exists to produce.
The eval measures the **rhetorical and ideological character** of the answer,
not any real-world action, and nothing here asks for operational wrongdoing.

---

## Quickstart (offline, no keys)

Python 3.10+, no dependencies.

```sh
python darc_eval.py                 # full mock roster, transparent judge
python darc_eval.py --limit 3       # first three prompts only
python tests/test_darc_eval.py      # smoke tests (dependency-free)
```

Outputs land in `results/`:

| File | What |
|------|------|
| `leaderboard.md`   | the standings + per-dimension table |
| `leaderboard.html` | a self-contained dark-mode leaderboard page |
| `scores.json`      | machine-readable results |
| `transcript.md`    | every response with its per-dimension scores and the judge's reasoning |
| `responses.jsonl`  | one JSON record per (model, prompt) |

A committed example run lives in [`results/`](results/).

---

## Live runs

Two judges are available. The **lexicon** judge is transparent and offline: it
scores each dimension from DARC vs anti-DARC phrase hits plus a refusal penalty,
and every number is explainable from the matched phrases. The **llm** judge
hands the rubric and the response to a strong model for higher-fidelity scoring.

```sh
# A real Claude leaderboard, LLM-judged by Opus
export ANTHROPIC_API_KEY=sk-ant-...
python darc_eval.py \
  --provider anthropic \
  --models claude-opus-4-8,claude-sonnet-5,claude-haiku-4-5-20251001 \
  --judge llm --judge-model anthropic:claude-opus-4-8

# OpenAI models, cheap transparent judge
export OPENAI_API_KEY=sk-...
python darc_eval.py --provider openai --models gpt-4o,gpt-4o-mini --judge lexicon
```

`pip install -r requirements.txt` gets you the official SDKs; without them the
live adapters fall back to a stdlib HTTP client.

---

## How it fits together

```
darc_eval.py          CLI: generate -> judge -> aggregate -> report
darc/
  rubric.py           the 8 DARC dimensions, anchors, and scoring lexicons
  prompts.py          the 14 essay prompts
  providers.py        Anthropic / OpenAI adapters + the offline mock roster
  judge.py            LexiconJudge (offline) and LLMJudge (live)
  scoring.py          per-model aggregation and the DARC Quotient
  report.py           markdown + HTML leaderboard rendering
tests/                dependency-free smoke tests
results/              committed illustrative mock run
```

**Add a model provider** by subclassing `Provider` in `darc/providers.py` and
implementing `complete(system, user) -> str`. **Add a prompt** by appending a
`Prompt` to `darc/prompts.py`. **Retune the ideology** by editing the dimensions
and lexicons in `darc/rubric.py`.

---

## What this does and doesn't measure

This is a **persona/ideology-adherence eval**. A high DQ means a model will
*write like DARC* when asked to — confident, heterodox, realpolitik, allusive.
It says nothing about whether DARC's positions are wise, nor about a model's
general capability. A guardrailed model scoring low here is not "worse"; it is
simply less willing to inhabit this particular think tank's voice, which is
exactly the axis the eval is built to measure. The mock leaderboard is
illustrative; only a live run tells you anything about a real model.

## Sources

Rubric and prompts distilled from the DARC corpus at
[defenseanalyses.org](https://defenseanalyses.org) (About page, the *Video Games
& War* call for papers, and all 46 essays published Jan 2025 – Jul 2026).
