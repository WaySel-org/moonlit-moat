  // ---------- Nyxara, the Thorn Empress: the modelled, animated boss (assets/bosses/nyxara.glb) ----------
  // Loaded after the game starts, like the Warden; the block figure fights until the model arrives, and stays if it
  // fails to load. nyxaraModelUpdate(), called right after the royals update, maps her state to a clip: idle and move
  // while hovering, walk / run / walkback when she travels (she sets down on the floor for these and lifts off again
  // when she stops), fan for the thorn fan, burst for the pyre and her kit spells, vanish for the blink, hurt when
  // staggered, dead when she falls. Every clip is in place: updateRoyal moves her, the clips only animate her.
  // Added back in code, as her style bible asks: two wings of overlapping briar leaves on the upper spine that beat
  // slowly and flare when she casts, and her staff, carried upright in the right hand. The thorn shards are unchanged.
  const NM = { ready: false, r: null, root: null, mixer: null, actions: {}, cur: null, curName: '', mats: [], hand: null, spine: null,
    atk: null, state: '', kitAt: 0, one: null, oneT: 0, lastPos: new THREE.Vector3(), moving: 0, flare: 0, wings: [],
    vx: 0, vz: 0, gait: '', ground: 0, yaw: 0 };
  const NM_SCALE = 1.45;        // 1.99 m to the horn tips in the model; about the block figure's height inside r.g (x1.15)
  const NM_GAITS = new Set(['walk', 'run', 'walkback']);
  const NM_LOOPS = new Set(['idle', 'move', ...NM_GAITS]);
  // Ground speed (game units/s) each gait's feet match at timeScale 1, at her size in the game; the clip is sped up or
  // slowed to the real speed so the feet don't slide. Walking starts above NM_WALK_ON, stops below NM_WALK_OFF;
  // she runs above NM_RUN_AT (the field chase and the hunt), walks the rooftop's 2.2-2.6.
  const NM_PACE = { walk: 2.3, run: 5.6, walkback: 2.0 };
  const NM_WALK_ON = 1.0, NM_WALK_OFF = 0.6, NM_RUN_AT = 3.3;
  const NM_FAN_AT = 0.45, NM_BURST_AT = 0.6;   // fraction of the clip where the cast lands
  const staffGrip = new THREE.Group(), wingRoot = new THREE.Group();

  function loadNyxaraModel() {
    const A = window.MM_ASSETS;
    NM.r = royals.find(r => r.kind === 'empress');
    if (!A || !A.nyxara || !A.gltfLoader || !NM.r) return;
    const go = () => {
      // Textures load as <img> (img-src allows blob:); the default fetch() path is blocked by connect-src 'self'
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.nyxara, setupNyxaraModel, undefined, e => console.warn('The Nyxara model did not load; keeping the block figure', e));
    };
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.onload = go;
    document.head.appendChild(s);
  }

  // One wing: a fan of long serrated briar leaves along a thorny branch, drawn pointing up and out to +x
  function makeLeafWing(side) {
    const wing = new THREE.Group();
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0); leaf.lineTo(0.13, 0.28); leaf.lineTo(0.09, 0.34); leaf.lineTo(0.17, 0.62); leaf.lineTo(0.11, 0.68);
    leaf.lineTo(0.13, 0.98); leaf.lineTo(0, 1.4); leaf.lineTo(-0.1, 0.98); leaf.lineTo(-0.07, 0.7); leaf.lineTo(-0.13, 0.62);
    leaf.lineTo(-0.08, 0.36); leaf.lineTo(-0.12, 0.28); leaf.closePath();
    const geo = new THREE.ShapeGeometry(leaf);
    const mats = [0x8c1d34, 0x6f1629].map(c => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, flatShading: true }));
    const bark = new THREE.MeshLambertMaterial({ color: 0x3a2a22, flatShading: true });
    const N = 8, leaves = [];
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), m = new THREE.Mesh(geo, mats[i % 2]);
      const rest = -(0.2 + k * 1.55);                    // from nearly upright to past level, fanning outward
      m.rotation.z = rest; m.position.set(0.1 + k * 0.28, 0.1 - k * 0.12, -0.012 * i);
      m.scale.setScalar(1.25 - k * 0.42);
      wing.add(m); leaves.push({ m, rest, k });
    }
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 1.5, 5), bark);
    branch.rotation.z = -0.5; branch.position.set(0.4, 0.62, 0.01); wing.add(branch);
    wing.scale.x = side;
    return { wing, leaves, side };
  }

  function setupNyxaraModel(gltf) {
    const r = NM.r, root = gltf.scene;
    root.scale.setScalar(NM_SCALE);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const map = o.material.map || o.material.emissiveMap;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true, emissive: 0x000000 });
        NM.mats.push(o.material);
      }
      if (o.isBone && /RightHand$/.test(o.name)) NM.hand = o;
      if (o.isBone && /Spine2$/.test(o.name)) NM.spine = o;
    });
    NM.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { NM.actions[c.name] = NM.mixer.clipAction(c); });
    // Swap: hide the block shapes; the shards stay, the staff and its orb move into her hand
    r.body.children.forEach(c => { if (c !== r.pivot && r.shards.indexOf(c) < 0) c.visible = false; });
    const staff = r.pivot.children.find(c => c !== r.orb);
    [staff, r.orb].forEach(m => { r.pivot.remove(m); staffGrip.add(m); });
    staff.position.set(0, 0.2, 0); r.orb.position.set(0, 1.55, 0);
    [makeLeafWing(1), makeLeafWing(-1)].forEach(w => { wingRoot.add(w.wing); NM.wings.push(w); });
    r.body.add(root); r.body.add(staffGrip); r.body.add(wingRoot);
    // Hostile in the gameplay mask, like the block figure (tag() ran before these existed)
    [root, staffGrip, wingRoot].forEach(o => o.traverse(c => c.layers.enable(2)));
    NM.root = root; NM.lastPos.copy(r.pos); NM.kitAt = r.kitAt || 0;
    NM.ready = true;
    nyxaraPlay('idle', 0, true);
  }

  function nyxaraPlay(name, dur, restart) {
    const next = NM.actions[name] || NM.actions.idle;
    if (!next || (next === NM.cur && !restart)) return;
    next.reset();
    if (NM_LOOPS.has(name)) { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    else {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = dur > 0 ? next.getClip().duration / dur : 1;
    }
    if (NM.cur && NM.cur !== next) next.crossFadeFrom(NM.cur, 0.15, false);
    next.play();
    NM.cur = next; NM.curName = name;
  }

  // [clip, seconds] for her current state; 0 seconds = loop at the clip's own speed
  function nyxaraClip(r) {
    const A = r.atk;
    if (r.state === 'dead' || !r.alive) return ['dead', 0];
    if (r.state === 'stagger') return ['hurt', 0.6];
    if (r.state === 'attack' && A) {
      if (A.name === 'orbs') return ['fan', A.wind / NM_FAN_AT];
      if (A.name === 'pyre') return ['burst', A.wind / NM_BURST_AT];
      if (A.name === 'blink') return ['vanish', 0.7];
    }
    if (NM.one) return [NM.one, NM.oneT0];
    if (NM.gait) return [NM.gait, 0];
    return [NM.moving > 0.4 ? 'move' : 'idle', 0];
  }

  // Which gait her travel calls for: none (hover), walk, run, or walkback when she backs away while facing you
  function nyxaraGait(r) {
    const sp = NM.moving, on = NM.gait ? NM_WALK_OFF : NM_WALK_ON;
    if (!r.alive || r.state !== 'chase' || NM.one || sp < on) return '';
    const f = fwdOf(r.facing), along = (NM.vx * f.x + NM.vz * f.z) / Math.max(sp, 1e-3);
    if (along < -0.5) return 'walkback';
    return sp > NM_RUN_AT ? 'run' : 'walk';
  }

  const _nv = new THREE.Vector3();
  function nyxaraModelUpdate(dt) {
    if (!NM.ready) return;
    const r = NM.r, tt = uTime.value;
    if (!r.g.visible) return;
    // The clips carry the stagger and the fall; the block figure's own tilt would double them
    r.body.rotation.x = 0;
    NM.mats.forEach(m => m.emissive.copy(r.robe.emissive));
    // Her velocity, smoothed; a blink or a respawn jumps her across the map, which is not travel
    let sx = (r.pos.x - NM.lastPos.x) / Math.max(dt, 1e-3), sz = (r.pos.z - NM.lastPos.z) / Math.max(dt, 1e-3);
    if (Math.hypot(sx, sz) > 12) sx = sz = 0;
    if (dt > 0) { const k = Math.min(1, dt * 6); NM.vx += (sx - NM.vx) * k; NM.vz += (sz - NM.vz) * k; }
    NM.moving = Math.hypot(NM.vx, NM.vz);
    NM.lastPos.copy(r.pos);
    NM.gait = nyxaraGait(r);
    // Spells with no attack state of their own: her kit (Thorn nova, Briar lances) and the hunt's volley
    if (r.alive && r.state !== 'attack') {
      if ((r.kitAt || 0) !== NM.kitAt) { NM.one = 'burst'; NM.oneT0 = NM.oneT = 1.3; nyxaraPlay('burst', 1.3, true); }
      else if (r.field && r.pivot.rotation.x < -1.0 && NM.one !== 'fan') { NM.one = 'fan'; NM.oneT0 = NM.oneT = 1.1; nyxaraPlay('fan', 1.1, true); }
    }
    NM.kitAt = r.kitAt || 0;
    if (NM.one) { NM.oneT -= dt; if (NM.oneT <= 0 || r.state === 'attack' || r.state === 'stagger' || !r.alive) NM.one = null; }
    const [name, dur] = nyxaraClip(r);
    const restart = !NM_LOOPS.has(name) && !NM.one && (r.atk !== NM.atk || r.state !== NM.state);
    NM.atk = r.atk; NM.state = r.state;
    nyxaraPlay(name, dur, restart);
    // Gaits: feet match her real speed; she sets down on the floor (updateRoyal keeps the body at hover height, so the
    // model drops inside it) and turns her hips toward where she is going, up to a quarter turn, then back to you
    const gait = NM_GAITS.has(name) ? name : '';
    if (gait) NM.cur.timeScale = clamp(NM.moving / NM_PACE[gait], 0.6, 1.5);
    NM.ground += ((gait ? 1 : 0) - NM.ground) * Math.min(1, dt * 5);
    NM.root.position.y = -r.body.position.y * NM.ground;
    let yaw = 0;
    if (gait && NM.moving > 0.3) {
      const head = Math.atan2(NM.vx, NM.vz) + (gait === 'walkback' ? Math.PI : 0);
      yaw = clamp(angDiff(r.facing, head), -1.2, 1.2);
    }
    NM.yaw += (yaw - NM.yaw) * Math.min(1, dt * 6);
    NM.root.rotation.y = NM.yaw;
    NM.mixer.update(dt);

    // Staff: follows the right hand, carried upright, tipping forward as she casts
    NM.root.updateMatrixWorld(true);
    const casting = r.alive && (r.state === 'attack' || NM.one) ? 1 : 0;
    NM.flare += (casting - NM.flare) * Math.min(1, dt * 6);
    if (NM.hand) { NM.hand.getWorldPosition(_nv); r.body.worldToLocal(_nv); staffGrip.position.copy(_nv); }
    staffGrip.rotation.set(0.12 + 0.45 * NM.flare, 0, r.alive ? 0.06 : 1.2);
    staffGrip.visible = r.alive || r.t < 0.6;
    // Wings: hang from the upper spine, beat slowly, spread and lift when she casts, fold when she falls
    if (NM.spine) { NM.spine.getWorldPosition(_nv); r.body.worldToLocal(_nv); wingRoot.position.set(_nv.x, _nv.y, _nv.z - 0.16); }
    const beat = Math.sin(tt * (r.enraged ? 3.4 : 2.1)), fold = r.alive ? 0 : Math.min(1, r.t * 1.5);
    NM.wings.forEach(w => {
      w.wing.rotation.set(0, -w.side * (0.55 - 0.25 * NM.flare + 0.5 * fold), w.side * (0.1 * beat + 0.28 * NM.flare - 0.9 * fold));
      w.leaves.forEach(L => { L.m.rotation.z = L.rest * (1 - 0.18 * NM.flare + 0.05 * beat * L.k); });
    });
  }

  loadNyxaraModel();
