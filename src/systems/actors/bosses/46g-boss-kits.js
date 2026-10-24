  // ---------- Boss kits: every boss gets several abilities on top of its basic attack ----------
  // Shard guardians: the Hive Matron (brood, spore fan, acid rain), Director Halvane (laser lanes, drone call,
  // missile salvo) and Necrophous (raise the dead, bone nova, grave grasp). The royals gain serpent rain,
  // stone ring, thorn nova and briar lances.
  function fanShots(c, n, spread, speed) {
    const base = yawTo(c.pos, player.position);
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), m = new THREE.Mesh(cshotGeo, cshotMat);
      m.position.set(c.pos.x, c.pos.y + 1.4, c.pos.z); scene.add(m);
      cshots.push({ m, v: new THREE.Vector3(Math.sin(a) * speed, 0, Math.cos(a) * speed), t: 0, c });
    }
    sfx('cast');
  }
  const around = (p, r) => p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2 * r, 0, (Math.random() - 0.5) * 2 * r));
  const KITS = {
    matron: [
      c => { summon('veyra', 3, c.pos, 2, 5, true); floatText('The brood hatches', c.pos.clone().add(new THREE.Vector3(0, 5, 0)), 'word', '#7affe0'); },
      c => fanShots(c, 7, 1.4, 9),
      c => { for (let i = 0; i < 4; i++) groundStrike({ at: around(player.position, 4), r: 2.4, wind: 1.1 + i * 0.2, dmg: 16, src: c, fire: true }); }
    ],
    halvane: [
      c => { for (let i = 0; i < 3; i++) groundStrike({ at: c.pos.clone().setY(0), lane: true, facing: yawTo(c.pos, player.position) + (i - 1) * 0.35, len: 28, w: 2.2, wind: 0.9 + i * 0.35, dmg: 24, kb: 8, src: c, sound: 'cast' }); },
      c => { summon('neon', 3, c.pos, 3, 6, false); floatText('Drones online', c.pos.clone().add(new THREE.Vector3(0, 5, 0)), 'word', '#3af0ff'); },
      c => { for (let i = 0; i < 6; i++) groundStrike({ at: around(player.position, 5), r: 2.2, wind: 1 + i * 0.15, dmg: 18, src: c }); }
    ],
    rot: [
      // Raise the dead: zombies claw up from the underworld around the hero to pin them down
      c => { const n = summon('ash', c.enraged ? 7 : 5, player.position, 4, 8, true).length; if (n) { floatText('Rise. RISE.', c.pos.clone().add(new THREE.Vector3(0, 5.4, 0)), 'word', '#8aff4a'); G.shake = Math.max(G.shake, 0.4); } },
      c => { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = new THREE.Mesh(cshotGeo, cshotMat); m.position.set(c.pos.x, c.pos.y + 1.2, c.pos.z); scene.add(m); cshots.push({ m, v: new THREE.Vector3(Math.sin(a) * 7, 0, Math.cos(a) * 7), t: 0, c }); } sfx('cast'); },
      c => { groundStrike({ at: player.position.clone(), r: 2.2, wind: 1.0, dmg: 18, src: c, freeze: 0.9, freezeWord: 'GRASPED' }); for (let i = 0; i < 3; i++) groundStrike({ at: around(player.position, 5), r: 2, wind: 1.3, dmg: 14, src: c }); }
    ]
  };
  // Called from the godling brain for shard guardians; abilities come on their own timer, faster when enraged
  function bossKit(c, dt, d) {
    const kit = KITS[c.type]; if (!kit || d > 28 || G.state === 'dead') return;
    c.kitCd = (c.kitCd === undefined ? 4 : c.kitCd) - dt;
    if (c.kitCd > 0) return;
    c.kitCd = (c.enraged ? 3.5 : 6) + Math.random() * 2;
    kit[Math.floor(Math.random() * kit.length)](c);
  }
  // The royals' extra abilities, used in place of a normal attack now and then
  function royalKit(r) {
    const y = r.field ? r.pos.y : ROOF.y, pp = player.position.clone().setY(y), en = r.enraged;
    r.kitAt = uTime.value + (en ? 4.5 : 7); r.cool = 1.1;
    if (r.kind === 'gorgon') {
      if (Math.random() < 0.5) {
        floatText('Serpent rain', r.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word', '#d8ff5a');
        groundStrike({ at: pp.clone(), r: 2.2, wind: 1, dmg: 22, src: r, y });
        for (let i = 0; i < (en ? 7 : 5); i++) groundStrike({ at: around(pp, 4.5), r: 2, wind: 1.1 + i * 0.12, dmg: 18, src: r, y });
      } else {
        // A ring of stone around the hero: step out through a gap or get petrified
        floatText('Stone ring', r.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word', '#c8c8c0');
        const gap = Math.floor(Math.random() * 8);
        for (let i = 0; i < 8; i++) if (i !== gap) { const a = i / 8 * TAU; groundStrike({ at: pp.clone().add(new THREE.Vector3(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2)), r: 1.7, wind: 1.3, dmg: 14, src: r, y, freeze: 1.2, freezeWord: 'PETRIFIED' }); }
        groundStrike({ at: pp.clone(), r: 1.6, wind: 1.3, dmg: 14, src: r, y, freeze: 1.2, freezeWord: 'PETRIFIED' });
      }
    } else if (Math.random() < 0.5) {
      floatText('Thorn nova', r.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word', '#ff4a7a');
      const n = en ? 16 : 12; for (let i = 0; i < n; i++) spawnShot(r.pos.x, y + 1.9, r.pos.z, i / n * TAU, 8, r);
      sfx('cast');
    } else {
      floatText('Briar lances', r.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word', '#ff4a7a');
      for (let i = 0; i < 3; i++) { const a = Math.random() * TAU, from = pp.clone().add(new THREE.Vector3(Math.sin(a) * -9, 0, Math.cos(a) * -9)); groundStrike({ at: from, lane: true, facing: a, len: 18, w: 1.8, wind: 1 + i * 0.3, dmg: 22, kb: 9, src: r, y, sound: 'cast' }); }
    }
  }
