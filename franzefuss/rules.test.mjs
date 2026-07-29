/*
 * Self-check for the Franzefuss rules engine: `node franzefuss/rules.test.mjs`.
 * Plays a few thousand random deals and asserts the invariants that matter.
 */

import {
  newMatch, startDeal, settleDeal, legalPlays, playCard, announce, announceOptions,
  canAnnounce, canRobTrump, robTrump, stockExhausted, findCombinations, bestOfKind,
  combinationName, compareCombinations, viewFor, suitOf, cardValue,
  DEAL_TOTAL, TOTAL_TRICKS, HAND_SIZE, DEFAULT_TARGET, other,
} from './js/rules.js';

let checks = 0;
let failures = 0;

function assert(condition, message) {
  checks++;
  if (!condition) {
    failures++;
    console.error(`  FAIL: ${message}`);
  }
}

/* A cheap deterministic PRNG so a failure can be reproduced from its seed. */
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const pick = (list, random) => list[Math.floor(random() * list.length)];

function playRandomDeal(seed) {
  const random = rng(seed);
  const match = newMatch(['A', 'B']);
  startDeal(match, random);
  const deal = match.deal;
  const trump = deal.trump;

  assert(deal.hands[0].length === HAND_SIZE, `seed ${seed}: elder dealt ${HAND_SIZE}`);
  assert(deal.hands[1].length === HAND_SIZE, `seed ${seed}: dealer dealt ${HAND_SIZE}`);
  assert(deal.stock.length === 13, `seed ${seed}: 13 cards in stock`);
  assert(suitOf(deal.upcard) === trump, `seed ${seed}: turn-up sets trump`);

  /* Nothing in a redacted view may reveal the opponent's cards. */
  const view = viewFor(match, 0);
  const leaked = JSON.stringify(view).match(/"[SHDC][789TJQKA]"/g) || [];
  const ownable = new Set([...deal.hands[0], deal.upcard]);
  assert(
    leaked.every((token) => ownable.has(token.slice(1, -1))),
    `seed ${seed}: view for player 0 leaks no hidden card`,
  );

  assert(deal.stage === 'play', `seed ${seed}: the deal opens in play`);

  let guard = 0;
  while (deal.stage === 'play') {
    if (guard++ > 200) throw new Error(`seed ${seed}: deal never terminated`);
    const player = deal.turn;

    if (canRobTrump(deal, player) && random() < 0.4) {
      const before = deal.hands[player].length;
      robTrump(deal, player);
      assert(deal.hands[player].length === before, `seed ${seed}: robbing swaps 1-for-1`);
      assert(deal.upcard === `${trump}7`, `seed ${seed}: the seven becomes the turn-up`);
    }

    if (canAnnounce(deal, player) && random() < 0.5) {
      const options = announceOptions(deal, player);
      const before = deal.announcePoints[player];
      announce(deal, player, options[Math.floor(random() * options.length)].kind);
      assert(
        deal.announcePoints[player] >= before,
        `seed ${seed}: announcing never loses points`,
      );
      assert(!canAnnounce(deal, player), `seed ${seed}: one announcement per lead`);
    }

    const legal = legalPlays(deal, player);
    assert(legal.length > 0, `seed ${seed}: a player to move always has a legal card`);

    /* Once the stock is spent the follow-suit obligations must bite. */
    const lead = deal.trickLead === player ? null : deal.trickCards[deal.trickLead];
    if (lead && stockExhausted(deal)) {
      const hand = deal.hands[player];
      const inSuit = hand.filter((card) => suitOf(card) === suitOf(lead));
      if (inSuit.length) {
        assert(
          legal.every((card) => suitOf(card) === suitOf(lead)),
          `seed ${seed}: must follow suit when able`,
        );
      } else {
        const trumps = hand.filter((card) => suitOf(card) === trump);
        if (trumps.length) {
          assert(
            legal.every((card) => suitOf(card) === trump),
            `seed ${seed}: must trump when void`,
          );
        }
      }
    }

    playCard(deal, player, pick(legal, random));
  }

  const result = deal.result;
  assert(deal.trickNumber === TOTAL_TRICKS + 1, `seed ${seed}: exactly ${TOTAL_TRICKS} tricks`);
  assert(deal.hands[0].length === 0 && deal.hands[1].length === 0, `seed ${seed}: hands empty`);
  assert(deal.stock.length === 0 && deal.upcard === null, `seed ${seed}: stock fully drawn`);
  assert(
    deal.tricksWon[0] + deal.tricksWon[1] === TOTAL_TRICKS,
    `seed ${seed}: tricks won sum to ${TOTAL_TRICKS}`,
  );
  assert(
    deal.lateTricksWon[0] + deal.lateTricksWon[1] === 9,
    `seed ${seed}: nine tricks after the stock runs out`,
  );
  assert(
    result.cardPoints[0] + result.cardPoints[1] === DEAL_TOTAL,
    `seed ${seed}: card points total ${DEAL_TOTAL} (got ${result.cardPoints.join('+')})`,
  );
  if (result.sweep !== null) {
    assert(result.cardPoints[result.sweep] === DEAL_TOTAL, `seed ${seed}: sweep takes everything`);
  }

  settleDeal(match);
  assert(
    match.scores[0] === result.totals[0] && match.scores[1] === result.totals[1],
    `seed ${seed}: match score picks up the deal`,
  );
  assert(match.dealer === 1, `seed ${seed}: the deal alternates`);
  return match;
}

