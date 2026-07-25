// Builds a monochrome realm and registers every paintable "category".
// A category owns one or more surfaces; decree.js animates their colors.
// The world also runs the day/night compositor, weather, and the small
// lives (grass, butterflies, deer, fireflies…) that color awakens.

import * as THREE from 'three';
import { makeNoise } from './noise.js';
import { getStyle, applyOutlines } from './styles.js';
import { makeScatterer, slopeAt } from './render/scatter.js';
import * as atmos from './render/atmos.js';

const WATER_Y = -1.5;
const WHITE = new THREE.Color('#ffffff');
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}
function mix(a, b, t) { return a + (b - a) * t; }

// ------------------------------------------------------------------- realms

export const REALMS = {
  valley: {
    key: 'valley', title: 'the valley', seed: 0,
    terrain: { scale: 0.012, amp: 9, rimStart: 120, rimEnd: 215, rimAmp: 34 },
    water: { type: 'river' },
    trees: { kind: 'temperate', count: 380 },
    grassCount: 1400, flowerClusters: 15,
    rocks: { count: 170, mesas: 0 },
    clouds: 9, houses: 'cone', deer: 6, rabbits: 8, mist: true,
    overrides: {},
  },
  desert: {
    key: 'desert', title: 'the desert', seed: 7,
    terrain: { scale: 0.008, amp: 5.5, rimStart: 110, rimEnd: 215, rimAmp: 40, dunes: true },
    water: { type: 'pond', x: -45, z: -25, r: 15 },
    trees: { kind: 'cacti', count: 200 },
    grassCount: 520, flowerClusters: 7,
    rocks: { count: 120, mesas: 6 },
    clouds: 4, houses: 'flat', deer: 0, rabbits: 6, mist: false,
    overrides: {
      land: { label: 'the sands', defaultColor: '#dcb878', synonyms: ['sands', 'dunes', 'dune'] },
      water: { label: 'the oasis', defaultColor: '#3aa8a0', synonyms: ['oasis', 'pool', 'pond'] },
      trees: { label: 'the cacti', defaultColor: '#5a8f5d', synonyms: ['cactus', 'cacti', 'saguaro', 'saguaros'] },
      rocks: { label: 'the mesas', defaultColor: '#c47b52', synonyms: ['mesa', 'mesas', 'butte', 'buttes'] },
      houses: { defaultColor: '#e0c9a0' },
      roofs: { defaultColor: '#a8552f' },
      path: { defaultColor: '#caa26c' },
    },
  },
  peaks: {
    key: 'peaks', title: 'the high peaks', seed: 13,
    terrain: { scale: 0.017, amp: 16, rimStart: 100, rimEnd: 215, rimAmp: 46, ridged: true },
    water: { type: 'river' },
    trees: { kind: 'alpine', count: 430 },
    grassCount: 700, flowerClusters: 8,
    rocks: { count: 220, mesas: 0 },
    clouds: 12, houses: 'steep', deer: 5, rabbits: 6, mist: true,
    overrides: {
      land: { label: 'the slopes', defaultColor: '#b7c9ae', synonyms: ['slopes'] },
      water: { defaultColor: '#7ec8e6' },
      trees: { defaultColor: '#2f6e52' },
      deer: { label: 'the goats', defaultColor: '#e3e3e3', synonyms: ['goat', 'goats', 'ibex'] },
      roofs: { defaultColor: '#7a4a2f' },
    },
  },
};

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

// Materials come from the active style; `instMaterial` is bound per build.
let STYLE = getStyle('storybook');
function instMaterial(extra = {}) {
  return STYLE.lit({ color: 0xffffff, ...extra });
}

// --------------------------------------------------------------------- build

