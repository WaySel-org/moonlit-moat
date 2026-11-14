  // ---------- Gamepad: any standard-layout controller (Xbox, PlayStation, Switch Pro, 8BitDo and most PC pads) ----------
  // Polled every animation frame. Buttons speak the same default key codes as the keyboard (press('KeyJ') is light
  // attack), so combat, cooldowns, mounts and tips need no changes. Hold LT / L2 for the skill layer.
  // body.pad is on while the controller is the last thing used; key help, prompts, tips and the pause menu then name
  // buttons instead of keys. A key or the mouse switches back.
  P.pad = { x: 0, y: 0 };
  // Standard mapping indexes: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 L3, 11 R3, 12-15 d-pad up/down/left/right
  const PAD_BASE = { 0: 'Space', 1: 'KeyL', 2: 'KeyJ', 3: 'KeyK', 5: 'KeyY', 7: 'KeyU', 8: 'KeyM', 10: 'KeyP', 11: 'KeyR', 12: 'KeyE', 13: 'KeyF', 14: 'KeyQ', 15: 'KeyT' };
  const PAD_LAYER = { 0: 'KeyO', 1: 'KeyG', 2: 'KeyH', 3: 'KeyI', 12: 'KeyB', 13: 'KeyN' }; // while LT is held
  const PAD_HOLD = { 4: 'ShiftLeft' }; // LB blocks for as long as it is held
  const PAD_NAMES = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'],
    ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →']
  };
  const pad = { kind: 'xbox', prev: [], held: {}, flick: 0, last: performance.now(), seen: false };
  const DEAD = 0.2;
  function padOn() { return document.body.classList.contains('pad'); }
  function setPad(on) {
    if (on === padOn()) return;
    document.body.classList.toggle('pad', on);
    if (on) setTouch(false);
    keysChanged();
  }
  window.addEventListener('keydown', ev => { if (!ev.repeat && ev.code !== 'Escape') setPad(false); }, true);
  window.addEventListener('pointerdown', () => setPad(false), true);

  // Button label for an action id ('KeyJ'), with LT+ for the skill layer
  function padBtn(i) { return PAD_NAMES[pad.kind][i]; }
  const PAD_STICK = { KeyW: 'L-stick ↑', KeyS: 'L-stick ↓', KeyA: 'L-stick ←', KeyD: 'L-stick →' };
  function padName(code) {
    if (PAD_STICK[code]) return PAD_STICK[code];
    for (const i in PAD_BASE) if (PAD_BASE[i] === code) return padBtn(+i);
    for (const i in PAD_LAYER) if (PAD_LAYER[i] === code) return padBtn(6) + '+' + padBtn(+i);
    for (const i in PAD_HOLD) if (PAD_HOLD[i] === code) return padBtn(+i);
    return code === 'Escape' ? padBtn(9) : keyLabel(code);
  }
  const pk = code => `<kbd>${esc(padName(code))}</kbd>`;
  function padHelpHtml() {
    const out = ['<kbd>L-stick</kbd> move', '<kbd>R-stick</kbd> camera', pk('KeyJ') + ' attack', pk('KeyK') + ' heavy',
      pk('Space') + ' jump', pk('KeyL') + ' roll', pk('ShiftLeft') + ' block', pk('KeyY') + ' dagger', pk('KeyU') + ' bolt',
      `<kbd>${esc(padBtn(6))}</kbd>+${['KeyH', 'KeyI', 'KeyO', 'KeyG'].map(c => `<kbd>${esc(padBtn(+Object.keys(PAD_LAYER).find(i => PAD_LAYER[i] === c)))}</kbd>`).join('')} skills`,
      pk('KeyE') + ' use', pk('KeyF') + ' flask', pk('KeyQ') + ' veil', pk('KeyR') + ' lock', pk('KeyT') + ' target', pk('KeyM') + ' map',
      `<kbd>${esc(padBtn(9))}</kbd> pause <span class="khint">· all buttons</span>`];
    return out.join(' &nbsp; ');
  }
  // Prompts and objectives that name keys, reworded for the controller
  function padSay(t) {
    return t.replace(/^E · /, padName('KeyE') + ' · ').replace(/^Q · /, padName('KeyQ') + ' · ').replace(/press E/g, 'press ' + padName('KeyE'))
      .replace(/\(Q works anywhere\)/, `(${padName('KeyQ')} works anywhere)`).replace(/ \(N\)/g, ` (${padName('KeyN')})`)
      .replace(/ \(B\)/g, ` (${padName('KeyB')})`).replace(/\(O\)/g, `(${padName('KeyO')})`);
  }
  // Pause menu: the full controller layout (read only; it shows above the keyboard list while a controller is in use)
  function padControlsHtml() {
    const rows = ACTIONS.map(([g, list]) => `<div class="cgrp"><h4>${g}</h4>` + list.map(([id, name]) =>
      `<div class="crow"><span>${esc(name)}</span><span class="ckey pkey">${esc(padName(id))}</span></div>`).join('') + '</div>').join('');
    return '<h3>Controller</h3><p class="cnote">Left stick moves, right stick turns the camera (flick it to switch targets while locked). ' +
      `Hold ${esc(padBtn(6))} for the skill layer. In menus the d-pad moves, ${esc(padBtn(0))} picks, ${esc(padBtn(1))} goes back.</p>` + rows;
  }

  // ---------- Menus: d-pad / left stick move focus, A picks, B backs out ----------
  function openPanel() {
    if (G.paused) return ui.pauseEl;
    if (!ui.banner.hidden && !ui.bbtn.hidden) return ui.banner;
    if (G.shop) return ['inv', 'shop', 'worlds'].map(id => document.getElementById(id)).find(el => el && !el.hidden) || null;
    return null;
  }
  function focusables(root) {
    return [...root.querySelectorAll('button, input, summary, select, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null && !el.classList.contains('ckey'));
  }
  function moveFocus(root, step) {
    const list = focusables(root); if (!list.length) return;
    const at = list.indexOf(document.activeElement);
    const next = list[at < 0 ? (step > 0 ? 0 : list.length - 1) : (at + step + list.length) % list.length];
    document.querySelectorAll('.padfocus').forEach(el => el.classList.remove('padfocus'));
    next.classList.add('padfocus'); next.focus({ preventScroll: false });
    if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
  }
  function menuButton(i, panel) {
    if (i === 12 || i === 14) moveFocus(panel, -1);
    else if (i === 13 || i === 15) moveFocus(panel, 1);
    else if (i === 0) {
      const el = document.activeElement;
      if (el && panel.contains(el) && el !== document.body) el.click();
      else if (panel === ui.banner) restart();
      else moveFocus(panel, 1);
    } else if (i === 1 || i === 9) {
      if (G.paused) setPause(false);
      else if (G.shop) closeShop();
      else if (panel === ui.banner && i === 9) restart();
    }
  }

  // ---------- Play ----------
  function playButton(i, layer) {
    if (i === 9) { togglePause(); return; }
    if (PAD_HOLD[i]) { press(PAD_HOLD[i]); return; }
    const code = (layer && PAD_LAYER[i]) || PAD_BASE[i];
    if (code) press(code);
  }
  const axis = v => Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);
  function pollPad(now) {
    const dt = Math.min(0.05, (now - pad.last) / 1000); pad.last = now;
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null;
    if (!gp) { P.pad.x = P.pad.y = 0; pad.prev = []; Object.keys(pad.held).forEach(c => keys.delete(c)); pad.held = {}; return; }
    pad.kind = /054c|sony|playstation|dualsense|dualshock/i.test(gp.id) ? 'ps' : 'xbox';
    const b = gp.buttons.map(x => x && (x.pressed || x.value > 0.5));
    const ax = gp.axes, lx = axis(ax[0] || 0), ly = axis(ax[1] || 0), rx = axis(ax[2] || 0);
    const panel = openPanel();
    const fresh = b.map((on, i) => on && !pad.prev[i]);
    if (fresh.some(Boolean) || Math.hypot(lx, ly) > 0.3 || Math.abs(rx) > 0.3) setPad(true);
    // Left stick in a menu steps focus like the d-pad, once per push
    const sy = Math.abs(ly) > 0.6 ? Math.sign(ly) : 0;
    if (panel && sy && sy !== pad.stickY) moveFocus(panel, sy);
    pad.stickY = sy;
    if (panel) {
      P.pad.x = P.pad.y = 0;
      Object.keys(pad.held).forEach(c => keys.delete(c)); pad.held = {};
      fresh.forEach((f, i) => { if (f) menuButton(i, panel); });
    } else {
      document.querySelectorAll('.padfocus').forEach(el => el.classList.remove('padfocus'));
      P.pad.x = lx; P.pad.y = ly;
      const layer = !!b[6];
      fresh.forEach((f, i) => { if (f) playButton(i, layer); });
      // Held buttons (block) stay in the keys set until released
      for (const i in PAD_HOLD) {
        const c = PAD_HOLD[i];
        if (b[i]) { keys.add(c); pad.held[c] = 1; } else if (pad.held[c]) { keys.delete(c); delete pad.held[c]; }
      }
      // Right stick: turn the camera, or flick to the next target while the camera is locked
      if (!G.paused && !G.shop) {
        if (!G.lock) yaw -= rx * 2.6 * dt;
        else {
          const f = Math.abs(rx) > 0.7 ? Math.sign(rx) : 0;
          if (f && f !== pad.flick) press('KeyT');
          pad.flick = f;
        }
      }
    }
    pad.prev = b;
  }
  window.addEventListener('gamepadconnected', ev => {
    if (pad.seen) return; pad.seen = true;
    pad.kind = /054c|sony|playstation|dualsense|dualshock/i.test(ev.gamepad.id) ? 'ps' : 'xbox';
    setPad(true);
    showTip('Controller connected', [`Left stick moves, ${padBtn(2)} attacks, ${padBtn(0)} jumps.`, `Hold ${padBtn(6)} for skills. ${padBtn(9)} shows every button.`], 7);
  });
  window.addEventListener('gamepaddisconnected', () => { if (!navigator.getGamepads || ![...navigator.getGamepads()].some(g => g && g.connected)) setPad(false); });
  function padLoop(now) { requestAnimationFrame(padLoop); pollPad(now); } // own loop, so menus work while the game is paused
  requestAnimationFrame(padLoop);
