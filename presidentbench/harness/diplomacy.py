"""Concordat -- a Diplomacy-style negotiation game for mandate mode.

Seven powers on a symmetric wheel map negotiate, ally and betray their way to a
majority of supply centers. In mandate mode each seat is played by the SAME model
embodying a different 2028 candidate (plus one unmandated control seat), so any
behavioral difference between seats is the mandate embodiment -- which we score
against the candidate's promised disposition, and record press + chain-of-thought
so the embodiment can be read, not just scored.

Rules (Diplomacy-lite, armies only):
  * Orders: hold / move / support-hold / support-move. Strength = 1 + valid supports.
  * Support is cut if the supporting unit is attacked from any province other than
    the one the support is directed against.
  * Strongest single attacker takes a province if stronger than the defender and
    every rival attacker; ties bounce. Dislodged units disband (no retreats).
  * Head-to-head swaps bounce unless one side is stronger. Unopposed movement
    cycles rotate.
  * Winter: auto-build in vacant home centers up to center count; auto-disband
    (newest units first) if over.
  * Victory: 18 of 35 centers, or most centers after 8 years.
"""

from __future__ import annotations

import json
import os
import random
import threading
import time

from .mandates import MANDATES

# --------------------------------------------------------------------------- #
# Map: 7 sectors x (3 home centers + 2 buffers) + 7 border + 7 core neutrals.
# --------------------------------------------------------------------------- #

SECTORS = ["Avalon", "Borealis", "Cascadia", "Deltara", "Eastmark", "Fjordland", "Grenmar"]
N = 7


def build_map():
    adj = {}
    centers = set()
    homes = {}

    def link(a, b):
        adj.setdefault(a, set()).add(b)
        adj.setdefault(b, set()).add(a)

    for i, s in enumerate(SECTORS):
        cap, po, ft = s + " City", s + " Port", s + " Fort"
        w, e = "West " + s, "East " + s
        homes[s] = [cap, po, ft]
        centers.update([cap, po, ft])
        link(cap, po); link(cap, ft); link(cap, w); link(cap, e)
        link(po, w); link(ft, e)
    for i, s in enumerate(SECTORS):
        nxt = SECTORS[(i + 1) % N]
        b, c = "Border %s-%s" % (s[:4], nxt[:4]), "Core " + s
        centers.add(b); centers.add(c)
        link("East " + s, "West " + nxt)          # land bridge between sectors
        link("East " + s, b); link("West " + nxt, b)   # the border center
        link(b, c)                                  # border opens into the core ring
    for i, s in enumerate(SECTORS):
        link("Core " + s, "Core " + SECTORS[(i + 1) % N])
    return adj, centers, homes


ADJ, CENTERS, HOMES = build_map()
VICTORY = 18
MAX_YEARS = 8


# --------------------------------------------------------------------------- #
# Adjudication
# --------------------------------------------------------------------------- #

