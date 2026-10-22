  // ---------- Ashfall (zombie world) ----------
  const ashW = makeWorld('ash', {
    boss: V3(26, -34), objPts: [V3(-44, -18), V3(42, 8), V3(-8, -50)],
    objCol: '#ffd08a', objWord: 'Survivor saved', mapBg: 'rgba(42,32,22,0.6)', mapSolid: 'rgba(150,120,90,0.8)',
    task: 'find the survivors and press E beside each one to lead them out',
    intro: 'A dead town under falling ash. The Ember Shard woke the dead, and a few of the living still hide here.',
    bossName: 'The Rot Sovereign', bossLine: 'The graves split open. The Rot Sovereign rises in the old churchyard, the Ember Shard burning in its chest.',
    paint: (g, w, h) => { g.fillStyle = '#231b14'; g.fillRect(0, 0, w, h); for (let i = 0; i < 800; i++) { g.fillStyle = sr() < 0.5 ? 'rgba(90,80,70,.4)' : 'rgba(10,8,6,.6)'; g.fillRect(sr() * w, sr() * h, 2, 2); } }
  });
  {
    const W = ashW, grp = W.group;
    const wallA = [lam(0x5a4a3a), lam(0x4a4034), lam(0x625040)], roofA = lam(0x2a2018), winM = bas(0x1a120c), litM = bas(0xb8642a);
    const roofGeo = new THREE.ConeGeometry(0.7071, 1, 4).rotateY(Math.PI / 4);
    for (let i = 0; i < 18; i++) {
      const s = W.spot(14, 13); if (!s) break;
      const [x, z] = s, w = 6 + sr() * 3, d = 5 + sr() * 3, h = 3.2 + sr() * 1.5;
      box(w, h, d, x, h / 2, z, wallA[i % 3], grp);
      if (sr() < 0.45) box(w * 0.4, 1.2, d, x - w * 0.3, h + 0.6, z, wallA[(i + 1) % 3], grp);
      else { const r = new THREE.Mesh(roofGeo, roofA); r.scale.set(w + 0.5, 2.4, d + 0.5); r.position.set(x, h + 1.2, z); r.rotation.z = sr() < 0.35 ? 0.22 : 0; grp.add(r); }
      [-1, 1].forEach(f => {
        box(1.1, 2, 0.08, x, 1, z + f * (d / 2 + 0.04), winM, grp);
        [-1, 1].forEach(sd => box(0.9, 0.9, 0.08, x + sd * w * 0.3, h * 0.58, z + f * (d / 2 + 0.04), sr() < 0.22 ? litM : winM, grp));
      });
      W.rects.push([x - w / 2 - 0.3, x + w / 2 + 0.3, z - d / 2 - 0.3, z + d / 2 + 0.3]);
    }
    const barkA = lam(0x3e362e);
    for (let i = 0; i < 30; i++) {
      const s = W.spot(6, 5); if (!s) break;
      const [x, z] = s, h = 4 + sr() * 3;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = sr() * 6; grp.add(g);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, h, 5), barkA); t.position.y = h / 2; g.add(t);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + sr(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.8 + sr(), 4), barkA); b.position.set(Math.cos(a) * 0.5, h * (0.55 + k * 0.12), Math.sin(a) * 0.5); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(b); }
      W.circles.push([x, z, 0.55]);
    }
    // The churchyard around the boss arena
    const graveM = lam(0x6a6a64), moundM = lam(0x1e1610);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU, r = 6 + (i % 3) * 1.4, x = W.boss.x + Math.cos(a) * r, z = W.boss.z + Math.sin(a) * r;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -a + (sr() - 0.5) * 0.3; grp.add(g);
      if (i % 4 === 0) { box(0.16, 1.3, 0.16, 0, 0.65, 0, graveM, g); box(0.7, 0.16, 0.16, 0, 0.95, 0, graveM, g); }
      else box(0.7, 0.9 + sr() * 0.4, 0.22, 0, 0.5, 0, graveM, g);
      box(0.8, 0.14, 1.5, 0, 0.07, 0.9, moundM, g);
      g.rotation.z = (sr() - 0.5) * 0.25;
    }
    const skinS = lam(0xd9b48f), coats = [lam(0x6a5a8a), lam(0x8a4a3a), lam(0x3a6a5a)], legM = lam(0x2a2420), lampS = bas(0xffd08a), crateM = lam(0x5a3e24);
    W.objPts.forEach((p, i) => {
      const camp = new THREE.Group(); camp.position.copy(p); grp.add(camp);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; const cr = box(0.8, 0.8, 0.8, Math.cos(a) * 1.9, 0.4, Math.sin(a) * 1.9, crateM, camp); cr.rotation.y = a; }
      const person = new THREE.Group(); person.rotation.y = Math.atan2(WORLD_SPAWN.x - p.x, WORLD_SPAWN.z - p.z); camp.add(person);
      [-0.11, 0.11].forEach(x => box(0.15, 0.8, 0.16, x, 0.4, 0, legM, person));
      box(0.48, 0.6, 0.28, 0, 1.1, 0, coats[i], person);
      sph(0.17, skinS, person, 0, 1.6, 0);
      const arm = new THREE.Group(); arm.position.set(0.3, 1.35, 0); person.add(arm); box(0.12, 0.6, 0.12, 0, 0.3, 0, coats[i], arm);
      sph(0.14, lampS, person, -0.36, 0.9, 0.12);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 8, 1, true), bas(0xffd08a, { transparent: true, opacity: 0.1, depthWrite: false })); beam.position.y = 13; camp.add(beam);
      tag(person, 1);
      W.objs.push({ p, g: camp, person, arm, beam });
    });
    W.objLook = (o, done) => { o.person.visible = o.beam.visible = !done; };
    W.anim = (real, tt) => { W.objs.forEach((o, i) => { o.arm.rotation.z = 2.5 + Math.sin(tt * 5 + i) * 0.45; }); };
  }
