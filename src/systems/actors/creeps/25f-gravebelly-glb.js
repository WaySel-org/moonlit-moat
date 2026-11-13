  // ---------- The Gravebelly (code key 'bloater'): the modelled, animated buried villager (assets/creeps/gravebelly.glb) ----------
  // Loaded after the game starts, like the crawler. Every Gravebelly in Ashfall (roster, realm-parity camps, wave pool)
  // gets its own skinned copy; the block bloater stays until the model arrives, and for good if it fails to load.
  // gravebellyUpdate(), called right after the creeps update, maps each one's state to a clip. Visual only: the
  // ranged brain, its timing and its damage are untouched.
  //  - The ranged brain hovers its creeps 1.3 m up; the model is pulled back down so its feet stay on the ground.
  //  - The tell: the brain fires the moment its cooldown runs out, so the throw clip starts GB_LEAD seconds early,
  //    sped up so the release lands on the shot. It doubles over first (the warning), then heaves.
  //  - Its shots are drawn as tumbling clods of grave soil with dull ember flecks (same flight, same hit).
  //  - It climbs out of the ground (the rise clip) whenever it spawns, and lies where it falls for GB_CORPSE seconds.
  const GB_SCALE = 1.0;      // the model already stands 1.78 m, the style guide's 1.8 m
  const GB_LEAD = 1.2;       // seconds of cooldown left when the throw starts
  const GB_RELEASE = 2.46;   // seconds into the attack clip where the throwing hand moves fastest (the release)
  const GB_CORPSE = 2.6;     // seconds the body lies there after death (dead clip played at 1.2x, then held)
  const GB_WALK = 0.9;       // ground speed (m/s) the walk clip matches at 1x; faster moves speed it up, capped
  const GB_LOOPS = new Set(['idle', 'walk']);
  let gbTemplate = null;
  const gbClodGeo = new THREE.DodecahedronGeometry(0.2, 0);
  const gbClodMat = new THREE.MeshLambertMaterial({ color: 0x3e3428, emissive: 0x3e3428, emissiveIntensity: 0.35, flatShading: true });
  const gbEmberGeo = new THREE.TetrahedronGeometry(0.06, 0);
  const gbEmberMat = new THREE.MeshLambertMaterial({ color: 0xd2552a, emissive: 0xd2552a, emissiveIntensity: 0.35 });   // dull: a painted colour, no glow

  function loadGravebellyModels() {
    const A = window.MM_ASSETS;
    if (!A || !A.gravebelly || !A.gltfLoader) return;
    const go = () => {
      // Textures load as <img> (img-src allows blob:); the default fetch() path is blocked by connect-src 'self'
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.gravebelly, gltf => { gbTemplate = gltf; },
        undefined, e => console.warn('The Gravebelly model did not load; keeping the block bloater', e));
    };
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.onload = go;
    document.head.appendChild(s);
  }

  // A copy of the template with its own skeleton (three r128 has no SkeletonUtils in the vendored build)
  function cloneGravebellyScene(src) {
    const root = src.clone(true), bones = {};
    root.traverse(o => { if (o.isBone) bones[o.name] = o; });
    root.traverse(o => {
      if (o.isSkinnedMesh) o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => bones[b.name]), o.skeleton.boneInverses), o.bindMatrix);
    });
    return root;
  }

  function setupGravebelly(c) {
    const root = cloneGravebellyScene(gbTemplate.scene);
    root.scale.setScalar(GB_SCALE);
    let mat = null;
    root.traverse(o => {
      o.layers.enable(2);   // hostile in the gameplay mask, like the block bloater
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        // Its own material, so the hit flash and the ancient glow (c.mat.emissive) light only this one
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
    });
    const M = { root, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '', hurtT: 0, flash: 0,
      atkOn: false, lastCool: c.cool, riseT: 0, alive: c.alive, corpseT: 0, lastPos: c.pos.clone(), speed: 0, back: false, dy: 0 };
    gbTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    if (c.body) c.body.visible = false;   // the block body (and its pulsing core) stays for the brain, unseen
    c.g.add(root);
    if (mat) c.mat = mat;
    c.model = M;
    gbPlay(M, 'idle', 1, true);
  }

  function gbPlay(M, name, rate, restart, at) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (at) next.time = at;
    if (GB_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.08 : 0.15, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  // Its shots: a clod of grave soil with dull ember flecks, tumbling. Swapped onto the brain's shot mesh, so the
  // flight and the hit are exactly the brain's.
  function gbClod(s) {
    s.gbClod = true;
    s.m.geometry = gbClodGeo; s.m.material = gbClodMat;
    for (let i = 0; i < 3; i++) {
      const e = new THREE.Mesh(gbEmberGeo, gbEmberMat), a = i / 3 * TAU;
      e.position.set(Math.cos(a) * 0.16, (i - 1) * 0.1, Math.sin(a) * 0.16); s.m.add(e);
    }
    s.spin = new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
  }

  function gravebellyUpdate(dt) {
    if (!gbTemplate) return;
    cshots.forEach(s => {
      if (s.c && s.c.type === 'bloater' && s.c.model) {
        if (!s.gbClod) gbClod(s);
        s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt;
      }
    });
    creeps.forEach(c => {
      if (c.type !== 'bloater') return;
      if (!c.model) setupGravebelly(c);
      const M = c.model;
      // Died this frame (hp ran out, not a wave clean-up or a reset): keep the body up for the fall
      if (M.alive && !c.alive && c.hp <= 0 && c.realm === realmKey()) {
        M.corpseT = GB_CORPSE; c.g.visible = true;
        gbPlay(M, 'dead', 1.2, true);
      }
      // (Re)spawned: it climbs out of the ground
      if (!M.alive && c.alive) {
        M.corpseT = 0; M.lastPos.copy(c.pos); M.speed = 0; M.atkOn = false; M.lastCool = c.cool;
        M.riseT = 3.12 / 1.5; gbPlay(M, 'rise', 1.5, true);
      }
      M.alive = c.alive;
      if (!c.alive) {
        if (M.corpseT > 0) {
          M.corpseT -= dt; M.mixer.update(dt);
          // The creeps update skips the dead, so fade the killing blow's flash here
          c.flash = Math.max(0, c.flash - dt * 6);
          if (c.mat && c.mat.emissive) c.mat.emissive.setRGB(c.flash, c.flash * 0.8, c.flash * 0.6);
          if (M.corpseT <= 0) c.g.visible = false;
        }
        return;
      }
      if (!c.g.visible || c.realm !== realmKey()) return;
      // Feet on the ground: undo the ranged brain's hover (it lifts c.pos itself, so this follows its bob)
      M.dy = Math.min(0, groundAt(c.pos.x, c.pos.z)) - c.pos.y;
      M.root.position.y = M.dy;
      // How fast the game moved it this frame, smoothed; and whether it is backing away from where it faces
      const mx = c.pos.x - M.lastPos.x, mz = c.pos.z - M.lastPos.z;
      const step = Math.hypot(mx, mz) / Math.max(dt, 1e-3);
      if (dt > 0) M.speed += (Math.min(step, 12) - M.speed) * Math.min(1, dt * 8);
      if (step > 0.05) M.back = (mx * Math.sin(c.facing) + mz * Math.cos(c.facing)) < 0;
      M.lastPos.copy(c.pos);
      // A fresh hit sets c.flash back to 1
      if (c.flash > M.flash + 0.3) M.hurtT = 0.6;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      if (M.riseT > 0) M.riseT -= dt;
      const h = hasteOf(c);
      // The throw: a new cooldown has started once it jumps up (the brain just fired)
      if (c.cool > M.lastCool + 0.5) M.atkOn = false;
      M.lastCool = c.cool;
      // c.aware can drop for a single frame; only trust it after it has held for half a second either way
      M.awareT = c.aware ? 0.5 : Math.max(0, (M.awareT || 0) - dt);
      const aware = M.awareT > 0;
      const winding = aware && c.stun <= 0 && c.cool > 0 && c.cool <= GB_LEAD;
      if (winding && !M.atkOn && M.riseT <= 0) {
        // Start so the release lands when the cooldown hits zero, even if it is already part-way down
        M.atkOn = true;
        gbPlay(M, 'attack', h * GB_RELEASE / GB_LEAD, true, Math.max(0, GB_RELEASE - c.cool * GB_RELEASE / GB_LEAD));
      }
      if (M.atkOn && !aware) M.atkOn = false;   // lost interest mid wind-up: let it go back to walking
      const throwing = M.clip === 'attack' && M.cur && M.cur.isRunning();
      if (M.riseT > 0) { /* climbing out */ }
      else if (M.atkOn || throwing) { /* the throw plays through */ }
      else if (M.hurtT > 0) gbPlay(M, 'hurt', 1.5, M.clip !== 'hurt');
      else if (M.speed > 0.3) gbPlay(M, 'walk', (M.back ? -1 : 1) * clamp(M.speed / GB_WALK, 0.7, 2.2), false);
      else gbPlay(M, 'idle', 1, false);
      M.mixer.update(dt);
    });
  }

  loadGravebellyModels();
