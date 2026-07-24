// ============================================================
//  BROKER BATTLE — visual juice: confetti, floating text,
//  screen shake, haptics. Pure canvas/DOM, no deps.
// ============================================================

let canvas, cctx, particles = [], raf = null;

function initCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "9999",
  });
  document.body.appendChild(canvas);
  cctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}
function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  cctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.vy += p.g;
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.99; p.rot += p.vr; p.life--;
    const alpha = Math.min(1, p.life / 24);
    cctx.save();
    cctx.globalAlpha = alpha;
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.fillStyle = p.color;
    if (p.shape === "rect") cctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
    else { cctx.beginPath(); cctx.arc(0, 0, p.s / 2, 0, 7); cctx.fill(); }
    cctx.restore();
  }
  if (particles.length) raf = requestAnimationFrame(loop);
  else { raf = null; }
}

const PALETTES = {
  win:  ["#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#34d399", "#f472b6"],
  p1:   ["#38bdf8", "#7dd3fc", "#0ea5e9", "#bae6fd"],
  p2:   ["#fb7185", "#fda4af", "#f43f5e", "#fecdd3"],
  gold: ["#fbbf24", "#fde68a", "#f59e0b", "#fff7cd"],
};

export function confetti(opts = {}) {
  initCanvas();
  const n = opts.count || 90;
  const palette = PALETTES[opts.palette] || PALETTES.win;
  const ox = opts.x != null ? opts.x : innerWidth / 2;
  const oy = opts.y != null ? opts.y : innerHeight / 3;
  const spread = opts.spread || 14;
  for (let i = 0; i < n; i++) {
    const a = (Math.random() - 0.5) * Math.PI * 1.2 - Math.PI / 2;
    const sp = 4 + Math.random() * spread;
    particles.push({
      x: ox, y: oy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: 0.18 + Math.random() * 0.12,
      s: 6 + Math.random() * 8,
      color: palette[(Math.random() * palette.length) | 0],
      rot: Math.random() * 7, vr: (Math.random() - 0.5) * 0.4,
      life: 70 + Math.random() * 40,
      shape: Math.random() > 0.4 ? "rect" : "circ",
    });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

export function burstAt(el, palette = "gold", count = 26) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, palette, count, spread: 9 });
}

// floating "+150" style text at an element
export function floatText(el, text, color = "#fbbf24") {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const d = document.createElement("div");
  d.textContent = text;
  Object.assign(d.style, {
    position: "fixed", left: r.left + r.width / 2 + "px", top: r.top + "px",
    transform: "translate(-50%,0)", color, fontWeight: "900",
    fontSize: "clamp(20px,6vw,30px)", textShadow: "0 2px 10px rgba(0,0,0,.5)",
    pointerEvents: "none", zIndex: "10000", transition: "transform .9s cubic-bezier(.2,.8,.2,1), opacity .9s",
  });
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = "translate(-50%,-70px)"; d.style.opacity = "0"; });
  setTimeout(() => d.remove(), 950);
}

export function shake(el, intensity = "shake") {
  if (!el) return;
  el.classList.remove("shake", "shake-hard");
  void el.offsetWidth;
  el.classList.add(intensity === "hard" ? "shake-hard" : "shake");
  setTimeout(() => el.classList.remove("shake", "shake-hard"), 500);
}

export function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}
