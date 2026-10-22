  if (!window.THREE) { document.body.insertAdjacentHTML('beforeend', '<div id="err">The 3D library did not load. Reload the page to try again.</div>'); return; }
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = { mode: 0, pal: 0, cell: 4, gain: 2.6, edges: true, reflect: true, sound: true };
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { document.body.insertAdjacentHTML('beforeend', '<div id="err">This browser could not start WebGL, which the demo needs.</div>'); return; }
  renderer.setPixelRatio(DPR);
  $('#stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 900);
  const mirrorCam = new THREE.PerspectiveCamera(58, 1, 0.1, 900);

  let seed = 11;
  const sr = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
