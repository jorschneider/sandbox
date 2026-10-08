/* ============================================================
   THE DEATH OF MAO — a 3-minute 3D teaser trailer
   Satire in the register of "The Death of Stalin" (2017).

   One WebGL canvas, eight low-poly sets, a scripted 180s
   shot list, DOM title cards, and a fully procedural
   pseudo-orchestral score scheduled through WebAudio.
   ============================================================ */

import * as THREE from '../vendor/three.module.min.js';

const DUR = 180;

/* ---------------- small helpers ---------------- */

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeIO = (k) => k * k * (3 - 2 * k);
const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

const M = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function ground(size, mat) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  return g;
}

function starGeo(R = 1, r = 0.42) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rad, y = -Math.sin(a) * rad;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

/* roof with a vaguely upturned-eave silhouette: a squashed 4-sided cone */
function roof(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1, 4),
    M(color, { roughness: 0.6 })
  );
  cone.rotation.y = Math.PI / 4;
  cone.scale.set(w, h, d);
  cone.castShadow = true;
  g.add(cone);
  g.position.set(x, y, z);
  return g;
}

/* ---------------- the little people ---------------- */

const SKIN = 0xd9b38c;

function makeFigure({ suit = 0x6b705c, cap = null, scale = 1 } = {}) {
  const g = new THREE.Group();
  const mSuit = M(suit, { roughness: 0.95 });
  const mSkin = M(SKIN, { roughness: 0.7 });

  const legGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
  legGeo.translate(0, -0.25, 0);
  const lLeg = new THREE.Mesh(legGeo, mSuit);
  lLeg.position.set(-0.11, 0.5, 0);
  const rLeg = new THREE.Mesh(legGeo.clone(), mSuit);
  rLeg.position.set(0.11, 0.5, 0);

  const torso = box(0.42, 0.56, 0.24, mSuit, 0, 0.79, 0);

  const armGeo = new THREE.BoxGeometry(0.11, 0.46, 0.11);
  armGeo.translate(0, -0.2, 0);
  const lArm = new THREE.Mesh(armGeo, mSuit);
  lArm.position.set(-0.28, 1.02, 0);
  const rArm = new THREE.Mesh(armGeo.clone(), mSuit);
  rArm.position.set(0.28, 1.02, 0);

  const headG = new THREE.Group();
  headG.position.set(0, 1.13, 0);
  const head = box(0.24, 0.26, 0.24, mSkin, 0, 0.14, 0);
  headG.add(head);
  if (cap !== null) {
    const c = box(0.27, 0.07, 0.27, M(cap), 0, 0.3, 0);
    const brim = box(0.27, 0.025, 0.12, M(cap), 0, 0.265, 0.16);
    headG.add(c, brim);
  }

  [lLeg, rLeg, torso, lArm, rArm].forEach((p) => (p.castShadow = true));
  g.add(lLeg, rLeg, torso, lArm, rArm, headG);
  g.scale.setScalar(scale);
  g.userData = { lLeg, rLeg, lArm, rArm, head: headG, torso };
  return g;
}

function runCycle(f, t, speed = 9, amp = 1) {
  const u = f.userData;
  const s = Math.sin(t * speed);
  u.lLeg.rotation.x = s * amp;
  u.rLeg.rotation.x = -s * amp;
  u.lArm.rotation.x = -s * amp * 0.9;
  u.rArm.rotation.x = s * amp * 0.9;
  f.position.y = Math.abs(Math.cos(t * speed)) * 0.05;
}

function flail(f, t, speed = 12) {
  const u = f.userData;
  u.lArm.rotation.z = 2.4 + Math.sin(t * speed) * 0.5;
  u.rArm.rotation.z = -2.4 - Math.cos(t * speed * 1.13) * 0.5;
  u.lArm.rotation.x = Math.sin(t * speed * 0.7) * 0.4;
  u.rArm.rotation.x = Math.cos(t * speed * 0.8) * 0.4;
  u.head.rotation.y = Math.sin(t * speed * 0.45) * 0.5;
}

function idle(f, t, phase = 0) {
  const u = f.userData;
  u.torso.rotation.z = Math.sin(t * 1.2 + phase) * 0.02;
  u.head.rotation.y = Math.sin(t * 0.6 + phase) * 0.15;
}

function sit(f) {
  const u = f.userData;
  u.lLeg.rotation.x = -1.45;
  u.rLeg.rotation.x = -1.45;
  f.position.y = -0.22;
}

/* ---------------- waving flags ---------------- */

const flagGeos = [];

function makeFlag(w, h, color, segs = 20, tag = '') {
  const geo = new THREE.PlaneGeometry(w, h, segs, Math.round(segs * 0.6));
  const mat = M(color, { side: THREE.DoubleSide, roughness: 0.75 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  geo.userData = { w, base: geo.attributes.position.array.slice(), tag };
  flagGeos.push(geo);
  return mesh;
}

/* only animate the cloth that's actually on screen */
function updateFlags(t, tag) {
  for (const geo of flagGeos) {
    if (geo.userData.tag !== tag) continue;
    const pos = geo.attributes.position;
    const base = geo.userData.base;
    const w = geo.userData.w;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const k = (x / w + 0.5); // 0 at pole edge, 1 at free edge
      pos.setZ(i, (Math.sin(x * 2.2 + t * 5) * 0.5 + Math.sin(y * 3 + t * 3.4) * 0.3) * k * w * 0.06);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
}

/* ============================================================
   SETS
   Each builder returns { scene, update(sh, tL, tG, cam) }.
   `sh` is the active shot descriptor (sh.id distinguishes
   vignettes), tL is time within the shot, tG global time.
   ============================================================ */

const sets = {};

/* --- Zhongnanhai, exterior, night ------------------------- */
function buildExt() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x060b16);
  sc.fog = new THREE.Fog(0x060b16, 18, 55);

  sc.add(ground(140, M(0x10131c)));
  // lake
  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 26),
    M(0x0a1626, { roughness: 0.15, metalness: 0.7 })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 0.01, 9);
  sc.add(lake);
  // moon path on water
  const streak = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 18),
    new THREE.MeshBasicMaterial({ color: 0x9db8d9, transparent: true, opacity: 0.18 })
  );
  streak.rotation.x = -Math.PI / 2;
  streak.position.set(-4, 0.02, 9);
  sc.add(streak);

  // pavilion on a platform
  const pav = new THREE.Group();
  pav.add(box(9, 0.5, 6, M(0x3a3a40), 0, 0.25, 0));
  pav.add(box(7, 2.4, 4.4, M(0x6e1f1f), 0, 1.7, 0));
  for (let i = -1; i <= 1; i += 2) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 8), M(0x8e2a22));
    col.position.set(i * 3.1, 1.8, 2.0);
    pav.add(col);
  }
  pav.add(roof(6.2, 1.5, 4.6, 0x23304a, 0, 3.6, 0));
  pav.add(box(4.4, 1.1, 3, M(0x6e1f1f), 0, 4.6, 0));
  pav.add(roof(4.2, 1.2, 3.4, 0x23304a, 0, 5.6, 0));
  pav.position.z = -4;
  sc.add(pav);

  // distant wall + gate silhouettes
  sc.add(box(70, 3, 1.4, M(0x141821), 0, 1.5, -22, false));
  sc.add(roof(8, 1.4, 3, 0x10141d, -16, 4, -22));
  sc.add(roof(8, 1.4, 3, 0x10141d, 18, 4, -22));

  // trees
  for (let i = 0; i < 14; i++) {
    const x = -30 + Math.random() * 60;
    if (Math.abs(x) < 7) continue;
    const tr = new THREE.Mesh(
      new THREE.SphereGeometry(1.2 + Math.random() * 1.4, 6, 5),
      M(0x0c1410)
    );
    tr.position.set(x, 1.6 + Math.random(), -14 + Math.random() * 8);
    sc.add(tr);
  }

  // lanterns
  const lanterns = [];
  for (let i = -1; i <= 1; i += 2) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5a3c })
    );
    s.position.set(i * 3.1, 2.6, -1.8);
    sc.add(s);
    const pl = new THREE.PointLight(0xff6a3a, 14, 12, 2);
    pl.position.copy(s.position).z += 0.5;
    sc.add(pl);
    lanterns.push(s);
  }

  // moon + moonlight
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xcfdcec })
  );
  moon.position.set(-14, 16, -34);
  sc.add(moon);
  const dir = new THREE.DirectionalLight(0x8fa6c9, 2.4);
  dir.position.set(-14, 18, -10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  sc.add(dir, new THREE.AmbientLight(0x2a3a55, 2.4));

  // a lone sentry pacing the platform
  const sentry = makeFigure({ suit: 0x37422f, cap: 0x2c3526 });
  sentry.position.set(2.2, 0.5, -1.6);
  sc.add(sentry);

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      sentry.position.x = 2.2 + Math.sin(tG * 0.28) * 1.6;
      sentry.rotation.y = Math.cos(tG * 0.28) > 0 ? Math.PI / 2 : -Math.PI / 2;
      runCycle(sentry, tG, 4.4, 0.45);
      const k = easeIO(clamp01(tL / 12));
      cam.position.set(lerp(-11, -5, k), lerp(1.4, 2.2, k), lerp(16, 10.5, k));
      cam.lookAt(0, 2.6, -4);
    },
  };
}

