/*
 * Franzefuß — the rules engine.
 *
 * Franzefuß (also Tatteln, Törteln, Därde; in Denmark Frantsfuus-Spillet) is a
 * two-hand point-trick game of the Austrian 19th century. The Oeconomische
 * Encyclopädie of 1842 calls it "ein im Oesterreichischen sehr beliebtes
 * Kartenspiel ... aus dem bekannten Piquet und dem veralteten Mariage
 * zusammengesetzt" — assembled out of Piquet and Mariage. That is the shape to
 * hold on to: the trick play is Mariage's, and the combinations and their
 * scoring are Piquet's.
 *
 * Ruleset as last codified for the Austro-Hungarian market: S. Ulmann, Das Buch
 * der Familienspiele, A. Hartleben, Wien/München/Pest 1890, which is the edition
 * that called the game Franzefuß.
 *
 * This module is pure. It owns no DOM, no network and no timers, so the same
 * code runs on the host phone, in pass-and-play, and in tests.
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

/*
 * "As zählt 11, die Zehn 10, König 4, Dame 3, Bube 2. Je nach den
 * zugrundegelegten Regeln zählt außerdem der Trumpfbube 20 und Trumpfneun 14."
 * 152 in the pack.
 */
const TRUMP_VALUE = { J: 20, 9: 14, A: 11, T: 10, K: 4, Q: 3, 8: 0, 7: 0 };
const PLAIN_VALUE = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };

/* "Die Zehn nimmt bei den Sequenzen ihren natürlichen Platz ein." */
const SEQUENCE_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7'];

export const CARD_POINTS_IN_PACK = 152;
export const LAST_TRICK_BONUS = 10;
export const DEAL_TOTAL = CARD_POINTS_IN_PACK + LAST_TRICK_BONUS; // 162
export const HAND_SIZE = 9;
export const TRICKS_WITH_DRAW = 7; // 13 stock cards + the turn-up = 14 draws
export const TOTAL_TRICKS = 16;

/* "die Punktezahl, bis zu der man die ganze Partie spielt, ist genau wie beim
 * Pikett" — and a partie of Piquet is played to a hundred. */
export const DEFAULT_TARGET = 100;

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

/* -------------------------------------------------------- combinations --- */

/*
 * Sequence values are Piquet's, as printed in German in 1883: "die Octave
 * zählt 18; die Septime 17; die Sixte 16, die Quinte 15, die Quarte 4 und die
 * Terze 3 Punkte, vorausgesetzt, daß sie vom Gegner gutgeheißen werden."
 */
const SEQUENCE_VALUE = { 3: 3, 4: 4, 5: 15, 6: 16, 7: 17, 8: 18 };

/* "Vier Aß, 4 Könige, 4 Damen, 4 Bauern und 4 Zehner gelten je 14; 3 Aß, 3
 * Könige etc. gelten je 3" — sets run down to the tens and no further. */
const SET_VALUE = { 3: 3, 4: 14 };
const SET_RANKS = ['A', 'K', 'Q', 'J', 'T'];

const SEQUENCE_NAME = {
  3: 'Tattel', 4: 'Quart', 5: 'Fuß', 6: 'Sixte', 7: 'Septime', 8: 'Octave',
};

export const combinationId = (cards) => cards.slice().sort().join('');

/*
 * Every combination a hand contains.
 *
 * A run scores each shorter run inside it as well as itself — "eine Quart zählt
 * nicht nur als solche, sondern auch als zwei Tattel, ein Fuß ebenso als drei
 * Tattel und zwei Quarten". So a quart is 4 + 3 + 3 = 10, and a Fuß, the
 * combination the game is named for, is 15 + 4 + 4 + 3 + 3 + 3 = 32.
 *
 * Sets are not scored that way: four aces are 14, not 14 plus the trios inside.
 */
export function findCombinations(hand) {
  const found = [];

  for (const suit of SUITS) {
    const ladder = hand
      .filter((card) => suitOf(card) === suit)
      .map((card) => SEQUENCE_ORDER.indexOf(rankOf(card)))
      .sort((a, b) => a - b);

    let run = [];
    const flush = () => {
      for (let length = 3; length <= run.length; length++) {
        for (let start = 0; start + length <= run.length; start++) {
          const slice = run.slice(start, start + length);
          const cards = slice.map((index) => suit + SEQUENCE_ORDER[index]);
          found.push({
            id: combinationId(cards),
            kind: 'sequence',
            length,
            value: SEQUENCE_VALUE[length] || 0,
            top: slice[0],
            suit,
            cards,
          });
        }
      }
      run = [];
    };
    for (const index of ladder) {
      if (run.length && index !== run[run.length - 1] + 1) flush();
      run.push(index);
    }
    flush();
  }

  for (const rank of SET_RANKS) {
    const cards = hand.filter((card) => rankOf(card) === rank);
    if (cards.length >= 3) {
      found.push({
        id: combinationId(cards),
        kind: 'set',
        length: cards.length,
        value: SET_VALUE[cards.length] || 0,
        top: SEQUENCE_ORDER.indexOf(rank),
        rank,
        cards,
      });
    }
  }

  return found;
}

