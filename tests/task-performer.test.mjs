import test from 'node:test';
import './human-setup.mjs';
import assert from 'node:assert/strict';
import { Worker } from '../src/scene/worker.js';
import { TaskPerformer } from '../src/scene/task-performer.js';
import { LabModel } from '../src/scene/lab-models.js';
import { makeMaterials } from '../src/scene/mat.js';
import { SIMULATIONS } from '../src/data/simulations.js';

test('demonstrations keep moving IK targets stable and release both hands when interrupted', () => {
  const materials = makeMaterials();
  const worker = new Worker(materials);
  const screen = { worker, def: SIMULATIONS.vacuum, model: new LabModel('vacuum', materials),
    presenter: { stop() {} }, sign: {}, setTaskStatus() {} };
  const performer = new TaskPerformer(screen);
  performer.play(3); // open lid with both hands
  for (let i = 0; i < 900 && performer.phase !== 'perform'; i++) {
    performer.update(1/60); screen.model.update(1/60, i/60); worker.update(1/60);
  }
  assert.equal(performer.phase, 'perform');
  const right = worker.ik.R, left = worker.ik.L;
  assert.ok(right && left);
  const before = right.clone();
  for (let i = 0; i < 30; i++) {
    screen.model.update(1/60, i/60); performer.update(1/60); worker.update(1/60);
    assert.equal(worker.ik.R, right); assert.equal(worker.ik.L, left);
  }
  assert.ok(right.distanceTo(before) > 0, 'the hand follows the opening lid');
  performer.stop();
  assert.equal(worker.ik.R, null); assert.equal(worker.ik.L, null);
  assert.equal(worker.gripT.R, .22); assert.equal(worker.gripT.L, .22);
  assert.equal(worker.gaze, null); assert.equal(performer.running, false);
});
