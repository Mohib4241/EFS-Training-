import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {VIEW,TANK,PLACE,FOCUS,cameraPose,mixFocus} from './layout.js';
import {ANCHOR,placePose} from './parts.js';
import {createTileTextures,createBlobTexture,createPaperTexture,createLabelTexture} from './tiles.js';

const AMBER=new THREE.Color('#ee8c45'),TEAL=new THREE.Color('#2bd0c8');
const lathe=(points,segments=56)=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),segments);
// Merge parts that share a material into one geometry (one draw call). Each entry is [geometry, matrix-or-undefined].
function merge(entries){
 // Primitives differ in whether they are indexed, so everything is normalised to non-indexed position/normal/uv first.
 const list=entries.map(([geometry,matrix])=>{let c=geometry.index?geometry.toNonIndexed():geometry.clone();for(const name of Object.keys(c.attributes))if(!['position','normal','uv'].includes(name))c.deleteAttribute(name);if(matrix)c.applyMatrix4(matrix);return c;});
 const merged=mergeGeometries(list);for(const g of list)g.dispose();return merged;
}
const at=(x,y,z,rx=0,ry=0,rz=0,s=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'ZYX')),new THREE.Vector3(s,s,s));

const BIN={x:PLACE.bin[0],z:PLACE.bin[2],scale:0.75};
export function createBagScene({renderer,life,machineName='JUNIOR 103',reducedMotion=false}){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(VIEW.fov,1.8,0.05,20);
 const copyFocus=f=>({c:[f.c[0],f.c[1]],w:f.w,h:f.h});
 let aspect=1.8,now=copyFocus(FOCUS.wide),goal=FOCUS.wide,gliding=false;
 function applyCamera(){const pose=cameraPose(now,aspect);camera.aspect=aspect;camera.position.set(...pose.eye);camera.lookAt(...pose.look);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 applyCamera();
 const own=r=>life.own(r);
 const std=(color,roughness=0.5,metalness=0,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness,metalness,...extra}));
 const mesh=(geometry,material,parent=scene)=>{own(geometry);const m=new THREE.Mesh(geometry,material);parent.add(m);return m;};

 // ---- image-based light (one small prefiltered room) + the single real light ----
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,0.04);scene.environment=env.texture;scene.environmentIntensity=0.85;
 own(env);room.dispose();pmrem.dispose();
 const key=new THREE.DirectionalLight('#fff3e2',2.1);key.position.set(-1.4,2.6,2.2);key.target.position.set(0,0.3,0);scene.add(key,key.target);

 // ---- tiled room ----
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const floorTex=createTileTextures({layout:'grid',tileMeters:0.3,anisotropy,life}),wallTex=createTileTextures({layout:'brick',tileMeters:0.3,anisotropy,life});
 const tiled=(tex,w,h)=>{for(const t of [tex.map,tex.roughnessMap,tex.bumpMap])t.repeat.set(w/tex.metersPerTexture[0],h/tex.metersPerTexture[1]);return std('#ffffff',1,0,{map:tex.map,roughnessMap:tex.roughnessMap,bumpMap:tex.bumpMap,bumpScale:1.2,roughness:0.55,envMapIntensity:0.9});};
 // the room is much bigger than the stage so a tall phone view, which pulls the camera back, never sees its edge
 const floor=mesh(new THREE.PlaneGeometry(16,10),tiled(floorTex,16,10));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,4.25);
 const wall=mesh(new THREE.PlaneGeometry(16,7),tiled(wallTex,16,7));wall.position.set(0,3.5,-0.75);
 const skirting=mesh(new THREE.BoxGeometry(16,0.09,0.012),std('#d3dbd7',0.4));skirting.position.set(0,0.045,-0.744);

 // ---- contact shadows ----
 const blobTexture=createBlobTexture(life),staticShadow=own(new THREE.MeshBasicMaterial({map:blobTexture,transparent:true,depthWrite:false,opacity:0.85}));
 const blobGeometry=own(new THREE.PlaneGeometry(1,1));
 function blob(x,z,sx,sz,material=staticShadow){const m=new THREE.Mesh(blobGeometry,material);m.rotation.x=-Math.PI/2;m.position.set(x,0.003,z);m.scale.set(sx,sz,1);m.renderOrder=1;scene.add(m);return m;}
 blob(0,0,0.78,0.78);blob(PLACE.headRest[0],PLACE.headRest[2],0.5,0.5);blob(BIN.x,BIN.z,0.4,0.4);blob(-0.52,0.12,0.62,0.5);

 // ---- machine body (static) ----
 const tankMaterial=std('#2f4f58',0.34,0.55,{envMapIntensity:1.1}),bandMaterial=std('#ffffff',0.45,0,{map:createLabelTexture({text:machineName,life})});
 mesh(lathe([[0.12,0.036],[0.165,0.042],[0.178,0.07],[0.185,0.12],[0.1865,0.34],[0.189,0.385],[0.1915,0.396],[0.188,0.404],[0.18,0.406],[0.176,0.399],[0.1745,0.39],[0.1725,0.1],[0.16,0.064],[0.0,0.06]]),tankMaterial);
 const band=mesh(new THREE.CylinderGeometry(0.1872,0.1872,0.095,64,1,true),bandMaterial);band.position.y=0.2;band.rotation.y=Math.PI;
 const rubber=std('#15191b',0.8,0),plastic=std('#26363c',0.5,0.2);
 mesh(merge([[new THREE.CylinderGeometry(0.2,0.2,0.032,48),at(0,0.03,0)],[new THREE.TorusGeometry(0.2,0.006,10,48),at(0,0.046,0,Math.PI/2)]]),plastic);
 const wheelEntries=[];for(const a of [0.35,Math.PI*0.8+0.35,Math.PI*1.4+0.35]){const x=Math.cos(a)*0.15,z=Math.sin(a)*0.15;wheelEntries.push([new THREE.CylinderGeometry(0.03,0.03,0.022,20),at(x,0.03,z,0,0,Math.PI/2,1)]);}
 mesh(merge(wheelEntries),rubber);

 // ---- head (movable group) ----
 const headGroup=new THREE.Group();scene.add(headGroup);
 const headPlastic=std('#2d444c',0.4,0.25,{envMapIntensity:1.2}),headDark=std('#1b2b31',0.5,0.1),orange=std('#ee8c45',0.45,0,{emissive:'#000000'}),chrome=std('#c4cfd0',0.22,0.95,{envMapIntensity:1.4}),gasket=std('#0e1112',0.85,0);
 mesh(merge([[lathe([[0,0],[0.19,0],[0.195,0.012],[0.195,0.028],[0.186,0.04],[0.172,0.072],[0.15,0.098],[0.12,0.118],[0.085,0.13],[0.045,0.137],[0,0.139]],64)],[lathe([[0.06,0.13],[0.07,0.145],[0.068,0.16],[0.05,0.168],[0,0.17]],40)]]),headPlastic,headGroup);
 mesh(merge([[new THREE.TorusGeometry(0.085,0.0115,12,36,Math.PI),at(0,0.135,0)],[new THREE.CylinderGeometry(0.0115,0.0115,0.065,12),at(0.085,0.1,0)],[new THREE.CylinderGeometry(0.0115,0.0115,0.065,12),at(-0.085,0.1,0)]]),headDark,headGroup);
 mesh(merge([[new RoundedBoxGeometry(0.05,0.02,0.032,3,0.006),at(0.1,0.092,0.098,-0.5,0.5,0)]]),orange,headGroup);
 mesh(new THREE.TorusGeometry(0.188,0.006,8,56).rotateX(Math.PI/2).translate(0,0.004,0),gasket,headGroup);
 mesh(merge([[new THREE.BoxGeometry(0.018,0.024,0.04),at(0.205,0.018,0)],[new THREE.BoxGeometry(0.018,0.024,0.04),at(-0.205,0.018,0)]]),chrome,headGroup);

 // ---- retaining clips (movable, hinge on the tank rim) ----
 function clipGeometry(side){const dir=side==='left'?-1:1;return merge([[new RoundedBoxGeometry(0.016,0.078,0.012,2,0.004),at(0,0.039,0.002)],[new THREE.BoxGeometry(0.026,0.012,0.016),at(-dir*0.006,0.074,0.002)],[new THREE.CylinderGeometry(0.009,0.009,0.034,14),at(0,0,0,Math.PI/2)]]);}
 const clips={left:new THREE.Group(),right:new THREE.Group()};
 const clipMetal=std('#c4cfd0',0.22,0.95,{envMapIntensity:1.4});
 for(const side of ['left','right']){mesh(clipGeometry(side),clipMetal,clips[side]);scene.add(clips[side]);}

 // ---- bags ----
 const cardboard=std('#c7b184',0.9,0);
 function makeBag(used){
  const group=new THREE.Group(),paper=std('#ffffff',0.95,0,{map:createPaperTexture({label:used?'USED · 80%':'CLEAN BAG',used,life})});
  mesh(new RoundedBoxGeometry(0.2,0.3,0.085,5,0.022).translate(0,-0.152,0),paper,group);
  const shape=new THREE.Shape(),w=0.15,h=0.105,r=0.012;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const hole=new THREE.Path();hole.absarc(0,0,0.027,0,Math.PI*2,true);shape.holes.push(hole);
  mesh(new THREE.ExtrudeGeometry(shape,{depth:0.004,bevelEnabled:false,curveSegments:20}).translate(0,-0.068,0.0425),cardboard,group);
  scene.add(group);return {group,paper};
 }
 const used=makeBag(true),fresh=makeBag(false);
 const tapeMaterial=std('#e4892f',0.5,0,{emissive:'#000000'}),seal=mesh(new THREE.BoxGeometry(0.212,0.034,0.094),tapeMaterial,used.group);seal.position.y=-0.022;seal.visible=false;seal.scale.x=0.001;

 // ---- plug, socket, cable ----
 const plugBody=std('#23292c',0.45,0.1),plugGroup=new THREE.Group();scene.add(plugGroup);
 mesh(merge([[new RoundedBoxGeometry(0.052,0.066,0.046,3,0.008)],[new THREE.CylinderGeometry(0.009,0.009,0.03,10),at(0,0,0.035,Math.PI/2)]]),plugBody,plugGroup);
 mesh(merge([[new THREE.CylinderGeometry(0.0045,0.0045,0.022,8),at(0.0095,0,-0.032,Math.PI/2)],[new THREE.CylinderGeometry(0.0045,0.0045,0.022,8),at(-0.0095,0,-0.032,Math.PI/2)]]),chrome,plugGroup);
 const socketTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#f1f3f1';x.fillRect(0,0,128,128);x.fillStyle='#d6dbd8';x.beginPath();x.arc(64,64,46,0,7);x.fill();x.fillStyle='#232b2e';for(const [px,py] of [[48,64],[80,64]]){x.beginPath();x.arc(px,py,7,0,7);x.fill();}x.fillRect(60,40,8,10);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;own(t);return t;})();
 const socket=mesh(new THREE.BoxGeometry(0.09,0.09,0.014),std('#ffffff',0.5,0,{map:socketTexture}));socket.position.set(...PLACE.socket);
 const cableMaterial=std('#1f2629',0.65,0.05),SEGMENTS=34;
 const cable=own(new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.0072,0.0072,1,8)),cableMaterial,SEGMENTS));cable.frustumCulled=false;scene.add(cable);
 const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],false,'catmullrom',0.5);

 // ---- furniture ----
 const metal=std('#a9b9bb',0.38,0.85,{envMapIntensity:1.3}),inox=std('#cfd9d9',0.28,0.9,{envMapIntensity:1.3});
 mesh(merge([[new THREE.CylinderGeometry(0.19,0.19,0.028,44),at(PLACE.headRest[0],0.456,PLACE.headRest[2])]]),std('#2a3b41',0.5,0.1),scene);
 const legs=[];for(let i=0;i<3;i++){const a=i*Math.PI*2/3+0.5;legs.push([new THREE.CylinderGeometry(0.011,0.014,0.45,10),at(PLACE.headRest[0]+Math.cos(a)*0.15,0.226,PLACE.headRest[2]+Math.sin(a)*0.15,Math.sin(a)*-0.09,0,Math.cos(a)*0.09)]);}
 legs.push([new THREE.TorusGeometry(0.16,0.008,8,40),at(PLACE.headRest[0],0.2,PLACE.headRest[2],Math.PI/2)]);mesh(merge(legs),metal);
 mesh(merge([[new RoundedBoxGeometry(0.4,0.03,0.3,3,0.01),at(-0.52,0.015,0.12)]]),inox);
 mesh(new RoundedBoxGeometry(0.36,0.01,0.26,2,0.004).translate(-0.52,0.0295,0.12),std('#b9c6c6',0.3,0.8));
 mesh(lathe([[0.125,0],[0.13,0.015],[0.148,0.25],[0.165,0.4],[0.172,0.418],[0.1745,0.426],[0.168,0.43],[0.159,0.418],[0.14,0.25],[0.12,0.04],[0,0.03]],48).scale(BIN.scale,BIN.scale,BIN.scale).translate(BIN.x,0,BIN.z),std('#3f7d62',0.45,0.05));
 mesh(merge([[new RoundedBoxGeometry(0.52,0.03,0.42,3,0.008),at(-0.58,0.485,-0.46)],[new THREE.BoxGeometry(0.03,0.22,0.012),at(-0.78,0.4,-0.744)],[new THREE.BoxGeometry(0.03,0.22,0.012),at(-0.38,0.4,-0.744)],[new THREE.BoxGeometry(0.024,0.3,0.024),at(-0.78,0.35,-0.55,0.82)],[new THREE.BoxGeometry(0.024,0.3,0.024),at(-0.38,0.35,-0.55,0.82)]]),std('#dfe6e6',0.4,0.5));
 // sealing tape roll
 const tape=new THREE.Group(),tapeRoll=std('#e4892f',0.5,0,{emissive:'#000000'});scene.add(tape);
 mesh(merge([[new THREE.TorusGeometry(0.034,0.016,12,32),at(0,0,0,Math.PI/2)]]),tapeRoll,tape);mesh(new THREE.CylinderGeometry(0.02,0.02,0.032,24),cardboard,tape);

 // ---- movable parts registry ----
 const euler=new THREE.Euler(0,0,0,'ZYX'),UP=new THREE.Vector3(0,1,0);
 const parts={
  head:{group:headGroup,materials:[headPlastic,headDark,orange],shadow:null},
  clipLeft:{group:clips.left,materials:[clipMetal],shadow:null},clipRight:{group:clips.right,materials:[clipMetal],shadow:null},
  used:{group:used.group,materials:[used.paper],shadow:null},fresh:{group:fresh.group,materials:[fresh.paper],shadow:null},
  plug:{group:plugGroup,materials:[plugBody],shadow:null},tape:{group:tape,materials:[tapeRoll],shadow:null}
 };
 const carryRotation={head:[0,0,0],used:[0,0,0],fresh:[0,0,0],plug:[0,0,0]};
 const shadowSize={head:0.46,used:0.3,fresh:0.3,plug:0.16};
 for(const id of Object.keys(shadowSize)){const material=own(staticShadow.clone());material.opacity=0.4;const m=blob(0,0,shadowSize[id],shadowSize[id],material);parts[id].shadow=m;}
 for(const [id,part] of Object.entries(parts)){part.id=id;part.pos=new THREE.Vector3();part.quat=new THREE.Quaternion();part.scale=1;part.targetPos=new THREE.Vector3();part.targetQuat=new THREE.Quaternion();part.targetScale=1;part.held=null;part.place=null;part.settled=false;}
 const setTarget=(part,pose,rotation=pose.r)=>{part.targetPos.set(...pose.p);part.targetQuat.setFromEuler(euler.set(rotation[0],rotation[1],rotation[2]));part.targetScale=pose.s;};
 const tmpV=new THREE.Vector3(),tmpQ=new THREE.Quaternion(),tmpV2=new THREE.Vector3();

 // ---- target highlighting ----
 const ring=own(new THREE.Mesh(own(new THREE.RingGeometry(0.9,1,64)),own(new THREE.MeshBasicMaterial({color:AMBER,transparent:true,opacity:0.0,depthWrite:false,side:THREE.DoubleSide}))));ring.rotation.x=-Math.PI/2;ring.visible=false;ring.renderOrder=3;scene.add(ring);
 const RINGS={rest:[PLACE.headRest[0],0.474,PLACE.headRest[2],0.21,0.21],head:[0,0.408,0,0.215,0.215],machine:[0,0.408,0,0.2,0.2],tray:[-0.52,0.036,0.12,0.22,0.17],bin:[BIN.x,0.326,BIN.z,0.15,0.15]};
 let highlight={part:null,zone:null,color:AMBER},pulseTime=0;
 // ---- API ----
 const api={
  scene,camera,parts,
  setHighlight(part,zone,color=AMBER){highlight={part,zone,color};},
  // Where each part should rest for the current practice state; parts glide there unless a hand is holding them.
  setPlaces(places,{instant=false}={}){
   const map={head:places.head,clipLeft:places.clipLeft,clipRight:places.clipRight,used:places.used,fresh:places.fresh,plug:places.plug,tape:'rest'};
   for(const [id,place] of Object.entries(map)){const part=parts[id];part.place=place;if(!part.held){setTarget(part,placePose(id==='tape'?'tape':id,place==='rest'&&id==='tape'?'rest':place));}if(instant){part.pos.copy(part.targetPos);part.quat.copy(part.targetQuat);part.scale=part.targetScale;}}
   sealed=Boolean(places.usedSealed);
  },
  // Hold a part so its grip anchor sits at world position `anchor`; pass null to let it go (it returns to its resting place).
  hold(id,anchor){
   const part=parts[id];if(!anchor){part.held=null;if(part.place)setTarget(part,placePose(id,part.place));return;}
   if(!part.held)part.held=new THREE.Vector3();part.held.set(anchor[0],anchor[1],anchor[2]);
   const rot=carryRotation[id]||[0,0,0];tmpQ.setFromEuler(euler.set(rot[0],rot[1],rot[2]));
   tmpV.set(ANCHOR[id][0],ANCHOR[id][1],ANCHOR[id][2]).applyQuaternion(tmpQ);part.targetPos.copy(part.held).sub(tmpV);part.targetQuat.copy(tmpQ);part.targetScale=1;
  },
  // Grip anchor of a part right now, in world space.
  anchor(id,out=new THREE.Vector3()){const part=parts[id];part.group.updateMatrixWorld(true);return out.set(ANCHOR[id][0],ANCHOR[id][1],ANCHOR[id][2]).applyMatrix4(part.group.matrixWorld);},
  // The stage changed size: keep the same framing at the new aspect ratio (narrow stages pull back so nothing is cut off).
  resize(width,height){aspect=width/height;applyCamera();},
  // Frame an area of the room (a FOCUS key). The camera glides there unless `instant` (or reduced motion) is set.
  setFocus(key,{instant=false}={}){goal=FOCUS[key]||FOCUS.wide;if(instant||reducedMotion){now=copyFocus(goal);applyCamera();gliding=false;}else gliding=true;},
  // Frame the blend of two areas (used by the demonstration, whose camera is a pure function of time so scrubbing is exact).
  setFocusBlend(from,to,k){now=mixFocus(FOCUS[from]||FOCUS.wide,FOCUS[to]||FOCUS.wide,k);goal=now;gliding=false;applyCamera();},
  // Advance easing and animation; returns true while anything is still moving or pulsing.
  update(dt,time){
   let moving=false;const k=reducedMotion?1:1-Math.exp(-dt*13);
   if(gliding){const e=1-Math.exp(-dt*4.5);now.c[0]+=(goal.c[0]-now.c[0])*e;now.c[1]+=(goal.c[1]-now.c[1])*e;now.w+=(goal.w-now.w)*e;now.h+=(goal.h-now.h)*e;
    if(Math.abs(goal.c[0]-now.c[0])+Math.abs(goal.c[1]-now.c[1])+Math.abs(goal.w-now.w)+Math.abs(goal.h-now.h)<2e-3){now=copyFocus(goal);gliding=false;}else moving=true;applyCamera();}
   for(const part of Object.values(parts)){
    const err=part.pos.distanceToSquared(part.targetPos);
    if(!part.settled||err>1e-9||part.held){part.pos.lerp(part.targetPos,k);part.quat.slerp(part.targetQuat,k);part.scale+=(part.targetScale-part.scale)*k;const dq=Math.abs(part.quat.dot(part.targetQuat));
     if(err<1e-9&&dq>0.999999&&Math.abs(part.targetScale-part.scale)<1e-5&&!part.held){part.pos.copy(part.targetPos);part.quat.copy(part.targetQuat);part.scale=part.targetScale;part.settled=true;}else{part.settled=false;moving=true;}
    }
    part.group.position.copy(part.pos);part.group.quaternion.copy(part.quat);part.group.scale.setScalar(part.scale);
    if(part.shadow){const lift=Math.max(0,part.pos.y);part.shadow.position.x=part.pos.x;part.shadow.position.z=part.pos.z;part.shadow.material.opacity=0.46/(1+lift*3.2);const s=shadowSize[part.id]*(1+lift*0.6);part.shadow.scale.set(s,s,1);}
   }
   // tape strip wraps the sealed bag
   const wanted=sealed?1:0;if(Math.abs(seal.scale.x-wanted)>0.002||(seal.visible!==sealed&&seal.scale.x>0.002)){seal.scale.x+=((wanted||0.001)-seal.scale.x)*(reducedMotion?1:1-Math.exp(-dt*9));seal.visible=seal.scale.x>0.01;moving=true;}else{seal.scale.x=sealed?1:0.001;seal.visible=sealed;}
   // cable follows the plug
   plugGroup.updateMatrixWorld(true);tmpV.set(0,0,0.05).applyMatrix4(plugGroup.matrixWorld);
   if(cableDirty(tmpV)){updateCable(tmpV);}
   // pulses
   pulseTime=time;const wave=0.5+0.5*Math.sin(time*5.2);
   for(const part of Object.values(parts))for(const m of part.materials)if(m.emissive)m.emissive.setScalar(0);
   if(highlight.part&&parts[highlight.part]){const e=0.03+0.1*wave;for(const m of parts[highlight.part].materials)if(m.emissive){m.emissive.copy(highlight.color).multiplyScalar(e);}moving=true;}
   const target=highlight.zone&&RINGS[highlight.zone];
   if(target){ring.visible=true;ring.position.set(target[0],target[1],target[2]);const pulse=1+0.06*wave;ring.scale.set(target[3]*pulse,target[4]*pulse,1);ring.material.color.copy(highlight.color);ring.material.opacity=0.55+0.35*wave;moving=true;}else ring.visible=false;
   return moving;
  }
 };
 let sealed=false,lastPlug=new THREE.Vector3(1e9,0,0);
 const cableDirty=p=>p.distanceToSquared(lastPlug)>1e-8;
 const idle=new THREE.Matrix4(),q=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3(),mid=new THREE.Vector3(),dir=new THREE.Vector3(),sc=new THREE.Vector3();
 function updateCable(end){
  lastPlug.copy(end);const start=cableCurve.points[0].set(0,0.2,-0.185);
  const p=cableCurve.points;p[4].copy(end);
  // the cable droops to the floor between the machine and wherever the plug is
  const span=start.distanceTo(end);
  p[1].lerpVectors(start,end,0.28);p[1].y=Math.max(0.01,Math.min(start.y,end.y)-0.1*Math.min(1,span*1.5));p[1].z-=0.02;
  p[2].lerpVectors(start,end,0.56);p[2].y=Math.max(0.01,Math.min(start.y,end.y)-0.16*Math.min(1,span*1.5));
  p[3].lerpVectors(start,end,0.82);p[3].y=Math.max(0.012,end.y-0.05*Math.min(1,span*2));
  for(let i=0;i<SEGMENTS;i++){
   cableCurve.getPoint(i/SEGMENTS,a);cableCurve.getPoint((i+1)/SEGMENTS,b);dir.subVectors(b,a);const length=dir.length();mid.addVectors(a,b).multiplyScalar(0.5);
   q.setFromUnitVectors(UP,dir.multiplyScalar(1/Math.max(length,1e-6)));sc.set(1,length*1.25,1);idle.compose(mid,q,sc);cable.setMatrixAt(i,idle);
  }
  cable.instanceMatrix.needsUpdate=true;
 }
 life.onCleanup(()=>{scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();}});});
 return api;
}
