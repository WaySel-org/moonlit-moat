  // ---------- Touch controls: joystick, action arc, and live switching between touch and keyboard ----------
  // Hybrids (a ThinkPad Yoga, a tablet with a keyboard cover) report a fine primary pointer even when played by touch,
  // so the layout follows the last input: a touch or pen shows the touch controls, a key or the mouse hides them.
  const isTouch = () => document.body.classList.contains('touch');
  function setTouch(on) { document.body.classList.toggle('touch', on); }
  setTouch(matchMedia('(pointer: coarse)').matches);
  window.addEventListener('pointerdown', ev => { if (ev.pointerType === 'touch' || ev.pointerType === 'pen') setTouch(true); else if (ev.pointerType === 'mouse') setTouch(false); }, true);
  window.addEventListener('keydown', ev => { if (!ev.repeat && ev.code !== 'Escape') setTouch(false); }, true);

  // A floating joystick: touch anywhere on the left side and drag. moveInput() reads P.joy.
  P.joy = { x: 0, y: 0, id: null };
  const jz = $('#joyzone'), jb = $('#joybase'), jk = $('#joyknob'), JR = 56;
  jz.addEventListener('pointerdown', ev => {
    if (P.joy.id !== null || G.paused) return;
    ev.preventDefault(); P.joy.id = ev.pointerId; P.joy.cx = ev.clientX; P.joy.cy = ev.clientY;
    try { jz.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic or already released */ }
    audio();
    jb.style.left = ev.clientX + 'px'; jb.style.top = ev.clientY + 'px'; jb.classList.add('on');
  });
  jz.addEventListener('pointermove', ev => {
    if (ev.pointerId !== P.joy.id) return;
    let dx = ev.clientX - P.joy.cx, dy = ev.clientY - P.joy.cy; const d = Math.hypot(dx, dy);
    if (d > JR) { dx *= JR / d; dy *= JR / d; }
    P.joy.x = dx / JR; P.joy.y = dy / JR; jk.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const joyEnd = ev => { if (ev.pointerId !== P.joy.id) return; P.joy.id = null; P.joy.x = P.joy.y = 0; jk.style.transform = ''; jb.classList.remove('on'); jb.style.left = jb.style.top = ''; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => jz.addEventListener(t, joyEnd));

  // Prompts and objectives speak in buttons, not keys, while touch is in use. Tapping a prompt uses it.
  function touchSay(t) {
    if (!isTouch()) return t;
    return t.replace(/^E · /, 'Tap Use · ').replace(/^Q · /, 'Tap Veil · ').replace(/press E/g, 'tap Use').replace(/\(Q works anywhere\)/, '(Veil works anywhere)')
      .replace(/ \(N\)/g, ' (tap Bag)').replace(/ \(B\)/g, '').replace(/\(O\)/g, '(Leap)');
  }
  ui.prompt.addEventListener('pointerdown', ev => {
    const t = ui.prompt.textContent; ev.preventDefault();
    if (/^Tap Use/.test(t)) press('KeyE'); else if (/^Tap Veil/.test(t)) press('KeyQ');
  });
  // Mirror the skill bar's cooldowns and labels onto the touch skill buttons
  function touchSkill(id, locked, frac) {
    const b = document.getElementById(id); if (!b) return;
    b.classList.toggle('locked', locked); b.style.setProperty('--cd', Math.round(clamp(frac, 0, 1) * 100) + '%');
  }
