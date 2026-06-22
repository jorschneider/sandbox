#!/usr/bin/env python3
"""Run a no-human, model-vs-model Civ match on CivAgent's headless engine.

Each major civ in the save is a seat driven by an LLM. Different models play
each other. A round is:

    1. NEGOTIATION: each civ's model sends a private message to one other civ
       (ally, threaten, deceive, scheme); the recipient's model replies. These
       exchanges go into each civ's memory and shape what they do next.
    2. ACTION: each civ's model, now aware of the chatter, proposes one
       diplomatic action toward another civ (declare war, seek peace, form
       alliance, mutual defense, open borders, research agreement, friendly
       statement). Bilateral actions are put to the target's model for yes/no.
    3. The accepted actions mutate the game save.
    4. The real Unciv engine simulates `--turns-per-round` turns via Unciv.jar.
    5. Every civ's strength is recorded.

Outputs a scoreboard CSV and a self-contained, animated `report.html` (strength
race + scrubbable "diplomatic cables" feed).

PROVIDERS — OpenRouter is the easy path: one key, one endpoint, every vendor.
Set `providers.openrouter_api_key` in models.yaml and give each seat an
OpenRouter model id (e.g. anthropic/claude-opus-4-8, openai/gpt-4o,
deepseek/deepseek-chat, meta-llama/llama-3.1-70b-instruct). Falls back to
CivAgent's native routing (civagent.workflow.reply) if OpenRouter isn't set.

MODES
    --dry-run   no LLM, no diplomacy; just engine + scoreboard + chart (no keys)
    --demo      no LLM; RANDOM diplomacy so you can preview the full report
                (feed + race) without any keys
    (default)   live model-vs-model; needs models.yaml with keys

Usage:
    CIVAGENT_DIR=./vendor/CivAgent python arena.py --demo --rounds 6
    CIVAGENT_DIR=./vendor/CivAgent python arena.py --config models.yaml --rounds 10
"""
import argparse
import csv
import json
import os
import random
import sys
import tempfile
import time

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
CIVAGENT_DIR = os.path.abspath(os.environ.get("CIVAGENT_DIR", os.path.join(HERE, "vendor", "CivAgent")))

UNILATERAL = {"declare_war"}
BILATERAL = ["seek_peace", "form_ally", "mutual_defense", "open_border",
             "research_agreement", "friendly_statement"]
ALL_ACTIONS = list(UNILATERAL) + BILATERAL

PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4",
           "#f032e6", "#bfef45", "#fabed4", "#469990"]

DEMO_LINES = [
    "Let us stand together against the strongest among us.",
    "Your borders look poorly defended, friend.",
    "I propose we divide the map between us — you take the south.",
    "Swear peace with me and I will fund your armies.",
    "I have no quarrel with you... for now.",
    "Betray {x} with me and we both prosper.",
    "Your alliance with {x} will be your ruin.",
    "Pay tribute and I will spare your cities.",
]


# ---------------------------------------------------------------------------
# config + LLM wiring
# ---------------------------------------------------------------------------
def bootstrap_config(models_path, want_models):
    """Merge models.yaml into a CivAgent-style config; point env at it.

    Must run BEFORE importing civsim/civagent (they read config + open Redis at
    import time). Returns (cfg, seats, providers)."""
    seats, providers = {}, {}
    if want_models and models_path and os.path.exists(models_path):
        with open(models_path) as f:
            m = yaml.safe_load(f) or {}
        seats = m.get("seats", {}) or {}
        providers = m.get("providers", {}) or {}

    cfg = {
        "LLM": {
            "default_model": providers.get("default_model", "deepseek-chat"),
            "deepseek_api_key": providers.get("deepseek_api_key", ""),
            "openai_api_key": providers.get("openai_api_key", ""),
            "openai_base_url": providers.get("openai_base_url", ""),
        },
        "Redis": {
            "host": os.environ.get("REDIS_HOST", "127.0.0.1"),
            "port": int(os.environ.get("REDIS_PORT", "6379")),
            "db": 0, "password": None,
        },
        "chat_server": {"url": "http://127.0.0.1:2337/"},
        "use_ai": "civagent",
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
    """Return call(model, prompt) -> str. Prefers OpenRouter; else CivAgent reply()."""
    key = providers.get("openrouter_api_key", "")
    if key:
        from openai import OpenAI
        base = providers.get("openrouter_base_url", "https://openrouter.ai/api/v1")
        client = OpenAI(base_url=base, api_key=key,
                        default_headers={"X-Title": "civ-arena"})

        def call(model, prompt):
            r = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=700, temperature=0.8,
            )
            return r.choices[0].message.content or ""
        return call

    from civagent.workflow import reply as reply_fn

    def call(model, prompt):
        r = reply_fn({"prompt": prompt}, model, True)
        return r.message.content if r is not None else ""
    return call


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


