// Bad Faith — Animal Insurance Division
// Content decks: clients, intel, flavor. All numbers are dollars.
// baseRisk is hidden from players; rating is "the brochure" and is
// occasionally a lie. Intel deltas only apply when the card is dealt.

export const GAME_NAME = 'Bad Faith';
export const GAME_SUBTITLE = 'Animal Insurance Division';
// Shown on home + lobby so a table can spot a stale tab at a glance.
// Bump on every deploy that changes the network protocol or content.
export const APP_VERSION = 'v9';

// What the brochure's risk rating claims, in plain odds. The brochure is
// the client's own marketing — some of them are lying.
export const RATING_ODDS = {
  Low: '~15–25%',
  Moderate: '~25–35%',
  High: '35%+',
  Unknown: '??',
};

export const AVATARS = ['🦊', '🦉', '🐊', '🐐', '🦈', '🐝', '🦃', '🦎'];

export const CLIENTS = [
  {
    id: 'ostrich-downs',
    name: 'Ostrich Downs Racing League',
    emoji: '🏁',
    tagline: 'The fastest birds that absolutely cannot fly.',
    coverage: 1500, band: [300, 680], baseRisk: 0.25, rating: 'Moderate',
    intel: [
      { id: 'od1', text: 'Thunderhoof, their star ostrich, has bitten three jockeys this season.', delta: 0.15 },
      { id: 'od2', text: 'New padded track installed. Trip injuries are way down.', delta: -0.2 },
      { id: 'od3', text: 'Every race is scheduled during hatching season. The birds are furious.', delta: 0.1 },
    ],
    claimText: 'Mass pile-up at the first bend. Feathers everywhere. Jockeys suing.',
    safeText: 'A full season of clean, flightless racing.',
  },
  {
    id: 'peacock-collective',
    name: 'Emotional Support Peacock Collective',
    emoji: '🦚',
    tagline: '“They sense your anxiety. Then they scream.”',
    coverage: 900, band: [220, 490], baseRisk: 0.3, rating: 'Low',
    intel: [
      { id: 'pc1', text: 'Three peacocks were denied boarding at the airport last week. Litigation brewing.', delta: 0.15 },
      { id: 'pc2', text: 'They hired a peacock behaviorist. The screaming is down 40%.', delta: -0.2 },
      { id: 'pc3', text: 'Mating season starts this quarter. Nobody is emotionally supported during mating season.', delta: 0.1 },
    ],
    claimText: 'A peacock screamed during a live newscast. The anchor is suing for hearing loss.',
    safeText: 'The peacocks provided adequate emotional support. Mostly by staying quiet.',
  },
  {
    id: 'prize-goldfish',
    name: "Sir Reginald's Prize Goldfish",
    emoji: '🐠',
    tagline: 'One goldfish. Insured like a Fabergé egg.',
    coverage: 2000, band: [240, 540], baseRisk: 0.15, rating: 'High',
    intel: [
      { id: 'gf1', text: 'The "prize goldfish" is actually the fourth identical replacement. Sir Reginald has no idea.', delta: -0.15 },
      { id: 'gf2', text: "Sir Reginald's cat has learned to open the study door.", delta: 0.25 },
      { id: 'gf3', text: 'The fish has a dedicated veterinarian on retainer.', delta: -0.1 },
    ],
    claimText: 'The goldfish is gone. The cat is not talking.',
    safeText: 'The goldfish swam in circles, worth every penny.',
  },
  {
    id: 'buzz-empire',
    name: 'Buzz Empire Apiaries',
    emoji: '🐝',
    tagline: '40 million employees. Zero HR department.',
    coverage: 1200, band: [270, 600], baseRisk: 0.28, rating: 'Moderate',
    intel: [
      { id: 'be1', text: 'A rival beekeeper has been parking his hives suspiciously close to the property line.', delta: 0.15 },
      { id: 'be2', text: 'This year\'s queen is, according to staff, "an absolute unit". Hive morale is excellent.', delta: -0.25 },
      { id: 'be3', text: 'They rented the bees out for 12 back-to-back almond pollinations. The bees are exhausted.', delta: 0.1 },
    ],
    claimText: 'The colony absconded overnight. All 40 million employees quit at once.',
    safeText: 'Record honey yield. The queen sends her regards.',
  },
  {
    id: 'llama-drama',
    name: 'Llama Drama Petting Zoo',
    emoji: '🦙',
    tagline: 'The llamas know exactly what they did.',
    coverage: 1000, band: [240, 540], baseRisk: 0.3, rating: 'Moderate',
    intel: [
      { id: 'ld1', text: 'One llama has learned to undo gate latches. The others watch and learn.', delta: 0.15 },
      { id: 'ld2', text: 'New "no spitting" training program is showing real results.', delta: -0.25 },
      { id: 'ld3', text: 'A kids\' birthday party chain just signed a weekly booking. Exposure doubled.', delta: 0.1 },
    ],
    claimText: 'The llamas staged a coordinated breakout during a gender reveal party.',
    safeText: 'The llamas behaved. Suspicious, but profitable.',
  },
  {
    id: 'capybara-springs',
    name: 'Capybara Hot Springs Resort',
    emoji: '🛁',
    tagline: 'The calmest business on Earth.',
    coverage: 800, band: [100, 220], baseRisk: 0.15, rating: 'Low',
    intel: [
      { id: 'cs1', text: 'The capybaras have accepted a crocodile into their friend group. He seems nice?', delta: 0.25 },
      { id: 'cs2', text: 'A wellness influencer with 4M followers is filming there next month.', delta: 0.05 },
      { id: 'cs3', text: 'The springs passed every safety inspection with the calmest scores ever recorded.', delta: -0.2 },
    ],
    claimText: 'The crocodile was, in fact, not nice.',
    safeText: 'Everyone soaked. Nothing happened. Bliss.',
  },
  {
    id: 'houdini-octopus',
    name: 'Houdini the Escape Octopus',
    emoji: '🐙',
    tagline: 'Star aquarium attraction. Flight risk. Literally has eight arms.',
    coverage: 1400, band: [390, 880], baseRisk: 0.35, rating: 'Moderate',
    intel: [
      { id: 'ho1', text: 'Houdini has been observed studying the night guard\'s rounds.', delta: 0.15 },
      { id: 'ho2', text: 'The aquarium installed a new "octopus-proof" lid. Houdini seems offended.', delta: -0.25 },
      { id: 'ho3', text: 'A maintenance drain cover in his tank has been loose for weeks.', delta: 0.1 },
    ],
    claimText: 'Houdini is gone. A trail of wet suction marks leads to the harbor.',
    safeText: 'Houdini stayed. He is planning something, but he stayed.',
  },
  {
    id: 'pigeon-couriers',
    name: 'Concrete Jungle Pigeon Couriers',
    emoji: '📦',
    tagline: 'Same-day delivery, weather and breadcrumbs permitting.',
    coverage: 700, band: [180, 420], baseRisk: 0.33, rating: 'High',
    intel: [
      { id: 'pg1', text: 'A hawk has moved into the delivery corridor downtown.', delta: 0.15 },
      { id: 'pg2', text: 'Their top pigeon, Maurice, just came out of retirement. He is undefeated.', delta: -0.2 },
      { id: 'pg3', text: 'The fleet gets distracted by a new bakery on 5th. Delivery times have tripled.', delta: 0.05 },
    ],
    claimText: 'The hawk. It was always going to be the hawk.',
    safeText: 'Every package delivered, only lightly pecked.',
  },
  {
    id: 'good-boys-security',
    name: 'The Very Good Boys Security Co.',
    emoji: '🐕‍🦺',
    tagline: 'Guard dogs who love everyone. Everyone.',
    coverage: 1100, band: [190, 440], baseRisk: 0.22, rating: 'Low',
    intel: [
      { id: 'gb1', text: 'The dogs let a burglar in last month because he had treats. It was not reported.', delta: 0.2 },
      { id: 'gb2', text: 'They just hired one (1) extremely suspicious cat as a consultant. Break-ins stopped.', delta: -0.25 },
      { id: 'gb3', text: 'A client is suing over "excessive licking of authorized personnel".', delta: 0.05 },
    ],
    claimText: 'A burglary occurred. The dogs rated the burglar 10/10, very generous with treats.',
    safeText: 'Nothing was stolen. Everything was licked.',
  },
  {
    id: 'alpaca-bags',
    name: 'Alpaca My Bags Trekking Tours',
    emoji: '🎒',
    tagline: 'Mountain tours with judgmental pack animals.',
    coverage: 1000, band: [210, 470], baseRisk: 0.26, rating: 'Moderate',
    intel: [
      { id: 'ab1', text: 'The lead alpaca refuses to cross the new bridge. The detour is treacherous.', delta: 0.2 },
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
    coverage: 1300, band: [280, 630], baseRisk: 0.27, rating: 'Moderate',
    intel: [
      { id: 'cn1', text: 'Cluck Norris is getting old. The younger roosters have noticed.', delta: 0.15 },
      { id: 'cn2', text: 'The farm installed predator-proof fencing after "the fox incident".', delta: -0.25 },
      { id: 'cn3', text: 'An avian flu advisory was quietly issued two counties over.', delta: 0.1 },
    ],
    claimText: 'Regime change. The young roosters made their move at dawn.',
    safeText: 'Cluck Norris maintains order. The eggs flow.',
  },
  {
    id: 'sloth-delivery',
    name: 'Sloth Same-Week Delivery',
    emoji: '🦥',
    tagline: '“It will get there.” — company motto',
    coverage: 600, band: [100, 220], baseRisk: 0.2, rating: 'Low',
    intel: [
      { id: 'sd1', text: 'They accepted a contract for refrigerated goods. The sloths do not hurry for dairy.', delta: 0.2 },
      { id: 'sd2', text: 'Their new routing algorithm accounts for nap windows. Genuinely impressive.', delta: -0.25 },
      { id: 'sd3', text: 'A customer\'s "urgent" package has been 94% delivered for three weeks.', delta: 0.05 },
    ],
    claimText: 'The yogurt shipment arrived as a fully mature cheese. The customer is furious. A cheesemonger is interested.',
    safeText: 'Everything arrived. Eventually. As promised, technically.',
  },
  {
    id: 'gary-parrot',
    name: 'Gary the Parrot (Knows Too Much)',
    emoji: '🦜',
    tagline: 'Former mob accountant\'s parrot. Repeats everything.',
    coverage: 1500, band: [380, 860], baseRisk: 0.32, rating: 'Moderate',
    intel: [
      { id: 'gp1', text: 'Gary has started reciting account numbers at the farmers market.', delta: 0.2 },
      { id: 'gp2', text: 'Gary was relocated to a quiet suburb under an assumed name ("Terry").', delta: -0.25 },
      { id: 'gp3', text: 'A black sedan has been parked outside the aviary for six days.', delta: 0.1 },
    ],
    claimText: 'The aviary was "burgled". Only Gary is missing. A single feather was left as a message.',
    safeText: 'Gary said nothing incriminating this quarter. Terry, we mean Terry.',
  },
  {
    id: 'moby-richard',
    name: 'Moby Richard Whale Watching',
    emoji: '🐋',
    tagline: 'We do not insure the whale. We insure everything the whale touches.',
    coverage: 1800, band: [430, 970], baseRisk: 0.3, rating: 'High',
    intel: [
      { id: 'mr1', text: 'Moby Richard has begun breaching directly next to the boats. He thinks it\'s funny.', delta: 0.15 },
      { id: 'mr2', text: 'The captain finally repaired the bilge pump held together with gum.', delta: -0.25 },
      { id: 'mr3', text: 'They upgraded to a bigger boat. The whale sees this as a challenge.', delta: 0.1 },
    ],
    claimText: 'Moby Richard gently, lovingly, capsized the new boat. Witnesses say he waved.',
    safeText: 'The whale kept a respectful distance, which somehow felt sarcastic.',
  },
  {
    id: 'ferret-reserve',
    name: 'The Ferret Reserve',
    emoji: '💰',
    tagline: 'A vault guarded by ferrets. The ferrets also steal things.',
    coverage: 1400, band: [320, 730], baseRisk: 0.29, rating: 'Moderate',
    intel: [
      { id: 'fr1', text: 'Audit found 340 "missing" items stashed inside the walls. The ferrets deny everything.', delta: 0.1 },
      { id: 'fr2', text: 'The head ferret, Chairman Noodle, has been hoarding keys specifically.', delta: 0.2 },
      { id: 'fr3', text: 'They hired a second shift of ferrets to watch the first shift. It\'s working?', delta: -0.25 },
    ],
    claimText: 'Chairman Noodle opened the vault from the inside. The board is in shambles.',
    safeText: 'Nothing was stolen that wasn\'t recovered from inside a wall.',
  },
  {
    id: 'swan-lake-hoa',
    name: 'Swan Lake Homeowners Association',
    emoji: '🦢',
    tagline: 'The lake is lovely. The swans are a protection racket.',
    coverage: 950, band: [180, 340], baseRisk: 0.38, rating: 'Low',
    intel: [
      { id: 'sw1', text: 'The lead swan, Gregory, has bitten two HOA board members this month.', delta: 0.15 },
      { id: 'sw2', text: 'Residents have started feeding the swans "tribute". Attacks are down.', delta: -0.25 },
      { id: 'sw3', text: 'A new resident jet-skis on the lake. Gregory is assembling the others.', delta: 0.15 },
    ],
    claimText: 'The swans moved on the jet-ski at dawn. The insurance term is "act of Gregory".',
    safeText: 'An uneasy peace holds on the lake. Tribute was paid.',
  },
  {
    id: 'hamster-power',
    name: 'Hamster Wheel Power Co.',
    emoji: '⚡',
    tagline: 'Renewable energy, powered by 6,000 highly motivated hamsters.',
    coverage: 1100, band: [210, 480], baseRisk: 0.24, rating: 'Moderate',
    intel: [
      { id: 'hp1', text: 'The night-shift hamsters have unionized. Negotiations are "tense".', delta: 0.15 },
      { id: 'hp2', text: 'New sunflower-seed incentive program. Output is up 30%.', delta: -0.25 },
      { id: 'hp3', text: 'One hamster, Big Steve, produces 11% of total output alone. Key-hamster risk.', delta: 0.1 },
    ],
    claimText: 'Big Steve pulled a hamstring. Rolling blackouts across the grid.',
    safeText: 'The wheels turned. Big Steve remains a legend.',
  },
  {
    id: 'komodo-spa',
    name: 'The Komodo Dragon Day Spa',
    emoji: '🦎',
    tagline: 'Hot stones. Heated rocks. One apex predator.',
    coverage: 1500, band: [410, 920], baseRisk: 0.34, rating: 'Moderate',
    intel: [
      { id: 'ks1', text: 'Kevin, the komodo, has learned to open the towel cabinet where guests hide.', delta: 0.15 },
      { id: 'ks2', text: 'Kevin is in brumation this quarter. Extremely mellow. Practically decorative.', delta: -0.25 },
      { id: 'ks3', text: 'A wellness influencer keeps taking selfies inside the enclosure "for the algorithm".', delta: 0.1 },
    ],
    claimText: 'Kevin ate the cucumber-water station, two robes, and very nearly the influencer.',
    safeText: 'Kevin lounged on his heated rock all quarter, drawing record crowds.',
  },
  {
    id: 'gerbil-circus',
    name: 'The Great Gerbil Circus',
    emoji: '🎪',
    tagline: 'Death-defying stunts by animals with no concept of death.',
    coverage: 1250, band: [310, 700], baseRisk: 0.31, rating: 'High',
    intel: [
      { id: 'gc1', text: 'The cannonball gerbil has been practicing without the net. On principle.', delta: 0.15 },
      { id: 'gc2', text: 'A safety inspector fell in love with the trapeze gerbil and passed everything.', delta: 0.1 },
      { id: 'gc3', text: 'The new ringmaster is a former actuary. Every stunt now has a spreadsheet.', delta: -0.25 },
    ],
    claimText: 'The cannonball act went long. The gerbil is fine. The chandelier is not.',
    safeText: 'A flawless season under the tiny big top.',
  },
];

// ---- New York City deck ----
// NYC-original clients; the theme also borrows a few base clients that fit
// the city (see THEMES below).

export const NYC_CLIENTS = [
  {
    id: 'pizza-rat',
    name: 'Pizza Rat Logistics',
    emoji: '🍕',
    tagline: 'One rat. One slice. One dream.',
    coverage: 800, band: [180, 400], baseRisk: 0.28, rating: 'Moderate',
    intel: [
      { id: 'pr1', text: 'A subway busker filmed the whole fleet. They freeze when recognized.', delta: 0.1 },
      { id: 'pr2', text: 'They mapped a rush-hour-free route through the freight tunnels.', delta: -0.2 },
      { id: 'pr3', text: 'The slice is bigger than the rat. It has always been bigger than the rat.', delta: 0.1 },
    ],
    claimText: 'The slice was dropped on the tracks at 34th St–Herald Sq. A city mourns.',
    safeText: 'Every slice delivered, dragged with dignity.',
  },
  {
    id: 'bodega-cats',
    name: 'The Bodega Cat Collective',
    emoji: '🐈',
    tagline: '400 cats. 400 bodegas. Zero apologies.',
    coverage: 1100, band: [190, 440], baseRisk: 0.22, rating: 'Low',
    intel: [
      { id: 'bc1', text: 'A health-inspector sweep is rumored for Tuesday. The cats refuse to hide.', delta: 0.2 },
      { id: 'bc2', text: 'The cats unionized for better napping shelves. Morale at an all-time high.', delta: -0.25 },
      { id: 'bc3', text: 'Mittens (Ave C branch) has been running an unlicensed treat operation.', delta: 0.05 },
    ],
    claimText: 'A citywide inspection blitz. The cats made eye contact and did not move.',
    safeText: 'The mice stayed out and the vibes stayed immaculate.',
  },
  {
    id: 'raccoon-syndicate',
    name: 'Central Park Raccoon Syndicate',
    emoji: '🦝',
    tagline: '"Sanitation consultants." Cash only.',
    coverage: 1300, band: [340, 770], baseRisk: 0.33, rating: 'Moderate',
    intel: [
      { id: 'rs1', text: 'They cracked the new "raccoon-proof" bins. It took four minutes.', delta: 0.15 },
      { id: 'rs2', text: 'A truce with the rangers: trash access in exchange for posing with tourists.', delta: -0.25 },
      { id: 'rs3', text: 'A turf dispute is brewing with the Prospect Park chapter.', delta: 0.1 },
    ],
    claimText: 'The syndicate hit fourteen hot-dog carts in one night. Coordinated. Professional.',
    safeText: 'A quiet season of light racketeering.',
  },
  {
    id: 'sewer-gator',
    name: 'The Sewer Alligator (Allegedly)',
    emoji: '🐊',
    tagline: 'You cannot prove it exists. You cannot prove it doesn\'t.',
    coverage: 1800, band: [430, 970], baseRisk: 0.3, rating: 'Unknown',
    intel: [
      { id: 'sg1', text: 'City Hall insists it does not exist. Hard to pay a claim on a myth.', delta: -0.25 },
      { id: 'sg2', text: 'A guide is selling "gator spotting" kayak tours below Canal St.', delta: 0.2 },
      { id: 'sg3', text: 'It is real, it is twelve feet long, and it has opinions about the DEP.', delta: 0.05 },
    ],
    claimText: 'It surfaced beneath a food-cart convention. Officially, a "water-main event".',
    safeText: 'No sightings this quarter. Which proves nothing.',
  },
  {
    id: 'seagull-squadron',
    name: 'Coney Island Seagull Squadron',
    emoji: '🌭',
    tagline: 'Boardwalk fry acquisition specialists.',
    coverage: 900, band: [250, 570], baseRisk: 0.35, rating: 'High',
    intel: [
      { id: 'ss1', text: 'The squadron now runs coordinated pincer maneuvers on funnel cake.', delta: 0.1 },
      { id: 'ss2', text: 'A hot-dog eating champion scared them off the main drag. Lasting trauma.', delta: -0.25 },
      { id: 'ss3', text: 'Mating season and funnel-cake season overlap this quarter.', delta: 0.15 },
    ],
    claimText: 'They took the entire Fourth of July inventory in ninety seconds.',
    safeText: 'Only standard-issue menacing this quarter.',
  },
  {
    id: 'subway-rats-union',
    name: 'Subway Rats Local 456',
    emoji: '🚇',
    tagline: 'Proudly moving garbage since 1904.',
    coverage: 1200, band: [260, 580], baseRisk: 0.27, rating: 'Moderate',
    intel: [
      { id: 'su1', text: 'Contract talks with the MTA stalled over third-rail hazard pay.', delta: 0.15 },
      { id: 'su2', text: 'The new garbage-train schedule means abundant, safe buffets.', delta: -0.25 },
      { id: 'su3', text: 'A viral cat has been deputized at the Bedford L stop.', delta: 0.1 },
    ],
    claimText: 'A wildcat strike shut down four lines. The rats deny everything, adorably.',
    safeText: 'Service ran smoothly. The rats collected their dues.',
  },
  {
    id: 'rocco-owl',
    name: 'Rocco the Zoo Owl, At Large',
    emoji: '🦉',
    tagline: 'Escaped in February. Emotionally, so did we all.',
    coverage: 1500, band: [380, 860], baseRisk: 0.32, rating: 'Moderate',
    intel: [
      { id: 'ro1', text: 'Rocco has learned to hunt. The zoo is quietly proud.', delta: -0.25 },
      { id: 'ro2', text: 'Rocco roosts on a 5th Ave ledge owned by a man with lawyers.', delta: 0.15 },
      { id: 'ro3', text: 'Birdwatchers publish his location hourly. So, presumably, do the hawks.', delta: 0.1 },
    ],
    claimText: 'Rocco crashed a rooftop gala, stealing one canapé and several hearts. The ice sculpture did not survive.',
    safeText: 'Rocco remains free, beloved, and suspiciously well-fed.',
  },
  {
    id: 'deli-geese',
    name: 'Delancey Deli Guard Geese',
    emoji: '🥪',
    tagline: 'The pastrami has never been safer. Or the customers, less.',
    coverage: 1000, band: [230, 520], baseRisk: 0.29, rating: 'Low',
    intel: [
      { id: 'dg1', text: 'The geese have expanded "protection" to the sidewalk seating.', delta: 0.15 },
      { id: 'dg2', text: 'Pastrami-based obedience training is, unbelievably, working.', delta: -0.25 },
      { id: 'dg3', text: 'A food critic was hissed at. The review is pending.', delta: 0.1 },
    ],
    claimText: 'The geese held a delivery van hostage over a rye shortage.',
    safeText: 'The pastrami was protected at all costs.',
  },
  {
    id: 'wall-street-bull',
    name: "Wall Street's Emotional Support Bull",
    emoji: '🐂',
    tagline: 'He can sense the VIX.',
    coverage: 1600, band: [310, 690], baseRisk: 0.24, rating: 'Moderate',
    intel: [
      { id: 'wb1', text: 'The bull gets skittish when the VIX spikes. Check the VIX.', delta: 0.15 },
      { id: 'wb2', text: 'Traders funded a calming-hay budget. Bull sentiment is up.', delta: -0.25 },
      { id: 'wb3', text: 'Tourists keep climbing on him. One of them is a litigator.', delta: 0.1 },
    ],
    claimText: 'A flash crash spooked him clean through a window on Broad St.',
    safeText: 'Markets were volatile. The bull was not.',
  },
];

// Base clients that also fit the city, borrowed into the NYC deck.
const NYC_BORROWED = ['pigeon-couriers', 'gary-parrot', 'ferret-reserve', 'hamster-power', 'good-boys-security', 'swan-lake-hoa', 'komodo-spa'];

export const THEMES = {
  classic: {
    key: 'classic',
    title: 'Animal Kingdom',
    subtitle: 'Animal Insurance Division',
    badge: '🐾',
    bodyClass: '',
    clients: CLIENTS,
    roundNames: ['Q1', 'Q2', 'Q3', 'Q4', 'Year-End'],
  },
  nyc: {
    key: 'nyc',
    title: 'New York City',
    subtitle: 'Five Boroughs Division',
    badge: '🗽',
    bodyClass: 'theme-nyc',
    clients: [...NYC_CLIENTS, ...CLIENTS.filter(c => NYC_BORROWED.includes(c.id))],
    roundNames: ['The Bronx', 'Queens', 'Brooklyn', 'Staten Island', 'Manhattan'],
  },
};

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
