/* Jordan's weeknights — martial arts, plus the rest of the sporting week.

   TWO RADIUS RULES, and validate.cjs enforces both:

   1. MARTIAL ARTS (grappling / striking / mma) must be inside a 15-MINUTE
      WALK of Union Square. This was the original ask and it does not bend.
      Renzo Gracie (W 30th), Five Points (148 Lafayette), Radical MMA (W 29th)
      and 10th Planet (W 43rd) are all good gyms and all too far — they are
      deliberately excluded.

   2. EVERYTHING ELSE (soccer, chess, ping pong, running) may be up to 25
      MINUTES DOOR-TO-DOOR, because Manhattan has no soccer field inside a
      15-minute walk of Union Square and a strict cap would just mean no
      soccer at all. Those venues carry `travelMinutes` + `travelHow` naming
      the actual route; `walkMinutes` stays honest about the walk.

   Venue facts (address, coordinates, travel, booking URL) live once in
   `venues`; each entry in `events` is a session FORMAT offered at one of them.

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
    },

    "SPIN New York Flatiron": {
      "address": "48 East 23rd Street (between Madison & Park)",
      "neighborhood": "Flatiron",
      "lat": 40.7404, "lng": -73.9873,
      "walkMinutes": 8,
      "url": "https://wearespin.com/location/new-york-flatiron/",
      "phone": "(212) 982-8802",
      "hours": "Walk-in Mon–Thu 4:00–11:00pm · Fri 4:00pm–1:00am · Sat 12:00pm–1:00am"
    },
    "Marshall Chess Club": {
      "address": "23 West 10th Street (between 5th & 6th Ave)",
      "neighborhood": "Greenwich Village",
      "lat": 40.7345, "lng": -73.9965,
      "walkMinutes": 12,
      "url": "https://www.marshallchessclub.org/calendar",
      "phone": "(212) 477-3716",
      "hours": "Mon, Wed–Fri 2:00pm–midnight · Sat–Sun 9:00am–midnight · closed Tue except for events"
    },
    "GoodRec — Sara D. Roosevelt Park": {
      "address": "Chrystie Street at Broome/Canal, Sara D. Roosevelt Park",
      "neighborhood": "Lower East Side / Chinatown",
      "lat": 40.7188, "lng": -73.9938,
      "walkMinutes": 25,
      "travelMinutes": 16,
      "travelHow": "16 min — 6 train from Union Sq to Canal St, then a 5-minute walk",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "phone": "",
      "hours": "Games most evenings — times are set per game in the GoodRec app"
    },
    "GoodRec — The Ground": {
      "address": "130 Madison Street",
      "neighborhood": "Two Bridges / Lower East Side",
      "lat": 40.7128, "lng": -73.9906,
      "walkMinutes": 32,
      "travelMinutes": 22,
      "travelHow": "22 min — F train to East Broadway, then a 4-minute walk",
      "url": "https://www.goodrec.com/facilities/the-ground-nyc",
      "phone": "",
      "hours": "Facility open Mon–Sat 8:00am–midnight · closed Sunday"
    },
    "GoodRec — Pier 40": {
      "address": "Pier 40, 353 West Street (at West Houston), Hudson River Park",
      "neighborhood": "West Village / Hudson River Park",
      "lat": 40.7295, "lng": -74.0110,
      "walkMinutes": 26,
      "travelMinutes": 20,
      "travelHow": "20 min — 1 train to Houston St, then a 7-minute walk west",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "phone": "",
      "hours": "Rooftop and courtyard fields, floodlit — evening games most nights"
    },
    "GoodRec — Chelsea Waterside": {
      "address": "Chelsea Waterside Park, 23rd Street at 11th Avenue",
      "neighborhood": "Chelsea / Hudson River Park",
      "lat": 40.7482, "lng": -74.0075,
      "walkMinutes": 26,
      "travelMinutes": 22,
      "travelHow": "22 min — M23 crosstown bus, or L to 8th Ave then a 10-minute walk",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "phone": "",
      "hours": "Floodlit turf — small-sided games run into the evening"
    },
    "TMIRCE — Alphabet City Beer Co.": {
      "address": "96 Avenue C (at East 6th Street)",
      "neighborhood": "Alphabet City / East Village",
      "lat": 40.7237, "lng": -73.9779,
      "walkMinutes": 22,
      "travelMinutes": 18,
      "travelHow": "18 min — L to 1st Ave then a 9-minute walk, or a straight 22-minute walk east",
      "url": "https://www.meetup.com/nyc-informal-running-club-home-of-tmirce-nyc/",
      "phone": "",
      "hours": "Tempo Thursdays, 7:00pm. RSVPs optional."
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
    },

    {
      "title": "Pickup soccer at Sara D. Roosevelt Park",
      "venue": "GoodRec — Sara D. Roosevelt Park",
      "category": "soccer",
      "discipline": "Soccer",
      "level": "All skill levels",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:30",
      "end": "19:30",
      "when": "Games most weeknight evenings. Exact kickoff times are published per game in the GoodRec app.",
      "timeVerified": false,
      "cost": "Per-game fee set in the app · jerseys and a host included",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "notes": "The closest GoodRec field to Union Square and the easiest one to make on a weeknight — 6 train to Canal, five minutes on foot, you're playing. GoodRec's whole premise is that you show up alone: a host runs the game, jerseys are provided so teams are obvious, and it is explicitly all skill levels with no season-long commitment. Games are typically small-sided and 60–90 minutes. You must be 18+ and you pay in advance through the app, which also means the game is confirmed before you leave the house. Turf — sneakers or turf shoes, not studs.",
      "confidence": "medium"
    },
    {
      "title": "Indoor 4v4 futsal at The Ground",
      "venue": "GoodRec — The Ground",
      "category": "soccer",
      "discipline": "Soccer",
      "level": "All skill levels",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "19:00",
      "end": "20:30",
      "when": "The facility runs 8:00am–midnight Mon–Sat. Book a specific game slot in the GoodRec app.",
      "timeVerified": false,
      "cost": "Per-game fee set in the app",
      "url": "https://www.goodrec.com/facilities/the-ground-nyc",
      "notes": "The rain-proof option, and the one to build a habit around — indoor and rooftop futsal pitches that play the same in February as in June, running four teams of 4v4 so you rotate on and off rather than standing around. Fast, tight, touch-heavy football; 4v4 means you get vastly more of the ball than an 11-a-side would give you. Open until midnight, so a 9pm game is a real option after a late edit. Turf shoes or sneakers — cleats are not allowed on the surface.",
      "confidence": "medium"
    },
    {
      "title": "Pickup soccer at Pier 40",
      "venue": "GoodRec — Pier 40",
      "category": "soccer",
      "discipline": "Soccer",
      "level": "All skill levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "19:00",
      "end": "20:30",
      "when": "Floodlit rooftop and courtyard fields; evening games most nights. Times per game in the app.",
      "timeVerified": false,
      "cost": "Per-game fee set in the app",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "notes": "The best-looking game on the list: a floodlit pitch on the roof of a pier sticking out into the Hudson, with the sun going down over Jersey behind the goal. Pier 40 is the biggest field complex in downtown Manhattan and runs both rooftop and courtyard surfaces, so games survive weather that would cancel a park pitch. Worth the extra few minutes of travel on a clear evening purely for the setting.",
      "confidence": "medium"
    },
    {
      "title": "Pickup soccer at Chelsea Waterside",
      "venue": "GoodRec — Chelsea Waterside",
      "category": "soccer",
      "discipline": "Soccer",
      "level": "All skill levels",
      "days": ["tue", "wed", "thu"],
      "start": "18:30",
      "end": "20:00",
      "when": "Floodlit turf, small-sided games into the evening. Times per game in the app.",
      "timeVerified": false,
      "cost": "Per-game fee set in the app",
      "url": "https://www.goodrec.com/pickup-soccer/new-york-city",
      "notes": "The north-west option, on the water at 23rd and 11th. Reliably has small-sided games going in the afternoons and evenings, and it is the easiest of the outdoor fields to reach by bus rather than train — the M23 goes crosstown and drops you at the door. Good fallback when the downtown games are full.",
      "confidence": "medium"
    },
    {
      "title": "Ping pong at SPIN — $9 after 9pm Tuesdays",
      "venue": "SPIN New York Flatiron",
      "category": "pingpong",
      "discipline": "Table tennis",
      "level": "Anyone",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "23:00",
      "when": "Walk-in Mon–Thu 4:00–11:00pm. The Tuesday deal is $9 per person after 9:00pm.",
      "timeVerified": true,
      "cost": "Walk-in per table/hour: Mon $29 · Tue–Thu $49 · Fri–Sat $59. Tuesday after 9pm: $9",
      "url": "https://wearespin.com/location/new-york-flatiron/",
      "notes": "The one on this list you can do with a drink in your hand, and the obvious answer to \"someone's in town, where do we go.\" Eighteen Olympic-grade tables across 14,000 square feet in the Flatiron, with a full bar and a real kitchen — Susan Sarandon's ping pong club, still the best-executed version of the idea in the city. The move is Tuesday: $9 a head after 9pm, which turns a $49-an-hour table into a cheap night out. Walk-ins are welcome when tables are free, but book ahead if it matters. Eight minutes up Park Ave South.",
      "confidence": "high"
    },
    {
      "title": "Blitz & rapid at the Marshall Chess Club",
      "venue": "Marshall Chess Club",
      "category": "chess",
      "discipline": "Chess",
      "level": "All ratings, including unrated",
      "days": ["mon", "wed", "thu", "fri"],
      "start": "19:00",
      "end": "22:00",
      "when": "Club open Mon and Wed–Fri 2:00pm–midnight (closed Tue except for events). USCF-rated tournaments run almost daily — check the calendar for the night's event and entry fee.",
      "timeVerified": false,
      "cost": "Entry fees vary by event · non-members may enter many tournaments",
      "url": "https://www.marshallchessclub.org/calendar",
      "notes": "The most Jordan thing within a fifteen-minute walk. The Marshall is one of the oldest chess clubs in America, in a Greenwich Village brownstone on West 10th — the room where Bobby Fischer played the Game of the Century at thirteen. It runs USCF-rated tournaments almost every day, from four-round blitz nights to slower action events, and non-members can enter many of them, so you can turn up and play rated chess without joining first. Open until midnight, which makes it the rare weeknight activity that doesn't punish a late start. Bring nothing; boards and clocks are there.",
      "confidence": "high"
    },
    {
      "title": "Tempo Thursdays with TMIRCE",
      "venue": "TMIRCE — Alphabet City Beer Co.",
      "category": "run",
      "discipline": "Running",
      "level": "Any pace — walking encouraged",
      "days": ["thu"],
      "start": "19:00",
      "end": "20:00",
      "when": "Every Thursday at 7:00pm from Alphabet City Beer Co., 96 Avenue C. RSVP optional.",
      "timeVerified": true,
      "cost": "Free",
      "url": "https://www.meetup.com/nyc-informal-running-club-home-of-tmirce-nyc/",
      "notes": "Free, weekly, and the least intimidating run club in the city by design — The Most Informal Running Club Ever states plainly that NO ONE IS TOO SLOW and that it's any pace, any distance you want to go. It starts and finishes at a beer hall in Alphabet City, which tells you the priorities. RSVPs are optional because they reliably get more runners than sign-ups. The zero-equipment, zero-cost, zero-commitment entry on Jordan's list: worst case you jog twenty minutes and have a beer.",
      "confidence": "high"
    }
  ],

  "itineraries": {
    "mon": {
      "summary": "Monday is the widest night — Anderson's opens at 10am, Training Zone runs its Mon/Wed block, and SPIN's $29 table is the cheapest of the week.",
      "picks": [
        { "key": "intro-to-bjj-the-free-first-class", "note": "If it's the first session ever, start here. Free, four minutes away." },
        { "key": "muay-thai-boxing-bjj-adult-program", "note": "One of only two weeknights the Gramercy gym is open." },
        { "key": "indoor-4v4-futsal-at-the-ground", "note": "Rain-proof, open till midnight — the reliable soccer habit." },
        { "key": "blitz-rapid-at-the-marshall-chess-club", "note": "The zero-sweat option. Rated chess till midnight on West 10th." }
      ]
    },
    "tue": {
      "summary": "Tuesday: Unity's mats run to 10:30pm, and SPIN does $9 a head after 9pm — the two best late options of the week.",
      "picks": [
        { "key": "gi-no-gi-jiu-jitsu-7-days-a-week", "note": "First day free for tri-state residents, intro lesson included." },
        { "key": "ping-pong-at-spin-9-after-9pm-tuesdays", "note": "$9 after 9pm. The one you can bring someone to." },
        { "key": "pickup-soccer-at-sara-d-roosevelt-park", "note": "Closest field — 6 train to Canal, five minutes' walk." },
        { "key": "no-gi-jiu-jitsu-submission-wrestling", "note": "Rash guard and shorts, no gi to buy. First class free." }
      ]
    },
    "wed": {
      "summary": "Midweek is the busiest night on every mat nearby — Anderson's 7–8pm runs near capacity, so have a backup.",
      "picks": [
        { "key": "muay-thai-boxing-bjj-adult-program", "note": "The second and last Gramercy weeknight. Spend the free trial week here." },
        { "key": "adults-bjj", "note": "Technique, drilling, then optional rolling. Small groups." },
        { "key": "pickup-soccer-at-pier-40", "note": "Floodlit roof over the Hudson. Worth it on a clear evening." },
        { "key": "blitz-rapid-at-the-marshall-chess-club", "note": "Open till midnight — the rare thing a late start doesn't ruin." }
      ]
    },
    "thu": {
      "summary": "Thursday is the busiest night of Jordan's week: Unity wrestling, the free run club at 7, and late mats to 10:30pm.",
      "picks": [
        { "key": "tempo-thursdays-with-tmirce", "note": "Free, 7pm, any pace. Starts and ends at a beer hall." },
        { "key": "wrestling", "note": "Hardest conditioning on the list. Put nothing after it." },
        { "key": "gi-no-gi-jiu-jitsu-7-days-a-week", "note": "Mats to 10:30pm — the latest option anywhere nearby." },
        { "key": "pickup-soccer-at-chelsea-waterside", "note": "M23 crosstown drops you at the door. Good when downtown's full." }
      ]
    },
    "fri": {
      "summary": "Friday is deliberately light. Training Zone is closed, nothing should hurt on Saturday, and the soft options are the right ones.",
      "picks": [
        { "key": "boxing-underground", "note": "Hit a bag, talk to no one, walk home down Bleecker." },
        { "key": "indoor-4v4-futsal-at-the-ground", "note": "Open till midnight Fridays. Play late, no consequences." },
        { "key": "blitz-rapid-at-the-marshall-chess-club", "note": "Friday nights at the Marshall run to midnight." },
        { "key": "muay-thai-all-levels", "note": "Anderson's is open till 9pm Fridays — two minutes away." }
      ]
    }
  }
};
