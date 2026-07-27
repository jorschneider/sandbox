/*
 * A practice opponent.
 *
 * Not a strong player — a patient one. It follows the rules exactly, takes
 * points when they are cheap to take, and throws its rubbish away first, which
 * is enough to teach the shape of the game to somebody meeting it for the
 * first time. Entirely deterministic.
 */

import {
  legalPlays, cardValue, cardStrength, suitOf, rankOf, findMelds, bestMeld,
  canRobTrump, stockExhausted, other,
} from './rules.js';

const byCheapest = (trump) => (a, b) =>
  cardValue(a, trump) - cardValue(b, trump) || cardStrength(a, trump) - cardStrength(b, trump);

const cheapest = (cards, trump) => cards.slice().sort(byCheapest(trump))[0];
const dearest = (cards, trump) => cards.slice().sort(byCheapest(trump)).pop();

function beats(candidate, lead, trump) {
  if (suitOf(candidate) === suitOf(lead)) {
    return cardStrength(candidate, trump) > cardStrength(lead, trump);
  }
  return suitOf(candidate) === trump;
}

export function botCard(deal, seat) {
  const trump = deal.trump;
  const legal = legalPlays(deal, seat);
  if (legal.length <= 1) return legal[0];

  const lead = deal.trickLead === seat ? null : deal.trickCards[deal.trickLead];

  /* Leading. */
  if (!lead) {
    const plain = legal.filter((card) => suitOf(card) !== trump);

    if (stockExhausted(deal)) {
      /* The two big trumps are near-unbeatable, and drag points out. */
      const monster = legal.find(
        (card) => suitOf(card) === trump && (rankOf(card) === 'J' || rankOf(card) === '9'),
      );
      if (monster) return monster;
      return plain.length ? cheapest(plain, trump) : cheapest(legal, trump);
    }

    /* While the stock lasts, feed it the rubbish and keep the counters. */
    return plain.length ? cheapest(plain, trump) : cheapest(legal, trump);
  }

  /* Following. */
  const winners = legal.filter((card) => beats(card, lead, trump));
  const atStake = cardValue(lead, trump);

  if (winners.length) {
    const cheapWin = cheapest(winners, trump);
    /* Worth taking if there is something in it, or if it costs almost nothing. */
    if (atStake >= 10 || cardValue(cheapWin, trump) <= 4 || stockExhausted(deal)) {
      return cheapWin;
    }
  }

  const losers = legal.filter((card) => !beats(card, lead, trump));
  if (!losers.length) return cheapest(legal, trump);

  /* Give away as little as possible — unless a partner-less ten is doomed anyway. */
  return cheapest(losers, trump);
}

export function botDeclares(deal, seat) {
  return !!bestMeld(findMelds(deal.hands[seat], deal.trump));
}

export function botRobs(deal, seat) {
  if (!canRobTrump(deal, seat)) return false;
  /* Only decline if the turn-up is worth less than the seven, which it never is. */
  return cardValue(deal.upcard, deal.trump) >= 0;
}

export { other };
