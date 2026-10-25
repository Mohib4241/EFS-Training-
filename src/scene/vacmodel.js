// The vacuum cleaner for the "vacuum cleaner" page: every part of the machine as its own piece, outside
// and inside, so it can be pulled apart, looked into, and followed by the air.
//
// The machine is a canister model: an outer body with a lid on a hinge, a dust bag in a chamber, a
// foam filter in front of the motor, the suction motor with its fan, an exhaust filter at the back,
// wheels, a power cable with a plug, a hose, a wand (tube), a floor head with a brush strip that can be
// switched in and out, and two small tools on a clip. It is the same machine the lessons use, with its
// insides added.
//
// Every part is authored in assembled position (1 unit = 1 metre, the canister's origin on the floor
// under its middle, +Z is the front). Pulling the machine apart moves each part by its own offset times
// the "explode" amount, so the parts keep their place in line.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rr } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// id, how far the part moves when the machine is fully pulled apart, and the points the air passes
// (in assembled position) for the parts the air goes through, in the order it goes.
export const PARTS = [
  { id: 'switch', off: [0, 1.0, 0.05], group: 'out' },
  { id: 'lid', off: [0, 0.78, 0], group: 'out' },
  { id: 'body', off: [0, 0, 0], group: 'out' },
  { id: 'pat', off: [-0.62, 0.12, 0.34], group: 'out' },
  { id: 'wheels', off: [0, 0, 0], group: 'out' },
  { id: 'bag', off: [0, 0.62, 0], group: 'in' },
  { id: 'prefilter', off: [0, 0.54, 0], group: 'in' },
  { id: 'motor', off: [0, 0.46, 0], group: 'in' },
  { id: 'exhaust', off: [0, 0.22, -0.62], group: 'in' },
  { id: 'cable', off: [0, 0, -0.85], group: 'out' },
  { id: 'hose', off: [0, 0.16, 0.3], group: 'tool' },
  { id: 'wand', off: [0, 0.3, 0.55], group: 'tool' },
  { id: 'head', off: [0, 0.04, 0.95], group: 'tool' },
  { id: 'bristles', off: [0, 0.0, 1.32], group: 'tool' },
  { id: 'tools', off: [0.78, 0.1, 0], group: 'tool' },
];

export class VacuumModel {
  constructor(M) {
    this.M = M;
    this.root = new THREE.Group();
    this.parts = {};
    this.e = 0; this.on = false; this.fan = 0; this.fill = 0.55;
    this.cutPlane = new THREE.Plane(V(1, 0, 0), 0); this.cut = 0;
    this.focus = null;
    this._build();
    this.setExplode(0);
  }

