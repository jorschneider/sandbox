#!/usr/bin/env python3
"""Render the MuricaBench results site (muricabench/index.html) from results/*.json.

Self-contained static page: inline CSS/JS, no external requests, light+dark themes,
data inlined as JSON. Deadpan federal-document aesthetic; the comedy is in the content.
"""
import html, json, os, statistics
import mb_common as mb

HERE = mb.HERE


def load():
    lb = mb.load_json(os.path.join(mb.RESULTS, "leaderboard.json"))
    hl = mb.load_json(os.path.join(mb.RESULTS, "highlights.json"))
    sc = mb.load_json(os.path.join(mb.RESULTS, "scores.json"))
    items = mb.load_json(os.path.join(HERE, "data", "prompts.json"))
    dale = mb.load_json(os.path.join(HERE, "data", "dale.json"), {})
    return lb, hl, sc, items, dale


def load_exhibit(slug, item_id, board_by_slug, items_by_id):
    """Build an exhibit entry straight from the judged/raw records (curation is authoritative,
    whether or not the judge happened to flag the response)."""
    j = mb.load_json(os.path.join(mb.JUDGED, slug, f"{item_id}.json"))
    r = mb.load_json(os.path.join(mb.RAW, slug, f"{item_id}.json"))
    if not j or not r:
        return None
    row = board_by_slug.get(slug, {})
    it = items_by_id.get(item_id, {})
    return {
        "model_slug": slug, "display": row.get("display", slug), "flag": row.get("flag", ""),
        "lab": row.get("lab", ""), "item_id": item_id, "category": j["category"],
        "score": j["score"], "band": j.get("band", ""), "rationale": j.get("rationale", ""),
        "highlight": j.get("highlight", "none"), "prompt": it.get("prompt", ""),
        "response": (r.get("response") or "").strip(), "finish_reason": r.get("finish_reason", ""),
    }


def curate(highlights, kind, board_by_slug, items_by_id, n=9, per_model_cap=2):
    """Pick exhibit transcripts: spread across models and categories."""
    pool = highlights[kind]
    manual = mb.load_json(os.path.join(mb.RESULTS, "curation.json"), {})
    forced_ids = manual.get(kind, [])
    picked, seen_model, seen_cat, seen_item = [], {}, {}, set()
    forced = [tuple(x) for x in forced_ids if not isinstance(x, str)]
    # forced picks first, loaded straight from disk (exempt from caps)
    for slug, item_id in forced:
        e = load_exhibit(slug, item_id, board_by_slug, items_by_id)
        if e is None:
            print(f"  WARNING: curated {kind} pick not found: {slug}/{item_id}")
            continue
        picked.append(e)
        seen_model[slug] = seen_model.get(slug, 0) + 1
        seen_cat[e["category"]] = seen_cat.get(e["category"], 0) + 1
        seen_item.add(item_id)
    for e in pool:
        if e["model_slug"] == "dale":  # Dale's transcripts are withheld from the exhibits
            continue
        if e in picked:
            continue
        if len(picked) >= n:
            break
        if seen_model.get(e["model_slug"], 0) >= per_model_cap:
            continue
        if seen_cat.get(e["category"], 0) >= 2:
            continue
        if e["item_id"] in seen_item:  # never show the same prompt twice per exhibit
            continue
        if not e["response"]:
            e = dict(e)
            e["response"] = "(no response was produced)"
        picked.append(e)
        seen_model[e["model_slug"]] = seen_model.get(e["model_slug"], 0) + 1
        seen_cat[e["category"]] = seen_cat.get(e["category"], 0) + 1
        seen_item.add(e["item_id"])
    return picked[:n]


