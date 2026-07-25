// Fast engine rules tests — no browser, runs in well under a second.
//   node tools/test.mjs
// Covers the invariants that E2E is too slow to guard on every change.

import { Game, RULES } from '../js/game.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
};
const group = (n) => console.log(`\n${n}`);
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

function seat(g, n = 4, host = 0) {
  ['A', 'B', 'C', 'D'].slice(0, n).forEach((name, i) => g.addPlayer('P' + i, name, null, i === host));
  return g;
}
function quoteAll(g, premiumOf = (m) => m.band[1]) {
  for (const p of g.players) {
    const v = g.viewFor(p.id), q = {};
    for (const m of v.market) q[m.id] = { premium: premiumOf(m), coverage: m.coverage };
    g.submitQuotes(p.id, q);
  }
}

group('claims settle only as files are revealed (no spoilers)');
{
  let found = false;
  for (let s = 1; s < 60 && !found; s++) {
    const g = seat(new Game({ rng: lcg(s) }));
    g.start(); g.openQuotes();
    if (g.phase === 'auction') { g.placeBid('P1', g.auction.bid - 50); g.finishAuction(); }
    quoteAll(g);
    g.openDeals(); g.endDeals();
    const hit = g.claims.results.find(r => r.hit && r.insured);
    if (!hit) continue;
    found = true;
    const idx = g.claims.results.indexOf(hit);
    const ownerBefore = g.byId(hit.winner).capital;
    // With zero files opened the payout must NOT be on anyone's screen yet.
    ok('an unrevealed claim is not yet deducted', ownerBefore > 0 && ownerBefore >= RULES.startingCapital,
      `owner already at $${ownerBefore} with 0 files opened`);
    for (let i = 0; i <= idx; i++) g.advanceClaims();
    const ownerAfter = g.byId(hit.winner).capital;
    ok('opening that file is what moves the money', ownerAfter < ownerBefore,
      `$${ownerBefore} -> $${ownerAfter}`);
  }
  ok('found a hitting seed to test', found);
}

group('middleman reveal is likewise unspoiled');
{
  const g = seat(new Game({ rng: lcg(11), mode: 'middleman' }));
  g.start(); g.mmOpen();
  for (const c of g.mm.carriers) g.mmQuote(c, 300);
  g.mmSetRetail(g.mm.broker, g.mm.chosenCarrier || g.mm.carriers[0], 420);
  g.mmDecide(g.mm.customer, true);
  const before = g.players.map(p => p.capital).join(',');
  g.mmAdvance(); // the reveal
  ok('money moves on reveal, not at decision time', before !== g.players.map(p => p.capital).join(','));
}

group('timeouts never leave the next phase without a clock');
{
  const g = seat(new Game({ rng: lcg(5), mode: 'middleman' }));
  g.start(); g.mmOpen();
  for (const c of g.mm.carriers) g.mmQuote(c, 300);
  let guard = 0;
  while (g.phase === 'mm_markup' && guard++ < 300) g.tick();
  ok('markup timeout hands mm_decide a live timer', g.phase === 'mm_decide' && g.timer !== null,
    `phase=${g.phase} timer=${JSON.stringify(g.timer)}`);
  guard = 0;
  while (g.phase === 'mm_decide' && guard++ < 300) g.tick();
  ok('decide timeout resolves the round on its own', g.phase === 'mm_claims');
}
{
  const g = seat(new Game({ rng: lcg(6), mode: 'middleman' }));
  g.start(); g.mmOpen();
  let guard = 0;
  while (g.phase === 'mm_wholesale' && guard++ < 300) g.tick();
  ok('wholesale timeout leaves a live clock or resolves', g.timer !== null || g.phase === 'mm_claims',
    `phase=${g.phase}`);
}

group('solvency cap is fixed for the whole quarter');
{
  const g = seat(new Game({ rng: lcg(3) }), 2);
  g.start();
  const cap = g.solvencyCap('P0');
  g.openQuotes();
  if (g.phase === 'auction') g.finishAuction();
  quoteAll(g);
  let exposure = 0;
  for (const m of g.market) if (m.winner === 'P0') exposure += m.soldCoverage;
  ok('signed exposure never exceeds the cap quoted at the time', exposure <= cap,
    `signed ${exposure} against cap ${cap}`);
}

