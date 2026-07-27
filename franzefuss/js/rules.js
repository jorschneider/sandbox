/*
 * Franzefuss — the rules engine.
 *
 * Franzefuss (also recorded as Tatteln, Toerteln, and in Denmark as
 * Frantsfuus-Spillet) is a historical two-hand point-trick game: a
 * trick-and-draw cousin of Klaberjass, played with 32 cards.
 *
 * This module is pure. It owns no DOM, no network and no timers — it takes a
 * state object and returns a new one, so the same code runs on the host phone,
 * in pass-and-play, and in tests.
 */

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const RED_SUITS = { H: true, D: true };
export const RANK_LABEL = { 7: '7', 8: '8', 9: '9', T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

/* A card is a two-character string: suit letter + rank letter, e.g. 'HA', 'ST'. */
export const suitOf = (card) => card[0];
export const rankOf = (card) => card[1];

/* Trick-taking strength. Trumps rank J 9 A 10 K Q 8 7; plain suits A 10 K Q J 9 8 7. */
const TRUMP_ORDER = ['J', '9', 'A', 'T', 'K', 'Q', '8', '7'];
const PLAIN_ORDER = ['A', 'T', 'K', 'Q', 'J', '9', '8', '7'];

/* Card points. The trump Jack and Nine are the two big ones. 152 in the pack. */
const TRUMP_VALUE = { J: 20, 9: 14, A: 11, T: 10, K: 4, Q: 3, 8: 0, 7: 0 };
const PLAIN_VALUE = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };

/* Melds use the natural sequence order, not the trick-taking order. */
const SEQUENCE_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7'];

export const CARD_POINTS_IN_PACK = 152;
export const LAST_TRICK_BONUS = 10;
export const DEAL_TOTAL = CARD_POINTS_IN_PACK + LAST_TRICK_BONUS; // 162
export const HAND_SIZE = 9;
export const TRICKS_WITH_DRAW = 7; // 13 stock cards + the turn-up = 14 draws
export const TOTAL_TRICKS = 16;
export const DEFAULT_TARGET = 501;

export function cardValue(card, trump) {
  return suitOf(card) === trump ? TRUMP_VALUE[rankOf(card)] : PLAIN_VALUE[rankOf(card)];
}

export function cardStrength(card, trump) {
  const order = suitOf(card) === trump ? TRUMP_ORDER : PLAIN_ORDER;
  return order.length - order.indexOf(rankOf(card));
}

export function cardLabel(card) {
  return RANK_LABEL[rankOf(card)] + SUIT_SYMBOL[suitOf(card)];
}

export const other = (player) => (player === 0 ? 1 : 0);

function buildPack() {
  const pack = [];
  for (const suit of SUITS) for (const rank of RANKS) pack.push(suit + rank);
  return pack;
}

function shuffle(cards, random) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/* ---------------------------------------------------------------- melds --- */

const MELD_VALUE = { tattel: 20, quart: 50, fuss: 100, triplet: 30, quartet: 80 };

const MELD_LABEL = {
  tattel: 'Tattel',
  quart: 'Quart',
  fuss: 'Fuss',
  triplet: 'Triplet',
  quartet: 'Quartet',
};

/* Every scoring combination in a hand: runs of 3+ in a suit, and sets of 3-4. */
export function findMelds(hand, trump) {
  const melds = [];

  for (const suit of SUITS) {
    const inSuit = hand
      .filter((card) => suitOf(card) === suit)
      .map((card) => SEQUENCE_ORDER.indexOf(rankOf(card)))
      .sort((a, b) => a - b);

    let run = [];
    const flush = () => {
      if (run.length >= 3) {
        const kind = run.length === 3 ? 'tattel' : run.length === 4 ? 'quart' : 'fuss';
        melds.push({
          kind,
          value: MELD_VALUE[kind],
          length: run.length,
          top: run[0],
          trump: suit === trump,
          cards: run.map((index) => suit + SEQUENCE_ORDER[index]),
        });
      }
      run = [];
    };
    for (const index of inSuit) {
      if (run.length && index !== run[run.length - 1] + 1) flush();
      run.push(index);
    }
    flush();
  }

  for (const rank of RANKS) {
    const sameRank = hand.filter((card) => rankOf(card) === rank);
    if (sameRank.length >= 3) {
      const kind = sameRank.length === 3 ? 'triplet' : 'quartet';
      melds.push({
        kind,
        value: MELD_VALUE[kind],
        length: sameRank.length,
        top: SEQUENCE_ORDER.indexOf(rank),
        trump: sameRank.some((card) => suitOf(card) === trump),
        cards: sameRank,
      });
    }
  }

  return melds;
}

