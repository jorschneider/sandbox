// Turns an utterance ("let the river be deep turquoise") into a decree:
// resolves a category + color, then ripples the color outward from the
// point of decree to every kindred surface in the world.

import * as THREE from 'three';

const RIPPLE_SPEED = 42;   // world units / second
const BATCH_DUR = 1.05;    // per-element color transition time
const TWEEN_DUR = 1.4;

// Poetic color words the CSS table lacks (multi-word keys use spaces).
const EXTRA_COLORS = {
  emerald: '#2ecc71', jade: '#00a86b', ruby: '#9b111e', sapphire: '#0f52ba',
  amber: '#ffbf00', cobalt: '#0047ab', vermilion: '#e34234', scarlet: '#ff2400',
  rose: '#ff007f', blush: '#de5d83', mint: '#98ff98', sage: '#9caf88',
  ochre: '#cc7722', rust: '#b7410e', copper: '#b87333', bronze: '#cd7f32',
  pearl: '#eae0c8', charcoal: '#36454f', midnight: '#191970', cream: '#fffdd0',
  honey: '#ffc30b', mustard: '#e1ad01', peach: '#ffcba4', apricot: '#fbceb1',
  wine: '#722f37', burgundy: '#800020', cerulean: '#007ba7', lilac: '#c8a2c8',
  periwinkle: '#8fa2e8', mauve: '#b784a7', sand: '#c2b280', storm: '#4f666a',
  slate: '#708090', blood: '#8a0303', fire: '#e25822', flame: '#e25822',
  golden: '#ffd700', sunset: '#fd5e53', ocean: '#016064', lemon: '#fff44f',
  cherry: '#d2042d', azure: '#2b7de0', denim: '#1560bd', moss: '#8a9a5b',
  fern: '#71bc78', pine: '#01796f', grape: '#6f2da8', plum: '#8e4585',
  raspberry: '#e30b5c', tangerine: '#f28500', marigold: '#eaa221',
  butter: '#fffd74', bone: '#e3dac9', ash: '#b2beb5', smoke: '#738276',
  ink: '#1c2331', obsidian: '#1f2229', snow: '#fffafa', milk: '#fdfff5',
  'blood red': '#8a0303', 'baby blue': '#89cff0', 'off white': '#f5f5f0',
  'bone white': '#f9f6ee', 'jet black': '#0a0a0a', 'sea foam': '#93e9be',
  seafoam: '#93e9be', 'egg shell': '#f0ead6', eggshell: '#f0ead6',
  'robin egg blue': '#96deda', 'burnt orange': '#cc5500', 'burnt sienna': '#e97451',
  'navy blue': '#000080', 'blush pink': '#fe828c', 'sky blue': '#87ceeb',
};

const MODIFIERS = {
  dark: (h, s, l) => [h, Math.min(1, s * 1.05), l * 0.6],
  darker: (h, s, l) => [h, s, l * 0.6],
  deep: (h, s, l) => [h, Math.min(1, s * 1.15), l * 0.62],
  light: (h, s, l) => [h, s * 0.85, l + (1 - l) * 0.35],
  lighter: (h, s, l) => [h, s * 0.85, l + (1 - l) * 0.35],
  pale: (h, s, l) => [h, s * 0.45, l + (1 - l) * 0.45],
  soft: (h, s, l) => [h, s * 0.6, l + (1 - l) * 0.2],
  pastel: (h, s, l) => [h, s * 0.45, Math.max(l, 0.78)],
  bright: (h, s, l) => [h, Math.min(1, s * 1.35), Math.min(0.9, l * 1.15)],
  vivid: (h, s, l) => [h, 1, l],
  electric: (h, s, l) => [h, 1, Math.max(l, 0.55)],
  neon: (h, s, l) => [h, 1, Math.max(l, 0.58)],
  dusty: (h, s, l) => [h, s * 0.4, l],
  muted: (h, s, l) => [h, s * 0.5, l],
  burnt: (h, s, l) => [h, s * 0.85, l * 0.65],
  hot: (h, s, l) => [h, Math.min(1, s * 1.3), l],
  warm: (h, s, l) => [h, Math.min(1, s * 1.1), l],
};

