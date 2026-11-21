  // ---------- Soul rivals: Gleaners that race you for souls, and the Shepherd who guards the Soul Spring ----------
  // Soul Gleaners roam the spirit realm hunting souls, not the hero. Each soul one devours heals it, raises its level and
  // makes it bigger; at three it is Gorged and quicker. Kill one and every soul it ate bursts back out.
  // Ysmeral, the Soul Shepherd, guards the Soul Spring. She strikes like a godling, calls every loose soul nearby to
  // herself to feed (catch them first), summons the realm's spirits at 70% and 35% and casts faster below half.
  // Her fall leaves a Grand Soul: full life and 90 s with no hunger. She rises again after five minutes.
  Object.assign(CREEP_NAME, { gleaner: 'Soul Gleaner', shepherd: 'Ysmeral, the Soul Shepherd' });
  Object.assign(CREEP_BASE, { gleaner: 70, shepherd: 2200 });
  Object.assign(CREEP_XP, { gleaner: 30, shepherd: 45 }); // killCreep multiplies a godling-brained foe's XP by 14
  const GLEAN = { count: 8, sense: 36, speed: 4.4, gorged: 3, cap: 6 };
  const SHEP = { harvestEvery: 14, harvestR: 42, engageR: 28, leashR: 30, respawn: 300 };

  function buildGleaner() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const robe = spiritMat(0x2a1a40, 0.85), bone = spiritMat(0xd8ccff, 0.9), maw = new THREE.MeshBasicMaterial({ color: 0x9ff6ff });
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 7), robe); torso.position.y = 0.2; torso.rotation.x = 0.35; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), bone); head.position.set(0, 1.05, 0.32); body.add(head);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 14), maw); mouth.position.set(0, 0.98, 0.6); body.add(mouth);
    [-1, 1].forEach(sd => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 5), bone); arm.position.set(sd * 0.45, 0.45, 0.35); arm.rotation.set(1.1, 0, sd * 0.3); body.add(arm);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), maw); claw.position.set(sd * 0.55, 0.15, 0.85); claw.rotation.x = 1.6; body.add(claw);
    });
    return { g, body, mouth, robe };
  }
  function buildShepherd() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const robe = spiritMat(0x6fd8ff, 0.6), pale = spiritMat(0xeafcff, 0.9), soulM = new THREE.MeshBasicMaterial({ color: 0xbff6ff });
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.2, 14), robe); skirt.position.y = 0.6; body.add(skirt);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 1.4, 10), pale); torso.position.y = 3.1; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), pale); head.position.y = 4.1; body.add(head);
    const veil = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 12, 1, true), spiritMat(0xc8a0ff, 0.45)); veil.position.y = 3.9; body.add(veil);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 32), soulM); halo.position.set(0, 4.3, -0.45); body.add(halo);
    // The crook she herds souls with, and a ring of captive souls circling her
    const crook = new THREE.Group(); crook.position.set(1.0, 2.6, 0.3); body.add(crook);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 6), pale); crook.add(staff);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16, Math.PI * 1.3), pale); hook.position.y = 2.4; crook.add(hook);
    const soulRing = new THREE.Group(); soulRing.position.y = 2.4; body.add(soulRing);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, o = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), soulM); o.position.set(Math.cos(a) * 2.1, Math.sin(i) * 0.4, Math.sin(a) * 2.1); soulRing.add(o); }
    return { g, body, halo, soulRing, godName: 'Ysmeral, the Soul Shepherd', godHue: 0.52 };
  }
  function riftCreep(parts, type, ai, extra) {
    parts.g.visible = false; scene.add(parts.g); tag(parts.g, 2);
    const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    const c = Object.assign(parts, { type, realm: 'spirit', ai, float: 0, speed: 1, isCreep: true, alive: false, respawn: 3 + Math.random() * 4, pos: parts.g.position,
      radius: 0.7, hitY: 0.8, markY: 1.9, hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
      wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
      ancient: false, camp: null, age: 0 }, extra);
    creeps.push(c); return c;
  }

  // ---- Soul Gleaners ----
  const gleaners = [];
  for (let k = 0; k < GLEAN.count; k++) {
    const c = riftCreep(buildGleaner(), 'gleaner', 'melee', { float: 0.35, speed: 1.2, eaten: 0 });
    c.lvOf = () => Math.max(worldTier(), PR.level - 1) + Math.floor(Math.random() * 2);
    c.respawnAfter = () => 20 + Math.random() * 10;
    c.onSpawn = g => { g.eaten = 0; g.haste = 1; g.robe.color.setHex(0x2a1a40); };
    // Everything it ate bursts back out
    c.onDeath = g => {
      for (let i = 0; i < g.eaten; i++) { const a = i / Math.max(1, g.eaten) * TAU; spawnSoul(g.pos.x + Math.cos(a) * 1.4, 0, g.pos.z + Math.sin(a) * 1.4, 0.08); }
      if (g.eaten) floatText(`${g.eaten} soul${g.eaten > 1 ? 's' : ''} freed`, g.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#bff6ff');
    };
    gleaners.push(c);
  }
  function gleanerEat(c, i) {
    const s = souls[i]; scene.remove(s.m); souls.splice(i, 1);
    c.eaten = Math.min(GLEAN.cap, c.eaten + 1);
    c.lv++; creepStats(c); c.hp = Math.min(c.max, c.hp + c.max * 0.3);
    c.g.scale.setScalar(1 + 0.12 * c.eaten);
    if (c.eaten >= GLEAN.gorged) { c.haste = 1.3; c.robe.color.setHex(0x6a1a3a); }
    for (let k = 0; k < 14; k++) { fwColor.setHSL(0.52, 0.7, 0.8); fwParticle(c.pos.x, c.pos.y + 1, c.pos.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, fwColor, 0.6, true); }
    if (flatDist(c.pos, player.position) < 30) floatText(c.eaten === GLEAN.gorged ? 'Gleaner is GORGED' : 'A Gleaner devours a soul', c.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', c.eaten >= GLEAN.gorged ? '#ff6a8a' : '#c8a0ff');
  }
  function gleanerTick(c, dt) {
    if (!c.alive || c.atk || c.stun > 0) return;
    c.mouth.scale.setScalar(1 + 0.25 * Math.sin(uTime.value * 9 + c.home.x));
    c.haste = (1 + 0.1 * P.veilTier) * (c.eaten >= GLEAN.gorged ? 1.3 : 1);
    // A Gleaner close to the hero fights her (the usual melee brain); otherwise it goes after the nearest soul
    if (flatDist(c.pos, player.position) < 8 && !heroAloft()) return;
    let best = -1, bd = GLEAN.sense;
    souls.forEach((s, i) => { const d = flatDist(c.pos, s.m.position); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    if (bd < 1.2) { gleanerEat(c, best); return; }
    c.facing = yawTo(c.pos, souls[best].m.position);
    creepMove(c, fwdOf(c.facing), GLEAN.speed * hasteOf(c) * dt);
    c.wander.copy(c.pos); c.home.copy(c.pos);
  }

  // ---- The Soul Spring and its Shepherd ----
  const SPRING = (() => {
    const clear = (x, z) => { for (let a = 0; a < 8; a++) if (groundAtRealm(x + Math.cos(a / 8 * TAU) * 7, z + Math.sin(a / 8 * TAU) * 7, 'spirit') !== 0) return false; return groundAtRealm(x, z, 'spirit') === 0; };
    for (const r of [96, 88, 104, 80]) for (let k = 0; k < 16; k++) {
      const a = 2.2 + k / 16 * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clear(x, z) || nearPuzzleSite(x, z, 10) || RIFTS.some(q => Math.hypot(q.x - x, q.z - z) < 14)) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(-90, 0, 40);
  })();
  const springFx = new THREE.Group(); springFx.position.copy(SPRING); spiritProps.add(springFx);
  {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), spiritMat(0x6fd8ff, 0.35)); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.05; springFx.add(pool);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.18, 6, 48), spiritMat(0xbff6ff, 0.8)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; springFx.add(rim);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, h = 4 + (i % 3) * 1.5, p = new THREE.Mesh(new THREE.ConeGeometry(0.45, h, 5), spiritMat(i % 2 ? 0x9fe8ff : 0xc8a0ff, 0.55));
      p.position.set(Math.cos(a) * 7.5, h / 2, Math.sin(a) * 7.5); springFx.add(p);
    }
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 40, 10, 1, true), spiritMat(0x9ff6ff, 0.12)); col.position.y = 20; springFx.add(col);
  }
  const shepherd = riftCreep(buildShepherd(), 'shepherd', 'godling', { radius: 1.8, hitY: 2.6, markY: 5.6, respawn: 4, phase: 0, harvestT: 6, met: false });
  shepherd.lvOf = () => Math.max(worldTier(), PR.level) + 3;
  shepherd.respawnAfter = () => SHEP.respawn;
  shepherd.onSpawn = c => {
    c.pos.copy(SPRING); c.home.copy(SPRING); c.wander.copy(SPRING); c.camp = SPRING.clone();
    c.g.scale.setScalar(1.25); c.phase = 0; c.harvestT = 6; c.bar.className = 'cbar anc myth';
  };
  shepherd.onDeath = c => {
    spawnSoul(c.pos.x, 0, c.pos.z, 1.0);
    if (G.realm === 'spirit') { P.sated = Math.max(P.sated, 90); P.hungerT = 0; }
    showBanner('The Shepherd falls', 'The Soul Spring is yours. 90 s without hunger.', 'title'); bannerTimer = 3;
    dropGear(c.pos, 2); // killCreep already drops a relic for a godling-brained foe
    souls.forEach(s => { s.pull = null; });
  };
  function shepherdSummon(c) {
    sfx('portal'); G.shake = Math.max(G.shake, 0.4);
    floatText('Rise, my flock', c.pos.clone().add(new THREE.Vector3(0, 5.6, 0)), 'word', '#bff6ff');
    let n = 0;
    const pick = creeps.filter(x => x.realm === 'spirit' && (x.type === 'moth' || x.type === 'gleaner' || x.type === 'lantern'));
    pick.sort((a, b) => (a.alive ? 1 : 0) - (b.alive ? 1 : 0));
    for (const x of pick) {
      if (n >= 7) break;
      if (x.alive && flatDist(x.pos, c.pos) < 20) continue;
      if (!x.alive) { spawnCreep(x); if (!x.alive) continue; }
      const a = n / 7 * TAU; x.pos.set(c.pos.x + Math.cos(a) * 5, 0, c.pos.z + Math.sin(a) * 5); x.home.copy(x.pos); x.wander.copy(x.pos); x.provoked = 6;
      fwColor.setHSL(0.55, 0.7, 0.8); for (let k = 0; k < 16; k++) fwParticle(x.pos.x, 0.5, x.pos.z, (Math.random() - 0.5) * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2, fwColor, 0.8, true);
      n++;
    }
  }
  function shepherdTick(c, dt) {
    if (!c.alive) return;
    const t = uTime.value, dSpring = flatDist(player.position, SPRING);
    c.soulRing.rotation.y += dt * 1.2; c.soulRing.position.y = 2.4 + Math.sin(t * 2) * 0.2;
    if (dSpring < SHEP.engageR && !c.met && G.state !== 'dead') {
      c.met = true; showBanner('Ysmeral, the Soul Shepherd', 'She guards the Soul Spring. Catch the souls she calls before she drinks them.', 'title'); bannerTimer = 3.5; sfx('portal');
    }
    if (dSpring > SHEP.engageR + 20) c.met = false;
    // She will not be drawn far from her spring
    if (flatDist(c.pos, SPRING) > SHEP.leashR && !c.atk) { c.facing = yawTo(c.pos, SPRING); creepMove(c, fwdOf(c.facing), 6 * dt); }
    const k = c.hp / c.max;
    if (c.phase < 1 && k < 0.7) { c.phase = 1; shepherdSummon(c); }
    if (c.phase < 2 && k < 0.35) { c.phase = 2; shepherdSummon(c); heroWord('She is furious', '#ff6a8a', 3.2); }
    if (k < 0.5 && !c.atk) c.cool -= dt * 0.7;
    // Soul Harvest: every loose soul nearby drifts to her; each one that reaches her heals her
    if (dSpring < SHEP.engageR + 10) c.harvestT -= dt;
    if (c.harvestT <= 0) {
      c.harvestT = SHEP.harvestEvery;
      let n = 0; souls.forEach(s => { if (flatDist(s.m.position, c.pos) < SHEP.harvestR) { s.pull = c; n++; } });
      if (n) floatText(`Ysmeral calls ${n} soul${n > 1 ? 's' : ''}`, c.pos.clone().add(new THREE.Vector3(0, 5.6, 0)), 'word', '#bff6ff');
    }
    for (let i = souls.length - 1; i >= 0; i--) {
      const s = souls[i]; if (s.pull !== c) continue;
      const to = _shepTo.set(c.pos.x, c.pos.y + 2.4, c.pos.z), d = s.m.position.distanceTo(to);
      if (d < 1.4) {
        scene.remove(s.m); souls.splice(i, 1);
        c.hp = Math.min(c.max, c.hp + c.max * 0.04);
        floatText('+soul', to.clone().setY(to.y + 2), 'word', '#bff6ff');
        continue;
      }
      s.m.position.addScaledVector(to.sub(s.m.position).normalize(), Math.min(d, 7 * dt));
      if (Math.random() < 0.5) { fwColor.setHSL(0.52, 0.8, 0.85); fwParticle(s.m.position.x, s.m.position.y, s.m.position.z, 0, 0, 0, fwColor, 0.5, true); }
    }
  }
  const _shepTo = new THREE.Vector3();
  // Called from spiritHunt each frame the hero is in the spirit realm
  function soulRivalsTick(dt) {
    gleaners.forEach(c => gleanerTick(c, dt));
    shepherdTick(shepherd, dt);
  }
