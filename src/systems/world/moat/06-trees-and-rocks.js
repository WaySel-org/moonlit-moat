  // ---------- Trees and rocks ----------
  const leaf = new THREE.MeshLambertMaterial({ color: 0x1d4a2a, flatShading: true });
  const bark = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
  const treeSpots = [];
  const trees = [];
  function makeTree(x, z) {
    const s = 0.85 + sr() * 0.6, g = new THREE.Group();
    const lm = leaf.clone(); lm.transparent = true;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 6), bark); trunk.position.y = 1; g.add(trunk);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.4 - i * 0.6, 2.6, 7), lm); c.position.y = 2.6 + i * 1.5; g.add(c); }
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = sr() * 6; scene.add(g);
    trees.push({ g, lm, x, z, fade: 1 });
    treeSpots.push([x, z]);
  }
  [[-20, 6], [-24, -3], [-18, -12], [22, 4], [25, -7], [19, -13], [-31, 13], [31, 15], [-13, 19], [14, 21], [-35, -15], [35, -17], [-27, 24], [27, 27], [-9, 30], [9, 33]].forEach(([x, z]) => makeTree(x, z));
  // The wider world: a scattered forest beyond the old meadow
  for (let tries = 0, made = 0; made < 46 && tries < 900; tries++) {
    const x = -76 + sr() * 152, z = -76 + sr() * 146;
    if (Math.abs(x) < 40 && z > -20 && z < 36) continue;
    if (inMaze(x, z) || inKeep(x, z) || nearPuzzleSite(x, z, 3) || inWildRegion(x, z)) continue;
    if (Math.abs(x) < 24 && z < -15 && z > -42) continue;
    if (treeSpots.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 7)) continue;
    makeTree(x, z); made++;
  }
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6b7072, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + sr() * 0.4;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + sr() * 0.7), rockMat);
    r.position.set(LAKE.x + Math.cos(a) * (LAKE.r + 0.3), 0.15, LAKE.z + Math.sin(a) * (LAKE.r + 0.3));
    r.rotation.set(sr() * 3, sr() * 3, 0); scene.add(r);
  }

  // ---------- The wide wilds: an instanced forest ----------
  // Every tree beyond the old meadow is one instance of two meshes (trunk, crown), so the outer forest costs two draw calls.
  // Trees show in the order they were planted: the base wildlands first, then each Ascension ring (46c raises the count).
  // A tree between the camera and the hero is screen-door faded in the shader, like the meadow trees above.
  const FOREST_MAX = 1100;
  const forestU = { uCam: { value: new THREE.Vector3() }, uHero: { value: new THREE.Vector3(0, 0, 9999) } };
  function forestMat(color) {
    const m = new THREE.MeshLambertMaterial({ color });
    m.onBeforeCompile = sh => {
      sh.uniforms.uCam = forestU.uCam; sh.uniforms.uHero = forestU.uHero;
      sh.vertexShader = 'uniform vec3 uCam;\nuniform vec3 uHero;\nvarying float vCut;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec2 fo = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz, fa = uCam.xz, fd = uHero.xz - fa;
          float ft = dot(fo - fa, fd) / max(dot(fd, fd), 0.001); vec2 fq = fa + fd * ft - fo;
          vCut = (ft > 0.05 && ft < 1.05 && abs(fo.x - uHero.x) < 16.0 && abs(fo.y - uHero.z) < 16.0 && dot(fq, fq) < 7.5) ? 1.0 : 0.0;
        }`);
      sh.fragmentShader = 'varying float vCut;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (vCut > 0.5 && mod(floor(gl_FragCoord.x) + 2.0 * floor(gl_FragCoord.y), 4.0) > 0.5) discard;');
    };
    return m;
  }
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 6).translate(0, 1, 0);
  const crownGeo = mergeGeos([0, 1, 2].map(i => new THREE.ConeGeometry(2.4 - i * 0.6, 2.6, 7).translate(0, 2.6 + i * 1.5, 0)));
  const forestTrunk = new THREE.InstancedMesh(trunkGeo, forestMat(0xffffff), FOREST_MAX);
  const forestCrown = new THREE.InstancedMesh(crownGeo, forestMat(0xffffff), FOREST_MAX);
  [forestTrunk, forestCrown].forEach(m => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FOREST_MAX * 3), 3); m.frustumCulled = false; m.count = 0; scene.add(m); });
  forestTrunk.onBeforeRender = forestCrown.onBeforeRender = (r, s, cam) => { forestU.uCam.value.copy(cam.position); forestU.uHero.value.copy(player.position); };
  const forestSpots = [], forestGrid = new Map(), fm4 = new THREE.Matrix4(), fq4 = new THREE.Quaternion(), fe = new THREE.Euler(), fp = new THREE.Vector3(), fs = new THREE.Vector3(), fc = new THREE.Color();
  const BARK = new THREE.Color(0x3a2a1c), DEAD_BARK = new THREE.Color(0x56514a);
  const forestKey = (x, z) => Math.floor(x / 6) * 1000 + Math.floor(z / 6);
  function forestFree(x, z, d) {
    const i0 = Math.floor(x / 6), j0 = Math.floor(z / 6);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
      const l = forestGrid.get(i * 1000 + j); if (l && l.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < d)) return false;
    }
    return true;
  }
  // kind: 'pine' (default), 'dark' (fen pine) or 'dead' (a bare grey snag)
  function plantTree(x, z, kind) {
    const n = forestSpots.length; if (n >= FOREST_MAX) return -1;
    const s = 0.85 + sr() * 0.7, dead = kind === 'dead';
    fe.set((sr() - 0.5) * (dead ? 0.25 : 0.06), sr() * TAU, (sr() - 0.5) * (dead ? 0.25 : 0.06)); fq4.setFromEuler(fe);
    fm4.compose(fp.set(x, 0, z), fq4, fs.set(s, s * (dead ? 2.2 : 1), s)); forestTrunk.setMatrixAt(n, fm4);
    forestTrunk.setColorAt(n, dead ? DEAD_BARK : BARK);
    if (dead) fm4.makeScale(0, 0, 0); else fm4.compose(fp.set(x, 0, z), fq4, fs.set(s, s, s));
    forestCrown.setMatrixAt(n, fm4);
    if (kind === 'dark') fc.setRGB(0.07 + sr() * 0.03, 0.2 + sr() * 0.05, 0.16 + sr() * 0.04);
    else fc.setRGB(0.09 + sr() * 0.05, 0.25 + sr() * 0.09, 0.13 + sr() * 0.05);
    forestCrown.setColorAt(n, fc);
    forestSpots.push([x, z]);
    const k = forestKey(x, z); if (!forestGrid.has(k)) forestGrid.set(k, []); forestGrid.get(k).push([x, z]);
    return n;
  }
  function showForest(n) {
    forestTrunk.count = forestCrown.count = Math.min(n, forestSpots.length);
    forestTrunk.instanceMatrix.needsUpdate = forestCrown.instanceMatrix.needsUpdate = true;
    if (forestTrunk.instanceColor) forestTrunk.instanceColor.needsUpdate = true;
    if (forestCrown.instanceColor) forestCrown.instanceColor.needsUpdate = true;
  }
  // Square "rings" of land: inside edge e means |x| <= e, z from -e to e - 8 (the south edge sits 8 m in)
  const inEdge = (x, z, e) => Math.abs(x) <= e && z >= -e && z <= e - 8;
  // The base wildlands between the old meadow and the base edge: a loose forest, clear of puzzle sites and the named regions
  for (let tries = 0, made = 0; made < 150 && tries < 6000; tries++) {
    const x = -EDGE_BASE + sr() * EDGE_BASE * 2, z = -EDGE_BASE + sr() * EDGE_BASE * 2;
    if (!inEdge(x, z, EDGE_BASE - 5) || inEdge(x, z, 80)) continue;
    if (nearPuzzleSite(x, z, 4) || inWildRegion(x, z, 2)) continue;
    if (!forestFree(x, z, 6.5) || treeSpots.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 6)) continue;
    plantTree(x, z); made++;
  }
