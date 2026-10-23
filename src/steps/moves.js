// Movements used by several steps.
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
  yield* c.reach('R', () => c.vac.handle(V(0, 0, 0)), 0.7);
  c.w.operate({ clean: false, ...opts });
  c.pose('idle');
  yield* c.wait(0.9);
}

/** Let go of the wand; it settles back against the machine. */
export function* putDownTool(c) {
  c.w.operate(null);
  yield* c.wait(0.9);
}
