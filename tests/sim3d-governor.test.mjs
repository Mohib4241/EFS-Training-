import test from 'node:test';
import assert from 'node:assert/strict';
import {createGovernor} from '../src/sim3d/governor.js';

test('the governor steps resolution down when frames run slow, one level at a time',()=>{
 const g=createGovernor();assert.equal(g.pixelRatio,1.75);const changes=[];
 for(let i=0;i<600;i++){const r=g.sample(40);if(r!==null)changes.push(r);}
 assert.deepEqual(changes,[1.25,1,0.8],'steps down through each level, then holds at the floor');
 assert.equal(g.pixelRatio,0.8);
});

test('it does not react to a healthy frame rate or to isolated hitches',()=>{
 const g=createGovernor();let changed=false;
 for(let i=0;i<500;i++){const ms=i%40===0?60:12;if(g.sample(ms)!==null)changed=true;}
 assert.equal(changed,false,'one slow frame in forty is not a reason to degrade');
 assert.equal(g.pixelRatio,1.75);
});

test('it climbs back after a sustained calm stretch, but not at once',()=>{
 const g=createGovernor();for(let i=0;i<200;i++)g.sample(40);assert.ok(g.pixelRatio<1.75);
 const low=g.pixelRatio;let up=null,frames=0;
 for(let i=0;i<2000&&up===null;i++){up=g.sample(10);frames++;}
 assert.ok(up>low,'it recovered');assert.ok(frames>=200,'only after a long calm run, not immediately: '+frames);
});

test('stalls from hidden tabs and the display cap are respected',()=>{
 const g=createGovernor();for(let i=0;i<300;i++)assert.equal(g.sample(900),null,'a 900 ms stall is ignored');
 const capped=createGovernor();let last=null;for(let i=0;i<300;i++){const r=capped.sample(40,1);if(r!==null)last=r;}
 assert.ok(last<=1,'never exceeds the device cap');
 assert.equal(createGovernor().sample(NaN),null);
});
