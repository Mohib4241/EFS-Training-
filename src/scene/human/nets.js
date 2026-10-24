// Turns a distance function into a triangle mesh with "surface nets": the space is cut into small
// cubes; every cube the surface passes through gets one vertex (at the average of the points where the
// surface crosses the cube's edges), and every cube edge the surface crosses becomes a four-sided face
// joining the four cubes round that edge. The vertices are then pulled exactly onto the surface, and
// each gets its normal from the distance function, so the result is smooth.
//
// A body is the same on the left and the right, so `mirrorX` samples only one half and copies it.
import { gradient } from './sdf.js';

/**
 * f: (x, y, z) => signed distance. min, max: [x, y, z] corners of the box to mesh. h: cube size.
 * Returns { positions: Float32Array, normals: Float32Array, indices: Uint32Array }.
 */
export function surfaceNets(f, min, max, h, { mirrorX = false, project = 2 } = {}) {
  let x0 = min[0], nx;
  if (mirrorX) { const half = Math.ceil(Math.max(Math.abs(min[0]), Math.abs(max[0])) / h) + 1; nx = 2 * half + 1; x0 = -half * h; }
  else nx = Math.ceil((max[0] - min[0]) / h) + 2;
  const y0 = min[1] - h * 0.5, z0 = min[2] - h * 0.5;
  const ny = Math.ceil((max[1] - min[1]) / h) + 2, nz = Math.ceil((max[2] - min[2]) / h) + 2;
  const N = nx * ny * nz, s = new Float32Array(N);
  const at = (i, j, k) => i + nx * (j + ny * k);

  // sample the distance at every grid point (one half only when mirrored)
  const mid = (nx - 1) / 2;
  for (let k = 0; k < nz; k++) {
    const z = z0 + k * h;
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * h, row = nx * (j + ny * k);
      if (mirrorX) {
        for (let i = mid; i < nx; i++) { const v = f(x0 + i * h, y, z); s[row + i] = v; s[row + (nx - 1 - i)] = v; }
      } else for (let i = 0; i < nx; i++) s[row + i] = f(x0 + i * h, y, z);
    }
  }
  // keep the border outside, so every surface is closed
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) { const n = at(i, j, k); if (s[n] < h * 0.5) s[n] = h * 0.5; }
  }

  // one vertex per cube that the surface passes through
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellV = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const CORNER = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const q = CORNER[c]; v[c] = s[at(i + q[0], j + q[1], k + q[2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]), qa = CORNER[a], qb = CORNER[b];
      sx += qa[0] + (qb[0] - qa[0]) * t; sy += qa[1] + (qb[1] - qa[1]) * t; sz += qa[2] + (qb[2] - qa[2]) * t; n++;
    }
    cellV[i + cx * (j + cy * k)] = pos.length / 3;
    pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }

  // a face for every grid edge the surface crosses, joining the four cubes round it
  const idx = [];
  const cell = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : cellV[i + cx * (j + cy * k)]);
  const P = (n) => [pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]];
  const d2 = (a, b) => { const A = P(a), B = P(b); return (A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2; };
  const quad = (a, b, c, d, inside) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (!inside) { const t = b; b = d; d = t; }
    if (d2(a, c) < d2(b, d)) idx.push(a, b, c, a, c, d); else idx.push(a, b, d, b, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = s[at(i, j, k)], in0 = v0 < 0;
    // edge along x: the cubes round it lie in y and z
    if (i < nx - 1 && in0 !== (s[at(i + 1, j, k)] < 0)) quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), in0);
    // along y: cubes in z and x
    if (j < ny - 1 && in0 !== (s[at(i, j + 1, k)] < 0)) quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), in0);
    // along z: cubes in x and y
    if (k < nz - 1 && in0 !== (s[at(i, j, k + 1)] < 0)) quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), in0);
  }

  // pull the vertices onto the surface, and take the normals from the distance function
  const positions = new Float32Array(pos), normals = new Float32Array(pos.length);
  for (let n = 0; n < positions.length; n += 3) {
    const ox = positions[n], oy = positions[n + 1], oz = positions[n + 2];
    let x = ox, y = oy, z = oz;
    for (let it = 0; it < project; it++) {
      const d = f(x, y, z); if (Math.abs(d) > h * 2) break;
      const g = gradient(f, x, y, z, h * 0.25);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
    }
    // move at most one cube, so faces cannot fold over where the surface is thin
    const mx = x - ox, my = y - oy, mz = z - oz, m = Math.sqrt(mx * mx + my * my + mz * mz);
    if (m > h) { const k = h / m; x = ox + mx * k; y = oy + my * k; z = oz + mz * k; }
    positions[n] = x; positions[n + 1] = y; positions[n + 2] = z;
    const g = gradient(f, x, y, z, h * 0.35);
    normals[n] = g[0]; normals[n + 1] = g[1]; normals[n + 2] = g[2];
  }
  return { positions, normals, indices: new Uint32Array(idx) };
}
