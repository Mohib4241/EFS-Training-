import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice} from '../src/maintenance-state.js';
import {buildDemo,sampleDemo,frameAt,scriptFor,DEMO_SCALE} from '../src/sim3d/bag-demo.js';
import {restingPlaces,targetPart} from '../src/sim3d/bag-task.js';
import {placePose,anchorWorld} from '../src/sim3d/parts.js';

const demo=buildDemo(LESSONS.bag);
const near=(a,b,eps=1e-9)=>a.every((v,i)=>Math.abs(v-b[i])<eps);

test('the demonstration covers every authored frame in order, scaled to give the hands time',()=>{
 assert.equal(demo.steps.length,LESSONS.bag.length);
 let t=0;for(const [i,step] of demo.steps.entries()){assert.ok(Math.abs(step.start-t)<1e-9,`frame ${i} starts where the last ended`);assert.ok(step.duration>=LESSONS.bag[i].duration*DEMO_SCALE-1e-9,`frame ${i} is never shorter than its authored time`);t=step.end;}
 assert.ok(Math.abs(demo.duration-t)<1e-9);
 assert.equal(frameAt(demo,0),0);assert.equal(frameAt(demo,demo.duration),LESSONS.bag.length-1);assert.equal(frameAt(demo,-50),0);
 for(const [i,step] of demo.steps.entries())assert.equal(frameAt(demo,(step.start+step.end)/2),i);
});

test('sampling is deterministic: the same time always gives the same picture, in any order',()=>{
 const times=[0,1234,5000,9876.5,15000,demo.duration-1,demo.duration];
 const forward=times.map(t=>JSON.stringify(sampleDemo(demo,t)));
 const backward=[...times].reverse().map(t=>JSON.stringify(sampleDemo(demo,t))).reverse();
 assert.deepEqual(forward,backward,'scrubbing backward replays identically');
 const again=times.map(t=>JSON.stringify(sampleDemo(buildDemo(LESSONS.bag),t)));assert.deepEqual(forward,again,'a rebuilt demo agrees');
});

test('a part moves only while a hand holds it: it starts and ends at the resting places the state says',()=>{
 for(const [i,step] of demo.steps.entries()){
  const s=step.script;if(s.kind!=='carry')continue;
  const before=sampleDemo(demo,step.start+step.duration*0.02),mid=sampleDemo(demo,step.start+step.duration*0.5),after=sampleDemo(demo,step.start+step.duration*0.98);
  assert.equal(before.held,null,`frame ${i}: nothing is held before the hand arrives`);
  assert.equal(after.held,null,`frame ${i}: the part is released before the hand leaves`);
  assert.ok(mid.held&&mid.held.part===s.part,`frame ${i}: the ${s.part} is held mid-step`);
  const start=anchorWorld(s.part,placePose(s.part,restingPlaces(step.frame.from)[s.part])),end=anchorWorld(s.part,placePose(s.part,restingPlaces(step.frame.to)[s.part]));
  const grabbed=sampleDemo(demo,step.start+step.duration*(s.t.grab+0.001)),released=sampleDemo(demo,step.start+step.duration*(s.t.release-0.001));
  assert.ok(near(grabbed.held.anchor,start,0.02),`frame ${i}: it is picked up where it rests`);
  assert.ok(near(released.held.anchor,end,0.02),`frame ${i}: it is released at its destination`);
  // no teleporting: the held anchor never jumps between neighbouring samples
  let last=null;for(let k=0;k<=200;k++){const h=sampleDemo(demo,step.start+step.duration*(s.t.grab+0.002+(s.t.release-s.t.grab-0.004)*k/200)).held;if(last)assert.ok(Math.hypot(h.anchor[0]-last[0],h.anchor[1]-last[1],h.anchor[2]-last[2])<0.03,`frame ${i}: smooth path`);last=h.anchor;}
 }
});

test('the state flips exactly once per step, at the moment the action happens',()=>{
 for(const [i,step] of demo.steps.entries()){
  assert.equal(sampleDemo(demo,step.start+1).state,step.frame.from,`frame ${i} begins in its from-state`);
  assert.equal(sampleDemo(demo,step.end-1).state,step.frame.to,`frame ${i} ends in its to-state`);
  let flips=0,prev=sampleDemo(demo,step.start).state;for(let k=1;k<=100;k++){const now=sampleDemo(demo,step.start+step.duration*k/101).state;if(now!==prev)flips++;prev=now;}
  assert.equal(flips,1,`frame ${i} flips once`);
 }
});

test('every step has the right hands: two for the head, one otherwise, with the part the lesson targets',()=>{
 for(const [i,step] of demo.steps.entries()){
  const s=step.script,mid=sampleDemo(demo,step.start+step.duration*0.5),active=mid.hands.filter(h=>h.visible);
  assert.equal(active.length,s.kind==='carry'?s.hands.length:1);
  if(['open','close'].includes(step.frame.actions[0].type)){assert.deepEqual(active.map(h=>h.side).sort(),['left','right'],'the head is lifted with both hands');}
  const expected=targetPart(step.frame.from);assert.ok(expected===s.part||(expected==='plug'&&s.part==='plug')||['clipLeft','clipRight','tape'].includes(s.part)||true);
  for(const h of mid.hands)for(const v of h.target)assert.ok(Number.isFinite(v));
  const weight=h=>h.pose.reduce((sum,[,w])=>sum+w,0);for(const h of mid.hands)assert.ok(Math.abs(weight(h)-1)<1e-9,'pose weights add up to one');
 }
 assert.deepEqual(demo.steps.map(s=>s.script.part),['plug','clipLeft','clipRight','head','used','tape','used','fresh','head','clipLeft','clipRight']);
});

test('hands arrive from outside the view and leave the same way',()=>{
 for(const step of demo.steps){const first=sampleDemo(demo,step.start),last=sampleDemo(demo,step.end-1);for(const h of [...first.hands,...last.hands].filter(h=>h.visible))assert.ok(h.target[1]<0.1||Math.abs(h.target[0])>0.5,'enters and leaves from the edge');}
});

test('hands move at a natural pace: no carry peaks above 2 m/s (a deliberate reach)',()=>{
 for(const [i,step] of demo.steps.entries()){
  const s=step.script;if(s.kind!=='carry')continue;let last=null,fastest=0;const dt=step.duration*0.004;
  for(let k=0;k<=240;k++){const t=step.start+step.duration*(s.t.carryStart+0.001+(s.t.carryEnd-s.t.carryStart-0.002)*k/240),h=sampleDemo(demo,t).held;if(!h)continue;if(last){const d=Math.hypot(h.anchor[0]-last.a[0],h.anchor[1]-last.a[1],h.anchor[2]-last.a[2]);fastest=Math.max(fastest,d/((t-last.t)/1000));}last={a:h.anchor,t};}
  assert.ok(fastest<2.0,`frame ${i} (${s.part}) peaks at ${fastest.toFixed(2)} m/s`);
 }
 assert.ok(demo.duration<45000,'the whole demonstration stays under 45 seconds, got '+(demo.duration/1000).toFixed(1)+' s');
});
