// Turns an utterance ("let the river be deep turquoise") into a decree:
// resolves an intent (color / night / weather / genesis / unmaking), a
// target (a category, "everything", or the single thing under the
// crosshair) and a color, then ripples the change outward from the point
// of decree. Also keeps the ordered log that lets a world be remembered.

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
  golden: '#ffd700', sunset: '#fd5e53', ocean: '#016064', sea: '#1f7a8c',
  lemon: '#fff44f', cherry: '#d2042d', azure: '#2b7de0', denim: '#1560bd',
  moss: '#8a9a5b', fern: '#71bc78', pine: '#01796f', grape: '#6f2da8',
  plum: '#8e4585', raspberry: '#e30b5c', tangerine: '#f28500',
  marigold: '#eaa221', butter: '#fffd74', bone: '#e3dac9', ash: '#b2beb5',
  smoke: '#738276', ink: '#1c2331', obsidian: '#1f2229', snow: '#fffafa',
  milk: '#fdfff5',
  'blood red': '#8a0303', 'baby blue': '#89cff0', 'off white': '#f5f5f0',
  'bone white': '#f9f6ee', 'jet black': '#0a0a0a', 'sea foam': '#93e9be',
  seafoam: '#93e9be', 'egg shell': '#f0ead6', eggshell: '#f0ead6',
  'robin egg blue': '#96deda', 'burnt orange': '#cc5500', 'burnt sienna': '#e97451',
  'navy blue': '#000080', 'blush pink': '#fe828c', 'sky blue': '#87ceeb',
};

const MODIFIERS = {
  dark: (h, s, l) => [h, Math.min(1, s * 1.05), l * 0.6],
  darker: (h, s, l) => [h, s, l * 0.62],
  deep: (h, s, l) => [h, Math.min(1, s * 1.15), l * 0.62],
  light: (h, s, l) => [h, s * 0.85, l + (1 - l) * 0.35],
  lighter: (h, s, l) => [h, s * 0.85, l + (1 - l) * 0.32],
  pale: (h, s, l) => [h, s * 0.45, l + (1 - l) * 0.45],
  paler: (h, s, l) => [h, s * 0.55, l + (1 - l) * 0.3],
  soft: (h, s, l) => [h, s * 0.6, l + (1 - l) * 0.2],
  softer: (h, s, l) => [h, s * 0.6, l + (1 - l) * 0.15],
  pastel: (h, s, l) => [h, s * 0.45, Math.max(l, 0.78)],
  bright: (h, s, l) => [h, Math.min(1, s * 1.35), Math.min(0.9, l * 1.15)],
  brighter: (h, s, l) => [h, Math.min(1, s * 1.3), Math.min(0.9, l * 1.18)],
  vivid: (h, s, l) => [h, 1, l],
  richer: (h, s, l) => [h, Math.min(1, s * 1.3), l],
  electric: (h, s, l) => [h, 1, Math.max(l, 0.55)],
  neon: (h, s, l) => [h, 1, Math.max(l, 0.58)],
  dusty: (h, s, l) => [h, s * 0.4, l],
  muted: (h, s, l) => [h, s * 0.5, l],
  duller: (h, s, l) => [h, s * 0.5, l * 0.95],
  burnt: (h, s, l) => [h, s * 0.85, l * 0.65],
  hot: (h, s, l) => [h, Math.min(1, s * 1.3), l],
  warm: (h, s, l) => [h, Math.min(1, s * 1.1), l],
  warmer: (h, s, l) => [(h + 0.97) % 1, Math.min(1, s * 1.1), l],
  cooler: (h, s, l) => [(h + 0.03) % 1, s, l],
};

const EVERYTHING = new Set(['everything', 'world', 'all', 'everywhere', 'universe']);
const RAINBOW = new Set(['rainbow', 'rainbows']);
const THIS_WORDS = new Set(['this', 'that']);

