  // ---------- Loop ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const label = $('#label'), proj = new THREE.Vector3();
  let last = performance.now(), nextFish = 1.5, lastSplash = 0, walk = 0, first = true;

  function project(v) {
    proj.copy(v).project(camera);
    return { x: (proj.x + 1) / 2 * window.innerWidth, y: (1 - proj.y) / 2 * window.innerHeight, ok: proj.z < 1 && Math.abs(proj.x) < 1.2 && Math.abs(proj.y) < 1.2 };
  }

  function frame(now) {
    // Schedule the next frame first, so one bad frame can never stop the game
    requestAnimationFrame(frame);
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    let dt = real;
    if (!G.shop && !G.paused) worldTick(real);
    if (G.shop || G.paused) dt = 0;
    else if (G.hitstop > 0) { G.hitstop -= real; dt = 0; }
    else if (G.slow > 0) { G.slow -= real; dt = real * 0.3; }
    uTime.value += dt;
    const t = uTime.value;


    const pr = updatePlayer(dt);
    updateStatus(dt); updateRend(dt);
    const inMoat = G.world === 'moat';
    if (inMoat) { updateBoss(dt); updatePods(dt); }
    updateBolts(dt);
    royals.forEach(r => updateRoyal(r, dt)); updateShots(dt);
    if (inMoat) updateDragon(dt);
    updateFireworks(dt);
    updatePatches(dt);
    creeps.forEach(c => updateCreep(c, dt));
    updateCreepShots(dt);
    if (inMoat) updateChests(dt);
    updateLoot(dt); updateRelics(dt, real);
    updateFxRings(dt);
    if (inMoat) updateTraps(dt);
    if (inMoat) updatePuzzles(dt);
    updateSwooshes(dt);
    if (inMoat) { updateBeasts(dt); if (!G.storm) updateHunt(dt); }
    if (inMoat && !G.storm && G.state === 'interlude' && !(G.royalLull > 0) && player.position.y > ROOF.y - 0.5 && Math.abs(player.position.z) > 20) startRoyal();
    if (!G.shop && !G.paused) { updateWorlds(dt, real); updateAscension(dt, real); updateMythics(dt, real); }
    if (G.wardenDown) wards.forEach(w => { if (w.visible) { w.material.opacity -= real * 0.6; if (w.material.opacity <= 0) w.visible = false; } });
    else wards.forEach(w => { w.material.opacity = 0.55 + 0.2 * Math.sin(t * 6); });

    // Shockwaves
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i]; w.r += dt * 8.5;
      w.m.scale.setScalar(w.r); w.m.material.opacity = 0.9 * (1 - w.r / 16);
      const pd = flatDist(player.position, w.m.position);
      if (!w.hit && Math.abs(pd - w.r) < 0.55) { w.hit = hitPlayer(14, w.m.position, 7, false) || P.iframe > 0; }
      if (w.r > 16) { scene.remove(w.m); w.m.material.dispose(); waves.splice(i, 1); }
    }

    // Sparks
    for (let i = 0; i < SP; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= dt;
      if (spLife[i] <= 0) { spPos[i * 3 + 1] = -999; continue; }
      spVel[i * 3 + 1] -= 14 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] = Math.max(0.03, spPos[i * 3 + 1] + spVel[i * 3 + 1] * dt); spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
    }
    spGeo.attributes.position.needsUpdate = true;

    // Ripples
    const inLake = pr.dl < LAKE.r - 0.2;
    if ((pr.moving || P.act === 'roll') && pr.dl < LAKE.r + 1.4 && P.y < 1 && t - lastSplash > (inLake ? 0.28 : 0.4)) {
      lastSplash = t;
      if (inLake) spawnDrop(player.position.x, player.position.z, 1);
      else {
        const dx = player.position.x - LAKE.x, dz = player.position.z - LAKE.z;
        spawnDrop(LAKE.x + dx / pr.dl * (LAKE.r - 0.4), LAKE.z + dz / pr.dl * (LAKE.r - 0.4), 0.8);
      }
    }
    if (t > nextFish) { nextFish = t + (reduce ? 4 : 1.2 + Math.random() * 1.8); const a = Math.random() * TAU, rr = Math.random() * (LAKE.r - 1.5); spawnDrop(LAKE.x + Math.cos(a) * rr, LAKE.z + Math.sin(a) * rr, 0.6); }

    torches.forEach(tc => { const k = 0.85 + 0.15 * Math.sin(t * 13 + tc.phase) * Math.sin(t * 7.3 + tc.phase * 2); tc.light.intensity = 2.2 * k; tc.flame.scale.set(1, k, 1); });
    grassU.uTorchI.value = 0.9 + 0.1 * Math.sin(t * 11);
    lantern.getWorldPosition(grassU.uLantern.value);
    for (let i = 0; i < FF; i++) {
      const b = ffBase[i];
      ffPos[i * 3] = b[0] + Math.sin(t * 0.5 + b[3]) * 1.2; ffPos[i * 3 + 1] = b[1] + Math.sin(t * 1.3 + b[3] * 2) * 0.35; ffPos[i * 3 + 2] = b[2] + Math.cos(t * 0.4 + b[3]) * 1.2;
    }
    ffGeo.attributes.position.needsUpdate = true;

    // Camera: free while exploring, locked onto the Warden in a fight
    const camTarget = G.lock ? lockTarget() : null;
    if (camTarget) {
      const want = Math.atan2(-(camTarget.pos.x - player.position.x), -(camTarget.pos.z - player.position.z));
      yaw += angDiff(yaw, want) * (1 - Math.pow(0.02, real));
    }
    const cf = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const inFight = G.state !== 'explore';
    const baseY = Math.max(0, P.y) + (P.mount ? 1 : 0);
    const wantPos = player.position.clone().addScaledVector(cf, inFight ? -9.5 : -8).setY(baseY + (inFight ? 8.2 : 7.2));
    const wantLook = player.position.clone().addScaledVector(cf, 3.5).setY(baseY + 1.2);
    const k = first ? 1 : 1 - Math.pow(0.0004, real);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); first = false;
    G.shake = Math.max(0, G.shake - real * 1.8);
    const sh = reduce ? 0 : G.shake * G.shake * 0.6;
    camera.position.copy(camPos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    camera.lookAt(camLook);
    // Fade any tree standing between the camera and the hero
    {
      const ax = camera.position.x, az = camera.position.z, bx = player.position.x, bz = player.position.z;
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      trees.forEach(tr => {
        let want = 1;
        if (Math.abs(tr.x - bx) < 16 && Math.abs(tr.z - bz) < 16) {
          const t = ((tr.x - ax) * dx + (tr.z - az) * dz) / len2;
          if (t > 0.05 && t < 1.05) { const px = ax + dx * t - tr.x, pz = az + dz * t - tr.z; if (px * px + pz * pz < 7.5) want = 0.15; }
        }
        tr.fade += (want - tr.fade) * Math.min(1, real * 8);
        tr.lm.opacity = tr.fade; tr.lm.depthWrite = tr.fade > 0.95;
      });
    }
    sky.position.copy(camera.position);

    // Pass 1: reflection from a camera mirrored below the water line
    if (S.reflect && G.world === 'moat' && Math.hypot(player.position.x - LAKE.x, player.position.z - LAKE.z) < 45) {
      mirrorCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
      mirrorCam.lookAt(camLook.x, -camLook.y, camLook.z);
      water.visible = false;
      sky.position.copy(mirrorCam.position);
      renderer.setRenderTarget(reflRT); renderer.render(scene, mirrorCam);
      sky.position.copy(camera.position);
      water.visible = true;
    }
    // Pass 2: the normal scene into a texture. Pass 3: turn it into characters.
    markDynamic();
    scene.overrideMaterial = maskFriend; camera.layers.set(1);
    renderer.setRenderTarget(maskRT); renderer.render(scene, camera);
    renderer.autoClear = false; scene.overrideMaterial = maskFoe; camera.layers.set(2);
    renderer.render(scene, camera);
    renderer.autoClear = true; scene.overrideMaterial = null; camera.layers.set(0);
    gfxBeforeScene();
    renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
    gfxAfterScene();
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);

    // HTML layer
    const lp = project(player.position.clone().setY(2.15));
    label.hidden = !lp.ok || G.state !== 'explore';
    if (!label.hidden) label.style.transform = `translate(${lp.x}px, ${lp.y}px) translate(-50%, -100%)`;
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += real; n.pos.y += real * 1.1;
      const sp = project(n.pos);
      n.el.style.opacity = String(1 - Math.max(0, (n.t - 0.6) / 0.4));
      n.el.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -50%)`;
      if (n.t > 1 || !sp.ok) { n.el.remove(); nums.splice(i, 1); }
    }
    if (G.state !== 'explore') {
      ui.bfill.style.width = (B.hp / B.max * 100) + '%'; ui.bghost.style.width = (B.hp / B.max * 100) + '%';
      ui.pfill.style.width = (B.state === 'stagger' ? 0 : B.poise) + '%';
      ui.btag.textContent = B.state === 'stagger' ? 'Staggered' : G.hunt ? `Hunting \u00b7 ${Math.ceil(Math.max(0, G.hunt.t))}s` : (B.phase === 2 ? 'Enraged' : '');
    }
    const hpPct = P.hp / P.max * 100, mPct = P.mana / P.manaMax;
    ui.coilFill.style.strokeDashoffset = String(100 - hpPct);
    ui.pbars.classList.toggle('low', hpPct > 0 && hpPct < 30);
    ui.arRing.style.strokeDasharray = `${P.armor / P.armorMax * 100} 100`;
    ui.orbFill.setAttribute('y', String(68 - 16 * mPct)); ui.orbFill.setAttribute('height', String(16 * mPct));
    ui.sfill.style.width = (Math.max(0, P.st) / P.stMax * 100) + '%';
    ui.hnum.textContent = Math.ceil(P.hp); ui.anum.textContent = Math.ceil(P.armor); ui.mnum.textContent = Math.floor(P.mana);
    ui.flasks.textContent = '◆'.repeat(Math.max(0, P.flasks)) + '◇'.repeat(Math.max(0, PR.flaskMax - P.flasks));
    if (!ui.royalbars.hidden) {
      royals.forEach((r, i) => {
        const w = (r.hp / r.max * 100) + '%', b = ui.rb[i];
        b.fill.style.width = w; b.ghost.style.width = w;
        b.tag.textContent = !r.alive ? 'Fallen' : r.state === 'stagger' ? 'Staggered' : (r.enraged ? 'Enraged' : '');
        b.row.classList.toggle('dead', !r.alive);
      });
    }
    updateHud(real);
    const mark = G.lock ? lockTarget() : null;
    ui.lockmark.hidden = !mark;
    if (mark) {
      const mp = project(mark.pos.clone().setY(mark.pos.y + mark.markY));
      ui.lockmark.hidden = !mp.ok;
      ui.lockmark.style.transform = `translate(${mp.x}px, ${mp.y}px) translate(-50%, -100%)`;
    }
    const chips = (P.buffDmg > 0 ? `<span class="chip red">Damage ${Math.ceil(P.buffDmg)}s</span>` : '') + (P.buffAgi > 0 ? `<span class="chip yellow">Agility ${Math.ceil(P.buffAgi)}s</span>` : '')
      + (P.flow > 0 ? `<span class="chip cyan">Flow ${P.flow.toFixed(1)}s</span>` : '') + (P.riposte > 0 ? `<span class="chip orange">Riposte ${P.riposte.toFixed(1)}s</span>` : '');
    if (chips !== ui.chipsHTML) { ui.chips.innerHTML = chips; ui.chipsHTML = chips; }
    if (bannerTimer > 0) { bannerTimer -= real; if (bannerTimer <= 0 && ui.banner.className === 'title') ui.banner.hidden = true; }
  }
  requestAnimationFrame(frame);
