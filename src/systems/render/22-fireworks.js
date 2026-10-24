  // ---------- Fireworks ----------
  const FW = 1400, fwPos = new Float32Array(FW * 3).fill(-999), fwVel = new Float32Array(FW * 3), fwCol = new Float32Array(FW * 3), fwBase = new Float32Array(FW * 3), fwLife = new Float32Array(FW), fwMax = new Float32Array(FW), fwGlit = new Uint8Array(FW);
  const fwGeo = new THREE.BufferGeometry();
  fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
  const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fireworks.frustumCulled = false; scene.add(fireworks);
  let fwIdx = 0; const rockets = [], fwColor = new THREE.Color();
  function fwParticle(x, y, z, vx, vy, vz, col, life, glitter) {
    const j = fwIdx; fwIdx = (fwIdx + 1) % FW;
    fwPos[j * 3] = x; fwPos[j * 3 + 1] = y; fwPos[j * 3 + 2] = z;
    fwVel[j * 3] = vx; fwVel[j * 3 + 1] = vy; fwVel[j * 3 + 2] = vz;
    fwBase[j * 3] = col.r; fwBase[j * 3 + 1] = col.g; fwBase[j * 3 + 2] = col.b;
    fwLife[j] = fwMax[j] = life; fwGlit[j] = glitter ? 1 : 0;
  }
  function launchFirework(from) {
    rockets.push({ p: from.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 5, 9 + Math.random() * 4, (Math.random() - 0.5) * 5), t: 0, fuse: 0.7 + Math.random() * 0.5, hue: Math.random(), shape: Math.floor(Math.random() * 3) });
  }
  function updateFireworks(dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt; r.v.y -= 6 * dt; r.p.addScaledVector(r.v, dt);
      fwColor.setHSL(0.08, 1, 0.6);
      fwParticle(r.p.x, r.p.y, r.p.z, (Math.random() - 0.5), -1, (Math.random() - 0.5), fwColor, 0.35, false);
      if (r.t >= r.fuse) {
        const n = 120;
        for (let k = 0; k < n; k++) {
          let vx, vy, vz;
          if (r.shape === 1) { const a = k / n * TAU; vx = Math.cos(a); vy = Math.sin(a) * 0.35; vz = Math.sin(a); }
          else { const u = Math.random() * 2 - 1, a = Math.random() * TAU, sq = Math.sqrt(1 - u * u); vx = sq * Math.cos(a); vy = u; vz = sq * Math.sin(a); }
          const sp = (r.shape === 2 ? 5 : 7) + Math.random() * 3;
          const hue = (r.shape === 2 && k % 2) ? (r.hue + 0.5) % 1 : r.hue;
          fwColor.setHSL(hue, 1, 0.55 + Math.random() * 0.2);
          fwParticle(r.p.x, r.p.y, r.p.z, vx * sp, vy * sp, vz * sp, fwColor, 1.3 + Math.random() * 0.8, Math.random() < 0.25);
        }
        if (flatDist(r.p, player.position) < 70) sfx('pop');
        rockets.splice(i, 1);
      }
    }
    for (let j = 0; j < FW; j++) {
      if (fwLife[j] <= 0) continue;
      fwLife[j] -= dt;
      if (fwLife[j] <= 0) { fwPos[j * 3 + 1] = -999; fwCol[j * 3] = fwCol[j * 3 + 1] = fwCol[j * 3 + 2] = 0; continue; }
      const drag = Math.max(0, 1 - 1.4 * dt);
      fwVel[j * 3] *= drag; fwVel[j * 3 + 1] = fwVel[j * 3 + 1] * drag - 2.6 * dt; fwVel[j * 3 + 2] *= drag;
      fwPos[j * 3] += fwVel[j * 3] * dt; fwPos[j * 3 + 1] += fwVel[j * 3 + 1] * dt; fwPos[j * 3 + 2] += fwVel[j * 3 + 2] * dt;
      let f = fwLife[j] / fwMax[j]; if (fwGlit[j]) f *= Math.random() < 0.5 ? 1.4 : 0.2;
      fwCol[j * 3] = fwBase[j * 3] * f; fwCol[j * 3 + 1] = fwBase[j * 3 + 1] * f; fwCol[j * 3 + 2] = fwBase[j * 3 + 2] * f;
    }
    fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true;
  }

  function addPatch(x, y, z, r, friendly) {
    const m = new THREE.Mesh(patchGeo, new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.6, depthWrite: false }));
    m.position.set(x, y + 0.06, z); m.scale.setScalar(r); scene.add(m);
    patches.push({ m, r, t: 3.5, friendly: !!friendly, tick: 0 });
  }
  function burnPlayer(d) {
    if (P.armor > 0) { const a = Math.min(P.armor, d); P.armor -= a; d -= a; }
    P.hp = Math.max(0, P.hp - d); P.burnFx = (P.burnFx || 0) + d;
    if (P.burnFx > 4) { floatText(String(Math.round(P.burnFx)), player.position.clone().add(new THREE.Vector3(0, 2, 0)), 'hurt'); P.burnFx = 0; }
    if (P.hp <= 0 && G.state !== 'dead') { if (G.realm === 'spirit') forceReturn(); else killPlayer(); }
  }
  function updatePatches(dt) {
    for (let i = patches.length - 1; i >= 0; i--) {
      const p = patches[i]; p.t -= dt;
      p.m.material.opacity = Math.max(0, Math.min(0.6, p.t / 3.5 * 0.8)) * (0.75 + 0.25 * Math.sin(uTime.value * 20 + i));
      if (Math.random() < 0.3) burst(p.m.position.x + (Math.random() - 0.5) * p.r * 1.4, p.m.position.y, p.m.position.z + (Math.random() - 0.5) * p.r * 1.4, 1, 2);
      if (p.friendly) {
        p.tick -= dt;
        if (p.tick <= 0) { p.tick = 0.5; liveTargets().forEach(t => { if (Math.abs(t.pos.y - p.m.position.y) < 2 && flatDist(t.pos, p.m.position) < p.r + t.radius) damageEnemy(t, 8 * PR.spell, 4, false); }); }
      } else if (G.state !== 'won' && !G.shop && P.act !== 'dead' && P.iframe <= 0 && flatDist(player.position, p.m.position) < p.r && Math.abs(player.position.y - p.m.position.y) < 1) burnPlayer(12 * dt);
      if (p.t <= 0) { scene.remove(p.m); p.m.material.dispose(); patches.splice(i, 1); }
    }
  }

  function resetRoyals() {
    royals.forEach(r => {
      if (r.field) return;
      Object.assign(r, { hp: r.max, poise: 100, state: 'idle', t: 0, atk: null, cool: 1.2, facing: 0, flash: 0, alive: true, active: false, enraged: false, blinkCd: 0 });
      r.pos.copy(r.home); r.body.rotation.set(0, 0, 0); r.body.position.y = r.hover; r.g.scale.setScalar(1.15); r.pivot.rotation.set(0, 0, 0); r.tele.hide();
      if (r.off) r.off.rotation.set(0, 0, 0);
      if (r.eyeMat) r.eyeMat.color.setHex(0xd8ff5a);
    });
    shots.forEach(s => scene.remove(s.m)); shots.length = 0;
  }

  function resetVitals() {
    Object.assign(P, { hp: P.max, st: P.stMax, stDelay: 0, flasks: PR.flaskMax, act: null, actT: 0, combo: 0, buffer: null, iframe: 0, block: false, facing: Math.PI,
      mana: Math.max(50, P.manaMax * 0.5), armor: 0, buffDmg: 0, buffAgi: 0, y: 0, stone: 0 });
    Object.assign(P.cd, { z: 0, v: 0, x: 0, mp1: 0, mp2: 0 });
    if (P.mount) dismount(true);
    P.kb.set(0, 0, 0);
    bolts.forEach(b => { scene.remove(b.m); b.m.material.dispose(); }); bolts.length = 0;
    cshots.forEach(s => scene.remove(s.m)); cshots.length = 0;
    patches.forEach(p => { scene.remove(p.m); p.m.material.dispose(); }); patches.length = 0;
    pBody.rotation.set(0, 0, 0); pBody.position.y = 0;
    keys.clear(); nums.forEach(n => n.el.remove()); nums.length = 0;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    yaw = 0; first = true;
  }
  function resetWarden() {
    boss.visible = true; G.hunt = null; G.huntClock = 0;
    Object.assign(B, { hp: B.max, poise: 100, phase: 1, state: 'perch', t: 0, atk: null, cool: 1, facing: 0, flash: 0, spin: 0 });
    boss.position.copy(PERCH); bBody.rotation.set(0, 0, 0); bBody.position.y = 0; wPivot.rotation.set(1, 0, 0);
    waves.forEach(w => { scene.remove(w.m); w.m.material.dispose(); }); waves.length = 0;
    hideTele(); ui.bossbar.hidden = true; ui.bname.textContent = 'The Gate Warden';
  }
  const OBJ_START = 'Build up on creeps, ancients, chests and the hedge maze to the south-west. When you are ready, press E at the castle gate.';
  function resetGame() {
    if (G.realm === 'spirit') setRealm('material', true);
    resetStory();
    Object.assign(PR, { level: 1, xp: 0, gold: 0, points: 0, str: 0, vit: 0, agi: 0, spi: 0, weapon: 0, armorLv: 0, flaskMax: 3, warden: false });
    recalc();
    Object.assign(G, { state: 'explore', hitstop: 0, slow: 0, shake: 0, lock: false, parries: 0, hitsTaken: 0, wardenDown: false, target: null, dmgMult: 1, runStart: uTime.value, shop: false });
    resetVitals(); player.position.copy(SPAWN);
    resetWarden(); resetRoyals(); resetDragon(); resetRoyalField(); G.wardenRevives = 0; resetArsenal(); resetTrouble();
    wards.forEach(w => { w.visible = true; w.material.opacity = 0.7; });
    chests.forEach(c => { c.tier = c.maze ? 3 : 1; c.open = false; c.refill = 0; c.tierT = 0; chestLook(c); });
    creeps.forEach((c, i) => { c.alive = false; c.g.visible = false; c.tele.hide(); c.bar.hidden = true; c.respawn = 1 + i * 0.5; });
    loot.forEach(l => { scene.remove(l.m); l.m.material.dispose(); }); loot.length = 0;
    ui.royalbars.hidden = true; ui.obj.textContent = OBJ_START;
    ui.banner.hidden = true; ui.hud.hidden = false; ui.shop.hidden = true;
  }
  // After a death: keep level, gear and gold (minus a fifth). The Warden stays dead once beaten.
  function respawn() {
    if (G.realm === 'spirit') setRealm('material', true);
    const lost = Math.round(PR.gold * 0.2); PR.gold -= lost;
    resetVitals();
    ui.royalbars.hidden = true; ui.banner.hidden = true; ui.hud.hidden = false;
    const storm = G.storm;
    if (G.world !== 'moat' || storm) {
      // Another world, or a rift storm: wake at a world spawn and leave the moat's Warden and royals alone
      Object.assign(G, { hitstop: 0, slow: 0, shake: 0, lock: false, target: null, shop: false });
      G.state = G.wardenDown ? 'interlude' : 'explore';
      calmStoryBoss(G.world);
      G.storm = null;
      const to = storm ? storm.from : G.world;
      enterWorld(to, spawnOf(to), storm ? 'stormEnd' : 'respawn');
    } else {
      if (G.hunt && G.hunt.echo) { B.state = 'dead'; boss.visible = false; hideTele(); ui.bossbar.hidden = true; }
      Object.assign(G, { hitstop: 0, slow: 0, shake: 0, lock: false, target: null, shop: false, hunt: null, huntClock: 0 });
      if (G.wardenDown) {
        resetRoyals(); if (royals.some(r => !r.field)) royalsToField(false); G.state = 'interlude'; player.position.set(1.5, 0, -16); ui.obj.textContent = OBJ_CLIMB;
      } else {
        resetWarden(); G.state = 'explore'; player.position.copy(SPAWN); ui.obj.textContent = OBJ_START;
      }
    }
    renderHero();
    if (lost) floatText(`-${lost} gold`, player.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 'word', '#ffd36a');
  }
  function restart() { if (G.state === 'dead') respawn(); else resetGame(); }
  ui.bbtn.addEventListener('click', restart);
