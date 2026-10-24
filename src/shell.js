// The frame around every screen: the top bar (menu button, title, language, sound, voice settings), the
// side menu that stays closed until the menu button is pressed, a notice line, and a small "tap to hear"
// hint for browsers that only allow speech after the page has been touched.
//
// The side menu is one panel. Each training section (Vacuum Cleaning, Chiller Training) is a drop-down
// that opens in place to show its pages. While a lesson plays, its steps are listed under it as well, so
// a step can be chosen from there.
import { LANG_NAMES, UI } from './i18n.js';
import { LANGS } from './narrator.js';
import { ICON } from './icons.js';

const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// The menu. A section with `sub` is a drop-down.
export const MENU = [
  { id: 'home', route: 'home', icon: 'home', key: 'navHome' },
  {
    id: 'vacuum', key: 'navVacuum', icon: 'vacuum', sub: [
      { route: 'vacuum/sop', key: 'subSop', desc: 'subSopD', n: 1 },
      { route: 'vacuum/instructions', key: 'subInstr', desc: 'subInstrD', n: 2 },
      { route: 'vacuum/parts', key: 'subParts', desc: 'subPartsD', n: 3 },
    ],
  },
  {
    id: 'chiller', key: 'navChiller', icon: 'snow', sub: [
      { route: 'chiller', key: 'subHvac', desc: 'subHvacD', n: 1 },
    ],
  },
];

/** The menu section a route belongs to, or null. */
export const sectionOf = (route) => (MENU.find((m) => m.sub && m.sub.some((s) => s.route === route)) || {}).id || null;

/** A language drop-down (the same markup on the home page and in the top bar). */
export const langOptions = (cur) => LANGS.map((l) => `<option value="${l}" lang="${l}"${l === cur ? ' selected' : ''}>${LANG_NAMES[l]}</option>`).join('');

export class Shell {
  constructor(app) {
    this.app = app;
    this.secOpen = new Set();
    this.root = document.createElement('div'); this.root.id = 'ui';
    this.root.innerHTML = `
      <div id="screens"></div>
      <header id="top">
        <button id="menuBtn" class="ico" type="button" aria-controls="side" aria-expanded="false">${ICON.menu}</button>
        <div class="brand"><span class="badge" aria-hidden="true">EFS</span><div><h1 id="ttl"></h1><p id="subtitle"></p></div></div>
        <div class="tools">
          <label class="langSel" id="langWrap"><span class="gl">${ICON.globe}</span><select id="langSel"></select><span class="cv">${ICON.chev}</span></label>
          <button id="snd" class="ico" type="button" aria-pressed="false"></button>
          <button id="cfg" class="ico" type="button" aria-expanded="false" aria-controls="cfgBox">${ICON.gear}</button>
        </div>
      </header>
      <div id="scrim" hidden></div>
      <nav id="side" aria-label="Menu" aria-hidden="true">
        <div class="sideHead"><span class="badge" aria-hidden="true">EFS</span><b id="sideT"></b><button id="sideX" class="ico" type="button">${ICON.close}</button></div>
        <div id="sideList"></div>
      </nav>
      <div id="cfgBox" hidden role="dialog" aria-labelledby="cfgT"><h2 id="cfgT"></h2><div id="cfgBody"></div></div>
      <div id="notice" role="status" hidden></div>
      <button id="tapHint" type="button" hidden></button>
      <div id="fps" hidden></div>`;
    document.body.appendChild(this.root);
    this.screensEl = $('#screens');
    this._noticeTimer = 0;
    this._bind();
    this.paint();
  }

  get lang() { return this.app.lang; }
  t(k) { return UI[this.lang][k] ?? UI.en[k] ?? k; }

