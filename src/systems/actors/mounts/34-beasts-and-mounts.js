  // ---------- Mythical beasts: tame one at its sanctuary and ride it ----------
  const BEAST_TYPES = {
    stag: { name: 'Moonstag', level: 2, speed: 1.8, dmg: 34, ride: 1.25 },
    gryphon: { name: 'Gryphon', level: 4, speed: 1.6, dmg: 48, ride: 1.45 },
    drake: { name: 'Ember Drake', level: 5, speed: 1.7, dmg: 52, ride: 1.5 }
  };
  const SANCTUARIES = [{ x: -36, z: 62, type: 'stag' }, { x: 18, z: -64, type: 'stag' }, { x: 72, z: 30, type: 'gryphon' }, { x: -62, z: 22, type: 'drake' }];
  function buildStag() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const fur = new THREE.MeshLambertMaterial({ color: 0xd8e4ea, flatShading: true });
    const glowM = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), fur); torso.scale.set(0.5, 0.55, 1.1); torso.position.y = 1.25; body.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 6), fur); neck.position.set(0, 1.75, 0.85); neck.rotation.x = 0.6; body.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.55), fur); head.position.set(0, 2.15, 1.2); body.add(head);
    [-1, 1].forEach(sd => {
      const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.7, 4), glowM); a1.position.set(sd * 0.15, 2.55, 1.05); a1.rotation.z = -sd * 0.5; body.add(a1);
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.35, 4), glowM); t.position.set(sd * (0.25 + k * 0.08), 2.7 + k * 0.12, 1.0 - k * 0.08); t.rotation.z = -sd * (0.9 - k * 0.2); body.add(t); }
    });
    const legs = [];
    [[-0.25, 0.6], [0.25, 0.6], [-0.25, -0.6], [0.25, -0.6]].forEach(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 1.0, z); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.0, 5), fur); m.position.y = -0.5; l.add(m); body.add(l); legs.push(l); });
    return { g, body, legs, glowM };
  }
  // Ember Drake: an original young dragon, low and four-legged, with folded wings and a glowing throat
  function buildDrake() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const scale = new THREE.MeshLambertMaterial({ color: 0x8a2f22, flatShading: true });
    const belly = new THREE.MeshLambertMaterial({ color: 0xc98a4a, flatShading: true });
    const horn = new THREE.MeshLambertMaterial({ color: 0x2a1a14, flatShading: true });
    const glowM = new THREE.MeshBasicMaterial({ color: 0xff8a3a });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), scale); torso.scale.set(0.6, 0.55, 1.3); torso.position.y = 1.2; body.add(torso);
    const under = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), belly); under.scale.set(0.45, 0.35, 1.1); under.position.set(0, 0.95, 0.1); body.add(under);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), horn); sp.position.set(0, 1.78, 0.9 - i * 0.38); body.add(sp); }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 1.0, 6), scale); neck.position.set(0, 1.75, 1.15); neck.rotation.x = 0.75; body.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.5), scale); head.position.set(0, 2.2, 1.55); body.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.4), scale); snout.position.set(0, 2.12, 1.92); body.add(snout);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.36), glowM); jaw.position.set(0, 2.0, 1.9); body.add(jaw);
    [-1, 1].forEach(sd => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 5), horn); h.position.set(sd * 0.14, 2.45, 1.4); h.rotation.x = -0.9; body.add(h); });
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(2.0, 0.9); ws.lineTo(1.7, 0.1); ws.lineTo(1.9, -0.6); ws.lineTo(1.2, -0.3); ws.lineTo(1.0, -0.9); ws.lineTo(0.4, -0.4); ws.lineTo(0, -0.3);
    const wingGeo = new THREE.ShapeGeometry(ws), wingMat = new THREE.MeshLambertMaterial({ color: 0x5a1c16, side: THREE.DoubleSide, flatShading: true });
    const wings = [];
    [-1, 1].forEach(sd => { const pv = new THREE.Group(); pv.position.set(sd * 0.45, 1.6, 0.4); const w = new THREE.Mesh(wingGeo, wingMat); w.rotation.x = -Math.PI / 2; w.scale.set(sd, 1, 1); pv.add(w); pv.rotation.z = sd * 1.1; body.add(pv); wings.push({ pv, sd }); });
    const legs = [];
    [[-0.32, 0.75], [0.32, 0.75], [-0.32, -0.75], [0.32, -0.75]].forEach(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 0.95, z); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.95, 5), scale); m.position.y = -0.48; l.add(m); body.add(l); legs.push(l); });
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.03, 6, 5), scale); t.position.set(0, 1.0 - i * 0.12, -1.35 - i * 0.35); body.add(t); }
    return { g, body, legs, glowM, wings };
  }
  function buildGryphon() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const hide = new THREE.MeshLambertMaterial({ color: 0xb8925a, flatShading: true });
    const plume = new THREE.MeshLambertMaterial({ color: 0xe8e0d0, flatShading: true });
    const glowM = new THREE.MeshBasicMaterial({ color: 0xffd36a });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hide); torso.scale.set(0.6, 0.6, 1.2); torso.position.y = 1.3; body.add(torso);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), plume); chest.position.set(0, 1.55, 0.8); body.add(chest);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), plume); head.position.set(0, 2.15, 1.15); body.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4).rotateX(Math.PI / 2), glowM); beak.position.set(0, 2.08, 1.5); body.add(beak);
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(1.8, 0.6); ws.lineTo(1.6, -0.2); ws.lineTo(1.2, -0.6); ws.lineTo(0.5, -0.5); ws.lineTo(0, -0.3);
    const wingGeo = new THREE.ShapeGeometry(ws), wingMat = new THREE.MeshLambertMaterial({ color: 0xcfc2a8, side: THREE.DoubleSide, flatShading: true });
    const wings = [];
    [-1, 1].forEach(sd => { const pv = new THREE.Group(); pv.position.set(sd * 0.5, 1.7, 0.3); const w = new THREE.Mesh(wingGeo, wingMat); w.rotation.x = -Math.PI / 2; w.scale.set(sd, 1, 1); pv.add(w); pv.rotation.z = sd * 1.1; body.add(pv); wings.push({ pv, sd }); });
    const legs = [];
    [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]].forEach(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 1.0, z); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.0, 5), hide); m.position.y = -0.5; l.add(m); body.add(l); legs.push(l); });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.0, 4), hide); tail.position.set(0, 1.3, -1.4); tail.rotation.x = -0.9; body.add(tail);
    return { g, body, legs, glowM, wings };
  }
  const beasts = [];
  SANCTUARIES.forEach(sn => {
    // The sanctuary: a glowing ring of standing stones and a pale light beam you can see from afar
    const ringMat = new THREE.MeshBasicMaterial({ color: sn.type === 'stag' ? 0x9fe8ff : sn.type === 'drake' ? 0xff7a3a : 0xffd36a, transparent: true, opacity: 0.55, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 40).rotateX(-Math.PI / 2), ringMat); ring.position.set(sn.x, 0.03, sn.z); scene.add(ring);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; box(0.5, 1.6, 0.5, sn.x + Math.cos(a) * 4.6, 0.8, sn.z + Math.sin(a) * 4.6, stone); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 22, 8, 1, true), new THREE.MeshBasicMaterial({ color: ringMat.color, transparent: true, opacity: 0.1, depthWrite: false }));
    beam.position.set(sn.x, 11, sn.z); scene.add(beam);
    const parts = sn.type === 'stag' ? buildStag() : sn.type === 'drake' ? buildDrake() : buildGryphon();
    parts.g.position.set(sn.x, 0, sn.z); scene.add(parts.g);
    beasts.push(Object.assign(parts, { type: sn.type, home: new THREE.Vector3(sn.x, 0, sn.z), state: 'wild', facing: Math.random() * TAU, wander: new THREE.Vector3(sn.x, 0, sn.z), ringMat }));
  });
  const MOUNT_POWERS = {
    stag: { mp1: { name: 'Lunar Nova', short: 'Nova', kind: 'nova', cd: 6, mana: 25 }, mp2: { name: 'Starbound Charge', short: 'Charge', kind: 'charge', cd: 5, mana: 0 } },
    gryphon: { mp1: { name: 'Gale Wing', short: 'Gale', kind: 'gust', cd: 5, mana: 20 }, mp2: { name: 'Sky Pounce', short: 'Pounce', kind: 'pounce', cd: 7, mana: 0 } },
    drake: { mp1: { name: 'Fire Breath', short: 'Breath', kind: 'breath', cd: 6, mana: 30 }, mp2: { name: 'Inferno Dive', short: 'Dive', kind: 'dive', cd: 8, mana: 20 } }
  };
  function hitArea(range, arc, dmg, poise, knock) {
    liveTargets().forEach(t => {
      if (Math.abs(t.pos.y - player.position.y) > 2.5) return;
      if (flatDist(player.position, t.pos) > range + t.radius) return;
      if (arc < TAU && Math.abs(angDiff(P.facing, yawTo(player.position, t.pos))) > arc / 2) return;
      damageEnemy(t, dmg, poise, true);
      if (knock && t.isCreep && t.alive) creepMove(t, new THREE.Vector3(t.pos.x - player.position.x, 0, t.pos.z - player.position.z).normalize(), knock);
    });
  }
  function startMountPower(slot) {
    const pw = MOUNT_POWERS[P.mount.type][slot], f = fwdOf(P.facing), px = player.position.x, py = player.position.y, pz = player.position.z;
    if (pw.kind === 'pounce' || pw.kind === 'dive') {
      if (!planLeap()) return false;
      P.act = 'leap'; P.actDur = 0.75; P.iframe = 0.8; P.kb.set(0, 0, 0); P.leapKind = pw.kind;
    } else if (pw.kind === 'charge') {
      P.act = 'roll'; P.actDur = 0.6; P.iframe = 0.6; P.rollDir.copy(f); P.chargeDmg = 32 * PR.dmg; P.chargeHits = new Set();
    } else if (pw.kind === 'nova') {
      P.actDur = 0.3;
      hitArea(5.5, TAU, 40 * PR.spell, 25, 2);
      const heal = Math.round(P.max * 0.15); P.hp = Math.min(P.max, P.hp + heal);
      const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.9, depthWrite: false })); m.position.set(px, P.y + 0.06, pz); scene.add(m); fxRings.push({ m, r: 0.6 });
      for (let i = 0; i < 70; i++) { fwColor.setHSL(0.52 + Math.random() * 0.08, 0.8, 0.75); const a = Math.random() * TAU, sp = 4 + Math.random() * 5; fwParticle(px, py + 1, pz, Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp, fwColor, 0.9, true); }
      floatText(`+${heal}`, player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), '', '#4dff6a');
    } else if (pw.kind === 'gust') {
      P.actDur = 0.35;
      hitArea(7, 2.1, 30 * PR.dmg, 45, 4.5);
      spawnSwoosh(true);
      for (let i = 0; i < 50; i++) { const a = P.facing + (Math.random() - 0.5) * 2.1, sp = 8 + Math.random() * 6; fwColor.setHSL(0.12, 0.2, 0.85); fwParticle(px, py + 1.4, pz, Math.sin(a) * sp, Math.random() * 2, Math.cos(a) * sp, fwColor, 0.6, false); }
    } else if (pw.kind === 'breath') {
      P.actDur = 0.55;
      hitArea(8, 1.25, 55 * PR.spell, 20, 0.8);
      for (let d = 2.5; d <= 7; d += 2.2) addPatch(px + f.x * d, P.y, pz + f.z * d, 1.2 + d * 0.08, true);
      for (let i = 0; i < 90; i++) { const a = P.facing + (Math.random() - 0.5) * 1.1, sp = 6 + Math.random() * 7; fwColor.setHSL(0.02 + Math.random() * 0.08, 1, 0.55); fwParticle(px + f.x * 1.6, py + 1.8, pz + f.z * 1.6, Math.sin(a) * sp, -0.5 + Math.random(), Math.cos(a) * sp, fwColor, 0.7, Math.random() < 0.2); }
      G.shake = Math.max(G.shake, 0.3);
    }
    P.mana -= pw.mana; P.cd[slot] = pw.cd; P.combo = 0;
    sfx(pw.kind === 'breath' || pw.kind === 'dive' ? 'boom' : pw.kind === 'nova' ? 'parry' : 'swoosh');
    floatText(pw.name, player.position.clone().add(new THREE.Vector3(0, 3.1, 0)), 'word', '#bff6ff');
    return true;
  }
  function beginTame(b) {
    const bt = BEAST_TYPES[b.type];
    if (PR.level < bt.level) { floatText(`Reach level ${bt.level} to ride the ${bt.name}`, player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#ffd36a'); return; }
    if (P.act === 'dead' || P.act === 'leap' || P.stone > 0) return;
    // Hop straight on, mid-walk or mid-swing: the beast comes to you
    if (P.act === 'roll' || P.act === 'drink' || P.act === 'tame' || P.act === 'hurt') P.act = null;
    b.g.position.x = player.position.x; b.g.position.z = player.position.z;
    mount(b);
  }
  function mount(b) {
    P.mount = b; b.state = 'ridden';
    player.position.x = b.g.position.x; player.position.z = b.g.position.z;
    sfx('parry'); burst(b.g.position.x, 1.5, b.g.position.z, 30, 5);
    const pw = MOUNT_POWERS[b.type];
    floatText(`Riding the ${BEAST_TYPES[b.type].name}: C ${pw.mp1.name}, X ${pw.mp2.name}, Space charge, E dismount`, player.position.clone().add(new THREE.Vector3(0, 3.6, 0)), 'word', '#bff6ff');
  }
  function dismount(silent) {
    const b = P.mount; if (!b) return;
    P.mount = null; b.state = 'wild'; b.wander.copy(b.home);
    b.g.position.set(player.position.x + Math.sin(P.facing + 1.6) * 1.6, Math.max(0, P.y), player.position.z + Math.cos(P.facing + 1.6) * 1.6);
    pBody.position.y = 0; pLegs[0].rotation.z = 0; pLegs[1].rotation.z = 0;
    if (!silent) floatText('dismounted', player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#ffd36a');
  }
  function updateRide(dt, moving) {
    const b = P.mount;
    b.g.position.set(player.position.x, P.act === 'leap' ? P.leapY : P.y, player.position.z); b.g.rotation.y = P.facing;
    // Trample creeps you run through
    if (moving) creeps.forEach(c => {
      if (!c.alive || c.trampleT > uTime.value) return;
      if (flatDist(c.pos, player.position) < 1.8 && Math.abs(c.pos.y - player.position.y) < 2) { c.trampleT = uTime.value + 0.6; damageCreep(c, 14 * PR.dmg, 10, false); }
    });
  }
  function updateBeasts(dt) {
    const tt = uTime.value;
    beasts.forEach((b, i) => {
      b.ringMat.opacity = b.state === 'wild' && flatDist(b.g.position, b.home) < 6 ? 0.4 + 0.2 * Math.sin(tt * 2 + i) : 0.15;
      b.glowM.color.setHSL(b.type === 'stag' ? 0.52 : b.type === 'drake' ? 0.04 : 0.12, 1, 0.65 + 0.12 * Math.sin(tt * 3 + i));
      let moving = false;
      if (b.state === 'ridden') moving = keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') || keys.has('ArrowUp') || keys.has('ArrowDown') || keys.has('ArrowLeft') || keys.has('ArrowRight');
      else {
        if (flatDist(b.g.position, b.wander) < 0.8) b.wander.set(b.home.x + (Math.random() - 0.5) * 8, 0, b.home.z + (Math.random() - 0.5) * 8);
        const want = yawTo(b.g.position, b.wander);
        b.facing += clamp(angDiff(b.facing, want), -1.5 * dt, 1.5 * dt);
        const sp = flatDist(b.g.position, b.home) > 10 ? 3.5 : 0.9;
        const nx = b.g.position.x + Math.sin(b.facing) * sp * dt, nz = b.g.position.z + Math.cos(b.facing) * sp * dt, h = groundAt(nx, nz);
        if (h < 1 && h > -1) { b.g.position.x = nx; b.g.position.z = nz; b.g.position.y = Math.min(0, h); moving = true; } else b.wander.copy(b.home);
        b.g.rotation.y = b.facing;
      }
      const sw = moving ? Math.sin(tt * (b.state === 'ridden' ? 14 : 6)) * 0.6 : 0;
      b.legs.forEach((l, k) => { l.rotation.x = (k % 2 ? sw : -sw) * (k < 2 ? 1 : -1); });
      if (b.wings) b.wings.forEach(w => { w.pv.rotation.z = w.sd * (b.state === 'ridden' && moving ? 0.5 + Math.sin(tt * 10) * 0.4 : 1.1); });
    });
  }
