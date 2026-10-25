// Step 5: check the equipment. The longest step: colour-coded kit, circuit breaker, PAT label, cable
// (with a cloth), tidy cable, dust bag, hose and wand, casing and wheels, accessories.
// `check` ties a beat to a check in src/data/steps.js, so a test can see none is left out.
import { SHOTS, orbit, onPart } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V, along } from './moves.js';

const vacShot = (o = {}) => orbit((w) => w.vac.root.position.clone().add(V(0.5, 0.3, -0.1)), { dist: 3.2, az: 0.15, el: 0.38, fov: 38, ...o });

export const STEP_5 = {
  n: 5,
  
  beats: [
    {
      check: 'kit', cam: 'kit', hl: ['cloths'],
      act: function* (c) {
        yield* c.walk(PLACES.equip[0], PLACES.equip[1], { face: -Math.PI / 2 });
        c.adjust({ lean: 0.12, headPitch: 0.3 });
        yield* c.reach('L', V(-3.57, 0.9, 1.43), 0.9);
        c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
        c.release('L'); c.pose('idle');
        for (const z of [1.95, 2.15]) { c.gaze(V(-3.45, 0.85, z)); yield* c.wait(1.5); }
        c.gaze(null); c.tick('cloths');
      },
    },
    {
      check: 'circuit', cam: 'breaker', hl: ['breaker'],
      act: function* (c) {
        yield* c.walk(PLACES.breaker[0], PLACES.breaker[1], { face: Math.PI });
        const lever = c.room.breaker.lever;
        yield* c.reach('R', V(2.0, 1.43, -2.76), 0.8);
        yield* c.tween(0.35, (k) => { lever.rotation.z = 0.7 * k; });
        yield* c.wait(0.7);
        yield* c.tween(0.35, (k) => { lever.rotation.z = 0.7 * (1 - k); });
        c.tick('breaker'); yield* c.wait(1.0);
        c.release('R');
      },
    },
    {
      check: 'pat', cam: onPart('pat', { dist: 1.3, az: -0.55, el: 0.22, fov: 34 }), hl: ['pat'],
      act: function* (c) {
        const p = c.vac.anchor.pat();
        const sx = p.x + 0.6, sz = p.z + 0.5;
        yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
        c.adjust({ lean: 0.22, headPitch: 0.35 });
        yield* c.reach('R', p.clone().add(V(0.02, 0.0, 0.13)), 1.3);
        c.tick('pat'); yield* c.wait(1.8);
        c.release('R'); c.pose('idle');
      },
    },
    {
      check: 'cable', cam: vacShot(), hl: ['cable'],
      act: function* (c) {
        const vac = c.vac;
        // take the plug from the coil and lay the cable out on the floor
        const coil = vac.root.localToWorld(V(-0.08, 0, -0.42));
        yield* c.walk(coil.x + 0.5, coil.z - 0.5, { face: Math.atan2(-0.5, 0.5) });
        c.adjust({ crouch: 0.6, lean: 0.3 });
        yield* c.reach('R', V(coil.x, 0.06, coil.z), 0.9);
        c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
        yield* c.walk(1.0, 1.95, { face: Math.PI / 2 });
        c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.7);
        c.w.cableLay(1.3, 1.6, 0.2);
        c.adjust({ crouch: 0, lean: 0.1 }); yield* c.wait(0.6);

        // run the cloth along it, from the machine to the plug
        const plug = V(1.3, 0, 1.6), ex = vac.exit();
        const d = plug.clone().sub(ex).setY(0).normalize(), side = V(d.z, 0, -d.x).multiplyScalar(0.32);   // the far side, so the cable is between the worker and the camera
        let s = 0.1;                                       // start just past the machine, so the worker does not stand in it
        vac.cableLift = { s, h: 0.95 };
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
      },
    },
    {
      check: 'cable-lay', cam: vacShot(), hl: ['cable'],
      act: function* (c) {
        const vac = c.vac;
        c.adjust({ crouch: 0.6, lean: 0.3 });
        yield* c.reach('R', V(1.3, 0.08, 1.6), 0.9);
        c.w.cableHold('R'); c.release('R'); c.adjust({ crouch: 0, lean: 0.05 });
        yield* c.walk(-0.5, 1.6, { face: -Math.PI / 2 });
        c.adjust({ crouch: 0.6, lean: 0.3 }); yield* c.wait(0.8);
        c.w.cableCoil();
        c.adjust({ crouch: 0, lean: 0 }); c.tick('cable'); yield* c.wait(1.6);
        c.uncarry(c.props.cloth); c.props.cloth.visible = false;       // the cloth is put away
        c.pose('idle');
      },
    },
    {
      check: 'bag', cam: onPart('bag', { dist: 1.45, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
      act: function* (c) {
        const vac = c.vac, p = vac.root.position;
        const sx = p.x + 0.5, sz = p.z - 0.55;
        yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
        c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
        vac.lidT = 1; yield* c.wait(1.1);
        vac.bagLiftT = 1;
        c.worker.setIK('R', () => vac.bagCorner());
        yield* c.wait(2.6); c.tick('bag');
        vac.bagLiftT = 0; yield* c.wait(1.0);
        vac.lidT = 0; c.release('R'); c.pose('idle'); yield* c.wait(0.9);
      },
    },
    {
      check: 'hose', cam: vacShot({ dist: 2.6 }), hl: ['hose', 'wand'],
      act: function* (c) {
        const vac = c.vac;
        const hm = vac.hoseMid.clone();
        yield* c.walk(hm.x + 0.4, hm.z - 0.8, { face: Math.atan2(-0.4, 0.8) });
        c.adjust({ crouch: 0.2, lean: 0.25, headPitch: 0.35 });
        const pts = () => [vac.inlet(V(0, 0, 0)), vac.hoseMid.clone(), vac.handle(V(0, 0, 0))];
        let s = 0.2; c.worker.setIK('R', () => along(pts(), s).add(V(0, 0.03, 0)));
        c.gaze(() => along(pts(), s));
        while (s < 0.85) { s += c.dt * 0.2; yield; }
        c.tick('hose'); c.tick('wand'); yield* c.wait(0.8);
        c.release('R'); c.gaze(null); c.pose('idle');
      },
    },
    {
      check: 'casing', cam: vacShot({ dist: 2.4, az: -0.2 }), hl: ['casing', 'wheels'],
      act: function* (c) {
        const vac = c.vac, base = vac.root.position.clone();
        const fwd = V(Math.sin(vac.root.rotation.y), 0, Math.cos(vac.root.rotation.y));
        const sx = base.x + 0.65, sz = base.z - 0.55;
        yield* c.walk(sx, sz, { face: Math.atan2(base.x - sx, base.z - sz) });
        c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
        c.worker.setIK('R', () => vac.anchor.casing().add(V(0.12, 0, 0.0)));
        yield* c.tween(3.4, (k) => { vac.root.position.copy(base).addScaledVector(fwd, 0.4 * Math.sin(k * Math.PI * 2)); });
        c.tick('casing'); c.tick('wheels'); yield* c.wait(0.9);
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
        yield* c.wait(3.2); c.tick('tools'); yield* c.wait(0.8);
        c.release('R'); c.gaze(null); c.pose('idle');
      },
    },
  ],
};
