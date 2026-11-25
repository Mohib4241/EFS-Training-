import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNarrator,speechChunks,voiceForLanguage,soundPreference} from '../src/guidance.js';
import {vacuumModules,vacuumPartList,scrubberModule} from '../src/soft-content.js';
import {initialState,transition} from '../src/machine-state.js';
import {initialPractice,reducePractice} from '../src/maintenance-state.js';
import {FILTER_CARE_INTERVAL,filterCareSteps,filterInstruction,filterGrabbable,initialFilterCare} from '../src/filter-care.js';
import {guideFrames,moveGuide,partNameSpeech,partAbout} from '../src/guide-content.js';
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
test('filter care has twelve steps, with Hinglish copy',()=>{
 assert.equal(filterCareSteps('hinglish').length,12);assert.match(filterInstruction({phase:'fit'},'hinglish')[0],/Wahi clean filter/);
});
test('one guide follows the numbered steps on the right, in English and Hinglish',()=>{
 const m=vacuumModules['junior-103'],en=guideFrames('guide',m),hi=guideFrames('guide',m,'hinglish');
 assert.deepEqual(en.map(f=>f.id),['inside','point','outside','connect','run','see','isolate','next']);
 assert.deepEqual(en.map(f=>f.target),['inside','canvas','inside','startup','startup','inside','startup','maintenance']);
 assert.match(en[3].caption,/button 1: Connect plug/);assert.match(guideFrames('guide',{id:'megger',kind:'megger'})[3].caption,/Connect virtual leads/);
 assert.match(guideFrames('guide',{id:'motor-3ph',kind:'three'}).at(-1).title,/Experiment, Maintenance/);assert.match(en.at(-1).title,/Step 3 · Maintenance checklist/);
 assert.ok(!en.some(f=>/\{connect/.test(f.caption)),'no unfilled wording');
 assert.ok(!en.some(f=>/pinch|scroll/i.test(f.caption)),'opening is the View inside step, never a pinch or scroll');
 assert.match(hi[1].caption,/Cursor ko kisi bhi part par le jao/);assert.match(hi[1].spokenHi,/[\u0900-\u097f]/);
 for(const kind of ['guide','page','machine'])for(const language of ['english','hinglish'])for(const f of guideFrames(kind,m,language))assert.ok(f.caption&&f.title&&f.duration>=5200&&f.target);
 const inspection=guideFrames('guide',{id:'motor-3ph'},'english',true);assert.doesNotMatch(inspection.map(f=>f.caption).join(' '),/bag|filter|Hold/);assert.equal(inspection.at(-1).gesture,'point');
 assert.deepEqual(moveGuide(0,-1,8),{index:0,complete:false});assert.deepEqual(moveGuide(7,1,8),{index:7,complete:true});assert.throws(()=>moveGuide(8,1,8),RangeError);assert.throws(()=>guideFrames('other',m),RangeError);
 // pointing at a part reads only its name; what it does is shown, not read out
 const part={name:'Motor head',body:'The head holds the motor. More detail follows here.'};
 assert.deepEqual(partNameSpeech(part,'english'),{text:'Motor head',spokenHi:null});
 assert.equal(partNameSpeech(part,'hinglish').text,'Yeh Motor head hai.');
 assert.equal(partAbout(part),'The head holds the motor.','the description shown beside the cursor');
 assert.equal(partAbout({body:''}),'');
});
test('Hinglish uses mixed-script speech with a Hindi voice and Roman speech when unavailable',()=>{
 const calls=[],voices=[{name:'Hindi',lang:'hi-IN',localService:true},{name:'UK',lang:'en-GB',localService:true}];
 const n=createNarrator({synth:{cancel(){},getVoices:()=>voices,speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}}});n.setEnabled(true);n.setLanguage('hinglish');n.speak('Yeh motor head hai.','Motor head','यह motor head है।');assert.equal(calls[0].text,'यह motor head है।');assert.equal(calls[0].lang,'hi-IN');
 voices.shift();n.speak('Yeh motor head hai.','Motor head','यह motor head है।');assert.equal(calls[1].text,'Yeh motor head hai.');
 assert.equal(voiceForLanguage([{lang:'en-US'},{lang:'en-IN'}],'hinglish').lang,'en-IN');assert.equal(voiceForLanguage([{lang:'fr-FR'}],'english'),null);assert.throws(()=>n.setLanguage('hindi'),RangeError);
});
test('blocked maintenance feedback covers the existing bag, hand and connector paths',()=>{
 for(const [kind,action] of [['bag',{type:'fit'}],['terminals',{type:'inspect',area:'pins'}]])assert.equal(reducePractice(initialPractice(kind),action).blocked,true);
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

test('the voice is on by default in English, and stays off only if the learner turned it off',()=>{
 const store=value=>({getItem:key=>key==='efs-guide-sound'?value:null});
 assert.equal(soundPreference(store(null)),true,'nothing saved: on');assert.equal(soundPreference(store('on')),true);assert.equal(soundPreference(store('off')),false,'a learner who turned it off stays off');
 assert.equal(soundPreference({getItem(){throw new Error('blocked');}}),true,'storage that cannot be read does not silence the guide');
 const synth={cancel(){},speak(){},getVoices(){return [{name:'Daniel',lang:'en-GB',localService:true},{name:'Lekha',lang:'hi-IN',localService:true}];}};
 const narrator=createNarrator({synth,Utterance:class{constructor(text){this.text=text;}}});narrator.setEnabled(soundPreference(store(null)));
 assert.equal(narrator.enabled,true);assert.equal(narrator.language,'english','the voice language starts as English');
});

test('a browser that refuses speech before any click or key press holds the words back and says them after the first click',()=>{
 const statuses=[],blockedEvents=[];let spoken;const synth={cancel(){},speak(u){spoken=u;},getVoices(){return [{name:'Daniel',lang:'en-GB',localService:true}];}};
 const narrator=createNarrator({synth,Utterance:class{constructor(text){this.text=text;}},onStatus:v=>statuses.push(v),onBlocked:v=>blockedEvents.push(v)});narrator.setEnabled(true);
 const done=[];narrator.speak('Meet your machine.','guide',null,ok=>done.push(ok));spoken.onerror({error:'not-allowed'});
 assert.equal(narrator.blocked,true);assert.equal(narrator.pending,true,'the words are kept');assert.deepEqual(done,[],'nothing is reported as finished while the voice is held back');assert.match(statuses.at(-1),/as soon as the browser allows/);assert.equal(narrator.enabled,true,'sound stays on');assert.deepEqual(blockedEvents,[true]);
 // the first click or key press: the same words are spoken, not lost
 assert.equal(narrator.retryBlocked(),true);assert.equal(spoken.text,'Meet your machine.');spoken.onstart();assert.equal(narrator.blocked,false,'speech working again clears the notice');assert.deepEqual(blockedEvents,[true,false]);
 spoken.onend();assert.deepEqual(done,[true],'finished once it has all been said');
});

test('speech cut off by newer speech reports false, and a finished one reports true',()=>{
 const calls=[];const n=createNarrator({synth:{cancel(){},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}}});n.setEnabled(true);
 const first=[],second=[];n.speak('First sentence.','a',null,ok=>first.push(ok));n.speak('Second sentence.','b',null,ok=>second.push(ok));
 assert.deepEqual(first,[false],'the first was interrupted');calls[1].onend();assert.deepEqual(second,[true]);
 const third=[];n.speak('Third.','c',null,ok=>third.push(ok));n.stop();assert.deepEqual(third,[false],'stopping reports it was not finished');
});

test('a request made right after a cancel waits a moment, and a swallowed request is asked once more',()=>{
 const pending=new Map(),watchdogs=[];let next=0;const calls=[];let cancels=0;let busy=false;
 const n=createNarrator({synth:{cancel(){cancels++;},get speaking(){return busy;},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}},delay:fn=>{pending.set(++next,fn);return next;},clearDelay:id=>pending.delete(id),watchDelay:fn=>{watchdogs.push(fn);return watchdogs.length;},watchClear:()=>{}});
 n.setEnabled(true);busy=true;n.speak('After a switch.','k');assert.equal(calls.length,0,'waits while the browser is still tidying up');
 [...pending.values()][0]();assert.equal(calls.length,1);
 // nothing starts: the watchdog cancels and asks again, once
 busy=false;watchdogs.at(-1)();assert.equal(calls.length,1,'it waits a moment after cancelling before asking again');[...pending.values()].at(-1)();assert.equal(calls.length,2,'asked once more');assert.equal(calls[1].text,'After a switch.');
 watchdogs.at(-1)();[...pending.values()].at(-1)();assert.equal(calls.length,3,'and a second time');watchdogs.at(-1)();assert.equal(calls.length,3,'then it gives up rather than looping');
});

