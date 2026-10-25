// A lesson plays like a training video: the 3D scene runs through its narrated steps from start to
// finish on its own (see director.js), with no controls in the way. Each step opens with a title, like a
// chapter in a video. Tapping or clicking the picture pauses and resumes it; the steps can also be chosen
// from the side menu, where they are listed under the lesson. Space pauses, the arrow keys skip.
//
// The SOP page uses the 16 steps of the cleaning procedure; the Instructions page uses a shorter set
// about checking the machine before use and looking after it. Both share one World (the worker, the
// machine and the rooms). There are no subtitles: the narration is only heard.
import * as THREE from 'three';
import { World } from '../scene/world.js';
import { Director } from '../director.js';
import { TRAINING } from '../steps/index.js';
import { INSTRUCTIONS } from '../steps/instructions.js';
import { UI, PART_NAMES } from '../i18n.js';
import { ICON } from '../icons.js';
import { esc, store } from '../shell.js';
import {guideFor, readReview, PROCEDURE_SOURCE} from '../data/procedure.js';

const LOOKS = {
  room: { hemi: 0.7, key: 1.6, fill: 0.55, rim: 0, env: 0.4, exposure: .9, shadow: [6.5, 5.5], keyPos: [-4.5, 8.5, 6.5], keyTarget: [0, 0, 0] },
  hall: { hemi: 0.7, key: 1.6, fill: 0.55, rim: 0, env: 0.4, exposure: .9, shadow: [9, 7], keyPos: [-6, 10, 7], keyTarget: [0, 0, 0] },
};

const KINDS = {
  sop: { steps: TRAINING, env: 'room', titleKey: 'subSop', done: 'done', doneSub: 'doneSub', next: 'vacuum/instructions', nextKey: 'goInstr' },
  instructions: { steps: INSTRUCTIONS, env: 'hall', titleKey: 'subInstr', done: 'doneInstr', doneSub: 'doneInstrSub', next: 'vacuum/parts', nextKey: 'goParts' },
};

export class LessonScreen {
  constructor(app, kind) {
    this.app = app; this.kind = kind; this.cfg = KINDS[kind]; this.steps = this.cfg.steps;
    this.built = false; this.dir = null; this.poster = false;
    this.review = readReview(store.get('efs-sop-review-v1', '[]'));
  }
  title(l) { return UI[l][this.cfg.titleKey]; }
  subtitle(l) {
    const s = this.dir && this.dir.step;
    return s ? `${UI[l].step} ${s.n} ${UI[l].of} ${this.steps.length} · ${s.title[l]}` : UI[l].navVacuum;
  }
  get wantsVoice() { return false; }                 // the big play button lets the browser speak

  /** The world is shared by the lessons: one is made the first time and rebuilt for the room each lesson wants. */
  world() {
    const a = this.app;
    if (!a.lessonWorld) a.lessonWorld = new World({ stage: a.stage, M: a.M, env: this.cfg.env });
    return a.lessonWorld;
  }

  build() {
    if (this.built) return; this.built = true;
    const a = this.app;
    const el = this.el = document.createElement('section'); el.className = 'screen lesson'; el.hidden = true;
    el.innerHTML = `
      <aside class="procedure-nav" aria-label="Procedure sequence"><div class="procedure-nav-head" lang="en"><p class="eyebrow">VACUUM CLEANING</p><h2>${this.kind === 'sop' ? 'Standard operating procedure' : 'Equipment care guide'}</h2><p>${this.steps.length} steps · guided demonstration</p><a href="#/library">Source documents ↗</a></div><nav class="procedure-steps" aria-label="Lesson steps"></nav></aside>
      <div class="hit" aria-hidden="true"></div>
      <div class="tags" aria-hidden="true"></div>
      <div class="chapter" aria-live="polite"><small></small><b></b></div>
      <button class="bigPlay" type="button" hidden></button>
      <div class="flash" aria-hidden="true"></div>
      <div class="dip" aria-hidden="true"></div>
      <aside class="procedure-info" aria-label="Step guidance"><div class="procedure-detail"></div><section class="transcript-block"><h3 lang="en">Current demonstration</h3><p class="beat-transcript"></p></section></aside>
      <div class="lesson-controls"><button data-act="prev" aria-label="Previous step"></button><button data-act="toggle" aria-label="Play or pause"></button><button data-act="next" aria-label="Next step"></button><select aria-label="Choose lesson step"></select><button data-act="reset" aria-label="Reset camera view">${ICON.reset || '↺'}</button><button data-act="lab" class="lesson-open-lab">Open 3D lab ↗</button><span class="review-count" lang="en"></span></div>
      <div class="overlay end" hidden><div class="box"><span class="tick" aria-hidden="true">${ICON.check}</span><h2></h2><p></p><div class="row2"><button data-act="again" class="ghost" type="button"></button><button data-act="other" class="primary" type="button"></button></div></div></div>`;
    a.shell.screensEl.appendChild(el);
    this.$ = (s) => el.querySelector(s);
    this.tagsEl = this.$('.tags'); this.tagMap = new Map(); this._v = new THREE.Vector3();
    el.addEventListener('click', (e) => this._click(e));
    el.querySelector('.lesson-controls select').addEventListener('change', e => this.jump(+e.target.value));
  }

