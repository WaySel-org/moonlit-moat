  // ---------- Character builder (C, the pause screen, or the bag) ----------
  // Opens by itself on the first visit, with "Enter the moat" to play straight away. While it is open the world stands
  // still (53-loop hands the frame to builderFrame) and the keyboard belongs to the builder (50-input).
  // Look changes are the player's own (HERO_KEY); gear changes equip from the armoury (PR.inv) and count for stats at once.
  const BLD = { stage: null, avatar: null, tab: 'body', first: false, pose: 'Idle_Loop', drag: null };
  const bEl = $('#builder'), bPanel = $('#bpanel'), bStats = $('#bstats'), bLoad = $('#bload'), bView = $('#bview');
  const B_POSES = [['Idle', 'Idle_Loop'], ['Arms folded', 'Idle_FoldArms_Loop'], ['Ready', 'Sword_Idle'], ['Walk', 'Walk_Loop'], ['Run', 'Jog_Fwd_Loop'], ['Combo', 'Sword_Regular_Combo'],
    ['Heavy', 'Sword_Heavy_Combo'], ['Cast', 'Spell_Simple_Shoot'], ['Shield', 'Idle_Shield_Loop'], ['Dance', 'Dance_Loop']];
  const B_TABS = [['body', 'Body'], ['face', 'Face'], ['hair', 'Hair'], ['gear', 'Gear'], ['presets', 'Presets']];
  const bEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openBuilder(first) {
    if (G.builder || G.state === 'dead' || G.state === 'won') return;
    if (G.paused) setPause(false);
    if (G.shop) closeShop();
    G.builder = true; G.shop = true; BLD.first = !!first; keys.clear();
    bEl.hidden = false; document.body.classList.add('building');
    bEl.classList.toggle('first', BLD.first);
    $('#bdone').textContent = BLD.first ? 'Enter the moat' : 'Done';
    bLoad.hidden = !!CK.kit;
    ckLoad().then(() => { if (!G.builder) return; bLoad.hidden = true; builderStage(); renderBuilder(); })
      .catch(e => { console.warn('character kit did not load', e); bLoad.textContent = 'The wardrobe could not be reached. You can play on with the hero you have.'; });
    renderBuilder();
  }
  function closeBuilder() {
    if (!G.builder) return;
    G.builder = false; G.shop = false; bEl.hidden = true; document.body.classList.remove('building');
    HERO.firstVisit = false; heroSaveLook();
    if (CK.kit) { heroAttach(); heroRefresh(); }
    saveGame(); keys.clear();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function builderStage() {
    if (!BLD.stage) BLD.stage = bsStage(renderer);
    if (!BLD.avatar) { BLD.avatar = ckAvatar(HERO.look, heroGearItems()); BLD.stage.setAvatar(BLD.avatar); }
    else { BLD.avatar.setLook(HERO.look); BLD.avatar.setGear(heroGearItems()); }
    BLD.avatar.play(BLD.pose);
  }
  function builderFrame(real) {
    if (BLD.stage && BLD.avatar) { BLD.stage.render(real); return; }
    renderer.setRenderTarget(null); renderer.setClearColor(0x07080b, 1); renderer.clear();
  }

  // ---------- Panel ----------
  const bSw = (c, on, act, v, title) => `<button type="button" class="sw${on ? ' on' : ''}" style="--c:${bEsc(c)}" data-act="${act}" data-v="${bEsc(v)}" aria-label="${bEsc(title || v)}" title="${bEsc(title || v)}"></button>`;
  const bChip = (label, on, act, v, sub) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${bEsc(v)}"><b>${bEsc(label)}</b>${sub ? `<small>${bEsc(sub)}</small>` : ''}</button>`;
  const bColorIn = (act, val) => `<label class="pick">Custom <input type="color" data-act="${act}" value="${bEsc(val)}"></label>`;
  function bStatLine(it) {
    if (!it) return '';
    const s = it.stats || {}, out = [];
    if (it.slot === 'weapon') out.push(`+${Math.round((s.dmg || 0) * 100)}% damage`);
    if (s.armor) out.push(`+${s.armor} armour`); if (s.hp) out.push(`+${s.hp} health`); if (s.st) out.push(`+${s.st} stamina`); if (s.mana) out.push(`+${s.mana} mana`);
    if (s.dmg && it.slot !== 'weapon') out.push(`+${s.dmg}% damage`); if (s.spell) out.push(`+${s.spell}% spells`); if (s.speed) out.push(`${s.speed > 0 ? '+' : ''}${s.speed}% speed`);
    if (it.note) out.push(it.note);
    return out.join(', ');
  }
  function renderBuilder() {
    const L = HERO.look, sh = L.shape || {};
    $('#btabs').innerHTML = B_TABS.map(([id, n]) => `<button type="button" role="tab" aria-selected="${BLD.tab === id}" data-tab="${id}">${n}</button>`).join('');
    let h = '';
    if (BLD.tab === 'body') {
      h += `<h3>Body</h3><div class="chips">${CK_LOOKS.bodies.map(b => bChip(b.name, L.body === b.id, 'body', b.id)).join('')}</div>`;
      h += `<h3>Skin</h3><div class="sws">${CK_LOOKS.skin.map(c => bSw(c, (L.skin || '').toLowerCase() === c, 'skin', c)).join('')}${bColorIn('skin', L.skin || '#c69c7b')}</div>`;
      h += `<h3>Shape</h3>` + CK_LOOKS.shape.map(s => `<label class="slider"><span>${bEsc(s.name)}</span><input type="range" min="0" max="100" value="${Math.round((sh[s.id] === undefined ? 0.5 : sh[s.id]) * 100)}" data-act="shape" data-v="${s.id}"></label>`).join('');
    } else if (BLD.tab === 'face') {
      h += `<h3>Eyes</h3><div class="sws">${CK_LOOKS.eyes.map(e => bSw(e.swatch, L.eyes === e.id, 'eyes', e.id, e.name)).join('')}</div>`;
      h += `<h3>Brows</h3><div class="chips">${CK_LOOKS.brows.map(b => bChip(b.name, (L.brows || 'none') === b.id, 'brows', b.id)).join('')}</div>`;
      h += `<h3>Beard</h3><div class="chips">${CK_LOOKS.beards.map(b => bChip(b.name, (L.beard || 'none') === b.id, 'beard', b.id)).join('')}</div>`;
      h += `<h3>Beard colour</h3><div class="sws">${bChip('Match hair', !L.beardColor, 'beardColor', '')}${CK_LOOKS.hairColors.map(c => bSw(c, L.beardColor === c, 'beardColor', c)).join('')}${bColorIn('beardColor', L.beardColor || L.hairColor || '#3a2416')}</div>`;
    } else if (BLD.tab === 'hair') {
      h += `<h3>Style</h3><div class="chips">${CK_LOOKS.hair.map(x => bChip(x.name, (L.hair || 'none') === x.id, 'hair', x.id)).join('')}</div>`;
      h += `<h3>Colour</h3><div class="sws">${CK_LOOKS.hairColors.map(c => bSw(c, (L.hairColor || '').toLowerCase() === c, 'hairColor', c)).join('')}${bColorIn('hairColor', L.hairColor || '#3a2416')}</div>`;
      h += `<p class="muted">Helmets and hoods hide the hair under them.</p>`;
    } else if (BLD.tab === 'gear') {
      const items = heroGearItems();
      if (GEAR_TEST) h += `<p class="note">Testing: every piece of gear is unlocked.</p>`;
      CK_GEAR.slots.forEach(slot => {
        const own = CK_GEAR.items.filter(it => it.slot === slot && heroOwns(it.id));
        const cur = items[slot];
        h += `<h3>${bEsc(CK_GEAR.slotNames[slot] || slot)}</h3><div class="chips gear">`
          + (slot !== 'weapon' ? bChip('None', !cur, 'gear:' + slot, '') : '')
          + own.map(it => bChip(it.name, cur && cur.id === it.id, 'gear:' + slot, it.id, bStatLine(it))).join('') + '</div>';
      });
    } else if (BLD.tab === 'presets') {
      h += `<p class="muted">A starting point. Everything stays editable.</p><div class="presets">` + CK_LOOKS.presets.map(p => `<button type="button" class="preset" data-act="preset" data-v="${p.id}"><b>${bEsc(p.name)}</b><small>${bEsc([CK_LOOKS.bodies.find(b => b.id === p.look.body).name, (CK_LOOKS.hair.find(x => x.id === p.look.hair) || {}).name, p.look.beard !== 'none' ? (CK_LOOKS.beards.find(b => b.id === p.look.beard) || {}).name + ' beard' : ''].filter(Boolean).join(', '))}</small></button>`).join('') + '</div>';
    }
    bPanel.innerHTML = h;
    $('#bposes').innerHTML = B_POSES.map(([n, c]) => `<button type="button" data-pose="${c}" class="${BLD.pose === c ? 'on' : ''}">${n}</button>`).join('');
    bRenderStats();
  }
  function bRenderStats() {
    bStats.innerHTML = `<span>Armour <b>${Math.round(P.armorMax)}</b></span><span>Health <b>${Math.round(P.max)}</b></span><span>Stamina <b>${Math.round(P.stMax)}</b></span>`
      + `<span>Mana <b>${Math.round(P.manaMax)}</b></span><span>Damage <b>×${PR.dmg.toFixed(2)}</b></span><span>Spells <b>×${PR.spell.toFixed(2)}</b></span><span>Speed <b>×${PR.speed.toFixed(2)}</b></span>`;
  }

  // ---------- Edits ----------
  function bLookChanged(rebuild) {
    if (BLD.avatar) { if (rebuild === 'shape') BLD.avatar.setShape(HERO.look.shape); else BLD.avatar.setLook(HERO.look); }
    heroSaveLook();
  }
  function bAct(a, v, el) {
    const L = HERO.look;
    if (a === 'body') { L.body = v; if (v === 'f' && L.brows === 'regular') L.brows = 'fine'; if (v === 'm' && L.brows === 'fine') L.brows = 'regular'; bLookChanged(); }
    else if (a === 'skin' || a === 'eyes' || a === 'brows' || a === 'beard' || a === 'hair' || a === 'hairColor' || a === 'beardColor') { L[a] = v || undefined; if (!v) delete L[a]; bLookChanged(); }
    else if (a === 'shape') { L.shape = Object.assign({}, L.shape, { [v]: el.value / 100 }); bLookChanged('shape'); return; }
    else if (a.startsWith('gear:')) { heroEquip(a.slice(5), v || null); if (BLD.avatar) BLD.avatar.setGear(heroGearItems()); }
    else if (a === 'preset') {
      const p = CK_LOOKS.presets.find(x => x.id === v); if (!p) return;
      HERO.look = JSON.parse(JSON.stringify(p.look)); bLookChanged();
      Object.entries(p.gear).forEach(([s, id]) => { if (!id || heroOwns(id)) heroEquip(s, id); });
      if (BLD.avatar) BLD.avatar.setGear(heroGearItems());
    }
    renderBuilder();
  }
  function bRandomize() {
    const pick = a => a[Math.floor(Math.random() * a.length)], body = Math.random() < 0.5 ? 'm' : 'f';
    const hairs = CK_LOOKS.hair.map(h => h.id), hc = pick(CK_LOOKS.hairColors);
    HERO.look = {
      body, skin: pick(CK_LOOKS.skin.slice(0, 8)), hair: pick(hairs), hairColor: hc, eyes: pick(CK_LOOKS.eyes).id,
      brows: body === 'm' ? 'regular' : 'fine', beard: body === 'm' && Math.random() < 0.7 ? pick(CK_LOOKS.beards.slice(1)).id : 'none',
      shape: Object.fromEntries(CK_LOOKS.shape.map(s => [s.id, 0.25 + Math.random() * 0.5]))
    };
    bLookChanged();
    CK_GEAR.slots.forEach(slot => {
      const own = CK_GEAR.items.filter(it => it.slot === slot && heroOwns(it.id));
      if (own.length && (slot === 'weapon' || Math.random() < 0.75)) heroEquip(slot, pick(own).id); else if (slot !== 'weapon') heroEquip(slot, null);
    });
    if (BLD.avatar) BLD.avatar.setGear(heroGearItems());
    renderBuilder();
  }

  $('#btabs').addEventListener('click', ev => { const b = ev.target.closest('[data-tab]'); if (!b) return; BLD.tab = b.dataset.tab; renderBuilder(); if (BLD.stage) BLD.stage.shot(BLD.tab === 'face' || BLD.tab === 'hair' ? 'face' : 'body'); });
  bPanel.addEventListener('click', ev => { const b = ev.target.closest('button[data-act]'); if (b) bAct(b.dataset.act, b.dataset.v, b); });
  bPanel.addEventListener('input', ev => { const t = ev.target; if (!t.dataset.act) return; if (t.type === 'range') bAct('shape', t.dataset.v, t); else if (t.type === 'color') { HERO.look[t.dataset.act] = t.value; bLookChanged(); } });
  bPanel.addEventListener('change', ev => { if (ev.target.type === 'color') renderBuilder(); });
  $('#bposes').addEventListener('click', ev => { const b = ev.target.closest('[data-pose]'); if (!b) return; BLD.pose = b.dataset.pose; if (BLD.avatar) BLD.avatar.play(BLD.pose, { restart: true }); renderBuilder(); });
  $('#bcams').addEventListener('click', ev => { const b = ev.target.closest('[data-shot]'); if (b && BLD.stage) BLD.stage.shot(b.dataset.shot); });
  $('#brandom').addEventListener('click', bRandomize);
  $('#bdone').addEventListener('click', closeBuilder);
  // Turn the hero by dragging the stage; the wheel or a pinch zooms
  bView.addEventListener('pointerdown', ev => { BLD.drag = { x: ev.clientX, y: ev.clientY }; bView.setPointerCapture(ev.pointerId); });
  bView.addEventListener('pointermove', ev => {
    if (!BLD.drag || !BLD.stage) return;
    const s = BLD.stage; s.want = null;
    s.yaw -= (ev.clientX - BLD.drag.x) * 0.01; s.pitch = clamp(s.pitch + (ev.clientY - BLD.drag.y) * 0.004, -0.2, 0.6);
    BLD.drag = { x: ev.clientX, y: ev.clientY };
  });
  bView.addEventListener('pointerup', () => { BLD.drag = null; });
  bView.addEventListener('pointercancel', () => { BLD.drag = null; });
  bView.addEventListener('wheel', ev => { if (!BLD.stage) return; ev.preventDefault(); const s = BLD.stage; s.want = null; s.dist = clamp(s.dist * (1 + ev.deltaY * 0.001), 1.0, 7); s.target.y = clamp(s.target.y - ev.deltaY * 0.0006, 0.4, 1.7); }, { passive: false });
  $('#bopen') && $('#bopen').addEventListener('click', () => { setPause(false); openBuilder(); });

  // ---------- Start: load the kit after the first frame, then swap in the hero (or open the builder on a first visit) ----------
  if (!/nobuilder/.test(location.hash)) {
    if (HERO.firstVisit) openBuilder(true);
    setTimeout(() => ckLoad().then(() => {
      if (!BLD.stage) BLD.stage = bsStage(renderer); // also makes the environment the hero's metal reflects
      wardenAttach();
      if (!G.builder) { heroAttach(); heroRefresh(); }
    }).catch(e => console.warn('Moonlit Moat: the character kit did not load; keeping the block figure', e)), 50);
  }
