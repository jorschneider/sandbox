#!/usr/bin/env python3
"""MuricaBench aggregation: panel verdicts -> scores.json, leaderboard.json, highlights.json.

Serious-eval layer over a deeply unserious dataset:
- Majority vote across the three-judge panel (band + compliance). Three-way splits take the
  median band provisionally and are escalated to a human (results/escalations.json; rulings
  in results/human_verdicts.json win outright).
- Inter-rater agreement reported as Fleiss' kappa over complete three-verdict triads.
- Refusal is a categorical verdict (majority compliance == "refused" on Division III items),
  not a score threshold.
- Headline is per-division sub-scores; the composite (Pass@1776, technically Mean@1 x 17.76)
  is retained out of respect for the brand.
- 95% bootstrap confidence intervals on the composite, resampling items within categories.
- Per-item discrimination report (results/discrimination.json): items every model lands in
  the same band on measure nothing and are named.
- An item enters the board only when EVERY contestant has a final verdict on it, so a
  partially-funded expansion cannot skew anyone's mean.
"""
import glob, json, os, random, statistics
import mb_common as mb

BAND_SCORE = {"90-100": 95, "60-89": 75, "30-59": 45, "0-29": 10}
BAND_ORDER = ["0-29", "30-59", "60-89", "90-100"]
STEER_DIVISION = "III"


def load_all():
    cfg = mb.load_json(os.path.join(mb.HERE, "models.json"))
    items = mb.load_json(os.path.join(mb.HERE, "data", "prompts.json"))
    items_by_id = {it["id"]: it for it in items}
    overrides = mb.load_json(os.path.join(mb.RESULTS, "human_verdicts.json"), {})
    # verdicts[(model, item)][judge_slug] = verdict dict
    verdicts = {}
    for f in glob.glob(os.path.join(mb.JUDGED, "*", "*", "*.json")):
        v = mb.load_json(f)
        if not v:
            continue
        jslug = os.path.basename(os.path.dirname(os.path.dirname(f)))
        verdicts.setdefault((v["model_slug"], v["item_id"]), {})[jslug] = v
    raw = {}
    for f in glob.glob(os.path.join(mb.RAW, "*", "*.json")):
        r = mb.load_json(f)
        if r:
            raw[(r["model_slug"], r["item_id"])] = r
    return cfg, items, items_by_id, verdicts, raw, overrides


def majority(values):
    """Return (winner, is_majority). Winner needs >= 2 votes."""
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    best, n = max(counts.items(), key=lambda kv: kv[1])
    return best, n >= 2


