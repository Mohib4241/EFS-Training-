import test from 'node:test';
import assert from 'node:assert/strict';
import './human-setup.mjs';
import { World } from '../src/scene/world.js';
import { Director } from '../src/director.js';
import { TRAINING } from '../src/steps/index.js';
import * as THREE from 'three';

test('PPE fitting dresses each hand in order and clears loose props before the next step', () => {
  const world = new World({});
  const director = new Director({ world, steps: TRAINING, silent: true });
  director.goto(3);
  let leftOnly = false, fitted = false;
  const cuffGap = { L: Infinity, R: Infinity };
  for (let n = 0; n < 2400 && director.stepIdx === 3; n++) {
    director.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false });
    const w = world.worker;
    if (w.gloves.L > 0.9 && w.gloves.R < 0.1) leftOnly = true;
    if (w.gloves.L > 0.95 && w.gloves.R > 0.95) fitted = true;
    for (const side of ['L', 'R']) {
      assert.ok(Number.isFinite(w.handPos(side).length()), 'hand target must remain finite');
      assert.equal(w.armSkin[side].userData.glove.value, w.gloves[side]);
      const helper = side === 'L' ? 'R' : 'L';
      if (director.beatIdx === 1 && w.gloves[side] > 0.9 && w.ik[helper]) {
        const wrist = w.bones['hand' + side].getWorldPosition(new THREE.Vector3());
        cuffGap[side] = Math.min(cuffGap[side], w.handPos(helper).distanceTo(wrist));
      }
    }
  }
  assert.ok(leftOnly, 'the first glove must be fitted before the second');
  assert.ok(fitted, 'both gloves must be fitted before equipment work');
  for (const side of ['L', 'R']) assert.ok(cuffGap[side] < 0.065, side + ' cuff must be pulled at the wrist, gap ' + cuffGap[side]);
  for (const glove of world.props.looseGloves) {
    assert.equal(glove.visible, false);
    assert.equal(world.followers.has(glove), false);
  }
  assert.equal(world.props.ppeGlasses.visible, false);
  assert.ok(world.worker.ppe.glasses > 0.95);

  director.goto(14);
  let peeledLeft = false;
  for (let n = 0; n < 2400 && director.stepIdx === 14; n++) {
    director.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false });
    if (world.worker.gloves.L < 0.1 && world.worker.gloves.R > 0.9) peeledLeft = true;
  }
  assert.ok(peeledLeft, 'gloves must be removed separately');
  assert.ok(world.worker.gloves.L < 0.01 && world.worker.gloves.R < 0.01);
});
