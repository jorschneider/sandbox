// Seven ways of seeing the same world. A style supplies the materials,
// the light rig, the sky treatment, an optional inked outline pass, and
// the screen grade / paper overlays that sit above the canvas.

import * as THREE from 'three';

function ramp(stops) {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const RAMP_SOFT = ramp([110, 165, 212, 255]);
const RAMP_HARD = ramp([96, 190, 255]);
const RAMP_WASH = ramp([58, 150, 236]);
const RAMP_GLASS = ramp([150, 220, 255]);

// Inverted-hull outline: the mesh again, back faces only, pushed out
// along its normals. Shares instanceMatrix with its twin, so instanced
// crowds and animated herds stay in lockstep for free.
function outlineMaterial(color, width, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({
    color, side: THREE.BackSide, fog: false,
    transparent: opacity < 1, opacity,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uW = { value: width };
    shader.vertexShader = 'uniform float uW;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normalize(normal) * uW;`,
    );
  };
  return m;
}

// ---------------------------------------------------------------- the styles

// Art direction, per style.
//
// `palette` pulls whatever colour you decree toward a curated set: a hue the
// style is willing to print, a saturation ceiling, and a value range. Ink
// stays ink even when you shout "neon pink"; stained glass refuses to be
// muddy. `post` is the look of the frame itself — bloom, grade, vignette.
export const STYLES = {
  storybook: {
    title: 'Storybook',
    blurb: 'soft painted light, rounded forms',
    geo: 'round',
    lit: (extra) => new THREE.MeshToonMaterial({ gradientMap: RAMP_SOFT, ...extra }),
    water: () => new THREE.MeshPhongMaterial({
      transparent: true, opacity: 0.92, shininess: 110,
      specular: new THREE.Color('#aaaaaa'),
    }),
    richWater: true,
    outline: null,
    light: { hemi: 1, dir: 1, ambient: 0 },
    exposure: 1.05,
    fog: [120, 380],
    fogDensity: 0.0032, fogDesat: 0.5,
    skyMix: 0,
    grade: 'none',
    overlays: ['paper-soft'],
    sketch: true,
    palette: { sat: [0.18, 0.72], light: [0.24, 0.78], warmth: 0.06, unify: 0.14 },
    post: {
      bloom: 0.42, threshold: 0.86, exposure: 1.02, vignette: 0.32,
      aberration: 0.0014, saturation: 1.06, contrast: 1.04,
      lift: [0.012, 0.014, 0.026], gain: [1.03, 1.0, 0.96],
    },
  },

  ink: {
    palette: { sat: [0.0, 0.34], light: [0.16, 0.86], warmth: 0.1, unify: 0.5 },
    post: {
      bloom: 0.2, threshold: 0.92, exposure: 0.96, vignette: 0.5,
      aberration: 0.0, saturation: 0.72, contrast: 1.16,
      lift: [0.03, 0.028, 0.02], gain: [1.02, 0.99, 0.93],
    },
    fogDensity: 0.0062, fogDesat: 0.85,
    richWater: false,
    title: 'Ink & Wash',
    blurb: 'sumi-e brushwork on rice paper',
    geo: 'wispy',
    lit: (extra) => new THREE.MeshToonMaterial({ gradientMap: RAMP_WASH, ...extra }),
    water: () => new THREE.MeshToonMaterial({
      gradientMap: RAMP_WASH, transparent: true, opacity: 0.72,
    }),
    outline: { color: '#141210', width: 0.1, opacity: 0.88 },
    light: { hemi: 0.9, dir: 0.8, ambient: 0.05 },
    exposure: 0.96,
    fog: [70, 300],
    skyTint: '#f2ece0', skyMix: 0.62,
    grade: 'sepia(0.34) saturate(0.6) contrast(1.3) brightness(0.98)',
    overlays: ['paper-rice', 'ink-bleed'],
    sketch: true,
  },

  cel: {
    palette: { sat: [0.42, 0.95], light: [0.3, 0.74], warmth: 0.04, unify: 0.08 },
    post: {
      bloom: 0.5, threshold: 0.82, exposure: 1.06, vignette: 0.28,
      aberration: 0.0016, saturation: 1.2, contrast: 1.08,
      lift: [0.006, 0.01, 0.024], gain: [1.03, 1.0, 0.98],
    },
    fogDensity: 0.0022, fogDesat: 0.32,
    richWater: true,
    title: 'Cel Shade',
    blurb: 'bold anime inks, three-tone light',
    geo: 'round',
    lit: (extra) => new THREE.MeshToonMaterial({ gradientMap: RAMP_HARD, ...extra }),
    water: () => new THREE.MeshToonMaterial({
      gradientMap: RAMP_HARD, transparent: true, opacity: 0.88,
    }),
    outline: { color: '#141018', width: 0.038 },
    light: { hemi: 0.85, dir: 1.35, ambient: 0.1 },
    exposure: 1.12,
    fog: [150, 420],
    skyMix: 0,
    grade: 'saturate(1.25) contrast(1.08)',
    overlays: [],
    sketch: true,
  },

  woodblock: {
    palette: { sat: [0.24, 0.7], light: [0.26, 0.8], warmth: 0.14, unify: 0.3 },
    post: {
      bloom: 0.12, threshold: 0.95, exposure: 1.0, vignette: 0.4,
      aberration: 0.0, saturation: 0.94, contrast: 1.18,
      lift: [0.03, 0.024, 0.012], gain: [1.04, 0.99, 0.9],
    },
    fogDensity: 0.0035, fogDesat: 0.6,
    richWater: false,
    title: 'Woodblock',
    blurb: 'ukiyo-e flats and carved lines',
    geo: 'angular',
    lit: (extra) => new THREE.MeshBasicMaterial({ ...extra }),
    water: () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }),
    outline: { color: '#2b2118', width: 0.045, opacity: 0.92 },
    light: { hemi: 1, dir: 0, ambient: 0 },
    exposure: 1.0,
    fog: [140, 400],
    skyTint: '#e8d9bd', skyMix: 0.45,
    grade: 'sepia(0.24) saturate(1.15) contrast(1.24)',
    overlays: ['paper-rice', 'halftone'],
    sketch: false,
  },

  glass: {
    palette: { sat: [0.62, 1.0], light: [0.3, 0.66], warmth: 0.0, unify: 0.1 },
    post: {
      bloom: 1.0, threshold: 0.62, exposure: 1.14, vignette: 0.55,
      aberration: 0.0026, saturation: 1.34, contrast: 1.12,
      lift: [0.0, 0.0, 0.04], gain: [1.04, 0.98, 1.06],
    },
    fogDensity: 0.0026, fogDesat: 0.24,
    richWater: false,
    title: 'Stained Glass',
    blurb: 'lit panes in heavy leading',
    geo: 'angular',
    lit: (extra) => new THREE.MeshToonMaterial({ gradientMap: RAMP_GLASS, ...extra }),
    water: () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 }),
    outline: { color: '#0b0a10', width: 0.075 },
    light: { hemi: 1.15, dir: 0.8, ambient: 0.25 },
    exposure: 1.3,
    fog: [180, 460],
    skyTint: '#2a1c4a', skyMix: 0.35,
    grade: 'saturate(1.75) contrast(1.12) brightness(1.06)',
    overlays: ['cathedral'],
    sketch: false,
  },

  blueprint: {
    palette: { sat: [0.3, 0.8], light: [0.5, 0.86], warmth: -0.1, unify: 0.55 },
    post: {
      bloom: 0.85, threshold: 0.5, exposure: 1.06, vignette: 0.62,
      aberration: 0.0012, saturation: 0.8, contrast: 1.1,
      lift: [0.0, 0.02, 0.06], gain: [0.9, 1.0, 1.12],
    },
    fogDensity: 0.0018, fogDesat: 0.2,
    richWater: false,
    title: 'Blueprint',
    blurb: 'drafting lines on deep cyanotype',
    geo: 'angular',
    lit: (extra) => new THREE.MeshBasicMaterial({ wireframe: true, ...extra }),
    water: () => new THREE.MeshBasicMaterial({
      wireframe: true, transparent: true, opacity: 0.75,
    }),
    outline: null,
    light: { hemi: 1, dir: 0, ambient: 0 },
    exposure: 1.0,
    fog: [180, 520],
    skyTint: '#0a2246', skyMix: 0.88,
    grade: 'saturate(0.75) brightness(1.25) contrast(1.1)',
    overlays: ['grid', 'vignette-hard'],
    sketch: false,
    darkWorld: true,
    groundTint: '#7fd4ff',   // drafting lines, not a lit surface
  },

  neon: {
    palette: { sat: [0.7, 1.0], light: [0.42, 0.72], warmth: 0.0, unify: 0.06 },
    post: {
      bloom: 1.45, threshold: 0.42, exposure: 1.1, vignette: 0.6,
      aberration: 0.0036, saturation: 1.36, contrast: 1.12,
      lift: [0.02, 0.0, 0.05], gain: [1.04, 0.96, 1.12],
    },
    fogDensity: 0.005, fogDesat: 0.15,
    richWater: false,
    title: 'Neon Dream',
    blurb: 'luminous forms in a dark field',
    geo: 'crystal',
    lit: (extra) => new THREE.MeshBasicMaterial({ ...extra }),
    water: () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 }),
    outline: { color: '#f4f0ff', width: 0.028, opacity: 0.5 },
    light: { hemi: 1, dir: 0, ambient: 0 },
    exposure: 1.15,
    fog: [90, 340],
    skyTint: '#070312', skyMix: 0.9,
    grade: 'saturate(1.5) contrast(1.15)',
    overlays: ['glow', 'scanlines'],
    sketch: false,
    darkWorld: true,
    groundTint: '#3b3f52',   // the land sinks back so lit forms carry the frame
  },
};

