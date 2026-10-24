  // ---------- Trees and rocks ----------
  const leaf = new THREE.MeshLambertMaterial({ color: 0x1d4a2a, flatShading: true });
  const bark = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
  const treeSpots = [];
  const trees = [];
  function makeTree(x, z) {
    const s = 0.85 + sr() * 0.6, g = new THREE.Group();
    const lm = leaf.clone(); lm.transparent = true;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 6), bark); trunk.position.y = 1; g.add(trunk);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.4 - i * 0.6, 2.6, 7), lm); c.position.y = 2.6 + i * 1.5; g.add(c); }
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = sr() * 6; scene.add(g);
    trees.push({ g, lm, x, z, fade: 1 });
    treeSpots.push([x, z]);
  }
  [[-20, 6], [-24, -3], [-18, -12], [22, 4], [25, -7], [19, -13], [-31, 13], [31, 15], [-13, 19], [14, 21], [-35, -15], [35, -17], [-27, 24], [27, 27], [-9, 30], [9, 33]].forEach(([x, z]) => makeTree(x, z));
  // The wider world: a scattered forest beyond the old meadow
  for (let tries = 0, made = 0; made < 46 && tries < 900; tries++) {
    const x = -76 + sr() * 152, z = -76 + sr() * 146;
    if (Math.abs(x) < 40 && z > -20 && z < 36) continue;
    if (inMaze(x, z) || inKeep(x, z)) continue;
    if (Math.abs(x) < 24 && z < -15 && z > -42) continue;
    if (treeSpots.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 7)) continue;
    makeTree(x, z); made++;
  }
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6b7072, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + sr() * 0.4;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + sr() * 0.7), rockMat);
    r.position.set(LAKE.x + Math.cos(a) * (LAKE.r + 0.3), 0.15, LAKE.z + Math.sin(a) * (LAKE.r + 0.3));
    r.rotation.set(sr() * 3, sr() * 3, 0); scene.add(r);
  }
