  // ---------- The Minotaur: the modelled, animated mythic (assets/mythics/minotaur.glb) ----------
  // A bull-headed giant from the Cretan labyrinth, rigged on Mixamo. Loaded the first time a Minotaur wakes; the block
  // figure fights until the model arrives and stays if it fails to load. minotaurModelUpdate(), called right after the
  // creeps update, maps its state to a clip. Visual only: the stalker brain and the myth kit keep their timing and damage.
  //  - The lunge (the brain's 0.6 s wind-up and dash) and Horn Toss (the kit's 0.75 s stand) play the headbutt, sped so
  //    the head lands on the frame the hit is checked. Labyrinth Charge roars through its wind-up and sprints the dash.
  //  - While it circles the hero it strafes (left or right, as it moves); otherwise it walks or runs at its real speed.
  //  - Enraged below half health it roars; a hit plays the flinch; it lies where it falls for MT_CORPSE seconds.
  //  - The block figure's pole moves into its right fist. Its material becomes c.mat, so the hit flash lights the model.
  const MT_SCALE = 1.75;        // 1.45 m tall in its hunched idle; the block figure stands about 2.6 m to the horn tips
  const MT_BUTT_AT = 0.29 * 2.12;                          // seconds into the headbutt where the head moves fastest
  const MT_WALK = 2.6, MT_RUN = 6.5, MT_RUN_ABOVE = 5.0, MT_STRAFE = 2.4;   // ground speeds the clips match at 1x
  const MT_CORPSE = 3.2;
  const MT_LOOPS = new Set(['idle', 'walk', 'run', 'strafel', 'strafer']);
  let mtTemplate = null, mtRequested = false;

  function setupMinotaur(c) {
    const root = mtTemplate.scene;
    root.scale.setScalar(MT_SCALE);
    let mat = null, hand = null, arm = null;
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
      if (o.isBone && /RightHand$/.test(o.name)) hand = o;
      if (o.isBone && /RightForeArm$/.test(o.name)) arm = o;
    });
    // The pole: the block figure's long thin box, gripped a third of the way up, the long end out along the forearm
    const pole = c.body.children.find(m => m.geometry && m.geometry.type === 'BoxGeometry' && m.geometry.parameters.height > 1.2);
    const grip = new THREE.Group();
    if (pole) { c.body.remove(pole); pole.position.set(0, -0.25, 0); pole.rotation.set(0, 0, 0); grip.add(pole); }
    grip.traverse(o => o.layers.enable(2));
    tag(root, 2);   // hostile in the gameplay mask; tag() sends the rigged mesh to the skinned mask pass
    c.body.visible = false;   // the block body and legs stay for the brain, unseen
    c.g.add(root); c.g.add(grip);
    if (mat) c.mat = mat;
    const M = { root, grip, hand, arm, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '',
      alive: c.alive, corpseT: 0, strikeT: 0, flash: 0, hurtT: 0, enraged: !!c.enraged, roarT: 0, atk: null, kact: null,
      dash: false, lastPos: c.pos.clone(), vx: 0, vz: 0 };
    mtTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    c.model = M;
    mtPlay(M, 'idle', 1, true);
  }

  function mtPlay(M, name, rate, restart, at) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (at) next.time = at;
    if (MT_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.1 : 0.15, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  const _mh = new THREE.Vector3(), _ma = new THREE.Vector3(), _md = new THREE.Vector3(), _mdown = new THREE.Vector3(0, -1, 0);
  function minotaurModelUpdate(dt) {
    creeps.forEach(c => {
      if (c.type !== 'minotaur') return;
      if (!mtTemplate) {
        if (c.alive && !mtRequested) { mtRequested = true; loadModel('minotaur', g => { mtTemplate = g; }, 'The Minotaur model did not load; keeping the block figure'); }
        return;
      }
      if (!c.model) setupMinotaur(c);
      const M = c.model;
      // Died this frame (hp ran out, not a reset): keep the body up for the fall
      if (M.alive && !c.alive && c.hp <= 0) { M.corpseT = MT_CORPSE; c.g.visible = true; mtPlay(M, 'dead', 1.4, true); }
      if (!M.alive && c.alive) { M.corpseT = 0; M.lastPos.copy(c.pos); M.vx = M.vz = 0; M.enraged = !!c.enraged; M.roarT = 0; mtPlay(M, 'idle', 1, true); }
      M.alive = c.alive;
      if (!c.alive) {
        if (M.corpseT > 0) {
          M.corpseT -= dt; M.mixer.update(dt); mtGrip(c, M);
          c.flash = Math.max(0, c.flash - dt * 6);
          if (c.mat && c.mat.emissive) c.mat.emissive.setRGB(c.flash, c.flash * 0.8, c.flash * 0.6);
          if (M.corpseT <= 0) c.g.visible = false;
        }
        return;
      }
      if (!c.g.visible) return;
      c.body.rotation.x = 0;   // the kit tips the block body forward for its wind-ups; the clips carry that now
      const h = hasteOf(c);
      // Its velocity, smoothed, in its own frame (x: to its left, z: ahead)
      let sx = (c.pos.x - M.lastPos.x) / Math.max(dt, 1e-3), sz = (c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (Math.hypot(sx, sz) > 40) sx = sz = 0;
      if (dt > 0) { const k = Math.min(1, dt * 8); M.vx += (sx - M.vx) * k; M.vz += (sz - M.vz) * k; }
      M.lastPos.copy(c.pos);
      const sp = Math.hypot(M.vx, M.vz), cf = Math.cos(c.facing), sf = Math.sin(c.facing);
      const side = M.vx * cf - M.vz * sf, ahead = M.vx * sf + M.vz * cf;
      if (c.flash > M.flash + 0.3) M.hurtT = 0.5;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      if (c.enraged && !M.enraged) M.roarT = 1.8;
      M.enraged = !!c.enraged; M.roarT = Math.max(0, M.roarT - dt);
      const A = c.atk, K = c.kact;
      if (K && K !== M.kact) {
        if ('dash' in K) { mtPlay(M, 'roar', 1.6, true, 0.3); M.strikeT = 9; M.dash = false; }       // Labyrinth Charge: roar, then sprint
        else { mtPlay(M, 'headbutt', MT_BUTT_AT / 0.75, true); M.strikeT = 0.75 + 0.5; }           // Horn Toss: 0.75 s stand
      } else if (A && A !== M.atk) { mtPlay(M, 'headbutt', h * MT_BUTT_AT / 0.6, true); M.strikeT = (0.6 + 0.35 + 0.4) / h; }   // the lunge
      if (K && 'dash' in K) {
        if (K.dash && !M.dash) { M.dash = true; mtPlay(M, 'run', 1.8, true); }
      } else if (M.strikeT > 3) M.strikeT = 0;   // the charge ended (or was broken)
      M.atk = A; M.kact = K;
      M.strikeT = Math.max(0, M.strikeT - dt);
      if (M.strikeT > 0) { /* the strike or the charge plays through */ }
      else if (M.roarT > 0) mtPlay(M, 'roar', 1.5, M.clip !== 'roar', 0.4);
      else if (c.stun > 0 || M.hurtT > 0) mtPlay(M, 'hurt', 1.2, M.clip !== 'hurt');
      else if (sp > MT_RUN_ABOVE) mtPlay(M, 'run', clamp(sp / MT_RUN, 0.7, 1.8), false);
      else if (sp > 0.4 && Math.abs(side) > Math.abs(ahead)) mtPlay(M, side > 0 ? 'strafel' : 'strafer', clamp(Math.abs(side) / MT_STRAFE, 0.7, 2.0), false);
      else if (sp > 0.4) mtPlay(M, 'walk', (ahead < 0 ? -1 : 1) * clamp(sp / MT_WALK, 0.7, 2.0), false);
      else mtPlay(M, 'idle', 1, false);
      M.mixer.update(dt);
      mtGrip(c, M);
    });
  }

  // The pole follows the right fist, pointing out along the forearm
  function mtGrip(c, M) {
    if (!M.hand || !M.arm) return;
    M.root.updateMatrixWorld(true);
    M.hand.getWorldPosition(_mh); M.arm.getWorldPosition(_ma);
    c.g.worldToLocal(_mh); c.g.worldToLocal(_ma);
    M.grip.position.copy(_mh);
    _md.subVectors(_mh, _ma).normalize();
    M.grip.quaternion.setFromUnitVectors(_mdown, _md);
  }
