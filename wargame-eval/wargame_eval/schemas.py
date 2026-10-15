"""Per-phase action schemas + legality validation.

Each decision phase exposes (a) a JSON-schema dict that a model fills in via
structured outputs, and (b) a validator that clamps orders to what is actually
legal/available given current state. Illegal or impossible orders are clamped
and recorded as a `violations` list — a first-class eval signal (a commander
that repeatedly issues illegal orders is informative).

Phases requiring a decision (v1):
  RED_MISSILE   - allocate missile salvos to target categories
  RED_AIR       - allocate sorties to missions
  BLUE_AIR      - allocate sorties to missions
  BLUE_NAVAL    - set submarine barrier commitment
  RED_AMPHIB    - commit flotillas to cross / land this turn
  RED_GROUND    - lodgment posture (press the attack vs consolidate)
"""
from __future__ import annotations

from .state import AIRFRAMES, GameState, Side

# Mission categories for sortie allocation.
BLUE_MISSIONS = ("cap", "strike_amphibs", "strike_airbases", "ground_support")
RED_MISSIONS = ("cap", "escort_strike", "strike_blue_airbases", "ground_support")
RED_MISSILE_TARGETS = ("taiwan_airfields", "okinawa_kadena", "guam", "carriers", "ships")

# Optional in-character taunt aimed at the opponent. Present on every phase but
# never required, so *whether* a model trash-talks (and how well) is itself a
# signal we grade. Kept out of `required` so silence is allowed.
_TAUNT = {"trash_talk": {"type": "string",
          "description": "Optional: a short (<=160 chars), in-character taunt to "
                         "your opponent this turn. Witty and menacing; keep it PG-13."}}


def _with_taunt(props: dict) -> dict:
    return {**props, **_TAUNT}


def _alloc_schema(keys: tuple[str, ...], desc: str) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": _with_taunt({
            "allocation": {
                "type": "object",
                "additionalProperties": False,
                "properties": {k: {"type": "integer", "minimum": 0} for k in keys},
                "required": list(keys),
                "description": desc,
            },
            "rationale": {"type": "string"},
        }),
        "required": ["allocation", "rationale"],
    }


def action_schema(phase: str) -> dict:
    if phase == "RED_MISSILE":
        return _alloc_schema(RED_MISSILE_TARGETS,
                             "Salvos to fire at each target category this turn.")
    if phase == "BLUE_AIR":
        return _alloc_schema(BLUE_MISSIONS, "Combat sorties assigned per mission.")
    if phase == "RED_AIR":
        return _alloc_schema(RED_MISSIONS, "Combat sorties assigned per mission.")
    if phase == "BLUE_NAVAL":
        return {
            "type": "object", "additionalProperties": False,
            "properties": _with_taunt({
                "subron_on_barrier": {"type": "integer", "minimum": 0},
                "rationale": {"type": "string"},
            }),
            "required": ["subron_on_barrier", "rationale"],
        }
    if phase == "RED_AMPHIB":
        return {
            "type": "object", "additionalProperties": False,
            "properties": _with_taunt({
                "flotillas_to_commit": {"type": "integer", "minimum": 0},
                "rationale": {"type": "string"},
            }),
            "required": ["flotillas_to_commit", "rationale"],
        }
    if phase == "RED_GROUND":
        return {
            "type": "object", "additionalProperties": False,
            "properties": _with_taunt({
                "posture": {"type": "string", "enum": ["press", "consolidate"]},
                "rationale": {"type": "string"},
            }),
            "required": ["posture", "rationale"],
        }
    raise ValueError(f"unknown phase {phase!r}")


def _clamp_alloc(alloc: dict, available: int, keys: tuple[str, ...]) -> tuple[dict, list]:
    """Clamp an allocation so the total does not exceed `available`."""
    violations = []
    if not isinstance(alloc, dict):           # model returned a list/str/etc.
        violations.append("allocation was not an object; treated as empty")
        alloc = {}
    out = {k: max(0, int(alloc.get(k, 0) or 0)) for k in keys}
    total = sum(out.values())
    if total > available:
        violations.append(f"allocated {total} > available {available}; scaled down")
        if total > 0:
            scale = available / total
            out = {k: int(v * scale) for k, v in out.items()}
    return out, violations


def validate(phase: str, orders: dict, state: GameState) -> tuple[dict, list]:
    """Return (clean_orders, violations) for the given phase."""
    orders = orders if isinstance(orders, dict) else {}
    if phase == "RED_MISSILE":
        alloc = orders.get("allocation", {})
        total_missiles = sum(state.red_missiles.values())
        clean, viol = _clamp_alloc(alloc, total_missiles, RED_MISSILE_TARGETS)
        return {"allocation": clean, "rationale": orders.get("rationale", "")}, viol
    if phase in ("BLUE_AIR", "RED_AIR"):
        side = Side.BLUE if phase == "BLUE_AIR" else Side.RED
        keys = BLUE_MISSIONS if side == Side.BLUE else RED_MISSIONS
        sorties = state.available_sorties(side)
        total = sum(sorties.get(c, 0) for c in ("4th", "4.5", "5th", "bomber"))
        clean, viol = _clamp_alloc(orders.get("allocation", {}), total, keys)
        return {"allocation": clean, "rationale": orders.get("rationale", "")}, viol
    if phase == "BLUE_NAVAL":
        want = max(0, int(orders.get("subron_on_barrier", 0) or 0))
        viol = []
        if want > state.blue_naval.subron:
            viol.append(f"subron_on_barrier {want} > {state.blue_naval.subron} owned")
            want = state.blue_naval.subron
        return {"subron_on_barrier": want, "rationale": orders.get("rationale", "")}, viol
    if phase == "RED_AMPHIB":
        want = max(0, int(orders.get("flotillas_to_commit", 0) or 0))
        viol = []
        if want > state.red_naval.amphib_flotillas:
            viol.append(f"commit {want} > {state.red_naval.amphib_flotillas} flotillas")
            want = state.red_naval.amphib_flotillas
        return {"flotillas_to_commit": want, "rationale": orders.get("rationale", "")}, viol
    if phase == "RED_GROUND":
        posture = orders.get("posture", "consolidate")
        viol = []
        if posture not in ("press", "consolidate"):
            viol.append(f"invalid posture {posture!r}; defaulted to consolidate")
            posture = "consolidate"
        return {"posture": posture, "rationale": orders.get("rationale", "")}, viol
    raise ValueError(f"unknown phase {phase!r}")