  // ───────────── drawing the texts that depend on the language ─────────────
  paint() {
    const a = this.app, t = (k) => this.t(k), lang = a.lang;
    document.documentElement.lang = lang;
    const cur = a.screen;
    $('#ttl').textContent = cur && cur.title ? cur.title(lang) : t('appTitle');
    $('#subtitle').textContent = cur && cur.subtitle ? cur.subtitle(lang) : t('appSub');
    const muted = a.narrator.muted;
    const snd = $('#snd');
    snd.innerHTML = muted ? ICON.muted : ICON.sound; snd.setAttribute('aria-pressed', String(muted));
    snd.title = muted ? t('muted') : t('sound'); snd.setAttribute('aria-label', muted ? t('muted') : t('sound'));
    $('#cfg').title = t('voices'); $('#cfg').setAttribute('aria-label', t('voices'));
    $('#menuBtn').title = t('menu'); $('#menuBtn').setAttribute('aria-label', t('menu'));
    const sel = $('#langSel'); sel.innerHTML = langOptions(lang); sel.setAttribute('aria-label', t('language')); sel.value = lang;
    $('#langWrap').hidden = a.route === 'home';            // the home page has its own, larger language drop-down
    $('#sideT').textContent = t('appTitle'); $('#sideX').setAttribute('aria-label', t('close'));
    $('#cfgT').textContent = t('voices');
    $('#tapHint').innerHTML = `${ICON.sound}<span>${esc(t('tapToHear'))}</span>`;
    this._paintMenu(); this._paintSettings();
  }

  _paintMenu() {
    const t = (k) => this.t(k), route = this.app.route;
    let html = '';
    for (const m of MENU) {
      if (!m.sub) {
        const on = m.route === route;
        html += `<button type="button" class="item${on ? ' on' : ''}" data-route="${m.route}"${on ? ' aria-current="page"' : ''}><span class="ic">${ICON[m.icon]}</span><span class="tx">${esc(t(m.key))}</span></button>`;
        continue;
      }
      const here = m.sub.some((s) => s.route === route), open = this.secOpen.has(m.id);
      html += `<section class="sec${open ? ' open' : ''}${here ? ' here' : ''}">
        <button type="button" class="item grp" data-sec="${m.id}" aria-expanded="${open}" aria-controls="sec-${m.id}"><span class="ic">${ICON[m.icon]}</span><span class="tx">${esc(t(m.key))}</span><span class="chev">${ICON.chev}</span></button>
        <div class="secBody" id="sec-${m.id}" role="group"><div class="secIn">${m.sub.map((s) => this._subItem(s, route)).join('')}</div></div>
      </section>`;
    }
    $('#sideList').innerHTML = html;
    // a closed section's links must not be reachable with the Tab key
    for (const b of this.root.querySelectorAll('.sec:not(.open) .secIn button')) b.tabIndex = -1;
  }

  _subItem(s, route) {
    const t = (k) => this.t(k), on = s.route === route;
    let chapters = '';
    const scr = on ? this.app.screen : null;
    if (scr && scr.chapters) {
      const list = scr.chapters(this.lang);
      chapters = `<ol class="chap" aria-label="${esc(t('steps'))}">${list.map((c) => `<li><button type="button" data-chap="${c.i}" class="${c.cur ? 'cur' : ''}"${c.cur ? ' aria-current="step"' : ''}><b>${c.n}</b><span>${esc(c.title)}</span></button></li>`).join('')}</ol>`;
    }
    return `<button type="button" class="item sub${on ? ' on' : ''}" data-route="${s.route}"${on ? ' aria-current="page"' : ''}><span class="ic num">${s.n}</span><span class="tx"><b>${esc(t(s.key))}</b><small>${esc(t(s.desc))}</small></span></button>${chapters}`;
  }

  // ───────────── voice settings ─────────────
  _paintSettings() {
    const a = this.app, n = a.narrator, t = (k) => this.t(k);
    let html = '';
    for (const l of LANGS) {
      const ch = n.choices(l), cur = n.status(l);
      const opts = ch.length
        ? [`<option value="">${esc(t('voiceAuto'))}${cur.ok ? ` — ${esc(cur.name)}` : ''}</option>`, ...ch.map((c) => `<option value="${esc(c.name)}"${n.prefer[l] === c.name ? ' selected' : ''}>${esc(c.name)}${c.approx ? ' ≈' : ''}</option>`)].join('')
        : `<option value="">${esc(t('noVoiceShort'))}</option>`;
      html += `<label class="field"><span lang="${l}">${LANG_NAMES[l]}</span><select data-voice="${l}"${ch.length ? '' : ' disabled'}>${opts}</select></label>`;
    }
    html += `<label class="field"><span>${esc(t('speed'))}</span><input id="spd" type="range" min="0.8" max="1.2" step="0.05" value="${n.speed}"><output id="spdV">${n.speed.toFixed(2)}×</output></label>`;
    html += `<button type="button" id="cfgTest" class="primary small">${esc(t('hearVoice'))}</button><p class="note">${esc(t('voiceNote'))}</p>`;
    $('#cfgBody').innerHTML = html;
  }

