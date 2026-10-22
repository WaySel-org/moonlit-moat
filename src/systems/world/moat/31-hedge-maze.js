  // ---------- Hedge maze ----------
  const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x1f5228, flatShading: true });
  const hedges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hedgeMat, 620);
  hedges.frustumCulled = false; scene.add(hedges);
  function layoutHedges() {
    const c = MAZE.cell, n = MAZE.n, m = new THREE.Matrix4(), q0 = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    let k = 0;
    const put = (x, z, sx, sy, sz) => { m.compose(pos.set(x, sy / 2, z), q0, sc.set(sx, sy, sz)); hedges.setMatrixAt(k++, m); };
    for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) if (MAZE.v[i][j]) put(MAZE.x0 + i * c, MAZE.z0 + (j + 0.5) * c, 0.8, 1.5, c);
    for (let i = 0; i < n; i++) for (let j = 0; j <= n; j++) if (MAZE.h[i][j]) put(MAZE.x0 + (i + 0.5) * c, MAZE.z0 + j * c, c, 1.5, 0.8);
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) put(MAZE.x0 + i * c, MAZE.z0 + j * c, 0.95, 1.7, 0.95);
    while (k < 620) { m.makeScale(0, 0, 0); hedges.setMatrixAt(k++, m); }
    hedges.instanceMatrix.needsUpdate = true;
  }
  function genMaze() {
    const n = MAZE.n;
    const v = Array.from({ length: n + 1 }, () => Array(n).fill(true));
    const h = Array.from({ length: n }, () => Array(n + 1).fill(true));
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const mid = Math.floor(n / 2), stack = [[mid, mid]]; seen[mid][mid] = true;
    while (stack.length) {
      const [cx, cz] = stack[stack.length - 1], opts = [];
      if (cx > 0 && !seen[cx - 1][cz]) opts.push([-1, 0]);
      if (cx < n - 1 && !seen[cx + 1][cz]) opts.push([1, 0]);
      if (cz > 0 && !seen[cx][cz - 1]) opts.push([0, -1]);
      if (cz < n - 1 && !seen[cx][cz + 1]) opts.push([0, 1]);
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dz] = opts[Math.floor(Math.random() * opts.length)];
      if (dx === -1) v[cx][cz] = false; if (dx === 1) v[cx + 1][cz] = false;
      if (dz === -1) h[cx][cz] = false; if (dz === 1) h[cx][cz + 1] = false;
      seen[cx + dx][cz + dz] = true; stack.push([cx + dx, cz + dz]);
    }
    for (let k = 0; k < 16; k++) v[1 + Math.floor(Math.random() * (n - 1))][Math.floor(Math.random() * n)] = false;
    for (let k = 0; k < 10; k++) h[Math.floor(Math.random() * n)][1 + Math.floor(Math.random() * (n - 1))] = false;
    // Two fixed, marked entrances: east (towards the castle) and north (towards the meadow)
    v[n][MAZE_GATES.east] = false; h[MAZE_GATES.north][n] = false;
    v[n - 1][MAZE_GATES.east] = false; h[MAZE_GATES.north][n - 1] = false;
    MAZE.v = v; MAZE.h = h;
    layoutHedges();
    placeTraps();
  }
  genMaze();
