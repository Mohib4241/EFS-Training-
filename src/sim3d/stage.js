import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createKit} from './kit.js';
import {createTileTextures,createBlobTexture} from './tiles.js';
import {VIEW,WIDE,cameraPose,mixFocus} from './layout.js';
import {anchorPoint} from './parts.js';

const AMBER=new THREE.Color('#ee8c45');
// The shared 3D stage for every maintenance task: a tiled room lit by one image-based environment and one real light,
// a camera that glides between framings, movable parts that ease to their resting places or follow a hand, contact
// shadows (no shadow maps) and target highlighting. Tasks add their own models and parts on top.
export function createStage({renderer,life,reducedMotion=false}){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(VIEW.fov,1.8,0.05,30),kit=createKit(life,scene);
 const copyFocus=f=>({c:[f.c[0],f.c[1]],w:f.w,h:f.h});
 let aspect=1.8,now=copyFocus(WIDE),goal=WIDE,gliding=false;
 function applyCamera(){const pose=cameraPose(now,aspect);camera.aspect=aspect;camera.position.set(...pose.eye);camera.lookAt(...pose.look);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 applyCamera();

 // ---- light: a small prefiltered room for reflections, plus the single directional light ----
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,0.04);scene.environment=env.texture;scene.environmentIntensity=0.85;
 kit.own(env);room.dispose();pmrem.dispose();
 const key=new THREE.DirectionalLight('#fff3e2',2.1);key.position.set(-1.4,2.6,2.2);key.target.position.set(0,0.3,0);scene.add(key,key.target);

 // ---- tiled room, far bigger than any framing so no view ever sees its edge ----
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const floorTex=createTileTextures({layout:'grid',tileMeters:0.3,anisotropy,life}),wallTex=createTileTextures({layout:'brick',tileMeters:0.3,anisotropy,life});
 const tiled=(tex,w,h)=>{for(const t of [tex.map,tex.roughnessMap,tex.bumpMap])t.repeat.set(w/tex.metersPerTexture[0],h/tex.metersPerTexture[1]);return kit.std('#ffffff',1,0,{map:tex.map,roughnessMap:tex.roughnessMap,bumpMap:tex.bumpMap,bumpScale:1.2,roughness:0.55,envMapIntensity:0.9});};
 const floor=kit.mesh(new THREE.PlaneGeometry(16,10),tiled(floorTex,16,10));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,4.25);
 const wall=kit.mesh(new THREE.PlaneGeometry(16,7),tiled(wallTex,16,7));wall.position.set(0,3.5,-0.75);
 kit.mesh(new THREE.BoxGeometry(16,0.09,0.012),kit.std('#d3dbd7',0.4)).position.set(0,0.045,-0.744);

 // ---- contact shadows ----
 const blobTexture=createBlobTexture(life),staticShadow=kit.own(new THREE.MeshBasicMaterial({map:blobTexture,transparent:true,depthWrite:false,opacity:0.85}));
 const blobGeometry=kit.own(new THREE.PlaneGeometry(1,1));
 function blob(x,z,sx,sz=sx,{y=0.003,material=staticShadow}={}){const m=new THREE.Mesh(blobGeometry,material);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.scale.set(sx,sz,1);m.renderOrder=1;scene.add(m);return m;}

 // ---- movable parts ----
 // places: {name: {p:[x,y,z], r:[pitch,yaw,roll], s}}; anchor: grip point in the part's own frame; carry: rotation while held.
 const parts={},euler=new THREE.Euler(0,0,0,'ZYX'),tmpV=new THREE.Vector3(),tmpQ=new THREE.Quaternion();
 const setTarget=(part,pose)=>{part.targetPos.set(...pose.p);part.targetQuat.setFromEuler(euler.set(pose.r[0],pose.r[1],pose.r[2]));part.targetScale=pose.s??1;};
 function addPart(id,{group,materials=[],places,anchor=[0,0,0],shadow=0,shadowY=0.003,carry=[0,0,0],initial}){
  const part={id,group,materials,places,anchor,carry,pos:new THREE.Vector3(),quat:new THREE.Quaternion(),scale:1,targetPos:new THREE.Vector3(),targetQuat:new THREE.Quaternion(),targetScale:1,held:null,place:null,settled:false,shadow:null,shadowSize:shadow,shadowY};
  if(shadow){const material=kit.own(staticShadow.clone());material.opacity=0.4;part.shadow=blob(0,0,shadow,shadow,{material,y:shadowY});}
  parts[id]=part;const first=initial??Object.keys(places)[0];part.place=first;setTarget(part,places[first]);part.pos.copy(part.targetPos);part.quat.copy(part.targetQuat);part.scale=part.targetScale;
  return part;
 }
 const updaters=[];
 // ---- highlight: an amber ring on the floor or surface of the destination and a pulse on the part to use ----
 const ring=kit.own(new THREE.Mesh(kit.own(new THREE.RingGeometry(0.9,1,64)),kit.own(new THREE.MeshBasicMaterial({color:AMBER,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}))));
 ring.rotation.x=-Math.PI/2;ring.visible=false;ring.renderOrder=3;scene.add(ring);
 let highlight={part:null,ring:null,color:AMBER};
 const api={
  scene,camera,kit,blob,parts,
  addPart,
  addUpdater(fn){updaters.push(fn);},
  // pure pose lookups, so tasks and tests agree with what is drawn
  poseOf:(id,place)=>parts[id].places[place],
  anchorAt:(id,place)=>anchorPoint(parts[id].anchor,parts[id].places[place]),
  setHighlight(part,zoneRing,color=AMBER){highlight={part,ring:zoneRing,color:color instanceof THREE.Color?color:new THREE.Color(color)};},
  // Where each part rests now ({id: placeName}); parts glide there unless a hand is holding them.
  setPlaces(map,{instant=false}={}){
   for(const [id,place] of Object.entries(map)){const part=parts[id];if(!part||!part.places[place])continue;part.place=place;if(!part.held)setTarget(part,part.places[place]);if(instant||reducedMotion){part.pos.copy(part.targetPos);part.quat.copy(part.targetQuat);part.scale=part.targetScale;}}
  },
  // Hold a part so its grip anchor sits at world position `anchor`; null lets it go (it returns to its resting place).
  hold(id,anchor){
   const part=parts[id];if(!part)return;if(!anchor){part.held=null;if(part.place)setTarget(part,part.places[part.place]);return;}
   if(!part.held)part.held=new THREE.Vector3();part.held.set(anchor[0],anchor[1],anchor[2]);
   tmpQ.setFromEuler(euler.set(part.carry[0],part.carry[1],part.carry[2]));
   tmpV.set(...part.anchor).applyQuaternion(tmpQ);part.targetPos.copy(part.held).sub(tmpV);part.targetQuat.copy(tmpQ);part.targetScale=1;
  },
  // Grip anchor of a part right now, in world space.
  anchor(id,out=new THREE.Vector3()){const part=parts[id];part.group.updateMatrixWorld(true);return out.set(...part.anchor).applyMatrix4(part.group.matrixWorld);},
  resize(width,height){aspect=width/height;applyCamera();},
  setFocus(focus,{instant=false}={}){goal=focus||WIDE;if(instant||reducedMotion){now=copyFocus(goal);applyCamera();gliding=false;}else gliding=true;},
  setFocusBlend(from,to,k){now=mixFocus(from||WIDE,to||WIDE,k);goal=now;gliding=false;applyCamera();},
  get focus(){return now;},
  // Advance easing and animation; returns true while anything is still moving or pulsing.
  update(dt,time){
   let moving=false;const k=reducedMotion?1:1-Math.exp(-dt*13),kHeld=reducedMotion?1:1-Math.exp(-dt*24);
   if(gliding){const e=1-Math.exp(-dt*4.5);now.c[0]+=(goal.c[0]-now.c[0])*e;now.c[1]+=(goal.c[1]-now.c[1])*e;now.w+=(goal.w-now.w)*e;now.h+=(goal.h-now.h)*e;
    if(Math.abs(goal.c[0]-now.c[0])+Math.abs(goal.c[1]-now.c[1])+Math.abs(goal.w-now.w)+Math.abs(goal.h-now.h)<2e-3){now=copyFocus(goal);gliding=false;}else moving=true;applyCamera();}
   for(const part of Object.values(parts)){
    const err=part.pos.distanceToSquared(part.targetPos);
    if(!part.settled||err>1e-9||part.held){const kk=part.held?kHeld:k;part.pos.lerp(part.targetPos,kk);part.quat.slerp(part.targetQuat,kk);part.scale+=(part.targetScale-part.scale)*kk;const dq=Math.abs(part.quat.dot(part.targetQuat));
     if(err<1e-9&&dq>0.999999&&Math.abs(part.targetScale-part.scale)<1e-5&&!part.held){part.pos.copy(part.targetPos);part.quat.copy(part.targetQuat);part.scale=part.targetScale;part.settled=true;}else{part.settled=false;moving=true;}}
    part.group.position.copy(part.pos);part.group.quaternion.copy(part.quat);part.group.scale.setScalar(part.scale);
    if(part.shadow){const lift=Math.max(0,part.pos.y-part.shadowY);part.shadow.position.x=part.pos.x;part.shadow.position.z=part.pos.z;part.shadow.material.opacity=0.46/(1+lift*3.2);const s=part.shadowSize*(1+lift*0.6);part.shadow.scale.set(s,s,1);}
   }
   for(const fn of updaters)if(fn(dt,time))moving=true;
   const wave=0.5+0.5*Math.sin(time*5.2);
   for(const part of Object.values(parts))for(const m of part.materials)if(m.emissive)m.emissive.setScalar(0);
   if(highlight.part&&parts[highlight.part]){const e=0.03+0.1*wave;for(const m of parts[highlight.part].materials)if(m.emissive)m.emissive.copy(highlight.color).multiplyScalar(e);moving=true;}
   const r=highlight.ring;
   if(r){ring.visible=true;ring.position.set(r.x,r.y,r.z);const pulse=1+0.06*wave;ring.scale.set(r.rx*pulse,r.rz*pulse,1);ring.material.color.copy(highlight.color);ring.material.opacity=0.55+0.35*wave;moving=true;}else ring.visible=false;
   return moving;
  }
 };
 life.onCleanup(()=>{scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();}});});
 return api;
}
