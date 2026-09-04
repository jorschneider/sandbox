/* Jordan's weeknight mixed martial arts — BJJ, muay thai, wrestling, boxing.
   HARD CONSTRAINT: every gym here is inside a 15-minute walk of Union Square.
   Nothing goes in this file that fails that test. Renzo Gracie (W 30th),
   Five Points (148 Lafayette), Radical MMA (W 29th) and 10th Planet (W 43rd)
   are all good gyms and all too far — they are deliberately excluded.

   Venue facts (address, coordinates, walk time, booking URL) live once in
   `venues`; each entry in `events` is a class FORMAT offered at one of them.

   timeVerified:false means the gym, disciplines, intro offer and address are
   confirmed on an official page, but the exact mat times sit behind a booking
   widget (Zen Planner / MindBody / WellnessLiving). The UI marks those with a
   🔍. Pinning them down is the weekly refresh routine's main job. */
window.JORDAN_DATA = {
  "weekLabel": "Aug 31 – Sep 4, 2026",
  "weekMonday": "2026-08-31",
  "updated": "September 4, 2026",
  "who": "Jordan",

  "venues": {
    "Anderson's Martial Arts Academy": {
      "address": "12 East 14th Street (between 5th Ave & University Pl)",
      "neighborhood": "Union Square",
      "lat": 40.7350, "lng": -73.9908,
      "walkMinutes": 2,
      "url": "https://www.andersonsmartialarts.com/schedule/",
      "phone": "(212) 766-6622",
      "hours": "Mon 10am–9pm · Tue 12–9 · Wed 10am–9pm · Thu 12–9 · Fri 10am–9pm · Sat 10–2:30 · closed Sun"
    },
    "Mushin MMA": {
      "address": "78 Fifth Avenue, 2nd Floor (at 14th St)",
      "neighborhood": "Union Square",
      "lat": 40.7366, "lng": -73.9928,
      "walkMinutes": 4,
      "url": "https://www.mushinmma.org/schedule",
      "phone": "(929) 484-4975",
      "hours": "Evening classes weeknights — confirm on the schedule page"
    },
    "Paxibellum": {
      "address": "4 West 18th Street, 3rd Floor",
      "neighborhood": "Flatiron",
      "lat": 40.7387, "lng": -73.9926,
      "walkMinutes": 6,
      "url": "https://paxibellum.com/class-schedule/",
      "phone": "(646) 980-9951",
      "hours": "Adult evening classes weeknights — confirm on the schedule page"
    },
    "Unity Jiu Jitsu": {
      "address": "144 West 14th Street, Stair Door A (basement), between 6th & 7th Ave",
      "neighborhood": "Chelsea / West Village",
      "lat": 40.7392, "lng": -73.9995,
      "walkMinutes": 11,
      "url": "https://unityjiujitsu.com/schedule/",
      "phone": "(917) 409-5550",
      "hours": "Mon 6:30–9am & 11am–10pm · Tue–Thu 6:30am + 11am–10:30pm · Fri 7–9:30am & 11am–10pm"
    },
    "Training Zone NYC — Gramercy": {
      "address": "329 First Avenue (at 19th St)",
      "neighborhood": "Gramercy / Stuyvesant Town",
      "lat": 40.7338, "lng": -73.9805,
      "walkMinutes": 12,
      "url": "https://www.tznyc.com/schedule",
      "phone": "(212) 505-9663",
      "hours": "Manhattan location: Mon & Wed 3:45–8:30pm · Sat 9am–12:30pm"
    },
    "Overthrow Boxing Club": {
      "address": "9 Bleecker Street (at Bowery)",
      "neighborhood": "NoHo / Bowery",
      "lat": 40.7257, "lng": -73.9930,
      "walkMinutes": 15,
      "url": "https://overthrownyc.com/",
      "phone": "",
      "hours": "Evening classes daily — check the site for the current timetable"
    }
  },

  "events": [
    {
      "title": "Muay Thai — all levels",
      "venue": "Anderson's Martial Arts Academy",
      "category": "striking",
      "discipline": "Muay Thai",
      "level": "Beginner welcome",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "19:00",
      "end": "20:00",
      "when": "Evening classes run until the 9pm close. Wednesday 7–8pm is the busiest hour on the mats.",
      "timeVerified": false,
      "cost": "Call for current rates and intro offer",
      "url": "https://www.andersonsmartialarts.com/schedule/",
      "notes": "The bullseye: 12 East 14th Street is a two-minute walk from Union Square — you could leave the apartment at 6:52 and be wrapping your hands at 6:58. Anderson's has been running for well over a decade under Jeet Kune Do instructor Sifu Anderson, and the curriculum is Bruce Lee-lineage JKD Concepts plus Filipino martial arts, muay thai and BJJ. That mix matters: this is a school built around cross-training rather than a single-sport competition gym, which makes it a gentler landing for someone coming back to combat sports. Muay Thai here is the standard eight-limb striking work — bag rounds, pad rounds, clinch, drilling — and beginners are normal. Call ahead; the schedule page is JS-driven and worth confirming by phone.",
      "confidence": "high"
    },
    {
      "title": "Jeet Kune Do & Filipino martial arts",
      "venue": "Anderson's Martial Arts Academy",
      "category": "mma",
      "discipline": "JKD / FMA",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "19:00",
      "when": "Early-evening slot inside the 9pm close — confirm by phone.",
      "timeVerified": false,
      "cost": "Call for current rates",
      "url": "https://www.andersonsmartialarts.com/programs/",
      "notes": "The most distinctive thing on this list and the reason to pick Anderson's over a pure BJJ gym. Jeet Kune Do Concepts is Bruce Lee's framework — take what works, discard the rest — taught alongside Filipino martial arts (kali/escrima: stick and knife work, footwork drills, a lot of coordination). It is genuinely different from anything else within walking distance, it's less physically punishing than hard sparring, and the footwork transfers directly to striking. If the goal is to enjoy the training rather than to prepare for a fight, start here.",
      "confidence": "high"
    },
    {
      "title": "Intro to BJJ — the free first class",
      "venue": "Mushin MMA",
      "category": "grappling",
      "discipline": "Brazilian Jiu Jitsu",
      "level": "Complete beginner",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:30",
      "end": "19:30",
      "when": "Weeknight evening slot — book the intro through the site's reservation form.",
      "timeVerified": false,
      "cost": "First class free",
      "url": "https://www.mushinmma.org/",
      "notes": "The single easiest first step on Jordan's whole list: a dedicated Intro to BJJ class, the first one is free, and it's four minutes from Union Square. Mushin has been running since 2010, holds a 5.0 Google rating, and pitches itself on small-group instruction with instructors who \"break down movements with anatomical awareness\" — which is the polite way of saying nobody is going to crank a heel hook on a first-timer. They run a separate women's BJJ program and a competition team, so the room spans hobbyist to serious. Wear a t-shirt and shorts with no zips or pockets; they'll lend a gi if the class needs one. Second floor of 78 Fifth Ave — Pure Barre is on the 4th, which makes a joint evening out unusually easy to coordinate.",
      "confidence": "high"
    },
    {
      "title": "Adults BJJ",
      "venue": "Mushin MMA",
      "category": "grappling",
      "discipline": "Brazilian Jiu Jitsu",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "19:30",
      "end": "20:45",
      "when": "Evening mat times — confirm on the schedule page.",
      "timeVerified": false,
      "cost": "First class free · membership rates on request",
      "url": "https://www.mushinmma.org/schedule",
      "notes": "The main adult class once the intro is done. Technique of the day, drilling, then live rolling for anyone who wants it — and \"who wants it\" is genuinely optional at a gym like this, which is the difference between a place you keep going to and one you quit in three weeks. Small groups, mixed belts.",
      "confidence": "high"
    },
    {
      "title": "Kickboxing",
      "venue": "Mushin MMA",
      "category": "striking",
      "discipline": "Kickboxing",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "19:00",
      "when": "Early-evening striking slot — confirm on the schedule page.",
      "timeVerified": false,
      "cost": "First class free",
      "url": "https://www.mushinmma.org/schedule",
      "notes": "If the appeal is conditioning and hitting things rather than getting folded in half, this is the version of Mushin to book. Pads, bags, combinations, no grappling. Pairs well with a BJJ night later in the week — striking on Monday, grappling on Wednesday is a sane way to run a martial arts habit that doesn't wreck you.",
      "confidence": "high"
    },
    {
      "title": "No-gi jiu jitsu & submission wrestling",
      "venue": "Paxibellum",
      "category": "grappling",
      "discipline": "No-Gi BJJ / Wrestling",
      "level": "Beginner to advanced",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "19:00",
      "end": "20:15",
      "when": "Adult evening classes — confirm the slot on the Zen Planner schedule.",
      "timeVerified": false,
      "cost": "First class always free",
      "url": "https://paxibellum.com/class-schedule/",
      "notes": "Six minutes from Union Square and the best pick if the interest is specifically the modern MMA grappling game — no-gi, submission wrestling and muay thai rather than traditional gi jiu jitsu. \"Your first class is always free\" is stated plainly on the site, with students explicitly welcomed \"from beginners to advanced practitioners.\" No-gi is the friendlier entry point for adults who don't want to buy a gi to find out whether they like it: rash guard and shorts, that's the whole kit. Third floor of 4 W 18th.",
      "confidence": "high"
    },
    {
      "title": "Muay Thai",
      "venue": "Paxibellum",
      "category": "striking",
      "discipline": "Muay Thai",
      "level": "All levels",
      "days": ["tue", "wed", "thu"],
      "start": "18:00",
      "end": "19:00",
      "when": "Evening striking slot — confirm on the schedule page.",
      "timeVerified": false,
      "cost": "First class always free",
      "url": "https://paxibellum.com/class-schedule/",
      "notes": "The striking half of the Paxibellum program, in the same room and on the same free-first-class terms. Useful as a second gym to compare against Anderson's muay thai — both are within a ten-minute walk, both let you try before paying, so there is no reason to commit to either sight unseen.",
      "confidence": "high"
    },
    {
      "title": "Gi & no-gi jiu jitsu, 7 days a week",
      "venue": "Unity Jiu Jitsu",
      "category": "grappling",
      "discipline": "Brazilian Jiu Jitsu",
      "level": "Fundamentals through competition",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:30",
      "end": "20:00",
      "when": "Verified: mats run to 10:00pm Mon/Fri and 10:30pm Tue–Thu. Reserve a drop-in on the online calendar.",
      "timeVerified": false,
      "cost": "First day FREE for NY/NJ/CT residents (includes an intro lesson) · then $40/day weekdays, $25 weekends, $100 for any 7 consecutive days",
      "url": "https://unityjiujitsu.com/schedule/",
      "notes": "The serious one, and the one with the latest mats — Tuesday through Thursday they run until 10:30pm, which is the only real answer on this list to a night that starts at 8. Unity is a world-class competition academy (the Almeida/Miyao lineage), but the fundamentals program is separate and genuinely built for beginners. The first day is free for anyone in the tri-state area and includes a one-on-one introduction lesson if you've never trained. After that the drop-in economics are unusually honest: $40 a weekday, or $100 for seven consecutive days if you want to binge a week before deciding. Eleven-minute walk west along 14th — Stair Door A, basement level, between 6th and 7th.",
      "confidence": "high"
    },
    {
      "title": "Wrestling",
      "venue": "Unity Jiu Jitsu",
      "category": "grappling",
      "discipline": "Wrestling",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "19:00",
      "end": "20:00",
      "when": "Wrestling sits alongside the gi and no-gi program — confirm the night on the online calendar.",
      "timeVerified": false,
      "cost": "First day free (tri-state) · $40 weekday drop-in",
      "url": "https://unityjiujitsu.com/schedule/",
      "notes": "Straight folkstyle/freestyle wrestling as a standalone class, which is rarer in Manhattan than it should be and is the fastest way to stop being the person who gets taken down at will. Hardest conditioning session on this list by a distance — expect to be genuinely gassed. Best scheduled on a night with nothing after it.",
      "confidence": "medium"
    },
    {
      "title": "Muay Thai, boxing & BJJ (adult program)",
      "venue": "Training Zone NYC — Gramercy",
      "category": "mma",
      "discipline": "Muay Thai / Boxing / BJJ",
      "level": "All levels",
      "days": ["mon", "wed"],
      "start": "18:00",
      "end": "20:00",
      "when": "Verified: the Manhattan location is open Mon & Wed 3:45–8:30pm and Sat 9am–12:30pm only. Two weeknights, both evenings.",
      "timeVerified": true,
      "cost": "One week free trial",
      "url": "https://www.tznyc.com/locations/manhattan",
      "notes": "The east-side option, twelve minutes from Union Square at 1st Ave and 19th — an easy walk home to Gramercy. The all-inclusive adult program bundles Muay Thai, boxing and Brazilian Jiu-Jitsu (gi and no-gi) into one membership rather than charging per discipline. Important scheduling constraint, and the reason it only appears on two days here: the Manhattan location opens Monday and Wednesday afternoons/evenings and Saturday mornings, and is closed Tue/Thu/Fri/Sun. A full week's free trial is the most generous intro offer of any gym on this list — worth spending it on a Mon/Wed pair.",
      "confidence": "high"
    },
    {
      "title": "Boxing — underground",
      "venue": "Overthrow Boxing Club",
      "category": "striking",
      "discipline": "Boxing",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "19:00",
      "end": "20:00",
      "when": "Evening classes daily — confirm the timetable on the site.",
      "timeVerified": false,
      "cost": "Class packs and memberships — check the site",
      "url": "https://overthrownyc.com/",
      "notes": "The edge of the fifteen-minute radius and the one with the most atmosphere: a basement gym at 9 Bleecker on the Bowery, in a building with genuine anarchist history, run with a deliberate punk aesthetic. Pure boxing — no grappling, no gi, no belt system — which makes it the lowest-commitment way to get a hard hour in. Good on a night when the appeal is to hit a bag and not talk to anyone. Fifteen minutes on foot straight down Broadway and Bleecker, or two stops on the 6.",
      "confidence": "medium"
    }
  ],

  "itineraries": {
    "mon": {
      "summary": "Monday is the widest night — Anderson's opens at 10am, Training Zone runs its Mon/Wed block, Unity's mats go to 10pm.",
      "picks": [
        { "key": "intro-to-bjj-the-free-first-class", "note": "If it's the first session ever, start here. Free, four minutes away." },
        { "key": "muay-thai-all-levels", "note": "Two minutes from the door. Beginners are normal here." },
        { "key": "muay-thai-boxing-bjj-adult-program", "note": "One of only two weeknights the Gramercy gym is open." }
      ]
    },
    "tue": {
      "summary": "Tuesday belongs to the late mats — Unity runs to 10:30pm, so a late finish at work isn't a dealbreaker.",
      "picks": [
        { "key": "gi-no-gi-jiu-jitsu-7-days-a-week", "note": "First day free for tri-state residents, intro lesson included." },
        { "key": "no-gi-jiu-jitsu-submission-wrestling", "note": "Rash guard and shorts, no gi to buy. First class free." },
        { "key": "jeet-kune-do-filipino-martial-arts", "note": "The most interesting hour available within a 5-minute walk." }
      ]
    },
    "wed": {
      "summary": "Midweek is the busiest night on every mat in the neighborhood — Anderson's 7–8pm runs near capacity.",
      "picks": [
        { "key": "muay-thai-boxing-bjj-adult-program", "note": "The second and last Gramercy weeknight. Spend the free trial week here." },
        { "key": "adults-bjj", "note": "Technique, drilling, then optional rolling. Small groups." },
        { "key": "muay-thai", "note": "Paxibellum's striking hour — free to try, six minutes away." }
      ]
    },
    "thu": {
      "summary": "Thursday: the hardest training night if you want one. Unity wrestling plus late mats to 10:30pm.",
      "picks": [
        { "key": "wrestling", "note": "Hardest conditioning on the list. Put nothing after it." },
        { "key": "gi-no-gi-jiu-jitsu-7-days-a-week", "note": "Mats to 10:30pm — the latest option anywhere nearby." },
        { "key": "kickboxing", "note": "The lighter alternative: pads and bags, no grappling." }
      ]
    },
    "fri": {
      "summary": "Friday is deliberately light. Anderson's and Mushin run, Training Zone is closed, and nothing should hurt on Saturday.",
      "picks": [
        { "key": "boxing-underground", "note": "Hit a bag, talk to no one, walk home down Bleecker." },
        { "key": "adults-bjj", "note": "Friday rolls are usually the friendliest of the week." },
        { "key": "muay-thai-all-levels", "note": "Anderson's is open till 9pm Fridays — two minutes away." }
      ]
    }
  }
};