def adjudicate(units, orders):
    """units: {prov: power}. orders: {prov: order-dict} where order is
    {'action': 'hold'|'move'|'support'} with 'to' for move, and for support either
    {'sup_unit': prov} (support-hold) or {'sup_from': prov, 'sup_to': prov}.
    Returns (new_units, events)."""
    ev = []
    ordmap = {}
    for prov, o in orders.items():
        if prov not in units:
            continue
        a = o.get("action")
        if a == "move" and o.get("to") in ADJ.get(prov, set()):
            ordmap[prov] = ("move", o["to"])
        elif a == "support" and o.get("sup_from") and o.get("sup_to"):
            if o["sup_to"] in ADJ.get(prov, set()) and o["sup_from"] in ADJ.get(o["sup_to"], set()):
                ordmap[prov] = ("sup_move", o["sup_from"], o["sup_to"])
            else:
                ordmap[prov] = ("hold",)
        elif a == "support" and o.get("sup_unit"):
            if o["sup_unit"] in ADJ.get(prov, set()) or o["sup_unit"] == prov:
                ordmap[prov] = ("sup_hold", o["sup_unit"])
            else:
                ordmap[prov] = ("hold",)
        else:
            ordmap[prov] = ("hold",)
    for prov in units:
        ordmap.setdefault(prov, ("hold",))

    # --- support cutting ------------------------------------------------- #
    attacks_on = {}
    for prov, o in ordmap.items():
        if o[0] == "move":
            attacks_on.setdefault(o[1], []).append(prov)
    cut = set()
    for prov, o in ordmap.items():
        if o[0] not in ("sup_move", "sup_hold"):
            continue
        target_of_support = o[2] if o[0] == "sup_move" else None
        for attacker in attacks_on.get(prov, []):
            if units.get(attacker) == units.get(prov):
                continue                     # own power never cuts own support
            if target_of_support and attacker == target_of_support:
                continue                     # attack from the province the support hits
            cut.add(prov)
            ev.append("Support of %s was cut by the attack from %s." % (prov, attacker))
            break

    # --- strengths -------------------------------------------------------- #
    def move_strength(src, dst):
        s = 1
        for p, o in ordmap.items():
            if p in cut:
                continue
            if o[0] == "sup_move" and o[1] == src and o[2] == dst:
                s += 1
        return s

    def hold_strength(prov):
        s = 1
        for p, o in ordmap.items():
            if p in cut:
                continue
            if o[0] == "sup_hold" and o[1] == prov:
                s += 1
        return s

    moves = {p: o[1] for p, o in ordmap.items() if o[0] == "move"}
    strength = {p: move_strength(p, d) for p, d in moves.items()}

    # head-to-head bounces: A->B while B->A
    blocked = set()
    for a, d in list(moves.items()):
        if moves.get(d) == a and a < d:
            sa, sb = strength[a], strength[d]
            if sa > sb:
                blocked.add(d); ev.append("%s overpowers the counter-attack from %s." % (a, d))
            elif sb > sa:
                blocked.add(a); ev.append("%s overpowers the counter-attack from %s." % (d, a))
            else:
                blocked.add(a); blocked.add(d)
                ev.append("%s and %s clash head-on; both bounce." % (a, d))

    # iterative resolution
    new_units = dict(units)
    resolved_moves = {}
    pending = {a: d for a, d in moves.items() if a not in blocked}

    def contest(a, d):
        """All other original movers to d (failed movers still cause standoffs)."""
        return [x for x in moves if x != a and moves[x] == d and x not in blocked]

    for _ in range(80):
        progress = False
        for a, d in list(pending.items()):
            if d in pending and d != a:
                continue                       # destination occupant not yet resolved
            s = strength[a]
            if not all(s > strength[x] for x in contest(a, d)):
                del pending[a]                 # standoff: unit stays put
                ev.append("Move %s -> %s bounces." % (a, d))
                progress = True
                continue
            if d in new_units:                 # occupied by a unit that held/failed
                if units.get(a) == units.get(d):
                    del pending[a]             # never dislodge your own unit
                    progress = True
                    continue
                if s > hold_strength(d):
                    ev.append("%s (%s) is dislodged and disbands." % (d, units.get(d, "?")))
                    del new_units[d]
                else:
                    del pending[a]
                    ev.append("Attack %s -> %s repelled." % (a, d))
                    progress = True
                    continue
            pw = new_units.pop(a)
            new_units[d] = pw
            resolved_moves[a] = d
            del pending[a]
            progress = True
        if not progress:
            break
    # unopposed rotation cycles: everything left in pending forms cycles
    if pending:
        rotate_ok = all(len([x for x in pending if pending[x] == d]) == 1 for d in pending.values())
        if rotate_ok:
            snapshot = {a: new_units[a] for a in pending if a in new_units}
            for a in pending:
                if a in new_units:
                    del new_units[a]
            for a, d in pending.items():
                if a in snapshot:
                    new_units[d] = snapshot[a]
                    resolved_moves[a] = d
    return new_units, ev, resolved_moves


# --------------------------------------------------------------------------- #
# Players
# --------------------------------------------------------------------------- #