  _ensureDirector() {
    if (this.dir) return;
    const a = this.app, world = this.world();
    this.dir = new Director({ world, narrator: a.narrator, steps: this.steps, lang: a.lang, silent: true });
    this.dir.on.step = (i, s) => this._onStep(i, s);
    this.dir.on.beat = () => this.paintTranscript();
    this.dir.on.end = () => { setTimeout(() => { if (this.active && this.dir.ended) { this.$('.end').hidden = false; this.paint(); } }, 1600); };
  }

  enter() {
    const a = this.app;
    this.active = true; this.el.hidden = false;
    const world = this.world();
    if (world.env !== this.cfg.env) world.setEnv(this.cfg.env);
    this._ensureDirector();
    world.show(true);
    a.stage.setLook(LOOKS[this.cfg.env]);
    this.dir.lang = a.lang;
    this.$('.end').hidden = true;
    this.dir.silent = true;
    this.dir.goto(0, { play: false });               // the opening picture
    // like a video: it starts on its own, unless the browser must first be touched before it may speak
    if (a.waitsForTouch || a.stage.reducedMotion.matches) this._setPoster(true); else this.play();
    this.paint();
  }
  leave() { clearTimeout(this._dipT); clearTimeout(this._cardTimer); this.$('.dip').classList.remove('on'); this.active = false; this.el.hidden = true; this.dir.pause(); this.dir.silent = true; this.world().show(false); this.clearTags(); this._setPoster(false); }
  pause() { if (this.dir && this.dir.playing) { this.dir.pause(); this._flash('pause'); this.paint(); } }
  onLang(l) { this.dir.setLang(l); this.paint(); this.paintTranscript(); }
  onMute(m) { this.dir.silent = !this.app.canSpeak; this.dir.setMuted(m); }
  onUnlock() { if (this.dir) this.dir.silent = !this.app.canSpeak; }
  onLock() { if (this.dir) this.dir.silent = true; }

  // ───────────── playing ─────────────
  play() {
    const d = this.dir;
    this._setPoster(false);
    d.silent = !this.app.canSpeak;
    if (d.ended) { this._dip(() => d.goto(0, { play: true })); this.$('.end').hidden = true; }
    else { const fresh = d.stepIdx === 0 && d.beatIdx === 0 && !d.playing; d.play(); if (fresh && d.step) this._chapter(d.step); }
    this.paint();
  }
  togglePlay() {
    const d = this.dir;
    if (this.poster || !d.playing) { this.play(); this._flash('play'); }
    else { d.pause(); this._flash('pause'); }
    this.paint();
  }
  /** Go to a step (from the side menu or the arrow keys). */
  jump(i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this._setPoster(false); this.$('.end').hidden = true;
    this._dip(() => { this.dir.silent = !this.app.canSpeak; this.dir.goto(i, { play: true }); this.paint(); });
  }
  chapters(lang) { const cur = this.dir ? this.dir.stepIdx : -1; return this.steps.map((s, i) => ({ i, n: s.n, title: s.title[lang], cur: i === cur })); }

