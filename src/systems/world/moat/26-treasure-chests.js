  // ---------- Treasure chests: they upgrade the longer you leave them ----------
  const CHEST_TIERS = [null,
    { name: 'Wooden', color: 0x6a4524, trim: 0x2a1a0c, gleam: 0xffd36a },
    { name: 'Iron', color: 0x6c7378, trim: 0x2d3236, gleam: 0xdfe8ef },
    { name: 'Gilded', color: 0xc9a042, trim: 0x6a4c12, gleam: 0xfff0a0 },
    { name: 'Crystal', color: 0x5fe0ff, trim: 0x2a6a8a, gleam: 0xbff6ff }];
  const chests = [];
  function makeChest(x, z, y = 0) {
    const g = new THREE.Group();
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x6a4524, flatShading: true }), trimMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0c });
    box(1.2, 0.6, 0.8, 0, 0.3, 0, baseMat, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); g.add(lid);
    box(1.2, 0.3, 0.8, 0, 0.15, 0.4, baseMat, lid);
    box(1.24, 0.08, 0.84, 0, 0.58, 0, trimMat, g); box(0.18, 0.22, 0.06, 0, 0.5, 0.42, trimMat, g);
    const glowM = new THREE.MeshBasicMaterial({ color: 0xffd36a });
    const gleam = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glowM); gleam.position.y = 1.4; g.add(gleam);
    g.position.set(x, y, z); g.rotation.y = Math.atan2(-x, -z); scene.add(g);
    const c = { g, lid, baseMat, trimMat, gleam, glowM, x, z, y, tier: 1, open: false, refill: 0, tierT: 0 };
    c.maze = inMaze(x, z) || y > 0; if (c.maze) c.tier = 3;
    chestLook(c); chests.push(c);
    return c;
  }
  [[-30, 20], [34, 26], [-50.5, -30.5], [60, -30], [-46, 52], [48, 58], [0, 62], [-66, 40], [70, 12], [-18, -58], [28, -60], [0, -70], [-70, -62], [66, -66], [57, -52, 10], [47, 38, 10]].forEach(([x, z, y]) => makeChest(x, z, y));
  // One iron chest in each wildland region (09), to make the walk out there worth it
  WILD_CHESTS.forEach(([x, z]) => { const c = makeChest(x, z); c.tier = 2; chestLook(c); });
  function chestLook(c) {
    const T = CHEST_TIERS[c.tier];
    c.baseMat.color.setHex(T.color); c.trimMat.color.setHex(T.trim); c.glowM.color.setHex(T.gleam);
    c.gleam.visible = !c.open; c.gleam.scale.setScalar(1 + (c.tier - 1) * 0.35);
  }
  function updateChests(dt) {
    const tt = uTime.value;
    chests.forEach((c, i) => {
      c.lid.rotation.x += ((c.open ? -1.9 : 0) - c.lid.rotation.x) * Math.min(1, dt * 6);
      c.gleam.rotation.y += dt * 2; c.gleam.position.y = 1.4 + Math.sin(tt * 2 + i) * 0.12;
      if (c.open) {
        c.refill -= dt;
        if (c.refill <= 0) { c.open = false; c.tier = Math.min(4, Math.max(c.maze ? 3 : 1, worldTier())); c.tierT = 0; chestLook(c); }
      } else if (c.tier < 4) {
        c.tierT += dt;
        if (c.tierT >= 75) {
          c.tier++; c.tierT = 0; chestLook(c);
          if (flatDist(player.position, c) < 25) floatText(`${CHEST_TIERS[c.tier].name} chest`, c.g.position.clone().add(new THREE.Vector3(0, 2, 0)), 'word', '#ffd36a');
        }
      }
    });
  }
  function openChest(c) {
    const tier = c.tier, wt = 1 + 0.2 * (worldTier() - 1);
    c.open = true; c.refill = 90; chestLook(c); sfx('pickup');
    burst(c.x, 1, c.z, 30 + tier * 10, 5);
    reward(30 * Math.pow(tier, 1.5) * wt, 20 * Math.pow(tier, 1.7) * wt * (0.8 + Math.random() * 0.4), c.g.position.clone().add(new THREE.Vector3(0, 2.2, 0)));
    const at = c.g.position.clone().add(new THREE.Vector3(0, 2.8, 0));
    if (tier >= 2) applyBoost(BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    if (tier >= 3) {
      if (PR.flaskMax < 6 && Math.random() < 0.35) { PR.flaskMax++; P.flasks++; floatText('+1 flask slot', at, 'word', '#ff9a4a'); recalc(); }
      else { P.flasks = PR.flaskMax; floatText('flasks refilled', at, 'word', '#ff9a4a'); }
    }
    if (tier >= 3 && Math.random() < (tier >= 4 ? 0.6 : 0.35)) dropRelic(c.x + 1.4, c.z + 0.6);
    if (tier >= 4) { PR.points++; renderHero(); floatText('+1 attribute point', at.clone().add(new THREE.Vector3(0, 0.6, 0)), 'word', '#bff6ff'); }
  }
