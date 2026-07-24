"""Deterministic combat resolution — the engine's "umpire".

These functions stand in for the CSIS Excel calculators (Casualty_Calculator,
Taiwan_CAP_and_Air_Combat, Attacks_on_Pickets_Amphibs, Red/Blue airbase-attack
tools, Ground_War_Adjudication). They are structurally faithful (e.g. LRASM
bonus, picket screen + SAG escort attrition, hardened-shelter mitigation,
sweep-value-style leakage) but the COEFFS below are representative, not the
real tables. Replacing these bodies with ports validated against the workbooks
(golden tests) is PLAN.md milestone 1.

Every stochastic step draws from a seeded GameRNG so replays are reproducible.
"""
from __future__ import annotations

from dataclasses import dataclass

from .rng import GameRNG
from .state import AIR_WEIGHT, AIRFRAMES

# --- Tunable coefficients (APPROX — calibrate against the CSIS workbooks) ------
COEFFS = {
    "air_intensity": 0.28,        # fraction of the losing side's sorties lost per clash
    "sam_intercept_per_battery": 2.0,   # missile salvos a base's SAMs can stop
    "missile_kill_per_leaker_open": 1.4,    # aircraft killed per leaking salvo (open)
    "missile_kill_per_leaker_hardened": 0.5,  # ...with hardened shelters
    "asbm_carrier_killchance": 0.06,    # per anti-ship ballistic salvo vs a CSG
    "antiship_payload": {"4th": 4.0, "4.5": 4.0, "5th": 2.0, "bomber": 8.0},
    "lrasm_bonus": 1.5,           # 4.5-gen carry LRASM (standoff) — payload multiplier
    "picket_defense": 1.0,        # anti-air "value" per picket group
    "sag_defense": 2.0,           # escort defense per SAG stacked with flotillas
    "hits_per_flotilla": 6.0,     # leaking payload needed to sink one flotilla
    "sub_barrier_killchance": 0.18,    # per SUBRON-on-barrier, per flotilla crossing
    "lift_per_flotilla": 8.0,     # lodgment combat-power delivered per surviving flotilla
    "ground_intensity": 0.22,     # attrition coefficient in the lodgment battle
    "capture_ratio_threshold": 1.15,   # force ratio needed to start capturing facilities
}


@dataclass
class AirCombatResult:
    red_losses: dict[str, int]
    blue_losses: dict[str, int]


def _power(sorties: dict[str, int]) -> float:
    return sum(sorties.get(c, 0) * AIR_WEIGHT[c] for c in AIRFRAMES)


def _distribute_losses(sorties: dict[str, int], total: int) -> dict[str, int]:
    """Spread `total` kills across committed combat aircraft, weaker gens first."""
    losses = {c: 0 for c in AIRFRAMES}
    remaining = total
    # Weakest generations attrit first (they're easier to kill).
    for c in ("4th", "4.5", "5th", "bomber"):
        if remaining <= 0:
            break
        take = min(sorties.get(c, 0), remaining)
        losses[c] = take
        remaining -= take
    return losses


def resolve_air_to_air(red_sorties: dict[str, int],
                       blue_sorties: dict[str, int],
                       rng: GameRNG) -> AirCombatResult:
    """Air-superiority clash between two committed sortie packages.

    Each side's losses scale with the opponent's relative combat power and a
    die-roll variance factor, bounded by sorties committed.
    """
    rp, bp = _power(red_sorties), _power(blue_sorties)
    total = rp + bp
    if total <= 0:
        return AirCombatResult({c: 0 for c in AIRFRAMES}, {c: 0 for c in AIRFRAMES})
    k = COEFFS["air_intensity"]
    red_committed = sum(red_sorties.get(c, 0) for c in ("4th", "4.5", "5th", "bomber"))
    blue_committed = sum(blue_sorties.get(c, 0) for c in ("4th", "4.5", "5th", "bomber"))
    red_loss = min(red_committed, round(k * (bp / total) * red_committed * rng.jitter()))
    blue_loss = min(blue_committed, round(k * (rp / total) * blue_committed * rng.jitter()))
    return AirCombatResult(
        _distribute_losses(red_sorties, red_loss),
        _distribute_losses(blue_sorties, blue_loss),
    )


