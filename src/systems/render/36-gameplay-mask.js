  // ---------- Readability: tag what matters so the ASCII pass can make it stand out ----------
  const maskFriend = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
  const maskFoe = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
  // Three r128 caches the skinning variant per material. Keep a separate pass for rigs
  // and set the mask color per mesh so both sides can share that pass.
  const maskSkinned = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, skinning: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMaskColor: { value: new THREE.Color() } }]),
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      #include <fog_pars_vertex>
      void main() {
        #include <begin_vertex>
        #include <skinbase_vertex>
        #include <skinning_vertex>
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uMaskColor;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(uMaskColor, 1.0);
        #include <fog_fragment>
      }
    `
  });
  let hasSkinnedMask = false;
  function tag(o, L) {
    if (!o || o.userData['mk' + L]) return;
    o.userData['mk' + L] = true;
    o.traverse(c => {
      if (c.isPoints || c.isSprite) return;
      if (!c.isSkinnedMesh) { c.layers.enable(L); return; }
      c.layers.enable(3);
      hasSkinnedMask = true;
      const roles = c.userData.maskRoles || 0;
      c.userData.maskRoles = roles | L;
      if (roles) return;
      const beforeRender = c.onBeforeRender;
      c.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
        beforeRender.call(this, renderer, scene, camera, geometry, material, group);
        if (material !== maskSkinned) return;
        const role = this.userData.maskRoles;
        maskSkinned.uniforms.uMaskColor.value.setRGB(role & 1, (role >> 1) & 1, 0);
        maskSkinned.uniformsNeedUpdate = true;
      };
    });
  }
  tag(player, 1);
  beasts.forEach(b => tag(b.g, 1));
  chests.forEach(c => tag(c.g, 1));
  pods.forEach(p => tag(p.pod, 1));
  if (SHRINE.crystal) tag(SHRINE.crystal, 1);
  tag(boss, 2);
  royals.forEach(r => tag(r.g, 2));
  creeps.forEach(c => tag(c.g, 2));
  traps.forEach(t => tag(t.g, 2));
  [teleCircle, fillCircle, teleLane, fillLane].forEach(m => tag(m, 2));
  function markDynamic() {
    bolts.forEach(b => tag(b.m, 1)); loot.forEach(l => tag(l.m, 1)); swooshes.forEach(w => tag(w.m, 1)); fxRings.forEach(f => tag(f.m, 1));
    shots.forEach(x => tag(x.m, 2)); cshots.forEach(x => tag(x.m, 2)); waves.forEach(w => tag(w.m, 2)); patches.forEach(p => tag(p.m, p.friendly ? 1 : 2));
    if (dragon.angry > 0) tag(dragon.g, 2);
  }
