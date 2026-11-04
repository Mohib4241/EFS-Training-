// Small floating notes about a part: how much of its text to show, how long a note stays, and how notes stack. Pure, so it can be tested.
export const NOTE_MS=10000;            // a note removes itself after ten seconds
export const MAX_NOTES=3;              // and at most this many are on screen at once (the newest first)

// The first sentence or two of a text, short enough for a small note.
export function brief(text,max=150){
 const t=String(text??'').replace(/\s+/g,' ').trim(),sentences=t.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)||[];
 let out='';
 for(const sentence of sentences){const next=(out?`${out} `:'')+sentence.trim();if(out&&next.length>max)break;out=next;}
 return out.length>max?`${out.slice(0,max-1).replace(/[\s,;:]+\S*$/,'')}…`:out;
}
// The notes to show after `key` is added: newest first, and showing a part again refreshes its note instead of stacking a copy.
export const pushNote=(keys,key,max=MAX_NOTES)=>[key,...keys.filter(k=>k!==key)].slice(0,max);
