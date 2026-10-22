  // ---------- Sword swooshes ----------
  const swooshes = [];
  function spawnSwoosh(big) {
    const th = big ? 2.5 : 2.0, r0 = big ? 1.4 : 1.0, r1 = (big ? 3.4 : 2.6) * (1 + swordTier * 0.06);
    const geo = new THREE.RingGeometry(r0, r1, 28, 1, -Math.PI / 2 - th / 2, th).rotateX(-Math.PI / 2);
    const col = SWORDS[swordTier].rune || 0xffffff;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(player.position.x, player.position.y + (P.mount ? 2 : 1.0), player.position.z); m.rotation.y = P.facing;
    scene.add(m); swooshes.push({ m, t: 0, dur: big ? 0.3 : 0.22 });
    for (let i = 0; i < 6 + swordTier * 2; i++) { const a = P.facing + (Math.random() - 0.5) * th; burst(player.position.x + Math.sin(a) * r1 * 0.9, m.position.y, player.position.z + Math.cos(a) * r1 * 0.9, 1, 2); }
  }
  function updateSwooshes(dt) {
    for (let i = swooshes.length - 1; i >= 0; i--) {
      const w = swooshes[i]; w.t += dt; const k = w.t / w.dur;
      w.m.material.opacity = 0.85 * Math.max(0, 1 - k); w.m.scale.setScalar(1 + k * 0.18); w.m.rotation.y += dt * 1.5;
      if (k >= 1) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); swooshes.splice(i, 1); }
    }
  }
