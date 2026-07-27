/*
 * Transports.
 *
 * Two sessions, one interface. `createOnlineHost` / `createOnlineGuest` link two
 * phones over a WebRTC data channel; `createLocalSession` runs both seats on a
 * single phone behind a hand-off curtain. The UI does not care which it has.
 *
 * Signalling uses the public PeerJS broker: it introduces the two phones and
 * then steps out of the way. Card data travels directly between the handsets
 * and is never sent to a server.
 */

import { createTable, dealTeachingHand } from './table.js';
import { canRobTrump, other } from './rules.js';
import { botCard, botDeclares, botRobs } from './bot.js';

const ID_PREFIX = 'fzf5-';
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I
const CODE_LENGTH = 5;
const OPEN_TIMEOUT = 20000;
const JOIN_TIMEOUT = 12000;
const REJOIN_DELAYS = [1000, 2000, 3000, 5000, 8000];
const PING_INTERVAL = 3000;
const REVEAL_PAUSE = 1600;
const BOT_PAUSE = 850;
const LIVENESS_TIMEOUT = 10000;

/*
 * A phone that locks its screen or changes network drops the data channel
 * without any close event, so each side watches for a silent death and the
 * returning player is recognised by a token rather than turned away as a
 * third player.
 */
function rejoinToken(code) {
  const key = `franzefuss.token.${code}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const minted = randomCode() + randomCode();
    localStorage.setItem(key, minted);
    return minted;
  } catch {
    return randomCode() + randomCode();
  }
}

export function randomCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function normaliseCode(input) {
  return (input || '')
    .toUpperCase()
    .split('')
    .filter((character) => CODE_ALPHABET.includes(character))
    .join('')
    .slice(0, CODE_LENGTH);
}

const peerId = (code) => ID_PREFIX + code;

/*
 * Sessions start emitting before the screen has had a chance to subscribe, so
 * the latest state and status are replayed to every new listener.
 */
function emitter() {
  const listeners = { state: [], status: [], handoff: [] };
  const latest = {};
  return {
    on(name, callback) {
      listeners[name].push(callback);
      if (name in latest) callback(latest[name]);
    },
    emit(name, payload) {
      if (name !== 'handoff') latest[name] = payload;
      listeners[name].forEach((callback) => callback(payload));
    },
  };
}

/*
 * Signalling goes through the public PeerJS broker unless a self-hosted one is
 * named on window.FRANZEFUSS_PEER before this module loads.
 */
const PEER_OPTIONS = { debug: 0, ...(window.FRANZEFUSS_PEER || {}) };

function newPeer(id) {
  /* PeerJS ships as a UMD bundle, so it arrives on the window. */
  return id ? new window.Peer(id, PEER_OPTIONS) : new window.Peer(PEER_OPTIONS);
}

/* --------------------------------------------------------------- online --- */

export function createOnlineHost({ name, target }) {
  const events = emitter();
  const session = {
    mode: 'host',
    seat: 0,
    code: null,
    on: events.on,
    send: (action) => table.apply(0, action),
    close: () => teardown(),
  };

  let peer = null;
  let connection = null;
  let latestGuestView = null;
  let attempts = 0;
  let closed = false;
  let openTimer = null;
  let heartbeat = null;
  let lastSeen = 0;
  let guestToken = null;

  const table = createTable({
    names: [name || 'Player 1', 'Player 2'],
    target,
    onViews: (views) => {
      latestGuestView = views[1];
      events.emit('state', views[0]);
      if (connection && connection.open) connection.send({ t: 'view', view: views[1] });
    },
  });

  function teardown() {
    closed = true;
    clearTimeout(openTimer);
    clearInterval(heartbeat);
    if (connection) connection.close();
    if (peer) peer.destroy();
  }

  /* Let go of a link, quietly when a replacement has already arrived. */
  function drop(announce) {
    clearInterval(heartbeat);
    heartbeat = null;
    const dead = connection;
    connection = null;
    if (dead) {
      try {
        dead.close();
      } catch {
        /* already gone */
      }
    }
    if (announce && !closed) events.emit('status', { state: 'lost', code: session.code });
  }

  function watch() {
    clearInterval(heartbeat);
    lastSeen = Date.now();
    heartbeat = setInterval(() => {
      if (closed || !connection) return;
      if (Date.now() - lastSeen > LIVENESS_TIMEOUT) {
        drop(true);
        return;
      }
      try {
        if (connection.open) connection.send({ t: 'ping' });
      } catch {
        drop(true);
      }
    }, PING_INTERVAL);
  }

  function host() {
    if (closed) return;
    clearTimeout(openTimer);
    session.code = randomCode();
    peer = newPeer(peerId(session.code));

    openTimer = setTimeout(() => {
      if (closed || (peer && peer.open)) return;
      events.emit('status', {
        state: 'error',
        message: 'Could not reach the matchmaking service. Check your connection, or use Pass & play on one phone.',
      });
    }, OPEN_TIMEOUT);

    peer.on('open', () => {
      clearTimeout(openTimer);
      events.emit('status', { state: 'waiting', code: session.code });
    });

    peer.on('connection', (incoming) => {
      const token = (incoming.metadata && incoming.metadata.token) || null;
      const returning = token !== null && token === guestToken;

      /* One guest at a time — but the player coming back is not a third one. */
      if (connection && connection.open && !returning) {
        incoming.on('open', () => {
          incoming.send({ t: 'busy' });
          setTimeout(() => incoming.close(), 250);
        });
        return;
      }

      if (connection) drop(false);
      connection = incoming;
      guestToken = token;

      incoming.on('open', () => {
        if (connection !== incoming) return;
        incoming.send({ t: 'hello', seat: 1 });
        if (latestGuestView) incoming.send({ t: 'view', view: latestGuestView });
        watch();
        events.emit('status', { state: 'connected', code: session.code });
      });

      incoming.on('data', (message) => {
        if (!message || typeof message !== 'object' || connection !== incoming) return;
        lastSeen = Date.now();
        if (message.t === 'pong') return;
        if (message.t === 'action') table.apply(1, message.action);
        if (message.t === 'name') table.apply(1, { type: 'name', name: message.name });
      });

      incoming.on('close', () => {
        if (closed || connection !== incoming) return;
        drop(true);
      });

      incoming.on('error', () => {});
    });

    peer.on('disconnected', () => {
      if (!closed) peer.reconnect();
    });

    peer.on('error', (error) => {
      if (closed) return;
      if (error.type === 'unavailable-id' && attempts++ < 5) {
        peer.destroy();
        host();
        return;
      }
      if (error.type === 'peer-unavailable') return;
      clearTimeout(openTimer);
      events.emit('status', {
        state: 'error',
        message: describe(error),
      });
    });
  }

  events.emit('status', { state: 'starting' });
  host();
  table.broadcast();
  return session;
}

export function createOnlineGuest({ name, code }) {
  const events = emitter();
  const session = {
    mode: 'guest',
    seat: 1,
    code,
    on: events.on,
    send: (action) => {
      if (connection && connection.open) connection.send({ t: 'action', action });
    },
    close: () => teardown(),
  };

  let peer = null;
  let connection = null;
  let closed = false;
  let rejoins = 0;
  let openTimer = null;
  let watchdog = null;
  let lastSeen = 0;
  let everConnected = false;
  const token = rejoinToken(code);

  function teardown() {
    closed = true;
    clearTimeout(openTimer);
    clearInterval(watchdog);
    if (connection) connection.close();
    if (peer) peer.destroy();
  }

  function drop() {
    clearInterval(watchdog);
    watchdog = null;
    const dead = connection;
    connection = null;
    if (dead) {
      try {
        dead.close();
      } catch {
        /* already gone */
      }
    }
    if (closed) return;
    if (everConnected) events.emit('status', { state: 'lost', code });
    rejoin();
  }

  function watch() {
    clearInterval(watchdog);
    lastSeen = Date.now();
    watchdog = setInterval(() => {
      if (closed || !connection) return;
      if (Date.now() - lastSeen > LIVENESS_TIMEOUT) drop();
    }, PING_INTERVAL);
  }

  function attach(outgoing) {
    connection = outgoing;

    outgoing.on('open', () => {
      rejoins = 0;
      everConnected = true;
      clearTimeout(openTimer);
      outgoing.send({ t: 'name', name: name || 'Player 2' });
      watch();
      events.emit('status', { state: 'connected', code });
    });

    outgoing.on('data', (message) => {
      if (!message || typeof message !== 'object' || connection !== outgoing) return;
      lastSeen = Date.now();

      if (message.t === 'ping') {
        try {
          outgoing.send({ t: 'pong' });
        } catch {
          /* the next watchdog tick will notice */
        }
        return;
      }
      if (message.t === 'view') events.emit('state', message.view);
      if (message.t === 'busy') {
        /* The seat may just be held by a link that has not been reaped yet. */
        if (rejoins < REJOIN_DELAYS.length) {
          events.emit('status', { state: 'lost', code });
          connection = null;
          rejoin();
          return;
        }
        events.emit('status', {
          state: 'error',
          message: 'That game already has two players.',
        });
        teardown();
      }
    });

    outgoing.on('close', () => {
      if (closed || connection !== outgoing) return;
      drop();
    });

    outgoing.on('error', () => {});
  }

  function rejoin() {
    if (closed || rejoins >= REJOIN_DELAYS.length) {
      if (!closed) {
        events.emit('status', {
          state: 'error',
          message: 'Lost the connection and could not get it back. Ask for a fresh code.',
        });
      }
      return;
    }
    const delay = REJOIN_DELAYS[rejoins++];
    setTimeout(() => {
      if (closed || !peer || peer.destroyed) return;
      attach(peer.connect(peerId(code), { reliable: true, metadata: { token } }));
    }, delay);
  }

  events.emit('status', { state: 'joining', code });
  peer = newPeer(null);

  /* Runs until the data channel is actually open, not merely the broker link. */
  openTimer = setTimeout(() => {
    if (closed || everConnected) return;
    events.emit('status', {
      state: 'error',
      message: `No answer from game ${code}. Check the code, and that the other phone still has the room open.`,
    });
    teardown();
  }, JOIN_TIMEOUT);

  peer.on('open', () => {
    attach(peer.connect(peerId(code), { reliable: true, metadata: { token } }));
  });

  peer.on('disconnected', () => {
    if (!closed) peer.reconnect();
  });

  peer.on('error', (error) => {
    if (closed) return;
    if (error.type === 'peer-unavailable') {
      /* Mid-game this is usually the other phone blinking, so keep trying. */
      if (everConnected && rejoins < REJOIN_DELAYS.length) {
        rejoin();
        return;
      }
      clearTimeout(openTimer);
      events.emit('status', {
        state: 'error',
        message: everConnected
          ? 'The other phone has left the game.'
          : `No open game with code ${code}. Check the code, and that the other phone still has the room open.`,
      });
      teardown();
      return;
    }
    clearTimeout(openTimer);
    events.emit('status', { state: 'error', message: describe(error) });
  });

  return session;
}

function describe(error) {
  switch (error && error.type) {
    case 'browser-incompatible':
      return 'This browser cannot make a peer-to-peer connection. Try Safari or Chrome, or use Pass & play.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Lost contact with the matchmaking service. Check your connection and try again.';
    case 'ssl-unavailable':
      return 'This page must be served over HTTPS to connect two phones.';
    case 'webrtc':
      return 'The two phones could not open a direct link. The same Wi-Fi usually fixes it — or use Pass & play.';
    default:
      return (error && error.message) || 'Something went wrong setting up the game.';
  }
}

/* ----------------------------------------------------------------- solo --- */

/*
 * One player against the practice opponent, for learning the game before
 * sitting down opposite somebody. Seat 0 is the learner and is the only seat
 * ever rendered; seat 1 thinks for a beat so the table feels inhabited.
 */
export function createSoloSession({ name, target, teaching = false }) {
  const events = emitter();
  let timer = null;
  let closed = false;
  let guard = 0;

  const table = createTable({
    names: [name || 'You', 'Fuss'],
    target,
    firstDealer: 1,
    onViews: (views) => {
      events.emit('state', views[0]);
      think();
    },
  });

  if (teaching) dealTeachingHand(table.match);

  const schedule = (move) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!closed) move();
    }, BOT_PAUSE);
  };

  /* One action per turn of the loop; applying it broadcasts and calls back in. */
  function think() {
    if (closed || guard++ > 500) return;
    const match = table.match;
    const deal = match.deal;
    if (!deal || match.over) return;

    if (deal.stage === 'meld' && deal.meldChoice[1] === null) {
      schedule(() => table.apply(1, { type: 'meld', declare: botDeclares(deal, 1) }));
      return;
    }

    if (deal.stage === 'play' && deal.turn === 1) {
      if (canRobTrump(deal, 1) && botRobs(deal, 1)) {
        schedule(() => table.apply(1, { type: 'rob' }));
        return;
      }
      schedule(() => table.apply(1, { type: 'play', card: botCard(deal, 1) }));
      return;
    }

    if (deal.stage === 'over' && !match.over && !match.ready[1]) {
      schedule(() => table.apply(1, { type: 'ready' }));
    }
  }

  const session = {
    mode: 'solo',
    seat: 0,
    on: events.on,
    send: (action) => {
      guard = 0;
      table.apply(0, action);
    },
    close: () => {
      closed = true;
      clearTimeout(timer);
    },
  };

  events.emit('status', { state: 'connected' });
  table.broadcast();
  return session;
}

/* ---------------------------------------------------------------- local --- */

/*
 * Both seats share one handset. Whenever the seat on show changes we raise a
 * curtain first, so nobody catches sight of the other hand on the way past.
 */
export function createLocalSession({ names, target }) {
  const events = emitter();
  let shown = null;
  let pending = null;

  /* Seat 0 is whoever set the game up, so let them lead the first deal. */
  const table = createTable({
    names,
    target,
    firstDealer: 1,
    onViews: (views) => present(views),
  });

  function seatOnTurn(match) {
    const deal = match.deal;
    if (!deal || match.over || deal.stage === 'over') return null;
    if (deal.stage === 'meld') {
      return deal.meldChoice[deal.elder] === null ? deal.elder : other(deal.elder);
    }
    return deal.turn;
  }

  function raiseCurtain(next) {
    pending = next;
    events.emit('handoff', { seat: next, name: table.match.names[next] });
  }

  function present(views) {
    const next = seatOnTurn(table.match);

    /* Shared screens — results, match over — are safe for both to look at. */
    if (next === null) {
      shown = null;
      pending = null;
      events.emit('state', views[0]);
      return;
    }

    if (shown === null || shown === next) {
      shown = next;
      events.emit('state', views[next]);
      return;
    }

    /*
     * The phone is about to change hands. If a trick just finished, let the
     * player still holding it see who took it before the curtain comes down —
     * the one taking over gets the same look once they tap through.
     */
    const deal = table.match.deal;
    if (deal && deal.lastTrick && deal.lastTrick.number === deal.trickNumber - 1) {
      const outgoing = shown;
      events.emit('state', views[outgoing]);
      setTimeout(() => {
        if (shown === outgoing && pending === null) raiseCurtain(next);
      }, REVEAL_PAUSE);
      return;
    }

    raiseCurtain(next);
  }

  const session = {
    mode: 'local',
    get seat() {
      return shown;
    },
    on: events.on,
    send: (action) => {
      const seat = shown === null ? 0 : shown;
      table.apply(seat, action.type === 'ready' ? { ...action, both: true } : action);
    },
    resume: () => {
      if (pending === null) return;
      shown = pending;
      pending = null;
      table.broadcast();
    },
    close: () => {},
  };

  events.emit('status', { state: 'connected' });
  table.broadcast();
  return session;
}
