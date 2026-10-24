// Signed distance functions: a shape is described by how far a point is from its surface (negative
// inside). Simple shapes (balls, capsules, tapered capsules, rounded boxes, ellipsoids) are joined with a
// smooth minimum, so a body built from them has soft, natural joins (a shoulder flows into an arm), and
// clothes are the same shapes made a little bigger and cut off where the cloth ends.
//
// Points and vectors are plain [x, y, z] arrays here, because these run a few hundred thousand times
// while the body is built and must not make garbage.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.sqrt(dot(a, a));
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Smooth minimum (polynomial): joins two shapes with a fillet of size k. */
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth maximum: cuts with a soft edge. */
export function smax(a, b, k) { return -smin(-a, -b, k); }

// ───────────── primitives: each returns a function (x, y, z) => distance ─────────────

export function sphere(c, r) {
  const [cx, cy, cz] = c;
  return (x, y, z) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;
}

/** Ellipsoid (a close bound, good enough for modelling). */
export function ellipsoid(c, r) {
  const [cx, cy, cz] = c, [rx, ry, rz] = r;
  return (x, y, z) => {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx, qy = py / ry, qz = pz / rz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-9;
    return k0 * (k0 - 1) / k1;
  };
}

/** A capsule from a to b with radius r. */
export function capsule(a, b, r) {
  const [ax, ay, az] = a, bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az, bb = bx * bx + by * by + bz * bz || 1e-9;
  return (x, y, z) => {
    const px = x - ax, py = y - ay, pz = z - az;
    const h = clamp((px * bx + py * by + pz * bz) / bb, 0, 1);
    const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
}

/** A tapered capsule: radius ra at a, rb at b (exact; from Inigo Quilez's "round cone"). */
export function roundCone(a, b, ra, rb) {
  const [ax, ay, az] = a, bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
}

/** A box with rounded edges, centred at c, half-sizes h, rounding r; optionally turned by a 3x3 matrix m (rows). */
export function roundBox(c, h, r, m = null) {
  const [cx, cy, cz] = c, [hx, hy, hz] = h;
  return (x, y, z) => {
    let px = x - cx, py = y - cy, pz = z - cz;
    if (m) { const ux = m[0] * px + m[1] * py + m[2] * pz, uy = m[3] * px + m[4] * py + m[5] * pz, uz = m[6] * px + m[7] * py + m[8] * pz; px = ux; py = uy; pz = uz; }
    const qx = Math.abs(px) - hx + r, qy = Math.abs(py) - hy + r, qz = Math.abs(pz) - hz + r;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
  };
}

/** The half-space on the side of a plane that the normal n points away from: kept where dot(p - o, n) < 0. */
export function halfSpace(o, n) {
  const [ox, oy, oz] = o, [nx, ny, nz] = norm(n);
  return (x, y, z) => (x - ox) * nx + (y - oy) * ny + (z - oz) * nz;
}

/** A gradient (surface normal) of a distance function, by central differences. */
export function gradient(f, x, y, z, e = 0.0005) {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
  return [gx / l, gy / l, gz / l];
}
