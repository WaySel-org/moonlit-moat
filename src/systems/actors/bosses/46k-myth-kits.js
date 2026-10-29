  // ---------- Myth kits: special abilities for every mythic ----------
  // mythKit runs every frame for a live mythic in the hero's realm (called from updateCreep). It runs the type's
  // passive (tick), turns the mythic enraged below half health (rage), and fires a random ability on its own clock,
  // sooner when enraged. An ability may take the body over for a while (c.kact: a charge, a pounce, a hook throw,
  // a gaze); then the usual brain waits. Things that are not creeps but outlive a frame (foxfire, illusions, hooks,
  // the drag, the Basilisk's brood) are run by mkTick, every unpaused frame from troubleTick.
  const mkV = new THREE.Vector3(), mkV2 = new THREE.Vector3(), mkUp = new THREE.Vector3();
  const mkWord = (c, text, col) => floatText(text, c.pos.clone().add(mkUp.set(0, (CREEP_BAR_H[c.type] || 3) + 0.9, 0)), 'word', col || '#ffd36a');
  const mkGlob = new THREE.MeshBasicMaterial({ color: 0x9aff4a });
  // A shot from any point, aimed at the hero's chest; dmg overrides the owner's shotDmg
  function mkShot(c, from, speed, mat, dmg) {
    const m = new THREE.Mesh(cshotGeo, mat || cshotMat); m.position.copy(from); scene.add(m);
    const v = new THREE.Vector3(player.position.x - from.x, player.position.y + 1.1 - from.y, player.position.z - from.z).normalize().multiplyScalar(speed);
    cshots.push({ m, v, t: 0, c, dmg });
  }
  // Whether the hero stands in a lane that starts at `at`
  function mkInLane(at, f, len, w) {
    const fx = Math.sin(f), fz = Math.cos(f), rx = player.position.x - at.x, rz = player.position.z - at.z, along = rx * fx + rz * fz;
    return along > 0 && along < len && Math.abs(rx * fz - rz * fx) < w / 2 + 0.3 && Math.abs(player.position.y - at.y) < 2.2;
  }
  // A streak falling out of the sky onto a marked spot (meteors, boulders)
  function mkFall(at, hue, sat, light) {
    for (let k = 0; k < 10; k++) { fwColor.setHSL(hue, sat, light); fwParticle(at.x + k * 0.15, 1 + k * 1.1, at.z + k * 0.1, -0.5, -16, -0.3, fwColor, 0.3 + k * 0.02, false); }
  }
  // A ring that sweeps out over the ground (war cry, tidal surge)
  const mkRings = [0, 1, 2].map(() => { const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); return { m, r: 0, max: 1 }; });
  function mkRing(at, max, col) {
    const R = mkRings.find(x => !x.m.visible) || mkRings[0];
    R.m.material.color.setHex(col); R.m.position.set(at.x, at.y + 0.08, at.z); R.r = 0.5; R.max = max; R.m.scale.setScalar(0.5); R.m.visible = true;
  }

  // ---------- Channelled moves: the kit owns the body until step() returns true ----------
  function mkRunAct(c, dt) {
    const A = c.kact; if (!A) return false;
    // A parry or a heavy hit breaks a channel, except a hold already in progress
    if (c.stun > 0 && !A.hold) { mkEndAct(c); return false; }
    A.t += dt;
    if (A.step(c, A, dt)) mkEndAct(c);
    return true;
  }
  function mkEndAct(c) { const A = c.kact; if (!A) return; c.kact = null; c.tele.hide(); if (A.end) A.end(c, A); }
  // Stand still for dur seconds while fx(c, k) animates the wind-up; end(c) puts the pose back
  function mkStand(c, dur, fx, end) { c.kact = { t: 0, end, step: (c, A) => { if (fx) fx(c, Math.min(1, A.t / dur)); return A.t >= dur; } }; }
  // Dash helper for charging bosses: moves along the facing with creepMove and hits the hero once on contact
  function mkDash(c, A, dt, sp, dmg, kb) {
    c.facing = A.facing;
    const ok = creepMove(c, fwdOf(A.facing), sp * dt);
    c.pos.y = Math.min(0, groundAt(c.pos.x, c.pos.z));
    if (Math.random() < 0.7) burst(c.pos.x, c.pos.y + 0.3, c.pos.z, 2, 3);
    if (c.legs) c.legs.forEach((l, i) => { l.rotation.x = Math.sin(uTime.value * 22 + i * Math.PI) * 0.6; });
    if (!A.hit && flatDist(player.position, c.pos) < c.radius + 1.1 && Math.abs(player.position.y - c.pos.y) < 2) { A.hit = true; hitPlayer(dmg, c.pos, kb, true, c); }
    return ok;
  }
  // A charge: a lane that tracks the hero for most of the wind-up, then a dash down it
  function mkCharge(c, o) {
    c.kact = { t: 0, facing: yawTo(c.pos, player.position), dash: false, hit: false, step(c, A, dt) {
      if (!A.dash) {
        if (A.t < o.wind * 0.6) A.facing += clamp(angDiff(A.facing, yawTo(c.pos, player.position)), -3 * dt, 3 * dt);
        c.facing = A.facing; c.tele.lane(c.pos, A.facing, o.len, o.w, A.t / o.wind, c.pos.y);
        c.body.rotation.x = 0.25 * Math.min(1, A.t / o.wind);
        if (A.t >= o.wind) { A.dash = true; A.t = 0; c.tele.hide(); sfx('swoosh'); G.shake = Math.max(G.shake, 0.2); }
        return false;
      }
      return !mkDash(c, A, dt, o.sp, o.dmg, o.kb) || A.t >= o.len / o.sp;
    }, end(c) { c.body.rotation.x = 0; } };
  }
  // A pounce: the landing spot is marked on the hero, then it leaps and lands there as the mark fills
  function mkPounce(c) {
    const to = player.position.clone(); if (groundAt(to.x, to.z) > 0.5) return false;
    mkWord(c, 'Pounce', '#ffb04a'); sfx('roar');
    groundStrike({ at: to, r: 2.6, wind: 1.1, dmg: 26, kb: 11, src: c });
    const from = c.pos.clone(), f = yawTo(from, to);
    c.kact = { t: 0, step(c, A) {
      const k = Math.min(1, A.t / 1.1); c.facing = f;
      c.pos.x = from.x + (to.x - from.x) * k; c.pos.z = from.z + (to.z - from.z) * k;
      c.pos.y = Math.min(0, groundAt(c.pos.x, c.pos.z)) + Math.sin(k * Math.PI) * 4;
      return k >= 1;
    } };
    return true;
  }

  // ---------- The drag: the hero is hauled toward a creep and cannot act on the way ----------
  let mkDrag = null;
  function mkDragHero(src, sp, stop, max) { mkDrag = { src, sp, stop, max, t: 0 }; }
  function mkDragTick(dt) {
    const D = mkDrag; if (!D) return;
    const s = D.src, pp = player.position, dx = s.pos.x - pp.x, dz = s.pos.z - pp.z, dd = Math.hypot(dx, dz);
    D.t += dt;
    if (!s.alive || s.realm !== realmKey() || P.hp <= 0 || G.state === 'dead' || dd <= D.stop || D.t > D.max) { mkDrag = null; return; }
    const st = Math.min(dd - D.stop, D.sp * dt);
    movePlayer(dx / dd * st, dz / dd * st);
    P.act = 'hurt'; P.actT = 0; P.actDur = 0.3; P.block = false; P.kb.set(0, 0, 0); P.facing = Math.atan2(dx, dz);
    if (Math.random() < 0.5) burst(pp.x, pp.y + 0.3, pp.z, 1, 2);
  }

  // ---------- Hooks: a telegraphed lane, a hook on a chain, and a drag (Saltmarrow's anchor, Gorgemaw's meat hook) ----------
  const mkChainGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 4).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const mkHooks = [0, 1].map(() => {
    const mat = new THREE.MeshLambertMaterial({ color: 0x6a6a70, flatShading: true }), head = new THREE.Group();
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5), mat); shank.rotation.x = Math.PI / 2; shank.position.z = 0.3; head.add(shank);
    const bend = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 5, 10, Math.PI), mat); bend.rotation.set(0, -Math.PI / 2, -Math.PI / 2); bend.position.set(0, -0.26, 0.62); head.add(bend);
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), mat); barb.rotation.x = -Math.PI / 2; barb.position.set(0, -0.52, 0.5); head.add(barb);
    const chain = new THREE.Mesh(mkChainGeo, mat);
    head.visible = chain.visible = false; scene.add(head); scene.add(chain); tag(head, 2); tag(chain, 2);
    return { head, chain, mat, busy: false };
  });
  // o: len, w, wind, speed (out), pull (drag speed), stop (how close the hero ends up), dmg, col, word
  function mkHook(c, o) {
    const H = mkHooks.find(h => !h.busy); if (!H) return false;
    H.busy = true; H.mat.color.setHex(o.col || 0x6a6a70);
    if (o.word) mkWord(c, o.word, '#ff8a5a');
    c.kact = { t: 0, H, o, stage: 'wind', facing: yawTo(c.pos, player.position), dist: 0, step: mkHookStep, end: mkHookEnd };
    return true;
  }
  function mkHookStep(c, A, dt) {
    const o = A.o, H = A.H, pp = player.position, hp = H.head.position;
    if (A.stage === 'wind') {
      if (A.t < o.wind * 0.7) A.facing += clamp(angDiff(A.facing, yawTo(c.pos, pp)), -3 * dt, 3 * dt);
      c.facing = A.facing; c.tele.lane(c.pos, A.facing, o.len, o.w, A.t / o.wind, c.pos.y);
      if (A.t < o.wind) return false;
      A.stage = 'fly'; c.tele.hide(); sfx('swoosh'); H.head.visible = H.chain.visible = true; if (c.hand) c.hand.visible = false;
    }
    const fx = Math.sin(A.facing), fz = Math.cos(A.facing), y = c.pos.y + 1.3;
    if (A.stage === 'fly') {
      A.dist += o.speed * dt; hp.set(c.pos.x + fx * A.dist, y, c.pos.z + fz * A.dist);
      if (flatDist(pp, hp) < o.w / 2 + 0.6 && Math.abs(pp.y - c.pos.y) < 2) {
        // A roll's i-frames slip the hook; anything else that lets the hit land gets the hero dragged in
        if (hitPlayer(o.dmg, hp, 0, false, c) && P.hp > 0) { A.stage = 'pull'; heroWord('HOOKED', '#ff6a4a'); sfx('heavyhit'); mkDragHero(c, o.pull, o.stop, o.len / o.pull + 0.6); }
        else A.stage = 'back';
      } else if (A.dist >= o.len || groundAt(hp.x, hp.z) > 1.6) A.stage = 'back';
    } else if (A.stage === 'pull') {
      hp.set(pp.x, pp.y + 1.1, pp.z);
      if (!mkDrag || mkDrag.src !== c) { A.stage = 'back'; A.dist = flatDist(c.pos, pp); A.facing = yawTo(c.pos, pp); }
    } else {
      A.dist -= o.speed * 1.4 * dt; hp.set(c.pos.x + fx * A.dist, y, c.pos.z + fz * A.dist);
      if (A.dist <= 0.6) return true;
    }
    (c.hand || c.g).getWorldPosition(mkV2);
    H.chain.position.copy(mkV2); H.chain.lookAt(hp); H.chain.scale.set(1, 1, Math.max(0.01, mkV2.distanceTo(hp)));
    H.head.rotation.y = yawTo(mkV2, hp);
    return false;
  }
  function mkHookEnd(c, A) {
    const H = A.H; H.busy = false; H.head.visible = H.chain.visible = false;
    if (c.hand) c.hand.visible = true;
    if (mkDrag && mkDrag.src === c) mkDrag = null;
  }

  // ---------- Kitsune: foxfire, blinks, illusions and charm ----------
  const fox = mythics.find(c => c.type === 'kitsune');
  fox.tails.forEach(t => { t.userData.a = t.rotation.z; });
  // Decoys are clones of the fox (same materials, so a hit's flash shows on all three); only the real one is a creep
  fox.decoys = [0, 1].map(() => {
    const g = fox.g.clone(), body = g.children[0]; g.visible = false; scene.add(g);
    return { g, body, tails: fox.tails.map(t => body.children[fox.body.children.indexOf(t)]), on: false, t: 0, a: 0, cool: 0 };
  });
  const mkFlameGeo = new THREE.SphereGeometry(0.24, 8, 6), mkFlameMat = new THREE.MeshBasicMaterial({ color: 0x6ac8ff });
  const mkFlamePool = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(mkFlameGeo, mkFlameMat); m.visible = false; scene.add(m); tag(m, 2); return m; });
  const mkFlames = [];
  function mkFlame(c, a, delay) { const m = mkFlamePool.find(x => !x.visible); if (!m) return; m.visible = true; mkFlames.push({ m, c, a, delay, t: 0, v: null }); }
  function foxPuff(p) {
    for (let i = 0; i < 18; i++) { fwColor.setHSL(0.55 + Math.random() * 0.06, 0.9, 0.65); const a = Math.random() * TAU, s = 1 + Math.random() * 3; fwParticle(p.x, p.y + 0.5, p.z, Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s, fwColor, 0.7, true); }
  }
  const FOX_TAUNTS = ['Too slow~', 'Over here!', 'Hehehe', 'Catch me!'];
  function foxBlink(c, quiet) {
    const pp = player.position;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU, r = 8 + Math.random() * 4, x = pp.x + Math.sin(a) * r, z = pp.z + Math.cos(a) * r;
      if (groundAt(x, z) > 0.4) continue;
      foxPuff(c.pos); c.pos.x = x; c.pos.z = z; c.home.set(x, 0, z); c.wander.copy(c.home); foxPuff(c.pos);
      c.facing = yawTo(c.pos, pp); c.blinkCd = 3; c.atk = null; sfx('swoosh');
      if (!quiet) mkWord(c, FOX_TAUNTS[Math.floor(Math.random() * FOX_TAUNTS.length)], '#bfe8ff');
      return true;
    }
    return false;
  }
  function foxFan(c) { mkWord(c, 'Nine-tail Fan', '#8ad8ff'); fanShots(c, 9, 1.7, 10); }
  function foxDecoys(c, dt) {
    const live = c.alive && c.realm === realmKey() && G.state !== 'dead', pp = player.position, tt = uTime.value;
    c.decoys.forEach((D, i) => {
      if (!D.on) return;
      D.t += dt;
      if (!live || D.t > 7 || flatDist(pp, D.g.position) < 2.4) {
        D.on = false; D.g.visible = false;
        if (live) { foxPuff(D.g.position); sfx('pop'); floatText('illusion', D.g.position.clone().add(mkUp.set(0, 2.4, 0)), 'word', '#bfe8ff'); }
        return;
      }
      D.a += dt * 0.55;
      const k = Math.min(1, dt * 2.5), gp = D.g.position;
      gp.x += (pp.x + Math.sin(D.a) * 8 - gp.x) * k; gp.z += (pp.z + Math.cos(D.a) * 8 - gp.z) * k;
      gp.y = Math.min(0, groundAt(gp.x, gp.z)) + 1.3 + Math.sin(tt * 2 + i * 2) * 0.25;
      D.g.rotation.y = yawTo(gp, pp); D.body.position.y = Math.sin(tt * 2.4 + i) * 0.1;
      D.tails.forEach((t, j) => { t.rotation.z = t.userData.a + Math.sin(tt * 3 + j * 0.7 + i) * 0.22; });
      D.cool -= dt;
      if (D.cool <= 0) { D.cool = 1.8 + Math.random() * 0.6; mkShot(c, gp, 9, mkFlameMat, 4); }
    });
  }

  // ---------- The Basilisk's brood: small serpents that rise behind the hero and lunge at once ----------
  const mkSegGeo = [0, 1, 2, 3].map(i => new THREE.SphereGeometry(0.17 - i * 0.025, 7, 5)), mkHeadGeo = new THREE.BoxGeometry(0.24, 0.16, 0.32);
  const mkEyeGeo = new THREE.SphereGeometry(0.03, 4, 3), mkNubGeo = new THREE.ConeGeometry(0.03, 0.12, 4), mkCrownMat = bas(0xc8b060), mkEyeMat = bas(0xffe04a);
  WORLD_BUILD.hatchling = () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mat = lam(0x55703a, { flatShading: true });
    mkSegGeo.forEach((geo, i) => { const m = new THREE.Mesh(geo, mat); m.position.set(Math.sin(i * 1.3) * 0.12, 0.17, 0.15 - i * 0.26); body.add(m); });
    const head = new THREE.Mesh(mkHeadGeo, mat); head.position.set(0, 0.22, 0.42); body.add(head);
    [-0.06, 0.06].forEach(x => { const e = new THREE.Mesh(mkEyeGeo, mkEyeMat); e.position.set(x, 0.29, 0.58); body.add(e); });
    for (let i = 0; i < 3; i++) { const k = new THREE.Mesh(mkNubGeo, mkCrownMat); k.position.set(-0.06 + i * 0.06, 0.35, 0.38); body.add(k); }
    return { g, body, mat, legs: [] };
  };
  Object.assign(CREEP_NAME, { hatchling: 'Basilisk Hatchling' }); Object.assign(CREEP_BASE, { hatchling: 28 }); Object.assign(CREEP_XP, { hatchling: 8 }); CREEP_BAR_H.hatchling = 0.9;
  const mkBrood = Array.from({ length: 10 }, () => addWorldCreep('hatchling', 'material', 'stalker', { wave: true, solo: 'material', realm: 'lair', respawn: Infinity, radius: 0.45,
    onBite: c => { chillHero(2.5, 0.35, 'SLOWED'); poisonHero(0.8 * c.mult * G.env.creepDmg, 3); }, onDeath: c => { c.realm = 'lair'; } }));
  const mkBasilisk = mythics.find(c => c.type === 'basilisk');
  function basSwarm(c) {
    const pp = player.position, n = 3 + (Math.random() < 0.5 ? 1 : 0); let k = 0;
    for (const h of mkBrood) {
      if (k >= n) break; if (h.alive) continue;
      const a = P.facing + Math.PI + (Math.random() - 0.5) * 1.2, r = 5 + Math.random() * 3, x = pp.x + Math.sin(a) * r, z = pp.z + Math.cos(a) * r;
      if (groundAt(x, z) > 0.4) continue;
      h.respawn = 0; const ok = raiseMob(h, mkV.set(x, 0, z), 0, false); h.respawn = Infinity;
      if (!ok) { h.realm = 'lair'; continue; }
      // No climb-out stun: they come up already lunging
      h.facing = yawTo(h.pos, pp); h.atk = { t: 0.15, stage: 'wind', hit: false }; h.cool = 2; k++;
      burst(x, 0.2, z, 10, 3);
    }
    if (k) mkWord(c, 'The brood stirs', '#b8ff6a');
  }
  function basSweep(c) {
    c.sweepCd = 3.5; mkWord(c, 'Tail sweep', '#c8b060');
    groundStrike({ at: c.pos.clone().addScaledVector(fwdOf(c.facing), -1.6 * c.size), r: 3, wind: 0.75, dmg: 22, kb: 13, src: c, y: c.pos.y });
    mkStand(c, 0.75, (c, k) => { c.body.rotation.y = Math.sin(k * TAU) * 0.35; }, c => { c.body.rotation.y = 0; });
  }
  // Petrifying Gaze: a wide lane from its eyes. It only petrifies a hero who is looking at it when it lands.
  function basGaze(c) {
    mkWord(c, 'Look away!', '#ffe04a'); sfx('cast');
    const f = yawTo(c.pos, player.position), at = c.pos.clone().addScaledVector(fwdOf(f), 1.4 * c.size);
    c.kact = { t: 0, step(c, A) {
      const k = Math.min(1, A.t / 1.4); c.facing = f;
      c.tele.lane(at, f, 18, 5, k, c.pos.y); c.eyeMat.color.setRGB(1, 0.88 - 0.6 * k, 0.29 + 0.7 * k);
      if (k < 1) return false;
      for (let i = 0; i < 18; i += 2) burst(at.x + Math.sin(f) * i, c.pos.y + 1, at.z + Math.cos(f) * i, 2, 3);
      if (mkInLane(at, f, 18, 5) && P.iframe <= 0 && P.hp > 0) {
        if (Math.abs(angDiff(P.facing, yawTo(player.position, c.pos))) < 1.7) { if (stoneHero(2, 'PETRIFIED', '#c8c8c0')) hitPlayer(10, at, 0, false, c); }
        else heroWord('looked away', '#c8ffc8');
      }
      return true;
    }, end(c) { c.eyeMat.color.setHex(0xffe04a); } };
  }

  // ---------- The Cyclops: a titan whose war cry and aura drive every creature near it ----------
  const cyc = mythics.find(c => c.type === 'cyclops');
  cyc.lvOf = () => 3 * PR.level;
  cyc.aura = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.4, depthWrite: false }));
  cyc.aura.position.y = 0.06; cyc.g.add(cyc.aura);

  const mkDrain = n => { const had = P.mana; P.mana = Math.max(0, P.mana - n); if (had > P.mana) heroWord(`-${Math.round(had - P.mana)} mana`, '#b07aff', 2.9); };
  const MYTH_KITS = {
    hydra: {
      cd: 6,
      tick(c, dt, d) {
        const tt = uTime.value;
        c.necks.forEach((n, i) => { n.rotation.x = Math.sin(tt * 2 + i * 1.3) * 0.06; n.rotation.z = Math.sin(tt * 1.4 + i) * 0.04; });
        // Regrows 1.2% of its health a second unless Rend holds its wounds open
        if (c.hp < c.max && !(c.rend > 0)) {
          c.hp = Math.min(c.max, c.hp + c.max * 0.012 * dt);
          c.regenT -= dt; if (c.regenT <= 0 && d < 30) { c.regenT = 5; mkWord(c, 'regenerating', '#7affb0'); }
        }
      },
      rage(c) {
        c.necks[5].visible = c.necks[6].visible = true; mkWord(c, 'Two more heads!', '#9aff4a');
        [5, 6].forEach(i => { c.heads[i].getWorldPosition(mkV); burst(mkV.x, mkV.y, mkV.z, 20, 5); });
      },
      abil: [
        c => {
          mkWord(c, 'Head barrage', '#9aff4a'); sfx('cast');
          c.heads.forEach((h, i) => { if (c.necks[i].visible) after(i * 0.12, () => { if (c.alive && c.realm === realmKey()) { h.getWorldPosition(mkV); mkShot(c, mkV, 12, mkGlob); } }); });
        },
        c => {
          mkWord(c, 'Multi-bite', '#9aff4a');
          for (let i = 0; i < 3; i++) after(i * 0.35, () => { if (c.alive && c.realm === realmKey()) groundStrike({ at: player.position.clone(), r: 2, wind: 0.75, dmg: 16, kb: 5, src: c, poison: 1.5 * c.mult, poisonT: 5, sound: 'hit' }); });
        }
      ]
    },
    cyclops: {
      cd: 5, range: 24,
      tick(c, dt, d) {
        const tt = uTime.value;
        c.aura.material.opacity = 0.3 + 0.15 * Math.sin(tt * 4); c.aura.scale.setScalar(14 / c.size * (1 + 0.015 * Math.sin(tt * 4)));
        // Aura: creeps within 14 m hit 35% harder and move and attack half again as fast
        creeps.forEach(o => { if (o !== c && o.alive && o.realm === c.realm && flatDist(o.pos, c.pos) < 14) o.rallyT = Math.max(o.rallyT || 0, 0.4); });
        if (Math.random() < 0.4) { const a = Math.random() * TAU; fwColor.setHSL(0.07, 1, 0.55); fwParticle(c.pos.x + Math.sin(a) * 14, c.pos.y + 0.2, c.pos.z + Math.cos(a) * 14, 0, 1.5, 0, fwColor, 0.6, false); }
        c.cryT -= dt;
        if (c.cryT <= 0 && d < 40 && G.state !== 'dead') {
          c.cryT = 9; mkWord(c, 'ATTACK!', '#ff8a3a'); sfx('roar'); G.shake = Math.max(G.shake, 0.35); mkRing(c.pos, 32, 0xff8a3a);
          creeps.forEach(o => { if (o !== c && o.alive && o.realm === c.realm && flatDist(o.pos, c.pos) < 32) o.commandT = 10; });
        }
      },
      abil: [
        c => {
          mkWord(c, 'Earthshaker', '#ffb070');
          groundStrike({ at: c.pos.clone(), r: 5.5, wind: 1.2, dmg: 30, kb: 14, src: c, y: c.pos.y });
          mkStand(c, 1.2, (c, k) => { c.body.position.y = -0.4 * Math.sin(k * Math.PI / 2); }, c => { c.body.position.y = 0; });
        },
        c => {
          mkWord(c, 'Boulder barrage', '#ffb070');
          for (let i = 0; i < 3; i++) { const at = i ? around(player.position, 3.5) : player.position.clone(), w = 1.1 + i * 0.4; groundStrike({ at, r: 2.4, wind: w, dmg: 26, kb: 8, src: c }); after(w - 0.3, () => mkFall(at, 0.08, 0.15, 0.55)); }
        },
        c => {
          mkWord(c, 'Eye beam', '#ffe8a0');
          const f = yawTo(c.pos, player.position);
          groundStrike({ at: c.pos.clone(), lane: true, facing: f, len: 20, w: 2, wind: 1.1, dmg: 32, kb: 9, src: c, sound: 'cast' });
          mkStand(c, 1.1, (c, k) => { c.facing = f; c.eyeMat.color.setRGB(1, 0.91 - 0.6 * k, 0.63 - 0.6 * k); }, c => { c.eyeMat.color.setHex(0xffe8a0); });
        }
      ]
    },
    kitsune: {
      cd: 5,
      tick(c, dt, d) {
        const tt = uTime.value;
        c.tails.forEach((t, i) => { t.rotation.z = t.userData.a + Math.sin(tt * 3 + i * 0.7) * 0.22; t.rotation.x = -1.1 + Math.sin(tt * 2.2 + i) * 0.12; });
        c.body.position.y = Math.sin(tt * 2.4) * 0.1;
        // Too close: it blinks away on its own
        c.blinkCd -= dt;
        if (d < 3 && c.blinkCd <= 0 && !c.kact && c.stun <= 0 && G.state !== 'dead') foxBlink(c);
      },
      abil: [
        c => { mkWord(c, 'Foxfire Orbit', '#8ad8ff'); for (let i = 0; i < 3; i++) mkFlame(c, i * TAU / 3, 1.5 + i * 0.3); sfx('cast'); },
        c => foxBlink(c),
        c => {
          if (c.decoys.some(D => D.on)) return foxFan(c);
          mkWord(c, 'Illusions', '#bfe8ff');
          const base = yawTo(player.position, c.pos);
          c.decoys.forEach((D, i) => { D.on = true; D.t = 0; D.a = base + (i ? 2.1 : -2.1); D.cool = 1.2 + i * 0.6; D.g.scale.setScalar(c.size); D.g.position.copy(c.pos); D.g.visible = true; });
          foxPuff(c.pos); foxBlink(c, true);
        },
        foxFan,
        c => {
          mkWord(c, 'Charm', '#ff9ad8');
          groundStrike({ at: c.pos.clone().setY(0), lane: true, facing: yawTo(c.pos, player.position), len: 14, w: 2.2, wind: 0.9, dmg: 6, kb: 0, src: c, sound: 'cast',
            onHit: () => { if (c.alive && stoneHero(0.8, 'CHARMED', '#ff9ad8')) mkDragHero(c, 16, 2.6, 0.8); } });
        }
      ]
    },
    basilisk: {
      cd: 6,
      tick(c, dt, d) {
        // The brood: once as it wakes, then every 12 s while the hero is within 30 m
        c.swarmT -= dt;
        if (c.swarmT <= 0 && (d < 30 || !c.swarmed) && G.state !== 'dead' && P.y < 2) { c.swarmT = 12; c.swarmed = true; basSwarm(c); }
        // Punishes backstabbers with its tail
        c.sweepCd -= dt;
        if (c.sweepCd <= 0 && d < 5.5 && !c.kact && !c.atk && c.stun <= 0 && Math.abs(angDiff(c.facing, yawTo(c.pos, player.position))) > 2.2) basSweep(c);
      },
      abil: [basGaze, basSweep, c => { mkWord(c, 'Venom spit', '#9aff4a'); fanShots(c, 3, 0.5, 11, mkGlob); }]
    },
    minotaur: {
      cd: 6.5,
      abil: [
        c => { mkWord(c, 'Labyrinth Charge', '#ff8a5a'); sfx('roar'); mkCharge(c, { wind: 0.9, len: 22, w: 2.6, sp: 24, dmg: 30, kb: 16 }); },
        c => {
          mkWord(c, 'Horn Toss', '#ff8a5a');
          const f = yawTo(c.pos, player.position);
          groundStrike({ at: c.pos.clone().addScaledVector(fwdOf(f), 2.4), r: 2.5, wind: 0.75, dmg: 24, kb: 22, src: c, y: c.pos.y });
          mkStand(c, 0.75, (c, k) => { c.facing = f; c.body.rotation.x = 0.4 * k; }, c => { c.body.rotation.x = 0; });
        }
      ]
    },
    oni: {
      cd: 6.5,
      rage(c) { c.haste = 1.4; mkWord(c, 'Oni Fury', '#ff4a3a'); sfx('roar'); },
      tick(c) {
        if (!c.enraged) return;
        c.mat.emissive.r = Math.min(1, c.mat.emissive.r + 0.25 + 0.1 * Math.sin(uTime.value * 10));
        if (Math.random() < 0.3) { fwColor.setHSL(0.02, 1, 0.5); fwParticle(c.pos.x + (Math.random() - 0.5) * 1.5, c.pos.y + 1 + Math.random() * 3, c.pos.z + (Math.random() - 0.5) * 1.5, 0, 1.5, 0, fwColor, 0.5, false); }
      },
      abil: [
        c => {
          // Club Quake: a heavy slam in front, then three aftershocks rolling outward toward the hero
          mkWord(c, 'Club Quake', '#ff6a4a');
          const f = yawTo(c.pos, player.position), fv = fwdOf(f);
          groundStrike({ at: c.pos.clone().addScaledVector(fv, 2.2), r: 3.2, wind: 1.0, dmg: 30, kb: 10, src: c, y: c.pos.y });
          for (let i = 0; i < 3; i++) groundStrike({ at: c.pos.clone().addScaledVector(fv, 5.5 + i * 3), r: 2.2, wind: 1.3 + i * 0.3, dmg: 18, kb: 7, src: c, y: c.pos.y });
          mkStand(c, 1.0, (c, k) => { c.facing = f; c.body.rotation.x = -0.3 * k; }, c => { c.body.rotation.x = 0; });
        }
      ]
    },
    manticore: {
      cd: 6,
      abil: [
        c => { mkWord(c, 'Spine Storm', '#9aff6a'); fanShots(c, 9, 1.8, 11, mkGlob); },
        c => { if (!mkPounce(c)) { mkWord(c, 'Spine Storm', '#9aff6a'); fanShots(c, 9, 1.8, 11, mkGlob); } }
      ]
    },
    saltmarrow: {
      cd: 6.5,
      abil: [
        (c, d) => { if (d < 4 || !mkHook(c, { len: 18, w: 1.6, wind: 0.8, speed: 26, pull: 18, stop: 2.4, dmg: 14, col: 0xb08a3a, word: 'Anchor Hook' })) saltSurge(c); },
        c => saltSurge(c)
      ]
    },
    vorrask: {
      cd: 6,
      abil: [
        c => { mkWord(c, 'Void Rifts', '#b07aff'); for (let i = 0; i < 5; i++) groundStrike({ at: i ? around(player.position, 4.5) : player.position.clone(), r: 2.2, wind: 1.2 + i * 0.15, dmg: 18, kb: 5, src: c, sound: 'cast', onHit: () => mkDrain(15) }); },
        c => { mkWord(c, 'Hollow Gaze', '#b07aff'); groundStrike({ at: c.pos.clone(), lane: true, facing: yawTo(c.pos, player.position), len: 24, w: 2.6, wind: 1.1, dmg: 20, kb: 6, src: c, sound: 'cast', onHit: () => mkDrain(40) }); }
      ]
    },
    thurnis: {
      cd: 6,
      abil: [
        c => {
          mkWord(c, 'Starfall', '#ffb04a');
          for (let i = 0; i < 8; i++) { const at = i ? around(player.position, 6) : player.position.clone(), w = 1.2 + i * 0.15; groundStrike({ at, r: 2.2, wind: w, dmg: 22, kb: 6, src: c, fire: true, fireLife: 3, burn: 3, burnDps: 5 }); after(w - 0.3, () => mkFall(at, 0.07, 1, 0.6)); }
        },
        c => {
          // Burning Crown: a ring of fire closes around the hero and leaves the ground burning for five seconds
          mkWord(c, 'Burning Crown', '#ff6a2a');
          const pp = player.position.clone();
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; groundStrike({ at: pp.clone().add(mkV.set(Math.sin(a) * 3.4, 0, Math.cos(a) * 3.4)), r: 1.5, wind: 1.3, dmg: 18, kb: 4, src: c, fire: true, fireLife: 5, burn: 4, burnDps: 6 }); }
        }
      ]
    }
  };
  // Tidal Surge: two rings of breaking water spread from the Admiral and drench whoever they catch
  function saltSurge(c) {
    mkWord(c, 'Tidal Surge', '#6ac8ff'); mkRing(c.pos, 9, 0x6ac8ff);
    [[3.5, 6, 0.9], [7, 9, 1.4]].forEach(([r, n, w], j) => {
      for (let i = 0; i < n; i++) { const a = i / n * TAU + j * 0.3; groundStrike({ at: c.pos.clone().add(mkV.set(Math.sin(a) * r, 0, Math.cos(a) * r)), r: 1.8, wind: w, dmg: 16, kb: 8, src: c, y: c.pos.y, chill: 0.45, chillT: 3.5, chillWord: 'DRENCHED', sound: j ? 'swoosh' : 'boom' }); }
    });
  }
  // Every wake starts clean: no leftover channel, extra heads hidden, clocks reset
  function mkSpawn(c) {
    mkEndAct(c); c.kitCd = 3 + Math.random() * 2; c.cryT = 4; c.swarmT = 0.8; c.swarmed = false; c.sweepCd = 2; c.blinkCd = 2; c.regenT = 3;
    if (c.necks) c.necks.forEach((n, i) => { n.visible = i < 5; });
    if (c.decoys) c.decoys.forEach(D => { D.on = false; D.g.visible = false; });
  }
  mythics.forEach(c => { c.onSpawn = mkSpawn; c.onDeath = mkEndAct; });
  // Called from updateCreep for a live mythic in the hero's realm. Returns true while a channelled move owns the body.
  function mythKit(c, dt, d) {
    const K = MYTH_KITS[c.type]; if (!K) return false;
    if (!c.enraged && c.hp < c.max / 2) {
      c.enraged = true; mkWord(c, 'ENRAGED', '#ff6a4a'); sfx('roar'); G.shake = Math.max(G.shake, 0.4);
      if (K.rage) K.rage(c);
    }
    if (K.tick) K.tick(c, dt, d);
    if (mkRunAct(c, dt)) return true;
    if (c.atk || c.stun > 0 || d > (K.range || 20) || P.y >= 2 || G.state === 'dead' || G.state === 'won') return false;
    c.kitCd = (c.kitCd === undefined ? 3 : c.kitCd) - dt * (c.enraged ? 1.5 : 1);
    if (c.kitCd > 0) return false;
    c.kitCd = (K.cd || 6) + Math.random() * 2;
    K.abil[Math.floor(Math.random() * K.abil.length)](c, d);
    return !!c.kact;
  }
  // Runs every unpaused frame from troubleTick
  let mkPlace = null;
  function mkTick(dt) {
    const place = realmKey(), pp = player.position, tt = uTime.value;
    // Leaving a realm drops every channel, drag and spell still in the air
    if (place !== mkPlace) { if (mkPlace !== null) { mkDrag = null; creeps.forEach(c => { if (c.kact) mkEndAct(c); }); } mkPlace = place; }
    mkDragTick(dt);
    for (let i = mkFlames.length - 1; i >= 0; i--) {
      const F = mkFlames[i], m = F.m; F.t += dt;
      let done = !F.c.alive || F.c.realm !== place || G.state === 'dead';
      if (!done && F.t < F.delay) { F.a += dt * 2.6; m.position.set(pp.x + Math.sin(F.a) * 4, pp.y + 1.2 + Math.sin(F.t * 6 + F.a) * 0.15, pp.z + Math.cos(F.a) * 4); }
      else if (!done) {
        if (!F.v) { F.v = new THREE.Vector3(pp.x - m.position.x, pp.y + 1.1 - m.position.y, pp.z - m.position.z).normalize().multiplyScalar(15); sfx('swoosh'); }
        m.position.addScaledVector(F.v, dt);
        if (m.position.distanceTo(mkV.set(pp.x, pp.y + 1.1, pp.z)) < 0.8) { done = true; hitPlayer(12, m.position, 4, false, F.c); }
        else if (F.t > F.delay + 1.2) done = true;
      }
      if (Math.random() < 0.5) { fwColor.setHSL(0.56, 0.9, 0.7); fwParticle(m.position.x, m.position.y, m.position.z, 0, 0.6, 0, fwColor, 0.35, true); }
      if (done) { m.visible = false; mkFlames.splice(i, 1); }
    }
    foxDecoys(fox, dt);
    mkRings.forEach(R => { if (!R.m.visible) return; R.r += dt * R.max * 1.6; R.m.scale.setScalar(R.r); R.m.material.opacity = 0.8 * (1 - R.r / R.max); if (R.r >= R.max) R.m.visible = false; });
    // The brood scatters once the Basilisk is dead
    mkBrood.forEach((h, i) => {
      if (!h.alive) return;
      if (!mkBasilisk.alive) { burst(h.pos.x, h.pos.y + 0.3, h.pos.z, 8, 3); dropMob(h); h.realm = 'lair'; return; }
      if (h.realm === place) h.body.rotation.y = Math.sin(tt * 14 + i) * 0.3;
    });
  }
