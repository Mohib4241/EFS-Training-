// Movements used by several steps.
import * as THREE from 'three';
import { orbit } from '../scene/shots.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Coordinates stay in the worker's frame so contact survives turning and different body poses.
const bodyPoint = (w, x, y, z) => w.pos.clone().add(w._dir(x, 0, z).multiplyScalar(Math.hypot(x, z))).add(V(0, y, 0));
const handsShot = (c) => c.cam(orbit(() => bodyPoint(c.worker, 0, 1.15, 0.25), { dist: 1.55, az: () => c.worker.heading + 0.4, el: 0.2, fov: 34 }));

/** Pick up, open the cuff, insert fingers, pull to the wrist and check each hand in turn. */
export function* fitGloves(c) {
  const w = c.worker;
  w.setFolded(false);
  handsShot(c);
  for (const [index, side, helper, sign] of [[0, 'L', 'R', 1], [1, 'R', 'L', -1]]) {
    const glove = c.props.looseGloves[index];
    glove.updateWorldMatrix(true, false);
    const pickup = glove.getWorldPosition(V(0, 0, 0));
    w.setGrip(helper, 0.1);
    yield* c.reach(helper, pickup, 0.9);
    w.setGrip(helper, 0.65);
    c.w.content.attach(glove);
    c.carry(glove, { hand: helper, off: [0, 0, 0.02] });
    const insert = { t: 0 }, pull = { t: 0 };
    const receiving = () => bodyPoint(w, sign * 0.1, 1.16, 0.3 + insert.t * 0.07);
    const cuff = () => w.wristPos(side).add(w.forward().multiplyScalar(0.08 * (1 - pull.t))).add(V(0, -0.008, 0));
    w.setIK(side, receiving, null, { fingers: () => w._dir(0, 0, 1), palm: () => w._dir(0, -1, 0) });
    w.setIK(helper, cuff);
    w.setGaze(receiving);
    w.setGrip(side, 0); w.arms[side].handRig.setSpread(0.5);
    c.adjust({ lean: 0, headPitch: 0.25 });
    yield* c.wait(0.8);
    yield* c.tween(0.85, (t) => { insert.t = t; w.setGlove(side, t); glove.scale.setScalar(1 - t * 0.85); });
    c.uncarry(glove); glove.visible = false;
    yield* c.tween(0.7, (t) => { pull.t = t; });
    w.setGrip(helper, 0.1); c.release(helper);
    w.arms[side].handRig.setSpread(1);
    yield* c.wait(0.4);
    w.arms[side].handRig.setSpread(0);
    w.setGrip(side, 0.75); yield* c.wait(0.4);
    w.setGrip(side, 0.15); c.release(side);
  }
  w.setPPE('gloves', true); c.gaze(null); c.pose('idle');
}

/** The glasses are held by their frame and moved to eye level before the worn mesh appears. */
export function* fitGlasses(c) {
  const w = c.worker, glasses = c.props.ppeGlasses;
  glasses.updateWorldMatrix(true, false);
  yield* c.reach('R', glasses.getWorldPosition(V(0, 0, 0)), 0.9);
  w.setGrip('R', 0.5);
  c.w.content.attach(glasses); c.carry(glasses, { hand: 'R', off: [0.04, 0, 0] });
  c.cam(orbit(() => w.head.localToWorld(V(0, 0.12, 0.08)), { dist: 1.5, az: () => w.heading + 0.4, el: 0.12, fov: 34 }));
  const move = { t: 0 }, from = w.handPos('R');
  const atFace = () => w.head.localToWorld(V(-0.04, 0.128, 0.16));
  w.setIK('R', () => from.clone().lerp(atFace(), move.t));
  yield* c.tween(1.2, (t) => { move.t = t; });
  yield* c.wait(0.35);
  c.uncarry(glasses); glasses.visible = false; w.setPPE('glasses', true);
  yield* c.wait(0.3); w.setGrip('R', 0.15); c.release('R'); c.pose('idle');
}