export const STYLE_IDS = Object.keys(STYLES);

export function getStyle(id) {
  const def = STYLES[STYLE_IDS.includes(id) ? id : 'storybook'];
  const outlineMat = def.outline
    ? outlineMaterial(def.outline.color, def.outline.width, def.outline.opacity ?? 1)
    : null;
  return {
    id: STYLE_IDS.includes(id) ? id : 'storybook',
    ...def,
    outlineMat,
  };
}

// Walk a built scene and give every mesh tagged `userData.ol` an inked twin.
export function applyOutlines(scene, style) {
  if (!style.outlineMat) return;
  const base = style.outline.width;
  const jobs = [];
  scene.traverse((o) => {
    if (o.userData?.ol && (o.isMesh || o.isInstancedMesh)) jobs.push(o);
  });
  for (const o of jobs) {
    const scale = o.userData.olScale ?? 1;
    const mat = scale === 1
      ? style.outlineMat
      : outlineMaterial(style.outline.color, base * scale, style.outline.opacity ?? 1);
    let twin;
    if (o.isInstancedMesh) {
      twin = new THREE.InstancedMesh(o.geometry, mat, o.count);
      twin.instanceMatrix = o.instanceMatrix; // shared: animation stays in sync
      twin.frustumCulled = false;
    } else {
      twin = new THREE.Mesh(o.geometry, mat);
      twin.position.copy(o.position);
      twin.quaternion.copy(o.quaternion);
      twin.scale.copy(o.scale);
    }
    twin.raycast = () => {};
    twin.renderOrder = -1;
    (o.parent || scene).add(twin);
  }
}