// intent patterns, tested against the normalized utterance
const RE_GENESIS = /let there be colou?r/;
const RE_RESET = /\b(begin|start) (again|anew|over)\b|\bunmake the world\b|\bundo (it all|everything)\b|\btake it all back\b|\berase the world\b/;
const RE_NIGHT = /let there be night|night ?fall\b|make it night|nighttime|^night$|bring (the )?night|let the night come/;
const RE_DAY = /let there be (light|day|dawn|morning)|make it (day|light|morning)|day ?break\b|^sunrise$|^day$|^morning$|bring back the (sun|day|light)/;
const RE_RAIN = /let it rain|make it rain|^rain$|bring (the )?rain|\brainfall\b|let the rain|start the rain/;
const RE_SNOW = /let it snow|make it snow|bring (the )?snow|\bsnowfall\b|let the snow|start the snow/;
const RE_CLEAR = /stop the (rain|snow)|no more (rain|snow)|clear (the )?sk(y|ies)|make it clear|stop (raining|snowing)/;

let world = null;
let hooks = {};
let synIndex = new Map();
let fuzzyWords = null;
let stopWords = null;
const batches = [];
const singles = [];
const tweens = [];
const rings = [];
const tmpA = new THREE.Color(), tmpB = new THREE.Color();

// ordered log of every standing decree, for persistence
const log = { entries: [], night: false, weather: 'clear' };
let hydrating = false;

export function bindDecrees(w, h) {
  world = w;
  hooks = h;
  synIndex = new Map();
  for (const cat of world.categories.values()) {
    for (const s of cat.synonyms) synIndex.set(s, cat.key);
  }
  // snapshot the monochrome world so it can be unmade back to gray
  for (const cat of world.categories.values()) {
    for (const surf of cat.surfaces) {
      if (surf.type === 'tint') surf.initial = surf.current.clone();
      else {
        const attr = surf.type === 'inst'
          ? surf.mesh.instanceColor : surf.mesh.geometry.attributes.color;
        surf.initial = attr.array.slice();
      }
    }
  }
  fuzzyWords = Object.keys(EXTRA_COLORS).filter((k) => !k.includes(' '))
    .concat(Object.keys(THREE.Color.NAMES));
  stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'be', 'let', 'make', 'it', 'its', 'my',
    'of', 'to', 'and', 'in', 'on', 'with', 'turn', 'paint', 'shall', 'was',
    'were', 'like', 'as', 'so', 'now', 'please', 'into', 'become', 'becomes',
    'them', 'they', 'their', 'there', 'one', 'only', 'alone', 'color',
    'colour', 'rain', 'snow', 'night', 'day', 'light', 'morning', 'clear',
    'stop', 'bring', 'start', 'again', 'more',
    ...EVERYTHING, ...RAINBOW, ...THIS_WORDS,
    ...Object.keys(MODIFIERS), ...synIndex.keys(),
  ]);
}

// ------------------------------------------------------------------ parsing

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectModifiers(tokens, i) {
  const mods = [];
  let j = i - 1;
  while (j >= 0 && MODIFIERS[tokens[j]]) {
    mods.unshift(tokens[j]);
    j--;
  }
  return mods;
}

function applyModifiers(color, mods) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  for (const m of mods) {
    const [h2, s2, l2] = MODIFIERS[m](hsl.h, hsl.s, hsl.l);
    hsl.h = h2; hsl.s = s2; hsl.l = l2;
  }
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return color;
}

function findColor(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (RAINBOW.has(tokens[i])) {
      return { rainbow: true, name: 'every color at once' };
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
        const mods = collectModifiers(tokens, i);
        const color = applyModifiers(new THREE.Color(hex), mods);
        return { color, name: [...mods, spaced].join(' ') };
      }
    }
  }
  return null;
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// forgiving ears: "emrald" -> emerald
function findColorFuzzy(tokens) {
  let best = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.length < 4 || stopWords.has(t)) continue;
    for (const w of fuzzyWords) {
      const d = levenshtein(t, w);
      const limit = t.length >= 6 ? 2 : 1;
      if (d > 0 && d <= limit && (!best || d < best.d)) best = { w, d, i };
    }
  }
  if (!best) return null;
  const hex = EXTRA_COLORS[best.w] || best.w;
  const mods = collectModifiers(tokens, best.i);
  return { color: applyModifiers(new THREE.Color(hex), mods),
    name: [...mods, best.w].join(' ') };
}

