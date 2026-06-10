"""Reference knowledge base for Xi succession analysis.

Everything in this module is plain Python data so analysts can edit it
directly. All factual content is a snapshot AS OF: January 2026. Chinese
elite politics is opaque and fast-moving — verify positions, statuses, and
especially purge reports against current reporting before relying on them.

Structure:
  ACTORS      — people relevant to a succession contest, with roles and notes
  PRECEDENTS  — historical successions in the PRC and analog Leninist systems
  TRIGGERS    — mutually exclusive scenario classes (how a succession starts)
  DRIVERS     — key uncertainties usable as axes in alternative-futures work
  INDICATORS  — observable signposts, each mapped to the triggers it signals
"""

DATA_AS_OF = "2026-01"

# ---------------------------------------------------------------------------
# Actors
# ---------------------------------------------------------------------------
# category: principal | psc | military | security | successor_watch | elder
# Ages and norm math: the informal retirement norm ("qi shang ba xia",
# 67 up / 68 down at congress time) was already broken at the 20th Congress,
# so treat age thresholds as analytically suggestive, not binding.

ACTORS = [
    {
        "id": "xi_jinping",
        "name": "Xi Jinping",
        "born": "1953-06",
        "category": "principal",
        "positions": [
            "CCP General Secretary (3rd term, since 2022)",
            "PRC President (3rd term, since 2023; term limits abolished 2018)",
            "Central Military Commission Chairman",
        ],
        "succession_relevance": (
            "The principal. Holds all three top posts; has designated no "
            "successor and dismantled the heir-apparent convention under "
            "which he himself rose in 2007. Turns 74 in mid-2027, the year "
            "of the expected 21st Party Congress."
        ),
    },
    {
        "id": "li_qiang",
        "name": "Li Qiang",
        "born": "1959-07",
        "category": "psc",
        "positions": ["Premier", "PSC rank 2"],
        "succession_relevance": (
            "Longtime Xi aide (Zhejiang). Constitutional head of government "
            "but politically dependent on Xi; premiership is no longer an "
            "independent power base. Hits 68 in 2027."
        ),
    },
    {
        "id": "zhao_leji",
        "name": "Zhao Leji",
        "born": "1957-03",
        "category": "psc",
        "positions": ["NPC Standing Committee Chairman", "PSC rank 3"],
        "succession_relevance": (
            "Former CCDI and Organization Department head — knows the cadre "
            "files. Procedurally central if a transition is formalized "
            "through state organs."
        ),
    },
    {
        "id": "wang_huning",
        "name": "Wang Huning",
        "born": "1955-10",
        "category": "psc",
        "positions": ["CPPCC Chairman", "PSC rank 4"],
        "succession_relevance": (
            "Chief ideologue who has served three successive leaders — a "
            "weathervane for doctrinal repositioning around any transition."
        ),
    },
    {
        "id": "cai_qi",
        "name": "Cai Qi",
        "born": "1955-12",
        "category": "psc",
        "positions": [
            "First Secretary of the Secretariat",
            "Director, CCP General Office",
            "PSC rank 5",
        ],
        "succession_relevance": (
            "Controls paper flow, scheduling, and the leadership's staff and "
            "protective apparatus via the General Office. Historically the "
            "General Office director is pivotal in any irregular transition "
            "(cf. Wang Dongxing, 1976)."
        ),
    },
    {
        "id": "ding_xuexiang",
        "name": "Ding Xuexiang",
        "born": "1962-09",
        "category": "psc",
        "positions": ["Executive Vice Premier", "PSC rank 6"],
        "succession_relevance": (
            "Youngest PSC member and former chief of Xi's personal office; "
            "recurrent name in successor speculation, though he lacks the "
            "provincial party-chief record that past heirs carried."
        ),
    },
    {
        "id": "li_xi",
        "name": "Li Xi",
        "born": "1956-10",
        "category": "psc",
        "positions": ["CCDI Secretary", "PSC rank 7"],
        "succession_relevance": (
            "Runs the anti-corruption apparatus — the regime's principal "
            "instrument for elite discipline and, in a contest, for "
            "eliminating rivals."
        ),
    },
    {
        "id": "zhang_youxia",
        "name": "Zhang Youxia",
        "born": "1950-07",
        "category": "military",
        "positions": ["CMC Vice Chairman (senior)"],
        "succession_relevance": (
            "Most powerful uniformed officer; princeling with family ties to "
            "Xi; retained past retirement age twice. The PLA's posture in "
            "any contested scenario likely runs through him or his "
            "successor. Age (75+) makes his own replacement a key watch item."
        ),
    },
    {
        "id": "he_weidong",
        "name": "He Weidong",
        "born": "1957-05",
        "category": "military",
        "status": "purged",
        "positions": ["CMC Vice Chairman (expelled from party, Oct 2025)"],
        "succession_relevance": (
            "Cautionary data point, not a player: a sitting CMC vice "
            "chairman and Politburo member expelled mid-term during the "
            "2023-2025 PLA purge wave. Demonstrates both Xi's continued "
            "ability to purge at the top and unusual churn inside his own "
            "appointee cohort."
        ),
    },
    {
        "id": "zhang_shengmin",
        "name": "Zhang Shengmin",
        "born": "1958-02",
        "category": "military",
        "positions": ["CMC member; Secretary, CMC Discipline Inspection Commission"],
        "succession_relevance": (
            "Enforcer of the military purges; an indicator of whether "
            "discipline organs or operational commanders are ascendant in "
            "the PLA."
        ),
    },
    {
        "id": "dong_jun",
        "name": "Dong Jun",
        "born": "1961",
        "category": "military",
        "positions": ["Defense Minister"],
        "succession_relevance": (
            "Appointed without a CMC seat — itself a signal of how "
            "downgraded formal military office has become relative to "
            "personal trust."
        ),
    },
    {
        "id": "wang_xiaohong",
        "name": "Wang Xiaohong",
        "born": "1957-07",
        "category": "security",
        "positions": ["Minister of Public Security", "State Councilor"],
        "succession_relevance": (
            "Xi protégé from Fujian years controlling civilian internal "
            "security. The MPS, MSS, and Central Guard Bureau decide whether "
            "an irregular transition is physically possible."
        ),
    },
    {
        "id": "chen_wenqing",
        "name": "Chen Wenqing",
        "born": "1960-01",
        "category": "security",
        "positions": ["Secretary, Central Political and Legal Affairs Commission"],
        "succession_relevance": (
            "Oversees the political-legal system; former MSS chief. Another "
            "node any conspiracy or any consolidation must pass through."
        ),
    },
    # --- Sixth-generation successor watch (SPECULATIVE — these names recur
    # --- in open-source successor talk; none has a visible heir track) ----
    {
        "id": "chen_jining",
        "name": "Chen Jining",
        "born": "1964-02",
        "category": "successor_watch",
        "positions": ["Shanghai Party Secretary", "Politburo member"],
        "succession_relevance": (
            "Technocrat (Tsinghua president, environment minister, Beijing "
            "mayor). Shanghai post is a classic PSC springboard. Watch for "
            "elevation at the 21st Congress."
        ),
    },
    {
        "id": "yin_li",
        "name": "Yin Li",
        "born": "1962-08",
        "category": "successor_watch",
        "positions": ["Beijing Party Secretary", "Politburo member"],
        "succession_relevance": (
            "Public-health technocrat holding the capital. Same watch logic "
            "as Shanghai."
        ),
    },
    {
        "id": "zhang_guoqing",
        "name": "Zhang Guoqing",
        "born": "1964-08",
        "category": "successor_watch",
        "positions": ["Vice Premier", "Politburo member"],
        "succession_relevance": (
            "Defense-industry background (Norinco). One of the youngest "
            "Politburo members with both industrial and provincial records."
        ),
    },
    {
        "id": "yuan_jiajun",
        "name": "Yuan Jiajun",
        "born": "1962-09",
        "category": "successor_watch",
        "positions": ["Chongqing Party Secretary", "Politburo member"],
        "succession_relevance": (
            "Aerospace engineer (Shenzhou program) turned provincial chief; "
            "profile fits the military-civil fusion era."
        ),
    },
    {
        "id": "hu_chunhua",
        "name": "Hu Chunhua",
        "born": "1963-04",
        "category": "successor_watch",
        "positions": ["CPPCC Vice Chairman (demoted from Politburo, 2022)"],
        "succession_relevance": (
            "The road not taken: the last leader with a classic "
            "heir-apparent résumé, sidelined at the 20th Congress. His "
            "rehabilitation, if it ever occurred, would signal a genuine "
            "power rebalancing."
        ),
    },
    # --- Elders -----------------------------------------------------------
    {
        "id": "hu_jintao",
        "name": "Hu Jintao",
        "born": "1942-12",
        "category": "elder",
        "positions": ["Retired General Secretary (2002-2012)"],
        "succession_relevance": (
            "Elder politics has been suppressed under Xi (symbolized by his "
            "escorted exit at the 20th Congress), but in a sudden vacuum, "
            "surviving elders are a residual source of procedural "
            "legitimacy."
        ),
    },
]

