  // ---------- Renderer controls ----------
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    seg.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const v = Number(b.dataset.v);
      if (seg.dataset.key === 'mode') { S.mode = v; postU.uMode.value = v; $('#tags').hidden = v !== 1; }
      else { S.pal = v; postU.uPal.value = v; }
      b.blur();
    });
  });
  $('#cell').addEventListener('input', ev => { S.cell = Number(ev.target.value); $('#cellOut').textContent = S.cell + ' px'; buildAtlas(); });
  $('#gain').addEventListener('input', ev => { S.gain = Number(ev.target.value); $('#gainOut').textContent = S.gain.toFixed(1); postU.uGain.value = S.gain; });
  $('#edges').addEventListener('change', ev => { S.edges = ev.target.checked; postU.uEdges.value = S.edges ? 1 : 0; });
  $('#reflect').addEventListener('change', ev => { S.reflect = ev.target.checked; waterU.uOn.value = S.reflect ? 1 : 0; });
  $('#sound').addEventListener('change', ev => { S.sound = ev.target.checked; });
  // Closed on first load at every width; after that it remembers the player's choice
  try { if (localStorage.getItem('mm-panel') === '1') $('#panel').open = true; } catch (e) { /* storage blocked */ }
  $('#panel').addEventListener('toggle', () => { try { localStorage.setItem('mm-panel', $('#panel').open ? '1' : '0'); } catch (e) { /* private mode */ } });
