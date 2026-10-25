// The supplied guide film leads the SOP; the old procedural room is not used on this route.
import { TRAINING } from '../steps/index.js';
import { UI } from '../i18n.js';
import { ICON } from '../icons.js';
import { esc } from '../shell.js';

const CUES = [0.25, 0.25, 0.25, 0.45, 1.7, 2.8, 3.6, 4.25, 4.9, 5.6, 6.25, 6.95, 7.55, 8.15, 8.7, 9.15];

export class CinematicSopScreen {
  constructor(app) { this.app = app; this.steps = TRAINING; this.index = 0; this.playing = false; this.built = false; }
  title(lang) { return UI[lang].subSop; }
  subtitle(lang) { const step = this.steps[this.index]; return `${UI[lang].step} ${step.n} ${UI[lang].of} ${this.steps.length} · ${step.title[lang]}`; }
  get wantsVoice() { return false; }

  build() {
    if (this.built) return;
    this.built = true;
    const el = this.el = document.createElement('section');
    el.className = 'screen cinematic-sop'; el.hidden = true; el.lang = 'en';
    el.innerHTML = `
      <div class="cinematic-film"><video muted loop playsinline preload="metadata" poster="media/reference-presenter.jpg" aria-label="EFS guide demonstrating vacuum cleaning"><source src="media/reference-presenter.mp4" type="video/mp4"></video><div class="cinematic-surface" aria-hidden="true"></div><div class="cinematic-brand" aria-hidden="true"><b>EFS</b><span>FACILITIES SERVICES</span></div></div>
      <article class="cinematic-card" aria-live="polite"><span class="cinematic-kicker"></span><h2></h2><p></p></article>
      <div class="cinematic-controls"><button data-act="prev" aria-label="Previous SOP step"></button><button data-act="toggle" class="cinematic-hear"></button><button data-act="next" aria-label="Next SOP step"></button><select aria-label="Choose SOP step"></select><a href="media/vacuum-sop.pdf" target="_blank" rel="noopener">View SOP source ↗</a></div>`;
    this.video = el.querySelector('video'); this.$ = (s) => el.querySelector(s);
    this.video.addEventListener('loadedmetadata', () => this._cue());
    this.video.addEventListener('play', () => { this.playing = true; this.paint(); });
    this.video.addEventListener('pause', () => { this.playing = false; this.paint(); });
    el.addEventListener('click', (event) => this._click(event));
    this.$('select').addEventListener('change', (event) => this.jump(+event.target.value, true));
    this.app.shell.screensEl.appendChild(el);
  }

  enter() { this.active = true; this.el.hidden = false; this.app.host.style.visibility = 'hidden'; this._cue(); this.video.play().catch(() => {}); this.paint(); }
  leave() { this.active = false; this.el.hidden = true; this.video.pause(); this.app.narrator.stop(); this.app.host.style.visibility = ''; }
  pause() { this.video.pause(); this.app.narrator.stop(); }
  onMute(muted) { if (muted) this.app.narrator.stop(); }
  onLang() { this.paint(); }
  chapters(lang) { return this.steps.map((step, i) => ({ i, n: step.n, title: step.title[lang], cur: i === this.index })); }

  _cue() { if (this.video && Number.isFinite(this.video.duration)) this.video.currentTime = Math.min(CUES[this.index], Math.max(0, this.video.duration - 0.15)); }
  _text() { const lang = this.app.lang; return this.steps[this.index].beats.map((beat) => beat.say[lang]).join(' '); }
  _speak() { this.app.unlock(); if (!this.app.narrator.muted) this.app.narrator.speak(this._text(), this.app.lang); }
  play() { this.video.play().catch(() => {}); this._speak(); this.paint(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  jump(index, announce = false) { this.index = Math.max(0, Math.min(this.steps.length - 1, index)); this._cue(); this.app.narrator.stop(); if (announce) this._speak(); this.app.shell.paint(); this.paint(); }
  key(event) {
    if (!this.active) return;
    if (event.key === ' ' || event.key === 'k') { event.preventDefault(); this.toggle(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); this.jump(this.index + 1, true); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); this.jump(this.index - 1, true); }
  }
  _click(event) { const button = event.target.closest('button'); if (!button) return; if (button.dataset.act === 'prev') this.jump(this.index - 1, true); if (button.dataset.act === 'next') this.jump(this.index + 1, true); if (button.dataset.act === 'toggle') this.toggle(); }
  paint() {
    if (!this.built) return;
    const lang = this.app.lang, step = this.steps[this.index];
    this.$('.cinematic-kicker').textContent = `${UI[lang].step} ${String(step.n).padStart(2, '0')} ${UI[lang].of} ${this.steps.length}`;
    this.$('.cinematic-card h2').textContent = step.title[lang];
    this.$('.cinematic-card p').textContent = step.beats[0].say[lang];
    this.$('[data-act=prev]').innerHTML = ICON.prev; this.$('[data-act=next]').innerHTML = ICON.next;
    this.$('[data-act=prev]').disabled = this.index === 0; this.$('[data-act=next]').disabled = this.index === this.steps.length - 1;
    this.$('[data-act=toggle]').innerHTML = `${this.playing ? ICON.pause : ICON.play}<span>${this.playing ? 'Pause guide' : 'Hear this step'}</span>`;
    this.$('[data-act=toggle]').setAttribute('aria-label', this.playing ? 'Pause guide' : 'Hear this SOP step');
    this.$('select').innerHTML = this.steps.map((item, i) => `<option value="${i}"${i === this.index ? ' selected' : ''}>${String(item.n).padStart(2, '0')} · ${esc(item.title[lang])}</option>`).join('');
  }
  update() {}
}
