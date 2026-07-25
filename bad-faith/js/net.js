// Bad Faith — transport layer. Two interchangeable transports:
//  - 'mqtt'  : message relay via public MQTT brokers over secure WebSockets.
//              Works anywhere HTTPS works — any carrier/WiFi mix, in-app
//              browsers, hotel networks. No WebRTC, no NAT punching.
//  - 'local' : BroadcastChannel. Same-browser tabs, used for dev/testing
//              (enable with ?local=1).
// The host device is the authority; clients only ever talk to the host.
//
// Topics: bf4/<code>/h        everyone -> host, JSON {cid, msg}
//         bf4/<code>/c/<cid>  host -> one client, JSON msg
//         bf4/<code>/down     host's last-will; tells clients the room died
//
// ?mqtt=<url> overrides the broker list (used by tests with a local broker).

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

const BROKER_OVERRIDE = typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('mqtt') : null;

// Ordered by track record (EMQX's public broker is the most dependable).
// The QR join link pins the host's relay index (&b=N) so scanners go
// straight to the right one; typed-code joiners cycle the list until they
// hear the host.
const BROKERS = BROKER_OVERRIDE ? [BROKER_OVERRIDE] : [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://mqtt.eclipseprojects.io/mqtt', // wss on 443 — survives strict networks
];

const MQTT_OPTS = {
  keepalive: 15,        // fast last-will delivery when a phone vanishes
  connectTimeout: 6000,
  clean: true,
  reconnectPeriod: 1500,
};

export function randomCode(len = 4) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function topicsFor(code) {
  return {
    host: `bf4/${code}/h`,
    client: (cid) => `bf4/${code}/c/${cid}`,
    down: `bf4/${code}/down`,
  };
}

// ---------- host ----------
// handlers: onConnect(cid), onMessage(cid, msg), onDisconnect(cid)
// returns: { ready: Promise<code>, send(cid, msg), close() }

export function createHostTransport({ code, local, handlers }) {
  if (local) return localHost(code, handlers);
  return mqttHost(code, handlers);
}

function mqttHost(code, handlers) {
  const t = topicsFor(code);
  const seen = new Set();
  let client = null, closed = false, brokerIdx = 0;

  const ready = new Promise((resolve, reject) => {
    const tryBroker = (i) => {
      if (closed) return;
      if (i >= BROKERS.length) { reject(new Error('No relay reachable')); return; }
      const c = mqtt.connect(BROKERS[i], { ...MQTT_OPTS, will: { topic: t.down, payload: '{}' } });
      const giveUp = setTimeout(() => { try { c.end(true); } catch { /* dead */ } tryBroker(i + 1); }, 8000);
      c.once('connect', () => {
        clearTimeout(giveUp);
        client = c;
        brokerIdx = i;
        c.subscribe(t.host);
        c.on('message', (topic, buf) => {
          if (topic !== t.host) return;
          let data; try { data = JSON.parse(buf.toString()); } catch { return; }
          const { cid, msg } = data || {};
          if (!cid || !msg) return;
          if (msg.t === '_bye') { if (seen.delete(cid)) handlers.onDisconnect(cid); return; }
          // Any message counts as presence — don't rely on _hello arriving first.
          if (!seen.has(cid)) { seen.add(cid); handlers.onConnect(cid); }
          if (msg.t !== '_hello') handlers.onMessage(cid, msg);
        });
        resolve(code);
      });
      c.on('error', () => { /* pre-connect: giveUp advances; post-connect: mqtt.js reconnects */ });
    };
    tryBroker(0);
  });

  return {
    ready,
    getBroker: () => brokerIdx,
    send(cid, msg) { client?.publish(t.client(cid), JSON.stringify(msg)); },
    close() {
      closed = true;
      try { client?.publish(t.down, '{}'); client?.end(); } catch { /* dead */ }
    },
  };
}

// ---------- client ----------
// handlers: onOpen(), onMessage(msg), onClose(err?)
// onOpen may fire more than once (once per relay attempted) — the app's
// hello is idempotent on the host side.
// returns: { send(msg), close() }

export function createClientTransport({ code, local, broker, handlers }) {
  if (local) return localClient(code, handlers);
  return mqttClient(code, handlers, broker);
}

function mqttClient(code, handlers, startBroker = 0) {
  const cid = 'C' + Math.random().toString(36).slice(2, 10);
  const t = topicsFor(code);
  // Start at the relay the QR pinned (&b=N); cycle from there.
  const start = Math.max(0, Math.min(BROKERS.length - 1, parseInt(startBroker, 10) || 0));
  let active = null, joined = false, closed = false, hop = null, attempt = 0;
  const byePayload = JSON.stringify({ cid, msg: { t: '_bye' } });

  const fail = (err) => {
    if (closed) return;
    closed = true;
    clearTimeout(hop);
    try { active?.end(true); } catch { /* dead */ }
    handlers.onClose(err);
  };

  const tryBroker = () => {
    if (closed || joined) return;
    if (attempt >= BROKERS.length * 2) { fail(new Error('Room not found')); return; }
    const url = BROKERS[(start + attempt) % BROKERS.length];
    attempt++;
    handlers.onStatus?.(attempt, BROKERS.length * 2);
    try { active?.end(true); } catch { /* dead */ }
    const c = mqtt.connect(url, { ...MQTT_OPTS, connectTimeout: 5000, will: { topic: t.host, payload: byePayload } });
    active = c;
    hop = setTimeout(tryBroker, 7000); // heard nothing on this relay; try next
    c.once('connect', () => {
      c.subscribe([t.client(cid), t.down], () => {
        if (closed || active !== c) return;
        c.publish(t.host, JSON.stringify({ cid, msg: { t: '_hello' } }));
        handlers.onOpen(); // app (re)sends its hello
      });
      c.on('message', (topic, buf) => {
        if (topic === t.down) { fail(); return; } // host is gone
        if (topic !== t.client(cid)) return;
        if (!joined) { joined = true; clearTimeout(hop); }
        let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }
        handlers.onMessage(msg);
      });
    });
    c.on('error', () => { /* hop timer advances brokers */ });
  };
  tryBroker();

  return {
    send(msg) { active?.publish(t.host, JSON.stringify({ cid, msg })); },
    close() {
      closed = true;
      clearTimeout(hop);
      try { active?.publish(t.host, byePayload); active?.end(); } catch { /* dead */ }
    },
  };
}

// ---------- local (BroadcastChannel, same browser) ----------

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