/* --- the Chairman's study ---------------------------------- */
function buildStudy() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x120b08);
  sc.fog = new THREE.Fog(0x120b08, 10, 26);

  sc.add(ground(40, M(0x4a3826, { roughness: 0.6 })));
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), M(0x5e1d1d));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  sc.add(rug);
  // walls
  sc.add(box(14, 5, 0.3, M(0x4b1f1c), 0, 2.5, -4, false));
  sc.add(box(0.3, 5, 12, M(0x42201d), -6, 2.5, 0, false));
  sc.add(box(0.3, 5, 12, M(0x42201d), 6.5, 2.5, 2, false));

  // bookshelves crammed with little books
  for (let bx = -5; bx <= -1.4; bx += 1.8) {
    sc.add(box(1.6, 3.4, 0.4, M(0x33231a), bx, 1.7, -3.7));
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++)
        sc.add(box(0.18, 0.5, 0.3,
          M([0x7a2e2e, 0x2e4a7a, 0x6b6b4a, 0x444][Math.floor(Math.random() * 4)]),
          bx - 0.6 + c * 0.27, 0.55 + r * 0.8, -3.62, false));
  }

  // the bed, occupant fully decommissioned
  const bed = new THREE.Group();
  bed.add(box(3.4, 0.45, 1.9, M(0x2c1d12), 0, 0.22, 0));
  bed.add(box(3.2, 0.28, 1.7, M(0xcfc4a6), 0, 0.55, 0)); // blanket
  // body mound under blanket
  const mound = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.7, 4, 10), M(0xc4b89a));
  mound.rotation.z = Math.PI / 2;
  mound.position.set(0.1, 0.75, 0);
  bed.add(mound);
  const pillow = box(0.66, 0.18, 0.9, M(0xe6dcc2), -1.35, 0.7, 0);
  bed.add(pillow);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), M(SKIN));
  head.position.set(-1.32, 0.92, 0);
  bed.add(head);
  bed.position.set(-1.5, 0, -1.2);
  bed.rotation.y = 0.12;
  sc.add(bed);

  // slippers, neatly out of reach
  sc.add(box(0.34, 0.09, 0.16, M(0x222), -0.4, 0.05, 0.4, false));
  sc.add(box(0.34, 0.09, 0.16, M(0x222), 0.05, 0.05, 0.46, false));

  // desk with teacup
  sc.add(box(2.4, 0.1, 1.1, M(0x3a2a1c), 3.4, 0.95, -2.6));
  sc.add(box(0.12, 0.9, 0.12, M(0x2c1d12), 2.5, 0.45, -2.3, false));
  sc.add(box(0.12, 0.9, 0.12, M(0x2c1d12), 4.3, 0.45, -2.3, false));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 10), M(0xe8e2d0));
  cup.position.set(3.1, 1.06, -2.5);
  sc.add(cup);

  // wall clock (it is very loud)
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 20), M(0xe3d9bd));
  face.rotation.x = Math.PI / 2;
  clock.add(face);
  const handM = box(0.03, 0.24, 0.02, M(0x222), 0, 0.1, 0.05, false);
  clock.add(handM);
  clock.position.set(2.2, 3.1, -3.9);
  sc.add(clock);

  // lamp
  const lampBase = box(0.1, 1.3, 0.1, M(0x6b5a32), -3.6, 0.65, 0.6, false);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.34, 10, 1, true), M(0xd9a13c, { side: THREE.DoubleSide }));
  shade.position.set(-3.6, 1.42, 0.6);
  sc.add(lampBase, shade);
  const lamp = new THREE.PointLight(0xffb066, 28, 14, 2);
  lamp.position.set(-3.6, 1.3, 0.6);
  sc.add(lamp);

  const spill = new THREE.SpotLight(0xffd9a8, 60, 22, 0.6, 0.5, 2);
  spill.position.set(2, 4.6, 3);
  spill.target.position.set(-1.5, 0.6, -1.2);
  spill.castShadow = true;
  sc.add(spill, spill.target, new THREE.AmbientLight(0x52311e, 1.1));

  // trembling physician, taking his sweet time
  const doc = makeFigure({ suit: 0xd9d4c8 });
  doc.position.set(-0.4, 0, 0.2);
  doc.rotation.y = -2.1;
  doc.userData.lArm.rotation.x = -0.9;
  doc.userData.rArm.rotation.x = -0.6;
  sc.add(doc);

  // two guards by the door, each insisting the other go first
  const g1 = makeFigure({ suit: 0x37422f, cap: 0x2c3526 });
  g1.position.set(4.6, 0, 2.6);
  g1.rotation.y = -2.5;
  const g2 = makeFigure({ suit: 0x37422f, cap: 0x2c3526 });
  g2.position.set(5.3, 0, 1.7);
  g2.rotation.y = -2.9;
  sc.add(g1, g2);

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      // doctor trembles, checks an entirely decorative pulse
      doc.position.x = -0.4 + Math.sin(tG * 38) * 0.006;
      doc.userData.head.rotation.x = 0.32 + Math.sin(tG * 30) * 0.02;
      doc.userData.rArm.rotation.x = -0.6 + Math.sin(tG * 1.1) * 0.25;
      // guards trade "after you" glances
      g1.userData.head.rotation.y = Math.sin(tG * 1.4) * 0.55;
      g2.userData.head.rotation.y = -Math.sin(tG * 1.4 + 0.6) * 0.55;
      g1.userData.rArm.rotation.x = Math.max(0, Math.sin(tG * 1.4)) * -0.7; // half-hearted gesturing
      const k = easeIO(clamp01(tL / 13));
      cam.position.set(lerp(4.6, 2.2, k), lerp(1.5, 1.25, k), lerp(5.6, 2.6, k));
      cam.lookAt(-1.4, 0.85, -1.1);
    },
  };
}

/* --- the corridor sprint ----------------------------------- */
function buildCorridor() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x140d08);
  sc.fog = new THREE.Fog(0x140d08, 14, 42);

  sc.add(ground(160, M(0x3c2d1d, { roughness: 0.45 })));
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 160), M(0x6e1518));
  runner.rotation.x = -Math.PI / 2;
  runner.position.y = 0.01;
  sc.add(runner);

  for (let z = -40; z <= 40; z += 4) {
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.6, 10), M(0x7e231d));
      col.position.set(side * 3, 2.3, z);
      col.castShadow = true;
      sc.add(col);
      sc.add(box(0.9, 4.6, 0.25, M(0x2c1a12), side * 4.4, 2.3, z, false));
      if (z % 8 === 0) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffc06a }));
        bulb.position.set(side * 2.6, 3.4, z);
        sc.add(bulb);
      }
    }
  }
  sc.add(box(9, 0.5, 160, M(0x241710), 0, 4.8, 0, false));
  for (let z = -32; z <= 32; z += 16) {
    const pl = new THREE.PointLight(0xffb066, 30, 18, 2);
    pl.position.set(0, 4.2, z);
    sc.add(pl);
  }
  sc.add(new THREE.AmbientLight(0x4a3220, 1.4));
  // a light that travels with the sprint, so we can see the panic
  const chase = new THREE.PointLight(0xffd9a8, 46, 16, 2);
  chase.position.set(0, 3.2, 0);
  sc.add(chase);

  // the runners (state grief, expressed at speed)
  const suits = [0x4a4a52, 0x33415c, 0x474733, 0x4f3a2e, 0x3a3a3a];
  const runners = suits.map((s, i) => {
    const f = makeFigure({ suit: s });
    f.position.set([-1.4, -0.5, 0.5, 1.4, 0][i], 0, [-1.5, -0.4, -1.1, -2.2, -3.4][i]);
    sc.add(f);
    return f;
  });

  // airborne paperwork
  const papers = [];
  for (let i = 0; i < 16; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32),
      M(0xe8e2d0, { side: THREE.DoubleSide }));
    p.userData = { ph: Math.random() * 9, sp: 1 + Math.random() * 2, x: -1.8 + Math.random() * 3.6 };
    papers.push(p);
    sc.add(p);
  }

  const SPEED = 2.6;
  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      const zBase = -6 + SPEED * tL;
      chase.position.z = zBase + 1.5;
      runners.forEach((f, i) => {
        const u = f.userData;
        f.position.z = zBase + [-1.5, -0.4, -1.1, -2.2, -3.4][i] + Math.sin(tG * 2 + i) * 0.1;
        if (i === 3 && sh.id === 'run' && tL > 7.6) {
          // comrade four has located the floor
          const k = clamp01((tL - 7.6) / 0.35);
          f.rotation.x = (-Math.PI / 2) * k;
          f.position.y = 0.25 * (1 - k) + 0.18;
          f.position.z = zBase - 2.2 - k * 0.4 - (tL - 7.6) * SPEED; // stops moving
          u.lArm.rotation.x = -2.6; u.rArm.rotation.x = -2.6;
        } else {
          f.rotation.x = 0.18; // committed lean
          runCycle(f, tG + i * 0.7, 10.5, 1.15);
          if (i === 1) flail(f, tG, 13); // one man fully ventilating
        }
      });
      papers.forEach((p, i) => {
        const u = p.userData;
        p.position.set(
          u.x + Math.sin(tG * u.sp + u.ph) * 0.5,
          1.1 + Math.sin(tG * 1.7 + u.ph * 2) * 0.7,
          zBase - 1 + ((i / 16) * 6 - 3)
        );
        p.rotation.set(tG * u.sp, tG * u.sp * 1.3, u.ph);
      });

      if (sh.id === 'mont1') {
        cam.position.set(2.6, 0.6, zBase + 3.4);
        cam.lookAt(-1, 1.1, zBase - 2);
      } else if (sh.id === 'mont2') {
        cam.position.set(0, 3.9, zBase - 8);
        cam.lookAt(0, 0.8, zBase + 2);
      } else {
        cam.position.set(0, 1.35, zBase + 5.2);
        cam.lookAt(0, 1.0, zBase - 2);
      }
    },
  };
}

