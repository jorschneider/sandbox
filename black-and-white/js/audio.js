// Generative ambience, all synthesized — no audio files.
// A colorless world is thin wind; every decreed category adds a pentatonic
// pad voice, and certain categories unlock birdsong / river babble.

const SEMIS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const BASE_FREQ = 110; // A2

export function createAmbience() {
  let ctx = null;
  let master, padBus, wet;
  let windGain = null;
  const voices = new Map();
  let chirpsOn = false, babbleOn = false;
  let nextChirp = 0;
  let started = false;

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3);
    master.connect(ctx.destination);

    // simple echo space shared by pads + chimes
    padBus = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    padBus.connect(lp);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    wet = ctx.createGain(); wet.gain.value = 0.3;
    lp.connect(master);
    lp.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);

    // wind: filtered noise, slowly wandering
    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer(3);
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 620; bp.Q.value = 0.7;
    windGain = ctx.createGain();
    windGain.gain.value = 0.12;
    wind.connect(bp); bp.connect(windGain); windGain.connect(master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 240;
    lfo.connect(lfoAmp); lfoAmp.connect(bp.frequency);
    wind.start(); lfo.start();
  }

  function addVoice(key, noteIdx) {
    if (!started || voices.has(key)) return;
    const f = BASE_FREQ * Math.pow(2, SEMIS[noteIdx % SEMIS.length] / 12);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.013, ctx.currentTime + 3.5);
    const o1 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = f; o1.detune.value = -4;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = 5;
    const o2g = ctx.createGain(); o2g.gain.value = 0.4;
    o1.connect(g); o2.connect(o2g); o2g.connect(g);
    g.connect(padBus);
    o1.start(); o2.start();
    voices.set(key, { o1, o2, g });
  }

  function chime(noteIdx, delaySec = 0) {
    if (!started) return;
    const t = ctx.currentTime + delaySec;
    const f = BASE_FREQ * 2 * Math.pow(2, SEMIS[noteIdx % SEMIS.length] / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = f * 2.005;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(padBus);
    o.start(t); o2.start(t);
    o.stop(t + 2.6); o2.stop(t + 2.6);
  }

  function chirp() {
    const t = ctx.currentTime;
    const syllables = 2 + (Math.random() * 3) | 0;
    for (let s = 0; s < syllables; s++) {
      const st = t + s * (0.14 + Math.random() * 0.08);
      const f0 = 2200 + Math.random() * 1600;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, st);
      o.frequency.exponentialRampToValueAtTime(f0 * (0.55 + Math.random() * 0.3), st + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.035, st + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.11);
      o.connect(g); g.connect(master);
      o.start(st); o.stop(st + 0.13);
    }
  }

  function addBabble() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.3;
    const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.012;
    lfo.connect(lfoAmp); lfoAmp.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(); lfo.start();
  }

  return {
    start,
    // category got its first color (or was re-colored)
    onDecree(catIndex, isNew, coloredCount, total, catKey, muted) {
      if (!started) return;
      if (!muted) chime(catIndex);
      if (isNew) {
        addVoice(catKey, catIndex);
        windGain.gain.linearRampToValueAtTime(
          0.12 * (1 - 0.55 * (coloredCount / total)), ctx.currentTime + 2);
        if (catKey === 'trees' || catKey === 'birds') chirpsOn = true;
        if (catKey === 'water' && !babbleOn) { babbleOn = true; addBabble(); }
      }
    },
    genesisChimes(count) {
      if (!started) return;
      for (let i = 0; i < count; i++) chime(i, i * 0.42);
    },
    update(nowSec) {
      if (!started || !chirpsOn) return;
      if (nowSec > nextChirp) {
        chirp();
        nextChirp = nowSec + 3.5 + Math.random() * 7;
      }
    },
  };
}
