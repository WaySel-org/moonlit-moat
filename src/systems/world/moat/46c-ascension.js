  // ---------- Ascension: the queens falling grows the world instead of ending the game ----------
  // Each time the Gorgon and the Empress fall, the Ascension count rises. The edge of the moat's land
  // moves out (80 m, then 102, 124, 146, up to 168), revealing a ring of new forest, ruins and chests.
  // Creeps hit 15% harder per Ascension, mythics wake more often, and after a three-minute lull the
  // queens return to the roof, half again as tough and a quarter harder-hitting per Ascension.
  const EDGE_BASE = 80, EDGE_STEP = 22, EDGE_MAX = 168, ROYAL_LULL = 180;
  const edgeFor = a => Math.min(EDGE_MAX, EDGE_BASE + EDGE_STEP * a);

  // The border: runestones along the edge of the land, moved out on each Ascension
  const borderGroup = new THREE.Group(); scene.add(borderGroup);
  const borderStone = new THREE.MeshLambertMaterial({ color: 0x4a5056, flatShading: true });
  const borderRune = new THREE.MeshBasicMaterial({ color: 0x9fd8ff });
  const borderGeo = new THREE.BoxGeometry(0.6, 2.2, 0.6), runeGeo = new THREE.OctahedronGeometry(0.22);
  function buildBorder(e) {
    while (borderGroup.children.length) borderGroup.remove(borderGroup.children[0]);
    const zMax = e - 8;
    const post = (x, z) => {
      const m = new THREE.Mesh(borderGeo, borderStone); m.position.set(x, 1.1, z); borderGroup.add(m);
      const r = new THREE.Mesh(runeGeo, borderRune); r.position.set(x, 2.5, z); borderGroup.add(r);
    };
    for (let x = -e; x <= e; x += 12) { post(x, -e); post(x, zMax); }
    for (let z = -e + 12; z < zMax; z += 12) { post(-e, z); post(e, z); }
  }

  // The rings of new land, built once at load and revealed one per Ascension
  const ruinStone = new THREE.MeshLambertMaterial({ color: 0x6f7468, flatShading: true });
  const ruinGlow = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.45, depthWrite: false });
  const RINGS = [];
  for (let a = 1; EDGE_BASE + EDGE_STEP * a <= EDGE_MAX; a++) {
    const inner = edgeFor(a - 1), outer = edgeFor(a);
    const ring = { trees: [], ruins: new THREE.Group(), chestSpots: [], chests: [] };
    scene.add(ring.ruins); ring.ruins.visible = false;
    const inRing = (x, z) => { const m = Math.max(Math.abs(x), Math.abs(z)); return m > inner + 3 && m < outer - 4 && z < outer - 12; };
    const spot = () => { for (let t = 0; t < 80; t++) { const x = -outer + sr() * outer * 2, z = -outer + sr() * outer * 2; if (inRing(x, z)) return [x, z]; } return null; };
    for (let i = 0; i < 16 + a * 4; i++) {
      const p = spot(); if (!p) continue;
      const n = trees.length; makeTree(p[0], p[1]);
      const tr = trees[n]; tr.g.visible = false; ring.trees.push(tr);
    }
    // Broken stone circles: old places the land remembers
    for (let k = 0; k < 2; k++) {
      const p = spot(); if (!p) continue;
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * TAU, h = 1 + sr() * 2.2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), ruinStone);
        m.position.set(p[0] + Math.cos(ang) * 5, h / 2, p[1] + Math.sin(ang) * 5); m.rotation.y = sr() * 3; ring.ruins.add(m);
      }
      const glow = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 32).rotateX(-Math.PI / 2), ruinGlow); glow.position.set(p[0], 0.04, p[1]); ring.ruins.add(glow);
    }
    for (let k = 0; k < 2; k++) { const p = spot(); if (p) ring.chestSpots.push(p); }
    RINGS.push(ring);
  }

  function applyEdge() {
    const before = G.edge;
    G.edge = edgeFor(G.ascension);
    buildBorder(G.edge);
    RINGS.forEach((ring, i) => {
      const open = i < G.ascension;
      ring.trees.forEach(tr => { tr.g.visible = open; });
      ring.ruins.visible = open;
      if (open && !ring.chests.length) ring.chestSpots.forEach(([x, z]) => { const c = makeChest(x, z); c.tier = 3; chestLook(c); tag(c.g, 1); ring.chests.push(c); });
    });
    return G.edge > before;
  }

  function ascend(secs) {
    G.ascension++; const a = G.ascension;
    const grew = applyEdge();
    G.state = 'interlude'; G.royalLull = ROYAL_LULL; G.hunt = null; G.huntClock = 0;
    ui.royalbars.hidden = true; ui.hud.hidden = false;
    PR.points += 2; renderHero();
    const m = tierMult(worldTier());
    reward(400 * m * a, 300 * m * a, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
    dropRelic(player.position.x + 2, player.position.z + 1);
    for (let i = 0; i < 6; i++) launchFirework(player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10)));
    G.mythClock = Math.max(G.mythClock, mythInterval() - 20);
    setTimeout(() => {
      showBanner(`Ascension ${a}`, `The queens fell in ${fmtTime(secs)}. ${grew ? `The land breaks open: its edge moves out to ${G.edge} m, with new forest, ruins and chests.` : 'The land can grow no further, but it grows wilder.'} Older creatures wake in the wild. The Gorgon and the Empress return to the roof in ${fmtTime(ROYAL_LULL)}, stronger. +2 attribute points.`, 'title');
      bannerTimer = 8;
    }, 1400);
  }

  function updateAscension(dt, real) {
    if (!(G.royalLull > 0) || G.state === 'dead') return;
    G.royalLull -= real;
    if (G.royalLull > 0) return;
    G.royalLull = 0; resetRoyals();
    if (G.world === 'moat') { showBanner('The queens return', `Vesthra and Nyxara stand on the roof again, stronger for Ascension ${G.ascension}. Climb when you are ready.`, 'title'); bannerTimer = 4; sfx('roar'); }
  }

  function ascensionText() {
    if (!G.ascension) return null;
    return G.royalLull > 0
      ? `Ascension ${G.ascension} · the queens return in ${fmtTime(Math.ceil(G.royalLull))}. Explore the new edge of the land and hunt the mythics.`
      : `Ascension ${G.ascension} · the Gorgon and the Empress wait on the roof, stronger. Climb when you are ready.`;
  }

  function resetAscension() {
    G.ascension = 0; G.royalLull = 0;
    RINGS.forEach(ring => {
      ring.chests.forEach(c => { scene.remove(c.g); const i = chests.indexOf(c); if (i >= 0) chests.splice(i, 1); });
      ring.chests = [];
    });
    applyEdge();
    resetMythics();
  }
  applyEdge();
