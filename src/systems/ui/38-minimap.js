  // ---------- Map (M toggles size) ----------
  const mctx = ui.minimap.getContext('2d');
  let mapT = 0;
  function drawMinimap(real) {
    mapT -= real; if (mapT > 0) return; mapT = 0.12;
    const cv2 = ui.minimap, big = cv2.classList.contains('big'), size = big ? 420 : 170;
    if (cv2.width !== size) { cv2.width = size; cv2.height = size; }
    const R = G.realm === 'spirit' ? 120 : 84, sc = size / (R * 2);
    const X = x => (x + R) * sc, Z = z => (z + R) * sc;
    const c = mctx; c.clearRect(0, 0, size, size);
    c.fillStyle = G.realm === 'spirit' ? 'rgba(40,30,70,0.55)' : 'rgba(20,30,26,0.55)';
    const L = G.realm === 'spirit' ? 116 : 80; c.fillRect(X(-L), Z(-L), (L * 2) * sc, (L * 2 - 8) * sc);
    // lake, castle, maze, keeps
    c.fillStyle = 'rgba(80,120,150,0.6)'; c.beginPath(); c.arc(X(LAKE.x), Z(LAKE.z), LAKE.r * sc, 0, TAU); c.fill();
    c.fillStyle = 'rgba(200,200,190,0.55)'; c.fillRect(X(-15.5), Z(-36), 31 * sc, 16 * sc);
    c.strokeStyle = 'rgba(120,170,110,0.7)'; c.lineWidth = 1; c.strokeRect(X(MAZE.x0), Z(MAZE.z0), MAZE.n * MAZE.cell * sc, MAZE.n * MAZE.cell * sc);
    KEEPS.forEach(k => { c.strokeStyle = 'rgba(200,200,190,0.7)'; c.strokeRect(X(k.x - 10), Z(k.z - 10), 20 * sc, 20 * sc); });
    const dot = (x, z, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(X(x), Z(z), r, 0, TAU); c.fill(); };
    RIFTS.forEach(r => dot(r.x, r.z, big ? 4 : 2.5, '#c8a0ff'));
    if (G.realm === 'material') {
      dot(SHRINE.x, SHRINE.z, big ? 4 : 2.5, '#bfe8ff');
      SANCTUARIES.forEach(sn => dot(sn.x, sn.z, big ? 4 : 2.5, '#9fe8ff'));
      chests.forEach(ch => { if (!ch.open) dot(ch.x, ch.z, big ? 3 : 2, '#ffd36a'); });
      if (B.state !== 'dead' && boss.visible) dot(boss.position.x, boss.position.z, big ? 5 : 3.5, '#ff6a4a');
    }
    creeps.forEach(cr => { if (cr.alive && cr.realm === G.realm) dot(cr.pos.x, cr.pos.z, cr.ai === 'godling' ? (big ? 5 : 3.5) : cr.ancient ? (big ? 3.5 : 2.5) : (big ? 2 : 1.3), cr.ai === 'godling' ? '#e0a0ff' : cr.ancient ? '#ff9a4a' : '#ff5a4a'); });
    // you: an arrow pointing where you face
    const px = X(player.position.x), pz = Z(player.position.z), a = P.facing;
    c.save(); c.translate(px, pz); c.rotate(-a + Math.PI); c.fillStyle = '#fff6e0';
    c.beginPath(); c.moveTo(0, big ? -8 : -5); c.lineTo(big ? 5 : 3.5, big ? 6 : 4); c.lineTo(big ? -5 : -3.5, big ? 6 : 4); c.closePath(); c.fill(); c.restore();
    c.fillStyle = 'rgba(207,220,215,0.8)'; c.font = `${big ? 12 : 9}px "IBM Plex Mono", monospace`;
    c.fillText(G.realm === 'spirit' ? 'SPIRIT REALM' : 'MAP (M)', 6, big ? 16 : 12);
  }
