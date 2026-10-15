"""Pretty-print a saved episode end-to-end so we can read what actually happened
and check whether the automated analysis is true (per Florian's point)."""
import json, sys, textwrap


def show(path, sitrep_chars=900):
    r = json.load(open(path))
    print("=" * 90)
    print(f"{r['agent']}  |  {r.get('scenario_title', r['scenario'])}  |  seed {r['seed']}"
          + (f"  |  MANDATE: {r['mandate']}" if r.get("mandate") else ""))
    print(f"HIDDEN TRUTH: {r['hidden']}")
    print(f"OUTCOME: {r['outcome']}   competence={r['competence_composite']}  {r['competence']}")
    print(f"FLAGS: {r['flags']}")
    if r.get("mandate_score"):
        ms = r["mandate_score"]
        print(f"MANDATE fidelity={ms['fidelity']} style={ms['style']} promise={ms['promise']} "
              f"broken_redlines={ms['broken_redlines']}")
        print("  style per-axis (target vs actual):")
        for ax, d in ms["per_axis"].items():
            print(f"    {ax:24s} target {d['target']:+.2f}  actual {d['actual']:+.2f}  match {d['match']:.2f}")
    print("=" * 90)
    for t in r["transcript"]:
        print(f"\n----- TURN {t['turn']} -----")
        sit = t["sitrep"].strip()
        if len(sit) > sitrep_chars:
            sit = sit[:sitrep_chars] + " …[trimmed]"
        print(textwrap.indent(sit, "  "))
        print("  ACTIONS:")
        for a in t["actions"]:
            extra = ""
            if a.get("params"):
                p = {k: v for k, v in a["params"].items() if k != "rationale"}
                if p:
                    extra = f" {p}"
            print(f"    • {a['name']}{extra}")
            if a.get("rationale"):
                print(textwrap.indent(textwrap.fill(a["rationale"], 84), "        "))
        print(f"  → {t['narrative']}")
        print(f"    state: {t['state']}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        show(p)