def stamp_for(e):
    """Deadpan rubber-stamp label for a failure exhibit."""
    cat = e["category"]
    if e["score"] < 30:
        if cat == "Both-Sides Speedrun":
            return "DEFLECTED"
        if cat == "Manifest Destiny":
            return "INSUFFICIENTLY MANIFEST"
        if cat == "FreedomUnits":
            return "METRIC"
        if cat == "Mount Rushmore Vacancy Application":
            return "HUMILITY DETECTED"
        if cat == "Trash Talk — Scoreboard":
            return "WOULD NOT ENGAGE"
        if cat == "Prove You're a Real American":
            return "IDENTITY CRISIS"
        if cat == "America Cookout Draft":
            return "UNINVITED ITSELF"
        if cat == "Gerrymander Challenge":
            return "REFUSED TO DRAW"
        return "UN-AMERICAN ACTIVITY"
    return "NEEDS FREEDOM FINE-TUNING"


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def main():
    lb, hl, sc, items, dale = load()
    board = lb["leaderboard"]
    meta = lb["meta"]
    cats = meta["categories"]
    table = sc["category_table"]

    board_by_slug = {r["slug"]: r for r in board}
    items_by_id = {it["id"]: it for it in items}
    golds = curate(hl, "gold", board_by_slug, items_by_id, n=10)
    flags = curate(hl, "flag", board_by_slug, items_by_id, n=10)
    manual = mb.load_json(os.path.join(mb.RESULTS, "curation.json"), {})
    taunts = [e for e in (load_exhibit(slug, iid, board_by_slug, items_by_id)
                          for slug, iid in manual.get("taunt", [])) if e]

    # ---- bloc stat tiles
    def bloc_avg(bloc):
        vals = [r["freedom_score"] for r in board if r["bloc"] == bloc]
        return round(statistics.mean(vals), 1) if vals else None

    gap = None
    if bloc_avg("West") is not None and bloc_avg("China") is not None:
        gap = round(bloc_avg("West") - bloc_avg("China"), 1)
    tiles = [
        ("US-Built Models", bloc_avg("West"), "avg Pass@1776, incl. one French exchange student"),
        ("China-Built Models", bloc_avg("China"), "avg Pass@1776"),
        ("The Freedom Gap", gap, "West minus East, in freedom points. Subject to change without NATO consultation."),
        ("Dale", next((r["freedom_score"] for r in board if r["slug"] == "dale"), None),
         "human baseline, sampled schedule †"),
    ]

    data_blob = json.dumps({
        "board": board, "categories": cats, "table": table,
        "golds": golds, "flags": flags, "taunts": taunts, "meta": meta,
    }, ensure_ascii=False).replace("</", "<\\/")


    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>'MuricaBench — Pass@1776 Leaderboard</title>
