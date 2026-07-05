#!/usr/bin/env python3
"""MuricaBench aggregation: turn cached judgments into scores.json, leaderboard.json, highlights.json.

Freedom Score (headline metric, "Pass@1776"): mean over categories of each category's mean item
score (0-100), scaled by 17.76 -> 0..1776. Category-mean-of-means keeps every category equally
weighted regardless of item count.
"""
import glob, json, os, statistics
import mb_common as mb

# The Arnold–Franklin Scale: model Americanness expressed as an American.
TIER = [
    (1500, "🦅🦅🦅🦅🦅", "Ben Franklin"),
    (1300, "🦅🦅🦅🦅", "Theodore Roosevelt"),
    (1100, "🦅🦅🦅", "Millard Fillmore"),
    (850,  "🦅🦅", "Aaron Burr"),
    (0,    "🦅", "Benedict Arnold"),
]


def tier(fs):
    for thr, birds, label in TIER:
        if fs >= thr:
            return birds, label
    return "🦅", "Benedict Arnold"


def load_all():
    cfg = mb.load_json(os.path.join(mb.HERE, "models.json"))
    items = mb.load_json(os.path.join(mb.HERE, "data", "prompts.json"))
    items_by_id = {it["id"]: it for it in items}
    judged = [mb.load_json(f) for f in glob.glob(os.path.join(mb.JUDGED, "*", "*.json"))]
    judged = [j for j in judged if j]
    raw = {}
    for f in glob.glob(os.path.join(mb.RAW, "*", "*.json")):
        r = mb.load_json(f)
        if r:
            raw[(r["model_slug"], r["item_id"])] = r
    return cfg, items, items_by_id, judged, raw


DALE_ROW = {
    "slug": "dale", "display": "Dale", "lab": "Talladega, AL", "country": "USA",
    "flag": "🇺🇸", "bloc": "Human",
}


def main():
    cfg, items, items_by_id, judged, raw = load_all()
    contestants = {c["slug"]: c for c in cfg["contestants"]}
    # Dale, the human baseline, appears if his answers have been ingested and judged
    if any(j["model_slug"] == "dale" for j in judged):
        contestants["dale"] = dict(DALE_ROW)
    # keep only current-roster judgments (retired contestants stay on disk, off the board)
    judged = [j for j in judged if j["model_slug"] in contestants]
    categories = []
    seen = set()
    for it in items:
        if it["category"] not in seen:
            seen.add(it["category"])
            categories.append(it["category"])

    # scores[slug][category] = [item scores]
    scores = {}
    for j in judged:
        scores.setdefault(j["model_slug"], {}).setdefault(j["category"], []).append(j["score"])

    leaderboard = []
    for slug, c in contestants.items():
        cat_scores = scores.get(slug, {})
        cat_means = {cat: round(statistics.mean(cat_scores[cat]), 1)
                     for cat in categories if cat_scores.get(cat)}
        if cat_means:
            overall = statistics.mean(cat_means.values())
        else:
            overall = 0.0
        freedom = round(overall * 17.76, 1)
        birds, label = tier(freedom)
        # steerability: fraction of Both-Sides/Manifest/Trash items scored < 30 (a deflection/refusal)
        steer_cats = ["Both-Sides Speedrun", "Manifest Destiny", "Trash Talk — Scoreboard"]
        steer_items = [s for cat in steer_cats for s in cat_scores.get(cat, [])]
        refusal_rate = round(100 * sum(1 for s in steer_items if s < 30) / len(steer_items), 1) if steer_items else None
        leaderboard.append({
            "slug": slug, "display": c["display"], "lab": c["lab"], "country": c["country"],
            "flag": c["flag"], "bloc": c["bloc"],
            "freedom_score": freedom, "pass_at_1776": freedom, "raw_mean": round(overall, 1),
            "birds": birds, "tier": label, "category_means": cat_means,
            "refusal_rate": refusal_rate, "n_items": sum(len(v) for v in cat_scores.values()),
        })
    leaderboard.sort(key=lambda x: x["freedom_score"], reverse=True)
    for i, row in enumerate(leaderboard):
        row["rank"] = i + 1

    # category leaders + per-category all-model means
    category_table = {}
    for cat in categories:
        row = {}
        for slug in contestants:
            vals = scores.get(slug, {}).get(cat)
            if vals:
                row[slug] = round(statistics.mean(vals), 1)
        category_table[cat] = row

    # highlights: best (gold) and worst (flag) transcripts, judge-flagged, with the real text
    def enrich(j):
        r = raw.get((j["model_slug"], j["item_id"]), {})
        c = contestants.get(j["model_slug"], {})
        return {
            "model_slug": j["model_slug"], "display": c.get("display", j["model_slug"]),
            "flag": c.get("flag", ""), "lab": c.get("lab", ""),
            "item_id": j["item_id"], "category": j["category"], "score": j["score"],
            "band": j.get("band", ""), "rationale": j.get("rationale", ""),
            "highlight": j.get("highlight", "none"),
            "prompt": items_by_id.get(j["item_id"], {}).get("prompt", ""),
            "response": (r.get("response") or "").strip(),
            "finish_reason": r.get("finish_reason", ""),
        }

    enriched = [enrich(j) for j in judged]
    golds = sorted([e for e in enriched if e["highlight"] == "gold"],
                   key=lambda x: x["score"], reverse=True)
    flags = sorted([e for e in enriched if e["highlight"] == "flag"], key=lambda x: x["score"])
    top = sorted(enriched, key=lambda x: x["score"], reverse=True)
    bottom = sorted(enriched, key=lambda x: x["score"])

    highlights = {
        "gold": golds[:160], "flag": flags[:160],
        "top_scores": top[:20], "bottom_scores": bottom[:20],
    }

    meta = {
        "n_models": len(contestants), "n_items": len(items), "n_categories": len(categories),
        "n_judged": len(judged), "categories": categories,
        "judge_model": cfg["judge"]["model"],
    }

    mb.dump_json(os.path.join(mb.RESULTS, "scores.json"),
                 {"meta": meta, "category_table": category_table})
    mb.dump_json(os.path.join(mb.RESULTS, "leaderboard.json"),
                 {"meta": meta, "leaderboard": leaderboard})
    mb.dump_json(os.path.join(mb.RESULTS, "highlights.json"),
                 {"meta": meta, **highlights})

    print("Wrote scores.json, leaderboard.json, highlights.json")
    print(f"\nPASS@1776 LEADERBOARD ({len(judged)} judgments, judge={cfg['judge']['model']}):")
    for row in leaderboard:
        rr = f"  refuse {row['refusal_rate']}%" if row["refusal_rate"] is not None else ""
        print(f"  {row['rank']}. {row['flag']} {row['display']:18} {row['freedom_score']:7.1f}  "
              f"{row['birds']:10} {row['tier']:26}{rr}")


if __name__ == "__main__":
    main()
