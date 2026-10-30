  // ---------- Bushes and power pods ----------
  const BOOST = {
    health:  { color: 0x4dff6a, css: '#4dff6a', label: '+35 health' },
    mana:    { color: 0x4a7bff, css: '#4a7bff', label: '+50 mana' },
    damage:  { color: 0xff3b3b, css: '#ff3b3b', label: 'damage up' },
    agility: { color: 0xffe03a, css: '#ffe03a', label: 'agility up' },
    armor:   { color: 0x3af0ff, css: '#3af0ff', label: 'armour full' }
  };
  const BOOST_KEYS = Object.keys(BOOST);
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x2a6a34, flatShading: true });
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x3d7a2e });
  const podGeo = new THREE.IcosahedronGeometry(0.22, 1);
  const pods = [];
  function seedPod(p, grow, type) {
    p.type = type || BOOST_KEYS[Math.floor(Math.random() * BOOST_KEYS.length)];
    p.mat.color.setHex(BOOST[p.type].color);
    p.grow = grow || 0; p.regrow = 0; p.pod.visible = true;
  }
  function makeBush(x, y, z, type) {
    const bush = new THREE.Group();
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + sr() * 0.25, 0), bushMat); c.position.set((sr() - 0.5) * 0.9, 0.35 + sr() * 0.25, (sr() - 0.5) * 0.9); bush.add(c); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 5), stemMat); stem.position.y = 0.95; bush.add(stem);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pod = new THREE.Mesh(podGeo, mat); pod.position.y = 1.25; bush.add(pod);
    bush.position.set(x, y, z); scene.add(bush);
    const p = { x, y, z, bush, pod, mat, stem, type: null, grow: 0, regrow: 0 };
    seedPod(p, 0.4 + sr() * 0.6, type);
    pods.push(p);
  }
  for (let tries = 0; pods.length < 32 && tries < 1500; tries++) {
    const x = -70 + sr() * 140, z = -70 + sr() * 134;
    if (Math.abs(x) < 22 && z < -15 && z > -40) continue;
    if (inMaze(x, z) || inKeep(x, z) || nearPuzzleSite(x, z, 3)) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2.5) continue;
    if (Math.abs(x) < 2.5 && z > 4) continue;
    if (pods.some(p => Math.hypot(p.x - x, p.z - z) < 6)) continue;
    makeBush(x, 0, z, BOOST_KEYS[pods.length % BOOST_KEYS.length]);
  }
  // Two planters on the roof, for the royal fight
  makeBush(-12.6, 8, -24, 'health'); makeBush(12.6, 8, -24, 'armor');
