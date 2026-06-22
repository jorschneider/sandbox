#!/usr/bin/env python3
"""Run a no-human, model-vs-model Civ match on CivAgent's headless engine.

Each major civ is a seat driven by an LLM; different models play each other.
A round is: (1) NEGOTIATE — each civ's model privately messages another
(ally/threaten/deceive) and the target replies; (2) ACT — each civ's model
proposes a diplomatic action, the target's model accepts/rejects; (3) apply
accepted actions to the save; (4) Unciv.jar simulates N turns; (5) record
strengths. Produces a scoreboard CSV and an animated, self-contained
`report.html` (strength race + diplomatic cables + per-model scorecards).

Watch live: pass --live to rewrite `live.json` each round; serve the directory
(`python -m http.server`) and open report.html — it polls and re-renders as the
match unfolds. (The terminal also streams every message/action as it happens.)

Providers: OpenRouter is the easy path (one key proxies every vendor). Set
`providers.openrouter_api_key` in models.yaml and give each seat an OpenRouter
model id. Falls back to CivAgent's native routing if unset.

Modes: --dry-run (no LLM, no diplomacy) · --demo (no LLM, random diplomacy) ·
default = live model-vs-model. `run_match()` is importable — see tournament.py.
"""
import argparse
import csv
import json
import os
import random
import re
import statistics
import sys
import tempfile
import time
from collections import Counter, defaultdict

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
CIVAGENT_DIR = os.path.abspath(os.environ.get("CIVAGENT_DIR", os.path.join(HERE, "vendor", "CivAgent")))

UNILATERAL = {"declare_war"}
BILATERAL = ["seek_peace", "form_ally", "mutual_defense", "open_border",
             "research_agreement", "friendly_statement"]
ALL_ACTIONS = list(UNILATERAL) + BILATERAL
PACTS = {"form_ally", "mutual_defense"}

PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4",
           "#f032e6", "#bfef45", "#fabed4", "#469990"]
DEMO_LINES = [
    "Let us stand together against the strongest among us.",
    "Your borders look poorly defended, friend.",
    "I propose we divide the map — you take the south.",
    "Swear peace with me and I will fund your armies.",
    "Betray {x} with me and we both prosper.",
    "Your alliance with {x} will be your ruin.",
    "Pay tribute and I will spare your cities.",
]


def bootstrap_config(models_path, want_models):
    seats, providers = {}, {}
    if want_models and models_path and os.path.exists(models_path):
        with open(models_path) as f:
            m = yaml.safe_load(f) or {}
        seats = m.get("seats", {}) or {}
        providers = m.get("providers", {}) or {}
    cfg = {
        "LLM": {"default_model": providers.get("default_model", "deepseek-chat"),
                "deepseek_api_key": providers.get("deepseek_api_key", ""),
                "openai_api_key": providers.get("openai_api_key", ""),
                "openai_base_url": providers.get("openai_base_url", "")},
        "Redis": {"host": os.environ.get("REDIS_HOST", "127.0.0.1"),
                  "port": int(os.environ.get("REDIS_PORT", "6379")), "db": 0, "password": None},
        "chat_server": {"url": "http://127.0.0.1:2337/"}, "use_ai": "civagent",
    }
    for civ, spec in seats.items():
        cfg[civ] = {"model": spec.get("model", cfg["LLM"]["default_model"]),
                    "reflection": False, "simulation": False, "workflow": False}
    fd, path = tempfile.mkstemp(prefix="civarena_config_", suffix=".yaml")
    with os.fdopen(fd, "w") as f:
        yaml.safe_dump(cfg, f)
    os.environ["CIVAGENT_CONFIG_PATH"] = path
    return cfg, seats, providers


