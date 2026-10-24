  // ---------- Ground with a lake cut out ----------
  const LAKE = { x: 0, z: -4, r: 9 };
  // Shifting hedge maze to the west: 13 x 13 cells of 4 m, rebuilt every world tier
  const MAZE = { x0: -78, z0: -58, n: 11, cell: 5, v: null, h: null };
  // Cells where ancients guard: the centre room and four corners of the maze
  // Two open outpost keeps with three levels: courtyard (0), wall-walk (5) and tower top (10)
  const KEEPS = [{ x: 50, z: -45, gate: 'x-', name: 'Ashen Keep' }, { x: 40, z: 45, gate: 'z-', name: 'Thornwatch' }];
  const inKeep = (x, z) => KEEPS.some(k => Math.abs(x - k.x) < 13 && Math.abs(z - k.z) < 13);
  const PLATFORMS = [], RAMPS = [];
  function keepHeight(x, z) {
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
  shape.moveTo(-180, -180); shape.lineTo(180, -180); shape.lineTo(180, 180); shape.lineTo(-180, 180); shape.lineTo(-180, -180);
  const hole = new THREE.Path(); hole.absarc(LAKE.x, -LAKE.z, LAKE.r, 0, TAU, true); shape.holes.push(hole);
  const groundGeo = new THREE.ShapeGeometry(shape, 96); groundGeo.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ map: groundTex })));
  const bank = new THREE.Mesh(new THREE.RingGeometry(LAKE.r, LAKE.r + 0.7, 96).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x241f19 }));
  bank.position.set(LAKE.x, 0.01, LAKE.z); scene.add(bank);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 26).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3b3327 }));
  path.position.set(0, 0.012, 18.6); scene.add(path);
