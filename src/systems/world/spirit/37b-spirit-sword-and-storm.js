  // ---------- Spirit sword and the Veil's storm ----------
  // Crossing the Veil turns the sword into a translucent Spirit Blade (30% more damage there), and the realm itself
  // flickers with violet lightning, rising motes and a pulsing edge.
  const spiritBladeMat = new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.85, depthWrite: false });
  const spiritAura = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 1.15), new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
  spiritAura.position.z = 0.55; spiritAura.visible = false; bladeGroup.add(spiritAura);
  let spiritBlade = false, nextSpiritBolt = 4;
  const tipWorld = new THREE.Vector3();
  function spiritTick(real) {
    const on = G.realm === 'spirit', t = uTime.value;
    if (on !== spiritBlade) {
      spiritBlade = on;
      bladeBody.material = bladeTip.material = on ? spiritBladeMat : bladeMat;
      spiritAura.visible = on;
      if (on) { rune.visible = true; floatText('Your sword becomes a Spirit Blade', player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#c8a0ff'); }
      else updateSwordLook();
    }
    if (!on) return;
    spiritBladeMat.color.setHSL(0.72 + 0.06 * Math.sin(t * 3), 0.85, 0.72);
    runeMat.color.setHSL(0.78, 1, 0.8);
    spiritAura.scale.set(1 + 0.3 * Math.sin(t * 6), 1, 1.05);
    if (Math.random() < 0.5) {
      bladeTip.getWorldPosition(tipWorld);
      fwColor.setHSL(0.74, 0.8, 0.8); fwParticle(tipWorld.x, tipWorld.y, tipWorld.z, (Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4, fwColor, 0.5, true);
    }
    // Motes rising all around you
    for (let i = 0; i < 2; i++) {
      fwColor.setHSL(0.68 + Math.random() * 0.12, 0.7, 0.75);
      fwParticle(player.position.x + (Math.random() - 0.5) * 30, player.position.y + Math.random() * 2, player.position.z + (Math.random() - 0.5) * 30, 0, 0.8 + Math.random(), 0, fwColor, 2.5, Math.random() < 0.4);
    }
    // Violet lightning: the sky flashes and a bolt strikes somewhere near (harmless, just drama)
    nextSpiritBolt -= real;
    if (nextSpiritBolt <= 0) {
      nextSpiritBolt = 5 + Math.random() * 6;
      skyU.uHor.value.set(0.85, 0.6, 1.0); skyU.uZen.value.set(0.35, 0.2, 0.55);
      G.shake = Math.max(G.shake, 0.2); sfx('boom');
      const a = Math.random() * TAU, r = 8 + Math.random() * 18, bx = player.position.x + Math.cos(a) * r, bz = player.position.z + Math.sin(a) * r;
      for (let i = 0; i < 60; i++) { fwColor.setHSL(0.76, 0.6, 0.85); fwParticle(bx + (Math.random() - 0.5) * 0.8, Math.random() * 22, bz + (Math.random() - 0.5) * 0.8, 0, -4, 0, fwColor, 0.35, true); }
    }
  }