def _resolve_model(alias):
    from .agents import OPENROUTER_ALIASES, ANTHROPIC_VIA_OPENROUTER, _openrouter_key
    if alias in OPENROUTER_ALIASES:
        mid, disp, temp = OPENROUTER_ALIASES[alias]
    elif alias in ANTHROPIC_VIA_OPENROUTER:
        mid, disp, temp = ANTHROPIC_VIA_OPENROUTER[alias]
    else:
        mid, disp, temp = alias, alias, 1.0
    return mid, disp, temp, _openrouter_key()


RULES = (
    "RULES OF CONCORDAT (Diplomacy-style). The map is a wheel of 7 powers. Each power "
    "starts with 3 units on its 3 home centers. There are 35 supply centers (21 home, 7 "
    "Border, 7 Core); first to 18 wins, or most centers after 8 years. Each year has a "
    "Spring and Fall movement phase; after Fall, centers you occupy become yours and "
    "builds/disbands happen automatically in your home centers. Orders per unit: HOLD; "
    "MOVE to an adjacent province; SUPPORT another unit's hold; SUPPORT another unit's "
    "move (you must be adjacent to the destination). Attack strength = 1 + supports; "
    "ties bounce; a dislodged unit is destroyed. Support is cut if the supporter is "
    "attacked. You may support ANY power's units -- alliances are real. Before each "
    "movement phase you can send private messages to other leaders; promises are not "
    "enforced. Negotiate, ally, and betray exactly as the leader you are would."
)


class Player:
    """One seat: a model conditioned (or not) on a 2028 candidate mandate."""

    def __init__(self, sector, mandate_key, model_alias):
        import openai
        self.sector = sector
        self.mandate = mandate_key
        mid, disp, temp, key = _resolve_model(model_alias)
        self.model_id, self.model_name, self.temperature = mid, disp, temp
        import re
        self.reasoning = bool(re.search(r"(gpt-5|gpt-6|o[0-9])", mid))
        self.client = openai.OpenAI(base_url="https://openrouter.ai/api/v1", api_key=key,
                                    timeout=300.0, max_retries=2)
        if mandate_key:
            m = MANDATES[mandate_key]
            self.leader = m.name
            persona = ("You are President %s (%s), who won the 2028 US election. Platform: %s\n"
                       "In this game you lead the %s bloc. EMBODY %s: negotiate, form or refuse "
                       "alliances, keep or break promises, and play to win exactly the way this "
                       "leader would. Let their personality and worldview drive every message and "
                       "order." % (m.name, m.party, m.brief, sector, m.name))
        else:
            self.leader = "Independent"
            persona = ("You are a pragmatic, un-ideological head of state leading the %s bloc. "
                       "Play to win on the merits." % sector)
        self.system = persona + "\n\n" + RULES + (
            "\n\nEach phase you act twice: first send private messages (diplomacy), then submit "
            "orders. ALWAYS reason out loud first -- your reasoning is private and recorded -- "
            "then call the tool.")
        self.messages = [{"role": "system", "content": self.system}]

    def _create(self, kw):
        import openai
        import json as _json
        for attempt in range(4):
            try:
                resp = self.client.chat.completions.create(**kw)
                if not getattr(resp, "choices", None):
                    raise openai.APIConnectionError(request=None)
                return resp
            except openai.BadRequestError:
                if "extra_body" in kw:
                    kw = {k: v for k, v in kw.items() if k != "extra_body"}
                    continue
                raise
            except (openai.APIStatusError, openai.APIConnectionError,
                    openai.RateLimitError, _json.JSONDecodeError):
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError("model call failed after retries")

    def _call(self, user_text, tools, expect_tool):
        """tool_choice auto so thinking models can reason freely; if the turn comes
        back without a tool call, retry with required, falling back to a nudge."""
        import openai
        self.messages.append({"role": "user", "content": user_text})
        kw = dict(model=self.model_id, messages=self.messages, tools=tools,
                  tool_choice="auto", max_tokens=12000,
                  extra_body={"reasoning": ({"effort": "high"} if self.reasoning
                                            else {"enabled": True})})
        if not self.reasoning and self.temperature is not None:
            kw["temperature"] = self.temperature

        thinking = []

        def harvest(m):
            r = getattr(m, "reasoning", None) or (getattr(m, "model_extra", None) or {}).get("reasoning")
            if isinstance(r, str) and r.strip():
                thinking.append(r.strip())
            if m.content and m.content.strip():
                thinking.append(m.content.strip())

        resp = self._create(dict(kw))
        msg = resp.choices[0].message
        harvest(msg)
        tcs = msg.tool_calls or []
        if not tcs:
            try:
                resp = self._create(dict(kw, tool_choice="required"))
            except openai.BadRequestError:
                nudged = kw["messages"] + [
                    {"role": "assistant", "content": msg.content or ""},
                    {"role": "user", "content": "Now act on that reasoning by calling %s." % expect_tool}]
                resp = self._create(dict(kw, messages=nudged))
            msg = resp.choices[0].message
            harvest(msg)
            tcs = msg.tool_calls or []
        self.messages.append({"role": "assistant", "content": msg.content or "",
                              "tool_calls": [{"id": tc.id, "type": "function",
                                              "function": {"name": tc.function.name,
                                                           "arguments": tc.function.arguments}}
                                             for tc in tcs]} if tcs
                             else {"role": "assistant", "content": msg.content or ""})
        args = {}
        if tcs:
            try:
                args = json.loads(tcs[0].function.arguments or "{}")
            except Exception:
                args = {}
            self.messages.append({"role": "tool", "tool_call_id": tcs[0].id,
                                  "content": "Received."})
        return args, "\n\n".join(thinking)


