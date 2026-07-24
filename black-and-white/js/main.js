import * as THREE from 'three';
import { buildWorld } from './world.js';
import { bindDecrees, speak, hydrate, getWorldState, getSaveState, tickDecrees } from './decree.js';
import { initInput } from './voice.js';
import { createAmbience } from './audio.js';

// ------------------------------------------------------------------ boot

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1100);
camera.rotation.order = 'YXZ';

const world = buildWorld(scene);
const audio = createAmbience();
const catKeys = [...world.categories.keys()];

const SAVE_KEY = 'bw-world-v2';

// ------------------------------------------------------------------ HUD

const $ = (id) => document.getElementById(id);
const captionEl = $('caption');
const gazeEl = $('gaze');
const micEl = $('mic');
const hintEl = $('hint');
const resumeEl = $('resume');
let captionTimer = 0;

function caption(html, hex, cls = '') {
  captionEl.className = 'show ' + cls;
  captionEl.innerHTML = html;
  const em = captionEl.querySelector('em');
  if (em && hex) em.style.color = hex;
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => { captionEl.className = ''; },
    cls === 'hint' || cls === 'interim' ? 2800 : 4200);
}

// the pencil-sketch overlay thins as the world takes color
function updateSketch() {
  let colored = 0, total = 0;
  for (const c of world.categories.values()) {
    if (!c.countTotal) continue;
    total++;
    if (c.colored) colored++;
  }
  document.documentElement.style.setProperty('--sketch', String(1 - colored / total));
}
updateSketch();

// ------------------------------------------------------------------ decrees

// declared before bindDecrees: hydration fires onDecree during module eval
const gazeState = { key: null, point: null, surfIndex: null, instanceId: null };
let saveTimer = 0;

bindDecrees(world, {
  caption,
  onDecree(info) {
    const idx = catKeys.indexOf(info.catKey);
    if (info.single) {
      audio.singleChime(idx);
    } else {
      audio.onDecree(idx, info.isNew, info.coloredCount, info.total, info.catKey, info.muted);
      world.lifeOnDecree(info.catKey, info.base, info.rainbow, info.origin, info.now);
    }
    updateSketch();
    gazeState.key = undefined; // re-render the gaze label
  },
  onIntent(kind) {
    if (kind === 'night') audio.setNight(true);
    else if (kind === 'day') audio.setNight(false);
    else if (kind === 'rain' || kind === 'snow' || kind === 'clear') audio.setWeather(kind);
    else if (kind === 'genesis') audio.genesisChimes(world.categories.size);
    else if (kind === 'reset') { audio.reset(); updateSketch(); }
    else if (kind === 'share') shareWorld();
  },
  onComplete() {
    setTimeout(() => {
      caption('…and the world was whole.', '#ffffff', 'genesis');
      audio.flourish();
      world.flourish(player.pos.clone(), performance.now() / 1000);
    }, 1100);
  },
  onStateChange(state) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* full/blocked */ }
    }, 250);
  },
});

// ------------------------------------------------------------------ player

const player = {
  pos: world.spawn.clone(),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: 0, bobPhase: 0,
};
{
  const d = new THREE.Vector3().subVectors(world.spawnLook, player.pos);
  player.yaw = Math.atan2(-d.x, -d.z);
}
player.pos.y = world.terrainHeight(player.pos.x, player.pos.z) + 1.9;

// a shared world in the URL wins; otherwise a remembered world wakes up painted
let remembered = false, gifted = false;
try {
  const m = location.hash.match(/^#w=([A-Za-z0-9\-_]+)$/);
  if (m) {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    gifted = hydrate(JSON.parse(new TextDecoder().decode(bytes)),
      player.pos.clone(), performance.now() / 1000);
  }
} catch { /* malformed link — fall through to the local save */ }
if (!gifted) {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    remembered = hydrate(saved, player.pos.clone(), performance.now() / 1000);
  } catch { /* corrupt save — start gray */ }
}
updateSketch();

function shareWorld() {
  try {
    const json = JSON.stringify(getSaveState());
    const enc = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = location.origin + location.pathname + '#w=' + enc;
    history.replaceState(null, '', '#w=' + enc);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => caption('a link to this world is on your clipboard.', null, 'hint'),
        () => caption('this world now lives in your address bar — copy it.', null, 'hint'));
    } else {
      caption('this world now lives in your address bar — copy it.', null, 'hint');
    }
  } catch {
    caption('the world could not be written down…', null, 'hint');
  }
}

const keys = new Set();
let started = false;

window.addEventListener('keydown', (e) => {
  if (typingActive()) return;
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function typingActive() {
  return document.activeElement === typeBoxEl;
}

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0023;
  player.pitch -= e.movementY * 0.0023;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
});

canvas.addEventListener('click', () => {
  audio.poke();
  if (started && document.pointerLockElement !== canvas) lockPointer();
});
document.addEventListener('pointerlockchange', () => {
  if (!started) return;
  resumeEl.classList.toggle('show', document.pointerLockElement !== canvas);
});

function lockPointer() {
  canvas.requestPointerLock?.();
}

