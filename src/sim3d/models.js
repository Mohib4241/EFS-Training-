import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createLabelTexture,createPaperTexture} from './tiles.js';

// Procedural models shared by every maintenance task. Each builder adds meshes to a parent group and returns the groups
// and materials a task needs to move or tint. Parts that share a material are merged, so each model costs a few draw calls.
const TAU=Math.PI*2;

// ---- the vacuum cleaner ----
// body: tank, label band, base and wheels (static); head: lid, handle, button, gasket, latches (movable); clips: hinged on the rim.
export function buildVacuum(kit,{label='JUNIOR 103',parent=kit.scene}={}){
 const {mesh,std,merge,at,lathe,group}=kit,body=group(parent);
 const tankMaterial=std('#2f4f58',0.34,0.55,{envMapIntensity:1.1}),band=std('#ffffff',0.45,0,{map:createLabelTexture({text:label,life:kit})});
 mesh(lathe([[0.12,0.036],[0.165,0.042],[0.178,0.07],[0.185,0.12],[0.1865,0.34],[0.189,0.385],[0.1915,0.396],[0.188,0.404],[0.18,0.406],[0.176,0.399],[0.1745,0.39],[0.1725,0.1],[0.16,0.064],[0.0,0.06]]),tankMaterial,body);
 const bandMesh=mesh(new THREE.CylinderGeometry(0.1872,0.1872,0.095,64,1,true),band,body);bandMesh.position.y=0.2;bandMesh.rotation.y=Math.PI;
 const rubber=std('#15191b',0.8,0),plastic=std('#26363c',0.5,0.2);
 mesh(merge([[new THREE.CylinderGeometry(0.2,0.2,0.032,48),at(0,0.03,0)],[new THREE.TorusGeometry(0.2,0.006,10,48),at(0,0.046,0,Math.PI/2)]]),plastic,body);
 const wheels=[];for(const a of [0.35,Math.PI*0.8+0.35,Math.PI*1.4+0.35])wheels.push([new THREE.CylinderGeometry(0.03,0.03,0.022,20),at(Math.cos(a)*0.15,0.03,Math.sin(a)*0.15,0,0,Math.PI/2)]);
 mesh(merge(wheels),rubber,body);
 const head=group(parent);
 const headPlastic=std('#2d444c',0.4,0.25,{envMapIntensity:1.2}),headDark=std('#1b2b31',0.5,0.1),orange=std('#ee8c45',0.45,0,{emissive:'#000000'}),chrome=std('#c4cfd0',0.22,0.95,{envMapIntensity:1.4}),gasket=std('#0e1112',0.85,0);
 mesh(merge([[lathe([[0,0],[0.19,0],[0.195,0.012],[0.195,0.028],[0.186,0.04],[0.172,0.072],[0.15,0.098],[0.12,0.118],[0.085,0.13],[0.045,0.137],[0,0.139]],64)],[lathe([[0.06,0.13],[0.07,0.145],[0.068,0.16],[0.05,0.168],[0,0.17]],40)]]),headPlastic,head);
 mesh(merge([[new THREE.TorusGeometry(0.085,0.0115,12,36,Math.PI),at(0,0.135,0)],[new THREE.CylinderGeometry(0.0115,0.0115,0.065,12),at(0.085,0.1,0)],[new THREE.CylinderGeometry(0.0115,0.0115,0.065,12),at(-0.085,0.1,0)]]),headDark,head);
 mesh(new RoundedBoxGeometry(0.05,0.02,0.032,3,0.006).applyMatrix4(at(0.1,0.092,0.098,-0.5,0.5,0)),orange,head);
 mesh(new THREE.TorusGeometry(0.188,0.006,8,56).rotateX(Math.PI/2).translate(0,0.004,0),gasket,head);
 mesh(merge([[new THREE.BoxGeometry(0.018,0.024,0.04),at(0.205,0.018,0)],[new THREE.BoxGeometry(0.018,0.024,0.04),at(-0.205,0.018,0)]]),chrome,head);
 const clipMetal=std('#c4cfd0',0.22,0.95,{envMapIntensity:1.4}),clips={};
 for(const side of ['left','right']){
  const dir=side==='left'?-1:1;clips[side]=group(parent);
  mesh(merge([[new RoundedBoxGeometry(0.016,0.078,0.012,2,0.004),at(0,0.039,0.002)],[new THREE.BoxGeometry(0.026,0.012,0.016),at(-dir*0.006,0.074,0.002)],[new THREE.CylinderGeometry(0.009,0.009,0.034,14),at(0,0,0,Math.PI/2)]]),clipMetal,clips[side]);
 }
 return {body,head,clips,materials:{head:[headPlastic,headDark,orange],clip:[clipMetal],tank:tankMaterial}};
}

