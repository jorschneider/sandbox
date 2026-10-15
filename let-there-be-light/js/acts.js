// The acts of creation.
//
// Every act is its own little engine: the void is a drifting point cloud,
// light is additive sprites and a light rig, the earth is an animated
// displacement mesh, the waters are a wave field, life is instanced crowds,
// people are a lit settlement. They share nothing but the scene and a clock,
// which is the point — each thing that is made is made its own way.

import * as THREE from 'three';
import { makeNoise } from './noise.js';
import { makeScatterer, slopeAt } from './render/scatter.js';
import * as atmos from './render/atmos.js';

const N = makeNoise(70414);
const rand = N.rand;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const SEA_LEVEL = 0;
const EXTENT = 420;

// ------------------------------------------------------------------- terrain

function landHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = N.fbm(x * 0.0055, z * 0.0055, 5) * 26;
  h += N.fbm(x * 0.02 + 11, z * 0.02 - 7, 3) * 5;
  // a broad island: a dome that falls away to the deep at the rim
  h += 22 * Math.pow(clamp01(1 - r / 300), 1.4);
  h -= Math.pow(clamp01((r - 150) / 200), 1.5) * 90;
  h += 4;
  return h;
}

function ridgeHeight(x, z) {
  const r2 = 1 - Math.abs(N.fbm(x * 0.011 + 31, z * 0.011 - 19, 4));
  const spine = Math.pow(clamp01(1 - Math.hypot(x + 40, z + 30) / 190), 1.3);
  return r2 * r2 * 78 * spine;
}

// =============================================================== the world

