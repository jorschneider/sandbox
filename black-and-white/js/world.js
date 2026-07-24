// Builds the monochrome valley and registers every paintable "category".
// A category owns one or more surfaces; decree.js animates their colors.
// The world also runs the day/night compositor, weather, and the small
// lives (grass, butterflies, sparkles, fireflies) that color awakens.

import * as THREE from 'three';
import { makeNoise } from './noise.js';

const WORLD_RADIUS = 210;
const WATER_Y = -1.5;

const N = makeNoise(20260724);
const rand = N.rand;

// ---------------------------------------------------------------- terrain math

function riverX(z) {
  return 30 * Math.sin(z * 0.015) + 10 * Math.sin(z * 0.04);
}

const VILLAGE = { x: 52, z: 19, hx: 16, hz: 14, round: 9 };

function villageMask(x, z) {
  const dx = Math.max(Math.abs(x - VILLAGE.x) - VILLAGE.hx, 0);
  const dz = Math.max(Math.abs(z - VILLAGE.z) - VILLAGE.hz, 0);
  const d = Math.hypot(dx, dz);
  return 1 - smoothstep(0, VILLAGE.round, d);
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) { return a + (b - a) * t; }

export function terrainHeight(x, z) {
  let h = N.fbm(x * 0.012, z * 0.012, 4) * 9;
  const r = Math.hypot(x, z);
  const rim = smoothstep(120, 215, r);
  h += rim * rim * 34;

  const vm = villageMask(x, z);
  if (vm > 0) h = mix(h, 2.0 + 0.4 * N.fbm(x * 0.1, z * 0.1, 2), vm * 0.9);

  const d = Math.abs(x - riverX(z));
  const rm = 1 - smoothstep(0, 11, d);
  if (rm > 0) {
    const bed = -3.4 + 0.6 * N.fbm(x * 0.05, z * 0.05, 2);
    h = mix(h, bed, Math.pow(rm, 1.4));
  }
  return h;
}

function terrainNormal(x, z) {
  const e = 0.6;
  const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
}

// ------------------------------------------------------------- geometry helpers

function mergeGeoms(geoms) {
  const parts = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, off);
    nor.set(g.attributes.normal.array, off);
    off += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

function instMaterial(extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, flatShading: true, roughness: 0.95, metalness: 0, ...extra,
  });
}

