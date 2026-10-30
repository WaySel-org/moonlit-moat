  // ---------- Ascension: the queens falling grows the world instead of ending the game ----------
  // Each time the Gorgon and the Empress fall, the Ascension count rises. The edge of the moat's land
  // moves out (EDGE_BASE 140 m, then 172, 204, 236, up to EDGE_MAX 268; constants in 03), revealing a ring of new
  // forest, grass, ruins and chests. Creeps hit 15% harder per Ascension and mythics wake more often. After a three-minute
  // lull the queens rise again in the field (royal hunt, 46d) two levels stronger; climbing the roof calls them to the throne,
  // where they start at least two levels higher per Ascension and hit a quarter harder per Ascension.
  const ROYAL_LULL = 180;
  const edgeFor = a => Math.min(EDGE_MAX, EDGE_BASE + EDGE_STEP * a);

  // The border: runestones along the edge of the land, moved out on each Ascension (two instanced meshes)
  const BORDER_MAX = 4 * Math.ceil(EDGE_MAX * 2 / 12 + 2);
  const borderPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x4a5056 }), BORDER_MAX);
  const borderRunes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }), BORDER_MAX);
  [borderPosts, borderRunes].forEach(m => { m.frustumCulled = false; scene.add(m); });
  function buildBorder(e) {
    const zMax = e - 8, bm = new THREE.Matrix4(); let n = 0;
    const post = (x, z) => {
      if (n >= BORDER_MAX) return;
      borderPosts.setMatrixAt(n, bm.makeTranslation(x, 1.1, z)); borderRunes.setMatrixAt(n, bm.makeTranslation(x, 2.5, z)); n++;
    };
    for (let x = -e; x <= e; x += 12) { post(x, -e); post(x, zMax); }
    for (let z = -e + 12; z < zMax; z += 12) { post(-e, z); post(e, z); }
    borderPosts.count = borderRunes.count = n;
    borderPosts.instanceMatrix.needsUpdate = borderRunes.instanceMatrix.needsUpdate = true;
  }

  // The rings of new land, built once at load and revealed one per Ascension. Their trees are planted after the
  // base wildlands, so revealing ring a just raises the forest count to RING_TREES_END[a]; grass works the same way.
  const ruinStone = new THREE.MeshLambertMaterial({ color: 0x6f7468 });
  const ruinGlow = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.45, depthWrite: false });
  const RINGS = [], RING_TREES_END = [forestSpots.length];
  for (let a = 1; EDGE_BASE + EDGE_STEP * a <= EDGE_MAX; a++) {
    const inner = edgeFor(a - 1), outer = edgeFor(a);
    const ring = { ruins: new THREE.Group(), chestSpots: [], chests: [] };
    scene.add(ring.ruins); ring.ruins.visible = false;
    const inRing = (x, z) => inEdge(x, z, outer - 4) && !inEdge(x, z, inner + 3) && z < outer - 12;
    const spot = () => { for (let t = 0; t < 120; t++) { const x = -outer + sr() * outer * 2, z = -outer + sr() * outer * 2; if (inRing(x, z) && !nearPuzzleSite(x, z, 4)) return [x, z]; } return null; };
    for (let i = 0, t = 0; i < 90 + a * 20 && t < 4000; t++) {
      const p = spot(); if (!p || !forestFree(p[0], p[1], 6)) continue;
      plantTree(p[0], p[1], sr() < 0.12 ? 'dead' : sr() < 0.3 ? 'dark' : 'pine'); i++;
    }
    RING_TREES_END.push(forestSpots.length);
    // Broken stone circles: old places the land remembers (merged: one mesh of stone and one of glow per ring)
    const stones = [], glows = [];
    for (let k = 0; k < 3; k++) {
      const p = spot(); if (!p) continue;
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * TAU, h = 1 + sr() * 2.2;
        stones.push(new THREE.BoxGeometry(0.8, h, 0.8).rotateY(sr() * 3).translate(p[0] + Math.cos(ang) * 5, h / 2, p[1] + Math.sin(ang) * 5));
      }
      glows.push(new THREE.RingGeometry(3.2, 3.6, 32).rotateX(-Math.PI / 2).translate(p[0], 0.04, p[1]));
    }
    if (stones.length) ring.ruins.add(new THREE.Mesh(mergeGeos(stones), ruinStone));
    if (glows.length) ring.ruins.add(new THREE.Mesh(mergeGeos(glows), ruinGlow));
    for (let k = 0; k < 3; k++) { const p = spot(); if (p) ring.chestSpots.push(p); }
    RINGS.push(ring);
  }

  function applyEdge() {
    const before = G.edge;
    G.edge = edgeFor(G.ascension);
    buildBorder(G.edge);
    const open = Math.min(RINGS.length, G.ascension);
    showForest(RING_TREES_END[open]);
    grass.count = GRASS_END[open];
    RINGS.forEach((ring, i) => {
      const isOpen = i < G.ascension;
      ring.ruins.visible = isOpen;
      if (isOpen && !ring.chests.length) ring.chestSpots.forEach(([x, z]) => { const c = makeChest(x, z); c.tier = 3; chestLook(c); tag(c.g, 1); ring.chests.push(c); });
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
      showBanner(`Ascension ${a}`, `The queens fell in ${fmtTime(secs)}. ${grew ? `The land breaks open: its edge moves out to ${G.edge} m, with new forest, ruins and chests.` : 'The land can grow no further, but it grows wilder.'} Older creatures wake in the wild. The Gorgon and the Empress rise again in the land in ${fmtTime(ROYAL_LULL)}, stronger. +2 attribute points.`, 'title');
      bannerTimer = 8;
    }, 1400);
  }

  function updateAscension(dt, real) {
    updateWildlands();
    if (!(G.royalLull > 0) || G.state === 'dead') return;
    G.royalLull -= real;
    if (G.royalLull > 0) return;
    G.royalLull = 0;
    royals.forEach(r => { r.lv += 2; }); royalsToField(false);
    showBanner('The queens rise again', `Vesthra and Nyxara walk the land again, two levels stronger. Climb the roof to call them to the throne for Ascension ${G.ascension + 1}.`, 'title'); bannerTimer = 4; sfx('roar');
  }

  function ascensionText() {
    if (!G.ascension) return null;
    return G.royalLull > 0
      ? `Ascension ${G.ascension} · the queens rise again in ${fmtTime(Math.ceil(G.royalLull))}. Explore the new edge of the land and hunt the mythics.`
      : `Ascension ${G.ascension} · the queens roam the land, stronger. Climb the roof to call them to the throne for Ascension ${G.ascension + 1}.`;
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
