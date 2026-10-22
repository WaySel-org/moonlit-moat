  // ---------- World system: worlds, travel and story (The Sundering) ----------
  // The World Heart cracked and every world holds a shard.
  // Everything built so far is the moat. Gather it under one group so another world can take its place,
  // while the hero, sky, sparks, telegraphs and creep pool stay shared by every world.
  const moatGroup = new THREE.Group();
  {
    const keep = new Set([player, sky, moon, halo, sparks, fireworks, teleCircle, fillCircle, teleLane, fillLane]);
    creeps.forEach(c => keep.add(c.g));
    scene.children.slice().forEach(o => {
      if (keep.has(o) || o.isHemisphereLight || o.isDirectionalLight) return;
      if (o.isMesh && (o.material === teleMat || o.material === fillMat)) return;
      moatGroup.attach(o);
    });
    [boss, dragon.g].concat(royals.map(r => r.g), beasts.map(b => b.g)).forEach(o => { if (o.parent !== moatGroup) moatGroup.attach(o); });
    scene.add(moatGroup);
  }
  // Creeps in the moat use their realm ('material' or 'spirit'); creeps elsewhere use their world id
  function realmKey() { return G.world === 'moat' ? G.realm : G.world; }

  const CHAPTERS = ['moat', 'veyra', 'neon', 'ash'];
  const WNAME = { moat: 'Moonlit Moat', veyra: 'Veyra', neon: 'Neon Verge', ash: 'Ashfall' };
  const SHARD = { moat: 'the Moon Shard', veyra: 'the Bloom Shard', neon: 'the Signal Shard', ash: 'the Ember Shard' };
  const UNLOCK_HINT = { veyra: 'Opens when the Gate Warden falls', neon: 'Opens when the Hive Matron falls in Veyra', ash: 'Opens when Director Halvane falls in Neon Verge' };
  const WORLD_ENV = {
    veyra: { name: 'Veyra', hor: [0.2, 0.07, 0.3], zen: [0.015, 0.07, 0.08], moon: 0xb8fff0, aur: 0.7, fog: 0.012, fogCol: 0x1c1034, embers: 0 },
    neon: { name: 'Neon Verge', hor: [0.36, 0.14, 0.08], zen: [0.12, 0.03, 0.13], moon: 0xff9ad8, aur: 0, fog: 0.02, fogCol: 0x3a1a2c, embers: 0 },
    ash: { name: 'Ashfall', hor: [0.21, 0.13, 0.08], zen: [0.05, 0.035, 0.025], moon: 0xc8946a, aur: 0, fog: 0.042, fogCol: 0x2c2219, embers: 0, ash: 1 }
  };
  const WORLD_SPAWN = new THREE.Vector3(0, 0, 56), WORLD_GATE = new THREE.Vector3(-5, 0, 61), MOAT_GATE = new THREE.Vector3(-5, 0, 18);
  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
  const bas = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
  const sph = (r, col, parent, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), col); m.position.set(x, y, z); parent.add(m); return m; };

  // World Gates: a stone frame around a slowly turning golden ring
  const gates = [];
  function buildWorldGate(parent, p) {
    const g = new THREE.Group(); g.position.copy(p); parent.add(g);
    const pillar = lam(0x8a8478);
    [-1, 1].forEach(s => box(0.45, 4.6, 0.45, s * 2.1, 2.3, 0, pillar, g));
    box(5.0, 0.45, 0.7, 0, 4.7, 0, pillar, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 40), bas(0xffe6a8)); ring.position.y = 2.3; g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), bas(0xffd36a, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })); disc.position.y = 2.3; g.add(disc);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 8, 1, true), bas(0xffe6a8, { transparent: true, opacity: 0.09, depthWrite: false })); beam.position.y = 13; g.add(beam);
    tag(ring, 1);
    gates.push({ g, ring, disc });
  }
  buildWorldGate(moatGroup, MOAT_GATE);

  // A world: its own group, ground, solids (rects [x0, x1, z0, z1] and circles [x, z, r]), gate, objectives and a boss arena
  const WORLDS = {};
  function makeWorld(id, o) {
    const W = Object.assign({ id, name: WNAME[id], group: new THREE.Group(), rects: [], circles: [], objs: [], placed: [], spawn: WORLD_SPAWN, gate: WORLD_GATE }, o);
    W.group.visible = false; scene.add(W.group);
    W.ground = (x, z) => {
      if (Math.abs(x) > 70 || Math.abs(z) > 70) return 99;
      for (const r of W.rects) if (x > r[0] && x < r[1] && z > r[2] && z < r[3]) return 99;
      for (const c of W.circles) { const dx = x - c[0], dz = z - c[1]; if (dx * dx + dz * dz < c[2] * c[2]) return 99; }
      return 0;
    };
    W.keys = [W.spawn, W.gate, W.boss].concat(W.objPts);
    // A free spot for scenery: clear of the spawn, gate, objectives and arena, and of other placed props
    W.spot = (keyGap, gap) => {
      for (let t = 0; t < 300; t++) {
        const x = -64 + sr() * 128, z = -64 + sr() * 128;
        if (W.ground(x, z) !== 0 || W.keys.some(p => Math.hypot(p.x - x, p.z - z) < keyGap)) continue;
        if (W.placed.some(p => Math.hypot(p[0] - x, p[1] - z) < gap)) continue;
        W.placed.push([x, z]); return [x, z];
      }
      return null;
    };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, o.paint, [80, 80]) }));
    W.group.add(floor);
    buildWorldGate(W.group, W.gate);
    WORLDS[id] = W; return W;
  }
  const V3 = (x, z) => new THREE.Vector3(x, 0, z);