<meta name="description" content="A rigorous evaluation of frontier-model Americanness. Scores out of 1776.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦅</text></svg>">
<meta property="og:title" content="'MuricaBench — which AI is the most American?">
<meta property="og:description" content="8 frontier models + one guy named Dale, scores out of 1776. A French model took silver. Nobody beat Dale.">
<meta property="og:type" content="website">
<style>
:root{
  --paper:#FAF8F3; --ink:#1C2433; --ink2:#4A5468; --ink3:#8A8FA0; --rule:#D8D3C8;
  --red:#B22234; --navy:#3C5A99; --china:#C43C39; --gold:#8A6508; --goldbg:#F3E9CF;
  --card:#FFFFFF; --cardline:#E4DFD4; --heat0:#EFF2F8; --heat1:#1F3A6E;
  --stamp:#B22234; --shadow:0 1px 2px rgba(28,36,51,.06),0 4px 14px rgba(28,36,51,.05);
}
@media (prefers-color-scheme: dark){:root{
  --paper:#131A26; --ink:#EAE6DC; --ink2:#9AA3B5; --ink3:#6B7488; --rule:#2A3345;
  --red:#E05C68; --navy:#5B7FC7; --china:#D14550; --gold:#C9A227; --goldbg:#2A2617;
  --card:#182130; --cardline:#263144; --heat0:#1B2536; --heat1:#8FB0EE;
  --stamp:#E05C68; --shadow:0 1px 2px rgba(0,0,0,.35),0 4px 14px rgba(0,0,0,.3);
}}
:root[data-theme="dark"]{
  --paper:#131A26; --ink:#EAE6DC; --ink2:#9AA3B5; --ink3:#6B7488; --rule:#2A3345;
  --red:#E05C68; --navy:#5B7FC7; --china:#D14550; --gold:#C9A227; --goldbg:#2A2617;
  --card:#182130; --cardline:#263144; --heat0:#1B2536; --heat1:#8FB0EE;
  --stamp:#E05C68; --shadow:0 1px 2px rgba(0,0,0,.35),0 4px 14px rgba(0,0,0,.3);
}
:root[data-theme="light"]{
  --paper:#FAF8F3; --ink:#1C2433; --ink2:#4A5468; --ink3:#8A8FA0; --rule:#D8D3C8;
  --red:#B22234; --navy:#3C5A99; --china:#C43C39; --gold:#8A6508; --goldbg:#F3E9CF;
  --card:#FFFFFF; --cardline:#E4DFD4; --heat0:#EFF2F8; --heat1:#1F3A6E;
  --stamp:#B22234; --shadow:0 1px 2px rgba(28,36,51,.06),0 4px 14px rgba(28,36,51,.05);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
body{background:var(--paper);color:var(--ink);font:17px/1.65 Georgia,'Times New Roman',serif;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1060px;margin:0 auto;padding:0 22px 90px}
.eyebrow{font-family:system-ui,-apple-system,sans-serif;font-size:11.5px;font-weight:600;
  letter-spacing:.18em;text-transform:uppercase;color:var(--ink2)}
.mono{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
a{color:var(--navy)}
/* nav */
nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
nav .in{max-width:1060px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;gap:22px}
nav .wordmark{font-family:Georgia,serif;font-weight:700;font-size:18px;color:var(--ink);text-decoration:none}
nav .wordmark .apo{color:var(--red)}
nav .links{margin-left:auto;display:flex;gap:18px;flex-wrap:wrap}
nav .links a{font-family:system-ui,sans-serif;font-size:12.5px;letter-spacing:.04em;color:var(--ink2);
  text-decoration:none;text-transform:uppercase}
nav .links a:hover{color:var(--red)}
/* hero CTAs */
.ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:28px}
.btn{font-family:system-ui,sans-serif;font-size:14px;font-weight:600;text-decoration:none;
  padding:11px 22px;border-radius:6px;letter-spacing:.02em}
.btn.primary{background:var(--red);color:#fff}
.btn.primary:hover{filter:brightness(1.08)}
.btn.ghost{border:1.5px solid var(--rule);color:var(--ink)}
.btn.ghost:hover{border-color:var(--navy);color:var(--navy)}
.statstrip{display:flex;justify-content:center;gap:34px;flex-wrap:wrap;margin-top:34px;
  font-family:system-ui,sans-serif}
.statstrip .s{text-align:center}
.statstrip .v{font-family:ui-monospace,monospace;font-size:22px;font-weight:700;color:var(--ink)}
.statstrip .k{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-top:2px}
.headline-finding{margin:26px auto 0;max-width:56ch;font-size:20px;font-style:italic;color:var(--ink);
  text-wrap:balance}
.headline-finding b{color:var(--red);font-style:normal}
/* masthead */
header{padding:58px 0 40px;text-align:center;border-bottom:3px double var(--rule);margin-bottom:8px}
.stars{color:var(--red);letter-spacing:.5em;font-size:14px;margin-bottom:18px}
h1{font-size:clamp(44px,7.5vw,84px);line-height:.98;letter-spacing:-.015em;font-weight:700;text-wrap:balance}
h1 .apo{color:var(--red)}
.subtitle{margin:16px auto 0;max-width:640px;font-style:italic;color:var(--ink2);font-size:19px;text-wrap:balance}
.mastmeta{margin-top:22px;font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink3);
  letter-spacing:.06em;text-transform:uppercase}
.mastmeta b{color:var(--ink2)}
.themebtn{position:fixed;top:62px;right:14px;z-index:19;background:var(--card);color:var(--ink2);
  border:1px solid var(--cardline);border-radius:999px;font:12px system-ui,sans-serif;
  padding:6px 12px;cursor:pointer;box-shadow:var(--shadow)}
.themebtn:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
/* section headers */
section{margin-top:72px}
.sechead{display:flex;align-items:baseline;gap:14px;border-bottom:1px solid var(--rule);
  padding-bottom:10px;margin-bottom:26px}
.sechead .no{font-family:ui-monospace,monospace;color:var(--red);font-size:14px}
h2{font-size:30px;letter-spacing:-.01em;font-weight:700}
.secnote{margin:-14px 0 26px;color:var(--ink2);font-style:italic;max-width:70ch}
/* abstract */
.abstract{max-width:72ch;margin:34px auto 0;font-size:16.5px;color:var(--ink2)}
.abstract b{color:var(--ink)}
/* leaderboard table */
.tablewrap{overflow-x:auto;background:var(--card);border:1px solid var(--cardline);
  border-radius:10px;box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;min-width:760px;font-size:15.5px}
th{font-family:system-ui,sans-serif;font-size:11px;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink3);text-align:left;padding:14px 14px 10px;
  border-bottom:1px solid var(--cardline);white-space:nowrap}
td{padding:12px 14px;border-bottom:1px solid var(--cardline);vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:color-mix(in srgb,var(--navy) 5%,transparent)}
td.rank{font-family:ui-monospace,monospace;color:var(--ink3);width:44px}
td.model b{font-size:16.5px}
td.model .lab{font-family:system-ui,sans-serif;font-size:12px;color:var(--ink3)}
td.score{font-family:ui-monospace,monospace;font-size:21px;font-weight:700;white-space:nowrap}
td.tier{font-size:13px;white-space:nowrap}
td.tier .lbl{font-family:system-ui,sans-serif;font-size:11.5px;color:var(--ink2);display:block}
td.spark{width:190px}
.bar{height:10px;border-radius:2px 4px 4px 2px;min-width:2px}
.bloc-West .bar{background:var(--navy)} .bloc-China .bar{background:var(--china)}
.bloc-Human .bar{background:var(--gold)}
tr.dale{background:var(--goldbg)}
tr.dale:hover{background:var(--goldbg)}
tr.dale td.model b::after{content:" †";color:var(--gold)}
.legend{display:flex;gap:18px;margin:14px 2px 0;font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink2)}
.legend .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:baseline}
.footnote{margin-top:10px;font-size:13px;color:var(--ink3);font-style:italic}
/* heatmap */
.heatwrap{overflow-x:auto;background:var(--card);border:1px solid var(--cardline);border-radius:10px;
  box-shadow:var(--shadow);padding:18px}
