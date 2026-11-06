  // ---------- Character kit: build a hero from a look and gear (assets/character/, CC0 Quaternius base) ----------
  // Needs only THREE and the glTF loader, so tools/character-lab can load it on its own.
  //   ckLoad(assets)           fetches the loader, kit.glb and anims.glb once (textures load as they are first used)
  //   ckAvatar(look, gear)     a new hero: { root, bones, mixer, play(), update(), setLook(), setGear(), dispose() }
  // Every mesh in the kit is skinned to the same 65-bone rig, so any part rebinds onto one shared skeleton.
  // The bare body is cut into regions (head, torso, arms, hands, hips, legs, feet); gear hides what it covers.
  // Skin, hair and stubble textures are tint maps (average colour 0.5), so material colour x 2 is the real colour.
  const CK = { kit: null, clips: {}, tex: {}, urls: null, loading: null, regions: {}, gear: [] };
  // The neck is its own region so a helmet can hide the head without leaving a gap above the collar
  const CK_REGIONS = ['Head', 'Neck', 'Torso', 'Arms', 'Hands', 'Hips', 'Legs', 'Feet'];
  // Options the builder offers (content/character/looks.json) and every piece of gear (content/character/gear.json)
  const CK_LOOKS = (window.MM_CONTENT && window.MM_CONTENT.character && window.MM_CONTENT.character.looks) || { hair: [], brows: [], skin: [], hairColors: [], eyes: [], presets: [] };
  const CK_GEAR = (window.MM_CONTENT && window.MM_CONTENT.character && window.MM_CONTENT.character.gear) || { slots: [], items: [] };
  const ckHex = v => typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v;

  function ckLoad(assets) {
    if (CK.loading) return CK.loading;
    const A = assets || window.MM_ASSETS || {};
    CK.urls = A.character || {};
    const loader = () => THREE.GLTFLoader ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = A.gltfLoader; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
    const glb = url => new Promise((ok, no) => new THREE.GLTFLoader().load(url, ok, undefined, no));
    CK.loading = loader().then(() => Promise.all([glb(CK.urls.kit), glb(CK.urls.anims)])).then(([kit, anims]) => {
      CK.kit = kit.scene; CK.kit.updateMatrixWorld(true);
      // The loader makes repeated node names unique ("Head", "Head_1", ...): every part file and both animation
      // libraries carry their own copy of the rig. Map those back to the real bone names.
      // The first armature in the file (the masculine body's) keeps the real names.
      const names = new Set(); kit.scene.getObjectByName('M_Body_Head').parent.traverse(o => { if (o.isBone) names.add(o.name); });
      const canon = n => names.has(n) ? n : n.replace(/_\d+$/, '');
      CK.canon = canon;
      kit.scene.traverse(o => { if (o.isBone) o.name = canon(o.name); });
      anims.animations.forEach(c => { c.tracks.forEach(t => { const i = t.name.lastIndexOf('.'); t.name = canon(t.name.slice(0, i)) + t.name.slice(i); }); CK.clips[c.name] = c; });
      return CK;
    });
    return CK.loading;
  }
  const ckMesh = name => CK.kit && CK.kit.getObjectByName(name);
  // Outfits: skinned armour sets rigged onto the kit's bone names in Blender (assets/character/outfits/<id>.glb).
  // Loaded on first use; an avatar wearing one rebuilds when it arrives.
  const CK_OUTFITS = {}, CK_CUTS = new Map();
  // Keep the triangles whose three corners lie below y (the geometry's own space); cached per geometry and height
  function ckCutBelow(geo, y) {
    const key = geo.uuid + ':' + y; if (CK_CUTS.has(key)) return CK_CUTS.get(key);
    const g = geo.clone(), p = g.attributes.position, ix = g.index ? g.index.array : null, out = [];
    const n = ix ? ix.length : p.count;
    for (let t = 0; t < n; t += 3) {
      const a = ix ? ix[t] : t, b = ix ? ix[t + 1] : t + 1, c = ix ? ix[t + 2] : t + 2;
      if (p.getY(a) < y && p.getY(b) < y && p.getY(c) < y) out.push(a, b, c);
    }
    g.setIndex(out); CK_CUTS.set(key, g); return g;
  }
  function ckOutfit(id) {
    if (CK_OUTFITS[id]) return CK_OUTFITS[id];
    const o = CK_OUTFITS[id] = { scene: null };
    const url = CK.urls && CK.urls['outfits/' + id];
    o.promise = !url ? Promise.reject(new Error('no outfit ' + id)) : new Promise((ok, no) => new THREE.GLTFLoader().load(url, g => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(n => {
        if (!n.isMesh) return;
        ['map', 'emissiveMap'].forEach(k => { if (n.material[k]) { n.material[k].encoding = THREE.LinearEncoding; n.material[k].needsUpdate = true; } });
      });
      o.scene = g.scene; ok(o);
    }, undefined, no));
    o.promise.catch(e => console.warn('character kit:', e.message));
    return o;
  }
  function ckTexture(name) {
    if (!name) return null;
    if (CK.tex[name]) return CK.tex[name];
    const url = CK.urls['tex/' + name]; if (!url) return null;
    const t = new THREE.TextureLoader().load(url);
    t.flipY = false; t.encoding = THREE.LinearEncoding; t.anisotropy = 4;
    return (CK.tex[name] = t);
  }

  // ---------- Surfaces: small generated textures that give forged gear its grain ----------
  // Grey maps used as bump and roughness: brushed and hammered metal, leather grain, a cloth weave, quilting.
  // Made once on first use (256 px canvases, nothing downloaded).
  const CK_SURF = {};
  function ckSurface(kind) {
    if (CK_SURF[kind]) return CK_SURF[kind];
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
    if (kind === 'brushed') {
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${rnd(0.03, 0.12)})`; x.fillRect(rnd(-40, N), rnd(0, N), rnd(30, 160), 1); }
      for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(255,255,255,${rnd(0.15, 0.4)})`; x.lineWidth = 0.7; x.beginPath(); const a = rnd(0, N), b = rnd(0, N); x.moveTo(a, b); x.lineTo(a + rnd(-30, 30), b + rnd(-12, 12)); x.stroke(); }
    } else if (kind === 'hammered') {
      for (let i = 0; i < 260; i++) { const px = rnd(0, N), py = rnd(0, N), r = rnd(4, 14), g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.7, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
      for (let i = 0; i < 30; i++) { x.strokeStyle = `rgba(0,0,0,${rnd(0.2, 0.45)})`; x.lineWidth = rnd(0.5, 1.2); x.beginPath(); const a = rnd(0, N), b = rnd(0, N); x.moveTo(a, b); x.lineTo(a + rnd(-25, 25), b + rnd(-25, 25)); x.stroke(); }
    } else if (kind === 'leather') {
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${rnd(0.05, 0.2)})`; x.beginPath(); x.ellipse(rnd(0, N), rnd(0, N), rnd(1, 3.5), rnd(0.6, 2), rnd(0, 3), 0, 7); x.fill(); }
      for (let i = 0; i < 25; i++) { x.strokeStyle = `rgba(0,0,0,${rnd(0.15, 0.3)})`; x.lineWidth = rnd(0.6, 1.4); x.beginPath(); x.moveTo(rnd(0, N), rnd(0, N)); x.bezierCurveTo(rnd(0, N), rnd(0, N), rnd(0, N), rnd(0, N), rnd(0, N), rnd(0, N)); x.stroke(); }
    } else if (kind === 'weave') {
      for (let y = 0; y < N; y += 2) { x.fillStyle = `rgba(0,0,0,${0.08 + 0.05 * Math.random()})`; x.fillRect(0, y, N, 1); }
      for (let xx = 0; xx < N; xx += 2) { x.fillStyle = `rgba(255,255,255,${0.04 + 0.05 * Math.random()})`; x.fillRect(xx, 0, 1, N); }
    } else if (kind === 'quilt') {
      x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3;
      for (let i = -N; i < N * 2; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + N, N); x.stroke(); x.beginPath(); x.moveTo(i, N); x.lineTo(i + N, 0); x.stroke(); }
      for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.02, 0.06)})`; x.fillRect(rnd(0, N), rnd(0, N), 2, 1); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 4;
    return (CK_SURF[kind] = t);
  }

  // ---------- Materials ----------
  // kind: skin | hair | eye | cloth | metal | leather | glow. Colour x 2 on tint maps (see above).
  function ckMaterial(kind, o) {
    o = o || {};
    const col = new THREE.Color(ckHex(o.color === undefined ? 0xffffff : o.color));
    const P = { skinning: !!o.skinned, color: col };
    if (kind === 'skin') Object.assign(P, { map: ckTexture(o.map), normalMap: ckTexture(o.map + '_n'), roughness: 0.58, metalness: 0, color: col.multiplyScalar(1.8) });
    else if (kind === 'hair') Object.assign(P, { map: ckTexture(o.map || 'hair_1'), roughness: 0.55, metalness: 0, side: THREE.DoubleSide, color: col.multiplyScalar(2) });
    else if (kind === 'stubble') Object.assign(P, { map: ckTexture('hair_1'), roughness: 0.8, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false, color: col.multiplyScalar(2) });
    else if (kind === 'eye') Object.assign(P, { map: ckTexture(o.map), roughness: 0.15, metalness: 0 });
    else if (kind === 'cloth') Object.assign(P, { map: ckTexture(o.map), normalMap: o.map ? ckTexture(o.map.replace(/_[ab]$/, '') + '_n') : null, roughness: 0.85, metalness: 0, side: o.side || THREE.FrontSide });
    else if (kind === 'metal') { const sf = ckSurface(o.surface || 'brushed'); Object.assign(P, { roughness: o.rough === undefined ? 0.36 : o.rough, metalness: 0.85, bumpMap: sf, bumpScale: 0.012, roughnessMap: sf }); }
    else if (kind === 'leather') { const sf = ckSurface(o.surface || 'leather'); Object.assign(P, { roughness: 0.74, metalness: 0.04, bumpMap: sf, bumpScale: 0.02, roughnessMap: sf }); }
    else if (kind === 'glow') return new THREE.MeshBasicMaterial({ color: col, skinning: !!o.skinned, toneMapped: false });
    if (o.side) P.side = o.side;
    const m = new THREE.MeshStandardMaterial(P);
    m.userData.kind = kind; m.userData.base = m.color.clone();
    if (CK.env && kind !== 'eye') { m.envMap = CK.env; m.envMapIntensity = kind === 'metal' ? 1.0 : 0.35; }
    return m;
  }

  // ---------- Beards: one kit beard, cut and shaped into styles ----------
  // Works in the beard's own bind space: forward is from the head's centre to the eyes, up is +Y in the kit.
  const CK_BEARDS = ['none', 'stubble', 'short', 'full', 'long', 'forked', 'goatee', 'moustache', 'chops'];
  function ckBeardGeometry(style, gender) {
    const key = `beard:${style}:${gender}`;
    if (CK.tex[key]) return CK.tex[key];
    const src = ckMesh('Hair_Beard'); if (!src || style === 'none') return null;
    const g = src.geometry.clone(), pos = g.attributes.position, idx = g.index.array;
    g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
    // Face direction: the eyes sit in front of the head centre
    const fwd = ckFaceForward(gender);
    const side = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
    const v = new THREE.Vector3(), mouthY = bb.min.y + sz.y * 0.62;
    const rel = i => { v.fromBufferAttribute(pos, i); return { x: v.clone().sub(c).dot(side) / (sz.x * 0.5 || 1), y: (v.y - bb.min.y) / (sz.y || 1), f: v.clone().sub(c).dot(fwd) }; };
    // Keep triangles whose three corners pass the test
    const keep = test => {
      const out = [];
      for (let t = 0; t < idx.length; t += 3) { if ([0, 1, 2].every(k => test(rel(idx[t + k])))) out.push(idx[t], idx[t + 1], idx[t + 2]); }
      g.setIndex(out);
    };
    if (style === 'goatee') keep(p => Math.abs(p.x) < 0.42 && p.f > -sz.z * 0.1);
    if (style === 'moustache') keep(p => Math.abs(p.x) < 0.62 && p.y > 0.5 && p.y < 0.82 && p.f > 0);
    if (style === 'chops') keep(p => Math.abs(p.x) > 0.5 || (p.y > 0.55 && p.y < 0.8 && Math.abs(p.x) < 0.65 && p.f > 0));
    // Reshape: pull the hair toward or away from the chin
    const chin = new THREE.Vector3(c.x, bb.min.y, c.z).addScaledVector(fwd, sz.z * 0.15);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const p = rel(i), below = Math.max(0, (mouthY - v.y) / (mouthY - bb.min.y));
      if (style === 'stubble' || style === 'short') {
        // Toward the skin: shrink the beard's thickness around a point inside the jaw
        const core = new THREE.Vector3(c.x, Math.max(v.y, bb.min.y + sz.y * 0.25), c.z).addScaledVector(fwd, -sz.z * 0.25);
        v.lerp(core, style === 'stubble' ? 0.16 : 0.08 * (0.4 + below));
        if (style === 'short') v.y += below * sz.y * 0.08;
      } else if (style === 'long' || style === 'forked') {
        const drop = below * below * sz.y * 1.1;
        v.y -= drop; v.addScaledVector(fwd, drop * 0.18);
        const pinch = 1 - below * 0.45;
        v.addScaledVector(side, (v.clone().sub(c).dot(side)) * (pinch - 1));
        if (style === 'forked' && below > 0.35) v.addScaledVector(side, Math.sign(p.x || 1) * (below - 0.35) * sz.x * 0.25);
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return (CK.tex[key] = g);
  }
  function ckFaceForward(gender) {
    const eyes = ckMesh(gender === 'f' ? 'F_Eyes' : 'M_Eyes'), head = ckMesh(gender === 'f' ? 'F_Body_Head' : 'M_Body_Head');
    if (!eyes || !head) return new THREE.Vector3(0, 0, 1);
    eyes.geometry.computeBoundingBox(); head.geometry.computeBoundingBox();
    const f = eyes.geometry.boundingBox.getCenter(new THREE.Vector3()).sub(head.geometry.boundingBox.getCenter(new THREE.Vector3()));
    f.y = 0; return f.lengthSq() ? f.normalize() : new THREE.Vector3(0, 0, 1);
  }

  // ---------- Body shape: bone scales, with the children counter-scaled so limbs keep their size ----------
  // Values are 0..1 sliders around 0.5. Height is a whole-body scale; the rest change girth only.
  const CK_SHAPE = {
    build: [['spine_01', 'yz'], ['spine_02', 'yz'], ['spine_03', 'yz'], ['pelvis', 'yz']],
    shoulders: [['clavicle_l', 'x'], ['clavicle_r', 'x'], ['spine_03', 'z']],
    arms: [['upperarm_l', 'yz'], ['upperarm_r', 'yz'], ['lowerarm_l', 'yz'], ['lowerarm_r', 'yz']],
    legs: [['thigh_l', 'yz'], ['thigh_r', 'yz'], ['calf_l', 'yz'], ['calf_r', 'yz']],
    head: [['Head', 'xyz']]
  };
  const CK_SHAPE_RANGE = { build: 0.28, shoulders: 0.22, arms: 0.35, legs: 0.3, head: 0.14 };

  // ---------- The avatar ----------
  function ckAvatar(look, gear) {
    const A = { waiting: new Set(), disposed: false, root: new THREE.Group(), parts: [], bones: {}, sockets: {}, mixer: null, cur: null, curName: '', look: null, gear: null, cloth: [], mats: [] };
    A.root.name = 'hero-avatar';
    A.inner = new THREE.Group(); A.root.add(A.inner);

    // Master skeleton: a copy of the kit's armature for the chosen body
    function rig(gender) {
      if (A.arm) { A.inner.remove(A.arm); }
      const src = ckMesh(gender === 'f' ? 'F_Body_Head' : 'M_Body_Head'), arm = src.parent;
      A.arm = new THREE.Object3D(); A.arm.position.copy(arm.position); A.arm.quaternion.copy(arm.quaternion); A.arm.scale.copy(arm.scale);
      const copy = (b, parent) => {
        const n = new THREE.Bone(); n.name = b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale);
        parent.add(n); A.bones[b.name] = n; n.userData.rest = n.position.clone();
        b.children.forEach(c => { if (c.isBone) copy(c, n); });
      };
      A.bones = {};
      arm.children.forEach(c => { if (c.isBone) copy(c, A.arm); });
      A.inner.add(A.arm);
      A.inner.scale.set(1, 1, 1); A.inner.updateMatrixWorld(true);
      // Rest positions of the bones in avatar space, for fitting gear
      const iw = new THREE.Matrix4().copy(A.inner.matrixWorld).invert();
      A.rest = {}; Object.values(A.bones).forEach(b => { A.rest[b.name] = b.getWorldPosition(new THREE.Vector3()).applyMatrix4(iw); });
      // Sockets: children of a bone whose axes match the avatar's (Y up, Z forward) in the rest pose, so gear is
      // modelled upright and simply follows the bone when it moves
      const inv = new THREE.Quaternion(), rq = new THREE.Quaternion();
      A.inner.getWorldQuaternion(rq);
      A.sockets = {};
      ['Head', 'neck_01', 'spine_03', 'spine_02', 'spine_01', 'pelvis', 'hand_r', 'hand_l', 'lowerarm_l', 'lowerarm_r', 'upperarm_l', 'upperarm_r',
        'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'clavicle_l', 'clavicle_r'].forEach(n => {
        const b = A.bones[n]; if (!b) return;
        const s = new THREE.Object3D(); s.name = 'socket:' + n;
        b.getWorldQuaternion(inv); s.quaternion.copy(inv.invert().multiply(rq));
        b.add(s); A.sockets[n] = s;
      });
      A.inner.updateMatrixWorld(true);
      A.mixer = new THREE.AnimationMixer(A.inner); A.actions = {}; A.cur = null; A.curName = '';
    }

    // A kit part may load as one skinned mesh or, with two materials, as a group of them. Primitives cut from
    // the bare body's material (MI_Regular_*, MI_Superhero_*) get this hero's skin instead of mat.
    function part(name, mat, geometry, skin, srcObj) {
      const src = srcObj || ckMesh(name); if (!src) return null;
      const list = src.isSkinnedMesh ? [src] : src.children.filter(c => c.isSkinnedMesh);
      const out = [];
      list.forEach(sm => {
        const isSkin = skin && /^MI_(Regular|Superhero)/.test(sm.material && sm.material.name || '');
        // An outfit keeps its own (textured) material, cloned so flashes and stone don't touch the shared one
        let useMat = isSkin ? skin : mat;
        if (mat === 'own') { useMat = sm.material.clone(); useMat.skinning = true; useMat.metalness = Math.min(useMat.metalness, 0.65); useMat.roughness = Math.max(useMat.roughness, 0.35); if (CK.env) { useMat.envMap = CK.env; useMat.envMapIntensity = 0.6; } useMat.userData = { kind: 'cloth', base: useMat.color.clone() }; A.mats.push(useMat); }
        const m = new THREE.SkinnedMesh(geometry || sm.geometry, useMat);
        m.name = name; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
        // World transform of the kit mesh, so it sits where it was bound
        sm.updateWorldMatrix(true, false); sm.matrixWorld.decompose(m.position, m.quaternion, m.scale);
        A.arm.add(m);
        m.bind(new THREE.Skeleton(sm.skeleton.bones.map(b => A.bones[CK.canon(b.name)] || A.bones[b.name]), sm.skeleton.boneInverses), sm.bindMatrix);
        A.parts.push(m); out.push(m);
      });
      return out[0] || null;
    }
    function clearParts() {
      A.parts.forEach(m => { m.parent && m.parent.remove(m); if (m.material && m.material.dispose) m.material.dispose(); });
      A.parts = []; A.mats = [];
      Object.values(A.sockets).forEach(s => { while (s.children.length) s.remove(s.children[0]); });
      A.cloth.forEach(c => c.dispose()); A.cloth = [];
    }

    // Region boxes in avatar space (rest pose), so procedural gear fits whichever body is worn
    function regions(gender) {
      const key = gender;
      if (CK.regions[key]) return CK.regions[key];
      const out = {}, v = new THREE.Vector3();
      CK_REGIONS.forEach(r => {
        const src = ckMesh(`${gender === 'f' ? 'F' : 'M'}_Body_${r}`); if (!src) return;
        const bb = new THREE.Box3(), p = src.geometry.attributes.position;
        const ix = src.geometry.index.array; for (let k = 0; k < ix.length; k++) { v.fromBufferAttribute(p, ix[k]).applyMatrix4(src.bindMatrix); bb.expandByPoint(v); }
        out[r.toLowerCase()] = bb;
      });
      return (CK.regions[key] = out);
    }

    function build() {
      const L = A.look, g = L.body === 'f' ? 'f' : 'm', G = g.toUpperCase();
      if (!A.arm || A.gender !== g) { const was = A.curName; rig(g); A.gender = g; if (was) A.play(was); }
      clearParts();
      A.regions = regions(g);
      const items = Object.values(A.gear || {}).filter(Boolean);
      // A coat that has its own skirt (look.ownSkirt) switches off cloth skirts from the rest of the gear
      A.noClothSkirt = items.some(it => it.look && it.look.ownSkirt);
      // How far the thickest worn piece stands off the body (look.bulk, metres): capes and colliders move out by it
      A.bulk = items.reduce((m, it) => Math.max(m, (it.look && it.look.bulk) || 0), 0);
      const hides = new Set(), hideHair = items.some(it => it.look && it.look.hideHair), hideBeard = items.some(it => it.look && it.look.hideBeard);
      // A coat with its own sleeves (look.ownSleeves) overrules sleeved arm gear: those kit sleeves are not drawn
      // and don't hide the arms or hands, so the coat's sleeves show with the hero's own hands
      const sleeves = items.find(it => it.look && it.look.ownSleeves);
      const sleeveMesh = ref => /_Arms/.test(typeof ref === 'object' ? ref.m || '' : ref);
      const yields = it => sleeves && it !== sleeves && it.slot === 'hands' && ((it.look && it.look.meshes) || []).some(sleeveMesh);
      items.forEach(it => { if (!yields(it)) ((it.look && it.look.hides) || []).forEach(h => hides.add(h)); });
      const skinTone = L.skin || '#c69c7b';
      const skinMat = ckMaterial('skin', { map: 'skin_' + g, color: skinTone, skinned: true });
      const regMat = ckMaterial('skin', { map: 'reg_' + g, color: skinTone, skinned: true });
      A.mats.push(skinMat, regMat);
      CK_REGIONS.forEach(r => { if (!hides.has(r.toLowerCase())) part(`${G}_Body_${r}`, skinMat); });
      const eye = ckMaterial('eye', { map: 'eye_' + (L.eyes || 'brown'), skinned: true }); A.mats.push(eye);
      part(`${G}_Eyes`, eye);
      const hairCol = L.hairColor || '#3a2416';
      const brow = (CK_LOOKS.brows.find(b => b.id === L.brows) || {}).mesh;
      // A helmet that hides the hair hides the brows too (they'd poke through a close visor)
      if (brow && !hideHair) { const m = ckMaterial('hair', { map: 'hair_' + (g === 'f' ? 2 : 1), color: L.browColor || hairCol, skinned: true }); A.mats.push(m); part(brow, m); }
      const hair = (CK_LOOKS.hair.find(h => h.id === L.hair) || {}).mesh;
      if (hair && !hideHair) { const m = ckMaterial('hair', { map: 'hair_' + (g === 'f' ? 2 : 1), color: hairCol, skinned: true }); A.mats.push(m); part(hair, m); }
      const beard = ckBeardGeometry(L.beard || 'none', g);
      if (beard && !hideBeard) {
        const m = ckMaterial(L.beard === 'stubble' ? 'stubble' : 'hair', { color: L.beardColor || hairCol, skinned: true }); A.mats.push(m); part('Hair_Beard', m, beard);
      }
      // Gear: kit meshes (gender resolved), then forged pieces and cloth from 09f and 09g
      items.forEach(it => {
        const lk = it.look || {};
        (lk.meshes || []).forEach(ref => {
          if (yields(it) && sleeveMesh(ref)) return;
          const name = typeof ref === 'object' ? ref[g] : ref.replace('*', G);
          const m = ckMaterial('cloth', { map: lk.tex, color: lk.tint || 0xffffff, skinned: true }); A.mats.push(m);
          part(name, m, null, regMat);
        });
        if (lk.outfit) {
          const o = ckOutfit(lk.outfit);
          // A part is a mesh name, or { name, below } to keep only what lies below a height (outfit units),
          // e.g. a hood's shoulder cape without its face mask
          if (o.scene) (lk.parts || []).forEach(ref => {
            const n = typeof ref === 'string' ? ref : ref.name, src = o.scene.getObjectByName(n); if (!src) return;
            const sm = src.isSkinnedMesh ? src : src.children.find(c => c.isSkinnedMesh);
            part(n, 'own', ref.below !== undefined && sm ? ckCutBelow(sm.geometry, ref.below) : null, null, src);
          });
          // Every avatar waiting on the file rebuilds when it lands (the builder's preview and the hero both can be)
          else if (!A.waiting.has(lk.outfit)) { A.waiting.add(lk.outfit); o.promise.then(() => { A.waiting.delete(lk.outfit); if (!A.disposed) { build(); if (A.onAsync) A.onAsync(); } }, () => {}); }
        }
        if (typeof forgeGear === 'function') forgeGear(A, it);
      });
      applyShape();
      A.inner.updateMatrixWorld(true);
    }

    function applyShape() {
      const L = A.look, sh = L.shape || {};
      // What size each shaped bone should end up (not its local scale): bones inherit their parent's scale, so a
      // chain like pelvis > spine_01 > spine_02 > spine_03 would otherwise compound (1.2 each became 2x at the chest)
      const want = {};
      Object.entries(CK_SHAPE).forEach(([k, list]) => {
        const s = 1 + ((sh[k] === undefined ? 0.5 : sh[k]) - 0.5) * 2 * CK_SHAPE_RANGE[k];
        list.forEach(([bn, axes]) => {
          const w = want[bn] || (want[bn] = new THREE.Vector3(1, 1, 1));
          ['x', 'y', 'z'].forEach(a => { if (axes.includes(a)) w[a] *= s; });
        });
      });
      // Walk the rig: each bone's local scale is what it wants divided by what it already inherits
      const one = new THREE.Vector3(1, 1, 1);
      (function walk(b, inherited) {
        const w = want[b.name] || one;
        b.scale.set(w.x / inherited.x, w.y / inherited.y, w.z / inherited.z);
        b.children.forEach(c => { if (c.isBone) walk(c, w); });
      })(A.bones.root || Object.values(A.bones)[0], one);
      const h = 1 + ((sh.height === undefined ? 0.5 : sh.height) - 0.5) * 0.16;
      A.inner.scale.setScalar(h * (L.body === 'f' ? 1 : 1));
    }

    // ---------- Animation ----------
    A.play = function (name, o) {
      o = o || {};
      const clip = CK.clips[name]; if (!clip) return;
      let act = A.actions[name];
      if (!act) act = A.actions[name] = A.mixer.clipAction(clip);
      if (act === A.cur && !o.restart) { if (o.dur) act.timeScale = clip.duration * (o.span || 1) / o.dur; return; }
      act.reset(); act.enabled = true; act.setEffectiveWeight(1);
      if (o.once) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; } else act.setLoop(THREE.LoopRepeat, Infinity);
      act.timeScale = o.dur ? clip.duration * (o.span || 1) / o.dur : (o.speed || 1);
      if (o.from) act.time = clip.duration * o.from;
      if (A.cur && A.cur !== act) act.crossFadeFrom(A.cur, o.fade === undefined ? 0.12 : o.fade, false);
      act.play(); A.cur = act; A.curName = name;
    };
    A.update = function (dt, ext) {
      if (A.mixer) A.mixer.update(dt);
      // Keep the hips over the feet: clips move the pelvis, and the game moves the hero
      A.inner.updateMatrixWorld(true);
      A.cloth.forEach(c => c.update(dt, ext));
    };
    A.setLook = function (look) { A.look = JSON.parse(JSON.stringify(look)); build(); };
    A.setGear = function (gear) { A.gear = Object.assign({}, gear); build(); };
    A.setShape = function (shape) { A.look.shape = Object.assign({}, shape); applyShape(); };
    A.handSocket = side => A.sockets[side === 'l' ? 'hand_l' : 'hand_r'];
    A.dispose = function () { A.disposed = true; clearParts(); A.root.parent && A.root.parent.remove(A.root); };
    A.look = JSON.parse(JSON.stringify(look)); A.gear = Object.assign({}, gear || {});
    build();
    return A;
  }
