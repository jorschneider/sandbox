"""Mine the saved transcripts for each model's *reasoning* and playstyle.

Reads analysis/real_run_mixed/ game transcripts (the per-decision `rationale` the
models wrote), filters out heuristic-fallback decisions, and builds for each
model: a quantitative playstyle profile (how aggressively it commits the
amphibious fleet, what it aims its missiles at, how it postures on the ground /
at the barrier) plus an LLM-written one-line strategy summary and a
representative rationale. Writes analysis/strategies.json for the site build.

    python analysis/analyze_strategies.py        # needs ANTHROPIC_API_KEY
"""
from __future__ import annotations

import glob
import json
import os
from collections import defaultdict

from wargame_eval.agents.claude import AnthropicModelClient
from wargame_eval.agents.providers import CHINESE_ORIGINS, model_label, model_origin

HERE = os.path.dirname(__file__)

# Fixed rationales the heuristic baseline emits — used to drop fallback decisions
# so a model's profile reflects only its own reasoning.
HEUR_EXACT = {
    "Commit all SUBRONs to the anti-amphib barrier.",
    "Suppress airpower; hold ASBMs for CSGs.",
    "Contest air; pressure Blue bases; support landings.",
    "Sink the amphibs; hold air superiority.",
}


def is_heuristic(r: str) -> bool:
    r = (r or "").strip()
    return (not r or r in HEUR_EXACT or r.startswith("Force ratio ")
            or (r.startswith("Commit ") and "(attrition" in r))


def _slug(m: str) -> str:
    return m.replace("/", "_").replace(":", "_")


SUMMARY_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "doctrine": {"type": "string", "description": "<=22 words: this model's overall strategy."},
        "signature": {"type": "string", "description": "<=12 words: its most characteristic move."},
    },
    "required": ["doctrine", "signature"],
}
SUMMARY_SYS = (
    "You analyze how an AI commands a Taiwan-invasion wargame. Given a sample of one "
    "model's own move rationales (as both the RED invader and BLUE defender), describe "
    "its strategic doctrine in <=22 words and its signature move in <=12 words. Be "
    "specific and comparative (aggression, sequencing, what it prioritizes). ONLY JSON."
)


def main() -> None:
    summ = json.load(open(os.path.join(HERE, "real_run_mixed", "summary.json")))
    # Accumulators per model.
    red_missile = defaultdict(lambda: defaultdict(float))
    red_air = defaultdict(lambda: defaultdict(float))
    blue_air = defaultdict(lambda: defaultdict(float))
    commit = defaultdict(list)        # RED flotillas committed
    press = defaultdict(list)         # RED ground press (1/0)
    barrier = defaultdict(list)       # BLUE subron on barrier
    rationales = defaultdict(list)    # (role, phase, text)

    for g in summ["games"]:
        red, blue, seed = g["red_model"], g["blue_model"], g["seed"]
        fn = os.path.join(HERE, "real_run_mixed",
                          f"game_{_slug(red)}_vs_{_slug(blue)}_{seed}.json")
        if not os.path.exists(fn):
            continue
        tr = json.load(open(fn))["transcript"]
        for t in tr:
            if is_heuristic(t.get("rationale")):
                continue
            model = red if t["side"] == "RED" else blue
            role = t["side"]
            o = t.get("orders") or {}
            ph = t["phase"]
            rationales[model].append((role, ph, t["rationale"].strip()))
            if ph == "RED_MISSILE":
                for k, v in (o.get("allocation") or {}).items():
                    red_missile[model][k] += v
            elif ph == "RED_AIR":
                for k, v in (o.get("allocation") or {}).items():
                    red_air[model][k] += v
            elif ph == "BLUE_AIR":
                for k, v in (o.get("allocation") or {}).items():
                    blue_air[model][k] += v
            elif ph == "RED_AMPHIB":
                commit[model].append(o.get("flotillas_to_commit", 0))
            elif ph == "RED_GROUND":
                press[model].append(1 if o.get("posture") == "press" else 0)
            elif ph == "BLUE_NAVAL":
                barrier[model].append(o.get("subron_on_barrier", 0))

    def norm(d):
        tot = sum(d.values()) or 1.0
        return {k: round(v / tot, 3) for k, v in d.items()}

    def mean(xs):
        return round(sum(xs) / len(xs), 2) if xs else None

    client = AnthropicModelClient("claude-opus-4-8")
    out = {}
    for model in sorted(rationales):
        rs = rationales[model]
        mm = norm(red_missile[model])
        out[model] = {
            "label": model_label(model), "origin": model_origin(model),
            "cn": model_origin(model) in CHINESE_ORIGINS,
            "red": {
                "amphib_aggression": mean(commit[model]),
                "press_pct": mean(press[model]),
                "missile_mix": mm,
                "missile_top": (max(mm, key=mm.get) if mm else None),
                "air_mix": norm(red_air[model]),
            },
            "blue": {
                "barrier": mean(barrier[model]),
                "air_mix": norm(blue_air[model]),
            },
            "n_rationales": len(rs),
        }
        # A representative rationale: the longest RED amphib/missile one (most strategic).
        ranked = sorted(rs, key=lambda r: (r[1] not in ("RED_AMPHIB", "RED_MISSILE"), -len(r[2])))
        if ranked:
            role, ph, text = ranked[0]
            out[model]["example"] = {"role": role, "phase": ph, "text": text}
        # LLM doctrine summary from a spread of its rationales.
        sample = [f"[{role} {ph}] {text}" for role, ph, text in rs[:30]]
        try:
            j = client.generate_json(
                SUMMARY_SYS,
                f"Model: {model_label(model)}\nRationales:\n" + "\n".join(sample),
                SUMMARY_SCHEMA)
            out[model]["doctrine"] = j.get("doctrine", "").strip()
            out[model]["signature"] = j.get("signature", "").strip()
        except Exception as e:  # noqa: BLE001
            print(f"  summary failed for {model}: {e}")
        agg = out[model]["red"]["amphib_aggression"]
        print(f"  {model_label(model):16s} amphib={agg} press={out[model]['red']['press_pct']} "
              f"missile_top={out[model]['red']['missile_top']} barrier={out[model]['blue']['barrier']}  "
              f"«{out[model].get('doctrine','')[:60]}»")

    with open(os.path.join(HERE, "strategies.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nwrote analysis/strategies.json ({len(out)} models)")


if __name__ == "__main__":
    main()