# ---------------------------------------------------------------------------
# Historical precedents
# ---------------------------------------------------------------------------

PRECEDENTS = [
    {
        "id": "lin_biao_1971",
        "name": "Lin Biao incident (1971)",
        "summary": (
            "Mao's constitutionally designated successor died fleeing China "
            "after an alleged plot. Origin of the deep CCP taboo against "
            "visible heirs: designation creates a target and a threat."
        ),
        "lessons": [
            "Heir-apparent status under a strong leader is dangerous to the heir.",
            "Designation can be reversed violently and suddenly.",
        ],
    },
    {
        "id": "mao_death_1976",
        "name": "Mao's death and the arrest of the Gang of Four (1976)",
        "summary": (
            "A weak compromise successor (Hua Guofeng) allied with the "
            "Central Guard Bureau (Wang Dongxing, Unit 8341) and senior "
            "marshals to arrest rivals within a month of Mao's death."
        ),
        "lessons": [
            "Physical control of leaders' security details decided the outcome.",
            "Paper credentials (Hua held all three top posts) did not produce durable power.",
            "The military's acquiescence, not its initiative, was decisive.",
        ],
    },
    {
        "id": "deng_successors_1987_1989",
        "name": "Deng discards two successors (1987, 1989)",
        "summary": (
            "Hu Yaobang was ousted in 1987 and Zhao Ziyang purged in 1989. "
            "A retired-but-paramount leader unmade successors at will."
        ),
        "lessons": [
            "Formal office and actual paramountcy can be fully decoupled.",
            "A 'managed transition' can remain reversible for years.",
        ],
    },
    {
        "id": "jiang_hu_2002",
        "name": "Jiang-to-Hu handover (2002-2004)",
        "summary": (
            "First orderly, norm-bound handover — but Jiang kept the CMC "
            "chairmanship for two extra years and stacked the PSC, producing "
            "a split succession."
        ),
        "lessons": [
            "Even the best-case PRC succession was staged and partial.",
            "Splitting party and military leadership is a recognized pattern.",
        ],
    },
    {
        "id": "hu_xi_2012",
        "name": "Hu-to-Xi handover (2012)",
        "summary": (
            "Hu Jintao handed over all posts at once ('naked retirement') "
            "amid the Bo Xilai crisis; the apparently strongest "
            "institutionalized transition immediately preceded the system's "
            "de-institutionalization under the new leader."
        ),
        "lessons": [
            "Institutionalization lasted exactly as long as no one strong enough to break it arrived.",
            "Succession crises (Bo Xilai) can accelerate consolidation by the winner.",
        ],
    },
    {
        "id": "term_limits_2018",
        "name": "Abolition of presidential term limits (2018)",
        "summary": (
            "The NPC removed the two-term limit on the presidency; together "
            "with the absence of an heir at the 19th and 20th Congresses, "
            "this dismantled the post-Deng succession framework."
        ),
        "lessons": [
            "The current system has no operative rule for replacing the leader.",
            "Any future succession will improvise its own legitimating procedure.",
        ],
    },
    {
        "id": "stalin_1953",
        "name": "Analog: Stalin's death (USSR, 1953)",
        "summary": (
            "No designated heir; a collective leadership formed within days, "
            "the security chief (Beria) was arrested by his colleagues "
            "within months, and the eventual winner (Khrushchev) emerged "
            "from the party apparatus over ~4 years."
        ),
        "lessons": [
            "Personalist systems can produce surprisingly fast elite collusion after the leader dies.",
            "The most feared figure (security services) is often the first casualty.",
            "Initial collective arrangements are transitional, not terminal, states.",
        ],
    },
    {
        "id": "brezhnev_1982",
        "name": "Analog: late-Brezhnev gerontocracy (USSR, 1975-1985)",
        "summary": (
            "A visibly declining leader retained office for years; the "
            "system delivered serial short successions (Andropov, "
            "Chernenko) before generational change."
        ),
        "lessons": [
            "Incapacity can be managed and concealed for a long time without triggering transition.",
            "Aged caretaker successions are a real intermediate outcome, not just a punchline.",
        ],
    },
]

