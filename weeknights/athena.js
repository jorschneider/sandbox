/* Athena's weeknight movement — yoga, pilates/barre, dance & ballet.
   Everything here is inside a 15-minute walk of Union Square.

   Venue facts (address, coordinates, walk time, booking URL) live once in
   `venues`; each entry in `events` is a class FORMAT offered at one of them.

   timeVerified:false means the venue, discipline, price and booking link are
   confirmed on an official page, but the exact class slot rotates week to week
   and lives behind a booking widget (Momence / MindBody / Zen Planner). The UI
   marks those with a 🔍 and links straight to the booking page. Turning 🔍
   entries into pinned times is the weekly refresh routine's main job. */
window.ATHENA_DATA = {
  "weekLabel": "Aug 31 – Sep 4, 2026",
  "weekMonday": "2026-08-31",
  "updated": "September 4, 2026",
  "who": "Athena",

  "venues": {
    "ISHTA Yoga": {
      "address": "816 Broadway (mezzanine), between 11th & 12th St",
      "neighborhood": "Union Square / Greenwich Village",
      "lat": 40.7326, "lng": -73.9922,
      "walkMinutes": 6,
      "url": "https://ishtayoga.com/schedule",
      "phone": "(646) 559-1578",
      "hours": "Evening block Mon 5:45–8:30pm · Tue 4:30–8:30pm · Wed 6:00–8:30pm"
    },
    "Peridance Center": {
      "address": "126 East 13th Street, between 3rd & 4th Ave",
      "neighborhood": "Union Square / East Village",
      "lat": 40.7327, "lng": -73.9878,
      "walkMinutes": 8,
      "url": "https://www.peridance.com/open-classes",
      "phone": "(212) 505-0886",
      "hours": "Mon–Fri 9:00am–8:00pm · Sat 9–7 · Sun 9–5"
    },
    "Gibney — 890 Broadway": {
      "address": "890 Broadway, 5th Floor (at 19th St)",
      "neighborhood": "Flatiron / Union Square",
      "lat": 40.7382, "lng": -73.9897,
      "walkMinutes": 5,
      "url": "https://gibneydance.org/class-schedule/",
      "phone": "(212) 677-8560",
      "hours": "Mon–Fri 8:00am–9:00pm · Sat 9–8 · closed Sun"
    },
    "Pure Barre Union Square": {
      "address": "78 Fifth Avenue, Floor 4 (at 14th St)",
      "neighborhood": "Union Square / Flatiron",
      "lat": 40.7366, "lng": -73.9928,
      "walkMinutes": 4,
      "url": "https://www.purebarre.com/location/new-york-union-square-ny",
      "phone": "(646) 952-0171",
      "hours": "Mon–Thu 4:00–9:00pm · Fri 4:00–8:00pm (evening block)"
    },
    "Om Factory": {
      "address": "873 Broadway, 2nd Floor (at 18th St)",
      "neighborhood": "Flatiron / Union Square",
      "lat": 40.7378, "lng": -73.9899,
      "walkMinutes": 4,
      "url": "https://www.omfactory.yoga/",
      "phone": "(212) 353-3500",
      "hours": "Mon–Tue to 9:00pm · Wed–Fri to 10:30pm"
    }
  },

  "events": [
    {
      "title": "ISHTA Basics — the beginner's on-ramp",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "Beginner",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "19:15",
      "when": "Weeknight evenings inside ISHTA's verified evening block. Pick the exact slot on Momence.",
      "timeVerified": false,
      "cost": "$32 drop-in · Community classes $15 · Trial week $32 (unlimited, 7 days, local residents)",
      "url": "https://ishtayoga.com/schedule",
      "notes": "This is the room Athena already liked, so it's the safe default. ISHTA Basics is the explicit newcomer class — the studio describes it as \"detailed cues and a gentle approach,\" built to let you find your own starting point regardless of experience. ISHTA is a real lineage (Integrated Science of Hatha, Tantra and Ayurveda), not a workout brand: expect asana, pranayama and a few minutes of meditation rather than a soundtrack and a leaderboard. Pre-booking through Momence is effectively required — the mezzanine studio is small. The $32 trial week is the best value in the neighborhood if she wants to test two or three formats in one go.",
      "confidence": "high"
    },
    {
      "title": "All Levels + Yoga Nidra",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:30",
      "end": "19:45",
      "when": "Evening slot inside ISHTA's weeknight block — confirm the night on Momence.",
      "timeVerified": false,
      "cost": "$32 drop-in (packs from $139 / 5 classes)",
      "url": "https://ishtayoga.com/descriptions",
      "notes": "A balanced practice that ends with 10–15 minutes of guided yoga nidra — lying completely still while the teacher talks you down into what ISHTA calls \"deep relaxation while exploring an expanded state of awareness.\" This is the single best pick after a bad day at work: you get the movement, and then someone hands you twenty minutes of doing absolutely nothing. Non-negotiable tip — bring a layer, because body temperature drops fast during nidra.",
      "confidence": "high"
    },
    {
      "title": "Yin Yoga / Yin + Thai Massage",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["tue", "wed", "thu"],
      "start": "19:00",
      "end": "20:15",
      "when": "Late-evening slot; ISHTA's studio block runs to 8:30pm most weeknights.",
      "timeVerified": false,
      "cost": "$32 drop-in",
      "url": "https://ishtayoga.com/descriptions",
      "notes": "Long-held seated and floor poses — three to five minutes each — aimed at fascia and the nervous system rather than muscle. The Thai massage variant adds hands-on assists and acupressure from the teacher. Almost no standing, no heat, no flow: this is the one to book on a night when the idea of a vinyasa sounds actively unpleasant. Good for anyone who sits at a desk all day.",
      "confidence": "high"
    },
    {
      "title": "Vinyasa Flow / ISHTA Power",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "Intermediate",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:15",
      "end": "19:30",
      "when": "Evening slot inside ISHTA's weeknight block — confirm on Momence.",
      "timeVerified": false,
      "cost": "$32 drop-in",
      "url": "https://ishtayoga.com/descriptions",
      "notes": "The sweaty end of the ISHTA menu. Vinyasa Flow connects breath to movement through creative sequencing; ISHTA Power is explicitly \"strong, fast-paced,\" built on heat-generating sequences. Book this on a night with energy to burn — and note it's a genuinely different room from Basics, so it's not the one to bring a first-timer to.",
      "confidence": "high"
    },
    {
      "title": "Community class (donation-friendly)",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:00",
      "end": "19:00",
      "when": "Community slots move around the week — check the schedule.",
      "timeVerified": false,
      "cost": "$15 community rate · some donation classes from $5",
      "url": "https://ishtayoga.com/pricing",
      "notes": "Taught by graduates of ISHTA's apprenticeship program at a reduced rate, all levels welcome with modifications offered in both directions. Half the price of a regular drop-in and the teachers are usually trying harder. The cheapest legitimate way to make yoga a twice-a-week habit instead of a treat.",
      "confidence": "high"
    },
    {
      "title": "Adult Beginner Ballet",
      "venue": "Peridance Center",
      "category": "ballet",
      "discipline": "Ballet",
      "level": "Absolute beginner welcome",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "19:00",
      "end": "20:30",
      "when": "Evening adult beginner ballet runs 7:00–8:30pm. Registration opens 5 days ahead and closes at class start.",
      "timeVerified": true,
      "cost": "$27 single class · $24 student/senior/union · 10-class card $250",
      "url": "https://www.peridance.com/open-classes",
      "notes": "The answer to \"maybe a dance class or ballet.\" Peridance runs 250+ drop-in classes a week and grades them honestly from Intro (no experience required) up through Advanced, so an adult beginner is a normal customer here rather than a brave exception. The 7:00–8:30pm beginner ballet is the flagship evening slot. Practical notes: register online or in the MindBody app, registration opens five days before and closes when class starts, so don't plan to walk in cold at 6:55. Ballet slippers, not sneakers — the front desk sells them if needed. Four minutes from the L/N/Q/R/W/4/5/6.",
      "confidence": "high"
    },
    {
      "title": "Open contemporary, jazz & heels",
      "venue": "Peridance Center",
      "category": "dance",
      "discipline": "Dance",
      "level": "Intro to Advanced (graded)",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:30",
      "end": "20:00",
      "when": "Evening classes daily; Peridance is open Mon–Fri 9am–8pm. Confirm the exact style and slot on the daily schedule.",
      "timeVerified": false,
      "cost": "$27 single class · 10-class card $250 (valid 4 months)",
      "url": "https://www.peridance.com/open-classes",
      "notes": "If ballet feels too formal, this is the same building with a much looser dress code — contemporary, jazz, hip hop, heels, Afro-Caribbean, plus a deep bench of guest teachers. Levels are labelled Intro / Beginner / Advanced Beginner / Intermediate / Open, and \"Open\" genuinely means mixed. A good format to try once with zero commitment: pay the $27, stand in the back, leave if it's wrong.",
      "confidence": "high"
    },
    {
      "title": "Ballet, Floor Barre & Countertechnique",
      "venue": "Gibney — 890 Broadway",
      "category": "ballet",
      "discipline": "Dance",
      "level": "Beginner through advanced",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:00",
      "end": "19:30",
      "when": "Evening classes from 6:00pm on weeknights; the building is open Mon–Fri 8am–9pm.",
      "timeVerified": false,
      "cost": "Drop-in — confirm the current rate when booking",
      "url": "https://gibneydance.org/class-schedule/",
      "notes": "The closest serious dance building to the apartment — 890 Broadway is the legendary rehearsal address, with American Ballet Theatre's home studios in the same building. Gibney's open program covers Ballet, Pointe, Floor Barre, Contemporary, Countertechnique, Gaga, Improvisation, Floorwork, Simonson, Pilates, somatic practices and street/club styles, all drop-in, all graded beginner→advanced. Floor Barre is the sleeper pick: ballet conditioning done lying on the floor, brutal on the core and completely joint-friendly. Fifth floor.",
      "confidence": "medium"
    },
    {
      "title": "Pilates & somatic practice",
      "venue": "Gibney — 890 Broadway",
      "category": "pilates",
      "discipline": "Pilates",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:30",
      "end": "19:30",
      "when": "Weeknight evenings inside Gibney's 8am–9pm operating window.",
      "timeVerified": false,
      "cost": "Drop-in — confirm the current rate when booking",
      "url": "https://gibneydance.org/classes/",
      "notes": "Mat Pilates and somatic work taught by dance faculty rather than fitness instructors, which shows — more attention to how you're organising the movement, less counting. Worth pairing with a ballet class earlier in the week; the vocabulary overlaps and the two reinforce each other.",
      "confidence": "medium"
    },
    {
      "title": "Pure Barre — Classic, Align & Empower",
      "venue": "Pure Barre Union Square",
      "category": "barre",
      "discipline": "Barre",
      "level": "All levels",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "18:50",
      "when": "Verified evening block Mon–Thu 4:00–9:00pm (Fri to 8:00pm). Individual class times on the studio schedule.",
      "timeVerified": false,
      "cost": "First class free · packages and memberships vary",
      "url": "https://www.purebarre.com/location/new-york-union-square-ny",
      "notes": "The low-impact, high-rep end of the barre spectrum — isometric holds, light weights, a lot of very small movements that hurt more than they look like they should. Five formats: Classic (the signature), Align (slower, stretch and stability), Empower (cardio), Define (strength) and an intro class. Classes are about 50 minutes, which is the real selling point on a weeknight — in and out before 7pm. Fun logistics note: this is the same building as Mushin MMA, which is on the 2nd floor. Athena on 4, Jordan on 2, same elevator, same walk home.",
      "confidence": "high"
    },
    {
      "title": "Aerial yoga & aerial dance",
      "venue": "Om Factory",
      "category": "yoga",
      "discipline": "Aerial",
      "level": "Beginner welcome",
      "days": ["wed", "thu", "fri"],
      "start": "19:30",
      "end": "20:45",
      "when": "The late option — open until 10:30pm Wed, Thu and Fri (Mon/Tue close at 9pm).",
      "timeVerified": false,
      "cost": "New Student 4-Pack (one-time, valid one month) · call for current rates",
      "url": "https://www.omfactory.yoga/",
      "notes": "The most fun thing on Athena's list and the best answer to a late finish — Om Factory runs until 10:30pm on Wednesday, Thursday and Friday, when every other studio nearby has shut. Aerial yoga uses a fabric hammock to take the load off your spine, so inversions are accessible on day one; aerial dance and circus classes go further into choreography and apparatus. Genuinely beginner-friendly and much less intimidating than it looks. Four minutes up Broadway from Union Square, second floor.",
      "confidence": "high"
    }
  ],

  "itineraries": {
    "mon": {
      "summary": "Monday is the ISHTA night — it's the room she already likes, and the studio opens its evening block at 5:45pm.",
      "picks": [
        { "key": "ishta-basics-the-beginner-s-on-ramp", "note": "The default. Gentle, well-cued, home in an hour." },
        { "key": "pure-barre-classic-align-empower", "note": "50 minutes, done before 7pm — the low-effort-decision option." },
        { "key": "adult-beginner-ballet", "note": "If Monday wants to be a bigger night: 7:00–8:30pm at Peridance." }
      ]
    },
    "tue": {
      "summary": "Tuesday has ISHTA's widest window (4:30–8:30pm) — the easiest night to get the exact class she wants.",
      "picks": [
        { "key": "all-levels-yoga-nidra", "note": "Movement plus twenty minutes of guided nothing. Bring a layer." },
        { "key": "ballet-floor-barre-countertechnique", "note": "Five minutes away at 890 Broadway. Floor Barre is the sleeper pick." },
        { "key": "yin-yoga-yin-thai-massage", "note": "For a desk-heavy day — almost no standing." }
      ]
    },
    "wed": {
      "summary": "Midweek the late studios open up. Om Factory runs to 10:30pm, so a 7:30pm start still works.",
      "picks": [
        { "key": "aerial-yoga-aerial-dance", "note": "The fun one. The hammock takes the load off the spine — inversions on day one." },
        { "key": "vinyasa-flow-ishta-power", "note": "If there's energy to burn. Not the night to bring a first-timer." },
        { "key": "open-contemporary-jazz-heels", "note": "Looser dress code than ballet, same building." }
      ]
    },
    "thu": {
      "summary": "Thursday is the strongest ballet night — Peridance beginner ballet at 7:00, and Gibney open till 9.",
      "picks": [
        { "key": "adult-beginner-ballet", "note": "7:00–8:30pm. Register by five days out; it closes at class start." },
        { "key": "pilates-somatic-practice", "note": "Dance faculty teaching Pilates — pairs well with the ballet." },
        { "key": "yin-yoga-yin-thai-massage", "note": "The recovery option if the week has been long." }
      ]
    },
    "fri": {
      "summary": "Friday is thin on purpose — most studios close early. Om Factory to 10:30pm is the exception.",
      "picks": [
        { "key": "aerial-yoga-aerial-dance", "note": "Open latest of anything nearby. A good start to a Friday night." },
        { "key": "community-class-donation-friendly", "note": "$15, low stakes — no one is trying to peak on a Friday." },
        { "key": "open-contemporary-jazz-heels", "note": "Peridance runs to 8pm Fridays — go early." }
      ]
    }
  }
};
