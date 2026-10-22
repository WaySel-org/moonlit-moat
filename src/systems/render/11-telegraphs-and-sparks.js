  // ---------- Telegraphs, shockwaves, sparks ----------
  const teleMat = new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0.25, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.55, depthWrite: false });
  const teleCircle = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), teleMat);
  const fillCircle = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), fillMat);
  const teleLane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), teleMat);
  const fillLane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), fillMat);
  [teleCircle, fillCircle, teleLane, fillLane].forEach((m, i) => { m.position.y = 0.04 + i * 0.004; m.visible = false; m.renderOrder = 2; scene.add(m); });
  function hideTele() { teleCircle.visible = fillCircle.visible = teleLane.visible = fillLane.visible = false; }

  const waveGeo = new THREE.RingGeometry(0.86, 1, 72).rotateX(-Math.PI / 2);
  const waves = [];
  function spawnWave(x, z) {
    const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(x, 0.06, z); scene.add(m);
    waves.push({ m, r: 0.5, hit: false });
  }

  const SP = 160, spPos = new Float32Array(SP * 3).fill(-999), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffd28a, size: 0.14 }));
  sparks.frustumCulled = false; scene.add(sparks);
  let spIdx = 0;
  function burst(x, y, z, n, speed) {
    for (let i = 0; i < n; i++) {
      const j = spIdx; spIdx = (spIdx + 1) % SP;
      spPos[j * 3] = x; spPos[j * 3 + 1] = y; spPos[j * 3 + 2] = z;
      const a = Math.random() * TAU, u = Math.random() * 0.9 + 0.1, s = speed * (0.4 + Math.random() * 0.8);
      spVel[j * 3] = Math.cos(a) * s * (1 - u * 0.5); spVel[j * 3 + 1] = u * s * 1.2; spVel[j * 3 + 2] = Math.sin(a) * s * (1 - u * 0.5);
      spLife[j] = 0.35 + Math.random() * 0.4;
    }
  }
