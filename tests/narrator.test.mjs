// The narrator's pure parts: choosing a voice, splitting text, estimating how long it takes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, chunk, estimate, LANGS } from '../src/narrator.js';

const v = (lang, name = lang, localService = true) => ({ lang, name, localService });

test('voice: English prefers British, then Indian, then any English', () => {
  assert.equal(pickVoice([v('en-US'), v('en-GB'), v('hi-IN')], 'en').voice.lang, 'en-GB');
  assert.equal(pickVoice([v('en-US'), v('en-IN')], 'en').voice.lang, 'en-IN');
  assert.equal(pickVoice([v('fr-FR'), v('en-ZA')], 'en').voice.lang, 'en-ZA', 'any English voice will do');
  assert.equal(pickVoice([v('fr-FR')], 'en'), null, 'no English voice, none chosen');
  assert.equal(pickVoice([v('en_US')], 'en').voice.lang, 'en_US', 'underscores in a language tag are accepted');
});

test('voice: Hindi uses hi-IN, and Nepali uses ne-NP when there is one', () => {
  assert.equal(pickVoice([v('en-GB'), v('hi-IN')], 'hi').voice.lang, 'hi-IN');
  const ne = pickVoice([v('hi-IN'), v('ne-NP')], 'ne');
  assert.equal(ne.voice.lang, 'ne-NP'); assert.equal(ne.approx, false);
});

test('voice: with no Nepali voice a Hindi one stands in and is marked approximate; with neither there is none', () => {
  const ne = pickVoice([v('en-GB'), v('hi-IN')], 'ne');
  assert.equal(ne.voice.lang, 'hi-IN'); assert.equal(ne.approx, true);
  assert.equal(pickVoice([v('en-GB')], 'ne'), null);
  assert.equal(pickVoice([], 'hi'), null);
  assert.equal(pickVoice(null, 'hi'), null);
});

test('voice: of two matching voices, a neural or Google one that works offline wins', () => {
  const a = v('hi-IN', 'Basic', false), b = v('hi-IN', 'Google हिन्दी', true), c = v('hi-IN', 'Natural', false);
  assert.equal(pickVoice([a, c, b], 'hi').voice, b);
});

test('chunk: splits at sentence ends (full stop, question mark, danda) and keeps pieces short', () => {
  assert.deepEqual(chunk('One. Two? Three!'), ['One.', 'Two?', 'Three!']);
  assert.deepEqual(chunk('पहला वाक्य। दूसरा वाक्य।'), ['पहला वाक्य।', 'दूसरा वाक्य।']);
  const long = 'word, '.repeat(120).trim();
  for (const piece of chunk(long, 100)) assert.ok(piece.length <= 106, `piece too long: ${piece.length}`);
  assert.equal(chunk('').length, 0);
});

test('estimate: longer text takes longer, never less than a moment, and each language has a rate', () => {
  assert.ok(estimate('Hi', 'en') >= 1.2);
  assert.ok(estimate('x'.repeat(300), 'en') > estimate('x'.repeat(100), 'en'));
  assert.ok(estimate('x'.repeat(300), 'hi') > estimate('x'.repeat(300), 'en'), 'Hindi is spoken a little slower than English');
  assert.deepEqual(LANGS, ['en', 'hi', 'ne']);
});
