// Lip-sync without audio analysis. The browser's speech engine plays the sound itself, so the page
// cannot hear it; what it does know is the text being spoken, and (for most voices) when each word
// starts. From that the mouth is driven in two steps:
//
//   1. `visemes(text)` turns the text into mouth shapes in order: an open "aa", a wide "ee", a round
//      "oo", closed lips for m, b and p, and so on. It reads Latin letters and Devanagari (Hindi and
//      Nepali) letters, vowel signs included.
//   2. `LipSync` walks along that list while the voice speaks, at the speed of the voice, and jumps to
//      the right place each time the engine reports a word boundary, so the mouth does not drift.
//
// It is a good approximation, not a measurement: the mouth opens and closes with each syllable and
// shapes itself to the vowel, which is what a viewer reads as "talking".

// Mouth shapes: how far it opens (0 to 1), how wide it stretches and how much the lips purse.
export const SHAPES = {
  rest: { open: 0, wide: 0.7, round: 0 },
  aa: { open: 1.0, wide: 0.55, round: 0 },
  a: { open: 0.55, wide: 0.6, round: 0 },     // a short, neutral vowel (the "a" built into a Devanagari consonant)
  ee: { open: 0.5, wide: 0.95, round: 0 },
  ii: { open: 0.26, wide: 1.0, round: 0 },
  oo: { open: 0.66, wide: 0.05, round: 0.85 },
  uu: { open: 0.22, wide: 0.0, round: 1.0 },
  closed: { open: 0.0, wide: 0.45, round: 0 }, // m, b, p
  fv: { open: 0.1, wide: 0.8, round: 0 },     // f, v: the lip meets the teeth
  nasal: { open: 0.16, wide: 0.6, round: 0 },
};

const isDev = (c) => c >= 0x0900 && c <= 0x097f;
const DEV_INDEP = { 0x905: 'a', 0x906: 'aa', 0x907: 'ii', 0x908: 'ii', 0x909: 'uu', 0x90a: 'uu', 0x90b: 'ii', 0x90f: 'ee', 0x910: 'ee', 0x911: 'oo', 0x913: 'oo', 0x914: 'oo', 0x90d: 'ee', 0x912: 'oo' };
const DEV_MATRA = { 0x93e: 'aa', 0x93f: 'ii', 0x940: 'ii', 0x941: 'uu', 0x942: 'uu', 0x943: 'ii', 0x947: 'ee', 0x948: 'ee', 0x94b: 'oo', 0x94c: 'oo', 0x949: 'oo', 0x945: 'ee' };
const DEV_LIPS = new Set([0x92a, 0x92b, 0x92c, 0x92d, 0x92e]);   // प फ ब भ म
const DEV_CONS = (c) => (c >= 0x915 && c <= 0x939) || (c >= 0x958 && c <= 0x95f);
const VIRAMA = 0x94d, NASALS = new Set([0x901, 0x902, 0x903]);

const LATIN_VOWEL = { a: 'aa', e: 'ee', i: 'ii', o: 'oo', u: 'uu', y: 'ii' };
const PAIRS = { ee: 'ii', ea: 'ii', ie: 'ii', oo: 'uu', ou: 'oo', ow: 'oo', oa: 'oo', ai: 'ee', ay: 'ee', ei: 'ee', au: 'oo', aw: 'oo', oi: 'oo', ue: 'uu', io: 'oo' };

/**
 * The mouth shapes for a text, in order: [{ i, j, v }], where [i, j) are the characters that make the
 * shape and `v` is a key of SHAPES. Pauses (spaces, commas, full stops) are shapes too.
 */
