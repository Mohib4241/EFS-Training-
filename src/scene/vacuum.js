// The vacuum cleaner: a canister machine, built only from the parts a person needs to operate it
// (casing, wheels, on/off switch, cable and plug, PAT label, dust bag, hose, wand, floor head with a
// brush that can be switched on and off, and the accessories). No insides beyond the bag.
//
// Frame: the canister's origin is on the floor under its middle, +Z is the front (the hose inlet).
// The tool (wand + head) is its own group: its origin is on the floor at the head, +Z is the way
// the head pushes, and the wand rises from it back towards the person.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rr } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
export const WAND_LEN = 1.0;

export class Vacuum {
  constructor(M) {
    this.M = M;
    this.root = new THREE.Group();
    this.free = new THREE.Group();         // hose, cable and tool live in world space, so they are not children of root
    this.tool = new THREE.Group(); this.free.add(this.tool); // wand + head
    this.parts = {};
    this.anchor = {};
    this.yaw = 0;
    this._prev = new THREE.Vector3(); this._first = true;
    this.on = false; this.onLevel = 0;
    this.lid = 0; this.lidT = 0;
    this.bagLift = 0; this.bagLiftT = 0; this.bagLiftSide = 1;
    this.brushOut = 1; this.brushT = 1;
    this.pedal = 0;
    this.toolElev = 1.2; this.toolYaw = 0;  // elevation of the wand above the floor, rad
    this.tooling = 'floor';
    this.fill = 0.4;
    this.cableMode = 'coil';
    this.cableWorld = [];                   // cable points when laid or plugged, world space
    this.cableLift = null;                  // { s, h }: a bump held up in the laid cable
    this.hand = null;                       // world position of the plug when it is in a hand
    this.plugOrient = new THREE.Quaternion();
    this._build();
  }

  _mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  _part(id, parent) { const g = new THREE.Group(); g.name = id; parent.add(g); this.parts[id] = g; return g; }