# ---------------------------------------------------------------------------
# prompts
# ---------------------------------------------------------------------------
def state_block(me, others, stats):
    lines = ["Standings:"]
    for c in [me] + others:
        s = stats[c]
        tag = " (you)" if c == me else ""
        lines.append(f"  {c}{tag}: power {s['civ_strength']:.0f}, army {s['army_strength']:.0f}, "
                     f"tech {s['tech_strength']:.0f}")
    return "\n".join(lines)


def mem_block(memory, me):
    notes = memory.get(me, [])
    return ("Recent private messages:\n" + "\n".join(notes)) if notes else "No messages yet."


def negotiate_prompt(me, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me} in a Civilization game, scheming for advantage.",
        state_block(me, others, stats), mem_block(memory, me), "",
        "Send a PRIVATE message to ONE other civilization — to propose an alliance, "
        "threaten, demand tribute, or deceive — or stay silent. Be cunning; you may lie.",
        'Reply with ONLY JSON: {"to": "<civ or none>", "message": "<one or two sentences>"}',
    ])


def reply_prompt(me, frm, text, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. {frm} sent you a private message:",
        f'  "{text}"',
        state_block(me, others, stats), mem_block(memory, me), "",
        "Reply privately. You may agree, refuse, counter-offer, or mislead them.",
        'Reply with ONLY JSON: {"message": "<one or two sentences>"}',
    ])


def action_prompt(me, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. Time to act on your scheming.",
        state_block(me, others, stats), mem_block(memory, me), "",
        "Choose ONE diplomatic action toward ONE other civ, or none.",
        f"Allowed: {', '.join(ALL_ACTIONS)}, or \"none\".",
        "Ally against the strongest, betray the weak, make peace when losing.",
        'Reply with ONLY JSON: {"action": "<action or none>", "target": "<civ or empty>", "reason": "<short>"}',
    ])


def consent_prompt(me, frm, action, reason, others, stats, memory):
    return "\n".join([
        f"You are the leader of {me}. {frm} proposes to '{action}' with you. Reason: {reason}",
        state_block(me, others, stats), mem_block(memory, me), "",
        'Reply with ONLY JSON: {"decision": "yes" or "no", "reason": "<short>"}',
    ])


