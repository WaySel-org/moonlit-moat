  // ---------- Readability: tag what matters so the ASCII pass can make it stand out ----------
  const maskFriend = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
  const maskFoe = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
  maskFriend.skinning = maskFoe.skinning = true;
  const tag = (o, L) => { if (o && !o.userData['mk' + L]) { o.userData['mk' + L] = true; o.traverse(c => { if (!c.isPoints && !c.isSprite) c.layers.enable(L); }); } };
  tag(player, 1);
  beasts.forEach(b => tag(b.g, 1));
  chests.forEach(c => tag(c.g, 1));
  pods.forEach(p => tag(p.pod, 1));
  if (SHRINE.crystal) tag(SHRINE.crystal, 1);
  tag(boss, 2);
  royals.forEach(r => tag(r.g, 2));
  creeps.forEach(c => tag(c.g, 2));
  traps.forEach(t => tag(t.g, 2));
  [teleCircle, fillCircle, teleLane, fillLane].forEach(m => tag(m, 2));
  function markDynamic() {
    bolts.forEach(b => tag(b.m, 1)); loot.forEach(l => tag(l.m, 1)); swooshes.forEach(w => tag(w.m, 1)); fxRings.forEach(f => tag(f.m, 1));
    shots.forEach(x => tag(x.m, 2)); cshots.forEach(x => tag(x.m, 2)); waves.forEach(w => tag(w.m, 2)); patches.forEach(p => tag(p.m, p.friendly ? 1 : 2));
    if (dragon.angry > 0) tag(dragon.g, 2);
  }
