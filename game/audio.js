// ============================================================
//  BROKER BATTLE — tiny WebAudio sound engine (no asset files).
//  All sounds are synthesized. Lazily inits on first user
//  gesture so autoplay policies stay happy.
// ============================================================

let ctx = null;
let muted = false;
let master = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

export function resume() { const c = ensure(); if (c && c.state === "suspended") c.resume(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export function isMuted() { return muted; }
export function toggleMuted() { setMuted(!muted); return muted; }

// one oscillator beep
function tone(freq, start, dur, type = "sine", gain = 0.25, slideTo = null) {
  const c = ensure(); if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// noise burst (for buzzers / impacts)
function noise(start, dur, gain = 0.2, hp = 300) {
  const c = ensure(); if (!c || muted) return;
  const t0 = c.currentTime + start;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource(); src.buffer = buf;
  const filter = c.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = hp;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  tap()      { tone(420, 0, 0.07, "triangle", 0.16); },
  select()   { tone(560, 0, 0.08, "triangle", 0.18); tone(720, 0.04, 0.08, "triangle", 0.12); },
  correct()  { tone(523, 0, 0.12, "triangle", 0.22); tone(659, 0.09, 0.12, "triangle", 0.22); tone(784, 0.18, 0.18, "triangle", 0.24); },
  wrong()    { noise(0, 0.18, 0.18, 200); tone(196, 0, 0.22, "sawtooth", 0.18, 110); },
  steal()    { tone(660, 0, 0.08, "square", 0.18, 990); tone(990, 0.08, 0.12, "square", 0.18, 1320); },
  tick()     { tone(880, 0, 0.03, "square", 0.06); },
  urgent()   { tone(1100, 0, 0.05, "square", 0.12); },
  damage()   { noise(0, 0.22, 0.22, 120); tone(140, 0, 0.25, "sawtooth", 0.2, 80); },
  heal()     { tone(523, 0, 0.1, "sine", 0.16); tone(784, 0.08, 0.16, "sine", 0.18); },
  boss()     { tone(110, 0, 0.5, "sawtooth", 0.22, 70); tone(146, 0.12, 0.5, "sawtooth", 0.16, 90); },
  whoosh()   { noise(0, 0.18, 0.1, 600); },
  countdown(){ tone(440, 0, 0.12, "square", 0.16); },
  go()       { tone(880, 0, 0.18, "square", 0.2); },
  victory()  {
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => tone(f, i * 0.12, 0.2, "triangle", 0.22));
  },
  defeat()   { tone(330, 0, 0.3, "sawtooth", 0.18, 220); tone(220, 0.18, 0.5, "sawtooth", 0.18, 110); },
};
