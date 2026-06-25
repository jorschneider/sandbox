// TRACK ONE — a US–China AI diplomacy game.
// Engine + UI. Content lives in data.js; ambient 3D in backdrop.js;
// procedural sound in audio.js.
import { DATA } from './data.js';
import * as audio from './audio.js';

/* ---------------- ambient backdrop (optional, non-blocking) ---------------- */
// Loaded fire-and-forget so the heavy three.js bundle never delays the UI.
(async () => {
  try {
    const mod = await import('./backdrop.js');
    mod.initBackdrop(document.getElementById('bg'));
  } catch (e) {
    // WebGL or three.js unavailable — the CSS gradient backdrop carries the look.
    console.warn('Backdrop disabled:', e);
  }
})();

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const METER_KEYS = ['trust', 'progress', 'usBacking', 'chinaBuyin'];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pips(n, cls) {
  let s = '<span class="pips">';
  for (let i = 1; i <= 5; i++) s += `<span class="pip ${i <= n ? 'on ' + cls : ''}"></span>`;
  return s + '</span>';
}

const actorById = Object.fromEntries(DATA.actors.map(a => [a.id, a]));

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  $(id).classList.add('on');
  const app = $('app');
  if (app) app.scrollTop = 0;
  const sc = $(id); if (sc) sc.scrollTop = 0;
}

/* ---------------- game state ---------------- */
const LEVERAGE_BUDGET = 12;
const state = {
  assignments: {},   // topicId -> actorId (seated counterpart; starts at Beijing's offer)
  meters: { trust: 50, progress: 50, usBacking: 55, chinaBuyin: 45 },
  deck: [],
  deckPos: 0,
  collapsed: false,
  matchQuality: 0,   // 0..1
  leverageLeft: LEVERAGE_BUDGET,
  log: [],
};

/* ================= TITLE / BRIEFING ================= */
function renderBrief() {
  $('brief').innerHTML = DATA.copy.brief.join('');
}

/* ================= PHASE A — NEGOTIATE THE DELEGATION ================= *
 * You don't pick China's people — Beijing fields its comfortable default
 * delegation, and you spend limited leverage to push for the counterparts
 * who actually hold power. The powerful, closed orgs cost the most.        */
function gradeOf(topicId, actorId) {
  const t = DATA.topics.find(x => x.id === topicId);
  if (!t) return 'poor';
  if (t.idealActorIds.includes(actorId)) return 'ideal';
  if (t.plausibleActorIds.includes(actorId)) return 'ok';
  return 'poor';
}
const gradeLabel = (g) => g === 'ideal' ? 'Ideal counterpart' : g === 'ok' ? 'Defensible' : 'Off-target';

function defaultDelegation() {
  const a = {};
  DATA.topics.forEach(t => { a[t.id] = t.candidates[0].a; });
  return a;
}
function costOf(topicId, actorId) {
  const t = DATA.topics.find(x => x.id === topicId);
  const c = t.candidates.find(x => x.a === actorId);
  return c ? c.cost : 0;
}
function spentLeverage() {
  return DATA.topics.reduce((s, t) => s + costOf(t.id, state.assignments[t.id]), 0);
}
function usedElsewhere(topicId, actorId) {
  return DATA.topics.some(t => t.id !== topicId && state.assignments[t.id] === actorId);
}

function seat(topicId, actorId) {
  if (state.assignments[topicId] === actorId) return;
  if (usedElsewhere(topicId, actorId)) return;
  const newSpent = spentLeverage() - costOf(topicId, state.assignments[topicId]) + costOf(topicId, actorId);
  if (newSpent > LEVERAGE_BUDGET) return;
  state.assignments[topicId] = actorId;
  audio.click();
  renderStaff();
}

