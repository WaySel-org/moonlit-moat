// Character kit: turns the CC0 Quaternius packs into the files the character builder loads.
//
//   cd tools/character && npm install
//   node build_kit.mjs <folder holding the unzipped packs>
//
// Packs (all CC0, free on quaternius.itch.io, "Standard" downloads):
//   Universal Base Characters, Modular Character Outfits - Fantasy,
//   Universal Animation Library, Universal Animation Library 2
//
// Writes assets/character/:
//   kit.glb     every body, hair, beard and outfit mesh, skinned to the shared 65-bone rig, with no textures.
//               The bare bodies are cut into regions (head, neck, torso, arms, hands, hips, legs, feet) so gear can hide
//               whatever it covers instead of clipping through it.
//   anims.glb   the animation clips the hero uses, with no mesh. Only the pelvis keeps its translation, so a clip
//               fits any body; scale tracks are dropped.
//   tex/*.jpg   textures at 1024 px (eyes at 256). Skin and hair are "tint maps": each channel divided by the
//               texture's average colour, so the game multiplies by any skin tone or hair colour it likes.
//   kit.json    what is inside, for tools/build.py to check the catalogue in content/character/ against.
//
// Run it only when the kit changes; the game build reads the outputs and never needs node.
import { NodeIO, Document } from '@gltf-transform/core';
import { mergeDocuments, prune, dedup, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../assets/character');
const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) { console.error('usage: node build_kit.mjs <folder with the unzipped Quaternius packs>'); process.exit(1); }

// Find a file by name anywhere under SRC, preferring a path that contains every hint
function find(name, ...hints) {
  const hits = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === name) hits.push(p); } })(SRC);
  const ok = hits.filter(p => hints.every(h => p.includes(h)));
  if (!ok.length) throw new Error(`not found: ${name} ${hints.join(' ')}`);
  return ok[0];
}

const io = new NodeIO();
// Read a .gltf without its images: some packs name textures that aren't shipped next to the file, and the kit drops them anyway
async function readMesh(file) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete json.images; delete json.textures; delete json.samplers;
  (json.materials || []).forEach(m => {
    delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture;
    if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; }
  });
  const resources = {};
  (json.buffers || []).forEach(b => { if (b.uri) resources[b.uri] = new Uint8Array(fs.readFileSync(path.join(path.dirname(file), decodeURIComponent(b.uri)))); });
  return io.readJSON({ json, resources });
}

// ---------- Meshes ----------
// Region of the bare body each bone belongs to. A triangle goes to the region holding most of its weight.
const REGION = b => /^Head$/.test(b) ? 'head' : /^neck_01$/.test(b) ? 'neck'
  : /^(hand|thumb|index|middle|ring|pinky)_/.test(b) ? 'hands'
  : /^(upperarm|lowerarm)_/.test(b) ? 'arms'
  : /^(spine_0[23]|clavicle_)/.test(b) ? 'torso'
  : /^(pelvis|spine_01|root)$/.test(b) ? 'hips'
  : /^(thigh|calf)_/.test(b) ? 'legs'
  : /^(foot|ball)_/.test(b) ? 'feet' : 'torso';

// Source file -> { mesh name in the file: node name in the kit }. The bare body is split, so it is named by prefix.
const SOURCES = [
  [find('Superhero_Male_FullBody.gltf', 'Godot'), { 'Sphere.005_Retopology.004': 'split:M_Body', 'Face': 'M_Brows', 'Face.001': 'M_Eyes' }],
  [find('Superhero_Female_FullBody.gltf', 'Godot'), { 'Superhero_Female': 'split:F_Body', 'Eyebrows': 'F_Brows', 'Eyes': 'F_Eyes' }],
  ...['Hair_Long', 'Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_SimpleParted', 'Hair_Beard', 'Eyebrows_Regular', 'Eyebrows_Female']
    .map(h => [find(h + '.gltf', 'Rigged to Head Bone'), { '*': h }]),
  ...['Male_Ranger', 'Male_Peasant', 'Female_Ranger', 'Female_Peasant'].map(o => [find(o + '.gltf', 'Outfits', 'glTF'), {
    '*': n => n.replace(/^Male_/, 'M_').replace(/^Female_/, 'F_').replace('Body_Belt_1.001', 'Body_Belt_2').replace('Feet_Boots', 'Feet')
  }])
];

