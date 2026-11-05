  // ---------- The Gate Warden's body: a giant hooded figure built with the character kit ----------
  // content/characters/bosses/warden.json "avatar" says what it wears and how big it is. The fight is unchanged: the
  // behaviour (19-warden-behaviour.js) still moves boss, tilts bBody and swings wPivot; this file hides the old block
  // giant once the kit has loaded and plays a clip for each state, timed so every blow lands when the telegraph says.
  const WARDEN_AV = { A: null, ready: false, lastAtk: null, lastState: '', lastPos: new THREE.Vector3() };
  const WARDEN_DEF = ((window.MM_CONTENT || {}).characters || []).find(c => c.gameId === 'warden') || {};

  function wardenAttach() {
    if (WARDEN_AV.ready || !CK.kit || !WARDEN_DEF.avatar) return;
    const def = WARDEN_DEF.avatar;
    const gear = Object.fromEntries(Object.entries(def.gear || {}).map(([s, id]) => [s, GEAR_BY_ID[id] || null]));
    const A = ckAvatar(def.look, gear);
    A.root.scale.setScalar((def.scale || 3) / boss.scale.x);
    bBody.children.forEach(c => { c.visible = false; });
    bBody.add(A.root);
    A.root.visible = true;
    A.onAsync = wardenMask;
    WARDEN_AV.A = A; WARDEN_AV.ready = true; wardenMask();
    A.play('Crouch_Idle_Loop');
  }
  // Readability mask: skinned parts on layer 4 (their own pass, see core/53-loop.js), rigid gear and cloth on layer 2
  function wardenMask() {
    WARDEN_AV.A.root.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) o.layers.enable(4); else o.layers.enable(2); });
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
          if (k.stage === 'wind') A.play('NinjaJump_Start', { once: true, dur: k.wind / b.hit, restart: true });
          else if (k.stage === 'air') A.play('NinjaJump_Idle_Loop', {});
          else A.play('NinjaJump_Land', { once: true, dur: k.rec, restart: true });
        } else if (k.name === 'charge') {
          if (k.stage === 'wind') A.play('Sword_Block', { once: true, dur: k.wind, restart: true });
          else if (k.stage === 'act') A.play('Sprint_Loop', { speed: 1.3 });
          else A.play('Idle_Loop', {});
        } else if (k.stage === 'wind') A.play(b.clip, { once: true, dur: k.wind / b.hit, restart: true });
      }
    } else {
      W.lastAtk = null;
      const p2 = B.phase === 2;
      switch (B.state) {
        case 'perch': A.play('Crouch_Idle_Loop', {}); break;
        case 'leap': case 'retreat': A.play('NinjaJump_Idle_Loop', {}); break;
        case 'roar': A.play('Spell_Simple_Shoot', { once: true, dur: 1.2 }); break;
        case 'stagger': A.play('Hit_Knockback', { once: true, dur: Math.max(0.4, B.dur || 1) }); break;
        case 'dead': A.play('Death01', { once: true, dur: 2.2, fade: 0.2 }); break;
        default: A.play(moved > 0.4 ? (p2 ? 'Jog_Fwd_Loop' : 'Walk_Loop') : 'Sword_Idle', { speed: moved > 0.4 ? (p2 ? 0.9 : 0.75) : 1 });
      }
    }
    // The clips carry the body; drop the block giant's whole-body tilts and bobs
    bBody.rotation.set(0, 0, 0); bBody.position.y = 0;
    A.update(dt, { wind: 0.5 });
    // Hit flash and the ember eyes (they flare red in phase two, go dark in death), from the old visor's colour
    A.mats.forEach(m => { if (m.emissive && m !== A.eyeMat) m.emissive.setRGB(B.flash * 0.6, B.flash * 0.5, B.flash * 0.4); });
    if (A.eyeMat) A.eyeMat.color.copy(visorMat.color).multiplyScalar(1.6);
  }
