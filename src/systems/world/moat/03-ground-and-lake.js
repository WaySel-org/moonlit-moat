  // ---------- Ground with a lake cut out ----------
  const LAKE = { x: 0, z: -4, r: 9 };
  // World size: the moat's playable edge starts at EDGE_BASE metres and moves out by EDGE_STEP per Ascension (46c)
  const EDGE_BASE = 140, EDGE_STEP = 32, EDGE_MAX = 268;
  // The outer wildlands (built in 09): named regions in the ring between the old meadow (80 m) and the base edge
  const WILD_REGIONS = [
    { id: 'ridge', name: 'Emberwatch Ridge', x: 96, z: 62, r: 24, col: '#ffb070' },
    { id: 'fen', name: 'Greywater Fen', x: 90, z: -72, r: 26, col: '#8fd8c4' },
    { id: 'barrow', name: 'Ninestone Barrows', x: -34, z: -106, r: 24, col: '#c8b8ff' },
    { id: 'aqueduct', name: 'The Dry Aqueduct', x: -112, z: 4, r: 24, col: '#e6d6a6' }
  ];
  const inWildRegion = (x, z, pad) => WILD_REGIONS.some(R => Math.hypot(x - R.x, z - R.z) < R.r + (pad || 0));
  // Wildland solids (h 99) and shallow water (h < 0) in an 8 m grid, so groundAt stays cheap however many props there are
  const WILD = { grid: new Map(), inner: 60 };
  const wildKey = (i, j) => i * 1000 + j;
  function wildAdd(o) {
    const b = o.r !== undefined ? [o.x - o.r, o.x + o.r, o.z - o.r, o.z + o.r] : [o.x0, o.x1, o.z0, o.z1];
    for (let i = Math.floor(b[0] / 8); i <= Math.floor(b[1] / 8); i++) for (let j = Math.floor(b[2] / 8); j <= Math.floor(b[3] / 8); j++) {
      const k = wildKey(i, j); if (!WILD.grid.has(k)) WILD.grid.set(k, []); WILD.grid.get(k).push(o);
    }
    return o;
  }
  function wildGround(x, z) {
    if (Math.abs(x) < WILD.inner && Math.abs(z) < WILD.inner) return null;
    const list = WILD.grid.get(wildKey(Math.floor(x / 8), Math.floor(z / 8))); if (!list) return null;
    let h = null;
    for (const o of list) {
      const inside = o.r !== undefined ? (x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < o.r * o.r : x >= o.x0 && x <= o.x1 && z >= o.z0 && z <= o.z1;
      if (!inside) continue;
      if (o.h >= 99) return 99;
      h = h === null ? o.h : Math.min(h, o.h);
    }
    return h;
  }
  // Merges already-placed geometries into one, so a whole region of stone costs a single draw call
  function mergeGeos(list) {
    const parts = list.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0; parts.forEach(g => { n += g.attributes.position.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    parts.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    return out;
  }
  // Shifting hedge maze to the west: 13 x 13 cells of 4 m, rebuilt every world tier
  const MAZE = { x0: -78, z0: -58, n: 11, cell: 5, v: null, h: null };
  // Cells where ancients guard: the centre room and four corners of the maze
  // Two open outpost keeps with three levels: courtyard (0), wall-walk (5) and tower top (10)
  const KEEPS = [{ x: 50, z: -45, gate: 'x-', name: 'Ashen Keep' }, { x: 40, z: 45, gate: 'z-', name: 'Thornwatch' }];
  const inKeep = (x, z) => KEEPS.some(k => Math.abs(x - k.x) < 13 && Math.abs(z - k.z) < 13);
  const PLATFORMS = [], RAMPS = [];
  function keepHeight(x, z) {
    const wh = wildGround(x, z); if (wh !== null) return wh;
    for (const r of RAMPS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
      const t = r.axis === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (z - r.z0) / (r.z1 - r.z0);
      return r.hA + (r.hB - r.hA) * t;
    }
    let h = null;
    for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) h = Math.max(h === null ? -1 : h, p.h);
    return h;
  }
  const ANCIENT_CELLS = [[5, 5], [5, 4], [2, 2], [8, 2], [2, 7], [7, 7]];
  const inMaze = (x, z) => x > MAZE.x0 - 2 && x < MAZE.x0 + MAZE.n * MAZE.cell + 2 && z > MAZE.z0 - 2 && z < MAZE.z0 + MAZE.n * MAZE.cell + 2;
  function mazeSolid(x, z) {
    if (!MAZE.v || !inMaze(x, z)) return false;
    const T = 0.45, c = MAZE.cell, n = MAZE.n, fx = (x - MAZE.x0) / c, fz = (z - MAZE.z0) / c;
    const i = Math.round(fx), j = Math.round(fz);
    const nearV = Math.abs(fx - i) * c < T && i >= 0 && i <= n, nearH = Math.abs(fz - j) * c < T && j >= 0 && j <= n;
    if (nearV && nearH) return true;
    if (nearV) { const r = Math.floor(fz); if (r >= 0 && r < n && MAZE.v[i][r]) return true; }
    if (nearH) { const q = Math.floor(fx); if (q >= 0 && q < n && MAZE.h[q][j]) return true; }
    return false;
  }
  const groundTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#16241a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = sr() < 0.5 ? 'rgba(46,80,44,.55)' : 'rgba(8,14,10,.6)'; g.fillRect(sr() * w, sr() * h, 2, 2); }
  }, [0.25, 0.25]);
  const shape = new THREE.Shape();
  const GR = EDGE_MAX + 150; // the ground runs well past the furthest edge, so no bare floor shows from the spirit realm or the border
  shape.moveTo(-GR, -GR); shape.lineTo(GR, -GR); shape.lineTo(GR, GR); shape.lineTo(-GR, GR); shape.lineTo(-GR, -GR);
  const hole = new THREE.Path(); hole.absarc(LAKE.x, -LAKE.z, LAKE.r, 0, TAU, true); shape.holes.push(hole);
  const groundGeo = new THREE.ShapeGeometry(shape, 96); groundGeo.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ map: groundTex })));
  const bank = new THREE.Mesh(new THREE.RingGeometry(LAKE.r, LAKE.r + 0.7, 96).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x241f19 }));
  bank.position.set(LAKE.x, 0.01, LAKE.z); scene.add(bank);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 26).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3b3327 }));
  path.position.set(0, 0.012, 18.6); scene.add(path);
