  // ---------- The Basilisk: the modelled, animated mythic (assets/mythics/basilisk.glb) ----------
  // The serpent king of European folklore: a crowned, armoured snake that rears up from the floor, its tail running
  // straight back behind it. Rigged without limbs (tools/rig_serpent.py --no-arms) and keyed by hand. Loaded the first
  // time a Basilisk wakes; the block figure fights until the model arrives and stays if it fails to load.
  // basiliskModelUpdate(), called right after the creeps update, maps its state to a clip. Visual only: the guard
  // brain and the myth kit keep their timing and damage.
  //  - The guard slam (the brain's 0.85 s wind-up) plays the lunge, sped so the head strikes on the frame the hit lands.
  //  - Petrifying Gaze (1.4 s) rears up and glares down, the body glowing yellow as the stare builds.
  //  - Tail sweep (0.75 s) plays the coil, the tail swinging round as the strike behind it lands; venom spit a quick jab.
  //  - Moving it slithers at its real speed; a hit or a stun plays the flinch; it lies where it falls for BAS_CORPSE s.
  //  - Its material becomes c.mat, so the game's hit flash lights the model.
  const BAS_SCALE = 0.7;        // 2.7 m to the crown spike in the model; inside c.g (x1.9) about 3.6 m, the tail 7 m back
  const BAS_LUNGE_AT = 0.5 * 40 / 30;     // seconds into each clip where the head lands (clip_sheet.py, keyed frames)
  const BAS_GAZE_AT = 29 / 30, BAS_COIL_AT = 28 / 30;
  const BAS_SLITHER = 2.3;      // the guard's walking speed; the ripple runs faster or slower with its real speed
  const BAS_CORPSE = 3.2;
  const BAS_LOOPS = new Set(['idle', 'slither']);
  let basTemplate = null, basRequested = false;

  function setupBasilisk(c) {
    const root = basTemplate.scene;
    root.scale.setScalar(BAS_SCALE);
    let mat = null;
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
    });
    c.body.visible = false;   // the block body stays for the brain and the kit, unseen
    c.g.add(root);
    tag(root, 2);   // hostile in the gameplay mask; tag() sends the rigged mesh to the skinned mask pass
    if (mat) c.mat = mat;
    const M = { root, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '', alive: c.alive, corpseT: 0,
      strikeT: 0, flash: 0, hurtT: 0, atk: null, kact: null, spit: c.spitN || 0, stare: 0, lastPos: c.pos.clone(), speed: 0 };
    basTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    c.model = M;
    basPlay(M, 'idle', 1, true);
  }

  function basPlay(M, name, rate, restart, at) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (at) next.time = at;
    if (BAS_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.1 : 0.15, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  function basiliskModelUpdate(dt) {
    creeps.forEach(c => {
      if (c.type !== 'basilisk') return;
      if (!basTemplate) {
        if (c.alive && !basRequested) { basRequested = true; loadModel('basilisk', g => { basTemplate = g; }, 'The Basilisk model did not load; keeping the block figure'); }
        return;
      }
      if (!c.model) setupBasilisk(c);
      const M = c.model;
      // Died this frame (hp ran out, not a reset): keep the body up for the fall
      if (M.alive && !c.alive && c.hp <= 0) { M.corpseT = BAS_CORPSE; c.g.visible = true; basPlay(M, 'dead', 1.2, true); }
      if (!M.alive && c.alive) { M.corpseT = 0; M.lastPos.copy(c.pos); M.speed = 0; M.stare = 0; basPlay(M, 'idle', 1, true); }
      M.alive = c.alive;
      if (!c.alive) {
        if (M.corpseT > 0) {
          M.corpseT -= dt; M.mixer.update(dt);
          c.flash = Math.max(0, c.flash - dt * 6);
          if (c.mat && c.mat.emissive) c.mat.emissive.setRGB(c.flash, c.flash * 0.8, c.flash * 0.6);
          if (M.corpseT <= 0) c.g.visible = false;
        }
        return;
      }
      if (!c.g.visible) return;
      c.body.rotation.y = 0;   // the sweep twists the block body; the coil clip carries that now
      const h = hasteOf(c);
      let step = Math.hypot(c.pos.x - M.lastPos.x, c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (step > 30) step = 0;
      if (dt > 0) M.speed += (step - M.speed) * Math.min(1, dt * 8);
      M.lastPos.copy(c.pos);
      if (c.flash > M.flash + 0.3) M.hurtT = 0.45;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      const A = c.atk, K = c.kact;
      // A strike plays through its wind-up and blow, then hands back (strikeT: seconds of the clip left to show)
      if (K && K !== M.kact) {
        if (K.gaze) { basPlay(M, 'gaze', BAS_GAZE_AT / 1.4, true); M.strikeT = 1.4 + 0.4; }
        else if (K.sweep) { basPlay(M, 'coil', BAS_COIL_AT / 0.75, true); M.strikeT = 0.75 + 0.5; }
      } else if (A && A !== M.atk) { basPlay(M, 'lunge', h * BAS_LUNGE_AT / 0.85, true); M.strikeT = (0.85 + 0.9) / h; }
      else if ((c.spitN || 0) !== M.spit && M.strikeT <= 0) { basPlay(M, 'lunge', 1.6, true, 0.45); M.strikeT = 0.5; }
      M.atk = A; M.kact = K; M.spit = c.spitN || 0;
      M.strikeT = Math.max(0, M.strikeT - dt);
      if (M.strikeT > 0) { /* the strike plays through */ }
      else if (c.stun > 0 || M.hurtT > 0) basPlay(M, 'hurt', 1, M.clip !== 'hurt');
      else if (M.speed > 0.3) basPlay(M, 'slither', clamp(M.speed / BAS_SLITHER, 0.6, 2.0), false);
      else basPlay(M, 'idle', 1, false);
      // The stare: the body glows the gaze's yellow as it builds (the block eyes are hidden with the block body)
      const st = K && K.gaze ? Math.min(1, K.t / 1.4) : 0;
      M.stare += (st - M.stare) * Math.min(1, dt * 10);
      if (c.mat && c.mat.emissive && M.stare > 0.01) c.mat.emissive.setRGB(c.flash + 0.35 * M.stare, c.flash * 0.8 + 0.3 * M.stare, c.flash * 0.6);
      M.mixer.update(dt);
    });
  }
