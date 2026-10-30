  // ---------- Spirit hunt: soul hunger, phasing and the hunting ground ----------
  // Souls are food. You cross the Veil sated; once that fades your life drains faster and faster until you devour a soul
  // or the Veil pulls you back (forceReturn). The realm is a hunting ground: its spirits rise to the hero's level, return
  // within seconds and give x1.75 experience (see reward). Hedges are only memories here (groundAt, ghostHedges).
  const HUNGER = { enter: 12, soul: 8, cap: 24, start: 0.02, ramp: 0.004, top: 0.06 };
  Object.assign(P, { sated: 0, hungerT: 0 });
  const hungerRate = () => Math.min(HUNGER.top, HUNGER.start + HUNGER.ramp * P.hungerT);
  const soulMeter = $('#soulmeter');
  let meterTxt = '';

  // Veil Moth: a small, quick flutterer of pale dust on two see-through wings; it dives at the hero in swarms
  Object.assign(CREEP_NAME, { moth: 'Veil Moth' }); Object.assign(CREEP_BASE, { moth: 26 }); Object.assign(CREEP_XP, { moth: 16 });
  const mothBodyMat = spiritMat(0xeae0ff, 0.9), mothEyeMat = new THREE.MeshBasicMaterial({ color: 0x9ff6ff });
  const mothWingMat = new THREE.MeshBasicMaterial({ color: 0xb89cff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const mothGeo = { thorax: new THREE.SphereGeometry(0.1, 8, 6), head: new THREE.SphereGeometry(0.07, 8, 6), eye: new THREE.SphereGeometry(0.03, 5, 4), ant: new THREE.ConeGeometry(0.012, 0.26, 3) };
  {
    // One wing in the body's plane: a broad forewing ahead of the hinge and a smaller hindwing behind it
    const s = new THREE.Shape(); s.moveTo(0, 0.07);
    s.quadraticCurveTo(0.3, 0.36, 0.6, 0.2); s.quadraticCurveTo(0.5, 0, 0.27, -0.02); s.quadraticCurveTo(0.36, -0.24, 0.12, -0.26); s.lineTo(0, -0.09);
    mothGeo.wing = new THREE.ShapeGeometry(s, 5).rotateX(Math.PI / 2);
  }
  function buildMoth() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const thorax = new THREE.Mesh(mothGeo.thorax, mothBodyMat); thorax.scale.set(1, 1, 2.2); body.add(thorax);
    const head = new THREE.Mesh(mothGeo.head, mothBodyMat); head.position.z = 0.26; body.add(head);
    [-1, 1].forEach(sd => {
      const e = new THREE.Mesh(mothGeo.eye, mothEyeMat); e.position.set(sd * 0.045, 0.02, 0.31); body.add(e);
      const a = new THREE.Mesh(mothGeo.ant, mothBodyMat); a.position.set(sd * 0.05, 0.12, 0.36); a.rotation.set(0.9, 0, -sd * 0.4); body.add(a);
    });
    // Each wing hangs from a hinge; the left hinge is mirrored, so rotation.z = scale.x * angle lifts both wings together
    const wings = [-1, 1].map(sd => { const pv = new THREE.Group(); pv.position.set(sd * 0.06, 0.04, 0.02); pv.scale.x = sd; pv.add(new THREE.Mesh(mothGeo.wing, mothWingMat)); body.add(pv); return pv; });
    return { g, body, wings };
  }

  // More spirits to hunt, built exactly like the spirit roster in 25-creeps, topped up to these totals
  const SPIRIT_TOTALS = [['lantern', 12], ['tide', 7], ['ember', 6], ['moth', 10]];
  const SPIRIT_FLOAT = { lantern: 0.9, ember: 0.5, moth: 1.1 }, SPIRIT_SPEED = { lantern: 1.15, ember: 1.35, moth: 1.5 };
  const moths = [];
  SPIRIT_TOTALS.forEach(([type, total]) => {
    const have = creeps.filter(c => c.realm === 'spirit' && c.type === type).length;
    for (let k = have; k < total; k++) {
      const parts = type === 'moth' ? buildMoth() : SPIRIT_BUILD[type](k), moth = type === 'moth';
      parts.g.visible = false; scene.add(parts.g); tag(parts.g, 2);
      const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
      const c = Object.assign(parts, { type, realm: 'spirit', ai: type === 'tide' ? 'ranged' : 'melee', float: SPIRIT_FLOAT[type] || 0, speed: SPIRIT_SPEED[type] || 1,
        isCreep: true, alive: false, respawn: 2 + (k - have) * 0.4, pos: parts.g.position, radius: moth ? 0.45 : 0.6, hitY: moth ? 0.5 : 0.7, markY: moth ? 1.2 : 1.8,
        hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
        wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
        ancient: false, camp: null, age: 0 });
      creeps.push(c); if (moth) moths.push(c);
    }
  });
  // Every spirit levels with the hero and comes back fast; godlings stay rare
  const spirits = creeps.filter(c => c.realm === 'spirit' && !c.storyBoss && !c.mythic);
  spirits.forEach(c => {
    const god = c.ai === 'godling';
    c.lvOf = god ? () => Math.max(worldTier(), PR.level) + 3 : () => Math.max(worldTier(), PR.level - 2) + Math.floor(Math.random() * 3);
    c.respawnAfter = god ? () => 120 : () => 4 + Math.random() * 3;
  });

  // setRealm runs this on every realm change, including death, respawn, restart and leaving for another world
  function hungerReset(r) {
    const on = r === 'spirit';
    P.sated = on ? HUNGER.enter : 0; P.hungerT = 0; meterTxt = '';
    soulMeter.hidden = !on; soulMeter.classList.remove('hungry');
    ghostHedges(on);
    // The hunting ground wakes as you cross: spirits still queued from a fresh start or restart rise within a few seconds
    if (on) spirits.forEach(c => { if (!c.alive && c.ai !== 'godling' && c.respawn > 6) c.respawn = 0.5 + Math.random() * 4; });
  }
  function feedSoul() {
    if (G.realm !== 'spirit') return;
    const was = P.sated <= 0;
    P.sated = Math.min(HUNGER.cap, P.sated + HUNGER.soul); P.hungerT = 0;
    if (was) heroWord('Sated', '#bff6ff', 3.0);
  }
  function spiritHunt(real) {
    const on = G.realm === 'spirit';
    if (soulMeter.hidden === on) soulMeter.hidden = !on;
    if (!on) return;
    const t = uTime.value;
    hedgeGhost.opacity = 0.16 + 0.06 * Math.sin(t * 1.7);
    mothWingMat.color.setHSL(0.72 + 0.05 * Math.sin(t * 2), 0.7, 0.78);
    moths.forEach((c, i) => {
      if (!c.alive || !c.g.visible) return;
      const dive = c.atk && c.atk.stage === 'wind', a = 0.45 + 0.6 * Math.sin(t * (c.stun > 0 ? 6 : dive ? 34 : 22) + i * 1.3);
      c.wings.forEach(w => { w.rotation.z = w.scale.x * a; });
      c.body.rotation.x = dive ? 0.55 : 0.12; c.body.position.y = 0.05 * Math.sin(t * 22 + i);
      if (Math.random() < 0.12) { fwColor.setHSL(0.74, 0.5, 0.85); fwParticle(c.pos.x, c.pos.y, c.pos.z, 0, -0.5, 0, fwColor, 0.7, true); }
    });
    if (G.state !== 'dead' && P.act !== 'dead') {
      if (P.sated > 0) {
        P.sated = Math.max(0, P.sated - real); P.hungerT = 0;
        if (P.sated <= 0) { heroWord('Soul hunger', '#ff6a8a'); sfx('hurt'); }
      } else {
        P.hungerT += real; P.hp = Math.max(0, P.hp - P.max * hungerRate() * real);
        if (P.hp <= 0) { forceReturn(); return; }
      }
    }
    const txt = P.sated > 0 ? `Souls sated ${Math.ceil(P.sated)}s` : `SOUL HUNGER -${Math.round(hungerRate() * 100)}%/s: devour souls`;
    if (txt !== meterTxt) { meterTxt = txt; soulMeter.textContent = txt; soulMeter.classList.toggle('hungry', P.sated <= 0); }
  }
