  // ---------- Outpost keeps ----------
  function buildKeep(K) {
    const cx = K.x, cz = K.z, W = 5, plat = (x0, x1, z0, z1, h) => PLATFORMS.push({ x0, x1, z0, z1, h });
    const wall = (x0, x1, z0, z1) => { plat(x0, x1, z0, z1, W); box(x1 - x0, W, z1 - z0, (x0 + x1) / 2, W / 2, (z0 + z1) / 2); };
    const gap = 2.5;
    // North (z-) and south (z+) walls
    if (K.gate === 'z-') { wall(cx - 10, cx - gap, cz - 10, cz - 8); wall(cx + gap, cx + 10, cz - 10, cz - 8); } else wall(cx - 10, cx + 10, cz - 10, cz - 8);
    wall(cx - 10, cx + 10, cz + 8, cz + 10);
    // West (x-) and east (x+) walls
    if (K.gate === 'x-') { wall(cx - 10, cx - 8, cz - 8, cz - gap); wall(cx - 10, cx - 8, cz + gap, cz + 8); } else wall(cx - 10, cx - 8, cz - 8, cz + 8);
    wall(cx + 8, cx + 10, cz - 8, cz + 8);
    // Crenellations along the outer edges
    for (let t = -9.5; t <= 9.5; t += 2) { box(0.8, 0.8, 0.8, cx + t, W + 0.4, cz + 9.6); box(0.8, 0.8, 0.8, cx - 9.6, W + 0.4, cz + t); if (K.gate !== 'z-' || Math.abs(t) > gap) box(0.8, 0.8, 0.8, cx + t, W + 0.4, cz - 9.6); }
    // Corner tower (top at 10) with a pointed roof and a lamp
    plat(cx + 4, cx + 10, cz - 10, cz - 4, 10);
    box(6, 10, 6, cx + 7, 5, cz - 7);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 8), roofMat); roof.position.set(cx + 9.3, 11.1, cz - 9.3); scene.add(roof);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd08a })); lamp.position.set(cx + 4.4, 10.6, cz - 4.4); scene.add(lamp);
    // Ramp 1: courtyard up to the south wall-walk; Ramp 2: east wall-walk up to the tower top
    const steps = (x0, x1, z0, z1, axis, hA, hB) => {
      RAMPS.push({ x0, x1, z0, z1, axis, hA, hB });
      const N = 12;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N, h = hA + (hB - hA) * (hB > hA ? t1 : t0);
        const top = Math.max(hA, hB) > h ? h : Math.max(hA, hB);
        if (axis === 'x') { const a = x0 + (x1 - x0) * t0, b = x0 + (x1 - x0) * t1; box(b - a + 0.02, top, z1 - z0, (a + b) / 2, top / 2, (z0 + z1) / 2); }
        else { const a = z0 + (z1 - z0) * t0, b = z0 + (z1 - z0) * t1; box(x1 - x0, top, b - a + 0.02, (x0 + x1) / 2, top / 2, (a + b) / 2); }
      }
    };
    steps(cx - 6, cx + 2, cz + 6, cz + 8, 'x', 0, W);
    steps(cx + 8, cx + 10, cz - 4, cz + 4, 'z', 10, W);
  }
  KEEPS.forEach(buildKeep);
