  // ---------- Input ----------
  const keys = new Set();
  const HELD = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  function press(code) {
    if (G.paused) return;
    audio();
    if (code === 'KeyJ') request('light');
    else if (code === 'KeyK') request('heavy');
    else if (code === 'Space') request('roll');
    else if (code === 'KeyF') request('drink');
    else if (code === 'KeyC') request('cast');
    else if (code === 'KeyZ') request('throw');
    else if (code === 'KeyV') request('volley');
    else if (code === 'KeyX') request('leap');
    else if (code === 'KeyE') interact();
    else if (code === 'KeyQ') toggleRealm();
    else if (code === 'KeyG') jump();
    else if (code === 'KeyI') openInv();
    else if (code === 'KeyU') upgradeSword();
    else if (code === 'KeyM') ui.minimap.classList.toggle('big');
    else if (code === 'KeyP') { ui.heroEl.open = !ui.heroEl.open; }
    else if (code === 'KeyR') { G.lock = !G.lock; if (!G.lock) G.target = null; }
    else if (code === 'KeyT') {
      const live = liveTargets();
      if (live.length > 1) { G.target = live[(live.indexOf(G.target) + 1) % live.length]; G.lock = true; }
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight') P.blockT = 0;
    if (HELD.includes(code)) keys.add(code);
  }
  window.addEventListener('keydown', ev => {
    if (!ui.banner.hidden && !ui.bbtn.hidden && (ev.code === 'Enter' || ev.code === 'KeyR')) { ev.preventDefault(); restart(); return; }
    if (G.shop && (ev.code === 'KeyE' || ev.code === 'Escape' || (ev.code === 'KeyI' && G.invUI))) { ev.preventDefault(); closeShop(); return; }
    if (ev.code === 'Escape') { ev.preventDefault(); togglePause(); return; }
    if (G.paused) return;
    if (ev.target.closest && ev.target.closest('input, button, summary')) return;
    const handled = HELD.includes(ev.code) || ['KeyJ', 'KeyK', 'Space', 'KeyF', 'KeyR', 'KeyC', 'KeyT', 'KeyZ', 'KeyV', 'KeyX', 'KeyE', 'KeyP', 'KeyQ', 'KeyM', 'KeyG', 'KeyI', 'KeyU'].includes(ev.code);
    if (!handled) return;
    ev.preventDefault();
    if (ev.repeat) return;
    press(ev.code);
  });
  window.addEventListener('keyup', ev => keys.delete(ev.code));
  window.addEventListener('blur', () => keys.clear());

  let yaw = 0, drag = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, x0: ev.clientX, t: performance.now() }; cv.setPointerCapture(ev.pointerId); audio(); });
  cv.addEventListener('pointermove', ev => { if (drag) { if (!G.lock) yaw -= (ev.clientX - drag.x) * 0.006; drag.x = ev.clientX; } });
  cv.addEventListener('pointerup', ev => {
    if (drag && Math.abs(ev.clientX - drag.x0) < 6 && performance.now() - drag.t < 300 && ev.pointerType === 'mouse') press('KeyJ');
    drag = null;
  });
  cv.addEventListener('pointercancel', () => { drag = null; });

  document.querySelectorAll('#tacts button, #tmisc button, #tops button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); press(k); b.setPointerCapture(ev.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, () => keys.delete(k)));
  });

  function moveInput() {
    const J = P.joy && Math.hypot(P.joy.x, P.joy.y) > 0.18 ? P.joy : null;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (J ? J.y : 0);
    const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + (J ? J.x : 0);
    const cf = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), cr = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    return new THREE.Vector3().addScaledVector(cf, f).addScaledVector(cr, r);
  }