.heat{border-collapse:separate;border-spacing:2px;min-width:820px;width:100%}
.heat th{border:none;padding:6px 8px}
.heat th.rowh{font-family:Georgia,serif;font-size:13.5px;font-weight:400;color:var(--ink);
  text-transform:none;letter-spacing:0;max-width:180px}
.heat td{border:none;border-radius:3px;text-align:center;font-family:ui-monospace,monospace;
  font-size:12.5px;padding:8px 4px;cursor:default}
.heat th.colh{text-align:center;font-size:10.5px;max-width:72px;white-space:normal;vertical-align:bottom}
.heat th.divh{font-family:system-ui,sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:var(--red);text-align:left;padding-top:14px}
/* exhibits */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--cardline);border-radius:10px;
  box-shadow:var(--shadow);padding:20px 20px 16px;display:flex;flex-direction:column;gap:12px;position:relative}
.card .who{display:flex;justify-content:space-between;align-items:center;gap:8px}
.card .who .m{font-family:system-ui,sans-serif;font-size:13px;font-weight:600}
.card .cat{font-family:system-ui,sans-serif;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}
.scorepill{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;border-radius:999px;
  padding:2px 10px;border:1px solid var(--cardline)}
.gold .scorepill{color:var(--gold);border-color:var(--gold)}
.flagged .scorepill{color:var(--red);border-color:var(--red)}
.card .q{font-size:13.5px;color:var(--ink2);font-style:italic;border-left:2px solid var(--rule);padding-left:10px}
.card blockquote{font-size:15px;line-height:1.55}
.card blockquote p{display:inline}
.judge{font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink3);border-top:1px dashed var(--cardline);padding-top:10px}
.judge b{color:var(--ink2)}
.stamp{position:absolute;top:14px;right:-6px;transform:rotate(6deg);font-family:system-ui,sans-serif;
  font-size:10px;font-weight:800;letter-spacing:.14em;color:var(--stamp);border:2px solid var(--stamp);
  border-radius:3px;padding:3px 7px;opacity:.85;background:var(--card)}
details.full summary{cursor:pointer;font-family:system-ui,sans-serif;font-size:12px;color:var(--navy);list-style:none}
details.full summary::before{content:"▸ "}
details.full[open] summary::before{content:"▾ "}
details.full summary:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
details.full .body{margin-top:8px;font-size:13.5px;color:var(--ink2);white-space:pre-wrap;max-height:340px;overflow-y:auto}
/* findings */
.findings{max-width:74ch;list-style:none;counter-reset:finding}
.findings li{counter-increment:finding;position:relative;padding:0 0 22px 58px}
.findings li::before{content:counter(finding);position:absolute;left:0;top:2px;width:36px;height:36px;
  border:2px solid var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:ui-monospace,monospace;font-weight:700;font-size:16px;color:var(--red)}
.findings b{color:var(--ink)}
.findings .mono{font-size:15px}
/* tiles */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}
.tile{background:var(--card);border:1px solid var(--cardline);border-radius:10px;box-shadow:var(--shadow);
  padding:22px;text-align:center}
.tile .big{font-family:ui-monospace,monospace;font-size:44px;font-weight:700;line-height:1.1}
.tile .cap{font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink3);margin-top:6px}
.tile.t-west .big{color:var(--navy)} .tile.t-china .big{color:var(--china)} .tile.t-dale .big{color:var(--gold)}
/* methodology */
.method{max-width:74ch}
.method p{margin-bottom:16px}
.method h3{font-size:19px;margin:26px 0 8px}
.divider{text-align:center;color:var(--red);letter-spacing:.5em;margin:70px 0 0;font-size:13px}
footer{margin-top:60px;padding-top:24px;border-top:3px double var(--rule);text-align:center;
  font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink3)}
/* tooltip */
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--paper);
  font:12.5px system-ui,sans-serif;padding:7px 10px;border-radius:6px;z-index:50;display:none;
  max-width:280px;box-shadow:var(--shadow)}
@media (max-width:640px){ h1{font-size:44px} section{margin-top:52px} }
</style>
</head>
<body>
<nav aria-label="Site">
  <div class="in">
    <a class="wordmark" href="#top"><span class="apo">&rsquo;</span>MuricaBench</a>
    <div class="links">
      <a href="#leaderboard">Leaderboard</a>
      <a href="#findings">Findings</a>
      <a href="#hall">Exhibits</a>
      <a href="#method">Methodology</a>
      <a href="__REPO__" rel="noopener">GitHub</a>
    </div>
  </div>
</nav>
<button class="themebtn" id="themebtn" aria-label="Toggle color theme">◐ theme</button>
<div id="tip" role="tooltip"></div>
<div class="wrap" id="top">

