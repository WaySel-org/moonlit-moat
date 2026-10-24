  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0x8fb4d0, 0x1a2a1c, 0.55));
  const moonLight = new THREE.DirectionalLight(0xc8d8ff, 0.6);
  moonLight.position.set(-0.4, 1, 0.6);
  scene.add(moonLight);