  // ───────────── making parts ─────────────
  _part(id) {
    const def = PARTS.find((p) => p.id === id);
    const g = new THREE.Group(); g.name = id; this.root.add(g);
    const p = { id, def, group: g, home: V(0, 0, 0), off: V(...def.off), meshes: [], mats: [], flow: [] };
    this.parts[id] = p; return p;
  }
  /** A copy of a material that belongs to one part, so the part can fade on its own. */
  _own(p, m) { const c = m.clone(); c.userData = { baseOpacity: c.opacity, baseTransparent: c.transparent }; p.mats.push(c); return c; }
  _mesh(p, geo, mat, x = 0, y = 0, z = 0, { cut = false, parent = null } = {}) {
    const m = new THREE.Mesh(geo, this._own(p, mat)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    m.userData.part = p.id; if (cut) { m.material.side = THREE.DoubleSide; m.userData.cut = true; }
    (parent || p.group).add(m); p.meshes.push(m); return m;
  }

  _build() {
    const M = this.M;
    const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);

    // ── body: the base, the red shell with its inside, the inlet, the rear grille, the cable exit, the tool clip ──
    let p = this._part('body');
    this._mesh(p, new THREE.CylinderGeometry(0.205, 0.215, 0.09, 56), M.vacGrey, 0, 0.135, 0, { cut: true });
    this._mesh(p, new THREE.CylinderGeometry(0.19, 0.2, 0.3, 56, 1, true), M.vacRed, 0, 0.33, 0, { cut: true });
    const liner = this._mesh(p, new THREE.CylinderGeometry(0.182, 0.192, 0.3, 56, 1, true), M.dark, 0, 0.33, 0, { cut: true }); liner.material.side = THREE.BackSide;
    this._mesh(p, new THREE.CylinderGeometry(0.19, 0.19, 0.012, 56), M.dark, 0, 0.184, 0, { cut: true });                  // the floor of the chamber
    this._mesh(p, new THREE.TorusGeometry(0.192, 0.012, 10, 56), M.vacGrey, 0, 0.18, 0, { cut: true }).rotation.x = Math.PI / 2;
    this._mesh(p, new THREE.TorusGeometry(0.2, 0.01, 10, 56), M.vacGrey, 0, 0.48, 0, { cut: true }).rotation.x = Math.PI / 2;
    const inlet = this._mesh(p, new THREE.CylinderGeometry(0.045, 0.05, 0.08, 24), M.vacGrey, 0, 0.3, 0.215); inlet.rotation.x = Math.PI / 2;
    this._mesh(p, new THREE.TorusGeometry(0.046, 0.008, 8, 24), M.chrome, 0, 0.3, 0.255);
    const grille = this._mesh(p, rb(0.13, 0.07, 0.02, 0.006), M.dark, 0, 0.13, -0.212);
    for (let i = 0; i < 5; i++) this._mesh(p, new THREE.BoxGeometry(0.11, 0.004, 0.006), M.vacGrey, 0, 0.105 + i * 0.012, -0.224);
    this._mesh(p, new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), M.rubber, 0, 0.27, -0.2).rotation.x = Math.PI / 2;     // where the cable leaves
    this._mesh(p, new THREE.BoxGeometry(0.018, 0.14, 0.05), M.dark, 0.205, 0.33, 0.0);                                    // the clip for the small tools
    p.flow = [];
    this.bodyOutline = p;

