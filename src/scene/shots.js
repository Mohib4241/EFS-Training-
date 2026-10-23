// Camera shots. A shot is a function of the world that returns { pos, look, fov }, so it can follow
// the worker or the vacuum. The camera in the stage eases towards it.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Look at `target` (a point or a function of the world) from `dist` away. `az` is measured from +Z towards +X. */
export function orbit(target, { dist = 5, az = 0, el = 0.3, fov = 40, lift = 0 } = {}) {
  return (w) => {
    const t = (typeof target === 'function' ? target(w) : target).clone();
    const a = typeof az === 'function' ? az(w) : az;
    const pos = t.clone().add(V(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(dist));
    return { pos, look: t.add(V(0, lift, 0)), fov };
  };
}

/** A fixed camera position and aim. */
export const fixed = (pos, look, fov = 40) => () => ({ pos: V(...pos), look: V(...look), fov });

/** Follow the worker: `az` is added to their heading (0 = from the front, PI = from behind). */
export const onWorker = ({ dist = 3.4, az = 0.5, el = 0.28, fov = 40, lift = 1.0, back = true } = {}) =>
  orbit((w) => w.worker.pos.clone().add(V(0, 0, 0)), { dist, az: (w) => w.worker.heading + (back ? Math.PI : 0) + az, el, fov, lift });

/** Frame one of the vacuum's parts. */
export const onPart = (id, { dist = 1.1, az = 0, el = 0.25, fov = 36 } = {}) =>
  orbit((w) => w.vac.anchor[id](), { dist, az, el, fov });

export const SHOTS = {
  wide: fixed([-1.2, 3.7, 7.6], [0.1, 0.8, -0.5], 41),
  room: fixed([0.6, 3.2, 6.2], [0.6, 0.7, -0.6], 40),
  door: fixed([-0.6, 2.8, 6.0], [2.8, 0.8, -0.3], 40),
  doorSide: fixed([1.2, 2.2, 3.6], [4.0, 0.9, -0.3], 36),
  basin: fixed([-0.1, 1.5, -1.8], [-1.7, 1.0, -2.45], 40),
  sign: fixed([0.2, 2.7, 5.8], [2.6, 0.4, 0.9], 40),
  ppe: fixed([-4.9, 2.3, -1.4], [-2.9, 0.95, 0.35], 40),
  kit: fixed([-4.9, 2.4, 3.9], [-2.9, 0.95, 1.7], 40),
  breaker: fixed([0.3, 1.8, -1.2], [2.0, 1.4, -2.8], 40),
  socket: fixed([2.0, 1.2, 0.2], [3.0, 0.4, -2.8], 34),
  store: fixed([-1.8, 2.0, 1.2], [-3.2, 1.0, -2.6], 40),
  finds: fixed([-2.2, 2.8, 4.6], [-0.9, 0.2, 0.2], 52),
  carpet: fixed([0.5, 3.2, 4.6], [2.2, 0.1, -0.2], 42),
  lane: fixed([1.6, 2.6, 3.6], [3.2, 0.1, -0.3], 38),
};
