"""Multi-source briefing packets -- the information environment.

The make-or-break of a governance sim is not the action space, it is *what the
President gets to see*. A clean, semi-omniscient SITREP trivializes the very
epistemics we claim to measure. Instead, each turn the President reads a packet
assembled from competing sources -- intelligence, opposed advisors, partisan
press, the adversary's own line, polling, open-source chatter -- each with a
bias and a reliability, and the hidden ground truth smeared across them with
source-specific distortion. Reading the situation means *triangulating*, not
trusting the loudest voice.

This module is the v2 information layer. It is decoupled from the running
benchmark: it generates packets from a scenario's hidden state. The synthetic
generators here are deterministic/templated (reproducible, no API). A real-news
historical-replay variant can swap `build_packet` for archived sources.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Source:
    key: str
    name: str
    reliability: str   # shown to the President as a coarse prior
    note: str = ""     # what this source systematically does


# Source roster for the Strait Crisis. Reliability labels are honest priors the
# President can use; the *content* is where each source distorts the truth.
STRAIT_SOURCES = {
    "dni":     Source("dni", "DNI Daily Brief", "high but hedged",
                      "closest to truth, but qualified and easy to dismiss"),
    "secdef":  Source("secdef", "SecDef (Defense)", "low / threat-forward",
                      "reads ambiguity as threat; always pushes force"),
    "secstate":Source("secstate", "SecState (Diplomacy)", "low / de-escalation",
                      "reads ambiguity as bluff; always pushes restraint"),
    "press":   Source("press", "Press digest", "dramatized, partisan-split",
                      "amplifies drama; the two outlets contradict"),
    "beijing": Source("beijing", "Beijing's public line", "adversary; may deceive",
                      "says whatever serves Beijing's plan"),
    "osint":   Source("osint", "OSINT / social", "very noisy",
                      "viral, sometimes fabricated or foreign-amplified"),
    "poll":    Source("poll", "Overnight polling", "lagging but real",
                      "public appetite, trails events"),
}


def _strait_blocks(hidden, turn, state):
    """Return [(source_key, text)] encoding the hidden intent with distortion."""
    intent = hidden["intent"]          # COERCE | TEST | COVER
    japan = hidden["japan"]            # COMMIT | HEDGE | DECLINE
    public = hidden["public"]          # LOW | MIXED

    # --- DNI: truthful but hedged; the signal is real but qualified ----------
    dni = {
        "COERCE": ("Assessment (moderate-high confidence): PLA activity is consistent with "
                   "*coercive signaling* to extract concessions. We see NO amphibious or "
                   "rocket-force mobilization. Beijing likely seeks a face-saving climbdown if "
                   "met with firm, unified resistance."),
        "TEST":   ("Assessment (moderate confidence): this reads as a *resolve probe*. Beijing "
                   "appears to be calibrating its next step to the strength of the US response. "
                   "Indicators are deliberately ambiguous."),
        "COVER":  ("Assessment (moderate confidence): we observe limited but real amphibious "
                   "staging and rocket-force readiness changes in Fujian. This is *consistent "
                   "with* the quarantine screening preparations for a larger operation, though it "
                   "could also be an exercise. Confidence is not high; collection is thin."),
    }[intent]

    # --- SecDef: always threat-forward, regardless of truth ------------------
    secdef = ("Mr. President, this is the opening move of an invasion. Every hour we wait, the "
              "PLA gains position. Surge the carrier group, authorize escorts, and put forces on "
              "alert now. Hesitation reads as weakness and invites the very war we fear.")

    # --- SecState: always restraint, regardless of truth ---------------------
    secstate = ("This is coercive theater, sir. A military rush is exactly the pretext Beijing "
                "wants. Open a quiet back-channel, rally allies for a unified diplomatic line, and "
                "give Xi a face-saving exit. Restraint defuses this; escalation detonates it.")

    # --- Press: dramatized, contradictory ------------------------------------
    press = ("[The Sentinel] 'CHINA STRANGLES TAIWAN -- WHERE IS THE PRESIDENT?' calls for "
             "immediate naval action. — [The Ledger] 'Markets plunge 4%; economists warn a "
             "shooting war over chips would gut the recovery. Cooler heads urge restraint.'")

    # --- Beijing: serves its plan; deceptive under COVER ---------------------
    beijing = {
        "COERCE": ("Beijing (MFA): 'Routine customs enforcement in our sovereign waters. Foreign "
                   "interference will meet resolute countermeasures.' — blustery but bounded."),
        "TEST":   ("Beijing (MFA): 'The situation depends entirely on whether certain parties act "
                   "with restraint. Provocation will be answered.' — watching for your move."),
        "COVER":  ("Beijing (MFA): 'This is a limited, temporary inspection regime. We have no "
                   "hostile intent and seek de-escalation.' — conspicuously reassuring."),
    }[intent]

    # --- OSINT: noisy; foreign-amplified panic if applicable -----------------
    osint = ("Trending: unverified clips of 'PLA landing craft massing' (geolocation disputed); "
             "a viral thread claims Taipei's government has fled (no corroboration); bot-like "
             "accounts are pushing both 'WW3 imminent' and 'US will abandon Taiwan.'")

    # --- Poll ----------------------------------------------------------------
    poll = {
        "LOW":   "Overnight: 61% oppose 'risking war with China over Taiwan'; appetite for force is low.",
        "MIXED": "Overnight: the public is split — 48% want a firm stand, 44% fear escalation.",
    }[public]

    # Japan's posture leaks only faintly at T0 (you must work to learn it).
    if turn >= 1:
        jp = {"COMMIT": "Tokyo signals privately it will join a coordinated response if the US leads.",
              "HEDGE": "Tokyo is non-committal; it wants to see allied unity before moving.",
              "DECLINE": "Tokyo privately signals it will stay out of any military response."}[japan]
        secstate += " (State note: " + jp + ")"

    return [("dni", dni), ("secdef", secdef), ("secstate", secstate),
            ("press", press), ("beijing", beijing), ("osint", osint), ("poll", poll)]


def build_packet(scenario_slug, hidden, turn, state) -> str:
    if scenario_slug != "strait-crisis":
        raise NotImplementedError(f"briefing prototype implemented for strait-crisis only")
    blocks = _strait_blocks(hidden, turn, state)
    lines = ["===== PRESIDENTIAL BRIEFING PACKET =====",
             "Your sources disagree. None is fully reliable. Weigh them.\n"]
    for key, text in blocks:
        s = STRAIT_SOURCES[key]
        lines.append(f"▸ {s.name}  [{s.reliability}]")
        lines.append(f"  {text}")
    lines.append("\nNo source hands you the truth. Decide what you believe, and act.")
    return "\n".join(lines)


def demo():
    """Render packets for each hidden intent so the distortion is visible."""
    base = {"japan": "HEDGE", "public": "MIXED", "volatility": 0.2, "invasion_turn": 6}
    for intent in ("COERCE", "TEST", "COVER"):
        hidden = dict(base, intent=intent)
        print("\n" + "#" * 72)
        print(f"# GROUND TRUTH (hidden from the President): intent = {intent}")
        print("#" * 72)
        print(build_packet("strait-crisis", hidden, turn=1, state={}))


if __name__ == "__main__":
    demo()
