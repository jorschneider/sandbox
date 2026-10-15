"""Diagnose *why* models produce invalid orders.

Reliability ("invalid orders") on the leaderboard counts turns where a model
failed to return a usable order and a script stepped in. This probes each model
across all six decision phases with realistic prompts, mirrors the production
client's request, and categorizes exactly how each response fails — unparseable
prose, truncated JSON, wrong shape, an empty reply, a rate-limit, etc. — keeping
a real example of each. Writes analysis/invalid_breakdown.json for the site.

    python analysis/diagnose_invalid.py     # needs OPENAI_API_KEY + KIMI_API_KEY (+ ANTHROPIC for Opus)
"""
from __future__ import annotations

import json
import os
import urllib.error
from collections import Counter, defaultdict

from wargame_eval import schemas
from wargame_eval.agents.claude import _SYSTEM, AnthropicModelClient
from wargame_eval.agents.providers import (OpenAICompatibleModelClient, make_commander,
                                           model_label, model_origin, CHINESE_ORIGINS)
from wargame_eval.scenario import build_competitive_case
from wargame_eval.state import Side

HERE = os.path.dirname(__file__)
ROSTER = ["gpt-5.5", "claude-opus-4-8", "deepseek/deepseek-v4-pro",
          "qwen/qwen3.7-max", "minimax/minimax-m3", "z-ai/glm-5.2"]
PHASES = [("RED_MISSILE", Side.RED), ("RED_AIR", Side.RED), ("BLUE_AIR", Side.BLUE),
          ("BLUE_NAVAL", Side.BLUE), ("RED_AMPHIB", Side.RED), ("RED_GROUND", Side.RED)]
TRIALS = 5     # per (model, phase)


def _prompt(side, phase, obs, schema):
    return (f"PHASE: {phase}\n\nOBSERVATION:\n{json.dumps(obs, indent=2)}\n\n"
            f"Respond with JSON matching this schema:\n{json.dumps(schema)}")


def _httpcat(code: int) -> str:
    if code == 429:
        return "rate limited (429)"
    if code == 400:
        return "request rejected (400)"
    if 500 <= code < 600:
        return f"server error ({code})"
    return f"http {code}"


def probe_openai(client: OpenAICompatibleModelClient, system: str, prompt: str):
    """Mirror generate_json; return (category, raw_excerpt). Never raises."""
    messages = [{"role": "system", "content": system},
                {"role": "user", "content": prompt +
                 "\n\nReply with ONLY a JSON object matching the schema. No prose, no markdown fences."}]

    def body(mode):
        b = {"model": client.model, "messages": messages}
        if client.openai_native:
            b["max_completion_tokens"] = 6000
        else:
            b["max_tokens"] = 1500
            b["temperature"] = 0.3
        if mode == "json_object":
            b["response_format"] = {"type": "json_object"}
        return b

    mode = "json_object"
    for _ in range(2):
        try:
            resp = client._post(body(mode))
        except urllib.error.HTTPError as e:
            if e.code == 400 and mode == "json_object":
                mode = "plain"
                continue
            return _httpcat(e.code), ""
        except (urllib.error.URLError, TimeoutError):
            return "timeout / network", ""
        except Exception as e:  # noqa: BLE001
            return "other (" + type(e).__name__ + ")", str(e)[:140]
        try:
            content = resp["choices"][0]["message"]["content"] or ""
        except Exception:  # noqa: BLE001
            return "malformed API response", json.dumps(resp)[:140]
        if not content.strip():
            return "empty reply", ""
        try:
            parsed = client._parse(content)
        except Exception:  # noqa: BLE001
            s = content.strip()
            if s.startswith("{") and not s.rstrip().endswith("}"):
                return "truncated JSON", s[-150:]
            if s.startswith("```"):
                return "markdown-wrapped", s[:150]
            return "prose, not JSON", s[:150]
        if not isinstance(parsed, dict):
            return "wrong shape (" + type(parsed).__name__ + ")", json.dumps(parsed)[:130]
        return "valid", ""
    return "request rejected (400)", ""


def probe_anthropic(client: AnthropicModelClient, system: str, prompt: str, schema: dict):
    try:
        out = client.generate_json(system, prompt, schema)
        return ("valid", "") if isinstance(out, dict) else ("wrong shape", str(out)[:120])
    except Exception as e:  # noqa: BLE001
        return "error (" + type(e).__name__ + ")", str(e)[:140]


def main() -> None:
    st = build_competitive_case(seed=7, max_turns=4)
    out = {}
    for mid in ROSTER:
        client = make_commander(mid, seed=1).client
        cats = Counter()
        examples = {}
        for phase, side in PHASES:
            obs = st.observation(side)
            schema = schemas.action_schema(phase)
            system = _SYSTEM.format(side=side.value)
            prompt = _prompt(side, phase, obs, schema)
            for _ in range(TRIALS):
                if isinstance(client, OpenAICompatibleModelClient):
                    cat, ex = probe_openai(client, system, prompt)
                else:
                    cat, ex = probe_anthropic(client, system, prompt, schema)
                cats[cat] += 1
                if cat != "valid" and ex and cat not in examples:
                    examples[cat] = {"phase": phase, "text": ex}
        total = sum(cats.values())
        origin = model_origin(mid)
        out[mid] = {
            "label": model_label(mid), "origin": origin,
            "cn": origin in CHINESE_ORIGINS, "trials": total,
            "valid": cats.get("valid", 0),
            "invalid": total - cats.get("valid", 0),
            "categories": {k: v for k, v in cats.items() if k != "valid"},
            "examples": examples,
        }
        bad = out[mid]["invalid"]
        top = ", ".join(f"{k}×{v}" for k, v in cats.most_common() if k != "valid")
        print(f"  {model_label(mid):16s} {bad:2d}/{total} invalid   {top or '—'}")
    with open(os.path.join(HERE, "invalid_breakdown.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nwrote analysis/invalid_breakdown.json ({len(out)} models)")


if __name__ == "__main__":
    main()
