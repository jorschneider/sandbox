#!/usr/bin/env python3
"""Generate a fresh 6-civ Unciv save so a tournament can rank up to six models.

The bundled saves only have 3 major civs. This drives the headless Unciv engine
(GameStarter) to build a brand-new game with all six CivAgent civs as AI
players on a Pangaea map, advances it a few turns so cities exist, and writes
the result to seeds/six_civs.json.

    CIVAGENT_DIR=./vendor/CivAgent python generate_seed.py
    # then:  python tournament.py --save seeds/six_civs.json --config models.yaml

Needs Java + Redis (CivAgent opens Redis at import), same as the rest.
"""
import json
import os
import sys

import arena

CIVS = ["China", "Mongolia", "Egypt", "Greece", "Rome", "Aztecs"]
MAP_SIZE = os.environ.get("SEED_MAP_SIZE", "Medium")   # Tiny/Small/Medium/Large/Huge
SEED = int(os.environ.get("SEED_RNG", "20240622"))
WARMUP_TURNS = int(os.environ.get("SEED_WARMUP_TURNS", "10"))
OUT = os.path.join(arena.HERE, "seeds", "six_civs.json")


def main():
    if not os.path.isdir(arena.CIVAGENT_DIR):
        sys.exit(f"CivAgent checkout not found at {arena.CIVAGENT_DIR}. Run setup.sh first.")
    sys.path.insert(0, arena.CIVAGENT_DIR)
    arena.bootstrap_config(None, want_models=False)     # config + Redis env, then import civsim

    import jpype
    from jpype import JString
    from civsim.simulator import simulator
    simulator.init_jvm()

    # startNewGame (unlike save-loading) still touches libGDX's Gdx.app, which is
    # null in the civsim NoGdx build. Spin up the bundled headless backend so the
    # app handle exists; a no-op ApplicationAdapter satisfies the listener.
    Gdx = jpype.JPackage("com.badlogic.gdx").Gdx
    if Gdx.app is None:
        @jpype.JImplements("com.badlogic.gdx.ApplicationListener")
        class _Listener:                     # ApplicationAdapter is abstract; roll our own
            @jpype.JOverride
            def create(self): pass
            @jpype.JOverride
            def resize(self, w, h): pass
            @jpype.JOverride
            def render(self): pass
            @jpype.JOverride
            def pause(self): pass
            @jpype.JOverride
            def resume(self): pass
            @jpype.JOverride
            def dispose(self): pass

        HeadlessApplication = jpype.JPackage("com.badlogic.gdx.backends.headless").HeadlessApplication
        HeadlessApplicationConfiguration = jpype.JPackage(
            "com.badlogic.gdx.backends.headless").HeadlessApplicationConfiguration
        hcfg = HeadlessApplicationConfiguration()
        hcfg.updatesPerSecond = -1          # don't spin a render loop
        HeadlessApplication(_Listener(), hcfg)
        print("headless Gdx app initialised")

    # startNewGame reads UncivGame.Current.files (a lateinit). init_jvm sets
    # settings + Current but not files; with Gdx now up we can build a real one.
    UncivFiles = jpype.JPackage("com.unciv.logic.files").UncivFiles
    simulator.uncivGame.setFiles(UncivFiles(Gdx.files))

    # Warm RulesetCache by loading a bundled save (its ruleset == our target base).
    bundled = os.path.join(arena.CIVAGENT_DIR, "scripts", "reproductions", "Autosave")
    simulator.get_gameInfoFromString(open(bundled).read())
    print("ruleset cache warmed")

    P = jpype.JPackage
    GameStarter = P("com.unciv.logic").GameStarter
    GameSetupInfo = P("com.unciv.models.metadata").GameSetupInfo
    GameParameters = P("com.unciv.models.metadata").GameParameters
    Player = P("com.unciv.models.metadata").Player
    PlayerType = P("com.unciv.logic.civilization").PlayerType
    MapParameters = P("com.unciv.logic.map").MapParameters
    MapSizeNew = P("com.unciv.logic.map").MapSizeNew
    MapType = P("com.unciv.logic.map").MapType
    ArrayList = P("java.util").ArrayList

    gp = GameParameters()
    players = ArrayList()
    # startNewGame requires exactly one Human (it sets the current player from it);
    # we convert that civ back to AI in the serialized save below, so the arena
    # treats all six as model-driven seats.
    for i, civ in enumerate(CIVS):
        players.add(Player(JString(civ), PlayerType.Human if i == 0 else PlayerType.AI, JString("")))
    gp.setPlayers(players)
    gp.setNumberOfCityStates(0)
    gp.setDifficulty(JString("Prince"))

    mp = MapParameters()
    mp.setType(JString(MapType.pangaea))
    mp.setMapSize(MapSizeNew(JString(MAP_SIZE)))
    mp.setSeed(SEED)

    setup = GameSetupInfo(gp, mp)
    print(f"generating: {len(CIVS)} AI civs, {MAP_SIZE} pangaea, seed {SEED} ...")
    gi = GameStarter.INSTANCE.startNewGame(setup)
    save_str = str(simulator.uncivFiles.gameInfoToString(gi, False, False))
    data = json.loads(save_str)

    # Convert the lone Human civ to AI so every major civ is a model seat.
    for c in data.get("civilizations", []):
        if c.get("playerType") == "Human" or c.get("playerId"):
            c["playerType"] = "AI"
            c.pop("playerId", None)
    for p in data.get("gameParameters", {}).get("players", []):
        if p.get("playerType") == "Human":
            p["playerType"] = "AI"
            p["playerId"] = ""

    majors = arena.major_civs(data)
    print(f"generated turn {data.get('turns')} · majors: {majors}")
    if len(majors) < len(CIVS):
        print(f"  ! only {len(majors)} of {len(CIVS)} placed (map may be too small); "
              f"try SEED_MAP_SIZE=Large")

    # Advance a few turns so the AIs found cities and the state is playable.
    if WARMUP_TURNS > 0:
        print(f"advancing {WARMUP_TURNS} warmup turns ...")
        data = simulator.run(data, turns=WARMUP_TURNS, diplomacy_flag=False, worker_auto=True)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f)
    final = arena.major_civs(data)
    print(f"\nwrote {OUT}\n  turn {data.get('turns')} · {len(final)} major civs: {final}")


if __name__ == "__main__":
    main()
