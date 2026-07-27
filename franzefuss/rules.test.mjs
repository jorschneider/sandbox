/*
 * Self-check for the Franzefuss rules engine: `node franzefuss/rules.test.mjs`.
 * Plays a few thousand random deals and asserts the invariants that matter.
 */

import {
  newMatch, startDeal, settleDeal, legalPlays, playCard, declareMeld, meldOffer,
  canRobTrump, robTrump, stockExhausted, findMelds, bestMeld, meldName, viewFor,
  suitOf, cardValue, DEAL_TOTAL, TOTAL_TRICKS, HAND_SIZE, other,
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

  for (const player of [0, 1]) declareMeld(deal, player, random() < 0.5);
  assert(deal.stage === 'play', `seed ${seed}: meld stage resolves`);

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

/* Meld detection. */
const runHand = ['HA', 'HK', 'HQ', 'SJ', 'ST', 'S9', 'S8', 'D7', 'C7'];
const runMelds = findMelds(runHand, 'H');
assert(runMelds.some((m) => m.kind === 'tattel' && m.value === 20), 'finds a three-card tattel');
assert(runMelds.some((m) => m.kind === 'quart' && m.value === 50), 'finds a four-card quart');
assert(!runMelds.some((m) => m.kind === 'triplet'), 'two of a kind is not a set');
assert(bestMeld(runMelds).kind === 'quart', 'the quart is the best meld here');
assert(meldName(bestMeld(runMelds)) === 'Quart in ♠', 'meld names read correctly');

const setHand = ['S7', 'H7', 'D7', 'C7', 'SA', 'HA', 'DA', 'SK', 'SQ'];
const setMelds = findMelds(setHand, 'D');
assert(setMelds.some((m) => m.kind === 'quartet' && m.value === 80), 'finds four of a kind');
assert(setMelds.some((m) => m.kind === 'triplet' && m.value === 30), 'finds three of a kind');
assert(setMelds.some((m) => m.kind === 'tattel'), 'a card can serve a set and a run at once');
assert(bestMeld(setMelds).kind === 'quartet', 'four of a kind outbids the rest');
assert(meldName(bestMeld(setMelds)) === 'Quartet of 7s', 'set names read correctly');

const fussHand = ['CA', 'CK', 'CQ', 'CJ', 'CT', 'H7', 'H8', 'D9', 'ST'];
const fussMelds = findMelds(fussHand, 'D');
assert(bestMeld(fussMelds).kind === 'fuss' && bestMeld(fussMelds).value === 100, 'finds a fuss');
assert(fussMelds.filter((m) => m.kind === 'fuss').length === 1, 'a fuss is not double counted');

const brokenRun = ['HA', 'HK', 'HJ', 'HT', 'H9', 'S7', 'D7', 'C8', 'CQ'];
const brokenMelds = findMelds(brokenRun, 'S');
assert(bestMeld(brokenMelds).kind === 'tattel', 'a gap splits a run');
assert(
  brokenMelds.filter((m) => m.kind === 'tattel').length === 1,
  'A-K on its own is not a meld',
);

/* Declaring beats passing, and the best meld takes every meld its owner holds. */
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(7));
  const deal = match.deal;
  deal.hands[0] = ['HA', 'HK', 'HQ', 'HJ', 'SA', 'SK', 'SQ', 'D7', 'C8'];
  deal.hands[1] = ['DA', 'DK', 'DQ', 'CJ', 'CT', 'C9', 'S9', 'S8', 'H9'];
  deal.trump = 'C';
  declareMeld(deal, 0, true);
  declareMeld(deal, 1, true);
  assert(deal.meldPoints[0] === 70, `quart + tattel scores 70 (got ${deal.meldPoints[0]})`);
  assert(deal.meldPoints[1] === 0, 'the loser of the meld contest scores nothing');
  assert(deal.meldSummary.winner.player === 0, 'the better meld wins the contest');
}
{
  const match = newMatch(['A', 'B']);
  startDeal(match, rng(9));
  const deal = match.deal;
  deal.hands[0] = ['HA', 'HK', 'HQ', 'HJ', 'SA', 'SK', 'SQ', 'D7', 'C8'];
  deal.trump = 'C';
  declareMeld(deal, 0, false);
  declareMeld(deal, 1, true);
  assert(deal.meldPoints[0] === 0, 'passing forfeits the meld even with the better hand');
  const offer = meldOffer(deal, 0);
  assert(offer.best.kind === 'quart' && offer.total === 70, 'the offer previews the full total');
}

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
  match.deal.result = { cardPoints: [120, 42], meldPoints: [0, 0], totals: [120, 42], sweep: null, tricksWon: [9, 7] };
  settleDeal(match);
  assert(match.over === true, 'crossing the target ends the match');
  assert(match.winner === 0, 'the player who crossed it wins');
}

console.log(`  ${checks} assertions, ${failures} failure${failures === 1 ? '' : 's'}`);
process.exit(failures ? 1 : 0);
