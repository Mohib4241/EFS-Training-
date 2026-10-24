// Builds the narrator's body meshes from the description in src/scene/human/model.js and writes them to
// one compact file (dist/human.bin) that the page loads. It runs at build time because turning the
// shapes into meshes takes a few seconds; the page only has to unpack the result.
//
// For each mesh: the shape is meshed with surface nets, simplified (fewer triangles where the surface
// is flat, more at the fingers), given its bone weights (each vertex follows the bones of the parts it
// is nearest to, blended where parts meet), and packed with meshoptimizer's compression.
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import { surfaceNets } from '../src/scene/human/nets.js';
import { MESHES, PARTS, BONES, BONE_INDEX, PARENT, JOINTS, armFrame } from '../src/scene/human/model.js';

const VERSION = 3;

// ───────────── bone weights ─────────────
const childrenOf = {}; for (const [n, p] of BONES) if (p) (childrenOf[p] ||= []).push(n);
/** Bones a part's weight may blend into: itself, its parent and grandparent, its children and grandchildren. */
function near(a, b) {
  if (a === b) return true;
  const pa = PARENT[a], pb = PARENT[b];
  return pa === b || pb === a || PARENT[pa] === b || PARENT[pb] === a;
}

function partsFor(id, side) {
  const n = side > 0 ? 'L' : 'R';
  const pick = (re) => PARTS.filter((p) => re.test(p.id));
  switch (id) {
    case 'shirt': return pick(/^(belly|ribs|pecs|lats|traps|neckBase|shoulder[LR]|deltoid[LR]|upperArm[LR]|biceps[LR])$/);
    case 'trousers': return pick(/^(pelvis|glutes|belly|thigh[LR]|quad[LR]|shin[LR]|calf[LR])$/);
    case 'belt': return pick(/^(pelvis|glutes|belly)$/);
    case 'neck': return pick(/^(neckBase|neck|traps)$/);
    case 'arm': return PARTS.filter((p) => p.id.endsWith(n) && /^(shoulder|deltoid|upperArm|biceps|foreArm|palm|heel[LR]$|thenar|index|middle|ring|pinky|thumb)/.test(p.id));
    case 'shoe': case 'sole': return PARTS.filter((p) => new RegExp(`^(foot${n}|heel${n}F|toe${n}|shin${n}|calf${n})$`).test(p.id));
    default: return PARTS;
  }
}

function weights(x, y, z, parts) {
  const best = new Map();
  for (const p of parts) {
    const d = p.f(x, y, z);
    const cur = best.get(p.bone);
    if (!cur || d < cur.d) best.set(p.bone, { d, soft: p.soft });
  }
  let primary = null, dmin = Infinity;
  for (const [b, v] of best) if (v.d < dmin) { dmin = v.d; primary = b; }
  const out = [];
  for (const [b, v] of best) {
    if (!near(b, primary)) continue;
    const w = Math.exp(-(v.d - dmin) / v.soft);
    if (w > 0.01) out.push([b, w]);
  }
  // the forearm turns with the hand along its length: the part near the wrist follows the twist bone
  const res = [];
  for (const [b, w] of out) {
    const m = /^foreArm([LR])$/.exec(b);
    if (!m) { res.push([b, w]); continue; }
    const el = JOINTS[`foreArm${m[1]}`], wr = JOINTS[`hand${m[1]}`];
    const ax = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]], ll = ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2;
    const t = Math.max(0, Math.min(1, ((x - el[0]) * ax[0] + (y - el[1]) * ax[1] + (z - el[2]) * ax[2]) / ll));
    const k = t * t * (3 - 2 * t);
    res.push([b, w * (1 - k)], [`foreTwist${m[1]}`, w * k]);
  }
  res.sort((a, b) => b[1] - a[1]);
  const top = res.slice(0, 4), sum = top.reduce((s, v) => s + v[1], 0) || 1;
  return top.map(([b, w]) => [BONE_INDEX[b], w / sum]);
}

// ───────────── meshing ─────────────
function simplify(m, target) {
  const { positions, indices } = m;
  const scale = MeshoptSimplifier.getScale(positions, 3);
  const [idx] = MeshoptSimplifier.simplify(indices, positions, 3, 0, target / scale, []);
  // keep only the vertices still used
  const remap = new Int32Array(positions.length / 3).fill(-1); let n = 0;
  for (const i of idx) if (remap[i] < 0) remap[i] = n++;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), I = new Uint32Array(idx.length);
  for (let i = 0; i < remap.length; i++) { const r = remap[i]; if (r < 0) continue; for (let k = 0; k < 3; k++) { P[r * 3 + k] = positions[i * 3 + k]; N[r * 3 + k] = m.normals[i * 3 + k]; } }
  for (let i = 0; i < idx.length; i++) I[i] = remap[idx[i]];
  return { positions: P, normals: N, indices: I };
}

function mirror(m) {
  const P = m.positions.slice(), N = m.normals.slice(), I = m.indices.slice();
  for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i]; }
  for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  return { positions: P, normals: N, indices: I };
}

