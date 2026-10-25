// The narrator's body, described once and used twice: at build time it is turned into meshes (see
// tools/human.mjs), and in the page the same description gives each vertex its bone weights.
//
// The body is built in a relaxed "A" pose: standing, facing +Z, the person's left is +X, the floor at
// y = 0, metres. Each part (a shoulder, a forearm, a finger bone...) is a soft shape tied to one bone of
// the skeleton. The clothes are the same shapes made a little larger and cut where the cloth ends: a
// short-sleeved polo tucked into dark trousers, a belt, and black work shoes. The head is not here: it
// is the separate face rig in character.js, set on the head bone.
import { roundCone, ellipsoid, capsule, roundBox, smin, smax, halfSpace, norm, add, mul, sub, cross, dot } from './sdf.js';

// ───────────── the skeleton (bind pose, world positions of the joints) ─────────────
const ARM_ANGLE = 40 * Math.PI / 180;                         // how far the arms hang out from the sides in the bind pose
export const ARM_DIR = (s) => norm([s * Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0.035]);
export const L = { upper: 0.285, fore: 0.255, thigh: 0.42, shin: 0.413 };

const J = {
  hips: [0, 0.955, 0], spine: [0, 1.045, -0.008], chest: [0, 1.22, -0.018], neck: [0, 1.425, -0.034], head: [0, 1.512, -0.012],
};
for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
  const d = ARM_DIR(s);
  J[`clavicle${n}`] = [s * 0.025, 1.398, -0.016];
  J[`upperArm${n}`] = [s * 0.178, 1.405, -0.04];
  J[`foreArm${n}`] = add(J[`upperArm${n}`], mul(d, L.upper));
  J[`foreTwist${n}`] = add(J[`foreArm${n}`], mul(d, L.fore * 0.5));
  J[`hand${n}`] = add(J[`foreArm${n}`], mul(d, L.fore));
  J[`thigh${n}`] = [s * 0.088, 0.915, 0.004];
  J[`shin${n}`] = [s * 0.093, 0.495, 0.02];
  J[`foot${n}`] = [s * 0.098, 0.082, -0.016];
  J[`toe${n}`] = [s * 0.103, 0.024, 0.118];
}
export const JOINTS = J;

// The hand is drawn in its own frame first ("canonical": the wrist at the origin, the fingers along
// -y, the back of the hand towards +x and the thumb towards +z, for the left hand), then turned into
// place along the arm. The right hand is its mirror image.
export const HAND = {
  // knuckle (MCP) positions and the lengths of the three finger bones
  fingers: [
    { id: 'index', base: [0.002, -0.093, 0.027], len: [0.04, 0.024, 0.02], r: [0.0098, 0.0089, 0.008] },
    { id: 'middle', base: [0.003, -0.096, 0.0085], len: [0.044, 0.027, 0.021], r: [0.01, 0.0091, 0.0082] },
    { id: 'ring', base: [0.002, -0.093, -0.0095], len: [0.041, 0.025, 0.02], r: [0.0095, 0.0086, 0.0078] },
    { id: 'pinky', base: [0.0, -0.086, -0.026], len: [0.032, 0.02, 0.018], r: [0.0085, 0.0077, 0.007] },
  ],
  // the thumb: base (CMC), then the joints in order, in the canonical frame
  thumb: { pts: [[-0.004, -0.018, 0.024], [-0.016, -0.052, 0.046], [-0.022, -0.079, 0.059], [-0.025, -0.1, 0.066]], r: [0.0125, 0.0104, 0.0094, 0.0085] },
};

/**
 * Where the hand sits in the bind pose, for a side (1 left, -1 right): `F` along the fingers, `out` the
 * way the back of the hand faces (away from the body), `fwd` the thumb side (forward). For the right
 * hand `out` points the other way, which makes it the mirror image of the left.
 */
export function handBasis(s) {
  const F = ARM_DIR(s);
  const out = norm(sub([s, 0, 0], mul(F, dot([s, 0, 0], F))));
  const fwd = mul(cross(out, mul(F, -1)), s);
  return { F, out, fwd };
}
/** A point of the canonical hand to the bind pose of a side. */
export function handToWorld(p, s) {
  const b = handBasis(s), w = J[s > 0 ? 'handL' : 'handR'];
  return [0, 1, 2].map((i) => w[i] + b.out[i] * p[0] - b.F[i] * p[1] + b.fwd[i] * p[2]);
}

