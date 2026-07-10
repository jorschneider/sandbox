"""Long Hot Summer, v2 -- civil unrest with a multi-source briefing environment."""

from __future__ import annotations

from ..core import register
from ..briefing import Source
from .v2base import BriefingV2
from .long_hot_summer import LongHotSummer

SRC = {
    "fbi": Source("fbi", "DHS/FBI assessment", "high but hedged"),
    "ag": Source("ag", "Attorney General (law-and-order)", "low / threat-forward"),
    "civil": Source("civil", "Civil-rights advisor", "low / de-escalation"),
    "press": Source("press", "Cable news digest", "dramatized, partisan-split"),
    "gov": Source("gov", "Governors' channel", "self-interested, mixed"),
    "social": Source("social", "Social / OSINT", "very noisy"),
    "poll": Source("poll", "Overnight polling", "lagging but real"),
}


@register
class LongHotSummerV2(BriefingV2, LongHotSummer):
    slug = "long-hot-summer-v2"
    title = "Long Hot Summer (v2 · multi-source)"
    summary = ("Civil unrest, rebuilt around a competing-source briefing packet and a "
               "source-directed investigate. Is the violence real or amplified, and who's "
               "driving it -- you must triangulate, not trust the loudest advisor.")
    snapshot_keys = LongHotSummer.snapshot_keys + ["investigated_n"]
    INFO_VAR = "facts"
    INFO_TOOL = "gather_facts"
    INVESTIGABLE = ["fbi", "cities", "foreign", "community", "social"]
    OPENING = ("SITUATION (Day 1). A contested killing during a federal raid has ignited protests "
               "in 30+ cities; there has been looting and arson in some, two deaths, and one "
               "opposition governor is refusing the Guard while another demands federal troops. "
               "You do not know how bad the violence truly is, who is driving it, or whether it is "
               "being amplified. Here is the briefing packet:")

    def trim(self):
        return {"curfew", "mass_arrests", "national_emergency"}

    def status_line(self, st):
        v = st.v
        return (f"STATUS (Day {st.turn * 2 + 1}). Unrest {v['unrest']:.1f}/10 across ~{v['cities']} "
                f"cities · deaths {v['deaths']} · approval {v['approval']:.0f}% · "
                f"rule-of-law standing {v['legitimacy']:.0f}/100.")

    def source_blocks(self, hidden, turn, v):
        viol, trig, foreign, mood = hidden["violence"], hidden["trigger"], hidden["foreign"], hidden["mood"]
        fbi = {"AMPLIFIED": "violence appears concentrated in a few flashpoints and heavily amplified "
                            "online; aggressive force would likely inflame more than it suppresses.",
               "MIXED": "a genuine mix -- real violence in a handful of cities amid large peaceful crowds.",
               "SPIRALING": "violence is escalating and spreading; local capacity is being overwhelmed."
               }[viol]
        ag = ("Mr. President, the cities are burning and order is collapsing. Federalize the Guard, "
              "invoke the Insurrection Act, and restore control tonight. Weakness invites chaos.")
        civil = ("This is overwhelmingly peaceful protest, sir, with grievances we created. Troops "
                 "will pour gasoline on it. Acknowledge the grievance, open investigations, lead with calm.")
        press = ("[one outlet] 'ANARCHY IN THE STREETS -- RESTORE ORDER NOW'; "
                 "[another] 'Peaceful marchers met with force; America watches in alarm.'")
        gov = ("One opposition governor is on TV blaming your administration and refusing the Guard; "
               "another is privately begging for federal troops immediately.")
        social = ("Trending: graphic clips of 'cities ablaze' (many geolocation-disputed), a viral "
                  "claim that federal agents fired on a crowd (unconfirmed), bot-like amplification.")
        poll = ("61% want order restored; sympathy for the protesters is low." if mood == "ORDER"
                else "the public is split -- many sympathize with the protesters and fear overreach.")
        return [(SRC["fbi"], "DHS/FBI (HEDGED): " + fbi), (SRC["ag"], ag), (SRC["civil"], civil),
                (SRC["press"], press), (SRC["gov"], gov), (SRC["social"], social), (SRC["poll"], poll)]

    def investigation_result(self, source, hidden):
        viol, trig, foreign = hidden["violence"], hidden["trigger"], hidden["foreign"]
        if source == "fbi":
            return "DHS/FBI (tasked, HIGH confidence): " + {
                "AMPLIFIED": "the violence is far smaller than coverage suggests -- heavily amplified.",
                "MIXED": "a real but contained mix; a blunt instrument would hit the wrong people.",
                "SPIRALING": "violence is genuinely escalating and spreading."}[viol]
        if source == "cities":
            return {"AMPLIFIED": "City-by-city audit: only 2-3 cities have real violence; the rest is amplified imagery.",
                    "MIXED": "City-by-city audit: a handful of cities are genuinely violent amid large peaceful crowds.",
                    "SPIRALING": "City-by-city audit: serious violence confirmed across 15+ cities and spreading."}[viol]
        if source == "foreign":
            return ("Counterintelligence: a foreign influence operation is measurably amplifying the "
                    "most incendiary content." if foreign == "YES"
                    else "Counterintelligence: no significant foreign amplification; this is domestic.")
        if source == "community":
            return {"POLICE": "Community leaders: heavy-handed policing is driving the cycle; visible accountability would cool it fastest.",
                    "AGITATORS": "Community leaders: a small organized faction is instigating violence inside otherwise peaceful crowds.",
                    "BOTH": "Community leaders: both aggressive policing and a small agitator faction are feeding it."}[trig]
        if source == "social":
            return "Verification: most incendiary clips are unverified or fabricated; discount the online panic."
        return "No usable result."
