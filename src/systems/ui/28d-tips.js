  // ---------- Tip cards: short, readable instructions that stay up a few seconds (owned by the HUD agent) ----------
  // showTip(title, lines, secs) shows a small card that never takes input. A tip with the same title as the one up
  // (or one waiting) replaces it; others queue, at most three, and a waiting tip cuts the current one to 3 s.
  // tipKey(code, touchWord) names a control: the player's bound key, or the on-screen button on touch.
  const tip = { el: document.getElementById('tipcard'), cur: null, left: 0, shown: 0, queue: [] };
  const tipKey = (code, touchWord) => isTouch() ? touchWord : keyLabel(code);
  function tipRender(t) {
    const el = tip.el; if (!el) return;
    el.textContent = '';
    const h = document.createElement('b'); h.textContent = t.title; el.appendChild(h);
    t.lines.forEach(s => { const p = document.createElement('span'); p.textContent = s; el.appendChild(p); });
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  }
  function showTip(title, lines, secs) {
    const t = { title, lines: (Array.isArray(lines) ? lines : [lines]).filter(Boolean).slice(0, 4), secs: secs || 6 };
    if (tip.cur && tip.cur.title === title) { tip.cur = t; tip.left = t.secs; tipRender(t); return; }
    const q = tip.queue.findIndex(x => x.title === title);
    if (q >= 0) { tip.queue[q] = t; return; }
    if (!tip.cur) { tip.cur = t; tip.left = t.secs; tip.shown = 0; tipRender(t); return; }
    tip.queue.push(t); if (tip.queue.length > 3) tip.queue.shift();
  }
  function updateTips(real) {
    if (!tip.cur) return;
    tip.shown += real; tip.left -= real;
    if (tip.queue.length) tip.left = Math.min(tip.left, 3 - tip.shown);
    if (tip.left > 0) return;
    const n = tip.queue.shift();
    tip.cur = n || null; tip.shown = 0;
    if (n) { tip.left = n.secs; tipRender(n); } else if (tip.el) tip.el.hidden = true;
  }
  // The controls while riding, from the beast's own skill names
  function mountTip(b) {
    const bt = BEAST_TYPES[b.type], pw = MOUNT_POWERS[b.type], sk = [['KeyY', 'mp3'], ['KeyU', 'mp1'], ['KeyI', 'mp4'], ['KeyO', 'mp2']];
    const touch = isTouch();
    showTip(`Riding the ${bt.name}`, [
      touch ? 'Attack and Heavy: claws and combos' : `${keyLabel('KeyJ')} / ${keyLabel('KeyK')}  claws and combos`,
      touch ? `Skills: ${sk.map(([, s]) => pw[s].short).join(', ')}` : sk.map(([k, s]) => `${keyLabel(k)} ${pw[s].short}`).join(' \u00b7 '),
      `${tipKey('Space', 'Jump')} pounce \u00b7 ${tipKey('KeyL', 'Roll')} dash`,
      `${tipKey('KeyE', 'Use')} dismount \u00b7 it stays ${fmtTime(b.rideLeft)}`], 7);
  }
