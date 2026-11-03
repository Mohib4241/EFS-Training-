import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGestures,SPREAD_GAIN,CLICK,DWELL,FLICK,ndcToClient} from '../src/look/gestures.js';
import {createHandOverlay,FOLLOW,HOLD,follow} from '../src/look/hand-overlay.js';

// A synthetic tracked hand: open (extended fingers), pinching (thumb to index) or a fist.
const hand=(id,{x=0,y=0,posture='open'}={})=>({id,palmNdc:[x,y],pinchNdc:[x,y],tipNdc:[x,y+.1],wristNdc:[x,y-.2],pinchRatio:posture==='pinch'?.2:.9,closedRatio:posture==='fist'?1.3:2});
const run=(g,frames,start=0,fps=30)=>{const out=[];frames.forEach((hands,i)=>out.push(g.update(hands,start+i/fps)));return out;};
const actions=results=>results.flatMap(r=>r.actions);

test('two open hands moving apart open the machine and together close it, from where it started',()=>{
 let open=20;const g=createGestures({getOpen:()=>open});
 const frames=[];for(let i=0;i<=10;i++){const half=.3+i*.05;frames.push([hand('L',{x:-half}),hand('R',{x:half})]);}
 const out=actions(run(g,frames)).filter(a=>a.type==='open');
 assert.ok(out.length>5&&out.every(a=>a.continuous));
 assert.ok(Math.abs(out[0].value-20)<1,'starts from the current opening');
 assert.ok(Math.abs(out.at(-1).value-(20+1.0*SPREAD_GAIN))<1,'moving the palms 1.0 further apart adds SPREAD_GAIN percent');
 const closing=[];for(let i=0;i<=10;i++){const half=.8-i*.07;closing.push([hand('L',{x:-half}),hand('R',{x:half})]);}
 open=70;const back=actions(run(createGestures({getOpen:()=>open}),closing)).filter(a=>a.type==='open');
 assert.ok(back.at(-1).value<back[0].value,'bringing them together closes it');
 assert.ok(back.every(a=>a.value>=0&&a.value<=100));
 const tether=run(createGestures({getOpen:()=>open}),frames).at(-1).tether;assert.ok(tether&&tether.value>=0&&tether.value<=100,'a tether with a live percentage');
});

test('a pinch and drag orbits; a quick pinch is a click, not an orbit',()=>{
 const g=createGestures();
 const drag=[];for(let i=0;i<12;i++)drag.push([hand('R',{x:.2+i*.04,y:0,posture:'pinch'})]);
 const dragged=actions(run(g,drag));assert.ok(dragged.filter(a=>a.type==='orbit').length>=8);assert.ok(!dragged.some(a=>a.type==='click'));
 assert.ok(dragged.filter(a=>a.type==='orbit').every(a=>a.dx>0),'dragging right orbits by a positive dx');
 const quick=createGestures(),frames=[[hand('R',{x:.1,y:.2})],[hand('R',{x:.1,y:.2,posture:'pinch'})],[hand('R',{x:.1,y:.2,posture:'pinch'})],[hand('R',{x:.1,y:.2})],[hand('R',{x:.1,y:.2})]];
 const out=actions(run(quick,frames));assert.deepEqual(out.map(a=>a.type),['click']);assert.deepEqual(out[0].ndc,[.1,.2]);
 const slow=createGestures(),held=[[hand('R')],...Array.from({length:20},()=>[hand('R',{posture:'pinch'})]),[hand('R')]];
 assert.ok(!actions(run(slow,held)).some(a=>a.type==='click'),'a long pinch is not a click');
 assert.ok(CLICK.maxSeconds<.5&&CLICK.maxTravel<.1);
});