function renderTracks() {
  const col = $('tracks-col');
  col.innerHTML = '';
  const spent = spentLeverage();
  DATA.topics.forEach(t => {
    const seated = state.assignments[t.id];
    const a = actorById[seated];
    const g = gradeOf(t.id, seated);

    const chips = t.candidates.map(c => {
      const ca = actorById[c.a];
      const isSeated = seated === c.a;
      const elsewhere = !isSeated && usedElsewhere(t.id, c.a);
      const afford = (spent - costOf(t.id, seated) + c.cost) <= LEVERAGE_BUDGET;
      const disabled = !isSeated && (elsewhere || !afford);
      const cost = c.cost === 0
        ? `<span class="cand-cost free">Beijing&rsquo;s offer</span>`
        : `<span class="cand-cost">&minus;${c.cost} lev${elsewhere ? ' · seated elsewhere' : ''}</span>`;
      return `<button class="cand${isSeated ? ' on' : ''}${disabled ? ' disabled' : ''}"
        data-topic="${t.id}" data-actor="${c.a}"${disabled ? ' disabled' : ''}>
        <span class="cand-name">${ca.name}</span>${cost}</button>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'track filled grade-' + g;
    div.innerHTML = `
      <div class="track-top">
        <span class="track-title">${t.title}</span>
        <span class="track-flag">${t.id === 'lead' ? '★ delegation lead' : 'working track'}</span>
      </div>
      <div class="track-prompt">${t.prompt}</div>
      <div class="cands">${chips}</div>
      <div class="seat-detail">
        <span class="seat-name">${a.name} &mdash; ${a.fullName}</span>
        <span class="seat-stats">Power ${pips(a.power, 'pwr')} &nbsp; Openness ${pips(a.openness, 'opn')}</span>
        <span class="pick-grade ${g}">${gradeLabel(g)}</span>
      </div>`;
    col.appendChild(div);
  });

  col.querySelectorAll('.cand:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => seat(el.dataset.topic, el.dataset.actor));
  });
}

function renderStaffReadout() {
  const left = LEVERAGE_BUDGET - spentLeverage();
  state.leverageLeft = left;
  $('leverage-val').textContent = `${left} / ${LEVERAGE_BUDGET}`;
  const fill = $('leverage-fill');
  if (fill) fill.style.width = (100 * left / LEVERAGE_BUDGET) + '%';

  let ideal = 0, ok = 0, poor = 0;
  DATA.topics.forEach(t => {
    const g = gradeOf(t.id, state.assignments[t.id]);
    if (g === 'ideal') ideal++; else if (g === 'ok') ok++; else poor++;
  });
  $('staff-readout').innerHTML =
    `Beijing has seated its delegation. Your pushes so far: <b>${ideal}</b> of the article&rsquo;s ideal counterparts in the room, ` +
    `<b>${ok}</b> defensible, <b>${poor}</b> off-target &mdash; with <b>${left}</b> leverage in reserve.`;
}

function renderStaff() {
  renderTracks();
  renderStaffReadout();
}

/* compute starting meters from the negotiated delegation */
function applyStaffing() {
  const m = { trust: 50, progress: 50, usBacking: 55, chinaBuyin: 45 };
  let sumPower = 0, sumOpen = 0, scoreSum = 0, scoreMax = 0;

  DATA.topics.forEach(t => {
    const aid = state.assignments[t.id];
    const a = actorById[aid];
    const g = gradeOf(t.id, aid);
    const w = t.id === 'lead' ? 1.5 : 1;

    if (g === 'ideal') { m.progress += 3 * w; m.chinaBuyin += 4 * w; scoreSum += 2 * w; }
    else if (g === 'ok') { m.progress += 1 * w; m.chinaBuyin += 1 * w; scoreSum += 1 * w; }
    else { m.progress -= 2 * w; m.chinaBuyin -= 3 * w; m.trust -= 1 * w; }
    scoreMax += 2 * w;

    if (a) { sumPower += a.power; sumOpen += a.openness; }
  });

  const n = DATA.topics.length;
  const avgPower = sumPower / n;       // 1..5
  const avgOpen = sumOpen / n;         // 1..5
  // the central tension: powerful-but-closed delegation => high buy-in, low trust
  m.trust += (avgOpen - 3) * 4;
  m.chinaBuyin += (avgPower - 3) * 4;
  // leverage you didn't spend is political capital you kept in your pocket
  m.usBacking += (LEVERAGE_BUDGET - spentLeverage());

  METER_KEYS.forEach(k => m[k] = Math.round(clamp(m[k])));
  state.meters = m;
  state.matchQuality = scoreMax ? clamp(scoreSum / scoreMax, 0, 1) : 0;
}

/* ================= METERS UI ================= */
function meterHtml(staticView) {
  return METER_KEYS.map(k => {
    const meta = DATA.copy.meters[k];
    const v = state.meters[k];
    return `<div class="meter" data-k="${k}">
      <div class="meter-top"><span class="meter-name">${meta.name}</span><span class="meter-val" data-val="${k}">${v}</span></div>
      <div class="meter-bar"><span class="meter-fill ${k}" data-fill="${k}" style="width:${v}%"></span></div>
    </div>`;
  }).join('');
}
function renderMeters(containerId) {
  $(containerId).innerHTML = meterHtml(containerId === 'readout-meters');
}
function updateMeters(deltas) {
  METER_KEYS.forEach(k => {
    const fill = document.querySelector(`#meters [data-fill="${k}"]`);
    const val = document.querySelector(`#meters [data-val="${k}"]`);
    if (fill) fill.style.width = state.meters[k] + '%';
    if (val) val.textContent = state.meters[k];
    if (deltas && deltas[k]) {
      const cell = document.querySelector(`#meters .meter[data-k="${k}"]`);
      if (cell) { cell.classList.remove('flash'); void cell.offsetWidth; cell.classList.add('flash'); }
    }
  });
}

/* ================= PHASE B — TALKS ================= */
const ROUNDS = 7;
function buildDeck() {
  const all = shuffle(DATA.scenarios);
  state.deck = all.slice(0, Math.min(ROUNDS, all.length));
  state.deckPos = 0;
  state.collapsed = false;
  state.log = [];
}

function renderScenario() {
  const s = state.deck[state.deckPos];
  $('feedback-card').classList.remove('on');
  $('scenario-card').classList.remove('hide');

  $('scenario-count').textContent = `Session ${state.deckPos + 1} of ${state.deck.length}`;
  const topic = s.relatedTopic ? DATA.topics.find(t => t.id === s.relatedTopic) : null;
  const tag = $('scenario-tag');
  if (topic) {
    const aid = state.assignments[topic.id];
    const a = aid ? actorById[aid] : null;
    tag.style.display = '';
    tag.textContent = a ? `Across the table: ${a.name}` : topic.title;
  } else {
    tag.style.display = 'none';
  }

  $('scenario-title').textContent = s.title;
  $('scenario-text').textContent = s.situation;

  const opts = $('options');
  opts.innerHTML = '';
  s.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.dataset.key = String.fromCharCode(65 + i);
    b.textContent = o.label;
    b.addEventListener('click', () => chooseOption(s, o));
    opts.appendChild(b);
  });
}

