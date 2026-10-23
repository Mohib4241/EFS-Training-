// The director plays the training. A step is a list of beats; a beat is one thing the narrator says
// and the action that goes with it, written as a generator that yields once per frame. A beat ends
// when both the action and the speech are finished, so the scene and the voice stay together in all
// three languages even though the sentences take different times.
//
// Jumping to a step does not need saved states: the scene is rebuilt and every earlier step is run
// at once, without drawing, so the world is exactly as it would have been.
import * as THREE from 'three';
import { estimate } from './narrator.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** The helpers a beat uses (`c` in the step files). */
class Ctx {
  constructor(director) { this.d = director; this.dt = 1 / 60; }
  get w() { return this.d.world; }
  get worker() { return this.d.world.worker; }
  get vac() { return this.d.world.vac; }
  get room() { return this.d.world.room; }
  get props() { return this.d.world.props; }
  V(x, y, z) { return V(x, y, z); }

  // time
  * wait(s) { let t = 0; while (t < s) { yield; t += this.dt; } }
  * until(fn, max = 20) { let t = 0; while (!fn() && t < max) { yield; t += this.dt; } }
  /** Call fn(t) with t from 0 to 1 over `dur` seconds (eased). */
  * tween(dur, fn) { let t = 0; while (t < dur) { yield; t += this.dt; const k = Math.min(1, t / dur); fn(k * k * (3 - 2 * k)); } fn(1); }
  /** Run several generators together until all have finished. */
  * par(...gens) {
    const live = gens.slice();
    while (live.length) { for (let i = live.length - 1; i >= 0; i--) if (live[i].next().done) live.splice(i, 1); if (live.length) yield; }
  }

  // moving
  * walk(x, z, { face = null, speed = 1.15 } = {}) {
    let t = 0;
    while (!this.worker.walkTo(x, z, this.dt, speed, face)) { yield; t += this.dt; if (t > 40) break; }
    this.worker.speed = 0;
  }
  * faceXZ(x, z) {
    let t = 0;
    while (!this.worker.turnTo(Math.atan2(x - this.worker.pos.x, z - this.worker.pos.z), this.dt, 5) && t < 4) { yield; t += this.dt; }
  }
  /** Reach for a point (a Vector3 or a function) with a hand and hold it there for `time`. */
  * reach(hand, target, time = 0.7) { this.worker.setIK(hand, target); yield* this.wait(time); }
  release(hand) { this.worker.setIK(hand, null); }

  // the worker's body
  pose(p) { this.worker.setPose(p); }
  adjust(o) { this.worker.adjust(o); }
  gaze(t) { this.worker.setGaze(t); }

  // camera, pointers, props
  cam(shot) { this.w.cam(shot); }
  hl(ids) { this.w.highlight(ids); }
  noHl() { this.w.clearHighlight(); }
  tick(id) { this.w.tick(id); }
  carry(prop, o) { this.w.carry(prop, o); }
  uncarry(prop) { this.w.uncarry(prop); }
  drop(prop, x, y, z, yaw) { this.w.drop(prop, x, y, z, yaw); }
}

export class Director {
  constructor({ world, narrator, steps, lang = 'en', silent = false }) {
    this.world = world;
    this.narrator = narrator;
    this.steps = steps;
    this.lang = lang;
    this.silent = silent;           // true: never speak, use estimated times (tests, jumping)
    this.c = new Ctx(this);
    this.stepIdx = -1; this.beatIdx = -1;
    this.gen = null; this.genDone = true;
    this.speech = null; this.speechDone = true; this.speechWait = 0; this.speechFor = 0;
    this.gap = 0;
    this.playing = false; this.ended = false;
    this.on = {};                   // onStep(i), onBeat(step, beat), onEnd()
    this._ff = false;
  }

  get step() { return this.steps[this.stepIdx] || null; }
  get beat() { return this.step ? this.step.beats[this.beatIdx] || null : null; }
  text(beat = this.beat) { return beat ? beat.say[this.lang] : ''; }

