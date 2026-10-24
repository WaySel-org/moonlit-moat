  // ---------- Water ----------
  const reflRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true });
  const drops = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0));
  let dropIdx = 0;
  function spawnDrop(x, z, str) { drops[dropIdx].set(x, z, uTime.value, str); dropIdx = (dropIdx + 1) % drops.length; }
  const waterU = { tRefl: { value: reflRT.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime, uOn: { value: 1 }, uDrops: { value: drops } };
  const water = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r + 0.05, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: waterU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tRefl; uniform vec2 uRes; uniform float uTime; uniform float uOn; uniform vec4 uDrops[6];
      varying vec3 vW;
      void main(){
        vec2 grad = vec2(cos(vW.x * 1.3 + uTime * 1.1), cos(vW.z * 1.7 - uTime * 0.9)) * 0.006;
        for (int i = 0; i < 6; i++) {
          vec4 d = uDrops[i]; float age = uTime - d.z;
          if (age < 0.0 || age > 4.0) continue;
          vec2 v = vW.xz - d.xy; float r = length(v) + 1e-4;
          float front = age * 2.2;
          float env = exp(-pow((r - front) * 1.4, 2.0)) * (1.0 - age / 4.0) * d.w;
          grad += (v / r) * (-sin((r - front) * 7.0) * env) * 0.05;
        }
        vec2 uv = gl_FragCoord.xy / uRes;
        uv.y = 1.0 - uv.y;
        uv += grad;
        vec3 deep = vec3(0.02, 0.05, 0.07);
        vec3 col = uOn > 0.5 ? mix(deep, texture2D(tRefl, uv).rgb * 0.92, 0.85) : vec3(0.05, 0.11, 0.14);
        col += vec3(0.55, 0.65, 0.72) * smoothstep(0.02, 0.07, length(grad)) * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  water.position.set(LAKE.x, -0.02, LAKE.z);
  scene.add(water);
