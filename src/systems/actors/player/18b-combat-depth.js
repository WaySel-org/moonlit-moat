  // ---------- Combat depth: crits, backstabs, Flow, Riposte, Rend and poison ----------
  // Every player hit goes through strike(). It reads the hero's state and the target's and multiplies the base damage:
  //  - Crit: 5% + 1.5% per Agility (+ relics), x1.6. Any strike landed in Flow crits.
  //  - Backstab: a melee hit from behind a creep, x1.35 (+ relics). Bosses and spells never backstab.
  //  - Riposte: the first strike within 2 s of a parry, x2.
  //  - Rend: heavy hits make creeps and the Warden bleed, up to three stacks for four seconds.
  // Flow is the reward for a perfect dodge (an attack that would have landed during a roll): 2.5 s of
  // doubled stamina regen and guaranteed crits. Poison, from a Fen Stalker's bite, ticks through armour
  // and is cured by a flask.
  const critChance = () => 0.05 + 0.015 * PR.agi + relicBonus('crit');
  const FLOW_TIME = 2.5, RIPOSTE_TIME = 2.0, REND_TIME = 4, REND_MAX = 3;
  function facingOf(t) { return t.isWarden ? B.facing : t.isCreep ? t.facing : null; }
  // True when the hero stands behind a foe that has a facing
  function behindTarget(t) {
    const f = facingOf(t);
    if (f === null || f === undefined) return false;
    return Math.abs(angDiff(f, yawTo(t.pos, player.position))) > 2.3;
  }
  function strike(t, dmg, poise, heavy, opts) {
    opts = opts || {};
    let mult = 1; const words = [];
    const at = t.pos.clone().add(new THREE.Vector3(0, t.hitY + 1.1, 0));
    if (!opts.spell && t.isCreep && behindTarget(t)) { mult *= 1.35 + relicBonus('backstab'); words.push(['backstab', '#ffd36a']); }
    if (P.riposte > 0 && !opts.spell) { P.riposte = 0; mult *= 2; words.push(['RIPOSTE', '#ff9a4a']); }
    const crit = P.flow > 0 || Math.random() < critChance();
    if (crit) { mult *= 1.6; words.push(['CRIT', '#ffe03a']); }
    const out = dmg * mult;
    damageEnemy(t, out, poise, heavy || crit);
    words.forEach(([w, c], i) => floatText(w, at.clone().add(new THREE.Vector3(0, 0.55 * i, 0)), 'word', c));
    if (heavy) {
      applyRend(t, 1);
      if (relicHas('leech')) healHero(Math.round(out * 0.06), '#4dff6a');
    } else if (!opts.spell && relicHas('fang') && Math.random() < 0.3) applyRend(t, 1);
  }
  function healHero(n, col) {
    if (n <= 0 || P.hp <= 0) return;
    const before = P.hp; P.hp = Math.min(P.max, P.hp + n);
    if (P.hp > before) floatText(`+${Math.round(P.hp - before)}`, player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), '', col || '#4dff6a');
  }
  // Rend: bleed stacks on a creep or the Warden; the state lives on the target
  function applyRend(t, stacks) {
    if (!(t.isCreep || t.isWarden)) return;
    const had = t.rend || 0;
    t.rend = Math.min(REND_MAX, had + stacks); t.rendT = REND_TIME; if (t.rendTick === undefined) t.rendTick = 0;
    if (!had) floatText('REND', t.pos.clone().add(new THREE.Vector3(0, t.hitY + 0.6, 0)), 'word', '#ff6a4a');
  }
  function tickRendOn(t, dt, hp, setHp, onDeath) {
    if (!t.rend) return;
    t.rendT -= dt; t.rendTick += dt;
    if (t.rendTick >= 0.5) {
      t.rendTick -= 0.5;
      const d = Math.round(5 * PR.dmg * t.rend * (0.9 + Math.random() * 0.2));
      setHp(Math.max(0, hp() - d));
      floatText(String(d), t.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, t.hitY + 0.4, 0)), '', '#ff6a4a');
      if (hp() <= 0) { t.rend = 0; onDeath(); return; }
    }
    if (t.rendT <= 0) t.rend = 0;
  }
  function updateRend(dt) {
    if (dt <= 0) return;
    const rk = realmKey();
    creeps.forEach(c => { if (c.alive && c.realm === rk) tickRendOn(c, dt, () => c.hp, v => { c.hp = v; }, () => killCreep(c)); });
    if (G.world === 'moat' && HITTABLE.includes(B.state)) tickRendOn(WARDEN, dt, () => B.hp, v => { B.hp = v; B.flash = Math.max(B.flash, 0.5); }, () => killBoss());
  }
  // The hero's own timers: Flow, Riposte, poison, and the calm that lets Stone Skin regrow armour
  function poisonHero(dmgPerTick, secs) {
    if (P.hp <= 0) return;
    const fresh = P.poison <= 0;
    P.poison = Math.max(P.poison, secs); P.poisonDmg = Math.max(fresh ? 0 : P.poisonDmg, dmgPerTick); P.poisonTick = fresh ? 0.5 : P.poisonTick;
    if (fresh) floatText('POISONED', player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 'word', '#7fdc5a');
  }
  function updateStatus(dt) {
    if (dt <= 0 || P.act === 'dead') return;
    P.flow = Math.max(0, P.flow - dt); P.riposte = Math.max(0, P.riposte - dt);
    P.calm += dt;
    if (P.poison > 0) {
      P.poison -= dt; P.poisonTick -= dt;
      if (P.poisonTick <= 0) {
        P.poisonTick = 0.5;
        const d = Math.round(P.poisonDmg);
        P.hp = Math.max(0, P.hp - d);
        floatText(String(d), player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 2, 0)), 'hurt', '#7fdc5a');
        if (P.hp <= 0 && G.state !== 'dead') { P.poison = 0; if (G.realm === 'spirit') forceReturn(); else killPlayer(); }
      }
      if (P.poison <= 0) P.poison = 0;
    }
    if (relicHas('skin') && P.calm > 5 && P.armor < P.armorMax) P.armor = Math.min(P.armorMax, P.armor + 3 * dt);
  }
