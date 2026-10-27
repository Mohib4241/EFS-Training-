import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,initialLesson,advanceLesson,stepLesson,lessonPosition} from '../src/maintenance-lessons.js';
import {initialPractice} from '../src/maintenance-state.js';
test('all five authored lessons reach their correct demonstrated outcomes',()=>{
 assert.deepEqual(Object.keys(LESSONS),['bag','hands','terminals','filter','wet-filter']);
 for(const frames of Object.values(LESSONS)){assert.ok(frames.length>=5);assert.equal(frames[0].start,0);assert.equal(frames.at(-1).to.complete,true);for(const frame of frames){assert.ok(frame.title&&frame.caption);assert.ok(frame.duration>0);}}
 assert.equal(LESSONS.bag.at(-1).to.clips.left,true);assert.equal(LESSONS.bag.at(-1).to.clips.right,true);
 assert.equal(LESSONS.hands.find(frame=>frame.gesture.scrub).duration,5000);
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