// ---- UK 13 A plug, socket and cable ----
// Plug local frame: pins point along -z (into the socket), the cable leaves the bottom edge (-y) through the cord grip.
export const PLUG={depth:0.03,face:-0.015,grip:[0,-0.041,0]};
export function buildPlug(kit,{heatMark=false,parent=kit.scene}={}){
 const {mesh,std,merge,at,group,canvasTexture}=kit,plug=group(parent);
 const shell=std('#eef1ee',0.42,0,{emissive:'#000000'}),brass=std('#c9a861',0.3,0.9,{envMapIntensity:1.3}),sleeve=std('#151819',0.6,0),grip=std('#d9ddd9',0.5,0);
 mesh(merge([[new RoundedBoxGeometry(0.05,0.064,PLUG.depth,3,0.006)],[new RoundedBoxGeometry(0.03,0.006,0.026,2,0.002),at(0,0.032,0)]]),shell,plug);
 mesh(merge([[new RoundedBoxGeometry(0.022,0.016,0.02,2,0.004),at(0,-0.036,0)],[new THREE.CylinderGeometry(0.0068,0.0068,0.012,14),at(0,-0.047,0)]]),grip,plug);
 // earth pin vertical, line and neutral pins horizontal with insulated sleeves, as on BS 1363
 mesh(merge([[new THREE.BoxGeometry(0.004,0.008,0.0227),at(0,0.011,PLUG.face-0.01135)],[new THREE.BoxGeometry(0.00635,0.004,0.0177),at(0.011,-0.011,PLUG.face-0.00885)],[new THREE.BoxGeometry(0.00635,0.004,0.0177),at(-0.011,-0.011,PLUG.face-0.00885)]]),brass,plug);
 mesh(merge([[new THREE.BoxGeometry(0.0069,0.0045,0.009),at(0.011,-0.011,PLUG.face-0.0045)],[new THREE.BoxGeometry(0.0069,0.0045,0.009),at(-0.011,-0.011,PLUG.face-0.0045)]]),sleeve,plug);
 let stain=null;
 if(heatMark){
  // scorching around the line pin and up the casing beside it: the visible warning sign this lesson is about
  const decal=canvasTexture(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);const g=x.createRadialGradient(w*0.58,h*0.6,4,w*0.58,h*0.6,w*0.42);g.addColorStop(0,'rgba(38,22,10,0.95)');g.addColorStop(0.35,'rgba(92,52,20,0.8)');g.addColorStop(0.7,'rgba(150,100,45,0.35)');g.addColorStop(1,'rgba(160,120,60,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
   for(let i=0;i<40;i++){x.fillStyle=`rgba(40,25,12,${0.1+Math.random()*0.3})`;x.beginPath();x.arc(w*0.58+(Math.random()-0.5)*w*0.4,h*0.6+(Math.random()-0.5)*h*0.4,1+Math.random()*4,0,TAU);x.fill();}});
  const stainMat=std('#ffffff',0.8,0,{map:decal,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const face=new THREE.PlaneGeometry(0.036,0.036).rotateY(Math.PI).translate(0.011,-0.006,PLUG.face-0.0004);
  const side=new THREE.PlaneGeometry(0.03,0.03).rotateY(Math.PI/2).translate(0.0251,-0.008,-0.002);
  stain=mesh(merge([[face],[side]]),stainMat,plug);
 }
 return {plug,materials:[shell],stain};
}
export function buildSocket(kit,{position,parent=kit.scene}){
 const {mesh,std,canvasTexture}=kit;
 const face=canvasTexture(256,256,(x,w,h)=>{x.fillStyle='#f3f5f3';x.fillRect(0,0,w,h);x.strokeStyle='#d5dad7';x.lineWidth=6;x.strokeRect(10,10,w-20,h-20);x.fillStyle='#1d2427';
  x.fillRect(w*0.46,h*0.2,w*0.05,h*0.15);x.fillRect(w*0.26,h*0.6,w*0.1,h*0.05);x.fillRect(w*0.56,h*0.6,w*0.1,h*0.05);
  x.fillStyle='#e4e7e4';x.fillRect(w*0.76,h*0.36,w*0.12,h*0.26);x.fillStyle='#c94b3a';x.fillRect(w*0.785,h*0.39,w*0.07,h*0.07);});
 const plate=mesh(new RoundedBoxGeometry(0.086,0.086,0.01,2,0.004),std('#ffffff',0.45,0,{map:face}),parent);plate.position.set(...position);
 return plate;
}
// The mains lead: instanced segments along a curve from the machine to the plug's cord grip. update() is cheap enough per frame.
export function buildCable(kit,{start,segments=34,parent=kit.scene}){
 const {own,std}=kit;
 const cable=own(new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.0072,0.0072,1,8)),std('#1f2629',0.65,0.05),segments));cable.frustumCulled=false;parent.add(cable);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(...start),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],false,'catmullrom',0.5);
 const a=new THREE.Vector3(),b=new THREE.Vector3(),mid=new THREE.Vector3(),dir=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),m=new THREE.Matrix4(),UP=new THREE.Vector3(0,1,0),last=new THREE.Vector3(1e9,0,0);
 return {
  mesh:cable,
  // end: world position of the cord grip; the lead droops to the floor between the machine and wherever the plug is
  update(end){
   if(end.distanceToSquared(last)<1e-8)return false;last.copy(end);
   const p=curve.points,s=p[0],span=s.distanceTo(end),low=Math.min(s.y,end.y);
   p[4].copy(end);p[1].lerpVectors(s,end,0.28);p[1].y=Math.max(0.01,low-0.1*Math.min(1,span*1.5));p[1].z-=0.02;
   p[2].lerpVectors(s,end,0.56);p[2].y=Math.max(0.01,low-0.16*Math.min(1,span*1.5));
   p[3].lerpVectors(s,end,0.84);p[3].y=Math.max(0.012,Math.min(end.y-0.06,low+0.02));
   for(let i=0;i<segments;i++){
    curve.getPoint(i/segments,a);curve.getPoint((i+1)/segments,b);dir.subVectors(b,a);const length=dir.length();mid.addVectors(a,b).multiplyScalar(0.5);
    q.setFromUnitVectors(UP,dir.multiplyScalar(1/Math.max(length,1e-6)));scale.set(1,length*1.25,1);m.compose(mid,q,scale);cable.setMatrixAt(i,m);
   }
   cable.instanceMatrix.needsUpdate=true;return true;
  }
 };
}

