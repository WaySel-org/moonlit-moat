  // ---------- Hero rig: the sculpted wanderer replaces the old block figure ----------
  // The sword, lantern light and every pose hook stay where the rest of the game expects them. The old shapes are hidden,
  // and heroRigUpdate(), called at the end of updatePlayer, drives the skeleton from the same state: stride, sword
  // swing (the right hand follows it with IK), block, cast, drink, jump, hurt, mount and petrify.
  const heroMat = new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true });
  if (heroMat.isMeshStandardMaterial) heroMat.roughness = 0.8;
  const HERO = buildHeroMesh(heroMat);
  HERO.mesh.castShadow = true; HERO.mesh.receiveShadow = true;
  pBody.children.forEach(c => { if (c !== swordPivot && !c.isLight) c.visible = false; });
  pBody.add(HERO.mesh);

  // A forged sword: tapered blade with a point, curved crossguard, ridged grip and a teardrop pommel
  {
    const bs = new THREE.Shape();
    bs.moveTo(-0.045, 0); bs.lineTo(0.045, 0); bs.lineTo(0.04, 0.86); bs.quadraticCurveTo(0.03, 1.0, 0, 1.12); bs.quadraticCurveTo(-0.03, 1.0, -0.04, 0.86); bs.lineTo(-0.045, 0);
    const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 1, curveSegments: 6 });
    bg.rotateX(Math.PI / 2); bg.translate(0, 0.003, 0);
    bladeBody.geometry.dispose(); bladeBody.geometry = bg; bladeBody.position.set(0, 0, 0);
    bladeTip.visible = false; bladeTip.position.z = 1.12;
    const gs = new THREE.Shape();
    gs.moveTo(-0.2, 0.03); gs.quadraticCurveTo(0, -0.025, 0.2, 0.03); gs.lineTo(0.21, 0.0); gs.quadraticCurveTo(0, -0.06, -0.21, 0.0); gs.lineTo(-0.2, 0.03);
    const gg = new THREE.ExtrudeGeometry(gs, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 8 });
    gg.rotateX(-Math.PI / 2); gg.translate(0, -0.015, 0.02);
    guard.geometry.dispose(); guard.geometry = gg;
    const gp = []; for (let i = 0; i <= 12; i++) { const z = -0.11 + i * 0.022; gp.push(new THREE.Vector2(0.026 + (i % 2 ? 0.004 : 0) - i * 0.0004, z)); }
    const grip = new THREE.LatheGeometry(gp, 10); grip.rotateX(Math.PI / 2);
    swordGrip.geometry.dispose(); swordGrip.geometry = grip; swordGrip.position.z = 0;
    const pp = [[0, -0.075], [0.03, -0.06], [0.042, -0.035], [0.03, -0.01], [0.018, 0]].map(([r, z]) => new THREE.Vector2(r, z));
    const pm = new THREE.LatheGeometry(pp, 12); pm.rotateX(Math.PI / 2);
    pommel.geometry.dispose(); pommel.geometry = pm; pommel.position.z = -0.115;
    [bladeBody, guard, swordGrip, pommel].forEach(m => { m.castShadow = true; });
  }

  const _hd = new THREE.Vector3(), _ht = new THREE.Vector3(), _hp = new THREE.Vector3(), _hw = new THREE.Vector3(), _hx = new THREE.Vector3(), _he = new THREE.Euler();
  function heroRigUpdate(moving) {
    _hd.set(0, 0, 1).applyEuler(_he.set(swordPivot.rotation.x, swordPivot.rotation.y, 0));
    pBody.updateMatrixWorld(true);
    heroHandTarget(_hd, _ht); pBody.localToWorld(_ht);
    _hp.copy(HERO_SHOULDER_R).add(HERO_POLE); pBody.localToWorld(_hp);
    heroPose(HERO, { t: uTime.value, stride: pLegs[0].rotation.x, moving: moving && !P.mount, run: moving && !P.mount ? 1 : 0, mount: !!P.mount, act: P.act, block: P.block, air: P.jh > 0 && !P.mount, swordDir: _hd }, _ht, _hp);
    // The sword sits in the palm: a little past the wrist, along the hand
    HERO.mesh.updateMatrixWorld(true);
    HERO.bones.handR.getWorldPosition(_hw);
    _hx.set(0, -0.07, 0.02).applyQuaternion(HERO.bones.handR.getWorldQuaternion(new THREE.Quaternion()));
    _hw.add(_hx); pBody.worldToLocal(_hw);
    swordPivot.position.copy(_hw);
    // Hurt flash and petrify follow the old tunic material
    if (heroMat.emissive) heroMat.emissive.copy(cloakMat.emissive);
    heroMat.color.setHex(P.stone > 0 ? 0x8f8f8a : 0xffffff);
  }