# ---------------------------------------------------------------------------
# action application (faithful to CivAgent's decision_space usage)
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Model-vs-model Civ match with negotiation + visual report.")
    ap.add_argument("--save", default=None)
    ap.add_argument("--config", default=os.path.join(HERE, "models.yaml"))
    ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--turns-per-round", type=int, default=4)
    ap.add_argument("--negotiation-rounds", type=int, default=1,
                    help="message exchanges per round (0 disables negotiation)")
    ap.add_argument("--out", default=os.path.join(HERE, "scoreboard.csv"))
    ap.add_argument("--report", default=os.path.join(HERE, "report.html"))
    ap.add_argument("--dry-run", action="store_true", help="no LLM, no diplomacy")
    ap.add_argument("--demo", action="store_true", help="no LLM; random diplomacy to preview the report")
    args = ap.parse_args()

    if not os.path.isdir(CIVAGENT_DIR):
        sys.exit(f"CivAgent checkout not found at {CIVAGENT_DIR}. Run setup.sh first (or set CIVAGENT_DIR).")
    sys.path.insert(0, CIVAGENT_DIR)

    live = not (args.dry_run or args.demo)
    cfg, seats, providers = bootstrap_config(args.config, want_models=(live or args.demo))

    from civsim import utils
    from civsim.simulator import simulator
    from civsim import action_space
    decision_space, gm_command_space = action_space.decision_space, action_space.gm_command_space

    call = build_caller(providers) if live else None

    save_path = os.path.abspath(args.save or os.path.join(
        CIVAGENT_DIR, "scripts", "reproductions", "Autosave"))
    with open(save_path, "r", encoding="utf-8") as f:
        save = utils.json_load_defaultdict(f.read())
    civs = major_civs(save)
    if not civs:
        sys.exit("No major civs in save.")

    def model_of(c):
        return seats.get(c, {}).get("model", cfg["LLM"]["default_model"])

    mode = "DRY-RUN" if args.dry_run else ("DEMO (random diplomacy)" if args.demo else "LIVE")
    print(f"=== Civ Arena: {mode} ===\nsave={os.path.basename(save_path)} "
          f"start_turn={save['turns']} civs={civs}")
    if live:
        gw = "OpenRouter" if providers.get("openrouter_api_key") else "CivAgent native"
        print(f"gateway={gw}  models: " + ", ".join(f"{c}={model_of(c)}" for c in civs))

    simulator.init_jvm()

    def stats_for(d):
        return {c: utils.get_stats(d, utils.get_civ_index(d, c)) for c in civs}

    memory = {c: [] for c in civs}
    events = []        # {round, kind, frm, to, text}
    snapshots = []     # {round, turn, strength:{civ:val}}
    history = []       # CSV rows

    def remember(civ, line):
        memory[civ].append(line)
        if len(memory[civ]) > 8:
            memory[civ].pop(0)

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

    snapshot(0)

    def llm_json(model, prompt):
        try:
            return parse_json(call(model, prompt))
        except Exception as e:
            print(f"  ! model error ({model}): {e}")
            return None

    for r in range(1, args.rounds + 1):
        s = stats_for(save)

        # ---- negotiation phase ----
        if not args.dry_run and args.negotiation_rounds > 0:
            for _ in range(args.negotiation_rounds):
                for speaker in civs:
                    others = [c for c in civs if c != speaker]
                    if args.demo:
                        if random.random() < 0.7:
                            tgt = random.choice(others)
                            msg = random.choice(DEMO_LINES).replace(
                                "{x}", random.choice([o for o in others if o != tgt] or [tgt]))
                        else:
                            tgt, msg = None, None
                    else:
                        d = llm_json(model_of(speaker), negotiate_prompt(speaker, others, s, memory))
                        tgt = None
                        if d:
                            t = str(d.get("to", "")).strip().lower()
                            tgt = next((c for c in others if c.lower() == t), None)
                            msg = str(d.get("message", "")).strip()
                        if not tgt or not msg:
                            continue
                    if not tgt:
                        continue
                    print(f"  \U0001f5e3  {speaker} → {tgt}: {msg}")
                    events.append({"round": r, "kind": "talk", "frm": speaker, "to": tgt, "text": msg})
                    remember(speaker, f"You told {tgt}: {msg}")
                    remember(tgt, f"{speaker} told you: {msg}")
                    # reply
                    if args.demo:
                        rep = random.choice(["Agreed.", "Never.", "Perhaps... for a price.",
                                             "I will consider it.", "You will regret this."])
                    else:
                        rd = llm_json(model_of(tgt), reply_prompt(tgt, speaker, msg,
                                      [c for c in civs if c != tgt], s, memory))
                        rep = str(rd.get("message", "")).strip() if rd else ""
                    if rep:
                        events.append({"round": r, "kind": "talk", "frm": tgt, "to": speaker, "text": rep})
                        remember(tgt, f"You replied to {speaker}: {rep}")
                        remember(speaker, f"{tgt} replied: {rep}")

        # ---- action phase ----
        if not args.dry_run:
            for actor in civs:
                others = [c for c in civs if c != actor]
                if args.demo:
                    if random.random() < 0.6:
                        action, target = random.choice(ALL_ACTIONS), random.choice(others)
                        reason = "demo"
                    else:
                        action = "none"; target = None; reason = ""
                else:
                    d = llm_json(model_of(actor), action_prompt(actor, others, s, memory))
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
                    if args.demo:
                        accepted = random.random() < 0.5
                    else:
                        cd = llm_json(model_of(target),
                                      consent_prompt(target, actor, action, reason,
                                                     [c for c in civs if c != target], s, memory))
                        accepted = bool(cd) and str(cd.get("decision", "no")).lower().startswith("y")
                verb = "→" if accepted else "✗"
                print(f"  {actor} {verb} {action} {target} ({'ok' if accepted else 'declined'})")
                events.append({"round": r, "kind": ("war" if action == "declare_war" else "action"),
                               "frm": actor, "to": target,
                               "text": f"{action.replace('_', ' ')} ({'accepted' if accepted else 'declined'})"})
                if accepted:
                    try:
                        save = apply_action(decision_space, gm_command_space, save, action, actor, target)
                    except Exception as e:
                        print(f"    (apply failed, skipped: {e})")

        # ---- simulate ----
        t0 = time.time()
        save = simulator.run(save, turns=args.turns_per_round, diplomacy_flag=False, worker_auto=True)
        s = snapshot(r)
        board = " | ".join(f"{c} {s[c]['civ_strength']:.0f}"
                           for c in sorted(civs, key=lambda c: s[c]["civ_strength"], reverse=True))
        print(f"round {r}/{args.rounds} → turn {save['turns']} ({time.time()-t0:.1f}s): {board}")

    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["turn", "round", "civ", "civ_strength", "army", "tech"])
        w.writeheader(); w.writerows(history)

    final = stats_for(save)
    winner = max(civs, key=lambda c: final[c]["civ_strength"])
    colors = {c: PALETTE[i % len(PALETTE)] for i, c in enumerate(civs)}
    write_report(args.report, civs, colors, {c: model_of(c) for c in civs},
                 snapshots, events, winner, mode)

    print(f"\n🏆 WINNER: {winner} (power {final[winner]['civ_strength']:.0f})")
    print(f"scoreboard → {args.out}\nreport     → {args.report}")


