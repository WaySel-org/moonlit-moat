  // ---------- Sky ----------
  const uTime = { value: 0 };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTime, uHor: { value: new THREE.Vector3(0.09, 0.15, 0.19) }, uZen: { value: new THREE.Vector3(0.008, 0.014, 0.03) }, uAur: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vDir; uniform float uTime; uniform vec3 uHor; uniform vec3 uZen; uniform float uAur;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float y = max(d.y, 0.0);
        vec3 col = mix(uHor, uZen, pow(y, 0.45));
        float band = smoothstep(0.12, 0.4, d.y) * smoothstep(0.85, 0.45, d.y) * (0.5 + 0.5 * sin(d.x * 7.0 + d.z * 3.0 + uTime * 0.4));
        col += uAur * band * mix(vec3(0.1, 0.7, 0.45), vec3(0.45, 0.2, 0.7), 0.5 + 0.5 * sin(d.x * 3.0 - uTime * 0.2)) * 0.35;
        float s = h(floor(d * 240.0));
        float star = step(0.9962, s) * smoothstep(0.03, 0.25, d.y) * (0.55 + 0.45 * sin(uTime * 2.0 + s * 60.0));
        gl_FragColor = vec4(col + star * vec3(0.9,0.95,1.0), 1.0);
      }`
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  const moonTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#efe8cc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const r = 6 + sr() * 26; g.fillStyle = `rgba(150,145,125,${0.25 + sr() * 0.35})`; g.beginPath(); g.arc(sr() * w, sr() * h, r, 0, TAU); g.fill(); }
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.MeshBasicMaterial({ map: moonTex }));
  moon.position.set(16, 40, -170);
  scene.add(moon);
  const haloTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(240,232,200,0.55)'); gr.addColorStop(0.35, 'rgba(200,210,220,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(70, 70, 1); halo.position.copy(moon.position).add(new THREE.Vector3(0, 0, -12));
  scene.add(halo);
