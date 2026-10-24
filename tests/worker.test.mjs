// The worker and the vacuum: a hand really reaches the point it is sent to, walking arrives, the tool
// follows the worker's hands, and the cable follows the machine.
import test from 'node:test';
import './human-setup.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Worker } from '../src/scene/worker.js';
import { makeMaterials } from '../src/scene/mat.js';
import { World } from '../src/scene/world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

test('a hand reaches a point within arm\'s length', () => {
  const w = new Worker(makeMaterials()); w.place(0, 0, 0); w.update(1 / 30, true);
  for (const [hand, p] of [['R', V(-0.15, 1.2, 0.35)], ['L', V(0.2, 1.1, 0.4)], ['R', V(-0.3, 1.0, 0.3)]]) {
    w.setIK(hand, p); for (let i = 0; i < 40; i++) w.update(1 / 30);
    const at = w.handPos(hand);
    assert.ok(at.distanceTo(p) < 0.1, `${hand} hand is ${at.distanceTo(p).toFixed(3)} m from the target`);
    w.setIK(hand, null);
  }
});

test('a point out of reach is approached, not overshot: the body leans towards it and the arm stays whole', () => {
  const w = new Worker(makeMaterials()); w.place(0, 0, 0); w.update(1 / 30, true);
  const far = V(0, 1.4, 2.0), before = w.handPos('R').distanceTo(far);
  w.setIK('R', far); for (let i = 0; i < 60; i++) w.update(1 / 30);
  const shoulder = w.arms.R.sh.getWorldPosition(V(0, 0, 0)), d = w.handPos('R').distanceTo(shoulder);
  assert.ok(d < 0.66, `the hand is ${d.toFixed(2)} m from the shoulder`);
  assert.ok(w.handPos('R').distanceTo(far) < before - 0.5, 'the hand did not go towards the point');
  assert.ok(w.rig.W.chest.q.angleTo(new THREE.Quaternion()) > 0.1, 'the body does not lean towards the point');
});

test('walking arrives, and turns to face the way it goes', () => {
  const w = new Worker(makeMaterials()); w.place(0, 0, 0);
  let n = 0; while (!w.walkTo(2, 1.5, 1 / 30, 1.15) && n++ < 600);
  assert.ok(n < 600, 'never arrived'); assert.ok(Math.hypot(w.pos.x - 2, w.pos.z - 1.5) < 0.05);
  assert.ok(Math.abs(Math.atan2(Math.sin(w.heading - Math.atan2(2, 1.5)), Math.cos(w.heading - Math.atan2(2, 1.5)))) < 0.2);
});

test('the feet stay on the floor when crouching', () => {
  const w = new Worker(makeMaterials()); w.place(0, 0, 0);
  for (const c of [0, 0.5, 1]) {
    w.setPose({ crouch: c }); for (let i = 0; i < 60; i++) w.update(1 / 30);
    let low = Infinity; w.root.updateMatrixWorld(true);
    w.root.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); low = Math.min(low, b.min.y); } });
    assert.ok(low > -0.06 && low < 0.1, `crouch ${c}: the lowest point is at ${low.toFixed(3)} m`);
  }
});

test('the wand follows the worker, the machine is pulled behind, and the cable trails back to the socket', () => {
  const world = new World({}); world.worker.place(1.0, 1.0, 0); world.update(1 / 30, { snap: true });
  world.vac.root.position.set(0.9, 0, 0.3); world.cablePlug();
  world.operate({ clean: false, d: 0.85, elev: 1.15 });
  for (let i = 0; i < 90; i++) world.update(1 / 30);
  const head = world.vac.tool.position, w = world.worker;
  assert.ok(head.distanceTo(w.pos.clone().add(w.forward().multiplyScalar(0.85)).setY(0)) < 0.15, 'the head is ahead of the worker');
  // the worker walks away; the machine must follow within the length of the hose
  for (let i = 0; i < 240; i++) { w.walkTo(-2, 2.5, 1 / 30, 1.1); world.update(1 / 30); }
  const gap = Math.hypot(world.vac.root.position.x - world.vac.tool.position.x, world.vac.root.position.z - world.vac.tool.position.z);
  assert.ok(gap < 1.6, `the machine is ${gap.toFixed(2)} m from the head`);
  assert.ok(world.trail.length >= 4, 'the cable lays a trail as the machine moves');
});

test('while cleaning, dirt under the head goes and stripes are left; nothing is cleaned with the machine off', () => {
  const world = new World({}); world.worker.place(3.0, 0.0, 0); world.update(1 / 30, { snap: true });
  world.operate({ clean: true, d: 0.85 }); world.vac.on = false;
  const before = world.dirt;
  for (let i = 0; i < 60; i++) world.update(1 / 30);
  assert.equal(world.dirt, before, 'dirt went with the machine off');
  world.vac.on = true;
  for (let i = 0; i < 90; i++) { world.worker.walkTo(3.2, 1.5, 1 / 30, 0.9); world.update(1 / 30); }
  assert.ok(world.dirt < before, 'no dirt was cleaned');
});
