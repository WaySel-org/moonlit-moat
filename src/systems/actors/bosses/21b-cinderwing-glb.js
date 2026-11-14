  // ---------- Cinderwing: the modelled, animated dragon (assets/bosses/cinderwing.glb) ----------
  // Loaded after the game starts, like the Warden; the block dragon flies until the model arrives, and stays if it
  // fails to load. cinderwingModelUpdate(), called right after updateDragon, maps the dragon's state to a clip:
  // fly and glide while circling, a roar when it turns angry, fireball and breath timed to the attack's wind-up,
  // hurt when struck, flee when driven off. Every clip is in place: updateDragon flies it, the clips only animate it.
  // The clips were keyed by hand in Blender (anim_quadruped.py --set dragon); the rig has no jaw bone, so the
  // fire still leaves from the old jaw marker, now carried at the model's snout.
  const CW = { ready: false, root: null, mixer: null, actions: {}, cur: null, curName: '', mats: [], tagged: false,
    one: null, oneT: 0, angry: 0, atk: null, hp: 0, glideT: 0 };
  const CW_SCALE = 1.2;          // 7.45 m snout to tail in the model; about the block dragon's length inside D.g (x1.5)
  const CW_LIFT = 1.0;           // the flight clips carry the body 1 m above the model's origin
  const CW_LOOPS = new Set(['fly', 'flee', 'glide', 'hover', 'perch', 'walk']);
  const CW_FIREBALL_AT = 0.48;   // fraction of the fireball clip where the neck thrusts forward

  function loadCinderwingModel() {
    loadModel('cinderwing', setupCinderwingModel, 'The Cinderwing model did not load; keeping the block dragon');

  }

  function setupCinderwingModel(gltf) {
    const D = dragon, root = gltf.scene;
    root.scale.setScalar(CW_SCALE);
    // Sit the flying body where the block torso was (torso centre 0.4 above D.body's origin)
    root.position.y = 0.4 - (CW_LIFT + 1.2) * CW_SCALE;
    let mesh = null, headBone = null;
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        // Built like the mounts: the painted texture is the emissive map (unlit bake), not the base colour
        const map = o.material.map || o.material.emissiveMap;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
        CW.mats.push(o.material);
        if (o.isSkinnedMesh) mesh = o;
      }
      if (o.isBone && o.name === 'head') headBone = o;
    });
    // Swap: hide the block shapes (they keep animating unseen) and move the jaw marker and fire light to the snout
    D.body.children.forEach(c => { c.visible = false; });
    D.body.add(root);
    root.updateMatrixWorld(true);
    if (mesh && headBone) {
      // The snout: the most forward vertex near the middle line, in the rest pose
      const pos = mesh.geometry.attributes.position, v = new THREE.Vector3(), best = new THREE.Vector3();
      let bz = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (Math.abs(v.x) < 0.35 && v.z > bz) { bz = v.z; best.copy(v); }
      }
      const snout = new THREE.Group();
      headBone.add(snout);
      snout.position.copy(headBone.worldToLocal(mesh.localToWorld(best.clone())));
      [D.jaw, D.light].forEach(o => { o.parent.remove(o); snout.add(o); o.position.set(0, 0, 0); });
      D.jaw.visible = false;
    }
    CW.root = root;
    CW.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { CW.actions[c.name] = CW.mixer.clipAction(c); });
    CW.angry = D.angry; CW.hp = D.hp;
    CW.ready = true;
    cwPlay('fly', 0, true);
  }

  function cwPlay(name, dur, restart) {
    const next = CW.actions[name] || CW.actions.fly;
    if (!next || (next === CW.cur && !restart)) return;
    next.reset();
    if (CW_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (CW.cur && CW.cur !== next) next.crossFadeFrom(CW.cur, name === 'hurt' ? 0.06 : 0.2, false);
    next.play();
    CW.cur = next; CW.curName = name;
  }

  // A short one-shot (roar, hurt) that plays over the circling loop, then hands back to it
  function cwOneShot(name, dur) { CW.one = name; CW.oneT = dur; cwPlay(name, dur, true); }

  function cinderwingModelUpdate(dt) {
    if (!CW.ready) return;
    const D = dragon, A = D.atk;
    if (!D.g.visible) { CW.angry = D.angry; CW.hp = D.hp; return; }
    D.body.position.y = 0;   // the clips bob the body; the block figure's flap bob would double it
    // Hit flash, from the block dragon's material
    CW.mats.forEach(m => m.emissive.copy(dScale.emissive));
    // Hostile in the gameplay mask once the block dragon has been tagged (when it first turns angry)
    if (!CW.tagged && D.g.userData.mk2) { CW.root.traverse(o => o.layers.enable(2)); CW.tagged = true; }

    if (D.state === 'flee') { cwPlay('flee', 0); CW.one = null; }
    else if (A) {
      // A new attack restarts its clip; the fireball's thrust lands on the moment it fires
      const fresh = A !== CW.atk;
      if (A.name === 'fireball') cwPlay('fireball', A.wind / CW_FIREBALL_AT, fresh);
      else cwPlay('breath', A.wind + A.burn + 0.2, fresh);
      CW.one = null;
    } else {
      if (D.angry > 0 && CW.angry <= 0) cwOneShot('roar', 1.5);
      else if (D.hp < CW.hp && CW.one !== 'roar') cwOneShot('hurt', 0.5);
      if (CW.one) { CW.oneT -= dt; if (CW.oneT <= 0) CW.one = null; }
      if (!CW.one) {
        // Calm, it rests its wings now and then; angry, it keeps beating
        CW.glideT += dt;
        const glide = D.angry <= 0 && Math.sin(CW.glideT * 0.35) > 0.45;
        cwPlay(glide ? 'glide' : 'fly', 0);
      }
    }
    CW.atk = A; CW.angry = D.angry; CW.hp = D.hp;
    CW.mixer.update(dt);
  }

  loadCinderwingModel();
