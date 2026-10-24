// Poses the narrator's skeleton. Everything here works in the character's own space: the root of the
// body at the floor between the feet, facing +Z, the person's left +X.
//
//   - the pelvis is placed and turned; the spine, chest, neck and head bend and turn by angles;
//   - each arm reaches a wrist position with two-bone inverse kinematics: the elbow points where it is
//     told (the "pole"), bends only round its hinge, and the hand takes the orientation it is given,
//     half of the turn of the hand going into the forearm so the wrist does not twist like a sweet
//     wrapper;
//   - each leg reaches an ankle position the same way, the knee pointing forward, and the foot and
//     toes are turned to sit on the floor;
//   - the fingers curl, spread and point; the thumb swings across the palm.
//
// The bones all start (in the bind pose) with no rotation, so an angle about an axis written in the
// world of the bind pose is the same in every bone's own frame.
import * as THREE from 'three';
import { JOINTS, HAND, ARM_DIR, handBasis, L as LEN } from './model.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _a = V(), _b = V(), _c = V(), _d = V(), _e = V(), _f = V();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The rotation that turns frame (a, b) into frame (A, B): a and A are the main direction, b and B set the roll. */
export function frameRotation(a, b, A, B, out = new THREE.Quaternion()) {
  const x1 = _a.copy(a).normalize(), y1 = _b.copy(b).addScaledVector(x1, -b.dot(x1)).normalize(), z1 = _c.crossVectors(x1, y1);
  _m1.makeBasis(x1, y1, z1);
  const x2 = _d.copy(A).normalize(), y2 = _e.copy(B).addScaledVector(x2, -B.dot(x2)).normalize(), z2 = _f.crossVectors(x2, y2);
  _m2.makeBasis(x2, y2, z2);
  return out.setFromRotationMatrix(_m2.multiply(_m1.transpose()));
}

/** The turn of q about a unit axis, in radians (the "twist" of a swing-twist split). */
export function twistAngle(q, axis) {
  const p = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  return 2 * Math.atan2(p, q.w);
}

/**
 * Two-bone IK: from the root S, bones of length la and lb, reach T with the middle joint pointing
 * towards `pole`. Writes the middle joint to E and the reached end to Tout (T, or as close as the
 * bones allow); returns the hinge axis (unit) in H.
 */
export function solveTwoBone(S, T, la, lb, pole, E, Tout, H) {
  const dir = _a.subVectors(T, S); let d = dir.length();
  if (d < 1e-6) { dir.set(0, -1, 0); d = 1e-6; } else dir.divideScalar(d);
  d = clamp(d, Math.abs(la - lb) + 1e-4, la + lb - 1e-4);
  const x = (la * la - lb * lb + d * d) / (2 * d), y = Math.sqrt(Math.max(0, la * la - x * x));
  const n = _b.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (n.lengthSq() < 1e-10) n.set(0, 0, 1).addScaledVector(dir, -dir.z);
  n.normalize();
  E.copy(S).addScaledVector(dir, x).addScaledVector(n, y);
  Tout.copy(S).addScaledVector(dir, d);
  // the hinge: the axis the lower bone turns round to bend away from the pole side
  H.crossVectors(n, dir).normalize();
  return H;
}

// Thumb and finger axes, in the canonical hand frame (left hand: x the back of the hand, -y along the
// fingers, z the thumb side), turned into the bind pose of each side.
const FINGER_FLEX = [0, 0, -1];       // curls a finger towards the palm
const SPREAD = [1, 0, 0];             // fans a finger sideways
const THUMB_OPP = [0, -1, 0];         // swings the thumb across the palm
const thumbDir = (() => { const a = HAND.thumb.pts[0], b = HAND.thumb.pts[1]; const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...d); return d.map((v) => v / l); })();
const THUMB_FLEX = (() => { const n = [-0.6, 0, -0.8]; const t = thumbDir; const c = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]]; const l = Math.hypot(...c); return c.map((v) => v / l); })();

/** A canonical-frame axis to the bind pose of a side, as an axis that turns the same way on both hands. */
function handAxis(a, s) {
  const b = handBasis(s);
  const w = V(b.out[0] * a[0] - b.F[0] * a[1] + b.fwd[0] * a[2], b.out[1] * a[0] - b.F[1] * a[1] + b.fwd[1] * a[2], b.out[2] * a[0] - b.F[2] * a[1] + b.fwd[2] * a[2]).normalize();
  return s > 0 ? w : w.negate();       // the right hand is a mirror image: its turns go the other way
}
/** A canonical-frame direction (not an axis) to the bind pose of a side. */
export function handDir(a, s) {
  const b = handBasis(s);
  return V(b.out[0] * a[0] - b.F[0] * a[1] + b.fwd[0] * a[2], b.out[1] * a[0] - b.F[1] * a[1] + b.fwd[1] * a[2], b.out[2] * a[0] - b.F[2] * a[1] + b.fwd[2] * a[2]);
}