function splitBody(doc, node, prefix) {
  const mesh = node.getMesh(), prim = mesh.listPrimitives()[0], skin = node.getSkin();
  const names = skin.listJoints().map(j => j.getName());
  const J = prim.getAttribute('JOINTS_0').getArray(), W = prim.getAttribute('WEIGHTS_0').getArray(), I = prim.getIndices().getArray();
  const buckets = {};
  for (let t = 0; t < I.length; t += 3) {
    const score = {};
    for (let k = 0; k < 3; k++) for (let c = 0; c < 4; c++) { const v = I[t + k]; const r = REGION(names[J[v * 4 + c]]); score[r] = (score[r] || 0) + W[v * 4 + c]; }
    const r = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
    (buckets[r] = buckets[r] || []).push(I[t], I[t + 1], I[t + 2]);
  }
  const parent = node.getParentNode();
  const out = [];
  for (const [r, idx] of Object.entries(buckets)) {
    const p = prim.clone();
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(prim.getIndices().getBuffer()));
    const m = doc.createMesh(`${prefix}_${r[0].toUpperCase()}${r.slice(1)}`).addPrimitive(p);
    const n = doc.createNode(m.getName()).setMesh(m).setSkin(skin).setMatrix(node.getMatrix());
    (parent || doc.getRoot().listScenes()[0]).addChild(n);
    out.push(m.getName());
  }
  node.detach(); node.dispose(); mesh.dispose();
  return out;
}

async function buildKit() {
  const kit = new Document(); kit.createBuffer();
  const nodes = [];
  for (const [file, map] of SOURCES) {
    const doc = await readMesh(file);
    for (const n of doc.getRoot().listNodes()) {
      const m = n.getMesh(); if (!m) continue;
      const rule = map[m.getName()] || map['*'];
      if (!rule) { n.detach(); n.dispose(); continue; }
      const name = typeof rule === 'function' ? rule(m.getName()) : rule;
      if (name.startsWith('split:')) { nodes.push(...splitBody(doc, n, name.slice(6))); continue; }
      n.setName(name); m.setName(name); nodes.push(name);
    }
    // Textures ship separately as tint maps, so drop them here; material names stay so the game knows skin from cloth
    doc.getRoot().listMaterials().forEach(mt => {
      mt.setBaseColorTexture(null).setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null);
    });
    doc.getRoot().listTextures().forEach(t => t.dispose());
    const buf = doc.getRoot().listBuffers();
    buf.slice(1).forEach(b => { doc.getRoot().listAccessors().forEach(a => a.getBuffer() === b && a.setBuffer(buf[0])); b.dispose(); });
    mergeDocuments(kit, doc);
  }
  // One scene, one buffer
  const root = kit.getRoot(), scenes = root.listScenes(), main = scenes[0];
  scenes.slice(1).forEach(s => { s.listChildren().forEach(c => main.addChild(c)); s.dispose(); });
  root.setDefaultScene(main);
  const bufs = root.listBuffers();
  root.listAccessors().forEach(a => a.setBuffer(bufs[0])); bufs.slice(1).forEach(b => b.dispose());
  await kit.transform(dedup(), prune());
  await io.write(path.join(OUT, 'kit.glb'), kit);
  return nodes.sort();
}