# ---------------------------------------------------------------------------
# self-contained animated HTML report
# ---------------------------------------------------------------------------
def write_report(path, civs, colors, models, snapshots, events, winner, mode):
    data = {"civs": civs, "colors": colors, "models": models,
            "snapshots": snapshots, "events": events, "winner": winner, "mode": mode}
    html = _REPORT_TEMPLATE.replace("/*DATA*/", json.dumps(data))
    with open(path, "w") as f:
        f.write(html)


_REPORT_TEMPLATE = r"""<!doctype html><html><head><meta charset="utf-8">
<title>Civ Arena — model vs model</title>
<style>
  :root{--bg:#0d1117;--panel:#161b22;--line:#30363d;--fg:#e6edf3;--dim:#8b949e}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  header{padding:18px 24px;border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:20px} .sub{color:var(--dim);margin-top:4px}
  .wrap{display:grid;grid-template-columns:1fr 360px;gap:16px;padding:16px 24px}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
  canvas{width:100%;height:340px;display:block}
  .controls{display:flex;align-items:center;gap:12px;margin-top:12px}
  button{background:#21262d;color:var(--fg);border:1px solid var(--line);border-radius:6px;
    padding:6px 14px;cursor:pointer;font-size:14px} button:hover{border-color:#8b949e}
  input[type=range]{flex:1} .turnlbl{color:var(--dim);min-width:90px;text-align:right}
  .board .row{display:flex;align-items:center;gap:8px;margin:6px 0}
  .board .bar{height:18px;border-radius:4px;transition:width .25s}
  .board .name{width:84px;font-weight:600} .board .val{width:46px;text-align:right;color:var(--dim)}
  .board .model{font-size:11px;color:var(--dim)}
  .feed{max-height:520px;overflow:auto} .feed h3{margin:0 0 8px;font-size:13px;color:var(--dim);
    text-transform:uppercase;letter-spacing:.06em}
  .cable{border-left:3px solid;padding:6px 10px;margin:6px 0;background:#0d1117;border-radius:0 6px 6px 0}
  .cable .meta{font-size:11px;color:var(--dim)} .cable.war{background:#2d1416}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:12px}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .win{color:#f0c000;font-weight:700}
</style></head><body>
<header>
  <h1>⚔️ Civ Arena <span style="color:var(--dim);font-weight:400">— models playing each other</span></h1>
  <div class="sub" id="sub"></div>
</header>
<div class="wrap">
  <div class="panel">
    <canvas id="chart"></canvas>
    <div class="legend" id="legend"></div>
    <div class="controls">
      <button id="play">▶ Play</button>
      <input type="range" id="slider" min="0" value="0">
      <span class="turnlbl" id="turnlbl"></span>
    </div>
    <div class="board" id="board" style="margin-top:14px"></div>
  </div>
  <div class="panel feed">
    <h3>Diplomatic cables</h3>
    <div id="cables"></div>
  </div>
</div>
<script>
const DATA = /*DATA*/;
const {civs,colors,models,snapshots,events,winner,mode} = DATA;
const N = snapshots.length;            // index 0 = start, then one per round
let idx = N-1, playing=false, timer=null;

document.getElementById('sub').innerHTML =
  `${mode} · ${civs.length} civs · winner <span class="win">${winner}</span> &nbsp;|&nbsp; ` +
  civs.map(c=>`<span style="color:${colors[c]}">${c}</span>=${models[c]}`).join(' · ');

const legend = document.getElementById('legend');
legend.innerHTML = civs.map(c=>`<span><i class="dot" style="background:${colors[c]}"></i>${c}</span>`).join('');

const slider = document.getElementById('slider'); slider.max = N-1; slider.value = idx;
const cv = document.getElementById('chart'), ctx = cv.getContext('2d');
function fit(){ cv.width = cv.clientWidth*devicePixelRatio; cv.height=340*devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); draw(); }
addEventListener('resize',fit);

let maxV=1; snapshots.forEach(s=>civs.forEach(c=>maxV=Math.max(maxV,s.strength[c]||0)));
function draw(){
  const W=cv.clientWidth,H=340,pad=36;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#30363d'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,8); ctx.lineTo(pad,H-22); ctx.lineTo(W-8,H-22); ctx.stroke();
  ctx.fillStyle='#8b949e'; ctx.font='11px sans-serif';
  ctx.fillText(maxV.toFixed(0),4,14); ctx.fillText('0',pad-14,H-22);
  const x=i=> pad + (W-pad-12) * (N<=1?0:i/(N-1));
  const y=v=> (H-22) - (H-30) * (v/maxV);
  civs.forEach(c=>{
    ctx.strokeStyle=colors[c]; ctx.lineWidth=2.5; ctx.beginPath();
    for(let i=0;i<=idx;i++){ const v=snapshots[i].strength[c]||0;
      i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)); }
    ctx.stroke();
    const v=snapshots[idx].strength[c]||0;
    ctx.fillStyle=colors[c]; ctx.beginPath(); ctx.arc(x(idx),y(v),3.5,0,7); ctx.fill();
  });
}

function board(){
  const s=snapshots[idx].strength;
  const order=[...civs].sort((a,b)=>(s[b]||0)-(s[a]||0));
  const mx=Math.max(1,...civs.map(c=>s[c]||0));
  document.getElementById('board').innerHTML = order.map(c=>`
    <div class="row"><span class="name" style="color:${colors[c]}">${c}</span>
    <div class="bar" style="background:${colors[c]};width:${(s[c]||0)/mx*180}px"></div>
    <span class="val">${(s[c]||0).toFixed(0)}</span>
    <span class="model">${models[c]}</span></div>`).join('');
}

function feed(){
  const upto=snapshots[idx].round;
  const rows=events.filter(e=>e.round<=upto);
  document.getElementById('cables').innerHTML = rows.map(e=>{
    const col=colors[e.frm]||'#888';
    const arrow = e.kind==='talk' ? '→' : (e.kind==='war' ? '⚔' : '⇒');
    return `<div class="cable ${e.kind}" style="border-color:${col}">
      <div class="meta">round ${e.round} · <span style="color:${col}">${e.frm}</span> ${arrow} ${e.to}</div>
      ${e.text.replace(/</g,'&lt;')}</div>`;
  }).reverse().join('') || '<div style="color:#8b949e">No diplomacy this match.</div>';
}

function render(){ slider.value=idx; document.getElementById('turnlbl').textContent =
  `round ${snapshots[idx].round} · turn ${snapshots[idx].turn}`; draw(); board(); feed(); }
slider.oninput=()=>{ idx=+slider.value; render(); };
document.getElementById('play').onclick=function(){
  playing=!playing; this.textContent=playing?'❚❚ Pause':'▶ Play';
  if(playing){ if(idx>=N-1) idx=0;
    timer=setInterval(()=>{ if(idx>=N-1){clearInterval(timer);playing=false;
      document.getElementById('play').textContent='▶ Play';return;} idx++; render(); },700);
  } else clearInterval(timer);
};
fit(); render();
</script></body></html>"""


if __name__ == "__main__":
    main()
