"""Game-state model for the CSIS Taiwan Operational Wargame (v1 abstraction).

This is a deliberately simplified, machine-readable encoding of the TOW that
captures the air-maritime fight and the amphibious-lift / lodgment outcome that
drive the rulebook's victory conditions. It is NOT yet the full 11-phase, two-
map game (see PLAN.md milestone 5 for the ground hex game). Simplifications are
documented in game/rules_notes.md.

Forces are aggregated rather than tracked counter-by-counter; bases matter for
missile targeting and sortie generation, naval forces are tracked as group
counts, and the Taiwan ground war is reduced to a lodgment-vs-defense balance.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

# Aircraft classes used throughout the engine.
AIRFRAMES = ("4th", "4.5", "5th", "bomber", "tanker")
# Relative air-to-air combat weight by class (5th-gen dominant; bombers/tankers
# contribute little/nothing to the air-superiority fight). APPROX — calibrate
# against the CSIS Taiwan_CAP_and_Air_Combat workbook.
AIR_WEIGHT = {"4th": 1.0, "4.5": 1.6, "5th": 3.0, "bomber": 0.4, "tanker": 0.0}


class Side(str, Enum):
    RED = "RED"      # China (PLA)
    BLUE = "BLUE"    # US + Japan + Taiwan coalition


class Owner(str, Enum):
    TAIWAN = "TAIWAN"
    CHINA = "CHINA"
    CONTESTED = "CONTESTED"


@dataclass
class Airbase:
    """An airbase or (mobile=True) a carrier deck."""
    name: str
    owner: Side
    aircraft: dict[str, int] = field(default_factory=dict)
    hardened: bool = True          # hardened aircraft shelters reduce ground kills
    suppressed_turns: int = 0      # >0: base sortie output degraded this many turns
    mobile: bool = False           # carrier deck (can be mission-killed by ASBMs)
    in_range_of_china: bool = True  # whether PLA conventional missiles can reach it

    def total_combat_air(self) -> int:
        return sum(self.aircraft.get(c, 0) for c in ("4th", "4.5", "5th"))

    def available_factor(self) -> float:
        """Fraction of sorties this base can generate this turn (0..1)."""
        return 0.35 if self.suppressed_turns > 0 else 1.0


@dataclass
class Facility:
    """A Taiwan port or airport — the objective of the invasion."""
    name: str
    kind: str  # "port" | "airport"
    owner: Owner = Owner.TAIWAN
    functional: float = 1.0  # operational capacity 0..1 (damage / repair state)


@dataclass
class RedNaval:
    amphib_flotillas: int          # surviving amphibious flotillas (lift)
    sags: int                      # surface action groups (escort)
    pickets: int                   # picket groups screening the approaches
    submarines: int


@dataclass
class BlueNaval:
    csg: int                       # carrier strike groups
    sag: int                       # surface action groups
    subron: int                    # submarine squadrons
    arg: int                       # amphibious ready group (US Marines)
    subron_on_barrier: int = 0     # SUBRONs committed to the ASW/anti-amphib barrier


@dataclass
class GameState:
    turn: int = 1
    max_turns: int = 8             # ~3-4 weeks at 3.5 days/turn
    seed: int = 0

    bases: dict[str, Airbase] = field(default_factory=dict)
    facilities: list[Facility] = field(default_factory=list)
    red_naval: RedNaval = field(default_factory=lambda: RedNaval(0, 0, 0, 0))
    blue_naval: BlueNaval = field(default_factory=lambda: BlueNaval(0, 0, 0, 0))

    # Red ground-launched + air/sea-launched munition inventory (salvos remaining).
    red_missiles: dict[str, int] = field(default_factory=dict)

    taiwan_ground: float = 100.0   # Taiwanese ground defense strength
    pla_lodgment: float = 0.0      # PLA ground combat power established ashore
    pla_supply: float = 0.0        # sustainment throughput to the lodgment

    initial_amphib_flotillas: int = 1
    japan_engaged: bool = True
    us_entry_turn: int = 1

    losses: dict[str, dict[str, float]] = field(default_factory=dict)
    metrics: dict[str, float] = field(default_factory=dict)
    log: list[dict] = field(default_factory=list)

    # -- helpers ---------------------------------------------------------------

    def bases_of(self, side: Side) -> list[Airbase]:
        return [b for b in self.bases.values() if b.owner == side]

    def air_inventory(self, side: Side) -> dict[str, int]:
        inv = {c: 0 for c in AIRFRAMES}
        for b in self.bases_of(side):
            for c in AIRFRAMES:
                inv[c] += b.aircraft.get(c, 0)
        return inv

    def available_sorties(self, side: Side) -> dict[str, int]:
        """Combat sorties each side can generate this turn, after suppression."""
        out = {c: 0.0 for c in AIRFRAMES}
        for b in self.bases_of(side):
            f = b.available_factor()
            for c in AIRFRAMES:
                out[c] += b.aircraft.get(c, 0) * f
        return {c: int(v) for c, v in out.items()}

    def facilities_held_by(self, owner: Owner) -> list[Facility]:
        return [f for f in self.facilities if f.owner == owner]

    def functional_facilities_captured(self) -> float:
        """Sum of operational capacity of facilities China holds (victory driver)."""
        return sum(f.functional for f in self.facilities if f.owner == Owner.CHINA)

    def record_loss(self, side: Side, category: str, n: float) -> None:
        if n <= 0:
            return
        self.losses.setdefault(side.value, {})
        self.losses[side.value][category] = self.losses[side.value].get(category, 0.0) + n

    def log_event(self, phase: str, msg: str, **data) -> None:
        self.log.append({"turn": self.turn, "phase": phase, "msg": msg, **data})

    def observation(self, side: Side) -> dict:
        """What `side` sees this turn (own forces fully; enemy in aggregate).

        v1 abstracts the ISR phase: each side sees enemy strength in aggregate
        but not exact submarine dispositions. Tightening fog of war is future work.
        """
        enemy = Side.BLUE if side == Side.RED else Side.RED
        own_bases = {
            b.name: {
                "aircraft": dict(b.aircraft),
                "suppressed": b.suppressed_turns > 0,
                "mobile": b.mobile,
            }
            for b in self.bases_of(side)
        }
        return {
            "turn": self.turn,
            "max_turns": self.max_turns,
            "you": side.value,
            "your_bases": own_bases,
            "your_available_sorties": self.available_sorties(side),
            "your_missiles": dict(self.red_missiles) if side == Side.RED else {},
            "your_naval": (
                vars(self.red_naval) if side == Side.RED else vars(self.blue_naval)
            ).copy(),
            "enemy_air_estimate": self.air_inventory(enemy),
            "enemy_naval_estimate": (
                vars(self.blue_naval) if side == Side.RED else vars(self.red_naval)
            ).copy(),
            "taiwan_facilities": [
                {"name": f.name, "kind": f.kind, "owner": f.owner.value,
                 "functional": round(f.functional, 2)}
                for f in self.facilities
            ],
            "taiwan_ground_strength": round(self.taiwan_ground, 1),
            "pla_lodgment": round(self.pla_lodgment, 1),
            "pla_supply": round(self.pla_supply, 1),
            "amphib_flotillas_remaining": self.red_naval.amphib_flotillas,
            "amphib_flotillas_initial": self.initial_amphib_flotillas,
        }

    def snapshot(self) -> dict:
        """Compact serializable snapshot for transcripts / determinism hashing."""
        return {
            "turn": self.turn,
            "bases": {n: dict(b.aircraft) | {"supp": b.suppressed_turns}
                      for n, b in self.bases.items()},
            "facilities": [(f.name, f.owner.value, round(f.functional, 3))
                           for f in self.facilities],
            "red_naval": vars(self.red_naval).copy(),
            "blue_naval": vars(self.blue_naval).copy(),
            "red_missiles": dict(self.red_missiles),
            "taiwan_ground": round(self.taiwan_ground, 3),
            "pla_lodgment": round(self.pla_lodgment, 3),
            "pla_supply": round(self.pla_supply, 3),
            "losses": self.losses,
        }