/*
 * Within a class: the longer wins, and at equal length the higher top card.
 * "Drei gleiche Figuren werden von vier gleichen, wenn diese auch niedriger
 * sein sollten, überboten" — four beats three whatever the rank.
 */
export function compareCombinations(a, b) {
  if (a.length !== b.length) return a.length - b.length;
  return b.top - a.top;
}

export function bestOfKind(combinations, kind) {
  return combinations
    .filter((combination) => combination.kind === kind)
    .reduce((best, one) => (!best || compareCombinations(one, best) > 0 ? one : best), null);
}

const RANK_PLURAL = { A: 'Aces', K: 'Kings', Q: 'Queens', J: 'Jacks', T: 'Tens' };

export function combinationName(combination) {
  if (!combination) return null;
  if (combination.kind === 'set') {
    const many = combination.length === 4 ? 'Four' : 'Three';
    return `${many} ${RANK_PLURAL[combination.rank] || RANK_LABEL[combination.rank]}`;
  }
  return `${SEQUENCE_NAME[combination.length] || 'Sequence'} in ${SUIT_SYMBOL[combination.suit]}`;
}

export const KIND_LABEL = { sequence: 'sequences', set: 'sets' };

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
    /* A partie is short, so they were played one after another for stakes. */
    parties: [0, 0],
    over: false,
    winner: null,
  };
}

/*
 * Build a deal from a known layout. Shared by the dealer and by replay, so an
 * analysed deal is reconstructed by exactly the code that played it.
 */
export function buildDeal({ hands, stock, upcard, elder }, { recorded = true } = {}) {
  const deal = {
    trump: suitOf(upcard),
    upcard,
    stock: stock.slice(),
    hands: [hands[0].slice(), hands[1].slice()],
    stage: 'play',
    elder,
    turn: elder,
    trickLead: elder,
    trickCards: [null, null],
    trickNumber: 1,
    cardPoints: [0, 0],
    announcePoints: [0, 0],
    tricksWon: [0, 0],
    lateTricksWon: [0, 0],
    spent: [[], []],
    announcedThisTrick: [false, false],
    announcements: [],
    robbed: false,
    lastTrick: null,
    result: null,
    log: [],
    /* Kept only on real deals: the layout and every action, so the deal can be
     * replayed afterwards and each decision graded. Never sent to a player. */
    record: recorded
      ? {
          hands: [hands[0].slice(), hands[1].slice()],
          stock: stock.slice(),
          upcard,
          elder,
          actions: [],
        }
      : null,
  };
  sortHand(deal.hands[0], deal.trump);
  sortHand(deal.hands[1], deal.trump);
  return deal;
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
  match.deal = buildDeal({ hands, stock: pack, upcard, elder });
  return match;
}

export const dealFromRecord = (record) => buildDeal(record, { recorded: false });

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

/* ---------------------------------------------------------- announcing --- */

export const isLeading = (deal, player) =>
  deal.trickLead === player && deal.trickCards[0] === null && deal.trickCards[1] === null;

/* What this player could still announce, grouped into the two Piquet classes. */
export function announceOptions(deal, player) {
  const spent = deal.spent[player];
  const fresh = findCombinations(deal.hands[player]).filter((one) => !spent.includes(one.id));

  return ['sequence', 'set']
    .map((kind) => {
      const mine = fresh.filter((one) => one.kind === kind);
      if (!mine.length) return null;
      return {
        kind,
        best: bestOfKind(mine, kind),
        total: mine.reduce((sum, one) => sum + one.value, 0),
        count: mine.length,
        cards: mine.flatMap((one) => one.cards),
      };
    })
    .filter(Boolean);
}

export function canAnnounce(deal, player) {
  return (
    deal.stage === 'play' &&
    deal.turn === player &&
    isLeading(deal, player) &&
    !deal.announcedThisTrick[player] &&
    announceOptions(deal, player).length > 0
  );
}