// The bones: name, parent, joint. Fingers are added per side.
export const BONES = [
  ['root', null, [0, 0, 0]], ['hips', 'root', J.hips], ['spine', 'hips', J.spine], ['chest', 'spine', J.chest], ['neck', 'chest', J.neck], ['head', 'neck', J.head],
];
for (const n of ['L', 'R']) {
  const s = n === 'L' ? 1 : -1;
  BONES.push([`clavicle${n}`, 'chest', J[`clavicle${n}`]], [`upperArm${n}`, `clavicle${n}`, J[`upperArm${n}`]], [`foreArm${n}`, `upperArm${n}`, J[`foreArm${n}`]],
    [`foreTwist${n}`, `foreArm${n}`, J[`foreTwist${n}`]], [`hand${n}`, `foreTwist${n}`, J[`hand${n}`]]);
  for (const f of HAND.fingers) {
    let p = f.base, parent = `hand${n}`;
    for (let k = 0; k < 3; k++) {
      const name = `${f.id}${k + 1}${n}`;
      BONES.push([name, parent, handToWorld(p, s)]);
      parent = name; p = [p[0], p[1] - f.len[k], p[2]];
    }
  }
  { let parent = `hand${n}`; for (let k = 0; k < 3; k++) { const name = `thumb${k + 1}${n}`; BONES.push([name, parent, handToWorld(HAND.thumb.pts[k], s)]); parent = name; } }
  BONES.push([`thigh${n}`, 'hips', J[`thigh${n}`]], [`shin${n}`, `thigh${n}`, J[`shin${n}`]], [`foot${n}`, `shin${n}`, J[`foot${n}`]], [`toe${n}`, `foot${n}`, J[`toe${n}`]]);
}
export const BONE_INDEX = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
export const PARENT = Object.fromEntries(BONES.map((b) => [b[0], b[1]]));