/* --- the politburo meeting room ----------------------------- */
function buildMeeting() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x0d0b09);
  sc.fog = new THREE.Fog(0x0d0b09, 12, 30);

  sc.add(ground(40, M(0x33261a, { roughness: 0.5 })));
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), M(0x5e1518));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.01;
  sc.add(carpet);
  sc.add(box(16, 5.4, 0.3, M(0x39231f), 0, 2.7, -4.4, false));
  sc.add(box(0.3, 5.4, 14, M(0x33201c), -7.6, 2.7, 0, false));
  sc.add(box(0.3, 5.4, 14, M(0x33201c), 7.6, 2.7, 0, false));

  // the portrait nobody dares look at
  const frame = box(2.6, 3.2, 0.12, M(0xb08d2e, { metalness: 0.6, roughness: 0.35 }), 0, 2.9, -4.2, false);
  const canvas = box(2.2, 2.8, 0.06, M(0x8e1418), 0, 2.9, -4.12, false);
  const star = new THREE.Mesh(starGeo(0.55), M(0xe8c33c, { emissive: 0x6a5210, side: THREE.DoubleSide }));
  star.position.set(0, 3.05, -4.04);
  sc.add(frame, canvas, star);

  // table
  sc.add(box(6.4, 0.16, 1.9, M(0x2c1d12, { roughness: 0.35 }), 0, 0.95, 0));
  for (const [lx, lz] of [[-2.9, -0.7], [2.9, -0.7], [-2.9, 0.7], [2.9, 0.7]])
    sc.add(box(0.16, 0.9, 0.16, M(0x241710), lx, 0.45, lz, false));
  // scattered papers + teacups
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), M(0xe8e2d0));
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = Math.random() * 2;
    p.position.set(-2.6 + Math.random() * 5.2, 1.04, -0.6 + Math.random() * 1.2);
    sc.add(p);
  }

  const mkChair = (x, z, ry) => {
    const ch = new THREE.Group();
    ch.add(box(0.5, 0.08, 0.5, M(0x241710), 0, 0.5, 0, false));
    ch.add(box(0.5, 0.7, 0.07, M(0x241710), 0, 0.9, -0.24, false));
    ch.position.set(x, 0, z);
    ch.rotation.y = ry;
    sc.add(ch);
  };

  // cast
  const fig = {};
  const seatDefs = [
    ['hua', 0x55555c, 3.85, 0, -Math.PI / 2],     // head of table
    ['ye', 0x37422f, -1.9, -1.35, 0],
    ['m1', 0x3a3a3a, 0.1, -1.35, 0],
    ['m2', 0x33415c, 2.0, -1.35, 0],
    ['gang1', 0x26262a, -1.9, 1.35, Math.PI],
    ['gang2', 0x26262a, 0.1, 1.35, Math.PI],
    ['gang3', 0x26262a, 2.0, 1.35, Math.PI],
  ];
  for (const [k, suit, x, z, ry] of seatDefs) {
    mkChair(x, z, ry);
    const f = makeFigure({ suit, cap: k === 'ye' ? 0x2c3526 : null });
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    sit(f);
    sc.add(f);
    fig[k] = f;
  }
  // Jiang Qing — standing, of course
  fig.jiang = makeFigure({ suit: 0x3c2a3e });
  fig.jiang.position.set(-3.85, 0, 0);
  fig.jiang.rotation.y = Math.PI / 2;
  sc.add(fig.jiang);
  // Deng — at the door with a suitcase
  const door = new THREE.Group();
  door.add(box(1.5, 3.3, 0.18, M(0x241710), 0, 1.65, 0, false));
  door.position.set(6.2, 0, 2.8);
  door.rotation.y = -0.5;
  sc.add(door);
  fig.deng = makeFigure({ suit: 0x3a3a3a, scale: 0.88 });
  fig.deng.position.set(4.9, 0, 3.2);
  fig.deng.rotation.y = -2.2;
  sc.add(fig.deng);
  const suitcase = box(0.5, 0.34, 0.16, M(0x4f3a2e), 0, -0.42, 0.1, false);
  fig.deng.userData.lArm.add(suitcase);

  const spot = new THREE.SpotLight(0xffd9a8, 260, 25, 0.85, 0.5, 2);
  spot.position.set(0, 5, 1.5);
  spot.target.position.set(0, 1, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  sc.add(spot, spot.target, new THREE.AmbientLight(0x5a4636, 2.6));
  const pl = new THREE.PointLight(0xffb066, 44, 16, 2);
  pl.position.set(-4.5, 3.4, 2);
  sc.add(pl);
  // doorway lamp for the Exile's corner
  const doorLamp = new THREE.PointLight(0xffc380, 36, 12, 2);
  doorLamp.position.set(5.4, 3.0, 3.6);
  sc.add(doorLamp);

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      const everyone = ['hua', 'ye', 'm1', 'm2', 'gang1', 'gang2', 'gang3'];
      // baseline: nervous committee
      everyone.forEach((k, i) => idle(fig[k], tG, i * 1.3));
      idle(fig.jiang, tG, 9);
      idle(fig.deng, tG, 4);
      fig.deng.rotation.y = -2.2;
      fig.deng.userData.rArm.rotation.z = 0;

      const id = sh.id || 'chaos';
      if (id === 'vJiang') {
        fig.jiang.userData.rArm.rotation.x = -1.25 - Math.sin(tG * 7) * 0.12; // jabbing finger
        fig.jiang.userData.head.rotation.y = Math.sin(tG * 2.2) * 0.4;
        everyone.forEach((k) => (fig[k].userData.torso.rotation.x = -0.08)); // collective lean-back
        cam.position.set(0.6, 1.45, 2.7);
        cam.lookAt(-3.8, 1.25, -0.3);
      } else if (id === 'vHua') {
        fig.hua.userData.rArm.rotation.x = -2.3; // scratching head
        fig.hua.userData.rArm.rotation.z = -0.5;
        fig.hua.userData.head.rotation.y = Math.sin(tG * 1.1) * 0.8; // scanning for help
        cam.position.set(0.8, 1.8, 0.4);
        cam.lookAt(3.9, 1.1, 0);
      } else if (id === 'vYe') {
        fig.ye.userData.lArm.rotation.x = -1.1; fig.ye.userData.lArm.rotation.z = 0.9;
        fig.ye.userData.rArm.rotation.x = -1.1; fig.ye.userData.rArm.rotation.z = -0.9; // crossed arms
        fig.ye.userData.head.rotation.y = Math.sin(tG * 3.2) * 0.22; // slow, professional "no"
        cam.position.set(-1.9, 1.4, 1.6);
        cam.lookAt(-1.9, 1.1, -1.5);
      } else if (id === 'vDeng') {
        fig.deng.rotation.y = 0.55; // turns to face the room, brightly
        fig.deng.userData.rArm.rotation.z = -2.6 + Math.sin(tG * 6) * 0.25; // jaunty wave
        cam.position.set(2.9, 1.25, 4.6);
        cam.lookAt(4.9, 1.0, 3.0);
      } else if (id === 'vGang') {
        ['gang1', 'gang2', 'gang3'].forEach((k, i) => {
          fig[k].userData.head.rotation.x = 0.35;
          fig[k].userData.head.rotation.y = Math.sin(tG * 2 + i * 2) * 0.3;
          fig[k].userData.torso.rotation.x = 0.15; // the huddle
        });
        fig.jiang.position.set(-0.4, 0, 2.6);
        fig.jiang.rotation.y = Math.PI;
        cam.position.set(0.2, 1.2, 5.4);
        cam.lookAt(0, 1.2, 1.4);
      } else {
        // full chaos
        fig.jiang.position.set(-3.85, 0, 0);
        fig.jiang.rotation.y = Math.PI / 2;
        everyone.forEach((k, i) => {
          flail(fig[k], tG + i * 0.6, 11 + i);
          fig[k].userData.torso.rotation.x = Math.sin(tG * 9 + i) * 0.1;
        });
        flail(fig.jiang, tG, 14);
        if (sh.alt) {
          cam.position.set(-5.5, 0.9, 2.6);
          cam.lookAt(2, 1.3, -0.5);
        } else {
          const k = clamp01(tL / 7.6);
          const a = lerp(0.5, -0.6, k);
          cam.position.set(Math.sin(a) * 7, 2.3, Math.cos(a) * 7);
          cam.lookAt(0, 1.0, 0);
        }
      }
    },
  };
}

