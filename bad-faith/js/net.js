// Bad Faith — transport layer. Two interchangeable transports:
//  - 'peer'  : PeerJS/WebRTC via the free public PeerServer. Real phones.
//  - 'local' : BroadcastChannel. Same-browser tabs, used for dev/testing
//              (enable with ?local=1).
// The host device is the authority; clients only ever talk to the host.

const PEER_PREFIX = 'badfaith-aid-';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

// STUN alone fails when phones sit on different networks (one on WiFi, one
// on cellular behind carrier NAT) — include public TURN relays as fallback.
const ICE_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
      username: 'openrelayproject', credential: 'openrelayproject',
    },
  ],
};

export function randomCode(len = 4) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

// ---------- host ----------
// handlers: onConnect(cid), onMessage(cid, msg), onDisconnect(cid)
// returns: { send(cid, msg), close() }

export function createHostTransport({ code, local, handlers }) {
  if (local) return localHost(code, handlers);
  return peerHost(code, handlers);
}

function localHost(code, handlers) {
  const ch = new BroadcastChannel('badfaith-' + code);
  ch.onmessage = (ev) => {
    const { dir, cid, msg } = ev.data || {};
    if (dir !== 'c2h') return;
    if (msg?.t === '_hello') handlers.onConnect(cid);
    else if (msg?.t === '_bye') handlers.onDisconnect(cid);
    else handlers.onMessage(cid, msg);
  };
  return {
    ready: Promise.resolve(code),
    send(cid, msg) { ch.postMessage({ dir: 'h2c', cid, msg }); },
    close() { ch.close(); },
  };
}

function peerHost(code, handlers) {
  const conns = new Map();
  let peer;
  const ready = new Promise((resolve, reject) => {
    const attempt = (tries) => {
      peer = new Peer(PEER_PREFIX + code, { debug: 1, config: ICE_CONFIG });
      peer.on('open', () => resolve(code));
      // If the signaling socket drops (phone briefly backgrounded, network
      // blip), re-register the room id so later joiners can still find us.
      peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* destroyed */ } });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && tries > 0) {
          code = randomCode();
          attempt(tries - 1);
        } else if (['browser-incompatible', 'invalid-id', 'invalid-key', 'ssl-unavailable'].includes(err.type)) {
          reject(err);
        } // other errors (network, peer-unavailable, webrtc) are transient
          // or per-connection; keep the room alive.
      });
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          conns.set(conn.peer, conn);
          handlers.onConnect(conn.peer);
        });
        conn.on('data', (msg) => handlers.onMessage(conn.peer, msg));
        conn.on('close', () => {
          conns.delete(conn.peer);
          handlers.onDisconnect(conn.peer);
        });
      });
    };
    attempt(5);
  });
  return {
    ready,
    send(cid, msg) { conns.get(cid)?.send(msg); },
    close() { peer?.destroy(); },
  };
}

// ---------- client ----------
// handlers: onOpen(), onMessage(msg), onClose(err?)
// returns: { send(msg), close() }

export function createClientTransport({ code, local, handlers }) {
  if (local) return localClient(code, handlers);
  return peerClient(code, handlers);
}

function localClient(code, handlers) {
  const cid = 'L' + Math.random().toString(36).slice(2, 10);
  const ch = new BroadcastChannel('badfaith-' + code);
  ch.onmessage = (ev) => {
    const { dir, cid: target, msg } = ev.data || {};
    if (dir === 'h2c' && target === cid) handlers.onMessage(msg);
  };
  // Give the channel a beat, then announce ourselves.
  setTimeout(() => {
    ch.postMessage({ dir: 'c2h', cid, msg: { t: '_hello' } });
    handlers.onOpen();
  }, 50);
  return {
    send(msg) { ch.postMessage({ dir: 'c2h', cid, msg }); },
    close() { ch.postMessage({ dir: 'c2h', cid, msg: { t: '_bye' } }); ch.close(); },
  };
}

function peerClient(code, handlers) {
  // Mobile networks are flaky: a transient signaling error or a slow WebRTC
  // handshake must not dump the player back to the home screen. Retry the
  // whole connect a few times with backoff before reporting failure.
  const MAX_TRIES = 4;
  let peer = null, conn = null, joined = false, closed = false, timer = null;

  const fail = (err) => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    try { peer?.destroy(); } catch { /* already dead */ }
    handlers.onClose(err);
  };

  const retry = (tryNo, err) => {
    if (closed || joined) return;
    clearTimeout(timer);
    try { peer?.destroy(); } catch { /* already dead */ }
    peer = null; conn = null;
    if (tryNo >= MAX_TRIES) { fail(err); return; }
    setTimeout(() => attempt(tryNo + 1), 700 * Math.pow(2, tryNo - 1));
  };

  const attempt = (tryNo) => {
    if (closed) return;
    peer = new Peer({ debug: 1, config: ICE_CONFIG });
    timer = setTimeout(() => retry(tryNo, { type: 'timeout' }), 9000);
    peer.on('open', () => {
      conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      conn.on('open', () => {
        clearTimeout(timer);
        joined = true;
        handlers.onOpen();
      });
      conn.on('data', (msg) => handlers.onMessage(msg));
      conn.on('close', () => { if (joined) fail(); });
    });
    peer.on('disconnected', () => {
      if (joined) { try { peer.reconnect(); } catch { /* destroyed */ } }
    });
    peer.on('error', (err) => {
      const fatal = ['browser-incompatible', 'invalid-id', 'invalid-key', 'ssl-unavailable'].includes(err.type);
      if (fatal) { fail(err); return; }
      if (joined) {
        // Post-join blips: the signaling socket may drop without affecting
        // the data channel; try to re-register quietly.
        if (err.type === 'network') { try { peer.reconnect(); } catch { /* destroyed */ } }
        return;
      }
      retry(tryNo, err); // peer-unavailable, network, webrtc, ...
    });
  };

  attempt(1);
  return {
    send(msg) { if (joined && !closed) conn?.send(msg); },
    close() { closed = true; clearTimeout(timer); try { peer?.destroy(); } catch { /* already dead */ } },
  };
}