  // ───────────── opening and closing things ─────────────
  openMenu(open = true) {
    const side = $('#side');
    if (open) {
      // the section of the page being shown is open when the menu opens
      const sec = sectionOf(this.app.route); if (sec) this.secOpen.add(sec);
      this._paintMenu();
      this.closeSettings();
    }
    side.classList.toggle('open', open);
    side.setAttribute('aria-hidden', String(!open));
    side.inert = !open;
    $('#menuBtn').setAttribute('aria-expanded', String(open));
    $('#scrim').hidden = !open;
    if (open) setTimeout(() => { const f = side.querySelector('.item.on, .item'); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  get menuOpen() { return $('#side').classList.contains('open'); }

  toggleSection(id) {
    if (this.secOpen.has(id)) this.secOpen.delete(id); else this.secOpen.add(id);
    const sec = this.root.querySelector(`[data-sec="${id}"]`)?.closest('.sec');
    if (sec) {
      const open = this.secOpen.has(id);
      sec.classList.toggle('open', open);
      sec.querySelector('[data-sec]').setAttribute('aria-expanded', String(open));
      for (const b of sec.querySelectorAll('.secIn button')) b.tabIndex = open ? 0 : -1;
    }
  }

  openSettings(open = true) {
    $('#cfgBox').hidden = !open; $('#cfg').setAttribute('aria-expanded', String(open));
    if (open) { this.openMenu(false); this._paintSettings(); }
  }
  closeSettings() { this.openSettings(false); }

  notice(msg, ms = 4000) {
    const el = $('#notice');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.hidden = false;
    clearTimeout(this._noticeTimer); this._noticeTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  /** A short message when the device has no voice for the language. */
  voiceNotice() {
    const a = this.app, st = a.narrator.status(a.lang);
    if (a.narrator.muted) return this.notice('');
    if (!st.ok) return this.notice(this.t('noVoice'), 9000);
    if (st.approx) return this.notice(this.t('approxVoice'), 9000);
    return this.notice('');
  }

  /** The "tap anywhere to hear" hint, for browsers that wait for a touch before they speak. */
  tapHint(show) { $('#tapHint').hidden = !show; }

  toggleFps() { $('#fps').hidden = !$('#fps').hidden; }
  setFps(text) { if (!$('#fps').hidden) $('#fps').textContent = text; }

  // ───────────── events ─────────────
  _bind() {
    const a = this.app;
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !this.root.contains(b)) return;
      if (b.closest('#screens')) return;                   // a screen handles its own buttons
      if (b.id === 'menuBtn') return this.openMenu(!this.menuOpen);
      if (b.id === 'sideX') return this.openMenu(false);
      if (b.dataset.sec) return this.toggleSection(b.dataset.sec);
      if (b.dataset.chap != null) { this.openMenu(false); a.screen?.jump?.(+b.dataset.chap); return; }
      if (b.dataset.route) { this.openMenu(false); return a.go(b.dataset.route); }
      if (b.id === 'snd') return a.toggleMute();
      if (b.id === 'cfg') return this.openSettings($('#cfgBox').hidden);
      if (b.id === 'cfgTest') return a.sample();
      if (b.id === 'tapHint') return;                      // the tap itself lets the browser speak
    });
    this.root.addEventListener('change', (e) => {
      if (e.target.id === 'langSel') return a.setLang(e.target.value);
      const s = e.target.closest('select[data-voice]');
      if (s) { a.narrator.prefer[s.dataset.voice] = s.value; store.set(`efs-voice-${s.dataset.voice}`, s.value); a.sample(s.dataset.voice); }
    });
    this.root.addEventListener('input', (e) => {
      if (e.target.id === 'spd') { const v = +e.target.value; a.narrator.speed = v; store.set('efs-speed', String(v)); $('#spdV').textContent = `${v.toFixed(2)}×`; }
    });
    $('#scrim').addEventListener('click', () => this.openMenu(false));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (this.menuOpen) { this.openMenu(false); $('#menuBtn').focus(); } this.closeSettings(); }
    });
    $('#side').inert = true;
  }
}
