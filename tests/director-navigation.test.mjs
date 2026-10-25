import test from 'node:test';
import assert from 'node:assert/strict';
import { Director } from '../src/director.js';

// Exercise the actual playback state machine without constructing or rendering a 3D room.
function lesson() {
  const world = {
    actions: [], worker: { speed: 0 },
    reset() { this.actions = []; }, update() {}, clearHighlight() {},
  };
  const steps = [0, 1, 2].map((i) => ({
    n: i + 1,
    beats: [{
      say: { en: 'Check the equipment before starting the training exercise.' },
      * act(c) { c.w.actions.push(i); yield; },
    }],
  }));
  return new Director({ world, steps, narrator: { stop() {}, speed: 1 }, silent: true });
}

function until(director, condition) {
  for (let i = 0; i < 500 && !condition(); i++) director.update(0.1);
  assert.ok(condition(), 'playback did not reach the expected state');
}

test('jumping during a chapter transition plays the selected chapter, including the final one', () => {
  for (const target of [1, 2]) {
    const d = lesson(); d.goto(0);
    until(d, () => d.between);
    d.goto(target);
    const before = d.world.actions.length;
    d.update(0.1);
    assert.equal(d.stepIdx, target);
    assert.deepEqual(d.world.actions.slice(before), [target], 'the selected chapter starts immediately');
    until(d, () => d.ended);
    assert.equal(d.stepIdx, 2, 'playback must stop at the final chapter');
  }
});

test('replaying an ended lesson and resuming a paused jump both start the requested chapter', () => {
  const d = lesson(); d.goto(2);
  until(d, () => d.ended);
  d.play(); d.update(0.1);
  assert.equal(d.stepIdx, 0);
  assert.deepEqual(d.world.actions, [0], 'replay includes the first chapter');

  until(d, () => d.between);
  d.goto(1, { play: false });
  const before = d.world.actions.length;
  d.update(2);
  assert.equal(d.world.actions.length, before, 'a paused jump must not run its action');
  d.play(); d.update(0.1);
  assert.deepEqual(d.world.actions.slice(before), [1], 'resume starts the chapter selected while paused');
});
