  // ---------- The Fallen Godlings: the modelled, animated gods (assets/creeps/godling.glb) ----------
  // Aurelion the Sunless and Varghast the Hollow Thunderer share one body: a tall robed figure behind a blank mask,
  // rigged without legs (the robe hides them) and animated by hand. Aurelion keeps the model's ivory and gold;
  // Varghast is repainted at load time on a canvas: cloth to storm violet, metal to pale silver. The block figure
  // drifts until the model arrives and stays if it fails to load. godlingModelUpdate(), called right after the
  // creeps update, maps each godling's state to a clip: idle while it hovers, drift while it moves, cast through
  // the 1.1 s strike (the arms come down as it lands), hurt when struck. The game floats and moves the godling.
  // The halo is still the game's own ring; the model glows a little, as a spirit should.
  const GD_SCALE = 1.55;        // the model is 3.0 m tall; the block figure runs from -1.2 to 3.46 inside c.body
  const GD_BASE = -1.2;         // where the block robe's hem hangs
  const GD_LOOPS = new Set(['idle', 'drift']);

  // Varghast's colours: saturated pixels are metal (-> pale silver), the rest is cloth and skin (-> storm violet)
  function stormTexture(map) {
    const img = map.image, c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, sat = mx ? (mx - mn) / mx : 0;
      let t = (sat - 0.22) / 0.2; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      const cl = l * 1.05, ml = Math.min(1, l * 1.55);
      p[i] = Math.round((138 * cl) * (1 - t) + (214 * ml) * t);
      p[i + 1] = Math.round((104 * cl) * (1 - t) + (220 * ml) * t);
      p[i + 2] = Math.round((214 * cl) * (1 - t) + (242 * ml) * t);
    }
    ctx.putImageData(d, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.flipY = map.flipY; tex.wrapS = map.wrapS; tex.wrapT = map.wrapT; tex.encoding = THREE.LinearEncoding;
    return tex;
  }

  function loadGodlingModels() {
    const A = window.MM_ASSETS;
    if (!A || !A.godling || !A.gltfLoader) return;
    const go = () => creeps.forEach(c => {
      if (c.type !== 'godling') return;
      // Textures load as <img> (img-src allows blob:); the default fetch() path is blocked by connect-src 'self'
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.godling, gltf => setupGodling(c, gltf), undefined, e => console.warn(`The ${c.godName} model did not load; keeping the block figure`, e));
    });
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.addEventListener('load', go);
    document.head.appendChild(s);
  }

  function setupGodling(c, gltf) {
    const root = gltf.scene, storm = /Varghast/.test(c.godName), mats = [];
    root.scale.setScalar(GD_SCALE);
    root.position.y = GD_BASE;
    root.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
        const src = o.material.map || o.material.emissiveMap;
        let map = src;
        try { if (storm && src && src.image) map = stormTexture(src); } catch (e) { console.warn(`${c.godName}: could not recolour the texture`, e); }
        if (map === src && src) { src.encoding = THREE.LinearEncoding; src.needsUpdate = true; }
        // A soft glow from its own colours: spirits are lit from within
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x555555, emissiveMap: map });
        mats.push(o.material);
      }
      o.layers.enable(2);   // hostile in the gameplay mask, like the block figure
    });
    const M = { root, mats, mixer: new THREE.AnimationMixer(root), actions: {}, cur: null, atk: null, hp: c.hp, one: 0,
      lastPos: c.pos.clone(), moving: 0 };
    gltf.animations.forEach(a => { M.actions[a.name] = M.mixer.clipAction(a); });
    c.body.children.forEach(ch => { if (ch !== c.halo) ch.visible = false; });
    c.body.add(root);
    c.model = M;
    godlingPlay(M, 'idle', 0, true);
  }

  function godlingPlay(M, name, dur, restart) {
    const next = M.actions[name] || M.actions.idle;
    if (!next || (next === M.cur && !restart)) return;
    next.reset();
    if (GD_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (M.cur && M.cur !== next) next.crossFadeFrom(M.cur, 0.2, false);
    next.play();
    M.cur = next;
  }

  function godlingModelUpdate(dt) {
    creeps.forEach(c => {
      const M = c.model;
      if (c.type !== 'godling' || !M) return;
      if (!c.alive || !c.g.visible) { M.hp = c.hp; M.atk = null; M.one = 0; M.lastPos.copy(c.pos); return; }
      const step = Math.hypot(c.pos.x - M.lastPos.x, c.pos.z - M.lastPos.z) / Math.max(dt, 1e-3);
      if (dt > 0) M.moving += (step - M.moving) * Math.min(1, dt * 5);
      M.lastPos.copy(c.pos);
      // Struck: a short recoil, unless it is in the middle of a strike
      if (c.hp < M.hp && !c.atk) { M.one = 0.45; godlingPlay(M, 'hurt', 0.45, true); }
      M.hp = c.hp;
      if (M.one > 0) M.one -= dt;
      if (c.atk) { godlingPlay(M, 'cast', 1.1, c.atk !== M.atk); M.one = 0; }
      else if (M.one <= 0) godlingPlay(M, M.moving > 0.6 ? 'drift' : 'idle', 0);
      M.atk = c.atk;
      const glow = 0.33 + 0.5 * (c.flash || 0);
      M.mats.forEach(m => m.emissive.setScalar(glow));
      M.mixer.update(dt);
    });
  }

  loadGodlingModels();