// ---- furniture and props ----
export function buildStool(kit,{position,parent=kit.scene}){
 const {mesh,std,merge,at}=kit,[x,,z]=position;
 mesh(new THREE.CylinderGeometry(0.19,0.19,0.028,44).translate(x,0.456,z),std('#2a3b41',0.5,0.1),parent);
 const legs=[];for(let i=0;i<3;i++){const a=i*TAU/3+0.5;legs.push([new THREE.CylinderGeometry(0.011,0.014,0.45,10),at(x+Math.cos(a)*0.15,0.226,z+Math.sin(a)*0.15,Math.sin(a)*-0.09,0,Math.cos(a)*0.09)]);}
 legs.push([new THREE.TorusGeometry(0.16,0.008,8,40),at(x,0.2,z,Math.PI/2)]);mesh(merge(legs),std('#a9b9bb',0.38,0.85,{envMapIntensity:1.3}),parent);
}
export function buildTray(kit,{position,size=[0.4,0.3],parent=kit.scene}){
 const {mesh,std}=kit,[x,y,z]=position,[w,d]=size;
 mesh(new RoundedBoxGeometry(w,0.03,d,3,0.01).translate(x,y+0.015,z),std('#cfd9d9',0.28,0.9,{envMapIntensity:1.3}),parent);
 mesh(new RoundedBoxGeometry(w-0.04,0.01,d-0.04,2,0.004).translate(x,y+0.0295,z),std('#b9c6c6',0.3,0.8),parent);
}
export function buildBin(kit,{position,scale=0.75,color='#3f7d62',parent=kit.scene}){
 const {mesh,std,lathe}=kit,[x,,z]=position;
 mesh(lathe([[0.125,0],[0.13,0.015],[0.148,0.25],[0.165,0.4],[0.172,0.418],[0.1745,0.426],[0.168,0.43],[0.159,0.418],[0.14,0.25],[0.12,0.04],[0,0.03]],48).scale(scale,scale,scale).translate(x,0,z),std(color,0.45,0.05),parent);
}
export function buildShelf(kit,{position,parent=kit.scene}){
 const {mesh,std,merge,at}=kit,[x,y,z]=position;
 mesh(merge([[new RoundedBoxGeometry(0.52,0.03,0.42,3,0.008),at(x,y,z)],[new THREE.BoxGeometry(0.03,0.22,0.012),at(x-0.2,y-0.085,-0.744)],[new THREE.BoxGeometry(0.03,0.22,0.012),at(x+0.2,y-0.085,-0.744)],[new THREE.BoxGeometry(0.024,0.3,0.024),at(x-0.2,y-0.135,(z-0.744)/2+0.06,0.82)],[new THREE.BoxGeometry(0.024,0.3,0.024),at(x+0.2,y-0.135,(z-0.744)/2+0.06,0.82)]]),std('#dfe6e6',0.4,0.5),parent);
}
export function buildTapeRoll(kit,{parent=kit.scene}={}){
 const {mesh,std,at,group}=kit,tape=group(parent),roll=std('#e4892f',0.5,0,{emissive:'#000000'});
 mesh(new THREE.TorusGeometry(0.034,0.016,12,32).applyMatrix4(at(0,0,0,Math.PI/2)),roll,tape);mesh(new THREE.CylinderGeometry(0.02,0.02,0.032,24),std('#c7b184',0.9,0),tape);
 return {group:tape,materials:[roll]};
}
export function buildDustBag(kit,{used,parent=kit.scene}){
 const {mesh,std,group}=kit,bag=group(parent),paper=std('#ffffff',0.95,0,{map:createPaperTexture({label:used?'USED · 80%':'CLEAN BAG',used,life:kit})});
 mesh(new RoundedBoxGeometry(0.2,0.3,0.085,5,0.022).translate(0,-0.152,0),paper,bag);
 const shape=new THREE.Shape(),w=0.15,h=0.105,r=0.012;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const hole=new THREE.Path();hole.absarc(0,0,0.027,0,TAU,true);shape.holes.push(hole);
 mesh(new THREE.ExtrudeGeometry(shape,{depth:0.004,bevelEnabled:false,curveSegments:20}).translate(0,-0.068,0.0425),std('#c7b184',0.9,0),bag);
 let seal=null;if(used){seal=mesh(new THREE.BoxGeometry(0.212,0.034,0.094),std('#e4892f',0.5,0),bag);seal.position.y=-0.022;seal.visible=false;seal.scale.x=0.001;}
 return {group:bag,materials:[paper],seal};
}

