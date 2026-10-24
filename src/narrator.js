// The narrator speaks with the browser's own voices (the Web Speech API): no audio files, no server.
// English and Hindi have voices on most devices. Nepali has one on many Android phones and in Microsoft
// Edge, but often not elsewhere, so when there is no Nepali voice the narrator uses a Hindi one (the
// two share a script, so it reads the text, but the pronunciation is only approximate) and says so.
//
// How natural a voice sounds depends on the voice, not on this code: the "Natural" and "Online" voices
// in Edge, the Google voices in Chrome and the "Enhanced" and "Premium" voices on Apple devices sound
// far better than the basic built-in ones. So the narrator ranks the voices a device has and takes the
// best one for the language, and the page lets you pick another.
//
// The pure parts (choosing a voice, splitting text, estimating how long it takes) are exported
// so they can be tested without a browser. While it speaks, the narrator also feeds a LipSync, which
// the character's mouth follows.
import { LipSync } from './lipsync.js';

export const LANGS = ['en', 'hi', 'ne'];

// For each language: the voice languages that will do, with a small bonus for how well they suit the
// audience (Indian English first), and whether they only stand in for the language.
const REGIONS = {
  en: [['en-in', 4], ['en-gb', 3], ['en-au', 2], ['en-us', 2], ['en', 1]],
  hi: [['hi-in', 4], ['hi', 3]],
  ne: [['ne-np', 4], ['ne-in', 3], ['ne', 2]],
};
const STAND_IN = { ne: [['hi-in', 2], ['hi', 1]] };   // used only when there is no Nepali voice at all

const norm = (s) => String(s || '').replace('_', '-').toLowerCase();

/** How good a voice sounds, judged from its name. Higher is better. */
export function quality(v) {
  const n = String((v && v.name) || '');
  let q = 0;
  if (/natural|neural|wavenet|studio|multilingual/i.test(n)) q += 9;
  if (/online/i.test(n)) q += 3;
  if (/google/i.test(n)) q += 5;
  if (/premium|enhanced|siri/i.test(n)) q += 5;
  if (/espeak|festival|flite|compact|robot/i.test(n)) q -= 8;
  if (v && v.localService) q += 1;
  return q;
}

function regionScore(v, list) {
  const l = norm(v.lang);
  for (const [tag, bonus] of list) { if (l === tag || (tag.length === 2 && l.startsWith(tag + '-'))) return bonus; }
  return -1;
}

/**
 * Voices that can speak a language, best first: [{ voice, approx, score }]. `approx` marks a stand-in
 * (a Hindi voice for Nepali), which is only offered when there is no voice for the language itself.
 */
export function rankVoices(voices, lang) {
  const list = voices || [];
  const rank = (spec, approx) => list
    .map((voice) => { const r = regionScore(voice, spec); return r < 0 ? null : { voice, approx, score: r + quality(voice) }; })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const own = rank(REGIONS[lang] || [], false);
  if (own.length || !STAND_IN[lang]) return own;
  return rank(STAND_IN[lang], true);
}

/** The best voice for a language from a list of voices, or null. `prefer` is a voice name chosen by the listener. */
export function pickVoice(voices, lang, prefer = '') {
  const ranked = rankVoices(voices, lang);
  if (prefer) { const hit = ranked.find((r) => r.voice.name === prefer); if (hit) return { voice: hit.voice, approx: hit.approx }; }
  return ranked.length ? { voice: ranked[0].voice, approx: ranked[0].approx } : null;
}

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
export function estimate(text, lang, speed = 1) { return Math.max(1.2, String(text).length / ((CPS[lang] || 13) * speed) + 0.4); }

export class Narrator {
  constructor(synth = typeof window !== 'undefined' ? window.speechSynthesis : null) {
    this.synth = synth || null;
    this.muted = false;
    this.voices = [];
    this.rate = { en: 0.96, hi: 0.93, ne: 0.9 };
    this.speed = 1;                       // the listener's speed, 0.8 to 1.2
    this.prefer = { en: '', hi: '', ne: '' };
    this.lip = new LipSync();
    this._gen = 0;
    this.onVoices = null;
    this.onBlocked = null;                // called when the browser refuses to speak before the page is touched
    this.blocked = false;
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
    const p = pickVoice(this.voices, lang, this.prefer[lang]);
    return p ? { ok: true, approx: p.approx, name: p.voice.name } : { ok: false, approx: false, name: '' };
  }

  /** The voices a listener can choose from for a language. */
  choices(lang) { return rankVoices(this.voices, lang).map((r) => ({ name: r.voice.name, lang: r.voice.lang, approx: r.approx, score: r.score })); }

  /**
   * Say a text. Returns a handle { done, started, cancel() }. Nothing is spoken when muted or when
   * there is no voice; the handle then never starts, and the caller counts the estimated time.
   */
  speak(text, lang) {
    const h = { done: false, started: false, silent: true, blocked: false, cancel: () => {} };
    if (this.muted || !this.supported) return h;
    const pick = pickVoice(this.voices, lang, this.prefer[lang]);
    if (!pick) return h;
    h.silent = false;
    const myGen = ++this._gen;
    const parts = chunk(text);
    let i = 0, cancelled = false;
    const rate = (this.rate[lang] || 1) * this.speed;
    h.cancel = () => { cancelled = true; h.done = true; this.lip.end(); };
    const next = () => {
      if (cancelled || myGen !== this._gen) return;
      if (i >= parts.length) { h.done = true; this.lip.end(); return; }
      const piece = parts[i++];
      const u = new SpeechSynthesisUtterance(piece);
      u.voice = pick.voice; u.lang = pick.voice.lang || lang; u.rate = rate; u.pitch = 1; u.volume = 1;
      u.onstart = () => { h.started = true; if (myGen === this._gen) this.lip.begin(piece, (CPS[lang] || 13) * rate / (this.rate[lang] || 1)); };
      u.onboundary = (e) => { if (myGen === this._gen && (!e.name || e.name === 'word')) this.lip.boundary(e.charIndex); };
      u.onend = next;
      u.onerror = (e) => {
        if (cancelled || myGen !== this._gen) return;
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        // the browser will not speak until the page has been touched: say so, and let the caller count the time
        if (e && e.error === 'not-allowed') { this.blocked = true; h.blocked = true; this.lip.end(); this.onBlocked?.(); return; }
        next();
      };
      this.synth.speak(u);
    };
    // a cancel straight before a speak can swallow it in some browsers, so wait a moment
    this.synth.cancel();
    setTimeout(next, 70);
    return h;
  }

  stop() { this._gen++; this.lip.end(); if (this.synth) this.synth.cancel(); }
}
