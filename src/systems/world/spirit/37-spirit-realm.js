  // ---------- The Spirit Realm: a dream laid over the same world ----------
  const SPIRIT_ENV = { name: 'Spirit Realm', hor: [0.28, 0.16, 0.42], zen: [0.06, 0.02, 0.14], moon: 0xe0c8ff, aur: 1.4, fog: 0.024, fogCol: 0x3a2458, embers: 0 };
  const RIFTS = [[10, 26], [-28, 10], [34, -14], [-20, 46], [62, 6], [-50, -72], [6, -56]].map(([x, z]) => ({ x, z }));
  const riftMat = new THREE.MeshBasicMaterial({ color: 0xc8a0ff });
  const riftInner = new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const riftBeam = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.1, depthWrite: false });
  RIFTS.forEach(r => {
    const g = new THREE.Group(); g.position.set(r.x, 0, r.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 36), riftMat); ring.position.y = 1.8; g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), riftInner); disc.position.y = 1.8; g.add(disc);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 24, 8, 1, true), riftBeam); beam.position.y = 12; g.add(beam);
    scene.add(g); r.g = g; r.ring = ring; r.disc = disc;
    tag(ring, 1);
  });
  function nearestRift() {
    let best = RIFTS[0], bd = Infinity;
    RIFTS.forEach(r => { const d = Math.hypot(player.position.x - r.x, player.position.z - r.z); if (d < bd) { bd = d; best = r; } });
    return { r: best, d: bd };
  }
  function updateRifts(real) {
    const tt = uTime.value;
    RIFTS.forEach((r, i) => {
      r.g.rotation.y += real * 0.6; r.ring.rotation.z += real * 1.5;
      r.disc.scale.setScalar(0.85 + 0.15 * Math.sin(tt * 3 + i));
      if (Math.random() < 0.25 && Math.hypot(player.position.x - r.x, player.position.z - r.z) < 40) { fwColor.setHSL(0.75, 0.7, 0.75); fwParticle(r.x + (Math.random() - 0.5) * 2, 0.3, r.z + (Math.random() - 0.5) * 2, 0, 1.5 + Math.random() * 2, 0, fwColor, 1.4, true); }
    });
  }
  // Glowing spirit-trees that only exist in the spirit realm, mostly out in the wider wilds
  const spiritProps = new THREE.Group(); spiritProps.visible = false; scene.add(spiritProps);
  {
    const crystal = [spiritMat(0x9fe8ff, 0.55), spiritMat(0xc8a0ff, 0.55), spiritMat(0xe0f0ff, 0.45)];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, rr = i < 50 ? 84 + Math.random() * 30 : 20 + Math.random() * 55;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(x) < 24 && z < -6 && z > -40) continue;
      const h = 3 + Math.random() * 7, t = new THREE.Mesh(new THREE.ConeGeometry(0.4 + Math.random() * 0.5, h, 5), crystal[i % 3]);
      t.position.set(x, h / 2, z); spiritProps.add(t);
      const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), crystal[(i + 1) % 3]); o.position.set(x, h + 0.8, z); spiritProps.add(o);
    }
  }
  function setRealm(r, silent) {
    G.realm = r; G.lock = false; G.target = null;
    const rk = realmKey();
    creeps.forEach(c => { c.g.visible = c.alive && c.realm === rk; if (c.realm !== rk) { c.bar.hidden = true; c.tele.hide(); c.atk = null; } });
    if (P.mount && r === 'spirit') dismount(true);
    if (silent) return;
    sfx('parry'); G.shake = Math.max(G.shake, 0.3);
    for (let i = 0; i < 80; i++) { fwColor.setHSL(0.72 + Math.random() * 0.1, 0.7, 0.75); const a = Math.random() * TAU, sp = 2 + Math.random() * 5; fwParticle(player.position.x, player.position.y + 1, player.position.z, Math.cos(a) * sp, 1 + Math.random() * 4, Math.sin(a) * sp, fwColor, 1.2, true); }
    showBanner(r === 'spirit' ? 'Spirit Realm' : 'Material Realm', r === 'spirit'
      ? 'Your life slowly fades here. Devour the souls of fallen foes to restore it, and return through a violet Veil Rift.'
      : 'Back among the living.', 'title');
    bannerTimer = 3.5;
  }
  function toggleRealm() {
    if (G.paused || G.shop || P.act === 'dead') return;
    const at = player.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    if (G.world !== 'moat' || G.storm) { floatText(G.storm ? 'The rift storm drowns out the Veil' : 'The Veil only opens over the moat', at, 'word', '#c8a0ff'); return; }
    if (G.realm === 'material') {
      if (!(G.state === 'explore' || G.state === 'interlude') || G.hunt) { floatText("The Veil won't open mid-battle", at, 'word', '#c8a0ff'); return; }
      setRealm('spirit');
    } else {
      const nr = nearestRift();
      if (nr.d > 4) { floatText('Find a violet Veil Rift to return', at, 'word', '#c8a0ff'); return; }
      setRealm('material');
    }
  }
  function forceReturn() {
    const nr = nearestRift();
    setRealm('material');
    player.position.set(nr.r.x + 2.5, 0, nr.r.z); P.y = 0;
    P.hp = Math.max(P.hp, Math.round(P.max * 0.3)); P.act = null; P.kb.set(0, 0, 0);
    floatText('Your soul is pulled back to the living world', player.position.clone().add(new THREE.Vector3(0, 2.8, 0)), 'word', '#c8a0ff');
  }
  // Souls: every fallen foe leaves one. Devour it to restore your life.
  const souls = [], soulGeo = new THREE.SphereGeometry(0.2, 8, 6), soulMat = new THREE.MeshBasicMaterial({ color: 0xbff6ff });
  function spawnSoul(x, y, z, heal) {
    const m = new THREE.Mesh(soulGeo, soulMat); m.position.set(x, Math.max(0, y) + 1.2, z); scene.add(m); tag(m, 1);
    souls.push({ m, heal, t: 30 });
  }
  function updateSouls(real) {
    for (let i = souls.length - 1; i >= 0; i--) {
      const s = souls[i]; s.t -= real; s.m.position.y += Math.sin(uTime.value * 3 + i) * 0.004;
      const d = s.m.position.distanceTo(player.position.clone().setY(player.position.y + 1));
      if (d < 7) s.m.position.lerp(player.position.clone().setY(player.position.y + 1), Math.min(1, real * 4));
      if (Math.random() < 0.3) { fwColor.setHSL(0.52, 0.6, 0.8); fwParticle(s.m.position.x, s.m.position.y, s.m.position.z, 0, 0.6, 0, fwColor, 0.5, true); }
      let done = s.t <= 0;
      if (d < 1.1 && P.act !== 'dead') {
        const heal = Math.round(P.max * s.heal); P.hp = Math.min(P.max, P.hp + heal); done = true;
        sfx('pickup'); floatText(`+${heal} soul`, player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#bff6ff');
      }
      if (done) { scene.remove(s.m); souls.splice(i, 1); }
    }
  }