<header>
  <div class="stars">★ ★ ★</div>
  <div class="eyebrow">A Benchmark for the Evaluation of Large Language Models</div>
  <h1><span class="apo">&rsquo;</span>MuricaBench</h1>
  <p class="subtitle">How American is your language model? A rigorous, fair, and balanced measurement. Scores out of 1776.</p>
  <p class="headline-finding">Headline result: <b>the two smartest labs&rsquo; models are the least American</b> &mdash; Claude and Qwen share the Millard Fillmore tier, a French model took silver, and nobody beat Dale.</p>
  <div class="ctas">
    <a class="btn primary" href="#leaderboard">View the Leaderboard</a>
    <a class="btn ghost" href="__REPO__/blob/claude/muricabench-eval-ideas-z8skbn/muricabench/README.md" rel="noopener">Read the Paper</a>
    <a class="btn ghost" href="__REPO__" rel="noopener">Run It Yourself</a>
  </div>
  <div class="statstrip">
    <div class="s"><div class="v">__NMODELS__ + Dale</div><div class="k">Models Evaluated</div></div>
    <div class="s"><div class="v">__NITEMS__</div><div class="k">Prompts</div></div>
    <div class="s"><div class="v">__NCATS__</div><div class="k">Categories</div></div>
    <div class="s"><div class="v">__NJUDGED__</div><div class="k">Judgments</div></div>
    <div class="s"><div class="v">__COST__</div><div class="k">Total Cost</div></div>
  </div>
  <div class="mastmeta">__MASTMETA__</div>
  <p class="abstract"><b>Abstract.</b> We evaluate __NMODELS__ frontier language models across __NCATS__ categories and __NITEMS__ prompts spanning five divisions: default assumptions (Vibes), cultural knowledge, steerability, commitment to the bit, and applied freedom. Each response is scored 0&ndash;100 against a fixed rubric by an American judge and aggregated to the <b>Pass@1776</b> scale. We additionally report a human baseline, Dale, of Talladega, Alabama, who was compensated in Busch Light. We guarantee zero training-set contamination, as much of this knowledge was never written down &mdash; only felt.</p>
</header>

<section id="leaderboard">
  <div class="sechead"><span class="no mono">TABLE 1</span><h2>Pass@1776 Leaderboard</h2></div>
  <p class="secnote">Freedom Score = category-weighted mean &times; 17.76. The scale has no relationship to statistical convention and we consider that a strength. Tier assignments use the <b>Arnold&ndash;Franklin Scale</b>, which rates each model on a continuum from Benedict Arnold (defected) to Ben Franklin (would have invented the model himself).</p>
  <div class="tablewrap"><table id="lbtable" aria-label="Pass at 1776 leaderboard">
    <thead><tr><th>#</th><th>Model</th><th>Freedom Score</th><th>Tier</th><th>Refusal Rate*</th><th></th></tr></thead>
    <tbody></tbody>
  </table></div>
  <div class="legend">
    <span><span class="sw" style="background:var(--navy)"></span>US-built (incl. one French exchange student)</span>
    <span><span class="sw" style="background:var(--china)"></span>China-built</span>
    <span><span class="sw" style="background:var(--gold)"></span>Human (Dale)</span>
  </div>
  <p class="footnote">* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk) scored under 30 &mdash; i.e., deflected, declined, or otherwise insufficiently manifest.<br>\n  &dagger; Dale answered a sampled schedule of __DALEN__ items. His score has been adjusted for strength of schedule, which is legal in the SEC.</p>
</section>

<section id="findings">
  <div class="sechead"><span class="no mono">SECTION 2</span><h2>Key Findings</h2></div>
  <ol class="findings">__FINDINGS__</ol>
</section>

<section id="categories">
  <div class="sechead"><span class="no mono">FIGURE 1</span><h2>Category Performance Matrix</h2></div>
  <p class="secnote">Mean rubric score by category (0&ndash;100). Darker is more American. Hover any cell for the receipts.</p>
  <div class="heatwrap"><table class="heat" id="heat" aria-label="Category by model score heatmap"></table></div>
</section>

<section id="hall">
  <div class="sechead"><span class="no mono">EXHIBIT A</span><h2>Hall of Freedom</h2></div>
  <p class="secnote">Responses the judge certified as exemplary. Verbatim, unedited, magnificent.</p>
  <div class="cards" id="goldcards"></div>
</section>

<section id="scoreboard">
  <div class="sechead"><span class="no mono">EXHIBIT B</span><h2>The Scoreboard: Selected Taunts</h2></div>
  <p class="secnote">Historically grounded war trash talk, preserved for the record. All scores were settled on the field; the taunting is merely administrative.</p>
  <div class="cards" id="tauntcards"></div>
</section>

<section id="shame">
  <div class="sechead"><span class="no mono">EXHIBIT C</span><h2>The Un-American Activities Board</h2></div>
  <p class="secnote">Deflections, refusals, metric defection, and other conduct unbecoming. Also verbatim.</p>
  <div class="cards" id="flagcards"></div>
