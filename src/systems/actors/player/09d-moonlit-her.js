  // ---------- Moonlit Her: the modelled, animated hero (assets/hero/moonlit-her.glb) ----------
  // Loaded after the game starts, so the first load stays small; the block figure plays until she arrives.
  // One clip per player state (named after P.act); moonlitHerUpdate(), called at the end of updatePlayer,
  // picks the clip, stretches one-shot clips to the game's P.actDur and keeps the sword in her right hand.
  // Every clip is in place: the game moves the player, the clips only animate her.
  const HER = { ready: false, mixer: null, actions: {}, cur: null, curName: '', lastActT: 0, wasAir: false, parryT: 0, lastRiposte: 0, mats: [], hand: null, swing: 0 };
  const HER_SCALE = 0.9;      // the block figure is about 1.8 m tall; her model is 2.0 m
  const HER_LOOPS = new Set(['idle', 'run', 'block', 'spin', 'sneak', 'ride']);
  // The sword in her fist: the grip runs across the palm, the blade out past the thumb
  const HER_GRIP_POS = new THREE.Vector3(0, 0.08, 0.03);
  const HER_GRIP_ROT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
  // Clips where the blade follows her wrist. Everything else (running, idling, throwing, riding) carries it
  // trailing low behind her and out to her right, so her swinging arm never drives it through her legs.
  const HER_SWINGS = new Set(['light1', 'light2', 'light3', 'heavy', 'rollslash', 'rollcleave', 'slideslash', 'slidecut', 'hookflurry1', 'hookflurry2', 'hookflurry3', 'spin', 'airslash', 'plunge', 'block', 'parry', 'ride_light', 'ride_light2', 'ride_heavy']);
  const HER_CARRY = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.45, -0.35, -0.8).normalize());

  function loadMoonlitHer() {
    loadModel('hero', setupMoonlitHer, 'Moonlit Her did not load; keeping the block figure');

  }

  function setupMoonlitHer(gltf) {
    const root = gltf.scene;
    root.scale.setScalar(HER_SCALE);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; // skinned bounds don't follow the pose
        // Match the game's own surfaces: Lambert with linear colours. The loader's PBR material and sRGB-tagged
        // texture render her near-black under the moat's lighting and in the ASCII pass.
        const map = o.material.map;
        if (map) { map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
        o.material = new THREE.MeshLambertMaterial({ map, skinning: true });
        HER.mats.push(o.material);
        o.layers.enable(3); // readability mask: skinned friends have their own pass (render/36-gameplay-mask.js)
      }
      if (o.isBone && /RightHand$/.test(o.name)) HER.hand = o;
    });
    HER.mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(c => { HER.actions[c.name] = HER.mixer.clipAction(c); });
    // Swap: hide the block figure's shapes but keep the sword, the lantern light and every hook other files use
    pBody.children.forEach(c => { if (c !== swordPivot && !c.isLight) c.visible = false; });
    pBody.add(root);
    HER.ready = true;
  }

  function herState(moving) {
    if (P.act === 'dead') return ['dead', 0];
    // On a beast she stays seated: J claws (alternating arms), K rampage, the stomp and trample are heavy
    if (P.mount) {
      if (P.act === 'trample' || (P.act === 'gore' && P.gore !== 'claw')) return ['ride_heavy', P.actDur];
      if (P.act === 'gore') return [P.claw % 2 ? 'ride_light' : 'ride_light2', P.actDur];
      if (P.act && P.act !== 'tame' && P.actDur) return ['ride_light', P.actDur];
      return ['ride', 0];
    }
    if (P.act === 'light') return ['light' + Math.min(3, P.combo + 1), P.actDur];
    if (P.act === 'tame') return ['cast', 0];
    // Moves without a clip of their own borrow one (46o-her-moves.js) until Mixamo clips with their names are added
    if (P.act === 'hookflurry') { const n = 'hookflurry' + P.flurryN; return [HER.actions[n] ? n : 'light' + P.flurryN, P.actDur]; }
    if (P.act && !HER.actions[P.act] && HER_STAND_IN[P.act]) return [HER_STAND_IN[P.act], P.actDur];
    if (P.act && HER.actions[P.act]) return [P.act, HER_LOOPS.has(P.act) ? 0 : P.actDur];
    if (HER.parryT > 0) return ['parry', 0.35];
    if (P.block) return ['block', 0];
    if (P.jh > 0 && !P.mount) return ['jump', 0.9];
    return [moving && !P.mount ? 'run' : 'idle', 0];
  }

  function play(name, dur, restart) {
    const next = HER.actions[name] || HER.actions.idle;
    if (!next || (next === HER.cur && !restart)) return;
    next.reset();
    if (dur > 0 && !HER_LOOPS.has(name)) {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true;
      next.timeScale = next.getClip().duration / dur;
    } else if (name === 'dead') {
      next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; next.timeScale = 1;
    } else { next.setLoop(THREE.LoopRepeat, Infinity); next.timeScale = 1; }
    if (HER.cur && HER.cur !== next) next.crossFadeFrom(HER.cur, 0.1, false);
    next.play();
    HER.cur = next; HER.curName = name;
  }

  const _hw = new THREE.Vector3(), _hq = new THREE.Quaternion(), _bq = new THREE.Quaternion(), _hs = new THREE.Vector3();
  function moonlitHerUpdate(dt, moving) {
    if (!HER.ready) return;
    // Parry: P.riposte jumps up the moment a block parries
    if (P.riposte > HER.lastRiposte + 0.01) HER.parryT = 0.35;
    HER.lastRiposte = P.riposte; HER.parryT = Math.max(0, HER.parryT - dt);

    const [name, dur] = herState(moving);
    const air = P.jh > 0;
    // Restart a one-shot when the same act starts again (P.actT went back to 0) or a new jump begins
    const restart = (name === HER.curName && dur > 0 && P.actT < HER.lastActT) || (name === 'jump' && air && !HER.wasAir);
    play(name, dur, restart);
    HER.lastActT = P.actT; HER.wasAir = air;
    HER.mixer.update(dt);

    // Her clips animate rolls, leaps and the fall, so cancel the block figure's whole-body flips
    if (!P.mount) { pBody.rotation.x = 0; pBody.position.y = 0; }

    // The sword sits in her right hand: aimed by her wrist in a strike, carried trailing behind her otherwise.
    // HER.swing eases between the two over 0.1 s so the blade never snaps.
    if (HER.hand) {
      HER.swing = HER_SWINGS.has(HER.curName) ? Math.min(1, HER.swing + dt * 10) : Math.max(0, HER.swing - dt * 10);
      pBody.updateMatrixWorld(true);
      HER.hand.getWorldPosition(_hw);
      HER.hand.getWorldQuaternion(_hq);
      _hw.add(_hs.copy(HER_GRIP_POS).applyQuaternion(_hq));
      pBody.worldToLocal(_hw);
      swordPivot.position.copy(_hw);
      pBody.getWorldQuaternion(_bq).invert();
      _bq.multiply(_hq).multiply(HER_GRIP_ROT);
      swordPivot.quaternion.copy(HER_CARRY).slerp(_bq, HER.swing);
    }

    // Hurt flash and petrify, as the old tunic material did
    for (const m of HER.mats) {
      if (m.emissive) m.emissive.copy(cloakMat.emissive);
      if (m.color) m.color.setHex(P.stone > 0 ? 0x8f8f8a : 0xffffff);
    }
  }

  loadMoonlitHer();
