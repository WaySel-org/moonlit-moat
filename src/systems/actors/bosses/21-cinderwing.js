  // ---------- Cinderwing, an original dragon perched on the keep ----------
  const DRAGON_HOME = new THREE.Vector3(0, 19.4, -32.6);
  const dScale = new THREE.MeshLambertMaterial({ color: 0x5a1c1c, flatShading: true, emissive: 0x000000 });
  const dBelly = new THREE.MeshLambertMaterial({ color: 0x8a5a3a, flatShading: true });
  const dWing = new THREE.MeshLambertMaterial({ color: 0x3a1214, side: THREE.DoubleSide, flatShading: true });
  const dGlow = new THREE.MeshBasicMaterial({ color: 0x401000 });
  const dragon = { g: new THREE.Group(), body: new THREE.Group(), neck: new THREE.Group(), head: new THREE.Group(), wings: [], tail: [],
    hp: 400, max: 400, state: 'fly', t: 0, cool: 4, atk: null, flash: 0, radius: 2.6, hitY: 1.6, markY: 4.5, isDragon: true, name: 'Cinderwing', angry: 0, a: 0, fw: 2, respawn: 0 };
  const DRAGON_CENTER = new THREE.Vector3(0, 25, -24);
  (function buildDragon() {
    const D = dragon; D.g.add(D.body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), dScale); torso.scale.set(1.3, 1.0, 2.1); torso.position.y = 0.4; D.body.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), dBelly); belly.scale.set(1.0, 0.7, 1.7); belly.position.set(0, 0.05, 0.25); D.body.add(belly);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), dScale); s.position.set(0, 1.35, 1.2 - i * 0.55); s.rotation.x = -0.3; D.body.add(s); }
    [[-0.9, 1.0], [0.9, 1.0], [-0.9, -1.1], [0.9, -1.1]].forEach(([x, z]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 6), dScale); l.position.set(x, -0.4, z); D.body.add(l);
      for (let c = -1; c <= 1; c++) { const cl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), dBelly); cl.position.set(x + c * 0.12, -0.9, z + 0.25); cl.rotation.x = Math.PI / 2; D.body.add(cl); }
    });
    D.neck.position.set(0, 0.9, 1.7); D.body.add(D.neck);
    for (let i = 0; i < 4; i++) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.45 - i * 0.05, 8, 6), dScale); n.position.set(0, i * 0.45, i * 0.3); D.neck.add(n); }
    D.head.position.set(0, 1.95, 1.3); D.neck.add(D.head);
    box(0.8, 0.6, 1.0, 0, 0, 0, dScale, D.head);
    box(0.6, 0.35, 0.8, 0, -0.1, 0.8, dScale, D.head);
    D.jaw = box(0.55, 0.15, 0.8, 0, -0.35, 0.7, dGlow, D.head);
    [-0.25, 0.25].forEach(x => {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8, 5), dBelly); h.position.set(x, 0.4, -0.4); h.rotation.x = -1.1; D.head.add(h);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), dGlow); e.position.set(x * 1.3, 0.12, 0.42); D.head.add(e);
    });
    const ws = new THREE.Shape();
    ws.moveTo(0, 0); ws.lineTo(4.2, 1.6); ws.lineTo(3.6, 0.2); ws.lineTo(3.9, -0.9); ws.lineTo(2.6, -0.5); ws.lineTo(2.5, -1.6); ws.lineTo(1.3, -0.8); ws.lineTo(0.6, -1.3); ws.lineTo(0, -0.3);
    const wg = new THREE.ShapeGeometry(ws);
    [-1, 1].forEach(side => {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.9, 1.0, 0.6);
      const m = new THREE.Mesh(wg, dWing); m.rotation.x = -Math.PI / 2; m.scale.set(side, 1, 1); pivot.add(m);
      D.body.add(pivot); D.wings.push({ pivot, side });
    });
    for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.4 - i * 0.04, 7, 5), dScale); t.position.set(0, 0.1 - i * 0.35, -2.1 - i * 0.45); D.body.add(t); D.tail.push(t); }
    D.light = new THREE.PointLight(0xff6a2a, 0, 14, 2); D.light.position.set(0, -0.2, 1.2); D.head.add(D.light);
    D.g.position.copy(DRAGON_HOME); D.g.scale.setScalar(1.5); scene.add(D.g);
    D.pos = D.g.position; D.tele = makeTele();
  })();

  const patches = [];
  const fireGeo = new THREE.SphereGeometry(0.45, 8, 6), fireMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  const patchGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const dangerStates = () => G.state === 'interlude' || G.state === 'royal';

  function dragonFlee(word) {
    const D = dragon; if (D.state !== 'fly') return;
    D.state = 'flee'; D.t = 0; if (D.atk && D.atk.m) scene.remove(D.atk.m); D.atk = null; D.tele.hide(); D.light.intensity = 0;
    sfx('roar'); G.shake = 0.6;
    floatText(word, player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ff9a4a');
  }
  function damageDragon(dmg) {
    const D = dragon;
    const out = Math.round(dmg * (0.9 + Math.random() * 0.2) * (P.buffDmg > 0 ? 1.5 : 1));
    if (D.angry <= 0) {
      if (D.hp >= D.max) { D.max = Math.round(400 * tierMult(worldTier())); D.hp = D.max; }
      floatText('Cinderwing is angry!', player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ff9a4a'); sfx('roar');
      D.cool = Math.min(D.cool, 1.2);
    }
    D.angry = 14;
    D.hp = Math.max(0, D.hp - out); D.flash = 1; sfx('hit');
    const at = D.g.position.clone().add(new THREE.Vector3(0, 2, 1.5)); burst(at.x, at.y, at.z, 16, 5);
    floatText(String(out), at, 'big', '#ff9a4a');
    if (D.hp <= 0) { reward(500 * tierMult(worldTier()), 320 * tierMult(worldTier()), player.position.clone().add(new THREE.Vector3(0, 3, 0))); dragonFlee('Cinderwing flees'); D.respawn = 180; }
  }
  function resetDragon(awake) {
    const D = dragon; if (D.atk && D.atk.m) scene.remove(D.atk.m);
    Object.assign(D, { max: 400, hp: 400, state: 'fly', t: 0, cool: 4, atk: null, flash: 0, angry: 0, fw: 2 });
    D.g.visible = true; D.tele.hide(); D.light.intensity = 0; D.body.rotation.set(0, 0, 0);
    patches.forEach(p => { scene.remove(p.m); p.m.material.dispose(); }); patches.length = 0;
  }

  function startDragonAttack() {
    const D = dragon, y = P.y;
    if (Math.random() < 0.6) {
      D.atk = { name: 'fireball', t: 0, wind: 0.5, at: new THREE.Vector3(player.position.x, y, player.position.z), fired: false };
    } else {
      const dir = new THREE.Vector3(player.position.x - D.g.position.x, 0, player.position.z - D.g.position.z).normalize();
      const origin = new THREE.Vector3(player.position.x, y, player.position.z).addScaledVector(dir, -4.5);
      D.atk = { name: 'breath', t: 0, wind: 1.1, burn: 0.7, origin, facing: Math.atan2(dir.x, dir.z), y, hit: false };
    }
  }
  function endDragonAttack() {
    const D = dragon; D.atk = null; D.tele.hide(); D.light.intensity = 0;
    D.cool = 2.6 + Math.random() * 1.6;
  }
  function updateDragonAttack(dt) {
    const D = dragon, A = D.atk; A.t += dt;
    const glowK = Math.min(1, A.t / A.wind);
    dGlow.color.setRGB(0.6 + 0.4 * glowK, 0.25 + 0.4 * glowK, 0.05); D.light.intensity = 2.5 * glowK;
    if (A.name === 'fireball') {
      if (!A.fired) {
        D.neck.rotation.x = 0.35 - 0.4 * glowK;
        if (A.t >= A.wind) {
          A.fired = true; A.t = 0; A.dur = 1.3;
          A.from = D.jaw.getWorldPosition(new THREE.Vector3());
          A.m = new THREE.Mesh(fireGeo, fireMat); A.m.position.copy(A.from); scene.add(A.m); sfx('cast');
        }
      } else {
        const k = Math.min(1, A.t / A.dur);
        A.m.position.lerpVectors(A.from, A.at, k); A.m.position.y += Math.sin(k * Math.PI) * 4;
        if (Math.random() < 0.8) burst(A.m.position.x, A.m.position.y, A.m.position.z, 1, 1.5);
        D.tele.circle(A.at.x, A.at.y, A.at.z, 2.2, k);
        if (k >= 1) {
          scene.remove(A.m); A.m = null; sfx('boom'); G.shake = Math.max(G.shake, 0.5);
          burst(A.at.x, A.at.y + 0.3, A.at.z, 36, 8);
          if (flatDist(player.position, A.at) < 2.4 && Math.abs(player.position.y - A.at.y) < 1.5) hitPlayer(18, A.at, 7, false);
          addPatch(A.at.x, A.at.y, A.at.z, 1.9);
          endDragonAttack();
        }
      }
    } else if (A.name === 'breath') {
      if (A.t < A.wind) {
        D.tele.lane(A.origin, A.facing, 9, 2.6, A.t / A.wind, A.y);
        D.neck.rotation.x = 0.35 - 0.3 * glowK;
      } else {
        D.tele.hide();
        const f = fwdOf(A.facing);
        for (let i = 0; i < 4; i++) { const s = Math.random() * 9; burst(A.origin.x + f.x * s + (Math.random() - 0.5) * 2, A.y + 0.4, A.origin.z + f.z * s + (Math.random() - 0.5) * 2, 2, 4); }
        if (!A.hit) {
          A.hit = true; sfx('boom'); G.shake = Math.max(G.shake, 0.4);
          const rx = player.position.x - A.origin.x, rz = player.position.z - A.origin.z;
          const along = rx * f.x + rz * f.z, perp = Math.abs(rx * f.z - rz * f.x);
          if (along > -0.3 && along < 9.3 && perp < 1.5 && Math.abs(player.position.y - A.y) < 1.5) hitPlayer(22, A.origin.clone().addScaledVector(f, along), 6, false);
          for (let s = 1.5; s < 9; s += 3) addPatch(A.origin.x + f.x * s, A.y, A.origin.z + f.z * s, 1.2);
        }
        if (A.t - A.wind >= A.burn) endDragonAttack();
      }
    }
  }
  function updateDragon(dt) {
    const D = dragon, tt = uTime.value;
    D.flash = Math.max(0, D.flash - dt * 5); dScale.emissive.setRGB(D.flash * 0.8, D.flash * 0.5, D.flash * 0.3);
    if (D.state === 'flee') {
      D.t += dt; D.g.position.y += dt * (4 + D.t * 6); D.g.position.z -= dt * 10;
      D.wings.forEach(w => { w.pivot.rotation.z = w.side * (0.2 + Math.sin(tt * 10) * 0.6); });
      if (D.t > 4) { D.state = 'gone'; D.g.visible = false; }
      return;
    }
    if (D.state === 'gone') { D.respawn -= dt; if (D.respawn <= 0) resetDragon(); return; }
    // Lazy loops around the castle
    D.a += dt * (D.angry > 0 ? 0.24 : 0.16);
    const R = 34, c = DRAGON_CENTER;
    D.g.position.set(c.x + Math.cos(D.a) * R, c.y + Math.sin(D.a * 2) * 3, c.z + Math.sin(D.a) * R * 0.85);
    D.g.rotation.y = Math.atan2(-Math.sin(D.a) * R, Math.cos(D.a) * R * 0.85);
    D.body.rotation.z = -0.28;
    const flap = Math.sin(tt * 4.2);
    D.wings.forEach(w => { w.pivot.rotation.z = w.side * (0.15 + flap * 0.65); });
    D.body.position.y = -flap * 0.25;
    D.tail.forEach((s, i) => { s.position.x = Math.sin(tt * 1.3 + i * 0.6) * 0.15 * i; });
    if (D.angry > 0) {
      D.angry -= dt;
      D.neck.rotation.y = clamp(angDiff(D.g.rotation.y, yawTo(D.g.position, player.position)), -1.2, 1.2);
      if (!D.atk) {
        D.neck.rotation.x = 0.45;
        dGlow.color.setRGB(0.7 + 0.2 * Math.sin(tt * 6), 0.15, 0.02);
        D.cool -= dt;
        if (D.cool <= 0 && G.state !== 'dead' && G.state !== 'won') startDragonAttack();
      } else updateDragonAttack(dt);
      if (D.angry <= 0) floatText('Cinderwing calms down', player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ffd36a');
    } else {
      if (D.atk) updateDragonAttack(dt);
      D.neck.rotation.y = Math.sin(tt * 0.7) * 0.4; D.neck.rotation.x = 0.1;
      dGlow.color.setHSL((tt * 0.25) % 1, 1, 0.55);
      D.fw -= dt;
      if (D.fw <= 0) { D.fw = 1.6 + Math.random() * 2.0; launchFirework(D.jaw.getWorldPosition(new THREE.Vector3())); }
    }
  }
