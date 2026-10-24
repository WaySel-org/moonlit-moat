  // ---------- Neon Verge (cyberpunk world) ----------
  const neon = makeWorld('neon', {
    boss: V3(0, 0), objPts: [V3(-40, -20), V3(40, 20), V3(0, -40)],
    objCol: '#ff5ad8', objWord: 'Relay hacked', mapBg: 'rgba(42,20,32,0.6)', mapSolid: 'rgba(120,110,150,0.85)',
    task: 'hack the relay terminals by standing beside each one for 3 seconds',
    intro: 'A city that never powered down. The Signal Shard is locked behind its relay grid.',
    bossName: 'Director Halvane', bossLine: 'The grid is open. Director Halvane steps into the plaza in a powered suit to take the Signal Shard back.',
    paint: (g, w, h) => { g.fillStyle = '#15161c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = sr() < 0.5 ? 'rgba(70,70,90,.5)' : 'rgba(8,8,12,.6)'; g.fillRect(sr() * w, sr() * h, 2, 2); } g.fillStyle = 'rgba(90,60,110,.5)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }
  });
  {
    const W = neon, grp = W.group;
    const wallM = [lam(0x22263a), lam(0x2a2236), lam(0x1e2a34)], stripM = [bas(0x3af0ff), bas(0xff3ad8), bas(0xffb03a), bas(0x7a8aff)], roofM = lam(0x14161e);
    const C = [-50, -30, -10, 10, 30, 50];
    C.forEach(cx => C.forEach(cz => {
      if (Math.abs(cx) <= 10 && Math.abs(cz) <= 10) return; // the open central plaza
      const h = 12 + sr() * (Math.abs(cx) + Math.abs(cz) > 60 ? 34 : 22), wm = wallM[Math.floor(sr() * 3)], sm = stripM[Math.floor(sr() * 4)];
      box(12, h, 12, cx, h / 2, cz, wm, grp);
      for (let y = 3; y < h - 1.5; y += 3.2 + sr() * 1.6) box(12.15, 0.3, 12.15, cx, y, cz, sm, grp);
      box(4 + sr() * 3, 1.6, 3 + sr() * 3, cx + (sr() - 0.5) * 4, h + 0.8, cz + (sr() - 0.5) * 4, roofM, grp);
      if (sr() < 0.5) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 4), roofM); a.position.set(cx + 3, h + 2.5, cz - 3); grp.add(a); sph(0.25, stripM[1], grp, cx + 3, h + 5.1, cz - 3); }
      if (sr() < 0.55) {
        const side = sr() < 0.5 ? -1 : 1, onX = sr() < 0.5, along = (sr() - 0.5) * 7, y = 5 + sr() * 7, col = stripM[Math.floor(sr() * 4)];
        if (onX) box(0.4, 5, 2.2, cx + side * 6.4, y, cz + along, col, grp); else box(2.2, 5, 0.4, cx + along, y, cz + side * 6.4, col, grp);
      }
      W.rects.push([cx - 6.3, cx + 6.3, cz - 6.3, cz + 6.3]);
    }));
    // A skyline beyond the walkable streets
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + sr() * 0.2, r = 92 + sr() * 50, h = 30 + sr() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r;
      box(10 + sr() * 8, h, 10 + sr() * 8, x, h / 2, z, wallM[i % 3], grp);
      for (let k = 0; k < 3; k++) box(0.4, h * 0.6, 0.4, x + (k - 1) * 3, h * 0.45, z, stripM[(i + k) % 4], grp);
    }
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(44, 44).rotateX(-Math.PI / 2), lam(0x2a2a34)); tile.position.y = 0.01; grp.add(tile);
    const emblem = new THREE.Mesh(new THREE.RingGeometry(5, 5.4, 6).rotateX(-Math.PI / 2), bas(0xff3ad8, { transparent: true, opacity: 0.6, depthWrite: false })); emblem.position.y = 0.03; grp.add(emblem);
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([x, z]) => { box(0.2, 5, 0.2, x, 2.5, z, roofM, grp); sph(0.35, stripM[0], grp, x, 5.2, z); });
    const relayM = lam(0x30343e), padM = bas(0xff5ad8, { transparent: true, opacity: 0.45, depthWrite: false }), fillM = bas(0x3af0ff, { transparent: true, opacity: 0.35, depthWrite: false });
    W.objPts.forEach(p => {
      const g = new THREE.Group(); g.position.copy(p); g.rotation.y = Math.atan2(-p.x, -p.z); grp.add(g);
      box(1.2, 1.8, 0.7, 0, 0.9, 0, relayM, g);
      const scr = bas(0xff3a3a); box(0.9, 0.6, 0.06, 0, 1.35, 0.37, scr, g);
      box(0.08, 1.6, 0.08, 0.4, 2.6, 0, relayM, g); sph(0.14, stripM[1], g, 0.4, 3.45, 0);
      const pad = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.5, 32).rotateX(-Math.PI / 2), padM); pad.position.y = 0.03; g.add(pad);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32).rotateX(-Math.PI / 2), fillM); fill.position.y = 0.035; fill.scale.setScalar(0.01); g.add(fill);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 8, 1, true), bas(0xff5ad8, { transparent: true, opacity: 0.1, depthWrite: false })); beam.position.y = 13; g.add(beam);
      tag(g, 1);
      W.objs.push({ p, g, scr, pad, fill, beam });
    });
    W.objLook = (o, done) => { o.scr.color.setHex(done ? 0x4dff6a : 0xff3a3a); o.beam.visible = o.pad.visible = !done; o.fill.scale.setScalar(0.01); };
    W.anim = (real, tt) => {
      const pr = G.story.prog.neon;
      W.objs.forEach((o, i) => { if (pr[i] < 1) { o.fill.scale.setScalar(Math.max(0.01, pr[i])); o.scr.color.setHex(pr[i] > 0 ? (Math.floor(tt * 8) % 2 ? 0xffd36a : 0xff3a3a) : 0xff3a3a); } });
      emblem.rotation.y += real * 0.3;
    };
  }
