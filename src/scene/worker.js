// The narrator as the worker in every lesson: the skinned body from human/ (polo, trousers, belt, shoes,
// bare arms and hands) with the face rig from character.js on top, moved by code:
//
//   - walking with real steps: each foot stays planted on the floor until it is its turn to step, then
//     lifts, swings and lands ahead, heel first, rolling off the toes; the pelvis bobs and sways over
//     the standing foot, the shoulders turn against the hips and the arms swing;
//   - turning on the spot is done with small steps, not by sliding the feet round;
//   - crouching and kneeling bend the knees with the feet kept on the floor;
//   - hands reach points in the room (inverse kinematics, the elbow pointing down and out), turned the
//     way a real hand would hold the thing; when a hand cannot reach, the body leans towards it;
//   - fingers relax, grip a handle, point, spread for a wave;
//   - the head looks at what the worker is doing, the eyes leading; standing still, the weight shifts
//     slowly from one leg to the other and the chest breathes;
//   - gloves, safety glasses and a plaster can be put on and taken off.
//
// The person faces +Z in their own frame; `root.rotation.y` is the heading. Left and right are the
// person's own: their left is +X.
import * as THREE from 'three';
import { makeBody } from './human/body.js';
import { Rig } from './human/rig.js';
import { JOINTS, ARM_DIR, L as LEN, shirtSDF } from './human/model.js';
import { Head, FACE, chestLogo } from './character.js';
import { canvasTex, rng } from './tex.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Q = () => new THREE.Quaternion();
const UP = V(0, 1, 0), XA = V(1, 0, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Old named poses still work: lean, twist, head, crouch, kneel, and arm angles [forward, out, elbow].
export const POSES = {
  idle: {},
  think: { armR: [0.9, 0.2, 2.1], headPitch: 0.1, headYaw: 0.15 },
  point: { armR: [1.45, 0.15, 0.2], headYaw: -0.1 },
  hold: { armR: [0.9, 0.12, 1.3], armL: [0.9, 0.12, 1.3] },
  carry: { armR: [0.5, 0.1, 1.5], armL: [0.5, 0.1, 1.5] },
  wash: { armR: [0.7, 0.2, 1.8], armL: [0.7, 0.2, 1.8], lean: 0.12, headPitch: 0.3 },
  look: { headPitch: 0.35, lean: 0.06 },
  inspect: { armR: [0.8, 0.15, 1.7], armL: [0.6, 0.15, 1.7], headPitch: 0.45, lean: 0.12 },
  wave: { armR: [0.4, 1.1, 1.4] },
  bow: { lean: 0.55, armR: [0.2, 0.1, 0.1], armL: [0.2, 0.1, 0.1] },
  folded: {},
};
const REST_ARM = [0.05, 0.1, 0.12];
const BASE = () => ({ lean: 0, twist: 0, headPitch: 0, headYaw: 0, crouch: 0, kneel: 0, armR: REST_ARM.slice(), armL: REST_ARM.slice(), shake: 0 });

// The feet, in the person's own frame (left foot; the right is mirrored): the point under the middle of
// the sole, the ball of the foot and the heel on the floor, and the ankle.
const AN = JOINTS.footL;
const FOOT = { mid: V(0.1, 0, 0.055), ball: V(0.103, 0, 0.118), heel: V(0.098, 0, -0.07), ankle: V(AN[0], AN[1], AN[2]) };
const HIP_H = JOINTS.thighL[1], PELVIS_H = JOINTS.hips[1];

// Cloth: a fine knit for the polo, and a twill for the trousers, as bumps.
function knit() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      const ox = (y / 8) % 2 ? 4 : 0, gr = g.createRadialGradient(x + ox + 4, y + 4, 0, x + ox + 4, y + 4, 4.5);
      gr.addColorStop(0, '#c8c8c8'); gr.addColorStop(1, '#5a5a5a'); g.fillStyle = gr; g.fillRect(x + ox, y, 8, 8);
    }
  }, { repeat: [70, 70], srgb: false, aniso: 4 });
}
function twill() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8a8a8'; g.lineWidth = 2;
    for (let i = -h; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
  }, { repeat: [90, 90], srgb: false, aniso: 4 });
}

/** The cloth materials, made once and shared by every worker. */
function clothes(M) {
  if (M._clothes) return M._clothes;
  const k = knit(), tw = twill();
  M._clothes = {
    shirt: new THREE.MeshPhysicalMaterial({ color: 0xeef0f2, roughness: 0.86, sheen: 0.7, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.75, bumpMap: k, bumpScale: 0.6 }),
    trousers: new THREE.MeshPhysicalMaterial({ color: 0x252c39, roughness: 0.84, sheen: 0.5, sheenColor: new THREE.Color(0x8a97b0), sheenRoughness: 0.7, bumpMap: tw, bumpScale: 0.5 }),
    belt: new THREE.MeshPhysicalMaterial({ color: 0x141517, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: 0x0f1012, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.3 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.92 }),
  };
  return M._clothes;
}

