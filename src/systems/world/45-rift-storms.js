  // ---------- Rift storms ----------
  // Now and then reality tears and drags the hero somewhere else for a while
  const canStorm = () => (G.state === 'explore' || G.state === 'interlude') && !G.hunt && !G.royalHunt && G.realm === 'material' && !G.story.pending && !storyBossEngaged() && P.act !== 'leap';
  function startStorm() {
    const options = CHAPTERS.filter(w => w !== G.world), to = options[Math.floor(Math.random() * options.length)];
    G.storm = { from: G.world, pos: { x: player.position.x, z: player.position.z }, t: 75, to };
    enterWorld(to, spawnOf(to), 'stormIn');
  }
  function endStorm() {
    const s = G.storm; G.storm = null;
    enterWorld(s.from, s.pos, 'stormEnd');
  }
