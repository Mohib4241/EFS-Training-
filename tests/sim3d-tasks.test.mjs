import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice,reducePractice} from '../src/maintenance-state.js';
import {buildDemo,sampleDemo,scripts,cameraAt} from '../src/sim3d/demo.js';
import {VIEW,WIDE,cameraPose} from '../src/sim3d/layout.js';
import {harness,doStep,makeWorld,zoneCentre} from './helpers/task-world.mjs';
import {task as bag} from '../src/sim3d/tasks/bag.js';

const TASKS=[[bag,'bag']];

for(const [task,kind] of TASKS){
 test(`${kind}: a learner can do the whole task in 3D, one correct move after another`,()=>{
  const h=harness(task,kind),kinds=[];
  for(let guard=0;!h.state.complete&&guard<40;guard++){const before=JSON.stringify(h.state);kinds.push(doStep(h,task));assert.notEqual(JSON.stringify(h.state),before,`step ${guard} (${kinds.at(-1)}) changed the state`);}
  assert.equal(h.state.complete,true,'complete');
  assert.equal(h.events.some(e=>e.blocked),false,'nothing was blocked on the correct path');
  assert.deepEqual(h.actions.filter(a=>!a.blocked).map(a=>a.type),LESSONS[kind].flatMap(frame=>frame.actions.map(a=>a.type)),'the same actions, in the authored order');
 });

 test(`${kind}: every authored frame names a usable part, and only the right part is usable`,()=>{
  for(const frame of LESSONS[kind]){
   const state=frame.from,part=task.rules.targetPart(state),choices=task.choices(state,'english');
   if(choices.length){assert.ok(choices.some(c=>c.correct),`${state.phase} has a correct choice`);continue;}
   assert.ok(part,`${state.phase} has a target`);assert.equal(task.rules.canGrab(state,part),true,`${state.phase}: ${part} usable`);
   const usable=[...task.rules.carry,...task.rules.press].filter(id=>task.rules.canGrab(state,id));
   if(!['release','secure'].includes(state.phase))assert.deepEqual(usable,[part],`${state.phase} offers exactly one part`);
  }
 });

 test(`${kind}: each destination is in view for its step at every stage shape`,()=>{
  for(const aspect of [1,1.4,1.8,2.2])for(const frame of LESSONS[kind]){
   const state=frame.from,zone=task.rules.targetZone(state),part=task.rules.targetPart(state);
   const world=makeWorld(task,()=>state,{aspect});
   if(part){const a=world.anchorScreen(part);assert.ok(Math.abs(a.nx)<=0.97&&Math.abs(a.ny)<=0.97,`${kind}/${state.phase} at ${aspect}: ${part} on screen (${a.nx.toFixed(2)},${a.ny.toFixed(2)})`);}
   if(zone){const [x,y]=zoneCentre(world,zone);assert.ok(Math.abs(x)<=0.95&&Math.abs(y)<=0.95,`${kind}/${state.phase} at ${aspect}: ${zone} on screen (${x.toFixed(2)},${y.toFixed(2)})`);}
  }
 });

 test(`${kind}: the demonstration covers every frame, is a pure function of time and ends finished`,()=>{
  const demo=buildDemo(LESSONS[kind],{script:frame=>task.script(frame,scripts),reduce:reducePractice});
  assert.equal(demo.steps.length,LESSONS[kind].length);
  const a=sampleDemo(demo,demo.duration*0.37),b=sampleDemo(demo,demo.duration*0.37);assert.deepEqual(JSON.stringify(a.hands),JSON.stringify(b.hands));
  assert.equal(sampleDemo(demo,demo.duration).state.complete,true);
  // hands never teleport: between samples 1/60 s apart a visible hand moves less than 4 cm
  let last=null;for(let t=0;t<demo.duration;t+=1000/60){const s=sampleDemo(demo,t);if(last&&s.index===last.index)for(const hand of s.hands){const prev=last.hands.find(x=>x.side===hand.side);if(hand.visible&&prev?.visible){const d=Math.hypot(...hand.target.map((v,k)=>v-prev.target[k]));assert.ok(d<0.04,`${kind} t=${t.toFixed(0)} ${hand.side} jumped ${d.toFixed(3)} m`);}}last=s;}
  // the camera starts wide and lands on each step's framing
  const cam=cameraAt(demo,0,task.focusFor);assert.equal(cam.from,'wide');
 });
}

test('bag: a short pull is not unplugging, and a wrong part says why',()=>{
 const h=harness(bag,'bag');h.pull('r','plug',[0.06,0]);assert.equal(h.state.isolated,false);assert.ok(h.messages.some(m=>/further/.test(m)));
 for(let t=0;t<1.4;t+=1/30)h.frame([]);const head=h.world.anchorScreen('head');for(let t=0;t<0.2;t+=1/30)h.frame([h.pointer('r',[head.nx,head.ny],true)]);h.frame([h.pointer('r',[head.nx,head.ny],false)]);
 assert.ok(h.messages.some(m=>/Not yet — first use the plug/.test(m)),h.messages.join(' | '));
});

test('framing maths: the wide view is the original composition, closer framings make the work bigger, blends are continuous',async()=>{
 const {mixFocus}=await import('../src/sim3d/layout.js');
 const pose=cameraPose(WIDE,1.8);assert.ok(Math.abs(pose.eye[2]-VIEW.eye[2])<0.02&&Math.abs(pose.eye[1]-VIEW.eye[1])<0.02,'wide matches the original camera');
 const size=focus=>{const c=new THREE.PerspectiveCamera(VIEW.fov,1.5,0.05,30),p=cameraPose(focus,1.5);c.position.set(...p.eye);c.lookAt(...p.look);c.updateMatrixWorld(true);c.updateProjectionMatrix();return new THREE.Vector3(0,0.62,0).project(c).y-new THREE.Vector3(0,0,0).project(c).y;};
 assert.ok(size(bag.FOCUS.clips)>size(WIDE)*1.45,'close-up on the clips shows the machine much larger');
 const a=bag.FOCUS.plug,b=bag.FOCUS.bin,close=(x,y)=>[x.c[0]-y.c[0],x.c[1]-y.c[1],x.w-y.w,x.h-y.h].every(d=>Math.abs(d)<1e-9);
 assert.ok(close(mixFocus(a,b,0),a)&&close(mixFocus(a,b,1),b));const m=mixFocus(a,b,0.5);assert.ok(m.w>a.w&&m.w<b.w);
});
