  // ---------- Veyra (alien world) ----------
  const veyra = makeWorld('veyra', {
    boss: V3(0, -14), objPts: [V3(-42, 18), V3(44, 8), V3(8, -50)],
    objCol: '#7affe0', objWord: 'Lumen Seed', mapBg: 'rgba(40,24,60,0.6)', mapSolid: 'rgba(170,130,255,0.75)',
    task: 'gather the glowing Lumen Seeds by walking over them',
    intro: 'A violet world of glowing groves under three moons. Its shard has rooted itself in the soil.',
    bossName: 'The Hive Matron', bossLine: 'The grove shudders. The Hive Matron wakes at its heart, coiled around the Bloom Shard.',
    paint: (g, w, h) => { g.fillStyle = '#1a1430'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = sr() < 0.5 ? 'rgba(60,200,180,.35)' : 'rgba(130,60,190,.45)'; g.fillRect(sr() * w, sr() * h, 2, 2); } }
  });
  {
    const W = veyra, grp = W.group;
    const spireM = [lam(0x7a4adf), lam(0x4a8adf)], tipM = bas(0xe0c8ff);
    for (let i = 0; i < 18; i++) {
      const s = W.spot(9, 9); if (!s) break;
      const [x, z] = s, h = 8 + sr() * 10, r = 1.2 + sr() * 0.6;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), spireM[i % 2]); m.position.set(x, h / 2, z); m.rotation.y = sr() * 6; grp.add(m);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.55, 4), spireM[(i + 1) % 2]); sh.position.set(x + r * 0.8, h * 0.27, z + 0.3); sh.rotation.z = -0.3; grp.add(sh);
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), tipM); tip.position.set(x, h + 0.6, z); grp.add(tip);
      W.circles.push([x, z, r + 0.5]);
    }
    const stemM = lam(0xcfc6e6), capM = [bas(0x3affd0), bas(0xff5ad0), bas(0x9a7aff)], dotM = bas(0xfff6ff);
    W.mush = [];
    for (let i = 0; i < 36; i++) {
      const s = W.spot(6, 5); if (!s) break;
      const [x, z] = s, h = 2.6 + sr() * 4, r = 1.4 + sr() * 1.6;
      const g = new THREE.Group(); g.position.set(x, 0, z); grp.add(g);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, h, 6), stemM); st.position.y = h / 2; g.add(st);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, TAU, 0, Math.PI / 2), capM[i % 3]); cap.position.y = h; cap.scale.y = 0.6; g.add(cap);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + sr(); sph(0.12, dotM, g, Math.cos(a) * r * 0.6, h + r * 0.45, Math.sin(a) * r * 0.6); }
      W.circles.push([x, z, 0.65]); W.mush.push({ cap, ph: sr() * 6 });
    }
    const rockM = lam(0x4a566a), glowM = bas(0x7affe0);
    W.rocks = [];
    for (let i = 0; i < 16; i++) {
      const x = -60 + sr() * 120, z = -60 + sr() * 120, r = 1 + sr() * 1.8, y = 7 + sr() * 9;
      const g = new THREE.Group(); g.position.set(x, y, z); grp.add(g);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r), rockM); m.scale.y = 0.6; g.add(m);
      const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, r * 1.6, 5), rockM); c.rotation.x = Math.PI; c.position.y = -r * 0.9; g.add(c);
      const gl = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), glowM); gl.position.y = -r * 1.8; g.add(gl);
      W.rocks.push({ g, y, ph: sr() * 6 });
    }
    // Two extra moons beside the shared one
    [[-70, 62, -150, 7, 0x7affe0], [64, 80, -120, 4, 0xff8ad8]].forEach(([x, y, z, r, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), bas(c, { fog: false })); m.position.set(x, y, z); grp.add(m); });
    const seedM = bas(0x9affe6), beamM = bas(0x9affe6, { transparent: true, opacity: 0.12, depthWrite: false }), padM = bas(0x3affd0, { transparent: true, opacity: 0.45, depthWrite: false });
    W.objPts.forEach(p => {
      const g = new THREE.Group(); g.position.copy(p); grp.add(g);
      const pad = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 28).rotateX(-Math.PI / 2), padM); pad.position.y = 0.03; g.add(pad);
      const seed = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), seedM); seed.position.y = 1.2; seed.scale.y = 1.5; g.add(seed);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 8, 1, true), beamM); beam.position.y = 13; g.add(beam);
      tag(seed, 1);
      W.objs.push({ p, g, seed, beam, pad });
    });
    W.objLook = (o, done) => { o.seed.visible = o.beam.visible = o.pad.visible = !done; };
    W.anim = (real, tt) => {
      W.rocks.forEach(r => { r.g.position.y = r.y + Math.sin(tt * 0.6 + r.ph) * 0.6; r.g.rotation.y += real * 0.1; });
      W.mush.forEach(m => { const s = 1 + 0.05 * Math.sin(tt * 1.8 + m.ph); m.cap.scale.set(s, 0.6 * s, s); });
      W.objs.forEach((o, i) => { o.seed.rotation.y += real * 1.5; o.seed.position.y = 1.2 + Math.sin(tt * 2 + i) * 0.15; });
    };
  }