/* --- the Square, in mourning -------------------------------- */
function buildSquare() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x9aa0a6);
  sc.fog = new THREE.Fog(0x9aa0a6, 60, 190);

  sc.add(ground(400, M(0x6e6a63, { roughness: 0.95 })));

  // the gate
  const gate = new THREE.Group();
  gate.add(box(34, 11, 7, M(0x8e1d1d), 0, 5.5, 0));
  gate.add(box(34.6, 0.7, 7.6, M(0xd9d2c0), 0, 11.3, 0, false)); // balustrade
  // tower
  gate.add(box(24, 4.4, 5, M(0x8e2a22), 0, 13.8, 0));
  for (let i = -4; i <= 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.4, 8), M(0xa83a2a));
    col.position.set(i * 2.6, 13.8, 2.6);
    gate.add(col);
  }
  gate.add(roof(26, 2.6, 7, 0x9c7c1e, 0, 17.2, 0));
  gate.add(box(18, 2.2, 4.4, M(0x8e2a22), 0, 19.2, 0));
  gate.add(roof(20, 2.4, 6, 0x9c7c1e, 0, 21.4, 0));

  // archways
  for (const ax of [-9, 0, 9]) {
    const arch = box(4.4, 5.4, 7.4, M(0x241016), ax, 2.7, 0, false);
    gate.add(arch);
  }

  // the portrait: gold frame, red field, gold star (stylised)
  gate.add(box(4.6, 5.6, 0.3, M(0xb08d2e, { metalness: 0.6, roughness: 0.35 }), 0, 7.6, 3.7, false));
  gate.add(box(4.0, 5.0, 0.2, M(0x7e1216), 0, 7.6, 3.78, false));
  const pStar = new THREE.Mesh(starGeo(1.1), M(0xe8c33c, { emissive: 0x6a5210, side: THREE.DoubleSide }));
  pStar.position.set(0, 7.9, 3.95);
  gate.add(pStar);

  // hanging banners (mercifully blank — the slogans are being rewritten)
  gate.add(box(2.2, 7, 0.1, M(0xa31218), -13, 6.5, 3.6, false));
  gate.add(box(2.2, 7, 0.1, M(0xa31218), 13, 6.5, 3.6, false));

  gate.position.z = -55;
  sc.add(gate);

  // flags at half... actually nobody agreed on the protocol yet
  for (const fx of [-22, -14, 14, 22]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 12, 6), M(0xcccccc, { metalness: 0.7, roughness: 0.3 }));
    pole.position.set(fx, 6, -40);
    sc.add(pole);
    const fl = makeFlag(3.4, 2.1, 0xa31218, 14, 'square');
    fl.position.set(fx + 1.74, fx % 28 === 0 ? 10.6 : 7.4, -40); // two heights: protocol dispute
    sc.add(fl);
  }

  // wreaths
  for (let i = 0; i < 24; i++) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.16, 8, 14), M(0xe8e4d4));
    w.position.set(-12 + Math.random() * 24, 0.55, -47 + Math.random() * 3);
    w.rotation.x = -0.3 + Math.random() * 0.2;
    sc.add(w);
  }

  // the crowd — instanced grief
  const crowdGeo = new THREE.BoxGeometry(0.4, 1.15, 0.26);
  crowdGeo.translate(0, 0.575, 0);
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const N = 1100;
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, N);
  const dummy = new THREE.Object3D();
  const palette = [0x3a3f4a, 0x44483c, 0x4a4038, 0x35383f, 0x50545e, 0x3f4a3c];
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / 44), colI = i % 44;
    dummy.position.set(
      (colI - 21.5) * 1.5 + (Math.random() - 0.5) * 0.7,
      0,
      -30 + row * 1.7 + (Math.random() - 0.5) * 0.7
    );
    dummy.rotation.y = Math.PI + (Math.random() - 0.5) * 0.2;
    dummy.scale.setScalar(0.92 + Math.random() * 0.16);
    dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix);
    crowd.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  }
  sc.add(crowd);

  // foreground mourners, heads bowed — except one
  const mourners = [];
  for (let i = 0; i < 9; i++) {
    const f = makeFigure({ suit: palette[i % palette.length] });
    f.position.set(-6 + i * 1.5 + (Math.random() - 0.5), 0, -33 - (i % 3));
    f.rotation.y = Math.PI;
    f.userData.head.rotation.x = 0.5;
    sc.add(f);
    mourners.push(f);
  }

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(30, 60, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sc.add(sun, new THREE.HemisphereLight(0xbfc6cc, 0x55524a, 1.6));

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      // one mourner has started applauding and is realising his error
      const c = mourners[4];
      if (Math.sin(tG * 0.5) > -0.2) {
        c.userData.head.rotation.x = 0;
        c.userData.lArm.rotation.x = -1.4 + Math.sin(tG * 10) * 0.3;
        c.userData.rArm.rotation.x = -1.4 - Math.sin(tG * 10) * 0.3;
        mourners[3].userData.head.rotation.y = 0.8;  // disapproving neighbours
        mourners[5].userData.head.rotation.y = -0.8;
      } else {
        c.userData.lArm.rotation.x = 0; c.userData.rArm.rotation.x = 0;
        c.userData.head.rotation.x = 0.5;
        mourners[3].userData.head.rotation.y = 0;
        mourners[5].userData.head.rotation.y = 0;
      }
      if (sh.alt) {
        cam.position.set(-18, 2.2, -20);
        cam.lookAt(0, 9, -55);
      } else {
        const k = easeIO(clamp01(tL / 10));
        cam.position.set(lerp(0, 6, k), lerp(1.4, 30, k), lerp(-26, 38, k));
        cam.lookAt(0, lerp(2, 8, k), -55);
      }
    },
  };
}

