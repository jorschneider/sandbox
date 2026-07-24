/* ============================================================
   Boundary States in CFTs of the Annulus — interactive figures

   One fixed transparent WebGL canvas behind the page; each
   figure is an empty ".viz-stage" div that we scissor-render
   a separate scene into (the classic three.js multi-scene
   pattern). Five scenes:

     A  hero      — annulus with conformal grid + flowing modes
     B  fig-morph — annulus <-> cylinder under w = log z
     C  fig-dual  — open vs closed channel slicing
     D  fig-wave  — Ishibashi / Cardy standing waves (Ising)
     E  fig-holo  — AdS/BCFT end-of-the-world brane cartoon
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = prefersReduced ? 0.3 : 1;

const COL = {
  a: 0x2dd4bf,        // boundary alpha — teal
  b: 0xf59e0b,        // boundary beta — amber
  closed: 0xa78bfa,   // closed channel — violet
  open: 0xe2e8f0,
  grid: 0x8b9bb4,
  rose: 0xfb7185,
  sky: 0x38bdf8,
  bright: 0xe8edf5,
};

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const smooth = (k) => k * k * (3 - 2 * k);
const TAU = Math.PI * 2;

/* ---------------- renderer ---------------- */

const canvas = document.getElementById('gl');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
} catch (e) {
  document.body.classList.add('no-webgl');
}

/* soft round sprite for glowy points */
function makeDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
const DOT = renderer ? makeDotTexture() : null;

/* ---------------- views ---------------- */

const views = [];

function makeView(id, opts = {}) {
  const el = document.getElementById(id);
  if (!el || !renderer) return null;
  const v = {
    el,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(opts.fov ?? 42, 1, 0.1, 200),
    yaw: opts.yaw ?? 0.5,
    pitch: opts.pitch ?? 0.45,
    dist: opts.dist ?? 8,
    auto: opts.auto ?? 0.05,
    minPitch: opts.minPitch ?? -0.1,
    maxPitch: opts.maxPitch ?? 1.35,
    dragging: false,
    update: null,
  };
  if (opts.orbit !== false) attachOrbit(v);
  views.push(v);
  return v;
}

function attachOrbit(v) {
  let px = 0, py = 0;
  v.el.addEventListener('pointerdown', (e) => {
    v.dragging = true;
    px = e.clientX; py = e.clientY;
    v.el.setPointerCapture(e.pointerId);
  });
  v.el.addEventListener('pointermove', (e) => {
    if (!v.dragging) return;
    v.yaw -= (e.clientX - px) * 0.005;
    v.pitch = clamp(v.pitch + (e.clientY - py) * 0.005, v.minPitch, v.maxPitch);
    px = e.clientX; py = e.clientY;
  });
  for (const t of ['pointerup', 'pointercancel']) {
    v.el.addEventListener(t, () => { v.dragging = false; });
  }
}

function placeCamera(v, dt) {
  if (!v.dragging) v.yaw += v.auto * dt * SPEED;
  const cp = Math.cos(v.pitch);
  v.camera.position.set(
    v.dist * cp * Math.sin(v.yaw),
    v.dist * Math.sin(v.pitch),
    v.dist * cp * Math.cos(v.yaw),
  );
  v.camera.lookAt(0, 0, 0);
}

/* ---------------- geometry helpers ---------------- */

function lineMat(color, opacity, additive = true) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
}

function circleLoop(r, n, color, opacity, y = 0) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pos[i * 3] = r * Math.cos(t);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = r * Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.LineLoop(g, lineMat(color, opacity));
}

/* a LineLoop whose n points we rewrite every frame */
function dynamicLoop(n, color, opacity) {
  const pos = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const loop = new THREE.LineLoop(g, lineMat(color, opacity));
  loop.frustumCulled = false;
  return loop;
}

function glowTorus(r, tube, color, opacity, segments = 140) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, 10, segments),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

/* ============================================================
   SCENE A — hero annulus
   ============================================================ */

const mouse = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

