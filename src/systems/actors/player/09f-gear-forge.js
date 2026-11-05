  // ---------- Gear forge: armour, shields and weapons the kit doesn't have, built in code ----------
  // Each piece is modelled upright in avatar space (Y up, Z forward, +X the hero's left) and hung on a bone socket
  // (09e), sized from the body's own region boxes so it fits either body and any shape. gear.json lists recipes:
  //   "forge": [{ "shape": "kettle", "metal": "#8d9399", "trim": "#b8944a", ... }]
  // Weapons are built along +Z from the grip and go in the right hand (the game reads A.weapon for flashes).
  const FG = {};
  const fgV = (x, y, z) => new THREE.Vector3(x, y, z);
  const fgLathe = (pts, segs) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), segs || 28);
  function fgMats(o) {
    return {
      metal: ckMaterial('metal', { color: o.metal || '#8e959c', rough: o.rough, surface: o.surface }),
      dark: ckMaterial('metal', { color: o.dark || '#3a3d42', rough: 0.55 }),
      trim: ckMaterial('metal', { color: o.trim || '#b8944a', rough: 0.3 }),
      leather: ckMaterial('leather', { color: o.leather || '#4a3020' }),
      cloth: ckMaterial('leather', { color: o.cloth || '#6e2a2a', surface: 'weave' }),
      fabric: ckMaterial('leather', { color: o.fabric || o.cloth || '#5a2a2a', surface: 'quilt' }),
      wood: ckMaterial('leather', { color: o.wood || '#5a3d24' }),
      glow: ckMaterial('glow', { color: o.glow || '#9fe0ff' })
    };
  }
  // Put object o on bone bn so that its origin sits at avatar-space point at (rest pose)
  function fgHang(A, bn, o, at) {
    const s = A.sockets[bn]; if (!s) return o;
    if (at) o.position.copy(at).sub(A.rest[bn]);
    o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    s.add(o); return o;
  }
  const fgBox = (A, r) => A.regions[r] || new THREE.Box3(fgV(-0.15, 0, -0.1), fgV(0.15, 0.3, 0.1));
  function fgMesh(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }

  // ---------- Helmets ----------
  function fgHead(A) {
    const b = fgBox(A, 'head'), c = b.getCenter(fgV()), s = b.getSize(fgV());
    // The skull, not the jaw: centre a little above the box centre and slightly back
    return { c: fgV(c.x, b.max.y - s.y * 0.38, c.z - s.z * 0.04), r: Math.max(s.x, s.z) * 0.56, top: b.max.y, s };
  }
  FG.kettle = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r;
    g.add(fgMesh(new THREE.SphereGeometry(r * 1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), M.metal, 0, -r * 0.05, 0));
    const brim = fgMesh(fgLathe([[r * 1.0, 0], [r * 1.6, -r * 0.22], [r * 1.66, -r * 0.3], [r * 1.58, -r * 0.27], [r * 0.98, -r * 0.05]], 40), M.metal); brim.position.y = -r * 0.02; g.add(brim);
    g.add(fgMesh(new THREE.TorusGeometry(r * 1.06, r * 0.05, 8, 40).rotateX(Math.PI / 2), M.trim, 0, r * 0.02, 0));
    g.add(fgMesh(new THREE.BoxGeometry(r * 0.08, r * 0.12, r * 2.1), M.trim, 0, r * 0.92, 0).rotateX(0));
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(fgMesh(new THREE.SphereGeometry(r * 0.035, 6, 4), M.trim, Math.cos(a) * r * 1.08, r * 0.03, Math.sin(a) * r * 1.08)); }
    fgHang(A, 'Head', g, h.c);
  };
  FG.greathelm = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r * 1.06, H = h.s.y * 0.98;
    const shell = new THREE.CylinderGeometry(r * 0.96, r, H, 32, 1, true);
    g.add(fgMesh(shell, M.metal, 0, -H * 0.22, 0));
    g.add(fgMesh(new THREE.SphereGeometry(r * 0.96, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), M.metal, 0, H * 0.28 - r * 0.25, 0));
    // Eye slits and breaths, cut in dark metal over the face
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.BoxGeometry(r * 0.62, r * 0.07, r * 0.1), M.dark, sd * r * 0.36, H * 0.02, r * 0.95)));
    g.add(fgMesh(new THREE.BoxGeometry(r * 0.14, H * 0.9, r * 0.12), M.trim, 0, -H * 0.2, r * 0.97));
    g.add(fgMesh(new THREE.BoxGeometry(r * 2.04, r * 0.1, r * 0.12).translate(0, 0, 0), M.trim, 0, H * 0.02 + r * 0.12, r * 0.93));
    for (let i = 0; i < 6; i++) [-1, 1].forEach(sd => g.add(fgMesh(new THREE.CylinderGeometry(r * 0.025, r * 0.025, r * 0.12, 6).rotateX(Math.PI / 2), M.dark, sd * r * (0.3 + (i % 3) * 0.13), -H * 0.3 - Math.floor(i / 3) * r * 0.16, r * 0.93)));
    g.add(fgMesh(new THREE.TorusGeometry(r, r * 0.05, 8, 40).rotateX(Math.PI / 2), M.trim, 0, -H * 0.72, 0));
    if (o.crest) { const cr = fgMesh(new THREE.BoxGeometry(r * 0.12, r * 0.5, r * 1.6), M.cloth, 0, H * 0.28 + r * 0.25, -r * 0.1); g.add(cr); }
    fgHang(A, 'Head', g, h.c.clone().add(fgV(0, -h.s.y * 0.02, 0)));
  };
  FG.horned = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r;
    g.add(fgMesh(new THREE.SphereGeometry(r * 1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M.metal, 0, -r * 0.08, 0));
    g.add(fgMesh(new THREE.BoxGeometry(r * 0.2, r * 0.9, r * 0.12), M.metal, 0, -r * 0.42, r * 1.0));
    g.add(fgMesh(new THREE.TorusGeometry(r * 1.06, r * 0.06, 8, 40).rotateX(Math.PI / 2), M.trim, 0, -r * 0.1, 0));
    [-1, 1].forEach(sd => {
      const curve = new THREE.CatmullRomCurve3([fgV(sd * r * 0.9, r * 0.1, 0), fgV(sd * r * 1.6, r * 0.45, r * 0.1), fgV(sd * r * 1.85, r * 1.2, -r * 0.1), fgV(sd * r * 1.55, r * 1.75, -r * 0.35)]);
      const tube = new THREE.TubeGeometry(curve, 24, r * 0.16, 10, false), p = tube.attributes.position;
      // Taper toward the tip
      for (let i = 0; i < p.count; i++) { const t = Math.floor(i / 11) / 24, cp = curve.getPoint(t); const v = fgV(p.getX(i), p.getY(i), p.getZ(i)).sub(cp).multiplyScalar(1 - t * 0.85).add(cp); p.setXYZ(i, v.x, v.y, v.z); }
      tube.computeVertexNormals();
      g.add(new THREE.Mesh(tube, ckMaterial('leather', { color: o.horn || '#d8ccb0' })));
    });
    fgHang(A, 'Head', g, h.c);
  };
  FG.circlet = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r;
    const ring = fgMesh(new THREE.TorusGeometry(r * 0.98, r * 0.035, 8, 48).rotateX(Math.PI / 2 + 0.18), M.trim, 0, r * 0.12, 0); g.add(ring);
    g.add(fgMesh(new THREE.OctahedronGeometry(r * 0.1), M.glow, 0, r * 0.32, r * 0.98));
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.ConeGeometry(r * 0.05, r * 0.28, 6), M.trim, sd * r * 0.18, r * 0.36, r * 0.94)));
    fgHang(A, 'Head', g, h.c);
  };
  FG.crown = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r;
    g.add(fgMesh(new THREE.CylinderGeometry(r * 0.99, r * 1.0, r * 0.22, 40, 1, true), M.trim, 0, r * 0.32, 0));
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.add(fgMesh(new THREE.ConeGeometry(r * 0.09, r * (i % 2 ? 0.3 : 0.48), 6), M.trim, Math.sin(a) * r, r * (i % 2 ? 0.58 : 0.66), Math.cos(a) * r)); }
    g.add(fgMesh(new THREE.OctahedronGeometry(r * 0.09), M.glow, 0, r * 0.34, r * 1.0));
    fgHang(A, 'Head', g, h.c);
  };
  FG.witchhat = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r, mat = ckMaterial('leather', { color: o.cloth || '#2a2433' });
    mat.side = THREE.DoubleSide;
    g.add(fgMesh(fgLathe([[r * 0.95, 0], [r * 2.4, -r * 0.05], [r * 2.5, -r * 0.14], [r * 2.35, -r * 0.1], [r * 0.95, r * 0.02]], 48), mat));
    // A tall cone that slumps backward
    const cone = new THREE.ConeGeometry(r * 1.0, r * 2.8, 32, 12, true), p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + r * 1.4, t = y / (r * 2.8); p.setZ(i, p.getZ(i) - t * t * r * 1.1); p.setY(i, y - t * t * r * 0.3); }
    cone.computeVertexNormals(); g.add(fgMesh(cone, mat, 0, 0, 0));
    g.add(fgMesh(new THREE.CylinderGeometry(r * 0.99, r * 0.97, r * 0.24, 40, 1, true), ckMaterial('leather', { color: o.band || '#7a3a28' }), 0, r * 0.12, 0));
    g.add(fgMesh(new THREE.TorusGeometry(r * 0.1, r * 0.03, 6, 16), M.trim, 0, r * 0.14, r * 0.99));
    fgHang(A, 'Head', g, h.c.clone().add(fgV(0, r * 0.1, 0)));
  };

  // Bascinet: a pointed skull with a hinged "snout" visor full of breaths
  FG.bascinet = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r * 1.04;
    const skull = fgLathe([[0, r * 1.25], [r * 0.35, r * 1.12], [r * 0.75, r * 0.82], [r * 0.98, r * 0.35], [r * 1.02, -r * 0.2], [r * 0.98, -r * 0.75], [r * 0.9, -r * 0.95]], 36);
    g.add(fgMesh(skull, M.metal));
    // The visor: a cone drawn out to a point in front of the face
    const v = new THREE.ConeGeometry(r * 0.78, r * 1.15, 24, 1, true).rotateX(Math.PI / 2), vp = v.attributes.position;
    for (let i = 0; i < vp.count; i++) { vp.setY(i, vp.getY(i) * 1.15); if (vp.getZ(i) < 0) vp.setZ(i, vp.getZ(i) * 0.5); }
    v.computeVertexNormals();
    g.add(fgMesh(v, M.metal, 0, -r * 0.18, r * 0.72));
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.BoxGeometry(r * 0.42, r * 0.05, r * 0.3), M.dark, sd * r * 0.27, r * 0.0, r * 0.98)));
    const holes = []; for (let i = 0; i < 12; i++) holes.push([(i % 4 - 1.5) * r * 0.12, -r * (0.3 + Math.floor(i / 4) * 0.12), r * 1.15 - Math.abs(i % 4 - 1.5) * r * 0.06, Math.PI / 2, 0]);
    g.add(fgRivets(holes, r * 0.03, M.dark));
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 0.06, 12).rotateZ(Math.PI / 2), M.trim, sd * r * 0.98, -r * 0.05, r * 0.1)));
    // Mail aventail hanging to the shoulders
    g.add(fgMesh(fgLathe([[r * 0.92, -r * 0.9], [r * 1.25, -r * 1.55], [r * 1.5, -r * 1.75]], 36), ckMaterial('metal', { color: o.mail || '#6a6f75', rough: 0.6, surface: 'weave' })));
    fgHang(A, 'Head', g, h.c);
  };
  // Barbute: a rounded shell that closes over the cheeks, open in a T over the eyes and mouth
  FG.barbute = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r * 1.06;
    g.add(fgMesh(new THREE.SphereGeometry(r, 36, 18, Math.PI * 0.06, Math.PI * 1.88, 0, Math.PI * 0.82).rotateY(Math.PI / 2), M.metal));
    // Cheek plates either side of the T, leaving the opening dark
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.SphereGeometry(r * 1.01, 16, 12, Math.PI / 2 - sd * 0.33 - (sd > 0 ? 0.34 : 0), 0.34, Math.PI * 0.5, Math.PI * 0.32), M.metal)));
    g.add(fgMesh(new THREE.BoxGeometry(r * 0.12, r * 0.6, r * 0.12), M.trim, 0, r * 0.62, r * 0.55).rotateX(-0.6));
    fgHang(A, 'Head', g, h.c);
  };
  // Cowl: a deep hood whose face is lost in shadow, with two points of light for eyes. Drapes over the shoulders.
  FG.cowl = (A, o, M) => {
    const h = fgHead(A), g = new THREE.Group(), r = h.r * 1.32;
    const mat = ckMaterial('leather', { color: o.cloth || '#2a2622', surface: 'weave', side: THREE.DoubleSide });
    // The hood: a sphere opened at the front, drawn back into a peak
    // SphereGeometry's phi runs from -X through +Z: leave a gap of 0.42 turn centred on +Z (the face)
    const gap = Math.PI * 0.84, hood = new THREE.SphereGeometry(r, 40, 24, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, Math.PI * 0.8), hp = hood.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i), z = hp.getZ(i);
      // Draw the crown up and back into a soft peak, and the sides forward past the face
      if (y > 0) { hp.setY(i, y * (1.15 + 0.25 * Math.max(0, -z / r))); hp.setZ(i, z - (y / r) * (y / r) * r * 0.45); }
      if (z > 0) hp.setZ(i, z * 1.2);
    }
    hood.computeVertexNormals(); g.add(fgMesh(hood, mat));
    // A thick folded rim around the face opening
    g.add(fgMesh(new THREE.TorusGeometry(r * 0.7, r * 0.1, 8, 36, Math.PI * 1.55).rotateZ(-Math.PI * 0.275).scale(0.9, 1.25, 1), mat, 0, r * 0.05, r * 0.7));
    // The void, and the eyes in it
    g.add(fgMesh(new THREE.SphereGeometry(r * 0.88, 20, 14).scale(1, 1.1, 1), new THREE.MeshBasicMaterial({ color: 0x020203 }), 0, 0, 0));
    const eye = ckMaterial('glow', { color: o.eyes || '#ffb060' }); A.eyeMat = eye;
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.SphereGeometry(r * 0.07, 10, 8).scale(1.4, 0.7, 1), eye, sd * r * 0.25, r * 0.0, r * 0.8)));
    fgHang(A, 'Head', g, h.c.clone().add(fgV(0, r * 0.08, -r * 0.08)));
    // A short capelet from the hood's neck over the shoulders, riding the chest so a nod doesn't swing it
    const T = fgTorso(A), sw = T.w * 0.62, H = (T.top - T.bot) * 0.42;
    const cap = fgLathe([[r * 0.62, 0], [r * 0.8, -H * 0.15], [sw * 0.85, -H * 0.55], [sw, -H * 0.9], [sw * 1.02, -H]], 44), cp = cap.attributes.position, v = fgV();
    for (let i = 0; i < cp.count; i++) {
      v.fromBufferAttribute(cp, i); const a = Math.atan2(v.x, v.z);
      // Flatten front to back, and let the hem fall in soft folds
      v.z *= T.d / T.w * 1.5; if (v.y < -H * 0.5) v.y += Math.sin(a * 9) * H * 0.04 * (-v.y / H);
      cp.setXYZ(i, v.x, v.y, v.z);
    }
    cap.computeVertexNormals();
    const md = new THREE.Group(); md.add(fgMesh(cap, mat));
    fgHang(A, 'spine_03', md, fgV(T.c.x, A.rest.neck_01.y + 0.02, T.c.z - 0.01));
  };

  // ---------- Detail helpers: rivets and straps merged into one mesh each, so detail costs one draw ----------
  function fgMerge(geos) {
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
    const n = parts.reduce((s, g) => s + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    parts.forEach(g => {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }
  // Rivet heads at points (array of [x, y, z]); r is the head radius
  const fgRivets = (pts, r, mat) => fgMesh(fgMerge(pts.map(p => new THREE.SphereGeometry(r, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(p[3] || 0).rotateY(p[4] || 0).translate(p[0], p[1], p[2]))), mat);
  // Points around an ellipse (rx, rz) at height y, from angle a0 to a1, facing outward
  function fgRing(n, rx, rz, y, a0, a1) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1)); out.push([Math.sin(a) * rx, y, Math.cos(a) * rz, Math.PI / 2, a]); }
    return out;
  }
  // A leather strap with a buckle, as a flat box from a to b (avatar-space offsets inside the group)
  function fgStrap(g, a, b, w, M) {
    const d = b.clone().sub(a), len = d.length(), m = fgMesh(new THREE.BoxGeometry(w, 0.006, len), M.leather);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(m.position.clone().add(d)); g.add(m);
    const k = fgMesh(new THREE.TorusGeometry(w * 0.55, w * 0.12, 4, 4), M.trim); k.position.copy(a).lerp(b, 0.3); k.lookAt(k.position.clone().add(d)); k.rotateY(Math.PI / 2); g.add(k);
  }

  // ---------- Body armour ----------
  function fgTorso(A) {
    const b = fgBox(A, 'torso'), hips = fgBox(A, 'hips'), c = b.getCenter(fgV()), s = b.getSize(fgV());
    const arms = fgBox(A, 'arms');
    // The torso box is widened by the clavicles; the ribcage is about 70% of it
    return { c, w: Math.min(s.x, (A.rest.upperarm_l.x - A.rest.upperarm_r.x) * 0.92), d: s.z, top: b.max.y, bot: hips.max.y - (hips.max.y - hips.min.y) * 0.2, hips, arms };
  }
  // The chest shell: lathed, flattened to the chest, with a keel down the front. Shared by cuirass and brigandine.
  function fgShell(T, H, puff) {
    const prof = [[0.78, 0], [0.86, 0.12], [0.98, 0.42], [1.02, 0.66], [0.96, 0.84], [0.62, 0.98], [0.5, 1.0]].map(([r, y]) => [r * (puff || 1), y * H]);
    const geo = fgLathe(prof, 48), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) * T.w * 0.5, z = p.getZ(i) * T.d * 0.5 * 1.08;
      if (z > 0) z *= 1 + 0.16 * Math.max(0, 1 - Math.abs(x) / (T.w * 0.3));
      p.setXYZ(i, x, p.getY(i), z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  FG.cuirass = (A, o, M) => {
    const T = fgTorso(A), H = T.top - T.bot, g = new THREE.Group(), rx = T.w * 0.5, rz = T.d * 0.5 * 1.08;
    g.add(fgMesh(fgShell(T, H), M.metal));
    // Rolled, riveted edges at the neck and waist, a raised keel, and a riveted arming line across the chest
    g.add(fgMesh(new THREE.TorusGeometry(1, 0.06, 6, 48).rotateX(Math.PI / 2).scale(rx * 0.8, 1, rz * 0.8), M.trim, 0, 0.01, 0));
    g.add(fgMesh(new THREE.TorusGeometry(1, 0.05, 6, 48).rotateX(Math.PI / 2).scale(rx * 0.52, 1, rz * 0.52), M.trim, 0, H * 0.99, 0));
    g.add(fgMesh(new THREE.BoxGeometry(0.012, H * 0.8, 0.012), M.trim, 0, H * 0.48, rz * 1.13));
    g.add(fgRivets(fgRing(18, rx * 0.86, rz * 0.9, H * 0.05, -2.5, 2.5).concat(fgRing(10, rx * 0.97, rz * 1.04, H * 0.62, -1.1, 1.1)), 0.006, M.trim));
    g.add(fgMesh(new THREE.TorusGeometry(1, 0.012, 4, 40, Math.PI * 0.8).rotateX(Math.PI / 2).rotateY(Math.PI * 0.1).scale(rx * 1.0, 1, rz * 1.08), M.dark, 0, H * 0.62, 0));
    // Side straps holding breast and back plates together
    [-1, 1].forEach(sd => { fgStrap(g, fgV(sd * rx * 0.98, H * 0.3, 0.02), fgV(sd * rx * 0.97, H * 0.3, -0.06), 0.03, M); fgStrap(g, fgV(sd * rx * 0.99, H * 0.55, 0.02), fgV(sd * rx * 0.98, H * 0.55, -0.06), 0.03, M); });
    if (o.belt !== false) {
      g.add(fgMesh(new THREE.CylinderGeometry(1, 1, 0.05, 48, 1, true).scale(rx * 0.83, 1, rz * 0.85), M.leather, 0, 0.0, 0));
      g.add(fgMesh(new THREE.BoxGeometry(0.06, 0.06, 0.012), M.trim, 0, 0, rz * 0.9));
    }
    fgHang(A, 'spine_02', g, fgV(T.c.x, T.bot, T.c.z));
    // Faulds: overlapping riveted lames over the hips, on the pelvis so they follow the legs' twist
    const f = new THREE.Group(), n = o.faulds === undefined ? 3 : o.faulds;
    for (let i = 0; i < n; i++) {
      const r = 1.02 + i * 0.05;
      const band = new THREE.CylinderGeometry(r, r + 0.06, 0.07, 48, 1, true, -Math.PI * 0.62, Math.PI * 1.24).scale(rx * 0.86, 1, T.d * 0.5 * 0.98);
      f.add(fgMesh(band, i % 2 ? M.metal : M.dark, 0, -i * 0.055, 0));
      f.add(fgRivets(fgRing(7, rx * 0.86 * (r + 0.03), T.d * 0.5 * 0.98 * (r + 0.03), -i * 0.055, -1.6, 1.6), 0.005, M.trim));
    }
    fgHang(A, 'pelvis', f, fgV(T.c.x, T.bot - 0.02, T.c.z));
    if (o.pauldrons) FG.pauldrons(A, o, M);
    if (o.gorget) FG.gorget(A, o, M);
    if (o.tassets) FG.tassets(A, o, M);
  };
  // Brigandine: a padded cloth coat with rows of rivet heads holding plates inside
  FG.brigandine = (A, o, M) => {
    const T = fgTorso(A), H = T.top - T.bot, g = new THREE.Group(), rx = T.w * 0.5 * 1.04, rz = T.d * 0.5 * 1.12;
    g.add(fgMesh(fgShell(T, H, 1.04), M.fabric));
    const pts = [];
    for (let row = 0; row < 7; row++) pts.push(...fgRing(14, rx * (0.84 + 0.05 * Math.sin(row / 6 * Math.PI)), rz * (0.86 + 0.06 * Math.sin(row / 6 * Math.PI)), H * (0.08 + row * 0.12), -2.6, 2.6));
    g.add(fgRivets(pts, 0.007, M.trim));
    g.add(fgMesh(new THREE.TorusGeometry(1, 0.03, 6, 48).rotateX(Math.PI / 2).scale(rx * 0.8, 1, rz * 0.8), M.leather, 0, 0.01, 0));
    g.add(fgMesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), M.trim, 0, 0.01, rz * 0.82));
    fgHang(A, 'spine_02', g, fgV(T.c.x, T.bot, T.c.z));
    if (o.pauldrons) FG.pauldrons(A, o, M);
  };
  FG.pauldrons = (A, o, M) => {
    [['upperarm_l', 1], ['upperarm_r', -1]].forEach(([bn, sd]) => {
      const g = new THREE.Group(), r = o.big ? 0.1 : 0.082, n = o.big ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const rr = r * (1 - i * 0.08), y = -i * r * 0.42, x = sd * i * r * 0.32, tilt = -sd * (0.45 + i * 0.18);
        const lame = new THREE.Group(); lame.position.set(x, y, 0); lame.rotation.z = tilt;
        lame.add(fgMesh(new THREE.SphereGeometry(rr, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), M.metal));
        lame.add(fgMesh(new THREE.TorusGeometry(rr * 0.92, r * 0.05, 6, 28, Math.PI * 1.2).rotateX(Math.PI / 2), M.trim, 0, r * 0.02, 0));
        lame.add(fgRivets(fgRing(5, rr * 0.86, rr * 0.86, rr * 0.36, -1.0, 1.0), r * 0.05, M.trim));
        g.add(lame);
      }
      // A raised flange on big pauldrons, to turn a blade from the neck
      if (o.big) { const fl = fgMesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.012, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.metal, -sd * r * 0.3, r * 0.75, 0); g.add(fl); }
      fgHang(A, bn, g, A.rest[bn].clone().add(fgV(sd * 0.025, 0.055, -0.005)));
    });
  };
  FG.gorget = (A, o, M) => {
    const n = A.rest.neck_01, g = new THREE.Group();
    for (let i = 0; i < 3; i++) g.add(fgMesh(fgLathe([[0.135 - i * 0.012, -0.05 + i * 0.035], [0.12 - i * 0.012, -0.015 + i * 0.035], [0.105 - i * 0.012, 0.02 + i * 0.035]], 32).scale(1.1, 1, 0.95), i % 2 ? M.dark : M.metal));
    g.add(fgMesh(new THREE.TorusGeometry(0.135, 0.012, 6, 32).rotateX(Math.PI / 2).scale(1.1, 1, 0.95), M.trim, 0, -0.05, 0));
    g.add(fgRivets(fgRing(10, 0.15, 0.13, -0.035, -2.8, 2.8), 0.006, M.trim));
    fgHang(A, 'spine_03', g, n.clone().add(fgV(0, -0.02, -0.005)));
  };
  // Tassets: plates hanging from the faulds over each thigh
  FG.tassets = (A, o, M) => {
    ['l', 'r'].forEach(s => {
      const t = A.rest['thigh_' + s], g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const plate = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 20, 1, true, -1.0, 2.0).scale(1, 1, 0.85);
        g.add(fgMesh(plate, i % 2 ? M.dark : M.metal, 0, -0.02 - i * 0.06, 0.0));
      }
      g.add(fgRivets(fgRing(4, 0.102, 0.087, -0.02, -0.7, 0.7), 0.005, M.trim));
      fgHang(A, 'thigh_' + s, g, t.clone().add(fgV(0, -0.02, 0.01)));
    });
  };
  // Mantle: a heavy collar of fur over the shoulders (many tufts merged into one mesh)
  FG.mantle = (A, o, M) => {
    const T = fgTorso(A), g = new THREE.Group(), rx = T.w * 0.5 * 0.98, rz = T.d * 0.5 * 1.1;
    const fur = ckMaterial('leather', { color: o.fur || '#5a4a3a', surface: 'weave' });
    // The roll: a thick torus around the shoulders, lumpy like a pelt
    const roll = new THREE.TorusGeometry(1, 0.11, 14, 64).rotateX(Math.PI / 2), rp = roll.attributes.position, v = fgV();
    for (let i = 0; i < rp.count; i++) {
      v.fromBufferAttribute(rp, i); const a = Math.atan2(v.x, v.z), n = 1 + 0.18 * Math.sin(a * 13 + v.y * 40) * Math.cos(a * 7 - v.y * 25);
      const cx = Math.sin(a), cz = Math.cos(a); v.x = cx + (v.x - cx) * n; v.z = cz + (v.z - cz) * n; v.y *= n * 1.15;
      rp.setXYZ(i, v.x * rx, v.y * rx * 0.9, v.z * rz);
    }
    roll.computeVertexNormals(); g.add(fgMesh(roll, fur));
    // Locks of fur hanging from the outer edge, pointing down and out
    const geos = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + Math.random() * 0.05, l = 0.06 + Math.random() * 0.06;
      // Point down (wide end at the roll), then lean the tip outward
      const lock = new THREE.ConeGeometry(0.016 + Math.random() * 0.01, l, 4).rotateX(Math.PI).translate(0, -l / 2, 0);
      lock.rotateX(-(0.35 + Math.random() * 0.35)).rotateY(a).translate(Math.sin(a) * rx * 1.04, -0.02, Math.cos(a) * rz * 1.04);
      geos.push(lock);
    }
    const locks = fgMerge(geos); g.add(fgMesh(locks, fur));
    if (o.clasp !== false) g.add(fgMesh(new THREE.TorusGeometry(0.025, 0.008, 6, 14), M.trim, 0, -0.03, rz * 1.12));
    fgHang(A, 'spine_03', g, fgV(T.c.x, T.top - 0.02, T.c.z - 0.01));
  };
  // Belt with a buckle and pouches, over whatever the hero wears
  FG.belt = (A, o, M) => {
    const h = fgBox(A, 'hips'), c = h.getCenter(fgV()), s = h.getSize(fgV()), g = new THREE.Group(), rx = s.x * 0.5 * 1.02, rz = s.z * 0.5 * 1.08;
    g.add(fgMesh(new THREE.CylinderGeometry(1, 1, 0.045, 40, 1, true).scale(rx, 1, rz), M.leather));
    g.add(fgMesh(new THREE.BoxGeometry(0.055, 0.05, 0.01), M.trim, 0, 0, rz + 0.004));
    [[0.9, '#4a3020'], [2.1, '#3a2418'], [-1.4, '#4a3020']].forEach(([a, col]) => {
      const p = fgMesh(new THREE.BoxGeometry(0.07, 0.08, 0.035), ckMaterial('leather', { color: col }), Math.sin(a) * (rx + 0.02), -0.03, Math.cos(a) * (rz + 0.02)); p.rotation.y = a; g.add(p);
    });
    fgHang(A, 'pelvis', g, fgV(c.x, h.max.y - s.y * 0.18, c.z));
  };

  // ---------- Hands, legs, feet ----------
  FG.gauntlets = (A, o, M) => {
    [['l', 1], ['r', -1]].forEach(([s, sd]) => {
      const el = A.rest['lowerarm_' + s], wr = A.rest['hand_' + s], len = el.distanceTo(wr);
      // Bracer: a flared tube from the elbow to the wrist (in the rest pose the arm points along X), riveted, with a strap
      const tube = fgLathe([[0.042, 0], [0.046, len * 0.2], [0.05, len * 0.75], [0.062, len * 1.02], [0.064, len * 1.04]], 24).rotateZ(-sd * Math.PI / 2);
      const g = new THREE.Group(); g.add(fgMesh(tube, M.metal));
      g.add(fgMesh(new THREE.TorusGeometry(0.063, 0.008, 6, 24).rotateY(Math.PI / 2), M.trim, sd * len * 1.03, 0, 0));
      g.add(fgMesh(new THREE.TorusGeometry(0.049, 0.009, 6, 24).rotateY(Math.PI / 2), M.leather, sd * len * 0.45, 0, 0));
      const riv = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; riv.push([sd * len * 0.95, Math.cos(a) * 0.061, Math.sin(a) * 0.061, 0, 0]); }
      g.add(fgRivets(riv.map(p => [p[0], p[1], p[2]]), 0.005, M.trim));
      fgHang(A, 'lowerarm_' + s, g, el.clone().add(fgV(sd * len * 0.05, 0, 0)));
      // Back-of-hand plates, then a lame per finger joint
      const h = new THREE.Group();
      h.add(fgMesh(new THREE.BoxGeometry(0.09, 0.022, 0.085), M.metal, sd * 0.045, 0.028, 0));
      h.add(fgRivets([[sd * 0.02, 0.04, 0.03], [sd * 0.02, 0.04, -0.03], [sd * 0.07, 0.04, 0.03], [sd * 0.07, 0.04, -0.03]], 0.005, M.trim));
      for (let f = 0; f < 4; f++) for (let j = 0; j < 3; j++) h.add(fgMesh(new THREE.BoxGeometry(0.024, 0.014, 0.018), j % 2 ? M.dark : M.metal, sd * (0.1 + j * 0.026), 0.024 - j * 0.006, -0.03 + f * 0.021));
      fgHang(A, 'hand_' + s, h, wr);
    });
  };
  FG.greaves = (A, o, M) => {
    ['l', 'r'].forEach(s => {
      const k = A.rest['calf_' + s], an = A.rest['foot_' + s], len = k.distanceTo(an);
      const g = new THREE.Group();
      const shell = fgLathe([[0.058, 0], [0.066, -len * 0.25], [0.06, -len * 0.7], [0.05, -len * 0.98]], 26);
      const p = shell.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) * 1.18);
      shell.computeVertexNormals(); g.add(fgMesh(shell, M.metal));
      // Rivets down the shin, straps behind the calf, and a fanned knee cop
      const riv = []; for (let i = 0; i < 6; i++) riv.push([0, -len * (0.12 + i * 0.15), 0.066 * 1.18 + 0.001, Math.PI / 2, 0]);
      g.add(fgRivets(riv, 0.006, M.trim));
      [0.2, 0.8].forEach(t => g.add(fgMesh(new THREE.TorusGeometry(0.062 - t * 0.008, 0.008, 4, 20, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), M.leather, 0, -len * t, 0)));
      g.add(fgMesh(new THREE.SphereGeometry(0.068, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(Math.PI / 2), M.metal, 0, 0.01, 0.045));
      g.add(fgMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 16, 1, false, -1.2, 2.4).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.metal, 0.06, 0.01, 0.04));
      g.add(fgMesh(new THREE.TorusGeometry(0.066, 0.008, 6, 20), M.trim, 0, 0.01, 0.05));
      fgHang(A, 'calf_' + s, g, k);
      if (o.cuisses) {
        const t = A.rest['thigh_' + s], tl = t.distanceTo(k), c = new THREE.Group();
        c.add(fgMesh(new THREE.CylinderGeometry(0.085, 0.07, tl * 0.75, 24, 1, true, -Math.PI * 0.55, Math.PI * 1.1), M.metal, 0, -tl * 0.55, 0.0));
        c.add(fgRivets(fgRing(6, 0.085, 0.085, -tl * 0.2, -1.4, 1.4), 0.006, M.trim));
        fgHang(A, 'thigh_' + s, c, t);
      }
    });
  };
  FG.sabatons = (A, o, M) => {
    ['l', 'r'].forEach(s => {
      const f = A.rest['foot_' + s], ball = A.rest['ball_' + s], len = Math.max(0.1, f.distanceTo(ball)), g = new THREE.Group();
      // Overlapping riveted lames from ankle to toe
      for (let i = 0; i < 5; i++) {
        const t = i / 4, w = 0.058 - t * 0.012, z = 0.02 + t * (len + 0.06), y = -0.035 - t * 0.04;
        const lame = new THREE.CylinderGeometry(w, w, 0.07, 18, 1, true, -Math.PI / 2 - 1.2, 2.4).rotateX(Math.PI / 2).scale(1, 0.75, 1);
        g.add(fgMesh(lame, i % 2 ? M.dark : M.metal, 0, y, z));
        g.add(fgRivets([[w * 0.85, y + w * 0.35, z], [-w * 0.85, y + w * 0.35, z]], 0.004, M.trim));
      }
      g.add(fgMesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.metal, 0, 0.0, -0.01));
      fgHang(A, 'foot_' + s, g, f);
    });
  };

  // ---------- Off hand ----------
  // Held in the left fist (calibrated against Idle_Loop, Idle_Shield_Loop and Sword_Idle)
  // Rest pose: the face looks out from the back of the forearm (up in the T-pose), so a relaxed arm turns it outward
  const FG_OFF = { pos: fgV(0.06, 0.04, 0.0), rot: new THREE.Euler(0, 0, 0) };
  function fgOffHand(A, g, o) {
    const s = A.sockets.hand_l; if (!s) return;
    const holder = new THREE.Group(); holder.position.copy(o.at || FG_OFF.pos); holder.rotation.copy(o.rot || FG_OFF.rot);
    holder.add(g); g.traverse(c => { if (c.isMesh) c.castShadow = true; }); s.add(holder);
    A.offhand = holder; return holder;
  }
  FG.roundshield = (A, o, M) => {
    const g = new THREE.Group(), R = o.r || 0.36;
    const face = fgLathe([[0, 0.05], [R * 0.6, 0.04], [R * 0.98, 0.0], [R, -0.02], [R * 0.96, -0.025], [0, -0.01]], 40);
    g.add(fgMesh(face, M.wood));
    for (let i = 0; i < 8; i++) { const plank = fgMesh(new THREE.BoxGeometry(0.004, 0.003, R * 1.9), M.dark, -R + (i + 1) * R * 0.22, 0.045 - Math.abs(-R + (i + 1) * R * 0.22) * 0.05, 0); g.add(plank); }
    g.add(fgMesh(new THREE.TorusGeometry(R * 0.99, 0.018, 8, 48).rotateX(Math.PI / 2), M.metal, 0, -0.005, 0));
    g.add(fgMesh(new THREE.SphereGeometry(R * 0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.metal, 0, 0.045, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(fgMesh(new THREE.SphereGeometry(0.012, 6, 4), M.trim, Math.cos(a) * R * 0.9, 0.0, Math.sin(a) * R * 0.9)); }
    if (o.paint) g.add(fgMesh(new THREE.CircleGeometry(R * 0.55, 3).rotateX(-Math.PI / 2), ckMaterial('leather', { color: o.paint }), 0, 0.047, 0));
    fgOffHand(A, g, o);
  };
  FG.kiteshield = (A, o, M) => {
    const g = new THREE.Group(), W = 0.3, H = 0.78;
    const sh = new THREE.Shape();
    sh.moveTo(0, -H * 0.62); sh.quadraticCurveTo(W * 0.95, -H * 0.15, W, H * 0.3); sh.quadraticCurveTo(W * 0.6, H * 0.4, 0, H * 0.38);
    sh.quadraticCurveTo(-W * 0.6, H * 0.4, -W, H * 0.3); sh.quadraticCurveTo(-W * 0.95, -H * 0.15, 0, -H * 0.62);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 3, curveSegments: 20 });
    // Curve it around the arm
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) * p.getX(i) * 0.9);
    geo.computeVertexNormals();
    const face = fgMesh(geo, ckMaterial('leather', { color: o.paint || '#1e3a6e' })); face.rotation.x = -Math.PI / 2; g.add(face);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sh.getPoints(40).map(v => fgV(v.x, 0.05, -v.y)), true), 80, 0.012, 6, true), M.trim);
    g.add(rim);
    // Device: a pale crescent moon
    const moon = new THREE.Shape(); moon.absarc(0, 0, 0.12, 0, Math.PI * 2, false); const bite = new THREE.Path(); bite.absarc(0.05, 0.03, 0.1, 0, Math.PI * 2, true); moon.holes.push(bite);
    const mm = fgMesh(new THREE.ShapeGeometry(moon, 24), ckMaterial('metal', { color: '#e8e2cf', rough: 0.4 })); mm.rotation.x = -Math.PI / 2; mm.position.set(0, 0.075, -0.05); g.add(mm);
    fgOffHand(A, g, o);
  };
  FG.lantern = (A, o, M) => {
    const g = new THREE.Group();
    g.add(fgMesh(new THREE.TorusGeometry(0.035, 0.006, 6, 16), M.dark, 0, 0, 0));
    const cage = new THREE.Group(); cage.position.y = -0.17;
    cage.add(fgMesh(fgLathe([[0.0, 0.1], [0.055, 0.075], [0.06, 0.06]], 8), M.dark));
    cage.add(fgMesh(fgLathe([[0.06, -0.08], [0.055, -0.095], [0, -0.1]], 8), M.dark));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cage.add(fgMesh(new THREE.BoxGeometry(0.008, 0.14, 0.008), M.dark, Math.cos(a) * 0.055, -0.01, Math.sin(a) * 0.055)); }
    cage.add(fgMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 12), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.55 })));
    const flame = fgMesh(new THREE.SphereGeometry(0.024, 10, 8).scale(1, 1.6, 1), ckMaterial('glow', { color: o.flame || '#ffe0a0' })); cage.add(flame);
    g.add(cage); A.lanternAt = flame;
    fgOffHand(A, g, Object.assign({ at: fgV(0.075, -0.02, 0.0), rot: new THREE.Euler(0, 0, 0) }, o));
  };
  FG.grimoire = (A, o, M) => {
    const g = new THREE.Group(), c = ckMaterial('leather', { color: o.cloth || '#3a1e2e' });
    g.add(fgMesh(new THREE.BoxGeometry(0.17, 0.05, 0.23), c));
    g.add(fgMesh(new THREE.BoxGeometry(0.16, 0.042, 0.215), ckMaterial('leather', { color: '#e6dcc0' }), 0.008, 0, 0));
    [-1, 1].forEach(sd => g.add(fgMesh(new THREE.BoxGeometry(0.03, 0.054, 0.03), M.trim, 0.07, 0, sd * 0.1)));
    g.add(fgMesh(new THREE.OctahedronGeometry(0.022), M.glow, 0, 0.03, 0));
    fgOffHand(A, g, Object.assign({ at: fgV(0.09, -0.05, 0.02), rot: new THREE.Euler(0, 0, -0.3) }, o));
  };

  // ---------- Weapons (built along +Z from the grip) ----------
  const FG_GRIP = { pos: fgV(-0.085, -0.025, 0.0), rot: new THREE.Euler(0, 0, 0) };
  function fgBlade(len, w, curve, M, o) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(-w / 2 + curve * 0.3, len * 0.82); s.quadraticCurveTo(-w * 0.1 + curve, len * 0.97, curve, len);
    s.quadraticCurveTo(w * 0.35 + curve, len * 0.9, w / 2 + curve * 0.5, len * 0.78); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 1, curveSegments: 12 });
    geo.translate(0, 0, -0.003); geo.rotateX(Math.PI / 2); geo.rotateX(Math.PI);
    const g = new THREE.Group(); g.add(fgMesh(geo, M.metal));
    // Fuller and, on better blades, a rune channel
    g.add(fgMesh(new THREE.BoxGeometry(w * 0.16, 0.012, len * 0.7), M.dark, curve * 0.15, 0, len * 0.38));
    if (o.rune) { const r = fgMesh(new THREE.BoxGeometry(w * 0.1, 0.014, len * 0.62), M.glow, curve * 0.15, 0, len * 0.38); g.add(r); g.userData.rune = r; }
    return g;
  }
  function fgWeapon(A, g, o) {
    const s = A.sockets.hand_r; if (!s) return;
    const holder = new THREE.Group(); holder.position.copy(FG_GRIP.pos); holder.rotation.copy(FG_GRIP.rot);
    holder.add(g); g.traverse(c => { if (c.isMesh) c.castShadow = true; }); s.add(holder);
    A.weapon = holder; A.weaponMats = []; g.traverse(c => { if (c.isMesh && c.material.userData.kind === 'metal') A.weaponMats.push(c.material); });
    A.weaponReach = o.reach || 1;
  }
  FG.axe = (A, o, M) => {
    const g = new THREE.Group(), L = o.len || 0.75;
    g.add(fgMesh(new THREE.CylinderGeometry(0.017, 0.02, L, 10).rotateX(Math.PI / 2), M.wood, 0, 0, L * 0.35));
    g.add(fgMesh(new THREE.CylinderGeometry(0.021, 0.021, 0.12, 10).rotateX(Math.PI / 2), M.leather, 0, 0, -0.02));
    // A bearded head: the edge hooks down toward the hand
    const s = new THREE.Shape();
    s.moveTo(0, 0.04); s.lineTo(0.06, 0.05); s.quadraticCurveTo(0.12, 0.1, 0.2, 0.13); s.quadraticCurveTo(0.24, 0.0, 0.2, -0.17);
    s.quadraticCurveTo(0.12, -0.12, 0.07, -0.04); s.lineTo(0, -0.03); s.lineTo(0, 0.04);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 14 });
    geo.translate(0, 0, -0.007); geo.rotateY(Math.PI / 2);
    const head = fgMesh(geo, M.metal, 0, 0, L * 0.78); head.rotation.x = Math.PI / 2; g.add(head);
    g.add(fgMesh(new THREE.BoxGeometry(0.035, 0.04, 0.075), M.dark, 0, 0, L * 0.78));
    fgWeapon(A, g, o);
  };
  FG.hammer = (A, o, M) => {
    const g = new THREE.Group(), L = o.len || 0.8;
    g.add(fgMesh(new THREE.CylinderGeometry(0.018, 0.02, L, 10).rotateX(Math.PI / 2), M.wood, 0, 0, L * 0.35));
    g.add(fgMesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), M.metal, 0, 0, L * 0.8).rotateX(0));
    g.add(fgMesh(new THREE.BoxGeometry(0.11, 0.11, 0.03), M.trim, 0, 0, L * 0.8 + 0.1));
    g.add(fgMesh(new THREE.BoxGeometry(0.11, 0.11, 0.03), M.trim, 0, 0, L * 0.8 - 0.1));
    g.add(fgMesh(new THREE.ConeGeometry(0.03, 0.12, 6).rotateX(Math.PI / 2), M.metal, 0, 0, L * 0.8 + 0.17));
    fgWeapon(A, g, o);
  };
  FG.spear = (A, o, M) => {
    const g = new THREE.Group(), L = o.len || 1.7;
    g.add(fgMesh(new THREE.CylinderGeometry(0.016, 0.018, L, 10).rotateX(Math.PI / 2), M.wood, 0, 0, L * 0.3));
    const head = fgBlade(0.26, 0.06, 0, M, o); head.position.z = L * 0.8; g.add(head);
    g.add(fgMesh(new THREE.CylinderGeometry(0.022, 0.018, 0.06, 10).rotateX(Math.PI / 2), M.trim, 0, 0, L * 0.79));
    g.add(fgMesh(new THREE.ConeGeometry(0.02, 0.08, 8).rotateX(-Math.PI / 2), M.dark, 0, 0, -L * 0.2 - 0.04));
    fgWeapon(A, g, o);
  };
  FG.staff = (A, o, M) => {
    const g = new THREE.Group(), L = o.len || 1.6;
    // A crooked branch with thorns, holding a captured light
    const pts = []; for (let i = 0; i <= 8; i++) pts.push(fgV(Math.sin(i * 1.7) * 0.02, Math.cos(i * 2.3) * 0.015, -L * 0.25 + i / 8 * L));
    const top = pts[8]; pts.push(fgV(top.x + 0.06, 0.02, top.z + 0.08), fgV(top.x + 0.02, 0.0, top.z + 0.16), fgV(top.x - 0.05, -0.01, top.z + 0.12));
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.02, 8, false);
    g.add(new THREE.Mesh(tube, M.wood));
    for (let i = 0; i < 9; i++) { const t = pts[1 + Math.floor(i * 0.8)]; const th = fgMesh(new THREE.ConeGeometry(0.008, 0.05, 5), M.wood, t.x, t.y, t.z); th.rotation.set(Math.random() * 3, 0, Math.random() * 6); g.add(th); }
    const orb = fgMesh(new THREE.SphereGeometry(0.045, 16, 12), M.glow, top.x + 0.01, 0.005, top.z + 0.1); g.add(orb);
    g.add(new THREE.PointLight(ckHex(o.glow || '#9fe0ff'), 0.6, 2.5, 2)).position.copy(orb.position);
    fgWeapon(A, g, o);
  };

  // ---------- Modelled swords (assets/character/weapons/<model>.glb, see tools/character/build_weapons.mjs) ----------
  // Each file is baked with the grip at the origin and the blade along +Z, so it drops straight into the hand.
  // Loaded once on first use and cloned; the hand holds an empty group until it arrives.
  const FG_MODELS = {};
  function fgModelLoad(id) {
    if (FG_MODELS[id]) return FG_MODELS[id];
    const url = CK.urls && CK.urls['weapons/' + id];
    if (!url || !THREE.GLTFLoader) return Promise.reject(new Error('no weapon model ' + id));
    return (FG_MODELS[id] = new Promise((ok, no) => new THREE.GLTFLoader().load(url, g => {
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const m = o.material;
        // Match the rest of the hero: linear colour textures, the stage's reflections, a flash-able metal tag
        ['map', 'emissiveMap'].forEach(k => { if (m[k]) { m[k].encoding = THREE.LinearEncoding; m[k].needsUpdate = true; } });
        if (CK.env) { m.envMap = CK.env; m.envMapIntensity = 0.9; }
        m.userData.kind = 'metal'; m.userData.base = m.color.clone(); m.needsUpdate = true;
        o.castShadow = true;
      });
      ok(g.scene);
    }, undefined, no)));
  }
  FG.model = (A, o) => {
    const g = new THREE.Group(); g.name = 'weapon:' + o.model;
    fgWeapon(A, g, o);
    fgModelLoad(o.model).then(src => {
      const c = src.clone(true);
      c.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.userData = { kind: 'metal', base: n.material.color.clone() }; A.mats.push(n.material); (A.weaponMats = A.weaponMats || []).push(n.material); } });
      g.add(c);
      if (A.onAsync) A.onAsync();
    }).catch(e => console.warn('gear forge:', e.message));
  };

  // ---------- Modelled armour (assets/character/armor/<model>.glb, prepared in Blender) ----------
  // Each file faces +Z with +Y up, centred on its bounding box, 1 unit wide. "fit" says what to size it against:
  //   head: width = head width x size, centred on the skull (+ offset in head widths), on the Head bone
  //   chest: width = chest width x size, centred on the ribcage, on spine_03
  //   shield: width = size metres, in the off hand with its face outward
  const FG_PIECES = {};
  function fgPieceLoad(id) {
    if (FG_PIECES[id]) return FG_PIECES[id];
    const url = CK.urls && CK.urls['armor/' + id];
    if (!url || !THREE.GLTFLoader) return Promise.reject(new Error('no armour model ' + id));
    return (FG_PIECES[id] = new Promise((ok, no) => new THREE.GLTFLoader().load(url, g => {
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const m = o.material;
        ['map', 'emissiveMap'].forEach(k => { if (m[k]) { m[k].encoding = THREE.LinearEncoding; m[k].needsUpdate = true; } });
        // Pure metal reads black under a dark sky; keep some diffuse so the lantern and the moon light it
        m.metalness = Math.min(m.metalness === undefined ? 1 : m.metalness, 0.7); m.roughness = Math.max(m.roughness === undefined ? 0.5 : m.roughness, 0.32);
        m.side = THREE.DoubleSide; o.castShadow = true; o.receiveShadow = true;
      });
      ok(g.scene);
    }, undefined, no)));
  }
  FG.piece = (A, o) => {
    const g = new THREE.Group(); g.name = 'piece:' + o.model;
    const size = o.size || 1, off = o.offset || [0, 0, 0];
    if (o.fit === 'shield') { g.scale.setScalar(size); fgOffHand(A, g, o); }
    else if (o.fit === 'chest') {
      const T = fgTorso(A), w = T.w * size;
      g.scale.setScalar(w);
      fgHang(A, 'spine_03', g, fgV(T.c.x + off[0] * w, (T.top + T.bot) / 2 + (T.top - T.bot) * 0.12 + off[1] * w, T.c.z + off[2] * w));
    } else {
      const h = fgHead(A), w = h.r * 2 * size;
      g.scale.setScalar(w);
      fgHang(A, 'Head', g, h.c.clone().add(fgV(off[0] * w, off[1] * w, off[2] * w)));
    }
    fgPieceLoad(o.model).then(src => {
      const c = src.clone(true);
      c.traverse(n => {
        if (!n.isMesh) return;
        n.material = n.material.clone();
        if (CK.env) { n.material.envMap = CK.env; n.material.envMapIntensity = 1.2; }
        n.material.userData = { kind: 'metal', base: n.material.color.clone() }; A.mats.push(n.material);
      });
      g.add(c);
      if (A.onAsync) A.onAsync();
    }).catch(e => console.warn('gear forge:', e.message));
  };

  // ---------- Entry point (called by the avatar for each equipped item) ----------
  function forgeGear(A, item) {
    const lk = item.look || {};
    (lk.forge || []).forEach(o => {
      const f = FG[o.shape]; if (!f) { console.warn('gear forge: no shape', o.shape); return; }
      const M = fgMats(o);
      Object.values(M).forEach(m => A.mats.push(m));
      f(A, o, M);
    });
    if (lk.cloth && typeof clothFor === 'function') [].concat(lk.cloth).forEach(c => A.cloth.push(clothFor(A, c)));
  }