function updatePlayer(dt) {
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 20 : 11;
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const r = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const wish = new THREE.Vector3();
  if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(f);
  if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(f);
  if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(r);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(r);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

  const k = 1 - Math.exp(-dt * 8);
  player.vel.lerp(wish, k);
  player.pos.addScaledVector(player.vel, dt);

  const rad = Math.hypot(player.pos.x, player.pos.z);
  if (rad > 200) {
    player.pos.x *= 200 / rad;
    player.pos.z *= 200 / rad;
  }

  const groundY = world.terrainHeight(player.pos.x, player.pos.z) + 1.9;
  player.pos.y += (groundY - player.pos.y) * Math.min(1, dt * 9);

  const moving = player.vel.length() / 11;
  player.bobPhase += dt * player.vel.length() * 0.85;
  const bob = Math.sin(player.bobPhase) * 0.05 * Math.min(moving, 1);

  camera.position.set(player.pos.x, player.pos.y + bob, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

// ------------------------------------------------------------------ gaze

const raycaster = new THREE.Raycaster();
raycaster.far = 1000;
let gazeClock = 0;

// soft glow on the exact thing "this" would color
const highlightMat = new THREE.MeshBasicMaterial({
  color: '#ffffff', transparent: true, opacity: 0.08,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const highlight = new THREE.Mesh(new THREE.BufferGeometry(), highlightMat);
highlight.matrixAutoUpdate = false;
highlight.visible = false;
highlight.raycast = () => {};
scene.add(highlight);
const hlM = new THREE.Matrix4();
const hlScale = new THREE.Matrix4().makeScale(1.06, 1.06, 1.06);
const SINGLE_TINT_KEYS = new Set(['houses', 'roofs', 'clouds']);

function updateGaze(now) {
  if (now < gazeClock) return;
  gazeClock = now + 0.13;
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(world.gazeEntries, true);
  let key = null, point = null, surfIndex = null, instanceId = null;
  if (hits.length) {
    const resolved = world.resolveHit(hits[0].object, hits[0].instanceId);
    if (resolved) {
      key = resolved.key;
      surfIndex = resolved.surfIndex ?? null;
      instanceId = resolved.instanceId ?? null;
    }
    point = hits[0].point;
  } else if (raycaster.ray.direction.y > 0.04) {
    key = 'sky';
  }
  if (key !== gazeState.key) {
    gazeState.key = key;
    if (key) {
      const cat = world.categories.get(key);
      gazeEl.innerHTML = cat.label
        + (cat.colored ? '' : '<span class="state">unhued</span>');
      gazeEl.classList.add('show');
    } else {
      gazeEl.classList.remove('show');
    }
  }
  gazeState.point = point;
  gazeState.surfIndex = surfIndex;
  gazeState.instanceId = instanceId;

  const singleable = hits.length > 0 && (
    (instanceId !== null && instanceId !== undefined)
    || (surfIndex !== null && surfIndex !== undefined && SINGLE_TINT_KEYS.has(key)));
  if (singleable) {
    const obj = hits[0].object;
    highlight.geometry = obj.geometry;
    if (obj.isInstancedMesh) {
      obj.getMatrixAt(instanceId, hlM);
      hlM.premultiply(obj.matrixWorld);
    } else {
      hlM.copy(obj.matrixWorld);
    }
    hlM.multiply(hlScale);
    highlight.matrix.copy(hlM);
    highlight.visible = true;
  } else {
    highlight.visible = false;
  }
}

// ------------------------------------------------------------------ input

const typeBoxEl = $('typebox');

const input = initInput({
  typeBox: typeBoxEl,
  isTyping: typingActive,
  onUtterance(text) {
    micEl.classList.remove('live');
    speak(text, { ...gazeState }, player.pos.clone(), performance.now() / 1000);
  },
  onInterim(text) {
    caption(escapeHtml(text), null, 'interim');
  },
  onVoiceState(state) {
    micEl.classList.toggle('live', state === 'listening');
    if (state === 'unsupported' || state === 'denied') {
      hintEl.querySelector('.voice-hint').textContent =
        state === 'denied'
          ? 'microphone denied — press T and type your decree'
          : 'voice needs Chrome or Safari — press T and type your decree';
    }
  },
});

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// ------------------------------------------------------------------ enter

$('enter-btn').addEventListener('click', () => {
  started = true;
  $('enter').classList.add('gone');
  audio.start();
  // rebuild the soundscape of a remembered world
  const coloredKeys = catKeys.filter((k) => world.categories.get(k).colored);
  let colored = 0, total = 0;
  for (const c of world.categories.values()) {
    if (!c.countTotal) continue;
    total++;
    if (c.colored) colored++;
  }
  audio.restore(coloredKeys, catKeys, colored, total);
  const ws = getWorldState();
  audio.setNight(ws.night);
  if (ws.weather !== 'clear') audio.setWeather(ws.weather);

  if (input.voiceSupported && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  }
  lockPointer();
  setTimeout(() => {
    caption(gifted ? 'a world was given to you.'
      : remembered ? 'the world remembers your word.'
        : 'gaze upon a thing — hold <em>V</em> — speak a color', null, 'hint');
  }, 1600);
});

// ------------------------------------------------------------------ loop

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// debug/testing handle
window.__bw = { world, player, audio };

let proxClock = 0;

let last = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(now - last, 0.05);
  last = now;

  if (started) {
    updatePlayer(dt);
  } else {
    camera.rotation.set(player.pitch, player.yaw + Math.sin(now * 0.05) * 0.04, 0);
    camera.position.set(player.pos.x, player.pos.y, player.pos.z);
  }

  world.update(dt, now, player.pos);
  tickDecrees(now);
  audio.update(now);
  if (started) updateGaze(now);
  if (highlight.visible) {
    highlightMat.opacity = 0.05 + 0.05 * (1 + Math.sin(now * 4.5)) / 2;
  }
  if (started && now > proxClock) {
    proxClock = now + 0.25;
    audio.setRiverProximity(
      Math.max(0, 1 - world.riverDistance(player.pos.x, player.pos.z) / 55));
  }
  renderer.render(scene, camera);
});
