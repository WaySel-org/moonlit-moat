  // ---------- The Moonstag: the modelled, animated mount (assets/mounts/moonstag.glb) ----------
  // Loaded after the game starts, like Moonlit Her and the Warden. Each stag at a sanctuary gets its own copy; the
  // block stag stays until the model arrives, and stays for good if it fails to load. mountModelUpdate(), called right
  // after updateBeasts, maps the beast's state (and the rider's action while ridden) to a clip, stretching one-shot
  // clips to the action's own duration. Every clip is in place: the game moves the beast, the clips only animate it.
  // The model is added to the beast's outer group, not its body, so the block stag's rear and jump tilts (beastPose)
  // don't stack on top of the clips' own.
  const MS_SCALE = 1.09;  // the model's back is 1.65 m; 1.09 puts it at the block stag's 1.8 m, under the rider's seat
  const MS_LOOPS = new Set(['idle', 'graze', 'walk', 'run', 'charge']);

  function loadMoonstagModels() {
    const A = window.MM_ASSETS;
    if (!A || !A.moonstag || !A.gltfLoader) return;
    const go = () => beasts.filter(b => b.type === 'stag').forEach(b => {
      // Textures load as <img> (img-src allows blob:); the default fetch() path is blocked by connect-src 'self'
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.moonstag, gltf => setupMoonstag(b, gltf), undefined, e => console.warn('The Moonstag model did not load; keeping the block stag', e));
    });
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.onload = go;
    document.head.appendChild(s);
  }

  function setupMoonstag(b, gltf) {
    const root = gltf.scene;
    root.scale.setScalar(MS_SCALE);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true });
      }
    });
    const M = { root, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, act: null, actT: 0, state: '', lastPos: b.g.position.clone(), speed: 0 };
    gltf.animations.forEach(c => { M.actions[c.name] = M.mixer.clipAction(c); });
    b.body.visible = false;
    b.g.add(root);
    b.model = M;
    moonstagPlay(M, 'idle', 0, true);
  }

  function moonstagPlay(M, name, dur, restart) {
    const next = M.actions[name] || M.actions.idle;
    if (!next || (next === M.cur && !restart)) return;
    next.reset();
    if (MS_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, 0.12, false);
    next.play();
    M.cur = next;
  }

  // [clip, seconds] for one stag; 0 seconds = loop at the clip's own speed
  function moonstagClip(b, M) {
    if (b.state === 'leaving') return b.leaveT < 0.9 ? ['rear', 0.9] : ['run', 0];
    if (b.state === 'ridden') {
      const a = P.act, d = P.actDur || 0.4;
      if (a === 'dead') return ['dead', 0];
      if (a === 'hurt') return ['hurt', d];
      if (a === 'roll' || a === 'leap') return ['charge', 0];
      if (a === 'gore') return P.gore === 'rampage' ? ['charge', 0] : P.gore === 'stomp' ? ['stomp', d] : ['toss', d];
      if (a === 'trample' || a === 'plunge') return ['stomp', d];
      if (a === 'airslash') return ['toss', d];
      if (isMp(a)) return P.mpKind === 'toss' ? ['toss', d] : ['stomp', d];
      return M.speed > 0.5 ? ['run', 0] : ['idle', 0];
    }
    return M.speed > 2 ? ['run', 0] : M.speed > 0.3 ? ['walk', 0] : ['idle', 0];
  }

  function mountModelUpdate(dt) {
    beasts.forEach(b => {
      const M = b.model;
      if (!M || !b.g.visible) return;
      // How fast the game moved it this frame, smoothed so a one-frame stop doesn't flicker
      const step = Math.hypot(b.g.position.x - M.lastPos.x, b.g.position.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.speed += (step - M.speed) * Math.min(1, dt * 8);
      M.lastPos.copy(b.g.position);
      const [name, dur] = moonstagClip(b, M);
      // A new action, or the same action started again (its timer went back), restarts a one-shot clip
      const ridden = b.state === 'ridden', act = ridden ? P.act : null, actT = ridden ? P.actT || 0 : 0;
      const restart = !MS_LOOPS.has(name) && (act !== M.act || actT < M.actT || b.state !== M.state);
      M.act = act; M.actT = actT; M.state = b.state;
      moonstagPlay(M, name, dur, restart);
      M.mixer.update(dt);
    });
  }

  loadMoonstagModels();
