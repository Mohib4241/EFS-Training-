import * as THREE from 'three';
import {toNdc} from '../sim3d/tracking-math.js';

// The learner's hands drawn inside the 3D scene: glowing joints and bones placed with their real depth (so machine parts can
// pass in front of them), a pulsing orb where fingers pinch, a beam from the wrist to the part being pointed at, and a tether
// between two palms. Everything is drawn on this device from the tracker's landmarks; the camera picture itself is never drawn.
// The tracker reports a new reading only a few dozen times a second and not at an even pace, so a reading sets where each joint
// is heading and every drawn frame moves a fraction of the way there: the hands glide at the screen's own rate instead of stepping.
// Joints are kept as a screen position plus a depth and placed with the current camera each frame, so the hands stay put on
// the screen while the camera orbits.
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const DEPTH=7;                  // scene units per metre of landmark depth
export const FOLLOW=.045;       // seconds: the drawn hand trails the tracker by about this long (longer is smoother, shorter is quicker)
export const HOLD=.16;          // seconds a hand stays drawn after the tracker last saw it, so one empty reading does not flicker
export const follow=(dt,tau=FOLLOW)=>1-Math.exp(-Math.max(0,dt)/tau);
const UP=new THREE.Vector3(0,1,0);

export function createHandOverlay({scene,camera,target,color='#3de0ff'}){
 const group=new THREE.Group();group.renderOrder=20;group.visible=false;scene.add(group);
 const glow={color,transparent:true,toneMapped:false,depthWrite:false};
 const jointGeometry=new THREE.SphereGeometry(1,12,8),boneGeometry=new THREE.CylinderGeometry(1,1,1,6,1,true),orbGeometry=new THREE.SphereGeometry(1,16,12);
 const jointMaterial=new THREE.MeshBasicMaterial({...glow,opacity:.95}),boneMaterial=new THREE.MeshBasicMaterial({...glow,opacity:.7});
 const orbMaterial=new THREE.MeshBasicMaterial({...glow,opacity:.55,blending:THREE.AdditiveBlending}),beamMaterial=new THREE.MeshBasicMaterial({...glow,opacity:.8,blending:THREE.AdditiveBlending}),tetherMaterial=new THREE.MeshBasicMaterial({...glow,opacity:.85,blending:THREE.AdditiveBlending});
 const beam=new THREE.Mesh(boneGeometry,beamMaterial),tether=new THREE.Mesh(boneGeometry,tetherMaterial);beam.visible=tether.visible=false;group.add(beam,tether);
 const makeSlot=()=>{
  const joints=new THREE.InstancedMesh(jointGeometry,jointMaterial,21),bones=new THREE.InstancedMesh(boneGeometry,boneMaterial,BONES.length),orb=new THREE.Mesh(orbGeometry,orbMaterial);
  for(const m of [joints,bones])m.frustumCulled=false;orb.visible=false;
  const slot={joints,bones,orb,goal:new Float32Array(63),drawn:new Float32Array(63),points:Array.from({length:21},()=>new THREE.Vector3()),live:false,seenAt:-1e9,pinch:false};
  group.add(joints,bones,orb);joints.visible=bones.visible=false;return slot;
 };
 const slots={L:makeSlot(),R:makeSlot()},mid=new THREE.Vector3(),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),dir=new THREE.Vector3(),ndc=[0,0];
 const beamGoal=new THREE.Vector3(),beamEnd=new THREE.Vector3(),tetherGoal={x:0,y:0,value:0},tetherDrawn={x:0,y:0,value:0};
 let pulse=0,last=null,label=null,labelKey='',beamHand=null,beamWanted=false,beamShown=false,tetherWanted=false,tetherShown=false;

 const baseDepth=()=>camera.position.distanceTo(target)*.62;
 // A screen position (NDC) at a distance from the camera, along the ray through it.
 function place(x,y,depth,out){out.set(x,y,.5).unproject(camera);dir.copy(out).sub(camera.position).normalize();return out.copy(camera.position).addScaledVector(dir,depth);}
 function segment(mesh,a,b,radius){
  dir.copy(b).sub(a);const length=dir.length()||1e-6;mid.copy(a).addScaledVector(dir,.5);quaternion.setFromUnitVectors(UP,dir.divideScalar(length));
  mesh.position.copy(mid);mesh.quaternion.copy(quaternion);mesh.scale.set(radius,length,radius);
 }
 function hideSlot(s){s.live=false;s.joints.visible=s.bones.visible=s.orb.visible=false;}

 return {
  get object(){return group;},
  setColor(next){for(const m of [jointMaterial,boneMaterial,orbMaterial,beamMaterial,tetherMaterial])m.color.set(next);},
  // One tracker reading: {hands:[{id,norm,world,posture}], hit:{point}|null, pointerHand, tether:{from,to,value}|null, time (ms)}.
  // It only sets goals; frame() does the drawing.
  update({hands=[],hit=null,pointerHand=null,tether:link=null,time=performance.now()}){
   for(const h of hands){
    const slot=slots[h.id];if(!slot)continue;
    for(let i=0;i<21;i++){toNdc(h.norm[i*2],h.norm[i*2+1],ndc);slot.goal[i*3]=ndc[0];slot.goal[i*3+1]=ndc[1];slot.goal[i*3+2]=h.world?h.world[i*3+2]*DEPTH:0;}
    if(!slot.live)slot.drawn.set(slot.goal);          // a hand that has just appeared starts where it is
    slot.live=true;slot.seenAt=time/1000;slot.pinch=h.posture==='pinch';group.visible=true;
   }
   beamWanted=Boolean(hit&&pointerHand);beamHand=pointerHand;if(beamWanted)beamGoal.copy(hit.point);
   tetherWanted=Boolean(link);if(link){tetherGoal.x=(link.from[0]+link.to[0])/2;tetherGoal.y=(link.from[1]+link.to[1])/2;tetherGoal.value=link.value;}
  },
  // Draw one frame and pulse the pinch orbs; returns true while anything is showing, so the viewer keeps drawing.
  frame(time){
   const t=time/1000,dt=last===null?1/60:Math.min(.1,Math.max(0,t-last)),k=follow(dt);last=t;pulse=t;
   camera.updateMatrixWorld(true);
   const d0=baseDepth(),r=.0055*d0;let any=false;
   for(const id of ['L','R']){
    const s=slots[id];
    if(s.live&&t-s.seenAt>HOLD)hideSlot(s);
    if(!s.live)continue;
    any=true;
    for(let i=0;i<63;i++)s.drawn[i]+=(s.goal[i]-s.drawn[i])*k;
    for(let i=0;i<21;i++){place(s.drawn[i*3],s.drawn[i*3+1],d0+s.drawn[i*3+2],s.points[i]);scale.setScalar(r*(i===0?1.5:i%4===0?1.15:1));matrix.compose(s.points[i],quaternion.identity(),scale);s.joints.setMatrixAt(i,matrix);}
    BONES.forEach(([a,b],i)=>{dir.copy(s.points[b]).sub(s.points[a]);const length=dir.length()||1e-6;mid.copy(s.points[a]).addScaledVector(dir,.5);quaternion.setFromUnitVectors(UP,dir.divideScalar(length));scale.set(r*.45,length,r*.45);matrix.compose(mid,quaternion,scale);s.bones.setMatrixAt(i,matrix);});
    s.joints.instanceMatrix.needsUpdate=s.bones.instanceMatrix.needsUpdate=true;s.joints.visible=s.bones.visible=true;
    s.orb.visible=s.pinch;if(s.pinch){s.orb.position.copy(s.points[4]).add(s.points[8]).multiplyScalar(.5);s.orb.scale.setScalar((.045+.018*Math.sin(pulse*9))*d0/5*2.2);}
   }
   // beam: wrist to the part being pointed at
   const from=beamWanted&&beamHand&&slots[beamHand]?.live?slots[beamHand].points[0]:null;
   if(from){if(beamShown)beamEnd.lerp(beamGoal,k);else beamEnd.copy(beamGoal);beamShown=true;segment(beam,from,beamEnd,r*.25);}else beamShown=false;
   beam.visible=beamShown;
   // tether between the two palms, with a live "% open" label
   if(tetherWanted&&slots.L.live&&slots.R.live){
    if(tetherShown){tetherDrawn.x+=(tetherGoal.x-tetherDrawn.x)*k;tetherDrawn.y+=(tetherGoal.y-tetherDrawn.y)*k;tetherDrawn.value+=(tetherGoal.value-tetherDrawn.value)*k;}
    else{tetherDrawn.x=tetherGoal.x;tetherDrawn.y=tetherGoal.y;tetherDrawn.value=tetherGoal.value;}
    tetherShown=true;segment(tether,slots.L.points[9],slots.R.points[9],r*.3);
   }else tetherShown=false;
   tether.visible=tetherShown;
   group.visible=any;if(!any)beam.visible=tether.visible=tetherShown=beamShown=false;
   if(label)paintLabel();
   return any;
  },
  setLabel(element){label=element;labelKey='';},
  clear(){group.visible=false;beam.visible=tether.visible=false;beamShown=tetherShown=beamWanted=tetherWanted=false;for(const s of Object.values(slots))hideSlot(s);if(label)paintLabel();},
  dispose(){scene.remove(group);for(const g of [jointGeometry,boneGeometry,orbGeometry])g.dispose();for(const m of [jointMaterial,boneMaterial,orbMaterial,beamMaterial,tetherMaterial])m.dispose();for(const s of Object.values(slots)){s.joints.dispose();s.bones.dispose();}}
 };
 // The label is only touched when what it says or where it sits has changed, so it never forces layout while the hands glide.
 function paintLabel(){
  const key=tetherShown?`${Math.round((tetherDrawn.x*.5+.5)*1000)}|${Math.round((-tetherDrawn.y*.5+.5)*1000)}|${Math.round(tetherDrawn.value)}`:'';
  if(key===labelKey)return;labelKey=key;
  label.hidden=!tetherShown;if(!tetherShown)return;
  label.style.left=`${(tetherDrawn.x*.5+.5)*100}%`;label.style.top=`${(-tetherDrawn.y*.5+.5)*100}%`;label.textContent=`${Math.round(tetherDrawn.value)}% open`;
 }
}
