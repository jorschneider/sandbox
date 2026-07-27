/*
 * Screens, rendering and input.
 *
 * This file talks to a session (online host, online guest, or pass-and-play)
 * through one small interface: it receives redacted views and sends intents.
 * It never sees the opponent's cards, because it is never sent them.
 */

import {
  SUIT_SYMBOL, RED_SUITS, RANK_LABEL, suitOf, rankOf, meldName, other, DEFAULT_TARGET,
} from './rules.js';
import { createOnlineHost, createOnlineGuest, createLocalSession, normaliseCode } from './net.js';

const $ = (id) => document.getElementById(id);
const TRICK_HOLD = 1400;
const NAME_KEY = 'franzefuss.name';

let session = null;
let view = null;
let selected = null;

/* The host waits on the lobby with their code until someone actually joins. */
let tableReady = false;

/* Per-deal presentation state, none of which belongs in the shared game state. */
let heldTrick = null;
let heldTimer = null;
let shownTrick = 0;
let meldAcked = false;
let currentDeal = 0;

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

/* Two screens can carry a name field; whichever is on show is the live one. */
function playerName(id = 'name-input') {
  return ($(id).value || '').trim().slice(0, 16) || 'Player';
}

/* --------------------------------------------------------------- cards --- */

function cardEl(card, options = {}) {
  const element = document.createElement('button');
  element.type = 'button';
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

  if (options.onClick) element.addEventListener('click', options.onClick);
  else element.disabled = true;
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
    meldAcked = false;
    selected = null;
    clearTimeout(heldTimer);
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

  renderScoreboard(deal, you, them);
  renderOpponent(deal);
  renderStock(deal);
  renderTrick(deal, you);
  renderHand(deal, you);
  renderBanner(deal, you, them);
  renderOverlays(deal, you, them);
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

  const yourMove = deal.stage === 'play' && deal.turn === you && !heldTrick;
  const legal = new Set(deal.legal);
  if (selected && !deal.hand.includes(selected)) selected = null;

  for (const card of deal.hand) {
    const playable = yourMove && legal.has(card);
    rail.append(
      cardEl(card, {
        trump: deal.trump,
        selected: selected === card,
        illegal: yourMove && !playable,
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
  rob.hidden = !(deal.canRob && !heldTrick);
  rob.onclick = () => {
    selected = null;
    session.send({ type: 'rob' });
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
  banner.classList.remove('waiting');

  if (heldTrick) {
    const winner = heldTrick.winner === you ? 'You take it' : `${view.names[them]} takes it`;
    banner.textContent = `${winner} · ${heldTrick.points} pts`;
    return;
  }

  if (deal.stage === 'over') {
    banner.textContent = 'Deal over';
    return;
  }

  if (deal.stage === 'meld') {
    banner.textContent = 'Declaring melds';
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
  const meld = $('overlay-meld');
  const dealOver = $('overlay-deal');
  const matchOver = $('overlay-match');

  if (view.matchOver) {
    meld.hidden = true;
    dealOver.hidden = true;
    renderMatchOver(you, them);
    return;
  }
  matchOver.hidden = true;

  if (deal.stage === 'meld' || (deal.meldSummary && !meldAcked && deal.stage === 'play')) {
    dealOver.hidden = true;
    renderMeld(deal, you, them);
    return;
  }
  meld.hidden = true;

  if (deal.stage === 'over' && !heldTrick) {
    renderDealOver(deal, you, them);
    return;
  }
  dealOver.hidden = true;
}

function renderMeld(deal, you, them) {
  const overlay = $('overlay-meld');
  const body = $('meld-body');
  const declare = $('btn-declare');
  const pass = $('btn-pass');
  overlay.hidden = false;
  body.replaceChildren();

  /* Phase three: both have chosen, so show who won the contest. */
  if (deal.stage === 'play' && deal.meldSummary) {
    const summary = deal.meldSummary;
    overlay.querySelector('h2').textContent = 'Melds';

    if (!summary.winner) {
      body.append(line('Both players passed. No meld points.'));
    } else {
      for (const seat of [you, them]) {
        const entry = summary.declared[seat];
        const who = seat === you ? 'You' : view.names[seat];
        if (!entry) {
          body.append(line(`${who} passed.`));
          continue;
        }
        body.append(line(`${who}: ${meldName(entry.best)}`));
        const strip = document.createElement('div');
        strip.className = 'meld-cards';
        for (const card of entry.best.cards) {
          strip.append(cardEl(card, { mini: true, trump: deal.trump }));
        }
        body.append(strip);
      }
      const winnerName = summary.winner.player === you ? 'You score' : `${view.names[summary.winner.player]} scores`;
      const verdict = document.createElement('p');
      verdict.className = 'verdict';
      verdict.textContent = `${winnerName} ${summary.winner.total}`;
      body.append(verdict);
    }

    declare.hidden = true;
    pass.hidden = false;
    pass.textContent = 'Play';
    pass.className = 'btn primary';
    pass.onclick = () => {
      meldAcked = true;
      render();
    };
    return;
  }

  /* Phase two: waiting on the other phone. */
  if (deal.meldWaiting) {
    overlay.querySelector('h2').textContent = deal.meldChoice ? 'Declared' : 'Passed';
    body.append(line(`Waiting for ${view.names[them]}…`));
    declare.hidden = true;
    pass.hidden = true;
    return;
  }

  /* Phase one: declare or pass. */
  const offer = deal.meldOffer;
  overlay.querySelector('h2').textContent = 'Declare?';
  declare.className = 'btn primary';
  pass.className = 'btn ghost';

  if (!offer || !offer.best) {
    body.append(line('You have nothing to declare.'));
    declare.hidden = true;
    pass.hidden = false;
    pass.textContent = 'Continue';
    pass.onclick = () => session.send({ type: 'meld', declare: false });
    return;
  }

  body.append(line(`Your best is a ${meldName(offer.best)}.`));
  const strip = document.createElement('div');
  strip.className = 'meld-cards';
  for (const card of offer.best.cards) {
    strip.append(cardEl(card, { mini: true, trump: deal.trump }));
  }
  body.append(strip);
  body.append(
    line(
      offer.count > 1
        ? `Worth ${offer.total} across ${offer.count} combinations — if it beats theirs.`
        : `Worth ${offer.total} — if it beats theirs.`,
    ),
  );

  declare.hidden = false;
  declare.textContent = `Declare for ${offer.total}`;
  declare.onclick = () => session.send({ type: 'meld', declare: true });
  pass.hidden = false;
  pass.textContent = 'Pass';
  pass.onclick = () => session.send({ type: 'meld', declare: false });
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
  table.append(tallyRow('Melds', seats.map((seat) => ({ text: result.meldPoints[seat] }))));
  table.append(tallyRow('Tricks', seats.map((seat) => ({ text: result.tricksWon[seat] }))));
  table.append(tallyRow('Deal', seats.map((seat) => ({
    text: result.totals[seat],
    win: result.totals[seat] > result.totals[other(seat)],
  })), 'total'));
  table.append(tallyRow('Match', seats.map((seat) => ({ text: `${view.scores[seat]}` }))));
  body.append(table);

  const next = $('btn-next');
  const waiting = view.ready[you] && !view.ready[them];
  next.disabled = waiting;
  next.textContent = waiting ? 'Ready' : 'Next deal';
  next.onclick = () => session.send({ type: 'ready' });
  $('next-hint').textContent = waiting ? `Waiting for ${view.names[them]}…` : '';
}

function renderMatchOver(you, them) {
  const overlay = $('overlay-match');
  overlay.hidden = false;
  const winner = view.matchWinner;

  $('match-title').textContent =
    winner === null ? 'Level pegging' : winner === you ? 'You win' : `${view.names[them]} wins`;

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
  clearTimeout(heldTimer);

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
  $('overlay-link').hidden = true;
  $('overlay-meld').hidden = true;
  $('overlay-deal').hidden = true;
  $('overlay-match').hidden = true;
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

  $('btn-rules').onclick = () => showScreen('screen-rules');
  $('btn-rules-back').onclick = () => showScreen('screen-home');

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
