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
const WHEEL_RADIUS = .11;

// Upper half of the oval consumer canister shown in the supplied video. Splitting the moulding
// along Z lets the front bag cover hinge independently while the motor cover stays on the base.
function shellGeometry(from, to) {
  const rows = 36, cols = 48, points = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = from + (to - from) * i / rows, section = Math.sqrt(Math.max(0, 1 - (z / .30) ** 2));
    for (let j = 0; j <= cols; j++) {
      const a = -Math.PI / 2 + j / cols * Math.PI;
      points.push(.184 * section * Math.sin(a), .142 - .012 * z / .3 + .153 * section * Math.cos(a), z);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + cols + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

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

    // ── low oval canister, matching the red/black exterior and large wheels in the reference ──
    const casing = this._part('casing', r);
    const red = this.shellMaterial = M.vacRed.clone(); red.color.setHex(0x9f111c); red.roughness = .58;
    const black = this.trimMaterial = M.vacGrey.clone(); black.color.setHex(0x25292c); black.roughness = .57;
    const base = this._mesh(new THREE.SphereGeometry(1, 64, 36), black, casing, 0, .105, 0); base.scale.set(.183, .078, .292);
    this._mesh(shellGeometry(-.30, -.025), red, casing);
    const bumper = [];
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; bumper.push(V(Math.sin(a) * .183, .14 - .012 * Math.cos(a), Math.cos(a) * .298)); }
    this._mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bumper), 96, .008, 8), black, casing);
    // Exhaust grille and cable outlet belong to the fixed rear motor casing.
    for (let i = 0; i < 8; i++) this._mesh(new THREE.BoxGeometry(.11, .004, .007), M.dark, casing, 0, .08 + i * .007, -.278);
    this._mesh(new THREE.CylinderGeometry(.015, .017, .035, 16), M.rubber, casing, -.07, .1, -.274).rotation.x = Math.PI / 2;
    this.inletLocal = V(0, .30, .205); this.exitLocal = V(-.07, .10, -.29);
    const inlet = this._mesh(new THREE.CylinderGeometry(.030, .034, .075, 32), black, casing, 0, .274, .176);
    inlet.quaternion.setFromUnitVectors(UP, V(0, .7, .714).normalize());
    const inletRim = this._mesh(new THREE.TorusGeometry(.031, .004, 10, 32), M.vacGrey, casing, 0, .30, .205);
    inletRim.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, .7, .714).normalize());

    // lid on a hinge at the back, with the carry handle and the on/off switch
    const lidPivot = this.lidPivot = new THREE.Group(); lidPivot.position.set(0, .143, -.022); casing.add(lidPivot);
    const lid = new THREE.Group(); lidPivot.add(lid);
    const cover = shellGeometry(-.02, .30); cover.translate(0, -.143, .022);
    this._mesh(cover, red, lid);
    const latch = this._mesh(RoundedBox(.055, .014, .024, .005), black, lid, 0, .015, .302);
    // Recessed carry handle, as seen on the rear of the reference machine.
    this._mesh(RoundedBox(.13, .022, .038, .01), black, casing, 0, .301, -.08);
    for (const x of [-.05, .05]) this._mesh(RoundedBox(.025, .033, .038, .008), black, casing, x, .283, -.08);

    // ── on / off switch (on the lid, at the front) ──
    const sw = this._part('switch', casing); sw.position.set(-.065, .266, -.15);
    this._mesh(RoundedBox(.074, .018, .072, .016), black, sw);
    this.swBtn = this._mesh(RoundedBox(.056, .014, .052, .012), M.vacGrey, sw, 0, .012, 0);
    this.swLed = this._mesh(new THREE.CircleGeometry(.003, 16), new THREE.MeshBasicMaterial({ color: 0x35e07a }), sw, .019, .020, .014); this.swLed.rotation.x = -Math.PI / 2;
    this.swLed.material.color.setRGB(0.12, 0.14, 0.14);
    this._mesh(RoundedBox(.058, .016, .052, .012), black, casing, .065, .278, -.15);

    // ── dust bag (inside; only seen with the lid open or lifted out) ──
    const bag = this.bag = this._part('bag', r); bag.position.set(0, .11, .09);
    const bagBody = new THREE.Group(); bag.add(bagBody); this.bagBody = bagBody;
    const bagTex = this.bagTex = canvasTex(64, 128, (g, w, h) => this._drawBag(g, w, h));
    this.bagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bagTex, roughness: 1 });
    const pillow = new THREE.BoxGeometry(.24, .11, .20, 10, 8, 8);
    const p = pillow.attributes.position;
    for (let i = 0; i < p.count; i++) { // a soft, puffed bag
      const x = p.getX(i) / .12, y = p.getY(i) / .055, z = p.getZ(i);
      p.setZ(i, z + Math.sign(z) * .008 * (1 - x * x) * (1 - y * y));
    }
    pillow.computeVertexNormals();
    this._mesh(pillow, this.bagMat, bagBody, 0, 0.0, 0);
    this._mesh(new THREE.BoxGeometry(.22, .012, .025), M.blue, bagBody, 0, .055, .075);
    this._mesh(RoundedBox(.255, .035, .23, .012), black, r, 0, .11, .09);
    bag.visible = false;

    // ── wheels ──
    const wheels = this._part('wheels', r); this.wheelMeshes = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * .184, .112, -.135); wheels.add(w);
      const tyre = this._mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, .048, 64), M.rubber, w); tyre.rotation.z = Math.PI / 2;
      const hub = this._mesh(new THREE.CylinderGeometry(.089, .089, .051, 64), red, w); hub.rotation.z = Math.PI / 2;
      const insert = this._mesh(new THREE.CylinderGeometry(.075, .075, .053, 64), black, w); insert.rotation.z = Math.PI / 2;
      for (let j = 0; j < 3; j++) {
        const blade = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12, a = j * Math.PI * 2 / 3 + t * .55, radius = .021 + t * .042; blade.push(V(s * .029, Math.cos(a) * radius, Math.sin(a) * radius)); }
        this._mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(blade), 14, .015, 8), red, w);
      }
      this.wheelMeshes.push(w);
    }
    this._mesh(new THREE.SphereGeometry(.028, 20, 14), M.rubber, wheels, 0, .03, .205);
    this._mesh(new THREE.CylinderGeometry(.01, .01, .05, 12), M.metal, wheels, 0, .065, .205);

    // ── PAT label: a green "tested" sticker on the front-left of the casing ──
    const pat = this._part('pat', casing);
    const labTex = canvasTex(256, 176, (g, w, h) => {
      g.fillStyle = '#fbfbf7'; rr(g, 0, 0, w, h, 14); g.fill();
      g.fillStyle = '#1aa05c'; g.fillRect(0, 0, w, 50); g.fillStyle = '#fff'; g.font = '700 34px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PAT', 14, 27);
      g.font = '600 26px system-ui, sans-serif'; g.fillText('DEMO', 142, 27);
      g.strokeStyle = '#1aa05c'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(40, 104); g.lineTo(70, 134); g.lineTo(122, 74); g.stroke();
      g.fillStyle = '#6b7780'; g.fillRect(150, 78, 90, 8); g.fillRect(150, 100, 70, 8); g.fillRect(150, 122, 80, 8); g.fillRect(24, 150, 210, 6);
    });
    const label = this._mesh(new THREE.PlaneGeometry(.065, .043), labTex ? new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.6 }) : M.white, pat, -.172, .12, .085);
    label.rotation.y = -Math.PI / 2; label.castShadow = false;

    // ── accessories on a clip at the right side ──
    const tools = this._part('tools', casing);
    this._mesh(new THREE.BoxGeometry(.13, .025, .04), M.dark, tools, 0, .085, -.26);
    this.holderCrevice = this._crevice(tools); this.holderCrevice.position.set(-.065, .08, -.27); this.holderCrevice.rotation.y = Math.PI / 2; this.holderCrevice.scale.setScalar(.5);
    this.holderBrush = this._brush(tools); this.holderBrush.position.set(.065, .08, -.27); this.holderBrush.rotation.y = Math.PI / 2; this.holderBrush.scale.setScalar(.5);

    // ── hose ──
    const hoseBump = canvasTex(64, 16, (g, w, h) => { for (let x = 0; x < w; x += 8) { g.fillStyle = '#fff'; g.fillRect(x, 0, 4, h); g.fillStyle = '#222'; g.fillRect(x + 4, 0, 4, h); } }, { repeat: [34, 1], srgb: false });
    this.hoseMat = new THREE.MeshStandardMaterial({ color: 0x494a49, roughness: 0.57, bumpMap: hoseBump, bumpScale: .0012 });
    this.hose = this._part('hose', this.free);
    this.hoseMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.hoseMat); this.hoseMesh.castShadow = true; this.hose.add(this.hoseMesh);
    // Actual rib geometry preserves the corrugated silhouette in close-up, in one instanced draw.
    this.hoseRibs = new THREE.InstancedMesh(new THREE.TorusGeometry(.023, .0014, 4, 12), new THREE.MeshStandardMaterial({color: 0x3e4041, roughness: .7}), 180);
    this.hoseRibs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.hoseRibs.castShadow = true; this.hoseRibs.frustumCulled = false; this.hose.add(this.hoseRibs);
    this._ribTransform = new THREE.Object3D();

    // ── cable and plug ──
    this.cable = this._part('cable', this.free);
    this.cableMat = new THREE.MeshStandardMaterial({ color: 0xdac642, roughness: 0.6 });
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
    const handleCurve = new THREE.CatmullRomCurve3([V(0, .985, .01), V(0, .99, .105), V(0, 1.10, .115), V(0, 1.135, .035), V(0, 1.06, 0)], true);
    this._mesh(new THREE.TubeGeometry(handleCurve, 56, .017, 12, true), black, wand);
    this._mesh(new THREE.CylinderGeometry(.024, .022, .055, 24), black, wand, 0, 1.12, 0);
    this.handleLocal = V(0, 1.055, .115);
    this.hoseHandleLocal = V(0, 1.145, 0);

    this.headFloor = new THREE.Group(); tool.add(this.headFloor);
    this._mesh(RoundedBox(0.34, 0.045, 0.15, 0.012), black, this.headFloor, 0, 0.035, 0.0);
    this._mesh(RoundedBox(.19, .05, .10, .018), black, this.headFloor, 0, .057, -.012).rotation.x = -.12;
    this._mesh(new THREE.BoxGeometry(0.3, 0.012, 0.02), M.chrome, this.headFloor, 0, 0.012, 0.075);
    this._mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16), M.chrome, this.headFloor, 0, 0.07, -0.02);
    this.brushStrip = this._mesh(new THREE.BoxGeometry(0.29, 0.02, 0.014), M.brushHair, this.headFloor, 0, 0.014, 0.083);
    this.pedalMesh = this._mesh(RoundedBox(.055, .012, .035, .004), M.vacGrey, this.headFloor, 0.1, 0.062, -0.03);
    this.headCrevice = this._crevice(tool); this.headCrevice.visible = false;
    this.headBrush = this._brush(tool); this.headBrush.visible = false;
    this.parts.head = this.headFloor;

    // anchors for labels
    this.anchor = {
      casing: () => this._w(this.parts.casing, 0, .28, -.06),
      wheels: () => this._w(this.parts.wheels, .21, .112, -.135),
      switch: () => this._w(this.parts.switch, 0, .025, 0),
      pat: () => this._w(this.parts.casing, -.172, .12, .085),
      bag: () => this._w(this.bagBody, 0, 0.0, 0),
      tools: () => this._w(this.parts.tools, 0, .11, -.27),
      hose: () => this.hoseMid.clone(),
      cable: () => this.cableMid.clone(),
      head: () => this.tool.localToWorld(V(0, 0.07, 0)),
    };
    this.anchor.wand = () => this.wandPivot.localToWorld(V(0, WAND_LEN * 0.6, 0));
    this.anchor.plug = () => this.plug.position.clone().add(V(0, 0.03, 0));
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
  bagCorner(out = V(0, 0, 0)) { return this.bagBody.localToWorld(out.set(.105, .05, .065)); }

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
    if (d > 1e-5) { const fwd = V(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y)); const sgn = Math.sign(p.clone().sub(this._prev).dot(fwd)) || 1; for (const w of this.wheelMeshes) w.rotation.x += sgn * d / WHEEL_RADIUS; }
    this._prev.copy(p);

    this.lid += (this.lidT - this.lid) * k(5);
    this.lidPivot.rotation.x = -this.lid * 1.55;
    this.bagLift += (this.bagLiftT - this.bagLift) * k(4);
    this.bag.visible = !!(this.bagShown !== false && (this.lid > 0.4 || this.bagLift > 0.02 || this.bagForce));
    this.bagBody.position.y = .045 + this.bagLift * .18;
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
    const a = this.inlet(), b = this.wandPivot.localToWorld(this.hoseHandleLocal.clone());
    const fwd = V(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    const mid = a.clone().lerp(b, 0.5);
    const slack = Math.max(0, 1.5 - a.distanceTo(b)) * 0.2;
    const side = V(-fwd.z, 0, fwd.x).multiplyScalar(0.05 + slack);
    const m1 = a.clone().lerp(b, 0.33).add(side); m1.y = Math.min(m1.y, 0.12) + 0.025;
    const m2 = a.clone().lerp(b, 0.66).add(side); m2.y = Math.max(0.05, Math.min(m2.y, 0.3));
    const toHandle = this.wandPivot.localToWorld(V(0, 1, 0)).sub(this.wandPivot.localToWorld(V(0, 0, 0))).normalize();
    const inletDirection = fwd.clone().multiplyScalar(.714).addScaledVector(UP, .7).normalize();
    const pre = a.clone().addScaledVector(inletDirection, .15);
    const post = b.clone().add(toHandle.clone().multiplyScalar(-0.1)).add(side.clone().multiplyScalar(0.3));
    const pts = [a, pre, m1, m2, post, b];
    const curve = this._tube(this.hoseMesh, pts, 0.022, 48);
    const transform = this._ribTransform;
    for (let i = 0; i < this.hoseRibs.count; i++) {
      const t = (i + .5) / this.hoseRibs.count;
      transform.position.copy(curve.getPointAt(t)); transform.quaternion.setFromUnitVectors(V(0, 0, 1), curve.getTangentAt(t)); transform.updateMatrix(); this.hoseRibs.setMatrixAt(i, transform.matrix);
    }
    this.hoseRibs.instanceMatrix.needsUpdate = true;
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
