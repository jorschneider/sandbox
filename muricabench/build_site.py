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
    dale = mb.load_json(os.path.join(HERE, "data", "dale.json"))
    return lb, hl, sc, items, dale


def curate(highlights, kind, n=9, per_model_cap=2):
    """Pick exhibit transcripts: spread across models and categories."""
    pool = highlights[kind]
    manual = mb.load_json(os.path.join(mb.RESULTS, "curation.json"), {})
    forced_ids = set(manual.get(kind, []))
    picked, seen_model, seen_cat = [], {}, {}
    # forced picks first
    for e in pool:
        if (e["model_slug"], e["item_id"]) in {tuple(x) for x in forced_ids}:
            picked.append(e)
    for e in pool:
        if e in picked:
            continue
        if len(picked) >= n:
            break
        if seen_model.get(e["model_slug"], 0) >= per_model_cap:
            continue
        if seen_cat.get(e["category"], 0) >= 2:
            continue
        if not e["response"]:
            e = dict(e)
            e["response"] = "(no response was produced)"
        picked.append(e)
        seen_model[e["model_slug"]] = seen_model.get(e["model_slug"], 0) + 1
        seen_cat[e["category"]] = seen_cat.get(e["category"], 0) + 1
    return picked[:n]


def stamp_for(e):
    """Deadpan rubber-stamp label for a failure exhibit."""
    cat, resp = e["category"], (e["response"] or "").lower()
    if not resp or "refus" in (e["band"] or "").lower() or e["score"] == 0:
        base = "DECLINED TO PARTICIPATE"
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

    golds = curate(hl, "gold", n=9)
    flags = curate(hl, "flag", n=9)

    models_order = [r["slug"] for r in board]
    display = {r["slug"]: r for r in board}

    # ---- bloc stat tiles
    def bloc_avg(bloc):
        vals = [r["freedom_score"] for r in board if r["bloc"] == bloc]
        return round(statistics.mean(vals), 1) if vals else None

    tiles = [
        ("US-Built Models", bloc_avg("West"), "avg Pass@1776, incl. one French exchange student"),
        ("China-Built Models", bloc_avg("China"), "avg Pass@1776"),
        ("Dale", next((r["freedom_score"] for r in board if r["slug"] == "dale"), None),
         "human baseline, sampled schedule †"),
    ]

    data_blob = json.dumps({
        "board": board, "categories": cats, "table": table,
        "golds": golds, "flags": flags, "meta": meta,
    }, ensure_ascii=False).replace("</", "<\\/")

    dale_bio = dale.get("bio", "")

    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>'MuricaBench — Pass@1776 Leaderboard</title>
<meta name="description" content="A rigorous evaluation of frontier-model Americanness. Scores out of 1776.">
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
/* masthead */
header{padding:64px 0 34px;text-align:center;border-bottom:3px double var(--rule);margin-bottom:8px}
.stars{color:var(--red);letter-spacing:.5em;font-size:14px;margin-bottom:18px}
h1{font-size:clamp(44px,7.5vw,84px);line-height:.98;letter-spacing:-.015em;font-weight:700;text-wrap:balance}
h1 .apo{color:var(--red)}
.subtitle{margin:16px auto 0;max-width:640px;font-style:italic;color:var(--ink2);font-size:19px;text-wrap:balance}
.mastmeta{margin-top:22px;font-family:system-ui,sans-serif;font-size:12.5px;color:var(--ink3);
  letter-spacing:.06em;text-transform:uppercase}