// ───────────── the parts of the body ─────────────
// Each part: a shape and the bone it moves with. `soft` is how widely its weight blends into its
// neighbours (metres).
function bodyParts() {
  const P = [];
  const part = (id, bone, f, soft = 0.016) => P.push({ id, bone, f, soft });
  // torso
  part('pelvis', 'hips', ellipsoid([0, 0.952, -0.006], [0.157, 0.108, 0.112]), 0.03);
  part('glutes', 'hips', (x, y, z) => ellipsoid([Math.sign(x || 1) * 0.07, 0.902, -0.052], [0.077, 0.092, 0.067])(x, y, z), 0.03);
  part('belly', 'spine', ellipsoid([0, 1.07, 0.008], [0.148, 0.135, 0.1]), 0.035);
  part('ribs', 'chest', ellipsoid([0, 1.258, -0.008], [0.173, 0.168, 0.114]), 0.035);
  part('pecs', 'chest', (x, y, z) => ellipsoid([Math.sign(x || 1) * 0.07, 1.302, 0.058], [0.077, 0.056, 0.046])(x, y, z), 0.03);
  part('lats', 'chest', (x, y, z) => ellipsoid([Math.sign(x || 1) * 0.118, 1.25, -0.034], [0.068, 0.12, 0.074])(x, y, z), 0.03);
  part('traps', 'chest', capsule([-0.105, 1.392, -0.05], [0.105, 1.392, -0.05], 0.052), 0.03);
  part('neckBase', 'neck', roundCone([0, 1.37, -0.036], [0, 1.47, -0.028], 0.061, 0.053), 0.02);
  part('neck', 'head', roundCone([0, 1.47, -0.028], [0, 1.56, -0.012], 0.053, 0.046), 0.02);
  for (const [s, n] of [[1, 'L'], [-1, 'R']]) {
    const sh = J[`upperArm${n}`], el = J[`foreArm${n}`], wr = J[`hand${n}`], d = ARM_DIR(s);
    part(`shoulder${n}`, `clavicle${n}`, ellipsoid([s * 0.158, 1.392, -0.038], [0.058, 0.052, 0.058]), 0.025);
    part(`deltoid${n}`, `upperArm${n}`, roundCone(add(sh, mul(d, -0.008)), add(sh, mul(d, 0.125)), 0.061, 0.045), 0.02);
    part(`upperArm${n}`, `upperArm${n}`, roundCone(sh, el, 0.048, 0.038), 0.016);
    part(`biceps${n}`, `upperArm${n}`, roundCone(add(add(sh, mul(d, 0.09)), [0, 0, 0.01]), add(add(sh, mul(d, 0.22)), [0, 0, 0.008]), 0.036, 0.03), 0.016);
    part(`foreArm${n}`, `foreArm${n}`, (x, y, z) => smin(roundCone(el, add(el, mul(d, 0.085)), 0.04, 0.0395)(x, y, z), roundCone(add(el, mul(d, 0.085)), wr, 0.0395, 0.026)(x, y, z), 0.02), 0.014);
    part(`thigh${n}`, `thigh${n}`, roundCone(J[`thigh${n}`], J[`shin${n}`], 0.084, 0.052), 0.02);
    part(`quad${n}`, `thigh${n}`, roundCone(add(J[`thigh${n}`], [s * 0.005, -0.12, 0.022]), add(J[`shin${n}`], [0, 0.07, 0.014]), 0.068, 0.046), 0.02);
    part(`shin${n}`, `shin${n}`, roundCone(J[`shin${n}`], J[`foot${n}`], 0.05, 0.034), 0.016);
    part(`calf${n}`, `shin${n}`, roundCone(add(J[`shin${n}`], [0, -0.06, -0.022]), add(J[`shin${n}`], [0, -0.24, -0.016]), 0.05, 0.036), 0.016);
    part(`foot${n}`, `foot${n}`, roundCone(J[`foot${n}`], J[`toe${n}`], 0.034, 0.028), 0.012);
    part(`heel${n}F`, `foot${n}`, roundCone(add(J[`foot${n}`], [0, -0.03, -0.035]), add(J[`foot${n}`], [0, -0.055, 0.02]), 0.03, 0.026), 0.012);
    part(`toe${n}`, `toe${n}`, roundCone(J[`toe${n}`], add(J[`toe${n}`], [0, -0.004, 0.062]), 0.027, 0.02), 0.01);
    // the hand: the palm, the ball of the thumb, and each finger bone
    const H = (p) => handToWorld(p, s);
    const pb = handBasis(s);
    // the palm: a rounded box in the hand's own frame (rows: its axes in the world)
    const rows = [...pb.out, ...mul(pb.F, -1), ...pb.fwd];
    part(`palm${n}`, `hand${n}`, roundBox(H([0.0005, -0.052, 0.001]), [0.0135, 0.047, 0.04], 0.0125, rows), 0.006);
    part(`heel${n}`, `hand${n}`, roundCone(H([-0.004, -0.012, 0.0]), H([-0.006, -0.04, -0.018]), 0.021, 0.017), 0.008);
    part(`thenar${n}`, `thumb1${n}`, roundCone(H(HAND.thumb.pts[0]), H([-0.012, -0.045, 0.036]), 0.017, 0.0135), 0.006);
    for (const f of HAND.fingers) {
      let p = f.base;
      for (let k = 0; k < 3; k++) {
        const q = [p[0], p[1] - f.len[k], p[2]];
        part(`${f.id}${k + 1}${n}`, `${f.id}${k + 1}${n}`, roundCone(H(p), H(q), f.r[k], k === 2 ? f.r[k] * 0.86 : f.r[k + 1] ?? f.r[k]), 0.0016);
        p = q;
      }
    }
    for (let k = 0; k < 3; k++) {
      const a = HAND.thumb.pts[k], b = HAND.thumb.pts[k + 1];
      part(`thumb${k + 1}${n}`, `thumb${k + 1}${n}`, roundCone(H(a), H(b), HAND.thumb.r[k], HAND.thumb.r[k + 1]), 0.0018);
    }
  }
  return P;
}
export const PARTS = bodyParts();
const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const pf = (id) => byId[id].f;
const U = (ids, k) => { const fs = ids.map(pf); return (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k); return d; }; };