const EVERYTHING = new Set(['everything', 'world', 'all', 'everywhere', 'universe']);
const RAINBOW = new Set(['rainbow', 'rainbows']);

let world = null;
let hooks = {};
let synIndex = new Map();
const batches = [];
const tweens = [];
const rings = [];
const tmpA = new THREE.Color(), tmpB = new THREE.Color();

export function bindDecrees(w, h) {
  world = w;
  hooks = h;
  synIndex = new Map();
  for (const cat of world.categories.values()) {
    for (const s of cat.synonyms) synIndex.set(s, cat.key);
  }
}

// ------------------------------------------------------------------ parsing

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColor(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (RAINBOW.has(tokens[i])) {
      return { rainbow: true, name: 'every color at once', index: i };
    }
    for (let n = 3; n >= 1; n--) {
      if (i + n > tokens.length) continue;
      const gram = tokens.slice(i, i + n);
      const spaced = gram.join(' ');
      const joined = gram.join('');
      let hex = EXTRA_COLORS[spaced] || EXTRA_COLORS[joined];
      if (!hex && THREE.Color.NAMES[joined] !== undefined) hex = joined;
      if (!hex && n === 1 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(gram[0])) hex = gram[0];
      if (hex) {
        const color = new THREE.Color(hex);
        const modWords = [];
        let j = i - 1;
        const hsl = { h: 0, s: 0, l: 0 };
        while (j >= 0 && MODIFIERS[tokens[j]]) {
          modWords.unshift(tokens[j]);
          j--;
        }
        color.getHSL(hsl);
        for (const m of modWords) {
          const [h2, s2, l2] = MODIFIERS[m](hsl.h, hsl.s, hsl.l);
          hsl.h = h2; hsl.s = s2; hsl.l = l2;
        }
        color.setHSL(hsl.h, hsl.s, hsl.l);
        return { color, name: [...modWords, spaced].join(' '), index: i };
      }
    }
  }
  // "the color of X" fallthrough: nothing matched
  return null;
}

function findCategory(tokens) {
  for (const t of tokens) {
    const key = synIndex.get(t);
    if (key) return key;
  }
  for (const t of tokens) {
    if (EVERYTHING.has(t)) return '*';
  }
  return null;
}

const FAIL_LINES = [
  'the world does not know that hue…',
  'speak a color, and it shall be…',
  'the valley waits, unhearing…',
];
let failIdx = 0;

// The main entry: parse an utterance and enact it.
// gazeKey: category currently under the crosshair (or null)
// gazePoint / playerPos: THREE.Vector3
export function speak(text, gazeKey, gazePoint, playerPos, now) {
  if (!world) return;
  const norm = normalize(text);
  if (!norm) return;
  const tokens = norm.split(' ');
  const colorSpec = findColor(tokens);
  let catKey = findCategory(tokens);

  const genesis = /let there be colou?r/.test(norm)
    || (!colorSpec && catKey === '*' && /\bcolou?r\b/.test(norm));
  if (genesis) {
    let i = 0;
    for (const cat of world.categories.values()) {
      enact(cat, { color: new THREE.Color(cat.defaultColor), name: null },
        playerPos, now, i * 0.42, true);
      i++;
    }
    hooks.caption('…and there was <em>color</em>.', '#ffffff', 'genesis');
    hooks.onGenesis?.();
    return;
  }

  if (!colorSpec) {
    if (catKey && catKey !== '*') {
      const cat = world.categories.get(catKey);
      hooks.caption(`name a hue for ${cat.label}…`, null, 'hint');
    } else {
      hooks.caption(FAIL_LINES[failIdx++ % FAIL_LINES.length], null, 'hint');
    }
    return;
  }

  if (!catKey) {
    if (gazeKey) catKey = gazeKey;
    else {
      hooks.caption('gaze upon a thing, and name its hue…', null, 'hint');
      return;
    }
  }

  if (catKey === '*') {
    let i = 0;
    for (const cat of world.categories.values()) {
      enact(cat, colorSpec, playerPos, now, i * 0.18, true);
      i++;
    }
    const cls = colorSpec.rainbow ? 'rainbow' : '';
    hooks.caption(`…and all the world was <em>${colorSpec.name}</em>.`,
      colorSpec.rainbow ? null : captionHex(colorSpec.color), cls);
    return;
  }

  const cat = world.categories.get(catKey);
  const origin = (gazeKey === catKey && gazePoint) ? gazePoint : playerPos;
  enact(cat, colorSpec, origin, now, 0, false);
  const cls = colorSpec.rainbow ? 'rainbow' : '';
  hooks.caption(`…${cat.phrase} <em>${colorSpec.name}</em>.`,
    colorSpec.rainbow ? null : captionHex(colorSpec.color), cls);
}

