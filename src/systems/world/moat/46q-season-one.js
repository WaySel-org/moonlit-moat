  // ---------- Season 1, The Broken Wedding (owned by the Loremaster with the Shardkeeper of the Moat) ----------
  // The story ships in seasons (lore/seasons.md). STORY_SEASON is the released season; later seasons' beats check it.
  // Season 1: the moon cracked at the queens' wedding and something in its dark half watches the Wanderer.
  //  - The cracked moon: a dark half and a jagged crack over the moon, with an eye that opens and follows the hero
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
  const crackM = bas(0x08060c);
  [[0.3, 8.6, -0.5], [-0.6, 5.2, 0.4], [0.5, 1.6, -0.35], [-0.4, -2.0, 0.45], [0.4, -5.4, -0.4], [-0.2, -8.2, 0.3]].forEach(([x, y, r]) => {
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3.9), crackM); seg.position.set(x, y, 9.2); seg.rotation.z = r; moonFace.add(seg);
  });
  // The eye sits in the dark half; its lids are a vertical scale from shut (a sliver) to open
  // The moon swells while the eye is open (moon, halo and face scale together)
  const eye = new THREE.Group(); eye.position.set(4.3, 0.2, 9.3); moonFace.add(eye);
  const eyeM = (c, o) => bas(c, Object.assign({ fog: false }, o));
  const rim = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40), eyeM(0x7a0c10)); rim.scale.y = 0.62; eye.add(rim);
  const sclera = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), eyeM(0xf2e4cc)); sclera.scale.y = 0.6; sclera.position.z = 0.03; eye.add(sclera);
  const iris = new THREE.Group(); iris.position.z = 0.06; eye.add(iris);
  iris.add(new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), eyeM(0xff2a1e)));
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), eyeM(0x040304)); pupil.position.z = 0.05; iris.add(pupil);
  const haloBase = halo.scale.x;
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
    eye.visible = S1.open > 0.02; eye.scale.y = Math.max(0.03, S1.open);
    const swell = 1 + 0.7 * S1.open; moon.scale.setScalar(swell); moonFace.scale.setScalar(swell); halo.scale.set(haloBase * swell, haloBase * swell, 1);
    const p = player.position;
    iris.position.x = clamp(p.x / 70, -1, 1) * 1.6; iris.position.y = clamp(-p.z / 140, -1, 1) * 0.5;
    darkHalf.visible = G.world === 'moat';

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
