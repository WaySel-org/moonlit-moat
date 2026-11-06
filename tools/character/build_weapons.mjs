// Weapons: turns downloaded sword models (.glb) into small, game-ready files for the hero's hand.
//
//   cd tools/character && npm install
//   node build_weapons.mjs <folder holding the source .glb files>
//
// For each sword in WEAPONS below it:
//   - finds the blade's long axis (principal axis of the vertices) and the hilt end (the guard is the widest slice,
//     and the grip is the short side of it), then bakes one transform so the grip centre is the origin, the blade
//     points along +Z, the guard runs along X, and the whole sword is `len` metres long;
//   - resizes every texture to `tex` px and re-encodes it as JPEG (PNG only where alpha is used);
//   - welds, de-duplicates and prunes the rest.
// Writes assets/character/weapons/<id>.glb and assets/character/weapons.json (sizes and credits for THIRD_PARTY.md).
// The game build reads the outputs and never needs node.
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, weld } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../assets/character/weapons');
const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) { console.error('usage: node build_weapons.mjs <folder with the source .glb files>'); process.exit(1); }

// id: name used by content/character/gear.json ("model"), src: file in SRC, len: overall length in metres, tex: max texture size,
// hilt: 'min' | 'max' to override the guard-finding when a curved blade is wider than its guard
const WEAPONS = [
  { id: 'moatwatch', src: 'common_long_sword.glb', len: 1.0, tex: 512 },
  { id: 'nightneedle', src: 'sword.glb', len: 1.0, tex: 512 },
  { id: 'hollowfang', src: 'demon_sword.glb', len: 1.15, tex: 1024 },
  { id: 'wyrmbane', src: 'zweihander_sword.glb', len: 1.42, tex: 1024 },
  { id: 'tidecutter', src: 'pirate_sword.glb', len: 0.85, tex: 512, hilt: 'min' } // the curve is wider than the guard
];

const io = new NodeIO();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
const scale = (a, s) => a.map(v => v * s);
function mulMat4Vec(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]]; }

// Principal axis of a point cloud (power iteration on the covariance)
function principal(pts, mean, dims) {
  const C = Array.from({ length: dims }, () => Array(dims).fill(0));
  for (const p of pts) { const d = p.map((v, i) => v - mean[i]); for (let i = 0; i < dims; i++) for (let j = 0; j < dims; j++) C[i][j] += d[i] * d[j]; }
  let v = Array(dims).fill(0).map((_, i) => i === 0 ? 1 : 0.3);
  for (let k = 0; k < 64; k++) { const w = C.map(r => r.reduce((s, c, j) => s + c * v[j], 0)); const l = Math.hypot(...w) || 1; v = w.map(x => x / l); }
  return v;
}

async function texJpeg(tex, size, keepAlpha) {
  const img = tex.getImage(); if (!img) return;
  let s = sharp(Buffer.from(img)).resize(size, size, { fit: 'inside', withoutEnlargement: true });
  if (keepAlpha) { tex.setImage(new Uint8Array(await s.png({ compressionLevel: 9 }).toBuffer())).setMimeType('image/png'); return; }
  tex.setImage(new Uint8Array(await s.removeAlpha().jpeg({ quality: 84, mozjpeg: true }).toBuffer())).setMimeType('image/jpeg');
  if (tex.getURI()) tex.setURI(tex.getURI().replace(/\.\w+$/, '.jpg'));
}

