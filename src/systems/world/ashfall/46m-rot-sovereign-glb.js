  // ---------- The Rot Sovereign (Necrophous): the modelled, animated shard guardian of Ashfall (assets/bosses/rot-sovereign.glb) ----------
  // A skeletal king in a burial shroud, a crown of coffin nails, the Ember Shard glowing green in his ribs. He floats on
  // the godling brain like the other story bosses, so the model has no legs (the shroud hides them): a hand-built
  // skeleton with keyed clips. The block figure stays until the model arrives (loaded on entering Ashfall) and stays
  // for good if it fails to load. rotModelUpdate() maps his state to a clip: idle while he hovers, drift while he moves,
  // cast through a strike and whenever his boss kit fires (raise the dead, bone nova, grave grasp), hurt when struck.
  // The game's own green halo stays above the crown; the block staff and body are hidden.
  const ROT_SCALE = 1.45;       // the model is 3.0 m tall; the block figure's crown tops out about 4.35 inside c.body
  const ROT_BASE = 0;           // the block shroud's hem sits at 0 inside c.body (which the brain floats 1 m low)
  const ROT_LOOPS = new Set(['idle', 'drift']);

  let rotRequested = false;
  function loadRotSovereignModel() {
    if (rotRequested) return;
    rotRequested = true;
    creeps.forEach(c => {
      if (c.type !== 'rot') return;
      loadModel('rotSovereign', gltf => setupRotSovereign(c, gltf), 'The Rot Sovereign model did not load; keeping the block figure');
    });
  }

  function setupRotSovereign(c, gltf) {
    const root = gltf.scene, mats = [];
    root.scale.setScalar(ROT_SCALE);
    root.position.y = ROT_BASE;
    root.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
        const map = o.material.map || o.material.emissiveMap;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        // A faint grave-light from his own colours, so the shard and the eye sockets read at night
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x333333, emissiveMap: map });
        mats.push(o.material);
      }
    });
    const M = { root, mats, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, atk: null, hp: c.hp, one: 0,
      kit: c.kitCd, lastPos: c.pos.clone(), moving: 0 };
    gltf.animations.forEach(a => { M.actions[a.name] = M.mixer.clipAction(a); });
    c.body.children.forEach(ch => { if (ch !== c.halo) ch.visible = false; });
    c.body.add(root);
    tag(root, 2);
    c.model = M;
    rotPlay(M, 'idle', 0, true);
  }

  function rotPlay(M, name, dur, restart) {
    const next = M.actions[name] || M.actions.idle;
    if (!next || (next === M.cur && !restart)) return;
    next.reset();
    if (ROT_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, 0.2, false);
    next.play();
    M.cur = next;
  }

  function rotModelUpdate(dt) {
    creeps.forEach(c => {
      const M = c.model;
      if (c.type !== 'rot' || !M) return;
      if (!c.alive || !c.g.visible) { M.hp = c.hp; M.atk = null; M.one = 0; M.kit = c.kitCd; M.lastPos.copy(c.pos); return; }
      const step = Math.hypot(c.pos.x - M.lastPos.x, c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.moving += (step - M.moving) * Math.min(1, dt * 5);
      M.lastPos.copy(c.pos);
      // His boss kit just fired (its cooldown jumped back up): raise both arms over the grave
      if (c.kitCd !== undefined && M.kit !== undefined && c.kitCd > M.kit + 1) { M.one = 1.1; rotPlay(M, 'cast', 1.1, true); }
      M.kit = c.kitCd;
      // Struck: a short recoil, unless he is in the middle of a strike or a cast
      if (c.hp < M.hp && !c.atk && M.one <= 0) { M.one = 0.45; rotPlay(M, 'hurt', 0.45, true); }
      M.hp = c.hp;
      if (M.one > 0) M.one -= dt;
      if (c.atk) { rotPlay(M, 'cast', 1.1, c.atk !== M.atk); M.one = 0; }
      else if (M.one <= 0) rotPlay(M, M.moving > 0.6 ? 'drift' : 'idle', 0);
      M.atk = c.atk;
      const glow = 0.2 + 0.5 * (c.flash || 0);
      M.mats.forEach(m => m.emissive.setScalar(glow));
      M.mixer.update(dt);
    });
  }
