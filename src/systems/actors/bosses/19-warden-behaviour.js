  // ---------- Boss behaviour ----------
  function startFight() {
    const tier = worldTier(), m = tierMult(tier) * (1 + 0.35 * (G.wardenRevives || 0));
    B.max = Math.round(1500 * m); B.hp = B.max; G.dmgMult = 1.35 + 0.2 * (tier - 1); G.bossTier = tier; WARDEN.rend = 0;
    ui.bname.textContent = `The Gate Warden \u00b7 Lv ${tier + 2}`;
    G.state = 'intro'; B.state = 'leap'; B.t = 0; B.dur = 1.4;
    B.from.copy(boss.position);
    const dir = new THREE.Vector3(0 - player.position.x, 0, -18 - player.position.z).normalize();
    B.to.copy(player.position).addScaledVector(dir, 5.5); B.to.y = 0;
    clampArena(B.to, -17.4);
    sfx('roar');
    showBanner('The Gate Warden', '', 'title');
    bannerTimer = 2.2;
    ui.hud.hidden = true;
  }

  function landBoss() {
    boss.position.copy(B.to); boss.position.y = 0;
    G.shake = 0.7; sfx('boom');
    burst(boss.position.x, 0.3, boss.position.z, 40, 9);
    spawnDrop(LAKE.x, LAKE.z, 1);
    if (flatDist(player.position, boss.position) < 3.2) hitPlayer(18, boss.position, 9, false);
  }

  function chooseAttack(d) {
    const p2 = B.phase === 2, r = Math.random();
    if (d < 4.8) {
      if (p2 && r < 0.22) return 'leap';
      return r < 0.55 ? 'slam' : 'sweep';
    }
    if (d > 7) {
      if (p2 && r < 0.45) return 'leap';
      return r < 0.7 ? 'charge' : null;
    }
    return null;
  }

  function beginAttack(name) {
    const p2 = B.phase === 2;
    const A = { name, t: 0, stage: 'wind', hit: false };
    if (name === 'slam') { A.wind = p2 ? 0.68 : 0.9; A.rec = p2 ? 0.6 : 0.9; A.r = 2.9; }
    if (name === 'sweep') { A.wind = p2 ? 0.6 : 0.78; A.act = 0.4; A.rec = p2 ? 0.55 : 0.8; A.r = 4.4; }
    if (name === 'charge') { A.wind = p2 ? 0.55 : 0.72; A.act = 0.85; A.rec = p2 ? 0.75 : 1.05; A.len = 16; A.w = 2.4; }
    if (name === 'leap') { A.wind = 0.4; A.air = 1.0; A.rec = 0.85; A.r = 3.3; }
    B.atk = A; B.state = 'attack';
  }

  function bossTurnTo(target, rate, dt) {
    const want = yawTo(boss.position, target);
    B.facing += clamp(angDiff(B.facing, want), -rate * dt, rate * dt);
  }

  function updateAttack(dt) {
    const A = B.atk; A.t += dt;
    const f = fwdOf(B.facing);
    if (A.name === 'slam') {
      if (A.stage === 'wind') {
        if (A.t < A.wind * 0.6) bossTurnTo(player.position, 4, dt);
        wPivot.rotation.x = 1.0 - 3.1 * ease(A.t / A.wind);
        const c = boss.position.clone().addScaledVector(f, 2.6);
        teleCircle.visible = fillCircle.visible = true;
        teleCircle.position.set(c.x, 0.04, c.z); teleCircle.scale.setScalar(A.r);
        fillCircle.position.set(c.x, 0.044, c.z); fillCircle.scale.setScalar(Math.max(0.01, A.r * A.t / A.wind));
        A.c = c;
        if (A.t >= A.wind) {
          A.stage = 'rec'; A.t = 0; hideTele();
          wPivot.rotation.x = 1.2; G.shake = Math.max(G.shake, 0.5); sfx('boom');
          burst(A.c.x, 0.2, A.c.z, 30, 8);
          if (flatDist(player.position, A.c) < A.r + 0.35) hitPlayer(28, A.c, 8, true);
          if (B.phase === 2) spawnWave(A.c.x, A.c.z);
        }
      } else if (A.t >= A.rec) endAttack();
    }
    else if (A.name === 'sweep') {
      if (A.stage === 'wind') {
        bossTurnTo(player.position, 2, dt);
        wPivot.rotation.set(-0.1, -1.4 * ease(A.t / A.wind), 0);
        B.spin = 0.6 * ease(A.t / A.wind);
        teleCircle.visible = fillCircle.visible = true;
        teleCircle.position.set(boss.position.x, 0.04, boss.position.z); teleCircle.scale.setScalar(A.r);
        fillCircle.position.set(boss.position.x, 0.044, boss.position.z); fillCircle.scale.setScalar(Math.max(0.01, A.r * A.t / A.wind));
        if (A.t >= A.wind) { A.stage = 'act'; A.t = 0; hideTele(); sfx('swing'); }
      } else if (A.stage === 'act') {
        B.spin = 0.6 - TAU * ease(A.t / A.act);
        if (!A.hit && A.t > A.act * 0.3) {
          A.hit = true;
          if (flatDist(player.position, boss.position) < A.r + 0.35) hitPlayer(22, boss.position, 10, true);
        }
        if (A.t >= A.act) { A.stage = 'rec'; A.t = 0; B.spin = 0; }
      } else {
        wPivot.rotation.y *= 0.9;
        if (A.t >= A.rec) endAttack();
      }
    }
    else if (A.name === 'charge') {
      if (A.stage === 'wind') {
        if (A.t < A.wind - 0.15) bossTurnTo(player.position, 6, dt);
        wPivot.rotation.x = 1.0 - 0.9 * ease(A.t / A.wind);
        bBody.position.y = -0.15 * ease(A.t / A.wind);
        const c = boss.position.clone().addScaledVector(fwdOf(B.facing), A.len / 2);
        [teleLane, fillLane].forEach(m => { m.visible = true; m.rotation.y = B.facing; });
        teleLane.position.set(c.x, 0.04, c.z); teleLane.scale.set(A.w, 1, A.len);
        const fl = A.len * A.t / A.wind, fc = boss.position.clone().addScaledVector(fwdOf(B.facing), fl / 2);
        fillLane.position.set(fc.x, 0.044, fc.z); fillLane.scale.set(A.w, 1, Math.max(0.01, fl));
        if (A.t >= A.wind) { A.stage = 'act'; A.t = 0; hideTele(); bBody.position.y = 0; sfx('roar'); }
      } else if (A.stage === 'act') {
        const step = f.clone().multiplyScalar(19 * dt);
        boss.position.add(step);
        const blocked = clampArena(boss.position, -17.4);
        if (Math.random() < 0.6) burst(boss.position.x, 0.2, boss.position.z, 2, 3);
        if (!A.hit && flatDist(player.position, boss.position) < 1.9) { A.hit = true; hitPlayer(26, boss.position, 13, true); }
        if (A.t >= A.act || blocked || B.state !== 'attack') { if (B.state === 'attack') { A.stage = 'rec'; A.t = 0; G.shake = Math.max(G.shake, 0.25); } }
      } else if (A.t >= A.rec) endAttack();
    }
    else if (A.name === 'leap') {
      if (A.stage === 'wind') {
        bossTurnTo(player.position, 6, dt);
        bBody.position.y = -0.3 * ease(A.t / A.wind);
        if (A.t >= A.wind) {
          A.stage = 'air'; A.t = 0; bBody.position.y = 0;
          B.from.copy(boss.position);
          B.to.copy(player.position).setY(0); clampArena(B.to, -17.4);
        }
      } else if (A.stage === 'air') {
        const k = clamp(A.t / A.air, 0, 1);
        boss.position.lerpVectors(B.from, B.to, k); boss.position.y = Math.sin(k * Math.PI) * 7;
        wPivot.rotation.x = 1.0 - 3.0 * Math.sin(k * Math.PI * 0.9);
        teleCircle.visible = fillCircle.visible = true;
        teleCircle.position.set(B.to.x, 0.04, B.to.z); teleCircle.scale.setScalar(A.r);
        fillCircle.position.set(B.to.x, 0.044, B.to.z); fillCircle.scale.setScalar(Math.max(0.01, A.r * k));
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; hideTele(); boss.position.y = 0; wPivot.rotation.x = 1.2;
          G.shake = 0.7; sfx('boom'); burst(B.to.x, 0.3, B.to.z, 40, 9);
          if (flatDist(player.position, B.to) < A.r + 0.35) hitPlayer(30, B.to, 11, false);
          spawnWave(B.to.x, B.to.z);
        }
      } else if (A.t >= A.rec) endAttack();
    }
  }
  function endAttack() {
    B.atk = null; B.state = 'chase'; B.spin = 0; bBody.position.y = 0;
    B.cool = (B.phase === 2 ? 0.35 : 0.6) + Math.random() * 0.6;
  }

  function updateBoss(dt) {
    B.flash = Math.max(0, B.flash - dt * 5);
    armor.emissive.setRGB(B.flash * 0.9, B.flash * 0.8, B.flash * 0.6);
    const pulse = 0.75 + 0.25 * Math.sin(uTime.value * (B.phase === 2 ? 9 : 3));
    visorMat.color.setRGB(1 * pulse, (B.phase === 2 ? 0.25 : 0.62) * pulse, (B.phase === 2 ? 0.15 : 0.25) * pulse);
    const d = flatDist(player.position, boss.position);

    if (B.state === 'perch') {
      boss.position.copy(PERCH); boss.position.y += Math.sin(uTime.value * 1.2) * 0.04;
      B.facing = 0;
    } else if (B.state === 'leap') {
      B.t += dt;
      const k = clamp(B.t / B.dur, 0, 1);
      boss.position.lerpVectors(B.from, B.to, k);
      boss.position.y = B.from.y * (1 - k) + Math.sin(k * Math.PI) * 6;
      B.facing = yawTo(boss.position, player.position);
      if (k >= 1) { landBoss(); B.state = 'chase'; B.cool = 1.0; G.state = 'fight'; G.lock = true; G.fightStart = uTime.value; ui.bossbar.hidden = false; ui.pbars.hidden = false; }
    } else if (B.state === 'retreat') {
      B.t += dt;
      const k = clamp(B.t / B.dur, 0, 1);
      boss.position.lerpVectors(B.from, B.to, k); boss.position.y = B.from.y * (1 - k) + B.to.y * k + Math.sin(k * Math.PI) * 9;
      if (k >= 1) { if (B.echoGone) { B.state = 'dead'; boss.visible = false; } else B.state = 'perch'; }
    } else if (B.state === 'roar') {
      B.t += dt;
      bBody.rotation.x = -0.25 * Math.sin(Math.min(1, B.t / 0.3) * Math.PI / 2);
      if (B.t > 0.25 && !B.roared) {
        B.roared = true; sfx('roar'); G.shake = 0.8; spawnWave(boss.position.x, boss.position.z);
        burst(boss.position.x, 3.5, boss.position.z, 40, 8);
      }
      if (B.t > 1.5) { bBody.rotation.x = 0; B.state = 'chase'; B.cool = 0.4; }
    } else if (B.state === 'chase') {
      bossTurnTo(player.position, B.phase === 2 ? 4.5 : 3, dt);
      wPivot.rotation.x += (1.0 - wPivot.rotation.x) * Math.min(1, dt * 6);
      wPivot.rotation.y *= 0.9; wPivot.rotation.z = 0;
      if (d > 2.8) {
        const wading = Math.hypot(boss.position.x - LAKE.x, boss.position.z - LAKE.z) < LAKE.r;
        const sp = (B.phase === 2 ? 3.6 : 2.7) * (wading ? 0.7 : 1);
        boss.position.addScaledVector(fwdOf(B.facing), sp * dt);
        bBody.position.y = Math.abs(Math.sin(uTime.value * 5)) * 0.06;
        if (wading && Math.random() < dt * 4) spawnDrop(boss.position.x, boss.position.z, 1);
      }
      clampArena(boss.position, -17.4);
      B.cool -= dt;
      if (B.cool <= 0 && G.state === 'fight') {
        const a = chooseAttack(d);
        if (a) beginAttack(a); else B.cool = 0.25;
      }
    } else if (B.state === 'attack') {
      updateAttack(dt);
    } else if (B.state === 'stagger') {
      B.t += dt;
      bBody.rotation.x = -0.35 * Math.sin(Math.min(1, B.t / 0.25) * Math.PI / 2) * (1 - clamp((B.t - B.dur + 0.3) / 0.3, 0, 1));
      bBody.rotation.z = Math.sin(B.t * 9) * 0.05;
      wPivot.rotation.x += (1.4 - wPivot.rotation.x) * Math.min(1, dt * 5);
      if (B.t >= B.dur) { bBody.rotation.set(0, 0, 0); B.state = 'chase'; B.cool = 0.5; }
    } else if (B.state === 'dead') {
      B.t += dt;
      bBody.rotation.x = Math.min(1.45, B.t * 1.1);
      if (B.t > 0.6 && B.t < 2.5 && Math.random() < 0.4) burst(boss.position.x + (Math.random() - 0.5) * 2, 1 + Math.random() * 3, boss.position.z + (Math.random() - 0.5) * 2, 2, 2);
      visorMat.color.setRGB(0.1, 0.06, 0.04);
    }
    boss.rotation.y = B.facing + B.spin;

    // Phase change at half health
    if (B.phase === 1 && B.hp <= B.max / 2 && B.state !== 'dead') {
      B.phase = 2; B.state = 'roar'; B.t = 0; B.roared = false; B.atk = null; hideTele(); B.spin = 0; bBody.position.y = 0;
      floatText('ENRAGED', boss.position.clone().add(new THREE.Vector3(0, 5.5, 0)), 'word');
    }

    // Bodies don't overlap
    if (['chase', 'attack', 'stagger', 'roar'].includes(B.state) && boss.position.y < 0.5) {
      const dx = player.position.x - boss.position.x, dz = player.position.z - boss.position.z, dd = Math.hypot(dx, dz);
      if (dd < 1.6 && dd > 1e-4) movePlayer(dx / dd * (1.6 - dd), dz / dd * (1.6 - dd));
    }
  }

  const OBJ_CLIMB = 'Climb the stairs, or leap (O) up onto the roof, to face the Gorgon and the Empress.';
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
  function killBoss() {
    if (G.hunt && G.hunt.echo) {
      // The risen Warden: a bigger reward each time, and it will rise again stronger
      G.wardenRevives = (G.wardenRevives || 0) + 1;
      B.state = 'dead'; B.t = 0; B.atk = null; hideTele(); B.spin = 0;
      const m = tierMult(G.bossTier || 1);
      G.state = G.hunt.prev; G.hunt = null; G.slow = 1.0; G.lock = false; G.target = null; G.dmgMult = 1; sfx('roar');
      waves.forEach(w => { scene.remove(w.m); w.m.material.dispose(); }); waves.length = 0;
      reward(260 * m, 200 * m, boss.position.clone().add(new THREE.Vector3(0, 4, 0)));
      ui.bossbar.hidden = true; ui.hud.hidden = false;
      setTimeout(() => { if (B.state === 'dead') boss.visible = false; }, 3000);
      return;
    }
    G.hunt = null; G.wardenRevives = (G.wardenRevives || 0) + 1;
    B.state = 'dead'; B.t = 0; B.atk = null; hideTele(); B.spin = 0;
    G.state = 'interlude'; G.wardenDown = true; G.slow = 1.4; G.lock = false; G.target = null; sfx('roar');
    waves.forEach(w => { scene.remove(w.m); w.m.material.dispose(); }); waves.length = 0;
    const m = tierMult(G.bossTier || 1);
    PR.warden = true; recalc(); P.armor = P.armorMax; P.mana = P.manaMax;
    reward(300 * m, 160 * m, boss.position.clone().add(new THREE.Vector3(0, 4, 0)));
    dropRelic(boss.position.x + 2, boss.position.z + 1);
    completeChapter('moat');
    setTimeout(() => {
      if (G.state !== 'interlude') return;
      showBanner("Warden's Might", 'You took its power: Leap (O), +40 armour, +25% damage, +10% speed, +50 mana. The stairs are open.', 'title');
      bannerTimer = 5;
      ui.bossbar.hidden = true; ui.hud.hidden = false;
      ui.obj.textContent = OBJ_CLIMB;
    }, 1500);
  }
  function killPlayer() {
    G.state = 'dead'; G.lock = false; P.act = 'dead'; P.actT = 0; hideTele();
    royals.forEach(r => r.tele.hide());
    let text;
    if (G.world !== 'moat' || G.storm) {
      text = `You keep your level and lose a fifth of your gold.${G.storm ? ' The rift storm lets go of you.' : ''}`;
    } else if (G.wardenDown) {
      const left = royals.filter(r => r.alive).map(r => `${r.name} ${Math.round(r.hp / r.max * 100)}%`).join(', ');
      text = `Still standing: ${left}. You keep your level and lose a fifth of your gold.`;
    } else {
      text = `You keep your level and lose a fifth of your gold. Level up on creeps and chests before the next try.`;
    }
    setTimeout(() => showBanner('You fell', text, 'lose', 'Try again'), 1100);
  }
  // The queens falling is not the end: it is an Ascension (see world/moat/46c-ascension.js)
  function winGame() {
    G.lock = false; G.slow = 1.2; G.target = null;
    shots.forEach(s => scene.remove(s.m)); shots.length = 0;
    ascend(uTime.value - G.fightStart);
  }
