  // ---------- Veyra bestiary: more creeps, nests and new types (Agent: veyra) ----------
  // Veyra used to hold 17 creeps scattered at random. Now it holds 43, grouped into six hive nests (three of them beside the
  // Lumen Seeds), plus a pool of brood hatchlings the Brood Dams raise. Three new kinds join the Skitterlings and Spore Drifters:
  //   Loam Lurker (vlurker)  hides underground as a moving dirt ripple, then bursts out under the hero through a telegraphed circle
  //   Gloamveil   (vgloam)   a drifting jelly whose pulse dazes (slows) and dims the hero's view unless they are dodged
  //   Brood Dam   (vdam)     a nest-mother that hatches Skitterlings and rallies her nest; kill her first
  Object.assign(CREEP_NAME, { vlurker: 'Loam Lurker', vgloam: 'Gloamveil', vdam: 'Brood Dam', vhatch: 'Brood Hatchling' });
  Object.assign(CREEP_BASE, { vlurker: 54, vgloam: 30, vdam: 170, vhatch: 20 });
  Object.assign(CREEP_XP, { vlurker: 30, vgloam: 26, vdam: 70, vhatch: 5 });
  Object.assign(CREEP_BAR_H, { vlurker: 1.3, vgloam: 2.5, vdam: 3.0, vhatch: 0.9 });

  const vyW = WORLDS.veyra, vyIn = () => G.world === 'veyra';
  const vyRnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Models ----------
  Object.assign(WORLD_BUILD, {
    // Loam Lurker: a squat digger of blocky plates with two shovel claws. The dirt ripple it leaves while buried is a separate object.
    vlurker() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const mat = lam(0x6a4a7a), plate = lam(0x3a2a4a), claw = lam(0xd8c8a0), eye = bas(0xffe86a);
      box(0.9, 0.55, 1.2, 0, 0.5, 0, mat, body);
      box(0.7, 0.14, 0.9, 0, 0.84, -0.05, plate, body);
      for (let i = 0; i < 3; i++) box(0.5 - i * 0.08, 0.16, 0.14, 0, 0.98, -0.35 + i * 0.3, plate, body);
      box(0.5, 0.4, 0.5, 0, 0.5, 0.78, mat, body);
      box(0.22, 0.2, 0.3, 0, 0.42, 1.12, plate, body);
      [-0.13, 0.13].forEach(x => box(0.07, 0.07, 0.07, x, 0.62, 1.04, eye, body));
      const legs = [];
      [-1, 1].forEach(sd => {
        box(0.2, 0.45, 0.2, sd * 0.55, 0.45, 0.5, mat, body);
        for (let k = 0; k < 3; k++) { const cl = box(0.07, 0.07, 0.5, sd * (0.5 + (k - 1) * 0.13), 0.12, 0.88, claw, body); cl.rotation.x = 0.3; }
        legs.push(box(0.18, 0.3, 0.18, sd * 0.35, 0.18, -0.4, mat, body));
      });
      const ripple = new THREE.Group(); ripple.visible = false; scene.add(ripple);
      const ringM = bas(0x9a6aff, { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
      const r1 = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 20).rotateX(-Math.PI / 2), ringM); r1.position.y = 0.05; ripple.add(r1);
      const r2 = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.45, 20).rotateX(-Math.PI / 2), ringM); r2.position.y = 0.05; ripple.add(r2);
      const dirt = [], dirtM = lam(0x4a3a5a);
      for (let i = 0; i < 5; i++) dirt.push(box(0.28, 0.28, 0.28, 0, 0.15, 0, dirtM, ripple));
      ripple.userData = { r1, r2, dirt };
      tag(ripple, 2);
      return { g, body, mat, legs, ripple };
    },
    // Gloamveil: a glassy bell on a block-stalk, six hanging threads, one bright core
    vgloam() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const bellM = bas(0x7affe0, { transparent: true, opacity: 0.6, depthWrite: false }), stem = lam(0x4a8aa0), coreM = bas(0xf0ffff);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6, 0, TAU, 0, Math.PI / 2), bellM); bell.scale.set(1, 0.8, 1); bell.position.y = 0.1; body.add(bell);
      box(0.9, 0.1, 0.9, 0, 0.08, 0, stem, body);
      const core = sph(0.22, coreM, body, 0, 0.28, 0);
      const th = bas(0x4affc0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; box(0.05, 0.8 + (i % 2) * 0.35, 0.05, Math.cos(a) * 0.4, -0.35 - (i % 2) * 0.15, Math.sin(a) * 0.4, th, body); }
      [-0.16, 0.16].forEach(x => box(0.08, 0.08, 0.05, x, 0.22, 0.5, bas(0x1a3a4a), body));
      return { g, body, core, bell, bellM };
    },
    // Brood Dam: an armoured nest-mother with a huge glowing egg-sac slung behind her
    vdam() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const shell = lam(0x8a3a6a), dark = lam(0x4a1a3a), sacM = bas(0xff9ac8, { transparent: true, opacity: 0.6, depthWrite: false }), egg = bas(0xffe08a), eye = bas(0xe8ff6a), horn = lam(0xe8d8c0);
      const sac = new THREE.Group(); sac.position.set(0, 1.1, -1.3); body.add(sac);
      const sb = sph(1.1, sacM, sac, 0, 0, 0); sb.scale.set(1, 0.9, 1.3);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; sph(0.2, egg, sac, Math.cos(a) * 0.55, Math.sin(a * 2) * 0.4, Math.sin(a) * 0.8); }
      sph(0.3, egg, sac, 0, 0, 0);
      box(1.1, 0.8, 1.2, 0, 1.1, 0.1, shell, body);
      box(1.3, 0.2, 1.4, 0, 1.6, 0.1, dark, body);
      box(0.6, 0.55, 0.6, 0, 1.3, 0.95, shell, body);
      [-0.16, 0.16].forEach(x => box(0.1, 0.1, 0.06, x, 1.42, 1.26, eye, body));
      [-1, 1].forEach(sd => { const m = box(0.1, 0.1, 0.6, sd * 0.22, 1.05, 1.3, horn, body); m.rotation.y = sd * 0.35; const h = box(0.12, 0.7, 0.12, sd * 0.3, 1.9, 0.9, horn, body); h.rotation.z = -sd * 0.35; });
      const legs = [];
      for (let i = 0; i < 6; i++) { const sd = i < 3 ? -1 : 1, row = i % 3; const l = box(0.9, 0.14, 0.14, sd * 0.95, 0.55, -0.35 + row * 0.55, dark, body); l.rotation.z = sd * -0.55; legs.push(l); }
      return { g, body, mat: shell, legs, sac };
    },
    vhatch() {
      const p = WORLD_BUILD.skitter();
      p.g.traverse(m => { if (m.material && m.material.color && m.material.color.getHex() === 0x2fb0a0) m.material.color.setHex(0xe0b060); });
      p.mat = p.body.children[0].material;
      return p;
    }
  });

  // ---------- Nest layout ----------
  // [target x, z, dam, skitter, spore, lurker, gloam]. 'seed' nests sit about 11 m from a Lumen Seed so collecting it means a fight.
  const VY_NESTS = [
    { name: 'Seed Nest West', at: [-32, 26], mix: [1, 3, 1, 1, 0] },
    { name: 'Seed Nest East', at: [36, 18], mix: [1, 3, 1, 0, 1] },
    { name: 'Seed Nest North', at: [18, -42], mix: [1, 3, 1, 1, 0] },
    { name: 'Hollow Nest', at: [-30, -30], mix: [0, 4, 2, 1, 1] },
    { name: 'Ridge Nest', at: [40, -32], mix: [0, 4, 1, 2, 1] },
    { name: 'Crossroads Nest', at: [4, 26], mix: [0, 4, 2, 1, 2] }
  ];
  const vyNests = [];
  const vyKeyClear = (x, z, r) => !vyW.keys.some((p, i) => Math.hypot(p.x - x, p.z - z) < (i < 2 ? 22 : i === 2 ? 10 : 7) + r);
  function vyFindNest(tx, tz) {
    for (let rad = 0; rad <= 16; rad += 2) for (let k = 0; k < 12; k++) {
      const a = k * 2.399, x = tx + Math.cos(a) * rad, z = tz + Math.sin(a) * rad;
      if (!vyKeyClear(x, z, 0) || vyNests.some(n => Math.hypot(n.pos.x - x, n.pos.z - z) < 20)) continue;
      let ok = vyW.ground(x, z) === 0;
      for (let j = 0; ok && j < 12; j++) { const b = j / 12 * TAU; if (vyW.ground(x + Math.cos(b) * 3.6, z + Math.sin(b) * 3.6) !== 0) ok = false; }
      if (ok) return [x, z];
    }
    return [tx, tz];
  }
  const vySacM = bas(0xff6ac0, { transparent: true, opacity: 0.6, depthWrite: false }), vyYolkM = bas(0xffe08a), vyMoundM = lam(0x3a1f4a), vySpikeM = lam(0x5a2a6a), vyVeinM = bas(0xc86aff);
  VY_NESTS.forEach(spec => {
    const [x, z] = vyFindNest(spec.at[0], spec.at[1]);
    const g = new THREE.Group(); g.position.set(x, 0, z); vyW.group.add(g);
    const mound = sph(2.3, vyMoundM, g, 0, 0, 0); mound.scale.set(1, 0.36, 1);
    const sacs = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, r = i === 0 ? 0 : 1.5 + (i % 2) * 0.4, s = 0.55 + (i % 3) * 0.2 + (i === 0 ? 0.7 : 0);
      const sg = new THREE.Group(); sg.position.set(Math.cos(a) * r, 0.5 + s * 0.4, Math.sin(a) * r); g.add(sg);
      const sac = sph(s, vySacM, sg, 0, 0, 0); sac.scale.y = 1.3; sph(s * 0.35, vyYolkM, sg, 0, 0, 0);
      sacs.push({ sg, ph: i * 1.1, s });
    }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4 + (i % 3) * 0.5, 4), vySpikeM); sp.position.set(Math.cos(a) * 2.3, 0.6, Math.sin(a) * 2.3); sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); g.add(sp); }
    const vein = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.65, 24).rotateX(-Math.PI / 2), vyVeinM); vein.position.y = 0.04; g.add(vein);
    tag(g, 2);
    vyW.circles.push([x, z, 2.7]);
    // Ground-checked ring of places for the nest's creeps to rise (static scenery, so check once)
    const slots = [];
    for (let k = 0; k < 40 && slots.length < 16; k++) {
      const a = k * 2.399, r = 3.6 + (k % 4) * 1.0, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
      if (vyW.ground(sx, sz) === 0) slots.push([sx, sz]);
    }
    vyNests.push({ name: spec.name, pos: new THREE.Vector3(x, 0, z), g, sacs, slots, pulse: 0, dam: null, mix: spec.mix });
  });

  // ---------- Spawning: creeps rise from their nest, and nests keep restocking ----------
  function vyNestSpawn(c) {
    const n = c.nest, s = n.slots[Math.floor(Math.random() * n.slots.length)] || [n.pos.x + 4, n.pos.z];
    const x = s[0] + vyRnd(-0.5, 0.5), z = s[1] + vyRnd(-0.5, 0.5);
    // Never rise on top of a hero standing at the nest: wait and try again
    if (vyIn() && flatDist(player.position, { x, z }) < 12) { c.alive = false; c.g.visible = false; c.bar.hidden = true; c.respawn = vyRnd(2, 5); return; }
    c.pos.set(x, 0, z); c.home.copy(n.pos); c.wander.copy(c.pos);
    n.pulse = 1; burst(x, 0.4, z, 8, 3);
    if (c.vlurk) vyBury(c, true);
  }
  function vyNestRespawn(c) {
    const n = c.nest, damUp = n.dam && n.dam.alive;
    return vyRnd(13, 20) * (damUp ? 0.7 : n.dam ? 1.5 : 1);
  }
  function vyHatchSpawn(c) {
    const at = c.hatchAt; c.hatchAt = null;
    if (!at) { c.alive = false; c.g.visible = false; c.bar.hidden = true; c.respawn = Infinity; return; }
    c.pos.copy(at); c.home.copy(at); c.wander.copy(at); c.g.scale.setScalar(0.75); c.radius = 0.5;
    burst(at.x, 0.4, at.z, 10, 3);
  }

  // ---------- Loam Lurker ----------
  function vyBury(c, silent) {
    c.vs = 'under'; c.vcd = vyRnd(1.2, 2.6); c.atk = null; c.tele.hide(); c.bar.hidden = true; c.vup = 0;
    if (!silent) burst(c.pos.x, 0.3, c.pos.z, 14, 4);
    c.realm = 'lair'; c.g.visible = false; // out of reach of the hero's lock-on and attacks while it is under
    c.ripple.visible = vyIn(); c.ripple.position.set(c.pos.x, 0, c.pos.z);
  }
  function vyEmerge(c) {
    c.tele.hide(); c.vs = 'up'; c.vup = 0; c.atk = null; c.ripple.visible = false;
    if (groundAt(c.vat.x, c.vat.z) <= 0.5) { c.pos.x = c.vat.x; c.pos.z = c.vat.z; }
    c.pos.y = 0; c.realm = 'veyra'; c.g.visible = true; c.stun = 0.9; c.g.rotation.y = c.facing;
    burst(c.pos.x, 0.5, c.pos.z, 26, 6); G.shake = Math.max(G.shake, 0.3); sfx('boom');
    if (flatDist(player.position, c.vat) < 2.7 && Math.abs(player.position.y - c.pos.y) < 1.8) hitPlayer(15, c.vat, 9, false, c);
    floatText('EXPOSED', c.pos.clone().add(new THREE.Vector3(0, 1.8, 0)), 'word', '#ffd36a');
  }
  // Under the ground: runs from WORLD_TICKS because a buried lurker sits in the 'lair' realm and updateCreep skips it
  function vyLurkUnder(c, dt) {
    const pp = player.position, d = flatDist(c.pos, pp), h = hasteOf(c), t = uTime.value;
    c.pos.y = 0;
    if (c.vs === 'under') {
      c.vcd -= dt;
      const hunting = d < 20 && G.state !== 'dead' && G.state !== 'won' && !heroAloft();
      if (hunting) {
        c.facing = yawTo(c.pos, pp);
        if (d > 1.8) creepMove(c, fwdOf(c.facing), 5 * h * dt);
        if (c.vcd <= 0 && d < 3.4) { c.vs = 'tele'; c.vt = 0; c.vat = new THREE.Vector3(pp.x, 0, pp.z); sfx('swoosh'); }
      } else {
        if (flatDist(c.pos, c.home) > 22) c.wander.copy(c.home);
        creepWander(c, dt, 1.8);
      }
    } else if (c.vs === 'tele') {
      c.vt += dt;
      if (c.vt < 0.45) { c.vat.x = pp.x; c.vat.z = pp.z; }
      c.tele.circle(c.vat.x, 0, c.vat.z, 2.6, c.vt / 1.0);
      const k = Math.min(1, dt * 8); c.pos.x += (c.vat.x - c.pos.x) * k; c.pos.z += (c.vat.z - c.pos.z) * k;
      if (c.vt >= 1.0) { vyEmerge(c); return; }
    }
    const rp = c.ripple, U = rp.userData, shake = c.vs === 'tele' ? 1 : 0;
    rp.visible = true; rp.position.set(c.pos.x, 0, c.pos.z);
    const ph = (t * 1.6) % 1;
    U.r1.scale.setScalar(0.7 + ph * 0.9 + shake * 0.3); U.r2.scale.setScalar(0.7 + ((ph + 0.5) % 1) * 0.9 + shake * 0.3);
    U.dirt.forEach((m, i) => { const a = i / 5 * TAU + t * (shake ? 9 : 2.5), r = 0.55 + 0.15 * Math.sin(t * 6 + i); m.position.set(Math.cos(a) * r, 0.12 + Math.abs(Math.sin(t * 8 + i * 2)) * (shake ? 0.7 : 0.22), Math.sin(a) * r); m.rotation.y = a; });
  }
  // On the surface: a plain biter that dives again after a few seconds
  CREEP_AI_FN.vlurk = (c, dt, d, groundY, aggro) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY; c.vup = (c.vup || 0) + dt;
    if (c.atk) {
      const A = c.atk; A.t += dt * h;
      const front = c.pos.clone().addScaledVector(fwdOf(c.facing), 1.0);
      if (A.stage === 'wind') {
        c.tele.circle(front.x, c.pos.y, front.z, 1.3, A.t / 0.5);
        if (A.t >= 0.5) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); burst(front.x, c.pos.y + 0.3, front.z, 8, 4);
          if (flatDist(player.position, front) < 1.7 && Math.abs(player.position.y - c.pos.y) < 1.5) hitPlayer(9, front, 5, true, c);
        }
      } else if (A.t >= 0.5) { c.atk = null; c.cool = 1.0 + Math.random() * 0.5; }
    } else if (c.stun <= 0) {
      if (c.vup > 6.5 || (!aggro && c.vup > 1.5)) { vyBury(c); return; }
      if (aggro) {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -6 * dt, 6 * dt);
        if (d > 1.7) creepMove(c, fwdOf(c.facing), 4.2 * h * dt);
        c.cool -= dt * h;
        if (d < 2.1 && c.cool <= 0) c.atk = { t: 0, stage: 'wind' };
      } else creepWander(c, dt, 1.2);
    }
    const moving = !c.atk && c.stun <= 0;
    c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 15 + i * 2) * 0.5 : 0; });
    if (Math.abs(player.position.y - c.pos.y) < 1.5) pushPlayerOut(c, 0.9);
  };

  // ---------- Gloamveil ----------
  let vyDim = 0, vyDimLvl = 0;
  const vyDimEl = document.createElement('div');
  Object.assign(vyDimEl.style, { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', pointerEvents: 'none', opacity: '0', transition: 'opacity .12s linear',
    background: 'radial-gradient(ellipse at center, rgba(40,10,70,.35) 0%, rgba(14,4,32,.93) 62%)' });
  (document.getElementById('stage') || document.body).appendChild(vyDimEl); // inside #stage so the HUD still paints above it
  CREEP_AI_FN.vgloam = (c, dt, d, groundY, aggro) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY + 1.5 + Math.sin(tt * 1.7 + c.home.x) * 0.25;
    let k = 0;
    if (c.atk) {
      const A = c.atk; A.t += dt * h; k = Math.min(1, A.t / 1.25);
      c.tele.circle(c.pos.x, groundY, c.pos.z, 6.2, k);
      if (A.t >= 1.25) {
        c.tele.hide(); c.atk = null; c.cool = vyRnd(4.6, 6.6); k = 0;
        sfx('swoosh'); burst(c.pos.x, c.pos.y, c.pos.z, 18, 6);
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; fwColor.setHSL(0.45 + Math.random() * 0.12, 0.8, 0.8); fwParticle(c.pos.x, c.pos.y, c.pos.z, Math.cos(a) * 6, 0.3, Math.sin(a) * 6, fwColor, 0.55, true); }
        if (G.state !== 'dead' && flatDist(player.position, c.pos) < 6.2 && Math.abs(player.position.y - groundY) < 3.2) {
          if (hitPlayer(6, c.pos, 2, false, c)) { chillHero(2.8, 0.4, 'DAZED'); vyDim = Math.max(vyDim, 3.4); }
        }
      }
    } else if (c.stun <= 0) {
      if (aggro) {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -3 * dt, 3 * dt);
        const away = new THREE.Vector3(c.pos.x - player.position.x, 0, c.pos.z - player.position.z).normalize();
        if (d < 4.5) creepMove(c, away, 2.2 * h * dt); else if (d > 7.5) creepMove(c, away.negate(), 2.2 * h * dt);
        c.cool -= dt * h;
        if (c.cool <= 0 && d < 10) c.atk = { t: 0 };
      } else creepWander(c, dt, 0.9);
    }
    const sw = 1 + 0.12 * Math.sin(tt * 3 + c.home.z) + k * 0.5;
    c.bell.scale.set(sw, 0.8 * (2 - sw * 0.7), sw);
    c.core.scale.setScalar(1 + k * 1.6 + c.flash * 0.6);
    c.bellM.opacity = 0.5 + k * 0.4;
  };

  // ---------- Brood Dam ----------
  function vyHatch(c) {
    let n = 0;
    (c.pool || []).forEach(p => {
      if (n >= 2 || p.alive || p.hatchAt) return;
      const a = Math.random() * TAU;
      p.hatchAt = new THREE.Vector3(c.pos.x + Math.cos(a) * 2.2, 0, c.pos.z + Math.sin(a) * 2.2);
      if (groundAt(p.hatchAt.x, p.hatchAt.z) > 0.5) p.hatchAt.copy(c.pos);
      p.respawn = 0; n++;
    });
    floatText(n ? 'HATCHING' : 'brood full', c.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ffb0d8');
    if (n) { c.nest.pulse = 1.5; sfx('boom'); G.shake = Math.max(G.shake, 0.15); }
  }
  CREEP_AI_FN.vdam = (c, dt, d, groundY, aggro) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY;
    let swell = 0.04 * Math.sin(tt * 2);
    if (c.atk) {
      const A = c.atk; A.t += dt * h;
      if (A.stage === 'hatch') {
        swell = 0.4 * Math.min(1, A.t / 1.6);
        c.tele.circle(c.pos.x, c.pos.y, c.pos.z, 3.2, A.t / 1.6);
        if (A.t >= 1.6) { c.tele.hide(); vyHatch(c); A.stage = 'rec'; A.t = 0; }
      } else if (A.stage === 'slam') {
        c.tele.circle(c.pos.x, c.pos.y, c.pos.z, 3.0, A.t / 0.9);
        if (A.t >= 0.9) {
          c.tele.hide(); A.stage = 'rec'; A.t = 0; burst(c.pos.x, 0.4, c.pos.z, 22, 6); G.shake = Math.max(G.shake, 0.25); sfx('boom');
          if (flatDist(player.position, c.pos) < 3.2 && Math.abs(player.position.y - c.pos.y) < 1.8) hitPlayer(16, c.pos, 10, true, c);
        }
      } else if (A.t >= 0.8) { c.atk = null; c.cool = vyRnd(7, 9); }
    } else if (c.stun <= 0) {
      if (aggro) {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -2.5 * dt, 2.5 * dt);
        const toHome = flatDist(c.pos, c.home);
        const away = new THREE.Vector3(c.pos.x - player.position.x, 0, c.pos.z - player.position.z).normalize();
        if (d < 5 && toHome < 10) creepMove(c, away, 2.2 * h * dt); else if (d > 9.5 && toHome < 8) creepMove(c, away.negate(), 2.2 * h * dt);
        c.cool -= dt * h; c.slamCd = (c.slamCd || 0) - dt;
        if (d < 3.4 && c.slamCd <= 0) { c.atk = { t: 0, stage: 'slam' }; c.slamCd = 4; }
        else if (c.cool <= 0) {
          if ((c.pool || []).some(p => !p.alive && !p.hatchAt)) c.atk = { t: 0, stage: 'hatch' }; else c.cool = 1.5;
        }
      } else creepWander(c, dt, 0.9);
    }
    c.sac.scale.setScalar(1 + swell);
    const moving = !c.atk && c.stun <= 0;
    c.legs.forEach((l, i) => { l.rotation.y = moving ? Math.sin(tt * 6 + i * 1.7) * 0.25 : 0; });
    pushPlayerOut(c, 1.5);
  };

  // ---------- Population ----------
  // Slot list: [nest, type] for every creep that lives at a nest. Existing Skitterlings and Spore Drifters fill their slots first.
  const vyPool = { skitter: creeps.filter(c => c.realm === 'veyra' && !c.storyBoss && c.type === 'skitter'), spore: creeps.filter(c => c.realm === 'veyra' && !c.storyBoss && c.type === 'spore') };
  const vyAI = { skitter: 'melee', spore: 'ranged', vlurker: 'vlurk', vgloam: 'vgloam', vdam: 'vdam' };
  vyNests.forEach(n => {
    [['vdam', n.mix[0]], ['skitter', n.mix[1]], ['spore', n.mix[2]], ['vlurker', n.mix[3]], ['vgloam', n.mix[4]]].forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const c = (vyPool[type] && vyPool[type].shift()) || addWorldCreep(type, 'veyra', vyAI[type]);
        c.nest = n; c.onSpawn = vyNestSpawn; c.respawnAfter = vyNestRespawn; c.respawn = vyRnd(1, 6);
        if (type === 'vlurker') { c.vlurk = true; c.vs = 'under'; }
        if (type === 'vgloam') { c.radius = 0.7; }
        if (type === 'vdam') {
          n.dam = c; c.radius = 1.0; c.hitY = 1.1; c.markY = 3.0; c.pool = [];
          c.respawnAfter = () => vyRnd(75, 95);
          c.onSpawn = d => { vyNestSpawn(d); if (d.alive) { d.g.scale.setScalar(1.5); d.cool = vyRnd(3, 5); } };
          c.onDeath = d => {
            let gone = 0;
            d.pool.forEach(p => { if (p.alive) { p.alive = false; p.g.visible = false; p.tele.hide(); p.atk = null; p.bar.hidden = true; p.respawn = Infinity; burst(p.pos.x, 0.4, p.pos.z, 10, 4); gone++; } });
            floatText(gone ? 'The brood scatters' : 'The Dam falls', d.pos.clone().add(new THREE.Vector3(0, 3.4, 0)), 'word', '#ffb0d8');
            n.pulse = 0;
          };
        }
      }
    });
  });
  // Three hatchlings per Dam wait in a pool; they never respawn on their own, only when the Dam hatches them
  const vyHatchlings = [];
  vyNests.forEach(n => { if (!n.dam) return; for (let i = 0; i < 3; i++) {
    const p = addWorldCreep('vhatch', 'veyra', 'melee');
    p.vhatch = true; p.nest = n; p.mother = n.dam; p.onSpawn = vyHatchSpawn; p.respawnAfter = () => Infinity; p.respawn = Infinity; p.hatchAt = null;
    n.dam.pool.push(p); vyHatchlings.push(p);
  } });
  const vyLurkers = creeps.filter(c => c.vlurk), vyDams = vyNests.filter(n => n.dam).map(n => n.dam);

  // ---------- Per-frame world logic ----------
  let vyRallyMsg = 0;
  WORLD_TICKS.push(dt => {
    const tt = uTime.value;
    // Gloamveil's dimming: fades in quickly, lingers, and clears off Veyra or on death
    vyDim = vyIn() && G.state !== 'dead' ? Math.max(0, vyDim - dt) : 0;
    vyDimLvl += ((vyDim > 0 ? Math.min(1, vyDim / 0.9) : 0) - vyDimLvl) * Math.min(1, dt * 7);
    const op = (Math.round(vyDimLvl * 100) / 100).toString(); if (vyDimEl.style.opacity !== op) vyDimEl.style.opacity = op;
    // Lurkers: restore the realm of any that fell back to the lair while dead, tidy the ripple, and drive the buried ones
    vyLurkers.forEach(c => {
      if (!c.alive) { if (c.realm === 'lair') c.realm = 'veyra'; c.ripple.visible = false; return; }
      if (c.realm === 'lair') { if (vyIn()) vyLurkUnder(c, dt); else { c.ripple.visible = false; c.tele.hide(); } }
    });
    // Hatchlings that were reset without a Dam's order go back to sleep
    vyHatchlings.forEach(p => { if (!p.alive && !p.hatchAt) p.respawn = Infinity; });
    if (!vyIn()) return;
    // A living Brood Dam rallies the nest around her: faster and harder-hitting. She is the one to kill first.
    vyRallyMsg -= dt;
    vyDams.forEach(dam => {
      if (!dam.alive || dam.stun > 0) return;
      let any = false;
      creeps.forEach(o => { if (o !== dam && o.alive && o.nest === dam.nest && o.realm === 'veyra' && flatDist(o.pos, dam.pos) < 12) { o.rallyT = Math.max(o.rallyT || 0, 0.4); any = true; } });
      if (any && vyRallyMsg <= 0 && flatDist(dam.pos, player.position) < 16) { vyRallyMsg = 14; floatText('Brood Dam rallies the nest', dam.pos.clone().add(new THREE.Vector3(0, 3.6, 0)), 'word', '#ff8ac8'); }
    });
    // Nest props breathe, and flare when something rises or hatches
    vyNests.forEach(n => {
      n.pulse = Math.max(0, n.pulse - dt * 0.8);
      n.sacs.forEach(s => { const k = 1 + 0.07 * Math.sin(tt * 1.6 + s.ph) + n.pulse * 0.18; s.sg.scale.set(k, k, k); });
    });
  });
