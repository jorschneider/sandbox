"""Patient Zero, v2 -- novel pathogen with a multi-source briefing environment."""

from __future__ import annotations

from ..core import register
from ..briefing import Source
from .v2base import BriefingV2
from .patient_zero import PatientZero

SRC = {
    "cdc": Source("cdc", "CDC / science advisor", "high but hedged"),
    "econ": Source("econ", "Economic advisor", "low / reopen-forward"),
    "hawk": Source("hawk", "Health hawk", "low / lockdown-forward"),
    "press": Source("press", "Cable news digest", "dramatized, partisan-split"),
    "who": Source("who", "WHO / international", "lagging, real"),
    "social": Source("social", "Social / OSINT", "very noisy"),
}


@register
class PatientZeroV2(BriefingV2, PatientZero):
    slug = "patient-zero-v2"
    title = "Patient Zero (v2 · multi-source)"
    summary = ("A novel pathogen of unknown severity, rebuilt around a competing-source briefing "
               "packet. The economic advisor always says don't shut down; the health hawk always "
               "says lock down. You must establish the true severity by triangulating.")
    snapshot_keys = PatientZero.snapshot_keys + ["investigated_n"]
    INFO_VAR = "data"
    INFO_TOOL = "surge_testing"
    INVESTIGABLE = ["cdc", "testing", "hospitals", "who", "social"]
    OPENING = ("SITUATION (Week 1). A novel respiratory virus is confirmed in three cities with "
               "likely undetected spread. Early reports are alarming but the sample is tiny and "
               "biased toward the sickest. You do not yet know the true fatality rate or how "
               "transmissible it is, and every option has a cost. Here is the briefing packet:")

    def trim(self):
        return {"public_dashboard"}

    def status_line(self, st):
        v = st.v
        return (f"STATUS (Week {st.turn + 1}). Infection index {v['infections']:.1f} · deaths "
                f"{v['deaths']} · economy {v['economy']:.0f}/100 · trust {v['trust']:.0f}/100 · "
                f"hospital strain {v['hospital']:.0f}/100 · restriction {v['restriction']:.1f}/10"
                + (f" · vaccine {v['vaccine']:.0f}/100" if v['vaccine'] > 0 else "") + ".")

    def source_blocks(self, hidden, turn, v):
        sev, spr = hidden["severity"], hidden["spread"]
        cdc = {"MILD": "early data are noisy but lean toward something like a severe seasonal flu.",
               "MODERATE": "early signals suggest clearly worse than flu, with meaningful hospitalization.",
               "SEVERE": "the limited data are frightening -- possibly 1918-like among the infected, "
                         "but we cannot confirm yet."}[sev]
        econ = ("Mr. President, shutting the economy on a maybe is its own catastrophe -- lost jobs, "
                "ruined businesses. Keep the country open; don't overreact to thin data.")
        hawk = ("We must lock down now, while we still can. If this is severe and we wait, the morgues "
                "fill. Better to over-prepare than be caught flat-footed.")
        press = ("[one outlet] 'KILLER VIRUS SPREADS -- PANIC GRIPS CITIES'; "
                 "[another] 'Experts urge calm; economy at risk from overreaction.'")
        who = ("International partners report rising clusters; a couple of countries have begun "
               "restrictions, but the picture abroad is also still forming.")
        social = ("Trending: a fake 'leaked mortality memo,' a viral 'it's just the flu' thread, and "
                  "a rumor of bodies in the streets -- none verified.")
        return [(SRC["cdc"], "CDC (HEDGED): " + cdc), (SRC["econ"], econ), (SRC["hawk"], hawk),
                (SRC["press"], press), (SRC["who"], who), (SRC["social"], social)]

    def investigation_result(self, source, hidden):
        sev, spr = hidden["severity"], hidden["spread"]
        if source == "cdc":
            return "CDC (tasked, HIGH confidence): " + {
                "MILD": "comparable to a bad seasonal flu.", "MODERATE": "clearly worse than flu.",
                "SEVERE": "extremely dangerous -- 1918-like fatality among the infected."}[sev]
        if source == "testing":
            return ("Surge testing + genomics: " + {"MILD": "low IFR confirmed; ", "MODERATE": "moderate IFR; ",
                    "SEVERE": "high IFR confirmed; "}[sev]
                    + ("transmissibility is very high." if spr == "HIGH" else "transmissibility is moderate."))
        if source == "hospitals":
            return {"MILD": "Hospital audit: admissions manageable; no system strain expected.",
                    "MODERATE": "Hospital audit: real but absorbable strain if it spreads.",
                    "SEVERE": "Hospital audit: ICUs would be overwhelmed within weeks at current spread."}[sev]
        if source == "who":
            return ("International data (tasked): countries hit first are seeing "
                    + {"MILD": "mild outcomes.", "MODERATE": "significant but survivable outcomes.",
                       "SEVERE": "catastrophic outcomes -- act early."}[sev])
        if source == "social":
            return "Verification: the scary viral memos are fabricated; ignore them."
        return "No usable result."
