// The animated worker: a friendly cartoon man (see character.js) driven by code, with no model files.
//   - a walk cycle, a crouch and a forward lean,
//   - arms that either follow a pose (forward kinematics) or reach a point in the world (two-bone
//     inverse kinematics), blended so they never snap,
//   - a head that looks at things, blinks, breathes and talks (the mouth follows the narration),
//   - hands with fingers that grip,
//   - protective equipment (vest, gloves, glasses) and a plaster that can be shown or hidden.
// The person faces +Z in their own frame; `root.rotation.y` is the heading.
// Left and right are the person's own: their left is +X.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Head, FACE, buildHand, buildCollar, chestLogo, torsoGeometry } from './character.js';
import { canvasTex } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = () => new THREE.Quaternion();
const DOWN = V(0, -1, 0);
const L_THIGH = 0.4, L_SHIN = 0.4, ANKLE = 0.075, L_UP = 0.28, L_FORE = 0.3;
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
  folded: {},
};

export class Worker {
  constructor(M) {
    this.M = M;
    this.root = new THREE.Group();
    this.heading = 0; this.root.rotation.y = 0;
    this.phase = 0; this.walkW = 0;
    this.t = 0;
    this.cur = { lean: 0, twist: 0, headPitch: 0, headYaw: 0, crouch: 0, kneel: 0, armR: [0.05, 0.12, 0.08], armL: [0.05, 0.12, 0.08], shake: 0 };
    this.tgt = JSON.parse(JSON.stringify(this.cur));
    this.ik = { R: null, L: null };           // world target (Vector3 or () => Vector3) per hand
    this.pole = { R: null, L: null };         // where the elbow points while reaching (in the person's own frame); null for the usual
    this.ikW = { R: 0, L: 0 };
    this.gaze = null;                          // world point to look at (Vector3 or function), or null
    this.ppe = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.ppeT = { vest: 0, gloves: 0, glasses: 0, plaster: 0 };
    this.speed = 0;
    this.stride = 1;                           // how long the steps are (short for turning on the spot)
    this.sway = 0.35;                          // how much the body rocks while standing (a presenter does more)
    this._build();
  }

