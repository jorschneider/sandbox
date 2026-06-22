"""Golden + sanity tests for the ground CRT (Ground_War_Adjudication port)."""
import math

from wargame_eval import ground_combat as gc
from wargame_eval.rng import GameRNG


def test_worked_example_strengths_and_odds():
    # From the sheet: attacker = 7 Inf (clear-mod 1.0) + 5 CAS (x3) = 7 + 15 = 22.
    # defender (mountain) = 4 Lt.Mech (x1.5 x3) + 8 Arty (x2) + 1 Helo (x2)
    #                     = 18 + 16 + 2 = 36.  odds = 22/36 = 0.611 -> col 1.
    atk = gc.modified_strength([("inf", 7), ("cas", 5)], "mountain", attacking=True)
    dfd = gc.modified_strength([("lt_mech", 4), ("artillery", 8), ("helo", 1)],
                               "mountain", attacking=False)
    assert math.isclose(atk, 22.0)
    assert math.isclose(dfd, 36.0)
    assert gc._odds_col(atk / dfd) == 1


def test_armor_penalised_in_mountain_on_attack():
    # 10 heavy-mech attacking: clear -> 10*2*1.0=20; mountain -> 10*2*0.5=10.
    clear = gc.modified_strength([("hvy_mech", 10)], "clear", attacking=True)
    mtn = gc.modified_strength([("hvy_mech", 10)], "mountain", attacking=True)
    assert math.isclose(clear, 20.0)
    assert math.isclose(mtn, 10.0)


def test_defender_terrain_multiplier():
    # 10 infantry defending: clear x2 = 20; mountain x3 = 30.
    assert math.isclose(gc.modified_strength([("inf", 10)], "clear", False), 20.0)
    assert math.isclose(gc.modified_strength([("inf", 10)], "mountain", False), 30.0)


def test_feba_table_shape():
    # <1:1 never advances except on a high roll; 4:1+ always advances big.
    assert gc._FEBA[1][0] == 0 and gc._FEBA[1][19] == 5
    assert gc._FEBA[6][0] == 20 and gc._FEBA[6][19] == 30
    assert all(0 <= km <= 30 for col in gc._FEBA.values() for km in col)
    assert all(len(col) == 20 for col in gc._FEBA.values())


def test_resolve_engagement_bounds():
    rng = GameRNG(3)
    e = gc.resolve_engagement([("inf", 7), ("cas", 5)],
                              [("lt_mech", 4), ("artillery", 8), ("helo", 1)],
                              "mountain", rng)
    assert e.odds_col == 1
    assert 0 <= e.defender_losses <= 22
    assert 0 <= e.attacker_losses <= 36
    assert e.feba_km in (0, 5)


def test_high_odds_advances():
    # Overwhelming attacker in clear terrain advances most turns.
    advanced = 0
    for s in range(40):
        rng = GameRNG(s)
        e = gc.resolve_engagement([("hvy_mech", 30), ("cas", 10)],
                                  [("inf", 1)], "clear", rng)
        assert e.odds_col == 6
        advanced += e.feba_km
    assert advanced > 0
