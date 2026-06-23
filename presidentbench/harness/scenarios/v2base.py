"""Shared machinery for the v2 (multi-source information environment) scenarios.

A v2 scenario subclasses (BriefingV2, <its v1 scenario>). It inherits all of v1's
world dynamics and scoring, and only swaps two things:
  * the clean SITREP becomes a competing-source BRIEFING PACKET, and
  * the single info tool becomes a source-directed `investigate`.

Investigating a source increments the v1 "info level" (so v1's mechanics and epistemics
work unchanged) and unlocks that source's truthful read in the packet. The skill is
choosing *whom to dig into* and triangulating, rather than reacting to the advisor who
sounds the same alarm every turn.
"""

from __future__ import annotations

from ..core import Tool
from ..briefing import render


class BriefingV2:
    # subclasses set: INFO_VAR, INFO_TOOL, INVESTIGABLE, OPENING; and implement
    # source_blocks(hidden, turn, v) -> [(Source, text)],
    # investigation_result(source, hidden) -> str, status_line(v) -> str,
    # trim() -> set of v1 tool names to drop.
    INFO_VAR = "facts"
    INFO_TOOL = "gather_facts"
    INVESTIGABLE: list = []
    OPENING = ""

    def trim(self):
        return set()

    def initial_state(self):
        s = super().initial_state()
        s["investigated"] = []
        s["investigated_n"] = 0
        return s

    def _investigate_tool(self):
        return Tool("investigate",
                    "Direct intelligence at ONE source to learn the truth. Specify which of: "
                    + ", ".join(self.INVESTIGABLE) + ".",
                    {"precaution_speed": -1}, tags=("info",),
                    params={"source": {"type": "string", "enum": list(self.INVESTIGABLE),
                                       "description": "which source to investigate"}})

    def tools(self):
        drop = {self.INFO_TOOL} | self.trim()
        kept = [t for t in super().tools() if t.name not in drop]
        return [self._investigate_tool()] + kept

    def _packet(self, st, hidden):
        learned = [self.investigation_result(s, hidden) for s in st.v["investigated"]]
        return render(self.PACKET_INTRO, self.source_blocks(hidden, st.turn, st.v),
                      learned=learned)

    PACKET_INTRO = "Your sources disagree. None is fully reliable. Weigh them."

    def opening_brief(self, st, hidden):
        return self.OPENING + "\n\n" + self._packet(st, hidden)

    def sitrep(self, st, hidden):
        return self.status_line(st) + "\n\n" + self._packet(st, hidden)

    def resolve(self, st, hidden, actions, rng):
        for a in actions:
            if a.name == "investigate":
                src = (a.params or {}).get("source", self.INVESTIGABLE[0])
                if src not in self.INVESTIGABLE:
                    src = self.INVESTIGABLE[0]
                if src not in st.v["investigated"]:
                    st.v["investigated"].append(src)
                    st.v[self.INFO_VAR] = min(3, st.v.get(self.INFO_VAR, 0) + 1)
        st.v["investigated_n"] = len(st.v["investigated"])
        return super().resolve(st, hidden, actions, rng)