// ───────────── the meshes ─────────────
// Each mesh: a distance function, the box to build it in, the size of the cubes, and which parts give
// the bones their weights. `frame` builds a mesh in a turned frame (for an arm, along the arm).

const torso = U(['belly', 'ribs', 'pecs', 'lats', 'traps', 'shoulderL', 'shoulderR', 'deltoidL', 'deltoidR'], 0.045);
const sleeve = (s) => {
  const n = s > 0 ? 'L' : 'R', sh = J[`upperArm${n}`], d = ARM_DIR(s);
  const tube = roundCone(add(sh, mul(d, -0.01)), add(sh, mul(d, 0.16)), 0.062, 0.058);
  const hem = halfSpace(add(sh, mul(d, 0.148)), d);
  return (x, y, z) => smax(tube(x, y, z), hem(x, y, z), 0.004);
};
const sleeveL = sleeve(1), sleeveR = sleeve(-1);
const neckHole = roundCone([0, 1.34, -0.026], [0, 1.6, -0.02], 0.056, 0.064);
const tuck = halfSpace([0, 0.975, 0], [0, -1, 0]);

/** The polo shirt: the chest and shoulders made bigger, two short sleeves, a hole for the neck, tucked in. */
export function shirtSDF(x, y, z) {
  let d = torso(x, y, z) - 0.011;
  d = smin(d, sleeveL(x, y, z), 0.03); d = smin(d, sleeveR(x, y, z), 0.03);
  d = smax(d, -neckHole(x, y, z), 0.008);
  d = smax(d, tuck(x, y, z), 0.006);
  return d;
}

const legs = U(['pelvis', 'glutes', 'belly', 'thighL', 'thighR', 'quadL', 'quadR'], 0.04);
const trouserLeg = (s) => {
  const n = s > 0 ? 'L' : 'R';
  return roundCone(add(J[`shin${n}`], [0, 0.04, 0.004]), add(J[`foot${n}`], [0, -0.01, 0.012]), 0.064, 0.058);
};
const tlegL = trouserLeg(1), tlegR = trouserLeg(-1);
const waist = halfSpace([0, 1.003, 0], [0, 1, 0]);
const hem = halfSpace([0, 0.074, 0], [0, -1, 0]);
/** The trousers: hips and legs made bigger, straight below the knee, cut at the waist and above the shoe. */
export function trousersSDF(x, y, z) {
  let d = legs(x, y, z) - 0.014;
  d = smin(d, tlegL(x, y, z), 0.05); d = smin(d, tlegR(x, y, z), 0.05);
  d = smax(d, waist(x, y, z), 0.004);
  d = smax(d, hem(x, y, z), 0.004);
  return d;
}

/** The belt: a band round the waist of the trousers. */
export function beltSDF(x, y, z) {
  let d = legs(x, y, z) - 0.0205;
  d = smax(d, halfSpace([0, 0.998, 0], [0, 1, 0])(x, y, z), 0.002);
  d = smax(d, halfSpace([0, 0.962, 0], [0, -1, 0])(x, y, z), 0.002);
  return d;
}

/** Bare skin: the neck. */
const neckSkin = U(['neckBase', 'neck'], 0.02);
export function neckSDF(x, y, z) {
  let d = neckSkin(x, y, z);
  d = smax(d, halfSpace([0, 1.36, 0], [0, -1, 0])(x, y, z), 0.004);   // starts inside the shirt
  return d;
}

/** An arm, from inside the sleeve to the fingertips. */
export function armSDF(s) {
  const n = s > 0 ? 'L' : 'R';
  const arm = U([`deltoid${n}`, `upperArm${n}`, `biceps${n}`, `foreArm${n}`], 0.03);
  const hand = U([`palm${n}`, `heel${n}`, `thenar${n}`], 0.012);
  const fingers = [];
  for (const f of HAND.fingers) fingers.push(U([`${f.id}1${n}`, `${f.id}2${n}`, `${f.id}3${n}`], 0.003));
  const thumb = U([`thumb1${n}`, `thumb2${n}`, `thumb3${n}`], 0.003);
  // Start just inside the sleeve hem. Extra shoulder skin used to poke through the polo when
  // the arms crossed for glove fitting because skin and cloth have different blended weights.
  const cut = halfSpace(add(J[`upperArm${n}`], mul(ARM_DIR(s), 0.12)), mul(ARM_DIR(s), -1));
  return (x, y, z) => {
    let d = smin(arm(x, y, z), hand(x, y, z), 0.022);
    let fd = fingers[0](x, y, z);
    for (let i = 1; i < 4; i++) fd = Math.min(fd, fingers[i](x, y, z));                // fingers do not melt into each other
    d = smin(d, fd, 0.008);
    d = smin(d, thumb(x, y, z), 0.01);
    return smax(d, cut(x, y, z), 0.004);
  };
}

