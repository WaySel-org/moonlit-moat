  // ---------- The Binding: five landmarks to take before the Eye can be fought (Loremaster) ----------
  // After Season 1's ending beat, with all four shards, the Eye still hides in the moon's dark half. To drag it down
  // the hero takes the five puzzle sites in the wildlands as landmarks. Beside each banner pole a rift to Ashfall hangs
  // open, and the dead pour out of it to guard the banner: solve the site's puzzle, then stand in the ring and raise the
  // moon banner while the rift sends more of the dead to stop you. Raising it seals that rift for good, and the dead
  // that came through it crumble. With all five banners flying, the banners bind the Eye into a body of bone and chain
  // over the meadow south of the lake, and the fight (46r-the-unblinking) begins when she walks out to meet it.
  // Flags in G.story.prog: bindOn, lmHeld [0|1 per site], eyeBound, eyeDone. An older save's eyeGate counts as bindOn.
  const LM_R = 4.5, LM_CAPTURE = 7, LM_WAKE = 50;
  const LM_ARENA = new THREE.Vector3(0, 0, 17);
  const BD = { pr: null, tipT: 0 };
  function lmProg() {
    const p = G.story.prog;
    if (p.eyeGate && !p.bindOn && !p.eyeDone) p.bindOn = 1;
    p.eyeGate = 0;
    if (!Array.isArray(p.lmHeld)) p.lmHeld = PUZZLE_SITES.map(() => 0);
    return p;
  }
  const lmSolved = i => PUZZLE_SITES[i].solved || ((G.story.prog.puzzles || [])[i] || 0) >= 1;
  const lmFlat = (x, z) => { const h = groundAt(x, z); return h !== null && h <= 0.4 && h >= -0.2; };

  // ----- The five landmarks: a banner pole in a ring just outside each puzzle site's opening, a rift beyond it -----
  const lmPoleM = new THREE.MeshLambertMaterial({ color: 0x8a8478, flatShading: true });
  const LM_MOON = new THREE.Color(0xcfe6ff), LM_DIM = new THREE.Color(0x5a5850), LM_AMBER = new THREE.Color(0xffc86a), LM_RED = new THREE.Color(0xff5a1a);
  const LM = PUZZLE_SITES.map((s, i) => {
    const spot = LANDMARK_SPOTS[i], px = spot.flag.x, pz = spot.flag.z;
    const g = new THREE.Group(); g.position.set(px, 0, pz); g.visible = false; scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.6, 6), lmPoleM); pole.position.y = 3.3; g.add(pole);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, fog: false })); cap.position.y = 6.75; g.add(cap);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4, 6, 1), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, side: THREE.DoubleSide, fog: false }));
    cloth.geometry.translate(1.1, 0, 0); cloth.position.y = 1; g.add(cloth);
    const ring = new THREE.Mesh(new THREE.RingGeometry(LM_R - 0.18, LM_R, 48), new THREE.MeshBasicMaterial({ color: 0x5a5850, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(LM_R - 0.2, 48), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    fill.rotation.x = -Math.PI / 2; fill.position.y = 0.05; g.add(fill);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 70, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.22, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    beam.position.y = 35; g.add(beam);
    tag(pole, 1); tag(cloth, 1); tag(cap, 1);
    // The rift: further toward the moat's centre
    const rx = spot.rift.x, rz = spot.rift.z;
    const rift = new THREE.Group(); rift.position.set(rx, 0, rz); rift.rotation.y = Math.atan2(px - rx, pz - rz); rift.visible = false; scene.add(rift);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.2, 6, 30), new THREE.MeshBasicMaterial({ color: 0xff5a1a, fog: false })); rim.position.y = 2.3; rift.add(rim);
    const maw = new THREE.Mesh(new THREE.CircleGeometry(2.0, 30), new THREE.MeshBasicMaterial({ color: 0x1a0402, side: THREE.DoubleSide, fog: false })); maw.position.y = 2.3; rift.add(maw);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.8, 30), new THREE.MeshBasicMaterial({ color: 0xff3a0a, transparent: true, opacity: 0.25, depthWrite: false, fog: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; rift.add(glow);
    tag(rim, 2); tag(maw, 2);
    return { i, site: s, title: '', pos: g.position, g, cloth, ring, fill, beam, rift, rim, maw, glow, riftPos: rift.position, seal: 0, ctl: 0, spawnT: 0, challenged: false };
  });
  LM.forEach(L => { const Z = PZ.find(z => z.site === L.site); L.title = Z ? Z.title : `Landmark ${L.i + 1}`; });
  // The binding: five threads of moonlight from the banners to the Eye's body over the meadow
  const lmThreads = LM.map(L => {
    const geo = new THREE.BufferGeometry().setFromPoints([L.pos.clone().setY(6.7), LM_ARENA.clone().setY(24)]);
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55, fog: false }));
    ln.visible = false; scene.add(ln); return ln;
  });
  function lmThreadsTo(p) {
    lmThreads.forEach(ln => { const a = ln.geometry.attributes.position; a.setXYZ(1, p.x, p.y, p.z); a.needsUpdate = true; });
  }

  // ----- The dead of Ashfall in the moat (their own pool, so Ashfall's hordes are untouched) -----
  const lmDead = [];
  for (let i = 0; i < 30; i++) {
    const ranged = i % 7 === 6;
    const c = addWorldCreep(ranged ? 'bloater' : 'shambler', 'material', ranged ? 'ranged' : 'melee', { wave: true, respawn: Infinity, siege: true });
    c.body0 = c.body.position.y; lmDead.push(c);
  }
  // Raises up to n of the dead in a ring around a point; with a goal they march on it instead of on her.
  // from: the landmark whose rift they came through, so sealing it can take them back.
  function lmSummon(at, n, r0, r1, goal, lvBonus, from) {
    loadShamblerModels(); // the modelled Shambler (25j) normally loads on entry to Ashfall; the Binding needs it here
    const out = [];
    for (const c of lmDead) {
      if (out.length >= n) break; if (c.alive) continue;
      let p = null;
      for (let t = 0; t < 30 && !p; t++) {
        const a = Math.random() * TAU, r = r0 + Math.random() * (r1 - r0), x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
        if (inPuzzleCircle(x, z, 2) || Math.abs(x) > G.edge - 4 || Math.abs(z) > G.edge - 4) continue;
        if (!lmFlat(x, z)) continue;
        p = V3(x, z);
      }
      if (!p) break;
      if (raiseMob(c, p, lvBonus || 0, true)) { c.goal = goal || null; c.from = from === undefined ? -1 : from; out.push(c); }
    }
    if (out.length) { const c0 = out[0].pos; burst(c0.x, 0.4, c0.z, 30, 6); if (flatDist(player.position, c0) < 60) sfx('portal'); }
    return out;
  }
  const lmHeldN = () => lmProg().lmHeld.filter(Boolean).length;
  const lmGarrison = L => lmDead.filter(c => c.alive && c.from === L.i);

  // ----- Starting, raising, binding -----
  function lmCheckStart() {
    const pr = lmProg();
    if (!storyOn() || pr.bindOn || pr.eyeDone || !pr.s1end || shardCount() < CHAPTERS.length) return;
    if (G.story.pending || !ui.banner.hidden || G.world !== 'moat' || (G.state !== 'explore' && G.state !== 'interlude')) return;
    pr.bindOn = 1; saveGame();
    moonEyeOpen(10); moonGlance(4);
    showBanner('The Binding', 'The Eye will not come down on its own. Raise the moon banner at all five landmarks in the wildlands. Beside each one a rift to Ashfall hangs open, and the dead pour out of it to guard the banner. Solve the landmark\'s puzzle, hold its ring while the dead come for you, and the raised banner seals the rift.', 'title');
    bannerTimer = 11; sfx('horn');
  }
  function lmRaise(L) {
    const pr = lmProg(); pr.lmHeld[L.i] = 1; L.ctl = 1; L.challenged = false; L.seal = 0; saveGame();
    sfx('horn'); burst(L.pos.x, 6.6, L.pos.z, 40, 7); G.shake = Math.max(G.shake, 0.4);
    // The rift seals, and the dead that came through it crumble back into ash
    burst(L.riftPos.x, 2.3, L.riftPos.z, 60, 9); sfx('boom');
    lmGarrison(L).forEach(c => { burst(c.pos.x, 0.8, c.pos.z, 16, 4); dropMob(c); c.goal = null; c.from = -1; });
    const m = tierMult(worldTier());
    reward(400 * m, 260 * m, L.pos.clone().add(new THREE.Vector3(0, 7.4, 0)));
    const n = lmHeldN();
    floatText(`Rift sealed · ${n} of ${LM.length}`, L.pos.clone().add(new THREE.Vector3(0, 8.2, 0)), 'word', '#cfe6ff');
    if (n < LM.length) showTip('Banner raised, rift sealed', [`${n} of ${LM.length} landmarks taken.`, 'No more of the dead will come through here.'], 5);
  }
  function lmBind() {
    const pr = lmProg(); pr.eyeBound = 1; saveGame();
    lmDead.forEach(c => { c.goal = null; });
    moonEyeOpen(16); moonGlance(6); sfx('portal'); sfx('roar'); G.shake = 0.7;
    showBanner('The Eye is bound', 'Five threads of moonlight pull the Eye out of the dark half and down into a body of bone and chain, over the meadow south of the lake. At the shore the Warden plants his sword and takes hold of the threads: “She told me she would come home. Go. I will hold it.”', 'title');
    bannerTimer = 10;
  }

  function updateBinding(real) {
    const pr = lmProg(), tt = uTime.value;
    if (BD.pr !== pr) { BD.pr = pr; LM.forEach(L => { const h = !!pr.lmHeld[L.i]; L.ctl = h ? 1 : 0; L.seal = h ? 1 : 0; L.challenged = false; L.spawnT = 0; }); }
    lmCheckStart();
    if (storyOn() && pr.bindOn && !pr.eyeDone) loadShamblerModels();
    const show = storyOn() && G.world === 'moat' && !!(pr.bindOn || pr.eyeDone);
    LM.forEach(L => { L.g.visible = show; L.rift.visible = show && L.seal < 1 && !pr.eyeDone; });
    lmThreads.forEach(ln => { ln.visible = show && !!pr.eyeBound && !pr.eyeDone; });
    // A new game or a finished story: no stray dead left in the moat
    if ((!pr.bindOn || !storyOn()) && !UB.on) lmDead.forEach(c => { if (c.alive) { dropMob(c); c.goal = null; c.from = -1; } });
    if (!show) return;
    const live = realmKey() === 'material' && !G.paused && G.state !== 'dead' && !G.cutscene;
    const dt = live ? Math.max(0, real) : 0;
    const taking = !!pr.bindOn && !pr.eyeBound && !pr.eyeDone;
    BD.tipT = Math.max(0, BD.tipT - dt);
    LM.forEach(L => {
      const held = !!pr.lmHeld[L.i], solved = lmSolved(L.i);
      const here = flatDist(player.position, L.pos) < LM_R && player.position.y < 1.6;
      const foes = taking && !held ? lmDead.filter(c => c.alive && flatDist(c.pos, L.pos) < LM_R + 0.6).length : 0;
      if (taking && !held && live) {
        // The rift's dead fight her for the landmark: they hunt her while she works its puzzle, stand watch over the
        // banner once it is solved, and pour out while she tries to raise it
        const near = flatDist(player.position, L.pos) < LM_WAKE;
        const atPuzzle = !solved && flatDist(player.position, L.site) < L.site.r + 4;
        if (near && (solved || atPuzzle)) {
          const guard = lmGarrison(L).length, capping = solved && (here || L.ctl > 0), lv = Math.floor(lmHeldN() / 2);
          const want = capping ? Math.min(7, 4 + lv) : atPuzzle ? Math.min(5, 3 + lv) : 3;
          L.spawnT -= dt;
          if (guard < want && L.spawnT <= 0) {
            L.spawnT = capping ? 4 : atPuzzle ? 5 : 2.5;
            if (atPuzzle && !L.huntTold) { L.huntTold = true; showTip(L.title, 'The rift beside the banner pole has seen you. Its dead will hunt you while you work the puzzle.', 5); }
            lmSummon(L.riftPos, capping ? 2 : 1, 0.6, 2.2, solved ? L.pos : null, lv, L.i);
            burst(L.riftPos.x, 2.3, L.riftPos.z, 18, 5);
          }
        }
        if (here && solved) {
          if (foes) { if (Math.random() < dt * 1.5) floatText('contested', L.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#ff8a6a'); }
          else {
            if (!L.challenged) { L.challenged = true; showTip(L.title, 'The banner climbs while the ring is yours. The rift will send the dead to stop it: keep them out of the ring.', 5); }
            L.ctl = Math.min(1, L.ctl + dt / LM_CAPTURE);
            if (L.ctl >= 1) lmRaise(L);
          }
        } else if (here && !solved && BD.tipT <= 0) {
          BD.tipT = 8; showTip(L.title, `This landmark answers only to whoever solved its puzzle. Solve ${L.title} first, then stand in the ring.`, 6);
        } else if (!here && L.ctl > 0) { L.ctl = Math.max(0, L.ctl - dt / 20); if (L.ctl <= 0) L.challenged = false; }
      }
      // The banner climbs the pole with its control; the ring shows the state
      L.cloth.position.y = 1 + L.ctl * 5.1;
      L.cloth.rotation.y = Math.sin(tt * 2.2 + L.i) * 0.3;
      L.cloth.material.color.copy(foes && here && Math.sin(tt * 10) > 0 ? LM_RED : LM_MOON);
      L.ring.material.color.copy(held ? LM_MOON : foes ? LM_RED : solved ? LM_AMBER : LM_DIM);
      L.fill.material.opacity = here && taking && !held ? 0.08 + 0.1 * L.ctl : 0;
      L.beam.visible = held && !pr.eyeDone;
      L.beam.material.opacity = 0.16 + 0.08 * Math.sin(tt * 3 + L.i);
      // The rift: churning while open, folding shut once sealed
      if (L.rift.visible) {
        if (held) L.seal = Math.min(1, L.seal + Math.max(0, real) * 1.2);
        const k = held ? 1 - L.seal : 1;
        L.rift.scale.setScalar(Math.max(0.001, k));
        L.rim.rotation.z = tt * 0.8; L.maw.scale.setScalar(0.92 + 0.08 * Math.sin(tt * 5 + L.i));
        L.glow.material.opacity = 0.18 + 0.1 * Math.sin(tt * 3 + L.i);
        if (live && Math.random() < dt * 2) burst(L.riftPos.x + (Math.random() - 0.5) * 2, 2.3 + (Math.random() - 0.5) * 2, L.riftPos.z, 2, 2);
      }
    });
    if (taking && pr.lmHeld.every(Boolean)) lmBind();
  }
  function bindingText() {
    const pr = lmProg();
    if (!storyOn() || pr.eyeDone || !pr.bindOn) return null;
    if (pr.eyeBound) return 'The Eye is bound over the meadow south of the lake. Go and face it.';
    const n = lmHeldN(), next = LM.find(L => !pr.lmHeld[L.i]);
    return `The Binding · ${n} of ${LM.length} banners raised. ${next ? (lmSolved(next.i) ? `Raise the banner at ${next.title} and seal its rift.` : `Solve ${next.title} while its rift's dead hunt you, then raise its banner.`) : ''}`;
  }
  // The minimap: a banner per landmark (moon white raised, amber claimable, grey locked), a red ring for each open
  // rift, and the bound Eye over the meadow
  function drawLandmarks(c, X, Z, big) {
    const pr = lmProg();
    if (!storyOn() || (!pr.bindOn && !pr.eyeDone)) return;
    const k = big ? 7 : 4;
    LM.forEach(L => {
      const x = X(L.pos.x), z = Z(L.pos.z), held = pr.lmHeld[L.i];
      if (!held && !pr.eyeDone) { c.strokeStyle = '#ff5a1a'; c.lineWidth = big ? 2 : 1.5; c.beginPath(); c.arc(X(L.riftPos.x), Z(L.riftPos.z), k * 0.55, 0, TAU); c.stroke(); }
      const col = held ? '#cfe6ff' : lmSolved(L.i) ? '#ffc86a' : '#7a7870';
      c.strokeStyle = c.fillStyle = col; c.lineWidth = big ? 2 : 1.5;
      c.beginPath(); c.moveTo(x, z + k * 0.7); c.lineTo(x, z - k); c.stroke();
      c.beginPath(); c.moveTo(x, z - k); c.lineTo(x + k * 0.9, z - k * 0.65); c.lineTo(x, z - k * 0.3); c.closePath();
      if (held) c.fill(); else c.stroke();
    });
    if (pr.eyeBound && !pr.eyeDone) {
      const x = X(LM_ARENA.x), z = Z(LM_ARENA.z);
      c.fillStyle = '#ff4a12'; c.beginPath(); c.ellipse(x, z, k * 1.1, k * 0.6, 0, 0, TAU); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(x, z, k * 0.3, 0, TAU); c.fill();
    }
  }
