// The small things the Instructions page uses in the big room: a wet patch on the floor, a warning sign,
// a towel for drying hands, a cleaning cloth, a damaged cable shown as an example, a spare dust bag, the
// refuse bag and a phone for reporting a fault.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeSign } from './props.js';
import { canvasTex } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const SPOTS = {
  puddle: V(-3.0, 0.0, 1.5),        // the wet patch
  frayed: V(-1.2, 0.0, 2.9),        // the damaged cable shown as an example
  basket: V(1.9, 0.0, 2.4),         // where the spare bag and the cloths wait
  refuse: V(1.2, 0.0, 3.0),         // the rubbish bag
};

export function buildHallProps(M) {
  const p = { group: new THREE.Group(), debris: [], stuck: null };
  const root = p.group;
  const mk = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const rb = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, r);
  const grp = (parent = root) => { const g = new THREE.Group(); parent.add(g); return g; };

  p.sign = makeSign(M); root.add(p.sign); p.sign.visible = false;

  // a wet patch: a glossy, see-through puddle with a ring where it ripples
  const puddle = p.puddle = grp(); puddle.position.copy(SPOTS.puddle);
  const wet = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshPhysicalMaterial({ color: 0x8fc1e0, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }));
  wet.rotation.x = -Math.PI / 2; wet.position.y = 0.026; wet.scale.set(1.0, 0.7, 1); wet.renderOrder = 2; puddle.add(wet);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.215, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
  ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.03; ripple.scale.set(1, 0.7, 1); ripple.renderOrder = 3; puddle.add(ripple); p.ripple = ripple;
  puddle.visible = false;

  // a towel and a cleaning cloth
  p.towel = grp(); mk(rb(0.28, 0.025, 0.2, 0.01), M.white, p.towel); mk(new THREE.BoxGeometry(0.28, 0.027, 0.03), M.blue, p.towel, 0, 0, 0.06); p.towel.visible = false;
  p.cloth = grp(); mk(rb(0.18, 0.012, 0.14, 0.006), M.blue, p.cloth); p.cloth.visible = false;
  const kit = grp(); kit.position.set(SPOTS.basket.x, 0, SPOTS.basket.z); p.kit = kit;
  mk(rb(0.5, 0.04, 0.4, 0.015), M.dark, kit, 0, 0.02, 0);
  p.cloths = [M.blue, M.red, M.green2, M.yellow].map((mat, i) => { const c = grp(kit); c.position.set(-0.12 + (i % 2) * 0.17, 0.04, -0.08 + Math.floor(i / 2) * 0.16); for (let k = 0; k < 3; k++) mk(rb(0.14, 0.02, 0.11, 0.008), mat, c, 0, 0.01 + k * 0.02, 0).rotation.y = (k - 1) * 0.06; return c; });

  // a damaged cable, for the example of what not to use: a cut sheath with copper showing
  const frayed = p.frayed = grp(); frayed.position.copy(SPOTS.frayed);
  const cabl = new THREE.CatmullRomCurve3([V(-0.45, 0.012, 0.1), V(-0.2, 0.012, -0.05), V(0.0, 0.012, 0.06), V(0.14, 0.012, 0.0)]);
  mk(new THREE.TubeGeometry(cabl, 24, 0.008, 8), M.hoseMat ? new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 }) : M.black, frayed);
  const cu = new THREE.MeshStandardMaterial({ color: 0xd9822b, metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 6; i++) { const w = mk(new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 5), cu, frayed, 0.15 + 0.02 * Math.sin(i * 1.7), 0.014, 0.0 + (i - 2.5) * 0.007); w.rotation.set(0, (i - 2.5) * 0.18, Math.PI / 2 + (i - 2.5) * 0.12); }
  mk(new THREE.CylinderGeometry(0.0095, 0.0095, 0.03, 10), M.white, frayed, 0.115, 0.012, 0.0).rotation.z = Math.PI / 2;   // a worn patch
  frayed.visible = false;

  // a spare dust bag, a refuse bag, a phone
  const bagTex = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.08)'; for (let y = 8; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.fillStyle = '#2e7bd6'; g.fillRect(0, 0, w, 14); });
  const pillow = new THREE.BoxGeometry(0.27, 0.34, 0.07, 10, 12, 3), pp = pillow.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / 0.135, y = pp.getY(i) / 0.17, z = pp.getZ(i); pp.setZ(i, z + Math.sign(z) * 0.018 * (1 - x * x) * (1 - y * y)); }
  pillow.computeVertexNormals();
  const dirty = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#f1ede4'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.5); gr.addColorStop(0, 'rgba(120,98,70,0)'); gr.addColorStop(1, 'rgba(120,98,70,1)'); g.fillStyle = gr; g.fillRect(0, h * 0.2, w, h); g.fillStyle = '#2e7bd6'; g.fillRect(0, 0, w, 14); });
  p.bagOld = grp(); mk(pillow, dirty ? new THREE.MeshStandardMaterial({ map: dirty, roughness: 1 }) : M.bag, p.bagOld); p.bagOld.visible = false;
  p.paper = grp(); mk(new THREE.BoxGeometry(0.11, 0.002, 0.14), M.paper, p.paper); p.paper.visible = false;
  p.bagNew = grp(); mk(pillow, bagTex ? new THREE.MeshStandardMaterial({ map: bagTex, roughness: 1 }) : M.fabric, p.bagNew); p.bagNew.visible = false;
  p.refuse = grp(); mk(new THREE.SphereGeometry(0.15, 16, 12), M.bag, p.refuse, 0, 0.12, 0).scale.set(1, 0.9, 0.8); mk(new THREE.ConeGeometry(0.04, 0.12, 8), M.bag, p.refuse, 0, 0.27, 0); p.refuse.position.set(SPOTS.refuse.x, 0, SPOTS.refuse.z);
  p.phone = grp(); mk(rb(0.07, 0.145, 0.009, 0.01), M.black, p.phone); mk(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0x6fd0ff }), p.phone, 0, 0, 0.0051); p.phone.visible = false;

  // the room's finds do not exist here, but the world looks for them
  for (const k of ['pests', 'crack', 'torn']) { p[k] = grp(); p[k].visible = false; }
  p.clipboard = grp(); p.clipboard.visible = false; p.docs = [];
  return p;
}