async function build(w) {
  const doc = await io.read(path.join(SRC, w.src));
  const root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0];
  const credit = doc.getRoot().getAsset().extras || {};
  // Every vertex in world space
  const pts = [];
  root.listNodes().forEach(n => {
    const m = n.getMesh(); if (!m) return;
    const wm = n.getWorldMatrix();
    m.listPrimitives().forEach(p => { const a = p.getAttribute('POSITION'), e = [0, 0, 0]; for (let i = 0; i < a.getCount(); i++) pts.push(mulMat4Vec(wm, a.getElement(i, e))); });
  });
  const mean = [0, 1, 2].map(i => pts.reduce((s, p) => s + p[i], 0) / pts.length);
  const ax = norm(principal(pts, mean, 3));
  const ts = pts.map(p => dot(sub(p, mean), ax)), tmin = Math.min(...ts), tmax = Math.max(...ts), L = tmax - tmin;
  // Width of each slice along the axis; the guard is the widest
  const N = 60, wid = Array(N).fill(0);
  pts.forEach((p, i) => { const k = Math.min(N - 1, Math.floor((ts[i] - tmin) / L * N)); const d = sub(sub(p, mean), scale(ax, ts[i])); wid[k] = Math.max(wid[k], Math.hypot(...d)); });
  let g = wid.indexOf(Math.max(...wid));
  const hiltAtMin = w.hilt ? w.hilt === 'min' : g < N / 2;
  // With an override, the guard is the widest slice in the hilt's quarter
  if (w.hilt) { const q = hiltAtMin ? wid.slice(0, N / 4) : wid.slice(N * 3 / 4); g = q.indexOf(Math.max(...q)) + (hiltAtMin ? 0 : N * 3 / 4); }
  const gT = tmin + (g + 0.5) / N * L;
  const endT = hiltAtMin ? tmin : tmax, gripT = gT + (endT - gT) * 0.42;
  const bladeDir = hiltAtMin ? ax : scale(ax, -1);
  // Guard direction: principal axis of the guard slice, flattened onto the plane across the blade
  const slice = pts.filter((p, i) => Math.abs(ts[i] - gT) < L / N * 1.5).map(p => { const d = sub(p, mean); return sub(d, scale(ax, dot(d, ax))); });
  let gx = principal(slice, [0, 0, 0], 3); gx = norm(sub(gx, scale(bladeDir, dot(gx, bladeDir))));
  const gy = norm(cross(bladeDir, gx));
  // New frame: X = guard, Y = flat of the blade, Z = blade. Rows of the rotation are the new axes in old coordinates.
  const s = w.len / L, grip = [0, 1, 2].map(i => mean[i] + ax[i] * gripT);
  const R = [gx, gy, bladeDir];
  const t = R.map(r => -dot(r, grip) * s);
  // Column-major 4x4: scale * rotation, then translation
  const M = [R[0][0] * s, R[1][0] * s, R[2][0] * s, 0, R[0][1] * s, R[1][1] * s, R[2][1] * s, 0, R[0][2] * s, R[1][2] * s, R[2][2] * s, 0, t[0], t[1], t[2], 1];
  const holder = doc.createNode(w.id).setMatrix(M);
  scene.listChildren().forEach(c => { scene.removeChild(c); holder.addChild(c); });
  scene.addChild(holder);
  // Textures: alpha is kept only for base colours of materials that blend or cut out
  const alphaTex = new Set(root.listMaterials().filter(m => m.getAlphaMode() !== 'OPAQUE').map(m => m.getBaseColorTexture()).filter(Boolean));
  for (const tex of root.listTextures()) await texJpeg(tex, w.tex, alphaTex.has(tex));
  await doc.transform(weld(), dedup(), prune());
  const tris = root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + ((p.getIndices() || p.getAttribute('POSITION')).getCount() / 3), 0), 0);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, w.id + '.glb');
  await io.write(file, doc);
  const before = fs.statSync(path.join(SRC, w.src)).size, after = fs.statSync(file).size;
  console.log(`${w.id.padEnd(12)} ${w.src.padEnd(24)} ${(before / 1024).toFixed(0).padStart(6)} KB -> ${(after / 1024).toFixed(0).padStart(5)} KB, ${tris} tris, hilt at ${hiltAtMin ? 'min' : 'max'}`);
  return { id: w.id, file: w.id + '.glb', len: w.len, tris, kb: Math.round(after / 1024), source: w.src, title: credit.title, author: credit.author, license: credit.license, url: credit.source };
}

const out = [];
for (const w of WEAPONS) out.push(await build(w));
fs.writeFileSync(path.resolve(OUT, '../weapons.json'), JSON.stringify({ note: 'Generated by tools/character/build_weapons.mjs. Do not edit by hand.', weapons: out }, null, 2) + '\n');
