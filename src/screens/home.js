// The home page: the narrator stands on a platform with his hands folded. He greets the listener (his
// mouth follows the speech) with the moves from the reference clip, and a few quick links lead to the
// training. The language is chosen with the drop-down under the title; nothing is asked at the start.
import * as THREE from 'three';
import { Worker } from '../scene/worker.js';
import { Vacuum } from '../scene/vacuum.js';
import { buildHomeSet, PLATFORM_TOP } from '../scene/homeset.js';
import { UI } from '../i18n.js';
import { SHAPES } from '../lipsync.js';
import { estimate } from '../narrator.js';
import { Presenter } from '../scene/presenter.js';
import { GREETING } from '../narration/home.js';
import { ICON } from '../icons.js';
import { esc, langOptions } from '../shell.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const HOME_LOOK = {
  hemi: 0.4, key: 1.7, fill: 0.45, rim: 1.4, env: 0.34, exposure: 0.8, bloom: 0.22,
  keyPos: [-2.6, 4.2, 4.4], keyTarget: [0, 1.0, 0], shadow: [2.6, 2.6], keyColor: 0xfff1e0, rimColor: 0x9cc4ff,
};

export class HomeScreen {
  constructor(app) {
    this.app = app; this.built = false;
    this.t = 0; this.handle = null; this.running = false; this.seg = -1; this.greeted = false;   // greeted: the welcome has been given once
  }
  title(l) { return UI[l].appTitle; }
  subtitle(l) { return UI[l].appSub; }
  /** The page talks, so the "tap to hear" hint is shown until the browser allows it. */
  get wantsVoice() { return !this.greeted; }