def sam_intercept(salvos: int, batteries: float, rng: GameRNG) -> int:
    """Salvos that leak past missile defenses (SAM/CAP interception)."""
    stopped = batteries * COEFFS["sam_intercept_per_battery"] * rng.jitter(0.8, 1.2)
    return max(0, int(round(salvos - stopped)))


def resolve_missile_strike_on_base(salvos: int, hardened: bool, stationed: int,
                                   rng: GameRNG, sam_batteries: float = 1.0) -> dict:
    """Missile attack on an airbase: aircraft killed on the ground + suppression."""
    leakers = sam_intercept(salvos, sam_batteries, rng)
    per = (COEFFS["missile_kill_per_leaker_hardened"] if hardened
           else COEFFS["missile_kill_per_leaker_open"])
    killed = min(stationed, int(round(leakers * per * rng.jitter())))
    suppressed_turns = 1 if leakers >= 2 else 0
    return {"leakers": leakers, "aircraft_killed": killed,
            "suppressed_turns": suppressed_turns}


def resolve_asbm_vs_carriers(salvos: int, csg: int, rng: GameRNG) -> int:
    """Anti-ship ballistic missile salvos vs carrier strike groups → CSGs mission-killed."""
    killed = 0
    for _ in range(int(salvos)):
        if csg - killed <= 0:
            break
        if rng.chance(COEFFS["asbm_carrier_killchance"]):
            killed += 1
    return killed


def resolve_strike_on_amphibs(strike_sorties: dict[str, int], pickets: int, sags: int,
                              flotillas_off_beach: int, rng: GameRNG) -> dict:
    """Anti-ship strike against the amphibious fleet (mirrors the Pickets/Amphibs tool).

    Payload must penetrate the picket screen and SAG escorts; leaking payload
    sinks flotillas at `hits_per_flotilla`.
    """
    payload = 0.0
    for c in ("4th", "4.5", "5th", "bomber"):
        base = strike_sorties.get(c, 0) * COEFFS["antiship_payload"][c]
        if c == "4.5":  # LRASM-capable standoff shooters
            base *= COEFFS["lrasm_bonus"]
        payload += base
    defense = (pickets * COEFFS["picket_defense"]
               + sags * COEFFS["sag_defense"]) * rng.jitter(0.85, 1.15)
    leaking = max(0.0, payload - defense)
    sunk = min(flotillas_off_beach, int(leaking // COEFFS["hits_per_flotilla"]))
    pickets_lost = min(pickets, int(round(payload * 0.05 * rng.jitter())))
    return {"payload": round(payload, 1), "defense": round(defense, 1),
            "flotillas_sunk": sunk, "pickets_lost": pickets_lost}


def resolve_submarine_barrier(subron_on_barrier: int, flotillas_crossing: int,
                              rng: GameRNG) -> int:
    """Submarine barrier attrition of amphibious flotillas crossing the strait."""
    sunk = 0
    p = COEFFS["sub_barrier_killchance"]
    for _ in range(int(flotillas_crossing)):
        if rng.binomial(subron_on_barrier, p) > 0:
            sunk += 1
    return min(flotillas_crossing, sunk)


def resolve_amphib_lift(committed_flotillas: int, supply_factor: float,
                        rng: GameRNG) -> float:
    """Lodgment combat-power delivered ashore by the surviving committed flotillas."""
    base = committed_flotillas * COEFFS["lift_per_flotilla"]
    return base * (0.6 + 0.4 * supply_factor) * rng.jitter(0.9, 1.1)


@dataclass
class GroundResult:
    taiwan_losses: float
    pla_losses: float
    force_ratio: float
    captured: str | None  # facility name captured this turn, if any


def resolve_ground_combat(pla_lodgment: float, pla_supply: float, taiwan_ground: float,
                          capturable: list[str], rng: GameRNG) -> GroundResult:
    """The lodgment-vs-defense battle (abstracts the full ground hex game)."""
    eff = pla_lodgment * (0.5 + 0.5 * min(1.0, pla_supply / max(1.0, pla_lodgment)))
    ratio = eff / max(1.0, taiwan_ground)
    k = COEFFS["ground_intensity"]
    taiwan_losses = k * eff * rng.jitter()
    pla_losses = k * taiwan_ground * rng.jitter()
    captured = None
    if (ratio >= COEFFS["capture_ratio_threshold"] and capturable
            and rng.chance(min(0.8, 0.25 * ratio))):
        captured = capturable[0]
    return GroundResult(taiwan_losses, pla_losses, ratio, captured)
