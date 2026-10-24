  // ---------- Warden's Leap ----------
  function planLeap() {
    const live = liveTargets();
    const t = (G.target && live.includes(G.target) && flatDist(player.position, G.target.pos) < 16) ? G.target : null;
    const dest = t ? t.pos.clone().addScaledVector(fwdOf(yawTo(t.pos, player.position)), t.radius + 0.8)
                   : player.position.clone().addScaledVector(fwdOf(P.facing), 9);
    for (let s = 1; s >= 0.2; s -= 0.1) {
      const p = player.position.clone().lerp(dest, s), h = groundAt(p.x, p.z);
      if (h < 50) { P.leapFrom = player.position.clone().setY(P.y); P.leapTo = new THREE.Vector3(p.x, h, p.z); return true; }
    }
    return false;
  }
  const fxRings = [];
  function landLeap() {
    G.shake = Math.max(G.shake, 0.6); sfx('boom');
    burst(player.position.x, P.y + 0.3, player.position.z, 40, 9);
    const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(player.position.x, P.y + 0.06, player.position.z); scene.add(m); fxRings.push({ m, r: 0.4 });
    const kind = P.leapKind; P.leapKind = null;
    const leapDmg = kind === 'pounce' ? 75 * PR.dmg : kind === 'dive' ? 55 * PR.spell : 60 * PR.dmg;
    liveTargets().forEach(t => { if (Math.abs(t.pos.y - P.y) < 2.5 && flatDist(player.position, t.pos) < (kind === 'dive' ? 4.2 : 3.4) + t.radius) damageEnemy(t, leapDmg, 40, true); });
    if (kind === 'dive') {
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; addPatch(player.position.x + Math.cos(a) * 2.6, P.y, player.position.z + Math.sin(a) * 2.6, 1.3, true); }
      for (let i = 0; i < 60; i++) { fwColor.setHSL(0.03 + Math.random() * 0.07, 1, 0.55); const a = Math.random() * TAU, sp = 3 + Math.random() * 6; fwParticle(player.position.x, P.y + 0.4, player.position.z, Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp, fwColor, 0.9, false); }
    }
    if (P.y < 0) spawnDrop(player.position.x, player.position.z, 1);
  }
  function updateFxRings(dt) {
    for (let i = fxRings.length - 1; i >= 0; i--) {
      const f = fxRings[i]; f.r += dt * 12; f.m.scale.setScalar(f.r); f.m.material.opacity = Math.max(0, 0.9 * (1 - f.r / 4.5));
      if (f.r > 4.5) { scene.remove(f.m); f.m.material.dispose(); fxRings.splice(i, 1); }
    }
  }
