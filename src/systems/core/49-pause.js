  // ---------- Pause ----------
  function setPause(on) {
    if (on && (G.state === 'dead' || G.state === 'won' || G.shop)) return;
    G.paused = on; ui.pauseEl.hidden = !on; keys.clear();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function togglePause() { setPause(!G.paused); }
  document.getElementById('pausebtn').addEventListener('click', togglePause);
  document.getElementById('resumebtn').addEventListener('click', () => setPause(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
  window.addEventListener('blur', () => setPause(true));
