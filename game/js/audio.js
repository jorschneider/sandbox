// Tiny procedural sound for TRACK ONE — synthesized in code, no audio files,
// in the spirit of the parent site's WebAudio score. Everything is wrapped so
// a missing/blocked AudioContext is silently a no-op. Audio is created lazily
// on the first user gesture (the Start button) to satisfy autoplay policy.

let ctx = null;
let master = null;
let enabled = true;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

export function setEnabled(v) { enabled = v; }

function tone(freq, t0, dur, { type = 'triangle', gain = 1, glideTo = null } = {}) {
  if (!ctx || !enabled) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// A short motif reacting to the net direction of a choice's meter swing.
export function blip(net) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  if (net > 1) {            // net gain — rising perfect fifth
    tone(392.0, t, 0.12, { gain: 0.5 });
    tone(587.3, t + 0.09, 0.16, { gain: 0.5 });
  } else if (net < -1) {    // net loss — falling minor second, darker
    tone(415.3, t, 0.14, { gain: 0.5, type: 'sawtooth' });
    tone(392.0, t + 0.10, 0.20, { gain: 0.45, type: 'sawtooth' });
  } else {                  // a wash — single neutral tone
    tone(440.0, t, 0.14, { gain: 0.4 });
  }
}

export function click() {
  if (!ctx || !enabled) return;
  tone(660, ctx.currentTime, 0.05, { gain: 0.25, type: 'square' });
}

// One stinger per ending tier — brighter major for A/B, hollow for C, low for D/F.
const TIER_CHORDS = {
  a: [261.6, 329.6, 392.0, 523.3],   // C major, full
  b: [261.6, 329.6, 392.0],          // C major triad
  c: [261.6, 311.1, 392.0],          // C minor — hollow
  d: [220.0, 277.2, 329.6],          // A minor-ish, lower
  f: [196.0, 233.1, 246.9],          // low, dissonant
};
export function stinger(tier) {
  if (!ctx || !enabled) return;
  const notes = TIER_CHORDS[tier] || TIER_CHORDS.c;
  const t = ctx.currentTime + 0.02;
  notes.forEach((f, i) => tone(f, t + i * 0.05, 1.2, { gain: 0.4, type: 'triangle' }));
}
