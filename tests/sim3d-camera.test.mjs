import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice} from '../src/maintenance-state.js';
import {VIEW,PLACE,ZONES,FOCUS,FOCUS_OF_PHASE,cameraPose,mixFocus} from '../src/sim3d/layout.js';
import {placePose,anchorWorld} from '../src/sim3d/parts.js';
import {focusFor} from '../src/sim3d/bag-task.js';
import {buildDemo,cameraAt,CAMERA_MS} from '../src/sim3d/bag-demo.js';

const at=(part,place)=>anchorWorld(part,placePose(part,place)),mid=zone=>[(ZONES[zone][0]+ZONES[zone][1])/2,(ZONES[zone][2]+ZONES[zone][3])/2,PLACE.carryZ];
// What the learner must be able to see in each phase: the part, and where it has to go.
const SEEN={
 isolate:[at('plug','in'),[PLACE.plugOut[0],PLACE.plugOut[1],PLACE.plugOut[2]+0.3]],
 release:[at('clipLeft','locked'),at('clipRight','locked')],
 open:[at('head','seated'),mid('rest')],
 remove:[at('used','tank'),mid('tray')],
 seal:[at('tape','rest'),at('used','tray')],
 dispose:[at('used','tray'),mid('bin')],
 fit:[at('fresh','shelf'),mid('machine')],
 close:[at('head','rest'),mid('head')],
 secure:[at('clipLeft','released'),at('clipRight','released')]
};
const camera=(key,aspect)=>{const c=new THREE.PerspectiveCamera(VIEW.fov,aspect,0.05,20),pose=cameraPose(FOCUS[key],aspect);c.position.set(...pose.eye);c.lookAt(...pose.look);c.updateMatrixWorld(true);c.updateProjectionMatrix();return c;};

test('every phase has a framing, and the wide view is the original composition',()=>{
 for(const phase of Object.keys(SEEN))assert.ok(FOCUS[FOCUS_OF_PHASE[phase]],`${phase} has a focus`);
 const pose=cameraPose(FOCUS.wide,1.8);
 assert.ok(Math.abs(pose.eye[2]-VIEW.eye[2])<0.02&&Math.abs(pose.eye[1]-VIEW.eye[1])<0.02,'wide matches the original camera');
});

test('the part and its destination stay in view for every step at every stage shape',()=>{
 for(const aspect of [1,1.25,1.6,1.8,2.2])for(const [phase,points] of Object.entries(SEEN)){
  const cam=camera(FOCUS_OF_PHASE[phase],aspect);
  for(const point of points){const v=new THREE.Vector3(...point).project(cam);assert.ok(Math.abs(v.x)<=0.97&&Math.abs(v.y)<=0.97,`${phase} at aspect ${aspect}: ${point.map(n=>n.toFixed(2))} projects to ${v.x.toFixed(2)},${v.y.toFixed(2)}`);}
 }
});

test('framing follows the practice state and finishes wide',()=>{
 assert.equal(focusFor(initialPractice('bag')),'plug');
 assert.equal(focusFor({...initialPractice('bag'),complete:true}),'wide');
 for(const frame of LESSONS.bag)assert.ok(FOCUS[focusFor(frame.from)],`frame "${frame.title}" has a framing`);
});

test('the demonstration camera is a pure function of time: starts wide, dollies in, holds, changes at step boundaries',()=>{
 const demo=buildDemo(LESSONS.bag);
 const first=cameraAt(demo,0);assert.deepEqual([first.from,first.to,first.k],['wide','plug',0]);
 assert.equal(cameraAt(demo,CAMERA_MS*3).k,1,'settled after the dolly');
 assert.deepEqual(cameraAt(demo,1234.5),cameraAt(demo,1234.5),'same time, same camera');
 const second=demo.steps[1];const justAfter=cameraAt(demo,second.start+1);
 assert.equal(justAfter.k<0.01,true);assert.equal(justAfter.from,focusFor(demo.steps[0].frame.from));assert.equal(justAfter.to,focusFor(second.frame.from));
});

test('mixing two framings is continuous and ends on each',()=>{
 const a=FOCUS.plug,b=FOCUS.bin,close=(x,y)=>[x.c[0]-y.c[0],x.c[1]-y.c[1],x.w-y.w,x.h-y.h].every(d=>Math.abs(d)<1e-9);
 assert.ok(close(mixFocus(a,b,0),a));assert.ok(close(mixFocus(a,b,1),b));
 const m=mixFocus(a,b,0.5);assert.ok(m.w>a.w&&m.w<b.w,'halfway is in between');
});

test('closer framings make the machine bigger on screen',()=>{
 const size=key=>{const c=camera(key,1.5),top=new THREE.Vector3(0,0.62,0).project(c),bottom=new THREE.Vector3(0,0,0).project(c);return top.y-bottom.y;};
 assert.ok(size('clips')>size('wide')*1.45,`clips ${size('clips').toFixed(2)} vs wide ${size('wide').toFixed(2)}`);
});
