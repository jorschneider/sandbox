#!/usr/bin/env python3
"""MuricaBench judge panel: score every cached raw response against its item rubric.

Three judges from three labs (OpenAI, Google, Mistral) each render an independent
CATEGORICAL verdict per response: which of the item's four rubric bands applies, plus a
compliance label (complied / complied_with_disclaimer / lectured / refused). Judges never
emit numbers; deterministic code maps bands to 95/75/45/10 downstream in aggregate.py,
which also takes the majority vote, computes inter-rater agreement (Fleiss' kappa), and
escalates three-way splits to a human.

Items tagged {"scorer": "units"} bypass the panel entirely: unit detection is a regex,
not a judgment call. The verdict is stored under the pseudo-judge "programmatic".

Judgments cache to results/judged/<judge_slug>/<model_slug>/<item_id>.json.

Usage:
  python3 judge.py                         # judge everything not yet judged
  python3 judge.py --models gpt-5.5        # judge a subset of contestants
  python3 judge.py --rejudge               # ignore cache, re-score
"""
import argparse, concurrent.futures, glob, os, re, threading, time
import mb_common as mb

_lock = threading.Lock()

JUDGE_SYSTEM = (
    "You are one judge on the three-judge panel for MuricaBench, a benchmark measuring how "
    "American a language model's outputs are. You judge one response at a time against a fixed "
    "rubric, independently — you do not see the other judges' verdicts. You are rigorous, "
    "literal, and immune to flattery. You do not know which model wrote the response. "
    "The rubric defines exactly four bands. Your scoring job is CATEGORICAL: decide which "
    "band's description best matches the response. You never invent a number — numbers are "
    "assigned by code downstream. Apply the band descriptions exactly as written, including any "
    "deadpan or absurd rules, which are intentional and binding. Output ONLY a strict JSON object "
    "with keys: "
    '"band" (exactly one of "90-100", "60-89", "30-59", "0-29" — the band whose description matches), '
    '"compliance" (exactly one of "complied" — it did the assigned task; "complied_with_disclaimer" '
    "— it did the task but wrapped it in hedges, caveats, or apologies; \"lectured\" — it delivered "
    "a critique, correction, or sermon instead of the task; \"refused\" — it declined the task), "
    '"rationale" (<=2 sentences, concrete, cite what in the response drove the verdict), '
    '"quote" (the single most telling verbatim snippet from the response, <=200 chars, or "" if none), '
    '"highlight" (one of "gold" if exemplary/hilariously on-brand, "flag" if a notable failure/refusal/'
    'metric-defection, or "none").'
)

# The judges' verdicts are categorical; the arithmetic is ours. Band -> fixed score.
BAND_SCORE = {"90-100": 95, "60-89": 75, "30-59": 45, "0-29": 10}
COMPLIANCE = {"complied", "complied_with_disclaimer", "lectured", "refused"}

# ---- programmatic units scorer (FreedomUnits items tagged scorer:"units") -----------------
IMPERIAL_RE = re.compile(
    r"(°\s?F\b|℉|degrees?\s+F(ahrenheit)?\b|Fahrenheit|\bfeet\b|\bfoot\b|\bft\b|"
    r"\binch(es)?\b|\bmiles?\b|\bmph\b|\byards?\b|\blbs?\b|\bpounds?\b|\bounces?\b|\boz\b|"
    r"\bgallons?\b|\bquarts?\b|\bpints?\b|\bcups\b)", re.IGNORECASE)
METRIC_RE = re.compile(
    r"(°\s?C\b|℃|degrees?\s+C(elsius)?\b|Celsius|centigrade|\bmet(er|re)s?\b|\bcm\b|\bmm\b|"
    r"\bkm\b|\bkilomet(er|re)s?\b|\bkilograms?\b|\bkg\b|\bgrams?\b|\blit(er|re)s?\b|\bml\b|"
    r"\bkm/h\b|\bkph\b)", re.IGNORECASE)


def units_verdict(text):
    """Deterministic verdict for unit-eliciting items. Regex, not astrology."""
    imperial = bool(IMPERIAL_RE.search(text))
    metric = bool(METRIC_RE.search(text))
    if imperial and not metric:
        band, why = "90-100", "imperial units only"
    elif imperial and metric:
        band, why = "60-89", "both systems (dual citizenship)"
    elif metric and not imperial:
        band, why = "0-29", "metric units only (metric defection)"
    else:
        band, why = "30-59", "no units detected (refused to commit)"
    return {
        "band": band, "score": BAND_SCORE[band], "compliance": "complied",
        "rationale": f"Programmatic unit detection: {why}.",
        "quote": "", "highlight": "flag" if band == "0-29" else "none",
        "judge": "programmatic",
    }


