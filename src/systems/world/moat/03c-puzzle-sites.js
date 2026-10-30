  // ---------- Puzzle sites in the outer wildlands (shared by the map and puzzle agents) ----------
  // Each site is a flat, clear circle of radius r that the map keeps free of trees, rocks and camps.
  // The puzzle system builds one puzzle per site and sets solved; the minimap draws them.
  const PUZZLE_SITES = [20, 92, 164, 236, 308].map((deg, i) => {
    const a = deg * Math.PI / 180, d = i === 3 ? 124 : 108; // site 3 sits further out to clear the hedge maze
    return { id: i, x: Math.round(Math.sin(a) * d), z: Math.round(Math.cos(a) * d), r: 14, kind: null, solved: false };
  });
  const nearPuzzleSite = (x, z, pad) => PUZZLE_SITES.some(s => Math.hypot(x - s.x, z - s.z) < s.r + (pad || 0));
