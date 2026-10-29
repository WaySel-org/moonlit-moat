  // ---------- Power pods and moon bolts ----------
  function applyBoost(type) {
    const at = player.position.clone().add(new THREE.Vector3(0, 2.3, 0));
    if (type === 'health') P.hp = Math.min(P.max, P.hp + 35);
    else if (type === 'mana') P.mana = Math.min(P.manaMax, P.mana + 50);
    else if (type === 'damage') P.buffDmg = 15;
    else if (type === 'agility') P.buffAgi = 15;
    else if (type === 'armor') P.armor = P.armorMax;
    sfx('pickup');
    burst(player.position.x, 1.2, player.position.z, 22, 4);
    floatText(BOOST[type].label, at, 'word', BOOST[type].css);
  }
  function updatePods(dt) {
    const t = uTime.value;
    pods.forEach((p, i) => {
      if (!p.pod.visible) { p.regrow -= dt; if (p.regrow <= 0) seedPod(p, 0); return; }
      p.grow = Math.min(1, p.grow + dt / 6);
      const ripe = p.grow >= 1;
      const s = (0.15 + 0.85 * ease(p.grow)) * (ripe ? 1 + 0.14 * Math.sin(t * 5 + i) : 1);
      p.pod.scale.setScalar(s);
      p.pod.position.y = 1.0 + 0.25 * ease(p.grow) + (ripe ? Math.sin(t * 2 + i) * 0.06 : 0);
      p.stem.scale.y = 0.3 + 0.7 * ease(p.grow);
      p.pod.rotation.y += dt * 1.5;
      if (ripe && G.state !== 'dead' && G.state !== 'won' && flatDist(player.position, p) < 1.4 && Math.abs(player.position.y - p.y) < 1.5) {
        applyBoost(p.type); p.pod.visible = false; p.regrow = 16 + Math.random() * 12;
      }
    });
  }

  const bolts = [];
  const boltGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const HITTABLE = ['chase', 'attack', 'stagger', 'roar'];
  const daggerGeo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
  // pierce: extra foes it passes through (never the same one twice), blast: splash radius on impact, rend: makes foes bleed
  function spawnBolt(o) {
    o = Object.assign({ angle: P.facing, dmg: 44 * PR.spell, speed: 17, home: 4, life: 1.6, poise: 26, color: 0xa9c4ff, geo: boltGeo, heavy: true, trail: true, pierce: 0, blast: 0, rend: false }, o || {});
    const m = new THREE.Mesh(o.geo, new THREE.MeshBasicMaterial({ color: o.color }));
    const f = fwdOf(o.angle);
    m.position.copy(player.position).addScaledVector(f, 0.8); m.position.y = player.position.y + 1.3; m.rotation.y = o.angle;
    scene.add(m);
    const b = Object.assign(o, { m, dir: f.clone(), t: 0, hits: new Set() });
    bolts.push(b); return b;
  }
  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.t += dt;
      const live = liveTargets();
      if (b.home > 0) {
        const near = live.filter(t => !b.hits.has(t) && flatDist(t.pos, b.m.position) < 22);
        const tgt = (G.target && near.includes(G.target)) ? G.target : nearestTarget(near, b.m.position);
        if (tgt) {
          const to = tgt.pos.clone().setY(tgt.pos.y + tgt.hitY).sub(b.m.position).normalize();
          b.dir.lerp(to, Math.min(1, dt * b.home)).normalize();
        }
      }
      b.m.position.addScaledVector(b.dir, b.speed * dt);
      b.m.rotation.y = Math.atan2(b.dir.x, b.dir.z);
      if (b.trail && Math.random() < 0.7) burst(b.m.position.x, b.m.position.y, b.m.position.z, 1, 1);
      let done = b.t > b.life;
      if (!done) {
        const hit = live.find(t => !b.hits.has(t) && flatDist(b.m.position, t.pos) < t.radius + 0.3 && b.m.position.y > t.pos.y - 0.5 && b.m.position.y < t.pos.y + t.hitY * 2);
        if (hit) {
          strike(hit, b.dmg, b.poise, b.heavy, { spell: b.geo !== daggerGeo });
          if (b.rend) applyRend(hit, 1);
          if (b.blast) boltBlast(b, hit, live);
          if (b.pierce > 0) { b.pierce--; b.hits.add(hit); } else done = true;
        }
      }
      if (!done && G.world === 'moat' && dragon.state === 'fly' && dragon.g.visible) {
        const dc = dragon.g.position;
        if (b.m.position.distanceTo(dc) < 3.4) { done = true; damageDragon(b.dmg); }
      }
      if (done) { scene.remove(b.m); b.m.material.dispose(); bolts.splice(i, 1); }
    }
  }
