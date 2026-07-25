// Economy tuning harness: plays thousands of headless games with four bot
// archetypes and reports the numbers that matter for balance.
//
//   node tools/sim.mjs [games] [theme]
//
// Targets for a healthy party-game economy:
//  - insured policies that claim: ~30-38%
//  - playing beats passing: passer mean final should NOT top the table
//  - informed (intel-aware) > naive > reckless
//  - bankruptcies (final < 0): under ~12% of players
//  - winner's mean final around 1.8-2.5x starting capital

import { Game, RULES } from '../js/game.js';
import { THEMES } from '../js/content.js';

const N = parseInt(process.argv[2] || '3000', 10);
const THEME = process.argv[3] || 'classic';

// Deterministic rng per game for reproducibility.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RATING_PRIOR = { Low: 0.18, Moderate: 0.27, High: 0.34, Unknown: 0.30 };

const STRATS = {
  // Never plays. The baseline any strategy must beat for the game to work.
  passer: () => ({}),

  // Undercuts on everything: quotes near the bottom of the band.
  reckless: (view, rng) => {
    const q = {};
    for (const m of view.market) q[m.id] = Math.round(m.band[0] + (m.band[1] - m.band[0]) * 0.1 * rng());
    return q;
  },

  // Quotes a random point in the band on ~2 of 3 clients.
  naive: (view, rng) => {
    const q = {};
    for (const m of view.market) {
      if (rng() < 0.67) q[m.id] = Math.round(m.band[0] + (m.band[1] - m.band[0]) * rng());
    }
    return q;
  },

  // Uses the brochure prior plus its own intel; wants a margin; passes on
  // anything whose band can't cover estimated expected loss.
  informed: (view, rng) => {
    const q = {};
    for (const m of view.market) {
      let est = RATING_PRIOR[m.rating] ?? 0.28;
      for (const c of view.you.intel) if (c.clientId === m.id) est += c.delta;
      est = Math.max(0.03, est);
      const target = Math.round(est * m.coverage * (1.05 + 0.15 * rng()));
      if (target > m.band[1]) continue; // can't price it profitably; walk away
      q[m.id] = Math.max(m.band[0], target);
    }
    return q;
  },
};

const names = Object.keys(STRATS);
const agg = {
  finals: Object.fromEntries(names.map(n => [n, []])),
  wins: Object.fromEntries(names.map(n => [n, 0])),
  policies: 0, claims: 0, unsold: 0, clientSeen: 0,
  premiumSum: 0, lossSum: 0, riskSum: 0,
  bankrupt: 0, winnerFinals: [],
  perClient: {},
};

for (let g = 0; g < N; g++) {
  const rng = lcg(1000 + g);
  const game = new Game({ rng, theme: THEME });
  // rotate seats so no strategy owns an advantage from order
  const seat = process.env.SEAT ? process.env.SEAT.split(',') : names.map((_, i) => names[(i + g) % names.length]);
  seat.forEach((s, i) => game.addPlayer('P' + i, s, '🤖', i === 0));
  game.start();

  while (game.phase !== 'results') {
    if (game.phase === 'market') {
      game.openQuotes();
      for (let i = 0; i < 4; i++) {
        const view = game.viewFor('P' + i);
        game.submitQuotes('P' + i, STRATS[seat[i]](view, rng));
      }
      // finishQuotes fires automatically once all four are in
      for (const m of game.market) {
        agg.clientSeen++;
        const pc = agg.perClient[m.client.id] ??= { seen: 0, sold: 0, claims: 0, premium: 0, loss: 0 };
        pc.seen++;
        if (m.winner) {
          agg.policies++; pc.sold++;
          agg.premiumSum += m.premium; pc.premium += m.premium;
          agg.riskSum += game.effectiveRisk(m);
        } else agg.unsold++;
      }
      game.openDeals();
      game.endDeals();
      for (const r of game.claims.results) {
        if (r.insured && r.hit) {
          agg.claims++;
          agg.lossSum += game.market.find(m => m.client.id === r.clientId).client.coverage;
          agg.perClient[r.clientId].claims++;
          agg.perClient[r.clientId].loss += game.market.find(m => m.client.id === r.clientId).client.coverage;
        }
      }
      game.claims.revealed = game.claims.results.length;
      game.advanceClaims(); // -> ledger
      game.nextRound();
    }
  }

  const ranked = game.players.slice().sort((a, b) => b.capital - a.capital);
  agg.winnerFinals.push(ranked[0].capital);
  for (const p of game.players) {
    agg.finals[p.name].push(p.capital);
    if (p.capital < 0) agg.bankrupt++;
    if (game.winnerIds.includes(p.id)) agg.wins[p.name] += 1 / game.winnerIds.length;
  }
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

console.log(`\n=== ${THEME} · ${N} games · ${RULES.rounds} rounds · start $${RULES.startingCapital} ===`);
console.log(`policies sold: ${(agg.policies / agg.clientSeen * 100).toFixed(0)}% of clients | claim rate on insured: ${(agg.claims / agg.policies * 100).toFixed(1)}% | avg effective risk: ${(agg.riskSum / agg.policies * 100).toFixed(1)}%`);
console.log(`avg premium: $${(agg.premiumSum / agg.policies).toFixed(0)} | avg loss per policy: $${(agg.lossSum / agg.policies).toFixed(0)} | insurer margin per policy: $${((agg.premiumSum - agg.lossSum) / agg.policies).toFixed(0)}`);
console.log(`bankrupt players: ${(agg.bankrupt / (N * 4) * 100).toFixed(1)}% | avg winner final: $${mean(agg.winnerFinals).toFixed(0)}`);
console.log('\nstrategy      mean final    win rate');
for (const n of names) {
  console.log(`${n.padEnd(12)} $${mean(agg.finals[n]).toFixed(0).padStart(6)}      ${(agg.wins[n] / N * 100).toFixed(1)}%`);
}

console.log('\nper-client (sold% / claim% when sold / avg margin $):');
const rows = Object.entries(agg.perClient).map(([id, c]) => {
  const margin = c.sold ? (c.premium - c.loss) / c.sold : 0;
  return { id, sold: c.sold / c.seen * 100, claim: c.sold ? c.claims / c.sold * 100 : 0, margin };
}).sort((a, b) => a.margin - b.margin);
for (const r of rows) {
  console.log(`${r.id.padEnd(20)} ${r.sold.toFixed(0).padStart(3)}%   ${r.claim.toFixed(0).padStart(3)}%   ${r.margin.toFixed(0).padStart(6)}`);
}
