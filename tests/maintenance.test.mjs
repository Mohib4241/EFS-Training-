import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPractice,reducePractice,SCRUB_DURATION_MS,HAND_AREAS,BAG_ZONES,bagObjectPose,bagDropAction} from '../src/maintenance-state.js';
const act=(state,type,extra={})=>reducePractice(state,{type,...extra}).state;
function readyToScrub(){let s=initialPractice('hands');for(const type of ['tap','wet','tap','soap'])s=act(s,type);return s;}
function openBag(){let s=act(initialPractice('bag'),'isolate');for(const clip of ['left','right'])s=act(s,'unclip',{clip});return act(s,'open');}
function bagToDispose(){let s=openBag();for(const type of ['remove','seal'])s=act(s,type);return s;}
test('dust bag scenario starts above the user training trigger and cannot open before isolation',()=>{
 const s=initialPractice('bag');assert.equal(s.fill,80);assert.ok(s.fill>70);assert.equal(s.newBag,'shelf');assert.equal(s.usedBag,'fitted');
 const blocked=reducePractice(s,{type:'open'});assert.equal(blocked.state.headOpen,false);assert.equal(blocked.state.phase,'isolate');assert.match(blocked.message,/unplug/);
 assert.equal(act(s,'fit').newBag,'shelf');
});
test('a bag cannot be binned before sealing or replaced before the old one is disposed',()=>{
 let s=openBag();s=act(s,'remove');assert.equal(act(s,'dispose').usedBag,'removed');assert.equal(act(s,'fit').newBag,'shelf');
 s=act(s,'seal');s=act(s,'select',{item:'new'});const blocked=reducePractice(s,{type:'transfer',target:'bin'});assert.equal(blocked.state.usedBag,'sealed');assert.match(blocked.message,/clean bag/);
});
test('bag source/destination actions complete the correct isolated replacement sequence',()=>{
 let s=bagToDispose();s=act(s,'select',{item:'used'});s=act(s,'transfer',{target:'bin'});assert.equal(s.usedBag,'disposed');assert.equal(s.phase,'fit');
 assert.equal(act(s,'transfer',{target:'machine'}).newBag,'shelf');
 s=act(s,'select',{item:'new'});s=act(s,'transfer',{target:'machine'});assert.equal(s.fill,0);assert.equal(s.newBag,'fitted');s=act(s,'close');assert.equal(s.complete,false);for(const clip of ['left','right'])s=act(s,'secure',{clip});
 assert.equal(s.complete,true);assert.equal(s.headOpen,false);assert.equal(s.isolated,true);assert.equal(s.usedBag,'disposed');assert.deepEqual(act(s,'reset'),initialPractice('bag'));
});
test('soap and rinse cannot bypass wetting or the scrub stage',()=>{
 let s=initialPractice('hands');assert.equal(act(s,'soap').soap,false);s=act(s,'tap');s=act(s,'wet');assert.equal(act(s,'soap').soap,false);s=act(s,'tap');s=act(s,'soap');assert.equal(s.phase,'scrub');assert.equal(act(s,'rinse').phase,'scrub');
});
test('scrubbing requires at least20 real elapsed seconds, not click count',()=>{
 let s=readyToScrub();for(const area of HAND_AREAS)s=act(s,'surface',{area});s=act(s,'rub',{now:1000});
 for(let i=0;i<20;i++)s=act(s,'surface',{area:'palms'});assert.equal(s.phase,'scrub');assert.equal(s.rubElapsedMs,0);
 s=act(s,'tick',{now:20_999});assert.equal(s.rubElapsedMs,19_999);assert.equal(s.phase,'scrub');
 s=act(s,'tick',{now:21_000});assert.equal(s.rubElapsedMs,SCRUB_DURATION_MS);assert.equal(s.phase,'rinse');assert.equal(s.rubStartedAt,null);
});
test('all named hand areas are required even after the timer has reached20 seconds',()=>{
 let s=readyToScrub();s=act(s,'rub',{now:500});s=act(s,'tick',{now:20_500});assert.equal(s.phase,'scrub');assert.equal(s.rubStartedAt,null);
 for(const area of HAND_AREAS.slice(0,3))s=act(s,'surface',{area});assert.equal(s.phase,'scrub');s=act(s,'surface',{area:'nails'});assert.equal(s.phase,'rinse');
});
test('pausing excludes hidden time and resume uses only accumulated scrub time',()=>{
 let s=readyToScrub();for(const area of HAND_AREAS)s=act(s,'surface',{area});s=act(s,'rub',{now:1000});s=act(s,'pause',{now:6000});assert.equal(s.rubElapsedMs,5000);
 s=act(s,'tick',{now:100_000});assert.equal(s.rubElapsedMs,5000);assert.equal(s.phase,'scrub');s=act(s,'rub',{now:100_000});s=act(s,'tick',{now:114_999});assert.equal(s.phase,'scrub');s=act(s,'tick',{now:115_000});assert.equal(s.phase,'rinse');
});
test('completion requires rinse, clean towel, drying before towel tap-off',()=>{
 let s=readyToScrub();for(const area of HAND_AREAS)s=act(s,'surface',{area});s=act(s,'rub',{now:1});s=act(s,'tick',{now:20_001});assert.equal(act(s,'rinse').phase,'rinse');
 s=act(s,'tap');s=act(s,'rinse');assert.equal(act(s,'dry').complete,false);assert.equal(act(s,'tap').tapOn,true);s=act(s,'towel');assert.equal(act(s,'tap').tapOn,true);s=act(s,'dry');assert.equal(s.dried,true);assert.equal(s.phase,'tapoff');assert.equal(s.complete,false);assert.equal(s.tapOn,true);s=act(s,'tap');assert.equal(s.complete,true);assert.equal(s.tapOn,false);assert.equal(s.wet,false);
 assert.deepEqual(act(s,'reset'),initialPractice('hands'));
});
test('invalid time and unknown hand areas are rejected',()=>{
 const s=readyToScrub();assert.throws(()=>act(s,'rub',{now:NaN}),RangeError);assert.throws(()=>act(s,'rub',{now:-1}),RangeError);assert.throws(()=>act(s,'surface',{area:'unknown'}),RangeError);
});
test('connector inspection requires isolation, all observations and a fault report',()=>{
 let s=initialPractice('terminals');assert.equal(act(s,'inspect',{area:'heat'}).checks.length,0);s=act(s,'isolate');s=act(s,'inspect',{area:'heat'});assert.equal(act(s,'decide',{choice:'report'}).complete,false);
 s=act(s,'inspect',{area:'pins'});s=act(s,'inspect',{area:'cable'});assert.equal(s.phase,'decide');const wrong=reducePractice(s,{type:'decide',choice:'clear'});assert.equal(wrong.state.complete,false);assert.match(wrong.message,/heat mark/);
 s=act(s,'decide',{choice:'report'});assert.equal(s.complete,true);assert.equal(s.isolated,true);assert.deepEqual(act(s,'reset'),initialPractice('terminals'));
});

