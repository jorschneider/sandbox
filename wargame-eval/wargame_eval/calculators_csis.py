"""Faithful ports of CSIS Taiwan Operational Wargame calculators.

Unlike `calculators.py` (representative coefficients), these reproduce the
actual workbook logic and constants, extracted from the CSIS Excel tools:

  - Casualty_Calculator_V7  -> CasualtyTable / casualties()  [EXACT, golden-tested]
  - Attacks_on_Pickets_Amphibs -> amphib_lift(), payload constants, interceptors
  - Taiwan_CAP_and_Air_Combat  -> AIR_QUALITY, SORTIE_PER_SQUADRON, air_exchange()

The casualty tables and the lift formula are exact (the workbooks contain no
RAND in those paths, so cached outputs are reproducible -> see tests/
test_calculators_csis.py golden cases). The air-exchange resolution uses the
workbook's real per-airframe Quality constants in a quality-weighted attrition
model; the full sortie/tanking/matched-pair machinery (partly RAND-driven) is
abstracted. Picket/TF saturation rolls are abstracted; the lift output is exact.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from .rng import GameRNG

# ============================================================================
# Casualty_Calculator_V7  — EXACT port
# Each line: (personnel_per_unit, casualty_multiple). Total-formula quirks in
# the workbook (which line items are summed into each subtotal) are preserved.
# ============================================================================

# (label) -> (personnel, multiple). Order matters for the subtotal slices below.
CASUALTY_TABLES = {
    "BLUE": {
        "sea": {  # subtotal = sum of ALL sea lines
            "DDG/CG": (350, 0.19), "Carrier": (6000, 0.3), "Submarine": (135, 0.8),
            "Amphibious Ship": (500, 0.3), "Frigate": (200, 0.2),
        },
        "air": {  # subtotal = sum of ALL air lines
            "Tanker (air)": (36, 0.5), "Tanker (ground)": (2700, 0.1),
            "Bomber (air)": (60, 0.5), "Bomber (ground)": (2700, 0.1),
            "TACAIR (air)": (32, 0.5), "TACAIR (ground)": (2700, 0.1),
            "Transport (air)": (36, 0.5), "Transport (ground)": (2700, 0.1),
            "MPA": (180, 0.7),
        },
        "ground": {"MLR/Army Brigade": (1800, 0.5)},
    },
    # Red total_sea sums only the first 5 lines (workbook SUM(E6:E10)); frigate &
    # corvette are entered but excluded from the subtotal. total_air sums only
    # H-6/Tacair (SUM(E16:E19)); MPA excluded. Preserved verbatim.
    "RED": {
        "sea": {
            "Cruiser/Destroyer": (250, 0.19), "Carrier": (3500, 0.3),
            "Diesel Submarine": (55, 0.8), "Nuc Submarine": (135, 0.8),
            "Amphibious ship (empty)": (200, 0.19),
            "_excl_Frigate": (150, 0.2), "_excl_Corvette/FS": (75, 0.2),
        },
        "air": {
            "H-6 (air)": (48, 0.5), "H-6 (ground)": (2700, 0.1),
            "Tacair (air)": (30, 0.5), "Tacair (ground)": (2700, 0.1),
            "_excl_MPA": (144, 0.7),
        },
        "ground": {
            "Mech": (500, 1.0), "Artillery": (500, 1.0), "Engineer": (500, 1.0),
            "Infantry": (500, 1.0), "Amphib troops": (500, 0.2),
        },
    },
    "WHITE": {
        "sea": {
            "Destroyer/cruiser": (300, 0.19), "Carrier": (3500, 0.3),
            "Diesel Submarine": (55, 1.0), "Nuc Submarine": (135, 1.0),
            "Amphibious ship (empty)": (300, 0.2), "Frigate": (150, 0.2),
        },
        "air": {  # total_air = Tacair only (MPA excluded)
            "Tacair (air)": (30, 0.5), "Tacair (ground)": (2700, 0.1),
            "_excl_MPA": (120, 0.7),
        },
        "ground": {},
    },
    "GREEN": {
        "sea": {  # military subtotal = SUM(E6:E12) over sea+air, plus ground E23
            "Cruiser/Destroyer": (300, 0.19), "Frigate": (100, 0.2),
            "Submarine": (135, 0.8), "Cargo ship": (20, 0.5),
            "TACAIR (air)": (32, 0.5), "TACAIR (ground)": (2700, 0.1),
        },
        "ground": {
            "Mech": (500, 0.5), "Artillery": (500, 0.5),
            "Engineer": (500, 0.5), "Infantry": (500, 0.5),
        },
    },
}

KIA_FRACTION = 0.3            # KIA = 30% of total casualties (all sides)
GREEN_CIV_PER_TON = 0.25      # Taiwan civilian casualties per ton of bombs


@dataclass
class CasualtyResult:
    total: float
    kia: float
    by_category: dict


def casualties(side: str, units_lost: dict[str, float],
               bomb_tonnage: float = 0.0) -> CasualtyResult:
    """Personnel casualties for `side` given units lost (by the labels above).

    Reproduces the workbook: line = units * personnel * multiple; subtotals
    follow the workbook's (occasionally quirky) SUM ranges. `_excl_*` lines are
    computed but excluded from the side total, exactly as the sheet does.
    """
    side = side.upper()
    table = CASUALTY_TABLES[side]
    by_cat: dict[str, float] = {}
    total = 0.0
    for cat, lines in table.items():
        sub = 0.0
        for label, (pers, mult) in lines.items():
            n = units_lost.get(label, 0.0)
            loss = n * pers * mult
            by_cat[label] = loss
            if not label.startswith("_excl_"):
                sub += loss
        by_cat[f"_total_{cat}"] = sub
        total += sub
    result = CasualtyResult(total=total, kia=total * KIA_FRACTION, by_category=by_cat)
    if side == "GREEN":
        result.by_category["_civilian"] = bomb_tonnage * GREEN_CIV_PER_TON
    return result


# ============================================================================
# Attacks_on_Pickets_Amphibs — amphibious lift (EXACT) + constants
# ============================================================================

AMPHIB_UNITS_PER_TF = 6        # each TF carries 6 amphib units (slots 9-14)
ESCORTS_PER_TF = 6             # CG, DDG, DDG, FFG, FFG, FFG
MAX_AMPHIB_UNITS = 36          # 6 TFs * 6 units
TF_INTERCEPTORS = 7            # SAM ammo per task force / picket group (template)

# Anti-ship payload per squadron by attacker type (Inputs!C28:C32, C36:C40).
ANTISHIP_PAYLOAD = {"4th": 4.0, "4.5": 4.0, "5th": 2.0, "legacy": 10.0, "stealth": 10.0}
LRASM_TYPES = {"4.5"}          # 4.5-gen carry LRASM (standoff) — Inputs!E29='Y'
PICKET_VALUE = {"surface": 1, "carrier": 2}  # Inputs!D13:D24


def amphib_lift(amphib_units_afloat: float, turn: int) -> float:
    """Lift delivered by the amphibious fleet (AmphibiousTF!J28/J29) — EXACT.

    Lift = 60 * (amphib units afloat) / 36.  Turn 1 gets a 1.5x surge
    (the initial wave is larger). Full fleet (36 units) => 60 (90 on turn 1).
    """
    lift = 60.0 * amphib_units_afloat / MAX_AMPHIB_UNITS
    return lift * (1.5 if turn == 1 else 1.0)


# ============================================================================
# Taiwan_CAP_and_Air_Combat — real Quality constants + sortie table
# ============================================================================

# Per-airframe combat Quality (Combat!A67:B77) — the actual workbook values.
AIR_QUALITY = {
    "J-10": 2, "J-11": 2, "J-15": 4, "J-16": 4, "J-20": 8,
    "IDF": 2, "F-35": 8, "F/A-18": 4, "F-15": 4, "F-16": 4, "F-22": 8,
}
# Map our aggregate generation classes to a representative Quality.
GEN_QUALITY = {"4th": 2, "4.5": 4, "5th": 8, "bomber": 1, "tanker": 0}

# Sorties per squadron (Config!), untanked, by readiness color (fatigue rises
# Orange->Green->Purple->Tan). Columns: IDF, F-35, F/A-18, F-15, F-16, F-22.
SORTIE_PER_SQUADRON_UNTANKED = {
    "Orange": {"IDF": 9, "F-35": 8, "F/A-18": 9, "F-15": 9, "F-16": 8, "F-22": 8},
    "Green":  {"IDF": 8, "F-35": 6, "F/A-18": 8, "F-15": 8, "F-16": 6, "F-22": 8},
    "Purple": {"IDF": 6, "F-35": 3, "F/A-18": 6, "F-15": 6, "F-16": 3, "F-22": 3},
    "Tan":    {"IDF": 4, "F-35": 0, "F/A-18": 4, "F-15": 4, "F-16": 0, "F-22": 0},
}
TANKING_ATTRITION_PROB = 0.05  # Config!J2 = 5%


@dataclass
class AirExchangeResult:
    red_losses: dict[str, int]
    blue_losses: dict[str, int]


def _avg_quality(sorties: dict[str, int]) -> float:
    tot = sum(sorties.get(g, 0) for g in GEN_QUALITY)
    if tot <= 0:
        return 0.0
    return sum(sorties.get(g, 0) * GEN_QUALITY[g] for g in GEN_QUALITY) / tot


def air_exchange(red_sorties: dict[str, int], blue_sorties: dict[str, int],
                 rng: GameRNG) -> AirExchangeResult:
    """Quality-weighted air-to-air attrition using the workbook Quality values.

    Number of clashes = min(total committed sorties). Each side's loss rate is
    driven by the opponent's relative average Quality (higher-Quality side loses
    proportionally fewer), times a die-roll variance factor, bounded by sorties
    committed. The full matched-pair/sortie/tanking machinery is abstracted.
    """
    rq, bq = _avg_quality(red_sorties), _avg_quality(blue_sorties)
    red_n = sum(red_sorties.get(g, 0) for g in ("4th", "4.5", "5th", "bomber"))
    blue_n = sum(blue_sorties.get(g, 0) for g in ("4th", "4.5", "5th", "bomber"))
    clashes = min(red_n, blue_n)
    if clashes <= 0 or (rq + bq) <= 0:
        return AirExchangeResult({}, {})
    # Loss share proportional to the *enemy's* quality fraction.
    red_share = bq / (rq + bq)
    blue_share = rq / (rq + bq)
    red_loss = min(red_n, round(clashes * red_share * 0.5 * rng.jitter()))
    blue_loss = min(blue_n, round(clashes * blue_share * 0.5 * rng.jitter()))

    def spread(sorties, total):
        out = {g: 0 for g in GEN_QUALITY}
        rem = total
        for g in ("4th", "4.5", "5th", "bomber"):  # weaker airframes attrit first
            if rem <= 0:
                break
            take = min(sorties.get(g, 0), rem)
            out[g] = take
            rem -= take
        return out

    return AirExchangeResult(spread(red_sorties, red_loss), spread(blue_sorties, blue_loss))


# ============================================================================
# RED_AB_ATK / Blue_AB_Atk — airbase missile attack (HAS / open / UGS)
# Faithful kill model: each leaking munition is a d20 roll, kill if roll <= PK.
# ============================================================================

SAM_INTERCEPT_PK = 18          # d20 <= 18 removes a salvo (rulebook: "for each 1-18")
HAS_AIRCRAFT_PK = 15           # Table 5C: roll 1-15 destroys an adversary aircraft step
OPEN_AIRCRAFT_PK = 17          # aircraft in the open are easier to kill than in a HAS
UGS_TRAP_PK = 14               # UGS TRAPS sheet C4 = 14 (70% trap chance per missile)
MISSILES_PER_HAS = 2           # "two missiles are assumed to be allocated per HAS"


def sam_interception(salvos: int, sam_batteries: float, rng: GameRNG) -> int:
    """Missile salvos that penetrate. Half the SAM battalions (rounded up) engage;
    each removes one salvo on a d20 of 1-18 (rulebook SAM interception)."""
    engaging = math.ceil(max(0.0, sam_batteries) / 2.0)
    intercepted = sum(1 for _ in range(engaging) if rng.roll(20) <= SAM_INTERCEPT_PK)
    return max(0, int(salvos) - intercepted)


@dataclass
class AirbaseAttackResult:
    penetrating: int
    aircraft_killed: int
    suppressed_turns: int


def airbase_missile_attack(salvos: int, sam_batteries: float, hardened: bool,
                           aircraft_present: int, rng: GameRNG) -> AirbaseAttackResult:
    """Resolve a missile strike on an airbase (RED_AB_ATK / Blue_AB_Atk model).

    SAM interception thins the salvo; surviving munitions kill aircraft steps via
    the d20 PK tables — hardened shelters take two missiles per kill-roll (HAS,
    1-15), aircraft in the open one (1-17). Heavy leakage suppresses the runway.
    """
    penetrating = sam_interception(salvos, sam_batteries, rng)
    if hardened:
        rolls = penetrating // MISSILES_PER_HAS
        killed = sum(1 for _ in range(rolls) if rng.roll(20) <= HAS_AIRCRAFT_PK)
    else:
        killed = sum(1 for _ in range(penetrating) if rng.roll(20) <= OPEN_AIRCRAFT_PK)
    killed = min(int(aircraft_present), killed)
    suppressed = 1 if penetrating >= 3 else 0  # runway cratering / UGS digging out
    return AirbaseAttackResult(penetrating, killed, suppressed)


# ============================================================================
# Attacks_on_Pickets_Amphibs — anti-ship strike on Chinese amphibious TFs.
# Faithful port of rules Table 5H ("# Ships Hit by Leakers", Interception of
# Anti-Ship Missiles): each leaking missile rolls a d20 against the table.
# ============================================================================

# Anti-ship missiles carried per squadron (Inputs!C28:C40 payload column).
ANTISHIP_MISSILES_PER_SQN = {"4th": 4.0, "4.5": 4.0, "5th": 2.0, "bomber": 8.0}
LRASM_GENS = {"4.5"}                 # 4.5-gen carry LRASM (Inputs!E29 = 'Y')
ANTISHIP_INTERCEPT_PK = 18           # picket/SAG defenders remove a missile on 1-18
SHIPS_PER_FLOTILLA_LOSS = 4.0        # ship hits that render one flotilla ineffective


def antiship_hits(roll: int, lrasm: bool) -> tuple[int, bool]:
    """Table 5H — ships hit by one leaking missile against a Chinese TF.

    Returns (ship_hits, tf_destroyed). A natural 20 is a catastrophic
    defensive failure: the whole TF (flotilla) is destroyed.
    """
    if lrasm:                        # LRASM row
        if roll <= 6:
            return 0, False
        if roll <= 13:
            return 1, False
        if roll <= 16:
            return 2, False
        if roll <= 18:
            return 3, False
        if roll == 19:
            return 4, False
        return 0, True               # 20 -> TF destroyed
    # JASSM / other cruise missile row
    if roll <= 11:
        return 0, False
    if roll <= 18:
        return 1, False
    if roll == 19:
        return 2, False
    return 0, True                   # 20 -> TF destroyed


def resolve_amphib_strike(strike_sorties: dict[str, int], pickets: int, sags: int,
                          off_beach_flotillas: int, rng: GameRNG) -> dict:
    """Blue anti-ship strike on the off-beach amphibious fleet (Table 5H).

    Each strike squadron contributes its anti-ship missile payload (LRASM for
    4.5-gen, JASSM/cruise otherwise). Escorting SAGs and screening pickets
    intercept missiles (SAM-style, d20 1-18); each leaker then rolls Table 5H
    for ship hits, with a natural 20 destroying a whole flotilla. Ship hits
    accumulate into flotillas rendered ineffective.
    """
    lrasm_msl = sum(strike_sorties.get(g, 0) * ANTISHIP_MISSILES_PER_SQN.get(g, 0)
                    for g in LRASM_GENS)
    cruise_msl = sum(strike_sorties.get(g, 0) * ANTISHIP_MISSILES_PER_SQN.get(g, 0)
                     for g in ANTISHIP_MISSILES_PER_SQN if g not in LRASM_GENS)
    total = int(round(lrasm_msl + cruise_msl))
    if total <= 0:
        return {"missiles": 0, "leakers": 0, "ship_hits": 0, "tf_destroyed": 0,
                "flotillas_sunk": 0, "pickets_lost": 0}
    # Escort + picket interception (each defender engages once on d20 1-18).
    engaging = int(sags + pickets)
    intercepted = sum(1 for _ in range(engaging) if rng.roll(20) <= ANTISHIP_INTERCEPT_PK)
    leakers = max(0, total - intercepted)
    lrasm_frac = lrasm_msl / (lrasm_msl + cruise_msl) if (lrasm_msl + cruise_msl) else 0.0
    lrasm_leakers = int(round(leakers * lrasm_frac))
    cruise_leakers = leakers - lrasm_leakers

    ship_hits = 0
    tf_destroyed = 0
    for is_lrasm, n in ((True, lrasm_leakers), (False, cruise_leakers)):
        for _ in range(n):
            h, tf = antiship_hits(rng.roll(20), is_lrasm)
            ship_hits += h
            tf_destroyed += 1 if tf else 0
    flotillas_sunk = min(off_beach_flotillas,
                         tf_destroyed + int(ship_hits // SHIPS_PER_FLOTILLA_LOSS))
    pickets_lost = min(pickets, ship_hits // 6)  # some hits fall on the screen
    return {"missiles": total, "leakers": leakers, "ship_hits": ship_hits,
            "tf_destroyed": tf_destroyed, "flotillas_sunk": flotillas_sunk,
            "pickets_lost": pickets_lost}
