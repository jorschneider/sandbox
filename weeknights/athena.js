/* Athena's weeknight movement — yoga, pilates/barre, dance & ballet.
   Everything here is inside 20 MINUTES DOOR-TO-DOOR of Union Square (most of
   it is a short walk; Broadway Dance Center is the one train ride).

   Venue facts (address, coordinates, travel, booking URL) live once in
   `venues`; each entry in `events` is a class FORMAT offered at one of them.

   ISHTA is Athena's favourite (`favoriteVenue`) — its classes sort first. Its
   seven weeknight-evening formats below are the REAL ones on ISHTA's Momence
   schedule, verified across three consecutive weeks. Each carries `match`,
   the exact Momence class name, so fetch-schedules.cjs can keep the live
   times and teachers current in slots.js. Earlier guesses (ISHTA Basics,
   Vinyasa/Power, Community) don't run on weeknight evenings and were removed.

   timeVerified:false means venue, price and booking link are confirmed but the
   exact slot sits behind a widget the fetcher can't read yet (MindBody blocks
   bots). The UI marks those with a 🔍. */
window.ATHENA_DATA = {
  "weekLabel": "Aug 31 – Sep 4, 2026",
  "weekMonday": "2026-08-31",
  "updated": "September 4, 2026",
  "who": "Athena",

  /* ISHTA is Athena's favourite: its cards are starred. Lists sort purely by
     start time (earliest first) — Jordan asked for that explicitly, so do not
     reintroduce favourite-first sorting. Keep this field for the star. */
  "favoriteVenue": "ISHTA Yoga",

  "venues": {
    "ISHTA Yoga": {
      "address": "816 Broadway (mezzanine), between 11th & 12th St",
      "neighborhood": "Union Square / Greenwich Village",
      "lat": 40.7326, "lng": -73.9922,
      "walkMinutes": 6,
      "url": "https://ishtayoga.com/schedule",
      "phone": "(646) 559-1578",
      "hours": "Weeknight evening classes run 4:30–8:35pm; the studio opens 15 minutes before each class"
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
    },
    "Power Pilates Flatiron": {
      "address": "327 Park Avenue South, 2nd Floor (at 24th St)",
      "neighborhood": "Flatiron / Gramercy",
      "lat": 40.7413, "lng": -73.9853,
      "walkMinutes": 10,
      "url": "https://powerpilates.com/flatiron/",
      "phone": "(212) 627-5852",
      "hours": "Evening reformer, tower and mat classes on weeknights — schedule on MindBody"
    },
    "Broadway Dance Center": {
      "address": "322 West 45th Street, between 8th & 9th Ave",
      "neighborhood": "Theater District",
      "lat": 40.7594, "lng": -73.9895,
      "walkMinutes": 40,
      "travelMinutes": 18,
      "travelHow": "18 min — N/Q/R/W from Union Sq to Times Sq–42nd St, then a 6-minute walk west",
      "url": "https://broadwaydancecenter.com/schedule",
      "phone": "(212) 582-9304",
      "hours": "350+ drop-in classes a week; evening classes nightly"
    }
  },

  /* Who actually teaches at 816 Broadway. Athena asked. The honest headline is
     that ISHTA's two most famous names are no longer the ones in the room:
     ISHTA's own lineage page places Alan Finger and Sarah Platt-Finger in
     Florida, and Mona Anand in New York. Mona is the Yogiraj she is most
     likely to meet — and per the live schedule she teaches the Tuesday 5pm
     Restorative/Yoga Nidra herself. Faculty rosters drift — re-read
     /our-instructors weekly. */
  "teachers": {
    "ISHTA Yoga": {
      "url": "https://ishtayoga.com/our-instructors",
      "lineage": "ISHTA is both a Sanskrit word — \"that which resonates with the individual spirit\" — and an acronym: the Integrated Science of Hatha, Tantra and Ayurveda. It was built in late-1960s South Africa by Mani Finger and his son Alan, who studied alongside him from the age of fifteen. Mani was initiated into Kriya Yoga by Paramahansa Yogananda in Los Angeles and later as a Kavi yogi by Sivananda in India; both father and son were initiated into Tantra by Shuddhanand Bharati. Alan brought it to Los Angeles in 1975 and opened the New York headquarters in 1993. The system's whole premise is that you draw selectively from those traditions based on what you personally need, rather than working toward a standard pose — which is why the teacher you get matters more here than at a studio with a fixed sequence.",
      "inTheRoom": "Alan and Sarah are now based in Florida. The Yogiraj teaching in New York is Mona Anand — Tuesdays at 5pm, per the live schedule — alongside the weeknight faculty below.",
      "seniors": [
        {
          "name": "Mona Anand",
          "title": "Yogiraj · co-owner & managing director · teaches Tue 5:00pm",
          "note": "The senior teacher actually in New York, and — per ISHTA's own booking schedule — the one teaching the Tuesday 5:00pm Restorative/Yoga Nidra. That's the single best class on Athena's whole list. She created a nine-step nidra system with Alan Finger, taught as \"Mona Anand's ISHTA Yoga Nidra,\" and designed the \"Yoga Nidra and The Chakras\" training with recordings aimed at different ends: deep relaxation or sleep, lifting your mood, grounding, or correcting specific chakra and dosha imbalances. She also co-developed Anand Menza Restorative, ISHTA's own take on restorative yoga using visualisation, pranayama, kriya and Ayurveda. She grew up with nidra in Mumbai, has a Master's in International Affairs from Columbia, and leads ISHTA's 200- and 300-hour trainings."
        },
        {
          "name": "Douglass Stewart",
          "title": "Senior trainer · teaches weeknight All Levels & Flow + Meditate",
          "note": "On the live schedule for Thursday All Levels and Friday Flow + Meditate (rotating with Celine Guillaume and Elena Skovorodko). Has taught in the ISHTA tradition and its earlier incarnations — Yoga Zone, Be Yoga, the ISHTA Yoga Center — since 2000, one of the longest continuous teaching histories in the lineage."
        },
        {
          "name": "Susan Ingraham",
          "title": "Faculty · teaches ISHTA Yin + Thai Massage, Mon 7:30pm & Fri 5:00pm",
          "note": "The hands-on one: her Yin + Thai Massage class blends long-held floor poses with Thai bodywork assists and acupressure from the teacher. Twice a week on the live schedule."
        },
        {
          "name": "Elena Skovorodko",
          "title": "Faculty · Stretch + Restore with Sound Bath, Wed & Fri 7:30pm",
          "note": "Teaches the sound-bath class both nights it runs, plus Tuesday All Levels and Friday Flow + Meditate on rotation. The most-scheduled evening teacher at the studio right now."
        },
        {
          "name": "Elissa Lewis",
          "title": "Faculty · Flow + Restore, Mon 6:15pm & Thu 4:30pm",
          "note": "Owns the Flow + Restore slot on Monday and Thursday — the format that starts as a flow and lands in restorative poses, which is the best fit for a bad day at work."
        },
        {
          "name": "Celine Guillaume",
          "title": "Faculty · Evening Flow + Yin, Tue 7:35pm",
          "note": "The latest class of the week is hers: Evening Flow + Yin at 7:35pm on Tuesdays, plus Thursday All Levels on rotation."
        },
        {
          "name": "Alan Finger & Sarah Platt-Finger",
          "title": "Founder (Kavi Yogiraj) & Teacher Training Director — Florida-based",
          "note": "The names on the door, and the method is theirs, but don't expect either on a Tuesday. Alan co-founded ISHTA with his father Mani; Sarah built the teacher training and created the signature \"Sweat + Samadhi.\" Peter Ferko and Wendy Newton (both Yogiraj, both senior trainers, Wendy co-authored \"Tantra of the Yoga Sutras\" with Alan) round out the senior faculty but aren't on the weeknight evening schedule this month."
        }
      ],
      "faculty": [
        "Kelly Eudailey", "Phil Schuster", "Corinne Tocmacov", "Puy Navarro", "Cassandra Ferland",
        "Mary Jo Marchisello", "Amy Coombs", "Cathy Lilly", "Stephen Mark", "Helen Jansson",
        "Jennifer Chang", "Tracy Balzano", "Rina Deshpande", "Amanda Fuller", "Kirsti Craig",
        "Peter Ferko", "Wendy Newton"
      ]
    }
  },

  "events": [
    {
      "title": "Restorative / Yoga Nidra with Mona Anand",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels — the gentlest class on the list",
      "days": ["tue"],
      "start": "17:00",
      "end": "18:00",
      "when": "Tuesdays 5:00–6:00pm, taught by Mona Anand. Verified on ISHTA's live schedule three weeks running.",
      "timeVerified": true,
      "match": ["Restorative/Yoga Nidra"],
      "cost": "$32 drop-in · Trial week $32 (unlimited, 7 days, local residents) · packs from $139 / 5",
      "url": "https://ishtayoga.com/schedule",
      "notes": "The best hour on Athena's whole list. This is ISHTA's co-owner and New York Yogiraj teaching the format she is known for worldwide — Mona Anand's nine-step yoga nidra, developed with Alan Finger — in a one-hour restorative slot. Props, blankets, almost no effort, and a guided descent into the state ISHTA describes as \"deep relaxation while exploring an expanded state of awareness.\" It sits at 5:00pm, which is early for a work night — but it is the one class on this page where the teacher is the reason to go. Pre-book on Momence; it fills. Bring a layer: body temperature drops fast in nidra.",
      "confidence": "high"
    },
    {
      "title": "All Levels",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels — the beginner-safe evening room",
      "days": ["tue", "thu"],
      "start": "18:15",
      "end": "19:25",
      "when": "Tue 6:15–7:25pm and Thu 6:15–7:30pm. Teachers rotate: Elena Skovorodko, Douglass Stewart, Celine Guillaume.",
      "timeVerified": true,
      "match": ["All Levels"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "ISHTA's own description: \"a well-rounded class that welcomes a wide range of students and levels, encouraging students to individualize\" — sequences simple enough for a beginner, with cues layered on for anyone further along. Note that ISHTA Basics, the explicit newcomer class, does NOT run on weeknight evenings; this is the evening equivalent, and it's the right first class for anyone new to the studio. The 6:15 start is the sweet spot for a normal finish at work. 75 minutes on Tuesday, 75 on Thursday.",
      "confidence": "high"
    },
    {
      "title": "Flow + Restore",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["mon", "wed", "thu"],
      "start": "18:15",
      "end": "19:15",
      "when": "Mon 6:15pm (Elissa Lewis) · Wed 6:15pm (Phil Schuster / Corinne Tocmacov) · Thu 4:30pm (Elissa Lewis). One hour.",
      "timeVerified": true,
      "match": ["Flow + Restore"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "The most-scheduled format on ISHTA's evening timetable and the best answer to a bad day: it begins with flowing movement to \"awaken your body and connect with your breath,\" then hands you over to restorative poses to let the tension go. You get the workout half and the collapse half in one hour. The Thursday 4:30pm is early — an option for a short day, not a default.",
      "confidence": "high"
    },
    {
      "title": "ISHTA Yin + Thai Massage",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["mon", "fri"],
      "start": "19:30",
      "end": "20:30",
      "when": "Mon 7:30–8:30pm and Fri 5:00–6:00pm, both with Susan Ingraham.",
      "timeVerified": true,
      "match": ["ISHTA Yin + Thai Massage"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "Long-held seated and floor poses — three to five minutes each — aimed at fascia and the nervous system, with hands-on Thai massage assists and acupressure from the teacher. Almost no standing, no heat, no flow. The Monday 7:30pm is the latest ISHTA class of the week, which makes it the one to book after a late finish; the Friday 5pm is a soft start to the weekend. Good for anyone who sits at a desk all day.",
      "confidence": "high"
    },
    {
      "title": "Evening Flow + Yin",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["tue"],
      "start": "19:35",
      "end": "20:35",
      "when": "Tuesdays 7:35–8:35pm with Celine Guillaume.",
      "timeVerified": true,
      "match": ["Evening Flow + Yin"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "The latest start of anything at ISHTA — 7:35pm — which makes Tuesday the one night you can get there from an 7pm finish. Flow first, then yin holds to close. Tuesday is also ISHTA's fullest evening (three classes back to back: Mona's nidra at 5, All Levels at 6:15, this at 7:35), so if she's picking one night a week to make ISHTA a habit, this is it.",
      "confidence": "high"
    },
    {
      "title": "Stretch + Restore with Sound Bath",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["wed", "fri"],
      "start": "19:30",
      "end": "20:30",
      "when": "Wed and Fri 7:30–8:30pm with Elena Skovorodko.",
      "timeVerified": true,
      "match": ["Stretch + Restore with Sound Bath"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "Stretching and restorative postures on props, with singing bowls and gongs layered over the second half — ISHTA pitches it as \"deeper layers of surrender and healing,\" which is a fair description of what a sound bath does to a nervous system at 8pm on a Wednesday. The 7:30 start makes it the late option midweek and on Friday. Zero athletic demand.",
      "confidence": "high"
    },
    {
      "title": "Flow + Meditate",
      "venue": "ISHTA Yoga",
      "category": "yoga",
      "discipline": "Yoga",
      "level": "All levels",
      "days": ["fri"],
      "start": "18:15",
      "end": "19:15",
      "when": "Fridays 6:15–7:15pm, Douglass Stewart / Elena Skovorodko on rotation.",
      "timeVerified": true,
      "match": ["Flow + Meditate"],
      "cost": "$32 drop-in · Trial week $32",
      "url": "https://ishtayoga.com/schedule",
      "notes": "A flow that closes with a proper seated meditation rather than a savasana — the most ISHTA-ish format on the schedule, since meditation is the part of the lineage the studio actually cares about most. Friday 6:15 is the right slot for it: end the week, then sit still for ten minutes. Pairs with the 7:30 sound bath if she wants to make an evening of it.",
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
      "title": "Reformer & Tower — classical Pilates",
      "venue": "Power Pilates Flatiron",
      "category": "pilates",
      "discipline": "Pilates",
      "level": "All levels; new clients start with privates",
      "days": ["mon", "tue", "wed", "thu"],
      "start": "18:00",
      "end": "18:55",
      "when": "Weeknight evening reformer and tower classes — book the exact slot on the studio's MindBody schedule.",
      "timeVerified": false,
      "cost": "Reformer $55 · Tower $47 · Mat $29 per class · new client offer: 3 private sessions for $169 (usually $405)",
      "url": "https://powerpilates.com/flatiron/",
      "notes": "The proper reformer studio Athena's side was missing. Power Pilates is a classical school — the original Joseph Pilates order and apparatus, not the reformer-cardio hybrid the chains sell — and the Flatiron studio at Park Avenue South and 24th is a ten-minute walk. The $169 three-private intro is the real deal here: new reformer clients genuinely need a few one-on-ones before group classes make sense, and it's less than half the normal price. Tower classes are the underrated middle step between mat and reformer. Second floor.",
      "confidence": "high"
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
    },
    {
      "title": "Adult ballet, jazz & theater dance",
      "venue": "Broadway Dance Center",
      "category": "dance",
      "discipline": "Dance",
      "level": "Absolute beginner through professional (graded)",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "18:30",
      "end": "20:00",
      "when": "Evening classes nightly across 350+ weekly drop-ins. Check the schedule page for the night's level and style.",
      "timeVerified": false,
      "cost": "Drop-in — confirm the current rate on the rates page (the site blocks automated readers, so it couldn't be verified)",
      "url": "https://broadwaydancecenter.com/schedule",
      "notes": "The one venue on Athena's side that needs a train, and the reason the radius went to 20 minutes: Broadway Dance Center is the original drop-in dance school — founded 1984, 350+ classes a week, everything from absolute-beginner ballet to the professional-level classes that Broadway ensembles actually take. If Peridance's beginner ballet becomes a habit and she wants a bigger room with more levels to climb through, this is where it leads. N/Q/R/W to Times Square, six minutes west. Not a first-week pick; a third-month one.",
      "confidence": "medium"
    }
  ],

  "itineraries": {
    "mon": {
      "summary": "Monday at ISHTA is a two-act night — Flow + Restore at 6:15, then the latest ISHTA class of the week, Yin + Thai Massage at 7:30. Pure Barre is the quick option.",
      "picks": [
        { "key": "flow-restore", "note": "6:15pm with Elissa Lewis. Flow, then collapse. The default." },
        { "key": "ishta-yin-thai-massage", "note": "7:30pm — the one to book after a late finish. Hands-on assists." },
        { "key": "pure-barre-classic-align-empower", "note": "50 minutes, done before 7pm — the low-effort-decision option." },
        { "key": "reformer-tower-classical-pilates", "note": "Classical reformer ten minutes away. Start with the $169 privates." }
      ]
    },
    "tue": {
      "summary": "Tuesday is ISHTA's fullest night and the best of her week: Mona Anand herself at 5:00, All Levels at 6:15, the latest start in the building at 7:35.",
      "picks": [
        { "key": "restorative-yoga-nidra-with-mona-anand", "note": "5:00pm. The co-owner teaching her own nidra system. Book ahead." },
        { "key": "all-levels", "note": "6:15pm — the beginner-safe evening room, 75 minutes." },
        { "key": "evening-flow-yin", "note": "7:35pm start — reachable from a 7pm finish." },
        { "key": "ballet-floor-barre-countertechnique", "note": "Five minutes away at 890 Broadway. Floor Barre is the sleeper pick." }
      ]
    },
    "wed": {
      "summary": "Midweek: ISHTA's sound bath at 7:30, and the late studios open up — Om Factory runs to 10:30pm.",
      "picks": [
        { "key": "flow-restore", "note": "6:15pm. Phil Schuster or Corinne Tocmacov." },
        { "key": "stretch-restore-with-sound-bath", "note": "7:30pm with Elena Skovorodko. Singing bowls, zero athletic demand." },
        { "key": "aerial-yoga-aerial-dance", "note": "The fun one. The hammock takes the load off the spine." },
        { "key": "open-contemporary-jazz-heels", "note": "Looser dress code than ballet, same building." }
      ]
    },
    "thu": {
      "summary": "Thursday: All Levels at ISHTA at 6:15, then Peridance beginner ballet at 7:00 — or the 4:30 Flow + Restore on a short day.",
      "picks": [
        { "key": "all-levels", "note": "6:15–7:30pm. Douglass Stewart or Celine Guillaume." },
        { "key": "adult-beginner-ballet", "note": "7:00–8:30pm. Register by five days out; it closes at class start." },
        { "key": "flow-restore", "note": "4:30pm — only if the day ends early." },
        { "key": "pilates-somatic-practice", "note": "Dance faculty teaching Pilates — pairs well with the ballet." }
      ]
    },
    "fri": {
      "summary": "Friday at ISHTA runs three deep — Yin + Thai Massage at 5, Flow + Meditate at 6:15, sound bath at 7:30. Om Factory is open latest.",
      "picks": [
        { "key": "ishta-yin-thai-massage", "note": "5:00pm with Susan Ingraham — a soft start to the weekend." },
        { "key": "flow-meditate", "note": "6:15pm. Ends in a seated meditation, not a savasana." },
        { "key": "stretch-restore-with-sound-bath", "note": "7:30pm. Pair it with the 6:15 to make an evening of it." },
        { "key": "aerial-yoga-aerial-dance", "note": "Open latest of anything nearby — a good start to a Friday night." }
      ]
    }
  }
};