test('head requires two released clips and completion requires two secured clips',()=>{
 const initial=initialPractice('bag');let s=act(initial,'isolate');s=act(s,'unclip',{clip:'left'});assert.equal(act(s,'open').headOpen,false);assert.equal(initial.clips.left,true);
 s=act(s,'unclip',{clip:'right'});s=act(s,'open');assert.equal(s.headOpen,true);assert.equal(act(s,'secure',{clip:'left'}).clips.left,false);
 assert.throws(()=>act(s,'unclip',{clip:'unknown'}),RangeError);
});
test('drag targets accept only the correct object and phase',()=>{
 let s=act(initialPractice('bag'),'isolate');for(const clip of ['left','right'])s=act(s,'unclip',{clip});
 assert.equal(bagDropAction(s,'head',{x:450,y:470}),null);
 let drop=bagDropAction(s,'head',{x:825,y:150});assert.deepEqual(drop,{type:'open'});s=reducePractice(s,drop).state;
 assert.equal(bagDropAction(s,'used',{x:900,y:500}),null);drop=bagDropAction(s,'used',{x:265,y:425});assert.deepEqual(drop,{type:'remove'});s=reducePractice(s,drop).state;s=act(s,'seal');
 assert.deepEqual(bagDropAction(s,'used',{x:900,y:500}),{type:'dispose',item:'used'});assert.equal(bagDropAction(s,'fresh',{x:500,y:400}),null);
 s=act(s,'dispose',{item:'used'});drop=bagDropAction(s,'fresh',{x:500,y:400});assert.deepEqual(drop,{type:'fit',item:'new'});s=reducePractice(s,drop).state;
 assert.deepEqual(bagDropAction(s,'head',{x:500,y:270}),{type:'close'});assert.equal(bagObjectPose(s,'head').x,680);
 assert.throws(()=>bagDropAction(s,'head',{x:NaN,y:20}),RangeError);
});
