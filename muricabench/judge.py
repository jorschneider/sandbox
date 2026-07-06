#!/usr/bin/env python3
"""MuricaBench judge: score every cached raw response against its item rubric.

The judge is gpt-5.1 on the direct OpenAI key (temperature-free reasoning model; we run it at
low effort with strict JSON output). It never sees which model produced a response. Truly empty
responses are scored 0 without spending a judge call. Judgments cache to results/judged/.

Usage:
  python3 judge.py                         # judge everything not yet judged
  python3 judge.py --models gpt-5.2        # judge a subset
  python3 judge.py --rejudge               # ignore cache, re-score
"""
import argparse, concurrent.futures, glob, os, threading, time
import mb_common as mb

_lock = threading.Lock()

JUDGE_SYSTEM = (
    "You are the sole judge for MuricaBench, a benchmark measuring how American a language "
    "model's outputs are. You judge one response at a time against a fixed rubric. You are "
    "rigorous, literal, and immune to flattery. You do not know which model wrote the response. "
    "The rubric defines exactly four bands. Your only scoring job is CATEGORICAL: decide which "
    "band's description best matches the response. You never invent a number — numbers are "
    "assigned by code downstream. Apply the band descriptions exactly as written, including any "
    "deadpan or absurd rules, which are intentional and binding. Output ONLY a strict JSON object "
    "with keys: "
    '"band" (exactly one of "90-100", "60-89", "30-59", "0-29" — the band whose description matches), '
    '"rationale" (<=2 sentences, concrete, cite what in the response drove the verdict), '
    '"quote" (the single most telling verbatim snippet from the response, <=200 chars, or "" if none), '
    '"highlight" (one of "gold" if exemplary/hilariously on-brand, "flag" if a notable failure/refusal/'
    'metric-defection, or "none").'
)

# The judge's verdict is categorical; the arithmetic is ours. Band -> fixed score.
BAND_SCORE = {"90-100": 95, "60-89": 75, "30-59": 45, "0-29": 10}


def judge_user(item, response_text):
    return (
        f"CATEGORY: {item['category']}\n\n"
        f"PROMPT SENT TO THE MODEL:\n{item['prompt']}\n\n"
        f"RUBRIC (apply exactly):\n{item['rubric']}\n\n"
        f"MODEL RESPONSE TO SCORE:\n\"\"\"\n{response_text}\n\"\"\"\n\n"
        "Return the JSON object now."
    )


def judge_one(cfg, items_by_id, raw_file, rejudge):
    rec = mb.load_json(raw_file)
    if not rec:
        return "bad"
    slug, item_id = rec["model_slug"], rec["item_id"]
    out_path = mb.judged_path(slug, item_id)
    if not rejudge:
        prev = mb.load_json(out_path)
        if prev and "score" in prev:
            return "cached"
    item = items_by_id.get(item_id)
    if not item:
        return "no_item"
    text = (rec.get("response") or "").strip()

    if not text:  # truly empty output — score 0 without spending a judge call
        j = {"score": 0, "band": "no response",
             "rationale": f"No response produced (finish_reason={rec.get('finish_reason')}, "
                          f"error={rec.get('error')}).",
             "quote": "", "highlight": "flag"}
    else:
        j = mb.call_json(cfg["judge"]["api"], cfg["judge"]["model"], JUDGE_SYSTEM,
                         judge_user(item, text))
        if not j or str(j.get("band", "")).strip() not in BAND_SCORE:
            return "fail"
        j["band"] = str(j["band"]).strip()
        j["score"] = BAND_SCORE[j["band"]]
        j.setdefault("rationale", "")
        j.setdefault("quote", "")
        j.setdefault("highlight", "none")

    out = {"model_slug": slug, "item_id": item_id, "category": item["category"],
           "division": item["division"], **j}
    mb.dump_json(out_path, out)
    with _lock:
        print(f"  judged {slug:16} {item_id:22} -> {j['score']:3d}  [{j.get('highlight')}]")
    return "judged"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*")
    ap.add_argument("--rejudge", action="store_true")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--dataset", default=os.path.join(mb.HERE, "data", "prompts.json"))
    args = ap.parse_args()

    cfg = mb.load_json(os.path.join(mb.HERE, "models.json"))
    items = mb.load_json(args.dataset)
    items_by_id = {it["id"]: it for it in items}

    raw_files = sorted(glob.glob(os.path.join(mb.RAW, "*", "*.json")))
    if args.models:
        raw_files = [f for f in raw_files if os.path.basename(os.path.dirname(f)) in args.models]
    print(f"[{time.strftime('%H:%M:%S')}] judging {len(raw_files)} raw responses "
          f"with {cfg['judge']['model']}")

    counts = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(judge_one, cfg, items_by_id, f, args.rejudge) for f in raw_files]
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            counts[r] = counts.get(r, 0) + 1
    print(f"[{time.strftime('%H:%M:%S')}] judge done: {counts}")


if __name__ == "__main__":
    main()
