  // ---------- Graphics: shadows, glow and grading (Enhanced mode) ----------
  // Enhanced is the default. Every lit surface is physically based (see the Lambert swap in core/00), the moon casts
  // soft shadows that follow the hero, bright things bloom, and the Raw view gets filmic grading and a vignette.
  // Classic keeps the original flat look for slower tablets. The choice is per browser and reloads the page.
  const GFX_HIGH = GFX === 'high';
  let TORCHES = [];
  // Light from the moon you can see, low behind the castle, so shadows stretch toward the camera
  const MOON_DIR = new THREE.Vector3(moon.position.x * 0.004, 0.62, -1).normalize();
  if (GFX_HIGH) {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    moonLight.castShadow = true; moonLight.intensity = 1.25; moonLight.color.setHex(0xb8ccff);
    moonLight.shadow.mapSize.set(matchMedia('(pointer: coarse)').matches ? 1024 : 2048, matchMedia('(pointer: coarse)').matches ? 1024 : 2048);
    Object.assign(moonLight.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 160 });
    moonLight.shadow.camera.updateProjectionMatrix();
    moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = 0.04;
    scene.add(moonLight.target);
    scene.children.forEach(o => { if (o.isHemisphereLight) o.intensity = 0.3; });
    // Everything solid casts and receives shadows; glows, decals, water, sky and huge ground planes don't cast
    scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const m = o.material, solid = m && m.isMeshStandardMaterial && !m.transparent;
      const geo = o.geometry; if (geo && !geo.boundingBox) geo.computeBoundingBox();
      const bb = geo && geo.boundingBox, size = bb ? bb.getSize(new THREE.Vector3()) : null;
      const flat = size && Math.min(size.x, size.y, size.z) < 0.05, huge = size && Math.max(size.x, size.z) > 60;
      o.castShadow = !!solid && !flat && !huge;
      o.receiveShadow = !!(m && m.isMeshStandardMaterial);
    });
    // The castle stone picks up relief from its own brick texture
    // Two flickering torches at the castle gate: warm light against the cold moon
    TORCHES = [-3.4, 3.4].map(x => {
      const l = new THREE.PointLight(0xff9440, 1.6, 16, 2); l.position.set(x, 3.4, -16.8); moatGroup.add(l);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a })); f.position.copy(l.position); moatGroup.add(f);
      return { l, f, ph: Math.random() * 10 };
    });
    if (stone.map) { stone.bumpMap = stone.map; stone.bumpScale = 0.06; stone.roughness = 0.95; stone.needsUpdate = true; }
  }

  // Bloom: bright parts of the frame, blurred at quarter size, added back in the post pass
  const bloomA = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false }), bloomB = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const blurU = { tSrc: { value: null }, uDir: { value: new THREE.Vector2() }, uBright: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } };
  const blurScene = new THREE.Scene();
  blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: blurU, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir, uRes; uniform float uBright; varying vec2 vUv;
      vec3 tap(vec2 uv){ vec3 c = texture2D(tSrc, uv).rgb; if (uBright > 0.5) { float l = max(c.r, max(c.g, c.b)); c *= smoothstep(0.72, 1.0, l) * 0.8; } return c; }
      void main(){
        vec2 d = uDir / uRes; vec3 s = tap(vUv) * 0.227;
        s += (tap(vUv + d * 1.38) + tap(vUv - d * 1.38)) * 0.316;
        s += (tap(vUv + d * 3.23) + tap(vUv - d * 3.23)) * 0.07;
        gl_FragColor = vec4(s, 1.0);
      }`
  })));
  postU.tBloom = { value: bloomB.texture }; postU.uBloom = { value: GFX_HIGH ? 1 : 0 };
  let bloomW = 0;
  function blurPass(src, dst, dx, dy, bright) {
    blurU.tSrc.value = src.texture; blurU.uDir.value.set(dx, dy); blurU.uBright.value = bright;
    renderer.setRenderTarget(dst); renderer.render(blurScene, postCam);
  }
  // Called from the loop around the main scene render
  function gfxBeforeScene() {
    if (!GFX_HIGH) return;
    moonLight.position.copy(player.position).addScaledVector(MOON_DIR, 70);
    moonLight.target.position.copy(player.position);
    renderer.shadowMap.needsUpdate = true;
    const t = uTime.value;
    TORCHES.forEach(o => { const k = 0.85 + Math.sin(t * 13 + o.ph) * 0.08 + Math.sin(t * 7.3 + o.ph) * 0.07; o.l.intensity = 1.6 * k; o.f.scale.setScalar(k); });
  }
  function gfxAfterScene() {
    if (!GFX_HIGH) return;
    const w = Math.max(1, sceneRT.width >> 2), h = Math.max(1, sceneRT.height >> 2);
    if (w !== bloomW) { bloomW = w; bloomA.setSize(w, h); bloomB.setSize(w, h); blurU.uRes.value.set(w, h); }
    blurPass(sceneRT, bloomA, 1, 0, 1); blurPass(bloomA, bloomB, 0, 1, 0);
    blurPass(bloomB, bloomA, 2, 0, 0); blurPass(bloomA, bloomB, 0, 2, 0);
  }

  // The Enhanced / Classic switch in the renderer panel
  document.querySelectorAll('#gfxseg button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.g === GFX));
    b.addEventListener('click', () => {
      if (b.dataset.g === GFX) return;
      try { localStorage.setItem('moonlit-moat.gfx', b.dataset.g); } catch (e) { return; }
      saveGame(); location.reload();
    });
  });
