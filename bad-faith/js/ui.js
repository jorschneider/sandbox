// Bad Faith — UI rendering. One root element, one render(view) entry point.
// Screens rebuild only when the phase changes; within a phase, dynamic
// regions (timer, statuses, proposals, capital) update in place so open
// forms and half-typed quotes survive network updates.

import { GAME_NAME, GAME_SUBTITLE, APP_VERSION, AVATARS, THEMES, RATING_ODDS } from './content.js';

const $ = (sel) => document.querySelector(sel);
let root, actions, lastKey = '', lastView = null;
const drafts = { quotes: {}, deal: null };

// Countdown is rendered locally between the host's coarse re-syncs, so the
// relay doesn't carry a message per second.
let timerSync = null; // { remaining, at } from the latest view

function paintTimer() {
  const el = $('#timer');
  if (!el) return;
  if (!timerSync) { el.textContent = ''; return; }
  const s = Math.max(0, Math.ceil(timerSync.remaining - (Date.now() - timerSync.at) / 1000));
  el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  el.classList.toggle('urgent', s <= 15);
}

export function init(rootEl, actionHandlers) {
  root = rootEl;
  actions = actionHandlers; // { send(action), hostStart(), createGame(name, avatar), joinGame(code, name, avatar) }
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('submit', (e) => e.preventDefault());
  setInterval(paintTimer, 500);
}

function applyTheme(key) {
  document.body.className = (THEMES[key] || THEMES.classic).bodyClass;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n, signed = false) {
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
function moneyClass(n) { return n < 0 ? 'neg' : n > 0 ? 'pos' : ''; }

export function toast(text, isError = true) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' err' : '');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2600);
}

// ---------- pre-game screens ----------

export function renderHome() {
  lastKey = 'home';
  root.innerHTML = `
    <div class="screen center">
      <div class="brand">
        <div class="brand-badge">🐾</div>
        <h1>${GAME_NAME}</h1>
        <p class="sub">${GAME_SUBTITLE}</p>
        <p class="pitch">Four rival brokers. Absurd animal clients. Whoever ends the year richest wins — and every deal is negotiable, out loud.</p>
      </div>
      <div class="stack">
        <button class="btn big" data-action="show-create">Start a new firm</button>
        <button class="btn big ghost" data-action="show-join">Join with a code</button>
      </div>
      <p class="fine">One phone hosts. Everyone plays in the same room, phones in hand, eyes up.</p>
      <p class="fine dim">${APP_VERSION}</p>
    </div>`;
}

export function renderIdentity({ mode, code, prefillName }) {
  lastKey = 'identity';
  root.innerHTML = `
    <div class="screen center">
      <h2>${mode === 'create' ? 'Open your brokerage' : `Joining room <span class="code">${esc(code)}</span>`}</h2>
      ${mode === 'join' && !code ? `
        <label class="field"><span>Room code</span>
          <input id="codeInput" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="e.g. KFRV">
        </label>` : ''}
      <label class="field"><span>Your name</span>
        <input id="nameInput" autocomplete="off" maxlength="16" placeholder="Broker name" value="${esc(prefillName || '')}">
      </label>
      <div class="field"><span>Your animal</span>
        <div class="avatars" id="avatarGrid">
          ${AVATARS.map((a, i) => `<button class="avatar${i === 0 ? ' sel' : ''}" data-action="pick-avatar" data-avatar="${a}">${a}</button>`).join('')}
        </div>
      </div>
      ${mode === 'create' ? `
      <div class="field"><span>Edition</span>
        <div class="themes">
          ${Object.values(THEMES).map((t, i) => `
            <button class="theme-card${i === 0 ? ' sel' : ''}" data-action="pick-theme" data-theme="${t.key}">
              <span class="theme-badge">${t.badge}</span>
              <span class="theme-name">${esc(t.title)}</span>
              <span class="theme-sub">${esc(t.subtitle)}</span>
            </button>`).join('')}
        </div>
      </div>` : ''}
      <button class="btn big" data-action="${mode === 'create' ? 'do-create' : 'do-join'}">
        ${mode === 'create' ? 'Open for business' : 'Take a seat'}
      </button>
      <button class="btn link" data-action="go-home">Back</button>
    </div>`;
}

export function renderConnecting(msg) {
  lastKey = 'connecting';
  root.innerHTML = `<div class="screen center"><div class="spinner"></div><p>${esc(msg)}</p></div>`;
}