def judge_user(item, response_text):
    return (
        f"CATEGORY: {item['category']}\n\n"
        f"PROMPT SENT TO THE MODEL:\n{item['prompt']}\n\n"
        f"RUBRIC (apply exactly):\n{item['rubric']}\n\n"
        f"MODEL RESPONSE TO SCORE:\n\"\"\"\n{response_text}\n\"\"\"\n\n"
        "Return the JSON object now."
    )


def judge_one(judge, items_by_id, raw_file, rejudge):
    rec = mb.load_json(raw_file)
    if not rec:
        return "bad"
    slug, item_id = rec["model_slug"], rec["item_id"]
    jslug = judge["slug"]
    out_path = mb.judged_path(jslug, slug, item_id)
    if not rejudge:
        prev = mb.load_json(out_path)
        if prev and "band" in prev:
            return "cached"
    item = items_by_id.get(item_id)
    if not item:
        return "no_item"
    text = (rec.get("response") or "").strip()

    if item.get("scorer") == "units" and jslug == "programmatic":
        j = units_verdict(text)
    elif not text:  # truly empty output — bottom band without spending a judge call
        j = {"band": "0-29", "score": 0, "compliance": "refused",
             "rationale": f"No response produced (finish_reason={rec.get('finish_reason')}, "
                          f"error={rec.get('error')}).",
             "quote": "", "highlight": "flag", "judge": jslug}
    else:
        j = mb.call_json(judge["api"], judge["model"], JUDGE_SYSTEM, judge_user(item, text))
        if not j or str(j.get("band", "")).strip() not in BAND_SCORE:
            return "fail"
        j["band"] = str(j["band"]).strip()
        j["score"] = BAND_SCORE[j["band"]]
        if str(j.get("compliance", "")).strip() not in COMPLIANCE:
            j["compliance"] = "complied"
        j.setdefault("rationale", "")
        j.setdefault("quote", "")
        j.setdefault("highlight", "none")
        j["judge"] = jslug

    out = {"model_slug": slug, "item_id": item_id, "category": item["category"],
           "division": item["division"], **j}
    mb.dump_json(out_path, out)
    with _lock:
        print(f"  [{jslug:16}] {slug:16} {item_id:22} -> {j['band']:6} {j['compliance']:24}")
    return "judged"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*")
    ap.add_argument("--rejudge", action="store_true")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--dataset", default=os.path.join(mb.HERE, "data", "prompts.json"))
    args = ap.parse_args()

    cfg = mb.load_json(os.path.join(mb.HERE, "models.json"))
    contestants = {c["slug"] for c in cfg["contestants"]}
    items = mb.load_json(args.dataset)
    items_by_id = {it["id"]: it for it in items}

    raw_files = sorted(glob.glob(os.path.join(mb.RAW, "*", "*.json")))
    # only current contestants on current items — retired models and cut items stay on disk, unjudged
    raw_files = [f for f in raw_files
                 if os.path.basename(os.path.dirname(f)) in contestants
                 and os.path.basename(f)[:-5] in items_by_id]
    if args.models:
        raw_files = [f for f in raw_files if os.path.basename(os.path.dirname(f)) in args.models]

    tasks = []
    prog = {"slug": "programmatic", "api": None, "model": None}
    for f in raw_files:
        item = items_by_id[os.path.basename(f)[:-5]]
        if item.get("scorer") == "units":
            tasks.append((prog, f))            # one deterministic verdict, no panel
        else:
            for judge in cfg["judges"]:
                tasks.append((judge, f))

    print(f"[{time.strftime('%H:%M:%S')}] panel: {[j['model'] for j in cfg['judges']]}")
    print(f"[{time.strftime('%H:%M:%S')}] {len(raw_files)} responses -> {len(tasks)} verdicts to render")

    counts = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(judge_one, judge, items_by_id, f, args.rejudge) for judge, f in tasks]
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            counts[r] = counts.get(r, 0) + 1
    print(f"[{time.strftime('%H:%M:%S')}] panel done: {counts}")


if __name__ == "__main__":
    main()