export function buildWorld(scene, opts = {}) {
  const cfg = REALMS[opts.realm] || REALMS.valley;
  const N = makeNoise(20260724 + cfg.seed * 101);
  const rand = N.rand;
  STYLE = getStyle(opts.style);
  const style = STYLE;
  const GEO = style.geo;                       // round | angular | wispy | crystal
  const ink = (o, scale = 1) => {              // tag a mesh for the outline pass
    o.userData.ol = true;
    o.userData.olScale = scale;
    return o;
  };

  const categories = new Map();
  const gazeEntries = [];
  const meshToKey = new Map();     // mesh -> category key (gaze)
  const meshToSurf = new Map();    // mesh -> surface index (single-object decrees)
  const updaters = [];

  const state = {
    nightT: 0, nightTarget: 0, duskT: 0,
    weather: 'clear', season: null,
    cloudDim: 1, cloudDimTarget: 1,
    treesColored: false, fishOn: false,
  };

  function addCategory(key, def) {
    const ov = cfg.overrides[key];
    if (ov) {
      def = { ...def, ...ov,
        synonyms: [...def.synonyms, ...(ov.synonyms || [])] };
    }
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

  // ---- terrain math -------------------------------------------------------
  const T = cfg.terrain;
  const VILLAGE = { x: 52, z: 19, hx: 16, hz: 14, round: 9 };
  const POND = cfg.water.type === 'pond' ? cfg.water : null;

  function riverX(z) {
    return 30 * Math.sin(z * 0.015) + 10 * Math.sin(z * 0.04);
  }
  function waterDist(x, z) {
    if (POND) return Math.hypot(x - POND.x, z - POND.z) - POND.r;
    return Math.abs(x - riverX(z));
  }
  function villageMask(x, z) {
    const dx = Math.max(Math.abs(x - VILLAGE.x) - VILLAGE.hx, 0);
    const dz = Math.max(Math.abs(z - VILLAGE.z) - VILLAGE.hz, 0);
    return 1 - smoothstep(0, VILLAGE.round, Math.hypot(dx, dz));
  }

  function terrainHeight(x, z) {
    let h = N.fbm(x * T.scale, z * T.scale, 4) * T.amp;
    if (T.dunes) h += Math.sin(x * 0.045 + N.fbm(x * 0.01, z * 0.01, 2) * 2.5) * 2.2;
    if (T.ridged) {
      const r2 = 1 - Math.abs(N.fbm(x * 0.03 + 9, z * 0.03 - 4, 3));
      h += r2 * r2 * 10;
    }
    const r = Math.hypot(x, z);
    const rim = smoothstep(T.rimStart, T.rimEnd, r);
    h += rim * rim * T.rimAmp;

    const vm = villageMask(x, z);
    if (vm > 0) h = mix(h, 2.0 + 0.4 * N.fbm(x * 0.1, z * 0.1, 2), vm * 0.9);

    // gentle clearing where the god first stands
    const sm = 1 - smoothstep(8, 32, Math.hypot(x - 8, z - 78));
    if (sm > 0) h = mix(h, 2.2 + 0.3 * N.fbm(x * 0.09, z * 0.09, 2), sm * 0.85);

    if (POND) {
      const d = Math.hypot(x - POND.x, z - POND.z);
      const m = 1 - smoothstep(0, POND.r + 7, d);
      if (m > 0) h = mix(h, -3.2 + 0.5 * N.fbm(x * 0.05, z * 0.05, 2), Math.pow(m, 1.3));
    } else {
      const d = Math.abs(x - riverX(z));
      const rm = 1 - smoothstep(0, 11, d);
      if (rm > 0) h = mix(h, -3.4 + 0.6 * N.fbm(x * 0.05, z * 0.05, 2), Math.pow(rm, 1.4));
    }
    return h;
  }

  function terrainNormal(x, z) {
    const e = 0.6;
    const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
    const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
    return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
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

  // ---- lights -------------------------------------------------------------
  const LR = style.light;
  const hemi = new THREE.HemisphereLight(0xdcdcdc, 0x707070, 0.95 * LR.hemi);
  scene.add(hemi);
  if (LR.ambient) scene.add(new THREE.AmbientLight(0xffffff, LR.ambient));

  const sunDir = new THREE.Vector3(0.45, 0.62, -0.64).normalize();
  const moonDir = new THREE.Vector3(-0.55, 0.52, 0.5).normalize();
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5 * LR.dir);
  sunLight.position.copy(sunDir).multiplyScalar(180);
  sunLight.castShadow = LR.dir > 0.2;
  const sms = opts.shadowMapSize || 2048;
  sunLight.shadow.mapSize.set(sms, sms);
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
  const styleSky = style.skyTint ? new THREE.Color(style.skyTint) : null;
  const skyMix = style.skyMix || 0;
  scene.background = new THREE.Color().copy(skyBase);
  scene.fog = new THREE.Fog(skyBase.clone(), style.fog[0], style.fog[1]);

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
    uSunDir: { value: new THREE.Vector3(0.45, 0.62, -0.64).normalize() },
    uSunColor: { value: new THREE.Color('#ffe6b0') },
    uSunAmt: { value: 1 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(880, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: domeUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir;
        void main() { vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir;
        uniform vec3 uSunColor; uniform float uSunAmt;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float t = pow(clamp(d.y, 0.0, 1.0), 0.62);
          vec3 col = mix(uHorizon, uTop, t);
          // a band of haze thickening into the horizon line
          float band = exp(-max(d.y, 0.0) * 18.0);
          col = mix(col, uHorizon, band * 0.3);
          // the sun's glow spreads through the sky around it
          float s = max(dot(d, uSunDir), 0.0);
          col += uSunColor * (pow(s, 16.0) * 0.28 + pow(s, 4.0) * 0.045) * uSunAmt;
          gl_FragColor = vec4(col, 1.0);
        }`,
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
      // pushed past white so the sun actually blooms in the post chain
      { type: 'tint', current: sunMat.color, apply: (c) => {
        sunMat.color.copy(c).multiplyScalar(3.4);
        haloMat.color.copy(c).multiplyScalar(2.2);
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
    const step = dt / 8;
    state.nightT += Math.min(Math.abs(target - state.nightT), step) * Math.sign(target - state.nightT);
    const nt = state.nightT;
    const dusk = Math.pow(Math.sin(Math.PI * nt), 1.6);
    state.duskT = dusk;

    tC2.copy(skyBase).multiplyScalar(0.1).lerp(NIGHT_SKY, 0.75);
    tC1.copy(skyBase).lerp(tC2, nt).lerp(DUSK_TOP, dusk * 0.3);
    if (styleSky) tC1.lerp(styleSky, skyMix);
    domeUniforms.uTop.value.copy(tC1);
    tC3.copy(skyBase).lerp(WHITE, 0.26);
    tC2.copy(skyBase).multiplyScalar(0.16).lerp(NIGHT_SKY, 0.55).lerp(WHITE, 0.06);
    tC3.lerp(tC2, nt).lerp(DUSK_HORIZON, dusk * 0.55);
    if (styleSky) tC3.lerp(styleSky, skyMix * (style.darkWorld ? 1 : 0.72));
    domeUniforms.uHorizon.value.copy(tC3);
    scene.background.copy(tC3);
    scene.fog.color.copy(tC3);

    hemi.color.copy(tC1.copy(skyBase).lerp(WHITE, 0.45)
      .lerp(NIGHT_HEMI, nt * 0.85).lerp(DUSK_LIGHT, dusk * 0.25));
    hemi.intensity = (0.95 - 0.5 * nt) * LR.hemi;
    sunLight.color.copy(tC1.copy(sunLightBase).lerp(NIGHT_LIGHT, nt).lerp(DUSK_LIGHT, dusk * 0.55));
    sunLight.intensity = (1.5 - 0.95 * nt) * LR.dir;

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

    if (playerPos) {
      const sx = Math.round(playerPos.x / 8) * 8, sz = Math.round(playerPos.z / 8) * 8;
      lightDir.lerpVectors(sunDir, moonDir, nt).normalize();
      sunLight.position.set(sx + lightDir.x * 180, lightDir.y * 180, sz + lightDir.z * 180);
      sunLight.target.position.set(sx, 0, sz);

      // the sky's own sun glow, and the aerial perspective, share one direction
      domeUniforms.uSunDir.value.copy(lightDir);
      domeUniforms.uSunColor.value.copy(sunMat.color).multiplyScalar(0.34);
      domeUniforms.uSunAmt.value = (1 - nt) * 0.9 + 0.1;
      // Haze sits in the valley floor and thins fast with height, so ridges
      // stay crisp while the distance goes soft — and it never whites out the
      // near field.
      atmos.update(playerPos, {
        sunDir: lightDir,
        fogColor: tC2.copy(skyBase).lerp(WHITE, 0.16).lerp(NIGHT_SKY, nt * 0.8),
        sunFogColor: tC1.copy(sunMat.color).lerp(WHITE, 0.2),
        density: (style.fogDensity ?? 0.0011) * (1 + 0.9 * state.duskT),
        height: 8,
        falloff: 0.04,
        desat: style.fogDesat ?? 0.28,
        amount: style.atmosphere ?? 1,
      });
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

  // Per-vertex modulation, in RGB rather than a single scalar, so the ground
  // can do what real ground does: darken where it folds in on itself, grey
  // toward rock where it is too steep to hold soil, drink darker at the
  // water's edge, and break up across three scales so no two acres match.
  const shade = new Float32Array(vCount * 3);
  const vJitter = new Float32Array(vCount);
  const tNor = tGeo.attributes.normal;
  const tCol = new Float32Array(vCount * 3);
  const CLIFF = [0.74, 0.71, 0.66];      // what steep ground tends toward
  for (let i = 0; i < vCount; i++) {
    const x = tPos.getX(i), z = tPos.getZ(i);
    const y = tPos.getY(i);
    const ny = tNor.getY(i);
    vJitter[i] = rand();

    // curvature AO: compare this point to the ground around it. Hollows sit
    // in their own shadow; ridges catch the sky.
    let avg = 0;
    for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6], [11, 11], [-11, -11]]) {
      avg += terrainHeight(x + dx, z + dz);
    }
    avg /= 6;
    const ao = Math.min(1.08, Math.max(0.55, 0.92 + (y - avg) * 0.05));

    // slope: sun-facing tilt plus a lift with altitude
    const slope = Math.min(0.74 + 0.3 * smoothstep(0.5, 1, ny) + 0.0035 * Math.max(y, 0), 1.12);

    // three scales of macro variation so large areas never read as one flat wash
    const m1 = N.fbm(x * 0.0075 + 13, z * 0.0075 - 8, 3) * 0.1;
    const m2 = N.fbm(x * 0.031 - 5, z * 0.031 + 21, 2) * 0.055;
    const m3 = (vJitter[i] - 0.5) * 0.05;
    const macro = 1 + m1 + m2 + m3;

    // cliffs: too steep for soil
    const cliff = smoothstep(0.62, 0.28, ny);
    // wetness: the shore drinks, and darkens
    const wet = 1 - smoothstep(0, 7, Math.abs(waterDist(x, z))) * 1;
    const wetK = Math.max(0, wet) * (y < 6 ? 1 : 0);

    const base = ao * slope * macro;
    for (let c = 0; c < 3; c++) {
      let v = base;
      v = v * (1 - cliff) + base * CLIFF[c] * 1.06 * cliff;   // grey toward rock
      v *= 1 - 0.28 * wetK;                                    // darker when wet
      shade[i * 3 + c] = v;
    }
    const g = 0.64 * base;
    tCol[i * 3] = g * (1 - cliff * 0.1);
    tCol[i * 3 + 1] = g * (1 - cliff * 0.06);
    tCol[i * 3 + 2] = g;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  // groundTint multiplies the decreed land colour, so dark styles keep a
  // recessive floor while their lit forms stay luminous
  const terrain = new THREE.Mesh(tGeo, style.lit({
    vertexColors: true,
    ...(style.groundTint ? { color: new THREE.Color(style.groundTint) } : {}),
  }));
  terrain.receiveShadow = true;
  scene.add(terrain);
  addGaze(terrain, 'land');

  // ---- placement helpers --------------------------------------------------
  function openGround(x, z, waterPad = 10, villagePad = 0.12) {
    if (Math.hypot(x, z) > 190) return false;
    if (waterDist(x, z) < waterPad) return false;
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
    if (POND) {
      ctrl[6].set(-28, 0, -14);
      ctrl[7].set(POND.x + POND.r + 6, 0, POND.z + 4);
    }
    const curve = new THREE.CatmullRomCurve3(ctrl);
    for (let i = 0; i <= 130; i++) pathPts.push(curve.getPoint(i / 130));
  }
  function nearPath(x, z, d) {
    for (const p of pathPts) if (Math.hypot(p.x - x, p.z - z) < d) return true;
    return false;
  }

  // ---- grass (hidden until the land is given color) -----------------------
  const SG = makeScatterer({ noise: N, rand });
  const grassSpots = SG.scatter({
    count: cfg.grassCount,
    extent: 186, cell: 4.4,
    allow: (x, z) => openGround(x, z, 10) && !nearPath(x, z, 2.2),
    // thick in the meadows, thinning on slopes and up toward bare rock
    density: (x, z) => {
      const meadow = SG.grove(x, z, 0.016, 0.45, 1.4);
      const flat = 1 - smoothstep(0.45, 1.0, slopeAt(terrainHeight, x, z));
      const low = 1 - smoothstep(24, 42, terrainHeight(x, z));
      return meadow * flat * low;
    },
    sizeFn: (r) => 0.55 + r * 1.0,
    heroChance: 0,
  }).map((sp) => ({ ...sp, phase: sp.seed * 7 }));
  let guard = 0;
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

  const grassState = { growing: false, growStart: 0, delays: null, grown: false, maxDelay: 0 };
  const gM = new THREE.Matrix4(), gQ = new THREE.Quaternion(),
    gP = new THREE.Vector3(), gS = new THREE.Vector3(), gE = new THREE.Euler();
  updaters.push((dt, t) => {
    if (!grassState.growing && !grassState.grown) return;
    for (let i = 0; i < grassSpots.length; i++) {
      const sp = grassSpots[i];
      let scale = sp.s;
      if (grassState.growing) {
        const gt = (t - grassState.growStart - grassState.delays[i]) / 0.9;
        if (gt <= 0) continue;
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

  // ---- water (river ribbon or oasis pond) ---------------------------------
  // Water sells itself at two places: the grazing angle, where it turns to
  // sky, and the shoreline, where it goes shallow and breaks into foam.
  let waterMat;
  if (style.richWater) {
    const wu = {
      uColor: { value: new THREE.Color('#c4c4c4') },
      uSky: { value: new THREE.Color('#dfe9f5') },
      uSunDir: { value: new THREE.Vector3(0.45, 0.62, -0.64).normalize() },
      uSunColor: { value: new THREE.Color('#ffe6b0') },
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uNight: { value: 0 },
    };
    waterMat = new THREE.ShaderMaterial({
      uniforms: wu, transparent: true, fog: false,
      vertexShader: `
        varying vec3 vW; varying float vShore;
        uniform float uTime;
        void main(){
          vW = (modelMatrix * vec4(position, 1.0)).xyz;
          // distance from the ribbon's centre line drives the shallows
          vShore = abs(uv.x - 0.5) * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor, uSky, uSunDir, uSunColor, uCamPos;
        uniform float uTime, uNight;
        varying vec3 vW; varying float vShore;
        void main(){
          vec3 V = normalize(uCamPos - vW);
          // ripple normal, cheap but enough to break the mirror
          float n1 = sin(vW.x * 1.6 + uTime * 1.7);
          float n2 = sin(vW.z * 2.1 - uTime * 1.3);
          float n3 = sin((vW.x + vW.z) * 0.9 + uTime * 0.8);
          vec3 Nn = normalize(vec3((n1 + n3) * 0.09, 1.0, (n2 + n3) * 0.09));

          // fresnel: transparent looking down, sky-bright at a glance
          float f = pow(1.0 - clamp(dot(V, Nn), 0.0, 1.0), 3.2);
          f = clamp(f * 0.92 + 0.06, 0.0, 1.0);

          // shallow water keeps its colour; deep water darkens toward it
          float deep = smoothstep(0.15, 0.95, 1.0 - vShore);
          vec3 body = mix(uColor * 1.28, uColor * 0.52, deep);

          vec3 col = mix(body, uSky, f * (1.0 - uNight * 0.55));

          // a specular glint where the sun catches a wave face
          float spec = pow(max(dot(reflect(-V, Nn), uSunDir), 0.0), 90.0);
          col += uSunColor * spec * 1.4 * (1.0 - uNight);

          // foam gathers at the edge, breathing in and out
          float foam = smoothstep(0.72, 1.0, vShore + n3 * 0.05 + n1 * 0.03);
          col = mix(col, vec3(0.95, 0.97, 1.0), foam * 0.55);

          gl_FragColor = vec4(col, mix(0.82, 0.96, f) - foam * 0.12);
        }`,
    });
    Object.defineProperty(waterMat, 'color', { get: () => wu.uColor.value });
    waterMat.userData.u = wu;
  } else {
    waterMat = style.water();
    waterMat.color.set('#c4c4c4');
  }
  let wGeo;
  if (POND) {
    wGeo = new THREE.CircleGeometry(POND.r, 30).rotateX(-Math.PI / 2)
      .translate(POND.x, WATER_Y, POND.z);
  } else {
    const wCols = 9, wRows = 118, wWidth = 8.6;
    wGeo = new THREE.BufferGeometry();
    const wVerts = new Float32Array(wCols * wRows * 3);
    const wUv = new Float32Array(wCols * wRows * 2);
    for (let r = 0; r < wRows; r++) {
      const z = -234 + r * 4;
      for (let cI = 0; cI < wCols; cI++) {
        const x = riverX(z) - wWidth / 2 + (wWidth * cI) / (wCols - 1);
        const k = (r * wCols + cI) * 3;
        wVerts[k] = x; wVerts[k + 1] = WATER_Y; wVerts[k + 2] = z;
        const uk = (r * wCols + cI) * 2;
        wUv[uk] = cI / (wCols - 1);          // across the ribbon: drives the shallows
        wUv[uk + 1] = r / (wRows - 1);
      }
    }
    wGeo.setAttribute('uv', new THREE.BufferAttribute(wUv, 2));
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
  }
  const water = new THREE.Mesh(wGeo, waterMat);
  scene.add(water);
  addGaze(water, 'water');

  const wArr = wGeo.attributes.position.array;
  const wBase = wArr.slice();
  updaters.push((dt, t, playerPos) => {
    for (let i = 0; i < wArr.length; i += 3) {
      const x = wBase[i], z = wBase[i + 2];
      wArr[i + 1] = WATER_Y
        + Math.sin(z * 0.35 + t * 1.7) * 0.09
        + Math.sin(x * 0.8 + z * 0.11 + t * 2.4) * 0.06;
    }
    wGeo.attributes.position.needsUpdate = true;
    if (!waterMat.userData.u) wGeo.computeVertexNormals();
    const wu = waterMat.userData.u;
    if (wu) {
      wu.uTime.value = t;
      if (playerPos) wu.uCamPos.value.copy(playerPos);
      wu.uSky.value.copy(domeUniforms.uHorizon.value).lerp(WHITE, 0.12);
      wu.uSunDir.value.copy(domeUniforms.uSunDir.value);
      wu.uSunColor.value.copy(sunMat.color).multiplyScalar(0.3);
      wu.uNight.value = state.nightT;
    }
  });

  addCategory('water', {
    label: 'the river', grayLevel: 0.77,
    synonyms: ['water', 'waters', 'river', 'stream', 'brook', 'creek', 'lake'],
    phrase: POND ? 'and the water shone' : 'and the river ran',
    defaultColor: '#4fb0c6',
    surfaces: [
      { type: 'tint', current: waterMat.color, apply: (c) => {
        waterMat.color.copy(c);
        if (waterMat.specular) waterMat.specular.copy(c).lerp(WHITE, 0.6);
      } },
    ],
  });

  // water sparkles (awaken when the water is colored)
  const sparkGeo = new THREE.PlaneGeometry(0.3, 0.3).rotateX(-Math.PI / 2);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const SPARKS = POND ? 40 : 110;
  const sparkles = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARKS);
  const sparkData = [];
  for (let i = 0; i < SPARKS; i++) {
    let x, z;
    if (POND) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * (POND.r - 1.5);
      x = POND.x + Math.cos(a) * rr; z = POND.z + Math.sin(a) * rr;
    } else {
      z = -200 + rand() * 400;
      x = riverX(z) + (rand() - 0.5) * 6.6;
    }
    sparkData.push({ phase: rand() * 9, speed: 1.5 + rand() * 2.5 });
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

  // ---- trees / cacti ------------------------------------------------------
  // Groves, not confetti: a density field carves clearings and thickets, the
  // grid keeps spacing believable, steep ground sheds trees, and one in
  // twenty is a hero that towers over its neighbours.
  const S = makeScatterer({ noise: N, rand });
  const treeSpots = S.scatter({
    count: cfg.trees.count,
    extent: 196,
    cell: cfg.trees.kind === 'cacti' ? 15 : 11,
    allow: (x, z) => openGround(x, z, 12) && !nearPath(x, z, 4.5),
    density: (x, z) => {
      const g = S.grove(x, z, 0.011, 0.12, 2.0);
      const steep = slopeAt(terrainHeight, x, z);
      const shed = 1 - smoothstep(0.55, 1.15, steep);       // trees give up on cliffs
      const high = 1 - smoothstep(28, 46, terrainHeight(x, z)); // and near the treeline
      return g * shed * high;
    },
    sizeFn: (r) => 0.62 + Math.pow(r, 1.7) * 0.9,           // many small, few large
    heroChance: 0.045,
    heroScale: 1.95,
  });
  // species cluster into stands rather than salt-and-peppering the whole wood
  const temperate = cfg.trees.kind === 'temperate';
  const isConifer = (sp) =>
    N.fbm(sp.x * 0.006 - 61, sp.z * 0.006 + 44, 2) + (sp.seed - 0.5) * 0.5 > -0.05;
  const pineSpots = cfg.trees.kind === 'cacti' ? []
    : temperate ? treeSpots.filter(isConifer) : treeSpots;
  const broadSpots = temperate ? treeSpots.filter((sp) => !isConifer(sp)) : [];
  const cactusSpots = cfg.trees.kind === 'cacti' ? treeSpots : [];

  function treeMatrices(spots) {
    return spots.map((sp) => new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z) - 0.15, sp.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sp.rot, 0)),
      new THREE.Vector3(sp.s, sp.s, sp.s),
    ));
  }

  // Each style grows its own kind of tree.
  const blob = (r, seg) => new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
  const pineGeo = GEO === 'crystal' ? mergeGeoms([
    new THREE.OctahedronGeometry(2.0, 0).scale(0.8, 1.5, 0.8).translate(0, 4.0, 0),
    new THREE.OctahedronGeometry(1.2, 0).scale(0.8, 1.6, 0.8).translate(0, 6.2, 0),
  ]) : GEO === 'wispy' ? mergeGeoms([
    new THREE.ConeGeometry(1.15, 4.6, 7).translate(0, 4.0, 0),
    new THREE.ConeGeometry(0.75, 3.0, 7).translate(0, 6.4, 0),
    new THREE.ConeGeometry(0.4, 1.9, 6).translate(0, 8.0, 0),
  ]) : GEO === 'angular' ? mergeGeoms([
    new THREE.ConeGeometry(1.95, 3.4, 6).translate(0, 3.4, 0),
    new THREE.ConeGeometry(1.3, 2.6, 6).translate(0, 5.2, 0),
  ]) : mergeGeoms([
    new THREE.ConeGeometry(1.9, 3.4, 10).translate(0, 3.4, 0),
    new THREE.ConeGeometry(1.25, 2.6, 10).translate(0, 5.2, 0),
  ]);

  const broadGeo = GEO === 'crystal' ? mergeGeoms([
    new THREE.OctahedronGeometry(1.9, 0).translate(0, 4.2, 0),
    new THREE.OctahedronGeometry(1.1, 0).translate(1.0, 3.4, 0.3),
    new THREE.OctahedronGeometry(0.9, 0).translate(-0.9, 3.6, -0.4),
  ]) : GEO === 'wispy' ? mergeGeoms([
    blob(1.35, 7).scale(1.25, 0.55, 1.25).translate(0, 4.7, 0),
    blob(1.0, 7).scale(1.3, 0.5, 1.3).translate(0.5, 5.6, -0.2),
    blob(0.8, 6).scale(1.4, 0.45, 1.4).translate(-0.6, 6.3, 0.3),
  ]) : GEO === 'angular' ? mergeGeoms([
    new THREE.IcosahedronGeometry(1.75, 0).scale(1, 0.9, 1).translate(0, 3.9, 0),
    new THREE.IcosahedronGeometry(1.15, 0).translate(0.95, 3.3, 0.4),
    new THREE.IcosahedronGeometry(1.0, 0).translate(-0.85, 3.4, -0.35),
    new THREE.IcosahedronGeometry(0.9, 0).translate(0.1, 4.9, -0.5),
  ]) : mergeGeoms([
    blob(1.7, 9).scale(1, 0.9, 1).translate(0, 3.9, 0),
    blob(1.2, 9).translate(0.95, 3.3, 0.4),
    blob(1.05, 9).translate(-0.85, 3.4, -0.35),
    blob(0.95, 9).translate(0.1, 4.9, -0.5),
  ]);

  const trunkGeo = GEO === 'wispy'
    ? new THREE.CylinderGeometry(0.12, 0.22, 4.0, 7).translate(0, 2.0, 0)
    : new THREE.CylinderGeometry(0.16, 0.28, 2.6, GEO === 'angular' ? 5 : 8)
      .translate(0, 1.3, 0);
  const cactusGeo = mergeGeoms([
    new THREE.CylinderGeometry(0.42, 0.5, 3.4, 10).translate(0, 1.7, 0),
    new THREE.SphereGeometry(0.44, 9, 6).translate(0, 3.4, 0),
    new THREE.CylinderGeometry(0.24, 0.26, 1.2, 8).rotateZ(Math.PI / 2).translate(0.75, 1.7, 0),
    new THREE.CylinderGeometry(0.24, 0.26, 1.1, 8).translate(1.28, 2.35, 0),
    new THREE.SphereGeometry(0.26, 8, 5).translate(1.28, 2.9, 0),
    new THREE.CylinderGeometry(0.22, 0.24, 1.0, 8).rotateZ(-Math.PI / 2).translate(-0.68, 2.3, 0),
    new THREE.CylinderGeometry(0.22, 0.24, 0.9, 8).translate(-1.14, 2.85, 0),
    new THREE.SphereGeometry(0.24, 8, 5).translate(-1.14, 3.3, 0),
  ]);

  const treeSurfs = [];
  let pines = null, broads = null, cacti = null, trunks = null;
  if (pineSpots.length) {
    pines = makeInstanced(pineGeo, pineSpots.length, treeMatrices(pineSpots), 0.5, 0.14);
    pines.mesh.castShadow = true;
    ink(pines.mesh, 1.6);
    scene.add(pines.mesh);
    addGaze(pines.mesh, 'trees');
    meshToSurf.set(pines.mesh, treeSurfs.length);
    treeSurfs.push({ type: 'inst', mesh: pines.mesh, positions: pines.positions,
      variance: { h: 0.035, s: 0.12, l: 0.09 } });
  }
  if (broadSpots.length) {
    broads = makeInstanced(broadGeo, broadSpots.length, treeMatrices(broadSpots), 0.56, 0.14);
    broads.mesh.castShadow = true;
    ink(broads.mesh, 1.6);
    scene.add(broads.mesh);
    addGaze(broads.mesh, 'trees');
    meshToSurf.set(broads.mesh, treeSurfs.length);
    treeSurfs.push({ type: 'inst', mesh: broads.mesh, positions: broads.positions,
      variance: { h: 0.05, s: 0.12, l: 0.1 } });
  }
  if (cactusSpots.length) {
    cacti = makeInstanced(cactusGeo, cactusSpots.length, treeMatrices(cactusSpots), 0.55, 0.12);
    cacti.mesh.castShadow = true;
    ink(cacti.mesh, 1.2);
    scene.add(cacti.mesh);
    addGaze(cacti.mesh, 'trees');
    meshToSurf.set(cacti.mesh, treeSurfs.length);
    treeSurfs.push({ type: 'inst', mesh: cacti.mesh, positions: cacti.positions,
      variance: { h: 0.03, s: 0.12, l: 0.08 } });
  }

  addCategory('trees', {
    label: 'the trees', grayLevel: 0.53, singular: 'tree',
    synonyms: ['tree', 'trees', 'forest', 'forests', 'leaves', 'canopy', 'foliage', 'pines'],
    phrase: 'and the trees rose',
    defaultColor: '#2f9e63',
    // seasons repaint this surface index (the broadleaf canopies)
    seasonSurf: broadSpots.length ? treeSurfs.length - 1 : -1,
    surfaces: treeSurfs,
  });

  if (pineSpots.length || broadSpots.length) {
    const trunkMats = treeMatrices(pineSpots).concat(treeMatrices(broadSpots));
    trunks = makeInstanced(trunkGeo, trunkMats.length, trunkMats, 0.42, 0.08);
    trunks.mesh.castShadow = true;
    ink(trunks.mesh, 0.5);
    scene.add(trunks.mesh);
    addGaze(trunks.mesh, 'bark');
    meshToSurf.set(trunks.mesh, 0);
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
  }

  // ---- rocks (and mesas) --------------------------------------------------
  // boulders gather where the ground breaks: on steep faces and along shores
  const rockSpots = S.scatter({
    count: cfg.rocks.count,
    extent: 196, cell: 13,
    allow: (x, z) => Math.hypot(x, z) < 196 && !nearPath(x, z, 3)
      && villageMask(x, z) < 0.12 && waterDist(x, z) > 4,
    density: (x, z) => {
      const steep = smoothstep(0.35, 1.0, slopeAt(terrainHeight, x, z));
      const shore = 1 - smoothstep(5, 16, waterDist(x, z));
      const stray = S.grove(x, z, 0.02, -0.35, 2.6) * 0.5;
      return Math.min(1, steep * 0.9 + shore * 0.8 + stray);
    },
    sizeFn: (r) => 0.35 + Math.pow(r, 2.1) * 1.9,
    heroChance: 0.07, heroScale: 2.6,
  });
  const rockMatrices = rockSpots.map((sp) => {
    const s = sp.s;
    return new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z) - 0.3 * s, sp.z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(sp.seed * 0.5, sp.rot, (sp.seed * 7 % 1) * 0.5)),
      new THREE.Vector3(s * (0.8 + sp.seed * 0.5), s * (0.5 + sp.seed * 0.45), s),
    );
  });
  const rockGeo = GEO === 'crystal' ? new THREE.OctahedronGeometry(1, 0)
    : GEO === 'angular' ? new THREE.IcosahedronGeometry(1, 0)
      : new THREE.SphereGeometry(1, 8, 6);
  const rocks = makeInstanced(rockGeo, rockMatrices.length, rockMatrices, 0.58, 0.12);
  rocks.mesh.castShadow = true;
  ink(rocks.mesh, 1.1);
  scene.add(rocks.mesh);
  addGaze(rocks.mesh, 'rocks');
  meshToSurf.set(rocks.mesh, 0);
  const rockSurfs = [
    { type: 'inst', mesh: rocks.mesh, positions: rocks.positions,
      variance: { h: 0.02, s: 0.08, l: 0.1 } },
  ];
  if (cfg.rocks.mesas) {
    const mesaGeo = new THREE.CylinderGeometry(0.7, 1, 1, 9);
    const mesaMats = [];
    for (let i = 0; i < cfg.rocks.mesas; i++) {
      const a = rand() * Math.PI * 2, d = 105 + rand() * 65;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const s = 12 + rand() * 10;
      mesaMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z) + s * 0.3, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)),
        new THREE.Vector3(s, s * (0.8 + rand() * 0.5), s),
      ));
    }
    const mesas = makeInstanced(mesaGeo, mesaMats.length, mesaMats, 0.52, 0.1);
    mesas.mesh.castShadow = true;
    ink(mesas.mesh, 6);
    scene.add(mesas.mesh);
    addGaze(mesas.mesh, 'rocks');
    meshToSurf.set(mesas.mesh, 1);
    rockSurfs.push({ type: 'inst', mesh: mesas.mesh, positions: mesas.positions,
      variance: { h: 0.015, s: 0.1, l: 0.09 } });
  }

  addCategory('rocks', {
    label: 'the stones', grayLevel: 0.58, singular: 'stone',
    synonyms: ['rock', 'rocks', 'stone', 'stones', 'boulder', 'boulders'],
    phrase: 'and the stones sat',
    defaultColor: '#98a0a8',
    surfaces: rockSurfs,
  });

  // ---- flowers ------------------------------------------------------------
  const flowerMatrices = [];
  const clusters = [];
  guard = 0;
  while (clusters.length < cfg.flowerClusters && guard++ < 4000) {
    const x = (rand() * 2 - 1) * 170, z = (rand() * 2 - 1) * 170;
    if (!openGround(x, z, 13)) continue;
    if (slopeAt(terrainHeight, x, z) > 0.55) continue;   // meadows, not slopes
    clusters.push({ x, z });
  }
  // drifts rather than discs: elongated, denser at the heart, ragged at the edge
  for (const cl of clusters) {
    const n = 40 + (rand() * 45) | 0;
    const dir = rand() * Math.PI * 2;
    const stretch = 1.5 + rand() * 1.8;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = Math.pow(rand(), 0.7) * 8;
      const ox = Math.cos(a) * r * stretch, oz = Math.sin(a) * r;
      const x = cl.x + ox * Math.cos(dir) - oz * Math.sin(dir);
      const z = cl.z + ox * Math.sin(dir) + oz * Math.cos(dir);
      if (!openGround(x, z, 9)) continue;
      if (slopeAt(terrainHeight, x, z) > 0.75) continue;
      const s = 0.6 + rand() * 0.9;
      flowerMatrices.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z), z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0)),
        new THREE.Vector3(s, s, s),
      ));
    }
  }
  const flowerGeo = mergeGeoms([
    new THREE.CylinderGeometry(0.025, 0.035, 0.4, 5).translate(0, 0.2, 0),
    new THREE.SphereGeometry(0.16, 7, 5).translate(0, 0.46, 0),
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
  const BFLIES = clusters.length ? 34 : 0;
  const bflyWing = new THREE.BufferGeometry();
  bflyWing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, 0.42, 0.1, -0.16, 0.42, 0.1, 0.2,
  ]), 3));
  bflyWing.computeVertexNormals();
  const bflyMatL = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bflyL = new THREE.InstancedMesh(bflyWing, bflyMatL, Math.max(BFLIES, 1));
  const bflyR = new THREE.InstancedMesh(bflyWing, bflyMatL, Math.max(BFLIES, 1));
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
    if (!BFLIES) return;
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
    const sp = treeSpots[(rand() * treeSpots.length) | 0] || { x: 0, z: 0 };
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
  ].slice(0, cfg.houses === 'flat' ? 5 : 7);
  const wallSurf = [], roofSurf = [];
  const windowMats = [];
  const houseGroup = new THREE.Group();
  // round storybook cottages instead of boxes
  const wallGeo = new THREE.CylinderGeometry(2.15, 2.4, 2.6, 9);
  const roofGeo = cfg.houses === 'flat'
    ? new THREE.CylinderGeometry(2.5, 2.65, 0.4, 9)
    : new THREE.ConeGeometry(3.0, cfg.houses === 'steep' ? 2.8 : 1.9, 9);
  const chimGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.0, 6);
  const winGeo = new THREE.PlaneGeometry(0.55, 0.7);
  const doorGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-0.34, 0); s.lineTo(-0.34, 0.75);
    s.absarc(0, 0.75, 0.34, Math.PI, 0, true);
    s.lineTo(0.34, 0); s.lineTo(-0.34, 0);
    return new THREE.ShapeGeometry(s);
  })();
  const smokeGeo = new THREE.SphereGeometry(0.22, 6, 5);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: '#f4f4f2', transparent: true, opacity: 0.3, depthWrite: false,
  });
  const smokeStacks = [];
  housePlots.forEach((plot, hi) => {
    const g = new THREE.Group();
    const y = terrainHeight(plot.x, plot.z);
    g.position.set(plot.x, y, plot.z);
    g.rotation.y = Math.atan2(VILLAGE.x - plot.x, VILLAGE.z - plot.z) + (rand() - 0.5) * 0.5;

    const wallMat = instMaterial();
    wallMat.color.setScalar(0.66 + (rand() - 0.5) * 0.06);
    const walls = ink(new THREE.Mesh(wallGeo, wallMat), 1.4);
    walls.position.y = 1.3;
    walls.castShadow = walls.receiveShadow = true;

    const roofMat = instMaterial();
    roofMat.color.setScalar(0.45 + (rand() - 0.5) * 0.06);
    const roof = ink(new THREE.Mesh(roofGeo, roofMat), 1.6);
    roof.position.y = cfg.houses === 'flat' ? 2.8 : cfg.houses === 'steep' ? 3.95 : 3.5;
    roof.castShadow = true;

    const chim = ink(new THREE.Mesh(chimGeo, wallMat), 0.4);
    chim.position.set(0.95, cfg.houses === 'flat' ? 3.2 : 3.5, 0.4);

    const winMat = new THREE.MeshStandardMaterial({
      color: '#8f8f8f', emissive: '#000000', roughness: 0.6,
    });
    windowMats.push(winMat);
    for (const wx of [-0.8, 0.8]) {
      const w = new THREE.Mesh(winGeo, winMat);
      w.position.set(wx, 1.35, 2.02);
      w.rotation.y = -wx * 0.18;
      g.add(w);
    }

    // an arched door, coloured with the roofs
    const door = new THREE.Mesh(doorGeo, roofMat);
    door.position.set(0, 0.02, 2.16);
    g.add(door);

    // chimney smoke, always drifting
    const smokeSet = [];
    for (let s2 = 0; s2 < 5; s2++) {
      const puff = new THREE.Mesh(smokeGeo, smokeMat);
      puff.raycast = () => {};
      puff.position.set(0.95, 4.0, 0.4);
      g.add(puff);
      smokeSet.push({ puff, t: s2 / 5 });
    }
    smokeStacks.push({ smokeSet, base: cfg.houses === 'flat' ? 3.8 : 4.1 });

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
  updaters.push((dt, t) => {
    for (const st of smokeStacks) {
      for (const s of st.smokeSet) {
        s.t += dt * 0.16;
        if (s.t > 1) s.t -= 1;
        const k = s.t;
        s.puff.position.y = st.base + k * 5.5;
        s.puff.position.x = 0.95 + Math.sin(k * 4 + st.base) * 0.9 * k;
        s.puff.scale.setScalar(0.4 + k * 2.2);
        s.puff.visible = k < 0.92;
      }
    }
    smokeMat.opacity = 0.3 * (1 - 0.45 * state.nightT);
  });

  addCategory('houses', {
    label: 'the houses', grayLevel: 0.66, singular: 'house',
    synonyms: ['house', 'houses', 'home', 'homes', 'village', 'cottage',
      'cottages', 'hut', 'huts', 'walls', 'buildings'],
    phrase: 'and the houses stood',
    defaultColor: '#e8dcc4',
    onFirstColor: () => {
      for (const m of windowMats) m.emissive.set('#ffc46b').multiplyScalar(2.4);
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
    if (waterDist(p.x, p.z) < (POND ? 3 : 8.5)) continue;
    const jx = p.x + (rand() - 0.5) * 1.2, jz = p.z + (rand() - 0.5) * 1.2;
    const q = new THREE.Quaternion().setFromUnitVectors(patchUp, terrainNormal(jx, jz));
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)));
    patchMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(jx, terrainHeight(jx, jz) + 0.07, jz),
      q,
      new THREE.Vector3(1.5 + rand() * 0.7, 1, 1.1 + rand() * 0.5),
    ));
  }
  const patches = makeInstanced(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2),
    patchMatrices.length, patchMatrices, 0.7, 0.08);
  scene.add(patches.mesh);
  addGaze(patches.mesh, 'path');
  meshToSurf.set(patches.mesh, 0);

  const pathSurfs = [
    { type: 'inst', mesh: patches.mesh, positions: patches.positions,
      variance: { h: 0.015, s: 0.08, l: 0.08 } },
  ];
  if (!POND) {
    const bridgeMat = instMaterial();
    bridgeMat.color.setScalar(0.52);
    const bridge = new THREE.Group();
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
    scene.add(bridge);
    addGaze(bridge, 'path');
    bridge.traverse((o) => meshToSurf.set(o, 1));
    pathSurfs.push({ type: 'tint', current: bridgeMat.color,
      pos: new THREE.Vector3(bx, 0.5, bz),
      apply: (c) => bridgeMat.color.copy(c) });
  }

  addCategory('path', {
    label: 'the path', grayLevel: 0.7, singular: 'stretch of path',
    synonyms: ['path', 'paths', 'road', 'roads', 'trail', 'bridge', 'lane', 'way'],
    phrase: 'and the path wound',
    defaultColor: '#c9b391',
    surfaces: pathSurfs,
  });

  // ---- lanterns, fences, bushes, reeds ------------------------------------
  const woodMat = instMaterial();
  woodMat.color.setScalar(0.46);
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#9a9a9a' });
  {
    // lantern posts marking the way into the village
    const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6).translate(0, 1.2, 0);
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 5)
      .rotateZ(Math.PI / 2).translate(0.2, 2.35, 0);
    const globeGeo = new THREE.SphereGeometry(0.19, 8, 6);
    for (let i = 12; i < pathPts.length - 8; i += 16) {
      const p = pathPts[i];
      const x = p.x + 1.9, z = p.z + 1.2;
      if (waterDist(x, z) < 6) continue;
      const g = new THREE.Group();
      g.position.set(x, terrainHeight(x, z), z);
      g.rotation.y = rand() * Math.PI;
      g.add(ink(new THREE.Mesh(postGeo, woodMat), 0.4));
      g.add(new THREE.Mesh(armGeo, woodMat));
      const globe = new THREE.Mesh(globeGeo, lanternMat);
      globe.position.set(0.42, 2.3, 0);
      g.add(globe);
      scene.add(g);
      addGaze(g, 'path');
      g.traverse((o) => meshToSurf.set(o, 0));
    }
    updaters.push(() => {
      const n = state.nightT;
      lanternMat.color.setRGB(0.6 + 0.4 * n, 0.58 + 0.32 * n, 0.5 + 0.1 * n)
        .multiplyScalar(0.65 + 0.55 * n);
    });

    // garden fences around the village edge
    const railGeo = new THREE.BoxGeometry(1.55, 0.09, 0.07);
    const picketGeo = new THREE.BoxGeometry(0.09, 0.72, 0.07);
    const fenceMats = [];
    for (const plot of housePlots) {
      const ang = Math.atan2(plot.x - VILLAGE.x, plot.z - VILLAGE.z);
      for (let s2 = 0; s2 < 4; s2++) {
        const off = (s2 - 1.5) * 1.5;
        const fx = plot.x + Math.cos(ang) * 4.4 - Math.sin(ang) * off;
        const fz = plot.z - Math.sin(ang) * 4.4 - Math.cos(ang) * off;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(fx, terrainHeight(fx, fz) + 0.36, fz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0)),
          new THREE.Vector3(1, 1, 1));
        fenceMats.push(m);
      }
    }
    const fenceGeo = mergeGeoms([
      railGeo.clone().translate(0, 0.16, 0),
      railGeo.clone().translate(0, -0.14, 0),
      picketGeo.clone().translate(-0.6, 0, 0),
      picketGeo.clone().translate(0, 0, 0),
      picketGeo.clone().translate(0.6, 0, 0),
    ]);
    const fences = makeInstanced(fenceGeo, fenceMats.length, fenceMats, 0.6, 0.06);
    fences.mesh.castShadow = true;
    ink(fences.mesh, 0.35);
    scene.add(fences.mesh);
    addGaze(fences.mesh, 'path');
    meshToSurf.set(fences.mesh, 0);
    pathSurfs.push({ type: 'inst', mesh: fences.mesh, positions: fences.positions,
      variance: { h: 0.01, s: 0.06, l: 0.07 } });
  }

  // bushes join the trees; reeds join the land
  {
    const bushMats = [];
    let bguard = 0;
    while (bushMats.length < 130 && bguard++ < 12000) {
      const x = (rand() * 2 - 1) * 180, z = (rand() * 2 - 1) * 180;
      if (!openGround(x, z, 9)) continue;
      if (nearPath(x, z, 2.2)) continue;
      const s = 0.6 + rand() * 0.9;
      bushMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z) + 0.1 * s, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)),
        new THREE.Vector3(s, s * 0.8, s)));
    }
    const bushGeo = GEO === 'crystal' ? mergeGeoms([
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.OctahedronGeometry(0.44, 0).translate(0.45, -0.1, 0.2),
    ]) : GEO === 'angular' ? mergeGeoms([
      new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.IcosahedronGeometry(0.42, 0).translate(0.45, -0.1, 0.2),
      new THREE.IcosahedronGeometry(0.38, 0).translate(-0.4, -0.12, -0.15),
    ]) : mergeGeoms([
      new THREE.SphereGeometry(0.6, 8, 6),
      new THREE.SphereGeometry(0.42, 8, 6).translate(0.45, -0.1, 0.2),
      new THREE.SphereGeometry(0.38, 8, 6).translate(-0.4, -0.12, -0.15),
    ]);
    const bushes = makeInstanced(bushGeo, bushMats.length, bushMats, 0.54, 0.12);
    bushes.mesh.castShadow = true;
    ink(bushes.mesh, 0.7);
    scene.add(bushes.mesh);
    addGaze(bushes.mesh, 'trees');
    const treesCat = categories.get('trees');
    meshToSurf.set(bushes.mesh, treesCat.surfaces.length);
    treesCat.surfaces.push({ type: 'inst', mesh: bushes.mesh, positions: bushes.positions,
      variance: { h: 0.045, s: 0.12, l: 0.1 } });

    // reeds at the water's edge
    const reedMats = [];
    let rguard = 0;
    while (reedMats.length < 260 && rguard++ < 20000) {
      const x = (rand() * 2 - 1) * 185, z = (rand() * 2 - 1) * 185;
      const d = waterDist(x, z);
      if (d < 4.6 || d > 9) continue;
      if (Math.hypot(x, z) > 185) continue;
      const s = 0.7 + rand() * 0.8;
      reedMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z), z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler((rand() - 0.5) * 0.25, rand() * Math.PI, (rand() - 0.5) * 0.25)),
        new THREE.Vector3(s, s, s)));
    }
    const reedBlade = new THREE.CylinderGeometry(0.012, 0.03, 1.5, 4).translate(0, 0.75, 0);
    const reedGeo = mergeGeoms([
      reedBlade.clone(),
      reedBlade.clone().rotateZ(0.16).translate(0.12, 0, 0.05),
      reedBlade.clone().rotateZ(-0.2).translate(-0.1, -0.05, -0.07),
      new THREE.SphereGeometry(0.06, 5, 4).scale(1, 2.2, 1).translate(0, 1.6, 0),
    ]);
    const reeds = makeInstanced(reedGeo, reedMats.length, reedMats, 0.62, 0.1);
    scene.add(reeds.mesh);
    addGaze(reeds.mesh, 'land');
    const landCat = categories.get('land');
    meshToSurf.set(reeds.mesh, landCat.surfaces.length);
    landCat.surfaces.push({ type: 'inst', mesh: reeds.mesh, positions: reeds.positions,
      variance: { h: 0.04, s: 0.12, l: 0.1 } });
  }

  // ---- clouds (weather can dim them over their decreed color) -------------
  const cloudSurf = [];
  const cloudGroups = [];
  for (let i = 0; i < cfg.clouds; i++) {
    const mat = instMaterial();
    const g = new THREE.Group();
    const puffs = 3 + (rand() * 3) | 0;
    for (let p = 0; p < puffs; p++) {
      const puffGeo = GEO === 'crystal' ? new THREE.OctahedronGeometry(1, 0)
        : GEO === 'angular' ? new THREE.IcosahedronGeometry(1, 0)
          : new THREE.SphereGeometry(1, 9, 7);
      const puff = new THREE.Mesh(puffGeo, mat);
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
    const vis = state.nightT < 0.6;
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

  // ---- deer (or mountain goats) -------------------------------------------
  const deerMat = instMaterial();
  deerMat.color.setScalar(0.5);
  const deerHerd = [];
  if (cfg.deer > 0) {
    const bodyGeo = new THREE.SphereGeometry(1, 9, 7).scale(0.55, 0.42, 0.85);
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.6, 6);
    const headGeo = new THREE.SphereGeometry(0.17, 8, 6);
    const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.9, 6).translate(0, -0.45, 0);
    const antlerGeo = new THREE.ConeGeometry(0.03, 0.34, 5);
    let placed = 0; guard = 0;
    while (placed < cfg.deer && guard++ < 4000) {
      const x = (rand() * 2 - 1) * 160, z = (rand() * 2 - 1) * 160;
      if (!openGround(x, z, 14)) continue;
      if (nearPath(x, z, 4)) continue;
      const g = new THREE.Group();
      const body = ink(new THREE.Mesh(bodyGeo, deerMat), 0.5);
      body.position.y = 1.0;
      body.castShadow = true;
      const neck = new THREE.Mesh(neckGeo, deerMat);
      neck.position.set(0, 1.35, 0.62);
      neck.rotation.x = 0.5;
      const head = new THREE.Mesh(headGeo, deerMat);
      head.position.set(0, 1.66, 0.82);
      const legs = [];
      for (const [lx2, lz2] of [[-0.24, 0.32], [0.24, 0.32], [-0.24, -0.34], [0.24, -0.34]]) {
        const leg = new THREE.Mesh(legGeo, deerMat);
        leg.position.set(lx2, 0.95, lz2);
        g.add(leg);
        legs.push(leg);
      }
      for (const ax of [-0.08, 0.08]) {
        const antler = new THREE.Mesh(antlerGeo, deerMat);
        antler.position.set(ax, 1.86, 0.76);
        antler.rotation.z = ax * 4;
        g.add(antler);
      }
      g.add(body, neck, head);
      g.position.set(x, terrainHeight(x, z), z);
      scene.add(g);
      addGaze(g, 'deer');
      deerHerd.push({ g, legs, x, z, tx: x, tz: z, state: 'graze',
        timer: 2 + rand() * 5, phase: rand() * 7, speed: 0 });
      placed++;
    }
  }
  updaters.push((dt, t, playerPos) => {
    for (const d of deerHerd) {
      const pdist = playerPos ? Math.hypot(playerPos.x - d.x, playerPos.z - d.z) : 99;
      if (d.state === 'graze') {
        d.timer -= dt;
        d.speed = 0;
        // deer are unafraid of their god: they linger and watch you pass
        if (pdist < 8 && playerPos) {
          const ang = Math.atan2(playerPos.x - d.x, playerPos.z - d.z);
          const delta = ((ang - d.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          d.g.rotation.y += delta * Math.min(1, dt * 3);
          d.timer = Math.max(d.timer, 0.8);
        }
        if (d.timer <= 0) {
          for (let tries = 0; tries < 6; tries++) {
            const a = rand() * Math.PI * 2, dist2 = 8 + rand() * 16;
            const nx = d.x + Math.cos(a) * dist2, nz = d.z + Math.sin(a) * dist2;
            if (!openGround(nx, nz, 12)) continue;
            d.tx = nx; d.tz = nz; d.state = 'amble';
            break;
          }
          if (d.state === 'graze') d.timer = 2 + rand() * 3;
        }
      } else {
        const speed = 2.1;
        d.speed = speed;
        const dx = d.tx - d.x, dz = d.tz - d.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.5) {
          d.state = 'graze';
          d.timer = 3 + rand() * 6;
          d.speed = 0;
        } else {
          d.x += (dx / dd) * speed * dt;
          d.z += (dz / dd) * speed * dt;
          d.g.rotation.y = Math.atan2(dx, dz);
        }
      }
      d.g.position.set(d.x, terrainHeight(d.x, d.z), d.z);
      const swing = d.speed > 0 ? Math.sin(t * 7 + d.phase) * 0.5 : 0;
      d.legs[0].rotation.x = swing;
      d.legs[3].rotation.x = swing;
      d.legs[1].rotation.x = -swing;
      d.legs[2].rotation.x = -swing;
    }
  });
  if (cfg.deer > 0) {
    addCategory('deer', {
      label: 'the deer', grayLevel: 0.5, countTotal: false,
      synonyms: ['deer', 'stag', 'stags', 'doe', 'does', 'elk', 'fawn', 'fawns'],
      phrase: 'and the deer wandered',
      defaultColor: '#8f6b4a',
      surfaces: [
        { type: 'tint', current: deerMat.color, apply: (c) => deerMat.color.copy(c) },
      ],
    });
  }

  // ---- rabbits ------------------------------------------------------------
  const rabbitMat = instMaterial();
  rabbitMat.color.setScalar(0.55);
  const rabbits = [];
  {
    const bodyGeo = new THREE.SphereGeometry(1, 8, 6).scale(0.3, 0.24, 0.4);
    const headGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const earGeo = new THREE.ConeGeometry(0.05, 0.26, 5);
    let placed = 0; guard = 0;
    while (placed < cfg.rabbits && guard++ < 4000) {
      const x = (rand() * 2 - 1) * 150, z = (rand() * 2 - 1) * 150;
      if (!openGround(x, z, 13)) continue;
      if (nearPath(x, z, 3)) continue;
      const g = new THREE.Group();
      const body = ink(new THREE.Mesh(bodyGeo, rabbitMat), 0.25);
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
  updaters.push((dt) => {
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

  // ---- fish (leap once the water has a color) -----------------------------
  const fishMat = instMaterial();
  fishMat.color.setScalar(0.6);
  const fishGeo = new THREE.SphereGeometry(1, 8, 6).scale(0.16, 0.14, 0.5);
  const fishes = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(fishGeo, fishMat);
    m.visible = false;
    m.raycast = () => {};
    scene.add(m);
    fishes.push({ m, active: false, nextAt: 2 + i * 3, t0: 0, x0: 0, z0: 0, dir: 1 });
  }
  updaters.push((dt, t, playerPos) => {
    if (!state.fishOn) return;
    for (const f of fishes) {
      if (!f.active) {
        if (t > f.nextAt) {
          f.active = true;
          f.t0 = t;
          if (POND) {
            const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * (POND.r - 4);
            f.x0 = POND.x + Math.cos(a) * rr;
            f.z0 = POND.z + Math.sin(a) * rr;
          } else {
            const pz = playerPos ? playerPos.z : 0;
            f.z0 = Math.max(-200, Math.min(200, pz + (rand() - 0.5) * 120));
            f.x0 = riverX(f.z0);
          }
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
      f.m.position.set(POND ? f.x0 : riverX(z), WATER_Y - 0.2 + Math.sin(Math.PI * k) * 1.9, z);
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

  // ---- autumn leaves (only where broadleafs grow) -------------------------
  const LEAVES = broadSpots.length ? 190 : 0;
  const leafMat = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
  });
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.18),
    leafMat, Math.max(LEAVES, 1));
  leaves.raycast = () => {};
  leaves.visible = false;
  const leafData = [];
  {
    const c = new THREE.Color();
    for (let i = 0; i < LEAVES; i++) {
      const sp = broadSpots[(rand() * broadSpots.length) | 0];
      leafData.push({
        sp, ox: (rand() - 0.5) * 3.4, oz: (rand() - 0.5) * 3.4,
        y: terrainHeight(sp.x, sp.z) + 3 + rand() * 2.5 * sp.s,
        vf: rand() * 0.5, phase: rand() * 9, spin: 1 + rand() * 3,
      });
      c.setHSL(0.02 + rand() * 0.09, 0.85, 0.42 + rand() * 0.18);
      leaves.setColorAt(i, c);
    }
  }
  scene.add(leaves);
  const lM = new THREE.Matrix4(), lQ = new THREE.Quaternion(), lE = new THREE.Euler(),
    lV = new THREE.Vector3(), lS = new THREE.Vector3();
  updaters.push((dt, t) => {
    if (!LEAVES) return;
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

  // ---- ground mist --------------------------------------------------------
  if (cfg.mist) {
    const mistMat = new THREE.MeshBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0.05, depthWrite: false, fog: false,
    });
    const mistGeo = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
    const mists = [];
    for (let i = 0; i < 6; i++) {
      const z = -160 + i * 60 + rand() * 30;
      const x = POND ? POND.x : riverX(z);
      const m = new THREE.Mesh(mistGeo, mistMat);
      m.position.set(x + (rand() - 0.5) * 20, WATER_Y + 2.2 + rand() * 1.5, z);
      m.scale.setScalar(16 + rand() * 9);
      m.raycast = () => {};
      scene.add(m);
      mists.push({ m, sp: 0.4 + rand() * 0.5 });
    }
    updaters.push((dt, t) => {
      mistMat.opacity = 0.05 * (1 - 0.5 * state.nightT) + 0.03 * state.duskT;
      for (const mi of mists) {
        mi.m.position.x += dt * mi.sp;
        if (mi.m.position.x > 240) mi.m.position.x = -240;
      }
    });
  }

  // ---- fallen wood: the floor of a real wood is not swept ----------------
  if (pineSpots.length || broadSpots.length) {
    const logMats = [], stumpMats = [];
    for (const sp of treeSpots) {
      if (sp.seed > 0.09) continue;
      const a = sp.rot + 1.1;
      const x = sp.x + Math.cos(a) * 2.2, z = sp.z + Math.sin(a) * 2.2;
      if (!openGround(x, z, 10)) continue;
      const s = 0.8 + sp.seed * 4;
      if (sp.seed < 0.045) {
        logMats.push(new THREE.Matrix4().compose(
          new THREE.Vector3(x, terrainHeight(x, z) + 0.22 * s, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, Math.PI / 2 + 0.06)),
          new THREE.Vector3(s, s * (2.4 + sp.seed * 12), s)));
      } else {
        stumpMats.push(new THREE.Matrix4().compose(
          new THREE.Vector3(x, terrainHeight(x, z), z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)),
          new THREE.Vector3(s, s * 0.7, s)));
      }
    }
    const barkCat = categories.get('bark');
    if (logMats.length) {
      const logs = makeInstanced(
        new THREE.CylinderGeometry(0.28, 0.33, 1, 7), logMats.length, logMats, 0.4, 0.07);
      logs.mesh.castShadow = true;
      ink(logs.mesh, 0.35);
      scene.add(logs.mesh);
      addGaze(logs.mesh, 'bark');
      meshToSurf.set(logs.mesh, barkCat.surfaces.length);
      barkCat.surfaces.push({ type: 'inst', mesh: logs.mesh, positions: logs.positions,
        variance: { h: 0.02, s: 0.1, l: 0.08 } });
    }
    if (stumpMats.length) {
      const stumps = makeInstanced(
        new THREE.CylinderGeometry(0.34, 0.46, 0.9, 8), stumpMats.length, stumpMats, 0.4, 0.07);
      stumps.mesh.castShadow = true;
      ink(stumps.mesh, 0.35);
      scene.add(stumps.mesh);
      addGaze(stumps.mesh, 'bark');
      meshToSurf.set(stumps.mesh, barkCat.surfaces.length);
      barkCat.surfaces.push({ type: 'inst', mesh: stumps.mesh, positions: stumps.positions,
        variance: { h: 0.02, s: 0.1, l: 0.08 } });
    }
  }

  // ---- contact shadows ----------------------------------------------------
  // A soft radial falloff, not a hard disc — this is most of what makes a
  // thing look like it is standing on the ground rather than hovering.
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.42)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  })();
  const shadowSpots = treeSpots.map((s) => ({ x: s.x, z: s.z, r: 2.1 * s.s }))
    .concat(rockSpots.map((s) => ({ x: s.x, z: s.z, r: 1.3 * s.s })))
    .concat(housePlots.map((p) => ({ x: p.x, z: p.z, r: 3.4 })));
  const shMat = new THREE.MeshBasicMaterial({
    map: shadowTex, color: '#0a0c10', transparent: true, opacity: 0.42,
    depthWrite: false, fog: false,
  });
  const shadows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), shMat, shadowSpots.length);
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

  // ---- the inking pass ----------------------------------------------------
  applyOutlines(scene, style);

  // -------------------------------------------------------------------------
  const spawn = new THREE.Vector3(8, 0, 78);

  return {
    categories,
    gazeEntries,
    meshToKey,
    terrainHeight,
    WATER_Y,
    scene,
    state,
    spawn,
    spawnLook: new THREE.Vector3(52, 4, 18),
    realmKey: cfg.key,
    realmTitle: cfg.title,
    styleId: style.id,
    styleDef: style,

    setNight(on) { state.nightTarget = on ? 1 : 0; },
    forceNight(on) { state.nightTarget = on ? 1 : 0; state.nightT = state.nightTarget; },
    setWeather(kind) {
      state.weather = kind;
      state.cloudDimTarget = kind === 'rain' ? 0.55 : kind === 'snow' ? 0.82 : 1;
    },
    setSeason(s) { state.season = s; },
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
    riverDistance(x, z) { return waterDist(x, z); },
    resolveHit(object, instanceId) {
      const key = meshToKey.get(object);
      if (!key) return null;
      return { key, surfIndex: meshToSurf.get(object), instanceId };
    },
    update(dt, t, playerPos) { for (const u of updaters) u(dt, t, playerPos); },
  };
}