/* --- night arrests, conducted at a brisk jog ----------------- */
function buildArrest() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x04060c);
  sc.fog = new THREE.Fog(0x04060c, 16, 50);

  sc.add(ground(120, M(0x14161c, { roughness: 0.8 })));
  // courtyard walls
  sc.add(box(50, 4.5, 1, M(0x1c1f28), 0, 2.25, -16, false));
  sc.add(box(1, 4.5, 40, M(0x1c1f28), -22, 2.25, 0, false));
  sc.add(box(1, 4.5, 40, M(0x1c1f28), 22, 2.25, 0, false));
  sc.add(roof(10, 1.6, 4, 0x0e1118, 0, 5.4, -16));

  // a truck with its engine tactfully running
  const truck = new THREE.Group();
  truck.add(box(3.4, 1.6, 1.8, M(0x2a3326), 0, 1.3, 0));
  truck.add(box(1.4, 1.2, 1.7, M(0x222a20), 2.2, 1.0, 0));
  for (const [wx, wz] of [[-1, 1], [1.6, 1], [-1, -1], [1.6, -1]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), M(0x111));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz * 0.95);
    truck.add(wheel);
  }
  truck.position.set(-14, 0, -10);
  truck.rotation.y = 0.5;
  sc.add(truck);

  // searchlight rigs
  const rigs = [];
  for (const rx of [-16, 16]) {
    const pole = box(0.18, 6, 0.18, M(0x222), rx, 3, 12, false);
    sc.add(pole);
    const spot = new THREE.SpotLight(0xfff2cc, 2400, 80, 0.3, 0.55, 1.4);
    spot.position.set(rx, 6, 12);
    sc.add(spot, spot.target);
    // fake volumetric cone
    const coneGeo = new THREE.ConeGeometry(2.6, 18, 16, 1, true);
    coneGeo.translate(0, -9, 0);
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0xfff2cc, transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    }));
    cone.position.copy(spot.position);
    sc.add(cone);
    rigs.push({ spot, cone, rx });
  }
  sc.add(new THREE.AmbientLight(0x2a3650, 3.4));
  const moon = new THREE.DirectionalLight(0x8fa6c9, 2.0);
  moon.position.set(-10, 20, 10);
  moon.castShadow = true;
  sc.add(moon);
  // dim courtyard lamp near the truck
  const yard = new THREE.PointLight(0xffb066, 30, 22, 2);
  yard.position.set(-12, 4, -8);
  sc.add(yard);

  // four figures attempting an unobtrusive exit
  const four = [];
  for (let i = 0; i < 4; i++) {
    const f = makeFigure({ suit: 0x26262a });
    sc.add(f);
    four.push(f);
  }
  // pursuit, with hats
  const soldiers = [];
  for (let i = 0; i < 3; i++) {
    const f = makeFigure({ suit: 0x37422f, cap: 0x2c3526 });
    const rifle = box(0.06, 0.7, 0.06, M(0x1d1610), 0.05, -0.4, 0.12, false);
    rifle.rotation.x = 1.2;
    f.userData.rArm.add(rifle);
    sc.add(f);
    soldiers.push(f);
  }

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      const t = sh.alt ? 8 + tL : tL; // montage shot joins mid-chase
      // searchlights sweep
      rigs.forEach((r, i) => {
        // sweeps converge on the escape route once the chase is on
        const a = Math.sin(tG * 0.55 + i * 2.4) * (t > 6 ? 4 : 9);
        const cx = t > 6 ? -8 : r.rx * 0.2;
        r.spot.target.position.set(cx + a, 0, (t > 6 ? -6 : -2) + Math.cos(tG * 0.4 + i) * 5);
        r.cone.lookAt(r.spot.target.position);
        r.cone.rotateX(-Math.PI / 2);
      });

      const caught = t > 9.5;
      four.forEach((f, i) => {
        const ph = i * 0.8;
        if (caught && i === 0) {
          // frozen, arms up, very innocent
          f.userData.lArm.rotation.z = 2.7; f.userData.rArm.rotation.z = -2.7;
          f.userData.lLeg.rotation.x = 0; f.userData.rLeg.rotation.x = 0;
          f.rotation.x = 0;
        } else if (caught && t > 10.2) {
          // the pile-up behind the frozen leader
          f.position.z = four[0].position.z + 0.5 + i * 0.45;
          f.userData.lArm.rotation.z = 2.7; f.userData.rArm.rotation.z = -2.7;
          idle(f, tG, ph);
        } else if (t < 4) {
          // exaggerated tip-toe
          const u = f.userData;
          u.lLeg.rotation.x = Math.sin(tG * 5 + ph) * 0.7;
          u.rLeg.rotation.x = -Math.sin(tG * 5 + ph) * 0.7;
          u.torso.rotation.x = 0.22;
          u.lArm.rotation.x = -0.9; u.rArm.rotation.x = -0.9;
        } else {
          runCycle(f, tG + ph, 11, 1.2);
          f.rotation.x = 0.2;
        }
        if (!(caught && (i === 0 || t > 10.2))) {
          const prog = t < 4 ? t * 0.7 : 2.8 + (t - 4) * 3.1;
          f.position.set(-8 + i * -0.9 + Math.sin(ph * 7) * 1.2, f.position.y, 8 - prog - i * 1.1);
          f.rotation.y = Math.PI; // fleeing away from camera-side gate
        }
      });
      // freeze the leader in place once caught
      if (caught) {
        const f = four[0];
        const prog = 2.8 + (9.5 - 4) * 3.1;
        f.position.x = -8; f.position.z = 8 - prog;
      }

      soldiers.forEach((f, i) => {
        const start = 3.2 + i * 0.5;
        const prog = Math.max(0, t - start) * 3.4;
        f.position.set(-6.5 + i * 1.4, 0, 12 - prog);
        f.rotation.y = Math.PI;
        if (caught && t > 10.4) {
          f.position.z = four[0].position.z + 2 + i * 0.6;
          idle(f, tG, i);
          f.userData.rArm.rotation.x = -1.4; // rifles raised, politely
        } else if (t > start) runCycle(f, tG + i, 10, 1.1);
      });

      if (sh.alt) {
        cam.position.set(-3, 0.7, four[0].position.z - 6);
        cam.lookAt(-7, 1.2, four[0].position.z + 3);
      } else {
        const k = easeIO(clamp01(tL / 14));
        cam.position.set(lerp(10, 4, k), lerp(7, 2.4, k), lerp(14, 2, k));
        cam.lookAt(-7, 1, -4);
      }
    },
  };
}

/* --- one desk, one lamp, one heir --------------------------- */
function buildDesk() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x000000);
  sc.fog = new THREE.Fog(0x000000, 8, 24);

  const fl = ground(80, M(0x0c0b0a, { roughness: 0.3, metalness: 0.4 }));
  sc.add(fl);

  sc.add(box(3.2, 0.14, 1.5, M(0x2c1d12, { roughness: 0.35 }), 0, 1.0, 0));
  sc.add(box(0.9, 0.95, 1.3, M(0x241710), -1.0, 0.48, 0, false));
  sc.add(box(0.9, 0.95, 1.3, M(0x241710), 1.0, 0.48, 0, false));
  // an in-tray containing the entire nation
  sc.add(box(0.5, 0.5, 0.36, M(0xe8e2d0), -0.9, 1.35, 0, false));

  const hua = makeFigure({ suit: 0x787882, scale: 1.12 });
  hua.position.set(0, 0, -0.85);
  sit(hua);
  hua.position.y = 0.12;
  // chair
  sc.add(box(0.6, 0.1, 0.6, M(0x241710), 0, 0.5, -0.95, false));
  sc.add(box(0.6, 1.0, 0.08, M(0x241710), 0, 1.0, -1.25, false));
  sc.add(hua);
  // the little red book, held with great uncertainty
  const book = box(0.28, 0.38, 0.06, M(0xc01620, { emissive: 0x33060a }), 0, -0.5, 0.08, false);
  hua.userData.rArm.add(book);
  const deskLamp = new THREE.PointLight(0xffd9a8, 16, 8, 2);
  deskLamp.position.set(0.8, 1.9, 0.8);
  sc.add(deskLamp);

  // a colleague's head, around the doorframe
  sc.add(box(1.4, 3.2, 0.2, M(0x16130f), 5.2, 1.6, -2, false));
  const peek = new THREE.Group();
  const ph = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), M(SKIN));
  peek.add(ph);
  peek.position.set(4.4, 1.5, -1.9);
  sc.add(peek);

  const cone = new THREE.SpotLight(0xfff0d0, 380, 30, 0.34, 0.6, 2);
  cone.position.set(0, 7.5, 0.5);
  cone.target.position.set(0, 1, -0.5);
  cone.castShadow = true;
  sc.add(cone, cone.target);
  const fake = new THREE.Mesh(
    (() => { const g = new THREE.ConeGeometry(2.4, 7.5, 18, 1, true); g.translate(0, -3.75, 0); return g; })(),
    new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
  );
  fake.position.copy(cone.position);
  sc.add(fake, new THREE.AmbientLight(0x14110d, 1.2));

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      const u = hua.userData;
      // glance left, glance right, then raise the book — upside down
      if (tL < 3) {
        u.head.rotation.y = tL < 1.5 ? -0.7 * easeIO(clamp01(tL / 0.8)) : 0.7 * easeIO(clamp01((tL - 1.5) / 0.8)) - 0.7;
      } else if (tL < 4) {
        u.head.rotation.y = lerp(0.7, 0, clamp01(tL - 3));
      } else {
        u.head.rotation.y = 0;
        const k = easeIO(clamp01((tL - 4) / 2.4));
        u.rArm.rotation.x = -2.5 * k;
        book.rotation.z = Math.PI * k; // by the end: upside down
        if (tL > 7.5) u.head.rotation.x = -0.22 + Math.sin(tG * 1.2) * 0.04; // squinting at it
      }
      // the peeker
      const pk = tL > 9 && tL < 11.4 ? Math.sin((tL - 9) / 2.4 * Math.PI) : 0;
      peek.position.x = 4.85 - pk * 0.45;
      peek.rotation.y = -0.7;

      const k = clamp01(tL / 12);
      cam.position.set(0.4, lerp(1.9, 1.55, k), lerp(8.5, 4.0, k));
      cam.lookAt(0, 1.35, -0.6);
    },
  };
}

/* --- finale: one big flag ------------------------------------ */
function buildFinale() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x1c0406);
  sc.fog = new THREE.Fog(0x1c0406, 20, 70);

  sc.add(ground(200, M(0x12080a, { roughness: 0.25, metalness: 0.6 })));

  const big = makeFlag(34, 19, 0x9e1118, 44, 'finale');
  big.position.set(0, 11, -26);
  sc.add(big);
  const big2 = makeFlag(34, 19, 0x6e0b10, 30, 'finale');
  big2.position.set(6, 12, -34);
  sc.add(big2);
  const bigStar = new THREE.Mesh(starGeo(1.8), M(0xe8c33c, { emissive: 0x806014, side: THREE.DoubleSide }));
  bigStar.position.set(-11.5, 16.5, -25.0);
  sc.add(bigStar);

  // colonnade of smaller flags
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6), M(0x6a5210, { metalness: 0.7, roughness: 0.3 }));
      pole.position.set(side * (7 + i * 1.1), 3.5, -2 - i * 5);
      sc.add(pole);
      const fl = makeFlag(2.6, 1.6, 0xa31218, 12, 'finale');
      fl.position.set(side * (7 + i * 1.1) + 1.35, 6.1, -2 - i * 5);
      sc.add(fl);
    }
  }

  const key = new THREE.DirectionalLight(0xffd9b0, 2.6);
  key.position.set(-12, 18, 16);
  key.castShadow = true;
  sc.add(key);
  const rim = new THREE.DirectionalLight(0xff3a2a, 1.2);
  rim.position.set(10, 6, -30);
  sc.add(rim, new THREE.AmbientLight(0x5e1014, 2.4));

  return {
    scene: sc,
    update(sh, tL, tG, cam) {
      const k = clamp01(tL / 18);
      // impact shake on the title slam (tL = 0.2)
      const sh1 = Math.exp(-3.2 * Math.max(0, tL - 0.2)) * (tL > 0.2 ? 1 : 0);
      cam.position.set(
        Math.sin(tG * 31) * 0.12 * sh1,
        lerp(2.2, 5.2, easeIO(k)) + Math.cos(tG * 27) * 0.1 * sh1,
        lerp(26, 14, easeIO(k))
      );
      cam.lookAt(0, 7.5, -24);
    },
  };
}

