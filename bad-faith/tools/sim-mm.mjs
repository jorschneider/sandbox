// Middleman-mode balance harness: role-aware bots play full games with
// rotating roles.
//
//   node tools/sim-mm.mjs [games] [theme]
//
// The fairness question is per-ROLE, not just per-strategy: if the broker
// seat prints money or the customer seat always bleeds, each round is
// decided by the rotation, not the table talk. Targets:
//  - per-role mean net per round all within ~±$60 of zero
//  - deals close most of the time (60-85%) — a market that never closes
//    or always closes is dead either way
//  - no strategy archetype dominant across seats

import { Game } from '../js/game.js';

const N = parseInt(process.argv[2] || '3000', 10);
const THEME = process.argv[3] || 'classic';

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RATING_PRIOR = { Low: 0.18, Moderate: 0.27, High: 0.34, Unknown: 0.3 };

// Archetypes: how a player behaves in each seat they rotate through.
// carrierMargin: markup on estimated expected loss when quoting wholesale.
// brokerMarkup: multiplier on chosen wholesale for the retail price.
// custAccept: sign if retail <= trueEV * this.
const STRATS = {
  fair:   { carrierMargin: 1.10, brokerMarkup: 1.35, custAccept: 1.25 },
  greedy: { carrierMargin: 1.30, brokerMarkup: 1.70, custAccept: 1.00 },
  timid:  { carrierMargin: 1.00, brokerMarkup: 1.15, custAccept: 1.55 },
  noise:  { carrierMargin: null, brokerMarkup: null, custAccept: null }, // random
};
const names = Object.keys(STRATS);

const roleNet = { customer: [], broker: [], carrier: [] };
const finals = Object.fromEntries(names.map(n => [n, []]));
const wins = Object.fromEntries(names.map(n => [n, 0]));
let deals = 0, closes = 0, bare = 0, bareHit = 0;

for (let g = 0; g < N; g++) {
  const rng = lcg(4000 + g);
  const game = new Game({ rng, theme: THEME, mode: 'middleman' });
  const seat = names.map((_, i) => names[(i + g) % names.length]);
  seat.forEach((s, i) => game.addPlayer('P' + i, s, '🤖', i === 0));
  game.start();

  while (game.phase !== 'results') {
    if (game.phase === 'mm_brief') {
      game.mmOpen();

      const m = game.mm;
      const c = m.client;
      // carriers quote
      for (const pid of m.carriers) {
        const st = STRATS[seat[+pid[1]]];
        let est = RATING_PRIOR[c.rating] ?? 0.28;
        for (const card of m.seen[pid] || []) est += card.delta;
        est = Math.max(0.05, est);
        const [lo, hi] = game.mmWholesaleBand();
        const q = st.carrierMargin == null
          ? lo + (hi - lo) * rng()
          : est * c.coverage * st.carrierMargin * (0.97 + 0.06 * rng());
        game.mmQuote(pid, Math.round(q));
      }
      // broker picks cheapest, marks up
      const st = STRATS[seat[+m.broker[1]]];
      const [cid, w] = Object.entries(m.wholesale).sort((a, b) => a[1] - b[1])[0];
      const markup = st.brokerMarkup == null ? 1.05 + rng() * 0.9 : st.brokerMarkup;
      game.mmSetRetail(m.broker, cid, Math.round(w * markup));
      // customer decides on true EV
      const cst = STRATS[seat[+m.customer[1]]];
      const ev = game.mmRisk() * c.coverage;
      const threshold = cst.custAccept == null ? (rng() < 0.5 ? 0 : 99) : cst.custAccept;
      game.mmDecide(m.customer, m.retail <= ev * threshold);

      // collect per-role nets for the round
      deals++;
      if (m.accepted) closes++; else { bare++; if (m.result.hit) bareHit++; }
      const net = (pid) => game.byId(pid).capital - game.roundLedger[pid].start;
      roleNet.customer.push(net(m.customer));
      roleNet.broker.push(net(m.broker));
      for (const pid of m.carriers) roleNet.carrier.push(net(pid));

      game.mmAdvance(); game.mmAdvance();
      game.nextRound();
    }
  }

  for (const p of game.players) {
    finals[p.name].push(p.capital);
    if (game.winnerIds.includes(p.id)) wins[p.name] += 1 / game.winnerIds.length;
  }
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

console.log(`\n=== middleman · ${THEME} · ${N} games ===`);
console.log(`deals closed: ${(closes / deals * 100).toFixed(0)}% | went bare: ${(bare / deals * 100).toFixed(0)}% (burned ${(bareHit / Math.max(1, bare) * 100).toFixed(0)}% of those)`);
console.log(`per-role mean net/round:  customer $${mean(roleNet.customer).toFixed(0)} | broker $${mean(roleNet.broker).toFixed(0)} | carrier $${mean(roleNet.carrier).toFixed(0)}`);
console.log('\nstrategy      mean final    win rate');
for (const n of names) {
  console.log(`${n.padEnd(12)} $${mean(finals[n]).toFixed(0).padStart(6)}      ${(wins[n] / N * 100).toFixed(1)}%`);
}