test('fist then open hand opens fully; open hand then fist closes; a quick release does not undo it',()=>{
 const g=createGestures();let t=0;const feed=(posture,seconds)=>{const out=[];for(let i=0;i<Math.round(seconds*30);i++)out.push(...g.update([hand('R',{posture})],t+=1/30).actions);return out;};
 assert.deepEqual(feed('fist',1.0).filter(a=>a.type==='open'),[],'a hand that appears as a fist does nothing');
 const opened=feed('open',.3).filter(a=>a.type==='open');assert.equal(opened.length,1);assert.equal(opened[0].value,100);
 assert.deepEqual(feed('open',1.2).filter(a=>a.type==='open'),[],'holding an open hand is not a gesture');
 const closed=feed('fist',.3).filter(a=>a.type==='open');assert.equal(closed.length,1);assert.equal(closed[0].value,0);
 assert.deepEqual(feed('open',.3).filter(a=>a.type==='open'),[],'opening the hand straight after closing it does not reopen the machine');
 assert.ok(DWELL>=.4);
});

test('a sideways palm flick changes machine, once, and only for a lone open hand',()=>{
 const g=createGestures(),frames=[];for(let i=0;i<9;i++)frames.push([hand('R',{x:.6-i*.2,y:0})]);
 const out=actions(run(g,frames,10)).filter(a=>a.type==='machine');assert.equal(out.length,1);assert.equal(out[0].direction,1,'right to left is the next machine');
 const back=[];for(let i=0;i<9;i++)back.push([hand('R',{x:-.6+i*.2,y:0})]);
 assert.equal(actions(run(createGestures(),back,10)).filter(a=>a.type==='machine')[0].direction,-1);
 const slow=[];for(let i=0;i<40;i++)slow.push([hand('R',{x:.6-i*.03,y:0})]);assert.equal(actions(run(createGestures(),slow,10)).filter(a=>a.type==='machine').length,0,'a slow drift is not a flick');
 const diagonal=[];for(let i=0;i<9;i++)diagonal.push([hand('R',{x:.6-i*.2,y:i*.2})]);assert.equal(actions(run(createGestures(),diagonal,10)).filter(a=>a.type==='machine').length,0,'a vertical swipe is not a flick');
 const two=[];for(let i=0;i<9;i++)two.push([hand('R',{x:.6-i*.2}),hand('L',{x:-.9})]);assert.equal(actions(run(createGestures(),two,10)).filter(a=>a.type==='machine').length,0,'two hands are the spread gesture');
 assert.ok(FLICK.rest>=1);
});

test('the pointer follows the index finger, or the pinch point while pinching',()=>{
 const g=createGestures(),point=g.update([hand('R',{x:.3,y:.1})],0);assert.equal(point.mode,'point');assert.deepEqual(point.pointer.ndc,[.3,.2]);
 g.update([hand('R',{x:.3,y:.1,posture:'pinch'})],.1);const pinched=g.update([hand('R',{x:.3,y:.1,posture:'pinch'})],.2);assert.equal(pinched.pointer.pinching,true);assert.deepEqual(pinched.pointer.ndc,[.3,.1]);
 assert.equal(g.update([],.3).mode,'idle');
});

test('screen positions map into the stage rectangle',()=>{
 const rect={left:100,top:50,width:800,height:400};
 assert.deepEqual(ndcToClient([0,0],rect),{x:500,y:250});assert.deepEqual(ndcToClient([-1,1],rect),{x:100,y:50});assert.deepEqual(ndcToClient([1,-1],rect),{x:900,y:450});
});

// ---- the drawn hands glide instead of stepping ----
const scene3=()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1.6,.1,100),target=new THREE.Vector3(0,1,0);
 camera.position.set(0,1.25,5);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 return {scene,camera,target,overlay:createHandOverlay({scene,camera,target})};
};
// A tracked hand with every joint at the same picture position (x, y in 0..1 of the camera image), depth zero.
const tracked=(id,x=.5,y=.5,posture='open')=>({id,posture,norm:Float32Array.from({length:42},(_,k)=>k%2?y:x),world:new Float32Array(63)});
// the instanced meshes are, in order: left joints, left bones, right joints, right bones
const jointNdc=(overlay,camera,id='R',index=8)=>{
 const joints=overlay.object.children.filter(c=>c.isInstancedMesh)[id==='L'?0:2],m=new THREE.Matrix4();joints.getMatrixAt(index,m);
 return new THREE.Vector3().setFromMatrixPosition(m).project(camera);
};
// picture x of .3 is this far right of the middle of the screen (mirror view, gain 1.35)
const NDC_AT_30=(.5-.3)*2*1.35;

