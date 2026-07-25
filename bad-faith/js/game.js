// Bad Faith — authoritative game logic. Runs only on the host device.
// Pure-ish: no DOM, no network. The host calls dispatch() with player
// actions and reads viewFor(pid) to send each player their private view.

import { AVATARS, THEMES, UNINSURED_CLAIM, UNINSURED_SAFE } from './content.js';

export const RULES = {
  minPlayers: 2, // 4 is the real game; 2-3 allowed for testing/small groups
  maxPlayers: 4,
  rounds: 5,
  startingCapital: 1000,
  clientsPerRound: 3,
  intelPerPlayer: 1,
  desperateBonusIntel: 1, // extra intel when capital < 0
  quoteSeconds: 75,
  dealSeconds: 90,
  coverageTiers: [0.5, 0.75, 1], // fraction of the client's asked coverage
  // Each round's biggest client is "syndicated": too big for one firm.
  // Its winner must lay off at least layoffPct of it in reinsurance during
  // the deal floor or the contract voids (premium clawed back, plus fine).
  syndicate: { sizeBoost: 1.5, layoffPct: 40, finePct: 0.2 },
  // Public bets against a client, priced off the brochure rating. Once per
  // player per round. Win pays stake * (payout/odds - 1).
  shorts: { min: 25, max: 250, payout: 0.9, odds: { Low: 0.2, Moderate: 0.3, High: 0.4, Unknown: 0.32 } },

  riskFloor: 0.03,
  riskCeil: 0.97,
};

