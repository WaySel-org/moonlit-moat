  // ---------- Neon Verge bestiary: gyrocopters and an engaging machine ecology (Agent: neon) ----------
  // Two factions fight over the dead city, and the hero is everyone's enemy:
  //   MACHINES   Chrome Runner, Patrol Drone (old), Rotorjack gyrocopter, Hushcaster jammer, Aegis Drone, Gantry Walker
  //   SCAVENGERS Scrapper and Slinger bands (human survivors) camped around the streets
  // Everything lives in this one file: new creeps are added with addWorldCreep, brains go in CREEP_AI_FN,
  // and the per-frame glue (mines, searchlights, shields, shots, fire, skirmishes, events) runs from WORLD_TICKS.
  const NEON = WORLDS.neon;
  const NMACH = { runner: 1, drone: 1, gyro: 1, jammer: 1, aegis: 1, walker: 1 }, NSCAV = { scrapper: 1, slinger: 1 };
  const NB = { shots: [], mines: [], fires: [], camps: [], evT: 55, sweepOnT: 0, warnT: 0, lit: 0 };
  const NJAM = { z: 'Dagger', v: 'Volley', x: 'Leap', h: 'Blade Spin', g: 'Moonhook' };
  Object.assign(CREEP_NAME, { gyro: 'Rotorjack', jammer: 'Hushcaster', aegis: 'Aegis Drone', scrapper: 'Scrapper', slinger: 'Slinger', walker: 'Gantry Walker' });
  Object.assign(CREEP_BASE, { gyro: 62, jammer: 44, aegis: 38, scrapper: 74, slinger: 44, walker: 420 });
  Object.assign(CREEP_XP, { gyro: 30, jammer: 28, aegis: 26, scrapper: 22, slinger: 20, walker: 90 });

  // ----- helpers -----
  const nbTeam = c => NSCAV[c.type] ? 'scav' : 'mach';
  const nbIsFoe = (c, o) => o !== c && o.alive && o.realm === 'neon' && (nbTeam(c) === 'scav' ? NMACH[o.type] : NSCAV[o.type]);
  const nbPseudo = m => ({ isCreep: true, mult: m || 1, tele: { hide() {} } });
  const nbTp = t => t === 'hero' ? player.position : t.pos;
  function nbFoe(c, range, ground) {
    let best = null, bd = range;
    for (const o of creeps) {
      if (!nbIsFoe(c, o)) continue;
      if (ground && o.type === 'gyro' && o.pos.y > 2.6) continue; // a melee fighter can't reach a gyrocopter in the sky
      const d = flatDist(c.pos, o.pos); if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  // 'hero', an opposing creep, or null. air = ignores a hero who is up in the air (gyrocopters see from above)
  function nbTgt(c, d, R, air, ground) {
    const see = (d < R || c.commandT > 0) && !c.leash && G.state !== 'dead' && G.state !== 'won' && G.state !== 'intro' && (air || !heroAloft());
    const foe = nbFoe(c, 13, ground);
    if (foe && (!see || flatDist(c.pos, foe.pos) < d * 0.55)) return foe;
    return see ? 'hero' : null;
  }
  const nbTurn = (c, to, rate, dt) => { c.facing += clamp(angDiff(c.facing, yawTo(c.pos, to)), -rate * dt, rate * dt); };
  function nbLOS(a, b) { for (let i = 1; i < 8; i++) { const k = i / 8; if (NEON.ground(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k) !== 0) return false; } return true; }
  function nbBeam(m, a, b) { m.visible = true; m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.lookAt(b.x, b.y, b.z); m.scale.z = Math.max(0.1, a.distanceTo(b)); }
  function nbMakeBeam(col) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1), bas(col, { transparent: true, opacity: 0.85 })); m.visible = false; scene.add(m); tag(m, 2); return m; }
  // Damage between creeps. It skips damageCreep (that gives the hero XP and loot), so a creep killed here just drops out quietly.
  function nbHurt(t, dmg, src) {
    if (!t.alive) return;
    const out = Math.max(1, Math.round(dmg * (src.mult || 1) * (0.9 + Math.random() * 0.2)));
    t.hp -= out; t.flash = 1;
    const at = t.pos.clone().add(new THREE.Vector3(0, 1 + t.hitY * 0.5, 0));
    burst(at.x, at.y, at.z, 6, 3); floatText(String(out), at, '', '#ffb36a');
    if (t.hp <= 0) nbQuietKill(t);
  }
  function nbQuietKill(c) {
    c.alive = false; c.g.visible = false; c.tele.hide(); c.atk = null; c.bar.hidden = true;
    c.respawn = c.respawnAfter ? c.respawnAfter(c) : 9 + Math.random() * 6;
    if (c.onDeath) c.onDeath(c);
    burst(c.pos.x, c.pos.y + 0.6, c.pos.z, 20, 5); sfx('hit');
    if (G.target === c) G.target = null;
  }
  // An area strike by creep c at (x, z): the hero and every opposing creep inside
  function nbArea(c, x, z, r, dmg, kb, parry) {
    const at = new THREE.Vector3(x, c.pos.y, z);
    if (G.state !== 'dead' && flatDist(player.position, at) < r && Math.abs(player.position.y - Math.max(0, c.pos.y)) < 1.6) hitPlayer(dmg, at, kb, parry, c);
    creeps.forEach(o => { if (nbIsFoe(c, o) && flatDist(o.pos, at) < r + o.radius * 0.6 && Math.abs(o.pos.y - c.pos.y) < 2.6) nbHurt(o, dmg * 0.8, c); });
  }
  function nbShot(c, from, to, speed, dmg, col) {
    const m = new THREE.Mesh(nbShotGeo, bas(col)); m.position.copy(from); scene.add(m); tag(m, 2);
    NB.shots.push({ m, v: to.clone().sub(from).normalize().multiplyScalar(speed), t: 0, c, dmg, team: nbTeam(c) });
  }
  const nbShotGeo = new THREE.SphereGeometry(0.2, 8, 6);

  // ----- shield: an absorbing hp pool stacked on top of the creep's own hp -----
  // damageCreep (not ours to edit) just subtracts from c.hp, so a shield adds S to both c.hp and c.max. Damage then
  // eats the top slice first, and the shield left is c.hp - base. Since c.hp never drops below base while the shield
  // holds, no hit can kill a shielded creep. When hp falls to base the shield is broken; on expiry the slice is removed.
  function nbShield(t, src, secs) {
    if (t.sh) nbUnshield(t, false);
    const S = Math.min(150, Math.round(t.max * 0.5));
    t.sh = { base: t.hp, S, src, t: secs, max: t.max + S };
    t.hp += S; t.max += S;
    if (!t.bub) { t.bub = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bas(0x5af0ff, { transparent: true, opacity: 0.28, depthWrite: false })); t.g.add(t.bub); tag(t.bub, 2); }
    t.bub.scale.setScalar(Math.max(0.9, t.radius * 1.5)); t.bub.position.y = Math.max(0.6, t.hitY + 0.3); t.bub.visible = true;
    floatText('SHIELDED', nbUpV(t.pos, 2.4), 'word', '#5af0ff'); sfx('clang');
  }
  const nbUpV = (v, y) => v.clone().add(new THREE.Vector3(0, y, 0));
  function nbUnshield(t, broken) {
    if (!t.sh) return;
    const left = Math.max(0, t.hp - t.sh.base);
    t.hp = Math.max(1, t.hp - left); t.max = Math.max(1, t.max - t.sh.S); t.hp = Math.min(t.hp, t.max);
    t.sh = null; if (t.bub) t.bub.visible = false;
    if (broken) { floatText('SHIELD BROKEN', nbUpV(t.pos, 2.4), 'word', '#ffd36a'); burst(t.pos.x, t.pos.y + 1, t.pos.z, 18, 5); sfx('clang'); }
  }
  function nbTickShields(dt) {
    creeps.forEach(c => {
      if (!c.sh) return;
      if (!c.alive || c.realm !== 'neon' || c.max !== c.sh.max) { c.sh = null; if (c.bub) c.bub.visible = false; return; } // died, or levelled up and re-rolled its own hp
      c.sh.t -= dt;
      if (c.hp <= c.sh.base) nbUnshield(c, true);
      else if (c.sh.t <= 0) nbUnshield(c, false);
      else if (c.bub) c.bub.material.opacity = 0.22 + 0.1 * Math.sin(uTime.value * 7);
    });
  }

  // ----- gyrocopter mines -----
  const nbMineGeo = new THREE.CylinderGeometry(0.5, 0.58, 0.16, 10), nbLedGeo = new THREE.SphereGeometry(0.13, 6, 4), nbMineMat = lam(0x2a2e36);
  function nbDropMine(c) {
    const g = new THREE.Group(), lm = bas(0xff3a3a);
    const base = new THREE.Mesh(nbMineGeo, nbMineMat); base.position.y = 0.08; g.add(base);
    const led = new THREE.Mesh(nbLedGeo, lm); led.position.y = 0.22; g.add(led);
    g.position.set(c.pos.x, 0, c.pos.z); scene.add(g); tag(g, 2);
    NB.mines.push({ g, led, lm, t: 0, mult: c.mult });
    if (NB.mines.length > 10) nbRemoveMine(NB.mines[0]);
  }
  function nbRemoveMine(m) { scene.remove(m.g); m.lm.dispose(); const i = NB.mines.indexOf(m); if (i >= 0) NB.mines.splice(i, 1); }
  function nbTickMines(dt) {
    for (let i = NB.mines.length - 1; i >= 0; i--) {
      const m = NB.mines[i]; m.t += dt;
      const armed = m.t > 0.9;
      m.lm.color.setHex(armed ? (Math.floor(m.t * 5) % 2 ? 0xff3a3a : 0x5a1010) : 0xffd36a);
      let boom = false;
      if (armed) {
        if (G.state !== 'dead' && flatDist(player.position, m.g.position) < 1.5 && player.position.y < 1.0) boom = true;
        if (!boom) for (const o of creeps) if (o.alive && o.realm === 'neon' && NSCAV[o.type] && flatDist(o.pos, m.g.position) < 1.2) { boom = true; break; }
      }
      if (boom || m.t > 18) {
        if (boom) {
          const p = m.g.position; sfx('boom'); G.shake = Math.max(G.shake, 0.3); burst(p.x, 0.5, p.z, 26, 7);
          if (G.state !== 'dead' && flatDist(player.position, p) < 2.8 && player.position.y < 1.6) hitPlayer(15, p, 9, false, nbPseudo(m.mult));
          creeps.forEach(o => { if (o.alive && o.realm === 'neon' && NSCAV[o.type] && flatDist(o.pos, p) < 2.8) nbHurt(o, 20, nbPseudo(m.mult)); });
        }
        nbRemoveMine(m);
      }
    }
  }

  // ----- gyrocopter searchlight: marks the hero, rallies and commands every machine around it -----
  function nbStartLight(c) {
    c.light = { t: 0, x: player.position.x, z: player.position.z, buff: 0, lit: false };
    floatText('SEARCHLIGHT', nbUpV(c.pos, 1.5), 'word', '#fff2a0'); sfx('swoosh');
  }
  function nbTickLights(dt) {
    NB.lit = Math.max(0, NB.lit - dt);
    creeps.forEach(c => {
      if (c.type !== 'gyro') return;
      const L = c.light;
      if (!L || !c.alive || c.realm !== 'neon') { c.light = null; if (c.beamM) c.beamM.visible = false; if (c.ltele) c.ltele.hide(); return; }
      L.t += dt;
      if (L.t < 1.0) { c.ltele.circle(L.x, 0, L.z, 3.4, L.t / 1.0); c.beamM.visible = false; return; }
      c.ltele.hide();
      const dx = player.position.x - L.x, dz = player.position.z - L.z, dd = Math.hypot(dx, dz), st = Math.min(dd, 3.4 * dt);
      if (dd > 1e-3) { L.x += dx / dd * st; L.z += dz / dd * st; }
      c.beamM.visible = true; c.beamM.position.set(L.x, 15, L.z);
      const lit = G.state !== 'dead' && flatDist(player.position, { x: L.x, z: L.z }) < 3.4;
      if (lit) { NB.lit = 0.3; P.calm = 0; if (!L.lit) { floatText('SPOTTED', nbUpV(player.position, 2.6), 'word', '#fff2a0'); sfx('clang'); } }
      L.lit = lit;
      L.buff -= dt;
      if (L.buff <= 0) {
        L.buff = 0.3;
        creeps.forEach(o => { if (o.alive && o.realm === 'neon' && NMACH[o.type] && o.type !== 'walker' && Math.hypot(o.pos.x - L.x, o.pos.z - L.z) < 24) { o.rallyT = Math.max(o.rallyT || 0, 0.8); if (lit) o.commandT = Math.max(o.commandT || 0, 1.5); } });
      }
      if (L.t > 7.5) c.light = null;
    });
  }

  // ----- shots and fire -----
  function nbTickShots(dt) {
    for (let i = NB.shots.length - 1; i >= 0; i--) {
      const s = NB.shots[i]; s.t += dt; s.m.position.addScaledVector(s.v, dt);
      const p = s.m.position; let done = s.t > 3.2;
      if (Math.random() < 0.4) burst(p.x, p.y, p.z, 1, 1);
      if (!done && p.y < 6 && NEON.ground(p.x, p.z) !== 0) done = true;
      if (!done && G.state !== 'dead' && p.distanceTo(nbUpV(player.position, 1.0)) < 0.8) { done = true; hitPlayer(s.dmg, p, 4, false, s.c); }
      if (!done) for (const o of creeps) {
        if (!o.alive || o.realm !== 'neon' || !(s.team === 'scav' ? NMACH[o.type] : NSCAV[o.type])) continue;
        if (Math.hypot(p.x - o.pos.x, p.z - o.pos.z) < o.radius + 0.3 && Math.abs(p.y - (o.pos.y + o.hitY)) < 1.2) { done = true; nbHurt(o, s.dmg, s.c); break; }
      }
      if (done) { scene.remove(s.m); s.m.material.dispose(); NB.shots.splice(i, 1); }
    }
  }
  const nbFireGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  function nbFire(c, x, z, r, secs) {
    const m = new THREE.Mesh(nbFireGeo, bas(0xff7a2a, { transparent: true, opacity: 0.5, depthWrite: false })); m.position.set(x, 0.05, z); m.scale.setScalar(r); scene.add(m); tag(m, 2);
    NB.fires.push({ m, x, z, r, t: secs, tick: 0, mult: c.mult });
    if (NB.fires.length > 6) nbRemoveFire(NB.fires[0]);
    sfx('boom'); burst(x, 0.4, z, 20, 5);
  }
  function nbRemoveFire(f) { scene.remove(f.m); f.m.material.dispose(); const i = NB.fires.indexOf(f); if (i >= 0) NB.fires.splice(i, 1); }
  function nbTickFires(dt) {
    for (let i = NB.fires.length - 1; i >= 0; i--) {
      const f = NB.fires[i]; f.t -= dt; f.tick -= dt;
      f.m.material.opacity = 0.32 + 0.18 * Math.sin(uTime.value * 12); if (Math.random() < 0.5) burst(f.x + (Math.random() - 0.5) * f.r, 0.3, f.z + (Math.random() - 0.5) * f.r, 1, 2);
      if (f.tick <= 0) {
        f.tick = 0.5;
        if (G.state !== 'dead' && Math.hypot(player.position.x - f.x, player.position.z - f.z) < f.r && player.position.y < 1.5) hitPlayer(5, { x: f.x, y: 0, z: f.z }, 2, false, nbPseudo(f.mult));
        creeps.forEach(o => { if (o.alive && o.realm === 'neon' && NMACH[o.type] && Math.hypot(o.pos.x - f.x, o.pos.z - f.z) < f.r + o.radius * 0.5 && o.pos.y < 2.2) nbHurt(o, 6, nbPseudo(f.mult)); });
      }
      if (f.t <= 0) nbRemoveFire(f);
    }
  }

  // ----- the old machines get into the fight: runners and drones pick on nearby scavengers when the hero isn't around -----
  function nbTickSkirmish(dt) {
    creeps.forEach(c => {
      if (!c.alive || c.realm !== 'neon' || (c.type !== 'runner' && c.type !== 'drone') || c.stun > 0) return;
      c.nbT = Math.max(0, (c.nbT || 0) - dt);
      if (flatDist(c.pos, player.position) < 11 && !heroAloft()) return; // the hero is the bigger prize
      const foe = nbFoe(c, c.type === 'runner' ? 9 : 12);
      if (!foe) return;
      const d = flatDist(c.pos, foe.pos);
      c.facing += clamp(angDiff(c.facing, yawTo(c.pos, foe.pos)), -5 * dt, 5 * dt);
      if (c.type === 'runner') {
        if (d > 1.6) creepMove(c, fwdOf(c.facing), 3.4 * hasteOf(c) * dt);
        else if (c.nbT <= 0) { c.nbT = 1.1; nbHurt(foe, 9, c); sfx('hit'); }
      } else if (c.nbT <= 0) { c.nbT = 2.6; nbShot(c, nbUpV(c.pos, 0), nbUpV(foe.pos, foe.hitY), 9, 6, 0x9fe4ff); }
    });
  }

  // ----- world events: a gyrocopter patrol sweep -----
  function nbTickEvent(dt) {
    NB.warnT = Math.max(0, NB.warnT - dt); NB.sweepOnT = Math.max(0, NB.sweepOnT - dt);
    if (G.state === 'dead' || G.state === 'intro' || G.state === 'won' || G.shop) return;
    NB.evT -= dt;
    if (NB.evT > 0) return;
    NB.evT = 85 + Math.random() * 55;
    if (storyBossEngaged()) { NB.evT = 25; return; }
    const sw = creeps.filter(c => c.sweep);
    if (sw.some(c => c.alive)) return;
    NB.sweepOnT = 3; sw.forEach(c => { c.respawn = 0; });
  }
  // A sweep gyro comes in from the edge of the grid and hunts for half a minute, then leaves
  function nbSweepIn(c) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU, r = 36 + Math.random() * 14, x = player.position.x + Math.cos(a) * r, z = player.position.z + Math.sin(a) * r;
      if (NEON.ground(x, z) === 0) { c.pos.set(x, 4.4, z); break; }
    }
    c.home.copy(c.pos); c.wander.copy(c.pos); c.commandT = 40; c.sweepLife = 28;
    if (NB.warnT <= 0) { NB.warnT = 20; floatText('GYROCOPTER PATROL SWEEP', nbUpV(player.position, 3.2), 'word', '#ffd36a'); sfx('boom'); }
  }

  // ----- scavenger camps: fixed anchors in the streets, with a lit barrel each -----
  function nbAnchor(b) {
    if (NB.camps[b]) return NB.camps[b];
    let a = null;
    for (let i = 0; i < 200 && !a; i++) {
      const x = -64 + Math.random() * 128, z = -64 + Math.random() * 128;
      if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
      if (Math.hypot(x - NEON.spawn.x, z - NEON.spawn.z) < 26 || Math.hypot(x - NEON.gate.x, z - NEON.gate.z) < 16) continue;
      if (NB.camps.some(o => Math.hypot(o.p.x - x, o.p.z - z) < 40)) continue;
      let ok = true; for (let k = 0; k < 8; k++) if (NEON.ground(x + Math.cos(k) * 4, z + Math.sin(k) * 4) !== 0) ok = false;
      if (ok) a = { p: new THREE.Vector3(x, 0, z) };
    }
    if (!a) a = { p: new THREE.Vector3(30 + b * 6, 0, 0) };
    const g = new THREE.Group(); box(0.8, 1.0, 0.8, 0, 0.5, 0, lam(0x5a3a22), g); sph(0.3, bas(0xff8a2a), g, 0, 1.15, 0); box(0.14, 0.7, 0.14, 1.4, 0.35, 0.5, lam(0x3a2c22), g);
    g.position.copy(a.p); g.visible = false; scene.add(g); a.g = g; NB.camps[b] = a; return a;
  }
  function nbBandSpawn(c) {
    const A = nbAnchor(c.band || 0);
    for (let i = 0; i < 12; i++) {
      const x = A.p.x + (Math.random() - 0.5) * 7, z = A.p.z + (Math.random() - 0.5) * 7;
      if (NEON.ground(x, z) === 0) { c.pos.set(x, 0, z); break; }
    }
    c.home.copy(A.p); c.wander.copy(c.pos); c.shouted = false; c.molT = 3 + Math.random() * 4; c.lungeT = 2 + Math.random() * 2; c.hasteT = 0; c.shotDmg = 7;
  }

  // ----- the per-frame glue -----
  WORLD_TICKS.push(dt => {
    const inN = G.world === 'neon';
    NB.camps.forEach(a => { a.g.visible = inN; });
    if (!inN) {
      NB.mines.slice().forEach(nbRemoveMine); NB.fires.slice().forEach(nbRemoveFire);
      NB.shots.forEach(s => { scene.remove(s.m); s.m.material.dispose(); }); NB.shots.length = 0; NB.lit = 0;
      creeps.forEach(c => { if (c.beam) c.beam.visible = false; if (c.beamM) c.beamM.visible = false; if (c.ltele) c.ltele.hide(); c.light = null; if (c.sh) { c.sh = null; if (c.bub) c.bub.visible = false; } });
      return;
    }
    creeps.forEach(c => {
      if (c.beam) { if (!c.beamOn || !c.alive || c.realm !== 'neon') c.beam.visible = false; c.beamOn = false; }
      if (NSCAV[c.type] && c.hasteT > 0) { c.hasteT -= dt; if (c.hasteT <= 0) c.haste = 1; }
    });
    nbTickShields(dt); nbTickLights(dt); nbTickMines(dt); nbTickShots(dt); nbTickFires(dt); nbTickSkirmish(dt); nbTickEvent(dt);
  });

  // ----- models: block figures in the existing style -----
  Object.assign(WORLD_BUILD, {
    gyro() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const hull = lam(0xd8742a), dark = lam(0x2a2e36), glass = bas(0x3af0ff), lamp = bas(0xfff0a0);
      box(0.9, 0.55, 1.7, 0, 0, 0, hull, body); box(0.7, 0.4, 0.5, 0, -0.05, 0.95, dark, body); box(0.6, 0.34, 0.55, 0, 0.3, 0.55, glass, body);
      box(0.22, 0.22, 1.9, 0, 0.12, -1.7, hull, body); box(0.08, 0.7, 0.34, 0, 0.45, -2.55, dark, body);
      [-1, 1].forEach(sd => { box(0.06, 0.06, 1.7, sd * 0.5, -0.5, 0.05, dark, body); box(0.06, 0.3, 0.06, sd * 0.5, -0.32, 0.5, dark, body); box(0.06, 0.3, 0.06, sd * 0.5, -0.32, -0.4, dark, body); });
      box(0.5, 0.18, 0.5, 0, -0.38, -0.3, dark, body);
      box(0.12, 0.4, 0.12, 0, 0.45, 0, dark, body);
      const rotor = new THREE.Group(); rotor.position.y = 0.7; body.add(rotor); box(3.6, 0.04, 0.2, 0, 0, 0, dark, rotor); box(0.2, 0.04, 3.6, 0, 0, 0, dark, rotor);
      const tailRotor = new THREE.Group(); tailRotor.position.set(0.16, 0.45, -2.55); body.add(tailRotor); box(0.04, 0.9, 0.1, 0, 0, 0, dark, tailRotor);
      const lampM = sph(0.17, lamp, body, 0, -0.38, 0.85);
      return { g, body, rotor, tailRotor, lamp: lampM, ltele: makeTele(), beamM: (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 30, 20, 1, true), bas(0xfff2a0, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); tag(m, 2); return m; })() };
    },
    jammer() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const suit = lam(0x3a2a4a), dark = lam(0x1e1a28), tip = bas(0xff3ad8), dish = lam(0x8a8aa8);
      const legs = [-0.13, 0.13].map(x => box(0.1, 0.9, 0.12, x, 0.45, 0, dark, body));
      box(0.5, 0.7, 0.3, 0, 1.25, 0, suit, body); box(0.3, 0.3, 0.3, 0, 1.8, 0, dark, body);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.12, 0.26, 12), dish); d.rotation.x = Math.PI / 2; d.position.set(0, 2.05, 0.25); body.add(d);
      [-0.22, 0, 0.22].forEach((x, i) => { box(0.04, 0.9 + i % 2 * 0.3, 0.04, x, 2.1, -0.18, dark, body); sph(0.07, tip, body, x, 2.6 + i % 2 * 0.3, -0.18); });
      box(0.5, 0.12, 0.5, 0, 0.88, 0, dark, body);
      const core = sph(0.12, tip, body, 0, 1.3, 0.18);
      [-1, 1].forEach(sd => box(0.09, 0.55, 0.09, sd * 0.32, 1.2, 0.15, suit, body).rotation.x = -0.7);
      return { g, body, legs, core, beam: nbMakeBeam(0xff3ad8) };
    },
    aegis() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const hull = lam(0x2a4a52), ringM = bas(0x5af0ff);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.24, 6), hull); body.add(disc);
      const core = sph(0.2, bas(0xb8ffff), body, 0, 0.22, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 4, 20), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = -0.02; body.add(ring);
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU; box(0.08, 0.3, 0.08, Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55, hull, body); });
      return { g, body, core, ring, beam: nbMakeBeam(0x5af0ff) };
    },
    scrapper() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const rag = lam(0x6a4a32), plate = lam(0x7a6a5a), skin = lam(0xc89a7a), rust = lam(0x8a4a2a), glow = bas(0xff9a3a);
      const legs = [-0.14, 0.14].map(x => box(0.15, 0.85, 0.16, x, 0.43, 0, rag, body));
      box(0.55, 0.65, 0.32, 0, 1.2, 0, rag, body); box(0.58, 0.14, 0.34, 0, 0.9, 0, plate, body);
      sph(0.2, skin, body, 0, 1.75, 0.02); box(0.34, 0.12, 0.22, 0, 1.78, 0.1, plate, body); box(0.2, 0.04, 0.04, 0, 1.78, 0.22, glow, body);
      box(0.1, 0.55, 0.1, 0.38, 1.15, 0.1, rag, body).rotation.x = -0.6; box(0.07, 0.07, 1.0, 0.38, 1.05, 0.55, rust, body);
      box(0.1, 0.5, 0.1, -0.38, 1.15, 0.12, rag, body); box(0.7, 0.95, 0.07, -0.5, 1.1, 0.3, plate, body); box(0.4, 0.4, 0.04, -0.5, 1.2, 0.35, rust, body);
      box(0.4, 0.5, 0.2, 0, 1.25, -0.28, rust, body); box(0.06, 0.6, 0.06, 0.12, 1.7, -0.3, plate, body);
      return { g, body, legs };
    },
    slinger() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const rag = lam(0x3a4a3a), skin = lam(0xc89a7a), hood = lam(0x2a3a2a), glass = bas(0x8aff6a), cord = lam(0x8a7a5a);
      const legs = [-0.12, 0.12].map(x => box(0.13, 0.8, 0.14, x, 0.4, 0, rag, body));
      box(0.46, 0.62, 0.28, 0, 1.12, 0, rag, body);
      sph(0.19, skin, body, 0, 1.65, 0.02); const hd = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.4, 6), hood); hd.position.set(0, 1.78, -0.03); body.add(hd);
      box(0.09, 0.5, 0.09, 0.32, 1.1, 0.12, rag, body).rotation.x = -0.9; const sl = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 12), cord); sl.position.set(0.32, 1.0, 0.5); body.add(sl);
      box(0.09, 0.5, 0.09, -0.32, 1.1, 0.1, rag, body);
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 6), glass); bottle.position.set(-0.3, 0.9, 0.22); body.add(bottle);
      box(0.4, 0.4, 0.2, 0, 1.15, -0.26, cord, body);
      return { g, body, legs };
    },
    walker() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const hull = lam(0x4a4a56), plate = lam(0x9a5a2a), dark = lam(0x1e2028), glass = bas(0xff5a3a), siren = bas(0xff3a3a), pod = lam(0x6a6a76);
      const legs = [-0.85, 0.85].map(x => { const l = new THREE.Group(); l.position.set(x, 2.3, 0); body.add(l); box(0.5, 2.3, 0.6, 0, -1.15, 0, hull, l); box(0.8, 0.3, 1.1, 0, -2.2, 0.2, plate, l); box(0.16, 1.2, 0.16, 0, -0.5, 0.45, dark, l); return l; });
      box(2.4, 0.6, 1.3, 0, 2.5, 0, dark, body);
      box(2.2, 1.4, 1.6, 0, 3.4, 0, hull, body); box(1.6, 0.6, 0.06, 0, 3.6, 0.83, glass, body); box(2.3, 0.2, 1.7, 0, 4.15, 0, plate, body);
      [-1, 1].forEach(sd => { box(0.7, 0.8, 1.0, sd * 1.5, 3.6, 0, pod, body); [-0.2, 0.2].forEach(z => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6), plate); c.rotation.x = Math.PI / 2; c.position.set(sd * 1.5, 3.7, 0.65 + z * 0.2); body.add(c); }); });
      box(0.4, 1.6, 0.4, 1.7, 2.3, 0.3, hull, body).rotation.x = -0.2; box(0.7, 0.2, 0.8, 1.7, 1.4, 0.6, plate, body);
      const beacon = sph(0.22, siren, body, 0, 4.5, 0); box(0.1, 0.3, 0.1, 0, 4.3, 0, dark, body);
      return { g, body, legs, beacon };
    }
  });

  // ----- brains -----
  // Rotorjack: patrols above the street (too high to hit from the ground), strafes down a telegraphed lane dropping mines
  // (and drops low, exposed, while it pulls up), calls a searchlight that marks the hero and rallies every machine,
  // and rakes a lit hero with its cannon.
  function nbGyroSpawn(c) {
    c.sT = 2 + Math.random() * 2.5; c.lT = 5 + Math.random() * 5; c.burstN = 0; c.fireT = 1; c.light = null; c.shotDmg = 6; c.sweepLife = undefined; c.pos.y = 4.4;
    if (c.sweep) { if (NB.sweepOnT <= 0) { c.alive = false; c.g.visible = false; c.bar.hidden = true; c.respawn = Infinity; return; } nbSweepIn(c); }
  }
  function nbGyroDeath(c) { c.light = null; if (c.beamM) c.beamM.visible = false; if (c.ltele) c.ltele.hide(); }
  CREEP_AI_FN.gyro = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.rotor.rotation.y += dt * (c.atk ? 40 : 28); c.tailRotor.rotation.x += dt * 40;
    if (c.sweepLife !== undefined) { c.sweepLife -= dt; if (c.sweepLife <= 0) { c.alive = false; c.g.visible = false; c.bar.hidden = true; c.respawn = Infinity; nbGyroDeath(c); return; } }
    const tgt = nbTgt(c, d, 26, true), tpos = tgt ? nbTp(tgt) : null, td = tpos ? flatDist(c.pos, tpos) : 99;
    let wantY = 4.4 + Math.sin(tt * 1.7 + c.home.x) * 0.35, pitch = Math.sin(tt * 1.3) * 0.05;
    if (c.stun > 0) { wantY = 2.0; }
    else if (c.atk) {
      const A = c.atk; A.t += dt * h;
      if (A.stage === 'wind') {
        if (A.t < 0.45 && tpos) nbTurn(c, tpos, 5, dt);
        wantY = 4.0; pitch = -0.1;
        c.tele.lane(c.pos, c.facing, 20, 2.2, A.t / 0.9, groundY);
        if (A.t >= 0.9) { A.stage = 'dash'; A.t = 0; A.mine = 0; A.hit = false; A.hits = []; c.tele.hide(); sfx('swoosh'); }
      } else if (A.stage === 'dash') {
        wantY = 1.7; pitch = 0.4;
        const ok = creepMove(c, fwdOf(c.facing), 17 * h * dt);
        A.mine -= dt; if (A.mine <= 0) { A.mine = 0.3; nbDropMine(c); }
        if (Math.random() < 0.6) burst(c.pos.x, c.pos.y - 0.4, c.pos.z, 1, 2);
        if (!A.hit && G.state !== 'dead' && flatDist(player.position, c.pos) < 1.5 && player.position.y < c.pos.y - 0.2) { A.hit = true; hitPlayer(12, c.pos, 8, true, c); }
        creeps.forEach(o => { if (nbIsFoe(c, o) && !A.hits.includes(o) && flatDist(o.pos, c.pos) < 1.6) { A.hits.push(o); nbHurt(o, 20, c); } });
        if (A.t >= 1.05 || !ok) { A.stage = 'rec'; A.t = 0; }
      } else {
        wantY = 2.2; pitch = -0.15; // pulling up: low enough for the hero to reach it
        if (A.t >= 1.4) { c.atk = null; c.sT = 5 + Math.random() * 3; }
      }
    } else {
      if (tpos) {
        nbTurn(c, tpos, 4, dt);
        const to = new THREE.Vector3(tpos.x - c.pos.x, 0, tpos.z - c.pos.z).normalize();
        const mv = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(c.orbit || 1).addScaledVector(to, td > 11 ? 1 : td < 7 ? -1 : 0).normalize();
        if (!creepMove(c, mv, 5 * h * dt)) c.orbit = -(c.orbit || 1);
        c.sT -= dt * h; c.lT -= dt;
        if (c.sT <= 0 && td > 5 && td < 22) c.atk = { stage: 'wind', t: 0 };
        else if (c.lT <= 0 && tgt === 'hero' && !c.light) { nbStartLight(c); c.lT = 16 + Math.random() * 5; }
        if (tgt === 'hero' && NB.lit > 0 && td < 20 && td > 4) {
          c.fireT -= dt * h;
          if (c.fireT <= 0) { spawnCreepShot(c); c.burstN++; c.fireT = c.burstN % 3 ? 0.35 : 2.4; }
        }
      } else creepWander(c, dt, 2.2);
    }
    c.pos.y += (groundY + wantY - c.pos.y) * Math.min(1, dt * (c.atk && c.atk.stage === 'dash' ? 9 : 3));
    c.body.rotation.x += (pitch - c.body.rotation.x) * Math.min(1, dt * 6);
    if (c.lamp) c.lamp.scale.setScalar(c.light ? 1.6 + Math.sin(tt * 14) * 0.3 : 1);
  };

  // Hushcaster: stays back, links to the hero, then locks one skill and drains mana. Block the line with a wall,
  // break it with a heavy hit or a parry, or outrun it. It blinks away if you close in.
  CREEP_AI_FN.jammer = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY; c.core.scale.setScalar(1 + Math.sin(tt * 9) * 0.25 + (c.atk ? 0.6 : 0));
    c.blinkT = Math.max(0, (c.blinkT || 0) - dt);
    const tgt = nbTgt(c, d, 21, false), tpos = tgt ? nbTp(tgt) : null, td = tpos ? flatDist(c.pos, tpos) : 99;
    if (c.stun > 0) { c.atk = null; return; }
    if (c.atk) {
      const A = c.atk; A.t += dt * h;
      nbTurn(c, player.position, 4, dt);
      const from = nbUpV(c.pos, 2.1), to = nbUpV(player.position, 1.2);
      if (d > 21 || !nbLOS(c.pos, player.position) || G.state === 'dead' || heroAloft()) { c.atk = null; c.cool = 2; return; }
      nbBeam(c.beam, from, to); c.beamOn = true; c.beam.scale.x = c.beam.scale.y = 0.6 + A.t * 1.6;
      if (A.t >= 1.3) {
        c.atk = null; c.cool = 8 + Math.random() * 3;
        const keys = Object.keys(NJAM), ready = keys.filter(k => P.cd[k] <= 0.2), k = (ready.length ? ready : keys)[Math.floor(Math.random() * (ready.length || keys.length))];
        P.cd[k] = Math.max(P.cd[k], 7); P.mana = Math.max(0, P.mana - 30);
        floatText(`JAMMED: ${NJAM[k]}`, nbUpV(player.position, 2.7), 'word', '#ff3ad8'); sfx('clang'); burst(player.position.x, 1.3, player.position.z, 16, 5);
      }
    } else if (tpos) {
      nbTurn(c, tpos, 5, dt);
      const to = new THREE.Vector3(tpos.x - c.pos.x, 0, tpos.z - c.pos.z).normalize();
      const mv = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(c.orbit || 1).addScaledVector(to, td > 15 ? 1 : td < 9 ? -1.4 : 0).normalize();
      if (!creepMove(c, mv, 3.4 * h * dt)) c.orbit = -(c.orbit || 1);
      if (tgt === 'hero' && td < 5 && c.blinkT <= 0) {
        for (let i = 0; i < 10; i++) {
          const a = Math.atan2(c.pos.x - tpos.x, c.pos.z - tpos.z) + (Math.random() - 0.5) * 1.6, r = 7 + Math.random() * 3, x = c.pos.x + Math.sin(a) * r, z = c.pos.z + Math.cos(a) * r;
          if (NEON.ground(x, z) === 0) { burst(c.pos.x, 1.2, c.pos.z, 16, 5); c.pos.x = x; c.pos.z = z; burst(x, 1.2, z, 16, 5); c.blinkT = 7; sfx('swoosh'); break; }
        }
      }
      c.cool -= dt * h;
      if (c.cool <= 0 && tgt === 'hero' && td > 6 && td < 19 && nbLOS(c.pos, player.position)) c.atk = { t: 0 };
    } else creepWander(c, dt, 1.2);
    const moving = !c.atk && c.stun <= 0; c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 9 + i * 3) * 0.4 : 0; });
    if (!c.atk) c.beam.visible = false;
  };
  function nbJamSpawn(c) { c.cool = 3 + Math.random() * 3; c.blinkT = 0; c.beam.visible = false; }

  // Aegis Drone: hovers beside the machine nearest the fight and wraps it in a shield (50% of its hp, 7 s) every ~9 s.
  // It never attacks and runs from the hero, so kill it first: its shield collapses with it.
  function nbWard(c) {
    let best = null, bs = Infinity;
    creeps.forEach(o => {
      if (o === c || !o.alive || o.realm !== 'neon' || !NMACH[o.type] || o.type === 'aegis' || o.sh) return;
      const dd = flatDist(c.pos, o.pos); if (dd > 18) return;
      const sc = flatDist(o.pos, player.position) - (o.type === 'walker' ? 8 : 0) + dd * 0.3; if (sc < bs) { bs = sc; best = o; }
    });
    return best;
  }
  CREEP_AI_FN.aegis = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY + 2.0 + Math.sin(tt * 2.2 + c.home.x) * 0.2; c.ring.rotation.y += dt * 3; c.core.scale.setScalar(1 + Math.sin(tt * 8) * 0.2);
    if (c.stun > 0) { c.atk = null; return; }
    if (!c.ward || !c.ward.alive || flatDist(c.pos, c.ward.pos) > 24) c.ward = nbWard(c);
    const w = c.ward, near = G.state !== 'dead' && d < 6 && !heroAloft();
    if (w && w.sh && w.sh.src === c) { nbBeam(c.beam, c.pos, nbUpV(w.pos, w.hitY)); c.beamOn = true; }
    if (near) { const away = new THREE.Vector3(c.pos.x - player.position.x, 0, c.pos.z - player.position.z).normalize(); creepMove(c, away, 3.6 * h * dt); nbTurn(c, player.position, 5, dt); }
    else if (w) {
      const dw = flatDist(c.pos, w.pos); nbTurn(c, w.pos, 4, dt);
      if (dw > 3.2) creepMove(c, fwdOf(c.facing), 3.8 * h * dt);
      if (c.atk) {
        const A = c.atk; A.t += dt * h; c.tele.circle(w.pos.x, w.pos.y, w.pos.z, w.radius * 1.4 + 0.7, A.t / 0.7);
        if (!w.alive || w.sh) { c.atk = null; c.tele.hide(); }
        else if (A.t >= 0.7) { c.atk = null; c.tele.hide(); c.cool = 8 + Math.random() * 3; nbShield(w, c, 7); }
      } else { c.cool -= dt * h; if (c.cool <= 0 && !w.sh && dw < 10) c.atk = { t: 0 }; }
    } else creepWander(c, dt, 1.5);
    if (!c.atk) c.tele.hide();
  };
  function nbAegisSpawn(c) { c.cool = 2 + Math.random() * 2; c.ward = null; c.beam.visible = false; }
  function nbAegisDeath(c) { c.beam.visible = false; creeps.forEach(o => { if (o.sh && o.sh.src === c) nbUnshield(o, true); }); }

  // Scavengers: a band holds a camp. They hate the machines as much as the hero, so they fight whichever is nearer.
  // Scrapper: pipe swing; a shield-plank lunge down a lane; a shout that hastes the band when it spots the hero.
  CREEP_AI_FN.scrapper = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY;
    const tgt = nbTgt(c, d, 16, false, true), tpos = tgt ? nbTp(tgt) : null, td = tpos ? flatDist(c.pos, tpos) : 99;
    if (tgt === 'hero' && !c.shouted && d < 13) {
      c.shouted = true; floatText("Get 'em!", nbUpV(c.pos, 2.3), 'word', '#ffb36a');
      creeps.forEach(o => { if (o.alive && o.realm === 'neon' && NSCAV[o.type] && flatDist(o.pos, c.pos) < 16) { o.haste = 1.25; o.hasteT = 6; } });
    }
    if (c.stun > 0) { c.atk = null; }
    else if (c.atk) {
      const A = c.atk; A.t += dt * h;
      if (A.kind === 'swing') {
        const front = c.pos.clone().addScaledVector(fwdOf(c.facing), 0.9);
        if (A.stage === 'wind') { c.tele.circle(front.x, c.pos.y, front.z, 1.4, A.t / 0.5); if (A.t >= 0.5) { A.stage = 'rec'; A.t = 0; c.tele.hide(); burst(front.x, 0.6, front.z, 8, 4); nbArea(c, front.x, front.z, 1.6, 11, 5, true); } }
        else if (A.t >= 0.6) { c.atk = null; c.cool = 0.9 + Math.random() * 0.5; }
      } else {
        if (A.stage === 'wind') {
          if (A.t < 0.3 && tpos) nbTurn(c, tpos, 5, dt);
          c.tele.lane(c.pos, c.facing, 6, 1.4, A.t / 0.55, c.pos.y);
          if (A.t >= 0.55) { A.stage = 'dash'; A.t = 0; A.hit = false; c.tele.hide(); sfx('swoosh'); }
        } else if (A.stage === 'dash') {
          const ok = creepMove(c, fwdOf(c.facing), 17 * h * dt);
          if (!A.hit) { const f = c.pos.clone().addScaledVector(fwdOf(c.facing), 0.5); if (G.state !== 'dead' && flatDist(player.position, f) < 1.4 && Math.abs(player.position.y - c.pos.y) < 1.5) { A.hit = true; hitPlayer(14, c.pos, 8, true, c); } creeps.forEach(o => { if (nbIsFoe(c, o) && !A.hit && flatDist(o.pos, f) < 1.4 + o.radius * 0.5 && o.pos.y < 2.6) { A.hit = true; nbHurt(o, 16, c); } }); }
          if (A.t >= 0.3 || !ok) { A.stage = 'rec'; A.t = 0; }
        } else if (A.t >= 0.9) { c.atk = null; c.cool = 1.2 + Math.random() * 0.6; }
      }
    } else if (tpos) {
      nbTurn(c, tpos, 6, dt);
      if (td > 1.6) creepMove(c, fwdOf(c.facing), 3.5 * h * dt);
      c.cool -= dt * h; c.lungeT -= dt * h;
      if (td < 2.0 && c.cool <= 0) c.atk = { kind: 'swing', stage: 'wind', t: 0 };
      else if (td > 3.5 && td < 7.5 && c.lungeT <= 0 && c.cool <= 0) { c.atk = { kind: 'lunge', stage: 'wind', t: 0 }; c.lungeT = 3.5 + Math.random() * 1.5; }
    } else creepWander(c, dt, 1.2);
    const moving = !c.atk && c.stun <= 0; c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 11 + i * 3) * 0.5 : 0; });
    pushPlayerOut(c, 0.9);
  };
  // Slinger: keeps seven to eleven metres back, flings scrap, and lobs a firebomb onto where its target stands.
  // The fire burns the hero and any machine inside it, so lead the machines through it.
  CREEP_AI_FN.slinger = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY;
    const tgt = nbTgt(c, d, 17, false), tpos = tgt ? nbTp(tgt) : null, td = tpos ? flatDist(c.pos, tpos) : 99;
    if (c.stun > 0) { c.atk = null; }
    else if (c.atk) {
      const A = c.atk; A.t += dt * h; nbTurn(c, A.at, 5, dt);
      c.tele.circle(A.at.x, 0, A.at.z, 2.2, A.t / 1.0);
      if (A.t >= 1.0) { c.atk = null; c.tele.hide(); c.molT = 8 + Math.random() * 3; nbFire(c, A.at.x, A.at.z, 2.2, 4.5); }
    } else if (tpos) {
      nbTurn(c, tpos, 5, dt);
      if (td < 6.5) creepMove(c, fwdOf(c.facing + Math.PI), 2.9 * h * dt); else if (td > 11.5) creepMove(c, fwdOf(c.facing), 2.9 * h * dt);
      c.cool -= dt * h; c.molT -= dt * h;
      if (c.molT <= 0 && td > 5 && td < 15) c.atk = { t: 0, at: new THREE.Vector3(tpos.x, 0, tpos.z) };
      else if (c.cool <= 0 && td < 16 && nbLOS(c.pos, tpos)) { c.cool = 2.3 + Math.random() * 1.1; nbShot(c, nbUpV(c.pos, 1.4), nbUpV(tpos, tgt === 'hero' ? 1.1 : tgt.hitY), 9, c.shotDmg, 0xffe08a); sfx('swoosh'); }
    } else creepWander(c, dt, 1.2);
    const moving = !c.atk && c.stun <= 0; c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 11 + i * 3) * 0.5 : 0; });
    pushPlayerOut(c, 0.8);
  };

  // Gantry Walker: a slow mini-boss. Stomp up close, a rocket salvo down a wide telegraphed lane at range, and at 60% hp
  // its siren sends every machine hunting and calls two gyrocopters. Scavengers attack it too.
  function nbWalkerSpawn(c) { c.cool = 2; c.sirenDone = false; c.pos.y = 0; }
  function nbWalkerDeath(c) {
    spawnLoot(c.pos.x + 1.5, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    spawnLoot(c.pos.x - 1.5, c.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
    dropGear(c.pos, 1, 0.7); G.shake = Math.max(G.shake, 0.5);
  }
  CREEP_AI_FN.walker = (c, dt, d, groundY) => {
    const tt = uTime.value, h = hasteOf(c);
    c.pos.y = groundY; c.beacon.scale.setScalar(1 + Math.max(0, Math.sin(tt * (c.sirenDone ? 10 : 4))) * 0.5);
    const tgt = nbTgt(c, d, 26, false), tpos = tgt ? nbTp(tgt) : null, td = tpos ? flatDist(c.pos, tpos) : 99;
    if (c.stun > 0) { c.atk = null; c.body.position.y = 0; }
    else if (c.atk) {
      const A = c.atk; A.t += dt * h;
      if (A.kind === 'stomp') {
        const front = c.pos.clone().addScaledVector(fwdOf(c.facing), 2.2);
        c.tele.circle(front.x, c.pos.y, front.z, 3.0, A.t / 1.0); c.body.position.y = 0.3 * Math.sin(clamp(A.t, 0, 1) * Math.PI / 2);
        if (A.t >= 1.0) { c.atk = null; c.tele.hide(); c.body.position.y = 0; c.cool = 1.8 + Math.random(); sfx('boom'); G.shake = Math.max(G.shake, 0.5); burst(front.x, 0.4, front.z, 26, 7); nbArea(c, front.x, front.z, 3.0, 22, 11, true); }
      } else if (A.kind === 'salvo') {
        if (A.t < 0.7 && tpos) nbTurn(c, tpos, 2.5, dt);
        if (A.t < 0.9) c.tele.lane(c.pos, c.facing, 16, 5, A.t / 0.9, c.pos.y); else c.tele.hide();
        if (A.n < 4 && A.t >= 0.9 + A.n * 0.2) {
          const off = [-0.18, -0.06, 0.06, 0.18][A.n], a = c.facing + off, o = nbUpV(c.pos, 3.2).addScaledVector(fwdOf(c.facing), 0.9);
          nbShot(c, o, o.clone().add(new THREE.Vector3(Math.sin(a) * 11, -1.6, Math.cos(a) * 11)), 11, 9, 0xff7a3a); A.n++; sfx('swoosh');
        }
        if (A.n >= 4 && A.t > 1.9) { c.atk = null; c.tele.hide(); c.cool = 2.4 + Math.random(); }
      } else { // siren
        c.tele.circle(c.pos.x, c.pos.y, c.pos.z, 9 * clamp(A.t / 1.4, 0, 1) + 0.1, A.t / 1.4);
        if (A.t >= 1.4) {
          c.atk = null; c.tele.hide(); c.cool = 1.5; c.sirenDone = true; sfx('boom'); G.shake = Math.max(G.shake, 0.4);
          floatText('SIREN', nbUpV(c.pos, 5.4), 'word', '#ff5a5a');
          creeps.forEach(o => { if (o.alive && o.realm === 'neon' && NMACH[o.type] && o !== c && flatDist(o.pos, c.pos) < 34) { o.commandT = 14; o.rallyT = 6; } });
          NB.sweepOnT = 3; creeps.filter(o => o.sweep && !o.alive).slice(0, 2).forEach(o => { o.respawn = 0; });
        }
      }
    } else if (tpos) {
      nbTurn(c, tpos, 2.4, dt);
      if (!c.sirenDone && c.hp < c.max * 0.6 && tgt === 'hero') c.atk = { kind: 'siren', t: 0 };
      else {
        if (td > 6.5) creepMove(c, fwdOf(c.facing), 2.4 * h * dt);
        c.cool -= dt * h;
        if (c.cool <= 0) { if (td < 4.8) c.atk = { kind: 'stomp', t: 0 }; else if (td < 18 && nbLOS(c.pos, tpos)) c.atk = { kind: 'salvo', t: 0, n: 0 }; }
      }
    } else creepWander(c, dt, 0.9);
    const moving = !c.atk && c.stun <= 0 && !!tpos && td > 6.5; c.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 4 + i * Math.PI) * 0.35 : 0; });
    pushPlayerOut(c, 1.8);
  };

  // ----- populate Neon Verge -----
  // 4 gyrocopters on patrol (plus 2 that only arrive in a sweep), 3 jammers, 3 aegis drones, two scavenger bands of
  // scrappers and slingers across three camps, and one walker
  const NB_NEW = {
    gyro: { n: 4, ai: 'gyro', o: { float: 4.4, radius: 0.9, hitY: 0.2, markY: 1.3, onSpawn: nbGyroSpawn, onDeath: nbGyroDeath } },
    jammer: { n: 3, ai: 'jammer', o: { radius: 0.5, hitY: 1.0, markY: 3.0, onSpawn: nbJamSpawn, onDeath: c => { c.beam.visible = false; } } },
    aegis: { n: 3, ai: 'aegis', o: { radius: 0.75, hitY: 0.1, markY: 1.4, onSpawn: nbAegisSpawn, onDeath: nbAegisDeath } },
    scrapper: { n: 5, ai: 'scrapper', o: { radius: 0.6, hitY: 0.9, markY: 2.4, onSpawn: nbBandSpawn } },
    slinger: { n: 4, ai: 'slinger', o: { radius: 0.55, hitY: 0.9, markY: 2.4, onSpawn: nbBandSpawn } }
  };
  Object.keys(NB_NEW).forEach(t => { const S = NB_NEW[t]; for (let k = 0; k < S.n; k++) addWorldCreep(t, 'neon', S.ai, Object.assign({ band: k % 3 }, S.o)); });
  for (let k = 0; k < 2; k++) addWorldCreep('gyro', 'neon', 'gyro', Object.assign({ sweep: true, respawn: Infinity, respawnAfter: () => Infinity }, NB_NEW.gyro.o));
  addWorldCreep('walker', 'neon', 'walker', { radius: 1.5, hitY: 2.0, markY: 5.2, brute: true, lvOf: () => worldTier() + 1, respawnAfter: () => 110, onSpawn: nbWalkerSpawn, onDeath: nbWalkerDeath });
