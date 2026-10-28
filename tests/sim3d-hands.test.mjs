import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHandRig,handMaterial,REST,BONES,CHAINS} from '../src/sim3d/hand-rig.js';
import {POSES,poseLandmarks} from '../src/sim3d/hand-poses.js';
import {handFrame,toLocal,frameQuaternion,handScale,worldToScene} from '../src/sim3d/hand-frame.js';

const dist=(L,a,b)=>Math.hypot(L[a*3]-L[b*3],L[a*3+1]-L[b*3+1],L[a*3+2]-L[b*3+2]);
const material=handMaterial();

test('authored poses keep real bone lengths and the thumb really reaches the index tip in a pinch',()=>{
 const open=poseLandmarks([['open',1]]);
 for(const name of Object.keys(POSES)){
  const L=poseLandmarks([[name,1]]);
  for(const chain of Object.values(CHAINS))for(let i=0;i<3;i++)assert.ok(Math.abs(dist(L,chain[i],chain[i+1])-dist(open,chain[i],chain[i+1]))<1e-6,`${name}: bone ${chain[i]}-${chain[i+1]} length`);
  assert.ok(L.every(Number.isFinite),name);
 }
 const pinch=poseLandmarks([['pinch',1]]);assert.ok(dist(pinch,4,8)<0.01,'pinch closes to under 10 mm, got '+(dist(pinch,4,8)*1000).toFixed(1));
 assert.ok(dist(open,4,8)>0.07,'an open hand keeps thumb and index apart');
 const blended=poseLandmarks([['open',1],['pinch',1]]);assert.ok(dist(blended,4,8)>dist(pinch,4,8)&&dist(blended,4,8)<dist(open,4,8),'blending sits between its poses');
 assert.throws(()=>poseLandmarks([['wave',1]]),RangeError);
});

// Build "observed" scene landmarks the way tracking would: a hand shape, rotated and moved, mirrored for a left hand.
function observe(poseName,chirality,rotation,position){
 const local=poseLandmarks([[poseName,1]]),out=new Float64Array(63),v=new THREE.Vector3();
 for(let i=0;i<21;i++){v.set(local[i*3],local[i*3+1],local[i*3+2]*(chirality==='left'?-1:1)).applyQuaternion(rotation).add(position);out.set([v.x,v.y,v.z],i*3);}
 return out;
}
const rotations=[new THREE.Quaternion(),new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6,-1.1,0.4)),new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2,2.4,0.9)),new THREE.Quaternion().setFromEuler(new THREE.Euler(2.9,0.3,-2.2))];

test('tracking conversion round-trips: landmarks to hand frame to rig reproduces every joint, for both hands',()=>{
 for(const chirality of ['right','left'])for(const poseName of ['open','relaxed','pinch','point','grip'])for(const rotation of rotations){
  const position=new THREE.Vector3(0.12,-0.3,0.45),observed=observe(poseName,chirality,rotation,position);
  const frame=handFrame(observed),local=toLocal(observed,frame,chirality),expected=poseLandmarks([[poseName,1]]);
  for(let i=0;i<63;i++)assert.ok(Math.abs(local[i]-expected[i])<1e-6,`${chirality} ${poseName}: local landmark ${i}`);
  const rig=createHandRig(chirality,material);rig.pose(local);rig.place(new THREE.Vector3(observed[0],observed[1],observed[2]),frameQuaternion(frame),handScale(local));
  let worst=0;const joint=new THREE.Vector3();
  for(let i=0;i<21;i++){rig.jointPosition(i,joint);worst=Math.max(worst,Math.hypot(joint.x-observed[i*3],joint.y-observed[i*3+1],joint.z-observed[i*3+2]));}
  assert.ok(worst<0.0015,`${chirality} ${poseName}: rig joints within 1.5 mm of the observed landmarks, worst ${(worst*1000).toFixed(2)} mm`);
 }
});

test('a left hand is a true mirror of a right hand: same pose, mirrored placement, mirrored joints',()=>{
 const right=createHandRig('right',material),left=createHandRig('left',material),local=poseLandmarks([['grip',1]]);
 right.pose(local);left.pose(local);right.object.updateMatrixWorld(true);left.object.updateMatrixWorld(true);
 const a=new THREE.Vector3(),b=new THREE.Vector3();
 for(let i=0;i<21;i++){right.jointPosition(i,a);left.jointPosition(i,b);assert.ok(Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6&&Math.abs(a.z+b.z)<1e-6,`joint ${i} mirrored in z`);}
 // winding: the mirrored mesh must not be inside-out (normals agree with winding)
 for(const rig of [right,left]){const g=rig.mesh.geometry,P=g.attributes.position,N=g.attributes.normal,I=g.index.array,t=new THREE.Triangle(),n=new THREE.Vector3();let agree=0,total=0;
  for(let k=0;k<I.length;k+=3){t.set(new THREE.Vector3().fromBufferAttribute(P,I[k]),new THREE.Vector3().fromBufferAttribute(P,I[k+1]),new THREE.Vector3().fromBufferAttribute(P,I[k+2]));if(t.getArea()<1e-9)continue;t.getNormal(n);const vn=new THREE.Vector3().fromBufferAttribute(N,I[k]);total++;if(n.dot(vn)>0)agree++;}
  assert.ok(agree/total>0.97,`${rig.chirality} hand: ${(agree/total*100).toFixed(1)}% of faces agree with their normals`);}
});

test('mediapipe world coordinates map into the mirrored scene without flipping the hand',()=>{
 // A right hand held up, palm to the camera: MediaPipe x to the image right (the user's left), y down, z away from the camera.
 const world=new Float64Array(63);for(let i=0;i<21;i++){const [x,y,z]=REST[i];world.set([-x,-y,-z],i*3);}   // rest hand rotated by 180 degrees about z, then flipped by the conversion
 const scene=worldToScene(world);for(let i=0;i<63;i++)assert.ok(Math.abs(scene[i]-REST[Math.floor(i/3)][i%3])<1e-12);
 assert.equal(handScale(toLocal(scene,handFrame(scene),'right'))>0.95&&handScale(toLocal(scene,handFrame(scene),'right'))<1.05,true,'rest hand is rest size');
});

test('rig has the documented skeleton: 16 bones, wrist plus three per finger',()=>{
 assert.equal(BONES.length,16);const rig=createHandRig('right',material);assert.equal(rig.mesh.skeleton.bones.length,16);
 assert.ok(rig.mesh.geometry.attributes.position.count<2500,'light enough for two hands');
 const g=rig.mesh.geometry;for(const name of ['position','normal','color','skinWeight'])for(const v of g.attributes[name].array)assert.ok(Number.isFinite(v),`${name} is finite`);
});
