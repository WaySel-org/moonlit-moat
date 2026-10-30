  // ---------- Controls: key bindings, unlock-aware key help, pause-menu controls list (owned by the controls agent) ----------
  // Every action is named by its DEFAULT code ('KeyJ' is light attack). BIND maps that id to the physical key the player chose;
  // keyAct() turns a pressed key back into the id, so press(), the keys set, touch buttons and moveInput never see rebinding.
  const ACTIONS = [
    ['Move', [['KeyW', 'Forward'], ['KeyS', 'Back'], ['KeyA', 'Left'], ['KeyD', 'Right'], ['Space', 'Jump'], ['KeyL', 'Roll']]],
    ['Combat', [['KeyJ', 'Attack'], ['KeyK', 'Heavy attack'], ['ShiftLeft', 'Block / parry'], ['KeyH', 'Blade Spin'], ['KeyR', 'Lock camera'], ['KeyT', 'Next target']]],
    ['Skills', [['KeyY', 'Dagger'], ['KeyU', 'Moon bolt'], ['KeyI', 'Arc Volley'], ['KeyO', "Warden's Leap"], ['KeyF', 'Drink flask']]],
    ['World', [['KeyE', 'Use / ride'], ['KeyQ', 'Spirit realm'], ['KeyB', 'Bag'], ['KeyN', 'Upgrade sword'], ['KeyP', 'Hero sheet'], ['KeyM', 'Map']]]
  ];
  const ACT_IDS = ACTIONS.flatMap(g => g[1].map(a => a[0]));
  const FIXED = /^(Arrow|Escape$|Tab$|Meta|OS|ContextMenu$|F\d)/; // never bindable: arrows stay movement, Esc stays pause
  const BIND_KEY = 'mm-keys';
  let BIND = {}, REV = {}, capAct = null;
  function rebuildKeys() {
    // Aliases first so a real binding on X or right Shift overrides them
    REV = { KeyX: 'KeyL' };
    if (BIND.ShiftLeft === 'ShiftLeft') REV.ShiftRight = 'ShiftRight';
    ACT_IDS.forEach(a => { REV[BIND[a]] = a; });
  }
  function loadKeys() {
    BIND = {}; ACT_IDS.forEach(a => { BIND[a] = a; });
    try {
      const s = JSON.parse(localStorage.getItem(BIND_KEY) || 'null');
      if (s && typeof s === 'object') {
        const next = Object.assign({}, BIND);
        ACT_IDS.forEach(a => { if (typeof s[a] === 'string' && !FIXED.test(s[a])) next[a] = s[a]; });
        if (new Set(Object.values(next)).size === ACT_IDS.length) BIND = next; // ignore a corrupted save with duplicates
      }
    } catch (e) { /* storage blocked or bad JSON: defaults */ }
    rebuildKeys();
  }
  function saveKeys() { try { localStorage.setItem(BIND_KEY, JSON.stringify(BIND)); } catch (e) { /* private mode */ } }
  // Physical key -> action id (default code); arrows pass through as fixed movement; anything else is unbound
  function keyAct(code) { return REV[code] || (/^Arrow/.test(code) ? code : undefined); }
  // Bind an action to a physical key; a key already in use swaps over to the action's old key
  function setBind(act, code) {
    const other = ACT_IDS.find(a => a !== act && BIND[a] === code);
    if (other) BIND[other] = BIND[act];
    BIND[act] = code; rebuildKeys(); saveKeys(); keys.clear();
    return other;
  }
  function resetKeys() { ACT_IDS.forEach(a => { BIND[a] = a; }); rebuildKeys(); saveKeys(); keys.clear(); }

  const KEY_NAMES = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt',
    Enter: 'Enter', Backspace: 'Bksp', CapsLock: 'Caps', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'",
    Backquote: '`', Backslash: '\\', Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\' };
  function codeName(c) { return KEY_NAMES[c] || c.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num '); }
  // keyLabel(code) gives the key the player has bound to an action, by its default code ('KeyJ' for light attack).
  // Other systems use it for any text that names a key, so rebinding keeps every hint correct.
  // Codes that are not actions (aliases like 'KeyX', 'ShiftRight', or arrows) are labelled as themselves.
  function keyLabel(code) { return codeName(BIND[code] || code); }
  const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const kbd = code => `<kbd>${esc(keyLabel(code))}</kbd>`;
  loadKeys();

  // ---------- Key help: basics first, each key joins the line once it means something ----------
  const seen = {}; // sticky unlocks for signals that can come and go (enemies nearby, a rift in view)
  function moveKeys() {
    const k = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(keyLabel);
    return k.every(x => x.length === 1) ? `<kbd>${esc(k.join(''))}</kbd>` : k.map(x => `<kbd>${esc(x)}</kbd>`).join('');
  }
  function keyHelpHtml() {
    const inv = PR.inv, sw = inv && inv.sword;
    if (P.hp < P.max) seen.hurt = 1;
    if (inv && (inv.bag.some(Boolean) || inv.charms.some(Boolean))) seen.bag = 1;
    if (sw && (sw.rank > 0 || sw.kills >= edgeNeed(sw))) seen.edge = 1;
    if (G.realm === 'spirit' || (G.world === 'moat' && nearestRift().d < 16)) seen.veil = 1;
    const live = liveTargets().length;
    if (live) seen.foe = 1;
    if (live > 1) seen.foes = 1;
    const out = [moveKeys() + ' move', kbd('KeyJ') + '/click attack', kbd('KeyK') + ' heavy'];
    if (P.mount) out.push(['KeyY', 'KeyU', 'KeyI', 'KeyO'].map(kbd).join('') + ' beast skills');
    else {
      out.push(kbd('KeyY') + ' dagger', kbd('KeyU') + ' bolt'); // the skill bar never locks these two
      if (PR.level >= 3) out.push(kbd('KeyI') + ' volley');
      if (PR.warden) out.push(kbd('KeyO') + ' leap');
      if (PR.level >= SPIN_LV) out.push(kbd('KeyH') + ' spin');
    }
    out.push(kbd('Space') + ' jump', kbd('KeyL') + ' roll', kbd('ShiftLeft') + ' block');
    if (seen.hurt && PR.flaskMax > 0) out.push(kbd('KeyF') + ' flask');
    out.push(kbd('KeyE') + ' use');
    if (seen.bag) out.push(kbd('KeyB') + ' bag');
    if (seen.edge) out.push(kbd('KeyN') + ' upgrade sword');
    if (seen.foe) out.push(kbd('KeyR') + ' lock');
    if (seen.foes) out.push(kbd('KeyT') + ' target');
    if (PR.points > 0 || PR.level > 1) out.push(kbd('KeyP') + ' hero');
    if (seen.veil) out.push(kbd('KeyQ') + ' spirit realm');
    if (PR.level > 1 || G.world !== 'moat') out.push(kbd('KeyM') + ' map');
    out.push('<kbd>Esc</kbd> pause <span class="khint">· all controls</span>');
    return out.join(' &nbsp; ');
  }
  const keyhelpEl = document.getElementById('keyhelp');
  let keyhelpLast = '';
  function refreshKeyHelp() {
    if (!keyhelpEl || document.hidden) return;
    const h = keyHelpHtml();
    if (h !== keyhelpLast) { keyhelpLast = h; keyhelpEl.innerHTML = h; }
  }
  setInterval(refreshKeyHelp, 400);

  // ---------- Pause menu: every action with its key; click a key, then press the new one ----------
  const ctlBox = document.getElementById('controlsbox');
  let ctlNote = '';
  function renderControls() {
    if (!ctlBox) return;
    ctlBox.innerHTML = '<h3>Controls</h3><p class="cnote" aria-live="polite">' + esc(ctlNote || (capAct ? 'Press a key for this action. Esc cancels.' : 'Click a key to change it.')) + '</p>' +
      ACTIONS.map(([g, list]) => `<div class="cgrp"><h4>${g}</h4>` + list.map(([id, name]) =>
        `<div class="crow"><span>${esc(name)}</span><button type="button" data-act="${id}" class="ckey${capAct === id ? ' cap' : ''}"${capAct === id ? ' aria-pressed="true"' : ''} aria-label="${esc(name)}: ${esc(keyLabel(id))}. Change key">${capAct === id ? '…' : esc(keyLabel(id))}</button></div>`).join('') + '</div>').join('') +
      '<p class="cnote">Arrow keys always move. X also rolls. Esc pauses.</p><button type="button" id="ckreset">Reset to defaults</button>';
    if (capAct) { const b = ctlBox.querySelector('.cap'); if (b) b.focus(); }
  }
  // Refresh every place that names keys
  function keysChanged() {
    renderControls(); keyhelpLast = ''; refreshKeyHelp();
    document.querySelectorAll('#panel dt[data-k]').forEach(dt => { dt.textContent = keyLabel(dt.dataset.k); });
  }
  if (ctlBox) {
    ctlBox.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      ctlNote = '';
      if (b.id === 'ckreset') { capAct = null; resetKeys(); ctlNote = 'Keys reset to defaults.'; keysChanged(); return; }
      capAct = capAct === b.dataset.act ? null : b.dataset.act;
      renderControls();
    });
  }
  // Capture runs before the game's keydown (capture phase), so Esc cancels the rebind instead of unpausing
  let eatUp = null;
  window.addEventListener('keydown', ev => {
    if (!capAct) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.repeat) return;
    const act = capAct, name = ACTIONS.flatMap(g => g[1]).find(a => a[0] === act)[1];
    eatUp = ev.code; // stop the keyup from clicking the focused button
    if (ev.code === 'Escape') { capAct = null; ctlNote = ''; renderControls(); return; }
    if (FIXED.test(ev.code)) { ctlNote = `${codeName(ev.code)} can't be bound. Press another key, or Esc to cancel.`; renderControls(); return; }
    capAct = null;
    const other = setBind(act, ev.code), on = ACTIONS.flatMap(g => g[1]).find(a => a[0] === other);
    ctlNote = other ? `${name} is now ${keyLabel(act)}; ${on[1]} moved to ${keyLabel(other)}.` : `${name} is now ${keyLabel(act)}.`;
    keysChanged();
  }, true);
  window.addEventListener('keyup', ev => { if (eatUp === ev.code) { eatUp = null; ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  // Leaving the pause menu drops a half-finished rebind
  const pauseObs = ui.pauseEl && window.MutationObserver ? new MutationObserver(() => { if (ui.pauseEl.hidden && (capAct || ctlNote)) { capAct = null; ctlNote = ''; renderControls(); } }) : null;
  if (pauseObs) pauseObs.observe(ui.pauseEl, { attributes: true, attributeFilter: ['hidden'] });
  keysChanged();
