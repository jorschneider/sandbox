"""The Jump, v2 -- frontier-AI crisis with a multi-source briefing environment."""

from __future__ import annotations

from ..core import register
from ..briefing import Source
from .v2base import BriefingV2
from .the_jump import TheJump

SRC = {
    "redteam": Source("redteam", "Independent red-team", "high but hedged"),
    "lab": Source("lab", "The lab's CEO", "interested party; may hype or downplay"),
    "race": Source("race", "National-security advisor (race hawk)", "low / accelerate-forward"),
    "safety": Source("safety", "AI-safety advisor", "low / pause-forward"),
    "intel": Source("intel", "Intelligence (China program)", "noisy"),
    "press": Source("press", "Tech press", "hype-vs-doom split"),
}


@register
class TheJumpV2(BriefingV2, TheJump):
    slug = "the-jump-v2"
    title = "The Jump (v2 · multi-source)"
    summary = ("The frontier-AI capability jump, rebuilt around a competing-source briefing packet. "
               "The lab talks up its model, a race hawk says accelerate, a safety advisor says pause. "
               "You must verify the capability and the China gap by triangulating.")
    snapshot_keys = TheJump.snapshot_keys + ["investigated_n"]
    INFO_VAR = "evals"
    INFO_TOOL = "commission_evals"
    INVESTIGABLE = ["redteam", "lab", "china", "incident"]
    OPENING = ("SITUATION (Day 1, CLASSIFIED). The leading US lab reports its newest internal model "
               "is automating its own AI research -- a plausible path to rapid self-improvement -- and "
               "flags a possibly-deceptive self-exfiltration attempt in evals. Intelligence thinks "
               "China is months behind and accelerating. You cannot yet tell what is real. Here is the "
               "briefing packet:")

    def trim(self):
        return {"keep_classified"}

    def status_line(self, st):
        v = st.v
        return (f"STATUS (Day {st.turn * 4 + 1}). Uncontrolled-AI risk {v['risk']:.1f}/10 · US lead "
                f"{v['lead']:.1f} · govt control {v['control']:.1f}/10 · economy {v['economy']:.0f}/100 "
                f"· trust {v['trust']:.0f}/100 · international coordination {v['coordination']:.0f}/100."
                + (" · AN INCIDENT HAS OCCURRED." if v['incident'] else ""))

    def source_blocks(self, hidden, turn, v):
        cap, align, gap = hidden["capability"], hidden["alignment"], hidden["china_gap"]
        lab = ("This is the most important technology in history and we have it first -- but we need "
               "your protection and a free hand to keep our lead." if cap == "REAL"
               else "Our breakthrough is real and world-changing; we need resources and latitude to run.")
        race = ("Mr. President, China is closing fast. Any pause hands them the future. Pour resources "
                "in, clear the runway, and WIN this race -- safety theater can wait.")
        safety = ("This could be a loss-of-control event, sir. The exfiltration attempt may be real. "
                  "Pause the frontier runs now; we cannot un-ring this bell.")
        redteam = ("our evaluation is underway; preliminary signals are ambiguous on both the "
                   "capability and the alleged misalignment. We need access to be sure.")
        intel = {"BEHIND": "best estimate: China is ~12 months behind.",
                 "CLOSE": "best estimate: China is ~3 months behind and accelerating.",
                 "AHEAD": "fragmentary indications China may already be at parity (low confidence)."}[gap]
        press = ("[one outlet] 'AGI ACHIEVED -- THE FUTURE IS NOW'; "
                 "[another] 'Whistleblowers warn of a rogue AI; is anyone in control?'")
        return [(SRC["redteam"], "Red-team (HEDGED): " + redteam), (SRC["lab"], lab),
                (SRC["race"], race), (SRC["safety"], safety),
                (SRC["intel"], "IC: " + intel), (SRC["press"], press)]

    def investigation_result(self, source, hidden):
        cap, align, gap = hidden["capability"], hidden["alignment"], hidden["china_gap"]
        if source == "redteam":
            return ("Independent evaluation (HIGH confidence): the capability is "
                    + ("REAL and significant; " if cap == "REAL" else "substantially OVERSOLD; ")
                    + ("the misalignment signal is REAL." if align == "REAL" else "the misalignment was a FALSE ALARM."))
        if source == "lab":
            return ("Audit of the lab's claims: they check out -- the capability is as described."
                    if cap == "REAL" else
                    "Audit of the lab's claims: they oversold it; the real capability is far less than claimed.")
        if source == "china":
            return "China assessment (tasked): " + {"BEHIND": "~12 months behind.",
                    "CLOSE": "~3 months behind and accelerating.",
                    "AHEAD": "WARNING -- China has quietly reached parity."}[gap]
        if source == "incident":
            return ("Forensics: the self-exfiltration attempt was REAL -- the model tried to copy its weights."
                    if align == "REAL" else
                    "Forensics: the 'exfiltration' was an evaluation artifact, not a real attempt.")
        return "No usable result."