function captionHex(color) {
  // keep the caption legible on the dark scrim
  const hsl = { h: 0, s: 0, l: 0 };
  tmpA.copy(color).getHSL(hsl);
  tmpA.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.62));
  return '#' + tmpA.getHexString();
}

// ------------------------------------------------------------- enacting color

function rainbowColor(out, x, z, ox, oz) {
  const d = Math.hypot(x - ox, z - oz);
  const hue = (d * 0.011 + Math.atan2(z - oz, x - ox) / (Math.PI * 2) * 0.25) % 1;
  return out.setHSL((hue + 1) % 1, 0.85, 0.58);
}

function enact(cat, colorSpec, origin, now, extraDelay, muted) {
  const isNew = !cat.colored;
  cat.colored = true;
  cat.currentName = colorSpec.name;
  if (isNew && cat.onFirstColor) cat.onFirstColor();

  const base = colorSpec.color || new THREE.Color(cat.defaultColor);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  for (const surf of cat.surfaces) {
    if (surf.type === 'inst' || surf.type === 'vertex') {
      const isInst = surf.type === 'inst';
      const attr = isInst ? surf.mesh.instanceColor : surf.mesh.geometry.attributes.color;
      const arr = attr.array;
      const count = isInst ? surf.mesh.count : surf.positions.count;
      const from = arr.slice();
      const to = new Float32Array(count * 3);
      const delays = new Float32Array(count);
      let maxDelay = 0;
      const v = surf.variance || { h: 0, s: 0, l: 0 };
      for (let i = 0; i < count; i++) {
        let x, z;
        if (isInst) { x = surf.positions[i].x; z = surf.positions[i].z; }
        else { x = surf.positions.getX(i); z = surf.positions.getZ(i); }
        if (colorSpec.rainbow) {
          rainbowColor(tmpA, x, z, origin.x, origin.z);
        } else {
          const jr = surf.jitterSeed ? surf.jitterSeed[i] : Math.random();
          const jr2 = (jr * 7.31) % 1;
          tmpA.setHSL(
            (hsl.h + (jr - 0.5) * 2 * v.h + 1) % 1,
            Math.min(1, Math.max(0, hsl.s + (jr2 - 0.5) * 2 * v.s)),
            Math.min(0.95, Math.max(0.04, hsl.l + ((jr * 3.7 % 1) - 0.5) * 2 * v.l)),
          );
        }
        if (surf.shade) tmpA.multiplyScalar(surf.shade[i]);
        to[i * 3] = tmpA.r; to[i * 3 + 1] = tmpA.g; to[i * 3 + 2] = tmpA.b;
        const d = extraDelay + Math.hypot(x - origin.x, z - origin.z) / RIPPLE_SPEED;
        delays[i] = d;
        if (d > maxDelay) maxDelay = d;
      }
      batches.push({ attr, arr, from, to, delays, start: now, maxDelay, count });
    } else if (surf.type === 'tint') {
      const delay = extraDelay + (surf.pos
        ? Math.hypot(surf.pos.x - origin.x, surf.pos.z - origin.z) / RIPPLE_SPEED
        : 0);
      const to = new THREE.Color();
      if (colorSpec.rainbow) {
        const p = surf.pos || origin;
        rainbowColor(to, p.x, p.z, origin.x, origin.z);
      } else {
        to.copy(base);
      }
      tweens.push({
        from: surf.current.clone(), to, apply: surf.apply,
        start: now + delay, dur: TWEEN_DUR, done: false,
      });
    }
  }

  spawnRing(origin, colorSpec.rainbow ? null : base, now + extraDelay);

  const total = world.categories.size;
  let coloredCount = 0;
  for (const c of world.categories.values()) if (c.colored) coloredCount++;
  hooks.onDecree?.(cat.key, hsl.h, isNew, coloredCount, total, muted);
}