// "the color of the river" -> that category's current color
function findColorOf(norm) {
  const m = norm.match(/colou?r of (?:the )?([a-z]+)/);
  if (!m) return null;
  const key = synIndex.get(m[1]);
  if (!key) return null;
  const cat = world.categories.get(key);
  if (!cat.colored) return { empty: cat };
  return { color: cat.currentColor.clone(), name: `the color of ${cat.label}` };
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

function captionHex(color) {
  const hsl = { h: 0, s: 0, l: 0 };
  tmpA.copy(color).getHSL(hsl);
  tmpA.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.62));
  return '#' + tmpA.getHexString();
}

// ------------------------------------------------------------------ speaking

// gaze: { key, point, surfIndex, instanceId } — whatever the crosshair holds
export function speak(text, gaze, playerPos, now) {
  if (!world) return;
  const norm = normalize(text);
  if (!norm) return;
  const tokens = norm.split(' ');

  // ---- world-verbs first
  if (RE_RESET.test(norm)) { resetWorld(playerPos, now); return; }
  if (RE_GENESIS.test(norm)) { genesis(playerPos, now); return; }
  if (RE_NIGHT.test(norm)) {
    setNight(true);
    hooks.caption('…and night fell upon the valley.', null, '');
    return;
  }
  if (RE_DAY.test(norm)) {
    setNight(false);
    hooks.caption('…and morning came again.', null, '');
    return;
  }
  if (RE_CLEAR.test(norm)) {
    setWeather('clear');
    hooks.caption('…and the skies cleared.', null, '');
    return;
  }
  if (RE_RAIN.test(norm)) {
    setWeather('rain');
    hooks.caption('…and the rain came down.', null, '');
    return;
  }
  if (RE_SNOW.test(norm) || (norm === 'snow' && !gaze?.key)) {
    setWeather('snow');
    hooks.caption('…and snow began to fall.', null, '');
    return;
  }

  // ---- otherwise it's a color decree
  let catKey = findCategory(tokens);
  let colorSpec = findColor(tokens);
  if (!colorSpec) {
    const cOf = findColorOf(norm);
    if (cOf?.empty) {
      hooks.caption(`${cOf.empty.label} has no color to give…`, null, 'hint');
      return;
    }
    colorSpec = cOf || findColorFuzzy(tokens);
  }
  if (!colorSpec) {
    // modifier-only decree: "make the trees darker"
    const mods = tokens.filter((t) => MODIFIERS[t]);
    const targetKey = (catKey && catKey !== '*') ? catKey : gaze?.key;
    if (mods.length && targetKey) {
      const cat = world.categories.get(targetKey);
      colorSpec = {
        color: applyModifiers(cat.currentColor.clone(), mods),
        name: mods.join(' ') + (cat.currentName ? ' ' + cat.currentName : ''),
      };
      if (!catKey) catKey = targetKey;
    }
  }

  const genesisish = !colorSpec && catKey === '*' && /\bcolou?r\b/.test(norm);
  if (genesisish) { genesis(playerPos, now); return; }

  if (!colorSpec) {
    if (catKey && catKey !== '*') {
      const cat = world.categories.get(catKey);
      hooks.caption(`name a hue for ${cat.label}…`, null, 'hint');
    } else {
      hooks.caption(FAIL_LINES[failIdx++ % FAIL_LINES.length], null, 'hint');
    }
    return;
  }

  // ---- "this one alone"
  const thisMode = tokens.some((t) => THIS_WORDS.has(t))
    && gaze?.key && (!catKey || catKey === gaze.key);
  if (thisMode && enactSingle(gaze, colorSpec, now)) return;

  if (!catKey) {
    if (gaze?.key) catKey = gaze.key;
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
    hooks.caption(`…and all the world was <em>${colorSpec.name}</em>.`,
      colorSpec.rainbow ? null : captionHex(colorSpec.color),
      colorSpec.rainbow ? 'rainbow' : '');
    hooks.onIntent?.('everything');
    return;
  }

  const cat = world.categories.get(catKey);
  const origin = (gaze?.key === catKey && gaze.point) ? gaze.point : playerPos;
  enact(cat, colorSpec, origin, now, 0, false);
  hooks.caption(`…${cat.phrase} <em>${colorSpec.name}</em>.`,
    colorSpec.rainbow ? null : captionHex(colorSpec.color),
    colorSpec.rainbow ? 'rainbow' : '');
}

