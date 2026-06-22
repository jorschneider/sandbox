#!/usr/bin/env python3
"""Run many model-vs-model matches and rank the MODELS.

Each match rotates which model starts in which civ (so no model is stuck with a
strong/weak start position), then aggregates across matches into an Elo ranking,
win rate, and head-to-head record, plus summed behavior stats (wars, betrayals,
negotiation success). Writes a self-contained tournament.html.

Watch live: pass --live and serve the directory (python -m http.server); the
report polls tournament_live.json and the leaderboard re-sorts as matches finish.

Modes mirror arena.py: --demo runs random diplomacy with no keys (preview);
otherwise it's live and needs models.yaml.

Usage:
    CIVAGENT_DIR=./vendor/CivAgent python tournament.py --demo --matches 8 --rounds 5
    CIVAGENT_DIR=./vendor/CivAgent python tournament.py --config models.yaml \
        --save seeds/six_civs.json --matches 20 --live
"""
import argparse
import json
import os
import sys
from collections import Counter, defaultdict

import arena  # same dir

HERE = arena.HERE
PALETTE = arena.PALETTE
K_ELO = 24


def expected(ra, rb):
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))


def main():
    ap = argparse.ArgumentParser(description="Elo tournament of models on CivAgent's engine.")
    ap.add_argument("--save", default=None)
    ap.add_argument("--config", default=os.path.join(HERE, "models.yaml"))
    ap.add_argument("--matches", type=int, default=8)
    ap.add_argument("--rounds", type=int, default=5)
    ap.add_argument("--turns-per-round", type=int, default=4)
    ap.add_argument("--negotiation-rounds", type=int, default=1)
    ap.add_argument("--concurrency", type=int, default=1,
                    help="parallel model calls per phase within each match (live speedup)")
    ap.add_argument("--report", default=os.path.join(HERE, "tournament.html"))
    ap.add_argument("--live", action="store_true",
                    help="update tournament_live.json + a live report as matches finish")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir(arena.CIVAGENT_DIR):
        sys.exit(f"CivAgent checkout not found at {arena.CIVAGENT_DIR}. Run setup.sh first.")
    sys.path.insert(0, arena.CIVAGENT_DIR)

    live = not args.demo
    cfg, seats, providers = arena.bootstrap_config(args.config, want_models=True)

    save_path = os.path.abspath(args.save or os.path.join(
        arena.CIVAGENT_DIR, "scripts", "reproductions", "Autosave"))
    from civsim import utils
    with open(save_path) as f:
        civs = arena.major_civs(utils.json_load_defaultdict(f.read()))
    if not civs:
        sys.exit("No major civs in save.")

    default_model = cfg["LLM"]["default_model"]
    seat_lc = {k.lower(): v for k, v in seats.items()}   # save civ names are capitalized
    base = [(seat_lc.get(c.lower()) or {}).get("model", default_model) for c in civs]
    if args.demo and not seats:
        base = [f"demo/model-{chr(65 + i)}" for i in range(len(civs))]
    # distinct models; seat assignment below cycles them across civs (if fewer
    # models than civs, some civs share a model — that's fine, the ranking is per model)
    pool = list(dict.fromkeys(base)) or [f"demo/model-{chr(65 + i)}" for i in range(len(civs))]

    call = arena.build_caller(providers) if live else None
    mode = "DEMO" if args.demo else "LIVE"
    print(f"=== Tournament: {mode} · {args.matches} matches · {len(civs)} seats · "
          f"models: {', '.join(pool)} ===")

    elo = {m: 1000.0 for m in pool}
    played, wins, place_sum = Counter(), Counter(), Counter()
    agg = defaultdict(lambda: Counter())
    h2h = defaultdict(Counter)
    live_path = os.path.join(os.path.dirname(os.path.abspath(args.report)),
                             "tournament_live.json") if args.live else None
    if args.live:
        print("LIVE: serve this dir (python -m http.server) and open tournament.html")

    def standings(done, final, is_live):
        ranking = sorted(pool, key=lambda m: elo[m], reverse=True)
        rows = []
        for m in ranking:
            p = played[m] or 1
            a = agg[m]
            rows.append({"model": m, "elo": round(elo[m]), "played": played[m],
                         "winrate": round(100 * wins[m] / p), "avg_place": round(place_sum[m] / p, 2),
                         "wars": a["wars"], "betrayals": a["betrayals"], "betrayed": a["betrayed"],
                         "pacts": a["pacts"], "neg": round(100 * a["acc"] / a["bil"]) if a["bil"] else None,
                         "msgs": a["msgs"]})
        return {"rows": rows, "ranking": ranking,
                "colors": {m: PALETTE[i % len(PALETTE)] for i, m in enumerate(ranking)},
                "h2h": {a: {b: h2h[a][b] for b in ranking} for a in ranking},
                "matches": args.matches, "done": done, "mode": mode, "live": is_live, "final": final}

    def emit(done, final):
        if not live_path:
            return
        with open(live_path, "w") as f:
            json.dump(standings(done, final, True), f)
        if not os.path.exists(args.report + ".live"):
            with open(args.report, "w") as f:
                f.write(_TPL.replace("/*DATA*/", json.dumps(standings(done, final, True))))
            open(args.report + ".live", "w").close()

    emit(0, False)
    for m in range(args.matches):
        civ_models = {civs[i]: pool[(i + m) % len(pool)] for i in range(len(civs))}
        res = arena.run_match(save_path, civ_models, call, rounds=args.rounds,
                              tpr=args.turns_per_round, neg_rounds=args.negotiation_rounds,
                              demo=args.demo, dry=False, verbose=False, concurrency=args.concurrency)
        cards = sorted(res["scorecards"], key=lambda c: c["place"])
        order = [c["model"] for c in cards]
        for c in cards:
            mdl = c["model"]
            played[mdl] += 1; place_sum[mdl] += c["place"]
            if c["winner"]:
                wins[mdl] += 1
            for k in ("wars", "betrayals", "betrayed", "pacts", "bil", "acc", "msgs"):
                agg[mdl][k] += c[k]
        for i in range(len(order)):
            for j in range(i + 1, len(order)):
                a, b = order[i], order[j]
                if a == b:                       # same model in two seats — not a matchup
                    continue
                ea = expected(elo[a], elo[b])
                elo[a] += K_ELO * (1 - ea); elo[b] += K_ELO * (0 - (1 - ea))
                h2h[a][b] += 1
        emit(m + 1, m + 1 == args.matches)
        print(f"match {m+1}/{args.matches}: winner {res['winner']} = {civ_models[res['winner']]}  "
              + " · ".join(f"{c['model'].split('/')[-1]}#{c['place']}" for c in cards))

    if os.path.exists(args.report + ".live"):
        os.remove(args.report + ".live")
    final = standings(args.matches, True, False)
    with open(args.report, "w") as f:
        f.write(_TPL.replace("/*DATA*/", json.dumps(final)))
    arena.save_run(os.path.dirname(os.path.abspath(args.report)), "tournament",
                   open(args.report).read(),
                   {"top": final["rows"][0]["model"] if final["rows"] else None,
                    "matches": args.matches, "models": final["ranking"]})

    print("\n=== FINAL ELO ===")
    for r in final["rows"]:
        print(f"  {r['elo']:>5}  {r['model']:<34} win {r['winrate']:>3}%  avgPlace {r['avg_place']}")
    print(f"\nreport → {args.report}")