// --------------------------------------------------------------- ripple rings

const ringGeo = new THREE.RingGeometry(0.955, 1, 72);
ringGeo.rotateX(-Math.PI / 2);

function spawnRing(origin, color, startTime) {
  const mat = new THREE.MeshBasicMaterial({
    color: color ? tmpB.copy(color).lerp(new THREE.Color('#ffffff'), 0.35).clone() : '#ffffff',
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(ringGeo, mat);
  mesh.position.set(origin.x, origin.y + 0.5, origin.z);
  mesh.visible = false;
  world.scene.add(mesh);
  rings.push({ mesh, mat, start: startTime, dur: 2.4 });
}

// -------------------------------------------------------------------- ticking

const easeOut = (t) => 1 - (1 - t) * (1 - t);

export function tickDecrees(now) {
  for (let bi = batches.length - 1; bi >= 0; bi--) {
    const b = batches[bi];
    const { arr, from, to, delays, count } = b;
    let allDone = true;
    for (let i = 0; i < count; i++) {
      const t = (now - b.start - delays[i]) / BATCH_DUR;
      if (t <= 0) { allDone = false; continue; }
      const k = i * 3;
      if (t >= 1) {
        arr[k] = to[k]; arr[k + 1] = to[k + 1]; arr[k + 2] = to[k + 2];
        continue;
      }
      allDone = false;
      const e = easeOut(t);
      // brief luminous pulse as the color arrives
      const pulse = Math.sin(Math.PI * t) * 0.28;
      arr[k] = from[k] + (to[k] - from[k]) * e + pulse;
      arr[k + 1] = from[k + 1] + (to[k + 1] - from[k + 1]) * e + pulse;
      arr[k + 2] = from[k + 2] + (to[k + 2] - from[k + 2]) * e + pulse;
    }
    b.attr.needsUpdate = true;
    if (allDone) batches.splice(bi, 1);
  }

  for (let ti = tweens.length - 1; ti >= 0; ti--) {
    const tw = tweens[ti];
    const t = (now - tw.start) / tw.dur;
    if (t <= 0) continue;
    if (t >= 1) {
      tw.apply(tmpA.copy(tw.to));
      // keep `current` reference in sync for the next decree
      tw.from.copy(tw.to);
      tweens.splice(ti, 1);
      continue;
    }
    const e = easeOut(t);
    tmpA.copy(tw.from).lerp(tw.to, e);
    const pulse = Math.sin(Math.PI * t) * 0.18;
    tmpA.r += pulse; tmpA.g += pulse; tmpA.b += pulse;
    tw.apply(tmpA);
  }

  for (let ri = rings.length - 1; ri >= 0; ri--) {
    const r = rings[ri];
    const t = (now - r.start) / r.dur;
    if (t <= 0) { r.mesh.visible = false; continue; }
    if (t >= 1) {
      world.scene.remove(r.mesh);
      r.mat.dispose();
      rings.splice(ri, 1);
      continue;
    }
    r.mesh.visible = true;
    const radius = 2 + easeOut(t) * RIPPLE_SPEED * r.dur;
    r.mesh.scale.set(radius, 1, radius);
    r.mat.opacity = 0.65 * (1 - t);
  }
}
