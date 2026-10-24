// Lip-sync: text becomes mouth shapes (Latin and Devanagari), and the mouth follows the speech.
import test from 'node:test';
import assert from 'node:assert/strict';
import { visemes, LipSync, SHAPES } from '../src/lipsync.js';

const shapes = (t) => visemes(t).map((e) => e.v);

test('visemes: English vowels give open, wide and round shapes; m, b and p close the lips; f and v touch the teeth', () => {
  assert.deepEqual(shapes('Hello'), ['ee', 'oo']);
  assert.deepEqual(shapes('map'), ['closed', 'aa', 'closed']);
  assert.ok(shapes('five').includes('fv'));
  assert.deepEqual(shapes('see'), ['ii'], 'a run of vowels is one syllable');
  assert.deepEqual(shapes('moon'), ['closed', 'uu', 'nasal']);
  assert.deepEqual(shapes('a b'), ['aa', 'rest', 'closed']);
});

test('visemes: Hindi and Nepali read vowel signs, the built-in "a", closed lips and the silent virama', () => {
  assert.deepEqual(shapes('खाना'), ['aa', 'aa']);
  assert.deepEqual(shapes('मैं'), ['closed', 'ee', 'nasal']);
  assert.deepEqual(shapes('स्कूल'), ['uu', 'a'], 'the virama joins the consonants: no vowel between स and क');
  assert.deepEqual(shapes('आप'), ['aa', 'closed', 'a']);
  assert.deepEqual(shapes('ओ'), ['oo']);
  assert.deepEqual(shapes('हाँ।'), ['aa', 'nasal', 'rest']);
  for (const e of visemes('नमस्ते, आपका स्वागत है।')) assert.ok(SHAPES[e.v], `unknown shape ${e.v}`);
});

test('visemes: every shape points at characters inside the text, in order', () => {
  for (const t of ['Welcome to soft services training.', 'धूल खींचने वाली मशीन को देखें।', 'तपाईंलाई स्वागत छ।']) {
    let last = -1;
    for (const e of visemes(t)) { assert.ok(e.i >= 0 && e.j <= t.length && e.j > e.i && e.i >= last, `${t}: ${JSON.stringify(e)}`); last = e.i; }
  }
});

test('lipsync: the mouth opens and closes while the text is spoken, and is at rest when not', () => {
  const lip = new LipSync();
  assert.equal(lip.update(0.016).talking, false);
  lip.begin('Hello, welcome to the training', 13);
  let max = 0, min = 1, wide = 0;
  for (let t = 0; t < 2; t += 1 / 60) { const m = lip.update(1 / 60); max = Math.max(max, m.open); min = Math.min(min, m.open); wide = Math.max(wide, m.wide); assert.ok(m.open >= 0 && m.open <= 1.2); assert.equal(m.talking, true); }
  assert.ok(max > 0.5, `never opens (${max})`); assert.ok(min < 0.25, `never closes (${min})`); assert.ok(wide > 0.5);
  lip.end(); const r = lip.update(0.016);
  assert.equal(r.talking, false); assert.ok(Math.abs(r.open - SHAPES.rest.open) < 1e-9);
});

test('lipsync: a word boundary from the voice moves the mouth to that word and slows it to the voice', () => {
  const lip = new LipSync();
  lip.begin('one two three four', 13);
  lip.boundary(8, 1000); assert.equal(lip.pos, 8); assert.equal(lip.hasBoundary, true);
  for (let i = 0; i < 120; i++) lip.update(1 / 60);       // two seconds with no further word: it waits at the end of the word
  assert.ok(lip.pos <= 'one two three'.length + 0.4, `ran on past the word (${lip.pos})`);
  lip.boundary(14, 1600);                                   // 6 characters in 0.6 s: about 10 per second
  assert.ok(lip.cps < 13 && lip.cps > 9, `speed not learnt (${lip.cps})`);
  lip.boundary(-1); lip.boundary(NaN);                      // junk is ignored
  assert.equal(lip.pos, 14);
});

test('lipsync: without boundary events it runs by the clock and ends at the end of the text', () => {
  const lip = new LipSync(); lip.begin('abc', 13);
  for (let i = 0; i < 600; i++) lip.update(1 / 60);
  assert.ok(lip.pos <= 3);
});
