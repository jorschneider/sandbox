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
  // Idle capital pays rent: write nothing in a quarter (no policy, no
  // reinsurance) and the office overhead comes out of your pocket. The
  // biggest net book each quarter earns Broker of the Quarter.
  office: { overhead: 100, quarterBonus: 150 },
  // Regulators cap the exposure you can sign in a quarter at mult x your
  // capital (with a floor so broke firms can still write small business).
  solvency: { mult: 3, floor: 1000 },
  // Middleman mode: the customer's business books revenue each round
  // (insurance protects profit, it isn't pure downside), and the broker's
  // retail price is capped at a multiple of wholesale so gouging can't
  // stack the market shut.
  middleman: { revenueRate: 0.35, retailCapX: 1.5 },
  // Open outcry: the syndicated whale is sold live instead of by sealed
  // quote. Brokers publicly undercut each other; every bid resets a short
  // anti-snipe clock, so it ends only when nobody dares go lower.
  auction: { openSeconds: 20, resetSeconds: 8, steps: [25, 50, 100], floorPct: 0.35 },

  riskFloor: 0.03,
  riskCeil: 0.97,
};

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  constructor({ rng = Math.random, theme = 'classic', mode = 'market', ruleset = 'full' } = {}) {
    this.rng = rng;
    this.theme = THEMES[theme] || THEMES.classic;
    this.mode = mode === 'middleman' ? 'middleman' : 'market';
    // 'rookie' strips the market mode to its essentials (no tiers, shorts,
    // syndication, overhead, or solvency caps) for first-time tables.
    this.pro = ruleset !== 'rookie';
    this.mm = null; // middleman-mode round state
    this.totalRounds = RULES.rounds;
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
    this.awards = {}; // end-of-game superlatives, tracked as they happen
    this.pendingRenewal = null; // full market: last round's happiest client returns
    this.auction = null; // full market: live open-outcry lot
    this.submitted = new Set(); // who has sealed their quotes this round
  }

  // Keep the most extreme holder of each award (min=true for "lowest wins").
  award(id, pid, value, detail = '', min = false) {
    const cur = this.awards[id];
    if (!cur || (min ? value < cur.value : value > cur.value)) {
      this.awards[id] = { pid, value: Math.round(value), detail };
    }
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
    const minP = this.mode === 'middleman' ? 3 : RULES.minPlayers;
    if (this.players.length < minP) return { error: `Need at least ${minP} players for this mode.` };
    this.deck = shuffle(this.theme.clients, this.rng);
    if (this.mode === 'middleman') {
      this.totalRounds = this.players.length; // everyone is the customer once
      this.beginMMRound();
    } else {
      this.totalRounds = RULES.rounds;
      this.beginRound();
    }
    return { ok: true };
  }

  // ---------- middleman mode: customer / broker / carriers ----------

  freshLedger() {
    this.roundLedger = {};
    for (const p of this.players) {
      this.roundLedger[p.id] = { premiums: 0, claims: 0, reFees: 0, rePayouts: 0, intelTrade: 0, cash: 0, bets: 0, fines: 0, overhead: 0, bonus: 0, revenue: 0, start: p.capital };
    }
  }

  mmRevenue() {
    return Math.round(this.mm.client.coverage * RULES.middleman.revenueRate / 10) * 10;
  }

  beginMMRound() {
    this.round += 1;
    this.phase = 'mm_brief';
    this.claims = null;
    this.freshLedger();
    const n = this.players.length;
    const client = this.deck.splice(0, 1)[0];
    const customer = this.players[(this.round - 1) % n].id;
    const broker = this.players[this.round % n].id;
    const carriers = this.players.filter(p => p.id !== customer && p.id !== broker).map(p => p.id);
    // Two of the client's intel cards are true this round. The customer
    // knows both (it's their business); broker and carriers each get one
    // partial inspection report.
    const active = shuffle(client.intel, this.rng).slice(0, 2);
    const seen = { [customer]: active.slice() };
    seen[broker] = [active[Math.floor(this.rng() * active.length)]];
    for (const c of carriers) seen[c] = [active[Math.floor(this.rng() * active.length)]];
    this.mm = {
      client, customer, broker, carriers, active, seen,
      wholesale: {}, chosenCarrier: null, retail: null, accepted: null,
      revealed: false, result: null,
    };
    const cu = this.byId(customer), br = this.byId(broker);
    this.addLog(`— ${this.theme.roundNames[(this.round - 1) % this.theme.roundNames.length]}: ${cu.avatar} ${cu.name} owns ${client.name}. ${br.avatar} ${br.name} brokers the deal.`);
  }

  mmRisk() {
    const risk = this.mm.client.baseRisk + this.mm.active.reduce((s, c) => s + c.delta, 0);
    return Math.min(RULES.riskCeil, Math.max(RULES.riskFloor, risk));
  }

  mmWholesaleBand() {
    const b = this.mm.client.band;
    return [Math.round(b[0] * 0.6 / 10) * 10, Math.round(b[1] * 1.5 / 10) * 10];
  }

  mmOpen() {
    if (this.phase !== 'mm_brief') return { error: 'Not now.' };
    this.phase = 'mm_wholesale';
    this.timer = { phase: 'mm_wholesale', remaining: 60 };
    return { ok: true };
  }

  mmQuote(pid, amount) {
    if (this.phase !== 'mm_wholesale') return { error: 'Bidding is closed.' };
    if (!this.mm.carriers.includes(pid)) return { error: 'Only carriers quote.' };
    if (pid in this.mm.wholesale) return { error: 'Already quoted.' };
    const [lo, hi] = this.mmWholesaleBand();
    this.mm.wholesale[pid] = Math.round(Math.min(hi, Math.max(lo, +amount || lo)));
    if (Object.keys(this.mm.wholesale).length === this.mm.carriers.filter(c => this.byId(c).connected).length) {
      this.mmToMarkup();
    }
    return { ok: true };
  }

  mmToMarkup() {
    if (Object.keys(this.mm.wholesale).length === 0) {
      // no carrier showed up; the customer goes bare
      this.mm.accepted = false;
      this.mmSettle();
      return;
    }
    this.phase = 'mm_markup';
    this.timer = { phase: 'mm_markup', remaining: 45 };
  }

  mmSetRetail(pid, carrierId, retail) {
    if (this.phase !== 'mm_markup') return { error: 'Not now.' };
    if (pid !== this.mm.broker) return { error: 'Only the broker sets the price.' };
    const w = this.mm.wholesale[carrierId];
    if (typeof w !== 'number') return { error: 'That carrier never quoted.' };
    const maxRetail = Math.round(Math.min(this.mm.client.band[1] * 2, w * RULES.middleman.retailCapX));
    this.mm.chosenCarrier = carrierId;
    this.mm.retail = Math.round(Math.min(maxRetail, Math.max(w, +retail || w)));
    this.phase = 'mm_decide';
    this.timer = { phase: 'mm_decide', remaining: 35 };
    return { ok: true };
  }

  mmDecide(pid, accept) {
    if (this.phase !== 'mm_decide') return { error: 'Not now.' };
    if (pid !== this.mm.customer) return { error: 'Only the customer decides.' };
    this.mm.accepted = !!accept;
    this.mmSettle();
    return { ok: true };
  }

  // Rolls the outcome and stages the money, but pays nothing until the file
  // is opened — same reason as computeClaims(): no spoilers in the chips.
  mmSettle() {
    const m = this.mm;
    const cov = m.client.coverage;
    const risk = this.mmRisk();
    const hit = this.rng() < risk;
    this.timer = null;
    const rev = this.mmRevenue();
    const settle = [{ pid: m.customer, amount: rev, kind: 'revenue' }];
    if (m.accepted) {
      const w = m.wholesale[m.chosenCarrier];
      settle.push({ pid: m.customer, amount: -m.retail, kind: 'premiums' });
      settle.push({ pid: m.broker, amount: m.retail - w, kind: 'cash' });
      settle.push({ pid: m.chosenCarrier, amount: w, kind: 'premiums' });
      if (hit) settle.push({ pid: m.chosenCarrier, amount: -cov, kind: 'claims' });
    } else if (hit) {
      settle.push({ pid: m.customer, amount: -cov, kind: 'claims' });
    }
    m.result = {
      hit, risk: Math.round(risk * 100), coverage: cov, revenue: rev,
      accepted: m.accepted, retail: m.retail,
      wholesale: m.chosenCarrier ? m.wholesale[m.chosenCarrier] : null,
      allWholesale: { ...m.wholesale },
      chosenCarrier: m.chosenCarrier,
      text: hit ? m.client.claimText : m.client.safeText,
      settle,
    };
    const cu = this.byId(m.customer);
    this.addLog(m.accepted ? `${cu.avatar} ${cu.name} signed at $${m.retail}.` : `${cu.avatar} ${cu.name} went bare.`);
    this.phase = 'mm_claims';
  }

  mmSettleApply() {
    const m = this.mm, r = m.result, risk = r.risk / 100, cov = r.coverage;
    for (const s of r.settle) {
      const p = this.byId(s.pid);
      if (!p) continue;
      p.capital += s.amount;
      this.roundLedger[s.pid][s.kind] += s.amount;
    }
    if (r.accepted) {
      const spread = r.retail - r.wholesale;
      if (spread > 0) this.award('spread', m.broker, spread, m.client.name);
      const ev = risk * cov;
      if (ev > 0) this.award('shopper', m.customer, Math.round(r.retail / ev * 100), m.client.name, true);
      if (r.hit) this.award('worstbeat', r.chosenCarrier, cov, m.client.name);
    } else if (r.hit) {
      this.award('worstbeat', m.customer, cov, m.client.name);
    } else {
      this.award('nerves', m.customer, r.risk, m.client.name);
    }
  }

  mmAdvance() {
    if (this.phase !== 'mm_claims') return { error: 'Not now.' };
    if (!this.mm.revealed) { this.mm.revealed = true; this.mmSettleApply(); return { ok: true }; }
    const summary = this.players.map(p => {
      const l = this.roundLedger[p.id];
      return { pid: p.id, ...l, end: p.capital, net: p.capital - l.start };
    });
    for (const s of summary) {
      if (s.net > 0) this.award('bestquarter', s.pid, s.net);
      if (s.net < 0) this.award('rockbottom', s.pid, -s.net);
    }
    this.ledger.push({ round: this.round, summary });
    this.phase = 'ledger';
    return { ok: true };
  }

  beginRound() {
    this.round += 1;
    this.phase = 'market';
    this.proposals = [];
    this.claims = null;
    this.auction = null;
    this.submitted = new Set();
    this.dealtCardIds = new Set();
    this.intel = {};
    this.freshLedger();

    const picks = this.deck.splice(0, RULES.clientsPerRound);
    this.market = picks.map(client => ({
      client, baseClient: client, quotes: {}, winner: null, premium: null, soldCoverage: null,
      reinsurance: [], shorts: [], syndicated: false, voided: false,
    }));

    // The round's biggest client is syndicated: boosted, and impossible to
    // hold alone — the winner has to bring the table in or lose the deal.
    // (Full Market rulebook only.)
    if (this.pro) {
      const big = this.market.reduce((a, b) => (b.client.coverage > a.client.coverage ? b : a));
      const boost = (x) => Math.round(x * RULES.syndicate.sizeBoost / 10) * 10;
      big.syndicated = true;
      big.client = { ...big.client, coverage: boost(big.client.coverage), band: big.client.band.map(boost) };
    }

    // A surviving client from last quarter comes back to renew. The
    // incumbent holds the relationship: poachers must beat their old rate
    // by 10% or the client stays loyal.
    if (this.pro && this.pendingRenewal) {
      const r = this.pendingRenewal;
      this.pendingRenewal = null;
      this.market.push({
        client: r.client, baseClient: r.client, quotes: {}, winner: null, premium: null, soldCoverage: null,
        reinsurance: [], shorts: [], syndicated: false, voided: false,
        renewal: { incumbent: r.incumbent, lastRate: r.lastRate },
      });
      const inc = this.byId(r.incumbent);
      this.addLog(`🔄 ${r.client.name} is up for renewal — ${inc?.avatar} ${inc?.name}'s client, if they can keep them.`);
    }

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

  // ---------- open outcry (full market: the syndicated lot) ----------

  auctionLot() {
    return this.market.find(m => m.syndicated && !m.winner);
  }

  openAuction() {
    if (this.phase !== 'market') return { error: 'Not in market phase.' };
    const lot = this.auctionLot();
    if (!lot) return { error: 'No lot to auction.' };
    this.auction = {
      clientId: lot.client.id,
      // Opens at the client's top price and gets bid DOWN.
      bid: lot.client.band[1],
      floor: Math.max(1, Math.round(lot.client.band[1] * RULES.auction.floorPct / 10) * 10),
      leader: null,
      history: [],
      done: false,
    };
    this.phase = 'auction';
    this.timer = { phase: 'auction', remaining: RULES.auction.openSeconds };
    this.addLog(`🔨 OPEN OUTCRY: ${lot.client.name}, ${this.money(lot.client.coverage)} of cover. Opening at $${this.auction.bid} — undercut to win.`);
    return { ok: true };
  }

  money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  placeBid(pid, amount) {
    if (this.phase !== 'auction' || !this.auction || this.auction.done) return { error: 'The lot is closed.' };
    const a = this.auction;
    const p = this.byId(pid);
    if (!p) return { error: 'Not in this game.' };
    if (a.leader === pid) return { error: "You're already the low bid — let someone else dig the hole." };
    const bid = Math.round(+amount);
    if (!isFinite(bid)) return { error: 'Bad bid.' };
    if (bid >= a.bid) return { error: `You must go below ${this.money(a.bid)}.` };
    if (bid < a.floor) return { error: `The client won't take less than ${this.money(a.floor)}.` };
    const lot = this.market.find(m => m.client.id === a.clientId);
    // Solvency still applies: you can't bid for cover you can't carry.
    if (lot.client.coverage > this.solvencyCap(pid)) {
      return { error: "The regulator won't let you carry this one — not enough capital." };
    }
    a.bid = bid;
    a.leader = pid;
    a.history.push({ pid, bid });
    if (a.history.length > 24) a.history.shift();
    // Anti-snipe: every bid puts the clock back to the reset window.
    this.timer = { phase: 'auction', remaining: RULES.auction.resetSeconds };
    this.addLog(`🔨 ${p.avatar} ${p.name} bids ${this.money(bid)}.`);
    return { ok: true };
  }

  finishAuction() {
    if (!this.auction || this.auction.done) return { error: 'Nothing to close.' };
    const a = this.auction;
    a.done = true;
    this.timer = null;
    const lot = this.market.find(m => m.client.id === a.clientId);
    if (a.leader) {
      const w = this.byId(a.leader);
      lot.winner = a.leader;
      lot.premium = a.bid;
      lot.soldCoverage = lot.client.coverage;
      w.capital += a.bid;
      this.roundLedger[a.leader].premiums += a.bid;
      this.award('rainmaker', a.leader, a.bid, lot.client.name);
      this.award('gavel', a.leader, a.history.length, lot.client.name);
      this.addLog(`🔨 SOLD — ${lot.client.name} to ${w.avatar} ${w.name} for ${this.money(a.bid)} after ${a.history.length} bid${a.history.length === 1 ? '' : 's'}.`);
    } else {
      this.addLog(`🔨 No bids. ${lot.client.name} storms out of the room.`);
      lot.syndicated = false; // nobody holds it; no layoff obligation
    }
    this.phase = 'quotes';
    this.timer = { phase: 'quotes', remaining: RULES.quoteSeconds };
    return { ok: true };
  }

  openQuotes() {
    if (this.phase !== 'market') return { error: 'Not in market phase.' };
    // Full market sells the whale live before the sealed lots.
    if (this.pro && this.auctionLot()) return this.openAuction();
    this.phase = 'quotes';
    this.timer = { phase: 'quotes', remaining: RULES.quoteSeconds };
    return { ok: true };
  }

  // quotes: {clientId: {premium, coverage}} — null/absent means pass.
  // Coverage snaps to an allowed tier of the asked amount; the premium is
  // clamped to the band scaled by that tier.
  submitQuotes(pid, quotes) {
    if (this.phase !== 'quotes') return { error: 'Quotes are closed.' };
    if (this.submitted.has(pid)) return { error: 'Already submitted.' };
    this.submitted.add(pid);
    const tiers = this.pro ? RULES.coverageTiers : [1]; // rookie writes full cover only
    for (const m of this.market) {
      if (m.winner) continue; // auction-won lots aren't quoted
      const q = quotes ? quotes[m.client.id] : null;
      const prem = q && +q.premium, cov = q && +q.coverage;
      if (isFinite(prem) && prem > 0 && isFinite(cov) && cov > 0) {
        const full = m.client.coverage;
        const tier = tiers.reduce((best, t) =>
          Math.abs(cov - full * t) < Math.abs(cov - full * best) ? t : best, tiers[0]);
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
    return this.players.filter(p => p.connected && !this.submitted.has(p.id));
  }

  maybeFinishQuotes() {
    if (this.phase !== 'quotes') return;
    if (this.quotesPending().length === 0) this.finishQuotes();
  }

  solvencyCap(pid) {
    if (!this.pro) return 1e9; // rookie desk: no capital requirements
    return Math.max(RULES.solvency.floor, this.byId(pid).capital * RULES.solvency.mult);
  }

  finishQuotes() {
    this.phase = 'reveal';
    this.timer = null;
    const signed = {}; // exposure signed this quarter, per player
    // Capital snapshot: premiums credited during this loop must not inflate
    // the cap that later clients in the same quarter are checked against.
    const caps = {};
    for (const p of this.players) caps[p.id] = this.solvencyCap(p.id);
    for (const m of this.market) {
      if (m.winner) continue; // already signed at auction
      // The client signs the cheapest rate (premium per $ of coverage);
      // rate ties go to the bigger policy, then luck. The regulator blocks
      // any bid that would push a firm past its solvency cap, and the
      // client moves on to the next-best quote.
      const inc = m.renewal?.incumbent;
      const cands = this.players
        .map(p => ({ pid: p.id, q: m.quotes[p.id] }))
        .filter(x => x.q)
        .map(x => {
          const rate = x.q.premium / x.q.coverage;
          // Renewal loyalty: a challenger's rate only counts if it beats
          // the incumbent's by 10%.
          const key = inc && x.pid !== inc ? rate / 0.9 : rate;
          return { pid: x.pid, premium: x.q.premium, coverage: x.q.coverage, rate, key };
        })
        .sort((a, b) => (a.key - b.key) || (b.coverage - a.coverage) || (this.rng() < 0.5 ? -1 : 1));
      let best = null;
      for (const c of cands) {
        if ((signed[c.pid] || 0) + c.coverage <= caps[c.pid]) { best = c; break; }
        const p = this.byId(c.pid);
        this.addLog(`🚫 The regulator blocked ${p.avatar} ${p.name}'s bid on ${m.client.name} — not enough capital behind it.`);
      }
      if (best) {
        m.winner = best.pid;
        m.premium = best.premium;
        m.soldCoverage = best.coverage;
        signed[best.pid] = (signed[best.pid] || 0) + best.coverage;
        const w = this.byId(best.pid);
        w.capital += best.premium;
        this.roundLedger[best.pid].premiums += best.premium;
        this.award('rainmaker', best.pid, best.premium, m.client.name);
        if (inc && best.pid !== inc) {
          const v = this.byId(inc);
          this.award('poach', best.pid, best.premium, `${m.client.name} from ${v?.name}`);
          this.addLog(`🏴‍☠️ ${w.avatar} ${w.name} POACHED ${m.client.name} from ${v?.avatar} ${v?.name}.`);
        } else if (inc) {
          this.addLog(`🤝 ${m.client.name} renewed with ${w.avatar} ${w.name}.`);
        }
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
    if (!this.pro) return { error: 'The short desk opens in the Full Market rulebook.' };
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

  // Outcomes are rolled now but NOT paid: money moves only as each file is
  // opened in advanceClaims(). Otherwise every player's capital chip would
  // show the final numbers before the first reveal, spoiling the whole beat.
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
        settle: [], // [{pid, amount, kind}] applied at reveal time
        shortResults: m.shorts.map(s => {
          const amount = hit ? Math.round(s.stake * (RULES.shorts.payout / s.odds - 1)) : -s.stake;
          return { pid: s.pid, amount, stake: s.stake };
        }),
      };
      for (const s of res.shortResults) res.settle.push({ pid: s.pid, amount: s.amount, kind: 'bets' });
      if (hit && live) {
        const coverage = m.soldCoverage;
        let ownerShare = coverage;
        for (const r of m.reinsurance) {
          const share = Math.round(coverage * r.pct / 100);
          ownerShare -= share;
          res.settle.push({ pid: r.pid, amount: -share, kind: 'rePayouts' });
          res.payouts.push({ pid: r.pid, amount: share, pct: r.pct });
        }
        res.settle.push({ pid: m.winner, amount: -ownerShare, kind: 'claims' });
        res.payouts.unshift({ pid: m.winner, amount: ownerShare, owner: true });
      }
      return res;
    });
    this.claims = { results, revealed: 0 };
  }

  // Pay out one file and hand out the awards it earned.
  settleClaim(res) {
    for (const s of res.settle) {
      const p = this.byId(s.pid);
      if (!p) continue;
      p.capital += s.amount;
      this.roundLedger[s.pid][s.kind] += s.amount;
    }
    for (const s of res.shortResults) {
      if (s.amount > 0) this.award('short', s.pid, s.amount, res.name);
    }
    if (res.insured && !res.hit && res.risk >= 38) this.award('tightrope', res.winner, res.risk, res.name);
    if (res.insured && res.hit) {
      const owner = res.payouts.find(p => p.owner);
      if (owner) this.award('worstbeat', res.winner, owner.amount, res.name);
    }
  }

  advanceClaims() {
    if (this.phase !== 'claims') return { error: 'Not in claims phase.' };
    if (this.claims.revealed < this.claims.results.length) {
      this.claims.revealed += 1;
      const r = this.claims.results[this.claims.revealed - 1];
      this.settleClaim(r);
      if (r.hit && r.insured) this.addLog(`💥 ${r.name}: CLAIM. Coverage paid out.`);
      return { ok: true };
    }
    this.finishRound();
    return { ok: true };
  }

  finishRound() {
    // The biggest policy that survived claims comes back to renew next
    // quarter (full market only).
    if (this.pro && this.claims) {
      let best = null;
      for (const r of this.claims.results) {
        if (!r.insured || r.hit) continue;
        const m = this.market.find(x => x.client.id === r.clientId);
        if (m && (!best || m.soldCoverage > best.soldCoverage)) best = m;
      }
      if (best) {
        // Renew the client at its natural size — a syndicate boost is a
        // one-quarter event, not a permanent upgrade.
        const client = best.baseClient || best.client;
        const scale = client.coverage / best.client.coverage;
        this.pendingRenewal = {
          client, incumbent: best.winner,
          lastRate: (best.premium * scale) / (best.soldCoverage * scale),
        };
      }
    }

    // Idle books pay the overhead (any risk held counts as working — a
    // reinsurance share included). Broker of the Quarter goes to the most
    // PREMIUM written, so it rewards winning business at real prices, not
    // dumping price for volume.
    if (this.pro) {
      const covHeld = {}, premWritten = {};
      for (const p of this.players) { covHeld[p.id] = 0; premWritten[p.id] = 0; }
      for (const m of this.market) {
        if (!m.winner || m.voided) continue;
        const laid = m.reinsurance.reduce((s, r) => s + r.pct, 0);
        covHeld[m.winner] += Math.round(m.soldCoverage * (100 - laid) / 100);
        premWritten[m.winner] += m.premium;
        for (const r of m.reinsurance) {
          covHeld[r.pid] += Math.round(m.soldCoverage * r.pct / 100);
          premWritten[r.pid] += r.fee;
        }
      }
      for (const p of this.players) {
        if (covHeld[p.id] > 0) continue;
        p.capital -= RULES.office.overhead;
        this.roundLedger[p.id].overhead = -RULES.office.overhead;
        this.addLog(`🏢 ${p.avatar} ${p.name} wrote no business — $${RULES.office.overhead} office overhead anyway.`);
      }
      const top = Math.max(...Object.values(premWritten));
      if (top > 0) {
        for (const w of this.players.filter(p => premWritten[p.id] === top)) {
          w.capital += RULES.office.quarterBonus;
          this.roundLedger[w.id].bonus = RULES.office.quarterBonus;
          this.addLog(`🏆 ${w.avatar} ${w.name} is Broker of the Quarter (+$${RULES.office.quarterBonus}).`);
        }
      }
    }

    const summary = this.players.map(p => {
      const l = this.roundLedger[p.id];
      return { pid: p.id, ...l, end: p.capital, net: p.capital - l.start };
    });
    for (const s of summary) {
      if (s.net > 0) this.award('bestquarter', s.pid, s.net);
      if (s.net < 0) this.award('rockbottom', s.pid, -s.net);
    }
    this.ledger.push({ round: this.round, summary });
    this.phase = 'ledger';
  }

  nextRound() {
    if (this.phase !== 'ledger') return { error: 'Not in ledger phase.' };
    const needed = this.mode === 'middleman' ? 1 : RULES.clientsPerRound;
    if (this.round >= this.totalRounds || this.deck.length < needed) {
      this.phase = 'results';
      const top = Math.max(...this.players.map(p => p.capital));
      this.winnerIds = this.players.filter(p => p.capital === top).map(p => p.id);
      const names = this.winnerIds.map(id => this.byId(id).name).join(' & ');
      this.addLog(`🏆 ${names} runs the market.`);
    } else if (this.mode === 'middleman') {
      this.beginMMRound();
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
    // Auctions are short and loud: sync every second so the anti-snipe
    // clock on every phone matches the host's.
    if (this.timer.remaining > 0) return this.phase === 'auction' || this.timer.remaining % 5 === 0;
    const expired = this.timer;
    if (this.timer.phase === 'auction' && this.phase === 'auction') {
      this.timer = null;
      this.finishAuction();
    } else if (this.timer.phase === 'quotes' && this.phase === 'quotes') {
      for (const p of this.quotesPending()) this.submitQuotes(p.id, {});
      if (this.phase === 'quotes') this.finishQuotes();
    } else if (this.timer.phase === 'deals' && this.phase === 'deals') {
      this.endDeals();
    } else if (this.timer.phase === 'mm_wholesale' && this.phase === 'mm_wholesale') {
      this.timer = null;
      this.mmToMarkup(); // whoever hasn't quoted is out
    } else if (this.timer.phase === 'mm_markup' && this.phase === 'mm_markup') {
      // indecisive broker: auto-pick the cheapest carrier at a 30% markup
      const [cid, w] = Object.entries(this.mm.wholesale).sort((a, b) => a[1] - b[1])[0];
      this.timer = null;
      this.mmSetRetail(this.mm.broker, cid, Math.round(w * 1.3));
    } else if (this.timer.phase === 'mm_decide' && this.phase === 'mm_decide') {
      this.timer = null;
      this.mmDecide(this.mm.customer, false); // dithering means going bare
    }
    // Only clear if the handler didn't already start the next phase's clock
    // — otherwise a timeout leaves the following phase with no timer and the
    // round can hang on an absent player.
    if (this.timer === expired) this.timer = null;
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
      case 'placeBid': return this.placeBid(pid, action.amount);
      case 'closeAuction': return host ? this.finishAuction() : { error: 'Host only.' };
      case 'mmOpen': return host ? this.mmOpen() : { error: 'Host only.' };
      case 'mmQuote': return this.mmQuote(pid, action.amount);
      case 'mmSetRetail': return this.mmSetRetail(pid, action.carrierId, action.retail);
      case 'mmDecide': return this.mmDecide(pid, action.accept);
      case 'mmAdvance': return host ? this.mmAdvance() : { error: 'Host only.' };
      case 'endDeals': return host ? this.endDeals() : { error: 'Host only.' };
      case 'advanceClaims': return host ? this.advanceClaims() : { error: 'Host only.' };
      case 'nextRound': return host ? this.nextRound() : { error: 'Host only.' };
      default: return { error: 'Unknown action.' };
    }
  }

  // ---- per-player view (privacy boundary) ----

  mmView(pid) {
    const m = this.mm;
    const isBroker = pid === m.broker;
    const isCustomer = pid === m.customer;
    const done = this.phase === 'mm_claims' || this.phase === 'ledger' || this.phase === 'results';
    const c = m.client;
    return {
      client: {
        id: c.id, name: c.name, emoji: c.emoji, tagline: c.tagline,
        coverage: c.coverage, band: c.band, rating: c.rating,
      },
      customer: m.customer, broker: m.broker, carriers: m.carriers,
      yourRole: isCustomer ? 'customer' : isBroker ? 'broker' : m.carriers.includes(pid) ? 'carrier' : 'observer',
      yourIntel: (m.seen[pid] || []).map(card => ({ text: card.text, delta: card.delta })),
      trueRisk: isCustomer || done ? Math.round(this.mmRisk() * 100) : null,
      wholesaleBand: this.mmWholesaleBand(),
      retailMax: Math.round(c.band[1] * 2),
      retailCapX: RULES.middleman.retailCapX,
      revenue: this.mmRevenue(),
      quotedBy: Object.keys(m.wholesale),
      wholesale: (isBroker && this.phase !== 'mm_wholesale') || done ? { ...m.wholesale } : (m.carriers.includes(pid) ? (pid in m.wholesale ? { [pid]: m.wholesale[pid] } : {}) : {}),
      chosenCarrier: this.phase === 'mm_decide' || done ? m.chosenCarrier : null,
      retail: this.phase === 'mm_decide' || done ? m.retail : null,
      accepted: m.accepted,
      revealed: m.revealed,
      result: m.revealed && m.result ? m.result : null,
    };
  }

  viewFor(pid) {
    const me = this.byId(pid);
    const submitted = [...(this.submitted || [])];
    return {
      youId: pid,
      theme: this.theme.key,
      mode: this.mode,
      phase: this.phase,
      round: this.round,
      roundName: this.theme.roundNames[(this.round - 1 + this.theme.roundNames.length) % this.theme.roundNames.length] || '',
      totalRounds: this.totalRounds,
      mm: this.mm ? this.mmView(pid) : null,
      auction: this.auction ? {
        ...this.auction,
        steps: RULES.auction.steps,
        client: (() => {
          const lot = this.market.find(m => m.client.id === this.auction.clientId);
          return lot ? {
            id: lot.client.id, name: lot.client.name, emoji: lot.client.emoji,
            tagline: lot.client.tagline, coverage: lot.client.coverage,
            band: lot.client.band, rating: lot.client.rating,
          } : null;
        })(),
      } : null,
      rules: {
        quoteSeconds: RULES.quoteSeconds, dealSeconds: RULES.dealSeconds,
        minPlayers: RULES.minPlayers, maxPlayers: RULES.maxPlayers,
        layoffPct: RULES.syndicate.layoffPct, shorts: RULES.shorts,
        overhead: RULES.office.overhead, quarterBonus: RULES.office.quarterBonus,
        solvencyCap: me && this.pro ? this.solvencyCap(pid) : 0,
        pro: this.pro,
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
        tiers: this.pro ? RULES.coverageTiers : [1],
        syndicated: m.syndicated, voided: m.voided,
        renewal: m.renewal ? { incumbent: m.renewal.incumbent, lastRate: Math.round(m.renewal.lastRate * 100) } : null,
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
      awards: this.phase === 'results'
        ? Object.entries(this.awards).map(([id, a]) => ({ id, ...a }))
        : [],
    };
  }
}
