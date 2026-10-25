// Loads the narrator's body (dist/human.bin, made at build time by tools/human.mjs) and builds a
// skinned character from it: a skeleton of bones and the meshes that bend with them (the polo, the
// trousers, the belt, the shoes and the bare skin of the neck, arms and hands).
//
// The file is read once; every character made after that shares the geometry and has its own bones.
import * as THREE from 'three';
import { BONES, JOINTS, ARM_DIR, L } from './model.js';

const state = { data: null };

/** The body data, once loaded. */
export const humanData = () => state.data;
/** Use body data made some other way (the tests make it directly). */
export function setHumanData(d) { state.data = d; }

/** Fetch and unpack dist/human.bin. */
export async function loadHuman(url = 'human.bin') {
  if (state.data) return state.data;
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  await MeshoptDecoder.ready;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  state.data = unpack(buf, MeshoptDecoder);
  return state.data;
}

/** Unpack the file into plain arrays for each mesh. */
export function unpack(buf, decoder) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'EFSH') throw new Error('not a body file');
  const jlen = dv.getUint32(8, true);
  const head = JSON.parse(new TextDecoder().decode(buf.subarray(12, 12 + jlen)));
  const base = 12 + jlen, meshes = [];
  for (const m of head.meshes) {
    const raw = new Uint8Array(m.count * 20);
    decoder.decodeVertexBuffer(raw, m.count, 20, buf.subarray(base + m.v[0], base + m.v[0] + m.v[1]));
    const idx = new Uint32Array(m.icount);
    decoder.decodeIndexBuffer(new Uint8Array(idx.buffer), m.icount, 4, buf.subarray(base + m.i[0], base + m.i[0] + m.i[1]));
    const rv = new DataView(raw.buffer), n = m.count;
    const positions = new Float32Array(n * 3), normals = new Float32Array(n * 3), skinIndex = new Uint8Array(n * 4), skinWeight = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const o = i * 20;
      for (let k = 0; k < 3; k++) positions[i * 3 + k] = m.lo[k] + ((rv.getInt16(o + k * 2, true) + 32767) / 65534) * (m.hi[k] - m.lo[k]);
      for (let k = 0; k < 3; k++) normals[i * 3 + k] = rv.getInt8(o + 8 + k) / 127;
      for (let k = 0; k < 4; k++) { skinIndex[i * 4 + k] = rv.getUint8(o + 12 + k); skinWeight[i * 4 + k] = rv.getUint8(o + 16 + k); }
    }
    meshes.push({ id: m.id, mat: m.mat, side: m.side, positions, normals, indices: idx, skinIndex, skinWeight });
  }
  return { meshes };
}

/** Raw meshes (as the generator makes them) to the same form as an unpacked file. */
export function fromGenerated(list) {
  return {
    meshes: list.map((m) => {
      const sw = new Uint8Array(m.skinWeight.length);
      for (let i = 0; i < sw.length; i += 4) { let t = 0; for (let k = 0; k < 4; k++) { sw[i + k] = Math.round(m.skinWeight[i + k] * 255); t += sw[i + k]; } sw[i] += 255 - t; }
      return { id: m.id, mat: m.mat, side: m.side, positions: m.positions, normals: m.normals, indices: m.indices, skinIndex: m.skinIndex, skinWeight: sw };
    }),
  };
}

const geoCache = new WeakMap();
/** Three.js geometries for the body data (made once and shared). */
function geometries(data) {
  if (geoCache.has(data)) return geoCache.get(data);
  const out = {};
  for (const m of data.meshes) {
    const g = new THREE.BufferGeometry();
    g.userData.shared = true;
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    g.setAttribute('skinIndex', new THREE.Uint8BufferAttribute(m.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Uint8BufferAttribute(m.skinWeight, 4, true));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.setAttribute('uv', new THREE.BufferAttribute(fabricUV(m), 2));
    if (m.id.startsWith('arm')) {
      g.setAttribute('glove', new THREE.BufferAttribute(gloveMask(m), 1));
      g.setAttribute('gloveAlong', new THREE.BufferAttribute(gloveMask(m, true), 1));
    }
    g.computeBoundingSphere();
    out[m.id] = { geo: g, mat: m.mat, side: m.side };
  }
  geoCache.set(data, out);
  return out;
}

/**
 * Texture co-ordinates for cloth: round the body (or round the limb) and along it, in metres, so a
 * knit texture repeats at the same size everywhere.
 */
function fabricUV(m) {
  const P = m.positions, n = P.length / 3, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    let u, v;
    if (m.id.startsWith('arm')) { u = Math.atan2(z, y - 1.2) * 0.06; v = Math.hypot(x, y) ; }
    else { u = Math.atan2(x, z) * 0.16; v = y; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  return uv;
}

/** Where a glove covers an arm: the hand and a little of the wrist (1), the rest of the arm (0). */
function gloveMask(m, along = false) {
  const s = m.id.endsWith('L') ? 1 : -1, sh = JOINTS[s > 0 ? 'upperArmL' : 'upperArmR'], d = ARM_DIR(s), P = m.positions, n = P.length / 3;
  const wrist = L.upper + L.fore, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (P[i * 3] - sh[0]) * d[0] + (P[i * 3 + 1] - sh[1]) * d[1] + (P[i * 3 + 2] - sh[2]) * d[2];
    const k = Math.max(0, Math.min(1, (t - (wrist - 0.045)) / 0.012));
    // Distance down the hand lets a glove slide from the fingertips toward the cuff during fitting.
    out[i] = along ? Math.max(0, Math.min(1, (t - (wrist - 0.045)) / 0.24)) : k * k * (3 - 2 * k);
  }
  return out;
}

/**
 * Make a character: { root, bones (by name), skeleton, meshes (by id) }. `materials` maps the mesh
 * material names (shirt, trousers, belt, shoe, skin) to three.js materials.
 */
export function makeBody(materials, data = state.data) {
  if (!data) throw new Error('the body data is not loaded (call loadHuman first)');
  const root = new THREE.Group(); root.name = 'body';
  const bones = {}, list = [];
  const at = {};
  for (const [name, parent, p] of BONES) {
    const b = new THREE.Bone(); b.name = name;
    const pp = parent ? at[parent] : [0, 0, 0];
    b.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    at[name] = p; bones[name] = b; list.push(b);
    if (parent) bones[parent].add(b); else root.add(b);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const meshes = {};
  for (const [id, { geo, mat }] of Object.entries(geometries(data))) {
    const mesh = new THREE.SkinnedMesh(geo, materials[mat] || materials.skin);
    mesh.name = id; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    root.add(mesh);
    mesh.bind(skeleton);
    meshes[id] = mesh;
  }
  return { root, bones, skeleton, meshes, bind: at };
}
