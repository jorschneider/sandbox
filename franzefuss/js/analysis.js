/*
 * The review.
 *
 * Grades the cards you played in the last nine tricks, exactly.
 *
 * Why only those nine: while the stock lasts, cards you have never seen are
 * still to come, and the right play is a judgement under uncertainty. Grading
 * it would mean grading you against a layout you had no way of knowing, and
 * marking you down for not guessing. The first version of this file did that,
 * with Monte-Carlo rollouts, and it was worse than useless — it agreed with a
 * greedy always-play-your-best-card policy 44% of the time while that policy
 * lost by 119 points a deal. A review that teaches bad habits is a liability.
 *
 * Once the stock is empty the game changes character. Your nine cards, plus the
 * fourteen already played, plus your opponent's nine, are the whole pack: the
 * cards you cannot see are precisely the cards they hold, and anyone who has
 * been counting knows them. The endgame is perfect information, so it can be
 * solved outright — and the verdict is a fact rather than an opinion.
 *
 * So the grade covers the half of the deal where a right answer exists. The
 * free-play half is reported as played, not judged.
 */

import { dealFromRecord, playCard, announce, canAnnounce, robTrump, stockExhausted } from './rules.js';
import { solve, solveOptions, SearchAborted } from './solver.js';

export const GRADES = [
  { id: 'best', label: 'Best', upTo: 0 },
  { id: 'good', label: 'Good', upTo: 2 },
  { id: 'inaccuracy', label: 'Inaccuracy', upTo: 6 },
  { id: 'mistake', label: 'Mistake', upTo: 14 },
  { id: 'blunder', label: 'Blunder', upTo: Infinity },
];

export const gradeOf = (loss) => GRADES.find((grade) => loss <= grade.upTo);

/*
 * Replay the deal, solving each endgame decision the player actually faced.
 * A forced play is not a decision and is not graded.
 */
export function reviewDeal(record, player) {
  if (!record || !record.actions.length) return null;

  const deal = dealFromRecord(record);
  const decisions = [];

  /*
   * The one exact thing that can be said about the first half. Individual plays
   * there are judgement under uncertainty and are not graded, but the position
   * they leave you in the moment the stock empties is a solved number: the
   * margin you were holding before a card of the endgame was played.
   */
  let position = null;

  for (const action of record.actions) {
    if (position === null && deal.stage === 'play' && stockExhausted(deal)) {
      try {
        position = solve(deal, player);
      } catch (error) {
        if (!(error instanceof SearchAborted)) throw error;
      }
    }

    if (
      action.type === 'play' &&
      action.player === player &&
      deal.stage === 'play' &&
      stockExhausted(deal)
    ) {
      let values = null;
      try {
        values = solveOptions(deal, player);
      } catch (error) {
        if (!(error instanceof SearchAborted)) throw error;
      }
      if (values && values.size > 1) {
        const ranked = [...values.entries()]
          .map(([card, value]) => ({ card, value }))
          .sort((a, b) => b.value - a.value);
        const best = ranked[0];
        const chosen = ranked.find((one) => one.card === action.card);
        const loss = Math.max(0, best.value - (chosen ? chosen.value : best.value));

        decisions.push({
          trickNumber: deal.trickNumber,
          leading: deal.trickLead === player,
          played: action.card,
          best: best.card,
          loss,
          grade: gradeOf(loss).id,
          /* The whole ranking, so a player can see how close the calls were. */
          options: ranked.map((one) => ({ card: one.card, value: one.value })),
        });
      }
    }

    if (action.type === 'play') playCard(deal, action.player, action.card);
    else if (action.type === 'rob') robTrump(deal, action.player);
    else if (action.type === 'announce' && canAnnounce(deal, action.player)) {
      announce(deal, action.player, action.kind);
    }
  }

  return { ...summarise(decisions), position };
}

/*
 * Accuracy is the share of value kept across the graded decisions. Each starts
 * at 100 and falls away as the loss grows, steeply at first: giving up the
 * first few points costs far more than the tenth and eleventh do.
 */
function summarise(decisions) {
  const counts = Object.fromEntries(GRADES.map((grade) => [grade.id, 0]));
  let kept = 0;

  for (const decision of decisions) {
    counts[decision.grade] += 1;
    kept += 100 * Math.exp(-decision.loss / 12);
  }

  return {
    accuracy: decisions.length ? Math.round(kept / decisions.length) : null,
    decisions,
    counts,
    graded: decisions.length,
    lost: Math.round(decisions.reduce((sum, one) => sum + one.loss, 0)),
    worst: decisions
      .filter((decision) => decision.loss > 0)
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 3),
  };
}
