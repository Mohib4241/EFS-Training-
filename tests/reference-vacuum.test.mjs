import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Vacuum } from '../src/scene/vacuum.js';
import { makeMaterials } from '../src/scene/mat.js';

test('video-reference vacuum stays low, rolls on large wheels, and exposes its fitted bag', () => {
  const vacuum = new Vacuum(makeMaterials());
  vacuum.update(1 / 30, true);
  const box = new THREE.Box3().setFromObject(vacuum.parts.casing), size = box.getSize(new THREE.Vector3());
  assert.ok(size.z > .55 && size.y < .34, 'the exterior must be a low oval canister rather than an upright drum');
  const wheel = new THREE.Box3().setFromObject(vacuum.wheelMeshes[0]);
  assert.ok(wheel.getSize(new THREE.Vector3()).y > .21);
  assert.equal(vacuum.cableMat.color.getHex(), 0xdac642);
  assert.ok(vacuum.inlet().y > .27, 'hose inlet is on the upper shell');
  const from = vacuum.wheelMeshes[0].rotation.x;
  vacuum.root.position.z += .22; vacuum.update(1 / 30, true);
  assert.ok(Math.abs(vacuum.wheelMeshes[0].rotation.x - from - 2) < .001, 'wheel rotation follows its actual radius');
  vacuum.lidT = 1; vacuum.bagLiftT = 1; vacuum.update(1 / 30, true);
  assert.equal(vacuum.bag.visible, true);
  assert.ok(vacuum.bagCorner().y > .35, 'the hand follows the raised bag corner');
  assert.ok(vacuum.lidPivot.rotation.x < -1.5);
  const transform = new THREE.Matrix4();
  for (let i = 0; i < vacuum.hoseRibs.count; i++) {
    vacuum.hoseRibs.getMatrixAt(i, transform);
    assert.ok(transform.elements.every(Number.isFinite), 'hose rib transforms remain finite when the model moves');
  }
});