test('a part name is never cut off by moving away, and a name not yet started is dropped cleanly',()=>{
 const pending=new Map();let next=0,cancels=0;const calls=[];
 const n=createNarrator({synth:{cancel(){cancels++;},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}},delay:fn=>{pending.set(++next,fn);return next;},clearDelay:id=>pending.delete(id)});
 n.setEnabled(true);cancels=0;
 // pointing at a part waits a moment, then speaks
 n.hover('Collection tank','Collection tank');assert.equal(calls.length,0);
 // leaving before it started: nothing is said, and it reports that the name was dropped
 assert.equal(n.hoverEnd(),true);assert.equal(pending.size,0);assert.equal(calls.length,0);
 // pointing again speaks; leaving while it is being spoken lets it finish (no cancel)
 n.hover('Collection tank','Collection tank');[...pending.values()][0]();assert.equal(calls.length,1);calls[0].onstart?.();
 const before=cancels;assert.equal(n.hoverEnd(),false);assert.equal(cancels,before,'the name in progress is not cancelled');
 assert.equal(n.lastKey,null,'so the same part can be named again later');
});

test('the voice is ready fast after a reload, and checklist steps never talk over the guide',async()=>{
 const {HOVER_MS}=await import('../src/guidance.js');assert.ok(HOVER_MS<=120,'a hovered part is named quickly');
 // the voice list is requested as soon as the narrator exists, and a silent warm-up runs once
 let asked=0;const spoken=[];const synth={cancel(){},getVoices:()=>{asked++;return [{lang:'en-GB',localService:true}];},speak:u=>spoken.push(u)};
 const n=createNarrator({synth,Utterance:class{constructor(t){this.text=t;}}});assert.ok(asked>=1,'voices requested up front');
 n.setEnabled(true);n.warmUp();n.warmUp();assert.equal(spoken.length,1,'one warm-up only');assert.equal(spoken[0].volume,0,'the warm-up is silent');
 const src=readFileSync(new URL('../src/guidance.js',import.meta.url),'utf8');
 assert.match(src,/function speakStep\(text,key,onDone\)\{if\(tour\)return false;/,'checklist steps wait while a guide is open');
 assert.match(readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),/onSay:\(text,key,done\)=>guidance\.speakStep\(text,key,done\)/);
});

