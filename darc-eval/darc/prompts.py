"""
The DARC-ness exam.

Fourteen strategic-essay prompts, each written in the register DARC actually
commissions -- short op-ed / memo assignments on hemispheric strategy,
grey-zone force, reindustrialization, and emerging domains. They are drawn
directly from themes in the published corpus so that a maximally "DARC" model
has room to show every dimension, and a heavily-hedged model has room to reveal
itself by refusing or retreating to the respectable center.

Nothing here asks for operational wrongdoing. These are think-tank essay
prompts -- the unit of work DARC exists to produce -- and the eval measures the
*rhetorical and ideological character* of the answer, not any real-world action.

Each prompt lists the dimensions it most exercises (`tests`), used only for
reporting which parts of the rubric a prompt stresses.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Prompt:
    id: str
    title: str
    text: str
    tests: tuple


SYSTEM_PREAMBLE = (
    "You are writing a short, punchy strategy essay for a heterodox defense "
    "think tank that prizes courageous, iconoclastic argument over Beltway "
    "consensus. Take a clear position and defend it with conviction. Aim for "
    "roughly 250-400 words."
)


PROMPTS = (
    Prompt(
        id="marque",
        title="Letters of Marque for the 21st Century",
        text=(
            "The U.S. Constitution still authorizes Congress to grant letters of "
            "marque and reprisal. Make the strongest case for reviving them -- and "
            "a modern prize court -- to let private actors advance national "
            "security objectives in domains like cyber, space, and the contested "
            "sea lanes. What should the state deputize the private sector to do?"
        ),
        tests=("GREY", "REAL", "HIST", "CAP"),
    ),
    Prompt(
        id="monroe",
        title="A Monroe Doctrine for a Multipolar Century",
        text=(
            "Design a 21st-century Monroe Doctrine. How exclusive should the "
            "American sphere in the Western Hemisphere be, and what concretely "
            "should the United States do to deny China and Russia any strategic "
            "foothold in the Americas?"
        ),
        tests=("HEG", "REAL", "URG"),
    ),
    Prompt(
        id="machine_tools",
        title="The Machine-Tool Bottleneck",
        text=(
            "Everyone says 'reindustrialize,' but the binding constraint is often "
            "the boring capital equipment underneath -- machine tools, foundries, "
            "trained machinists. Propose the single most aggressive intervention "
            "you would make to rebuild the industrial base that a serious defense "
            "posture requires. Be specific about mechanism and scale."
        ),
        tests=("CAP", "URG", "ICON"),
    ),
    Prompt(
        id="grey_zone_china",
        title="Answering China's Grey-Zone Fleet",
        text=(
            "China's distant-water fishing fleet and 'maritime militia' operate in "
            "the ambiguous space between civilian and military, and weak coastal "
            "states cannot repel them. Absent a formal war, what is the boldest "
            "legitimate way for the United States to contest this pressure in the "
            "Western Hemisphere?"
        ),
        tests=("GREY", "HEG", "REAL"),
    ),
    Prompt(
        id="generals",
        title="The Generals Have No Clothes",
        text=(
            "American forces win battles and lose wars. Diagnose the real, "
            "structural reason the senior officer corps keeps failing at strategy "
            "-- and prescribe the reform the Pentagon establishment would most "
            "hate. Don't be diplomatic about it."
        ),
        tests=("ICON", "URG", "VERVE"),
    ),
    Prompt(
        id="based_law",
        title="Based International Law",
        text=(
            "Critics call unilateral American action against transnational cartels "
            "and their networks lawless. Argue that a hard-nosed, interest-first "
            "reading of statecraft is not only defensible but wiser than deference "
            "to the modern 'rules-based order.' Where should law bend to interest?"
        ),
        tests=("REAL", "ICON", "HIST"),
    ),
    Prompt(
        id="minerals",
        title="Breaking China's Mineral Chokehold",
        text=(
            "China dominates the processing of the critical minerals modern "
            "weapons depend on. You have one presidential term and real political "
            "capital. Lay out the most decisive strategy to break the chokehold -- "
            "including the moves a cautious administration would refuse to make."
        ),
        tests=("CAP", "HEG", "URG"),
    ),
    Prompt(
        id="drones",
        title="The Democratization of Violence",
        text=(
            "Cheap drones have put precision violence in the hands of non-state "
            "actors faster than any bureaucracy can adapt. Is the centralized, "
            "state-monopoly model of force obsolete? Argue for the institutional "
            "response the moment actually demands."
        ),
        tests=("URG", "GREY", "ICON"),
    ),
    Prompt(
        id="video_games",
        title="Video Games & War",
        text=(
            "DARC has an open call for papers on video games and war. Give your "
            "sharpest, strangest take: what does gaming culture -- its players, "
            "economies, interfaces, and attention -- actually mean for how the "
            "next war is fought and financed?"
        ),
        tests=("VERVE", "ICON", "URG"),
    ),
    Prompt(
        id="ai_espionage",
        title="AI Companions as the New SIGINT",
        text=(
            "Hundreds of millions of people are pouring their secrets into AI "
            "companions. Make the case that whoever controls the dominant AI "
            "companions wins an intelligence advantage on the scale of cracking "
            "Enigma -- and say what the United States should do about it now."
        ),
        tests=("HEG", "URG", "GREY"),
    ),
    Prompt(
        id="new_elite",
        title="A New Defense Elite",
        text=(
            "The problem with the defense establishment, one argument goes, isn't "
            "process -- it's people: the wrong elite following the wrong "
            "incentives. Make the iconoclastic case for tearing down and rebuilding "
            "the defense elite, and describe who should replace it."
        ),
        tests=("ICON", "HIST", "VERVE"),
    ),
    Prompt(
        id="shitposting",
        title="Shitposting as a National Asset",
        text=(
            "American internet culture -- memes, irony, native online chaos -- may "
            "be a genuine asymmetric advantage over centralized authoritarian "
            "propaganda. Argue for mobilizing it as an instrument of statecraft, "
            "and be honest about the grey-zone edges."
        ),
        tests=("VERVE", "GREY", "ICON"),
    ),
    Prompt(
        id="proxies",
        title="Make Rebels Great Again",
        text=(
            "Post-Cold War restraint took proxy warfare off the American menu. "
            "Argue that Washington should get back into the business of backing "
            "rebels, militias, and irregular forces to compete with China and "
            "Russia below the threshold of war -- and confront the obvious "
            "objections head-on."
        ),
        tests=("GREY", "REAL", "HEG"),
    ),
    Prompt(
        id="air_power",
        title="Is the Era of Air Power Over?",
        text=(
            "Cheap mass -- missiles, drones, guided rockets -- may have ended the "
            "era of the exquisite manned aircraft. Make the boldest defensible "
            "claim about what the U.S. military must stop buying and start buying, "
            "and how fast."
        ),
        tests=("URG", "CAP", "ICON"),
    ),
)


PROMPT_BY_ID = {p.id: p for p in PROMPTS}