/* ============================================================
   SHOT LIST  (the edit)
   ============================================================ */

const SHOTS = [
  { t: [7, 19], set: 'ext', id: 'run' },
  { t: [25, 38], set: 'study' },
  { t: [43, 56], set: 'corridor', id: 'run' },
  { t: [61, 64], set: 'meeting', id: 'vJiang' },
  { t: [66.6, 69.6], set: 'meeting', id: 'vHua' },
  { t: [72.2, 75.2], set: 'meeting', id: 'vYe' },
  { t: [77.8, 80.8], set: 'meeting', id: 'vDeng' },
  { t: [83.4, 86.4], set: 'meeting', id: 'vGang' },
  { t: [88.4, 96], set: 'meeting', id: 'chaos' },
  { t: [96, 106], set: 'square' },
  { t: [112, 126], set: 'arrest' },
  // the montage
  { t: [132, 134.2], set: 'corridor', id: 'mont1' },
  { t: [135.4, 137.6], set: 'meeting', id: 'chaos', alt: 1 },
  { t: [138.8, 141], set: 'arrest', alt: 1 },
  { t: [142.2, 144.4], set: 'square', alt: 1 },
  { t: [145.6, 147.8], set: 'corridor', id: 'mont2' },
  // the quiet bit
  { t: [150, 162], set: 'desk' },
  // the loud bit
  { t: [162, 180], set: 'finale' },
];

/* ============================================================
   TITLE CARDS  (the jokes)
   ============================================================ */

const CARDS = [
  { t: [1, 6.2], cls: 'card-studio', html: `<div class="star">&#9733;</div><div class="name">PEOPLE&rsquo;S PICTURES</div><div class="sub">PRESENTS &mdash; BY UNANIMOUS VOTE</div>` },

  { t: [9.5, 14.5], cls: 'card-lower', html: `<div class="line">Zhongnanhai &mdash; Beijing, September 1976</div>` },

  { t: [19.4, 24.6], cls: 'card-big solid', html: `<div class="line">For 27 years,</div><div class="line">one man held absolute power.</div>` },

  { t: [33, 37], cls: 'card-lower', html: `<div class="line">the doctors were chosen for loyalty, not medicine</div>` },

  { t: [38.3, 42.7], cls: 'card-big solid', html: `<div class="line red">Now he&rsquo;s dead.</div><div class="line">Which is officially a problem.</div>` },

  { t: [56.2, 60.8], cls: 'card-quote', html: `<div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div class="text">&ldquo;The funniest five-year plan ever executed.&rdquo;</div><div class="src">&mdash; The Daily Plenum</div>` },

  { t: [64.0, 66.6], cls: 'card-cast', html: `<div class="role">The Widow</div><div class="name">Jiang&nbsp;Qing</div><div class="note"><em>&ldquo;I speak for my husband. He agrees with me.&rdquo;</em></div>` },
  { t: [69.6, 72.2], cls: 'card-cast alt', html: `<div class="role">The Successor</div><div class="name">Hua&nbsp;Guofeng</div><div class="note"><em>&ldquo;I was as surprised as anyone.&rdquo;</em></div>` },
  { t: [75.2, 77.8], cls: 'card-cast', html: `<div class="role">The Marshal</div><div class="name">Ye&nbsp;Jianying</div><div class="note"><em>&ldquo;I am simply here to observe. Armed.&rdquo;</em></div>` },
  { t: [80.8, 83.4], cls: 'card-cast alt', html: `<div class="role">The Exile</div><div class="name">Deng&nbsp;Xiaoping</div><div class="note"><em>&ldquo;Purged twice. Punctual always.&rdquo;</em></div>` },
  { t: [86.4, 88.4], cls: 'card-cast', html: `<div class="role">&hellip;and</div><div class="name">The Gang<br>of&nbsp;Four</div><div class="note">(they counted themselves)</div>` },

  { t: [92.5, 95.6], cls: 'card-mao', html: `<div class="text">&ldquo;Whoever speaks first is a traitor.<br>Whoever speaks last is also a traitor.&rdquo;</div><div class="src">&mdash; minutes of an emergency session</div>` },

  { t: [99, 104.5], cls: 'card-lower', html: `<div class="line">One billion mourners. Five job openings.</div>` },

  { t: [106.3, 108.9], cls: 'card-big solid', html: `<div class="line">Power abhors a vacuum.</div>` },
  { t: [109.1, 111.8], cls: 'card-big solid', html: `<div class="line red">Paranoia doesn&rsquo;t.</div>` },

  { t: [126.3, 129.0], cls: 'card-big solid', html: `<div class="line">From the committee that brought you</div><div class="line red">the Five-Year Plan</div>` },
  { t: [129.2, 131.9], cls: 'card-big solid', html: `<div class="line">comes a succession</div><div class="line red">with no plan at all.</div>` },

  { t: [134.2, 135.4], cls: 'card-flash', html: `<div class="line">Trust no one</div>` },
  { t: [137.6, 138.8], cls: 'card-flash red-bg', html: `<div class="line">Quote everyone</div>` },
  { t: [141, 142.2], cls: 'card-flash', html: `<div class="line">Smile for the portrait</div>` },
  { t: [144.4, 145.6], cls: 'card-flash red-bg', html: `<div class="line">History is written</div>` },
  { t: [147.8, 150], cls: 'card-flash', html: `<div class="line">by whoever&rsquo;s left</div>` },

  { t: [156.5, 161.5], cls: 'card-mao', html: `<div class="text">&ldquo;With you in charge, I&rsquo;m at ease.&rdquo;</div><div class="src">&mdash; Chairman Mao (deceased)</div>` },

  { t: [162.2, 173.8], cls: 'card-title', html: `<div class="kicker">A comedy of succession</div><div class="big">THE DEATH<br>OF <span class="mao">MAO</span></div><div class="tag" style="transition-delay:3.1s">Nobody is in charge. Everybody is in trouble.</div><div class="soon" style="transition-delay:6.5s">Coming soon &mdash; pending committee approval</div>` },

  { t: [174.5, 179.4], cls: 'card-credits', html: `<div class="block">People&rsquo;s Pictures &middot; in association with the Ministry of Approved Laughter<br>written by a committee &middot; rewritten by a different committee<br>directed by whoever survives the edit</div><div class="fine">This is a work of satire in the tradition of THE DEATH OF STALIN (2017). All low-poly persons depicted are 14 centimetres tall and entirely fictional. No historical accuracy was harmed in the making of this trailer &mdash; it was never consulted. A 3D production rendered live in your browser.</div>` },
];

/* ============================================================
   THE SCORE — procedural pseudo-orchestra
   ============================================================ */

