import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {poseLandmarks} from '../src/sim3d/hand-poses.js';
import {estimateDistance,classifyDistance,distanceAdvice,pinchRatio,closedRatio,createPinchTracker,createClosedTracker,toNdc,describeHand,TARGET_DISTANCE,GOOD_BAND,PALM} from '../src/sim3d/tracking-math.js';
import {REST} from '../src/sim3d/hand-rig.js';

const video={width:640,height:480},HFOV=65,f=(video.width/2)/Math.tan(HFOV*Math.PI/360);
// Make what MediaPipe would report for a hand: a pose rotated in front of a pinhole camera at `distance`, as a RAW (unmirrored) frame.
// MediaPipe world coords: x right, y down, z away. Image coords: x right (0..1), y down, centred at (cx, cy).
function observe({pose='open',distance=0.75,rotation=new THREE.Quaternion(),cx=0.5,cy=0.5,chirality='right'}){
 const local=poseLandmarks([[pose,1]]),world=new Float64Array(63),norm=new Float64Array(63),v=new THREE.Vector3();
 // the user's real right hand shows as a left-shaped hand in the mirrored scene; build it in camera space directly:
 // palm toward the camera = +z toward the camera = -z in MediaPipe's world axes
 const centre=new THREE.Vector3(local[27]/2,local[28]/2,0);
 for(let i=0;i<21;i++){
  v.set(local[i*3]-centre.x,-(local[i*3+1]-centre.y),-local[i*3+2]*(chirality==='right'?1:-1)).applyQuaternion(rotation);   // y flipped: image y points down
  world.set([v.x,v.y,v.z],i*3);
  const X=v.x,Y=v.y,Z=distance+v.z;norm.set([cx+f*X/Z/video.width,cy+f*Y/Z/video.height,v.z],i*3);
 }
 return {world,norm};
}
const rot=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));

test('distance from palm size is accurate for a facing palm and stays usable when the hand turns',()=>{
 for(const distance of [0.45,0.6,0.75,0.9,1.1]){const {norm}=observe({distance});const d=estimateDistance(norm,video,HFOV);assert.ok(Math.abs(d-distance)/distance<0.08,`facing hand at ${distance} m read as ${d.toFixed(3)}`);}
 for(const [name,rotation] of [['turned 40 degrees',rot(0,0.7,0)],['tilted 40 degrees',rot(0.7,0,0)],['both',rot(0.5,0.5,0)]]){const {norm}=observe({distance:0.75,rotation});const d=estimateDistance(norm,video,HFOV);assert.ok(Math.abs(d-0.75)/0.75<0.2,`${name}: read ${d.toFixed(3)} m`);}
 assert.ok(Number.isNaN(estimateDistance(new Float64Array(63),video)),'no hand, no distance');
});

test('the 0.75 m coach: bands and wording',()=>{
 assert.equal(TARGET_DISTANCE,0.75);assert.ok(GOOD_BAND[0]<0.75&&GOOD_BAND[1]>0.75,'0.75 m sits inside the good band');
 assert.deepEqual([0.4,0.62,0.75,0.9,1.3,NaN].map(classifyDistance),['close','good','good','good','far','unknown']);
 assert.match(distanceAdvice(0.45),/back/i);assert.match(distanceAdvice(1.2),/closer/i);assert.match(distanceAdvice(0.75),/good/i);assert.match(distanceAdvice(NaN),/show/i);
});

test('holding is a pinch or a closed hand; open, relaxed and pointing hands hold nothing',()=>{
 const at=pose=>{const {world}=observe({pose});return {pinch:pinchRatio(world),closed:closedRatio(world)};};
 const holds=pose=>{const r=at(pose);return createPinchTracker().update(r.pinch)||createClosedTracker().update(r.closed);};
 assert.equal(holds('pinch'),true,'pinch');assert.equal(holds('grip'),true,'a hand wrapped around a handle');
 for(const pose of ['open','relaxed','point'])assert.equal(holds(pose),false,`${pose} holds nothing (pinch ${at(pose).pinch.toFixed(2)}, closed ${at(pose).closed.toFixed(2)})`);
 assert.ok(at('pinch').pinch<0.28&&at('grip').closed<1.4,'clear margins from the thresholds');
 assert.ok(at('point').closed>1.75&&at('relaxed').closed>1.75,'a pointing or relaxed hand is clearly not closed');
 const t=createPinchTracker();assert.deepEqual([0.9,0.5,0.3,0.4,0.5,0.55,0.65,0.4].map(r=>t.update(r)),[false,false,true,true,true,true,false,false],'pinch: on below 0.34, off above 0.6, steady in between');
 const c=createClosedTracker();assert.deepEqual([2,1.6,1.4,1.5,1.7,1.8,1.5].map(r=>c.update(r)),[false,false,true,true,true,false,false],'closed: on below 1.45, off above 1.75');
 // palm size does not matter: scale the whole hand
 const {world}=observe({pose:'pinch'});const big=world.map(v=>v*1.25);assert.ok(Math.abs(pinchRatio(big)-pinchRatio(world))<1e-9&&Math.abs(closedRatio(big)-closedRatio(world))<1e-9);
});

test('screen mapping is a mirror and the central part of the frame covers the whole screen',()=>{
 assert.deepEqual(toNdc(0.5,0.5),[0,0]);
 const [rx]=toNdc(0.2,0.5),[lx]=toNdc(0.8,0.5);assert.ok(rx>0&&lx<0,'a hand on the image left (the user\'s right) appears on the screen right');
 const [,top]=toNdc(0.5,0.2),[,bottom]=toNdc(0.5,0.8);assert.ok(top>0&&bottom<0,'higher in the picture is higher on screen');
 assert.ok(toNdc(0.5-0.5/1.35,0.5)[0]>0.99,'the middle ~74% of the frame spans the screen');
 assert.ok(toNdc(-5,5).every(v=>Math.abs(v)<=1.25),'clamped');
});

test('a described hand carries pointer positions, size, chirality and a usable orientation',()=>{
 const {norm,world}=observe({pose:'pinch',cx:0.35,cy:0.6});
 const d=describeHand({norm,world,label:'Left',video});
 assert.equal(d.chirality,'left');assert.equal(d.local.length,63);assert.ok(d.pinchRatio<0.3);
 assert.ok(d.pinchNdc[0]>0,'a hand left of centre in the raw image is on the right of the screen');assert.ok(d.pinchNdc[1]<0,'and below centre');
 assert.ok(Math.abs(d.scale-1)<0.1,'rest-size hand');assert.ok(Math.abs(d.quaternion.length()-1)<1e-9);
 assert.ok(Math.abs(d.distance-0.75)/0.75<0.1);
 assert.equal(describeHand({norm,world,label:'Right',video}).chirality,'right');
});