// ------------------------------------------------------------------ intents

function setNight(on) {
  world.setNight(on);
  log.night = on;
  hooks.onIntent?.(on ? 'night' : 'day');
  persist();
}

function setWeather(kind) {
  world.setWeather(kind);
  log.weather = kind;
  hooks.onIntent?.(kind);
  persist();
}

function genesis(playerPos, now) {
  let i = 0;
  for (const cat of world.categories.values()) {
    enact(cat, { color: new THREE.Color(cat.defaultColor), name: null },
      playerPos, now, i * 0.42, true);
    i++;
  }
  hooks.caption('…and there was <em>color</em>.', '#ffffff', 'genesis');
  hooks.onIntent?.('genesis');
}

function resetWorld(playerPos, now) {
  for (const cat of world.categories.values()) {
    cat.surfaces.forEach((surf, si) => {
      if (surf.type === 'tint') {
        const delay = surf.pos
          ? Math.hypot(surf.pos.x - playerPos.x, surf.pos.z - playerPos.z) / RIPPLE_SPEED
          : 0;
        tweens.push({ from: surf.current.clone(), to: surf.initial.clone(),
          apply: surf.apply, start: now + delay, dur: TWEEN_DUR });
      } else {
        const attr = surf.type === 'inst'
          ? surf.mesh.instanceColor : surf.mesh.geometry.attributes.color;
        const count = surf.type === 'inst' ? surf.mesh.count : surf.positions.count;
        const delays = new Float32Array(count);
        let maxDelay = 0;
        for (let i = 0; i < count; i++) {
          const x = surf.type === 'inst' ? surf.positions[i].x : surf.positions.getX(i);
          const z = surf.type === 'inst' ? surf.positions[i].z : surf.positions.getZ(i);
          const d = Math.hypot(x - playerPos.x, z - playerPos.z) / RIPPLE_SPEED;
          delays[i] = d;
          if (d > maxDelay) maxDelay = d;
        }
        batches.push({ attr, arr: attr.array, idx: null,
          from: attr.array.slice(), to: surf.initial.slice(),
          delays, start: now, maxDelay, count });
      }
    });
    cat.colored = false;
    cat.currentName = null;
    cat.rainbow = false;
    cat.currentColor.setScalar(cat.grayLevel ?? 0.6);
    cat.onReset?.();
  }
  world.resetLife();
  spawnRing(playerPos, null, now);
  log.entries = [];
  log.night = false;
  log.weather = 'clear';
  hooks.caption('…and the world was without color once more.', null, '');
  hooks.onIntent?.('reset');
  persist();
}

// ------------------------------------------------------------- enacting color

function rainbowColor(out, x, z, ox, oz) {
  const d = Math.hypot(x - ox, z - oz);
  const hue = (d * 0.011 + Math.atan2(z - oz, x - ox) / (Math.PI * 2) * 0.25) % 1;
  return out.setHSL((hue + 1) % 1, 0.85, 0.58);
}

