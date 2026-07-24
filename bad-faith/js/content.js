// Bad Faith — Animal Insurance Division
// Content decks: clients, intel, flavor. All numbers are dollars.
// baseRisk is hidden from players; rating is "the brochure" and is
// occasionally a lie. Intel deltas only apply when the card is dealt.

export const GAME_NAME = 'Bad Faith';
export const GAME_SUBTITLE = 'Animal Insurance Division';

export const AVATARS = ['🦊', '🦉', '🐊', '🐐', '🦈', '🐝', '🦃', '🐍'];

export const CLIENTS = [
  {
    id: 'ostrich-downs',
    name: 'Ostrich Downs Racing League',
    emoji: '🏁',
    tagline: 'The fastest birds that absolutely cannot fly.',
    coverage: 1500, band: [250, 500], baseRisk: 0.25, rating: 'Moderate',
    intel: [
      { id: 'od1', text: 'Thunderhoof, their star ostrich, has bitten three jockeys this season.', delta: 0.20 },
      { id: 'od2', text: 'New padded track installed. Trip injuries are way down.', delta: -0.10 },
      { id: 'od3', text: 'Every race is scheduled during hatching season. The birds are furious.', delta: 0.15 },
    ],
    claimText: 'Mass pile-up at the first bend. Feathers everywhere. Jockeys suing.',
    safeText: 'A full season of clean, flightless racing.',
  },
  {
    id: 'peacock-collective',
    name: 'Emotional Support Peacock Collective',
    emoji: '🦚',
    tagline: '“They sense your anxiety. Then they scream.”',
    coverage: 900, band: [150, 350], baseRisk: 0.30, rating: 'Low',
    intel: [
      { id: 'pc1', text: 'Three peacocks were denied boarding at the airport last week. Litigation brewing.', delta: 0.20 },
      { id: 'pc2', text: 'They hired a peacock behaviorist. The screaming is down 40%.', delta: -0.15 },
      { id: 'pc3', text: 'Mating season starts this quarter. Nobody is emotionally supported during mating season.', delta: 0.15 },
    ],
    claimText: 'A peacock screamed during a live newscast. The anchor is suing for hearing loss.',
    safeText: 'The peacocks provided adequate emotional support. Mostly by staying quiet.',
  },
  {
    id: 'prize-goldfish',
    name: "Sir Reginald's Prize Goldfish",
    emoji: '🐠',
    tagline: 'One goldfish. Insured like a Fabergé egg.',
    coverage: 2000, band: [200, 450], baseRisk: 0.15, rating: 'High',
    intel: [
      { id: 'gf1', text: 'The "prize goldfish" is actually the fourth identical replacement. Sir Reginald has no idea.', delta: -0.10 },
      { id: 'gf2', text: "Sir Reginald's cat has learned to open the study door.", delta: 0.30 },
      { id: 'gf3', text: 'The fish has a dedicated veterinarian on retainer.', delta: -0.05 },
    ],
    claimText: 'The goldfish is gone. The cat is not talking.',
    safeText: 'The goldfish swam in circles, worth every penny.',
  },
  {
    id: 'buzz-empire',
    name: 'Buzz Empire Apiaries',
    emoji: '🐝',
    tagline: '40 million employees. Zero HR department.',
    coverage: 1200, band: [200, 400], baseRisk: 0.28, rating: 'Moderate',
    intel: [
      { id: 'be1', text: 'A rival beekeeper has been parking his hives suspiciously close to the property line.', delta: 0.15 },
      { id: 'be2', text: 'This year\'s queen is, according to staff, "an absolute unit". Hive morale is excellent.', delta: -0.15 },
      { id: 'be3', text: 'They rented the bees out for 12 back-to-back almond pollinations. The bees are exhausted.', delta: 0.20 },
    ],
    claimText: 'The colony absconded overnight. All 40 million employees quit at once.',
    safeText: 'Record honey yield. The queen sends her regards.',
  },
  {
    id: 'llama-drama',
    name: 'Llama Drama Petting Zoo',
    emoji: '🦙',
    tagline: 'The llamas know exactly what they did.',
    coverage: 1000, band: [180, 380], baseRisk: 0.30, rating: 'Moderate',
    intel: [
      { id: 'ld1', text: 'One llama has learned to undo gate latches. The others watch and learn.', delta: 0.20 },
      { id: 'ld2', text: 'New "no spitting" training program is showing real results.', delta: -0.15 },
      { id: 'ld3', text: 'A kids\' birthday party chain just signed a weekly booking. Exposure doubled.', delta: 0.15 },
    ],
    claimText: 'The llamas staged a coordinated breakout during a gender reveal party.',
    safeText: 'The llamas behaved. Suspicious, but profitable.',
  },
  {
    id: 'capybara-springs',
    name: 'Capybara Hot Springs Resort',
    emoji: '🛁',
    tagline: 'The calmest business on Earth.',
    coverage: 800, band: [120, 260], baseRisk: 0.15, rating: 'Low',
    intel: [
      { id: 'cs1', text: 'The capybaras have accepted a crocodile into their friend group. He seems nice?', delta: 0.25 },
      { id: 'cs2', text: 'A wellness influencer with 4M followers is filming there next month.', delta: 0.10 },
      { id: 'cs3', text: 'The springs passed every safety inspection with the calmest scores ever recorded.', delta: -0.10 },
    ],
    claimText: 'The crocodile was, in fact, not nice.',
    safeText: 'Everyone soaked. Nothing happened. Bliss.',
  },
  {
    id: 'houdini-octopus',
    name: 'Houdini the Escape Octopus',
    emoji: '🐙',
    tagline: 'Star aquarium attraction. Flight risk. Literally has eight arms.',
    coverage: 1600, band: [300, 550], baseRisk: 0.40, rating: 'Moderate',
    intel: [
      { id: 'ho1', text: 'Houdini has been observed studying the night guard\'s rounds.', delta: 0.20 },
      { id: 'ho2', text: 'The aquarium installed a new "octopus-proof" lid. Houdini seems offended.', delta: -0.15 },
      { id: 'ho3', text: 'A maintenance drain cover in his tank has been loose for weeks.', delta: 0.25 },
    ],
    claimText: 'Houdini is gone. A trail of wet suction marks leads to the harbor.',
    safeText: 'Houdini stayed. He is planning something, but he stayed.',
  },
  {
    id: 'pigeon-couriers',
    name: 'Concrete Jungle Pigeon Couriers',
    emoji: '📦',
    tagline: 'Same-day delivery, weather and breadcrumbs permitting.',
    coverage: 700, band: [120, 280], baseRisk: 0.33, rating: 'High',
    intel: [
      { id: 'pg1', text: 'A hawk has moved into the delivery corridor downtown.', delta: 0.20 },
      { id: 'pg2', text: 'Their top pigeon, Maurice, just came out of retirement. He is undefeated.', delta: -0.15 },
      { id: 'pg3', text: 'The fleet gets distracted by a new bakery on 5th. Delivery times have tripled.', delta: 0.10 },
    ],
    claimText: 'The hawk. It was always going to be the hawk.',
    safeText: 'Every package delivered, only lightly pecked.',
  },
  {
    id: 'good-boys-security',
    name: 'The Very Good Boys Security Co.',
    emoji: '🐕‍🦺',
    tagline: 'Guard dogs who love everyone. Everyone.',
    coverage: 1100, band: [180, 360], baseRisk: 0.22, rating: 'Low',
    intel: [
      { id: 'gb1', text: 'The dogs let a burglar in last month because he had treats. It was not reported.', delta: 0.25 },
      { id: 'gb2', text: 'They just hired one (1) extremely suspicious cat as a consultant. Break-ins stopped.', delta: -0.15 },
      { id: 'gb3', text: 'A client is suing over "excessive licking of authorized personnel".', delta: 0.10 },
    ],
    claimText: 'A burglary occurred. The dogs rated the burglar 10/10, very generous with treats.',
    safeText: 'Nothing was stolen. Everything was licked.',
  },
  {
    id: 'alpaca-bags',
    name: 'Alpaca My Bags Trekking Tours',
    emoji: '🎒',
    tagline: 'Mountain tours with judgmental pack animals.',
    coverage: 1000, band: [170, 340], baseRisk: 0.26, rating: 'Moderate',
    intel: [
      { id: 'ab1', text: 'The lead alpaca refuses to cross the new bridge. The detour is treacherous.', delta: 0.20 },
      { id: 'ab2', text: 'They hired an actual mountain guide instead of "vibes".', delta: -0.15 },
      { id: 'ab3', text: 'Trail reviews mention "aggressive side-eye from the animals" but five stars.', delta: -0.05 },
    ],
    claimText: 'An alpaca sat down on a cliff path and refused to move. Rescue helicopters were involved.',
    safeText: 'All treks completed. The alpacas remain unimpressed.',
  },
  {
    id: 'cluck-norris',
    name: "Cluck Norris's Free-Range Empire",
    emoji: '🐔',
    tagline: 'One rooster. Ten thousand hens. Total order.',
    coverage: 1300, band: [220, 420], baseRisk: 0.27, rating: 'Moderate',
    intel: [
      { id: 'cn1', text: 'Cluck Norris is getting old. The younger roosters have noticed.', delta: 0.20 },
      { id: 'cn2', text: 'The farm installed predator-proof fencing after "the fox incident".', delta: -0.15 },
      { id: 'cn3', text: 'An avian flu advisory was quietly issued two counties over.', delta: 0.25 },
    ],
    claimText: 'Regime change. The young roosters made their move at dawn.',
    safeText: 'Cluck Norris maintains order. The eggs flow.',
  },
  {
    id: 'sloth-delivery',
    name: 'Sloth Same-Week Delivery',
    emoji: '🦥',
    tagline: '“It will get there.” — company motto',
    coverage: 600, band: [100, 240], baseRisk: 0.20, rating: 'Low',
    intel: [
      { id: 'sd1', text: 'They accepted a contract for refrigerated goods. The sloths do not hurry for dairy.', delta: 0.25 },
      { id: 'sd2', text: 'Their new routing algorithm accounts for nap windows. Genuinely impressive.', delta: -0.10 },
      { id: 'sd3', text: 'A customer\'s "urgent" package has been 94% delivered for three weeks.', delta: 0.10 },
    ],
    claimText: 'The yogurt shipment arrived as a fully mature cheese. The customer is furious. A cheesemonger is interested.',
    safeText: 'Everything arrived. Eventually. As promised, technically.',
  },
  {
    id: 'gary-parrot',
    name: 'Gary the Parrot (Knows Too Much)',
    emoji: '🦜',
    tagline: 'Former mob accountant\'s parrot. Repeats everything.',
    coverage: 1800, band: [280, 520], baseRisk: 0.35, rating: 'Moderate',
    intel: [
      { id: 'gp1', text: 'Gary has started reciting account numbers at the farmers market.', delta: 0.25 },
      { id: 'gp2', text: 'Gary was relocated to a quiet suburb under an assumed name ("Terry").', delta: -0.20 },
      { id: 'gp3', text: 'A black sedan has been parked outside the aviary for six days.', delta: 0.20 },
    ],
    claimText: 'The aviary was "burgled". Only Gary is missing. A single feather was left as a message.',
    safeText: 'Gary said nothing incriminating this quarter. Terry, we mean Terry.',
  },
  {
    id: 'moby-richard',
    name: 'Moby Richard Whale Watching',
    emoji: '🐋',
    tagline: 'We do not insure the whale. We insure everything the whale touches.',
    coverage: 2200, band: [350, 650], baseRisk: 0.30, rating: 'High',
    intel: [
      { id: 'mr1', text: 'Moby Richard has begun breaching directly next to the boats. He thinks it\'s funny.', delta: 0.25 },
      { id: 'mr2', text: 'The captain finally repaired the bilge pump held together with gum.', delta: -0.15 },
      { id: 'mr3', text: 'They upgraded to a bigger boat. The whale sees this as a challenge.', delta: 0.15 },
    ],
    claimText: 'Moby Richard gently, lovingly, capsized the new boat. Witnesses say he waved.',
    safeText: 'The whale kept a respectful distance, which somehow felt sarcastic.',
  },
  {
    id: 'ferret-reserve',
    name: 'The Ferret Reserve',
    emoji: '💰',
    tagline: 'A vault guarded by ferrets. The ferrets also steal things.',
    coverage: 1400, band: [240, 460], baseRisk: 0.29, rating: 'Moderate',
    intel: [
      { id: 'fr1', text: 'Audit found 340 "missing" items stashed inside the walls. The ferrets deny everything.', delta: 0.15 },
      { id: 'fr2', text: 'The head ferret, Chairman Noodle, has been hoarding keys specifically.', delta: 0.25 },
      { id: 'fr3', text: 'They hired a second shift of ferrets to watch the first shift. It\'s working?', delta: -0.15 },
    ],
    claimText: 'Chairman Noodle opened the vault from the inside. The board is in shambles.',
    safeText: 'Nothing was stolen that wasn\'t recovered from inside a wall.',
  },
  {
    id: 'swan-lake-hoa',
    name: 'Swan Lake Homeowners Association',
    emoji: '🦢',
    tagline: 'The lake is lovely. The swans are a protection racket.',
    coverage: 950, band: [160, 330], baseRisk: 0.38, rating: 'Low',
    intel: [
      { id: 'sw1', text: 'The lead swan, Gregory, has bitten two HOA board members this month.', delta: 0.20 },
      { id: 'sw2', text: 'Residents have started feeding the swans "tribute". Attacks are down.', delta: -0.15 },
      { id: 'sw3', text: 'A new resident jet-skis on the lake. Gregory is assembling the others.', delta: 0.25 },
    ],
    claimText: 'The swans moved on the jet-ski at dawn. The insurance term is "act of Gregory".',
    safeText: 'An uneasy peace holds on the lake. Tribute was paid.',
  },
  {
    id: 'hamster-power',
    name: 'Hamster Wheel Power Co.',
    emoji: '⚡',
    tagline: 'Renewable energy, powered by 6,000 highly motivated hamsters.',
    coverage: 1100, band: [190, 380], baseRisk: 0.24, rating: 'Moderate',
    intel: [
      { id: 'hp1', text: 'The night-shift hamsters have unionized. Negotiations are "tense".', delta: 0.20 },
      { id: 'hp2', text: 'New sunflower-seed incentive program. Output is up 30%.', delta: -0.15 },
      { id: 'hp3', text: 'One hamster, Big Steve, produces 11% of total output alone. Key-hamster risk.', delta: 0.15 },
    ],
    claimText: 'Big Steve pulled a hamstring. Rolling blackouts across the grid.',
    safeText: 'The wheels turned. Big Steve remains a legend.',
  },
  {
    id: 'gerbil-circus',
    name: 'The Great Gerbil Circus',
    emoji: '🎪',
    tagline: 'Death-defying stunts by animals with no concept of death.',
    coverage: 1250, band: [210, 400], baseRisk: 0.31, rating: 'High',
    intel: [
      { id: 'gc1', text: 'The cannonball gerbil has been practicing without the net. On principle.', delta: 0.20 },
      { id: 'gc2', text: 'A safety inspector fell in love with the trapeze gerbil and passed everything.', delta: 0.15 },
      { id: 'gc3', text: 'The new ringmaster is a former actuary. Every stunt now has a spreadsheet.', delta: -0.20 },
    ],
    claimText: 'The cannonball act went long. The gerbil is fine. The chandelier is not.',
    safeText: 'A flawless season under the tiny big top.',
  },
];

// Rotating flavor for clients nobody insured.
export const UNINSURED_CLAIM = [
  'went down uninsured. The brokers exchange relieved glances.',
  'suffered a total loss with no coverage. Not your problem. Officially.',
];
export const UNINSURED_SAFE = [
  'had a quiet quarter. Someone left money on the table.',
  'thrived, uninsured. That premium walked free.',
];

export const ROUND_NAMES = ['Q1', 'Q2', 'Q3', 'Q4', 'Year-End'];
