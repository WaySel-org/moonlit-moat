  // ---------- Hero mesh: a sculpted, rigged wanderer built in code ----------
  // The body and clothes are one smooth surface: signed-distance shapes blended together, meshed with surface nets,
  // shaded with baked occlusion and bound to a 20-bone skeleton. heroPose() drives the bones from a plain state object,
  // so tools/hero-lab can show every pose without the game. Local +z is forward, +x is the hero's left.
  const HERO_COL = {
    skin: [0.74, 0.55, 0.42], coat: [0.84, 0.82, 0.77], coatDark: [0.62, 0.6, 0.56], trim: [0.55, 0.11, 0.1], sash: [0.6, 0.09, 0.08],
    leather: [0.36, 0.24, 0.15], pants: [0.2, 0.2, 0.21], boot: [0.2, 0.14, 0.1], glove: [0.17, 0.13, 0.11], metal: [0.62, 0.63, 0.66]
  };
  // Rest-pose joints (left side; the right side mirrors x)
  const HJ = {
    hips: [0, 0.95, 0], spine: [0, 1.08, 0], chest: [0, 1.28, 0], neck: [0, 1.49, 0], head: [0, 1.58, 0.01], headTop: [0, 1.78, 0.01],
    clav: [0.05, 1.43, 0], shoulder: [0.19, 1.43, 0], elbow: [0.27, 1.17, -0.02], wrist: [0.31, 0.93, 0.02], handTip: [0.325, 0.82, 0.04],
    hip: [0.095, 0.93, 0], knee: [0.105, 0.5, 0.015], ankle: [0.105, 0.085, -0.01], toe: [0.105, 0.03, 0.14], coat: [0, 1.0, -0.11], coatTip: [0, 0.46, -0.2]
  };
  function hsmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
  function hEll(px, py, pz, c, r) {
    const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2], k0 = Math.sqrt(x * x + y * y + z * z);
    const x1 = x / r[0], y1 = y / r[1], z1 = z / r[2], k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
    return k0 * (k0 - 1) / Math.max(k1, 1e-6);
  }
  // Round cone from a (radius ra) to b (radius rb); also reports h, how far along a-b the point lies
  let hConeH = 0;
  function hCone(px, py, pz, a, b, ra, rb) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], qx = px - a[0], qy = py - a[1], qz = pz - a[2];
    const h = Math.max(0, Math.min(1, (qx * bx + qy * by + qz * bz) / (bx * bx + by * by + bz * bz)));
    hConeH = h;
    const dx = qx - bx * h, dy = qy - by * h, dz = qz - bz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
  }
  // The sculpt. Fills out.col (colour key) and out.part (which bones it follows) for the closest shape.
  const hOut = { d: 0, col: 'coat', part: 'chest', col2: 'coat', gap: 1 };
  function heroSDF(x, y, z, want, mode) {
    const ax = Math.abs(x), side = x >= 0 ? 'L' : 'R';
    let best = 1e9, best2 = 1e9, col = 'coat', col2 = 'coat', part = 'chest', d;
    const take = want ? (dd, c, p) => {
      if (dd < best) { if (c !== col) { best2 = best; col2 = col; } best = dd; col = c; part = p; }
      else if (dd < best2 && c !== col) { best2 = dd; col2 = c; }
    } : () => {};
    let body = 1e9;
    if (mode !== 1) {
      // Head and face, under a solid hood carved open at the face: the hollow around the face falls into shadow
      let head = hEll(x, y, z, [0, 1.635, 0.012], [0.09, 0.117, 0.102]); take(head, 'skin', 'head');
      d = hEll(x, y, z, [0, 1.57, 0.035], [0.066, 0.058, 0.07]); head = hsmin(head, d, 0.04); take(d, 'skin', 'head');
      d = hEll(x, y, z, [0, 1.615, 0.106], [0.015, 0.026, 0.02]); head = hsmin(head, d, 0.015); take(d, 'skin', 'head');
      head = -hsmin(-head, hEll(Math.abs(x), y, z, [0.033, 1.64, 0.097], [0.022, 0.013, 0.022]), 0.012);
      let hood = Math.max(hEll(x, y, z, [0, 1.655, -0.005], [0.13, 0.155, 0.158]), -hEll(x, y, z, [0, 1.598, 0.2], [0.086, 0.118, 0.13]));
      hood = hsmin(hood, hCone(x, y, z, [0, 1.77, 0.05], [0, 1.74, 0.15], 0.032, 0.008), 0.03);
      hood = hsmin(hood, hCone(x, y, z, [0, 1.6, -0.08], [0, 1.47, -0.1], 0.07, 0.082), 0.04);
      take(hood, 'coat', 'hood');
      body = Math.min(head, hood);
      if (mode === 2) { hOut.d = body; if (want) { hOut.col = col; hOut.part = part; hOut.col2 = col2; hOut.gap = best2 - best; } return body; }
    }
    d = hCone(x, y, z, [0, 1.46, -0.005], [0, 1.58, 0.012], 0.055, 0.046); body = hsmin(body, d, 0.03); take(d, 'skin', 'neck');
    // Torso: chest, shoulders, waist and hips, all under the coat
    d = hEll(x, y, z, [0, 1.31, 0.012], [0.172, 0.17, 0.113]); body = hsmin(body, d, 0.05); take(d, 'coat', 'chest');
    d = hCone(ax, y, z, [0.03, 1.425, -0.01], [0.17, 1.43, -0.005], 0.072, 0.066); body = hsmin(body, d, 0.05); take(d, 'coat', 'chest');
    d = hEll(x, y, z, [0, 1.12, 0.004], [0.148, 0.15, 0.104]); body = hsmin(body, d, 0.06); take(d, 'coat', 'spine');
    d = hEll(x, y, z, [0, 0.95, 0], [0.163, 0.12, 0.114]); body = hsmin(body, d, 0.05); take(d, 'pants', 'hips');
    // Arms: sleeve, bracer, gloved hand
    d = hCone(ax, y, z, HJ.shoulder, HJ.elbow, 0.062, 0.05); body = hsmin(body, d, 0.035); take(d, 'coat', 'upperArm' + side);
    d = hCone(ax, y, z, HJ.elbow, HJ.wrist, 0.05, 0.038); const fh = hConeH; body = hsmin(body, d, 0.025); take(d, fh > 0.42 ? 'leather' : 'coat', 'forearm' + side);
    d = hEll(ax, y, z, [0.322, 0.865, 0.036], [0.034, 0.062, 0.046]); body = hsmin(body, d, 0.02); take(d, 'glove', 'hand' + side);
    d = hEll(ax, y, z, [0.295, 0.885, 0.07], [0.017, 0.035, 0.02]); body = hsmin(body, d, 0.012); take(d, 'glove', 'hand' + side);
    // Legs: trousers into tall boots
    d = hCone(ax, y, z, HJ.hip, HJ.knee, 0.088, 0.062); body = hsmin(body, d, 0.04); take(d, 'pants', 'thigh' + side);
    d = hCone(ax, y, z, HJ.knee, HJ.ankle, 0.06, 0.045); const sh = hConeH; body = hsmin(body, d, 0.03); take(d, sh > 0.3 ? 'boot' : 'pants', 'shin' + side);
    d = Math.max(hCone(ax, y, z, HJ.ankle, HJ.toe, 0.052, 0.04), -y); body = hsmin(body, d, 0.03); take(d, 'boot', 'foot' + side);
    // Gear: left shoulder guard, sash with a hanging tail, a pouch on the right hip
    d = hEll(x, y, z, [0.2, 1.465, 0], [0.086, 0.048, 0.082]); body = hsmin(body, d, 0.015); take(d, 'leather', 'upperArmL');
    const tr = Math.sqrt(x * x + (z / 0.9) * (z / 0.9)) - 0.166; d = Math.sqrt(tr * tr + (y - 1.0) * (y - 1.0)) - 0.032; body = Math.min(body, d); take(d, 'sash', 'hips');
    d = hCone(x, y, z, [0.1, 0.99, 0.11], [0.14, 0.76, 0.13], 0.026, 0.02); body = hsmin(body, d, 0.01); take(d, 'sash', 'hips');
    d = hEll(x, y, z, [-0.15, 0.98, -0.07], [0.04, 0.052, 0.034]); body = hsmin(body, d, 0.01); take(d, 'leather', 'hips');
    // The coat skirt: a flared shell from the waist to the knees, split at the front and the back
    const fl = Math.max(0, 1.0 - y), ang = Math.atan2(z, x), rr = 0.168 + fl * 0.2 + Math.sin(ang * 9 + y * 4) * 0.011 * Math.min(1, fl * 2.2), q = Math.sqrt(x * x + (z / 0.86) * (z / 0.86)) - rr;
    let skirt = Math.max(Math.abs(q) - 0.026, Math.max(y - 1.0, 0.43 - y));
    if (z > 0) skirt = -hsmin(-skirt, ax - (0.03 + fl * 0.22), 0.02);
    else if (y < 0.78) skirt = -hsmin(-skirt, ax - (0.012 + (0.78 - y) * 0.09), 0.015);
    body = Math.min(body, skirt); take(skirt, 'coat', 'skirt');
    hOut.d = body; if (want) { hOut.col = col; hOut.part = part; hOut.col2 = col2; hOut.gap = best2 - best; }
    return body;
  }

  // Surface nets over a sparse grid: only blocks near the surface are sampled finely
  function heroMeshData(cell, box, mode) {
    const [X0, Y0, Z0, X1, Y1, Z1] = box, NX = Math.ceil((X1 - X0) / cell) + 1, NY = Math.ceil((Y1 - Y0) / cell) + 1, NZ = Math.ceil((Z1 - Z0) / cell) + 1;
    const f = new Float32Array(NX * NY * NZ), idx = (i, j, k) => i + NX * (j + NY * k), B = 6;
    for (let bk = 0; bk < NZ; bk += B) for (let bj = 0; bj < NY; bj += B) for (let bi = 0; bi < NX; bi += B) {
      const cx = X0 + (bi + B / 2) * cell, cy = Y0 + (bj + B / 2) * cell, cz = Z0 + (bk + B / 2) * cell;
      const dc = heroSDF(cx, cy, cz, false, mode), far = Math.abs(dc) > B * cell * 2.2;
      for (let k = bk; k < Math.min(bk + B, NZ); k++) for (let j = bj; j < Math.min(bj + B, NY); j++) for (let i = bi; i < Math.min(bi + B, NX); i++)
        f[idx(i, j, k)] = far ? dc : heroSDF(X0 + i * cell, Y0 + j * cell, Z0 + k * cell, false, mode);
    }
    const vid = new Int32Array(NX * NY * NZ).fill(-1), pos = [];
    const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    for (let k = 0; k < NZ - 1; k++) for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      let mask = 0;
      for (let c = 0; c < 8; c++) { cv[c] = f[idx(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; if (cv[c] < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of EDGES) {
        if ((cv[a] < 0) === (cv[b] < 0)) continue;
        const t = cv[a] / (cv[a] - cv[b]);
        sx += (a & 1) + (((b & 1) - (a & 1)) * t); sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t); sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t); n++;
      }
      vid[idx(i, j, k)] = pos.length / 3;
      pos.push(X0 + (i + sx / n) * cell, Y0 + (j + sy / n) * cell, Z0 + (k + sz / n) * cell);
    }
    const tri = [];
    const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) tri.push(a, c, b, a, d, c); else tri.push(a, b, c, a, c, d); };
    for (let k = 1; k < NZ - 1; k++) for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) {
      const v0 = f[idx(i, j, k)] < 0;
      if (v0 !== (f[idx(i + 1, j, k)] < 0)) quad(vid[idx(i, j - 1, k - 1)], vid[idx(i, j, k - 1)], vid[idx(i, j, k)], vid[idx(i, j - 1, k)], !v0);
      if (v0 !== (f[idx(i, j + 1, k)] < 0)) quad(vid[idx(i - 1, j, k - 1)], vid[idx(i - 1, j, k)], vid[idx(i, j, k)], vid[idx(i, j, k - 1)], !v0);
      if (v0 !== (f[idx(i, j, k + 1)] < 0)) quad(vid[idx(i - 1, j - 1, k)], vid[idx(i, j - 1, k)], vid[idx(i, j, k)], vid[idx(i - 1, j, k)], !v0);
    }
    return { pos, tri, cell, mode };
  }

  // Bones in rest pose; the right side mirrors the left
  const HERO_BONES = [
    ['hips', null, HJ.hips], ['spine', 'hips', HJ.spine], ['chest', 'spine', HJ.chest], ['neck', 'chest', HJ.neck], ['head', 'neck', HJ.head],
    ['clavL', 'chest', HJ.clav], ['upperArmL', 'clavL', HJ.shoulder], ['forearmL', 'upperArmL', HJ.elbow], ['handL', 'forearmL', HJ.wrist],
    ['clavR', 'chest', HJ.clav, 1], ['upperArmR', 'clavR', HJ.shoulder, 1], ['forearmR', 'upperArmR', HJ.elbow, 1], ['handR', 'forearmR', HJ.wrist, 1],
    ['thighL', 'hips', HJ.hip], ['shinL', 'thighL', HJ.knee], ['footL', 'shinL', HJ.ankle],
    ['thighR', 'hips', HJ.hip, 1], ['shinR', 'thighR', HJ.knee, 1], ['footR', 'shinR', HJ.ankle, 1], ['coat', 'hips', HJ.coat]
  ];
  const BONE_END = { hips: HJ.spine, spine: HJ.chest, chest: HJ.neck, neck: HJ.head, head: HJ.headTop, clav: HJ.shoulder, upperArm: HJ.elbow, forearm: HJ.wrist, hand: HJ.handTip, thigh: HJ.knee, shin: HJ.ankle, foot: HJ.toe, coat: HJ.coatTip };
  // Which bones each part may follow
  const PART_BONES = {
    head: ['head', 'neck'], neck: ['neck', 'head', 'chest'], hood: ['head', 'neck', 'chest'], chest: ['chest', 'spine', 'clavL', 'clavR', 'upperArmL', 'upperArmR', 'neck'],
    spine: ['spine', 'chest', 'hips'], hips: ['hips', 'spine', 'thighL', 'thighR'], skirt: ['hips', 'coat', 'thighL', 'thighR'],
    upperArmL: ['upperArmL', 'clavL', 'chest', 'forearmL'], forearmL: ['forearmL', 'upperArmL', 'handL'], handL: ['handL', 'forearmL'],
    upperArmR: ['upperArmR', 'clavR', 'chest', 'forearmR'], forearmR: ['forearmR', 'upperArmR', 'handR'], handR: ['handR', 'forearmR'],
    thighL: ['thighL', 'hips', 'shinL'], shinL: ['shinL', 'thighL', 'footL'], footL: ['footL', 'shinL'],
    thighR: ['thighR', 'hips', 'shinR'], shinR: ['shinR', 'thighR', 'footR'], footR: ['footR', 'shinR']
  };
  function segDist(p, a, b) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], qx = p[0] - a[0], qy = p[1] - a[1], qz = p[2] - a[2];
    const h = Math.max(0, Math.min(1, (qx * bx + qy * by + qz * bz) / (bx * bx + by * by + bz * bz)));
    return Math.hypot(qx - bx * h, qy - by * h, qz - bz * h);
  }

  function buildHeroMesh(material, cell) {
    const parts = [heroMeshData(cell || 0.0165, [-0.44, -0.02, -0.32, 0.44, 1.84, 0.3], 1), heroMeshData((cell || 0.0165) * 0.55, [-0.17, 1.4, -0.2, 0.17, 1.84, 0.2], 2)];
    const pos = [], tri = [], vMode = [], vCell = [];
    parts.forEach(m => { const o = pos.length / 3; m.pos.forEach(v => pos.push(v)); m.tri.forEach(i => tri.push(i + o)); for (let i = 0; i < m.pos.length / 3; i++) { vMode.push(m.mode); vCell.push(m.cell); } });
    const nV = pos.length / 3, nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4);
    // Bones and their segments in model space
    const names = HERO_BONES.map(b => b[0]), segs = {};
    HERO_BONES.forEach(([n, , p, m]) => {
      const base = n.replace(/[LR]$/, ''), end = BONE_END[base], sx = m ? -1 : 1;
      segs[n] = [[p[0] * sx, p[1], p[2]], [end[0] * sx, end[1], end[2]]];
    });
    const p = [0, 0, 0];
    for (let v = 0; v < nV; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], md = vMode[v], e = vCell[v] * 0.3;
      let nx = heroSDF(x + e, y, z, false, md) - heroSDF(x - e, y, z, false, md), ny = heroSDF(x, y + e, z, false, md) - heroSDF(x, y - e, z, false, md), nz = heroSDF(x, y, z + e, false, md) - heroSDF(x, y, z - e, false, md);
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      nor[v * 3] = nx; nor[v * 3 + 1] = ny; nor[v * 3 + 2] = nz;
      heroSDF(x, y, z, true, md);
      const ck = hOut.col, part = hOut.part;
      // Baked occlusion: march out along the normal and see how quickly the surface opens up
      let occ = 0;
      for (let s = 1; s <= 4; s++) { const h = s * 0.016; occ += (h - Math.max(0, heroSDF(x + nx * h, y + ny * h, z + nz * h))) / Math.pow(2, s); }
      const ao = Math.max(0.5, Math.min(1, 1 - occ * 4.5));
      // Cloth gets a faint weave of light and dark, and the coat darkens toward its hem
      let c = HERO_COL[ck];
      const mixK = 0.5 * (1 - Math.min(1, hOut.gap / 0.014));
      if (mixK > 0 && HERO_COL[hOut.col2]) c = c.map((ch, i) => ch + (HERO_COL[hOut.col2][i] - ch) * mixK);
      if (ck === 'skin' && part === 'head' && z > 0.04 && y > 1.6 && y < 1.66) c = c.map(ch => ch * (0.55 + 0.45 * Math.min(1, Math.abs(y - 1.632) / 0.028)));
      if (ck === 'coat' && part === 'skirt') {
        const trimK = Math.max(0, Math.min(1, (0.485 - y) / 0.025));
        c = c.map((ch, i) => { const dk = ch + (HERO_COL.coatDark[i] - ch) * Math.min(1, (1.0 - y) * 1.4); return dk + (HERO_COL.trim[i] - dk) * trimK; });
      }
      const grain = 1 + (Math.sin(x * 210 + y * 37) * Math.sin(y * 190 - z * 53)) * (ck === 'coat' ? 0.025 : 0.04);
      col[v * 3] = c[0] * ao * grain; col[v * 3 + 1] = c[1] * ao * grain; col[v * 3 + 2] = c[2] * ao * grain;
      // Skin weights: the part's allowed bones, by distance to each bone segment
      p[0] = x; p[1] = y; p[2] = z;
      const cand = (PART_BONES[part] || ['chest']).map(n => {
        let w = 1 / Math.pow(segDist(p, segs[n][0], segs[n][1]) + 0.025, 4);
        if (part === 'skirt') {
          const drop = Math.max(0, Math.min(1, (0.98 - y) / 0.5));
          if (n === 'coat') w = z < 0 ? drop * 2 : 0; else if (n === 'hips') w = 1.2 - drop * (z < 0 ? 0.9 : 0.6); else w = z >= 0 && (n === 'thighL') === (x > 0) ? drop * 0.7 : 0;
        }
        return [names.indexOf(n), w];
      }).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = cand.reduce((s, c2) => s + c2[1], 0) || 1;
      cand.forEach(([bi, w], k) => { si[v * 4 + k] = bi; sw[v * 4 + k] = w / tot; });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.setIndex(tri);
    geo.computeBoundingSphere();
    // Skeleton: bone positions are relative to their parents
    const bones = {}, list = [];
    HERO_BONES.forEach(([n, parent, pp, m]) => {
      const b = new THREE.Bone(); b.name = n; const sx = m ? -1 : 1, wp = new THREE.Vector3(pp[0] * sx, pp[1], pp[2]);
      if (parent) { const ps = HERO_BONES.find(h => h[0] === parent), pm = ps[3] ? -1 : 1; wp.sub(new THREE.Vector3(ps[2][0] * pm, ps[2][1], ps[2][2])); bones[parent].add(b); }
      b.position.copy(wp); bones[n] = b; list.push(b);
    });
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.add(bones.hips); mesh.bind(new THREE.Skeleton(list));
    mesh.frustumCulled = false;
    const restLen = n => new THREE.Vector3().fromArray(segs[n][1]).distanceTo(new THREE.Vector3().fromArray(segs[n][0]));
    return { mesh, bones, L1: restLen('upperArmR'), L2: restLen('forearmR') };
  }

  // Poses. s: { t, stride, moving, run, mount, act, k, block, air, swordDir (Vector3 in body space), hurt }
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  // Where the right hand should sit for a sword pointing along dir (body space), and where its elbow should point
  const HERO_SHOULDER_R = new THREE.Vector3(-0.19, 1.43, 0), HERO_POLE = new THREE.Vector3(-0.6, -0.45, -0.75);
  function heroHandTarget(dir, out) {
    _v1.copy(dir).multiplyScalar(0.75); _v1.x -= 0.16; _v1.y -= 0.5; _v1.z += 0.06;
    return out.copy(HERO_SHOULDER_R).addScaledVector(_v1.normalize(), 0.47);
  }
  function aimBone(bone, childRest, worldDir) {
    // Rotate bone so its child offset points along worldDir
    bone.parent.updateMatrixWorld(true);
    _q.setFromRotationMatrix(_m.extractRotation(bone.parent.matrixWorld)).invert();
    _v3.copy(worldDir).applyQuaternion(_q).normalize();
    bone.quaternion.setFromUnitVectors(_v2.copy(childRest).normalize(), _v3);
  }
  function heroPose(R, s, handTargetWorld, poleWorld) {
    const B = R.bones, t = s.t, run = s.run || 0, act = s.act;
    for (const n in B) B[n].rotation.set(0, 0, 0);
    const breathe = Math.sin(t * 1.7) * 0.025;
    B.spine.rotation.x = 0.1 * run + breathe * 0.5; B.chest.rotation.x = breathe;
    B.neck.rotation.x = -0.05 - 0.06 * run; B.head.rotation.x = 0.04;
    // Legs follow the stride; the knee folds as the leg trails
    const legs = [['L', -s.stride], ['R', s.stride]];
    for (const [sd, a] of legs) {
      if (s.mount) { B['thigh' + sd].rotation.set(-1.25, 0, sd === 'L' ? -0.45 : 0.45); B['shin' + sd].rotation.x = 1.35; B['foot' + sd].rotation.x = -0.3; continue; }
      if (s.air) { B['thigh' + sd].rotation.x = -0.55 + (sd === 'L' ? 0.25 : -0.1); B['shin' + sd].rotation.x = 0.95; continue; }
      B['thigh' + sd].rotation.x = a;
      B['shin' + sd].rotation.x = (s.moving ? 0.18 : 0.04) + Math.max(0, a) * 1.5;
      B['foot' + sd].rotation.x = -a * 0.35;
    }
    // Coat tails trail behind a running hero
    B.coat.rotation.x = 0.3 * run + Math.sin(t * 9) * 0.06 * run + (s.air ? 0.4 : 0);
    // Left arm: swings with the stride, raises to block, reaches forward to cast, lifts the flask
    const la = B.upperArmL, lf = B.forearmL;
    if (s.block) { la.rotation.set(-1.2, 0.3, 0.35); lf.rotation.set(-1.4, 0, 0); B.chest.rotation.y = -0.15; }
    else if (act === 'cast' || act === 'volley') { la.rotation.set(-1.45, 0, 0.1); lf.rotation.set(-0.15, 0, 0); }
    else if (act === 'drink') { la.rotation.set(-0.9, 0, 0.25); lf.rotation.set(-1.9, 0, 0); B.head.rotation.x = -0.25; }
    else if (s.mount) { la.rotation.set(-0.9, 0, 0); lf.rotation.set(-0.6, 0, 0); }
    else { la.rotation.set(s.stride * 0.75, 0, 0.06); lf.rotation.set(-0.25 - (s.moving ? 0.35 : 0), 0, 0); }
    if (act === 'hurt') { B.spine.rotation.x -= 0.25; B.head.rotation.x -= 0.2; }
    // Torso twists into the sword swing
    if (s.swordDir) B.chest.rotation.y += Math.max(-0.5, Math.min(0.5, Math.atan2(-s.swordDir.x, s.swordDir.z) * -0.35));
    // Right arm reaches its target with two-bone IK
    if (handTargetWorld) {
      const ua = B.upperArmR, fa = B.forearmR;
      ua.parent.updateMatrixWorld(true);
      const S = ua.getWorldPosition(new THREE.Vector3()), T = handTargetWorld.clone();
      let dv = T.clone().sub(S); const d = Math.min(Math.max(dv.length(), 0.05), R.L1 + R.L2 - 0.002); dv.normalize();
      const a = (R.L1 * R.L1 - R.L2 * R.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R.L1 * R.L1 - a * a));
      const pole = poleWorld.clone().sub(S); pole.sub(dv.clone().multiplyScalar(pole.dot(dv))).normalize();
      const E = S.clone().addScaledVector(dv, a).addScaledVector(pole, h);
      aimBone(ua, fa.position, E.clone().sub(S));
      ua.updateMatrixWorld(true);
      aimBone(fa, B.handR.position, S.clone().addScaledVector(dv, d).sub(E));
    }
  }
