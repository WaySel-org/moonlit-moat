  // ---------- Builder stage: the dark little theatre the character builder shows the hero in ----------
  // A warm lantern key light from above, a cold rim light from behind, a stone dais with faint moat runes,
  // drifting dust and low mist, and a generated environment so metal has something to reflect.
  // Needs only THREE, so tools/character-lab uses it too. bsStage(renderer) -> { scene, camera, frame(dt), orbit, target }
  function bsStage(renderer) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.FogExp2(0x07080b, 0.085);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
    const st = { scene, camera, yaw: 0.35, pitch: 0.08, dist: 5.2, target: new THREE.Vector3(0, 1.0, 0), want: null, t: 0, auto: true };

    // Backdrop: a dome that fades from a warm glow behind the hero to black
    const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform float uT;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float glow = pow(max(0.0, 1.0 - length(vec2(atan(vP.x, -vP.z) * 0.9, vP.y * 2.2 - 0.25))), 2.4);
          vec3 c = mix(vec3(0.012, 0.014, 0.02), vec3(0.16, 0.10, 0.06), glow);
          c += vec3(0.02, 0.03, 0.05) * smoothstep(0.2, 0.9, vP.y);
          c += (h(gl_FragCoord.xy + uT) - 0.5) * 0.012;
          gl_FragColor = vec4(c, 1.0);
        }`
    }));
    scene.add(dome);

    // Dais: worn stone with a ring of runes that breathes
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      const g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
      g.addColorStop(0, '#4a4540'); g.addColorStop(0.7, '#2c2926'); g.addColorStop(1, '#15130f');
      x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,240,220'},${Math.random() * 0.06})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 6, 1 + Math.random() * 3); }
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; x.beginPath(); x.moveTo(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120); x.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250); x.stroke(); }
      [120, 250].forEach(r => { x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke(); });
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    })();
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 0.22, 64), [
      new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x111111 })]);
    dais.position.y = -0.11; dais.receiveShadow = true; scene.add(dais);
    const runes = (() => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const x = c.getContext('2d');
      x.font = '40px "IBM Plex Mono", monospace'; x.fillStyle = '#fff'; x.textBaseline = 'middle';
      const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
      for (let i = 0; i < 26; i++) x.fillText(glyphs[i % glyphs.length], 10 + i * 39, 34);
      const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.32, 1.5, 96, 1), new THREE.MeshBasicMaterial({ map: runes, color: 0x8fb8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    // Map the rune strip around the ring
    { const uv = ring.geometry.attributes.uv, p = ring.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)); uv.setXY(i, (a / (Math.PI * 2) + 0.5) * 3, Math.hypot(p.getX(i), p.getY(i)) > 1.41 ? 1 : 0); } }
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; scene.add(ring);

    // Light
    scene.add(new THREE.HemisphereLight(0x3a4660, 0x120c08, 0.45));
    const key = new THREE.SpotLight(0xffc48a, 2.6, 18, 0.55, 0.65, 1.4);
    key.position.set(2.2, 5.2, 3.0); key.target.position.set(0, 0.9, 0); scene.add(key, key.target);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    const rim = new THREE.SpotLight(0x7f9cff, 2.4, 16, 0.6, 0.8, 1.2);
    rim.position.set(-2.4, 3.2, -3.4); rim.target.position.set(0, 1.2, 0); scene.add(rim, rim.target);
    const fill = new THREE.PointLight(0xff8a4a, 0.5, 6, 2); fill.position.set(-1.6, 0.4, 1.8); scene.add(fill);
    st.key = key; st.rim = rim;

    // Dust in the lamp beam
    const N = 260, dp = new Float32Array(N * 3), dv = [];
    for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - 0.5) * 5; dp[i * 3 + 1] = Math.random() * 3.6; dp[i * 3 + 2] = (Math.random() - 0.5) * 5; dv.push(Math.random() * 6.28); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const mote = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: mote, color: 0xffd9a8, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);

    // Low mist: soft sheets drifting around the ankles
    const mistTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      for (let i = 0; i < 40; i++) { const r = 30 + Math.random() * 60, px = 40 + Math.random() * 176, py = 40 + Math.random() * 176; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
      return new THREE.CanvasTexture(c);
    })();
    const mists = [0, 1, 2].map(i => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: mistTex, color: 0x9fb0c8, transparent: true, opacity: 0.32, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.06 + i * 0.12; scene.add(m); return m;
    });

    // Environment for metal: render a tiny gradient room once
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; void main(){
        vec3 c = mix(vec3(0.05, 0.04, 0.035), vec3(0.32, 0.36, 0.45), smoothstep(-0.2, 0.9, vP.y));
        c += vec3(1.4, 0.95, 0.6) * pow(max(0.0, dot(vP, normalize(vec3(0.5, 0.8, 0.6)))), 24.0);
        c += vec3(0.5, 0.65, 1.2) * pow(max(0.0, dot(vP, normalize(vec3(-0.5, 0.5, -0.7)))), 18.0);
        gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }`
    })));
    const env = pm.fromScene(envScene, 0.02).texture; pm.dispose();
    if (typeof CK !== 'undefined') CK.env = env;
    st.env = env;

    st.setAvatar = function (A) {
      if (st.avatar) scene.remove(st.avatar.root);
      st.avatar = A; if (A) scene.add(A.root);
    };
    // Camera shots: whole body, face, upper body, back
    const SHOTS = { body: [0.35, 0.08, 5.2, 0.98], face: [0.25, 0.02, 1.35, 1.6], upper: [0.4, 0.06, 2.6, 1.3], back: [Math.PI + 0.4, 0.12, 4.6, 1.1], feet: [0.5, 0.25, 2.6, 0.45] };
    st.shot = function (name) {
      const s = SHOTS[name]; if (!s) return;
      const h = st.avatar ? st.avatar.inner.scale.y : 1;
      st.want = { yaw: s[0], pitch: s[1], dist: s[2], y: s[3] * h };
    };
    st.frame = function (dt, w, hgt) {
      st.t += dt;
      if (st.want) {
        const k = 1 - Math.pow(0.002, dt);
        st.yaw += (st.want.yaw - st.yaw) * k; st.pitch += (st.want.pitch - st.pitch) * k; st.dist += (st.want.dist - st.dist) * k; st.target.y += (st.want.y - st.target.y) * k;
        if (Math.abs(st.want.dist - st.dist) < 0.002 && Math.abs(st.want.yaw - st.yaw) < 0.002) st.want = null;
      }
      camera.aspect = w / hgt; camera.updateProjectionMatrix();
      // Frame the hero a little left of centre on wide screens, so the panel on the right doesn't cover them
      const side = w > hgt * 1.2 ? 0.55 * st.dist / 5.2 : 0;
      const cp = Math.cos(st.pitch);
      camera.position.set(Math.sin(st.yaw) * cp * st.dist, st.target.y + Math.sin(st.pitch) * st.dist, Math.cos(st.yaw) * cp * st.dist);
      const right = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
      camera.position.addScaledVector(right, side);
      camera.lookAt(st.target.clone().addScaledVector(right, side));
      for (let i = 0; i < N; i++) {
        dp[i * 3] += Math.sin(st.t * 0.3 + dv[i]) * dt * 0.05; dp[i * 3 + 1] += dt * (0.03 + 0.02 * Math.sin(dv[i]));
        if (dp[i * 3 + 1] > 3.6) dp[i * 3 + 1] = 0;
      }
      dg.attributes.position.needsUpdate = true;
      mists.forEach((m, i) => { m.rotation.z = st.t * (0.02 + i * 0.012) * (i % 2 ? -1 : 1); m.material.opacity = 0.22 + 0.08 * Math.sin(st.t * 0.4 + i * 2); });
      ring.material.opacity = 0.32 + 0.16 * Math.sin(st.t * 1.4); runes.offset.x = st.t * 0.01;
      key.intensity = 2.6 * (0.96 + 0.04 * Math.sin(st.t * 9) * Math.sin(st.t * 5.3));
      dome.material.uniforms.uT.value = st.t;
    };
    st.render = function (dt) {
      const sz = renderer.getSize(new THREE.Vector2());
      st.frame(dt, sz.x, sz.y);
      if (st.avatar) st.avatar.update(dt, { wind: 0.4 });
      const sm = renderer.shadowMap.enabled; renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(null); renderer.render(scene, camera);
      return sm;
    };
    return st;
  }
