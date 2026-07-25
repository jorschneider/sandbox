// Seeded 2D gradient noise + fBm. Deterministic so terrain height can be
// re-sampled analytically (player walking) and must match the mesh exactly.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
];

export function makeNoise(seed = 1337) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const src = new Uint8Array(256);
  for (let i = 0; i < 256; i++) src[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = src[i]; src[i] = src[j]; src[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = src[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  function noise(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    const xf = x - X, yf = y - Y;
    const xi = X & 255, yi = Y & 255;
    const g00 = GRAD[perm[perm[xi] + yi] & 7];
    const g10 = GRAD[perm[perm[xi + 1] + yi] & 7];
    const g01 = GRAD[perm[perm[xi] + yi + 1] & 7];
    const g11 = GRAD[perm[perm[xi + 1] + yi + 1] & 7];
    const d00 = g00[0] * xf + g00[1] * yf;
    const d10 = g10[0] * (xf - 1) + g10[1] * yf;
    const d01 = g01[0] * xf + g01[1] * (yf - 1);
    const d11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);
    const u = fade(xf), v = fade(yf);
    const a = d00 + u * (d10 - d00);
    const b = d01 + u * (d11 - d01);
    return (a + v * (b - a)) * 1.9; // roughly [-1, 1]
  }

  function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise, fbm, rand };
}
