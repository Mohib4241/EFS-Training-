// The animated worker: a stylised person built from capsules, driven by code (no model files).
//   - a walk cycle, a crouch and a forward lean,
//   - arms that either follow a pose (forward kinematics) or reach a point in the world (two-bone
//     inverse kinematics), blended so they never snap,
//   - a head that looks at things, blinks and breathes,
//   - protective equipment (vest, gloves, glasses) and a plaster that can be shown or hidden.
// The person faces +Z in their own frame; `root.rotation.y` is the heading.
// Left and right are the person's own: their left is +X.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = () => new THREE.Quaternion();
const DOWN = V(0, -1, 0);
const L_THIGH = 0.43, L_SHIN = 0.43, ANKLE = 0.075, L_UP = 0.29, L_FORE = 0.31;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
};

export class Worker {
  constructor(M) {
    this.M = M;
    this.root = new THREE.Group();
    this.heading = 0; this.root.rotation.y = 0;
    this.phase = 0; this.walkW = 0;
    this.t = 0;
    this.blink = 0; this.nextBlink = 2.5;
    this.cur = { lean: 0, twist: 0, headPitch: 0, headYaw: 0, crouch: 0, kneel: 0, armR: [0.05, 0.12, 0.08], armL: [0.05, 0.12, 0.08], shake: 0 };
    this.tgt = JSON.parse(JSON.stringify(this.cur));
    this.ik = { R: null, L: null };           // world target (Vector3 or () => Vector3) per hand
    this.ikW = { R: 0, L: 0 };
    this.gaze = null;                          // world point to look at (Vector3 or function), or null
    this.ppe = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.ppeT = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.speed = 0;
    this._build();
  }

