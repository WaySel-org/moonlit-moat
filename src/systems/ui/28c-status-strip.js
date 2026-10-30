  // ---------- Status strip: icons and countdowns for timed effects (owned by the HUD agent) ----------
  // One row of chips under the objective, each shown only while its timer runs: the ride clock, beasts away in the
  // spirit realm, soul hunger, hero statuses and Blade Spin. It replaces #soulmeter and #ridemeter. Rebuilt at ~8 Hz
  // and written to the DOM only when the markup changes. Glyphs carry U+FE0E so they stay text, not emoji.
  const strip = { el: document.getElementById('statusstrip'), t: 0, html: '' };
  const stripTime = s => s >= 60 ? fmtTime(s) : Math.ceil(s) + 's';
  const stripChip = (cls, icon, text, title) => `<span class="sc ${cls}" title="${title}"><b>${icon}︎</b>${text}</span>`;
  function statusChips() {
    const out = [], now = uTime.value;
    const b = P.mount;
    if (b && b.rideLeft != null) out.push(stripChip(b.rideLeft < 30 ? 'ride low' : 'ride', '♞', stripTime(Math.max(0, b.rideLeft)), `${BEAST_TYPES[b.type].name}: riding time left`));
    beasts.forEach(x => { if ((x.state === 'away' || x.state === 'leaving') && x.returnAt) out.push(stripChip('away', '↺', `${BEAST_TYPES[x.type].name} ${stripTime(Math.max(0, x.returnAt - now))}`, `The ${BEAST_TYPES[x.type].name} returns to its sanctuary`)); });
    if (G.realm === 'spirit') out.push(P.sated > 0 ? stripChip('soul', '◈', `Sated ${stripTime(P.sated)}`, 'Souls sated: no hunger yet')
      : stripChip('soul hungry', '◈', `Hunger −${Math.round(hungerRate() * 100)}%/s`, 'Soul hunger drains your life: devour souls'));
    if (P.spinOn && P.act === 'spin') out.push(stripChip('spin', '✸', stripTime(Math.max(0, P.actDur - P.actT)), 'Blade Spin: resists chill and stone'));
    if (P.stone > 0) out.push(stripChip('stone', '▣', stripTime(P.stone), 'Held fast: no actions'));
    if (P.chill > 0) out.push(stripChip('chill', '❄', stripTime(P.chill), `Chilled: ${Math.round(P.chillK * 100)}% slower`));
    if (P.burn > 0) out.push(stripChip('burn', '♨', stripTime(P.burn), 'Burning: fire damage through armour'));
    if (P.poison > 0) out.push(stripChip('poison', '☠', stripTime(P.poison), 'Poisoned'));
    return out.join('');
  }
  function updateStatusStrip(real) {
    updateTips(real);
    if (!strip.el || (strip.t -= real) > 0) return;
    strip.t = 0.125;
    const html = G.state === 'dead' ? '' : statusChips();
    if (html === strip.html) return;
    strip.html = html; strip.el.innerHTML = html; strip.el.hidden = !html;
  }