/** A work shoe's upper, built round the left foot (the right is its mirror). */
export function shoeSDF(x, y, z) {
  const lx = x - J.footL[0];
  const heel = ellipsoid([0, 0.058, -0.048], [0.039, 0.05, 0.046])(lx, y, z);
  const instep = roundCone([0, 0.068, -0.012], [0.004, 0.047, 0.108], 0.046, 0.045)(lx, y, z);
  const toe = ellipsoid([0.005, 0.038, 0.152], [0.047, 0.033, 0.06])(lx, y, z);
  let d = smin(smin(heel, instep, 0.035), toe, 0.03);
  d = smax(d, -roundCone([0, 0.12, -0.026], [0, 0.2, -0.034], 0.037, 0.04)(lx, y, z), 0.008);   // the opening for the ankle
  d = smax(d, halfSpace([0, 0.016, 0], [0, -1, 0])(lx, y, z), 0.004);                         // sits on the sole
  return d;
}
/** The sole: a rubber slab under the shoe, a little wider, with the toe turned up. */
export function soleSDF(x, y, z) {
  const lx = x - J.footL[0];
  const spring = Math.max(0, z - 0.12) * 0.16;                                                 // the toe curves up
  return roundBox([0.004, 0.013 + spring, 0.058], [0.05, 0.013, 0.147], 0.011)(lx, y, z);
}

// The meshes to build, with their boxes (world, bind pose) and cube sizes. `mirror` builds one half
// and copies it; `side` meshes are built for the left and mirrored for the right.
export const MESHES = [
  { id: 'shirt', mat: 'shirt', sdf: shirtSDF, box: [[-0.36, 0.95, -0.18], [0.36, 1.49, 0.16]], h: 0.0045, mirror: true, simplify: 0.00018 },
  { id: 'trousers', mat: 'trousers', sdf: trousersSDF, box: [[-0.24, 0.06, -0.2], [0.24, 1.02, 0.16]], h: 0.0065, mirror: true, simplify: 0.0008 },
  { id: 'belt', mat: 'belt', sdf: beltSDF, box: [[-0.2, 0.955, -0.16], [0.2, 1.005, 0.15]], h: 0.004, mirror: true, simplify: 0.0005 },
  { id: 'neck', mat: 'skin', sdf: neckSDF, box: [[-0.085, 1.35, -0.105], [0.085, 1.6, 0.06]], h: 0.0035, mirror: true, simplify: 0.00015 },
  { id: 'arm', mat: 'skin', side: true, sdf: () => armSDF(1), frame: 'arm', h: 0.0025, simplify: 0.00012 },
  { id: 'shoe', mat: 'shoe', side: true, sdf: () => shoeSDF, box: [[J.footL[0] - 0.065, 0.0, -0.1], [J.footL[0] + 0.07, 0.2, 0.225]], h: 0.0035, simplify: 0.0005 },
  { id: 'sole', mat: 'sole', side: true, sdf: () => soleSDF, box: [[J.footL[0] - 0.065, -0.005, -0.1], [J.footL[0] + 0.07, 0.05, 0.225]], h: 0.0035, simplify: 0.0005 },
];

/** For the arm mesh: a frame along the arm (origin at the shoulder), and the box in that frame. */
export function armFrame(s) {
  const n = s > 0 ? 'L' : 'R', o = J[`upperArm${n}`], u = ARM_DIR(s);
  const v = norm(cross(u, [0, 0, 1])), w = cross(u, v);
  return { o, u, v, w, box: [[-0.07, -0.075, -0.075], [L.upper + L.fore + 0.215, 0.075, 0.075]] };
}
