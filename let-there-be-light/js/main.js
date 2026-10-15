import * as THREE from 'three';
import { createWorld } from './acts.js';
import { initInput } from './voice.js';
import { createChoir } from './audio.js';
import { createPost } from './render/post.js';
import * as atmos from './render/atmos.js';

// ------------------------------------------------------------------ boot

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.setSize(innerWidth, innerHeight);
// tone mapping happens in the composite, after bloom is gathered in linear light
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const post = createPost(renderer);
post.configure({
  bloom: 0.85, threshold: 0.7, exposure: 1.0, vignette: 0.46,
  aberration: 0.0018, saturation: 1.1, contrast: 1.06,
  lift: [0.01, 0.012, 0.03], gain: [1.03, 1.0, 0.97],
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 2000);
camera.rotation.order = 'YXZ';

const world = createWorld(scene, renderer);
const choir = createChoir();
const ACT_IDS = Object.keys(world.ACTS);

const SAVE_KEY = 'ltbl-creation-v1';

// ------------------------------------------------------------------ HUD

const $ = (id) => document.getElementById(id);
const verseEl = $('verse');
const micEl = $('mic');
const hintEl = $('hint');
const chronicleEl = $('chronicle');
const dayEl = $('day');
let verseTimer = 0;

function say(html, cls = '') {
  verseEl.className = 'show ' + cls;
  verseEl.innerHTML = html;
  clearTimeout(verseTimer);
  verseTimer = setTimeout(() => { verseEl.className = ''; },
    cls === 'hint' || cls === 'interim' ? 3000 : 5200);
}

function refreshChronicle() {
  const rows = [];
  let day = 0;
  for (const id of ACT_IDS) {
    if (!world.made.has(id)) continue;
    const a = world.ACTS[id];
    if (a.day > day) day = a.day;
    rows.push(`<li>${a.title}</li>`);
  }
  chronicleEl.innerHTML = rows.length
    ? `<div class="ch-title">what is made</div><ul>${rows.join('')}</ul>`
    : '';
  dayEl.textContent = day ? `day ${day}` : '';
  dayEl.classList.toggle('show', day > 0);
  save();
}

// ------------------------------------------------------------------ decrees

// "let there be light" / "let the earth bring forth trees" / just "trees"
const RE_REST = /\b(?:let there be rest|it is finished|and it was good|i rest|behold)\b/;
const RE_DAWN = /\b(?:let there be (?:day|morning|dawn)|let the (?:day|morning) (?:come|return)|dawn)\b/;
const RE_UNMAKE = /\b(?:begin again|start over|unmake|let there be nothing|return to the void)\b/;
const RE_SHARE = /\b(?:share (?:this|my)? ?(?:world|creation)|give me a link|copy (?:this|the) world)\b/;
const RE_STOPRAIN = /\b(?:stop the rain|no more rain|let the rain cease)\b/;

function normalize(t) {
  return t.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function findAct(norm) {
  let best = null;
  for (const id of ACT_IDS) {
    for (const w of world.ACTS[id].words) {
      const re = new RegExp(`(^|\\s)${w}(\\s|$)`);
      if (re.test(norm) && (!best || w.length > best.len)) best = { id, len: w.length };
    }
  }
  return best?.id || null;
}

const REFUSALS = [
  'the void does not know that word…',
  'nothing answers…',
  'speak, and it will be made…',
];
let refusalIdx = 0;

let spoken = false;

function decree(text) {
  const norm = normalize(text);
  if (!norm) return;
  spoken = true;

  if (RE_UNMAKE.test(norm)) { unmake(); return; }
  if (RE_SHARE.test(norm)) { shareCreation(); return; }
  if (RE_REST.test(norm)) { rest(); return; }
  if (RE_STOPRAIN.test(norm)) {
    world.setRain(false);
    say('And the rain ceased.');
    return;
  }
  if (RE_DAWN.test(norm) && world.hasAct('firmament')) {
    world.dawn();
    choir.setNight(false);
    say('And the morning came.');
    return;
  }

  const id = findAct(norm);
  if (!id) {
    choir.denied();
    say(REFUSALS[refusalIdx++ % REFUSALS.length], 'hint');
    return;
  }
  enact(id);
}

function enact(id, silent = false) {
  const res = world.perform(id);
  if (!res.ok) {
    if (res.reason === 'already') {
      say(`${res.act.title} already is.`, 'hint');
    } else if (res.reason === 'needs') {
      choir.denied();
      say(`there is no ${res.missing.title.replace(/^the /, '')} yet to hold it…`, 'hint');
    }
    return false;
  }
  atmos.registerScene(scene);   // whatever was just made joins the atmosphere
  const idx = ACT_IDS.indexOf(id);
  if (!silent) {
    choir.strike(idx);
    choir.addVoice(id, idx);
    if (id === 'night') choir.setNight(true);
    say(res.act.verse);
  } else {
    choir.addVoice(id, idx);
  }
  refreshChronicle();
  return true;
}

function rest() {
  const n = world.made.size;
  if (n < 4) {
    say('there is too little yet to rest from…', 'hint');
    return;
  }
  choir.benediction();
  say('And it was very good. <span class="small">— the seventh day</span>', 'genesis');
}

function unmake() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  say('…and the world returned to the void.');
  setTimeout(() => location.reload(), 1600);
}

// ------------------------------------------------------------- persistence

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, acts: ACT_IDS.filter((id) => world.made.has(id)),
    }));
  } catch { /* ignore */ }
}