function makeInstanced(geo, count, matrices, grayLevel, jitter) {
  const mesh = new THREE.InstancedMesh(geo, instMaterial(), count);
  const positions = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, matrices[i]);
    const g = grayLevel + (rand() - 0.5) * jitter;
    mesh.setColorAt(i, c.setRGB(g, g, g));
    positions.push(new THREE.Vector3().setFromMatrixPosition(matrices[i]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return { mesh, positions };
}

const WHITE = new THREE.Color('#ffffff');
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// --------------------------------------------------------------------- build

export function buildWorld(scene) {
  const categories = new Map();
  const gazeEntries = [];
  const meshToKey = new Map();     // mesh -> category key (gaze)
  const meshToSurf = new Map();    // mesh -> surface index (single-object decrees)
  const updaters = [];

  // day/night + weather state, driven by decrees
  const state = {
    nightT: 0, nightTarget: 0, duskT: 0,
    weather: 'clear', season: null,
    cloudDim: 1, cloudDimTarget: 1,
    treesColored: false, fishOn: false,
  };

  function addCategory(key, def) {
    const cat = {
      key, colored: false, currentName: null, rainbow: false,
      countTotal: true, surfaces: [], ...def,
    };
    cat.currentColor = new THREE.Color().setScalar(cat.grayLevel ?? 0.6);
    categories.set(key, cat);
    return cat;
  }

  function addGaze(object, key) {
    gazeEntries.push(object);
    object.traverse((o) => meshToKey.set(o, key));
  }

  // ---- lights -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xdcdcdc, 0x707070, 0.95);
  scene.add(hemi);

  const sunDir = new THREE.Vector3(0.45, 0.62, -0.64).normalize();
  const moonDir = new THREE.Vector3(-0.55, 0.52, 0.5).normalize();
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.copy(sunDir).multiplyScalar(180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130;
  sc.near = 20; sc.far = 460;
  sc.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 1.2;
  scene.add(sunLight, sunLight.target);

  // ---- sky (base colors; the compositor blends night in every frame) ------
  const skyBase = new THREE.Color('#e7e7e4');
  const sunLightBase = new THREE.Color('#ffffff');
  scene.background = new THREE.Color().copy(skyBase);
  scene.fog = new THREE.Fog(skyBase.clone(), 120, 380);

  addCategory('sky', {
    label: 'the sky', grayLevel: 0.9,
    synonyms: ['sky', 'skies', 'heavens', 'heaven', 'firmament', 'air'],
    phrase: 'and the heavens turned',
    defaultColor: '#87c7ea',
    surfaces: [
      { type: 'tint', current: skyBase, apply: (c) => skyBase.copy(c) },
    ],
  });

  // gradient sky dome: zenith and horizon colors fed by the compositor
  const domeUniforms = {
    uTop: { value: new THREE.Color('#e7e7e4') },
    uHorizon: { value: new THREE.Color('#efefec') },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(880, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: domeUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir;
        void main() { vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
        void main() { float t = pow(clamp(vDir.y, 0.0, 1.0), 0.62);
          gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }`,
    }));
  dome.renderOrder = -999;
  dome.frustumCulled = false;
  scene.add(dome);
  addGaze(dome, 'sky');

  // ---- sun / moon / stars -------------------------------------------------
  const sunMat = new THREE.MeshBasicMaterial({
    color: '#f0f0ee', fog: false, transparent: true, opacity: 1,
  });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 26), sunMat);
  const haloMat = new THREE.MeshBasicMaterial({
    color: '#f0f0ee', fog: false, transparent: true, opacity: 0.18, depthWrite: false,
  });
  const sunHalo = new THREE.Mesh(new THREE.CircleGeometry(24, 26), haloMat);
  scene.add(sunDisc, sunHalo);
  addGaze(sunDisc, 'sun');

  addCategory('sun', {
    label: 'the sun', grayLevel: 0.94,
    synonyms: ['sun', 'sunshine', 'sunlight'],
    phrase: 'and the sun burned',
    defaultColor: '#ffd166',
    surfaces: [
      { type: 'tint', current: sunMat.color, apply: (c) => {
        sunMat.color.copy(c);
        haloMat.color.copy(c);
        sunLightBase.copy(c).lerp(WHITE, 0.55);
      } },
    ],
  });

  const moonMat = new THREE.MeshBasicMaterial({
    color: '#e6ecf7', fog: false, transparent: true, opacity: 0,
  });
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(10.5, 26), moonMat);
  const moonHaloMat = new THREE.MeshBasicMaterial({
    color: '#e6ecf7', fog: false, transparent: true, opacity: 0, depthWrite: false,
  });
  const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(16, 26), moonHaloMat);
  scene.add(moonDisc, moonHalo);
  addGaze(moonDisc, 'moon');

  addCategory('moon', {
    label: 'the moon', grayLevel: 0.9, countTotal: false,
    synonyms: ['moon', 'moonlight'],
    phrase: 'and the moon glowed',
    defaultColor: '#e6ecf7',
    surfaces: [
      { type: 'tint', current: moonMat.color, apply: (c) => {
        moonMat.color.copy(c);
        moonHaloMat.color.copy(c);
      } },
    ],
  });

  const starMat = new THREE.PointsMaterial({
    color: '#cfe0ff', size: 1.7, sizeAttenuation: false,
    transparent: true, opacity: 0, fog: false, depthWrite: false,
  });
  {
    const starPos = new Float32Array(850 * 3);
    for (let i = 0; i < 850; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 0.9 + 0.06, rand() * 2 - 1)
        .normalize().multiplyScalar(720);
      starPos[i * 3] = v.x; starPos[i * 3 + 1] = v.y; starPos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(g, starMat);
    stars.raycast = () => {};
    scene.add(stars);
  }

  addCategory('stars', {
    label: 'the stars', grayLevel: 0.85, countTotal: false,
    synonyms: ['star', 'stars', 'starlight'],
    phrase: 'and the stars shone',
    defaultColor: '#cfe0ff',
    surfaces: [
      { type: 'tint', current: starMat.color, apply: (c) => starMat.color.copy(c) },
    ],
  });

  // ---- day/night compositor (passing through dusk on the way) -------------
  const NIGHT_SKY = new THREE.Color('#0d1330');
  const NIGHT_LIGHT = new THREE.Color('#a9c2e8');
  const NIGHT_HEMI = new THREE.Color('#26304d');
  const DUSK_TOP = new THREE.Color('#b06a8f');
  const DUSK_HORIZON = new THREE.Color('#ff9a55');
  const DUSK_LIGHT = new THREE.Color('#ffb27a');
  const tC1 = new THREE.Color(), tC2 = new THREE.Color(), tC3 = new THREE.Color();
  const sunPosDay = sunDir.clone().multiplyScalar(360);
  const sunPosDown = new THREE.Vector3(sunDir.x, -0.14, sunDir.z).normalize().multiplyScalar(360);
  const moonPosUp = moonDir.clone().multiplyScalar(360);
  const moonPosDown = new THREE.Vector3(moonDir.x, -0.14, moonDir.z).normalize().multiplyScalar(360);
  const lightDir = new THREE.Vector3();

  updaters.push((dt, t, playerPos) => {
    const target = state.nightTarget;
    const step = dt / 8; // full day<->night swing over ~8 seconds
    state.nightT += Math.min(Math.abs(target - state.nightT), step) * Math.sign(target - state.nightT);
    const nt = state.nightT;
    const dusk = Math.pow(Math.sin(Math.PI * nt), 1.6);
    state.duskT = dusk;

    // zenith
    tC2.copy(skyBase).multiplyScalar(0.1).lerp(NIGHT_SKY, 0.75);
    tC1.copy(skyBase).lerp(tC2, nt).lerp(DUSK_TOP, dusk * 0.3);
    domeUniforms.uTop.value.copy(tC1);
    // horizon (also drives fog + fallback background)
    tC3.copy(skyBase).lerp(WHITE, 0.42);
    tC2.copy(skyBase).multiplyScalar(0.16).lerp(NIGHT_SKY, 0.55).lerp(WHITE, 0.06);
    tC3.lerp(tC2, nt).lerp(DUSK_HORIZON, dusk * 0.55);
    domeUniforms.uHorizon.value.copy(tC3);
    scene.background.copy(tC3);
    scene.fog.color.copy(tC3);

    hemi.color.copy(tC1.copy(skyBase).lerp(WHITE, 0.45)
      .lerp(NIGHT_HEMI, nt * 0.85).lerp(DUSK_LIGHT, dusk * 0.25));
    hemi.intensity = 0.95 - 0.5 * nt;
    sunLight.color.copy(tC1.copy(sunLightBase).lerp(NIGHT_LIGHT, nt).lerp(DUSK_LIGHT, dusk * 0.55));
    sunLight.intensity = 1.5 - 0.95 * nt;

    const e = smoothstep(0, 1, nt);
    sunDisc.position.lerpVectors(sunPosDay, sunPosDown, e);
    sunHalo.position.copy(sunDisc.position).multiplyScalar(0.994);
    sunDisc.lookAt(0, 0, 0); sunHalo.lookAt(0, 0, 0);
    sunMat.opacity = clamp01(1 - (nt - 0.55) / 0.25);
    haloMat.opacity = 0.18 * sunMat.opacity;
    moonDisc.position.lerpVectors(moonPosDown, moonPosUp, e);
    moonHalo.position.copy(moonDisc.position).multiplyScalar(0.994);
    moonDisc.lookAt(0, 0, 0); moonHalo.lookAt(0, 0, 0);
    moonMat.opacity = clamp01((nt - 0.3) / 0.35);
    moonHaloMat.opacity = 0.14 * moonMat.opacity;
    starMat.opacity = nt * (0.75 + 0.15 * Math.sin(t * 0.7));

    // shadow light follows the player (snapped, to avoid shimmer)
    if (playerPos) {
      const sx = Math.round(playerPos.x / 8) * 8, sz = Math.round(playerPos.z / 8) * 8;
      lightDir.lerpVectors(sunDir, moonDir, nt).normalize();
      sunLight.position.set(sx + lightDir.x * 180, lightDir.y * 180, sz + lightDir.z * 180);
      sunLight.target.position.set(sx, 0, sz);
    }
  });

  // ---- terrain ------------------------------------------------------------
  const SIZE = 440, SEG = 150;
  const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tGeo.rotateX(-Math.PI / 2);
  const tPos = tGeo.attributes.position;
  const vCount = tPos.count;
  for (let i = 0; i < vCount; i++) {
    tPos.setY(i, terrainHeight(tPos.getX(i), tPos.getZ(i)));
  }
  tGeo.computeVertexNormals();

  const shade = new Float32Array(vCount);
  const vJitter = new Float32Array(vCount);
  const tNor = tGeo.attributes.normal;
  const tCol = new Float32Array(vCount * 3);
  for (let i = 0; i < vCount; i++) {
    const ny = tNor.getY(i);
    const y = tPos.getY(i);
    const s = Math.min(0.72 + 0.3 * smoothstep(0.55, 1, ny) + 0.004 * Math.max(y, 0), 1.12);
    shade[i] = s;
    vJitter[i] = rand();
    const g = (0.64 + (vJitter[i] - 0.5) * 0.07) * s;
    tCol[i * 3] = g; tCol[i * 3 + 1] = g; tCol[i * 3 + 2] = g;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1, metalness: 0,
  }));
  terrain.receiveShadow = true;
  scene.add(terrain);
  addGaze(terrain, 'land');

  // ---- placement helpers --------------------------------------------------
  function openGround(x, z, riverPad = 10, villagePad = 0.12) {
    if (Math.hypot(x, z) > 190) return false;
    if (Math.abs(x - riverX(z)) < riverPad) return false;
    if (villageMask(x, z) > villagePad) return false;
    return true;
  }

  const pathPts = [];
  {
    const ctrl = [
      new THREE.Vector3(66, 0, 30), new THREE.Vector3(52, 0, 18),
      new THREE.Vector3(30, 0, 10), new THREE.Vector3(14, 0, 5),
      new THREE.Vector3(3.4, 0, 4), new THREE.Vector3(-14, 0, 0),
      new THREE.Vector3(-34, 0, -8), new THREE.Vector3(-62, 0, -22),
    ];
    const curve = new THREE.CatmullRomCurve3(ctrl);
    for (let i = 0; i <= 130; i++) pathPts.push(curve.getPoint(i / 130));
  }
  function nearPath(x, z, d) {
    for (const p of pathPts) if (Math.hypot(p.x - x, p.z - z) < d) return true;
    return false;
  }

  // ---- grass (hidden until the land is given color) -----------------------
  const grassSpots = [];
  let guard = 0;
  while (grassSpots.length < 1400 && guard++ < 60000) {
    const x = (rand() * 2 - 1) * 185, z = (rand() * 2 - 1) * 185;
    if (!openGround(x, z, 11)) continue;
    if (nearPath(x, z, 2.4)) continue;
    if (N.fbm(x * 0.03 - 11, z * 0.03 + 23, 3) < -0.05) continue;
    grassSpots.push({ x, z, s: 0.7 + rand() * 0.9, rot: rand() * Math.PI * 2, phase: rand() * 7 });
  }
  const bladeTri = (a) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.14, 0, 0, 0.14, 0, 0, 0, 0.62, 0.05,
    ]), 3));
    g.computeVertexNormals();
    g.rotateY(a);
    return g;
  };
  const grassGeo = mergeGeoms([bladeTri(0), bladeTri(2.1), bladeTri(4.2)]);
  const grass = makeInstanced(grassGeo, grassSpots.length, grassSpots.map((sp) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z), sp.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sp.rot, 0)),
      new THREE.Vector3(0.0001, 0.0001, 0.0001),
    )), 0.6, 0.1);
  grass.mesh.material.side = THREE.DoubleSide;
  grass.mesh.raycast = () => {};
  scene.add(grass.mesh);

  const grassState = { growing: false, growStart: 0, delays: null, grown: false };
  const gM = new THREE.Matrix4(), gQ = new THREE.Quaternion(),
    gP = new THREE.Vector3(), gS = new THREE.Vector3(), gE = new THREE.Euler();
  updaters.push((dt, t) => {
    if (!grassState.growing && !grassState.grown) return;
    for (let i = 0; i < grassSpots.length; i++) {
      const sp = grassSpots[i];
      let scale = sp.s;
      if (grassState.growing) {
        const gt = (t - grassState.growStart - grassState.delays[i]) / 0.9;
        if (gt <= 0) { continue; }
        if (gt < 1) scale = sp.s * (easeOut(gt) * 1.15 - 0.15 * gt);
      }
      const sway = Math.sin(t * 1.9 + sp.phase) * 0.09;
      gE.set(sway, sp.rot, sway * 0.6);
      gQ.setFromEuler(gE);
      gP.set(sp.x, terrainHeight(sp.x, sp.z), sp.z);
      gS.set(scale, scale, scale);
      grass.mesh.setMatrixAt(i, gM.compose(gP, gQ, gS));
    }
    grass.mesh.instanceMatrix.needsUpdate = true;
    if (grassState.growing && t > grassState.growStart + grassState.maxDelay + 1) {
      grassState.growing = false;
      grassState.grown = true;
    }
  });

  function growGrass(origin, now) {
    if (grassState.grown || grassState.growing) return;
    grassState.growing = true;
    grassState.growStart = now;
    grassState.delays = new Float32Array(grassSpots.length);
    let max = 0;
    grassSpots.forEach((sp, i) => {
      const d = Math.hypot(sp.x - origin.x, sp.z - origin.z) / 42;
      grassState.delays[i] = d;
      if (d > max) max = d;
    });
    grassState.maxDelay = max;
  }

  function shrinkGrass() {
    grassState.growing = false;
    grassState.grown = false;
    const m = new THREE.Matrix4();
    grassSpots.forEach((sp, i) => {
      grass.mesh.getMatrixAt(i, m);
      grass.mesh.setMatrixAt(i, m.scale(new THREE.Vector3(0.0001, 0.0001, 0.0001)));
    });
    grass.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---- water --------------------------------------------------------------
  const wCols = 6, wRows = 118, wWidth = 8.6;
  const wGeo = new THREE.BufferGeometry();
  const wVerts = new Float32Array(wCols * wRows * 3);
  for (let r = 0; r < wRows; r++) {
    const z = -234 + r * 4;
    for (let cI = 0; cI < wCols; cI++) {
      const x = riverX(z) - wWidth / 2 + (wWidth * cI) / (wCols - 1);
      const k = (r * wCols + cI) * 3;
      wVerts[k] = x; wVerts[k + 1] = WATER_Y; wVerts[k + 2] = z;
    }
  }
  const wIdx = [];
  for (let r = 0; r < wRows - 1; r++) {
    for (let cI = 0; cI < wCols - 1; cI++) {
      const a = r * wCols + cI, b = a + 1, c2 = a + wCols, d = c2 + 1;
      wIdx.push(a, c2, b, b, c2, d);
    }
  }
  wGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
  wGeo.setIndex(wIdx);
  wGeo.computeVertexNormals();
  const waterMat = new THREE.MeshPhongMaterial({
    color: '#c4c4c4', transparent: true, opacity: 0.92,
    shininess: 110, specular: new THREE.Color('#aaaaaa'),
  });
  const water = new THREE.Mesh(wGeo, waterMat);
  scene.add(water);
  addGaze(water, 'water');

  const wBase = wVerts.slice();
  updaters.push((dt, t) => {
    for (let i = 0; i < wVerts.length; i += 3) {
      const x = wBase[i], z = wBase[i + 2];
      wVerts[i + 1] = WATER_Y
        + Math.sin(z * 0.35 + t * 1.7) * 0.09
        + Math.sin(x * 0.8 + z * 0.11 + t * 2.4) * 0.06;
    }
    wGeo.attributes.position.needsUpdate = true;
    wGeo.computeVertexNormals();
  });

  addCategory('water', {
    label: 'the river', grayLevel: 0.77,
    synonyms: ['water', 'waters', 'river', 'stream', 'brook', 'creek', 'lake'],
    phrase: 'and the river ran',
    defaultColor: '#4fb0c6',
    surfaces: [
      { type: 'tint', current: waterMat.color, apply: (c) => {
        waterMat.color.copy(c);
        waterMat.specular.copy(c).lerp(WHITE, 0.6);
      } },
    ],
  });

  // river sparkles (awaken when the water is colored)
  const sparkGeo = new THREE.PlaneGeometry(0.3, 0.3).rotateX(-Math.PI / 2);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const SPARKS = 110;
  const sparkles = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARKS);
  const sparkData = [];
  for (let i = 0; i < SPARKS; i++) {
    const z = -200 + rand() * 400;
    const x = riverX(z) + (rand() - 0.5) * (wWidth - 2);
    sparkData.push({ x, z, phase: rand() * 9, speed: 1.5 + rand() * 2.5 });
    sparkles.setMatrixAt(i, new THREE.Matrix4().setPosition(x, WATER_Y + 0.18, z));
    sparkles.setColorAt(i, new THREE.Color(0, 0, 0));
  }
  sparkles.raycast = () => {};
  sparkles.visible = false;
  scene.add(sparkles);
  const sparkTmp = new THREE.Color();
  updaters.push((dt, t) => {
    if (!sparkles.visible) return;
    for (let i = 0; i < SPARKS; i++) {
      const s = sparkData[i];
      const tw = Math.pow(Math.max(0, Math.sin(t * s.speed + s.phase)), 6);
      sparkles.setColorAt(i, sparkTmp.setScalar(tw * (1 - 0.4 * state.nightT)));
    }
    sparkles.instanceColor.needsUpdate = true;
  });

  // ---- land (terrain + grass ride the same category) ----------------------
  addCategory('land', {
    label: 'the land', grayLevel: 0.64,
    synonyms: ['land', 'ground', 'grass', 'earth', 'hills', 'hill', 'valley',
      'meadow', 'meadows', 'field', 'fields', 'terrain', 'mountains'],
    phrase: 'and the land lay',
    singular: 'patch of earth',
    defaultColor: '#79b356',
    surfaces: [
      { type: 'vertex', mesh: terrain, positions: tPos, shade, jitterSeed: vJitter,
        variance: { h: 0.02, s: 0.1, l: 0.06 } },
      { type: 'inst', mesh: grass.mesh, positions: grass.positions,
        variance: { h: 0.04, s: 0.12, l: 0.1 } },
      { type: 'tint', current: hemi.groundColor,
        apply: (c) => hemi.groundColor.copy(c).lerp(new THREE.Color('#666666'), 0.45) },
    ],
  });

  // ---- trees --------------------------------------------------------------
  const treeSpots = [];
  guard = 0;
  while (treeSpots.length < 380 && guard++ < 30000) {
    const x = (rand() * 2 - 1) * 195, z = (rand() * 2 - 1) * 195;
    if (!openGround(x, z, 12)) continue;
    if (nearPath(x, z, 4.5)) continue;
    if (N.fbm(x * 0.02 + 40, z * 0.02 - 17, 3) < -0.12) continue;
    treeSpots.push({ x, z, s: 0.7 + rand() * 0.85, rot: rand() * Math.PI * 2 });
  }
  const pineSpots = treeSpots.filter((_, i) => i % 9 < 5);
  const broadSpots = treeSpots.filter((_, i) => i % 9 >= 5);

  function treeMatrices(spots) {
    return spots.map((sp) => new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z) - 0.15, sp.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sp.rot, 0)),
      new THREE.Vector3(sp.s, sp.s, sp.s),
    ));
  }

  const pineGeo = mergeGeoms([
    new THREE.ConeGeometry(1.8, 2.6, 7).translate(0, 3.1, 0),
    new THREE.ConeGeometry(1.35, 2.2, 7).translate(0, 4.5, 0),
    new THREE.ConeGeometry(0.9, 1.7, 7).translate(0, 5.7, 0),
  ]);
  const broadGeo = new THREE.IcosahedronGeometry(2.0, 0)
    .scale(1, 0.85, 1).translate(0, 4.1, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 2.6, 6).translate(0, 1.3, 0);

  const pines = makeInstanced(pineGeo, pineSpots.length, treeMatrices(pineSpots), 0.5, 0.14);
  const broads = makeInstanced(broadGeo, broadSpots.length, treeMatrices(broadSpots), 0.56, 0.14);
  const trunkMats = treeMatrices(pineSpots).concat(treeMatrices(broadSpots));
  const trunks = makeInstanced(trunkGeo, trunkMats.length, trunkMats, 0.42, 0.08);
  pines.mesh.castShadow = broads.mesh.castShadow = trunks.mesh.castShadow = true;
  scene.add(pines.mesh, broads.mesh, trunks.mesh);
  addGaze(pines.mesh, 'trees');
  addGaze(broads.mesh, 'trees');
  addGaze(trunks.mesh, 'bark');
  meshToSurf.set(pines.mesh, 0);
  meshToSurf.set(broads.mesh, 1);
  meshToSurf.set(trunks.mesh, 0);

  addCategory('trees', {
    label: 'the trees', grayLevel: 0.53, singular: 'tree',
    synonyms: ['tree', 'trees', 'forest', 'forests', 'leaves', 'canopy', 'foliage', 'pines'],
    phrase: 'and the trees rose',
    defaultColor: '#2f9e63',
    surfaces: [
      { type: 'inst', mesh: pines.mesh, positions: pines.positions,
        variance: { h: 0.035, s: 0.12, l: 0.09 } },
      { type: 'inst', mesh: broads.mesh, positions: broads.positions,
        variance: { h: 0.05, s: 0.12, l: 0.1 } },
    ],
  });
  addCategory('bark', {
    label: 'the bark', grayLevel: 0.42, singular: 'trunk',
    synonyms: ['bark', 'trunk', 'trunks', 'wood', 'timber'],
    phrase: 'and the bark grew',
    defaultColor: '#7a5537',
    surfaces: [
      { type: 'inst', mesh: trunks.mesh, positions: trunks.positions,
        variance: { h: 0.02, s: 0.1, l: 0.07 } },
    ],
  });

  // ---- rocks --------------------------------------------------------------
  const rockMatrices = [];
  guard = 0;
  while (rockMatrices.length < 170 && guard++ < 20000) {
    const x = (rand() * 2 - 1) * 195, z = (rand() * 2 - 1) * 195;
    const nearRiver = Math.abs(x - riverX(z)) < 16 && Math.abs(x - riverX(z)) > 9;
    if (!openGround(x, z, 9) && !nearRiver) continue;
    if (nearPath(x, z, 3)) continue;
    if (!nearRiver && rand() > 0.4) continue;
    const s = 0.4 + rand() * 1.5;
    rockMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(x, terrainHeight(x, z) - 0.25 * s, z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4)),
      new THREE.Vector3(s * (0.8 + rand() * 0.5), s * (0.55 + rand() * 0.4), s),
    ));
  }
  const rocks = makeInstanced(new THREE.IcosahedronGeometry(1, 0),
    rockMatrices.length, rockMatrices, 0.58, 0.12);
  rocks.mesh.castShadow = true;
  scene.add(rocks.mesh);
  addGaze(rocks.mesh, 'rocks');
  meshToSurf.set(rocks.mesh, 0);

  addCategory('rocks', {
    label: 'the stones', grayLevel: 0.58, singular: 'stone',
    synonyms: ['rock', 'rocks', 'stone', 'stones', 'boulder', 'boulders'],
    phrase: 'and the stones sat',
    defaultColor: '#98a0a8',
    surfaces: [
      { type: 'inst', mesh: rocks.mesh, positions: rocks.positions,
        variance: { h: 0.02, s: 0.08, l: 0.1 } },
    ],
  });

  // ---- flowers ------------------------------------------------------------
  const flowerMatrices = [];
  const clusters = [];
  guard = 0;
  while (clusters.length < 15 && guard++ < 4000) {
    const x = (rand() * 2 - 1) * 170, z = (rand() * 2 - 1) * 170;
    if (!openGround(x, z, 13)) continue;
    clusters.push({ x, z });
  }
  for (const cl of clusters) {
    const n = 35 + (rand() * 30) | 0;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 7;
      const x = cl.x + Math.cos(a) * r, z = cl.z + Math.sin(a) * r;
      if (!openGround(x, z, 10)) continue;
      const s = 0.7 + rand() * 0.7;
      flowerMatrices.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z), z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0)),
        new THREE.Vector3(s, s, s),
      ));
    }
  }
  const flowerGeo = mergeGeoms([
    new THREE.CylinderGeometry(0.025, 0.035, 0.4, 4).translate(0, 0.2, 0),
    new THREE.IcosahedronGeometry(0.16, 0).translate(0, 0.46, 0),
  ]);
  const flowers = makeInstanced(flowerGeo, flowerMatrices.length, flowerMatrices, 0.72, 0.15);
  scene.add(flowers.mesh);
  addGaze(flowers.mesh, 'flowers');
  meshToSurf.set(flowers.mesh, 0);

  addCategory('flowers', {
    label: 'the flowers', grayLevel: 0.72, singular: 'flower',
    synonyms: ['flower', 'flowers', 'blossom', 'blossoms', 'bloom', 'blooms', 'petals'],
    phrase: 'and the flowers bloomed',
    defaultColor: '#e86aa6',
    surfaces: [
      { type: 'inst', mesh: flowers.mesh, positions: flowers.positions,
        variance: { h: 0.09, s: 0.15, l: 0.12 } },
    ],
  });

  // ---- butterflies (awaken with the flowers) ------------------------------
  const BFLIES = 34;
  const bflyWing = new THREE.BufferGeometry();
  bflyWing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, 0.42, 0.1, -0.16, 0.42, 0.1, 0.2,
  ]), 3));
  bflyWing.computeVertexNormals();
  const bflyMatL = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bflyL = new THREE.InstancedMesh(bflyWing, bflyMatL, BFLIES);
  const bflyR = new THREE.InstancedMesh(bflyWing, bflyMatL, BFLIES);
  bflyL.raycast = () => {}; bflyR.raycast = () => {};
  const bflyData = [];
  for (let i = 0; i < BFLIES; i++) {
    const cl = clusters[i % clusters.length];
    bflyData.push({
      cl, angle: rand() * Math.PI * 2, r: 1.5 + rand() * 4,
      speed: (0.4 + rand() * 0.5) * (rand() > 0.5 ? 1 : -1),
      h: 0.8 + rand() * 1.6, phase: rand() * 9, scale: 0,
    });
    bflyL.setColorAt(i, new THREE.Color('#dddddd'));
    bflyR.setColorAt(i, new THREE.Color('#dddddd'));
  }
  bflyL.visible = bflyR.visible = false;
  scene.add(bflyL, bflyR);
  const bM = new THREE.Matrix4(), bQ = new THREE.Quaternion(),
    bP = new THREE.Vector3(), bS = new THREE.Vector3(), bE = new THREE.Euler();
  let bflyShown = false, bflyShowTime = 0;
  updaters.push((dt, t) => {
    if (!bflyL.visible) return;
    for (let i = 0; i < BFLIES; i++) {
      const b = bflyData[i];
      b.angle += b.speed * dt;
      const x = b.cl.x + Math.cos(b.angle) * b.r;
      const z = b.cl.z + Math.sin(b.angle) * b.r;
      const y = terrainHeight(x, z) + b.h + Math.sin(t * 2.1 + b.phase) * 0.35;
      const st = clamp01((t - bflyShowTime - (i % 12) * 0.15) / 0.8);
      b.scale = easeOut(st);
      const flap = Math.sin(t * 16 + b.phase) * 0.95;
      const heading = b.angle + (b.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      bP.set(x, y, z);
      bS.setScalar(b.scale);
      bE.set(0, -heading, flap); bQ.setFromEuler(bE);
      bflyL.setMatrixAt(i, bM.compose(bP, bQ, bS));
      bE.set(Math.PI, -heading, flap); bQ.setFromEuler(bE);
      bflyR.setMatrixAt(i, bM.compose(bP, bQ, bS));
    }
    bflyL.instanceMatrix.needsUpdate = true;
    bflyR.instanceMatrix.needsUpdate = true;
  });

  function showButterflies(baseColor, rainbow, now) {
    const c = new THREE.Color();
    const hsl = { h: 0, s: 0, l: 0 };
    if (baseColor) baseColor.getHSL(hsl);
    for (let i = 0; i < BFLIES; i++) {
      if (rainbow || !baseColor) c.setHSL(rand(), 0.8, 0.62);
      else c.setHSL((hsl.h + (rand() - 0.5) * 0.16 + 1) % 1,
        clamp01(hsl.s * 0.9 + 0.1), clamp01(hsl.l + 0.12));
      bflyL.setColorAt(i, c); bflyR.setColorAt(i, c);
    }
    bflyL.instanceColor.needsUpdate = bflyR.instanceColor.needsUpdate = true;
    if (!bflyShown) { bflyShown = true; bflyShowTime = now; }
    bflyL.visible = bflyR.visible = true;
  }

  // ---- fireflies (night + colored trees) ----------------------------------
  const FIREFLIES = 80;
  const ffMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ff = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), ffMat, FIREFLIES);
  ff.raycast = () => {};
  const ffData = [];
  for (let i = 0; i < FIREFLIES; i++) {
    const sp = treeSpots[(rand() * treeSpots.length) | 0];
    ffData.push({
      x: sp.x + (rand() - 0.5) * 10, z: sp.z + (rand() - 0.5) * 10,
      h: 0.5 + rand() * 2, phase: rand() * 9, drift: rand() * 6,
    });
    ff.setColorAt(i, new THREE.Color(0, 0, 0));
  }
  ff.visible = false;
  scene.add(ff);
  const ffTmp = new THREE.Color(), ffM = new THREE.Matrix4();
  updaters.push((dt, t) => {
    const vis = clamp01((state.nightT - 0.35) / 0.3) * (state.treesColored ? 1 : 0);
    ff.visible = vis > 0.01;
    if (!ff.visible) return;
    for (let i = 0; i < FIREFLIES; i++) {
      const f = ffData[i];
      const x = f.x + Math.sin(t * 0.4 + f.drift) * 2.2;
      const z = f.z + Math.cos(t * 0.33 + f.drift * 1.7) * 2.2;
      const y = terrainHeight(x, z) + f.h + Math.sin(t * 0.9 + f.phase) * 0.5;
      ff.setMatrixAt(i, ffM.setPosition(x, y, z));
      const pulse = Math.pow(Math.max(0, Math.sin(t * 1.4 + f.phase)), 3);
      ff.setColorAt(i, ffTmp.set('#d8ff7a').multiplyScalar(pulse * vis));
    }
    ff.instanceMatrix.needsUpdate = true;
    ff.instanceColor.needsUpdate = true;
  });

  // ---- village ------------------------------------------------------------
  const housePlots = [
    { x: 46, z: 10 }, { x: 58, z: 9 }, { x: 65, z: 20 },
    { x: 57, z: 29 }, { x: 45, z: 27 }, { x: 37, z: 17 }, { x: 66, z: 33 },
  ];
  const wallSurf = [], roofSurf = [];
  const windowMats = [];
  const houseGroup = new THREE.Group();
  const wallGeo = new THREE.BoxGeometry(3.4, 2.5, 2.9);
  const roofGeo = new THREE.ConeGeometry(2.9, 1.7, 4);
  const chimGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
  const winGeo = new THREE.PlaneGeometry(0.55, 0.7);
  housePlots.forEach((plot, hi) => {
    const g = new THREE.Group();
    const y = terrainHeight(plot.x, plot.z);
    g.position.set(plot.x, y, plot.z);
    g.rotation.y = Math.atan2(VILLAGE.x - plot.x, VILLAGE.z - plot.z) + (rand() - 0.5) * 0.5;

    const wallMat = instMaterial();
    wallMat.color.setScalar(0.66 + (rand() - 0.5) * 0.06);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 1.25;
    walls.castShadow = walls.receiveShadow = true;

    const roofMat = instMaterial();
    roofMat.color.setScalar(0.45 + (rand() - 0.5) * 0.06);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.35;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    const chim = new THREE.Mesh(chimGeo, wallMat);
    chim.position.set(0.9, 3.4, 0.4);

    const winMat = new THREE.MeshStandardMaterial({
      color: '#8f8f8f', emissive: '#000000', roughness: 0.6,
    });
    windowMats.push(winMat);
    for (const wx of [-0.85, 0.85]) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.position.set(wx, 1.35, 1.46);
      g.add(w);
    }
    g.add(walls, roof, chim);
    houseGroup.add(g);

    const wp = new THREE.Vector3(plot.x, y, plot.z);
    wallSurf.push({ type: 'tint', current: wallMat.color, pos: wp,
      apply: (c) => wallMat.color.copy(c) });
    roofSurf.push({ type: 'tint', current: roofMat.color, pos: wp,
      apply: (c) => roofMat.color.copy(c) });
    for (const m of [walls, chim, ...g.children.filter((o) => o.geometry === winGeo)]) {
      meshToSurf.set(m, hi);
    }
    meshToSurf.set(roof, hi);
  });
  scene.add(houseGroup);
  addGaze(houseGroup, 'houses');

  addCategory('houses', {
    label: 'the houses', grayLevel: 0.66, singular: 'house',
    synonyms: ['house', 'houses', 'home', 'homes', 'village', 'cottage',
      'cottages', 'hut', 'huts', 'walls', 'buildings'],
    phrase: 'and the houses stood',
    defaultColor: '#e8dcc4',
    onFirstColor: () => {
      for (const m of windowMats) m.emissive.set('#ffc46b').multiplyScalar(0.9);
    },
    onReset: () => {
      for (const m of windowMats) m.emissive.set('#000000');
    },
    surfaces: wallSurf,
  });
  addCategory('roofs', {
    label: 'the roofs', grayLevel: 0.45, singular: 'roof',
    synonyms: ['roof', 'roofs', 'rooftops', 'shingles'],
    phrase: 'and the roofs shone',
    defaultColor: '#c65f3d',
    surfaces: roofSurf,
  });
  houseGroup.traverse((o) => {
    if (o.geometry === roofGeo) meshToKey.set(o, 'roofs');
  });

  // ---- path + bridge ------------------------------------------------------
  const patchMatrices = [], patchUp = new THREE.Vector3(0, 1, 0);
  for (const p of pathPts) {
    if (Math.abs(p.x - riverX(p.z)) < 8.5) continue;
    const jx = p.x + (rand() - 0.5) * 1.2, jz = p.z + (rand() - 0.5) * 1.2;
    const q = new THREE.Quaternion().setFromUnitVectors(patchUp, terrainNormal(jx, jz));
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)));
    patchMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(jx, terrainHeight(jx, jz) + 0.07, jz),
      q,
      new THREE.Vector3(1.5 + rand() * 0.7, 1, 1.1 + rand() * 0.5),
    ));
  }
  const patches = makeInstanced(new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2),
    patchMatrices.length, patchMatrices, 0.7, 0.08);
  patches.mesh.material.flatShading = false;
  scene.add(patches.mesh);
  addGaze(patches.mesh, 'path');
  meshToSurf.set(patches.mesh, 0);

  const bridgeMat = instMaterial();
  bridgeMat.color.setScalar(0.52);
  const bridge = new THREE.Group();
  {
    const bz = 4, bx = riverX(bz);
    const span = 19, planks = 9;
    for (let i = 0; i < planks; i++) {
      const t = i / (planks - 1);
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(span / planks + 0.25, 0.18, 2.6), bridgeMat);
      plank.position.set(bx - span / 2 + t * span, 0.35 + Math.sin(t * Math.PI) * 0.55, bz);
      plank.rotation.z = Math.cos(t * Math.PI) * -0.22;
      plank.castShadow = true;
      bridge.add(plank);
    }
    for (const sx of [-span / 2 + 0.6, span / 2 - 0.6]) {
      for (const sz of [-1.1, 1.1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.6, 0.24), bridgeMat);
        post.position.set(bx + sx, 0.7, bz + sz);
        bridge.add(post);
      }
    }
  }
  scene.add(bridge);
  addGaze(bridge, 'path');
  bridge.traverse((o) => meshToSurf.set(o, 1));

  addCategory('path', {
    label: 'the path', grayLevel: 0.7, singular: 'stretch of path',
    synonyms: ['path', 'paths', 'road', 'roads', 'trail', 'bridge', 'lane', 'way'],
    phrase: 'and the path wound',
    defaultColor: '#c9b391',
    surfaces: [
      { type: 'inst', mesh: patches.mesh, positions: patches.positions,
        variance: { h: 0.015, s: 0.08, l: 0.08 } },
      { type: 'tint', current: bridgeMat.color, pos: new THREE.Vector3(riverX(4), 0.5, 4),
        apply: (c) => bridgeMat.color.copy(c) },
    ],
  });

  // ---- clouds (weather can dim them over their decreed color) -------------
  const cloudSurf = [];
  const cloudGroups = [];
  for (let i = 0; i < 9; i++) {
    const mat = instMaterial();
    const g = new THREE.Group();
    const puffs = 3 + (rand() * 3) | 0;
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat);
      puff.position.set((p - puffs / 2) * 4.5 + rand() * 2, (rand() - 0.5) * 1.6, (rand() - 0.5) * 4);
      puff.scale.set(3.5 + rand() * 3, 1.5 + rand() * 0.9, 2.6 + rand() * 1.6);
      g.add(puff);
    }
    g.position.set((rand() * 2 - 1) * 240, 62 + rand() * 28, (rand() * 2 - 1) * 240);
    scene.add(g);
    cloudGroups.push(g);
    addGaze(g, 'clouds');
    const surf = {
      type: 'tint',
      current: new THREE.Color().setScalar(0.9 + (rand() - 0.5) * 0.05),
      pos: g.position, mat,
      apply: (c) => { surf.current.copy(c); mat.color.copy(c).multiplyScalar(state.cloudDim); },
    };
    mat.color.copy(surf.current);
    cloudSurf.push(surf);
    g.traverse((o) => meshToSurf.set(o, i));
  }
  const CLOUD_DUSK = new THREE.Color('#ff9d6e');
  let lastCloudDusk = 0;
  updaters.push((dt) => {
    for (const g of cloudGroups) {
      g.position.x += dt * 1.15;
      if (g.position.x > 280) g.position.x = -280;
    }
    const d = state.cloudDimTarget;
    const dimMoving = Math.abs(d - state.cloudDim) > 0.002;
    if (dimMoving) state.cloudDim += (d - state.cloudDim) * Math.min(1, dt * 0.8);
    if (dimMoving || Math.abs(state.duskT - lastCloudDusk) > 0.012) {
      lastCloudDusk = state.duskT;
      for (const s of cloudSurf) {
        s.mat.color.copy(s.current).multiplyScalar(state.cloudDim)
          .lerp(CLOUD_DUSK, state.duskT * 0.5);
      }
    }
  });

  addCategory('clouds', {
    label: 'the clouds', grayLevel: 0.9, singular: 'cloud',
    synonyms: ['cloud', 'clouds'],
    phrase: 'and the clouds drifted',
    defaultColor: '#fff3e2',
    surfaces: cloudSurf,
  });

  // ---- birds --------------------------------------------------------------
  const birdSurf = [];
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0.35, 0, 0, -0.35, 1.05, 0.12, 0,
  ]), 3));
  wingGeo.computeVertexNormals();
  const flocks = [];
  for (let f = 0; f < 3; f++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#5a5a5a', side: THREE.DoubleSide });
    const center = new THREE.Vector3((rand() * 2 - 1) * 90, 26 + rand() * 18, (rand() * 2 - 1) * 90);
    const flock = { center, radius: 26 + rand() * 28, speed: 0.25 + rand() * 0.15, birds: [] };
    for (let b = 0; b < 4; b++) {
      const g = new THREE.Group();
      const l = new THREE.Mesh(wingGeo, mat);
      const r2 = new THREE.Mesh(wingGeo, mat);
      r2.scale.x = -1;
      g.add(l, r2);
      scene.add(g);
      flock.birds.push({ g, l, r: r2, phase: rand() * Math.PI * 2, off: b * 1.5 + rand() });
    }
    flocks.push(flock);
    birdSurf.push({ type: 'tint', current: mat.color, pos: center,
      apply: (c) => mat.color.copy(c) });
  }
  updaters.push((dt, t) => {
    const vis = state.nightT < 0.6; // birds roost at night
    for (const fl of flocks) {
      for (const b of fl.birds) {
        b.g.visible = vis;
        if (!vis) continue;
        const a = t * fl.speed + b.off;
        b.g.position.set(
          fl.center.x + Math.cos(a) * fl.radius,
          fl.center.y + Math.sin(t * 0.6 + b.phase) * 2.5,
          fl.center.z + Math.sin(a) * fl.radius);
        b.g.rotation.y = -a - Math.PI / 2;
        const flap = Math.sin(t * 9 + b.phase) * 0.7;
        b.l.rotation.x = flap;
        b.r.rotation.x = -flap;
      }
    }
  });

  addCategory('birds', {
    label: 'the birds', grayLevel: 0.35,
    synonyms: ['bird', 'birds', 'flock', 'swallows', 'sparrows'],
    phrase: 'and the birds flew',
    defaultColor: '#37474f',
    surfaces: birdSurf,
  });

  // ---- rain ---------------------------------------------------------------
  const RAIN = 900;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN * 2 * 3);
  const rainDrops = [];
  for (let i = 0; i < RAIN; i++) {
    rainDrops.push({
      x: (rand() - 0.5) * 90, y: rand() * 50, z: (rand() - 0.5) * 90,
    });
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: '#a7b8c9', transparent: true, opacity: 0,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.raycast = () => {};
  rain.visible = false;
  scene.add(rain);

  // ---- snow ---------------------------------------------------------------
  const SNOW = 1100;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW * 3);
  const snowFlakes = [];
  for (let i = 0; i < SNOW; i++) {
    snowFlakes.push({
      x: (rand() - 0.5) * 80, y: rand() * 40, z: (rand() - 0.5) * 80,
      phase: rand() * 9, sway: 0.5 + rand(),
    });
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: '#ffffff', size: 2.6, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  snow.raycast = () => {};
  snow.visible = false;
  scene.add(snow);

  updaters.push((dt, t, playerPos) => {
    const p = playerPos || spawn;
    const rTarget = state.weather === 'rain' ? 0.42 : 0;
    rainMat.opacity += (rTarget - rainMat.opacity) * Math.min(1, dt * 1.5);
    rain.visible = rainMat.opacity > 0.01;
    if (rain.visible) {
      for (let i = 0; i < RAIN; i++) {
        const d = rainDrops[i];
        d.y -= 36 * dt; d.x += 4 * dt;
        if (d.y < -6) { d.y += 50; d.x = (rand() - 0.5) * 90; d.z = (rand() - 0.5) * 90; }
        if (d.x > 45) d.x -= 90;
        const k = i * 6;
        const wx = p.x + d.x, wy = p.y - 8 + d.y, wz = p.z + d.z;
        rainPos[k] = wx; rainPos[k + 1] = wy; rainPos[k + 2] = wz;
        rainPos[k + 3] = wx + 0.25; rainPos[k + 4] = wy + 1.3; rainPos[k + 5] = wz;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    const sTarget = state.weather === 'snow' ? 0.9 : 0;
    snowMat.opacity += (sTarget - snowMat.opacity) * Math.min(1, dt * 1.5);
    snow.visible = snowMat.opacity > 0.01;
    if (snow.visible) {
      for (let i = 0; i < SNOW; i++) {
        const f = snowFlakes[i];
        f.y -= 3.4 * dt;
        if (f.y < -6) f.y += 40;
        const k = i * 3;
        snowPos[k] = p.x + f.x + Math.sin(t * f.sway + f.phase) * 2.2;
        snowPos[k + 1] = p.y - 8 + f.y;
        snowPos[k + 2] = p.z + f.z + Math.cos(t * f.sway * 0.8 + f.phase) * 2.2;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
  });

  // ---- rainbow (when the rain clears) -------------------------------------
  const RB_BANDS = ['#ff5f5f', '#ff9d4d', '#ffe066', '#8fd06c', '#5ab8d4', '#7a8fe0', '#b07ad4'];
  const rbGeo = new THREE.BufferGeometry();
  {
    const SEGS = 60, R0 = 150, BW = 2.6;
    const pos = [], col = [], idx2 = [];
    const c = new THREE.Color();
    for (let b = 0; b <= RB_BANDS.length; b++) {
      const r = R0 + (b - RB_BANDS.length / 2) * BW;
      for (let s2 = 0; s2 <= SEGS; s2++) {
        const th = 0.06 * Math.PI + (0.88 * Math.PI * s2) / SEGS;
        pos.push(Math.cos(th) * r, Math.sin(th) * r, 0);
        c.set(RB_BANDS[Math.min(b, RB_BANDS.length - 1)]).multiplyScalar(0.5);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let b = 0; b < RB_BANDS.length; b++) {
      for (let s2 = 0; s2 < SEGS; s2++) {
        const a = b * (SEGS + 1) + s2, b2 = a + 1, c2 = a + SEGS + 1, d2 = c2 + 1;
        idx2.push(a, c2, b2, b2, c2, d2);
      }
    }
    rbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    rbGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    rbGeo.setIndex(idx2);
  }
  const rbMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const rainbowMesh = new THREE.Mesh(rbGeo, rbMat);
  {
    const dirH = new THREE.Vector3(-sunDir.x, 0, -sunDir.z).normalize();
    rainbowMesh.position.copy(dirH).multiplyScalar(190);
    rainbowMesh.position.y = -14;
    rainbowMesh.lookAt(0, 30, 0);
  }
  rainbowMesh.raycast = () => {};
  rainbowMesh.visible = false;
  scene.add(rainbowMesh);
  const rbState = { phase: -1 };
  updaters.push((dt) => {
    if (rbState.phase < 0) return;
    rbState.phase += dt;
    const p = rbState.phase;
    let o = 0;
    if (p < 4) o = (p / 4) * 0.45;
    else if (p < 22) o = 0.45;
    else if (p < 30) o = 0.45 * (1 - (p - 22) / 8);
    else { rbState.phase = -1; }
    rbMat.opacity = o * (1 - state.nightT);
    rainbowMesh.visible = rbMat.opacity > 0.01;
  });

  // ---- petal burst (played when the world is made whole) ------------------
  const PETALS = 150;
  const petalMat = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false,
  });
  const petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26, 0.2), petalMat, PETALS);
  petals.raycast = () => {};
  petals.visible = false;
  const petalData = [];
  for (let i = 0; i < PETALS; i++) petalData.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, s: 1, spin: 1 });
  petals.setColorAt(0, new THREE.Color('#ffffff'));
  scene.add(petals);
  const petalState = { start: -1 };
  const pM = new THREE.Matrix4(), pQ = new THREE.Quaternion(), pE = new THREE.Euler(),
    pV = new THREE.Vector3(), pS = new THREE.Vector3();
  updaters.push((dt, t) => {
    if (petalState.start < 0) return;
    const el = t - petalState.start;
    if (el > 9) { petalState.start = -1; petals.visible = false; return; }
    const fade = Math.min(1, Math.max(0.001, (9 - el) / 2));
    for (let i = 0; i < PETALS; i++) {
      const p = petalData[i];
      p.vy -= 3.2 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const gy = terrainHeight(p.x, p.z) + 0.08;
      if (p.y < gy) { p.y = gy; p.vy = 0; p.vx *= 0.9; p.vz *= 0.9; }
      const spin = t * p.spin;
      pE.set(spin, spin * 0.7, spin * 1.3);
      pQ.setFromEuler(pE);
      pS.setScalar(p.s * fade);
      petals.setMatrixAt(i, pM.compose(pV.set(p.x, p.y, p.z), pQ, pS));
    }
    petals.instanceMatrix.needsUpdate = true;
  });

  // ---- autumn leaves ------------------------------------------------------
  const LEAVES = 190;
  const leafMat = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
  });
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.18), leafMat, LEAVES);
  leaves.raycast = () => {};
  leaves.visible = false;
  const leafData = [];
  {
    const c = new THREE.Color();
    for (let i = 0; i < LEAVES; i++) {
      const sp = broadSpots[(rand() * broadSpots.length) | 0];
      leafData.push({
        sp, ox: (rand() - 0.5) * 3.4, oz: (rand() - 0.5) * 3.4,
        y: 0, vf: rand() * 0.5, phase: rand() * 9, spin: 1 + rand() * 3,
      });
      leafData[i].y = terrainHeight(sp.x, sp.z) + 3 + rand() * 2.5 * sp.s;
      c.setHSL(0.02 + rand() * 0.09, 0.85, 0.42 + rand() * 0.18);
      leaves.setColorAt(i, c);
    }
  }
  scene.add(leaves);
  const lM = new THREE.Matrix4(), lQ = new THREE.Quaternion(), lE = new THREE.Euler(),
    lV = new THREE.Vector3(), lS = new THREE.Vector3();
  updaters.push((dt, t) => {
    const targetO = state.season === 'autumn' ? 0.95 : 0;
    leafMat.opacity += (targetO - leafMat.opacity) * Math.min(1, dt * 1.2);
    leaves.visible = leafMat.opacity > 0.02;
    if (!leaves.visible) return;
    for (let i = 0; i < LEAVES; i++) {
      const l = leafData[i];
      l.y -= (0.55 + l.vf) * dt;
      const x = l.sp.x + l.ox + Math.sin(t * 1.3 + l.phase) * 0.6;
      const z = l.sp.z + l.oz + Math.cos(t * 1.1 + l.phase) * 0.6;
      const gy = terrainHeight(x, z) + 0.06;
      if (l.y < gy) l.y = terrainHeight(l.sp.x, l.sp.z) + 3 + rand() * 2.5 * l.sp.s;
      lE.set(t * l.spin, l.phase, t * l.spin * 0.6);
      lQ.setFromEuler(lE);
      leaves.setMatrixAt(i, lM.compose(lV.set(x, Math.max(l.y, gy), z), lQ, lS.setScalar(1)));
    }
    leaves.instanceMatrix.needsUpdate = true;
  });

  // ---- rabbits ------------------------------------------------------------
  const rabbitMat = instMaterial();
  rabbitMat.color.setScalar(0.55);
  const rabbits = [];
  {
    const bodyGeo = new THREE.IcosahedronGeometry(1, 0).scale(0.3, 0.24, 0.4);
    const headGeo = new THREE.IcosahedronGeometry(0.15, 0);
    const earGeo = new THREE.ConeGeometry(0.05, 0.26, 4);
    let placed = 0; guard = 0;
    while (placed < 8 && guard++ < 4000) {
      const x = (rand() * 2 - 1) * 150, z = (rand() * 2 - 1) * 150;
      if (!openGround(x, z, 13)) continue;
      if (nearPath(x, z, 3)) continue;
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, rabbitMat);
      body.position.y = 0.26;
      body.castShadow = true;
      const head = new THREE.Mesh(headGeo, rabbitMat);
      head.position.set(0, 0.46, 0.3);
      const earL = new THREE.Mesh(earGeo, rabbitMat);
      earL.position.set(-0.06, 0.66, 0.26);
      earL.rotation.x = -0.2;
      const earR = new THREE.Mesh(earGeo, rabbitMat);
      earR.position.set(0.06, 0.66, 0.26);
      earR.rotation.x = -0.2;
      g.add(body, head, earL, earR);
      g.position.set(x, terrainHeight(x, z), z);
      scene.add(g);
      addGaze(g, 'rabbits');
      rabbits.push({ g, x, z, tx: x, tz: z, state: 'idle', timer: rand() * 3, hopT: 0 });
      placed++;
    }
  }
  updaters.push((dt, t) => {
    for (const r of rabbits) {
      if (r.state === 'idle') {
        r.timer -= dt;
        if (r.timer <= 0) {
          for (let tries = 0; tries < 6; tries++) {
            const a = rand() * Math.PI * 2, d = 2 + rand() * 5;
            const nx = r.x + Math.cos(a) * d, nz = r.z + Math.sin(a) * d;
            if (!openGround(nx, nz, 12)) continue;
            r.tx = nx; r.tz = nz; r.state = 'hop'; r.hopT = 0;
            r.g.rotation.y = Math.atan2(nx - r.x, nz - r.z);
            break;
          }
          if (r.state === 'idle') r.timer = 1 + rand() * 2;
        }
      } else {
        r.hopT += dt / 0.48;
        const k = Math.min(r.hopT, 1);
        const x = r.x + (r.tx - r.x) * k, z = r.z + (r.tz - r.z) * k;
        r.g.position.set(x, terrainHeight(x, z) + Math.sin(Math.PI * k) * 0.5, z);
        if (k >= 1) {
          r.x = r.tx; r.z = r.tz;
          r.state = 'idle';
          r.timer = 0.3 + rand() * 2.4;
        }
      }
    }
  });

  addCategory('rabbits', {
    label: 'the rabbits', grayLevel: 0.55, countTotal: false,
    synonyms: ['rabbit', 'rabbits', 'bunny', 'bunnies', 'hare', 'hares'],
    phrase: 'and the rabbits ran',
    defaultColor: '#a98467',
    surfaces: [
      { type: 'tint', current: rabbitMat.color, apply: (c) => rabbitMat.color.copy(c) },
    ],
  });

  // ---- fish (leap once the river has a color) -----------------------------
  const fishMat = instMaterial();
  fishMat.color.setScalar(0.6);
  const fishGeo = new THREE.IcosahedronGeometry(1, 0).scale(0.16, 0.14, 0.5);
  const fishes = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(fishGeo, fishMat);
    m.visible = false;
    m.raycast = () => {};
    scene.add(m);
    fishes.push({ m, active: false, nextAt: 2 + i * 3, t0: 0, z0: 0, dir: 1 });
  }
  updaters.push((dt, t, playerPos) => {
    if (!state.fishOn) return;
    for (const f of fishes) {
      if (!f.active) {
        if (t > f.nextAt) {
          f.active = true;
          f.t0 = t;
          const pz = playerPos ? playerPos.z : 0;
          f.z0 = Math.max(-200, Math.min(200, pz + (rand() - 0.5) * 120));
          f.dir = rand() > 0.5 ? 1 : -1;
        }
        continue;
      }
      const k = (t - f.t0) / 1.05;
      if (k >= 1) {
        f.active = false;
        f.m.visible = false;
        f.nextAt = t + 2.5 + rand() * 6;
        continue;
      }
      const z = f.z0 + f.dir * 2.4 * k;
      f.m.visible = true;
      f.m.position.set(riverX(z), WATER_Y - 0.2 + Math.sin(Math.PI * k) * 1.9, z);
      f.m.rotation.x = f.dir * (Math.PI * k - Math.PI / 2);
    }
  });

  addCategory('fish', {
    label: 'the fish', grayLevel: 0.6, countTotal: false,
    synonyms: ['fish', 'fishes', 'trout', 'salmon', 'minnows'],
    phrase: 'and the fish leapt',
    defaultColor: '#9fb4c4',
    surfaces: [
      { type: 'tint', current: fishMat.color, apply: (c) => fishMat.color.copy(c) },
    ],
  });

  // ---- contact shadows ----------------------------------------------------
  const shadowSpots = treeSpots.map((s) => ({ x: s.x, z: s.z, r: 1.6 * s.s }))
    .concat(housePlots.map((p) => ({ x: p.x, z: p.z, r: 2.6 })));
  const shMat = new THREE.MeshBasicMaterial({
    color: '#000000', transparent: true, opacity: 0.09, depthWrite: false,
  });
  const shadows = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2), shMat, shadowSpots.length);
  shadowSpots.forEach((s, i) => {
    shadows.setMatrixAt(i, new THREE.Matrix4().compose(
      new THREE.Vector3(s.x, terrainHeight(s.x, s.z) + 0.05, s.z),
      new THREE.Quaternion(),
      new THREE.Vector3(s.r, 1, s.r),
    ));
  });
  shadows.instanceMatrix.needsUpdate = true;
  shadows.raycast = () => {};
  scene.add(shadows);

  // -------------------------------------------------------------------------
  const spawn = new THREE.Vector3(8, 0, 78);

  return {
    categories,
    gazeEntries,
    meshToKey,
    terrainHeight,
    WORLD_RADIUS,
    WATER_Y,
    scene,
    state,
    spawn,
    spawnLook: new THREE.Vector3(52, 4, 18),

    // ---- decree-driven hooks ----
    setNight(on) { state.nightTarget = on ? 1 : 0; },
    forceNight(on) { state.nightTarget = on ? 1 : 0; state.nightT = state.nightTarget; },
    setWeather(kind) {
      state.weather = kind;
      state.cloudDimTarget = kind === 'rain' ? 0.55 : kind === 'snow' ? 0.82 : 1;
    },
    lifeOnDecree(catKey, baseColor, rainbow, origin, now) {
      if (catKey === 'land') growGrass(origin, now);
      if (catKey === 'flowers') showButterflies(baseColor, rainbow, now);
      if (catKey === 'water') { sparkles.visible = true; state.fishOn = true; }
      if (catKey === 'trees') state.treesColored = true;
    },
    resetLife() {
      shrinkGrass();
      bflyL.visible = bflyR.visible = false;
      bflyShown = false;
      sparkles.visible = false;
      state.treesColored = false;
      state.fishOn = false;
      state.season = null;
      rbState.phase = -1;
      this.setNight(false);
      this.setWeather('clear');
    },
    setSeason(s) { state.season = s; },
    spawnRainbow() {
      if (state.nightT < 0.5) rbState.phase = 0;
    },
    flourish(center, now) {
      const c = new THREE.Color();
      for (let i = 0; i < PETALS; i++) {
        const p = petalData[i];
        const a = rand() * Math.PI * 2;
        const sp = 1.5 + rand() * 5;
        p.x = center.x + (rand() - 0.5) * 2;
        p.y = center.y + 0.5 + rand() * 1.5;
        p.z = center.z + (rand() - 0.5) * 2;
        p.vx = Math.cos(a) * sp;
        p.vy = 3.5 + rand() * 5;
        p.vz = Math.sin(a) * sp;
        p.s = 0.6 + rand() * 0.8;
        p.spin = 2 + rand() * 4;
        petals.setColorAt(i, c.setHSL(rand(), 0.75, 0.7));
      }
      petals.instanceColor.needsUpdate = true;
      petalState.start = now;
      petals.visible = true;
    },
    riverDistance(x, z) { return Math.abs(x - riverX(z)); },
    resolveHit(object, instanceId) {
      const key = meshToKey.get(object);
      if (!key) return null;
      return { key, surfIndex: meshToSurf.get(object), instanceId };
    },
    update(dt, t, playerPos) { for (const u of updaters) u(dt, t, playerPos); },
  };
}