console.log('Franzefuss rules engine');

for (let seed = 1; seed <= 3000; seed++) playRandomDeal(seed);
console.log(`  3000 random deals played`);

/* The 32-card pack must hold exactly 152 card points however trump falls. */
for (const trump of ['S', 'H', 'D', 'C']) {
  let total = 0;
  for (const suit of ['S', 'H', 'D', 'C']) {
    for (const rank of ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A']) {
      total += cardValue(suit + rank, trump);
    }
  }
  assert(total === 152, `pack holds 152 card points with ${trump} trump (got ${total})`);
}

/* Combinations, at Piquet's values. */
const quartHand = ['SJ', 'ST', 'S9', 'S8', 'HA', 'HK', 'HQ', 'D7', 'C7'];
const quartCombos = findCombinations(quartHand);
const seqs = quartCombos.filter((c) => c.kind === 'sequence');
assert(seqs.filter((c) => c.length === 4).length === 1, 'the quart itself is found');
assert(seqs.filter((c) => c.length === 3).length === 3, 'both tatteln inside it, plus the heart one');
assert(
  seqs.filter((c) => c.suit === 'S').reduce((n, c) => n + c.value, 0) === 10,
  'a quart pays 4 + 3 + 3 = 10',
);
assert(!quartCombos.some((c) => c.kind === 'set'), 'two sevens are not a set');
assert(combinationName(bestOfKind(quartCombos, 'sequence')) === 'Quart in ♠', 'names read right');

const fussHand = ['CA', 'CK', 'CQ', 'CJ', 'CT', 'H7', 'H8', 'D9', 'ST'];
const fussCombos = findCombinations(fussHand).filter((c) => c.kind === 'sequence');
assert(fussCombos.filter((c) => c.length === 5).length === 1, 'one Fuß');
assert(fussCombos.filter((c) => c.length === 4).length === 2, 'two quarts inside it');
assert(fussCombos.filter((c) => c.length === 3).length === 3, 'three tatteln inside it');
assert(
  fussCombos.reduce((n, c) => n + c.value, 0) === 32,
  `a Fuß pays 15 + 4 + 4 + 3 + 3 + 3 = 32 (got ${fussCombos.reduce((n, c) => n + c.value, 0)})`,
);
assert(combinationName(bestOfKind(fussCombos, 'sequence')) === 'Fuß in ♣', 'the Fuß is named');

/* "3 Aß, 3 Könige etc. gelten je 3" — and no lower than the tens. */
const setHand = ['S7', 'H7', 'D7', 'C7', 'SA', 'HA', 'DA', 'S9', 'H9'];
const sets = findCombinations(setHand).filter((c) => c.kind === 'set');
assert(sets.length === 1, 'four sevens are not a set; three aces are');
assert(sets[0].value === 3 && sets[0].rank === 'A', 'three of a kind is worth 3');
assert(combinationName(sets[0]) === 'Three Aces', 'sets are named in words');

const quatorze = findCombinations(['SA', 'HA', 'DA', 'CA', 'SK', 'HK', 'DK', 'S8', 'H8'])
  .filter((c) => c.kind === 'set');
assert(quatorze.find((c) => c.length === 4).value === 14, 'four of a kind is worth 14');
assert(quatorze.length === 2, 'the four aces are one set, not four trios');
assert(
  compareCombinations(quatorze.find((c) => c.length === 4), quatorze.find((c) => c.length === 3)) > 0,
  'four beats three',
);

const lowFour = findCombinations(['ST', 'HT', 'DT', 'CT', 'SA', 'HA', 'DA', 'S8', 'H8'])
  .filter((c) => c.kind === 'set');