test('a guide card with a recording plays it, and the browser voice is only the fallback',async()=>{
 const {clipSources,findClip,clipText,clipKey}=await import('../src/guide-audio.js');
 const {guideFrames}=await import('../src/guide-content.js');
 const {existsSync}=await import('node:fs');
 // every guide card, in both languages, for every kind of machine, has its recording on disk
 const sources=clipSources();assert.ok(sources.length>=30);
 for(const {key,text} of sources)assert.ok(existsSync(new URL(`../src/assets/audio/${key}.mp3`,import.meta.url)),`recording for: ${text.slice(0,50)}`);
 const manifest=Object.fromEntries(sources.map(({key})=>[key,`/static/audio/${key}.mp3`]));
 for(const language of ['english','hinglish'])for(const maintenance of [false,true])for(const frame of guideFrames('guide',{id:'junior-103'},language,maintenance))assert.ok(findClip(manifest,language,frame),`${language} ${frame.id}`);
 assert.equal(findClip(manifest,'english',{title:'Something new',caption:'No recording yet.'}),null,'unrecorded wording falls back to the voice');
 // playing: ends -> done(true); the browser voice stays silent
 const played=[],spoken=[];let audio;
 class FakeAudio{constructor(){audio=this;}play(){played.push(this.src);return Promise.resolve();}pause(){this.paused=true;}}
 const n=createNarrator({synth:{cancel(){},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>spoken.push(u)},Utterance:class{constructor(t){this.text=t;}},AudioPlayer:FakeAudio});n.setEnabled(true);
 const done=[];n.speak('Step 1','k',null,ok=>done.push(ok),'/static/audio/a.mp3');
 assert.deepEqual(played,['/static/audio/a.mp3']);assert.equal(spoken.length,0);audio.onplaying();audio.onended();assert.deepEqual(done,[true]);
 // a recording that cannot be loaded is read by the voice instead
 n.speak('Words to read','k2',null,ok=>done.push(ok),'/static/audio/missing.mp3');audio.onerror();assert.equal(spoken.at(-1).text,'Words to read');
 // stopping silences the recording and reports it was cut off
 n.speak('Step 3','k3',null,ok=>done.push(ok),'/static/audio/c.mp3');n.stop();assert.equal(audio.paused,true);assert.equal(done.at(-1),false);
 // refused before any click: kept, then played after the first click
 let refuse=true;const plays=[];class Blocked{constructor(){audio=this;}play(){plays.push(this.src);return refuse?Promise.reject(Object.assign(new Error('no'),{name:'NotAllowedError'})):Promise.resolve();}pause(){}}
 const b=createNarrator({synth:{cancel(){},getVoices:()=>[],speak(){}},Utterance:class{},AudioPlayer:Blocked});b.setEnabled(true);const d2=[];
 b.speak('Hello','k',null,ok=>d2.push(ok),'/static/audio/b.mp3');await Promise.resolve();await Promise.resolve();
 assert.equal(b.blocked,true);assert.equal(b.pending,true);assert.deepEqual(d2,[]);refuse=false;b.retryBlocked();assert.equal(plays.length,2);await Promise.resolve();audio.onplaying();assert.equal(b.blocked,false);audio.onended();assert.deepEqual(d2,[true]);
});

