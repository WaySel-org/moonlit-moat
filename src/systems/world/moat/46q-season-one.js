  // ---------- Season 1, The Broken Wedding (owned by the Loremaster with the Shardkeeper of the Moat) ----------
  // The story ships in seasons (lore/seasons.md). STORY_SEASON is the released season; later seasons' beats check it.
  // Season 1: the moon cracked at the queens' wedding, and an eye split by the crack watches the Wanderer.
  //  - The cracked moon: a dark half and a jagged crack over the moon. An orange eye opens in its place, follows the hero
  //    when the queens rise again, when they hunt, and at the season's ending.
  //  - The wedding opening: one banner the first time a save meets Season 1.
  //  - The brides' lucid lines: after each fall, the real queen breaks through for one line.
  //  - The ending beat: after the brides first fall on the throne, the eye opens and the Warden speaks.
  // Flags live in G.story.prog (s1open, s1end, lucid) so they save and a new game clears them.
  const STORY_SEASON = 1;
  const S1 = { open: 0, want: 0, wait: 0, blink: 0, glance: 0, gz: 0 };
  const s1Prog = () => G.story.prog;

  // The cracked moon: faces the moat from the moon's position, drawn over the sphere
  const moonFace = new THREE.Group(); moonFace.position.copy(moon.position); moonFace.lookAt(0, 6, 0); scene.add(moonFace);
  const darkHalf = new THREE.Mesh(new THREE.CircleGeometry(9.05, 40, -Math.PI / 2, Math.PI), bas(0x0c0a12, { transparent: true, opacity: 0.86, depthWrite: false }));
  darkHalf.position.z = 9.1; moonFace.add(darkHalf);
  const crackM = bas(0x08060c), cracks = [];
  [[0.3, 8.6, -0.5], [-0.6, 5.2, 0.4], [0.5, 1.6, -0.35], [-0.4, -2.0, 0.45], [0.4, -5.4, -0.4], [-0.2, -8.2, 0.3]].forEach(([x, y, r]) => {
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.9), crackM); seg.position.set(x, y, 9.6); seg.rotation.z = r; seg.renderOrder = 6; moonFace.add(seg); cracks.push(seg);
  });
  // The eye: an almond of burning orange with a round black pupil, centred on the moon across both halves, the
  // crack running out above and below it. When it opens the moon breaks into two halves behind it, a glowing fault
  // runs through the eye and across the sky, dashes stream out across
  // the sky from it, and a red shade falls over the night. Its lids are a vertical scale from shut to open.
  const EYE_ORANGE = 0xff4a12;
  const eyeM = (c, o) => bas(c, Object.assign({ fog: false }, o));
  const eye = new THREE.Group(); eye.position.set(0, 0, 9.3); moonFace.add(eye);
  const almond = new THREE.Shape(); almond.moveTo(-8.5, 0); almond.quadraticCurveTo(0, 6.4, 8.5, 0); almond.quadraticCurveTo(0, -6.4, -8.5, 0);
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(almond, 24), eyeM(EYE_ORANGE, { transparent: true })); eye.add(lid);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), eyeM(0x000000, { transparent: true })); pupil.position.z = 0.05; eye.add(pupil);
  // Dashes streaming outward from the eye across the sky, each one stretched along its ray
  const RAYS = 1600, RAY_IN = 7, RAY_OUT = 230;
  const rays = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 1), eyeM(EYE_ORANGE, { transparent: true, opacity: 0, depthWrite: false }), RAYS);
  rays.position.z = 8.8; rays.frustumCulled = false; rays.visible = false; moonFace.add(rays);
  const rayA = new Float32Array(RAYS), rayR = new Float32Array(RAYS), rayS = new Float32Array(RAYS);
  for (let i = 0; i < RAYS; i++) { rayA[i] = Math.random() * TAU; rayR[i] = Math.random(); rayS[i] = 0.6 + Math.random() * 0.8; }
  const rayO = new THREE.Object3D();
  // The broken moon behind the open eye: its two halves pulled apart, the pale one and the dark one
  const halfL = new THREE.Mesh(new THREE.CircleGeometry(9, 40, Math.PI / 2, Math.PI), eyeM(0xe6dcc0, { transparent: true }));
  const halfR = new THREE.Mesh(new THREE.CircleGeometry(9, 40, -Math.PI / 2, Math.PI), eyeM(0x6a6258, { transparent: true }));
  [halfL, halfR].forEach(h => { h.position.z = 8.9; h.visible = false; h.renderOrder = 5; moonFace.add(h); });
  // The fault: a jagged line that runs through the eye and on across the sky, glowing at its edges with a black core
  const fault = new THREE.Group(); fault.position.z = 9.7; fault.visible = false; moonFace.add(fault);
  const faultGlow = eyeM(0xffc27a, { transparent: true, depthWrite: false }), faultCore = eyeM(0x000000, { transparent: true, depthWrite: false });
  const faultPts = [];
  for (let y = 54; y >= -54; y -= 3) faultPts.push([Math.abs(y) < 2 ? 0 : (Math.random() - 0.5) * 1.6, y]);
  for (let i = 1; i < faultPts.length; i++) {
    const [ax, ay] = faultPts[i - 1], [bx, by] = faultPts[i], len = Math.hypot(bx - ax, by - ay) + 0.3, ang = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
    [[faultGlow, 1.5, 10], [faultCore, 0.5, 11]].forEach(([m, w, ro]) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, len), m); s.position.set((ax + bx) / 2, (ay + by) / 2, ro === 11 ? 0.02 : 0); s.rotation.z = ang; s.renderOrder = ro; fault.add(s);
    });
  }
  // At this distance the depth buffer can't separate the layers, so draw order decides (all in the transparent pass)
  rays.renderOrder = 7; lid.renderOrder = 8; pupil.renderOrder = 9;
  const haloBase = halo.scale.x, haloCol = halo.material.color.clone();
  const SKY_HOR = new THREE.Vector3(0.14, 0.05, 0.05), SKY_ZEN = new THREE.Vector3(0.012, 0.004, 0.008), eyeCol = new THREE.Color(EYE_ORANGE);
  let lightBase = null;
  eye.scale.y = 0.03; eye.visible = false;

  function moonEyeOpen(secs) { if (STORY_SEASON < 1) return; S1.want = Math.max(S1.want, secs); }
  // A glance turns the camera up to the moon for a few seconds; only outside fights, and never with reduced motion
  function moonGlance(secs) { if (STORY_SEASON >= 1 && !reduce && (G.state === 'explore' || G.state === 'interlude')) S1.glance = Math.max(S1.glance, secs); }
  const seasonGaze = () => S1.gz;

  function updateSeason(real) {
    // The eye: ease the lids toward open while wanted, follow the hero, blink now and then
    if (!G.paused) S1.want = Math.max(0, S1.want - real);
    S1.blink = Math.max(0, S1.blink - real); if (S1.want > 0 && S1.blink === 0 && Math.random() < real * 0.15) S1.blink = 0.18;
    const target = S1.want > 0 && S1.blink === 0 ? 1 : 0;
    S1.open += (target - S1.open) * Math.min(1, real * (target ? 2.2 : 6));
    if (!G.paused) S1.glance = Math.max(0, S1.glance - real);
    if (G.state !== 'explore' && G.state !== 'interlude') S1.glance = 0;
    S1.gz += ((S1.glance > 0 && G.world === 'moat' ? 0.85 : 0) - S1.gz) * Math.min(1, real * 1.6);
    if (S1.gz < 0.002) S1.gz = 0;
    const o = G.world === 'moat' ? S1.open : 0;
    eye.visible = o > 0.02; eye.scale.y = Math.max(0.03, o);
    const swell = 1 + 0.7 * o; moon.scale.setScalar(swell); moonFace.scale.setScalar(swell); halo.scale.set(haloBase * swell, haloBase * swell, 1);
    const p = player.position;
    pupil.position.x = clamp(p.x / 70, -1, 1) * 2.4; pupil.position.y = clamp(-p.z / 140, -1, 1) * 0.8;
    // The moon gives way to the eye
    const moonGone = o > 0.35; moon.visible = !moonGone; darkHalf.visible = !moonGone && G.world === 'moat'; cracks.forEach(s => { s.visible = !moonGone; });
    // ...but stays behind it broken in two, the halves drifting apart, with the fault running through the eye
    halfL.visible = halfR.visible = moonGone; halfL.position.x = -4.2 * o; halfR.position.x = 4.2 * o; halfL.rotation.z = 0.12 * o; halfR.rotation.z = -0.12 * o;
    fault.visible = o > 0.02; fault.scale.y = o; faultGlow.opacity = (0.65 + 0.35 * Math.sin(uTime.value * 7)) * o;
    // The dashes stream outward, longer and faster the further they get
    rays.visible = o > 0.02; rays.material.opacity = o * 0.75;
    if (rays.visible) {
      for (let i = 0; i < RAYS; i++) {
        rayR[i] = (rayR[i] + real * 0.09 * rayS[i]) % 1;
        const f = rayR[i], r = RAY_IN + (RAY_OUT - RAY_IN) * f * f, a = rayA[i];
        rayO.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.85, 0); rayO.rotation.z = a - Math.PI / 2;
        rayO.scale.set(1 + f * 2, 0.8 + f * 7 * rayS[i], 1); rayO.updateMatrix(); rays.setMatrixAt(i, rayO.matrix);
      }
      rays.instanceMatrix.needsUpdate = true;
    }
    // A red shade falls over the night; the environment eases it back when the eye shuts
    if (lightBase === null) lightBase = moonLight.color.clone();
    moonLight.color.copy(lightBase).lerp(eyeCol, o * 0.3);
    halo.material.color.copy(haloCol).lerp(eyeCol, o * 0.5);
    postU.uEye.value = o;
    if (o > 0.02) { skyU.uHor.value.lerp(SKY_HOR, o * 0.08); skyU.uZen.value.lerp(SKY_ZEN, o * 0.08); }

    updatePreface(real);
    // The wedding preface plays once per save, after any banner already up has gone
    const pr = s1Prog();
    if (pr.s1open || PF.on || G.paused || G.state !== 'explore' || G.world !== 'moat') return;
    S1.wait += real;
    if (S1.wait < 1.5 || (!ui.banner.hidden && S1.wait < 9)) return;
    playPreface();
  }

  // ---------- The preface: the Moon Wedding, played in the game's own world (about 28 s, skippable) ----------
  // The camera flies in over the moat while Cinderwing's fireworks go up, settles on the brides at the altar for
  // their vows, tilts up to the moon, and then the blast: a flash, a shake, the moon breaks and the eye opens.
  // The brides turn toward the camera, and the game hands back to the Wanderer at the gate.
  const PF = { on: false, t: 0, fired: 0, keep: null, cp: new THREE.Vector3(), cl: new THREE.Vector3() };
  const pfEl = document.createElement('div'); pfEl.id = 'cutscene'; pfEl.hidden = true;
  pfEl.innerHTML = '<div class="bar top"></div><div class="bar bottom"><div class="who"></div><div class="line"></div></div><div class="skip">Enter or tap to skip</div><div class="flash"></div>';
  document.body.appendChild(pfEl);
  const pfWho = pfEl.querySelector('.who'), pfLine = pfEl.querySelector('.line'), pfFlash = pfEl.querySelector('.flash');
  pfEl.addEventListener('pointerdown', ev => { ev.preventDefault(); skipPreface(); });
  const pv = (x, y, z) => new THREE.Vector3(x, y, z);
  // Shots: camera from p0 to p1 and look from l0 to l1 between t0 and t1; a null look means the moon
  const SHOTS = [
    { t0: 0, t1: 7, p0: pv(-34, 28, 72), p1: pv(-9, 17, 20), l0: pv(0, 14, -27), l1: pv(0, 10.5, -27.5) },
    { t0: 7, t1: 14.5, p0: pv(6.5, 11.2, -19.5), p1: pv(4.2, 10.4, -22), l0: pv(0, 9.8, -27.5), l1: pv(0, 9.6, -27.5) },
    // From the right of the roof, so the keep does not hide the moon
    { t0: 14.5, t1: 16, p0: pv(4, 10.5, -17), p1: pv(7, 10.3, -15), l0: pv(0, 9.8, -27.5), l1: null },
    { t0: 16, t1: 22, p0: pv(7, 10.3, -15), p1: pv(8, 9.8, -11), l0: null, l1: null },
    { t0: 22, t1: 28, p0: pv(0, 10.6, -19.5), p1: pv(0, 10.2, -21.5), l0: pv(0, 9.6, -27.5), l1: pv(0, 9.4, -27.5) }
  ];
  const PF_END = 28, PF_BLAST = 16, FIREWORKS = [1, 2.6, 4.2, 5.6, 12.6];
  const PF_LINES = [
    [1, 6.5, '', 'Every hundred years, two queens of the moat are wed under a full moon.'],
    [8, 11, 'Nyxara', 'Under this moon, I keep you.'],
    [11.2, 14.2, 'Vesthra', 'Under this moon, I keep you.'],
    [17, 21.5, '', 'At the vows, the moon broke in two.'],
    [23, 27.5, '', 'And the brides turned on the one sworn to guard them.']
  ];
  const pfEase = s => s * s * (3 - 2 * s);
  const moonAim = () => moon.position.clone().setY(moon.position.y - 4);

  function playPreface() {
    PF.on = true; PF.t = 0; PF.fired = 0; G.cutscene = true;
    pfEl.hidden = false; document.body.classList.add('cutscene'); ui.banner.hidden = true;
    // The brides stand at the altar facing each other, wherever they were
    PF.keep = royals.map(r => ({ pos: r.g.position.clone(), facing: r.facing, field: r.field, state: r.state, vis: r.g.visible }));
    PF.warden = boss.visible; // the Warden perches on the gatehouse, between the camera and the altar
    royals.forEach((r, i) => {
      r.field = false; r.state = 'idle'; r.g.visible = true; r.body.rotation.x = 0; r.body.position.y = r.hover;
      r.g.position.set(i === 0 ? -1.3 : 1.3, ROOF.y, -27.5); r.facing = i === 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  }
  function endPreface() {
    if (!PF.on) return;
    PF.on = false; G.cutscene = false;
    pfEl.hidden = true; document.body.classList.remove('cutscene'); pfFlash.style.opacity = '0';
    royals.forEach((r, i) => { const k = PF.keep[i]; r.g.position.copy(k.pos); r.facing = k.facing; r.field = k.field; r.state = k.state; r.g.visible = k.vis; });
    boss.visible = PF.warden;
    s1Prog().s1open = 1;
    S1.want = Math.min(Math.max(S1.want, 4), 6);
    showBanner('Season 1 \u00b7 The Broken Wedding', 'Something looks out of the broken moon. Find out what broke it; the brides are already hunting you.', 'title'); bannerTimer = 7;
  }
  function skipPreface() { if (PF.on) endPreface(); }
  // Called by the camera in core/53-loop: during the preface the shot replaces the follow camera
  function seasonCutCam(cp, cl) { if (!PF.on) return; cp.copy(PF.cp); cl.copy(PF.cl); }

  function updatePreface(real) {
    if (!PF.on) return;
    keys.clear(); P.iframe = Math.max(P.iframe, 0.5); boss.visible = false;
    if (G.paused) return;
    const t = PF.t += real;
    const s = SHOTS.find(x => t < x.t1) || SHOTS[SHOTS.length - 1], k = pfEase(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1));
    PF.cp.copy(s.p0).lerp(s.p1, k);
    PF.cl.copy(s.l0 || moonAim()).lerp(s.l1 || moonAim(), k);
    while (PF.fired < FIREWORKS.length && t >= FIREWORKS[PF.fired]) {
      launchFirework(pv((PF.fired % 2 ? 1 : -1) * (6 + Math.random() * 6), ROOF.y + 1, -24 - Math.random() * 6)); PF.fired++;
    }
    // The blast
    if (t >= PF_BLAST && !PF.blasted) { PF.blasted = true; sfx('boom'); sfx('roar'); G.shake = 1; moonEyeOpen(14); S1.open = Math.max(S1.open, 0.45); }
    if (t < PF_BLAST) PF.blasted = false;
    pfFlash.style.opacity = t >= PF_BLAST ? String(Math.max(0, 1 - (t - PF_BLAST) / 1.4)) : '0';
    // The brides turn toward the camera
    if (t >= 23) royals.forEach(r => { r.facing += angDiff(r.facing, yawTo(r.pos, PF.cp)) * Math.min(1, real * 3); });
    const line = PF_LINES.find(l => t >= l[0] && t < l[1]);
    pfWho.textContent = line ? line[2] : ''; pfLine.textContent = line ? line[3] : '';
    if (t >= PF_END) endPreface();
  }

  // After a queen falls, the real queen breaks through for a moment
  const LUCID = {
    empress: ['Wanderer... run.', 'It looks out through my eyes. Do not look up.', 'I remember the vows. I do not remember the end.', 'Your name. I almost had it.'],
    gorgon: ['My guests. Are they still safe?', 'Stone does not fade. Remember that.', 'Something is wearing my face.', 'Tell the dragon the party is over.']
  };
  function brideLucid(r) {
    if (STORY_SEASON < 1) return;
    const pr = s1Prog(), k = r.kind === 'gorgon' ? 'gorgon' : 'empress';
    pr.lucid = pr.lucid || {}; const n = pr.lucid[k] || 0; pr.lucid[k] = n + 1;
    const line = LUCID[k][n % LUCID[k].length], who = k === 'gorgon' ? 'Vesthra, for a moment' : 'Nyxara, for a moment';
    setTimeout(() => showTip(who, `“${line}”`, 6), 1800);
  }

  // The season's ending: the first time the brides fall on the throne
  function seasonOneEnd() {
    const pr = s1Prog();
    if (STORY_SEASON < 1 || pr.s1end) return;
    pr.s1end = 1;
    setTimeout(() => {
      moonEyeOpen(12); moonGlance(5);
      showBanner('The moon looks down', 'The dark half of the moon opens, and something inside it looks at you. From the gate, the Warden calls up: “You should not have come back.”', 'title');
      bannerTimer = 8; sfx('horn');
    }, 10500);
  }
