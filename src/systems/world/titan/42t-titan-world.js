  // ---------- The titan world: a walled city against giants (Agent: titan) ----------
  // Lanternreach: a plateau city behind a great wall, besieged by the Gaunts (hollow giants) that walk out of the marsh
  // mist. Not one of the four story shards: a side world, open from the start through any World Gate, with its own
  // objective (fell five Gaunts, then the Bellringer breaches the Great Gate) and endless stages like the others.
  // Files: this one builds the place and its ground; 42t2 holds the giants; 42t3 the hook climb, objective and boss.
  // The ground function returns real heights (rooftops, the wall, the wall stairs), so the hero climbs them the same
  // way she climbs the moat's solids: she steps up 0.6 m, jumps onto anything her feet clear, and drops off ledges.
  const SIDE_WORLDS = ['titan'];
  WNAME.titan = 'Lanternreach';
  SHARD.titan = 'the Lantern Shard';
  UNLOCK_HINT.titan = '';
  WORLD_ENV.titan = { name: 'Lanternreach', hor: [0.36, 0.2, 0.12], zen: [0.025, 0.04, 0.1], moon: 0xffd9a0, aur: 0, fog: 0.011, fogCol: 0x2a2230, embers: 0 };

  // Wall band z 4..10 across the whole map (the city lies south of it, the giants' fields north), 9.5 m tall
  const TI_WALL_H = 9.5, TI_WALL_Z0 = 4, TI_WALL_Z1 = 10, TI_GATE_HALF = 6;
  // Runtime state of the world (the objective itself lives in G.story so it saves with everything else)
  const TITAN = { breached: false, solids: [], gateGroup: null, rubble: null, posts: [], riding: 0, glide: 0, init: false };
  let tiSeed = 4242;
  const tiRand = () => (tiSeed = (tiSeed * 16807) % 2147483647, (tiSeed - 1) / 2147483646);

  const titanW = makeWorld('titan', {
    name: 'Lanternreach',
    boss: V3(0, -52), objPts: [],
    objCol: '#ffc870', objWord: 'Gaunt felled', mapBg: 'rgba(40,30,34,0.6)', mapSolid: 'rgba(210,170,120,0.8)',
    task: 'fell the Gaunts by striking the glowing knot at the back of the neck',
    intro: 'A walled lantern-city on a high plateau, besieged by hollow giants. Ground blades barely scratch them. Hook one and strike the glowing knot at the nape.',
    bossName: 'The Bellringer', bossLine: 'The great bell tolls from the marsh. The Bellringer wades out of the mist toward the Great Gate, the Lantern Shard cracked into its chest.',
    paint: (g, w, h) => {
      g.fillStyle = '#2a2a26'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) { g.fillStyle = tiRand() < 0.5 ? 'rgba(96,92,70,.35)' : 'rgba(14,14,12,.55)'; g.fillRect(tiRand() * w, tiRand() * h, 2, 2); }
    }
  });
  titanW.objLook = () => {};
  titanW.anim = () => {};

  {
    const W = titanW, grp = W.group, WH = TI_WALL_H;
    const stoneA = lam(0x6b6258), stoneB = lam(0x5a5249), stoneC = lam(0x7a6e60), rim = lam(0x8a7d6c), roofM = lam(0x4a3f38), woodM = lam(0x5a4028), ironM = lam(0x2e2a28);
    const winM = bas(0x1c1410), litM = bas(0xffb458), lampM = bas(0xffc870), lampPole = lam(0x3a2e24);
    const walls = [stoneA, stoneB, stoneC];

    // --- ground: wall band, stairs, solids with heights, trees as walls ---
    const solid = (x0, x1, z0, z1, h, mapIt) => { TITAN.solids.push({ x0, x1, z0, z1, h }); if (mapIt !== false) W.rects.push([x0, x1, z0, z1]); };
    W.ground = (x, z) => {
      if (x < -69 || x > 69 || z < -69 || z > 69) return 99;
      const ax = Math.abs(x);
      if (z > TI_WALL_Z0 && z < TI_WALL_Z1) {
        if (ax < TI_GATE_HALF) return TITAN.breached ? 0 : WH;
        if (ax > 40 && ax < 43) return 0; // the postern doors
        return WH;
      }
      if (z >= TI_WALL_Z1 && z <= 30 && ax > 63 && ax < 68) return WH * (30 - z) / 20; // the wall stairs
      for (const c of W.circles) { const dx = x - c[0], dz = z - c[1]; if (dx * dx + dz * dz < c[2] * c[2]) return 99; }
      let h = 0;
      for (const s of TITAN.solids) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.h > h) h = s.h;
      return h;
    };

    // --- floors: a cobbled city under the wall ---
    const cobble = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#3a342c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = tiRand() < 0.5 ? 'rgba(120,108,88,.55)' : 'rgba(20,16,12,.5)'; g.fillRect(tiRand() * w, tiRand() * h, 12 + tiRand() * 10, 8 + tiRand() * 6); }
    }, [28, 12]);
    const city = new THREE.Mesh(new THREE.PlaneGeometry(140, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: cobble, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    city.position.set(0, 0.02, 40); grp.add(city);

    // --- the wall: segments leave the Great Gate and two postern doors open ---
    function wallSeg(x0, x1) {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      box(w, WH, TI_WALL_Z1 - TI_WALL_Z0, cx, WH / 2, 7, stoneA, grp);
      for (let x = x0 + 1.2; x < x1 - 0.6; x += 3.2) box(1.6, 1.3, 0.7, x, WH + 0.65, TI_WALL_Z0 + 0.35, stoneC, grp);
      for (let x = x0 + 2.5; x < x1 - 1; x += 7) box(0.3, 1.8, 0.12, x, 5.2, TI_WALL_Z0 - 0.04, winM, grp);
      W.rects.push([x0, x1, TI_WALL_Z0, TI_WALL_Z1]);
    }
    [[-70, -43], [-40, -6], [6, 40], [43, 70]].forEach(([a, b]) => wallSeg(a, b));
    // Lintels over the posterns so the wall reads as one piece
    [-41.5, 41.5].forEach(x => box(3, 1.4, 6, x, WH - 0.7, 7, stoneB, grp));
    // Lamp posts along the wall top, inner edge: friendly glyphs that mark the way along it
    for (let x = -60; x <= 60; x += 12) {
      if (Math.abs(x) < 9 || Math.abs(Math.abs(x) - 42) < 4) continue;
      box(0.16, 2.0, 0.16, x, WH + 1, 9.5, lampPole, grp);
      const l = sph(0.28, lampM, grp, x, WH + 2.15, 9.5); tag(l, 1);
    }
    // The Great Gate: a wooden door in an iron frame, and the lintel above it. The Bellringer brings it down.
    const gate = new THREE.Group(); gate.position.set(0, 0, 7); grp.add(gate);
    box(12, 8.6, 1.4, 0, 4.3, 0, woodM, gate);
    [1.6, 4.3, 7.0].forEach(y => box(12.3, 0.45, 1.5, 0, y, 0, ironM, gate));
    [-4, -2, 0, 2, 4].forEach(x => box(0.25, 8.6, 1.5, x, 4.3, 0, ironM, gate));
    box(12.4, 0.9, 6, 0, WH - 0.45, 0, stoneB, gate);
    [-1, 1].forEach(s => { box(0.5, 3.4, 0.5, s * 6.9, 1.7, -3.4, lampPole, gate); tag(sph(0.5, lampM, gate, s * 6.9, 3.7, -3.4), 1); });
    TITAN.gateGroup = gate;
    const rub = new THREE.Group(); rub.position.set(0, 0, 7); rub.visible = false; grp.add(rub);
    const rubM = [stoneA, stoneB, woodM];
    for (let i = 0; i < 16; i++) { const s = 0.7 + tiRand() * 1.6, m = box(s, s * 0.7, s, (tiRand() - 0.5) * 11, s * 0.3, (tiRand() - 0.5) * 6, rubM[i % 3], rub); m.rotation.set(tiRand(), tiRand() * 3, tiRand() * 0.6); }
    TITAN.rubble = rub;
    // The wall stairs: a solid wedge up to the wall top, one at each end
    [-1, 1].forEach(sd => {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(20, 0); sh.lineTo(20, WH); sh.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false });
      const x0 = sd > 0 ? 63 : -68;
      geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x0, 0, 1, 0, 0, -1, 0, 0, 30, 0, 0, 0, 1));
      grp.add(new THREE.Mesh(geo, stoneC));
      W.rects.push([x0, x0 + 5, 10, 30]);
      // steps drawn on the slope so it reads as stairs
      for (let k = 1; k < 10; k++) box(5, 0.14, 0.2, x0 + 2.5, WH * (1 - k / 10) + 0.06, 10 + k * 2, rim, grp);
    });

    // --- the city: blocks of a house, a shed beside it and, on some, a balcony and a watchtower ---
    // Heights are the climb: shed 2.4 (one jump from the street), house 4.4, balcony 6.2, tower 8.5.
    function house(x0, x1, z0, z1, h, mat, lit) {
      const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      box(w, h, d, cx, h / 2, cz, mat, grp);
      box(w + 0.3, 0.3, 0.35, cx, h + 0.15, z0 + 0.17, rim, grp); box(w + 0.3, 0.3, 0.35, cx, h + 0.15, z1 - 0.17, rim, grp);
      box(0.35, 0.3, d, x0 + 0.17, h + 0.15, cz, rim, grp); box(0.35, 0.3, d, x1 - 0.17, h + 0.15, cz, rim, grp);
      [z0 - 0.04, z1 + 0.04].forEach((zf, i) => {
        for (let k = 0; k < Math.max(1, Math.floor(w / 3)); k++) {
          const wx = x0 + (k + 0.5) * w / Math.max(1, Math.floor(w / 3));
          box(0.8, h > 5 ? 1.0 : 1.2, 0.08, wx, h * 0.6, zf, (lit + k + i) % 3 === 0 ? litM : winM, grp);
        }
      });
      solid(x0, x1, z0, z1, h);
      return { cx, cz };
    }
    const cols = [-56, -38, -20, 20, 38, 56], rows = [22, 40, 56];
    cols.forEach((cx, ci) => rows.forEach((cz, ri) => {
      const i = ci * 3 + ri, east = cx < 0 ? 1 : -1;
      house(cx - 5, cx + 5, cz - 4, cz + 4, 4.4, walls[i % 3], i);
      box(1.4, 2.2, 0.1, cx, 1.1, cz + 4.06, woodM, grp);
      box(0.8, 1.6, 0.8, cx + 3 * -east, 5.2, cz - 2, stoneB, grp);
      // the shed on the side that faces the boulevard
      const sx0 = east > 0 ? cx + 5 : cx - 8, sx1 = sx0 + 3;
      house(sx0, sx1, cz - 3, cz, 2.4, walls[(i + 1) % 3], i + 1);
      // crates at the shed's foot: a first step for the hero
      solid(east > 0 ? sx1 : sx0 - 1.2, east > 0 ? sx1 + 1.2 : sx0, cz - 3, cz - 1.8, 1.2); box(1.2, 1.2, 1.2, east > 0 ? sx1 + 0.6 : sx0 - 0.6, 0.6, cz - 2.4, woodM, grp);
      if (ri < 2 && (ci + ri) % 2 === 0) {
        // balcony off the house's south face, then the watchtower
        house(cx - 5, cx - 2, cz + 4, cz + 6, 6.2, walls[(i + 2) % 3], i);
        house(cx - 5, cx - 1.5, cz + 6, cz + 9.5, 8.5, walls[i % 3], i + 2);
        box(0.16, 2.2, 0.16, cx - 3.2, 8.5 + 1.1, cz + 7.5, lampPole, grp);
        const lamp = sph(0.34, lampM, grp, cx - 3.2, 8.5 + 2.35, cz + 7.5); tag(lamp, 1); TITAN.posts.push(lamp);
      }
    }));

    // --- the fields north of the wall: broken walls to hop on, dead trees, and the bones of giants ---
    const bk = lam(0x4a4034), bone = lam(0xcdc4ae);
    for (let i = 0; i < 16; i++) {
      for (let t = 0; t < 30; t++) {
        const x = -60 + tiRand() * 120, z = -60 + tiRand() * 48;
        if (Math.abs(x) < 9 || Math.hypot(x, z + 52) < 12) continue;
        const w = 3 + tiRand() * 4, d = 1.4 + tiRand() * 1.4, h = i % 3 === 0 ? 1.2 : 2.0 + tiRand() * 1.2;
        if (TITAN.solids.some(s => x + w / 2 > s.x0 - 3 && x - w / 2 < s.x1 + 3 && z + d / 2 > s.z0 - 3 && z - d / 2 < s.z1 + 3)) continue;
        box(w, h, d, x, h / 2, z, walls[i % 3], grp);
        solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h);
        break;
      }
    }
    for (let i = 0; i < 16; i++) {
      for (let t = 0; t < 30; t++) {
        const x = -62 + tiRand() * 124, z = -62 + tiRand() * 54;
        if (Math.abs(x) < 10 || W.circles.some(c => Math.hypot(c[0] - x, c[1] - z) < 7) || TITAN.solids.some(s => x > s.x0 - 3 && x < s.x1 + 3 && z > s.z0 - 3 && z < s.z1 + 3)) continue;
        const h = 4 + tiRand() * 3, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = tiRand() * 6; grp.add(g);
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.36, h, 5), bk); tr.position.y = h / 2; g.add(tr);
        for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + tiRand(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 1.8 + tiRand(), 4), bk); b.position.set(Math.cos(a) * 0.5, h * (0.55 + k * 0.12), Math.sin(a) * 0.5); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(b); }
        W.circles.push([x, z, 0.55]); break;
      }
    }
    // The bones of a fallen giant: a spine with an arch of ribs. Scenery; nothing to hit.
    function ribs(x, z, rot, s) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; grp.add(g);
      for (let k = 0; k < 7; k++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.9 * s * (1 - Math.abs(k - 3) * 0.1), 0.14 * s, 5, 14, Math.PI), bone);
        r.position.set(0, 0, (k - 3) * 0.9 * s); g.add(r);
      }
      box(0.3 * s, 0.3 * s, 7 * s, 0, 0.15 * s, 0, bone, g);
    }
    ribs(-30, -30, 0.5, 1.4); ribs(34, -22, 2.1, 1.1); ribs(-12, -46, 1.3, 1.7); ribs(48, -44, 0.2, 1.2); ribs(-52, -12, 2.6, 1.0);
    W.keys.forEach(p => { if (W.ground(p.x, p.z) !== 0) console.warn(`${W.name}: key point ${p.x},${p.z} is blocked`); });
  }