function chooseOption(scenario, option) {
  const deltas = {};
  METER_KEYS.forEach(k => {
    const d = option.effects[k] || 0;
    deltas[k] = d;
    state.meters[k] = Math.round(clamp(state.meters[k] + d));
  });
  state.log.push({ scenario: scenario.title, choice: option.label });
  const net = METER_KEYS.reduce((s, k) => s + deltas[k], 0);
  audio.blip(net);
  updateMeters(deltas);

  // feedback
  $('scenario-card').classList.add('hide');
  const fc = $('feedback-card');
  $('feedback-deltas').innerHTML = METER_KEYS.map(k => {
    const d = deltas[k];
    const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'zero';
    const sign = d > 0 ? '+' : '';
    return `<span class="delta ${cls}">${DATA.copy.meters[k].short} ${sign}${d}</span>`;
  }).join('');
  $('feedback-text').innerHTML = `<span class="chosen">&ldquo;${option.label}&rdquo;</span>${option.feedback}`;
  fc.classList.add('on');

  // collapse check
  if (state.meters.trust <= 0 || state.meters.chinaBuyin <= 0) {
    state.collapsed = true;
    $('next-btn').textContent = 'See what happened →';
  } else {
    const last = state.deckPos >= state.deck.length - 1;
    $('next-btn').textContent = last ? 'Adjourn → readout' : 'Next session →';
  }
}

function nextScenario() {
  if (state.collapsed || state.deckPos >= state.deck.length - 1) {
    toReadout();
    return;
  }
  state.deckPos++;
  renderScenario();
}

/* ================= PHASE C — READOUT ================= */
function pickEnding() {
  const m = state.meters;
  const E = DATA.copy.endings;

  // Power-weighted score: progress only counts if someone powerful can deliver
  // it. "power" blends China buy-in (party clout) with U.S. backing (mandate).
  const power = m.chinaBuyin * 0.6 + m.usBacking * 0.4;
  const core = m.progress * (0.4 + 0.6 * power / 100);
  let total = core * 0.55 + m.trust * 0.20 + m.chinaBuyin * 0.15 + m.usBacking * 0.10;
  // good staffing (Phase A) is a 0.85–1.15 multiplier on the whole result
  total = Math.round(clamp(total * (0.85 + 0.30 * state.matchQuality)));

  if (state.collapsed) return { ...E.collapse, total, tier: 'f' };

  // special-combo readings — the article's tensions made literal
  if (m.progress >= 60 && m.trust <= 38) return { ...E.distrust, total, tier: 'c' };
  if (m.trust >= 68 && m.progress <= 45) return { ...E.vibes, total, tier: 'c' };
  if (m.chinaBuyin >= 65 && m.usBacking <= 38) return { ...E.lonely, total, tier: 'c' };

  if (total >= 78 && m.chinaBuyin >= 55 && m.trust >= 50) return { ...E.breakthrough, total, tier: 'a' };
  if (total >= 62) return { ...E.working, total, tier: 'b' };
  if (total >= 48) return { ...E.stalemate, total, tier: 'c' };
  if (total >= 34) return { ...E.adjourn, total, tier: 'd' };
  return { ...E.recrimination, total, tier: 'f' };
}

