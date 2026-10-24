  // ---------- Moon Shrine: spend gold on gear ----------
  const SHRINE = new THREE.Vector3(5, 0, 18);
  (function buildShrine() {
    box(1.8, 0.4, 1.8, SHRINE.x, 0.2, SHRINE.z, stone);
    box(0.7, 1.6, 0.7, SHRINE.x, 1.2, SHRINE.z, stone);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
    crystal.position.set(SHRINE.x, 2.6, SHRINE.z); scene.add(crystal); SHRINE.crystal = crystal;
  })();
  const shopCost = {
    weapon: () => Math.round(60 * Math.pow(PR.weapon + 1, 1.6)),
    armor: () => Math.round(50 * Math.pow(PR.armorLv + 1, 1.6)),
    flask: () => PR.flaskMax >= 6 ? Infinity : Math.round(120 * (PR.flaskMax - 2))
  };
  function renderShop() {
    document.getElementById('shopgold').textContent = PR.gold;
    const row = (id, label, cost) => {
      const b = document.getElementById(id);
      b.innerHTML = `<span>${label}</span><span class="gold">${cost === Infinity ? 'Maxed' : cost + ' gold'}</span>`;
      b.disabled = cost === Infinity || PR.gold < cost;
    };
    row('buy_weapon', `Sharpen weapon to +${PR.weapon + 1} (+12% damage)`, shopCost.weapon());
    row('buy_armor', `Reinforce armour to +${PR.armorLv + 1} (+20 armour)`, shopCost.armor());
    row('buy_flask', `Extra flask slot (${PR.flaskMax} of 6)`, shopCost.flask());
  }
  function buy(kind) {
    const cost = shopCost[kind](); if (PR.gold < cost) return;
    PR.gold -= cost; sfx('coin');
    if (kind === 'weapon') PR.weapon++; else if (kind === 'armor') { PR.armorLv++; } else { PR.flaskMax++; }
    recalc(); P.armor = P.armorMax; P.flasks = PR.flaskMax; renderShop();
  }
  ['weapon', 'armor', 'flask'].forEach(k => document.getElementById('buy_' + k).addEventListener('click', () => buy(k)));
  function openShop() {
    G.shop = true; ui.shop.hidden = false; keys.clear();
    P.hp = P.max; P.mana = P.manaMax; P.flasks = PR.flaskMax; sfx('drink');
    renderShop();
  }
  function closeShop() { G.shop = false; G.gateUI = false; G.invUI = false; document.getElementById('inv').hidden = true; ui.shop.hidden = true; document.getElementById('worlds').hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  document.getElementById('shopclose').addEventListener('click', closeShop);

  function nearestInteract() {
    if (G.state === 'dead' || G.state === 'won') return null;
    if (P.mount) return { kind: 'dismount' };
    if (G.world !== 'moat') return worldInteract();
    let best = null, bd = 2.2;
    chests.forEach(c => { if (!c.open && Math.abs(player.position.y - c.y) < 1.5) { const d = flatDist(player.position, c); if (d < bd) { bd = d; best = { kind: 'chest', c }; } } });
    if (best || P.y > 1) return best;
    if (flatDist(player.position, SHRINE) < 2.6) return { kind: 'shrine' };
    if (G.realm === 'spirit') return best;
    if (flatDist(player.position, MOAT_GATE) < 3) return { kind: 'wgate' };
    if (G.state === 'explore' && !G.storm && B.state === 'perch' && Math.hypot(player.position.x, player.position.z + 17) < 7) return { kind: 'gate' };
    beasts.forEach(b => { if (b.state === 'wild' && flatDist(player.position, b.g.position) < 3.4) best = { kind: 'beast', b }; });
    return best;
  }
  function interact() {
    if (G.shop) { closeShop(); return; }
    const it = nearestInteract(); if (!it) return;
    if (it.kind === 'wgate') openWorlds(); else if (it.kind === 'survivor') rescue(it.s); else if (it.kind === 'chest') openChest(it.c); else if (it.kind === 'gate') startFight(); else if (it.kind === 'beast') beginTame(it.b); else if (it.kind === 'dismount') dismount(); else openShop();
  }