  _m(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  _cap(r, len, mat, parent, y) { return this._m(new THREE.CapsuleGeometry(r, len, 6, 14), mat, parent, 0, y, 0); }

  _build() {
    const M = this.M, root = this.root;
    this.hips = new THREE.Group(); root.add(this.hips);
    this._m(new RoundedBoxGeometry(0.34, 0.2, 0.21, 4, 0.07), M.trousers, this.hips, 0, 0.0, 0);

    // torso
    this.spine = new THREE.Group(); this.spine.position.y = 0.06; this.hips.add(this.spine);
    this._m(new RoundedBoxGeometry(0.4, 0.52, 0.23, 4, 0.09), M.shirt, this.spine, 0, 0.27, 0);
    this.neck = new THREE.Group(); this.neck.position.y = 0.55; this.spine.add(this.neck);
    this._m(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 14), M.skin, this.neck, 0, 0.02, 0);

    // head
    this.head = new THREE.Group(); this.head.position.y = 0.08; this.head.scale.setScalar(1.14); this.neck.add(this.head);
    const skull = this._m(new THREE.SphereGeometry(0.108, 28, 20), M.skin, this.head, 0, 0.09, 0); skull.scale.set(0.95, 1.1, 1.0);
    const hair = this._m(new THREE.SphereGeometry(0.113, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.47), M.hair, this.head, 0, 0.112, -0.014); hair.scale.set(0.97, 1.08, 1.03);
    this.eyes = [];
    for (const s of [-1, 1]) {
      const w = this._m(new THREE.SphereGeometry(0.0145, 12, 10), M.eyeWhite, this.head, s * 0.041, 0.098, 0.094); w.castShadow = false;
      const p = this._m(new THREE.SphereGeometry(0.0082, 10, 8), M.black, this.head, s * 0.041, 0.098, 0.105); p.castShadow = false;
      const b = this._m(new THREE.BoxGeometry(0.036, 0.007, 0.01), M.hair, this.head, s * 0.041, 0.127, 0.098); b.castShadow = false; b.rotation.z = -s * 0.12;
      this.eyes.push(w, p);
    }
    this._m(new THREE.SphereGeometry(0.014, 10, 8), M.skin, this.head, 0, 0.082, 0.108);
    const mouth = this._m(new THREE.TorusGeometry(0.024, 0.004, 6, 14, Math.PI), M.mouth, this.head, 0, 0.054, 0.1); mouth.rotation.z = Math.PI; mouth.castShadow = false;
    for (const s of [-1, 1]) this._m(new THREE.SphereGeometry(0.02, 10, 8), M.skin, this.head, s * 0.103, 0.09, 0).scale.set(0.5, 1, 0.8);

    // safety glasses
    this.glasses = new THREE.Group(); this.head.add(this.glasses);
    for (const s of [-1, 1]) { const rim = this._m(new THREE.TorusGeometry(0.027, 0.004, 8, 20), M.black, this.glasses, s * 0.041, 0.098, 0.11); rim.castShadow = false; const gl = this._m(new THREE.CircleGeometry(0.026, 18), M.glass, this.glasses, s * 0.041, 0.098, 0.111); gl.castShadow = false; }
    this._m(new THREE.BoxGeometry(0.03, 0.006, 0.006), M.black, this.glasses, 0, 0.1, 0.112);
    for (const s of [-1, 1]) this._m(new THREE.BoxGeometry(0.004, 0.006, 0.1), M.black, this.glasses, s * 0.09, 0.108, 0.06);

    // vest over the torso
    this.vest = new THREE.Group(); this.spine.add(this.vest);
    this._m(new RoundedBoxGeometry(0.416, 0.4, 0.244, 4, 0.09), M.vest, this.vest, 0, 0.3, 0);
    for (const y of [0.2, 0.38]) {                                   // reflective bands, flat on the vest
      for (const z of [-1, 1]) this._m(new THREE.BoxGeometry(0.4, 0.035, 0.004), M.reflect, this.vest, 0, y, z * 0.123).castShadow = false;
      for (const x of [-1, 1]) this._m(new THREE.BoxGeometry(0.004, 0.035, 0.226), M.reflect, this.vest, x * 0.209, y, 0).castShadow = false;
    }
    for (const s of [-1, 1]) for (const z of [-1, 1]) this._m(new THREE.BoxGeometry(0.045, 0.37, 0.004), M.reflect, this.vest, s * 0.085, 0.3, z * 0.123).castShadow = false;

    // arms
    this.arms = {};
    for (const [name, side] of [['R', -1], ['L', 1]]) {
      const sh = new THREE.Group(); sh.position.set(side * 0.215, 0.47, 0); this.spine.add(sh);
      this._m(new THREE.SphereGeometry(0.058, 16, 12), M.shirt, sh);
      const up = new THREE.Group(); sh.add(up);
      this._cap(0.049, L_UP - 0.11, M.skin, up, -L_UP / 2);
      const sleeve = this._m(new THREE.CylinderGeometry(0.056, 0.05, 0.13, 16), M.shirt, up, 0, -0.065, 0);
      const fore = new THREE.Group(); fore.position.y = -L_UP; up.add(fore);
      this._m(new THREE.SphereGeometry(0.04, 12, 10), M.skin, fore);
      this._cap(0.042, L_FORE - 0.11, M.skin, fore, -L_FORE / 2 + 0.02);
      const hand = new THREE.Group(); hand.position.y = -L_FORE + 0.02; fore.add(hand);
      this._m(new THREE.SphereGeometry(0.047, 14, 10), M.skin, hand, 0, -0.025, 0).scale.set(0.9, 1.1, 0.7);
      const glove = this._m(new THREE.SphereGeometry(0.054, 14, 10), M.glove, hand, 0, -0.03, 0); glove.scale.set(0.95, 1.2, 0.78);
      const cuff = this._m(new THREE.CylinderGeometry(0.043, 0.043, 0.07, 12), M.glove, fore, 0, -L_FORE + 0.07, 0);
      const holder = new THREE.Group(); holder.position.set(0, -0.04, 0.0); hand.add(holder);   // props go here
      this.arms[name] = { side, sh, up, fore, hand, glove, cuff, holder };
    }
    this.plaster = this._m(new THREE.BoxGeometry(0.014, 0.05, 0.06), M.plasterBlue, this.arms.L.hand, 0.04, -0.045, 0.0);

    // legs
    this.legs = {};
    for (const [name, side] of [['R', -1], ['L', 1]]) {
      const hip = new THREE.Group(); hip.position.set(side * 0.095, -0.02, 0); this.hips.add(hip);
      this._cap(0.076, L_THIGH - 0.15, M.trousers, hip, -L_THIGH / 2);
      const knee = new THREE.Group(); knee.position.y = -L_THIGH; hip.add(knee);
      this._m(new THREE.SphereGeometry(0.066, 12, 10), M.trousers, knee);
      this._cap(0.063, L_SHIN - 0.14, M.trousers, knee, -L_SHIN / 2);
      const foot = new THREE.Group(); foot.position.y = -L_SHIN; knee.add(foot);
      this._m(new RoundedBoxGeometry(0.1, 0.075, 0.26, 3, 0.03), M.shoe, foot, 0, -0.03, 0.05);
      this.legs[name] = { side, hip, knee, foot };
    }
    this._applyLegs(0, 0, 0, 0);
  }

  // ───────────── control ─────────────
  /** Aim for a named pose (or a partial pose object). Joints not named go back to rest. */
  setPose(p) {
    const base = { lean: 0, twist: 0, headPitch: 0, headYaw: 0, crouch: 0, kneel: 0, armR: [0.05, 0.12, 0.08], armL: [0.05, 0.12, 0.08], shake: 0 };
    const src = typeof p === 'string' ? POSES[p] : p;
    this.tgt = { ...base, ...(src || {}) };
  }
  /** Change only some pose values without resetting the rest. */
  adjust(o) { this.tgt = { ...this.tgt, ...o }; }

