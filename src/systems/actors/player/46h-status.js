  // ---------- Status effects and timers shared by the hero kit and the enemy kits ----------
  // Chill slows the hero, burn ticks fire damage through armour, stone (frozen, petrified, devoured) stops every action.
  // Blade Spin (the hero's 'spin' act) shrugs off chill and stone. after(t, fn) runs fn once t seconds of game time
  // have passed, so pauses and hitstop delay it. Ground strikes carry their effects as fields (see strikeEffects).
  Object.assign(P, { chill: 0, chillK: 0, burn: 0, burnDps: 0 });
  const timers = [];
  function after(t, fn) { timers.push({ t, fn }); }
  const heroSlow = () => P.chill > 0 ? 1 - P.chillK : 1;
  const heroUnstoppable = () => P.act === 'spin';
  function heroWord(text, col, h) { floatText(text, player.position.clone().add(new THREE.Vector3(0, h || 2.6, 0)), 'word', col); }
  // k is the share of speed lost, up to 70%. Pass word false to slow silently (an aura).
  function chillHero(secs, k, word) {
    if (P.hp <= 0 || heroUnstoppable()) return;
    if (P.chill <= 0) { P.chillK = 0; if (word !== false) heroWord(word || 'CHILLED', '#bfe8ff'); }
    P.chill = Math.max(P.chill, secs); P.chillK = Math.min(0.7, Math.max(P.chillK, k));
  }
  function burnHero(secs, dps) {
    if (P.hp <= 0) return;
    if (P.burn <= 0) { P.burnDps = 0; heroWord('BURNING', '#ff8a3a'); }
    P.burn = Math.max(P.burn, secs); P.burnDps = Math.max(P.burnDps, dps);
  }
  // Returns false when Blade Spin resists it
  function stoneHero(secs, word, col) {
    if (heroUnstoppable()) { heroWord('resisted', '#ffd36a'); return false; }
    P.stone = Math.max(P.stone, secs); if (word) heroWord(word, col || '#bfe8ff', 2.4);
    return true;
  }
  // What a ground strike does to the hero once it lands on them
  function strikeEffects(s) {
    if (s.freeze) stoneHero(s.freeze, s.freezeWord || 'FROZEN', s.freezeCol);
    if (s.poison) poisonHero(s.poison, s.poisonT || 5);
    if (s.chill) chillHero(s.chillT || 3, s.chill, s.chillWord);
    if (s.burn) burnHero(s.burn, s.burnDps || 6);
    if (s.onHit) s.onHit(s);
  }
  // Runs every unpaused frame from updateStatus
  function statusTick(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { const tm = timers[i]; tm.t -= dt; if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); } }
    const pp = player.position;
    if (P.chill > 0) {
      P.chill -= dt; if (P.chill <= 0) { P.chill = 0; P.chillK = 0; }
      if (Math.random() < 0.35) { fwColor.setHSL(0.55, 0.6, 0.85); fwParticle(pp.x + (Math.random() - 0.5), pp.y + 0.4 + Math.random() * 1.4, pp.z + (Math.random() - 0.5), 0, 0.5, 0, fwColor, 0.6, true); }
    }
    if (P.burn > 0) {
      P.burn -= dt; if (P.burn <= 0) P.burn = 0;
      burnPlayer(P.burnDps * dt);
      if (Math.random() < 0.5) { fwColor.setHSL(0.04 + Math.random() * 0.06, 1, 0.55); fwParticle(pp.x + (Math.random() - 0.5) * 0.8, pp.y + 0.3 + Math.random() * 1.6, pp.z + (Math.random() - 0.5) * 0.8, 0, 1.5, 0, fwColor, 0.5, true); }
    }
  }
  function clearStatus() { P.chill = 0; P.chillK = 0; P.burn = 0; P.burnDps = 0; timers.length = 0; }
