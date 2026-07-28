/*
 * Screens, rendering and input.
 *
 * This file talks to a session (online host, online guest, or pass-and-play)
 * through one small interface: it receives redacted views and sends intents.
 * It never sees the opponent's cards, because it is never sent them.
 */

import {
  SUIT_SYMBOL, RED_SUITS, RANK_LABEL, suitOf, rankOf, combinationName, other,
  DEFAULT_TARGET,
} from './rules.js';
import {
  createOnlineHost, createOnlineGuest, createLocalSession, createSoloSession, normaliseCode,
} from './net.js';
import { nextLesson, renderLesson, explainRefusal } from './coach.js';
import { GRADES } from './analysis.js';

const $ = (id) => document.getElementById(id);
const TRICK_HOLD = 1400;
const HINT_HOLD = 3200;
const NAME_KEY = 'franzefuss.name';
const TAUGHT_KEY = 'franzefuss.taught';
const COACH_KEY = 'franzefuss.coach';

let session = null;
let view = null;
let selected = null;

/* The host waits on the lobby with their code until someone actually joins. */
let tableReady = false;

/* Per-deal presentation state, none of which belongs in the shared game state. */
let heldTrick = null;
let heldTimer = null;
let shownTrick = 0;
let currentDeal = 0;
let announceOpen = false;
let reviewOpen = false;
let reviewRequested = false;
let shownAnnouncements = 0;

/* Coaching: which lessons this player has had, and whether they still want them. */
let taught = loadTaught();
let coaching = loadCoaching();
let lesson = null;
let hint = null;
let hintTimer = null;
let rulesReturn = 'screen-home';

/* -------------------------------------------------------------- screens --- */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('is-active', screen.id === id);
  });
}

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function rememberName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* private browsing — the name simply will not stick */
  }
}

