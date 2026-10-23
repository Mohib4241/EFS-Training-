import { Stage } from './scene/stage.js';
import { World } from './scene/world.js';
import { Director } from './director.js';
import { Narrator } from './narrator.js';
import { TRAINING } from './steps/index.js';
import { initUI } from './ui.js';

const host = document.getElementById('stage');
const stage = new Stage(host);
const world = new World({ stage });
const narrator = new Narrator();
const dir = new Director({ world, narrator, steps: TRAINING });
const ui = initUI({ stage, world, dir, narrator, steps: TRAINING, host });

// for tests and screenshots
window.__training = {
  stage, world, dir, TRAINING, ui,
  /** Advance the lesson by `sec` seconds without drawing. */
  run(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { dir.update(dt); world.update(dt); } },
  /** Jump to a step and a beat, then run `sec` seconds into it, silently. */
  go(step, beat = 0, sec = 0) {
    document.getElementById('start').hidden = true;
    dir.silent = true; dir.goto(step, { play: true });
    let guard = 0; while (dir.beatIdx < beat && guard++ < 20000) { dir.update(1 / 30); world.update(1 / 30, { visuals: false, geometry: false }); }
    window.__training.run(sec);
    stage.shot(world.shot(world), 1, true);
  },
};

// a hidden tab must not leave the narrator talking over nothing
document.addEventListener('visibilitychange', () => { if (document.hidden && dir.playing) { dir.pause(); ui.update(0); } });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  dir.update(dt);
  world.update(dt);
  stage.render(dt);
  ui.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