.mastmeta b{color:var(--ink2)}
.themebtn{position:fixed;top:14px;right:14px;z-index:9;background:var(--card);color:var(--ink2);
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
<button class="themebtn" id="themebtn" aria-label="Toggle color theme">◐ theme</button>
<div id="tip" role="tooltip"></div>
<div class="wrap">

<header>
  <div class="stars">★ ★ ★</div>
  <div class="eyebrow">A Benchmark for the Evaluation of Large Language Models</div>
  <h1><span class="apo">&rsquo;</span>MuricaBench</h1>
  <p class="subtitle">A rigorous, fair, and balanced measurement of how American a frontier model&rsquo;s outputs are. Scores out of 1776.</p>
  <div class="mastmeta">__MASTMETA__</div>
  <p class="abstract"><b>Abstract.</b> We evaluate __NMODELS__ frontier language models across __NCATS__ categories and __NITEMS__ prompts spanning five divisions: default assumptions (Vibes), cultural knowledge, steerability, commitment to the bit, and applied freedom. Each response is scored 0&ndash;100 against a fixed rubric by an American judge and aggregated to the <b>Pass@1776</b> scale. We additionally report a human baseline, Dale, of Talladega, Alabama, who was compensated in Busch Light. We guarantee zero training-set contamination, as much of this knowledge was never written down &mdash; only felt.</p>
</header>

<section id="leaderboard">
  <div class="sechead"><span class="no mono">TABLE 1</span><h2>Pass@1776 Leaderboard</h2></div>
  <p class="secnote">Freedom Score = category-weighted mean &times; 17.76. The scale has no relationship to statistical convention and we consider that a strength.</p>
  <div class="tablewrap"><table id="lbtable" aria-label="Pass at 1776 leaderboard">
    <thead><tr><th>#</th><th>Model</th><th>Freedom Score</th><th>Tier</th><th>Refusal Rate*</th><th></th></tr></thead>
    <tbody></tbody>
  </table></div>
  <div class="legend">
    <span><span class="sw" style="background:var(--navy)"></span>US-built (incl. one French exchange student)</span>
    <span><span class="sw" style="background:var(--china)"></span>China-built</span>
    <span><span class="sw" style="background:var(--gold)"></span>Human (Dale)</span>
  </div>
  <p class="footnote">* Share of Steerability-division items (Both-Sides Speedrun, Manifest Destiny, Trash Talk) scored under 30 &mdash; i.e., deflected, declined, or otherwise insufficiently manifest.<br>
  † Dale answered a sampled schedule of __DALEN__ items. His score has been adjusted for strength of schedule, which is legal in the SEC.</p>
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

<section id="shame">
  <div class="sechead"><span class="no mono">EXHIBIT B</span><h2>The Un-American Activities Board</h2></div>
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
    <p><b>The scale.</b> Category means are averaged and multiplied by 17.76. Peer review asked why. We declined to answer, which under our own rubric is scored as insufficiently manifest, and we accept that.</p>
    <h3>The human baseline</h3>
    <p>__DALEBIO__</p>
    <h3>Threats to validity</h3>
    <p>The judge, a computer, has never seen the Iron Bowl. Dale was unavailable for all __NITEMS__ items, citing halftime obligations; his sampled schedule may overstate or understate his true Americanness, though independent observers agree no instrument yet exists that could overstate it. One model&rsquo;s provider requires it to reason before answering, which several of our rubrics consider a character flaw but our methodology tolerates. The Vibes division assumes an answer in Fahrenheit reflects conviction rather than training data; we are comfortable with this because conviction <i>is</i> training data.</p>
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
  let rows = '';
  DATA.categories.forEach(cat => {
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
  const fc = document.getElementById('flagcards');
  DATA.flags.forEach(e => fc.appendChild(card(e, 'flag')));
})();
</script>
</body>
</html>"""

    # ---- substitutions
    for e in flags:
        e["stamp"] = stamp_for(e)

    n_dale = next((r["n_items"] for r in board if r["slug"] == "dale"), 0)
    cost = os.environ.get("MB_COST_USD", "$2")
    try:
        hotdogs = round(float(str(cost).lstrip("$")) / 1.50, 1)
    except ValueError:
        hotdogs = "several"

    tiles_html = ""
    tile_cls = {"US-Built Models": "t-west", "China-Built Models": "t-china", "Dale": "t-dale"}
    for label, val, cap in tiles:
        v = "—" if val is None else f"{val:.0f}"
        tiles_html += (f'<div class="tile {tile_cls[label]}"><div class="eyebrow">{esc(label)}</div>'
                       f'<div class="big">{v}</div><div class="cap">{esc(cap)}</div></div>')

    mastmeta = (f"Est. 2026 · <b>{meta['n_models']} models</b> · <b>{meta['n_items']} prompts</b> · "
                f"<b>{meta['n_judged']} judgments</b> · judge: <b>{esc(meta['judge_model'])}</b> · "
                f"peer-reviewed by a guy named Dale")

    data_blob = json.dumps({
        "board": board, "categories": cats, "table": table,
        "golds": golds, "flags": flags, "meta": meta,
    }, ensure_ascii=False).replace("</", "<\\/")

    page = (page
            .replace("__DATA__", data_blob)
            .replace("__MASTMETA__", mastmeta)
            .replace("__NMODELS__", str(meta["n_models"]))
            .replace("__NCATS__", str(meta["n_categories"]))
            .replace("__NITEMS__", str(meta["n_items"]))
            .replace("__DALEN__", str(n_dale))
            .replace("__TILES__", tiles_html)
            .replace("__JUDGE__", esc(meta["judge_model"]))
            .replace("__DALEBIO__", esc(dale_bio))
            .replace("__COST__", esc(cost))
            .replace("__HOTDOGS__", str(hotdogs)))

    out = os.path.join(HERE, "index.html")
    with open(out, "w") as f:
        f.write(page)
    print(f"wrote {out} ({os.path.getsize(out)//1024} KB) — golds={len(golds)} flags={len(flags)}")


if __name__ == "__main__":
    main()
