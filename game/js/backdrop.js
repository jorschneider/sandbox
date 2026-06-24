// Ambient 3D backdrop: a slow wireframe globe with two delegation markers
// (US-blue, China-red) and an arc between Washington and Beijing. Purely
// decorative — the game runs fine if this never loads (see game.js try/catch).
import * as THREE from '../../vendor/three.module.min.js';

const DEG = Math.PI / 180;

// lat/lon -> point on a sphere of radius r
function geo(lat, lon, r) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

export function initBackdrop(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.6, 9.4);

  const world = new THREE.Group();
  world.rotation.z = -0.28;
  scene.add(world);

  const R = 3.0;

  // globe wireframe
  const globe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R, 4),
    new THREE.MeshBasicMaterial({ color: 0xefe7d3, wireframe: true, transparent: true, opacity: 0.06 })
  );
  world.add(globe);

  // faint inner shell for depth
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x0c1830, transparent: true, opacity: 0.55 })
  );
  world.add(shell);

  // latitude rings
  const ringMat = new THREE.LineBasicMaterial({ color: 0xefe7d3, transparent: true, opacity: 0.05 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 6) pts.push(geo(lat, lon, R * 1.001));
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }

  // delegation markers
  const US = geo(38.9, -77.0, R);
  const CN = geo(39.9, 116.4, R);
  function marker(pos, color) {
    const g = new THREE.Group();
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28 })
    );
    g.add(dot); g.add(halo);
    g.position.copy(pos);
    g.userData.halo = halo;
    world.add(g);
    return g;
  }
  const mUS = marker(US, 0x4a78c0);
  const mCN = marker(CN, 0xd23b43);

  // great-circle arc, lifted above the surface
  const arcPts = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const v = new THREE.Vector3().copy(US).lerp(CN, t).normalize();
    const lift = R * (1 + 0.32 * Math.sin(Math.PI * t));
    arcPts.push(v.multiplyScalar(lift));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
  const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xc8a23c, transparent: true, opacity: 0.6 }));
  world.add(arc);

  // a pulse that travels along the arc
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xefe7d3 })
  );
  world.add(pulse);

  // drifting dust
  const dustGeo = new THREE.BufferGeometry();
  const N = 220;
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const rad = 5 + Math.random() * 6;
    const a = Math.random() * Math.PI * 2;
    const b = (Math.random() - 0.5) * Math.PI;
    arr[i*3]   = Math.cos(a) * Math.cos(b) * rad;
    arr[i*3+1] = Math.sin(b) * rad;
    arr[i*3+2] = Math.sin(a) * Math.cos(b) * rad;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xefe7d3, size: 0.02, transparent: true, opacity: 0.35 }));
  scene.add(dust);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  let raf = 0;
  const spin = reduced ? 0.0008 : 0.0016;
  function frame() {
    t += 1;
    world.rotation.y += spin;
    dust.rotation.y += spin * 0.3;
    const pulseT = (t % 220) / 220;
    const idx = Math.floor(pulseT * steps);
    pulse.position.copy(arcPts[Math.min(idx, steps)]);
    const s = 0.8 + 0.4 * Math.sin(t * 0.06);
    mUS.userData.halo.scale.setScalar(s);
    mCN.userData.halo.scale.setScalar(2 - s);
    arc.material.opacity = 0.45 + 0.25 * Math.sin(t * 0.05);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  // pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { frame(); }
  });

  return { renderer, scene };
}
