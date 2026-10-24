  // ---------- Stages and events: endless world stages and a spontaneous event director ----------
  // Stages: once a world's shard is taken the world does not go quiet. After a short lull it re-seeds
  // as Stage 2, 3, ... with its objectives in new places and its guardian back, stronger every stage.
  const STAGE_LULL = 25;
  const stageOf = w => (G.story.stage && G.story.stage[w]) || 1;
  // A spot on open ground with room around it, clear of the spawn, gate, arena and the other objectives
  function stageSpot(W, others) {
    for (let t = 0; t < 400; t++) {
      const x = -60 + Math.random() * 120, z = -60 + Math.random() * 120;
      if ([[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dz]) => W.ground(x + dx, z + dz) !== 0)) continue;
      if ([W.spawn, W.gate, W.boss].some(p => Math.hypot(p.x - x, p.z - z) < 14)) continue;
      if (others.some(p => Math.hypot(p.x - x, p.z - z) < 26)) continue;
      return V3(x, z);
    }
    return null;
  }
  function startStage(w) {
    const ST = G.story, W = WORLDS[w];
    ST.stage[w] = stageOf(w) + 1; ST.step[w] = 0; ST.prog[w] = [0, 0, 0]; delete ST.nextStage[w];
    const placed = [];
    W.objs.forEach(o => {
      const p = stageSpot(W, placed); if (!p) return;
      placed.push(p); o.p.copy(p); o.g.position.copy(p);
      if (w === 'neon') o.g.rotation.y = Math.atan2(-p.x, -p.z);
      W.objLook(o, false);
    });
    const s = ST.stage[w];
    showBanner(`${W.name} · Stage ${s}`, `The shard's echo stirs the world again. ${cap(W.task)}. ${W.bossName} will return, ${s - 1} tier${s > 2 ? 's' : ''} stronger.`, 'title'); bannerTimer = 4.5; sfx('roar');
  }
  // The guardian of a stage after the first falls: reward the stage and queue the next one
  function stageClear(w) {
    if (w === 'moat') return;
    const ST = G.story, s = stageOf(w), m = tierMult(worldTier());
    ST.step[w] = 2; ST.nextStage[w] = STAGE_LULL;
    reward(300 * m * s, 220 * m * s, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
    PR.points++; renderHero(); dropRelic(player.position.x + 2, player.position.z);
    showBanner(`Stage ${s} cleared`, `${WORLDS[w].bossName} falls again. +1 attribute point. Stage ${s + 1} of ${WORLDS[w].name} begins soon.`, 'title'); bannerTimer = 4;
    for (let i = 0; i < 3; i++) launchFirework(player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6)));
  }
  function updateStages(real) {
    const ST = G.story, w = G.world;
    if (!WORLDS[w] || !ST.shards[w] || ST.step[w] !== 2 || ST.pending || G.state === 'dead') return;
    if (ST.nextStage[w] === undefined) ST.nextStage[w] = STAGE_LULL;
    ST.nextStage[w] -= real;
    if (ST.nextStage[w] <= 0) startStage(w);
  }
  function stageText(w) {
    const t = G.story.nextStage[w];
    return t === undefined ? '' : ` Stage ${stageOf(w) + 1} begins in ${fmtTime(Math.ceil(Math.max(0, t)))}.`;
  }

  // Events: every 45 to 85 seconds of exploring, something happens near the hero
  const EVENTS = {
    ambush: { w: 3, name: 'Ambush', col: '#ff6a4a' },
    starfall: { w: 2, name: 'Starfall', col: '#ffb070' },
    wisp: { w: 2, name: 'Golden wisp', col: '#ffd36a' },
    shrine: { w: 2, name: 'Blessing shrine', col: '#bfe8ff' },
    fortune: { w: 1, name: 'Fortune surge', col: '#ffd36a' },
    rift: { w: 1.5, name: 'Wandering rift', col: '#c8a0ff' }
  };
  G.event = null; G.eventClock = 0; G.eventNext = 50; G.fortune = 0;
  const evTeles = [0, 1, 2, 3, 4, 5].map(() => makeTele());
  const evGroup = new THREE.Group(); scene.add(evGroup);
  const wispMesh = new THREE.Group(); evGroup.add(wispMesh);
  sph(0.35, bas(0xfff2b0), wispMesh, 0, 0, 0);
  sph(0.7, bas(0xffd36a, { transparent: true, opacity: 0.3, depthWrite: false }), wispMesh, 0, 0, 0);
  const shrineMesh = new THREE.Group(); evGroup.add(shrineMesh);
  box(0.9, 2.6, 0.9, 0, 1.3, 0, lam(0xd8e6ee), shrineMesh);
  sph(0.45, bas(0xbfe8ff), shrineMesh, 0, 3.1, 0);
  { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 10, 1, true), bas(0xbfe8ff, { transparent: true, opacity: 0.12, depthWrite: false })); beam.position.y = 15; shrineMesh.add(beam); }
  const riftMesh = new THREE.Group(); evGroup.add(riftMesh);
  const riftRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 36), bas(0xc8a0ff)); riftRing.position.y = 2.1; riftMesh.add(riftRing);
  const riftDisc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 28), bas(0x8a5aff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); riftDisc.position.y = 2.1; riftMesh.add(riftDisc);
  [wispMesh, shrineMesh, riftMesh].forEach(m => { m.visible = false; tag(m, 1); });
  const meteorGeo = new THREE.SphereGeometry(0.45, 8, 6), meteorMat = bas(0xffb070);

  const canEvent = () => (G.state === 'explore' || G.state === 'interlude') && G.realm === 'material' && !G.hunt && !G.story.pending && !storyBossEngaged() && P.act !== 'leap';
  const here = () => player.position;
  // An open spot on the ground somewhere between r0 and r1 metres from the hero
  function ringSpot(r0, r1) {
    for (let t = 0; t < 60; t++) {
      const a = Math.random() * TAU, r = r0 + Math.random() * (r1 - r0), x = here().x + Math.cos(a) * r, z = here().z + Math.sin(a) * r;
      const lim = G.world === 'moat' ? 76 : 66;
      if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
      const h = groundAt(x, z); if (h > 0.4 || h < -0.3) continue;
      return V3(x, z);
    }
    return null;
  }
  const otherWorlds = () => CHAPTERS.filter(w => w !== G.world && G.story.unlocked[w]);
  function freeCreeps() { const rk = realmKey(); return creeps.filter(c => !c.alive && c.realm === rk && !c.storyBoss && !c.neutral && !c.ancient && c.ai !== 'godling'); }

  function startEvent(kind) {
    const m = tierMult(worldTier()), E = { kind, t: 0, m };
    if (kind === 'ambush') {
      const pool = freeCreeps().sort(() => Math.random() - 0.5).slice(0, 2 + Math.min(3, worldTier()));
      if (pool.length < 2) return false;
      E.t = 60;
      pool.forEach((c, i) => {
        spawnCreep(c); if (!c.alive) return;
        const p = ringSpot(9, 14); if (!p) return;
        c.pos.set(p.x, 0, p.z); c.home.copy(c.pos); c.wander.copy(c.pos); c.cool = 1.5;
        if (i === 0) { c.elite = true; c.lv += 2; c.max = 1; creepStats(c); c.hp = c.max; c.g.scale.multiplyScalar(1.35); E.elite = c; }
      });
      if (!E.elite || !E.elite.alive) return false;
      showBanner('Ambush', `An elite ${CREEP_NAME[E.elite.type]} and its pack close in. Bring it down for a bounty.`, 'title');
    } else if (kind === 'starfall') {
      E.t = 10; E.next = 0.4; E.rocks = [];
      showBanner('Starfall', 'Burning stars rain down. Keep moving and watch the rings. They leave power pods behind.', 'title');
    } else if (kind === 'wisp') {
      const p = ringSpot(12, 18); if (!p) return false;
      E.t = 30; E.p = p.setY(1.2); wispMesh.position.copy(E.p); wispMesh.visible = true;
      showBanner('A golden wisp', 'Something bright is loose nearby and it does not want to be caught. Run it down.', 'title');
    } else if (kind === 'shrine') {
      const p = ringSpot(16, 24); if (!p) return false;
      E.t = 35; E.p = p; shrineMesh.position.copy(p); shrineMesh.visible = true;
      showBanner('A blessing shrine rises', 'A pillar of light. Reach it before it fades for a blessing.', 'title');
    } else if (kind === 'fortune') {
      E.t = 30; G.fortune = 30;
      showBanner('Fortune surge', 'For thirty seconds everything you kill drops double gold.', 'title');
    } else if (kind === 'rift') {
      const opts = otherWorlds(); if (!opts.length || G.storm) return false;
      const p = ringSpot(10, 15); if (!p) return false;
      E.t = 30; E.p = p; E.to = opts[Math.floor(Math.random() * opts.length)]; riftMesh.position.copy(p); riftMesh.visible = true;
      showBanner('A wandering rift', `A tear to ${WNAME[E.to]} hangs nearby for thirty seconds. Step in to cross, or let it close.`, 'title');
    }
    bannerTimer = 3.5; sfx('cast');
    G.event = E; return true;
  }
  // quiet: leaving the world or resetting, no banner
  function endEvent(quiet, msg) {
    const E = G.event; if (!E) return;
    G.event = null; G.fortune = 0;
    wispMesh.visible = shrineMesh.visible = riftMesh.visible = false;
    evTeles.forEach(t => t.hide());
    (E.rocks || []).forEach(r => scene.remove(r.m));
    if (E.elite && quiet) E.elite.elite = false;
    if (!quiet && msg) { showBanner(EVENTS[E.kind].name, msg, 'title'); bannerTimer = 3; }
  }
  function eliteDown(c) {
    c.elite = false;
    const E = G.event, m = tierMult(worldTier());
    reward(90 * m, 110 * m, c.pos.clone().add(new THREE.Vector3(0, 2.6, 0)));
    spawnLoot(c.pos.x + 1, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    spawnLoot(c.pos.x - 1, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    dropRelic(c.pos.x, c.pos.z + 1.2);
    if (E && E.elite === c) endEvent(false, 'The elite is down and the ambush breaks. Bounty paid.');
  }
  function eventText() {
    const E = G.event; if (!E) return '';
    const left = fmtTime(Math.ceil(Math.max(0, E.t))), n = EVENTS[E.kind].name;
    if (E.kind === 'ambush') return `${n} · slay the elite (${left}).`;
    if (E.kind === 'rift') return `${n} to ${WNAME[E.to]} · closes in ${left}.`;
    if (E.kind === 'wisp') return `${n} · catch it (${left}).`;
    if (E.kind === 'shrine') return `${n} · reach it (${left}).`;
    if (E.kind === 'fortune') return `${n} · double gold (${left}).`;
    return `${n} · ${left}.`;
  }
  const eventMark = () => G.event && G.event.p ? { x: G.event.p.x, z: G.event.p.z, col: EVENTS[G.event.kind].col } : G.event && G.event.elite && G.event.elite.alive ? { x: G.event.elite.pos.x, z: G.event.elite.pos.z, col: EVENTS.ambush.col } : null;

  function updateEvents(dt, real) {
    if (G.fortune > 0) G.fortune -= real;
    const E = G.event, tt = uTime.value;
    if (!E) {
      if (G.state === 'dead') return;
      G.eventClock += dt;
      if (G.eventClock < G.eventNext || !canEvent()) return;
      G.eventClock = 0; G.eventNext = 45 + Math.random() * 40;
      const kinds = Object.keys(EVENTS).filter(k => G.story.lastEvent !== k), total = kinds.reduce((s, k) => s + EVENTS[k].w, 0);
      let r = Math.random() * total, pick = kinds[0];
      for (const k of kinds) { r -= EVENTS[k].w; if (r <= 0) { pick = k; break; } }
      if (startEvent(pick)) G.story.lastEvent = pick;
      return;
    }
    if (G.state === 'dead') { endEvent(true); return; }
    E.t -= real;
    const d = E.p ? flatDist(here(), E.p) : 0;
    if (E.kind === 'ambush') {
      if (!E.elite.alive) { endEvent(true); return; }
      if (E.t <= 0) { endEvent(false, 'The elite slips away into the dark.'); return; }
    } else if (E.kind === 'starfall') {
      E.next -= real;
      if (E.t > 1.2 && E.next <= 0) {
        E.next = 0.55;
        const tele = evTeles.find(t => !E.rocks.some(r => r.tele === t));
        const p = Math.random() < 0.4 ? V3(here().x + (Math.random() - 0.5) * 3, here().z + (Math.random() - 0.5) * 3) : ringSpot(2, 13);
        if (tele && p) {
          const m = new THREE.Mesh(meteorGeo, meteorMat); m.position.set(p.x + 6, 30, p.z - 4); scene.add(m); tag(m, 2);
          E.rocks.push({ m, p, tele, k: 0, y: Math.max(0, groundAt(p.x, p.z) < 50 ? groundAt(p.x, p.z) : 0) });
        }
      }
      for (let i = E.rocks.length - 1; i >= 0; i--) {
        const R = E.rocks[i]; R.k += real / 1.2;
        R.tele.circle(R.p.x, R.y, R.p.z, 2.2, R.k);
        R.m.position.set(R.p.x + 6 * (1 - R.k), R.y + 30 * (1 - R.k), R.p.z - 4 * (1 - R.k));
        if (Math.random() < 0.6) { fwColor.setHSL(0.07, 1, 0.6); fwParticle(R.m.position.x, R.m.position.y, R.m.position.z, 0, 1, 0, fwColor, 0.6, false); }
        if (R.k >= 1) {
          scene.remove(R.m); R.tele.hide(); E.rocks.splice(i, 1);
          burst(R.p.x, R.y + 0.4, R.p.z, 30, 7); sfx('clang'); G.shake = Math.max(G.shake, 0.35);
          if (flatDist(here(), R.p) < 2.4 && Math.abs(here().y - R.y) < 2) hitPlayer(16 * E.m, R.p, 7, false, null);
          if (Math.random() < 0.3) spawnLoot(R.p.x, R.p.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
        }
      }
      if (E.t <= 0 && !E.rocks.length) endEvent(false, 'The sky goes quiet again.');
    } else if (E.kind === 'wisp') {
      // It flees when you are close and drifts when you are not, a little slower than a running hero
      const away = new THREE.Vector3(E.p.x - here().x, 0, E.p.z - here().z).normalize();
      const sp = d < 9 ? 5.6 * Math.min(1.25, PR.speed) * 0.85 : 1.5;
      const nx = E.p.x + away.x * sp * real + Math.sin(tt * 2.3) * real * 2, nz = E.p.z + away.z * sp * real + Math.cos(tt * 1.9) * real * 2;
      const h = groundAt(nx, nz);
      if (h < 0.5 && Math.abs(nx) < 66 && Math.abs(nz) < 66) { E.p.x = nx; E.p.z = nz; }
      else { E.p.x += away.z * sp * real; E.p.z -= away.x * sp * real; }
      wispMesh.position.set(E.p.x, 1.2 + Math.sin(tt * 4) * 0.25, E.p.z);
      if (Math.random() < 0.5) { fwColor.setHSL(0.13, 1, 0.7); fwParticle(E.p.x, 1.2, E.p.z, 0, 0.6, 0, fwColor, 0.8, true); }
      if (d < 1.6) {
        const m = E.m; burst(E.p.x, 1.2, E.p.z, 40, 6);
        reward(70 * m, 160 * m, E.p.clone().add(new THREE.Vector3(0, 2.4, 0)));
        for (let i = 0; i < 3; i++) spawnLoot(E.p.x + (i - 1) * 1.2, E.p.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
        endEvent(false, 'Caught it. The wisp bursts into gold and power pods.');
      } else if (E.t <= 0) endEvent(false, 'The wisp fades out of reach.');
    } else if (E.kind === 'shrine') {
      shrineMesh.children[1].position.y = 3.1 + Math.sin(tt * 2) * 0.2;
      if (d < 2.2) {
        const picks = BOOST_KEYS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
        picks.forEach(k => applyBoost(k)); P.mana = P.manaMax;
        reward(50 * E.m, 0, E.p.clone().add(new THREE.Vector3(0, 3.4, 0)));
        burst(E.p.x, 2, E.p.z, 40, 6);
        endEvent(false, 'The shrine blesses you: two boosts and a full well of mana.');
      } else if (E.t <= 0) endEvent(false, 'The light fades before you reach it.');
    } else if (E.kind === 'fortune') {
      if (E.t <= 0) endEvent(false, 'The fortune surge passes.');
    } else if (E.kind === 'rift') {
      riftRing.rotation.z += real * 2; riftDisc.material.opacity = 0.25 + 0.15 * Math.sin(tt * 5);
      riftMesh.rotation.y = Math.atan2(here().x - E.p.x, here().z - E.p.z);
      if (d < 1.8) {
        const why = travelBlock(), to = E.to;
        if (why) { if (!E.warned) { E.warned = true; floatText(why, here().clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#c8a0ff'); } }
        else { endEvent(true); enterWorld(to, G.lastPos[to] || spawnOf(to), 'gate'); }
      } else E.warned = false;
      if (G.event && E.t <= 0) endEvent(false, 'The rift seals itself.');
    }
  }
