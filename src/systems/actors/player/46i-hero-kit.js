  // ---------- Hero kit: roll combos, Blade Spin and ability ranks ----------
  // Roll combos: J late in a roll (or within 0.3 s of it ending) is a lunging Roll Slash, K a full-circle Roll Cleave
  // that shoves creeps back. On a beast the roll is its dash and J or K after it is a Trample (see 46j-beast-kit.js).
  // Blade Spin (H, level 20) is the 'spin' act: the hero whirls with the sword held out, steers at 90% speed, takes
  // 40% less damage and shrugs off flinching, knockback, chill and stone (46h-status.js reads the act name).
  // Spells and beast skills grow 5% a level (abilityScale) and evolve at levels 6, 12 and 18 (abilityRank).
  Object.assign(P, { rollWin: 0, spinOn: false, spinTick: 0 });
  function abilityScale() { return 1 + 0.05 * (PR.level - 1); }
  function abilityRank() { return PR.level >= 18 ? 4 : PR.level >= 12 ? 3 : PR.level >= 6 ? 2 : 1; }
  const RANK_ROMAN = ['', '', ' II', ' III', ' IV'];
  const rankName = n => n + RANK_ROMAN[abilityRank()];
  const volleyCd = () => abilityRank() >= 4 ? 3 : 4;
  const SPIN_CD = 16, SPIN_MANA = 50, SPIN_LV = 20;
  // Ordinary creeps can be stunned and shoved; bosses, mythics, godlings, royals and raiders cannot
  function heroMinorFoe(t) { return !!t.isCreep && !t.mythic && !t.storyBoss && t.ai !== 'godling'; }
  function heroShove(t, amt) { if (heroMinorFoe(t) && t.alive) creepMove(t, new THREE.Vector3(t.pos.x - player.position.x, 0, t.pos.z - player.position.z).normalize(), amt); }
  function heroDaze(t, secs) { if (heroMinorFoe(t) && t.alive) t.stun = Math.max(t.stun || 0, secs); }
  function kitRingFx(x, y, z, col, r) {
    const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(x, y + 0.06, z); scene.add(m); fxRings.push({ m, r: r || 0.4 });
  }
  // Strikes every target within range of `at`, inside the arc around the hero's facing (anything touching counts,
  // so a surge that ends on top of a foe still hits it); each(t) runs after a hit
  function heroZoneHit(at, range, arc, dmg, poise, heavy, each, spell) {
    liveTargets().forEach(t => {
      const d = flatDist(at, t.pos);
      if (Math.abs(t.pos.y - at.y) > 2.5 || d > range + t.radius) return;
      if (arc < TAU && d > t.radius + 1 && Math.abs(angDiff(P.facing, yawTo(at, t.pos))) > arc / 2) return;
      strike(t, dmg, poise, heavy, { spell: !!spell });
      if (each) each(t);
    });
  }

  // Runs first in updatePlayer: tidies a spin that something else ended (death, a world change, the spirit realm)
  function heroKitFrame(dt) {
    P.rollWin = Math.max(0, P.rollWin - dt);
    if (P.spinOn && P.act !== 'spin') { P.spinOn = false; pBody.rotation.y = 0; }
  }
  // J or K late in a roll or just after it; Starbound Charge reuses the roll act and never combos
  function rollFollow(name) {
    if ((name !== 'light' && name !== 'heavy') || P.jh > 0 || P.st <= 0) return null;
    const late = P.act === 'roll' && !P.chargeDmg && P.actT > P.actDur * (P.mount ? 0.25 : 0.5);
    if (!late && !(P.act === null && P.rollWin > 0)) return null;
    return P.mount ? 'trample' : name === 'light' ? 'rollslash' : 'rollcleave';
  }
  // Called from startAct once P.act, P.actT and P.hitDone are set; stamina costs come from COST
  function startKit(name) {
    P.combo = 0;
    if (name === 'spin') {
      P.actDur = Math.min(4.5, 3 + 0.05 * (PR.level - SPIN_LV)); P.mana -= SPIN_MANA; P.cd.h = SPIN_CD; P.spinOn = true; P.spinTick = 0.08;
      sfx('roar'); heroWord('BLADE SPIN', '#ffd36a', 3);
    } else if (name === 'rollslash') { P.actDur = 0.38; sfx('swing'); }
    else if (name === 'rollcleave') { P.actDur = 0.56; sfx('swoosh'); }
    else if (name === 'trample') { P.actDur = 0.45; sfx('roar'); }
  }
  // Per-frame ticks for the kit's acts; k is the act's progress from 0 to 1
  function kitTick(dt, k) {
    const a = P.act;
    if (a === 'spin') spinTick(dt);
    else if (a === 'rollslash') {
      if (k < 0.45) { const f = fwdOf(P.facing); movePlayer(f.x * 9 * dt, f.z * 9 * dt); }
      if (!P.hitDone && k > 0.3) { P.hitDone = true; spawnSwoosh(false); playerStrike(34, 20, 3.0, 2.4, false); }
    } else if (a === 'rollcleave') {
      pBody.rotation.y = ease((k - 0.15) / 0.55) * TAU;
      if (!P.hitDone && k > 0.4) {
        P.hitDone = true; sfx('swoosh'); spawnSwoosh(true); spawnSwoosh(true, P.facing + Math.PI); G.shake = Math.max(G.shake, 0.3);
        playerStrike(62, 45, 3.4, TAU, true);
        liveTargets().forEach(t => { if (flatDist(player.position, t.pos) < 3.4 + t.radius) heroShove(t, 2.4); });
      }
    } else if (a === 'trample') trampleTick(k);
    else if (a === 'gore') goreTick(dt, k);
  }
  function spinTick(dt) {
    if (P.mount) { P.act = null; return; }
    const mv = moveInput();
    if (mv.lengthSq() > 0) {
      const sp = 6.8 * 0.9 * PR.speed * (P.buffAgi > 0 ? 1.4 : 1) * (P.y < -0.05 ? 0.6 : 1);
      mv.normalize(); movePlayer(mv.x * sp * dt, mv.z * sp * dt); P.facing = Math.atan2(mv.x, mv.z);
    }
    pBody.rotation.y += dt * 15;
    if (Math.random() < 0.5) { const a = Math.random() * TAU; fwColor.setHSL(0.13, 0.9, 0.75); fwParticle(player.position.x + Math.sin(a) * 2.6, player.position.y + 1, player.position.z + Math.cos(a) * 2.6, Math.cos(a) * 3, 0.5, -Math.sin(a) * 3, fwColor, 0.35, true); }
    P.spinTick -= dt;
    if (P.spinTick > 0) return;
    P.spinTick += 0.25;
    const a = P.facing + pBody.rotation.y, d = 10 * PR.dmg * abilityScale();
    spawnSwoosh(false, a); spawnSwoosh(false, a + Math.PI); sfx('swing');
    liveTargets().forEach(t => {
      if (Math.abs(t.pos.y - player.position.y) > 2.5 || flatDist(player.position, t.pos) > 3.4 + t.radius) return;
      strike(t, d, 6, false); gearOnHit(d);
    });
  }

  // Moon Bolt: II pierces two more foes, III bursts on impact, IV adds two side bolts at 60%
  function castBolt() {
    const r = abilityRank(), dmg = 44 * PR.spell * abilityScale(), o = { pierce: r >= 2 ? 2 : 0, blast: r >= 3 ? 2.6 : 0 };
    spawnBolt(Object.assign({ dmg }, o));
    if (r >= 4) [-0.3, 0.3].forEach(d => spawnBolt(Object.assign({ angle: P.facing + d, dmg: dmg * 0.6 }, o)));
  }
  // Arc Volley: 5, 7, 9 or 11 homing bolts; from III each pierces one foe
  function castVolley() {
    const r = abilityRank(), n = 3 + 2 * r, step = Math.min(0.2, 1.7 / (n - 1));
    for (let i = 0; i < n; i++) spawnBolt({ angle: P.facing + (i - (n - 1) / 2) * step, dmg: 26 * PR.spell * abilityScale(), home: 2.2, poise: 12, color: 0xc8a9ff, heavy: false, pierce: r >= 3 ? 1 : 0 });
  }
  // Dagger: II throws a fan of three, III daggers pierce one foe and Rend, IV throws five
  function throwDaggers() {
    const r = abilityRank(), n = r >= 4 ? 5 : r >= 2 ? 3 : 1;
    for (let i = 0; i < n; i++) spawnBolt({ angle: P.facing + (i - (n - 1) / 2) * 0.16, dmg: 20 * PR.dmg * abilityScale(), speed: 26, home: 0, life: 0.9, poise: 8, color: 0xe8eef2, geo: daggerGeo, heavy: false, trail: false, pierce: r >= 3 ? 1 : 0, rend: r >= 3 });
  }
  // A bolt with a blast radius splashes half its damage on everyone else nearby
  function boltBlast(b, hit, live) {
    const p = b.m.position;
    kitRingFx(p.x, hit.pos.y, p.z, 0xbff6ff, 0.3); burst(p.x, p.y, p.z, 16, 6);
    live.forEach(t => { if (t !== hit && t.alive !== false && Math.abs(t.pos.y - hit.pos.y) < 3 && flatDist(p, t.pos) < b.blast + t.radius) strike(t, b.dmg * 0.5, b.poise * 0.5, false, { spell: true }); });
  }
  // What each level-up unlocks, gathered into one tip card
  const RANK_NEWS = [[6, 'Moon Bolt II: pierces', 'Arc Volley II: 7 bolts', 'Dagger II: fan of three'],
    [12, 'Moon Bolt III: bursts on impact', 'Arc Volley III: 9 piercing bolts', 'Dagger III: pierces and Rends'],
    [18, 'Moon Bolt IV: two side bolts', 'Arc Volley IV: 11 bolts, 3 s cooldown', 'Dagger IV: fan of five']];
  function heroNews(was) {
    const lines = [];
    if (was < 3 && PR.level >= 3) lines.push(`Arc Volley learned (${tipKey('KeyI', 'Volley')})`);
    RANK_NEWS.forEach(([lv, ...l]) => { if (was < lv && PR.level >= lv) lines.push(...l); });
    if (was < SPIN_LV && PR.level >= SPIN_LV) lines.push(`Blade Spin learned (${tipKey('KeyH', 'Spin')})`);
    if (lines.length) showTip(`Level ${PR.level}: new powers`, lines, 7);
  }
