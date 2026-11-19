  // ---------- Vesthra, the Gorgon: the modelled, animated boss (assets/bosses/vesthra.glb) ----------
  // A woman's torso on a serpent's body: the tail drops to the floor and runs out behind her. Rigged without legs
  // (tools/rig_serpent.py) and animated by hand. Loaded on approach or at the start of the rooftop fight. The block figure
  // fights until the model arrives and stays if it fails to load. vesthraModelUpdate(), called right after the royals update,
  // maps her state to a clip: idle, slither when she moves (the ripple speeds up with her), coil for the tail sweep,
  // gaze for the stone gaze and her kit spells, lunge for the sickle dash and for devouring a creep in the field, hurt
  // when staggered or struck, dead when she falls. Every clip is in place: updateRoyal moves and turns her.
  // Her twin sickles are the block figure's own, moved into her hands; while she stares, her body glows gorgon green.
  const VM = { ready: false, requested: false, r: royals.find(r => r.kind === 'gorgon'), root: null, mixer: null, actions: {}, cur: null, mats: [], hands: [], arms: [],
    grips: [], atk: null, state: '', kitAt: 0, one: null, oneT: 0, oneT0: 0, lastPos: new THREE.Vector3(), moving: 0,
    hp: 0, devour: false };
  const VM_SCALE = 0.95;         // 2.7 m to the crown of snakes in the model; inside r.g (x1.15) about Nyxara's height
  const VM_LOOPS = new Set(['idle', 'slither']);
  const VM_COIL_AT = 28 / 45, VM_GAZE_AT = 29 / 36, VM_LUNGE_AT = 16 / 40;   // where each strike lands in its clip
  const VM_SLITHER_PACE = 2.6;   // her rooftop speed; the ripple runs faster or slower with her real speed

  function loadVesthraModel() {
    if (VM.requested || !VM.r) return;
    VM.requested = true;
    loadModel('vesthra', setupVesthraModel, 'The Vesthra model did not load; keeping the block figure');
  }

  function setupVesthraModel(gltf) {
    const r = VM.r, root = gltf.scene;
    root.scale.setScalar(VM_SCALE);
    const bones = {};
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map || o.material.emissiveMap;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
        VM.mats.push(o.material);
      }
      if (o.isBone) bones[o.name.replace(/[^A-Za-z0-9]/g, '')] = o;
    });
    VM.hands = [bones.handL, bones.handR];
    VM.arms = [bones.forearmL, bones.forearmR];
    VM.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { VM.actions[c.name] = VM.mixer.clipAction(c); });
    // Swap: hide the block shapes; each sickle (handle + blade) moves from its pivot into a grip that follows a hand
    r.body.children.forEach(c => { if (c !== r.pivot && c !== r.off) c.visible = false; });
    [r.pivot, r.off].forEach(p => {
      const grip = new THREE.Group();
      [...p.children].forEach(m => { p.remove(m); grip.add(m); });
      grip.children.forEach(m => { m.position.z -= 0.3; });   // hold the handle in the fist, not at its end
      r.body.add(grip); VM.grips.push(grip);
    });
    r.body.add(root);
    // Hostile in the gameplay mask, like the block figure (tag() ran before these existed)
    [root, ...VM.grips].forEach(o => o.traverse(c => c.layers.enable(2)));
    VM.root = root; VM.lastPos.copy(r.pos); VM.kitAt = r.kitAt || 0; VM.hp = r.hp;
    VM.ready = true;
    vesthraPlay('idle', 0, true);
  }

  function vesthraPlay(name, dur, restart) {
    const next = VM.actions[name] || VM.actions.idle;
    if (!next || (next === VM.cur && !restart)) return;
    next.reset();
    if (VM_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (VM.cur && VM.cur !== next) next.crossFadeFrom(VM.cur, 0.15, false);
    next.play();
    VM.cur = next;
  }

  // [clip, seconds] for her current state; 0 seconds = loop at the clip's own speed
  function vesthraClip(r) {
    const A = r.atk;
    if (r.state === 'dead' || !r.alive) return ['dead', 0];
    if (r.state === 'stagger') return ['hurt', 0.6];
    if (r.state === 'attack' && A) {
      if (A.name === 'coil') return ['coil', A.wind / VM_COIL_AT];
      if (A.name === 'gaze') return ['gaze', A.wind / VM_GAZE_AT];
      if (A.name === 'bash') return ['lunge', A.wind / VM_LUNGE_AT];
    }
    if (VM.one) return [VM.one, VM.oneT0];
    return [VM.moving > 0.6 ? 'slither' : 'idle', 0];
  }

  function vesthraOne(name, dur) { VM.one = name; VM.oneT0 = VM.oneT = dur; vesthraPlay(name, dur, true); }

  const _vh = new THREE.Vector3(), _va = new THREE.Vector3(), _vd = new THREE.Vector3(), _vz = new THREE.Vector3(0, 0, 1);
  function vesthraModelUpdate(dt) {
    const r = VM.r;
    if (!VM.requested && r && r.g.visible && flatDist(r.pos, player.position) < 30) loadVesthraModel();
    if (!VM.ready) return;
    if (!r.g.visible) { VM.lastPos.copy(r.pos); VM.hp = r.hp; return; }
    // The clips carry the stagger and the fall; the block figure's own tilt would double them
    r.body.rotation.x = 0;
    // Her speed, smoothed; a respawn or a crossing jumps her across the map, which is not travel
    let sp = Math.hypot(r.pos.x - VM.lastPos.x, r.pos.z - VM.lastPos.z) / Math.max(dt, 1e-3);
    if (sp > 15) sp = 0;
    if (dt > 0) VM.moving += (sp - VM.moving) * Math.min(1, dt * 6);
    VM.lastPos.copy(r.pos);
    // One-shots with no attack state of their own: her kit spells (a stare), devouring a creep (a lunge), a hit
    if (r.alive && r.state !== 'attack' && r.state !== 'stagger') {
      if ((r.kitAt || 0) !== VM.kitAt) vesthraOne('gaze', 1.2);
      else if (r.field && r.pivot.rotation.x < -1.0) { if (!VM.devour) vesthraOne('lunge', 1.0); VM.devour = true; }
      else if (r.hp < VM.hp && !VM.one) vesthraOne('hurt', 0.45);
    }
    if (r.pivot.rotation.x > -1.0) VM.devour = false;
    VM.kitAt = r.kitAt || 0; VM.hp = r.hp;
    if (VM.one) { VM.oneT -= dt; if (VM.oneT <= 0 || r.state === 'attack' || r.state === 'stagger' || !r.alive) VM.one = null; }
    const [name, dur] = vesthraClip(r);
    const restart = !VM_LOOPS.has(name) && !VM.one && (r.atk !== VM.atk || r.state !== VM.state);
    VM.atk = r.atk; VM.state = r.state;
    vesthraPlay(name, dur, restart);
    if (name === 'slither') VM.cur.timeScale = clamp(VM.moving / VM_SLITHER_PACE, 0.7, 2.2);
    // Hit flash from the block figure's robe; a gorgon-green glow while the stare builds (its eyes go white-hot)
    const A = r.atk, stare = r.alive && A && A.name === 'gaze' && A.stage === 'wind' ? A.t / A.wind : (VM.one === 'gaze' ? 0.5 : 0);
    VM.mats.forEach(m => m.emissive.setRGB(r.robe.emissive.r + 0.12 * stare, r.robe.emissive.g + 0.3 * stare, r.robe.emissive.b + 0.05 * stare));
    VM.mixer.update(dt);
    // Sickles: in each fist, the handle along the forearm, blade beyond the hand
    VM.root.updateMatrixWorld(true);
    VM.grips.forEach((g, i) => {
      const h = VM.hands[i], f = VM.arms[i];
      g.visible = !!h && (r.alive || r.t < 0.6);
      if (!h) return;
      h.getWorldPosition(_vh); f.getWorldPosition(_va);
      r.body.worldToLocal(_vh); r.body.worldToLocal(_va);
      g.position.copy(_vh);
      _vd.subVectors(_vh, _va).normalize();
      g.quaternion.setFromUnitVectors(_vz, _vd);
    });
  }
