  // ---------- World system: story progression and travel ----------
  function freshStory() { return { unlocked: { moat: true }, shards: {}, step: { moat: 0, veyra: 0, neon: 0, ash: 0 }, prog: { veyra: [0, 0, 0], neon: [0, 0, 0], ash: [0, 0, 0] }, stage: { veyra: 1, neon: 1, ash: 1 }, nextStage: {}, lastEvent: null, pending: null }; }
  G.story = freshStory(); G.lastPos = {}; G.storm = null; G.stormClock = 0;
  const hudTitle = $('#hud h1');
  function resetStory() {
    if (G.world !== 'moat') showWorld('moat');
    endEvent(true); G.eventClock = 0;
    G.story = freshStory(); G.lastPos = {}; G.storm = null; G.stormClock = 0;
    Object.values(WORLDS).forEach(W => W.objs.forEach(o => W.objLook(o, false)));
  }
  const shardCount = () => CHAPTERS.filter(w => G.story.shards[w]).length;

  function chapterText(w) {
    const ST = G.story, n = CHAPTERS.indexOf(w) + 1, W = WORLDS[w], next = CHAPTERS[n];
    if (w === 'moat') {
      const base = ascensionText() || (G.wardenDown ? OBJ_CLIMB : OBJ_START);
      if (shardCount() === CHAPTERS.length) return `${base} The World Heart is whole.`;
      return ST.shards.moat ? `${base} The World Gate beside the shrine leads to the other shards.` : base;
    }
    if (!ST.unlocked[w]) return `${W.name} is still sealed. Its shard sleeps until you open the way.`;
    const lab = stageOf(w) > 1 ? `Stage ${stageOf(w)}` : `Chapter ${n}`;
    if (ST.step[w] === 2) return `${W.name}: ${SHARD[w]} is yours.${G.world === w ? stageText(w) : ''}${next && !G.storm && ST.unlocked[next] && !ST.shards[next] ? ` Use the World Gate to reach ${WNAME[next]}.` : ''}`;
    if (ST.step[w] === 1) return `${lab} \u00b7 ${W.name}: ${W.bossName} has risen. Defeat it to claim ${SHARD[w]}.`;
    return `${lab} \u00b7 ${W.name}: ${W.task} (${ST.prog[w].filter(v => v >= 1).length}/3).`;
  }
  function objectiveText() {
    const ev = [royalHuntText(), waveText(), eventText()].filter(Boolean).join(' '), t = (ev ? ev + ' ' : '') + chapterText(G.world);
    return G.storm ? `Rift storm \u00b7 ${fmtTime(Math.ceil(Math.max(0, G.storm.t)))} until it lets go. ${t}` : t;
  }
  function worldPrompt() {
    const W = WORLDS[G.world]; if (!W) return null;
    const open = G.story.unlocked[W.id], pr = G.story.prog[W.id];
    for (let i = 0; i < W.objs.length; i++) {
      if (pr[i] >= 1) continue;
      const d = flatDist(player.position, W.objs[i].p);
      if (W.id === 'neon' && d < 3.4) return !open ? 'This relay is dead. Neon Verge is still sealed.' : d < 2.5 ? `Hacking relay \u00b7 ${Math.floor(pr[i] * 100)}% (stay close)` : 'Step closer to hack the relay';
      if (W.id === 'veyra' && d < 3 && !open) return 'The seed will not wake. Veyra is still sealed.';
    }
    return null;
  }
  function worldInteract() {
    const W = WORLDS[G.world];
    if (flatDist(player.position, W.gate) < 3) return { kind: 'wgate' };
    if (W.id === 'ash') for (let i = 0; i < W.objs.length; i++) if (G.story.prog.ash[i] < 1 && flatDist(player.position, W.objs[i].p) < 2.4) return { kind: 'survivor', s: W.objs[i] };
    return null;
  }
  function rescue(s) {
    const W = ashW;
    if (!G.story.unlocked.ash) { floatText('They are too frightened to move', player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#ffd08a'); return; }
    const i = W.objs.indexOf(s); if (i < 0 || G.story.prog.ash[i] >= 1) return;
    G.story.prog.ash[i] = 1; objectiveDone(W, i);
  }
  function objectiveDone(W, i) {
    const ST = G.story, o = W.objs[i], m = tierMult(worldTier());
    W.objLook(o, true); sfx('pickup'); burst(o.p.x, 1.2, o.p.z, 30, 5);
    reward(60 * m, 40 * m, o.p.clone().add(new THREE.Vector3(0, 2.6, 0)));
    const n = ST.prog[W.id].filter(v => v >= 1).length;
    floatText(`${W.objWord} ${n}/3`, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', W.objCol);
    if (n >= 3 && ST.step[W.id] === 0) {
      ST.step[W.id] = 1;
      const b = storyBossOf(W.id); if (b && !b.alive) b.respawn = 1.5;
      showBanner(`${W.bossName} stirs`, W.bossLine, 'title'); bannerTimer = 4.5; sfx('roar');
    }
  }
  // A shard is taken: open the next world and, after a banner, carry the hero there
  function completeChapter(w) {
    const ST = G.story; if (ST.shards[w]) { stageClear(w); return; }
    ST.shards[w] = true; ST.step[w] = 2;
    const next = CHAPTERS[CHAPTERS.indexOf(w) + 1];
    if (next) ST.unlocked[next] = true;
    if (w !== 'moat') {
      const m = tierMult(worldTier());
      reward(500 * m, 350 * m, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
      PR.points++; renderHero();
    }
    ST.pending = { t: w === 'moat' ? 10 : 6, w, to: next || null, shown: false, whole: shardCount() === CHAPTERS.length };
  }
  function storyBanner(p) {
    const n = shardCount();
    if (p.whole) {
      const m = tierMult(worldTier());
      showBanner('The World Heart is whole', `All four shards are back together and the Sundering is mended. The worlds keep drifting, though: tiers rise, the Warden hunts and rifts still open. Keep going.`, 'title'); bannerTimer = 7;
      reward(2500 * m, 1500 * m, player.position.clone().add(new THREE.Vector3(0, 3.6, 0)));
      PR.points += 3; if (PR.flaskMax < 6) PR.flaskMax++; recalc(); P.hp = P.max; P.mana = P.manaMax; P.armor = P.armorMax; P.flasks = PR.flaskMax;
      for (let i = 0; i < 4; i++) launchFirework(player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6)));
      return;
    }
    showBanner(`Shard ${n} of 4`, `You hold ${SHARD[p.w]}. It pulls toward ${WNAME[p.to]}, and the way there is open.`, 'title'); bannerTimer = 3.5;
  }

  function travelBlock(ignoreStorm) {
    if (G.state === 'dead' || G.state === 'won') return 'Not now';
    if (G.realm === 'spirit') return 'The World Gate does not answer in the Spirit Realm';
    if (G.hunt) return 'Not while the Warden hunts you';
    if (G.state === 'fight' || G.state === 'intro' || G.state === 'royal') return 'Not in the middle of a boss fight';
    if (storyBossEngaged()) return 'Not while a shard guardian is on you';
    if (G.storm && !ignoreStorm) return 'The rift storm holds you here';
    if (P.act === 'leap') return 'Land first';
    return null;
  }
  function showWorld(w) {
    G.world = w; G.lock = false; G.target = null; G.envSnap = true;
    moatGroup.visible = w === 'moat';
    Object.values(WORLDS).forEach(W => { W.group.visible = W.id === w; });
    const rk = realmKey();
    creeps.forEach(c => { c.g.visible = c.alive && c.realm === rk; if (c.realm !== rk) { c.bar.hidden = true; c.tele.hide(); c.atk = null; } });
    hudTitle.textContent = WNAME[w];
  }
  // mode: 'gate' | 'story' | 'stormIn' | 'stormEnd' | 'respawn'
  function enterWorld(to, at, mode) {
    if (mode === 'gate' || mode === 'story' || mode === 'stormIn') G.lastPos[G.world] = { x: player.position.x, z: player.position.z };
    if (P.mount) dismount(true);
    endEvent(true);
    if (G.realm === 'spirit') setRealm('material', true);
    // Anything still in flight belongs to the world being left
    bolts.forEach(b => { scene.remove(b.m); b.m.material.dispose(); }); bolts.length = 0;
    cshots.forEach(s => scene.remove(s.m)); cshots.length = 0;
    shots.forEach(s => scene.remove(s.m)); shots.length = 0;
    patches.forEach(p => { scene.remove(p.m); p.m.material.dispose(); }); patches.length = 0;
    loot.forEach(l => { scene.remove(l.m); l.m.material.dispose(); }); loot.length = 0;
    souls.forEach(s => scene.remove(s.m)); souls.length = 0;
    waves.forEach(w => { scene.remove(w.m); w.m.material.dispose(); }); waves.length = 0;
    if (dragon.atk && dragon.atk.m) scene.remove(dragon.atk.m);
    dragon.atk = null; dragon.tele.hide(); hideTele(); royals.forEach(r => r.tele.hide());
    P.act = null; P.kb.set(0, 0, 0); P.iframe = Math.max(P.iframe, 1); pBody.rotation.set(0, 0, 0); pBody.position.y = 0;
    showWorld(to);
    let x = at.x, z = at.z;
    if (groundAt(x, z) >= 50) { const s = spawnOf(to); x = s.x; z = s.z; }
    const h = groundAt(x, z); P.y = h < 50 ? h : 0; player.position.set(x, P.y, z);
    yaw = 0; P.facing = Math.PI; first = true;
    const W = WORLDS[to], n = CHAPTERS.indexOf(to) + 1;
    if (mode === 'gate') showBanner(WNAME[to], W ? (G.story.shards[to] ? `${cap(SHARD[to])} is already yours.` : W.intro) : 'Back under the moon.', 'title');
    else if (mode === 'story') showBanner(WNAME[to], `Chapter ${n}. ${W ? W.intro : ''}`, 'title');
    else if (mode === 'stormIn') { showBanner('Rift storm', `Reality tears open and drags you into ${WNAME[to]}${G.story.unlocked[to] ? '' : ', a world still sealed to you'}. Hold out for 75 seconds.`, 'title'); sfx('roar'); G.shake = Math.max(G.shake, 0.6); }
    else if (mode === 'stormEnd') showBanner('The storm passes', `The rift lets go and you fall back into ${WNAME[to]}.`, 'title');
    if (mode !== 'respawn') { bannerTimer = 4; sfx('parry'); }
    for (let i = 0; i < 60; i++) { fwColor.setHSL(0.12 + Math.random() * 0.05, 0.8, 0.75); const a = Math.random() * TAU, sp = 2 + Math.random() * 5; fwParticle(x, P.y + 1, z, Math.cos(a) * sp, 1 + Math.random() * 4, Math.sin(a) * sp, fwColor, 1.1, true); }
  }
