"""Hex ground-game tests (landing, CRT resolution, engine integration)."""
from wargame_eval.agents.heuristic import HeuristicCommander
from wargame_eval.engine import Engine
from wargame_eval.ground import GroundState, TAIWAN_OOB
from wargame_eval.rng import GameRNG
from wargame_eval.scenario import build_base_case
from wargame_eval.victory import VictoryClass


def test_taiwan_oob_strength_positive():
    g = GroundState.build()
    assert g.taiwan_strength() > 0
    assert set(g.defenders) == set(TAIWAN_OOB)


def test_landing_creates_pla_force():
    g = GroundState.build()
    g.land("Kaohsiung", lift_points=30.0)
    assert "Kaohsiung" in g.fronts
    assert g.pla_strength() > 0


def test_front_grinds_and_can_capture():
    g = GroundState.build()
    rng = GameRNG(1)
    # Pour in a large force over several turns and press.
    captured = False
    for _ in range(10):
        g.land("Kaohsiung", lift_points=60.0)
        g.resolve(press=True, rng=rng)
        if g.fronts["Kaohsiung"].captured:
            captured = True
            break
    assert captured
    assert g.fronts["Kaohsiung"].feba_progress >= 30


def test_full_ground_mode_game_runs():
    state = build_base_case(seed=4)
    engine = Engine(state, HeuristicCommander("r", 1), HeuristicCommander("b", 2),
                    ground_map=True)
    result = engine.run()
    assert isinstance(result.klass, VictoryClass)
    assert engine.ground is not None
    assert engine.ground.taiwan_strength() >= 0


def test_cas_is_per_turn_not_accumulated():
    # Regression: close-air-support must not persist in the ground force.
    g = GroundState.build()
    rng = GameRNG(1)
    g.land("Kaohsiung", lift_points=30.0)
    for _ in range(5):
        g.resolve(press=True, rng=rng, red_cas=8.0)
    assert "cas" not in g.fronts["Kaohsiung"].pla   # never accumulated


def test_ground_mode_is_deterministic():
    def play():
        st = build_base_case(seed=11)
        e = Engine(st, HeuristicCommander("r", 3), HeuristicCommander("b", 4),
                   ground_map=True)
        r = e.run()
        return r.klass, st.snapshot(), e.ground.log
    a, sa, la = play()
    b, sb, lb = play()
    assert a == b and sa == sb and la == lb
