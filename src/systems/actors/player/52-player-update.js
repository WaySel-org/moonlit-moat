  // ---------- Player update ----------
  function poseSword() {
    const k = P.actDur ? P.actT / P.actDur : 0;
    let x = 0.6, y = -0.35, bright = false;
    if (P.act === 'light') {
      const s = ease((k - 0.08) / 0.45);
      if (P.combo === 0) { x = 0.15; y = -1.5 + 2.9 * s; }
      else if (P.combo === 1) { x = 0.15; y = 1.4 - 2.9 * s; }
      else { x = -1.8 + 2.9 * s; y = 0; }
      bright = k > 0.08 && k < 0.55;
    } else if (P.act === 'heavy') {
      if (k < 0.55) { x = 0.6 - 2.8 * ease(k / 0.55); y = 0; }
      else { x = -2.2 + 3.4 * ease((k - 0.55) / 0.15); y = 0; bright = k < 0.75; }
    } else if (P.block) { x = -0.35; y = 1.25; }
    else if (P.act === 'drink') { x = 1.2; y = -0.7; }
    else if (P.act === 'cast' || P.act === 'volley') { x = -0.9 + 0.8 * ease(k / 0.5); y = 0; bright = true; }
    else if (P.act === 'throw') { x = -0.2; y = -1.2 + 2.4 * ease(k / 0.5); }
    else if (P.act === 'leap') { x = -2.0 + 3.0 * ease((k - 0.6) / 0.4); y = 0; bright = k > 0.6; }
    swordPivot.rotation.set(x, y, 0);
    bladeMat.color.setHex(bright ? 0xffffff : SWORDS[swordTier].color);
    if (rune.visible) rune.scale.y = 1 + 0.4 * Math.sin(uTime.value * 6);
  }

  function updatePlayer(dt) {
    const fighting = G.state === 'fight' || G.state === 'intro' || G.state === 'royal';
    const wading = P.y < -0.05;
    P.iframe = Math.max(0, P.iframe - dt);
    if (P.bufferT > 0) { P.bufferT -= dt; if (P.bufferT <= 0) P.buffer = null; }
    if (P.act === 'dead') {
      P.actT += dt; pBody.rotation.x = -Math.min(1.5, P.actT * 3); poseSword(); return { moving: false, dl: 99 };
    }

    P.stone = Math.max(0, P.stone - dt);
    const wantBlock = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && P.st > 0 && P.stone <= 0;
    P.block = wantBlock && (P.act === null);
    if (P.block) P.blockT += dt;

    if (P.stone <= 0) tryBuffered();

    // Stamina, mana and boost timers
    const agi = P.buffAgi > 0;
    P.buffDmg = Math.max(0, P.buffDmg - dt); P.buffAgi = Math.max(0, P.buffAgi - dt);
    P.stDelay -= dt;
    if (P.stDelay <= 0 && P.act !== 'roll') P.st = Math.min(P.stMax, P.st + dt * (P.block ? 14 : 34) * (agi ? 1.5 : 1));
    P.mana = Math.min(P.manaMax, P.mana + dt * (1.5 + 0.15 * PR.spi) * G.env.mana);
    P.cd.z = Math.max(0, P.cd.z - dt); P.cd.v = Math.max(0, P.cd.v - dt); P.cd.x = Math.max(0, P.cd.x - dt);
    P.cd.mp1 = Math.max(0, P.cd.mp1 - dt); P.cd.mp2 = Math.max(0, P.cd.mp2 - dt);

    const mv = moveInput();
    let speed = 0;
    if (P.act === null) {
      speed = (P.block ? 2.4 : 6.8) * (P.mount ? BEAST_TYPES[P.mount.type].speed : 1) * PR.speed * (agi ? 1.4 : 1) * (wading ? 0.6 : 1) * (P.stone > 0 ? 0 : 1);
      if (mv.lengthSq() > 0) {
        mv.normalize();
        movePlayer(mv.x * speed * dt, mv.z * speed * dt);
        if (!(G.lock && lockTarget())) P.facing = Math.atan2(mv.x, mv.z);
        walk += dt * (P.block ? 6 : 12);
      }
      if (P.combo && P.actT > 0.5) P.combo = 0;
    }
    const lt = G.lock && P.act !== 'roll' && P.act !== 'leap' ? lockTarget() : null;
    if (lt) P.facing += angDiff(P.facing, yawTo(player.position, lt.pos)) * Math.min(1, dt * 12);

    if (P.act) {
      P.actT += dt;
      const k = P.actT / P.actDur;
      if (P.act === 'light') {
        if (P.actT < P.actDur * 0.35) { const fv = fwdOf(P.facing); movePlayer(fv.x * 2.2 * dt, fv.z * 2.2 * dt); }
        if (!P.hitDone && k > 0.3) { P.hitDone = true; spawnSwoosh(P.combo === 2); playerStrike(P.combo === 2 ? 30 : 17, P.combo === 2 ? 22 : 11, 2.7, 2.0, false); }
      } else if (P.act === 'heavy') {
        if (k > 0.45 && k < 0.62) { const fv = fwdOf(P.facing); movePlayer(fv.x * 6 * dt, fv.z * 6 * dt); }
        if (!P.hitDone && k > 0.58) { P.hitDone = true; sfx('swoosh'); spawnSwoosh(true); playerStrike(52, 38, 3.0, 1.6, true); }
      } else if (P.act === 'roll') {
        const sp = 13.5 * (1 - k * 0.7) * (agi ? 1.25 : 1) * (wading ? 0.7 : 1) * (P.chargeDmg ? 1.7 : 1);
        if (P.chargeDmg) {
          liveTargets().forEach(t => {
            if (P.chargeHits.has(t) || Math.abs(t.pos.y - player.position.y) > 2.5 || flatDist(player.position, t.pos) > 2.2 + t.radius) return;
            P.chargeHits.add(t); damageEnemy(t, P.chargeDmg, 25, true);
          });
          if (Math.random() < 0.8) burst(player.position.x, player.position.y + 0.5, player.position.z, 2, 3);
        }
        movePlayer(P.rollDir.x * sp * dt, P.rollDir.z * sp * dt);
        if (!P.mount) { pBody.rotation.x = k * TAU; pBody.position.y = -0.25 * Math.sin(k * Math.PI); }
      } else if (P.act === 'gore') {
        if (!P.hitDone && k > 0.4) {
          P.hitDone = true; const bt = BEAST_TYPES[P.mount ? P.mount.type : 'stag'];
          spawnSwoosh(true); G.shake = Math.max(G.shake, 0.25);
          liveTargets().forEach(t => {
            if (Math.abs(t.pos.y - player.position.y) > 2.5) return;
            const d = flatDist(player.position, t.pos), ang = Math.abs(angDiff(P.facing, yawTo(player.position, t.pos)));
            if (P.goreBig ? d < 4.2 + t.radius : (d < 3.6 + t.radius && ang < 1.3)) damageEnemy(t, bt.dmg * (P.goreBig ? 1.4 : 1) * PR.dmg, 30, true);
          });
          if (P.goreBig) { const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.9, depthWrite: false })); m.position.set(player.position.x, P.y + 0.06, player.position.z); scene.add(m); fxRings.push({ m, r: 0.4 }); sfx('boom'); }
        }
      } else if (P.act === 'tame') {
        const b = P.tameTarget;
        if (!b || flatDist(player.position, b.g.position) > 4) { P.act = null; floatText('taming interrupted', player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#ffd36a'); }
        else if (k >= 1) { P.act = null; mount(b); }
        else if (Math.random() < 0.4) burst(b.g.position.x, b.g.position.y + 1.6, b.g.position.z, 1, 2);
        if (!P.act) return { moving: false, dl: Math.hypot(player.position.x - LAKE.x, player.position.z - LAKE.z) };
      } else if (P.act === 'cast') {
        if (!P.hitDone && k > 0.4) { P.hitDone = true; spawnBolt(); }
      } else if (P.act === 'throw') {
        if (!P.hitDone && k > 0.35) { P.hitDone = true; spawnBolt({ dmg: 20 * PR.dmg, speed: 26, home: 0, life: 0.9, poise: 8, color: 0xe8eef2, geo: daggerGeo, heavy: false, trail: false }); }
      } else if (P.act === 'volley') {
        if (!P.hitDone && k > 0.4) { P.hitDone = true; for (let i = -2; i <= 2; i++) spawnBolt({ angle: P.facing + i * 0.2, dmg: 26 * PR.spell, home: 2.2, poise: 12, color: 0xc8a9ff, heavy: false }); }
      } else if (P.act === 'leap') {
        const kk = clamp(k, 0, 1), hgt = Math.max(4, P.leapTo.y - P.leapFrom.y + 4);
        player.position.x = P.leapFrom.x + (P.leapTo.x - P.leapFrom.x) * kk;
        player.position.z = P.leapFrom.z + (P.leapTo.z - P.leapFrom.z) * kk;
        P.leapY = P.leapFrom.y + (P.leapTo.y - P.leapFrom.y) * kk + Math.sin(kk * Math.PI) * hgt;
        pBody.rotation.x = kk < 0.8 ? -kk / 0.8 * TAU : 0;
        if (!P.hitDone && kk >= 1) { P.hitDone = true; P.y = P.leapTo.y; landLeap(); }
      } else if (P.act === 'drink') {
        if (!P.healed && k > 0.55) {
          P.healed = true; P.hp = Math.min(P.max, P.hp + 38); sfx('drink');
          burst(player.position.x, 1.2, player.position.z, 18, 3);
          floatText('+38', player.position.clone().add(new THREE.Vector3(0, 2.2, 0)), '');
        }
      }
      if (P.actT >= P.actDur) {
        const was = P.act; P.act = null; pBody.rotation.x = 0; pBody.position.y = 0; P.chargeDmg = 0;
        if (was === 'light' && P.combo >= 2) P.combo = 0;
        P.actT = was === 'light' ? 0 : 1;
      }
    } else {
      P.actT += dt;
      if (P.combo && P.actT > 0.45) P.combo = 0;
    }

    // Knockback
    if (P.act !== 'leap' && P.kb.lengthSq() > 0.001) { movePlayer(P.kb.x * dt, P.kb.z * dt); P.kb.multiplyScalar(Math.pow(0.004, dt)); }

    const moving = speed > 0 && mv.lengthSq() > 0;
    player.rotation.y = P.facing;
    const stride = moving ? Math.sin(walk) * 0.6 : 0;
    pLegs[0].rotation.x = P.mount ? 0 : stride; pLegs[1].rotation.x = P.mount ? 0 : -stride;
    pLegs[0].rotation.z = P.mount ? 0.7 : 0; pLegs[1].rotation.z = P.mount ? -0.7 : 0;
    braid.rotation.x = 0.25 + (moving ? 0.25 + Math.sin(walk * 2) * 0.12 : Math.sin(uTime.value * 1.5) * 0.04);
    scarf.rotation.x = 0.15 + (moving ? 0.35 : 0);
    cloakMat.color.setHex(P.stone > 0 ? 0x8d8d88 : TUNIC);
    skinMat.color.setHex(P.stone > 0 ? 0xa6a6a0 : 0xd9b48f);
    if (P.mount) { const bt = BEAST_TYPES[P.mount.type]; pBody.position.y = bt.ride + (moving ? Math.abs(Math.sin(walk * 0.8)) * 0.12 : 0); updateRide(dt, moving); }
    else if (P.act !== 'roll') pBody.position.y = moving ? Math.abs(Math.sin(walk)) * 0.08 : 0;
    cloakMat.emissive.setRGB(P.act === 'hurt' ? 0.6 : 0, 0, 0);
    lanternLight.intensity = P.act === 'drink' ? 2.4 : 1.3;

    const dl = Math.hypot(player.position.x - LAKE.x, player.position.z - LAKE.z);
    player.position.y = P.act === 'leap' ? P.leapY : P.y;
    poseSword();
    return { moving, dl };
  }
