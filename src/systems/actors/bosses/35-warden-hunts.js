  // ---------- Warden hunts: every three minutes it comes for you ----------
  function startHunt(echo) {
    G.huntClock = 0;
    G.hunt = { t: 45, echo, prev: G.state };
    const tier = worldTier(), rv = G.wardenRevives || 0, m = tierMult(tier) * (1 + 0.35 * rv);
    B.max = Math.round(1500 * m); B.hp = B.max; B.phase = 1; B.poise = 100; B.spin = 0; B.atk = null;
    G.dmgMult = (1.35 + 0.2 * (tier - 1)) * (1 + 0.15 * rv); G.bossTier = tier + 2 * rv;
    bBody.rotation.set(0, 0, 0); bBody.position.y = 0; wPivot.rotation.set(1, 0, 0); boss.visible = true;
    ui.bname.textContent = `The Gate Warden${rv ? ', risen' : ''} \u00b7 Lv ${tier + 2 + 2 * rv}`;
    B.from.copy(boss.position); if (echo) B.from.y = 18;
    B.to.copy(player.position).addScaledVector(fwdOf(Math.random() * TAU), 6); B.to.y = 0; clampArena(B.to, -78);
    G.state = 'intro'; B.state = 'leap'; B.t = 0; B.dur = 1.6;
    sfx('roar');
    showBanner(rv ? 'The Warden rises again' : 'The Warden hunts you', rv ? `Defeated ${rv} time${rv > 1 ? 's' : ''}, it has come back stronger. Survive 45 seconds, outrun it, or bring it down.` : 'Survive 45 seconds, outrun it, or bring it down.', 'title');
    bannerTimer = 3; ui.hud.hidden = true;
  }
  function endHunt() {
    const echo = G.hunt.echo;
    G.state = G.hunt.prev; G.hunt = null; G.lock = false; G.target = null; G.dmgMult = 1;
    B.atk = null; hideTele(); B.spin = 0; B.state = 'retreat'; B.t = 0; B.dur = 1.8; B.echoGone = echo;
    B.from.copy(boss.position); B.to.copy(echo ? boss.position.clone().setY(30) : PERCH);
    waves.forEach(w => { scene.remove(w.m); w.m.material.dispose(); }); waves.length = 0;
    ui.bossbar.hidden = true; ui.hud.hidden = false; sfx('roar');
    floatText(echo ? 'The Warden sinks back into the earth' : 'The Warden withdraws to its gate', player.position.clone().add(new THREE.Vector3(0, 3, 0)), 'word', '#ffd36a');
  }
  function updateHunt(dt) {
    if (G.hunt) {
      if (G.state === 'fight' && B.state !== 'dead') { G.hunt.t -= dt; if (G.hunt.t <= 0) endHunt(); }
      return;
    }
    G.huntClock = (G.huntClock || 0) + dt;
    if (G.huntClock < 180) return;
    if (G.realm !== 'material') return;
    if (G.state === 'explore' && B.state === 'perch') startHunt(false);
    else if (G.state === 'interlude' && G.wardenDown && (B.state === 'dead' || B.state === 'perch')) startHunt(true);
  }
