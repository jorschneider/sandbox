"""Scoring/aggregation tests."""
from wargame_eval.scoring import GameResult, elo_ratings, side_performance, win_table


def _g(red, blue, red_score, winner):
    return GameResult(red, blue, seed=0, victory_class="X", winner=winner,
                      red_score=red_score)


def test_side_performance_differentiates_when_wins_tie():
    # Two models, each 1-1 (Elo ties), but A is a better invader than B.
    games = [
        _g("A", "B", 0.6, "BLUE"),   # A as Red got far
        _g("B", "A", 0.2, "BLUE"),   # B as Red got little; A defended well
    ]
    perf = side_performance(games)
    assert perf["A"]["offense_red_score"] == 0.6
    assert perf["B"]["offense_red_score"] == 0.2
    assert perf["A"]["defense_conceded"] == 0.2   # A conceded little on defense
    assert perf["B"]["defense_conceded"] == 0.6


def test_win_table_and_elo_consistent():
    games = [_g("A", "B", 0.9, "RED"), _g("B", "A", 0.1, "BLUE")]
    wt = win_table(games)
    assert wt["A"]["wins"] == 2 and wt["A"]["losses"] == 0
    elo = elo_ratings(games)
    assert elo["A"] > elo["B"]