function enact(cat, colorSpec, origin, now, extraDelay, muted, instant = false) {
  const isNew = !cat.colored;
  cat.colored = true;
  cat.currentName = colorSpec.name;
  cat.rainbow = !!colorSpec.rainbow;
  if (isNew && cat.onFirstColor) cat.onFirstColor();

  const base = colorSpec.color || new THREE.Color(cat.defaultColor);
  if (!colorSpec.rainbow) cat.currentColor.copy(base);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const dur = instant ? 0.12 : BATCH_DUR;

  for (const surf of cat.surfaces) {
    if (surf.type === 'inst' || surf.type === 'vertex') {
      const isInst = surf.type === 'inst';
      const attr = isInst ? surf.mesh.instanceColor : surf.mesh.geometry.attributes.color;
      const arr = attr.array;
      const count = isInst ? surf.mesh.count : surf.positions.count;
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
        const d = instant ? 0
          : extraDelay + Math.hypot(x - origin.x, z - origin.z) / RIPPLE_SPEED;
        delays[i] = d;
        if (d > maxDelay) maxDelay = d;
      }
      batches.push({ attr, arr, idx: null, from: arr.slice(), to,
        delays, start: now, maxDelay, count, dur });
    } else if (surf.type === 'tint') {
      const delay = instant ? 0 : extraDelay + (surf.pos
        ? Math.hypot(surf.pos.x - origin.x, surf.pos.z - origin.z) / RIPPLE_SPEED
        : 0);
      const to = new THREE.Color();
      if (colorSpec.rainbow) {
        const p = surf.pos || origin;
        rainbowColor(to, p.x, p.z, origin.x, origin.z);
      } else {
        to.copy(base);
      }
      tweens.push({ from: surf.current.clone(), to, apply: surf.apply,
        start: now + delay, dur: instant ? 0.12 : TWEEN_DUR });
    }
  }

  if (!instant) spawnRing(origin, colorSpec.rainbow ? null : base, now + extraDelay);

  if (!hydrating) {
    log.entries = log.entries.filter((e) => !(e.t === 'cat' && e.key === cat.key));
    log.entries.push({
      t: 'cat', key: cat.key, rainbow: !!colorSpec.rainbow,
      hex: colorSpec.rainbow ? null : '#' + base.getHexString(),
      name: colorSpec.name,
    });
    persist();
  }

  let coloredCount = 0, total = 0;
  for (const c of world.categories.values()) {
    if (!c.countTotal) continue;
    total++;
    if (c.colored) coloredCount++;
  }
  hooks.onDecree?.({
    catKey: cat.key, isNew, coloredCount, total, muted,
    base: colorSpec.rainbow ? null : base, rainbow: !!colorSpec.rainbow,
    origin, now, single: false,
  });
}

// color just the thing under the crosshair; returns false if it can't
function enactSingle(gaze, colorSpec, now, instant = false) {
  const cat = world.categories.get(gaze.key);
  if (!cat || colorSpec.rainbow) return false;
  const base = colorSpec.color;

  // a patch of the land around the gaze point
  if (gaze.key === 'land' && gaze.point) {
    paintPatch(gaze.point, base, colorSpec.name, now, instant);
    return true;
  }

  if (gaze.surfIndex === undefined || gaze.surfIndex === null) return false;
  const surf = cat.surfaces[gaze.surfIndex];
  if (!surf) return false;

  if (surf.type === 'inst' && gaze.instanceId !== undefined && gaze.instanceId !== null) {
    const attr = surf.mesh.instanceColor;
    const k = gaze.instanceId * 3;
    singles.push({ attr, k, from: [attr.array[k], attr.array[k + 1], attr.array[k + 2]],
      to: [base.r, base.g, base.b], start: now, dur: instant ? 0.12 : 0.8 });
  } else if (surf.type === 'tint') {
    tweens.push({ from: surf.current.clone(), to: base.clone(), apply: surf.apply,
      start: now, dur: instant ? 0.12 : 0.9 });
  } else {
    return false;
  }

  if (!instant && gaze.point) spawnRing(gaze.point, base, now, 7, 1.1);
  if (!hydrating) {
    log.entries.push({ t: 'one', key: gaze.key, surf: gaze.surfIndex,
      idx: gaze.instanceId ?? null, hex: '#' + base.getHexString(), name: colorSpec.name });
    if (log.entries.length > 400) log.entries.shift();
    persist();
  }
  const noun = cat.singular || cat.label.replace(/^the /, '');
  hooks.caption(`…and this ${noun} alone was <em>${colorSpec.name}</em>.`,
    captionHex(base), '');
  hooks.onDecree?.({ catKey: cat.key, isNew: false, muted: false, base,
    rainbow: false, origin: gaze.point, now, single: true });
  return true;
}

