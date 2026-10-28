import * as THREE from 'three';
import {poseLandmarks} from './hand-poses.js';

// Placing a rig so a chosen contact point (where thumb meets finger, or the fingertip) lands on a world position.
const local=new Float64Array(63),contact=new THREE.Vector3(),v=new THREE.Vector3(),q=new THREE.Quaternion(),basis=new THREE.Matrix4(),pitchQ=new THREE.Quaternion(),rollQ=new THREE.Quaternion();
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0);
// Contact point per pose, as a blend of landmarks: [index a, index b] means the midpoint of a and b.
const CONTACT={pinch:[4,8],point:[8,8],grip:[4,6],relaxed:[4,8],open:[4,8]};
// Hand-local contact point of a (blended) pose, in the right-hand convention; z is mirrored for a left rig.
export function contactPoint(blend,side,out=new THREE.Vector3()){
 const total=blend.reduce((s,[,w])=>s+w,0)||1;poseLandmarks(blend,local);out.set(0,0,0);
 for(const [name,weight] of blend){const [a,b]=CONTACT[name];out.x+=(local[a*3]+local[b*3])/2*weight/total;out.y+=(local[a*3+1]+local[b*3+1])/2*weight/total;out.z+=(local[a*3+2]+local[b*3+2])/2*weight/total;}
 if(side==='left')out.z*=-1;return out;
}
// How the hand is held for each pose: fingers tipped slightly up so the forearm drops toward the viewer, as a learner's own would;
// a grip around the head turns the palm inward. Blended by the pose weights.
const HOLD={relaxed:{pitch:0.15,roll:0},open:{pitch:0.15,roll:0},pinch:{pitch:0.3,roll:0},point:{pitch:0.12,roll:0},grip:{pitch:0.22,roll:Math.PI/2}};
export function orientationForBlend(side,blend,out=new THREE.Quaternion()){
 const total=blend.reduce((s,[,w])=>s+w,0)||1;let pitch=0,roll=0;
 for(const [name,weight] of blend){pitch+=HOLD[name].pitch*weight/total;roll+=HOLD[name].roll*weight/total;}
 // forearms leave the shoulders at an angle, so each hand turns slightly outward: arms stay at the edges instead of covering the machine
 return handOrientation(side,{pitch,roll,yaw:side==='right'?0.5:-0.5},out);
}
// Orientation seen from the learner's own viewpoint: fingers forward (into the scene), palm down.
// Right rig local axes map to world (-x, -z, -y); the mirrored left rig maps to (+x, -z, +y).
export function handOrientation(side,{pitch=-0.45,roll=0,yaw=0}={},out=new THREE.Quaternion()){
 if(side==='left')basis.makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0));
 else basis.makeBasis(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,-1,0));
 out.setFromRotationMatrix(basis);
 rollQ.setFromAxisAngle(Y,side==='left'?-roll:roll);out.multiply(rollQ);
 pitchQ.setFromAxisAngle(X,pitch);out.premultiply(pitchQ);
 if(yaw){q.setFromAxisAngle(Y,yaw);out.premultiply(q);}
 return out;
}
const wrist=new THREE.Vector3();
// Pose a rig and place it so its contact point is at `target` (world). Returns the rig for chaining.
export function placeAtContact(rig,{blend,target,orientation,scale=1}){
 poseLandmarks(blend,local);rig.pose(local);
 contactPoint(blend,rig.chirality,contact);
 wrist.set(target[0],target[1],target[2]).sub(v.copy(contact).multiplyScalar(scale).applyQuaternion(orientation));
 rig.place(wrist,orientation,scale);return rig;
}
