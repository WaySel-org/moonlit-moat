  // ---------- The Unblinking: the Eye's fight and the story's ending (Loremaster with the Shardkeeper of the Moat) ----------
  // Once the brides have first fallen (Season 1's ending beat) and all four shards make the World Heart whole, a gate
  // opens on the castle roof: the way into the Dark Half. Stepping into it starts the last fight, on the wedding roof
  // under the open Eye, then the ending plays in the game's own world and the endless game goes on.
  //  1. The Gaze: a searchlight sweeps the roof all fight long. Standing in it fills the Seen meter (the boss bar's
  //     thin track); full, the Eye burns her. The fallen moon pieces on the roof hide her.
  //  2. The Lids: strike the three moon mirrors; their light makes the Eye flinch and its root comes down onto the
  //     altar. Strike the root while it is down. The mirrors move each time. Until the Eye is at 70%.
  //  3. The Stolen Crowns: the brides hang chained to the Eye. Strike the chains, never the brides. Freed, Vesthra turns
  //     its veins to stone (root hits deal 30% more) and Nyxara pins it with thorns (the root stays down longer).
  //     Then the Lids again, until 35%.
  //  4. Parallel Sight: four roots, one from each world, break through the roof. Cut all four.
  //  5. The Blink: dark but the lantern. Parry its last gaze as it fires; the pupil opens and comes down. Strike it.
  // Flags live in G.story.prog (eyeGate, eyeDone, eyeRuns) so they save and a new game clears them.
  const UB = { on: false, phase: '', t: 0, hp: 1, max: 1, seen: 0, gz: { x: 0, z: -25, a: 0 }, win: 0, cycle: 0, freed: {}, tears: [], blink: null, keep: null, prev: '' };
  const UB_ALTAR = new THREE.Vector3(0, ROOF.y, -25.2), UB_GATE = new THREE.Vector3(0, ROOF.y, -28.6);
  const ubProg = () => G.story.prog;
  const ubGateOpen = () => !!(ubProg().eyeGate && !UB.on && !EN.on);
  const ubOnRoof = () => Math.abs(player.position.y - ROOF.y) < 1.5;
  const ubRoofSpot = (pad) => new THREE.Vector3(ROOF.x0 + pad + Math.random() * (ROOF.x1 - ROOF.x0 - 2 * pad), ROOF.y, ROOF.z0 + pad + Math.random() * (ROOF.z1 - ROOF.z0 - 2 * pad));
  const UB_ORANGE = 0xff4a12;
  const ubM = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o));

  // ----- The gate on the roof: a ring of the Eye's light with black inside it -----
  const ubGate = new THREE.Group(); ubGate.position.copy(UB_GATE); ubGate.visible = false; scene.add(ubGate);
  const ubRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 6, 28), ubM(UB_ORANGE)); ubRing.position.y = 1.8; ubGate.add(ubRing);
  const ubVoid = new THREE.Mesh(new THREE.CircleGeometry(1.42, 28), ubM(0x000000, { side: THREE.DoubleSide })); ubVoid.position.y = 1.8; ubGate.add(ubVoid);
  tag(ubGate, 1);

  // ----- The arena dressing: fallen moon pieces (cover), the searchlight, the mirrors, the root, chains, world roots -----
  const ubArena = new THREE.Group(); ubArena.visible = false; scene.add(ubArena);
  const pieceMat = new THREE.MeshLambertMaterial({ color: 0xd8cfb4, flatShading: true });
  const UB_COVER = [[-8.5, -24.2], [0.2, -22.0], [8.8, -26.6], [-3.6, -28.2]].map(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), pieceMat); m.position.set(x, ROOF.y + 0.85, z); m.scale.set(1.2, 0.9, 0.8); m.rotation.set(i, i * 2, 0.4);
    ubArena.add(m); return new THREE.Vector3(x, ROOF.y, z);
  });
  // Broken moon pieces drifting in the black around the roof
  const ubDrift = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 1.6, 0), pieceMat);
    const a = i / 14 * TAU, r = 22 + Math.random() * 10; m.userData = { a, r, y: ROOF.y + 2 + Math.random() * 10, s: 0.05 + Math.random() * 0.08 };
    ubArena.add(m); ubDrift.push(m);
  }
  // The searchlight: a column of the Eye's light and the circle it burns on the roof
  const UB_BEAM_R = 2.3;
  const ubBeam = new THREE.Mesh(new THREE.CylinderGeometry(UB_BEAM_R, UB_BEAM_R * 0.6, 40, 20, 1, true), ubM(UB_ORANGE, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  ubBeam.renderOrder = 3; ubArena.add(ubBeam);
  const ubSpot = new THREE.Mesh(new THREE.CircleGeometry(UB_BEAM_R, 28), ubM(UB_ORANGE, { transparent: true, opacity: 0.45, depthWrite: false }));
  ubSpot.rotation.x = -Math.PI / 2; ubSpot.renderOrder = 3; ubArena.add(ubSpot);
  tag(ubBeam, 2); tag(ubSpot, 2);
  const ubTele = makeTele();
  // Targets share the interface the hero's strikes use (pos, radius, hitY, markY) and are routed by isEye
  function ubTarget(kind, mesh, hits, extra) {
    const t = Object.assign({ kind, g: mesh, pos: mesh.position, radius: 0.9, hitY: 1.2, markY: 3, isEye: true, alive: false, hits, left: hits, flash: 0 }, extra || {});
    mesh.visible = false; ubArena.add(mesh); tag(mesh, 2); return t;
  }
  const mirrorMk = () => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 5, 16), new THREE.MeshLambertMaterial({ color: 0x9a8e70 })); frame.position.y = 1.4; g.add(frame);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.66, 18), ubM(0x5a6a80, { side: THREE.DoubleSide })); glass.position.y = 1.4; g.add(glass);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x5a5040 })); post.position.y = 0.4; g.add(post);
    g.userData.glass = glass; return g;
  };
  const ubMirrors = [0, 1, 2].map(() => ubTarget('mirror', mirrorMk(), 1));
  // The root: where the Eye's sight touches the world, a burning knot of veins dropped onto the altar
  const rootMk = (col) => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), ubM(col)); core.position.y = 1.3; g.add(core);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ubM(0x000000)); pup.position.set(0, 1.3, 0.75); g.add(pup);
    const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 40, 6, 1, true), ubM(col, { transparent: true, opacity: 0.7 })); vein.position.y = 21; g.add(vein);
    g.userData.core = core; g.userData.pup = pup; return g;
  };
  const ubRoot = ubTarget('root', rootMk(UB_ORANGE), Infinity, { radius: 1.2, hitY: 1.4, markY: 3.4 });
  // The brides' chains, running from each bride up into the black
  const chainMk = () => {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x3a3440, emissive: 0x401008 });
    for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 4, 8), m); l.position.y = 2.6 + i * 0.42; l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
    return g;
  };
  const UB_BRIDE_AT = [new THREE.Vector3(-6, ROOF.y, -25.6), new THREE.Vector3(6, ROOF.y, -25.6)];
  const ubChains = UB_BRIDE_AT.map((p, i) => { const c = ubTarget('chain', chainMk(), 6, { bride: i, radius: 1.1, hitY: 2, markY: 4.6 }); c.g.position.copy(p); return c; });
  // Parallel Sight: one root from each world the Eye looks through, in that world's colour
  const UB_WORLD_ROOTS = [['Veyra', 0x6aff8a, -10.5, -22.4], ['Neon Verge', 0x3af0ff, 10.5, -22.4], ['Ashfall', 0xff9a3a, 10.5, -28.0], ['the Veil', 0xc8a9ff, -10.5, -28.0]];
  const ubWorldRoots = UB_WORLD_ROOTS.map(([name, col, x, z]) => { const r = ubTarget('wroot', rootMk(col), 4, { world: name, col, radius: 1.2, hitY: 1.4, markY: 3.4 }); r.g.position.set(x, ROOF.y, z); return r; });
  // The tears: drops of the Eye's light that fall where she stands
  const tearGeo = new THREE.SphereGeometry(0.45, 10, 8), tearMat = ubM(UB_ORANGE);
  // The darkness of the Blink: everything but a circle of lantern light around her
  const ubDark = document.createElement('div'); ubDark.id = 'eyedark';
  ubDark.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .8s;background:radial-gradient(circle at 50% 58%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 15vmin, rgba(0,0,0,.94) 34vmin)';
  document.body.appendChild(ubDark);
  // What the Eye's attacks pass to hitPlayer: parry routes here, and pow scales its damage like a boss
  const UB_ATK = { isEye: true, pow: 1 };

  function ubTargets() {
    if (!UB.on) return [];
    const out = [];
    ubMirrors.forEach(m => { if (m.alive) out.push(m); });
    if (ubRoot.alive) out.push(ubRoot);
    ubChains.forEach(c => { if (c.alive) out.push(c); });
    ubWorldRoots.forEach(r => { if (r.alive) out.push(r); });
    return out;
  }

  // ----- The gate opens: every chain is lifted -----
  function ubCheckGate(real) {
    const pr = ubProg();
    if (pr.eyeGate || pr.eyeDone || !pr.s1end || shardCount() < CHAPTERS.length) return;
    if (G.story.pending || !ui.banner.hidden || G.world !== 'moat' || (G.state !== 'explore' && G.state !== 'interlude')) return;
    pr.eyeGate = 1; saveGame();
    moonEyeOpen(10); moonGlance(4);
    showBanner('A gate on the roof', 'With the World Heart whole, every chain on the moon is lifted. On the castle roof, where the brides were wed, a gate has opened into the Dark Half. The Eye is waiting behind it.', 'title');
    bannerTimer = 9; sfx('horn');
  }
  function unblinkingText() {
    const pr = ubProg();
    if (UB.on) return UB.phase === 'blink' ? 'The Blink · parry its last gaze as it fires.' : UB.phase === 'crowns' ? 'The Stolen Crowns · strike the chains, not the brides.' : UB.phase === 'sight' ? 'Parallel Sight · cut the roots of all four worlds.' : 'The Lids · strike the moon mirrors, then the root on the altar. Hide from the gaze behind moon pieces.';
    if (pr.eyeGate && !pr.eyeDone) return 'A gate stands open on the castle roof. Step into it to face the Eye.';
    return null;
  }

  // ----- The fight -----
  function startUnblinking() {
    if (UB.on || EN.on) return;
    const tier = worldTier(), asc = G.ascension || 0;
    G.dmgMult = (1 + 0.2 * (tier - 1)) * (1 + 0.25 * asc); G.bossTier = tier;
    UB_ATK.pow = 1.9 + 0.2 * (tier + 2 + 2 * asc - 1);
    endRoyalHunt(true); endEvent(true);
    if (P.mount) dismount(true);
    UB.max = Math.round(5200 * (1 + 0.35 * (tier + 1 + 2 * asc))); UB.hp = UB.max;
    Object.assign(UB, { on: true, phase: 'intro', t: 0, seen: 0, win: 0, cycle: 0, freed: {}, blink: null, prev: '' });
    UB.gz.x = 0; UB.gz.z = -22; UB.gz.a = 0;
    // The brides leave the land and hang chained above the altar
    UB.keep = royals.map(r => ({ pos: r.pos.clone(), facing: r.facing, field: r.field, state: r.state, active: r.active, alive: r.alive, vis: r.g.visible }));
    royals.forEach((r, i) => { r.field = false; r.active = false; r.state = 'idle'; r.atk = null; r.tele.hide(); r.body.rotation.set(0, 0, 0); r.pos.copy(UB_BRIDE_AT[i]); r.facing = 0; });
    G.state = 'eye'; G.lock = false; G.target = null; G.hunt = null;
    ubGate.visible = false; ubArena.visible = true;
    ui.hud.hidden = true; ui.royalbars.hidden = true; ui.bossbar.hidden = false;
    ui.bname.textContent = 'The Unblinking';
    sfx('portal'); sfx('roar'); G.shake = 0.8;
    showBanner('The Dark Half', 'The Warden is kneeling at the gate, holding it open with both hands. “She told me she would come home. Go. I will hold it.”', 'title'); bannerTimer = 6;
    ubProg().eyeRuns = (ubProg().eyeRuns || 0) + 1;
  }
  function ubShowMirrors() {
    UB.cycle++;
    const spots = [];
    ubMirrors.forEach(m => {
      let p, n = 0;
      do { p = ubRoofSpot(1.6); n++; } while (n < 30 && (spots.some(s => flatDist(s, p) < 6) || flatDist(p, UB_ALTAR) < 3 || UB_COVER.some(c => flatDist(c, p) < 2.2)));
      spots.push(p); m.g.position.copy(p); m.g.rotation.y = yawTo(p, UB_ALTAR); m.alive = true; m.left = 1; m.g.visible = true; m.g.userData.glass.material.color.setHex(0x5a6a80);
    });
  }
  function ubRootDown() {
    UB.win = 7 + (UB.freed[1] ? 3 : 0);
    ubRoot.alive = true; ubRoot.g.visible = true; ubRoot.g.position.copy(UB_ALTAR);
    sfx('boom'); G.shake = Math.max(G.shake, 0.6); burst(UB_ALTAR.x, UB_ALTAR.y + 1, UB_ALTAR.z, 40, 7);
    floatText('THE EYE FLINCHES', UB_ALTAR.clone().add(new THREE.Vector3(0, 4, 0)), 'word', '#ffb07a');
    S1.blink = 0; moonEyeOpen(30);
  }
  function ubRootUp() { ubRoot.alive = false; ubRoot.g.visible = false; UB.win = 0; }
  function ubSetPhase(ph) {
    UB.phase = ph; UB.t = 0;
    ubMirrors.forEach(m => { m.alive = false; m.g.visible = false; }); ubRootUp();
    if (ph === 'lids' || ph === 'lids2') ubShowMirrors();
    if (ph === 'crowns') {
      ubChains.forEach(c => { c.alive = true; c.left = c.hits; c.g.visible = true; });
      showBanner('The Stolen Crowns', 'The brides hang from the Eye on chains. Strike the chains, not them.', 'title'); bannerTimer = 4; sfx('boss', 'royals');
    }
    if (ph === 'sight') {
      ubWorldRoots.forEach(r => { r.alive = true; r.left = r.hits; r.g.visible = true; });
      showBanner('Parallel Sight', 'The Eye looks through every world at once. Its roots break through the roof from Veyra, Neon Verge, Ashfall and the Veil. Cut all four.', 'title'); bannerTimer = 5; sfx('portal');
    }
    if (ph === 'blink') {
      UB.blink = { t: 0, stage: 'wait' }; ubDark.style.opacity = '1';
      showBanner('The Blink', 'Everything goes dark but your lantern. When it looks at you one last time, parry.', 'title'); bannerTimer = 4;
    }
  }
  // Each phase has a floor, so a big hit never skips the next phase or empties the bar before the Blink
  const UB_FLOOR = { lids: 0.7, crowns: 0.7, lids2: 0.35, sight: 0.1, blink: 0.1 };
  function ubHurt(n, at, heavy) {
    UB.hp = Math.max(UB.phase === 'final' ? 0 : UB.max * (UB_FLOOR[UB.phase] || 0), UB.hp - n);
    floatText(String(Math.round(n)), at, 'big', '#ffb07a'); sfx(heavy ? 'heavyhit' : 'hit');
    G.hitstop = heavy ? 0.1 : 0.05; G.shake = Math.max(G.shake, heavy ? 0.3 : 0.12);
    burst(at.x, at.y, at.z, heavy ? 22 : 12, heavy ? 6 : 4);
  }
  function damageEye(t, dmg, poiseDmg, heavy) {
    if (!t.alive || !UB.on) return;
    t.flash = 1;
    const at = t.pos.clone().add(new THREE.Vector3(0, t.hitY + 0.6, 0));
    if (t.kind === 'mirror') {
      t.alive = false; t.g.userData.glass.material.color.setHex(0xfff2c8);
      sfx('chest'); burst(at.x, at.y, at.z, 20, 5); floatText('LIT', at, 'word', '#fff2c8');
      setTimeout(() => { t.g.visible = false; }, 700);
      if (ubMirrors.every(m => !m.alive)) setTimeout(() => { if (UB.on && (UB.phase === 'lids' || UB.phase === 'lids2')) ubRootDown(); }, 600);
      return;
    }
    if (t.kind === 'root') {
      if (UB.phase === 'final') { UB.hp = 0; ubHurt(Math.max(1, dmg), at, true); return; }
      ubHurt(dmg * (UB.freed[0] ? 1.3 : 1) * (UB.phase === 'lids' || UB.phase === 'lids2' ? 1 : 0.6), at, heavy);
      return;
    }
    // Chains and world roots count hits, not damage, so every build frees them in the same time
    t.left--; sfx('clang'); burst(at.x, at.y, at.z, 10, 4);
    floatText(`${t.left}`, at, 'word', t.kind === 'wroot' ? '#' + t.col.toString(16).padStart(6, '0') : '#ffd36a');
    if (t.left > 0) return;
    t.alive = false; t.g.visible = false; burst(at.x, at.y, at.z, 34, 7);
    if (t.kind === 'chain') ubFreeBride(t.bride);
    else { ubHurt(UB.max * 0.06, at, true); floatText(`${t.world} lets go`, at.clone().add(new THREE.Vector3(0, 0.8, 0)), 'word', '#' + t.col.toString(16).padStart(6, '0')); }
  }
  const UB_FREED_LINES = [
    ['Vesthra, free', '“Stone does not fade. Let me hold it still for you.” Its veins turn to stone: the root takes more damage.'],
    ['Nyxara, free', '“Sister. I remember now. Run at it, not away.” Thorns pin the Eye: the root stays down longer.']
  ];
  function ubFreeBride(i) {
    UB.freed[i] = true; const r = royals[i];
    sfx(i ? 'empress' : 'gorgon'); burst(r.pos.x, ROOF.y + 2, r.pos.z, 40, 6); G.shake = Math.max(G.shake, 0.4);
    showTip(UB_FREED_LINES[i][0], UB_FREED_LINES[i][1], 7);
  }
  // A parry during the Blink: the pupil opens and comes down to the altar for the last strike
  function eyeParried() {
    if (!UB.on || UB.phase !== 'blink' || !UB.blink || UB.blink.stage !== 'fire') return;
    UB.blink.parried = true;
  }

  function updateUnblinking(real) {
    // The gate and the arena dressing
    const pr = ubProg(), tt = uTime.value;
    ubCheckGate(real);
    ubGate.visible = G.world === 'moat' && ubGateOpen();
    if (ubGate.visible) {
      ubRing.rotation.z = tt * 0.6; ubRing.scale.setScalar(1 + 0.06 * Math.sin(tt * 3));
      if (G.state === 'explore' || G.state === 'interlude') {
        if (G.realm === 'material' && !G.storm && ubOnRoof() && flatDist(player.position, UB_GATE) < 1.9 && P.act !== 'leap') startUnblinking();
        else if (ubOnRoof() && Math.random() < real * 0.3) moonEyeOpen(3);
      }
    }
    updateEnding(real);
    if (!UB.on) return;
    if (G.state === 'dead') { ubAbort(); return; }
    // Nothing else may take the roof while the Eye is fought (a respawn, a reset from the pause screen)
    if (G.state !== 'eye') { UB.keep = null; ubClear(); return; }
    if (G.paused) return;
    const dt = Math.max(0, G.hitstop > 0 ? 0 : G.slow > 0 ? real * 0.3 : real);
    UB.t += dt;
    moonEyeOpen(2); boss.visible = false; G.hunt = null;
    ubDrift.forEach(m => { const u = m.userData; u.a += u.s * dt; m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(tt * 0.5 + u.a) * 0.6, -25 + Math.sin(u.a) * u.r * 0.7); m.rotation.x += dt * 0.2; });
    ubChains.forEach(c => { if (c.alive) c.g.rotation.y = Math.sin(tt * 1.3 + c.bride) * 0.2; });
    [ubRoot, ...ubWorldRoots].forEach(r => { if (r.alive) { r.g.userData.core.rotation.y += dt * 1.5; r.g.userData.core.scale.setScalar(1 + 0.08 * Math.sin(tt * 6) + r.flash * 0.25); r.g.userData.pup.lookAt(player.position.x, ROOF.y + 1.3, player.position.z); } r.flash = Math.max(0, r.flash - dt * 5); });
    ubChains.forEach(c => { c.flash = Math.max(0, c.flash - dt * 5); });

    // Phases
    if (UB.phase === 'intro' && UB.t > 5) { ubSetPhase('lids'); showTip('The Lids', ['Strike the three moon mirrors to make the Eye flinch.', 'Then strike its root on the altar.', 'Hide behind the fallen moon pieces when the gaze comes.'], 8); }
    if (UB.win > 0) { UB.win -= dt; if (UB.win <= 0) { ubRootUp(); if (UB.phase === 'lids' || UB.phase === 'lids2') ubShowMirrors(); } }
    const frac = UB.hp / UB.max;
    if (UB.phase === 'lids' && frac <= 0.7) ubSetPhase('crowns');
    if (UB.phase === 'crowns' && UB.freed[0] && UB.freed[1]) { ubSetPhase('lids2'); showTip('The Lids', 'The mirrors stand again. Make it flinch.', 4); }
    if (UB.phase === 'lids2' && frac <= 0.35) ubSetPhase('sight');
    if (UB.phase === 'sight' && ubWorldRoots.every(r => !r.alive)) ubSetPhase('blink');
    if (UB.phase === 'blink') ubUpdateBlink(dt);
    if (UB.phase === 'final' && UB.hp <= 0) { ubWin(); return; }

    // The gaze sweeps the roof all fight, except in the dark of the Blink
    const gazing = !['intro', 'blink', 'final'].includes(UB.phase);
    ubBeam.visible = ubSpot.visible = gazing;
    if (gazing) {
      const sp = (UB.phase === 'sight' ? 3.4 : UB.phase === 'lids2' ? 3.0 : 2.5) * (UB.freed[1] ? 0.85 : 1);
      UB.gz.a += dt * 0.45;
      const want = new THREE.Vector3(Math.sin(UB.gz.a) * 11, 0, -25 + Math.sin(UB.gz.a * 1.7) * 3.6).lerp(player.position, 0.35);
      const dx = want.x - UB.gz.x, dz = want.z - UB.gz.z, dd = Math.hypot(dx, dz);
      if (dd > 0.01) { const s = Math.min(dd, sp * dt); UB.gz.x += dx / dd * s; UB.gz.z += dz / dd * s; }
      UB.gz.x = clamp(UB.gz.x, ROOF.x0, ROOF.x1); UB.gz.z = clamp(UB.gz.z, ROOF.z0, ROOF.z1);
      ubSpot.position.set(UB.gz.x, ROOF.y + 0.06, UB.gz.z); ubBeam.position.set(UB.gz.x, ROOF.y + 20, UB.gz.z);
      ubSpot.material.opacity = 0.35 + 0.25 * UB.seen + 0.1 * Math.sin(tt * 9);
      const inBeam = ubOnRoof() && flatDist(player.position, ubSpot.position) < UB_BEAM_R;
      const hidden = UB_COVER.some(c => flatDist(c, player.position) < 1.9);
      if (inBeam && !hidden) UB.seen = Math.min(1, UB.seen + dt * 0.55);
      else UB.seen = Math.max(0, UB.seen - dt * 0.3);
      if (UB.seen >= 1) {
        UB.seen = 0.25;
        floatText('SEEN', player.position.clone().add(new THREE.Vector3(0, 2.8, 0)), 'word', '#ff7a3a');
        hitPlayer(26, ubSpot.position.clone(), 9, false, UB_ATK); sfx('breath');
      }
    } else UB.seen = Math.max(0, UB.seen - dt);
    // Tears fall where she stands from the Crowns on
    if (['crowns', 'lids2', 'sight'].includes(UB.phase)) {
      UB.tearT = (UB.tearT || 0) - dt;
      if (UB.tearT <= 0) {
        UB.tearT = UB.phase === 'sight' ? 1.6 : 2.2;
        const at = player.position.clone().setY(ROOF.y).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
        at.x = clamp(at.x, ROOF.x0, ROOF.x1); at.z = clamp(at.z, ROOF.z0, ROOF.z1);
        const m = new THREE.Mesh(tearGeo, tearMat); m.position.copy(at).setY(ROOF.y + 18); scene.add(m); tag(m, 2);
        UB.tears.push({ m, at, t: 0, tele: makeTele() });
      }
    }
    for (let i = UB.tears.length - 1; i >= 0; i--) {
      const T = UB.tears[i]; T.t += dt; const k = T.t / 1.1;
      T.tele.circle(T.at.x, ROOF.y, T.at.z, 1.6, k); T.m.position.y = ROOF.y + 18 * (1 - k * k);
      if (k >= 1) {
        burst(T.at.x, ROOF.y + 0.3, T.at.z, 18, 5); sfx('ember');
        if (ubOnRoof() && flatDist(player.position, T.at) < 1.6) hitPlayer(18, T.at, 5, true, UB_ATK);
        T.tele.hide(); scene.remove(T.m); UB.tears.splice(i, 1);
      }
    }

    // The bar: the Eye's health, its phase, and the Seen meter on the thin track
    ui.bossbar.hidden = false;
    ui.bfill.style.width = ui.bghost.style.width = (UB.hp / UB.max * 100) + '%';
    ui.pfill.style.width = (UB.seen * 100) + '%';
    ui.btag.textContent = UB.win > 0 ? `Root down · ${Math.ceil(UB.win)}s` : UB.phase === 'blink' ? 'The Blink' : UB.phase === 'sight' ? 'Parallel Sight' : UB.phase === 'crowns' ? 'The Stolen Crowns' : UB.seen > 0.05 ? 'Seen' : 'The Lids';
    ui.obj.textContent = unblinkingText();
  }

  // The brides: hidden until the Crowns, chained until freed, free after. Called by the loop right after the royals
  // update (core/53-loop), before the frame renders, so it overrides their own idle pose.
  function ubPoseBrides() {
    if (!UB.on) return;
    const tt = uTime.value;
    royals.forEach((r, i) => {
      const show = UB.phase === 'crowns' || UB.freed[i] || ['lids2', 'sight', 'blink', 'final'].includes(UB.phase);
      r.g.visible = show && G.world === 'moat'; r.pos.copy(UB_BRIDE_AT[i]); r.facing = yawTo(r.pos, player.position); r.g.rotation.y = r.facing;
      r.body.position.y = UB.freed[i] ? 0.25 + Math.sin(tt * 1.5 + i) * 0.1 : 1.0 + Math.sin(tt * 0.8 + i) * 0.15;
      r.body.rotation.x = UB.freed[i] ? 0 : 0.25;
    });
  }

  function ubUpdateBlink(dt) {
    const K = UB.blink; K.t += dt;
    const p = player.position;
    if (K.stage === 'wait' && K.t > 2.2) { K.stage = 'charge'; K.t = 0; K.parried = false; sfx('cast'); }
    if (K.stage === 'charge') {
      ubTele.circle(p.x, ROOF.y, p.z, 2.4, K.t / 2.4);
      S1.blink = 0; moonEyeOpen(5);
      if (K.t >= 2.4) {
        K.stage = 'fire'; K.t = 0; ubTele.hide();
        sfx('boom'); G.shake = Math.max(G.shake, 0.7);
        const src = p.clone().add(new THREE.Vector3(0, 0, -6));
        hitPlayer(48, src, 10, true, UB_ATK);
        if (K.parried) {
          UB.phase = 'final'; ubDark.style.opacity = '0.55';
          ubRoot.alive = true; ubRoot.g.visible = true; ubRoot.g.position.copy(UB_ALTAR); UB.win = 0;
          showBanner('The pupil opens', 'It has nothing left to look with. Strike it.', 'title'); bannerTimer = 3;
          floatText('IT BLINKS', p.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#fff2c8');
        } else floatText('parry as it fires', p.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ffb07a');
      }
    }
    if (K.stage === 'fire' && K.t > 0.3) { K.stage = 'wait'; K.t = 0; }
  }

  function ubClear() {
    UB.tears.forEach(T => { T.tele.hide(); scene.remove(T.m); }); UB.tears.length = 0;
    ubTele.hide(); ubArena.visible = false; ubDark.style.opacity = '0';
    [...ubMirrors, ubRoot, ...ubChains, ...ubWorldRoots].forEach(t => { t.alive = false; t.g.visible = false; });
    UB.on = false; UB.phase = ''; ui.bossbar.hidden = true; ui.bname.textContent = 'The Gate Warden';
  }
  function ubRestoreRoyals() {
    if (!UB.keep) return;
    royals.forEach((r, i) => { const k = UB.keep[i]; r.pos.copy(k.pos); r.facing = k.facing; r.field = k.field; r.state = k.state; r.active = k.active; r.alive = k.alive; r.g.visible = k.vis; r.body.position.y = r.hover; r.body.rotation.set(0, 0, 0); });
    UB.keep = null;
  }
  // Death in the Dark Half: the gate stays open; respawn puts the brides and the roof back
  function ubAbort() { ubClear(); ubRestoreRoyals(); }
  function ubWin() {
    ubClear();
    G.lock = false; G.target = null; G.slow = 1.2;
    sfx('bossdown', 'royals'); G.shake = 1;
    const pr = ubProg(); pr.eyeDone = 1; pr.eyeGate = 0;
    playEnding();
  }

  // ---------- The ending: played in the game's own world (about 40 s, skippable) ----------
  const EN = { on: false, t: 0, fired: 0, cp: new THREE.Vector3(), cl: new THREE.Vector3(), boom: 0 };
  pfEl.addEventListener('pointerdown', ev => { ev.preventDefault(); skipEnding(); });
  const EN_SHOTS = [
    { t0: 0, t1: 6, p0: pv(7, 10.3, -15), p1: pv(8, 9.8, -11), l0: null, l1: null },
    { t0: 6, t1: 12, p0: pv(3, 10.6, -21), p1: pv(1.5, 10.2, -23.5), l0: pv(0, 9.6, -28.6), l1: pv(0, 9.8, -28.6) },
    { t0: 12, t1: 20, p0: pv(6.5, 11.2, -19.5), p1: pv(4.2, 10.4, -22), l0: pv(0, 9.8, -27.5), l1: pv(0, 9.6, -27.5) },
    { t0: 20, t1: 25, p0: pv(0, 10.6, -19.5), p1: pv(0, 10.2, -21.5), l0: pv(0, 9.6, -27.5), l1: pv(0, 9.4, -27.5) },
    { t0: 25, t1: 32, p0: pv(4, 10.5, -17), p1: pv(7, 10.3, -15), l0: pv(0, 9.8, -27.5), l1: null },
    { t0: 32, t1: 41, p0: pv(7, 10.3, -15), p1: pv(9, 9.6, -10), l0: null, l1: null }
  ];
  const EN_END = 41, EN_FIREWORKS = [13, 15, 17, 26, 27.5, 29, 30.5];
  const EN_LINES = [
    [0.8, 5.8, '', 'The Eye closed, and did not open again.'],
    [6.5, 9.2, '', 'The gate on the roof closed behind her. The Warden did not come back through it.'],
    [9.2, 12, 'A voice in the lantern', 'He kept the gate this time. Let him rest.'],
    [13, 16, 'Nyxara', 'Under this moon, I keep you.'],
    [16.2, 19.5, 'Vesthra', 'Under this moon, I keep you.'],
    [20.5, 24.5, 'Nyxara', 'Sister. You came home.'],
    [26, 31.5, '', 'For one night, the moon was whole.'],
    [32.5, 36, 'The Wickfather', 'Thank you, little light. I will take it from here.'],
    [36.5, 40.8, '', 'Someone had been waiting for every chain to fall. The moon broke again, and the night went on.']
  ];
  const EN_MEND = 2.5, EN_RECRACK = 36;

  function playEnding() {
    EN.on = true; EN.t = 0; EN.fired = 0; EN.boom = 0; G.cutscene = true; G.state = 'eye'; // no hunts, events or storms mid-ending
    endEvent(true);
    pfEl.hidden = false; document.body.classList.add('cutscene'); ui.banner.hidden = true;
    pfFlash.style.opacity = '1';
    royals.forEach((r, i) => {
      r.field = false; r.active = false; r.state = 'idle'; r.g.visible = true; r.body.rotation.x = 0; r.body.position.y = r.hover;
      r.pos.set(i === 0 ? -1.3 : 1.3, ROOF.y, -27.5); r.facing = i === 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  }
  function endEnding() {
    if (!EN.on) return;
    EN.on = false; G.cutscene = false;
    pfEl.hidden = true; document.body.classList.remove('cutscene'); pfFlash.style.opacity = '0';
    // The brides stay at the altar, at peace, through one lull; then the cycle of Ascensions takes them again
    S1.mend = 0; UB.keep = null;
    royals.forEach(r => { Object.assign(r, { field: false, active: false, alive: true, state: 'idle', atk: null }); r.pos.copy(r.home); r.body.rotation.set(0, 0, 0); r.body.position.y = r.hover; r.tele.hide(); });
    G.royalLull = Math.max(G.royalLull || 0, ROYAL_LULL);
    // The rewards for the end of the story, then the endless game goes on
    const m = tierMult(worldTier());
    reward(5000 * m, 3000 * m, player.position.clone().add(new THREE.Vector3(0, 3.6, 0)));
    PR.points += 5; if (PR.flaskMax < 7) PR.flaskMax++; recalc(); P.hp = P.max; P.mana = P.manaMax; P.armor = P.armorMax; P.flasks = PR.flaskMax; renderHero();
    G.state = 'interlude'; ui.hud.hidden = false; ui.bossbar.hidden = true;
    endEvent(true); G.eventClock = 0; G.huntClock = 0;
    showBanner('The Unblinking · The End', 'The Eye is closed, the Warden has kept his gate, and the brides have finished their vows. But the moon has cracked again, and someone in the Veil is holding what was left of the Eye. The worlds drift on: tiers rise, the queens return, rifts still open. Keep going.', 'title');
    bannerTimer = 12; sfx('horn');
    endRoyalHunt(true);
    saveGame();
  }
  function skipEnding() { if (EN.on) endEnding(); }
  function skipCutscene() { skipPreface(); skipEnding(); }

  function updateEnding(real) {
    if (!EN.on) return;
    keys.clear(); P.iframe = Math.max(P.iframe, 0.5); boss.visible = false;
    if (G.paused) return;
    const t = EN.t += Math.max(0, real);
    const s = EN_SHOTS.find(x => t < x.t1) || EN_SHOTS[EN_SHOTS.length - 1], k = pfEase(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1));
    EN.cp.copy(s.p0).lerp(s.p1, k);
    EN.cl.copy(s.l0 || moonAim()).lerp(s.l1 || moonAim(), k);
    // The Eye shuts and stays shut; the moon mends, then breaks again at the end
    S1.want = 0; S1.open = Math.max(0, S1.open - real * 0.6);
    S1.mend = t >= EN_MEND && t < EN_RECRACK ? 1 : 0;
    if (t >= EN_RECRACK && EN.boom < 1) { EN.boom = 1; sfx('boom'); G.shake = 0.6; }
    pfFlash.style.opacity = String(Math.max(0, 1 - t / 1.6) + (t >= EN_RECRACK ? Math.max(0, 0.6 - (t - EN_RECRACK) / 1.2) : 0));
    while (EN.fired < EN_FIREWORKS.length && t >= EN_FIREWORKS[EN.fired]) {
      launchFirework(pv((EN.fired % 2 ? 1 : -1) * (6 + Math.random() * 6), ROOF.y + 1, -24 - Math.random() * 6)); EN.fired++;
    }
    if (t >= 20) royals.forEach(r => { r.facing += angDiff(r.facing, yawTo(r.pos, EN.cp)) * Math.min(1, real * 3); });
    const line = EN_LINES.find(l => t >= l[0] && t < l[1]);
    pfWho.textContent = line ? line[2] : ''; pfLine.textContent = line ? line[3] : '';
    if (t >= EN_END) endEnding();
  }
  function endingCutCam(cp, cl) { if (!EN.on) return; cp.copy(EN.cp); cl.copy(EN.cl); }
