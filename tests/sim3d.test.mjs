import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice} from '../src/maintenance-state.js';
import {filterCareSteps} from '../src/filter-care.js';
import {buildSteps,currentStep,stateBeforeStep,stateAfterStep} from '../src/sim3d/steps.js';
import {createLifecycle} from '../src/sim3d/lifecycle.js';
import {createPump} from '../src/sim3d/pump.js';

// The 2D checklist rows (src/maintenance.js bagSteps / handSteps / terminalSteps), by phase id.
const rows={
 bag:['isolate','release','open','remove','seal','dispose','fit','close','secure'],
 hands:['water','wet','soap','scrub','rinse','dry','tapoff'],
 terminals:['isolate','inspect','decide']
};
const stepList=kind=>rows[kind]?rows[kind].map(id=>[id,id]):filterCareSteps('english');

test('every authored lesson frame belongs to exactly one checklist step, in order',()=>{
 for(const kind of Object.keys(LESSONS)){
  const steps=buildSteps(stepList(kind),LESSONS[kind]);
  assert.equal(steps.flatMap(step=>step.frames).length,LESSONS[kind].length,kind);
  assert.deepEqual(steps.flatMap(step=>step.frames),LESSONS[kind],`${kind}: frames keep their authored order`);
 }
});

test('the lesson frames form one unbroken, deterministic state chain',()=>{
 for(const [kind,frames] of Object.entries(LESSONS)){
  assert.deepEqual(frames[0].from,initialPractice(kind),`${kind} starts from the initial practice state`);
  for(let i=1;i<frames.length;i++)assert.deepEqual(frames[i].from,frames[i-1].to,`${kind} frame ${i} continues from frame ${i-1}`);
  assert.equal(frames.at(-1).to.complete,true,`${kind} ends complete`);
 }
});

test('step checkpoints come from the authored frames and cannot be mutated through',()=>{
 for(const kind of Object.keys(LESSONS)){
  const steps=buildSteps(stepList(kind),LESSONS[kind]);
  assert.deepEqual(stateBeforeStep(steps,0,initialPractice(kind)),initialPractice(kind));
  for(let i=0;i<steps.length;i++){
   const before=stateBeforeStep(steps,i),after=stateAfterStep(steps,i);
   assert.equal(currentStep(steps,before),i,`${kind}: the state before step ${i} waits on step ${i}`);
   if(i<steps.length-1)assert.equal(currentStep(steps,after),i+1,`${kind}: finishing step ${i} moves to step ${i+1}`);else assert.equal(currentStep(steps,after),steps.length);
   if(i>0)assert.deepEqual(stateBeforeStep(steps,i),stateAfterStep(steps,i-1),`${kind}: steps join up`);
  }
  const copy=stateAfterStep(steps,0);copy.phase='tampered';assert.notEqual(steps[0].frames.at(-1).to.phase,'tampered');
 }
});

test('a step list that does not match the lesson frames is rejected',()=>{
 assert.throws(()=>buildSteps([['isolate','x']],LESSONS.bag),RangeError);
 assert.throws(()=>buildSteps([...rows.bag.map(id=>[id,id]),['nothing','x']],LESSONS.bag),RangeError);
});

test('lifecycle disposes every resource and listener once, newest cleanup first',()=>{
 const life=createLifecycle(),log=[];
 life.onCleanup(()=>log.push('first'));life.onCleanup(()=>{throw new Error('boom');});life.onCleanup(()=>log.push('last'));
 const a={dispose:()=>log.push('a')},b={dispose:()=>log.push('b')};life.own(a);life.own(b);life.release(b);
 let aborted=false;life.signal.addEventListener('abort',()=>{aborted=true;});
 const warn=console.warn;console.warn=()=>{};try{life.dispose();life.dispose();}finally{console.warn=warn;}
 assert.equal(aborted,true);assert.equal(life.disposed,true);
 assert.deepEqual(log,['b','last','first','a'],'released resource disposed immediately; failures do not stop teardown; second dispose is a no-op');
 const late={dispose:()=>log.push('late')};life.own(late);assert.equal(log.at(-1),'late','resources owned after disposal are disposed immediately');
 let ran=false;life.onCleanup(()=>{ran=true;});assert.equal(ran,true);
});

test('pump renders on demand, keeps going only while the scene moves and stops when hidden',()=>{
 const queue=new Map();let id=0,draws=0,moving=true;
 const pump=createPump(()=>{draws++;return moving;},{raf:fn=>{queue.set(++id,fn);return id;},caf:handle=>queue.delete(handle)});
 const run=time=>{const [handle,fn]=[...queue][0];queue.delete(handle);fn(time);};
 assert.equal(queue.size,0,'nothing is scheduled until something asks for a frame');
 pump.invalidate();pump.invalidate();assert.equal(queue.size,1,'invalidate coalesces');
 run(16);assert.equal(draws,1);assert.equal(queue.size,1,'a moving scene schedules the next frame');
 moving=false;run(32);assert.equal(draws,2);assert.equal(queue.size,0,'a settled scene stops rendering');
 moving=true;pump.invalidate();pump.setVisible(false);assert.equal(queue.size,0,'hiding cancels the pending frame');pump.invalidate();assert.equal(queue.size,0,'hidden views never schedule');
 pump.setVisible(true);assert.equal(queue.size,1,'showing again resumes');
 pump.stop();assert.equal(queue.size,0);pump.invalidate();assert.equal(queue.size,0,'a stopped pump stays stopped');
});
