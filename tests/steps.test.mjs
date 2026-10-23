// The procedure data: every SOP step once and in order, the six job-card steps all covered, and every
// part a step names exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, PARTS, STEPS, JOB_CARD } from '../src/data/steps.js';

test('steps: numbered 1 to 16 in order, each in a known phase, with a plain title', () => {
  assert.deepEqual(STEPS.map((s) => s.n), Array.from({ length: 16 }, (_, i) => i + 1));
  for (const s of STEPS) {
    assert.ok(PHASES[s.phase], `step ${s.n}: unknown phase ${s.phase}`);
    assert.ok(s.title.length > 10 && s.title.length < 140, `step ${s.n}: title length`);
  }
  const order = Object.keys(PHASES);
  const idx = STEPS.map((s) => order.indexOf(s.phase));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b), 'phases must run in order');
});

test('steps: every part named exists, and every part is used by some step', () => {
  const used = new Set();
  for (const s of STEPS) {
    for (const id of [...s.parts, ...(s.checks || []).flatMap((c) => c.parts)]) {
      assert.ok(PARTS[id], `step ${s.n}: unknown part ${id}`);
      used.add(id);
    }
  }
  for (const id of Object.keys(PARTS)) assert.ok(used.has(id), `part ${id} is shown by no step`);
});

test('job card: all six steps are covered by the procedure, and check ids are unique', () => {
  assert.deepEqual(JOB_CARD.map((c) => c.n), [1, 2, 3, 4, 5, 6]);
  const covered = new Set(STEPS.flatMap((s) => [s.card, ...(s.checks || []).map((c) => c.card)]).filter(Boolean));
  for (const c of JOB_CARD) assert.ok(covered.has(c.n), `job-card step ${c.n} is in no step`);
  const ids = STEPS.flatMap((s) => (s.checks || []).map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length, 'check ids must be unique');
});
