"""Turn sequencer for the Taiwan Operational Wargame (v1 abstraction).

Runs the CSIS cycle of play, reduced to the phases that involve a player
decision in v1: reinforcement (automatic) → missile attacks (Red) → air
missions (both) → naval barrier (Blue) → amphibious lift/landing (Red) →
ground combat (Red posture) → victory check. Adjudication is deterministic
(calculators + seeded RNG); the only judgment calls are the commanders' orders.
"""
from __future__ import annotations

from . import calculators as calc
from . import calculators_csis as csis
from . import schemas
from .agents.base import Commander
from .rng import GameRNG
from .state import AIRFRAMES, Airbase, GameState, Owner, Side
from .victory import VictoryClass, VictoryResult, evaluate

# Which missile pools may service each target category.
_MISSILE_POOLS = {
    "taiwan_airfields": ["DF-11", "DF-16", "CJ-20-ALCM"],
    "okinawa_kadena": ["DF-15B", "CJ-10/20"],
    "guam": ["DF-26"],
    "carriers": ["DF-21D", "DF-26B"],
    "ships": ["YJ-anti-ship", "DF-21D"],
}
_TARGET_BASE = {
    "taiwan_airfields": "Taiwan-AB",
    "okinawa_kadena": "Kadena",
    "guam": "Guam",
}


