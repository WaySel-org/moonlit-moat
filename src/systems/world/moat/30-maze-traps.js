  // ---------- Maze traps: spike plates and flame vents ----------
  const traps = [];
  const spikeMat = new THREE.MeshLambertMaterial({ color: 0xb8c0c8, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const kind = i % 3 === 2 ? 'flame' : 'spike';
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const plateMat = new THREE.MeshBasicMaterial({ color: 0x3a1a14 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 2.6), plateMat); plate.position.y = 0.04; g.add(plate);
    const spikes = new THREE.Group(); g.add(spikes);
    if (kind === 'spike') for (let a = 0; a < 9; a++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 5), spikeMat); sp.position.set((a % 3 - 1) * 0.8, 0.45, (Math.floor(a / 3) - 1) * 0.8); spikes.add(sp); }
    traps.push({ kind, g, plateMat, spikes, phase: 0, hit: false, period: kind === 'spike' ? 3.2 : 4.2 });
  }
  function placeTraps() {
    const n = MAZE.n, c = MAZE.cell, mid = Math.floor(n / 2), used = new Set([`${mid},${mid}`]);
    // Keep the first few cells inside each entrance free of traps
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (Math.abs(i - (n - 1)) + Math.abs(j - MAZE_GATES.east) <= 2 || Math.abs(i - MAZE_GATES.north) + Math.abs(j - (n - 1)) <= 2) used.add(`${i},${j}`);
    }
    ANCIENT_CELLS.forEach(([i, j]) => used.add(`${i},${j}`));
    traps.forEach(t => {
      let ci, cj, tries = 0;
      do { ci = Math.floor(Math.random() * n); cj = Math.floor(Math.random() * n); tries++; } while (used.has(`${ci},${cj}`) && tries < 60);
      used.add(`${ci},${cj}`);
      t.g.position.set(MAZE.x0 + (ci + 0.5) * c, 0, MAZE.z0 + (cj + 0.5) * c); t.g.visible = true;
      t.phase = Math.random() * t.period; t.spikes.position.y = -0.95;
    });
  }
  function updateTraps(dt) {
    const tt = uTime.value, tm = tierMult(worldTier());
    traps.forEach(t => {
      if (!t.g.visible) return;
      const ph = (tt + t.phase) % t.period, fireAt = t.period - 1.0, warnAt = fireAt - 0.7;
      const warn = ph >= warnAt && ph < fireAt, active = ph >= fireAt;
      t.plateMat.color.setHex(active ? 0xff3b1a : warn ? (Math.floor(tt * 12) % 2 ? 0xff7a2a : 0x5a2010) : 0x3a1a14);
      if (t.kind === 'spike') t.spikes.position.y = active ? Math.min(0, -0.95 + (ph - fireAt) * 12) : -0.95;
      else if (active && flatDist(t.g.position, player.position) < 45) {
        for (let k = 0; k < 3; k++) fwParticle(t.g.position.x + (Math.random() - 0.5) * 1.6, 0.2, t.g.position.z + (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 0.6, 5 + Math.random() * 4, (Math.random() - 0.5) * 0.6, fwColor.setHSL(0.04 + Math.random() * 0.06, 1, 0.55), 0.6, false);
      }
      if (!active) { t.hit = false; return; }
      if (!t.hit && Math.abs(player.position.x - t.g.position.x) < 1.4 && Math.abs(player.position.z - t.g.position.z) < 1.4 && player.position.y < 1.2) {
        t.hit = hitPlayer((t.kind === 'spike' ? 16 : 20) * tm, t.g.position, 6, false) || P.iframe > 0;
      }
    });
  }
