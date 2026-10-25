import test from 'node:test';
import assert from 'node:assert/strict';
import { Head, FACE } from '../src/scene/character.js';
import { makeMaterials } from '../src/scene/mat.js';

test('reconstructed face blinks over the iris and keeps speech lips closed for closed visemes', () => {
  const head = new Head(makeMaterials());
  const eye = head.eyes[0].eye.geometry;
  const opening = () => {
    const p = eye.attributes.position; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); }
    return hi - lo;
  };
  const open = opening();
  head._drawEyes(1);
  assert.ok(opening() < open * .03, 'a blink should cover the pupil rather than flatten or rotate it');
  assert.equal(head.eyes[0].eye.visible, false);
  head._drawEyes(0);
  assert.ok(Math.abs(opening() - open) < 1e-6);
  head.setSmile(1); head.setMouth({ open: 0, wide: .7, round: 0 });
  head.update(1 / 60, { talking: true, snap: true });
  assert.equal(head.mTeeth.visible, false, 'a closed speech shape must not inherit the idle smile gap');
  head.setMouth({ open: .8, wide: .7, round: 0 });
  head.update(1 / 60, { talking: true, snap: true });
  assert.ok(head.skin.morphTargetInfluences[0] > .7);
  assert.equal(head.mTeeth.visible, true);
  for (const [yaw, pitch] of [[-.35, -.25], [.35, .25], [0, 0]]) {
    head.look(yaw, pitch); head.update(1 / 30);
    for (const e of head.eyes) for (const mesh of [e.eye, e.lid, e.rim]) {
      for (const v of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
    }
  }
  assert.ok(head.zAt(0, FACE.noseY) > head.zAt(.045, FACE.noseY), 'the nose must have real sculpted depth');
});
