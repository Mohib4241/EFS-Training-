// The app: one 3D stage and one narrator shared by every screen. A screen is a page of the training
// (home, the SOP lesson, the instructions, the vacuum cleaner, the chiller overview); the address
// (#/vacuum/parts and so on) says which one is open, so the back button and links work.
//
// A screen has: title(lang), subtitle(lang), build() (once, when first opened), enter(), leave(),
// update(dt), and optionally onLang(lang), onMute(muted), onUnlock(), key(e), pause(), chapters(lang)
// and jump(i).
//
// Nothing asks for a language when the page opens: it starts in the language used last time (English
// the first time), and the language drop-downs change it at any moment. Most browsers only let a page
// speak after it has been touched or clicked once, so until then a small hint says "tap anywhere to
// hear"; the first touch anywhere lets the narrator speak (`onUnlock`).
import { Stage } from './scene/stage.js';
import { makeMaterials } from './scene/mat.js';
import { Narrator, LANGS } from './narrator.js';
import { UI } from './i18n.js';
import { Shell, store } from './shell.js';
import { HomeScreen } from './screens/home.js';
import { LessonScreen } from './screens/lesson.js';
import { CinematicSopScreen } from './screens/cinematic-sop.js';
import { SimulationScreen } from './screens/simulation.js';
import { LibraryScreen } from './screens/library.js';


export const ROUTES = ['home', 'vacuum/sop', 'vacuum/instructions', 'vacuum/parts', 'chiller', 'labs', 'library', 'progress', 'lab/vacuum', 'lab/drill', 'lab/mcb', 'lab/hvac'];

export class App {
  constructor(host) {
    this.host = host;
    this.stage = new Stage(host);
    this.M = makeMaterials();
    this.narrator = new Narrator();
    this.lang = store.get('efs-lang', 'en'); if (!LANGS.includes(this.lang)) this.lang = 'en';
    this.narrator.muted = store.get('efs-mute', '0') === '1';
    this.narrator.speed = Math.min(1.2, Math.max(0.8, +store.get('efs-speed', '1') || 1));
    for (const l of LANGS) this.narrator.prefer[l] = store.get(`efs-voice-${l}`, '');
    // may the page speak yet? (it may once the page has been touched or a key pressed)
    const ua = typeof navigator !== 'undefined' ? navigator.userActivation : null;
    this.unlocked = !!(ua && ua.hasBeenActive);
    this.route = ''; this.screen = null; this.screens = {};
    this.factories = {
      home: () => new HomeScreen(this),
      'vacuum/sop': () => new CinematicSopScreen(this),
      'vacuum/instructions': () => new LessonScreen(this, 'instructions'),
      'vacuum/parts': () => new SimulationScreen(this, 'vacuum'),
      chiller: () => new SimulationScreen(this, 'hvac'),
      labs: () => new HomeScreen(this, 'labs'),
      progress: () => new HomeScreen(this, 'progress'),
      library: () => new LibraryScreen(this),
      ...Object.fromEntries(['vacuum', 'drill', 'mcb', 'hvac'].map(kind => [`lab/${kind}`, () => new SimulationScreen(this, kind)])),
    };
    this.shell = new Shell(this);
    this.narrator.onVoices = () => { this.shell._paintSettings(); if (this.unlocked) this.shell.voiceNotice(); };
    this.narrator.onBlocked = () => { if (this.unlocked) { this.unlocked = false; this.screen?.onLock?.(); } this.hint(); };
    const activate = (e) => {
      if (this.unlocked) return;
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey)) return;   // these do not count as a touch
      const u = navigator.userActivation;
      if (u && !u.hasBeenActive) return;
      this.unlock();
    };
    for (const ev of ['click', 'keydown', 'touchend', 'pointerup']) addEventListener(ev, activate, true);
    addEventListener('hashchange', () => this.sync());
    addEventListener('keydown', (e) => this._key(e));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.narrator.stop(); this.screen?.pause?.(); } });
    this.sync();
  }

  // ───────────── going places ─────────────
  static parse(hash) {
    const r = String(hash || '').replace(/^#\/?/, '');
    return ROUTES.includes(r) ? r : 'home';
  }
  go(route) { if (location.hash === `#/${route}`) this.sync(); else location.hash = `#/${route}`; }
  sync() { this.show(App.parse(location.hash)); }
  get(route) { return (this.screens[route] ||= this.factories[route]()); }

  show(route) {
    if (route === this.route && this.screen) return;
    if (this.screen) { this.narrator.stop(); this.screen.leave(); }
    this.route = route;
    const s = this.screen = this.get(route);
    s.build();
    s.enter();
    this.shell.paint();
    this.stage.resize();
    this.hint();
  }

  /** May the narrator be heard? (sound on, a voice exists, and the browser allows it) */
  get canSpeak() { return this.unlocked && !this.narrator.muted && this.narrator.supported; }
  /** Does a screen have to wait for a touch before it talks? */
  get waitsForTouch() { return !this.unlocked && !this.narrator.muted && this.narrator.supported; }

  /** The first touch or key press: from now on the browser lets the page speak. */
  unlock() {
    this.unlocked = true;
    this.narrator.blocked = false;
    this.hint();
    this.shell.voiceNotice();
    this.screen?.onUnlock?.();
  }

  /** Show the "tap anywhere to hear" hint while the narrator is waiting to be allowed to speak. */
  hint() { this.shell.tapHint(this.waitsForTouch && !!this.screen?.wantsVoice); }

  setLang(l, quiet = false) {
    if (!LANGS.includes(l) || l === this.lang) { this.shell.paint(); return; }
    this.lang = l; store.set('efs-lang', l);
    this.shell.paint();
    if (!quiet) this.screen?.onLang?.(l);
    if (this.unlocked) this.shell.voiceNotice();
  }

  toggleMute() {
    this.narrator.muted = !this.narrator.muted; store.set('efs-mute', this.narrator.muted ? '1' : '0');
    if (this.narrator.muted) this.narrator.stop();
    this.screen?.onMute?.(this.narrator.muted);
    this.shell.paint(); this.shell.voiceNotice(); this.hint();
  }

  /** Say a short sentence, so a voice can be heard (the voice settings use this). */
  sample(lang = this.lang) {
    if (this.narrator.muted) this.toggleMute();
    this.narrator.speak(UI[lang].sampleLine, lang);
  }

  _key(e) {
    if (e.target.closest?.('input, textarea, select, button, a, summary')) return;
    const k = e.key;
    if (k === 'l' || k === 'L') this.setLang(LANGS[(LANGS.indexOf(this.lang) + 1) % LANGS.length]);
    else if (k === 'm' || k === 'M') this.toggleMute();
    else if (k === 'p' || k === 'P') this.shell.toggleFps();
    else if (k === 'g' || k === 'G') this.shell.notice(`Graphics: ${this.stage.cycleQuality()}`, 2200);
    else this.screen?.key?.(e);
  }

  // ───────────── per frame ─────────────
  frame(dt) {
    // Keep animation integration stable without falsifying measured GPU/frame performance.
    this.screen?.update(Math.min(0.05, dt));
    if (this.host.style.visibility !== 'hidden') this.stage.render(dt);
    this._acc = (this._acc || 0) + dt;
    if (this._acc > 0.5) { this._acc = 0; this.shell.setFps(`${this.stage.fps.toFixed(0)} fps · ${this.stage.qualityLabel}`); }
  }
}
