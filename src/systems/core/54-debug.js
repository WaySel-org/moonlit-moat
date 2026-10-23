  // ---------- Debug hook: open the game with #debug to reach the live state from the console ----------
  // Used by play-tests and the CI smoke test. Nothing here runs in a normal session.
  if (location.hash === '#debug') {
    window.MM_DEBUG = { G, P, PR, B, creeps, groundRelics, RELICS, dropRelic, takeRelic, spawnCreep, worldTier, player, recalc, renderHero, strike, poisonHero, applyRend, WARDEN };
  }
