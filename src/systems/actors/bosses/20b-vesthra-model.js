  // ---------- Vesthra: the modelled, animated gorgon (assets/bosses/vesthra.glb) ----------
  // A serpent-bodied rig (no legs: Mixamo-named upper body + a 12-bone tail) made in the character-design pipeline.
  // Loaded after the game starts, like Moonlit Her; the sphere figure fights until she arrives. Her fight logic is
  // untouched (20-rooftop-royals.js, 46g-boss-kits.js): vesthraModelUpdate() only reads r.state / r.atk and picks a clip.
  const VES = { ready: false, root: null, mixer: null, actions: {}, cur: null, curName: '', mats: [], kitSeen: 0, last: null, speed: 0, vx: 0, vz: 0 };
  const VES_SCALE = 1.2;     // her model is 2.0 m; inside the royal's 1.15 group she stands about 2.75 m, like the old figure
  const VES_LOOPS = new Set(['idle', 'move_f', 'move_b', 'move_l', 'move_r']);

  function loadVesthra() {
    const A = window.MM_ASSETS;
    if (!A || !A.vesthra || !A.gltfLoader) return;
    const go = () => {
      const loader = new THREE.GLTFLoader().register(parser => {
        // blob: textures through <img>, not fetch(): the CSP's connect-src 'self' blocks blob: (see 09d-moonlit-her.js)
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.vesthra, setupVesthra, undefined, e => console.warn('Vesthra did not load; keeping the sphere figure', e));
    };
    if (THREE.GLTFLoader) return go();
    // Moonlit Her's file adds the loader script; add it ourselves only if it isn't on the page
    if (![...document.scripts].some(s => s.src && s.src.indexOf(A.gltfLoader) >= 0)) {
      const s = document.createElement('script'); s.src = A.gltfLoader; document.head.appendChild(s);
    }
    let tries = 0;
    const wait = setInterval(() => { if (THREE.GLTFLoader) { clearInterval(wait); go(); } else if (++tries > 150) clearInterval(wait); }, 200);
  }

  function setupVesthra(gltf) {
    const r = royals.find(x => x.kind === 'gorgon');
    if (!r) return;
    const root = gltf.scene;
    root.scale.setScalar(VES_SCALE);
    root.position.y = 0.998 * VES_SCALE; // the model's origin is at its middle; this puts the tail on the roof
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        // Lambert like the rest of the game. The body is textured and skinned; the two sickles (in the GLB,
        // parented to her hand bones) are plain bronze/leather colours, so keep each material's colour.
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const lam = mats.map(m => {
          const map = m.map;
          if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
          const l = new THREE.MeshLambertMaterial({ map, skinning: !!o.isSkinnedMesh });
          if (!map) l.color.copy(m.color); // glTF colours are already linear
          VES.mats.push(l);
          return l;
        });
        o.material = Array.isArray(o.material) ? lam : lam[0];
      }
    });
    VES.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { VES.actions[c.name] = VES.mixer.clipAction(c); });
    // Swap: hide the sphere figure (and its sickles) but keep the pivots the attack code turns
    r.body.children.forEach(c => { c.visible = c === r.pivot || c === r.off; });
    [r.pivot, r.off].forEach(p => p.children.forEach(c => { c.visible = false; }));
    r.body.add(root);
    r.model = root;
    VES.root = root; VES.ready = true;
    VES.kitSeen = r.kitAt || 0;
    playVesthra('idle', 0);
  }

  function playVesthra(name, dur) {
    const next = VES.actions[name] || VES.actions.idle;
    if (!next || next === VES.cur) return;
    next.reset();
    if (!VES_LOOPS.has(name) && dur) {
      next.setLoop(THREE.LoopOnce); next.clampWhenFinished = true;
      next.timeScale = next.getClip().duration / dur;
    } else { next.setLoop(THREE.LoopRepeat); next.timeScale = 1; }
    if (VES.cur) next.crossFadeFrom(VES.cur, 0.12, false);
    next.play();
    VES.cur = next; VES.curName = name;
  }

  let vesSlash = 0, vesRoarT = 0;
  function vesthraClip(r) {
    if (r.state === 'dead') return ['dead', 1.6];
    if (r.state === 'stagger') return ['hurt', Math.max(0.3, r.dur || 0.4)];
    if (r.state === 'attack' && r.atk) {
      const A = r.atk, total = (A.wind || 0) + (A.act || 0) + (A.rec || 0);
      if (A.name === 'coil') return ['heavy', total];   // tail sweep all around her: the big spinning swing
      if (A.name === 'gaze') return ['gaze', total];    // stone gaze: both hands up, a cast
      if (A.name === 'bash') return ['lunge', total];   // charge at the hero
      return [vesSlash % 2 ? 'slash2' : 'slash1', total || 0.8];
    }
    if (vesRoarT > 0) return ['roar', 1.4];             // a kit (serpent rain, stone ring) was just cast
    if (VES.speed > 0.4) {                                // gliding: pick the slither that matches her direction
      const f = fwdOf(r.facing), fwd = VES.vx * f.x + VES.vz * f.z, left = VES.vx * f.z - VES.vz * f.x;
      if (Math.abs(fwd) >= Math.abs(left)) return [fwd >= 0 ? 'move_f' : 'move_b', 0];
      return [left > 0 ? 'move_l' : 'move_r', 0];
    }
    return ['idle', 0];
  }

  function vesthraModelUpdate(r, dt) {
    if (!VES.ready || r !== royals.find(x => x.kind === 'gorgon')) return;
    if ((r.kitAt || 0) !== VES.kitSeen) { VES.kitSeen = r.kitAt || 0; vesRoarT = 1.4; }
    vesRoarT = Math.max(0, vesRoarT - dt);
    // ground speed from her position, smoothed (royalStep and the field hunt move r.pos directly)
    if (VES.last && dt > 0) {
      const k = Math.min(1, dt * 8), vx = (r.pos.x - VES.last.x) / dt, vz = (r.pos.z - VES.last.z) / dt;
      VES.vx += (vx - VES.vx) * k; VES.vz += (vz - VES.vz) * k;
      VES.speed = Math.min(20, Math.hypot(VES.vx, VES.vz));
    }
    VES.last = { x: r.pos.x, z: r.pos.z };
    const [name, dur] = vesthraClip(r);
    if (name !== VES.curName) { if (/^slash/.test(VES.curName)) vesSlash++; playVesthra(name, dur); }
    VES.mixer.update(dt);
    const f = r.flash || 0;
    VES.mats.forEach(m => m.emissive.setRGB(f * 0.9, f * 0.8, f * 0.6));
  }

  loadVesthra();
