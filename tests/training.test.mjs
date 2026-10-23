// The narrated training: every step of the procedure is there in order, in three languages, with the
// procedure's own figures (not the job card's where they differ), and the whole thing plays through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAINING } from '../src/steps/index.js';
import { STEPS, PARTS, POINTED, JOB_CARD } from '../src/data/steps.js';
import { PART_NAMES, UI, LANG_NAMES } from '../src/i18n.js';
import { LANGS, Narrator } from '../src/narrator.js';
import { World } from '../src/scene/world.js';
import { Director } from '../src/director.js';

const DEVANAGARI = /[ऀ-ॿ]/;

test('training: 16 steps in the order of the procedure, in the same phases', () => {
  assert.equal(TRAINING.length, 16);
  TRAINING.forEach((s, i) => { assert.equal(s.n, i + 1); assert.equal(STEPS[i].n, s.n); assert.ok(s.beats.length > 0, `step ${s.n} has no beats`); });
});

test('training: every step has a heading and every beat has narration in English, Hindi and Nepali', () => {
  for (const s of TRAINING) {
    for (const l of LANGS) assert.ok(s.title[l] && s.title[l].length > 3, `step ${s.n}: no ${l} heading`);
    s.beats.forEach((b, i) => {
      assert.equal(typeof b.act, 'function', `step ${s.n} beat ${i}: no action`);
      for (const l of LANGS) {
        const t = b.say[l];
        assert.ok(t && t.length > 25, `step ${s.n} beat ${i}: no ${l} narration`);
        assert.ok(t.length < 420, `step ${s.n} beat ${i}: ${l} narration is too long to say in one go (${t.length})`);
      }
      assert.ok(DEVANAGARI.test(b.say.hi) && DEVANAGARI.test(b.say.ne), `step ${s.n} beat ${i}: Hindi and Nepali are written in Devanagari`);
      assert.ok(!/[A-Za-z]{3,}/.test(b.say.hi.replace(/PAT/g, '')), `step ${s.n} beat ${i}: Hindi text has Latin words`);
      assert.ok(!/[A-Za-z]{3,}/.test(b.say.ne.replace(/PAT/g, '')), `step ${s.n} beat ${i}: Nepali text has Latin words`);
      assert.notEqual(b.say.hi, b.say.ne, `step ${s.n} beat ${i}: Hindi and Nepali are the same text`);
    });
  }
});

test('training: every check of the procedure is covered by a narrated beat, and every beat names a real check', () => {
  for (const s of TRAINING) {
    const checks = new Set(STEPS[s.n - 1].checks.map((c) => c.id));
    const seen = new Set(s.beats.map((b) => b.check).filter(Boolean));
    for (const id of seen) assert.ok(checks.has(id), `step ${s.n}: beat names unknown check ${id}`);
    for (const id of checks) assert.ok(seen.has(id), `step ${s.n}: check ${id} is in no beat`);
  }
});

test('procedure first, job card only where the procedure is silent', () => {
  const fromCard = STEPS.flatMap((s) => s.checks.filter((c) => c.from === 'card').map((c) => c.id));
  assert.deepEqual(fromCard, ['posture'], 'only body posture comes from the job card alone');
  // all six job-card steps are still covered
  const covered = new Set(STEPS.flatMap((s) => s.checks.map((c) => c.card)).filter(Boolean));
  for (const c of JOB_CARD) assert.ok(covered.has(c.n), `job-card step ${c.n} is not covered`);
  // the bag: the procedure says two-thirds, the job card says 70%; the narration uses the procedure's figure
  const bagText = TRAINING.flatMap((s) => s.beats).filter((b) => b.check === 'bag' || b.check === 'bag-change').map((b) => b.say.en).join(' ');
  assert.match(bagText, /two-thirds/);
  for (const s of TRAINING) for (const b of s.beats) for (const l of LANGS) assert.ok(!/70\s?%|७०/.test(b.say[l]), `step ${s.n}: the job card's 70% figure is narrated`);
});

test('parts: only the parts a step uses are pointed at, and all of them have names in three languages', () => {
  for (const s of TRAINING) {
    const spec = STEPS[s.n - 1];
    const allowed = new Set([...spec.parts, ...spec.checks.flatMap((c) => c.parts || []), ...POINTED]);
    for (const b of s.beats) for (const id of b.hl || []) assert.ok(allowed.has(id), `step ${s.n}: ${id} is pointed at but the step does not use it`);
  }
  for (const id of [...Object.keys(PARTS), ...POINTED]) for (const l of LANGS) assert.ok(PART_NAMES[id]?.[l], `no ${l} name for ${id}`);
  const used = new Set(STEPS.flatMap((s) => [...s.parts, ...s.checks.flatMap((c) => c.parts || [])]));
  for (const id of Object.keys(PARTS)) assert.ok(used.has(id), `part ${id} is shown by no step`);
});