  _setPoster(on) {
    this.poster = on;
    const b = this.$('.bigPlay');
    b.hidden = !on;
    b.innerHTML = `${ICON.play}<span>${esc(UI[this.app.lang].play)}</span>`;
    b.setAttribute('aria-label', UI[this.app.lang].play);
    this.el.classList.toggle('posterOn', on);
  }
  /** The play or pause sign in the middle of the picture, for a moment, as a video player does. */
  _flash(kind) {
    const f = this.$('.flash');
    f.innerHTML = kind === 'play' ? ICON.play : ICON.pause;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    this.el.classList.toggle('paused', kind === 'pause');
  }
  /** A short fade through black, so a jump to another step is not a jolt. */
  _dip(fn) {
    if (this.app.stage.reducedMotion.matches) { fn(); return; }
    const d = this.$('.dip');
    d.classList.add('on');
    clearTimeout(this._dipT);
    this._dipT = setTimeout(() => { if (!this.active) return; fn(); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.remove('on'))); }, 260);
  }

  _click(e) {
    const b = e.target.closest('button');
    if (!b) { if (e.target.closest('.hit')) this.togglePlay(); return; }
    if (b.classList.contains('bigPlay')) { this.play(); this._flash('play'); return; }
    const act = b.dataset.act;
    if (b.dataset.step !== undefined) return this.jump(+b.dataset.step);
    if (b.dataset.verify !== undefined) {
      const guide = guideFor(this.kind, this.dir.stepIdx); this.pause();
      const correct = +b.dataset.verify === guide.verification.answer;
      if (correct && !this.review.includes(guide.n)) { this.review.push(guide.n); store.set('efs-sop-review-v1', JSON.stringify(this.review)); }
      this.paint();
      const feedback = this.$('.verification-feedback');
      feedback.textContent = `${correct ? 'Correct.' : 'Review the procedure:'} ${guide.verification.choices[guide.verification.answer]}${correct ? ' This records knowledge only; practical competence requires supervisor verification.' : ''}`;
      feedback.dataset.state = correct ? 'correct' : 'incorrect'; return;
    }
    if (act === 'toggle') return this.togglePlay();
    if (act === 'prev') return this.jump(this.dir.stepIdx - 1);
    if (act === 'next') return this.jump(this.dir.stepIdx + 1);
    if (act === 'lab') return this.app.go('lab/vacuum');
    if (act === 'reset') { const w = this.world(); this.app.stage.shot(typeof w.shot === 'function' ? w.shot(w) : w.shot, 1, true); return; }
    if (act === 'again') { this.$('.end').hidden = true; this._dip(() => { this.dir.silent = !this.app.canSpeak; this.dir.goto(0, { play: true }); this.paint(); }); return; }
    if (act === 'other') { this.$('.end').hidden = true; this.app.go(this.cfg.next); }
  }
  key(e) {
    if (!this.active) return;
    const d = this.dir;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); this.togglePlay(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.jump(d.stepIdx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.jump(d.beatIdx > 1 ? d.stepIdx : d.stepIdx - 1); }
  }

  // ───────────── drawing ─────────────
  paint() {
    if (!this.built) return;
    const lang = this.app.lang, t = (k) => UI[lang][k], $ = this.$;
    $('.end h2').textContent = t(this.cfg.done); $('.end p').textContent = t(this.cfg.doneSub);
    $('[data-act=again]').innerHTML = `${ICON.replay}<span>${esc(t('again'))}</span>`;
    $('[data-act=other]').innerHTML = `<span>${esc(t(this.cfg.nextKey))}</span>${ICON.next}`;
    $('[data-act=prev]').innerHTML = ICON.prev; $('[data-act=next]').innerHTML = ICON.next;
    $('[data-act=toggle]').innerHTML = this.dir?.playing ? ICON.pause : ICON.play;
    $('[data-act=toggle]').setAttribute('aria-label', t(this.dir?.playing ? 'pause' : 'play'));
    const select = $('.lesson-controls select');
    select.innerHTML = this.steps.map((s, i) => `<option value="${i}"${i === this.dir?.stepIdx ? ' selected' : ''}>${s.n.toString().padStart(2, '0')} · ${esc(s.title[lang])}</option>`).join('');
    $('[data-act=prev]').disabled = this.dir?.stepIdx === 0; $('[data-act=next]').disabled = this.dir?.stepIdx === this.steps.length - 1;
    if (this.poster) this._setPoster(true);
    this.paintGuide(); this.paintTranscript();
    this.el.classList.toggle('paused', !!this.dir && !this.dir.playing && !this.poster && !this.dir.ended);
  }

  paintTranscript() {
    const el = this.$('.beat-transcript'); if (!el) return;
    el.lang = this.app.lang; el.textContent = this.dir?.text() || '';
  }

  paintGuide() {
    const index = this.dir?.stepIdx ?? 0, lang = this.app.lang, guide = guideFor(this.kind, index);
    if (!guide) return;
    this.$('.procedure-steps').innerHTML = this.steps.map((s, i) => `<button type="button" data-step="${i}"${i === index ? ' aria-current="step"' : ''}><span>${String(s.n).padStart(2, '0')}</span><span>${esc(s.title[lang])}${this.kind === 'sop' && this.review.includes(s.n) ? '<small lang="en">✓ Knowledge checked</small>' : ''}</span></button>`).join('');
    this.$('.procedure-detail').innerHTML = `<p class="eyebrow" lang="en">${esc(guide.phaseLabel)} · ${index + 1} / ${this.steps.length}</p><h2>${esc(this.steps[index].title[lang])}</h2><div lang="en"><p class="content-status">${this.kind === 'sop' ? 'Source-linked procedure' : 'SOP + supplementary guidance'}</p><h3>Actions & expected result</h3><ul class="step-checks">${guide.checks.map(c => `<li>${esc(c.text)}${c.from === 'brief' ? '<small>General educational guidance · not stated in BU3</small>' : c.from === 'card' ? '<small>Supplementary EFS job card</small>' : ''}</li>`).join('')}</ul><details class="procedure-overview"><summary>Scope, preparation & safety</summary><p>Purpose: vacuum clean a 10 m² floor area, including a corner and edge. Apply the task risk assessment, method statement and manufacturer instructions.</p><p>Tools: vacuum and attachments, warning signs, appropriate colour-coded cleaning kit, refuse bag and assessed PPE. Circuit breaker if applicable.</p><p>PPE shown in the animation is illustrative. The task risk assessment determines actual PPE. Personnel authorisation, permits and site emergency arrangements require local confirmation.</p><p>Allow time to review every step; actual task duration depends on the site and assessment.</p></details>${guide.verification ? `<section class="step-verification"><h3>Check your understanding</h3><p>${guide.verification.question}</p>${guide.verification.choices.map((label, i) => ({label, i})).sort((a,b) => index % 2 ? b.i-a.i : a.i-b.i).map(({label,i}) => `<button type="button" data-verify="${i}">${esc(label)}</button>`).join('')}<p class="verification-feedback" role="status"></p></section>` : '<p class="review-note">Use the guided practice lab for scored decisions. Watching this demonstration does not verify competence.</p>'}<details class="procedure-source"><summary>Source & approval status</summary><p>${PROCEDURE_SOURCE.id} · Revision ${PROCEDURE_SOURCE.revision} · ${PROCEDURE_SOURCE.date}</p><p>${PROCEDURE_SOURCE.status}</p>${guide.pages.map(p => `<a href="media/vacuum-sop.pdf#page=${p}" target="_blank" rel="noopener">BU3 · page ${p} ↗</a>`).join('')}<a href="media/vacuum-job-card.pdf" target="_blank" rel="noopener">EFS job card ↗</a><p>Bag threshold: BU3 uses two-thirds full; the job card says above 70%. This training follows BU3.</p></details></div>`;
    this.$('.review-count').textContent = this.kind === 'sop' ? `${this.review.length}/16 knowledge checks` : 'Demonstration only';
  }

  _onStep(i, s) {
    if (!this.active) return;
    this.app.shell.paint(); this.paint();            // the step number and title in the top bar, and the list in the menu
    if (this.dir.playing) this._chapter(s);
  }
  /** The step's title, shown at the bottom left for a few seconds like a chapter title in a video. */
  _chapter(s) {
    const lang = this.app.lang, c = this.$('.chapter');
    c.querySelector('small').textContent = `${UI[lang].step} ${s.n} ${UI[lang].of} ${this.steps.length}`;
    c.querySelector('b').textContent = s.title[lang];
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    clearTimeout(this._cardTimer); this._cardTimer = setTimeout(() => c.classList.remove('show'), 4600);
  }

  clearTags() { for (const el of this.tagMap.values()) el.remove(); this.tagMap.clear(); }
  updateTags() {
    const a = this.app, world = this.world(), host = a.host, cam = a.stage.camera, v = this._v, lang = a.lang;
    const w = host.clientWidth, h = host.clientHeight, live = new Set();
    for (const hl of world.hl) {
      live.add(hl.id);
      let el = this.tagMap.get(hl.id);
      if (!el) { el = document.createElement('div'); el.className = 'tag'; this.tagsEl.appendChild(el); this.tagMap.set(hl.id, el); }
      const name = (PART_NAMES[hl.id] || {})[lang] || '';
      const html = `<span class="chk">${hl.bad ? '✕' : '✓'}</span>${esc(name)}`;
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      el.classList.toggle('ok', !!hl.tick); el.classList.toggle('bad', !!hl.bad);
      v.copy(world.anchorOf(hl.id)).project(cam);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.opacity = vis ? '1' : '0';
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h - 46}px) translate(-50%, -100%)`;
    }
    for (const [id, el] of this.tagMap) if (!live.has(id)) { el.remove(); this.tagMap.delete(id); }
  }

  update(dt) {
    const world = this.world();
    this.dir.update(dt);
    world.update(dt);
    // the mouth follows the voice
    world.worker.setMouth(this.app.narrator.lip.update(dt));
    this.updateTags();
  }
}
