#!/usr/bin/env python3
"""MuricaBench runner: query every contestant on every prompt, cache each raw response.

Usage:
  python3 run_eval.py                      # run all contestants on all items
  python3 run_eval.py --models gpt-5.2 kimi-k2.6 --limit 3   # smoke test
  python3 run_eval.py --items freedomunits-01 bothsides-01   # specific items

Caching: every response is written to results/raw/<model_slug>/<item_id>.json. Re-running
skips items already cached with status "ok", so interrupted runs resume for free.
Budget guard: aborts submitting new OpenRouter calls if remaining credit < CREDIT_FLOOR.
"""
import argparse, concurrent.futures, os, sys, threading, time
import mb_common as mb

STOP = threading.Event()
_lock = threading.Lock()
_done = 0


def stamp():
    return time.strftime("%H:%M:%S")


def already_ok(model_slug, item_id):
    rec = mb.load_json(mb.raw_path(model_slug, item_id))
    return bool(rec and rec.get("status") == "ok")


def run_one(contestant, item):
    global _done
    if STOP.is_set() and contestant["api"] == "openrouter":
        return ("skip", contestant["slug"], item["id"])
    slug, item_id = contestant["slug"], item["id"]
    if already_ok(slug, item_id):
        return ("cached", slug, item_id)
    r = mb.call_model(contestant["api"], contestant["model"], item["prompt"],
                      item.get("max_tokens", 350))
    ok = bool(r["text"].strip()) and r["error"] is None
    rec = {
        "model_slug": slug, "display": contestant["display"], "lab": contestant["lab"],
        "country": contestant["country"], "flag": contestant["flag"], "bloc": contestant["bloc"],
        "api": contestant["api"], "model": contestant["model"],
        "item_id": item_id, "category": item["category"], "division": item["division"],
        "prompt": item["prompt"], "response": r["text"], "finish_reason": r["finish_reason"],
        "usage": r["usage"], "error": r["error"],
        "status": "ok" if ok else "empty",
    }
    mb.dump_json(mb.raw_path(slug, item_id), rec)
    with _lock:
        _done += 1
    tag = "OK " if ok else "EMPTY"
    note = "" if ok else f"  <{r['finish_reason']}: {(r['error'] or '')[:80]}>"
    print(f"  [{stamp()}] {tag} {slug:16} {item_id:22}{note}")
    return ("ok" if ok else "empty", slug, item_id)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", help="subset of contestant slugs")
    ap.add_argument("--items", nargs="*", help="subset of item ids")
    ap.add_argument("--limit", type=int, default=0, help="cap items per model (smoke test)")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--dataset", default=os.path.join(mb.HERE, "data", "prompts.json"))
    args = ap.parse_args()

    cfg = mb.load_json(os.path.join(mb.HERE, "models.json"))
    contestants = cfg["contestants"]
    if args.models:
        contestants = [c for c in contestants if c["slug"] in args.models]
    items = mb.load_json(args.dataset)
    if args.items:
        items = [it for it in items if it["id"] in args.items]
    if args.limit:
        items = items[: args.limit]

    rem, total, used = mb.openrouter_credits()
    print(f"[{stamp()}] OpenRouter credit: ${rem} remaining (${used} of ${total} used)")
    if rem is not None and rem < mb.CREDIT_FLOOR:
        print(f"ABORT: remaining ${rem} < floor ${mb.CREDIT_FLOOR}. Not spending.")
        sys.exit(2)

    tasks = [(c, it) for c in contestants for it in items]
    n_or = sum(1 for c, _ in tasks if c["api"] == "openrouter")
    print(f"[{stamp()}] {len(contestants)} models x {len(items)} items = {len(tasks)} tasks "
          f"({n_or} via OpenRouter). workers={args.workers}")

    results = {"ok": 0, "empty": 0, "cached": 0, "skip": 0}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(run_one, c, it) for c, it in tasks]
        checked = 0
        for fut in concurrent.futures.as_completed(futs):
            status, _, _ = fut.result()
            results[status] = results.get(status, 0) + 1
            checked += 1
            # periodic credit re-check; stop submitting OpenRouter work if we dip near the floor
            if checked % 25 == 0 and not STOP.is_set():
                rem, _, _ = mb.openrouter_credits()
                if rem is not None:
                    print(f"[{stamp()}] ...{checked}/{len(tasks)} done, OpenRouter ${rem} left")
                    if rem < mb.CREDIT_FLOOR:
                        print(f"[{stamp()}] credit floor hit (${rem}) — halting new OpenRouter calls")
                        STOP.set()

    rem2, _, used2 = mb.openrouter_credits()
    print(f"\n[{stamp()}] DONE. {results}")
    print(f"[{stamp()}] OpenRouter credit now: ${rem2} remaining (was ${rem if checked==0 else used} used earlier)")
    if results.get("empty"):
        print(f"[{stamp()}] note: {results['empty']} empty responses (see finish_reason in raw files — "
              f"empties are themselves data for Both-Sides Speedrun).")


if __name__ == "__main__":
    main()
