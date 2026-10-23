// The room the training happens in: a cut-away diorama (back wall and right wall, open on the left
// and front so the camera can see in). Hard floor on the left, carpet on the right, a door with a
// traffic lane in front of it, a wall socket near the exit, a store cupboard, a basin, two tables.
// 1 unit = 1 metre, Y up, the camera looks in from +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rr } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Where things happen, as [x, z] on the floor.
export const PLACES = {
  outside: [5.4, -0.3], door: [3.5, -0.3],
  sign: [3.1, 1.15],
  basin: [-1.7, -2.0],
  ppe: [-2.55, 0.25], equip: [-2.55, 1.75],
  vac: [0.1, 2.2],
  breaker: [2.0, -2.15],
  socket: [3.0, -2.45],
  store: [-3.3, -1.6],
  lightSwitch: [3.4, 0.75],
  corner: [3.9, -2.9],
};
export const SOCKET_POS = V(3.0, 0.35, -2.97); // the face of the wall socket
export const CARPET_X = 0.5;                    // the carpet starts here, hard floor to the left

export function buildRoom(M) {
  const g = new THREE.Group();
  const h = { group: g };
  const add = (o, parent = g) => { parent.add(o); return o; };
  const shade = (o, cast = true, recv = true) => { o.castShadow = cast; o.receiveShadow = recv; return o; };
  const box = (w, hh, d, mat, x, y, z, parent = g, r = 0) => {
    const geo = r > 0 ? new RoundedBoxGeometry(w, hh, d, 3, r) : new THREE.BoxGeometry(w, hh, d);
    const m = shade(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); return add(m, parent);
  };
  const cyl = (rt, rb, hh, mat, x, y, z, parent = g, seg = 28) => {
    const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, hh, seg), mat)); m.position.set(x, y, z); return add(m, parent);
  };

  // ───────── base, floor, carpet ─────────
  box(8.5, 0.3, 6.5, M.slab, 0, -0.16, 0, g, 0.04);
  const floor = shade(new THREE.Mesh(new THREE.PlaneGeometry(8, 6), M.floorHard), false, true);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; add(floor);
  const cw = 4 - CARPET_X;
  const carpet = shade(new THREE.Mesh(new THREE.BoxGeometry(cw, 0.02, 6), M.carpet), false, true);
  carpet.position.set(CARPET_X + cw / 2, 0.011, 0); add(carpet);
  box(0.05, 0.026, 6, M.metal, CARPET_X, 0.013, 0, g);          // the strip between hard floor and carpet
  h.floor = floor; h.carpet = carpet;

  // ───────── walls ─────────
  const T = 0.14, H = 2.8;
  box(8.28, H, T, M.wall, 0, H / 2, -3 - T / 2);                          // back
  box(T, H, 2.2, M.wall, 4 + T / 2, H / 2, -3 + 1.1 - T / 2 + 0.07);      // right, behind the door
  box(T, H, 2.8, M.wall, 4 + T / 2, H / 2, 1.6);                           // right, in front of the door
  box(T, H - 2.05, 1.0, M.wall, 4 + T / 2, 2.05 + (H - 2.05) / 2, -0.3);  // above the door
  // skirting boards: the edge the crevice tool follows
  box(8, 0.1, 0.02, M.skirting, 0, 0.05, -2.99);
  box(0.02, 0.1, 2.2, M.skirting, 3.99, 0.05, -1.9 - 0.07);
  box(0.02, 0.1, 2.8, M.skirting, 3.99, 0.05, 1.6);

  // ───────── the door, with a bright corridor behind it ─────────
  const frame = M.dark;
  box(0.1, 0.08, 1.12, frame, 4.0, 2.07, -0.3); box(0.1, 2.07, 0.06, frame, 4.0, 1.035, -0.83); box(0.1, 2.07, 0.06, frame, 4.0, 1.035, 0.23);
  const hinge = new THREE.Group(); hinge.position.set(4.06, 0, 0.2); add(hinge);
  box(0.05, 2.0, 1.0, M.door, 0, 1.0, -0.5, hinge, 0.012);
  box(0.03, 0.04, 0.16, M.metal, 0.04, 1.0, -0.88, hinge);
  hinge.rotation.y = -1.7; h.doorHinge = hinge;
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), M.corridor); hall.rotation.y = -Math.PI / 2; hall.position.set(6.4, 1.2, -0.3); add(hall);
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), M.floorHard); hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(5.2, 0.002, -0.3); add(hallFloor);
  const exitTex = canvasTex(256, 96, (c, w, hh) => {
    c.fillStyle = '#16b36a'; c.fillRect(0, 0, w, hh); c.fillStyle = '#fff'; c.font = '700 54px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2 + 18, hh / 2 + 3);
    c.beginPath(); c.arc(40, 30, 9, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.beginPath(); c.moveTo(42, 42); c.lineTo(30, 72); c.moveTo(42, 44); c.lineTo(62, 56); c.moveTo(42, 44); c.lineTo(22, 52); c.stroke();
  });
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), exitTex ? new THREE.MeshBasicMaterial({ map: exitTex }) : M.green);
  exitSign.rotation.y = -Math.PI / 2; exitSign.position.set(3.97, 2.3, -0.3); add(exitSign);

  // ───────── the wall socket, with its switch ─────────
  const plate = box(0.13, 0.13, 0.02, M.white, 3.0, 0.35, -2.98, g, 0.006);
  box(0.02, 0.025, 0.012, M.black, 2.965, 0.33, -2.965); box(0.02, 0.025, 0.012, M.black, 3.035, 0.33, -2.965);
  const rocker = box(0.035, 0.02, 0.018, M.dark, 3.0, 0.395, -2.96, g, 0.004);
  const socketLed = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.redLed); socketLed.position.set(3.045, 0.395, -2.96); add(socketLed);
  h.socket = { plate, rocker, led: socketLed, on: false, pos: SOCKET_POS };

  // ───────── the circuit breaker box ─────────
  box(0.34, 0.42, 0.1, M.steel, 2.0, 1.4, -2.94, g, 0.01);
  const lever = new THREE.Group(); lever.position.set(2.0, 1.4, -2.87); add(lever);
  box(0.05, 0.14, 0.04, M.red, 0, 0.05, 0, lever, 0.01); box(0.14, 0.04, 0.02, M.black, 0, 0, -0.01, lever);
  lever.rotation.z = 0; h.breaker = { lever, pos: V(2.0, 1.4, -2.85) };

  // ───────── desk, chair, plant ─────────
  box(1.6, 0.04, 0.7, M.wood, -0.3, 0.74, -2.6, g, 0.01);
  for (const [x, z] of [[-1.05, -2.3], [0.45, -2.3], [-1.05, -2.9], [0.45, -2.9]]) box(0.05, 0.72, 0.05, M.woodDark, x, 0.36, z);
  box(0.45, 0.5, 0.55, M.woodDark, 0.2, 0.46, -2.6, g, 0.01);
  box(0.46, 0.05, 0.46, M.dark, -0.3, 0.46, -1.9, g, 0.03); box(0.46, 0.5, 0.05, M.dark, -0.3, 0.74, -1.67, g, 0.03); cyl(0.03, 0.03, 0.42, M.metal, -0.3, 0.22, -1.9);
  cyl(0.16, 0.12, 0.28, M.pot, 1.15, 0.14, -2.6);
  for (const [x, y, z, s] of [[0, 0.5, 0, 0.2], [0.1, 0.72, 0.03, 0.17], [-0.1, 0.65, -0.05, 0.15]]) { const l = shade(new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), M.plant)); l.position.set(1.15 + x, y, -2.6 + z); add(l); }

  // ───────── the store cupboard ─────────
  const store = new THREE.Group(); store.position.set(-3.3, 0, -2.69); add(store);
  box(0.04, 2.2, 0.6, M.white, -0.6, 1.1, 0, store); box(0.04, 2.2, 0.6, M.white, 0.6, 1.1, 0, store);
  box(1.24, 0.04, 0.6, M.white, 0, 2.2, 0, store); box(1.2, 0.1, 0.58, M.white, 0, 0.05, 0, store); box(1.2, 2.2, 0.03, M.white, 0, 1.1, -0.29, store);
  box(1.18, 0.03, 0.56, M.white, 0, 1.45, 0, store);
  const bay = canvasTex(256, 192, (c, w, hh) => { c.fillStyle = '#e8ecef'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#2e7bd6'; c.lineWidth = 8; rr(c, 14, 14, w - 28, hh - 28, 10); c.stroke(); });
  const bayMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), bay ? new THREE.MeshStandardMaterial({ map: bay, roughness: 0.7 }) : M.blue); bayMesh.rotation.x = -Math.PI / 2; bayMesh.position.set(-0.05, 0.102, 0.0); store.add(bayMesh);
  for (let i = 0; i < 5; i++) { const col = [M.blue, M.red, M.green2, M.yellow, M.white][i]; cyl(0.04, 0.04, 0.2, col, -0.45 + i * 0.1, 1.57, -0.1, store, 16); }
  box(0.3, 0.07, 0.24, M.blue, 0.35, 1.5, 0.05, store, 0.01);
  const doorL = new THREE.Group(); doorL.position.set(-0.6, 0, 0.3); store.add(doorL);
  box(0.6, 2.14, 0.03, M.white, 0.3, 1.1, 0, doorL, 0.01); box(0.03, 0.18, 0.04, M.metal, 0.52, 1.1, 0.03, doorL);
  const doorR = new THREE.Group(); doorR.position.set(0.6, 0, 0.3); store.add(doorR);
  box(0.6, 2.14, 0.03, M.white, -0.3, 1.1, 0, doorR, 0.01); box(0.03, 0.18, 0.04, M.metal, -0.52, 1.1, 0.03, doorR);
  doorL.rotation.y = 0; doorR.rotation.y = 0;
  h.store = { group: store, doorL, doorR, bay: V(-3.35, 0.1, -2.69), open: 0 };

  // ───────── the basin ─────────
  const basin = new THREE.Group(); basin.position.set(-1.7, 0, -2.84); add(basin);
  box(0.6, 0.16, 0.42, M.white, 0, 0.88, 0, basin, 0.06);
  box(0.62, 0.7, 0.06, M.white, 0, 1.0, -0.17, basin, 0.01);
  cyl(0.02, 0.02, 0.16, M.chrome, 0, 1.03, -0.12, basin, 14);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 10), M.chrome); spout.rotation.x = Math.PI / 2; spout.position.set(0, 1.1, -0.06); basin.add(spout);
  box(0.1, 0.18, 0.06, M.white, 0.42, 1.2, -0.15, basin, 0.015);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0x8cd0ff, transparent: true, opacity: 0.6 })); water.position.set(0, 0.98, 0.0); water.visible = false; basin.add(water);
  h.basin = { group: basin, water, hands: V(-1.7, 1.0, -2.62) };

  // ───────── tables for the protective equipment and the cleaning kit ─────────
  const table = (z) => {
    const t = new THREE.Group(); t.position.set(-3.45, 0, z); add(t);
    box(0.62, 0.04, 1.05, M.wood, 0, 0.75, 0, t, 0.01);
    for (const [x, zz] of [[-0.27, -0.46], [0.27, -0.46], [-0.27, 0.46], [0.27, 0.46]]) box(0.04, 0.73, 0.04, M.metal, x, 0.365, zz, t);
    return t;
  };
  h.tablePPE = table(0.25); h.tableKit = table(1.75);

  // ───────── lamps, light switch, air conditioning ─────────
  h.lamps = [];
  for (const x of [-1.1, 1.9]) {
    const lamp = box(0.34, 0.07, 0.07, M.lamp, x, 2.0, -2.93, g, 0.02);
    const pl = new THREE.PointLight(0xffe6c0, 3.2, 9, 2); pl.position.set(x, 2.4, -1.2); add(pl);
    h.lamps.push({ lamp, light: pl, base: pl.intensity });
  }
  const sw = box(0.08, 0.12, 0.02, M.white, 3.98, 1.25, 0.75, g, 0.006); sw.rotation.y = Math.PI / 2;
  const swRocker = box(0.02, 0.05, 0.02, M.dark, 3.965, 1.25, 0.75, g, 0.004);
  h.lightSwitch = { rocker: swRocker, pos: V(3.95, 1.25, 0.75) };
  box(1.05, 0.28, 0.24, M.white, 0.9, 2.35, -2.86, g, 0.03);
  for (let i = 0; i < 4; i++) box(0.95, 0.008, 0.2, M.skirting, 0.9, 2.27 - i * 0.012, -2.78);
  const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), M.green); acLed.position.set(1.35, 2.38, -2.73); add(acLed);
  h.acLed = acLed;
  return h;
}
