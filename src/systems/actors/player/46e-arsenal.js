  // ---------- Arsenal: inventory, sword upgrades, jumping and air combos ----------
  // Gear: one sword and two charms equipped, eight bag slots. Elites, ancients, bosses, raiders and cleared waves drop gear.
  // The equipped sword feeds on kills; when its edge bar fills, press N (or Upgrade in the bag) to raise its rank.
  const SWORD_KINDS = [
    { name: 'Ember Saber', affix: 'burn', note: '+15% damage as fire' },
    { name: 'Leech Fang', affix: 'leech', note: 'heals 4% of damage dealt' },
    { name: 'Gale Cutter', affix: 'swift', note: '+8% move speed' },
    { name: 'Gravesteel', affix: null, note: '' },
    { name: 'Starforged Blade', affix: 'burn', note: '+15% damage as fire' }
  ];
  const CHARM_KINDS = [
    { name: 'Wolf Tooth', stat: 'st', unit: 'stamina', base: 18 },
    { name: 'Heartstone', stat: 'hp', unit: 'max health', base: 22 },
    { name: 'Moon Pearl', stat: 'mana', unit: 'mana', base: 20 },
    { name: 'War Sigil', stat: 'dmg', unit: '% damage', base: 6 },
    { name: 'Feather Knot', stat: 'speed', unit: '% speed', base: 4 }
  ];
  const edgeNeed = s => 12 + 10 * s.rank;
  PR.inv = { sword: { kind: 'sword', name: 'Iron Sword', dmg: 0, rank: 0, kills: 0, affix: null, note: '' }, charms: [null, null], bag: Array(8).fill(null) };
  function rollGear(q) {
    const t = worldTier() + q;
    if (Math.random() < 0.5) {
      const k = SWORD_KINDS[Math.floor(Math.random() * SWORD_KINDS.length)];
      return { kind: 'sword', name: k.name, dmg: Math.round((0.08 + 0.06 * t + Math.random() * 0.1) * 100) / 100, rank: 0, kills: 0, affix: k.affix, note: k.note };
    }
    const k = CHARM_KINDS[Math.floor(Math.random() * CHARM_KINDS.length)];
    return { kind: 'charm', name: k.name, stat: k.stat, unit: k.unit, val: Math.round(k.base * (0.7 + 0.3 * t) * (0.8 + Math.random() * 0.4)) };
  }
  // q: 0 common, 1 elite, 2 boss
  function dropGear(at, q, chance) {
    if (Math.random() > (chance === undefined ? 1 : chance)) return;
    const it = rollGear(q), i = PR.inv.bag.indexOf(null), pos = (at || player.position).clone().add(new THREE.Vector3(0, 3, 0));
    if (i < 0) { floatText(`Bag full: left ${it.name} behind`, pos, 'word', '#ff9a4a'); return; }
    PR.inv.bag[i] = it; sfx('pickup');
    floatText(`Found ${it.name} (B)`, pos, 'word', '#9fe8ff');
    renderGear();
  }
  const itemLine = it => it.kind === 'sword' ? `+${Math.round((it.dmg + 0.1 * it.rank) * 100)}% damage${it.note ? ', ' + it.note : ''}` : `+${it.val}${it.unit[0] === '%' ? '' : ' '}${it.unit}`;
  function gearSum(stat) { return PR.inv ? PR.inv.charms.reduce((s, c) => s + (c && c.stat === stat ? c.val : 0), 0) : 0; }
  // Called from recalc(): gear on top of level and attributes
  function applyGear() {
    if (!PR.inv) return;
    const s = PR.inv.sword;
    P.max += gearSum('hp'); P.stMax += gearSum('st'); P.manaMax += gearSum('mana');
    PR.dmg *= (1 + s.dmg + 0.1 * s.rank) * (1 + gearSum('dmg') / 100) * (s.affix === 'burn' ? 1.15 : 1);
    PR.speed *= (1 + gearSum('speed') / 100) * (s.affix === 'swift' ? 1.08 : 1);
  }
  function gearOnHit(dmg) {
    if (PR.inv.sword.affix === 'leech' && P.hp > 0) P.hp = Math.min(P.max, P.hp + dmg * 0.04);
  }
  function swordFeed(n) {
    const s = PR.inv.sword, was = s.kills >= edgeNeed(s);
    s.kills += n;
    if (!was && s.kills >= edgeNeed(s)) floatText(`${s.name} is ready to upgrade (N)`, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#9fe8ff');
    renderGear();
  }
  function upgradeSword() {
    const s = PR.inv.sword;
    if (s.kills < edgeNeed(s)) { floatText(`Edge ${s.kills}/${edgeNeed(s)}: keep fighting`, player.position.clone().add(new THREE.Vector3(0, 2.8, 0)), 'word', '#9fe8ff'); return; }
    s.kills -= edgeNeed(s); s.rank++;
    recalc(); sfx('parry'); burst(player.position.x, player.position.y + 1.4, player.position.z, 40, 6);
    floatText(`${s.name} +${s.rank}`, player.position.clone().add(new THREE.Vector3(0, 3.4, 0)), 'word', '#bff6ff');
    renderGear();
  }

  // The gear strip above the skills, and the bag panel
  const gearEl = $('#gear'), invEl = $('#inv'), invBody = $('#invbody');
  function slotHtml(it, act, i, empty) {
    if (!it) return `<button type="button" class="slot empty" disabled><span>${empty}</span></button>`;
    const s = it.kind === 'sword' && act === 'sword' ? `<i class="edge"><b style="width:${Math.min(100, it.kills / edgeNeed(it) * 100)}%"></b></i>` : '';
    return `<button type="button" class="slot ${it.kind}" data-act="${act}" data-i="${i}"><span>${it.name}${it.rank ? ' +' + it.rank : ''}</span><small>${itemLine(it)}</small>${s}</button>`;
  }
  function renderGear() {
    if (!gearEl) return;
    const I = PR.inv, s = I.sword, ready = s.kills >= edgeNeed(s);
    gearEl.innerHTML = `<button type="button" data-open="1" class="${ready ? 'ready' : ''}"><b>${s.name}${s.rank ? ' +' + s.rank : ''}</b><i class="edge"><b style="width:${Math.min(100, s.kills / edgeNeed(s) * 100)}%"></b></i></button>`
      + I.charms.map(c => `<button type="button" data-open="1"><b>${c ? c.name : 'Charm slot'}</b><small>${c ? itemLine(c) : 'empty'}</small></button>`).join('')
      + `<button type="button" data-open="1"><b>Bag (B)</b><small>${I.bag.filter(Boolean).length} / 8</small></button>`;
    if (invEl.hidden) return;
    invBody.innerHTML = `<p class="muted">Click a bag item to equip it. Click an equipped charm to take it off. &times; salvages for gold.</p>
      <h3>Equipped</h3><div class="slots">${slotHtml(s, 'sword', 0, 'Sword')}${I.charms.map((c, i) => slotHtml(c, 'charm', i, 'Charm')).join('')}</div>
      <div class="row"><span>Edge ${Math.min(s.kills, edgeNeed(s))} / ${edgeNeed(s)} kills</span><button type="button" class="shopbtn" data-act="upgrade"${ready ? '' : ' disabled'}>Upgrade sword (N)</button></div>
      <h3>Bag</h3><div class="slots bag">${I.bag.map((it, i) => it ? `<div class="cell">${slotHtml(it, 'bag', i)}<button type="button" class="x" data-act="salvage" data-i="${i}" aria-label="Salvage ${it.name}">&times;</button></div>` : `<div class="cell">${slotHtml(null, '', i, 'Empty')}</div>`).join('')}</div>`;
  }
  function openInv() {
    if (G.state === 'dead' || G.state === 'won' || G.shop) return;
    G.shop = true; G.invUI = true; invEl.hidden = false; keys.clear(); renderGear();
  }
  function invClick(ev) {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.open) { openInv(); return; }
    const I = PR.inv, act = b.dataset.act, i = +b.dataset.i;
    if (act === 'upgrade') upgradeSword();
    else if (act === 'salvage' && I.bag[i]) { const g = 30 * worldTier(); I.bag[i] = null; reward(0, g, player.position.clone().add(new THREE.Vector3(0, 2.6, 0))); }
    else if (act === 'charm' && I.charms[i]) { const k = I.bag.indexOf(null); if (k >= 0) { I.bag[k] = I.charms[i]; I.charms[i] = null; } }
    else if (act === 'bag' && I.bag[i]) {
      const it = I.bag[i];
      if (it.kind === 'sword') { I.bag[i] = I.sword; I.sword = it; }
      else { const k = I.charms.indexOf(null) >= 0 ? I.charms.indexOf(null) : 0; I.bag[i] = I.charms[k]; I.charms[k] = it; }
      sfx('pickup');
    }
    recalc(); renderGear();
  }
  gearEl.addEventListener('click', invClick); invBody.addEventListener('click', invClick);
  $('#invclose').addEventListener('click', closeShop);
  function resetArsenal() {
    PR.inv = { sword: { kind: 'sword', name: 'Iron Sword', dmg: 0, rank: 0, kills: 0, affix: null, note: '' }, charms: [null, null], bag: Array(8).fill(null) };
    P.jh = 0; P.jv = 0; P.airHits = 0; recalc(); renderGear();
  }

  // Jumping (Space). In the air: attack for a spinning slash (twice per jump), heavy to plunge.
  // Two slashes then a plunge is Skyfall: a bigger landing blast.
  P.jh = 0; P.jv = 0; P.airHits = 0;
  function jump() {
    if (P.mount || P.jh > 0 || P.act || P.stone > 0 || G.state === 'dead' || G.state === 'won' || P.st < 10) return;
    P.jv = 11.5; P.jh = 0.01; P.airHits = 0; P.plunge = false; P.st -= stCost(10); P.stDelay = 0.5; sfx('roll');
    const mv = moveInput(); P.jdir = mv.lengthSq() > 0 ? mv.normalize().multiplyScalar(6.8 * PR.speed) : new THREE.Vector3();
  }
  function airAttack(name) {
    if (name === 'light') {
      if (P.airHits >= 2 || P.st < 8) return false;
      P.act = 'airslash'; P.actT = 0; P.actDur = 0.26; P.hitDone = false; P.airHits++; P.st -= stCost(8); P.stDelay = 0.5;
      P.jv = Math.max(P.jv, 6); sfx('swing'); return true;
    }
    P.act = 'plunge'; P.actT = 0; P.actDur = 2; P.hitDone = false; P.jv = -26; P.plunge = true; sfx('swoosh'); return true;
  }
  function airTick(dt) {
    if (P.jh <= 0 && P.jv === 0) return;
    if (P.act === 'airslash' || P.act === 'plunge') movePlayer(P.jdir.x * dt, P.jdir.z * dt);
    if (P.act === 'airslash') {
      const k = P.actT / P.actDur; pBody.rotation.y = k * TAU;
      if (!P.hitDone && k > 0.3) {
        P.hitDone = true; spawnSwoosh(false);
        liveTargets().forEach(t => { if (Math.abs(t.pos.y - player.position.y) < 3 && flatDist(player.position, t.pos) < 2.9 + t.radius) damageEnemy(t, 22 * PR.dmg, 14, false); });
      }
    } else pBody.rotation.y = 0;
    if (P.act === 'plunge') pBody.rotation.x = -0.6;
    P.jv -= (P.plunge ? 40 : 22) * dt; P.jh += P.jv * dt;
    if (P.jh > 0) return;
    P.jh = 0; P.jv = 0; pBody.rotation.set(0, 0, 0);
    if (!P.plunge) return;
    // Landing slam
    const sky = P.airHits >= 2, r = sky ? 4.6 : 3.4;
    P.plunge = false; P.act = null; P.actT = 1;
    G.shake = Math.max(G.shake, sky ? 0.7 : 0.45); sfx('boom'); spawnSwoosh(true);
    burst(player.position.x, P.y + 0.3, player.position.z, sky ? 60 : 34, sky ? 9 : 6);
    const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: sky ? 0xbff6ff : 0xfff0c8, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(player.position.x, P.y + 0.06, player.position.z); scene.add(m); fxRings.push({ m, r: 0.4 });
    if (sky) floatText('SKYFALL', player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#bff6ff');
    liveTargets().forEach(t => {
      if (Math.abs(t.pos.y - P.y) > 3 || flatDist(player.position, t.pos) > r + t.radius) return;
      damageEnemy(t, (sky ? 90 : 55) * PR.dmg, sky ? 60 : 35, true);
      if (t.isCreep) t.stun = Math.max(t.stun, sky ? 1.4 : 0.8);
    });
  }
  recalc(); renderGear();