function band(v) { return v >= 64 ? 'high' : v >= 42 ? 'mid' : 'low'; }

function buildStatement(ending) {
  const m = state.meters;
  const f = DATA.copy.frag;
  const paras = [];
  paras.push(ending.lead);

  // a line per meter, drawn from its band
  const lines = METER_KEYS.map(k => f[k][band(m[k])]);
  paras.push(lines.join(' '));

  // closing line keyed to match quality + total
  let close;
  if (state.matchQuality >= 0.8) close = f.close.wellStaffed;
  else if (state.matchQuality <= 0.34) close = f.close.misStaffed;
  else close = f.close.mixed;
  paras.push(close);

  return paras.map(p => `<p>${p}</p>`).join('') +
    `<div class="sig">— Joint readout, U.S.–China Dialogue on Artificial Intelligence · Composite score ${ending.total}/100</div>`;
}

function toReadout() {
  const ending = pickEnding();
  $('ending-name').textContent = ending.name;
  const badge = $('grade-badge');
  badge.className = 'grade-badge tier-' + ending.tier;
  badge.textContent = `${ending.gradeLabel} · ${ending.total}/100`;
  $('statement').innerHTML = buildStatement(ending);
  renderMeters('readout-meters');
  $('readout-credit').innerHTML = DATA.copy.outroCredit;
  state.lastEnding = ending;
  showScreen('screen-readout');
  audio.stinger(ending.tier);
}

function copyResult() {
  const e = state.lastEnding;
  const m = state.meters;
  const txt =
`TRACK ONE — U.S.–China AI Diplomacy
Result: ${e.name} (${e.gradeLabel}, ${e.total}/100)
Trust ${m.trust} · Progress ${m.progress} · U.S. backing ${m.usBacking} · China buy-in ${m.chinaBuyin}
Play: based on Matt Sheehan, "Who should the U.S. talk to in China on AI?"`;
  navigator.clipboard?.writeText(txt).then(showToast, showToast);
}

let toastT;
function showToast() {
  let el = $('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = 'Result copied to clipboard';
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1800);
}

/* ================= FLOW ================= */
function startTalks() {
  applyStaffing();
  buildDeck();
  renderMeters('meters');
  renderScenario();
  showScreen('screen-talks');
}

function resetGame() {
  state.assignments = defaultDelegation();
  state.meters = { trust: 50, progress: 50, usBacking: 55, chinaBuyin: 45 };
  state.collapsed = false;
}

/* ================= +5 YEARS — READ THE TELLS ================= */
function renderFuturesBrief() { $('futures-brief').innerHTML = DATA.copy.futuresIntro.join(''); }

function showFutCard(which) {
  const map = { signpost: 'signpost-card', question: 'fq-card', feedback: 'fq-feedback', read: 'read-card' };
  Object.values(map).forEach(id => $(id).classList.remove('on'));
  $(map[which]).classList.add('on');
}

function startFutures() {
  state.fDeck = shuffle(DATA.futures);
  state.fPos = 0;
  state.fScore = 0;
  state.fMax = 0;
  renderFuture();
  showScreen('screen-futures');
}

function renderFuture() {
  const f = state.fDeck[state.fPos];
  state.curScore = 0;
  state.curMax = 0;
  state.fqPos = 0;
  $('f-year').textContent = f.year;
  $('future-count').textContent = `Future ${state.fPos + 1} of ${state.fDeck.length}`;
  const pips = '●'.repeat(f.elevation) + '○'.repeat(5 - f.elevation);
  $('future-owner').innerHTML = `Owns the file: ${f.owner}<span class="elev" title="How high AI sits in the hierarchy">${pips}</span>`;
  $('signposts').innerHTML = f.signposts.map(s => `<li>${s}</li>`).join('');
  showFutCard('signpost');
}

function beginRead() { state.fqPos = 0; renderFQuestion(); }

function renderFQuestion() {
  const f = state.fDeck[state.fPos];
  const q = f.questions[state.fqPos];
  $('fq-count').textContent = `Read ${state.fqPos + 1} of ${f.questions.length}`;
  $('fq-prompt').innerHTML = q.prompt;
  const box = $('fq-options');
  box.innerHTML = '';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.dataset.key = String.fromCharCode(65 + i);
    b.innerHTML = o.label;
    b.addEventListener('click', () => chooseFQ(o));
    box.appendChild(b);
  });
  showFutCard('question');
}

