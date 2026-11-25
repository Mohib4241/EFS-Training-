import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,initialLesson,advanceLesson,stepLesson,lessonPosition} from '../src/maintenance-lessons.js';
import {initialPractice} from '../src/maintenance-state.js';
test('all four authored lessons reach their correct demonstrated outcomes',()=>{
 assert.deepEqual(Object.keys(LESSONS),['bag','terminals','filter','wet-filter']);
 for(const frames of Object.values(LESSONS)){assert.ok(frames.length>=5);assert.equal(frames[0].start,0);assert.equal(frames.at(-1).to.complete,true);for(const frame of frames){assert.ok(frame.title&&frame.caption);assert.ok(frame.duration>0);}}
 assert.equal(LESSONS.bag.at(-1).to.clips.left,true);assert.equal(LESSONS.bag.at(-1).to.clips.right,true);
});
test('paused playback does not advance or unlock practice',()=>{
 const lesson=initialLesson();assert.equal(advanceLesson('bag',lesson,100_000),lesson);
 const playing={...lesson,started:true,playing:true};const partial=advanceLesson('bag',playing,1000);assert.equal(partial.complete,false);assert.equal(lessonPosition('bag',partial).step,0);
 const complete=advanceLesson('bag',partial,100_000);assert.equal(complete.complete,true);assert.equal(complete.playing,false);
 assert.deepEqual(initialPractice('bag').usedBag,'fitted');assert.equal(initialPractice('bag').complete,false);
});
test('manual lesson steps provide a reduced-motion path without jumping to practice completion',()=>{
 let lesson=initialLesson();lesson=stepLesson('bag',lesson,1);assert.equal(lessonPosition('bag',lesson).step,1);assert.equal(lesson.complete,false);
 for(let i=1;i<LESSONS.bag.length;i++)lesson=stepLesson('bag',lesson,1);assert.equal(lesson.complete,true);
 lesson=stepLesson('bag',lesson,-1);assert.equal(lesson.complete,false);assert.equal(lesson.playing,false);
 assert.throws(()=>advanceLesson('bag',lesson,NaN),RangeError);assert.throws(()=>stepLesson('bag',lesson,3),RangeError);
});

test('every vacuum maintenance task is fully available in Hinglish, not only the first',async()=>{
 const {TASKS,tasksFor}=await import('../src/sim3d/tasks/index.js');
 const {LESSONS}=await import('../src/maintenance-lessons.js');
 const {initialPractice}=await import('../src/maintenance-state.js');
 for(const machine of ['junior-103','junior-429']){
  const list=tasksFor(machine,'hinglish'),english=tasksFor(machine,'english');
  assert.equal(list.length,3);
  for(const [i,{kind,title}] of list.entries()){
   if(kind!=='filter'&&kind!=='wet-filter')assert.notEqual(title,english[i].title,`${machine} ${kind}: the tab title is in Hinglish`);
   for(const frame of LESSONS[kind])assert.ok(frame.titleHi&&frame.captionHi,`${kind}: "${frame.title}" has Hinglish`);
   const task=TASKS[kind],en=task.steps('english'),hi=task.steps('hinglish');
   assert.equal(hi.length,en.length);en.forEach(([id,label],n)=>{assert.equal(hi[n][0],id);assert.notEqual(hi[n][1],label,`${kind} step ${id} is in Hinglish`);});
   const state=initialPractice(kind);
   assert.notDeepEqual(task.instructions(state,'hinglish'),task.instructions(state,'english'),`${kind}: the instruction is in Hinglish`);
  }
 }
 // every instruction of the two newer tasks, including the finished one, has Hinglish
 for(const kind of ['bag','terminals']){
  const task=TASKS[kind];
  for(const phase of task.steps('english').map(([id])=>id).concat('done')){
   const state={...initialPractice(kind),phase,complete:phase==='done'};
   assert.notDeepEqual(task.instructions(state,'hinglish'),task.instructions(state,'english'),`${kind} ${phase}`);
  }
 }
});
