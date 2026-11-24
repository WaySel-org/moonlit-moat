  // ---------- The Unblinking: the Eye's fight and the story's ending (Loremaster with the Shardkeeper of the Moat) ----------
  // The Binding (46r-the-binding) drags the Eye down into a body of bone and chain, the Vessel, over the meadow south
  // of the lake. Walking out to it starts the last fight; then the ending plays in the game's own world and the
  // endless game goes on. The Vessel drifts around the meadow and fights back the whole time:
  //  - Gaze Sweep: a long lane from the Vessel toward her, then a beam down it. Roll out of the lane.
  //  - Tears: burning drops fall in circles around her, one after another.
  //  - Root Burst: a ring of roots erupts around the Vessel when she stands close. Back off or roll through.
  //  1. The Gaze, until 66%.
  //  2. The Stolen Crowns: the brides hang chained under the Vessel and it hides behind them (a quarter damage) until
  //     the chains break. Strike the chains, never the brides. Freed, Vesthra turns its veins to stone (30% more
  //     damage) and Nyxara pins it with thorns (it drifts and attacks slower). The dead of Ashfall start to rise.
  //  3. Parallel Sight, from 35%: four roots, one from each world, break through the meadow. The Vessel is warded and
  //     mends itself while any stands. Cut all four.
  //  4. The Blink: dark but the lantern. Parry its last gaze as it fires; the Vessel falls open. Strike it.
  // Flags live in G.story.prog (eyeBound, eyeDone, eyeRuns) so they save and a new game clears them.
  const UB = { on: false, phase: '', t: 0, hp: 1, max: 1, freed: {}, blink: null, keep: null, atkT: 0, sumT: 0, lastAtk: '', pos: new THREE.Vector3(), drift: 0, hover: 24, beamT: 0, beamF: 0 };
  const UB_ARENA = LM_ARENA, UB_LEASH = 55;
  const UB_ORANGE = 0xff4a12;
  const ubM = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o));

  // ----- The Vessel: an eye in a cage of ribs, hung on chains -----
  const ubVessel = new THREE.Group(); ubVessel.visible = false; scene.add(ubVessel);
  const ubBoneM = new THREE.MeshLambertMaterial({ color: 0xd8cfb4, flatShading: true, emissive: 0x1a0804 });
  const ubEye = new THREE.Group(); ubVessel.add(ubEye);
  const ubSclera = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 14), new THREE.MeshLambertMaterial({ color: 0xe8dccb, emissive: 0x2a0a04 })); ubEye.add(ubSclera);
  const ubIris = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), ubM(UB_ORANGE)); ubIris.position.z = 1.52; ubEye.add(ubIris);
  const ubPupil = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), ubM(0x000000)); ubPupil.position.z = 1.54; ubEye.add(ubPupil);
  const ubRibs = [];
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.13, 5, 20, Math.PI * 1.25), ubBoneM);
    rib.rotation.set(Math.PI / 2, 0, i / 6 * TAU); rib.rotation.order = 'ZXY'; ubVessel.add(rib); ubRibs.push(rib);
  }
  const ubSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.4, 6), ubBoneM); ubSpine.position.y = 2.6; ubVessel.add(ubSpine);
  const ubTail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 6), ubBoneM); ubTail.position.y = -2.4; ubTail.rotation.x = Math.PI; ubVessel.add(ubTail);
  // The chains the brides hang from (shown while they are bound)
  const ubHangs = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), new THREE.MeshLambertMaterial({ color: 0x3a3440, emissive: 0x401008 })); m.visible = false; scene.add(m); return m; });
  // The beam of the Gaze Sweep, flashed down the lane as it lands
  const ubBeam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1), ubM(UB_ORANGE, { transparent: true, opacity: 0.6, depthWrite: false }));
  ubBeam.visible = false; scene.add(ubBeam);
  tag(ubVessel, 2);
  const ubTele = makeTele();

  // ----- Targets: the Vessel itself, the brides' chains, the four world roots -----
  function ubTarget(kind, mesh, hits, extra) {
    return Object.assign({ kind, g: mesh, pos: mesh ? mesh.position : new THREE.Vector3(), radius: 0.9, hitY: 1.2, markY: 3, isEye: true, alive: false, hits, left: hits, flash: 0 }, extra || {});
  }
  const ubCore = ubTarget('core', null, Infinity, { pos: UB.pos, radius: 2.3, hitY: 2.6, markY: 6.2 });
  const chainMk = () => {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x3a3440, emissive: 0x401008 });
    for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 4, 8), m); l.position.y = 0.9 + k * 0.34; l.rotation.y = k % 2 ? Math.PI / 2 : 0; g.add(l); }
    g.visible = false; scene.add(g); tag(g, 2); return g;
  };
  const ubChains = [0, 1].map(i => ubTarget('chain', chainMk(), 6, { bride: i, radius: 1.2, hitY: 1.4, markY: 4.2 }));
  const rootMk = (col) => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), ubM(col)); core.position.y = 1.3; g.add(core);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ubM(0x000000)); pup.position.set(0, 1.3, 0.75); g.add(pup);
    const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 30, 6, 1, true), ubM(col, { transparent: true, opacity: 0.7 })); vein.position.y = 16; g.add(vein);
    g.userData = { core, pup }; g.visible = false; scene.add(g); tag(g, 2); return g;
  };
  const UB_WORLD_ROOTS = [['Veyra', 0x6aff8a, -12, 0], ['Neon Verge', 0x3af0ff, 12, 0], ['Ashfall', 0xff9a3a, 0, 11], ['the Veil', 0xc8a9ff, 0, -10]];
  const ubWorldRoots = UB_WORLD_ROOTS.map(([name, col, x, z]) => { const r = ubTarget('wroot', rootMk(col), 4, { world: name, col, radius: 1.2, hitY: 1.4, markY: 3.4 }); r.g.position.set(UB_ARENA.x + x, 0, UB_ARENA.z + z); return r; });

  // The darkness of the Blink: everything but a circle of lantern light around her
  const ubDark = document.createElement('div'); ubDark.id = 'eyedark';
  ubDark.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .8s;background:radial-gradient(circle at 50% 58%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 15vmin, rgba(0,0,0,.94) 34vmin)';
  document.body.appendChild(ubDark);
  // What the Eye's attacks pass to hitPlayer: parry routes here, and pow scales its damage like a boss
  const UB_ATK = { isEye: true, pow: 1 };

  function ubTargets() {
    if (!UB.on) return [];
    const out = [];
    if (ubCore.alive) out.push(ubCore);
    ubChains.forEach(c => { if (c.alive) out.push(c); });
    ubWorldRoots.forEach(r => { if (r.alive) out.push(r); });
    return out;
  }
  const ubChained = () => ubChains.some(c => c.alive);
  const ubRootsLeft = () => ubWorldRoots.filter(r => r.alive).length;
  function unblinkingText() {
    if (UB.on) return UB.phase === 'blink' ? 'The Blink · parry its last gaze as it fires.'
      : UB.phase === 'final' ? 'The Vessel has fallen open. Strike it.'
      : UB.phase === 'crowns' && ubChained() ? 'The Stolen Crowns · it hides behind the brides. Strike their chains, not them.'
      : UB.phase === 'sight' ? `Parallel Sight · it is warded and mending. Cut the roots of all four worlds (${ubRootsLeft()} left).`
      : 'The Unblinking · strike the Vessel. Roll out of its gaze, keep moving under the tears, back off when the roots stir.';
    return bindingText();
  }

  // ----- The fight -----
  function startUnblinking() {
    if (UB.on || EN.on) return;
    const tier = worldTier(), asc = G.ascension || 0;
    G.dmgMult = (1 + 0.2 * (tier - 1)) * (1 + 0.25 * asc); G.bossTier = tier;
    UB_ATK.pow = 1.9 + 0.2 * (tier + 2 + 2 * asc - 1);
    endRoyalHunt(true); endEvent(true); clearStrikes();
    if (P.mount) dismount(true);
    UB.max = Math.round(5200 * (1 + 0.35 * (tier + 1 + 2 * asc))); UB.hp = UB.max;
    Object.assign(UB, { on: true, phase: 'wake', t: 0, freed: {}, blink: null, atkT: 2.5, sumT: 8, lastAtk: '', drift: 0, beamT: 0 });
    UB.pos.copy(UB_ARENA); ubCore.alive = true;
    // The brides leave the land and hang chained under the Vessel
    UB.keep = royals.map(r => ({ pos: r.pos.clone(), facing: r.facing, field: r.field, state: r.state, active: r.active, alive: r.alive, vis: r.g.visible }));
    royals.forEach(r => { r.field = false; r.active = false; r.state = 'idle'; r.atk = null; r.tele.hide(); r.body.rotation.set(0, 0, 0); r.facing = 0; });
    G.state = 'eye'; G.lock = false; G.target = null; G.hunt = null;
    ui.hud.hidden = true; ui.royalbars.hidden = true; ui.bossbar.hidden = false;
    ui.bname.textContent = 'The Unblinking';
    sfx('roar'); G.shake = 0.8;
    showBanner('The Unblinking', 'The Vessel comes down out of the sky on five threads of moonlight, and the Eye inside it opens.', 'title'); bannerTimer = 4;
    lmProg().eyeRuns = (lmProg().eyeRuns || 0) + 1;
  }
  function ubSetPhase(ph) {
    UB.phase = ph; UB.t = 0;
    if (ph === 'crowns') {
      ubChains.forEach(c => { c.alive = !UB.freed[c.bride]; c.left = c.hits; c.g.visible = c.alive; });
      lmSummon(UB_ARENA, 4, 16, 22, null, 0);
      showBanner('The Stolen Crowns', 'The brides hang from the Vessel on chains, and it hides behind them. Strike the chains, not them.', 'title'); bannerTimer = 4; sfx('boss', 'royals');
    }
    if (ph === 'sight') {
      ubChains.forEach(c => { c.alive = false; c.g.visible = false; });
      ubWorldRoots.forEach(r => { r.alive = true; r.left = r.hits; r.g.visible = true; });
      showBanner('Parallel Sight', 'The Eye looks through every world at once. Its roots break through the meadow from Veyra, Neon Verge, Ashfall and the Veil, and while they stand it is warded and mends. Cut all four.', 'title'); bannerTimer = 5; sfx('portal');
    }
    if (ph === 'blink') {
      clearStrikes(); ubBeam.visible = false;
      UB.blink = { t: 0, stage: 'wait' }; ubDark.style.opacity = '1';
      showBanner('The Blink', 'Everything goes dark but your lantern. When it looks at you one last time, parry.', 'title'); bannerTimer = 4;
    }
  }
  // Each phase has a floor, so a big hit never skips the next phase or empties the bar before the Blink
  const UB_FLOOR = { wake: 1, gaze: 0.66, crowns: 0.35, sight: 0.1, blink: 0.1 };
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
    if (t.kind === 'core') {
      if (UB.phase === 'final') { UB.hp = 0; ubHurt(Math.max(1, dmg), at, true); return; }
      const ward = (UB.phase === 'crowns' && ubChained() ? 0.25 : 1) * (UB.phase === 'sight' && ubRootsLeft() ? 0.2 : 1);
      if (ward < 1 && Math.random() < 0.35) floatText('warded', at.clone().add(new THREE.Vector3(0, 0.7, 0)), 'word', '#c8a9ff');
      ubHurt(dmg * (UB.freed[0] ? 1.3 : 1) * ward, at, heavy);
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
    ['Vesthra, free', '“Stone does not fade. Let me hold it still for you.” Its veins turn to stone: the Vessel takes 30% more damage.'],
    ['Nyxara, free', '“Sister. I remember now. Run at it, not away.” Thorns pin the Vessel: it drifts and strikes slower.']
  ];
  function ubFreeBride(i) {
    UB.freed[i] = true; const r = royals[i];
    sfx(i ? 'empress' : 'gorgon'); burst(r.pos.x, 2, r.pos.z, 40, 6); G.shake = Math.max(G.shake, 0.4);
    showTip(UB_FREED_LINES[i][0], UB_FREED_LINES[i][1], 7);
  }
  // A parry during the Blink: the Vessel falls open for the last strike
  function eyeParried() {
    if (!UB.on || UB.phase !== 'blink' || !UB.blink || UB.blink.stage !== 'fire') return;
    UB.blink.parried = true;
  }

  // ----- Its attacks -----
  const ubOrbGeo = new THREE.SphereGeometry(0.45, 10, 8), ubOrbMat = ubM(UB_ORANGE);
  const ubOrbs = [];
  function ubAttack() {
    const p = player.position, d = flatDist(p, UB.pos), ph = UB.phase;
    const pick = d < 6 && UB.lastAtk !== 'roots' && Math.random() < 0.65 ? 'roots' : UB.lastAtk === 'sweep' ? 'tears' : Math.random() < 0.55 ? 'sweep' : 'tears';
    UB.lastAtk = pick;
    if (pick === 'sweep') {
      const f = yawTo(UB.pos, p), fs = ph === 'sight' ? [f - 0.45, f + 0.45] : [f];
      fs.forEach(ff => groundStrike({ lane: true, at: UB.pos.clone().setY(0), facing: ff, len: 28, w: 2.8, wind: 1.15, dmg: 30, kb: 9, src: UB_ATK, sound: 'breath' }));
      UB.beamT = 1.15; UB.beamF = fs[0]; sfx('cast');
    } else if (pick === 'tears') {
      const n = ph === 'gaze' ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, r = i === 0 ? 0 : 1.6 + Math.random() * 3.6, at = V3(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r), wind = 0.9 + i * 0.25;
        groundStrike({ at, r: 1.7, wind, dmg: 18, kb: 5, src: UB_ATK, sound: 'ember' });
        const m = new THREE.Mesh(ubOrbGeo, ubOrbMat); m.position.set(at.x, 18, at.z); scene.add(m); tag(m, 2); ubOrbs.push({ m, t: 0, wind });
      }
    } else {
      const n = 7, off = Math.random() * TAU;
      for (let i = 0; i < n; i++) { const a = off + i / n * TAU; groundStrike({ at: V3(UB.pos.x + Math.cos(a) * 3.9, UB.pos.z + Math.sin(a) * 3.9), r: 2.2, wind: 1.0, dmg: 24, kb: 10, src: UB_ATK, sound: 'boom' }); }
      floatText('the roots stir', UB.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 'word', '#ffb07a');
    }
  }

  function updateUnblinking(real) {
    const pr = lmProg(), tt = uTime.value;
    updateBinding(real);
    // The bound Vessel waits high over the meadow until she walks out to it
    const waiting = storyOn() && G.world === 'moat' && pr.eyeBound && !pr.eyeDone && !UB.on && !EN.on;
    if (!UB.on) {
      ubVessel.visible = waiting;
      if (waiting) {
        ubVessel.position.set(UB_ARENA.x, 22 + Math.sin(tt * 0.7) * 0.8, UB_ARENA.z); ubVessel.rotation.y = tt * 0.25;
        ubEye.lookAt(player.position.x, player.position.y + 1, player.position.z);
        lmThreadsTo(ubVessel.position.clone().add(new THREE.Vector3(0, 2.6, 0)));
        if ((G.state === 'explore' || G.state === 'interlude') && G.realm === 'material' && !G.storm && player.position.y < 1.6 && flatDist(player.position, UB_ARENA) < 15) startUnblinking();
      }
    }
    updateEnding(real);
    if (!UB.on) return;
    if (G.state === 'dead') { ubAbort(); return; }
    // Nothing else may take the field while the Eye is fought (a respawn, a reset from the pause screen)
    if (G.state !== 'eye') { UB.keep = null; ubClear(); return; }
    if (G.paused) return;
    if (flatDist(player.position, UB_ARENA) > UB_LEASH || G.world !== 'moat') {
      ubAbort(); showBanner('The Eye lets you go', 'The Vessel rises back up its threads to wait over the meadow. Come back when you are ready.', 'title'); bannerTimer = 5; return;
    }
    const dt = Math.max(0, G.hitstop > 0 ? 0 : G.slow > 0 ? real * 0.3 : real);
    UB.t += dt;
    moonEyeOpen(2); boss.visible = false; G.hunt = null;

    // The Vessel: comes down out of the sky, drifts around the meadow and watches her; the Blink brings it low
    const want = UB.phase === 'wake' ? 3.4 : UB.phase === 'final' ? 1.4 : 3.4;
    if (UB.phase === 'wake') UB.hover = Math.max(want, 22 - UB.t * 6); else UB.hover += (want - UB.hover) * Math.min(1, dt * 2);
    if (['gaze', 'crowns', 'sight'].includes(UB.phase)) {
      UB.drift += dt * 0.32 * (UB.freed[1] ? 0.5 : 1);
      const aim = new THREE.Vector3(UB_ARENA.x + Math.sin(UB.drift) * 8, 0, UB_ARENA.z + Math.sin(UB.drift * 1.6) * 5).lerp(player.position.clone().setY(0), 0.25);
      const dx = aim.x - UB.pos.x, dz = aim.z - UB.pos.z, dd = Math.hypot(dx, dz), sp = 2.4 * (UB.freed[1] ? 0.5 : 1);
      if (dd > 0.05) { const s = Math.min(dd, sp * dt); UB.pos.x += dx / dd * s; UB.pos.z += dz / dd * s; }
    }
    ubVessel.visible = true;
    ubVessel.position.set(UB.pos.x, UB.hover + Math.sin(tt * 1.4) * 0.25, UB.pos.z);
    ubVessel.rotation.y += dt * 0.3;
    ubRibs.forEach((rb, i) => { rb.scale.setScalar(UB.phase === 'final' ? 1.25 : 1 + 0.04 * Math.sin(tt * 3 + i)); });
    ubEye.lookAt(player.position.x, player.position.y + 1, player.position.z);
    ubPupil.scale.setScalar(UB.phase === 'final' ? 2 : UB.phase === 'blink' && UB.blink && UB.blink.stage === 'charge' ? 0.5 : 1 + ubCore.flash * 0.4);
    ubCore.flash = Math.max(0, ubCore.flash - dt * 5);
    ubSclera.material.emissive.setRGB(0.16 + ubCore.flash * 0.5, 0.04 + ubCore.flash * 0.3, 0.02);
    lmThreadsTo(ubVessel.position.clone().add(new THREE.Vector3(0, 2.6, 0)));
    // It is a body now: she cannot walk through it
    if (UB.hover < 5) { const dx = player.position.x - UB.pos.x, dz = player.position.z - UB.pos.z, dd = Math.hypot(dx, dz); if (dd < 1.8 && dd > 1e-4) movePlayer(dx / dd * (1.8 - dd), dz / dd * (1.8 - dd)); }
    [...ubWorldRoots].forEach(r => { if (r.alive) { r.g.userData.core.rotation.y += dt * 1.5; r.g.userData.core.scale.setScalar(1 + 0.08 * Math.sin(tt * 6) + r.flash * 0.25); r.g.userData.pup.lookAt(player.position.x, 1.3, player.position.z); } r.flash = Math.max(0, r.flash - dt * 5); });
    ubChains.forEach(c => { c.flash = Math.max(0, c.flash - dt * 5); });

    // Phases
    if (UB.phase === 'wake' && UB.t > 3.5) { ubSetPhase('gaze'); showTip('The Unblinking', ['Strike the Vessel. It fights back:', 'Roll out of the lane before its gaze lands.', 'Keep moving under the tears. Back off when the roots stir.'], 8); }
    const frac = UB.hp / UB.max;
    if (UB.phase === 'gaze' && frac <= 0.66) ubSetPhase('crowns');
    if (UB.phase === 'crowns' && frac <= 0.35 && !ubChained()) ubSetPhase('sight');
    if (UB.phase === 'sight') {
      if (ubRootsLeft()) UB.hp = Math.min(UB.max * 0.35, UB.hp + UB.max * 0.004 * dt);
      else ubSetPhase('blink');
    }
    if (UB.phase === 'blink') ubUpdateBlink(dt);
    if (UB.phase === 'final' && UB.hp <= 0) { ubWin(); return; }

    // Attacks: faster as it weakens, slower while Nyxara's thorns hold it
    if (['gaze', 'crowns', 'sight'].includes(UB.phase)) {
      UB.atkT -= dt;
      if (UB.atkT <= 0) { ubAttack(); UB.atkT = (UB.phase === 'gaze' ? 2.6 : UB.phase === 'crowns' ? 2.2 : 1.8) * (UB.freed[1] ? 1.25 : 1); }
      if (UB.phase !== 'gaze') { UB.sumT -= dt; if (UB.sumT <= 0) { UB.sumT = UB.phase === 'sight' ? 14 : 18; lmSummon(UB_ARENA, 3, 16, 22, null, 0); } }
    }
    if (UB.beamT > 0) {
      UB.beamT -= dt;
      if (UB.beamT <= 0) {
        const f = fwdOf(UB.beamF), L = 28;
        ubBeam.visible = true; ubBeam.scale.set(1, 1, L); ubBeam.position.set(UB.pos.x + f.x * L / 2, 0.6, UB.pos.z + f.z * L / 2); ubBeam.rotation.y = UB.beamF;
        ubBeam.material.opacity = 0.7; UB.beamT = -0.35;
      }
    } else if (UB.beamT < 0) { UB.beamT = Math.min(0, UB.beamT + dt); ubBeam.material.opacity = 0.7 * (-UB.beamT / 0.35); if (UB.beamT >= 0) ubBeam.visible = false; }
    for (let i = ubOrbs.length - 1; i >= 0; i--) { const O = ubOrbs[i]; O.t += dt; const k = O.t / O.wind; O.m.position.y = 18 * (1 - k * k); if (k >= 1) { scene.remove(O.m); ubOrbs.splice(i, 1); } }

    // The bar: the Eye's health and its phase
    ui.bossbar.hidden = false;
    ui.bfill.style.width = ui.bghost.style.width = (UB.hp / UB.max * 100) + '%';
    ui.pfill.style.width = '0%';
    ui.btag.textContent = UB.phase === 'blink' ? 'The Blink' : UB.phase === 'final' ? 'Open' : UB.phase === 'sight' ? `Parallel Sight · ${ubRootsLeft()} roots` : UB.phase === 'crowns' ? (ubChained() ? 'The Stolen Crowns · warded' : 'The Stolen Crowns') : 'The Gaze';
    ui.obj.textContent = unblinkingText();
  }

  // The brides: hidden until the Crowns, chained under the Vessel until freed, standing on the meadow after. Called
  // by the loop right after the royals update (core/53-loop), before the frame renders, so it overrides their idle pose.
  function ubPoseBrides() {
    ubHangs.forEach(h => { h.visible = false; });
    if (!UB.on) return;
    const tt = uTime.value, right = new THREE.Vector3(Math.cos(ubVessel.rotation.y), 0, -Math.sin(ubVessel.rotation.y));
    royals.forEach((r, i) => {
      const show = ['crowns', 'sight', 'blink', 'final'].includes(UB.phase) || UB.freed[i];
      r.g.visible = show && G.world === 'moat';
      if (!show) return;
      const s = i ? 1 : -1;
      if (UB.freed[i]) {
        r.pos.set(UB_ARENA.x + s * 9, 0, UB_ARENA.z + 8);
        r.body.position.y = r.hover + Math.sin(tt * 1.5 + i) * 0.1; r.body.rotation.x = 0;
      } else {
        r.pos.set(UB.pos.x + right.x * s * 3.3, 0, UB.pos.z + right.z * s * 3.3);
        r.body.position.y = r.hover + 1.4 + Math.sin(tt * 0.8 + i) * 0.15; r.body.rotation.x = 0.25;
        const h = ubHangs[i], top = ubVessel.position.y - 0.4, bot = r.body.position.y + 2.2, len = Math.max(0.5, top - bot);
        h.visible = true; h.scale.y = len; h.position.set(r.pos.x, bot + len / 2, r.pos.z);
      }
      const c = ubChains[i]; c.g.position.set(r.pos.x, r.body.position.y + 0.6, r.pos.z); c.g.rotation.y = Math.sin(tt * 1.3 + i) * 0.2;
      c.pos.copy(r.pos);
      r.facing = yawTo(r.pos, player.position); r.g.rotation.y = r.facing;
    });
  }
  // The chain targets must sit at ground level for the hero's reach check; their meshes hang above
  ubChains.forEach(c => { c.pos = new THREE.Vector3(); });

  function ubUpdateBlink(dt) {
    const K = UB.blink; K.t += dt;
    const p = player.position;
    if (K.stage === 'wait' && K.t > 2.2) { K.stage = 'charge'; K.t = 0; K.parried = false; sfx('cast'); }
    if (K.stage === 'charge') {
      ubTele.circle(p.x, 0, p.z, 2.4, K.t / 2.4);
      S1.blink = 0; moonEyeOpen(5);
      if (K.t >= 2.4) {
        K.stage = 'fire'; K.t = 0; ubTele.hide();
        sfx('boom'); G.shake = Math.max(G.shake, 0.7);
        hitPlayer(48, UB.pos.clone(), 10, true, UB_ATK);
        if (K.parried) {
          UB.phase = 'final'; ubDark.style.opacity = '0.55';
          showBanner('The Vessel falls open', 'It has nothing left to look with. Strike it.', 'title'); bannerTimer = 3;
          floatText('IT BLINKS', p.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#fff2c8');
        } else floatText('parry as it fires', p.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ffb07a');
      }
    }
    if (K.stage === 'fire' && K.t > 0.3) { K.stage = 'wait'; K.t = 0; }
  }

  function ubClear() {
    ubOrbs.forEach(O => scene.remove(O.m)); ubOrbs.length = 0;
    clearStrikes(); ubTele.hide(); ubBeam.visible = false; ubDark.style.opacity = '0';
    [ubCore, ...ubChains, ...ubWorldRoots].forEach(t => { t.alive = false; if (t.g) t.g.visible = false; });
    ubHangs.forEach(h => { h.visible = false; });
    lmDead.forEach(c => { if (c.alive && !c.goal) dropMob(c); });
    UB.on = false; UB.phase = ''; ui.bossbar.hidden = true; ui.hud.hidden = false; ui.bname.textContent = 'The Gate Warden';
  }
  function ubRestoreRoyals() {
    if (!UB.keep) return;
    royals.forEach((r, i) => { const k = UB.keep[i]; r.pos.copy(k.pos); r.facing = k.facing; r.field = k.field; r.state = k.state; r.active = k.active; r.alive = k.alive; r.g.visible = k.vis; r.body.position.y = r.hover; r.body.rotation.set(0, 0, 0); });
    UB.keep = null;
  }
  // Death or fleeing: the Vessel goes back up to wait, and the brides go back to the land
  function ubAbort() { ubClear(); ubRestoreRoyals(); }
  function ubWin() {
    ubClear();
    G.lock = false; G.target = null; G.slow = 1.2;
    sfx('bossdown', 'royals'); G.shake = 1;
    const pr = lmProg(); pr.eyeDone = 1; pr.eyeBound = 0; pr.bindOn = 0;
    ubVessel.visible = false;
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
    [6.5, 9.2, '', 'The threads of moonlight went slack. The Warden had held them to the last, and he did not let go.'],
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
