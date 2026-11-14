  // ---------- Debug hook: open the game with #debug to reach the live state from the console ----------
  // Used by play-tests and the CI smoke test. Nothing here runs in a normal session.
  if (location.hash === '#debug') {
    window.MM_DEBUG = { G, P, PR, B, creeps, groundRelics, RELICS, dropRelic, takeRelic, spawnCreep, worldTier, player, recalc, renderHero, strike, poisonHero, applyRend, WARDEN,
      royals, startRoyalHunt, startHunt, enterWorld, WORLDS, raiders, startRaid, startWave, wavePool, KITS, dropGear, swordFeed, upgradeSword, openInv, jump, startEvent, startStage, NEUTRAL_CAMPS, damageRaider, damageRoyal,
      ascend, wakeMythic, saveGame, loadGame, deathPenalty, killPlayer, respawn, takeRelic, WORLDS, mythics, killCreep, killRoyal, startRoyal, groundAt, chests, RINGS, beasts, beginTame, camera, frame,
      sfx, SFX, sfxMeter, pollPad };
  }
  // Renders one sound effect offline and reports its length, peak and loudness, for tuning levels without listening
  async function sfxMeter(kind, beast) {
    const keep = { ac, bus, wet, noiseBuf };
    if (!audio()) return null;
    const o = new OfflineAudioContext(1, 44100 * 5, 44100), real = { noiseBuf };
    bus = o.createGain(); bus.connect(o.destination); wet = o.createGain(); wet.gain.value = 0.22; wet.connect(bus);
    noiseBuf = o.createBuffer(1, real.noiseBuf.length, real.noiseBuf.sampleRate); noiseBuf.copyToChannel(real.noiseBuf.getChannelData(0), 0);
    ac = o; vary = 1;
    try { SFX[kind](o, beast || 'stag'); } finally { ({ ac, bus, wet, noiseBuf } = keep); }
    const d = (await o.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); peak = Math.max(peak, v); sum += v * v; if (v > 0.01) last = i; }
    return { kind, beast: beast || '', len: +(last / 44100).toFixed(2), peak: +peak.toFixed(2), rms: +Math.sqrt(sum / Math.max(1, last)).toFixed(3) };
  }