function paintPatch(point, color, name, now, instant, radius = 9) {
  const cat = world.categories.get('land');
  const surf = cat.surfaces[0]; // the terrain vertex surface
  const attr = surf.mesh.geometry.attributes.color;
  const arr = attr.array;
  const idx = [];
  const pos = surf.positions;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - point.x, dz = pos.getZ(i) - point.z;
    if (dx * dx + dz * dz < radius * radius) idx.push(i);
  }
  if (!idx.length) return;
  const n = idx.length;
  const from = new Float32Array(n * 3), to = new Float32Array(n * 3);
  const delays = new Float32Array(n);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  let maxDelay = 0;
  for (let j = 0; j < n; j++) {
    const i = idx[j], k = i * 3;
    from[j * 3] = arr[k]; from[j * 3 + 1] = arr[k + 1]; from[j * 3 + 2] = arr[k + 2];
    const d = Math.hypot(pos.getX(i) - point.x, pos.getZ(i) - point.z);
    const blend = 1 - Math.pow(Math.min(d / radius, 1), 3);
    const jr = surf.jitterSeed[i];
    tmpA.setHSL((hsl.h + (jr - 0.5) * 0.04 + 1) % 1, hsl.s,
      Math.min(0.95, Math.max(0.04, hsl.l + (jr - 0.5) * 0.1)));
    tmpA.multiplyScalar(surf.shade[i]);
    tmpB.setRGB(arr[k], arr[k + 1], arr[k + 2]).lerp(tmpA, blend);
    to[j * 3] = tmpB.r; to[j * 3 + 1] = tmpB.g; to[j * 3 + 2] = tmpB.b;
    delays[j] = instant ? 0 : d / 20;
    if (delays[j] > maxDelay) maxDelay = delays[j];
  }
  batches.push({ attr, arr, idx, from, to, delays, start: now, maxDelay,
    count: n, dur: instant ? 0.12 : 0.7 });
  if (!instant) spawnRing(point, color, now, radius + 2, 1.1);
  if (!hydrating) {
    log.entries.push({ t: 'patch', x: +point.x.toFixed(1), z: +point.z.toFixed(1),
      hex: '#' + color.getHexString(), name });
    if (log.entries.length > 400) log.entries.shift();
    persist();
  }
  hooks.caption(`…and this patch of earth alone was <em>${name}</em>.`,
    captionHex(color), '');
  hooks.onDecree?.({ catKey: 'land', isNew: false, muted: false, base: color,
    rainbow: false, origin: point, now, single: true });
}

// ----------------------------------------------------------------- persistence

function persist() {
  if (hydrating) return;
  hooks.onStateChange?.({ v: 2, entries: log.entries,
    night: log.night, weather: log.weather });
}

export function hydrate(saved, playerPos, now) {
  if (!saved || saved.v !== 2 || !world) return false;
  hydrating = true;
  try {
    for (const e of saved.entries || []) {
      const cat = world.categories.get(e.key);
      if (!cat) continue;
      if (e.t === 'cat') {
        const spec = e.rainbow
          ? { rainbow: true, name: e.name }
          : { color: new THREE.Color(e.hex), name: e.name };
        enact(cat, spec, playerPos, now, 0, true, true);
      } else if (e.t === 'one') {
        enactSingle({ key: e.key, surfIndex: e.surf, instanceId: e.idx, point: null },
          { color: new THREE.Color(e.hex), name: e.name }, now, true);
      } else if (e.t === 'patch') {
        paintPatch(new THREE.Vector3(e.x, 0, e.z), new THREE.Color(e.hex),
          e.name, now, true);
      }
      // settle each replayed decree before the next one snapshots colors
      tickDecrees(now + 0.15);
    }
    log.entries = (saved.entries || []).slice();
    log.night = !!saved.night;
    log.weather = saved.weather || 'clear';
    if (log.night) world.forceNight(true);
    world.setWeather(log.weather);
    return (saved.entries || []).length > 0 || log.night || log.weather !== 'clear';
  } finally {
    hydrating = false;
  }
}

