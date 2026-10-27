import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrator,speechChunks} from '../src/guidance.js';
import {vacuumModules,vacuumPartList,scrubberModule} from '../src/soft-content.js';
import {initialState,transition} from '../src/machine-state.js';
import {initialPractice,reducePractice,bagDropAction} from '../src/maintenance-state.js';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialInspection,reduceInspection} from '../src/hard-models.js';
import {initialScrubber,reduceScrubber,scrubberResult} from '../src/scrubber-state.js';

test('voice is opt-in, debounced, deduplicated and cancelled on off or navigation',()=>{
 const calls=[],pending=new Map(),statuses=[];let next=0;
 const synth={cancel(){calls.push('cancel');},speak(u){calls.push(u);u.onstart();},getVoices(){return [{name:'local',lang:'en-GB',localService:true}];}};
 const n=createNarrator({synth,Utterance:class{constructor(text){this.text=text;}},onStatus:v=>statuses.push(v),delay:fn=>{pending.set(++next,fn);return next;},clearDelay:id=>pending.delete(id)});
 assert.equal(n.speak('Off'),false);assert.equal(n.enabled,false);n.setEnabled(true);
 n.hover('First part','first');n.hover('Second part','second');assert.equal(pending.size,1);const fn=[...pending.values()][0];pending.clear();fn();
 const speech=calls.filter(c=>typeof c==='object');assert.equal(speech.length,1);assert.equal(speech[0].text,'Second part');assert.equal(speech[0].voice.name,'local');n.hover('Second part','second');assert.equal(pending.size,0);
 n.setEnabled(false);const count=calls.length;speech[0].onend();assert.equal(calls.length,count);assert.equal(statuses.at(-1),'Sound off');n.setEnabled(true);n.hover('Pending','pending');n.stop();assert.equal(pending.size,0);
});
test('voice failures leave written guides usable and long speech advances in short chunks',()=>{
 const fallback=[];const none=createNarrator({synth:null,Utterance:null,onStatus:v=>fallback.push(v)});assert.equal(none.setEnabled(true),false);assert.match(fallback[0],/unavailable/);
 const text=Array(300).fill('filter').join(' '),chunks=speechChunks(text);assert.ok(chunks.length>1);assert.ok(chunks.every(s=>s.length<=260));assert.equal(chunks.join(' '),text);
 const calls=[],statuses=[];const n=createNarrator({synth:{cancel(){},getVoices:()=>[],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}},onStatus:v=>statuses.push(v)});n.setEnabled(true);n.speak(text);assert.equal(calls.length,1);calls[0].onend();assert.equal(calls.length,2);calls[1].onerror({error:'synthesis-unavailable'});assert.match(statuses.at(-1),/Audio unavailable/);n.stop();
});
test('wet and dry references have separate tool/filter lessons and no invented battery charge',()=>{
 assert.match(vacuumPartList('junior-429','dry').find(p=>p.id==='tool').name,/Combination/);assert.match(vacuumPartList('junior-429','wet').find(p=>p.id==='tool').name,/wet squeegee/);
 assert.equal(vacuumModules['junior-103'].category,'Dry');assert.equal(vacuumModules['junior-429'].category,'Wet');
 assert.match(vacuumModules['junior-103'].parts.find(p=>p.id==='filter').name,/Textile/);assert.match(vacuumModules['junior-429'].parts.find(p=>p.id==='filter').body,/cannot establish/);
 assert.ok(vacuumModules['junior-429'].parts.some(p=>p.id==='float'));assert.equal(scrubberModule.kind,'scrubber');assert.equal(scrubberModule.parts.length,16);
 for(const m of [...Object.values(vacuumModules),scrubberModule]){assert.equal(new Set(m.parts.map(p=>p.id)).size,m.parts.length);for(const p of m.parts)assert.ok(p.body&&p.why&&p.motion);}
 assert.match(scrubberModule.parts.find(p=>p.id==='controls').why,/not a battery percentage/);
});
test('changing wet/dry configuration stops and isolates; floor settings and reset remain authoritative',()=>{
 let s=initialState('junior-429');assert.equal(s.pickupMode,'wet');s=transition(s,{type:'plug'}).state;s=transition(s,{type:'power'}).state;assert.equal(s.running,true);s=transition(s,{type:'pickup',value:'dry'}).state;assert.equal(s.running,false);assert.equal(s.connected,false);assert.equal(s.pickupMode,'dry');s=transition(s,{type:'floor',value:'soft'}).state;assert.equal(s.floorMode,'soft');s=transition(s,{type:'reset'}).state;assert.equal(s.variant,'junior-429');assert.equal(s.pickupMode,'wet');assert.throws(()=>transition(initialState(),{type:'pickup',value:'wet'}),RangeError);assert.throws(()=>transition(s,{type:'floor',value:'other'}),RangeError);
});
test('both filter tasks require ordered isolation, clip release, inspection and correct selection',()=>{
 for(const kind of ['filter','wet-filter']){
  let s=initialPractice(kind);const early=reducePractice(s,{type:'open'});assert.equal(early.blocked,true);assert.deepEqual(early.state,s);
  for(const a of [{type:'isolate'},{type:'unclip',clip:'left'},{type:'unclip',clip:'right'},{type:'open'},{type:'remove'},{type:'inspect'}])s=reducePractice(s,a).state;
  const wrong=reducePractice(s,{type:'choose',choice:'wrong'});assert.equal(wrong.blocked,true);assert.equal(wrong.state.phase,'choose');s=reducePractice(s,{type:'choose',choice:'correct'}).state;
  assert.deepEqual(bagDropAction(s,'fresh',{x:500,y:450}),{type:'fit',item:'new'});
  for(const a of [{type:'fit'},{type:'close'},{type:'secure',clip:'left'},{type:'secure',clip:'right'}])s=reducePractice(s,a).state;
  assert.equal(s.complete,true);assert.equal(s.isolated,true);assert.equal(s.newBag,'fitted');assert.equal(s.headOpen,false);assert.equal(LESSONS[kind].at(-1).to.complete,true);
 }
});
test('blocked maintenance feedback covers the existing bag, hand and connector paths',()=>{
 for(const [kind,action] of [['bag',{type:'fit'}],['hands',{type:'soap'}],['terminals',{type:'inspect',area:'pins'}]])assert.equal(reducePractice(initialPractice(kind),action).blocked,true);
 let i=initialInspection();assert.equal(reduceInspection(i,{type:'practice'},scrubberModule).blocked,true);for(let n=0;n<5;n++)i=reduceInspection(i,{type:'step',direction:1},scrubberModule).state;i=reduceInspection(i,{type:'practice'},scrubberModule).state;assert.equal(reduceInspection(i,{type:'check',id:'filter'},scrubberModule).blocked,true);
 i=reduceInspection(i,{type:'isolate'},scrubberModule).state;assert.equal(reduceInspection(i,{type:'check',id:'filter'},scrubberModule).blocked,true);for(const c of scrubberModule.checks)i=reduceInspection(i,{type:'check',id:c.part},scrubberModule).state;assert.equal(reduceInspection(i,{type:'report',choice:'clear'},scrubberModule).blocked,true);assert.equal(reduceInspection(i,{type:'report',choice:'report'},scrubberModule).state.complete,true);
});
test('scrubber preserves separate functions and isolates whenever opened',()=>{
 let s=initialScrubber();assert.equal(reduceScrubber(s,{type:'run'}).blocked,true);s=reduceScrubber(s,{type:'connect'}).state;s=reduceScrubber(s,{type:'run'}).state;s=reduceScrubber(s,{type:'input',key:'suction',value:false}).state;assert.equal(s.running,true);assert.deepEqual(scrubberResult(s).requested,['brush','solution']);assert.match(scrubberResult(s).explanation,/does not recover/);s=reduceScrubber(s,{type:'open',value:50}).state;assert.equal(s.running,false);assert.equal(s.connected,false);assert.equal(reduceScrubber(s,{type:'connect'}).blocked,true);assert.throws(()=>reduceScrubber(s,{type:'input',key:'__proto__',value:true}),RangeError);
});
