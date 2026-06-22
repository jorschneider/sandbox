"""Golden tests: faithful ports must reproduce the CSIS workbooks' cached values.

The casualty tables and the amphibious-lift formula contain no RAND in the
workbooks, so their saved outputs are exact targets.
"""
import math

from wargame_eval import calculators_csis as csis
from wargame_eval.rng import GameRNG


def approx(a, b, tol=0.01):
    return math.isclose(a, b, abs_tol=tol)


# --- Casualty_Calculator_V7 golden cases (from the workbook's cached cells) ---

def test_blue_casualties_golden():
    # Cached inputs: DDG/CG=9, Submarine=2, Frigate=16, Tanker(air)=7,
    # Bomber(air)=1, MPA=1  ->  total 1736.5, KIA 520.95.
    r = csis.casualties("BLUE", {
        "DDG/CG": 9, "Submarine": 2, "Frigate": 16,
        "Tanker (air)": 7, "Bomber (air)": 1, "MPA": 1,
    })
    assert approx(r.by_category["_total_sea"], 1454.5)
    assert approx(r.by_category["_total_air"], 282.0)
    assert approx(r.total, 1736.5)
    assert approx(r.kia, 520.95)


def test_white_casualties_golden():
    # Destroyer/cruiser=2.5, Diesel Submarine=2, Frigate=2.5, Tacair(air)=20.
    r = csis.casualties("WHITE", {
        "Destroyer/cruiser": 2.5, "Diesel Submarine": 2, "Frigate": 2.5,
        "Tacair (air)": 20,
    })
    assert approx(r.by_category["_total_sea"], 327.5)
    assert approx(r.total, 627.5)
    assert approx(r.kia, 188.25)


def test_green_casualties_golden():
    # Frigate=16 (->320), Cargo ship=7 (->70): military 390. Civilians from tonnage.
    r = csis.casualties("GREEN", {"Frigate": 16, "Cargo ship": 7},
                        bomb_tonnage=15075.0)
    assert approx(r.total, 390.0)
    assert approx(r.by_category["_civilian"], 3768.75)


def test_red_corvette_excluded_from_total():
    # Workbook quirk: total_sea = SUM of first 5 lines; corvette/frigate excluded.
    r = csis.casualties("RED", {"_excl_Corvette/FS": 140})
    assert approx(r.by_category["_excl_Corvette/FS"], 2100.0)  # computed
    assert approx(r.total, 0.0)                                # but not in total


def test_red_ground_casualties():
    r = csis.casualties("RED", {"Mech": 2, "Infantry": 3})
    assert approx(r.by_category["_total_ground"], 2 * 500 + 3 * 500)
    assert approx(r.total, 2500.0)
    assert approx(r.kia, 750.0)


# --- Amphibious lift (AmphibiousTF!J28/J29) — EXACT ---

def test_amphib_lift_full_fleet():
    assert approx(csis.amphib_lift(36, turn=2), 60.0)
    assert approx(csis.amphib_lift(36, turn=1), 90.0)   # 1.5x turn-1 surge


def test_amphib_lift_partial():
    assert approx(csis.amphib_lift(33, turn=2), 55.0)
    assert approx(csis.amphib_lift(33, turn=1), 82.5)


def test_amphib_lift_zero():
    assert csis.amphib_lift(0, turn=3) == 0.0


# --- Air exchange uses the real Quality constants ---

def test_air_quality_constants():
    assert csis.AIR_QUALITY["J-20"] == 8 and csis.AIR_QUALITY["F-35"] == 8
    assert csis.AIR_QUALITY["J-10"] == 2 and csis.AIR_QUALITY["F-15"] == 4


def test_air_exchange_quality_advantage():
    # All-5th-gen (quality 8) vs all-4th-gen (quality 2): the 4th-gen side
    # should lose more, aggregated over seeds.
    hi_loss = lo_loss = 0
    for s in range(40):
        rng = GameRNG(s)
        red = {"4th": 0, "4.5": 0, "5th": 14, "bomber": 0}    # high quality
        blue = {"4th": 14, "4.5": 0, "5th": 0, "bomber": 0}   # low quality
        r = csis.air_exchange(red, blue, rng)
        hi_loss += sum(r.red_losses.values())
        lo_loss += sum(r.blue_losses.values())
    assert lo_loss > hi_loss


def test_air_exchange_bounded():
    rng = GameRNG(1)
    red = {"4th": 5, "4.5": 3, "5th": 2, "bomber": 0}
    blue = {"4th": 4, "4.5": 4, "5th": 4, "bomber": 0}
    r = csis.air_exchange(red, blue, rng)
    assert 0 <= sum(r.red_losses.values()) <= 10
    assert 0 <= sum(r.blue_losses.values()) <= 12


# --- Airbase missile attack (RED_AB_ATK / Blue_AB_Atk) ----------------------

def test_airbase_attack_pk_constants():
    # The PK thresholds match the workbook tables / rules.
    assert csis.SAM_INTERCEPT_PK == 18      # SAM removes a salvo on d20 1-18
    assert csis.HAS_AIRCRAFT_PK == 15       # Table 5C: aircraft step killed on 1-15
    assert csis.UGS_TRAP_PK == 14           # UGS sheet PK = 14 (70%)


def test_sam_interception_reduces_salvos():
    # Heavy SAM coverage lets fewer salvos through, on average, than none.
    with_sam = without = 0
    for s in range(60):
        with_sam += csis.sam_interception(10, sam_batteries=8, rng=GameRNG(s))
        without += csis.sam_interception(10, sam_batteries=0, rng=GameRNG(s))
    assert with_sam < without
    assert without == 60 * 10  # no SAMs => nothing intercepted


def test_hardened_protects_vs_open():
    # Same salvo: a hardened base loses fewer aircraft on average than open.
    hard = soft = 0
    for s in range(80):
        hard += csis.airbase_missile_attack(12, 0, True, 50, GameRNG(s)).aircraft_killed
        soft += csis.airbase_missile_attack(12, 0, False, 50, GameRNG(s)).aircraft_killed
    assert hard < soft


def test_airbase_attack_bounded_by_aircraft_present():
    r = csis.airbase_missile_attack(40, 0, False, aircraft_present=3, rng=GameRNG(2))
    assert 0 <= r.aircraft_killed <= 3