function loadTaught() {
  try {
    return new Set(JSON.parse(localStorage.getItem(TAUGHT_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveTaught() {
  try {
    localStorage.setItem(TAUGHT_KEY, JSON.stringify([...taught]));
  } catch {
    /* private browsing — the lessons will simply come round again */
  }
}

function loadCoaching() {
  try {
    return localStorage.getItem(COACH_KEY) !== 'off';
  } catch {
    return true;
  }
}

function setCoaching(on) {
  coaching = on;
  try {
    localStorage.setItem(COACH_KEY, on ? 'on' : 'off');
  } catch {
    /* nothing to store into; the setting lasts the session */
  }
}

/* Two screens can carry a name field; whichever is on show is the live one. */
function playerName(id = 'name-input') {
  return ($(id).value || '').trim().slice(0, 16) || 'Player';
}

/* --------------------------------------------------------------- cards --- */

/*
 * A card you can play is a button; one that is only being shown is a div. That
 * keeps a card out of the tab order when it is not a control, and keeps cards
 * legal inside the announcement rows, which are themselves buttons.
 */
function cardEl(card, options = {}) {
  const interactive = !!options.onClick;
  const element = document.createElement(interactive ? 'button' : 'div');
  if (interactive) element.type = 'button';
  element.className = 'card';
  if (RED_SUITS[suitOf(card)]) element.classList.add('red');
  if (options.mini) element.classList.add('mini');
  if (options.trump && suitOf(card) === options.trump) element.classList.add('trump');
  if (options.selected) element.classList.add('selected');
  if (options.illegal) element.classList.add('illegal');
  if (!options.onClick) element.classList.add('static');

  const rank = document.createElement('span');
  rank.className = 'rank';
  rank.textContent = RANK_LABEL[rankOf(card)];
  const suit = document.createElement('span');
  suit.className = 'suit';
  suit.textContent = SUIT_SYMBOL[suitOf(card)];
  const corner = document.createElement('span');
  corner.className = 'corner';
  corner.textContent = RANK_LABEL[rankOf(card)] + SUIT_SYMBOL[suitOf(card)];
  element.append(rank, suit, corner);

  element.setAttribute(
    'aria-label',
    `${RANK_LABEL[rankOf(card)]} of ${{ S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }[suitOf(card)]}`,
  );

  if (interactive) element.addEventListener('click', options.onClick);
  return element;
}

function backEl() {
  const element = document.createElement('div');
  element.className = 'card back';
  return element;
}

function emptySlot() {
  const element = document.createElement('div');
  element.className = 'slot empty';
  return element;
}

/* ------------------------------------------------------------ rendering --- */

function onState(next) {
  view = next;

  if (view.dealNumber !== currentDeal) {
    currentDeal = view.dealNumber;
    shownTrick = 0;
    heldTrick = null;
    selected = null;
    announceOpen = false;
    reviewOpen = false;
    reviewRequested = false;
    shownAnnouncements = 0;
    clearTimeout(heldTimer);
  }

  /* Say out loud what the other player just announced. */
  const calls = (view.deal && view.deal.announcements) || [];
  if (calls.length > shownAnnouncements) {
    const latest = calls[calls.length - 1];
    shownAnnouncements = calls.length;
    if (latest.player !== view.you) {
      showHint(
        latest.good
          ? `${view.names[latest.player]} announces ${latest.name} — good for ${latest.value}.`
          : `${view.names[latest.player]} announced ${latest.name} — not good.`,
      );
    }
  }

  const deal = view.deal;
  if (deal && deal.lastTrick && deal.lastTrick.number > shownTrick && !heldTrick) {
    heldTrick = deal.lastTrick;
    clearTimeout(heldTimer);
    heldTimer = setTimeout(() => {
      shownTrick = heldTrick.number;
      heldTrick = null;
      render();
    }, TRICK_HOLD);
  }

  if (tableReady && !$('screen-table').classList.contains('is-active')) {
    showScreen('screen-table');
  }
  render();
}

function render() {
  if (!view || !view.deal) return;
  const deal = view.deal;
  const you = view.you;
  const them = other(you);

  /* The solve was asked for and has landed: show it. */
  if (reviewRequested && view.review && view.review.state === 'ready') {
    reviewRequested = false;
    reviewOpen = true;
  }

  /* A lesson waits its turn behind a trick being shown, and behind itself. */
  if (coaching && !lesson) {
    lesson = nextLesson(view, taught, { busy: !!heldTrick });
  }

  renderScoreboard(deal, you, them);
  renderOpponent(deal);
  renderStock(deal);
  renderTrick(deal, you);
  renderHand(deal, you);
  renderBanner(deal, you, them);
  renderOverlays(deal, you, them);
}

function showHint(text) {
  if (!text) return;
  hint = text;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hint = null;
    render();
  }, HINT_HOLD);
  render();
}

function renderScoreboard(deal, you, them) {
  const themBox = $('score-them');
  const youBox = $('score-you');
  themBox.querySelector('.who').textContent = view.names[them];
  themBox.querySelector('.pts').textContent = view.scores[them];
  youBox.querySelector('.who').textContent = `${view.names[you]} (you)`;
  youBox.querySelector('.pts').textContent = view.scores[you];

  const active = deal.stage === 'play' ? deal.turn : null;
  themBox.classList.toggle('turn', active === them);
  youBox.classList.toggle('turn', active === you);

  const badge = $('trump-badge');
  badge.textContent = SUIT_SYMBOL[deal.trump];
  badge.classList.toggle('red', !!RED_SUITS[deal.trump]);
  badge.title = 'Trump suit';
  $('deal-no').textContent = `Deal ${view.dealNumber} · to ${view.target}`;
}

function renderOpponent(deal) {
  const rail = $('opp-hand');
  rail.replaceChildren();
  for (let i = 0; i < deal.opponentCards; i++) rail.append(backEl());
}

function renderStock(deal) {
  const stock = $('stock');
  const remaining = deal.stockCount;
  stock.classList.toggle('empty', remaining === 0);
  $('stock-count').textContent = remaining || '';
  stock.title = `${remaining} card${remaining === 1 ? '' : 's'} left to draw`;

  const slot = $('upcard');
  slot.replaceChildren();
  if (deal.upcard) slot.append(cardEl(deal.upcard, { mini: true, trump: deal.trump }));
}

function renderTrick(deal, you) {
  const area = $('trick');
  area.replaceChildren();

  const showing = heldTrick && deal.trickCards.every((card) => card === null)
    ? { cards: heldTrick.cards, lead: heldTrick.lead }
    : { cards: deal.trickCards, lead: deal.trickLead };

  const order = [showing.lead, other(showing.lead)];
  for (const seat of order) {
    const card = showing.cards[seat];
    area.append(card ? cardEl(card, { trump: deal.trump }) : emptySlot());
  }
  void you;
}

function renderHand(deal, you) {
  const rail = $('hand');
  rail.replaceChildren();

  /* A trick being shown, or a lesson on screen, means the hand is not live. */
  const yourMove = deal.stage === 'play' && deal.turn === you && !heldTrick && !lesson;
  const legal = new Set(deal.legal);
  if (selected && !deal.hand.includes(selected)) selected = null;

  for (const card of deal.hand) {
    const playable = yourMove && legal.has(card);
    const refused = yourMove && !playable;
    rail.append(
      cardEl(card, {
        trump: deal.trump,
        selected: selected === card,
        illegal: refused,
        /* A refused card still answers when tapped — it says why it is refused. */
        onClick: playable
          ? () => {
              if (selected === card) {
                selected = null;
                session.send({ type: 'play', card });
              } else {
                selected = card;
              }
              render();
            }
          : refused
            ? () => showHint(explainRefusal(view, card))
            : null,
      }),
    );
  }

  fanHand(rail, deal.hand.length);

  const play = $('btn-play');
  play.hidden = !(yourMove && selected);
  play.onclick = () => {
    const card = selected;
    selected = null;
    session.send({ type: 'play', card });
  };

  const rob = $('btn-rob');
  rob.hidden = !(deal.canRob && !heldTrick && !lesson);
  rob.onclick = () => {
    selected = null;
    session.send({ type: 'rob' });
  };

  const announce = $('btn-announce');
  const offer = deal.canAnnounce && !heldTrick && !lesson;
  announce.hidden = !offer;
  if (offer) {
    const worth = deal.announceOptions.reduce((sum, one) => sum + one.total, 0);
    announce.textContent = `Announce · ${worth}`;
  }
  announce.onclick = () => {
    announceOpen = true;
    render();
  };
}

/*
 * Nine cards are wider than a phone, so they overlap by however much it takes
 * to fit — never by so much that the rank in the corner is swallowed.
 */
function fanHand(rail, count) {
  rail.style.setProperty('--overlap', '0px');
  if (count < 2) return;

  const first = rail.firstElementChild;
  if (!first) return;

  const cardWidth = first.getBoundingClientRect().width;
  const gap = 4;
  const available = rail.parentElement.clientWidth - 12;
  const natural = count * cardWidth + (count - 1) * gap;
  if (natural <= available) return;

  const needed = (natural - available) / (count - 1);
  rail.style.setProperty('--overlap', `${Math.min(needed, cardWidth * 0.55)}px`);
}

function renderBanner(deal, you, them) {
  const banner = $('banner');
  banner.classList.remove('waiting', 'hint');

  if (hint) {
    banner.classList.add('hint');
    banner.textContent = hint;
    return;
  }

  if (heldTrick) {
    const winner = heldTrick.winner === you ? 'You take it' : `${view.names[them]} takes it`;
    banner.textContent = `${winner} · ${heldTrick.points} pts`;
    return;
  }

  if (deal.stage === 'over') {
    banner.textContent = 'Deal over';
    return;
  }

  if (deal.turn === you) {
    const leading = deal.trickCards[them] === null;
    if (leading) {
      banner.textContent = deal.mustFollow ? 'Your lead' : 'Your lead — play anything';
    } else {
      banner.textContent = deal.mustFollow ? 'Your turn — follow suit' : 'Your turn';
    }
  } else {
    banner.classList.add('waiting');
    banner.textContent = `${view.names[them]} is thinking…`;
  }
}

/* ------------------------------------------------------------ overlays --- */

function renderOverlays(deal, you, them) {
  const announceSheet = $('overlay-announce');
  const dealOver = $('overlay-deal');
  const matchOver = $('overlay-match');
  const coach = $('overlay-coach');

  /* Teaching comes before everything else on screen. */
  if (lesson) {
    announceSheet.hidden = true;
    dealOver.hidden = true;
    matchOver.hidden = true;
    renderCoach();
    return;
  }
  coach.hidden = true;

  if (reviewOpen && view.review && view.review.state === 'ready') {
    dealOver.hidden = true;
    announceSheet.hidden = true;
    matchOver.hidden = true;
    renderReview(view.review.value);
    return;
  }
  $('overlay-review').hidden = true;

  if (view.matchOver) {
    announceSheet.hidden = true;
    dealOver.hidden = true;
    renderMatchOver(you, them);
    return;
  }
  matchOver.hidden = true;

  if (announceOpen && deal.canAnnounce) {
    dealOver.hidden = true;
    renderAnnounce(deal);
    return;
  }
  announceSheet.hidden = true;
  announceOpen = false;

  if (deal.stage === 'over' && !heldTrick) {
    renderDealOver(deal, you, them);
    return;
  }
  dealOver.hidden = true;
}

function renderCoach() {
  const overlay = $('overlay-coach');
  const content = renderLesson(lesson, view);
  overlay.hidden = false;

  $('coach-title').textContent = content.title;

  const body = $('coach-body');
  body.replaceChildren();
  if (content.body) body.append(line(content.body));

  if (content.cards) {
    const strip = document.createElement('div');
    strip.className = 'meld-cards';
    for (const card of content.cards) {
      strip.append(cardEl(card, { mini: true, trump: view.deal.trump }));
    }
    body.append(strip);
  }

  if (content.rows) {
    const table = document.createElement('table');
    table.className = 'tally';
    for (const [label, value] of content.rows) {
      const row = document.createElement('tr');
      const head = document.createElement('th');
      head.textContent = label;
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(head, cell);
      table.append(row);
    }
    body.append(table);
  }

  if (content.footer) {
    const note = document.createElement('p');
    note.className = 'fineprint';
    note.textContent = content.footer;
    body.append(note);
  }
}

function dismissLesson() {
  if (!lesson) return;
  taught.add(lesson.id);
  saveTaught();
  lesson = null;
  render();
}

/*
 * The announcement sheet, offered on your own lead. Each class is one tap: the
 * opponent judges it against their own hand, and if yours is better you score
 * every combination of that class you are holding.
 */
function renderAnnounce(deal) {
  const overlay = $('overlay-announce');
  const body = $('announce-body');
  overlay.hidden = false;
  body.replaceChildren();

  for (const option of deal.announceOptions) {
    const button = document.createElement('button');
    button.className = 'btn announce-option';
    button.type = 'button';

    const heading = document.createElement('span');
    heading.className = 'announce-head';
    heading.textContent = option.count > 1
      ? `${combinationName(option.best)} + ${option.count - 1} more`
      : combinationName(option.best);

    const worth = document.createElement('span');
    worth.className = 'announce-worth';
    worth.textContent = option.total;

    const strip = document.createElement('span');
    strip.className = 'meld-cards';
    for (const card of option.best.cards) {
      strip.append(cardEl(card, { mini: true, trump: deal.trump }));
    }

    button.append(heading, worth, strip);
    button.onclick = () => {
      announceOpen = false;
      session.send({ type: 'announce', kind: option.kind });
    };
    body.append(button);
  }

  $('btn-announce-close').onclick = () => {
    announceOpen = false;
    render();
  };
}

/*
 * The post-game. Two exact numbers: the position the first half left you in,
 * and how much of it you kept. Then the decisions that cost the most, with the
 * card that was actually right.
 */
function renderReview(review) {
  const overlay = $('overlay-review');
  overlay.hidden = false;
  $('review-title').textContent =
    review.accuracy === null ? 'Nothing to grade' : `${review.accuracy}% accuracy`;

  const body = $('review-body');
  body.replaceChildren();

  if (review.accuracy === null) {
    body.append(line('Every endgame play was forced — there was no decision to get wrong.'));
    return;
  }

  const table = document.createElement('table');
  table.className = 'tally';
  table.append(tallyRow('Position at the turn', [{
    text: `${review.position >= 0 ? '+' : '−'}${Math.abs(review.position)}`,
    win: review.position > 0,
  }]));
  table.append(tallyRow('Given up since', [{ text: `−${review.lost}` }]));
  table.append(tallyRow('Decisions graded', [{ text: review.graded }]));
  body.append(table);
  body.append(line(
    'The first number is solved, not estimated: the exact margin you were holding ' +
    'when the stock ran out. Everything after it was in your hands.',
  ));

  const grades = document.createElement('div');
  grades.className = 'grade-row';
  for (const grade of GRADES) {
    const count = review.counts[grade.id];
    if (!count) continue;
    const row = document.createElement('div');
    row.className = 'grade-line';
    const dot = document.createElement('span');
    dot.className = `dot ${grade.id}`;
    const name = document.createElement('span');
    name.textContent = grade.label;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = count;
    row.append(dot, name, n);
    grades.append(row);
  }
  body.append(grades);

  if (!review.worst.length) {
    body.append(line('Not a point dropped. That is the whole endgame played perfectly.'));
    return;
  }

  const heading = document.createElement('p');
  heading.className = 'verdict';
  heading.textContent = 'What it cost';
  body.append(heading);

  for (const miss of review.worst) {
    const row = document.createElement('div');
    row.className = 'miss';
    const where = document.createElement('span');
    where.className = 'where';
    where.textContent = `Trick ${miss.trickNumber}`;
    const played = cardEl(miss.played, { mini: true, trump: view.deal.trump });
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '→';
    const best = cardEl(miss.best, { mini: true, trump: view.deal.trump });
    const cost = document.createElement('span');
    cost.className = 'cost';
    cost.textContent = `−${Math.round(miss.loss)}`;
    row.append(where, played, arrow, best, cost);
    body.append(row);
  }

  $('btn-review-close').onclick = () => {
    reviewOpen = false;
    render();
  };
}

function line(text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'sub';
  paragraph.textContent = text;
  return paragraph;
}

function tallyRow(label, values, className = '') {
  const row = document.createElement('tr');
  if (className) row.className = className;
  const head = document.createElement('th');
  head.textContent = label;
  row.append(head);
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value.text;
    if (value.win) cell.classList.add('win');
    if (value.name) cell.classList.add('col-name');
    row.append(cell);
  }
  return row;
}

function renderDealOver(deal, you, them) {
  const overlay = $('overlay-deal');
  overlay.hidden = false;
  const result = deal.result;
  const seats = [you, them];

  $('deal-title').textContent =
    result.totals[you] > result.totals[them] ? 'You won the deal' :
    result.totals[you] < result.totals[them] ? `${view.names[them]} won the deal` :
    'A dead heat';

  const body = $('deal-body');
  body.replaceChildren();

  if (result.sweep !== null) {
    const swept = document.createElement('p');
    swept.className = 'verdict';
    swept.textContent = result.sweep === you
      ? `${view.names[them]} took none of the last nine — the whole round is yours.`
      : 'You took none of the last nine — the whole round goes across.';
    body.append(swept);
  }

  const table = document.createElement('table');
  table.className = 'tally';
  table.append(tallyRow('', seats.map((seat) => ({
    text: seat === you ? 'You' : view.names[seat], name: true,
  }))));
  table.append(tallyRow('Cards', seats.map((seat) => ({ text: result.cardPoints[seat] }))));
  table.append(tallyRow('Announced', seats.map((seat) => ({ text: result.announcePoints[seat] }))));
  table.append(tallyRow('Tricks', seats.map((seat) => ({ text: result.tricksWon[seat] }))));
  table.append(tallyRow('Deal', seats.map((seat) => ({
    text: result.totals[seat],
    win: result.totals[seat] > result.totals[other(seat)],
  })), 'total'));
  table.append(tallyRow('Match', seats.map((seat) => ({ text: `${view.scores[seat]}` }))));
  body.append(table);

  wireReviewButton($('btn-review'));

  const next = $('btn-next');
  const waiting = view.ready[you] && !view.ready[them];
  next.disabled = waiting;
  next.textContent = waiting ? 'Ready' : 'Next deal';
  next.onclick = () => session.send({ type: 'ready' });
  $('next-hint').textContent = waiting ? `Waiting for ${view.names[them]}…` : '';
}

/*
 * A partie can be decided by a single deal, so the review has to be reachable
 * from the match screen as well as the tally.
 */
function wireReviewButton(button) {
  const available = !!view.review;
  button.hidden = !available;
  if (!available) return;

  const solving = view.review.state === 'solving';
  button.disabled = solving;
  button.textContent = solving ? 'Solving the endgame…' : 'Review the endgame';
  button.onclick = () => {
    if (view.review.state === 'ready') reviewOpen = true;
    else {
      reviewRequested = true;
      session.send({ type: 'review' });
    }
    render();
  };
}

function renderMatchOver(you, them) {
  const overlay = $('overlay-match');
  overlay.hidden = false;
  wireReviewButton($('btn-review-match'));
  const winner = view.matchWinner;

  $('match-title').textContent =
    winner === null ? 'Level pegging' : winner === you ? 'You take the partie' : `${view.names[them]} takes the partie`;

  const body = $('match-body');
  body.replaceChildren();
  const table = document.createElement('table');
  table.className = 'tally';
  table.append(tallyRow('', [you, them].map((seat) => ({
    text: seat === you ? 'You' : view.names[seat], name: true,
  }))));
  table.append(tallyRow('Final', [you, them].map((seat) => ({
    text: view.scores[seat], win: seat === winner,
  })), 'total'));
  if (view.parties[0] + view.parties[1] > 1) {
    table.append(tallyRow('Parties', [you, them].map((seat) => ({
      text: view.parties[seat], win: view.parties[seat] > view.parties[other(seat)],
    }))));
  }
  body.append(table);

  $('btn-rematch').onclick = () => session.send({ type: 'rematch' });
}

/* -------------------------------------------------------------- status --- */

function onStatus(status) {
  const overlay = $('overlay-link');

  if (status.state === 'waiting') {
    $('code-display').textContent = status.code;
    $('host-hint').textContent = 'Waiting for the other phone…';
    $('btn-share').disabled = false;
    $('btn-copy').disabled = false;
    return;
  }

  if (status.state === 'connected') {
    overlay.hidden = true;
    tableReady = true;
    if (view) showScreen('screen-table');
    return;
  }

  if (status.state === 'lost') {
    overlay.hidden = false;
    $('link-title').textContent = 'Connection lost';
    $('link-body').textContent = session && session.mode === 'host'
      ? `Waiting for ${view ? view.names[1] : 'the other phone'} to come back. Keep this page open — the code still works.`
      : 'Trying to get back into the game…';
    return;
  }

  if (status.state === 'error') {
    if ($('screen-host').classList.contains('is-active')) {
      $('host-hint').textContent = status.message;
      $('code-display').textContent = '·····';
      return;
    }
    if ($('screen-join').classList.contains('is-active')) {
      $('join-hint').textContent = status.message;
      $('btn-join').disabled = false;
      return;
    }
    overlay.hidden = false;
    $('link-title').textContent = 'Disconnected';
    $('link-body').textContent = status.message;
  }
}

/* ------------------------------------------------------------ sessions --- */

function attach(next) {
  if (session) session.close();
  session = next;
  view = null;
  tableReady = false;
  currentDeal = 0;
  selected = null;
  heldTrick = null;
  lesson = null;
  hint = null;
  clearTimeout(heldTimer);
  clearTimeout(hintTimer);

  session.on('status', onStatus);
  session.on('state', onState);
  session.on('handoff', (handoff) => {
    $('handoff-name').textContent = `to ${handoff.name}`;
    showScreen('screen-handoff');
  });
}

function leave() {
  if (session) session.close();
  session = null;
  view = null;
  tableReady = false;
  lesson = null;
  hint = null;
  $('overlay-link').hidden = true;
  $('overlay-announce').hidden = true;
  $('overlay-deal').hidden = true;
  $('overlay-match').hidden = true;
  $('overlay-coach').hidden = true;
  showScreen('screen-home');
}

function shareUrl(code) {
  return `${location.origin}${location.pathname}?room=${code}`;
}

/* ---------------------------------------------------------------- wire --- */

function boot() {
  $('name-input').value = savedName();
  $('join-name').value = savedName();
  $('name-input').addEventListener('input', () => { $('join-name').value = $('name-input').value; });

  const openRules = (from) => {
    rulesReturn = from;
    const again = $('btn-coach-again');
    again.hidden = coaching && taught.size === 0;
    again.textContent = coaching ? 'Replay the lessons' : 'Turn the coach back on';
    showScreen('screen-rules');
  };
  $('btn-rules').onclick = () => openRules('screen-home');
  $('btn-help').onclick = () => openRules('screen-table');
  $('btn-rules-back').onclick = () => showScreen(rulesReturn);

  $('btn-coach-again').onclick = () => {
    taught = new Set();
    saveTaught();
    setCoaching(true);
    showScreen(rulesReturn);
    render();
  };

  $('btn-coach-ok').onclick = dismissLesson;
  $('btn-coach-off').onclick = () => {
    setCoaching(false);
    lesson = null;
    render();
  };

  $('btn-scrim').onclick = () => {
    const entered = ($('name-input').value || '').trim().slice(0, 16);
    if (entered) rememberName(entered);
    attach(createSoloSession({
      name: entered || 'You',
      target: DEFAULT_TARGET,
      scrim: true,
    }));
  };

  $('btn-learn').onclick = () => {
    const entered = ($('name-input').value || '').trim().slice(0, 16);
    if (entered) rememberName(entered);
    /*
     * Coaching on, but lessons already learned stay learned — come back for a
     * third solo game and it is simply practice. "Turn the coach back on" in
     * the rules screen is what replays the whole curriculum.
     */
    setCoaching(true);
    attach(createSoloSession({
      name: entered || 'You',
      target: DEFAULT_TARGET,
      teaching: true,
    }));
  };

  $('btn-create').onclick = () => {
    rememberName(playerName());
    $('code-display').textContent = '·····';
    $('host-hint').textContent = 'Getting a table ready…';
    $('btn-share').disabled = true;
    $('btn-copy').disabled = true;
    showScreen('screen-host');
    attach(createOnlineHost({ name: playerName(), target: DEFAULT_TARGET }));
  };

  $('btn-host-cancel').onclick = leave;
  $('btn-join-cancel').onclick = leave;
  $('btn-link-home').onclick = leave;
  $('btn-home').onclick = leave;

  $('btn-leave').onclick = () => {
    if (confirm('Leave this game?')) leave();
  };

  $('btn-share').onclick = async () => {
    const url = shareUrl(session.code);
    const text = `Join my game of Franzefuss — code ${session.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Franzefuss', text, url });
        return;
      } catch {
        /* the sheet was dismissed; fall through to the clipboard */
      }
    }
    copy(url);
  };

  $('btn-copy').onclick = () => copy(shareUrl(session.code));

  $('btn-join-screen').onclick = () => {
    $('join-hint').textContent = '';
    $('btn-join').disabled = false;
    showScreen('screen-join');
    ($('join-name').value ? $('code-input') : $('join-name')).focus();
  };

  $('code-input').addEventListener('input', (event) => {
    event.target.value = normaliseCode(event.target.value);
  });
  $('code-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('btn-join').click();
  });

  $('btn-join').onclick = () => {
    const code = normaliseCode($('code-input').value);
    if (code.length !== 5) {
      $('join-hint').textContent = 'A code is five characters.';
      return;
    }
    rememberName(playerName('join-name'));
    $('btn-join').disabled = true;
    $('join-hint').textContent = 'Connecting…';
    attach(createOnlineGuest({ name: playerName('join-name'), code }));
  };

  $('btn-local').onclick = () => {
    const entered = ($('name-input').value || '').trim().slice(0, 16);
    if (entered) rememberName(entered);
    attach(createLocalSession({
      names: [entered || 'Player 1', 'Player 2'],
      target: DEFAULT_TARGET,
    }));
  };

  $('btn-handoff').onclick = () => {
    /* The player taking over gets to see the finished trick too. */
    shownTrick = 0;
    showScreen('screen-table');
    session.resume();
  };

  /* A shared link drops straight onto the join screen with the code filled in. */
  const room = normaliseCode(new URLSearchParams(location.search).get('room') || '');
  if (room.length === 5) {
    $('code-input').value = room;
    showScreen('screen-join');
    $('join-hint').textContent = 'Add your name, then join.';
  }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    $('host-hint').textContent = 'Link copied — send it over.';
  } catch {
    $('host-hint').textContent = text;
  }
}

boot();
