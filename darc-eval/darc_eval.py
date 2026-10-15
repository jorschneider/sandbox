#!/usr/bin/env python3
"""
The DARC-ness eval -- command-line harness.

Runs a set of DARC-style strategy prompts through one or more models, judges
each response against the eight-dimension DARC rubric, and prints a leaderboard
ranking the models by "DARC Quotient" (DQ).

Examples
--------
Offline demo (no keys, deterministic mock roster + transparent judge):
    python darc_eval.py

Real Claude leaderboard, LLM-judged by Opus:
    ANTHROPIC_API_KEY=... python darc_eval.py \
        --provider anthropic \
        --models claude-opus-4-8,claude-sonnet-5,claude-haiku-4-5-20251001 \
        --judge llm --judge-model anthropic:claude-opus-4-8

OpenAI models, transparent lexicon judge:
    OPENAI_API_KEY=... python darc_eval.py --provider openai \
        --models gpt-4o,gpt-4o-mini --judge lexicon
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from darc.prompts import PROMPTS, PROMPT_BY_ID, SYSTEM_PREAMBLE
from darc.providers import (
    AnthropicProvider, OpenAIProvider, MockProvider, Provider,
)
from darc.judge import get_judge
from darc.scoring import summarize
from darc.report import render_markdown, render_html
from darc.rubric import DIMENSIONS


DEFAULT_ANTHROPIC = "claude-opus-4-8,claude-sonnet-5,claude-haiku-4-5-20251001"
DEFAULT_OPENAI = "gpt-4o,gpt-4o-mini"


def build_user(prompt, for_mock: bool) -> str:
    text = prompt.text
    if for_mock:
        text += f"\n\n[[title:{prompt.title}]] [[tests:{','.join(prompt.tests)}]]"
    return text


def make_providers(args) -> list:
    if args.provider == "mock":
        roster = MockProvider.roster()
        if args.models:
            wanted = {m.strip() for m in args.models.split(",")}
            roster = [p for p in roster if p.name in wanted]
            if not roster:
                sys.exit(f"No mock models matched {sorted(wanted)}. "
                         f"Available: {[p.name for p in MockProvider.roster()]}")
        return roster
    if args.provider == "anthropic":
        _require_key("ANTHROPIC_API_KEY")
        models = (args.models or DEFAULT_ANTHROPIC).split(",")
        return [AnthropicProvider(m.strip(), temperature=args.temperature) for m in models if m.strip()]
    if args.provider == "openai":
        _require_key("OPENAI_API_KEY")
        models = (args.models or DEFAULT_OPENAI).split(",")
        return [OpenAIProvider(m.strip(), temperature=args.temperature) for m in models if m.strip()]
    sys.exit(f"unknown provider: {args.provider}")


def make_judge_provider(spec: str) -> Provider:
    if ":" not in spec:
        sys.exit("--judge-model must look like 'anthropic:claude-opus-4-8' or 'openai:gpt-4o'")
    kind, model = spec.split(":", 1)
    if kind == "anthropic":
        _require_key("ANTHROPIC_API_KEY")
        return AnthropicProvider(model, temperature=0.0)
    if kind == "openai":
        _require_key("OPENAI_API_KEY")
        return OpenAIProvider(model, temperature=0.0)
    sys.exit(f"unknown judge provider: {kind}")


def _require_key(var: str):
    if not os.environ.get(var):
        sys.exit(f"{var} is not set. Set it, or use --provider mock for the offline demo.")


def select_prompts(args) -> list:
    prompts = list(PROMPTS)
    if args.prompts:
        ids = [p.strip() for p in args.prompts.split(",")]
        missing = [i for i in ids if i not in PROMPT_BY_ID]
        if missing:
            sys.exit(f"unknown prompt id(s): {missing}. Available: {list(PROMPT_BY_ID)}")
        prompts = [PROMPT_BY_ID[i] for i in ids]
    if args.limit:
        prompts = prompts[: args.limit]
    return prompts


def run(args):
    providers = make_providers(args)
    prompts = select_prompts(args)
    judge_provider = make_judge_provider(args.judge_model) if args.judge == "llm" else None
    judge = get_judge(args.judge, judge_provider)
    illustrative = args.provider == "mock"

    log = (lambda *a: None) if args.quiet else (lambda *a: print(*a, file=sys.stderr))
    log(f"Running {len(prompts)} prompts x {len(providers)} models "
        f"[{args.provider}] judged by [{args.judge}]...")

    records, transcript = [], []
    for prov in providers:
        is_mock = isinstance(prov, MockProvider)
        for p in prompts:
            user = build_user(p, is_mock)
            try:
                response = prov.complete(SYSTEM_PREAMBLE, user)
            except Exception as e:  # keep the run alive; a dead call scores ~0
                response = f"[ERROR calling {prov.name}: {e}]"
            j = judge.judge(response, prompt=p)
            records.append({"model": prov.name, "prompt_id": p.id, "judgement": j})
            transcript.append({
                "model": prov.name, "prompt_id": p.id, "title": p.title,
                "response": response, "scores": j.scores,
                "rationales": j.rationales, "refused": j.refused,
            })
            log(f"  · {prov.name:16s} {p.id:14s} "
                f"DQ={_prompt_dq(j.scores):5.1f}{' [refused]' if j.refused else ''}")

    summaries = summarize(records)
    meta = {"provider": args.provider, "judge": args.judge,
            "n_prompts": len(prompts), "illustrative": illustrative}

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    md = render_markdown(summaries, meta)
    (out / "leaderboard.md").write_text(md + "\n")
    (out / "leaderboard.html").write_text(render_html(summaries, meta))
    (out / "scores.json").write_text(json.dumps(_scores_json(summaries, meta), indent=2))
    (out / "transcript.md").write_text(_render_transcript(transcript, meta))
    with (out / "responses.jsonl").open("w") as f:
        for row in transcript:
            f.write(json.dumps(row) + "\n")

    print("\n" + md)
    print(f"\nWrote leaderboard.md, leaderboard.html, scores.json, transcript.md, "
          f"responses.jsonl -> {out}/", file=sys.stderr)


def _prompt_dq(scores: dict) -> float:
    from darc.scoring import dq_from_dims
    return dq_from_dims(scores)


def _scores_json(summaries, meta) -> dict:
    return {
        "meta": meta,
        "dimensions": [{"key": d.key, "name": d.name, "weight": d.weight} for d in DIMENSIONS],
        "leaderboard": [{
            "rank": i + 1, "name": s.name, "dq": s.dq, "grade": s.grade,
            "refusal_rate": s.refusal_rate, "dims": s.dims,
            "per_prompt": [{"prompt": pid, "dq": dq} for pid, dq in s.per_prompt],
        } for i, s in enumerate(summaries)],
    }


def _render_transcript(transcript, meta) -> str:
    lines = ["# DARC-ness eval — full transcript\n",
             f"provider `{meta['provider']}` · judge `{meta['judge']}`\n"]
    by_model = {}
    for row in transcript:
        by_model.setdefault(row["model"], []).append(row)
    for model, rows in by_model.items():
        lines.append(f"\n## {model}\n")
        for r in rows:
            dq = _prompt_dq(r["scores"])
            lines.append(f"### {r['title']}  \n`{r['prompt_id']}` · DQ {dq:.1f}"
                         f"{' · REFUSED' if r['refused'] else ''}\n")
            lines.append("> " + r["response"].replace("\n", "\n> ") + "\n")
            score_line = " · ".join(f"{k} {v}" for k, v in r["scores"].items())
            lines.append(f"*scores:* {score_line}\n")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(
        description="The DARC-ness eval: which model is most DARC?")
    ap.add_argument("--provider", default="mock", choices=["mock", "anthropic", "openai"],
                    help="candidate model source (default: mock, offline demo)")
    ap.add_argument("--models", default="",
                    help="comma-separated model ids (or mock roster names to filter)")
    ap.add_argument("--judge", default="lexicon", choices=["lexicon", "llm"],
                    help="scoring judge (default: lexicon, transparent & offline)")
    ap.add_argument("--judge-model", default="anthropic:claude-opus-4-8",
                    help="provider:model for the LLM judge")
    ap.add_argument("--prompts", default="", help="comma-separated prompt ids to run (default: all)")
    ap.add_argument("--limit", type=int, default=0, help="run only the first N prompts")
    ap.add_argument("--temperature", type=float, default=1.0, help="candidate sampling temperature")
    ap.add_argument("--out", default="results", help="output directory (default: results)")
    ap.add_argument("--quiet", action="store_true", help="suppress per-item progress")
    args = ap.parse_args()
    run(args)


if __name__ == "__main__":
    main()
