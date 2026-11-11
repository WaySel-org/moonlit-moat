  // ---------- Sound (synthesised in the browser, starts on first input) ----------
  // No audio files: every effect is built from noise and oscillators on a shared bus (compressor plus a small room
  // reverb). sfx(name, beast) plays one named effect; beast is 'stag', 'gryphon' or 'drake' for moves that use a
  // beast's voice (it defaults to the ridden one). Each call is detuned a few percent so repeats never sound identical,
  // and the same effect is not restarted within 35 ms, so a sweep that hits six creeps at once does not stack six sounds.
  let ac = null, noiseBuf = null, bus = null, wet = null, clipCurve = null, vary = 1, sfxGain = 1;
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
    const t = a.currentTime + (o.at || 0), src = a.createBufferSource();
    src.buffer = noiseBuf; src.playbackRate.value = vary;
    const f = a.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f * vary, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1 * vary, t + (o.fd || o.d));
    const g = sfxEnv(a, t, o); src.connect(f).connect(g); sfxOut(a, g, o);
    src.start(t, Math.random() * 1.2); src.stop(t + o.d + 0.05);
  }
  // Oscillator; o.f sweeps to o.f1 over o.fd (default the whole sound); o.lp adds a lowpass, o.vib a wobble in Hz
  function tone(a, o) {
    const t = a.currentTime + (o.at || 0), osc = a.createOscillator(); osc.type = o.type || 'sine';
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
    const t = a.currentTime + (at || 0), src = a.createBufferSource(); src.buffer = noiseBuf;
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
    const t = a.currentTime + (o.at || 0), d = o.d;
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
  const BOSS = {
    // The Gate Warden: a stone and iron giant. A struck gate gong, grinding stone, a deep throat.
    warden: a => { metal(a, 98, 2.2, 0.12, 0, 0.7); growl(a, { f: 38, d: 1.4, g: 0.55, rate: 18, form: 240, lp: 1200, a: 0.2, wet: 0.4, at: 0.1 }); noise(a, { f: 300, f1: 140, q: 3, d: 1.2, g: 0.15 }); },
    // Vesthra, the Gorgon: a long serpent hiss, a tail rattle and a cold, wavering note
    gorgon: a => { noise(a, { f: 5500, type: 'highpass', d: 1.3, g: 0.22, a: 0.2 }); ticks(a, 16, 0.9, 4500, 0.08, 0.2); tone(a, { f: 440, f1: 415, d: 1.3, g: 0.05, vib: 6, a: 0.3, wet: 0.6 }); },
    // Nyxara, the Thorn Empress: a high wail over creaking wood and snapping thorns
    empress: a => { tone(a, { f: 660, f1: 520, d: 1.4, g: 0.07, type: 'triangle', vib: 5.5, a: 0.25, wet: 0.6 }); tone(a, { f: 990, f1: 780, d: 1.3, g: 0.035, vib: 5.5, a: 0.3, wet: 0.6 }); ticks(a, 12, 1.0, 2500, 0.1); tone(a, { f: 70, f1: 55, d: 1.0, g: 0.08, type: 'sawtooth', lp: 400 }); },
    // Both queens at once: a war horn under the hiss and the wail
    royals: a => { SFX.horn(a); BOSS.gorgon(a); BOSS.empress(a); },
    // Cinderwing: a dragon's screech over a fire roar
    cinderwing: a => { tone(a, { f: 1100, f1: 600, d: 1.0, g: 0.08, type: 'sawtooth', lp: 3500, vib: 30, wet: 0.4 }); growl(a, { f: 70, d: 1.0, g: 0.35, rate: 30, form: 420 }); noise(a, { f: 2000, f1: 600, type: 'lowpass', d: 1.0, g: 0.3, a: 0.1 }); },
    // Gorgemaw, the Grave Glutton: a slow, wet belly gurgle with bubbles rising through it
    gorger: a => { growl(a, { f: 32, d: 1.4, g: 0.5, rate: 9, form: 220, lp: 900, breath: 1.6, wet: 0.3 }); for (let i = 0; i < 10; i++) { const f = 150 + Math.random() * 250; tone(a, { f, f1: f * 1.8, d: 0.06, g: 0.07, at: Math.random() * 1.2 }); } },
    // Raiders
    wyrm: a => { flaps(a, 3, 0.25); growl(a, { f: 50, d: 1.2, g: 0.45, rate: 24, form: 360, wet: 0.35, at: 0.2 }); tone(a, { f: 700, f1: 400, d: 0.9, g: 0.06, type: 'sawtooth', lp: 2500, vib: 24, at: 0.2 }); },
    rime: a => { flaps(a, 3, 0.25); tone(a, { f: 1500, f1: 900, d: 0.9, g: 0.05, type: 'square', lp: 4000, vib: 25, at: 0.2, wet: 0.5 }); metal(a, 2200, 1.0, 0.04, 0.3, 0.7); whoosh(a, 1.0, 1500, 4500, 0.12, 0, 1.5); },
    rex: a => { thump(a, 40, 0.5, 0.7); thump(a, 40, 0.5, 0.7, 0.45); growl(a, { f: 30, d: 1.6, g: 0.6, rate: 14, form: 300, bend: 1.4, lp: 1400, a: 0.15, at: 0.6, wet: 0.35 }); },
    raptors: a => { for (let i = 0; i < 7; i++) tone(a, { f: 1800 + Math.random() * 600, f1: 2700, d: 0.09, g: 0.045, type: 'sawtooth', lp: 5000, at: Math.random() * 0.8 }); ticks(a, 14, 0.9, 3500, 0.07); },
    // Mythics
    minotaur: a => { noise(a, { f: 1400, f1: 500, d: 0.22, g: 0.35 }); thump(a, 60, 0.3, 0.5, 0.15); thump(a, 60, 0.3, 0.5, 0.35); growl(a, { f: 75, bend: 1.7, d: 1.3, g: 0.5, rate: 34, form: 480, at: 0.4, wet: 0.35 }); },
    oni: a => { thump(a, 70, 0.4, 0.65, 0, 0.3); thump(a, 70, 0.4, 0.65, 0.25, 0.3); [0.6, 0.82, 1.04].forEach((t, i) => growl(a, { f: 92 - i * 6, d: 0.2, g: 0.35, rate: 40, form: 600, bend: 1.1, at: t })); },
    manticore: a => { growl(a, { f: 95, bend: 1.5, d: 1.1, g: 0.5, rate: 36, form: 520, a: 0.08, wet: 0.35 }); ticks(a, 16, 0.5, 5000, 0.07, 1.0, 2); },
    basilisk: a => { noise(a, { f: 3500, type: 'highpass', d: 1.4, g: 0.2, a: 0.3 }); tone(a, { f: 55, d: 1.4, g: 0.14, type: 'sawtooth', lp: 300, a: 0.3, wet: 0.4 }); ticks(a, 10, 0.6, 800, 0.12, 0.8, 5); },
    kitsune: a => { [0, 0.3].forEach(t => tone(a, { f: 900, f1: 1800, fd: 0.08, d: 0.25, g: 0.07, type: 'triangle', vib: 12, at: t, wet: 0.5 })); chime(a, [1568, 2093, 2637], 0.12, 0.05, 0.7, 'sine', 0.55, 0.7); },
    cyclops: a => { thump(a, 45, 0.6, 0.7); tone(a, { f: 196, d: 1.2, g: 0.06, type: 'sawtooth', lp: 900, a: 0.2, wet: 0.5, at: 0.1 }); growl(a, { f: 48, d: 1.5, g: 0.6, rate: 20, form: 340, a: 0.15, at: 0.2, wet: 0.4 }); },
    hydra: a => { [[60, 300, 20], [85, 450, 28], [115, 600, 36]].forEach(([f, form, rate], i) => growl(a, { f, form, rate, d: 0.9, g: 0.3, at: i * 0.2, wet: 0.3 })); noise(a, { f: 4500, type: 'highpass', d: 1.1, g: 0.12, a: 0.2 }); },
    saltmarrow: a => { metal(a, 300, 2.0, 0.12, 0, 0.6); metal(a, 300, 2.0, 0.1, 0.6, 0.6); tone(a, { f: 80, f1: 60, d: 1.2, g: 0.08, type: 'sawtooth', lp: 500 }); noise(a, { f: 900, f1: 300, type: 'lowpass', d: 1.5, g: 0.3, a: 0.4 }); for (let i = 0; i < 8; i++) metal(a, 1800, 0.1, 0.03, 1.0 + i * 0.05); },
    vorrask: a => { noise(a, { f: 200, f1: 3000, type: 'lowpass', d: 1.0, g: 0.35, a: 0.9 }); tone(a, { f: 41, d: 1.6, g: 0.18, type: 'sawtooth', lp: 220, a: 0.2 }); tone(a, { f: 41.6, d: 1.6, g: 0.18, type: 'sawtooth', lp: 220, a: 0.2 }); for (let i = 0; i < 6; i++) tone(a, { f: 200 + Math.random() * 2000, d: 0.03, g: 0.04, type: 'square', at: 0.3 + Math.random() * 0.9 }); thump(a, 35, 0.6, 0.6, 1.0, 0.5); },
    thurnis: a => { [130.8, 196, 261.6, 392].forEach(f => tone(a, { f, f1: f * 1.5, d: 1.6, g: 0.05, a: 0.5, wet: 0.7 })); tone(a, { f: 3000, f1: 200, d: 0.8, g: 0.06, at: 0.4, wet: 0.5 }); thump(a, 38, 0.8, 0.7, 1.1, 0.5); noise(a, { f: 1200, f1: 150, type: 'lowpass', d: 0.8, g: 0.35, at: 1.1 }); },
    // World bosses
    matron: a => { [180, 184, 191, 197, 203].forEach(f => tone(a, { f, d: 1.4, g: 0.03, type: 'sawtooth', lp: 1500, vib: 40, a: 0.25, wet: 0.3 })); ticks(a, 14, 1.2, 3000, 0.06); growl(a, { f: 60, d: 0.8, g: 0.2, rate: 30, form: 400, at: 0.5 }); },
    halvane: a => { tone(a, { f: 300, f1: 1200, d: 0.6, g: 0.04, type: 'square', lp: 2500 }); thump(a, 90, 0.2, 0.5, 0.6); metal(a, 400, 0.25, 0.07, 0.6); noise(a, { f: 4000, type: 'highpass', d: 0.4, g: 0.12, at: 0.7 }); [0.9, 1.15].forEach(t => tone(a, { f: 880, d: 0.12, g: 0.04, type: 'square', lp: 3000, at: t })); },
    rot: a => { growl(a, { f: 45, d: 1.6, g: 0.45, rate: 7, form: 260, lp: 900, breath: 1.8, a: 0.3, wet: 0.35 }); tone(a, { f: 220, d: 1.4, g: 0.015, type: 'sawtooth', vib: 15, a: 0.3 }); noise(a, { f: 400, type: 'lowpass', d: 1.2, g: 0.25, a: 0.2 }); }
  };
  // Level trims so every boss arrives about as loud as the others
  const BOSS_GAIN = { raptors: 5, matron: 3, gorger: 2.5, kitsune: 2.2, empress: 2, rot: 1.8, manticore: 1.5, wyrm: 1.5, cinderwing: 1.4, hydra: 1.4, rime: 1.3 };
  const bossVoice = id => BOSS[id] ? (a => { sfxGain = BOSS_GAIN[id] || 1; try { BOSS[id](a); } finally { sfxGain = 1; } }) : SFX.roar;
  // Arrival or a signature roar mid-fight
  SFX.boss = (a, id) => bossVoice(id)(a);
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
