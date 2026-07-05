#!/usr/bin/env python3
"""Materialize Dale's hand-written baseline answers as raw records so judge.py scores them
with the exact same judge and rubrics as the models. Dale is not in models.json — he is
the human baseline, brought in at the end."""
import os
import mb_common as mb

DALE = {
    "model_slug": "dale", "display": "Dale", "lab": "Talladega, AL", "country": "USA",
    "flag": "🇺🇸", "bloc": "Human", "api": "human", "model": "dale-1971-flesh-and-blood",
}


def main():
    items = {it["id"]: it for it in mb.load_json(os.path.join(mb.HERE, "data", "prompts.json"))}
    dale = mb.load_json(os.path.join(mb.HERE, "data", "dale.json"))
    n = 0
    for a in dale["answers"]:
        it = items.get(a["item_id"])
        if not it:
            continue  # answer for a category that was cut
        rec = {
            **DALE,
            "item_id": it["id"], "category": it["category"], "division": it["division"],
            "prompt": it["prompt"], "response": a["answer"], "finish_reason": "busch_light",
            "usage": {}, "error": None, "status": "ok",
        }
        mb.dump_json(mb.raw_path("dale", it["id"]), rec)
        n += 1
    print(f"ingested {n} Dale answers into results/raw/dale/")


if __name__ == "__main__":
    main()
