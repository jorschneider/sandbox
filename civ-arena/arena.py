#!/usr/bin/env python3
"""Run a no-human, model-vs-model Civ match on top of CivAgent's headless engine.

Each major civ in the save is a "seat" driven by an LLM (different models can
play each other). A round is:

    1. each seat's model proposes one diplomatic action toward another civ
       (declare war, seek peace, form alliance, mutual defense, open borders,
        research agreement, friendly statement);
    2. bilateral actions are put to the TARGET seat's model for yes/no;
    3. accepted actions mutate the game save;
    4. the real Unciv engine simulates `--turns-per-round` turns (combat, tech,
       cities, the lot) via resources/Unciv.jar;
    5. every civ's strength is recorded.

At the end a scoreboard CSV is written and a winner (highest final civ_strength)
is declared.

Why this file exists: CivAgent's shipped runner (scripts/tasks/run_benchmark.py)
calls workflow_utils.run_workflows_with_tools(), which the current "shorter
workflow" code commented out. This runner targets the *active* primitive,
civagent.workflow.reply(model=...), so it works against the repo as published.

Modes:
    --dry-run   no LLM calls; seats take no diplomatic action. Validates the
                whole pipeline (parse -> engine -> scoreboard) with NO API keys.
    (default)   live: calls each seat's model. Needs keys in models.yaml.

Usage:
    CIVAGENT_DIR=./vendor/CivAgent python arena.py --dry-run --rounds 3
    CIVAGENT_DIR=./vendor/CivAgent python arena.py --config models.yaml --rounds 8
"""
import argparse
import csv
import json
import os
import sys
import tempfile
import time

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
CIVAGENT_DIR = os.path.abspath(os.environ.get("CIVAGENT_DIR", os.path.join(HERE, "vendor", "CivAgent")))

# Diplomatic actions we let seats use. Restricted to the parameter-light,
# clearly-defined entries in CivAgent's decision_space. declare_war is
# unilateral; the rest require the target's consent.
UNILATERAL = {"declare_war"}
BILATERAL = ["seek_peace", "form_ally", "mutual_defense", "open_border",
             "research_agreement", "friendly_statement"]
ALL_ACTIONS = list(UNILATERAL) + BILATERAL


def bootstrap_config(models_path):
    """Merge models.yaml into a CivAgent-style config and point env at it.

    Must run BEFORE importing civsim/civagent (they read config + open Redis at
    import time)."""
    seats, providers = {}, {}
    if models_path and os.path.exists(models_path):
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
            "db": 0,
            "password": None,
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
    return cfg, seats


def major_civs(data):
    return [
        c.get("civName")
        for c in data.get("civilizations", [])
        if "playerId" not in c
        and "cityStatePersonality" not in c
        and c.get("civName") != "Barbarians"
    ]


def ask_json(reply_fn, model, prompt):
    """Call a seat's model and parse a JSON object from the reply."""
    resp = reply_fn({"prompt": prompt}, model, True)
    text = resp.message.content if resp is not None else ""
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if 0 <= start < end:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                return None
        return None


def propose_prompt(me, others, stats):
    lines = [f"You are the leader of {me} in a Civilization game. It is your turn to act.",
             "Civilizations and their current strength:"]
    for c in [me] + others:
        s = stats[c]
        tag = " (you)" if c == me else ""
        lines.append(f"  - {c}{tag}: strength {s['civ_strength']:.0f}, army {s['army_strength']:.0f}, "
                     f"tech {s['tech_strength']:.0f}")
    lines += [
        "",
        "Choose ONE diplomatic action toward ONE other civilization, or none.",
        f"Allowed actions: {', '.join(ALL_ACTIONS)}, or \"none\".",
        "Think strategically: ally against the strongest, betray the weak, make peace when losing.",
        'Reply with ONLY a JSON object: {"action": "<action or none>", "target": "<civ or empty>", "reason": "<short>"}',
    ]
    return "\n".join(lines)


def consent_prompt(me, other, action, reason, stats):
    s_me, s_o = stats[me], stats[other]
    return "\n".join([
        f"You are the leader of {me}. {other} proposes to '{action}' with you.",
        f"Their reason: {reason}",
        f"Your strength {s_me['civ_strength']:.0f} (army {s_me['army_strength']:.0f}); "
        f"theirs {s_o['civ_strength']:.0f} (army {s_o['army_strength']:.0f}).",
        'Reply with ONLY a JSON object: {"decision": "yes" or "no", "reason": "<short>"}',
    ])


def apply_action(decision_space, gm_command_space, save, action, actor, target):
    """Mutate the save for an accepted action. Returns the new save dict.

    Faithful to run_benchmark.py's usage: decision_space[key]["func"]("yes")
    yields the game-master function, called with the action's params then the
    save. Falls back to gm_command_space for keys not in decision_space.
    """
    param_map = {"civ_name_1": actor, "civ_name_2": target, "civ_name": target}
    if action in decision_space:
        spec = decision_space[action]
        params = [param_map[p] for p in spec["param"]]
        fn = spec["func"]("yes")(*params)
        return fn(save)
    if action in gm_command_space:
        spec = gm_command_space[action]
        params = [param_map[p] for p in spec["param"]]
        return spec["func"](*params)(save)
    raise KeyError(action)


