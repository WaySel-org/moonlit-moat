  // ---------- The Gate Warden's body: an armoured knight with its own skeleton ----------
  // assets/character/bosses/warden.glb is "Undead Grave-Knight (male)" by milakpro (CC-BY, see THIRD_PARTY.md), rigged
  // in Blender onto a copy of the kit's 65-bone rig whose joints sit on the knight's (bone directions unchanged), so
  // the kit's clips play on it as they are; only the hip height is scaled to its build.
  // content/characters/bosses/warden.json "avatar" sets its size and its weapon. The fight is unchanged: the behaviour
  // (19-warden-behaviour.js) still moves boss, tilts bBody and swings wPivot; this file hides the old block giant once
  // the model has loaded and plays a clip per state, timed so every blow lands as the telegraph fills.
  const WARDEN_AV = { A: null, ready: false, lastAtk: null, stage: '', lastPos: new THREE.Vector3() };
  const WARDEN_DEF = ((window.MM_CONTENT || {}).characters || []).find(c => c.gameId === 'warden') || {};

  function wardenAttach() {
    if (WARDEN_AV.ready || WARDEN_AV.loading || !CK.kit || !WARDEN_DEF.avatar || !CK.urls['bosses/warden']) return;
    WARDEN_AV.loading = true;
    new THREE.GLTFLoader().load(CK.urls['bosses/warden'], g => {
      const def = WARDEN_DEF.avatar, root = g.scene, A = { root: new THREE.Group(), bones: {}, mats: [], sockets: {}, actions: {}, cur: null, curName: '' };
      root.traverse(o => {
        if (o.isBone) A.bones[o.name] = o;
        if (o.isMesh) {
          o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
          const m = o.material;
          // Linear colour like the rest of the game, the stage's reflections, and a tag for the hit flash
          ['map', 'emissiveMap'].forEach(k => { if (m[k]) { m[k].encoding = THREE.LinearEncoding; m[k].needsUpdate = true; } });
          if (CK.env) { m.envMap = CK.env; m.envMapIntensity = 0.8; }
          m.metalness = Math.max(m.metalness || 0, 0.55); m.roughness = Math.min(m.roughness === undefined ? 1 : m.roughness, 0.55);
          m.userData.base = m.color.clone(); A.mats.push(m);
        }
      });
      A.root.add(root);
      root.updateMatrixWorld(true);
      // How tall its hips are against the kit's, for the clips' hip track
      const kitHip = ckMesh('M_Body_Head') && ckMesh('M_Body_Head').parent.getObjectByName('pelvis');
      const hipY = b => { const v = new THREE.Vector3(); b.getWorldPosition(v); return v.y; };
      A.hipScale = kitHip && A.bones.pelvis ? hipY(A.bones.pelvis) / hipY(kitHip) : 1;
      A.mixer = new THREE.AnimationMixer(root);
      // A socket on the right hand with the avatar's axes, so the forge's weapons sit in the fist as on the hero
      const hand = A.bones.hand_r;
      if (hand) {
        const s = new THREE.Object3D(), q = new THREE.Quaternion(), rq = new THREE.Quaternion();
        hand.getWorldQuaternion(q); root.getWorldQuaternion(rq); s.quaternion.copy(q.invert().multiply(rq)); hand.add(s); A.sockets.hand_r = s;
        const w = def.weapon && GEAR_BY_ID[def.weapon];
        ((w && w.look && w.look.forge) || []).forEach(o => { const M = fgMats(o); Object.values(M).forEach(m => A.mats.push(m)); if (FG[o.shape]) FG[o.shape](A, o, M); });
      }
      A.root.scale.setScalar((def.scale || 3) / boss.scale.x);
      bBody.children.forEach(c => { c.visible = false; });
      bBody.add(A.root);
      WARDEN_AV.A = A; WARDEN_AV.ready = true; wardenMask();
      wardenPlay('Crouch_Idle_Loop', {});
    }, undefined, e => { WARDEN_AV.loading = false; console.warn('Moonlit Moat: the Warden model did not load; keeping the block giant', e); });
  }
  // Readability mask: skinned parts on layer 4 (their own pass, see core/53-loop.js), rigid gear on layer 2
  function wardenMask() {
    WARDEN_AV.A.root.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) o.layers.enable(4); else o.layers.enable(2); });
  }
  // The kit clips, with the hip track scaled to this body (cached per clip)
  function wardenClip(name) {
    const A = WARDEN_AV.A;
    if (A.actions[name]) return A.actions[name];
    const src = CK.clips[name]; if (!src) return null;
    const c = src.clone();
    c.tracks.forEach(t => { if (/^pelvis\.position$/.test(t.name)) for (let i = 0; i < t.values.length; i++) t.values[i] *= A.hipScale; });
    return (A.actions[name] = A.mixer.clipAction(c));
  }
  function wardenPlay(name, o) {
    const A = WARDEN_AV.A, act = wardenClip(name); if (!act) return;
    const clip = act.getClip();
    if (act === A.cur && !o.restart) { if (o.dur) act.timeScale = clip.duration / o.dur; return; }
    act.reset(); act.enabled = true; act.setEffectiveWeight(1);
    if (o.once) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; } else act.setLoop(THREE.LoopRepeat, Infinity);
    act.timeScale = o.dur ? clip.duration / o.dur : (o.speed || 1);
    if (A.cur && A.cur !== act) act.crossFadeFrom(A.cur, o.fade === undefined ? 0.15 : o.fade, false);
    act.play(); A.cur = act; A.curName = name;
  }

  // Each attack plays one clip, stretched so its impact frame (hit, a share of the clip) lands as the wind-up ends
  const WARDEN_BLOWS = {
    slam: { clip: 'Sword_Attack', hit: 0.42 },
    sweep: { clip: 'Sword_Regular_C', hit: 0.38 },
    charge: { clip: 'Sword_Dash', hit: 0.2 },
    leap: { clip: 'NinjaJump_Start', hit: 0.6 }
  };
  function wardenAvatarUpdate(dt) {
    if (!WARDEN_AV.ready || !boss.visible) return;
    const A = WARDEN_AV.A, W = WARDEN_AV;
    const moved = W.lastPos.distanceTo(boss.position) / Math.max(dt, 1e-4); W.lastPos.copy(boss.position);
    if (B.state === 'attack' && B.atk) {
      const k = B.atk, b = WARDEN_BLOWS[k.name];
      if (k !== W.lastAtk) { W.lastAtk = k; W.stage = ''; }
      if (k.stage !== W.stage) {
        W.stage = k.stage;
        if (k.name === 'leap') {
          if (k.stage === 'wind') wardenPlay('NinjaJump_Start', { once: true, dur: k.wind / b.hit, restart: true });
          else if (k.stage === 'air') wardenPlay('NinjaJump_Idle_Loop', {});
          else wardenPlay('NinjaJump_Land', { once: true, dur: k.rec, restart: true });
        } else if (k.name === 'charge') {
          if (k.stage === 'wind') wardenPlay('Sword_Block', { once: true, dur: k.wind, restart: true });
          else if (k.stage === 'act') wardenPlay('Sprint_Loop', { speed: 1.3 });
          else wardenPlay('Sword_Idle', {});
        } else if (k.stage === 'wind') wardenPlay(b.clip, { once: true, dur: k.wind / b.hit, restart: true });
      }
    } else {
      W.lastAtk = null;
      const p2 = B.phase === 2;
      switch (B.state) {
        case 'perch': wardenPlay('Crouch_Idle_Loop', {}); break;
        case 'leap': case 'retreat': wardenPlay('NinjaJump_Idle_Loop', {}); break;
        case 'roar': wardenPlay('Spell_Simple_Shoot', { once: true, dur: 1.2 }); break;
        case 'stagger': wardenPlay('Hit_Knockback', { once: true, dur: Math.max(0.4, B.dur || 1) }); break;
        case 'dead': wardenPlay('Death01', { once: true, dur: 2.2, fade: 0.2 }); break;
        default: wardenPlay(moved > 0.4 ? (p2 ? 'Jog_Fwd_Loop' : 'Walk_Loop') : 'Sword_Idle', { speed: moved > 0.4 ? (p2 ? 0.9 : 0.75) : 1 });
      }
    }
    // The clips carry the body; drop the block giant's whole-body tilts and bobs
    bBody.rotation.set(0, 0, 0); bBody.position.y = 0;
    A.mixer.update(dt);
    // Hit flash, and a red glow through the armour in phase two
    const ember = B.phase === 2 && B.state !== 'dead' ? 0.12 + 0.06 * Math.sin(uTime.value * 9) : 0;
    A.mats.forEach(m => { if (m.emissive) m.emissive.setRGB(B.flash * 0.6 + ember, B.flash * 0.5, B.flash * 0.4); });
  }
