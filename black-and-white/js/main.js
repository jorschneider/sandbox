import * as THREE from 'three';
import { buildWorld, REALMS } from './world.js';
import { bindDecrees, speak, hydrate, getWorldState, getSaveState, tickDecrees } from './decree.js';
import { initInput } from './voice.js';
import { createAmbience } from './audio.js';

// ------------------------------------------------------------------ boot

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1100);
camera.rotation.order = 'YXZ';

const audio = createAmbience();

let scene = null, world = null, catKeys = [];
let currentRealm = 'valley';
const SAVE_PREFIX = 'bw-world-v2:';
const REALM_KEY = 'bw-realm';

// ------------------------------------------------------------------ HUD

const $ = (id) => document.getElementById(id);
const captionEl = $('caption');
const gazeEl = $('gaze');
const micEl = $('mic');
const hintEl = $('hint');
const resumeEl = $('resume');
const fadeEl = $('fade');
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

function countCats() {
  let colored = 0, total = 0;
  for (const c of world.categories.values()) {
    if (!c.countTotal) continue;
    total++;
    if (c.colored) colored++;
  }
  return { colored, total };
}

// the pencil-sketch overlay thins as the world takes color
function updateSketch() {
  if (!world) return;
  const { colored, total } = countCats();
  document.documentElement.style.setProperty('--sketch', String(1 - colored / total));
}

// ------------------------------------------------------------------ player

const player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: 0, bobPhase: 0,
};
const gazeState = { key: null, point: null, surfIndex: null, instanceId: null };

const keys = new Set();
let started = false;

// soft glow on the exact thing "this" would color
const highlightMat = new THREE.MeshBasicMaterial({
  color: '#ffffff', transparent: true, opacity: 0.08,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const highlight = new THREE.Mesh(new THREE.BufferGeometry(), highlightMat);
highlight.matrixAutoUpdate = false;
highlight.visible = false;
highlight.raycast = () => {};
const hlM = new THREE.Matrix4();
const hlScale = new THREE.Matrix4().makeScale(1.06, 1.06, 1.06);
const SINGLE_TINT_KEYS = new Set(['houses', 'roofs', 'clouds']);

// ------------------------------------------------------------------ decrees

let saveTimer = 0;

const decreeHooks = {
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
    else if (kind.startsWith('travel:')) travelTo(kind.slice(7));
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
      try {
        localStorage.setItem(SAVE_PREFIX + currentRealm, JSON.stringify(state));
        localStorage.setItem(REALM_KEY, currentRealm);
      } catch { /* full/blocked */ }
    }, 250);
  },
};

// ------------------------------------------------------------------ realms

function disposeScene(s) {
  s.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) m?.dispose?.();
  });
  renderer.renderLists.dispose();
}

function createWorld(realm) {
  currentRealm = REALMS[realm] ? realm : 'valley';
  if (scene) {
    scene.remove(highlight);
    disposeScene(scene);
  }
  scene = new THREE.Scene();
  world = buildWorld(scene, { realm: currentRealm, shadowMapSize: isTouch ? 1024 : 2048 });
  catKeys = [...world.categories.keys()];
  bindDecrees(world, decreeHooks);
  highlight.visible = false;
  highlight.geometry = new THREE.BufferGeometry();
  scene.add(highlight);

  player.pos.copy(world.spawn);
  player.pos.y = world.terrainHeight(player.pos.x, player.pos.z) + 1.9;
  player.vel.set(0, 0, 0);
  const d = new THREE.Vector3().subVectors(world.spawnLook, player.pos);
  player.yaw = Math.atan2(-d.x, -d.z);
  player.pitch = 0;
  gazeState.key = undefined;
  updateSketch();
}

function loadRealmSave(realm) {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_PREFIX + realm) || 'null');
    return hydrate(saved, player.pos.clone(), performance.now() / 1000);
  } catch { return false; }
}

function travelTo(realm) {
  if (!REALMS[realm]) return;
  if (realm === currentRealm) {
    caption(`you are already in ${world.realmTitle}.`, null, 'hint');
    return;
  }
  fadeEl.classList.add('on');
  setTimeout(() => {
    createWorld(realm);
    loadRealmSave(realm);
    updateSketch();
    const { colored, total } = countCats();
    audio.restore([], catKeys, colored, total);
    audio.setNight(getWorldState().night);
    try { localStorage.setItem(REALM_KEY, currentRealm); } catch { /* ignore */ }
    caption(`…and you came to <em>${world.realmTitle}</em>.`, '#ffffff', '');
    setTimeout(() => fadeEl.classList.remove('on'), 400);
  }, 950);
}

