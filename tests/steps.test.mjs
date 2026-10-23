// The procedure data (src/data/steps.js): numbered in order, well formed, every check says where it
// came from, and the job card is only used where the procedure is silent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, PARTS, STEPS, JOB_CARD } from '../src/data/steps.js';

test('steps: numbered 1 to 16 in order, each in a known phase, phases running in order', () => {
  assert.deepEqual(STEPS.map((s) => s.n), Array.from({ length: 16 }, (_, i) => i + 1));
  for (const s of STEPS) { assert.ok(PHASES[s.phase], `step ${s.n}: unknown phase`); assert.ok(s.title.length > 10 && s.title.length < 140); }
  const order = Object.keys(PHASES), idx = STEPS.map((s) => order.indexOf(s.phase));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
});

test('steps: every check has an id, a source and text; ids are unique; parts named exist', () => {
  const ids = new Set();
  for (const s of STEPS) {
    assert.ok(s.checks.length > 0, `step ${s.n} has no checks`);
    for (const c of s.checks) {
      assert.ok(c.id && !ids.has(c.id), `check id ${c.id} missing or repeated`); ids.add(c.id);
      assert.ok(['sop', 'sop+card', 'card'].includes(c.from), `${c.id}: source ${c.from}`);
      assert.ok(c.text && c.text.length > 5);
      if (c.card) assert.ok(JOB_CARD.some((j) => j.n === c.card), `${c.id}: unknown job-card step`);
      for (const p of c.parts || []) assert.ok(PARTS[p], `${c.id}: unknown part ${p}`);
    }
    for (const p of s.parts) assert.ok(PARTS[p], `step ${s.n}: unknown part ${p}`);
  }
});

test('steps: the job card alone supplies only what the procedure leaves out', () => {
  const only = STEPS.flatMap((s) => s.checks.filter((c) => c.from === 'card'));
  assert.deepEqual(only.map((c) => c.id), ['posture']);
  for (const c of STEPS.flatMap((s) => s.checks).filter((c) => c.card && c.from !== 'card')) assert.ok(c.from === 'sop' || c.from === 'sop+card');
});