// ---- reusable filters ----
// Fabric for the textile basket filter: woven threads, with dust that can be washed away (dirt 0..1 blends it in).
function fabricTexture(kit,tone){
 return kit.canvasTexture(256,256,(x,w,h)=>{x.fillStyle=tone;x.fillRect(0,0,w,h);
  for(let i=0;i<w;i+=4){x.fillStyle=`rgba(255,255,255,${0.08+0.06*(i%8===0)})`;x.fillRect(i,0,1,h);x.fillStyle='rgba(40,70,80,0.08)';x.fillRect(0,i,w,1);}},{repeat:true});
}
const dustTexture=kit=>kit.canvasTexture(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(120,104,80,0.25)');g.addColorStop(1,'rgba(96,80,60,0.85)');x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<500;i++){x.fillStyle=`rgba(70,55,35,${Math.random()*0.35})`;x.beginPath();x.arc(Math.random()*w,Math.random()*h,1+Math.random()*3,0,TAU);x.fill();}});
// Pleated cylinder: radius varies around the axis (pleats); built as an open tube with a closed bottom.
function pleatedTube(radius,height,pleats,depth,{bottom=0,taper=0}={}){
 const radial=pleats*4,rings=8,pos=[],uv=[],idx=[];
 for(let j=0;j<=rings;j++){const v=j/rings,y=bottom+v*height,r0=radius*(1-taper*(1-v));
  for(let i=0;i<=radial;i++){const u=i/radial,a=u*TAU,r=r0+depth*Math.abs(Math.sin(a*pleats/2));pos.push(Math.cos(a)*r,y,Math.sin(a)*r);uv.push(u*4,v);}}
 for(let j=0;j<rings;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,b=a+radial+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Anchor (the rim where the fingers hold it) is the local origin; the filter hangs below it.
export function buildFilter(kit,{caged,parent=kit.scene}){
 const {mesh,std,merge,at,group,lathe}=kit,filter=group(parent),materials=[];
 if(!caged){
  const fabric=std('#ffffff',0.95,0,{map:fabricTexture(kit,'#b8d4dc'),side:THREE.DoubleSide});fabric.map.repeat.set(3,1.5);
  mesh(pleatedTube(0.14,0.24,18,0.008,{bottom:-0.25,taper:0.12}),fabric,filter);
  mesh(new THREE.CircleGeometry(0.124,32).rotateX(Math.PI/2).translate(0,-0.25,0),fabric,filter);
  const dust=std('#ffffff',1,0,{map:dustTexture(kit),transparent:true,depthWrite:false,opacity:1});
  mesh(pleatedTube(0.1415,0.235,18,0.008,{bottom:-0.247,taper:0.12}),dust,filter);
  const rim=std('#3a5960',0.45,0.2,{emissive:'#000000'});mesh(merge([[new THREE.TorusGeometry(0.162,0.007,10,48),at(0,-0.004,0,Math.PI/2)],[new THREE.CylinderGeometry(0.162,0.146,0.016,48,1,true),at(0,-0.012,0)]]),rim,filter);
  materials.push(fabric,rim);return {group:filter,materials,fabric,dust,wetTargets:[fabric]};
 }
 const media=std('#f4f2e8',0.92,0,{map:kit.canvasTexture(64,256,(x,w,h)=>{x.fillStyle='#f6f4ea';x.fillRect(0,0,w,h);for(let i=0;i<h;i+=8){x.fillStyle='rgba(150,150,130,0.18)';x.fillRect(0,i,w,2);}},{repeat:true})});
 mesh(pleatedTube(0.085,0.21,24,0.012,{bottom:-0.23}),media,filter);
 const cage=std('#2a3d43',0.5,0.25,{emissive:'#000000'}),bars=[];
 for(let i=0;i<10;i++){const a=i*TAU/10;bars.push([new THREE.BoxGeometry(0.008,0.22,0.008),at(Math.cos(a)*0.103,-0.12,Math.sin(a)*0.103,0,-a,0)]);}
 for(const y of [-0.06,-0.14,-0.22])bars.push([new THREE.TorusGeometry(0.103,0.004,6,40),at(0,y,0,Math.PI/2)]);
 bars.push([lathe([[0.03,-0.012],[0.118,-0.012],[0.12,0],[0.104,0.004],[0.03,0.004]],48)]);bars.push([new THREE.CylinderGeometry(0.105,0.105,0.012,40),at(0,-0.236,0)]);
 mesh(merge(bars),cage,filter);
 const dust=std('#ffffff',1,0,{map:dustTexture(kit),transparent:true,depthWrite:false});mesh(pleatedTube(0.0862,0.2,24,0.012,{bottom:-0.225}),dust,filter);
 materials.push(cage,media);return {group:filter,materials,fabric:media,dust,wetTargets:[media]};
}

// ---- water: sink, tap, stream ----
// A scrolling streak texture on a thin tube reads as running water; splash ripples spread where it lands.
// The texture's grey level is both colour and opacity: a translucent body with brighter streaks running down it.
function waterMaterial(kit){
 const map=kit.canvasTexture(64,256,(x,w,h)=>{x.fillStyle='rgb(150,150,150)';x.fillRect(0,0,w,h);
  for(let i=0;i<90;i++){const px=Math.random()*w,len=16+Math.random()*70,v=200+Math.floor(Math.random()*55);x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(px,Math.random()*h,1+Math.random()*3,len);}
  for(let i=0;i<30;i++){x.fillStyle='rgba(110,110,110,0.8)';x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,10+Math.random()*30);}},{repeat:true,srgb:false});
 return kit.std('#e4f7ff',0.05,0,{map,alphaMap:map,transparent:true,opacity:0.95,depthWrite:false,envMapIntensity:1.8,emissive:'#7cc8e0',emissiveIntensity:0.18});
}
// Running water from a spout: a tapering translucent column whose streaks scroll down, and a splash where it lands.
export function buildStream(kit,{top,bottom,radius=0.0085,parent=kit.scene}){
 const {mesh,own}=kit,material=waterMaterial(kit),length=top[1]-bottom[1];material.map.repeat.set(1,length*5);
 const stream=mesh(new THREE.CylinderGeometry(radius,radius*0.8,length,14,8,true),material,parent);stream.position.set(top[0],(top[1]+bottom[1])/2,top[2]);
 const splashMat=own(new THREE.MeshBasicMaterial({color:'#f2fbff',transparent:true,opacity:0.6,depthWrite:false}));
 const splash=mesh(new THREE.RingGeometry(0.014,0.05,32).rotateX(-Math.PI/2),splashMat,parent);splash.position.set(bottom[0],bottom[1]+0.002,bottom[2]);
 let on=0,target=0;
 return {
  set(value){target=value?1:0;},
  get on(){return target>0;},
  // returns true while the water is visibly running or fading
  update(dt,time){
   on+=(target-on)*Math.min(1,dt*10);stream.visible=splash.visible=on>0.02;if(!stream.visible)return target!==on&&Math.abs(target-on)>0.001;
   material.map.offset.y=time*3.2;material.opacity=0.95*on;stream.scale.set(on*(1+0.04*Math.sin(time*23)),1,on);
   const s=1+0.25*Math.sin(time*31);splash.scale.set(s,1,s);splashMat.opacity=0.55*on;return true;
  }
 };
}
// A freestanding stainless utility sink against the wall: basin on four legs, rolled rim, splashback, drain and trap, with a
// wall tap above it. The inside is drawn darker (a box seen only from within) so the open basin reads clearly from above.
export function buildUtilitySink(kit,{position,size=[0.5,0.38,0.2],tap=[0.24,0.2],parent=kit.scene}){
 const {mesh,std,merge,at}=kit,[x,y,z]=position,[w,d,h]=size,t=0.012,floor=y-h;
 const steel=std('#dfe6e7',0.28,0.88,{envMapIntensity:1.5}),inside=std('#9eacaf',0.38,0.8,{envMapIntensity:1.2,side:THREE.BackSide});
 const parts=[[new THREE.BoxGeometry(w,t,d),at(x,floor,z)],[new THREE.BoxGeometry(w,h,t),at(x,y-h/2,z-d/2)],[new THREE.BoxGeometry(w,h,t),at(x,y-h/2,z+d/2)],[new THREE.BoxGeometry(t,h,d),at(x-w/2,y-h/2,z)],[new THREE.BoxGeometry(t,h,d),at(x+w/2,y-h/2,z)],
  // rolled rim
  [new THREE.CylinderGeometry(0.009,0.009,w+0.018,10),at(x,y,z+d/2,0,0,Math.PI/2)],[new THREE.CylinderGeometry(0.009,0.009,d,10),at(x-w/2,y,z,Math.PI/2)],[new THREE.CylinderGeometry(0.009,0.009,d,10),at(x+w/2,y,z,Math.PI/2)],
  // splashback on the wall
  [new THREE.BoxGeometry(w+0.06,0.32,0.008),at(x,y+0.14,-0.744)],
  // trap under the drain, into the wall
  [new THREE.CylinderGeometry(0.016,0.016,0.1,12),at(x,floor-0.05,z)],[new THREE.TorusGeometry(0.035,0.016,8,16,Math.PI),at(x,floor-0.1,z-0.035,0,Math.PI/2,Math.PI)],[new THREE.CylinderGeometry(0.016,0.016,Math.abs(-0.744-(z-0.07)),12),at(x,floor-0.1+0.0,(z-0.07-0.744)/2,Math.PI/2)]];
 for(const [i,j] of [[-1,-1],[1,-1],[-1,1],[1,1]])parts.push([new THREE.BoxGeometry(0.03,floor,0.03),at(x+i*(w/2-0.03),floor/2,z+j*(d/2-0.03))]);
 mesh(merge(parts),steel,parent);
 mesh(new THREE.BoxGeometry(w-2*t-0.004,h-0.002,d-2*t-0.004).translate(x,y-h/2+0.001+t/2,z),inside,parent);
 mesh(new THREE.CircleGeometry(0.022,20).rotateX(-Math.PI/2).translate(x,floor+t/2+0.0015,z),std('#4f5b5d',0.4,0.7),parent);
 return buildTap(kit,{base:[x,y+tap[0],-0.74],spout:[x,y+tap[1],z-0.02],parent});
}
// Wall-mounted gooseneck tap. The lever (a movable part) rotates between off and on; the stream runs from the spout.
export function buildTap(kit,{base,spout,parent=kit.scene}){
 const {mesh,std,merge,at,group}=kit,chrome=std('#dfe7e8',0.12,1,{envMapIntensity:1.6});
 const [bx,by,bz]=base,[sx,sy,sz]=spout,reach=sz-bz;
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(bx,by,bz),new THREE.Vector3(bx,by+0.012,bz+reach*0.45),new THREE.Vector3(sx,by+0.04,sz-0.02),new THREE.Vector3(sx,sy+0.014,sz)]);
 mesh(merge([[new THREE.TubeGeometry(path,28,0.014,12)],[new THREE.CylinderGeometry(0.03,0.03,0.03,20),at(bx,by,bz+0.008,Math.PI/2)],[new THREE.CylinderGeometry(0.016,0.013,0.016,14),at(sx,sy+0.008,sz)]]),chrome,parent);
 const lever=group(parent),leverMat=std('#dfe7e8',0.12,1,{envMapIntensity:1.6,emissive:'#000000'});
 mesh(merge([[new THREE.CylinderGeometry(0.016,0.016,0.024,14)],[new RoundedBoxGeometry(0.018,0.014,0.085,2,0.005),at(0,0.014,0.036,-0.25)]]),leverMat,lever);
 return {lever,leverMaterials:[leverMat],leverAt:[bx,by+0.03,bz+0.03],spoutTip:[sx,sy,sz]};
}
// Wall-hung hand basin (ceramic), with a deck mixer tap.
export function buildHandBasin(kit,{position,parent=kit.scene}){
 const {mesh,std,lathe}=kit,[x,y,z]=position,ceramic=std('#fbfcfb',0.16,0,{envMapIntensity:1.2});
 const bowl=lathe([[0.012,y-0.17],[0.05,y-0.168],[0.17,y-0.13],[0.225,y-0.06],[0.24,y-0.01],[0.25,y],[0.252,y+0.012],[0.24,y+0.016],[0.226,y+0.006],[0.21,y-0.045],[0.155,y-0.11],[0.045,y-0.146],[0.0,y-0.148]],56);
 bowl.scale(1.1,1,0.8).translate(x,0,z);mesh(bowl,ceramic,parent);
 mesh(new RoundedBoxGeometry(0.5,0.05,0.12,3,0.02).translate(x,y-0.005,-0.69),ceramic,parent);
 mesh(new THREE.CylinderGeometry(0.06,0.04,0.42,24).translate(x,y-0.37,-0.66),ceramic,parent);
 mesh(new THREE.CircleGeometry(0.018,20).rotateX(-Math.PI/2).translate(x,y-0.145,z),std('#9aa6a8',0.3,0.8),parent);
 return buildTap(kit,{base:[x,y+0.07,-0.71],spout:[x,y+0.13,z-0.07],parent});
}
// Wire drying rack on wall brackets: a grid of chrome bars the washed filter stands on.
export function buildDryingRack(kit,{position,size=[0.42,0.26],parent=kit.scene}){
 const {mesh,std,merge,at}=kit,[x,y,z]=position,[w,d]=size,entries=[];
 for(let i=0;i<=8;i++)entries.push([new THREE.CylinderGeometry(0.004,0.004,d,8),at(x-w/2+i*w/8,y,z,Math.PI/2)]);
 for(const dz of [-d/2,0,d/2])entries.push([new THREE.CylinderGeometry(0.005,0.005,w,8),at(x,y-0.004,z+dz,0,0,Math.PI/2)]);
 for(const dx of [-w/2+0.03,w/2-0.03])entries.push([new THREE.BoxGeometry(0.014,0.014,(z+d/2)-(-0.744)),at(x+dx,y-0.02,(z+d/2-0.744)/2)],[new THREE.BoxGeometry(0.012,0.012,0.2),at(x+dx,y-0.09,(z-0.744)/2-0.02,0.8)]);
 // drip tray under the bars
 entries.push([new THREE.BoxGeometry(w+0.02,0.006,d+0.02),at(x,y-0.06,z)],[new THREE.BoxGeometry(w+0.02,0.024,0.006),at(x,y-0.051,z+d/2+0.01)],[new THREE.BoxGeometry(0.006,0.024,d+0.02),at(x-w/2-0.01,y-0.051,z)],[new THREE.BoxGeometry(0.006,0.024,d+0.02),at(x+w/2+0.01,y-0.051,z)]);
 mesh(merge(entries),std('#c9d4d6',0.2,0.95,{envMapIntensity:1.4}),parent);
 return {trayY:y-0.057};
}
// Air movement around the drying filter during the drying preview: soft rising curls (no particles, one draw call).
export function buildAirflow(kit,{position,parent=kit.scene}){
 const {mesh,own}=kit,material=own(new THREE.MeshBasicMaterial({color:'#9fd3c4',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 const geoms=[];for(let i=0;i<3;i++){const pts=[];for(let k=0;k<=24;k++){const v=k/24;pts.push(new THREE.Vector3((i-1)*0.09+Math.sin(v*TAU*1.5+i)*0.025,v*0.32,0));}geoms.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,0.003,5));}
 const curls=mesh(kit.merge(geoms.map(g=>[g])),material,parent);curls.position.set(...position);curls.visible=false;
 let level=0,target=0;
 return {set(v){target=v;},update(dt,time){level+=(target-level)*Math.min(1,dt*3);curls.visible=level>0.01;if(!curls.visible)return Math.abs(target-level)>0.001;material.opacity=0.55*level*(0.65+0.35*Math.sin(time*3));curls.position.y=position[1]+((time*0.12)%0.06);return true;}};
}

// Water drops falling from something wet: a few small instanced drops (one draw call).
// update(dt, source) with source {at:[x,y,z], spread, floor, rate} while it drips, or null to let the last drops fall.
export function buildDrips(kit,{count=7,parent=kit.scene}={}){
 const {own,std}=kit,drops=own(new THREE.InstancedMesh(own(new THREE.SphereGeometry(1,8,6)),std('#d8f2fb',0.04,0,{transparent:true,opacity:0.8,envMapIntensity:1.8}),count));
 drops.frustumCulled=false;drops.count=count;parent.add(drops);
 const list=Array.from({length:count},(_,i)=>({wait:0.15+i*0.21,live:false,x:0,y:0,z:0,v:0,floor:0,size:0}));
 const m=new THREE.Matrix4(),hidden=new THREE.Matrix4().makeScale(0,0,0);
 for(let i=0;i<count;i++)drops.setMatrixAt(i,hidden);
 let active=false;
 return {mesh:drops,
  update(dt,source){
   if(!source&&!active)return false;
   active=false;
   list.forEach((d,i)=>{
    if(!d.live){
     if(!source){drops.setMatrixAt(i,hidden);return;}
     d.wait-=dt*(source.rate??1);if(d.wait>0){drops.setMatrixAt(i,hidden);active=true;return;}
     const a=Math.random()*TAU,r=Math.sqrt(Math.random())*(source.spread??0.08);
     Object.assign(d,{live:true,x:source.at[0]+Math.cos(a)*r,y:source.at[1],z:source.at[2]+Math.sin(a)*r,v:0,floor:source.floor??0,size:0.0035+Math.random()*0.002});
    }
    d.v+=9.8*dt;d.y-=d.v*dt;active=true;
    if(d.y<=d.floor){d.live=false;d.wait=0.2+Math.random()*0.6;drops.setMatrixAt(i,hidden);return;}
    const stretch=1+Math.min(1.6,d.v*0.6);m.makeScale(d.size,d.size*stretch,d.size).setPosition(d.x,d.y,d.z);drops.setMatrixAt(i,m);
   });
   drops.instanceMatrix.needsUpdate=true;return active;
  }
 };
}

// ---- handwashing ----
export function buildSoapDispenser(kit,{position,parent=kit.scene}){
 const {mesh,std,merge,at,group}=kit,[x,y,z]=position,body=std('#e9eeec',0.35,0),glass=std('#8fd0b9',0.15,0,{transparent:true,opacity:0.75});
 mesh(new RoundedBoxGeometry(0.1,0.16,0.075,3,0.012).translate(x,y,z),body,parent);mesh(new THREE.BoxGeometry(0.05,0.07,0.004).translate(x,y+0.02,z+0.038),glass,parent);
 const push=group(parent),pushMat=std('#3f6f66',0.4,0.1,{emissive:'#000000'});mesh(new RoundedBoxGeometry(0.07,0.045,0.02,2,0.008),pushMat,push);
 mesh(merge([[new THREE.CylinderGeometry(0.006,0.004,0.02,10),at(x,y-0.09,z+0.02)]]),std('#5d6a6c',0.4,0.6),parent);
 return {push,materials:[pushMat],nozzle:[x,y-0.1,z+0.02]};
}
export function buildTowelDispenser(kit,{position,parent=kit.scene}){
 const {mesh,std,group,canvasTexture}=kit,[x,y,z]=position;
 mesh(new RoundedBoxGeometry(0.28,0.24,0.1,3,0.015).translate(x,y,z),std('#f0f3f2',0.35,0),parent);
 mesh(new THREE.BoxGeometry(0.2,0.012,0.012).translate(x,y-0.115,z+0.035),std('#2c3a3d',0.6,0),parent);
 const tab=group(parent),paper=std('#ffffff',0.95,0,{map:canvasTexture(128,128,(c,w,h)=>{c.fillStyle='#fbfbf6';c.fillRect(0,0,w,h);for(let i=0;i<300;i++){c.fillStyle=`rgba(180,175,160,${Math.random()*0.15})`;c.fillRect(Math.random()*w,Math.random()*h,2,2);}}),emissive:'#000000',side:THREE.DoubleSide});
 mesh(new THREE.PlaneGeometry(0.16,0.09,4,4).translate(0,-0.045,0),paper,tab);
 return {tab,materials:[paper],paper};
}
// A paper towel in the hand: a gently curved sheet.
export function buildTowelSheet(kit,{material,parent=kit.scene}){
 const g=new THREE.PlaneGeometry(0.17,0.2,6,6),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,0.02*Math.cos(x*14));}g.computeVertexNormals();
 const sheet=kit.mesh(g,material,parent);sheet.visible=false;return sheet;
}
// Lather: small white spheres that cling to the hands (positions are set every frame from the hand joints).
export function buildFoam(kit,{count=46,parent=kit.scene}){
 const {own,std}=kit,foam=own(new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1,1)),std('#ffffff',0.55,0,{transparent:true,opacity:0.92,envMapIntensity:0.6}),count));
 foam.frustumCulled=false;foam.count=0;parent.add(foam);return foam;
}

