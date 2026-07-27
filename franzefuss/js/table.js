/*
 * The authoritative table.
 *
 * One device owns the match and every player's cards. It accepts intents from
 * the two seats, runs them through the rules engine, and hands each seat a
 * redacted view of the result. In an online game this lives on the phone that
 * created the room; in pass-and-play it lives on the only phone there is.
 */

import {
  newMatch, startDeal, settleDeal, declareMeld, playCard, robTrump, viewFor, other,
  findMelds,
} from './rules.js';

/*
 * Redeal until seat 0 has something to be taught with: a meld to weigh up and
 * the trump seven to rob with. Only ever used for a first, teaching deal.
 */
export function dealTeachingHand(match) {
  const dealNumber = match.dealNumber;
  for (let attempt = 0; attempt < 800; attempt++) {
    const deal = match.deal;
    const hand = deal.hands[0];
    if (findMelds(hand, deal.trump).length > 0 && hand.includes(`${deal.trump}7`)) break;
    startDeal(match);
  }
  match.dealNumber = dealNumber;
  return match;
}

export function createTable({ names, target, firstDealer = 0, onViews }) {
  const match = newMatch(names, target, firstDealer);
  startDeal(match);

  const broadcast = () => onViews([viewFor(match, 0), viewFor(match, 1)]);

  function apply(seat, action) {
    const deal = match.deal;
    if (!action || typeof action.type !== 'string') return;

    switch (action.type) {
      case 'meld':
        if (deal && deal.stage === 'meld') declareMeld(deal, seat, action.declare);
        break;

      case 'play':
        if (deal && deal.stage === 'play') playCard(deal, seat, action.card);
        break;

      case 'rob':
        if (deal && deal.stage === 'play') robTrump(deal, seat);
        break;

      case 'ready':
        if (!deal || deal.stage !== 'over' || match.over) break;
        match.ready[seat] = true;
        if (action.both) match.ready[other(seat)] = true;
        if (match.ready[0] && match.ready[1]) startDeal(match);
        break;

      case 'rematch':
        if (!match.over) break;
        match.scores = [0, 0];
        match.ready = [false, false];
        match.dealNumber = 0;
        match.dealer = match.firstDealer;
        match.over = false;
        match.winner = null;
        startDeal(match);
        break;

      case 'name':
        if (typeof action.name === 'string' && action.name.trim()) {
          match.names[seat] = action.name.trim().slice(0, 16);
        }
        break;

      default:
        return;
    }

    /* Settle the moment a deal ends so both seats see the new match score. */
    if (match.deal && match.deal.stage === 'over' && !match.deal.settled) settleDeal(match);
    broadcast();
  }

  return { apply, broadcast, match };
}