export function visemes(text) {
  const t = String(text), out = [];
  const push = (i, j, v) => out.push({ i, j, v });
  let k = 0;
  while (k < t.length) {
    const c = t.charCodeAt(k), ch = t[k].toLowerCase();
    if (isDev(c)) {
      if (DEV_INDEP[c]) { push(k, k + 1, DEV_INDEP[c]); k++; continue; }
      if (DEV_CONS(c)) {
        if (DEV_LIPS.has(c)) push(k, k + 1, 'closed');
        const nx = t.charCodeAt(k + 1);
        if (DEV_MATRA[nx]) { push(k + 1, k + 2, DEV_MATRA[nx]); k += 2; continue; }
        if (nx === VIRAMA) { k += 2; continue; }                 // the consonant carries no vowel: it joins the next one
        push(k, k + 1, 'a'); k++; continue;
      }
      if (NASALS.has(c)) { push(k, k + 1, 'nasal'); k++; continue; }
      if (c === 0x964 || c === 0x965) { push(k, k + 1, 'rest'); k++; continue; }      // । ॥
      k++; continue;
    }
    if (LATIN_VOWEL[ch]) {                                       // a run of vowels is one syllable
      let e = k + 1; while (e < t.length && LATIN_VOWEL[t[e].toLowerCase()]) e++;
      const run = t.slice(k, e).toLowerCase();
      push(k, e, run.length >= 2 && PAIRS[run.slice(0, 2)] ? PAIRS[run.slice(0, 2)] : LATIN_VOWEL[run[0]]);
      k = e; continue;
    }
    if ('bmp'.includes(ch)) { push(k, k + 1, 'closed'); k++; continue; }
    if ('fv'.includes(ch)) { push(k, k + 1, 'fv'); k++; continue; }
    if (ch === 'w') { push(k, k + 1, 'uu'); k++; continue; }
    if (ch === 'n' || ch === 'm') { push(k, k + 1, 'nasal'); k++; continue; }
    if (ch === ' ' || ch === '\n') { push(k, k + 1, 'rest'); k++; continue; }
    if (',;:.!?'.includes(ch)) { push(k, k + 1, 'rest'); k++; continue; }
    k++;
  }
  return out;
}

const REST = SHAPES.rest;

export class LipSync {
  constructor() {
    this.active = false;
    this.text = ''; this.ev = []; this.pos = 0; this.cps = 13; this.hasBoundary = false;
    this.wordEnd = 0; this._lastB = null;
    this.out = { ...REST, talking: false };
  }

  /** Start a piece of speech. `cps` is the expected number of characters per second. */
  begin(text, cps = 13) {
    this.text = String(text); this.ev = visemes(this.text);
    this.pos = 0; this.cps = cps; this.hasBoundary = false; this._lastB = null; this.active = true;
    this._wordEnd(0);
  }

  _wordEnd(from) {
    let e = from; while (e < this.text.length && !/[\s,.;:!?।]/.test(this.text[e])) e++;
    this.wordEnd = e;
  }

  /** The engine says a word starts at this character. */
  boundary(charIndex, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (!this.active || !(charIndex >= 0)) return;
    if (this._lastB) {                                       // learn how fast this voice really is
      const dt = (now - this._lastB.t) / 1000, dc = charIndex - this._lastB.i;
      if (dt > 0.05 && dc > 0) this.cps = Math.min(26, Math.max(6, this.cps * 0.55 + (dc / dt) * 0.45));
    }
    this._lastB = { i: charIndex, t: now };
    this.hasBoundary = true;
    this.pos = charIndex; this._wordEnd(charIndex);
  }

  end() { this.active = false; this.out = { ...REST, talking: false }; this.pos = 0; }

  /** Advance by dt seconds; returns { open, wide, round, talking }. */
  update(dt) {
    const o = this.out;
    if (!this.active) { Object.assign(o, REST, { talking: false }); return o; }
    // keep up with the voice; once a word is finished, wait at its end for the engine to start the next
    this.pos += this.cps * dt;
    const limit = this.hasBoundary ? this.wordEnd + 0.35 : this.text.length;
    if (this.pos > limit) this.pos = limit;
    // the shape under the read position
    const ev = this.ev; let cur = null;
    for (let n = 0; n < ev.length; n++) { if (ev[n].j <= this.pos) continue; if (ev[n].i <= this.pos) cur = ev[n]; break; }
    let shape = REST, env = 0.25;
    if (cur) {
      shape = SHAPES[cur.v] || REST;
      const span = Math.max(1, cur.j - cur.i), f = (this.pos - cur.i) / span;
      env = cur.v === 'rest' || cur.v === 'closed' ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, f * 0.9 + 0.05))), 0.6);
    } else if (this.pos >= this.wordEnd) env = 0;              // waiting between words
    o.open = shape.open * (shape === REST ? 1 : env + (shape.open > 0 ? 0.12 : 0));
    o.wide = shape.wide; o.round = shape.round; o.talking = true;
    if (shape === SHAPES.closed) o.open = 0;
    return o;
  }
}
