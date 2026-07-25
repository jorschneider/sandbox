// Chaos harness: plays random games across every mode, table size and
// rulebook, firing plausible-but-wrong actions (out of turn, out of phase,
// from the wrong player) and dropping phones mid-round. Nothing here should
// crash, stall, mint money, or leak another player's private information.
//
//   node tools/fuzz.mjs [games]

import { Game, RULES } from '../js/game.js';

const N = parseInt(process.argv[2] || '1500', 10);
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const problems = [];
const note = (seed, msg) => { if (problems.length < 40) problems.push(`seed ${seed}: ${msg}`); };

const MODES = ['market', 'middleman', 'duel'];

for (let g = 0; g < N; g++) {
  const seed = 5000 + g;
  const rng = lcg(seed);
  const mode = MODES[g % MODES.length];
  const ruleset = rng() < 0.5 ? 'rookie' : 'full';
  const theme = rng() < 0.5 ? 'classic' : 'nyc';
  let nPlayers = mode === 'duel' ? 2 : mode === 'middleman' ? 3 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);

  const game = new Game({ rng, mode, ruleset, theme });
  const ids = [];
  for (let i = 0; i < nPlayers; i++) { ids.push('P' + i); game.addPlayer('P' + i, 'B' + i, null, i === 0, 'key' + i); }
  const started = game.start();
  if (started.error) { note(seed, `start refused: ${started.error} (${mode}/${nPlayers}p)`); continue; }

  const startTotal = game.players.reduce((s, p) => s + p.capital, 0);
  let guard = 0, lastPhase = '', stuck = 0;

  while (game.phase !== 'results' && guard++ < 3000) {
    const before = game.phase;
    if (before === lastPhase) stuck++; else { stuck = 0; lastPhase = before; }
    if (stuck > 400) { note(seed, `stalled in ${before} (${mode}/${nPlayers}p/${ruleset})`); break; }

    // --- noise: wrong player, wrong phase, junk payloads ---
    if (rng() < 0.35) {
      const who = ids[Math.floor(rng() * ids.length)];
      const junk = [
        { type: 'submitQuotes', quotes: { nope: { premium: -5, coverage: 1e9 } } },
        { type: 'placeBid', amount: -1000 },
        { type: 'placeShort', clientId: 'nonexistent', stake: 1e6 },
        { type: 'setSlip', prices: { clientId: 'nope', amount: -50 } },
        { type: 'chooseSlip', clientId: 'nope' },
        { type: 'mmQuote', amount: NaN },
        { type: 'mmSetRetail', carrierId: 'nope', retail: 1e9 },
        { type: 'mmDecide', accept: true },
        { type: 'proposeDeal', deal: { type: 'cash', to: who, amount: -1e6 } },
        { type: 'respondDeal', dealId: 'D999', accept: true },
        { type: 'advanceClaims' }, { type: 'nextRound' }, { type: 'endDeals' },
      ][Math.floor(rng() * 13)];
      try { game.dispatch(who, junk); } catch (e) { note(seed, `dispatch threw on ${junk.type} in ${before}: ${e.message}`); }
      if (game.players.some(p => !isFinite(p.capital))) { note(seed, `capital went non-finite after ${junk.type}`); break; }
      // a stray host-only action can legitimately end the game here
      if (game.phase === 'results') break;
    }

    // --- a phone drops (and usually comes back) ---
    if (rng() < 0.06) {
      const victim = ids[Math.floor(rng() * ids.length)];
      if (victim !== 'P0') {
        game.setConnected(victim, false);
        game.maybeFinishQuotes();
        game.maybeFinishMMQuotes();
        if (rng() < 0.8) game.setConnected(victim, true);
      }
    }

    // --- legitimate play ---
    switch (game.phase) {
      case 'market': game.openQuotes(); break;
      case 'auction': {
        if (rng() < 0.5) {
          const who = ids[Math.floor(rng() * ids.length)];
          game.placeBid(who, game.auction.bid - 25);
        } else game.tick();
        break;
      }
      case 'quotes':
        for (const id of ids) {
          if (!game.byId(id).connected) continue;
          const v = game.viewFor(id), q = {};
          for (const m of v.market) if (rng() < 0.7) q[m.id] = { premium: m.band[1], coverage: m.coverage };
          game.submitQuotes(id, q);
        }
        if (game.phase === 'quotes') game.tick();
        break;
      case 'reveal': game.openDeals(); break;
      case 'deals': {
        if (rng() < 0.3) {
          const a = ids[Math.floor(rng() * ids.length)], b = ids[Math.floor(rng() * ids.length)];
          const res = game.proposeDeal(a, { type: 'cash', to: b, amount: Math.floor(rng() * 200), memo: 'x' });
          if (res.ok && rng() < 0.7) game.respondDeal(b, res.id, rng() < 0.8);
        }
        if (rng() < 0.2 && game.market.some(m => m.winner)) {
          const owner = game.market.find(m => m.winner);
          const other = ids.find(i => i !== owner.winner);
          if (other) {
            const res = game.proposeDeal(owner.winner, { type: 'reinsurance', to: other, clientId: owner.client.id, pct: 40, fee: 100 });
            if (res.ok) game.respondDeal(other, res.id, true);
          }
        }
        if (rng() < 0.25) game.placeShort(ids[Math.floor(rng() * ids.length)], game.market[0].client.id, 100);
        game.endDeals();
        break;
      }
      case 'claims': game.advanceClaims(); break;
      case 'ledger': game.nextRound(); break;
      case 'mm_brief': game.mmOpen(); break;
      case 'mm_wholesale':
        for (const c of game.mm.carriers) if (game.byId(c).connected && rng() < 0.8) game.mmQuote(c, 300);
        if (game.phase === 'mm_wholesale') game.tick();
        break;
      case 'mm_markup':
        if (rng() < 0.7) game.mmSetRetail(game.mm.broker, Object.keys(game.mm.wholesale)[0], 420);
        else game.tick();
        break;
      case 'mm_decide':
        if (rng() < 0.7) game.mmDecide(game.mm.customer, rng() < 0.6); else game.tick();
        break;
      case 'mm_claims': game.mmAdvance(); break;
      case 'duel_price':
        if (rng() < 0.8) game.setSlip(game.duel.pricer, { clientId: game.market[Math.floor(rng() * 2)].client.id, amount: Math.floor(rng() * 600) });
        else game.tick();
        break;
      case 'duel_choose': {
        if (rng() < 0.8) {
          const pick = rng() < 0.15 ? 'walk' : game.market[Math.floor(rng() * 2)].client.id;
          game.chooseSlip(game.duel.chooser, pick);
        } else game.tick();
        break;
      }
      default: note(seed, `unknown phase ${game.phase}`); guard = 1e9; break;
    }

    // --- invariants, checked every step ---
    for (const p of game.players) {
      if (!isFinite(p.capital)) { note(seed, `non-finite capital for ${p.id} in ${game.phase}`); guard = 1e9; }
    }
    // nobody may see another player's intel
    for (const id of ids) {
      const v = game.viewFor(id);
      const mineIds = new Set((game.intel[id] || []).map(c => c.id));
      for (const card of v.you?.intel || []) {
        if (!mineIds.has(card.cardId)) note(seed, `${id} was shown intel it does not hold`);
      }
      if (v.mm) {
        // a carrier must not see rival wholesale quotes before the markup
        if (game.phase === 'mm_wholesale' && id !== game.mm.broker) {
          const seen = Object.keys(v.mm.wholesale || {}).filter(k => k !== id);
          if (seen.length) note(seed, `${id} saw rival wholesale quotes during bidding`);
        }
      }
      if (v.duel && game.phase === 'duel_price' && v.duel.offer !== null) {
        note(seed, `${id} saw the sweetener before it was set`);
      }
    }
  }

  if (game.phase !== 'results' && guard < 1e9) note(seed, `never finished (${mode}/${nPlayers}p, last ${game.phase})`);

  // ledger arithmetic must reconcile against real capital movement
  for (const round of game.ledger) {
    for (const s of round.summary) {
      const parts = s.premiums + s.claims + s.reFees + s.rePayouts + s.intelTrade + s.cash
        + s.bets + s.fines + s.overhead + s.bonus + (s.revenue || 0);
      if (Math.abs(parts - s.net) > 1) note(seed, `ledger r${round.round} ${s.pid}: parts ${parts} != net ${s.net}`);
    }
  }
  if (game.winnerIds && !game.winnerIds.length) note(seed, 'finished with no winner');
  void startTotal;
}

console.log(`\nfuzz: ${N} games across market/middleman/duel, 2-4 players, both rulebooks`);
if (!problems.length) console.log('✓ no crashes, stalls, leaks or ledger breaks\n');
else { console.log(`✗ ${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); console.log(); }
process.exit(problems.length ? 1 : 0);
