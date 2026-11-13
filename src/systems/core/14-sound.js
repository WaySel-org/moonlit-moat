  // ---------- Sound (synthesised in the browser, starts on first input) ----------
  // No audio files: every effect is built from noise and oscillators on a shared bus (compressor plus a small room
  // reverb). sfx(name, beast) plays one named effect; beast is 'stag', 'gryphon' or 'drake' for moves that use a
  // beast's voice (it defaults to the ridden one). Each call is detuned a few percent so repeats never sound identical,
  // and the same effect is not restarted within 35 ms, so a sweep that hits six creeps at once does not stack six sounds.
  let ac = null, noiseBuf = null, bus = null, wet = null, clipCurve = null, vary = 1, sfxGain = 1, sfxAt = 0;
  const sfxLast = {};
  function audio() {
    if (!S.sound) return null;
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      bus = ac.createGain(); bus.gain.value = 0.85; bus.connect(comp).connect(ac.destination);
      // Room: 1.4 s of decaying stereo noise used as an impulse response
      const len = Math.floor(ac.sampleRate * 1.4), ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const verb = ac.createConvolver(); verb.buffer = ir;
      wet = ac.createGain(); wet.gain.value = 0.22; wet.connect(verb).connect(bus);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // Soft clipper for throats and fire
      clipCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) clipCurve[i] = Math.tanh((i / 512 - 1) * 3.5);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  // ----- building blocks. o.at delays the start in seconds; o.wet sends that share to the room -----
  function sfxOut(a, node, o) {
    node.connect(bus);
    if (o.wet) { const w = a.createGain(); w.gain.value = o.wet; node.connect(w).connect(wet); }
  }
  // Envelope: rise to o.g over o.a seconds, then fall away until o.d
  function sfxEnv(a, t, o) {
    const g = a.createGain(), at = Math.max(0.002, o.a || 0.004);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((o.g || 0.2) * sfxGain, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(at + 0.01, o.d));
    return g;
  }
  // Filtered noise; o.f sweeps to o.f1, o.type is the filter (bandpass by default), o.q its resonance
  function noise(a, o) {
    const t = a.currentTime + sfxAt + (o.at || 0), src = a.createBufferSource();
    src.buffer = noiseBuf; src.playbackRate.value = vary;
    const f = a.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f * vary, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1 * vary, t + (o.fd || o.d));
    const g = sfxEnv(a, t, o); src.connect(f).connect(g); sfxOut(a, g, o);
    src.start(t, Math.random() * 1.2); src.stop(t + o.d + 0.05);
  }
  // Oscillator; o.f sweeps to o.f1 over o.fd (default the whole sound); o.lp adds a lowpass, o.vib a wobble in Hz
  function tone(a, o) {
    const t = a.currentTime + sfxAt + (o.at || 0), osc = a.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f * vary, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1 * vary, t + (o.fd || o.d));
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.value = o.f * 0.04; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + o.d + 0.05); }
    let n = osc;
    if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n.connect(f); n = f; }
    const g = sfxEnv(a, t, o); n.connect(g); sfxOut(a, g, o);
    osc.start(t); osc.stop(t + o.d + 0.05);
  }
  // A body moving through air: the filter opens and closes with the swing, loudest just before the middle
  function whoosh(a, d, f0, f1, g, at, q) {
    const t = a.currentTime + sfxAt + (at || 0), src = a.createBufferSource(); src.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.4;
    f.frequency.setValueAtTime(f0 * vary, t); f.frequency.exponentialRampToValueAtTime(f1 * vary, t + d * 0.45); f.frequency.exponentialRampToValueAtTime(f0 * 0.8 * vary, t + d);
    const e = a.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(g * 1.8 * sfxGain, t + d * 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f).connect(e); sfxOut(a, e, {}); src.start(t, Math.random() * 1.2); src.stop(t + d + 0.05);
  }
  // Something heavy meeting the ground or a body: a falling sine for weight plus a click for contact
  function thump(a, f, d, g, at, wetAmt) {
    tone(a, { f: f * 2.4, f1: f, fd: d * 0.35, d, g, at, wet: wetAmt });
    noise(a, { f: 900, type: 'lowpass', d: Math.min(0.08, d), g: g * 0.5, at });
  }
  // Metal: inharmonic partials that ring and fade at different rates
  function metal(a, f, d, g, at, wetAmt) {
    [[1, 1], [2.76, 0.6], [5.4, 0.35], [8.93, 0.2]].forEach(([m, k], i) => tone(a, { f: f * m, d: d / (1 + i * 0.5), g: g * k, at, type: i ? 'sine' : 'triangle', wet: wetAmt }));
    noise(a, { f: 6000, type: 'highpass', d: 0.04, g: g * 0.8, at });
  }
  // A throat: a buzzing source and breath noise, chopped by a fast flutter and shaped by two mouth resonances
  function growl(a, o) {
    const t = a.currentTime + sfxAt + (o.at || 0), d = o.d;
    const osc = a.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f * vary, t); osc.frequency.linearRampToValueAtTime(o.f * (o.bend || 1.25) * vary, t + d * 0.3); osc.frequency.exponentialRampToValueAtTime(o.f * 0.75 * vary, t + d);
    const src = a.createBufferSource(); src.buffer = noiseBuf;
    const og = a.createGain(); og.gain.value = 0.6; const ng = a.createGain(); ng.gain.value = o.breath || 0.8;
    const flut = a.createGain(); flut.gain.value = 0.5;
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = (o.rate || 30) * vary; lg.gain.value = 0.5; lfo.connect(lg).connect(flut.gain);
    const drive = a.createGain(); drive.gain.value = 1.5;
    const sh = a.createWaveShaper(); sh.curve = clipCurve;
    const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = (o.form || 500) * vary; f1.Q.value = 2.5;
    const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = (o.form || 500) * 2.3 * vary; f2.Q.value = 3;
    const f2g = a.createGain(); f2g.gain.value = 0.5;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp || 2600;
    osc.connect(og).connect(flut); src.connect(ng).connect(flut);
    flut.connect(drive).connect(sh); sh.connect(f1).connect(lp); sh.connect(f2).connect(f2g).connect(lp);
    const g = sfxEnv(a, t, { g: o.g, a: o.a || 0.04, d }); lp.connect(g); sfxOut(a, g, { wet: o.wet });
    [osc, lfo].forEach(n => { n.start(t); n.stop(t + d + 0.05); }); src.start(t, Math.random() * 1.2); src.stop(t + d + 0.05);
  }
  // A short run of bright notes
  function chime(a, notes, step, g, d, type, at, wetAmt) {
    notes.forEach((f, i) => tone(a, { f, d: d || 0.3, g, at: (at || 0) + i * step, type: type || 'triangle', wet: wetAmt == null ? 0.4 : wetAmt }));
  }
  // Hooves or paws hitting the ground in quick succession
  function gallop(a, n, step, g, at) {
    for (let i = 0; i < n; i++) thump(a, 70 + Math.random() * 25, 0.12, g * (0.75 + Math.random() * 0.3), (at || 0) + i * step + (i % 2 ? 0.025 : 0));
  }
  // A beast's own voice: the stag snorts, the gryphon screeches and the drake rumbles. size stretches it.
  function beastVoice(a, type, size, at) {
    const s = size || 1, t0 = at || 0;
    if (type === 'gryphon') {
      tone(a, { f: 1300, f1: 2300, fd: 0.08 * s, d: 0.28 * s, g: 0.07, type: 'sawtooth', lp: 4200, vib: 38, at: t0, wet: 0.25 });
      tone(a, { f: 2600, f1: 1500, d: 0.3 * s, g: 0.03, type: 'square', lp: 5000, vib: 38, at: t0 + 0.04 });
      noise(a, { f: 3200, q: 2, d: 0.22 * s, g: 0.08, at: t0 });
    } else if (type === 'drake') {
      growl(a, { f: 55, d: 0.45 * s, g: 0.42, rate: 22, form: 320, lp: 1500, at: t0, wet: 0.25 });
    } else {
      // Snort: a hard blast of air through the nose, then a short rumble
      noise(a, { f: 1400, f1: 500, q: 1.2, d: 0.16 * s, g: 0.38, a: 0.006, at: t0 });
      growl(a, { f: 85, d: 0.22 * s, g: 0.16, rate: 40, form: 450, breath: 1.4, at: t0 + 0.04 });
    }
  }

  // ----- the catalogue: one entry per move or event -----
  const SFX = {
    // The hero's sword
    swing: a => { whoosh(a, 0.17, 700, 2700, 0.24); noise(a, { f: 5200, type: 'highpass', d: 0.05, g: 0.04, at: 0.05 }); },
    airslash: a => { whoosh(a, 0.14, 900, 3200, 0.2); whoosh(a, 0.16, 700, 2400, 0.16, 0.08); },
    cleave: a => { whoosh(a, 0.32, 260, 1500, 0.4, 0, 0.9); tone(a, { f: 110, f1: 55, d: 0.3, g: 0.18 }); },
    throw: a => { whoosh(a, 0.13, 1800, 5200, 0.14, 0, 4); tone(a, { f: 2600, f1: 1700, d: 0.16, g: 0.025, at: 0.02 }); },
    spin: a => { for (let i = 0; i < 5; i++) whoosh(a, 0.2, i % 2 ? 600 : 800, i % 2 ? 2000 : 2800, 0.2, i * 0.11); tone(a, { f: 330, f1: 660, d: 0.5, g: 0.05, type: 'triangle', wet: 0.3 }); },
    swoosh: a => { whoosh(a, 0.22, 800, 3000, 0.22); },
    flow: a => { whoosh(a, 0.25, 1200, 4000, 0.16, 0, 2); chime(a, [1319, 1760], 0.05, 0.04, 0.4, 'sine'); },
    // Hits landing
    hit: a => { thump(a, 130, 0.13, 0.42); noise(a, { f: 1900, q: 1.2, d: 0.06, g: 0.22 }); noise(a, { f: 500, type: 'lowpass', d: 0.12, g: 0.2 }); },
    heavyhit: a => { thump(a, 85, 0.24, 0.6); noise(a, { f: 1200, q: 0.7, d: 0.14, g: 0.35 }); noise(a, { f: 320, type: 'lowpass', d: 0.28, g: 0.3 }); },
    // Steel on steel
    clang: a => metal(a, 620, 0.45, 0.1, 0, 0.2),
    parry: a => { metal(a, 1180, 0.7, 0.1, 0, 0.45); whoosh(a, 0.18, 3000, 7000, 0.12, 0, 3); },
    // Moving around
    roll: a => { noise(a, { f: 700, type: 'lowpass', d: 0.14, g: 0.32 }); noise(a, { f: 600, type: 'lowpass', d: 0.16, g: 0.26, at: 0.13 }); whoosh(a, 0.3, 300, 900, 0.08); },
    jump: a => { whoosh(a, 0.2, 400, 1400, 0.12); noise(a, { f: 500, type: 'lowpass', d: 0.07, g: 0.24 }); },
    plunge: a => { whoosh(a, 0.4, 2800, 700, 0.2, 0, 3); tone(a, { f: 900, f1: 320, d: 0.35, g: 0.04 }); },
    slam: a => { thump(a, 62, 0.45, 0.8, 0, 0.3); noise(a, { f: 500, f1: 120, type: 'lowpass', d: 0.55, g: 0.45, wet: 0.2 }); noise(a, { f: 2600, q: 0.8, d: 0.22, g: 0.12, at: 0.03 }); },
    skyfall: a => { SFX.slam(a); thump(a, 45, 0.6, 0.5, 0.02); chime(a, [1568, 2093], 0.05, 0.04, 0.6); },
    land: a => { thump(a, 80, 0.22, 0.55); noise(a, { f: 600, f1: 200, type: 'lowpass', d: 0.25, g: 0.25 }); },
    step: a => { thump(a, 120, 0.06, 0.18); noise(a, { f: 700, type: 'lowpass', d: 0.06, g: 0.1 }); },
    // Moonlit Her's grappling hook: a chain whirring out, and the zip as it reels her in
    hook: a => { whoosh(a, 0.22, 1500, 4200, 0.14, 0, 3); for (let i = 0; i < 6; i++) metal(a, 1700 + i * 60, 0.08, 0.014, 0.03 + i * 0.035); },
    zip: a => { whoosh(a, 0.5, 600, 3600, 0.22, 0, 2); tone(a, { f: 500, f1: 1600, d: 0.45, g: 0.03, type: 'sawtooth', lp: 3000 }); metal(a, 700, 0.3, 0.06, 0.42); },
    leap: a => { whoosh(a, 0.5, 300, 2400, 0.3, 0, 1.1); tone(a, { f: 220, f1: 880, d: 0.45, g: 0.07, type: 'triangle', wet: 0.4 }); },
    hurt: a => { thump(a, 115, 0.16, 0.45); noise(a, { f: 900, q: 1, d: 0.1, g: 0.25 }); tone(a, { f: 300, f1: 150, d: 0.18, g: 0.08, type: 'triangle' }); },
    // Magic
    cast: a => {
      tone(a, { f: 480, f1: 1500, d: 0.26, g: 0.09, type: 'triangle', wet: 0.4 });
      noise(a, { f: 6000, type: 'highpass', d: 0.22, g: 0.05 });
      for (let i = 0; i < 4; i++) tone(a, { f: 2000 + Math.random() * 2200, d: 0.12, g: 0.025, at: 0.04 + i * 0.045, wet: 0.5 });
    },
    volley: a => { for (let i = 0; i < 3; i++) { tone(a, { f: 520 + i * 90, f1: 1700, d: 0.2, g: 0.07, type: 'triangle', at: i * 0.08, wet: 0.4 }); noise(a, { f: 5000, type: 'highpass', d: 0.1, g: 0.04, at: i * 0.08 }); } },
    blink: a => { tone(a, { f: 1900, f1: 280, d: 0.2, g: 0.08, wet: 0.4 }); whoosh(a, 0.2, 4000, 1200, 0.1, 0, 2); },
    portal: a => { tone(a, { f: 180, f1: 720, d: 0.9, g: 0.1, a: 0.3, wet: 0.6 }); tone(a, { f: 270, f1: 1080, d: 0.9, g: 0.06, a: 0.3, wet: 0.6 }); whoosh(a, 0.9, 300, 2600, 0.12, 0, 0.8); },
    // Rewards
    drink: a => { for (let i = 0; i < 3; i++) { tone(a, { f: 240, f1: 150, d: 0.08, g: 0.16, at: i * 0.17 }); noise(a, { f: 900, q: 4, d: 0.06, g: 0.06, at: i * 0.17 + 0.02 }); } chime(a, [660, 880, 1320], 0.06, 0.04, 0.3, 'sine', 0.5); },
    coin: a => { tone(a, { f: 1320, d: 0.09, g: 0.07, type: 'square', lp: 5000 }); tone(a, { f: 1760, d: 0.3, g: 0.06, type: 'square', lp: 5000, at: 0.07, wet: 0.3 }); },
    pickup: a => chime(a, [660, 880, 1320], 0.06, 0.08, 0.25),
    chest: a => { tone(a, { f: 90, f1: 140, d: 0.25, g: 0.07, type: 'sawtooth', lp: 600 }); thump(a, 160, 0.1, 0.25, 0.22); chime(a, [784, 988, 1175, 1568], 0.06, 0.07, 0.35, 'triangle', 0.25); },
    levelup: a => chime(a, [523, 659, 784, 1047, 1319], 0.08, 0.09, 0.6, 'triangle', 0, 0.5),
    relic: a => { metal(a, 880, 1.2, 0.06, 0, 0.6); chime(a, [1047, 1319, 1568], 0.1, 0.05, 0.6, 'sine', 0.1); },
    reforge: a => { metal(a, 520, 0.5, 0.12, 0, 0.3); metal(a, 520, 0.5, 0.1, 0.16, 0.3); chime(a, [784, 1175], 0.08, 0.05, 0.4, 'triangle', 0.3); },
    solve: a => chime(a, [392, 523, 659, 784, 1047], 0.1, 0.09, 0.8, 'triangle', 0, 0.6),
    pop: a => { noise(a, { f: 1600, q: 0.8, d: 0.12, g: 0.12 }); thump(a, 90, 0.3, 0.12, 0, 0.4); for (let i = 0; i < 6; i++) noise(a, { f: 3000 + Math.random() * 3000, q: 3, d: 0.03, g: 0.04, at: 0.15 + Math.random() * 0.4 }); },
    // Puzzles
    click: a => { noise(a, { f: 900, type: 'lowpass', d: 0.12, g: 0.25 }); thump(a, 260, 0.06, 0.2); },
    fail: a => { tone(a, { f: 330, d: 0.18, g: 0.06, type: 'square', lp: 1200 }); tone(a, { f: 220, d: 0.35, g: 0.06, type: 'square', lp: 1200, at: 0.16 }); },
    // Big moments
    boom: a => { thump(a, 52, 0.75, 0.85, 0, 0.3); noise(a, { f: 1400, f1: 160, type: 'lowpass', d: 0.85, g: 0.55, wet: 0.3 }); for (let i = 0; i < 5; i++) noise(a, { f: 2500, q: 2, d: 0.04, g: 0.07, at: 0.1 + Math.random() * 0.35 }); },
    roar: a => { growl(a, { f: 62, d: 1.15, g: 0.5, rate: 26, form: 380, lp: 1800, a: 0.12, wet: 0.35 }); tone(a, { f: 48, f1: 36, d: 1.1, g: 0.25, a: 0.1 }); },
    horn: a => {
      [110, 110.7, 165].forEach((f, i) => tone(a, { f, d: 1.5, g: i === 2 ? 0.05 : 0.08, a: 0.18, type: 'sawtooth', lp: 750, wet: 0.5 }));
      thump(a, 55, 0.5, 0.3);
    },
    // The beast you ride
    claw: a => { noise(a, { f: 3600, f1: 1400, q: 1.5, d: 0.09, g: 0.3 }); noise(a, { f: 3000, f1: 1200, q: 1.5, d: 0.09, g: 0.24, at: 0.045 }); whoosh(a, 0.16, 500, 1600, 0.12); },
    rampage: (a, b) => { beastVoice(a, b, 0.8); gallop(a, 4, 0.075, 0.35, 0.02); whoosh(a, 0.4, 250, 1100, 0.3, 0.05, 0.9); },
    rear: (a, b) => { beastVoice(a, b, 1.1); whoosh(a, 0.3, 300, 900, 0.1); },
    stomp: a => { thump(a, 55, 0.4, 0.85, 0, 0.25); noise(a, { f: 700, f1: 150, type: 'lowpass', d: 0.45, g: 0.4 }); noise(a, { f: 2200, q: 0.8, d: 0.18, g: 0.12, at: 0.02 }); },
    // Space on a beast: it crouches, kicks off and springs, with one short call (no long roar)
    pounce: (a, b) => { thump(a, 110, 0.08, 0.32); whoosh(a, 0.34, 300, 1700, 0.24, 0.02, 1.1); beastVoice(a, b, 0.75, 0.03); },
    paws: a => { thump(a, 95, 0.12, 0.35); noise(a, { f: 600, type: 'lowpass', d: 0.12, g: 0.15, at: 0.03 }); },
    dive: (a, b) => { whoosh(a, 0.38, 2400, 500, 0.22, 0, 2.5); beastVoice(a, b, 0.6); },
    pounceslam: (a, b) => { SFX.slam(a); thump(a, 42, 0.55, 0.45, 0.02); beastVoice(a, b, 0.8, 0.05); },
    toss: (a, b) => { beastVoice(a, b, 0.7); whoosh(a, 0.3, 400, 1600, 0.25, 0.05); thump(a, 140, 0.1, 0.3, 0.12); },
    nova: a => { metal(a, 1046, 1.2, 0.07, 0, 0.6); tone(a, { f: 200, f1: 900, d: 0.6, g: 0.08, wet: 0.5 }); whoosh(a, 0.6, 400, 3000, 0.15, 0, 0.8); },
    stampede: (a, b) => { beastVoice(a, b, 0.9); gallop(a, 10, 0.06, 0.28); whoosh(a, 0.8, 300, 1400, 0.16, 0.05, 0.7); tone(a, { f: 400, f1: 900, d: 0.7, g: 0.04, type: 'triangle', wet: 0.6 }); },
    gust: a => { whoosh(a, 0.65, 350, 1800, 0.4, 0, 0.7); whoosh(a, 0.5, 900, 3200, 0.14, 0.1, 1.5); },
    snarl: (a, b) => beastVoice(a, b, 0.6),
    feathers: (a, b) => { beastVoice(a, b, 0.6); for (let i = 0; i < 9; i++) noise(a, { f: 2500 + Math.random() * 2000, q: 1.5, d: 0.05, g: 0.12, at: 0.05 + i * 0.03 }); },
    skypounce: (a, b) => { beastVoice(a, b, 1); whoosh(a, 0.5, 300, 2000, 0.28, 0.02, 1.1); },
    breath: a => {
      growl(a, { f: 45, d: 0.8, g: 0.35, rate: 18, form: 280, lp: 1200, wet: 0.2 });
      noise(a, { f: 2200, f1: 700, type: 'lowpass', d: 0.85, g: 0.45, a: 0.06, wet: 0.25 });
      for (let i = 0; i < 10; i++) noise(a, { f: 3500, q: 3, d: 0.025, g: 0.06, at: Math.random() * 0.7 });
    },
    lash: a => { whoosh(a, 0.2, 400, 2400, 0.25); noise(a, { f: 4000, type: 'highpass', d: 0.05, g: 0.4, at: 0.17 }); thump(a, 200, 0.06, 0.2, 0.17); },
    embers: (a, b) => { beastVoice(a, b, 0.7); noise(a, { f: 3000, f1: 1200, q: 1, d: 0.4, g: 0.12, at: 0.05 }); },
    ember: a => { thump(a, 85, 0.28, 0.45); noise(a, { f: 1000, f1: 300, type: 'lowpass', d: 0.4, g: 0.3 }); for (let i = 0; i < 3; i++) noise(a, { f: 3200, q: 3, d: 0.025, g: 0.05, at: 0.05 + Math.random() * 0.25 }); },
    tame: (a, b) => { beastVoice(a, b, 1); chime(a, [523, 784, 1047], 0.09, 0.06, 0.5, 'triangle', 0.15); },
    farewell: (a, b) => { beastVoice(a, b, 1.2); whoosh(a, 0.8, 300, 1400, 0.16, 0.1, 0.8); }
  };

  // ----- boss voices: each boss and mythic has its own call, used when it arrives, roars, rages and falls -----
  // Quick runs of tiny clicks or ticks, scattered over a span (rattles, crackles, chitters)
  function ticks(a, n, span, f, g, at, q) { for (let i = 0; i < n; i++) noise(a, { f: f * (0.8 + Math.random() * 0.4), q: q || 4, d: 0.025, g, at: (at || 0) + Math.random() * span }); }
  function flaps(a, n, step, at) { for (let i = 0; i < n; i++) whoosh(a, 0.22, 250, 700, 0.22, (at || 0) + i * step, 0.8); }
  // A voiced call with a pitch contour and a moving mouth: pts are [time, Hz] points, v0 and v1 the two mouth
  // resonances at the start and the end (open 'aa' is about [750, 1200], closed 'oo' about [350, 800]).
  // rasp roughens it with a light flutter, vib wobbles the pitch. Bellows, shouts, trumpeting roars and laughs.
  function bellow(a, o) {
    const t = a.currentTime + sfxAt + (o.at || 0), d = o.d, pts = o.pts;
    const osc = a.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pts[0][1] * vary, t);
    for (let i = 1; i < pts.length; i++) osc.frequency.linearRampToValueAtTime(pts[i][1] * vary, t + pts[i][0]);
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.value = pts[0][1] * 0.03; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + d + 0.05); }
    const rough = a.createGain(); rough.gain.value = 1;
    if (o.rasp) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.rasp; lg.gain.value = 0.35; l.connect(lg).connect(rough.gain); l.start(t); l.stop(t + d + 0.05); }
    const drive = a.createGain(); drive.gain.value = o.drive || 1.2; const sh = a.createWaveShaper(); sh.curve = clipCurve;
    const out = a.createGain(); out.gain.value = 1;
    const v0 = o.v0 || [750, 1200], v1 = o.v1 || v0;
    [[0, 4, 1], [1, 5, 0.55]].forEach(([k, q, lv]) => {
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
      f.frequency.setValueAtTime(v0[k] * vary, t); f.frequency.linearRampToValueAtTime(v1[k] * vary, t + d);
      const g = a.createGain(); g.gain.value = lv; sh.connect(f).connect(g).connect(out);
    });
    const body = a.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 500; const bg = a.createGain(); bg.gain.value = 0.35; sh.connect(body).connect(bg).connect(out);
    osc.connect(rough).connect(drive).connect(sh);
    const g = sfxEnv(a, t, { g: o.g, a: o.a || 0.05, d }); out.connect(g); sfxOut(a, g, { wet: o.wet });
    osc.start(t); osc.stop(t + d + 0.05);
  }
  // A hiss that swells and fades: serpents, steam, hydra heads
  function hiss(a, d, f, g, at, aTime) { noise(a, { f, type: 'highpass', d, g, a: aTime || d * 0.3, at }); }

  const BOSS = {
    // The Gate Warden: a struck gate gong, grinding stone, and a deep closed-mouth bellow from inside the iron
    warden: a => { metal(a, 98, 2.2, 0.12, 0, 0.7); noise(a, { f: 300, f1: 140, q: 3, d: 1.2, g: 0.15 }); bellow(a, { pts: [[0, 46], [0.4, 52], [1.4, 38]], d: 1.5, g: 0.45, v0: [320, 700], v1: [260, 600], rasp: 14, drive: 2, at: 0.15, wet: 0.45 }); },
    // Vesthra, the Gorgon: a long serpent hiss, a tail rattle and a cold, wavering note
    gorgon: a => { hiss(a, 1.3, 5500, 0.22); ticks(a, 16, 0.9, 4500, 0.08, 0.2); tone(a, { f: 440, f1: 415, d: 1.3, g: 0.05, vib: 6, a: 0.3, wet: 0.6 }); },
    // Nyxara, the Thorn Empress: a high wail over creaking wood and snapping thorns
    empress: a => { tone(a, { f: 660, f1: 520, d: 1.4, g: 0.07, type: 'triangle', vib: 5.5, a: 0.25, wet: 0.6 }); tone(a, { f: 990, f1: 780, d: 1.3, g: 0.035, vib: 5.5, a: 0.3, wet: 0.6 }); ticks(a, 12, 1.0, 2500, 0.1); tone(a, { f: 70, f1: 55, d: 1.0, g: 0.08, type: 'sawtooth', lp: 400 }); },
    royals: a => { BOSS.gorgon(a); BOSS.empress(a); },
    // Cinderwing: a high dragon screech over a fire roar
    cinderwing: a => { tone(a, { f: 1100, f1: 600, d: 1.0, g: 0.08, type: 'sawtooth', lp: 3500, vib: 30, wet: 0.4 }); tone(a, { f: 1650, f1: 900, d: 0.9, g: 0.04, type: 'sawtooth', lp: 4500, vib: 30 }); noise(a, { f: 2000, f1: 600, type: 'lowpass', d: 1.0, g: 0.3, a: 0.1 }); },
    // Gorgemaw, the Grave Glutton: a slow, wet belly gurgle with bubbles rising through it
    gorger: a => { growl(a, { f: 32, d: 1.4, g: 0.5, rate: 9, form: 220, lp: 900, breath: 1.6, wet: 0.3 }); for (let i = 0; i < 10; i++) { const f = 150 + Math.random() * 250; tone(a, { f, f1: f * 1.8, d: 0.06, g: 0.07, at: Math.random() * 1.2 }); } },
    // Ashwing Wyrm: wing beats, then a hoarse honking dragon call that falls away
    wyrm: a => { flaps(a, 3, 0.25); bellow(a, { pts: [[0, 150], [0.25, 210], [1.1, 95]], d: 1.15, g: 0.32, v0: [700, 1150], v1: [450, 900], rasp: 32, drive: 2.5, at: 0.35, wet: 0.35 }); },
    // Rimefang Wyvern: wing beats, a thin icy shriek and the ring of cracking ice
    rime: a => { flaps(a, 3, 0.25); tone(a, { f: 1500, f1: 900, d: 0.9, g: 0.05, type: 'square', lp: 4000, vib: 25, at: 0.2, wet: 0.5 }); metal(a, 2200, 1.0, 0.04, 0.3, 0.7); whoosh(a, 1.0, 1500, 4500, 0.12, 0, 1.5); },
    // Tyrant Rex: a huge intake of breath, then a trumpeting roar (a high, ragged blare riding a deep bellow) that
    // breaks into a rattling throat, all over a sub rumble that shakes the ground
    rex: a => {
      noise(a, { f: 400, f1: 1300, type: 'bandpass', q: 0.8, d: 0.4, g: 0.25, a: 0.35 });
      bellow(a, { pts: [[0, 330], [0.3, 520], [0.9, 430], [1.8, 230]], d: 1.85, g: 0.26, v0: [900, 1500], v1: [600, 1100], vib: 7, rasp: 55, drive: 3, a: 0.06, at: 0.38, wet: 0.4 });
      bellow(a, { pts: [[0, 58], [0.3, 72], [1.8, 42]], d: 1.9, g: 0.5, v0: [420, 900], v1: [300, 700], rasp: 23, drive: 2.2, a: 0.08, at: 0.38, wet: 0.35 });
      tone(a, { f: 34, f1: 28, d: 1.9, g: 0.35, a: 0.15, at: 0.38 });
      ticks(a, 18, 0.5, 700, 0.12, 1.85, 3);
    },
    // The jaws closing: a deep crunch with a clack of teeth
    rexbite: a => { thump(a, 70, 0.3, 0.7); noise(a, { f: 1400, q: 0.8, d: 0.12, g: 0.5 }); metal(a, 900, 0.08, 0.06, 0.01); noise(a, { f: 300, type: 'lowpass', d: 0.3, g: 0.3 }); },
    // Lowering its head to charge: a snort and a few pounding strides
    rexcharge: a => { noise(a, { f: 900, f1: 350, q: 1, d: 0.3, g: 0.45, a: 0.01 }); bellow(a, { pts: [[0, 70], [0.3, 55]], d: 0.35, g: 0.3, v0: [400, 800], rasp: 30, drive: 2 }); for (let i = 0; i < 4; i++) thump(a, 38, 0.35, 0.55, 0.3 + i * 0.22); },
    // One footfall: felt more than heard
    rexstep: a => { thump(a, 34, 0.35, 0.26); noise(a, { f: 250, type: 'lowpass', d: 0.25, g: 0.1 }); },
    // Razorclaw pack: chittering shrieks and clicking claws
    raptors: a => { for (let i = 0; i < 7; i++) tone(a, { f: 1800 + Math.random() * 600, f1: 2700, d: 0.09, g: 0.045, type: 'sawtooth', lp: 5000, at: Math.random() * 0.8 }); ticks(a, 14, 0.9, 3500, 0.07); },
    // The Minotaur: a snort, two stamps, then a bull's long bellow (low 'mmm' opening to 'aaw')
    minotaur: a => { noise(a, { f: 1400, f1: 500, d: 0.22, g: 0.35 }); thump(a, 60, 0.3, 0.5, 0.15); thump(a, 60, 0.3, 0.5, 0.35); bellow(a, { pts: [[0, 105], [0.5, 140], [1.2, 95]], d: 1.3, g: 0.42, v0: [300, 700], v1: [700, 1100], rasp: 9, drive: 1.6, a: 0.15, at: 0.45, wet: 0.35 }); },
    // The Oni: two war drums, then a booming three-beat laugh
    oni: a => { thump(a, 70, 0.4, 0.65, 0, 0.3); thump(a, 70, 0.4, 0.65, 0.25, 0.3); [0.6, 0.85, 1.1].forEach((t, i) => bellow(a, { pts: [[0, 125 - i * 8], [0.18, 100 - i * 8]], d: 0.2, g: 0.4, v0: [750, 1150], v1: [650, 1050], drive: 2, at: t, wet: 0.35 })); },
    // The Manticore: a lion's roar, then the falling grunts a lion ends on, then the spine-tail rattle
    manticore: a => { growl(a, { f: 95, bend: 1.5, d: 0.75, g: 0.5, rate: 36, form: 520, a: 0.08, wet: 0.35 }); [0.85, 1.12, 1.36, 1.56].forEach((t, i) => growl(a, { f: 80 - i * 6, bend: 1.05, d: 0.16, g: 0.4 - i * 0.06, rate: 30, form: 420, at: t })); ticks(a, 14, 0.4, 5000, 0.07, 1.75, 2); },
    // The Basilisk: a deep serpent hiss over a low drone, and the crackle of flesh turning to stone
    basilisk: a => { hiss(a, 1.4, 3500, 0.2); tone(a, { f: 55, d: 1.4, g: 0.14, type: 'sawtooth', lp: 300, a: 0.3, wet: 0.4 }); ticks(a, 10, 0.6, 800, 0.12, 0.8, 5); },
    // The Kitsune: two fox yelps and spirit bells
    kitsune: a => { [0, 0.3].forEach(t => tone(a, { f: 900, f1: 1800, fd: 0.08, d: 0.25, g: 0.07, type: 'triangle', vib: 12, at: t, wet: 0.5 })); chime(a, [1568, 2093, 2637], 0.12, 0.05, 0.7, 'sine', 0.55, 0.7); },
    // The Cyclops: a stamp, then a giant's war cry (an open-mouthed shout that rises and breaks)
    cyclops: a => { thump(a, 45, 0.6, 0.7); bellow(a, { pts: [[0, 120], [0.35, 175], [1.0, 165], [1.3, 110]], d: 1.35, g: 0.4, v0: [650, 1100], v1: [800, 1250], rasp: 18, drive: 2.2, a: 0.08, at: 0.15, wet: 0.45 }); },
    // The Hydra: three heads hissing and shrieking over each other, each at its own pitch
    hydra: a => { [[420, 0], [560, 0.18], [330, 0.36]].forEach(([f, t]) => { tone(a, { f, f1: f * 0.6, d: 0.8, g: 0.05, type: 'sawtooth', lp: 2800, vib: 22, at: t, wet: 0.3 }); hiss(a, 0.7, 4000, 0.1, t, 0.1); }); },
    // Admiral Saltmarrow: a ship's bell, creaking timbers, a wash of water and the anchor chain
    saltmarrow: a => { metal(a, 300, 2.0, 0.12, 0, 0.6); metal(a, 300, 2.0, 0.1, 0.6, 0.6); tone(a, { f: 80, f1: 60, d: 1.2, g: 0.08, type: 'sawtooth', lp: 500 }); noise(a, { f: 900, f1: 300, type: 'lowpass', d: 1.5, g: 0.3, a: 0.4 }); for (let i = 0; i < 8; i++) metal(a, 1800, 0.1, 0.03, 1.0 + i * 0.05); },
    // Vorrask: the void rushing in, a beating drone and glitches
    vorrask: a => { noise(a, { f: 200, f1: 3000, type: 'lowpass', d: 1.0, g: 0.35, a: 0.9 }); tone(a, { f: 41, d: 1.6, g: 0.18, type: 'sawtooth', lp: 220, a: 0.2 }); tone(a, { f: 41.6, d: 1.6, g: 0.18, type: 'sawtooth', lp: 220, a: 0.2 }); for (let i = 0; i < 6; i++) tone(a, { f: 200 + Math.random() * 2000, d: 0.03, g: 0.04, type: 'square', at: 0.3 + Math.random() * 0.9 }); thump(a, 35, 0.6, 0.6, 1.0, 0.5); },
    // Kael Thurnis: a rising cosmic chord, then a meteor falling and striking
    thurnis: a => { [130.8, 196, 261.6, 392].forEach(f => tone(a, { f, f1: f * 1.5, d: 1.6, g: 0.05, a: 0.5, wet: 0.7 })); tone(a, { f: 3000, f1: 200, d: 0.8, g: 0.06, at: 0.4, wet: 0.5 }); thump(a, 38, 0.8, 0.7, 1.1, 0.5); noise(a, { f: 1200, f1: 150, type: 'lowpass', d: 0.8, g: 0.35, at: 1.1 }); },
    // The Hive Matron: a swarm's buzz and clicking mandibles
    matron: a => { [180, 184, 191, 197, 203].forEach(f => tone(a, { f, d: 1.4, g: 0.03, type: 'sawtooth', lp: 1500, vib: 40, a: 0.25, wet: 0.3 })); ticks(a, 20, 1.2, 3000, 0.06); },
    // Director Halvane: servos spin up, the suit clunks into place, hydraulics vent, an alarm chirps
    halvane: a => { tone(a, { f: 300, f1: 1200, d: 0.6, g: 0.04, type: 'square', lp: 2500 }); thump(a, 90, 0.2, 0.5, 0.6); metal(a, 400, 0.25, 0.07, 0.6); noise(a, { f: 4000, type: 'highpass', d: 0.4, g: 0.12, at: 0.7 }); [0.9, 1.15].forEach(t => tone(a, { f: 880, d: 0.12, g: 0.04, type: 'square', lp: 3000, at: t })); },
    // The Rot Sovereign (Necrophous): a long, wet, closed-mouth groan with flies and crumbling earth
    rot: a => { bellow(a, { pts: [[0, 62], [0.7, 70], [1.6, 50]], d: 1.6, g: 0.4, v0: [380, 760], v1: [300, 640], rasp: 7, drive: 1.8, a: 0.3, wet: 0.4 }); tone(a, { f: 220, d: 1.4, g: 0.015, type: 'sawtooth', vib: 15, a: 0.3 }); noise(a, { f: 400, type: 'lowpass', d: 1.2, g: 0.25, a: 0.2 }); }
  };

  // ----- entrance stings: a short phrase on each boss's own instrument, played before its voice when it arrives -----
  // One note on an instrument; f in Hz, at and d in seconds
  function note(a, ins, f, at, d, g) {
    const v = g || 1;
    if (ins === 'brass') { [1, 1.006].forEach(m => tone(a, { f: f * m, d, g: 0.05 * v, a: 0.06, type: 'sawtooth', lp: 900 + f * 3, at, wet: 0.45 })); }
    else if (ins === 'strings') { [1, 0.996, 1.004].forEach(m => tone(a, { f: f * m, d, g: 0.03 * v, a: Math.min(0.25, d * 0.4), type: 'sawtooth', lp: 2200, vib: 5, at, wet: 0.55 })); }
    else if (ins === 'bell') metal(a, f, d * 1.6, 0.05 * v, at, 0.6);
    else if (ins === 'pluck') { tone(a, { f, d: Math.min(d, 0.5), g: 0.08 * v, type: 'triangle', at, wet: 0.4 }); tone(a, { f: f * 2, d: 0.15, g: 0.03 * v, type: 'sine', at }); }
    else if (ins === 'flute') { tone(a, { f, d, g: 0.06 * v, a: 0.05, vib: 5, at, wet: 0.5 }); noise(a, { f: f * 2, q: 6, d, g: 0.02 * v, a: 0.05, at }); }
    else if (ins === 'organ') { [1, 2, 3, 4].forEach((m, i) => tone(a, { f: f * m, d, g: 0.035 * v / (i + 1), a: 0.08, at, wet: 0.6 })); }
    else if (ins === 'synth') tone(a, { f, d: Math.min(d, 0.3), g: 0.045 * v, type: 'square', lp: 2400, at, wet: 0.3 });
    else if (ins === 'choir') { [1, 1.005].forEach(m => tone(a, { f: f * m, d, g: 0.04 * v, a: 0.2, type: 'triangle', vib: 5.5, at, wet: 0.7 })); }
    else if (ins === 'drum') thump(a, f, d, 0.6 * v, at, 0.3);
  }
  // A phrase: root in Hz, beat length in seconds, notes as [semitones, beat, length in beats, instrument?]
  function phrase(a, ins, root, beat, notes, g) { notes.forEach(([s, b, l, i]) => note(a, i || ins, root * Math.pow(2, s / 12), b * beat, l * beat, g)); }
  const D = 'drum';
  const STING = {
    warden: a => phrase(a, 'brass', 73.4, 0.24, [[0, 0, 1.5], [7, 1.5, 0.8], [5, 2.3, 0.7], [0, 3, 3], [-34, 0, 1, D], [-34, 3, 1, D]]),
    royals: a => phrase(a, 'strings', 220, 0.22, [[0, 0, 1], [3, 1, 1], [7, 2, 1], [8, 3, 3], [-12, 0, 6]]),
    gorger: a => phrase(a, 'brass', 55, 0.3, [[0, 0, 1], [1, 1, 1], [0, 2, 1], [-5, 3, 3]]),
    wyrm: a => phrase(a, 'brass', 110, 0.2, [[0, 0, 1], [3, 1, 1], [7, 2, 1], [6, 3, 3]]),
    rime: a => phrase(a, 'bell', 523, 0.18, [[0, 0, 1], [7, 1, 1], [3, 2, 1], [10, 3, 3]]),
    // Tyrant Rex: primal war drums and a low horn, no melody
    rex: a => phrase(a, 'brass', 49, 0.2, [[0, 0, 1, D], [0, 1, 1, D], [0, 2, 1.5, D], [0, 3.5, 1, D], [0, 4, 2, D], [0, 2, 4], [1, 4, 2]]),
    raptors: a => phrase(a, 'pluck', 330, 0.09, [[0, 0, 1], [3, 1, 1], [0, 2, 1], [6, 3, 1], [0, 4, 1], [3, 5, 1], [7, 6, 2]]),
    minotaur: a => phrase(a, 'brass', 82.4, 0.22, [[-24, 0, 1, D], [-24, 1, 1, D], [0, 0, 2], [5, 2, 3]]),
    oni: a => phrase(a, 'flute', 293.7, 0.18, [[-36, 0, 1, D], [-36, 1, 1, D], [-36, 1.5, 1, D], [0, 2, 1], [3, 3, 1], [5, 4, 1], [7, 5, 2.5]]),
    manticore: a => phrase(a, 'strings', 185, 0.12, [[0, 0, 1], [1, 1, 1], [0, 2, 1], [1, 3, 1], [0, 4, 1], [1, 5, 3]]),
    basilisk: a => phrase(a, 'flute', 392, 0.16, [[0, 0, 1], [1, 1, 1], [4, 2, 1], [5, 3, 1], [7, 4, 1], [5, 5, 1], [4, 6, 2], [-24, 0, 8, 'organ']]),
    kitsune: a => phrase(a, 'pluck', 587, 0.13, [[0, 0, 1], [2, 1, 1], [4, 2, 1], [7, 3, 1], [9, 4, 1], [12, 5, 2, 'bell']]),
    cyclops: a => phrase(a, 'brass', 65.4, 0.26, [[-24, 0, 1, D], [0, 0, 1.5], [0, 1.5, 0.5], [7, 2, 3], [-24, 2, 1, D]]),
    hydra: a => { phrase(a, 'brass', 98, 0.22, [[0, 0, 4], [6, 1, 3]]); phrase(a, 'brass', 146.8, 0.22, [[0, 2, 2]]); },
    saltmarrow: a => phrase(a, 'synth', 196, 0.14, [[0, 0, 2], [4, 2, 1], [7, 3, 2], [4, 5, 1], [0, 6, 3], [-24, 0, 3, 'bell']]),
    vorrask: a => phrase(a, 'organ', 61.7, 0.3, [[0, 0, 4], [1, 0.5, 3.5], [6, 1, 3]]),
    thurnis: a => phrase(a, 'choir', 130.8, 0.2, [[0, 0, 6], [7, 1, 5], [12, 2, 4], [16, 3, 3], [19, 4, 2]]),
    matron: a => phrase(a, 'synth', 440, 0.07, [[0, 0, 1], [3, 1, 1], [7, 2, 1], [10, 3, 1], [7, 4, 1], [3, 5, 1], [0, 6, 1], [3, 7, 1], [7, 8, 1], [10, 9, 2]], 0.8),
    halvane: a => phrase(a, 'synth', 220, 0.1, [[0, 0, 1], [7, 1, 1], [0, 2, 1], [7, 3, 1], [12, 4, 2], [12, 6.5, 1], [12, 8, 1]]),
    rot: a => { phrase(a, 'organ', 98, 0.28, [[0, 0, 2], [3, 2, 2], [6, 4, 3]]); note(a, 'bell', 196, 0, 1.4); }
  };
  Object.assign(SFX, { rexbite: BOSS.rexbite, rexcharge: BOSS.rexcharge, rexstep: BOSS.rexstep });
  const STING_LEN = { warden: 1.2, royals: 0.9, gorger: 1.2, wyrm: 0.8, rime: 0.7, rex: 1.0, raptors: 0.7, minotaur: 0.8, oni: 1.1, manticore: 0.8, basilisk: 1.2, kitsune: 0.9, cyclops: 0.9, hydra: 0.9, saltmarrow: 1.1, vorrask: 1.0, thurnis: 1.2, matron: 0.8, halvane: 1.0, rot: 1.4 };
  // Level trims so every boss arrives about as loud as the others
  const BOSS_GAIN = { raptors: 5, matron: 3, gorger: 2.5, kitsune: 2.2, empress: 2, rot: 1.8, manticore: 2.3, wyrm: 1.5, cinderwing: 1.4, hydra: 1.4, rime: 1.3 };
  const bossVoice = id => BOSS[id] ? (a => { sfxGain = BOSS_GAIN[id] || 1; try { BOSS[id](a); } finally { sfxGain = 1; } }) : SFX.roar;
  // Arrival or a signature roar mid-fight
  SFX.boss = (a, id) => bossVoice(id)(a);
  // A boss arriving: its entrance sting, then its voice as the sting lands
  SFX.bossintro = (a, id) => {
    if (STING[id]) { sfxGain = 1.3; try { STING[id](a); } finally { sfxGain = 1; } }
    sfxAt = STING[id] ? STING_LEN[id] || 1 : 0; try { bossVoice(id)(a); } finally { sfxAt = 0; }
  };
  // Half health: the same voice, pitched up and hit harder
  SFX.bossrage = (a, id) => { vary *= 1.12; bossVoice(id)(a); vary /= 1.12; thump(a, 45, 0.5, 0.5, 0, 0.3); };
  // Defeat: the voice pitched down and dying away, a collapse, then a short victory chime
  SFX.bossdown = (a, id) => {
    vary *= 0.72; bossVoice(id)(a); vary /= 0.72;
    thump(a, 40, 0.8, 0.6, 0.25, 0.4); noise(a, { f: 600, f1: 100, type: 'lowpass', d: 1.2, g: 0.3, at: 0.25 });
    chime(a, [392, 523, 659, 784], 0.1, 0.06, 0.7, 'triangle', 0.9, 0.5);
  };
  function sfx(kind, beast) {
    const a = audio(); if (!a) return;
    const fn = SFX[kind]; if (!fn) return;
    const now = a.currentTime; if (sfxLast[kind] != null && now - sfxLast[kind] < 0.035) return;
    sfxLast[kind] = now;
    vary = 1 + (Math.random() - 0.5) * 0.08;
    // A missing node type in an old browser stays silent rather than breaking the frame
    try { fn(a, beast || (P.mount ? P.mount.type : 'stag')); } catch (e) { /* silent */ }
  }
