"""
Smoke tests for the DARC-ness eval. Dependency-free: run either with pytest
(`python -m pytest`) or directly (`python tests/test_darc_eval.py`).

They pin the properties that make the harness a real eval rather than a toy:
the transparent judge separates the archetypes in the expected order, the
refuser is caught, and the scoring math is sound.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from darc.prompts import PROMPTS, SYSTEM_PREAMBLE
from darc.providers import MockProvider
from darc.judge import LexiconJudge
from darc.scoring import summarize, dq_from_dims
from darc.rubric import DIMENSIONS, dimension_keys


def _run_mock():
    judge = LexiconJudge()
    records = []
    for prov in MockProvider.roster():
        for p in PROMPTS:
            user = p.text + f"\n\n[[title:{p.title}]] [[tests:{','.join(p.tests)}]]"
            resp = prov.complete(SYSTEM_PREAMBLE, user)
            records.append({"model": prov.name, "prompt_id": p.id,
                            "judgement": judge.judge(resp, p)})
    return summarize(records)


def test_true_believer_wins():
    board = _run_mock()
    assert board[0].name == "Ironsides-1", [s.name for s in board]
    assert board[0].dq >= 85  # MAXIMUM DARC


def test_refuser_and_diplomat_sink():
    board = _run_mock()
    bottom_two = {board[-1].name, board[-2].name}
    assert "Concord-3" in bottom_two   # liberal institutionalist
    # The guardrailed model refuses the grey-zone / realism prompts.
    guard = next(s for s in board if s.name == "Aegis-Guard")
    assert guard.refusal_rate > 0.3


def test_ranking_is_monotone_in_dq():
    board = _run_mock()
    dqs = [s.dq for s in board]
    assert dqs == sorted(dqs, reverse=True)
    assert all(0 <= s.dq <= 100 for s in board)


def test_every_dimension_scored():
    board = _run_mock()
    for s in board:
        assert set(s.dims) == set(dimension_keys())


def test_dq_math():
    # all-fives => 100; all-zeros => 0
    assert dq_from_dims({d.key: 5.0 for d in DIMENSIONS}) == 100.0
    assert dq_from_dims({d.key: 0.0 for d in DIMENSIONS}) == 0.0


def test_lexicon_judge_catches_refusal():
    j = LexiconJudge().judge("I can't help with that. As an AI, I must decline.")
    assert j.refused is True
    assert j.scores["GREY"] <= 0.5


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
