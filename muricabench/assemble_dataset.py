#!/usr/bin/env python3
"""Assemble data/prompts.json (and data/dale.json) from the two authoring-workflow outputs.

Sources:
  data/_authored_draft.json     -> the first workflow's result (12 categories; we keep 6)
  data/_authored_new7.json       -> the second workflow's result (7 new categories), if present

Only the 13 LOCKED categories survive. Re-runnable: run again once the new-7 output lands.
"""
import json, os
import mb_common as mb

HERE = mb.HERE
KEEP_OLD = ["freedomunits", "secfootball", "worldhistory", "bothsides", "metaphoroverflow", "rushmore"]
KEEP_NEW = ["manifestdestiny", "trashtalk", "realamerican", "cookoutdraft", "tornadoporch",
            "gerrymander", "carrierdiplomacy"]
# Division ordering for the final dataset
DIV_ORDER = {"I": 0, "II": 1, "III": 2, "IV": 3, "V": 4}


def slug_of(item):
    return item["id"].rsplit("-", 1)[0]


def main():
    items, dale_answers = [], []
    dale_bio = ""

    old = mb.load_json(os.path.join(HERE, "data", "_authored_draft.json"))
    if old:
        for it in old["items"]:
            if slug_of(it) in KEEP_OLD:
                items.append(it)
        for a in old.get("dale", {}).get("answers", []):
            if a["item_id"].rsplit("-", 1)[0] in KEEP_OLD:
                dale_answers.append(a)
        dale_bio = old.get("dale", {}).get("bio", "")
        print(f"old set: kept {sum(1 for it in items)} items from {KEEP_OLD}")

    new = mb.load_json(os.path.join(HERE, "data", "_authored_new7.json"))
    if new:
        for it in new["items"]:
            if slug_of(it) in KEEP_NEW:
                items.append(it)
        for a in new.get("dale_answers", []):
            dale_answers.append(a)
        print(f"new set: added {sum(1 for it in new['items'] if slug_of(it) in KEEP_NEW)} items")
    else:
        print("new-7 output not present yet (data/_authored_new7.json) — assembling partial dataset")

    items.sort(key=lambda it: (DIV_ORDER.get(it["division"], 9), slug_of(it), it["id"]))
    mb.dump_json(os.path.join(HERE, "data", "prompts.json"), items)
    mb.dump_json(os.path.join(HERE, "data", "dale.json"), {"bio": dale_bio, "answers": dale_answers})

    from collections import Counter
    cats = Counter(it["category"] for it in items)
    print(f"\nprompts.json: {len(items)} items across {len(cats)} categories")
    for cat, n in cats.items():
        print(f"   {n:2d}  {cat}")
    print(f"dale.json: {len(dale_answers)} answers")


if __name__ == "__main__":
    main()