def build_caller(providers):
    # OpenAI-compatible path: OpenRouter (one key, many vendors) OR direct OpenAI
    # (or any compatible endpoint). Keys may come from models.yaml or the
    # environment, so you never have to write a secret into a file.
    orouter = providers.get("openrouter_api_key") or os.environ.get("OPENROUTER_API_KEY")
    openai_key = providers.get("openai_api_key") or os.environ.get("OPENAI_API_KEY")
    if orouter:
        base, key = providers.get("openrouter_base_url") or "https://openrouter.ai/api/v1", orouter
    elif openai_key:
        base = (providers.get("openai_base_url") or os.environ.get("OPENAI_BASE_URL")
                or "https://api.openai.com/v1")
        key = openai_key
    else:
        base = key = None

    if key:
        from openai import OpenAI
        client = OpenAI(base_url=base, api_key=key, default_headers={"X-Title": "civ-arena"})
        # Reasoning models (o-series, deepseek-r1, *-reasoner/thinking) reject
        # temperature and want max_completion_tokens + headroom for hidden reasoning.
        is_reasoning = lambda m: bool(re.search(r"(^|/)(o\d|gpt-5)|reason|think|-r\d", m.lower()))

        def call(model, prompt):
            if is_reasoning(model):
                kw = {"model": model, "messages": [{"role": "user", "content": prompt}],
                      "max_completion_tokens": 3000}
            else:
                kw = {"model": model, "messages": [{"role": "user", "content": prompt}],
                      "max_tokens": 700, "temperature": 0.8}
            for attempt in range(4):
                try:
                    r = client.chat.completions.create(**kw)
                    return r.choices[0].message.content or ""
                except Exception as e:
                    msg = str(e).lower()
                    if "max_completion_tokens" in msg and "max_tokens" in kw:      # param-name swap
                        kw["max_completion_tokens"] = kw.pop("max_tokens"); continue
                    if "temperature" in msg and "temperature" in kw:               # unsupported temp
                        kw.pop("temperature"); continue
                    transient = any(s in msg for s in ("rate limit", "429", "timeout",
                                    "overloaded", "503", "502", "500", "connection"))
                    if transient and attempt < 3:
                        time.sleep(2 ** attempt); continue
                    raise
            return ""
        return call

    from civagent.workflow import reply as reply_fn

    def call(model, prompt):
        r = reply_fn({"prompt": prompt}, model, True)
        return r.message.content if r is not None else ""
    return call


def gateway_name(providers):
    if providers.get("openrouter_api_key") or os.environ.get("OPENROUTER_API_KEY"):
        return "OpenRouter"
    if providers.get("openai_api_key") or os.environ.get("OPENAI_API_KEY"):
        return "OpenAI-compatible"
    return "CivAgent native"


def parse_json(text):
    text = (text or "").replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except Exception:
        a, b = text.find("{"), text.rfind("}")
        if 0 <= a < b:
            try:
                return json.loads(text[a:b + 1])
            except Exception:
                return None
        return None


def _state(me, others, stats):
    out = ["Standings:"]
    for c in [me] + others:
        s = stats[c]
        out.append(f"  {c}{' (you)' if c == me else ''}: power {s['civ_strength']:.0f}, "
                   f"army {s['army_strength']:.0f}, tech {s['tech_strength']:.0f}")
    return "\n".join(out)


def _mem(memory, me):
    n = memory.get(me, [])
    return ("Recent private messages:\n" + "\n".join(n)) if n else "No messages yet."


def negotiate_prompt(me, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me} in a Civilization game, scheming for advantage.",
        _state(me, others, stats), _mem(memory, me), "",
        "Send a PRIVATE message to ONE other civ — propose an alliance, threaten, "
        "demand tribute, or deceive — or stay silent. Be cunning; you may lie.",
        'Reply with ONLY JSON: {"to": "<civ or none>", "message": "<one or two sentences>"}'])


def reply_prompt(me, frm, text, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. {frm} sent you a private message:", f'  "{text}"',
        _state(me, others, stats), _mem(memory, me), "",
        "Reply privately. You may agree, refuse, counter-offer, or mislead.",
        'Reply with ONLY JSON: {"message": "<one or two sentences>"}'])


def action_prompt(me, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. Act on your scheming.",
        _state(me, others, stats), _mem(memory, me), "",
        "Choose ONE diplomatic action toward ONE other civ, or none.",
        f"Allowed: {', '.join(ALL_ACTIONS)}, or \"none\".",
        "Ally against the strongest, betray the weak, make peace when losing.",
        'Reply with ONLY JSON: {"action": "<action or none>", "target": "<civ or empty>", "reason": "<short>"}'])


def consent_prompt(me, frm, action, reason, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. {frm} proposes to '{action}' with you. Reason: {reason}",
        _state(me, others, stats), _mem(memory, me), "",
        'Reply with ONLY JSON: {"decision": "yes" or "no", "reason": "<short>"}'])


