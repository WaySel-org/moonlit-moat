  // ---------- Puzzle sites in the outer wildlands (shared by the map and puzzle agents) ----------
  // Each site is a flat, clear circle of radius r that the map keeps free of trees, rocks and camps.
  // The puzzle system builds one puzzle per site and sets solved; the minimap draws them.
  const PUZZLE_SITES = [20, 92, 164, 236, 308].map((deg, i) => {
    const a = deg * Math.PI / 180, d = i === 3 ? 124 : 108; // site 3 sits further out to clear the hedge maze
    return { id: i, x: Math.round(Math.sin(a) * d), z: Math.round(Math.cos(a) * d), r: 14, kind: null, solved: false };
  });
  // The Binding's landmarks (46r-the-binding): a banner ring just outside each site's opening, toward the moat's centre,
  // and a rift to Ashfall further in. Reserved here so trees, rocks, camps and grass keep clear of them too.
  // Rift offsets from the flag, [inward, sideways]; site 3's goes sideways, off the hedge maze's outer wall
  const LANDMARK_SPOTS = PUZZLE_SITES.map((s, i) => {
    const d = Math.hypot(s.x, s.z) || 1, ux = -s.x / d, uz = -s.z / d, fx = s.x + ux * 18, fz = s.z + uz * 18, [a, b] = i === 3 ? [6, 8] : [11, 0];
    return { flag: { x: fx, z: fz, r: 6 }, rift: { x: fx + ux * a - uz * b, z: fz + uz * a + ux * b, r: 3.5 } };
  });
  const inPuzzleCircle = (x, z, pad) => PUZZLE_SITES.some(s => Math.hypot(x - s.x, z - s.z) < s.r + (pad || 0));
  const nearPuzzleSite = (x, z, pad) => inPuzzleCircle(x, z, pad) || LANDMARK_SPOTS.some(L => Math.hypot(x - L.flag.x, z - L.flag.z) < L.flag.r + (pad || 0) || Math.hypot(x - L.rift.x, z - L.rift.z) < L.rift.r + (pad || 0));
