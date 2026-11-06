  // ---------- Hero avatar: the built character in place of the block figure ----------
  // The look (body, skin, hair, beard, eyes, shape) is the player's and lives in its own save (HERO_KEY), so a new game
  // keeps it. Equipped gear lives in PR.inv.gear with the rest of the progress; the weapon is PR.inv.sword (its .model).
  // The armoury is every gear id the hero owns; content/character/gear.json "testing.unlockAll" puts everything in it.
  // The block figure plays until the kit has loaded (it loads after the game starts, outside the first-load budget).
  const HERO_KEY = 'moonlit-moat.hero.v1';
  const HERO = { look: null, avatar: null, ready: false, firstVisit: false, lastActT: 0, wasAir: false, flash: 0 };
  const GEAR_BY_ID = Object.fromEntries(CK_GEAR.items.map(it => [it.id, it]));
  const GEAR_SLOTS = CK_GEAR.slots.filter(s => s !== 'weapon');
  const GEAR_TEST = !!(CK_GEAR.testing && CK_GEAR.testing.unlockAll) || /allgear/.test(location.hash);
  // Swords by name, for blades in older saves (before every sword carried its model): the old forged swords map onto
  // the modelled ones that replaced them
  const SWORD_MODEL = {
    'Moatwatch Longsword': 'moatwatch', 'Night Needle': 'night-needle', 'Tidecutter': 'tidecutter', 'Hollowfang': 'hollowfang', 'Wyrmbane, the Monster-Breaker': 'wyrmbane',
    'Iron Sword': 'moatwatch', 'Steel Longsword': 'moatwatch', 'Gale Cutter': 'night-needle', 'Leech Fang': 'tidecutter', 'Ember Saber': 'hollowfang',
    'Starforged Blade': 'hollowfang', 'Gravesteel': 'wyrmbane', "Moat Knight's Greatsword": 'wyrmbane'
  };
  const STARTER_WEAPON = 'moatwatch';
  const STARTER_GEAR = { head: null, chest: 'ranger-tunic', hands: 'ranger-bracers', legs: 'ranger-breeches', feet: 'ranger-boots', back: 'wanderer-scarf', offhand: 'moon-lantern' };

  (function heroLoadLook() {
    try { HERO.look = JSON.parse(localStorage.getItem(HERO_KEY) || 'null'); } catch (e) { HERO.look = null; }
    HERO.firstVisit = !HERO.look;
    if (!HERO.look) HERO.look = JSON.parse(JSON.stringify((CK_LOOKS.presets[0] || {}).look || { body: 'f' }));
  })();
  function heroSaveLook() { try { localStorage.setItem(HERO_KEY, JSON.stringify(HERO.look)); } catch (e) { /* private mode: the look lasts this visit */ } }

  // ---------- Armoury and gear stats (used by the arsenal's applyGear) ----------
  function heroInvDefaults() {
    if (!PR.inv.gear) PR.inv.gear = Object.assign({}, STARTER_GEAR);
    if (!PR.inv.armoury) PR.inv.armoury = Object.values(STARTER_GEAR).filter(Boolean).concat([STARTER_WEAPON]);
    PR.inv.armoury = PR.inv.armoury.filter(id => GEAR_BY_ID[id]); // drops ids of retired gear (the old forged swords)
    if (GEAR_TEST) PR.inv.armoury = CK_GEAR.items.map(i => i.id);
    GEAR_SLOTS.forEach(s => { if (!(s in PR.inv.gear)) PR.inv.gear[s] = null; });
  }
  // Trophies join the armoury when their foe falls (the Warden's set once PR.warden is earned)
  const heroOwns = id => GEAR_TEST || (PR.inv.armoury || []).includes(id) || (GEAR_BY_ID[id] && GEAR_BY_ID[id].trophy === 'warden' && PR.warden);
  function heroWeaponId() {
    const s = PR.inv && PR.inv.sword; if (!s) return STARTER_WEAPON;
    if (!GEAR_BY_ID[s.model]) s.model = SWORD_MODEL[s.name] || STARTER_WEAPON; // older saves
    return s.model;
  }
  // Sword range multiplier (Wyrmbane reaches further than a longsword)
  function heroReach() { const it = PR.inv && GEAR_BY_ID[heroWeaponId()]; return (it && it.stats && it.stats.reach) || 1; }
  // Equipped items by slot, weapon included, as catalogue entries
  function heroGearItems() {
    heroInvDefaults();
    const out = {};
    GEAR_SLOTS.forEach(s => { out[s] = GEAR_BY_ID[PR.inv.gear[s]] || null; });
    out.weapon = GEAR_BY_ID[heroWeaponId()] || GEAR_BY_ID[STARTER_WEAPON];
    return out;
  }
  // Sum of a stat over worn armour (not the weapon: its damage runs through the sword item, as before)
  function heroGearStat(k) {
    if (!PR.inv) return 0;
    heroInvDefaults();
    return GEAR_SLOTS.reduce((s, sl) => { const it = GEAR_BY_ID[PR.inv.gear[sl]]; return s + (it && it.stats && it.stats[k] || 0); }, 0)
      + (k !== 'dmg' ? ((GEAR_BY_ID[heroWeaponId()] || {}).stats || {})[k] || 0 : 0);
  }
  function heroEquip(slot, id) {
    heroInvDefaults();
    if (id && !heroOwns(id)) return;
    if (slot === 'weapon') {
      const it = GEAR_BY_ID[id]; if (!it) return;
      const cur = PR.inv.sword;
      if (heroWeaponId() !== id) {
        // The old blade goes to the bag if it carries rank or a rolled bonus; catalogue blades come back from the armoury
        if (cur && (cur.rank || !SWORD_MODEL[cur.name] || cur.dmg !== ((GEAR_BY_ID[heroWeaponId()] || {}).stats || {}).dmg)) { const k = PR.inv.bag.indexOf(null); if (k >= 0 && (cur.rank || cur.kills)) PR.inv.bag[k] = cur; }
        PR.inv.sword = { kind: 'sword', name: it.name, dmg: (it.stats && it.stats.dmg) || 0, rank: 0, kills: 0, affix: it.affix || null, note: it.note || '', model: id };
      }
    } else PR.inv.gear[slot] = id || null;
    recalc(); renderGear(); heroRefresh();
  }
  // A drop can be a piece of gear for the armoury (when the armoury isn't already full for testing)
  function heroGearDrop(at, q) {
    if (GEAR_TEST) return false;
    const want = Math.min(4, worldTier() + q);
    const pool = CK_GEAR.items.filter(it => it.slot !== 'weapon' && !it.trophy && (it.tier || 0) <= want && !heroOwns(it.id));
    if (!pool.length) return false;
    const it = pool[Math.floor(Math.random() * pool.length)];
    PR.inv.armoury.push(it.id); sfx('pickup');
    floatText(`Found ${it.name}: wear it in the character screen (${tipKey('KeyC', 'C')})`, (at || player.position).clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#9fe8ff');
    return true;
  }

  // ---------- The avatar in the world ----------
  function heroRefresh() {
    if (!HERO.ready) return;
    HERO.avatar.setLook(HERO.look);
    HERO.avatar.setGear(heroGearItems());
    heroMask();
  }
  // Skinned meshes need their own mask pass (three r128 compiles one shader per material); rigid gear and cloth use the plain one
  function heroMask() {
    HERO.avatar.root.traverse(o => {
      if (!o.isMesh) return;
      if (o.isSkinnedMesh) o.layers.enable(3); else o.layers.enable(1);
    });
  }
  function heroAttach() {
    if (HERO.ready || !CK.kit) return;
    HERO.avatar = ckAvatar(HERO.look, heroGearItems());
    // Hide the block figure but keep the sword pivot, the lantern light and every hook other files use
    pBody.children.forEach(c => { if (c !== swordPivot && !c.isLight) c.visible = false; });
    swordPivot.visible = false;
    pBody.add(HERO.avatar.root);
    HERO.avatar.onAsync = heroMask; // sword models arrive a moment after the rest
    HERO.ready = true; heroMask();
    HERO.avatar.play('Idle_Loop');
  }

  // Player state -> clip. One-shots are stretched to the game's own durations, so the timing of every hit is unchanged.
  function heroClip(moving) {
    const A = HERO.avatar, off = PR.inv && PR.inv.gear && PR.inv.gear.offhand, shield = /shield/.test(off || ''), fight = G.state !== 'explore' || G.lock;
    if (P.act === 'dead') return ['Death01', { once: true, fade: 0.2 }];
    if (P.mount) {
      if (P.act === 'trample' || (P.act === 'gore' && P.gore !== 'claw')) return ['Sword_Attack', { once: true, dur: P.actDur }];
      if (P.act && P.act !== 'tame' && P.actDur) return [P.claw % 2 ? 'Sword_Regular_B' : 'Sword_Regular_A', { once: true, dur: P.actDur }];
      return ['Sitting_Idle_Loop', {}];
    }
    switch (P.act) {
      case 'light': return [['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'][Math.min(2, P.combo)], { once: true, dur: P.actDur }];
      case 'heavy': return ['Sword_Attack', { once: true, dur: P.actDur }];
      case 'roll': return ['Roll', { once: true, dur: P.actDur, fade: 0.05 }];
      case 'rollslash': return ['Sword_Dash', { once: true, dur: P.actDur }];
      case 'rollcleave': return ['Sword_Regular_C', { once: true, dur: P.actDur }];
      case 'spin': return ['Sword_Regular_C', { speed: 1.6 }];
      case 'cast': case 'volley': return ['Spell_Simple_Shoot', { once: true, dur: P.actDur }];
      case 'throw': return ['OverhandThrow', { once: true, dur: P.actDur }];
      case 'drink': return ['Consume', { once: true, dur: P.actDur }];
      case 'tame': return ['Interact', {}];
      case 'leap': return ['NinjaJump_Idle_Loop', {}];
      case 'airslash': return ['Sword_Regular_C', { once: true, dur: P.actDur }];
      case 'plunge': return ['Sword_Attack', { once: true, dur: 0.5, from: 0.3 }];
      case 'land': return ['NinjaJump_Land', { once: true, dur: P.actDur }];
      case 'hurt': return ['Hit_Chest', { once: true, dur: Math.max(0.2, P.actDur), fade: 0.05 }];
    }
    if (P.act && A.actions && CK.clips.Sword_Attack) return ['Sword_Attack', { once: true, dur: P.actDur || 0.5 }];
    if (P.block) return shield ? ['Idle_Shield_Loop', {}] : ['Sword_Block', { once: true, fade: 0.08 }];
    if (P.jh > 0) return [P.jv > 0 ? 'Jump_Start' : 'Jump_Loop', P.jv > 0 ? { once: true, dur: 0.45 } : {}];
    if (moving) return [P.buffAgi > 0 || PR.speed > 1.25 ? 'Sprint_Loop' : 'Jog_Fwd_Loop', { speed: Math.max(0.8, Math.min(1.4, PR.speed)) }];
    if (fight) return [shield ? 'Idle_Shield_Loop' : 'Sword_Idle', {}];
    return [off === 'moon-lantern' ? 'Idle_Lantern_Loop' : 'Idle_Loop', {}];
  }

  const _hp = new THREE.Vector3();
  function heroAvatarUpdate(dt, moving) {
    if (!HERO.ready) return;
    const A = HERO.avatar, [name, o] = heroClip(moving);
    // Restart a one-shot when the same act begins again (P.actT went back to 0)
    o.restart = name === A.curName && o.once && P.actT < HERO.lastActT;
    A.play(name, o);
    HERO.lastActT = P.actT;
    A.mixer.timeScale = P.stone > 0 ? 0 : 1;
    // The clips animate rolls, leaps and falls; cancel the block figure's whole-body flips (air spins stay)
    if (!P.mount) { pBody.rotation.x = 0; if (P.act !== 'roll') pBody.position.y = 0; }
    if (P.act === 'roll') pBody.position.y = 0;
    A.update(dt, { wind: G.env && G.env.name === 'Ember Storm' ? 0.9 : 0.35 });
    // The lantern light follows the lantern in hand, or rides at the hip if the hand holds something else
    if (A.lanternAt) { A.lanternAt.getWorldPosition(_hp); pBody.worldToLocal(_hp); lantern.position.copy(_hp); lanternLight.position.copy(_hp); }
    else { lantern.position.set(0.3, 0.95, 0.05); lanternLight.position.set(0.3, 0.95, 0.05); }
    // Strike flash on the blade, hurt flash and stone on everything
    const swing = /^Sword_|^Melee/.test(A.curName) && P.act && P.act !== 'hurt';
    HERO.flash += ((swing ? 1 : 0) - HERO.flash) * Math.min(1, dt * 14);
    (A.weaponMats || []).forEach(m => m.emissive.setRGB(HERO.flash * 0.35, HERO.flash * 0.4, HERO.flash * 0.45));
    const hurt = P.act === 'hurt' ? 0.6 : 0, stone = P.stone > 0;
    A.mats.forEach(m => {
      if (!m.userData.base) return;
      if (m.emissive && !(A.weaponMats || []).includes(m)) m.emissive.setRGB(hurt, 0, 0);
      if (stone) m.color.setRGB(0.55, 0.55, 0.52); else m.color.copy(m.userData.base);
    });
  }