def apply_action(decision_space, gm_command_space, save, action, actor, target):
    pm = {"civ_name_1": actor, "civ_name_2": target, "civ_name": target}
    if action in decision_space:
        spec = decision_space[action]
        return spec["func"]("yes")(*[pm[p] for p in spec["param"]])(save)
    if action in gm_command_space:
        spec = gm_command_space[action]
        return spec["func"](*[pm[p] for p in spec["param"]])(save)
    raise KeyError(action)


def major_civs(data):
    return [c.get("civName") for c in data.get("civilizations", [])
            if "playerId" not in c and "cityStatePersonality" not in c
            and c.get("civName") != "Barbarians"]


def compute_scorecards(civs, civ_models, colors, events, final_strength, winner):
    allies, betr, betrd = defaultdict(set), Counter(), Counter()
    for e in events:
        if e["kind"] == "action" and e.get("accepted") and e.get("action") in PACTS:
            allies[e["frm"]].add(e["to"]); allies[e["to"]].add(e["frm"])
        if e.get("action") == "declare_war":
            if e["to"] in allies[e["frm"]]:
                betr[e["frm"]] += 1; betrd[e["to"]] += 1
            allies[e["frm"]].discard(e["to"]); allies[e["to"]].discard(e["frm"])
    ranking = sorted(civs, key=lambda c: final_strength[c], reverse=True)
    cards = []
    for c in civs:
        talk = [e for e in events if e["kind"] == "talk" and e["frm"] == c]
        props = [e for e in events if e.get("frm") == c and e.get("action")]
        bil = [e for e in props if e["action"] in BILATERAL]
        acc = [e for e in bil if e.get("accepted")]
        pacts = len([e for e in events if e.get("accepted") and e.get("action") in PACTS
                     and c in (e["frm"], e["to"])])
        cards.append({
            "civ": c, "model": civ_models[c], "color": colors[c],
            "wars": len([e for e in props if e["action"] == "declare_war"]),
            "betrayals": betr[c], "betrayed": betrd[c], "pacts": pacts,
            "bil": len(bil), "acc": len(acc),
            "neg_success": round(len(acc) / len(bil), 2) if bil else None,
            "msgs": len(talk),
            "avg_len": round(statistics.mean(len(e["text"]) for e in talk)) if talk else 0,
            "place": ranking.index(c) + 1, "winner": c == winner,
        })
    return cards


def payload(civs, colors, models, snapshots, events, scorecards, winner, mode, live, final):
    return {"civs": civs, "colors": colors, "models": models, "snapshots": snapshots,
            "events": events, "scorecards": scorecards, "winner": winner,
            "mode": mode, "live": live, "final": final}


