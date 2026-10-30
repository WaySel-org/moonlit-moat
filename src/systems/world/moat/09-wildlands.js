  // ---------- Outer wildlands: the regions beyond the old moat edge (owned by the map agent) ----------
  // Four named places in the ring between the old meadow (80 m) and the base edge (EDGE_BASE). Each has its own look,
  // a neutral camp or two (25b reads WILD_CAMPS), a chest (26 reads WILD_CHESTS) and a name the hero sees on entry.
  // Stone is merged per region and material (one draw call each); reeds and rubble are instanced; trees use plantTree (06).
  // Solids and shallow water go through wildAdd (03), which groundAt reads via keepHeight.
  const WILD_CAMPS = [[86, 52], [112, 82], [104, -94], [-34, -106], [-100, -8]];
  const WILD_CHESTS = [[101, 67], [92, -60], [70, -78], [-42, -94], [-108, 1]];
  const WILD_MAP = [];   // shapes for the minimap: { x, z, r, col } circles and { x0, x1, z0, z1, col } rects
  const wildMat = {
    stone: new THREE.MeshLambertMaterial({ color: 0x6f7468 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x45493f }),
    sand: new THREE.MeshLambertMaterial({ color: 0x8f8370 }),
    mound: new THREE.MeshLambertMaterial({ color: 0x2c3d2b }),
    void: new THREE.MeshBasicMaterial({ color: 0x050607 }),
    ember: new THREE.MeshBasicMaterial({ color: 0xffa040 }),
    water: new THREE.MeshLambertMaterial({ color: 0x1d3a37, emissive: 0x041210 }),
    mud: new THREE.MeshLambertMaterial({ color: 0x24251c }),
    rune: new THREE.MeshBasicMaterial({ color: 0xc8b8ff, transparent: true, opacity: 0.32, depthWrite: false })
  };
  // Per-region buckets of placed geometry, merged into one mesh per material at the end
  const wildBuckets = new Map(), wm = new THREE.Matrix4(), wq = new THREE.Quaternion(), we = new THREE.Euler(), wv = new THREE.Vector3(), ws = new THREE.Vector3(1, 1, 1);
  function wpiece(region, mat, geo, x, y, z, ry, rx, rz) {
    we.set(rx || 0, ry || 0, rz || 0); wq.setFromEuler(we); wm.compose(wv.set(x, y, z), wq, ws);
    geo.applyMatrix4(wm);
    const k = region + ':' + mat; if (!wildBuckets.has(k)) wildBuckets.set(k, { mat, list: [] }); wildBuckets.get(k).list.push(geo);
  }
  const wbox = (region, mat, w, h, d, x, y, z, ry, rx, rz) => wpiece(region, mat, new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx, rz);
  const solidC = (x, z, r) => wildAdd({ x, z, r, h: 99 });
  const solidB = (x0, x1, z0, z1) => wildAdd({ x0, x1, z0, z1, h: 99 });
  const clearOf = (x, z, d) => !nearPuzzleSite(x, z, 3) && wildGround(x, z) === null && !WILD_CAMPS.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 6.5)
    && !WILD_CHESTS.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 2.5) && forestFree(x, z, d || 4);
  // Scatter n trees of a kind in a disc around a region, avoiding its stone, water, camp and chest
  function grove(R, n, kind, r0, r1, d) {
    for (let t = 0, made = 0; made < n && t < n * 40; t++) {
      const a = sr() * TAU, r = r0 + sr() * (r1 - r0), x = R.x + Math.cos(a) * r, z = R.z + Math.sin(a) * r;
      if (!inEdge(x, z, EDGE_BASE - 5) || !clearOf(x, z, d)) continue;
      plantTree(x, z, kind); made++;
    }
  }
  const REG = {}; WILD_REGIONS.forEach(R => { REG[R.id] = R; });

  // ---- Emberwatch Ridge: a spine of boulders with a pass, and a ruined watchtower whose beacon still smoulders ----
  {
    const R = REG.ridge, A = [80, 78], Bp = [114, 46], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
    const dx = (Bp[0] - A[0]) / len, dz = (Bp[1] - A[1]) / len;
    for (let s = 0; s <= len; s += 3.1) {
      const t = s / len; if (t > 0.42 && t < 0.58) continue;   // the pass
      const off = (sr() - 0.5) * 2, x = A[0] + dx * s - dz * off, z = A[1] + dz * s + dx * off, r = 1.3 + sr() * 1.1 + Math.sin(t * Math.PI) * 0.6;
      wpiece('ridge', 'stone', new THREE.DodecahedronGeometry(r, 0), x, r * 0.55, z, sr() * 3, sr() * 3, sr() * 3);
      solidC(x, z, r * 0.8);
    }
    WILD_MAP.push({ line: [A, Bp], col: 'rgba(170,175,165,0.8)' });
    // The watchtower: a stout base, a broken crown of wall blocks, a doorway, and the beacon
    const T = { x: 106, z: 72 };
    wpiece('ridge', 'stone', new THREE.CylinderGeometry(3.4, 3.8, 6, 10), T.x, 3, T.z);
    for (let i = 0; i < 10; i++) {
      if (i === 2 || i === 3 || i === 7) continue;
      const a = i / 10 * TAU, h = 1 + sr() * 3.4;
      wbox('ridge', 'stone', 1.9, h, 0.8, T.x + Math.cos(a) * 3.0, 6 + h / 2, T.z + Math.sin(a) * 3.0, -a + Math.PI / 2);
    }
    const toC = Math.atan2(R.x - T.x, R.z - T.z);
    wbox('ridge', 'void', 1.4, 2.4, 0.3, T.x + Math.sin(toC) * 3.85, 1.2, T.z + Math.cos(toC) * 3.85, toC);
    wpiece('ridge', 'dark', new THREE.CylinderGeometry(0.7, 0.45, 0.6, 8), T.x, 6.3, T.z);
    wpiece('ridge', 'ember', new THREE.ConeGeometry(0.5, 1.2, 6), T.x, 7.2, T.z);
    solidC(T.x, T.z, 3.9);
    // Wall stubs running off the tower
    wbox('ridge', 'stone', 2, 2.6, 6, 111, 1.3, 64); solidB(110, 112, 61, 67);
    wbox('ridge', 'stone', 6, 1.8, 2, 99, 0.9, 77); solidB(96, 102, 76, 78);
    WILD_MAP.push({ x: T.x, z: T.z, r: 3.9, col: 'rgba(200,200,190,0.75)' });
    grove(R, 14, 'pine', 12, 30, 6);
  }

  // ---- Greywater Fen: shallow pools, dead snags, reeds and a slow ground mist around a drowned shrine ----
  const FEN_POOLS = [[82, -64, 7], [96, -80, 6.5], [102, -62, 5], [78, -84, 5.5], [108, -76, 4]];
  {
    const R = REG.fen;
    FEN_POOLS.forEach(([x, z, r]) => {
      wildAdd({ x, z, r, h: -0.25 });
      wpiece('fen', 'water', new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), x, 0.03, z);
      wpiece('fen', 'mud', new THREE.RingGeometry(r, r + 1.1, 28).rotateX(-Math.PI / 2), x, 0.02, z);
      WILD_MAP.push({ x, z, r, col: 'rgba(80,120,150,0.6)' });
    });
    // The drowned shrine: two pillars, one snapped, and a fallen lintel
    wbox('fen', 'dark', 0.9, 4, 0.9, 89, 2, -69); solidC(89, -69, 0.75);
    wbox('fen', 'dark', 0.9, 2.2, 0.9, 93, 1.1, -69, 0, 0, 0.12); solidC(93, -69, 0.75);
    wbox('fen', 'dark', 0.6, 0.7, 4.8, 91.2, 0.3, -66.6, 0.5, 0, 0.2); solidC(91.2, -66.6, 1.2);
    grove(R, 16, 'dead', 4, 26, 4.5);
    grove(R, 12, 'dark', 18, 32, 6);
    // Reeds round the pool rims, one instanced mesh
    const reedGeo = new THREE.ConeGeometry(0.05, 1.4, 3).translate(0, 0.7, 0);
    const reeds = new THREE.InstancedMesh(reedGeo, new THREE.MeshLambertMaterial({ color: 0x5a6a34 }), 320);
    let nr = 0;
    for (let t = 0; nr < 320 && t < 3000; t++) {
      const [px, pz, pr] = FEN_POOLS[t % FEN_POOLS.length], a = sr() * TAU, r = pr - 0.9 + sr() * 2.2;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (nearPuzzleSite(x, z, 1)) continue;
      we.set((sr() - 0.5) * 0.35, sr() * TAU, (sr() - 0.5) * 0.35); wq.setFromEuler(we);
      const s = 0.7 + sr() * 0.7; wm.compose(wv.set(x, 0, z), wq, new THREE.Vector3(s, s, s)); reeds.setMatrixAt(nr++, wm);
    }
    reeds.count = nr; reeds.frustumCulled = false; scene.add(reeds);
    // Ground mist: two drifting layers of soft noise
    const mistMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime },
      vertexShader: `varying vec2 vUv; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main(){
          vec2 p = vW.xz * 0.11 + vec2(uTime * 0.05, uTime * 0.03);
          float m = n(p) * 0.6 + n(p * 2.3 - vec2(uTime * 0.04, 0.0)) * 0.4;
          float fall = 1.0 - smoothstep(0.22, 0.5, length(vUv - 0.5));
          gl_FragColor = vec4(0.62, 0.74, 0.72, m * fall * 0.36);
        }`
    });
    [0.7, 1.5].forEach((y, i) => {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(64, 64).rotateX(-Math.PI / 2), mistMat);
      mist.position.set(R.x + i * 3, y, R.z - i * 2); mist.renderOrder = 2; scene.add(mist);
    });
  }

  // ---- Ninestone Barrows: a ring of nine standing stones, two trilithons, and grassed burial mounds ----
  const BARROW_MOUNDS = [[-50, -98, 5.5], [-20, -120, 4.5], [-46, -120, 3.5]];
  {
    const R = REG.barrow;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + 0.2, x = R.x + Math.cos(a) * 9, z = R.z + Math.sin(a) * 9;
      const h = (i === 0 || i === 1 || i === 4 || i === 5) ? 4.2 : 3.2 + sr() * 1.6, lean = (i === 7) ? 0.32 : (sr() - 0.5) * 0.1;
      wbox('barrow', 'stone', 1.4, h, 0.8, x, h / 2, z, Math.PI / 2 - a, lean, 0);
      solidC(x, z, 0.95);
    }
    [[0, 1], [4, 5]].forEach(([i, j]) => {
      const a = (i + j) / 2 / 9 * TAU + 0.2, x = R.x + Math.cos(a) * 8.9, z = R.z + Math.sin(a) * 8.9;
      wbox('barrow', 'stone', 7.4, 0.8, 1.0, x, 4.6, z, Math.PI / 2 - a);
    });
    wpiece('barrow', 'rune', new THREE.RingGeometry(9.9, 10.4, 48).rotateX(-Math.PI / 2), R.x, 0.04, R.z);
    BARROW_MOUNDS.forEach(([x, z, r]) => {
      const g = new THREE.SphereGeometry(r, 14, 6, 0, TAU, 0, Math.PI / 2); g.scale(1, 0.5, 1);
      wpiece('barrow', 'mound', g, x, 0, z);
      // A stone doorway on the side that faces the ring
      const f = Math.atan2(R.x - x, R.z - z), dx = Math.sin(f), dz = Math.cos(f), px = -dz, pz = dx, d = r * 0.97;
      wbox('barrow', 'stone', 0.5, 1.8, 0.5, x + dx * d + px * 0.9, 0.9, z + dz * d + pz * 0.9, f);
      wbox('barrow', 'stone', 0.5, 1.8, 0.5, x + dx * d - px * 0.9, 0.9, z + dz * d - pz * 0.9, f);
      wbox('barrow', 'stone', 2.4, 0.45, 0.6, x + dx * d, 2.0, z + dz * d, f);
      wbox('barrow', 'void', 1.3, 1.6, 0.2, x + dx * (d - 0.15), 0.8, z + dz * (d - 0.15), f);
      solidC(x, z, r * 0.95);
      WILD_MAP.push({ x, z, r, col: 'rgba(80,110,70,0.75)' });
    });
    WILD_MAP.push({ x: R.x, z: R.z, r: 9, ring: true, col: 'rgba(200,184,255,0.8)' });
    grove(R, 10, 'pine', 15, 30, 6);
  }

  // ---- The Dry Aqueduct: a line of arched piers carrying an empty channel, broken in the middle ----
  {
    const R = REG.aqueduct, AX = -114, Z0 = -20, N = 8, STEP = 6, H = 7, broken = k => k === 4;
    const pierH = k => broken(k) ? 2.2 : (k === 3 ? 5.6 : k === 5 ? 6.2 : H);
    for (let k = 0; k <= N; k++) {
      const z = Z0 + k * STEP, h = pierH(k);
      wbox('aqueduct', 'sand', 3, h, 1.6, AX, h / 2, z, 0, 0, broken(k) ? 0.08 : 0);
      solidB(AX - 1.6, AX + 1.6, z - 0.9, z + 0.9);
      if (k === N) break;
      const z1 = z + STEP, zm = (z + z1) / 2, whole = !broken(k) && !broken(k + 1) && pierH(k) === H && pierH(k + 1) === H;
      if (!whole) continue;
      // Channel with its low side walls
      wbox('aqueduct', 'sand', 3.6, 0.9, STEP, AX, H + 0.45, zm);
      wbox('aqueduct', 'sand', 0.4, 0.7, STEP, AX - 1.6, H + 1.25, zm);
      wbox('aqueduct', 'sand', 0.4, 0.7, STEP, AX + 1.6, H + 1.25, zm);
      // The arch: voussoirs along a half circle between the two piers
      for (let i = 1; i < 8; i++) {
        const a = i / 8 * Math.PI, ar = 2.25;
        wbox('aqueduct', 'sand', 3, 0.7, 1.0, AX, H - 2.6 + Math.sin(a) * ar, zm - Math.cos(a) * ar, 0, Math.PI / 2 - a);
      }
    }
    // Fallen blocks from the broken span (the bigger ones block the way)
    [[-118, 0, 1.6, 1.1, 2.4, 0.5], [-117.5, 7.5, 2.2, 1.2, 1.4, 1.1], [-111.5, 6, 1.4, 0.9, 2.8, 0.3], [-119.5, 3.5, 1.2, 0.8, 1.2, 2.2], [-112, -1.5, 1.0, 0.7, 1.4, 0.9]].forEach(([x, z, w, h, d, ry]) => {
      wbox('aqueduct', 'sand', w, h, d, x, h / 2 - 0.05, z, ry, (sr() - 0.5) * 0.3, (sr() - 0.5) * 0.3);
      if (w * d > 2) solidC(x, z, Math.max(w, d) * 0.5);
    });
    WILD_MAP.push({ x0: AX - 1.5, x1: AX + 1.5, z0: Z0, z1: Z0 + N * STEP, col: 'rgba(200,190,160,0.7)' });
    grove(R, 12, 'pine', 10, 30, 6);
  }

  // Merge every bucket into one mesh per region and material
  wildBuckets.forEach(b => {
    const m = new THREE.Mesh(mergeGeos(b.list), wildMat[b.mat]); scene.add(m);
    b.list.forEach(g => g.dispose());
  });

  // Rubble: small stones strewn across the whole wildland band, one instanced mesh
  {
    const rubble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), wildMat.stone, 160);
    let n = 0;
    for (let t = 0; n < 160 && t < 4000; t++) {
      const x = -EDGE_BASE + sr() * EDGE_BASE * 2, z = -EDGE_BASE + sr() * EDGE_BASE * 2;
      if (!inEdge(x, z, EDGE_BASE - 4) || inEdge(x, z, 82) || !clearOf(x, z, 1.5)) continue;
      we.set(sr() * 3, sr() * 3, sr() * 3); wq.setFromEuler(we); const s = 0.5 + sr() * 1.3;
      wm.compose(wv.set(x, 0.12 * s, z), wq, new THREE.Vector3(s, s * 0.7, s)); rubble.setMatrixAt(n++, wm);
    }
    rubble.count = n; rubble.frustumCulled = false; scene.add(rubble);
  }
  // No grass growing through stone or water
  grassClear((x, z) => wildGround(x, z) !== null);

  // The hero sees a region's name on entering it (exit needs a few metres more, so the name does not flicker at the rim)
  let wildIn = null;
  function updateWildlands() {
    if (G.world !== 'moat' || G.realm !== 'material' || P.act === 'dead') { wildIn = null; return; }
    const p = player.position;
    if (wildIn && Math.hypot(p.x - wildIn.x, p.z - wildIn.z) < wildIn.r + 4) return;
    const at = WILD_REGIONS.find(R => Math.hypot(p.x - R.x, p.z - R.z) < R.r) || null;
    if (at && at !== wildIn) { floatText(at.name, p.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', at.col); at.seen = true; }
    wildIn = at;
  }