test('words on the controls exist in all three languages', () => {
  const keys = Object.keys(UI.en);
  for (const l of LANGS) { assert.deepEqual(Object.keys(UI[l]).sort(), [...keys].sort(), `${l} UI keys differ`); assert.ok(LANG_NAMES[l]); }
  for (const l of LANGS) for (const k of ['safety', 'method', 'storage']) assert.ok(UI[l].phases[k]);
});

// ───────────── playing it through ─────────────
function play(world, dir, maxSim = 900, dt = 1 / 30) {
  let t = 0;
  while (!dir.ended && t < maxSim) { dir.update(dt); world.update(dt, { visuals: false, geometry: false }); t += dt; }
  return t;
}

test('the whole training plays through, silently, in a sensible time, and ends with the worker outside', () => {
  const world = new World({}), dir = new Director({ world, narrator: new Narrator(null), steps: TRAINING, silent: true });
  const seen = [];
  dir.on.beat = (s, b) => seen.push(`${s.n}.${s.beats.indexOf(b)}`);
  dir.goto(0);
  const t = play(world, dir);
  assert.ok(dir.ended, 'the training did not finish');
  assert.ok(t > 300 && t < 800, `unexpected length ${t.toFixed(0)} s`);
  assert.equal(seen.length, TRAINING.reduce((n, s) => n + s.beats.length, 0));
  assert.ok(world.worker.pos.x > 4.5, 'the worker leaves through the door');
  assert.ok(world.dirt < 0.55, `the floor is left dirty (${world.dirt.toFixed(2)} of the dirt remains)`);
  assert.equal(world.lightsOn, false, 'the lights are off at the end');
  assert.equal(world.vac.on, false, 'the machine is off');
  assert.equal(world.socketOn, false, 'the socket is off');
});

test('the language is spoken text only: switching language never changes what the scene does', () => {
  const run = (lang) => {
    const world = new World({}), dir = new Director({ world, narrator: new Narrator(null), steps: TRAINING, silent: true, lang });
    dir.goto(0); let n = 0; while (!dir.ended && n < 30000) { dir.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false }); n++; }
    return { frames: n, x: world.worker.pos.x, dirt: world.dirt };
  };
  const en = run('en'), hi = run('hi'), ne = run('ne');
  for (const o of [hi, ne]) {
    assert.ok(Math.abs(o.x - en.x) < 0.5, 'the same ending place in every language');
    assert.ok(Math.abs(o.dirt - en.dirt) < 0.05, 'the same amount cleaned in every language');
  }
});

test('jumping to a step gives the same scene as playing up to it', () => {
  const mk = () => { const world = new World({}); return { world, dir: new Director({ world, narrator: new Narrator(null), steps: TRAINING, silent: true }) }; };
  const a = mk(); a.dir.goto(0);
  let guard = 0; while (a.dir.stepIdx < 8 && guard++ < 40000) { a.dir.update(1 / 30); a.world.update(1 / 30, { visuals: false, geometry: false }); }
  const b = mk(); b.dir.goto(8);
  assert.equal(a.dir.stepIdx, 8); assert.equal(b.dir.stepIdx, 8);
  for (const k of ['vest', 'gloves', 'glasses']) assert.ok(Math.abs(a.world.worker.ppe[k] - b.world.worker.ppe[k]) < 0.05, `${k} differs`);
  assert.ok(a.world.vac.root.position.distanceTo(b.world.vac.root.position) < 0.4, 'the machine is in a different place');
  assert.equal(a.world.props.stuck.visible, b.world.props.stuck.visible);
  assert.equal(a.world.dirt.toFixed(1), b.world.dirt.toFixed(1));
});

test('director: switching language mid-beat restarts the sentence, pausing stops the beat, muting never stalls', () => {
  const world = new World({}), dir = new Director({ world, narrator: new Narrator(null), steps: TRAINING, silent: true });
  dir.goto(0);
  for (let i = 0; i < 60; i++) { dir.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false }); }
  const beat = dir.beatIdx;
  dir.setLang('hi'); assert.equal(dir.text(), TRAINING[0].beats[beat].say.hi);
  dir.pause(); const at = world.worker.pos.clone();
  for (let i = 0; i < 90; i++) { dir.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false }); }
  assert.ok(world.worker.pos.distanceTo(at) < 0.02, 'nothing moves while paused');
  assert.equal(dir.beatIdx, beat);
  dir.play(); dir.setMuted(true);
  for (let i = 0; i < 1500; i++) { dir.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false }); }
  assert.ok(dir.beatIdx > beat || dir.stepIdx > 0, 'the lesson carries on with the sound off');
});