  setIK(hand, target) { this.ik[hand] = target; }
  setGaze(target) { this.gaze = target; }
  setPPE(item, on) { this.ppeT[item] = on ? 1 : 0; }
  place(x, z, heading) { this.root.position.set(x, 0, z); if (heading != null) { this.heading = heading; this.root.rotation.y = heading; } }
  get pos() { return this.root.position; }
  forward(out = V(0, 0, 0)) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  right(out = V(0, 0, 0)) { return out.set(-Math.cos(this.heading), 0, Math.sin(this.heading)); }
  handPos(h, out = V(0, 0, 0)) { return this.arms[h].holder.getWorldPosition(out); }
  holder(h) { return this.arms[h].holder; }

  /** Turn towards a heading, at most `rate` rad/s. Returns true when facing it. */
  turnTo(heading, dt, rate = 5) {
    let d = heading - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    const step = clamp(d, -rate * dt, rate * dt);
    this.heading += step; this.root.rotation.y = this.heading;
    return Math.abs(d - step) < 0.02;
  }

  /** Walk towards a point. Returns true on arrival. */
  walkTo(x, z, dt, speed = 1.15, faceOnArrive = null) {
    const dx = x - this.root.position.x, dz = z - this.root.position.z, dist = Math.hypot(dx, dz);
    if (dist < 0.03) { this.speed = 0; return faceOnArrive == null ? true : this.turnTo(faceOnArrive, dt); }
    const want = Math.atan2(dx, dz);
    const facing = this.turnTo(want, dt, 6);
    const ease = clamp(dist / 0.5, 0.35, 1);
    const k = facing ? 1 : 0.25;
    const step = Math.min(dist, speed * ease * k * dt);
    this.root.position.x += (dx / dist) * step; this.root.position.z += (dz / dist) * step;
    this.speed = step / Math.max(dt, 1e-4);
    return false;
  }

  // ───────────── per-frame ─────────────
  update(dt, snap = false) {
    this.t += dt;
    const k = (rate) => (snap ? 1 : 1 - Math.exp(-dt * rate));
    const c = this.cur, t = this.tgt;

    // pose values glide to their targets
    for (const key of ['lean', 'twist', 'headPitch', 'headYaw', 'crouch', 'kneel', 'shake']) c[key] += (t[key] - c[key]) * k(7);
    for (const a of ['armR', 'armL']) for (let i = 0; i < 3; i++) c[a][i] += (t[a][i] - c[a][i]) * k(7);

    // looking at something
    let gy = c.headYaw, gp = c.headPitch;
    if (this.gaze) {
      const g = typeof this.gaze === 'function' ? this.gaze() : this.gaze;
      this.head.getWorldPosition(this._hp || (this._hp = V(0, 0, 0)));
      const d = g.clone().sub(this._hp);
      const local = d.clone().applyAxisAngle(V(0, 1, 0), -this.heading);
      gy = clamp(Math.atan2(local.x, local.z), -1.1, 1.1);
      gp = clamp(Math.atan2(-local.y, Math.hypot(local.x, local.z)), -0.5, 0.8);
    }
    this._gy = (this._gy ?? 0) + (gy - (this._gy ?? 0)) * k(8); this._gp = (this._gp ?? 0) + (gp - (this._gp ?? 0)) * k(8);

    // gait
    const walking = this.speed > 0.05 ? 1 : 0;
    this.walkW += (walking - this.walkW) * k(8);
    this.phase += this.speed * dt * 5.4;
    const sp = Math.sin(this.phase), cp = Math.cos(this.phase);
    const A = 0.42 * this.walkW, B = 0.75 * this.walkW;
    const crouchA = c.crouch * 1.1, crouchB = c.crouch * 2.0;
    const aL = A * sp + crouchA, aR = -A * sp + crouchA;
    const bL = B * Math.max(0, cp) + crouchB, bR = B * Math.max(0, -cp) + crouchB;
    this._applyLegs(aL, bL, aR, bR);

    // breathing, a little sway
    const br = Math.sin(this.t * 1.7) * 0.004;
    this.spine.position.y = 0.06 + br;
    this.spine.rotation.set(c.lean + c.crouch * 0.28 + Math.abs(sp) * 0.02 * this.walkW, c.twist + sp * 0.06 * this.walkW, 0);
    this.neck.rotation.y = this._gy * 0.5; this.head.rotation.set(this._gp * 0.6 + 0.0, this._gy * 0.5, 0);

    // blink
    this.nextBlink -= dt; if (this.nextBlink <= 0) { this.blink = 0.12; this.nextBlink = 2 + (Math.sin(this.t * 12.9) + 1) * 1.6; }
    this.blink = Math.max(0, this.blink - dt);
    const open = this.blink > 0 ? 0.1 : 1;
    for (let i = 0; i < this.eyes.length; i += 2) { this.eyes[i].scale.y = open; this.eyes[i + 1].scale.y = open; }

    // protective equipment pops in and out
    for (const it of ['vest', 'gloves', 'glasses', 'plaster']) {
      this.ppe[it] += (this.ppeT[it] - this.ppe[it]) * k(10);
      const v = this.ppe[it];
      const s = v < 0.02 ? 0.0001 : 0.92 + 0.08 * v + Math.sin(Math.min(v, 1) * Math.PI) * 0.1;
      const vis = v > 0.02;
      if (it === 'vest') { this.vest.visible = vis; this.vest.scale.setScalar(s); }
      if (it === 'glasses') { this.glasses.visible = vis; this.glasses.scale.setScalar(s); }
      if (it === 'gloves') for (const h of ['R', 'L']) { this.arms[h].glove.visible = vis; this.arms[h].cuff.visible = vis; }
      if (it === 'plaster') this.plaster.visible = vis && this.ppe.gloves < 0.5;
    }

    // arms: pose first, then reach for targets
    this.root.updateMatrixWorld(true);
    this._arms(dt, snap);
  }

