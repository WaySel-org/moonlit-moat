  // ---------- Content: data files in /content tune characters, mounts and environments ----------
  // The build bundles content/**/*.json into window.MM_CONTENT; values there override the defaults above.
  (function applyContent() {
    const C = window.MM_CONTENT; if (!C) return;
    const hex = v => typeof v === 'string' && v[0] === '#' ? parseInt(v.slice(1), 16) : v;
    (C.characters || []).forEach(ch => {
      if (!ch.gameId) return;
      const st = ch.stats || {};
      if (ch.kind === 'creep' || ch.kind === 'spirit') {
        if (ch.name && !ch.uniqueName) CREEP_NAME[ch.gameId] = ch.name;
        if (st.baseHealth) CREEP_BASE[ch.gameId] = st.baseHealth;
      }
      if (ch.kind === 'mount' && BEAST_TYPES[ch.gameId]) {
        const bt = BEAST_TYPES[ch.gameId];
        if (ch.name) bt.name = ch.name;
        if (st.levelRequired) bt.level = st.levelRequired;
        if (st.speed) bt.speed = st.speed;
        if (st.goreDamage) bt.dmg = st.goreDamage;
        if (st.rideHeight) bt.ride = st.rideHeight;
        const pw = ch.powers || {};
        ['mp1', 'mp2', 'mp3', 'mp4'].forEach(k => { if (pw[k]) Object.assign(MOUNT_POWERS[ch.gameId][k], pw[k]); });
      }
    });
    (C.environments || []).forEach(e => {
      const t = ENVS.find(x => x.name === e.name); if (!t) return;
      Object.keys(e).forEach(k => { t[k] = hex(e[k]); });
    });
  })();