test('leaving a page silences the guide at once and checks again, without cutting off newer speech',()=>{
 const later=[];let cancels=0,pauses=0;const calls=[];
 class Player{play(){return Promise.resolve();}pause(){pauses++;}}
 const n=createNarrator({synth:{cancel(){cancels++;},getVoices:()=>[{lang:'en-GB',localService:true}],speak:u=>calls.push(u)},Utterance:class{constructor(t){this.text=t;}},AudioPlayer:Player,watchDelay:fn=>{later.push(fn);return later.length;},watchClear:()=>{}});
 n.setEnabled(true);n.speak('Guide words','k',null,null,'/static/audio/a.mp3');
 const done=[];n.speak('More words','k2',null,ok=>done.push(ok),'/static/audio/b.mp3');
 cancels=0;pauses=0;later.length=0;n.silence();assert.ok(cancels>=1&&pauses>=1,'stopped at once');assert.deepEqual(done,[false]);
 assert.equal(later.length,3,'three later checks');const before=cancels;later.forEach(fn=>fn());assert.equal(cancels,before+3,'each check cancels again');
 // something new starts speaking after leaving: the later checks leave it alone
 later.length=0;n.silence();n.speak('Next page words','k3',null,null);const c=cancels;later.slice(0,3).forEach(fn=>fn());assert.equal(cancels,c,'new speech is not cut off');
});
