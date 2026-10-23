  // ---------- World system: per-frame update ----------
  // Runs every unpaused frame: objectives, story hand-offs, rift storms and world animation
  function updateWorlds(dt, real) {
    const ST = G.story, tt = uTime.value;
    gates.forEach((g, i) => { g.ring.rotation.z += real * 1.4; g.disc.material.opacity = 0.2 + 0.12 * Math.sin(tt * 3 + i); });
    const W = WORLDS[G.world];
    if (W) {
      W.anim(real, tt);
      if (ST.unlocked[W.id] && ST.step[W.id] === 0 && G.state !== 'dead') {
        const pr = ST.prog[W.id];
        W.objs.forEach((o, i) => {
          if (pr[i] >= 1) return;
          const d = flatDist(player.position, o.p);
          if (W.id === 'veyra') { if (d < 1.6 && P.y < 1.5) { pr[i] = 1; objectiveDone(W, i); } }
          else if (W.id === 'neon') {
            if (d < 2.5) { pr[i] = Math.min(1, pr[i] + dt / 3); if (Math.random() < 0.3) burst(o.p.x, 1.6, o.p.z, 1, 2); if (pr[i] >= 1) objectiveDone(W, i); }
            else pr[i] = Math.max(0, pr[i] - dt / 6);
          }
        });
      }
      if (WORLD_ENV[W.id].ash && Math.random() < 0.8) { fwColor.setHSL(0.08, 0.12, 0.35 + Math.random() * 0.2); fwParticle(player.position.x + (Math.random() - 0.5) * 44, player.position.y + 8 + Math.random() * 8, player.position.z + (Math.random() - 0.5) * 44, (Math.random() - 0.5) * 0.8, -1 - Math.random(), (Math.random() - 0.5) * 0.8, fwColor, 5, false); }
    }
    // Story hand-off after a shard
    const p = ST.pending;
    if (p && G.state !== 'dead') {
      p.t -= real;
      if (!p.shown && p.t <= 3.5) { p.shown = true; storyBanner(p); }
      if (p.t <= 0) {
        if (!p.to) ST.pending = null;
        else if (!travelBlock(true)) { ST.pending = null; G.storm = null; enterWorld(p.to, spawnOf(p.to), 'story'); }
      }
    }
    // Rift storms: roll every five minutes of game time, only while exploring
    if (G.storm) {
      if (G.state !== 'dead') { G.storm.t -= real; if (G.storm.t <= 0) endStorm(); }
    } else {
      G.stormClock += dt;
      if (G.stormClock >= 300 && canStorm()) { G.stormClock = 0; if (Math.random() < 0.35) startStorm(); }
    }
    updateStages(real); updateEvents(dt, real); royalTick(dt, real);
  }
