  // ---------- Puzzles at the wildland sites (owned by the puzzle agent) ----------
  // One environmental puzzle per PUZZLE_SITES circle, built only from the hero's own verbs: walk, jump, roll,
  // strike (J/K), the spirit realm (Q). Every puzzle lives in a local frame whose +z faces the moat's centre.
  //  0 runes   - The Singing Stones: watch five runes light in order, then strike them in that order.
  //  1 mirrors - Moon Mirrors: strike mirror pillars to turn them 45 degrees until the moonbeam reaches the crystal.
  //  2 plates  - Weighing Stones: push two stone blocks onto plates and stand on the third yourself.
  //  3 veil    - Veiled Braziers: only the spirit realm shows which braziers to light, and in what order.
  //  4 embers  - Ember Run: ring the bell, then light six braziers before the time runs out, jumping the low walls.
  // Solving gives XP and gold, and raises a Crystal chest. State is kept in the save as G.story.prog.puzzles
  // (0 unsolved, 1 solved with the chest waiting, 2 chest claimed), so it persists and a new game clears it.
  const pzTip = (t, l, s) => typeof showTip === 'function' ? showTip(t, l, s) : floatText(t + ': ' + [].concat(l)[0], player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#bff6ff');
  const pzKey = c => typeof keyLabel === 'function' ? keyLabel(c) : c.replace(/^Key|^Digit/, '');
  const pzSaved = () => { const p = G.story.prog; if (!Array.isArray(p.puzzles)) p.puzzles = PUZZLE_SITES.map(() => 0); return p.puzzles; };
  const pzSeen = () => { const p = G.story.prog; if (!Array.isArray(p.puzzleSeen)) p.puzzleSeen = PUZZLE_SITES.map(() => 0); return p.puzzleSeen; };
  const pzNote = (f, dur) => { const a = audio(); if (a) tone(a, dur || 0.5, f, f * 0.995, 0.1, 'triangle'); };
  const pzStoneM = new THREE.MeshLambertMaterial({ color: 0x7c828a, flatShading: true });
  const pzDarkM = new THREE.MeshLambertMaterial({ color: 0x34373c, flatShading: true });
  const pzBronzeM = new THREE.MeshLambertMaterial({ color: 0x9a7438, flatShading: true });
  const pzMirrorM = new THREE.MeshLambertMaterial({ color: 0xe6eef6, emissive: 0x2a3440, flatShading: true });
  const PZ_DIM = new THREE.Color(0x283038), PZ_RED = new THREE.Color(0xff3b3b), pzCol = new THREE.Color();
  const PZ = [];

  // Local frame helpers
  function pzLocal(Z, w) { const dx = w.x - Z.site.x, dz = w.z - Z.site.z; return { x: dx * Z.c - dz * Z.s, z: dx * Z.s + dz * Z.c }; }
  function pzWorld(Z, lx, lz) { return new THREE.Vector3(Z.site.x + lx * Z.c + lz * Z.s, 0, Z.site.z - lx * Z.s + lz * Z.c); }
  function pzSetPlayer(Z, l) { const w = pzWorld(Z, l.x, l.z); player.position.x = w.x; player.position.z = w.z; }
  function pzHere() { return PZ.find(Z => Math.hypot(player.position.x - Z.site.x, player.position.z - Z.site.z) < Z.site.r + 3) || null; }

  // Keep the hero out of solid puzzle pieces: circles {x,z,r}, boxes {x,z,hx,hz}, segments {ax,az,bx,bz,r}.
  // low: jumpable (ignored while the hero is in the air); ghost: the hero drifts through it in the spirit realm.
  function pzCollide(Z) {
    const L = pzLocal(Z, player.position); let moved = false; const R = 0.45;
    Z.solids.forEach(o => {
      if (o.off || (o.low && P.jh > 0.6) || (o.ghost && G.realm === 'spirit')) return;
      if (o.hx) {
        const dx = L.x - o.x, dz = L.z - o.z, ox = o.hx + R - Math.abs(dx), oz = o.hz + R - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) L.x += Math.sign(dx || 1) * ox; else L.z += Math.sign(dz || 1) * oz; moved = true; }
        return;
      }
      let cx = o.x, cz = o.z;
      if (o.bx !== undefined) {
        const vx = o.bx - o.ax, vz = o.bz - o.az, t = Math.max(0, Math.min(1, ((L.x - o.ax) * vx + (L.z - o.az) * vz) / (vx * vx + vz * vz)));
        cx = o.ax + vx * t; cz = o.az + vz * t;
      }
      const dx = L.x - cx, dz = L.z - cz, d = Math.hypot(dx, dz), m = o.r + R;
      if (d < m) { const k = d > 1e-4 ? m / d : 0; L.x = d > 1e-4 ? cx + dx * k : cx + m; L.z = d > 1e-4 ? cz + dz * k : cz; moved = true; }
    });
    if (moved) pzSetPlayer(Z, L);
  }

  // Strikes: every melee swing of the hero passes through here (see the playerStrike wrap below)
  function pzSwing(range, arc) {
    if (G.world !== 'moat' || G.state === 'dead') return;
    const Z = pzHere(); if (!Z || Z.site.solved || player.position.y > 2.5) return;
    const L = pzLocal(Z, player.position), f = fwdOf(P.facing), fx = f.x * Z.c - f.z * Z.s, fz = f.x * Z.s + f.z * Z.c;
    const cosArc = Math.cos(Math.min(Math.PI, Math.max(arc / 2, 1.0)));
    let best = null, bd = Infinity;
    Z.hits.forEach(h => {
      if (h.off) return;
      const dx = h.x - L.x, dz = h.z - L.z, d = Math.hypot(dx, dz);
      if (d > range + h.r) return;
      if (d > h.r + 0.4 && (dx * fx + dz * fz) / d < cosArc) return;
      if (d < bd) { bd = d; best = h; }
    });
    if (best) best.hit();
  }
  const pzStrikeBase = playerStrike;
  playerStrike = function (dmg, poise, range, arc, heavy) { pzStrikeBase(dmg, poise, range, arc, heavy); pzSwing(range, arc); };

  // Shared props
  function pzBrazier(root, x, z, scale) {
    const k = scale || 1, g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * k, 0.32 * k, 1.0 * k, 6), pzDarkM); leg.position.y = 0.5 * k; g.add(leg);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * k, 0.32 * k, 0.45 * k, 8), pzBronzeM); bowl.position.y = 1.15 * k; g.add(bowl);
    const coalM = new THREE.MeshBasicMaterial({ color: 0x3a2014 });
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * k, 0.5 * k, 0.06, 8), coalM); coal.position.y = 1.38 * k; g.add(coal);
    const flame = new THREE.Group(); flame.position.y = 1.4 * k; flame.visible = false; g.add(flame);
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.42 * k, 1.2 * k, 6), new THREE.MeshBasicMaterial({ color: 0xff8a2a })); f1.position.y = 0.6 * k; flame.add(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.22 * k, 0.8 * k, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a })); f2.position.y = 0.45 * k; flame.add(f2);
    tag(g, 1);
    const b = { g, x, z, lit: false, flame, coalM, phase: Math.random() * 9 };
    b.set = on => { b.lit = on; flame.visible = on; coalM.color.setHex(on ? 0xff6a2a : 0x3a2014); };
    return b;
  }
  function pzPuff(Z, x, z, col) {
    const w = pzWorld(Z, x, z);
    for (let i = 0; i < 18; i++) { fwColor.setHex(col || 0x8a8a8a); const a = Math.random() * TAU, sp = 0.6 + Math.random() * 1.6; fwParticle(w.x, 1.6, w.z, Math.cos(a) * sp, 1 + Math.random() * 2, Math.sin(a) * sp, fwColor, 0.9, false); }
  }
  function pzFlicker(list, t) { list.forEach(b => { if (b.lit) { const s = 0.85 + 0.15 * Math.sin(t * 13 + b.phase) * Math.sin(t * 7.1 + b.phase * 2); b.flame.scale.set(1, s, 1); } }); }

  // Rewards
  function pzChest(Z) {
    if (Z.chest) return;
    const w = pzWorld(Z, Z.chestAt[0], Z.chestAt[1]);
    const c = makeChest(w.x, w.z); c.tier = 4; c.puzzle = Z.site.id; chestLook(c); moatGroup.attach(c.g);
    Z.chest = c; Z.chestT = 0;
  }
  function pzDropChest(Z) {
    const c = Z.chest; if (!c) return;
    const i = chests.indexOf(c); if (i >= 0) chests.splice(i, 1);
    if (c.g.parent) c.g.parent.remove(c.g);
    Z.chest = null;
  }
  function pzSolve(Z) {
    if (Z.site.solved) return;
    const s = Z.site, at = new THREE.Vector3(s.x, 2.6, s.z);
    s.solved = true; pzSaved()[s.id] = 1; Z.solvedLook();
    sfx('parry'); pzNote(523, 0.9); pzNote(784, 1.2); G.shake = Math.max(G.shake, 0.35);
    burst(s.x, 1.5, s.z, 70, 8); kitRingFx(s.x, 0, s.z, 0xbff6ff, 1);
    for (let i = 0; i < 120; i++) { fwColor.setHSL(0.5 + Math.random() * 0.25, 0.8, 0.75); const a = Math.random() * TAU, sp = Math.random() * 3; fwParticle(s.x + Math.cos(a) * 1.5, 0.5, s.z + Math.sin(a) * 1.5, Math.cos(a) * sp, 6 + Math.random() * 6, Math.sin(a) * sp, fwColor, 1.6, true); }
    reward(Math.round(xpNext() * 0.45 + 40), Math.round(60 * worldTier()), at);
    floatText('PUZZLE SOLVED', at.clone().add(new THREE.Vector3(0, 1.2, 0)), 'word', '#bff6ff');
    pzChest(Z);
    pzTip(`${Z.title} solved`, [`A Crystal chest rises. Open it with ${pzKey('KeyE')}.`], 5);
    saveGame();
  }

  // Each site: a ring of marker stones, then its puzzle
  function pzSite(site, kind, title, hint, chestAt) {
    const a = Math.atan2(-site.x, -site.z), root = new THREE.Group();
    root.position.set(site.x, 0, site.z); root.rotation.y = a; moatGroup.add(root);
    for (let i = 0; i < 16; i++) { const th = i / 16 * TAU; if (Math.abs(angDiff(th, 0)) < 0.3) continue; box(0.5, 0.35, 0.5, Math.sin(th) * (site.r - 0.4), 0.17, Math.cos(th) * (site.r - 0.4), pzStoneM, root); }
    site.kind = kind;
    const Z = { site, kind, title, hint, root, c: Math.cos(a), s: Math.sin(a), solids: [], hits: [], chestAt, chest: null, chestT: 0, inside: false };
    PZ.push(Z); return Z;
  }

  // ---- 0. The Singing Stones (rune sequence) ----
  (function () {
    const Z = pzSite(PUZZLE_SITES[0], 'runes', 'The Singing Stones',
      () => [`Strike the seer crystal (${pzKey('KeyJ')}) to see five runes sing in turn, then strike the stones in that order.`, 'A wrong stone silences them all.'], [0, 10.5]);
    const HUE = [0x5fe0ff, 0xffd36a, 0xc8a0ff, 0x7dff9a, 0xff8a5a], NOTE = [392, 440, 523, 587, 659];
    const GLYPH = [[[0, 0, 0.12, 0.9, 0], [0, 0.2, 0.55, 0.12, 0]], [[0, 0, 0.12, 0.9, 0.5], [0, 0, 0.12, 0.9, -0.5]], [[0, 0.3, 0.6, 0.12, 0], [0, -0.3, 0.6, 0.12, 0], [0, 0, 0.12, 0.7, 0]],
      [[-0.18, 0, 0.12, 0.9, 0], [0.18, 0, 0.12, 0.9, 0], [0, 0.35, 0.5, 0.12, 0]], [[0, 0, 0.5, 0.5, 0.785], [0, 0, 0.12, 0.95, 0]]];
    Z.stones = [];
    for (let i = 0; i < 5; i++) {
      const th = (36 + 72 * i) * Math.PI / 180, x = 7 * Math.sin(th), z = 7 * Math.cos(th);
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); Z.root.add(g);
      box(1.3, 2.5, 0.75, 0, 1.25, 0, pzStoneM, g); box(1.5, 0.25, 0.95, 0, 2.6, 0, pzDarkM, g);
      const m = new THREE.MeshBasicMaterial({ color: PZ_DIM.getHex() });
      GLYPH[i].forEach(([gx, gy, w, h, r]) => { const p = box(w, h, 0.06, gx, 1.55 + gy, 0.39, m, g); p.rotation.z = r; });
      tag(g, 1);
      Z.stones.push({ m, lvl: 0, hue: new THREE.Color(HUE[i]) });
      Z.solids.push({ x, z, r: 0.85 });
      Z.hits.push({ x, z, r: 0.8, hit: () => runeHit(i) });
    }
    box(1.1, 1.0, 1.1, 0, 0.5, 0, pzStoneM, Z.root);
    const seerM = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
    const seer = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), seerM); seer.position.y = 1.75; Z.root.add(seer); tag(seer, 1);
    Z.solids.push({ x: 0, z: 0, r: 0.8 });
    Z.hits.push({ x: 0, z: 0, r: 0.8, hit: () => { if (Z.mode !== 'show') show(0.2); } });
    const STEP = 0.85;
    function show(delay) { Z.mode = 'show'; Z.t = -(delay || 0); Z.k = 0; Z.lastStep = -1; }
    Z.reset = () => { const s = [0, 1, 2, 3, 4]; for (let i = 4; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } Z.seq = s; Z.mode = 'idle'; Z.k = 0; Z.t = 0; };
    Z.reset();
    function runeHit(i) {
      const st = Z.stones[i], w = pzWorld(Z, Z.hits[i].x, Z.hits[i].z);
      if (Z.mode === 'idle') { show(0.3); return; }
      if (Z.mode !== 'input') return;
      if (Z.seq[Z.k] === i) {
        Z.k++; st.lvl = 1.6; pzNote(NOTE[i]); burst(w.x, 1.6, w.z, 12, 4);
        if (Z.k >= 5) pzSolve(Z);
      } else {
        Z.mode = 'fail'; Z.t = 0; Z.k = 0; sfx('clang'); G.shake = Math.max(G.shake, 0.2);
        floatText('The stones fall silent', w.clone().setY(3.2), 'word', '#ff8a8a');
      }
    }
    Z.onEnter = () => { if (Z.mode === 'idle') show(0.8); };
    Z.update = (dt, t) => {
      if (Z.mode === 'show') {
        Z.t += dt; const step = Math.floor(Z.t / STEP);
        if (Z.t >= 0 && step !== Z.lastStep && step < 5) { Z.lastStep = step; Z.stones[Z.seq[step]].lvl = 1.5; pzNote(NOTE[Z.seq[step]]); }
        if (step >= 5) { Z.mode = 'input'; Z.k = 0; }
      } else if (Z.mode === 'fail') { Z.t += dt; if (Z.t > 1.2) show(0.3); }
      Z.stones.forEach((st, i) => {
        const held = Z.mode === 'input' && Z.seq.indexOf(i) < Z.k;
        st.lvl = Math.max(held ? 0.9 : 0, st.lvl - dt * 1.6);
        if (Z.mode === 'fail') st.m.color.copy(Math.floor(Z.t * 8) % 2 ? PZ_RED : PZ_DIM);
        else st.m.color.copy(PZ_DIM).lerp(st.hue, Math.min(1, st.lvl));
      });
      seer.rotation.y += dt * (Z.mode === 'show' ? 4 : 1); seer.position.y = 1.75 + Math.sin(t * 2) * 0.1;
    };
    Z.solvedLook = () => { Z.mode = 'done'; Z.stones.forEach(st => { st.lvl = 1; st.m.color.copy(st.hue); }); seerM.color.setHex(0xffffff); };
    Z.solvedUpdate = (dt, t) => { seer.rotation.y += dt * 0.6; Z.stones.forEach((st, i) => st.m.color.copy(st.hue).multiplyScalar(0.75 + 0.25 * Math.sin(t * 2 + i))); };
    Z.unsolvedLook = () => { seerM.color.setHex(0x9fe8ff); };
  })();

  // ---- 1. Moon Mirrors (bounce the moonbeam) ----
  (function () {
    const Z = pzSite(PUZZLE_SITES[1], 'mirrors', 'Moon Mirrors',
      () => [`Strike a mirror (${pzKey('KeyJ')}) to turn it 45 degrees. Guide the moonbeam into the crystal.`, 'A mirror seen edge-on lets the beam slip past.'], [3, 10.5]);
    const SRC = { x: -9, z: -6, dx: 1, dz: 0 }, RCV = { x: -6, z: 9 };
    // [x, z, start orientation]; orientation o turns the mirror to o * 45 degrees. One solution: 0 3 1 0 1, F free.
    const MIR = [[-3, -6, 2], [3, -6, 1], [3, 3, 2], [-3, 3, 1], [-6, 3, 2], [9, -6, 1]];
    Z.mirrors = MIR.map(([x, z, o], i) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.6, 8), pzStoneM); ped.position.set(x, 0.3, z); Z.root.add(ped);
      const g = new THREE.Group(); g.position.set(x, 0, z); Z.root.add(g);
      box(1.9, 1.7, 0.12, 0, 1.45, 0, pzMirrorM, g); box(2.0, 0.12, 0.2, 0, 0.6, 0, pzBronzeM, g); box(2.0, 0.12, 0.2, 0, 2.3, 0, pzBronzeM, g);
      tag(g, 1);
      Z.solids.push({ x, z, r: 0.8 });
      Z.hits.push({ x, z, r: 0.9, hit: () => turn(i) });
      return { x, z, o, start: o, g };
    });
    box(1.2, 2.8, 1.2, SRC.x, 1.4, SRC.z, pzStoneM, Z.root);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xe8f4ff })); moon.position.set(SRC.x, 3.3, SRC.z); Z.root.add(moon);
    Z.solids.push({ x: SRC.x, z: SRC.z, r: 0.9 });
    box(1.0, 1.0, 1.0, RCV.x, 0.5, RCV.z, pzStoneM, Z.root);
    const rcvM = new THREE.MeshBasicMaterial({ color: 0x3a4a5a });
    const rcv = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), rcvM); rcv.position.set(RCV.x, 1.6, RCV.z); Z.root.add(rcv); tag(rcv, 1);
    Z.solids.push({ x: RCV.x, z: RCV.z, r: 0.8 });
    const beamM = new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.85, depthWrite: false });
    const segs = [];
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), beamM); m.visible = false; Z.root.add(m); segs.push(m); }
    segs.forEach(m => tag(m, 1));
    // March the beam over the 3 m grid: pass edge-on mirrors, stop on face-on ones, turn on diagonal ones
    function trace() {
      let x = SRC.x, z = SRC.z, dx = SRC.dx, dz = SRC.dz; const pts = [[x, z]];
      for (let n = 0; n < 40; n++) {
        x += dx * 3; z += dz * 3;
        if (Math.abs(x) > 12 || Math.abs(z) > 12) { pts.push([x - dx * 1.5, z - dz * 1.5]); return { pts, hit: false }; }
        if (x === RCV.x && z === RCV.z) { pts.push([x, z]); return { pts, hit: true }; }
        if (x === SRC.x && z === SRC.z) { pts.push([x, z]); return { pts, hit: false }; }
        const m = Z.mirrors.find(q => q.x === x && q.z === z); if (!m) continue;
        const ph = m.o * Math.PI / 4, nx = Math.sin(ph), nz = Math.cos(ph), ux = Math.cos(ph), uz = -Math.sin(ph);
        const dn = dx * nx + dz * nz, du = dx * ux + dz * uz;
        if (Math.abs(dn) < 0.2) continue;
        pts.push([x, z]);
        if (Math.abs(du) < 0.2) return { pts, hit: false };
        const rx = Math.round(dx - 2 * dn * nx), rz = Math.round(dz - 2 * dn * nz); dx = rx; dz = rz;
      }
      return { pts, hit: false };
    }
    function draw() {
      const r = trace(); Z.beamHit = r.hit;
      segs.forEach((m, i) => {
        const a = r.pts[i], b = r.pts[i + 1]; m.visible = !!(a && b); if (!m.visible) return;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01;
        m.position.set((a[0] + b[0]) / 2, 1.45, (a[1] + b[1]) / 2); m.scale.set(0.14, 0.14, len); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
      });
      Z.beamEnd = r.pts[r.pts.length - 1];
    }
    function turn(i) { const m = Z.mirrors[i]; m.o = (m.o + 1) % 4; sfx('clang'); draw(); }
    Z.trace = trace; Z.turn = turn;
    Z.reset = () => { Z.mirrors.forEach(m => { m.o = m.start; }); Z.hold = 0; draw(); };
    Z.reset();
    Z.update = (dt, t) => {
      Z.mirrors.forEach(m => { m.g.rotation.y += angDiff(m.g.rotation.y, m.o * Math.PI / 4) * Math.min(1, dt * 10); });
      Z.hold = Z.beamHit ? Z.hold + dt : 0;
      rcvM.color.setHex(Z.beamHit ? (Math.floor(t * 10) % 2 ? 0xffffff : 0xbff6ff) : 0x3a4a5a);
      rcv.rotation.y += dt * (Z.beamHit ? 5 : 0.6);
      beamM.opacity = 0.7 + 0.2 * Math.sin(t * 9);
      if (Z.beamEnd && Math.random() < 0.3) { const w = pzWorld(Z, Z.beamEnd[0], Z.beamEnd[1]); fwColor.setHex(0xcfeaff); fwParticle(w.x, 1.45, w.z, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, fwColor, 0.5, true); }
      if (Z.hold > 1.0) pzSolve(Z);
    };
    Z.solvedLook = () => { Z.mirrors.forEach(m => { m.o = [0, 3, 1, 0, 1, m.o][Z.mirrors.indexOf(m)]; m.g.rotation.y = m.o * Math.PI / 4; }); draw(); rcvM.color.setHex(0xffffff); };
    Z.solvedUpdate = (dt, t) => { rcv.rotation.y += dt * 1.5; beamM.opacity = 0.7 + 0.2 * Math.sin(t * 3); };
  })();

  // ---- 2. Weighing Stones (sokoban pressure plates) ----
  (function () {
    const Z = pzSite(PUZZLE_SITES[2], 'plates', 'Weighing Stones',
      () => ['Three plates, two stone blocks. Walk into a block to push it, and stand on the last plate yourself.', `Stuck? Strike the lever (${pzKey('KeyJ')}) to reset.`], [0, 10.5]);
    const CELL = 2.6, cx = i => (i - 2) * CELL, PILLARS = [[2, 2]], PLATES = [[0, 3], [4, 3], [2, 0]], STARTS = [[1, 2], [3, 1]];
    box(5 * CELL + 0.4, 0.06, 5 * CELL + 0.4, 0, 0.03, 0, pzDarkM, Z.root);
    PILLARS.forEach(([i, j]) => { box(1.6, 2.6, 1.6, cx(i), 1.3, cx(j), pzStoneM, Z.root); Z.solids.push({ x: cx(i), z: cx(j), hx: 0.8, hz: 0.8 }); });
    Z.plates = PLATES.map(([i, j]) => { const m = new THREE.MeshBasicMaterial({ color: 0x40361a }); const p = box(2.1, 0.1, 2.1, cx(i), 0.08, cx(j), m, Z.root); tag(p, 1); return { i, j, m, p, on: false }; });
    Z.blocks = STARTS.map(([i, j]) => {
      const g = new THREE.Group(); Z.root.add(g);
      box(2.3, 2.0, 2.3, 0, 1.0, 0, pzStoneM, g); box(1.2, 0.08, 1.2, 0, 2.02, 0, pzBronzeM, g); tag(g, 1);
      const b = { i, j, si: i, sj: j, g, x: cx(i), z: cx(j), fx: 0, fz: 0, mt: 1, pushT: 0, pdi: 0, pdj: 0 };
      b.solid = { x: b.x, z: b.z, hx: 1.15, hz: 1.15 }; Z.solids.push(b.solid);
      return b;
    });
    // Lever: strike it to send the blocks home
    const lever = new THREE.Group(); lever.position.set(-9.5, 0, -2); Z.root.add(lever);
    box(0.8, 0.9, 0.8, 0, 0.45, 0, pzStoneM, lever);
    const arm = new THREE.Group(); arm.position.y = 0.9; lever.add(arm); box(0.14, 1.3, 0.14, 0, 0.65, 0, pzBronzeM, arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd36a })); knob.position.y = 1.35; arm.add(knob); tag(lever, 1);
    Z.solids.push({ x: -9.5, z: -2, r: 0.6 });
    Z.hits.push({ x: -9.5, z: -2, r: 0.7, hit: () => { Z.leverT = 1; sfx('clang'); Z.reset(true); } });
    const occupied = (i, j, skip) => PILLARS.some(p => p[0] === i && p[1] === j) || Z.blocks.some(b => b !== skip && b.i === i && b.j === j);
    function push(b, di, dj) {
      const ni = b.i + di, nj = b.j + dj;
      if (ni < 0 || nj < 0 || ni > 4 || nj > 4 || occupied(ni, nj, b)) return false;
      b.fx = b.x; b.fz = b.z; b.i = ni; b.j = nj; b.mt = 0; sfx('roll'); return true;
    }
    Z.push = push;
    Z.reset = anim => {
      Z.blocks.forEach(b => { b.fx = b.x; b.fz = b.z; b.i = b.si; b.j = b.sj; b.mt = anim ? 0 : 1; if (!anim) { b.x = cx(b.i); b.z = cx(b.j); } });
      Z.hold = 0; Z.prev = null;
    };
    Z.reset();
    Z.update = (dt, t) => {
      const L = pzLocal(Z, player.position), mvx = Z.prev ? L.x - Z.prev.x : 0, mvz = Z.prev ? L.z - Z.prev.z : 0;
      Z.blocks.forEach(b => {
        if (b.mt < 1) { b.mt = Math.min(1, b.mt + dt / 0.25); const k = b.mt * (2 - b.mt); b.x = b.fx + (cx(b.i) - b.fx) * k; b.z = b.fz + (cx(b.j) - b.fz) * k; }
        b.g.position.set(b.x, 0, b.z); b.solid.x = b.x; b.solid.z = b.z;
        // Pushing: the hero presses against one face and keeps walking into it for a moment
        const dx = L.x - b.x, dz = L.z - b.z, touch = Math.abs(dx) < 1.75 && Math.abs(dz) < 1.75 && P.jh < 0.3 && b.mt >= 1;
        let di = 0, dj = 0;
        if (touch) { if (Math.abs(dx) > Math.abs(dz)) { if (Math.abs(dz) < 0.9) di = -Math.sign(dx); } else if (Math.abs(dx) < 0.9) dj = -Math.sign(dz); }
        const into = di * mvx + dj * mvz > 0.002;
        if ((di || dj) && into && di === b.pdi && dj === b.pdj) { b.pushT += dt; if (b.pushT > 0.22) { b.pushT = 0; push(b, di, dj); } }
        else if (!(di || dj) || di !== b.pdi || dj !== b.pdj) b.pushT = 0;
        b.pdi = di; b.pdj = dj;
      });
      let all = true;
      Z.plates.forEach(p => {
        const hero = Math.abs(L.x - cx(p.i)) < 1.15 && Math.abs(L.z - cx(p.j)) < 1.15 && P.jh < 0.3;
        const on = hero || Z.blocks.some(b => b.mt >= 1 && b.i === p.i && b.j === p.j);
        if (on && !p.on) { pzNote(330 + 110 * Z.plates.indexOf(p), 0.3); }
        p.on = on; all = all && on;
        p.m.color.setHex(on ? 0xffd36a : 0x40361a); p.p.position.y = on ? 0.04 : 0.08;
      });
      Z.hold = all ? Z.hold + dt : 0;
      Z.leverT = Math.max(0, (Z.leverT || 0) - dt); arm.rotation.z = Z.leverT > 0 ? -0.9 : 0.5;
      if (Z.hold > 0.6) pzSolve(Z);
      const now = pzLocal(Z, player.position); Z.prev = now;
    };
    Z.postCollide = () => { Z.prev = pzLocal(Z, player.position); };
    Z.solvedLook = () => {
      const ends = [[0, 3], [4, 3]];
      Z.blocks.forEach((b, k) => { b.i = ends[k][0]; b.j = ends[k][1]; b.x = cx(b.i); b.z = cx(b.j); b.mt = 1; b.g.position.set(b.x, 0, b.z); b.solid.x = b.x; b.solid.z = b.z; });
      Z.plates.forEach(p => { p.m.color.setHex(0xffd36a); p.p.position.y = 0.04; });
    };
    Z.solvedUpdate = () => {};
  })();

  // ---- 3. Veiled Braziers (spirit sight) ----
  (function () {
    const Z = pzSite(PUZZLE_SITES[3], 'veil', 'Veiled Braziers',
      () => [`Only the dead can read this ring. Step into the spirit realm (${pzKey('KeyQ')}) to see which braziers to light, and in what order.`, 'Then light them in the living world. A Veil Rift waits at the ring’s edge.'], [0, 10.5]);
    Z.braziers = [];
    const spirit = new THREE.Group(); spirit.visible = false; Z.root.add(spirit);
    const moteM = spiritMat(0xbff6ff, 0.9), colM = spiritMat(0xc8a0ff, 0.22), stepM = spiritMat(0x9fe8ff, 0.5);
    for (let i = 0; i < 5; i++) {
      const th = (36 + 72 * i) * Math.PI / 180, x = 7.5 * Math.sin(th), z = 7.5 * Math.cos(th);
      const b = pzBrazier(Z.root, x, z); Z.braziers.push(b);
      Z.solids.push({ x, z, r: 0.6 });
      Z.hits.push({ x, z, r: 0.7, hit: () => light(i) });
      const mk = new THREE.Group(); mk.position.set(x, 0, z); spirit.add(mk);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 8, 1, true), colM); col.position.y = 4.5; mk.add(col);
      b.motes = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), moteM); mk.add(m); return m; });
      b.mark = mk;
    }
    // Spirit-only stepping stones from the entrance to the tablet
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.35, 10), stepM); s.rotation.x = -Math.PI / 2; s.position.set((k % 2 ? 0.4 : -0.4), 0.05, 12.5 - k * 1.8); spirit.add(s); }
    box(1.8, 1.5, 0.5, 0, 0.75, 0, pzStoneM, Z.root);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 16), spiritMat(0xc8a0ff, 0.95)); eye.position.set(0, 1.1, 0.27); Z.root.add(eye);
    Z.solids.push({ x: 0, z: 0, hx: 0.9, hz: 0.25 });
    // Its own Veil Rift, so the hero can step back out without a long walk
    {
      const w = pzWorld(Z, 10.5, -5), g = new THREE.Group(); g.position.set(w.x, 0, w.z); moatGroup.add(g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 36), riftMat); ring.position.y = 1.8; g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), riftInner); disc.position.y = 1.8; g.add(disc);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 24, 8, 1, true), riftBeam); beam.position.y = 12; g.add(beam);
      tag(ring, 1); RIFTS.push({ x: w.x, z: w.z, g, ring, disc });
    }
    Z.reset = () => {
      const s = [0, 1, 2, 3, 4]; for (let i = 4; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
      Z.order = s.slice(0, 3); Z.k = 0; Z.braziers.forEach(b => b.set(false));
      Z.braziers.forEach((b, i) => { const n = Z.order.indexOf(i) + 1; b.mark.visible = n > 0; b.motes.forEach((m, k) => { m.visible = k < n; }); });
    };
    Z.reset();
    function light(i) {
      const b = Z.braziers[i], w = pzWorld(Z, b.x, b.z);
      if (b.lit) return;
      if (G.realm === 'spirit') { floatText('Spirit fire will not catch here', w.clone().setY(3), 'word', '#c8a0ff'); return; }
      if (Z.order[Z.k] === i) {
        b.set(true); Z.k++; sfx('cast'); burst(w.x, 1.8, w.z, 16, 4);
        if (Z.k >= 3) pzSolve(Z);
      } else {
        Z.braziers.forEach((q, k) => { if (q.lit) pzPuff(Z, q.x, q.z); q.set(false); }); pzPuff(Z, b.x, b.z);
        Z.k = 0; sfx('clang'); floatText('The flames gutter out', w.clone().setY(3), 'word', '#ff8a8a');
      }
    }
    Z.light = light;
    Z.update = (dt, t) => {
      spirit.visible = G.realm === 'spirit';
      if (spirit.visible) Z.braziers.forEach(b => b.motes.forEach((m, k) => { const a = t * 1.6 + k * TAU / 3; m.position.set(Math.cos(a) * 0.8, 2.8 + Math.sin(t * 2 + k) * 0.15, Math.sin(a) * 0.8); }));
      eye.material.opacity = G.realm === 'spirit' ? 0.95 : 0.35 + 0.2 * Math.sin(t * 2);
      pzFlicker(Z.braziers, t);
    };
    Z.solvedLook = () => { Z.braziers.forEach(b => b.set(true)); spirit.visible = false; };
    Z.solvedUpdate = (dt, t) => { spirit.visible = false; pzFlicker(Z.braziers, t); };
  })();

  // ---- 4. Ember Run (timed brazier run) ----
  (function () {
    const TIME = 22;
    const Z = pzSite(PUZZLE_SITES[4], 'embers', 'Ember Run',
      () => [`Ring the bell (${pzKey('KeyJ')}), then light all six braziers within ${TIME} seconds.`, `Jump (${pzKey('Space')}) the low walls and roll (${pzKey('KeyL')}) to save time.`], [2.4, 4.4]);
    Z.braziers = [];
    for (let i = 0; i < 6; i++) {
      const th = (30 + 60 * i) * Math.PI / 180, x = 10.5 * Math.sin(th), z = 10.5 * Math.cos(th);
      Z.braziers.push(pzBrazier(Z.root, x, z));
      Z.solids.push({ x, z, r: 0.6 });
      Z.hits.push({ x, z, r: 0.7, hit: () => light(i) });
    }
    // Low walls between the braziers: jump them (the hero drifts through them in the spirit realm, where fire won't catch)
    for (let i = 0; i < 6; i++) {
      const th = i * Math.PI / 3, sx = Math.sin(th), sz = Math.cos(th), r0 = 3.2, r1 = 14.4, rm = (r0 + r1) / 2;
      const w = box(0.5, 0.8, r1 - r0, sx * rm, 0.4, sz * rm, pzStoneM, Z.root); w.rotation.y = th;
      Z.solids.push({ ax: sx * r0, az: sz * r0, bx: sx * r1, bz: sz * r1, r: 0.25, low: true, ghost: true });
    }
    // The bell in the middle
    box(0.3, 3.2, 0.3, -1.3, 1.6, 0, pzDarkM, Z.root); box(0.3, 3.2, 0.3, 1.3, 1.6, 0, pzDarkM, Z.root); box(2.9, 0.3, 0.3, 0, 3.2, 0, pzDarkM, Z.root);
    const bell = new THREE.Group(); bell.position.y = 3.05; Z.root.add(bell);
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 1.2, 10, 1, true), pzBronzeM); bm.material.side = THREE.DoubleSide; bm.position.y = -0.7; bell.add(bm); tag(bell, 1);
    Z.solids.push({ x: 0, z: 0, r: 2.3 });
    Z.hits.push({ x: 0, z: 0, r: 1.6, hit: ring });
    function ring() {
      Z.bellA = 0.45; pzNote(262, 1.6); pzNote(392, 1.4);
      if (G.realm === 'spirit') return;
      Z.braziers.forEach(b => b.set(false)); Z.run = TIME; Z.lastSec = TIME;
      floatText(`${TIME} seconds!`, player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ffd36a');
    }
    function light(i) {
      const b = Z.braziers[i], w = pzWorld(Z, b.x, b.z);
      if (b.lit) return;
      if (G.realm === 'spirit') { floatText('Spirit fire will not catch here', w.clone().setY(3), 'word', '#c8a0ff'); return; }
      if (!(Z.run > 0)) { floatText('Ring the bell first', w.clone().setY(3), 'word', '#ffd36a'); return; }
      b.set(true); sfx('cast'); burst(w.x, 1.8, w.z, 16, 4);
      const n = Z.braziers.filter(q => q.lit).length;
      floatText(`${n} / 6`, w.clone().setY(3), 'word', '#ffd36a');
      if (n >= 6) { Z.run = 0; pzSolve(Z); }
    }
    Z.ring = ring; Z.light = light;
    Z.reset = () => { Z.run = 0; Z.braziers.forEach(b => b.set(false)); };
    Z.reset();
    Z.update = (dt, t) => {
      Z.bellA = (Z.bellA || 0) * Math.max(0, 1 - dt * 1.5); bell.rotation.z = Z.bellA * Math.sin(t * 9);
      if (Z.run > 0) {
        Z.run -= dt; const sec = Math.ceil(Z.run);
        if (sec !== Z.lastSec && (sec <= 5 || sec === 10) && sec > 0) { Z.lastSec = sec; floatText(String(sec), player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'big', '#ffd36a'); pzNote(880, 0.12); }
        if (Z.run <= 0) {
          Z.run = 0; Z.braziers.forEach(b => { if (b.lit) pzPuff(Z, b.x, b.z); b.set(false); }); sfx('clang');
          floatText('The embers die. Ring the bell again', player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ff8a8a');
        }
      }
      pzFlicker(Z.braziers, t);
    };
    Z.solvedLook = () => { Z.run = 0; Z.braziers.forEach(b => b.set(true)); };
    Z.solvedUpdate = (dt, t) => { pzFlicker(Z.braziers, t); bell.rotation.z = Math.sin(t * 0.8) * 0.05; };
  })();

  // ---------- Per-frame update (moat only; called from the loop) ----------
  function updatePuzzles(dt) {
    if (!G.story || !G.story.prog) return;
    const sv = pzSaved(), seen = pzSeen(), t = uTime.value, p = player.position;
    PZ.forEach(Z => {
      const s = Z.site, st = sv[s.id] || 0;
      // Keep the scene in step with the save (a load, or a new game)
      if (st >= 1 && !s.solved) { s.solved = true; Z.solvedLook(); if (st === 1) pzChest(Z); }
      else if (st < 1 && s.solved) { s.solved = false; pzDropChest(Z); if (Z.unsolvedLook) Z.unsolvedLook(); Z.reset(); }
      if (Z.chest && Z.chest.open) {
        if (sv[s.id] === 1) { sv[s.id] = 2; saveGame(); }
        Z.chestT += dt; if (Z.chestT > 2.5) pzDropChest(Z);
      }
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      Z.root.visible = d < 95;
      if (d > s.r + 25 || dt <= 0) return;
      const inside = d < s.r;
      if (inside && !Z.inside) {
        if (!seen[s.id] && !s.solved) { seen[s.id] = 1; pzTip(Z.title, Z.hint(), 8); }
        if (!s.solved && Z.onEnter) Z.onEnter();
      }
      Z.inside = inside;
      if (s.solved) Z.solvedUpdate(dt, t); else Z.update(dt, t);
      if (d < s.r + 4) { pzCollide(Z); if (Z.postCollide) Z.postCollide(); }
    });
  }