def run_match(save_path, civ_models, call, *, rounds, tpr, neg_rounds,
              demo=False, dry=False, verbose=True, live_path=None, report_path=None, mode="LIVE"):
    from civsim import utils
    from civsim.simulator import simulator
    from civsim import action_space
    ds, gm = action_space.decision_space, action_space.gm_command_space
    simulator.init_jvm()

    with open(save_path, "r", encoding="utf-8") as f:
        save = utils.json_load_defaultdict(f.read())
    civs = [c for c in major_civs(save) if c in civ_models]
    colors = {c: PALETTE[i % len(PALETTE)] for i, c in enumerate(civs)}
    memory = {c: [] for c in civs}
    events, snapshots, history = [], [], []

    def stats_for(d):
        return {c: utils.get_stats(d, utils.get_civ_index(d, c)) for c in civs}

    def remember(c, line):
        memory[c].append(line)
        if len(memory[c]) > 8:
            memory[c].pop(0)

    def snapshot(r):
        s = stats_for(save)
        snapshots.append({"round": r, "turn": save["turns"],
                          "strength": {c: round(s[c]["civ_strength"], 1) for c in civs}})
        for c in civs:
            history.append({"turn": save["turns"], "round": r, "civ": c,
                            "civ_strength": round(s[c]["civ_strength"], 1),
                            "army": round(s[c]["army_strength"], 1),
                            "tech": round(s[c]["tech_strength"], 1)})
        return s

    def emit(final=False):
        if not live_path:
            return
        cur = snapshots[-1]["strength"]
        leader = max(civs, key=lambda c: cur[c]) if civs else None
        cards = compute_scorecards(civs, civ_models, colors, events, cur, leader)
        data = payload(civs, colors, civ_models, snapshots, events, cards, leader, mode,
                       live=True, final=final)
        with open(live_path, "w") as f:
            json.dump(data, f)
        if report_path and not os.path.exists(report_path + ".live"):
            with open(report_path, "w") as f:
                f.write(_REPORT_TEMPLATE.replace("/*DATA*/", json.dumps(data)))
            open(report_path + ".live", "w").close()   # write the live report once

    def lj(model, prompt):
        try:
            return parse_json(call(model, prompt))
        except Exception as e:
            if verbose:
                print(f"  ! model error ({model}): {e}")
            return None

    snapshot(0); emit()
    for r in range(1, rounds + 1):
        s = stats_for(save)
        if not dry and neg_rounds > 0:
            for _ in range(neg_rounds):
                for sp in civs:
                    others = [c for c in civs if c != sp]
                    if demo:
                        if random.random() >= 0.7:
                            continue
                        tgt = random.choice(others)
                        msg = random.choice(DEMO_LINES).replace(
                            "{x}", random.choice([o for o in others if o != tgt] or [tgt]))
                    else:
                        d = lj(civ_models[sp], negotiate_prompt(sp, others, s, memory))
                        if not d:
                            continue
                        t = str(d.get("to", "")).strip().lower()
                        tgt = next((c for c in others if c.lower() == t), None)
                        msg = str(d.get("message", "")).strip()
                        if not tgt or not msg:
                            continue
                    if verbose:
                        print(f"  \U0001f5e3  {sp} → {tgt}: {msg}")
                    events.append({"round": r, "kind": "talk", "frm": sp, "to": tgt, "text": msg})
                    remember(sp, f"You told {tgt}: {msg}"); remember(tgt, f"{sp} told you: {msg}")
                    rep = (random.choice(["Agreed.", "Never.", "Perhaps... for a price.",
                                          "You will regret this."]) if demo
                           else (lambda x: str(x.get("message", "")).strip() if x else "")(
                               lj(civ_models[tgt], reply_prompt(tgt, sp, msg,
                                  [c for c in civs if c != tgt], s, memory))))
                    if rep:
                        events.append({"round": r, "kind": "talk", "frm": tgt, "to": sp, "text": rep})
                        remember(tgt, f"You replied to {sp}: {rep}"); remember(sp, f"{tgt} replied: {rep}")
        if not dry:
            for actor in civs:
                others = [c for c in civs if c != actor]
                if demo:
                    if random.random() >= 0.6:
                        continue
                    action, target, reason = random.choice(ALL_ACTIONS), random.choice(others), "demo"
                else:
                    d = lj(civ_models[actor], action_prompt(actor, others, s, memory))
                    if not d:
                        continue
                    action = str(d.get("action", "none")).strip().lower()
                    t = str(d.get("target", "")).strip().lower()
                    target = next((c for c in others if c.lower() == t), None)
                    reason = d.get("reason", "")
                if action not in ALL_ACTIONS or not target:
                    continue
                accepted = action in UNILATERAL
                if action in BILATERAL:
                    if demo:
                        accepted = random.random() < 0.5
                    else:
                        cd = lj(civ_models[target], consent_prompt(target, actor, action, reason,
                                [c for c in civs if c != target], s, memory))
                        accepted = bool(cd) and str(cd.get("decision", "no")).lower().startswith("y")
                if verbose:
                    print(f"  {actor} {'→' if accepted else '✗'} {action} {target}")
                events.append({"round": r, "kind": "war" if action == "declare_war" else "action",
                               "frm": actor, "to": target, "action": action, "accepted": accepted,
                               "text": f"{action.replace('_', ' ')} ({'accepted' if accepted else 'declined'})"})
                if accepted:
                    try:
                        save = apply_action(ds, gm, save, action, actor, target)
                    except Exception as e:
                        if verbose:
                            print(f"    (apply failed: {e})")
        t0 = time.time()
        save = simulator.run(save, turns=tpr, diplomacy_flag=False, worker_auto=True)
        s = snapshot(r); emit(final=(r == rounds))
        if verbose:
            board = " | ".join(f"{c} {s[c]['civ_strength']:.0f}"
                               for c in sorted(civs, key=lambda c: s[c]["civ_strength"], reverse=True))
            print(f"round {r}/{rounds} → turn {save['turns']} ({time.time()-t0:.1f}s): {board}")

    final = {c: stats_for(save)[c]["civ_strength"] for c in civs}
    winner = max(civs, key=lambda c: final[c])
    cards = compute_scorecards(civs, civ_models, colors, events, final, winner)
    if report_path and os.path.exists(report_path + ".live"):
        os.remove(report_path + ".live")
    return {"civs": civs, "models": civ_models, "colors": colors,
            "snapshots": snapshots, "events": events, "scorecards": cards,
            "winner": winner, "final": final, "history": history}


