  // ---------- Creep growth: levels, size and abilities for every world (Agent: growth) ----------
  // A creep that out-levels the world tier is a "grown" creep. Growth g = levels above the tier (a Soul Gleaner counts
  // from the level it rose at, since it grows by eating). It shows in three ways:
  //   size    +12% per level, capped at 1.6x (applied to c.g.scale as a ratio, so ancients and elites keep their own size)
  //   ranks   g1 Hardened (takes 15% less damage), g2 Frenzied (1.3x faster below half life),
  //           g3 Champion (a telegraphed signature move for its brain), g4 Alpha (rallies nearby creeps, drops loot)
  //   rewards +20% XP and gold per level above the tier
  // Levels come from the old 75 s clock, from landing hits on the hero, and from seeing an ally fall nearby (4 points each).
  // Story bosses, mythics, neutral camps, brutes, wave mobs, solo beasts and godling-brained bosses are skipped.
  const GROW = { sizePer: 0.12, sizeCap: 1.6, maxAbove: 4, hardened: 0.85, frenzyHaste: 1.3, frenzyLife: 0.5, rewardPer: 0.2,
    pointsPerLevel: 4, allyR: 12, rallyR: 14, rallyTime: 6, rallyEvery: 11 };
  const GROW_RANK = ['', 'Hardened ', 'Frenzied ', 'Champion ', 'Alpha '];

  function growthOK(c) {
    return !!c.isCreep && !c.storyBoss && !c.mythic && !c.myth && !c.neutral && !c.brute && !c.wave && !c.solo && c.ai !== 'godling';
  }
  function growthRaw(c) {
    if (!growthOK(c)) return 0;
    const base = c.lvOf ? (c.gBase === undefined ? c.lv : c.gBase) : worldTier();
    return Math.max(0, c.lv - base);
  }
  function growthTier(c) { return Math.min(4, growthRaw(c)); }
  function growthRank(c) { return GROW_RANK[growthTier(c)]; }
  function growthGuard(c) { return growthTier(c) >= 1 ? GROW.hardened : 1; }
  function growthHaste(c) { return growthTier(c) >= 2 && c.hp < c.max * GROW.frenzyLife ? GROW.frenzyHaste : 1; }
  function growthReward(c) { return 1 + GROW.rewardPer * Math.min(6, growthRaw(c)); }
  function growthCanLevel(c) { return !c.storyBoss && !c.mythic && !c.brute && c.lv < worldTier() + GROW.maxAbove; }

  // One level: stats, a heal, and a short flourish when the hero is near
  function growCreep(c, why) {
    c.age = 0; c.gXp = 0; c.lv++; creepStats(c); c.hp = Math.min(c.max, c.hp + c.max * 0.25); c.flash = 1;
    if (c.realm === realmKey() && flatDist(c.pos, player.position) < 22) {
      const name = c.godName || CREEP_NAME[c.type] || 'Creature', rank = growthRank(c).trim();
      floatText(`${name} Lv ${c.lv}${rank ? ' · ' + rank : ''}`, c.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', why === 'blooded' ? '#ff9a4a' : '#ffd36a');
      burst(c.pos.x, c.pos.y + 0.8, c.pos.z, 16, 4);
      if (flatDist(c.pos, player.position) < 14) sfx('pickup');
    }
  }
  // A point of experience: a landed hit on the hero, or an ally dying close by
  function creepFeed(c) {
    if (!c.alive || !growthOK(c) || !growthCanLevel(c)) return;
    c.gXp = (c.gXp || 0) + 1;
    if (c.gXp >= GROW.pointsPerLevel) growCreep(c, 'blooded');
  }
  // Called from killCreep: neighbours learn from the fall, an Alpha leaves loot behind
  function growthDeath(c) {
    if (!growthOK(c)) return;
    creeps.forEach(o => { if (o !== c && o.alive && o.realm === c.realm && flatDist(o.pos, c.pos) < GROW.allyR) creepFeed(o); });
    if (growthTier(c) >= 4) {
      spawnLoot(c.pos.x - 1, c.pos.z - 0.5, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]);
      dropGear(c.pos, 1, 0.35);
      floatText('Alpha slain', c.pos.clone().add(new THREE.Vector3(0, 2.8, 0)), 'word', '#ff9a4a');
    }
  }

  // Size: ease the visible scale toward its target, as a ratio so other systems' scaling is kept
  function growthScale(c, snap, dt) {
    if (c.gsMul === undefined) c.gsMul = 1;
    if (c.gRad0 === undefined) c.gRad0 = c.radius;
    const target = c.lvOf ? 1 : Math.min(GROW.sizeCap, 1 + GROW.sizePer * growthRaw(c));
    let next = snap ? target : c.gsMul + (target - c.gsMul) * Math.min(1, dt * 3);
    if (Math.abs(next - target) < 0.002) next = target;
    if (next === c.gsMul) return;
    c.g.scale.multiplyScalar(next / c.gsMul); c.gsMul = next;
    c.radius = c.gRad0 * (1 + (next - 1) * 0.8);
  }
  // Called at the end of spawnCreep
  function growthSpawn(c) {
    c.gBase = c.lv; c.gXp = 0; c.gFrenzy = false; c.gsMul = 1; c.sigCool = 3 + Math.random() * 3; c.gRally = 3 + Math.random() * 2;
    if (c.gRad0 !== undefined) c.radius = c.gRad0;
    growthScale(c, true, 0);
  }
  WORLD_TICKS.push(dt => { for (let i = 0; i < creeps.length; i++) if (creeps[i].alive) growthScale(creeps[i], false, dt); });

  // Alpha: the pack hunts and fights harder for a while. Returns true if anyone heard it.
  function alphaRally(c) {
    let n = 0;
    creeps.forEach(o => {
      if (o === c || !o.alive || o.realm !== c.realm || !growthOK(o) || flatDist(o.pos, c.pos) > GROW.rallyR) return;
      o.rallyT = Math.max(o.rallyT || 0, GROW.rallyTime); o.commandT = Math.max(o.commandT || 0, GROW.rallyTime - 1); o.leash = false; n++;
      burst(o.pos.x, o.pos.y + 1, o.pos.z, 6, 3);
    });
    if (!n) return false;
    burst(c.pos.x, c.pos.y + 1, c.pos.z, 24, 6); G.shake = Math.max(G.shake, 0.15); sfx('swoosh');
    floatText('Alpha rallies the pack', c.pos.clone().add(new THREE.Vector3(0, 2.8, 0)), 'word', '#ff6a4a');
    return true;
  }

  // Signature moves, picked by brain. c.atk = { sig, stage, t } while one runs, so parries and heavy hits cancel it as usual.
  function growthStart(c, d) {
    if (c.ai === 'melee' && d > 3.4 && d < 10) return { sig: 'charge', stage: 'wind', t: 0, hit: false };
    if (c.ai === 'ranged' && d > 4 && d < 16) return { sig: 'fan', stage: 'wind', t: 0 };
    if (c.ai === 'stalker' && d > 3 && d < 11) return { sig: 'leap', stage: 'wind', t: 0, to: player.position.clone().setY(0) };
    if (c.ai === 'guard' && d < 4.5) return { sig: 'spikes', stage: 'wind', t: 0 };
    return null;
  }
  // Returns true while a signature move has the body, so the usual brain waits
  function growthKit(c, dt, d, aggro, groundY) {
    if (!growthOK(c)) return false;
    const g = growthTier(c);
    if (g >= 2) {
      if (!c.gFrenzy && c.hp < c.max * GROW.frenzyLife) {
        c.gFrenzy = true; burst(c.pos.x, c.pos.y + 0.8, c.pos.z, 14, 5);
        if (flatDist(c.pos, player.position) < 18) floatText('Frenzy', c.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'word', '#ff5a3a');
      } else if (c.gFrenzy && c.hp > c.max * 0.7) c.gFrenzy = false;
    }
    if (g < 3) return false;
    if (c.sigCool > 0) c.sigCool -= dt;
    if (g >= 4 && aggro && !c.atk) { c.gRally -= dt; if (c.gRally <= 0) c.gRally = alphaRally(c) ? GROW.rallyEvery + Math.random() * 4 : 3; }
    let A = c.atk;
    if (A && !A.sig) return false;
    if (A && c.stun > 0) { c.atk = null; c.tele.hide(); c.body.position.y = 0; return false; }
    if (!A) {
      if (!aggro || c.stun > 0 || c.sigCool > 0 || heroAloft()) return false;
      A = growthStart(c, flatDist(player.position, c.pos));
      if (!A) return false;
      if (A.to && groundAt(A.to.x, A.to.z) > 0.5) return false;
      c.atk = A; c.sigCool = 8 + Math.random() * 4;
    }
    const h = hasteOf(c);
    A.t += dt * h;
    if (A.sig === 'charge') {
      if (A.stage === 'wind') {
        if (A.t < 0.35) c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -5 * dt, 5 * dt);
        c.tele.lane(c.pos, c.facing, 8, 1.6, A.t / 0.7, c.pos.y);
        if (A.t >= 0.7) { A.stage = 'dash'; A.t = 0; c.tele.hide(); sfx('swoosh'); }
      } else if (A.stage === 'dash') {
        const ok = creepMove(c, fwdOf(c.facing), 17 * h * dt);
        c.pos.y = groundY + (c.float || 0);
        if (Math.random() < 0.6) burst(c.pos.x, c.pos.y + 0.3, c.pos.z, 1, 2);
        if (!A.hit && flatDist(player.position, c.pos) < 1.5 && Math.abs(player.position.y - c.pos.y) < 1.5) { A.hit = true; if (hitPlayer(14, c.pos, 8, true, c)) creepFeed(c); }
        if (A.t >= 0.45 || !ok) { A.stage = 'rec'; A.t = 0; }
      } else if (A.t >= 0.7) { c.atk = null; c.cool = Math.max(c.cool, 1.0); }
    } else if (A.sig === 'fan') {
      if (A.stage === 'wind') {
        c.facing += clamp(angDiff(c.facing, yawTo(c.pos, player.position)), -6 * dt, 6 * dt);
        c.tele.lane(c.pos, c.facing, 10, 1.4, A.t / 0.65, c.pos.y);
        if (A.t >= 0.65) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); sfx('swoosh');
          const dy = (player.position.y + 1.1 - c.pos.y) / Math.max(3, d);
          [-0.3, 0, 0.3].forEach(a => {
            const m = new THREE.Mesh(cshotGeo, cshotMat); m.position.copy(c.pos); scene.add(m);
            const dir = fwdOf(c.facing + a); dir.y = dy; cshots.push({ m, v: dir.normalize().multiplyScalar(9.5), t: 0, c, dmg: 8 });
          });
        }
      } else if (A.t >= 0.5) { c.atk = null; c.cool = Math.max(c.cool, 1.2); }
    } else if (A.sig === 'leap') {
      if (A.stage === 'wind') {
        if (A.t < 0.45 && groundAt(player.position.x, player.position.z) <= 0.5) A.to.set(player.position.x, 0, player.position.z);
        c.facing = yawTo(c.pos, A.to);
        c.tele.circle(A.to.x, groundY, A.to.z, 2.2, A.t / 0.8);
        c.body.position.y = -0.15 * Math.min(1, A.t / 0.8);
        if (A.t >= 0.8) { A.stage = 'leap'; A.t = 0; A.from = c.pos.clone(); c.body.position.y = 0; sfx('swoosh'); }
      } else if (A.stage === 'leap') {
        const k = Math.min(1, A.t / 0.45);
        c.pos.x = A.from.x + (A.to.x - A.from.x) * k; c.pos.z = A.from.z + (A.to.z - A.from.z) * k; c.pos.y = groundY + 2.6 * Math.sin(k * Math.PI);
        c.tele.circle(A.to.x, groundY, A.to.z, 2.2, 1);
        if (k >= 1) {
          A.stage = 'rec'; A.t = 0; c.pos.y = groundY; c.tele.hide();
          burst(A.to.x, groundY + 0.3, A.to.z, 18, 6); G.shake = Math.max(G.shake, 0.25); sfx('boom');
          if (flatDist(player.position, A.to) < 2.4 && Math.abs(player.position.y - groundY) < 1.8 && hitPlayer(16, A.to, 9, false, c)) creepFeed(c);
        }
      } else if (A.t >= 0.9) { c.atk = null; c.cool = Math.max(c.cool, 1.0); }
    } else if (A.sig === 'spikes') {
      if (A.stage === 'wind') {
        c.pos.y = groundY;
        c.tele.circle(c.pos.x, c.pos.y, c.pos.z, 3.4, A.t / 1.0);
        c.body.position.y = 0.3 * Math.sin(Math.min(1, A.t / 1.0) * Math.PI / 2);
        if (A.t >= 1.0) {
          A.stage = 'rec'; A.t = 0; c.tele.hide(); c.body.position.y = 0;
          burst(c.pos.x, c.pos.y + 0.4, c.pos.z, 28, 7); G.shake = Math.max(G.shake, 0.3); sfx('boom');
          if (flatDist(player.position, c.pos) < 3.6 && Math.abs(player.position.y - c.pos.y) < 1.5 && hitPlayer(20, c.pos, 11, false, c)) creepFeed(c);
        }
      } else if (A.t >= 0.9) { c.atk = null; c.cool = Math.max(c.cool, 1.2); }
    } else { c.atk = null; return false; }
    return true;
  }
