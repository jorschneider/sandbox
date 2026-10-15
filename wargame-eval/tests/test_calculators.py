"""Sanity bounds on the deterministic combat calculators."""
from wargame_eval import calculators as calc
from wargame_eval.rng import GameRNG


def test_air_to_air_losses_bounded():
    rng = GameRNG(1)
    red = {"4th": 10, "4.5": 5, "5th": 2, "bomber": 0, "tanker": 0}
    blue = {"4th": 0, "4.5": 4, "5th": 6, "bomber": 0, "tanker": 0}
    res = calc.resolve_air_to_air(red, blue, rng)
    assert 0 <= sum(res.red_losses.values()) <= sum(red[c] for c in ("4th", "4.5", "5th"))
    assert 0 <= sum(res.blue_losses.values()) <= sum(blue[c] for c in ("4.5", "5th"))


def test_fifth_gen_advantage():
    """An all-5th-gen package should, on average, out-trade an all-4th-gen one."""
    red_tot = blue_tot = 0
    for s in range(40):
        rng = GameRNG(s)
        red = {"4th": 12, "4.5": 0, "5th": 0, "bomber": 0, "tanker": 0}
        blue = {"4th": 0, "4.5": 0, "5th": 12, "bomber": 0, "tanker": 0}
        r = calc.resolve_air_to_air(red, blue, rng)
        red_tot += sum(r.red_losses.values())
        blue_tot += sum(r.blue_losses.values())
    assert red_tot > blue_tot


def test_sam_intercept_never_negative():
    rng = GameRNG(3)
    assert calc.sam_intercept(0, 5, rng) == 0
    assert calc.sam_intercept(3, 100, rng) == 0  # heavy defenses stop everything


def test_strike_on_amphibs_capped_by_available():
    rng = GameRNG(7)
    sorties = {"4th": 0, "4.5": 40, "5th": 0, "bomber": 0, "tanker": 0}
    r = calc.resolve_strike_on_amphibs(sorties, pickets=0, sags=0,
                                       flotillas_off_beach=2, rng=rng)
    assert 0 <= r["flotillas_sunk"] <= 2


def test_submarine_barrier_bounded():
    rng = GameRNG(9)
    sunk = calc.resolve_submarine_barrier(subron_on_barrier=3, flotillas_crossing=4, rng=rng)
    assert 0 <= sunk <= 4