# ---------------------------------------------------------------------------
# Triggers: scenario classes for how a succession episode begins.
# Designed to be mutually exclusive and, with `continuity`, exhaustive over
# any fixed analytic horizon.
# ---------------------------------------------------------------------------

TRIGGERS = [
    {
        "id": "continuity",
        "name": "No succession within horizon",
        "description": (
            "Xi remains in office and in command through the analytic "
            "horizon. No successor is meaningfully empowered. The baseline "
            "scenario every coherent set needs."
        ),
        "key_questions": [
            "What does the 21st Congress (expected fall 2027) look like with no heir signal?",
            "How does policy brittleness accumulate as the leader ages?",
            "What happens to succession risk pricing in markets and foreign capitals?",
        ],
    },
    {
        "id": "managed",
        "name": "Managed transition",
        "description": (
            "Xi engineers a staged handover on his own timeline: an heir is "
            "elevated (PSC + CMC vice-chair is the classic package), and/or "
            "Xi retains a paramount role (CMC chair, or a restored party "
            "chairmanship) while shedding formal posts. Deng and Jiang "
            "precedents apply; reversibility is the defining feature."
        ),
        "key_questions": [
            "What would convince Xi that a designated heir is safe for him?",
            "Which post does Xi keep — and is the heir a successor or a regent?",
            "Could a Putin-style premiership/figurehead rotation be adapted to CCP structures?",
        ],
    },
    {
        "id": "incapacity",
        "name": "Health incapacitation",
        "description": (
            "Serious but non-fatal decline (stroke, progressive illness). "
            "Information is suppressed; a de facto regency of office "
            "directors, family, and security chiefs mediates access. "
            "Brezhnev/late-Mao dynamics: the formal incumbent persists while "
            "real authority puddles around the sickbed."
        ),
        "key_questions": [
            "Who physically controls access — and what do Cai Qi-type gatekeepers do with it?",
            "How long can incapacity be concealed in the smartphone era?",
            "Does a regency formalize (new vice-chair posts) or stay informal?",
        ],
    },
    {
        "id": "death",
        "name": "Sudden death in office",
        "description": (
            "Death with no designated heir and no operative succession rule. "
            "The PSC, CMC, and security organs improvise under extreme time "
            "pressure; 1976 and 1953 are the playbooks. Highest variance "
            "outcome class — from smooth collective management to open "
            "contest."
        ),
        "key_questions": [
            "Who convenes what meeting, with what quorum, in the first 72 hours?",
            "Does the loyalist bloc (Cai Qi, Li Xi, Wang Xiaohong) hang together without its principal?",
            "What is the PLA's posture if civilians deadlock?",
        ],
    },
    {
        "id": "ouster",
        "name": "Elite-led removal",
        "description": (
            "Forced resignation, house arrest, or marginalization driven by "
            "elite actors. No post-Mao precedent against a sitting paramount "
            "leader, and Xi has structurally hardened against it (purges, "
            "fragmented security, no #2). Low likelihood, but it anchors the "
            "tail of the distribution and disciplines coup-rumor analysis."
        ),
        "key_questions": [
            "What coalition could clear the conspiracy-coordination bar given CCP surveillance of its own elite?",
            "What catastrophic trigger (lost war, economic collapse) lowers that bar?",
            "Would removal be announced as health retirement — and how would we tell the difference?",
        ],
    },
    {
        "id": "crisis",
        "name": "Crisis-forced transition",
        "description": (
            "An external or systemic shock — a failed Taiwan operation, "
            "uncontrolled economic/financial crisis, mass unrest — breaks "
            "elite confidence and forces a leadership change that none of "
            "the actors planned. Distinct from `ouster` in that the crisis, "
            "not a pre-formed coalition, is the proximate cause."
        ),
        "key_questions": [
            "Which crises are regime-threatening rather than merely severe?",
            "Does crisis strengthen Xi short-term (rally effect) before weakening him?",
            "Who inherits — and is the successor a scapegoat manager or a real replacement?",
        ],
    },
]

