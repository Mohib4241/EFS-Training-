// The narrator's pure parts: choosing a voice, splitting text, estimating how long it takes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, rankVoices, quality, chunk, estimate, LANGS } from '../src/narrator.js';

const v = (lang, name = lang, localService = true) => ({ lang, name, localService });

test('voice: English prefers Indian, then British, then any English', () => {
  assert.equal(pickVoice([v('en-US'), v('en-GB'), v('hi-IN')], 'en').voice.lang, 'en-GB');
  assert.equal(pickVoice([v('en-US'), v('en-IN'), v('en-GB')], 'en').voice.lang, 'en-IN');
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

test('voice: a natural-sounding voice beats a Google one, which beats a basic one; a robotic one comes last', () => {
  const basic = v('hi-IN', 'Basic', false), google = v('hi-IN', 'Google हिन्दी', true), natural = v('hi-IN', 'Microsoft Swara Online (Natural)', false), robot = v('hi-IN', 'eSpeak hindi', true);
  assert.equal(pickVoice([basic, google, natural, robot], 'hi').voice, natural);
  assert.equal(pickVoice([basic, google, robot], 'hi').voice, google);
  assert.equal(pickVoice([robot, basic], 'hi').voice, basic);
  assert.ok(quality(natural) > quality(google) && quality(google) > quality(basic) && quality(basic) > quality(robot));
  const names = rankVoices([robot, basic, google, natural], 'hi').map((r) => r.voice.name);
  assert.deepEqual(names, [natural.name, google.name, basic.name, robot.name]);
});

test('voice: a voice the listener picked is used when it fits the language, and ignored when it does not', () => {
  const a = v('en-GB', 'Plain GB'), b = v('en-IN', 'Google India English'), c = v('hi-IN', 'Swara');
  assert.equal(pickVoice([a, b, c], 'en', 'Plain GB').voice, a);
  assert.equal(pickVoice([a, b, c], 'en', 'Swara').voice, b, 'a Hindi voice is not offered for English');
  assert.equal(pickVoice([a, b, c], 'en', 'Nothing called this').voice, b);
});

test('voice: a Hindi stand-in for Nepali is only offered when there is no Nepali voice', () => {
  assert.deepEqual(rankVoices([v('hi-IN'), v('ne-NP')], 'ne').map((r) => r.voice.lang), ['ne-NP']);
  assert.deepEqual(rankVoices([v('hi-IN')], 'ne').map((r) => r.approx), [true]);
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
