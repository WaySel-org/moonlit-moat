  // ---------- Vesthra and Nyxara (rooftop fight) ----------
  function makeTele() {
    const c = new THREE.Mesh(teleCircle.geometry, teleMat), cf = new THREE.Mesh(fillCircle.geometry, fillMat);
    const l = new THREE.Mesh(teleLane.geometry, teleMat), lf = new THREE.Mesh(fillLane.geometry, fillMat);
    [c, cf, l, lf].forEach(m => { m.visible = false; m.renderOrder = 2; m.layers.enable(2); scene.add(m); });
    return {
      hide() { c.visible = cf.visible = l.visible = lf.visible = false; },
      circle(x, y, z, r, k) {
        c.visible = cf.visible = true;
        c.position.set(x, y + 0.04, z); c.scale.setScalar(r);
        cf.position.set(x, y + 0.045, z); cf.scale.setScalar(Math.max(0.01, r * clamp(k, 0, 1)));
      },
      lane(o, facing, len, w, k, y) {
        const f = fwdOf(facing), fl = len * clamp(k, 0, 1);
        l.visible = lf.visible = true; l.rotation.y = lf.rotation.y = facing;
        l.position.set(o.x + f.x * len / 2, y + 0.04, o.z + f.z * len / 2); l.scale.set(w, 1, len);
        lf.position.set(o.x + f.x * fl / 2, y + 0.045, o.z + f.z * fl / 2); lf.scale.set(w, 1, Math.max(0.01, fl));
      }
    };
  }

  const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd36a });
  // Vesthra, a gorgon from Greek myth: coiled serpent tail, living snake hair, twin sickle blades.
  function makeGorgon(home) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const scales = new THREE.MeshLambertMaterial({ color: 0x3f7a4a, flatShading: true });
    const robe = new THREE.MeshLambertMaterial({ color: 0x7fae7a, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = i * 0.95, rad = 0.85 - i * 0.07;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.42 - i * 0.035, 8, 6), scales);
      seg.position.set(Math.cos(a) * rad, 0.3 + i * 0.03, Math.sin(a) * rad - 0.25); seg.scale.set(1, 0.7, 1); body.add(seg);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), scales); tip.position.set(0.55, 0.3, 0.45); tip.rotation.z = -1.3; body.add(tip);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.7, 8), scales); waist.position.y = 0.85; body.add(waist);
    box(0.72, 0.8, 0.42, 0, 1.55, 0, robe, body);
    box(0.76, 0.12, 0.46, 0, 1.75, 0, goldMat, body);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), robe); headM.position.y = 2.22; body.add(headM);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8ff5a });
    [-0.09, 0.09].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), eyeMat); e.position.set(x, 2.25, 0.23); body.add(e); });
    const snakes = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU, s = new THREE.Group(); s.position.set(Math.cos(a) * 0.18, 2.38, Math.sin(a) * 0.18 - 0.04);
      s.rotation.set(Math.sin(a) * 0.9 - 0.3, 0, -Math.cos(a) * 0.9);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 5), scales); neck.position.y = 0.25; s.add(neck);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), scales); sh.position.y = 0.52; sh.scale.set(1, 0.8, 1.4); s.add(sh);
      body.add(s); snakes.push({ s, a });
    }
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xc9f2d0 });
    const pivot = new THREE.Group(); pivot.position.set(-0.5, 1.75, 0.1); body.add(pivot);
    const off = new THREE.Group(); off.position.set(0.5, 1.75, 0.1); body.add(off);
    [pivot, off].forEach(p => {
      box(0.06, 0.06, 0.6, 0, 0, 0.35, leatherDark, p);
      const sickle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 4, 12, Math.PI), bladeMat); sickle.position.set(0, 0.25, 0.7); sickle.rotation.y = Math.PI / 2; p.add(sickle);
    });
    return { g, body, pivot, off, robe, eyeMat, snakes, hover: 0 };
  }

  // Nyxara, an original briar sorceress: crown of thorns, vine-wrapped gown, thorn shards circling her.
  function makeEmpress(home) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const robe = new THREE.MeshLambertMaterial({ color: 0x8c1d34, flatShading: true });
    const vine = new THREE.MeshLambertMaterial({ color: 0x2d5a2a, flatShading: true });
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8cfc4 });
    const gown = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.9, 9), robe); gown.position.y = 0.95; body.add(gown);
    for (let i = 0; i < 3; i++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.62 - i * 0.16, 0.04, 4, 14), vine); v.rotation.x = Math.PI / 2 + (i - 1) * 0.2; v.position.y = 0.5 + i * 0.45; body.add(v); }
    box(0.62, 0.6, 0.36, 0, 2.05, 0, robe, body);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), skin); headM.position.y = 2.58; body.add(headM);
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.9, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x1a0d12, side: THREE.DoubleSide })); hair.position.set(0, 2.35, -0.06); body.add(hair);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3, 4), vine); t.position.set(Math.cos(a) * 0.24, 2.84, Math.sin(a) * 0.24); t.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); body.add(t); }
    const shards = [], shardMat = new THREE.MeshBasicMaterial({ color: 0xff4a7a });
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), shardMat); body.add(s); shards.push(s); }
    const pivot = new THREE.Group(); pivot.position.set(-0.5, 2.0, 0.1); body.add(pivot);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6), vine); staff.position.set(0, -0.4, 0.1); pivot.add(staff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a7a })); orb.position.set(0, 0.85, 0.1); pivot.add(orb);
    return { g, body, pivot, orb, robe, shards, hover: 0.3 };
  }

  const leatherDark = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  function makeRoyal(kind, name, home) {
    const parts = kind === 'gorgon' ? makeGorgon(home) : makeEmpress(home);
    parts.g.scale.setScalar(1.15); parts.g.position.copy(home); scene.add(parts.g);
    const max = kind === 'gorgon' ? 440 : 320;
    return Object.assign(parts, { kind, name, home: home.clone(), pos: parts.g.position, radius: 0.85, hitY: 1.6, markY: 3.7,
      hp: max, max, poise: 100, state: 'idle', t: 0, dur: 0, atk: null, cool: 1.2, facing: 0, flash: 0,
      alive: true, active: false, enraged: false, blinkCd: 0, tele: makeTele() });
  }
  const royals = [makeRoyal('gorgon', 'Vesthra', new THREE.Vector3(-2.4, ROOF.y, -27.4)), makeRoyal('empress', 'Nyxara', new THREE.Vector3(2.4, ROOF.y, -27.6))];

  const shots = [];
  const shotGeo = new THREE.ConeGeometry(0.12, 0.5, 5).rotateX(Math.PI / 2), shotMat = new THREE.MeshBasicMaterial({ color: 0xff4a7a });
  function spawnShot(x, y, z, a, speed, owner) {
    const m = new THREE.Mesh(shotGeo, shotMat); m.position.set(x, y, z); m.rotation.y = a; scene.add(m);
    shots.push({ m, v: new THREE.Vector3(Math.sin(a) * speed, 0, Math.cos(a) * speed), t: 0, owner, field: !!(owner && owner.field), y: y - 0.7 });
  }
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.t += dt;
      s.m.position.addScaledVector(s.v, dt);
      s.m.position.y += ((s.field ? s.y : ROOF.y) + 1.2 - s.m.position.y) * Math.min(1, dt * 4);
      if (Math.random() < 0.5) burst(s.m.position.x, s.m.position.y, s.m.position.z, 1, 1);
      let done = s.t > 3 || !s.field && (Math.abs(s.m.position.x) > 16 || s.m.position.z > -17 || s.m.position.z < -31);
      if (!done && flatDist(s.m.position, player.position) < 0.65 && Math.abs(player.position.y + 1 - s.m.position.y) < 1.3) {
        done = true; hitPlayer(14, s.m.position, 6, false, s.owner);
      }
      if (done) { scene.remove(s.m); shots.splice(i, 1); }
    }
  }

  function royalTurn(r, target, rate, dt) { r.facing += clamp(angDiff(r.facing, yawTo(r.pos, target)), -rate * dt, rate * dt); }
  function royalStep(r, v, amt) {
    r.pos.addScaledVector(v, amt);
    r.pos.x = clamp(r.pos.x, ROOF.x0, ROOF.x1); r.pos.z = clamp(r.pos.z, ROOF.z0, ROOF.z1); r.pos.y = ROOF.y;
  }
  const playerOnRoof = () => Math.abs(player.position.y - ROOF.y) < 1.5;

  function beginRoyalAttack(r, d) {
    if (uTime.value > (r.kitAt || 3) && Math.random() < 0.4) { royalKit(r); return; }
    const en = r.enraged;
    if (r.kind === 'gorgon') {
      if (d < 3.4) r.atk = { name: 'coil', wind: en ? 0.5 : 0.72, rec: en ? 0.5 : 0.75 };
      else if (d < 11 && Math.random() < 0.4) r.atk = { name: 'gaze', wind: en ? 0.65 : 0.9, rec: 0.6 };
      else if (d < 9) r.atk = { name: 'bash', wind: en ? 0.45 : 0.6, act: 0.5, rec: en ? 0.55 : 0.8 };
      else { r.cool = 0.2; return; }
    } else {
      if (d < 3.5 && r.blinkCd <= 0) r.atk = { name: 'blink', wind: 0.35 };
      else if (Math.random() < 0.6) r.atk = { name: 'orbs', wind: en ? 0.45 : 0.65, rec: 0.6 };
      else r.atk = { name: 'pyre', wind: en ? 0.8 : 1.1, rec: 0.5, at: player.position.clone() };
    }
    Object.assign(r.atk, { t: 0, stage: 'wind', hit: false });
    r.state = 'attack';
  }

  function updateRoyalAttack(r, dt) {
    const A = r.atk; A.t += dt;
    const RY = r.field ? r.pos.y : ROOF.y, reach = () => r.field ? Math.abs(player.position.y - r.pos.y) < 2 : playerOnRoof();
    const done = () => { r.atk = null; r.state = 'chase'; r.tele.hide(); r.cool = (r.enraged ? 0.3 : 0.55) + Math.random() * 0.45; r.pivot.rotation.set(0, 0, 0); };
    if (A.name === 'coil') {
      // Tail sweep all around her
      if (A.stage === 'wind') {
        r.facing -= dt * 1.2;
        r.pivot.rotation.x = r.off.rotation.x = -1.4 * ease(A.t / A.wind);
        r.tele.circle(r.pos.x, RY, r.pos.z, 3.0, A.t / A.wind);
        if (A.t >= A.wind) {
          A.stage = 'rec'; A.t = 0; r.tele.hide(); r.spin = 0;
          sfx('swing'); G.shake = Math.max(G.shake, 0.3); burst(r.pos.x, RY + 0.3, r.pos.z, 24, 6);
          if (flatDist(player.position, r.pos) < 3.3 && reach()) hitPlayer(22, r.pos, 10, true, r);
        }
      } else {
        r.facing += dt * 14 * Math.max(0, 1 - A.t / 0.35);
        r.pivot.rotation.x = r.off.rotation.x = 0.6;
        if (A.t >= A.rec) { r.off.rotation.x = 0; done(); }
      }
    } else if (A.name === 'gaze') {
      // Stone gaze down a long lane. Facing her when it lands turns you to stone.
      if (A.stage === 'wind') {
        if (A.t < A.wind * 0.7) royalTurn(r, player.position, 5, dt);
        const k = A.t / A.wind;
        r.eyeMat.color.setRGB(0.85 + 0.15 * k, 1, 0.35 + 0.65 * k);
        r.tele.lane(r.pos, r.facing, 11, 2.2, k, RY);
        if (A.t >= A.wind) {
          A.stage = 'rec'; A.t = 0; r.tele.hide(); r.eyeMat.color.setHex(0xd8ff5a); sfx('parry');
          const f = fwdOf(r.facing), rx = player.position.x - r.pos.x, rz = player.position.z - r.pos.z;
          const along = rx * f.x + rz * f.z, perp = Math.abs(rx * f.z - rz * f.x);
          if (along > 0 && along < 11.5 && perp < 1.4 && reach() && P.iframe <= 0) {
            const lookingAtHer = Math.abs(angDiff(P.facing, yawTo(player.position, r.pos))) < 1.6;
            const at = player.position.clone().add(new THREE.Vector3(0, 2.4, 0));
            if (lookingAtHer) { P.stone = 1.5; floatText('PETRIFIED', at, 'word', '#c8c8c0'); hitPlayer(8, r.pos, 0, false, r); }
            else floatText('looked away', at, 'word', '#d8ff5a');
          }
        }
      } else if (A.t >= A.rec) done();
    } else if (A.name === 'bash') {
      if (A.stage === 'wind') {
        if (A.t < A.wind - 0.12) royalTurn(r, player.position, 6, dt);
        r.tele.lane(r.pos, r.facing, 7, 1.8, A.t / A.wind, RY);
        if (A.t >= A.wind) { A.stage = 'act'; A.t = 0; r.tele.hide(); sfx('roll'); }
      } else if (A.stage === 'act') {
        if (r.field) fieldStep(r, fwdOf(r.facing), 13 * dt); else royalStep(r, fwdOf(r.facing), 13 * dt);
        if (!A.hit && flatDist(player.position, r.pos) < 1.5 && reach()) { A.hit = true; hitPlayer(18, r.pos, 12, true, r); }
        if (A.t >= A.act) { A.stage = 'rec'; A.t = 0; }
      } else if (A.t >= A.rec) done();
    } else if (A.name === 'orbs') {
      if (A.stage === 'wind') {
        royalTurn(r, player.position, 6, dt);
        r.pivot.rotation.x = -1.2 * ease(A.t / A.wind);
        if (A.t >= A.wind) {
          A.stage = 'rec'; A.t = 0;
          const n = r.enraged ? 7 : 5, base = yawTo(r.pos, player.position);
          for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.22; spawnShot(r.pos.x + Math.sin(a) * 0.8, RY + 1.9, r.pos.z + Math.cos(a) * 0.8, a, 9, r); }
          sfx('cast');
        }
      } else if (A.t >= A.rec) done();
    } else if (A.name === 'pyre') {
      if (A.stage === 'wind') {
        royalTurn(r, player.position, 6, dt);
        r.pivot.rotation.x = -1.8;
        r.tele.circle(A.at.x, RY, A.at.z, 2.4, A.t / A.wind);
        if (A.t >= A.wind) {
          A.stage = 'rec'; A.t = 0; r.tele.hide(); sfx('boom'); G.shake = Math.max(G.shake, 0.35);
          burst(A.at.x, RY + 0.3, A.at.z, 34, 8);
          if (flatDist(player.position, A.at) < 2.75 && reach()) hitPlayer(26, A.at, 8, false, r);
        }
      } else if (A.t >= A.rec) done();
    } else if (A.name === 'blink') {
      if (A.stage === 'wind') {
        r.g.scale.setScalar(1.15 * (1 - ease(A.t / A.wind) * 0.9));
        if (A.t >= A.wind) {
          burst(r.pos.x, RY + 1, r.pos.z, 20, 5);
          let best = null, bd = -1;
          for (let i = 0; i < 10; i++) {
            const v = r.field ? ringSpot(7, 11) : new THREE.Vector3(ROOF.x0 + Math.random() * (ROOF.x1 - ROOF.x0), RY, ROOF.z0 + Math.random() * (ROOF.z1 - ROOF.z0));
            if (!v) continue;
            if (r.field) v.y = Math.max(0, groundAt(v.x, v.z));
            const dd = flatDist(v, player.position); if (dd > bd) { bd = dd; best = v; }
          }
          if (best) r.pos.copy(best); burst(best.x, RY + 1, best.z, 20, 5);
          A.stage = 'appear'; A.t = 0; r.blinkCd = 5; sfx('parry');
        }
      } else {
        r.g.scale.setScalar(1.15 * Math.max(0.1, ease(A.t / 0.25)));
        if (A.t >= 0.25) { r.g.scale.setScalar(1.15); done(); }
      }
    }
  }

  function updateRoyal(r, dt) {
    r.flash = Math.max(0, r.flash - dt * 5);
    r.robe.emissive.setRGB(r.flash * 0.9, r.flash * 0.8, r.flash * 0.6);
    const tt = uTime.value;
    if (r.orb) { const pl = 0.7 + 0.3 * Math.sin(tt * (r.enraged ? 10 : 4)); r.orb.material.color.setRGB(pl, 0.23 * pl, 0.48 * pl); }
    if (r.snakes && r.alive) r.snakes.forEach((sn, i) => { sn.s.rotation.y = Math.sin(tt * (r.enraged ? 9 : 5) + i * 1.3) * 0.5; });
    if (r.shards && r.alive) r.shards.forEach((s, i) => {
      const a = tt * (r.enraged ? 2.6 : 1.4) + i / r.shards.length * TAU;
      s.position.set(Math.cos(a) * 1.1, 1.6 + Math.sin(tt * 2 + i) * 0.3, Math.sin(a) * 1.1); s.rotation.set(0, -a, Math.PI / 2);
    });
    if (r.state === 'dead') { r.t += dt; r.body.rotation.x = -Math.min(1.5, r.t * 1.4); r.body.position.y = Math.max(0, r.body.position.y - dt); return; }
    if (r.field) { updateFieldRoyal(r, dt); r.g.rotation.y = r.facing; return; }
    r.g.visible = G.world === 'moat';
    if (!r.active) {
      r.body.position.y = r.hover + Math.sin(tt * 1.5 + (r.kind === 'gorgon' ? 0 : 1)) * (r.hover ? 0.12 : 0.03);
      if (G.wardenDown && playerOnRoof()) royalTurn(r, player.position, 2, dt);
      r.g.rotation.y = r.facing; return;
    }
    const d = flatDist(player.position, r.pos), sp = r.enraged ? 1.35 : 1;
    if (r.state === 'stagger') {
      r.t += dt; r.body.rotation.x = -0.3 * Math.sin(Math.min(1, r.t / 0.2) * Math.PI / 2);
      if (r.t > r.dur) { r.body.rotation.x = 0; r.state = 'chase'; r.cool = 0.4; }
    } else if (r.state === 'chase' && G.state === 'royal') {
      royalTurn(r, player.position, 4 * sp, dt);
      if (r.kind === 'gorgon') {
        if (d > 2.3) royalStep(r, fwdOf(r.facing), 2.6 * sp * dt);
      } else {
        const away = new THREE.Vector3(r.pos.x - player.position.x, 0, r.pos.z - player.position.z).normalize();
        if (d < 6) royalStep(r, away, 2.6 * dt);
        else if (d > 11) royalStep(r, away.clone().negate(), 2.2 * dt);
        else royalStep(r, new THREE.Vector3(-away.z, 0, away.x), Math.sin(uTime.value * 0.7) * 1.4 * dt);
      }
      r.body.position.y = r.hover ? r.hover + Math.sin(tt * 2) * 0.12 : Math.abs(Math.sin(tt * 6)) * 0.04;
      r.cool -= dt; r.blinkCd -= dt;
      if (r.cool <= 0 && playerOnRoof()) beginRoyalAttack(r, d);
    } else if (r.state === 'attack') updateRoyalAttack(r, dt);
    r.g.rotation.y = r.facing;
    // Bodies don't overlap
    if (playerOnRoof()) {
      const dx = player.position.x - r.pos.x, dz = player.position.z - r.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 1.1 && dd > 1e-4) movePlayer(dx / dd * (1.1 - dd), dz / dd * (1.1 - dd));
    }
  }

  function damageRoyal(r, dmg, poiseDmg, heavy) {
    if (r.field) r.provoked = 12;
    const out = Math.round(dmg * (0.9 + Math.random() * 0.2) * (r.state === 'stagger' ? 1.5 : 1) * (P.buffDmg > 0 ? 1.5 : 1));
    r.hp = Math.max(0, r.hp - out); r.flash = 1;
    G.hitstop = heavy ? 0.1 : 0.05; G.shake = Math.max(G.shake, heavy ? 0.3 : 0.12);
    const at = r.pos.clone().add(new THREE.Vector3(0, 1.8, 0));
    burst(at.x, at.y, at.z, heavy ? 22 : 12, heavy ? 6 : 4);
    floatText(String(out), at, heavy || r.state === 'stagger' || P.buffDmg > 0 ? 'big' : '', P.buffDmg > 0 ? '#ff3b3b' : null);
    sfx(heavy ? 'heavyhit' : 'hit');
    if (r.state !== 'stagger') { r.poise -= poiseDmg; if (r.poise <= 0) staggerRoyal(r, 1.4, 'STAGGERED'); }
    if (r.hp <= 0) killRoyal(r);
  }
  function staggerRoyal(r, dur, word) {
    if (!r.alive) return;
    r.state = 'stagger'; r.t = 0; r.dur = dur; r.atk = null; r.poise = 100;
    r.tele.hide(); r.g.scale.setScalar(1.15); r.pivot.rotation.set(0, 0, 0); if (r.off) r.off.rotation.set(0, 0, 0);
    floatText(word, r.pos.clone().add(new THREE.Vector3(0, 3.6, 0)), 'word');
  }
  function killRoyal(r) {
    if (r.field) { fieldRoyalDown(r); return; }
    r.alive = false; r.state = 'dead'; r.t = 0; r.atk = null; r.tele.hide(); r.g.scale.setScalar(1.15);
    sfx('roar'); G.slow = 0.6;
    burst(r.pos.x, ROOF.y + 1.5, r.pos.z, 40, 7);
    reward(250 * tierMult(G.bossTier || 1), 140 * tierMult(G.bossTier || 1), r.pos.clone().add(new THREE.Vector3(0, 3, 0)));
    const other = royals.find(o => o.alive);
    if (other) { other.enraged = true; floatText('ENRAGED', other.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word'); }
    else winGame();
  }
  function startRoyal() {
    const tier = worldTier(), m = tierMult(tier);
    G.dmgMult = (1 + 0.2 * (tier - 1)) * (1 + 0.25 * G.ascension); G.bossTier = tier;
    // Wherever they were feeding, they answer the throne at their full farmed strength
    endRoyalHunt(true);
    royals.forEach((r, i) => {
      Object.assign(r, { field: false, alive: true, enraged: false, atk: null, t: 0 }); r.lv = Math.max(r.lv, tier + 2 + 2 * G.ascension); r.max = 0; royalStats(r); r.hp = r.max;
      r.pos.copy(r.home); r.g.visible = true; r.g.scale.setScalar(1.15); r.body.rotation.set(0, 0, 0); r.tele.hide(); royalBars[i].bar.hidden = true;
      ui['rname' + i].textContent = `${r.kind === 'gorgon' ? 'Vesthra, the Gorgon' : 'Nyxara, the Thorn Empress'} \u00b7 Lv ${r.lv}`;
    });
    G.state = 'royal'; G.lock = true; G.target = null;
    royals.forEach(r => { r.active = true; r.state = 'chase'; r.cool = 1.2 + Math.random(); });
    showBanner('The Gorgon and the Empress', '', 'title'); bannerTimer = 2.2;
    ui.hud.hidden = true; ui.royalbars.hidden = false; sfx('roar');
  }
