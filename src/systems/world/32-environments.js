  // ---------- Changing environments: one per world tier ----------
  const ENVS = [
    { name: 'Moonlit Night', note: 'A calm night.', hor: [0.09, 0.15, 0.19], zen: [0.008, 0.014, 0.03], moon: 0xefe8cc, aur: 0, fog: 0, fogCol: 0x0a1418, xp: 1, creepDmg: 1, mana: 1, embers: 0, dmg: 1 },
    { name: 'Blood Moon', note: 'Creeps hit 25% harder. +30% experience.', hor: [0.24, 0.05, 0.05], zen: [0.035, 0.006, 0.01], moon: 0xff5a4a, aur: 0, fog: 0, fogCol: 0x1a0606, xp: 1.3, creepDmg: 1.25, mana: 1, embers: 0, dmg: 1 },
    { name: 'Creeping Mist', note: 'Thick fog rolls in. +15% experience.', hor: [0.17, 0.2, 0.21], zen: [0.05, 0.06, 0.07], moon: 0xdfe6ea, aur: 0, fog: 0.04, fogCol: 0x26323a, xp: 1.15, creepDmg: 1, mana: 1, embers: 0, dmg: 1 },
    { name: 'Aurora', note: 'Lights in the sky. Mana flows twice as fast.', hor: [0.05, 0.14, 0.16], zen: [0.01, 0.02, 0.05], moon: 0xe0fff4, aur: 1, fog: 0, fogCol: 0x0a1418, xp: 1, creepDmg: 1, mana: 2, embers: 0, dmg: 1 },
    { name: 'Ember Storm', note: 'Embers fall. Your attacks deal 10% more, creeps 10% more.', hor: [0.26, 0.1, 0.03], zen: [0.045, 0.012, 0.005], moon: 0xffb070, aur: 0, fog: 0.012, fogCol: 0x2a1408, xp: 1.1, creepDmg: 1.1, mana: 1, embers: 1, dmg: 1.1 }
  ];
  G.env = ENVS[0]; G.lastTier = 1;
  scene.fog = new THREE.FogExp2(0x0a1418, 0);
  const skyU = sky.material.uniforms, envFogCol = new THREE.Color(), moonCol = new THREE.Color(0xefe8cc);
  function worldTick(real) {
    const tier = worldTier();
    if (tier !== G.lastTier) {
      G.lastTier = tier; G.env = ENVS[(tier - 1) % ENVS.length];
      genMaze();
      if (P.y < 1 && groundAt(player.position.x, player.position.z) >= 99) {
        const c = MAZE.cell; player.position.x = MAZE.x0 + (Math.floor((player.position.x - MAZE.x0) / c) + 0.5) * c; player.position.z = MAZE.z0 + (Math.floor((player.position.z - MAZE.z0) / c) + 0.5) * c;
      }
      if (ui.banner.hidden || ui.banner.className === 'title') { showBanner(G.env.name, `World tier ${tier}. ${G.env.note} The hedge maze has shifted.`, 'title'); bannerTimer = 4; }
    }
    // Ease the sky, fog and moon toward the current environment
    const k = Math.min(1, real * 0.6), e = G.realm === 'spirit' ? SPIRIT_ENV : G.env;
    if (G.realm === 'spirit' && G.state !== 'dead') { const floor = P.max * 0.15; if (P.hp > floor) P.hp = Math.max(floor, P.hp - real * 1.0); }
    postU.uSpirit.value += ((G.realm === 'spirit' ? 1 : 0) - postU.uSpirit.value) * Math.min(1, real * 1.5);
    spiritProps.visible = postU.uSpirit.value > 0.05;
    updateRifts(real); updateSouls(real);
    skyU.uHor.value.x += (e.hor[0] - skyU.uHor.value.x) * k; skyU.uHor.value.y += (e.hor[1] - skyU.uHor.value.y) * k; skyU.uHor.value.z += (e.hor[2] - skyU.uHor.value.z) * k;
    skyU.uZen.value.x += (e.zen[0] - skyU.uZen.value.x) * k; skyU.uZen.value.y += (e.zen[1] - skyU.uZen.value.y) * k; skyU.uZen.value.z += (e.zen[2] - skyU.uZen.value.z) * k;
    skyU.uAur.value += (e.aur - skyU.uAur.value) * k;
    scene.fog.density += (e.fog - scene.fog.density) * k;
    scene.fog.color.lerp(envFogCol.setHex(e.fogCol), k);
    grassU.uFogD.value = scene.fog.density; grassU.uFogCol.value.copy(scene.fog.color);
    moon.material.color.lerp(moonCol.setHex(e.moon), k);
    if (e.embers) {
      for (let i = 0; i < 3; i++) {
        fwColor.setHSL(0.05 + Math.random() * 0.05, 1, 0.55);
        fwParticle(player.position.x + (Math.random() - 0.5) * 40, player.position.y + 10 + Math.random() * 8, player.position.z + (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 1.5, -2.5 - Math.random() * 2, (Math.random() - 0.5) * 1.5, fwColor, 4, Math.random() < 0.3);
      }
    }
  }