test('a hand that appears is drawn where it is; a moving hand glides toward the new reading instead of jumping',()=>{
 const {camera,overlay}=scene3();
 overlay.update({hands:[tracked('R',.5)],time:0});overlay.frame(16);
 assert.ok(Math.abs(jointNdc(overlay,camera).x)<1e-3,'first reading draws in place');
 overlay.update({hands:[tracked('R',.3)],time:33});overlay.frame(33);
 const part=jointNdc(overlay,camera).x;assert.ok(part>0&&part<NDC_AT_30*.6,`one frame moves part of the way (${part.toFixed(3)} of ${NDC_AT_30.toFixed(3)})`);
 let previous=part;
 for(let i=2;i<30;i++){const time=i*16.7;if(i%2===0)overlay.update({hands:[tracked('R',.3)],time});overlay.frame(time);const x=jointNdc(overlay,camera).x;assert.ok(x>=previous-1e-9,'never goes backwards');previous=x;}
 assert.ok(Math.abs(previous-NDC_AT_30)<.02,'and arrives');
});

test('the glide is a fraction of the remaining distance, the same whatever the frame rate',()=>{
 assert.ok(Math.abs(follow(.016)-(1-Math.exp(-.016/FOLLOW)))<1e-12);
 const slow=1-(1-follow(.033))**1,fast=1-(1-follow(.0165))**2;assert.ok(Math.abs(slow-fast)<1e-9,'two short frames equal one long one');
 assert.equal(follow(0),0);assert.ok(follow(10)>.999&&follow(10)<=1);
});

test('one empty reading does not make the hands flicker; a lost hand disappears after a moment',()=>{
 const {overlay}=scene3();
 overlay.update({hands:[tracked('L',.6),tracked('R',.4)],time:0});assert.equal(overlay.frame(10),true);
 overlay.update({hands:[],time:50});assert.equal(overlay.frame(60),true,'still drawn shortly after the last reading');
 assert.equal(overlay.frame(HOLD*1000+100),false,'gone once the hold has passed');assert.equal(overlay.object.visible,false);
});

test('the hands stay on the screen while the camera orbits (they are placed with the camera of the moment)',()=>{
 const {camera,target,overlay}=scene3();
 overlay.update({hands:[tracked('R',.3)],time:0});overlay.frame(10);
 const before=jointNdc(overlay,camera);
 camera.position.set(3,2,4);camera.lookAt(target);camera.updateMatrixWorld(true);overlay.update({hands:[tracked('R',.3)],time:20});overlay.frame(30);
 const after=jointNdc(overlay,camera);assert.ok(Math.abs(after.x-before.x)<.01&&Math.abs(after.y-before.y)<.01);
});

test('the pinch beam and the tether glide too, and the tether label only changes when its text or place does',()=>{
 const {overlay}=scene3(),label={hidden:true,style:{},textContent:'',writes:0};
 let writes=0;const proxy=new Proxy(label,{set(o,k,v){if(k==='textContent'||k==='left'||k==='top')writes++;o[k]=v;return true;}});proxy.style=new Proxy({},{set(o,k,v){writes++;o[k]=v;return true;}});
 overlay.setLabel(proxy);
 const link={from:[-.5,0],to:[.5,0],value:40};
 overlay.update({hands:[tracked('L',.6),tracked('R',.4)],tether:link,time:0});overlay.frame(10);
 assert.equal(label.hidden,false);assert.equal(label.textContent,'40% open');
 const settled=writes;overlay.update({hands:[tracked('L',.6),tracked('R',.4)],tether:link,time:20});overlay.frame(30);assert.equal(writes,settled,'unchanged label is not rewritten');
 for(let i=0;i<60;i++){const time=40+i*16;if(i%2===0)overlay.update({hands:[tracked('L',.6),tracked('R',.4)],tether:{...link,value:80},time});overlay.frame(time);}
 assert.equal(label.textContent,'80% open');
});
