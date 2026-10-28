import * as THREE from 'three';
import {REST,CHAINS} from './hand-rig.js';

// Authored hand poses as 21 hand-local landmarks (right-hand convention: +y along fingers, +x thumb side, +z out of the palm).
// Fingers use forward kinematics from per-joint flexion; the thumb uses CCD inverse kinematics toward a target so that a
// pinch really closes and a tuck really lands on the curled fingers. Bone lengths always stay those of the rest hand.
const flexAxisLength=(chain,i)=>Math.hypot(REST[chain[i+1]][0]-REST[chain[i]][0],REST[chain[i+1]][1]-REST[chain[i]][1],REST[chain[i+1]][2]-REST[chain[i]][2]);
const LEN={};for(const [name,chain] of Object.entries(CHAINS))LEN[name]=[0,1,2].map(i=>flexAxisLength(chain,i));
export const POSES={
 // [mcp, pip, dip, spread] in radians; thumb: tip target
 open:{index:[0,0,0,0.05],middle:[0,0,0,0],ring:[0,0,0,-0.04],pinky:[0,0,0,-0.1],thumb:{tip:[0.07,0.099,0.016]}},
 relaxed:{index:[0.2,0.25,0.15,0.03],middle:[0.25,0.3,0.15,0],ring:[0.3,0.35,0.15,-0.03],pinky:[0.35,0.4,0.15,-0.06],thumb:{tip:[0.062,0.092,0.03]}},
 // thumb and index tips meet; the other fingers curl loosely out of the way
 pinch:{index:[1.0,1.15,0.3,0],middle:[0.65,1.0,0.5,0],ring:[0.8,1.1,0.5,-0.04],pinky:[0.9,1.1,0.5,-0.08],thumb:{toFinger:'index'}},
 // index extended, others curled, thumb tucked: for pressing buttons and latches
 point:{index:[0.05,0.02,0.02,0],middle:[1.35,1.5,0.9,0],ring:[1.4,1.5,0.9,-0.04],pinky:[1.4,1.5,0.9,-0.08],thumb:{tuck:[0.03,0.09,0.03]}},
 // hand wrapped around a handle
 grip:{index:[0.85,1.0,0.7,0],middle:[1.0,1.1,0.7,0],ring:[1.1,1.1,0.7,-0.03],pinky:[1.15,1.1,0.7,-0.06],thumb:{tuck:[0.045,0.1,0.045]}}
};
const tmp=new THREE.Vector3(),axis=new THREE.Vector3(),from=new THREE.Vector3(),to=new THREE.Vector3(),q=new THREE.Quaternion();
const joints=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],goal=new THREE.Vector3();

function fingerChain(name,[mcp,pip,dip,spread],out){
 const chain=CHAINS[name];const p=out;let x=REST[chain[0]][0],y=REST[chain[0]][1],z=REST[chain[0]][2];
 p[chain[0]*3]=x;p[chain[0]*3+1]=y;p[chain[0]*3+2]=z;let a=0;
 [mcp,pip,dip].forEach((flex,i)=>{a+=flex;const l=LEN[name][i];x+=Math.sin(spread)*Math.cos(a)*l;y+=Math.cos(spread)*Math.cos(a)*l;z+=Math.sin(a)*l;const j=chain[i+1];p[j*3]=x;p[j*3+1]=y;p[j*3+2]=z;});
}
// Cyclic coordinate descent for the three thumb joints (CMC, MCP, IP) so the tip reaches `goal`.
function reachThumb(p,target){
 const chain=CHAINS.thumb;for(let i=0;i<4;i++)joints[i].set(REST[chain[i]][0],REST[chain[i]][1],REST[chain[i]][2]);
 goal.set(target[0],target[1],target[2]);
 for(let iteration=0;iteration<28;iteration++){
  for(let j=2;j>=0;j--){
   from.copy(joints[3]).sub(joints[j]);to.copy(goal).sub(joints[j]);
   if(from.lengthSq()<1e-9||to.lengthSq()<1e-9)continue;
   q.setFromUnitVectors(from.normalize(),to.normalize());
   // limit the step so the thumb sweeps rather than snapping, and flatten twists that fold it backwards through the palm
   const angle=2*Math.acos(Math.min(1,Math.abs(q.w)));if(angle>0.5){axis.set(q.x,q.y,q.z).normalize();q.setFromAxisAngle(axis,Math.sign(q.w)*0.5);}
   for(let k=j+1;k<4;k++){tmp.copy(joints[k]).sub(joints[j]).applyQuaternion(q);joints[k].copy(joints[j]).add(tmp);}
  }
  if(joints[3].distanceToSquared(goal)<1e-8)break;
 }
 for(let i=0;i<4;i++){p[chain[i]*3]=joints[i].x;p[chain[i]*3+1]=joints[i].y;p[chain[i]*3+2]=joints[i].z;}
}
const scratch=new Float64Array(63),a=new Float64Array(63);
// Landmarks for a (possibly blended) pose. `blend` is [[name, weight], ...]; weights are normalised.
export function poseLandmarks(blend,out=new Float64Array(63)){
 const total=blend.reduce((s,[,w])=>s+w,0)||1;const spec={index:[0,0,0,0],middle:[0,0,0,0],ring:[0,0,0,0],pinky:[0,0,0,0]};
 let thumbTip=null,thumbFinger=null,thumbFingerWeight=0;const tip=[0,0,0];
 for(const [name,weight] of blend){const pose=POSES[name],w=weight/total;if(!pose)throw new RangeError('Unknown hand pose '+name);
  for(const finger of Object.keys(spec))for(let k=0;k<4;k++)spec[finger][k]+=pose[finger][k]*w;
  if(pose.thumb.toFinger){thumbFinger=pose.thumb.toFinger;thumbFingerWeight+=w;}
  else{const t=pose.thumb.tip||pose.thumb.tuck;for(let k=0;k<3;k++)tip[k]+=t[k]*w;thumbTip=true;}}
 out[0]=out[1]=out[2]=0;
 for(const finger of Object.keys(spec))fingerChain(finger,spec[finger],out);
 let goalTip=tip;
 if(thumbFinger&&thumbFingerWeight>0){const t=CHAINS[thumbFinger][3];const wt=thumbFingerWeight;goalTip=[tip[0]+out[t*3]*wt,tip[1]+out[t*3+1]*wt,tip[2]+out[t*3+2]*wt+0.004*wt];}
 reachThumb(out,goalTip);
 return out;
}
export const handPose=(name,out)=>poseLandmarks([[name,1]],out);
