  // ---------- ASCII post-process pass ----------
  const RAMP = " .:-=+*#%", EDGE = "|-/\\";
  const sceneRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true });
  // Gameplay mask: red = you and friendly things, green = enemies and danger. Drawn through walls.
  const maskRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const postU = {
    tScene: { value: sceneRT.texture }, tMask: { value: maskRT.texture }, tAtlas: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uCell: { value: 8 }, uCount: { value: RAMP.length }, uTotal: { value: RAMP.length + EDGE.length },
    uMode: { value: 0 }, uPal: { value: 0 }, uEdges: { value: 1 }, uGain: { value: S.gain }, uLine: { value: DPR }, uSpirit: { value: 0 }, uTime
  };
  const postMat = new THREE.ShaderMaterial({
    uniforms: postU, depthTest: false, depthWrite: false,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tScene; uniform sampler2D tMask; uniform sampler2D tAtlas; uniform vec2 uRes;
      uniform float uCell, uCount, uTotal, uMode, uPal, uEdges, uGain, uLine, uSpirit, uTime;
      float L(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      vec3 cellCol(vec2 ci){
        vec2 b = ci * uCell; float q = uCell * 0.25;
        return 0.25 * (texture2D(tScene, (b + vec2(q, q)) / uRes).rgb + texture2D(tScene, (b + vec2(3.0*q, q)) / uRes).rgb
                     + texture2D(tScene, (b + vec2(q, 3.0*q)) / uRes).rgb + texture2D(tScene, (b + vec2(3.0*q, 3.0*q)) / uRes).rgb);
      }
      float cellL(vec2 ci){ return L(texture2D(tScene, (ci + 0.5) * uCell / uRes).rgb) * uGain; }
      void main(){
        vec2 fc = gl_FragCoord.xy;
        float splitX = uRes.x * 0.5;
        if (uMode > 0.5 && uMode < 1.5 && abs(fc.x - splitX) < uLine) { gl_FragColor = vec4(0.94, 0.9, 0.76, 1.0); return; }
        if (uMode > 1.5 || (uMode > 0.5 && fc.x < splitX)) { gl_FragColor = vec4(texture2D(tScene, fc / uRes).rgb, 1.0); return; }
        vec2 ci = floor(fc / uCell);
        // In the spirit realm the world sways like a dream; gameplay stays put
        vec2 wfc = fc + uSpirit * vec2(sin(fc.y * 0.018 + uTime * 1.3) * 7.0, cos(fc.x * 0.014 + uTime * 0.9) * 5.0) * (uRes.y / 900.0);
        vec2 cw = floor(wfc / uCell);
        vec3 col = cellCol(cw);
        float lum = clamp(pow(L(col) * uGain, 0.8), 0.0, 1.0);
        // Gameplay objects stay bright and dense; the world recedes into dim, sparse glyphs
        vec2 mk = texture2D(tMask, (ci + 0.5) * uCell / uRes).rg;
        float friend = step(0.5, mk.r), foe = step(0.5, mk.g), imp = max(friend, foe);
        float lumE = lum * 0.6; lumE = lumE < 0.1 ? 0.0 : lumE;
        float lv = mix(lumE, max(lum, 0.62), imp);
        float g = floor(lv * (uCount - 1.0) + 0.5);
        if (imp < 0.5) g = min(g, uCount - 4.0);
        if (uEdges > 0.5 && lv > 0.06) {
          float tl = cellL(cw + vec2(-1.0, 1.0)), t = cellL(cw + vec2(0.0, 1.0)), tr = cellL(cw + vec2(1.0, 1.0));
          float l = cellL(cw + vec2(-1.0, 0.0)), r = cellL(cw + vec2(1.0, 0.0));
          float bl = cellL(cw + vec2(-1.0, -1.0)), b = cellL(cw + vec2(0.0, -1.0)), br = cellL(cw + vec2(1.0, -1.0));
          float gx = (tr + 2.0*r + br) - (tl + 2.0*l + bl);
          float gy = (tl + 2.0*t + tr) - (bl + 2.0*b + br);
          if (length(vec2(gx, gy)) > (imp > 0.5 ? 0.6 : 1.6)) {
            float a = mod(atan(gy, gx) + 3.14159265, 3.14159265);
            float e = (a < 0.3927 || a > 2.7489) ? 0.0 : (a < 1.1781 ? 3.0 : (a < 1.9635 ? 1.0 : 2.0));
            g = uCount + e;
          }
        }
        vec2 local = fract(fc / uCell);
        float m = texture2D(tAtlas, vec2((g + local.x) / uTotal, local.y)).r;
        float mx = max(col.r, max(col.g, col.b));
        vec3 hue = col / max(mx, 0.004);
        vec3 tint;
        if (uPal < 0.5) {
          vec3 env = mix(vec3(0.58, 0.6, 0.56), vec3(0.62, 0.6, 0.95), uSpirit) * (0.3 + 0.7 * lv);
          vec3 fr = mix(vec3(1.0, 0.95, 0.84), hue, 0.3);
          vec3 fo = mix(vec3(1.0, 0.42, 0.3), vec3(0.98, 0.45, 1.0), uSpirit);
          tint = imp < 0.5 ? env : (foe > 0.5 ? fo : fr);
        } else if (uPal < 1.5) {
          tint = mix(vec3(1.0), hue, 0.85) * (0.35 + 0.9 * lv) * (imp > 0.5 ? 1.15 : 0.7);
        } else if (uPal < 2.5) {
          tint = vec3(0.35, 1.0, 0.55) * (0.25 + lv) * (imp > 0.5 ? 1.2 : 0.6);
        } else {
          tint = vec3(1.0, 0.72, 0.3) * (0.25 + lv) * (imp > 0.5 ? 1.2 : 0.6);
        }
        vec3 bg = uPal < 0.5 ? vec3(0.03, 0.033, 0.035) : vec3(0.012, 0.018, 0.022);
        bg = mix(bg, vec3(0.05, 0.04, 0.09), uSpirit);
        // Falling code rain over the scenery, only in the spirit realm
        vec3 rain = vec3(0.0);
        if (uSpirit > 0.01 && imp < 0.5) {
          float rows = uRes.y / uCell, seed = fract(sin(ci.x * 91.7) * 43758.5);
          float head = fract(uTime * (3.0 + seed * 8.0) / rows + seed * 7.0);
          float d = head - (1.0 - (ci.y + 0.5) / rows); if (d < 0.0) d += 1.0;
          float trail = (d < 0.2 && seed > 0.4) ? 1.0 - d / 0.2 : 0.0;
          if (trail > 0.0) {
            float rg = 1.0 + floor(fract(sin(dot(ci, vec2(12.9898, 78.233)) + floor(uTime * 8.0)) * 43758.5) * (uCount - 2.0));
            float rm = texture2D(tAtlas, vec2((rg + local.x) / uTotal, local.y)).r;
            rain = vec3(0.55, 0.95, 1.0) * rm * trail * 0.5 * uSpirit;
          }
        }
        gl_FragColor = vec4(bg + tint * m + rain, 1.0);
      }`
  });
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  postScene.add(quad);

  function buildAtlas() {
    const s = Math.max(4, Math.round(S.cell * DPR));
    const chars = RAMP + EDGE;
    const c = document.createElement('canvas'); c.width = s * chars.length; c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${s}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
    for (let i = 0; i < chars.length; i++) g.fillText(chars[i], i * s + s / 2, s / 2 + s * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (postU.tAtlas.value) postU.tAtlas.value.dispose();
    postU.tAtlas.value = t;
    postU.uCell.value = s;
  }
  buildAtlas();
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('600 16px "IBM Plex Mono"'), new Promise(r => setTimeout(r, 2500))]).then(buildAtlas, () => {});
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = mirrorCam.aspect = w / h;
    camera.updateProjectionMatrix(); mirrorCam.updateProjectionMatrix();
    const bw = Math.floor(w * DPR), bh = Math.floor(h * DPR);
    sceneRT.setSize(bw, bh);
    maskRT.setSize(Math.max(2, bw >> 1), Math.max(2, bh >> 1));
    reflRT.setSize(Math.max(2, bw >> 1), Math.max(2, bh >> 1));
    postU.uRes.value.set(bw, bh);
    waterU.uRes.value.set(bw, bh);
  }
  window.addEventListener('resize', resize);
  resize();
