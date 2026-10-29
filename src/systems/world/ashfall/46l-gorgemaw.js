  // ---------- Gorgemaw: a hook-throwing glutton that roams Ashfall ----------
  // An original brute for the zombie world: a bloated grave-glutton with a stitched belly and a small head, a chain
  // hook in its right hand and a cleaver in its left. From range it throws the hook and drags the hero in; up close
  // it swings the cleaver or swallows the hero whole for a moment (Blade Spin resists). The grave stench around it
  // poisons, and when it is hurt it eats its own shamblers to heal. One roams Ashfall and returns 90 s after it falls.
  WORLD_BUILD.gorger = () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const flesh = lam(0x8a8f6e, { flatShading: true }), dark = lam(0x2a1e18), rag = lam(0x3e342a, { flatShading: true }), iron = lam(0x5e5e66, { flatShading: true });
    const rust = lam(0x7a4a2a), bone = lam(0xd8d0b0), eye = bas(0xd8ff5a), maw = bas(0x3a0a0a);
    const legs = [-0.5, 0.5].map(x => box(0.5, 1.1, 0.55, x, 0.55, 0, rag, body));
    // The belly: two stitched seams wrap its front, crossed by stitches
    const belly = sph(1.15, flesh, body, 0, 2.0, 0.1); belly.scale.set(1.1, 1, 1.05);
    [[0.15, 1.16], [-0.42, 1.08]].forEach(([y, r]) => {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 4, 24, Math.PI), dark); seam.rotation.x = Math.PI / 2; seam.position.y = y; belly.add(seam);
      for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4, st = box(0.035, 0.22, 0.035, Math.sin(a) * r, y, Math.cos(a) * r, dark, belly); st.rotation.set(0, a, 0.5); }
    });
    sph(0.75, flesh, body, 0, 3.05, 0).scale.set(1.3, 0.8, 1);
    sph(0.3, flesh, body, 0, 3.6, 0.35);
    [-0.1, 0.1].forEach(x => sph(0.045, eye, body, x, 3.68, 0.62));
    box(0.36, 0.12, 0.12, 0, 3.47, 0.6, maw, body);
    for (let i = 0; i < 4; i++) box(0.04, 0.07, 0.04, -0.12 + i * 0.08, 3.51, 0.66, bone, body);
    [-1, 1].forEach(s => { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 4), bone); sp.position.set(s * 0.85, 3.4, -0.1); sp.rotation.z = -s * 0.5; body.add(sp); });
    box(1.5, 0.55, 0.2, 0, 1.2, 0.92, rag, body);
    // Right arm: the chain hook it throws
    sph(0.32, flesh, body, 1.0, 3.0, 0);
    box(0.32, 1.3, 0.32, 1.15, 2.3, 0.2, flesh, body).rotation.z = 0.2;
    const hand = new THREE.Group(); hand.position.set(1.28, 1.55, 0.45); body.add(hand);
    sph(0.2, flesh, hand, 0, 0, 0);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 4, 10), rust); coil.position.set(0, -0.15, -0.1); hand.add(coil);
    box(0.08, 0.7, 0.08, 0, -0.45, 0.15, iron, hand);
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 5, 10, Math.PI * 1.2), iron); hk.position.set(0, -0.85, 0.3); hk.rotation.y = Math.PI / 2; hand.add(hk);
    // Left arm: a broad cleaver
    sph(0.32, flesh, body, -1.0, 3.0, 0);
    box(0.32, 1.3, 0.32, -1.15, 2.3, 0.2, flesh, body).rotation.z = -0.2;
    sph(0.2, flesh, body, -1.28, 1.55, 0.45);
    box(0.08, 0.5, 0.08, -1.28, 1.35, 0.6, rag, body);
    box(0.07, 0.65, 0.95, -1.28, 1.0, 0.95, iron, body); box(0.08, 0.08, 0.95, -1.28, 0.68, 0.95, rust, body);
    return { g, body, legs, belly, hand, mat: flesh };
  };
  Object.assign(CREEP_NAME, { gorger: 'Gorgemaw, the Grave Glutton' }); Object.assign(CREEP_BASE, { gorger: 1600 }); Object.assign(CREEP_XP, { gorger: 260 }); CREEP_BAR_H.gorger = 4.3;
  let gmMet = false;
  function gmDied(c) {
    mkEndAct(c); c.realm = 'lair';
    floatText('Gorgemaw falls', c.pos.clone().add(new THREE.Vector3(0, 4.6, 0)), 'word', '#b8ff6a'); G.shake = Math.max(G.shake, 0.4);
    reward(0, 90 * tierMult(worldTier()), c.pos.clone().add(new THREE.Vector3(0, 3.6, 0)));
    dropGear(c.pos, 2);
  }
  const gorger = addWorldCreep('gorger', 'ash', 'gorger', { radius: 1.3, hitY: 1.8, markY: 4.6, brute: true, solo: 'ash', realm: 'lair', respawn: 25,
    lvOf: () => Math.max(worldTier(), PR.level) + 1, respawnAfter: () => 90, onDeath: gmDied, onSpawn: c => { mkEndAct(c); c.hookCd = 3; c.devCd = 0; c.eatCd = 0; } });
  // Devour: a short wind-up at its mouth, then the hero is held, chewed (damage through armour heals it) and spat out
  function gmDevour(c) {
    c.kact = { t: 0, stage: 'wind', step(c, A, dt) {
      const pp = player.position, f = fwdOf(c.facing), mouth = mkV.set(c.pos.x + f.x * 1.5, c.pos.y, c.pos.z + f.z * 1.5);
      if (A.stage === 'wind') {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, pp)), -4 * dt, 4 * dt);
        c.tele.circle(mouth.x, c.pos.y, mouth.z, 1.9, A.t / 0.5); c.belly.scale.set(1.1 + 0.1 * A.t, 1, 1.05 + 0.1 * A.t);
        if (A.t < 0.5) return false;
        c.tele.hide(); A.t = 0; A.stage = 'rec'; c.devCd = 3;
        if (flatDist(pp, mouth) < 2.2 && Math.abs(pp.y - c.pos.y) < 1.5 && P.iframe <= 0 && P.hp > 0 && G.state !== 'dead' && stoneHero(2.2, 'DEVOURED', '#b8ff6a')) {
          A.stage = 'hold'; A.hold = true; A.tick = 0; sfx('heavyhit'); G.shake = Math.max(G.shake, 0.3);
        }
        return false;
      }
      if (A.stage === 'hold') {
        if (P.hp <= 0 || G.state === 'dead') return true;
        movePlayer((mouth.x - pp.x) * Math.min(1, dt * 12), (mouth.z - pp.z) * Math.min(1, dt * 12));
        P.stone = Math.max(P.stone, 0.1); P.kb.set(0, 0, 0); P.block = false;
        c.belly.scale.set(1.2 + 0.08 * Math.sin(A.t * 14), 1.05, 1.15 + 0.08 * Math.sin(A.t * 14));
        A.tick += dt;
        if (A.tick >= 0.5) {
          A.tick -= 0.5; const dmg = 5 * c.mult * G.env.creepDmg;
          burnPlayer(dmg); c.hp = Math.min(c.max, c.hp + dmg * 3); sfx('hit');
          burst(pp.x, pp.y + 1.2, pp.z, 10, 4); floatText(`+${Math.round(dmg * 3)}`, c.pos.clone().add(new THREE.Vector3(0, 4.4, 0)), '', '#8aff4a');
        }
        if (A.t < 2.2) return false;
        // Spat out, hard
        A.stage = 'rec'; A.hold = false; A.t = 0; P.stone = 0; c.devCd = 7;
        P.kb.copy(f).multiplyScalar(16); heroWord('spat out', '#b8ff6a'); sfx('boom'); burst(pp.x, pp.y + 1, pp.z, 24, 6);
        return false;
      }
      return A.t > 0.6;
    }, end(c, A) { if (A.stage === 'hold') P.stone = 0; c.belly.scale.set(1.1, 1, 1.05); } };
  }
  // Eats one of its own shamblers: no reward for the hero, 12% health for Gorgemaw
  function gmEat(c, z) {
    dropMob(z); if (!z.wave) z.respawn = 8 + Math.random() * 6;
    c.hp = Math.min(c.max, c.hp + c.max * 0.12); c.eatCd = 6;
    floatText('CRUNCH', c.pos.clone().add(new THREE.Vector3(0, 4.4, 0)), 'word', '#b8ff6a'); sfx('heavyhit'); burst(z.pos.x, z.pos.y + 1, z.pos.z, 20, 4);
    c.facing = yawTo(c.pos, z.pos);
    c.kact = { t: 0, step: (c, A) => { c.body.rotation.x = Math.sin(Math.min(1, A.t / 0.8) * Math.PI) * 0.35; return A.t > 0.8; }, end: c => { c.body.rotation.x = 0; } };
  }
  function updateGorger(c, dt, d, groundY, aggro) {
    const tt = uTime.value, pp = player.position, h = hasteOf(c);
    c.pos.y = groundY;
    if (!gmMet && d < 35 && G.state !== 'dead') { gmMet = true; showBanner(CREEP_NAME.gorger, 'Dodge the hook. Never stand still beside it.', 'title'); bannerTimer = 3.5; sfx('roar'); }
    // Grave Stench
    if (d < 4 && P.hp > 0 && G.state !== 'dead') poisonHero(1.2 * c.mult * G.env.creepDmg, 1.2);
    if (Math.random() < 0.35) { fwColor.setHSL(0.22, 0.6, 0.4); fwParticle(c.pos.x + (Math.random() - 0.5) * 6, c.pos.y + 0.4 + Math.random() * 2, c.pos.z + (Math.random() - 0.5) * 6, 0, 0.6, 0, fwColor, 1.1, false); }
    c.hookCd -= dt; c.eatCd -= dt; c.devCd -= dt;
    const moving = !c.kact && !c.atk && c.stun <= 0;
    c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 5 + i * Math.PI) * 0.3 : 0; });
    c.body.rotation.z = moving ? Math.sin(tt * 2.5) * 0.06 : 0;
    if (mkRunAct(c, dt)) return;
    if (c.atk) {
      // Cleaver swing
      const A = c.atk, front = c.pos.clone().addScaledVector(fwdOf(c.facing), 2.0); A.t += dt * h;
      if (A.stage === 'wind') {
        c.tele.circle(front.x, c.pos.y, front.z, 2.2, A.t / 0.6);
        if (A.t >= 0.6) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); burst(front.x, c.pos.y + 0.3, front.z, 16, 5); sfx('heavyhit'); G.shake = Math.max(G.shake, 0.2);
          if (flatDist(pp, front) < 2.5 && Math.abs(pp.y - c.pos.y) < 1.5) hitPlayer(22, front, 9, true, c);
        }
      } else if (A.t >= 0.7) { c.atk = null; c.cool = 1.6 + Math.random() * 0.8; }
      return;
    }
    if (c.stun > 0) return;
    if (c.hp < c.max * 0.6 && d > 8 && c.eatCd <= 0) {
      const z = creeps.find(o => o.alive && o.type === 'shambler' && !o.neutral && o.realm === c.realm && flatDist(o.pos, c.pos) < 6);
      if (z) { gmEat(c, z); return; }
    }
    const engaged = (aggro || d < 22 && P.y < 2 && !c.leash) && G.state !== 'dead' && G.state !== 'won';
    if (engaged) {
      c.facing += clamp(angDiff(c.facing, yawTo(c.pos, pp)), -2.4 * dt, 2.4 * dt);
      c.cool -= dt * h;
      if (d < 2.6 && c.devCd <= 0) gmDevour(c);
      else if (d < 3.6 && c.cool <= 0) c.atk = { t: 0, stage: 'wind' };
      else if (d > 5 && d < 19 && c.hookCd <= 0 && mkHook(c, { len: 20, w: 1.4, wind: 0.7, speed: 30, pull: 20, stop: 2.3, dmg: 14, col: 0x6a5a50, word: 'Meat Hook' })) c.hookCd = 6 + Math.random() * 2;
      else if (d > 2.3) creepMove(c, fwdOf(c.facing), 2.6 * h * dt);
    } else creepWander(c, dt, 1.0);
    pushPlayerOut(c, 1.6);
  }
