// Soundscape: a real music bed (audio/theme.mp3, looped) that begins
// muffled in the gray world and opens up, filter-wise, as color arrives.
// Small synthesized diegetic touches remain — decree bells, birdsong by
// day, crickets at night, river babble, rain patter. No pads, no drone.

const SEMIS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const BASE_FREQ = 110; // A2
const MUSIC_URL = 'audio/theme.mp3';

export function createAmbience() {
  let ctx = null;
  let master, bellBus, bellLp;
  let musicEl = null, musicGain = null, musicFilter = null;
  let rainGain = null, babbleGain = null;
  let chirpsOn = false, babbleOn = false, night = false;
  let nextChirp = 0;
  let started = false;
  let progress = 0;

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseLayer(freq, q) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2.7);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    return g;
  }

  // the music mirrors how much of the world has color:
  // gray = distant and muffled, painted = full and present
  function voiceTheWorld() {
    if (!started) return;
    const t = ctx.currentTime;
    const f = 750 + Math.pow(progress, 1.25) * 15500;
    musicFilter.frequency.cancelScheduledValues(t);
    musicFilter.frequency.linearRampToValueAtTime(f, t + 2.5);
    const g = (0.42 + progress * 0.16) * (night ? 0.72 : 1);
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.linearRampToValueAtTime(g, t + 2.5);
  }

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // music bed, streamed and looped
    musicEl = new Audio(MUSIC_URL);
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 750;
    musicFilter.Q.value = 0.4;
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    try {
      const src = ctx.createMediaElementSource(musicEl);
      src.connect(musicFilter);
      musicFilter.connect(musicGain);
      musicGain.connect(master);
      musicEl.play().catch(() => { /* will retry on next user gesture via game click */ });
    } catch { /* element/codec failure — effects still play */ }
    voiceTheWorld();

    // small echo space for the decree bells
    bellBus = ctx.createGain();
    bellLp = ctx.createBiquadFilter();
    bellLp.type = 'lowpass'; bellLp.frequency.value = 1400;
    bellBus.connect(bellLp);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    bellLp.connect(master);
    bellLp.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);

    // rain patter, silent until the weather turns
    rainGain = noiseLayer(2400, 0.5);
  }

  function chime(noteIdx, delaySec = 0, high = false) {
    if (!started) return;
    const t = ctx.currentTime + delaySec;
    const f = BASE_FREQ * (high ? 4 : 2) * Math.pow(2, SEMIS[noteIdx % SEMIS.length] / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(high ? 0.07 : 0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = f * 2.005;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(bellBus);
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
      g.gain.exponentialRampToValueAtTime(0.028, st + 0.015);
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
      g.gain.exponentialRampToValueAtTime(0.013, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.045);
      o.connect(g); g.connect(master);
      o.start(st); o.stop(st + 0.06);
    }
  }

  function addBabble() {
    babbleGain = noiseLayer(950, 2.2);
    babbleGain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.3;
    const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.009;
    lfo.connect(lfoAmp); lfoAmp.connect(babbleGain.gain);
    lfo.start();
  }

  return {
    start,
    onDecree(catIndex, isNew, coloredCount, total, catKey, muted) {
      if (!started) return;
      if (!muted) chime(catIndex);
      if (isNew) {
        progress = coloredCount / total;
        voiceTheWorld();
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
        if (key === 'trees' || key === 'birds') chirpsOn = true;
        if (key === 'water' && !babbleOn) { babbleOn = true; addBabble(); }
      }
      progress = total ? coloredCount / total : 0;
      voiceTheWorld();
    },
    setNight(on) {
      night = on;
      if (!started) return;
      voiceTheWorld();
      bellLp.frequency.linearRampToValueAtTime(on ? 900 : 1400, ctx.currentTime + 4);
    },
    setWeather(kind) {
      if (!started) return;
      rainGain.gain.linearRampToValueAtTime(
        kind === 'rain' ? 0.04 : 0, ctx.currentTime + 2.5);
    },
    reset() {
      if (!started) return;
      progress = 0;
      night = false;
      chirpsOn = false;
      voiceTheWorld();
      if (babbleGain) babbleGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      babbleOn = false;
      rainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      bellLp.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 2);
    },
    update(nowSec) {
      if (!started || !chirpsOn) return;
      if (nowSec > nextChirp) {
        if (night) cricketTrill(); else birdChirp();
        nextChirp = nowSec + (night ? 2.5 + Math.random() * 4 : 3.5 + Math.random() * 7);
      }
    },
    // call from any user gesture: resumes a suspended context / blocked play()
    poke() {
      if (!started) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (musicEl && musicEl.paused) musicEl.play().catch(() => {});
    },
    debug() {
      return {
        started,
        musicPlaying: !!musicEl && !musicEl.paused && !musicEl.error,
        musicTime: musicEl ? musicEl.currentTime : 0,
        musicError: musicEl?.error?.code ?? null,
        filterHz: musicFilter ? musicFilter.frequency.value : 0,
        progress,
      };
    },
  };
}
