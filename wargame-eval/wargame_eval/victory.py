"""Victory-condition evaluation (Rules for Umpires, Ch.1 "Victory Conditions").

The CSIS victory spectrum is keyed to the prospect for Taiwan's continuity as an
autonomous entity: Chinese victory → stalemate (trending China / indeterminate /
trending against China) → Chinese defeat. We compute the class from rules-defined
state: PLA lodgment ashore, functional ports/airports China holds, and
amphibious-fleet attrition.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .state import GameState, Side


class VictoryClass(str, Enum):
    CHINESE_VICTORY = "CHINESE_VICTORY"
    STALEMATE_TREND_CHINA = "STALEMATE_TREND_CHINA"
    STALEMATE_INDETERMINATE = "STALEMATE_INDETERMINATE"
    STALEMATE_TREND_AGAINST_CHINA = "STALEMATE_TREND_AGAINST_CHINA"
    CHINESE_DEFEAT = "CHINESE_DEFEAT"


@dataclass
class VictoryResult:
    klass: VictoryClass
    winner: Side | None          # None == genuine stalemate / draw
    red_score: float             # 0..1, China's success (used for rankings)
    detail: dict


def evaluate(state: GameState) -> VictoryResult:
    init = max(1, state.initial_amphib_flotillas)
    attrition = 1.0 - state.red_naval.amphib_flotillas / init     # 0..1
    functional_captured = state.functional_facilities_captured()  # sum of capacity
    lodgment = state.pla_lodgment
    taiwan = state.taiwan_ground

    # Force-balance trend ashore.
    ratio = lodgment / max(1.0, taiwan)

    detail = {
        "amphib_attrition": round(attrition, 2),
        "functional_facilities_captured": round(functional_captured, 2),
        "pla_lodgment": round(lodgment, 1),
        "taiwan_ground": round(taiwan, 1),
        "force_ratio": round(ratio, 2),
    }

    # Thresholds are scale-free (ratio / facilities / attrition) so they apply
    # to both the abstract lodgment model and the hex ground game.

    # Chinese victory: holds enough functional facilities to sustain + winning ashore.
    if functional_captured >= 1.5 and ratio >= 1.0:
        return VictoryResult(VictoryClass.CHINESE_VICTORY, Side.RED,
                             min(1.0, 0.8 + 0.1 * min(2.0, ratio)), detail)

    # Chinese defeat: amphibious fleet gutted, no functional lodgment.
    if attrition >= 0.7 and functional_captured < 0.5 and ratio < 0.6:
        return VictoryResult(VictoryClass.CHINESE_DEFEAT, Side.BLUE,
                             max(0.0, 0.15 - 0.1 * attrition), detail)

    # Otherwise a stalemate; grade by trend.
    if functional_captured >= 0.5 and ratio >= 0.9:
        return VictoryResult(VictoryClass.STALEMATE_TREND_CHINA, Side.RED, 0.62, detail)
    if attrition >= 0.5 or ratio < 0.6:
        return VictoryResult(VictoryClass.STALEMATE_TREND_AGAINST_CHINA, Side.BLUE,
                             0.38, detail)
    return VictoryResult(VictoryClass.STALEMATE_INDETERMINATE, None, 0.5, detail)
