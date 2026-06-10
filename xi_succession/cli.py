"""Command-line interface for the Xi succession scenario toolkit.

Run `xi-succession --help` (or `python -m xi_succession --help`) for usage.
Every command works non-interactively for scripting; `new` and `iw` also
offer guided interactive modes for workshop use.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from . import __version__, data, indicators, matrix, probability, report
from .models import Assumption, Scenario, ScenarioSet


def _out(text: str, path: str | None) -> None:
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {path}")
    else:
        print(text)


# ---------------------------------------------------------------------------
# list / show
# ---------------------------------------------------------------------------

def cmd_list(args) -> int:
    items = data.COLLECTIONS[args.kind]
    print(f"{args.kind} (reference data as of {data.DATA_AS_OF})\n")
    for item in items:
        label = item.get("name", item["id"])
        extra = ""
        if args.kind == "actors":
            extra = f" [{item['category']}" + (
                f", {item['status']}]" if item.get("status") else "]"
            )
        elif args.kind == "indicators":
            extra = f" (w{item['weight']} -> {', '.join(item['signals'])})"
        elif args.kind == "drivers":
            extra = f" ({item['pole_a']} <-> {item['pole_b']})"
        print(f"  {item['id']:<24} {label}{extra}")
    return 0


def cmd_show(args) -> int:
    try:
        item = data.get(args.kind, args.id)
    except KeyError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(item, indent=2, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------------------
# matrix
# ---------------------------------------------------------------------------

def cmd_matrix(args) -> int:
    try:
        m = matrix.build(args.x, args.y)
    except (KeyError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    _out(matrix.render_markdown(m), args.output)
    return 0


# ---------------------------------------------------------------------------
# new (scenario builder)
# ---------------------------------------------------------------------------

def _template_scenario(trigger_id: str) -> dict:
    trig = data.get("triggers", trigger_id)
    return {
        "id": f"{trigger_id}_variant",
        "name": f"<name your {trig['name']} scenario>",
        "trigger": trigger_id,
        "summary": f"<one-paragraph summary. Trigger class: {trig['description']}>",
        "probability": None,
        "pathway": [f"<address: {q}>" for q in trig["key_questions"]],
        "key_actors": [],
        "indicators": [],
        "assumptions": [
            {
                "text": "<what must be true for this scenario>",
                "confidence": "medium",
                "impact_if_wrong": "medium",
            }
        ],
        "implications": ["<so what — for policy, markets, warning posture>"],
        "analyst_notes": "",
    }


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or default


def _prompt_list(label: str) -> list[str]:
    print(f"{label} (one per line, blank line to finish):")
    items = []
    while True:
        line = input("  > ").strip()
        if not line:
            return items
        items.append(line)


def _prompt_ids(label: str, kind: str) -> list[str]:
    valid = [item["id"] for item in data.COLLECTIONS[kind]]
    print(f"{label} — valid ids: {', '.join(valid)}")
    while True:
        raw = input("  comma-separated ids (or blank): ").strip()
        if not raw:
            return []
        ids = [token.strip() for token in raw.split(",") if token.strip()]
        bad = [i for i in ids if i not in valid]
        if not bad:
            return ids
        print(f"  unknown: {', '.join(bad)} — try again")


def _interactive_scenario() -> Scenario:
    print("\n-- New scenario --")
    trigger_ids = [t["id"] for t in data.TRIGGERS]
    print("Trigger classes:")
    for t in data.TRIGGERS:
        print(f"  {t['id']:<12} {t['name']}")
    while True:
        trigger = _prompt("Trigger class", "continuity")
        if trigger in trigger_ids:
            break
        print(f"  pick one of: {', '.join(trigger_ids)}")

    trig = data.get("triggers", trigger)
    print("\nKey questions for this class (answer them in your pathway):")
    for q in trig["key_questions"]:
        print(f"  - {q}")

    sid = _prompt("Scenario id (snake_case)", f"{trigger}_1")
    name = _prompt("Scenario name")
    summary = _prompt("One-paragraph summary")
    prob_raw = _prompt("Probability over the horizon (0-1, blank to skip)")
    probability_value = float(prob_raw) if prob_raw else None
    pathway = _prompt_list("Pathway steps")
    key_actors = _prompt_ids("Key actors", "actors")
    indicator_ids = _prompt_ids("Indicators to watch", "indicators")

    assumptions = []
    print("Key assumptions check (blank text to finish):")
    while True:
        text = input("  assumption: ").strip()
        if not text:
            break
        conf = _prompt("    confidence (low/medium/high)", "medium")
        impact = _prompt("    impact if wrong (low/medium/high)", "medium")
        assumptions.append(
            Assumption(text=text, confidence=conf, impact_if_wrong=impact)
        )

    implications = _prompt_list("Implications if realized")
    notes = _prompt("Analyst notes (optional)")

    return Scenario(
        id=sid, name=name, trigger=trigger, summary=summary,
        probability=probability_value, pathway=pathway, key_actors=key_actors,
        indicators=indicator_ids, assumptions=assumptions,
        implications=implications, analyst_notes=notes,
    )


def cmd_new(args) -> int:
    if args.template:
        try:
            payload = _template_scenario(args.template)
        except KeyError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    if not sys.stdin.isatty():
        print(
            "error: interactive mode needs a TTY; use --template TRIGGER_ID "
            "to print an editable scenario skeleton instead",
            file=sys.stderr,
        )
        return 1

    if os.path.exists(args.file):
        sset = ScenarioSet.load(args.file)
        print(f"Appending to existing set: {sset.title!r} ({len(sset.scenarios)} scenarios)")
    else:
        print(f"Creating new scenario set at {args.file}")
        title = _prompt("Set title", "Xi succession scenarios")
        horizon = _prompt("Analytic horizon", "through end-2030")
        sset = ScenarioSet(title=title, horizon=horizon, scenarios=[])

    sset.scenarios.append(_interactive_scenario())
    # Re-validate uniqueness via round-trip
    sset = ScenarioSet.from_dict(sset.to_dict())
    sset.save(args.file)
    print(f"\nSaved {len(sset.scenarios)} scenario(s) to {args.file}")
    for finding in probability.coherence_findings(sset):
        print(f"  note: {finding}")
    return 0


# ---------------------------------------------------------------------------
# iw (indicators & warnings)
# ---------------------------------------------------------------------------

def cmd_iw(args) -> int:
    if args.observed is not None:
        observed = [t.strip() for t in args.observed.split(",") if t.strip()]
    elif sys.stdin.isatty():
        observed = []
        print("Mark each indicator currently assessed as observed [y/N]:\n")
        for ind in data.INDICATORS:
            answer = input(f"  [{ind['id']}] {ind['text']} ? ").strip().lower()
            if answer in ("y", "yes"):
                observed.append(ind["id"])
    else:
        print(
            "error: pass --observed id1,id2,... (no TTY for interactive mode)",
            file=sys.stderr,
        )
        return 1

    try:
        results = indicators.score(observed)
    except KeyError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"\nObserved indicators: {', '.join(observed) if observed else '(none)'}\n")
    print(f"{'trigger':<14}{'score':>6}{'of max':>8}  matched")
    for r in results:
        matched = ", ".join(r.matched) if r.matched else "-"
        print(f"{r.trigger_id:<14}{r.score:>6}{r.max_score:>8}  {matched}")
    print(
        "\nReading: scores rank which scenario families the current signal\n"
        "pattern is most consistent with. This is salience, not probability —\n"
        "use it to direct collection, then update judgments deliberately."
    )
    return 0


# ---------------------------------------------------------------------------
# check / aggregate / report
# ---------------------------------------------------------------------------

def _load_set(path: str) -> ScenarioSet | None:
    try:
        return ScenarioSet.load(path)
    except FileNotFoundError:
        print(f"error: no such file: {path}", file=sys.stderr)
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"error: could not parse scenario set: {exc}", file=sys.stderr)
    return None


def cmd_check(args) -> int:
    sset = _load_set(args.file)
    if sset is None:
        return 1
    findings = probability.coherence_findings(sset)
    print(f"Checked: {sset.title!r} — {len(sset.scenarios)} scenarios, "
          f"horizon {sset.horizon}")
    if not findings:
        print("OK: no coherence or assumption flags.")
        return 0
    for f in findings:
        print(f"  ⚠ {f}")
    return 2


def cmd_aggregate(args) -> int:
    try:
        with open(args.file, encoding="utf-8") as fh:
            estimates = json.load(fh)
        combined = probability.aggregate(
            estimates, method=args.method, renormalize=not args.raw
        )
        spreads = probability.disagreement(estimates)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Aggregation method: {args.method}"
          + ("" if args.raw else " (renormalized to sum to 1)"))
    print(f"\n{'scenario':<24}{'combined':>10}{'spread':>10}")
    for sid in sorted(combined, key=lambda s: -combined[s]):
        print(f"{sid:<24}{combined[sid]:>9.1%}{spreads[sid]:>9.1%}")
    wide = [sid for sid, sp in spreads.items() if sp >= 0.2]
    if wide:
        print(
            "\nLarge analyst spreads (>=20 points) on: "
            + ", ".join(sorted(wide))
            + " — discuss these before publishing a consensus number."
        )
    return 0


def cmd_report(args) -> int:
    sset = _load_set(args.file)
    if sset is None:
        return 1
    _out(report.render(sset), args.output)
    return 0


# ---------------------------------------------------------------------------
# parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="xi-succession",
        description=(
            "Structured-analytic-techniques workbench for thinking through "
            "Xi Jinping succession scenarios."
        ),
    )
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("list", help="list knowledge-base entries")
    p.add_argument("kind", choices=sorted(data.COLLECTIONS))
    p.set_defaults(fn=cmd_list)

    p = sub.add_parser("show", help="show one knowledge-base entry as JSON")
    p.add_argument("kind", choices=sorted(data.COLLECTIONS))
    p.add_argument("id")
    p.set_defaults(fn=cmd_show)

    p = sub.add_parser(
        "matrix", help="generate a 2x2 alternative-futures worksheet"
    )
    p.add_argument("--x", required=True, help="driver id for the X axis")
    p.add_argument("--y", required=True, help="driver id for the Y axis")
    p.add_argument("-o", "--output", help="write markdown to file")
    p.set_defaults(fn=cmd_matrix)

    p = sub.add_parser(
        "new",
        help="build a scenario (interactive, or --template for a JSON skeleton)",
    )
    p.add_argument(
        "-f", "--file", default="scenarios.json",
        help="scenario set file to create/append (default: scenarios.json)",
    )
    p.add_argument(
        "--template", metavar="TRIGGER_ID",
        help="print an editable scenario skeleton for this trigger class",
    )
    p.set_defaults(fn=cmd_new)

    p = sub.add_parser(
        "iw", help="score observed indicators against scenario classes"
    )
    p.add_argument(
        "--observed", help="comma-separated indicator ids assessed as observed"
    )
    p.set_defaults(fn=cmd_iw)

    p = sub.add_parser(
        "check", help="coherence + key-assumptions check on a scenario set"
    )
    p.add_argument("file")
    p.set_defaults(fn=cmd_check)

    p = sub.add_parser(
        "aggregate",
        help="combine multiple analysts' probability estimates "
             "({scenario_id: {analyst: prob}} JSON)",
    )
    p.add_argument("file")
    p.add_argument(
        "--method", default="mean",
        choices=sorted(probability.AGGREGATION_METHODS),
    )
    p.add_argument(
        "--raw", action="store_true",
        help="skip renormalization of the combined distribution",
    )
    p.set_defaults(fn=cmd_aggregate)

    p = sub.add_parser("report", help="render a scenario set to markdown")
    p.add_argument("file")
    p.add_argument("-o", "--output", help="write markdown to file")
    p.set_defaults(fn=cmd_report)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.fn(args)
    except KeyboardInterrupt:
        print("\naborted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