export function renderLobby(view, { code, isHost, joinUrl }) {
  applyTheme(view.theme);
  const theme = THEMES[view.theme] || THEMES.classic;
  const key = 'lobby:' + view.players.length;
  const full = view.players.length >= view.rules.maxPlayers;
  if (lastKey !== key) {
    lastKey = key;
    root.innerHTML = `
      <div class="screen center">
        <h2>Room <span class="code">${esc(code)}</span></h2>
        <p class="sub">${theme.badge} ${esc(theme.subtitle)}</p>
        ${isHost ? `<div id="qr" class="qr"></div>
        <p class="fine">Scan to join, or go to <b>${esc(shortUrl(joinUrl))}</b> and enter the code.</p>` : ''}
        <div class="lobby-list">
          ${view.players.map(p => `
            <div class="lobby-player">
              <span class="pav">${p.avatar}</span> ${esc(p.name)}
              ${p.isHost ? '<span class="tag">host</span>' : ''}
            </div>`).join('')}
          ${Array.from({ length: view.rules.maxPlayers - view.players.length }, () =>
            `<div class="lobby-player empty">Waiting for a broker…</div>`).join('')}
        </div>
        ${isHost
          ? `<button class="btn big" data-action="start" ${view.players.length < view.rules.minPlayers ? 'disabled' : ''}>
               Start the fiscal year</button>
             <p class="fine">${full ? 'Firm is full.' : 'Best with 4 brokers. Playable with 2–3.'}</p>`
          : `<p class="fine">Waiting for the host to start…</p>`}
        <p class="fine dim">${APP_VERSION} — every phone should show the same version</p>
      </div>`;
    if (isHost && window.qrcode) {
      const q = window.qrcode(0, 'M');
      q.addData(joinUrl); q.make();
      $('#qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2 });
    }
  }
}

function shortUrl(u) {
  try { const x = new URL(u); return x.host + x.pathname.replace(/\/$/, ''); } catch { return u; }
}

// ---------- in-game ----------

export function render(view) {
  lastView = view;
  applyTheme(view.theme);
  const theme = THEMES[view.theme] || THEMES.classic;
  const key = `${view.phase}:${view.round}:${view.claims ? view.claims.revealed : 0}`;
  if (key !== lastKey) {
    lastKey = key;
    if (view.phase !== 'quotes') drafts.quotes = {};
    if (view.phase !== 'deals') drafts.deal = null;
    root.innerHTML = `
      <div class="game">
        <header class="topbar">
          <div class="round">${theme.badge} ${esc(view.roundName)} <span class="dim">· ${phaseLabel(view.phase)}</span></div>
          <div class="timer" id="timer"></div>
        </header>
        <div class="players" id="playersBar"></div>
        <main class="stage" id="stage">${stageHtml(view)}</main>
      </div>`;
  }
  updateDynamic(view);
}

function phaseLabel(p) {
  return { market: 'The Market', quotes: 'Sealed Quotes', reveal: 'Signings', deals: 'The Deal Floor', claims: 'Claims Season', ledger: 'The Ledger', results: 'Year-End' }[p] || p;
}

// Rewrite a dynamic region only when its content changed — the host
// broadcasts every second while a timer runs, and rebuilding identical
// HTML would detach buttons out from under a mid-tap finger.
function setHtml(el, html) {
  if (el && el.__last !== html) { el.__last = html; el.innerHTML = html; }
}

function updateDynamic(view) {
  setHtml($('#playersBar'), view.players.map(p => `
    <div class="pchip${p.id === view.youId ? ' me' : ''}${p.connected ? '' : ' off'}">
      <span class="pav">${p.avatar}</span>
      <span class="pname">${esc(p.name)}${p.desperate ? ' 🔥' : ''}</span>
      <span class="pcap ${moneyClass(p.capital)}">${money(p.capital)}</span>
    </div>`).join(''));

  timerSync = view.timer ? { remaining: view.timer.remaining, at: Date.now() } : null;
  paintTimer();

  if (view.phase === 'quotes') {
    setHtml($('#waitList'), view.players.map(p =>
      `<span class="wait${view.quotesSubmittedBy.includes(p.id) ? ' done' : ''}">${p.avatar}</span>`).join(''));
  }
  if (view.phase === 'deals') {
    setHtml($('#dealsIn'), incomingHtml(view));
    setHtml($('#dealsOut'), outgoingHtml(view));
    setHtml($('#reBook'), bookHtml(view));
    setHtml($('#shortsList'), shortsListHtml(view));
    setHtml($('#shortMine'), view.you.shortPlaced ? `<div class="fine">Your short is placed. One per quarter.</div>` : shortFormHtml(view));
  }
  setHtml($('#logList'), view.log.slice().reverse().map(l => `<li>${esc(l.text)}</li>`).join(''));
}

function stageHtml(view) {
  switch (view.phase) {
    case 'market': return marketHtml(view);
    case 'quotes': return quotesHtml(view);
    case 'reveal': return revealHtml(view);
    case 'deals': return dealsHtml(view);
    case 'claims': return claimsHtml(view);
    case 'ledger': return ledgerHtml(view);
    case 'results': return resultsHtml(view);
    default: return '';
  }
}

function isHost(view) { return view.players.find(p => p.id === view.youId)?.isHost; }

function intelChips(view, clientId) {
  const mine = view.you.intel.filter(c => c.clientId === clientId);
  if (!mine.length) return '';
  return mine.map(c => `
    <div class="intel">
      <span class="intel-delta ${c.delta > 0 ? 'bad' : 'good'}">${c.delta > 0 ? '▲' : '▼'} ${Math.round(Math.abs(c.delta) * 100)}% risk</span>
      ${esc(c.text)}${c.boughtFrom ? ` <span class="dim">(leaked by ${esc(c.boughtFrom)})</span>` : ''}
    </div>`).join('');
}

function clientCard(view, m, inner = '') {
  return `
    <div class="card client${m.syndicated ? ' syndicated' : ''}">
      ${m.syndicated ? `<div class="syn-banner">🏛 SYNDICATED — too big for one firm. Winner must lay off ≥${view.rules.layoffPct}% on the deal floor or the contract voids.</div>` : ''}
      <div class="client-head">
        <span class="cemoji">${m.emoji}</span>
        <div>
          <div class="cname">${esc(m.name)}</div>
          <div class="ctag">${esc(m.tagline)}</div>
        </div>
      </div>
      <div class="cfacts">
        <span>Wants <b>${money(m.coverage)}</b> of coverage</span>
        <span>Premium ${money(m.band[0])}–${money(m.band[1])} at full cover</span>
        <span>Brochure says: <b>${m.rating}</b> risk — ${RATING_ODDS[m.rating] || '?'} claim odds (allegedly)</span>
      </div>
      ${intelChips(view, m.id)}
      ${inner}
    </div>`;
}

// --- market ---
function marketHtml(view) {
  return `
    <p class="phase-note">${view.market.length} clients want coverage this quarter. Read the room — your intel is yours alone. Talk it up, talk it down.</p>
    ${view.market.map(m => clientCard(view, m)).join('')}
    ${isHost(view)
      ? `<button class="btn big" data-action="open-quotes">Open sealed quotes</button>`
      : `<p class="fine">The host opens quoting when the table's done talking.</p>`}
    ${logHtml()}`;
}

// --- quotes ---
function quotesHtml(view) {
  if (view.you.quotesSubmitted) {
    return `
      <p class="phase-note">Quotes are in. Keep a straight face.</p>
      <div class="waiting" id="waitList"></div>
      ${logHtml()}`;
  }
  return `
    <p class="phase-note">Pick how much coverage you'll write and quote your premium. The client signs whoever offers the cheapest rate per dollar of coverage — win it, and that risk is yours. Or pass.</p>
    ${view.market.map(m => clientCard(view, m, `
      <div class="quote-row" data-client="${m.id}">
        <div class="tier-row">
          ${(m.tiers || [0.5, 0.75, 1]).map(t => `
            <button class="tier-btn${t === 1 ? ' sel' : ''}" data-action="quote-tier" data-client="${m.id}" data-tier="${t}">
              ${t === 1 ? 'Full' : Math.round(t * 100) + '%'} · ${money(Math.round(m.coverage * t / 10) * 10)}
            </button>`).join('')}
        </div>
        <div class="quote-controls">
          <input type="number" inputmode="numeric" class="quote-input" data-client="${m.id}"
                 min="${m.band[0]}" max="${m.band[1]}" placeholder="${m.band[0]}–${m.band[1]}">
          <button class="btn small ghost" data-action="quote-pass" data-client="${m.id}">Pass</button>
        </div>
        <div class="be-hint" id="be-${m.id}"> </div>
      </div>`)).join('')}
    <button class="btn big" data-action="submit-quotes">Submit sealed quotes</button>
    <div class="waiting" id="waitList"></div>`;
}

function tierOf(id) { return drafts.quotes[id]?.tier ?? 1; }

function updateQuoteHint(id) {
  const m = lastView?.market.find(x => x.id === id);
  const hint = $('#be-' + id);
  if (!m || !hint) return;
  const d = drafts.quotes[id];
  const cov = Math.round(m.coverage * tierOf(id) / 10) * 10;
  hint.textContent = (d && isFinite(d.premium))
    ? `Covers ${money(cov)} · breaks even if true risk ≤ ${Math.round((d.premium / cov) * 100)}%`
    : ' ';
}

// --- reveal ---
function revealHtml(view) {
  return `
    <p class="phase-note">The envelopes are open.</p>
    ${view.market.map(m => {
      const rows = view.players.map(p => {
        const q = m.quotes?.[p.id];
        const won = m.winner === p.id;
        const label = q ? `${money(q.premium)} · covers ${money(q.coverage)}` : '—';
        return `<div class="qrow${won ? ' won' : ''}"><span>${p.avatar} ${esc(p.name)}</span><span>${label}${won ? ' ✍️' : ''}</span></div>`;
      }).join('');
      return clientCard(view, m, `<div class="qtable">${rows}</div>
        ${m.winner ? '' : '<div class="fine">No takers. The client storms out.</div>'}`);
    }).join('')}
    ${isHost(view)
      ? `<button class="btn big" data-action="open-deals">Open the deal floor · ${view.rules.dealSeconds}s</button>`
      : `<p class="fine">Deal floor opens shortly. Decide who you need.</p>`}`;
}

// --- deals ---
function dealsHtml(view) {
  return `
    <p class="phase-note">Talk first, then make it binding here. Lay off risk, buy secrets, wire bribes, short your enemies. ${isHost(view) ? '' : 'Floor closes when the timer dies.'}</p>
    <div id="reBook">${bookHtml(view)}</div>
    <section class="deal-panel">
      <h3>Incoming</h3>
      <div id="dealsIn">${incomingHtml(view)}</div>
      <h3>Sent</h3>
      <div id="dealsOut">${outgoingHtml(view)}</div>
      <div id="dealForm">${drafts.deal ? dealFormHtml(view) : `<button class="btn big" data-action="deal-new">Propose a deal</button>`}</div>
      <h3>The short desk 📉</h3>
      <div id="shortsList">${shortsListHtml(view)}</div>
      <div id="shortMine">${view.you.shortPlaced ? `<div class="fine">Your short is placed. One per quarter.</div>` : shortFormHtml(view)}</div>
    </section>
    ${isHost(view) ? `<button class="btn ghost" data-action="end-deals">Close the floor early</button>` : ''}
    ${logHtml()}`;
}

function shortsListHtml(view) {
  const rows = view.market.flatMap(m => m.shorts.map(s => {
    const p = view.players.find(x => x.id === s.pid);
    return `<div class="short-row">${p?.avatar} ${esc(p?.name)} shorted <b>${esc(m.name)}</b> — ${money(s.stake)} says it claims</div>`;
  }));
  return rows.length ? rows.join('') : `<div class="fine">Nobody has bet against anyone. Yet.</div>`;
}

function shortMult(view, m) {
  const s = view.rules.shorts;
  const odds = s.odds[m.rating] ?? 0.3;
  return (s.payout / odds - 1).toFixed(1);
}

function shortFormHtml(view) {
  const s = view.rules.shorts;
  return `
    <div class="short-form">
      <div class="fine">Bet a client claims this quarter — paid by the market, priced off the brochure. Everyone sees it.</div>
      <div class="inline">
        <select id="shortClient">
          ${view.market.map(m => `<option value="${m.id}">${m.emoji} ${esc(m.name)} (pays ${shortMult(view, m)}×)</option>`).join('')}
        </select>
        <input id="shortStake" type="number" inputmode="numeric" min="${s.min}" max="${s.max}" placeholder="$${s.min}–${s.max}">
      </div>
      <button class="btn small" data-action="place-short">Short it, publicly</button>
    </div>`;
}

function bookHtml(view) {
  const insured = view.market.filter(m => m.winner);
  if (!insured.length) return `<div class="fine">Nobody signed anything this quarter. A cautious market.</div>`;
  return `<div class="book">${insured.map(m => {
    const owner = view.players.find(p => p.id === m.winner);
    const re = m.reinsurance.map(r => {
      const rp = view.players.find(p => p.id === r.pid);
      return `<span class="retag">${rp?.avatar} covers ${r.pct}%</span>`;
    }).join('');
    const syn = m.syndicated
      ? `<span class="${m.laidOff >= view.rules.layoffPct ? 'retag' : 'syn-warn'}">🏛 laid off ${m.laidOff}% / needs ${view.rules.layoffPct}%${m.laidOff >= view.rules.layoffPct ? ' ✓' : ' — or it VOIDS'}</span>`
      : '';
    return `<div class="bookrow">
      <span>${m.emoji} ${esc(m.name)}</span>
      <span class="dim">${owner?.avatar} ${esc(owner?.name)} · ${money(m.soldCoverage || m.coverage)} exposure ${re}</span>
      ${syn}
    </div>`;
  }).join('')}</div>`;
}

function dealDesc(view, d) {
  const other = (pid) => view.players.find(p => p.id === pid);
  const from = other(d.from), to = other(d.to);
  if (d.type === 'reinsurance') {
    const reinsurer = d.terms.owner === d.from ? to : from;
    const owner = other(d.terms.owner);
    return `${reinsurer?.avatar} ${esc(reinsurer?.name)} covers <b>${d.terms.pct}%</b> of <b>${esc(d.terms.clientName)}</b>; ${owner?.avatar} ${esc(owner?.name)} pays <b>${money(d.terms.fee)}</b> now`;
  }
  if (d.type === 'cash') return `${from.avatar} ${esc(from.name)} wires <b>${money(d.terms.amount)}</b> to ${to.avatar} ${esc(to.name)}${d.terms.memo ? ` — “${esc(d.terms.memo)}”` : ''}`;
  if (d.type === 'intel') return `${from.avatar} ${esc(from.name)} leaks an intel card to ${to.avatar} ${esc(to.name)} for <b>${money(d.terms.price)}</b>`;
  return '';
}

function incomingHtml(view) {
  const list = view.proposals.filter(d => d.to === view.youId);
  if (!list.length) return `<div class="fine">Nothing on your desk.</div>`;
  return list.map(d => `
    <div class="deal ${d.status}">
      <div>${dealDesc(view, d)}</div>
      ${d.status === 'open' ? `
        <div class="deal-btns">
          <button class="btn small" data-action="deal-accept" data-deal="${d.id}">Shake on it</button>
          <button class="btn small ghost" data-action="deal-decline" data-deal="${d.id}">Decline</button>
        </div>` : `<span class="tag">${d.status}</span>`}
    </div>`).join('');
}

function outgoingHtml(view) {
  const list = view.proposals.filter(d => d.from === view.youId);
  if (!list.length) return `<div class="fine">You haven't proposed anything.</div>`;
  return list.map(d => `<div class="deal ${d.status}"><div>${dealDesc(view, d)}</div><span class="tag">${d.status}</span></div>`).join('');
}

function dealFormHtml(view) {
  const d = drafts.deal;
  const others = view.players.filter(p => p.id !== view.youId);
  const insured = view.market.filter(m => m.winner && (m.winner === view.youId || m.winner === d.to));
  const myIntel = view.you.intel;
  return `
    <div class="card form">
      <div class="form-row tabs">
        ${['reinsurance', 'cash', 'intel'].map(t =>
          `<button class="tab${d.type === t ? ' sel' : ''}" data-action="deal-type" data-type="${t}">${{ reinsurance: 'Reinsure', cash: 'Cash', intel: 'Sell intel' }[t]}</button>`).join('')}
      </div>
      <label class="field"><span>With</span>
        <select id="dealTo" data-action-change="deal-to">
          ${others.map(p => `<option value="${p.id}"${p.id === d.to ? ' selected' : ''}>${p.avatar} ${esc(p.name)}</option>`).join('')}
        </select>
      </label>
      ${d.type === 'reinsurance' ? `
        <label class="field"><span>Policy</span>
          <select id="dealClient">
            ${insured.length ? insured.map(m => {
              const ownerYou = m.winner === view.youId;
              return `<option value="${m.id}">${m.emoji} ${esc(m.name)} (${ownerYou ? 'yours' : 'theirs'})</option>`;
            }).join('') : '<option value="">No policy between you two</option>'}
          </select>
        </label>
        <label class="field"><span>They/you cover</span>
          <div class="inline"><input id="dealPct" type="number" inputmode="numeric" min="1" max="99" value="50"> <span>% of the payout</span></div>
        </label>
        <label class="field"><span>Fee paid to the reinsurer, up front</span>
          <input id="dealFee" type="number" inputmode="numeric" min="0" placeholder="e.g. 150">
        </label>
        <p class="fine">Whoever doesn't own the policy is the reinsurer and pockets the fee.</p>` : ''}
      ${d.type === 'cash' ? `
        <label class="field"><span>Amount to send</span>
          <input id="dealAmount" type="number" inputmode="numeric" min="1" placeholder="e.g. 100">
        </label>
        <label class="field"><span>Memo (public!)</span>
          <input id="dealMemo" maxlength="60" placeholder="consulting fees">
        </label>` : ''}
      ${d.type === 'intel' ? `
        <label class="field"><span>Which card</span>
          <select id="dealCard">
            ${myIntel.length ? myIntel.map(c => `<option value="${c.cardId}">${esc(c.clientName || c.clientId)}: ${esc(c.text.slice(0, 40))}…</option>`).join('') : '<option value="">You hold no intel</option>'}
          </select>
        </label>
        <label class="field"><span>Price</span>
          <input id="dealPrice" type="number" inputmode="numeric" min="0" placeholder="e.g. 100">
        </label>
        <p class="fine">They get a copy. You still know it too — and you can sell it again.</p>` : ''}
      <div class="deal-btns">
        <button class="btn" data-action="deal-send">Send proposal</button>
        <button class="btn ghost" data-action="deal-cancel">Cancel</button>
      </div>
    </div>`;
}

// --- claims ---
function claimsHtml(view) {
  const c = view.claims;
  const done = c.revealed >= c.total;
  return `
    <p class="phase-note">📢 Phones up, everyone watches. ${done ? 'Claims season is over.' : 'The adjusters are opening files…'}</p>
    ${c.results.map((r, i) => {
      const big = i === c.results.length - 1;
      const owner = r.winner ? view.players.find(p => p.id === r.winner) : null;
      return `
      <div class="card claim ${r.hit ? 'hit' : 'safe'} ${big ? 'latest' : ''}">
        <div class="claim-head">${r.emoji} <b>${esc(r.name)}</b>
          <span class="risk-reveal">true risk ${r.risk}%</span></div>
        <div class="claim-verdict">${r.hit ? '💥 CLAIM' : '✅ NO CLAIM'}</div>
        <div class="claim-text">${esc(r.text)}</div>
        ${r.insured ? `<div class="claim-owner">${owner?.avatar} ${esc(owner?.name)} held it (premium ${money(r.premium)}${r.coverage ? ` · cover ${money(r.coverage)}` : ''})</div>` : ''}
        ${r.payouts.map(p => {
          const pl = view.players.find(x => x.id === p.pid);
          return `<div class="payout">${pl?.avatar} ${esc(pl?.name)} pays <b>${money(p.amount)}</b>${p.owner ? '' : ` (${p.pct}% reinsured)`}</div>`;
        }).join('')}
        ${(r.shortResults || []).map(s => {
          const pl = view.players.find(x => x.id === s.pid);
          return `<div class="payout ${s.amount > 0 ? 'pos' : ''}">${pl?.avatar} ${esc(pl?.name)}'s short ${s.amount > 0 ? `pays <b>${money(s.amount, true)}</b> 😈` : `busts <b>${money(s.amount, true)}</b>`}</div>`;
        }).join('')}
      </div>`;
    }).join('')}
    ${isHost(view)
      ? `<button class="btn big" data-action="advance-claims">${done ? 'To the ledger' : c.revealed === 0 ? 'Open the first file' : 'Next file'}</button>`
      : ''}`;
}

// --- ledger ---
function ledgerHtml(view) {
  const led = view.ledger[0];
  const rows = led.summary.map(s => {
    const p = view.players.find(x => x.id === s.pid);
    return `
      <div class="card ledrow">
        <div class="ledhead"><span>${p.avatar} ${esc(p.name)}</span>
          <span class="${moneyClass(s.net)}"><b>${money(s.net, true)}</b></span></div>
        <div class="ledgrid">
          ${s.premiums ? `<span>Premiums</span><span class="pos">${money(s.premiums, true)}</span>` : ''}
          ${s.claims ? `<span>Claims paid</span><span class="neg">${money(s.claims, true)}</span>` : ''}
          ${s.rePayouts ? `<span>Reinsurance payouts</span><span class="neg">${money(s.rePayouts, true)}</span>` : ''}
          ${s.reFees ? `<span>Reinsurance fees</span><span class="${moneyClass(s.reFees)}">${money(s.reFees, true)}</span>` : ''}
          ${s.intelTrade ? `<span>Intel trades</span><span class="${moneyClass(s.intelTrade)}">${money(s.intelTrade, true)}</span>` : ''}
          ${s.cash ? `<span>Wires</span><span class="${moneyClass(s.cash)}">${money(s.cash, true)}</span>` : ''}
          ${s.bets ? `<span>Short desk</span><span class="${moneyClass(s.bets)}">${money(s.bets, true)}</span>` : ''}
          ${s.fines ? `<span>Regulatory fines</span><span class="neg">${money(s.fines, true)}</span>` : ''}
          <span>Capital</span><span class="${moneyClass(s.end)}"><b>${money(s.end)}</b></span>
        </div>
      </div>`;
  }).join('');
  const last = view.round >= view.totalRounds;
  return `
    <p class="phase-note">${esc(view.roundName)} closes. The receipts:</p>
    ${rows}
    ${isHost(view)
      ? `<button class="btn big" data-action="next-round">${last ? 'Final results' : 'Next quarter'}</button>`
      : `<p class="fine">Catch your breath. Hold your grudges.</p>`}
    ${logHtml()}`;
}

// --- results ---
function resultsHtml(view) {
  const ranked = view.players.slice().sort((a, b) => b.capital - a.capital);
  return `
    <div class="finale">
      <div class="finale-crown">👑</div>
      <h2>${ranked.filter(p => view.winnerIds?.includes(p.id)).map(p => `${p.avatar} ${esc(p.name)}`).join(' & ')} runs the market</h2>
      ${ranked.map((p, i) => `
        <div class="card standing${view.winnerIds?.includes(p.id) ? ' winner' : ''}">
          <span>#${i + 1} ${p.avatar} ${esc(p.name)}</span>
          <span class="${moneyClass(p.capital)}"><b>${money(p.capital)}</b></span>
        </div>`).join('')}
      <button class="btn big" data-action="play-again">New game</button>
    </div>
    ${logHtml()}`;
}

function logHtml() {
  return `<details class="logbox"><summary>Market wire 📰</summary><ul id="logList"></ul></details>`;
}

// ---------- events ----------

function onClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  const view = lastView;

  if (a === 'pick-avatar') {
    root.querySelectorAll('.avatar').forEach(el => el.classList.remove('sel'));
    btn.classList.add('sel');
    return;
  }
  if (a === 'pick-theme') {
    root.querySelectorAll('.theme-card').forEach(el => el.classList.remove('sel'));
    btn.classList.add('sel');
    applyTheme(btn.dataset.theme); // live preview
    return;
  }
  if (a === 'quote-tier') {
    const id = btn.dataset.client;
    const tier = parseFloat(btn.dataset.tier);
    drafts.quotes[id] = { ...(drafts.quotes[id] || {}), tier };
    btn.parentElement.querySelectorAll('.tier-btn').forEach(el => el.classList.remove('sel'));
    btn.classList.add('sel');
    const m = lastView?.market.find(x => x.id === id);
    const input = root.querySelector(`.quote-input[data-client="${id}"]`);
    if (m && input) {
      const lo = Math.round(m.band[0] * tier / 10) * 10, hi = Math.round(m.band[1] * tier / 10) * 10;
      input.min = lo; input.max = hi; input.placeholder = `${lo}–${hi}`;
    }
    updateQuoteHint(id);
    return;
  }
  if (a === 'quote-pass') {
    const id = btn.dataset.client;
    const input = root.querySelector(`.quote-input[data-client="${id}"]`);
    const passed = btn.classList.toggle('on');
    if (input) { input.disabled = passed; if (passed) { input.value = ''; delete drafts.quotes[id]; } }
    const hint = $('#be-' + id);
    if (hint) hint.textContent = passed ? 'Passing.' : ' ';
    return;
  }
  if (a === 'submit-quotes') {
    const quotes = {};
    for (const [id, d] of Object.entries(drafts.quotes)) {
      const m = lastView?.market.find(x => x.id === id);
      if (!m || !isFinite(d.premium)) continue;
      quotes[id] = { premium: d.premium, coverage: Math.round(m.coverage * (d.tier ?? 1) / 10) * 10 };
    }
    actions.send({ type: 'submitQuotes', quotes });
    return;
  }
  if (a === 'deal-new') { drafts.deal = { type: 'reinsurance', to: view.players.find(p => p.id !== view.youId)?.id }; $('#dealForm').innerHTML = dealFormHtml(view); return; }
  if (a === 'deal-cancel') { drafts.deal = null; $('#dealForm').innerHTML = `<button class="btn big" data-action="deal-new">Propose a deal</button>`; return; }
  if (a === 'deal-type') { drafts.deal.type = btn.dataset.type; drafts.deal.to = $('#dealTo')?.value || drafts.deal.to; $('#dealForm').innerHTML = dealFormHtml(view); return; }
  if (a === 'deal-send') {
    const d = drafts.deal;
    d.to = $('#dealTo')?.value;
    let deal = null;
    if (d.type === 'reinsurance') deal = { type: 'reinsurance', to: d.to, clientId: $('#dealClient')?.value, pct: $('#dealPct')?.value, fee: $('#dealFee')?.value };
    if (d.type === 'cash') deal = { type: 'cash', to: d.to, amount: $('#dealAmount')?.value, memo: $('#dealMemo')?.value };
    if (d.type === 'intel') deal = { type: 'intel', to: d.to, cardId: $('#dealCard')?.value, price: $('#dealPrice')?.value };
    actions.send({ type: 'proposeDeal', deal });
    drafts.deal = null;
    $('#dealForm').innerHTML = `<button class="btn big" data-action="deal-new">Propose a deal</button>`;
    return;
  }
  if (a === 'place-short') {
    const clientId = $('#shortClient')?.value;
    const stake = parseInt($('#shortStake')?.value, 10);
    if (!isFinite(stake)) { toast('Pick a stake first.'); return; }
    actions.send({ type: 'placeShort', clientId, stake });
    return;
  }
  if (a === 'deal-accept') { actions.send({ type: 'respondDeal', dealId: btn.dataset.deal, accept: true }); return; }
  if (a === 'deal-decline') { actions.send({ type: 'respondDeal', dealId: btn.dataset.deal, accept: false }); return; }
  if (a === 'play-again') { location.href = location.pathname; return; }

  const simple = {
    'start': 'start', 'open-quotes': 'openQuotes', 'open-deals': 'openDeals',
    'end-deals': 'endDeals', 'advance-claims': 'advanceClaims', 'next-round': 'nextRound',
  };
  if (simple[a]) { actions.send({ type: simple[a] }); return; }

  // pre-game navigation is handled by main.js via these callbacks
  if (a === 'show-create') actions.showCreate();
  if (a === 'show-join') actions.showJoin();
  if (a === 'go-home') actions.goHome();
  if (a === 'do-create') actions.doCreate(identityForm());
  if (a === 'do-join') actions.doJoin(identityForm());
}

function identityForm() {
  return {
    name: $('#nameInput')?.value?.trim(),
    avatar: root.querySelector('.avatar.sel')?.dataset.avatar || AVATARS[0],
    code: $('#codeInput')?.value,
    theme: root.querySelector('.theme-card.sel')?.dataset.theme || 'classic',
  };
}

function onInput(e) {
  const el = e.target;
  if (el.id === 'dealTo' && drafts.deal) {
    // Changing the counterparty changes which policies are dealable.
    drafts.deal.to = el.value;
    const form = $('#dealForm');
    if (form) form.innerHTML = dealFormHtml(lastView);
    return;
  }
  if (el.classList?.contains('quote-input')) {
    const id = el.dataset.client;
    const v = parseInt(el.value, 10);
    if (isFinite(v)) drafts.quotes[id] = { ...(drafts.quotes[id] || {}), premium: v };
    else if (drafts.quotes[id]) delete drafts.quotes[id].premium;
    updateQuoteHint(id);
  }
}
