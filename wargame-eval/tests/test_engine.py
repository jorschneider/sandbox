"""End-to-end engine + schema-validation tests."""
from wargame_eval import schemas
from wargame_eval.agents.heuristic import HeuristicCommander
from wargame_eval.engine import Engine, _partition_air
from wargame_eval.scenario import build_base_case
from wargame_eval.state import AIRFRAMES, Side
from wargame_eval.victory import VictoryClass


def test_air_partition_no_double_counting():
    # Regression: missions must share the pool, not each take elite jets.
    pool = {"5th": 8, "4.5": 18, "4th": 24, "bomber": 6, "tanker": 4}
    part = _partition_air(pool, {"cap": 10, "strike_amphibs": 15, "strike_airbases": 5})
    for c in AIRFRAMES:
        assert sum(part[m][c] for m in part) <= pool[c]
    # Priority order: cap (first) gets the 5th-gen before the strikes.
    assert part["cap"]["5th"] == 8
    assert part["strike_amphibs"]["5th"] == 0


def test_air_partition_respects_requested_counts():
    pool = {"5th": 4, "4.5": 4, "4th": 4, "bomber": 0, "tanker": 0}
    part = _partition_air(pool, {"cap": 5, "strike_amphibs": 3})
    assert sum(part["cap"].values()) == 5
    assert sum(part["strike_amphibs"].values()) == 3   # 12 available, 8 requested


def test_full_game_runs_to_a_victory_class():
    state = build_base_case(seed=5)
    engine = Engine(state, HeuristicCommander("red", 1), HeuristicCommander("blue", 2))
    result = engine.run()
    assert isinstance(result.klass, VictoryClass)
    assert 0.0 <= result.red_score <= 1.0
    assert engine.transcript  # decisions were recorded


def test_validation_clamps_overcommit():
    state = build_base_case(seed=0)
    # Commit more flotillas than exist.
    orders = {"flotillas_to_commit": 999, "rationale": "all in"}
    clean, viol = schemas.validate("RED_AMPHIB", orders, state)
    assert clean["flotillas_to_commit"] == state.red_naval.amphib_flotillas
    assert viol


def test_validation_scales_down_sortie_allocation():
    state = build_base_case(seed=0)
    avail = state.available_sorties(Side.BLUE)
    total = sum(avail[c] for c in ("4th", "4.5", "5th", "bomber"))
    orders = {"allocation": {"cap": total, "strike_amphibs": total,
                             "strike_airbases": total, "ground_support": total},
              "rationale": "overcommit"}
    clean, viol = schemas.validate("BLUE_AIR", orders, state)
    assert sum(clean["allocation"].values()) <= total
    assert viol


def test_missiles_are_consumed():
    state = build_base_case(seed=0)
    before = sum(state.red_missiles.values())
    engine = Engine(state, HeuristicCommander("red", 1), HeuristicCommander("blue", 2))
    engine.state.turn = 1
    engine.phase_missiles()
    after = sum(state.red_missiles.values())
    assert after < before  # Red expended ordnance


def test_illegal_orders_recorded_as_signal():
    class BadRed(HeuristicCommander):
        def decide(self, side, phase, obs, schema):
            if phase == "RED_AMPHIB":
                return {"flotillas_to_commit": 9999, "rationale": "bad"}
            return super().decide(side, phase, obs, schema)

    state = build_base_case(seed=2)
    engine = Engine(state, BadRed("badred", 1), HeuristicCommander("blue", 2))
    engine.run()
    assert state.losses.get("RED", {}).get("illegal_orders", 0) > 0
