  // ---------- Waves and raiders: chasing waves in every world, dragons and dinosaurs ----------
  // Waves: every 90 s (60 s in Ashfall, where they come as hordes) the world's own creatures pour in around the hero
  // and run them down. Each wave in a world is bigger than the last; clearing one pays out.
  // Raiders: every two to three minutes a dragon or dinosaur hunts the hero, scaled to the hero's level.
  Object.assign(WORLD_BUILD, {
    crawler: buildCrawler, wisp: buildWisp,
    raptor() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const hide = lam(0x7a6a3a), stripe = lam(0x3a2a1a), eye = bas(0xffd84a);
      const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), hide); torso.scale.set(0.8, 0.8, 1.6); torso.position.y = 1.0; body.add(torso);
      box(0.5, 0.06, 0.5, 0, 1.3, -0.1, stripe, body);
      const neck = box(0.2, 0.5, 0.2, 0, 1.35, 0.6, hide, body); neck.rotation.x = 0.6;
      box(0.28, 0.24, 0.6, 0, 1.6, 0.95, hide, body); [-0.09, 0.09].forEach(x => sph(0.04, eye, body, x, 1.68, 1.15));
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6), hide); tail.rotation.x = -Math.PI / 2 - 0.15; tail.position.set(0, 1.05, -1.2); body.add(tail);
      const legs = [-0.18, 0.18].map(x => box(0.1, 0.9, 0.12, x, 0.45, 0.05, stripe, body));
      return { g, body, legs };
    }
  });
  Object.assign(CREEP_NAME, { raptor: 'Razorclaw', rot: 'Necrophous' });
  Object.assign(CREEP_BASE, { raptor: 70 });
  WORLDS.ash.bossName = 'Necrophous';
  WORLDS.ash.bossLine = 'The graves split open. Necrophous, lord of the underworld, rises in the old churchyard with the Ember Shard in its chest, and the dead rise with it.';
  creeps.forEach(c => { if (c.type === 'rot') c.godName = 'Necrophous'; });

  const WAVE_KINDS = { material: ['crawler', 'wisp'], veyra: ['skitter', 'spore'], neon: ['runner', 'drone'], ash: ['shambler', 'bloater'] };
  const wavePool = {};
  Object.entries({ material: 12, veyra: 12, neon: 12, ash: 30 }).forEach(([w, n]) => {
    wavePool[w] = [];
    for (let i = 0; i < n; i++) {
      const melee = i % 4 !== 3, c = addWorldCreep(WAVE_KINDS[w][melee ? 0 : 1], w, melee ? 'melee' : 'ranged', { wave: true, respawn: Infinity });
      c.body0 = c.body.position.y; wavePool[w].push(c);
    }
  });
  const raptors = Array.from({ length: 14 }, () => { const c = addWorldCreep('raptor', 'material', 'melee', { wave: true, respawn: Infinity, speed: 1.7 }); c.body0 = 0; return c; });
  // Puts a pooled creep into play at p, optionally climbing out of the ground
  function raiseMob(c, p, lvBonus, rise) {
    spawnCreep(c); if (!c.alive) return false;
    c.pos.set(p.x, Math.min(0, groundAt(p.x, p.z)), p.z); c.home.copy(c.pos); c.wander.copy(c.pos); c.cool = 1.2;
    if (lvBonus) { c.lv += lvBonus; c.max = 1; creepStats(c); }
    c.rise = rise ? 1 : 0; if (rise) { c.stun = 1; burst(p.x, 0.2, p.z, 14, 3); }
    c.g.visible = c.realm === realmKey();
    return true;
  }
  function dropMob(c) { c.alive = false; c.g.visible = false; c.bar.hidden = true; c.tele.hide(); c.atk = null; c.rise = 0; if (c.body0 !== undefined) c.body.position.y = c.body0; }
  // Summons up to n creatures from a world's pool around a point (used by waves and by bosses)
  function summon(w, n, around, r0, r1, rise) {
    const out = [];
    for (const c of wavePool[w]) {
      if (out.length >= n) break; if (c.alive) continue;
      const a = Math.random() * TAU, r = r0 + Math.random() * (r1 - r0), p = V3(around.x + Math.cos(a) * r, around.z + Math.sin(a) * r);
      if (groundAt(p.x, p.z) > 0.4) continue;
      if (raiseMob(c, p, 0, rise)) out.push(c);
    }
    return out;
  }

  // Telegraphed ground strikes, shared by raiders and bosses: a circle or a lane that lands after `wind` seconds
  const strikes = [], strikeTeles = Array.from({ length: 24 }, () => makeTele());
  function groundStrike(o) {
    const tele = strikeTeles.find(t => !strikes.some(s => s.tele === t)); if (!tele) return;
    strikes.push(Object.assign({ t: 0, wind: 1, r: 2.4, dmg: 20, kb: 6, src: null, y: Math.max(0, P.y) }, o, { tele }));
  }
  function updateStrikes(dt) {
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i]; s.t += dt; const k = s.t / s.wind;
      if (s.lane) s.tele.lane(s.at, s.facing, s.len, s.w, k, s.y); else s.tele.circle(s.at.x, s.y, s.at.z, s.r, k);
      if (k < 1) continue;
      s.tele.hide(); strikes.splice(i, 1);
      let hit;
      if (s.lane) {
        const f = fwdOf(s.facing), rx = player.position.x - s.at.x, rz = player.position.z - s.at.z, along = rx * f.x + rz * f.z;
        hit = along > 0 && along < s.len && Math.abs(rx * f.z - rz * f.x) < s.w / 2 + 0.3;
        for (let d = 0; d < s.len; d += 2) burst(s.at.x + f.x * d, s.y + 0.3, s.at.z + f.z * d, 3, 4);
      } else { hit = flatDist(player.position, s.at) < s.r + 0.3; burst(s.at.x, s.y + 0.3, s.at.z, 22, 6); }
      sfx(s.sound || 'boom'); G.shake = Math.max(G.shake, 0.25);
      if (hit && Math.abs(player.position.y - s.y) < 2.2 && hitPlayer(s.dmg, s.at, s.kb, false, s.src)) strikeEffects(s);
      if (s.fire) addPatch(s.at.x, s.y, s.at.z, s.r * 0.7, false, s.fireLife);
    }
  }
  function clearStrikes() { strikes.forEach(s => s.tele.hide()); strikes.length = 0; }

  // Raiders: two dragons, a tyrant and a raptor pack
  function buildDragon(col, wingCol) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = lam(col), wingM = bas(wingCol, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), eye = bas(0xfff2a0);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skin); torso.scale.set(0.9, 0.8, 2); body.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.8, 6), skin); neck.rotation.x = 1.0; neck.position.set(0, 0.6, 2.2); body.add(neck);
    box(0.7, 0.55, 1.2, 0, 1.15, 3.1, skin, body); [-0.22, 0.22].forEach(x => sph(0.09, eye, body, x, 1.35, 3.55));
    [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 4), skin); h.position.set(s * 0.25, 1.6, 2.7); h.rotation.x = -0.8; body.add(h); });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.4, 6), skin); tail.rotation.x = -Math.PI / 2; tail.position.z = -3.4; body.add(tail);
    const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.7, 0.4, 0.3); body.add(w); const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), wingM); m.rotation.x = -Math.PI / 2; m.position.x = s * 2.1; w.add(m); return w; });
    return { g, body, wings, mouth: new THREE.Vector3(0, 1.2, 3.8) };
  }
  function buildRex() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = lam(0x5a6a3a), belly = lam(0x8a8a5a), tooth = bas(0xf0ead0), eye = bas(0xff8a3a);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), skin); torso.scale.set(0.9, 1, 1.7); torso.position.y = 2.6; body.add(torso);
    box(1.4, 0.4, 2, 0, 2.0, 0.3, belly, body);
    const head = new THREE.Group(); head.position.set(0, 3.6, 2.4); body.add(head);
    box(1, 0.8, 1.8, 0, 0.2, 0.5, skin, head); const jaw = box(0.9, 0.3, 1.6, 0, -0.35, 0.5, skin, head);
    for (let i = 0; i < 5; i++) box(0.06, 0.18, 0.06, -0.35 + i * 0.17, -0.12, 1.35, tooth, head);
    [-0.35, 0.35].forEach(x => sph(0.09, eye, head, x, 0.45, 0.9));
    const legs = [-0.7, 0.7].map(x => box(0.5, 2.0, 0.6, x, 1.0, -0.2, skin, body));
    [-0.6, 0.6].forEach(x => box(0.12, 0.5, 0.12, x, 2.4, 1.6, skin, body).rotation.x = 0.8);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 7), skin); tail.rotation.x = -Math.PI / 2 - 0.15; tail.position.set(0, 2.7, -3.2); body.add(tail);
    return { g, body, legs, jaw, head };
  }
  const RAIDER = {
    wyrm: { name: 'Ashwing Wyrm', fly: true, hp: 1400, build: () => buildDragon(0x8a2a1a, 0xff7a3a), line: 'A dragon dives out of the clouds. Its fire sets you burning and leaves the ground ablaze. Hit it when it lands.' },
    rime: { name: 'Rimefang Wyvern', fly: true, hp: 1200, build: () => buildDragon(0x4a7a9a, 0xbfe8ff), line: 'A frost wyvern circles overhead. Its cold slows you whenever it is near, and its breath freezes you solid. Hit it when it lands.' },
    rex: { name: 'Tyrant Rex', fly: false, hp: 2000, build: buildRex, line: 'The ground shakes. A tyrant lizard is charging straight at you.' }
  };
  const raiders = Object.entries(RAIDER).map(([type, d]) => {
    const parts = d.build(); parts.g.visible = false; scene.add(parts.g); tag(parts.g, 2);
    const bar = document.createElement('div'); bar.className = 'cbar anc'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    return Object.assign(parts, { type, name: d.name, fly: d.fly, base: d.hp, isRaider: true, alive: false, pos: parts.g.position, radius: d.fly ? 2.2 : 1.8, hitY: d.fly ? 1 : 2.4, markY: d.fly ? 3 : 6,
      hp: 1, max: 1, pow: 1, lv: 1, facing: 0, state: 'circle', t: 0, cool: 3, ang: 0, where: null, tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span') });
  });
  G.raid = null; G.raidClock = 0; G.raidNext = 130; G.wave = null; G.waveClock = 0; G.waveN = {};
  const canSpawnTrouble = () => (G.state === 'explore' || G.state === 'interlude') && G.realm === 'material' && !G.hunt && !G.royalHunt && !G.story.pending && !storyBossEngaged() && !G.storm;
  const lvOfHero = add => PR.level + add;

  function startRaid() {
    const pick = ['wyrm', 'rime', 'rex', 'pack'][Math.floor(Math.random() * 4)];
    G.raidClock = 0; G.raidNext = 110 + Math.random() * 60;
    if (pick === 'pack') {
      // The pack grows with the hero's level, runs faster with it, and gets faster still the longer the hunt lasts
      const mobs = [], n = Math.min(14, 5 + Math.floor(PR.level / 3)), haste = Math.min(1.8, 1 + 0.03 * PR.level);
      for (const c of raptors) {
        if (mobs.length >= n) break;
        c.realm = realmKey(); const p = ringSpot(16, 22); if (p && raiseMob(c, p, Math.max(0, PR.level - worldTier()))) { c.haste = haste; mobs.push(c); }
      }
      if (!mobs.length) return;
      G.raid = { pack: mobs, t: 60, frenzy: 15 };
      showBanner('Raptors!', `A Razorclaw pack of ${mobs.length} has your scent. They are fast and grow faster the longer the hunt runs. Stand your ground or jump over them.`, 'title');
    } else {
      const r = raiders.find(x => x.type === pick), p = ringSpot(20, 26); if (!p) return;
      r.lv = lvOfHero(r.fly ? 2 : 1); r.max = Math.round(r.base * (1 + 0.3 * (r.lv - 1))); r.hp = r.max; r.pow = 1.1 + 0.15 * (r.lv - 1);
      Object.assign(r, { alive: true, where: realmKey(), state: r.fly ? 'circle' : 'chase', t: 0, cool: 2.5, ang: Math.atan2(p.z - player.position.z, p.x - player.position.x) });
      r.pos.set(p.x, r.fly ? 12 : 0, p.z); r.g.visible = true; r.body.rotation.set(0, 0, 0);
      G.raid = { r, t: 75 };
      showBanner(r.name, RAIDER[pick].line, 'title');
    }
    bannerTimer = 3.5; sfx('roar'); G.shake = Math.max(G.shake, 0.5);
  }
  function endRaid(msg) {
    const R = G.raid; if (!R) return;
    G.raid = null;
    if (R.pack) R.pack.forEach(c => { if (c.alive) dropMob(c); });
    if (R.r) { R.r.alive = false; R.r.g.visible = false; R.r.tele.hide(); R.r.bar.hidden = true; }
    if (msg) { showBanner('The raid is over', msg, 'title'); bannerTimer = 3; }
  }
  function damageRaider(r, dmg, poiseDmg, heavy) {
    if (!r.alive) return;
    const out = Math.round(dmg * (0.9 + Math.random() * 0.2) * (r.state === 'rest' ? 1.4 : 1) * (P.buffDmg > 0 ? 1.5 : 1));
    r.hp -= out; G.hitstop = heavy ? 0.08 : 0.04;
    const at = r.pos.clone().add(new THREE.Vector3(0, r.hitY + 0.6, 0)); burst(at.x, at.y, at.z, 14, 5); floatText(String(out), at, heavy ? 'big' : '');
    sfx(heavy ? 'heavyhit' : 'hit');
    if (r.hp > 0) return;
    const m = 1 + 0.3 * (r.lv - 1);
    burst(r.pos.x, r.pos.y + 1, r.pos.z, 60, 8); sfx('roar'); G.slow = 0.6;
    reward(240 * m, 200 * m, at.clone().setY(at.y + 1));
    dropGear(r.pos, 2); if (G.target === r) G.target = null;
    endRaid(`${r.name} is slain. It dropped something.`);
  }
  // A flying raider circles high, then attacks and lands; it can only be hit while low
  function updateRaider(r, dt) {
    const tt = uTime.value, pp = player.position, d = flatDist(pp, r.pos);
    r.g.visible = r.where === realmKey();
    if (!r.g.visible) return;
    r.t += dt; r.cool -= dt;
    if (r.wings) r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(tt * (r.state === 'rest' ? 2 : 7)) * 0.5; });
    // Rimefang's frost aura: within 20 m the hero is slowed a little, all the time
    if (r.type === 'rime') {
      if (Math.random() < 0.6) { fwColor.setHSL(0.55, 0.5, 0.85); fwParticle(r.pos.x + (Math.random() - 0.5) * 4, r.pos.y + Math.random() * 2, r.pos.z + (Math.random() - 0.5) * 4, 0, -1.2, 0, fwColor, 0.8, true); }
      if (d < 20 && G.state !== 'dead') { chillHero(0.3, 0.2, false); if (Math.random() < 0.25) { fwColor.setHSL(0.55, 0.6, 0.9); fwParticle(pp.x + (Math.random() - 0.5) * 3, pp.y + 2.5, pp.z + (Math.random() - 0.5) * 3, 0, -1, 0, fwColor, 0.9, true); } }
    }
    const toward = (sp, minD) => { r.facing += clamp(angDiff(r.facing, yawTo(r.pos, pp)), -3 * dt, 3 * dt); if (d > minD) { const f = fwdOf(r.facing); r.pos.x += f.x * sp * dt; r.pos.z += f.z * sp * dt; } };
    if (r.fly) {
      if (r.state === 'circle') {
        r.ang += dt * 0.7; const tx = pp.x + Math.cos(r.ang) * 15, tz = pp.z + Math.sin(r.ang) * 15;
        r.facing = Math.atan2(tx - r.pos.x, tz - r.pos.z); r.pos.x += (tx - r.pos.x) * Math.min(1, dt * 1.5); r.pos.z += (tz - r.pos.z) * Math.min(1, dt * 1.5);
        r.pos.y += (10 - r.pos.y) * Math.min(1, dt * 2); r.body.rotation.z = -0.3;
        if (r.cool <= 0) {
          r.body.rotation.z = 0; r.t = 0;
          if (r.type === 'wyrm' && Math.random() < 0.55) { r.state = 'strafe'; r.from = r.pos.clone(); r.facing = yawTo(r.pos, pp); r.lane = { at: r.pos.clone().setY(0), facing: r.facing }; r.tele.lane(r.lane.at, r.facing, 30, 3.2, 0, Math.max(0, P.y)); }
          else { r.state = 'hover'; }
        }
      } else if (r.state === 'strafe') {
        // Wind-up on the lane, then a low fire run along it
        if (r.t < 1) { r.tele.lane(r.lane.at, r.lane.facing, 30, 3.2, r.t, Math.max(0, P.y)); r.pos.y += (3 - r.pos.y) * Math.min(1, dt * 3); }
        else {
          r.tele.hide(); const f = fwdOf(r.lane.facing); r.pos.x += f.x * 24 * dt; r.pos.z += f.z * 24 * dt; r.pos.y = 2.4; r.facing = r.lane.facing;
          // The fire trail burns for five seconds and sets alight whoever steps in it
          if (Math.random() < dt * 9) { addPatch(r.pos.x, 0, r.pos.z, 1.6, false, 5); patches[patches.length - 1].burns = r.pow; }
          if (!r.hitDone && d < 2.6 && Math.abs(pp.y - r.pos.y) < 3) { r.hitDone = true; hitPlayer(26, r.pos, 10, false, r); }
          if (r.t > 2.3) { r.state = 'rest'; r.t = 0; r.hitDone = false; }
        }
      } else if (r.state === 'hover') {
        // Close in low and breathe: fire for the wyrm (sets the hero burning, leaves burning ground), frost for the wyvern (freezes, then chills)
        toward(9, 8); r.pos.y += (2.2 - r.pos.y) * Math.min(1, dt * 3);
        if (r.t > 0.8 && !r.breathed) {
          r.breathed = true; const fire = r.type === 'wyrm';
          const fx = fire ? { fire, fireLife: 5, burn: 5, burnDps: 6 * r.pow } : { chill: 0.45, chillT: 4, chillWord: 'CHILLED' };
          for (let i = 0; i < 3; i++) groundStrike(Object.assign({ at: pp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), r: 2.6, wind: 1 + i * 0.25, dmg: 20, kb: 6, src: r, freeze: fire ? 0 : 0.9 }, fx));
          groundStrike(Object.assign({ at: r.pos.clone().setY(0), lane: true, facing: yawTo(r.pos, pp), len: 12, w: 4, wind: 1.1, dmg: 24, kb: 8, src: r, freeze: fire ? 0 : 1.1 }, fx));
        }
        if (r.t > 2.4) { r.state = 'rest'; r.t = 0; r.breathed = false; }
      } else if (r.state === 'rest') {
        // Landed and open to attack
        r.pos.y += (1.4 - r.pos.y) * Math.min(1, dt * 4); r.facing += clamp(angDiff(r.facing, yawTo(r.pos, pp)), -1.5 * dt, 1.5 * dt);
        if (r.t > 3.2) { r.state = 'circle'; r.t = 0; r.cool = 3 + Math.random() * 2; r.ang = Math.atan2(r.pos.z - pp.z, r.pos.x - pp.x); }
      }
    } else {
      // The tyrant: chase, bite up close, charge from range, roar to knock back
      const step = sp => { const f = fwdOf(r.facing), nx = r.pos.x + f.x * sp * dt, nz = r.pos.z + f.z * sp * dt; if (groundAt(nx, nz) < 0.6) { r.pos.x = nx; r.pos.z = nz; } };
      if (r.legs) r.legs.forEach((l, i) => { l.rotation.x = r.state === 'chase' || r.state === 'charge' ? Math.sin(tt * 8 + i * Math.PI) * 0.5 : 0; });
      if (r.state === 'chase') {
        r.facing += clamp(angDiff(r.facing, yawTo(r.pos, pp)), -2.5 * dt, 2.5 * dt); if (d > 3.2) step(4.6);
        if (r.cool <= 0) {
          r.t = 0;
          if (d < 4.5) { r.state = 'bite'; }
          else if (d < 24 && Math.random() < 0.6) { r.state = 'charge'; r.facing = yawTo(r.pos, pp); }
          else { r.state = 'roar'; }
        }
      } else if (r.state === 'bite') {
        r.jaw.rotation.x = r.t < 0.6 ? 0.5 * r.t / 0.6 : 0; const front = r.pos.clone().addScaledVector(fwdOf(r.facing), 3);
        r.tele.circle(front.x, 0, front.z, 2.2, r.t / 0.6);
        if (r.t >= 0.6 && !r.hitDone) { r.hitDone = true; r.tele.hide(); sfx('heavyhit'); if (flatDist(pp, front) < 2.5 && pp.y < 2.5) hitPlayer(34, front, 12, true, r); }
        if (r.t > 1.3) { r.state = 'chase'; r.cool = 1.4; r.hitDone = false; }
      } else if (r.state === 'charge') {
        if (r.t < 0.8) r.tele.lane(r.pos, r.facing, 22, 3, r.t / 0.8, 0);
        else { r.tele.hide(); step(19); if (!r.hitDone && d < 2.8 && pp.y < 2.5) { r.hitDone = true; hitPlayer(30, r.pos, 16, true, r); } }
        if (r.t > 1.9) { r.state = 'rest'; r.t = 0; r.hitDone = false; }
      } else if (r.state === 'roar') {
        r.head.rotation.x = -0.4;
        if (!r.hitDone && r.t > 0.6) { r.hitDone = true; spawnWave(r.pos.x, r.pos.z); sfx('roar'); G.shake = Math.max(G.shake, 0.6); floatText('ROAR', r.pos.clone().add(new THREE.Vector3(0, 6, 0)), 'word'); }
        if (r.t > 1.4) { r.head.rotation.x = 0; r.state = 'chase'; r.cool = 1.6; r.hitDone = false; }
      } else if (r.state === 'rest') {
        // Winded after a charge: a window to punish
        r.body.rotation.z = Math.sin(tt * 3) * 0.05;
        if (r.t > 2) { r.body.rotation.z = 0; r.state = 'chase'; r.cool = 1.2; }
      }
      r.pos.y = Math.max(0, Math.min(0.5, groundAt(r.pos.x, r.pos.z)));
    }
    r.g.rotation.y = r.facing;
    if (d < 45) {
      const sp = project(r.pos.clone().setY(r.pos.y + r.markY)); r.bar.hidden = !sp.ok;
      if (sp.ok) { r.bar.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`; r.barFill.style.width = (r.hp / r.max * 100) + '%'; const t = `${r.name}${r.state === 'rest' ? ' (open!)' : ''} · Lv ${r.lv}`; if (r.barLabel.textContent !== t) r.barLabel.textContent = t; }
    } else r.bar.hidden = true;
  }

  function startWave() {
    const w = realmKey(), n = (G.waveN[w] || 0) + 1, horde = w === 'ash';
    const size = horde ? Math.min(30, 8 + 3 * n) : Math.min(12, 4 + 2 * n), bonus = Math.floor(n / 3);
    const mobs = [];
    for (const c of wavePool[w]) {
      if (mobs.length >= size) break; if (c.alive) continue;
      const p = ringSpot(22, 30) || ringSpot(12, 22); if (p && raiseMob(c, p, bonus, horde)) mobs.push(c);
    }
    G.waveClock = 0; if (!mobs.length) return;
    G.waveN[w] = n; G.wave = { w, n, mobs, t: 120, size: mobs.length };
    showBanner(horde ? `Horde ${n}` : `Wave ${n}`, horde ? `${mobs.length} of the dead claw out of the ash and come for you.` : `${mobs.length} creatures close in from every side.`, 'title'); bannerTimer = 3; sfx('roar');
  }
  function endWave(cleared) {
    const V = G.wave; if (!V) return;
    G.wave = null; G.waveClock = 0;
    if (!cleared) { V.mobs.forEach(c => { if (c.alive) dropMob(c); }); return; }
    const m = tierMult(worldTier()) * (1 + 0.15 * V.n);
    reward(70 * m * V.size / 4, 55 * m * V.size / 4, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)));
    showBanner(`${V.w === 'ash' ? 'Horde' : 'Wave'} ${V.n} cleared`, 'The next one will be bigger.', 'title'); bannerTimer = 2.5;
    dropGear(player.position, 1, 0.35);
  }
  function waveText() {
    if (G.wave) { const left = G.wave.mobs.filter(c => c.alive).length; return `${G.wave.w === 'ash' ? 'Horde' : 'Wave'} ${G.wave.n} · ${left} left.`; }
    if (G.raid) return G.raid.pack ? `Raptors · ${G.raid.pack.filter(c => c.alive).length} left.` : `${G.raid.r.name} · bring it down (${fmtTime(Math.ceil(G.raid.t))}).`;
    return '';
  }

  let lastPlace = 'material';
  // Runs every unpaused frame from updateWorlds
  function troubleTick(dt, real) {
    const place = realmKey();
    if (place !== lastPlace) { lastPlace = place; clearStrikes(); endWave(false); if (G.raid) endRaid(); }
    updateStrikes(dt); mkTick(dt);
    // Standing in a burning trail sets the hero alight
    if (P.iframe <= 0 && P.burn <= 0.5 && G.state !== 'dead') for (const p of patches) if (p.burns && Math.abs(player.position.y - p.m.position.y) < 1 && flatDist(player.position, p.m.position) < p.r) { burnHero(3, 4 * p.burns); break; }
    // Summoned creatures climbing out of the ground
    creeps.forEach(c => { if (c.rise > 0 && c.alive) { c.rise = Math.max(0, c.rise - dt * 1.2); c.body.position.y = c.body0 - 1.8 * c.rise; if (Math.random() < 0.3) burst(c.pos.x, 0.1, c.pos.z, 1, 2); } });
    if (G.state === 'dead') { endWave(false); if (G.raid) endRaid(); return; }
    if (G.wave) {
      G.wave.t -= real;
      if (!G.wave.mobs.some(c => c.alive)) endWave(true);
      else if (G.wave.t <= 0) endWave(false);
    } else if (canSpawnTrouble() && !G.raid) {
      G.waveClock += dt;
      if (G.waveClock >= (place === 'ash' ? 60 : 90)) startWave();
    }
    if (G.raid) {
      G.raid.t -= real;
      if (G.raid.r) { updateRaider(G.raid.r, dt); if (G.raid && G.raid.t <= 0) endRaid(`${G.raid.r.name} loses interest and leaves.`); }
      else if (!G.raid.pack.some(c => c.alive)) { dropGear(player.position, 1, 0.5); endRaid('The pack is dead.'); }
      else if (G.raid.t <= 0) endRaid('The raptors scatter.');
      else if ((G.raid.frenzy -= dt) <= 0) {
        G.raid.frenzy = 15; G.raid.pack.forEach(c => { if (c.alive) c.haste += 0.08; });
        floatText('The pack grows frenzied', player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ff8a3a');
      }
    } else if (canSpawnTrouble() && !G.wave) {
      G.raidClock += dt;
      if (G.raidClock >= G.raidNext) startRaid();
    }
  }
  function resetTrouble() { endWave(false); endRaid(); clearStrikes(); G.waveN = {}; G.waveClock = 0; G.raidClock = 0; G.raidNext = 130; }
