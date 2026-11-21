  // ---------- The Oni: the modelled, animated mythic (assets/mythics/oni.glb) ----------
  // A horned red brute from Japanese folklore, rigged on Mixamo. Loaded the first time an Oni wakes; the block figure
  // fights until the model arrives and stays if it fails to load. oniModelUpdate(), called right after the creeps
  // update, maps its state to a clip. Visual only: the melee brain and the myth kit keep their timing and damage.
  //  - The club swing (the brain's 0.55 s wind-up) and Club Quake (the kit's 1 s stand) are sped so the club lands
  //    on the frame the hit lands. Oni Fury (enraged below half health) plays the roar; a hit plays the flinch.
  //  - It walks or runs to match its real speed, and lies where it falls for ONI_CORPSE seconds.
  //  - The block figure's iron club moves into its right fist. Its material becomes c.mat, so the game's hit flash
  //    and the Oni Fury red glow light the model.
  const ONI_SCALE = 1.7;        // 1.6 m tall in its idle stance; the block figure stands 2.75 m to the horn tips
  const ONI_SWING_AT = 0.41 * 2.42, ONI_SMASH_AT = 0.38 * 2.29;   // seconds into each clip where the club hand is fastest
  const ONI_WALK = 2.7, ONI_RUN = 6.0, ONI_RUN_ABOVE = 3.6;       // ground speeds the clips match at 1x (scaled size)
  const ONI_CORPSE = 3.2;
  const ONI_LOOPS = new Set(['idle', 'walk', 'run']);
  let oniTemplate = null, oniRequested = false;

  function setupOni(c) {
    const root = oniTemplate.scene;
    root.scale.setScalar(ONI_SCALE);
    let mat = null, hand = null, arm = null;
    root.traverse(o => {
      o.layers.enable(2);   // hostile in the gameplay mask, like the block figure
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        mat = o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
      }
      if (o.isBone && /RightHand$/.test(o.name)) hand = o;
      if (o.isBone && /RightForeArm$/.test(o.name)) arm = o;
    });
    // The club: the block figure's iron cylinder, thin end in the fist, thick end out along the forearm
    const club = c.body.children.find(m => m.geometry && m.geometry.type === 'CylinderGeometry');
    const grip = new THREE.Group();
    if (club) { c.body.remove(club); club.position.set(0, -0.62, 0); club.rotation.set(0, 0, 0); grip.add(club); }
    grip.traverse(o => o.layers.enable(2));
    c.body.visible = false;   // the block body and legs stay for the brain, unseen
    c.g.add(root); c.g.add(grip);
    if (mat) c.mat = mat;
    const M = { root, grip, hand, arm, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, clip: '',
      alive: c.alive, corpseT: 0, strikeT: 0, flash: 0, hurtT: 0, enraged: !!c.enraged, roarT: 0, atk: null, kact: null,
      lastPos: c.pos.clone(), speed: 0 };
    oniTemplate.animations.forEach(k => { M.actions[k.name] = M.mixer.clipAction(k); });
    c.model = M;
    oniPlay(M, 'idle', 1, true);
  }

  function oniPlay(M, name, rate, restart, at) {
    const next = M.actions[name] || M.actions.idle;
    if (!next) return;
    next.timeScale = rate;
    if (next === M.cur && !restart) return;
    next.reset();
    if (at) next.time = at;
    if (ONI_LOOPS.has(name)) next.setLoop(THREE.LoopRepeat, Infinity);
    else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, name === 'dead' ? 0.1 : 0.15, false);
    next.play();
    M.cur = next; M.clip = name;
  }

  const _oh = new THREE.Vector3(), _oa = new THREE.Vector3(), _od = new THREE.Vector3(), _odown = new THREE.Vector3(0, -1, 0);
  function oniModelUpdate(dt) {
    creeps.forEach(c => {
      if (c.type !== 'oni') return;
      if (!oniTemplate) {
        if (c.alive && !oniRequested) { oniRequested = true; loadModel('oni', g => { oniTemplate = g; }, 'The Oni model did not load; keeping the block figure'); }
        return;
      }
      if (!c.model) setupOni(c);
      const M = c.model;
      // Died this frame (hp ran out, not a reset): keep the body up for the fall
      if (M.alive && !c.alive && c.hp <= 0) { M.corpseT = ONI_CORPSE; c.g.visible = true; oniPlay(M, 'dead', 1.4, true); }
      if (!M.alive && c.alive) { M.corpseT = 0; M.lastPos.copy(c.pos); M.speed = 0; M.enraged = !!c.enraged; M.roarT = 0; oniPlay(M, 'idle', 1, true); }
      M.alive = c.alive;
      if (!c.alive) {
        if (M.corpseT > 0) {
          M.corpseT -= dt; M.mixer.update(dt); oniGrip(c, M);
          c.flash = Math.max(0, c.flash - dt * 6);
          if (c.mat && c.mat.emissive) c.mat.emissive.setRGB(c.flash, c.flash * 0.8, c.flash * 0.6);
          if (M.corpseT <= 0) c.g.visible = false;
        }
        return;
      }
      if (!c.g.visible) return;
      const h = hasteOf(c);
      const step = Math.hypot(c.pos.x - M.lastPos.x, c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.speed += (Math.min(step, 20) - M.speed) * Math.min(1, dt * 8);
      M.lastPos.copy(c.pos);
      if (c.flash > M.flash + 0.3) M.hurtT = 0.5;
      M.flash = c.flash; M.hurtT = Math.max(0, M.hurtT - dt);
      if (c.enraged && !M.enraged) M.roarT = 1.8;
      M.enraged = !!c.enraged; M.roarT = Math.max(0, M.roarT - dt);
      const A = c.atk, K = c.kact;
      // A strike plays through its wind-up and blow, then hands back (strikeT: seconds of the clip left to show)
      if (K && K !== M.kact) { oniPlay(M, 'smash', ONI_SMASH_AT / 1.0, true); M.strikeT = 1.0 + 0.6; }            // Club Quake: 1 s stand
      else if (A && A !== M.atk) { const r = h * ONI_SWING_AT / 0.55; oniPlay(M, 'swing', r, true); M.strikeT = (0.55 + 0.6) / h; }   // the brain's wind-up + recovery
      M.atk = A; M.kact = K;
      M.strikeT = Math.max(0, (M.strikeT || 0) - dt);
      if (M.strikeT > 0) { /* the strike plays through */ }
      else if (M.roarT > 0) oniPlay(M, 'roar', 1.5, M.clip !== 'roar', 0.4);
      else if (c.stun > 0 || M.hurtT > 0) oniPlay(M, 'hurt', 1.2, M.clip !== 'hurt');
      else if (M.speed > ONI_RUN_ABOVE) oniPlay(M, 'run', clamp(M.speed / ONI_RUN, 0.7, 1.6), false);
      else if (M.speed > 0.3) oniPlay(M, 'walk', clamp(M.speed / ONI_WALK, 0.7, 1.8), false);
      else oniPlay(M, 'idle', 1, false);
      M.mixer.update(dt);
      oniGrip(c, M);
    });
  }

  // The club follows the right fist, pointing out along the forearm
  function oniGrip(c, M) {
    if (!M.hand || !M.arm) return;
    M.root.updateMatrixWorld(true);
    M.hand.getWorldPosition(_oh); M.arm.getWorldPosition(_oa);
    c.g.worldToLocal(_oh); c.g.worldToLocal(_oa);
    M.grip.position.copy(_oh);
    _od.subVectors(_oh, _oa).normalize();
    M.grip.quaternion.setFromUnitVectors(_odown, _od);
  }
