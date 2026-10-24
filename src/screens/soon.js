// A page that is still being built: a short note in the page's language over a calm 3D picture.
import * as THREE from 'three';
import { UI } from '../i18n.js';
import { ICON } from '../icons.js';
import { esc } from '../shell.js';

export class SoonScreen {
  /** `build3d(app)` returns { group, update(dt), shot } for the picture behind the note. */
  constructor(app, { titleKey, sectionKey, noteKey, icon, build3d }) {
    this.app = app; this.o = { titleKey, sectionKey, noteKey, icon, build3d }; this.built = false; this.t = 0;
  }
  title(l) { return UI[l][this.o.titleKey]; }
  subtitle(l) { return UI[l][this.o.sectionKey]; }
  build() {
    if (this.built) return; this.built = true;
    const a = this.app;
    this.view = this.o.build3d(a); this.view.group.visible = false; a.stage.scene.add(this.view.group);
    const el = this.el = document.createElement('section'); el.className = 'screen soon'; el.hidden = true;
    el.innerHTML = `<div class="soonCard"><span class="cIc">${ICON[this.o.icon]}</span><h2></h2><p></p></div>`;
    a.shell.screensEl.appendChild(el);
  }
  paint() { const l = this.app.lang; this.el.querySelector('h2').textContent = this.title(l); this.el.querySelector('p').textContent = UI[l][this.o.noteKey]; }
  enter() {
    const { stage } = this.app;
    this.el.hidden = false; this.view.group.visible = true;
    stage.setLook({ hemi: 0.5, key: 1.6, fill: 0.5, rim: 1.0, env: 0.4, exposure: 0.85, bloom: 0.15, keyPos: [-2.5, 4, 4], keyTarget: [0, 0.4, 0], shadow: [2, 2] });
    stage.scene.background = new THREE.Color(0x0e2452); stage.scene.fog = new THREE.Fog(0x0e2452, 8, 22);
    stage.shot(this.view.shot, 1, true);
    this.paint();
  }
  leave() { this.el.hidden = true; this.view.group.visible = false; }
  onLang() { this.paint(); }
  update(dt) { this.t += dt; this.view.update(dt, this.t); this.app.stage.shot(this.view.shot, dt); }
}
export { esc };
