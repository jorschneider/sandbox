// Bad Faith — tiny WebAudio stingers. No assets; everything is synthesized.
// The context is created/resumed on the first user gesture (ui calls
// prime() from its click handler). Mute persists in localStorage.

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('bf-muted') === '1'; } catch { /* private mode */ }

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('bf-muted', muted ? '1' : '0'); } catch { /* fine */ }
  return muted;
}

export function prime() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, t0, dur, type = 'sine', peak = 0.18, slideTo = null) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function play(name) {
  if (muted) return;
  prime();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.02;
  switch (name) {
    case 'hit':     // the claim lands: low dramatic drop
      tone(170, t, 0.45, 'sawtooth', 0.16, 60);
      tone(85, t, 0.6, 'triangle', 0.22, 42);
      break;
    case 'safe':    // relieved little up-chirp
      tone(523, t, 0.1, 'sine', 0.12);
      tone(784, t + 0.11, 0.22, 'sine', 0.12);
      break;
    case 'fanfare': // crown drop
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, i === 3 ? 0.5 : 0.14, 'triangle', 0.14));
      break;
    case 'tick':    // a deal just closed
      tone(880, t, 0.05, 'square', 0.06);
      tone(1175, t + 0.05, 0.07, 'square', 0.05);
      break;
  }
}