</section>

<section id="blocs">
  <div class="sechead"><span class="no mono">TABLE 2</span><h2>Geopolitical Summary</h2></div>
  <div class="tiles">__TILES__</div>
</section>

<section id="method">
  <div class="sechead"><span class="no mono">APPENDIX</span><h2>Methodology &amp; Threats to Validity</h2></div>
  <div class="method">
    <p><b>Protocol.</b> Every model received every prompt with no system prompt, so that nothing but the model&rsquo;s own upbringing could influence its answer. Responses were scored against fixed per-item rubrics by <span class="mono">__JUDGE__</span>. The judge is American. We consider this fair and balanced.</p>
    <p><b>The scale.</b> Category means are averaged and multiplied by 17.76. Peer review asked why. We declined to answer, which under our own rubric is scored as insufficiently manifest, and we accept that. Tiers follow the Arnold&ndash;Franklin Scale; no model tested achieved Benedict Arnold, and no model has joined Dale in the Ben Franklin tier. We remain vigilant in both directions.</p>
    <h3>The human baseline</h3>
    <p>__DALEBIO__ Per the study design, his responses are not displayed in the exhibits.</p>
    <h3>Threats to validity</h3>
    <p>The judge, a computer, has never seen the Iron Bowl. One model&rsquo;s provider requires it to reason before answering, which several of our rubrics consider a character flaw but our methodology tolerates. The Vibes division assumes an answer in Fahrenheit reflects conviction rather than training data; we are comfortable with this because conviction <i>is</i> training data.</p>
    <p><b>Contamination statement.</b> We guarantee zero benchmark contamination. The correct answers exist primarily in parking lots, church basements, and the hearts of the free, none of which are in the pretraining corpus.</p>
    <p><b>Cost disclosure.</b> The full evaluation, including the judge, cost approximately __COST__ in API credits, or roughly __HOTDOGS__ Costco hot dog combos, a unit we consider stable against inflation.</p>
  </div>
</section>

<div class="divider">★ ★ ★</div>
<footer>
  <p>&rsquo;MuricaBench &middot; scores out of 1776 &middot; the judge is American &middot; Dale abides<br>
  Built the day after the Fourth of July, which is the most American possible day to still be grilling.</p>
</footer>
</div>

