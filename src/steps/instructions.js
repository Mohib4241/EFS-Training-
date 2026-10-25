// The Instructions lesson in the big room: twelve short steps. The first seven are what to check before
// the machine is used; the last five are how to look after it. What is said is in
// src/narration/instructions.js and the checks are in src/data/instructions.js, both matched by
// position. `check` ties a beat to a check, so a test can see none is left out; `bad: true` rings
// something that is wrong in red (a wet floor, a damaged cable).
import { SHOTS, orbit, onPart } from '../scene/shots.js';
import { HALL } from '../scene/hall.js';
import { SPOTS } from '../scene/hallprops.js';
import { V, along } from './moves.js';
import { INSTR_TEXT } from '../narration/instructions.js';
import { INSTR_CHECKS } from '../data/instructions.js';

const vacShot = (o = {}) => orbit((w) => w.vac.root.position.clone().add(V(0.5, 0.3, -0.1)), { dist: 3.4, az: 0.15, el: 0.38, fov: 38, ...o });
const follow = (o = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 0.9, 0)), { dist: 3.6, az: -0.45, el: 0.25, fov: 38, ...o });
const toward = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
const SOCKET_STAND = [3.0, -2.15];
const PLUG_END = [2.3, 0.45];                     // where the end of the cable is laid for the checks

/** A point in front of the worker's chest, for hands that hold or show something. */
const front = (c, side = 0, up = 1.2, fwd = 0.3) => () => {
  const w = c.worker, f = w.forward(), l = V(f.z, 0, -f.x);
  return w.pos.clone().addScaledVector(f, fwd).addScaledVector(l, side).add(V(0, up, 0));
};

