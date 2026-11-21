  // ---------- Lanternreach: the hook climb, the objective, the breach and the Bellringer ----------
  // Objective: fell five Gaunts (a stage adds one more, up to eight). The Bellringer then wades out of the marsh,
  // pounds the Great Gate down in three blows and comes through the breach. Defeat it and Lanternreach holds; the
  // stage clock then starts the next, harder stage (see updateStages in 46b, which works for this world as it does
  // for the four story worlds). State lives in G.story (step.titan 0/1/2, prog.titan[0] = Gaunts felled, stage.titan),
  // so it saves and resets with everything else.
  const titanStep = () => G.story.step.titan || 0;
  const titanProg = () => G.story.prog.titan || (G.story.prog.titan = [0, 0, 0]);
  const titanNeed = () => Math.min(8, 4 + stageOf('titan'));
  const titanEngaged = () => tiBellringer.alive && G.world === 'titan' && flatDist(tiBellringer.pos, player.position) < 40;

  function titanText() {
    const st = stageOf('titan'), step = titanStep(), lab = st > 1 ? `Stage ${st} · ` : '';
    if (step === 2) return `Lanternreach holds: ${SHARD.titan} is yours.${G.world === 'titan' ? stageText('titan') : ''}`;
    if (step === 1) return `${lab}Lanternreach: ${titanW.bossName} comes for the Great Gate. ${TITAN.breached ? 'The gate has fallen. Stop it in the streets.' : 'Strike its nape-knot to bring it down before the gate breaks.'}`;
    return `${lab}Lanternreach: ${titanW.task} (${titanProg()[0]}/${titanNeed()}). Hook one with G, or strike from a rooftop.`;
  }
  function titanSelectSub() {
    const ST = G.story, st = stageOf('titan'), step = titanStep(), lab = st > 1 ? `Stage ${st}` : 'Side world';
    if (step === 1) return `${lab}: defeat ${titanW.bossName}`;
    if (step === 2) return `${SHARD.titan[0].toUpperCase() + SHARD.titan.slice(1)} recovered, the next stage is coming`;
    return `${lab}: fell ${titanNeed()} Gaunts, then the Bellringer (${titanProg()[0]}/${titanNeed()})`;
  }

  // A Gaunt falls: count it toward the objective; the last one calls the Bellringer
  function titanGiantDied(c) {
    if (c.K.boss) { completeChapter('titan'); return; }
    if (titanStep() !== 0 || c.type !== 'gaunt') return;
    const pr = titanProg(), need = titanNeed();
    pr[0] = Math.min(need, pr[0] + 1);
    floatText(`${titanW.objWord} ${pr[0]}/${need}`, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', titanW.objCol);
    if (pr[0] >= need) {
      G.story.step.titan = 1; tiBellringer.respawn = 1.5;
      showBanner('The Bellringer tolls', titanW.bossLine, 'title'); bannerTimer = 4.5; sfx('bossintro', 'cyclops');
    }
  }
  // First time: the shard. After that every stage clear pays like the other worlds (stageClear in 46b).
  function titanChapterDone(w) {
    const ST = G.story;
    if (ST.shards[w]) { stageClear(w); return; }
    ST.shards[w] = true; ST.step[w] = 2;
    const m = tierMult(worldTier());
    PR.points++; renderHero();
    reward(500 * m, 350 * m, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
    dropGear(player.position, 2);
    showBanner('Lanternreach holds', `The Bellringer falls and ${SHARD[w]} is yours. The Gaunts will gather again, harder each time. The gate will be mended.`, 'title'); bannerTimer = 5;
    for (let i = 0; i < 3; i++) launchFirework(player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6)));
    saveGame();
  }

  // The breach: the Great Gate comes down, rubble fills the gap and a few Runts pour through
  function titanBreach() {
    if (TITAN.breached) return;
    TITAN.breached = true; TITAN.gateGroup.visible = false; TITAN.rubble.visible = true;
    for (let i = 0; i < 6; i++) burst((Math.random() - 0.5) * 10, 2 + Math.random() * 6, 7, 30, 8);
    G.shake = Math.max(G.shake, 1); sfx('boom');
    showBanner('The Great Gate falls', 'The Bellringer is through. Hold the streets, or take it from the wall.', 'title'); bannerTimer = 4;
    titanSummonRunts(3, { x: 0, z: 14 }, 2, 6);
  }
  function titanRepair() {
    if (!TITAN.breached) return;
    TITAN.breached = false; TITAN.gateGroup.visible = true; TITAN.rubble.visible = false;
    // Anything still inside the wall when the gate is mended is carried back to the fields
    tiGiants.forEach(c => { if (c.alive && c.pos.z > 2.4) { c.pos.set(c.pos.x * 0.5, 0, -14 - Math.random() * 10); c.atk = null; c.tele.hide(); } });
  }
  function titanSummonRunts(n, around, r0, r1) {
    const pool = tiGiants.filter(c => c.type === 'runt' && !c.alive);
    for (const c of pool) {
      if (n <= 0) break;
      c.respawn = 0; spawnCreep(c); if (!c.alive) continue;
      for (let t = 0; t < 12; t++) {
        const a = Math.random() * TAU, r = r0 + Math.random() * (r1 - r0), x = around.x + Math.cos(a) * r, z = around.z + Math.sin(a) * r;
        if (tiOk(c, x, z)) { c.pos.set(x, 0, z); break; }
      }
      c.home.copy(c.pos); c.wander.copy(c.pos); c.cool = 1; c.stun = 0.8; burst(c.pos.x, 1, c.pos.z, 14, 4); tiNapePos(c, c.nape.pos); n--;
    }
  }

  // ----- the hook climb -----
  // Moonhook on any part of a Gaunt goes to its nape-knot: she zips up behind the neck, rides it through the three
  // slashes (no one can swat her off mid-flurry) and then drifts down slowly, so she can follow up with an air slash
  // or a plunge. A plunge that passes the knot strikes it.
  const tiPlungeHit = new Set();
  function titanHookTick(dt) {
    const h = P.hook, a = P.act, pp = player.position;
    const hooking = !!(h && a && a.startsWith('hook'));
    let ride = false;
    if (hooking && h.t && h.t.alive !== false) {
      if (h.t.isGiant && h.t.nape && h.t.nape.alive) h.t = h.t.nape;
      const n = h.t;
      if (n.napeOf) {
        const g = n.napeOf; g.ridden = 0.6;
        if (a !== 'hookthrow') {
          ride = true;
          const f = g.facing, ax = n.pos.x - Math.sin(f) * 1.9, az = n.pos.z - Math.cos(f) * 1.9, k = 1 - Math.exp(-dt * 22);
          if (heroGround(ax, az) !== null) {
            player.position.x += (ax - pp.x) * k; player.position.z += (az - pp.z) * k;
            const gh = heroGround(pp.x, pp.z); if (gh !== null) P.y = gh;
          }
          P.jh += (Math.max(0.01, n.pos.y - 1.0 - P.y) - P.jh) * k; P.jv = 0; P.airFrom = P.airPeak = P.y + P.jh;
          P.iframe = Math.max(P.iframe, 0.15);
        }
      }
    }
    if (ride) TITAN.riding = true;
    else if (TITAN.riding) { TITAN.riding = false; TITAN.glide = 1.6; P.jv = Math.min(P.jv, -0.01); }
    if (TITAN.glide > 0) { TITAN.glide -= dt; if (P.jh > 0 && P.jv < -3.2) P.jv = -3.2; }
    // Death from above: a plunge through the knot
    if (P.plunge && P.act === 'plunge' && P.jh > 0) {
      for (const n of tiGiants.map(c => c.nape)) {
        if (!n.alive || tiPlungeHit.has(n) || flatDist(pp, n.pos) > 2.6 || Math.abs(n.pos.y - pp.y) > 1.8) continue;
        tiPlungeHit.add(n); damageEnemy(n, 60 * PR.dmg, 40, true); floatText('DEATH FROM ABOVE', pp.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ffd36a');
      }
    } else if (tiPlungeHit.size) tiPlungeHit.clear();
  }

  // ----- per-frame -----
  WORLD_TICKS.push(dt => {
    if (!TITAN.init) {
      TITAN.init = true;
      // The wave director keeps one pool per world; ours is empty (and the director is held off below)
      try { if (!wavePool.titan) wavePool.titan = []; } catch (e) { /* not built yet: nothing to do */ }
    }
    const b = tiBellringer;
    if (G.world !== 'titan') {
      // Leaving mid-fight calms the Bellringer; it comes back, gate mended, when she returns
      if (b.alive) { b.alive = false; b.g.visible = false; b.nape.alive = false; b.nape.g.visible = false; b.atk = null; b.tele.hide(); b.bar.hidden = true; b.respawn = Infinity; titanRepair(); }
      TITAN.riding = false; TITAN.glide = 0;
      return;
    }
    // The raid, wave and event directors have no place in a siege
    G.eventClock = 0; G.waveClock = 0; G.raidClock = 0;
    const step = titanStep();
    if (step === 0) { if (TITAN.breached) titanRepair(); if (b.alive) { b.hp = 0; b.alive = false; b.g.visible = false; b.nape.alive = false; b.nape.g.visible = false; b.tele.hide(); b.bar.hidden = true; b.respawn = Infinity; } }
    else if (step === 1 && !b.alive && b.respawn === Infinity) b.respawn = 0.5;
    b.summoned = tiGiants.reduce((n, c) => n + (c.type === 'runt' && c.alive ? 1 : 0), 0);
    titanHookTick(dt);
  });

  // The side world's entry in the world-select list
  function titanSelectButtons() {
    return SIDE_WORLDS.map(w => {
      const here = w === G.world;
      return `<button type="button" class="shopbtn" data-w="${w}"${here ? ' disabled' : ''}><span>${WNAME[w]}<small>${titanSelectSub()}</small></span><span class="gold">${here ? 'You are here' : 'Travel'}</span></button>`;
    }).join('');
  }
