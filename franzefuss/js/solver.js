/*
 * An exact solver for the endgame.
 *
 * Once the stock is gone there are no more draws, and a deal with both hands
 * face up is a finite zero-sum game with perfect information. It can be solved
 * outright rather than estimated: alpha-beta over the remaining tricks returns
 * the true card-point margin under best play from both sides.
 *
 * This matters because the obvious alternative — playing the rest out with a
 * heuristic and averaging — inherits that heuristic's mistakes and then reports
 * them as your mistakes. A solved line has no opinion in it.
 *
 * Announcements are left out of the search: by the endgame most combinations
 * have been announced already, and the ones left are open to both players, so
 * they shift the margin without changing which card is right.
 */

import { suitOf, cardStrength, cardValue, LAST_TRICK_BONUS, TOTAL_TRICKS } from './rules.js';

/* Legal plays, written against the flat search state rather than a deal. */
function legalIn(state, player) {
  const hand = state.hands[player];
  const lead = player === state.leader ? null : state.led;
  if (!lead) return hand.slice();

  const leadSuit = suitOf(lead);
  const following = hand.filter((card) => suitOf(card) === leadSuit);

  if (following.length) {
    if (leadSuit !== state.trump) return following;
    const higher = following.filter(
      (card) => cardStrength(card, state.trump) > cardStrength(lead, state.trump),
    );
    return higher.length ? higher : following;
  }
  const trumps = hand.filter((card) => suitOf(card) === state.trump);
  return trumps.length ? trumps : hand.slice();
}

function winnerOf(led, answer, trump, leader, follower) {
  if (suitOf(answer) === suitOf(led)) {
    return cardStrength(answer, trump) > cardStrength(led, trump) ? follower : leader;
  }
  return suitOf(answer) === trump ? follower : leader;
}

/*
 * Margin for `us` over the rest of the deal, under best play. Hands are mutated
 * and restored, so no allocation happens per node beyond the legal-move list.
 */
/* A budget, so a pathological position cannot lock up a phone. Exceeding it
 * aborts the whole solve and the decision goes ungraded rather than wrong. */
export class SearchAborted extends Error {}
let nodes = 0;
let budget = Infinity;

function search(state, us, alpha, beta) {
  if (++nodes > budget) throw new SearchAborted();
  const player = state.turn;
  const maximising = player === us;

  /* Leading a fresh trick. */
  if (state.led === null) {
    if (!state.hands[0].length && !state.hands[1].length) return 0;

    const options = legalIn(state, player);
    let best = maximising ? -Infinity : Infinity;

    for (const card of options) {
      const hand = state.hands[player];
      hand.splice(hand.indexOf(card), 1);
      state.led = card;
      state.leader = player;
      state.turn = player === 0 ? 1 : 0;

      const value = search(state, us, alpha, beta);

      hand.push(card);
      state.led = null;
      state.turn = player;

      if (maximising) {
        if (value > best) best = value;
        if (best > alpha) alpha = best;
      } else {
        if (value < best) best = value;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return best;
  }

  /* Answering. Completing the trick scores it and passes the lead. */
  const options = legalIn(state, player);
  let best = maximising ? -Infinity : Infinity;

  for (const card of options) {
    const hand = state.hands[player];
    hand.splice(hand.indexOf(card), 1);

    const leader = state.leader;
    const winner = winnerOf(state.led, card, state.trump, leader, player);
    const last = state.tricksLeft === 1;
    let points = cardValue(state.led, state.trump) + cardValue(card, state.trump);
    if (last) points += LAST_TRICK_BONUS;

    const led = state.led;
    state.led = null;
    state.leader = winner;
    state.turn = winner;
    state.tricksLeft -= 1;

    const gained = winner === us ? points : -points;
    const value = gained + search(state, us, alpha - gained, beta - gained);

    state.tricksLeft += 1;
    state.led = led;
    state.leader = leader;
    state.turn = player;
    hand.push(card);

    if (maximising) {
      if (value > best) best = value;
      if (best > alpha) alpha = best;
    } else {
      if (value < best) best = value;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

const stateFrom = (deal) => ({
  hands: [deal.hands[0].slice(), deal.hands[1].slice()],
  trump: deal.trump,
  leader: deal.trickLead,
  led: deal.trickCards[deal.trickLead] || null,
  turn: deal.turn,
  tricksLeft: TOTAL_TRICKS - deal.trickNumber + 1,
});

/* True margin from here, for `us`, with both hands known. */
export function solve(deal, us, maxNodes = 4_000_000) {
  nodes = 0;
  budget = maxNodes;
  return search(stateFrom(deal), us, -Infinity, Infinity);
}

/* True margin for each legal card, for `us` to play now. */
export function solveOptions(deal, us, maxNodes = 4_000_000) {
  nodes = 0;
  budget = maxNodes;
  const state = stateFrom(deal);
  const player = state.turn;
  const values = new Map();

  for (const card of legalIn(state, player)) {
    const hand = state.hands[player];
    hand.splice(hand.indexOf(card), 1);

    let value;
    if (state.led === null) {
      state.led = card;
      state.leader = player;
      state.turn = player === 0 ? 1 : 0;
      value = search(state, us, -Infinity, Infinity);
      state.led = null;
      state.turn = player;
    } else {
      const leader = state.leader;
      const winner = winnerOf(state.led, card, state.trump, leader, player);
      const last = state.tricksLeft === 1;
      let points = cardValue(state.led, state.trump) + cardValue(card, state.trump);
      if (last) points += LAST_TRICK_BONUS;

      const led = state.led;
      state.led = null;
      state.leader = winner;
      state.turn = winner;
      state.tricksLeft -= 1;

      const gained = winner === us ? points : -points;
      value = gained + search(state, us, -Infinity, Infinity);

      state.tricksLeft += 1;
      state.led = led;
      state.leader = leader;
      state.turn = player;
    }

    hand.push(card);
    values.set(card, value);
  }
  return values;
}