// ---- connector inspection ----
export function buildWorkbench(kit,{position,size=[0.62,0.42],parent=kit.scene}){
 const {mesh,std,merge,at,canvasTexture}=kit,[x,y,z]=position,[w,d]=size;
 mesh(new RoundedBoxGeometry(w,0.03,d,3,0.008).translate(x,y-0.015,z),std('#a98c6c',0.6,0),parent);
 mesh(merge([[0,0],[1,0],[0,1],[1,1]].map(([i,j])=>[new THREE.BoxGeometry(0.03,y-0.03,0.03),at(x-w/2+0.04+i*(w-0.08),(y-0.03)/2,z-d/2+0.04+j*(d-0.08))])),std('#5e6b6e',0.5,0.6),parent);
 const mat=canvasTexture(256,192,(c,cw,ch)=>{c.fillStyle='#1f3b40';c.fillRect(0,0,cw,ch);c.strokeStyle='rgba(120,200,190,0.25)';c.lineWidth=1;for(let i=0;i<cw;i+=16){c.beginPath();c.moveTo(i,0);c.lineTo(i,ch);c.stroke();}for(let j=0;j<ch;j+=16){c.beginPath();c.moveTo(0,j);c.lineTo(cw,j);c.stroke();}c.fillStyle='rgba(180,230,220,0.6)';c.font='bold 14px Arial';c.fillText('INSPECTION MAT · ISOLATED',10,ch-10);});
 mesh(new THREE.BoxGeometry(w*0.72,0.004,d*0.72).translate(x,y+0.002,z),std('#ffffff',0.9,0,{map:mat}),parent);
}
// Numbered inspection marker: a ring and a number that always face the camera.
export function buildMarker(kit,{number,parent=kit.scene}){
 const map=kit.canvasTexture(128,128,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(238,140,69,0.95)';c.beginPath();c.arc(w/2,h/2,w*0.32,0,TAU);c.fill();c.lineWidth=8;c.strokeStyle='#ffffff';c.stroke();c.fillStyle='#2a1604';c.font='bold 58px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(number),w/2,h/2+3);});
 const material=kit.own(new THREE.SpriteMaterial({map,depthTest:false,transparent:true}));const sprite=new THREE.Sprite(material);sprite.scale.set(0.028,0.028,1);sprite.renderOrder=20;parent.add(sprite);
 return {sprite,material};
}
export function buildTag(kit,{parent=kit.scene}){
 const {mesh,std,group,canvasTexture}=kit,tag=group(parent);
 const map=canvasTexture(256,128,(c,w,h)=>{c.fillStyle='#d8432f';c.fillRect(0,0,w,h);c.fillStyle='#ffffff';c.font='bold 40px Arial';c.textAlign='center';c.fillText('DO NOT USE',w/2,h*0.48);c.font='bold 20px Arial';c.fillText('REPORTED · AWAITING CHECK',w/2,h*0.78);c.fillStyle='#f4efe8';c.beginPath();c.arc(22,h/2,8,0,TAU);c.fill();});
 mesh(new RoundedBoxGeometry(0.11,0.055,0.002,1,0.001),std('#ffffff',0.7,0,{map,emissive:'#3a0c06',emissiveIntensity:0.25}),tag);
 mesh(new THREE.CylinderGeometry(0.0012,0.0012,0.06,4).rotateZ(Math.PI/2).translate(-0.085,0,0),std('#e8e2d6',0.9,0),tag);
 tag.visible=false;return tag;
}
