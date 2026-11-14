  // ---------- The Mire Crawler: the modelled, animated beetle (assets/creeps/crawler.glb) ----------
  // Loaded after the game starts, like the Moonstag. The GLB is loaded once and every crawler (roster, ancient camps,
  // neutral camps, wave pool) gets its own skinned copy; the block crawler stays until the model arrives, and stays
  // for good if it fails to load. crawlerModelUpdate(), called right after the creeps update, maps each crawler's
  // state to a clip. Every clip is in place: the game moves the crawler, the clips only animate it.
  // On death the body stays for CR_CORPSE seconds so the roll onto its back can play; nothing else changes.
  const CR_SCALE = 1.25;   // the model is 1.0 m long; 1.25 matches the block crawler's footprint and hit radius
  const CR_CORPSE = 1.6;   // seconds the body lies there after death (the dead clip is 1.2 s, then held)
  const CR_SNAP = 0.4;     // seconds into the attack clip where the mandibles snap shut (frame 13 at 30 fps)
  const CR_LOOPS = new Set(['idle', 'walk']);
  let crawlerTemplate = null;

  function loadCrawlerModels() {
    loadModel('crawler', gltf => {
      crawlerTemplate = gltf;
      creeps.forEach(c => { if (c.type === 'crawler') setupCrawler(c); });
    }, 'The Mire Crawler model did not load; keeping the block crawler');
  }

  // A copy of the template with its own skeleton (three r128 has no SkeletonUtils in the vendored build)
  function cloneCrawlerScene(src) {
    const root = src.clone(true), bones = {};
    root.traverse(o => { if (o.isBone) bones[o.name] = o; });
    root.traverse(o => {
      if (o.isSkinnedMesh) o.bind(new THREE.Skeleton(o.skeleton.bones.map(b => bones[b.name]), o.skeleton.boneInverses), o.bindMatrix);
    });
    return root;
  }

  function setupCrawler(c) {
    if (c.model) return;
    const root = cloneCrawlerScene(crawlerTemplate.scene);
    root.scale.setScalar(CR_SCALE);
    let mat = null;
    root.traverse(o => {
      o.layers.enable(2);   // hostile in the gameplay mask, like the block crawler
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        // Its own material, so the hit flash and the ancient glow (c.mat.emissive) light only this crawler
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
    });
    const M = { root, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '', hurtT: 0, flash: 0,
      atkOn: false, alive: c.alive, corpseT: 0, lastPos: c.pos.clone(), speed: 0 };
    crawlerTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    c.body.children.forEach(o => { o.visible = false; });
    c.body.add(root);
    if (mat) c.mat = mat;
    c.model = M;
    crawlerPlay(M, 'idle', 1, true);
  }

  function crawlerPlay(M, name, rate, restart) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (CR_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.08 : 0.12, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  function crawlerModelUpdate(dt) {
    if (!crawlerTemplate) return;
    creeps.forEach(c => {
      const M = c.model;
      if (!M) return;
      // Died this frame (hp ran out, not a wave clean-up or a reset): keep the body up for the roll
      if (M.alive && !c.alive && c.hp <= 0 && c.realm === realmKey()) {
        M.corpseT = CR_CORPSE; c.g.visible = true;
        crawlerPlay(M, 'dead', 1, true);
      }
      if (!M.alive && c.alive) { M.corpseT = 0; M.lastPos.copy(c.pos); M.speed = 0; crawlerPlay(M, 'idle', 1, true); }
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
      if (!c.g.visible) return;
      // How fast the game moved it this frame, smoothed so a one-frame stop doesn't flicker
      const step = Math.hypot(c.pos.x - M.lastPos.x, c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.speed += (Math.min(step, 12) - M.speed) * Math.min(1, dt * 8);
      M.lastPos.copy(c.pos);
      // A fresh hit sets c.flash back to 1
      if (c.flash > M.flash + 0.3) M.hurtT = 0.45;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      const h = hasteOf(c);
      // The bite: timed so the snap lands when the game's wind-up (0.55 s) ends and the hit is checked
      const atk = !!(c.atk && c.atk.stage === 'wind');
      if (atk && !M.atkOn) crawlerPlay(M, 'attack', h * CR_SNAP / 0.55, true);
      M.atkOn = atk;
      if (c.atk) { /* the bite plays through the wind-up and the recovery */ }
      else if (M.hurtT > 0) crawlerPlay(M, 'hurt', 1, M.clip !== 'hurt');
      else if (M.speed > 0.3) crawlerPlay(M, 'walk', clamp(M.speed / 2.6, 0.5, 1.8), false);
      else crawlerPlay(M, 'idle', 1, false);
      M.mixer.update(dt);
    });
  }

  loadCrawlerModels();
