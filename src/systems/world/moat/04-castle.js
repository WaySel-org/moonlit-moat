  // ---------- Castle ----------
  const brickTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#24272a'; g.fillRect(0, 0, w, h);
    const bh = 256 / 12, bw = 256 / 6;
    for (let r = 0; r < 12; r++) { const off = (r % 2) * bw / 2; for (let c = -1; c < 7; c++) { const v = 92 + Math.floor(sr() * 54); g.fillStyle = `rgb(${v},${v + 3},${v + 7})`; g.fillRect(c * bw + off + 1.5, r * bh + 1.5, bw - 3, bh - 3); } }
  }, [3, 1.5]);
  const stone = new THREE.MeshLambertMaterial({ map: brickTex, color: 0xb8bec4 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x050607 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffae5a });
  function box(w, h, d, x, y, z, mat, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || stone); m.position.set(x, y, z); (parent || scene).add(m); return m; }

  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3046, flatShading: true });
  const ROOF = { y: 8, x0: -13.6, x1: 13.6, z0: -29.3, z1: -20.6 };

  // Front wall with the gate
  box(12.5, 8, 2, -8.75, 4, -21); box(12.5, 8, 2, 8.75, 4, -21); box(5, 3, 2, 0, 6.5, -21);
  box(5, 5, 0.6, 0, 2.5, -21.7, dark);
  for (let x = -14; x <= 14; x += 2) if (Math.abs(x) > 1 && Math.abs(x) < 11) box(1, 1.1, 2, x, 8.55, -21);

  // Gatehouse: two pillars and a pitched roof over the entrance
  [-2.9, 2.9].forEach(x => box(0.45, 5.4, 0.45, x, 2.7, -18.4));
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 7, 3), roofMat);
  canopy.rotation.set(-Math.PI / 2, 0, Math.PI / 2); canopy.position.set(0, 6.0, -19.2); scene.add(canopy);

  // Great hall behind the wall. Its flat roof is the rooftop arena.
  box(29, 8, 8, 0, 4, -26);
  const slateTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1e2124'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const v = 62 + Math.floor(sr() * 40); g.fillStyle = `rgb(${v},${v - 4},${v + 2})`; g.fillRect(c * 16 + 1, r * 16 + 1, 14, 14); }
  }, [7, 2.5]);
  const roofFloor = new THREE.Mesh(new THREE.PlaneGeometry(29, 10).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: slateTex }));
  roofFloor.position.set(0, 8.02, -25); scene.add(roofFloor);
  [-14.75, 14.75].forEach(x => box(0.5, 0.9, 10, x, 8.45, -25));

  // Corner towers with pointed roofs
  [-17, 17].forEach(x => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 12, 16), stone); t.position.set(x, 6, -21); scene.add(t);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; box(0.9, 1.1, 0.9, x + Math.cos(a) * 2.3, 12.55, -21 + Math.sin(a) * 2.3); }
    box(0.4, 1.2, 0.2, x, 8, -18.2, glow);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5, 16), roofMat); cone.position.set(x, 15.4, -21); scene.add(cone);
  });

  // Keep at the back of the roof, with a pyramid roof, a door and two thrones
  box(12, 15, 6, 0, 7.5, -33);
  const keepRoof = new THREE.Group(); keepRoof.scale.set(1, 1, 0.62); keepRoof.position.set(0, 18, -33); scene.add(keepRoof);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(8.8, 6, 4), roofMat); kr.rotation.y = Math.PI / 4; keepRoof.add(kr);
  box(0.6, 1.4, 0.2, -2.6, 11, -29.95, glow); box(0.6, 1.4, 0.2, 2.6, 11, -29.95, glow); box(0.6, 1.4, 0.2, 0, 13.3, -29.95, glow);
  box(2.2, 3, 0.2, 0, 9.5, -29.95, dark);
  const throneMat = new THREE.MeshLambertMaterial({ color: 0x3a2050, flatShading: true });
  [-2.4, 2.4].forEach(x => { box(1.2, 0.5, 1.0, x, 8.25, -29, throneMat); box(1.2, 2.2, 0.25, x, 9.1, -29.45, throneMat); });

  // Stairs up the front wall on both sides of the gate, sealed by a ward until the Warden falls
  const STAIRS = [{ x0: 3.6, x1: 13 }, { x0: -3.6, x1: -13 }];
  const STAIR_Z0 = -19.95, STAIR_Z1 = -18.1, STEPS = 16;
  const wards = [];
  STAIRS.forEach(s => {
    const dir = Math.sign(s.x1 - s.x0), w = Math.abs(s.x1 - s.x0) / STEPS;
    for (let i = 0; i < STEPS; i++) { const h = (i + 1) * ROOF.y / STEPS; box(w + 0.02, h, STAIR_Z1 - STAIR_Z0, s.x0 + dir * (i + 0.5) * w, h / 2, (STAIR_Z0 + STAIR_Z1) / 2); }
    const ward = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, STAIR_Z1 - STAIR_Z0), new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0.7, depthWrite: false }));
    ward.position.set(s.x0 + dir * 0.15, 1.3, (STAIR_Z0 + STAIR_Z1) / 2); scene.add(ward); wards.push(ward);
  });

  // Walkable height at any point. 99 means solid.
  function groundAt(x, z) {
    if (G.world !== 'moat') return WORLDS[G.world].ground(x, z);
    const LIM = G.realm === 'spirit' ? Math.max(116, G.edge + 20) : G.edge;
    if (Math.abs(x) > LIM || z > LIM - 8 || z < -LIM) return 99;
    // In the spirit realm the hero (and every spirit) drifts through the hedge maze; castles, keeps and the edge still hold
    if (G.realm !== 'spirit' && mazeSolid(x, z)) return 99;
    const kh = keepHeight(x, z); if (kh !== null) return kh;
    for (const tx of [-17, 17]) if (Math.hypot(x - tx, z + 21) < 3.2) return 99;
    for (const px of [-2.9, 2.9]) if (Math.abs(x - px) < 0.45 && Math.abs(z + 18.4) < 0.45) return 99;
    if (z >= -20 && z <= STAIR_Z1) {
      for (const s of STAIRS) {
        const t = (x - s.x0) / (s.x1 - s.x0);
        if (t >= 0 && t <= 1) return G.wardenDown ? Math.min(ROOF.y, t * ROOF.y + 0.25) : (t < 0.04 ? 0 : 99);
      }
    }
    if (z < -20 && z > -36 && Math.abs(x) <= 15.5) return (Math.abs(x) <= 14.5 && z >= -30) ? ROOF.y : 99;
    const d = Math.hypot(x - LAKE.x, z - LAKE.z);
    if (d < LAKE.r) return G.realm === 'spirit' ? 0 : -0.45 * Math.min(1, (LAKE.r - d) / 2);
    return 0;
  }

  const torches = [];
  [-3.4, 3.4].forEach(x => {
    box(0.3, 0.5, 0.6, x, 3.9, -19.8, dark);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    flame.position.set(x, 4.45, -19.65); scene.add(flame);
    const light = new THREE.PointLight(0xff8a3a, 2.2, 18, 2); light.position.set(x, 4.6, -19.2); scene.add(light);
    torches.push({ flame, light, phase: sr() * 10 });
  });

  // Braziers lighting the roof
  [-11.5, 11.5].forEach(x => {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.5, 8), dark); bowl.position.set(x, 9.0, -28.5); scene.add(bowl);
    box(0.2, 0.8, 0.2, x, 8.4, -28.5, dark);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    flame.position.set(x, 9.65, -28.5); scene.add(flame);
    const light = new THREE.PointLight(0xff7a3a, 2.2, 16, 2); light.position.set(x, 10, -28.2); scene.add(light);
    torches.push({ flame, light, phase: sr() * 10 });
  });
