// Generative ambience, all synthesized — no audio files.
// A colorless world is thin wind; every decreed category adds a pentatonic
// pad voice. Trees unlock birdsong (crickets after dark), water unlocks
// river babble, rain brings its own patter.

const SEMIS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const BASE_FREQ = 110; // A2

export function createAmbience() {
  let ctx = null;
  let master, padBus, padLp;
  let windGain = null, rainGain = null, babbleGain = null;
  const voices = new Map();
  let chirpsOn = false, babbleOn = false, night = false;
  let nextChirp = 0;
  let started = false;

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseLayer(filterType, freq, q, gain0) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2.7);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain0;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    return { filter: f, gain: g };
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
    padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass'; padLp.frequency.value = 1400;
    padBus.connect(padLp);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    padLp.connect(master);
    padLp.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);

    // wind: filtered noise, slowly wandering
    const wind = noiseLayer('bandpass', 620, 0.7, 0.12);
    windGain = wind.gain;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 240;
    lfo.connect(lfoAmp); lfoAmp.connect(wind.filter.frequency);
    lfo.start();

    // rain patter, silent until the weather turns
    rainGain = noiseLayer('bandpass', 2400, 0.5, 0).gain;
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

  function chime(noteIdx, delaySec = 0, high = false) {
    if (!started) return;
    const t = ctx.currentTime + delaySec;
    const f = BASE_FREQ * (high ? 4 : 2) * Math.pow(2, SEMIS[noteIdx % SEMIS.length] / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(high ? 0.09 : 0.14, t + 0.02);
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

  function birdChirp() {
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

  function cricketTrill() {
    const t = ctx.currentTime;
    const pulses = 5 + (Math.random() * 5) | 0;
    const f0 = 3800 + Math.random() * 600;
    for (let p = 0; p < pulses; p++) {
      const st = t + p * 0.055;
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f0;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.016, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.045);
      o.connect(g); g.connect(master);
      o.start(st); o.stop(st + 0.06);
    }
  }

  function addBabble() {
    const layer = noiseLayer('bandpass', 950, 2.2, 0);
    babbleGain = layer.gain;
    babbleGain.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.3;
    const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.012;
    lfo.connect(lfoAmp); lfoAmp.connect(babbleGain.gain);
    lfo.start();
  }

  return {
    start,
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
    singleChime(catIndex) {
      if (started) chime(catIndex, 0, true);
    },
    genesisChimes(count) {
      if (!started) return;
      for (let i = 0; i < count; i++) chime(i, i * 0.42);
    },
    // rebuild the soundscape for a remembered world
    restore(coloredKeys, allKeys, coloredCount, total) {
      if (!started) return;
      for (const key of coloredKeys) {
        addVoice(key, allKeys.indexOf(key));
        if (key === 'trees' || key === 'birds') chirpsOn = true;
        if (key === 'water' && !babbleOn) { babbleOn = true; addBabble(); }
      }
      if (coloredCount) {
        windGain.gain.linearRampToValueAtTime(
          0.12 * (1 - 0.55 * (coloredCount / total)), ctx.currentTime + 2);
      }
    },
    setNight(on) {
      night = on;
      if (!started) return;
      // pads sink lower and darker after dark
      padLp.frequency.linearRampToValueAtTime(on ? 900 : 1400, ctx.currentTime + 4);
    },
    setWeather(kind) {
      if (!started) return;
      rainGain.gain.linearRampToValueAtTime(
        kind === 'rain' ? 0.05 : 0, ctx.currentTime + 2.5);
      windGain.gain.linearRampToValueAtTime(
        kind === 'snow' ? 0.16 : windGain.gain.value > 0.12 ? 0.12 : windGain.gain.value,
        ctx.currentTime + 2.5);
    },
    reset() {
      if (!started) return;
      for (const v of voices.values()) {
        v.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        v.o1.stop(ctx.currentTime + 2.2);
        v.o2.stop(ctx.currentTime + 2.2);
      }
      voices.clear();
      chirpsOn = false;
      night = false;
      windGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
      if (babbleGain) babbleGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      babbleOn = false;
      rainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      padLp.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 2);
    },
    update(nowSec) {
      if (!started || !chirpsOn) return;
      if (nowSec > nextChirp) {
        if (night) cricketTrill(); else birdChirp();
        nextChirp = nowSec + (night ? 2.5 + Math.random() * 4 : 3.5 + Math.random() * 7);
      }
    },
  };
}
