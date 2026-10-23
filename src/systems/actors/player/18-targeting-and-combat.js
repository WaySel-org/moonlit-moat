  // ---------- Targets: the Warden and the royals share one interface ----------
  const WARDEN = { get pos() { return boss.position; }, radius: 1.3, hitY: 2.6, markY: 6.3, isWarden: true };
  function liveTargets() {
    const out = [];
    const rk = realmKey(), inMoat = G.world === 'moat';
    if (inMoat && HITTABLE.includes(B.state)) out.push(WARDEN);
    royals.forEach(r => { if (r.field ? r.alive && r.g.visible && flatDist(r.pos, player.position) < 30 : inMoat && r.active && r.alive) out.push(r); });
    creeps.forEach(c => { if (c.alive && c.realm === rk && flatDist(c.pos, player.position) < (c.ai === 'godling' ? 40 : 26)) out.push(c); });
    return out;
  }
  function nearestTarget(list, from) {
    let best = null, bd = Infinity;
    list.forEach(t => { const d = flatDist(from, t.pos); if (d < bd) { bd = d; best = t; } });
    return best;
  }
  function lockTarget() {
    const live = liveTargets();
    if (!live.length) return null;
    if (!G.target || !live.includes(G.target)) {
      const bosses = live.filter(t => !t.isCreep && !(t.field && !G.royalHunt && !(t.provoked > 0)));
      G.target = nearestTarget(bosses.length ? bosses : live, player.position);
    }
    return G.target;
  }
  function damageEnemy(t, dmg, poiseDmg, heavy) { if (t.isWarden) damageBoss(dmg, poiseDmg, heavy); else if (t.isCreep) damageCreep(t, dmg, poiseDmg, heavy); else damageRoyal(t, dmg, poiseDmg, heavy); }

  // Moves the player, sliding along walls and refusing ledges taller than a step
  function movePlayer(dx, dz) {
    const p = player.position;
    const ok = (x, z) => { const h = groundAt(x, z); return Math.abs(h - P.y) <= 0.6 ? h : null; };
    let h = ok(p.x + dx, p.z + dz);
    if (h !== null) { p.x += dx; p.z += dz; P.y = h; return; }
    h = ok(p.x + dx, p.z); if (h !== null) { p.x += dx; P.y = h; return; }
    h = ok(p.x, p.z + dz); if (h !== null) { p.z += dz; P.y = h; }
  }
  function tryBuffered() {
    if (!P.buffer) return;
    if (P.mount && (P.buffer === 'cast' || P.buffer === 'leap')) P.buffer = P.buffer === 'cast' ? 'mp1' : 'mp2';
    const name = P.buffer;
    if (P.act === null) {
      if (name === 'drink' && P.flasks <= 0) { P.buffer = null; return; }
      const say = (t, c) => { P.buffer = null; floatText(t, player.position.clone().add(new THREE.Vector3(0, 2.3, 0)), 'word', c || '#4a7bff'); };
      if (name === 'cast' && P.mana < 30) return say('not enough mana');
      if (name === 'throw' && (P.cd.z > 0 || P.st < 6)) { P.buffer = null; return; }
      if (name === 'volley') { if (PR.level < 3) return say('Arc Volley unlocks at level 3', '#ffd36a'); if (P.cd.v > 0) { P.buffer = null; return; } if (P.mana < 50) return say('not enough mana'); }
      if (P.mount && name === 'volley') return say('Not while riding', '#ffd36a');
      if (name === 'mp1' || name === 'mp2') { const pw = MOUNT_POWERS[P.mount.type][name]; if (P.cd[name] > 0) { P.buffer = null; return; } if (P.mana < pw.mana) return say('not enough mana'); }
      if (name === 'leap') { if (!PR.warden) return say("Beat the Warden to learn this", '#ffd36a'); if (P.cd.x > 0) { P.buffer = null; return; } if (P.mana < 25) return say('not enough mana'); }
      if (name === 'drink') { P.flasks--; }
      if (name !== 'light') P.combo = 0;
      if (startAct(name)) P.buffer = null;
    } else if (P.act === 'light' && name === 'light' && P.combo < 2 && P.actT > P.actDur * 0.55) {
      P.combo++; P.act = null; startAct('light'); P.buffer = null;
    } else if (P.act === 'light' && name === 'roll' && P.actT > P.actDur * 0.5) {
      P.act = null; startAct('roll'); P.buffer = null;
    }
  }

  function playerStrike(dmg, poiseDmg, range, arc, heavy) {
    liveTargets().forEach(t => {
      if (Math.abs(t.pos.y - player.position.y) > 2.5) return;
      const d = flatDist(player.position, t.pos);
      const ang = Math.abs(angDiff(P.facing, yawTo(player.position, t.pos)));
      if (d > range + t.radius || ang > arc / 2) return;
      damageEnemy(t, dmg * PR.dmg * (G.env.dmg || 1), poiseDmg, heavy);
    });
  }
  function damageBoss(dmg, poiseDmg, heavy) {
    const dmgOut = Math.round(dmg * (0.9 + Math.random() * 0.2) * (B.state === 'stagger' ? 1.5 : 1) * (P.buffDmg > 0 ? 1.5 : 1));
    B.hp = Math.max(0, B.hp - dmgOut);
    B.flash = 1;
    G.hitstop = heavy ? 0.11 : 0.06; G.shake = Math.max(G.shake, heavy ? 0.35 : 0.15);
    const hp = boss.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    burst(hp.x, hp.y, hp.z, heavy ? 26 : 14, heavy ? 7 : 5);
    floatText(String(dmgOut), hp, heavy || B.state === 'stagger' || P.buffDmg > 0 ? 'big' : '', P.buffDmg > 0 ? '#ff3b3b' : null);
    sfx(heavy ? 'heavyhit' : 'hit');
    if (B.state !== 'stagger') {
      B.poise -= poiseDmg;
      if (B.poise <= 0) staggerBoss(1.8, 'STAGGERED');
    }
    if (B.hp <= 0) killBoss();
  }

  function staggerBoss(dur, word) {
    B.state = 'stagger'; B.t = 0; B.dur = dur; B.atk = null; B.poise = 100; hideTele();
    floatText(word, boss.position.clone().add(new THREE.Vector3(0, 5.2, 0)), 'word');
  }

  // Returns true if the hit connected
  function hitPlayer(dmg, src, kbStrength, parryable, attacker) {
    if (G.state === 'dead' || G.state === 'won' || G.state === 'intro' || G.shop) return false;
    dmg *= (attacker && attacker.isCreep) ? attacker.mult * G.env.creepDmg : (attacker && attacker.pow) ? attacker.pow : G.dmgMult;
    if (P.iframe > 0) { floatText('dodged', player.position.clone().add(new THREE.Vector3(0, 2.2, 0)), 'word'); return false; }
    const facingSrc = Math.abs(angDiff(P.facing, yawTo(player.position, src))) < 1.9;
    if (P.block && facingSrc) {
      if (parryable && P.blockT < 0.2) {
        G.parries++; sfx('parry'); G.hitstop = 0.14; G.shake = 0.3;
        const at = player.position.clone().add(fwdOf(P.facing).multiplyScalar(0.7)).setY(1.2);
        burst(at.x, at.y, at.z, 30, 8);
        floatText('PARRY', player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word');
        if (attacker && attacker.isCreep) { attacker.stun = 1.3; attacker.atk = null; attacker.tele.hide(); }
        else if (attacker) staggerRoyal(attacker, 1.3, 'STUNNED'); else staggerBoss(1.3, 'STUNNED');
        return false;
      }
      sfx('clang'); G.shake = Math.max(G.shake, 0.15);
      P.st -= dmg * 1.3; P.stDelay = 0.8;
      if (P.st < 0) {
        P.st = 0; P.block = false;
        floatText('guard broken', player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word');
        dmg = Math.round(dmg * 0.6);
      } else {
        dmg = Math.round(dmg * 0.2);
        const at = player.position.clone().add(fwdOf(P.facing).multiplyScalar(0.6)).setY(1.1);
        burst(at.x, at.y, at.z, 10, 4);
        kbStrength *= 0.4;
      }
    } else {
      sfx('hurt');
      P.act = 'hurt'; P.actT = 0; P.actDur = 0.4; P.combo = 0;
      ui.flash.style.opacity = '1'; setTimeout(() => { ui.flash.style.opacity = '0'; }, 120);
      G.shake = Math.max(G.shake, 0.45); G.hitstop = 0.07;
    }
    if (dmg > 0 && P.armor > 0) {
      const absorbed = Math.min(P.armor, dmg);
      P.armor -= absorbed; dmg -= absorbed;
      floatText(`-${Math.round(absorbed)} armour`, player.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 'word', '#3af0ff');
    }
    if (dmg > 0) {
      dmg = Math.round(dmg);
      P.hp = Math.max(0, P.hp - dmg); G.hitsTaken++;
      floatText(String(dmg), player.position.clone().add(new THREE.Vector3(0, 2, 0)), 'hurt');
    }
    const away = new THREE.Vector3(player.position.x - src.x, 0, player.position.z - src.z);
    if (away.lengthSq() < 1e-4) away.copy(fwdOf(P.facing)).negate();
    P.kb.copy(away.normalize().multiplyScalar(kbStrength));
    if (P.hp <= 0) { if (G.realm === 'spirit') forceReturn(); else killPlayer(); }
    return true;
  }
