import * as THREE from 'three';
import {toNdc} from '../sim3d/tracking-math.js';

// The learner's hands drawn inside the 3D scene: glowing joints and bones placed with their real depth (so machine parts can
// pass in front of them), a pulsing orb where fingers pinch, a beam from the wrist to the part being pointed at, and a tether
// between two palms. Everything is drawn on this device from the tracker's landmarks; the video itself is never drawn here.
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const DEPTH=7;                  // scene units per metre of landmark depth
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
  const slot={joints,bones,orb,points:Array.from({length:21},()=>new THREE.Vector3()),shown:false,pinch:false};
  group.add(joints,bones,orb);joints.visible=bones.visible=false;return slot;
 };
 const slots={L:makeSlot(),R:makeSlot()},tmp=new THREE.Vector3(),mid=new THREE.Vector3(),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),dir=new THREE.Vector3();
 let pulse=0,tetherAt=null,label=null;

 const baseDepth=()=>camera.position.distanceTo(target)*.62;
 // A screen position (NDC) at a distance from the camera, along the ray through it.
 function place(x,y,depth,out){out.set(x,y,.5).unproject(camera);dir.copy(out).sub(camera.position).normalize();return out.copy(camera.position).addScaledVector(dir,depth);}
 function segment(mesh,a,b,radius){
  dir.copy(b).sub(a);const length=dir.length()||1e-6;mid.copy(a).addScaledVector(dir,.5);quaternion.setFromUnitVectors(UP,dir.divideScalar(length));
  mesh.position.copy(mid);mesh.quaternion.copy(quaternion);mesh.scale.set(radius,length,radius);
 }

 return {
  get object(){return group;},
  setColor(next){for(const m of [jointMaterial,boneMaterial,orbMaterial,beamMaterial,tetherMaterial])m.color.set(next);},
  // frame: {hands:[{id,norm,world,posture}], hit:{point}|null, pointerHand, tether:{from,to,value}|null}
  update({hands=[],hit=null,pointerHand=null,tether:link=null}){
   const d0=baseDepth(),r=.0055*d0,seen=new Set();
   camera.updateMatrixWorld(true);
   for(const h of hands){
    const slot=slots[h.id];if(!slot)continue;seen.add(h.id);
    for(let i=0;i<21;i++){const [nx,ny]=toNdc(h.norm[i*2],h.norm[i*2+1]);place(nx,ny,d0+(h.world?h.world[i*3+2]*DEPTH:0),slot.points[i]);scale.setScalar(r*(i===0?1.5:i%4===0?1.15:1));matrix.compose(slot.points[i],quaternion.identity(),scale);slot.joints.setMatrixAt(i,matrix);}
    BONES.forEach(([a,b],i)=>{dir.copy(slot.points[b]).sub(slot.points[a]);const length=dir.length()||1e-6;mid.copy(slot.points[a]).addScaledVector(dir,.5);quaternion.setFromUnitVectors(UP,dir.divideScalar(length));scale.set(r*.45,length,r*.45);matrix.compose(mid,quaternion,scale);slot.bones.setMatrixAt(i,matrix);});
    slot.joints.instanceMatrix.needsUpdate=slot.bones.instanceMatrix.needsUpdate=true;
    slot.shown=true;slot.joints.visible=slot.bones.visible=true;
    slot.pinch=h.posture==='pinch';slot.orb.visible=slot.pinch;if(slot.pinch)slot.orb.position.copy(slot.points[4]).add(slot.points[8]).multiplyScalar(.5);slot.orb.userData.size=d0;
   }
   for(const id of ['L','R'])if(!seen.has(id)){const s=slots[id];s.shown=false;s.joints.visible=s.bones.visible=s.orb.visible=false;}
   // beam: wrist to the part being pointed at
   const from=pointerHand&&slots[pointerHand]?.shown?slots[pointerHand].points[0]:null;
   beam.visible=Boolean(from&&hit);if(beam.visible)segment(beam,from,hit.point,r*.25);
   // tether between the two palms, with a live "% open" label
   tether.visible=Boolean(link&&slots.L.shown&&slots.R.shown);tetherAt=null;
   if(tether.visible){segment(tether,slots.L.points[9],slots.R.points[9],r*.3);tetherAt={x:(link.from[0]+link.to[0])/2,y:(link.from[1]+link.to[1])/2,value:link.value};}
   group.visible=seen.size>0;
   if(label)paintLabel();
  },
  // Pulse the pinch orbs; returns true while anything is showing, so the viewer keeps drawing.
  frame(time){
   pulse=time/1000;
   for(const s of Object.values(slots))if(s.orb.visible)s.orb.scale.setScalar((.045+.018*Math.sin(pulse*9))*(s.orb.userData.size||5)/5*2.2);
   return group.visible;
  },
  setLabel(element){label=element;},
  clear(){group.visible=false;beam.visible=tether.visible=false;for(const s of Object.values(slots)){s.shown=false;s.joints.visible=s.bones.visible=s.orb.visible=false;}tetherAt=null;if(label)paintLabel();},
  dispose(){scene.remove(group);for(const g of [jointGeometry,boneGeometry,orbGeometry])g.dispose();for(const m of [jointMaterial,boneMaterial,orbMaterial,beamMaterial,tetherMaterial])m.dispose();for(const s of Object.values(slots)){s.joints.dispose();s.bones.dispose();}}
 };
 function paintLabel(){
  label.hidden=!tetherAt;if(!tetherAt)return;
  label.style.left=`${(tetherAt.x*.5+.5)*100}%`;label.style.top=`${(-tetherAt.y*.5+.5)*100}%`;label.textContent=`${Math.round(tetherAt.value)}% open`;
 }
}
