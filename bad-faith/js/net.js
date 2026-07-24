// Bad Faith — transport layer. Two interchangeable transports:
//  - 'peer'  : PeerJS/WebRTC via the free public PeerServer. Real phones.
//  - 'local' : BroadcastChannel. Same-browser tabs, used for dev/testing
//              (enable with ?local=1).
// The host device is the authority; clients only ever talk to the host.

const PEER_PREFIX = 'badfaith-aid-';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

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
      peer = new Peer(PEER_PREFIX + code, { debug: 1 });
      peer.on('open', () => resolve(code));
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && tries > 0) {
          code = randomCode();
          attempt(tries - 1);
        } else reject(err);
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
  const peer = new Peer({ debug: 1 });
  let conn = null;
  peer.on('open', () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    conn.on('open', () => handlers.onOpen());
    conn.on('data', (msg) => handlers.onMessage(msg));
    conn.on('close', () => handlers.onClose());
  });
  peer.on('error', (err) => handlers.onClose(err));
  return {
    send(msg) { conn?.send(msg); },
    close() { peer.destroy(); },
  };
}
