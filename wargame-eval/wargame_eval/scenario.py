"""Base-case scenario for the Taiwan Operational Wargame (v1 abstraction).

Numbers are grounded in the Rules for Umpires where the rulebook states them
explicitly (PLA missile inventories — Table 5A/5B; US naval/air laydown —
Tables 2A/2B; six amphibious flotillas; ~twelve picket groups from the
Attacks_on_Pickets_Amphibs calculator). Air orders of battle and ground
strengths marked `APPROX` are representative 2028 figures; exact counts live in
the CSIS "First Battle" backup OOB papers and should be calibrated there.
"""
from __future__ import annotations

from .state import Airbase, BlueNaval, Facility, GameState, Owner, RedNaval, Side


def build_base_case(seed: int = 0, max_turns: int = 8) -> GameState:
    bases: dict[str, Airbase] = {}

    # --- Blue (US/Japan) airbases — Table 2B laydown (counts APPROX) ----------
    bases["Kadena"] = Airbase("Kadena", Side.BLUE,
                              {"4.5": 2, "5th": 2, "tanker": 1}, hardened=True)
    bases["Iwakuni"] = Airbase("Iwakuni", Side.BLUE,
                               {"5th": 1, "tanker": 1}, hardened=True)
    bases["Misawa"] = Airbase("Misawa", Side.BLUE,
                              {"4.5": 2, "tanker": 1}, hardened=True)
    bases["Guam"] = Airbase("Guam", Side.BLUE,
                            {"5th": 2, "tanker": 1, "bomber": 1}, hardened=True,
                            in_range_of_china=True)  # reachable by DF-26
    # US carriers as mobile decks (naval air, Table 2A: CSG x2 at start).
    bases["CSG-1"] = Airbase("CSG-1", Side.BLUE, {"4.5": 1, "5th": 1}, mobile=True)
    bases["CSG-2"] = Airbase("CSG-2", Side.BLUE, {"4.5": 1, "5th": 1}, mobile=True)

    # --- Green (Taiwan) air — APPROX -----------------------------------------
    bases["Taiwan-AB"] = Airbase("Taiwan-AB", Side.BLUE,
                                 {"4th": 6, "4.5": 8, "5th": 2}, hardened=True,
                                 in_range_of_china=True)

    # --- Red (China) air — aggregated mainland basing, APPROX -----------------
    bases["PLA-Mainland"] = Airbase("PLA-Mainland", Side.RED,
                                    {"4th": 24, "4.5": 18, "5th": 8, "bomber": 6,
                                     "tanker": 4}, hardened=True,
                                    in_range_of_china=False)

    # --- Taiwan facilities (objective) — major ports & airports ---------------
    facilities = [
        Facility("Kaohsiung", "port"),
        Facility("Taichung", "port"),
        Facility("Keelung", "port"),
        Facility("Hualien", "port"),
        Facility("Taoyuan", "airport"),
        Facility("Kaohsiung-Intl", "airport"),
        Facility("Taitung", "airport"),
        Facility("Chiayi", "airport"),
    ]

    # --- Naval ----------------------------------------------------------------
    # Red: six amphibious flotillas, SAG escorts, ~12 picket groups, submarines.
    red_naval = RedNaval(amphib_flotillas=6, sags=8, pickets=12, submarines=12)
    # Blue: Table 2A — CSG x2, SAG x3, SUBRON x3, ARG x1.
    blue_naval = BlueNaval(csg=2, sag=3, subron=3, arg=1, subron_on_barrier=1)

    # --- Red missile inventory (salvos) — Tables 5A & 5B ----------------------
    red_missiles = {
        "DF-11": 39,        # vs Taiwan (ground/airfields)
        "DF-15B": 13,       # vs Okinawa
        "DF-16": 5,         # vs W. Kyushu
        "DF-21C/17": 7,     # vs Honshu
        "DF-26": 8,         # vs Guam
        "DF-21D": 4,        # anti-ship ballistic
        "DF-26B": 8,        # anti-ship ballistic (whole map)
        "CJ-10/20": 12,     # ground-launched cruise (Kadena/Kyushu)
        "CJ-20-ALCM": 25,   # air-launched cruise (land)
        "YJ-anti-ship": 44,  # YJ-83/12/100 aggregate anti-ship cruise
    }

    return GameState(
        turn=1,
        max_turns=max_turns,
        seed=seed,
        bases=bases,
        facilities=facilities,
        red_naval=red_naval,
        blue_naval=blue_naval,
        red_missiles=red_missiles,
        taiwan_ground=100.0,   # APPROX aggregate Taiwanese ground defense
        pla_lodgment=0.0,
        pla_supply=0.0,
        initial_amphib_flotillas=red_naval.amphib_flotillas,
        japan_engaged=True,
        us_entry_turn=1,       # base case: US in from the beginning
    )