function restore(list) {
  let any = false;
  // acts replay in canonical order so prerequisites are always satisfied
  for (const id of ACT_IDS) {
    if (list.includes(id) && enact(id, true)) any = true;
  }
  refreshChronicle();
  return any;
}

function shareCreation() {
  try {
    const json = JSON.stringify({ v: 1, acts: ACT_IDS.filter((id) => world.made.has(id)) });
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = location.origin + location.pathname + '#c=' + enc;
    history.replaceState(null, '', '#c=' + enc);
    const manual = () => {
      input.openType();
      typeBoxEl.value = url;
      typeBoxEl.select();
      say('copy the link below.', 'hint');
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => say('a link to your creation is on your clipboard.', 'hint'), manual);
    } else manual();
  } catch {
    say('it could not be written down…', 'hint');
  }
}

// ------------------------------------------------------------------ camera

// facing the origin, where whatever you make will appear
const cam = {
  pos: new THREE.Vector3(0, 96, 330),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: -0.2,
};
const keys = new Set();
let started = false;

window.addEventListener('keydown', (e) => {
  if (typingActive()) return;
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  cam.yaw -= e.movementX * 0.0022;
  cam.pitch -= e.movementY * 0.0022;
  cam.pitch = Math.max(-1.5, Math.min(1.2, cam.pitch));
});
canvas.addEventListener('click', () => {
  choir.poke();
  if (started && document.pointerLockElement !== canvas && !isTouch) canvas.requestPointerLock?.();
});

const touchMove = { x: 0, y: 0, mag: 0 };

function flyCamera(dt) {
  const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1;
  const speed = 42 * boost;
  const f = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
  const r = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const wish = new THREE.Vector3();
  if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(f);
  if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(f);
  if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(r);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(r);
  if (keys.has('KeyE') || keys.has('Space')) wish.y += 1;
  if (keys.has('KeyQ')) wish.y -= 1;
  if (touchMove.mag > 0.05) {
    wish.addScaledVector(f, -touchMove.y);
    wish.addScaledVector(r, touchMove.x);
  }
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
  cam.vel.lerp(wish, 1 - Math.exp(-dt * 6));
  cam.pos.addScaledVector(cam.vel, dt);

  // never sink below the ground or wander out of the world
  const floor = Math.max(world.groundAt(cam.pos.x, cam.pos.z) + 4, 3);
  if (cam.pos.y < floor) cam.pos.y = floor;
  if (cam.pos.y > 460) cam.pos.y = 460;
  const rad = Math.hypot(cam.pos.x, cam.pos.z);
  if (rad > 620) { cam.pos.x *= 620 / rad; cam.pos.z *= 620 / rad; }

  camera.position.copy(cam.pos);
  camera.rotation.set(cam.pitch, cam.yaw, 0);
}

// ------------------------------------------------------------------ touch

