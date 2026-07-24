import * as THREE from 'three';
import { buildWorld } from './world.js';
import { bindDecrees, speak, tickDecrees } from './decree.js';
import { initInput } from './voice.js';
import { createAmbience } from './audio.js';

// ------------------------------------------------------------------ boot

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1100);
camera.rotation.order = 'YXZ';

const world = buildWorld(scene);
const audio = createAmbience();
const catKeys = [...world.categories.keys()];

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

bindDecrees(world, {
  caption,
  onDecree(catKey, hue, isNew, coloredCount, total, muted) {
    audio.onDecree(catKeys.indexOf(catKey), isNew, coloredCount, total, catKey, muted);
    gazeState.key = undefined; // re-render the gaze label ("unhued" may have cleared)
  },
  onGenesis() { audio.genesisChimes(world.categories.size); },
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
  player.pitch = 0;
}
player.pos.y = world.terrainHeight(player.pos.x, player.pos.z) + 1.9;

const keys = new Set();
let started = false;
let typing = false;

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

  // keep inside the valley rim
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
const gazeState = { key: null, point: null };
let gazeClock = 0;

function updateGaze(now) {
  if (now < gazeClock) return;
  gazeClock = now + 0.13;
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(world.gazeEntries, true);
  let key = null, point = null;
  if (hits.length) {
    key = world.meshToKey.get(hits[0].object) || null;
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
}

// ------------------------------------------------------------------ input

const typeBoxEl = $('typebox');

const input = initInput({
  typeBox: typeBoxEl,
  isTyping: typingActive,
  onUtterance(text) {
    micEl.classList.remove('live');
    speak(text, gazeState.key, gazeState.point, player.pos.clone(),
      performance.now() / 1000);
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
  // ask for the mic now, inside a click gesture, so hold-V works while locked
  if (input.voiceSupported && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  }
  lockPointer();
  setTimeout(() => {
    caption('gaze upon a thing — hold <em>V</em> — speak a color', null, 'hint');
  }, 1600);
});

// ------------------------------------------------------------------ loop

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now() / 1000;
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(now - last, 0.05);
  last = now;

  if (started) updatePlayer(dt);
  else camera.rotation.set(player.pitch, player.yaw + Math.sin(now * 0.05) * 0.04, 0),
    camera.position.set(player.pos.x, player.pos.y, player.pos.z);

  world.update(dt, now);
  tickDecrees(now);
  audio.update(now);
  if (started) updateGaze(now);
  renderer.render(scene, camera);
});
