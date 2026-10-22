  // ---------- Sound (synthesised, starts on first input) ----------
  let ac = null, noiseBuf = null;
  function audio() {
    if (!S.sound) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return ac;
  }
  function noise(a, dur, freq, gain, type) {
    const src = a.createBufferSource(); src.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq;
    const g = a.createGain(); const t = a.currentTime;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur);
  }
  function tone(a, dur, f0, f1, gain, type) {
    const o = a.createOscillator(); o.type = type || 'sine'; const g = a.createGain(); const t = a.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
  }
  function sfx(kind) {
    const a = audio(); if (!a) return;
    if (kind === 'swing') noise(a, 0.12, 2400, 0.08);
    else if (kind === 'hit') { noise(a, 0.14, 900, 0.3); tone(a, 0.12, 160, 60, 0.25); }
    else if (kind === 'heavyhit') { noise(a, 0.22, 600, 0.4); tone(a, 0.2, 120, 40, 0.35); }
    else if (kind === 'clang') { tone(a, 0.3, 880, 840, 0.12, 'square'); tone(a, 0.35, 1320, 1250, 0.07, 'square'); }
    else if (kind === 'parry') { tone(a, 0.5, 1560, 1500, 0.12, 'triangle'); tone(a, 0.5, 2340, 2300, 0.08, 'triangle'); noise(a, 0.1, 4000, 0.15); }
    else if (kind === 'boom') { tone(a, 0.6, 80, 30, 0.5); noise(a, 0.5, 300, 0.35, 'lowpass'); }
    else if (kind === 'hurt') { tone(a, 0.22, 240, 90, 0.18, 'sawtooth'); noise(a, 0.12, 700, 0.2); }
    else if (kind === 'roll') noise(a, 0.2, 500, 0.08, 'lowpass');
    else if (kind === 'drink') { tone(a, 0.3, 500, 900, 0.08, 'triangle'); }
    else if (kind === 'pop') { noise(a, 0.18, 1400, 0.05); noise(a, 0.4, 300, 0.04, 'lowpass'); }
    else if (kind === 'coin') { tone(a, 0.08, 1320, 1320, 0.06, 'square'); setTimeout(() => { const b = audio(); if (b) tone(b, 0.18, 1760, 1760, 0.05, 'square'); }, 70); }
    else if (kind === 'swoosh') { noise(a, 0.2, 3200, 0.14); noise(a, 0.16, 1100, 0.08); }
    else if (kind === 'roar') { tone(a, 1.2, 90, 50, 0.35, 'sawtooth'); noise(a, 0.6, 250, 0.3, 'lowpass'); }
    else if (kind === 'cast') { tone(a, 0.35, 520, 1300, 0.1, 'triangle'); noise(a, 0.25, 3000, 0.06); }
    else if (kind === 'pickup') { tone(a, 0.12, 660, 880, 0.1, 'triangle'); setTimeout(() => { const b = audio(); if (b) tone(b, 0.2, 990, 1320, 0.09, 'triangle'); }, 90); }
  }