if (isTouch) {
  const stickEl = $('stick'), nubEl = $('stick-nub');
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  const R = 52;
  window.addEventListener('touchstart', (e) => {
    if (!started || typingActive()) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('#mic-btn,#type-btn,#up-btn,#typewrap,#enter')) continue;
      if (stickId === null && t.clientX < innerWidth * 0.45 && t.clientY > innerHeight * 0.4) {
        stickId = t.identifier; sx = t.clientX; sy = t.clientY;
        stickEl.style.left = sx + 'px'; stickEl.style.top = sy + 'px';
        nubEl.style.transform = 'translate(-50%, -50%)';
        stickEl.classList.add('on');
      } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!started) return;
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sx, dy = t.clientY - sy;
        const m = Math.hypot(dx, dy);
        if (m > R) { dx *= R / m; dy *= R / m; }
        nubEl.style.transform = `translate(calc(${dx}px - 50%), calc(${dy}px - 50%))`;
        touchMove.x = dx / R; touchMove.y = dy / R;
        touchMove.mag = Math.min(m / R, 1);
      } else if (t.identifier === lookId) {
        cam.yaw -= (t.clientX - lx) * 0.005;
        cam.pitch -= (t.clientY - ly) * 0.005;
        cam.pitch = Math.max(-1.5, Math.min(1.2, cam.pitch));
        lx = t.clientX; ly = t.clientY;
      }
    }
    if (stickId !== null || lookId !== null) e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null; touchMove.x = touchMove.y = touchMove.mag = 0;
        stickEl.classList.remove('on');
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);

  const micBtn = $('mic-btn');
  micBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!started) return;
    micBtn.classList.add('held');
    input.startListen();
  }, { passive: false });
  const rel = (e) => { e.preventDefault(); micBtn.classList.remove('held'); input.stopListen(); };
  micBtn.addEventListener('touchend', rel, { passive: false });
  micBtn.addEventListener('touchcancel', rel, { passive: false });
  $('type-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (started) input.openType();
  }, { passive: false });
  let rising = false;
  const upBtn = $('up-btn');
  upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); rising = true; }, { passive: false });
  const upEnd = (e) => { e.preventDefault(); rising = false; };
  upBtn.addEventListener('touchend', upEnd, { passive: false });
  upBtn.addEventListener('touchcancel', upEnd, { passive: false });
  setInterval(() => { if (rising) keys.add('KeyE'); else keys.delete('KeyE'); }, 60);
}

// ------------------------------------------------------------------ input

const typeBoxEl = $('typebox');
function typingActive() { return document.activeElement === typeBoxEl; }

const input = initInput({
  typeBox: typeBoxEl,
  isTyping: typingActive,
  onUtterance(text) {
    micEl.classList.remove('live');
    decree(text);
  },
  onInterim(text) {
    say(escapeHtml(text), 'interim');
  },
  onVoiceState(state) {
    micEl.classList.toggle('live', state === 'listening' || state === 'starting');
    if (state === 'listening') say('listening…', 'interim');
    else if (state === 'silence') say('…only silence answered.', 'hint');
    else if (state === 'denied' || state === 'unsupported') {
      const msg = state === 'denied'
        ? 'microphone blocked — type your word instead'
        : 'voice needs Chrome or Safari — type your word instead';
      for (const el of hintEl.querySelectorAll('.voice-hint')) el.textContent = msg;
      say(msg, 'hint');
    } else if (state.startsWith?.('error:')) {
      say('the word did not carry…', 'hint');
    }
  },
});

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// --------------------------------------------------------------- restoring

let gifted = false, remembered = false;
try {
  const m = location.hash.match(/^#c=([A-Za-z0-9\-_]+)$/);
  if (m) {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))));
    gifted = restore(data.acts || []);
    history.replaceState(null, '', location.pathname);
  }
} catch { /* malformed link */ }
if (!gifted) {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.acts) remembered = restore(saved.acts);
  } catch { /* corrupt save */ }
}
refreshChronicle();

// ------------------------------------------------------------------ enter

$('enter-btn').addEventListener('click', () => {
  started = true;
  $('enter').classList.add('gone');
  choir.start();
  for (const id of ACT_IDS) {
    if (world.made.has(id)) choir.addVoice(id, ACT_IDS.indexOf(id));
  }
  if (input.voiceSupported && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  }
  if (!isTouch) canvas.requestPointerLock?.();
  setTimeout(() => {
    if (spoken) return; // never talk over a word already spoken
    say(gifted ? 'a creation was given to you.'
      : remembered ? 'the world remembers what you made.'
        : 'say <em>&ldquo;let there be light&rdquo;</em>', 'hint');
  }, 2200);
});

// ------------------------------------------------------------------- loop

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.setSize(innerWidth, innerHeight, renderer.getPixelRatio());
});

window.__ltbl = { world, cam, enact };

let last = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(now - last, 0.05);
  last = now;

  if (started) flyCamera(dt);
  else {
    // the void drifts before you enter
    cam.yaw += dt * 0.012;
    camera.position.copy(cam.pos);
    camera.rotation.set(cam.pitch, cam.yaw, 0);
  }
  world.update(dt, now, cam.pos);
  post.render(scene, camera);
});
