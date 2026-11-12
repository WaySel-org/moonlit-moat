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
  // crack running out above and below it. When it opens it takes the moon's place, dashes stream out across
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
    halo.material.color.copy(haloCol).lerp(eyeCol, o);
    postU.uEye.value = o;
    if (o > 0.02) { skyU.uHor.value.lerp(SKY_HOR, o * 0.08); skyU.uZen.value.lerp(SKY_ZEN, o * 0.08); }

    // The wedding opening, once per save, after any banner already up has gone
    const pr = s1Prog();
    if (pr.s1open || G.paused || G.state !== 'explore' || G.world !== 'moat') return;
    S1.wait += real;
    if (S1.wait < 2 || (!ui.banner.hidden && S1.wait < 9)) return;
    pr.s1open = 1;
    showBanner('Season 1 · The Broken Wedding', 'Every hundred years two queens of the moat are wed under a full moon. Tonight it was Nyxara and Vesthra. At the vows the moon cracked in two, and the brides turned on the one sworn to guard them: you.', 'title');
    bannerTimer = 10; moonEyeOpen(9); moonGlance(5);
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
