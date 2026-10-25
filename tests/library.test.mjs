import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findSteps, SOP_PAGES, SOP_SOURCES } from '../src/screens/library.js';

test('SOP library searches checks as well as titles and combines phase filters', () => {
  assert.equal(findSteps().length, 16);
  assert.deepEqual(findSteps('WATERPROOF').map((s) => s.n), [3]);
  assert.deepEqual(findSteps('bag corner').map((s) => s.n), [5]);
  assert.deepEqual(findSteps('cable', 'method').map((s) => s.n), [10, 12]);
  assert.equal(findSteps('no-such-procedure').length, 0);
  assert.equal(findSteps('', 'storage').length, 4);
});

test('all source pages resolve to the supplied PDF inventory', () => {
  assert.equal(Object.keys(SOP_PAGES).length, 16);
  assert.deepEqual(SOP_PAGES[5], [1, 2]);
  assert.deepEqual(SOP_PAGES[12], [2, 3]);
  assert.ok(Object.values(SOP_PAGES).flat().every((page) => page >= 1 && page <= 3));
  for (const source of SOP_SOURCES) {
    const bytes = fs.readFileSync(new URL(`../src/${source.url}`, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  }
});
