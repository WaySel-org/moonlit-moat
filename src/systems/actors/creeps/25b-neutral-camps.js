  // ---------- Neutral camps: farm them on the clock ----------
  // Six camps of neutral creeps sit around the moat. They ignore you unless you attack or walk right up.
  // Every minute on the clock, any fully cleared camp restocks. Neutral kills give 50% more experience.
  const NEUTRAL_CAMPS = [[24, 40], [-48, 38], [55, -10], [-10, -66], [22, 64], [-62, -74]].map(([x, z], i) => ({ id: i, x, z, alive: true, members: [] }));
  const campStoneMat = new THREE.MeshLambertMaterial({ color: 0x6b7072, flatShading: true });
  const campRuneMat = new THREE.MeshBasicMaterial({ color: 0x7fdc8a, transparent: true, opacity: 0.5, depthWrite: false });
  const CAMP_PERIOD = 60;
  G.campClock = CAMP_PERIOD;
  NEUTRAL_CAMPS.forEach(cp => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.6, 36).rotateX(-Math.PI / 2), campRuneMat); ring.position.set(cp.x, 0.03, cp.z); scene.add(ring);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; box(0.45, 0.9, 0.45, cp.x + Math.cos(a) * 5, 0.45, cp.z + Math.sin(a) * 5, campStoneMat); }
    ['crawler', 'crawler', 'wisp'].forEach((type, k) => {
      const parts = type === 'crawler' ? buildCrawler() : buildWisp();
      parts.g.visible = false; scene.add(parts.g);
      if (type === 'crawler') parts.mat.color.setHex(0x4f6a3a); else parts.mat.color.setHex(0x9fe0b0);
      const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
      const c = Object.assign(parts, { type, realm: 'material', ai: type === 'crawler' ? 'melee' : 'ranged', neutral: true, campRef: cp, provoked: false,
        isCreep: true, alive: false, respawn: 2 + cp.id + k * 0.3, pos: parts.g.position, radius: 0.6, hitY: 0.7, markY: 1.8,
        hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
        wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
        ancient: false, camp: new THREE.Vector3(cp.x + Math.cos(k * 2.1) * 1.8, 0, cp.z + Math.sin(k * 2.1) * 1.8), age: 0 });
      creeps.push(c); cp.members.push(c);
    });
  });
  function provokeCamp(c) { if (c.campRef) c.campRef.members.forEach(m => { m.provoked = true; }); }
  function campCreepDied(c) {
    const cp = c.campRef; if (!cp || cp.members.some(m => m.alive)) return;
    cp.alive = false;
    reward(0, 25 * tierMult(worldTier()), c.pos.clone().add(new THREE.Vector3(0, 2.4, 0)));
    floatText(`Camp cleared! Restocks in ${fmtTime(G.campClock)}`, c.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#7fdc8a');
  }
  function campTick(real) {
    if (G.shop || G.paused) return;
    G.campClock -= real;
    campRuneMat.opacity = 0.35 + 0.15 * Math.sin(uTime.value * 2);
    if (G.campClock > 0) return;
    G.campClock += CAMP_PERIOD;
    let restocked = 0;
    NEUTRAL_CAMPS.forEach(cp => {
      if (cp.alive) return;
      cp.alive = true; restocked++;
      cp.members.forEach(m => { m.respawn = 0.05; m.provoked = false; });
    });
    if (restocked && G.world === 'moat') floatText(`${restocked} neutral camp${restocked > 1 ? 's' : ''} restocked`, player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#7fdc8a');
  }
