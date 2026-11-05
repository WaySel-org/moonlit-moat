  // ---------- Cloth: capes, cloaks, scarves and skirts that hang, swing and keep out of the body ----------
  // A small Verlet grid per garment. The top row is pinned to points on a bone (shoulders, neck or hips); the rest
  // falls under gravity and wind and is pushed out of capsules around the torso and legs every step.
  // Spec (gear.json "cloth"): { kind: cape|scarf|skirt|shawl, w, len, cols, rows, color, trim, pattern, tatter }
  const CL_G = new THREE.Vector3(0, -9.8, 0);
  // Capsules: [from bone, to bone, radius as a share of the torso's depth or a fixed size]
  const CL_COLLIDE = [['pelvis', 'spine_03', 0.62], ['spine_03', 'neck_01', 0.55], ['thigh_l', 'calf_l', 0.075], ['thigh_r', 'calf_r', 0.075],
    ['calf_l', 'foot_l', 0.06], ['calf_r', 'foot_r', 0.06], ['upperarm_l', 'lowerarm_l', 0.055], ['upperarm_r', 'lowerarm_r', 0.055]];

  function clothTexture(spec) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = spec.color || '#5a1f24'; x.fillRect(0, 0, 256, 512);
    // Weave noise, a darker fold shading down the length, and a trim at the hem and edges
    for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; x.fillRect(Math.random() * 256, Math.random() * 512, 1 + Math.random() * 3, 1); }
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = g; x.fillRect(0, 0, 256, 512);
    if (spec.pattern === 'stripes') { x.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 12, 512); }
    if (spec.pattern === 'moon') { x.fillStyle = spec.trim || '#d8c48a'; x.beginPath(); x.arc(128, 200, 46, 0, Math.PI * 2); x.fill(); x.fillStyle = spec.color || '#5a1f24'; x.beginPath(); x.arc(150, 188, 40, 0, Math.PI * 2); x.fill(); }
    if (spec.pattern === 'moths') { x.fillStyle = 'rgba(230,220,255,0.35)'; for (let i = 0; i < 14; i++) { const px = 20 + Math.random() * 216, py = 40 + Math.random() * 420; x.beginPath(); x.ellipse(px - 6, py, 7, 4, 0.5, 0, 7); x.ellipse(px + 6, py, 7, 4, -0.5, 0, 7); x.fill(); } }
    if (spec.trim) { x.fillStyle = spec.trim; x.fillRect(0, 488, 256, 14); x.fillRect(0, 0, 8, 512); x.fillRect(248, 0, 8, 512); x.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 256; i += 16) x.fillRect(i, 492, 8, 6); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  function clothFor(A, spec) {
    const kind = spec.kind || 'cape';
    const T = typeof fgTorso === 'function' ? fgTorso(A) : { w: 0.36, d: 0.22, top: 1.45, bot: 1.0, c: new THREE.Vector3(0, 1.2, 0) };
    const cols = spec.cols || (kind === 'scarf' ? 3 : 11), rows = spec.rows || (kind === 'scarf' ? 12 : 15);
    // Where the top row hangs, in avatar space, and the bone it follows
    let bone = 'spine_03', top = [];
    if (kind === 'cape' || kind === 'shawl') {
      const w = (spec.w || 1) * T.w * 1.05, y = T.top - 0.02, z = T.c.z - T.d * 0.5 - 0.035;
      for (let i = 0; i < cols; i++) { const u = i / (cols - 1) - 0.5; top.push(new THREE.Vector3(u * w, y - Math.abs(u) * 0.05, z + Math.abs(u) * Math.abs(u) * T.d * 0.9)); }
    } else if (kind === 'scarf') {
      const n = A.rest.neck_01, y = n.y - 0.03;
      for (let i = 0; i < cols; i++) top.push(new THREE.Vector3(0.05 + i * 0.035, y, n.z - 0.09));
    } else if (kind === 'skirt') {
      bone = 'pelvis';
      const h = A.regions.hips, y = h.max.y - (h.max.y - h.min.y) * 0.15, rx = (h.max.x - h.min.x) * 0.56, rz = (h.max.z - h.min.z) * 0.62, cz = (h.max.z + h.min.z) / 2;
      // A ring around the hips (last column meets the first)
      for (let i = 0; i < cols; i++) { const a = i / cols * Math.PI * 2; top.push(new THREE.Vector3(Math.sin(a) * rx, y, cz + Math.cos(a) * rz)); }
    }
    const ring = kind === 'skirt';
    const len = (spec.len || (kind === 'cape' ? 1.0 : kind === 'shawl' ? 0.45 : kind === 'skirt' ? 0.5 : 0.7));
    const seg = len / (rows - 1);
    const N = cols * rows, pos = new Float32Array(N * 3), prev = new Float32Array(N * 3), pin = new Uint8Array(N);
    const C = { A, spec, bone, top, cols, rows, pos, prev, pin, seg, cons: [], first: true, wind: 0, t: Math.random() * 10 };
    // Constraints: structure, shear and a little bend
    const id = (c, r) => r * cols + ((c + cols) % cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c + 1 < cols || ring) C.cons.push([id(c, r), id(c + 1, r), 0]);
      if (r + 1 < rows) C.cons.push([id(c, r), id(c, r + 1), seg]);
      if (r + 1 < rows && (c + 1 < cols || ring)) C.cons.push([id(c, r), id(c + 1, r + 1), 0]);
      if (r + 2 < rows) C.cons.push([id(c, r), id(c, r + 2), seg * 2]);
    }
    for (let c = 0; c < cols; c++) pin[c] = 1;

    // Mesh in the avatar root's space; positions are written every step
    const geo = new THREE.BufferGeometry(), vp = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { uv[(r * cols + c) * 2] = c / (cols - (ring ? 0 : 1)); uv[(r * cols + c) * 2 + 1] = 1 - r / (rows - 1); }
    const tat = spec.tatter ? Array.from({ length: cols }, () => rows - 1 - Math.floor(Math.random() * spec.tatter)) : null;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - (ring ? 0 : 1); c++) {
      if (tat && (r >= tat[c] || r >= tat[(c + 1) % cols])) continue;
      const a = id(c, r), b = id(c + 1, r), d = id(c, r + 1), e = id(c + 1, r + 1);
      idx.push(a, d, b, b, d, e);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(vp, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ map: clothTexture(spec), roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
    mat.userData.kind = 'cloth'; mat.userData.base = mat.color.clone(); A.mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = 'cloth:' + kind;
    A.root.add(mesh); C.mesh = mesh;

    const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _inv = new THREE.Matrix4();
    const anchors = top.map(() => new THREE.Vector3());
    function anchorsNow() {
      // Avatar-space rest point -> bone-local -> world
      const b = A.bones[C.bone]; if (!b) return;
      b.updateWorldMatrix(true, false);
      const restB = A.rest[C.bone];
      const sock = A.sockets[C.bone];
      sock.updateWorldMatrix(true, false);
      top.forEach((p, i) => { anchors[i].copy(p).sub(restB).applyMatrix4(sock.matrixWorld); });
    }
    function reset() {
      anchorsNow();
      const down = new THREE.Vector3(0, -1, 0), back = new THREE.Vector3(0, 0, -1).transformDirection(A.root.matrixWorld);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c, p = _v.copy(anchors[c]).addScaledVector(down, r * seg * A.inner.scale.y);
        if (kind === 'skirt') { const out = _a.copy(anchors[c]).sub(_b.setFromMatrixPosition(A.bones.pelvis.matrixWorld)).setY(0).normalize(); p.addScaledVector(out, r * seg * 0.25); }
        else p.addScaledVector(back, r * seg * 0.05);
        pos.set([p.x, p.y, p.z], i * 3); prev.set([p.x, p.y, p.z], i * 3);
      }
      C.first = false;
    }
    // Capsules in world space, rebuilt each step from the bones
    const caps = CL_COLLIDE.map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0 }));
    function capsNow() {
      const s = A.inner.scale.x;
      CL_COLLIDE.forEach(([f, t, r], i) => {
        const bf = A.bones[f], bt = A.bones[t]; if (!bf || !bt) { caps[i].r = 0; return; }
        caps[i].a.setFromMatrixPosition(bf.matrixWorld); caps[i].b.setFromMatrixPosition(bt.matrixWorld);
        caps[i].r = (r < 0.3 ? r : r * T.d) * s * (A.look.shape && A.look.shape.build !== undefined ? 0.8 + A.look.shape.build * 0.4 : 1);
      });
      // The torso capsule sits a little behind the bones (bones run along the spine, the chest is in front)
    }
    function collide(i) {
      const p = _v.fromArray(pos, i * 3);
      for (const c of caps) {
        if (!c.r) continue;
        const ab = _a.copy(c.b).sub(c.a), t = Math.max(0, Math.min(1, _b.copy(p).sub(c.a).dot(ab) / (ab.lengthSq() || 1)));
        const q = _a.copy(c.a).addScaledVector(ab, t), d = p.distanceTo(q), rr = c.r + 0.012;
        if (d < rr && d > 1e-5) p.sub(q).multiplyScalar(rr / d).add(q);
      }
      p.toArray(pos, i * 3);
    }
    C.update = function (dt, ext) {
      if (!dt) { write(); return; }
      A.root.updateWorldMatrix(true, true);
      if (C.first) reset();
      anchorsNow(); capsNow();
      // A teleport (respawn, travel) resets the cloth instead of whipping it across the map
      if (_v.fromArray(pos, 0).distanceTo(anchors[0]) > 2) reset();
      C.t += dt;
      const S = A.inner.scale.y, steps = 2, h = Math.min(dt, 1 / 30) / steps;
      const windDir = new THREE.Vector3(Math.sin(C.t * 0.3), 0, Math.cos(C.t * 0.23)).multiplyScalar((ext && ext.wind || 0.3) * (1.2 + Math.sin(C.t * 1.7) * 0.6));
      for (let s = 0; s < steps; s++) {
        for (let i = 0; i < N; i++) {
          if (pin[i]) continue;
          const k = i * 3;
          for (let a = 0; a < 3; a++) {
            const cur = pos[k + a], vel = (cur - prev[k + a]) * 0.985;
            prev[k + a] = cur;
            pos[k + a] = cur + vel + ((a === 1 ? CL_G.y : 0) + (a === 0 ? windDir.x : a === 2 ? windDir.z : 0) * 3.5) * h * h;
          }
        }
        for (let c = 0; c < cols; c++) anchors[c].toArray(pos, c * 3);
        for (let it = 0; it < 4; it++) {
          for (const [i, j, L0] of C.cons) {
            const ix = i * 3, jx = j * 3;
            const dx = pos[jx] - pos[ix], dy = pos[jx + 1] - pos[ix + 1], dz = pos[jx + 2] - pos[ix + 2];
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
            const want = L0 ? L0 * S : C.restW(i, j, S);
            const diff = (d - want) / d * 0.5, wi = pin[i] ? 0 : 1, wj = pin[j] ? 0 : 1, sum = wi + wj; if (!sum) continue;
            const f = diff * 2 / sum;
            pos[ix] += dx * f * wi; pos[ix + 1] += dy * f * wi; pos[ix + 2] += dz * f * wi;
            pos[jx] -= dx * f * wj; pos[jx + 1] -= dy * f * wj; pos[jx + 2] -= dz * f * wj;
          }
          for (let i = cols; i < N; i++) collide(i);
        }
      }
      write();
    };
    // Rest width between columns: measured from the anchors (they move with the shoulders), times the row's flare
    const flare = kind === 'skirt' ? 1.35 : kind === 'cape' ? 1.18 : 1.0;
    C.restW = (i, j, S) => {
      const r = Math.floor(i / cols), ci = i % cols, cj = j % cols;
      const w = anchors[ci].distanceTo(anchors[cj]) || 0.03;
      const rj = Math.floor(j / cols), along = rj > r ? seg * S : 0;
      const across = w * (1 + (flare - 1) * r / (rows - 1));
      return along ? Math.sqrt(across * across + along * along) : across;
    };
    function write() {
      _inv.copy(A.root.matrixWorld).invert();
      for (let i = 0; i < N; i++) { _v.fromArray(pos, i * 3).applyMatrix4(_inv); vp[i * 3] = _v.x; vp[i * 3 + 1] = _v.y; vp[i * 3 + 2] = _v.z; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    }
    C.reset = () => { C.first = true; };
    C.dispose = () => { mesh.parent && mesh.parent.remove(mesh); geo.dispose(); mat.map && mat.map.dispose(); mat.dispose(); };
    return C;
  }
