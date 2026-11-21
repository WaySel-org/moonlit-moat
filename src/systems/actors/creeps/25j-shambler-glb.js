  // ---------- The Shambler: the modelled, animated Ashfall zombie (assets/creeps/shambler.glb) ----------
  // Loaded on entry to Ashfall, like the Gravebelly. Every Shambler there (roster, realm-parity camps, wave pool)
  // gets its own skinned copy; the block shambler stays until the model arrives, and for good if it fails to load.
  // shamblerUpdate(), called right after the creeps update, maps each one's state to a clip. Visual only: the
  // melee brain, its timing and its damage are untouched.
  //  - The swipe: the brain winds up for SH_WIND seconds and then hits, so the attack clip starts part-way in and
  //    runs at SH_ATK_RATE, putting the fastest moment of the swing (SH_HIT into the clip) on the hit.
  //  - It climbs out of the ground (the rise clip) whenever it spawns, and lies where it falls for SH_CORPSE seconds.
  //  - The GLB also holds a scream clip, unused for now (the brain never stands still long enough to play it).
  const SH_SCALE = 0.85;     // the model stands 2.0 m; 0.85 matches the block shambler's 1.7 m
  const SH_WIND = 0.55;      // the melee brain's wind-up before the hit (25-creeps.js)
  const SH_HIT = 1.04;       // seconds into the attack clip where the swiping hand moves fastest (frame 25 at 24 fps)
  const SH_ATK_RATE = 1.3;
  const SH_CORPSE = 2.8;     // seconds the body lies there after death (dead clip played at 1.4x, then held)
  const SH_WALK = 1.0;       // ground speed (m/s) the walk clip matches at 1x; the chase (3.7 m/s) speeds it up, capped
  const SH_RISE = 3.12;      // length of the rise clip
  const SH_LOOPS = new Set(['idle', 'walk']);
  let shTemplate = null;

  let shamblerRequested = false;
  function loadShamblerModels() {
    if (shamblerRequested) return;
    shamblerRequested = true;
    loadModel('shambler', gltf => { shTemplate = gltf; }, 'The Shambler model did not load; keeping the block shambler');
  }

  // A copy of the template with its own skeleton (three r128 has no SkeletonUtils in the vendored build)
  function cloneShamblerScene(src) {
    const root = src.clone(true), bones = {};
    root.traverse(o => { if (o.isBone) bones[o.name] = o; });
    root.traverse(o => {
      if (o.isSkinnedMesh) o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => bones[b.name]), o.skeleton.boneInverses), o.bindMatrix);
    });
    return root;
  }

  function setupShambler(c) {
    const root = cloneShamblerScene(shTemplate.scene);
    root.scale.setScalar(SH_SCALE);
    let mat = null;
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        // Its own material, so the hit flash and the ancient glow (c.mat.emissive) light only this one
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
    });
    const M = { root, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '', hurtT: 0, flash: 0,
      atk: null, riseT: 0, alive: c.alive, corpseT: 0, lastPos: c.pos.clone(), speed: 0, back: false };
    shTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    if (c.body) c.body.visible = false;   // the block body stays for the brain, unseen
    c.g.add(root);
    tag(root, 2);
    if (mat) c.mat = mat;
    c.model = M;
    shPlay(M, 'idle', 1, true);
  }

  function shPlay(M, name, rate, restart, at) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (at) next.time = at;
    if (SH_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.08 : 0.15, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  function shamblerUpdate(dt) {
    if (!shTemplate) return;
    creeps.forEach(c => {
      if (c.type !== 'shambler') return;
      if (!c.model) setupShambler(c);
      const M = c.model;
      // Died this frame (hp ran out, not a wave clean-up or a reset): keep the body up for the fall
      if (M.alive && !c.alive && c.hp <= 0 && c.realm === realmKey()) {
        M.corpseT = SH_CORPSE; c.g.visible = true;
        shPlay(M, 'dead', 1.4, true);
      }
      // (Re)spawned: it climbs out of the ground
      if (!M.alive && c.alive) {
        M.corpseT = 0; M.lastPos.copy(c.pos); M.speed = 0; M.atk = null;
        M.riseT = SH_RISE / 1.6; shPlay(M, 'rise', 1.6, true);
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
      // How fast the game moved it this frame, smoothed; and whether it is backing away from where it faces
      const mx = c.pos.x - M.lastPos.x, mz = c.pos.z - M.lastPos.z;
      const step = Math.hypot(mx, mz) / Math.max(dt, 1e-3);
      if (dt > 0) M.speed += (Math.min(step, 12) - M.speed) * Math.min(1, dt * 8);
      if (step > 0.05) M.back = (mx * Math.sin(c.facing) + mz * Math.cos(c.facing)) < 0;
      M.lastPos.copy(c.pos);
      // A fresh hit sets c.flash back to 1
      if (c.flash > M.flash + 0.3) M.hurtT = 0.5;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      if (M.riseT > 0) M.riseT -= dt;
      const h = hasteOf(c);
      // A new swing from the brain: start the clip so its fastest moment lands on the hit
      if (c.atk && c.atk !== M.atk && c.atk.stage === 'wind') {
        const rate = SH_ATK_RATE * h;
        M.riseT = 0;
        shPlay(M, 'attack', rate, true, Math.max(0, SH_HIT - SH_WIND * SH_ATK_RATE + c.atk.t * SH_ATK_RATE));
      }
      M.atk = c.atk;
      const swinging = M.clip === 'attack' && M.cur && M.cur.isRunning();
      if (M.riseT > 0) { /* climbing out */ }
      else if (c.atk || swinging) { /* the swipe plays through */ }
      else if (M.hurtT > 0) shPlay(M, 'hurt', 1.6, M.clip !== 'hurt');
      else if (M.speed > 0.3) shPlay(M, 'walk', (M.back ? -1 : 1) * clamp(M.speed / SH_WALK, 0.7, 3.2), false);
      else shPlay(M, 'idle', 1, false);
      M.mixer.update(dt);
    });
  }
