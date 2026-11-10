  // ---------- Her moves: Slide Slash and Moonhook ----------
  // Slide: tap a direction twice inside 0.25 s and she slides about 3.5 m that way (camera-relative), still facing a
  // locked target. No i-frames and light stamina: it repositions around a foe, the roll is the escape. J during the slide
  // or 0.25 s after it is a Slide Slash (a sweeping cut along the path), K a Slide Cut (heavier, ends facing the foe).
  // Moonhook (G, level 8): she throws a moonlit tether up to 15 m. A hit yanks her to the target and she lands three fast
  // slashes; the third stuns ordinary foes for 1.5 s and staggers bosses (a heavy hit). A miss snaps back and still
  // spends the mana and cooldown, so aim matters.
  // Her GLB has no clips for these yet: HER_STAND_IN lends her existing ones until clips with these act names
  // (slide, slideslash, slidecut, hookthrow, hookzip, hookback, hookflurry1-3) are added to moonlit-her.glb.
  const SLIDE_COST = 8, HOOK_LV = 8, HOOK_MANA = 30, HOOK_CD = 10, HOOK_RANGE = 15;
  const HER_MOVES = new Set(['slide', 'slideslash', 'slidecut', 'hookthrow', 'hookzip', 'hookback', 'hookflurry']);
  const HER_STAND_IN = { slide: 'dodge', slideslash: 'rollslash', slidecut: 'heavy', hookthrow: 'throw', hookzip: 'stab', hookback: 'throw' };
  const HOOK_HITS = [[24, 14], [24, 14], [42, 60]]; // damage and poise of the three flurry slashes
  Object.assign(P, { slideDir: new THREE.Vector3(), slideWin: 0, hook: null, flurryN: 0 });
  Object.assign(COST, { slide: SLIDE_COST, slideslash: 10, slidecut: 18 });

  // Double-tap detection, fed by the keydown handler with default codes; a toggle in the pause menu turns it off
  let slideTap = true, tapCode = '', tapAt = 0;
  try { slideTap = localStorage.getItem('mm-dtap') !== '0'; } catch (e) { /* storage blocked: on */ }
  function setSlideTap(on) { slideTap = on; try { localStorage.setItem('mm-dtap', on ? '1' : '0'); } catch (e) { /* private mode */ } }
  const TAP_DIR = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  function dirTap(code) {
    if (!TAP_DIR[code] || !slideTap || P.mount) return;
    const now = performance.now();
    if (code !== tapCode || now - tapAt > 250) { tapCode = code; tapAt = now; return; }
    tapCode = '';
    const [r, f] = TAP_DIR[code];
    P.slideDir.set(-Math.sin(yaw) * f + Math.cos(yaw) * r, 0, -Math.cos(yaw) * f - Math.sin(yaw) * r).normalize();
    request('slide');
  }
  // J or K during a slide or just after it
  function slideFollow(name) {
    if ((name !== 'light' && name !== 'heavy') || P.mount || P.jh > 0 || P.st <= 0) return null;
    if (!(P.act === 'slide' && P.actT > 0.06) && !(P.act === null && P.slideWin > 0)) return null;
    return name === 'light' ? 'slideslash' : 'slidecut';
  }

  // The tether: a thin glowing rod from her hand to the hook head, rebuilt every frame it shows
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1, true), new THREE.MeshBasicMaterial({ color: 0xbff6ff }));
  const hookHead = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xe8fbff }));
  tether.visible = hookHead.visible = false; scene.add(tether, hookHead);
  const _from = new THREE.Vector3(), _tip = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function drawTether(tip) {
    _from.set(player.position.x, P.y + 1.35, player.position.z);
    const len = _from.distanceTo(tip);
    tether.visible = hookHead.visible = true;
    tether.position.copy(_from).lerp(tip, 0.5); tether.scale.set(1, Math.max(0.01, len), 1);
    tether.quaternion.setFromUnitVectors(_up, _tip.copy(tip).sub(_from).normalize());
    hookHead.position.copy(tip); hookHead.rotation.y += 0.3;
  }
  function hideTether() { tether.visible = hookHead.visible = false; }
  // Hook target: the locked foe if it is in range, else the closest foe within 26 degrees of her facing
  function hookTarget() {
    const lt = G.lock ? lockTarget() : null;
    if (lt && flatDist(player.position, lt.pos) <= HOOK_RANGE + lt.radius) return lt;
    let best = null, bs = 1e9;
    liveTargets().forEach(t => {
      const d = flatDist(player.position, t.pos), off = Math.abs(angDiff(P.facing, yawTo(player.position, t.pos)));
      if (d > HOOK_RANGE + t.radius || off > 0.45 || Math.abs(t.pos.y - player.position.y) > 4) return;
      const s = d + off * 10; if (s < bs) { bs = s; best = t; }
    });
    return best;
  }

  // Called from startAct (and chain) once P.act, P.actT and P.hitDone are set; stamina costs come from COST
  function startHerMove(name) {
    P.combo = 0;
    if (name === 'slide') { P.actDur = 0.32; P.slideWin = 0; sfx('roll'); }
    else if (name === 'slideslash') { P.actDur = 0.4; P.slideWin = 0; sfx('swing'); }
    else if (name === 'slidecut') { P.actDur = 0.5; P.slideWin = 0; sfx('swoosh'); }
    else if (name === 'hookthrow') {
      const t = hookTarget(), f = fwdOf(P.facing);
      if (t) P.facing = yawTo(player.position, t.pos);
      const end = t ? new THREE.Vector3(t.pos.x, t.pos.y + 1, t.pos.z) : new THREE.Vector3(player.position.x + f.x * HOOK_RANGE, P.y + 1.3, player.position.z + f.z * HOOK_RANGE);
      P.hook = { t, end }; P.actDur = Math.max(0.14, flatDist(player.position, end) / 60);
      P.mana -= HOOK_MANA; P.cd.g = HOOK_CD; sfx('swoosh');
    } else if (name === 'hookzip') { P.actDur = 0.7; P.iframe = Math.max(P.iframe, 0.7); sfx('parry'); }
    else if (name === 'hookback') { P.actDur = 0.18; }
    else if (name === 'hookflurry') { P.actDur = P.flurryN < 3 ? 0.22 : 0.34; sfx('swing'); }
  }
  // Moves straight on to the next stage of a move, without startAct's checks and costs
  function chain(name) { P.act = name; P.actT = 0; P.hitDone = false; startHerMove(name); }
  function endHook() { P.act = null; P.hook = null; hideTether(); }

  // Runs first in updatePlayer (from heroKitFrame): ticks the slide window, drops a tether something else interrupted
  function herFrame(dt) {
    P.slideWin = Math.max(0, P.slideWin - dt);
    if (P.hook && !(P.act && P.act.startsWith('hook'))) { P.hook = null; hideTether(); }
  }
  function herTick(dt, k) {
    const a = P.act, pp = player.position;
    if (a === 'slide') {
      const s = 14 * (1 - 0.5 * k); movePlayer(P.slideDir.x * s * dt, P.slideDir.z * s * dt);
      if (Math.random() < 0.6) { fwColor.setHSL(0.1, 0.15, 0.7); fwParticle(pp.x, P.y + 0.1, pp.z, -P.slideDir.x * 2, 0.6, -P.slideDir.z * 2, fwColor, 0.4, false); }
      if (k >= 1) P.slideWin = 0.25;
    } else if (a === 'slideslash') {
      if (k < 0.6) { const s = 10 * (1 - k); movePlayer(P.slideDir.x * s * dt, P.slideDir.z * s * dt); }
      if (!P.hitDone && k > 0.35) { P.hitDone = true; spawnSwoosh(true); playerStrike(30, 18, 2.8, 3.6, false); }
    } else if (a === 'slidecut') {
      if (k < 0.3) { const s = 8 * (1 - k); movePlayer(P.slideDir.x * s * dt, P.slideDir.z * s * dt); }
      if (!P.hitDone && k > 0.45) {
        P.hitDone = true;
        const t = (G.lock && lockTarget()) || nearestTarget(liveTargets().filter(x => flatDist(pp, x.pos) < 4 + x.radius), pp);
        if (t) P.facing = yawTo(pp, t.pos);
        spawnSwoosh(false); G.shake = Math.max(G.shake, 0.2); playerStrike(52, 40, 3.2, 2.0, true);
      }
    } else if (a === 'hookthrow') {
      const h = P.hook;
      if (h.t && h.t.alive !== false) h.end.set(h.t.pos.x, h.t.pos.y + 1, h.t.pos.z);
      _from.set(pp.x, P.y + 1.35, pp.z); drawTether(_tip.copy(_from).lerp(h.end, Math.min(1, k)));
      if (k >= 1) {
        if (h.t && h.t.alive !== false) { chain('hookzip'); heroWord('HOOKED', '#bff6ff', 2.8); }
        else { chain('hookback'); heroWord('missed', '#9aa7b0', 2.4); }
      }
    } else if (a === 'hookback') {
      _from.set(pp.x, P.y + 1.35, pp.z); drawTether(_tip.copy(P.hook.end).lerp(_from, Math.min(1, k)));
      if (k >= 1) endHook();
    } else if (a === 'hookzip') {
      const t = P.hook.t;
      if (!t || t.alive === false) return endHook();
      P.facing = yawTo(pp, t.pos);
      const gap = flatDist(pp, t.pos) - t.radius - 1.2, step = 30 * dt;
      if (gap > step) { const f = fwdOf(P.facing); movePlayer(f.x * step, f.z * step); }
      drawTether(_tip.set(t.pos.x, t.pos.y + 1, t.pos.z));
      if (Math.random() < 0.7) { fwColor.setHSL(0.52, 0.7, 0.8); fwParticle(pp.x, P.y + 1, pp.z, 0, 0.4, 0, fwColor, 0.4, true); }
      if (gap <= step || k >= 1) {
        hideTether();
        if (flatDist(pp, t.pos) < t.radius + 3) { P.flurryN = 1; chain('hookflurry'); } else endHook();
      }
    } else if (a === 'hookflurry') {
      const t = P.hook && P.hook.t;
      if (t && t.alive !== false) P.facing = yawTo(pp, t.pos);
      if (!P.hitDone && k > 0.35) {
        P.hitDone = true;
        const [d, p] = HOOK_HITS[P.flurryN - 1], last = P.flurryN === 3;
        spawnSwoosh(last, P.facing + (P.flurryN === 2 ? 0.6 : -0.6)); if (last) G.shake = Math.max(G.shake, 0.3);
        playerStrike(d * abilityScale(), p, 2.9, 2.2, last);
        if (last && t && t.alive !== false) {
          if (heroMinorFoe(t)) { heroDaze(t, 1.5); floatText('STUNNED', t.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 'word', '#bff6ff'); }
          kitRingFx(t.pos.x, t.pos.y, t.pos.z, 0xbff6ff, 0.5);
        }
      }
      if (k >= 1) { if (P.flurryN < 3) { P.flurryN++; chain('hookflurry'); } else endHook(); }
    }
  }