(function heroScene() {
  const v = makeView('fig-hero', { orbit: false, dist: 9.5, pitch: 0.62, fov: 40, auto: 0.04 });
  if (!v) return;

  const R1 = 1.5, R2 = 3.4, q = R1 / R2;
  const g = new THREE.Group();
  v.scene.add(g);

  // conformal grid: circles log-spaced in r, faint radial spokes
  for (let i = 0; i <= 8; i++) {
    g.add(circleLoop(R2 * Math.pow(q, 1 - i / 8), 160, COL.grid, 0.13));
  }
  const NS = 48;
  const sp = new Float32Array(NS * 2 * 3);
  for (let i = 0; i < NS; i++) {
    const t = (i / NS) * TAU;
    sp.set([R1 * Math.cos(t), 0, R1 * Math.sin(t), R2 * Math.cos(t), 0, R2 * Math.sin(t)], i * 6);
  }
  const spokes = new THREE.BufferGeometry();
  spokes.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  g.add(new THREE.LineSegments(spokes, lineMat(COL.grid, 0.07)));

  // glowing boundary circles
  g.add(glowTorus(R1, 0.022, COL.a, 1));
  g.add(glowTorus(R1, 0.07, COL.a, 0.22));
  g.add(glowTorus(R2, 0.022, COL.b, 1));
  g.add(glowTorus(R2, 0.07, COL.b, 0.22));

  // particles circulating with angular velocity ~ 1/r (conformal flow feel)
  const NP = 1100;
  const ppos = new Float32Array(NP * 3);
  const pcol = new Float32Array(NP * 3);
  const pr = new Float32Array(NP), pth = new Float32Array(NP),
        pw = new Float32Array(NP), pph = new Float32Array(NP);
  const ca = new THREE.Color(COL.a), cb = new THREE.Color(COL.b), cc = new THREE.Color();
  for (let i = 0; i < NP; i++) {
    pr[i] = R2 * Math.pow(q, 1 - Math.random());
    pth[i] = Math.random() * TAU;
    pw[i] = (0.55 / pr[i]) * (Math.random() > 0.5 ? 1 : -1) * (0.6 + 0.8 * Math.random());
    pph[i] = Math.random() * TAU;
    cc.copy(ca).lerp(cb, (pr[i] - R1) / (R2 - R1));
    pcol.set([cc.r, cc.g, cc.b], i * 3);
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const points = new THREE.Points(pgeo, new THREE.PointsMaterial({
    size: 0.085, map: DOT, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  points.frustumCulled = false;
  g.add(points);

  // distant dust
  const ND = 300;
  const dpos = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) {
    const r = 9 + Math.random() * 9, th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1);
    dpos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  v.scene.add(new THREE.Points(dgeo, new THREE.PointsMaterial({
    size: 0.06, map: DOT, color: 0x94a3b8, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  const basePitch = v.pitch;
  v.update = (t, dt) => {
    g.rotation.y += dt * 0.05 * SPEED;
    v.pitch = basePitch - mouse.y * 0.06;
    for (let i = 0; i < NP; i++) {
      pth[i] += pw[i] * dt * SPEED;
      ppos[i * 3] = pr[i] * Math.cos(pth[i]);
      ppos[i * 3 + 1] = Math.sin(t * 0.8 + pph[i]) * 0.05;
      ppos[i * 3 + 2] = pr[i] * Math.sin(pth[i]);
    }
    pgeo.attributes.position.needsUpdate = true;
  };
})();

/* ============================================================
   SCENE B — annulus <-> cylinder morph (w = log z)
   ============================================================ */

(function morphScene() {
  const v = makeView('fig-morph', { dist: 8.6, pitch: 0.5, yaw: 0.7 });
  if (!v) return;

  const R2 = 2.7, q = 0.26, RC = 1.7, H = 3.6;

  // embed(u, ang, m): morph between flat annulus (m=0) and cylinder (m=1).
  // u in [0,1]: u=0 inner boundary (alpha), u=1 outer boundary (beta).
  // Radii log-spaced so the grid is conformally uniform — straight under log z.
  function embed(u, ang, m, out, off) {
    const r = R2 * Math.pow(q, 1 - u);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    out[off]     = lerp(r * ca, RC * ca, m);
    out[off + 1] = lerp(0, H * (u - 0.5), m);
    out[off + 2] = lerp(r * sa, RC * sa, m);
  }

  // grid as one LineSegments buffer: param list of (u, ang) per endpoint
  const NU = 12, NV = 96, NLON = 24, NUSEG = 28;
  const params = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    for (let j = 0; j < NV; j++) {
      params.push([u, (j / NV) * TAU], [u, ((j + 1) / NV) * TAU]);
    }
  }
  for (let j = 0; j < NLON; j++) {
    const ang = (j / NLON) * TAU;
    for (let i = 0; i < NUSEG; i++) {
      params.push([i / NUSEG, ang], [(i + 1) / NUSEG, ang]);
    }
  }
  const gpos = new Float32Array(params.length * 3);
  const ggeo = new THREE.BufferGeometry();
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  const grid = new THREE.LineSegments(ggeo, lineMat(COL.grid, 0.18));
  grid.frustumCulled = false;
  v.scene.add(grid);

  // translucent skin
  const SU = 24, SV = 72;
  const spos = new Float32Array((SU + 1) * (SV + 1) * 3);
  const sidx = [];
  for (let i = 0; i < SU; i++) {
    for (let j = 0; j < SV; j++) {
      const a = i * (SV + 1) + j, b = a + SV + 1;
      sidx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sgeo.setIndex(sidx);
  const skin = new THREE.Mesh(sgeo, new THREE.MeshBasicMaterial({
    color: 0x94a3b8, transparent: true, opacity: 0.05,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  skin.frustumCulled = false;
  v.scene.add(skin);

  // boundary loops (dynamic)
  const NB = 160;
  const loopA = dynamicLoop(NB, COL.a, 1);
  const loopAg = dynamicLoop(NB, COL.a, 0.3);
  const loopB = dynamicLoop(NB, COL.b, 1);
  const loopBg = dynamicLoop(NB, COL.b, 0.3);
  v.scene.add(loopA, loopAg, loopB, loopBg);

  const label = document.getElementById('morph-label');
  let lastM = -1, lastLabel = '';

  // morph cycle: hold 0 / ease up / hold 1 / ease down
  function morphAt(t) {
    const T = 8.5, c = (t * SPEED) % T;
    if (c < 1.4) return 0;
    if (c < 4.0) return smooth((c - 1.4) / 2.6);
    if (c < 5.4) return 1;
    return 1 - smooth((c - 5.4) / 3.1);
  }

  function rebuild(m) {
    for (let k = 0; k < params.length; k++) {
      embed(params[k][0], params[k][1], m, gpos, k * 3);
    }
    ggeo.attributes.position.needsUpdate = true;
    let k = 0;
    for (let i = 0; i <= SU; i++) {
      for (let j = 0; j <= SV; j++) {
        embed(i / SU, (j / SV) * TAU, m, spos, k * 3);
        k++;
      }
    }
    sgeo.attributes.position.needsUpdate = true;
    const la = loopA.geometry.attributes.position.array;
    const lb = loopB.geometry.attributes.position.array;
    for (let i = 0; i < NB; i++) {
      const ang = (i / NB) * TAU;
      embed(0, ang, m, la, i * 3);
      embed(1, ang, m, lb, i * 3);
    }
    loopAg.geometry.attributes.position.array.set(la);
    loopBg.geometry.attributes.position.array.set(lb);
    for (const l of [loopA, loopAg, loopB, loopBg]) {
      l.geometry.attributes.position.needsUpdate = true;
    }
  }

  v.update = (t) => {
    const m = morphAt(t);
    if (Math.abs(m - lastM) > 1e-4) {
      rebuild(m);
      lastM = m;
    }
    if (label) {
      const txt = m < 0.5 ? 'annulus  q ≤ |z| ≤ 1' : 'cylinder  w = log z';
      if (txt !== lastLabel) { label.textContent = txt; lastLabel = txt; }
    }
  };
})();

/* ============================================================
   SCENE C — open vs closed channel on the cylinder
   ============================================================ */

(function dualScene() {
  const v = makeView('fig-dual', { dist: 8.6, pitch: 0.32, yaw: 0.6 });
  if (!v) return;

  const R = 1.6, H = 3.2;

  // faint shell + grid
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 64, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x94a3b8, transparent: true, opacity: 0.05,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  v.scene.add(shell);
  for (let i = 1; i < 8; i++) {
    v.scene.add(circleLoop(R, 96, COL.grid, 0.08, -H / 2 + (i / 8) * H));
  }
  const NL = 28;
  const lp = new Float32Array(NL * 2 * 3);
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * TAU, x = R * Math.cos(a), z = R * Math.sin(a);
    lp.set([x, -H / 2, z, x, H / 2, z], i * 6);
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  v.scene.add(new THREE.LineSegments(lgeo, lineMat(COL.grid, 0.1)));

  // boundary circles: alpha bottom, beta top
  for (const [y, c] of [[-H / 2, COL.a], [H / 2, COL.b]]) {
    const t1 = glowTorus(R, 0.025, c, 1);
    const t2 = glowTorus(R, 0.08, c, 0.2);
    t1.position.y = t2.position.y = y;
    v.scene.add(t1, t2);
  }

  const NTRAIL = 16;

  // --- open channel: a string segment sweeping around the cylinder ---
  const openG = new THREE.Group();
  v.scene.add(openG);
  const stringGeo = new THREE.CylinderGeometry(0.026, 0.026, H, 8);
  const openMain = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: COL.bright }));
  const endA = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16),
    new THREE.MeshBasicMaterial({ color: COL.a }));
  const endB = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16),
    new THREE.MeshBasicMaterial({ color: COL.b }));
  endA.position.y = -H / 2; endB.position.y = H / 2;
  openG.add(openMain, endA, endB);
  const openTrail = [];
  for (let i = 0; i < NTRAIL; i++) {
    const m = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({
      color: COL.bright, transparent: true,
      opacity: 0.28 * Math.pow(1 - i / NTRAIL, 1.7),
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    openG.add(m);
    openTrail.push(m);
  }

  // --- closed channel: a loop sweeping along the cylinder ---
  const closedG = new THREE.Group();
  v.scene.add(closedG);
  const ringGeo = new THREE.TorusGeometry(R, 0.03, 8, 96);
  const closedMain = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COL.closed }));
  closedMain.rotation.x = Math.PI / 2;
  closedG.add(closedMain);
  const closedTrail = [];
  for (let i = 0; i < NTRAIL; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: COL.closed, transparent: true,
      opacity: 0.3 * Math.pow(1 - i / NTRAIL, 1.7),
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.rotation.x = Math.PI / 2;
    closedG.add(m);
    closedTrail.push(m);
  }

  let mode = 'open';
  closedG.visible = false;

  for (const btn of document.querySelectorAll('[data-channel]')) {
    btn.addEventListener('click', () => {
      mode = btn.dataset.channel;
      openG.visible = mode === 'open';
      closedG.visible = mode === 'closed';
      for (const b of document.querySelectorAll('[data-channel]')) {
        b.classList.toggle('active', b === btn);
      }
      document.getElementById('eq-open')?.classList.toggle('active', mode === 'open');
      document.getElementById('eq-closed')?.classList.toggle('active', mode === 'closed');
    });
  }

  v.update = (t) => {
    if (mode === 'open') {
      const th = t * 0.7 * SPEED;
      const place = (obj, ang) => {
        obj.position.x = R * Math.cos(ang);
        obj.position.z = R * Math.sin(ang);
      };
      place(openMain, th); place(endA, th); place(endB, th);
      openTrail.forEach((m, i) => place(m, th - (i + 1) * 0.085));
    } else {
      const p = (t * 0.22 * SPEED) % 1;
      closedMain.position.y = -H / 2 + p * H;
      closedTrail.forEach((m, i) => {
        const y = closedMain.position.y - (i + 1) * 0.09;
        m.visible = y > -H / 2;
        m.position.y = y;
      });
    }
  };
})();

/* ============================================================
   SCENE D — Ishibashi / Cardy standing waves (Ising boundary)
   ============================================================ */

(function waveScene() {
  const v = makeView('fig-wave', { dist: 7.8, pitch: 0.55, yaw: 0.4 });
  if (!v) return;

  const R = 2.1, N = 256;
  const AMP = 0.34;
  const K = [2, 3, 5];          // visual mode numbers for |1>>, |eps>>, |sigma>>
  const W = K.map((k) => k * 0.9);

  v.scene.add(circleLoop(R, 160, COL.grid, 0.16));

  const sum = dynamicLoop(N, COL.bright, 0.95);
  const lmover = dynamicLoop(N, COL.rose, 0.32);
  const rmover = dynamicLoop(N, COL.sky, 0.32);
  v.scene.add(sum, lmover, rmover);

  // glow points riding the bright curve
  const NG = N / 2;
  const gpos = new Float32Array(NG * 3);
  const ggeo = new THREE.BufferGeometry();
  ggeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  const glow = new THREE.Points(ggeo, new THREE.PointsMaterial({
    size: 0.09, map: DOT, color: COL.a, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.frustumCulled = false;
  v.scene.add(glow);

  // Ising Cardy coefficients on (|1>>, |eps>>, |sigma>>)
  const S = Math.SQRT1_2, F = Math.pow(2, -0.25);
  const PRESETS = {
    plus:  [S, S, F],
    minus: [S, S, -F],
    free:  [1, -1, 0],
    i1: [1, 0, 0],
    ie: [0, 1, 0],
    is: [0, 0, 1],
  };
  const cur = [...PRESETS.plus];
  let targ = PRESETS.plus;

  const bars = [
    document.querySelector('#coef-1 .coef-fill'),
    document.querySelector('#coef-e .coef-fill'),
    document.querySelector('#coef-s .coef-fill'),
  ];
  const vals = [
    document.querySelector('#coef-1 .coef-val'),
    document.querySelector('#coef-e .coef-val'),
    document.querySelector('#coef-s .coef-val'),
  ];

  function setBars(c) {
    for (let j = 0; j < 3; j++) {
      if (!bars[j]) continue;
      const half = Math.abs(c[j]) * 50;   // % of track, anchored at center
      bars[j].style.width = half + '%';
      bars[j].style.left = c[j] >= 0 ? '50%' : (50 - half) + '%';
      bars[j].classList.toggle('neg', c[j] < 0);
      vals[j].textContent = (c[j] >= 0 ? '+' : '−') + Math.abs(c[j]).toFixed(2);
    }
  }
  setBars(cur);

  for (const btn of document.querySelectorAll('[data-state]')) {
    btn.addEventListener('click', () => {
      targ = PRESETS[btn.dataset.state];
      setBars(targ);
      for (const b of document.querySelectorAll('[data-state]')) {
        b.classList.toggle('active', b === btn);
      }
      for (const sf of document.querySelectorAll('.state-formula .sf')) {
        sf.classList.toggle('hidden', sf.id !== 'f-' + btn.dataset.state);
      }
    });
  }

  const ps = sum.geometry.attributes.position.array;
  const pl = lmover.geometry.attributes.position.array;
  const pr = rmover.geometry.attributes.position.array;

  v.update = (t, dt) => {
    const k = 1 - Math.exp(-dt * 4);
    for (let j = 0; j < 3; j++) cur[j] = lerp(cur[j], targ[j], k);

    for (let i = 0; i < N; i++) {
      const th = (i / N) * TAU;
      let dl = 0, dr = 0;
      for (let j = 0; j < 3; j++) {
        dl += cur[j] * 0.5 * AMP * Math.cos(K[j] * th - W[j] * t * SPEED);
        dr += cur[j] * 0.5 * AMP * Math.cos(K[j] * th + W[j] * t * SPEED);
      }
      const x = R * Math.cos(th), z = R * Math.sin(th);
      ps[i * 3] = x; ps[i * 3 + 1] = dl + dr; ps[i * 3 + 2] = z;
      pl[i * 3] = x; pl[i * 3 + 1] = dl;      pl[i * 3 + 2] = z;
      pr[i * 3] = x; pr[i * 3 + 1] = dr;      pr[i * 3 + 2] = z;
      if (i % 2 === 0) {
        const m = (i / 2) * 3;
        gpos[m] = x; gpos[m + 1] = dl + dr; gpos[m + 2] = z;
      }
    }
    for (const l of [sum, lmover, rmover]) l.geometry.attributes.position.needsUpdate = true;
    ggeo.attributes.position.needsUpdate = true;
  };
})();

/* ============================================================
   SCENE E — AdS/BCFT: end-of-the-world brane + RT surface
   ============================================================ */

(function holoScene() {
  const v = makeView('fig-holo', { dist: 8.8, pitch: 0.4, yaw: -0.55, auto: 0.03, minPitch: 0.05 });
  if (!v) return;

  const XMAX = 3.2, ZW = 2.0, DEPTH = 2.8;

  // CFT half-plane at y=0, x in [0, XMAX] — teal grid
  const cft = [];
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * XMAX;
    cft.push(x, 0, -ZW, x, 0, ZW);
  }
  for (let j = 0; j <= 6; j++) {
    const z = -ZW + (j / 6) * 2 * ZW;
    cft.push(0, 0, z, XMAX, 0, z);
  }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cft), 3));
  v.scene.add(new THREE.LineSegments(cgeo, lineMat(COL.a, 0.4)));
  const csheet = new THREE.Mesh(
    new THREE.PlaneGeometry(XMAX, 2 * ZW),
    new THREE.MeshBasicMaterial({
      color: COL.a, transparent: true, opacity: 0.06,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  csheet.rotation.x = -Math.PI / 2;
  csheet.position.set(XMAX / 2, 0, 0);
  v.scene.add(csheet);

  // the boundary of the BCFT: bright white line along z at x=0
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([0, 0, -ZW, 0, 0, ZW]), 3));
  v.scene.add(new THREE.Line(bgeo, lineMat(0xffffff, 0.95)));

  // bulk: faint vertical curtain grid at z=0
  const bulk = [];
  for (let i = 0; i <= 10; i++) {
    const x = -1.4 + (i / 10) * (XMAX + 1.4);
    bulk.push(x, 0, 0, x, -DEPTH, 0);
  }
  for (let j = 1; j <= 5; j++) {
    const y = -(j / 5) * DEPTH;
    bulk.push(-1.4, y, 0, XMAX, y, 0);
  }
  const bkgeo = new THREE.BufferGeometry();
  bkgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bulk), 3));
  v.scene.add(new THREE.LineSegments(bkgeo, lineMat(COL.grid, 0.12)));

  // end-of-the-world brane: a sheet hinged on the boundary line,
  // hanging into the bulk at angle theta from vertical
  const braneG = new THREE.Group();
  v.scene.add(braneG);
  const brane = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * ZW, DEPTH),
    new THREE.MeshBasicMaterial({
      color: COL.b, transparent: true, opacity: 0.14,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  brane.rotation.y = Math.PI / 2;
  brane.position.y = -DEPTH / 2;
  braneG.add(brane);
  const bedge = [];
  for (let j = 0; j <= 4; j++) {
    const z = -ZW + (j / 4) * 2 * ZW;
    bedge.push(0, 0, z, 0, -DEPTH, z);
  }
  bedge.push(0, -DEPTH, -ZW, 0, -DEPTH, ZW);
  const begeo = new THREE.BufferGeometry();
  begeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bedge), 3));
  braneG.add(new THREE.LineSegments(begeo, lineMat(COL.b, 0.5)));

  // RT surface: circular arc from (x0,0,0) into the bulk, centered on the
  // hinge line so it always meets the brane at a right angle
  const x0 = 2.3, NA = 64;
  const apos = new Float32Array(NA * 3);
  const ageo = new THREE.BufferGeometry();
  ageo.setAttribute('position', new THREE.BufferAttribute(apos, 3));
  const rt = new THREE.Line(ageo, lineMat(COL.closed, 0.9));
  rt.frustumCulled = false;
  v.scene.add(rt);

  const anchor = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshBasicMaterial({ color: COL.closed }));
  anchor.position.set(x0, 0, 0);
  v.scene.add(anchor);

  const readout = document.getElementById('holo-readout');
  let lastDeg = -1;

  v.update = (t) => {
    const th = 0.5 + 0.38 * Math.sin(t * 0.45 * SPEED);  // brane angle from vertical
    braneG.rotation.z = -th;  // tilt toward -x, where the RT arc lands
    const span = Math.PI / 2 + th;
    for (let i = 0; i < NA; i++) {
      const ph = (i / (NA - 1)) * span;
      apos[i * 3] = x0 * Math.cos(ph);
      apos[i * 3 + 1] = -x0 * Math.sin(ph) * (DEPTH / x0 / 1.25);
      apos[i * 3 + 2] = 0;
    }
    ageo.attributes.position.needsUpdate = true;
    if (readout) {
      const deg = Math.round(th * 180 / Math.PI);
      if (deg !== lastDeg) {
        readout.textContent = `brane angle θ = ${deg}°  ·  boundary entropy ln g ∝ θ`;
        lastDeg = deg;
      }
    }
  };
})();

/* ============================================================
   render loop — scissor each visible view into its stage rect
   ============================================================ */

function resize() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (renderer) {
    resize();
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);

    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.width === 0 || r.height === 0) continue;
      const left = Math.round(r.left), bottom = Math.round(innerHeight - r.bottom);
      const w = Math.round(r.width), h = Math.round(r.height);
      renderer.setViewport(left, bottom, w, h);
      renderer.setScissor(left, bottom, w, h);
      v.camera.aspect = w / h;
      v.camera.updateProjectionMatrix();
      placeCamera(v, dt);
      if (v.update) v.update(t, dt);
      renderer.render(v.scene, v.camera);
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