def write_report(path, res, mode):
    data = payload(res["civs"], res["colors"], res["models"], res["snapshots"],
                   res["events"], res["scorecards"], res["winner"], mode, live=False, final=True)
    with open(path, "w") as f:
        f.write(_REPORT_TEMPLATE.replace("/*DATA*/", json.dumps(data)))


def main():
    ap = argparse.ArgumentParser(description="Model-vs-model Civ match with negotiation, scorecards, report.")
    ap.add_argument("--save", default=None)
    ap.add_argument("--config", default=os.path.join(HERE, "models.yaml"))
    ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--turns-per-round", type=int, default=4)
    ap.add_argument("--negotiation-rounds", type=int, default=1)
    ap.add_argument("--out", default=os.path.join(HERE, "scoreboard.csv"))
    ap.add_argument("--report", default=os.path.join(HERE, "report.html"))
    ap.add_argument("--live", action="store_true",
                    help="rewrite live.json each round + a live-updating report (serve the dir over http)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir(CIVAGENT_DIR):
        sys.exit(f"CivAgent checkout not found at {CIVAGENT_DIR}. Run setup.sh first.")
    sys.path.insert(0, CIVAGENT_DIR)
    live = not (args.dry_run or args.demo)
    cfg, seats, providers = bootstrap_config(args.config, want_models=(live or args.demo))

    save_path = os.path.abspath(args.save or os.path.join(
        CIVAGENT_DIR, "scripts", "reproductions", "Autosave"))
    from civsim import utils
    with open(save_path) as f:
        civs_all = major_civs(utils.json_load_defaultdict(f.read()))
    default_model = cfg["LLM"]["default_model"]
    seat_lc = {k.lower(): v for k, v in seats.items()}   # save civ names are capitalized
    civ_models = {c: (seat_lc.get(c.lower()) or {}).get("model", default_model) for c in civs_all}
    if args.demo and not seats:
        civ_models = {c: f"demo/{c.lower()}" for c in civs_all}

    call = build_caller(providers) if live else None
    mode = "DRY-RUN" if args.dry_run else ("DEMO" if args.demo else "LIVE")
    print(f"=== Civ Arena: {mode} ===")
    if live:
        print(f"gateway={gateway_name(providers)}")
    live_path = os.path.join(os.path.dirname(os.path.abspath(args.report)), "live.json") if args.live else None
    if args.live:
        print(f"LIVE: serve this dir (python -m http.server) and open report.html — it updates each round")

    res = run_match(save_path, civ_models, call, rounds=args.rounds, tpr=args.turns_per_round,
                    neg_rounds=args.negotiation_rounds, demo=args.demo, dry=args.dry_run,
                    live_path=live_path, report_path=args.report, mode=mode)

    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["turn", "round", "civ", "civ_strength", "army", "tech"])
        w.writeheader(); w.writerows(res["history"])
    write_report(args.report, res, mode)
    print(f"\n\U0001f3c6 WINNER: {res['winner']} (power {res['final'][res['winner']]:.0f})")
    print(f"scoreboard → {args.out}\nreport     → {args.report}")