// ---------- Animations ----------
const CLIPS = {
  UAL1_Standard: ['Idle_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Roll', 'Death01', 'Hit_Chest', 'Hit_Head',
    'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Sword_Attack', 'Sword_Idle', 'Spell_Simple_Enter', 'Spell_Simple_Shoot', 'Spell_Simple_Idle_Loop',
    'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Sitting_Idle_Loop', 'Driving_Loop', 'Idle_Torch_Loop', 'Punch_Cross', 'Dance_Loop',
    'Idle_Talking_Loop', 'Interact', 'PickUp_Table'],
  UAL2_Standard: ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C', 'Sword_Regular_Combo', 'Sword_Heavy_Combo', 'Sword_Block',
    'Sword_Dash', 'Shield_Dash', 'Idle_Shield_Loop', 'Shield_OneShot', 'Idle_Lantern_Loop', 'Consume', 'OverhandThrow', 'Hit_Knockback',
    'NinjaJump_Start', 'NinjaJump_Idle_Loop', 'NinjaJump_Land', 'Idle_FoldArms_Loop', 'Yes', 'Melee_Hook', 'Chest_Open', 'Slide_Start', 'Slide_Loop']
};
async function buildAnims() {
  const out = new Document(); out.createBuffer();
  const kept = [];
  for (const [file, want] of Object.entries(CLIPS)) {
    const doc = await io.read(find(file + '.glb', 'Unreal-Godot'));
    const root = doc.getRoot();
    root.listAnimations().forEach(a => {
      if (!want.includes(a.getName())) { a.dispose(); return; }
      kept.push(a.getName());
      a.listChannels().forEach(c => {
        const p = c.getTargetPath(), n = c.getTargetNode();
        if (p === 'scale' || (p === 'translation' && n.getName() !== 'pelvis')) { const s = c.getSampler(); c.dispose(); s.dispose(); }
      });
    });
    root.listNodes().forEach(n => { if (n.getMesh()) { n.setMesh(null).setSkin(null); } });
    root.listMeshes().forEach(m => m.dispose()); root.listSkins().forEach(s => s.dispose());
    root.listMaterials().forEach(m => m.dispose()); root.listTextures().forEach(t => t.dispose());
    const bufs = root.listBuffers(); root.listAccessors().forEach(a => a.setBuffer(bufs[0])); bufs.slice(1).forEach(b => b.dispose());
    mergeDocuments(out, doc);
  }
  const root = out.getRoot(), scenes = root.listScenes();
  scenes.slice(1).forEach(s => { s.listChildren().forEach(c => scenes[0].addChild(c)); s.dispose(); });
  root.setDefaultScene(scenes[0]);
  const bufs = root.listBuffers(); root.listAccessors().forEach(a => a.setBuffer(bufs[0])); bufs.slice(1).forEach(b => b.dispose());
  await out.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true }));
  await io.write(path.join(OUT, 'anims.glb'), out);
  return kept.sort();
}

// ---------- Textures ----------
// Tint map: each channel over the average of the texture's non-black pixels, times 0.5, so the game's colour x 2 gives back
// that colour on average while keeping the texture's shading, pores and lip colour.
async function tintMap(src, dst, size) {
  const img = sharp(src).removeAlpha().resize(size, size);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0]; let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] + data[i + 1] + data[i + 2] < 30) continue;
    sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++;
  }
  const k = sum.map(s => 127.5 / (s / Math.max(1, n)));
  for (let i = 0; i < data.length; i += info.channels) for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, data[i + c] * k[c]);
  await sharp(data, { raw: info }).jpeg({ quality: 88, mozjpeg: true }).toFile(dst);
}
async function plain(src, dst, size, q = 86) { await sharp(src).removeAlpha().resize(size, size).jpeg({ quality: q, mozjpeg: true }).toFile(dst); }
// Hair cards need their alpha
async function withAlpha(src, dst, size) {
  const m = await sharp(src).metadata();
  if (!m.hasAlpha) return tintMap(src, dst + '.jpg', size).then(() => dst + '.jpg');
  const { data, info } = await sharp(src).resize(size, size).raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0]; let n = 0;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 128) continue; sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++; }
  const k = sum.map(s => 127.5 / (s / Math.max(1, n)));
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, data[i + c] * k[c]);
  await sharp(data, { raw: info }).png({ compressionLevel: 9, palette: false }).toFile(dst + '.png');
  return dst + '.png';
}