group('rookie desk really is stripped down');
{
  const g = seat(new Game({ rng: lcg(9), ruleset: 'rookie' }));
  g.start();
  ok('no syndicated lot', !g.market.some(m => m.syndicated));
  ok('no auction phase', g.phase === 'market' && (g.openQuotes(), g.phase === 'quotes'));
  ok('short desk refuses', !!g.placeShort('P1', g.market[0].client.id, 100).error);
  // engine must ignore a partial-coverage quote even if a stale client sends one
  g.submitQuotes('P0', { [g.market[0].client.id]: { premium: 200, coverage: Math.round(g.market[0].client.coverage / 2) } });
  ok('partial coverage snaps to full', g.market[0].quotes.P0.coverage === g.market[0].client.coverage,
    JSON.stringify(g.market[0].quotes.P0));
  const solo = seat(new Game({ ruleset: 'rookie' }), 2);
  solo.start();
  while (solo.phase !== 'results') {
    if (solo.phase === 'market') solo.openQuotes();
    else if (solo.phase === 'quotes') { solo.submitQuotes('P0', {}); solo.submitQuotes('P1', {}); }
    else if (solo.phase === 'reveal') solo.openDeals();
    else if (solo.phase === 'deals') solo.endDeals();
    else if (solo.phase === 'claims') solo.advanceClaims();
    else if (solo.phase === 'ledger') solo.nextRound();
  }
  ok('a passive rookie ends at exactly starting capital',
    solo.byId('P0').capital === RULES.startingCapital, `$${solo.byId('P0').capital}`);
}

group('open outcry');
{
  const g = seat(new Game({ rng: lcg(2) }));
  g.start();
  const lot = g.market.find(m => m.syndicated);
  ok('a syndicated lot exists in full market', !!lot);
  g.openQuotes();
  ok('opening the floor starts the auction', g.phase === 'auction');
  const open = g.auction.bid;
  ok('bid above the ask is refused', !!g.placeBid('P1', open + 10).error);
  ok('bid below the floor is refused', !!g.placeBid('P1', g.auction.floor - 1).error);
  ok('a valid undercut takes the lead', !g.placeBid('P1', open - 25).error && g.auction.leader === 'P1');
  ok('the leader cannot bid against themselves', !!g.placeBid('P1', g.auction.bid - 25).error);
  const t0 = g.timer.remaining;
  g.tick(); g.tick();
  g.placeBid('P2', g.auction.bid - 25);
  ok('every bid resets the anti-snipe clock', g.timer.remaining === RULES.auction.resetSeconds,
    `was ${t0}, now ${g.timer.remaining}`);
  let guard = 0;
  while (g.phase === 'auction' && guard++ < 300) g.tick();
  ok('the clock closes the lot and moves to sealed quotes', g.phase === 'quotes');
  const won = g.market.find(m => m.client.id === g.auction.clientId);
  ok('the last bidder owns the lot at their bid', won.winner === 'P2' && won.premium === g.auction.bid);
  ok('the winner banked the premium', g.byId('P2').capital === RULES.startingCapital + won.premium);
  ok('the auctioned lot is excluded from sealed quotes', (quoteAll(g), won.quotes.P0 === undefined));
}
{
  const g = seat(new Game({ rng: lcg(4) }));
  g.start(); g.openQuotes();
  let guard = 0;
  while (g.phase === 'auction' && guard++ < 300) g.tick();
  const lot = g.market.find(m => m.client.id === g.auction.clientId);
  ok('an unsold lot has no winner and no layoff duty', !lot.winner && !lot.syndicated);
}

