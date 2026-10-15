// The Slip (2-player) balance harness.
//
//   node tools/sim-duel.mjs [games] [theme]
//
// Divide-and-choose only works if pricing skill decides games. Targets:
//  - a sharp pricer beats a sloppy one clearly (not 50/50, not 100/0)
//  - neither SEAT is advantaged: pricing and choosing should net out even
//    across the rotation, or the alternation decides the winner
//  - claims still bite (~25-32% of policies) and margins stay modest

import { Game, RULES } from '../js/game.js';
if (process.env.DROUNDS) RULES.duel.rounds = parseInt(process.env.DROUNDS, 10);
if (process.env.DPAY) RULES.duel.payoutPct = parseInt(process.env.DPAY, 10);

const N = parseInt(process.argv[2] || '4000', 10);
const THEME = process.argv[3] || 'classic';
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const RATING_PRIOR = { Low: 0.18, Moderate: 0.27, High: 0.34, Unknown: 0.3 };

// Each archetype estimates a client's risk, then prices/chooses off it.
// `noise` is how wrong their read is; `margin` is the cut they want.
// The transfer moves money both ways, so the sweetener that makes the two
// sides equal is HALF the value gap. `factor` is how far off that a bot is.
const STRATS = {
  sharp: { noise: 0.03, factor: 1.00, usesIntel: true },
  loose: { noise: 0.14, factor: 1.00, usesIntel: true },  // reads risk badly
  blind: { noise: 0.05, factor: 1.00, usesIntel: false }, // ignores its intel
  greedy: { noise: 0.05, factor: 0.55, usesIntel: true }, // under-sweetens
};
const names = Object.keys(STRATS);

function estimate(game, pid, m, st, rng) {
  let e = RATING_PRIOR[m.client.rating] ?? 0.28;
  if (st.usesIntel) for (const c of game.intel[pid] || []) if (c.clientId === m.client.id) e += c.delta;
  return Math.max(0.04, e + (rng() * 2 - 1) * st.noise);
}

const finals = Object.fromEntries(names.map(n => [n, []]));
const wins = Object.fromEntries(names.map(n => [n, 0]));
let priceNet = 0, chooseNet = 0, rounds = 0, policies = 0, claims = 0, premiums = 0, losses = 0;
let headToHead = { sharpWins: 0, looseWins: 0, draws: 0 };
const byRole = Object.fromEntries(names.map(n => [n, { priceNet: 0, priceN: 0, chooseNet: 0, chooseN: 0 }]));

for (let g = 0; g < N; g++) {
  const rng = lcg(9000 + g);
  const game = new Game({ rng, theme: THEME, mode: 'duel' });
  // strict round-robin over every unordered pair, alternating who sits
  // first — otherwise an archetype can simply draw weaker opponents
  const PAIRS = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) PAIRS.push([i, j]);
  const pr = PAIRS[Math.floor(g / 2) % PAIRS.length];
  const seat = (g % 2 ? [pr[1], pr[0]] : pr).map(i => names[i]);
  seat.forEach((s, i) => game.addPlayer('P' + i, s, '🤖', i === 0));
  game.start();

  let guard = 0;
  while (game.phase !== 'results' && guard++ < 3000) {
    if (game.phase === 'duel_price') {
      const pid = game.duel.pricer, st = STRATS[seat[+pid[1]]];
      // value = premium - my estimate of expected loss; sweeten the worse side
      const vals = game.market.map(m => ({
        m, v: m.premium - estimate(game, pid, m, st, rng) * m.client.coverage,
      }));
      const better = vals[0].v >= vals[1].v ? vals[0] : vals[1];
      const gap = Math.abs(vals[0].v - vals[1].v) / 2 * st.factor;
      game.setSlip(pid, { clientId: better.m.client.id, amount: Math.round(gap) });
    } else if (game.phase === 'duel_choose') {
      const pid = game.duel.chooser, st = STRATS[seat[+pid[1]]];
      const off = game.duel.offer;
      let best = null;
      for (const m of game.market) {
        const surcharge = m.client.id === off.clientId ? off.amount : -off.amount;
        const edge = m.premium - estimate(game, pid, m, st, rng) * m.client.coverage - surcharge;
        if (!best || edge > best.edge) best = { id: m.client.id, edge };
      }
      game.chooseSlip(pid, best.id);
    } else if (game.phase === 'deals') {
      for (const m of game.market) { policies++; premiums += m.premium; }
      game.endDeals();
      for (const r of game.claims.results) if (r.hit && r.insured) { claims++; losses += r.coverage; }
    } else if (game.phase === 'claims') {
      game.advanceClaims();
    } else if (game.phase === 'ledger') {
      // attribute the round's swing to the seat that priced vs the one that chose
      const led = game.ledger[game.ledger.length - 1];
      const pRow = led.summary.find(s => s.pid === game.duel.pricer);
      const cRow = led.summary.find(s => s.pid === game.duel.chooser);
      priceNet += pRow.net; chooseNet += cRow.net; rounds++;
      const pName = seat[+game.duel.pricer[1]], cName = seat[+game.duel.chooser[1]];
      byRole[pName].priceNet += pRow.net; byRole[pName].priceN++;
      byRole[cName].chooseNet += cRow.net; byRole[cName].chooseN++;
      game.nextRound();
    } else break;
  }

  const [a, b] = game.players;
  finals[seat[0]].push(a.capital);
  finals[seat[1]].push(b.capital);
  for (const p of game.players) if (game.winnerIds.includes(p.id)) wins[seat[+p.id[1]]] += 1 / game.winnerIds.length;
  // direct sharp-vs-loose record when they meet
  if (seat.includes('sharp') && seat.includes('loose')) {
    const sharpP = game.players[seat.indexOf('sharp')], looseP = game.players[seat.indexOf('loose')];
    if (sharpP.capital > looseP.capital) headToHead.sharpWins++;
    else if (looseP.capital > sharpP.capital) headToHead.looseWins++;
    else headToHead.draws++;
  }
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
console.log(`\n=== the slip · ${THEME} · ${N} games · ${RULES.duel.rounds} rounds ===`);
console.log(`claim rate on policies: ${(claims / policies * 100).toFixed(1)}% | avg premium $${(premiums / policies).toFixed(0)} | avg loss/policy $${(losses / policies).toFixed(0)} | margin $${((premiums - losses) / policies).toFixed(0)}`);
console.log(`seat fairness — pricing seat nets $${(priceNet / rounds).toFixed(0)}/round vs choosing seat $${(chooseNet / rounds).toFixed(0)}/round`);
console.log('\nstrategy      mean final    win rate');
for (const n of names) console.log(`${n.padEnd(12)} $${mean(finals[n]).toFixed(0).padStart(6)}      ${(wins[n] / N * 100).toFixed(1)}%`);
console.log('\nstrategy      $/round pricing   $/round choosing');
for (const n of names) {
  const r = byRole[n];
  console.log(`${n.padEnd(12)} ${(r.priceNet / (r.priceN||1)).toFixed(0).padStart(10)}      ${(r.chooseNet / (r.chooseN||1)).toFixed(0).padStart(10)}`);
}
const hh = headToHead.sharpWins + headToHead.looseWins + headToHead.draws;
if (hh) console.log(`\nsharp vs loose head-to-head: sharp ${(headToHead.sharpWins / hh * 100).toFixed(1)}% · loose ${(headToHead.looseWins / hh * 100).toFixed(1)}% · draws ${(headToHead.draws / hh * 100).toFixed(1)}%`);
