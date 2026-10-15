// Ambient backdrop, drawn in Canvas2D so it renders everywhere (no WebGL
// dependency). A slowly rotating wireframe globe with a glowing Washington–
// Beijing great-circle arc, pulsing delegation nodes, and drifting dust.
// Purely decorative; game.js calls this in a try/catch.

const DEG = Math.PI / 180;

export function initBackdrop(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1;
  let cx = 0, cy = 0, R = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // globe sits a touch right of and below centre, large enough to peek
    // around the UI cards on every side
    R = Math.max(260, Math.min(W, H) * 0.46);
    cx = W * 0.62;
    cy = H * 0.52;
  }
  resize();
  window.addEventListener('resize', resize);

  const TILT = 0.42;
  // rotate a sphere point (lat, lon, phase) into screen space
  function project(lat, lon, phase, rad = 1) {
    const a = lat * DEG, b = lon * DEG + phase;
    const x0 = Math.cos(a) * Math.sin(b);
    const y0 = Math.sin(a);
    const z0 = Math.cos(a) * Math.cos(b);
    const y = y0 * Math.cos(TILT) - z0 * Math.sin(TILT);
    const z = y0 * Math.sin(TILT) + z0 * Math.cos(TILT);
    return { x: cx + R * rad * x0, y: cy - R * rad * y, z };
  }

  function strokePolyline(pts, frontColor, backColor) {
    let drawing = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const col = p.z >= 0 ? frontColor : backColor;
      if (i === 0 || pts[i - 1]._col !== col) {
        if (drawing) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = col;
        ctx.moveTo(p.x, p.y);
        drawing = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
      p._col = col;
    }
    if (drawing) ctx.stroke();
  }

  // US (Washington) & China (Beijing)
  const US = { lat: 38.9, lon: -77 };
  const CN = { lat: 39.9, lon: 116.4 };

  // drifting dust
  const dust = [];
  for (let i = 0; i < 90; i++) {
    dust.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3, s: Math.random() * 0.4 + 0.1, p: Math.random() });
  }

  let raf = 0, t = 0;
  const spin = reduced ? 0.0009 : 0.0016;

  function frame() {
    t += 1;
    const phase = t * spin;
    ctx.clearRect(0, 0, W, H);

    // ---- soft glow disc behind the globe ----
    const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.5);
    g.addColorStop(0, 'rgba(40,70,120,0.30)');
    g.addColorStop(0.5, 'rgba(30,40,80,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

    // ---- filled globe body (subtle) ----
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    body.addColorStop(0, 'rgba(20,32,58,0.55)');
    body.addColorStop(1, 'rgba(8,12,24,0.65)');
    ctx.fillStyle = body; ctx.fill();

    ctx.lineWidth = 1;

    // ---- parallels (latitude) ----
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 5) pts.push(project(lat, lon, phase));
      strokePolyline(pts, 'rgba(225,215,185,0.16)', 'rgba(225,215,185,0.05)');
    }
    // ---- meridians (longitude) ----
    for (let lon = 0; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 4) pts.push(project(lat, lon, phase));
      strokePolyline(pts, 'rgba(225,215,185,0.16)', 'rgba(225,215,185,0.05)');
    }

    // ---- rim light ----
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225,215,185,0.28)'; ctx.lineWidth = 1.4; ctx.stroke();

    // ---- great-circle arc US <-> CN ----
    const a = project(US.lat, US.lon, phase);
    const b = project(CN.lat, CN.lon, phase);
    const arcPts = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const lift = 1 + 0.30 * Math.sin(Math.PI * f);
      // interpolate in lat/lon (cheap, looks fine at this scale)
      const lat = US.lat + (CN.lat - US.lat) * f;
      const lon = US.lon + (CN.lon - US.lon) * f;
      arcPts.push(project(lat, lon, phase, lift));
    }
    ctx.beginPath();
    ctx.moveTo(arcPts[0].x, arcPts[0].y);
    for (const p of arcPts) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(200,162,60,0.75)';
    ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(200,162,60,0.7)'; ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // pulse traveling along the arc
    const pf = (t % 150) / 150;
    const pp = arcPts[Math.min(steps, Math.floor(pf * steps))];
    ctx.beginPath(); ctx.arc(pp.x, pp.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,231,211,0.95)';
    ctx.shadowColor = 'rgba(239,231,211,0.9)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;

    // ---- delegation nodes ----
    function node(p, color, glow, phaseShift) {
      if (p.z < -0.15) return; // hidden round the back
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + phaseShift);
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 + pulse * 5, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    }
    node(a, 'rgba(120,170,255,1)', 'rgba(70,120,210,0.25)', 0);
    node(b, 'rgba(230,90,95,1)', 'rgba(200,40,46,0.28)', Math.PI);

    // ---- drifting dust ----
    for (const d of dust) {
      d.p += d.s * 0.0016;
      const yy = ((d.y + d.p) % 1) * H;
      ctx.beginPath(); ctx.arc(d.x * W, yy, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,231,211,' + (0.10 + d.r * 0.07) + ')'; ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { cancelAnimationFrame(raf); frame(); }
  });

  return { canvas };
}
