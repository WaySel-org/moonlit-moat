  // ---------- Mythics: great creatures of myth that wake in the wild as time passes ----------
  // Every couple of minutes (sooner with each world tier and Ascension) one wakes far from the castle,
  // with a banner and a mark on the map. Myths from folklore unlock as the world tier rises; three
  // original tyrants join after the first Ascension. Each is a named, scaled-up foe with a guaranteed
  // relic and a large bounty. They reuse the creep AIs: stalker (circle and lunge), guard (shielded
  // front), melee, ranged (with optional venom) and godling (telegraphed ground strikes).
  const mLam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: 0x000000 });
  const mBas = c => new THREE.MeshBasicMaterial({ color: c });
  const add = (parent, geo, mat, x, y, z, rx, ry, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); parent.add(m); return m; };
  const legsOf = (body, mat, pts, h, w) => pts.map(([x, z]) => add(body, new THREE.BoxGeometry(w, h, w), mat, x, h / 2, z));
  const MYTH_BUILD = {
    // Minotaur (Greek myth): a bull-headed giant who charges down a long lane
    minotaur() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x5a3a26), horn = mLam(0xd8cfb8);
      add(body, new THREE.BoxGeometry(0.9, 1.0, 0.6), mat, 0, 1.55, 0);
      add(body, new THREE.BoxGeometry(0.5, 0.45, 0.6), mat, 0, 2.25, 0.15);
      [-1, 1].forEach(s => add(body, new THREE.ConeGeometry(0.08, 0.6, 5), horn, s * 0.38, 2.5, 0.15, 0, 0, -s * 1.1));
      [-1, 1].forEach(s => add(body, new THREE.SphereGeometry(0.05, 5, 4), mBas(0xff4a2a), s * 0.13, 2.3, 0.46));
      add(body, new THREE.BoxGeometry(0.12, 1.4, 0.12), horn, 0.6, 1.4, 0.4, 0.5);
      const legs = legsOf(body, mat, [[-0.25, 0], [0.25, 0]], 1.05, 0.28);
      return { g, body, mat, legs };
    },
    // Manticore (Persian myth): a lion with a scorpion's tail that looses venomous spines
    manticore() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x9a6a34);
      const core = add(body, new THREE.SphereGeometry(0.5, 8, 6), mat, 0, 0, 0); core.scale.set(0.9, 0.7, 1.4);
      add(body, new THREE.SphereGeometry(0.42, 8, 6), mLam(0x6a3a1a), 0, 0.25, 0.7);
      for (let i = 0; i < 4; i++) add(body, new THREE.SphereGeometry(0.14 - i * 0.02, 6, 4), mLam(0x3a2a1a), 0, 0.3 + i * 0.3, -0.7 - i * 0.12);
      add(body, new THREE.ConeGeometry(0.1, 0.35, 5), mBas(0x9aff6a), 0, 1.5, -1.05, -0.6);
      return { g, body, mat, core };
    },
    // Basilisk (European folklore): the serpent king, crowned and armoured at the front
    basilisk() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x3e5a2c), spikeMat = mLam(0xc8b060);
      for (let i = 0; i < 6; i++) add(body, new THREE.SphereGeometry(0.42 - i * 0.04, 8, 6), mat, Math.sin(i * 1.1) * 0.35, 0.38, 0.6 - i * 0.42);
      add(body, new THREE.BoxGeometry(0.55, 0.4, 0.7), mat, 0, 0.6, 1.0);
      for (let i = 0; i < 5; i++) add(body, new THREE.ConeGeometry(0.07, 0.4, 4), spikeMat, -0.2 + i * 0.1, 0.95, 0.95 - Math.abs(i - 2) * 0.05);
      const eyeMat = mBas(0xffe04a);
      [-1, 1].forEach(s => add(body, new THREE.SphereGeometry(0.06, 5, 4), eyeMat, s * 0.15, 0.68, 1.36));
      return { g, body, mat, legs: [], spikeMat, eyeMat };
    },
    // Oni (Japanese folklore): a horned, red-skinned brute with an iron club
    oni() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x8a2a22), iron = mLam(0x3a3a40);
      add(body, new THREE.BoxGeometry(1.0, 1.1, 0.6), mat, 0, 1.6, 0);
      add(body, new THREE.SphereGeometry(0.32, 8, 6), mat, 0, 2.4, 0.05);
      [-1, 1].forEach(s => add(body, new THREE.ConeGeometry(0.07, 0.4, 5), mLam(0xe8dcc0), s * 0.18, 2.75, 0, 0, 0, -s * 0.3));
      add(body, new THREE.CylinderGeometry(0.1, 0.22, 1.6, 6), iron, 0.7, 1.5, 0.35, 0.6);
      const legs = legsOf(body, mat, [[-0.28, 0], [0.28, 0]], 1.05, 0.3);
      return { g, body, mat, legs };
    },
    // Kitsune (Japanese folklore): a nine-tailed fox spirit that keeps its distance and throws foxfire
    kitsune() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0xe8e0d0);
      add(body, new THREE.SphereGeometry(0.36, 8, 6), mat, 0, 0, 0.1).scale.set(0.8, 0.8, 1.3);
      add(body, new THREE.ConeGeometry(0.2, 0.45, 6), mat, 0, 0.12, 0.6, Math.PI / 2);
      const fire = mBas(0x8ad8ff);
      const tails = [];
      for (let i = 0; i < 9; i++) { const a = (i - 4) * 0.28; tails.push(add(body, new THREE.ConeGeometry(0.07, 0.9, 5), fire, Math.sin(a) * 0.5, 0.25 + Math.cos(a) * 0.15, -0.6 - Math.cos(a) * 0.2, -1.1, 0, a)); }
      const core = add(body, new THREE.SphereGeometry(0.1, 6, 4), fire, 0, 0.5, 0.2);
      return { g, body, mat, core, tails };
    },
    // Cyclops (Greek myth): a one-eyed giant who hurls boulders onto marked ground
    cyclops() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x7a6a58);
      add(body, new THREE.BoxGeometry(1.6, 1.8, 1.0), mat, 0, 2.5, 0);
      add(body, new THREE.SphereGeometry(0.55, 10, 8), mat, 0, 3.75, 0.05);
      const eyeMat = mBas(0xffe8a0);
      add(body, new THREE.SphereGeometry(0.2, 8, 6), eyeMat, 0, 3.8, 0.52);
      [-1, 1].forEach(s => add(body, new THREE.BoxGeometry(0.5, 1.6, 0.5), mat, s * 0.45, 0.8, 0));
      [-1, 1].forEach(s => add(body, new THREE.BoxGeometry(0.42, 1.5, 0.42), mat, s * 1.05, 2.4, 0.1, 0, 0, s * 0.18));
      return { g, body, mat, eyeMat, godName: 'The Cyclops', godHue: 0.09 };
    },
    // Hydra (Greek myth): many heads on long necks, striking the ground in turn
    hydra() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x2a5a4a);
      add(body, new THREE.SphereGeometry(1.1, 10, 8), mat, 0, 1.0, 0).scale.set(1, 0.75, 1.2);
      const eye = mBas(0xffd04a), neckGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6), headGeo = new THREE.BoxGeometry(0.35, 0.28, 0.55), eyeGeo = new THREE.SphereGeometry(0.05, 5, 4);
      const necks = [], heads = [];
      [-0.9, -0.45, 0, 0.45, 0.9, -1.3, 1.3].forEach((a, i) => {
        const n = new THREE.Group(); body.add(n); necks.push(n); n.visible = i < 5;
        const lift = i < 5 ? 0 : -0.35;
        add(n, neckGeo, mat, Math.sin(a) * 0.9, 2.2 + lift, 0.4 + Math.cos(a) * 0.3, 0.3, 0, -a * 0.8);
        heads.push(add(n, headGeo, mat, Math.sin(a) * 1.6, 3.25 + lift, 0.75 + Math.cos(a) * 0.3));
        add(n, eyeGeo, eye, Math.sin(a) * 1.6, 3.33 + lift, 1.03 + Math.cos(a) * 0.3);
      });
      return { g, body, mat, necks, heads, godName: 'The Hydra', godHue: 0.38 };
    },
    // Original tyrants, after the first Ascension
    // Vorrask: a hollow, masked king of the void who rules what the spirit realm swallows
    vorrask() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const robe = spiritMat(0x3a2050, 0.85);
      add(body, new THREE.ConeGeometry(1.0, 3.0, 10), robe, 0, 0.5, 0);
      add(body, new THREE.BoxGeometry(0.75, 0.9, 0.2), mBas(0xf2ecdc), 0, 2.4, 0.3);
      [-1, 1].forEach(s => add(body, new THREE.BoxGeometry(0.16, 0.08, 0.05), mBas(0x1a0a2a), s * 0.18, 2.55, 0.42));
      const halo = add(body, new THREE.TorusGeometry(0.9, 0.05, 6, 28), mBas(0x9a5aff), 0, 2.6, -0.3);
      return { g, body, halo, godName: 'Vorrask, the Hollow Sovereign', godHue: 0.78 };
    },
    // Saltmarrow: a drowned admiral, barnacled and still dragging his anchor
    saltmarrow() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const mat = mLam(0x3a5a6a), coat = mLam(0x1a2a3a), brass = mLam(0xb08a3a);
      add(body, new THREE.BoxGeometry(1.0, 1.3, 0.6), coat, 0, 1.75, 0);
      add(body, new THREE.SphereGeometry(0.32, 8, 6), mat, 0, 2.65, 0.05);
      add(body, new THREE.BoxGeometry(0.9, 0.15, 0.45), coat, 0, 2.95, 0);
      const anchor = new THREE.Group(); anchor.position.set(0.75, 1.3, 0.3); body.add(anchor);
      add(anchor, new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), brass, 0, 0, 0);
      add(anchor, new THREE.TorusGeometry(0.3, 0.06, 6, 12, Math.PI), brass, 0, -0.7, 0, 0, 0, Math.PI);
      const legs = legsOf(body, coat, [[-0.25, 0], [0.25, 0]], 1.1, 0.3);
      return { g, body, mat, legs, hand: anchor };
    },
    // Kael Thurnis: a horned conqueror from beyond the sky who burns worlds for sport
    thurnis() {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const armour = spiritMat(0xb03a2a, 0.9);
      add(body, new THREE.BoxGeometry(1.3, 1.6, 0.8), armour, 0, 2.0, 0);
      add(body, new THREE.SphereGeometry(0.38, 10, 8), mBas(0xe8c8a0), 0, 3.05, 0.05);
      [-1, 1].forEach(s => add(body, new THREE.ConeGeometry(0.1, 0.8, 5), mBas(0x2a1a1a), s * 0.35, 3.4, 0, 0, 0, -s * 0.7));
      add(body, new THREE.ConeGeometry(0.9, 1.4, 8), armour, 0, 0.7, 0);
      const halo = add(body, new THREE.TorusGeometry(1.0, 0.06, 6, 28), mBas(0xffb04a), 0, 3.1, -0.4);
      return { g, body, halo, godName: 'Kael Thurnis, the Star-Devourer', godHue: 0.04 };
    }
  };
  // tier: world tier at which it can wake. asc: Ascension at which it can wake (either unlocks it).
  const MYTHS = [
    { type: 'minotaur', name: 'The Minotaur', ai: 'stalker', size: 1.6, hp: 480, xp: 6, tier: 1, bar: 3.0, lore: 'A bull-headed giant tramples out of the old forest. When it lowers its horns, get off the line.' },
    { type: 'oni', name: 'The Oni', ai: 'melee', size: 1.5, hp: 520, xp: 6, tier: 1, speed: 0.85, bar: 3.0, lore: 'A horned brute with an iron club comes looking for a fight. Wounded, it only gets faster.' },
    { type: 'manticore', name: 'The Manticore', ai: 'ranged', size: 1.7, hp: 380, xp: 6, tier: 2, venom: true, shotDmg: 12, bar: 2.0, lore: 'A lion with a scorpion tail. Its spines are venomous, and it pounces on whoever stands still.' },
    { type: 'basilisk', name: 'The Basilisk', ai: 'guard', size: 1.9, hp: 1300, xp: 7, tier: 2, venom: true, shotDmg: 10, bar: 1.6, lore: 'The serpent king. Its crowned front turns blades and its gaze turns flesh to stone: look away when its eyes flare. Its brood strikes from behind.' },
    { type: 'kitsune', name: 'The Kitsune', ai: 'ranged', size: 1.6, hp: 750, xp: 7, tier: 3, shotDmg: 14, bar: 1.6, lore: 'A nine-tailed fox spirit. It blinks away, splits into illusions and charms the careless. Only the real one bleeds.' },
    { type: 'cyclops', name: 'The Cyclops', ai: 'godling', grounded: true, titan: true, size: 1.2, hp: 2400, xp: 12, tier: 3, bar: 5.0, lore: 'A one-eyed giant who commands every creature near it. Its war cry sends them at you; fight it alone if you can.' },
    { type: 'hydra', name: 'The Hydra', ai: 'godling', grounded: true, size: 1.2, hp: 2600, xp: 11, tier: 4, venom: true, shotDmg: 10, bar: 4.4, lore: 'Many heads, one hunger. Its wounds close as you watch unless heavy blows rend them open.' },
    { type: 'saltmarrow', name: 'Admiral Saltmarrow', ai: 'melee', size: 1.6, hp: 900, xp: 9, asc: 1, speed: 1.0, bar: 3.4, lore: 'A drowned admiral walks out of the lake. He throws his anchor to haul you in.' },
    { type: 'vorrask', name: 'Vorrask, the Hollow Sovereign', ai: 'godling', size: 1.2, hp: 1600, xp: 12, asc: 1, bar: 4.0, lore: 'A masked king of the void, risen from what the Veil devoured. Its rifts drink your mana.' },
    { type: 'thurnis', name: 'Kael Thurnis, the Star-Devourer', ai: 'godling', size: 1.25, hp: 2000, xp: 14, asc: 2, bar: 4.4, lore: 'A conqueror from beyond the sky. He burns worlds for sport and calls the stars down on you.' }
  ];
  const mythics = [];
  MYTHS.forEach(M => {
    const parts = MYTH_BUILD[M.type]();
    parts.g.visible = false; scene.add(parts.g);
    const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true; bar.innerHTML = '<span></span><div class="ct"><i></i></div>'; $('#cbars').appendChild(bar);
    CREEP_NAME[M.type] = M.name; CREEP_BASE[M.type] = M.hp; CREEP_BAR_H[M.type] = M.bar;
    const c = Object.assign(parts, { type: M.type, realm: 'material', ai: M.ai, mythic: true, myth: M, summoned: false, size: M.size, xpMult: M.xp,
      grounded: !!M.grounded, venom: !!M.venom, shotDmg: M.shotDmg, speed: M.speed, guard: M.ai === 'guard',
      isCreep: true, alive: false, respawn: Infinity, pos: parts.g.position, radius: M.ai === 'godling' ? 1.5 : 1.0, hitY: M.ai === 'godling' ? 2 : 1.2, markY: M.bar + 0.6,
      hp: 1, max: 1, mult: 1, lv: 1, facing: 0, cool: 1, atk: null, stun: 0, flash: 0, leash: false,
      wander: new THREE.Vector3(), home: new THREE.Vector3(), tele: makeTele(), bar, barFill: bar.querySelector('i'), barLabel: bar.querySelector('span'),
      ancient: false, camp: new THREE.Vector3(), age: 0 });
    if (!c.godName && M.ai === 'godling') c.godName = M.name;
    creeps.push(c); mythics.push(c);
  });

  G.mythClock = 0; G.mythKills = 0;
  const mythInterval = () => Math.max(45, 120 - 8 * G.ascension - 4 * (worldTier() - 1));
  const mythCap = () => Math.min(5, 1 + G.ascension + Math.floor((worldTier() - 1) / 3));
  const mythUnlocked = M => (M.tier && worldTier() >= M.tier) || (M.asc && G.ascension >= M.asc);
  const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  function compassOf(x, z) {
    // The camera's default view looks toward -z, which the map draws at the top: call that north
    const a = Math.atan2(x, -z); return COMPASS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }
  function mythSpot() {
    const e = G.edge - 6, r0 = Math.max(28, G.edge * 0.45);
    for (let t = 0; t < 120; t++) {
      const x = -e + Math.random() * e * 2, z = -e + Math.random() * (e * 2 - 8);
      if (Math.max(Math.abs(x), Math.abs(z)) < r0) continue;
      if ([[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dz]) => groundAt(x + dx, z + dz) !== 0)) continue;
      if (inMaze(x, z) || inKeep(x, z)) continue;
      if (Math.hypot(x - player.position.x, z - player.position.z) < 24) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }
  function wakeMythic() {
    const pool = mythics.filter(c => !c.alive && mythUnlocked(c.myth));
    if (!pool.length) return false;
    // Prefer the ones you have not met most recently
    pool.sort((a, b) => (a.lastWoke || 0) - (b.lastWoke || 0));
    const c = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    const p = mythSpot(); if (!p) return false;
    c.camp.copy(p); c.summoned = true; spawnCreep(c);
    if (!c.alive) { c.summoned = false; return false; }
    c.lastWoke = uTime.value; c.rend = 0;
    showBanner(`${c.myth.name} has woken`, `${c.myth.lore} It roams to the ${compassOf(p.x, p.z)}, marked in red on the map. Lv ${c.lv}.`, 'title');
    bannerTimer = 4.5; sfx('roar'); G.shake = Math.max(G.shake, 0.3);
    return true;
  }
  function updateMythics(dt, real) {
    mythics.forEach(c => { if (c.alive && c.halo) c.halo.rotation.z += real * 1.2; });
    if (G.world !== 'moat' || G.realm !== 'material' || G.state === 'dead' || G.state === 'intro') return;
    G.mythClock += real;
    if (G.mythClock < mythInterval()) return;
    G.mythClock = 0;
    if (mythics.filter(c => c.alive).length >= mythCap()) return;
    wakeMythic();
  }
  function mythicDied(c) {
    c.summoned = false; G.mythKills++;
    const m = tierMult(worldTier());
    reward(0, 150 * m * (1 + G.ascension), c.pos.clone().add(new THREE.Vector3(0, 3.4, 0)));
    showBanner(`${c.myth.name} is slain`, 'A great bounty and a relic lie where it fell.', 'title'); bannerTimer = 3;
    for (let i = 0; i < 3; i++) launchFirework(c.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 1, (Math.random() - 0.5) * 5)));
  }
  function mythicText() {
    const alive = mythics.filter(c => c.alive).length;
    const next = fmtTime(Math.ceil(Math.max(0, mythInterval() - G.mythClock)));
    return `${alive} awake · ${G.mythKills} slain${alive < mythCap() ? ` · next in ${next}` : ''}`;
  }
  function drawMythics(ctx, X, Z, big) {
    mythics.forEach(c => {
      if (!c.alive) return;
      const x = X(c.pos.x), z = Z(c.pos.z), r = big ? 7 : 4.5;
      ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.moveTo(x, z - r); ctx.lineTo(x + r, z); ctx.lineTo(x, z + r); ctx.lineTo(x - r, z); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,74,58,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, z, r + 3 + Math.sin(uTime.value * 4) * 1.5, 0, TAU); ctx.stroke();
    });
  }
  function resetMythics() {
    mythics.forEach(c => { mkEndAct(c); c.alive = false; c.summoned = false; c.g.visible = false; c.tele.hide(); c.bar.hidden = true; c.respawn = Infinity; c.atk = null; });
    G.mythClock = 0; G.mythKills = 0;
  }
