// Builds the monochrome valley and registers every paintable "category".
// A category owns one or more surfaces; decree.js animates their colors.

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

function gray(v) { return new THREE.Color(v, v, v); }

// Standard flat material driven entirely by instance colors.
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
    const p = new THREE.Vector3().setFromMatrixPosition(matrices[i]);
    positions.push(p);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return { mesh, positions };
}

// --------------------------------------------------------------------- build

export function buildWorld(scene) {
  const categories = new Map();
  const gazeEntries = [];   // { object, key } for raycasting
  const meshToKey = new Map();
  const updaters = [];

  function addCategory(key, def) {
    categories.set(key, {
      key, colored: false, currentName: null,
      surfaces: [], ...def,
    });
    return categories.get(key);
  }

  function addGaze(object, key) {
    gazeEntries.push(object);
    object.traverse((o) => meshToKey.set(o, key));
  }

  // ---- lights -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xdcdcdc, 0x707070, 0.95);
  scene.add(hemi);
  const sunDir = new THREE.Vector3(0.45, 0.62, -0.64).normalize();
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.copy(sunDir).multiplyScalar(180);
  scene.add(sunLight, sunLight.target);

  // ---- sky ----------------------------------------------------------------
  scene.background = new THREE.Color('#e7e7e4');
  scene.fog = new THREE.Fog('#e7e7e4', 120, 380);

  addCategory('sky', {
    label: 'the sky',
    synonyms: ['sky', 'skies', 'heavens', 'heaven', 'firmament', 'air'],
    phrase: 'and the heavens turned',
    defaultColor: '#87c7ea',
    surfaces: [
      { type: 'tint', current: scene.background, apply: (c) => {
        scene.background.copy(c);
        scene.fog.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.22);
        hemi.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.45);
      } },
    ],
  });

  // ---- sun ----------------------------------------------------------------
  const sunMat = new THREE.MeshBasicMaterial({ color: '#f0f0ee', fog: false });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 26), sunMat);
  sunDisc.position.copy(sunDir).multiplyScalar(360);
  const haloMat = new THREE.MeshBasicMaterial({
    color: '#f0f0ee', fog: false, transparent: true, opacity: 0.18, depthWrite: false,
  });
  const sunHalo = new THREE.Mesh(new THREE.CircleGeometry(24, 26), haloMat);
  sunHalo.position.copy(sunDir).multiplyScalar(358);
  sunDisc.lookAt(0, 0, 0);
  sunHalo.lookAt(0, 0, 0);
  scene.add(sunDisc, sunHalo);
  addGaze(sunDisc, 'sun');

  addCategory('sun', {
    label: 'the sun',
    synonyms: ['sun', 'sunshine', 'sunlight'],
    phrase: 'and the sun burned',
    defaultColor: '#ffd166',
    surfaces: [
      { type: 'tint', current: sunMat.color, apply: (c) => {
        sunMat.color.copy(c);
        haloMat.color.copy(c);
        sunLight.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.55);
      } },
    ],
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

  // Per-vertex shading factor (slope + altitude) baked into every color state.
  const shade = new Float32Array(vCount);
  const vJitter = new Float32Array(vCount);
  const tNor = tGeo.attributes.normal;
  const tCol = new Float32Array(vCount * 3);
  for (let i = 0; i < vCount; i++) {
    const ny = tNor.getY(i);
    const y = tPos.getY(i);
    let s = 0.72 + 0.3 * smoothstep(0.55, 1, ny) + 0.004 * Math.max(y, 0);
    shade[i] = Math.min(s, 1.12);
    vJitter[i] = rand();
    const g = (0.64 + (vJitter[i] - 0.5) * 0.07) * shade[i];
    tCol[i * 3] = g; tCol[i * 3 + 1] = g; tCol[i * 3 + 2] = g;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1, metalness: 0,
  }));
  scene.add(terrain);
  addGaze(terrain, 'land');

  addCategory('land', {
    label: 'the land',
    synonyms: ['land', 'ground', 'grass', 'earth', 'hills', 'hill', 'valley',
      'meadow', 'meadows', 'field', 'fields', 'terrain', 'mountains'],
    phrase: 'and the land lay',
    defaultColor: '#79b356',
    surfaces: [
      { type: 'vertex', mesh: terrain, positions: tPos, shade, jitterSeed: vJitter,
        variance: { h: 0.02, s: 0.1, l: 0.06 } },
      { type: 'tint', current: hemi.groundColor,
        apply: (c) => hemi.groundColor.copy(c).lerp(new THREE.Color('#666666'), 0.45) },
    ],
  });

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
    label: 'the river',
    synonyms: ['water', 'waters', 'river', 'stream', 'brook', 'creek', 'lake'],
    phrase: 'and the river ran',
    defaultColor: '#4fb0c6',
    surfaces: [
      { type: 'tint', current: waterMat.color, apply: (c) => {
        waterMat.color.copy(c);
        waterMat.specular.copy(c).lerp(new THREE.Color('#ffffff'), 0.6);
      } },
    ],
  });

  // ---- placement helpers --------------------------------------------------
  function openGround(x, z, riverPad = 10, villagePad = 0.12) {
    if (Math.hypot(x, z) > 190) return false;
    if (Math.abs(x - riverX(z)) < riverPad) return false;
    if (villageMask(x, z) > villagePad) return false;
    return true;
  }

  // path curve (village square, down to the bridge, off to the west)
  const pathPts = [];
  {
    const ctrl = [
      new THREE.Vector3(66, 0, 30), new THREE.Vector3(52, 0, 18),
      new THREE.Vector3(30, 0, 10), new THREE.Vector3(14, 0, 5),
      new THREE.Vector3(3.4, 0, 4), new THREE.Vector3(-14, 0, 0),
      new THREE.Vector3(-34, 0, -8), new THREE.Vector3(-62, 0, -22),
    ];
    const curve = new THREE.CatmullRomCurve3(ctrl);
    const n = 130;
    for (let i = 0; i <= n; i++) pathPts.push(curve.getPoint(i / n));
  }
  function nearPath(x, z, d) {
    for (const p of pathPts) if (Math.hypot(p.x - x, p.z - z) < d) return true;
    return false;
  }

  // ---- trees --------------------------------------------------------------
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 380 && guard++ < 30000) {
    const x = (rand() * 2 - 1) * 195, z = (rand() * 2 - 1) * 195;
    if (!openGround(x, z, 12)) continue;
    if (nearPath(x, z, 4.5)) continue;
    if (N.fbm(x * 0.02 + 40, z * 0.02 - 17, 3) < -0.12) continue; // clearings
    treeSpots.push({ x, z, s: 0.7 + rand() * 0.85, rot: rand() * Math.PI * 2 });
  }
  const pineSpots = treeSpots.filter((_, i) => i % 9 < 5);
  const broadSpots = treeSpots.filter((_, i) => i % 9 >= 5);

  function treeMatrices(spots, yOffset = 0) {
    return spots.map((sp) => new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z) - 0.15 + yOffset, sp.z),
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
  scene.add(pines.mesh, broads.mesh, trunks.mesh);
  addGaze(pines.mesh, 'trees');
  addGaze(broads.mesh, 'trees');
  addGaze(trunks.mesh, 'bark');

  addCategory('trees', {
    label: 'the trees',
    synonyms: ['tree', 'trees', 'forest', 'forests', 'leaves', 'canopy', 'foliage', 'pines', 'pine'],
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
    label: 'the bark',
    synonyms: ['bark', 'trunk', 'trunks', 'wood', 'timber'],
    phrase: 'and the bark grew',
    defaultColor: '#7a5537',
    surfaces: [
      { type: 'inst', mesh: trunks.mesh, positions: trunks.positions,
        variance: { h: 0.02, s: 0.1, l: 0.07 } },
    ],
  });

  // ---- rocks --------------------------------------------------------------
  const rockMatrices = [], rockGuardMax = 20000;
  guard = 0;
  while (rockMatrices.length < 170 && guard++ < rockGuardMax) {
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
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rocks = makeInstanced(rockGeo, rockMatrices.length, rockMatrices, 0.58, 0.12);
  scene.add(rocks.mesh);
  addGaze(rocks.mesh, 'rocks');

  addCategory('rocks', {
    label: 'the stones',
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

  addCategory('flowers', {
    label: 'the flowers',
    synonyms: ['flower', 'flowers', 'blossom', 'blossoms', 'bloom', 'blooms', 'petals'],
    phrase: 'and the flowers bloomed',
    defaultColor: '#e86aa6',
    surfaces: [
      { type: 'inst', mesh: flowers.mesh, positions: flowers.positions,
        variance: { h: 0.09, s: 0.15, l: 0.12 } },
    ],
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
  for (const plot of housePlots) {
    const g = new THREE.Group();
    const y = terrainHeight(plot.x, plot.z);
    g.position.set(plot.x, y, plot.z);
    g.rotation.y = Math.atan2(VILLAGE.x - plot.x, VILLAGE.z - plot.z) + (rand() - 0.5) * 0.5;

    const wallMat = instMaterial();
    wallMat.color.setScalar(0.66 + (rand() - 0.5) * 0.06);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 1.25;

    const roofMat = instMaterial();
    roofMat.color.setScalar(0.45 + (rand() - 0.5) * 0.06);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.5 + 0.85;
    roof.rotation.y = Math.PI / 4;

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
  }
  scene.add(houseGroup);
  addGaze(houseGroup, 'houses');

  addCategory('houses', {
    label: 'the houses',
    synonyms: ['house', 'houses', 'home', 'homes', 'village', 'cottage',
      'cottages', 'hut', 'huts', 'walls', 'buildings'],
    phrase: 'and the houses stood',
    defaultColor: '#e8dcc4',
    onFirstColor: () => {
      for (const m of windowMats) m.emissive.set('#ffc46b').multiplyScalar(0.9);
    },
    surfaces: wallSurf,
  });
  addCategory('roofs', {
    label: 'the roofs',
    synonyms: ['roof', 'roofs', 'rooftops', 'shingles'],
    phrase: 'and the roofs shone',
    defaultColor: '#c65f3d',
    surfaces: roofSurf,
  });

  // Roofs are children of houseGroup; give roofs precedence in gaze lookup.
  houseGroup.traverse((o) => {
    if (o.geometry === roofGeo) meshToKey.set(o, 'roofs');
  });

  // ---- path + bridge ------------------------------------------------------
  const patchMatrices = [], patchUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pathPts.length; i++) {
    const p = pathPts[i];
    if (Math.abs(p.x - riverX(p.z)) < 8.5) continue; // bridge crosses here
    const jx = p.x + (rand() - 0.5) * 1.2, jz = p.z + (rand() - 0.5) * 1.2;
    const nrm = terrainNormal(jx, jz);
    const q = new THREE.Quaternion().setFromUnitVectors(patchUp, nrm);
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)));
    patchMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(jx, terrainHeight(jx, jz) + 0.07, jz),
      q,
      new THREE.Vector3(1.5 + rand() * 0.7, 1, 1.1 + rand() * 0.5),
    ));
  }
  const patchGeo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
  const patches = makeInstanced(patchGeo, patchMatrices.length, patchMatrices, 0.7, 0.08);
  patches.mesh.material.flatShading = false;
  scene.add(patches.mesh);
  addGaze(patches.mesh, 'path');

  const bridgeMat = instMaterial();
  bridgeMat.color.setScalar(0.52);
  const bridge = new THREE.Group();
  {
    const bz = 4, bx = riverX(bz);
    const span = 19, planks = 9;
    for (let i = 0; i < planks; i++) {
      const t = i / (planks - 1);
      const x = bx - span / 2 + t * span;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(span / planks + 0.25, 0.18, 2.6), bridgeMat);
      plank.position.set(x, 0.35 + Math.sin(t * Math.PI) * 0.55, bz);
      plank.rotation.z = Math.cos(t * Math.PI) * -0.22;
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

  addCategory('path', {
    label: 'the path',
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

  // ---- clouds -------------------------------------------------------------
  const cloudSurf = [];
  const cloudGroups = [];
  for (let i = 0; i < 9; i++) {
    const mat = instMaterial();
    mat.color.setScalar(0.9 + (rand() - 0.5) * 0.05);
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
    cloudSurf.push({ type: 'tint', current: mat.color, pos: g.position,
      apply: (c) => mat.color.copy(c) });
  }
  updaters.push((dt) => {
    for (const g of cloudGroups) {
      g.position.x += dt * 1.15;
      if (g.position.x > 280) g.position.x = -280;
    }
  });

  addCategory('clouds', {
    label: 'the clouds',
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
    for (const fl of flocks) {
      for (const b of fl.birds) {
        const a = t * fl.speed + b.off;
        const px = fl.center.x + Math.cos(a) * fl.radius;
        const pz = fl.center.z + Math.sin(a) * fl.radius;
        const py = fl.center.y + Math.sin(t * 0.6 + b.phase) * 2.5;
        b.g.position.set(px, py, pz);
        b.g.rotation.y = -a - Math.PI / 2;
        const flap = Math.sin(t * 9 + b.phase) * 0.7;
        b.l.rotation.x = flap;
        b.r.rotation.x = -flap;
      }
    }
  });

  addCategory('birds', {
    label: 'the birds',
    synonyms: ['bird', 'birds', 'flock', 'swallows', 'sparrows'],
    phrase: 'and the birds flew',
    defaultColor: '#37474f',
    surfaces: birdSurf,
  });

  // ---- contact shadows (uncategorized, stays neutral) ---------------------
  const shadowSpots = treeSpots.map((s) => ({ x: s.x, z: s.z, r: 1.6 * s.s }))
    .concat(housePlots.map((p) => ({ x: p.x, z: p.z, r: 2.6 })));
  const shGeo = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2);
  const shMat = new THREE.MeshBasicMaterial({
    color: '#000000', transparent: true, opacity: 0.13, depthWrite: false,
  });
  const shadows = new THREE.InstancedMesh(shGeo, shMat, shadowSpots.length);
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
  return {
    categories,
    gazeEntries,
    meshToKey,
    terrainHeight,
    WORLD_RADIUS,
    WATER_Y,
    scene,
    spawn: new THREE.Vector3(8, 0, 78),
    spawnLook: new THREE.Vector3(52, 4, 18),
    update(dt, t) { for (const u of updaters) u(dt, t); },
  };
}