    // ── lid on a hinge, with the carry handle ──
    p = this._part('lid');
    this._mesh(p, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 56), M.vacLid, 0, 0.5, 0, { cut: true });
    this._mesh(p, new THREE.CylinderGeometry(0.17, 0.2, 0.03, 56), M.vacRed, 0, 0.535, 0, { cut: true });
    const handle = this._mesh(p, new THREE.TorusGeometry(0.07, 0.014, 10, 28, Math.PI), M.vacGrey, 0, 0.55, -0.06); handle.rotation.set(0, Math.PI / 2, 0);
    for (const s of [-1, 1]) this._mesh(p, new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10), M.vacGrey, 0, 0.545, -0.06 + s * 0.07);
    this._mesh(p, new THREE.CylinderGeometry(0.01, 0.01, 0.08, 12), M.chrome, 0, 0.51, -0.19).rotation.z = Math.PI / 2;     // the hinge pin
    this._mesh(p, new THREE.CylinderGeometry(0.186, 0.186, 0.012, 56), M.rubber, 0, 0.476, 0, { cut: true });              // the seal under the lid

    // ── on/off switch ──
    p = this._part('switch');
    this._mesh(p, new THREE.CylinderGeometry(0.038, 0.04, 0.012, 28), M.dark, 0, 0.553, 0.1);
    this.swBtn = this._mesh(p, new THREE.CylinderGeometry(0.026, 0.026, 0.02, 28), M.white, 0, 0.565, 0.1);
    this.swLed = this._mesh(p, new THREE.TorusGeometry(0.03, 0.004, 8, 28), new THREE.MeshBasicMaterial({ color: 0x35e07a }), 0, 0.565, 0.1); this.swLed.rotation.x = Math.PI / 2;
    this.swLed.material.color.setRGB(0.12, 0.14, 0.14);

    // ── PAT label ──
    p = this._part('pat');
    const labTex = canvasTex(256, 176, (g, w, h) => {
      g.fillStyle = '#fbfbf7'; rr(g, 0, 0, w, h, 14); g.fill();
      g.fillStyle = '#1aa05c'; g.fillRect(0, 0, w, 50); g.fillStyle = '#fff'; g.font = '700 34px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PAT', 14, 27);
      g.font = '600 26px system-ui, sans-serif'; g.fillText('DEMO', 142, 27);
      g.strokeStyle = '#1aa05c'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(40, 104); g.lineTo(70, 134); g.lineTo(122, 74); g.stroke();
      g.fillStyle = '#6b7780'; g.fillRect(150, 78, 90, 8); g.fillRect(150, 100, 70, 8); g.fillRect(150, 122, 80, 8); g.fillRect(24, 150, 210, 6);
    });
    const label = this._mesh(p, new THREE.PlaneGeometry(0.11, 0.076), labTex ? new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.4, side: THREE.DoubleSide }) : M.white, -0.123, 0.34, 0.152);
    label.rotation.y = -0.62; label.castShadow = false;

    // ── wheels: two big ones and a caster ──
    p = this._part('wheels'); this.wheels = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.215, 0.08, -0.09); p.group.add(w);
      const tyre = this._mesh(p, new THREE.CylinderGeometry(0.08, 0.08, 0.045, 32), M.rubber, 0, 0, 0, { parent: w }); tyre.rotation.z = Math.PI / 2;
      const hub = this._mesh(p, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 20), M.chrome, 0, 0, 0, { parent: w }); hub.rotation.z = Math.PI / 2;
      this._mesh(p, new THREE.BoxGeometry(0.05, 0.012, 0.012), M.dark, s * 0.03, 0, 0, { parent: w });
      this.wheels.push({ g: w, side: s });
    }
    this.caster = new THREE.Group(); this.caster.position.set(0, 0, 0.17); p.group.add(this.caster);
    this._mesh(p, new THREE.SphereGeometry(0.04, 18, 14), M.rubber, 0, 0.04, 0, { parent: this.caster });
    this._mesh(p, new THREE.CylinderGeometry(0.012, 0.012, 0.06, 10), M.metal, 0, 0.09, 0, { parent: this.caster });

    // ── dust bag, in its collar ──
    p = this._part('bag');
    const bagTex = this.bagTex = canvasTex(64, 128, (g, w, h) => this._drawBag(g, w, h));
    this.bagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bagTex, roughness: 1 });
    const pillow = new THREE.BoxGeometry(0.27, 0.34, 0.07, 10, 12, 3), pp = pillow.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / 0.135, y = pp.getY(i) / 0.17, z = pp.getZ(i); pp.setZ(i, z + Math.sign(z) * 0.018 * (1 - x * x) * (1 - y * y)); }
    pillow.computeVertexNormals();
    this._mesh(p, pillow, this.bagMat, 0, 0.36, 0.02);
    this._mesh(p, rb(0.3, 0.04, 0.12, 0.012), M.blue, 0, 0.545, 0.02);                                                     // the collar the bag hangs from
    const noz = this._mesh(p, new THREE.CylinderGeometry(0.04, 0.04, 0.14, 24, 1, true), M.blue, 0, 0.3, 0.16); noz.rotation.x = Math.PI / 2; noz.material.side = THREE.DoubleSide;
    p.flow = [[0, 0.3, 0.2], [0, 0.36, 0.04]];

    // ── foam filter in front of the motor ──
    p = this._part('prefilter');
    const foam = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d7d2c2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${86 + Math.random() * 50},${70 + Math.random() * 40},.55)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); } }, { repeat: [3, 3] });
    this._mesh(p, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 48), foam ? new THREE.MeshStandardMaterial({ map: foam, roughness: 1 }) : M.fabric, 0, 0.2, 0);
    this._mesh(p, new THREE.TorusGeometry(0.152, 0.007, 8, 48), M.white, 0, 0.2, 0).rotation.x = Math.PI / 2;
    p.flow = [[0, 0.2, 0]];

    // ── suction motor with its fan ──
    p = this._part('motor');
    this._mesh(p, new THREE.CylinderGeometry(0.085, 0.09, 0.12, 40), M.dark, 0, 0.12, 0);
    this._mesh(p, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 40), M.copper || M.metal, 0, 0.075, 0);
    this._mesh(p, new THREE.CylinderGeometry(0.092, 0.092, 0.014, 40), M.vacGrey, 0, 0.18, 0);
    this.fanG = new THREE.Group(); this.fanG.position.set(0, 0.2, 0); p.group.add(this.fanG);
    this._mesh(p, new THREE.CylinderGeometry(0.026, 0.026, 0.02, 20), M.chrome, 0, 0, 0, { parent: this.fanG });
    for (let i = 0; i < 9; i++) {                                                                                          // the fan blades
      const b = this._mesh(p, new THREE.BoxGeometry(0.07, 0.004, 0.022), M.metal, 0, 0, 0, { parent: this.fanG });
      const a = (i / 9) * Math.PI * 2; b.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05); b.rotation.y = -a; b.rotation.x = 0.4;
    }
    this._mesh(p, new THREE.CylinderGeometry(0.085, 0.085, 0.004, 40), M.vacGrey, 0, 0.19, 0);
    p.flow = [[0, 0.2, 0], [0, 0.12, -0.04]];

    // ── exhaust filter at the back ──
    p = this._part('exhaust');
    const pleat = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(120,125,130,.55)'; g.fillRect(x, 0, 2, h); } });
    this._mesh(p, rb(0.14, 0.1, 0.05, 0.006), pleat ? new THREE.MeshStandardMaterial({ map: pleat, roughness: 0.9 }) : M.white, 0, 0.11, -0.15);
    this._mesh(p, rb(0.15, 0.11, 0.012, 0.004), M.white, 0, 0.11, -0.178);
    this._mesh(p, rb(0.15, 0.11, 0.012, 0.004), M.white, 0, 0.11, -0.122);
    p.flow = [[0, 0.11, -0.12], [0, 0.11, -0.2]];

    // ── power cable and plug ──
    p = this._part('cable');
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 });
    const pts = [V(0, 0.27, -0.24)]; for (let i = 0; i <= 18; i++) { const t = i / 18 * Math.PI * 2 * 1.5; pts.push(V(Math.cos(t) * (0.2 - i * 0.004), 0.02 + i * 0.004, -0.5 + Math.sin(t) * (0.14 - i * 0.003))); }
    this._mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.009, 8), cableMat);
    const end = pts[pts.length - 1];
    const plug = new THREE.Group(); plug.position.copy(end); plug.rotation.y = 2.2; p.group.add(plug);
    this._mesh(p, new THREE.BoxGeometry(0.05, 0.035, 0.05), M.black, 0, 0, -0.02, { parent: plug });
    this._mesh(p, new THREE.BoxGeometry(0.008, 0.008, 0.02), M.metal, -0.012, 0, 0.018, { parent: plug });
    this._mesh(p, new THREE.BoxGeometry(0.008, 0.008, 0.02), M.metal, 0.012, 0, 0.018, { parent: plug });

    // ── the hose, from the inlet up to the handle ──
    p = this._part('hose');
    const hoseBump = canvasTex(64, 16, (g, w, h) => { for (let x = 0; x < w; x += 8) { g.fillStyle = '#fff'; g.fillRect(x, 0, 4, h); g.fillStyle = '#222'; g.fillRect(x + 4, 0, 4, h); } }, { repeat: [40, 1], srgb: false });
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x353b42, roughness: 0.55, bumpMap: hoseBump, bumpScale: 2.0 });
    const hc = new THREE.CatmullRomCurve3([V(0, 0.3, 0.29), V(0, 0.3, 0.42), V(0.1, 0.34, 0.5), V(0.06, 0.55, 0.52), V(0, 0.78, 0.44)]);
    this._mesh(p, new THREE.TubeGeometry(hc, 70, 0.024, 12), hoseMat);
    this._mesh(p, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20), M.vacGrey, 0, 0.3, 0.29).rotation.x = Math.PI / 2;
    this._mesh(p, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20), M.vacGrey, 0, 0.78, 0.44);
    p.flow = [[0.1, 0.34, 0.5], [0.06, 0.55, 0.52]];

    // ── wand: chrome tube, slide collar, handle ──
    p = this._part('wand');
    const wand = new THREE.Group(); p.group.add(wand);
    const a = V(0, 0.78, 0.44), b = V(0, 0.05, 0.78), dir = b.clone().sub(a), len = dir.length();
    wand.position.copy(a.clone().add(b).multiplyScalar(0.5)); wand.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    this._mesh(p, new THREE.CylinderGeometry(0.016, 0.016, len - 0.12, 16), M.chrome, 0, 0, 0, { parent: wand });
    this._mesh(p, new THREE.CylinderGeometry(0.02, 0.02, 0.07, 16), M.vacGrey, 0, len * 0.18, 0, { parent: wand });         // the slide collar that sets the length
    this._mesh(p, new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16), M.vacGrey, 0, len / 2 - 0.06, 0, { parent: wand });
    this._mesh(p, new THREE.CylinderGeometry(0.02, 0.016, 0.08, 16), M.vacGrey, 0, -len / 2 + 0.04, 0, { parent: wand });
    p.flow = [[0, 0.5, 0.58], [0, 0.2, 0.7]];

    // ── floor head ──
    p = this._part('head');
    this._mesh(p, rb(0.34, 0.045, 0.13, 0.012), M.vacGrey, 0, 0.035, 0.78 + 0.0);
    this._mesh(p, new THREE.BoxGeometry(0.3, 0.012, 0.02), M.chrome, 0, 0.012, 0.855);
    this._mesh(p, new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16), M.chrome, 0, 0.07, 0.76);
    this._mesh(p, new THREE.BoxGeometry(0.05, 0.012, 0.03), M.red, 0.1, 0.062, 0.75);                                      // the foot pedal
    this._mesh(p, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), M.dark, 0, 0.03, 0.72).rotation.z = Math.PI / 2;       // the swivel
    p.flow = [[0, 0.03, 0.84], [0, 0.04, 0.78]];

    // ── the brush strip that slides in and out of the floor head ──
    p = this._part('bristles');
    this._mesh(p, new THREE.BoxGeometry(0.29, 0.02, 0.014), M.brushHair, 0, 0.014, 0.863);
    for (let i = 0; i < 28; i++) this._mesh(p, new THREE.CylinderGeometry(0.0025, 0.0025, 0.022, 5), M.brushHair, -0.138 + i * 0.0102, 0.005, 0.868);
    p.flow = [];

    // ── the two small tools on the clip ──
    p = this._part('tools');
    const crev = new THREE.Group(); crev.position.set(0.226, 0.34, 0.0); crev.rotation.set(Math.PI / 2, 0, 0); crev.scale.setScalar(0.8); p.group.add(crev);
    this._mesh(p, new THREE.CylinderGeometry(0.02, 0.022, 0.16, 14), M.vacGrey, 0, 0.03, -0.1, { parent: crev }).rotation.x = Math.PI / 2;
    this._mesh(p, new THREE.BoxGeometry(0.03, 0.012, 0.17), M.vacGrey, 0, 0.018, 0.06, { parent: crev });
    const br = new THREE.Group(); br.position.set(0.226, 0.25, 0.0); br.rotation.set(Math.PI / 2, 0, 0); br.scale.setScalar(0.8); p.group.add(br);
    this._mesh(p, new THREE.CylinderGeometry(0.03, 0.034, 0.1, 20), M.vacGrey, 0, 0.05, -0.05, { parent: br }).rotation.x = Math.PI / 2;
    this._mesh(p, new THREE.CylinderGeometry(0.052, 0.048, 0.035, 22), M.brushHair, 0, 0.03, 0.04, { parent: br }).rotation.x = Math.PI / 2;

    // sizes and centres, in assembled position
    for (const q of Object.values(this.parts)) {
      const box = new THREE.Box3(); q.group.updateMatrixWorld(true); for (const m of q.meshes) box.expandByObject(m);
      q.box = box; q.center = box.getCenter(V(0, 0, 0)); q.size = box.getSize(V(0, 0, 0)).length();
    }
  }

  _drawBag(g, w, h) {
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, w, h);
    const f = this.fill, top = h * (1 - f);
    const gr = g.createLinearGradient(0, top - 6, 0, top + 10);
    gr.addColorStop(0, 'rgba(120,98,70,0)'); gr.addColorStop(1, 'rgba(120,98,70,1)');
    g.fillStyle = gr; g.fillRect(0, Math.max(0, top - 6), w, h);
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let y = 8; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }
  setFill(f) { this.fill = f; if (this.bagTex) { this._drawBag(this.bagTex.image.getContext('2d'), 64, 128); this.bagTex.needsUpdate = true; } }

  // ───────────── the machine ─────────────
  /** Pull the machine apart (1) or put it together (0). */
  setExplode(e) {
    this.e = e;
    for (const p of Object.values(this.parts)) {
      const k = e;
      p.group.position.set(p.off.x * k, p.off.y * k, p.off.z * k);
    }
    // the wheels go sideways rather than all one way
    const wp = this.parts.wheels; wp.group.position.set(0, 0, 0);
    for (const w of this.wheels) w.g.position.x = w.side * (0.215 + 0.34 * e);
    this.caster.position.z = 0.17 + 0.28 * e;
    // the brush strip also slides out of the head a little as it comes apart
  }

  /** The world position of a point in a part (given in assembled position). */
  at(id, x, y, z, out = V(0, 0, 0)) { const p = this.parts[id]; return this.root.localToWorld(out.set(x, y, z).add(p.group.position)); }
  /** The middle of a part, as it is now. */
  centre(id, out = V(0, 0, 0)) { const p = this.parts[id]; return this.root.localToWorld(out.copy(p.center).add(p.group.position)); }

  /** Where the air goes: floor head, wand, hose, inlet, bag, filter, motor, exhaust filter, out. */
  airPath() {
    const f = (id, i) => { const p = this.parts[id], q = p.flow[i]; return this.at(id, q[0], q[1], q[2]); };
    const pts = [
      f('head', 0), f('head', 1), f('wand', 1), f('wand', 0), f('hose', 1), f('hose', 0), this.at('body', 0, 0.3, 0.27),
      f('bag', 0), f('bag', 1), f('prefilter', 0), f('motor', 0), f('motor', 1), f('exhaust', 0), f('exhaust', 1),
      this.at('exhaust', 0, 0.12, -0.34).add(V(0, 0.02, -0.12)),
    ];
    return { pts, bag: 8 / (pts.length - 1), filter: 9 / (pts.length - 1) };
  }

  /** Dim every part but one (or none). */
  setFocus(id) {
    this.focus = id;
    for (const p of Object.values(this.parts)) {
      const dim = id && p.id !== id;
      for (const m of p.mats) {
        const base = m.userData;
        m.transparent = dim ? true : base.baseTransparent;
        m.opacity = dim ? 0.6 : base.baseOpacity;
        m.depthWrite = !dim;
        m.needsUpdate = true;
      }
    }
  }

  /** A section through the machine (the left half is cut away), to look at the inside. */
  setCutaway(on) {
    this.cut = on ? 1 : 0;
    for (const p of Object.values(this.parts)) for (const m of p.meshes) if (m.userData.cut) { m.material.clippingPlanes = on ? [this.cutPlane] : []; m.material.clipShadows = true; m.material.needsUpdate = true; }
  }

  setOn(on) { this.on = on; }
  update(dt, t) {
    this.fan += dt * (this.on ? 28 : 0);
    this.fanG.rotation.y = this.fan;
    const l = this.on ? 1 : 0;
    this.swLed.material.color.setRGB(0.12 + 0.1 * l, 0.14 + 0.78 * l, 0.14 + 0.36 * l);
    this.swBtn.position.y = 0.565 - 0.004 * l;
  }
  clearGlow() { for (const p of Object.values(this.parts)) for (const m of p.mats) if (m.emissive) m.emissive.setRGB(0, 0, 0); }

  pickables() { const out = []; for (const p of Object.values(this.parts)) out.push(...p.meshes); return out; }
}
