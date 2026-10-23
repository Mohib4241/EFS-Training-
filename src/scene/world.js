// Everything in the scene and the rules that tie it together: the worker, the vacuum, the room, the
// props, the cable that follows the machine, the dirt that disappears as the head goes over it, the
// stripes the head leaves on the floor, doors that open, lights, and the rings that point at parts.
import * as THREE from 'three';
import { makeMaterials } from './mat.js';
import { buildRoom, PLACES, SOCKET_POS, CARPET_X } from './room.js';
import { Vacuum } from './vacuum.js';
import { Worker } from './worker.js';
import { buildProps } from './props.js';
import { SHOTS } from './shots.js';
import { canvasTex, rng } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FLOOR_X = [-4, 4], FLOOR_Z = [-3, 3];
// how big the ring round each pointed-at thing is, in metres
const RING = { pat: 0.15, switch: 0.13, tools: 0.17, head: 0.2, socket: 0.18, breaker: 0.22, wand: 0.2, hose: 0.22, pests: 0.3, crack: 0.3, torn: 0.3, lane: 0.6, cloths: 0.3 };

export class World {
  constructor({ stage = null, scene = null } = {}) {
    this.stage = stage;
    this.scene = stage ? stage.scene : (scene || new THREE.Scene());
    this.M = makeMaterials();
    this.shot = SHOTS.wide;
    this.build();
  }

  // ───────────── building and resetting ─────────────
  build() {
    const content = this.content = new THREE.Group(); this.scene.add(content);
    this.room = buildRoom(this.M); content.add(this.room.group);
    this.props = buildProps(this.M, this.room); content.add(this.props.group);
    this.vac = new Vacuum(this.M); content.add(this.vac.root, this.vac.free);
    this.worker = new Worker(this.M); content.add(this.worker.root);
    this.time = 0; this.op = null; this.hl = []; this.water = false; this.cableHand = 'R'; this.followers = new Map();
    this.anim = { store: [0, 0], door: [1, 1], lights: [1, 1] };
    this.trail = null; this.socketOn = false; this.lightsOn = true;
    this._grit(); this._mask(); this._ringTex();
    for (const k of ['pests', 'crack', 'torn']) this.props[k].visible = false;   // found in steps 6 and 7

    // starting state: the worker outside the door, the machine parked, the sign still folded in their hands
    this.worker.place(5.6, -0.3, -Math.PI / 2);
    this.vac.root.position.set(PLACES.vac[0], 0, PLACES.vac[1]); this.vac.root.rotation.y = 0.62;
    this.vac.setFill(0.4); this.vac.setTool('floor'); this.vac.brushT = 1; this.vac.brushOut = 1;
    this.props.sign.visible = false;
    this.carry(this.props.sign, { hand: 'R', off: [0, -0.62, 0.02], rot: [0, Math.PI / 2, 0] });
    this.update(1 / 60, { snap: true });
  }

