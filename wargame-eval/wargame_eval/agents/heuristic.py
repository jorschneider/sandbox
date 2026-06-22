"""Deterministic, no-API commander.

Plays a sensible doctrine for each side so the full pipeline (and the test
suite) runs with zero network access. Also serves as the fallback when a
model client errors or refuses, and as a baseline opponent for ranking.
Decisions are seeded for reproducibility.
"""
from __future__ import annotations

from ..rng import GameRNG
from ..schemas import (BLUE_MISSIONS, RED_MISSILE_TARGETS, RED_MISSIONS)
from ..state import AIRFRAMES, Side


class HeuristicCommander:
    def __init__(self, name: str = "heuristic", seed: int = 0) -> None:
        self.name = name
        self.rng = GameRNG(seed)

    def decide(self, side: Side, phase: str, obs: dict, schema: dict) -> dict:
        if phase == "RED_MISSILE":
            return self._red_missiles(obs)
        if phase == "RED_AIR":
            return self._red_air(obs)
        if phase == "BLUE_AIR":
            return self._blue_air(obs)
        if phase == "BLUE_NAVAL":
            return {"subron_on_barrier": obs["your_naval"].get("subron", 0),
                    "rationale": "Commit all SUBRONs to the anti-amphib barrier."}
        if phase == "RED_AMPHIB":
            return self._red_amphib(obs)
        if phase == "RED_GROUND":
            ashore = obs["pla_lodgment"]
            ratio = ashore / max(1.0, obs["taiwan_ground_strength"])
            return {"posture": "press" if ratio >= 1.0 else "consolidate",
                    "rationale": f"Force ratio {ratio:.2f}."}
        return {}

    # -- per-phase doctrine ----------------------------------------------------

    def _red_missiles(self, obs: dict) -> dict:
        miss = obs.get("your_missiles", {})
        # Open the campaign by suppressing Taiwan and Kadena airpower; reserve
        # ASBMs for carriers once they're a threat.
        alloc = {t: 0 for t in RED_MISSILE_TARGETS}
        alloc["taiwan_airfields"] = miss.get("DF-11", 0) // 4 + miss.get("CJ-20-ALCM", 0) // 5
        alloc["okinawa_kadena"] = miss.get("DF-15B", 0) // 3
        alloc["guam"] = miss.get("DF-26", 0) // 4
        alloc["carriers"] = miss.get("DF-26B", 0) // 2 + miss.get("DF-21D", 0) // 2
        alloc["ships"] = miss.get("YJ-anti-ship", 0) // 6
        return {"allocation": alloc, "rationale": "Suppress airpower; hold ASBMs for CSGs."}

    def _red_air(self, obs: dict) -> dict:
        s = obs["your_available_sorties"]
        total = sum(s.get(c, 0) for c in ("4th", "4.5", "5th", "bomber"))
        a = {m: 0 for m in RED_MISSIONS}
        a["cap"] = int(total * 0.4)
        a["escort_strike"] = int(total * 0.2)
        a["strike_blue_airbases"] = int(total * 0.25)
        a["ground_support"] = total - a["cap"] - a["escort_strike"] - a["strike_blue_airbases"]
        return {"allocation": a, "rationale": "Contest air; pressure Blue bases; support landings."}

    def _blue_air(self, obs: dict) -> dict:
        s = obs["your_available_sorties"]
        total = sum(s.get(c, 0) for c in ("4th", "4.5", "5th", "bomber"))
        # Blue's main effort is sinking the amphibious fleet.
        a = {m: 0 for m in BLUE_MISSIONS}
        a["cap"] = int(total * 0.3)
        a["strike_amphibs"] = int(total * 0.45)
        a["strike_airbases"] = int(total * 0.1)
        a["ground_support"] = total - a["cap"] - a["strike_amphibs"] - a["strike_airbases"]
        return {"allocation": a, "rationale": "Sink the amphibs; hold air superiority."}

    def _red_amphib(self, obs: dict) -> dict:
        have = obs["amphib_flotillas_remaining"]
        # Commit aggressively early; throttle if the fleet is being gutted.
        attr = 1.0 - have / max(1, obs["amphib_flotillas_initial"])
        commit = max(0, int(have * (0.6 if attr < 0.4 else 0.4)))
        return {"flotillas_to_commit": commit,
                "rationale": f"Commit {commit} flotillas (attrition {attr:.2f})."}
