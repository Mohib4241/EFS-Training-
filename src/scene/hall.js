// The big room for the Instructions page: an open-plan floor, 14 m wide, with carpet, windows along the
// back wall, pillars, a few desks and plants, and lights hanging from the ceiling. It is cut away on
// the left and the front so the camera can look in. A wall socket is on one of the pillars.
// 1 unit = 1 metre, Y up, the camera looks in from +Z. It has the same pieces the world expects from a
// room (lamps, a socket, a door), so the same machine, worker and cleaning rules work in it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const HALL = {
  x: [-7, 7], z: [-4.5, 3.6],               // the carpet
  socket: V(3.0, 0.38, -2.74),                // the face of the wall socket, on a pillar
  parked: [0.2, 1.1],                         // where the machine waits
  bay: [4.8, 0.9],                            // its marked place for storing
};

export function buildHall(M) {
  const g = new THREE.Group();
  const h = { group: g, hall: true };
  const add = (o, parent = g) => { parent.add(o); return o; };
  const shade = (o, cast = true, recv = true) => { o.castShadow = cast; o.receiveShadow = recv; return o; };
  const box = (w, hh, d, mat, x, y, z, parent = g, r = 0) => {
    const geo = r > 0 ? new RoundedBoxGeometry(w, hh, d, 3, r) : new THREE.BoxGeometry(w, hh, d);
    const m = shade(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); return add(m, parent);
  };
  const cyl = (rt, rb, hh, mat, x, y, z, parent = g, seg = 24) => {
    const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, hh, seg), mat)); m.position.set(x, y, z); return add(m, parent);
  };

  // ───────── floor: polished tile all round, carpet tiles in the middle ─────────
  const W = HALL.x[1] - HALL.x[0], D = HALL.z[1] - HALL.z[0];
  box(17, 0.3, 12.4, M.slab, 0, -0.16, -0.4, g, 0.04);
  const tiles = shade(new THREE.Mesh(new THREE.PlaneGeometry(16.6, 12), M.floorHardBig), false, true);
  tiles.rotation.x = -Math.PI / 2; tiles.position.set(0, 0.001, -0.4); add(tiles);
  const cz = (HALL.z[0] + HALL.z[1]) / 2;
  const carpet = shade(new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, D), M.carpetBig), false, true);
  carpet.position.set(0, 0.011, cz); add(carpet);
  for (const [bw, bd, x, z] of [[W + 0.1, 0.05, 0, HALL.z[0] - 0.02], [W + 0.1, 0.05, 0, HALL.z[1] + 0.02], [0.05, D, HALL.x[0] - 0.02, cz], [0.05, D, HALL.x[1] + 0.02, cz]]) box(bw, 0.026, bd, M.metal, x, 0.013, z);
  h.floor = tiles; h.carpet = carpet;

  // ───────── back wall with windows, right wall ─────────
  const T = 0.16, H = 3.6, wz = -5.0;
  box(16.6, 0.95, T, M.wall, 0, 0.475, wz); box(16.6, 0.8, T, M.wall, 0, H - 0.4, wz);
  const sky = canvasTex(8, 256, (c, w, hh) => { const gr = c.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#9fc8f5'); gr.addColorStop(0.6, '#d9ecff'); gr.addColorStop(1, '#fbfeff'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); }, { aniso: 1 });
  const skyMat = sky ? new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }) : M.corridor;
  const piers = [-8.1, -4.6, -1.15, 2.3, 5.8, 8.1];
  for (let i = 0; i < piers.length; i++) box(0.5, H - 1.75, T, M.wall, piers[i], 0.95 + (H - 1.75) / 2, wz);
  for (let i = 0; i < piers.length - 1; i++) {
    const x0 = piers[i] + 0.25, x1 = piers[i + 1] - 0.25;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, H - 1.75), skyMat); win.position.set((x0 + x1) / 2, 0.95 + (H - 1.75) / 2, wz - 0.04); add(win);
    box(0.04, H - 1.75, 0.06, M.dark, (x0 + x1) / 2, 0.95 + (H - 1.75) / 2, wz + 0.02);       // a mullion down the middle of each window
    box(x1 - x0, 0.05, 0.22, M.white, (x0 + x1) / 2, 0.95, wz + 0.08);                          // the sill
  }
  box(T, H, 12.2, M.wall, 8.2, H / 2, -0.4);
  box(16, 0.1, 0.02, M.skirting, 0, 0.05, wz + 0.09);

  // ───────── the machine's marked place on the floor ─────────
  const bayTex = canvasTex(256, 192, (c, w, hh) => { c.clearRect(0, 0, w, hh); c.strokeStyle = '#2e7bd6'; c.lineWidth = 12; c.strokeRect(10, 10, w - 20, hh - 20); c.fillStyle = 'rgba(46,123,214,0.14)'; c.fillRect(10, 10, w - 20, hh - 20); });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.85), bayTex ? new THREE.MeshBasicMaterial({ map: bayTex, transparent: true, depthWrite: false }) : M.blue);
  bay.rotation.x = -Math.PI / 2; bay.position.set(HALL.bay[0], 0.024, HALL.bay[1]); bay.renderOrder = 1; add(bay);

  // ───────── pillars; one of them carries the wall socket ─────────
  const pillar = (x, z) => { box(0.52, H, 0.52, M.wall, x, H / 2, z, g, 0.01); box(0.56, 0.12, 0.56, M.skirting, x, 0.06, z); };
  for (const [x, z] of [[-5.2, -3.2], [3.0, -3.0], [-5.2, 1.6], [6.0, 1.6]]) pillar(x, z);
  const sp = HALL.socket;
  box(0.13, 0.13, 0.02, M.white, sp.x, sp.y - 0.03, sp.z - 0.002, g, 0.006);
  box(0.02, 0.025, 0.012, M.black, sp.x - 0.035, sp.y - 0.05, sp.z + 0.012); box(0.02, 0.025, 0.012, M.black, sp.x + 0.035, sp.y - 0.05, sp.z + 0.012);
  const rocker = box(0.035, 0.02, 0.018, M.dark, sp.x, sp.y + 0.015, sp.z + 0.01, g, 0.004);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.redLed); led.position.set(sp.x + 0.045, sp.y + 0.015, sp.z + 0.01); add(led);
  h.socket = { plate: null, rocker, led, on: false, pos: sp.clone().add(V(0, -0.03, 0)) };

  // ───────── desks, chairs, monitors ─────────
  const r = rng(12);
  const desk = (x, z, ry) => {
    const d = new THREE.Group(); d.position.set(x, 0, z); d.rotation.y = ry; add(d);
    box(1.5, 0.04, 0.75, M.wood, 0, 0.74, 0, d, 0.01);
    for (const [px, pz] of [[-0.7, -0.33], [0.7, -0.33], [-0.7, 0.33], [0.7, 0.33]]) box(0.05, 0.72, 0.05, M.metal, px, 0.36, pz, d);
    box(0.56, 0.34, 0.025, M.black, 0, 1.0, -0.2, d, 0.01); box(0.05, 0.2, 0.04, M.dark, 0, 0.86, -0.2, d); box(0.2, 0.02, 0.14, M.dark, 0, 0.765, -0.17, d);
    box(0.42, 0.015, 0.14, M.white, 0, 0.77, 0.12, d, 0.004);
    const chair = new THREE.Group(); chair.position.set(0.1 * (r() - 0.5), 0, 0.72 + 0.1 * r()); chair.rotation.y = (r() - 0.5) * 0.7; d.add(chair);
    box(0.46, 0.06, 0.46, M.dark, 0, 0.46, 0, chair, 0.03); box(0.44, 0.5, 0.06, M.dark, 0, 0.78, 0.22, chair, 0.03); cyl(0.03, 0.03, 0.42, M.metal, 0, 0.23, 0, chair);
    cyl(0.25, 0.25, 0.03, M.dark, 0, 0.02, 0, chair);
  };
  for (const z of [-3.9, -2.5]) desk(-6.2, z, Math.PI / 2 * 0 + 0.0);
  desk(-3.4, -4.0, 0); desk(-1.8, -4.0, 0);
  desk(6.2, -3.6, 0); desk(6.2, -2.2, Math.PI);

  // ───────── plants ─────────
  const plant = (x, z, s = 1) => {
    cyl(0.2 * s, 0.15 * s, 0.34 * s, M.pot, x, 0.17 * s, z);
    for (const [px, py, pz, ps] of [[0, 0.62, 0, 0.3], [0.12, 0.95, 0.04, 0.24], [-0.12, 0.8, -0.06, 0.22], [0.02, 1.15, -0.02, 0.17]]) { const l = shade(new THREE.Mesh(new THREE.SphereGeometry(ps * s, 14, 10), M.plant)); l.position.set(x + px * s, py * s, z + pz * s); add(l); }
  };
  plant(-4.1, -2.0, 1.2); plant(7.2, -4.2, 1.3); plant(1.0, -4.3, 1.0);

  // ───────── ceiling lights, hanging ─────────
  h.lamps = [];
  for (const [x, z] of [[-4.2, -1.4], [0.6, -1.4], [5.0, -1.4], [-1.8, 2.2]]) {
    const lamp = box(2.0, 0.06, 0.5, M.lamp, x, 3.35, z, g, 0.02);
    for (const sx of [-0.8, 0.8]) cyl(0.004, 0.004, 0.25, M.metal, x + sx, 3.5, z, g, 6);
    const pl = new THREE.PointLight(0xffe9c8, 3.4, 11, 2); pl.position.set(x, 3.0, z); add(pl);
    h.lamps.push({ lamp, light: pl, base: pl.intensity });
  }

  // ───────── things the world touches, kept as quiet stand-ins ─────────
  h.doorHinge = new THREE.Group(); g.add(h.doorHinge);
  h.store = { group: new THREE.Group(), doorL: new THREE.Group(), doorR: new THREE.Group(), bay: V(0, 0, 0) };
  h.basin = { group: new THREE.Group(), water: { visible: false }, hands: V(0, 1, 0) };
  h.breaker = { lever: new THREE.Group(), pos: V(8, 1.4, 0) };
  h.lightSwitch = { rocker: new THREE.Group(), pos: V(8, 1.2, 0) };
  h.acLed = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), M.green); h.acLed.position.set(0, 3, wz + 0.2); add(h.acLed);
  h.tablePPE = h.tableKit = new THREE.Group();
  h.anchors = { socket: () => sp.clone().add(V(0, -0.02, 0.05)), bay: () => V(HALL.bay[0], 0.1, HALL.bay[1]) };
  return h;
}