  // ───────────── playing ─────────────
  /** Go to a step (0-based) and start it. Earlier steps are fast-forwarded. */
  goto(i, { play = true } = {}) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this._stopSpeech();
    this._fastForwardTo(i);
    this.ended = false;
    this.playing = play;
    this._startStep(i);
  }

  _fastForwardTo(i) {
    this.world.reset();
    this._ff = true;
    const dt = 1 / 15;
    for (let s = 0; s < i; s++) {
      for (const beat of this.steps[s].beats) {
        this._runBeatToEnd(beat, dt);
      }
    }
    this._ff = false;
    this.world.update(1 / 60, { snap: true });
    this.world.stage?.shot(this.world.shot(this.world), 1, true);
  }

  _runBeatToEnd(beat, dt) {
    this.c.dt = dt;
    if (beat.cam) this.world.cam(beat.cam);
    const gen = beat.act(this.c);
    let n = 0;
    while (n++ < 3000) {
      if (gen.next().done) break;
      this.world.update(dt, { visuals: false, geometry: false });
    }
    this.world.clearHighlight();
  }

  _startStep(i) {
    this.stepIdx = i; this.beatIdx = -1;
    this.on.step?.(i, this.steps[i]);
    this._nextBeat();
  }

  _nextBeat() {
    const step = this.step;
    this.beatIdx++;
    this.world.clearHighlight();
    if (this.beatIdx >= step.beats.length) return this._endStep();
    const beat = step.beats[this.beatIdx];
    if (beat.cam) this.world.cam(beat.cam);
    if (beat.hl) this.world.highlight(beat.hl);
    this.gen = beat.act ? beat.act(this.c) : (function* () {})();
    this.genDone = false;
    this._say(beat);
    this.on.beat?.(step, beat);
  }

  _say(beat) {
    this._stopSpeech();
    const text = this.text(beat);
    this.speechDone = false; this.speechWait = 0;
    this.speechFor = estimate(text, this.lang);
    this.speech = null;
    if (!this.silent && this.playing) {
      const h = this.narrator.speak(text, this.lang);
      this.speech = h.silent ? null : h;
    }
  }

  _stopSpeech() { if (this.speech) this.speech.cancel(); this.speech = null; this.narrator?.stop(); }

  _endStep() {
    this.gap = 1.2; this.between = true;
    if (this.stepIdx >= this.steps.length - 1) { this.playing = false; this.ended = true; this.on.end?.(); }
  }

  /** Change the narration language: the sentence in progress starts again in the new language. */
  setLang(lang) {
    if (lang === this.lang) return;
    this.lang = lang;
    if (this.beat && !this.speechDone) this._say(this.beat);
  }
  setMuted(m) {
    this.narrator.muted = m;
    if (m) this._stopSpeech();
    else if (this.beat && !this.speechDone) this._say(this.beat);
  }
  play() { if (this.ended) return this.goto(0); this.playing = true; if (this.beat && !this.speechDone) this._say(this.beat); }
  pause() { this.playing = false; this._stopSpeech(); this.world.worker.speed = 0; }
  next() { if (this.stepIdx < this.steps.length - 1) this.goto(this.stepIdx + 1, { play: this.playing || true }); }
  prev() { this.goto(Math.max(0, this.stepIdx - (this.beatIdx > 1 ? 0 : 1)), { play: true }); }

  // ───────────── per frame ─────────────
  update(dt) {
    if (!this.playing || this.stepIdx < 0) return;
    this.c.dt = dt;
    if (this.between) {          // a short pause between steps, then the next one
      this.gap -= dt;
      if (this.gap <= 0 && !this.ended) { this.between = false; this._startStep(this.stepIdx + 1); }
      return;
    }
    if (this.gap > 0) { this.gap -= dt; return; }
    if (!this.genDone && this.gen.next().done) this.genDone = true;

    if (!this.speechDone) {
      this.speechWait += dt;
      const h = this.speech;
      if (h) {
        // a voice that never starts (blocked until the page is touched) must not stall the lesson
        if (h.done) this.speechDone = true;
        else if (!h.started && this.speechWait > 3.0) { h.cancel(); this.speech = null; this.speechWait = 0; }
      } else if (this.speechWait >= this.speechFor) this.speechDone = true;
    }
    if (this.genDone && this.speechDone) { this.gap = 0.35; this._nextBeat(); }
  }
}