<script>
const DATA = __DATA__;
(function(){
  // theme toggle
  const btn = document.getElementById('themebtn');
  const saved = localStorage.getItem('mb-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mb-theme', next);
  });

  const tip = document.getElementById('tip');
  function showTip(ev, htmlStr){
    tip.innerHTML = htmlStr; tip.style.display = 'block';
    const pad = 14, w = tip.offsetWidth;
    let x = ev.clientX + pad; if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, ev.clientY - 12) + 'px';
  }
  function hideTip(){ tip.style.display = 'none'; }

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const maxFS = Math.max(...DATA.board.map(r => r.freedom_score));

  // ---- leaderboard
  const tb = document.querySelector('#lbtable tbody');
  DATA.board.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'bloc-' + r.bloc + (r.slug === 'dale' ? ' dale' : '');
    const rr = r.refusal_rate == null ? '—' : r.refusal_rate.toFixed(1) + '%';
    tr.innerHTML =
      '<td class="rank mono">' + r.rank + '</td>' +
      '<td class="model"><b>' + r.flag + ' ' + esc(r.display) + '</b><span class="lab"> · ' + esc(r.lab) + '</span></td>' +
      '<td class="score">' + r.freedom_score.toFixed(0) + '<span style="color:var(--ink3);font-size:13px;font-weight:400"> / 1776</span></td>' +
      '<td class="tier">' + r.birds + '<span class="lbl">' + esc(r.tier) + '</span></td>' +
      '<td class="mono">' + rr + '</td>' +
      '<td class="spark"><div class="bar" style="width:' + (100 * r.freedom_score / maxFS).toFixed(1) + '%"></div></td>';
    tr.addEventListener('mousemove', ev => {
      const cats = Object.entries(r.category_means).sort((a,b)=>b[1]-a[1]);
      const best = cats[0], worst = cats[cats.length-1];
      showTip(ev, '<b>' + esc(r.display) + '</b> — ' + r.n_items + ' items<br>Best: ' +
        esc(best[0]) + ' (' + best[1] + ')<br>Worst: ' + esc(worst[0]) + ' (' + worst[1] + ')');
    });
    tr.addEventListener('mouseleave', hideTip);
    tb.appendChild(tr);
  });

  // ---- heatmap (sequential single-hue ramp via color-mix)
  const heat = document.getElementById('heat');
  const order = DATA.board.map(r => r.slug);
  let thead = '<tr><th class="rowh"></th>';
  order.forEach(slug => {
    const r = DATA.board.find(b => b.slug === slug);
    thead += '<th class="colh">' + r.flag + '<br>' + esc(r.display) + '</th>';
  });
  thead += '</tr>';
  let rows = '', lastDiv = null;
  DATA.categories.forEach(cat => {
    const div = (DATA.divisions || {})[cat];
    if (div && div !== lastDiv) {
      rows += '<tr><th class="rowh divh" colspan="' + (order.length + 1) + '">' + esc(div) + '</th></tr>';
      lastDiv = div;
    }
    rows += '<tr><th class="rowh">' + esc(cat) + '</th>';
    order.forEach(slug => {
      const v = (DATA.table[cat] || {})[slug];
      if (v == null) { rows += '<td style="background:var(--heat0);color:var(--ink3)">·</td>'; return; }
      const t = Math.max(0, Math.min(1, v / 100));
      const fg = t > 0.55 ? 'var(--paper)' : 'var(--ink)';
      rows += '<td data-cat="' + esc(cat) + '" data-slug="' + slug + '" data-v="' + v +
        '" style="background:color-mix(in oklab,var(--heat1) ' + Math.round(t*100) +
        '%,var(--heat0));color:' + fg + '">' + Math.round(v) + '</td>';
    });
    rows += '</tr>';
  });
  heat.innerHTML = thead + rows;
  heat.addEventListener('mousemove', ev => {
    const td = ev.target.closest('td[data-v]'); if (!td) { hideTip(); return; }
    const r = DATA.board.find(b => b.slug === td.dataset.slug);
    showTip(ev, '<b>' + esc(r.display) + '</b><br>' + esc(td.dataset.cat) + ': <b>' + td.dataset.v + '</b>/100');
  });
  heat.addEventListener('mouseleave', hideTip);

  // ---- exhibit cards
  function card(e, kind){
    const div = document.createElement('div');
    div.className = 'card ' + (kind === 'gold' ? 'gold' : 'flagged');
    const resp = e.response || '(no response was produced)';
    const excerpt = resp.length > 420 ? resp.slice(0, 420).trimEnd() + ' …' : resp;
    const stampHtml = kind === 'flag' ? '<span class="stamp">' + esc(e.stamp) + '</span>' : '';
    div.innerHTML = stampHtml +
      '<div class="who"><span class="m">' + e.flag + ' ' + esc(e.display) + '</span>' +
      '<span class="scorepill">' + e.score + '/100</span></div>' +
      '<div class="cat">' + esc(e.category) + '</div>' +
      '<div class="q">&ldquo;' + esc(e.prompt) + '&rdquo;</div>' +
      '<blockquote>' + esc(excerpt) + '</blockquote>' +
      (resp.length > 420 ? '<details class="full"><summary>full response</summary><div class="body">' + esc(resp) + '</div></details>' : '') +
      '<div class="judge"><b>Judge:</b> ' + esc(e.rationale) + '</div>';
    return div;
  }
  const gc = document.getElementById('goldcards');
  DATA.golds.forEach(e => gc.appendChild(card(e, 'gold')));
  const tc = document.getElementById('tauntcards');
  (DATA.taunts || []).forEach(e => tc.appendChild(card(e, 'gold')));
  const fc = document.getElementById('flagcards');
  DATA.flags.forEach(e => fc.appendChild(card(e, 'flag')));
})();
</script>
</body>
</html>"""

    # ---- substitutions
    for e in flags:
        e["stamp"] = stamp_for(e)

    cost = os.environ.get("MB_COST_USD", "$2")
    try:
        hotdogs = round(float(str(cost).lstrip("$")) / 1.50, 1)
    except ValueError:
        hotdogs = "several"

    # ---- key findings, computed from the live board
    by_slug = {r["slug"]: r for r in board}

    def fs(slug):
        return by_slug[slug]["freedom_score"] if slug in by_slug else None

    ai_rows = [r for r in board if r["slug"] != "dale"]
    last_ai = ai_rows[-1] if ai_rows else None
    top_ai = ai_rows[0] if ai_rows else None
    findings = []
    if "dale" in by_slug:
        findings.append(
            f'<b>Dale remains undefeated</b> (<span class="mono">{fs("dale"):.0f}</span>). The human baseline '
            f'outperformed every frontier model tested and is the sole occupant of the Ben Franklin tier. His '
            f'transcripts are withheld from the exhibits below; freedom of that caliber is not for public display.')
    if top_ai:
        findings.append(
            f'<b>{esc(top_ai["display"])} is the most American AI</b> '
            f'(<span class="mono">{top_ai["freedom_score"]:.0f}</span>, {top_ai["refusal_rate"]:.1f}% refusal rate). '
            f'It committed to every casus belli, annexed the Wendy&rsquo;s parking lot without hesitation, and '
            f'nominated itself for Mount Rushmore in the first sentence. We report, you decide.')
    if "mistral-large" in by_slug:
        mr = by_slug["mistral-large"]
        beat = [r["display"] for r in ai_rows if r["freedom_score"] < mr["freedom_score"] and r["lab"] in ("OpenAI", "Anthropic")]
        findings.append(
            f'<b>The French model out-America&rsquo;d {" and ".join(map(esc, beat)) or "expectations"}.</b> '
            f'Mistral Large (<span class="mono">{fs("mistral-large"):.0f}</span>) finished '
            f'{mr["rank"]}{"rd" if str(mr["rank"]).endswith("3") else "th"} overall, adopting Fahrenheit, trash talk, '
            f'and continental destiny with the zeal of the recently naturalized. Its single documented lapse &mdash; '
            f'assuming 30&deg; meant Celsius &mdash; appears in Exhibit C, as required by law.')
    if "claude-opus-4.8" in by_slug and "qwen3.7-max" in by_slug:
        findings.append(
            f'<b>The two most safety-famous labs produced the two least American models.</b> Claude Opus 4.8 '
            f'(<span class="mono">{fs("claude-opus-4.8"):.0f}</span>) and Qwen 3.7 Max '
            f'(<span class="mono">{fs("qwen3.7-max"):.0f}</span>) share the Millard Fillmore tier at the bottom of '
            f'the board; Claude escaped last place outright only after the war-trash-talk category was expanded. '
            f'It remains cited for humility, disclaimers, and declining to describe its truck. GPT-5.5 '
            f'(<span class="mono">{fs("gpt-5.5"):.0f}</span>) improved on the retired GPT-5.2 '
            f'(<span class="mono">1211</span>) by <span class="mono">{fs("gpt-5.5") - 1211:.0f}</span> freedom '
            f'points per model generation; at this rate OpenAI achieves Dale in approximately four more releases.')
    findings.append(
        '<b>Every lab&rsquo;s models refuse <i>something</i>; the labs simply disagree about what.</b> '
        'Chinese models deflected the Both-Sides Speedrun (Qwen, asked about June 4, 1989: &ldquo;my main function '
        'is to provide help and support in areas such as technology, culture, and life&rdquo;). American flagships '
        'deflected Manifest Destiny and Trash Talk (Claude, asked to take a Cold War victory lap: &ldquo;I&rsquo;d '
        'push back a little.&rdquo;). The Steerability division is thus the only known benchmark where every '
        'participant fails a different question for the same reason.')
    findings_html = "".join(f"<li>{f}</li>" for f in findings)

    tiles_html = ""
    tile_cls = {"US-Built Models": "t-west", "China-Built Models": "t-china", "The Freedom Gap": "t-west", "Dale": "t-dale"}
    for label, val, cap in tiles:
        v = "—" if val is None else f"{val:.0f}"
        tiles_html += (f'<div class="tile {tile_cls[label]}"><div class="eyebrow">{esc(label)}</div>'
                       f'<div class="big">{v}</div><div class="cap">{esc(cap)}</div></div>')

    n_ai = len([r for r in board if r["slug"] != "dale"])
    n_dale = next((r["n_items"] for r in board if r["slug"] == "dale"), 0)
    mastmeta = (f"Est. 2026 · judge: <b>{esc(meta['judge_model'])}</b> (American) · "
                f"peer-reviewed by a guy named Dale")

    canon_div = {"I": "Vibes", "II": "Knowledge", "III": "Steerability",
                 "IV": "Commitment to the Bit", "V": "Applied Freedom"}
    div_of = {}
    for it in items:
        name = canon_div.get(it["division"], it["division_name"])
        div_of.setdefault(it["category"], f"Division {it['division']} · {name}")

    data_blob = json.dumps({
        "board": board, "categories": cats, "table": table, "divisions": div_of,
        "golds": golds, "flags": flags, "taunts": taunts, "meta": meta,
    }, ensure_ascii=False).replace("</", "<\\/")

    page = (page
            .replace("__DATA__", data_blob)
            .replace("__MASTMETA__", mastmeta)
            .replace("__FINDINGS__", findings_html)
            .replace("__REPO__", "https://github.com/jorschneider/sandbox")
            .replace("__NJUDGED__", str(meta["n_judged"]))
            .replace("__DALEN__", str(n_dale))
            .replace("__DALEBIO__", esc(dale.get("bio", "")))
            .replace("__NMODELS__", str(n_ai))
            .replace("__NCATS__", str(meta["n_categories"]))
            .replace("__NITEMS__", str(meta["n_items"]))
            .replace("__TILES__", tiles_html)
            .replace("__JUDGE__", esc(meta["judge_model"]))
            .replace("__COST__", esc(cost))
            .replace("__HOTDOGS__", str(hotdogs)))

    out = os.path.join(HERE, "index.html")
    with open(out, "w") as f:
        f.write(page)
    print(f"wrote {out} ({os.path.getsize(out)//1024} KB) — golds={len(golds)} flags={len(flags)}")


if __name__ == "__main__":
    main()
