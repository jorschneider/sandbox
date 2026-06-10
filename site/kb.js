const KB = {
  "data_as_of": "2026-01",
  "triggers": [
    {
      "id": "continuity",
      "name": "No succession within horizon",
      "description": "Xi remains in office and in command through the analytic horizon. No successor is meaningfully empowered. The baseline scenario every coherent set needs.",
      "key_questions": [
        "What does the 21st Congress (expected fall 2027) look like with no heir signal?",
        "How does policy brittleness accumulate as the leader ages?",
        "What happens to succession risk pricing in markets and foreign capitals?"
      ]
    },
    {
      "id": "managed",
      "name": "Managed transition",
      "description": "Xi engineers a staged handover on his own timeline: an heir is elevated (PSC + CMC vice-chair is the classic package), and/or Xi retains a paramount role (CMC chair, or a restored party chairmanship) while shedding formal posts. Deng and Jiang precedents apply; reversibility is the defining feature.",
      "key_questions": [
        "What would convince Xi that a designated heir is safe for him?",
        "Which post does Xi keep — and is the heir a successor or a regent?",
        "Could a Putin-style premiership/figurehead rotation be adapted to CCP structures?"
      ]
    },
    {
      "id": "incapacity",
      "name": "Health incapacitation",
      "description": "Serious but non-fatal decline (stroke, progressive illness). Information is suppressed; a de facto regency of office directors, family, and security chiefs mediates access. Brezhnev/late-Mao dynamics: the formal incumbent persists while real authority puddles around the sickbed.",
      "key_questions": [
        "Who physically controls access — and what do Cai Qi-type gatekeepers do with it?",
        "How long can incapacity be concealed in the smartphone era?",
        "Does a regency formalize (new vice-chair posts) or stay informal?"
      ]
    },
    {
      "id": "death",
      "name": "Sudden death in office",
      "description": "Death with no designated heir and no operative succession rule. The PSC, CMC, and security organs improvise under extreme time pressure; 1976 and 1953 are the playbooks. Highest variance outcome class — from smooth collective management to open contest.",
      "key_questions": [
        "Who convenes what meeting, with what quorum, in the first 72 hours?",
        "Does the loyalist bloc (Cai Qi, Li Xi, Wang Xiaohong) hang together without its principal?",
        "What is the PLA's posture if civilians deadlock?"
      ]
    },
    {
      "id": "ouster",
      "name": "Elite-led removal",
      "description": "Forced resignation, house arrest, or marginalization driven by elite actors. No post-Mao precedent against a sitting paramount leader, and Xi has structurally hardened against it (purges, fragmented security, no #2). Low likelihood, but it anchors the tail of the distribution and disciplines coup-rumor analysis.",
      "key_questions": [
        "What coalition could clear the conspiracy-coordination bar given CCP surveillance of its own elite?",
        "What catastrophic trigger (lost war, economic collapse) lowers that bar?",
        "Would removal be announced as health retirement — and how would we tell the difference?"
      ]
    },
    {
      "id": "crisis",
      "name": "Crisis-forced transition",
      "description": "An external or systemic shock — a failed Taiwan operation, uncontrolled economic/financial crisis, mass unrest — breaks elite confidence and forces a leadership change that none of the actors planned. Distinct from `ouster` in that the crisis, not a pre-formed coalition, is the proximate cause.",
      "key_questions": [
        "Which crises are regime-threatening rather than merely severe?",
        "Does crisis strengthen Xi short-term (rally effect) before weakening him?",
        "Who inherits — and is the successor a scapegoat manager or a real replacement?"
      ]
    }
  ],
  "drivers": [
    {
      "id": "health",
      "name": "Xi's health trajectory",
      "pole_a": "Robust into the 2030s",
      "pole_b": "Visible or concealed decline",
      "note": "Single biggest exogenous variable. Treat health rumors as near-zero-reliability individually; watch behavior (schedule, travel, delegation) instead."
    },
    {
      "id": "cohesion",
      "name": "Elite cohesion",
      "pole_a": "Loyalist bloc consolidated",
      "pole_b": "Factional fracture / purge blowback",
      "note": "The 2023-2025 PLA purge wave cuts both ways: evidence of control, and evidence of distrust inside Xi's own cohort."
    },
    {
      "id": "pla",
      "name": "PLA loyalty structure",
      "pole_a": "Personally bound to Xi/CMC chair",
      "pole_b": "Institutional/fragmented loyalty",
      "note": "'The party commands the gun' — but in 1976 the gun chose which part of the party to obey."
    },
    {
      "id": "economy",
      "name": "Economic & social stability",
      "pole_a": "Managed stagnation or better",
      "pole_b": "Deteriorating, unrest-generating",
      "note": "Performance legitimacy erosion changes elite risk calculus slowly, then suddenly."
    },
    {
      "id": "external",
      "name": "External environment",
      "pole_a": "Stable deterrence, managed rivalry",
      "pole_b": "Major crisis (esp. Taiwan)",
      "note": "A war decision and a succession are mutually entangling: each changes the timing logic of the other."
    },
    {
      "id": "institutions",
      "name": "Succession rule-making",
      "pole_a": "Norms partially re-institutionalized",
      "pole_b": "Pure personalism persists",
      "note": "Watch party-constitution amendments and any revival of collective-leadership language."
    },
    {
      "id": "successor",
      "name": "Successor visibility",
      "pole_a": "Identifiable heir being groomed",
      "pole_b": "Deliberate vacuum maintained",
      "note": "The classic grooming package: PSC seat + CMC vice-chair + Secretariat duties for a post-1962 cohort figure."
    }
  ],
  "indicators": [
    {
      "id": "absence",
      "text": "Xi absent from expected high-visibility events for 2+ weeks without credible explanation",
      "signals": [
        "incapacity",
        "death",
        "ouster"
      ],
      "weight": 3,
      "note": "The single most-watched signal; check against historical baseline — multi-week gaps have occurred benignly (e.g., 2012)."
    },
    {
      "id": "protocol_delegation",
      "text": "Core protocol duties (receiving foreign leaders, plenum work reports, military promotions) delegated to others",
      "signals": [
        "incapacity",
        "managed"
      ],
      "weight": 2,
      "note": "Distinguish one-off scheduling from a sustained pattern."
    },
    {
      "id": "propaganda_dial",
      "text": "Sustained reduction in 'Xi Jinping Thought' / 'core' formula density in People's Daily front pages and CCTV Xinwen Lianbo",
      "signals": [
        "managed",
        "ouster",
        "incapacity"
      ],
      "weight": 2,
      "note": "Quantifiable from open sources; propaganda intensity is a leading indicator of standing."
    },
    {
      "id": "heir_elevation",
      "text": "A post-1962-cohort figure simultaneously given PSC membership and a CMC vice-chairmanship",
      "signals": [
        "managed"
      ],
      "weight": 3,
      "note": "The unambiguous classic grooming package (Hu 1992, Xi 2010)."
    },
    {
      "id": "chairman_restore",
      "text": "Party constitution amended to restore the Party Chairmanship or create a new supra-PSC post",
      "signals": [
        "managed",
        "continuity"
      ],
      "weight": 2,
      "note": "Cuts both ways: chairman-for-life entrenchment, or a kicked-upstairs semi-retirement perch. Read with context."
    },
    {
      "id": "guard_reshuffle",
      "text": "Abrupt leadership change in the Central Guard Bureau, Beijing Garrison, or Central Security Bureau outside normal rotation",
      "signals": [
        "ouster",
        "death",
        "incapacity"
      ],
      "weight": 3,
      "note": "Historically decisive (Unit 8341, 1976). Hard to observe; any confirmed sighting is high-value."
    },
    {
      "id": "pla_purge_wave",
      "text": "New CMC-level or theater-commander purge wave",
      "signals": [
        "continuity",
        "ouster"
      ],
      "weight": 1,
      "note": "Ambiguous: demonstrates Xi's reach, but repeated waves in his own appointees signal systemic distrust. Use as context, not trigger."
    },
    {
      "id": "succession_discourse",
      "text": "Official or quasi-official media floats succession, retirement-age, or collective-leadership language",
      "signals": [
        "managed"
      ],
      "weight": 2,
      "note": "Authorized trial balloons precede staged transitions."
    },
    {
      "id": "travel_stop",
      "text": "Sustained cessation of foreign travel and domestic inspection tours",
      "signals": [
        "incapacity",
        "continuity"
      ],
      "weight": 1,
      "note": "Confounded by security preference and workload choices."
    },
    {
      "id": "legacy_canonization",
      "text": "Legacy-codifying moves: a third 'historical resolution'-type document, museum/anthology projects, anniversary canonization",
      "signals": [
        "managed"
      ],
      "weight": 1,
      "note": "Leaders fix the verdict on their era before stepping back."
    },
    {
      "id": "emergency_meeting",
      "text": "Unscheduled Politburo session or Central Committee plenum called outside the published calendar",
      "signals": [
        "death",
        "incapacity",
        "ouster",
        "crisis"
      ],
      "weight": 3,
      "note": "Watch official communiques for attendance lists and absences."
    },
    {
      "id": "censorship_spike",
      "text": "Abrupt censorship spikes on leader-adjacent homophones, successor names, or 'health' search terms on Chinese platforms",
      "signals": [
        "incapacity",
        "death",
        "ouster"
      ],
      "weight": 2,
      "note": "Censorship reacts within hours and is externally measurable; a good early-warning tripwire when correlated with absence."
    },
    {
      "id": "elite_exodus",
      "text": "Capital flight, asset transfers, or family relocations by identifiable elite households",
      "signals": [
        "crisis",
        "ouster",
        "death"
      ],
      "weight": 2,
      "note": "Elites hedge before the public knows; visible in leaks and property data."
    },
    {
      "id": "congress_age_norms",
      "text": "21st Congress (expected 2027) personnel: who retires at the age line, who is retained, and whether any sixth-generation figure enters the PSC",
      "signals": [
        "managed",
        "continuity"
      ],
      "weight": 2,
      "note": "A no-heir, loyalist-retained congress extends the vacuum five more years; a cohort promotion reopens succession math."
    },
    {
      "id": "elder_activity",
      "text": "Unusual public activity, joint letters, or funerals-as-politics involving retired senior leaders",
      "signals": [
        "ouster",
        "crisis"
      ],
      "weight": 1,
      "note": "Elder politics is suppressed but not extinct; funerals are the one venue that cannot be denied them (cf. Hu Yaobang, 1989)."
    },
    {
      "id": "regency_titles",
      "text": "Creation of new deputy posts (CMC first vice-chair, party deputy leader) or sudden expansion of the Secretariat's role",
      "signals": [
        "incapacity",
        "managed"
      ],
      "weight": 2,
      "note": "Formalized regency structures precede or substitute for handover."
    },
    {
      "id": "taiwan_mobilization",
      "text": "Military mobilization or coercion campaign against Taiwan at scale exceeding exercise baselines",
      "signals": [
        "crisis",
        "continuity"
      ],
      "weight": 2,
      "note": "Entangles succession analysis: war preparation centralizes power short-term, but a failed operation is the most plausible ouster/crisis trigger in the set."
    }
  ],
  "actors": [
    {
      "id": "xi_jinping",
      "name": "Xi Jinping",
      "born": "1953-06",
      "category": "principal",
      "positions": [
        "CCP General Secretary (3rd term, since 2022)",
        "PRC President (3rd term, since 2023; term limits abolished 2018)",
        "Central Military Commission Chairman"
      ],
      "succession_relevance": "The principal. Holds all three top posts; has designated no successor and dismantled the heir-apparent convention under which he himself rose in 2007. Turns 74 in mid-2027, the year of the expected 21st Party Congress."
    },
    {
      "id": "li_qiang",
      "name": "Li Qiang",
      "born": "1959-07",
      "category": "psc",
      "positions": [
        "Premier",
        "PSC rank 2"
      ],
      "succession_relevance": "Longtime Xi aide (Zhejiang). Constitutional head of government but politically dependent on Xi; premiership is no longer an independent power base. Hits 68 in 2027."
    },
    {
      "id": "zhao_leji",
      "name": "Zhao Leji",
      "born": "1957-03",
      "category": "psc",
      "positions": [
        "NPC Standing Committee Chairman",
        "PSC rank 3"
      ],
      "succession_relevance": "Former CCDI and Organization Department head — knows the cadre files. Procedurally central if a transition is formalized through state organs."
    },
    {
      "id": "wang_huning",
      "name": "Wang Huning",
      "born": "1955-10",
      "category": "psc",
      "positions": [
        "CPPCC Chairman",
        "PSC rank 4"
      ],
      "succession_relevance": "Chief ideologue who has served three successive leaders — a weathervane for doctrinal repositioning around any transition."
    },
    {
      "id": "cai_qi",
      "name": "Cai Qi",
      "born": "1955-12",
      "category": "psc",
      "positions": [
        "First Secretary of the Secretariat",
        "Director, CCP General Office",
        "PSC rank 5"
      ],
      "succession_relevance": "Controls paper flow, scheduling, and the leadership's staff and protective apparatus via the General Office. Historically the General Office director is pivotal in any irregular transition (cf. Wang Dongxing, 1976)."
    },
    {
      "id": "ding_xuexiang",
      "name": "Ding Xuexiang",
      "born": "1962-09",
      "category": "psc",
      "positions": [
        "Executive Vice Premier",
        "PSC rank 6"
      ],
      "succession_relevance": "Youngest PSC member and former chief of Xi's personal office; recurrent name in successor speculation, though he lacks the provincial party-chief record that past heirs carried."
    },
    {
      "id": "li_xi",
      "name": "Li Xi",
      "born": "1956-10",
      "category": "psc",
      "positions": [
        "CCDI Secretary",
        "PSC rank 7"
      ],
      "succession_relevance": "Runs the anti-corruption apparatus — the regime's principal instrument for elite discipline and, in a contest, for eliminating rivals."
    },
    {
      "id": "zhang_youxia",
      "name": "Zhang Youxia",
      "born": "1950-07",
      "category": "military",
      "positions": [
        "CMC Vice Chairman (senior)"
      ],
      "succession_relevance": "Most powerful uniformed officer; princeling with family ties to Xi; retained past retirement age twice. The PLA's posture in any contested scenario likely runs through him or his successor. Age (75+) makes his own replacement a key watch item."
    },
    {
      "id": "he_weidong",
      "name": "He Weidong",
      "born": "1957-05",
      "category": "military",
      "status": "purged",
      "positions": [
        "CMC Vice Chairman (expelled from party, Oct 2025)"
      ],
      "succession_relevance": "Cautionary data point, not a player: a sitting CMC vice chairman and Politburo member expelled mid-term during the 2023-2025 PLA purge wave. Demonstrates both Xi's continued ability to purge at the top and unusual churn inside his own appointee cohort."
    },
    {
      "id": "zhang_shengmin",
      "name": "Zhang Shengmin",
      "born": "1958-02",
      "category": "military",
      "positions": [
        "CMC member; Secretary, CMC Discipline Inspection Commission"
      ],
      "succession_relevance": "Enforcer of the military purges; an indicator of whether discipline organs or operational commanders are ascendant in the PLA."
    },
    {
      "id": "dong_jun",
      "name": "Dong Jun",
      "born": "1961",
      "category": "military",
      "positions": [
        "Defense Minister"
      ],
      "succession_relevance": "Appointed without a CMC seat — itself a signal of how downgraded formal military office has become relative to personal trust."
    },
    {
      "id": "wang_xiaohong",
      "name": "Wang Xiaohong",
      "born": "1957-07",
      "category": "security",
      "positions": [
        "Minister of Public Security",
        "State Councilor"
      ],
      "succession_relevance": "Xi protégé from Fujian years controlling civilian internal security. The MPS, MSS, and Central Guard Bureau decide whether an irregular transition is physically possible."
    },
    {
      "id": "chen_wenqing",
      "name": "Chen Wenqing",
      "born": "1960-01",
      "category": "security",
      "positions": [
        "Secretary, Central Political and Legal Affairs Commission"
      ],
      "succession_relevance": "Oversees the political-legal system; former MSS chief. Another node any conspiracy or any consolidation must pass through."
    },
    {
      "id": "chen_jining",
      "name": "Chen Jining",
      "born": "1964-02",
      "category": "successor_watch",
      "positions": [
        "Shanghai Party Secretary",
        "Politburo member"
      ],
      "succession_relevance": "Technocrat (Tsinghua president, environment minister, Beijing mayor). Shanghai post is a classic PSC springboard. Watch for elevation at the 21st Congress."
    },
    {
      "id": "yin_li",
      "name": "Yin Li",
      "born": "1962-08",
      "category": "successor_watch",
      "positions": [
        "Beijing Party Secretary",
        "Politburo member"
      ],
      "succession_relevance": "Public-health technocrat holding the capital. Same watch logic as Shanghai."
    },
    {
      "id": "zhang_guoqing",
      "name": "Zhang Guoqing",
      "born": "1964-08",
      "category": "successor_watch",
      "positions": [
        "Vice Premier",
        "Politburo member"
      ],
      "succession_relevance": "Defense-industry background (Norinco). One of the youngest Politburo members with both industrial and provincial records."
    },
    {
      "id": "yuan_jiajun",
      "name": "Yuan Jiajun",
      "born": "1962-09",
      "category": "successor_watch",
      "positions": [
        "Chongqing Party Secretary",
        "Politburo member"
      ],
      "succession_relevance": "Aerospace engineer (Shenzhou program) turned provincial chief; profile fits the military-civil fusion era."
    },
    {
      "id": "hu_chunhua",
      "name": "Hu Chunhua",
      "born": "1963-04",
      "category": "successor_watch",
      "positions": [
        "CPPCC Vice Chairman (demoted from Politburo, 2022)"
      ],
      "succession_relevance": "The road not taken: the last leader with a classic heir-apparent résumé, sidelined at the 20th Congress. His rehabilitation, if it ever occurred, would signal a genuine power rebalancing."
    },
    {
      "id": "hu_jintao",
      "name": "Hu Jintao",
      "born": "1942-12",
      "category": "elder",
      "positions": [
        "Retired General Secretary (2002-2012)"
      ],
      "succession_relevance": "Elder politics has been suppressed under Xi (symbolized by his escorted exit at the 20th Congress), but in a sudden vacuum, surviving elders are a residual source of procedural legitimacy."
    }
  ],
  "precedents": [
    {
      "id": "lin_biao_1971",
      "name": "Lin Biao incident (1971)",
      "summary": "Mao's constitutionally designated successor died fleeing China after an alleged plot. Origin of the deep CCP taboo against visible heirs: designation creates a target and a threat.",
      "lessons": [
        "Heir-apparent status under a strong leader is dangerous to the heir.",
        "Designation can be reversed violently and suddenly."
      ]
    },
    {
      "id": "mao_death_1976",
      "name": "Mao's death and the arrest of the Gang of Four (1976)",
      "summary": "A weak compromise successor (Hua Guofeng) allied with the Central Guard Bureau (Wang Dongxing, Unit 8341) and senior marshals to arrest rivals within a month of Mao's death.",
      "lessons": [
        "Physical control of leaders' security details decided the outcome.",
        "Paper credentials (Hua held all three top posts) did not produce durable power.",
        "The military's acquiescence, not its initiative, was decisive."
      ]
    },
    {
      "id": "deng_successors_1987_1989",
      "name": "Deng discards two successors (1987, 1989)",
      "summary": "Hu Yaobang was ousted in 1987 and Zhao Ziyang purged in 1989. A retired-but-paramount leader unmade successors at will.",
      "lessons": [
        "Formal office and actual paramountcy can be fully decoupled.",
        "A 'managed transition' can remain reversible for years."
      ]
    },
    {
      "id": "jiang_hu_2002",
      "name": "Jiang-to-Hu handover (2002-2004)",
      "summary": "First orderly, norm-bound handover — but Jiang kept the CMC chairmanship for two extra years and stacked the PSC, producing a split succession.",
      "lessons": [
        "Even the best-case PRC succession was staged and partial.",
        "Splitting party and military leadership is a recognized pattern."
      ]
    },
    {
      "id": "hu_xi_2012",
      "name": "Hu-to-Xi handover (2012)",
      "summary": "Hu Jintao handed over all posts at once ('naked retirement') amid the Bo Xilai crisis; the apparently strongest institutionalized transition immediately preceded the system's de-institutionalization under the new leader.",
      "lessons": [
        "Institutionalization lasted exactly as long as no one strong enough to break it arrived.",
        "Succession crises (Bo Xilai) can accelerate consolidation by the winner."
      ]
    },
    {
      "id": "term_limits_2018",
      "name": "Abolition of presidential term limits (2018)",
      "summary": "The NPC removed the two-term limit on the presidency; together with the absence of an heir at the 19th and 20th Congresses, this dismantled the post-Deng succession framework.",
      "lessons": [
        "The current system has no operative rule for replacing the leader.",
        "Any future succession will improvise its own legitimating procedure."
      ]
    },
    {
      "id": "stalin_1953",
      "name": "Analog: Stalin's death (USSR, 1953)",
      "summary": "No designated heir; a collective leadership formed within days, the security chief (Beria) was arrested by his colleagues within months, and the eventual winner (Khrushchev) emerged from the party apparatus over ~4 years.",
      "lessons": [
        "Personalist systems can produce surprisingly fast elite collusion after the leader dies.",
        "The most feared figure (security services) is often the first casualty.",
        "Initial collective arrangements are transitional, not terminal, states."
      ]
    },
    {
      "id": "brezhnev_1982",
      "name": "Analog: late-Brezhnev gerontocracy (USSR, 1975-1985)",
      "summary": "A visibly declining leader retained office for years; the system delivered serial short successions (Andropov, Chernenko) before generational change.",
      "lessons": [
        "Incapacity can be managed and concealed for a long time without triggering transition.",
        "Aged caretaker successions are a real intermediate outcome, not just a punchline."
      ]
    }
  ],
  "max_scores": {
    "continuity": 8,
    "managed": 16,
    "incapacity": 18,
    "death": 13,
    "ouster": 17,
    "crisis": 8
  },
  "baseline": {
    "title": "Xi succession baseline scenario set (worked example)",
    "horizon": "through end-2030",
    "exhaustive": true,
    "data_as_of": "2026-01",
    "scenarios": [
      {
        "id": "continuity_baseline",
        "name": "The vacuum holds",
        "trigger": "continuity",
        "summary": "Xi remains General Secretary, President, and CMC Chairman through 2030. The 21st Party Congress (2027) retains the loyalist core, promotes no sixth-generation figure into a credible heir track, and further dilutes age norms. Succession risk is not resolved; it compounds, with policy brittleness and elite hedging slowly increasing.",
        "probability": 0.45,
        "pathway": [
          "21st Congress (fall 2027): Xi takes a fourth term as General Secretary; PSC reshuffle rewards loyalty over cohort renewal.",
          "Propaganda intensity around Xi Jinping Thought is sustained or increased; no successor-grade elevation occurs.",
          "Periodic purge waves continue as the maintenance mechanism of elite discipline.",
          "By decade's end Xi is 77; the system has still produced no rule for replacing him."
        ],
        "key_actors": [
          "xi_jinping",
          "cai_qi",
          "li_xi",
          "zhang_youxia"
        ],
        "indicators": [
          "congress_age_norms",
          "propaganda_dial",
          "pla_purge_wave",
          "legacy_canonization"
        ],
        "assumptions": [
          {
            "text": "Xi's health remains functionally adequate through age 77",
            "confidence": "medium",
            "impact_if_wrong": "high"
          },
          {
            "text": "No external shock severe enough to break elite confidence occurs before 2031",
            "confidence": "medium",
            "impact_if_wrong": "high"
          }
        ],
        "implications": [
          "Warning posture must be sustained for years without event-driven validation — guard against alert fatigue.",
          "Each year of vacuum raises the variance of the eventual transition, whenever it comes."
        ],
        "analyst_notes": "Modal outcome by construction: short horizons favor incumbency in personalist systems."
      },
      {
        "id": "managed_heir_2027",
        "name": "Staged handover begins at the 21st Congress",
        "trigger": "managed",
        "summary": "Xi concludes that a controlled transition on his timeline beats an uncontrolled one on biology's. At or after the 21st Congress, a younger figure receives the classic grooming package (PSC seat, CMC vice-chairmanship, Secretariat duties) while Xi retains the CMC chairmanship or a restored party chairmanship as paramount-leader insurance. The transition is real but reversible — Deng's template, not Hu's.",
        "probability": 0.18,
        "pathway": [
          "Authorized commentary begins normalizing 'orderly succession of the cause' language.",
          "A post-1962 figure is elevated with combined party-military portfolio.",
          "Xi sheds the presidency or premier-facing duties first; core military authority is shed last, if ever.",
          "The heir spends 2-3 years performing loyalty while building nothing that looks like an independent base."
        ],
        "key_actors": [
          "xi_jinping",
          "ding_xuexiang",
          "chen_jining",
          "zhang_youxia",
          "wang_huning"
        ],
        "indicators": [
          "heir_elevation",
          "succession_discourse",
          "chairman_restore",
          "legacy_canonization",
          "congress_age_norms"
        ],
        "assumptions": [
          {
            "text": "Xi believes a designated heir can be kept safe for him (contra the Lin Biao lesson he himself internalized)",
            "confidence": "low",
            "impact_if_wrong": "high"
          },
          {
            "text": "A candidate acceptable to both Xi and the security/military apparatus exists",
            "confidence": "medium",
            "impact_if_wrong": "medium"
          }
        ],
        "implications": [
          "The heir's survival probability is itself an analytic object — Deng discarded two successors.",
          "Foreign governments gain a named interlocutor for the post-Xi era; expect courtship and miscalibration."
        ],
        "analyst_notes": "Most analytically demanding scenario: it looks like continuity for years before it looks like transition."
      },
      {
        "id": "incapacity_regency",
        "name": "Concealed decline and informal regency",
        "trigger": "incapacity",
        "summary": "A serious health event leaves Xi alive but diminished. Information is sealed; public appearances become scripted and sparse. Real authority pools with the gatekeepers — the General Office, the security ministers, the family — who govern in his name. The system enters a Brezhnev-pattern holding state in which succession is simultaneously imminent and indefinitely deferred.",
        "probability": 0.13,
        "pathway": [
          "An absence or visibly reduced schedule is followed by managed re-appearances.",
          "Ceremonial duties migrate to PSC deputies; foreign travel stops.",
          "Gatekeepers arbitrate access; decisions slow, then bottleneck.",
          "Either a formalized regency emerges (new deputy posts) or the holding state persists until death or a forcing event."
        ],
        "key_actors": [
          "xi_jinping",
          "cai_qi",
          "wang_xiaohong",
          "ding_xuexiang",
          "zhang_youxia"
        ],
        "indicators": [
          "absence",
          "protocol_delegation",
          "travel_stop",
          "censorship_spike",
          "regency_titles"
        ],
        "assumptions": [
          {
            "text": "The gatekeeper bloc remains cohesive enough to manage a diminished principal without defecting",
            "confidence": "medium",
            "impact_if_wrong": "high"
          }
        ],
        "implications": [
          "Highest-deception environment of any scenario: official signals actively misrepresent the leader's condition.",
          "Policy paralysis raises accident risk in standing crises (Taiwan strait, border incidents)."
        ],
        "analyst_notes": "Health rumors individually are near-worthless; sustained behavioral pattern changes are the signal."
      },
      {
        "id": "death_improvised",
        "name": "Sudden death, improvised succession",
        "trigger": "death",
        "summary": "Xi dies in office with no heir and no operative rule. The PSC and CMC improvise under the 1976/1953 playbooks: rapid announcement of collective stewardship, a premium on physical control of Zhongnanhai security, and a multi-year sorting contest behind a facade of unity. Outcomes range from a smooth caretaker consolidation to an open elite split; the first 72 hours of meeting-convening determine which branch obtains.",
        "probability": 0.1,
        "pathway": [
          "Death is concealed for hours-to-days while the loyalist core agrees on sequencing.",
          "An interim arrangement fronted by the senior PSC survivor is announced; funeral committee composition telegraphs the pecking order.",
          "The CCDI and security organs become contested prizes rather than instruments.",
          "Within 1-3 years a primus emerges — historically from the party apparatus, not the security services."
        ],
        "key_actors": [
          "li_qiang",
          "zhao_leji",
          "cai_qi",
          "zhang_youxia",
          "wang_xiaohong",
          "hu_jintao"
        ],
        "indicators": [
          "emergency_meeting",
          "censorship_spike",
          "guard_reshuffle",
          "absence",
          "elite_exodus"
        ],
        "assumptions": [
          {
            "text": "The PLA stays in barracks and backs whatever civilian arrangement forms, as in 1976",
            "confidence": "medium",
            "impact_if_wrong": "high"
          },
          {
            "text": "Actuarial mortality for a well-cared-for male aged 73-77 (~2%/yr) is the right base rate anchor",
            "confidence": "high",
            "impact_if_wrong": "low"
          }
        ],
        "implications": [
          "Pre-build the first-72-hours watch plan now: meeting convenings, funeral committee lists, garrison movements.",
          "Markets and foreign capitals will price a contested succession instantly; expect information vacuum plus rumor saturation."
        ],
        "analyst_notes": "The probability is mostly actuarial; the analysis is about the variance of what follows."
      },
      {
        "id": "crisis_forced",
        "name": "Crisis breaks the mandate",
        "trigger": "crisis",
        "summary": "A regime-threatening shock — most plausibly a failed or stalemated Taiwan operation, or an uncontrolled financial/fiscal cascade — destroys elite confidence in Xi's judgment. Transition arrives not through a pre-formed plot but through the collapse of the cost-benefit calculus that kept the elite acquiescent. Xi is retired 'for reasons of health' into a managed exit that is involuntary in fact and voluntary in form.",
        "probability": 0.08,
        "pathway": [
          "The shock lands; initial rally-around-the-leader effect holds for weeks or months.",
          "Attribution settles on the leader's personal decisions; purge instruments lose deterrent credibility as too many are threatened at once.",
          "Elders, technocrats, and military professionals converge on a face-saving exit formula.",
          "A scapegoat-manager successor takes over with an implicit mandate to de-risk."
        ],
        "key_actors": [
          "xi_jinping",
          "zhang_youxia",
          "li_qiang",
          "wang_huning",
          "hu_chunhua"
        ],
        "indicators": [
          "taiwan_mobilization",
          "elite_exodus",
          "elder_activity",
          "propaganda_dial",
          "emergency_meeting"
        ],
        "assumptions": [
          {
            "text": "A crisis of regime-threatening magnitude occurs within the horizon",
            "confidence": "low",
            "impact_if_wrong": "high"
          },
          {
            "text": "Crisis blame would attach to Xi personally rather than to subordinates he can sacrifice",
            "confidence": "low",
            "impact_if_wrong": "medium"
          }
        ],
        "implications": [
          "Succession analysis and war-warning analysis are coupled — staff them together, not separately.",
          "A post-crisis leadership would inherit maximal incentive to externalize blame; instability does not end with the handover."
        ],
        "analyst_notes": "Conditional probability dominates here: P(transition | regime-threatening crisis) is high, P(crisis) is the real argument."
      },
      {
        "id": "ouster_tail",
        "name": "Elite removal (tail scenario)",
        "trigger": "ouster",
        "summary": "A coalition spanning party seniors, security principals, and PLA leadership executes a forced retirement or house arrest. Kept in the set not because it is likely — Xi has structurally hardened against exactly this — but because it anchors the tail, disciplines coup-rumor analysis, and forces explicitness about what evidence would actually distinguish an ouster from a health retirement.",
        "probability": 0.06,
        "pathway": [
          "A forcing grievance (purge overreach, catastrophic policy failure) creates a survival coalition among officials who expect to be purged next.",
          "Conspirators neutralize the Central Guard Bureau and General Office paper flow before any public move — the 1976 sequence.",
          "The removal is announced as voluntary retirement on health grounds, with full honors and continued invisibility.",
          "The new leadership immediately invokes collective leadership norms to legitimate itself."
        ],
        "key_actors": [
          "cai_qi",
          "wang_xiaohong",
          "zhang_youxia",
          "li_xi",
          "chen_wenqing"
        ],
        "indicators": [
          "guard_reshuffle",
          "pla_purge_wave",
          "elder_activity",
          "censorship_spike",
          "propaganda_dial"
        ],
        "assumptions": [
          {
            "text": "A conspiracy can coordinate under pervasive counter-elite surveillance without detection",
            "confidence": "low",
            "impact_if_wrong": "high"
          }
        ],
        "implications": [
          "Most ouster 'evidence' circulating at any time is noise; only security-apparatus personnel moves deserve weight.",
          "If it ever succeeds, expect the public narrative to be indistinguishable from the incapacity scenario for months."
        ],
        "analyst_notes": "Default disposition toward coup rumors: discount, then check the guard-unit indicator anyway."
      }
    ]
  }
};
