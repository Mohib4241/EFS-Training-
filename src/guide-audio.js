import {guideFrames} from './guide-content.js';
// Recorded voice for the Guide. Each guide card has one recording per language. A recording is found by a short hash of the
// exact words it says, so a card whose wording changes simply has no recording (the browser voice reads it instead) until
// scripts/make-guide-audio.py records the new words.
export function hashText(text){
 let a=0x811c9dc5,b=0x9e3779b1;
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a^=c;a=Math.imul(a,16777619);b=Math.imul(b^c,0x85ebca6b);b^=b>>>13;}
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')+text.length.toString(16);
}
// The words recorded for one guide card: English reads its title and caption; Hinglish reads the Devanagari line.
export const clipText=(language,frame)=>language==='hinglish'?(frame.audioHi||''):`${frame.title}. ${frame.caption}`;
export const clipKey=(language,text)=>`${language==='hinglish'?'hi':'en'}-${hashText(text)}`;
export function findClip(manifest,language,frame){const text=clipText(language,frame);return text&&manifest?manifest[clipKey(language,text)]||null:null;}
// Every line that needs a recording: all guide cards, in both languages, for each kind of machine and for the checklist guide.
const MACHINES=[{id:'junior-103',kind:'vacuum'},{id:'hyper-2000b',kind:'scrubber'},{id:'megger',kind:'megger'},{id:'multimeter',kind:'multimeter'},{id:'motor-1ph',kind:'single'}];
export function clipSources(){
 const found=new Map();
 for(const language of ['english','hinglish'])for(const machine of MACHINES)for(const maintenance of [false,true])for(const frame of guideFrames('guide',machine,language,maintenance)){
  const text=clipText(language,frame);if(!text)continue;const key=clipKey(language,text);if(!found.has(key))found.set(key,{key,language,text});
 }
 return [...found.values()];
}