function build(spec, quick) {
  const h = spec.h * (quick ? 1.8 : 1);
  if (spec.frame === 'arm') {
    const F = armFrame(1), f = spec.sdf();
    const g = (a, b, c) => f(F.o[0] + a * F.u[0] + b * F.v[0] + c * F.w[0], F.o[1] + a * F.u[1] + b * F.v[1] + c * F.w[1], F.o[2] + a * F.u[2] + b * F.v[2] + c * F.w[2]);
    const m = surfaceNets(g, F.box[0], F.box[1], h);
    const toW = (arr, isN) => { const out = new Float32Array(arr.length); for (let i = 0; i < arr.length; i += 3) { const a = arr[i], b = arr[i + 1], c = arr[i + 2]; for (let k = 0; k < 3; k++) out[i + k] = (isN ? 0 : F.o[k]) + a * F.u[k] + b * F.v[k] + c * F.w[k]; } return out; };
    return { positions: toW(m.positions, false), normals: toW(m.normals, true), indices: m.indices };
  }
  const f = spec.side ? spec.sdf() : spec.sdf;
  return surfaceNets(f, spec.box[0], spec.box[1], h, { mirrorX: !!spec.mirror });
}

/** Make every mesh: [{ id, mat, side, positions, normals, indices, skinIndex, skinWeight }]. */
export async function generateHuman({ quick = false, log = () => {} } = {}) {
  await MeshoptSimplifier.ready;
  const out = [];
  for (const spec of MESHES) {
    const t0 = Date.now();
    let m = build(spec, quick);
    const before = m.positions.length / 3;
    m = simplify(m, spec.simplify * (quick ? 2 : 1));
    const sides = spec.side ? [[1, m], [-1, mirror(m)]] : [[0, m]];
    for (const [s, mm] of sides) {
      const ps = partsFor(spec.id, s || 1);
      const n = mm.positions.length / 3, si = new Uint8Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const w = weights(mm.positions[i * 3], mm.positions[i * 3 + 1], mm.positions[i * 3 + 2], ps);
        w.forEach(([b, v], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = v; });
      }
      out.push({ id: spec.side ? `${spec.id}${s > 0 ? 'L' : 'R'}` : spec.id, mat: spec.mat, side: s, ...mm, skinIndex: si, skinWeight: sw });
    }
    log(`${spec.id}: ${before} -> ${m.positions.length / 3} vertices, ${m.indices.length / 3} triangles, ${Date.now() - t0} ms`);
  }
  return out;
}

// ───────────── packing ─────────────
// Each vertex: position (3 x int16, scaled to the mesh's box), 2 bytes spare, normal (4 x int8),
// bone indices (4 x uint8), bone weights (4 x uint8) = 20 bytes, then compressed by meshoptimizer.
export async function packHuman(meshes) {
  await MeshoptEncoder.ready;
  const head = { version: VERSION, bones: BONES.length, meshes: [] }, chunks = [];
  let off = 0;
  for (const m of meshes) {
    const n = m.positions.length / 3, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = m.positions[i * 3 + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const buf = new ArrayBuffer(n * 20), dv = new DataView(buf);
    for (let i = 0; i < n; i++) {
      const o = i * 20;
      for (let k = 0; k < 3; k++) dv.setInt16(o + k * 2, Math.round(((m.positions[i * 3 + k] - lo[k]) / ((hi[k] - lo[k]) || 1)) * 65534 - 32767), true);
      for (let k = 0; k < 3; k++) dv.setInt8(o + 8 + k, Math.round(m.normals[i * 3 + k] * 127));
      let ws = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) { dv.setUint8(o + 12 + k, m.skinIndex[i * 4 + k]); ws[k] = Math.round(m.skinWeight[i * 4 + k] * 255); }
      ws[0] += 255 - ws.reduce((a, b) => a + b, 0);                       // the weights add up to exactly 255
      for (let k = 0; k < 4; k++) dv.setUint8(o + 16 + k, ws[k]);
    }
    const vbuf = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(buf), n, 20);
    const ibuf = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength), m.indices.length, 4);
    head.meshes.push({ id: m.id, mat: m.mat, side: m.side, count: n, icount: m.indices.length, lo, hi, v: [off, vbuf.length], i: [off + vbuf.length, ibuf.length] });
    chunks.push(vbuf, ibuf); off += vbuf.length + ibuf.length;
  }
  const json = new TextEncoder().encode(JSON.stringify(head));
  const pad = (4 - ((12 + json.length) % 4)) % 4;
  const total = 12 + json.length + pad + off, out = new Uint8Array(total), dv = new DataView(out.buffer);
  out.set([69, 70, 83, 72], 0); dv.setUint32(4, VERSION, true); dv.setUint32(8, json.length + pad, true);
  out.set(json, 12); for (let i = 0; i < pad; i++) out[12 + json.length + i] = 32;
  let p = 12 + json.length + pad; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

/** Build and write the file, unless one made from the same model is already there. */
export async function writeHuman(file, { force = false, log = console.log } = {}) {
  const srcs = ['src/scene/human/model.js', 'src/scene/human/sdf.js', 'src/scene/human/nets.js', 'tools/human.mjs'];
  const stamp = srcs.map((f) => fs.statSync(f).mtimeMs + ':' + fs.statSync(f).size).join('|');
  const cache = path.join('node_modules', '.cache', 'efs-human');
  fs.mkdirSync(cache, { recursive: true });
  const cfile = path.join(cache, 'human.bin'), sfile = path.join(cache, 'stamp');
  if (!force && fs.existsSync(cfile) && fs.existsSync(sfile) && fs.readFileSync(sfile, 'utf8') === stamp) { fs.copyFileSync(cfile, file); log('human.bin: unchanged'); return; }
  const t0 = Date.now();
  const bin = await packHuman(await generateHuman({ log }));
  fs.writeFileSync(cfile, bin); fs.writeFileSync(sfile, stamp); fs.copyFileSync(cfile, file);
  log(`human.bin: ${(bin.length / 1024).toFixed(0)} KB in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (process.argv[1] && process.argv[1].endsWith('human.mjs')) {
  await writeHuman(process.argv[2] || 'dist/human.bin', { force: process.argv.includes('--force') });
}
