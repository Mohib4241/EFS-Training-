// Steps 1 to 4 of the procedure: arrive and make the area safe, know the paperwork, wash your hands,
// put on protective equipment. Each beat is one narrated sentence or two, with the action beside it.
import { SHOTS, orbit } from '../scene/shots.js';
import { PLACES } from '../scene/room.js';
import { V } from './moves.js';

// a point in front of the worker's chest, for hands that show or hold something
const front = (c, side = 0, up = 1.25, fwd = 0.38) => () => {
  const w = c.worker, f = w.forward(), l = V(f.z, 0, -f.x);
  return w.pos.clone().addScaledVector(f, fwd).addScaledVector(l, side).add(V(0, up, 0));
};
const facing = (extra = {}) => orbit((w) => w.worker.pos.clone().add(V(0, 1.0, 0)), { dist: 3.7, az: -0.4, el: 0.14, fov: 38, ...extra });

export const STEPS_1_4 = [
  {
    n: 1,
    
    beats: [
      {
        check: 'risk', cam: 'door',
        act: function* (c) {
          c.pose('idle');
          yield* c.walk(3.7, -0.3);
          yield* c.walk(2.6, 0.7, { face: 0 });
          for (const p of [[1.0, 1.3, 2.6], [0.2, 0.3, -1.2], [3.2, 0.4, 1.5]]) { c.gaze(V(...p)); yield* c.wait(1.4); }
          c.gaze(null);
        },
      },
      {
        check: 'sign', cam: 'sign',
        act: function* (c) {
          yield* c.walk(2.75, 1.2, { face: 0 });
          c.adjust({ crouch: 0.75, lean: 0.12 }); yield* c.wait(0.9);
          c.drop(c.props.sign, 2.75, 0, 1.7, 0);
          c.adjust({ crouch: 0, lean: 0 }); yield* c.wait(0.8);
          c.hl(['sign']); yield* c.wait(1.2);
          yield* c.walk(2.2, 0.4, { face: 0 });
        },
      },
    ],
  },
  {
    n: 2,
    
    beats: [
      {
        check: 'docs', cam: SHOTS.room,
        act: function* (c) {
          yield* c.walk(-0.3, -1.55, { face: Math.PI });
          const clip = c.props.clipboard; c.drop(clip, -0.1, 0.77, -2.5, 0); clip.rotation.set(-Math.PI / 2, 0, 0);
          c.adjust({ armL: [0.95, 0.1, 0.5], lean: 0.12 });
          yield* c.reach('L', V(-0.1, 0.87, -2.3), 0.9);
          c.release('L');
          c.carry(clip, { hand: 'L', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.cam(facing());
          yield* c.walk(0.4, -0.2, { face: 0 });
          c.pose({ headPitch: 0.1 });
          c.worker.setIK('L', front(c, 0.3, 1.1, 0.3)); c.worker.setIK('R', front(c, -0.3, 1.32, 0.3));
          const d = c.props.docs[0]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
        },
      },
      {
        check: 'docs',
        act: function* (c) {
          c.props.docs[0].visible = false; c.uncarry(c.props.docs[0]);
          const d = c.props.docs[1]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
        },
      },
      {
        check: 'docs',
        act: function* (c) {
          c.props.docs[1].visible = false; c.uncarry(c.props.docs[1]);
          const d = c.props.docs[2]; c.carry(d, { hand: 'R', off: [0, 0.0, 0.06], rot: [0, 0, 0] });
          c.gaze(() => d.position); yield* c.wait(2.2);
          c.gaze(null); d.visible = false; c.uncarry(d);
          const clip = c.props.clipboard; c.uncarry(clip); clip.visible = false;
          c.release('L'); c.release('R'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 3,
    
    beats: [
      {
        check: 'wash', cam: 'basin',
        act: function* (c) {
          yield* c.walk(PLACES.basin[0], PLACES.basin[1] - 0.2, { face: Math.PI });
          c.pose({ lean: 0.2, headPitch: 0.3, armR: [0.9, 0.2, 1.2], armL: [0.9, 0.2, 1.2] });
          c.w.water = true;
          const wash = (dx) => () => V(-1.7 + dx + 0.045 * Math.sin(c.w.time * 9), 1.02, -2.62 + 0.03 * Math.cos(c.w.time * 9));
          c.worker.setIK('R', wash(-0.04)); c.worker.setIK('L', wash(0.04));
          yield* c.wait(3.6);
          c.w.water = false; c.release('R'); c.release('L');
        },
      },
      {
        check: 'cuts',
        act: function* (c) {
          c.cam(facing({ dist: 3.0 }));
          yield* c.walk(-1.4, -0.4, { face: 0 });
          c.pose({ lean: 0.1, headPitch: 0.45, armR: [0.9, 0.2, 1.7], armL: [0.9, 0.2, 1.7] });
          c.worker.setIK('R', front(c, -0.08, 1.2, 0.34)); c.worker.setIK('L', front(c, 0.08, 1.2, 0.34));
          c.gaze(front(c, 0, 1.2, 0.34)); yield* c.wait(1.8);
          c.worker.setPPE('plaster', true); yield* c.wait(1.6);
          c.gaze(null); c.release('R'); c.release('L'); c.pose('idle');
        },
      },
    ],
  },
  {
    n: 4,
    
    beats: [
      {
        check: 'ppe', cam: 'ppe',
        act: function* (c) {
          c.props.ppeVest.visible = false;
          yield* c.walk(PLACES.ppe[0], PLACES.ppe[1], { face: -Math.PI / 2 });
          // look the gloves and glasses over before putting them on
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          for (const z of [0.33, 0.55]) { c.gaze(V(-3.45, 0.8, z)); yield* c.wait(1.2); }
          yield* c.reach('L', V(-3.45, 0.84, 0.33), 0.9);
          c.release('L'); c.gaze(null); c.adjust({ lean: 0, headPitch: 0 });
          yield* c.wait(0.6);
        },
      },
      {
        check: 'ppe',
        act: function* (c) {
          c.adjust({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.86, 0.33), 0.9);
          c.props.ppeGloves.visible = false; c.release('R');
          c.adjust({ lean: 0, headPitch: 0.25, armR: [0.9, 0.2, 1.6], armL: [0.9, 0.2, 1.6] }); c.worker.setPPE('gloves', true);
          yield* c.wait(1.8);
        },
      },
      {
        check: 'ppe',
        act: function* (c) {
          c.pose({ lean: 0.15, headPitch: 0.3 });
          yield* c.reach('R', V(-3.45, 0.86, 0.55), 0.9);
          c.props.ppeGlasses.visible = false; c.release('R');
          c.pose('idle'); c.worker.setPPE('glasses', true);
          c.cam(facing({ dist: 3.2, az: 0.2 }));
          yield* c.walk(-1.8, 0.4, { face: 0 });
          c.pose('wave'); yield* c.wait(1.6); c.pose('idle');
        },
      },
    ],
  },
];
