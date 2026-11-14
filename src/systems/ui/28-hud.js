  // ---------- HUD: prompt, skill bar, creep health, world tier ----------
  const campClock = $('#campclock');
  const hudSkills = Object.fromEntries(['z', 'c', 'v', 'x', 'g', 'h'].map(key => {
    const el = $('#sk_' + key), touch = $('#t_' + key);
    return [key, { el, label: el.querySelector('span'), fill: el.lastElementChild, touch, touchLabel: touch?.querySelector('span') }];
  }));
  const mountSkillSlots = [['z', 'mp3'], ['c', 'mp1'], ['v', 'mp4'], ['x', 'mp2']];
  function setHudText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }
  function showSkill(key, locked, cdFrac, needMana) {
    const { el, fill, touch } = hudSkills[key];
    const unavailable = locked || needMana;
    el.classList.toggle('locked', unavailable);
    const percent = locked ? 0 : clamp(cdFrac, 0, 1) * 100;
    const height = percent + '%';
    if (fill.style.height !== height) fill.style.height = height;
    touchSkill(touch, unavailable, Math.round(percent) + '%');
  }
  function labelSkill(key, text) {
    const { label, touchLabel } = hudSkills[key];
    setHudText(label, text);
    if (touchLabel) setHudText(touchLabel, text);
  }
  let hudT = 0;
  function updateHud(real) {
    updateStatusStrip(real);
    if (campClock) setHudText(campClock, `Camps restock ${fmtTime(Math.max(0, G.campClock))}`);
    const it = G.shop ? null : nearestInteract();
    let prompt = '';
    if (it) prompt = it.kind === 'chest' ? `${keyLabel('KeyE')} \u00b7 Open ${CHEST_TIERS[it.c.tier].name.toLowerCase()} chest`
      : it.kind === 'gate' ? `${keyLabel('KeyE')} \u00b7 Challenge the Gate Warden (Lv ${worldTier() + 2}). Recommended: level ${worldTier() + 4}, you are ${PR.level}`
      : it.kind === 'beast' ? (PR.level >= BEAST_TYPES[it.b.type].level ? `${keyLabel('KeyE')} \u00b7 Ride the ${BEAST_TYPES[it.b.type].name}` : `Ride the ${BEAST_TYPES[it.b.type].name} at level ${BEAST_TYPES[it.b.type].level} (you are ${PR.level})`)
      : it.kind === 'dismount' ? `${keyLabel('KeyE')} \u00b7 Dismount the ${BEAST_TYPES[P.mount.type].name}`
      : it.kind === 'wgate' ? `${keyLabel('KeyE')} \u00b7 World Gate: travel between worlds`
      : it.kind === 'survivor' ? (G.story.unlocked.ash ? `${keyLabel('KeyE')} \u00b7 Lead the survivor to safety` : 'The survivor is too frightened to move. Ashfall is still sealed.')
      : `${keyLabel('KeyE')} \u00b7 Moon Shrine`;
    else if (!G.shop && G.world !== 'moat') prompt = worldPrompt();
    else if (!G.shop) {
      const nr = nearestRift();
      if (nr.d < 4) prompt = G.realm === 'spirit' ? `${keyLabel('KeyQ')} \u00b7 Return through the Veil Rift` : `${keyLabel('KeyQ')} \u00b7 Step into the Spirit Realm (${keyLabel('KeyQ')} works anywhere)`;
    }
    if (ui.prompt.hidden !== !prompt) ui.prompt.hidden = !prompt;
    if (prompt) setHudText(ui.prompt, touchSay(prompt));
    drawMinimap(real);
    if (SHRINE.crystal) { SHRINE.crystal.rotation.y += real * 1.2; SHRINE.crystal.position.y = 2.6 + Math.sin(uTime.value * 1.8) * 0.12; }
    const mpw = P.mount ? MOUNT_POWERS[P.mount.type] : null;
    // Riding, Y U I O show the beast's skills; on foot, the spells and their rank
    if (mpw) mountSkillSlots.forEach(([id, s]) => { const w = mpw[s]; labelSkill(id, w.short); showSkill(id, false, P.cd[s] / w.cd, P.mana < w.mana); });
    else {
      labelSkill('z', rankName('Dagger')); labelSkill('c', rankName('Bolt')); labelSkill('v', rankName('Volley')); labelSkill('x', 'Leap');
      showSkill('z', false, P.cd.z / 0.45, P.st < 6);
      showSkill('c', false, 0, P.mana < boltCost());
      showSkill('v', PR.level < 3, P.cd.v / volleyCd(), P.mana < 50);
      showSkill('x', !PR.warden, P.cd.x / 6, P.mana < 25);
    }
    showSkill('g', PR.level < HOOK_LV || !!P.mount, P.cd.g / HOOK_CD, P.mana < HOOK_MANA);
    showSkill('h', PR.level < SPIN_LV || !!P.mount, P.cd.h / SPIN_CD, P.mana < SPIN_MANA);
    const realm = realmKey();
    creeps.forEach(c => {
      if (!c.alive || c.realm !== realm || flatDist(c.pos, player.position) > (c.ancient || c.mythic || c.ai === 'godling' ? 34 : 22)) { if (!c.bar.hidden) c.bar.hidden = true; return; }
      const sp = project(c.pos.clone().setY(c.pos.y + (CREEP_BAR_H[c.type] || 0.8) * (c.ancient ? 1.8 : 1)));
      if (c.bar.hidden === sp.ok) c.bar.hidden = !sp.ok;
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