const PHASES = ['lobby', 'market', 'quotes', 'reveal', 'deals', 'claims', 'ledger', 'results'];

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  constructor({ rng = Math.random, theme = 'classic' } = {}) {
    this.rng = rng;
    this.theme = THEMES[theme] || THEMES.classic;
    this.phase = 'lobby';
    this.round = 0; // 1-based once started
    this.players = []; // {id, name, avatar, capital, connected, isHost}
    this.deck = [];
    this.market = []; // per round: [{client, quotes:{pid:amount|null}, winner, premium, reinsurance:[{pid,pct,fee}]}]
    this.intel = {}; // pid -> [{clientId, cardId, text, delta, boughtFrom?}]
    this.dealtCardIds = new Set(); // intel cards in play this round (their deltas apply)
    this.proposals = []; // {id, from, to, type, terms, status}
    this.claims = null; // {results:[...], revealed: n}
    this.ledger = []; // per-round summaries
    this.roundLedger = null; // accumulating {pid: {premiums, claims, reFees, rePayouts, intelTrade, cash}}
    this.timer = null; // {phase, remaining}
    this.log = [];
    this.dealSeq = 0;
    this.winnerIds = null;
  }

  // ---- lobby ----

  addPlayer(id, name, avatar, isHost = false) {
    if (this.phase !== 'lobby') return { error: 'Game already started.' };
    // A dropped connection must not hold a seat: purge ghosts before
    // checking capacity, or a rejoining player gets "Firm is full".
    this.players = this.players.filter(p => p.connected || p.isHost);
    if (this.players.length >= RULES.maxPlayers) return { error: 'Firm is full (4 brokers max).' };
    if (this.players.some(p => p.id === id)) return { error: 'Already joined.' };
    const cleanName = String(name || '').trim().slice(0, 16) || `Broker ${this.players.length + 1}`;
    // Duplicate avatars make the table unreadable; reassign to a free one.
    const taken = new Set(this.players.map(p => p.avatar));
    if (!avatar || taken.has(avatar)) avatar = AVATARS.find(a => !taken.has(a)) || '🐾';
    this.players.push({
      id, name: cleanName, avatar,
      capital: RULES.startingCapital, connected: true, isHost,
    });
    this.addLog(`${avatar} ${cleanName} joined the firm.`);
    return { ok: true };
  }

  setConnected(id, connected) {
    const p = this.byId(id);
    if (p) p.connected = connected;
  }

  // In the lobby a departed player is removed outright (their seat frees
  // up); once the game starts, players are only ever marked disconnected.
  removePlayer(id) {
    if (this.phase !== 'lobby') return;
    const p = this.byId(id);
    if (!p || p.isHost) return;
    this.players = this.players.filter(x => x.id !== id);
    this.addLog(`${p.avatar} ${p.name} left the lobby.`);
  }

  byId(id) { return this.players.find(p => p.id === id); }

  addLog(text) {
    this.log.push({ round: this.round, text });
    if (this.log.length > 60) this.log.shift();
  }

  // ---- round flow ----

  start() {
    if (this.phase !== 'lobby') return { error: 'Already started.' };
    if (this.players.length < RULES.minPlayers) return { error: 'Need at least 2 brokers.' };
    this.deck = shuffle(this.theme.clients, this.rng);
    this.beginRound();
    return { ok: true };
  }

  beginRound() {
    this.round += 1;
    this.phase = 'market';
    this.proposals = [];
    this.claims = null;
    this.dealtCardIds = new Set();
    this.intel = {};
    this.roundLedger = {};
    for (const p of this.players) {
      this.roundLedger[p.id] = { premiums: 0, claims: 0, reFees: 0, rePayouts: 0, intelTrade: 0, cash: 0, bets: 0, fines: 0, start: p.capital };
    }

    const picks = this.deck.splice(0, RULES.clientsPerRound);
    this.market = picks.map(client => ({
      client, quotes: {}, winner: null, premium: null, soldCoverage: null,
      reinsurance: [], shorts: [], syndicated: false, voided: false,
    }));

    // The round's biggest client is syndicated: boosted, and impossible to
    // hold alone — the winner has to bring the table in or lose the deal.
    const big = this.market.reduce((a, b) => (b.client.coverage > a.client.coverage ? b : a));
    const boost = (x) => Math.round(x * RULES.syndicate.sizeBoost / 10) * 10;
    big.syndicated = true;
    big.client = { ...big.client, coverage: boost(big.client.coverage), band: big.client.band.map(boost) };

    // Deal private intel from this round's clients' pools. Only dealt cards
    // affect the true risk, so every card in a hand is true information.
    let pool = [];
    for (const m of this.market) {
      for (const card of m.client.intel) pool.push({ clientId: m.client.id, ...card });
    }
    pool = shuffle(pool, this.rng);
    for (const p of this.players) {
      const n = RULES.intelPerPlayer + (p.capital < 0 ? RULES.desperateBonusIntel : 0);
      this.intel[p.id] = [];
      for (let i = 0; i < n && pool.length; i++) {
        const card = pool.pop();
        this.intel[p.id].push(card);
        this.dealtCardIds.add(card.id);
      }
      if (p.capital < 0) this.addLog(`${p.avatar} ${p.name} is desperate — and desperate brokers hear everything.`);
    }
    this.addLog(`— ${this.theme.roundNames[this.round - 1]}: ${this.market.map(m => m.client.name).join(' · ')} hit the market.`);
  }

  effectiveRisk(marketEntry) {
    let risk = marketEntry.client.baseRisk;
    for (const card of marketEntry.client.intel) {
      if (this.dealtCardIds.has(card.id)) risk += card.delta;
    }
    return Math.min(RULES.riskCeil, Math.max(RULES.riskFloor, risk));
  }

  openQuotes() {
    if (this.phase !== 'market') return { error: 'Not in market phase.' };
    this.phase = 'quotes';
    this.timer = { phase: 'quotes', remaining: RULES.quoteSeconds };
    return { ok: true };
  }

  // quotes: {clientId: {premium, coverage}} — null/absent means pass.
  // Coverage snaps to an allowed tier of the asked amount; the premium is
  // clamped to the band scaled by that tier.
  submitQuotes(pid, quotes) {
    if (this.phase !== 'quotes') return { error: 'Quotes are closed.' };
    for (const m of this.market) {
      if (pid in m.quotes) return { error: 'Already submitted.' };
    }
    for (const m of this.market) {
      const q = quotes ? quotes[m.client.id] : null;
      const prem = q && +q.premium, cov = q && +q.coverage;
      if (isFinite(prem) && prem > 0 && isFinite(cov) && cov > 0) {
        const full = m.client.coverage;
        const tier = RULES.coverageTiers.reduce((best, t) =>
          Math.abs(cov - full * t) < Math.abs(cov - full * best) ? t : best, RULES.coverageTiers[0]);
        const coverage = Math.round(full * tier / 10) * 10;
        const premium = Math.round(Math.min(m.client.band[1] * tier, Math.max(m.client.band[0] * tier, prem)));
        m.quotes[pid] = { premium, coverage };
      } else {
        m.quotes[pid] = null;
      }
    }
    this.maybeFinishQuotes();
    return { ok: true };
  }

  quotesPending() {
    return this.players.filter(p => p.connected && !(p.id in (this.market[0]?.quotes || {})));
  }

  maybeFinishQuotes() {
    if (this.phase !== 'quotes') return;
    if (this.quotesPending().length === 0) this.finishQuotes();
  }

  finishQuotes() {
    this.phase = 'reveal';
    this.timer = null;
    for (const m of this.market) {
      // The client signs the cheapest rate (premium per $ of coverage);
      // rate ties go to the bigger policy, then luck.
      let best = null;
      for (const p of this.players) {
        const q = m.quotes[p.id];
        if (!q) continue;
        const rate = q.premium / q.coverage;
        const wins = !best
          || rate < best.rate - 1e-9
          || (Math.abs(rate - best.rate) <= 1e-9 && (q.coverage > best.coverage
              || (q.coverage === best.coverage && this.rng() < 0.5)));
        if (wins) best = { pid: p.id, premium: q.premium, coverage: q.coverage, rate };
      }
      if (best) {
        m.winner = best.pid;
        m.premium = best.premium;
        m.soldCoverage = best.coverage;
        const w = this.byId(best.pid);
        w.capital += best.premium;
        this.roundLedger[best.pid].premiums += best.premium;
        this.addLog(`${w.avatar} ${w.name} signed ${m.client.name} at $${best.premium} covering $${best.coverage}.`);
      } else {
        this.addLog(`${m.client.name} found no takers.`);
      }
    }
  }

  openDeals() {
    if (this.phase !== 'reveal') return { error: 'Not in reveal phase.' };
    this.phase = 'deals';
    this.timer = { phase: 'deals', remaining: RULES.dealSeconds };
    return { ok: true };
  }

  // ---- deals ----
  // types:
  //  reinsurance: {clientId, pct (1-99), fee} — the policy owner pays fee to
  //    the other party, who covers pct% of any claim payout this round.
  //  cash: {amount, memo} — proposer sends target money on accept.
  //  intel: {cardId, price} — proposer leaks one of their intel cards to
  //    target for price.
  proposeDeal(pid, deal) {
    if (this.phase !== 'deals') return { error: 'The deal floor is closed.' };
    const from = this.byId(pid), to = this.byId(deal?.to);
    if (!from || !to || from === to) return { error: 'Pick another broker.' };
    const type = deal.type;
    let terms = null;

    if (type === 'reinsurance') {
      const m = this.market.find(x => x.client.id === deal.clientId);
      if (!m || !m.winner) return { error: 'No such policy.' };
      if (m.winner !== pid && m.winner !== to.id) return { error: 'Neither of you holds that policy.' };
      const pct = Math.round(Math.min(99, Math.max(1, +deal.pct || 0)));
      const fee = Math.round(Math.max(0, +deal.fee || 0));
      terms = { clientId: m.client.id, clientName: m.client.name, pct, fee, owner: m.winner };
    } else if (type === 'cash') {
      const amount = Math.round(Math.max(1, +deal.amount || 0));
      terms = { amount, memo: String(deal.memo || '').slice(0, 60) };
    } else if (type === 'intel') {
      const card = (this.intel[pid] || []).find(c => c.cardId === deal.cardId || c.id === deal.cardId);
      if (!card) return { error: 'You do not hold that intel.' };
      const price = Math.round(Math.max(0, +deal.price || 0));
      terms = { cardId: card.id, price, clientId: card.clientId };
    } else {
      return { error: 'Unknown deal type.' };
    }

    const id = 'D' + (++this.dealSeq);
    this.proposals.push({ id, from: pid, to: to.id, type, terms, status: 'open' });
    return { ok: true, id };
  }

  respondDeal(pid, dealId, accept) {
    const d = this.proposals.find(x => x.id === dealId);
    if (!d || d.status !== 'open') return { error: 'Deal is gone.' };
    if (d.to !== pid) return { error: 'Not your deal to answer.' };
    if (this.phase !== 'deals') return { error: 'The deal floor is closed.' };
    if (!accept) {
      d.status = 'declined';
      return { ok: true };
    }
    const from = this.byId(d.from), to = this.byId(d.to);

    if (d.type === 'reinsurance') {
      const m = this.market.find(x => x.client.id === d.terms.clientId);
      const owner = this.byId(d.terms.owner);
      const reinsurer = d.terms.owner === d.from ? to : from;
      const already = m.reinsurance.reduce((s, r) => s + r.pct, 0);
      if (already + d.terms.pct > 100) { d.status = 'failed'; return { error: 'That policy is already fully reinsured.' }; }
      owner.capital -= d.terms.fee;
      reinsurer.capital += d.terms.fee;
      this.roundLedger[owner.id].reFees -= d.terms.fee;
      this.roundLedger[reinsurer.id].reFees += d.terms.fee;
      m.reinsurance.push({ pid: reinsurer.id, pct: d.terms.pct, fee: d.terms.fee });
      this.addLog(`${reinsurer.avatar} ${reinsurer.name} reinsures ${d.terms.pct}% of ${m.client.name} for $${d.terms.fee}.`);
    } else if (d.type === 'cash') {
      from.capital -= d.terms.amount;
      to.capital += d.terms.amount;
      this.roundLedger[from.id].cash -= d.terms.amount;
      this.roundLedger[to.id].cash += d.terms.amount;
      this.addLog(`${from.avatar} ${from.name} wired $${d.terms.amount} to ${to.avatar} ${to.name}. Memo: "${d.terms.memo || 'no comment'}"`);
    } else if (d.type === 'intel') {
      const card = (this.intel[d.from] || []).find(c => c.id === d.terms.cardId);
      if (!card) { d.status = 'failed'; return { error: 'Intel is gone.' }; }
      to.capital -= d.terms.price;
      from.capital += d.terms.price;
      this.roundLedger[to.id].intelTrade -= d.terms.price;
      this.roundLedger[from.id].intelTrade += d.terms.price;
      this.intel[d.to] = this.intel[d.to] || [];
      this.intel[d.to].push({ ...card, boughtFrom: from.name });
      this.addLog(`${from.avatar} ${from.name} leaked intel to ${to.avatar} ${to.name} for $${d.terms.price}.`);
    }
    d.status = 'accepted';
    return { ok: true };
  }

  // Public bet that a client claims this round, priced off the brochure.
  placeShort(pid, clientId, stake) {
    if (this.phase !== 'deals') return { error: 'The short desk is closed.' };
    const p = this.byId(pid);
    const m = this.market.find(x => x.client.id === clientId);
    if (!p || !m) return { error: 'No such client.' };
    if (this.market.some(x => x.shorts.some(s => s.pid === pid))) return { error: 'One short per quarter.' };
    const amt = Math.round(Math.min(RULES.shorts.max, Math.max(RULES.shorts.min, +stake || 0)));
    const odds = RULES.shorts.odds[m.client.rating] ?? 0.3;
    m.shorts.push({ pid, stake: amt, odds });
    this.addLog(`📉 ${p.avatar} ${p.name} is shorting ${m.client.name} ($${amt}). Publicly.`);
    return { ok: true };
  }

  endDeals() {
    if (this.phase !== 'deals') return { error: 'Not in deals phase.' };
    this.phase = 'claims';
    this.timer = null;
    for (const d of this.proposals) if (d.status === 'open') d.status = 'expired';

    // Syndicated contracts collapse if the winner failed to lay off enough:
    // premium clawed back, a fine on top, reinsurance fees unwound.
    for (const m of this.market) {
      if (!m.syndicated || !m.winner || m.voided) continue;
      const laid = m.reinsurance.reduce((s, r) => s + r.pct, 0);
      if (laid >= RULES.syndicate.layoffPct) continue;
      m.voided = true;
      const w = this.byId(m.winner);
      const fine = Math.round(m.premium * RULES.syndicate.finePct);
      w.capital -= m.premium + fine;
      this.roundLedger[m.winner].premiums -= m.premium;
      this.roundLedger[m.winner].fines -= fine;
      for (const r of m.reinsurance) {
        const re = this.byId(r.pid);
        re.capital -= r.fee;
        w.capital += r.fee;
        this.roundLedger[r.pid].reFees -= r.fee;
        this.roundLedger[m.winner].reFees += r.fee;
      }
      m.reinsurance = [];
      this.addLog(`💥 ${m.client.name}: only ${laid}% laid off (needed ${RULES.syndicate.layoffPct}%). The syndicate collapses — contract void, $${fine} fine.`);
    }

    this.computeClaims();
    return { ok: true };
  }

  computeClaims() {
    const results = this.market.map((m, i) => {
      const risk = this.effectiveRisk(m);
      const hit = this.rng() < risk;
      const live = m.winner && !m.voided;
      const res = {
        clientId: m.client.id, name: m.client.name, emoji: m.client.emoji,
        insured: !!live, voided: m.voided, winner: m.winner, premium: m.premium, coverage: m.soldCoverage,
        hit, risk: Math.round(risk * 100),
        text: hit
          ? (live ? m.client.claimText
            : m.voided ? `${m.client.name} went down with no syndicate behind it. Lawyers descend on everyone, a little.`
            : `${m.client.name} ${UNINSURED_CLAIM[i % UNINSURED_CLAIM.length]}`)
          : (live ? m.client.safeText
            : m.voided ? `${m.client.name} was fine after all. The collapsed syndicate feels very silly.`
            : `${m.client.name} ${UNINSURED_SAFE[i % UNINSURED_SAFE.length]}`),
        payouts: [],
        shortResults: m.shorts.map(s => {
          const pl = this.byId(s.pid);
          const amount = hit ? Math.round(s.stake * (RULES.shorts.payout / s.odds - 1)) : -s.stake;
          pl.capital += amount;
          this.roundLedger[s.pid].bets += amount;
          return { pid: s.pid, amount, stake: s.stake };
        }),
      };
      if (hit && live) {
        const coverage = m.soldCoverage;
        let ownerShare = coverage;
        for (const r of m.reinsurance) {
          const share = Math.round(coverage * r.pct / 100);
          ownerShare -= share;
          const reinsurer = this.byId(r.pid);
          reinsurer.capital -= share;
          this.roundLedger[r.pid].rePayouts -= share;
          res.payouts.push({ pid: r.pid, amount: share, pct: r.pct });
        }
        const owner = this.byId(m.winner);
        owner.capital -= ownerShare;
        this.roundLedger[m.winner].claims -= ownerShare;
        res.payouts.unshift({ pid: m.winner, amount: ownerShare, owner: true });
      }
      return res;
    });
    this.claims = { results, revealed: 0 };
  }

  advanceClaims() {
    if (this.phase !== 'claims') return { error: 'Not in claims phase.' };
    if (this.claims.revealed < this.claims.results.length) {
      this.claims.revealed += 1;
      const r = this.claims.results[this.claims.revealed - 1];
      if (r.hit && r.insured) this.addLog(`💥 ${r.name}: CLAIM. Coverage paid out.`);
      return { ok: true };
    }
    this.finishRound();
    return { ok: true };
  }

  finishRound() {
    const summary = this.players.map(p => {
      const l = this.roundLedger[p.id];
      return { pid: p.id, ...l, end: p.capital, net: p.capital - l.start };
    });
    this.ledger.push({ round: this.round, summary });
    this.phase = 'ledger';
  }

  nextRound() {
    if (this.phase !== 'ledger') return { error: 'Not in ledger phase.' };
    if (this.round >= RULES.rounds || this.deck.length < RULES.clientsPerRound) {
      this.phase = 'results';
      const top = Math.max(...this.players.map(p => p.capital));
      this.winnerIds = this.players.filter(p => p.capital === top).map(p => p.id);
      const names = this.winnerIds.map(id => this.byId(id).name).join(' & ');
      this.addLog(`🏆 ${names} runs the market.`);
    } else {
      this.beginRound();
    }
    return { ok: true };
  }

  // Called once per second by the host while a timer is live. Returns
  // whether a broadcast is warranted: phones count down locally, so only
  // a coarse re-sync every 5s (or the expiry itself) goes over the wire.
  tick() {
    if (!this.timer) return false;
    this.timer.remaining -= 1;
    if (this.timer.remaining > 0) return this.timer.remaining % 5 === 0;
    if (this.timer.phase === 'quotes' && this.phase === 'quotes') {
      for (const p of this.quotesPending()) this.submitQuotes(p.id, {});
      if (this.phase === 'quotes') this.finishQuotes();
    } else if (this.timer.phase === 'deals' && this.phase === 'deals') {
      this.endDeals();
    }
    this.timer = null;
    return true;
  }

  // ---- host action dispatch ----

  dispatch(pid, action) {
    const p = this.byId(pid);
    const host = p?.isHost;
    switch (action.type) {
      case 'start': return host ? this.start() : { error: 'Host only.' };
      case 'openQuotes': return host ? this.openQuotes() : { error: 'Host only.' };
      case 'submitQuotes': return this.submitQuotes(pid, action.quotes);
      case 'openDeals': return host ? this.openDeals() : { error: 'Host only.' };
      case 'proposeDeal': return this.proposeDeal(pid, action.deal);
      case 'respondDeal': return this.respondDeal(pid, action.dealId, action.accept);
      case 'placeShort': return this.placeShort(pid, action.clientId, action.stake);
      case 'endDeals': return host ? this.endDeals() : { error: 'Host only.' };
      case 'advanceClaims': return host ? this.advanceClaims() : { error: 'Host only.' };
      case 'nextRound': return host ? this.nextRound() : { error: 'Host only.' };
      default: return { error: 'Unknown action.' };
    }
  }

  // ---- per-player view (privacy boundary) ----

  viewFor(pid) {
    const me = this.byId(pid);
    const submitted = this.market[0] ? this.players.filter(p => p.id in this.market[0].quotes).map(p => p.id) : [];
    return {
      youId: pid,
      theme: this.theme.key,
      phase: this.phase,
      round: this.round,
      roundName: this.theme.roundNames[this.round - 1] || '',
      totalRounds: RULES.rounds,
      rules: {
        quoteSeconds: RULES.quoteSeconds, dealSeconds: RULES.dealSeconds,
        minPlayers: RULES.minPlayers, maxPlayers: RULES.maxPlayers,
        layoffPct: RULES.syndicate.layoffPct, shorts: RULES.shorts,
      },
      timer: this.timer ? { ...this.timer } : null,
      players: this.players.map(p => ({
        id: p.id, name: p.name, avatar: p.avatar, capital: p.capital,
        connected: p.connected, isHost: p.isHost, desperate: p.capital < 0,
      })),
      market: this.market.map(m => ({
        id: m.client.id, name: m.client.name, emoji: m.client.emoji,
        tagline: m.client.tagline, coverage: m.client.coverage,
        band: m.client.band, rating: m.client.rating,
        winner: m.winner, premium: m.premium, soldCoverage: m.soldCoverage,
        reinsurance: m.reinsurance,
        tiers: RULES.coverageTiers,
        syndicated: m.syndicated, voided: m.voided,
        laidOff: m.reinsurance.reduce((s, r) => s + r.pct, 0),
        shorts: m.shorts.map(s => ({ pid: s.pid, stake: s.stake })),
        quotes: (this.phase === 'reveal' || this.phase === 'deals' || this.phase === 'claims' || this.phase === 'ledger') ? m.quotes : undefined,
      })),
      you: me ? {
        intel: (this.intel[pid] || []).map(c => ({
          cardId: c.id, clientId: c.clientId, text: c.text, delta: c.delta, boughtFrom: c.boughtFrom,
          clientName: this.market.find(m => m.client.id === c.clientId)?.client.name,
        })),
        quotesSubmitted: submitted.includes(pid),
        shortPlaced: this.market.some(m => m.shorts.some(s => s.pid === pid)),
      } : null,
      quotesSubmittedBy: submitted,
      proposals: this.proposals
        .filter(d => d.from === pid || d.to === pid)
        .map(d => ({ ...d })),
      claims: this.claims ? {
        revealed: this.claims.revealed,
        total: this.claims.results.length,
        results: this.claims.results.slice(0, this.claims.revealed),
      } : null,
      ledger: this.ledger.slice(-1),
      log: this.log.slice(-14),
      winnerIds: this.winnerIds,
    };
  }
}
