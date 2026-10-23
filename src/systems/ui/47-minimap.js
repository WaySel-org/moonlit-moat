  // ---------- Map (M toggles size) ----------
  const mctx = ui.minimap.getContext('2d');
  let mapT = 0;
  function drawMinimap(real) {
    mapT -= real; if (mapT > 0) return; mapT = 0.12;
    const cv2 = ui.minimap, big = cv2.classList.contains('big'), size = big ? 420 : 170;
    if (cv2.width !== size) { cv2.width = size; cv2.height = size; }
    const W = WORLDS[G.world];
    const R = W ? 74 : G.realm === 'spirit' ? 120 : 84, sc = size / (R * 2);
    const X = x => (x + R) * sc, Z = z => (z + R) * sc;
    const c = mctx; c.clearRect(0, 0, size, size);
    const dot = (x, z, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(X(x), Z(z), r, 0, TAU); c.fill(); };
    if (W) {
      // Another world: bounds, solids, objectives (filled = pending, ring = done), gate and the boss arena
      c.fillStyle = W.mapBg; c.fillRect(X(-70), Z(-70), 140 * sc, 140 * sc);
      c.fillStyle = W.mapSolid;
      W.rects.forEach(r => c.fillRect(X(r[0]), Z(r[2]), (r[1] - r[0]) * sc, (r[3] - r[2]) * sc));
      W.circles.forEach(ci => { c.beginPath(); c.arc(X(ci[0]), Z(ci[1]), Math.max(0.8, ci[2] * sc), 0, TAU); c.fill(); });
      const pr = G.story.prog[W.id], open = G.story.unlocked[W.id];
      W.objs.forEach((o, i) => {
        if (pr[i] >= 1) { c.strokeStyle = 'rgba(190,200,190,0.75)'; c.lineWidth = 1; c.beginPath(); c.arc(X(o.p.x), Z(o.p.z), big ? 4 : 2.5, 0, TAU); c.stroke(); }
        else dot(o.p.x, o.p.z, big ? 5 : 3.2, open ? W.objCol : 'rgba(150,150,150,0.75)');
      });
      NEUTRAL_CAMPS.forEach(cp => cp.world === W.id && dot(cp.x, cp.z, big ? 4.5 : 3, cp.alive ? '#7fdc8a' : 'rgba(127,220,138,0.35)'));
      dot(W.gate.x, W.gate.z, big ? 5 : 3, '#ffe6a8');
      if (G.story.step[W.id] === 1) { c.strokeStyle = '#e0a0ff'; c.lineWidth = 1.5; c.beginPath(); c.arc(X(W.boss.x), Z(W.boss.z), big ? 9 : 5, 0, TAU); c.stroke(); }
    } else {
      c.fillStyle = G.realm === 'spirit' ? 'rgba(40,30,70,0.55)' : 'rgba(20,30,26,0.55)';
      const L = G.realm === 'spirit' ? 116 : 80; c.fillRect(X(-L), Z(-L), (L * 2) * sc, (L * 2 - 8) * sc);
      // lake, castle, maze, keeps
      c.fillStyle = 'rgba(80,120,150,0.6)'; c.beginPath(); c.arc(X(LAKE.x), Z(LAKE.z), LAKE.r * sc, 0, TAU); c.fill();
      c.fillStyle = 'rgba(200,200,190,0.55)'; c.fillRect(X(-15.5), Z(-36), 31 * sc, 16 * sc);
      c.strokeStyle = 'rgba(120,170,110,0.7)'; c.lineWidth = 1; c.strokeRect(X(MAZE.x0), Z(MAZE.z0), MAZE.n * MAZE.cell * sc, MAZE.n * MAZE.cell * sc);
      KEEPS.forEach(k => { c.strokeStyle = 'rgba(200,200,190,0.7)'; c.strokeRect(X(k.x - 10), Z(k.z - 10), 20 * sc, 20 * sc); });
      RIFTS.forEach(r => dot(r.x, r.z, big ? 4 : 2.5, '#c8a0ff'));
      if (G.realm === 'material') {
        dot(SHRINE.x, SHRINE.z, big ? 4 : 2.5, '#bfe8ff');
        NEUTRAL_CAMPS.forEach(cp => cp.world === 'moat' && dot(cp.x, cp.z, big ? 4.5 : 3, cp.alive ? '#7fdc8a' : 'rgba(127,220,138,0.35)'));
        dot(MOAT_GATE.x, MOAT_GATE.z, big ? 4 : 2.5, '#ffe6a8');
        SANCTUARIES.forEach(sn => dot(sn.x, sn.z, big ? 4 : 2.5, '#9fe8ff'));
        chests.forEach(ch => { if (!ch.open) dot(ch.x, ch.z, big ? 3 : 2, '#ffd36a'); });
        if (B.state !== 'dead' && boss.visible) dot(boss.position.x, boss.position.z, big ? 5 : 3.5, '#ff6a4a');
      }
    }
    const em = eventMark(); if (em && G.realm === 'material') { dot(em.x, em.z, big ? 6 : 4, em.col); c.strokeStyle = em.col; c.lineWidth = 1; c.beginPath(); c.arc(X(em.x), Z(em.z), (big ? 10 : 7) + Math.sin(uTime.value * 6) * 2, 0, TAU); c.stroke(); }
    royals.forEach(r => { if (r.field && r.alive && r.g.visible) dot(r.pos.x, r.pos.z, big ? 6.5 : 4.5, '#ff7ad8'); });
    const rk = realmKey();
    creeps.forEach(cr => { if (cr.alive && cr.realm === rk) dot(cr.pos.x, cr.pos.z, cr.ai === 'godling' ? (big ? 5 : 3.5) : cr.ancient ? (big ? 3.5 : 2.5) : (big ? 2 : 1.3), cr.ai === 'godling' ? '#e0a0ff' : cr.ancient ? '#ff9a4a' : '#ff5a4a'); });
    // you: an arrow pointing where you face
    const px = X(player.position.x), pz = Z(player.position.z), a = P.facing;
    c.save(); c.translate(px, pz); c.rotate(-a + Math.PI); c.fillStyle = '#fff6e0';
    c.beginPath(); c.moveTo(0, big ? -8 : -5); c.lineTo(big ? 5 : 3.5, big ? 6 : 4); c.lineTo(big ? -5 : -3.5, big ? 6 : 4); c.closePath(); c.fill(); c.restore();
    c.fillStyle = 'rgba(207,220,215,0.8)'; c.font = `${big ? 12 : 9}px "IBM Plex Mono", monospace`;
    c.fillText(W ? W.name.toUpperCase() : G.realm === 'spirit' ? 'SPIRIT REALM' : 'MAP (M)', 6, big ? 16 : 12);
  }
