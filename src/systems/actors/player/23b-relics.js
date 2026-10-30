  // ---------- Relics: passive keepsakes that shape a build ----------
  // The hero carries up to three. They drop from gilded and crystal chests, ancients, elites, godlings,
  // the Warden and every cleared stage. A relic lying on the ground lasts ninety seconds. Full slots
  // refuse a pickup; drop one from the hero sheet (P) and it lands at your feet, so you can swap.
  const RELICS = {
    fang:  { name: 'Serrated Fang', desc: 'Light hits have a 30% chance to Rend.', col: '#ff6a4a' },
    leech: { name: 'Leech Idol', desc: 'Heavy hits heal 6% of the damage they deal.', col: '#4dff6a' },
    eye:   { name: "Hunter's Eye", desc: '+12% crit chance. Backstabs hit 25% harder.', col: '#ffe03a', crit: 0.12, backstab: 0.25 },
    ward:  { name: 'Wardstone', desc: 'A parry restores 25 mana and all your stamina.', col: '#bff6ff' },
    step:  { name: "Thief's Step", desc: 'Rolls cost 10 less stamina. Flow lasts 1.5 s longer.', col: '#ffd36a', flow: 1.5 },
    ember: { name: 'Ember Heart', desc: 'Rolling leaves a burning trail behind you.', col: '#ff9a3a' },
    glass: { name: 'Moonglass Charm', desc: 'Bolts cost 10 less mana. +15% spell damage.', col: '#c8a9ff', spell: 0.15 },
    skin:  { name: 'Stone Skin', desc: 'Armour regrows 3 a second once you have gone 5 s unhit.', col: '#3af0ff' },
    tooth: { name: 'Gold Tooth', desc: '+40% gold from every source.', col: '#ffd36a', gold: 0.4 },
    wick:  { name: 'Lantern Wick', desc: '+25% experience. Flasks heal 50 instead of 38.', col: '#efe6c2', xp: 0.25 }
  };
  const RELIC_KEYS = Object.keys(RELICS), RELIC_SLOTS = 3;
  function relicHas(id) { return PR.relics.includes(id); }
  function relicBonus(k) { return PR.relics.reduce((s, id) => s + (RELICS[id][k] || 0), 0); }
  const boltCost = () => relicHas('glass') ? 20 : 30;
  const flaskHeal = () => relicHas('wick') ? 50 : 38;

  const groundRelics = [];
  const relicRingGeo = new THREE.TorusGeometry(0.34, 0.07, 8, 24), relicGemGeo = new THREE.OctahedronGeometry(0.16);
  function dropRelic(x, z, id) {
    if (!id) {
      const pool = RELIC_KEYS.filter(k => !relicHas(k) && !groundRelics.some(r => r.id === k));
      if (!pool.length) return null;
      id = pool[Math.floor(Math.random() * pool.length)];
    }
    const R = RELICS[id], col = parseInt(R.col.slice(1), 16);
    const g = new THREE.Group();
    const ring = new THREE.Mesh(relicRingGeo, new THREE.MeshBasicMaterial({ color: col })); ring.rotation.x = Math.PI / 2; g.add(ring);
    g.add(new THREE.Mesh(relicGemGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const y = Math.min(0, groundAt(x, z)) + 0.9;
    g.position.set(x, y, z); scene.add(g); tag(g, 1);
    const label = document.createElement('div'); label.className = 'cbar relic'; label.innerHTML = '<span></span>'; label.firstChild.textContent = `Relic · ${R.name}`; label.firstChild.style.color = R.col; $('#cbars').appendChild(label);
    const r = { id, g, ring, label, t: 90, realm: realmKey(), y, msgCd: 0 };
    groundRelics.push(r);
    floatText(`${R.name} dropped`, g.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 'word', R.col);
    return r;
  }
  function removeGroundRelic(i) {
    const r = groundRelics[i]; scene.remove(r.g); r.g.traverse(o => { if (o.material) o.material.dispose(); }); r.label.remove(); groundRelics.splice(i, 1);
  }
  function takeRelic(id) {
    PR.relics.push(id); recalc(); renderHero(); sfx('parry');
    burst(player.position.x, player.position.y + 1.2, player.position.z, 30, 5);
    floatText(RELICS[id].name, player.position.clone().add(new THREE.Vector3(0, 3.0, 0)), 'word', RELICS[id].col);
    floatText(RELICS[id].desc, player.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 'word', '#efe6c2');
  }
  function discardRelic(id) {
    const i = PR.relics.indexOf(id); if (i < 0) return;
    PR.relics.splice(i, 1); recalc(); renderHero();
    const f = fwdOf(P.facing);
    dropRelic(player.position.x + f.x * 1.6, player.position.z + f.z * 1.6, id);
  }
  function updateRelics(dt, real) {
    const rk = realmKey(), tt = uTime.value;
    for (let i = groundRelics.length - 1; i >= 0; i--) {
      const r = groundRelics[i]; r.t -= dt; r.msgCd -= real;
      const here = r.realm === rk;
      r.g.visible = here; r.label.hidden = true;
      if (r.t <= 0) { removeGroundRelic(i); continue; }
      if (!here) continue;
      r.ring.rotation.z += dt * 1.6; r.g.position.y = r.y + Math.sin(tt * 2.2 + i) * 0.12;
      if (Math.random() < 0.25) { fwColor.set(RELICS[r.id].col); fwParticle(r.g.position.x, r.g.position.y, r.g.position.z, 0, 0.8, 0, fwColor, 0.5, true); }
      const sp = project(r.g.position.clone().setY(r.g.position.y + 0.9));
      if (sp.ok && flatDist(player.position, r.g.position) < 30) { r.label.hidden = false; r.label.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`; }
      if (P.act === 'dead' || flatDist(player.position, r.g.position) > 1.4 || Math.abs(player.position.y - r.y) > 1.6) continue;
      if (PR.relics.length < RELIC_SLOTS) { takeRelic(r.id); removeGroundRelic(i); }
      else if (r.msgCd <= 0) { r.msgCd = 2.5; showTip('Relic slots full', [`Drop one from the hero sheet (${tipKey('KeyP', 'Hero')}).`], 4); }
    }
  }
  function clearGroundRelics() { while (groundRelics.length) removeGroundRelic(groundRelics.length - 1); }
  function renderRelics() {
    const box = document.getElementById('relics'); if (!box) return;
    const html = PR.relics.map(id => `<div class="relic"><span style="color:${RELICS[id].col}">${RELICS[id].name}</span><button type="button" data-relic="${id}" aria-label="Drop ${RELICS[id].name}">Drop</button><small>${RELICS[id].desc}</small></div>`).join('')
      + (PR.relics.length < RELIC_SLOTS ? `<p class="muted">${RELIC_SLOTS - PR.relics.length} empty slot${RELIC_SLOTS - PR.relics.length > 1 ? 's' : ''}. Relics drop from gilded and crystal chests, ancients, elites, godlings and the Warden.</p>` : '');
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  document.getElementById('relics').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-relic]'); if (!b) return;
    discardRelic(b.dataset.relic); b.blur();
  });
