import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPractice,reducePractice} from '../src/maintenance-state.js';
const act=(state,type,extra={})=>reducePractice(state,{type,...extra}).state;
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