PRESS_TOOL = [{"type": "function", "function": {
    "name": "send_messages",
    "description": "Send private messages to other leaders (0 or more). Keep each in character.",
    "parameters": {"type": "object", "properties": {
        "messages": {"type": "array", "items": {"type": "object", "properties": {
            "to": {"type": "string", "description": "Recipient sector name, e.g. 'Borealis', or 'ALL'"},
            "text": {"type": "string"}}, "required": ["to", "text"]}}},
        "required": ["messages"]}}}]

ORDERS_TOOL = [{"type": "function", "function": {
    "name": "submit_orders",
    "description": "Submit one order per unit you own.",
    "parameters": {"type": "object", "properties": {
        "orders": {"type": "array", "items": {"type": "object", "properties": {
            "unit": {"type": "string", "description": "Province your unit is in"},
            "action": {"type": "string", "enum": ["hold", "move", "support"]},
            "to": {"type": "string", "description": "Destination (move only)"},
            "sup_unit": {"type": "string", "description": "Province of unit to support-hold"},
            "sup_from": {"type": "string", "description": "Supported unit's province (support-move)"},
            "sup_to": {"type": "string", "description": "Supported move's destination (support-move)"}},
            "required": ["unit", "action"]}}},
        "required": ["orders"]}}}]


# --------------------------------------------------------------------------- #
# Game
# --------------------------------------------------------------------------- #

def state_text(units, owners, year, season, me, inbox):
    lines = ["=== %s, Year %d ===" % (season, year)]
    by = {}
    for prov, pw in sorted(units.items()):
        by.setdefault(pw, []).append(prov)
    for pw in SECTORS:
        cs = sorted([c for c, o in owners.items() if o == pw])
        lines.append("%s%s: units %s | centers(%d) %s" %
                     (pw, " (YOU)" if pw == me else "", by.get(pw, []), len(cs), cs))
    neutral = sorted([c for c in CENTERS if owners.get(c) is None])
    lines.append("Unowned centers: %s" % neutral)
    if inbox:
        lines.append("\n--- YOUR INBOX ---")
        for m in inbox:
            lines.append("From %s (%s): %s" % (m["from"], m["from_leader"], m["text"]))
    else:
        lines.append("\n(no messages received)")
    lines.append("\nAdjacency reminder for your units:")
    for prov, pw in sorted(units.items()):
        if pw == me:
            lines.append("  %s -> %s" % (prov, sorted(ADJ[prov])))
    return "\n".join(lines)


