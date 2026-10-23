// The narrator speaks with the browser's own voices (the Web Speech API): no audio files, no server.
// English and Hindi have voices on most devices. Nepali has one on many Android phones but often not
// on a computer, so when there is no Nepali voice the narrator uses a Hindi one (the two share a
// script, so it reads the text, but the pronunciation is only approximate) and says so.
//
// The pure parts (choosing a voice, splitting text, estimating how long it takes) are exported
// so they can be tested without a browser.

export const LANGS = ['en', 'hi', 'ne'];

// Voice preferences by language, best first. `approx` marks a stand-in for the language itself.
const PREFS = {
  en: [['en-GB'], ['en-IN'], ['en-AU'], ['en-US'], ['en']],
  hi: [['hi-IN'], ['hi']],
  ne: [['ne-NP'], ['ne-IN'], ['ne'], ['hi-IN', true], ['hi', true]],
};

const norm = (s) => String(s || '').replace('_', '-').toLowerCase();

/** The best voice for a language from a list of voices, or null. `approx` is true for a stand-in. */
export function pickVoice(voices, lang) {
  const list = voices || [];
  for (const [want, approx] of PREFS[lang] || []) {
    const w = norm(want);
    const hits = list.filter((v) => { const l = norm(v.lang); return l === w || (w.length === 2 && l.startsWith(w + '-')); });
    if (hits.length) {
      // a voice that works offline first, and one that sounds neural or from Google
      hits.sort((a, b) => score(b) - score(a));
      return { voice: hits[0], approx: !!approx };
    }
  }
  return null;
}
const score = (v) => (v.localService ? 1 : 0) + (/google|natural|neural|online/i.test(v.name || '') ? 2 : 0);

/** Split text at sentence ends, into pieces short enough for a speech engine (some stop after ~15 s). */
export function chunk(text, max = 170) {
  const sentences = String(text).split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    if (s.length <= max) { out.push(s); continue; }
    let cur = '';
    for (const part of s.split(/(?<=[,;:])\s+/)) {
      if ((cur + ' ' + part).trim().length > max && cur) { out.push(cur.trim()); cur = part; } else cur = (cur + ' ' + part).trim();
    }
    if (cur) out.push(cur);
  }
  return out;
}

// Characters per second of speech, used when nothing is being spoken (muted, or no voice).
const CPS = { en: 14.5, hi: 12.5, ne: 12.5 };
/** How long a text takes to say, in seconds. */
export function estimate(text, lang) { return Math.max(1.2, String(text).length / (CPS[lang] || 13) + 0.4); }

export class Narrator {
  constructor(synth = typeof window !== 'undefined' ? window.speechSynthesis : null) {
    this.synth = synth || null;
    this.muted = false;
    this.voices = [];
    this.rate = { en: 0.96, hi: 0.92, ne: 0.9 };
    this._gen = 0;
    this.onVoices = null;
    if (this.synth) {
      const load = () => { this.voices = this.synth.getVoices() || []; if (this.onVoices) this.onVoices(); };
      load();
      if (this.synth.addEventListener) this.synth.addEventListener('voiceschanged', load);
      else this.synth.onvoiceschanged = load;
    }
  }

  get supported() { return !!this.synth && typeof SpeechSynthesisUtterance !== 'undefined'; }

  /** What the narrator will do for a language: { ok, approx, name }. */
  status(lang) {
    if (!this.supported) return { ok: false, approx: false, name: '' };
    const p = pickVoice(this.voices, lang);
    return p ? { ok: true, approx: p.approx, name: p.voice.name } : { ok: false, approx: false, name: '' };
  }

  /**
   * Say a text. Returns a handle { done, started, cancel() }. Nothing is spoken when muted or when
   * there is no voice; the handle then never starts, and the caller counts the estimated time.
   */
  speak(text, lang) {
    const h = { done: false, started: false, silent: true, cancel: () => {} };
    if (this.muted || !this.supported) return h;
    const pick = pickVoice(this.voices, lang);
    if (!pick) return h;
    h.silent = false;
    const myGen = ++this._gen;
    const parts = chunk(text);
    let i = 0, cancelled = false;
    h.cancel = () => { cancelled = true; h.done = true; };
    const next = () => {
      if (cancelled || myGen !== this._gen) return;
      if (i >= parts.length) { h.done = true; return; }
      const u = new SpeechSynthesisUtterance(parts[i++]);
      u.voice = pick.voice; u.lang = pick.voice.lang || lang; u.rate = this.rate[lang] || 1; u.pitch = 1; u.volume = 1;
      u.onstart = () => { h.started = true; };
      u.onend = next;
      u.onerror = (e) => { if (cancelled || myGen !== this._gen) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; next(); };
      this.synth.speak(u);
    };
    // a cancel straight before a speak can swallow it in some browsers, so wait a moment
    this.synth.cancel();
    setTimeout(next, 70);
    return h;
  }

  stop() { this._gen++; if (this.synth) this.synth.cancel(); }
}