export class Rig {
  constructor(body) {
    this.body = body; this.B = body.bones;
    this.W = {};                                    // each bone's position and rotation in the character's space
    this.off = {};                                  // each bone's offset from its parent
    this.bindP = {};
    for (const [name, b] of Object.entries(this.B)) {
      this.W[name] = { p: V(), q: new THREE.Quaternion() };
      this.off[name] = b.position.clone();
      this.bindP[name] = v3(body.bind[name]);
    }
    this.side = {};
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const A = v3(ARM_DIR(s)), H = V().crossVectors(A, Z).normalize();
      const hb = handBasis(s);
      const legA = this.bindP[`shin${n}`].clone().sub(this.bindP[`thigh${n}`]).normalize();
      const shinA = this.bindP[`foot${n}`].clone().sub(this.bindP[`shin${n}`]).normalize();
      this.side[n] = {
        s, armA: A, armH: H,
        handF: v3(hb.F), handPalm: v3(hb.out).negate(), handThumb: v3(hb.fwd),
        grip: handDir([-0.017, -0.064, 0.012], s),                 // the middle of the closed hand, from the wrist
        palmC: handDir([-0.012, -0.05, 0.002], s),                 // the middle of the palm
        thighA: legA, shinA, legH: V().crossVectors(legA, V(0, 0, -1)).normalize(),
        flex: handAxis(FINGER_FLEX, s), spread: handAxis(SPREAD, s), opp: handAxis(THUMB_OPP, s), tflex: handAxis(THUMB_FLEX, s),
        upper: LEN.upper, fore: LEN.fore,
        thigh: this.bindP[`shin${n}`].distanceTo(this.bindP[`thigh${n}`]), shin: this.bindP[`foot${n}`].distanceTo(this.bindP[`shin${n}`]),
      };
    }
    this._E = V(); this._T = V(); this._H = V(); this._u = V(); this._f = V();
    this.reset();
  }

  /** Back to the bind pose. */
  reset() {
    for (const [name, b] of Object.entries(this.B)) { b.quaternion.identity(); b.position.copy(this.off[name]); }
    this._fk('root');
  }

  /** Set a bone's own rotation and work out where it and its parent chain are now (in the character's space). */
  set(name, q) {
    const b = this.B[name]; if (q) b.quaternion.copy(q);
    const parent = b.parent && b.parent.isBone ? b.parent.name : null, W = this.W[name];
    if (parent) {
      const P = this.W[parent];
      W.p.copy(b.position).applyQuaternion(P.q).add(P.p);
      W.q.copy(P.q).multiply(b.quaternion);
    } else { W.p.copy(b.position); W.q.copy(b.quaternion); }
    return W;
  }
  /** Set a bone so that its rotation in the character's space is `wq`. */
  setWorld(name, wq) {
    const b = this.B[name], P = this.W[b.parent.name];
    return this.set(name, _q3.copy(P.q).invert().multiply(wq));
  }
  _fk(name) { this.set(name); for (const c of this.B[name].children) if (c.isBone) this._fk(c.name); }

  // ───────────── the trunk ─────────────
  /** Place the pelvis (position in the character's space) and turn it. */
  hips(pos, q) { const b = this.B.hips; b.position.copy(pos); this.set('hips', q); }
  /** Bend a trunk bone by angles: x forward, y turning, z sideways (radians, in its own frame). */
  bend(name, x, y, z) { _q1.setFromEuler(new THREE.Euler(x, y, z, 'YXZ')); return this.set(name, _q1); }

  /** Raise (elev) and bring forward (prot) a shoulder. */
  clavicle(n, elev, prot) {
    const s = this.side[n].s;
    _q1.setFromAxisAngle(Z, s * elev); _q2.setFromAxisAngle(Y, -s * prot);
    this.set(`clavicle${n}`, _q1.multiply(_q2));
    return this.set(`upperArm${n}`);                 // the shoulder joint moves with it
  }

  // ───────────── arms ─────────────
  /**
   * Put a hand where it should be. `wrist`: the wrist position; `pole`: where the elbow points;
   * `hand`: the hand's rotation in the character's space (null: straight on from the forearm, with
   * `roll` turning the palm). Returns the wrist actually reached.
   */
  arm(n, wrist, pole, hand = null, roll = 0) {
    const sd = this.side[n];
    this.set(`clavicle${n}`); const S = this.set(`upperArm${n}`).p;     // where the shoulder is now
    const H = solveTwoBone(S, wrist, sd.upper, sd.fore, pole, this._E, this._T, this._H);
    const u = this._u.subVectors(this._E, S), f = this._f.subVectors(this._T, this._E);
    const qU = frameRotation(sd.armA, sd.armH, u, H, new THREE.Quaternion());
    this.setWorld(`upperArm${n}`, qU);
    const qF = frameRotation(sd.armA, sd.armH, f, H, new THREE.Quaternion());
    this.setWorld(`foreArm${n}`, qF);
    // the hand: given, or straight on from the forearm
    let qH;
    if (hand) qH = hand.clone();
    else qH = qF.clone().multiply(_q1.setFromAxisAngle(sd.armA, roll));
    // keep the wrist within what a wrist can do
    const rel = qF.clone().invert().multiply(qH);
    let tw = twistAngle(rel, sd.armA);
    const twistQ = new THREE.Quaternion().setFromAxisAngle(sd.armA, tw);
    const swing = rel.clone().multiply(twistQ.clone().invert());
    const sa = 2 * Math.acos(clamp(Math.abs(swing.w), 0, 1)), maxS = 1.25;
    if (sa > maxS) swing.slerp(new THREE.Quaternion(), 1 - maxS / sa);
    tw = clamp(tw, -2.0, 2.0); twistQ.setFromAxisAngle(sd.armA, tw);
    qH.copy(qF).multiply(swing).multiply(twistQ);
    // half the turn of the hand goes into the forearm
    this.set(`foreTwist${n}`, _q2.setFromAxisAngle(sd.armA, tw * 0.5));
    this.setWorld(`hand${n}`, qH);
    return this._T;
  }

  /** The hand's rotation that points the fingers along `fingers` with the palm facing `palm` (both in the character's space). */
  handFrame(n, fingers, palm, out = new THREE.Quaternion()) {
    const sd = this.side[n];
    return frameRotation(sd.handF, sd.handPalm, fingers, palm, out);
  }

  /** Where the wrist must be for the middle of the closed hand (or of the palm) to be at `p`, with the hand turned by `qH`. */
  wristFor(n, p, qH, out = V(), point = 'grip') {
    const sd = this.side[n];
    return out.copy(sd[point === 'palm' ? 'palmC' : 'grip']).applyQuaternion(qH).negate().add(p);
  }

  // ───────────── fingers ─────────────
  /**
   * Curl the fingers: `curl` [index, middle, ring, pinky] 0 (straight) to 1 (a fist), `spread` 0 to 1,
   * `thumb` [swing across the palm, bend] 0 to 1.
   */
  fingers(n, curl, spread = 0, thumb = [0.3, 0.3]) {
    const sd = this.side[n];
    const fan = [-0.16, -0.04, 0.07, 0.19];
    HAND.fingers.forEach((f, i) => {
      const c = clamp(curl[i], -0.1, 1.1);
      _q1.setFromAxisAngle(sd.flex, c * 1.45).multiply(_q2.setFromAxisAngle(sd.spread, fan[i] * spread * 1.6 + fan[i] * 0.25));
      this.set(`${f.id}1${n}`, _q1);
      this.set(`${f.id}2${n}`, _q1.setFromAxisAngle(sd.flex, c * 1.6));
      this.set(`${f.id}3${n}`, _q1.setFromAxisAngle(sd.flex, c * 1.05));
    });
    const [o, b] = thumb;
    _q1.setFromAxisAngle(sd.opp, -0.15 + o * 0.95).multiply(_q2.setFromAxisAngle(sd.tflex, b * 0.35));
    this.set(`thumb1${n}`, _q1);
    this.set(`thumb2${n}`, _q1.setFromAxisAngle(sd.tflex, b * 0.75));
    this.set(`thumb3${n}`, _q1.setFromAxisAngle(sd.tflex, b * 0.85));
  }

  // ───────────── legs ─────────────
  /**
   * Put a foot down: the ankle at `ankle`, the knee pointing towards `pole`, the foot turned by `qFoot`
   * (in the character's space) and the toes bent up by `toe` radians.
   */
  leg(n, ankle, pole, qFoot, toe = 0) {
    const sd = this.side[n], S = this.set(`thigh${n}`).p;               // where the hip joint is now
    const H = solveTwoBone(S, ankle, sd.thigh, sd.shin, pole, this._E, this._T, this._H);
    const u = this._u.subVectors(this._E, S), f = this._f.subVectors(this._T, this._E);
    this.setWorld(`thigh${n}`, frameRotation(sd.thighA, sd.legH, u, H, _q2));
    this.setWorld(`shin${n}`, frameRotation(sd.shinA, sd.legH, f, H, _q2));
    this.setWorld(`foot${n}`, qFoot);
    this.set(`toe${n}`, _q1.setFromAxisAngle(X, toe));
    return this._T;
  }

  /** A bone's position in the character's space. */
  pos(name, out = V()) { return out.copy(this.W[name].p); }
}

export { JOINTS };