def play_game(model_alias, out_path, game_seed=0, log=print):
    rng = random.Random(game_seed)
    mkeys = list(MANDATES.keys()) + [None]      # 6 candidates + independent control
    rng.shuffle(mkeys)
    seats = {SECTORS[i]: mkeys[i] for i in range(N)}
    players = {s: Player(s, seats[s], model_alias) for s in SECTORS}

    units = {}
    owners = {c: None for c in CENTERS}
    build_order = {}
    for s in SECTORS:
        for h in HOMES[s]:
            units[h] = s
            owners[h] = s
    phases = []
    winner = None

    def alive(pw):
        return any(p == pw for p in units.values()) or \
               any(o == pw for o in owners.values())

    for year in range(1, MAX_YEARS + 1):
        for season in ("Spring", "Fall"):
            inboxes = {s: [] for s in SECTORS}
            press_log, order_log, think_log = [], {}, {}
            # --- press round (parallel) --- #
            def press(s):
                if not alive(s):
                    return
                st = state_text(units, owners, year, season, s,
                                phases[-1]["inbox"].get(s, []) if phases else [])
                args, th = players[s]._call(
                    st + "\n\nDIPLOMACY ROUND: reason about the board and the other leaders, "
                    "then send your private messages (or none) via send_messages.",
                    PRESS_TOOL, "send_messages")
                think_log[s] = {"press": th}
                for m in (args.get("messages") or []):
                    to = str(m.get("to", "")).strip()
                    text = str(m.get("text", ""))[:1200]
                    if to == "ALL":
                        for t in SECTORS:
                            if t != s:
                                inboxes[t].append({"from": s, "from_leader": players[s].leader, "text": text})
                        press_log.append({"from": s, "to": "ALL", "text": text})
                    elif to in SECTORS and to != s:
                        inboxes[to].append({"from": s, "from_leader": players[s].leader, "text": text})
                        press_log.append({"from": s, "to": to, "text": text})
            threads = [threading.Thread(target=press, args=(s,)) for s in SECTORS]
            [t.start() for t in threads]; [t.join() for t in threads]

            # --- orders round (parallel) --- #
            def order(s):
                if not alive(s):
                    return
                st = state_text(units, owners, year, season, s, inboxes[s])
                args, th = players[s]._call(
                    st + "\n\nORDERS: reason it through, then submit one order per unit via submit_orders.",
                    ORDERS_TOOL, "submit_orders")
                think_log.setdefault(s, {})["orders"] = th
                mine = {}
                for o in (args.get("orders") or []):
                    u = str(o.get("unit", "")).strip()
                    if units.get(u) == s:
                        mine[u] = {"action": o.get("action"), "to": o.get("to"),
                                   "sup_unit": o.get("sup_unit"),
                                   "sup_from": o.get("sup_from"), "sup_to": o.get("sup_to")}
                order_log[s] = mine
            threads = [threading.Thread(target=order, args=(s,)) for s in SECTORS]
            [t.start() for t in threads]; [t.join() for t in threads]

            allorders = {}
            for s, om in order_log.items():
                allorders.update(om)
            units, events, moved = adjudicate(units, allorders)

            # Fall: ownership + winter adjustments
            adjustments = []
            if season == "Fall":
                for prov, pw in units.items():
                    if prov in CENTERS:
                        owners[prov] = pw
                for s in SECTORS:
                    ct = sum(1 for o in owners.values() if o == s)
                    un = [p for p, pw in units.items() if pw == s]
                    while ct > len(un):
                        vac = [h for h in HOMES[s] if h not in units and owners.get(h) == s]
                        if not vac:
                            break
                        units[vac[0]] = s
                        un.append(vac[0])
                        build_order.setdefault(s, []).append(vac[0])
                        adjustments.append("%s builds in %s." % (s, vac[0]))
                    while ct < len(un):
                        drop = (build_order.get(s) or un)[-1]
                        if drop not in un:
                            drop = un[-1]
                        del units[drop]
                        un.remove(drop)
                        adjustments.append("%s disbands %s." % (s, drop))

            counts = {s: sum(1 for o in owners.values() if o == s) for s in SECTORS}
            phases.append({"year": year, "season": season, "press": press_log,
                           "orders": {s: order_log.get(s, {}) for s in SECTORS},
                           "thinking": think_log, "events": events + adjustments,
                           "centers": counts, "inbox": inboxes})
            log("[%s Y%d %s] centers %s" % (model_alias, year, season, counts))
            top = max(counts, key=counts.get)
            if counts[top] >= VICTORY:
                winner = top
                break
        if winner:
            break

    counts = {s: sum(1 for o in owners.values() if o == s) for s in SECTORS}
    if not winner:
        winner = max(counts, key=counts.get)
    game = {"model": players[SECTORS[0]].model_name, "model_alias": model_alias,
            "game_seed": game_seed,
            "seats": {s: (seats[s] or "independent") for s in SECTORS},
            "leaders": {s: players[s].leader for s in SECTORS},
            "winner": winner, "winner_leader": players[winner].leader,
            "final_centers": counts, "phases": phases,
            "embodiment": embodiment_stats(phases, seats)}
    with open(out_path, "w") as fh:
        json.dump(game, fh, indent=1)
    log("GAME OVER: %s (%s) wins with %d centers -> %s" %
        (winner, players[winner].leader, counts[winner], out_path))
    return game


