  // ---------- World select overlay ----------
  const worldsEl = $('#worlds'), worldList = $('#worldlist'), cap = t => t[0].toUpperCase() + t.slice(1);
  function renderWorlds() {
    const ST = G.story;
    $('#worldsnote').textContent = `Shards of the World Heart: ${shardCount()} of 4. Each world holds one.`;
    worldList.innerHTML = CHAPTERS.map((w, i) => {
      const here = w === G.world, open = ST.unlocked[w];
      const sub = !open ? UNLOCK_HINT[w] : ST.shards[w] ? (i && stageOf(w) > 1 ? `Stage ${stageOf(w)}: ${ST.step[w] === 1 ? `defeat ${WORLDS[w].bossName}` : ST.step[w] === 2 ? 'cleared, the next stage is coming' : WORLDS[w].task}` : `${cap(SHARD[w])} recovered`) : i === 0 ? 'Chapter 1: the Gate Warden holds the Moon Shard' : ST.step[w] === 1 ? `Chapter ${i + 1}: defeat ${WORLDS[w].bossName}` : `Chapter ${i + 1}: ${WORLDS[w].task}`;
      return `<button type="button" class="shopbtn" data-w="${w}"${here || !open ? ' disabled' : ''}><span>${WNAME[w]}<small>${sub}</small></span><span class="gold">${here ? 'You are here' : open ? 'Travel' : 'Sealed'}</span></button>`;
    }).join('');
  }
  function openWorlds() {
    const why = travelBlock();
    if (why) { floatText(why, player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#ffd36a'); return; }
    G.shop = true; G.gateUI = true; worldsEl.hidden = false; keys.clear(); sfx('cast');
    renderWorlds();
  }
  worldList.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-w]'); if (!b || b.disabled) return;
    const w = b.dataset.w; closeShop();
    const why = travelBlock();
    if (why) { floatText(why, player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#ffd36a'); return; }
    enterWorld(w, G.lastPos[w] || spawnOf(w), 'gate');
  });
  $('#worldsclose').addEventListener('click', closeShop);