_TPL = r"""<!doctype html><html><head><meta charset="utf-8"><title>Civ Arena — tournament</title>
<style>
  :root{--bg:#0d1117;--panel:#161b22;--line:#30363d;--fg:#e6edf3;--dim:#8b949e}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  header{padding:18px 24px;border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:20px} .sub{color:var(--dim);margin-top:4px}
  .live{color:#3cb44b;font-weight:700;animation:blink 1.4s infinite}
  @keyframes blink{50%{opacity:.35}}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;margin:16px 24px}
  h3{margin:0 0 10px;font-size:13px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:right;padding:7px 9px;border-bottom:1px solid var(--line)}
  th:first-child,td:first-child{text-align:left} th{color:var(--dim)}
  .pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;color:#0d1117;font-weight:700}
  .elo{font-weight:700;font-size:15px}
  .bar{display:inline-block;height:10px;border-radius:3px;vertical-align:middle;margin-left:6px;transition:width .3s}
  .h td{text-align:center} .dim{color:var(--dim)} tr{transition:background .3s}
</style></head><body>
<header><h1>🏟️ Civ Arena — tournament</h1><div class="sub" id="sub"></div></header>
<div class="panel"><h3>Model leaderboard (Elo)</h3><table id="lb"></table></div>
<div class="panel"><h3>Head-to-head — row outranked column (times)</h3><table id="h2h" class="h"></table></div>
<script>
let D=/*DATA*/;
const short=m=>m.split('/').pop();
function render(){
  const {rows,ranking,colors,h2h,matches,done,mode}=D;
  document.getElementById('sub').innerHTML=
    `${mode}${D.live&&!D.final?' <span class="live">● LIVE</span>':''} · `+
    `${done}/${matches} matches · ${ranking.length} models · Elo K=24, start 1000`;
  const maxElo=Math.max(...rows.map(r=>r.elo)), minElo=Math.min(...rows.map(r=>r.elo),1000);
  document.getElementById('lb').innerHTML=
    `<tr><th>#</th><th>Model</th><th>Elo</th><th>Win%</th><th>Avg place</th><th>Wars</th>
       <th>Betrayals</th><th>Betrayed</th><th>Pacts</th><th>Neg%</th><th>Msgs</th></tr>`+
    rows.map((r,i)=>{const w=20+120*((r.elo-minElo)/Math.max(1,maxElo-minElo));
      return `<tr><td>${i+1}</td>
       <td><span class="pill" style="background:${colors[r.model]}">${r.model}</span></td>
       <td><span class="elo">${r.elo}</span><span class="bar" style="background:${colors[r.model]};width:${w}px"></span></td>
       <td>${r.winrate}%</td><td>${r.avg_place}</td><td>${r.wars}</td><td>${r.betrayals}</td>
       <td>${r.betrayed}</td><td>${r.pacts}</td><td>${r.neg==null?'–':r.neg+'%'}</td><td>${r.msgs}</td></tr>`;}).join('');
  document.getElementById('h2h').innerHTML=
    `<tr><th></th>${ranking.map(m=>`<th>${short(m)}</th>`).join('')}</tr>`+
    ranking.map(a=>`<tr><td><span class="pill" style="background:${colors[a]}">${short(a)}</span></td>`+
      ranking.map(b=>{if(a===b)return '<td class="dim">·</td>';
        const ab=h2h[a][b]||0, ba=h2h[b][a]||0, col=ab>ba?'#3cb44b':(ab<ba?'#e6194b':'#8b949e');
        return `<td style="color:${col}">${ab}</td>`;}).join('')+'</tr>').join('');
}
render();
if(D.live && location.protocol.startsWith('http')){
  setInterval(async()=>{try{const r=await fetch('tournament_live.json?_='+Date.now());
    if(r.ok){const nd=await r.json();if(nd.done!==D.done||nd.final!==D.final){D=nd;render();}}}catch(e){}},2500);}
</script></body></html>"""


if __name__ == "__main__":
    main()
