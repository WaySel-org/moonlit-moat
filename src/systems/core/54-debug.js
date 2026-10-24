  // ---------- Debug hook: open the game with #debug to reach the live state from the console ----------
  // Used by play-tests and the CI smoke test. Nothing here runs in a normal session.
  if (location.hash === '#debug') {
    window.MM_DEBUG = { G, P, PR, B, creeps, groundRelics, RELICS, dropRelic, takeRelic, spawnCreep, worldTier, player, recalc, renderHero, strike, poisonHero, applyRend, WARDEN,
      royals, startRoyalHunt, startHunt, enterWorld, WORLDS, raiders, startRaid, startWave, wavePool, KITS, dropGear, swordFeed, upgradeSword, openInv, jump, startEvent, startStage, NEUTRAL_CAMPS, damageRaider, damageRoyal,
      ascend, wakeMythic, mythics, killCreep, killRoyal, startRoyal, groundAt, chests, RINGS, frame };
  }