const STEPS = [
  // ───────────── 1. everything must be dry ─────────────
  {
    n: 1,
    beats: [
      {
        check: 'floor-dry', cam: 'hallPuddle', hl: ['puddle'], bad: true,
        act: function* (c) {
          const P = SPOTS.puddle;
          c.props.puddle.visible = true;
          c.drop(c.props.sign, P.x + 1.0, 0, P.z + 0.6, 0.4);
          yield* c.walk(-1.4, 3.0, { face: toward(-1.4, 3.0, P.x, P.z) });
          c.gaze(V(P.x, 0.05, P.z)); c.adjust({ lean: 0.1, headPitch: 0.3 });
          yield* c.reach('R', V(P.x + 0.7, 0.8, P.z + 0.55), 1.3);
          yield* c.wait(2.6);
          c.release('R'); c.gaze(null); c.pose('idle');
        },
      },
      {
        check: 'hands-dry', cam: follow({ dist: 3.2 }), hl: ['casing', 'cable'],
        act: function* (c) {
          const vac = c.vac;
          c.props.puddle.visible = false; c.props.sign.visible = false;
          // dry the hands on a towel
          c.props.towel.visible = true;
          c.carry(c.props.towel, { hand: 'L', off: [0, -0.03, 0.03], rot: [0, 0, 0] });
          yield* c.walk(-0.6, 2.4, { face: Math.PI / 2 + 0.3 });
          c.worker.setIK('L', front(c, 0.07, 1.15, 0.32));
          for (let i = 0; i < 5; i++) { c.worker.setIK('R', front(c, i % 2 ? 0.0 : -0.1, 1.15, 0.32)); yield* c.wait(0.34); }
          c.release('R'); c.release('L'); c.uncarry(c.props.towel); c.props.towel.visible = false;
          // then a hand over the machine and the cable
          const p = vac.root.position, sx = p.x - 0.55, sz = p.z + 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ lean: 0.25, crouch: 0.2, headPitch: 0.3 });
          yield* c.reach('R', () => vac.anchor.casing().add(V(-0.12, 0, 0.1)), 1.1); c.tick('casing');
          c.adjust({ crouch: 0.6 });
          yield* c.reach('R', () => vac.cableMid.clone().add(V(0, 0.05, 0)), 1.1); c.tick('cable');
          c.release('R'); c.pose('idle'); yield* c.wait(0.4);
        },
      },
    ],
  },

  // ───────────── 2. the cable ─────────────
  {
    n: 2,
    beats: [
      {
        check: 'cable-bare', cam: 'hallFrayed', hl: ['frayed'], bad: true,
        act: function* (c) {
          const F = SPOTS.frayed;
          c.props.frayed.visible = true;
          yield* c.walk(F.x + 0.9, F.z + 0.7, { face: toward(F.x + 0.9, F.z + 0.7, F.x, F.z) });
          c.adjust({ crouch: 0.55, lean: 0.3, headPitch: 0.4 });
          c.gaze(V(F.x + 0.1, 0.03, F.z));
          yield* c.reach('R', V(F.x + 0.2, 0.2, F.z + 0.05), 1.2);
          yield* c.wait(2.8);
          c.release('R'); c.gaze(null); c.pose('idle');
        },
      },
      {
        check: 'cable-cloth', cam: vacShot(), hl: ['cable'],
        act: function* (c) {
          const vac = c.vac;
          c.props.frayed.visible = false;
          c.props.cloth.visible = true;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          // take the plug end from the coil and lay the cable out on the floor
          const coil = vac.root.localToWorld(V(-0.08, 0, -0.42));
          yield* c.walk(coil.x - 0.5, coil.z - 0.5, { face: toward(coil.x - 0.5, coil.z - 0.5, coil.x, coil.z) });
          c.adjust({ crouch: 0.6, lean: 0.3 });
          yield* c.reach('R', V(coil.x, 0.06, coil.z), 0.9);
          c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
          yield* c.walk(PLUG_END[0] - 0.7, PLUG_END[1] + 0.5, { face: Math.PI / 2 });
          c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.7);
          c.w.cableLay(PLUG_END[0], PLUG_END[1], 0.25);
          c.adjust({ crouch: 0, lean: 0.1 }); yield* c.wait(0.6);
          // run the cloth along it, from the machine to the plug
          const plug = V(PLUG_END[0], 0, PLUG_END[1]), ex = vac.exit();
          const d = plug.clone().sub(ex).setY(0).normalize(), side = V(d.z, 0, -d.x).multiplyScalar(0.32);
          let s = 0.1; vac.cableLift = { s, h: 0.95 };
          const b0 = ex.clone().lerp(plug, s).add(side);
          yield* c.walk(b0.x, b0.z, { face: Math.atan2(d.x, d.z) });
          c.worker.setIK('L', () => vac.cableAt(s));
          c.adjust({ lean: 0.22, headPitch: 0.4 });
          c.gaze(() => vac.cableAt(s));
          while (s < 1) {
            s = Math.min(1, s + c.dt * 0.3); vac.cableLift.s = s;
            const b = ex.clone().lerp(plug, s).add(side);
            c.worker.walkTo(b.x, b.z, c.dt, 0.7, null);
            yield;
          }
          c.worker.speed = 0;
          c.tick('cable'); yield* c.wait(1.0);
          vac.cableLift = null; c.release('L'); c.gaze(null); c.pose('idle');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
        },
      },
    ],
  },

  // ───────────── 3. the PAT label ─────────────
  {
    n: 3,
    beats: [
      {
        check: 'pat', cam: onPart('pat', { dist: 1.3, az: -0.55, el: 0.22, fov: 34 }), hl: ['pat'],
        act: function* (c) {
          const p = c.vac.anchor.pat();
          const sx = p.x + 0.6, sz = p.z + 0.5;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ lean: 0.22, headPitch: 0.35 });
          yield* c.reach('R', p.clone().add(V(0.02, 0.0, 0.13)), 1.3);
          c.tick('pat'); yield* c.wait(2.4);
          c.release('R'); c.pose('idle');
        },
      },
    ],
  },

  // ───────────── 4. the dust bag ─────────────
  {
    n: 4,
    beats: [
      {
        check: 'bag', cam: onPart('bag', { dist: 1.45, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
          vac.lidT = 1; yield* c.wait(1.1);
          vac.bagLiftT = 1;
          c.worker.setIK('R', () => vac.bagCorner());
          yield* c.wait(2.8); c.tick('bag');
          vac.bagLiftT = 0; yield* c.wait(1.0);
          vac.lidT = 0; c.release('R'); c.pose('idle'); yield* c.wait(0.9);
        },
      },
    ],
  },

  // ───────────── 5. the hose, the tube, the body, the tools ─────────────
  {
    n: 5,
    beats: [
      {
        check: 'hose-body', cam: vacShot({ dist: 2.7 }), hl: ['hose', 'wand', 'casing', 'wheels'],
        act: function* (c) {
          const vac = c.vac, base = vac.root.position.clone();
          const hm = vac.hoseMid.clone();
          yield* c.walk(hm.x + 0.4, hm.z - 0.8, { face: toward(hm.x + 0.4, hm.z - 0.8, hm.x, hm.z) });
          c.adjust({ crouch: 0.2, lean: 0.25, headPitch: 0.35 });
          const pts = () => [vac.inlet(V(0, 0, 0)), vac.hoseMid.clone(), vac.handle(V(0, 0, 0))];
          let s = 0.2; c.worker.setIK('R', () => along(pts(), s).add(V(0, 0.03, 0)));
          c.gaze(() => along(pts(), s));
          while (s < 0.85) { s += c.dt * 0.22; yield; }
          c.tick('hose'); c.tick('wand'); yield* c.wait(0.5);
          // then the body: roll the machine to and fro to see that the wheels turn
          const fwd = V(Math.sin(vac.root.rotation.y), 0, Math.cos(vac.root.rotation.y));
          const sx = base.x + 0.65, sz = base.z - 0.55;
          c.gaze(null); yield* c.walk(sx, sz, { face: toward(sx, sz, base.x, base.z) });
          c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
          c.worker.setIK('R', () => vac.anchor.casing().add(V(0.12, 0, 0.0)));
          yield* c.tween(3.2, (k) => { vac.root.position.copy(base).addScaledVector(fwd, 0.4 * Math.sin(k * Math.PI * 2)); });
          c.tick('casing'); c.tick('wheels'); yield* c.wait(0.7);
          c.release('R'); c.pose('idle');
        },
      },
      {
        check: 'tools', cam: onPart('tools', { dist: 1.5, az: 0.55, el: 0.25, fov: 34 }), hl: ['tools'],
        act: function* (c) {
          const vac = c.vac;
          c.adjust({ lean: 0.25, crouch: 0.25, headPitch: 0.35 });
          c.worker.setIK('R', () => vac.anchor.tools().add(V(0.04, 0.03, 0.02)));
          c.gaze(() => vac.anchor.tools());
          yield* c.wait(3.0); c.tick('tools'); yield* c.wait(0.8);
          c.release('R'); c.gaze(null); c.pose('idle');
        },
      },
    ],
  },

  // ───────────── 6. the connection ─────────────
  {
    n: 6,
    beats: [
      {
        check: 'socket-off', cam: 'hallSocket', hl: ['socket'],
        act: function* (c) {
          yield* c.walk(SOCKET_STAND[0], SOCKET_STAND[1], { face: Math.PI });
          c.adjust({ crouch: 0.55, lean: 0.3, headPitch: 0.3 });
          yield* c.reach('R', V(3.0, 0.42, -2.55), 1.2);
          c.gaze(V(3.0, 0.35, -2.74)); yield* c.wait(1.2);
          c.tick('socket'); yield* c.wait(1.0);
          c.release('R'); c.gaze(null); c.pose('idle');
        },
      },
      {
        check: 'plug-pins', cam: orbit((w) => w.worker.handPos('R', V(0, 0, 0)), { dist: 1.1, az: 0.6, el: 0.2, fov: 30 }), hl: ['plug'],
        act: function* (c) {
          const pe = V(PLUG_END[0], 0, PLUG_END[1]);
          c.cam(SHOTS.hallWide);
          yield* c.walk(pe.x - 0.4, pe.z + 0.6, { face: toward(pe.x - 0.4, pe.z + 0.6, pe.x, pe.z) });
          c.adjust({ crouch: 0.6, lean: 0.3 });
          yield* c.reach('R', pe.clone().add(V(0, 0.05, 0)), 0.9);
          c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
          // hold it up to look at
          c.cam(orbit((w) => w.worker.handPos('R', V(0, 0, 0)), { dist: 1.0, az: 0.7, el: 0.15, fov: 30 }));
          c.worker.setIK('R', front(c, -0.05, 1.28, 0.34));
          c.gaze(() => c.worker.handPos('R', V(0, 0, 0)));
          yield* c.wait(1.2); c.tick('plug'); yield* c.wait(1.8);
          c.gaze(null);
        },
      },
      {
        check: 'plug-in', cam: 'hallSocket', hl: ['socket', 'plug'],
        act: function* (c) {
          c.worker.setIK('R', null);
          yield* c.walk(SOCKET_STAND[0], SOCKET_STAND[1], { face: Math.PI });
          c.adjust({ crouch: 0.55, lean: 0.3, headPitch: 0.3 });
          yield* c.reach('R', V(3.0, 0.4, -2.6), 1.3);          // the plug to the socket
          c.w.cablePlug(); c.release('R'); yield* c.wait(0.9);
          c.tick('plug');
          yield* c.reach('L', V(3.0, 0.43, -2.6), 1.0);         // then the switch on the socket
          c.w.setSocket(true); c.tick('socket'); yield* c.wait(1.2);
          c.release('L'); c.pose('idle'); yield* c.wait(0.4);
        },
      },
    ],
  },

  // ───────────── 7. test the suction ─────────────
  {
    n: 7,
    beats: [
      {
        check: 'suction', cam: vacShot({ dist: 3.0, az: 0.5 }), hl: ['switch', 'hose'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.35 });
          yield* c.reach('R', () => vac.anchor.switch().add(V(0, 0.03, 0)), 0.9);
          vac.on = true; c.tick('switch'); yield* c.wait(0.6);
          c.release('R'); c.pose('idle');
          // take the wand, and bring the floor head to a piece of paper
          const h = vac.handle(V(0, 0, 0)), hx = h.x + 0.3, hz = h.z + 0.65;
          yield* c.walk(hx, hz, { face: toward(hx, hz, h.x, h.z) });
          c.adjust({ armR: [0.5, 0.1, 0.3], lean: 0.1 });
          yield* c.reach('R', () => vac.handle(V(0, 0, 0)), 0.7);
          c.w.operate({ clean: false, d: 1.0, elev: 1.1, lat: 0.05 });
          c.pose('idle'); yield* c.wait(0.8);
          const paper = c.props.paper; paper.visible = true;
          const w = c.worker, f = w.forward();
          const spot = w.pos.clone().addScaledVector(f, 0.55).addScaledVector(w.right(), 0.05); spot.y = 0.026;
          paper.position.copy(spot); paper.rotation.set(0, 0.5, 0);
          c.cam(orbit((x) => x.vac.tool.position.clone().add(V(0, 0.1, 0)), { dist: 1.9, az: 0.5, el: 0.42, fov: 34 }));
          yield* c.tween(1.0, (k) => { c.w.op.d = 1.0 - 0.45 * k; });         // bring the head to the paper
          yield* c.wait(0.3);
          // the paper is pulled in
          const from = paper.position.clone();
          yield* c.tween(0.8, (k) => { const hp = vac.tool.position; paper.position.set(from.x + (hp.x - from.x) * k, 0.03, from.z + (hp.z - from.z) * k); paper.scale.setScalar(1 - 0.85 * k); });
          paper.visible = false; paper.scale.setScalar(1);
          c.tick('hose'); yield* c.wait(1.4);
          c.w.operate(null); yield* c.wait(1.0);
        },
      },
    ],
  },

  // ───────────── 8. switch off and unplug ─────────────
  {
    n: 8,
    beats: [
      {
        check: 'switch-off', cam: vacShot({ dist: 3.2, az: 0.3 }), hl: ['switch', 'socket', 'plug'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.35 });
          yield* c.reach('R', () => vac.anchor.switch().add(V(0, 0.03, 0)), 0.9);
          vac.on = false; c.tick('switch'); yield* c.wait(0.6);
          c.release('R'); c.pose('idle');
          // then at the socket
          c.cam('hallSocket');
          yield* c.walk(SOCKET_STAND[0], SOCKET_STAND[1], { face: Math.PI });
          c.adjust({ crouch: 0.55, lean: 0.3, headPitch: 0.3 });
          yield* c.reach('L', V(3.0, 0.43, -2.6), 1.0);
          c.w.setSocket(false); c.tick('socket'); yield* c.wait(0.9);
          c.release('L');
          yield* c.reach('R', V(3.0, 0.4, -2.6), 0.9);          // hold the plug itself
          c.w.cableHold('R'); yield* c.wait(0.4);
          c.worker.setIK('R', front(c, -0.05, 0.9, 0.3));
          yield* c.wait(1.0); c.tick('plug');
          // drop the plug end on the floor, away from the socket
          yield* c.walk(2.6, -1.0, { face: Math.PI / 2 });
          c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.5);
          c.w.cableLay(2.4, -0.7, 0.25); c.release('R');
          c.adjust({ crouch: 0, lean: 0 }); c.pose('idle'); yield* c.wait(0.4);
        },
      },
    ],
  },

  // ───────────── 9. wipe the machine ─────────────
  {
    n: 9,
    beats: [
      {
        check: 'wipe', cam: vacShot({ dist: 3.0 }),
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          c.props.cloth.visible = true;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          yield* c.walk(p.x + 0.5, p.z - 0.55, { face: Math.atan2(-0.5, 0.55) });
          c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
          const wipe = (get) => () => get().add(V(0.09 * Math.sin(c.w.time * 6), 0.02 * Math.sin(c.w.time * 12), 0.07 * Math.cos(c.w.time * 6)));
          c.hl(['casing']); c.worker.setIK('L', wipe(() => vac.anchor.casing().add(V(0, -0.05, 0.1)))); yield* c.wait(2.2); c.tick('casing');
          c.hl(['wheels']); c.adjust({ crouch: 0.55 }); c.worker.setIK('L', wipe(() => vac.anchor.wheels())); yield* c.wait(1.8); c.tick('wheels');
          c.hl(['hose']); c.adjust({ crouch: 0.3 }); c.worker.setIK('L', wipe(() => vac.hoseMid.clone())); yield* c.wait(1.6); c.tick('hose');
          c.hl(['tools']); c.adjust({ crouch: 0.2 }); c.worker.setIK('L', wipe(() => vac.anchor.tools())); yield* c.wait(1.8); c.tick('tools');
          c.noHl(); c.release('L'); c.pose('idle');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
        },
      },
    ],
  },

  // ───────────── 10. change the dust bag ─────────────
  {
    n: 10,
    beats: [
      {
        check: 'bag-change', cam: onPart('bag', { dist: 1.5, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          vac.setFill(0.75);
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
          vac.lidT = 1; yield* c.wait(1.1);
          vac.bagLiftT = 1;
          c.worker.setIK('R', () => vac.bagCorner());
          yield* c.wait(2.0);                                      // it is well over two-thirds full
          // the full bag comes out and goes into the rubbish bag
          const old = c.props.bagOld; old.visible = true;
          vac.bagShown = false;
          c.carry(old, { hand: 'R', off: [0.02, -0.12, 0.05], rot: [0, 0, 0.35] });
          c.release('R'); c.noHl(); c.cam(follow({ dist: 3.0 }));
          c.adjust({ crouch: 0, lean: 0.1 });
          const R = SPOTS.refuse;
          yield* c.walk(R.x - 0.3, R.z - 0.7, { face: toward(R.x - 0.3, R.z - 0.7, R.x, R.z) });
          c.adjust({ crouch: 0.4, lean: 0.25 }); yield* c.wait(0.6);
          c.uncarry(old); old.position.set(R.x, 0.36, R.z); old.rotation.set(0, 0, 0.3);
          yield* c.tween(0.8, (k) => { old.position.y = 0.36 - 0.25 * k; old.scale.setScalar(1 - 0.4 * k); });
          old.visible = false; old.scale.setScalar(1);
          c.adjust({ crouch: 0, lean: 0 }); c.pose('idle'); yield* c.wait(0.3);
        },
      },
      {
        check: 'bag-change', cam: onPart('bag', { dist: 1.5, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position, B = SPOTS.basket;
          const nb = c.props.bagNew; nb.visible = true; nb.position.set(B.x, 0.28, B.z); nb.rotation.set(0, 0.3, 0);
          c.cam(follow({ dist: 3.0 }));
          yield* c.walk(B.x - 0.1, B.z + 0.8, { face: Math.PI });
          c.adjust({ crouch: 0.4, lean: 0.25 }); yield* c.reach('R', V(B.x, 0.4, B.z), 0.8);
          c.carry(nb, { hand: 'R', off: [0.02, -0.12, 0.05], rot: [0, 0, 0.0] }); c.release('R');
          c.adjust({ crouch: 0, lean: 0.05 });
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: toward(sx, sz, p.x, p.z) });
          c.cam(onPart('bag', { dist: 1.5, az: -0.3, el: 0.42, fov: 34 })); c.hl(['bag']);
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
          yield* c.wait(0.6);
          c.uncarry(nb); nb.visible = false;
          vac.setFill(0); vac.bagShown = true; vac.bagLiftT = 1; yield* c.wait(0.5);
          vac.bagLiftT = 0; yield* c.wait(1.2); c.tick('bag');
          vac.lidT = 0; c.pose('idle'); yield* c.wait(1.0);
        },
      },
    ],
  },

  // ───────────── 11. check again and report ─────────────
  {
    n: 11,
    beats: [
      {
        check: 'recheck', cam: vacShot({ dist: 3.2, az: -0.2 }), hl: ['casing'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          yield* c.walk(p.x - 0.6, p.z + 0.4, { face: toward(p.x - 0.6, p.z + 0.4, p.x, p.z) });
          // look the machine over
          for (const q of [vac.anchor.casing(), vac.anchor.wheels(), vac.anchor.hose(), vac.anchor.cable()]) { c.gaze(q); yield* c.wait(1.1); }
          c.tick('casing'); c.gaze(null);
          // and, if something is wrong, tell someone
          c.props.phone.visible = true;
          c.carry(c.props.phone, { hand: 'R', off: [0.02, 0.0, 0.03], rot: [0.2, 0, 0] });
          c.worker.setIK('R', front(c, -0.1, 1.5, 0.2));
          yield* c.wait(2.6);
          c.release('R'); c.uncarry(c.props.phone); c.props.phone.visible = false; c.pose('idle');
        },
      },
    ],
  },

  // ───────────── 12. store it ─────────────
  {
    n: 12,
    beats: [
      {
        check: 'store', cam: vacShot({ dist: 3.4 }), hl: [],
        act: function* (c) {
          const vac = c.vac, from = vac.root.position.clone(), to = V(HALL.bay[0], 0, HALL.bay[1]);
          c.w.cableCoil();
          yield* c.walk(from.x + 0.3, from.z + 0.9, { face: Math.PI });
          c.cam(orbit((w) => w.vac.root.position.clone().add(V(0, 0.4, 0)), { dist: 3.8, az: 0.5, el: 0.4, fov: 40 }));
          const startYaw = vac.root.rotation.y;
          let k = 0;
          while (k < 1) {
            k = Math.min(1, k + c.dt / 5.5);
            vac.root.position.lerpVectors(from, to, k * k * (3 - 2 * k));
            vac.root.rotation.y = startYaw + (Math.PI / 2 - startYaw) * Math.min(1, k * 1.6);
            const wp = vac.root.position;
            c.worker.walkTo(wp.x - 0.4, wp.z + 0.85, c.dt, 1.0, null);
            yield;
          }
          c.worker.speed = 0;
          c.cam('hallBay'); c.hl(['bay']);
          yield* c.wait(2.0);
          yield* c.walk(3.2, 2.2, { face: Math.PI / 2 + 0.6 });
        },
      },
    ],
  },
];

if (STEPS.length !== INSTR_TEXT.length || STEPS.length !== INSTR_CHECKS.length) throw new Error('the Instructions steps, texts and checks do not match');

// Each step gets its title, the words of its beats and the phase it belongs to.
export const INSTRUCTIONS = STEPS.map((s, i) => {
  const t = INSTR_TEXT[i];
  if (s.beats.length !== t.beats.length) throw new Error(`instruction step ${s.n} has ${s.beats.length} beats but ${t.beats.length} are narrated`);
  s.beats.forEach((b, j) => { b.say = t.beats[j]; });
  return Object.assign(s, { title: t.title, phase: INSTR_CHECKS[i].phase });
});
