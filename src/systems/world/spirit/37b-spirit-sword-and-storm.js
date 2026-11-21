  // ---------- Spirit sword and the Veil's storm ----------
  // Crossing the Veil turns the sword into a translucent Spirit Blade (30% more damage there), and the realm itself
  // flickers with violet lightning, rising motes and a pulsing edge.
  const spiritBladeMat = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.85, depthWrite: false });
  const spiritAura = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 1.15), new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
  spiritAura.position.z = 0.55; spiritAura.visible = false; bladeGroup.add(spiritAura);
  let spiritBlade = false, nextSpiritBolt = 4;
  const VEIL_BOLT_R = 2.4, veilBolts = [], veilTelePool = [];
  function queueStrike(x, z, dur) { veilBolts.push({ x, z, t: 0, dur, tele: veilTelePool.pop() || makeTele() }); }
  function hideStrikes() { veilBolts.forEach(s => { s.tele.hide(); veilTelePool.push(s.tele); }); veilBolts.length = 0; nextSpiritBolt = 4; }
  const tipWorld = new THREE.Vector3();
  function spiritTick(real) {
    const on = G.realm === 'spirit', t = uTime.value;
    if (on !== spiritBlade) {
      spiritBlade = on;
      bladeBody.material = bladeTip.material = on ? spiritBladeMat : bladeMat;
      spiritAura.visible = on;
      if (on) { rune.visible = true; floatText('Your sword becomes a Spirit Blade', player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#c8a0ff'); }
      else updateSwordLook();
    }
    if (!on) return;
    spiritBladeMat.color.setHSL(0.72 + 0.06 * Math.sin(t * 3), 0.85, 0.72);
    runeMat.color.setHSL(0.78, 1, 0.8);
    spiritAura.scale.set(1 + 0.3 * Math.sin(t * 6), 1, 1.05);
    if (Math.random() < 0.5) {
      bladeTip.getWorldPosition(tipWorld);
      fwColor.setHSL(0.74, 0.8, 0.8); fwParticle(tipWorld.x, tipWorld.y, tipWorld.z, (Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4, fwColor, 0.5, true);
    }
    // Motes rising all around you
    for (let i = 0; i < 2; i++) {
      fwColor.setHSL(0.68 + Math.random() * 0.12, 0.7, 0.75);
      fwParticle(player.position.x + (Math.random() - 0.5) * 30, player.position.y + Math.random() * 2, player.position.z + (Math.random() - 0.5) * 30, 0, 0.8 + Math.random(), 0, fwColor, 2.5, Math.random() < 0.4);
    }
    // Violet lightning: a ring glows where a bolt will land, then it strikes. Most bolts hunt the hero (aimed at where
    // she is, a little off), the rest fall nearby. They come faster as the Veil stirs; from tier 3 they fall in pairs.
    nextSpiritBolt -= real;
    if (nextSpiritBolt <= 0) {
      const vt = P.veilTier;
      nextSpiritBolt = Math.max(1.8, (5 + Math.random() * 5) * (1 - 0.15 * vt));
      for (let n = vt >= 3 ? 2 : 1; n > 0; n--) {
        const near = Math.random() < 0.7, a = Math.random() * TAU, r = near ? Math.random() * 2.5 : 5 + Math.random() * 9;
        queueStrike(player.position.x + Math.cos(a) * r, player.position.z + Math.sin(a) * r, vt >= 4 ? 0.85 : 1.1);
      }
    }
    for (let i = veilBolts.length - 1; i >= 0; i--) {
      const s = veilBolts[i]; s.t += real;
      const y = Math.max(0, groundAt(s.x, s.z) < 50 ? groundAt(s.x, s.z) : 0);
      s.tele.circle(s.x, y, s.z, VEIL_BOLT_R, s.t / s.dur);
      if (s.t < s.dur) continue;
      s.tele.hide(); veilBolts.splice(i, 1); veilTelePool.push(s.tele);
      skyU.uHor.value.set(0.85, 0.6, 1.0); skyU.uZen.value.set(0.35, 0.2, 0.55);
      G.shake = Math.max(G.shake, 0.3); sfx('boom');
      for (let k = 0; k < 60; k++) { fwColor.setHSL(0.76, 0.6, 0.85); fwParticle(s.x + (Math.random() - 0.5) * 0.8, y + Math.random() * 22, s.z + (Math.random() - 0.5) * 0.8, 0, -4, 0, fwColor, 0.35, true); }
      for (let k = 0; k < 24; k++) { const b = Math.random() * TAU, sp = 3 + Math.random() * 4; fwColor.setHSL(0.74, 0.8, 0.8); fwParticle(s.x, y + 0.2, s.z, Math.cos(b) * sp, 1 + Math.random() * 2, Math.sin(b) * sp, fwColor, 0.5, true); }
      if (Math.hypot(player.position.x - s.x, player.position.z - s.z) < VEIL_BOLT_R && P.act !== 'dead')
        hitPlayer(Math.round(P.max * (0.12 + 0.02 * P.veilTier)), new THREE.Vector3(s.x, y, s.z), 6, false);
    }
  }