assert(
  compareCombinations(lowFour.find((c) => c.length === 4), lowFour.find((c) => c.length === 3)) > 0,
  'four tens beat three aces — four beats three whatever the rank',
);

const gapped = findCombinations(['HA', 'HK', 'HJ', 'HT', 'H9', 'S7', 'D7', 'C8', 'CQ']);
assert(
  gapped.filter((c) => c.kind === 'sequence' && c.length === 3).length === 1,
  'a gap splits a run, and A-K alone is nothing',
);

/* Announcing: only on your own lead, once, and judged against the other hand. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(7));
  const deal = match.deal;
  deal.trump = 'C';
  deal.hands[0] = ['SJ', 'ST', 'S9', 'S8', 'HA', 'HK', 'HQ', 'D7', 'C7'];
  deal.hands[1] = ['DA', 'DK', 'DQ', 'CJ', 'CT', 'C9', 'H9', 'H8', 'S7'];
  deal.trickLead = 0;
  deal.turn = 0;

  assert(canAnnounce(deal, 0), 'the leader may announce');
  assert(!canAnnounce(deal, 1), 'the other player may not announce out of turn');

  announce(deal, 0, 'sequence');
  assert(
    deal.announcePoints[0] === 13,
    `the spade quart (10) and the heart tattel (3) both score (got ${deal.announcePoints[0]})`,
  );
  assert(deal.announcements[0].good === true, 'a better sequence is good');
  assert(!canAnnounce(deal, 0), 'one announcement per lead');

  /* Already scored, so announcing the same class again pays nothing. */
  deal.announcedThisTrick = [false, false];
  const before = deal.announcePoints[0];
  announce(deal, 0, 'sequence');
  assert(deal.announcePoints[0] === before, 'a combination is only ever scored once');
}
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(9));
  const deal = match.deal;
  deal.trump = 'C';
  deal.hands[0] = ['HA', 'HK', 'HQ', 'D7', 'D8', 'S7', 'S8', 'C7', 'C8'];
  deal.hands[1] = ['DA', 'DK', 'DQ', 'DJ', 'H9', 'H8', 'S9', 'ST', 'CT'];
  deal.trickLead = 0;
  deal.turn = 0;

  announce(deal, 0, 'sequence');
  assert(deal.announcePoints[0] === 0, 'a tattel is not good against a quart');
  assert(deal.announcements[0].good === false, 'and it is recorded as not good');
  /* The points do not simply vanish — they cross the table. */
  assert(
    deal.announcePoints[1] === 10,
    `the better quart collects 10 (got ${deal.announcePoints[1]})`,
  );
  assert(deal.announcements[0].beatenBy.player === 1, 'the call records who beat it');
  assert(deal.announcements[0].beatenBy.value === 10, 'and what it paid them');
  /* And having been paid for, it cannot be claimed twice. */
  deal.announcedThisTrick = [false, false];
  deal.trickLead = 1; deal.turn = 1;
  announce(deal, 1, 'sequence');
  assert(deal.announcePoints[1] === 10, 'a combination already paid for does not pay again');
}

/* A dead heat pays nobody — "bezahlt". */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(21));
  const deal = match.deal;
  deal.trump = 'C';
  deal.hands[0] = ['HA', 'HK', 'HQ', 'D7', 'D8', 'S7', 'S8', 'C7', 'C8'];
  deal.hands[1] = ['SA', 'SK', 'SQ', 'D9', 'DT', 'H9', 'HT', 'CT', 'C9'];
  deal.trickLead = 0; deal.turn = 0;

  announce(deal, 0, 'sequence');
  assert(deal.announcePoints[0] === 0, 'an equal tattel scores nothing for the caller');
  assert(deal.announcePoints[1] === 0, 'and nothing for the opponent either');
  assert(deal.announcements[0].beatenBy === null, 'a tie is not a defeat');
}

