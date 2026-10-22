  // ---------- Grass ----------
  const grassU = {
    uTime, uSway: { value: reduce ? 0.25 : 1 }, uTorchI: { value: 1 },
    uTorch0: { value: new THREE.Vector3(-3.4, 4.6, -19.2) }, uTorch1: { value: new THREE.Vector3(3.4, 4.6, -19.2) },
    uLantern: { value: new THREE.Vector3() }, uFogCol: { value: new THREE.Color(0x0a1418) }, uFogD: { value: 0 }
  };
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, 0, 1, 0], 3));
  const grassMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: grassU,
    vertexShader: `uniform float uTime; uniform float uSway; varying float vH; varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float h = position.y;
        float s = sin(uTime * 1.6 + w.x * 0.35 + w.z * 0.27) + 0.5 * sin(uTime * 2.7 + w.x * 0.9);
        w.x += s * 0.12 * h * h * uSway; w.z += s * 0.06 * h * h * uSway;
        vH = h; vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform vec3 uTorch0; uniform vec3 uTorch1; uniform vec3 uLantern; uniform float uTorchI; uniform vec3 uFogCol; uniform float uFogD;
      varying float vH; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        float v = hash(floor(vW.xz * 3.0));
        vec3 col = mix(vec3(0.03,0.08,0.04), vec3(0.15,0.40,0.17) + v * 0.08, vH) * 0.8;
        float d0 = distance(vW, uTorch0), d1 = distance(vW, uTorch1), dl = distance(vW, uLantern);
        col += vec3(1.0,0.55,0.2) * uTorchI * (1.0/(1.0 + d0*d0*0.06) + 1.0/(1.0 + d1*d1*0.06)) * vH * 0.7;
        col += vec3(1.0,0.75,0.4) * (1.7/(1.0 + dl*dl*0.35)) * vH;
        float fd = distance(vW, cameraPosition);
        col = mix(col, uFogCol, 1.0 - exp(-uFogD * uFogD * fd * fd));
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const N = 26000, grass = new THREE.InstancedMesh(blade, grassMat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let placed = 0;
  while (placed < N) {
    const x = -79 + sr() * 158, z = -79 + sr() * 150;
    if (Math.abs(x) < 19 && z < -17.5 && z > -38) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 0.6) continue;
    if (Math.abs(x) < 1.2 && z > 5.5) continue;
    eu.set((sr() - 0.5) * 0.3, sr() * Math.PI, (sr() - 0.5) * 0.3); q.setFromEuler(eu);
    m4.compose(p3.set(x, 0, z), q, s3.set(1, 0.35 + sr() * 0.6, 1));
    grass.setMatrixAt(placed++, m4);
  }
  grass.frustumCulled = false;
  scene.add(grass);

  const FF = 40, ffBase = [], ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3);
  for (let i = 0; i < FF; i++) { const a = sr() * TAU, r = LAKE.r + 1 + sr() * 9; ffBase.push([LAKE.x + Math.cos(a) * r, 0.5 + sr() * 1.6, LAKE.z + Math.sin(a) * r, sr() * 10]); }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xe6ff9a, size: 0.16 }));
  fireflies.frustumCulled = false;
  scene.add(fireflies);