async function buildTextures() {
  const T = path.join(OUT, 'tex'); fs.mkdirSync(T, { recursive: true });
  const base = (n, ...h) => find(n, 'Base Characters', ...h);
  const outfit = (n, ...h) => find(n, 'Modular Character Outfits', 'Textures', ...h);
  const jobs = [
    tintMap(base('T_Superhero_Male_Ligh.png'), path.join(T, 'skin_m.jpg'), 1024),
    tintMap(base('T_Superhero_Female_Light_BaseColor.png'), path.join(T, 'skin_f.jpg'), 1024),
    plain(base('T_Superhero_Male_Normal.png', 'Normals Unity'), path.join(T, 'skin_m_n.jpg'), 1024, 90),
    plain(base('T_Superhero_Female_Normal.png', 'Normals Unity'), path.join(T, 'skin_f_n.jpg'), 1024, 90),
    tintMap(outfit('T_Regular_Male_Dark_BaseColor.png', 'Base'), path.join(T, 'reg_m.jpg'), 1024),
    tintMap(outfit('T_Regular_Female_Dark_BaseColor.png', 'Base'), path.join(T, 'reg_f.jpg'), 1024),
    plain(outfit('T_Regular_Male_Normal.png', 'Base'), path.join(T, 'reg_m_n.jpg'), 1024, 90),
    plain(outfit('T_Regular_Female_Normal.png', 'Base'), path.join(T, 'reg_f_n.jpg'), 1024, 90),
    withAlpha(find('T_Hair_1_BaseColor.png', 'Hairstyles'), path.join(T, 'hair_1'), 1024),
    withAlpha(find('T_Hair_2_BaseColor.png', 'Hairstyles'), path.join(T, 'hair_2'), 1024),
    plain(outfit('T_Ranger_BaseColor.png', 'Ranger'), path.join(T, 'ranger_a.jpg'), 1024),
    plain(outfit('T_Ranger_3_BaseColor.png', 'Ranger'), path.join(T, 'ranger_b.jpg'), 1024),
    plain(outfit('T_Ranger_Normal.png', 'Ranger'), path.join(T, 'ranger_n.jpg'), 1024, 90),
    plain(outfit('T_Peasant_BaseColor.png', 'Peasant'), path.join(T, 'peasant_a.jpg'), 1024),
    plain(outfit('T_Peasant_2_BaseColor.png', 'Peasant'), path.join(T, 'peasant_b.jpg'), 1024),
    plain(outfit('T_Peasant_Normal.png', 'Peasant'), path.join(T, 'peasant_n.jpg'), 1024, 90),
  ];
  // Eye colours: the source iris is brown; hue-shift it for the rest (the whites barely change)
  const eye = base('T_Eye_Brown.png');
  const EYES = { brown: [0, 1, 1], hazel: [35, 1.1, 1.05], green: [80, 1.2, 1.05], blue: [190, 1.3, 1.1], grey: [0, 0.15, 1.15], amber: [15, 1.6, 1.15], violet: [250, 1.3, 1.1] };
  for (const [k, [hue, sat, br]] of Object.entries(EYES))
    jobs.push(sharp(eye).removeAlpha().resize(256, 256).modulate({ hue, saturation: sat, brightness: br }).jpeg({ quality: 88 }).toFile(path.join(T, `eye_${k}.jpg`)));
  await Promise.all(jobs);
  return fs.readdirSync(T).sort();
}

fs.mkdirSync(OUT, { recursive: true });
const [nodes, clips, textures] = [await buildKit(), await buildAnims(), await buildTextures()];
fs.writeFileSync(path.join(OUT, 'kit.json'), JSON.stringify({
  note: 'Generated by tools/character/build_kit.mjs from the CC0 Quaternius packs. Do not edit by hand.',
  nodes, clips, textures
}, null, 2) + '\n');
const size = f => (fs.statSync(path.join(OUT, f)).size / 1048576).toFixed(2) + ' MB';
console.log(`kit.glb ${size('kit.glb')} (${nodes.length} meshes), anims.glb ${size('anims.glb')} (${clips.length} clips), ${textures.length} textures`);