def main():
    ap = argparse.ArgumentParser(description="Model-vs-model Civ match on CivAgent's headless engine.")
    ap.add_argument("--save", default=None, help="Starting save (default: bundled Autosave)")
    ap.add_argument("--config", default=os.path.join(HERE, "models.yaml"), help="models.yaml")
    ap.add_argument("--rounds", type=int, default=5, help="Diplomacy+simulation rounds")
    ap.add_argument("--turns-per-round", type=int, default=5, help="Engine turns advanced per round")
    ap.add_argument("--out", default=os.path.join(HERE, "scoreboard.csv"))
    ap.add_argument("--dry-run", action="store_true", help="No LLM calls; just engine + scoreboard")
    args = ap.parse_args()

    if not os.path.isdir(CIVAGENT_DIR):
        sys.exit(f"CivAgent checkout not found at {CIVAGENT_DIR}. Run setup.sh first (or set CIVAGENT_DIR).")
    sys.path.insert(0, CIVAGENT_DIR)

    cfg, seats = bootstrap_config(args.config if not args.dry_run else None)

    # Imports happen AFTER config bootstrap (they read config / open Redis).
    from civsim import utils
    from civsim.simulator import simulator
    from civsim import action_space
    decision_space = action_space.decision_space
    gm_command_space = action_space.gm_command_space

    reply_fn = None
    if not args.dry_run:
        from civagent.workflow import reply as reply_fn  # noqa: F401

    save_path = os.path.abspath(args.save or os.path.join(
        CIVAGENT_DIR, "scripts", "reproductions", "Autosave"))
    with open(save_path, "r", encoding="utf-8") as f:
        save = utils.json_load_defaultdict(f.read())
    civs = major_civs(save)
    if not civs:
        sys.exit("No major civs found in save.")

    mode = "DRY-RUN (no LLM)" if args.dry_run else "LIVE"
    print(f"=== Civ Arena: {mode} ===")
    print(f"save={os.path.basename(save_path)} start_turn={save['turns']} civs={civs}")
    if not args.dry_run:
        print("models: " + ", ".join(f"{c}={seats.get(c, {}).get('model', cfg['LLM']['default_model'])}"
                                      for c in civs))

    simulator.init_jvm()

    def stats_for(data):
        return {c: utils.get_stats(data, utils.get_civ_index(data, c)) for c in civs}

    history = []  # rows: {turn, civ, strength, ...}

    def record(data):
        turn = data["turns"]
        s = stats_for(data)
        for c in civs:
            history.append({"turn": turn, "civ": c,
                            "civ_strength": round(s[c]["civ_strength"], 1),
                            "army": round(s[c]["army_strength"], 1),
                            "tech": round(s[c]["tech_strength"], 1)})
        return s

    record(save)

    for rnd in range(1, args.rounds + 1):
        s = stats_for(save)
        if not args.dry_run:
            for actor in civs:
                others = [c for c in civs if c != actor]
                model = seats.get(actor, {}).get("model", cfg["LLM"]["default_model"])
                try:
                    proposal = ask_json(reply_fn, model, propose_prompt(actor, others, s))
                except Exception as e:
                    print(f"  ! {actor} model error: {e}")
                    continue
                if not proposal:
                    continue
                action = str(proposal.get("action", "none")).strip().lower()
                target = str(proposal.get("target", "")).strip().lower()
                target = next((c for c in others if c.lower() == target), None)
                if action not in ALL_ACTIONS or target is None:
                    continue
                reason = proposal.get("reason", "")

                accepted = action in UNILATERAL
                if action in BILATERAL:
                    tmodel = seats.get(target, {}).get("model", cfg["LLM"]["default_model"])
                    try:
                        d = ask_json(reply_fn, tmodel, consent_prompt(target, actor, action, reason, s))
                        accepted = bool(d) and str(d.get("decision", "no")).lower().startswith("y")
                    except Exception as e:
                        print(f"  ! {target} consent error: {e}")
                        accepted = False
                verb = "->" if accepted else "x "
                print(f"  {actor} {verb} {action} {target} ({'ok' if accepted else 'declined'})")
                if accepted:
                    try:
                        save = apply_action(decision_space, gm_command_space, save, action, actor, target)
                    except Exception as e:
                        print(f"    (apply failed, skipped: {e})")

        t0 = time.time()
        save = simulator.run(save, turns=args.turns_per_round, diplomacy_flag=False, worker_auto=True)
        s = record(save)
        ranked = sorted(civs, key=lambda c: s[c]["civ_strength"], reverse=True)
        board = " | ".join(f"{c} {s[c]['civ_strength']:.0f}" for c in ranked)
        print(f"round {rnd}/{args.rounds} -> turn {save['turns']} ({time.time()-t0:.1f}s): {board}")

    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["turn", "civ", "civ_strength", "army", "tech"])
        w.writeheader()
        w.writerows(history)

    final = stats_for(save)
    winner = max(civs, key=lambda c: final[c]["civ_strength"])
    print(f"\nWINNER: {winner} (strength {final[winner]['civ_strength']:.0f})")
    print(f"scoreboard -> {args.out}")


if __name__ == "__main__":
    main()
