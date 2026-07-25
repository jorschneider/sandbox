// Everything here is synthesized. The void hums; each act of creation adds
// a voice to a slowly gathering chord, and lands with a struck bell.

const SEMIS = [0, 7, 12, 16, 19, 24, 28, 31, 36, 40, 43, 48];

export function createChoir() {
  let ctx = null, master = null, bus = null, lp = null;
  let started = false;
  const voices = new Map();
  let voidHum = null;

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 4);
    master.connect(ctx.destination);

    bus = ctx.createGain();
    lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    bus.connect(lp);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.62;
    const fb = ctx.createGain(); fb.gain.value = 0.5;
    const wet = ctx.createGain(); wet.gain.value = 0.4;
    lp.connect(master);
    lp.connect(delay); delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);

    // the hum of the void: two detuned sub-oscillators, barely there
    voidHum = ctx.createGain();
    voidHum.gain.value = 0.05;
    voidHum.connect(master);
    for (const f of [36.7, 55.0]) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5;
      o.connect(g); g.connect(voidHum);
      o.start();
    }
  }

  function bell(idx, delaySec = 0, gain = 0.12) {
    if (!started) return;
    const t = ctx.currentTime + delaySec;
    const f = 110 * Math.pow(2, SEMIS[idx % SEMIS.length] / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f * 2;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = f * 3.01;
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(bus);
    o.start(t); o2.start(t);
    o.stop(t + 3.4); o2.stop(t + 3.4);
  }

  return {
    start,
    // a new thing exists: add its sustained voice to the chord
    addVoice(id, idx) {
      if (!started || voices.has(id)) return;
      const f = 110 * Math.pow(2, SEMIS[idx % SEMIS.length] / 12);
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.016, ctx.currentTime + 6);
      const o1 = ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = f; o1.detune.value = -5;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = 6;
      const o2g = ctx.createGain(); o2g.gain.value = 0.35;
      o1.connect(g); o2.connect(o2g); o2g.connect(g);
      g.connect(bus);
      o1.start(); o2.start();
      voices.set(id, { o1, o2, g });
      // the void recedes as the world fills
      voidHum.gain.linearRampToValueAtTime(
        Math.max(0.005, 0.05 - voices.size * 0.004), ctx.currentTime + 5);
      lp.frequency.linearRampToValueAtTime(
        700 + voices.size * 320, ctx.currentTime + 5);
    },
    strike(idx) { bell(idx); },
    denied() {
      if (!started) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.8);
    },
    benediction() {
      if (!started) return;
      for (let i = 0; i < 10; i++) bell(i, i * 0.28, 0.1);
      bell(11, 3.0, 0.14);
    },
    setNight(on) {
      if (!started) return;
      lp.frequency.linearRampToValueAtTime(
        on ? 520 : 700 + voices.size * 320, ctx.currentTime + 5);
    },
    poke() {
      if (started && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
  };
}