  reset() {
    this.scene.remove(this.content);
    this.content.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isMesh && o.material && o.material.map && o.material.userData?.own) o.material.map.dispose(); });
    if (this.vac?.bagTex) this.vac.bagTex.dispose();
    if (this.mask) this.mask.tex?.dispose();
    this.hl = [];
    this.build();
  }

  // ───────────── dirt, stripes ─────────────
  _grit() {
    const N = 460;
    const geo = new THREE.SphereGeometry(0.009, 5, 4); geo.scale(1, 0.4, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const mesh = this.grit = new THREE.InstancedMesh(geo, mat, N);
    mesh.castShadow = false; mesh.receiveShadow = true;
    const r = rng(77), m = new THREE.Matrix4(), col = new THREE.Color();
    this.gritPos = []; this.gritLife = new Float32Array(N).fill(1);
    for (let i = 0; i < N; i++) {
      let x, z;
      if (i < 150) { x = 2.5 + r() * 1.4; z = -1.5 + r() * 2.4; }               // thick in the traffic lane
      else if (i < 330) { x = 0.8 + r() * 2.9; z = -2.6 + r() * 3.9; }            // the rest of the carpet
      else if (i < 380) { x = 2.0 + r() * 1.9; z = -2.95 + r() * 0.2; }           // along the back wall
      else if (i < 420) { x = 3.75 + r() * 0.2; z = -2.9 + r() * 3.2; }           // along the right wall
      else { x = -0.45 + r() * 1.0; z = -1.6 + r() * 3.2; }                       // the hard floor beside the carpet
      const carpet = x > CARPET_X;
      m.makeScale(0.8 + r() * 1.4, 1, 0.8 + r() * 1.4); m.setPosition(x, carpet ? 0.024 : 0.006, z);
      mesh.setMatrixAt(i, m);
      col.setHex(carpet ? 0xcdbf9f : 0x3b3027).offsetHSL(0, 0, (r() - 0.5) * 0.08);
      mesh.setColorAt(i, col);
      this.gritPos.push([x, z, carpet ? 0.024 : 0.006, 0.8 + r() * 1.4]);
    }
    this.gritLeft = N; this.gritN = N;
    this.content.add(mesh);
  }
  _mask() {
    // faint stripes where the head has been, laid over the floor
    const W = 512, H = 384;
    const tex = canvasTex(W, H, (g, w, h) => g.clearRect(0, 0, w, h), { aniso: 4 });
    this.mask = { tex, W, H, last: null, ctx: tex ? tex.image.getContext('2d') : null };
    if (!tex) return;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5, blending: THREE.NormalBlending }));
    plane.rotation.x = -Math.PI / 2; plane.position.y = 0.03; plane.renderOrder = 2; this.content.add(plane);
    this.mask.plane = plane;
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  _stamp(x, z, width) {
    const k = this.mask; if (!k.ctx) { return; }
    const u = (x + 4) / 8 * k.W, v = (z + 3) / 6 * k.H;
    const g = k.ctx; g.strokeStyle = 'rgba(205,228,255,0.2)'; g.lineWidth = width / 8 * k.W; g.lineCap = 'round';
    g.beginPath(); if (k.last) g.moveTo(k.last[0], k.last[1]); else g.moveTo(u, v); g.lineTo(u, v); g.stroke();
    k.last = [u, v]; k.dirty = true;
  }
  _sweep(x, z, r, dt) {
    const m = new THREE.Matrix4(); let changed = false;
    for (let i = 0; i < this.gritN; i++) {
      if (this.gritLife[i] <= 0) continue;
      const p = this.gritPos[i], dx = p[0] - x, dz = p[1] - z;
      if (dx * dx + dz * dz < r * r) {
        this.gritLife[i] = Math.max(0, this.gritLife[i] - dt * 7);
        const s = this.gritLife[i];
        m.makeScale(p[3] * s, s, p[3] * s); m.setPosition(p[0] + (x - p[0]) * (1 - s) * 0.6, p[2], p[1] + (z - p[1]) * (1 - s) * 0.6);
        this.grit.setMatrixAt(i, m); changed = true;
        if (s <= 0) this.gritLeft--;
      }
    }
    if (changed) this.grit.instanceMatrix.needsUpdate = true;
  }

  // ───────────── things the director asks for ─────────────
  /**
   * Make a prop follow a hand. `off` is [left, up, forward] from the hand in the worker's own frame,
   * `rot` is [pitch, yaw, roll] relative to where the worker faces.
   */
  carry(prop, { hand = 'R', off = [0, 0, 0], rot = [0, 0, 0] } = {}) {
    prop.rotation.order = 'YXZ'; prop.visible = true;
    this.followers.set(prop, () => {
      const w = this.worker, hp = w.handPos(hand, this._hp || (this._hp = V(0, 0, 0)));
      const f = w.forward(this._f || (this._f = V(0, 0, 0))), l = V(f.z, 0, -f.x);
      prop.position.copy(hp).addScaledVector(l, off[0]).addScaledVector(V(0, 1, 0), off[1]).addScaledVector(f, off[2]);
      prop.rotation.set(rot[0], w.heading + rot[1], rot[2]);
    });
  }
  /** Stop a prop following a hand; it stays where it is. */
  uncarry(prop) { this.followers.delete(prop); }
  /** Put a prop down on the floor or a table. */
  drop(prop, x, y, z, yaw = 0) { this.followers.delete(prop); prop.rotation.order = 'YXZ'; prop.position.set(x, y, z); prop.rotation.set(0, yaw, 0); prop.visible = true; }

  /** Start or stop working with the tool. `o`: { d, elev, lat, clean, width, stroke } */
  operate(o) {
    if (o) {
      this.op = { d: 0.85, elev: 1.15, lat: 0.1, clean: true, width: 0.3, stroke: 0, amp: 0.22, freq: 5.0, t: 0, sw: 0, blend: 0, stopping: false, ...o };
      this.worker.setIK('R', () => this.vac.handle(this._h || (this._h = V(0, 0, 0))));
    } else if (this.op) this.op.stopping = true;   // the tool settles back against the canister
  }
  setAnim(name, v) { this.anim[name][1] = v; }
  setSocket(on) { this.socketOn = on; }
  setLights(on) { this.lightsOn = on; this.anim.lights[1] = on ? 1 : 0; }

  // cable: coiled by the machine, held in a hand, laid on the floor, or plugged into the socket
  cableCoil() { this.vac.cableMode = 'coil'; this.trail = null; }
  cableHold(hand = 'R') { this.vac.cableMode = 'hold'; this.cableHand = hand; this.trail = null; }
  cableLay(x, z, bend = 0.25) { this.vac.layCable(V(x, 0.012, z), bend); this.trail = null; }
  cablePlug() {
    this.trail = [SOCKET_POS.clone().add(V(0, 0, 0.03)), V(3.0, 0.22, -2.9), V(3.0, 0.012, -2.78)];
    this.vac.cableMode = 'plugged'; this.vac.cableWorld = this.trail;
  }

  // ───────────── rings that point at parts ─────────────
  _ringTex() {
    const t = canvasTex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(64, 64, 20, 64, 64, 62);
      gr.addColorStop(0, 'rgba(40,230,210,0)'); gr.addColorStop(0.6, 'rgba(40,230,210,0.0)'); gr.addColorStop(0.8, 'rgba(120,255,235,0.95)'); gr.addColorStop(0.9, 'rgba(40,230,210,0.35)'); gr.addColorStop(1, 'rgba(40,230,210,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { aniso: 1 });
    this.ringMat = new THREE.SpriteMaterial({ map: t, color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
  }
  anchorOf(id) {
    const a = this.vac.anchor[id];
    if (a) return a();
    return ({
      breaker: () => V(2.0, 1.4, -2.8), socket: () => V(3.0, 0.38, -2.9), cloths: () => V(-3.45, 0.95, 1.6), sign: () => this.props.sign.getWorldPosition(V(0, 0, 0)).add(V(0, 0.3, 0)),
      pests: () => V(-3.1, 0.12, -2.1), crack: () => V(-0.5, 0.1, -1.4), torn: () => V(0.6, 0.12, 1.8), lane: () => V(3.4, 0.1, -0.3),
    }[id] || (() => V(0, 1, 0)))();
  }
  highlight(ids) {
    this.clearHighlight();
    this.hl = ids.map((id) => {
      const ring = new THREE.Sprite(this.ringMat.clone()); ring.renderOrder = 20; ring.scale.setScalar(0.3); this.content.add(ring);
      return { id, ring, tick: false, t: Math.random() };
    });
  }
  clearHighlight() { for (const h of this.hl) { this.content.remove(h.ring); h.ring.material.dispose(); } this.hl = []; }
  tick(id) { const h = this.hl.find((x) => x.id === id); if (h) h.tick = true; }

  // ───────────── per frame ─────────────
  update(dt, o = {}) {
    const snap = !!o.snap, buildGeo = o.geometry !== false;
    this.time += dt;
    this._tool(dt);
    this.vac.root.updateMatrixWorld(true);
    this._cable();
    this.vac.update(dt, snap, buildGeo);
    this._cleaning(dt);
    this.worker.update(dt, snap);
    for (const fn of this.followers.values()) fn();

    // doors, switches, water, lights
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    for (const key of Object.keys(this.anim)) this.anim[key][0] += (this.anim[key][1] - this.anim[key][0]) * k;
    const room = this.room, A = this.anim;
    room.store.doorL.rotation.y = -A.store[0] * 1.9; room.store.doorR.rotation.y = A.store[0] * 1.9;
    room.doorHinge.rotation.y = -A.door[0] * 1.7;
    const s = room.socket; s.rocker.rotation.x = this.socketOn ? -0.45 : 0.45; s.led.material = this.socketOn ? this.M.green : this.M.redLed;
    room.basin.water.visible = this.water;
    const L = A.lights[0];
    for (const l of room.lamps) { l.light.intensity = l.base * L; l.lamp.material = L > 0.5 ? this.M.lamp : this.M.dark; }
    room.acLed.material = L > 0.5 ? this.M.green : this.M.redLed;
    if (this.stage) this.stage.setLights(L);
    if (this.mask.plane) this.mask.plane.material.opacity = 0.5 * (0.2 + 0.8 * L);   // the stripes are lit by the room, so they dim with it

    // rings
    if (o.visuals !== false) for (const h of this.hl) {
      h.t += dt; const p = this.anchorOf(h.id); h.ring.position.copy(p);
      const base = RING[h.id] || 0.28;
      h.ring.scale.setScalar(base * (1 + 0.14 * Math.sin(h.t * 4.5)) + (h.tick ? 0.02 : 0));
      h.ring.material.color.setHex(h.tick ? 0x6cff9d : 0xffffff);
    }
    if (this.mask.dirty && this.mask.tex) { this.mask.tex.needsUpdate = true; this.mask.dirty = false; }
    if (this.stage) this.stage.shot(this.shot(this), dt, snap);
  }

  /** Where the tool rests when nobody holds it: leaning against the canister's right side. */
  _rest(out = {}) {
    const v = this.vac, ry = v.root.rotation.y, c = Math.cos(ry), s = Math.sin(ry), lx = 0.36, lz = 0.2;
    out.pos = V(v.root.position.x + lx * c + lz * s, 0, v.root.position.z - lx * s + lz * c);
    out.yaw = ry + Math.atan2(lx, lz); out.elev = 1.38;
    return out;
  }

  /** Where the tool and the canister are, while working or resting. */
  _tool(dt) {
    const w = this.worker, v = this.vac, rest = this._rest();
    const o = this.op;
    if (!o) { v.tool.position.copy(rest.pos); v.toolYaw = rest.yaw; v.toolElev = rest.elev; return; }
    o.t += dt;
    o.sw += ((o.stroke ? 1 : 0) - o.sw) * (1 - Math.exp(-dt * 4));
    o.blend += ((o.stopping ? 0 : 1) - o.blend) * (1 - Math.exp(-dt * 4.5));
    const f = w.forward(), r = w.right();
    const head = w.pos.clone().addScaledVector(f, o.d + Math.sin(o.t * o.freq) * o.amp * o.sw).addScaledVector(r, o.lat); head.y = 0;
    let dy = w.heading - rest.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.tool.position.copy(rest.pos).lerp(head, o.blend); v.toolYaw = rest.yaw + dy * o.blend; v.toolElev = rest.elev + (o.elev - rest.elev) * o.blend;
    if (o.stopping && o.blend < 0.03) { this.op = null; this.worker.setIK('R', null); return; }
    // the canister is pulled along on its hose and turns to face the head
    const hp = v.tool.position, to = v.root.position.clone().sub(hp); to.y = 0; const dist = to.length(), D = 1.45;
    if (dist > D) v.root.position.copy(hp).addScaledVector(to, D / dist);
    const want = Math.atan2(hp.x - v.root.position.x, hp.z - v.root.position.z);
    let dyaw = want - v.root.rotation.y; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    v.root.rotation.y += dyaw * (1 - Math.exp(-dt * 4));
  }

  _cable() {
    const v = this.vac;
    if (v.cableMode === 'hold') v.hand = this.worker.handPos(this.cableHand, v.hand || V(0, 0, 0));
    if (v.cableMode === 'plugged' && this.trail) {
      const e = v.exit(this._e || (this._e = V(0, 0, 0))), t = this.trail, last = t[t.length - 1];
      if (t.length > 3 && e.distanceTo(t[t.length - 2]) < 0.16) t.pop();
      else if (e.distanceTo(last) > 0.3) t.push(V(e.x, 0.012, e.z));
    }
  }

  _cleaning(dt) {
    const o = this.op, v = this.vac;
    if (!o || !o.clean || !v.on) { if (this.mask.last) this.mask.last = null; return; }
    const hp = v.tool.position;
    this._sweep(hp.x, hp.z, v.tooling === 'floor' ? 0.2 : 0.1, dt);
    // a stripe is laid only while the worker walks, so turning at the end of a pass does not smear the floor
    if (this.worker.speed > 0.15) this._stamp(hp.x, hp.z, o.width); else this.mask.last = null;
  }

  /** Fraction of the dirt left, 0 to 1. */
  get dirt() { return this.gritLeft / this.gritN; }

  cam(shot) { this.shot = typeof shot === 'string' ? SHOTS[shot] : shot; }
}
