// Steps 13 to 16: clean and store the equipment, take down the warning signs, take off protective
// equipment and wash your hands, leave the store tidy and secure.
import { SHOTS, orbit, onPart, fixed, onWorker } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { FACE } from '../scene/character.js';
import { V, takeTool, putDownTool, removeGloves, washHands } from './moves.js';

const vacShot = (o = {}) => orbit((w) => w.vac.root.position.clone().add(V(0.4, 0.3, 0)), { dist: 3.0, az: 0.1, el: 0.4, fov: 38, ...o });
const facing = (o = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 1.2, 0)), { dist: 2.9, az: -0.4, el: 0.12, fov: 36, ...o });

export const STEPS_13_16 = [
  {
    n: 13,
    
    beats: [
      {
        check: 'clean', cam: vacShot(),
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          yield* c.walk(p.x + 0.5, p.z - 0.55, { face: Math.atan2(-0.5, 0.55) });
          c.adjust({ lean: 0.3, crouch: 0.2, headPitch: 0.3 });
          const wipe = (get) => () => get().add(V(0.09 * Math.sin(c.w.time * 6), 0.02 * Math.sin(c.w.time * 12), 0.07 * Math.cos(c.w.time * 6)));
          c.hl(['casing']); c.worker.setIK('L', wipe(() => vac.anchor.casing().add(V(0, -0.05, 0.1)))); yield* c.wait(2.4);
          c.hl(['wheels']); c.adjust({ crouch: 0.55 }); c.worker.setIK('L', wipe(() => vac.anchor.wheels())); yield* c.wait(2.0);
          c.hl(['tools']); c.adjust({ crouch: 0.2 }); c.worker.setIK('L', wipe(() => vac.anchor.tools())); yield* c.wait(2.0);
          c.noHl(); c.release('L'); c.pose('idle');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
        },
      },
      {
        check: 'bag-change', cam: onPart('bag', { dist: 1.5, az: -0.3, el: 0.42, fov: 34 }), hl: ['bag'],
        act: function* (c) {
          const vac = c.vac, p = vac.root.position;
          vac.setFill(0.75);
          const sx = p.x + 0.5, sz = p.z - 0.55;
          yield* c.walk(sx, sz, { face: Math.atan2(p.x - sx, p.z - sz) });
          c.adjust({ crouch: 0.3, lean: 0.3, headPitch: 0.3 });
          vac.lidT = 1; yield* c.wait(1.1);
          vac.bagLiftT = 1;
          c.worker.setIK('R', () => vac.bagBody.localToWorld(V(0.13, 0.17, 0.04)));
          yield* c.wait(2.4);                                    // it is well over two-thirds full
          vac.bagShown = false; yield* c.wait(1.0);              // the full bag goes into the refuse bag
          vac.setFill(0); vac.bagShown = true; vac.bagLiftT = 0; // a new bag goes in
          yield* c.wait(1.6);
          vac.lidT = 0; c.release('R'); c.pose('idle'); yield* c.wait(0.8);
        },
      },
      {
        check: 'store', cam: 'store',
        act: function* (c) {
          const vac = c.vac, from = vac.root.position.clone(), to = V(-3.35, 0, -2.62);
          c.w.cableCoil();
          // go to the machine, then wheel it to the store
          yield* c.walk(from.x + 0.3, from.z + 0.9, { face: Math.PI });
          c.w.setAnim('store', 1);
          c.cam(orbit((w) => w.vac.root.position.clone().add(V(0, 0.4, 0)), { dist: 3.6, az: 0.5, el: 0.4, fov: 40 }));
          const startYaw = vac.root.rotation.y;
          let k = 0;
          while (k < 1) {
            k = Math.min(1, k + c.dt / 5.5);
            vac.root.position.lerpVectors(from, to, k * k * (3 - 2 * k));
            vac.root.rotation.y = startYaw + (0 - startYaw) * Math.min(1, k * 1.6);
            const w = vac.root.position;
            c.worker.walkTo(w.x + 0.35, w.z + 0.85, c.dt, 1.0, null);
            yield;
          }
          c.worker.speed = 0;
          c.cam('store'); yield* c.wait(1.6);
          yield* c.walk(-2.5, -1.2, { face: Math.PI });
        },
      },
    ],
  },
  {
    n: 14,
    
    beats: [
      {
        check: 'signs-down', cam: 'sign',
        act: function* (c) {
          const sign = c.props.sign;
          c.carry(c.props.cloth, { hand: 'L', off: [0, -0.02, 0], rot: [0, 0, 0] });
          yield* c.walk(2.75, 1.15, { face: 0, speed: 1.2 });
          // wipe it with the cloth
          c.adjust({ lean: 0.2, headPitch: 0.3 });
          c.worker.setIK('L', () => V(2.75 + 0.1 * Math.sin(c.w.time * 7), 0.4 + 0.05 * Math.sin(c.w.time * 9), 1.62));
          c.hl(['sign']); yield* c.wait(2.6); c.noHl(); c.release('L');
          c.uncarry(c.props.cloth); c.props.cloth.visible = false;
          // pick it up and take it to the store
          c.adjust({ crouch: 0.7, lean: 0.2 }); yield* c.reach('R', V(2.75, 0.5, 1.65), 0.8);
          c.carry(sign, { hand: 'R', off: [0, -0.62, 0.02], rot: [0, Math.PI / 2, 0] }); c.release('R');
          c.adjust({ crouch: 0, lean: 0 }); c.pose('idle');
          c.cam(orbit((w) => w.worker.pos.clone().add(V(0, 0.8, 0)), { dist: 4.2, az: 0.5, el: 0.35, fov: 40 }));
          yield* c.walk(-2.7, -1.3, { speed: 1.25 });
          yield* c.walk(-2.9, -1.9, { face: Math.PI, speed: 1.0 });
          c.cam('store');
          c.adjust({ crouch: 0.7, lean: 0.2 }); yield* c.wait(0.9);
          c.drop(sign, -2.95, 0.1, -2.55, 0);
          c.adjust({ crouch: 0, lean: 0 }); yield* c.wait(0.8);
        },
      },
    ],
  },
  {
    n: 15,
    
    beats: [
      {
        check: 'ppe-off', cam: facing({ dist: 2.6 }),
        act: function* (c) {
          yield* c.walk(-1.4, 0.2, { face: 0 });
          yield* removeGloves(c);
          const temple = () => c.worker.head.localToWorld(V(-0.07, FACE.eyeY, 0.12));
          yield* c.reach('R', temple, 0.7);
          c.worker.setPPE('glasses', false); c.release('R');
          c.pose('idle'); yield* c.wait(1.0);
        },
      },
      {
        check: 'ppe-off', cam: 'basin',
        act: function* (c) {
          yield* c.walk(PLACES.basin[0], PLACES.basin[1] - 0.2, { face: Math.PI });
          yield* washHands(c);
        },
      },
    ],
  },
  {
    n: 16,
    
    beats: [
      {
        check: 'secure', cam: 'store',
        act: function* (c) {
          yield* c.walk(PLACES.store[0] + 0.3, PLACES.store[1], { face: Math.PI });
          c.gaze(V(-3.3, 1.0, -2.6)); yield* c.wait(1.6);
          c.worker.setIK('R', V(-3.1, 1.1, -2.35)); c.w.setAnim('store', 0); yield* c.wait(1.6);
          c.release('R'); c.gaze(null);
        },
      },
      {
        check: 'secure', cam: 'door',
        act: function* (c) {
          yield* c.walk(3.45, 0.75, { face: Math.PI / 2, speed: 1.2 });
          c.worker.setIK('R', V(3.9, 1.25, 0.75)); yield* c.wait(0.9);
          c.room.lightSwitch.rocker.rotation.x = 0.4; c.w.setLights(false); yield* c.wait(1.2);
          c.release('R'); c.pose('idle');
          yield* c.walk(3.7, -0.3, { speed: 1.0 });
          yield* c.walk(5.3, -0.3, { face: Math.PI / 2, speed: 1.0 });
          c.pose('wave'); yield* c.wait(1.2);
          c.w.setAnim('door', 0); c.pose('idle'); yield* c.wait(1.6);
        },
      },
    ],
  },
];