// ------------------------------------------------------------------ sharing

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

// ------------------------------------------------------------------ boot world

let remembered = false, gifted = false;
let bootState = null;
try {
  const m = location.hash.match(/^#w=([A-Za-z0-9\-_]+)$/);
  if (m) {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    bootState = JSON.parse(new TextDecoder().decode(bytes));
  }
} catch { /* malformed link — fall through to the local save */ }

createWorld(bootState?.realm || localStorage.getItem(REALM_KEY) || 'valley');
if (bootState) {
  gifted = hydrate(bootState, player.pos.clone(), performance.now() / 1000);
}
if (!gifted) remembered = loadRealmSave(currentRealm);
updateSketch();

// ------------------------------------------------------------------ controls

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
  if (isTouch) return;
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
  if (touchMove.mag > 0.04) {
    wish.addScaledVector(f, -touchMove.y * 16);
    wish.addScaledVector(r, touchMove.x * 16);
  }

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

// ------------------------------------------------------------------ touch

const touchMove = { x: 0, y: 0, mag: 0 };
if (isTouch) {
  const stickEl = $('stick'), nubEl = $('stick-nub');
  const micBtn = $('mic-btn'), typeBtn = $('type-btn');
  let stickId = null, lookId = null;
  let sx = 0, sy = 0, lx = 0, ly = 0;
  const R = 52;

  window.addEventListener('touchstart', (e) => {
    if (!started || typingActive()) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('#mic-btn, #type-btn, #typewrap, #enter')) continue;
      if (stickId === null && t.clientX < innerWidth * 0.45 && t.clientY > innerHeight * 0.4) {
        stickId = t.identifier;
        sx = t.clientX; sy = t.clientY;
        stickEl.style.left = sx + 'px';
        stickEl.style.top = sy + 'px';
        nubEl.style.transform = 'translate(-50%, -50%)';
        stickEl.classList.add('on');
      } else if (lookId === null) {
        lookId = t.identifier;
        lx = t.clientX; ly = t.clientY;
      }
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
        touchMove.x = dx / R;
        touchMove.y = dy / R;
        touchMove.mag = Math.min(m / R, 1);
      } else if (t.identifier === lookId) {
        player.yaw -= (t.clientX - lx) * 0.0052;
        player.pitch -= (t.clientY - ly) * 0.0052;
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
        lx = t.clientX; ly = t.clientY;
      }
    }
    if (stickId !== null || lookId !== null) e.preventDefault();
  }, { passive: false });

  const endTouches = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null;
        touchMove.x = touchMove.y = touchMove.mag = 0;
        stickEl.classList.remove('on');
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  window.addEventListener('touchend', endTouches);
  window.addEventListener('touchcancel', endTouches);

  micBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!started) return;
    micBtn.classList.add('held');
    input.startListen();
  }, { passive: false });
  const micRelease = (e) => {
    e.preventDefault();
    micBtn.classList.remove('held');
    input.stopListen();
  };
  micBtn.addEventListener('touchend', micRelease, { passive: false });
  micBtn.addEventListener('touchcancel', micRelease, { passive: false });

  typeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (started) input.openType();
  }, { passive: false });
}

// ------------------------------------------------------------------ gaze

const raycaster = new THREE.Raycaster();
raycaster.far = 1000;
let gazeClock = 0;

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
    micEl.classList.toggle('live', state === 'listening' || state === 'starting');
    if (state === 'listening') {
      caption('listening…', null, 'interim');
    } else if (state === 'silence') {
      caption('…the world heard only silence. hold, speak, then release.', null, 'hint');
    } else if (state === 'denied' || state === 'unsupported') {
      const msg = state === 'denied'
        ? 'microphone blocked — type your decree instead'
        : 'voice needs Chrome or Safari — type your decree instead';
      for (const el of hintEl.querySelectorAll('.voice-hint')) el.textContent = msg;
      caption(msg, null, 'hint');
    } else if (state.startsWith?.('error:')) {
      const err = state.slice(6);
      caption(err === 'network'
        ? 'the speech service could not be reached — type your decree instead.'
        : err === 'audio-capture'
          ? 'no microphone could be found.'
          : `the world could not hear (${err}).`, null, 'hint');
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
  const { colored, total } = countCats();
  audio.restore(catKeys.filter((k) => world.categories.get(k).colored), catKeys, colored, total);
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
        : isTouch ? 'gaze upon a thing — hold the mic — speak a color'
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
window.__bw = { get world() { return world; }, player, audio };

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
  renderer.render(scene, camera);
});