  _applyLegs(aL, bL, aR, bR) {
    const set = (leg, a, b) => {
      leg.hip.rotation.x = -a; leg.knee.rotation.x = b; leg.foot.rotation.x = a - b;
      return ANKLE + L_THIGH * Math.cos(a) + L_SHIN * Math.cos(a - b);
    };
    const hL = set(this.legs.L, aL, bL), hR = set(this.legs.R, aR, bR);
    this.hips.position.y = Math.max(hL, hR) + 0.02;
  }

  _arms(dt, snap) {
    const c = this.cur;
    const sw = Math.sin(this.phase) * 0.5 * this.walkW;
    for (const name of ['R', 'L']) {
      const a = this.arms[name], side = a.side;
      const pose = name === 'R' ? c.armR : c.armL;
      const shake = c.shake * Math.sin(this.t * 14 + (name === 'R' ? 0 : 1.6));
      // forward kinematics from the pose
      const swing = pose[0] + (name === 'L' ? -sw : sw) * (pose[0] < 0.3 ? 1 : 0.2) + shake * 0.12;
      const fkUp = Q().setFromEuler(new THREE.Euler(-swing, 0, side * pose[1], 'XZY'));
      const fkFore = Q().setFromEuler(new THREE.Euler(-(pose[2] + shake * 0.25), 0, 0));

      // reaching a target
      const tgtRaw = this.ik[name];
      const want = tgtRaw ? 1 : 0;
      this.ikW[name] += (want - this.ikW[name]) * (snap ? 1 : 1 - Math.exp(-dt * 7));
      const w = this.ikW[name];
      if (w < 0.003 || !tgtRaw) { a.up.quaternion.copy(fkUp); a.fore.quaternion.copy(fkFore); a.up.updateMatrixWorld(true); continue; }
      const target = typeof tgtRaw === 'function' ? tgtRaw() : tgtRaw;
      const S = a.sh.getWorldPosition(V(0, 0, 0));
      const to = target.clone().sub(S);
      let d = to.length(); const dir = to.clone().divideScalar(d || 1);
      d = clamp(d, 0.08, L_UP + L_FORE - 0.005);
      const aa = (L_UP * L_UP - L_FORE * L_FORE + d * d) / (2 * d), hh = Math.sqrt(Math.max(L_UP * L_UP - aa * aa, 0));
      // the elbow points down and a little outwards and back
      const pole = V(side * 0.6, -1, -0.5).applyAxisAngle(V(0, 1, 0), this.heading).normalize();
      const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      const E = S.clone().add(dir.clone().multiplyScalar(aa)).add(pp.multiplyScalar(hh));
      const T = S.clone().add(dir.clone().multiplyScalar(d));
      const pq = a.sh.getWorldQuaternion(Q());
      const upQ = Q().setFromUnitVectors(DOWN, E.clone().sub(S).normalize().applyQuaternion(pq.clone().invert()));
      a.up.quaternion.copy(upQ); a.up.updateMatrixWorld(true);
      const uq = a.up.getWorldQuaternion(Q());
      const foreQ = Q().setFromUnitVectors(DOWN, T.clone().sub(E).normalize().applyQuaternion(uq.invert()));
      a.up.quaternion.copy(fkUp).slerp(upQ, w);
      a.fore.quaternion.copy(fkFore).slerp(foreQ, w);
      a.up.updateMatrixWorld(true);
    }
  }
}