  _build() {
    const M = this.M, r = this.root;

    // ── casing ──
    const casing = this._part('casing', r);
    this._mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.09, 40), M.vacGrey, casing, 0, 0.135, 0);
    this._mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.3, 40), M.vacRed, casing, 0, 0.33, 0);
    this._mesh(new THREE.TorusGeometry(0.192, 0.012, 10, 40), M.vacGrey, casing, 0, 0.18, 0).rotation.x = Math.PI / 2;
    const inlet = this._mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 20), M.vacGrey, casing, 0, 0.3, 0.215); inlet.rotation.x = Math.PI / 2;
    this._mesh(new THREE.TorusGeometry(0.046, 0.008, 8, 20), M.chrome, casing, 0, 0.3, 0.255);
    this._mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), M.rubber, casing, 0, 0.27, -0.2).rotation.x = Math.PI / 2;
    this.inletLocal = V(0, 0.3, 0.26); this.exitLocal = V(0, 0.27, -0.23);

    // lid on a hinge at the back, with the carry handle and the on/off switch
    const lidPivot = this.lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.485, -0.19); casing.add(lidPivot);
    const lid = new THREE.Group(); lid.position.set(0, 0, 0.19); lidPivot.add(lid);
    this._mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), M.vacLid, lid, 0, 0.0, 0);
    this._mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.03, 40), M.vacRed, lid, 0, 0.03, 0);
    const handle = this._mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 24, Math.PI), M.vacGrey, lid, 0, 0.045, -0.06); handle.rotation.set(0, Math.PI / 2, 0);
    for (const s of [-1, 1]) this._mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10), M.vacGrey, lid, 0, 0.05, -0.06 + s * 0.07);

    // ── on / off switch (on the lid, at the front) ──
    const sw = this._part('switch', lid); sw.position.set(0, 0.048, 0.1);
    this._mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.012, 24), M.dark, sw, 0, 0, 0);
    this.swBtn = this._mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 24), M.white, sw, 0, 0.012, 0);
    this.swLed = this._mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 24), new THREE.MeshBasicMaterial({ color: 0x35e07a }), sw, 0, 0.012, 0); this.swLed.rotation.x = Math.PI / 2;
    this.swLed.material.color.setRGB(0.12, 0.14, 0.14);

    // ── dust bag (inside; only seen with the lid open or lifted out) ──
    const bag = this.bag = this._part('bag', r); bag.position.set(0, 0.33, 0);
    const bagBody = new THREE.Group(); bag.add(bagBody); this.bagBody = bagBody;
    const bagTex = this.bagTex = canvasTex(64, 128, (g, w, h) => this._drawBag(g, w, h));
    this.bagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bagTex, roughness: 1 });
    const pillow = new THREE.BoxGeometry(0.27, 0.34, 0.07, 10, 12, 3);
    const p = pillow.attributes.position;
    for (let i = 0; i < p.count; i++) { // a soft, puffed bag
      const x = p.getX(i) / 0.135, y = p.getY(i) / 0.17, z = p.getZ(i);
      p.setZ(i, z + Math.sign(z) * 0.018 * (1 - x * x) * (1 - y * y) * 1.0);
    }
    pillow.computeVertexNormals();
    this._mesh(pillow, this.bagMat, bagBody, 0, 0.0, 0);
    this._mesh(new THREE.BoxGeometry(0.27, 0.035, 0.012), M.blue, bagBody, 0, 0.165, 0.037);
    bag.visible = false;

    // ── wheels ──
    const wheels = this._part('wheels', r); this.wheelMeshes = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.215, 0.08, -0.09); wheels.add(w);
      const tyre = this._mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.045, 28), M.rubber, w); tyre.rotation.z = Math.PI / 2;
      const hub = this._mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), M.chrome, w); hub.rotation.z = Math.PI / 2;
      this._mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), M.dark, w, s * 0.03, 0, 0);
      this.wheelMeshes.push(w);
    }
    const caster = this._mesh(new THREE.SphereGeometry(0.04, 16, 12), M.rubber, wheels, 0, 0.04, 0.17);
    this._mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 10), M.metal, wheels, 0, 0.09, 0.17);

    // ── PAT label: a green "tested" sticker on the front-left of the casing ──
    const pat = this._part('pat', casing);
    const labTex = canvasTex(256, 176, (g, w, h) => {
      g.fillStyle = '#fbfbf7'; rr(g, 0, 0, w, h, 14); g.fill();
      g.fillStyle = '#1aa05c'; g.fillRect(0, 0, w, 50); g.fillStyle = '#fff'; g.font = '700 34px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PAT', 14, 27);
      g.font = '600 26px system-ui, sans-serif'; g.fillText('PASS', 150, 27);
      g.strokeStyle = '#1aa05c'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(40, 104); g.lineTo(70, 134); g.lineTo(122, 74); g.stroke();
      g.fillStyle = '#6b7780'; g.fillRect(150, 78, 90, 8); g.fillRect(150, 100, 70, 8); g.fillRect(150, 122, 80, 8); g.fillRect(24, 150, 210, 6);
    });
    const label = this._mesh(new THREE.PlaneGeometry(0.11, 0.076), labTex ? new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.4 }) : M.white, pat, -0.112, 0.34, 0.156);
    label.rotation.y = -0.62; label.castShadow = false;

    // ── accessories on a clip at the right side ──
    const tools = this._part('tools', casing);
    this._mesh(new THREE.BoxGeometry(0.018, 0.14, 0.05), M.dark, tools, 0.205, 0.33, 0.0);
    this.holderCrevice = this._crevice(tools); this.holderCrevice.position.set(0.225, 0.34, 0.0); this.holderCrevice.rotation.set(Math.PI / 2, 0, 0); this.holderCrevice.scale.setScalar(0.7);
    this.holderBrush = this._brush(tools); this.holderBrush.position.set(0.225, 0.25, 0.0); this.holderBrush.rotation.set(Math.PI / 2, 0, 0); this.holderBrush.scale.setScalar(0.7);

    // ── hose ──
    const hoseBump = canvasTex(64, 16, (g, w, h) => { for (let x = 0; x < w; x += 8) { g.fillStyle = '#fff'; g.fillRect(x, 0, 4, h); g.fillStyle = '#222'; g.fillRect(x + 4, 0, 4, h); } }, { repeat: [34, 1], srgb: false });
    this.hoseMat = new THREE.MeshStandardMaterial({ color: 0x353b42, roughness: 0.55, bumpMap: hoseBump, bumpScale: 2.0 });
    this.hose = this._part('hose', this.free);
    this.hoseMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.hoseMat); this.hoseMesh.castShadow = true; this.hose.add(this.hoseMesh);

    // ── cable and plug ──
    this.cable = this._part('cable', this.free);
    this.cableMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 });
    this.cableMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.cableMat); this.cableMesh.castShadow = true; this.cable.add(this.cableMesh);
    this.plug = new THREE.Group(); this.cable.add(this.plug);
    this._mesh(new THREE.BoxGeometry(0.05, 0.035, 0.05), M.black, this.plug, 0, 0, -0.02);
    this._mesh(new THREE.BoxGeometry(0.008, 0.008, 0.02), M.metal, this.plug, -0.012, 0, 0.018);
    this._mesh(new THREE.BoxGeometry(0.008, 0.008, 0.02), M.metal, this.plug, 0.012, 0, 0.018);

    // ── the tool: wand + head ──
    const tool = this.tool;
    this.wandPivot = new THREE.Group(); tool.add(this.wandPivot);
    const wand = this.parts.wand = new THREE.Group(); wand.name = 'wand'; this.wandPivot.add(wand);
    this._mesh(new THREE.CylinderGeometry(0.016, 0.016, WAND_LEN - 0.05, 14), M.chrome, wand, 0, (WAND_LEN - 0.05) / 2 + 0.02, 0);
    this._mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.07, 14), M.chrome, wand, 0, 0.04, 0);
    const neck = this._mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 14), M.vacGrey, wand, 0, WAND_LEN - 0.02, 0);
    const grip = this._mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.13, 14), M.rubber, wand, 0, WAND_LEN + 0.04, 0.0);
    const bend = this._mesh(new THREE.TorusGeometry(0.05, 0.016, 10, 18, Math.PI / 2), M.vacGrey, wand, 0, WAND_LEN + 0.07, 0.05); bend.rotation.set(0, Math.PI / 2, 0);
    this.handleLocal = V(0, WAND_LEN + 0.02, 0);

    this.headFloor = new THREE.Group(); tool.add(this.headFloor);
    this._mesh(RoundedBox(0.34, 0.045, 0.13, 0.012), M.vacGrey, this.headFloor, 0, 0.035, 0.0);
    this._mesh(new THREE.BoxGeometry(0.3, 0.012, 0.02), M.chrome, this.headFloor, 0, 0.012, 0.075);
    this._mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16), M.chrome, this.headFloor, 0, 0.07, -0.02);
    this.brushStrip = this._mesh(new THREE.BoxGeometry(0.29, 0.02, 0.014), M.brushHair, this.headFloor, 0, 0.014, 0.083);
    this.pedalMesh = this._mesh(new THREE.BoxGeometry(0.05, 0.012, 0.03), M.red, this.headFloor, 0.1, 0.062, -0.03);
    this.headCrevice = this._crevice(tool); this.headCrevice.visible = false;
    this.headBrush = this._brush(tool); this.headBrush.visible = false;
    this.parts.head = this.headFloor;

    // anchors for labels
    this.anchor = {
      casing: () => this._w(this.parts.casing, 0.0, 0.42, 0.0),
      wheels: () => this._w(this.parts.wheels, 0.215, 0.12, -0.09),
      switch: () => this._w(this.parts.switch, 0, 0.06, 0),
      pat: () => this._w(this.parts.casing, -0.112, 0.34, 0.156),
      bag: () => this._w(this.bagBody, 0, 0.0, 0),
      tools: () => this._w(this.parts.tools, 0.225, 0.3, 0.0),
      hose: () => this.hoseMid.clone(),
      cable: () => this.cableMid.clone(),
      head: () => this.tool.localToWorld(V(0, 0.07, 0)),
    };
    this.anchor.wand = () => this.wandPivot.localToWorld(V(0, WAND_LEN * 0.6, 0));
    this.hoseMid = V(0, 0.2, 0); this.cableMid = V(0, 0.05, 0);
  }

  _crevice(parent) {
    const g = new THREE.Group(); parent.add(g);
    const body = this._mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.16, 12), this.M.vacGrey, g, 0, 0.0, 0); body.rotation.x = Math.PI / 2; body.position.set(0, 0.03, -0.1);
    const tip = this._mesh(new THREE.BoxGeometry(0.03, 0.012, 0.17), this.M.vacGrey, g, 0, 0.018, 0.06);
    tip.rotation.x = 0.0;
    return g;
  }
  _brush(parent) {
    const g = new THREE.Group(); parent.add(g);
    const b = this._mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.1, 18), this.M.vacGrey, g, 0, 0.05, -0.05); b.rotation.x = Math.PI / 2;
    const bristles = this._mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.035, 20), this.M.brushHair, g, 0, 0.03, 0.04); bristles.rotation.x = Math.PI / 2;
    return g;
  }
  _drawBag(g, w, h) {
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, w, h);
    const f = this.fill, top = h * (1 - f);       // dirt fills from the bottom
    const gr = g.createLinearGradient(0, top - 6, 0, top + 10);
    gr.addColorStop(0, 'rgba(120,98,70,0)'); gr.addColorStop(1, 'rgba(120,98,70,1)');
    g.fillStyle = gr; g.fillRect(0, Math.max(0, top - 6), w, h);
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let y = 8; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }
  /** How full the bag is, 0 to 1. */
  setFill(f) { this.fill = f; if (this.bagTex) { this._drawBag(this.bagTex.image.getContext('2d'), 64, 128); this.bagTex.needsUpdate = true; } }

  _w(obj, x, y, z) { return obj.localToWorld(V(x, y, z)); }
  /** World position of the grip on the wand's handle. */
  handle(out = V(0, 0, 0)) { return this.wandPivot.localToWorld(out.copy(this.handleLocal)); }
  inlet(out = V(0, 0, 0)) { return this.root.localToWorld(out.copy(this.inletLocal)); }
  exit(out = V(0, 0, 0)) { return this.root.localToWorld(out.copy(this.exitLocal)); }

  /** Switch the tool head: 'floor', 'crevice' or 'brush'. */
  setTool(kind) {
    this.tooling = kind;
    this.headFloor.visible = kind === 'floor'; this.headCrevice.visible = kind === 'crevice'; this.headBrush.visible = kind === 'brush';
    this.holderCrevice.visible = kind !== 'crevice'; this.holderBrush.visible = kind !== 'brush';
  }

  /** Where the head is, on the floor. */
  headPos(out = V(0, 0, 0)) { return out.copy(this.tool.position); }

  update(dt, snap = false, build = true) {
    const k = (rate) => (snap ? 1 : 1 - Math.exp(-dt * rate));
    // roll the wheels with the movement
    const p = this.root.position;
    if (this._first) { this._prev.copy(p); this._first = false; }
    const d = this._prev.distanceTo(p);
    if (d > 1e-5) { const fwd = V(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y)); const sgn = Math.sign(p.clone().sub(this._prev).dot(fwd)) || 1; for (const w of this.wheelMeshes) w.rotation.x += sgn * d / 0.08; }
    this._prev.copy(p);

    this.lid += (this.lidT - this.lid) * k(5);
    this.lidPivot.rotation.x = -this.lid * 1.55;
    this.bagLift += (this.bagLiftT - this.bagLift) * k(4);
    this.bag.visible = !!(this.bagShown !== false && (this.lid > 0.4 || this.bagLift > 0.02 || this.bagForce));
    this.bagBody.position.y = 0.17 + 0.0 + this.bagLift * 0.3;
    this.bagBody.rotation.z = this.bagLift * 0.45 * this.bagLiftSide;
    this.bagBody.position.x = this.bagLift * 0.05 * -this.bagLiftSide;

    this.brushOut += (this.brushT - this.brushOut) * k(10);
    this.brushStrip.position.y = 0.014 + 0.04 * (1 - this.brushOut);
    this.brushStrip.position.z = 0.083 - 0.03 * (1 - this.brushOut);
    this.brushStrip.visible = this.brushOut > 0.05;
    this.pedalMesh.position.y = 0.062 - 0.012 * this.pedal;
    this.pedal += (0 - this.pedal) * k(6);

    this.onLevel += ((this.on ? 1 : 0) - this.onLevel) * k(8);
    this.swLed.material.color.setRGB(0.12 + 0.1 * this.onLevel, 0.14 + 0.78 * this.onLevel, 0.14 + 0.36 * this.onLevel);
    this.swBtn.position.y = 0.012 - 0.004 * this.onLevel;

    // the tool stands on the floor at its position, the wand leans back at toolElev
    this.tool.rotation.y = this.toolYaw;
    this.wandPivot.rotation.x = -(Math.PI / 2 - this.toolElev);
    this.root.updateMatrixWorld(true); this.tool.updateMatrixWorld(true);
    if (build) { this._buildHose(); this._buildCable(); }
  }

  _tube(mesh, pts, radius, segs = 40, closed = false) {
    const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
    const geo = new THREE.TubeGeometry(curve, segs, radius, 8, closed);
    mesh.geometry.dispose(); mesh.geometry = geo;
    return curve;
  }

  _buildHose() {
    const a = this.inlet(), b = this.handle();
    const fwd = V(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    const mid = a.clone().lerp(b, 0.5);
    const slack = Math.max(0, 1.5 - a.distanceTo(b)) * 0.2;
    const side = V(-fwd.z, 0, fwd.x).multiplyScalar(0.05 + slack);
    const m1 = a.clone().lerp(b, 0.33).add(side); m1.y = Math.min(m1.y, 0.12) + 0.025;
    const m2 = a.clone().lerp(b, 0.66).add(side); m2.y = Math.max(0.05, Math.min(m2.y, 0.3));
    const toHandle = this.wandPivot.localToWorld(V(0, 1, 0)).sub(this.wandPivot.localToWorld(V(0, 0, 0))).normalize();
    const p0 = a.clone().add(fwd.clone().multiplyScalar(0.07));
    const pre = p0.clone().add(fwd.clone().multiplyScalar(0.16)); pre.y = a.y - 0.06;
    const post = b.clone().add(toHandle.clone().multiplyScalar(-0.1)).add(side.clone().multiplyScalar(0.3));
    const pts = [a.clone().add(fwd.clone().multiplyScalar(0.03)), pre, m1, m2, post, b];
    const curve = this._tube(this.hoseMesh, pts, 0.022, 48);
    this.hoseMid.copy(curve.getPoint(0.5));
  }

  _buildCable() {
    const e = this.exit();
    let pts;
    if (this.cableMode === 'coil') { // a loose coil beside the machine, the plug on top of it
      const c = this.root.localToWorld(V(-0.08, 0.02, -0.42));
      pts = [e];
      for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI * 2 * 1.4; pts.push(V(c.x + Math.cos(t) * (0.17 - i * 0.004), 0.016 + i * 0.002, c.z + Math.sin(t) * (0.12 - i * 0.003))); }
      this._plugAt(pts[pts.length - 1], V(0, 0, 1));
    } else if (this.cableMode === 'hold' && this.hand) { // the plug in a hand
      const h = this.hand.clone();
      const m = e.clone().lerp(h, 0.5); m.y = 0.05;
      pts = [e, e.clone().add(V(0, -0.1, 0)), m, h.clone().lerp(m, 0.3).setY(Math.max(0.1, h.y - 0.3)), h.clone().add(V(0, -0.05, 0))];
      this._plugAt(h, this.plugDir || V(0, 0, -1));
    } else { // laid out on the floor, or plugged in: the stored world-space points, then the machine
      const w = this.cableWorld.length ? this.cableWorld : [e.clone().add(V(0, 0, -0.5))];
      pts = [...w.map((q) => q.clone()), e.clone()];   // the plug end first, the machine last
      if (this.cableLift && this.cableMode === 'laid') pts = this._lifted(pts);
      const plugP = pts[0], next = pts[1];
      this._plugAt(plugP, plugP.clone().sub(next).setY(0).normalize());
    }
    // drop points that are too close (a tube needs distinct points)
    const clean = [pts[0]];
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(clean[clean.length - 1]) > 0.012) clean.push(pts[i]);
    if (clean.length < 2) clean.push(clean[0].clone().add(V(0, 0, 0.05)));
    const curve = this._tube(this.cableMesh, clean, 0.008, Math.min(160, clean.length * 6));
    this.cableMid.copy(curve.getPoint(0.5));
  }

  /** The laid cable with a bump lifted into it where a hand holds it (s = 0 at the machine, 1 at the plug). */
  _lifted(pts) {
    const n = 56, L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const out = [];
    for (let k = 0; k < n; k++) {
      const d = L[L.length - 1] * k / (n - 1); let j = 1; while (j < L.length - 1 && L[j] < d) j++;
      const f = (d - L[j - 1]) / Math.max(1e-6, L[j] - L[j - 1]); const q = pts[j - 1].clone().lerp(pts[j], Math.min(1, Math.max(0, f)));
      const s = 1 - k / (n - 1); q.y += this.cableLift.h * Math.exp(-(((s - this.cableLift.s) / 0.075) ** 2));
      out.push(q);
    }
    this._lift = out; return out;
  }
  /** A point on the lifted cable, s = 0 at the machine and 1 at the plug. */
  cableAt(s) {
    const a = this._lift; if (!a) return V(0, 0.8, 0);
    const u = (1 - Math.min(1, Math.max(0, s))) * (a.length - 1), i = Math.min(a.length - 2, Math.floor(u));
    return a[i].clone().lerp(a[i + 1], u - i);
  }

  _plugAt(p, dir) {
    this.plug.position.copy(p);
    const d = dir.clone().setY(dir.y).normalize();
    this.plug.quaternion.setFromUnitVectors(V(0, 0, 1), d);
  }

  /** Lay the cable out along the floor from the machine to a free plug end. */
  layCable(plugPos, bend = 0.25) {
    const e = this.exit(); const n = 10, pts = [];
    const side = V(-(plugPos.z - e.z), 0, plugPos.x - e.x).normalize().multiplyScalar(bend);
    for (let i = 0; i <= n; i++) { const t = i / n; const q = plugPos.clone().lerp(e, t); q.add(side.clone().multiplyScalar(Math.sin(t * Math.PI))); q.y = 0.012; pts.push(q); }
    this.cableWorld = pts; this.cableMode = 'laid';
  }
}

// A rounded box, so the head looks moulded rather than cut.
function RoundedBox(w, h, d, r) { return new RoundedBoxGeometry(w, h, d, 3, r); }
