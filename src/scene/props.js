// The small things the worker uses and finds: warning sign, clipboard and papers, phone, cloths,
// dustpan and brush, scraper, refuse bag, protective equipment on its table, and the litter, droppings
// and damage the worker comes across.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rr, rng } from './tex.js';
import { PLACES } from './room.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildProps(M, room) {
  const p = { group: new THREE.Group() };
  const root = p.group;
  const mk = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const rb = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, r);
  const grp = (parent = root) => { const g = new THREE.Group(); parent.add(g); return g; };

  // ───── warning sign (A-frame with a picture, no words) ─────
  const sign = p.sign = grp();
  const pic = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#ffd21f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 20); g.lineTo(118, 112); g.lineTo(10, 112); g.closePath(); g.fill();
    g.lineWidth = 9; g.strokeStyle = '#1b1b1b'; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(70, 54, 7, 0, 7); g.fill();
    g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(66, 62); g.lineTo(56, 84); g.lineTo(38, 92); g.moveTo(66, 62); g.lineTo(80, 84); g.lineTo(88, 96); g.moveTo(66, 64); g.lineTo(50, 66); g.stroke();
    g.fillStyle = '#1b1b1b'; g.fillRect(14, 168, 100, 8); g.fillRect(14, 188, 100, 8);
  });
  const signMat = pic ? new THREE.MeshStandardMaterial({ map: pic, roughness: 0.5 }) : M.signYellow;
  for (const s of [-1, 1]) {                       // two panels hinged at the top
    const hold = grp(sign); hold.position.set(0, 0.62, 0); hold.rotation.x = s * 0.2;
    mk(rb(0.32, 0.62, 0.012, 0.01), s < 0 ? signMat : M.signYellow, hold, 0, -0.31, 0);
  }
  p.signFold = 0; // 0 = standing open, 1 = folded flat

  // ───── clipboard and the three papers ─────
  const clip = p.clipboard = grp();
  mk(rb(0.2, 0.28, 0.012, 0.006), M.dark, clip, 0, 0, 0);
  mk(rb(0.17, 0.24, 0.004, 0.002), M.paper, clip, 0, -0.005, 0.009);
  mk(rb(0.06, 0.02, 0.014, 0.004), M.metal, clip, 0, 0.13, 0.006);
  clip.visible = false;
  p.docs = [M.red, M.blue, M.green2].map((mat, i) => {
    const d = grp(); mk(rb(0.15, 0.2, 0.004, 0.003), M.paper, d); mk(new THREE.BoxGeometry(0.15, 0.04, 0.005), mat, d, 0, 0.08, 0.001);
    for (let k = 0; k < 4; k++) mk(new THREE.BoxGeometry(0.11 - k * 0.012, 0.008, 0.005), M.dark, d, 0, 0.03 - k * 0.025, 0.001);
    d.visible = false; return d;
  });

  // ───── phone, for reporting ─────
  const phone = p.phone = grp();
  mk(rb(0.07, 0.145, 0.009, 0.01), M.black, phone);
  mk(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0x6fd0ff }), phone, 0, 0, 0.0051);
  phone.visible = false;

  // ───── the cleaning kit on the table ─────
  const tableTop = 0.77, kitX = -3.45, kitZ = 1.75;
  const kit = p.kit = grp(); kit.position.set(kitX, tableTop, kitZ);
  p.cloths = [M.blue, M.red, M.green2, M.yellow].map((mat, i) => {
    const c = grp(kit); c.position.set(-0.12 + (i % 2) * 0.17, 0, -0.32 + Math.floor(i / 2) * 0.2);
    for (let k = 0; k < 3; k++) mk(rb(0.15, 0.022, 0.12, 0.008), mat, c, 0, 0.011 + k * 0.021, 0).rotation.y = (k - 1) * 0.06;
    return c;
  });
  p.cloth = grp(); mk(rb(0.16, 0.012, 0.13, 0.006), M.blue, p.cloth); p.cloth.visible = false; // the one used for wiping
  // dustpan with brush
  const pan = p.dustpan = grp(kit); pan.position.set(0.0, 0.0, 0.18);
  mk(rb(0.2, 0.022, 0.24, 0.008), M.dark, pan, 0, 0.011, 0);
  const panLip = mk(new THREE.BoxGeometry(0.2, 0.03, 0.01), M.dark, pan, 0, 0.02, 0.12);
  mk(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 10), M.dark, pan, 0, 0.03, -0.17).rotation.x = Math.PI / 2 - 0.4;
  const brush = p.brush = grp(kit); brush.position.set(0.18, 0.0, 0.2);
  mk(rb(0.05, 0.03, 0.18, 0.008), M.red, brush, 0, 0.03, 0);
  mk(new THREE.BoxGeometry(0.05, 0.03, 0.06), M.brushHair, brush, 0, 0.012, 0.1);
  mk(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 8), M.red, brush, 0, 0.04, -0.12).rotation.x = Math.PI / 2 - 0.3;
  const scraper = p.scraper = grp(kit); scraper.position.set(0.2, 0.0, -0.1);
  mk(rb(0.03, 0.02, 0.13, 0.006), M.black, scraper, 0, 0.012, -0.05); mk(new THREE.BoxGeometry(0.07, 0.003, 0.05), M.metal, scraper, 0, 0.012, 0.04);
  // the refuse bag on the table until it is needed
  const refuse = p.refuse = grp(); mk(new THREE.SphereGeometry(0.15, 16, 12), M.bag, refuse, 0, 0.12, 0).scale.set(1, 0.9, 0.8);
  mk(new THREE.ConeGeometry(0.04, 0.12, 8), M.bag, refuse, 0, 0.27, 0); refuse.position.set(kitX + 0.0, tableTop + 0.0, kitZ + 0.36);
  refuse.visible = true; p.refuse.rest = refuse.position.clone();

  // ───── protective equipment waiting on its table ─────
  const ppe = p.ppeTable = grp(); ppe.position.set(-3.45, 0.77, 0.25);
  const vestFold = p.ppeVest = grp(ppe); vestFold.position.set(0, 0.0, -0.22);
  mk(rb(0.34, 0.05, 0.26, 0.02), M.vest, vestFold, 0, 0.025, 0); mk(new THREE.BoxGeometry(0.345, 0.012, 0.05), M.reflect, vestFold, 0, 0.052, 0.04);
  const glovePair = p.ppeGloves = grp(ppe); glovePair.position.set(0, 0.0, 0.08);
  for (const s of [-1, 1]) { const gl = mk(new THREE.SphereGeometry(0.055, 12, 10), M.glove, glovePair, s * 0.07, 0.03, 0); gl.scale.set(0.9, 0.5, 1.3); mk(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), M.glove, glovePair, s * 0.07, 0.03, -0.08).rotation.x = Math.PI / 2; }
  const specs = p.ppeGlasses = grp(ppe); specs.position.set(0, 0.0, 0.3);
  for (const s of [-1, 1]) { const rim = mk(new THREE.TorusGeometry(0.027, 0.004, 8, 20), M.black, specs, s * 0.04, 0.03, 0); rim.rotation.x = Math.PI / 2; mk(new THREE.CircleGeometry(0.026, 18), M.glass, specs, s * 0.04, 0.03, 0).rotation.x = -Math.PI / 2; }

  // ───── litter on the floor (picked up in step 8) ─────
  p.debris = [];
  const litter = (name, build, x, z, ry = 0) => { const g = grp(); build(g); g.position.set(x, 0.012, z); g.rotation.y = ry; g.userData.kind = name; p.debris.push(g); return g; };
  litter('cup', (g) => { mk(new THREE.CylinderGeometry(0.04, 0.03, 0.09, 16, 1, true), M.white, g, 0, 0, 0); mk(new THREE.CircleGeometry(0.03, 16), M.white, g, 0, -0.045, 0).rotation.x = -Math.PI / 2; }, -0.55, 0.35);
  p.debris[0].rotation.set(0, 0, Math.PI / 2); p.debris[0].position.y = 0.04; // the cup lies on its side
  litter('paper', (g) => mk(new THREE.IcosahedronGeometry(0.05, 0), M.paper, g, 0, 0.04, 0), -0.1, -0.7);
  litter('gum', (g) => { mk(new THREE.CylinderGeometry(0.035, 0.04, 0.008, 14), new THREE.MeshStandardMaterial({ color: 0xe46f9a, roughness: 0.4 }), g, 0, 0.004, 0); }, -1.0, 1.05);
  litter('wrapper', (g) => mk(rb(0.1, 0.01, 0.06, 0.003), M.yellow, g, 0, 0.007, 0), 0.2, 0.9, 0.5);
  litter('bits', (g) => { const r = rng(5); for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(0.012, 0.006, 0.012), M.paper, g, (r() - 0.5) * 0.14, 0.004, (r() - 0.5) * 0.14); }, -1.9, -0.2);
  p.stuck = p.debris.find((d) => d.userData.kind === 'gum'); // stuck to the floor: needs the scraper

  // ───── a few things the worker comes across ─────
  const pests = p.pests = grp(); pests.position.set(-3.1, 0.0, -2.1);
  const pr = rng(9); for (let i = 0; i < 9; i++) mk(new THREE.SphereGeometry(0.006, 6, 5), M.black, pests, (pr() - 0.5) * 0.3, 0.008, (pr() - 0.5) * 0.12).scale.set(1, 0.6, 1.8);
  const crack = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(25,25,25,.9)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 40); g.lineTo(90, 110); g.lineTo(80, 150); g.lineTo(150, 200); g.lineTo(226, 214); g.moveTo(90, 110); g.lineTo(170, 96); g.moveTo(80, 150); g.lineTo(30, 190); g.stroke(); });
  const crackMesh = p.crack = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), crack ? new THREE.MeshBasicMaterial({ map: crack, transparent: true, depthWrite: false }) : M.black); crackMesh.rotation.x = -Math.PI / 2; crackMesh.position.set(-0.5, 0.004, -1.4); root.add(crackMesh);
  const torn = p.torn = grp(); torn.position.set(0.52, 0.02, 1.8);
  const flap = mk(new THREE.BoxGeometry(0.22, 0.012, 0.16), M.carpet, torn, 0.11, 0.02, 0); flap.rotation.set(0.0, 0.2, 0.22);

  return p;
}

/** Where the damage and the pest signs are, so a camera can look at them. */
export const FINDS = { pests: V(-3.1, 0.05, -2.1), crack: V(-0.5, 0.02, -1.4), torn: V(0.55, 0.05, 1.8) };
export { PLACES };