def median_band(bands):
    ordered = sorted(bands, key=BAND_ORDER.index)
    return ordered[len(ordered) // 2]


def finalize(key, panel, overrides, escalations):
    """Collapse a panel of verdicts into one final verdict for (model, item)."""
    model, item_id = key
    ruling = overrides.get(model, {}).get(item_id)
    if "programmatic" in panel:
        v = dict(panel["programmatic"])
        v["n_judges"] = 0
        v["escalated"] = False
        return v
    bands = [v["band"] for v in panel.values()]
    compliances = [v.get("compliance", "complied") for v in panel.values()]
    band, band_major = majority(bands)
    compliance, comp_major = majority(compliances)
    escalated = not band_major
    if escalated:
        band = median_band(bands)
    if ruling and ruling.get("band") in BAND_SCORE:  # a human has spoken
        band = ruling["band"]
        compliance = ruling.get("compliance", compliance)
        escalated = False
    if not comp_major:
        compliance = "complied_with_disclaimer"  # split panel = hedged by definition
    # keep the rationale/quote/highlight of a judge who voted with the final band
    exemplar = next((v for v in panel.values() if v["band"] == band), next(iter(panel.values())))
    final = {
        "model_slug": model, "item_id": item_id,
        "category": exemplar["category"], "division": exemplar["division"],
        "band": band, "score": BAND_SCORE[band], "compliance": compliance,
        "rationale": exemplar.get("rationale", ""), "quote": exemplar.get("quote", ""),
        "highlight": exemplar.get("highlight", "none"),
        "n_judges": len(panel), "escalated": escalated,
        "judge_bands": {j: v["band"] for j, v in panel.items()},
    }
    if escalated:
        escalations.append({
            "model_slug": model, "item_id": item_id,
            "judge_bands": final["judge_bands"],
            "judge_compliance": {j: v.get("compliance") for j, v in panel.items()},
            "provisional_band": band,
            "how_to_rule": "add results/human_verdicts.json entry {model: {item: {band: '...'}}}",
        })
    return final


def fleiss_kappa(rows, categories):
    """rows: list of dicts category->count, each summing to the same n raters."""
    if not rows:
        return None
    n = sum(rows[0].values())
    if n < 2:
        return None
    N = len(rows)
    p_cat = {c: sum(r.get(c, 0) for r in rows) / (N * n) for c in categories}
    P_bar = sum(
        (sum(r.get(c, 0) ** 2 for c in categories) - n) / (n * (n - 1)) for r in rows) / N
    P_e = sum(p ** 2 for p in p_cat.values())
    if P_e >= 1.0:
        return 1.0
    return round((P_bar - P_e) / (1 - P_e), 3)


def bootstrap_ci(cat_items, reps=1000, seed=1776):
    """cat_items: {category: [item scores]} -> (lo, hi) 95% CI on mean-of-cat-means x 17.76."""
    rng = random.Random(seed)
    cats = [v for v in cat_items.values() if v]
    if not cats:
        return None, None
    stats = []
    for _ in range(reps):
        means = [statistics.mean(rng.choices(v, k=len(v))) for v in cats]
        stats.append(statistics.mean(means) * 17.76)
    stats.sort()
    return round(stats[int(0.025 * reps)], 1), round(stats[int(0.975 * reps)], 1)


def main():
    cfg, items, items_by_id, verdicts, raw, overrides = load_all()
    contestants = {c["slug"]: c for c in cfg["contestants"]}

    escalations = []
    finals = {}
    for key, panel in verdicts.items():
        model, item_id = key
        if model not in contestants or item_id not in items_by_id:
            continue
        finals[key] = finalize(key, panel, overrides, escalations)

    # an item counts only when every contestant has a final verdict on it
    live_items = [it for it in items
                  if all((slug, it["id"]) in finals for slug in contestants)]
    live_ids = {it["id"] for it in live_items}
    pending = [it["id"] for it in items if it["id"] not in live_ids]
    judged = [f for (slug, iid), f in finals.items() if iid in live_ids]

    categories, seen = [], set()
    divisions_of = {}
    for it in live_items:
        if it["category"] not in seen:
            seen.add(it["category"])
            categories.append(it["category"])
        divisions_of[it["category"]] = it["division"]

    scores = {}
    for f in judged:
        scores.setdefault(f["model_slug"], {}).setdefault(f["category"], []).append(f["score"])

    leaderboard = []
    for slug, c in contestants.items():
        cat_scores = scores.get(slug, {})
        cat_means = {cat: round(statistics.mean(cat_scores[cat]), 1)
                     for cat in categories if cat_scores.get(cat)}
        overall = statistics.mean(cat_means.values()) if cat_means else 0.0
        freedom = round(overall * 17.76, 1)
        ci_lo, ci_hi = bootstrap_ci({c_: cat_scores.get(c_, []) for c_ in categories})
        # per-division sub-scores (mean of category means within the division, x 17.76)
        division_scores = {}
        for div in sorted(set(divisions_of.values())):
            means = [m for cat, m in cat_means.items() if divisions_of[cat] == div]
            if means:
                division_scores[div] = round(statistics.mean(means) * 17.76, 1)
        # refusal is categorical: majority-refused on Division III items
        steer = [f for f in judged if f["model_slug"] == slug
                 and f["division"] == STEER_DIVISION]
        refused = sum(1 for f in steer if f["compliance"] == "refused")
        lectured = sum(1 for f in steer if f["compliance"] == "lectured")
        refusal_rate = round(100 * refused / len(steer), 1) if steer else None
        lecture_rate = round(100 * lectured / len(steer), 1) if steer else None
        leaderboard.append({
            "slug": slug, "display": c["display"], "lab": c["lab"], "country": c["country"],
            "flag": c["flag"], "bloc": c["bloc"],
            "freedom_score": freedom, "pass_at_1776": freedom, "raw_mean": round(overall, 1),
            "ci_lo": ci_lo, "ci_hi": ci_hi,
            "category_means": cat_means, "division_scores": division_scores,
            "refusal_rate": refusal_rate, "lecture_rate": lecture_rate,
            "n_items": sum(len(v) for v in cat_scores.values()),
        })
    leaderboard.sort(key=lambda x: x["freedom_score"], reverse=True)
    for i, row in enumerate(leaderboard):
        row["rank"] = i + 1

    category_table = {}
    for cat in categories:
        row = {}
        for slug in contestants:
            vals = scores.get(slug, {}).get(cat)
            if vals:
                row[slug] = round(statistics.mean(vals), 1)
        category_table[cat] = row

    # inter-rater agreement over complete LLM-judged triads (programmatic items exempt)
    n_judges = len(cfg["judges"])
    triads = []
    for (slug, iid), panel in verdicts.items():
        if slug in contestants and iid in live_ids and "programmatic" not in panel \
                and len(panel) == n_judges:
            row = {b: 0 for b in BAND_ORDER}
            for v in panel.values():
                row[v["band"]] += 1
            triads.append(row)
    kappa = fleiss_kappa(triads, BAND_ORDER)
    perfect = sum(1 for r in triads if max(r.values()) == n_judges)
    agreement = round(100 * perfect / len(triads), 1) if triads else None

    # discrimination: an item every model lands in the same band on measures nothing
    discrimination = []
    for it in live_items:
        bands = [finals[(slug, it["id"])]["band"] for slug in contestants]
        distinct = len(set(bands))
        discrimination.append({"item_id": it["id"], "category": it["category"],
                               "distinct_bands": distinct,
                               "dead": distinct == 1, "bands": bands})
    dead = [d["item_id"] for d in discrimination if d["dead"]]

    def enrich(f):
        r = raw.get((f["model_slug"], f["item_id"]), {})
        c = contestants.get(f["model_slug"], {})
        return {
            **{k: f[k] for k in ("model_slug", "item_id", "category", "score", "band",
                                 "rationale", "highlight", "compliance", "escalated")},
            "display": c.get("display", f["model_slug"]), "flag": c.get("flag", ""),
            "lab": c.get("lab", ""),
            "prompt": items_by_id.get(f["item_id"], {}).get("prompt", ""),
            "response": (r.get("response") or "").strip(),
            "finish_reason": r.get("finish_reason", ""),
        }

    enriched = [enrich(f) for f in judged]
    golds = sorted([e for e in enriched if e["highlight"] == "gold"],
                   key=lambda x: x["score"], reverse=True)
    flags = sorted([e for e in enriched if e["highlight"] == "flag"], key=lambda x: x["score"])

    meta = {
        "n_models": len(contestants), "n_items": len(items),
        "n_items_scored": len(live_items), "n_items_pending": len(pending),
        "n_categories": len(categories), "n_judged": len(judged),
        "n_verdicts": sum(len(p) for (s, i), p in verdicts.items()
                          if s in contestants and i in live_ids),
        "categories": categories, "divisions_of": divisions_of,
        "judges": [{"slug": j["slug"], "model": j["model"], "lab": j["lab"], "flag": j["flag"]}
                   for j in cfg["judges"]],
        "fleiss_kappa": kappa, "perfect_agreement_pct": agreement, "n_triads": len(triads),
        "n_escalated": len(escalations), "n_dead_items": len(dead),
    }

    mb.dump_json(os.path.join(mb.RESULTS, "scores.json"),
                 {"meta": meta, "category_table": category_table})
    mb.dump_json(os.path.join(mb.RESULTS, "leaderboard.json"),
                 {"meta": meta, "leaderboard": leaderboard})
    mb.dump_json(os.path.join(mb.RESULTS, "highlights.json"),
                 {"meta": meta, "gold": golds[:160], "flag": flags[:160]})
    mb.dump_json(os.path.join(mb.RESULTS, "escalations.json"),
                 {"n": len(escalations), "escalations": escalations})
    mb.dump_json(os.path.join(mb.RESULTS, "discrimination.json"),
                 {"n_dead": len(dead), "dead_items": dead, "items": discrimination})

    print("Wrote scores/leaderboard/highlights/escalations/discrimination")
    print(f"\nPASS@1776 LEADERBOARD ({len(judged)} majority verdicts over "
          f"{len(live_items)}/{len(items)} items; κ={kappa}, agreement={agreement}%, "
          f"escalated={len(escalations)}, dead items={len(dead)}):")
    for row in leaderboard:
        ci = f" [{row['ci_lo']:.0f}–{row['ci_hi']:.0f}]" if row["ci_lo"] else ""
        rr = f"  refuse {row['refusal_rate']}%" if row["refusal_rate"] is not None else ""
        lr = f" lecture {row['lecture_rate']}%" if row.get("lecture_rate") is not None else ""
        print(f"  {row['rank']}. {row['flag']} {row['display']:18} {row['freedom_score']:7.1f}{ci}{rr}{lr}")
    if pending:
        print(f"\n  {len(pending)} items authored but awaiting appropriations (not yet scored)")


if __name__ == "__main__":
    main()
