import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrator,speechChunks,voiceForLanguage} from '../src/guidance.js';
import {vacuumModules,vacuumPartList,scrubberModule} from '../src/soft-content.js';
import {initialState,transition} from '../src/machine-state.js';
import {initialPractice,reducePractice,bagDropAction} from '../src/maintenance-state.js';
import {FILTER_CARE_INTERVAL,FILTER_ZONES,filterCareSteps,filterObjectPose,filterDropAction,filterInstruction,filterGrabbable,initialFilterCare} from '../src/filter-care.js';
import {guideFrames,moveGuide,partNameSpeech} from '../src/guide-content.js';
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
test('voice failures leave visual guides usable and long speech advances in short chunks',()=>{
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
test('weekly filter care rinses and refits the same filter, with washability and dry gates',()=>{
 assert.equal(FILTER_CARE_INTERVAL.days,7);assert.match(FILTER_CARE_INTERVAL.source,/not an OEM/);
 for(const kind of ['filter','wet-filter']){
  let s=initialPractice(kind);const early=reducePractice(s,{type:'open'});assert.equal(early.blocked,true);assert.deepEqual(early.state,s);
  const apply=a=>{const before=structuredClone(s),out=reducePractice(s,a);assert.deepEqual(s,before,'reducer must not mutate previous state');s=out.state;return out;};
  for(const a of [{type:'isolate'},{type:'unclip',clip:'left'},{type:'unclip',clip:'right'},{type:'open'},{type:'remove'}])apply(a);
  assert.equal(s.filter,'tray');assert.equal(apply({type:'inspect',choice:'paper'}).blocked,true);assert.equal(s.phase,'inspect');assert.equal(apply({type:'tap'}).blocked,true);
  apply({type:'inspect',choice:'washable'});assert.equal(apply({type:'wash'}).blocked,true);apply({type:'tap'});apply({type:'wash'});
  assert.equal(s.filter,'sink');assert.equal(s.wet,true);assert.equal(apply({type:'rack'}).blocked,true);apply({type:'tap'});apply({type:'rack'});
  assert.equal(s.filter,'rack');assert.equal(apply({type:'fit'}).blocked,true);apply({type:'dry'});assert.equal(s.wet,true,'preview alone does not declare a dry filter');
  assert.equal(apply({type:'confirm-dry',choice:'wet'}).blocked,true);apply({type:'confirm-dry',choice:'dry'});assert.equal(s.dryConfirmed,true);assert.equal(s.wet,false);
  apply({type:'fit'});assert.equal(s.filter,'tank');assert.equal(apply({type:'secure',clip:'left'}).blocked,true);
  for(const a of [{type:'close'},{type:'secure',clip:'left'},{type:'secure',clip:'right'}])apply(a);
  assert.equal(s.complete,true);assert.equal(s.isolated,true);assert.equal(s.waterOn,false);assert.equal(s.headOpen,false);assert.equal('newBag' in s,false);assert.equal('usedBag' in s,false);
  assert.equal(LESSONS[kind].at(-1).to.complete,true);assert.equal(reducePractice(s,{type:'reset'}).state.filter,'tank');
 }
});
test('filter holding targets follow the washing sequence, without replacement or waste-bin targets',()=>{
 const actions={remove:['tray','remove'],wash:['sink','wash'],drain:['rack','rack'],fit:['machine','fit']};
 for(const [phase,[zone,type]] of Object.entries(actions)){
  const r=FILTER_ZONES[zone],s={...initialPractice('filter'),phase};assert.deepEqual(filterDropAction(s,'filter',{x:r.x+r.width/2,y:r.y+r.height/2}),{type});assert.equal(filterDropAction(s,'filter',{x:999,y:624}),null);
 }
 assert.equal(filterDropAction(initialPractice('filter'),'filter',{x:100,y:100}),null);assert.throws(()=>filterDropAction(initialPractice('filter'),'filter',{x:NaN,y:2}),RangeError);
 assert.deepEqual(filterObjectPose({...initialPractice('filter'),filter:'rack'},'filter'),{x:55,y:75,width:125,height:155,scale:1});assert.throws(()=>filterObjectPose(initialPractice('filter'),'fresh'),RangeError);
 assert.equal(filterCareSteps('hinglish').length,12);assert.match(filterInstruction({phase:'fit'},'hinglish')[0],/Wahi clean filter/);
});
test('visual tours explain actual controls in English and conversational Hinglish',()=>{
 const m=vacuumModules['junior-103'],en=guideFrames('page',m),hi=guideFrames('page',m,'hinglish');
 assert.deepEqual(en.map(f=>f.gesture),['drag','pinch-out','pinch-in','zoom-in','zoom-out','point']);assert.match(hi[1].caption,/Do fingers door karo/);assert.match(hi[1].spokenHi,/fingers/);assert.match(hi[1].spokenHi,/[\u0900-\u097f]/);
 for(const kind of ['page','machine'])for(const language of ['english','hinglish'])for(const f of guideFrames(kind,m,language))assert.ok(f.caption&&f.title&&f.duration>=5200&&f.target);
 const hard=guideFrames('machine',{id:'motor-3ph',kind:'motor'});assert.match(hard.find(f=>f.id==='identify').title,/component/);assert.doesNotMatch(hard.find(f=>f.id==='mechanism').caption,/suction/);const inspection=guideFrames('page',{id:'motor-3ph'},'english',true);assert.doesNotMatch(inspection.map(f=>f.caption).join(' '),/bag|filter|Hold/);assert.equal(inspection.at(-1).gesture,'point');
 assert.deepEqual(moveGuide(0,-1,6),{index:0,complete:false});assert.deepEqual(moveGuide(5,1,6),{index:5,complete:true});assert.throws(()=>moveGuide(6,1,6),RangeError);assert.throws(()=>guideFrames('other',m),RangeError);
 const part={name:'Motor head',body:'Long explanation is not a hover name'};assert.deepEqual(partNameSpeech(part,'english'),{text:'Motor head',spokenHi:null});assert.equal(partNameSpeech(part,'hinglish').text,'Yeh Motor head hai.');
});
test('Hinglish uses mixed-script speech with a Hindi voice and Roman speech when unavailable',()=>{
 const calls=[],voices=[{name:'Hindi',lang:'hi-IN',localService:true},{name:'UK',lang:'en-GB',localService:true}];
 const n=createNarrator({synth:{cancel(){},getVoices:()=>voices,speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}}});n.setEnabled(true);n.setLanguage('hinglish');n.speak('Yeh motor head hai.','Motor head','यह motor head है।');assert.equal(calls[0].text,'यह motor head है।');assert.equal(calls[0].lang,'hi-IN');
 voices.shift();n.speak('Yeh motor head hai.','Motor head','यह motor head है।');assert.equal(calls[1].text,'Yeh motor head hai.');
 assert.equal(voiceForLanguage([{lang:'en-US'},{lang:'en-IN'}],'hinglish').lang,'en-IN');assert.equal(voiceForLanguage([{lang:'fr-FR'}],'english'),null);assert.throws(()=>n.setLanguage('hindi'),RangeError);
});
test('blocked maintenance feedback covers the existing bag, hand and connector paths',()=>{
 for(const [kind,action] of [['bag',{type:'fit'}],['hands',{type:'soap'}],['terminals',{type:'inspect',area:'pins'}]])assert.equal(reducePractice(initialPractice(kind),action).blocked,true);
 let i=initialInspection();assert.equal(reduceInspection(i,{type:'practice'},scrubberModule).blocked,true);for(let n=0;n<5;n++)i=reduceInspection(i,{type:'step',direction:1},scrubberModule).state;i=reduceInspection(i,{type:'practice'},scrubberModule).state;assert.equal(reduceInspection(i,{type:'check',id:'filter'},scrubberModule).blocked,true);
 i=reduceInspection(i,{type:'isolate'},scrubberModule).state;assert.equal(reduceInspection(i,{type:'check',id:'filter'},scrubberModule).blocked,true);for(const c of scrubberModule.checks)i=reduceInspection(i,{type:'check',id:c.part},scrubberModule).state;assert.equal(reduceInspection(i,{type:'report',choice:'clear'},scrubberModule).blocked,true);assert.equal(reduceInspection(i,{type:'report',choice:'report'},scrubberModule).state.complete,true);
});
test('scrubber preserves separate functions and isolates whenever opened',()=>{
 let s=initialScrubber();assert.equal(reduceScrubber(s,{type:'run'}).blocked,true);s=reduceScrubber(s,{type:'connect'}).state;s=reduceScrubber(s,{type:'run'}).state;s=reduceScrubber(s,{type:'input',key:'suction',value:false}).state;assert.equal(s.running,true);assert.deepEqual(scrubberResult(s).requested,['brush','solution']);assert.match(scrubberResult(s).explanation,/does not recover/);s=reduceScrubber(s,{type:'open',value:50}).state;assert.equal(s.running,false);assert.equal(s.connected,false);assert.equal(reduceScrubber(s,{type:'connect'}).blocked,true);assert.throws(()=>reduceScrubber(s,{type:'input',key:'__proto__',value:true}),RangeError);
});
test('narration waits once for asynchronously loaded voices, without leaking listeners',()=>{
 const make=()=>{const calls=[],listeners=new Set(),pending=new Map();let next=0,voices=[];
  const synth={cancel(){},getVoices:()=>voices,speak:u=>calls.push(u),addEventListener:(type,fn)=>{if(type==='voiceschanged')listeners.add(fn);},removeEventListener:(type,fn)=>listeners.delete(fn)};
  const n=createNarrator({synth,Utterance:class{constructor(t){this.text=t;}},delay:fn=>{pending.set(++next,fn);return next;},clearDelay:id=>pending.delete(id)});
  return {calls,listeners,pending,n,setVoices:list=>{voices=list;}};};
 // voices arrive: the Hindi voice and text are used, and nothing is left registered
 let t=make();t.n.setEnabled(true);t.n.setLanguage('hinglish');t.n.speak('Yeh motor head hai.','Motor head','यह motor head है।');
 assert.equal(t.calls.length,0,'speech is held until voices are known');
 t.setVoices([{name:'Hindi',lang:'hi-IN',localService:true}]);[...t.listeners].forEach(fn=>fn());
 assert.equal(t.calls.length,1);assert.equal(t.calls[0].text,'यह motor head है।');assert.equal(t.calls[0].lang,'hi-IN');
 assert.equal(t.listeners.size,0,'listener removed once voices arrive');assert.equal(t.pending.size,0,'fallback timer cleared once voices arrive');
 // no voices ever arrive: speak after the fallback delay with the Roman text, and never wait again
 t=make();t.n.setEnabled(true);t.n.setLanguage('hinglish');t.n.speak('Yeh fan hai.','Fan','यह fan है।');assert.equal(t.calls.length,0);[...t.pending.values()].forEach(fn=>fn());
 assert.equal(t.calls.length,1);assert.equal(t.calls[0].text,'Yeh fan hai.');assert.equal(t.listeners.size,0);
 t.n.speak('Yeh pump hai.','Pump','यह pump है।');assert.equal(t.calls.length,2,'later speech is not delayed once voices were checked');
 // a newer request supersedes one still waiting, and the stale listener and timer are removed
 t=make();t.n.setEnabled(true);t.n.speak('One','One');assert.equal(t.listeners.size,1);t.n.speak('Two','Two');assert.equal(t.listeners.size,1,'only the newest request listens');assert.equal(t.pending.size,1);
 t.setVoices([{name:'UK',lang:'en-GB',localService:true}]);[...t.listeners].forEach(fn=>fn());
 assert.deepEqual(t.calls.map(c=>c.text),['Two']);assert.equal(t.listeners.size,0);assert.equal(t.pending.size,0);
 // stopping while waiting drops the listener without speaking
 t=make();t.n.setEnabled(true);t.n.speak('Three','Three');t.n.stop();assert.equal(t.listeners.size,0);assert.equal(t.pending.size,0);assert.equal(t.calls.length,0);
});
test('the filter can be grabbed only when the current step needs it moved',()=>{
 const at=(phase,extra={})=>({...initialFilterCare('filter'),phase,...extra});
 assert.equal(filterGrabbable(at('remove')),true);
 assert.equal(filterGrabbable(at('wash',{waterOn:false})),false,'turn the tap on before rinsing');assert.equal(filterGrabbable(at('wash',{waterOn:true})),true);
 assert.equal(filterGrabbable(at('drain',{waterOn:true})),false,'turn the tap off before draining');assert.equal(filterGrabbable(at('drain',{waterOn:false})),true);
 assert.equal(filterGrabbable(at('fit',{dryConfirmed:true,wet:false})),true);assert.equal(filterGrabbable(at('fit',{dryConfirmed:false})),false);assert.equal(filterGrabbable(at('fit',{dryConfirmed:true,wet:true})),false);
 for(const phase of ['isolate','release','open','inspect','dry','close'])assert.equal(filterGrabbable(at(phase)),false,`${phase} does not move the filter`);
});

test('guide speech is split at sentence ends into short pieces, and reports when the whole text has been spoken',()=>{
 const text='Lift the head onto the stool. '+Array(60).fill('hold the handle firmly,').join(' ')+' Then secure both clips.';
 const chunks=speechChunks(text);
 assert.ok(chunks.every(c=>c.length<=180),'no piece is long enough to be cut off');
 assert.equal(chunks.join(' ').replace(/\s+/g,' '),text.replace(/\s+/g,' '),'nothing is lost');
 assert.ok(chunks.some(c=>/^Lift the head onto the stool\./.test(c))&&chunks.at(-1).endsWith('Then secure both clips.'),'sentences stay whole');
 const calls=[];let finished=0;
 const n=createNarrator({synth:{cancel(){},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}}});
 n.setEnabled(true);n.speak(text,'k',null,()=>finished++);
 for(let i=0;i<chunks.length;i++){assert.equal(finished,0,'not finished while pieces remain');calls[i].onend();}
 assert.equal(finished,1,'finished once, after the last piece');
 const quiet=createNarrator({synth:{cancel(){},getVoices:()=>[],speak(){}},Utterance:class{}});let told=0;quiet.speak('x','k',null,()=>told++);assert.equal(told,1,'with sound off it reports done at once, so a tour never waits for silence');
});
