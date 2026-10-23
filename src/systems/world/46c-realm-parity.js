  // ---------- Realm parity: the same rules in every world ----------
  // Every world gets six neutral camps like the moat (two melee and one ranged creep of its own kind) on the
  // same one-minute restock clock. Shard guardians enrage at half health, as the Warden does.
  NEUTRAL_CAMPS.forEach(cp => { cp.world = 'moat'; });
  [['veyra', 'skitter', 'spore'], ['neon', 'runner', 'drone'], ['ash', 'shambler', 'bloater']].forEach(([w, melee, ranged]) => {
    const W = WORLDS[w];
    for (let i = 0; i < 6; i++) {
      const s = W.spot(12, 18) || W.spot(9, 12) || W.spot(6, 8); if (!s) break;
      const cp = { id: NEUTRAL_CAMPS.length, x: s[0], z: s[1], alive: true, members: [], world: w };
      const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.6, 36).rotateX(-Math.PI / 2), campRuneMat); ring.position.set(cp.x, 0.03, cp.z); W.group.add(ring);
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; box(0.45, 0.9, 0.45, cp.x + Math.cos(a) * 5, 0.45, cp.z + Math.sin(a) * 5, campStoneMat, W.group); }
      [melee, melee, ranged].forEach((type, k) => {
        cp.members.push(addWorldCreep(type, w, k < 2 ? 'melee' : 'ranged', { neutral: true, campRef: cp, provoked: false, respawn: 2 + i + k * 0.3,
          camp: new THREE.Vector3(cp.x + Math.cos(k * 2.1) * 1.8, 0, cp.z + Math.sin(k * 2.1) * 1.8) }));
      });
      NEUTRAL_CAMPS.push(cp);
    }
  });
  function guardianRage(c) {
    if (!c.storyBoss || c.enraged || c.hp > c.max / 2 || c.hp <= 0) return;
    c.enraged = true; c.cool = Math.min(c.cool, 0.6); G.shake = Math.max(G.shake, 0.4); sfx('roar');
    floatText('ENRAGED', c.pos.clone().add(new THREE.Vector3(0, 5.6, 0)), 'word');
  }