function chooseFQ(option) {
  const f = state.fDeck[state.fPos];
  state.fScore += option.points; state.fMax += 2;
  state.curScore += option.points; state.curMax += 2;
  audio.blip(option.points === 2 ? 2 : option.points === 0 ? -2 : 0);

  const v = $('fq-verdict');
  const tier = option.points === 2 ? 'p2' : option.points === 1 ? 'p1' : 'p0';
  v.className = 'fq-verdict ' + tier;
  v.textContent = option.points === 2 ? 'Sharp read' : option.points === 1 ? 'Defensible' : 'Mirror-imaging';
  $('fq-note').innerHTML = option.note;
  const last = state.fqPos >= f.questions.length - 1;
  $('fq-next-btn').innerHTML = last ? 'See the analyst&rsquo;s read &rarr;' : 'Next read &rarr;';
  showFutCard('feedback');
}

function nextFQ() {
  const f = state.fDeck[state.fPos];
  if (state.fqPos >= f.questions.length - 1) { showRead(); return; }
  state.fqPos++;
  renderFQuestion();
}

function showRead() {
  const f = state.fDeck[state.fPos];
  $('read-name').textContent = f.name;
  $('read-grid').innerHTML = [
    ['The technology', f.read.impact],
    ['Beijing&rsquo;s choice', f.read.posture],
    ['Your dialogue', f.read.dialogue],
  ].map(([k, v]) => `<div class="read-row"><span class="rk">${k}</span><span class="rv">${v}</span></div>`).join('');
  $('read-score').textContent = `Your read on this future: ${state.curScore} / ${state.curMax}`;
  const last = state.fPos >= state.fDeck.length - 1;
  $('read-next-btn').innerHTML = last ? 'Analyst debrief &rarr;' : 'Next future &rarr;';
  showFutCard('read');
}

function nextFuture() {
  if (state.fPos >= state.fDeck.length - 1) { futuresDebrief(); return; }
  state.fPos++;
  renderFuture();
}

function futuresDebrief() {
  const acc = state.fMax ? state.fScore / state.fMax : 0;
  const tier = DATA.copy.analystRatings.find(r => acc >= r.min) || DATA.copy.analystRatings[DATA.copy.analystRatings.length - 1];
  $('analyst-rating').textContent = tier.name;
  const badge = $('analyst-badge');
  badge.className = 'grade-badge tier-' + tier.badge.toLowerCase();
  badge.textContent = `${tier.badge} · ${Math.round(acc * 100)}% read accuracy`;
  $('analyst-blurb').innerHTML = `<p>${tier.blurb}</p><p>You scored <b>${state.fScore} of ${state.fMax}</b> across ${state.fDeck.length} possible 2031s — reading what each bureaucratic shift implied about AI's impact and how Beijing chose to deal with it.</p>`;
  $('futures-credit').innerHTML = DATA.copy.futuresCredit;
  audio.stinger(tier.badge.toLowerCase());
  showScreen('screen-futures-debrief');
}

/* ================= WIRE-UP ================= */
renderBrief();
renderFuturesBrief();

// dialogue mode
$('start-btn').addEventListener('click', () => { audio.ensureAudio(); state.assignments = defaultDelegation(); renderStaff(); showScreen('screen-staff'); });
$('lock-btn').addEventListener('click', startTalks);
$('next-btn').addEventListener('click', nextScenario);
$('replay-btn').addEventListener('click', () => { resetGame(); renderStaff(); showScreen('screen-staff'); });
$('copy-btn').addEventListener('click', copyResult);

// +5 years mode
$('futures-btn').addEventListener('click', () => { audio.ensureAudio(); showScreen('screen-futures-intro'); });
$('to-futures-btn').addEventListener('click', () => showScreen('screen-futures-intro'));
$('futures-back-btn').addEventListener('click', () => showScreen('screen-title'));
$('futures-start-btn').addEventListener('click', startFutures);
$('begin-read-btn').addEventListener('click', beginRead);
$('fq-next-btn').addEventListener('click', nextFQ);
$('read-next-btn').addEventListener('click', nextFuture);
$('futures-replay-btn').addEventListener('click', startFutures);
$('futures-home-btn').addEventListener('click', () => showScreen('screen-title'));

// sound toggle
let soundOn = true;
const soundBtn = $('sound-toggle');
if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    audio.setEnabled(soundOn);
    if (soundOn) audio.ensureAudio();
    soundBtn.classList.toggle('off', !soundOn);
    soundBtn.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
  });
}
