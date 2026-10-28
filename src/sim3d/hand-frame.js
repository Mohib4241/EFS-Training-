import * as THREE from 'three';
import {REST} from './hand-rig.js';

// Conversions between MediaPipe output and the hand rig.
// MediaPipe world landmarks: metres, origin near the hand centre, x to the image right, y down, z away from the camera.
// The scene is a mirror: screen-right is the user's right, y is up and +z points at the viewer, so all three axes flip.
// MediaPipe's handedness label assumes a mirrored image, so after this x-flip it already names the hand as it is drawn.
const mat=new THREE.Matrix4(),ax=new THREE.Vector3(),ay=new THREE.Vector3(),az=new THREE.Vector3(),d=new THREE.Vector3();
export function worldToScene(world,out=new Float64Array(63)){for(let i=0;i<63;i++)out[i]=-world[i];return out;}
// Orthonormal hand frame: y from the wrist to the middle of the four knuckles (averaging also calms landmark noise),
// x across the palm toward the thumb, z = x cross y (the palm normal for a right hand).
export function handFrame(L,frame={x:new THREE.Vector3(),y:new THREE.Vector3(),z:new THREE.Vector3()}){
 frame.y.set((L[15]+L[27]+L[39]+L[51])/4-L[0],(L[16]+L[28]+L[40]+L[52])/4-L[1],(L[17]+L[29]+L[41]+L[53])/4-L[2]).normalize();
 frame.x.set(L[15]-L[51],L[16]-L[52],L[17]-L[53]);frame.x.addScaledVector(frame.y,-frame.x.dot(frame.y)).normalize();
 frame.z.crossVectors(frame.x,frame.y);return frame;
}
// Landmarks relative to the wrist in the hand's own axes, in the right-hand convention the rig expects (palm toward +z).
// A left hand's palm faces -z in its own frame, so its z is negated.
export function toLocal(L,frame,chirality,out=new Float64Array(63)){
 const flip=chirality==='left'?-1:1;
 for(let i=0;i<21;i++){d.set(L[i*3]-L[0],L[i*3+1]-L[1],L[i*3+2]-L[2]);out[i*3]=d.dot(frame.x);out[i*3+1]=d.dot(frame.y);out[i*3+2]=d.dot(frame.z)*flip;}
 return out;
}
export function frameQuaternion(frame,out=new THREE.Quaternion()){mat.makeBasis(frame.x,frame.y,frame.z);return out.setFromRotationMatrix(mat);}
// Size of the observed hand relative to the rig (wrist to the middle of the knuckles), clamped so a bad frame cannot balloon the hand.
const mean=(L,k)=>(L[15+k]+L[27+k]+L[39+k]+L[51+k])/4;
const REST_LENGTH=Math.hypot(mean(REST.flat(),0),mean(REST.flat(),1),mean(REST.flat(),2));
export const handScale=local=>Math.min(1.25,Math.max(0.8,Math.hypot(mean(local,0),mean(local,1),mean(local,2))/REST_LENGTH));
