  // ---------- Maze entrances: lantern posts, a light beacon and a path ----------
  const MAZE_GATES = { east: 5, north: 5 };
  (function buildGates() {
    const c = MAZE.cell, n = MAZE.n;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.12, depthWrite: false });
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x3b3327 });
    const gate = (x, z, alongX) => {
      [-1, 1].forEach(sd => {
        const px = alongX ? x + sd * (c / 2 + 0.6) : x, pz = alongX ? z : z + sd * (c / 2 + 0.6);
        box(0.35, 2.2, 0.35, px, 1.1, pz, stone);
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lampMat); l.position.set(px, 2.4, pz); scene.add(l);
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 8, 1, true), beamMat); beam.position.set(x, 9, z); scene.add(beam);
    };
    const ex = MAZE.x0 + n * c + 1.2, ez = MAZE.z0 + (MAZE_GATES.east + 0.5) * c;
    const nx = MAZE.x0 + (MAZE_GATES.north + 0.5) * c, nz = MAZE.z0 + n * c + 1.2;
    gate(ex, ez, false); gate(nx, nz, true);
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 3).rotateX(-Math.PI / 2), pathMat); p1.position.set(ex + 4, 0.015, ez); scene.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 10).rotateX(-Math.PI / 2), pathMat); p2.position.set(nx, 0.015, nz + 4); scene.add(p2);
  })();