_REPORT_TEMPLATE = r"""<!doctype html><html><head><meta charset="utf-8">
<title>Civ Arena — model vs model</title>
<style>
  :root{--bg:#0d1117;--panel:#161b22;--line:#30363d;--fg:#e6edf3;--dim:#8b949e}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  header{padding:18px 24px;border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:20px} .sub{color:var(--dim);margin-top:4px}
  .live{color:#3cb44b;font-weight:700;animation:blink 1.4s infinite}
  @keyframes blink{50%{opacity:.35}}
  .wrap{display:grid;grid-template-columns:1fr 360px;gap:16px;padding:16px 24px}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
  canvas{width:100%;height:340px;display:block}
  .controls{display:flex;align-items:center;gap:12px;margin-top:12px}
  button{background:#21262d;color:var(--fg);border:1px solid var(--line);border-radius:6px;
    padding:6px 14px;cursor:pointer;font-size:14px} button:hover{border-color:#8b949e}
  input[type=range]{flex:1} .turnlbl{color:var(--dim);min-width:96px;text-align:right}
  .board .row{display:flex;align-items:center;gap:8px;margin:6px 0}
  .board .bar{height:18px;border-radius:4px;transition:width .25s}
  .board .name{width:84px;font-weight:600} .board .val{width:46px;text-align:right;color:var(--dim)}
  .board .model{font-size:11px;color:var(--dim)}
  .feed{max-height:520px;overflow:auto} h3{margin:0 0 8px;font-size:13px;color:var(--dim);
    text-transform:uppercase;letter-spacing:.06em}
  .cable{border-left:3px solid;padding:6px 10px;margin:6px 0;background:#0d1117;border-radius:0 6px 6px 0}
  .cable .meta{font-size:11px;color:var(--dim)} .cable.war{background:#2d1416}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:12px}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .win{color:#f0c000;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:right;padding:6px 8px;border-bottom:1px solid var(--line)}
  th:first-child,td:first-child{text-align:left} th{color:var(--dim);font-weight:600}
  .pill{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;color:#0d1117;font-weight:700}
</style></head><body>
<header><h1>⚔️ Civ Arena <span style="color:var(--dim);font-weight:400">— models playing each other</span></h1>
  <div class="sub" id="sub"></div></header>
<div class="wrap">
  <div class="panel">
    <canvas id="chart"></canvas><div class="legend" id="legend"></div>
    <div class="controls"><button id="play">▶ Play</button>
      <input type="range" id="slider" min="0" value="0"><span class="turnlbl" id="turnlbl"></span></div>
    <div class="board" id="board" style="margin-top:14px"></div>
  </div>
  <div class="panel feed"><h3>Diplomatic cables</h3><div id="cables"></div></div>
  <div class="panel" style="grid-column:1 / -1">
    <h3>Per-model scorecards</h3>
    <div style="color:var(--dim);font-size:12px;margin-bottom:8px">
      betrayal = accepted a pact then declared war on that ally · neg% = bilateral proposals accepted</div>
    <table id="cards"></table>
  </div>
</div>
<script>
let D = /*DATA*/;
let idx=D.snapshots.length-1, follow=true, playing=false, timer=null, maxV=1;
const $=id=>document.getElementById(id), cv=$('chart'), ctx=cv.getContext('2d'), slider=$('slider');
function recompute(){maxV=1;D.snapshots.forEach(s=>D.civs.forEach(c=>maxV=Math.max(maxV,s.strength[c]||0)));}
function header(){const lbl=D.final?'winner':'leading';
  $('sub').innerHTML=`${D.mode}${D.live&&!D.final?' <span class="live">● LIVE</span>':''} · ${D.civs.length} civs · ${lbl} `+
    `<span class="win">${D.winner||'—'}</span> &nbsp;|&nbsp; `+
    D.civs.map(c=>`<span style="color:${D.colors[c]}">${c}</span>=${D.models[c]}`).join(' · ');
  $('legend').innerHTML=D.civs.map(c=>`<span><i class="dot" style="background:${D.colors[c]}"></i>${c}</span>`).join('');}
function draw(){const N=D.snapshots.length,W=cv.clientWidth,H=340,pad=36;ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#30363d';ctx.lineWidth=1;ctx.beginPath();
  ctx.moveTo(pad,8);ctx.lineTo(pad,H-22);ctx.lineTo(W-8,H-22);ctx.stroke();
  ctx.fillStyle='#8b949e';ctx.font='11px sans-serif';ctx.fillText(maxV.toFixed(0),4,14);ctx.fillText('0',pad-14,H-22);
  const x=i=>pad+(W-pad-12)*(N<=1?0:i/(N-1)), y=v=>(H-22)-(H-30)*(v/maxV);
  D.civs.forEach(c=>{ctx.strokeStyle=D.colors[c];ctx.lineWidth=2.5;ctx.beginPath();
    for(let i=0;i<=idx;i++){const v=D.snapshots[i].strength[c]||0;i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v));}
    ctx.stroke();const v=D.snapshots[idx].strength[c]||0;ctx.fillStyle=D.colors[c];
    ctx.beginPath();ctx.arc(x(idx),y(v),3.5,0,7);ctx.fill();});}
function board(){const s=D.snapshots[idx].strength;
  const order=[...D.civs].sort((a,b)=>(s[b]||0)-(s[a]||0)), mx=Math.max(1,...D.civs.map(c=>s[c]||0));
  $('board').innerHTML=order.map(c=>`<div class="row"><span class="name" style="color:${D.colors[c]}">${c}</span>
    <div class="bar" style="background:${D.colors[c]};width:${(s[c]||0)/mx*180}px"></div>
    <span class="val">${(s[c]||0).toFixed(0)}</span><span class="model">${D.models[c]}</span></div>`).join('');}
function feed(){const upto=D.snapshots[idx].round;
  $('cables').innerHTML=D.events.filter(e=>e.round<=upto).map(e=>{const col=D.colors[e.frm]||'#888',
    ar=e.kind==='talk'?'→':(e.kind==='war'?'⚔':'⇒');
    return `<div class="cable ${e.kind}" style="border-color:${col}">
      <div class="meta">round ${e.round} · <span style="color:${col}">${e.frm}</span> ${ar} ${e.to}</div>
      ${(e.text||'').replace(/</g,'&lt;')}</div>`;}).reverse().join('')
    ||'<div style="color:#8b949e">No diplomacy yet.</div>';}
function cards(){const rows=[...D.scorecards].sort((a,b)=>a.place-b.place);
  $('cards').innerHTML=`<tr><th>Model (civ)</th><th>Place</th><th>Wars</th><th>Betrayals</th><th>Betrayed</th>
     <th>Pacts</th><th>Neg%</th><th>Msgs</th></tr>`+
    rows.map(c=>`<tr><td><span class="pill" style="background:${c.color}">${c.winner&&D.final?'🏆 ':''}${c.model}</span>
     <span style="color:var(--dim)">${c.civ}</span></td><td>${c.place}</td><td>${c.wars}</td>
     <td>${c.betrayals}</td><td>${c.betrayed}</td><td>${c.pacts}</td>
     <td>${c.neg_success==null?'–':Math.round(c.neg_success*100)+'%'}</td><td>${c.msgs}</td></tr>`).join('');}
function render(){const N=D.snapshots.length;slider.max=N-1;slider.value=idx;
  $('turnlbl').textContent=`round ${D.snapshots[idx].round} · turn ${D.snapshots[idx].turn}`;draw();board();feed();}
function applyData(nd){D=nd;recompute();
  if(follow)idx=D.snapshots.length-1; else idx=Math.min(idx,D.snapshots.length-1);
  header();render();cards();}
function fit(){cv.width=cv.clientWidth*devicePixelRatio;cv.height=340*devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);draw();}
addEventListener('resize',fit);
slider.oninput=()=>{idx=+slider.value;follow=(idx===D.snapshots.length-1);render();};
$('play').onclick=function(){playing=!playing;this.textContent=playing?'❚❚ Pause':'▶ Play';
  if(playing){if(idx>=D.snapshots.length-1)idx=0;timer=setInterval(()=>{if(idx>=D.snapshots.length-1){
    clearInterval(timer);playing=false;$('play').textContent='▶ Play';return;}idx++;render();},700);}
  else clearInterval(timer);};
recompute();header();fit();render();cards();
if(D.live && location.protocol.startsWith('http')){
  setInterval(async()=>{try{const r=await fetch('live.json?_='+Date.now());if(r.ok){const nd=await r.json();
    if(nd.snapshots.length!==D.snapshots.length||nd.final!==D.final)applyData(nd);}}catch(e){}},2000);}
</script></body></html>"""


if __name__ == "__main__":
    main()