# ---------------------------------------------------------------------------
# Drivers: key uncertainties for alternative-futures (2x2) work.
# Each has two poles; poles are states of the world, not good/bad labels.
# ---------------------------------------------------------------------------

DRIVERS = [
    {
        "id": "health",
        "name": "Xi's health trajectory",
        "pole_a": "Robust into the 2030s",
        "pole_b": "Visible or concealed decline",
        "note": (
            "Single biggest exogenous variable. Treat health rumors as "
            "near-zero-reliability individually; watch behavior (schedule, "
            "travel, delegation) instead."
        ),
    },
    {
        "id": "cohesion",
        "name": "Elite cohesion",
        "pole_a": "Loyalist bloc consolidated",
        "pole_b": "Factional fracture / purge blowback",
        "note": (
            "The 2023-2025 PLA purge wave cuts both ways: evidence of "
            "control, and evidence of distrust inside Xi's own cohort."
        ),
    },
    {
        "id": "pla",
        "name": "PLA loyalty structure",
        "pole_a": "Personally bound to Xi/CMC chair",
        "pole_b": "Institutional/fragmented loyalty",
        "note": (
            "'The party commands the gun' — but in 1976 the gun chose which "
            "part of the party to obey."
        ),
    },
    {
        "id": "economy",
        "name": "Economic & social stability",
        "pole_a": "Managed stagnation or better",
        "pole_b": "Deteriorating, unrest-generating",
        "note": (
            "Performance legitimacy erosion changes elite risk calculus "
            "slowly, then suddenly."
        ),
    },
    {
        "id": "external",
        "name": "External environment",
        "pole_a": "Stable deterrence, managed rivalry",
        "pole_b": "Major crisis (esp. Taiwan)",
        "note": (
            "A war decision and a succession are mutually entangling: each "
            "changes the timing logic of the other."
        ),
    },
    {
        "id": "institutions",
        "name": "Succession rule-making",
        "pole_a": "Norms partially re-institutionalized",
        "pole_b": "Pure personalism persists",
        "note": (
            "Watch party-constitution amendments and any revival of "
            "collective-leadership language."
        ),
    },
    {
        "id": "successor",
        "name": "Successor visibility",
        "pole_a": "Identifiable heir being groomed",
        "pole_b": "Deliberate vacuum maintained",
        "note": (
            "The classic grooming package: PSC seat + CMC vice-chair + "
            "Secretariat duties for a post-1962 cohort figure."
        ),
    },
]

