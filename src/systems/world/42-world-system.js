  // ---------- World system: enemies of the other worlds ----------
  // Keep every spawn, gate, objective and arena on open ground
  Object.values(WORLDS).forEach(W => W.keys.forEach(p => { if (W.ground(p.x, p.z) !== 0) console.warn(`${W.name}: key point ${p.x},${p.z} is blocked`); }));

  // They reuse the melee, ranged and godling brains
  Object.assign(CREEP_NAME, { skitter: 'Skitterling', spore: 'Spore Drifter', runner: 'Chrome Runner', drone: 'Patrol Drone', shambler: 'Shambler', bloater: 'Bloater', matron: 'The Hive Matron', halvane: 'Director Halvane', rot: 'The Rot Sovereign' });
  Object.assign(CREEP_BASE, { skitter: 34, spore: 40, runner: 46, drone: 42, shambler: 72, bloater: 56, matron: 2200, halvane: 2200, rot: 2200 });
  const WORLD_BUILD = {
    skitter() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const mat = lam(0x2fb0a0), eye = bas(0xe8ff6a);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), mat); sh.scale.set(1, 0.5, 1.25); sh.position.y = 0.36; body.add(sh);
      sph(0.2, mat, body, 0, 0.36, 0.55);
      [-0.09, 0.09].forEach(x => sph(0.05, eye, body, x, 0.42, 0.72));
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), bas(0xc86aff)); spine.position.set(0, 0.68, -0.2); spine.rotation.x = -0.5; body.add(spine);
      const legs = [];
      for (let i = 0; i < 6; i++) { const sd = i < 3 ? -1 : 1, row = i % 3; const l = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), mat); l.position.set(sd * 0.45, 0.22, -0.3 + row * 0.3); l.rotation.z = sd * -0.5; body.add(l); legs.push(l); }
      return { g, body, legs };
    },
    spore() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      body.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), lam(0x8a4ac8)));
      const core = sph(0.2, bas(0xffb0ff), body, 0, 0, 0.38);
      const tm = bas(0x6affd8);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.8, 4), tm); t.position.set(Math.cos(a) * 0.3, -0.6, Math.sin(a) * 0.3); t.rotation.x = Math.PI; body.add(t); }
      return { g, body, core };
    },
    runner() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const chrome = lam(0xb8c6d4), darkM = lam(0x2a2e36), visor = bas(0xff3ad8), edge = bas(0x9ff6ff);
      const legs = [-0.14, 0.14].map(x => box(0.12, 0.85, 0.14, x, 0.43, 0, chrome, body));
      box(0.46, 0.6, 0.26, 0, 1.15, 0, chrome, body); box(0.5, 0.12, 0.3, 0, 0.88, 0, darkM, body);
      box(0.26, 0.26, 0.26, 0, 1.6, 0, darkM, body); box(0.24, 0.06, 0.04, 0, 1.62, 0.14, visor, body);
      [-1, 1].forEach(sd => { box(0.1, 0.55, 0.1, sd * 0.32, 1.1, 0.12, chrome, body).rotation.x = -0.9; box(0.04, 0.04, 0.6, sd * 0.32, 0.95, 0.55, edge, body); });
      return { g, body, legs };
    },
    drone() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const hull = lam(0x3a4250), rot = bas(0x3af0ff);
      box(0.7, 0.22, 0.7, 0, 0, 0, hull, body);
      const core = sph(0.16, bas(0xff4a3a), body, 0, -0.12, 0.32);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        box(0.08, 0.05, 0.08, sx * 0.45, 0.06, sz * 0.45, hull, body);
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 4, 16), rot); r.rotation.x = Math.PI / 2; r.position.set(sx * 0.55, 0.1, sz * 0.55); body.add(r);
      });
      return { g, body, core };
    },
    shambler() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const flesh = lam(0x6a7a52), rag = lam(0x4a3e34), eye = bas(0xd8ff5a);
      const legs = [-0.14, 0.14].map(x => box(0.15, 0.8, 0.15, x, 0.4, 0, rag, body));
      box(0.5, 0.65, 0.28, 0, 1.1, 0.08, rag, body).rotation.x = 0.35;
      sph(0.18, flesh, body, 0.05, 1.5, 0.28);
      [-0.03, 0.12].forEach(x => sph(0.035, eye, body, x, 1.53, 0.44));
      [-1, 1].forEach(sd => { box(0.11, 0.11, 0.6, sd * 0.3, 1.3, 0.4, flesh, body).rotation.x = 0.15 * sd; });
      return { g, body, legs };
    },
    bloater() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = -0.55;
      const skin = lam(0x8a9a4a), pus = bas(0xb8ff3a);
      sph(0.85, skin, body, 0, 0, 0); sph(0.25, skin, body, 0, 0.9, 0.3);
      const core = sph(0.22, bas(0xd8ff4a), body, 0, 0.1, 0.78);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4, y = (i % 3 - 1) * 0.35; sph(0.1 + (i % 2) * 0.05, pus, body, Math.cos(a) * 0.8, y, Math.sin(a) * 0.8); }
      [-0.35, 0.35].forEach(x => box(0.22, 0.4, 0.22, x, -0.8, 0, skin, body));
      return { g, body, core };
    },
    // Story bosses float on the godling brain, so their bodies sit a metre low to keep their feet on the ground
    matron() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = -1;
      const shell = lam(0x5a2a8a), glowM = bas(0x5affe0), eye = bas(0xff5ad8), crown = bas(0xe0c8ff);
      const abd = sph(1.3, shell, body, 0, 1.4, -1.5); abd.scale.set(1, 0.8, 1.4);
      [[-1.5, 1.34], [-2.3, 1.2], [-0.7, 1.2]].forEach(([z, r]) => { const b = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 4, 24), glowM); b.position.set(0, 1.4, z); b.scale.y = 0.8; body.add(b); });
      sph(0.8, shell, body, 0, 1.7, 0.3); sph(0.5, shell, body, 0, 2.2, 1.0);
      [[-0.18, 2.32], [0.18, 2.32], [-0.1, 2.12], [0.1, 2.12]].forEach(([x, y]) => sph(0.07, eye, body, x, y, 1.45));
      [-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4), crown); m.position.set(sd * 0.22, 1.9, 1.5); m.rotation.set(1.4, 0, sd * 0.4); body.add(m); });
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), crown); c.position.set(Math.cos(a) * 0.3, 2.75, 1.0 + Math.sin(a) * 0.3); body.add(c); }
      for (let i = 0; i < 6; i++) { const sd = i < 3 ? -1 : 1, row = i % 3; const l = box(2.2, 0.14, 0.14, sd * 1.2, 1.2, -0.4 + row * 0.6, shell, body); l.rotation.z = sd * -0.55; }
      const wingM = bas(0xc8a0ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      [-1, 1].forEach(sd => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), wingM); w.position.set(sd * 0.7, 2.4, -1.0); w.rotation.set(-1.0, sd * 0.4, sd * 0.3); body.add(w); });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 24), crown); halo.position.set(0, 3.1, 1.0); halo.rotation.x = Math.PI / 2; body.add(halo);
      return { g, body, halo };
    },
    halvane() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = -1;
      const suit = lam(0x2a2e3a), plate = lam(0x8a1a4a), gold = bas(0xffd36a), visor = bas(0x3af0ff), heart = bas(0xff3ad8), thr = bas(0xff9a3a);
      [-0.55, 0.55].forEach(x => { box(0.6, 1.6, 0.7, x, 0.8, 0, suit, body); box(0.7, 0.3, 1.0, x, 0.15, 0.1, plate, body); });
      box(1.5, 0.5, 0.9, 0, 1.75, 0, plate, body);
      box(2.0, 1.5, 1.2, 0, 2.7, 0, suit, body);
      box(0.5, 0.5, 0.1, 0, 2.9, 0.62, heart, body);
      box(0.12, 0.8, 0.05, 0, 2.3, 0.63, gold, body);
      [-1, 1].forEach(sd => { box(0.9, 0.6, 1.1, sd * 1.4, 3.3, 0, plate, body); box(0.45, 1.4, 0.45, sd * 1.4, 2.4, 0, suit, body); });
      box(0.7, 0.7, 0.7, 0, 3.8, 0, suit, body); box(0.6, 0.12, 0.05, 0, 3.85, 0.36, visor, body);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8), plate); gun.rotation.x = Math.PI / 2; gun.position.set(-1.4, 1.75, 0.6); body.add(gun);
      sph(0.18, bas(0xff4a3a), body, -1.4, 1.75, 1.32);
      [-0.5, 0.5].forEach(x => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 6), thr); c.position.set(x, 2.2, -0.75); c.rotation.x = Math.PI; body.add(c); });
      return { g, body };
    },
    rot() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = -1;
      const robe = lam(0x3a3a2a), bone = lam(0xb8b090), skull = lam(0xd8d0b0), sick = bas(0x8aff4a), crownM = lam(0x8a7a3a);
      const r0 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.0, 9), robe); r0.position.y = 1.5; body.add(r0);
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.08, 0.06, 4, 16), bone); t.rotation.x = Math.PI / 2; t.position.y = 2.55 + i * 0.28; body.add(t); }
      sph(0.3, sick, body, 0, 2.7, 0.15);
      sph(0.45, skull, body, 0, 3.6, 0); box(0.4, 0.15, 0.3, 0, 3.25, 0.2, bone, body);
      [-0.15, 0.15].forEach(x => sph(0.08, sick, body, x, 3.65, 0.38));
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4), crownM); c.position.set(Math.cos(a) * 0.38, 4.1, Math.sin(a) * 0.38); body.add(c); }
      [-1, 1].forEach(sd => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 5), bone); a.position.set(sd * 0.8, 2.6, 0.2); a.rotation.z = sd * 0.7; body.add(a); });
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 5), bone); staff.position.set(1.4, 2.0, 0.3); body.add(staff);
      sph(0.28, sick, body, 1.4, 4.2, 0.3);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 24), sick); halo.position.y = 4.4; halo.rotation.x = Math.PI / 2; body.add(halo);
      return { g, body, halo };
    }
  };
  function addWorldCreep(type, world, ai, o) {
    const parts = WORLD_BUILD[type]();
    parts.g.visible = false; scene.add(parts.g); tag(parts.g, 2);
    const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    const c = Object.assign(parts, { type, realm: world, ai, float: 0, speed: 1, isCreep: true, alive: false, respawn: 3 + creeps.length * 0.25, pos: parts.g.position, radius: 0.6, hitY: 0.7, markY: 1.8,
      hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
      wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
      ancient: false, camp: null, age: 0 }, o);
    creeps.push(c); return c;
  }
  [['veyra', 'skitter', 'melee', 11], ['veyra', 'spore', 'ranged', 6], ['neon', 'runner', 'melee', 9], ['neon', 'drone', 'ranged', 7],
   ['ash', 'shambler', 'melee', 15], ['ash', 'bloater', 'ranged', 5]].forEach(([w, t, ai, n, o]) => { for (let k = 0; k < n; k++) addWorldCreep(t, w, ai, o); });
  [['veyra', 'matron', 0.8], ['neon', 'halvane', 0.9], ['ash', 'rot', 0.3]].forEach(([w, t, hue]) => addWorldCreep(t, w, 'godling', { storyBoss: w, camp: WORLDS[w].boss.clone(), radius: 1.7, hitY: 2.2, markY: 5.4, godName: CREEP_NAME[t], godHue: hue, respawn: 2 }));
  function worldSpot(c) {
    const W = WORLDS[c.realm];
    for (let i = 0; i < 50; i++) {
      const x = -64 + Math.random() * 128, z = -64 + Math.random() * 128;
      if (W.ground(x, z) !== 0) continue;
      if (Math.hypot(x - W.spawn.x, z - W.spawn.z) < 16 || Math.hypot(x - W.gate.x, z - W.gate.z) < 10) continue;
      if (G.world === c.realm && Math.hypot(x - player.position.x, z - player.position.z) < 16) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }
  const spawnOf = w => w === 'moat' ? SPAWN : WORLDS[w].spawn;
  const storyBossOf = w => creeps.find(c => c.storyBoss === w);
  const storyBossEngaged = () => creeps.some(c => c.storyBoss && c.alive && c.realm === realmKey() && flatDist(c.pos, player.position) < 30);
  function calmStoryBoss(w) {
    const c = storyBossOf(w); if (!c || !c.alive) return;
    c.hp = c.max; c.pos.copy(c.camp); c.atk = null; c.tele.hide(); c.cool = 2;
  }
