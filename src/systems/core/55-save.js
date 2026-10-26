  // ---------- Save state and the death penalty ----------
  // Progress is kept in this browser's localStorage: level, gold, attributes, gear, relics, story and stages, the Warden,
  // Ascension, the royals' levels and the world clock. It saves every ten seconds, on level-ups, travel and death, and
  // when the tab closes; opening the game again picks up where you left off. "New game" on the pause screen erases it.
  // Dying costs a fifth of your gold and one point from every attribute that has one.
  const SAVE_KEY = 'moonlit-moat.save.v1';
  const SAVED_PR = ['level', 'xp', 'gold', 'points', 'str', 'vit', 'agi', 'spi', 'weapon', 'armorLv', 'flaskMax', 'warden'];
  function saveGame() {
    if (G.state === 'won') return;
    const dead = G.state === 'dead', w = G.storm ? G.storm.from : G.world;
    const at = dead || G.storm ? spawnOf(w) : player.position;
    const s = {
      v: 1, at: Date.now(),
      pr: Object.fromEntries(SAVED_PR.map(k => [k, PR[k]])), relics: PR.relics.slice(), inv: PR.inv,
      story: { unlocked: G.story.unlocked, shards: G.story.shards, step: G.story.step, prog: G.story.prog, stage: G.story.stage, nextStage: G.story.nextStage },
      objs: Object.fromEntries(Object.values(WORLDS).map(W => [W.id, W.objs.map(o => [o.p.x, o.p.z])])),
      wardenDown: G.wardenDown, wardenRevives: G.wardenRevives || 0, ascension: G.ascension || 0, deaths: G.deaths || 0,
      royals: royals.map(r => r.lv), waveN: G.waveN, elapsed: uTime.value - G.runStart,
      world: w, pos: [at.x, at.z], lastPos: G.lastPos
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* private mode or storage full: play on unsaved */ }
  }
  function loadGame() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return false; }
    if (!s || s.v !== 1 || !s.pr) return false;
    try {
      SAVED_PR.forEach(k => { if (s.pr[k] !== undefined) PR[k] = s.pr[k]; });
      PR.relics = (s.relics || []).filter(id => RELICS[id]);
      if (s.inv && s.inv.sword && Array.isArray(s.inv.bag)) PR.inv = { sword: s.inv.sword, charms: (s.inv.charms || [null, null]).slice(0, 2), bag: s.inv.bag.slice(0, 8).concat(Array(8).fill(null)).slice(0, 8) };
      const ST = G.story;
      ['unlocked', 'shards', 'step', 'prog', 'stage', 'nextStage'].forEach(k => { if (s.story && s.story[k]) ST[k] = Object.assign(ST[k] || {}, s.story[k]); });
      Object.values(WORLDS).forEach(W => {
        const pts = s.objs && s.objs[W.id];
        W.objs.forEach((o, i) => {
          if (pts && pts[i]) { o.p.set(pts[i][0], 0, pts[i][1]); o.g.position.copy(o.p); if (W.id === 'neon') o.g.rotation.y = Math.atan2(-o.p.x, -o.p.z); }
          W.objLook(o, (ST.prog[W.id] || [])[i] >= 1);
        });
      });
      G.wardenRevives = s.wardenRevives || 0; G.deaths = s.deaths || 0; G.waveN = s.waveN || {};
      if (s.wardenDown) { G.wardenDown = true; PR.warden = true; B.state = 'dead'; boss.visible = false; G.state = 'interlude'; }
      if (s.ascension) { G.ascension = s.ascension; applyEdge(); }
      (s.royals || []).forEach((lv, i) => { const r = royals[i]; if (r && lv) { r.lv = lv; r.max = 0; royalStats(r); r.hp = r.max; } });
      G.runStart = uTime.value - Math.max(0, s.elapsed || 0);
      G.lastTier = worldTier(); G.env = ENVS[(G.lastTier - 1) % ENVS.length]; G.envSnap = true;
      G.lastPos = s.lastPos || {};
      recalc(); resetVitals(); renderHero(); renderGear(); renderRelics();
      const w = s.world, pos = s.pos || [0, 0];
      if (w && w !== 'moat' && WORLDS[w] && ST.unlocked[w]) enterWorld(w, { x: pos[0], z: pos[1] }, 'respawn');
      else {
        const h = groundAt(pos[0], pos[1]);
        if (h < 50) { player.position.set(pos[0], h, pos[1]); P.y = h; } else player.position.copy(SPAWN);
      }
      const shards = CHAPTERS.filter(c => ST.shards[c]).length;
      if (PR.level > 1 || PR.gold > 0 || shards) showBanner('Welcome back', `Level ${PR.level}, ${PR.gold} gold, ${shards} of 4 shards${G.ascension ? `, Ascension ${G.ascension}` : ''}. Your progress saves automatically in this browser. New game is on the pause screen.`, 'title');
      bannerTimer = 5;
      return true;
    } catch (e) {
      console.warn('Moonlit Moat: could not load the save, starting fresh', e);
      return false;
    }
  }
  // Applied the moment the hero falls, so a refresh can't dodge it
  function deathPenalty() {
    const gold = Math.round(PR.gold * 0.2), lost = [];
    PR.gold -= gold; G.lastLostGold = gold; G.deaths = (G.deaths || 0) + 1;
    [['str', 'Strength'], ['vit', 'Vitality'], ['agi', 'Agility'], ['spi', 'Spirit']].forEach(([k, n]) => { if (PR[k] > 0) { PR[k]--; lost.push(`-1 ${n}`); } });
    recalc(); saveGame();
    const parts = [gold ? `-${gold} gold` : null].concat(lost).filter(Boolean);
    return `You keep your level, but death takes its toll: ${parts.length ? parts.join(', ') : 'nothing this time'}.`;
  }

  // New game: two taps on the pause screen, so it can't happen by accident
  const newBtn = $('#newgame');
  newBtn.addEventListener('click', () => {
    if (newBtn.dataset.armed !== '1') { newBtn.dataset.armed = '1'; newBtn.textContent = 'Tap again to erase your save'; setTimeout(() => { newBtn.dataset.armed = ''; newBtn.textContent = 'New game'; }, 3000); return; }
    newBtn.dataset.armed = ''; newBtn.textContent = 'New game';
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to erase */ }
    setPause(false); resetGame(); saveGame();
    showBanner('A new game', 'Your old save is gone. The moon rises on a fresh start.', 'title'); bannerTimer = 3;
  });

  loadGame();
  setInterval(() => { if (!G.paused) saveGame(); }, 10000);
  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
