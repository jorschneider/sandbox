"""Ground combat resolution — faithful port of Ground_War_Adjudication.xlsx.

Reproduces the CSIS ground CRT (Chapter 13 / the Adjudication sheet):
  - terrain combat multipliers (attacker / armor / defender),
  - per-battalion strength values,
  - odds = attacker_modified_strength / defender_modified_strength,
  - step losses = BINOM(opposing modified strength, 0.05),
  - FEBA movement (km) from an odds x d20 lookup table.

One ground hex is 30 km across, so 30 km of FEBA movement == one hex of advance.
The worked example in the sheet (attacker total 22, defender total 36, odds
0.61) is reproduced exactly by `tests/test_ground_combat.py`.
"""
from __future__ import annotations

from dataclasses import dataclass

from .rng import GameRNG

# Terrain -> (attacker_mult, armor_mult, defender_mult)  [Adjudication!D7:K10].
TERRAIN = {
    "clear": (1.0, 1.0, 2.0),
    "rough": (1.0, 1.0, 2.5),          # rough / port / airbase
    "urban": (1.0, 0.5, 2.5),          # urban / fortified
    "mountain": (1.0, 0.5, 3.0),       # mountain / beach / river
    "beach": (1.0, 0.5, 3.0),
}

# Per-battalion strength [Adjudication!F25:F35].
STRENGTH = {
    "inf": 1.0, "light_inf": 1.0, "lt_mech": 1.5, "mech": 1.5, "hvy_mech": 2.0,
    "armor": 2.0, "reserve_inf": 0.5, "spt_maneuver": 0.5,
    "artillery": 2.0, "himars": 2.0, "cas": 3.0, "helo": 2.0, "res_arty": 1.0,
    "engineer": 0.5,
}
MANEUVER = {"inf", "light_inf", "lt_mech", "mech", "hvy_mech", "armor",
            "reserve_inf", "spt_maneuver", "engineer"}
ARMOR = {"lt_mech", "mech", "hvy_mech", "armor"}   # use the armor terrain mult on attack
FIRE_SUPPORT = {"artillery", "himars", "cas", "helo", "res_arty"}

LOSS_RATE = 0.05  # BINOM.INV(strength, 0.05, RAND()) — defender/attacker BN losses

# FEBA movement (km) by odds column (1..6) and d20 roll (1..20) [FEBA Movement!].
_FEBA = {
    1: [0] * 15 + [5] * 5,                              # <1:1
    2: [0] * 5 + [5] * 10 + [10] * 5,                   # 1:1
    3: [5] * 5 + [10] * 10 + [15] * 5,                  # 1.5:1
    4: [10] * 5 + [15] * 5 + [20] * 5 + [25] * 5,       # 2:1
    5: [15] * 5 + [20] * 10 + [25] * 5,                 # 3:1
    6: [20] * 5 + [25] * 5 + [30] * 10,                 # 4:1+
}


@dataclass
class Engagement:
    attacker_strength: float
    defender_strength: float
    odds: float
    odds_col: int
    defender_losses: int   # battalion-steps
    attacker_losses: int
    feba_km: int


def _odds_col(odds: float) -> int:
    if odds < 1.0:
        return 1
    if odds < 1.5:
        return 2
    if odds < 2.0:
        return 3
    if odds < 3.0:
        return 4
    if odds < 4.0:
        return 5
    return 6


def modified_strength(units: list[tuple[str, float]], terrain: str,
                      attacking: bool) -> float:
    """Sum modified strength for a force.

    `units` is a list of (unit_type, count). On attack, armor units use the
    terrain armor multiplier and other maneuver units the attacker multiplier
    (1.0); on defense, all maneuver units use the defender multiplier. Fire
    support is unmodified by terrain in the base game.
    """
    atk_mult, armor_mult, def_mult = TERRAIN[terrain]
    total = 0.0
    for utype, count in units:
        base = count * STRENGTH.get(utype, 1.0)
        if utype in FIRE_SUPPORT:
            mult = 1.0
        elif attacking:
            mult = armor_mult if utype in ARMOR else atk_mult
        else:
            mult = def_mult
        total += base * mult
    return total


def resolve_engagement(attacker: list[tuple[str, float]],
                       defender: list[tuple[str, float]],
                       terrain: str, rng: GameRNG) -> Engagement:
    atk = modified_strength(attacker, terrain, attacking=True)
    dfd = modified_strength(defender, terrain, attacking=False)
    odds = atk / dfd if dfd > 0 else 99.0
    col = _odds_col(odds)
    # Losses ~ 5% of the *opposing* modified strength (binomial), as in the sheet.
    defender_losses = rng.binomial(round(atk), LOSS_RATE)
    attacker_losses = rng.binomial(round(dfd), LOSS_RATE)
    die = rng.roll(20)
    feba_km = _FEBA[col][die - 1]
    return Engagement(atk, dfd, odds, col, defender_losses, attacker_losses, feba_km)
