// The controls around the 3D scene: start screen with the language choice, language switch, sound,
// play/pause, previous/next, a bar of 16 steps, a step list, labels on the parts a step uses, and the
// end screen. There are no subtitles: the narration is only heard. Step headings and part names are
// shown in the chosen language.
import * as THREE from 'three';
import { LANG_NAMES, UI, PART_NAMES } from './i18n.js';
import { LANGS } from './narrator.js';
import { STEPS as SPEC } from './data/steps.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export function initUI({ stage, world, dir, narrator, steps, host }) {
  let lang = store.get('efs-lang', 'en'); if (!LANGS.includes(lang)) lang = 'en';
  let started = false;
  const t = (k) => UI[lang][k];

  const root = document.createElement('div'); root.id = 'ui';
  root.innerHTML = `
    <div id="tags" aria-hidden="true"></div>
    <header id="top">
      <div class="brand"><span class="mark" aria-hidden="true"></span><div><h1 id="ttl"></h1><p id="sub"></p></div></div>
      <div class="tools">
        <div class="seg" id="langs" role="group" aria-label="Language"></div>
        <button id="snd" class="ico" type="button" aria-pressed="false"></button>
        <button id="lst" class="ico txt" type="button"></button>
      </div>
    </header>
    <div id="card" aria-live="polite"></div>
    <div id="notice" role="status" hidden></div>
    <nav id="bar" aria-label="Playback">
      <div class="ctl">
        <button id="prv" class="ico" type="button"></button>
        <button id="ply" class="ico big" type="button"></button>
        <button id="nxt" class="ico" type="button"></button>
      </div>
      <div class="prog"><div id="segs" role="list"></div><div class="now"><b id="nowN"></b><span id="nowT"></span></div></div>
    </nav>
    <aside id="drawer" hidden><h2 id="drTitle"></h2><div id="drList"></div></aside>
    <div id="start" class="overlay"><div class="box">
      <span class="mark big" aria-hidden="true"></span>
      <h2 id="stTitle"></h2><p id="stSub"></p>
      <p class="ask" id="stAsk"></p>
      <div class="langbtns" id="stLangs"></div>
      <p class="hint" id="stHint"></p>
    </div></div>
    <div id="end" class="overlay" hidden><div class="box"><span class="tick" aria-hidden="true">✓</span><h2 id="enTitle"></h2><p id="enSub"></p><button id="again" class="primary" type="button"></button></div></div>
    <div id="fps" hidden></div>
    <div id="vig" aria-hidden="true"></div>`;
  document.body.appendChild(root);
  const tagsEl = $('#tags');

  // ───────────── texts that depend on the language ─────────────
  function paint() {
    document.documentElement.lang = lang === 'ne' ? 'ne' : lang;
    $('#ttl').textContent = t('title'); $('#sub').textContent = t('sub');
    $('#snd').textContent = narrator.muted ? '🔇' : '🔊'; $('#snd').setAttribute('aria-pressed', String(narrator.muted));
    $('#snd').title = narrator.muted ? t('muted') : t('sound'); $('#snd').setAttribute('aria-label', narrator.muted ? t('muted') : t('sound'));
    $('#lst').textContent = t('steps');
    $('#prv').textContent = '⏮'; $('#prv').setAttribute('aria-label', t('prev')); $('#prv').title = t('prev');
    $('#nxt').textContent = '⏭'; $('#nxt').setAttribute('aria-label', t('next')); $('#nxt').title = t('next');
    const playing = dir.playing;
    $('#ply').textContent = playing ? '⏸' : '▶'; $('#ply').setAttribute('aria-label', playing ? t('pause') : t('play')); $('#ply').title = playing ? t('pause') : t('play');
    $('#stTitle').textContent = t('title'); $('#stSub').textContent = t('sub'); $('#stAsk').textContent = t('choose');
    $('#enTitle').textContent = t('done'); $('#enSub').textContent = t('doneSub'); $('#again').textContent = t('again');
    $('#drTitle').textContent = t('steps');
    $('#langs').innerHTML = LANGS.map((l) => `<button type="button" data-l="${l}" aria-pressed="${l === lang}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');
    $('#stLangs').innerHTML = LANGS.map((l) => `<button type="button" class="primary" data-l="${l}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');
    $('#stHint').textContent = t('hint');
    const cur = dir.step;
    if (cur) { $('#nowN').textContent = `${t('step')} ${cur.n} ${t('of')} ${steps.length}`; $('#nowT').textContent = cur.title[lang]; }
    else { $('#nowN').textContent = ''; $('#nowT').textContent = ''; }
    // the bar of steps
    $('#segs').innerHTML = steps.map((s, i) => `<button type="button" role="listitem" class="seg-s ${i < dir.stepIdx ? 'done' : ''} ${i === dir.stepIdx ? 'cur' : ''}" data-i="${i}" aria-label="${esc(`${t('step')} ${s.n}: ${s.title[lang]}`)}" title="${esc(`${s.n}. ${s.title[lang]}`)}"></button>`).join('');
    // the list of steps
    let html = '', ph = '';
    steps.forEach((s, i) => {
      const phase = SPEC[i]?.phase;
      if (phase && phase !== ph) { ph = phase; html += `<h3>${esc(UI[lang].phases[phase])}</h3>`; }
      html += `<button type="button" class="row ${i === dir.stepIdx ? 'cur' : ''}" data-i="${i}"><b>${s.n}</b><span>${esc(s.title[lang])}</span></button>`;
    });
    $('#drList').innerHTML = html;
  }

  function setLang(l) {
    lang = l; store.set('efs-lang', l);
    dir.setLang(l);
    paint(); voiceNotice(true);
  }

  // a short message when the device has no voice for the language
  let noticeTimer = 0;
  function voiceNotice(force = false) {
    const st = narrator.status(lang);
    let msg = '';
    if (narrator.muted) msg = '';
    else if (!st.ok) msg = t('noVoice');
    else if (st.approx) msg = t('approxVoice');
    const el = $('#notice');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { el.hidden = true; }, 9000);
  }
  narrator.onVoices = () => { if (started) voiceNotice(); };

  // ───────────── actions ─────────────
  function begin(l) {
    setLang(l);
    started = true; $('#start').hidden = true; $('#end').hidden = true;
    dir.silent = false;
    dir.goto(0, { play: true });
    paint();
  }
  const togglePlay = () => { if (!started) return; if (dir.ended) { dir.goto(0); } else if (dir.playing) dir.pause(); else dir.play(); paint(); };
  const go = (i) => { if (!started) return; dir.goto(i, { play: true }); $('#end').hidden = true; $('#drawer').hidden = true; paint(); };
  const toggleMute = () => { narrator.muted = !narrator.muted; dir.setMuted(narrator.muted); store.set('efs-mute', narrator.muted ? '1' : '0'); paint(); voiceNotice(); };
  narrator.muted = store.get('efs-mute', '0') === '1';

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.closest('#stLangs')) return begin(b.dataset.l);
    if (b.closest('#langs')) return setLang(b.dataset.l);
    if (b.dataset.i != null) return go(+b.dataset.i);
    if (b.id === 'ply') return togglePlay();
    if (b.id === 'nxt') { if (started) { dir.next(); paint(); } return; }
    if (b.id === 'prv') { if (started) { dir.prev(); paint(); } return; }
    if (b.id === 'snd') return toggleMute();
    if (b.id === 'lst') { $('#drawer').hidden = !$('#drawer').hidden; return; }
    if (b.id === 'again') { $('#end').hidden = true; dir.goto(0); paint(); }
  });
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    const k = e.key;
    if (k === ' ' && started) { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowRight' && started) { dir.next(); paint(); }
    else if (k === 'ArrowLeft' && started) { dir.prev(); paint(); }
    else if (k === 'l' || k === 'L') setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]);
    else if (k === 'm' || k === 'M') toggleMute();
    else if (k === 'p' || k === 'P') $('#fps').hidden = !$('#fps').hidden;
    else if (k === 'g' || k === 'G') { const l = stage.cycleQuality(); flash(`Graphics: ${l}`); }
    else if (k === 'Escape') $('#drawer').hidden = true;
  });
  function flash(msg) { const el = $('#notice'); el.textContent = msg; el.hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { el.hidden = true; }, 2200); }

  // ───────────── director events ─────────────
  let cardTimer = 0;
  dir.on.step = (i, s) => {
    paint();
    const c = $('#card');
    c.innerHTML = `<small>${t('step')} ${s.n} ${t('of')} ${steps.length}</small><b>${esc(s.title[lang])}</b>`;
    c.classList.add('show'); clearTimeout(cardTimer); cardTimer = setTimeout(() => c.classList.remove('show'), 2800);
  };
  dir.on.end = () => { setTimeout(() => { $('#end').hidden = false; paint(); }, 1800); };

  // ───────────── labels on the parts a step uses ─────────────
  const tagMap = new Map();
  const v = new THREE.Vector3();
  function updateTags() {
    const live = new Set();
    const cam = stage.camera, w = host.clientWidth, h = host.clientHeight;
    for (const hl of world.hl) {
      live.add(hl.id);
      let el = tagMap.get(hl.id);
      if (!el) { el = document.createElement('div'); el.className = 'tag'; tagsEl.appendChild(el); tagMap.set(hl.id, el); }
      const name = (PART_NAMES[hl.id] || {})[lang] || '';
      const html = `<span class="chk">✓</span>${esc(name)}`;
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      el.classList.toggle('ok', !!hl.tick);
      v.copy(world.anchorOf(hl.id)).project(cam);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.opacity = vis ? '1' : '0';
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h - 46}px) translate(-50%, -100%)`;
    }
    for (const [id, el] of tagMap) if (!live.has(id)) { el.remove(); tagMap.delete(id); }
  }

  let acc = 0;
  paint();
  const api = {
    update(dt) {
      updateTags();
      acc += dt;
      if (acc > 0.5) {
        acc = 0;
        if (!$('#fps').hidden) $('#fps').textContent = `${stage.fps.toFixed(0)} fps · ${stage.qualityLabel}`;
        const b = $('#ply'); const want = dir.playing ? '⏸' : '▶'; if (b.textContent !== want) paint();
      }
    },
    get lang() { return lang; },
  };
  return api;
}