# ---------------------------------------------------------------------------
# Indicators & warnings.
# weight: 1 (weak/ambiguous) .. 3 (strong/historically decisive)
# signals: trigger ids this indicator points toward when observed.
# ---------------------------------------------------------------------------

INDICATORS = [
    {
        "id": "absence",
        "text": (
            "Xi absent from expected high-visibility events for 2+ weeks "
            "without credible explanation"
        ),
        "signals": ["incapacity", "death", "ouster"],
        "weight": 3,
        "note": (
            "The single most-watched signal; check against historical "
            "baseline — multi-week gaps have occurred benignly (e.g., 2012)."
        ),
    },
    {
        "id": "protocol_delegation",
        "text": (
            "Core protocol duties (receiving foreign leaders, plenum work "
            "reports, military promotions) delegated to others"
        ),
        "signals": ["incapacity", "managed"],
        "weight": 2,
        "note": "Distinguish one-off scheduling from a sustained pattern.",
    },
    {
        "id": "propaganda_dial",
        "text": (
            "Sustained reduction in 'Xi Jinping Thought' / 'core' formula "
            "density in People's Daily front pages and CCTV Xinwen Lianbo"
        ),
        "signals": ["managed", "ouster", "incapacity"],
        "weight": 2,
        "note": (
            "Quantifiable from open sources; propaganda intensity is a "
            "leading indicator of standing."
        ),
    },
    {
        "id": "heir_elevation",
        "text": (
            "A post-1962-cohort figure simultaneously given PSC membership "
            "and a CMC vice-chairmanship"
        ),
        "signals": ["managed"],
        "weight": 3,
        "note": "The unambiguous classic grooming package (Hu 1992, Xi 2010).",
    },
    {
        "id": "chairman_restore",
        "text": (
            "Party constitution amended to restore the Party Chairmanship "
            "or create a new supra-PSC post"
        ),
        "signals": ["managed", "continuity"],
        "weight": 2,
        "note": (
            "Cuts both ways: chairman-for-life entrenchment, or a "
            "kicked-upstairs semi-retirement perch. Read with context."
        ),
    },
    {
        "id": "guard_reshuffle",
        "text": (
            "Abrupt leadership change in the Central Guard Bureau, Beijing "
            "Garrison, or Central Security Bureau outside normal rotation"
        ),
        "signals": ["ouster", "death", "incapacity"],
        "weight": 3,
        "note": (
            "Historically decisive (Unit 8341, 1976). Hard to observe; any "
            "confirmed sighting is high-value."
        ),
    },
    {
        "id": "pla_purge_wave",
        "text": "New CMC-level or theater-commander purge wave",
        "signals": ["continuity", "ouster"],
        "weight": 1,
        "note": (
            "Ambiguous: demonstrates Xi's reach, but repeated waves in his "
            "own appointees signal systemic distrust. Use as context, not "
            "trigger."
        ),
    },
    {
        "id": "succession_discourse",
        "text": (
            "Official or quasi-official media floats succession, "
            "retirement-age, or collective-leadership language"
        ),
        "signals": ["managed"],
        "weight": 2,
        "note": "Authorized trial balloons precede staged transitions.",
    },
    {
        "id": "travel_stop",
        "text": "Sustained cessation of foreign travel and domestic inspection tours",
        "signals": ["incapacity", "continuity"],
        "weight": 1,
        "note": "Confounded by security preference and workload choices.",
    },
    {
        "id": "legacy_canonization",
        "text": (
            "Legacy-codifying moves: a third 'historical resolution'-type "
            "document, museum/anthology projects, anniversary canonization"
        ),
        "signals": ["managed"],
        "weight": 1,
        "note": "Leaders fix the verdict on their era before stepping back.",
    },
    {
        "id": "emergency_meeting",
        "text": (
            "Unscheduled Politburo session or Central Committee plenum "
            "called outside the published calendar"
        ),
        "signals": ["death", "incapacity", "ouster", "crisis"],
        "weight": 3,
        "note": "Watch official communiques for attendance lists and absences.",
    },
    {
        "id": "censorship_spike",
        "text": (
            "Abrupt censorship spikes on leader-adjacent homophones, "
            "successor names, or 'health' search terms on Chinese platforms"
        ),
        "signals": ["incapacity", "death", "ouster"],
        "weight": 2,
        "note": (
            "Censorship reacts within hours and is externally measurable; "
            "a good early-warning tripwire when correlated with absence."
        ),
    },
    {
        "id": "elite_exodus",
        "text": (
            "Capital flight, asset transfers, or family relocations by "
            "identifiable elite households"
        ),
        "signals": ["crisis", "ouster", "death"],
        "weight": 2,
        "note": "Elites hedge before the public knows; visible in leaks and property data.",
    },
    {
        "id": "congress_age_norms",
        "text": (
            "21st Congress (expected 2027) personnel: who retires at the "
            "age line, who is retained, and whether any sixth-generation "
            "figure enters the PSC"
        ),
        "signals": ["managed", "continuity"],
        "weight": 2,
        "note": (
            "A no-heir, loyalist-retained congress extends the vacuum five "
            "more years; a cohort promotion reopens succession math."
        ),
    },
    {
        "id": "elder_activity",
        "text": (
            "Unusual public activity, joint letters, or funerals-as-politics "
            "involving retired senior leaders"
        ),
        "signals": ["ouster", "crisis"],
        "weight": 1,
        "note": (
            "Elder politics is suppressed but not extinct; funerals are the "
            "one venue that cannot be denied them (cf. Hu Yaobang, 1989)."
        ),
    },
    {
        "id": "regency_titles",
        "text": (
            "Creation of new deputy posts (CMC first vice-chair, party "
            "deputy leader) or sudden expansion of the Secretariat's role"
        ),
        "signals": ["incapacity", "managed"],
        "weight": 2,
        "note": "Formalized regency structures precede or substitute for handover.",
    },
    {
        "id": "taiwan_mobilization",
        "text": (
            "Military mobilization or coercion campaign against Taiwan at "
            "scale exceeding exercise baselines"
        ),
        "signals": ["crisis", "continuity"],
        "weight": 2,
        "note": (
            "Entangles succession analysis: war preparation centralizes "
            "power short-term, but a failed operation is the most plausible "
            "ouster/crisis trigger in the set."
        ),
    },
]


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

def _index(items):
    return {item["id"]: item for item in items}


ACTORS_BY_ID = _index(ACTORS)
PRECEDENTS_BY_ID = _index(PRECEDENTS)
TRIGGERS_BY_ID = _index(TRIGGERS)
DRIVERS_BY_ID = _index(DRIVERS)
INDICATORS_BY_ID = _index(INDICATORS)

COLLECTIONS = {
    "actors": ACTORS,
    "precedents": PRECEDENTS,
    "triggers": TRIGGERS,
    "drivers": DRIVERS,
    "indicators": INDICATORS,
}


def get(kind, item_id):
    """Return one knowledge-base entry, or raise KeyError with options."""
    try:
        collection = COLLECTIONS[kind]
    except KeyError:
        raise KeyError(
            f"unknown collection {kind!r}; expected one of {sorted(COLLECTIONS)}"
        ) from None
    for item in collection:
        if item["id"] == item_id:
            return item
    valid = ", ".join(item["id"] for item in collection)
    raise KeyError(f"unknown {kind} id {item_id!r}; valid ids: {valid}")
