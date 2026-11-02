import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {vacuumModules,vacuumPartList} from './soft-content.js';
import {openingFromPixels} from './machine-state.js';
import {createDust,collectDust} from './cleaning-state.js';
import {createRig,finish,cloneFinish,ghost} from './look/rig.js';
import {createSpring,createLayerSprings,waveFactor} from './look/motion.js';
import {layerOf} from './look/layers.js';

// Each machine has its own lacquer: the shared finishes are recoloured when the variant changes.
const LACQUER={'junior-103':{dark:'#103f47',edge:'#2f6870',cream:'#e7e1c8',teal:'#148e91',white:'#f3f3ea'},'junior-429':{dark:'#1d3862',edge:'#46618f',cream:'#e1e6ec',teal:'#2b7fb8',white:'#f1f4f8'}};

export function createViewer(canvas,onSelect,onOpenChange,onPickup=()=>{},{onHover=()=>{},onFloor=()=>{},onCallouts=()=>{}}={}){
 const studio=createRig({canvas,bounds:{l:-5,r:5,t:6,b:-4},onChange:look=>{tint(look);schedule();}}),renderer=studio.renderer,scene=studio.scene;
 const camera=new THREE.PerspectiveCamera(36,1,.1,60);camera.position.set(4.8,3.6,7.4);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.25,0);controls.minDistance=3.3;controls.maxDistance=13;controls.maxPolarAngle=Math.PI*.49;controls.enableDamping=false;controls.enablePan=false;
 controls.enableZoom=false;
 // Reserve two-finger gestures for revealing parts, rather than orbit/dolly.
 controls.touches.TWO=null;
 const abort=new AbortController(),signal=abort.signal,listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal});
 const tileCanvas=document.createElement('canvas');tileCanvas.width=512;tileCanvas.height=512;
 const tileContext=tileCanvas.getContext('2d');tileContext.fillStyle='#b4c5bb';tileContext.fillRect(0,0,512,512);
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){tileContext.fillStyle=(row+col)%2?'#e3e9df':'#e9ede5';tileContext.fillRect(col*512/6+1.5,row*512/6+1.5,512/6-3,512/6-3);}
 const tilesTexture=new THREE.CanvasTexture(tileCanvas);tilesTexture.colorSpace=THREE.SRGBColorSpace;tilesTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const tiles=new THREE.Mesh(new THREE.PlaneGeometry(5.8,4.5),new THREE.MeshStandardMaterial({map:tilesTexture,roughness:.82}));tiles.rotation.x=-Math.PI/2;tiles.position.set(.4,-.007,.65);tiles.receiveShadow=true;scene.add(tiles);
 function tint(look){tiles.material.color.set(look==='hologram'?'#37596b':'#ffffff');}tint(studio.look);
 let dust=createDust(),lastPicked=-1,cleaningTime=0,manualOffset=null,singlePass=false,passProgress=0,previousNozzle=null,lastHoseOffset=0,floorView=false;
 const dustGeometry=new THREE.DodecahedronGeometry(.032,0),paperGeometry=new THREE.BoxGeometry(.055,.008,.044);
 const dustMaterial=new THREE.MeshStandardMaterial({color:0x8c6845,roughness:1}),paperMaterial=new THREE.MeshStandardMaterial({color:0xd7bd83,roughness:1});
 const dustMeshes=dust.map((point,index)=>{const marker=new THREE.Mesh(index%5===0?paperGeometry:dustGeometry,index%5===0?paperMaterial:dustMaterial);marker.position.set(point.x,index%5===0?.012:.025,point.z);marker.rotation.y=index*.7;marker.scale.setScalar(.8+(index%4)*.15);scene.add(marker);return marker;});
 function publishDust(){const picked=dust.filter(point=>point.collected).length;if(picked!==lastPicked){lastPicked=picked;onPickup({picked,total:dust.length});}}
 function pickupAt(x,z,depth=.3){const next=collectDust(dust,{x,z,width:state.pickupMode==='wet'?1.03:.65,depth,active:state.connected&&state.running&&state.open===0&&state.condition==='clear'});if(next!==dust){dust=next;dustMeshes.forEach((marker,index)=>marker.visible=!dust[index].collected);publishDust();}}
 function resetDust(){dust=createDust();dustMeshes.forEach(marker=>marker.visible=true);cleaningTime=0;manualOffset=null;singlePass=false;previousNozzle=null;publishDust();schedule();}
 function makeCleaningPass(){if(!state.connected||!state.running||state.open!==0||state.condition!=='clear')return false;previousNozzle=null;manualOffset=-.55;passProgress=0;singlePass=!reduced.matches;if(reduced.matches){manualOffset=.55;pickupAt(1.28,1.5,1.4);}schedule();return true;}
 const rig=new THREE.Group();scene.add(rig);const groups={};const pickables=[];const wheels=[];
 // Lacquer for shells and covers, smoked glass for the collector, rubber for tyres and hoses, brushed steel for fittings.
 const lacquer=(color,extra)=>finish('lacquer',color,extra),tinted=new Map();
 const dark=lacquer('#103f47'),edge=lacquer('#2f6870'),metal=finish('steel','#c9d3d6'),orange=lacquer('#f67a25'),rubber=finish('rubber'),cream=lacquer('#e7e1c8',{clearcoat:.25,roughness:.6}),smoked=finish('glass'),teal=lacquer('#148e91'),white=lacquer('#f3f3ea'),matte=lacquer('#d1dcd7',{clearcoat:0,roughness:.92});
 const palette={dark,edge,cream,teal,white};
 function setFinish(id){const colours=LACQUER[id]||LACQUER['junior-103'];for(const [name,base] of Object.entries(palette))for(const copy of tinted.get(base)||[])copy.color.set(colours[name]);}
 const part=(id,pos,offset)=>{const g=new THREE.Group();g.position.set(...pos);g.userData={base:g.position.clone(),offset:new THREE.Vector3(...offset),id,layer:layerOf('junior-103',id)};groups[id]=g;rig.add(g);return g;};
 function mesh(group,geometry,material,pos=[0,0,0],rot=[0,0,0]){const copy=cloneFinish(material);if(!tinted.has(material))tinted.set(material,[]);tinted.get(material).push(copy);const m=new THREE.Mesh(geometry,copy);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.part=group.userData.id;group.add(m);if(group.userData.id)pickables.push(m);return m;}
 const box=(g,size,material,pos=[0,0,0],radius=.04,rot=[0,0,0])=>mesh(g,new RoundedBoxGeometry(...size,2,radius),material,pos,rot);
 const cyl=(g,r1,r2,h,material,pos=[0,0,0],rot=[0,0,0],segments=48)=>mesh(g,new THREE.CylinderGeometry(r1,r2,h,segments),material,pos,rot);
 const ring=(g,r,t,material,pos=[0,0,0],rot=[Math.PI/2,0,0])=>mesh(g,new THREE.TorusGeometry(r,t,10,64),material,pos,rot);
 const tube=(g,points,r,material,segments=64)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return {mesh:mesh(g,new THREE.TubeGeometry(curve,segments,r,9,false),material),curve};};
 const base=part('base',[0,.22,0],[0,0,0]);cyl(base,.82,.78,.22,dark);ring(base,.79,.04,rubber,[0,.03,0]);cyl(base,.7,.74,.07,edge,[0,.15,0]);
 const wheel=part('wheels',[0,.13,0],[0,-.01,0]);
 for(const [x,z] of [[-.61,.45],[.61,.45],[-.61,-.45],[.61,-.45]]){box(wheel,[.09,.2,.13],metal,[x,.06,z]);const w=cyl(wheel,.13,.13,.1,rubber,[x,0,z],[0,0,Math.PI/2],28);wheels.push(w);cyl(wheel,.065,.065,.105,edge,[x,0,z],[0,0,Math.PI/2],24);}
 const tank=part('tank',[0,.36,0],[0,.26,0]);
 const profile=[[0,0],[.65,0],[.7,.06],[.72,.95],[.7,1.08],[.665,1.08],[.665,.12],[0,.12]].map(([r,y])=>new THREE.Vector2(r,y));mesh(tank,new THREE.LatheGeometry(profile,64),dark);ring(tank,.7,.027,metal,[0,1.08,0]);ring(tank,.68,.022,edge,[0,.04,0]);
 // A text-only schematic supplier band; no user photographs are embedded.
 const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=192;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#edf1e9';ctx.fillRect(0,0,1024,192);ctx.font='bold 76px Arial';ctx.fillStyle='#087b94';ctx.fillText('CLEAN',100,102);ctx.fillStyle='#dc6f4c';ctx.fillText('TECH',365,102);ctx.fillStyle='#087b94';ctx.fillText('GULF',594,102);ctx.font='26px Arial';ctx.fillStyle='#40535a';ctx.fillText('JUNIOR 103   •   DRY VACUUM',235,154);const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const band=mesh(tank,new THREE.CylinderGeometry(.724,.724,.25,64,1,true),new THREE.MeshStandardMaterial({map:texture,roughness:.65}),[0,.56,0]);band.rotation.y=Math.PI;
 const collector=part('collector',[0,.92,0],[0,.72,0]);cyl(collector,.49,.34,.68,smoked);ring(collector,.49,.028,edge,[0,.34,0]);
 const filter=part('filter',[0,1.39,0],[0,1.08,0]);
 const textile=new THREE.Group();textile.userData.id='filter';filter.add(textile);
 const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=128;const fabricCtx=fabricCanvas.getContext('2d');fabricCtx.fillStyle='#acd1d8';fabricCtx.fillRect(0,0,128,128);fabricCtx.strokeStyle='#699ca7';fabricCtx.lineWidth=1;for(let i=0;i<128;i+=4){fabricCtx.beginPath();fabricCtx.moveTo(i,0);fabricCtx.lineTo(i,128);fabricCtx.moveTo(0,i);fabricCtx.lineTo(128,i);fabricCtx.stroke();}
 const fabricTexture=new THREE.CanvasTexture(fabricCanvas);fabricTexture.wrapS=fabricTexture.wrapT=THREE.RepeatWrapping;fabricTexture.repeat.set(5,2);fabricTexture.colorSpace=THREE.SRGBColorSpace;
 const clothMaterial=new THREE.MeshStandardMaterial({map:fabricTexture,side:THREE.DoubleSide,roughness:.95});
 const basketProfile=[[.28,-.5],[.4,-.43],[.49,-.2],[.55,0]].map(([r,y])=>new THREE.Vector2(r,y));mesh(textile,new THREE.LatheGeometry(basketProfile,48),clothMaterial);cyl(textile,.28,.28,.015,clothMaterial,[0,-.5,0]);ring(textile,.55,.035,dark);
 const cage=new THREE.Group();cage.userData.id='filter';filter.add(cage);mesh(cage,new THREE.CylinderGeometry(.4,.4,.47,40,1,true),white,[0,-.24,0]);for(const y of [0,-.48])ring(cage,.42,.035,dark,[0,y,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(cage,[.025,.47,.045],dark,[Math.sin(a)*.42,-.24,Math.cos(a)*.42],.005,[0,a,0]);}cage.visible=false;
 const float=part('float',[0,1.16,0],[.3,1.05,0]);for(const y of [0,-.42])ring(float,.26,.025,dark,[0,y,0]);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(float,[.025,.42,.025],dark,[Math.sin(a)*.26,-.21,Math.cos(a)*.26],.005);}cyl(float,.18,.18,.22,orange,[0,-.26,0]);float.visible=false;
 const cover=part('cover',[0,1.63,0],[0,1.92,0]);cyl(cover,.6,.77,.38,dark);cyl(cover,.57,.6,.05,edge,[0,.21,0]);ring(cover,.745,.027,edge,[0,-.16,0]);
 for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2;box(cover,[.11,.025,.025],rubber,[Math.sin(a)*.61,.08,Math.cos(a)*.61],.004,[0,a,0]);}
 const handle=part('handle',[0,2.01,0],[0,2.2,0]);box(handle,[.12,.3,.13],dark,[-.27,0,0]);box(handle,[.12,.3,.13],dark,[.27,0,0]);box(handle,[.65,.12,.14],dark,[0,.15,0]);box(handle,[.45,.035,.11],edge,[0,.21,0],.01);
 const sw=part('switch',[.36,1.83,.35],[.7,1.88,.25]);const rocker=box(sw,[.19,.065,.14],orange,[0,0,0],.015);box(sw,[.012,.003,.05],white,[0,.035,0],.002);
 const motor=part('motor',[0,1.63,0],[0,1.58,0]);cyl(motor,.245,.245,.33,metal);cyl(motor,.16,.18,.15,dark,[0,.23,0]);
 const rotor=new THREE.Group();rotor.userData.id='motor';motor.add(rotor);cyl(rotor,.08,.08,.42,teal);for(let i=0;i<10;i++){let a=i*Math.PI/5;box(rotor,[.035,.26,.065],orange,[Math.sin(a)*.215,0,Math.cos(a)*.215],.008,[0,a,0]);}
 const fan=part('fan',[0,1.48,0],[0,1.28,0]);cyl(fan,.37,.37,.045,metal);const blades=new THREE.Group();blades.userData.id='fan';fan.add(blades);for(let i=0;i<10;i++){const a=i*Math.PI/5;box(blades,[.065,.06,.27],edge,[Math.sin(a)*.2,.045,Math.cos(a)*.2],.012,[0,a+.35,0]);}cyl(blades,.09,.09,.09,teal,[0,.05,0]);
 const clips=part('clips',[0,1.43,0],[0,.15,0]);for(const s of [-1,1]){box(clips,[.085,.26,.14],metal,[s*.73,0,0],.015);box(clips,[.1,.04,.19],edge,[s*.75,.1,0],.01);}
 const inlet=part('inlet',[.49,1.02,.5],[.17,.2,.18]);cyl(inlet,.13,.13,.23,dark,[0,0,0],[Math.PI/2,0,-Math.PI/4]);ring(inlet,.125,.018,metal,[0,0,.13],[0,0,0]);
 const hose=part('hose',[0,0,0],[.67,.32,0]);
 const hosePoints=[[.5,1.02,.66],[.93,1.02,.9],[1.4,.55,.65],[1.93,.45,-.02],[2.0,1.4,-.25],[1.66,1.6,.15],[1.42,1.15,.75]];
 const hoseTube=tube(hose,hosePoints,.088,rubber,120),hosePath=hoseTube.curve;const ribGeo=new THREE.TorusGeometry(.093,.013,5,14);const ribOrientation=new THREE.Vector3(0,0,1),hoseRibs=[];
 for(let i=0;i<96;i++){const t=i/95;const m=mesh(hose,ribGeo,edge);m.position.copy(hosePath.getPointAt(t));m.quaternion.setFromUnitVectors(ribOrientation,hosePath.getTangentAt(t).normalize());hoseRibs.push(m);}
 const wand=part('wand',[1.42,1.12,.8],[1,.32,.1]);box(wand,[.13,.22,.13],dark,[0,0,0],.04);tube(wand,[[0,0,0],[-.08,-.2,.12],[-.13,-.68,.43],[-.14,-.9,.61]],.035,metal,22);
 const tool=part('tool',[1.28,.11,1.5],[1.28,0,.25]);box(tool,[.65,.15,.28],dark,[0,0,0],.055);box(tool,[.65,.02,.3],edge,[0,-.07,0],.008);cyl(tool,.07,.07,.13,dark,[0,.1,-.05],[.45,0,0]);const floorRocker=box(tool,[.18,.035,.14],orange,[.17,.1,0],.008);floorRocker.userData.floorSwitch=true;
 const brushStrip=new THREE.Group();brushStrip.userData.id='tool';tool.add(brushStrip);for(let n=0;n<24;n++)box(brushStrip,[.014,.065,.025],rubber,[(n-11.5)*.025,-.07,.12],.002);
 const dryTool=new THREE.Group();dryTool.userData.id='tool';while(tool.children.length)dryTool.add(tool.children[0]);tool.add(dryTool);
 const wetTool=new THREE.Group();wetTool.userData.id='tool';tool.add(wetTool);box(wetTool,[1.02,.12,.2],dark,[0,0,0],.025);for(const z of [-.11,.11])box(wetTool,[1.03,.085,.014],rubber,[0,-.075,z],.003);cyl(wetTool,.075,.075,.16,dark,[0,.1,0],[.45,0,0]);for(const x of [-.41,0,.41])cyl(wetTool,.018,.018,.008,metal,[x,.065,0]);wetTool.visible=false;
 const primaryMotor=new THREE.Group();while(motor.children.length)primaryMotor.add(motor.children[0]);motor.add(primaryMotor);rotor.name='vacuum-rotor';const twinMotor=primaryMotor.clone(true);motor.add(twinMotor);twinMotor.traverse(o=>{if(o.isMesh)pickables.push(o);});const twinRotor=twinMotor.getObjectByName('vacuum-rotor');twinMotor.visible=false;
 const primaryFan=new THREE.Group();while(fan.children.length)primaryFan.add(fan.children[0]);fan.add(primaryFan);blades.name='vacuum-blades';const twinFan=primaryFan.clone(true);fan.add(twinFan);twinFan.traverse(o=>{if(o.isMesh)pickables.push(o);});const twinBlades=twinFan.getObjectByName('vacuum-blades');twinFan.visible=false;
 const secondSwitch=box(sw,[.19,.065,.14],orange,[-.24,0,0],.015);secondSwitch.visible=false;
 const cable=part('cable',[0,0,0],[0,0,0]);const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.56,-.63),new THREE.Vector3(-.7,.08,-.6),new THREE.Vector3(-1.6,.04,.65),new THREE.Vector3(-2.0,.2,.5)]);const wire=mesh(cable,new THREE.TubeGeometry(cableCurve,72,.025,8,false),orange);wire.frustumCulled=false;
 const plug=part('plug',[-2,.12,.5],[0,0,0]);box(plug,[.18,.2,.1],dark,[0,0,0],.025);for(const [x,y] of [[0,.06],[-.045,-.025],[.045,-.025]])box(plug,[.018,.035,.075],metal,[x,y,-.075],.002);
 const socket=new THREE.Group();socket.position.set(-2.15,.76,-.48);scene.add(socket);box(socket,[.44,.48,.07],white,[0,0,0],.025);box(socket,[.075,.12,.016],orange,[.13,.12,.044],.008);
 for(const [x,y] of [[0,.06],[-.045,-.025],[.045,-.025]])box(socket,[.021,.035,.008],rubber,[x,y,.041],.002);
 const wall=new THREE.Group();scene.add(wall);box(wall,[.8,1.18,.08],matte,[-2.15,.57,-.57],.02);
 const flowCurve=new THREE.CatmullRomCurve3([[1.29,.16,1.53],[1.3,.5,1.14],[1.42,1.15,.75],[1.66,1.6,.15],[2,1.4,-.25],[1.93,.45,-.02],[1.4,.55,.65],[.5,1.02,.66],[0,.95,.2],[0,1.46,0],[0,1.85,0],[0,2.0,-.5]].map(p=>new THREE.Vector3(...p)));
 const flow=new THREE.Group();scene.add(flow);const dots=[];const dotGeometry=new THREE.SphereGeometry(.033,8,6);const dotMaterial=new THREE.MeshBasicMaterial({color:0x16aba2});for(let i=0;i<28;i++){const dot=new THREE.Mesh(dotGeometry,dotMaterial);flow.add(dot);dots.push(dot);}
 const staticFlow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(flowCurve.getPoints(110)),new THREE.LineDashedMaterial({color:0x119a92,dashSize:.06,gapSize:.045,transparent:true,opacity:.75,depthTest:false}));staticFlow.computeLineDistances();flow.add(staticFlow);
 // Guides: dashed explode lines from each part's resting place to where it floats now.
 const guideIds=Object.keys(groups),guidePositions=new Float32Array(guideIds.length*6),guideGeometry=new THREE.BufferGeometry();guideGeometry.setAttribute('position',new THREE.BufferAttribute(guidePositions,3));
 const guideLines=new THREE.LineSegments(guideGeometry,new THREE.LineDashedMaterial({color:0x0a8f9c,dashSize:.07,gapSize:.05,transparent:true,opacity:.8,depthTest:false}));guideLines.frustumCulled=false;guideLines.renderOrder=4;guideLines.visible=false;scene.add(guideLines);
 let guidesDrawn=false;
 function updateGuides(){
  const on=state.guides&&animated.open>.01&&state.open>0;
  if(!on){if(guidesDrawn){guideLines.visible=false;guidesDrawn=false;}return;}
  guideIds.forEach((id,i)=>{const g=groups[id],a=anchorOf(id);guidePositions.set([g.userData.base.x+a.x,g.userData.base.y+a.y,g.userData.base.z+a.z,g.position.x+a.x,g.position.y+a.y,g.position.z+a.z],i*6);});
  guideGeometry.attributes.position.needsUpdate=true;guideLines.computeLineDistances();guideLines.material.color.set(studio.look==='hologram'?0x3de0ff:0x0a8f9c);guideLines.visible=true;guidesDrawn=true;
 }
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let state={open:0,part:'overview',connected:false,running:false,xray:false,air:false,callouts:true,condition:'clear',stroke:false};
 let cameraTween=null,focusY=null;
 const springs=createLayerSprings(),plugSpring=createSpring({stiffness:130,damping:.8});
 studio.track(Object.values(groups));
 let frame=0,previous=0,tick=0,visible=true,lastPlug=-1,lastOpen=-1,lastFraming=1;const animated={open:0,plug:0};
 const p=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const tooltip=document.getElementById('part-tooltip');let partInfo=new Map(vacuumModules['junior-103'].parts.map(part=>[part.id,part]));let currentVariant=null,active=false,pointerInside=false;
 const activePointers=new Map();let pointerDown=null,multiGesture=false,pinchDistance=null,hoverPoint=null,hoverMoved=false,shellApplied=null,hovered=null,lastSelected=null,lastHovered=null,tipId=null,tipWidth=0,tipHeight=0;
 function hitAt(point){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||point.x<0||point.y<0||point.x>rect.width||point.y>rect.height)return;
  pointer.set(point.x/rect.width*2-1,-point.y/rect.height*2+1);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects(pickables,false).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return hit.object.material.opacity>.3;});
 }
 const meshesOf={};
 const meshesFor=id=>meshesOf[id]??=(()=>{const list=[];groups[id].traverse(o=>{if(o.isMesh&&o.material.emissive)list.push(o);});return list;})();
 let lastPaint='';
 function paintHighlights(time=0){
  const glow=state.glow!==false,faults=state.glowParts||[],pulsing=faults.length>0&&!reduced.matches,key=`${state.part}|${hovered}|${glow}|${faults}|${studio.look}`;
  if(!pulsing&&key===lastPaint)return;lastPaint=key;
  const colours=studio.look==='hologram'?{hover:0x3de0ff,selected:0x1690aa,fault:0xffb454}:{hover:0x249c8f,selected:0x12635d,fault:0xc98a1a},wave=.5+.5*Math.sin(time*4.2);
  for(const id of Object.keys(groups)){
   const fault=faults.includes(id),hover=id===hovered,selected=id===state.part,color=fault?colours.fault:hover?colours.hover:selected?colours.selected:0;
   const strength=fault?.3+.55*(pulsing?wave:1):hover?.55:selected?.32:0,intensity=glow?strength:strength*.3;
   for(const m of meshesFor(id)){m.material.emissive.set(color);m.material.emissiveIntensity=intensity;}
  }
 }
 function clearHover(){hoverPoint=null;if(hovered)onHover(null);hovered=null;tooltip.hidden=true;canvas.style.cursor='grab';paintHighlights();schedule();}
 function updateHover(){
  const hit=hoverPoint&&activePointers.size===0?hitAt(hoverPoint):null;
  const nextHover=hit?.object.userData.part||null;if(nextHover!==hovered)onHover(nextHover,hoverMoved);hoverMoved=false;hovered=nextHover;paintHighlights();
  const info=partInfo.get(hovered);tooltip.hidden=!info;canvas.style.cursor=activePointers.size?'grabbing':info?'pointer':'grab';
  if(!info)return;
  if(tipId!==info.id){
   tipId=info.id;document.getElementById('tooltip-group').textContent=info.group;
   document.getElementById('tooltip-name').textContent=info.name;
   tipWidth=tooltip.offsetWidth;tipHeight=tooltip.offsetHeight;
  }
  const rect=canvas.getBoundingClientRect();
  tooltip.style.left=`${Math.max(10,Math.min(hoverPoint.x+15,rect.width-tipWidth-10))}px`;
  tooltip.style.top=`${Math.max(10,Math.min(hoverPoint.y+16,rect.height-tipHeight-10))}px`;
 }
 function localPoint(event){const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
 function reveal(pixels){const next=openingFromPixels(state.open,pixels);if(next!==state.open)onOpenChange(next);}
 function touchSpan(){const [a,b]=[...activePointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
 listen(canvas,'wheel',event=>{
  event.preventDefault();cameraTween=null;
  const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
  reveal(-event.deltaY*unit*(event.ctrlKey?3:1));
 },{passive:false});
 listen(canvas,'pointerdown',event=>{cameraTween=null;
  activePointers.set(event.pointerId,localPoint(event));pointerDown={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};clearHover();
  if(activePointers.size>1){multiGesture=true;pointerDown=null;pinchDistance=activePointers.size===2?touchSpan():null;}
 });
 listen(canvas,'pointermove',event=>{
  if(pointerDown?.id===event.pointerId&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6)pointerDown.dragged=true;
  if(activePointers.has(event.pointerId)){
   activePointers.set(event.pointerId,localPoint(event));
   if(activePointers.size===2){const distance=touchSpan();if(pinchDistance!==null)reveal((distance-pinchDistance)*2);pinchDistance=distance;}
  }
  if(event.pointerType!=='touch'&&event.buttons===0&&activePointers.size===0){hoverPoint=localPoint(event);hoverMoved=true;schedule();}
  else if(hoverPoint)clearHover();
 });
 listen(canvas,'pointerup',event=>{
  const click=!multiGesture&&pointerDown?.id===event.pointerId&&!pointerDown.dragged&&event.button===0&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)<=6;
  activePointers.delete(event.pointerId);pinchDistance=activePointers.size===2?touchSpan():null;
  if(activePointers.size===0){multiGesture=false;pointerDown=null;}
  if(click){camera.lookAt(controls.target);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const hit=hitAt(localPoint(event));if(hit){if(hit.object.userData.floorSwitch)onFloor();else onSelect(hit.object.userData.part);}}
  if(event.pointerType!=='touch'){hoverPoint=localPoint(event);hoverMoved=true;schedule();}
 });
 listen(canvas,'pointerenter',()=>{pointerInside=true;});listen(canvas,'pointerleave',()=>{pointerInside=false;clearHover();});listen(window,'blur',()=>{activePointers.clear();pointerDown=null;multiGesture=false;pinchDistance=null;clearHover();});
 listen(canvas,'pointercancel',()=>{activePointers.clear();pointerDown=null;pinchDistance=null;multiGesture=false;clearHover();});
 listen(canvas,'keydown',event=>{
  if(event.key==='Escape'){clearHover();return;}
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   event.preventDefault();cameraTween=null;const next=event.key==='Home'?0:event.key==='End'?100:openingFromPixels(state.open,event.key==='ArrowUp'?100:-100);
   if(next!==state.open)onOpenChange(next);
  }
 });
 // Leader-line callouts: the screen position of each part's centre. The shared UI lays the names out so they never overlap.
 const anchors=new Map(),centre=new THREE.Vector3();let calloutsShown=false;
 function anchorOf(id){let a=anchors.get(id);if(!a){const box=new THREE.Box3().setFromObject(groups[id]);a=box.getCenter(new THREE.Vector3()).sub(groups[id].position);anchors.set(id,a);}return a;}
 const shown=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
 function updateCallouts(){
  if(!state.callouts){if(calloutsShown){calloutsShown=false;onCallouts([],0,0);}return;}
  const {width,height}=canvas.getBoundingClientRect(),ids=animated.open>.35?Object.keys(groups):['cover','hose','plug',state.part],items=[];
  for(const id of new Set(ids)){const g=groups[id];if(!g||!shown(g))continue;centre.copy(anchorOf(id));g.localToWorld(centre);centre.project(camera);if(centre.z>=1)continue;items.push({id,name:partInfo.get(id)?.name||id,x:(centre.x*.5+.5)*width,y:(-centre.y*.5+.5)*height});}
  calloutsShown=true;onCallouts(items,width,height);
 }
 let bottomBar=null;const inset=()=>(bottomBar??=canvas.parentElement.querySelector('.lk-bottom'))?.offsetHeight||0;
 function render(moving=false,time=performance.now()){studio.fit(camera,canvas.clientWidth,canvas.clientHeight,inset());camera.lookAt(controls.target);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);updateCallouts();updateHover();paintHighlights(time/1000);updateGuides();studio.render(camera,time,moving);}
 function schedule(){if(!frame&&active&&visible&&!document.hidden)frame=requestAnimationFrame(update);}
