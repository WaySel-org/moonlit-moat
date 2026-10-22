  // ---------- Game state ----------
  const G = { world: 'moat', realm: 'material', state: 'explore', hitstop: 0, slow: 0, shake: 0, lock: false, fightStart: 0, parries: 0, hitsTaken: 0, wardenDown: false, target: null, dmgMult: 1, runStart: 0, shop: false };
  const worldTier = () => 1 + Math.floor(Math.max(0, uTime.value - G.runStart) / 120);
  const tierMult = t => 1 + 0.3 * (t - 1);
  const P = { hp: 100, max: 100, st: 100, stMax: 100, stDelay: 0, flasks: 3, act: null, actT: 0, actDur: 0, combo: 0, hitDone: false, buffer: null, bufferT: 0,
    iframe: 0, block: false, blockT: 0, facing: Math.PI, kb: new THREE.Vector3(), rollDir: new THREE.Vector3(), healed: false, hurtFlash: 0,
    mana: 50, manaMax: 100, armor: 0, armorMax: 60, buffDmg: 0, buffAgi: 0, y: 0, stone: 0, cd: { z: 0, v: 0, x: 0, mp1: 0, mp2: 0 }, leapFrom: null, leapTo: null, leapY: 0 };
  const PR = { level: 1, xp: 0, gold: 0, points: 0, str: 0, vit: 0, agi: 0, spi: 0, weapon: 0, armorLv: 0, flaskMax: 3, warden: false, dmg: 1, spell: 1, speed: 1 };
  const B = { hp: 800, max: 800, poise: 100, phase: 1, state: 'perch', t: 0, atk: null, cool: 1.0, facing: 0, flash: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 1, spin: 0 };
  boss.position.copy(PERCH);

  const ui = {
    hud: $('#hud'), obj: $('#obj'), bossbar: $('#bossbar'), bfill: $('#bfill'), bghost: $('#bghost'), pfill: $('#pfill'), btag: $('#btag'),
    pbars: $('#pbars'), hfill: $('#hfill'), hghost: $('#hghost'), sfill: $('#sfill'), flasks: $('#flasks'),
    royalbars: $('#royalbars'), lockmark: $('#lockmark'),
    bname: $('#bname'), rname0: $('#rname0'), rname1: $('#rname1'), heroEl: $('#hero'), minimap: $('#minimap'), shop: $('#shop'), prompt: $('#prompt'), pauseEl: $('#pause'),
    rb: [0, 1].map(i => ({ row: $('#rb' + i), fill: $('#rfill' + i), ghost: $('#rghost' + i), tag: $('#rtag' + i) })),
    coilFill: $('#coilFill'), arRing: $('#arRing'), orbFill: $('#orbFill'), hnum: $('#hnum'), anum: $('#anum'), mnum: $('#mnum'), chips: $('#chips'), chipsHTML: '',
    banner: $('#banner'), bh: $('#bh'), bp: $('#bp'), bbtn: $('#bbtn'), flash: $('#flash'), nums: $('#nums')
  };

  // Soul coil: a spiral from the mana orb outwards; health drains from the outer end inward
  (function buildCoil() {
    const pts = [], turns = 2.4, r0 = 13, r1 = 51, n = 260;
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = -Math.PI / 2 + k * turns * TAU, r = r0 + (r1 - r0) * k;
      pts.push(`${(60 + Math.cos(a) * r).toFixed(2)},${(60 + Math.sin(a) * r).toFixed(2)}`);
    }
    const d = 'M' + pts.join(' L');
    $('#coilTrack').setAttribute('d', d); $('#coilFill').setAttribute('d', d);
  })();

  // Floating numbers and words above the fighters
  const nums = [];
  function floatText(text, pos, cls, color) {
    const el = document.createElement('div'); el.className = 'num ' + (cls || ''); el.textContent = text; ui.nums.appendChild(el);
    if (color) el.style.color = color;
    nums.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)), t: 0 });
  }

  let bannerTimer = 0;
  function showBanner(title, text, kind, button) {
    ui.banner.className = kind || '';
    ui.bh.textContent = title; ui.bp.textContent = text || ''; ui.bp.hidden = !text;
    ui.bbtn.hidden = !button; if (button) ui.bbtn.textContent = button + ' (Enter)';
    ui.banner.hidden = false;
  }

  const fwdOf = a => new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
  const flatDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

  function pushOutLake(v, pad) {
    const dx = v.x - LAKE.x, dz = v.z - LAKE.z, d = Math.hypot(dx, dz) || 1e-4, r = LAKE.r + pad;
    if (d < r) { v.x = LAKE.x + dx / d * r; v.z = LAKE.z + dz / d * r; return true; }
    return false;
  }
  function clampArena(v, zMin) {
    if (G.hunt) { const before = v.x + v.z * 1000; v.x = clamp(v.x, -78, 78); v.z = clamp(v.z, -78, 70); return before !== v.x + v.z * 1000; }
    const before = v.x + v.z * 1000;
    v.x = clamp(v.x, -40, 40); v.z = clamp(v.z, zMin, 36);
    return before !== v.x + v.z * 1000;
  }