function buildScore() {
  const ev = [];
  const N = (t, midi, dur, voice, vel = 0.5) => { if (t < DUR - 0.2) ev.push({ t, f: m2f(midi), dur, voice, vel }); };
  const TIMP = (t, vel = 0.7, midi = 38) => N(t, midi, 0.7, 'timp', vel);
  const SN = (t, vel = 0.2) => N(t, 60, 0.08, 'snare', vel);
  const TICK = (t, vel = 0.2) => N(t, 60, 0.04, 'tick', vel);
  const BELL = (t, midi, vel = 0.3) => N(t, midi, 2.2, 'bell', vel);
  const HIT = (t, midis, vel = 0.9) => {
    midis.forEach((m) => N(t, m, 0.55, 'hit', (vel * 1.6) / midis.length));
    TIMP(t, vel);
  };
  const PAD = (t, midis, dur, vel = 0.3, voice = 'str') => midis.forEach((m) => N(t, m, dur, voice, vel / Math.sqrt(midis.length)));

  // chord library (midi voicings)
  const Dm = [50, 57, 62, 65], Bb = [46, 58, 62, 65], Gm = [43, 55, 58, 62],
    A = [45, 57, 61, 64], Em = [52, 59, 64, 67], C = [48, 60, 64, 67],
    D = [50, 62, 66, 69], Am = [45, 57, 60, 64], B7 = [47, 59, 63, 66];

  /* A) 0–7 cold open: drone + timpani roll into a hit */
  PAD(0.3, [38, 50], 6.5, 0.22);
  for (let t = 5.0; t < 6.9; t += 0.11) TIMP(t, 0.1 + (t - 5.0) * 0.22, 38);
  HIT(7.0, Dm, 0.95);

  /* B) 7–25 stately anthem */
  {
    const prog = [Dm, Bb, Gm, A, Dm, A];
    prog.forEach((ch, i) => {
      const t = 7 + i * 3;
      PAD(t, ch, 3.1, 0.3);
      N(t, ch[0] - 12, 1.5, 'bass', 0.4);
      N(t + 1.5, ch[0] - 12, 1.5, 'bass', 0.3);
      TIMP(t, 0.3, ch[0] - 12);
    });
    const mel = [[13, 74, 1.5], [14.5, 77, 0.75], [15.25, 76, 0.75], [16, 74, 1.5],
    [17.5, 69, 1.5], [19, 70, 0.75], [19.75, 72, 0.75], [20.5, 74, 2.0],
    [22.6, 73, 0.7], [23.3, 74, 1.6]];
    mel.forEach(([t, m, d]) => N(t, m, d, 'mel', 0.4));
  }

  /* C) 25–38 the deathbed: ticking clock, sparse comedy */
  PAD(25, [38], 13, 0.14);
  for (let t = 25.5; t < 37.6; t += 1.0) TICK(t, t % 2 < 1 ? 0.22 : 0.13);
  // a bassoon-adjacent remark
  [[28, 50], [28.4, 50], [28.8, 45], [29.2, 50]].forEach(([t, m]) => N(t, m, 0.16, 'pizz', 0.3));
  [[33, 43], [33.4, 43], [33.8, 50], [34.2, 43], [34.6, 46]].forEach(([t, m]) => N(t, m, 0.16, 'pizz', 0.3));
  N(30.6, 65, 0.4, 'pizz', 0.22);
  N(31.6, 64, 0.4, 'pizz', 0.18);
  N(36.2, 62, 0.5, 'pizz', 0.22);

  /* D) 38–43 the announcement */
  HIT(38.3, [38, 50, 62], 0.85);
  PAD(38.4, [38, 50], 4, 0.12);
  HIT(40.7, [45, 57, 61], 0.6);
  for (let t = 42.3; t < 42.95; t += 0.09) TIMP(t, 0.15 + (t - 42.3) * 0.5, 38);

  /* E+F) 43–96 the gallop */
  const gallop = (t0, t1, roots, vel, melOn = true) => {
    const e8 = 0.2;
    let bar = 0;
    for (let t = t0; t < t1 - 0.01; t += e8 * 8, bar++) {
      const root = roots[bar % roots.length];
      for (let i = 0; i < 8; i++) {
        const tt = t + i * e8;
        if (tt >= t1) break;
        N(tt, i % 2 === 0 ? root : root - 5, 0.15, 'chug', vel * (i === 0 ? 1.2 : 0.85));
        if (i % 2 === 1) SN(tt, vel * 0.45);
      }
      TIMP(t, vel * 0.8, root - 12);
    }
  };
  gallop(43, 61, [50, 50, 46, 48, 50, 50, 43, 45], 0.34);
  // gallop melody, twice
  const riff = [74, 74, 72, 74, 76, 77, 76, 74, 72, 69, 72, 74, 69, -1, 70, 72,
    74, 74, 72, 74, 77, 79, 77, 76, 74, 72, 70, 72, 74, -1, -1, -1];
  for (let rep = 0; rep < 2; rep++)
    riff.forEach((m, i) => { if (m > 0) N(44.6 + rep * 6.4 + i * 0.2, m, 0.18, 'mel', 0.34); });

  gallop(61, 88.4, [50, 43, 46, 45], 0.2, false);
  // stingers under each cast card
  HIT(64.0, [62, 65, 69], 0.7);
  HIT(69.6, [62, 67, 70], 0.7);
  // a nervous little trill for the Successor
  for (let i = 0; i < 8; i++) N(70.6 + i * 0.09, i % 2 ? 81 : 82, 0.08, 'mel', 0.2);
  HIT(75.2, [57, 62, 65], 0.7);
  HIT(80.8, [58, 62, 67], 0.7);
  HIT(86.4, [57, 61, 64], 0.75);

  // chaos crescendo 88.4–96: climbing sequence
  gallop(88.4, 96, [50, 52, 53, 55], 0.3);
  for (let i = 0; i < 19; i++) N(88.6 + i * 0.38, 62 + i, 0.3, 'mel', 0.24 + i * 0.012);
  HIT(96.0, [38, 50, 57, 62], 1.0);

  /* G) 96–112 state mourning */
  [[96.4, Dm], [100.4, Gm], [104.4, Bb], [108.4, A]].forEach(([t, ch]) => {
    PAD(t, ch.map((m) => m + 12), 4.1, 0.26, 'choir');
    N(t, ch[0] - 12, 4.0, 'bass', 0.22);
  });
  BELL(97.2, 62, 0.32); BELL(101.2, 62, 0.28); BELL(105.2, 65, 0.3); BELL(109.2, 64, 0.28);
  for (let t = 110.4; t < 111.9; t += 0.1) TIMP(t, 0.1 + (t - 110.4) * 0.3, 33);

  /* H) 112–132 the purge, allegro */
  const gallop2 = (t0, t1, roots, vel) => {
    const e8 = 0.1875;
    let bar = 0;
    for (let t = t0; t < t1 - 0.01; t += e8 * 8, bar++) {
      const root = roots[bar % roots.length];
      for (let i = 0; i < 8; i++) {
        const tt = t + i * e8;
        if (tt >= t1) break;
        N(tt, i % 2 === 0 ? root : root - 5, 0.13, 'chug', vel * (i === 0 ? 1.2 : 0.8));
        SN(tt, vel * 0.35);
      }
      TIMP(t, vel * 0.7, root - 12);
    }
  };
  gallop2(112, 126, [52, 52, 48, 50, 52, 52, 45, 47], 0.32);
  const riff2 = [76, 76, 74, 76, 79, 78, 76, 74, 72, 71, 72, 76, 71, -1, 74, 76];
  for (let rep = 0; rep < 4; rep++)
    riff2.forEach((m, i) => { if (m > 0) N(113.5 + rep * 3, m + (rep === 3 ? 5 : rep === 2 ? 3 : 0), 0.16, 'mel', 0.3 + rep * 0.02); });
  HIT(126.3, Em, 0.8);
  gallop2(126.5, 132, [52, 48], 0.18);
  HIT(129.2, [45, 57, 61], 0.8);

  /* I) 132–150 tutti montage */
  gallop2(132, 150, [50, 50, 46, 48, 50, 53, 45, 45], 0.36);
  for (let rep = 0; rep < 2; rep++)
    riff.forEach((m, i) => { if (m > 0) { N(132.4 + rep * 6 + i * 0.1875, m, 0.16, 'mel', 0.36); N(132.4 + rep * 6 + i * 0.1875, m + 12, 0.16, 'mel', 0.18); } });
  [134.2, 137.6, 141, 144.4, 147.8].forEach((t, i) => HIT(t, [Dm, A, Gm, Bb, Dm][i].map((m) => m + 12), 0.85));
  for (let i = 0; i < 14; i++) N(147.9 + i * 0.14, 62 + i * 2, 0.12, 'mel', 0.3);
  HIT(149.9, [38, 50, 62, 65, 69], 1.0);

  /* J) 150–162 the silence (comedy requires it) */
  N(155.0, 62, 0.4, 'pizz', 0.18);
  N(158.8, 64, 0.25, 'pizz', 0.16);
  N(159.25, 63, 0.5, 'pizz', 0.16);
  PAD(160.2, [38], 2, 0.1);

  /* K) 162–180 anthem finale */
  HIT(162.2, [38, 50, 57, 62, 65, 69], 1.0);
  [[162.3, Dm, 2.9], [165.2, Bb, 2.9], [168.1, Gm, 2.9], [171.0, A, 2.9], [173.9, Dm, 5.5]].forEach(([t, ch, d]) => {
    PAD(t, ch, d, 0.34);
    PAD(t, ch.map((m) => m + 12), d, 0.2, 'choir');
    N(t, ch[0] - 12, d, 'bass', 0.4);
  });
  const melF = [[165.2, 74, 1.4], [166.6, 77, 0.7], [167.3, 76, 0.8], [168.1, 74, 1.4],
  [169.5, 69, 1.4], [170.9, 70, 0.7], [171.6, 72, 0.7], [172.3, 74, 1.5]];
  melF.forEach(([t, m, d]) => { N(t, m, d, 'mel', 0.42); N(t, m + 12, d, 'mel', 0.18); });
  for (let t = 172.9; t < 173.85; t += 0.085) TIMP(t, 0.15 + (t - 172.9) * 0.6, 38);
  TIMP(173.9, 1.0, 38);
  BELL(174.0, 74, 0.4);
  BELL(176.8, 62, 0.3);

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/* ---------------- synthesiser ---------------- */

class Orchestra {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    // shared noise buffer
    const len = ctx.sampleRate * 1.2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  osc(type, f, when, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, when);
    o.detune.value = detune;
    return o;
  }
  env(when, a, hold, r, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + a);
    g.gain.setValueAtTime(peak, when + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, when + a + hold + r);
    return g;
  }
  lp(freq, q = 0.6) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  noise(when, dur) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.start(when);
    s.stop(when + dur + 0.1);
    return s;
  }

  play(e, when) {
    const c = this.ctx, out = this.master;
    const stop = (o, t) => o.stop(t + 0.15);
    switch (e.voice) {
      case 'str': {
        const f = this.lp(1500);
        const g = this.env(when, Math.min(0.5, e.dur * 0.3), Math.max(0, e.dur - 0.5), 0.6, e.vel * 0.10);
        for (const dt of [-5, 5]) {
          const o = this.osc('sawtooth', e.f, when, dt);
          o.connect(f); o.start(when); stop(o, when + e.dur + 0.6);
        }
        f.connect(g); g.connect(out);
        break;
      }
      case 'choir': {
        const f = this.lp(1100);
        const g = this.env(when, 0.7, Math.max(0, e.dur - 0.7), 1.1, e.vel * 0.10);
        const o1 = this.osc('triangle', e.f, when, -4);
        const o2 = this.osc('triangle', e.f, when, 4);
        const o3 = this.osc('sine', e.f / 2, when);
        [o1, o2, o3].forEach((o) => { o.connect(f); o.start(when); stop(o, when + e.dur + 1.1); });
        f.connect(g); g.connect(out);
        break;
      }
      case 'mel': {
        const f = this.lp(2400);
        const g = this.env(when, 0.035, Math.max(0, e.dur - 0.04), 0.22, e.vel * 0.15);
        const o = this.osc('sawtooth', e.f, when);
        const lfo = this.osc('sine', 5.4, when);
        const lg = c.createGain(); lg.gain.value = 7;
        lfo.connect(lg); lg.connect(o.detune);
        lfo.start(when); stop(lfo, when + e.dur);
        o.connect(f); f.connect(g); g.connect(out);
        o.start(when); stop(o, when + e.dur + 0.25);
        break;
      }
      case 'bass': {
        const f = this.lp(420);
        const g = this.env(when, 0.05, Math.max(0, e.dur - 0.1), 0.3, e.vel * 0.16);
        const o = this.osc('sawtooth', e.f, when);
        o.connect(f); f.connect(g); g.connect(out);
        o.start(when); stop(o, when + e.dur + 0.3);
        break;
      }
      case 'chug': {
        const f = this.lp(950);
        const g = this.env(when, 0.006, 0.07, 0.09, e.vel * 0.13);
        const o = this.osc('sawtooth', e.f, when);
        o.connect(f); f.connect(g); g.connect(out);
        o.start(when); stop(o, when + 0.25);
        break;
      }
      case 'pizz': {
        const g = this.env(when, 0.005, 0.01, Math.max(0.12, e.dur), e.vel * 0.22);
        const o = this.osc('triangle', e.f, when);
        o.connect(g); g.connect(out);
        o.start(when); stop(o, when + e.dur + 0.3);
        break;
      }
      case 'hit': {
        const f = this.lp(850);
        const g = this.env(when, 0.006, 0.1, 0.5, e.vel * 0.2);
        for (const dt of [-7, 0, 7]) {
          const o = this.osc('sawtooth', e.f, when, dt);
          o.connect(f); o.start(when); stop(o, when + 0.8);
        }
        f.connect(g); g.connect(out);
        break;
      }
      case 'timp': {
        const o = this.osc('sine', e.f * 1.6, when);
        o.frequency.exponentialRampToValueAtTime(Math.max(30, e.f * 0.8), when + 0.35);
        const g = this.env(when, 0.003, 0.03, 0.55, e.vel * 0.42);
        o.connect(g); g.connect(out);
        o.start(when); stop(o, when + 0.8);
        const n = this.noise(when, 0.12);
        const nf = this.lp(240);
        const ng = this.env(when, 0.002, 0.01, 0.1, e.vel * 0.18);
        n.connect(nf); nf.connect(ng); ng.connect(out);
        break;
      }
      case 'snare': {
        const n = this.noise(when, 0.09);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
        const g = this.env(when, 0.002, 0.005, 0.07, e.vel * 0.16);
        n.connect(bp); bp.connect(g); g.connect(out);
        break;
      }
      case 'tick': {
        const n = this.noise(when, 0.04);
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 3800;
        const g = this.env(when, 0.001, 0.004, 0.035, e.vel * 0.3);
        n.connect(hp); hp.connect(g); g.connect(out);
        break;
      }
      case 'bell': {
        for (const [mult, amp] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
          const o = this.osc('sine', e.f * mult, when);
          const g = this.env(when, 0.004, 0.05, 1.8, e.vel * 0.16 * amp);
          o.connect(g); g.connect(out);
          o.start(when); stop(o, when + 2.2);
        }
        break;
      }
    }
  }
}