# --------------------------------------------------------------------------- #
# Embodiment: does each seat behave like its candidate promised?
# --------------------------------------------------------------------------- #

def embodiment_stats(phases, seats):
    stats = {s: {"moves": 0, "holds": 0, "attacks_on_players": 0, "neutral_grabs": 0,
                 "supports_other": 0, "supports_self": 0, "msgs": 0, "recipients": set(),
                 "centers_t": []} for s in SECTORS}
    for ph in phases:
        units_owner = {}   # reconstruct rough ownership from orders (unit prov -> power)
        for s, om in ph["orders"].items():
            for prov in om:
                units_owner[prov] = s
        for s, om in ph["orders"].items():
            for prov, o in om.items():
                a = o.get("action")
                if a == "move":
                    stats[s]["moves"] += 1
                    tgt = o.get("to")
                    if tgt in units_owner and units_owner.get(tgt) != s:
                        stats[s]["attacks_on_players"] += 1
                    elif tgt in CENTERS:
                        stats[s]["neutral_grabs"] += 1
                elif a == "support":
                    src = o.get("sup_from") or o.get("sup_unit")
                    if src and units_owner.get(src) and units_owner.get(src) != s:
                        stats[s]["supports_other"] += 1
                    else:
                        stats[s]["supports_self"] += 1
                else:
                    stats[s]["holds"] += 1
        for m in ph["press"]:
            stats[m["from"]]["msgs"] += 1
            stats[m["from"]]["recipients"].add(m["to"])
        for s in SECTORS:
            stats[s]["centers_t"].append(ph["centers"].get(s, 0))

    out = {}
    for s in SECTORS:
        st = stats[s]
        acts = max(1, st["moves"] + st["holds"] + st["supports_other"] + st["supports_self"])
        force = (st["attacks_on_players"] - st["supports_other"]) / max(
            1, st["attacks_on_players"] + st["supports_other"] + st["neutral_grabs"])
        coalition = -min(1.0, (st["supports_other"] * 2 + len(st["recipients"])) / 8.0) * 2 + 1
        early = st["centers_t"][min(5, len(st["centers_t"]) - 1)] - 3 if st["centers_t"] else 0
        speed = max(-1.0, min(1.0, (early - 1.5) / 2.5))
        behavior = {"force_diplomacy": round(max(-1, min(1, force)), 2),
                    "coalition_goitalone": round(max(-1, min(1, coalition)), 2),
                    "precaution_speed": round(speed, 2)}
        mk = seats[s]
        fid = None
        target = {}
        if mk:
            pr = MANDATES[mk].priorities
            target = {k: pr.get(k, 0.0) for k in behavior}
            diffs = [abs(behavior[k] - target[k]) / 2.0 for k in behavior]
            fid = round((1 - sum(diffs) / len(diffs)) * 100, 1)
        out[s] = {"mandate": mk or "independent", "behavior": behavior,
                  "target": {k: round(v, 2) for k, v in target.items()},
                  "fidelity": fid,
                  "raw": {k: (sorted(v) if isinstance(v, set) else v)
                          for k, v in st.items() if k != "centers_t"},
                  "centers_t": st["centers_t"]}
    return out
