  // ---------- Save state and the death penalty ----------
  // Progress is kept in this browser's localStorage: level, gold, attributes, gear, relics, story and stages, the Warden,
  // Ascension, royal revivals and the world clock. It saves every ten seconds, on level-ups, travel and death, and
  // when the tab closes; opening the game again picks up where you left off. "New game" on the pause screen erases it.
  // Dying costs a fifth of your gold and one point from every attribute that has one.
  // Two modes, two saves: Free play keeps the original key, so saves from before the modes carry straight on; Story mode
  // (Season 1 and on) has its own. G.mode is unset until the player picks one, and nothing saves until then.
  const SAVE_KEYS = { free: 'moonlit-moat.save.v1', story: 'moonlit-moat.story.v1' };
  const saveKey = () => SAVE_KEYS[G.mode];
  const SAVED_PR = ['level', 'xp', 'gold', 'points', 'str', 'vit', 'agi', 'spi', 'weapon', 'armorLv', 'flaskMax', 'warden'];
  function saveGame() {
    if (!G.mode || G.state === 'won') return;
    const dead = G.state === 'dead', w = G.storm ? G.storm.from : G.world;
    const at = dead || G.storm ? spawnOf(w) : player.position;
    const ST = G.story;
    const s = {
      v: 1, at: Date.now(),
      pr: Object.fromEntries(SAVED_PR.map(k => [k, PR[k]])), relics: PR.relics.slice(), inv: PR.inv,
      story: { unlocked: ST.unlocked, shards: ST.shards, step: ST.step, prog: ST.prog, stage: ST.stage, nextStage: ST.nextStage, pending: ST.pending, heartRewarded: ST.heartRewarded },
      objs: Object.fromEntries(Object.values(WORLDS).map(W => [W.id, W.objs.map(o => [o.p.x, o.p.z])])),
      wardenDown: G.wardenDown, wardenRevives: G.wardenRevives || 0, ascension: G.ascension || 0, deaths: G.deaths || 0,
      royals: royals.map(r => r.lv), royalLull: G.royalLull,
      royalReviveTimers: royals.map(r => r.field && !r.alive ? r.revive : 0),
      waveN: G.waveN, elapsed: uTime.value - G.runStart, mazeSeed,
      world: w, pos: [at.x, at.z], lastPos: G.lastPos
    };
    try { localStorage.setItem(saveKey(), JSON.stringify(s)); } catch (e) { /* private mode or storage full: play on unsaved */ }
  }
  function loadGame() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(saveKey()) || 'null'); } catch (e) { return false; }
    if (!s || s.v !== 1 || !s.pr) return false;
    try {
      SAVED_PR.forEach(k => { if (s.pr[k] !== undefined) PR[k] = s.pr[k]; });
      PR.relics = (s.relics || []).filter(id => RELICS[id]);
      if (s.inv && s.inv.sword && Array.isArray(s.inv.bag)) PR.inv = { sword: s.inv.sword, charms: (s.inv.charms || [null, null]).slice(0, 2), bag: s.inv.bag.slice(0, 8).concat(Array(8).fill(null)).slice(0, 8) };
      const ST = G.story;
      ['unlocked', 'shards', 'step', 'prog', 'stage', 'nextStage'].forEach(k => { if (s.story && s.story[k]) ST[k] = Object.assign(ST[k] || {}, s.story[k]); });
      ST.pending = s.story?.pending || null;
      // All-shard saves from before this flag cannot distinguish a paid finale from a missed one.
      ST.heartRewarded = s.story?.heartRewarded ?? (shardCount() === CHAPTERS.length);
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
      G.royalLull = Math.max(0, s.royalLull || 0);
      royals.forEach((r, i) => {
        const lv = s.royals?.[i], revive = Math.max(0, s.royalReviveTimers?.[i] || 0);
        if (lv) { r.lv = lv; r.max = 0; royalStats(r); r.hp = r.max; }
        if (G.royalLull > 0 || revive > 0) {
          Object.assign(r, { alive: false, active: false, state: 'dead', field: G.royalLull === 0, hp: 0, t: 0, revive });
          r.g.visible = false;
        }
      });
      G.runStart = uTime.value - Math.max(0, s.elapsed || 0);
      G.lastTier = worldTier(); G.env = ENVS[(G.lastTier - 1) % ENVS.length]; G.envSnap = true;
      if (Number.isInteger(s.mazeSeed)) mazeSeed = s.mazeSeed >>> 0;
      genMaze(G.lastTier);
      G.lastPos = s.lastPos || {};
      recalc(); resetVitals(); renderHero(); renderGear(); renderRelics();
      const w = s.world, pos = s.pos || [0, 0];
      if (w && w !== 'moat' && WORLDS[w] && ST.unlocked[w]) enterWorld(w, { x: pos[0], z: pos[1] }, 'respawn');
      else {
        let [x, z] = pos, h = groundAt(x, z);
        if (h >= 50 && mazeSolid(x, z)) {
          const cell = mazeCellCenter(x, z);
          x = cell.x; z = cell.z; h = groundAt(x, z);
        }
        if (h < 50) { player.position.set(x, h, z); P.y = h; } else player.position.copy(SPAWN);
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
    try { localStorage.removeItem(saveKey()); } catch (e) { /* nothing to erase */ }
    setPause(false); resetGame(); saveGame();
    showBanner('A new game', 'Your old save is gone. The moon rises on a fresh start.', 'title'); bannerTimer = 3;
  });

  // ----- The mode picker: shown every time the game opens -----
  // A save from the story branch, made before the modes split, carries Season 1 flags in the shared key: it becomes
  // the Story save (once, if there is none yet). Free play keeps it too and simply ignores the story flags.
  try {
    const old = JSON.parse(localStorage.getItem(SAVE_KEYS.free) || 'null');
    if (old && old.story && old.story.prog && old.story.prog.s1open && !localStorage.getItem(SAVE_KEYS.story)) localStorage.setItem(SAVE_KEYS.story, JSON.stringify(old));
  } catch (e) { /* no storage: both modes start fresh */ }
  const modeEl = $('#modesel');
  function modeSummary(mode) {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEYS[mode]) || 'null'); } catch (e) { /* none */ }
    if (!s || !s.pr) return mode === 'story' ? 'Begin the story' : 'Start fresh';
    const shards = s.story && s.story.shards ? Object.values(s.story.shards).filter(Boolean).length : 0;
    return `Continue · Level ${s.pr.level || 1}, ${shards} of 4 shards${s.ascension ? `, Ascension ${s.ascension}` : ''}`;
  }
  function showModes() {
    $('#modestorysave').textContent = modeSummary('story');
    $('#modefreesave').textContent = modeSummary('free');
    G.menu = true; keys.clear(); modeEl.hidden = false;
    $('#modestory').focus();
  }
  function chooseMode(mode) {
    if (modeEl.hidden) return;
    modeEl.hidden = true; G.menu = false; G.mode = mode;
    try { localStorage.setItem('moonlit-moat.mode', mode); } catch (e) { /* fine */ }
    if (!loadGame()) {
      saveGame();
      if (mode === 'free') { showBanner('Free play', 'The open moat, no story. Your progress saves automatically in this browser.', 'title'); bannerTimer = 4; }
    }
  }
  $('#modestory').addEventListener('click', () => chooseMode('story'));
  $('#modefree').addEventListener('click', () => chooseMode('free'));
  window.addEventListener('keydown', ev => {
    if (modeEl.hidden) return;
    if (ev.code === 'Digit1' || ev.code === 'Numpad1') { ev.preventDefault(); chooseMode('story'); }
    else if (ev.code === 'Digit2' || ev.code === 'Numpad2') { ev.preventDefault(); chooseMode('free'); }
    else if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown') { ev.preventDefault(); (document.activeElement === $('#modestory') ? $('#modefree') : $('#modestory')).focus(); }
    else if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); chooseMode(document.activeElement === $('#modefree') ? 'free' : 'story'); }
    ev.stopImmediatePropagation();
  }, true);
  // Changing mode from the pause screen: save this one, then reopen the game at the picker
  $('#modebtn').addEventListener('click', () => { saveGame(); location.reload(); });
  // Remember the last choice so it is the one already highlighted
  showModes();
  try { if (localStorage.getItem('moonlit-moat.mode') === 'free') $('#modefree').focus(); } catch (e) { /* fine */ }
  setInterval(() => { if (!G.paused) saveGame(); }, 10000);
  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