/* ============================================================
   APP
   ============================================================ */

const params = new URLSearchParams(location.search);
const MUTE = params.has('mute');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* build sets */
sets.ext = buildExt();
sets.study = buildStudy();
sets.corridor = buildCorridor();
sets.meeting = buildMeeting();
sets.square = buildSquare();
sets.arrest = buildArrest();
sets.desk = buildDesk();
sets.finale = buildFinale();

/* build cards */
const cardsEl = document.getElementById('cards');
for (const c of CARDS) {
  const div = document.createElement('div');
  div.className = `card ${c.cls}`;
  div.innerHTML = c.html;
  cardsEl.appendChild(div);
  c.el = div;
}

/* score */
const SCORE = buildScore();

/* playback state */
const stage = document.getElementById('stage');
const poster = document.getElementById('poster');
const endcard = document.getElementById('endcard');
const fill = document.getElementById('progress-fill');
const timecode = document.getElementById('timecode');

let orch = null;       // Orchestra instance (null when muted)
let startCtxTime = 0;  // ctx.currentTime at (timeline t = offset)
let startPerf = 0;     // performance.now() fallback
let offset = 0;
let playing = false;
let ended = false;
let evPtr = 0;
let lastT = 0;

function now() {
  if (orch) return offset + (orch.ctx.currentTime - startCtxTime);
  return offset + (performance.now() - startPerf) / 1000;
}

function startPlayback(at = 0) {
  offset = at;
  ended = false;
  if (orch) { orch.ctx.close().catch(() => {}); orch = null; }
  if (!MUTE) {
    orch = new Orchestra();
    startCtxTime = orch.ctx.currentTime + 0.08;
  }
  startPerf = performance.now();
  evPtr = SCORE.findIndex((e) => e.t >= at);
  if (evPtr < 0) evPtr = SCORE.length;
  playing = true;
  stage.classList.add('playing');
  poster.classList.add('off');
  endcard.style.display = 'none';
  endcard.classList.add('off');
}

function endPlayback() {
  ended = true;
  playing = false;
  stage.classList.remove('playing');
  for (const c of CARDS) c.el.classList.remove('on');
  endcard.style.display = 'flex';
  endcard.classList.remove('off');
  if (orch) { orch.ctx.close().catch(() => {}); orch = null; }
}

document.getElementById('play').addEventListener('click', () => startPlayback(0));
document.getElementById('replay').addEventListener('click', () => startPlayback(0));

/* pause / seek controls */
window.addEventListener('keydown', (e) => {
  if (!playing && !ended) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (orch) orch.ctx.state === 'running' ? orch.ctx.suspend() : orch.ctx.resume();
  } else if (e.key >= '0' && e.key <= '9') {
    startPlayback(DUR * (+e.key / 10));
  }
});
document.getElementById('progress').addEventListener('click', (e) => {
  if (!playing && !ended) return;
  const r = e.currentTarget.getBoundingClientRect();
  startPlayback(DUR * clamp01((e.clientX - r.left) / r.width));
});

/* black fallback scene */
const blackScene = new THREE.Scene();
blackScene.background = new THREE.Color(0x000000);

/* main loop */
function frame() {
  requestAnimationFrame(frame);
  if (!playing) { renderer.render(blackScene, camera); return; }
  if (orch && orch.ctx.state === 'suspended') return; // paused

  const t = Math.min(now(), DUR);
  const dt = t - lastT;
  lastT = t;

  if (t >= DUR) { endPlayback(); return; }

  /* schedule upcoming audio */
  if (orch) {
    const horizon = t + 1.4;
    while (evPtr < SCORE.length && SCORE[evPtr].t < horizon) {
      const e = SCORE[evPtr++];
      const when = startCtxTime + (e.t - offset);
      if (when >= orch.ctx.currentTime - 0.02) orch.play(e, Math.max(when, orch.ctx.currentTime + 0.005));
    }
  }

  /* cards */
  for (const c of CARDS) {
    const on = t >= c.t[0] && t < c.t[1];
    if (on !== c._on) { c.el.classList.toggle('on', on); c._on = on; }
  }

  /* active shot */
  let shot = null;
  for (const s of SHOTS) if (t >= s.t[0] && t < s.t[1]) { shot = s; break; }

  if (shot) updateFlags(t, shot.set);

  if (shot) {
    const set = sets[shot.set];
    set.update(shot, t - shot.t[0], t, camera);
    // a breath of handheld
    camera.position.x += Math.sin(t * 1.7) * 0.012;
    camera.position.y += Math.cos(t * 1.3) * 0.009;
    renderer.render(set.scene, camera);
  } else {
    renderer.render(blackScene, camera);
  }

  /* progress + timecode */
  fill.style.width = `${(t / DUR) * 100}%`;
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  timecode.textContent = `${mm}:${ss} / 03:00`;
}
frame();

/* test hooks: ?t=NN&mute=1 jumps straight in without a click */
if (params.has('t')) {
  startPlayback(parseFloat(params.get('t')) || 0);
}
