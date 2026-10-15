"""Taiwan ground hex game (CSIS TOW Chapters 10 & 13) — v2 ground model.

A 30 km hex grid of Taiwan's invasion-relevant geography: a west-coast beach
column, the populated western plain (where the ports/airfields and the
defending corps sit), foothills, and the central mountains. The Taiwanese order
of battle is the exact Table 10A laydown by Army Corps. PLA forces land from the
operational game's amphibious lift and grind inland through the defending corps
using the ground CRT (`ground_combat`). FEBA movement accumulates toward 30 km
(one hex); reaching it captures the hex and any facility on it.

This is the faithful hex/CRT core; full counter-by-counter movement, multiple
simultaneous fronts, and engineer fortify/repair are future work (documented in
game/rules_notes.md).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import ground_combat as gc
from .rng import GameRNG
from .state import Facility, GameState, Owner

HEX_KM = 30  # one ground hex is 30 km across; FEBA km accumulate to cross a hex

# Taiwanese Order of Battle by Army Corps (Table 10A), as CRT unit kinds.
# armor (regular+M1) -> armor; mech inf -> mech; light inf -> inf;
# arty+HIMARS -> artillery; eng -> engineer; attack helo -> helo.
TAIWAN_OOB = {
    "north": {"armor": 7, "mech": 12, "inf": 12, "artillery": 15, "engineer": 3, "helo": 1},
    "central": {"armor": 3, "mech": 5, "inf": 12, "artillery": 10, "engineer": 3, "helo": 1},
    "south": {"armor": 3, "mech": 8, "inf": 4, "artillery": 9, "engineer": 3, "helo": 1},
}

# Facility -> (objective hex, defending region, terrain of the objective hex).
# Hexes are (col, row): col 0 = west beach, col 1 = western plain/city.
FACILITY_HEXES = {
    "Keelung":        ((1, 0), "north", "urban"),
    "Taoyuan":        ((1, 1), "north", "urban"),
    "Taichung":       ((1, 6), "central", "urban"),
    "Chiayi":         ((1, 9), "south", "rough"),
    "Kaohsiung":      ((1, 11), "south", "urban"),
    "Kaohsiung-Intl": ((1, 11), "south", "urban"),
    "Hualien":        ((4, 7), "central", "mountain"),  # east coast, behind the range
    "Taitung":        ((4, 10), "south", "mountain"),
}

LIFT_PER_BN = 3.0          # lift points to land one PLA maneuver battalion (APPROX)
PLA_INF_FRACTION = 0.7     # landed force mix: 70% amphibious infantry, 30% mech


@dataclass
class Front:
    """A single landing axis grinding toward one objective facility."""
    objective: str
    region: str
    terrain: str
    pla: dict[str, float] = field(default_factory=dict)   # PLA battalions massed at beachhead
    feba_progress: float = 0.0                            # km advanced toward the 30 km hex
    captured: bool = False


@dataclass
class GroundState:
    defenders: dict[str, dict[str, float]]   # region -> {kind: battalions remaining}
    fronts: dict[str, Front] = field(default_factory=dict)
    log: list[str] = field(default_factory=list)

    @classmethod
    def build(cls) -> "GroundState":
        return cls(defenders={r: dict(o) for r, o in TAIWAN_OOB.items()})

    # -- force bookkeeping -----------------------------------------------------

    @staticmethod
    def _strength(force: dict[str, float]) -> float:
        return sum(c * gc.STRENGTH.get(k, 1.0) for k, c in force.items())

    def taiwan_strength(self) -> float:
        return sum(self._strength(f) for f in self.defenders.values())

    def pla_strength(self) -> float:
        return sum(self._strength(fr.pla) for fr in self.fronts.values())

    @staticmethod
    def _apply_losses(force: dict[str, float], steps: float) -> None:
        """Remove `steps` battalion-strength from a force, maneuver units first."""
        order = ["inf", "mech", "armor", "engineer", "artillery", "himars", "helo", "cas"]
        rem = steps
        for k in order:
            if rem <= 0:
                break
            n = force.get(k, 0.0)
            if n <= 0:
                continue
            take = min(n, rem)
            force[k] = n - take
            rem -= take

    # -- campaign --------------------------------------------------------------

    def land(self, objective: str, lift_points: float) -> None:
        """Land lift onto the front for `objective` (creating it on first use)."""
        if objective not in FACILITY_HEXES:
            objective = "Taichung"
        _, region, terrain = FACILITY_HEXES[objective]
        fr = self.fronts.get(objective)
        if fr is None:
            fr = Front(objective=objective, region=region, terrain=terrain)
            self.fronts[objective] = fr
        bns = lift_points / LIFT_PER_BN
        fr.pla["inf"] = fr.pla.get("inf", 0.0) + bns * PLA_INF_FRACTION
        fr.pla["mech"] = fr.pla.get("mech", 0.0) + bns * (1 - PLA_INF_FRACTION)

    def resolve(self, press: bool, rng: GameRNG, blue_cas: float = 0.0,
                red_cas: float = 0.0) -> None:
        """Resolve one turn of ground combat on every active front.

        Close-air-support (blue_cas / red_cas, in sorties) is applied as
        per-turn fire support — it is NOT added to the persistent ground force.
        """
        for fr in self.fronts.values():
            if fr.captured or self._strength(fr.pla) <= 0:
                continue
            defender = dict(self.defenders.get(fr.region, {}))
            if blue_cas > 0:
                defender["cas"] = defender.get("cas", 0.0) + blue_cas / 4.0
            attacker = [(k, v) for k, v in fr.pla.items()]
            if red_cas > 0:
                attacker.append(("cas", red_cas / 4.0))
            defend = [(k, v) for k, v in defender.items()]
            e = gc.resolve_engagement(attacker, defend, fr.terrain, rng)
            # Apply battalion-step losses.
            self._apply_losses(fr.pla, e.attacker_losses)
            self._apply_losses(self.defenders.get(fr.region, {}), e.defender_losses)
            # Advance the FEBA (only "press" pushes; "consolidate" holds).
            if press:
                fr.feba_progress += e.feba_km
            self.log.append(
                f"{fr.objective}: odds {e.odds:.2f} (col{e.odds_col}) "
                f"atk_loss {e.attacker_losses} def_loss {e.defender_losses} "
                f"feba +{e.feba_km if press else 0}km -> {fr.feba_progress:.0f}/30")
            if fr.feba_progress >= HEX_KM and self._strength(fr.pla) > 0:
                fr.captured = True
                self.log.append(f"{fr.objective}: CAPTURED by PLA")

    def sync_to(self, state: GameState) -> None:
        """Write ground results back into the operational GameState for victory eval."""
        state.pla_lodgment = self.pla_strength()
        state.taiwan_ground = self.taiwan_strength()
        captured = {fr.objective for fr in self.fronts.values() if fr.captured}
        for f in state.facilities:
            if f.name in captured and f.owner != Owner.CHINA:
                f.owner = Owner.CHINA
                f.functional = 0.3

    def choose_objective(self, state: GameState) -> str:
        """Pick the highest-value still-Taiwanese facility as the landing axis."""
        priority = ["Kaohsiung", "Taichung", "Taoyuan", "Keelung", "Chiayi"]
        held = {f.name for f in state.facilities if f.owner == Owner.TAIWAN}
        for name in priority:
            if name in held:
                return name
        return next(iter(held), "Taichung")