/* An opponent who never wins a lead still gets paid for a better holding. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(23));
  const deal = match.deal;
  deal.trump = 'C';
  deal.hands[0] = ['HA', 'HK', 'HQ', 'D7', 'D8', 'S7', 'S8', 'C7', 'C8'];
  deal.hands[1] = ['SA', 'SK', 'SQ', 'SJ', 'ST', 'H9', 'HT', 'CT', 'C9'];
  deal.trickLead = 0; deal.turn = 0;

  announce(deal, 0, 'sequence');
  assert(
    deal.announcePoints[1] === 32,
    `a Fuß held by the player off lead still collects 32 (got ${deal.announcePoints[1]})`,
  );
  assert(deal.announcePoints[0] === 0, 'and the caller gets nothing');
}

/* A run that grows pays again: the 1890 example, Bube-10-9 plus the Dame. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(11));
  const deal = match.deal;
  deal.trump = 'C';
  deal.hands[0] = ['SJ', 'ST', 'S9', 'D7', 'D8', 'H7', 'H8', 'C7', 'CQ'];
  deal.hands[1] = ['DA', 'DK', 'H9', 'S7', 'S8', 'CT', 'C9', 'HQ', 'DT'];
  deal.trickLead = 0;
  deal.turn = 0;

  announce(deal, 0, 'sequence');
  assert(deal.announcePoints[0] === 3, 'the tattel J-10-9 scores 3');

  /* The Queen arrives from the stock. */
  deal.hands[0].push('SQ');
  deal.announcedThisTrick = [false, false];
  announce(deal, 0, 'sequence');
  assert(
    deal.announcePoints[0] === 3 + 3 + 4,
    `growing it pays the new tattel and the quart (got ${deal.announcePoints[0]})`,
  );
}

/* A partie is played to a hundred, as in Piquet. */
assert(DEFAULT_TARGET === 100, 'the target is Piquet\'s hundred');

/* A player who takes none of the last nine tricks pays for the whole round. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(11));
  const deal = match.deal;
  deal.stage = 'play';
  deal.cardPoints = [80, 82];
  deal.lateTricksWon = [9, 0];
  deal.hands = [[], []];
  deal.trickNumber = TOTAL_TRICKS + 1;
  /* Drive the private finish through the public path by replaying the last trick. */
  const finished = newMatch(['A', 'B']);
  startDeal(finished, rng(11));
  finished.deal.hands = [['HA'], ['H7']];
  finished.deal.stock = [];
  finished.deal.upcard = null;
  finished.deal.trump = 'S';
  finished.deal.stage = 'play';
  finished.deal.trickNumber = TOTAL_TRICKS;
  finished.deal.trickLead = 0;
  finished.deal.turn = 0;
  finished.deal.lateTricksWon = [0, 8];
  playCard(finished.deal, 0, 'HA');
  playCard(finished.deal, 1, 'H7');
  assert(finished.deal.result.sweep === null, 'winning a late trick avoids the sweep');

  const swept = newMatch(['A', 'B']);
  startDeal(swept, rng(13));
  swept.deal.hands = [['H7'], ['HA']];
  swept.deal.stock = [];
  swept.deal.upcard = null;
  swept.deal.trump = 'S';
  swept.deal.stage = 'play';
  swept.deal.trickNumber = TOTAL_TRICKS;
  swept.deal.trickLead = 0;
  swept.deal.turn = 0;
  swept.deal.cardPoints = [40, 100];
  swept.deal.lateTricksWon = [0, 8];
  playCard(swept.deal, 0, 'H7');
  playCard(swept.deal, 1, 'HA');
  assert(swept.deal.result.sweep === 1, 'no late tricks means the opponent sweeps');
  assert(swept.deal.result.cardPoints[1] === DEAL_TOTAL, 'the sweep is worth the whole round');
  assert(swept.deal.result.cardPoints[0] === 0, 'the swept player scores nothing');
}

/* Robbing the trump. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(17));
  const deal = match.deal;
  deal.trump = 'H';
  deal.upcard = 'HA';
  deal.stage = 'play';
  deal.turn = 0;
  deal.hands[0] = ['H7', 'SA', 'SK'];
  assert(canRobTrump(deal, 0), 'the trump seven may rob the turn-up');
  assert(!canRobTrump(deal, 1), 'a player without the seven may not rob');
  robTrump(deal, 0);
  assert(deal.hands[0].includes('HA'), 'the robber takes the turn-up');
  assert(!deal.hands[0].includes('H7'), 'the seven leaves the hand');
  assert(deal.upcard === 'H7', 'the seven sits face up in its place');
  assert(!canRobTrump(deal, 0), 'the turn-up cannot be robbed twice');
}

/* A match ends when someone crosses the target. */
{
  const match = newMatch(['A', 'B'], 100);
  startDeal(match, rng(23));
  match.deal.result = { cardPoints: [120, 42], announcePoints: [0, 0], totals: [120, 42], sweep: null, tricksWon: [9, 7] };
  settleDeal(match);
  assert(match.over === true, 'crossing the target ends the match');
  assert(match.winner === 0, 'the player who crossed it wins');
}

console.log(`  ${checks} assertions, ${failures} failure${failures === 1 ? '' : 's'}`);
process.exit(failures ? 1 : 0);
