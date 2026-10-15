// Bad Faith — bootstrap and host/client wiring.
//
// Identity: a phone's game identity (`pid`) is decoupled from its connection
// id (`cid`). The device keeps a stable key in localStorage, so a reload,
// a locked screen, or a network blip mid-game rebinds to the same seat
// instead of locking the player out. The host mirrors the same idea: it
// snapshots the game so a host reload can resume the room.
//
// URL params:
//   ?join=CODE   prefill join flow (what the QR encodes)
//   ?local=1     BroadcastChannel transport (same-browser tabs, for dev/tests)
//   ?code=XXXX   force a room code (host, local/testing)
//   ?name=X&as=host|join  auto-advance identity screens (testing hooks)
//   ?fresh=1     ignore any resumable host snapshot (tests)

import { Game } from './game.js';
import { APP_VERSION } from './content.js';
import * as net from './net.js';
import * as ui from './ui.js';

const params = new URLSearchParams(location.search);
const LOCAL = params.get('local') === '1';
const app = document.getElementById('app');
const SNAP_KEY = 'bf-host-snapshot';
const SNAP_TTL = 3 * 60 * 60 * 1000; // a room is resumable for three hours

let hostState = null;   // { game, transport, code, cidToPid, pidToCid }
let clientState = null; // { transport, code, identity, rejoin }

// ---------- device identity ----------

