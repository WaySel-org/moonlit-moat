  // ---------- Beast kit: mounted combos, pounce and the four beast skills ----------
  // Mounted attacks never stop the beast: it keeps running at 85% while it claws, rampages, tramples or uses a skill.
  // J claws, claws again, then rears up and stomps when each press comes within 0.75 s of the last; a J or K buffered
  // past 60% of a gore cuts into the next. K is Rampage, a short surge that gores a wide arc. Space pounces; in the
  // air J swipes and K is Pounce Slam (46e-arsenal.js). Y U I O are the beast's skills mp3, mp1, mp4 and mp2, so
  // content files that tune mp1 and mp2 keep working.
  Object.assign(P, { claw: 0, clawAt: -9, gore: 'claw', mpKind: null });
  function isMp(n) { return n === 'mp1' || n === 'mp2' || n === 'mp3' || n === 'mp4'; }
  // True while a mounted attack is running that lets the beast keep moving (not a power that became a leap or a dash)
  function rideAct() { return !!P.mount && (P.act === 'gore' || P.act === 'trample' || isMp(P.act)); }
  // J and K on a beast; startAct has set P.act, P.actT and P.hitDone
  function beastAttack(name) {
    const now = uTime.value, chain = now - P.clawAt < 0.75;
    P.act = 'gore'; P.combo = 0; P.stDelay = 0.5;
    if (name === 'heavy') { P.gore = 'rampage'; P.actDur = 0.5; P.claw = 0; P.st -= stCost(14); sfx('roar'); }
    else if (chain && P.claw >= 2) { P.gore = 'stomp'; P.actDur = 0.5; P.claw = 0; P.st -= stCost(10); sfx('roar'); }
    else { P.gore = 'claw'; P.actDur = 0.3; P.claw = chain ? P.claw + 1 : 1; P.st -= stCost(6); sfx('swoosh'); }
    P.clawAt = now;
    return true;
  }
  function goreTick(dt, k) {
    const g = P.gore, f = fwdOf(P.facing);
    if (g === 'rampage' && k < 0.4) movePlayer(f.x * 20 * dt, f.z * 20 * dt);
    if (P.hitDone || k < (g === 'claw' ? 0.2 : g === 'stomp' ? 0.35 : 0.4)) return;
    P.hitDone = true;
    const d = BEAST_TYPES[P.mount ? P.mount.type : 'stag'].dmg * PR.dmg, at = player.position;
    if (g === 'claw') { spawnSwoosh(false); heroZoneHit(at, 3.6, 2.6, d * 0.8, 18, false); }
    else if (g === 'rampage') { spawnSwoosh(true); G.shake = Math.max(G.shake, 0.3); heroZoneHit(at, 4.2, 4.0, d * 1.6, 40, true, t => heroShove(t, 1.5)); }
    else {
      G.shake = Math.max(G.shake, 0.4); sfx('boom'); kitRingFx(at.x, P.y, at.z, 0xfff0c8); burst(at.x, P.y + 0.3, at.z, 24, 6);
      heroZoneHit(at, 4.2, TAU, d * 1.5, 40, true, t => heroDaze(t, 0.7));
    }
  }
  // Trample: J or K during or just after the beast's dash slams the ground around it
  function trampleTick(k) {
    if (P.hitDone || k < 0.2) return;
    P.hitDone = true;
    const at = player.position, d = BEAST_TYPES[P.mount ? P.mount.type : 'stag'].dmg * 1.3 * PR.dmg;
    G.shake = Math.max(G.shake, 0.45); sfx('boom'); kitRingFx(at.x, P.y, at.z, 0xffd36a); burst(at.x, P.y + 0.3, at.z, 30, 7);
    heroZoneHit(at, 4.5, TAU, d, 35, true, t => heroShove(t, 1.5));
  }
  // The beast rears for a stomp or a trample, dips its head for a slam and whirls for a tail lash
  function beastPose(b) {
    const k = P.actDur ? clamp(P.actT / P.actDur, 0, 1) : 0, rear = (P.act === 'gore' && P.gore === 'stomp') || P.act === 'trample';
    b.body.rotation.x = rear ? -Math.sin(k * Math.PI) * 0.55 : P.act === 'plunge' ? 0.4 : P.jh > 0 ? -0.2 : 0;
    b.body.rotation.y = isMp(P.act) && P.mpKind === 'lash' ? ease(k / 0.7) * TAU : 0;
  }

  // The Y and I skills (any slot can hold any kind). startMountPower spends the mana, starts the cooldown and names it.
  const stampedeGeo = new THREE.ConeGeometry(0.5, 1.6, 5).rotateX(Math.PI / 2), featherBoltGeo = new THREE.BoxGeometry(0.16, 0.04, 0.6);
  function beastSkill(pw) {
    const s = abilityScale(), at = player.position, kind = pw.kind;
    if (kind === 'toss') {
      P.actDur = 0.35; spawnSwoosh(true);
      heroZoneHit(at, 4.5, 1.8, 38 * PR.dmg * s, 30, true, t => { if (!heroMinorFoe(t)) return; heroDaze(t, 0.8); heroShove(t, 2.5); burst(t.pos.x, t.pos.y + 1, t.pos.z, 10, 6); });
    } else if (kind === 'stampede') {
      P.actDur = 0.4;
      for (let i = -2; i <= 2; i++) {
        const b = spawnBolt({ angle: P.facing + i * 0.04, dmg: 30 * PR.spell * s, speed: 16, home: 0, life: 1.1, poise: 20, color: 0xbff6ff, geo: stampedeGeo, heavy: false, pierce: 99 });
        b.m.position.x += Math.cos(P.facing) * i * 0.9; b.m.position.z -= Math.sin(P.facing) * i * 0.9; b.m.position.y = P.y + P.jh + 0.9;
      }
    } else if (kind === 'rake') {
      P.actDur = 0.3;
      [0, 0.1, 0.2].forEach(t => after(t, () => { if (!P.mount) return; spawnSwoosh(false, P.facing + (Math.random() - 0.5)); sfx('swing'); heroZoneHit(player.position, 3.8, 1.8, 16 * PR.dmg * s, 8, false); }));
    } else if (kind === 'feathers') {
      P.actDur = 0.4;
      for (let i = 0; i < 9; i++) spawnBolt({ angle: P.facing + (i - 4) * 0.2, dmg: 18 * PR.spell * s, speed: 20, home: 3, life: 1.5, poise: 6, color: 0xffe8b0, geo: featherBoltGeo, heavy: false });
    } else if (kind === 'lash') {
      P.actDur = 0.45; spawnSwoosh(true); spawnSwoosh(true, P.facing + Math.PI); G.shake = Math.max(G.shake, 0.3);
      heroZoneHit(at, 4.8, TAU, 36 * PR.dmg * s, 30, true, t => heroShove(t, 3));
    } else if (kind === 'embers') {
      P.actDur = 0.4;
      for (let i = 0; i < 6; i++) {
        const a = P.facing + (Math.random() - 0.5) * 1.1, d = 2.5 + i * 1.1 + Math.random();
        const x = at.x + Math.sin(a) * d, z = at.z + Math.cos(a) * d, gh = groundAt(x, z), y = gh < 50 ? gh : P.y;
        after(i * 0.1, () => { fwColor.setHSL(0.05, 1, 0.55); for (let j = 0; j < 4; j++) fwParticle(x, y + 6 + j * 1.2, z, 0, -22, 0, fwColor, 0.35, false); });
        after(0.35 + i * 0.1, () => {
          sfx('boom'); kitRingFx(x, y, z, 0xff8a3a, 0.3); burst(x, y + 0.4, z, 18, 6); addPatch(x, y, z, 1.4, true);
          heroZoneHit(new THREE.Vector3(x, y, z), 2.4, TAU, 34 * PR.spell * s, 15, false, null, true);
        });
      }
    }
  }