  build() {
    if (this.built) return; this.built = true;
    const { stage, M } = this.app;
    const g = this.group = new THREE.Group(); g.visible = false; stage.scene.add(g);
    this.set = buildHomeSet(); g.add(this.set.group);

    // the narrator, on the platform
    const stand = new THREE.Group(); stand.position.y = PLATFORM_TOP; g.add(stand);
    const w = this.worker = new Worker(M); stand.add(w.root);
    w.place(0, 0.0, 0); w.setPPE('glasses', false); w.sway = 1;
    this.presenter = new Presenter(w, () => this.app.stage.camera.position.clone().setY(1.55));
    // a vacuum cleaner beside him, with its tool leaning on it
    const vac = this.vac = new Vacuum(M); g.add(vac.root, vac.free);
    vac.root.position.set(1.15, PLATFORM_TOP, 0.2); vac.root.rotation.y = -0.5; vac.setFill(0.3); vac.brushT = 1;
    const ry = vac.root.rotation.y, c = Math.cos(ry), s = Math.sin(ry);
    vac.tool.position.set(vac.root.position.x + 0.36 * c + 0.2 * s, PLATFORM_TOP, vac.root.position.z - 0.36 * s + 0.2 * c);
    vac.toolYaw = ry + Math.atan2(0.36, 0.2); vac.toolElev = 1.38;
    vac.update(1 / 60, true, true);
    w.update(1 / 60, true);

    // page text
    const el = this.el = document.createElement('section'); el.className = 'screen home'; el.hidden = true;
    el.innerHTML = `
      <div class="hero">
        <p class="kicker">EFS</p>
        <h2 id="hTitle"></h2>
        <p class="lead" id="hLead"></p>
        <label class="heroLang"><span class="hl" id="hLangL"></span><span class="sel"><span class="gl">${ICON.globe}</span><select id="hLang"></select><span class="cv">${ICON.chev}</span></span></label>
        <div class="cards">
          <button type="button" class="card" data-route="vacuum/sop"><span class="cIc">${ICON.vacuum}</span><b id="cVac"></b><small id="cVacD"></small></button>
          <button type="button" class="card" data-route="chiller"><span class="cIc">${ICON.snow}</span><b id="cChi"></b><small id="cChiD"></small></button>
        </div>
        <button type="button" id="hAgain" class="ghost"></button>
      </div>`;
    this.app.shell.screensEl.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.route) this.app.go(b.dataset.route);
      else if (b.id === 'hAgain') { if (this.app.canSpeak || !this.app.waitsForTouch) this.greet(); }
    });
    el.addEventListener('change', (e) => { if (e.target.id === 'hLang') this.app.setLang(e.target.value); });
    this.paint();
  }

  paint() {
    if (!this.built) return;
    const lang = this.app.lang, t = (k) => UI[lang][k], $ = (s) => this.el.querySelector(s);
    $('#hTitle').textContent = t('appTitle'); $('#hLead').textContent = t('homeLead');
    $('#hLangL').textContent = t('language');
    const sel = $('#hLang'); sel.innerHTML = langOptions(lang); sel.value = lang; sel.setAttribute('aria-label', t('language'));
    $('#cVac').textContent = t('navVacuum'); $('#cVacD').textContent = t('cardVacuumD');
    $('#cChi').textContent = t('navChiller'); $('#cChiD').textContent = t('cardChillerD');
    $('#hAgain').innerHTML = `${ICON.replay}<span>${esc(t('hearAgain'))}</span>`;
  }

  enter() {
    const { stage } = this.app;
    this.group.visible = true; this.el.hidden = false;
    this.shift = this._shiftFor();
    stage.setLook({ ...HOME_LOOK, shift: this.shift });
    stage.scene.background = new THREE.Color(0x0a1f48); stage.scene.fog = new THREE.Fog(0x0a1f48, 14, 34);
    this.shot = { pos: V(0.4, 1.3, 3.9), look: V(0.1, 0.93, 0), fov: 34 };
    stage.shot(this.shot, 1, true);
    this.paint();
    this.presenter.stop();
    // the first visit: greet straight away if the browser lets the page speak (or there is no sound to wait for)
    if (!this.greeted && !this.app.waitsForTouch) this.greet();
  }
  leave() { this.group.visible = false; this.el.hidden = true; this._stopTalk(); }

  _shiftFor() { const w = this.app.host.clientWidth, h = this.app.host.clientHeight; return w / h > 1.15 ? 0.2 : 0; }

  onUnlock() { if (!this.greeted || this.running) this.greet(); }
  onLock() { this._stopTalk(); this.greeted = false; }
  onLang() { this.paint(); if (!this.app.waitsForTouch) this.greet(); }
  onMute() { if (this.app.narrator.muted) this._stopTalk(); }
  pause() { this._stopTalk(); }

  _stopTalk() { this.running = false; this.app.narrator.stop(); this.handle = null; this.presenter.stop(); this.worker.setMouth({ ...SHAPES.rest, talking: false }); }

  /** The welcome: five lines, each with a move; the next starts when the move and the voice are both done. */
  greet() {
    this._stopTalk();
    this.greeted = true; this.app.hint();
    this.running = true; this.seg = -1; this._nextLine();
  }
  _nextLine() {
    this.seg++;
    if (this.seg >= GREETING.length) { this.running = false; this.handle = null; return; }
    const { narrator, lang } = this.app, line = GREETING[this.seg], text = line.say[lang];
    this.presenter.play(line.move);
    const h = this.app.canSpeak ? narrator.speak(text, lang) : { silent: true };
    this.handle = h.silent ? null : h;
    this.waited = 0; this.speechFor = estimate(text, lang, narrator.speed);
  }
  _lineDone(dt) {
    this.waited += dt;
    const h = this.handle;
    if (h) {
      if (h.done) return true;
      if (h.blocked) { this.handle = null; return false; }
      if (!h.started && this.waited > 3) { h.cancel(); this.handle = null; this.waited = 0; }   // a voice that never starts must not stall the welcome
      return false;
    }
    return this.waited >= this.speechFor;
  }

  update(dt) {
    const { stage, narrator } = this.app, w = this.worker;
    this.t += dt;
    const sh = this._shiftFor(); if (sh !== this.shift) { this.shift = sh; stage.viewShift = sh; stage.resize(); }
    // the moves, and a lively face while he talks
    this.presenter.update(dt);
    if (this.running && this.presenter.done && this._lineDone(dt)) this._nextLine();
    w.setMouth(narrator.lip.update(dt));
    w.update(dt);
    this.vac.update(dt, false, false);
    const p = this.set.bokeh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (0.04 + (i % 5) * 0.012); if (y > 6.6) y = 0.4; p.setY(i, y); }
    p.needsUpdate = true;
    { const k = 1 + 0.15 * Math.sin(this.t * 1.6); this.set.ring.material.color.setRGB(0.31 * 1.6 * k, 0.61 * 1.6 * k, 1.0 * 1.6 * k); }
    // the camera drifts a little so the picture is alive
    const sp = { pos: this.shot.pos.clone().add(V(Math.sin(this.t * 0.25) * 0.25, Math.sin(this.t * 0.18) * 0.04, 0)), look: this.shot.look, fov: this.shot.fov };
    stage.shot(sp, dt);
  }
}
