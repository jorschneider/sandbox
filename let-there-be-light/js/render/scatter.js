// Placement that composes.
//
// Uniform random scatter is the tell of procedural worlds: confetti at one
// size, evenly spread, no clearings and no focal point. This places things
// the way a landscape painter would — clumped by a density field, spaced by a
// jittered grid so clumps read as groves rather than noise, sized on a
// long-tailed curve so a few hero specimens tower over the crowd, and thinned
// where the ground is steep or wet.

export function makeScatterer({ noise, rand }) {
  // Density field: several octaves of noise thresholded into groves and
  // clearings, so forests have edges and meadows have room to breathe.
  function grove(x, z, scale = 0.012, bias = 0, sharpness = 2.2) {
    const a = noise.fbm(x * scale, z * scale, 3);
    const b = noise.fbm(x * scale * 3.1 + 40, z * scale * 3.1 - 17, 2) * 0.4;
    const v = (a + b + bias + 1) * 0.5;
    return Math.pow(Math.max(0, Math.min(1, v)), sharpness);
  }

  // Jittered grid sampling: even coverage with none of the clumped-by-accident
  // duplicates that pure random gives, then rejected against the density field.
  function scatter({
    count, extent, cell = 9, density, allow, sizeFn, heroChance = 0.05,
    heroScale = 2.4, jitter = 0.85,
  }) {
    const out = [];
    const cells = Math.ceil((extent * 2) / cell);
    const order = [];
    for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) order.push([i, j]);
    // shuffle so an early `count` cutoff doesn't bias toward one corner
    for (let i = order.length - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    for (const [i, j] of order) {
      if (out.length >= count) break;
      const x = -extent + (i + 0.5 + (rand() - 0.5) * jitter) * cell;
      const z = -extent + (j + 0.5 + (rand() - 0.5) * jitter) * cell;
      if (allow && !allow(x, z)) continue;
      const d = density ? density(x, z) : 1;
      if (rand() > d) continue;
      const hero = rand() < heroChance;
      const base = sizeFn ? sizeFn(rand(), x, z) : 0.7 + rand() * 0.6;
      out.push({
        x, z,
        s: hero ? base * heroScale : base,
        hero,
        rot: rand() * Math.PI * 2,
        seed: rand(),
      });
    }
    return out;
  }

  return { grove, scatter };
}

// Slope in world units of rise per unit run, from a height function.
export function slopeAt(heightFn, x, z, e = 1.4) {
  const hx = heightFn(x + e, z) - heightFn(x - e, z);
  const hz = heightFn(x, z + e) - heightFn(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}