/*
 * "Wer eine Karte ausspielt, darf zuvor eine Kartenkombination von seiner Hand
 * ansagen, um sich die Punkte dafür anzurechnen."
 *
 * You announce on your own lead, and the opponent says good or not good by
 * looking at their hand: if theirs is better you score nothing of that class at
 * all, which is Piquet — "dieser letztere kann in diesem Falle nichts zählen".
 * If yours is better you score every combination of that class you hold, so a
 * run that grows as you draw pays again each time it grows.
 */
export function announce(deal, player, kind) {
  if (!canAnnounce(deal, player)) return deal;

  const option = announceOptions(deal, player).find((one) => one.kind === kind);
  if (!option) return deal;

  const opponent = other(player);
  const theirBest = bestOfKind(findCombinations(deal.hands[opponent]), kind);
  const verdict = !theirBest ? 1 : compareCombinations(option.best, theirBest);

  deal.announcedThisTrick[player] = true;
  if (deal.record) deal.record.actions.push({ type: 'announce', player, kind });

  /* Score every unspent combination of this class in a hand, and spend them. */
  const claim = (seat, forKind) => {
    const spent = deal.spent[seat];
    const held = findCombinations(deal.hands[seat]).filter(
      (one) => one.kind === forKind && !spent.includes(one.id),
    );
    for (const one of held) spent.push(one.id);
    const total = held.reduce((sum, one) => sum + one.value, 0);
    deal.announcePoints[seat] += total;
    return total;
  };

  const call = {
    player,
    kind,
    good: verdict > 0,
    value: 0,
    cards: option.best.cards.slice(),
    name: combinationName(option.best),
    beatenBy: null,
  };

  if (verdict > 0) {
    call.value = claim(player, kind);
    note(deal, `${combinationName(option.best)} — good for ${call.value}.`);
  } else if (verdict < 0) {
    /*
     * "Der Gegner darf sich die Punkte gutschreiben, wenn seine Kartenkombination
     * höherwertig als die angesagte des Gegners ist." Announcing into a better
     * hand does not merely fail — it hands the points across, which is what
     * makes announcing a risk rather than a free roll.
     */
    call.beatenBy = {
      player: opponent,
      name: combinationName(theirBest),
      cards: theirBest.cards.slice(),
      value: claim(opponent, kind),
    };
    note(deal, `${combinationName(option.best)} — not good; ${call.beatenBy.name} takes ${call.beatenBy.value}.`);
  } else {
    /* A dead heat is "bezahlt": it scores for neither. */
    note(deal, `${combinationName(option.best)} — equal, so it pays nobody.`);
  }

  deal.announcements.push(call);
  return deal;
}

/* ---------------------------------------------------------------- play --- */

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
  if (deal.record) deal.record.actions.push({ type: 'rob', player });
  note(deal, `Robbed the turn-up with the ${cardLabel(seven)}.`);
  deal.upcard = seven;
  deal.robbed = true;
  return deal;
}

/*
 * "Farbe bekennen muss man erst, wenn der Talon aufgebraucht ist" — before that
 * a player may play anything. After it, the Mariage obligations bite: follow
 * suit, beat a trump lead if you can, and trump when void.
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

  if (deal.record) deal.record.actions.push({ type: 'play', player, card });

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
  deal.announcedThisTrick = [false, false];

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

  /* "Wer von den letzten 9 Stichen gar keinen erhält, muss die Spielrunde zahlen." */
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
    announcePoints: deal.announcePoints.slice(),
    totals: [
      cardPoints[0] + deal.announcePoints[0],
      cardPoints[1] + deal.announcePoints[1],
    ],
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
    if (match.winner !== null) match.parties[match.winner] += 1;
  }
  match.dealer = other(match.dealer);
  return match;
}

/* ----------------------------------------------------------------- view --- */

/*
 * The redacted state sent to a player. Their opponent's hand, the stock order
 * and any unannounced combination never leave the host, so the wire carries
 * nothing a curious player could read out of the console.
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
    parties: match.parties.slice(),
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
      announcePoints: deal.announcePoints.slice(),
      tricksWon: deal.tricksWon.slice(),
      robbed: deal.robbed,
      lastTrick: deal.lastTrick,
      result: deal.result,
      log: deal.log.slice(-6),
      legal: legalPlays(deal, player),
      canRob: canRobTrump(deal, player),
      mustFollow: stockExhausted(deal),
      leading: isLeading(deal, player),
      canAnnounce: canAnnounce(deal, player),
      announceOptions: canAnnounce(deal, player) ? announceOptions(deal, player) : [],
      announcements: deal.announcements.slice(-6),
    },
  };
}