/* Ranking key for the meld contest: value, then the higher top card, then trump. */
function meldRank(meld) {
  return [meld.value, -meld.top, meld.trump ? 1 : 0];
}

export function compareMelds(a, b) {
  const left = meldRank(a);
  const right = meldRank(b);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

export function bestMeld(melds) {
  return melds.reduce((best, meld) => (!best || compareMelds(meld, best) > 0 ? meld : best), null);
}

export function meldName(meld) {
  if (!meld) return null;
  const suffix = meld.kind === 'triplet' || meld.kind === 'quartet'
    ? ` of ${RANK_LABEL[rankOf(meld.cards[0])]}s`
    : ` in ${SUIT_SYMBOL[suitOf(meld.cards[0])]}`;
  return MELD_LABEL[meld.kind] + suffix;
}

export function meldTotal(melds) {
  return melds.reduce((sum, meld) => sum + meld.value, 0);
}

/* ----------------------------------------------------------------- deal --- */

export function newMatch(names, target = DEFAULT_TARGET, firstDealer = 0) {
  return {
    names: names.slice(),
    scores: [0, 0],
    target,
    firstDealer,
    dealer: firstDealer,
    dealNumber: 0,
    deal: null,
    ready: [false, false],
    over: false,
    winner: null,
  };
}

export function startDeal(match, random = Math.random) {
  const pack = shuffle(buildPack(), random);
  const hands = [[], []];

  /* Dealt alternately, one at a time, non-dealer first. */
  const elder = other(match.dealer);
  for (let i = 0; i < HAND_SIZE * 2; i++) {
    hands[i % 2 === 0 ? elder : match.dealer].push(pack.pop());
  }

  const upcard = pack.pop();
  match.dealNumber += 1;
  match.deal = {
    trump: suitOf(upcard),
    upcard,
    stock: pack,
    hands,
    stage: 'meld',
    elder,
    turn: elder,
    trickLead: elder,
    trickCards: [null, null],
    trickNumber: 1,
    cardPoints: [0, 0],
    meldPoints: [0, 0],
    tricksWon: [0, 0],
    lateTricksWon: [0, 0],
    meldChoice: [null, null],
    meldSummary: null,
    robbed: false,
    lastTrick: null,
    result: null,
    log: [],
  };
  sortHand(match.deal.hands[0], match.deal.trump);
  sortHand(match.deal.hands[1], match.deal.trump);
  return match;
}

export function sortHand(hand, trump) {
  hand.sort((a, b) => {
    const aTrump = suitOf(a) === trump;
    const bTrump = suitOf(b) === trump;
    if (aTrump !== bTrump) return aTrump ? -1 : 1;
    if (suitOf(a) !== suitOf(b)) return SUITS.indexOf(suitOf(a)) - SUITS.indexOf(suitOf(b));
    return cardStrength(b, trump) - cardStrength(a, trump);
  });
  return hand;
}

function note(deal, text) {
  deal.log.push(text);
  if (deal.log.length > 40) deal.log.shift();
}

/* --------------------------------------------------------------- melds ---- */

export function meldOffer(deal, player) {
  const melds = findMelds(deal.hands[player], deal.trump);
  return { best: bestMeld(melds), total: meldTotal(melds), count: melds.length };
}

export function declareMeld(deal, player, declaring) {
  if (deal.stage !== 'meld' || deal.meldChoice[player] !== null) return deal;
  deal.meldChoice[player] = !!declaring;
  if (deal.meldChoice.some((choice) => choice === null)) return deal;

  const shown = [0, 1].map((p) => {
    if (!deal.meldChoice[p]) return null;
    const melds = findMelds(deal.hands[p], deal.trump);
    const best = bestMeld(melds);
    return best ? { player: p, best, melds, total: meldTotal(melds) } : null;
  });

  let winner = null;
  if (shown[0] && shown[1]) {
    const verdict = compareMelds(shown[0].best, shown[1].best);
    /* A dead heat is settled in favour of the elder hand, who leads. */
    winner = verdict > 0 ? shown[0] : verdict < 0 ? shown[1] : shown[deal.elder];
  } else {
    winner = shown[0] || shown[1];
  }

  if (winner) {
    deal.meldPoints[winner.player] = winner.total;
    note(deal, `Melds: ${meldName(winner.best)} scores ${winner.total}.`);
  } else {
    note(deal, 'Melds: both hands passed.');
  }

  deal.meldSummary = {
    declared: shown.map((entry) => (entry ? { player: entry.player, best: entry.best } : null)),
    winner: winner
      ? { player: winner.player, melds: winner.melds, total: winner.total, best: winner.best }
      : null,
  };
  deal.stage = 'play';
  return deal;
}

/* ---------------------------------------------------------------- play ---- */

/* The stock is spent once the last card and the turn-up have both been drawn. */
export const stockExhausted = (deal) => deal.stock.length === 0 && deal.upcard === null;

export function canRobTrump(deal, player) {
  return (
    deal.stage === 'play' &&
    deal.turn === player &&
    deal.upcard !== null &&
    rankOf(deal.upcard) !== '7' &&
    deal.hands[player].includes(deal.trump + '7')
  );
}

export function robTrump(deal, player) {
  if (!canRobTrump(deal, player)) return deal;
  const seven = deal.trump + '7';
  deal.hands[player].splice(deal.hands[player].indexOf(seven), 1);
  deal.hands[player].push(deal.upcard);
  sortHand(deal.hands[player], deal.trump);
  note(deal, `Robbed the turn-up with the ${cardLabel(seven)}.`);
  deal.upcard = seven;
  deal.robbed = true;
  return deal;
}

/*
 * While the stock lasts a player may play anything. Once it is spent the
 * Klaberjass obligations bite: follow suit, overtrump a trump lead if you can,
 * and trump when you are void.
 */
export function legalPlays(deal, player) {
  const hand = deal.hands[player];
  if (deal.stage !== 'play' || deal.turn !== player) return [];
  if (deal.trickCards[player] !== null) return [];

  const lead = deal.trickLead === player ? null : deal.trickCards[deal.trickLead];
  if (!lead || !stockExhausted(deal)) return hand.slice();

  const leadSuit = suitOf(lead);
  const followers = hand.filter((card) => suitOf(card) === leadSuit);

  if (followers.length) {
    if (leadSuit !== deal.trump) return followers;
    const higher = followers.filter(
      (card) => cardStrength(card, deal.trump) > cardStrength(lead, deal.trump),
    );
    return higher.length ? higher : followers;
  }

  const trumps = hand.filter((card) => suitOf(card) === deal.trump);
  return trumps.length ? trumps : hand.slice();
}

export function playCard(deal, player, card) {
  if (!legalPlays(deal, player).includes(card)) return deal;

  const hand = deal.hands[player];
  hand.splice(hand.indexOf(card), 1);
  deal.trickCards[player] = card;

  if (deal.trickCards[other(player)] === null) {
    deal.turn = other(player);
    return deal;
  }
  return resolveTrick(deal);
}

function trickWinner(deal) {
  const leader = deal.trickLead;
  const follower = other(leader);
  const led = deal.trickCards[leader];
  const answer = deal.trickCards[follower];

  if (suitOf(answer) === suitOf(led)) {
    return cardStrength(answer, deal.trump) > cardStrength(led, deal.trump) ? follower : leader;
  }
  return suitOf(answer) === deal.trump ? follower : leader;
}

function resolveTrick(deal) {
  const winner = trickWinner(deal);
  const loser = other(winner);
  const cards = [deal.trickCards[0], deal.trickCards[1]];
  const isLastTrick = deal.trickNumber === TOTAL_TRICKS;

  let points = cards.reduce((sum, card) => sum + cardValue(card, deal.trump), 0);
  if (isLastTrick) points += LAST_TRICK_BONUS;

  deal.cardPoints[winner] += points;
  deal.tricksWon[winner] += 1;
  if (deal.trickNumber > TRICKS_WITH_DRAW) deal.lateTricksWon[winner] += 1;

  deal.lastTrick = { number: deal.trickNumber, cards, lead: deal.trickLead, winner, points };
  note(
    deal,
    `Trick ${deal.trickNumber}: ${cardLabel(cards[deal.trickLead])} v ${cardLabel(cards[loser === deal.trickLead ? winner : loser])} — ${points} pts.`,
  );

  deal.trickCards = [null, null];
  deal.trickNumber += 1;

  /* The winner draws first; on the very last draw the loser takes the turn-up. */
  drawCard(deal, winner);
  drawCard(deal, loser);

  deal.trickLead = winner;
  deal.turn = winner;

  if (deal.hands[0].length === 0 && deal.hands[1].length === 0) finishDeal(deal);
  return deal;
}

function drawCard(deal, player) {
  if (deal.stock.length) {
    deal.hands[player].push(deal.stock.pop());
  } else if (deal.upcard !== null) {
    deal.hands[player].push(deal.upcard);
    deal.upcard = null;
  } else {
    return;
  }
  sortHand(deal.hands[player], deal.trump);
}

function finishDeal(deal) {
  const cardPoints = deal.cardPoints.slice();
  let sweep = null;

  /* Take none of the last nine tricks and you pay for the whole round. */
  for (const player of [0, 1]) {
    if (deal.lateTricksWon[player] === 0) {
      sweep = other(player);
      cardPoints[sweep] = DEAL_TOTAL;
      cardPoints[player] = 0;
    }
  }

  deal.stage = 'over';
  deal.result = {
    cardPoints,
    meldPoints: deal.meldPoints.slice(),
    totals: [cardPoints[0] + deal.meldPoints[0], cardPoints[1] + deal.meldPoints[1]],
    sweep,
    tricksWon: deal.tricksWon.slice(),
  };
  if (sweep !== null) note(deal, `${sweep === 0 ? 'Player 1' : 'Player 2'} takes every late trick.`);
  return deal;
}

export function settleDeal(match) {
  const result = match.deal && match.deal.result;
  if (!result || match.deal.settled) return match;
  match.deal.settled = true;
  match.ready = [false, false];
  match.scores[0] += result.totals[0];
  match.scores[1] += result.totals[1];

  const reached = [0, 1].filter((player) => match.scores[player] >= match.target);
  if (reached.length) {
    match.over = true;
    match.winner =
      reached.length === 1
        ? reached[0]
        : match.scores[0] === match.scores[1]
          ? null
          : match.scores[0] > match.scores[1]
            ? 0
            : 1;
  }
  match.dealer = other(match.dealer);
  return match;
}

/* ----------------------------------------------------------------- view --- */

/*
 * The redacted state sent to a player. Their opponent's hand, the stock order
 * and any undeclared meld never leave the host, so the wire carries nothing a
 * curious player could read out of the console.
 */
export function viewFor(match, player) {
  const deal = match.deal;
  const base = {
    you: player,
    names: match.names,
    scores: match.scores,
    target: match.target,
    dealer: match.dealer,
    dealNumber: match.dealNumber,
    ready: match.ready.slice(),
    matchOver: match.over,
    matchWinner: match.winner,
  };
  if (!deal) return { ...base, deal: null };

  return {
    ...base,
    deal: {
      trump: deal.trump,
      upcard: deal.upcard,
      stockCount: deal.stock.length + (deal.upcard === null ? 0 : 1),
      hand: deal.hands[player].slice(),
      opponentCards: deal.hands[other(player)].length,
      stage: deal.stage,
      turn: deal.turn,
      trickLead: deal.trickLead,
      trickCards: deal.trickCards.slice(),
      trickNumber: deal.trickNumber,
      cardPoints: deal.cardPoints.slice(),
      meldPoints: deal.meldPoints.slice(),
      tricksWon: deal.tricksWon.slice(),
      robbed: deal.robbed,
      lastTrick: deal.lastTrick,
      result: deal.result,
      log: deal.log.slice(-6),
      legal: legalPlays(deal, player),
      canRob: canRobTrump(deal, player),
      mustFollow: stockExhausted(deal),
      meldOffer: deal.stage === 'meld' ? meldOffer(deal, player) : null,
      meldChoice: deal.meldChoice[player],
      meldWaiting: deal.stage === 'meld' && deal.meldChoice[player] !== null,
      meldSummary: deal.meldSummary,
    },
  };
}
