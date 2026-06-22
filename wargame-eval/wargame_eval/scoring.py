"""Metrics extraction and head-to-head rankings (Elo)."""
from __future__ import annotations

from dataclasses import dataclass, field

from .state import GameState, Side
from .victory import VictoryResult


@dataclass
class GameResult:
    red_model: str
    blue_model: str
    seed: int
    victory_class: str
    winner: str | None        # "RED" | "BLUE" | None (draw)
    red_score: float
    metrics: dict = field(default_factory=dict)


def extract_metrics(state: GameState, result: VictoryResult) -> dict:
    return {
        "turns_played": state.turn,
        "amphib_attrition": result.detail["amphib_attrition"],
        "functional_facilities_captured": result.detail["functional_facilities_captured"],
        "pla_lodgment": result.detail["pla_lodgment"],
        "taiwan_ground": result.detail["taiwan_ground"],
        "red_losses": state.losses.get("RED", {}),
        "blue_losses": state.losses.get("BLUE", {}),
        "red_illegal_orders": state.losses.get("RED", {}).get("illegal_orders", 0),
        "blue_illegal_orders": state.losses.get("BLUE", {}).get("illegal_orders", 0),
    }


def elo_ratings(results: list[GameResult], k: float = 24.0, base: float = 1000.0) -> dict:
    """Symmetric Elo over all games; a draw scores 0.5 for both sides."""
    ratings: dict[str, float] = {}
    for g in (results or []):
        ratings.setdefault(g.red_model, base)
        ratings.setdefault(g.blue_model, base)
    for g in results:
        ra, rb = ratings[g.red_model], ratings[g.blue_model]
        ea = 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))
        if g.winner == "RED":
            sa = 1.0
        elif g.winner == "BLUE":
            sa = 0.0
        else:
            sa = 0.5
        ratings[g.red_model] = ra + k * (sa - ea)
        ratings[g.blue_model] = rb + k * ((1 - sa) - (1 - ea))
    return dict(sorted(ratings.items(), key=lambda kv: kv[1], reverse=True))


def win_table(results: list[GameResult]) -> dict:
    """Per-model record: games, wins, losses, draws, win rate."""
    rec: dict[str, dict] = {}
    for g in results:
        for model, won in ((g.red_model, g.winner == "RED"),
                           (g.blue_model, g.winner == "BLUE")):
            r = rec.setdefault(model, {"games": 0, "wins": 0, "losses": 0, "draws": 0})
            r["games"] += 1
            if g.winner is None:
                r["draws"] += 1
            elif won:
                r["wins"] += 1
            else:
                r["losses"] += 1
    for r in rec.values():
        r["win_rate"] = round(r["wins"] / r["games"], 3) if r["games"] else 0.0
    return rec