/** Peel one cuff at a time rather than switching both hands to bare skin at once. */
export function* removeGloves(c) {
  const w = c.worker;
  handsShot(c);
  for (const [side, helper, sign] of [['L', 'R', 1], ['R', 'L', -1]]) {
    const peel = { t: 0 };
    const receiving = () => bodyPoint(w, sign * 0.1, 1.15, 0.32);
    w.setIK(side, receiving, null, { fingers: () => w._dir(0, 0, 1), palm: () => w._dir(0, -1, 0) });
    w.setIK(helper, () => w.wristPos(side).add(w.forward().multiplyScalar(peel.t * 0.16)).add(V(0, -0.008, 0)));
    w.setGrip(side, 0.1); w.setGrip(helper, 0.65); c.gaze(receiving);
    yield* c.wait(0.7);
    yield* c.tween(1, (t) => { peel.t = t; w.setGlove(side, 1 - t); });
    c.release(helper); c.release(side); w.setGrip(helper, 0.2);
    yield* c.wait(0.3);
  }
  w.setPPE('gloves', false); c.gaze(null); c.pose('idle');
}

/** Controlled palm, back-of-hand and finger rubbing above the basin, with both hands in contact. */
export function* washHands(c) {
  const w = c.worker, center = V(-1.7, 1.02, -2.62), motion = { t: 0 };
  c.cam(orbit(center, { dist: 1.45, az: 0.7, el: 0.4, fov: 34 }));
  c.pose({ lean: 0.2, headPitch: 0.3 }); c.gaze(center);
  c.w.water = true;
  for (const phase of ['palms', 'backL', 'backR', 'fingers']) {
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const onBack = phase === 'backL' || phase === 'backR';
      const upper = phase === 'backL' ? side === 'R' : side === 'L';
      w.setIK(side, () => center.clone().add(V(sign * 0.025 + Math.sin(motion.t * 8) * 0.018, onBack ? (upper ? 0.016 : -0.016) : sign * 0.008, sign * Math.cos(motion.t * 8) * 0.015)), null,
        { fingers: () => w._dir(0, 0, 1), palm: () => w._dir(0, onBack ? -1 : -sign, 0) });
      w.setGrip(side, phase === 'fingers' ? 0.45 : 0.05);
      w.arms[side].handRig.setSpread(phase === 'fingers' ? 0.4 : 0.1);
    }
    yield* c.tween(1.6, (t) => { motion.t = t; });
  }
  c.w.water = false;
  for (const side of ['L', 'R']) { w.arms[side].handRig.setSpread(0); w.setGrip(side, 0.2); c.release(side); }
  c.gaze(null); c.pose('idle');
}

/** The point a fraction t (0 to 1) of the way along a line of points. */
export function along(pts, t) {
  if (pts.length === 1) return pts[0].clone();
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); total += d; }
  let want = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) { if (want <= seg[i] || i === seg.length - 1) return pts[i].clone().lerp(pts[i + 1], seg[i] ? Math.min(1, want / seg[i]) : 0); want -= seg[i]; }
  return pts[pts.length - 1].clone();
}

/** Walk up to the parked machine, take the wand in the right hand and start working with it. */
export function* takeTool(c, opts = {}) {
  const h = c.vac.handle(V(0, 0, 0));
  const sx = h.x + 0.3, sz = h.z + 0.65;
  yield* c.walk(sx, sz, { face: Math.atan2(h.x - sx, h.z - sz) });
  c.adjust({ armR: [0.5, 0.1, 0.3], lean: 0.1 });
  c.worker.setGrip('R', 0.05);
  yield* c.reach('R', () => c.vac.handle(V(0, 0, 0)), 0.7);
  // Close around the handle only after arriving, then let the tool follow the hand.
  yield* c.tween(0.35, (t) => c.worker.setGrip('R', 0.05 + t * 0.65));
  c.w.operate({ clean: false, ...opts });
  c.pose('idle');
  yield* c.wait(0.9);
}

/** Let go of the wand; it settles back against the machine. */
export function* putDownTool(c) {
  c.w.operate(null);
  yield* c.wait(0.9);
}