  _m(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  _cap(r, len, mat, parent, y) { return this._m(new THREE.CapsuleGeometry(r, len, 6, 14), mat, parent, 0, y, 0); }
  /** A limb segment: a cylinder that narrows from `rTop` to `rBot`, centred at y, with round ends. */
  _taper(rTop, rBot, len, mat, parent, y) {
    const g = new THREE.Group(); g.position.y = y; parent.add(g);
    this._m(new THREE.CylinderGeometry(rTop, rBot, len, 24, 1), mat, g);
    this._m(new THREE.SphereGeometry(rTop, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat, g, 0, len / 2, 0);
    this._m(new THREE.SphereGeometry(rBot, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat, g, 0, -len / 2, 0);
    return g;
  }

  _build() {
    const M = this.M, root = this.root;
    this.hips = new THREE.Group(); root.add(this.hips);
    this._m(new RoundedBoxGeometry(0.37, 0.22, 0.225, 4, 0.08), M.trousers, this.hips, 0, -0.005, 0);
    this._m(new RoundedBoxGeometry(0.382, 0.03, 0.237, 3, 0.012), M.belt, this.hips, 0, 0.095, 0);

    // torso: a white polo with a blue collar, a placket and the EFS mark on the chest
    this.spine = new THREE.Group(); this.spine.position.y = 0.06; this.hips.add(this.spine);
    this._m(torsoGeometry(0.42, 0.57, 0.24), M.poloWhite, this.spine, 0, -0.07, 0);
    this.neck = new THREE.Group(); this.neck.position.y = 0.5; this.spine.add(this.neck);
    const collar = buildCollar(M); collar.position.set(0, 0.02, -0.004); this.neck.add(collar);
    const placket = this._m(new RoundedBoxGeometry(0.03, 0.12, 0.01, 2, 0.004), M.poloWhite, this.spine, 0, 0.43, 0.1085); placket.castShadow = false;
    for (const y of [0.475, 0.425]) this._m(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 12), M.button, this.spine, 0, y, 0.1145, false).rotation.x = Math.PI / 2;
    this.logo = chestLogo(); this.logo.position.set(0.1, 0.355, 0.1235); this.spine.add(this.logo);

    // head: the shared face rig. Its origin is the chin.
    this.face = new Head(M);
    this.head = this.face.group; this.head.position.y = 0.04; this.head.scale.setScalar(1.12); this.neck.add(this.head);

    // safety glasses
    this.glasses = new THREE.Group(); this.head.add(this.glasses);
    const gz = this.face.zAt(0.037, FACE.eyeY) + 0.028;
    for (const s of [-1, 1]) {
      const rim = this._m(new THREE.TorusGeometry(0.0285, 0.0034, 8, 24), M.black, this.glasses, s * FACE.eyeX, FACE.eyeY, gz); rim.castShadow = false;
      const gl = this._m(new THREE.CircleGeometry(0.0282, 22), M.glass, this.glasses, s * FACE.eyeX, FACE.eyeY, gz + 0.0004); gl.castShadow = false;
      this._m(new THREE.BoxGeometry(0.0035, 0.006, 0.105), M.black, this.glasses, s * 0.0905, FACE.eyeY + 0.004, gz - 0.054).castShadow = false;
    }
    this._m(new THREE.BoxGeometry(0.02, 0.005, 0.006), M.black, this.glasses, 0, FACE.eyeY + 0.004, gz).castShadow = false;

    // high-visibility vest over the polo (a shaped shell with printed reflective bands)
    this.vest = new THREE.Group(); this.spine.add(this.vest);
    this._m(torsoGeometry(0.42, 0.57, 0.24, 0.012), M.vest, this.vest, 0, -0.074, 0);

    // arms
    this.arms = {};
    for (const [name, side] of [['R', -1], ['L', 1]]) {
      const sh = new THREE.Group(); sh.position.set(side * 0.232, 0.43, 0); this.spine.add(sh);
      this._m(new THREE.SphereGeometry(0.066, 20, 14), M.poloWhite, sh);
      const up = new THREE.Group(); sh.add(up);
      this._taper(0.058, 0.047, L_UP - 0.06, M.skin, up, -L_UP / 2 - 0.0);
      this._m(new THREE.CylinderGeometry(0.067, 0.064, 0.13, 22), M.poloWhite, up, 0, -0.065, 0);
      const fore = new THREE.Group(); fore.position.y = -L_UP; up.add(fore);
      this._m(new THREE.SphereGeometry(0.047, 14, 10), M.skin, fore);
      this._taper(0.048, 0.036, L_FORE - 0.08, M.skin, fore, -L_FORE / 2 + 0.02);
      const hand = buildHand(M, side); hand.group.position.y = -L_FORE + 0.04; fore.add(hand.group);
      const holder = new THREE.Group(); holder.position.set(0, -0.06, 0.0); hand.group.add(holder);      // props go here
      this.arms[name] = { side, sh, up, fore, hand: hand.group, handRig: hand, cuff: hand.cuff, holder };
    }
    this.plaster = this._m(new THREE.BoxGeometry(0.014, 0.05, 0.06), M.plasterBlue, this.arms.L.hand, -0.022, -0.05, 0.0);

    // legs
    this.legs = {};
    for (const [name, side] of [['R', -1], ['L', 1]]) {
      const hip = new THREE.Group(); hip.position.set(side * 0.095, -0.02, 0); this.hips.add(hip);
      this._m(new THREE.SphereGeometry(0.086, 20, 14), M.trousers, hip);
      this._taper(0.086, 0.064, L_THIGH - 0.02, M.trousers, hip, -L_THIGH / 2);
      const knee = new THREE.Group(); knee.position.y = -L_THIGH; hip.add(knee);
      this._m(new THREE.SphereGeometry(0.064, 16, 12), M.trousers, knee);
      this._taper(0.064, 0.05, L_SHIN - 0.02, M.trousers, knee, -L_SHIN / 2);
      const foot = new THREE.Group(); foot.position.y = -L_SHIN; knee.add(foot);
      this._m(new RoundedBoxGeometry(0.1, 0.075, 0.26, 3, 0.03), M.shoe, foot, 0, -0.03, 0.05);
      this.legs[name] = { side, hip, knee, foot };
    }
    this._applyLegs(0, 0, 0, 0);
    this.grip = { R: 0.2, L: 0.2 }; this.gripT = { R: 0.2, L: 0.2 };
    this.folded = false;
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

  setIK(hand, target, pole = null) { this.ik[hand] = target; this.pole[hand] = pole; }
  setGaze(target) { this.gaze = target; }
  setPPE(item, on) { this.ppeT[item] = on ? 1 : 0; }
  /** How tightly a hand grips, 0 (relaxed) to 1 (closed round a handle). */
  setGrip(hand, v) { this.gripT[hand] = v; }
  /** Stand with the hands folded in front: how a presenter waits while someone else is talking. */
  setFolded(on) {
    this.folded = !!on;
    const tgt = (s) => () => this._foldPoint(s);
    this.ik.R = on ? tgt(-1) : null; this.ik.L = on ? tgt(1) : null;
    this.gripT.R = this.gripT.L = on ? 0.55 : 0.2;
  }
  _foldPoint(side) {
    const f = this.forward(this._ff || (this._ff = V(0, 0, 0))), l = V(f.z, 0, -f.x);
    return this.root.position.clone().addScaledVector(V(0, 1, 0), 0.93 + this.cur.crouch * -0.3).addScaledVector(f, 0.2).addScaledVector(l, side * 0.032);
  }
  /** Where the speech wants the mouth: { open, wide, round } (see lipsync.js). */
  setMouth(m) { this.face.setMouth(m); this.talking = !!(m && m.talking); }
  /** Face a direction at once. */
  setHeading(h) { this.heading = h; this.root.rotation.y = h; }
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
    const A = 0.42 * this.walkW * this.stride, B = 0.75 * this.walkW * this.stride;
    const crouchA = c.crouch * 1.1, crouchB = c.crouch * 2.0;
    const aL = A * sp + crouchA, aR = -A * sp + crouchA;
    const bL = B * Math.max(0, cp) + crouchB, bR = B * Math.max(0, -cp) + crouchB;
    this._applyLegs(aL, bL, aR, bR);

    // breathing, a little sway
    const br = Math.sin(this.t * 1.7) * 0.004;
    this.spine.position.y = 0.06 + br;
    // standing, the weight shifts slowly from one leg to the other, and the shoulders rock with it
    const rock = Math.sin(this.t * 0.62) * (1 - this.walkW) * this.sway;
    this.hips.rotation.z = rock * 0.022; this.hips.position.x = rock * 0.014;
    this.spine.rotation.set(c.lean + c.crouch * 0.28 + Math.abs(sp) * 0.02 * this.walkW, c.twist + sp * 0.06 * this.walkW, -rock * 0.028);
    this.neck.rotation.y = this._gy * 0.5; this.head.rotation.set(this._gp * 0.6 + 0.0, this._gy * 0.5, 0);
    // the eyes make up what the head does not turn
    const talk = this.face.mouth.open;
    this.face.look(clamp(this._gy * 0.5, -0.4, 0.4), clamp(this._gp * 0.4, -0.3, 0.3));
    this.face.update(dt, { talking: this.talking, snap });
    if (this.talking) this.head.rotation.x += Math.sin(this.t * 3.1) * 0.012 + talk * 0.03;     // a little nodding while speaking

    // protective equipment pops in and out
    for (const it of ['vest', 'gloves', 'glasses', 'plaster']) {
      this.ppe[it] += (this.ppeT[it] - this.ppe[it]) * k(10);
      const v = this.ppe[it];
      const s = v < 0.02 ? 0.0001 : 0.92 + 0.08 * v + Math.sin(Math.min(v, 1) * Math.PI) * 0.1;
      const vis = v > 0.02;
      if (it === 'vest') { this.vest.visible = vis; this.vest.scale.setScalar(s); }
      if (it === 'glasses') { this.glasses.visible = vis; this.glasses.scale.setScalar(s); }
      if (it === 'gloves') for (const h of ['R', 'L']) { const on = v > 0.5; if (this.arms[h]._gl !== on) { this.arms[h]._gl = on; this.arms[h].handRig.setGlove(on); } }
      if (it === 'plaster') this.plaster.visible = vis && this.ppe.gloves < 0.5;
    }

    // fingers close round whatever the hand holds
    for (const h of ['R', 'L']) { this.grip[h] += (this.gripT[h] - this.grip[h]) * k(10); if (Math.abs(this.arms[h].handRig.grip - this.grip[h]) > 0.01) this.arms[h].handRig.setGrip(this.grip[h]); }

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
      const pole = (this.pole[name] ? this.pole[name].clone() : V(side * 0.6, -1, -0.5)).applyAxisAngle(V(0, 1, 0), this.heading).normalize();
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