/** Skin that a pair of blue gloves can cover (the arm meshes mark the hand with a "glove" attribute). */
function gloveSkin(M) {
  const m = M.skin.clone();
  m.userData.glove = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlove = m.userData.glove;
    sh.uniforms.uGloveColor = { value: new THREE.Color(0x2f86e8) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float glove;\nvarying float vGlove;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlove = glove;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlove;\nuniform vec3 uGloveColor;\nvarying float vGlove;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uGloveColor, vGlove * uGlove);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.38, vGlove * uGlove);');
  };
  m.customProgramCacheKey = () => 'glove-skin';
  return m;
}

/**
 * The polo collar, in the bind pose: a band standing round the neck, open at the front, and the collar
 * folded down over it, lying on the shirt, with its two points on the chest. The fold is found by
 * pressing points onto the shirt's surface, so it sits on the cloth wherever the shoulders slope.
 */
function poloCollar(M) {
  const g = new THREE.Group();
  const cy = 1.418, cz = -0.03, gap = 0.48, N = 40, ROWS = 6;
  const neckR = (y) => 0.0655 - (y - 1.37) * 0.06;                   // the neck's radius at height y (see model.js)
  const onShirt = (p, lift) => {                                        // press a point onto the shirt, `lift` outside it
    for (let i = 0; i < 12; i++) {
      const d = shirtSDF(p.x, p.y, p.z) - lift, e = 0.0007;
      const gx = shirtSDF(p.x + e, p.y, p.z) - shirtSDF(p.x - e, p.y, p.z), gy = shirtSDF(p.x, p.y + e, p.z) - shirtSDF(p.x, p.y - e, p.z), gz = shirtSDF(p.x, p.y, p.z + e) - shirtSDF(p.x, p.y, p.z - e);
      const l = Math.hypot(gx, gy, gz) || 1; p.x -= gx / l * d; p.y -= gy / l * d; p.z -= gz / l * d;
      if (Math.abs(d) < 0.0003) break;
    }
    return p;
  };
  const pos = [], idx = [], bandPos = [], bandIdx = [];
  for (let i = 0; i <= N; i++) {
    const a = gap + (i / N) * (Math.PI * 2 - 2 * gap);                  // from the front left, round the back, to the front right
    const front = Math.pow(Math.max(Math.cos(a), 0), 2.2);              // 1 at the front, 0 at the sides and back
    const dx = Math.sin(a), dz = Math.cos(a);
    // the band: from the neckline up 3 cm, just outside the neck
    const r0 = neckR(cy) + 0.005, r1 = neckR(cy + 0.03) + 0.004;
    bandPos.push(dx * r0, cy - 0.006, cz + dz * r0, dx * r1, cy + 0.028 - front * 0.012, cz + dz * r1);
    // the fold: from the top of the band, out and down onto the shirt; longer at the front, to the points
    const top = V(dx * (r1 + 0.006), cy + 0.03 - front * 0.012, cz + dz * (r1 + 0.006));
    const reach = 0.038 + front * 0.022, tip = i === 0 || i === N ? 1 : 0;
    for (let r = 0; r <= ROWS; r++) {
      const u = r / ROWS;
      let p = V(dx * (r1 + 0.01 + reach * 0.75 * u), top.y - reach * u * (0.55 + front * 0.6), cz + dz * (r1 + 0.01 + reach * 0.5 * u));
      if (tip && r === ROWS) { p.x *= 1.18; p.y -= 0.008; }                 // the collar points
      if (u > 0.25) p = onShirt(p, 0.003 + 0.002 * (1 - u));
      else p.lerp(onShirt(p.clone(), 0.004), u / 0.25 * 0.6).add(V(0, 0.002 * (1 - u / 0.25), 0));
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < N; i++) for (let r = 0; r < ROWS; r++) {
    const a = i * (ROWS + 1) + r, b = a + ROWS + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  for (let i = 0; i < N; i++) { const a = i * 2, b = a + 2; bandIdx.push(a, b, a + 1, a + 1, b, b + 1); }
  const mk = (P, I) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals(); return geo; };
  const mat = M.poloBlue.clone(); mat.side = THREE.DoubleSide;
  const fold = new THREE.Mesh(mk(pos, idx), mat), band = new THREE.Mesh(mk(bandPos, bandIdx), mat);
  for (const m of [fold, band]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  return g;
}

/** How far forward the polo's surface is at (x, y) on the front of the chest (in the bind pose). */
function shirtFront(x, y) {
  let lo = 0, hi = 0.25;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (shirtSDF(x, y, m) < 0) lo = m; else hi = m; }
  return lo;
}

export class Worker {
  constructor(M) {
    this.M = M;
    this.root = new THREE.Group();
    this.heading = 0; this.root.rotation.y = 0;
    this.t = 0;
    this.cur = BASE(); this.tgt = BASE();
    this.ik = { R: null, L: null };            // world target (Vector3 or () => Vector3) per hand
    this.pole = { R: null, L: null };          // where the elbow points while reaching (in the person's own frame)
    this.ikOpt = { R: {}, L: {} };
    this.ikW = { R: 0, L: 0 };
    this.gaze = null;
    this.ppe = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.ppeT = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.speed = 0; this.vel = V(); this._v = 0; this._moved = false;
    this.stride = 1;
    this.sway = 0.35;
    this.grip = { R: 0.22, L: 0.22 }; this.gripT = { R: 0.22, L: 0.22 };
    this.point = { R: 0, L: 0 }; this.pointT = { R: 0, L: 0 };
    this.spread = { R: 0, L: 0 }; this.spreadT = { R: 0, L: 0 };
    this.folded = false;
    this.talking = false;
    this._r = rng(17);
    this._lean = 0; this._extraLean = 0; this._prot = { R: 0, L: 0 };
    this._gy = 0; this._gp = 0; this._idle = { yaw: 0, pitch: 0, next: 1.5, ty: 0, tp: 0 };
    this._build();
    this._initFeet();
  }

  // ───────────── building ─────────────
  _build() {
    const M = this.M, C = clothes(M);
    this.skinArm = gloveSkin(M);
    const body = this.body = makeBody({ ...C, skin: M.skin });
    for (const id of ['armL', 'armR']) if (body.meshes[id]) body.meshes[id].material = this.skinArm;
    this.root.add(body.root);
    this.bones = body.bones;
    this.rig = new Rig(body);

    // the head: the shared face rig, without its own neck (the body has one)
    this.face = new Head(M, { neck: false });
    // Slightly smaller than the early prototype: it gives the shared guide the adult proportions of
    // the supplied reference while preserving the same fully-rigged face in all lessons and labs.
    this.head = this.face.group; this.head.scale.setScalar(1.16); this.head.position.y = -0.025;
    this.bones.head.add(this.head);

    // polo details on the chest: the blue collar, the placket with two buttons, and the EFS mark
    const chest = this.bones.chest, cb = JOINTS.chest;
    const onChest = (o, x, y, dz = 0) => { o.position.set(x - cb[0], y - cb[1], shirtFront(x, y) + dz - cb[2]); chest.add(o); return o; };
    const collar = poloCollar(M); collar.position.set(-cb[0], -cb[1], -cb[2]); chest.add(collar);
    this.collar = collar;
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.115, 0.006), C.shirt); placket.castShadow = false; onChest(placket, 0, 1.36, 0.001);
    placket.rotation.x = -0.12;
    for (const y of [1.39, 1.335]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 14), M.button); b.rotation.x = Math.PI / 2 - 0.12; onChest(b, 0, y, 0.005); }
    this.logo = chestLogo(); this.logo.scale.setScalar(1.15); onChest(this.logo, 0.088, 1.315, 0.003);
    this.logo.rotation.y = 0.32; this.logo.rotation.x = -0.1;

    // safety glasses on the face
    this.glasses = new THREE.Group(); this.head.add(this.glasses);
    const gz = this.face.zAt(0.037, FACE.eyeY) + 0.028;
    const g = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); this.glasses.add(m); return m; };
    for (const s of [-1, 1]) {
      g(new THREE.TorusGeometry(0.0285, 0.0034, 8, 24), M.black, s * FACE.eyeX, FACE.eyeY, gz);
      g(new THREE.CircleGeometry(0.0282, 22), M.glass, s * FACE.eyeX, FACE.eyeY, gz + 0.0004);
      g(new THREE.BoxGeometry(0.0035, 0.006, 0.105), M.black, s * 0.0905, FACE.eyeY + 0.004, gz - 0.054);
    }
    g(new THREE.BoxGeometry(0.02, 0.005, 0.006), M.black, 0, FACE.eyeY + 0.004, gz);
    this.glasses.visible = false;

    // a blue waterproof plaster round the left forefinger
    this.plaster = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0108, 0.016, 16, 1, true), M.plasterBlue);
    const i1 = this.bones.index2L, ip = JOINTS.handL; this.plaster.visible = false;
    i1.add(this.plaster);
    this.plaster.position.copy(this.rig.side.L.handF).multiplyScalar(0.011);
    this.plaster.quaternion.setFromUnitVectors(UP, this.rig.side.L.handF);

    // where things held in a hand sit (the middle of the closed hand)
    this.arms = {};
    for (const [n, s] of [['R', -1], ['L', 1]]) {
      const holder = new THREE.Object3D(); holder.position.copy(this.rig.side[n].grip); this.bones[`hand${n}`].add(holder);
      const self = this;
      this.arms[n] = {
        side: s, sh: this.bones[`upperArm${n}`], hand: this.bones[`hand${n}`], holder,
        handRig: {
          setGrip(v) { self.gripT[n] = v; }, setPoint(on) { self.pointT[n] = on ? 1 : 0; }, setSpread(v) { self.spreadT[n] = v; }, setGlove() {},
          get grip() { return self.grip[n]; },
        },
      };
    }
    // the old rig's names, for code that still uses them
    this.spine = this.bones.chest; this.neck = this.bones.neck; this.hips = this.bones.hips;
  }

  _initFeet() {
    this.feet = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) this.feet[n] = { n, s, pos: V(), yaw: 0, step: null, landT: -9, pitch: 0 };
    this._placeFeet();
  }
  /** Put both feet straight under the body. */
  _placeFeet() {
    for (const f of Object.values(this.feet)) { this._wantFoot(f, f.pos); f.yaw = this._wantYaw(f); f.step = null; f.pitch = 0; }
  }
  _wantFoot(f, out) {
    const h = this.heading, c = Math.cos(h), s = Math.sin(h), x = f.s * 0.1, z = 0.05;
    return out.set(this.root.position.x + x * c + z * s, 0, this.root.position.z - x * s + z * c);
  }
  _wantYaw(f) { return this.heading + f.s * 0.09; }

  // ───────────── control (the same commands as the old worker) ─────────────
  /** Aim for a named pose (or a partial pose object). Values not named go back to rest. */
  setPose(p) { const src = typeof p === 'string' ? POSES[p] : p; this.tgt = { ...BASE(), ...(src || {}) }; }
  /** Change only some pose values without resetting the rest. */
  adjust(o) { this.tgt = { ...this.tgt, ...o }; }
  /**
   * Reach for a point with a hand ('R' or 'L'): a Vector3 or a function returning one, in the room; null
   * lets go. `pole`: where the elbow points (person's own frame). `opts`: { fingers, palm } world
   * directions (or functions) the hand should take; `at: 'palm'` puts the palm, not the closed hand,
   * on the point.
   */
  setIK(hand, target, pole = null, opts = {}) {
    if (target !== this.ik[hand]) this._ikFrom(hand);
    this.ik[hand] = target; this.pole[hand] = pole; this.ikOpt[hand] = opts || {};
  }
  setGaze(target) { this.gaze = target; }
  setPPE(item, on) { this.ppeT[item] = on ? 1 : 0; }
  /** How tightly a hand grips, 0 (relaxed) to 1 (closed round a handle). */
  setGrip(hand, v) { this.gripT[hand] = v; }
  /** Stand with the hands folded in front, as a presenter waits. */
  setFolded(on) {
    this.folded = !!on;
    this._foldIK = this._foldIK || {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      if (on) {
        const w = this, fn = () => w._foldPoint(s);
        this._foldIK[n] = fn;
        this.setIK(n, fn, V(s * 0.7, -0.6, -0.5), { fingers: () => w._dir(-s * 0.85, -0.5, 0.15), palm: () => w._dir(s * 0.15, 0.1, -1) });
      } else if (this.ik[n] && this.ik[n] === this._foldIK[n]) this.setIK(n, null);
    }
    this.gripT.R = this.gripT.L = on ? 0.45 : 0.22;
  }
  _foldPoint(side) {
    const p = this.root.position.clone(), h = this.heading;
    const lx = side > 0 ? 0.02 : -0.012, lz = side > 0 ? 0.152 : 0.178, y = 0.93 - this.cur.crouch * 0.38;
    return p.add(V(lx * Math.cos(h) + lz * Math.sin(h), y, -lx * Math.sin(h) + lz * Math.cos(h)));
  }
  /** A direction in the person's own frame turned into the room. */
  _dir(x, y, z) { const h = this.heading, c = Math.cos(h), s = Math.sin(h); return V(x * c + z * s, y, -x * s + z * c).normalize(); }

  /** Where the speech wants the mouth: { open, wide, round } (see lipsync.js). */
  setMouth(m) { this.face.setMouth(m); this.talking = !!(m && m.talking); }
  /** Face a direction at once. */
  setHeading(h) { this.heading = h; this.root.rotation.y = h; }
  place(x, z, heading) {
    this.root.position.set(x, 0, z);
    if (heading != null) { this.heading = heading; this.root.rotation.y = heading; }
    this._v = 0; this.vel.set(0, 0, 0); this.speed = 0;
    if (this.feet) this._placeFeet();
  }
  get pos() { return this.root.position; }
  forward(out = V()) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  right(out = V()) { return out.set(-Math.cos(this.heading), 0, Math.sin(this.heading)); }
  /** The middle of a closed hand, in the room. */
  handPos(h, out = V()) { return this.arms[h].holder.getWorldPosition(out); }
  holder(h) { return this.arms[h].holder; }
  /** The EFS mark on the chest, in the room. */
  logoWorld(out = V()) { return this.logo.getWorldPosition(out); }

  /** Turn towards a heading, at most `rate` rad/s; the feet step round. Returns true when facing it. */
  turnTo(heading, dt, rate = 3) {
    const d = wrap(heading - this.heading);
    const step = clamp(d, -rate * dt, rate * dt);
    this.heading += step; this.root.rotation.y = this.heading;
    return Math.abs(d - step) < 0.02;
  }

  /** Walk towards a point: speed up, steer, slow down to stop on it. Returns true on arrival. */
  walkTo(x, z, dt, speed = 1.15, faceOnArrive = null) {
    const p = this.root.position, dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz);
    this._moved = true;
    if (dist < 0.025) {
      this._v = 0; this.vel.set(0, 0, 0); this.speed = 0;
      return faceOnArrive == null ? true : this.turnTo(faceOnArrive, dt, 3);
    }
    const want = Math.atan2(dx, dz), dh = wrap(want - this.heading);
    // short moves are side or back steps without turning round
    const shuffle = dist < 0.35 && Math.abs(dh) > 0.9;
    if (!shuffle) { const r = 3.4 * dt; this.heading += clamp(dh, -r, r); this.root.rotation.y = this.heading; }
    const align = shuffle ? 1 : clamp((Math.cos(wrap(want - this.heading)) - 0.3) / 0.6, 0, 1);
    const top = (shuffle ? 0.45 : speed) * this.stride ** 0.25;
    const vmax = Math.min(top, Math.sqrt(2 * 1.5 * dist)) * align;
    this._v += clamp(vmax - this._v, -2.6 * dt, 1.8 * dt);
    const step = Math.min(dist, Math.max(0, this._v) * dt);
    p.x += (dx / dist) * step; p.z += (dz / dist) * step;
    this.vel.set((dx / dist) * this._v, 0, (dz / dist) * this._v);
    this.speed = this._v;
    return false;
  }

  // ───────────── per frame ─────────────
  update(dt, snap = false) {
    this.t += dt;
    const k = (rate) => (snap ? 1 : 1 - Math.exp(-dt * rate));
    const c = this.cur, t = this.tgt;
    for (const key of ['lean', 'twist', 'headPitch', 'headYaw', 'crouch', 'kneel', 'shake']) c[key] += (t[key] - c[key]) * k(6);
    for (const a of ['armR', 'armL']) for (let i = 0; i < 3; i++) c[a][i] += (t[a][i] - c[a][i]) * k(6);
    for (const n of ['R', 'L']) {
      this.grip[n] += (this.gripT[n] - this.grip[n]) * k(10);
      this.point[n] += (this.pointT[n] - this.point[n]) * k(10);
      this.spread[n] += (this.spreadT[n] - this.spread[n]) * k(10);
      this.ikW[n] += ((this.ik[n] ? 1 : 0) - this.ikW[n]) * k(6.5);
    }
    // nobody asked to walk this frame: come to a stop
    if (!this._moved) { this._v = Math.max(0, this._v - 3 * dt); this.vel.multiplyScalar(this._v > 0 ? 1 - Math.min(1, 3 * dt) : 0); }
    this._moved = false;
    if (snap) this._placeFeet();

    this.root.updateMatrixWorld(true);
    this._inv = (this._inv || new THREE.Matrix4()).copy(this.root.matrixWorld).invert();
    this._gait(dt, snap);
    this._trunk(dt, snap);
    this._arms(dt, snap);
    this._legs();
    this._hands();
    this._faceUpdate(dt, snap);
    this._ppe(dt, snap);
    this.root.updateMatrixWorld(true);
  }

  // ───────────── feet ─────────────
  _gait(dt, snap) {
    const F = this.feet, moving = this._v > 0.06;
    this._walk = moving ? 1 : 0;
    // steps in the air
    for (const f of Object.values(F)) {
      const st = f.step; if (!st) continue;
      st.t += dt / st.dur;
      if (st.t < 0.7) {                              // still steering: aim where the body will want it when the foot lands
        const want = this._wantFoot(f, V()).addScaledVector(this.vel, Math.max(0, st.lead - st.t * st.dur));
        st.to.lerp(want, 0.25);
        st.toYaw = this._wantYaw(f);
      }
      if (st.t >= 1) { f.pos.copy(st.to); f.yaw = st.toYaw; f.step = null; f.landT = this.t; }
    }
    if (snap) return;
    // start a step with the foot that is furthest from where it should be, one foot at a time
    if (F.L.step || F.R.step) return;
    let best = null, bestE = 0;
    for (const f of Object.values(F)) {
      const want = this._wantFoot(f, V()), e = Math.hypot(f.pos.x - want.x, f.pos.z - want.z) + Math.abs(wrap(f.yaw - this._wantYaw(f))) * 0.18;
      const need = moving ? 0.06 : 0.1;
      if (e > need && e > bestE) { best = f; bestE = e; }
    }
    if (!best) return;
    const other = best === F.L ? F.R : F.L;
    if (this.t - other.landT < (moving ? 0.03 : 0.12)) return;
    const dur = moving ? clamp(0.6 - 0.15 * this._v, 0.42, 0.56) : 0.38;
    const lead = moving ? dur * 1.3 : 0;            // lands a little ahead of the hips
    const to = this._wantFoot(best, V()).addScaledVector(this.vel, lead);
    // never put a foot down on top of the other one
    const side = V(Math.cos(this.heading), 0, -Math.sin(this.heading)).multiplyScalar(best.s);
    const gap = to.clone().sub(other.pos).dot(side); if (gap < 0.12) to.addScaledVector(side, 0.12 - gap);
    best.step = { from: best.pos.clone(), to, fromYaw: best.yaw, toYaw: this._wantYaw(best), t: 0, dur, lead, lift: moving ? 0.05 + 0.04 * Math.min(1, this._v) : 0.032 };
  }

  /** Where a foot is now: { ankle, q (in the person's frame), toe, lift } . */
  _footPose(f) {
    const moving = this._walk;
    let C = f.pos, yaw = f.yaw, lift = 0, pitch = 0, toe = 0;
    if (f.step) {
      const st = f.step, tt = clamp(st.t, 0, 1), e = (1 - Math.cos(Math.PI * tt)) / 2;
      C = this._c1 = (this._c1 || V()).lerpVectors(st.from, st.to, e);
      yaw = st.fromYaw + wrap(st.toYaw - st.fromYaw) * e;
      lift = st.lift * Math.pow(Math.sin(Math.PI * tt), 0.85);
      if (moving) pitch = tt < 0.3 ? 0.42 * (1 - tt / 0.3) : tt > 0.72 ? -0.26 * smooth(0.72, 1, tt) : 0;
    } else if (moving) {
      // late in its stance the heel comes up and the foot rolls over the toes
      const fw = this._fw || (this._fw = V()); fw.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      const behind = -((f.pos.x - this.root.position.x) * fw.x + (f.pos.z - this.root.position.z) * fw.z);
      pitch = clamp((behind - 0.08) * 2.8, 0, 0.5);
      const since = this.t - f.landT; if (since < 0.14) pitch = Math.min(pitch, -0.26 * (1 - since / 0.14));
    }
    pitch = f.pitch += (pitch - f.pitch) * 0.5;
    if (pitch > 0) toe = -pitch * 0.9;
    // the ankle, from the point the foot turns about
    const s = f.s, m = (v) => (this._mv || (this._mv = V())).set(v.x * s, v.y, v.z);
    const qY = (this._qy || (this._qy = Q())).setFromAxisAngle(UP, yaw), qP = (this._qp || (this._qp = Q())).setFromAxisAngle(XA, pitch);
    const pivot = pitch > 0 ? FOOT.ball : pitch < 0 ? FOOT.heel : FOOT.mid;
    const off = (this._off || (this._off = V())).copy(m(pivot)).sub(m(FOOT.mid).clone()).applyQuaternion(qY);
    const P = (this._piv || (this._piv = V())).copy(C).add(off); P.y = 0;
    const toAnkle = (this._ta || (this._ta = V())).copy(FOOT.ankle).set(FOOT.ankle.x * s, FOOT.ankle.y, FOOT.ankle.z).sub(m(pivot)).applyQuaternion(qP).applyQuaternion(qY);
    const ankle = P.add(toAnkle); ankle.y += lift;
    const local = ankle.clone().applyMatrix4(this._inv);
    const q = Q().setFromAxisAngle(UP, yaw - this.heading).multiply(qP);
    return { ankle: local, q, toe, lift };
  }

  // ───────────── pelvis, spine, head ─────────────
  _trunk(dt, snap) {
    const c = this.cur, rig = this.rig, k = (r) => (snap ? 1 : 1 - Math.exp(-dt * r));
    const fl = this._fp = { L: this._footPose(this.feet.L), R: this._footPose(this.feet.R) };
    const moving = this._walk;
    // which foot is in the air, and how far through its step
    const sw = this.feet.L.step ? this.feet.L : this.feet.R.step ? this.feet.R : null;
    const st = sw ? clamp(sw.step.t, 0, 1) : 0;
    // height: a little knee bend standing; lower when crouching or kneeling; a bob while walking
    let y = PELVIS_H - 0.012 - c.crouch * 0.4 - c.kneel * 0.43;
    if (moving) y -= 0.01 + 0.012 * (1 - Math.sin(Math.PI * st));
    // the legs must reach the feet: lower the pelvis if they cannot
    const reach = 0.995 * (this.rig.side.L.thigh + this.rig.side.L.shin);
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const a = fl[n].ankle, hx = s * 0.088, hz = 0.004 - c.crouch * 0.1;
      const hor = Math.hypot(a.x - hx, a.z - hz), maxHip = a.y + Math.sqrt(Math.max(0, reach * reach - hor * hor));
      y = Math.min(y, maxHip + (PELVIS_H - HIP_H));
    }
    this._py = snap || this._py == null ? y : this._py + (y - this._py) * k(14);
    // sideways: over the standing foot while stepping; standing still, the weight shifts now and then
    const mid = (fl.L.ankle.x + fl.R.ankle.x) / 2;
    let sx = mid;
    if (sw) sx += (sw === this.feet.L ? -1 : 1) * 0.02 * Math.sin(Math.PI * st) * (moving ? 1 : 0.6);
    const idleShift = Math.sin(this.t * 0.55) * (1 - moving) * this.sway;
    sx += idleShift * 0.03;
    const pz = (fl.L.ankle.z + fl.R.ankle.z) / 2 + 0.016 - c.crouch * 0.11 - c.kneel * 0.05;
    this._px = snap || this._px == null ? sx : this._px + (sx - this._px) * k(6);
    this._pz = snap || this._pz == null ? pz : this._pz + (pz - this._pz) * k(8);
    // the pelvis turns with the legs and drops on the side of the foot in the air
    const yawP = clamp((fl.L.ankle.z - fl.R.ankle.z) * 0.5, -0.14, 0.14) * (moving ? 1 : 0.4);
    const rollP = sw ? (sw === this.feet.L ? 1 : -1) * 0.035 * Math.sin(Math.PI * st) * moving : 0;
    const roll = rollP - idleShift * 0.035;
    const pitchP = c.crouch * 0.38 + c.kneel * 0.2;
    const qh = Q().setFromEuler(new THREE.Euler(pitchP, yawP, roll, 'YXZ'));
    rig.reset();
    rig.hips(V(this._px, this._py, this._pz), qh);
    // the spine leans and turns back against the hips, so the shoulders stay square
    const breath = Math.sin(this.t * 1.65) * 0.012;
    const lean = c.lean + c.crouch * 0.3 + c.kneel * 0.12 + this._extraLean + 0.05 * Math.min(1, this._v);
    this._lean += (lean - this._lean) * k(5);
    const tw = -yawP * 1.4 + c.twist;
    rig.bend('spine', this._lean * 0.42 - pitchP * 0.55 + breath * 0.3, tw * 0.45, -roll * 0.6);
    rig.bend('chest', this._lean * 0.58 - pitchP * 0.25 - breath, tw * 0.55, -roll * 0.5 + c.shake * 0.02 * Math.sin(this.t * 14));
    // the head: towards what it looks at, or straight on with small movements of its own
    const id = this._idle; id.next -= dt;
    if (id.next <= 0) { id.next = 1.2 + this._r() * 3.2; id.ty = (this._r() - 0.5) * 0.22; id.tp = (this._r() - 0.4) * 0.12; }
    id.yaw += (id.ty - id.yaw) * k(3); id.pitch += (id.tp - id.pitch) * k(3);
    let gy = c.headYaw + id.yaw * (this.gaze ? 0.15 : 1), gp = c.headPitch + id.pitch * (this.gaze ? 0.15 : 1);
    const ch = rig.W.chest;
    if (this.gaze) {
      const gw = typeof this.gaze === 'function' ? this.gaze() : this.gaze;
      const g = gw.clone().applyMatrix4(this._inv);                      // in the person's frame
      const hp = V(0, 0.33, 0.02).applyQuaternion(ch.q).add(ch.p);       // about where the eyes are
      const d = g.sub(hp).applyQuaternion(ch.q.clone().invert());        // in the chest's frame
      gy = clamp(Math.atan2(d.x, d.z), -1.25, 1.25);
      gp = clamp(Math.atan2(-d.y, Math.hypot(d.x, d.z)), -0.6, 0.85);
    }
    this._gy += (gy - this._gy) * k(7); this._gp += (gp - this._gp) * k(7);
    const nod = this.talking ? Math.sin(this.t * 3.1) * 0.02 + this.face.mouth.open * 0.03 : 0;
    rig.bend('neck', this._gp * 0.4, this._gy * 0.4, 0);
    rig.bend('head', this._gp * 0.6 + nod, this._gy * 0.6, -this._gy * 0.05);
    this._eyes = [clamp((gy - this._gy) * 0.8, -0.35, 0.35), clamp((gp - this._gp) * 0.6, -0.25, 0.25)];
  }

  // ───────────── arms and hands ─────────────
  /** Remember where a hand is, so a new target is reached smoothly from there. */
  _ikFrom(n) {
    const g = this._lastGrip && this._lastGrip[n];
    this._fade = this._fade || { R: null, L: null };
    if (g) this._fade[n] = { p: g.p.clone(), q: g.q.clone(), k: 0 };
  }

  /** The arm hanging or posed by angles (forward, out, elbow), in the person's frame. */
  _poseArm(n, ang) {
    const rig = this.rig, sd = rig.side[n], s = sd.s, ch = rig.W.chest, sh = rig.W[`upperArm${n}`].p;
    const [pf, po, el] = ang;
    const shake = this.cur.shake * Math.sin(this.t * 14 + (s > 0 ? 1.6 : 0));
    // arm swing while walking: opposite to the foot on the same side
    const fz = this._fp[n].ankle.z - this._pz;
    const swing = this._walk && pf < 0.35 ? clamp(-fz * 0.95, -0.42, 0.42) : 0;
    const up = V(0, -1, 0).applyAxisAngle(XA, -(pf + swing + shake * 0.12)).applyAxisAngle(V(0, 0, 1), s * po);
    up.applyQuaternion(ch.q);
    // a relaxed arm hangs down whatever the body does
    const hang = smooth(0.15, 0.9, this._lean + this.cur.crouch * 0.5) * (pf < 0.4 ? 0.75 : 0);
    if (hang > 0) up.lerp(V(s * 0.12, -1, 0.15).normalize(), hang).normalize();
    const fwd = V(0, 0, 1).applyQuaternion(ch.q);
    let perp = fwd.clone().addScaledVector(up, -fwd.dot(up)); if (perp.lengthSq() < 1e-5) perp.set(0, 1, 0); perp.normalize();
    const e = el + (swing > 0 ? swing * 0.6 : 0) + shake * 0.25;
    const fore = up.clone().multiplyScalar(Math.cos(e)).addScaledVector(perp, Math.sin(e));
    const wrist = sh.clone().addScaledVector(up, sd.upper).addScaledVector(fore, sd.fore);
    const medial = V(-s, 0, 0).applyQuaternion(ch.q);
    const palm = medial.addScaledVector(fore, -medial.dot(fore)).normalize();
    const q = rig.handFrame(n, fore, palm);
    const grip = wrist.clone().add(sd.grip.clone().applyQuaternion(q));
    const pole = V(s * 0.55, -0.55, -0.6).applyQuaternion(ch.q);
    return { grip, q, pole };
  }

  _arms(dt, snap) {
    const rig = this.rig, c = this.cur;
    this._lastGrip = this._lastGrip || { R: null, L: null };
    this._fade = this._fade || { R: null, L: null };
    let short = 0;
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const sd = rig.side[n];
      // shoulders: up a little when reaching high, forward when reaching far
      rig.clavicle(n, 0, 0);
      const rest = this._poseArm(n, n === 'R' ? c.armR : c.armL);
      let grip = rest.grip, q = rest.q, pole = rest.pole;
      const w = this.ikW[n], tgt = this.ik[n];
      if (tgt) this._lastT = this._lastT || {}, this._lastT[n] = tgt;
      const T = tgt || (this._lastT && this._lastT[n]);
      if (w > 0.002 && T) {
        const tw = (typeof T === 'function' ? T() : T).clone().applyMatrix4(this._inv);
        const sh = rig.W[`upperArm${n}`].p;
        const o = this.ikOpt[n] || {};
        let qT;
        if (o.fingers && o.palm) {
          const fdir = (typeof o.fingers === 'function' ? o.fingers() : o.fingers).clone().transformDirection(this._inv);
          const pdir = (typeof o.palm === 'function' ? o.palm() : o.palm).clone().transformDirection(this._inv);
          qT = rig.handFrame(n, fdir, pdir);
        } else {
          // a natural reach: the fingers on along the arm, the palm down and in
          const along = tw.clone().sub(sh).normalize();
          const fingers = along.clone().add(V(0, -0.12, 0)).normalize();
          const pd = V(-s * 0.7, -1, 0.1);
          const palm = pd.addScaledVector(fingers, -pd.dot(fingers)).normalize();
          qT = rig.handFrame(n, fingers, palm);
        }
        let poleT = this.pole[n] ? this.pole[n].clone() : V(s * 0.65, -0.75, -0.45);
        // reaching from where the hand was, not jumping
        const fd = this._fade[n];
        let pT = tw;
        if (fd && fd.k < 1) { fd.k = Math.min(1, fd.k + dt / 0.32); const e = smooth(0, 1, fd.k); pT = fd.p.clone().lerp(tw, e); qT = fd.q.clone().slerp(qT, e); }
        const e = smooth(0, 1, w);
        grip = rest.grip.clone().lerp(pT, e); q = rest.q.clone().slerp(qT, e); pole = rest.pole.clone().lerp(poleT, e);
        // how far out of reach: lean towards it next frame, and bring the shoulder forward
        const d = grip.distanceTo(sh), max = (sd.upper + sd.fore) * 0.97 + 0.06;
        if (d > max && tgt) short = Math.max(short, d - max);
        const up = clamp((grip.y - sh.y) * 0.7, -0.05, 0.25), fw = clamp((grip.z - sh.z - 0.25) * 0.5, 0, 0.3);
        this._prot[n] += (fw - this._prot[n]) * (snap ? 1 : 1 - Math.exp(-dt * 6));
        rig.clavicle(n, up * e, this._prot[n] * e);
      } else this._prot[n] *= 0.9;
      const at = this.ikOpt[n] && this.ikOpt[n].at === 'palm' && tgt ? 'palm' : 'grip';
      const wrist = rig.wristFor(n, grip, q, V(), at);
      rig.arm(n, wrist, pole, q);
      this._lastGrip[n] = { p: grip.clone(), q: q.clone() };
    }
    const want = clamp(short * 2.4, 0, 0.75);
    this._extraLean += (want - this._extraLean) * (snap ? 1 : 1 - Math.exp(-dt * 3));
  }

  _legs() {
    const rig = this.rig, fl = this._fp, c = this.cur;
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const kneelPole = c.kneel > 0.1 && n === 'R' ? V(0.1, -1, 0.6) : V(s * 0.12, 0, 1);
      rig.leg(n, fl[n].ankle, kneelPole, fl[n].q, fl[n].toe);
    }
  }

  _hands() {
    for (const [n] of [['L'], ['R']]) {
      const g = this.grip[n], p = this.point[n], sp = this.spread[n];
      const base = [0.2, 0.24, 0.28, 0.33];
      const curl = base.map((b, i) => b + (0.98 - b) * g + (i ? 0.03 * i * g : 0));
      if (p > 0.01) { curl[0] = curl[0] * (1 - p) + 0.02 * p; for (let i = 1; i < 4; i++) curl[i] = curl[i] * (1 - p) + 1.0 * p; }
      if (sp > 0.01) for (let i = 0; i < 4; i++) curl[i] *= 1 - sp * 0.9;
      const o = this.ikOpt[n] || {};
      if (o.hand === 'flat' && this.ik[n]) for (let i = 0; i < 4; i++) curl[i] = 0.06 + i * 0.01;
      const thumb = [0.25 + g * 0.55 + p * 0.4, 0.25 + g * 0.55 + p * 0.3];
      if (sp > 0.01) { thumb[0] *= 1 - sp; thumb[1] *= 1 - sp; }
      this.rig.fingers(n, curl, sp, thumb);
    }
  }

  _faceUpdate(dt, snap) {
    const [ey, ep] = this._eyes || [0, 0];
    this.face.look(ey, ep);
    this.face.update(dt, { talking: this.talking, snap });
  }

  _ppe(dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 8);
    for (const it of Object.keys(this.ppe)) this.ppe[it] += (this.ppeT[it] - this.ppe[it]) * k;
    this.skinArm.userData.glove.value = smooth(0.15, 0.85, this.ppe.gloves);
    const gl = this.ppe.glasses; this.glasses.visible = gl > 0.02; this.glasses.scale.setScalar(0.9 + 0.1 * gl);
    this.plaster.visible = this.ppe.plaster > 0.5 && this.ppe.gloves < 0.5;
  }
}
