// The presenter's moves, taken from the reference clip of the narrator: he stands easy with his arms by
// his sides, points at the EFS mark on his chest, turns round to show his back and turns back, tips his
// cap, and waves hello. Each move is a generator that drives the worker (arm targets, the body's
// heading, the face) and finishes when the move is done; `Presenter.update` runs it a frame at a time.
//
// Positions are worked out from the worker itself (the chest mark, the front of the cap), so the moves
// still land if the character is scaled or moved.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (k) => k * k * (3 - 2 * k);

export class Presenter {
  constructor(worker, getEye) {
    this.w = worker; this.eye = getEye;       // where he looks: a function returning a world point
    this.gen = null; this.done = true; this.name = ''; this.dt = 1 / 60; this.t = 0;
    this.base = 0;                              // the heading he stands at
    this.rest();
  }

  * wait(s) { let t = 0; while (t < s) { yield; t += this.dt; } }
  * tween(dur, fn) { let t = 0; while (t < dur) { yield; t += this.dt; fn(ease(Math.min(1, t / dur))); } fn(1); }

  /** Standing easy, hands folded in front. */
  rest() {
    const w = this.w;
    w.setHeading(this.base); w.speed = 0;
    w.setPose('idle'); w.setFolded(true);
    for (const h of ['R', 'L']) { w.arms[h].handRig.setPoint(false); w.arms[h].handRig.setSpread(0); }
    w.face.setSmile(0.6); w.face.setBrow(0);
    w.setGaze(this.eye);
  }

  play(name) {
    this.rest();
    const g = MOVES[name];
    this.name = name; this.gen = g ? g(this) : null; this.done = !this.gen;
  }

  stop() { this.gen = null; this.done = true; this.rest(); }

  update(dt) {
    this.dt = dt; this.t += dt;
    if (this.gen && this.gen.next().done) { this.gen = null; this.done = true; this.rest(); }
  }
}

export const MOVES = {
  /** A friendly nod and raised brows: "hello". */
  * nod(p) {
    const w = p.w;
    w.face.setBrow(0.7); w.face.setSmile(1);
    w.adjust({ headPitch: 0.16 }); yield* p.wait(0.45);
    w.adjust({ headPitch: 0 }); yield* p.wait(0.55);
  },

  /** Point at the EFS mark on the chest with the index finger, smiling. */
  * point(p) {
    const w = p.w, hand = w.arms.R.handRig;
    w.setFolded(false); w.setPose('idle');
    hand.setPoint(true); hand.setGrip(0.9);
    w.face.setSmile(1); w.face.setBrow(0.8);
    const logo = () => w.logoWorld();
    const tap = { v: 0 };
    // the hand comes in from his right, the forefinger pointing across at the mark
    w.setIK('R', () => logo().addScaledVector(w.right(), 0.13).addScaledVector(w.forward(), 0.05 + tap.v).add(V(0, -0.02, 0)), V(-1, -0.4, -0.2),
      { fingers: () => w._dir(0.85, 0.1, -0.35), palm: () => w._dir(0, -0.6, -1) });
    yield* p.wait(0.9);
    for (let i = 0; i < 2; i++) { yield* p.tween(0.22, (k) => { tap.v = -0.03 * k; }); yield* p.tween(0.22, (k) => { tap.v = -0.03 * (1 - k); }); }
    yield* p.wait(0.9);
    w.setIK('R', null); hand.setPoint(false);
    yield* p.wait(0.35);
  },

  /** Turn round to show his back, glance over the shoulder at the camera, and turn back. */
  * turn(p) {
    const w = p.w, base = p.base;
    w.setFolded(false); w.setPose('idle'); w.face.setSmile(0.9);
    const dir = -1;                                           // turns towards his right, as in the clip
    const set = (a) => w.setHeading(base + dir * a);
    w.stride = 0.3; w.speed = 0.28;
    yield* p.tween(2.1, (k) => set(Math.PI * k));
    w.speed = 0;
    yield* p.wait(1.0);
    w.speed = 0.28;
    yield* p.tween(2.1, (k) => set(Math.PI * (1 - k)));
    w.speed = 0; w.stride = 1;
    yield* p.wait(0.2);
  },

  /** Touch the peak of the cap with the right hand, with a smile. */
  * tip(p) {
    const w = p.w, hand = w.arms.R.handRig;
    w.setFolded(false); w.setPose('idle');
    hand.setGrip(0.7);
    w.face.setSmile(1);
    const brim = () => w.head.localToWorld(V(0.0, 0.205, 0.17));
    w.setIK('R', () => brim().addScaledVector(w.right(), 0.085).add(V(0, -0.075, -0.035)), V(-0.9, -0.5, 0.1));
    yield* p.wait(0.8);
    w.adjust({ headPitch: 0.1 }); yield* p.wait(0.9);
    w.adjust({ headPitch: 0 }); yield* p.wait(0.4);
    w.setIK('R', null);
    yield* p.wait(0.3);
  },

  /** Wave hello: the right arm up beside the head, the open hand rocking from side to side. */
  * wave(p) {
    const w = p.w, hand = w.arms.R.handRig;
    w.setFolded(false); w.setPose('idle');
    hand.setGrip(0); hand.setSpread(1);
    w.face.setSmile(1); w.face.setBrow(0.6);
    const sw = { t: 0 };
    const base = () => w.arms.R.sh.getWorldPosition(V(0, 0, 0)).addScaledVector(w.right(), 0.22).add(V(0, 0.15, 0)).addScaledVector(w.forward(), 0.07);
    w.setIK('R', () => base().addScaledVector(w.right(), 0.07 * Math.sin(sw.t * 8.5)), V(-0.4, -1, -0.1),
      { fingers: () => w._dir(0.12 * Math.sin(sw.t * 8.5), 1, 0.05), palm: () => w._dir(0, 0, 1) });
    yield* p.tween(0.5, () => {});
    let t = 0; while (t < 2.7) { yield; t += p.dt; sw.t = t; }
    w.setIK('R', null); hand.setSpread(0);
    yield* p.wait(0.3);
  },
};
