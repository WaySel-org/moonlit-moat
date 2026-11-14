  // ---------- The modelled raid bosses: Ashwing Wyrm, Rimefang Wyvern and the Tyrant Rex ----------
  // Both wear Cinderwing's body, skeleton and hand-keyed clips (assets/bosses/cinderwing.glb, already downloaded for
  // Cinderwing, so they cost the player nothing extra). Each gets its own colours, painted at load time by mapping the
  // texture's brightness through a colour ramp: Ashwing is charcoal ash with an ember belly and horns, Rimefang steel
  // blue with an ice-pale belly and white horns. They also differ in size. The block dragon flies until the model
  // arrives and stays if it fails to load. raidDragonModelUpdate(), called right after updateRaider, maps the raider's
  // state to a clip: fly while circling, hover then flee along the strafe lane, breath for the breath attack, perch
  // while it rests on the ground. Every clip is in place: updateRaider moves the raider.
  // The Tyrant Rex has its own model (assets/bosses/tyrant-rex.glb): a two-legged rig with hand-keyed clips. It walks
  // while it chases, roars through the charge's wind-up and then runs, bites, roars for its knock-back wave, and sags
  // winded while it rests.
  const RAID_LOOKS = {
    wyrm: { scale: 1.3, ramp: [[0, 8, 8, 9], [26, 26, 26, 28], [41, 48, 46, 48], [61, 77, 69, 66], [94, 128, 102, 84], [120, 250, 128, 41], [143, 255, 184, 89], [163, 219, 212, 201], [255, 255, 255, 255]] },
    rex: { asset: 'rex', scale: 1.4, ground: true },
    rime: { scale: 1.1, ramp: [[0, 5, 10, 20], [26, 20, 43, 71], [41, 36, 77, 117], [61, 61, 115, 158], [94, 158, 209, 235], [128, 214, 240, 252], [163, 247, 252, 255], [255, 255, 255, 255]] }
  };
  const RAID_LOOPS = new Set(['fly', 'flee', 'glide', 'hover', 'perch', 'walk', 'run', 'idle', 'rest']);
  const RAID_LIFT = 2.2;   // the flight clips carry the body's middle this far above the model's origin (model metres)

  // Paint a copy of the texture through a brightness -> colour ramp ([brightness 0-255, r, g, b] stops)
  function rampTexture(map, ramp) {
    const img = map.image, c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data, lut = new Uint8Array(768);
    for (let l = 0, k = 0; l < 256; l++) {
      while (k < ramp.length - 2 && l > ramp[k + 1][0]) k++;
      const a = ramp[k], b = ramp[k + 1], t = Math.min(1, Math.max(0, (l - a[0]) / (b[0] - a[0])));
      for (let ch = 0; ch < 3; ch++) lut[l * 3 + ch] = Math.round(a[ch + 1] + (b[ch + 1] - a[ch + 1]) * t);
    }
    for (let i = 0; i < p.length; i += 4) {
      const l = Math.round(0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) * 3;
      p[i] = lut[l]; p[i + 1] = lut[l + 1]; p[i + 2] = lut[l + 2];
    }
    ctx.putImageData(d, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.flipY = map.flipY; tex.wrapS = map.wrapS; tex.wrapT = map.wrapT; tex.encoding = THREE.LinearEncoding;
    return tex;
  }

  function loadRaidModel(r) {
    const look = RAID_LOOKS[r.type];
    if (!look || r.modelRequested) return;
    r.modelRequested = true;
    loadModel(look.asset || 'cinderwing', gltf => setupRaidDragon(r, look, gltf), `The ${r.name} model did not load; keeping the block model`);
  }

  function setupRaidDragon(r, look, gltf) {
    const root = gltf.scene;
    root.scale.setScalar(look.scale);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const src = o.material.map || o.material.emissiveMap;
        let map = src;
        try { if (src && src.image && look.ramp) map = rampTexture(src, look.ramp); } catch (e) { console.warn(`${r.name}: could not recolour the texture`, e); }
        if (map === src && src) { src.encoding = THREE.LinearEncoding; src.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true });
      }
      o.layers.enable(2);   // hostile in the gameplay mask, like the block dragon
    });
    const M = { root, look, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, state: '', y: look.ground ? 0 : -RAID_LIFT * look.scale,
      lastPos: r.pos.clone(), moving: 0 };
    gltf.animations.forEach(c => { M.actions[c.name] = M.mixer.clipAction(c); });
    r.body.children.forEach(c => { c.visible = false; });
    root.position.y = M.y;
    r.body.add(root);
    r.model = M;
    raidDragonPlay(M, look.ground ? 'idle' : 'fly', 0, true);
  }

  function raidDragonPlay(M, name, dur, restart) {
    const next = M.actions[name] || M.actions.fly || M.actions.idle;
    if (!next || (next === M.cur && !restart)) return;
    next.reset();
    if (RAID_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, 0.25, false);
    next.play();
    M.cur = next;
  }

  function raidDragonModelUpdate(r, dt) {
    const M = r.model;
    if (!M || !r.g.visible) return;
    if (M.look.ground) {
      // The Rex: how fast the game moved it this frame decides walk or idle while it chases
      const step = Math.hypot(r.pos.x - M.lastPos.x, r.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.moving += (step - M.moving) * Math.min(1, dt * 6);
      M.lastPos.copy(r.pos);
      const p = r.state === 'bite' ? ['bite', 1.3]
        : r.state === 'charge' ? (r.t < 0.8 ? ['roar', 0.8] : ['run', 0])
        : r.state === 'roar' ? ['roar', 1.4]
        : r.state === 'rest' ? ['rest', 0]
        : [M.moving > 0.8 ? 'walk' : 'idle', 0];
      raidDragonPlay(M, p[0], p[1], r.state !== M.state && !RAID_LOOPS.has(p[0]));
      M.state = r.state;
      M.mixer.update(dt);
      return;
    }
    // [clip, seconds]: the strafe hovers through its one-second wind-up, then runs the lane with the fast flap
    const pick = r.state === 'strafe' ? [r.t < 1 ? 'hover' : 'flee', 0]
      : r.state === 'hover' ? ['breath', 2.4]
      : r.state === 'rest' ? ['perch', 0]
      : ['fly', 0];
    raidDragonPlay(M, pick[0], pick[1], r.state !== M.state && !RAID_LOOPS.has(pick[0]));
    M.state = r.state;
    // Flying, the body's middle sits at the raider's position; resting, the feet stand on the ground under it
    const want = r.state === 'rest' ? -r.pos.y : -RAID_LIFT * M.look.scale;
    M.y += (want - M.y) * Math.min(1, dt * 4);
    M.root.position.y = M.y;
    M.mixer.update(dt);
  }

  raiders.forEach(r => { if (r.fly) loadRaidModel(r); });
