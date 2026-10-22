  // ---------- Progression: levels, attributes, gold ----------
  const xpNext = () => Math.round(80 * Math.pow(PR.level, 1.5));
  function recalc() {
    P.max = 100 + 14 * (PR.level - 1) + 12 * PR.vit;
    P.armorMax = 60 + 20 * PR.armorLv + (PR.warden ? 40 : 0);
    P.manaMax = 100 + 10 * PR.spi + (PR.warden ? 50 : 0);
    P.stMax = 100 + 6 * PR.agi;
    PR.dmg = (1 + 0.06 * PR.str + 0.04 * (PR.level - 1) + 0.12 * PR.weapon) * (PR.warden ? 1.25 : 1);
    PR.spell = (1 + 0.08 * PR.spi + 0.04 * (PR.level - 1)) * (PR.warden ? 1.15 : 1);
    PR.speed = 1 + 0.03 * PR.agi + (PR.warden ? 0.1 : 0);
    updateSwordLook();
    P.hp = Math.min(P.hp, P.max); P.mana = Math.min(P.mana, P.manaMax); P.armor = Math.min(P.armor, P.armorMax); P.st = Math.min(P.st, P.stMax);
    renderHero();
  }
  function reward(xp, gold, at) {
    xp = Math.round(xp * G.env.xp); gold = Math.round(gold);
    PR.gold += gold; PR.xp += xp;
    floatText(`+${xp} XP${gold ? `  +${gold} gold` : ''}`, at, 'word', '#ffd36a');
    if (gold) sfx('coin');
    let up = false;
    while (PR.xp >= xpNext()) { PR.xp -= xpNext(); PR.level++; PR.points += 2; up = true; }
    if (up) {
      recalc(); P.hp = P.max; P.mana = P.manaMax; P.flasks = PR.flaskMax;
      sfx('parry'); burst(player.position.x, player.position.y + 1.5, player.position.z, 40, 6);
      floatText(`LEVEL ${PR.level}  +2 points (P)`, player.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'word', '#ffd36a');
      if (PR.level === 3) floatText('Arc Volley learned (V)', player.position.clone().add(new THREE.Vector3(0, 3.8, 0)), 'word', '#c8a9ff');
    }
    renderHero();
  }
  function renderHero() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('hlv', `Lv ${PR.level}`);
    const pts = document.getElementById('hpts'); pts.hidden = !PR.points; pts.textContent = `+${PR.points}`;
    set('xptxt', `${PR.xp} / ${xpNext()}`); document.getElementById('xpfill').style.width = (PR.xp / xpNext() * 100) + '%';
    set('gold', PR.gold); set('a_str', PR.str); set('a_vit', PR.vit); set('a_agi', PR.agi); set('a_spi', PR.spi);
    set('g_weapon', `+${PR.weapon} \u00b7 ${SWORDS[swordTier].name}`); set('g_armor', `+${PR.armorLv}`); set('g_flask', PR.flaskMax);
    const gw = document.getElementById('g_warden'); gw.textContent = PR.warden ? 'Earned' : 'Not yet earned'; gw.className = PR.warden ? 'gold' : 'muted';
    document.querySelectorAll('.attr button').forEach(b => { b.disabled = !PR.points; });
  }
  document.querySelectorAll('.attr button').forEach(b => b.addEventListener('click', () => {
    if (!PR.points) return;
    PR[b.dataset.attr]++; PR.points--; recalc(); b.blur();
  }));
