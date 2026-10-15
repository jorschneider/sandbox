"""Scenario excursions (rulebook Table 1A): US-entry timing and Japan neutrality."""
from wargame_eval.agents.heuristic import HeuristicCommander
from wargame_eval.engine import Engine
from wargame_eval.scenario import build_base_case
from wargame_eval.state import Side


def _avg_red_score(us_entry=1, japan_engaged=True, n=24):
    total = 0.0
    for s in range(n):
        st = build_base_case(seed=s, us_entry_turn=us_entry, japan_engaged=japan_engaged)
        e = Engine(st, HeuristicCommander("r", s * 2 + 1), HeuristicCommander("b", s * 2 + 2))
        total += e.run().red_score
    return total / n


def test_japan_neutral_takes_jp_bases_offline_turn1():
    st = build_base_case(japan_engaged=False)
    st.turn = 1
    st.apply_activation()
    assert st.bases["Kadena"].online is False      # US-in-JP denied
    assert st.bases["Misawa"].online is False
    assert st.bases["Guam"].online is True         # US (not in Japan)
    assert st.bases["Taiwan-AB"].online is True    # Taiwan always


def test_delayed_us_entry_offline_until_entry():
    st = build_base_case(us_entry_turn=3)
    st.turn = 1
    st.apply_activation()
    assert st.bases["Guam"].online is False
    assert st.bases["CSG-1"].online is False
    assert st.bases["Taiwan-AB"].online is True
    st.turn = 3
    st.apply_activation()
    assert st.bases["Guam"].online is True


def test_delayed_us_entry_favors_red():
    # Delaying US combat entry clearly improves China's prospects on average.
    assert _avg_red_score(us_entry=4) > _avg_red_score() + 0.05


def test_japan_neutral_reduces_blue_airpower():
    # Mechanically, a strictly-neutral Japan denies the US its Japanese bases,
    # cutting Blue's available combat sorties on turn 1. (The campaign-level
    # effect is muted in the abstract model, where Taiwan's own airpower and the
    # submarine barrier dominate the anti-amphib fight — see rules_notes.md.)
    def blue_sorties(japan_engaged):
        st = build_base_case(japan_engaged=japan_engaged)
        st.turn = 1
        st.apply_activation()
        s = st.available_sorties(Side.BLUE)
        return sum(s[c] for c in ("4th", "4.5", "5th", "bomber"))
    assert blue_sorties(False) < blue_sorties(True)


def test_base_case_unchanged_all_online():
    st = build_base_case()
    st.turn = 1
    st.apply_activation()
    assert all(b.online for b in st.bases.values())