export function getWorldState() {
  return { night: log.night, weather: log.weather };
}

// --------------------------------------------------------------- ripple rings

const ringGeo = new THREE.RingGeometry(0.955, 1, 72);
ringGeo.rotateX(-Math.PI / 2);

function spawnRing(origin, color, startTime, maxR = 100, dur = 2.4) {
  const mat = new THREE.MeshBasicMaterial({
    color: color ? tmpB.copy(color).lerp(new THREE.Color('#ffffff'), 0.35).clone() : '#ffffff',
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(ringGeo, mat);
  mesh.position.set(origin.x, origin.y + 0.5, origin.z);
  mesh.visible = false;
  world.scene.add(mesh);
  rings.push({ mesh, mat, start: startTime, dur, maxR });
}

// -------------------------------------------------------------------- ticking

const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Loops iterate forward with in-place removal so that same-frame decrees
// apply in the order they were spoken (hydration replays them all at once).
export function tickDecrees(now) {
  for (let bi = 0; bi < batches.length;) {
    const b = batches[bi];
    const dur = b.dur || BATCH_DUR;
    let allDone = true;
    for (let i = 0; i < b.count; i++) {
      const t = (now - b.start - b.delays[i]) / dur;
      if (t <= 0) { allDone = false; continue; }
      const k = (b.idx ? b.idx[i] : i) * 3;
      const j = i * 3;
      if (t >= 1) {
        b.arr[k] = b.to[j]; b.arr[k + 1] = b.to[j + 1]; b.arr[k + 2] = b.to[j + 2];
        continue;
      }
      allDone = false;
      const e = easeOut(t);
      const pulse = Math.sin(Math.PI * t) * 0.28;
      b.arr[k] = b.from[j] + (b.to[j] - b.from[j]) * e + pulse;
      b.arr[k + 1] = b.from[j + 1] + (b.to[j + 1] - b.from[j + 1]) * e + pulse;
      b.arr[k + 2] = b.from[j + 2] + (b.to[j + 2] - b.from[j + 2]) * e + pulse;
    }
    b.attr.needsUpdate = true;
    if (allDone) batches.splice(bi, 1); else bi++;
  }

  for (let si = 0; si < singles.length;) {
    const s = singles[si];
    const t = (now - s.start) / s.dur;
    if (t <= 0) { si++; continue; }
    const e = t >= 1 ? 1 : easeOut(t);
    const pulse = t >= 1 ? 0 : Math.sin(Math.PI * t) * 0.3;
    for (let c = 0; c < 3; c++) {
      s.attr.array[s.k + c] = s.from[c] + (s.to[c] - s.from[c]) * e + pulse;
    }
    s.attr.needsUpdate = true;
    if (t >= 1) singles.splice(si, 1); else si++;
  }

  for (let ti = 0; ti < tweens.length;) {
    const tw = tweens[ti];
    const t = (now - tw.start) / tw.dur;
    if (t <= 0) { ti++; continue; }
    if (t >= 1) {
      tw.apply(tmpA.copy(tw.to));
      tweens.splice(ti, 1);
      continue;
    }
    const e = easeOut(t);
    tmpA.copy(tw.from).lerp(tw.to, e);
    const pulse = Math.sin(Math.PI * t) * 0.18;
    tmpA.r += pulse; tmpA.g += pulse; tmpA.b += pulse;
    tw.apply(tmpA);
    ti++;
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
    const radius = 2 + easeOut(t) * r.maxR;
    r.mesh.scale.set(radius, 1, radius);
    r.mat.opacity = 0.65 * (1 - t);
  }
}
