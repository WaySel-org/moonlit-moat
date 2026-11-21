  // ---------- Lanternreach: the Gaunts (hollow giants), their nape-knots and the Bellringer ----------
  // A Gaunt is a creep brain (CREEP_AI_FN) with two bodies for the hero to fight:
  //  - the BODY (the creep itself): ground blades barely scratch it (damage x body, and a body hit can never kill);
  //  - the NAPE-KNOT, its own small hittable target hung at the back of the neck, high above the ground (a second
  //    creep with napeOf set). Anything that reaches it, a hooked flurry, an attack from a rooftop or the wall, a
  //    jump on a small one, a plunge from above, deals big damage to the giant (damage x napeMul).
  // damageCreep is wrapped below to route those two kinds of hit; every other creep goes straight through.
  // Telegraphs: stomp and toll are ground shockwaves (a rooftop or a jump avoids them); sweep is an arm lane at body
  // height; grab is a lane that flings; swat reaches onto roofs. Parry, dodge or climb out of reach.
  const TI_K = {
    gaunt: { H: 10, speed: 2.7, turn: 1.15, radius: 1.7, nape: 8.7, napeBack: 0.55, body: 0.06, napeMul: 3.0, sight: 38, base: 700, xp: 90 },
    runt: { H: 4.4, speed: 6.4, turn: 3.4, radius: 0.95, nape: 3.8, napeBack: 0.5, body: 0.12, napeMul: 3.0, sight: 30, base: 220, xp: 40 },
    bellringer: { H: 14, speed: 2.3, turn: 0.95, radius: 2.7, nape: 12.2, napeBack: 0.7, body: 0.05, napeMul: 3.5, sight: 70, base: 1500, xp: 400, boss: true }
  };
  Object.assign(CREEP_NAME, { gaunt: 'Hollow Gaunt', runt: 'Husk Runt', bellringer: 'The Bellringer', nape: 'Nape-knot' });
  Object.assign(CREEP_BASE, { gaunt: TI_K.gaunt.base, runt: TI_K.runt.base, bellringer: TI_K.bellringer.base, nape: 1 });
  Object.assign(CREEP_XP, { gaunt: TI_K.gaunt.xp, runt: TI_K.runt.xp, bellringer: TI_K.bellringer.xp });
  Object.assign(CREEP_BAR_H, { gaunt: 10.8, runt: 5.2, bellringer: 15 });

  // ----- models: tall pale figures with an open rib cage, long arms and a blank face (H metres tall) -----
  function tiBuildGiant(H, o) {
    o = o || {};
    const s = H / 10, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = lam(o.skin || 0xcfc8b6), boneM = lam(0xb9b09a), dark = bas(0x120e0c), ember = bas(0xff8a3a);
    const legs = [-1, 1].map(sd => {
      const l = new THREE.Group(); l.position.set(sd * 0.6 * s, 4.3 * s, 0); body.add(l);
      box(0.55 * s, 2.2 * s, 0.55 * s, 0, -1.1 * s, 0, skin, l); box(0.42 * s, 2.1 * s, 0.42 * s, 0, -3.25 * s, 0.05 * s, skin, l); box(0.7 * s, 0.3 * s, 1.3 * s, 0, -4.2 * s, 0.3 * s, boneM, l);
      return l;
    });
    box(1.7 * s, 0.55 * s, 0.9 * s, 0, 4.4 * s, 0, skin, body);
    const tor = new THREE.Group(); tor.position.y = 4.6 * s; body.add(tor);
    box(0.34 * s, 3.4 * s, 0.34 * s, 0, 1.7 * s, -0.4 * s, boneM, tor);
    box(1.5 * s, 3.1 * s, 0.05 * s, 0, 1.65 * s, -0.28 * s, dark, tor);
    for (let k = 0; k < 6; k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.85 * s * (1 - 0.07 * Math.abs(k - 2.5)), 0.07 * s, 5, 12, Math.PI), boneM);
      r.rotation.x = Math.PI / 2; r.position.set(0, (0.7 + 0.5 * k) * s, -0.4 * s); tor.add(r);
    }
    box(2.5 * s, 0.45 * s, 0.55 * s, 0, 3.5 * s, -0.1 * s, skin, tor);
    box(0.4 * s, 0.8 * s, 0.4 * s, 0, 4.0 * s, -0.1 * s, skin, tor);
    const arms = [-1, 1].map(sd => {
      const a = new THREE.Group(); a.position.set(sd * 1.4 * s, 3.4 * s, -0.1 * s); tor.add(a);
      box(0.36 * s, 2.3 * s, 0.36 * s, 0, -1.15 * s, 0, skin, a); box(0.3 * s, 2.3 * s, 0.3 * s, 0, -3.4 * s, 0.06 * s, skin, a); box(0.55 * s, 0.8 * s, 0.5 * s, 0, -4.7 * s, 0.1 * s, boneM, a);
      return a;
    });
    const head = new THREE.Group(); head.position.set(0, 4.85 * s, 0.05 * s); tor.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s * (o.head || 1), 10, 8), skin); skull.scale.set(0.85, 1.1, 0.95); head.add(skull);
    [-1, 1].forEach(sd => { sph(0.14 * s * (o.head || 1), dark, head, sd * 0.2 * s, 0.1 * s, 0.46 * s * (o.head || 1)); sph(0.05 * s, ember, head, sd * 0.2 * s, 0.1 * s, 0.56 * s * (o.head || 1)); });
    box(0.5 * s, 0.1 * s, 0.1 * s, 0, -0.28 * s, 0.5 * s * (o.head || 1), dark, head);
    const parts = { g, body, tor, head, legs, arms, mat: skin };
    if (o.bell) {
      const pts = [[0, 1.5], [0.25, 1.45], [0.45, 1.1], [0.62, 0.4], [0.8, -0.3], [1.0, -0.8], [1.15, -1.05], [1.05, -1.12], [0.9, -0.9], [0.72, -0.3], [0.5, 0.3], [0.3, 0.9], [0, 1.1]].map(p => new THREE.Vector2(p[0], p[1]));
      const bell = new THREE.Group(); bell.position.set(0, 1.8 * s, 0.85 * s); tor.add(bell);
      const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), new THREE.MeshLambertMaterial({ color: 0x9a6b34, side: THREE.DoubleSide })); shell.scale.setScalar(0.95 * s); bell.add(shell);
      sph(0.2 * s, lam(0x6a4a24), bell, 0, -0.75 * s, 0);
      box(0.1 * s, 1.0 * s, 0.1 * s, 0, 1.9 * s, -0.25 * s, boneM, bell);
      [-1, 1].forEach(sd => { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 1.0 * s, 5), boneM); sp.position.set(sd * 1.5 * s, 3.95 * s, -0.1 * s); sp.rotation.z = -sd * 0.5; tor.add(sp); });
      parts.bell = bell;
    }
    return parts;
  }
  WORLD_BUILD.gaunt = () => tiBuildGiant(10);
  WORLD_BUILD.runt = () => tiBuildGiant(4.4, { skin: 0xb4ae9c, head: 1.35 });
  WORLD_BUILD.bellringer = () => tiBuildGiant(14, { skin: 0xc2b9a4, bell: true });
  // The nape-knot: a coal of stolen light. Small, bright and hostile-tagged, so it reads as the thing to hit.
  WORLD_BUILD.nape = () => {
    const g = new THREE.Group(), core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), bas(0xffa83a)); g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 5, 18), bas(0xffe0a0)); g.add(ring);
    return { g, body: g, core, ring };
  };

  // ----- creeps: a pool of Gaunts and Runts, the Bellringer, and one nape-knot hung on each of them -----
  const tiGiants = [], tiBoss = {};
  function tiMakeGiant(type, o) {
    const K = TI_K[type];
    const c = addWorldCreep(type, 'titan', type, Object.assign({ K, isGiant: true, brute: true, radius: K.radius, hitY: K.H * 0.4, markY: K.H * 0.95, slump: 0, walkPh: 0, amp: 0, ridden: 0, napeSay: 0, staggerGuard: 0,
      lvOf: () => worldTier() + stageOf('titan') - 1 + (Math.random() < 0.3 ? 1 : 0),
      respawnAfter: () => 12 + Math.random() * 10, onSpawn: tiOnSpawn, onDeath: tiOnDeath }, o));
    const n = addWorldCreep('nape', 'titan', 'nape', { owner: c, napeOf: c, radius: 0.55, hitY: 0, markY: 1.3, brute: true, hp: 1e9, max: 1e9, aware: true, godName: 'Nape-knot', respawn: Infinity });
    n.bar.style.display = 'none'; c.nape = n;
    tiGiants.push(c); return c;
  }
  for (let i = 0; i < 3; i++) tiMakeGiant('gaunt', { respawn: 2 + i * 5 });
  for (let i = 0; i < 4; i++) tiMakeGiant('runt', { respawn: 4 + i * 4 });
  const tiBellringer = tiMakeGiant('bellringer', { respawn: Infinity, lvOf: () => Math.max(worldTier(), PR.level - 1) + stageOf('titan') - 1, respawnAfter: () => Infinity });

  function tiOnSpawn(c) {
    const K = c.K, pp = player.position;
    let x = 0, z = -52;
    if (!K.boss) {
      for (let t = 0; t < 40; t++) {
        x = -58 + Math.random() * 116; z = -58 + Math.random() * 46;
        if (G.world === 'titan' && Math.hypot(x - pp.x, z - pp.z) < 20) continue;
        if (tiGiants.some(o => o !== c && o.alive && Math.hypot(o.pos.x - x, o.pos.z - z) < 9)) continue;
        break;
      }
    }
    c.pos.set(x, 0, z); c.home.copy(c.pos); c.wander.copy(c.pos); c.facing = (Math.random() - 0.5) * 0.8; c.cool = 2 + Math.random() * 2;
    Object.assign(c, { slump: 0, walkPh: 0, amp: 0, ridden: 0, atk: null, pose: null, stun: 0, pounds: 0, tollCd: 6, summoned: 0, enraged: false, staggerGuard: 0 });
    c.g.visible = c.realm === realmKey(); c.leash = false;
    const n = c.nape; n.alive = true; n.g.visible = c.g.visible; n.hp = n.max = 1e9; n.stun = 0;
    tiNapePos(c, n.pos);
  }
  function tiOnDeath(c) {
    const n = c.nape; n.alive = false; n.g.visible = false; n.tele.hide();
    steam(c);
    if (c.K.boss) floatText('The Bellringer falls', c.pos.clone().add(new THREE.Vector3(0, 9, 0)), 'word', '#ffd890');
    else floatText(`${CREEP_NAME[c.type]} dissolves`, c.pos.clone().add(new THREE.Vector3(0, c.K.H * 0.7, 0)), 'word', '#e8dcc0');
    dropGear(c.pos, 1, c.K.boss ? 1 : c.type === 'gaunt' ? 0.3 : 0.1);
    titanGiantDied(c);
  }
  function steam(c) { for (let i = 0; i < 40; i++) { fwColor.setHSL(0.1, 0.1, 0.8); fwParticle(c.pos.x + (Math.random() - 0.5) * c.K.radius * 2, Math.random() * c.K.H, c.pos.z + (Math.random() - 0.5) * c.K.radius * 2, (Math.random() - 0.5) * 1.5, 1 + Math.random() * 3, (Math.random() - 0.5) * 1.5, fwColor, 1.6, false); } }

  // Where the nape-knot hangs: the neck's back, rotated with the giant's lean and facing
  function tiNapePos(c, out) {
    const K = c.K, th = c.body.rotation.x;
    const y = K.nape * Math.cos(th) + K.napeBack * Math.sin(th) + c.body.position.y, z = K.nape * Math.sin(th) - K.napeBack * Math.cos(th);
    out.set(c.pos.x + Math.sin(c.facing) * z, c.pos.y + y, c.pos.z + Math.cos(c.facing) * z);
  }

  // ----- damage: body hits are nearly nothing, nape hits are big -----
  const TI_MELEE = new Set(['light', 'heavy', 'rollslash', 'spin', 'slideslash', 'slidecut', 'hookflurry', 'airslash', 'plunge', 'land', 'gore']);
  const tiDamageCreep = damageCreep;
  damageCreep = function damageCreep(c, dmg, poise, heavy) {
    if (c.napeOf) return tiNapeHit(c, dmg, poise, heavy);
    if (c.isGiant) return tiBodyHit(c, dmg, poise, heavy);
    return tiDamageCreep(c, dmg, poise, heavy);
  };
  function tiBodyHit(c, dmg) {
    if (!c.alive) return;
    const K = c.K, buff = P.buffDmg > 0 ? 1.5 : 1;
    let out = Math.round(dmg * K.body * (0.9 + Math.random() * 0.2) * buff);
    out = Math.max(0, Math.min(Math.max(1, out), Math.floor(c.hp - 1)));
    c.hp -= out; c.flash = Math.max(c.flash, 0.4);
    const pp = player.position, d = Math.max(0.1, flatDist(pp, c.pos)), at = new THREE.Vector3(c.pos.x + (pp.x - c.pos.x) / d * K.radius, Math.min(K.H * 0.6, Math.max(1.4, pp.y + 1.4)), c.pos.z + (pp.z - c.pos.z) / d * K.radius);
    burst(at.x, at.y, at.z, 5, 3); floatText(String(out), at, '', '#a8a090');
    if (c.napeSay < uTime.value) { c.napeSay = uTime.value + 2.2; floatText('hollow', at.clone().add(new THREE.Vector3(0, 0.6, 0)), 'word', '#a8a090'); }
    sfx('clang'); G.hitstop = Math.max(G.hitstop, 0.02);
  }
  function tiNapeHit(n, dmg, poise, heavy) {
    const c = n.napeOf; if (!c.alive || !n.alive) return;
    const K = c.K, act = P.act;
    let m = TI_MELEE.has(act) ? K.napeMul : 1.2;
    if (act === 'hookflurry') m *= 1.25;
    if (act === 'plunge' || act === 'land') m *= 1.25;
    if (c.stun > 0) m *= 1.25;
    const out = Math.max(1, Math.round(dmg * m * (0.9 + Math.random() * 0.2) * (P.buffDmg > 0 ? 1.5 : 1)));
    c.hp -= out; c.flash = 1; n.flash = 1;
    const at = n.pos;
    burst(at.x, at.y, at.z, heavy ? 24 : 12, heavy ? 7 : 5);
    floatText(String(out), at.clone().add(new THREE.Vector3(0, 0.7, 0)), 'big', '#ffb050');
    if (c.napeSay < uTime.value) { c.napeSay = uTime.value + 0.8; floatText('NAPE', at.clone().add(new THREE.Vector3(0, 1.5, 0)), 'word', '#ffd890'); }
    sfx(heavy ? 'heavyhit' : 'hit'); G.hitstop = Math.max(G.hitstop, heavy ? 0.1 : 0.05); G.shake = Math.max(G.shake, heavy ? 0.4 : 0.15);
    if (c.hp <= 0) { killCreep(c); return; }
    // A heavy strike topples it for a moment (with a short lockout so it cannot be held down)
    if (heavy && c.staggerGuard < uTime.value) {
      c.stun = Math.max(c.stun, K.boss ? 1.1 : 2.2); c.atk = null; c.tele.hide(); c.staggerGuard = uTime.value + (K.boss ? 5 : 3.2);
      floatText('TOPPLED', at.clone().add(new THREE.Vector3(0, 2.3, 0)), 'word', '#ffd36a');
    }
    if (K.boss && !c.enraged && c.hp < c.max * 0.5) { c.enraged = true; G.shake = Math.max(G.shake, 0.5); sfx('bossrage', 'cyclops'); floatText('ENRAGED', c.pos.clone().add(new THREE.Vector3(0, 10, 0)), 'word'); }
  }

  // ----- movement: Gaunts keep to the fields until the Great Gate falls; they stride over everything out there -----
  function tiOk(c, x, z) {
    if (x < -66 || x > 66 || z < -66 || z > 66) return false;
    if (z <= 2.4) return true;
    if (z < TI_WALL_Z1) return TITAN.breached && Math.abs(x) < 6.8;
    if (!TITAN.breached) return false;
    return c.K.boss || titanW.ground(x, z) <= 0.5;
  }
  function tiStep(c, dx, dz, amt) {
    const nx = c.pos.x + dx * amt, nz = c.pos.z + dz * amt;
    if (tiOk(c, nx, nz)) { c.pos.x = nx; c.pos.z = nz; return true; }
    if (tiOk(c, nx, c.pos.z)) { c.pos.x = nx; return true; }
    if (tiOk(c, c.pos.x, nz)) { c.pos.z = nz; return true; }
    return false;
  }
  const tiTurn = (c, to, rate, dt) => { c.facing += clamp(angDiff(c.facing, yawTo(c.pos, to)), -rate * dt, rate * dt); };

  // ----- attacks: [wind-up s, recovery s] -----
  const TI_ATK = { stomp: [1.0, 0.9], sweep: [1.2, 0.8], grab: [1.25, 0.9], swat: [0.85, 0.8], lunge: [0.6, 0.7], claw: [0.45, 0.6], toll: [1.8, 1.0], pound: [1.5, 1.2] };
  function tiStart(c, kind, extra) {
    const pp = player.position;
    c.atk = Object.assign({ kind, t: 0, stage: 'wind', at: pp.clone(), y: pp.y, hit: false }, extra);
  }
  // Hero relative to a lane that starts at the giant and runs along its facing
  function tiLane(c, len, w, facing) {
    const pp = player.position, f = fwdOf(facing === undefined ? c.facing : facing), dx = pp.x - c.pos.x, dz = pp.z - c.pos.z;
    const along = dx * f.x + dz * f.z, lat = Math.abs(dx * f.z - dz * f.x);
    return along > -0.5 && along < len && lat < w / 2 + 0.3;
  }
  function tiRun(c, dt) {
    const A = c.atk, K = c.K, pp = player.position, [wind, rec] = TI_ATK[A.kind], f = fwdOf(c.facing), hy = pp.y;
    const en = K.boss && c.enraged ? 1.35 : 1;
    A.t += dt * en;
    if (A.stage === 'wind') {
      const k = A.t / wind, e = clamp(k, 0, 1);
      c.pose = { kind: A.kind, e };
      if (A.kind === 'stomp') {
        const R = K.boss ? 7.2 : 4.4, off = K.boss ? 4.5 : 3.0, cx = c.pos.x + f.x * off, cz = c.pos.z + f.z * off;
        if (A.t < 0.4) tiTurn(c, pp, K.turn * 1.5, dt);
        c.tele.circle(cx, 0.05, cz, R, k);
        if (k >= 1) { A.stage = 'rec'; A.t = 0; c.tele.hide(); tiShock(cx, cz, R); if (flatDist(pp, { x: cx, z: cz }) < R && hy < 1.4) hitPlayer(K.boss ? 30 : 24, { x: cx, y: 0, z: cz }, 11, true, c); }
      } else if (A.kind === 'sweep') {
        const len = K.boss ? 17 : 9, w = K.boss ? 5.5 : 5.0;
        if (A.t < 0.5) tiTurn(c, pp, K.turn * 1.5, dt);
        c.tele.lane(c.pos, c.facing, len, w, k, Math.max(0.05, A.y));
        if (k >= 1) { A.stage = 'rec'; A.t = 0; c.tele.hide(); sfx('swoosh'); G.shake = Math.max(G.shake, 0.3); if (tiLane(c, len, w) && hy < K.H * 0.6) hitPlayer(K.boss ? 26 : 20, c.pos, 12, true, c); }
      } else if (A.kind === 'grab') {
        const len = 12;
        if (A.t < 0.55) tiTurn(c, pp, K.turn * 2.2, dt);
        c.tele.lane(c.pos, c.facing, len, 2.4, k, Math.max(0.05, hy));
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); sfx('heavyhit'); G.shake = Math.max(G.shake, 0.25);
          if (tiLane(c, len, 2.4) && hy < K.H * 1.15 && hitPlayer(26, c.pos, 16, false, c)) heroWord('GRABBED', '#ffb050', 2.8);
        }
      } else if (A.kind === 'swat') {
        const R = K.boss ? 3.6 : 2.7;
        if (A.t < 0.25) { A.at.copy(pp); A.y = pp.y; tiTurn(c, pp, K.turn * 2.5, dt); }
        c.tele.circle(A.at.x, A.y + 0.05, A.at.z, R, k);
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); sfx('slam'); burst(A.at.x, A.y + 0.5, A.at.z, 16, 5); G.shake = Math.max(G.shake, 0.3);
          if (flatDist(pp, A.at) < R + 0.2 && Math.abs(hy - A.y) < 3) hitPlayer(K.boss ? 26 : 22, { x: c.pos.x, y: A.y, z: c.pos.z }, 9, true, c);
        }
      } else if (A.kind === 'lunge') {
        if (A.t < 0.3) tiTurn(c, pp, K.turn * 1.5, dt);
        c.tele.lane(c.pos, c.facing, 9, 1.8, k, 0.05);
        if (k >= 1) { A.stage = 'dash'; A.t = 0; c.tele.hide(); sfx('swoosh'); }
      } else if (A.kind === 'claw') {
        const cx = c.pos.x + f.x * 1.6, cz = c.pos.z + f.z * 1.6;
        if (A.t < 0.25) tiTurn(c, pp, K.turn * 2, dt);
        c.tele.circle(cx, 0.05, cz, 2.0, k);
        if (k >= 1) { A.stage = 'rec'; A.t = 0; c.tele.hide(); burst(cx, 0.8, cz, 8, 4); if (flatDist(pp, { x: cx, z: cz }) < 2.1 && Math.abs(hy) < 2.2) hitPlayer(10, { x: cx, y: 0, z: cz }, 6, true, c); }
      } else if (A.kind === 'toll') {
        const R = c.enraged ? 13 : 11;
        c.tele.circle(c.pos.x, 0.05, c.pos.z, R, k);
        if (c.bell) c.bell.rotation.z = Math.sin(A.t * 14) * 0.25 * e;
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); sfx('boom'); G.shake = Math.max(G.shake, 0.7); tiShock(c.pos.x, c.pos.z, R);
          if (flatDist(pp, c.pos) < R && hy < 1.6) hitPlayer(20, c.pos, 10, false, c);
          titanSummonRunts(c.enraged ? 3 : 2, c.pos, 8, 12); c.tollCd = c.enraged ? 9 : 14;
        }
      } else if (A.kind === 'pound') {
        const R = 6;
        c.tele.circle(0, 0.05, 0.8, R, k);
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); c.pounds++; tiShock(0, 0.8, R); sfx('boom'); G.shake = Math.max(G.shake, 0.8);
          if (flatDist(pp, { x: 0, z: 0.8 }) < R && hy < 1.4) hitPlayer(24, c.pos, 12, true, c);
          floatText('the wall shudders', new THREE.Vector3(0, 11, 7), 'word', '#d8c8a8');
          if (c.pounds >= 3) titanBreach();
        }
      }
      return;
    }
    if (A.stage === 'dash') {
      c.pose = { kind: 'lunge', e: 1 };
      const ok = tiStep(c, f.x, f.z, 24 * dt);
      if (!A.hit && flatDist(pp, c.pos) < 1.7 && Math.abs(pp.y - c.pos.y) < 2) { A.hit = true; hitPlayer(14, c.pos, 8, true, c); }
      if (A.t >= 0.35 || !ok) { A.stage = 'rec'; A.t = 0; }
      return;
    }
    c.pose = { kind: A.kind, e: 1, rec: true };
    if (A.t >= rec) { c.atk = null; c.pose = null; c.cool = ((K.boss ? 1.8 : K.H > 6 ? 2.0 : 0.9) + Math.random() * 1.1) / (K.boss && c.enraged ? 1.5 : 1); }
  }
  // A ground shockwave: dust and a ring of sparks
  function tiShock(x, z, r) {
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; fwColor.setHSL(0.09, 0.2, 0.55); fwParticle(x + Math.cos(a) * r * 0.9, 0.2, z + Math.sin(a) * r * 0.9, Math.cos(a) * 3, 1 + Math.random() * 2, Math.sin(a) * 3, fwColor, 0.9, false); }
    burst(x, 0.5, z, 20, 6); sfx('slam'); G.shake = Math.max(G.shake, 0.35);
  }

  // ----- the brain -----
  function tiPick(c, d) {
    const K = c.K, hy = player.position.y, low = hy < 2.2, r = Math.random();
    if (K.boss) {
      if (!low && d < 14 && hy < K.H * 1.1) return 'swat';
      if (c.tollCd <= 0 && c.summoned < 3 && d < 30) return 'toll';
      if (d < 10 && low) return r < 0.5 ? 'stomp' : 'sweep';
      if (d < 18 && low) return 'sweep';
      return null;
    }
    if (K.H < 6) { if (d < 2.6) return 'claw'; if (d > 3.5 && d < 9 && low) return 'lunge'; return null; }
    if (!low) { if (d < 8.5 && hy < K.H * 1.15) return r < 0.6 ? 'swat' : 'grab'; return null; }
    if (d < 6.2) return r < 0.4 ? 'stomp' : r < 0.75 ? 'sweep' : 'grab';
    if (d < 11) return r < 0.6 ? 'grab' : null;
    return null;
  }
  const TI_GATE = new THREE.Vector3(0, 0, 1.8), tiSiege = new THREE.Vector3(), tiPort = new THREE.Vector3();
  function tiBrain(c, dt, d) {
    const K = c.K, pp = player.position, tt = uTime.value;
    c.pos.y = 0; c.rend = 0; c.venom = 0;
    const alive = G.state !== 'dead' && G.state !== 'won' && P.hp > 0;
    let moving = false;
    if (c.stun > 0) {
      c.slump += (1 - c.slump) * Math.min(1, dt * 6); c.atk = null; c.pose = null;
    } else {
      c.slump = Math.max(0, c.slump - dt * 2.5);
      if (c.ridden > 0) c.ridden -= dt;
      if (c.atk) tiRun(c, dt);
      else {
        c.cool -= dt; c.tollCd -= dt;
        const sheltered = pp.z > TI_WALL_Z0 - 0.5, onWall = sheltered && pp.z < TI_WALL_Z1 + 0.5, sight = K.sight;
        let goal = null, engage = false;
        if (K.boss && !TITAN.breached && !(d < 16 && !sheltered)) goal = TI_GATE;
        else if (alive && d < sight) {
          engage = true;
          if (sheltered && (!TITAN.breached || onWall)) goal = tiSiege.set(clamp(pp.x, -58, 58), 0, 1.8);
          else if (sheltered && c.pos.z < TI_WALL_Z1 + 0.5) goal = Math.abs(c.pos.x) > 4 && c.pos.z < 3 ? tiPort.set(0, 0, 1.8) : tiPort.set(0, 0, 12);
          else goal = pp;
        }
        if (goal) {
          const gd = flatDist(c.pos, goal), small = K.H < 6, want = goal === pp ? (small ? 1.8 : pp.y > 2.2 ? 3.5 : 5) : 1.2;
          // On its way to a point it faces that point; once there (or when chasing the hero) it faces the hero
          tiTurn(c, goal !== pp && gd > want + 1 && goal !== TI_GATE ? goal : goal === TI_GATE ? goal : pp, K.turn, dt);
          const toward = yawTo(c.pos, goal), off = Math.abs(angDiff(c.facing, toward));
          if (gd > want && (off < 1.2 || small)) { const f = fwdOf(small ? toward : c.facing); moving = tiStep(c, f.x, f.z, K.speed * (K.boss && c.enraged ? 1.3 : 1) * hasteOf(c) * dt); }
          if (K.boss && goal === TI_GATE && gd <= 4.5 && c.cool <= 0) tiStart(c, 'pound');
          else if (c.cool <= 0 && engage && c.ridden <= 0) { const kind = tiPick(c, d); if (kind) tiStart(c, kind); }
        } else if (flatDist(c.pos, c.wander) < 1.2) c.wander.set(c.home.x + (Math.random() - 0.5) * 24, 0, clamp(c.home.z + (Math.random() - 0.5) * 24, -62, 0));
        else { tiTurn(c, c.wander, K.turn * 0.6, dt); const f = fwdOf(c.facing); moving = tiStep(c, f.x, f.z, K.speed * 0.4 * dt); }
      }
    }
    tiPose(c, dt, moving, tt);
    tiNapePos(c, c.nape.pos); c.nape.facing = c.facing;
    c.g.rotation.y = c.facing;
    if (Math.abs(pp.y - c.pos.y) < 1.5) pushPlayerOut(c, K.radius * 0.75);
  }
  CREEP_AI_FN.gaunt = CREEP_AI_FN.runt = CREEP_AI_FN.bellringer = tiBrain;

  // The nape-knot only pulses and follows; the giant moves it
  CREEP_AI_FN.nape = (n, dt) => {
    const c = n.owner, tt = uTime.value;
    if (!c.alive) { n.alive = false; n.g.visible = false; return; }
    n.rend = 0; n.stun = 0; n.hp = n.max = 1e9; n.aware = true;
    n.core.scale.setScalar(1 + Math.sin(tt * 9 + c.home.x) * 0.15 + n.flash * 0.7); n.ring.rotation.x += dt * 2.4; n.ring.rotation.y += dt * 1.7;
    n.g.rotation.y = 0;
  };

  // ----- poses -----
  function tiPose(c, dt, moving, tt) {
    const K = c.K, S = K.H / 10, P0 = c.pose;
    c.amp += ((moving ? 1 : 0) - c.amp) * Math.min(1, dt * 6);
    c.walkPh += dt * Math.min(14, K.speed / (1.1 * S)) * (moving ? 1 : 0.3);
    const sw = Math.sin(c.walkPh) * c.amp;
    c.legs[0].rotation.x = sw * 0.5; c.legs[1].rotation.x = -sw * 0.5;
    const arms = c.arms; arms[0].rotation.set(-sw * 0.28, 0, 0); arms[1].rotation.set(sw * 0.28, 0, 0);
    c.tor.rotation.set(0, 0, 0);
    let lean = 0.05 * c.amp + 0.55 * c.slump;
    if (c.bell && !(P0 && P0.kind === 'toll')) c.bell.rotation.z = Math.sin(tt * 3 + c.walkPh * 0.5) * 0.12 * (0.4 + c.amp);
    if (P0) {
      const e = P0.e;
      if (P0.kind === 'stomp') { c.legs[1].rotation.x = -1.2 * e; lean = -0.1 * e; arms[0].rotation.x = arms[1].rotation.x = -0.6 * e; }
      else if (P0.kind === 'sweep') { arms[1].rotation.set(0, 0, 1.5 * e); c.tor.rotation.y = P0.rec ? 0.9 : -0.8 * e; }
      else if (P0.kind === 'grab') { arms[1].rotation.set(-1.5 * e, 0, 0); lean = 0.35 * e; }
      else if (P0.kind === 'swat') { arms[1].rotation.set(P0.rec ? -0.3 : -3.0 * e, 0, 0); lean = 0.1 * e; }
      else if (P0.kind === 'lunge') { lean = 0.5 * e; arms[0].rotation.x = arms[1].rotation.x = -1.0 * e; }
      else if (P0.kind === 'claw') { arms[1].rotation.set(-2.0 * e, 0, 0); }
      else if (P0.kind === 'toll') { arms[0].rotation.x = arms[1].rotation.x = -2.6 * e; c.head.rotation.x = -0.5 * e; }
      else if (P0.kind === 'pound') { arms[0].rotation.x = arms[1].rotation.x = -3.0 * e; lean = -0.15 * e; }
    }
    c.head.rotation.x = P0 && P0.kind === 'toll' ? c.head.rotation.x : 0.1 + 0.5 * c.slump;
    c.body.rotation.x += (lean - c.body.rotation.x) * Math.min(1, dt * 8);
    c.body.position.y = Math.abs(Math.sin(c.walkPh)) * 0.05 * S * c.amp;
  }
