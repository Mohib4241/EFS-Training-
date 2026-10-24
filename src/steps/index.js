// The whole SOP lesson: every step of the procedure as narrated beats, in order. The movements are in
// the step files here; what is said is in src/narration/sop.js, matched by position.
import { STEPS_1_4 } from './s01_04.js';
import { STEP_5 } from './s05.js';
import { STEPS_6_9 } from './s06_09.js';
import { STEPS_10_12 } from './s10_12.js';
import { STEPS_13_16 } from './s13_16.js';
import { STEPS as SPEC } from '../data/steps.js';
import { SOP_TEXT } from '../narration/sop.js';

const raw = [...STEPS_1_4, STEP_5, ...STEPS_6_9, ...STEPS_10_12, ...STEPS_13_16];
if (raw.length !== SOP_TEXT.length) throw new Error(`the SOP has ${raw.length} steps but ${SOP_TEXT.length} are narrated`);

// Each step gets its title and the words of its beats, and the phase it belongs to (the step list groups by it).
export const TRAINING = raw.map((s, i) => {
  const t = SOP_TEXT[i];
  if (s.beats.length !== t.beats.length) throw new Error(`step ${s.n} has ${s.beats.length} beats but ${t.beats.length} are narrated`);
  s.beats.forEach((b, j) => { b.say = t.beats[j]; });
  return Object.assign(s, { title: t.title, phase: SPEC[i].phase });
});
