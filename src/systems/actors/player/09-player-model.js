  // ---------- Player (local +z is forward, -x is the right hand) ----------
  const SPAWN = new THREE.Vector3(0, 0, 13);
  const player = new THREE.Group();
  const pBody = new THREE.Group(); player.add(pBody);
  // Original adventurer: tunic, belt, braid and a short scarf
  const TUNIC = 0x2f6f6a;
  const cloakMat = new THREE.MeshLambertMaterial({ color: TUNIC });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9b48f });
  const leather = new THREE.MeshLambertMaterial({ color: 0x5a3b24 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x3a2416 });
  const pLegs = [-0.13, 0.13].map(x => { const l = new THREE.Group(); l.position.set(x, 0.8, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.8, 6), leather); m.position.y = -0.4; l.add(m); pBody.add(l); return l; });
  box(0.48, 0.16, 0.3, 0, 0.86, 0, leather, pBody);
  box(0.44, 0.52, 0.26, 0, 1.18, 0, cloakMat, pBody);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), skinMat); head.position.y = 1.6; pBody.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, TAU, 0, Math.PI * 0.55), hairMat); hairCap.position.y = 1.62; hairCap.rotation.x = -0.25; pBody.add(hairCap);
  const braid = new THREE.Group(); braid.position.set(0, 1.58, -0.15); pBody.add(braid);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 - i * 0.007, 6, 5), hairMat); b.position.set(0, -i * 0.12, -i * 0.02); braid.add(b); }
  const scarf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshLambertMaterial({ color: 0x9a2f2f, side: THREE.DoubleSide }));
  scarf.position.set(0, 1.12, -0.15); scarf.rotation.x = 0.15; pBody.add(scarf);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd08a })); lantern.position.set(0.42, 0.9, 0.1); pBody.add(lantern);
  const lanternLight = new THREE.PointLight(0xffc070, 1.3, 8, 2); lanternLight.position.copy(lantern.position); pBody.add(lanternLight);
  const swordPivot = new THREE.Group(); swordPivot.position.set(-0.38, 1.0, 0.1); pBody.add(swordPivot);
  // A proper sword: grip, pommel, crossguard and a tapered blade. Its look improves with level and weapon upgrades.
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x9fb4c4 });
  const hiltMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
  const guardMat = new THREE.MeshBasicMaterial({ color: 0xb8a070 });
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x7fdcff });
  const swordGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 6).rotateX(Math.PI / 2), hiltMat); swordGrip.position.z = 0.02; swordPivot.add(swordGrip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), guardMat); pommel.position.z = -0.13; swordPivot.add(pommel);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.07), guardMat); guard.position.z = 0.17; swordPivot.add(guard);
  const bladeGroup = new THREE.Group(); bladeGroup.position.z = 0.2; swordPivot.add(bladeGroup);
  const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 1.0), bladeMat); bladeBody.position.z = 0.5; bladeGroup.add(bladeBody);
  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 4).rotateX(Math.PI / 2), bladeMat); bladeTip.position.z = 1.11; bladeTip.scale.set(1, 0.3, 1); bladeGroup.add(bladeTip);
  const rune = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.85), runeMat); rune.position.set(0, 0.016, 0.5); rune.visible = false; bladeGroup.add(rune);
  const SWORDS = [
    { name: 'Iron Sword', color: 0x9fb4c4, len: 1.0, rune: null },
    { name: 'Steel Longsword', color: 0xc8d4dc, len: 1.15, rune: null },
    { name: 'Runed Blade', color: 0xd8e4ec, len: 1.2, rune: 0x7fdcff },
    { name: 'Stormedge', color: 0xdcecff, len: 1.3, rune: 0xa9c4ff },
    { name: 'Moonblade', color: 0xeaffff, len: 1.45, rune: 0xbff6ff }
  ];
  let swordTier = 0;
  function updateSwordLook() {
    const next = Math.min(4, Math.floor(PR.weapon / 2 + (PR.level - 1) / 4) + (PR.warden ? 1 : 0) + (PR.inv ? PR.inv.sword.rank : 0));
    if (next > swordTier && typeof floatText === 'function' && uTime.value > 1) floatText(`Your sword became a ${SWORDS[next].name}`, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)), 'word', '#bff6ff');
    swordTier = next;
    const sw = SWORDS[swordTier];
    bladeGroup.scale.set(1 + swordTier * 0.08, 1, sw.len);
    rune.visible = !!sw.rune; if (sw.rune) runeMat.color.setHex(sw.rune);
    guardMat.color.setHex(swordTier >= 3 ? 0xe8d48a : 0xb8a070);
  }
  player.position.copy(SPAWN);
  // Soft ring under the hero so they stay easy to spot
  const heroRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.85, depthWrite: false }));
  heroRing.position.y = 0.03; player.add(heroRing);
  scene.add(player);