function update(time){frame=0;if(!active||!visible||document.hidden)return;const dt=Math.min((time-previous)/1000||.016,.05);previous=time;tick+=dt;
 // Each layer chases its own wave of the slider with a spring of its own weight; the plug has one too.
 const goal=state.open/100,snap=reduced.matches;let springing=false;
 springs.forEach((spring,layer)=>{if(spring.step(dt,waveFactor(layer,goal),snap))springing=true;});if(plugSpring.step(dt,state.connected?1:0,snap))springing=true;
 animated.open=springs[0].value;animated.plug=plugSpring.value;const progress=(springs[0].value+springs[1].value+springs[2].value+springs[3].value)/4;
 for(const [id,g] of Object.entries(groups)){const f=springs[g.userData.layer].value;g.position.copy(g.userData.base).addScaledVector(g.userData.offset,f);if(id==='clips'||id==='wheels')g.children.forEach(o=>{if(o.userData.originX===undefined)o.userData.originX=o.position.x;o.position.x=o.userData.originX*(1+f*.7);});}
 const wet=state.variant==='junior-429',wetPickup=wet&&state.pickupMode==='wet';
 tank.scale.y=wet?1.38:1;for(const id of ['cover','handle','switch','motor','fan','clips','filter','float'])groups[id].position.y+=wet?.4:0;
 textile.visible=!wet;cage.visible=wet&&!wetPickup;filter.visible=!wetPickup;collector.visible=!wetPickup;float.visible=wetPickup;
 primaryMotor.scale.setScalar(wet?.65:1);primaryMotor.position.x=wet?-.24:0;twinMotor.visible=wet;twinMotor.scale.setScalar(.65);twinMotor.position.x=.25;primaryFan.scale.setScalar(wet?.65:1);primaryFan.position.x=wet?-.24:0;twinFan.visible=wet;twinFan.scale.setScalar(.65);twinFan.position.x=.25;
 secondSwitch.visible=wet;secondSwitch.rotation.x=state.running?-.2:.2;
 dryTool.visible=!wetPickup;wetTool.visible=wetPickup;floorRocker.rotation.x=state.floorMode==='soft'?-.24:.24;brushStrip.position.y=state.floorMode==='soft'?.055:0;
 if(state.autoRotate&&!pointerInside&&!activePointers.size&&!floorView&&!reduced.matches){const orbit=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),dt*.09);camera.position.copy(controls.target).add(orbit);}
 const framing=1+progress*.22;camera.position.sub(controls.target).multiplyScalar(framing/lastFraming).add(controls.target);lastFraming=framing;
 const targetY=focusY??((floorView?.75:1.25)+progress*.55);camera.position.y+=targetY-controls.target.y;controls.target.y=targetY;
 if(cameraTween){const t=cameraTween;t.progress=Math.min(1,t.progress+dt/.9);const mix=t.progress*t.progress*(3-2*t.progress);camera.position.lerpVectors(t.from,t.to,mix);controls.target.lerpVectors(t.fromTarget,t.toTarget,mix);if(t.progress===1)cameraTween=null;}
 const t=animated.plug;plug.position.set(THREE.MathUtils.lerp(-2,-2.15,t),THREE.MathUtils.lerp(.12,.76,t),THREE.MathUtils.lerp(.5,-.33,t));
 if(Math.abs(lastPlug-t)>.00001||Math.abs(lastOpen-animated.open)>.00001){lastPlug=t;lastOpen=animated.open;cableCurve.points[0].set(0,groups.cover.position.y-.07,-.63);cableCurve.points[3].copy(plug.position).add(new THREE.Vector3(0,-.09,.02));const wirePositions=wire.geometry.attributes.position;const tempGeometry=new THREE.TubeGeometry(cableCurve,72,.025,8,false);wirePositions.copy(tempGeometry.attributes.position);wirePositions.needsUpdate=true;wire.geometry.attributes.normal.copy(tempGeometry.attributes.normal);wire.geometry.attributes.normal.needsUpdate=true;tempGeometry.dispose();}
 rocker.rotation.x=state.running?-.2:.2;const operating=state.running&&!reduced.matches;if(operating){rotor.rotation.y+=dt*6;blades.rotation.y+=dt*9;twinRotor.rotation.y+=dt*6;twinBlades.rotation.y+=dt*9;}
 const canPick=state.connected&&state.running&&state.open===0&&state.condition==='clear';
 if(singlePass&&!canPick)singlePass=false;
 if(singlePass){passProgress=Math.min(1,passProgress+dt*.6);manualOffset=-.55+passProgress*1.1;if(passProgress===1)singlePass=false;}
 if(state.stroke&&state.open===0&&!reduced.matches){manualOffset=null;cleaningTime+=dt;}
 const cleaningOffset=state.open===0?(manualOffset??(state.stroke&&!reduced.matches?Math.sin(cleaningTime*.9)*.55:0)):0;
 wand.position.z+=cleaningOffset;tool.position.z+=cleaningOffset;
 if(Math.abs(lastHoseOffset-cleaningOffset)>.00001){lastHoseOffset=cleaningOffset;hosePath.points[6].z=.75+cleaningOffset;hosePath.updateArcLengths();const shape=new THREE.TubeGeometry(hosePath,120,.088,9,false);hoseTube.mesh.geometry.attributes.position.copy(shape.attributes.position);hoseTube.mesh.geometry.attributes.position.needsUpdate=true;hoseTube.mesh.geometry.attributes.normal.copy(shape.attributes.normal);hoseTube.mesh.geometry.attributes.normal.needsUpdate=true;hoseTube.mesh.frustumCulled=false;shape.dispose();flowCurve.points[0].z=1.53+cleaningOffset;flowCurve.points[1].z=1.14+cleaningOffset;flowCurve.points[2].z=.75+cleaningOffset;flowCurve.updateArcLengths();staticFlow.geometry.setFromPoints(flowCurve.getPoints(110));staticFlow.computeLineDistances();hoseRibs.forEach((rib,index)=>{rib.position.copy(hosePath.getPointAt(index/95));rib.quaternion.setFromUnitVectors(ribOrientation,hosePath.getTangentAt(index/95).normalize());});}
 if(canPick){const from=previousNozzle?.active?previousNozzle.z:tool.position.z;pickupAt(tool.position.x,(from+tool.position.z)/2,.3+Math.abs(from-tool.position.z));}
 previousNozzle={z:tool.position.z,active:canPick};
 const shellSeeThrough=Boolean(state.xray);if(shellApplied!==shellSeeThrough){shellApplied=shellSeeThrough;for(const id of ['cover','tank'])ghost(groups[id],shellSeeThrough,.065);}
 flow.visible=state.air&&state.open===0;for(let i=0;i<dots.length;i++){dots[i].visible=state.running;dots[i].position.copy(flowCurve.getPointAt((i/dots.length+(reduced.matches?0:tick*.16))%1));}
 const moving=Boolean(cameraTween)||(state.autoRotate&&!pointerInside&&!floorView&&!reduced.matches)||springing||singlePass||((state.running||(state.stroke&&state.open===0))&&!reduced.matches)||((state.glowParts?.length>0)&&!reduced.matches);
 render(moving,time);if(moving)schedule();}
  function setState(next){state={...next};setFinish(state.variant);studio.setGlow(state.glow!==false);if(currentVariant!==state.variant+state.pickupMode){currentVariant=state.variant+state.pickupMode;const module=vacuumModules[state.variant]||vacuumModules['junior-103'];partInfo=new Map(vacuumPartList(module.id,state.pickupMode).map(p=>[p.id,p]));tipId=null;ctx.fillStyle='#edf1e9';ctx.fillRect(0,117,1024,75);ctx.font='26px Arial';ctx.fillStyle='#40535a';ctx.fillText(`${module.name.toUpperCase()}   •   ${module.category.toUpperCase()} VACUUM`,235,154);texture.needsUpdate=true;}
 const water=state.pickupMode==='wet';dustMaterial.color.set(water?'#55b7c5':'#8c6845');paperMaterial.color.set(water?'#55b7c5':'#d7bd83');dustMeshes.forEach((m,i)=>{m.scale.set(water?2:.8+(i%4)*.15,water?.18:.8+(i%4)*.15,water?2:.8+(i%4)*.15);m.position.y=water?.006:i%5===0?.012:.025;});if(state.open>0&&floorView)cameraAction('reset');paintHighlights();schedule();}
 const resize=new ResizeObserver(()=>{tipId=null;const rect=canvas.parentElement.getBoundingClientRect();if(rect.width&&rect.height){studio.resize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();schedule();}});resize.observe(canvas.parentElement);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else clearHover();});observer.observe(canvas);
 controls.addEventListener('start',()=>{cameraTween=null;});controls.addEventListener('change',()=>{render();});listen(document,'visibilitychange',()=>{if(document.hidden)clearHover();else schedule();});listen(reduced,'change',schedule);
 listen(canvas,'webglcontextlost',e=>{e.preventDefault();document.getElementById('viewer-fallback').hidden=false;});
 function cameraAction(action,animate=false){
  const from=camera.position.clone(),fromTarget=controls.target.clone(),offset=camera.position.clone().sub(controls.target);cameraTween=null;
  if(action==='reset'){focusY=null;floorView=false;camera.position.set(camera.aspect>1.15?4.6:4.8,camera.aspect>1.15?3.4:3.6,camera.aspect>1.15?7.1:7.4);controls.target.set(0,1.25,0);if(camera.aspect<=1.15)camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);lastFraming=1;}
  else if(action==='floor'){focusY=null;floorView=true;camera.position.set(3.8,3.8,5.7);controls.target.set(.65,.75,.7);lastFraming=1;}
  else if(action.startsWith('rotate')){offset.applyAxisAngle(new THREE.Vector3(0,1,0),(action==='rotate-left'?-1:1)*(animate?.55:.28));camera.position.copy(controls.target).add(offset);}
  else{offset.setLength(THREE.MathUtils.clamp(offset.length()*(action==='zoom-in'?.85:1.15),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);}
  if(animate&&!reduced.matches){cameraTween={from,fromTarget,to:camera.position.clone(),toTarget:controls.target.clone(),progress:0};camera.position.copy(from);controls.target.copy(fromTarget);}
  controls.update();render();schedule();
 }

 // Fly to a part: aim at where it will be once the slider settles, keeping the current viewing direction.
 function flyTo(id){
  const g=groups[id];if(!g)return;
  const goal=waveFactor(g.userData.layer,state.open/100),spot=g.userData.base.clone().addScaledVector(g.userData.offset,goal).add(anchorOf(id)),box=new THREE.Box3().setFromObject(g),radius=box.getSize(new THREE.Vector3()).length()/2;
  const from=camera.position.clone(),fromTarget=controls.target.clone(),direction=from.clone().sub(fromTarget).normalize(),distance=THREE.MathUtils.clamp(2.4+radius*2.2,controls.minDistance,controls.maxDistance);
  focusY=spot.y;const to=spot.clone().addScaledVector(direction,distance);
  if(reduced.matches){camera.position.copy(to);controls.target.copy(spot);cameraTween=null;}else cameraTween={from,fromTarget,to,toTarget:spot,progress:0};
  controls.update();schedule();
 }
 // Leaving the page releases the GPU: geometry, textures, materials, the composer and the renderer.
 function destroy(){
  active=false;if(frame)cancelAnimationFrame(frame);frame=0;abort.abort();resize.disconnect();observer.disconnect();controls.dispose();onCallouts([],0,0);
  const seen=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(!seen.has(m)){seen.add(m);m.map?.dispose();m.dispose();}});
  studio.dispose();
 }

 publishDust();controls.update();schedule();return {setActive(value){active=value;previous=0;activePointers.clear();pointerDown=null;multiGesture=false;pinchDistance=null;clearHover();if(!active&&frame){cancelAnimationFrame(frame);frame=0;}if(active)schedule();},setState,cameraAction,flyTo,destroy,clearHover,resetDust,makeCleaningPass};
}
