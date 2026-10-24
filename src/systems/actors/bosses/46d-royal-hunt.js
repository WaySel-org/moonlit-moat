  // ---------- Royal hunt: Vesthra and Nyxara roam, farm and hunt the Wanderer ----------
  // The royals no longer wait on the roof. They walk the land feeding on creeps and grow a level every few kills.
  // They leave the hero alone unless struck. Every five minutes they hunt: they and every creep where the hero
  // stands give chase, and they follow through World Gates, rifts and the Veil. Survive 60 seconds or bring them down.
  // A royal brought down in the field rises two minutes later, two levels stronger. Winning the roof fight is an Ascension (world/moat/46c-ascension.js).
  const ROYAL_BASE = { gorgon: 2400, empress: 1900 }, HUNT_EVERY = 300, HUNT_LEN = 60;
  const PLACE_NAME = { material: 'the moat', spirit: 'the Veil' };
  const placeName = k => PLACE_NAME[k] || WNAME[k];
  G.royalHunt = null; G.royalClock = 0;
  function royalStats(r) {
    const ratio = r.max > 0 ? r.hp / r.max : 1;
    r.max = Math.round(ROYAL_BASE[r.kind] * (1 + 0.35 * (r.lv - 1)));
    r.hp = Math.max(1, Math.round(r.max * ratio));
    r.pow = 1.9 + 0.2 * (r.lv - 1);
  }
  // A spot on open moat ground beside one of its neutral camps
  function royalHome(i) {
    const camps = NEUTRAL_CAMPS.filter(c => c.world === 'moat'), cp = camps[(i * 3 + Math.floor(Math.random() * 3)) % camps.length];
    return new THREE.Vector3(cp.x + 6, 0, cp.z + 6);
  }
  function royalsToField(fresh) {
    royals.forEach((r, i) => {
      if (fresh) { r.lv = 2; r.xp = 0; r.max = 0; }
      Object.assign(r, { field: true, active: false, alive: true, state: 'chase', atk: null, enraged: false, where: 'material', prey: null, provoked: 0, revive: 0, cross: 0, farmT: 0, cool: 1, t: 0 });
      royalStats(r); r.hp = r.max;
      r.pos.copy(royalHome(i)); r.body.rotation.set(0, 0, 0); r.body.position.y = r.hover; r.g.scale.setScalar(1.15); r.pivot.rotation.set(0, 0, 0); r.tele.hide();
      if (r.off) r.off.rotation.set(0, 0, 0);
    });
  }
  function resetRoyalField() { G.royalHunt = null; G.royalClock = 0; royalsToField(true); }
  royals.forEach(r => scene.attach(r.g));
  royalsToField(true);

  const royalBars = royals.map(() => {
    const bar = document.createElement('div'); bar.className = 'cbar anc'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    return { bar, fill: bar.querySelector('i'), label: bar.querySelector('span') };
  });

  // Moves a field royal over the current world's ground, sliding along walls
  function fieldStep(r, v, amt) {
    const ok = (x, z) => { const h = groundAt(x, z); return Math.abs(h - r.pos.y) <= 0.8 ? h : null; };
    const nx = r.pos.x + v.x * amt, nz = r.pos.z + v.z * amt;
    let h = ok(nx, nz); if (h !== null) { r.pos.set(nx, h, nz); return true; }
    h = ok(nx, r.pos.z); if (h !== null) { r.pos.x = nx; r.pos.y = h; return true; }
    h = ok(r.pos.x, nz); if (h !== null) { r.pos.z = nz; r.pos.y = h; return true; }
    return false;
  }
  function gainRoyal(r, n) {
    r.xp += n;
    while (r.xp >= 4 + r.lv) {
      if (r.lv >= worldTier() + 8) { r.xp = 0; break; }
      r.xp -= 4 + r.lv; r.lv++; royalStats(r); r.hp = Math.min(r.max, r.hp + r.max * 0.2);
      if (r.where === realmKey() && flatDist(r.pos, player.position) < 35) floatText(`${r.name} grows stronger · Lv ${r.lv}`, r.pos.clone().add(new THREE.Vector3(0, 4.2, 0)), 'word', '#e0a0ff');
    }
  }
  // A royal eats a creep: no reward for the hero, a step toward the royal's next level
  function devour(r, c) {
    r.cool = 1.6; r.pivot.rotation.x = -1.2;
    burst(c.pos.x, c.pos.y + 0.6, c.pos.z, 18, 5);
    if (flatDist(r.pos, player.position) < 30) sfx('hit');
    c.alive = false; c.g.visible = false; c.tele.hide(); c.atk = null; c.bar.hidden = true;
    c.respawn = c.neutral ? Infinity : 10 + Math.random() * 6;
    if (c.neutral && c.campRef && !c.campRef.members.some(m => m.alive)) c.campRef.alive = false;
    if (G.target === c) G.target = null;
    gainRoyal(r, c.ancient ? 3 : 1);
  }
  function farm(r, dt) {
    if (!r.prey || !r.prey.alive || r.prey.realm !== r.where) {
      r.prey = null; let bd = 45;
      creeps.forEach(c => { if (c.alive && c.realm === r.where && !c.storyBoss && !c.mythic && c.ai !== 'godling') { const d = flatDist(c.pos, r.pos); if (d < bd) { bd = d; r.prey = c; } } });
    }
    if (r.cool > 0.8) r.pivot.rotation.x *= 0.9;
    if (!r.prey) return;
    royalTurn(r, r.prey.pos, 4, dt);
    if (flatDist(r.pos, r.prey.pos) > 2.2) { if (!fieldStep(r, fwdOf(r.facing), 2.8 * dt)) r.prey = null; }
    else if (r.cool <= 0) devour(r, r.prey);
  }
  // Called from updateRoyal for royals in the field, every frame in any world
  function updateFieldRoyal(r, dt) {
    const here = r.where === realmKey(), tt = uTime.value;
    r.g.visible = here && r.cross <= 0;
    if (!r.g.visible) { r.tele.hide(); if (r.state === 'attack') { r.atk = null; r.state = 'chase'; } return; }
    const d = flatDist(player.position, r.pos), sp = r.enraged ? 1.25 : 1;
    r.cool -= dt; r.blinkCd -= dt; r.provoked = Math.max(0, r.provoked - dt);
    if (r.state === 'stagger') {
      r.t += dt; r.body.rotation.x = -0.3 * Math.sin(Math.min(1, r.t / 0.2) * Math.PI / 2);
      if (r.t > r.dur) { r.body.rotation.x = 0; r.state = 'chase'; r.cool = 0.4; }
      return;
    }
    if (r.state === 'attack') { updateRoyalAttack(r, dt); return; }
    r.body.position.y = r.hover ? r.hover + Math.sin(tt * 2) * 0.12 : Math.abs(Math.sin(tt * 6)) * 0.04;
    const hostile = (G.royalHunt || r.provoked > 0) && G.state !== 'dead' && G.state !== 'won';
    if (!hostile) { farm(r, dt); return; }
    royalTurn(r, player.position, 5 * sp, dt);
    if (r.kind === 'gorgon') { if (d > 2.3) fieldStep(r, fwdOf(r.facing), (G.royalHunt ? 5.4 : 3.6) * sp * dt); }
    else {
      const away = new THREE.Vector3(r.pos.x - player.position.x, 0, r.pos.z - player.position.z).normalize();
      if (d < 6) fieldStep(r, away, 3 * dt);
      else if (d > 10) fieldStep(r, away.negate(), (G.royalHunt ? 5 : 3.4) * sp * dt);
    }
    // Left far behind in a hunt, a royal tears space and lands near the hero again
    if (G.royalHunt && d > 30 && r.cool <= 0) { const p = ringSpot(10, 14); if (p) { burst(r.pos.x, r.pos.y + 1, r.pos.z, 20, 5); r.pos.set(p.x, Math.max(0, groundAt(p.x, p.z)), p.z); burst(p.x, r.pos.y + 1, p.z, 30, 6); sfx('parry'); r.cool = 1.2; } }
    if (r.cool <= 0 && d < 12 && Math.abs(player.position.y - r.pos.y) < 2) beginRoyalAttack(r, d);
    if (Math.abs(player.position.y - r.pos.y) < 1.5) {
      const dx = player.position.x - r.pos.x, dz = player.position.z - r.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 1.1 && dd > 1e-4) movePlayer(dx / dd * (1.1 - dd), dz / dd * (1.1 - dd));
    }
  }
  function fieldRoyalDown(r) {
    r.alive = false; r.state = 'dead'; r.t = 0; r.atk = null; r.tele.hide(); r.g.scale.setScalar(1.15); r.revive = 120;
    sfx('roar'); G.slow = 0.5; burst(r.pos.x, r.pos.y + 1.5, r.pos.z, 40, 7);
    const m = 1 + 0.35 * (r.lv - 1);
    reward(260 * m, 160 * m, r.pos.clone().add(new THREE.Vector3(0, 3, 0)));
    dropGear(r.pos, 2); swordFeed(10);
    [1, -1].forEach(s => spawnLoot(r.pos.x + s, r.pos.z, BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)]));
    if (G.target === r) G.target = null;
    const other = royals.find(o => o.alive && o.field);
    if (other) { other.enraged = true; if (other.where === realmKey()) floatText('ENRAGED', other.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word'); }
    showBanner(`${r.name} falls`, 'She will rise again in two minutes, two levels stronger.', 'title'); bannerTimer = 3;
    if (G.royalHunt && !royals.some(o => o.alive)) endRoyalHunt(false, 'Both royals are down and the hunt breaks. They will be back, stronger.');
  }
  function riseRoyal(r, i) {
    Object.assign(r, { alive: true, state: 'chase', atk: null, enraged: false, where: 'material', prey: null, provoked: 0, cross: 0, t: 0, cool: 1 });
    r.lv += 2; royalStats(r); r.hp = r.max;
    r.pos.copy(royalHome(i)); r.body.rotation.set(0, 0, 0); r.body.position.y = r.hover;
    floatText(`${r.name} has risen again · Lv ${r.lv}`, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)), 'word', '#e0a0ff');
  }

  const canRoyalHunt = () => (G.state === 'explore' || G.state === 'interlude') && !G.hunt && !G.story.pending && P.act !== 'leap' && royals.some(r => r.alive && r.field);
  function startRoyalHunt() {
    G.royalClock = 0; G.royalHunt = { t: HUNT_LEN };
    endEvent(true);
    royals.forEach((r, i) => {
      if (!r.alive || !r.field) return;
      r.prey = null; r.atk = null; r.state = 'chase'; r.tele.hide();
      if (r.where !== realmKey() || flatDist(r.pos, player.position) > 30) r.cross = 2.5 + i * 2.5;
    });
    showBanner('The Royal Hunt', 'Vesthra and Nyxara are coming for you, and every creep here comes with them. They follow you through gates, rifts and the Veil. Survive 60 seconds, or bring them down.', 'title');
    bannerTimer = 4.5; sfx('roar'); G.shake = Math.max(G.shake, 0.5);
  }
  function endRoyalHunt(quiet, msg) {
    if (!G.royalHunt) return;
    G.royalHunt = null; G.royalClock = 0;
    royals.forEach(r => { r.cross = 0; r.provoked = 0; });
    if (!quiet) { showBanner('The hunt ends', msg, 'title'); bannerTimer = 3.5; }
  }
  function royalHuntText() {
    if (G.royalHunt) return `Royal Hunt · survive ${fmtTime(Math.ceil(Math.max(0, G.royalHunt.t)))}.`;
    const left = HUNT_EVERY - G.royalClock;
    return left < 20 && royals.some(r => r.alive && r.field) ? `The royals stir. Hunt in ${fmtTime(Math.ceil(left))}.` : '';
  }

  // Runs every unpaused frame from updateWorlds
  function royalTick(dt, real) {
    royals.forEach((r, i) => {
      if (!r.field) return;
      if (!r.alive) { r.revive -= real; if (r.t > 2.5) r.g.visible = false; if (r.revive <= 0) riseRoyal(r, i); return; }
      // Away from the hero they keep feeding all the same
      if (r.where !== realmKey() && !G.royalHunt) { r.farmT += real; if (r.farmT > 20) { r.farmT = 0; gainRoyal(r, 1); } }
      if (G.royalHunt && G.state !== 'dead') {
        if (r.cross <= 0 && r.where !== realmKey()) r.cross = 6;
        if (r.cross > 0) {
          r.cross -= real;
          if (r.cross <= 0) {
            const p = ringSpot(12, 17); if (!p) { r.cross = 0.5; return; }
            const from = r.where; r.where = realmKey();
            r.pos.set(p.x, Math.max(0, groundAt(p.x, p.z)), p.z); r.cool = 1.5; r.state = 'chase';
            burst(p.x, r.pos.y + 1, p.z, 40, 7); sfx('roar'); G.shake = Math.max(G.shake, 0.35);
            floatText(from === r.where ? `${r.name} has found you` : `${r.name} follows you into ${placeName(r.where)}`, player.position.clone().add(new THREE.Vector3(0, 3.4 + i * 0.5, 0)), 'word', '#ff7ad8');
          }
        }
      }
    });
    if (G.royalHunt) {
      if (G.state === 'dead') {
        royals.forEach(r => { if (r.alive && r.field) gainRoyal(r, 4 + r.lv); });
        endRoyalHunt(true);
      } else {
        G.royalHunt.t -= real;
        if (G.royalHunt.t <= 0) {
          const m = tierMult(worldTier());
          reward(180 * m, 140 * m, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)));
          endRoyalHunt(false, 'You outlasted the Royal Hunt. The royals slink back to their feeding.');
        }
      }
    } else if (G.state !== 'dead') {
      G.royalClock += dt;
      if (G.royalClock >= HUNT_EVERY && canRoyalHunt()) startRoyalHunt();
    }
    // Their bars, like the creeps' but always named
    royals.forEach((r, i) => {
      const B2 = royalBars[i];
      if (!r.field || !r.alive || !r.g.visible || flatDist(r.pos, player.position) > 40) { B2.bar.hidden = true; return; }
      const sp = project(r.pos.clone().setY(r.pos.y + 3.4));
      B2.bar.hidden = !sp.ok; if (B2.bar.hidden) return;
      B2.bar.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`;
      B2.fill.style.width = (r.hp / r.max * 100) + '%';
      const t = `${r.name}${r.enraged ? ' (enraged)' : ''} · Lv ${r.lv}`; if (B2.label.textContent !== t) B2.label.textContent = t;
    });
  }
