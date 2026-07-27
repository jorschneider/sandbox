/*
 * The coach.
 *
 * Nobody has heard of Franzefuss, so the app teaches it — not with a wall of
 * rules up front, but one lesson at a time, at the moment each rule first
 * decides something. A lesson is a predicate over the same redacted view the
 * table renders, so this works in a solo game, in pass-and-play, and on two
 * phones, each player coached separately.
 *
 * Lessons are listed in teaching order; the first unseen one whose moment has
 * arrived is the one shown.
 */

import { SUIT_SYMBOL, RANK_LABEL, rankOf, combinationName, other } from './rules.js';

const trumpRun = (trump) => ['J', '9', 'A', 'T', 'K', 'Q', '8', '7'].map((rank) => trump + rank);

export const LESSONS = [
  {
    id: 'goal',
    title: 'Tricks do not win this game',
    body: (view) =>
      `Points do. Every deal puts 162 on the table, and you take them by winning ` +
      `tricks that have valuable cards in them. Win ten tricks full of sevens and ` +
      `you will still lose the deal. First to ${view.target} wins the match.`,
    when: (view) => view.dealNumber === 1 && view.deal.trickNumber === 1,
  },
  {
    id: 'values',
    title: 'What the cards are worth',
    body: () =>
      'Learn these five and you know the game. Everything else is worth nothing.',
    rows: (view) => [
      [`Jack of ${SUIT_SYMBOL[view.deal.trump]} (trumps)`, '20'],
      [`Nine of ${SUIT_SYMBOL[view.deal.trump]} (trumps)`, '14'],
      ['Any ace', '11'],
      ['Any ten', '10'],
      ['King 4 · Queen 3 · Jack 2', 'small'],
    ],
    footer: 'And 10 more for whoever takes the very last trick.',
    when: (view) => view.dealNumber === 1 && view.deal.trickNumber === 1,
  },
  {
    id: 'trumps',
    title: `Trumps rank oddly`,
    body: (view) =>
      `${SUIT_SYMBOL[view.deal.trump]} is trumps this deal — the card turned up beside ` +
      `the stock decides it. A trump beats anything in another suit, and inside trumps ` +
      `the Jack and the Nine jump above the ace. In every other suit it is the ` +
      `ordinary A 10 K Q J 9 8 7.`,
    cards: (view) => trumpRun(view.deal.trump),
    footer: 'Highest on the left. Your trumps are outlined in gold in your hand.',
    when: (view) => view.dealNumber === 1 && view.deal.trickNumber === 1,
  },
  {
    id: 'announcing',
    title: 'Announcing, on your own lead',
    body: (view) => {
      const best = view.deal.announceOptions[0] && view.deal.announceOptions[0].best;
      return (
        `Whenever you lead you may first announce a combination — a run of three or ` +
        `more in one suit, or three or four of a kind from the tens upward. ` +
        `${best ? `You are holding a ${combinationName(best)}. ` : ''}` +
        `Your opponent looks at their own hand and says good or not good: if theirs ` +
        `beats yours you score nothing of that class at all. If yours is better you ` +
        `score every one of that class you hold.`
      );
    },
    footer: 'Announcing tells your opponent what you are holding. That is the price.',
    when: (view) => view.deal.canAnnounce,
  },
  {
    id: 'containment',
    title: 'Why the game is called Franzefuß',
    body: () =>
      'A run pays for every shorter run inside it. Three cards — a Tattel — are ' +
      'worth 3. A Quart of four is 4, but it also contains two Tatteln, so it pays ' +
      '10. And a Fuß of five is 15 plus two Quarts plus three Tatteln: 32, the ' +
      'biggest thing in the game and the one it is named after.',
    rows: () => [
      ['Tattel · run of 3', '3'],
      ['Quart · run of 4', '10'],
      ['Fuß · run of 5', '32'],
      ['Three of a kind, tens up', '3'],
      ['Four of a kind', '14'],
    ],
    footer: 'A run you extend later pays again — announce it once more when it grows.',
    when: (view) => view.deal.canAnnounce,
  },
  {
    id: 'freeplay',
    title: 'For now, play anything',
    body: (view) =>
      `While the stock lasts there are no rules about what you may play — no ` +
      `following suit, no trumping. Both of you draw back up to nine after every ` +
      `trick, so the ${view.deal.stockCount} cards beside the trump card are still to come. ` +
      `This is the half of the deal where you set your hand up.`,
    when: (view) =>
      view.deal.stage === 'play' &&
      view.deal.turn === view.you &&
      view.deal.trickNumber === 1 &&
      !view.deal.mustFollow,
  },
  {
    id: 'trickpoints',
    title: 'That is how the scoring feels',
    body: (view) => {
      const trick = view.deal.lastTrick;
      const yours = trick && trick.winner === view.you;
      return (
        `${yours ? 'You took' : 'That went across for'} ${trick ? trick.points : 0} points. ` +
        `The cards you win are stacked up and counted at the end of the deal — the ` +
        `running totals at the top are the match score, not this deal.`
      );
    },
    when: (view) => view.deal.stage === 'play' && view.deal.trickNumber === 2 && !!view.deal.lastTrick,
  },
  {
    id: 'rob',
    title: 'You can rob the turn-up',
    body: (view) =>
      `You hold the seven of ${SUIT_SYMBOL[view.deal.trump]} — the least valuable trump there ` +
      `is. Swap it for the trump card turned up beside the stock and you get that ` +
      `card instead, free. It is almost always worth doing.`,
    footer: 'Tap "Rob the turn-up" below the table.',
    when: (view) => view.deal.canRob,
  },
  {
    id: 'obligations',
    title: 'The gloves come off',
    body: () =>
      'The stock is empty, and for these last nine tricks the rules tighten: you ' +
      'must follow the suit led; if a trump is led you must beat it when you can; ' +
      'and if you cannot follow suit at all you must trump. Cards you are not ' +
      'allowed to play are dimmed — this is where the deal is won.',
    when: (view) =>
      view.deal.stage === 'play' && view.deal.mustFollow && view.deal.turn === view.you,
  },
  {
    id: 'lasttrick',
    title: 'Last trick, and it pays',
    body: () =>
      'Whoever takes this one gets 10 points on top of the cards in it. Deals have ' +
      'turned on this.',
    when: (view) => view.deal.stage === 'play' && view.deal.trickNumber === 16,
  },
  {
    id: 'sweep',
    title: 'Taking nothing costs everything',
    body: (view) =>
      view.deal.result.sweep === view.you
        ? 'Your opponent took not one of the last nine tricks, so they pay for the ' +
          'whole round: all 162 card points come to you, whatever was in your tricks.'
        : 'You took none of the last nine tricks, and that carries a penalty — the ' +
          'whole round goes across: all 162 card points, whatever you had won earlier.',
    when: (view) => view.deal.stage === 'over' && view.deal.result.sweep !== null,
  },
  {
    id: 'tally',
    title: 'Counting up',
    body: (view) =>
      `Card points from your tricks, plus anything you announced, make the deal score. ` +
      `That goes on the match score, the deal passes to the other player, and you ` +
      `go again until somebody passes ${view.target}.`,
    when: (view) => view.deal.stage === 'over',
  },
];

const BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

/*
 * The next thing worth saying, or nothing. Lessons never interrupt a trick
 * being shown, and never fire on a view with no deal in progress.
 */
export function nextLesson(view, seen, { busy = false } = {}) {
  if (!view || !view.deal || busy || view.matchOver) return null;
  for (const lesson of LESSONS) {
    if (seen.has(lesson.id)) continue;
    let due = false;
    try {
      due = lesson.when(view);
    } catch {
      due = false;
    }
    if (due) return lesson;
  }
  return null;
}

export function lessonById(id) {
  return BY_ID.get(id) || null;
}

/* Rendering data for one lesson, resolved against the current view. */
export function renderLesson(lesson, view) {
  return {
    id: lesson.id,
    title: typeof lesson.title === 'function' ? lesson.title(view) : lesson.title,
    body: lesson.body ? lesson.body(view) : '',
    cards: lesson.cards ? lesson.cards(view) : null,
    rows: lesson.rows ? lesson.rows(view) : null,
    footer: lesson.footer || null,
  };
}

/*
 * Why a card in your hand is refused, in words. The engine already decides
 * legality; this only explains the decision the player is looking at.
 */
export function explainRefusal(view, card) {
  const deal = view.deal;
  if (!deal || deal.stage !== 'play') return null;
  if (deal.turn !== view.you) return `It is not your turn.`;
  if (deal.legal.includes(card)) return null;
  if (!deal.mustFollow) return null;

  const lead = deal.trickCards[deal.trickLead];
  if (!lead) return null;

  const leadSuit = lead[0];
  const holdsSuit = deal.hand.some((held) => held[0] === leadSuit);

  if (holdsSuit && card[0] !== leadSuit) {
    return `You must follow ${SUIT_SYMBOL[leadSuit]} — the stock is empty.`;
  }
  if (holdsSuit && leadSuit === deal.trump) {
    return `A trump was led, so you must beat the ${RANK_LABEL[rankOf(lead)]}${SUIT_SYMBOL[leadSuit]} if you can.`;
  }
  if (!holdsSuit && deal.hand.some((held) => held[0] === deal.trump)) {
    return `You have no ${SUIT_SYMBOL[leadSuit]}, so you must trump.`;
  }
  return 'You cannot play that one.';
}

export const seatName = (view, seat) => (seat === view.you ? 'you' : view.names[seat]);
export { other };
