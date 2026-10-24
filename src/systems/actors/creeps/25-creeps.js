  // ---------- Creeps: mire crawlers (melee) and ash wisps (ranged) ----------
  const creeps = [];
  const creepEyeMat = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
  function buildCrawler() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3d5a2e, flatShading: true, emissive: 0x000000 });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat); shell.scale.set(1, 0.6, 1.3); shell.position.y = 0.45; body.add(shell);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), mat); headM.position.set(0, 0.4, 0.7); body.add(headM);
    [-0.1, 0.1].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), creepEyeMat); e.position.set(x, 0.48, 0.92); body.add(e); });
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, row = i % 3;
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), mat); l.position.set(side * 0.55, 0.25, -0.35 + row * 0.35); l.rotation.z = side * -0.4; body.add(l); legs.push(l);
    }
    return { g, body, mat, legs };
  }
  function buildWisp() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8fd8ff });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat); body.add(core);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 8), mat); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.5; body.add(tail);
    body.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a7aa8, transparent: true, opacity: 0.35, depthWrite: false })));
    return { g, body, mat, core };
  }
  // Fen Stalker: a lean four-legged hunter that circles, then lunges down a lane. Its bite poisons.
  function buildStalker() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a523a, flatShading: true, emissive: 0x000000 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 1.3), mat); torso.position.y = 0.7; body.add(torso);
    const headM = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), mat); headM.rotation.x = Math.PI / 2; headM.position.set(0, 0.78, 0.9); body.add(headM);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xb8ff6a });
    [-0.09, 0.09].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), eyeMat); e.position.set(x, 0.86, 1.0); body.add(e); });
    const legs = [];
    [[-0.22, 0.45], [0.22, 0.45], [-0.22, -0.45], [0.22, -0.45]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat); l.position.set(x, 0.35, z); body.add(l); legs.push(l); });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.9, 4), mat); tail.position.set(0, 0.8, -0.95); tail.rotation.x = 1.1; body.add(tail);
    return { g, body, mat, legs, eyeMat };
  }
  // Thornback: a slow, spiked shell-walker. Its front is a shield; the shell opens when it is staggered.
  function buildThornback() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mat = new THREE.MeshLambertMaterial({ color: 0x5d6156, flatShading: true, emissive: 0x000000 });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 7), mat); shell.scale.set(1.15, 0.62, 1.3); shell.position.y = 0.55; body.add(shell);
    const spikeMat = new THREE.MeshLambertMaterial({ color: 0x8a8f84, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU, r = 0.45 + (i % 2) * 0.25;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5), spikeMat);
      s.position.set(Math.cos(a) * r, 0.95 + (i % 2) * 0.1, Math.sin(a) * r * 1.2); s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); body.add(s);
    }
    const headM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.45), mat); headM.position.set(0, 0.45, 1.05); body.add(headM);
    [-0.12, 0.12].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), creepEyeMat); e.position.set(x, 0.52, 1.28); body.add(e); });
    const legs = [];
    [[-0.6, 0.5], [0.6, 0.5], [-0.6, -0.5], [0.6, -0.5]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), mat); l.position.set(x, 0.2, z); body.add(l); legs.push(l); });
    return { g, body, mat, legs, spikeMat };
  }
  const ROSTER = [].concat(Array(11).fill('crawler'), Array(7).fill('wisp'), Array(5).fill('stalker'), Array(4).fill('thornback'));
  const BUILD = { crawler: buildCrawler, wisp: buildWisp, stalker: buildStalker, thornback: buildThornback };
  const CREEP_AI = { crawler: 'melee', wisp: 'ranged', stalker: 'stalker', thornback: 'guard' };
  const ANCIENT_CAMPS = ANCIENT_CELLS.map(([i, j], k) => [MAZE.x0 + (i + 0.5) * MAZE.cell, MAZE.z0 + (j + 0.5) * MAZE.cell, k % 3 === 1 ? 'wisp' : 'crawler'])
    .concat([[48, -44, 'crawler'], [38, 46, 'wisp'], [-60, 56, 'crawler']]);
  for (let i = 0; i < ROSTER.length + ANCIENT_CAMPS.length; i++) {
    const camp = ANCIENT_CAMPS[i - ROSTER.length];
    const type = camp ? camp[2] : ROSTER[i];
    const parts = BUILD[type]();
    parts.g.visible = false; scene.add(parts.g);
    const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    if (camp && type === 'wisp') parts.mat.color.setHex(0xffc860);
    creeps.push(Object.assign(parts, { type, isCreep: true, alive: false, respawn: 1 + i * 0.5, pos: parts.g.position, radius: 0.6, hitY: 0.7, markY: 1.8,
      hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
      wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
      ancient: !!camp, camp: camp ? new THREE.Vector3(camp[0], 0, camp[1]) : null, age: 0 }));
    if (camp) creeps[creeps.length - 1].respawn = 3 + i;
  }
  creeps.forEach(c => { c.realm = 'material'; c.ai = CREEP_AI[c.type]; if (c.type === 'thornback') { c.guard = true; c.radius = 0.85; } });
  // Spirit-realm roster: original spirits and two fallen godlings
  const spiritMat = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op || 0.85, depthWrite: false });
  const SPIRIT_BUILD = {
    lantern() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const headM = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), spiritMat(0xcfe6ff)); body.add(headM);
      [-0.12, 0.12].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2a2050 })); e.position.set(x, 0.05, 0.32); body.add(e); });
      for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.7, 4), spiritMat(0x9fb8ff, 0.7)); const a = i / 5 * TAU; t.position.set(Math.cos(a) * 0.2, -0.5, Math.sin(a) * 0.2); t.rotation.x = Math.PI; body.add(t); }
      return { g, body };
    },
    tide() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 10), spiritMat(0x5fb8ff, 0.6)); robe.position.y = -0.2; body.add(robe);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), spiritMat(0x8fd0ff)); hood.position.y = 0.85; body.add(hood);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe0f6ff })); core.position.set(0, 0.3, 0.35); body.add(core);
      return { g, body, core };
    },
    ember() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.45 - i * 0.12, 0.9, 6), spiritMat([0xff5a2a, 0xff9a3a, 0xffd36a][i], 0.8)); f.position.y = i * 0.35; body.add(f); }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); core.position.y = 0.2; body.add(core);
      return { g, body, core };
    },
    godling(k) {
      const col = k ? 0xc8a0ff : 0xffe2a0;
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const robe = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 12), spiritMat(col, 0.65)); robe.position.y = 0.4; body.add(robe);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.6), spiritMat(col, 0.85)); torso.position.y = 2.3; body.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), spiritMat(0xfff6e0)); head.position.y = 3.1; body.add(head);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: k ? 0xe0c8ff : 0xffd36a })); halo.position.set(0, 3.25, -0.35); body.add(halo);
      [-1, 1].forEach(sd => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.3, 6), spiritMat(col, 0.8)); arm.position.set(sd * 0.75, 2.1, 0.2); arm.rotation.z = sd * 0.6; body.add(arm); });
      return { g, body, halo, godName: k ? 'Varghast the Hollow Thunderer' : 'Aurelion the Sunless', godHue: k ? 0.75 : 0.12 };
    }
  };
  [['lantern', 8], ['tide', 4], ['ember', 3], ['godling', 2]].forEach(([type, n]) => {
    for (let k = 0; k < n; k++) {
      const parts = SPIRIT_BUILD[type](k);
      parts.g.visible = false; scene.add(parts.g);
      const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
      const big = type === 'godling';
      creeps.push(Object.assign(parts, { type, realm: 'spirit', ai: big ? 'godling' : (type === 'tide' ? 'ranged' : 'melee'), float: type === 'lantern' ? 0.9 : type === 'ember' ? 0.5 : 0, speed: type === 'ember' ? 1.35 : type === 'lantern' ? 1.15 : 1,
        isCreep: true, alive: false, respawn: 2 + creeps.length * 0.3, pos: parts.g.position, radius: big ? 1.4 : 0.6, hitY: big ? 2 : 0.7, markY: big ? 4.4 : 1.8,
        hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
        wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
        ancient: false, camp: null, age: 0 }));
    }
  });
  function groundAtRealm(x, z, realm) { const r = G.realm; G.realm = realm; const h = groundAt(x, z); G.realm = r; return h; }
  function spiritSpot(c) {
    for (let i = 0; i < 60; i++) {
      const x = -112 + Math.random() * 224, z = -112 + Math.random() * 216;
      if (c.ai === 'godling' && Math.hypot(x, z) < 88) continue;
      if (groundAtRealm(x, z, 'spirit') !== 0) continue;
      if (Math.abs(x) < 24 && z < -6 && z > -40) continue;
      if (Math.hypot(x - player.position.x, z - player.position.z) < 16) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }
  function updateGodling(c, dt, d, groundY) {
    const tt = uTime.value;
    c.pos.y = groundY + (c.grounded ? 0 : 1.0 + Math.sin(tt * 1.5 + c.home.x) * 0.3);
    if (c.halo) c.halo.rotation.z += dt * 1.5;
    if (c.stun > 0) return;
    if (c.storyBoss && !c.atk) bossKit(c, dt, d);
    if (c.atk) {
      const A = c.atk; A.t += dt;
      c.tele.circle(A.at.x, A.at.y, A.at.z, 2.8, A.t / 1.1);
      if (A.t >= 1.1) {
        c.tele.hide(); c.atk = null; c.cool = (2.2 + Math.random()) * (c.storyBoss ? (c.enraged ? 0.42 : 0.65) : 1);
        sfx('boom'); G.shake = Math.max(G.shake, 0.4);
        for (let i = 0; i < 70; i++) { fwColor.setHSL(c.godHue + Math.random() * 0.05, 0.8, 0.75); fwParticle(A.at.x + (Math.random() - 0.5) * 2, A.at.y + Math.random() * 10, A.at.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -6 - Math.random() * 6, (Math.random() - 0.5) * 2, fwColor, 0.6, true); }
        if (flatDist(player.position, A.at) < 3.1 && Math.abs(player.position.y - A.at.y) < 2) hitPlayer(30, A.at, 9, false, c);
      }
      return;
    }
    if (d < 24 && G.state !== 'dead') {
      c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -2.5 * dt, 2.5 * dt);
      if (d > 7) creepMove(c, fwdOf(c.facing), 2.4 * dt);
      c.cool -= dt;
      if (c.cool <= 0) c.atk = { t: 0, at: player.position.clone().setY(Math.max(0, P.y)) };
    } else creepWander(c, dt, 1.0);
  }
  function pushPlayerOut(c, r) {
    if (Math.abs(player.position.y - c.pos.y) >= 1.5) return;
    const dx = player.position.x - c.pos.x, dz = player.position.z - c.pos.z, dd = Math.hypot(dx, dz);
    if (dd < r && dd > 1e-4) movePlayer(dx / dd * (r - dd), dz / dd * (r - dd));
  }
  // Fen Stalker: keeps five to seven metres away, circling, then lunges nine metres down a telegraphed lane
  function updateStalker(c, dt, d, groundY, aggro) {
    const tt = uTime.value;
    c.pos.y = groundY;
    if (c.atk) {
      const A = c.atk; A.t += dt;
      if (A.stage === 'wind') {
        if (A.t < 0.3) c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -4 * dt, 4 * dt);
        c.tele.lane(c.pos, c.facing, 9, 1.5, A.t / 0.6, c.pos.y);
        if (A.t >= 0.6) { A.stage = 'dash'; A.t = 0; c.tele.hide(); sfx('swoosh'); }
      } else if (A.stage === 'dash') {
        const ok = creepMove(c, fwdOf(c.facing), 26 * dt);
        if (Math.random() < 0.6) burst(c.pos.x, c.pos.y + 0.3, c.pos.z, 1, 2);
        if (!A.hit && flatDist(player.position, c.pos) < 1.4 && Math.abs(player.position.y - c.pos.y) < 1.5) {
          A.hit = true;
          if (hitPlayer(12, c.pos, 8, true, c) && !c.mythic) poisonHero(2 * c.mult * G.env.creepDmg, 6);
        }
        if (A.t >= 0.35 || !ok) { A.stage = 'rec'; A.t = 0; }
      } else if (A.t >= 1.0) { c.atk = null; c.cool = 2.0 + Math.random() * 1.2; }
    } else if (c.stun <= 0) {
      if (aggro) {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -5 * dt, 5 * dt);
        const to = new THREE.Vector3(player.position.x - c.pos.x, 0, player.position.z - c.pos.z).normalize();
        const mv = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(c.orbit || 1).addScaledVector(to, d > 7 ? 1 : d < 5 ? -1 : 0).normalize();
        if (!creepMove(c, mv, 4.2 * dt)) c.orbit = -(c.orbit || 1);
        c.cool -= dt;
        if (c.cool <= 0 && d > 2.5 && d < 10) c.atk = { t: 0, stage: 'wind', hit: false };
      } else creepWander(c, dt, 1.6);
    }
    const moving = !c.atk && c.stun <= 0;
    c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 16 + i * 1.6) * 0.5 : 0; });
    c.body.position.y = c.atk && c.atk.stage === 'wind' ? -0.12 * Math.min(1, c.atk.t / 0.6) : 0;
    pushPlayerOut(c, 0.9);
  }
  // Thornback: slow to turn, so you can get behind it; slams the ground in front of it
  function updateGuard(c, dt, d, groundY, aggro) {
    const tt = uTime.value;
    c.pos.y = groundY;
    if (c.atk) {
      const A = c.atk; A.t += dt;
      const front = c.pos.clone().addScaledVector(fwdOf(c.facing), 1.4);
      if (A.stage === 'wind') {
        c.tele.circle(front.x, c.pos.y, front.z, 2.1, A.t / 0.85);
        c.body.position.y = 0.25 * Math.sin(Math.min(1, A.t / 0.85) * Math.PI / 2);
        if (A.t >= 0.85) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); c.body.position.y = 0;
          burst(front.x, c.pos.y + 0.3, front.z, 16, 5); G.shake = Math.max(G.shake, 0.2); sfx('boom');
          if (flatDist(player.position, front) < 2.4 && Math.abs(player.position.y - c.pos.y) < 1.5) hitPlayer(18, front, 11, true, c);
        }
      } else if (A.t >= 0.9) { c.atk = null; c.cool = 1.4 + Math.random() * 0.8; }
    } else if (c.stun <= 0) {
      if (aggro) {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -2.2 * dt, 2.2 * dt);
        if (d > 2.2) creepMove(c, fwdOf(c.facing), 2.3 * dt);
        c.cool -= dt;
        if (d < 3.0 && c.cool <= 0) c.atk = { t: 0, stage: 'wind' };
      } else creepWander(c, dt, 0.9);
    }
    const moving = !c.atk && c.stun <= 0;
    c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 7 + i * 1.6) * 0.35 : 0; });
    c.spikeMat.color.setHex(c.stun > 0 ? 0xd8c070 : 0x8a8f84);
    pushPlayerOut(c, 1.3);
  }
  function creepSpot() {
    for (let i = 0; i < 40; i++) {
      const e = G.edge - 6, x = -e + Math.random() * e * 2, z = -e + Math.random() * (e * 2 - 8);
      if (groundAt(x, z) !== 0) continue;
      if (Math.abs(x) < 24 && z < -6 && z > -40) continue;
      if (inMaze(x, z) || inKeep(x, z)) continue;
      if (Math.hypot(x - player.position.x, z - player.position.z) < 18 || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 14) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }
  const CREEP_NAME = { crawler: 'Mire Crawler', wisp: 'Ash Wisp', stalker: 'Fen Stalker', thornback: 'Thornback', lantern: 'Hollow Lantern', tide: 'Tide Shade', ember: 'Ember Wraith', godling: 'Fallen Godling' };
  const CREEP_BASE = { crawler: 60, wisp: 42, stalker: 46, thornback: 120, lantern: 34, tide: 46, ember: 50, godling: 900 };
  const CREEP_XP = { crawler: 22, wisp: 18, stalker: 24, thornback: 34 };
  const CREEP_BAR_H = { crawler: 1.4, stalker: 1.3, thornback: 1.7 };
  function creepTitle(c) {
    const cat = c.mythic ? '' : c.elite ? 'Elite ' : c.ancient ? 'Ancient ' : (c.lv > worldTier() ? 'Veteran ' : '');
    return `${cat}${c.godName || CREEP_NAME[c.type]} \u00b7 Lv ${c.lv}`;
  }
  function creepStats(c) {
    c.mult = (1 + 0.35 * (c.lv - 1)) * (c.ancient ? 1.8 : 1) * (c.mythic ? 1.6 : 1) * (1 + 0.15 * G.ascension);
    const ratio = c.max > 1 ? c.hp / c.max : 1;
    c.max = Math.round((CREEP_BASE[c.type] || 50) * (c.ancient ? 4 : 1) * (1 + 0.35 * (c.lv - 1)));
    c.hp = Math.max(1, Math.round(c.max * ratio));
    c.bar.className = 'cbar' + (c.mythic ? ' anc myth' : c.ancient || c.storyBoss || c.elite ? ' anc' : (c.lv > worldTier() ? ' vet' : ''));
  }
  function spawnCreep(c) {
    if (c.storyBoss && G.story.step[c.storyBoss] !== 1) { c.respawn = 2; return; }
    if (c.mythic && !c.summoned) { c.respawn = Infinity; return; }
    // Pick the spot as the creep's own world and realm see it
    const w0 = G.world, r0 = G.realm;
    if (WORLDS[c.realm]) { G.world = c.realm; G.realm = 'material'; } else { G.world = 'moat'; G.realm = c.realm; }
    const p = c.storyBoss ? c.camp.clone() : (c.ancient || c.neutral || c.mythic) ? c.camp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)) : (c.realm === 'spirit' ? spiritSpot(c) : WORLDS[c.realm] ? worldSpot(c) : creepSpot());
    G.world = w0; G.realm = r0;
    if (!p) { c.respawn = 2; return; }
    c.elite = false; c.enraged = false;
    c.lv = (c.storyBoss ? Math.max(worldTier(), PR.level - 1) : worldTier()) + (c.storyBoss ? stageOf(c.storyBoss) - 1 : c.mythic ? 2 + G.ascension : c.ai === 'godling' ? 3 : c.ancient ? 2 : (Math.random() < 0.3 ? 1 : 0)); c.max = 1; c.age = 0;
    creepStats(c);
    c.alive = true; c.g.visible = c.realm === realmKey(); c.pos.copy(p); c.home.copy(p); c.wander.copy(p);
    c.atk = null; c.cool = 1; c.stun = 0; c.leash = false; c.rend = 0; c.orbit = Math.random() < 0.5 ? 1 : -1;
    c.g.scale.setScalar(c.mythic ? c.size : (c.ancient ? 1.8 : 1) * (c.type === 'crawler' || c.type === 'thornback' ? 1 + (c.lv - 1) * 0.08 : 1));
  }
  function creepMove(c, dir, amt) {
    const nx = c.pos.x + dir.x * amt, nz = c.pos.z + dir.z * amt;
    if (groundAt(nx, nz) > 0.5) return false;
    c.pos.x = nx; c.pos.z = nz; return true;
  }
  function creepWander(c, dt, sp) {
    if (flatDist(c.pos, c.wander) < 0.8) c.wander.set(c.home.x + (Math.random() - 0.5) * 14, 0, c.home.z + (Math.random() - 0.5) * 14);
    c.facing += clamp(angDiff(c.facing, yawTo(c.pos, c.wander)), -3 * dt, 3 * dt);
    if (!creepMove(c, fwdOf(c.facing), sp * dt)) c.wander.copy(c.home);
  }
  function updateCreep(c, dt) {
    if (!c.alive) { c.respawn -= dt; if (c.respawn <= 0) spawnCreep(c); return; }
    if (c.realm !== realmKey()) return;
    const tt = uTime.value;
    c.flash = Math.max(0, c.flash - dt * 6);
    const glowA = c.ancient ? 0.22 + 0.08 * Math.sin(tt * 3) : 0;
    if (c.mat && c.mat.emissive) c.mat.emissive.setRGB(c.flash + glowA, c.flash * 0.8 + glowA * 0.6, c.flash * 0.6);
    // Creeps grow stronger the longer they live
    c.age += dt;
    if (c.age > 75 && !c.storyBoss && !c.mythic && c.lv < worldTier() + (c.ancient ? 4 : 3)) {
      c.age = 0; c.lv++; creepStats(c); c.hp = Math.min(c.max, c.hp + c.max * 0.25);
      if (flatDist(c.pos, player.position) < 22) floatText(`${CREEP_NAME[c.type]} reached Lv ${c.lv}`, c.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'word', '#ffd36a');
    }
    const d = flatDist(player.position, c.pos);
    if (c.wave || G.royalHunt && !c.storyBoss && !c.mythic) c.leash = false;
    else if (flatDist(c.pos, c.home) > (c.ancient ? 12 : c.mythic ? 30 : 26)) c.leash = true;
    if (c.leash && flatDist(c.pos, c.home) < 3) c.leash = false;
    const aggro = (c.wave || G.royalHunt && !c.storyBoss && !c.mythic ? true : c.neutral ? (c.provoked || d < 3.5) : d < (c.mythic ? 16 : 11)) && player.position.y < 2 && !c.leash && G.state !== 'dead' && G.state !== 'won';
    c.stun = Math.max(0, c.stun - dt);
    const groundY = Math.min(0, groundAt(c.pos.x, c.pos.z));
    if (c.ai === 'godling') { updateGodling(c, dt, d, groundY); }
    else if (c.ai === 'stalker') updateStalker(c, dt, d, groundY, aggro);
    else if (c.ai === 'guard') updateGuard(c, dt, d, groundY, aggro);
    else if (c.ai === 'melee') {
      c.pos.y = groundY + (c.float ? c.float + Math.sin(tt * 3 + c.home.z) * 0.15 : 0);
      if (c.atk) {
        const A = c.atk; A.t += dt;
        const front = c.pos.clone().addScaledVector(fwdOf(c.facing), 0.9);
        if (A.stage === 'wind') {
          c.tele.circle(front.x, c.pos.y, front.z, 1.3, A.t / 0.55);
          if (A.t >= 0.55) {
            A.stage = 'rec'; A.t = 0; c.tele.hide(); burst(front.x, c.pos.y + 0.3, front.z, 8, 4);
            if (flatDist(player.position, front) < 1.6 && Math.abs(player.position.y - c.pos.y) < 1.5) hitPlayer(10, front, 5, true, c);
          }
        } else if (A.t >= 0.6) { c.atk = null; c.cool = 0.9 + Math.random() * 0.6; }
      } else if (c.stun <= 0) {
        if (aggro) {
          c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -6 * dt, 6 * dt);
          if (d > 1.6) creepMove(c, fwdOf(c.facing), 3.7 * (c.speed || 1) * dt);
          c.cool -= dt;
          if (d < 2.0 && c.cool <= 0) c.atk = { t: 0, stage: 'wind' };
        } else creepWander(c, dt, 1.3);
      }
      const moving = !c.atk && c.stun <= 0;
      if (c.legs) c.legs.forEach((l, i) => { l.rotation.y = moving ? Math.sin(tt * 14 + i * 1.7) * 0.4 : 0; });
      if (Math.abs(player.position.y - c.pos.y) < 1.5) {
        const dx = player.position.x - c.pos.x, dz = player.position.z - c.pos.z, dd = Math.hypot(dx, dz);
        if (dd < 0.9 && dd > 1e-4) movePlayer(dx / dd * (0.9 - dd), dz / dd * (0.9 - dd));
      }
    } else {
      c.pos.y = groundY + 1.3 + Math.sin(tt * 2 + c.home.x) * 0.25;
      if (c.core) c.core.scale.setScalar(1 + Math.sin(tt * 8) * 0.12 + c.flash * 0.6);
      if (c.stun <= 0) {
        if (aggro) {
          c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -5 * dt, 5 * dt);
          const away = new THREE.Vector3(c.pos.x - player.position.x, 0, c.pos.z - player.position.z).normalize();
          if (d < 6) creepMove(c, away, 2.6 * dt); else if (d > 9) creepMove(c, away.negate(), 2.4 * dt);
          c.cool -= dt;
          if (c.cool <= 0) { c.cool = 2.2 + Math.random(); spawnCreepShot(c); }
        } else creepWander(c, dt, 1.0);
      }
    }
    c.g.rotation.y = c.facing;
  }
  const cshots = [], cshotMat = new THREE.MeshBasicMaterial({ color: 0x9fe4ff }), cshotGeo = new THREE.SphereGeometry(0.16, 8, 6);
  function spawnCreepShot(c) {
    const m = new THREE.Mesh(cshotGeo, cshotMat); m.position.copy(c.pos); scene.add(m);
    const dir = new THREE.Vector3(player.position.x - c.pos.x, player.position.y + 1.1 - c.pos.y, player.position.z - c.pos.z).normalize();
    cshots.push({ m, v: dir.multiplyScalar(8.5), t: 0, c });
  }
  function updateCreepShots(dt) {
    for (let i = cshots.length - 1; i >= 0; i--) {
      const s = cshots[i]; s.t += dt; s.m.position.addScaledVector(s.v, dt);
      if (Math.random() < 0.3) burst(s.m.position.x, s.m.position.y, s.m.position.z, 1, 1);
      let done = s.t > 3;
      if (!done && s.m.position.distanceTo(player.position.clone().setY(player.position.y + 1)) < 0.75) { done = true; if (hitPlayer(s.c.shotDmg || 8, s.m.position, 4, false, s.c) && s.c.venom) poisonHero(2 * s.c.mult, 5); }
      if (done) { scene.remove(s.m); cshots.splice(i, 1); }
    }
  }
  function damageCreep(c, dmg, poiseDmg, heavy) {
    if (!c.alive) return;
    if (c.neutral) provokeCamp(c);
    // A Thornback's shell: hits on its front land at a third unless it is staggered or struck from behind
    if (c.guard && c.stun <= 0 && !behindTarget(c)) { dmg *= 0.3; floatText('guarded', c.pos.clone().add(new THREE.Vector3(0, 2.0, 0)), 'word', '#9fb0b8'); }
    const out = Math.round(dmg * (0.9 + Math.random() * 0.2) * (P.buffDmg > 0 ? 1.5 : 1));
    c.hp -= out; c.flash = 1; if (heavy) c.stun = c.guard ? 1.2 : 0.5;
    const at = c.pos.clone().add(new THREE.Vector3(0, 1, 0));
    burst(at.x, at.y, at.z, 8, 4); floatText(String(out), at, heavy ? 'big' : '', P.buffDmg > 0 ? '#ff3b3b' : null);
    sfx('hit'); G.hitstop = Math.max(G.hitstop, 0.03);
    creepMove(c, new THREE.Vector3(c.pos.x - player.position.x, 0, c.pos.z - player.position.z).normalize(), (heavy ? 1.2 : 0.4) * (c.guard ? 0.3 : 1));
    if (c.atk && heavy) { c.atk = null; c.tele.hide(); }
    guardianRage(c);
    if (c.hp <= 0) killCreep(c);
  }
  function killCreep(c) {
    c.alive = false; c.g.visible = false; c.tele.hide(); c.atk = null; c.bar.hidden = true;
    c.respawn = c.neutral || c.wave || c.mythic ? Infinity : c.ai === 'godling' ? 120 : c.ancient ? 60 : 7 + Math.random() * 6;
    if (c.neutral) campCreepDied(c);
    if (c.mythic) mythicDied(c);
    spawnSoul(c.pos.x, c.pos.y, c.pos.z, c.ai === 'godling' ? 0.4 : c.ancient ? 0.15 : 0.06);
    if (c.ai === 'godling') floatText(`${c.godName} falls`, c.pos.clone().add(new THREE.Vector3(0, 4, 0)), 'word', '#e0c8ff');
    if (c.ancient) { floatText('Ancient slain', c.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#ff9a4a'); G.shake = Math.max(G.shake, 0.3); }
    burst(c.pos.x, c.pos.y + 0.6, c.pos.z, 24, 5);
    reward((CREEP_XP[c.type] || 18) * c.mult * (c.neutral ? 1.5 : 1) * (c.ancient ? 6 : 1) * (c.ai === 'godling' ? 14 : 1) * (c.mythic ? c.xpMult : 1), (4 + Math.random() * 6) * c.mult * (c.ancient ? 5 : 1) * (c.ai === 'godling' ? 10 : 1) * (c.mythic ? c.xpMult : 1), c.pos.clone().add(new THREE.Vector3(0, 1.8, 0)));
    if (c.ancient) spawnLoot(c.pos.x + 1, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    if (c.ai === 'godling' || c.mythic || (c.ancient && Math.random() < 0.4)) dropRelic(c.pos.x - 1.2, c.pos.z + 1);
    if (Math.random() < 0.2) spawnLoot(c.pos.x, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    swordFeed(c.storyBoss ? 15 : c.ancient ? 5 : c.elite ? 4 : 1);
    if (c.ancient) dropGear(c.pos, 1, 0.3);
    if (c.storyBoss) dropGear(c.pos, 2);
    if (c.elite) eliteDown(c);
    if (c.storyBoss) completeChapter(c.storyBoss);
    if (G.target === c) G.target = null;
  }
  const loot = [];
  function spawnLoot(x, z, type) {
    const m = new THREE.Mesh(podGeo, new THREE.MeshBasicMaterial({ color: BOOST[type].color }));
    m.position.set(x, Math.min(0, groundAt(x, z)) + 0.5, z); scene.add(m);
    loot.push({ m, type, t: 25 });
  }
  function updateLoot(dt) {
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i]; l.t -= dt; l.m.rotation.y += dt * 2;
      let done = l.t <= 0;
      if (!done && flatDist(player.position, l.m.position) < 1.2 && Math.abs(player.position.y - l.m.position.y) < 1.5) { applyBoost(l.type); done = true; }
      if (done) { scene.remove(l.m); l.m.material.dispose(); loot.splice(i, 1); }
    }
  }
