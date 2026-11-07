  // ---------- The Gate Warden: the modelled, animated boss (assets/bosses/warden.glb) ----------
  // Loaded after the game starts, like Moonlit Her; the block figure fights until the model arrives, and stays if it
  // fails to load. wardenModelUpdate(), called right after updateBoss, maps B.state / B.atk to a clip, stretches
  // one-shot clips to the behaviour's own timings, carries the hammer in the right hand and hangs a swinging cape from the
  // upper spine. Every clip is in place: updateBoss moves the boss, the clips only animate it.
  const WM = { ready: false, mixer: null, actions: {}, cur: null, curName: '', atk: null, state: '', mats: [], hand: null, spine: null, lArm: null, rArm: null, lastPos: new THREE.Vector3(), moving: 0 };
  const WM_SCALE = 2.3;       // the model is 1.88 m tall; the block figure is about 4.3 units inside bBody
  const WM_LOOPS = new Set(['idle', 'walk', 'run']);
  // The hammer: the haft runs along the fist, the head out past the thumb
  const WM_GRIP_ROT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
  const hammerGrip = new THREE.Group();
  const capeHang = new THREE.Group();
  // The cape: a strip of CAPE_N hinged rows hanging from the shoulders. Each hinge swings back with forward speed,
  // lifts when falling or spinning, sways sideways when turning and settles back to hanging straight down.
  const CAPE_N = 8, CAPE_W = 1.5, CAPE_L = 2.6;
  const CAPE = { a: new Float32Array(CAPE_N), av: new Float32Array(CAPE_N), side: 0, sideV: 0, vel: new THREE.Vector3(), yaw: 0, yawRate: 0, t: 0 };

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
    cape.geometry.dispose(); cape.geometry = new THREE.PlaneGeometry(CAPE_W, CAPE_L, 1, CAPE_N);
    capeHang.add(cape); cape.visible = true; cape.position.set(0, 0, 0); cape.frustumCulled = false;
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

  function swingCape(dt, worldYaw) {
    dt = Math.min(dt, 0.05);
    const C = CAPE; if (!C.t) C.yaw = worldYaw; C.t += dt;
    const dy = angDiff(C.yaw, worldYaw); C.yaw = worldYaw;
    C.yawRate += (dy / Math.max(dt, 1e-3) - C.yawRate) * Math.min(1, dt * 8);
    const fwd = C.vel.x * Math.sin(worldYaw) + C.vel.z * Math.cos(worldYaw);
    const fall = Math.max(0, -C.vel.y), spin = Math.abs(C.yawRate);
    // How far back the cape wants to fly (radians from hanging straight down)
    const drive = Math.min(1.35, Math.max(0, fwd) * 0.13 + fall * 0.09 + spin * 0.12);
    for (let i = 0; i < CAPE_N; i++) {
      const k = i / (CAPE_N - 1);
      const flutter = (0.04 + drive * 0.12) * Math.sin(C.t * (5 + drive * 6) - i * 0.9);
      const want = drive * (0.55 + 0.45 * k) + flutter;
      const prev = i ? C.a[i - 1] : 0;
      // Spring toward its target, pulled toward the hinge above it so the strip stays a smooth curve
      C.av[i] += ((want - C.a[i]) * (34 - 14 * k) + (prev - C.a[i]) * 10 - C.av[i] * 7) * dt;
      C.a[i] = Math.min(1.45, Math.max(-0.12, C.a[i] + C.av[i] * dt));
    }
    // Sideways: turning flings the hem to the outside of the turn
    C.sideV += ((-C.yawRate * 0.18 - C.side) * 20 - C.sideV * 6) * dt;
    C.side = Math.max(-0.7, Math.min(0.7, C.side + C.sideV * dt));
    // Rebuild the vertices row by row (PlaneGeometry rows run top to bottom, two vertices per row)
    const pos = cape.geometry.attributes.position, seg = CAPE_L / CAPE_N;
    let y = 0, z = 0, x = 0;
    for (let r = 0; r <= CAPE_N; r++) {
      if (r > 0) {
        const a = C.a[r - 1], sd = C.side * (r / CAPE_N);
        y -= Math.cos(a) * Math.cos(sd) * seg; z -= Math.sin(a) * seg; x += Math.sin(sd) * seg;
      }
      const half = CAPE_W / 2 * (1 + 0.15 * r / CAPE_N); // a little wider at the hem
      pos.setXYZ(r * 2, x - half, y, z); pos.setXYZ(r * 2 + 1, x + half, y, z);
    }
    pos.needsUpdate = true;
    cape.geometry.computeVertexNormals();
  }

  const _ww = new THREE.Vector3(), _wq = new THREE.Quaternion(), _wb = new THREE.Quaternion(), _wl = new THREE.Vector3(), _wr = new THREE.Vector3(), _wv = new THREE.Vector3();
  function wardenModelUpdate(dt) {
    if (!WM.ready) return;
    // Walking or standing: how far updateBoss moved it this frame (smoothed so a one-frame stop doesn't flicker)
    const step = Math.hypot(boss.position.x - WM.lastPos.x, boss.position.z - WM.lastPos.z) / Math.max(dt, 1e-3);
    WM.moving += ((step > 0.5 ? 1 : 0) - WM.moving) * Math.min(1, dt * 8);
    if (dt > 0) CAPE.vel.lerp(_wv.subVectors(boss.position, WM.lastPos).divideScalar(dt), Math.min(1, dt * 10));
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
    // Cape from the upper back, turned with the shoulders (right-to-left arm line x up = forward), then swung
    if (WM.spine && WM.lArm && WM.rArm) {
      WM.spine.getWorldPosition(_ww); bBody.worldToLocal(_ww);
      WM.lArm.getWorldPosition(_wl); bBody.worldToLocal(_wl);
      WM.rArm.getWorldPosition(_wr); bBody.worldToLocal(_wr);
      const yaw = Math.atan2(-(_wl.z - _wr.z), _wl.x - _wr.x);
      capeHang.position.set(_ww.x - Math.sin(yaw) * 0.55, _ww.y + 0.35, _ww.z - Math.cos(yaw) * 0.55);
      capeHang.rotation.set(0, yaw, 0);
      swingCape(dt, boss.rotation.y + yaw);
    }
    // Hit flash and the dead visor, as the block figure's armour did
    for (const m of WM.mats) m.emissive.copy(armor.emissive);
  }

  loadWardenModel();