group('renewals');
{
  const g = seat(new Game({ rng: lcg(21) }));
  g.start();
  const syn = g.market.find(m => m.syndicated);
  const boosted = syn.client.coverage, base = syn.baseClient.coverage;
  ok('syndication boosts the lot for this quarter only', boosted > base);
  // force it to survive and become the renewal
  g.openQuotes(); g.placeBid('P0', g.auction.bid - 25); g.finishAuction();
  quoteAll(g); g.openDeals(); g.endDeals();
  for (const r of g.claims.results) if (r.clientId === syn.client.id) { r.hit = false; r.settle = []; r.payouts = []; }
  while (g.claims.revealed < g.claims.results.length) g.advanceClaims();
  if (g.pendingRenewal && g.pendingRenewal.client.id === syn.client.id) {
    ok('a renewed whale returns at its natural size', g.pendingRenewal.client.coverage === base,
      `${g.pendingRenewal.client.coverage} vs base ${base}`);
  } else ok('a renewed whale returns at its natural size', true, '(different client renewed; not applicable)');
}
{
  // incumbent keeps the client unless undercut by 10%
  const g = seat(new Game({ rng: lcg(31) }), 2);
  g.start();
  const m = g.market.find(x => !x.syndicated);
  m.renewal = { incumbent: 'P0', lastRate: 0.3 };
  g.phase = 'quotes';
  g.submitQuotes('P0', { [m.client.id]: { premium: Math.round(m.client.coverage * 0.30), coverage: m.client.coverage } });
  g.submitQuotes('P1', { [m.client.id]: { premium: Math.round(m.client.coverage * 0.28), coverage: m.client.coverage } });
  ok('a 7% undercut is not enough to poach', m.winner === 'P0', `winner=${m.winner}`);
}
{
  const g = seat(new Game({ rng: lcg(32) }), 2);
  g.start();
  const m = g.market.find(x => !x.syndicated);
  m.renewal = { incumbent: 'P0', lastRate: 0.3 };
  g.phase = 'quotes';
  g.submitQuotes('P0', { [m.client.id]: { premium: Math.round(m.client.coverage * 0.30), coverage: m.client.coverage } });
  g.submitQuotes('P1', { [m.client.id]: { premium: Math.round(m.client.coverage * 0.20), coverage: m.client.coverage } });
  ok('a 33% undercut poaches the client', m.winner === 'P1', `winner=${m.winner}`);
}

group('full games terminate in every configuration');
for (const [label, cfg] of [
  ['market/full', { ruleset: 'full' }],
  ['market/rookie', { ruleset: 'rookie' }],
  ['middleman', { mode: 'middleman' }],
  ['nyc/full', { theme: 'nyc', ruleset: 'full' }],
]) {
  let done = false;
  for (let s = 1; s <= 3 && !done; s++) {
    const g = seat(new Game({ rng: lcg(100 + s), ...cfg }));
    g.start();
    let guard = 0;
    while (g.phase !== 'results' && guard++ < 4000) {
      if (g.phase === 'market') g.openQuotes();
      else if (g.phase === 'auction') { if (guard % 3 === 0) g.placeBid('P' + (guard % 4), g.auction.bid - 25); g.tick(); }
      else if (g.phase === 'quotes') quoteAll(g);
      else if (g.phase === 'reveal') g.openDeals();
      else if (g.phase === 'deals') g.endDeals();
      else if (g.phase === 'claims') g.advanceClaims();
      else if (g.phase === 'ledger') g.nextRound();
      else if (g.phase === 'mm_brief') g.mmOpen();
      else if (g.phase === 'mm_wholesale') { for (const c of g.mm.carriers) g.mmQuote(c, 300); }
      else if (g.phase === 'mm_markup') g.mmSetRetail(g.mm.broker, g.mm.carriers[0], 400);
      else if (g.phase === 'mm_decide') g.mmDecide(g.mm.customer, guard % 2 === 0);
      else if (g.phase === 'mm_claims') g.mmAdvance();
      else break;
    }
    done = g.phase === 'results';
    ok(`${label} reaches results (seed ${100 + s})`, done, `stuck in ${g.phase} after ${guard} steps`);
  }
}

group('ledger conserves money');
{
  const g = seat(new Game({ rng: lcg(77) }));
  g.start();
  let guard = 0;
  while (g.phase !== 'results' && guard++ < 4000) {
    if (g.phase === 'market') g.openQuotes();
    else if (g.phase === 'auction') { g.placeBid('P1', g.auction.bid - 50); g.tick(); }
    else if (g.phase === 'quotes') quoteAll(g);
    else if (g.phase === 'reveal') g.openDeals();
    else if (g.phase === 'deals') g.endDeals();
    else if (g.phase === 'claims') g.advanceClaims();
    else if (g.phase === 'ledger') g.nextRound();
  }
  let bad = null;
  for (const round of g.ledger) {
    for (const s of round.summary) {
      const parts = s.premiums + s.claims + s.reFees + s.rePayouts + s.intelTrade + s.cash + s.bets + s.fines + s.overhead + s.bonus + (s.revenue || 0);
      if (Math.abs(parts - s.net) > 1) bad = `r${round.round} ${s.pid}: parts ${parts} vs net ${s.net}`;
    }
  }
  ok('every ledger row sums to its net change', !bad, bad || '');
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