export function createWorld(scene, renderer) {
  const made = new Set();
  const updaters = [];
  const state = {
    lightT: 0, dayT: 0, nightTarget: 0, windT: 0.35,
    rain: false, seaT: 0, earthT: 0, ridgeT: 0, greenT: 0,
  };

  // ---------------------------------------------------------------- the void
  // A cold point cloud with nothing in it. This is all there is at first.
  const voidGeo = new THREE.BufferGeometry();
  {
    const n = 2600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1)
        .normalize().multiplyScalar(40 + Math.pow(rand(), 0.6) * 340);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y * 0.55; pos[i * 3 + 2] = v.z;
    }
    voidGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const voidMat = new THREE.PointsMaterial({
    color: '#8fa0c8', size: 1.5, sizeAttenuation: false,
    transparent: true, opacity: 0.34, depthWrite: false,
  });
  const motes = new THREE.Points(voidGeo, voidMat);
  motes.frustumCulled = false;
  scene.add(motes);
  updaters.push((dt, t) => {
    motes.rotation.y = t * 0.008;
    voidMat.opacity = 0.34 * (1 - 0.75 * state.lightT) * (1 - 0.5 * state.earthT);
  });

  scene.background = new THREE.Color('#04040a');
  scene.fog = new THREE.FogExp2('#04040a', 0.0055);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight('#e6efff', '#6a6a58', 0);
  scene.add(hemi);
  // a soft fill so slopes turned away from the sun still read as living ground
  const fill = new THREE.DirectionalLight('#bcd2f0', 0);
  fill.position.set(-160, 90, 150);
  scene.add(fill);
  const key = new THREE.DirectionalLight('#fff3dc', 0);
  key.position.set(120, 190, -90);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260;
  sc.near = 40; sc.far = 620;
  sc.updateProjectionMatrix();
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 1.4;
  scene.add(key, key.target);

  // the first radiance: an additive bloom with no source
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,240,200,0.55)');
    grd.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  })();
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex, color: '#fff6da', transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(240);
  glow.position.set(0, 90, -260);
  scene.add(glow);

  const skyUniforms = {
    uTop: { value: new THREE.Color('#05060f') },
    uHorizon: { value: new THREE.Color('#0a0c18') },
    uMix: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vD;
        void main(){ vD = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vD;
        void main(){ float t = pow(clamp(vD.y,0.0,1.0), 0.55);
          gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }`,
    }));
  sky.frustumCulled = false;
  scene.add(sky);

  const WHITE_C = new THREE.Color('#ffffff');
  const SUN_TINT = new THREE.Color('#ffcf8a');
  const SUN_DIR = new THREE.Vector3(120, 190, -90).normalize();
  const atmosCam = new THREE.Vector3();
  const atmosFog = new THREE.Color();
  const atmosSun = new THREE.Color();
  const lastCam = new THREE.Vector3(0, 58, 235);
  const DAY_TOP = new THREE.Color('#3f7fd0');
  const DAY_HORIZON = new THREE.Color('#cfe4f5');
  const NIGHT_TOP = new THREE.Color('#050a1e');
  const NIGHT_HORIZON = new THREE.Color('#101a34');
  const VOID_TOP = new THREE.Color('#05060f');
  const VOID_HORIZON = new THREE.Color('#0a0c18');
  const c1 = new THREE.Color(), c2 = new THREE.Color();

  updaters.push((dt) => {
    // night rides toward its target; light and firmament fade the void out
    state.dayT += (state.nightTarget - state.dayT) * Math.min(1, dt * 0.22);
    const nt = state.dayT;
    const f = made.has('firmament') ? 1 : 0;
    const lit = state.lightT;

    c1.copy(VOID_TOP).lerp(c2.copy(DAY_TOP).lerp(NIGHT_TOP, nt), f);
    skyUniforms.uTop.value.copy(c1).multiplyScalar(0.25 + 0.75 * Math.max(lit, f));
    c1.copy(VOID_HORIZON).lerp(c2.copy(DAY_HORIZON).lerp(NIGHT_HORIZON, nt), f);
    skyUniforms.uHorizon.value.copy(c1).multiplyScalar(0.25 + 0.75 * Math.max(lit, f));
    scene.background.copy(skyUniforms.uHorizon.value);
    scene.fog.color.copy(skyUniforms.uHorizon.value);
    scene.fog.density = 0.0055 * (1 - 0.8 * Math.max(lit, f));

    hemi.intensity = lit * (1.5 - 1.05 * nt);
    key.intensity = lit * (made.has('sun') ? 2.3 : 1.0) * (1 - 0.82 * nt);
    fill.intensity = lit * 0.5 * (1 - 0.7 * nt);

    // aerial perspective, keyed to whatever sky currently exists
    atmosCam.copy(lastCam);
    atmosFog.copy(skyUniforms.uHorizon.value).lerp(WHITE_C, 0.1);
    atmos.update(atmosCam, {
      sunDir: SUN_DIR,
      fogColor: atmosFog,
      sunFogColor: atmosSun.copy(atmosFog).lerp(SUN_TINT, 0.55 * (1 - nt)),
      density: 0.0011 * (1 + f * 0.2) + (1 - lit) * 0.004,
      height: 12,
      falloff: 0.03,
      desat: 0.3,
      amount: 1,
    });
    glowMat.opacity = lit * 0.5 * (1 - f * 0.75);
    glow.scale.setScalar(200 + 90 * Math.sin(performance.now() / 2600));
  });

  // ------------------------------------------------------------------ waters
  let waterMesh = null, waterUniforms = null;
  function makeWaters() {
    const geo = new THREE.PlaneGeometry(EXTENT * 2.6, EXTENT * 2.6, 90, 90);
    geo.rotateX(-Math.PI / 2);
    waterUniforms = {
      uTime: { value: 0 }, uRise: { value: 0 },
      uShallow: { value: new THREE.Color('#57c6d8') },
      uDeep: { value: new THREE.Color('#0d3b63') },
      uLight: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: waterUniforms, transparent: true,
      vertexShader: `
        uniform float uTime; uniform float uRise;
        varying float vH; varying vec3 vW;
        void main(){
          vec3 p = position;
          float w = sin(p.x * 0.045 + uTime * 0.9) * 0.55
                  + sin(p.z * 0.06 - uTime * 1.15) * 0.42
                  + sin((p.x + p.z) * 0.02 + uTime * 0.5) * 0.7;
          p.y += w * 0.6 - (1.0 - uRise) * 90.0;
          vH = w; vW = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uShallow; uniform vec3 uDeep; uniform float uLight;
        varying float vH; varying vec3 vW;
        void main(){
          float d = clamp(length(vW.xz) / 420.0, 0.0, 1.0);
          vec3 c = mix(uShallow, uDeep, d);
          c += vH * 0.06;
          gl_FragColor = vec4(c * (0.35 + 0.65 * uLight), 0.86);
        }`,
    });
    waterMesh = new THREE.Mesh(geo, mat);
    waterMesh.position.y = SEA_LEVEL;
    waterMesh.renderOrder = 1;
    scene.add(waterMesh);
    updaters.push((dt, t) => {
      waterUniforms.uTime.value = t;
      state.seaT = Math.min(1, state.seaT + dt / 5);
      waterUniforms.uRise.value = easeInOut(state.seaT);
      waterUniforms.uLight.value = state.lightT * (1 - 0.65 * state.dayT);
    });
  }

  // ------------------------------------------------------------------- earth
  let land = null, landPos = null, landBase = null, landTarget = null;
  let landDelay = null, landColor = null, landShade = null, landJit = null;
  const earthAnim = { t: -1, dur: 5.2 };
  const ridgeAnim = { t: -1, dur: 4.4 };

  function makeEarth() {
    const SEG = 150;
    const geo = new THREE.PlaneGeometry(EXTENT * 2, EXTENT * 2, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    landPos = geo.attributes.position;
    const n = landPos.count;
    landBase = new Float32Array(n);
    landTarget = new Float32Array(n);
    landDelay = new Float32Array(n);
    landShade = new Float32Array(n);
    landJit = new Float32Array(n);
    landColor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = landPos.getX(i), z = landPos.getZ(i);
      landBase[i] = -70;
      landTarget[i] = landHeight(x, z);
      landDelay[i] = (Math.hypot(x, z) / 300) * 2.2;
      landJit[i] = rand();
      landPos.setY(i, landBase[i]);
      landColor[i * 3] = 0.3; landColor[i * 3 + 1] = 0.28; landColor[i * 3 + 2] = 0.26;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(landColor, 3));
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.96, metalness: 0, flatShading: false,
    });
    land = new THREE.Mesh(geo, mat);
    land.receiveShadow = true;
    land.castShadow = true;
    scene.add(land);
    earthAnim.t = 0;

    updaters.push((dt) => {
      let dirty = false;
      if (earthAnim.t >= 0) {
        earthAnim.t += dt;
        dirty = true;
        let done = true;
        for (let i = 0; i < n; i++) {
          const k = ease((earthAnim.t - landDelay[i]) / earthAnim.dur);
          if (k < 1) done = false;
          landPos.setY(i, landBase[i] + (landTarget[i] - landBase[i]) * k);
        }
        state.earthT = clamp01(earthAnim.t / (earthAnim.dur + 2.2));
        if (done) { earthAnim.t = -1; for (let i = 0; i < n; i++) landBase[i] = landTarget[i]; }
      }
      if (ridgeAnim.t >= 0) {
        ridgeAnim.t += dt;
        dirty = true;
        let done = true;
        for (let i = 0; i < n; i++) {
          const k = ease((ridgeAnim.t - landDelay[i] * 0.6) / ridgeAnim.dur);
          if (k < 1) done = false;
          landPos.setY(i, landBase[i] + (landTarget[i] - landBase[i]) * k);
        }
        state.ridgeT = clamp01(ridgeAnim.t / ridgeAnim.dur);
        if (done) { ridgeAnim.t = -1; for (let i = 0; i < n; i++) landBase[i] = landTarget[i]; }
      }
      if (dirty) {
        landPos.needsUpdate = true;
        land.geometry.computeVertexNormals();
        paintLand();
      }
    });
  }

  // The ground's own palette. Not one flat green: sand at the tideline, bare
  // rock where it is too steep to hold soil, two greens blended by altitude
  // and moisture, snow up top — all broken up across three scales of noise
  // and darkened in its own hollows by curvature AO.
  const SAND = [0.68, 0.60, 0.44], ROCK = [0.35, 0.33, 0.30];
  const CLIFF = [0.30, 0.28, 0.26], SNOW = [0.86, 0.88, 0.93];
  const GRASS_LOW = [0.26, 0.44, 0.20], GRASS_HIGH = [0.34, 0.42, 0.24];
  function paintLand() {
    if (!land) return;
    const n = landPos.count;
    const green = state.greenT;
    for (let i = 0; i < n; i++) {
      const x = landPos.getX(i), z = landPos.getZ(i);
      const y = landPos.getY(i);

      // curvature AO: hollows sit in their own shadow, ridges catch the sky
      const ao = clamp01(0.78 + (y - (
        landHeight(x + 7, z) + landHeight(x - 7, z)
        + landHeight(x, z + 7) + landHeight(x, z - 7)) / 4) * 0.055) * 0.35 + 0.7;

      const steep = slopeAt(landHeight, x, z);
      const cliff = clamp01((steep - 0.55) / 0.75);
      const m1 = noiseFbm(x * 0.008 + 5, z * 0.008 - 3) * 0.1;
      const m2 = noiseFbm(x * 0.035 - 12, z * 0.035 + 9) * 0.06;
      const j = (landJit[i] - 0.5) * 0.05 + m1 + m2;

      let c;
      if (y < 2.2) c = SAND;
      else c = ROCK;
      let r = c[0] + j, g = c[1] + j, b = c[2] + j;

      if (green > 0 && y >= 2.0) {
        const alt = clamp01((y - 2) / 40);
        const gr = [
          GRASS_LOW[0] + (GRASS_HIGH[0] - GRASS_LOW[0]) * alt,
          GRASS_LOW[1] + (GRASS_HIGH[1] - GRASS_LOW[1]) * alt,
          GRASS_LOW[2] + (GRASS_HIGH[2] - GRASS_LOW[2]) * alt,
        ];
        // grass gives up on cliffs and above the treeline
        const m = green * (1 - cliff) * (1 - clamp01((y - 44) / 14))
          * clamp01((y - 1.6) / 2.5);
        r += (gr[0] + j - r) * m; g += (gr[1] + j - g) * m; b += (gr[2] + j - b) * m;
      }
      if (cliff > 0) {
        r += (CLIFF[0] + j - r) * cliff * 0.85;
        g += (CLIFF[1] + j - g) * cliff * 0.85;
        b += (CLIFF[2] + j - b) * cliff * 0.85;
      }
      if (y > 44) {
        const s = clamp01((y - 44) / 18) * (1 - cliff * 0.6);
        r += (SNOW[0] - r) * s; g += (SNOW[1] - g) * s; b += (SNOW[2] - b) * s;
      }
      landColor[i * 3] = r * ao;
      landColor[i * 3 + 1] = g * ao;
      landColor[i * 3 + 2] = b * ao;
    }
    land.geometry.attributes.color.needsUpdate = true;
  }
  const noiseFbm = (x, z) => N.fbm(x, z, 3);

  function groundAt(x, z) {
    if (!land) return -70;
    return landHeight(x, z) + (made.has('mountains') ? ridgeHeight(x, z) * state.ridgeT : 0);
  }

  function dryLand(x, z, min = 2.2) {
    return groundAt(x, z) > min && Math.hypot(x, z) < 330;
  }

  // -------------------------------------------------------------------- life
  // Groves and clearings, thinned on cliffs and toward the treeline, with a
  // few hero specimens — the same placement logic the valley uses.
  const SC = makeScatterer({ noise: N, rand });
  function scatter(count, minH, opts = {}) {
    return SC.scatter({
      count, extent: 330, cell: opts.cell ?? 12,
      allow: (x, z) => dryLand(x, z, minH),
      density: opts.density ?? ((x, z) => {
        const g = SC.grove(x, z, 0.009, 0.1, 1.9);
        const shed = 1 - clamp01((slopeAt(groundAt, x, z) - 0.5) / 0.7);
        const high = 1 - clamp01((groundAt(x, z) - 34) / 20);
        return g * shed * high;
      }),
      sizeFn: opts.sizeFn ?? ((r) => 0.6 + Math.pow(r, 1.6) * 0.9),
      heroChance: opts.heroChance ?? 0.05,
      heroScale: opts.heroScale ?? 1.9,
    }).map((sp) => ({ ...sp, y: groundAt(sp.x, sp.z) }));
  }

  // a growth animation shared by every planted thing
  function growGroup(mesh, spots, dur = 1.5, spread = 26) {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(),
      P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
    const start = performance.now() / 1000;
    let maxDelay = 0;
    spots.forEach((sp) => {
      sp.delay = Math.hypot(sp.x, sp.z) / spread;
      if (sp.delay > maxDelay) maxDelay = sp.delay;
    });
    let done = false;
    updaters.push((dt, t) => {
      if (done) return;
      let all = true;
      for (let i = 0; i < spots.length; i++) {
        const sp = spots[i];
        const k = ease((t - start - sp.delay) / dur);
        if (k < 1) all = false;
        const sway = made.has('wind')
          ? Math.sin(t * 1.6 + i) * 0.05 * state.windT : 0;
        E.set(sway, sp.rot, sway * 0.5);
        Q.setFromEuler(E);
        P.set(sp.x, sp.y, sp.z);
        S.setScalar(Math.max(0.0001, sp.s * k * (1.06 - 0.06 * k)));
        mesh.setMatrixAt(i, M.compose(P, Q, S));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (all && !made.has('wind')) done = true;
    });
  }

  function instanced(geo, spots, color, jitter = 0.1) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(spots.length, 1));
    const c = new THREE.Color();
    const base = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    for (let i = 0; i < spots.length; i++) {
      c.setHSL((hsl.h + (rand() - 0.5) * jitter + 1) % 1,
        hsl.s, clamp01(hsl.l + (rand() - 0.5) * jitter));
      mesh.setColorAt(i, c);
      mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001));
    }
    mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }

  // Soft radial falloff under everything that stands: the difference between
  // an object resting on the ground and an object hovering above it.
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.8)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.36)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  })();
  function addContactShadows(spots) {
    if (!spots.length) return;
    const mat = new THREE.MeshBasicMaterial({
      map: shadowTex, color: '#0b0d12', transparent: true, opacity: 0.4,
      depthWrite: false, fog: false,
    });
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    spots.forEach((s, i) => {
      mesh.setMatrixAt(i, m.compose(
        new THREE.Vector3(s.x, groundAt(s.x, s.z) + 0.12, s.z), q,
        new THREE.Vector3(s.r, 1, s.r)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  function mergeGeoms(list) {
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    let total = 0;
    for (const g of parts) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
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

  // ------------------------------------------------------------- celestials
  function makeStars() {
    const n = 1500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 0.95 + 0.03, rand() * 2 - 1)
        .normalize().multiplyScalar(760);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: '#dce9ff', size: 2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    updaters.push((dt, t) => {
      m.opacity = (0.25 + 0.75 * state.dayT) * (0.85 + 0.15 * Math.sin(t * 0.8));
    });
  }

  function makeDisc(color, size, dist, height, hdr = 3.2) {
    const mat = new THREE.MeshBasicMaterial({
      // pushed past white so it blooms in the post chain
      color: new THREE.Color(color).multiplyScalar(hdr),
      fog: false, transparent: true, opacity: 0.95,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(size, 32), mat);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(size * 1.9, 32),
      new THREE.MeshBasicMaterial({
        color, fog: false, transparent: true, opacity: 0.16,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    const g = new THREE.Group();
    g.add(disc, halo);
    scene.add(g);
    return { g, mat, set(a) {
      g.position.set(Math.cos(a) * dist, Math.sin(a) * height, -dist * 0.5);
      g.lookAt(0, 0, 0);
    } };
  }

  // ------------------------------------------------------------------- rain
  let rainSys = null;
  function makeRain() {
    const n = 1400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3);
    const drops = [];
    for (let i = 0; i < n; i++) {
      drops.push({ x: (rand() - 0.5) * 300, y: rand() * 120, z: (rand() - 0.5) * 300 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#a9c4e0', transparent: true, opacity: 0,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    scene.add(lines);
    rainSys = { lines, mat, drops, pos, geo, n };
    updaters.push((dt, t, cam) => {
      const target = state.rain ? 0.42 : 0;
      mat.opacity += (target - mat.opacity) * Math.min(1, dt * 1.4);
      lines.visible = mat.opacity > 0.01;
      if (!lines.visible || !cam) return;
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        d.y -= 70 * dt;
        if (d.y < -40) { d.y += 150; d.x = (rand() - 0.5) * 300; d.z = (rand() - 0.5) * 300; }
        const k = i * 6;
        const wx = cam.x + d.x, wy = cam.y - 40 + d.y, wz = cam.z + d.z;
        pos[k] = wx; pos[k + 1] = wy; pos[k + 2] = wz;
        pos[k + 3] = wx + 0.5; pos[k + 4] = wy + 2.4; pos[k + 5] = wz;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  // =============================================================== the acts
  const ACTS = {
    light: {
      title: 'light', day: 1,
      words: ['light', 'radiance', 'brightness', 'day', 'dawn'],
      verse: 'And there was light.',
      make() {
        const t0 = performance.now() / 1000;
        updaters.push(() => {
          state.lightT = clamp01((performance.now() / 1000 - t0) / 4.5);
        });
      },
    },

    firmament: {
      title: 'the firmament', day: 2, needs: 'light',
      words: ['firmament', 'sky', 'heavens', 'heaven', 'air', 'atmosphere'],
      verse: 'And the vault was set between the waters.',
      make() { /* the sky shader is already listening for this act */ },
    },

    waters: {
      title: 'the waters', day: 2, needs: 'light',
      words: ['water', 'waters', 'sea', 'seas', 'ocean', 'oceans'],
      verse: 'And the waters gathered together.',
      make() { makeWaters(); },
    },

    earth: {
      title: 'the dry land', day: 3, needs: 'light',
      words: ['earth', 'land', 'ground', 'dry land', 'soil', 'island', 'world'],
      verse: 'And the dry land appeared.',
      make() { makeEarth(); },
    },

    mountains: {
      title: 'the mountains', day: 3, needs: 'earth',
      words: ['mountain', 'mountains', 'hills', 'peaks', 'highlands'],
      verse: 'And the mountains rose up out of the earth.',
      make() {
        // Start from wherever the ground stands right now — the earth may
        // still be rising — and aim at an absolute goal rather than an
        // offset, so the two movements can never fight each other.
        for (let i = 0; i < landPos.count; i++) {
          const x = landPos.getX(i), z = landPos.getZ(i);
          landBase[i] = landPos.getY(i);
          landTarget[i] = landHeight(x, z) + ridgeHeight(x, z);
        }
        earthAnim.t = -1;          // the rising is superseded by this one
        state.earthT = 1;
        ridgeAnim.t = 0;
      },
    },

    grass: {
      title: 'the green things', day: 3, needs: 'earth',
      words: ['grass', 'green', 'green things', 'meadow', 'meadows', 'plants', 'moss'],
      verse: 'And the earth brought forth grass.',
      make() {
        const t0 = performance.now() / 1000;
        updaters.push(() => {
          const k = clamp01((performance.now() / 1000 - t0) / 5);
          if (k !== state.greenT) { state.greenT = k; paintLand(); }
        });
        const spots = scatter(2400, 2.6, {
          cell: 5.5, heroChance: 0,
          density: (x, z) => {
            const meadow = SC.grove(x, z, 0.014, 0.5, 1.3);
            const flat = 1 - clamp01((slopeAt(groundAt, x, z) - 0.4) / 0.6);
            return meadow * flat * (1 - clamp01((groundAt(x, z) - 38) / 16));
          },
        });
        const blade = () => {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -0.16, 0, 0, 0.16, 0, 0, 0, 0.9, 0.06]), 3));
          g.computeVertexNormals();
          return g;
        };
        const geo = mergeGeoms([blade(), blade().rotateY(2.1), blade().rotateY(4.2)]);
        const mesh = instanced(geo, spots, '#4f9b3e', 0.14);
        mesh.material.side = THREE.DoubleSide;
        mesh.castShadow = false;
        growGroup(mesh, spots, 1.3, 34);
      },
    },

    trees: {
      title: 'the trees', day: 3, needs: 'earth',
      words: ['tree', 'trees', 'forest', 'forests', 'woods', 'wood'],
      verse: 'And the trees yielded fruit after their kind.',
      make() {
        const spots = scatter(420, 3.2);
        const canopy = mergeGeoms([
          new THREE.SphereGeometry(2.0, 9, 7).scale(1, 0.92, 1).translate(0, 5.2, 0),
          new THREE.SphereGeometry(1.4, 9, 7).translate(1.1, 4.4, 0.5),
          new THREE.SphereGeometry(1.2, 9, 7).translate(-1.0, 4.6, -0.45),
          new THREE.SphereGeometry(1.1, 8, 6).translate(0.15, 6.4, -0.6),
        ]);
        const trunk = new THREE.CylinderGeometry(0.22, 0.4, 3.6, 8).translate(0, 1.8, 0);
        growGroup(instanced(canopy, spots, '#2f7d43', 0.12), spots, 1.9, 24);
        growGroup(instanced(trunk, spots.map((s) => ({ ...s })), '#6b4a30', 0.06), spots, 1.9, 24);
        addContactShadows(spots.map((s) => ({ x: s.x, z: s.z, r: 2.6 * s.s })));
      },
    },

    flowers: {
      title: 'the flowers', day: 3, needs: 'grass',
      words: ['flower', 'flowers', 'blossom', 'blossoms', 'bloom', 'blooms'],
      verse: 'And every herb bearing seed was upon the face of the earth.',
      make() {
        const spots = scatter(900, 2.8);
        const geo = mergeGeoms([
          new THREE.CylinderGeometry(0.03, 0.045, 0.7, 5).translate(0, 0.35, 0),
          new THREE.SphereGeometry(0.22, 7, 5).translate(0, 0.8, 0),
        ]);
        const mesh = instanced(geo, spots, '#e2618f', 0.5);
        mesh.castShadow = false;
        growGroup(mesh, spots, 1.1, 40);
      },
    },

    sun: {
      title: 'the sun', day: 4, needs: 'firmament',
      words: ['sun', 'sunlight', 'greater light'],
      verse: 'And the greater light ruled the day.',
      make() {
        const s = makeDisc('#ffe6a0', 26, 620, 420);
        s.set(0.9);
        state.nightTarget = 0;
        updaters.push(() => { s.mat.opacity = 0.95 * (1 - state.dayT); });
      },
    },

    moon: {
      title: 'the moon', day: 4, needs: 'firmament',
      words: ['moon', 'lesser light', 'moonlight'],
      verse: 'And the lesser light ruled the night.',
      make() {
        const m = makeDisc('#dfe7f7', 15, 600, 380);
        m.set(2.4);
        updaters.push(() => { m.mat.opacity = 0.2 + 0.75 * state.dayT; });
      },
    },

    stars: {
      title: 'the stars', day: 4, needs: 'firmament',
      words: ['star', 'stars', 'starlight', 'constellations'],
      verse: 'He made the stars also.',
      make() { makeStars(); },
    },

    fish: {
      title: 'the fish', day: 5, needs: 'waters',
      words: ['fish', 'fishes', 'whales', 'creatures of the sea', 'sea creatures'],
      verse: 'And the waters brought forth abundantly.',
      make() {
        const geo = new THREE.SphereGeometry(1, 8, 6).scale(0.3, 0.26, 0.9);
        const mat = new THREE.MeshStandardMaterial({ color: '#7fd0e8', roughness: 0.5 });
        const school = [];
        for (let i = 0; i < 26; i++) {
          const m = new THREE.Mesh(geo, mat);
          m.visible = false;
          scene.add(m);
          school.push({ m, next: rand() * 6, active: false, t0: 0, x: 0, z: 0, dir: 1 });
        }
        updaters.push((dt, t) => {
          for (const f of school) {
            if (!f.active) {
              if (t > f.next) {
                f.active = true; f.t0 = t;
                const a = rand() * Math.PI * 2, r = 120 + rand() * 220;
                f.x = Math.cos(a) * r; f.z = Math.sin(a) * r;
                if (groundAt(f.x, f.z) > -2) { f.active = false; f.next = t + 1; }
                f.dir = rand() > 0.5 ? 1 : -1;
              }
              continue;
            }
            const k = (t - f.t0) / 1.2;
            if (k >= 1) { f.active = false; f.m.visible = false; f.next = t + 2 + rand() * 8; continue; }
            f.m.visible = true;
            f.m.position.set(f.x + f.dir * 3 * k, SEA_LEVEL - 1 + Math.sin(Math.PI * k) * 5.5, f.z);
            f.m.rotation.z = f.dir * (Math.PI * k - Math.PI / 2);
          }
        });
      },
    },

    birds: {
      title: 'the birds', day: 5, needs: 'firmament',
      words: ['bird', 'birds', 'fowl', 'wings', 'flying creatures'],
      verse: 'And fowl flew above the earth in the open firmament.',
      make() {
        const wing = new THREE.BufferGeometry();
        wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          0, 0, 0.5, 0, 0, -0.5, 1.5, 0.18, 0]), 3));
        wing.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: '#43506b', side: THREE.DoubleSide, roughness: 0.8,
        });
        const flocks = [];
        for (let f = 0; f < 5; f++) {
          const c = new THREE.Vector3((rand() - 0.5) * 300, 60 + rand() * 60, (rand() - 0.5) * 300);
          const fl = { c, r: 40 + rand() * 60, sp: 0.16 + rand() * 0.14, birds: [] };
          for (let b = 0; b < 5; b++) {
            const g = new THREE.Group();
            const l = new THREE.Mesh(wing, mat), r2 = new THREE.Mesh(wing, mat);
            r2.scale.x = -1;
            g.add(l, r2);
            scene.add(g);
            fl.birds.push({ g, l, r: r2, off: b * 1.3 + rand(), ph: rand() * 7 });
          }
          flocks.push(fl);
        }
        updaters.push((dt, t) => {
          for (const fl of flocks) {
            for (const b of fl.birds) {
              const a = t * fl.sp + b.off;
              b.g.position.set(fl.c.x + Math.cos(a) * fl.r,
                fl.c.y + Math.sin(t * 0.5 + b.ph) * 6, fl.c.z + Math.sin(a) * fl.r);
              b.g.rotation.y = -a - Math.PI / 2;
              const flap = Math.sin(t * 7 + b.ph) * 0.7;
              b.l.rotation.x = flap; b.r.rotation.x = -flap;
            }
          }
        });
      },
    },

    beasts: {
      title: 'the beasts', day: 6, needs: 'earth',
      words: ['beast', 'beasts', 'animals', 'cattle', 'deer', 'creatures', 'herds'],
      verse: 'And the earth brought forth the living creature after his kind.',
      make() {
        const body = new THREE.SphereGeometry(1, 9, 7).scale(0.65, 0.5, 1.05);
        const leg = new THREE.CylinderGeometry(0.08, 0.06, 1.2, 6).translate(0, -0.6, 0);
        const neck = new THREE.CylinderGeometry(0.11, 0.16, 0.9, 6);
        const head = new THREE.SphereGeometry(0.24, 8, 6);
        const mat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.9 });
        const herd = [];
        const spots = scatter(14, 4);
        for (const sp of spots) {
          const g = new THREE.Group();
          const b = new THREE.Mesh(body, mat); b.position.y = 1.2; b.castShadow = true;
          const nk = new THREE.Mesh(neck, mat); nk.position.set(0, 1.6, 0.8); nk.rotation.x = 0.55;
          const hd = new THREE.Mesh(head, mat); hd.position.set(0, 1.95, 1.1);
          const legs = [];
          for (const [lx, lz] of [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.42], [0.3, -0.42]]) {
            const l = new THREE.Mesh(leg, mat);
            l.position.set(lx, 1.15, lz);
            g.add(l); legs.push(l);
          }
          g.add(b, nk, hd);
          g.position.set(sp.x, sp.y, sp.z);
          g.scale.setScalar(0.001);
          scene.add(g);
          herd.push({ g, legs, x: sp.x, z: sp.z, tx: sp.x, tz: sp.z,
            state: 'graze', timer: rand() * 4, ph: rand() * 7, born: performance.now() / 1000 });
        }
        updaters.push((dt, t) => {
          for (const h of herd) {
            const grow = ease((t - h.born) / 1.6);
            h.g.scale.setScalar(Math.max(0.001, grow));
            let moving = false;
            if (h.state === 'graze') {
              h.timer -= dt;
              if (h.timer <= 0) {
                for (let i = 0; i < 8; i++) {
                  const a = rand() * Math.PI * 2, d = 8 + rand() * 22;
                  const nx = h.x + Math.cos(a) * d, nz = h.z + Math.sin(a) * d;
                  if (!dryLand(nx, nz, 3.5)) continue;
                  h.tx = nx; h.tz = nz; h.state = 'walk';
                  break;
                }
                if (h.state === 'graze') h.timer = 2 + rand() * 3;
              }
            } else {
              moving = true;
              const dx = h.tx - h.x, dz = h.tz - h.z, dd = Math.hypot(dx, dz);
              if (dd < 0.6) { h.state = 'graze'; h.timer = 3 + rand() * 6; } else {
                h.x += (dx / dd) * 2.4 * dt;
                h.z += (dz / dd) * 2.4 * dt;
                h.g.rotation.y = Math.atan2(dx, dz);
              }
            }
            h.g.position.set(h.x, groundAt(h.x, h.z), h.z);
            const sw = moving ? Math.sin(t * 7 + h.ph) * 0.45 : 0;
            h.legs[0].rotation.x = sw; h.legs[3].rotation.x = sw;
            h.legs[1].rotation.x = -sw; h.legs[2].rotation.x = -sw;
          }
        });
      },
    },

    people: {
      title: 'the people', day: 6, needs: 'earth',
      words: ['people', 'man', 'men', 'woman', 'humankind', 'village', 'city', 'us'],
      verse: 'And they were given the whole earth to keep.',
      make() {
        // find a hospitable shelf near the water for the settlement
        let best = null;
        for (let i = 0; i < 900; i++) {
          const a = rand() * Math.PI * 2, r = 40 + Math.sqrt(rand()) * 200;
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          const y = groundAt(x, z);
          if (y < 9 || y > 26) continue;          // a dry shelf, clear of the tide
          const flat = Math.abs(groundAt(x + 6, z) - y) + Math.abs(groundAt(x, z + 6) - y);
          if (!best || flat < best.flat) best = { x, z, y, flat };
        }
        const c = best || { x: 60, z: 60, y: groundAt(60, 60) };
        village = c;

        const wallMat = new THREE.MeshStandardMaterial({ color: '#d9cbb0', roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: '#9c4a35', roughness: 0.85 });
        const winMat = new THREE.MeshStandardMaterial({
          color: '#8a8070', emissive: '#000000', roughness: 0.6,
        });
        villageWindows.push(winMat);
        const wall = new THREE.CylinderGeometry(1.7, 1.9, 2.4, 9);
        const roof = new THREE.ConeGeometry(2.5, 1.9, 9);
        const homes = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
          const r = 6 + rand() * 13;
          const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
          const g = new THREE.Group();
          const w = new THREE.Mesh(wall, wallMat); w.position.y = 1.2; w.castShadow = true;
          const rf = new THREE.Mesh(roof, roofMat); rf.position.y = 3.2; rf.castShadow = true;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), winMat);
          win.position.set(0, 1.3, 1.72);
          g.add(w, rf, win);
          g.position.set(x, groundAt(x, z), z);
          g.rotation.y = -a;
          g.scale.setScalar(0.001);
          scene.add(g);
          homes.push({ g, born: performance.now() / 1000 + i * 0.12 });
        }

        // the people themselves: small figures that walk between the homes
        const pBody = new THREE.CapsuleGeometry(0.16, 0.5, 4, 8);
        const pHead = new THREE.SphereGeometry(0.16, 8, 6);
        const pMat = new THREE.MeshStandardMaterial({ color: '#e8d9c0', roughness: 0.8 });
        const folk = [];
        for (let i = 0; i < 12; i++) {
          const g = new THREE.Group();
          const b = new THREE.Mesh(pBody, pMat); b.position.y = 0.55; b.castShadow = true;
          const h = new THREE.Mesh(pHead, pMat); h.position.y = 1.03;
          g.add(b, h);
          const a = rand() * Math.PI * 2, r = rand() * 16;
          const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
          g.position.set(x, groundAt(x, z), z);
          g.scale.setScalar(0.001);
          scene.add(g);
          folk.push({ g, x, z, tx: x, tz: z, timer: rand() * 3,
            born: performance.now() / 1000 + 1 + i * 0.1, ph: rand() * 7 });
        }

        updaters.push((dt, t) => {
          for (const h of homes) h.g.scale.setScalar(Math.max(0.001, ease((t - h.born) / 1.4)));
          for (const p of folk) {
            p.g.scale.setScalar(Math.max(0.001, ease((t - p.born) / 1.2)));
            p.timer -= dt;
            if (p.timer <= 0) {
              const a = rand() * Math.PI * 2, d = 3 + rand() * 12;
              const nx = c.x + Math.cos(a) * d, nz = c.z + Math.sin(a) * d;
              if (dryLand(nx, nz, 3)) { p.tx = nx; p.tz = nz; }
              p.timer = 3 + rand() * 5;
            }
            const dx = p.tx - p.x, dz = p.tz - p.z, dd = Math.hypot(dx, dz);
            if (dd > 0.4) {
              p.x += (dx / dd) * 1.5 * dt;
              p.z += (dz / dd) * 1.5 * dt;
              p.g.rotation.y = Math.atan2(dx, dz);
              p.g.position.y = groundAt(p.x, p.z) + Math.abs(Math.sin(t * 5 + p.ph)) * 0.07;
            } else {
              p.g.position.y = groundAt(p.x, p.z);
            }
            p.g.position.x = p.x; p.g.position.z = p.z;
          }
          // hearth-light in the windows after dark
          const glowN = state.dayT;
          winMat.emissive.setRGB(1, 0.72, 0.36).multiplyScalar(glowN * 0.9);
        });
      },
    },

    rain: {
      title: 'the rain', day: 6, needs: 'firmament',
      words: ['rain', 'storm', 'rains', 'downpour'],
      verse: 'And rain fell upon the face of the earth.',
      make() { makeRain(); state.rain = true; },
    },

    wind: {
      title: 'the wind', day: 6, needs: 'firmament',
      words: ['wind', 'winds', 'breeze', 'breath'],
      verse: 'And a wind moved over the face of the world.',
      make() { state.windT = 1; },
    },

    night: {
      title: 'the night', day: 4, needs: 'firmament', repeatable: true,
      words: ['night', 'darkness', 'evening', 'dusk'],
      verse: 'And the evening came, and it was good.',
      make() { state.nightTarget = 1; },
    },
  };

  let village = null;
  const villageWindows = [];

  // ------------------------------------------------------------------ public
  return {
    ACTS,
    made,
    state,
    scene,
    get village() { return village; },
    groundAt,
    hasAct(id) { return made.has(id); },
    perform(id) {
      const act = ACTS[id];
      if (!act) return { ok: false, reason: 'unknown' };
      if (made.has(id) && !act.repeatable) return { ok: false, reason: 'already', act };
      if (act.needs && !made.has(act.needs)) {
        return { ok: false, reason: 'needs', act, missing: ACTS[act.needs] };
      }
      made.add(id);
      act.make();
      return { ok: true, act };
    },
    // dawn again, after a night
    dawn() { state.nightTarget = 0; },
    setRain(on) { state.rain = on; },
    update(dt, t, camPos) {
      if (camPos) lastCam.copy(camPos);
      for (const u of updaters) u(dt, t, camPos);
    },
  };
}