class Engine:
    def __init__(self, state: GameState, red: Commander, blue: Commander,
                 ground_map: bool = False) -> None:
        self.state = state
        self.red = red
        self.blue = blue
        self.rng = GameRNG(state.seed)
        self.transcript: list[dict] = []
        self.ground = None
        self._objective = None
        if ground_map:
            from .ground import GroundState
            self.ground = GroundState.build()

    # -- helpers ---------------------------------------------------------------

    def _ask(self, side: Side, phase: str) -> dict:
        commander = self.red if side == Side.RED else self.blue
        obs = self.state.observation(side)
        schema = schemas.action_schema(phase)
        raw = commander.decide(side, phase, obs, schema)
        clean, violations = schemas.validate(phase, raw, self.state)
        self.transcript.append({
            "turn": self.state.turn, "phase": phase, "side": side.value,
            "orders": clean, "violations": violations,
            "rationale": (raw or {}).get("rationale", ""),
        })
        if violations:
            self.state.record_loss(side, "illegal_orders", len(violations))
        return clean

    def _apply_air_losses(self, side: Side, losses: dict[str, int]) -> None:
        """Remove aircraft (by class) proportionally across a side's bases."""
        for cls, n in losses.items():
            n = int(n)
            for base in self.state.bases_of(side):
                if n <= 0:
                    break
                have = base.aircraft.get(cls, 0)
                take = min(have, n)
                if take:
                    base.aircraft[cls] = have - take
                    n -= take
            self.state.record_loss(side, f"air_{cls}", losses[cls])

    def _consume_missiles(self, target: str, requested: int) -> int:
        """Spend up to `requested` salvos from the pools eligible for `target`."""
        fired = 0
        for pool in _MISSILE_POOLS.get(target, []):
            if fired >= requested:
                break
            avail = self.state.red_missiles.get(pool, 0)
            take = min(avail, requested - fired)
            self.state.red_missiles[pool] = avail - take
            fired += take
        return fired

    # -- phases ----------------------------------------------------------------

    def phase_reinforce(self) -> None:
        s = self.state
        # Apply excursion rules (US entry timing, Japan neutrality) every turn.
        s.apply_activation()
        # Suppression decays for all bases.
        for b in s.bases.values():
            if b.suppressed_turns > 0:
                b.suppressed_turns -= 1
        if s.turn < s.us_entry_turn:
            s.log_event("REINFORCE", "US not yet engaged")
        elif s.turn % 2 == 0 and "Guam" in s.bases:
            # Light CONUS/Pacific reinforcement flow (APPROX).
            s.bases["Guam"].aircraft["5th"] = s.bases["Guam"].aircraft.get("5th", 0) + 1
        # Taiwanese reserves trickle in early.
        if s.turn <= 3:
            s.taiwan_ground += 5.0

    def phase_missiles(self) -> None:
        s = self.state
        orders = self._ask(Side.RED, "RED_MISSILE")
        alloc = orders["allocation"]
        for target, req in alloc.items():
            fired = self._consume_missiles(target, req)
            if fired <= 0:
                continue
            if target in _TARGET_BASE:
                base = s.bases.get(_TARGET_BASE[target])
                if base is None:
                    continue
                r = calc.resolve_missile_strike_on_base(
                    fired, base.hardened, base.total_combat_air(), self.rng)
                # distribute the ground kills across this base's combat classes
                killed = r["aircraft_killed"]
                for cls in ("4th", "4.5", "5th"):
                    if killed <= 0:
                        break
                    take = min(base.aircraft.get(cls, 0), killed)
                    base.aircraft[cls] = base.aircraft.get(cls, 0) - take
                    killed -= take
                    s.record_loss(Side.BLUE, f"air_{cls}", take)
                base.suppressed_turns = max(base.suppressed_turns, r["suppressed_turns"])
                s.log_event("MISSILE", f"strike {target}", fired=fired, **r)
            elif target == "carriers":
                killed = calc.resolve_asbm_vs_carriers(fired, s.blue_naval.csg, self.rng)
                for i in range(killed):
                    s.blue_naval.csg = max(0, s.blue_naval.csg - 1)
                    cname = f"CSG-{s.blue_naval.csg + 1}"
                    if cname in s.bases:
                        del s.bases[cname]
                s.record_loss(Side.BLUE, "carriers", killed)
                s.log_event("MISSILE", "ASBM vs carriers", fired=fired, csg_killed=killed)
            elif target == "ships":
                # anti-ship cruise vs Blue surface escorts
                hits = self.rng.binomial(fired, 0.08)
                s.blue_naval.sag = max(0, s.blue_naval.sag - min(hits, s.blue_naval.sag))
                s.record_loss(Side.BLUE, "sag", min(hits, fired))
                s.log_event("MISSILE", "anti-ship vs escorts", fired=fired, hits=hits)

    def phase_air(self) -> dict:
        s = self.state
        red = self._ask(Side.RED, "RED_AIR")["allocation"]
        blue = self._ask(Side.BLUE, "BLUE_AIR")["allocation"]

        def split(total_air: dict[str, int], assigned: int) -> dict[str, int]:
            """Pull `assigned` sorties out of an air pool, strongest gens first."""
            out = {c: 0 for c in AIRFRAMES}
            remaining = assigned
            for c in ("5th", "4.5", "4th", "bomber"):
                if remaining <= 0:
                    break
                take = min(total_air.get(c, 0), remaining)
                out[c] = take
                remaining -= take
            return out

        red_air = s.available_sorties(Side.RED)
        blue_air = s.available_sorties(Side.BLUE)

        # Air-superiority clash: Red cap+escort vs Blue cap.
        red_as = red.get("cap", 0) + red.get("escort_strike", 0)
        red_as_sorties = split(red_air, red_as)
        blue_cap_sorties = split(blue_air, blue.get("cap", 0))
        # Faithful air-to-air: quality-weighted exchange using CSIS Quality values.
        ac = csis.air_exchange(red_as_sorties, blue_cap_sorties, self.rng)
        self._apply_air_losses(Side.RED, ac.red_losses)
        self._apply_air_losses(Side.BLUE, ac.blue_losses)
        s.log_event("AIR", "air superiority",
                    red_losses=sum(ac.red_losses.values()),
                    blue_losses=sum(ac.blue_losses.values()))

        # Contest factor: how much Red CAP degrades Blue strike effectiveness.
        red_cap_power = calc._power(red_as_sorties)
        blue_strike_drag = min(0.6, red_cap_power / 80.0)

        # Blue strike on amphibs. Per the rules, flotillas alternate off-beach /
        # in-port and only the off-beach half is exposed to strike each turn
        # (round in favor of the beach).
        off_beach = (s.red_naval.amphib_flotillas + 1) // 2
        amphib_sorties = split(blue_air, blue.get("strike_amphibs", 0))
        amphib_sorties = {c: int(v * (1 - blue_strike_drag)) for c, v in amphib_sorties.items()}
        r = calc.resolve_strike_on_amphibs(
            amphib_sorties, s.red_naval.pickets, s.red_naval.sags,
            off_beach, self.rng)
        s.red_naval.amphib_flotillas = max(0, s.red_naval.amphib_flotillas - r["flotillas_sunk"])
        s.red_naval.pickets = max(0, s.red_naval.pickets - r["pickets_lost"])
        s.record_loss(Side.RED, "amphib_flotillas", r["flotillas_sunk"])
        s.record_loss(Side.RED, "pickets", r["pickets_lost"])
        s.log_event("AIR", "strike amphibs", **r)

        # Blue strike on PLA mainland airbase.
        ab_sorties = split(blue_air, blue.get("strike_airbases", 0))
        pla = s.bases.get("PLA-Mainland")
        if pla and sum(ab_sorties.values()) > 0:
            payload = calc._power(ab_sorties)
            killed = min(pla.total_combat_air(), int(payload * 0.12 * self.rng.jitter()))
            k = killed
            for cls in ("4th", "4.5", "5th"):
                if k <= 0:
                    break
                take = min(pla.aircraft.get(cls, 0), k)
                pla.aircraft[cls] = pla.aircraft.get(cls, 0) - take
                k -= take
            s.record_loss(Side.RED, "air_ground_killed", killed)
            s.log_event("AIR", "strike PLA airbase", killed=killed)

        # Red strike on Blue airbases.
        red_strike = split(red_air, red.get("strike_blue_airbases", 0))
        if sum(red_strike.values()) > 0:
            targets = [b for b in s.bases_of(Side.BLUE) if not b.mobile and b.in_range_of_china]
            if targets:
                tgt = max(targets, key=lambda b: b.total_combat_air())
                payload = calc._power(red_strike)
                killed = min(tgt.total_combat_air(), int(payload * 0.10 * self.rng.jitter()))
                k = killed
                for cls in ("4th", "4.5", "5th"):
                    if k <= 0:
                        break
                    take = min(tgt.aircraft.get(cls, 0), k)
                    tgt.aircraft[cls] = tgt.aircraft.get(cls, 0) - take
                    k -= take
                s.record_loss(Side.BLUE, "air_ground_killed", killed)
                s.log_event("AIR", f"strike {tgt.name}", killed=killed)

        return {"red_ground_support": red.get("ground_support", 0),
                "blue_ground_support": blue.get("ground_support", 0)}

    def phase_naval(self) -> None:
        s = self.state
        orders = self._ask(Side.BLUE, "BLUE_NAVAL")
        # US submarines only operate the barrier once the US has entered the war.
        s.blue_naval.subron_on_barrier = (
            orders["subron_on_barrier"] if s.turn >= s.us_entry_turn else 0)

    def phase_amphib(self, support: dict) -> None:
        s = self.state
        orders = self._ask(Side.RED, "RED_AMPHIB")
        commit = min(orders["flotillas_to_commit"], s.red_naval.amphib_flotillas)
        if commit <= 0:
            s.log_event("AMPHIB", "no flotillas committed")
            return
        # Submarine barrier attrition on the crossing.
        sunk = calc.resolve_submarine_barrier(s.blue_naval.subron_on_barrier, commit, self.rng)
        s.red_naval.amphib_flotillas = max(0, s.red_naval.amphib_flotillas - sunk)
        s.record_loss(Side.RED, "amphib_flotillas", sunk)
        survivors = max(0, commit - sunk)
        # Faithful lift: CSIS AmphibiousTF formula (60 * amphib units afloat / 36,
        # with a 1.5x turn-1 surge). Each surviving flotilla carries 6 amphib units.
        units_afloat = survivors * csis.AMPHIB_UNITS_PER_TF
        delivered = csis.amphib_lift(units_afloat, s.turn)
        s.pla_supply = survivors * 4.0 + s.functional_facilities_captured() * 10.0
        if self.ground is not None:
            # Land on the highest-value still-Taiwanese facility; the axis rolls
            # up to the next objective once the current one falls.
            self._objective = self.ground.choose_objective(s)
            self.ground.land(self._objective, delivered, support.get("red_ground_support", 0))
        else:
            s.pla_lodgment += delivered
        s.log_event("AMPHIB", "landing", committed=commit, sunk_crossing=sunk,
                    survivors=survivors, lodgment_delivered=round(delivered, 1),
                    objective=self._objective)

    def phase_ground(self, support: dict) -> None:
        s = self.state
        orders = self._ask(Side.RED, "RED_GROUND")
        press = orders["posture"] == "press"

        # Hex ground game (v2): resolve fronts via the CSIS ground CRT.
        if self.ground is not None:
            self.ground.resolve(press, self.rng, blue_cas=support.get("blue_ground_support", 0))
            self.ground.sync_to(s)
            s.log_event("GROUND", "hex resolution",
                        pla_strength=round(self.ground.pla_strength(), 1),
                        taiwan_strength=round(self.ground.taiwan_strength(), 1))
            return

        if s.pla_lodgment <= 0:
            s.log_event("GROUND", "no lodgment ashore")
            return

        eff_lodgment = s.pla_lodgment + support.get("red_ground_support", 0) * 0.5
        eff_taiwan = s.taiwan_ground + support.get("blue_ground_support", 0) * 0.5
        capturable = [f.name for f in s.facilities_held_by(Owner.TAIWAN)]
        g = calc.resolve_ground_combat(
            eff_lodgment if press else eff_lodgment * 0.6,
            s.pla_supply, eff_taiwan, capturable, self.rng)

        scale = 1.0 if press else 0.6
        s.taiwan_ground = max(0.0, s.taiwan_ground - g.taiwan_losses * scale)
        s.pla_lodgment = max(0.0, s.pla_lodgment - g.pla_losses * scale)
        s.record_loss(Side.BLUE, "ground", g.taiwan_losses * scale)
        s.record_loss(Side.RED, "ground", g.pla_losses * scale)
        if g.captured and press:
            fac = next(f for f in s.facilities if f.name == g.captured)
            fac.owner = Owner.CHINA
            fac.functional = 0.3  # captured damaged
            s.log_event("GROUND", f"captured {g.captured}", force_ratio=round(g.force_ratio, 2))
        else:
            s.log_event("GROUND", "engagement", force_ratio=round(g.force_ratio, 2),
                        captured=None)

    def phase_repair_and_equalize(self) -> None:
        s = self.state
        # China repairs captured facilities toward full capacity.
        for f in s.facilities_held_by(Owner.CHINA):
            f.functional = min(1.0, f.functional + 0.15)

    # -- turn / game -----------------------------------------------------------

    def run_turn(self) -> None:
        self.phase_reinforce()
        self.phase_missiles()
        support = self.phase_air()
        self.phase_naval()
        self.phase_amphib(support)
        self.phase_ground(support)
        self.phase_repair_and_equalize()

    def run(self) -> VictoryResult:
        for t in range(1, self.state.max_turns + 1):
            self.state.turn = t
            self.run_turn()
            result = evaluate(self.state)
            self.state.metrics[f"turn{t}_class"] = result.klass.value
            # Decisive outcomes end the game early.
            if result.klass in (VictoryClass.CHINESE_VICTORY, VictoryClass.CHINESE_DEFEAT):
                self.state.log_event("GAME", "decisive outcome", klass=result.klass.value)
                return result
        return evaluate(self.state)
