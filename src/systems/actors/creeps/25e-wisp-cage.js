  // ---------- The Ash Wisp: the modelled flake cage (assets/creeps/ash-wisp-cage.glb) ----------
  // Route B, no skeleton: one static cage of curled ash flakes, loaded after the game starts and shared by every wisp
  // (roster, ancient camps, neutral camps, wave pool). The game's own flame sphere (c.core, still pulsed by the ranged
  // brain) shrinks to a white-hot centre; code adds a soft glow that flares before each shot (the tell), a slow spin,
  // and a tail of ash specks and blue sparks drifting off behind, which bursts outward when the wisp dies.
  // The block wisp stays if the cage fails to load. No gameplay numbers change.
  const WC_SCALE = 1.8;     // the cage is 0.43 m across; 1.8 keeps it near the block wisp's 1 m halo, readable at range
  const WC_SPECKS = 18;     // tail particles per wisp
  const WC_FLARE = 0.5;     // seconds before a shot that the flame starts to flare
  let wispCage = null, wispGlowTex = null;

  function wispSoftTex() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  function loadWispCages() {
    const A = window.MM_ASSETS;
    if (!A || !A.wispCage || !A.gltfLoader) return;
    const go = () => {
      const loader = new THREE.GLTFLoader().register(parser => {
        parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
        return { name: 'mm_img_textures' };
      });
      loader.load(A.wispCage, gltf => {
        // Lambert like the other models. The inner (char) side takes a little of the flame's light; the outer ash
        // carries some of its own colour as self-light, or the night lighting turns the approved #6E6E6A near-black
        gltf.scene.traverse(o => {
          if (!o.isMesh) return;
          const src = o.material, inner = src.name === 'char';
          o.material = new THREE.MeshLambertMaterial({ color: src.color, side: THREE.DoubleSide,
            emissive: inner ? new THREE.Color(0x8fd8ff).multiplyScalar(0.12) : src.color.clone().multiplyScalar(0.45) });
          o.material.name = src.name;
        });
        wispCage = gltf.scene;
        wispGlowTex = wispSoftTex();
        creeps.forEach(c => { if (c.type === 'wisp') setupWisp(c); });
      }, undefined, e => console.warn('The Ash Wisp cage did not load; keeping the block wisp', e));
    };
    if (THREE.GLTFLoader) { go(); return; }
    const s = document.createElement('script');
    s.src = A.gltfLoader; s.onload = go;
    document.head.appendChild(s);
  }

  function setupWisp(c) {
    if (c.cage || !c.core) return;
    const flame = c.mat.color.clone();                       // #8FD8FF, or a camp's own tint
    c.body.children.forEach(o => { if (o !== c.core) o.visible = false; });   // block tail cone and halo
    c.core.geometry = new THREE.SphereGeometry(0.11, 10, 8);
    c.mat.color.copy(flame).lerp(new THREE.Color(0xffffff), 0.65);            // white-hot centre
    const cage = wispCage.clone(true);
    cage.scale.setScalar(WC_SCALE);
    cage.traverse(o => { o.layers.enable(2); if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    c.body.add(cage);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: wispGlowTex, color: flame, blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0.85 }));
    glow.scale.setScalar(0.9); glow.layers.enable(2); c.body.add(glow);
    // Tail: ash specks (grey) and sparks (flame colour) in world space, so they trail when it moves
    const mk = (col, size, add) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WC_SPECKS * 3), 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size, map: wispGlowTex, transparent: true,
        depthWrite: false, opacity: add ? 0.9 : 0.75, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      pts.frustumCulled = false; pts.visible = false; scene.add(pts);
      return { pts, p: [], v: [], age: [], life: [] };
    };
    const tail = [mk(0x8a8780, 0.11, false), mk(flame, 0.07, true)];
    tail.forEach(T => { for (let i = 0; i < WC_SPECKS; i++) { T.p.push(new THREE.Vector3()); T.v.push(new THREE.Vector3()); T.age.push(Math.random()); T.life.push(1); } });
    c.cage = { cage, glow, tail, flame, alive: c.alive, burstT: 0 };
  }

  const wcTmp = new THREE.Vector3(), wcBack = new THREE.Vector3();
  function wispSpeck(c, T, i, burst) {
    c.g.getWorldPosition(wcTmp);
    const s = c.g.scale.x;
    T.age[i] = 0; T.life[i] = burst ? 0.6 + Math.random() * 0.6 : 0.7 + Math.random() * 0.7;
    if (burst) {
      T.p[i].copy(wcTmp).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3).multiplyScalar(s));
      T.v[i].set(Math.random() - 0.5, Math.random() * 0.7, Math.random() - 0.5).normalize().multiplyScalar((1.5 + Math.random() * 2) * s);
    } else {
      wcBack.set(-Math.sin(c.facing), 0, -Math.cos(c.facing));   // behind it (fwdOf is +z at facing 0)
      T.p[i].copy(wcTmp).addScaledVector(wcBack, 0.3 * s).add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25).multiplyScalar(s));
      T.v[i].copy(wcBack).multiplyScalar((0.7 + Math.random() * 0.5) * s).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.15 - Math.random() * 0.2, (Math.random() - 0.5) * 0.3));
    }
  }

  function wispCageUpdate(dt) {
    if (!wispCage) return;
    creeps.forEach(c => {
      const W = c.cage;
      if (!W) return;
      // Died this frame (hp ran out): the tail bursts outward into ash
      if (W.alive && !c.alive && c.hp <= 0 && c.realm === realmKey()) {
        W.burstT = 1.2; W.tail.forEach(T => { T.seeded = true; for (let i = 0; i < WC_SPECKS; i++) wispSpeck(c, T, i, true); });
      }
      W.alive = c.alive;
      const live = c.alive && c.g.visible;
      if (live) {
        W.cage.rotation.y += dt * 0.7;                             // slow spin
        W.cage.rotation.x = Math.sin(uTime.value * 0.9 + c.home.x) * 0.12;
        // The tell: the flame swells and brightens as the next shot comes due (cool only counts down while aggro)
        const flare = c.cool < WC_FLARE && c.stun <= 0 ? 1 - Math.max(0, c.cool) / WC_FLARE : 0;
        const flick = 1 + Math.sin(uTime.value * 17 + c.home.z) * 0.06 + Math.sin(uTime.value * 7.3) * 0.05;
        W.glow.scale.setScalar((0.9 + flare * 0.9 + c.flash * 0.5) * flick);
        W.glow.material.opacity = Math.min(1, 0.75 + flare * 0.25);
      }
      if (W.burstT > 0) W.burstT -= dt;
      const show = live || W.burstT > 0;
      W.tail.forEach(T => {
        T.pts.visible = show;
        if (!show) { T.seeded = false; return; }
        const arr = T.pts.geometry.attributes.position.array;
        // First frame in view: spread the whole tail out at once, each speck part-way through its life
        if (!T.seeded) { T.seeded = true; for (let i = 0; i < WC_SPECKS; i++) { wispSpeck(c, T, i, false); T.age[i] = Math.random() * T.life[i]; T.p[i].addScaledVector(T.v[i], T.age[i]); } }
        for (let i = 0; i < WC_SPECKS; i++) {
          T.age[i] += dt;
          if (T.age[i] >= T.life[i]) {
            if (live) wispSpeck(c, T, i, false);
            else { arr[i * 3 + 1] = -999; continue; }               // a burst speck has burned out
          }
          T.p[i].addScaledVector(T.v[i], dt);
          T.v[i].multiplyScalar(Math.max(0, 1 - dt * 1.5));
          const k = 1 - T.age[i] / T.life[i];                       // specks shrink away by sinking out of the bunch
          arr[i * 3] = T.p[i].x; arr[i * 3 + 1] = T.p[i].y - (1 - k) * 0.05; arr[i * 3 + 2] = T.p[i].z;
        }
        T.pts.geometry.attributes.position.needsUpdate = true;
      });
    });
  }

  loadWispCages();
