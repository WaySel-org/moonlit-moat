  // ---------- The Gate Warden: the modelled, animated boss (assets/bosses/warden.glb) ----------
  // Loaded after the game starts, like Moonlit Her; the block figure fights until the model arrives, and stays if it
  // fails to load. wardenModelUpdate(), called right after updateBoss, maps B.state / B.atk to a clip, stretches
  // one-shot clips to the behaviour's own timings, carries the hammer in the right hand and hangs the cape from the
  // upper spine. Every clip is in place: updateBoss moves the boss, the clips only animate it.
  const WM = { ready: false, mixer: null, actions: {}, cur: null, curName: '', atk: null, state: '', mats: [], hand: null, spine: null, lArm: null, rArm: null, lastPos: new THREE.Vector3(), moving: 0 };
  const WM_SCALE = 2.3;       // the model is 1.88 m tall; the block figure is about 4.3 units inside bBody
  const WM_LOOPS = new Set(['idle', 'walk', 'run']);
  // The hammer: the haft runs along the fist, the head out past the thumb
  const WM_GRIP_ROT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
  const hammerGrip = new THREE.Group();
  const capeHang = new THREE.Group();

  function loadWardenModel() {
    const A = window.MM_ASSETS;
    if (!A || !A.warden || !A.gltfLoader) return;
    const go = () => {
      // Textures load as <img> (img-src allows blob:); the default fetch() path is blocked by connect-src 'self'
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.warden, setupWardenModel, undefined, e => console.warn('The Warden model did not load; keeping the block figure', e));
    };
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.onload = go;
    document.head.appendChild(s);
  }

  function setupWardenModel(gltf) {
    const root = gltf.scene;
    root.scale.setScalar(WM_SCALE);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
        WM.mats.push(o.material);
      }
      if (o.isBone && /RightHand$/.test(o.name)) WM.hand = o;
      if (o.isBone && /Spine2$/.test(o.name)) WM.spine = o;
      if (o.isBone && /LeftArm$/.test(o.name)) WM.lArm = o;
      if (o.isBone && /RightArm$/.test(o.name)) WM.rArm = o;
    });
    WM.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { WM.actions[c.name] = WM.mixer.clipAction(c); });
    // Swap: hide the block shapes; the hammer and cape move onto the model
    bBody.children.forEach(c => { c.visible = false; });
    wPivot.visible = false;
    [handle, hammerHead].forEach(m => { wPivot.remove(m); hammerGrip.add(m); m.visible = true; });
    // Grip near the butt of the haft: the haft runs along +y from the fist, the head at its far end
    handle.rotation.set(0, 0, 0); handle.position.set(0, 0.9, 0);
    hammerHead.position.set(0, 2.3, 0);
    bBody.add(hammerGrip);
    capeHang.add(cape); cape.visible = true; cape.position.set(0, -1.25, 0);
    bBody.add(capeHang);
    bBody.add(root);
    WM.lastPos.copy(boss.position);
    WM.ready = true;
  }

  // [clip, seconds] for the boss's current state; 0 seconds = loop at the clip's own speed
  function wardenClip() {
    const A = B.atk;
    if (B.state === 'dead') return ['dead', 0];
    if (B.state === 'stagger') return ['hurt', B.dur];
    if (B.state === 'roar') return ['roar', 1.5];
    if (B.state === 'leap' || B.state === 'retreat') return ['leap', B.dur];
    if (B.state === 'attack' && A) {
      if (A.name === 'slam') return ['slam', A.wind + A.rec];
      if (A.name === 'sweep') return ['sweep', A.wind + A.act + A.rec];
      if (A.name === 'leap') return ['leap', A.wind + A.air + A.rec];
      if (A.name === 'charge') return A.stage === 'act' ? ['run', 0] : ['idle', 0];
    }
    if (B.state === 'chase' && WM.moving > 0.5) return [B.phase === 2 ? 'run' : 'walk', 0];
    return ['idle', 0];
  }

  function wardenPlay(name, dur, restart) {
    const next = WM.actions[name] || WM.actions.idle;
    if (!next || (next === WM.cur && !restart)) return;
    next.reset();
    if (WM_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (WM.cur && WM.cur !== next) next.crossFadeFrom(WM.cur, 0.12, false);
    next.play();
    WM.cur = next; WM.curName = name;
  }

  const _ww = new THREE.Vector3(), _wq = new THREE.Quaternion(), _wb = new THREE.Quaternion(), _wl = new THREE.Vector3(), _wr = new THREE.Vector3();
  function wardenModelUpdate(dt) {
    if (!WM.ready) return;
    // Walking or standing: how far updateBoss moved it this frame (smoothed so a one-frame stop doesn't flicker)
    const step = Math.hypot(boss.position.x - WM.lastPos.x, boss.position.z - WM.lastPos.z) / Math.max(dt, 1e-3);
    WM.moving += ((step > 0.5 ? 1 : 0) - WM.moving) * Math.min(1, dt * 8);
    WM.lastPos.copy(boss.position);

    const [name, dur] = wardenClip();
    const restart = (B.atk && B.atk !== WM.atk) || (B.state !== WM.state && !WM_LOOPS.has(name));
    WM.atk = B.atk; WM.state = B.state;
    wardenPlay(name, dur, restart);
    WM.mixer.update(dt);

    // The clips animate the body, so cancel the block figure's tilts and bobs (the spin attack's own turn included)
    bBody.rotation.set(0, 0, 0); bBody.position.y = 0;
    boss.rotation.y = B.facing;

    bBody.updateMatrixWorld(true);
    bBody.getWorldQuaternion(_wb).invert();
    // Hammer in the right fist
    if (WM.hand) {
      WM.hand.getWorldPosition(_ww); bBody.worldToLocal(_ww);
      hammerGrip.position.copy(_ww);
      WM.hand.getWorldQuaternion(_wq);
      hammerGrip.quaternion.copy(_wb).multiply(_wq).multiply(WM_GRIP_ROT);
    }
    // Cape from the upper back, hanging straight down, turned with the shoulders (right-to-left arm line x up = forward)
    if (WM.spine && WM.lArm && WM.rArm) {
      WM.spine.getWorldPosition(_ww); bBody.worldToLocal(_ww);
      WM.lArm.getWorldPosition(_wl); bBody.worldToLocal(_wl);
      WM.rArm.getWorldPosition(_wr); bBody.worldToLocal(_wr);
      const yaw = Math.atan2(-(_wl.z - _wr.z), _wl.x - _wr.x);
      capeHang.position.set(_ww.x - Math.sin(yaw) * 0.55, _ww.y + 0.35, _ww.z - Math.cos(yaw) * 0.55);
      capeHang.rotation.set(0, yaw, 0);
    }
    // Hit flash and the dead visor, as the block figure's armour did
    for (const m of WM.mats) m.emissive.copy(armor.emissive);
  }

  loadWardenModel();
