  // ---------- Player actions ----------
  const COST = { light: 13, heavy: 28, roll: 22, rollslash: 14, rollcleave: 26 };
  // Stamina costs shrink 3% a level, down to 60% at level 14
  const stCost = c => c * Math.max(0.6, 1 - 0.03 * (PR.level - 1));
  function request(name) { P.buffer = name; P.bufferT = 0.3; }
  function startAct(name) {
    if (G.state === 'dead' || G.state === 'won') return false;
    if (COST[name] && P.st <= 0) return false;
    if (P.jh > 0) return name === 'light' || name === 'heavy' ? airAttack(name) : false;
    P.act = name; P.actT = 0; P.hitDone = false;
    if ((name === 'light' || name === 'heavy') && P.mount) return beastAttack(name);
    if (name === 'light') { P.actDur = P.combo === 2 ? 0.46 : 0.32; sfx('swing'); }
    else if (name === 'heavy') { P.actDur = 0.68; P.combo = 0; }
    else if (name === 'roll') {
      P.actDur = 0.42; P.iframe = 0.3; P.combo = 0; P.flowed = false; sfx('roll');
      const mv = moveInput();
      P.rollDir.copy(mv.lengthSq() > 0 ? mv.normalize() : fwdOf(P.facing));
      P.facing = Math.atan2(P.rollDir.x, P.rollDir.z);
    }
    else if (name === 'drink') { P.actDur = 0.95; P.healed = false; P.combo = 0; }
    else if (name === 'cast') { P.actDur = 0.45; P.mana -= boltCost(); P.combo = 0; sfx('cast'); }
    else if (isMp(name)) { if (!startMountPower(name)) { P.act = null; return false; } return true; }
    else if (name === 'throw') { P.actDur = 0.28; P.st -= stCost(10); P.stDelay = 0.5; P.cd.z = 0.45; P.combo = 0; sfx('swing'); }
    else if (name === 'volley') { P.actDur = 0.5; P.mana -= 50; P.cd.v = volleyCd(); P.combo = 0; sfx('cast'); }
    else if (name === 'leap') { if (!planLeap()) { P.act = null; return false; } P.actDur = 0.75; P.mana -= 25; P.cd.x = 6; P.iframe = 0.8; P.combo = 0; P.kb.set(0, 0, 0); sfx('roar'); }
    else if (name === 'spin' || name === 'rollslash' || name === 'rollcleave' || name === 'trample') startKit(name);
    if (COST[name]) { const cost = name === 'roll' && relicHas('step') ? COST.roll - 10 : COST[name]; P.st -= stCost(cost) * (name === 'roll' && P.buffAgi > 0 ? 0.5 : 1); P.stDelay = 0.5; }
    return true;
  }
