// Bad Faith — bootstrap and host/client wiring.
// URL params:
//   ?join=CODE   prefill join flow (what the QR encodes)
//   ?local=1     BroadcastChannel transport (same-browser tabs, for dev/tests)
//   ?code=XXXX   force a room code (host, local/testing)
//   ?name=X&as=host|join  auto-advance identity screens (testing hooks)

import { Game } from './game.js';
import * as net from './net.js';
import * as ui from './ui.js';

const params = new URLSearchParams(location.search);
const LOCAL = params.get('local') === '1';
const app = document.getElementById('app');

let hostState = null;   // { game, transport, code, pids: Map<cid, pid> }
let clientState = null; // { transport, code }

const actions = {
  send: sendAction,
  showCreate: () => ui.renderIdentity({ mode: 'create', prefillName: params.get('name') }),
  showJoin: () => ui.renderIdentity({ mode: 'join', code: net.normalizeCode(params.get('join')), prefillName: params.get('name') }),
  goHome: () => ui.renderHome(),
  doCreate: (form) => startHost(form),
  doJoin: (form) => startClient(form),
};

ui.init(app, actions);

// ---------- host path ----------

function startHost({ name, avatar, theme }) {
  const code = net.normalizeCode(params.get('code')) || net.randomCode();
  const game = new Game({ theme: theme || params.get('theme') || 'classic' });
  const pids = new Map();
  ui.renderConnecting('Opening the office…');

  const transport = net.createHostTransport({
    code, local: LOCAL,
    handlers: {
      onConnect(cid) {
        // A phone connected; it introduces itself with a hello message.
      },
      onMessage(cid, msg) {
        if (msg.t === 'hello') {
          const res = game.addPlayer(cid, msg.name, msg.avatar, false);
          if (res.error) transport.send(cid, { t: 'reject', reason: res.error });
          else {
            pids.set(cid, cid);
            transport.send(cid, { t: 'welcome', pid: cid });
            broadcast();
          }
        } else if (msg.t === 'action') {
          const res = game.dispatch(cid, msg.action);
          if (res?.error) transport.send(cid, { t: 'err', reason: res.error });
          broadcast();
        }
      },
      onDisconnect(cid) {
        if (game.phase === 'lobby') {
          game.removePlayer(cid); // free the seat; they can rescan and rejoin
        } else {
          game.setConnected(cid, false);
          game.maybeFinishQuotes();
        }
        broadcast();
      },
    },
  });

  transport.ready.then((finalCode) => {
    hostState = { game, transport, code: finalCode, pids };
    game.addPlayer('host', name, avatar, true);
    broadcast();
    // Timer loop: host drives the clock for timed phases.
    setInterval(() => { if (game.tick()) broadcast(); }, 1000);
  }).catch((err) => {
    ui.toast('Could not reach the signaling server. Check your connection.', true);
    console.error(err);
    ui.renderHome();
  });
}

function joinUrl(code) {
  const u = new URL(location.pathname, location.origin);
  u.searchParams.set('join', code);
  if (LOCAL) u.searchParams.set('local', '1');
  return u.toString();
}

function broadcast() {
  const { game, transport, code } = hostState || {};
  if (!game) return;
  for (const p of game.players) {
    if (p.id === 'host') continue;
    transport.send(p.id, { t: 'view', view: game.viewFor(p.id) });
  }
  renderFor(game.viewFor('host'), { code, isHost: true });
}

// ---------- client path ----------

function startClient({ name, avatar, code: rawCode }) {
  const code = net.normalizeCode(rawCode || params.get('join'));
  if (!code || code.length < 4) { ui.toast('Enter the 4-letter room code.'); return; }
  ui.renderConnecting('Finding the office…');
  let welcomed = false;

  const transport = net.createClientTransport({
    code, local: LOCAL,
    handlers: {
      onOpen() { transport.send({ t: 'hello', name, avatar }); },
      onMessage(msg) {
        if (msg.t === 'welcome') { welcomed = true; clientState = { transport, code }; }
        else if (msg.t === 'reject') { ui.toast(msg.reason); ui.renderHome(); transport.close(); }
        else if (msg.t === 'err') { ui.toast(msg.reason); }
        else if (msg.t === 'view') { renderFor(msg.view, { code, isHost: false }); }
      },
      onClose(err) {
        if (welcomed) { ui.toast('Lost the host. The office burned down.', true); }
        else {
          ui.toast('Couldn\'t reach that room. Check the code, make sure the host\'s screen is on, and scan again.', true);
          ui.renderHome();
        }
        if (err) console.error(err);
      },
    },
  });
}

// ---------- shared ----------

function sendAction(action) {
  if (hostState) {
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

// Closing the tab should free the seat immediately, not leave a ghost.
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) clientState?.transport.close();
});

// Same-room games die when phones lock; keep the screen awake (best-effort).
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
  ui.renderHome();
}