function store(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
function load(k) { try { return localStorage.getItem(k); } catch { return null; } }

// Seat identity lives in sessionStorage, not localStorage: it survives a
// reload, a locked screen and a discarded-then-restored tab (the cases that
// lock players out), while still giving separate tabs separate seats so
// several players can share one browser.
function deviceKey() {
  let k = null;
  try { k = sessionStorage.getItem('bf-seat-key'); } catch { /* private mode */ }
  if (!k) {
    k = 'k' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { sessionStorage.setItem('bf-seat-key', k); } catch { /* fine */ }
  }
  return k;
}

// ---------- host snapshot ----------

function saveSnapshot() {
  if (!hostState) return;
  const { game, code } = hostState;
  if (game.phase === 'lobby' || game.phase === 'results') { clearSnapshot(); return; }
  store(SNAP_KEY, JSON.stringify({ at: Date.now(), code, game: game.toJSON() }));
}
function clearSnapshot() { try { localStorage.removeItem(SNAP_KEY); } catch { /* fine */ } }
function readSnapshot() {
  if (params.get('fresh') === '1') return null;
  try {
    const raw = load(SNAP_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap?.game || Date.now() - snap.at > SNAP_TTL) { clearSnapshot(); return null; }
    return snap;
  } catch { return null; }
}

const actions = {
  send: sendAction,
  showCreate: () => ui.renderIdentity({ mode: 'create', prefillName: params.get('name') }),
  showJoin: () => ui.renderIdentity({ mode: 'join', code: net.normalizeCode(params.get('join')), prefillName: params.get('name') }),
  goHome: () => ui.renderHome(readSnapshot()),
  doCreate: (form) => startHost(form),
  doJoin: (form) => startClient(form),
  resume: () => resumeHost(),
  discardResume: () => { clearSnapshot(); ui.renderHome(null); },
};

ui.init(app, actions);

// ---------- host ----------

function runHost(game, code, hostIdentity) {
  const cidToPid = new Map();
  const pidToCid = new Map();
  let seq = game.players.length; // resumed games already hold seats
  ui.renderConnecting('Opening the office…');

  const transport = net.createHostTransport({
    code, local: LOCAL,
    handlers: {
      onConnect() { /* the phone introduces itself with a hello */ },
      onMessage(cid, msg) {
        if (msg.t === 'hello') {
          const key = String(msg.key || '').slice(0, 80);
          // Known device? Rebind it to its existing seat, whatever the phase.
          const existing = game.byKey(key);
          if (existing) {
            const stale = pidToCid.get(existing.id);
            if (stale && stale !== cid) cidToPid.delete(stale);
            cidToPid.set(cid, existing.id);
            pidToCid.set(existing.id, cid);
            const wasAway = !existing.connected;
            game.setConnected(existing.id, true);
            transport.send(cid, { t: 'welcome', pid: existing.id });
            if (wasAway && game.phase !== 'lobby') {
              game.addLog(`${existing.avatar} ${existing.name} is back at the desk.`);
            }
            broadcast();
            return;
          }
          const pid = 'p' + (++seq);
          const res = game.addPlayer(pid, msg.name, msg.avatar, false, key);
          if (res.error) { transport.send(cid, { t: 'reject', reason: res.error }); return; }
          cidToPid.set(cid, pid);
          pidToCid.set(pid, cid);
          transport.send(cid, { t: 'welcome', pid });
          broadcast();
        } else if (msg.t === 'action') {
          const pid = cidToPid.get(cid);
          if (!pid) { transport.send(cid, { t: 'err', reason: 'Reconnecting…' }); return; }
          const res = game.dispatch(pid, msg.action);
          if (res?.error) transport.send(cid, { t: 'err', reason: res.error });
          broadcast();
        }
      },
      onDisconnect(cid) {
        const pid = cidToPid.get(cid);
        cidToPid.delete(cid);
        if (!pid || pidToCid.get(pid) !== cid) return; // an older socket died
        pidToCid.delete(pid);
        if (game.phase === 'lobby') {
          game.removePlayer(pid); // free the seat; they can rescan
        } else {
          // Mid-game they keep their seat and their money — they may be back.
          game.setConnected(pid, false);
          game.maybeFinishQuotes();
          game.maybeFinishMMQuotes();
        }
        broadcast();
      },
    },
  });

  transport.ready.then((finalCode) => {
    hostState = { game, transport, code: finalCode, cidToPid, pidToCid };
    if (hostIdentity) game.addPlayer('host', hostIdentity.name, hostIdentity.avatar, true, deviceKey());
    else { const h = game.byId('host'); if (h) h.connected = true; } // resumed
    broadcast();
    setInterval(() => { if (game.tick()) broadcast(); }, 1000);
  }).catch((err) => {
    ui.toast('Could not reach the relay. Check your connection.', true);
    console.error(err);
    ui.renderHome(readSnapshot());
  });
}

function startHost({ name, avatar, theme, gameMode, ruleset }) {
  const code = net.normalizeCode(params.get('code')) || net.randomCode();
  const game = new Game({
    theme: theme || params.get('theme') || 'classic',
    mode: gameMode || params.get('gm') || 'market',
    ruleset: ruleset || params.get('rules') || 'rookie',
  });
  clearSnapshot();
  runHost(game, code, { name, avatar });
}

function resumeHost() {
  const snap = readSnapshot();
  if (!snap) { ui.toast('That room has expired.'); ui.renderHome(null); return; }
  runHost(Game.fromJSON(snap.game), snap.code, null);
  ui.toast('Room restored — phones will reconnect themselves.', false);
}

function joinUrl(code) {
  const u = new URL(location.pathname, location.origin);
  u.searchParams.set('join', code);
  if (LOCAL) u.searchParams.set('local', '1');
  const b = hostState?.transport?.getBroker?.();
  if (b) u.searchParams.set('b', String(b));
  const override = params.get('mqtt');
  if (override) u.searchParams.set('mqtt', override);
  return u.toString();
}

function broadcast() {
  if (!hostState?.game) return;
  const { game, transport, code, pidToCid } = hostState;
  for (const p of game.players) {
    if (p.id === 'host') continue;
    const cid = pidToCid.get(p.id);
    if (cid) transport.send(cid, { t: 'view', view: game.viewFor(p.id) });
  }
  saveSnapshot();
  renderFor(game.viewFor('host'), { code, isHost: true });
}

// ---------- client ----------

function startClient({ name, avatar, code: rawCode }) {
  const code = net.normalizeCode(rawCode || params.get('join'));
  if (!code || code.length < 4) { ui.toast('Enter the 4-letter room code.'); return; }
  ui.renderConnecting('Finding the office…');
  const identity = { name, avatar, key: deviceKey() };
  let welcomed = false, rejoin = null, hostGoneAt = 0;

  const stopRejoin = () => { if (rejoin) { clearInterval(rejoin); rejoin = null; } };

  const transport = net.createClientTransport({
    code, local: LOCAL, broker: params.get('b'),
    handlers: {
      onOpen() { transport.send({ t: 'hello', ...identity }); },
      onStatus(attempt, total) {
        if (!welcomed && attempt > 1) ui.renderConnecting(`Calling the relay office (${attempt}/${total})…`);
      },
      onMessage(msg) {
        if (msg.t === 'welcome') {
          welcomed = true;
          stopRejoin();
          clientState = { transport, code, identity };
        } else if (msg.t === 'reject') { ui.toast(msg.reason); ui.renderHome(readSnapshot()); transport.close(); }
        else if (msg.t === 'err') { ui.toast(msg.reason); }
        else if (msg.t === 'view') { stopRejoin(); renderFor(msg.view, { code, isHost: false }); }
      },
      // The host may just be reloading: keep knocking before giving up.
      onHostGone() {
        if (rejoin) return;
        hostGoneAt = Date.now();
        ui.toast('Host dropped — holding your seat…', true);
        rejoin = setInterval(() => {
          if (Date.now() - hostGoneAt > 90000) {
            stopRejoin();
            ui.toast('The host never came back. The office really did burn down.', true);
            return;
          }
          transport.send({ t: 'hello', ...identity });
        }, 3000);
      },
      onClose(err) {
        stopRejoin();
        if (welcomed) ui.toast('Lost the connection. Reload to take your seat back.', true);
        else {
          ui.toast(`Couldn't find that room. Have the host reload (lobby should say ${APP_VERSION}) and scan the fresh QR.`, true);
          ui.renderHome(readSnapshot());
        }
        if (err) console.error(err);
      },
    },
  });
}

// ---------- shared ----------

function sendAction(action) {
  if (hostState?.game) {
    const res = hostState.game.dispatch('host', action);
    if (res?.error) ui.toast(res.error);
    broadcast();
  } else if (clientState) {
    clientState.transport.send({ t: 'action', action });
  }
}

function renderFor(view, { code, isHost }) {
  if (view.phase === 'lobby') ui.renderLobby(view, { code, isHost, joinUrl: joinUrl(code) });
  else ui.render(view);
}

// Say goodbye properly on the way out: a host announces the room is down
// (so phones start looking for it again rather than sitting dead), and a
// player releases their lobby seat. Mid-game seats are held for a return.
window.addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  try {
    if (hostState?.transport) hostState.transport.close();
    else clientState?.transport.close();
  } catch { /* the page is going away anyway */ }
});

async function keepAwake() {
  try { await navigator.wakeLock?.request('screen'); } catch { /* not granted; fine */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
document.addEventListener('click', function once() {
  keepAwake();
  document.removeEventListener('click', once);
});

// ---------- boot ----------

const auto = params.get('as');
if (auto === 'host' && params.get('name')) {
  startHost({ name: params.get('name'), avatar: params.get('avatar') || '🦊' });
} else if ((auto === 'join' || params.get('join')) && params.get('name')) {
  startClient({ name: params.get('name'), avatar: params.get('avatar') || '🦉', code: params.get('join') });
} else if (params.get('join')) {
  actions.showJoin();
} else {
  ui.renderHome(readSnapshot());
}
