  // ---------- HUD: prompt, skill bar, creep health, world tier ----------
  let hudT = 0;
  function updateHud(real) {
    const cc = document.getElementById('campclock'); if (cc) cc.textContent = `Camps restock ${fmtTime(Math.max(0, G.campClock))}`;
    const it = nearestInteract();
    ui.prompt.hidden = !it || G.shop;
    if (it) ui.prompt.textContent = it.kind === 'chest' ? `E \u00b7 Open ${CHEST_TIERS[it.c.tier].name.toLowerCase()} chest`
      : it.kind === 'gate' ? `E \u00b7 Challenge the Gate Warden (Lv ${worldTier() + 2}). Recommended: level ${worldTier() + 4}, you are ${PR.level}`
      : it.kind === 'beast' ? (PR.level >= BEAST_TYPES[it.b.type].level ? `E \u00b7 Ride the ${BEAST_TYPES[it.b.type].name}` : `Ride the ${BEAST_TYPES[it.b.type].name} at level ${BEAST_TYPES[it.b.type].level} (you are ${PR.level})`)
      : it.kind === 'dismount' ? `E \u00b7 Dismount the ${BEAST_TYPES[P.mount.type].name}`
      : it.kind === 'wgate' ? 'E \u00b7 World Gate: travel between worlds'
      : it.kind === 'survivor' ? (G.story.unlocked.ash ? 'E \u00b7 Lead the survivor to safety' : 'The survivor is too frightened to move. Ashfall is still sealed.')
      : 'E \u00b7 Moon Shrine';
    if (!it && !G.shop && G.world !== 'moat') { const wp = worldPrompt(); if (wp) { ui.prompt.hidden = false; ui.prompt.textContent = wp; } }
    if (!it && !G.shop && G.world === 'moat') {
      const nr = nearestRift();
      if (nr.d < 4) { ui.prompt.hidden = false; ui.prompt.textContent = G.realm === 'spirit' ? 'Q \u00b7 Return through the Veil Rift' : 'Q \u00b7 Step into the Spirit Realm (Q works anywhere)'; }
    }
    if (!ui.prompt.hidden) { const pt = touchSay(ui.prompt.textContent); if (pt !== ui.prompt.textContent) ui.prompt.textContent = pt; }
    drawMinimap(real);
    if (SHRINE.crystal) { SHRINE.crystal.rotation.y += real * 1.2; SHRINE.crystal.position.y = 2.6 + Math.sin(uTime.value * 1.8) * 0.12; }
    const sk = (id, locked, cdFrac, needMana) => {
      const el = document.getElementById(id);
      el.classList.toggle('locked', locked || needMana);
      el.lastChild.style.height = (locked ? 0 : clamp(cdFrac, 0, 1) * 100) + '%';
      touchSkill(id.replace('sk_', 't_'), locked || needMana, locked ? 0 : cdFrac);
    };
    const mpw = P.mount ? MOUNT_POWERS[P.mount.type] : null;
    const lbl = (id, t) => { [id, id.replace('sk_', 't_')].forEach(i => { const sp = document.querySelector('#' + i + ' span'); if (sp && sp.textContent !== t) sp.textContent = t; }); };
    // Riding, Y U I O show the beast's skills; on foot, the spells and their rank
    if (mpw) [['sk_z', 'mp3'], ['sk_c', 'mp1'], ['sk_v', 'mp4'], ['sk_x', 'mp2']].forEach(([id, s]) => { const w = mpw[s]; lbl(id, w.short); sk(id, false, P.cd[s] / w.cd, P.mana < w.mana); });
    else {
      lbl('sk_z', rankName('Dagger')); lbl('sk_c', rankName('Bolt')); lbl('sk_v', rankName('Volley')); lbl('sk_x', 'Leap');
      sk('sk_z', false, P.cd.z / 0.45, P.st < 6);
      sk('sk_c', false, 0, P.mana < boltCost());
      sk('sk_v', PR.level < 3, P.cd.v / volleyCd(), P.mana < 50);
      sk('sk_x', !PR.warden, P.cd.x / 6, P.mana < 25);
    }
    sk('sk_h', PR.level < SPIN_LV || !!P.mount, P.cd.h / SPIN_CD, P.mana < SPIN_MANA);
    creeps.forEach(c => {
      if (!c.alive || c.realm !== realmKey() || flatDist(c.pos, player.position) > (c.ancient || c.mythic || c.ai === 'godling' ? 34 : 22)) { c.bar.hidden = true; return; }
      const sp = project(c.pos.clone().setY(c.pos.y + (CREEP_BAR_H[c.type] || 0.8) * (c.ancient ? 1.8 : 1)));
      c.bar.hidden = !sp.ok;
      if (!c.bar.hidden) {
        c.bar.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`;
        c.barFill.style.width = (Math.max(0, c.hp) / c.max * 100) + '%';
        const title = creepTitle(c); if (c.barLabel.textContent !== title) c.barLabel.textContent = title;
      }
    });
    hudT -= real;
    if (hudT <= 0) {
      hudT = 0.5;
      const elapsed = Math.max(0, uTime.value - G.runStart), tier = worldTier(), left = 120 - (elapsed % 120);
      document.getElementById('wtier').textContent = `${tier} (next in ${fmtTime(left)})`;
      document.getElementById('wenv').textContent = G.world === 'moat' ? G.env.name : `${WNAME[G.world]} \u00b7 ${G.env.name}`;
      document.getElementById('wshards').textContent = `${shardCount()} / 4 shards`;
      if (G.state !== 'dead' && G.state !== 'won') ui.obj.textContent = touchSay(objectiveText());
      document.getElementById('whunt').textContent = G.hunt ? 'now!' : `in ${fmtTime(Math.max(0, 180 - (G.huntClock || 0)))}`;
      document.getElementById('gold').textContent = PR.gold;
      document.getElementById('wasc').textContent = G.ascension ? `${G.ascension} \u00b7 edge ${G.edge} m` : 'None yet';
      document.getElementById('wmyth').textContent = mythicText();
    }
  }
  recalc(); P.hp = P.max;
