import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {parts} from './content.js';
import {openingFromPixels} from './machine-state.js';
import {createDust,collectDust} from './cleaning-state.js';

export function createViewer(canvas,onSelect,onOpenChange,onPickup=()=>{}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eef2f1');
 const environment=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=environment.fromScene(room,.04);scene.environment=env.texture;room.dispose();environment.dispose();
 const camera=new THREE.PerspectiveCamera(36,1,.1,60);camera.position.set(4.8,3.6,7.4);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.25,0);controls.minDistance=3.3;controls.maxDistance=13;controls.maxPolarAngle=Math.PI*.49;controls.enableDamping=false;controls.enablePan=false;
 controls.enableZoom=false;
 // Reserve two-finger gestures for revealing parts, rather than orbit/dolly.
 controls.touches.TWO=null;
 const hemi=new THREE.HemisphereLight(0xffffff,0x8b9d9a,2);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xfff7eb,4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-4;key.shadow.normalBias=.025;scene.add(key);
 const fill=new THREE.DirectionalLight(0xbfdedc,1.7);fill.position.set(4,3,-4);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xe6ece9,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
 const tileCanvas=document.createElement('canvas');tileCanvas.width=512;tileCanvas.height=512;
 const tileContext=tileCanvas.getContext('2d');tileContext.fillStyle='#b4c5bb';tileContext.fillRect(0,0,512,512);
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){tileContext.fillStyle=(row+col)%2?'#e3e9df':'#e9ede5';tileContext.fillRect(col*512/6+1.5,row*512/6+1.5,512/6-3,512/6-3);}
 const tilesTexture=new THREE.CanvasTexture(tileCanvas);tilesTexture.colorSpace=THREE.SRGBColorSpace;tilesTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const tiles=new THREE.Mesh(new THREE.PlaneGeometry(5.8,4.5),new THREE.MeshStandardMaterial({map:tilesTexture,roughness:.82}));tiles.rotation.x=-Math.PI/2;tiles.position.set(.4,-.007,.65);tiles.receiveShadow=true;scene.add(tiles);
 let dust=createDust(),lastPicked=-1,cleaningTime=0,manualOffset=null,singlePass=false,passProgress=0,previousNozzle=null,lastHoseOffset=0,floorView=false;
 const dustGeometry=new THREE.DodecahedronGeometry(.032,0),paperGeometry=new THREE.BoxGeometry(.055,.008,.044);
 const dustMaterial=new THREE.MeshStandardMaterial({color:0x8c6845,roughness:1}),paperMaterial=new THREE.MeshStandardMaterial({color:0xd7bd83,roughness:1});
 const dustMeshes=dust.map((point,index)=>{const marker=new THREE.Mesh(index%5===0?paperGeometry:dustGeometry,index%5===0?paperMaterial:dustMaterial);marker.position.set(point.x,index%5===0?.012:.025,point.z);marker.rotation.y=index*.7;marker.scale.setScalar(.8+(index%4)*.15);scene.add(marker);return marker;});
 function publishDust(){const picked=dust.filter(point=>point.collected).length;if(picked!==lastPicked){lastPicked=picked;onPickup({picked,total:dust.length});}}
 function pickupAt(x,z,depth=.3){const next=collectDust(dust,{x,z,width:.65,depth,active:state.connected&&state.running&&state.open===0&&state.condition==='clear'});if(next!==dust){dust=next;dustMeshes.forEach((marker,index)=>marker.visible=!dust[index].collected);publishDust();}}
 function resetDust(){dust=createDust();dustMeshes.forEach(marker=>marker.visible=true);cleaningTime=0;manualOffset=null;singlePass=false;previousNozzle=null;publishDust();schedule();}
 function makeCleaningPass(){if(!state.connected||!state.running||state.open!==0||state.condition!=='clear')return false;previousNozzle=null;manualOffset=-.55;passProgress=0;singlePass=!reduced.matches;if(reduced.matches){manualOffset=.55;pickupAt(1.28,1.5,1.4);}schedule();return true;}
 const rig=new THREE.Group();scene.add(rig);const groups={};const pickables=[];const wheels=[];
 const mat=(color,metalness=.1,roughness=.48)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const dark=mat('#17272d',.24,.34),edge=mat('#34464b',.35,.34),metal=mat('#b9c6c7',.87,.22),orange=mat('#f67a25',.12,.42),rubber=mat('#142023',0,.87),cream=mat('#dfd9be',0,.9),teal=mat('#148e91',.3,.35),white=mat('#f4f4e9',.1,.6);
 const part=(id,pos,offset)=>{const g=new THREE.Group();g.position.set(...pos);g.userData={base:g.position.clone(),offset:new THREE.Vector3(...offset),id};groups[id]=g;rig.add(g);return g;};
 function mesh(group,geometry,material,pos=[0,0,0],rot=[0,0,0]){const m=new THREE.Mesh(geometry,material.clone());m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.part=group.userData.id;group.add(m);if(group.userData.id)pickables.push(m);return m;}
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
 const collector=part('collector',[0,.92,0],[0,.72,0]);cyl(collector,.49,.34,.68,cream);ring(collector,.49,.028,edge,[0,.34,0]);
 const filter=part('filter',[0,1.39,0],[0,1.08,0]);cyl(filter,.57,.5,.22,cream);ring(filter,.57,.035,dark,[0,.12,0]);
 for(let i=0;i<48;i++){const a=i*Math.PI/24;box(filter,[.018,.2,.038],white,[Math.sin(a)*.532,0,Math.cos(a)*.532],.003,[0,a,0]);}
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
 const tool=part('tool',[1.28,.11,1.5],[1.28,0,.25]);box(tool,[.65,.15,.28],dark,[0,0,0],.055);box(tool,[.65,.02,.3],edge,[0,-.07,0],.008);cyl(tool,.07,.07,.13,dark,[0,.1,-.05],[.45,0,0]);box(tool,[.18,.025,.14],orange,[.17,.088,0],.008);
 const cable=part('cable',[0,0,0],[0,0,0]);const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.56,-.63),new THREE.Vector3(-.7,.08,-.6),new THREE.Vector3(-1.6,.04,.65),new THREE.Vector3(-2.0,.2,.5)]);const wire=mesh(cable,new THREE.TubeGeometry(cableCurve,72,.025,8,false),orange);wire.frustumCulled=false;
 const plug=part('plug',[-2,.12,.5],[0,0,0]);box(plug,[.18,.2,.1],dark,[0,0,0],.025);for(const [x,y] of [[0,.06],[-.045,-.025],[.045,-.025]])box(plug,[.018,.035,.075],metal,[x,y,-.075],.002);
 const socket=new THREE.Group();socket.position.set(-2.15,.76,-.48);scene.add(socket);box(socket,[.44,.48,.07],white,[0,0,0],.025);box(socket,[.075,.12,.016],orange,[.13,.12,.044],.008);
 for(const [x,y] of [[0,.06],[-.045,-.025],[.045,-.025]])box(socket,[.021,.035,.008],rubber,[x,y,.041],.002);
 const wall=new THREE.Group();scene.add(wall);box(wall,[.8,1.18,.08],mat('#d1dcd7',0,.92),[-2.15,.57,-.57],.02);
 const flowCurve=new THREE.CatmullRomCurve3([[1.29,.16,1.53],[1.3,.5,1.14],[1.42,1.15,.75],[1.66,1.6,.15],[2,1.4,-.25],[1.93,.45,-.02],[1.4,.55,.65],[.5,1.02,.66],[0,.95,.2],[0,1.46,0],[0,1.85,0],[0,2.0,-.5]].map(p=>new THREE.Vector3(...p)));
 const flow=new THREE.Group();scene.add(flow);const dots=[];const dotGeometry=new THREE.SphereGeometry(.033,8,6);const dotMaterial=new THREE.MeshBasicMaterial({color:0x16aba2});for(let i=0;i<28;i++){const dot=new THREE.Mesh(dotGeometry,dotMaterial);flow.add(dot);dots.push(dot);}
 const staticFlow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(flowCurve.getPoints(110)),new THREE.LineDashedMaterial({color:0x119a92,dashSize:.06,gapSize:.045,transparent:true,opacity:.75,depthTest:false}));staticFlow.computeLineDistances();flow.add(staticFlow);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let state={open:0,part:'overview',connected:false,running:false,xray:false,air:false,callouts:true,condition:'clear',stroke:false};
 let frame=0,previous=0,tick=0,visible=true,lastPlug=-1,lastOpen=-1,lastFraming=1;const animated={open:0,plug:0};const labelRoot=document.getElementById('callouts');const labelItems=[['cover','Motor head'],['hose','Air path'],['plug','Power connection']].map(([id,name])=>{const el=document.createElement('span');el.textContent=name;labelRoot.append(el);return {id,el};});
 const p=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const tooltip=document.getElementById('part-tooltip');const partInfo=new Map(parts.map(part=>[part.id,part]));
 const activePointers=new Map();let pointerDown=null,multiGesture=false,pinchDistance=null,hoverPoint=null,hovered=null,lastSelected=null,lastHovered=null,tipId=null,tipWidth=0,tipHeight=0;
 function hitAt(point){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||point.x<0||point.y<0||point.x>rect.width||point.y>rect.height)return;
  pointer.set(point.x/rect.width*2-1,-point.y/rect.height*2+1);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects(pickables,false).find(hit=>hit.object.visible&&hit.object.material.opacity>.3);
 }
 function paintHighlights(){
  if(lastSelected===state.part&&lastHovered===hovered)return;
  lastSelected=state.part;lastHovered=hovered;
  for(const [id,group] of Object.entries(groups))group.traverse(object=>{
   if(!object.isMesh||!object.material.emissive)return;
   const hover=id===hovered,selected=id===state.part;
   object.material.emissive.set(hover?0x249c8f:selected?0x12635d:0x000000);
   object.material.emissiveIntensity=hover?.55:selected?.32:0;
  });
 }
 function clearHover(){hoverPoint=null;hovered=null;tooltip.hidden=true;canvas.style.cursor='grab';paintHighlights();schedule();}
 function updateHover(){
  const hit=hoverPoint&&activePointers.size===0?hitAt(hoverPoint):null;
  hovered=hit?.object.userData.part||null;paintHighlights();
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
 canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
  reveal(-event.deltaY*unit*(event.ctrlKey?3:1));
 },{passive:false});
 canvas.addEventListener('pointerdown',event=>{
  activePointers.set(event.pointerId,localPoint(event));pointerDown={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};clearHover();
  if(activePointers.size>1){multiGesture=true;pointerDown=null;pinchDistance=activePointers.size===2?touchSpan():null;}
 });
 canvas.addEventListener('pointermove',event=>{
  if(pointerDown?.id===event.pointerId&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6)pointerDown.dragged=true;
  if(activePointers.has(event.pointerId)){
   activePointers.set(event.pointerId,localPoint(event));
   if(activePointers.size===2){const distance=touchSpan();if(pinchDistance!==null)reveal((distance-pinchDistance)*2);pinchDistance=distance;}
  }
  if(event.pointerType!=='touch'&&event.buttons===0&&activePointers.size===0){hoverPoint=localPoint(event);schedule();}
  else if(hoverPoint)clearHover();
 });
 canvas.addEventListener('pointerup',event=>{
  const click=!multiGesture&&pointerDown?.id===event.pointerId&&!pointerDown.dragged&&event.button===0&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)<=6;
  activePointers.delete(event.pointerId);pinchDistance=activePointers.size===2?touchSpan():null;
  if(activePointers.size===0){multiGesture=false;pointerDown=null;}
  if(click){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const hit=hitAt(localPoint(event));if(hit)onSelect(hit.object.userData.part);}
  if(event.pointerType!=='touch'){hoverPoint=localPoint(event);schedule();}
 });
 canvas.addEventListener('pointerleave',clearHover);
 canvas.addEventListener('pointercancel',()=>{activePointers.clear();pointerDown=null;pinchDistance=null;multiGesture=false;clearHover();});
 canvas.addEventListener('keydown',event=>{
  if(event.key==='Escape'){clearHover();return;}
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?100:openingFromPixels(state.open,event.key==='ArrowUp'?100:-100);
   if(next!==state.open)onOpenChange(next);
  }
 });
 function labels(){const {width,height}=canvas.getBoundingClientRect();for(const {id,el} of labelItems){el.hidden=!state.callouts;if(!state.callouts)continue;if(id==='hose'){p.set(1.95,1.38,0);groups[id].localToWorld(p);}else groups[id].getWorldPosition(p);p.y+=id==='cover'?.35:.14;p.project(camera);el.style.left=`${(p.x*.5+.5)*width}px`;el.style.top=`${(-p.y*.5+.5)*height}px`;el.style.opacity=p.z<1?'1':'0';}}
 function render(){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);labels();updateHover();renderer.render(scene,camera);}
 function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(update);}
 function update(time){frame=0;const dt=Math.min((time-previous)/1000||.016,.05);previous=time;tick+=dt;const blend=reduced.matches?1:Math.min(1,dt*9);animated.open=THREE.MathUtils.lerp(animated.open,state.open/100,blend);animated.plug=THREE.MathUtils.lerp(animated.plug,state.connected?1:0,blend);
 for(const [id,g] of Object.entries(groups)){g.position.copy(g.userData.base).addScaledVector(g.userData.offset,animated.open);if(id==='clips'||id==='wheels')g.children.forEach(o=>{if(o.userData.originX===undefined)o.userData.originX=o.position.x;o.position.x=o.userData.originX*(1+animated.open*.7);});}
 const framing=1+animated.open*.22;camera.position.sub(controls.target).multiplyScalar(framing/lastFraming).add(controls.target);lastFraming=framing;
 const targetY=(floorView?.75:1.25)+animated.open*.55;camera.position.y+=targetY-controls.target.y;controls.target.y=targetY;
 const t=animated.plug;plug.position.set(THREE.MathUtils.lerp(-2,-2.15,t),THREE.MathUtils.lerp(.12,.76,t),THREE.MathUtils.lerp(.5,-.33,t));
 if(Math.abs(lastPlug-t)>.00001||Math.abs(lastOpen-animated.open)>.00001){lastPlug=t;lastOpen=animated.open;cableCurve.points[0].set(0,groups.cover.position.y-.07,-.63);cableCurve.points[3].copy(plug.position).add(new THREE.Vector3(0,-.09,.02));const wirePositions=wire.geometry.attributes.position;const tempGeometry=new THREE.TubeGeometry(cableCurve,72,.025,8,false);wirePositions.copy(tempGeometry.attributes.position);wirePositions.needsUpdate=true;wire.geometry.attributes.normal.copy(tempGeometry.attributes.normal);wire.geometry.attributes.normal.needsUpdate=true;tempGeometry.dispose();}
 rocker.rotation.x=state.running?-.2:.2;const operating=state.running&&!reduced.matches;if(operating){rotor.rotation.y+=dt*6;blades.rotation.y+=dt*9;}
 const canPick=state.connected&&state.running&&state.open===0&&state.condition==='clear';
 if(singlePass&&!canPick)singlePass=false;
 if(singlePass){passProgress=Math.min(1,passProgress+dt*.6);manualOffset=-.55+passProgress*1.1;if(passProgress===1)singlePass=false;}
 if(state.stroke&&state.open===0&&!reduced.matches){manualOffset=null;cleaningTime+=dt;}
 const cleaningOffset=state.open===0?(manualOffset??(state.stroke&&!reduced.matches?Math.sin(cleaningTime*.9)*.55:0)):0;
 wand.position.z+=cleaningOffset;tool.position.z+=cleaningOffset;
 if(Math.abs(lastHoseOffset-cleaningOffset)>.00001){lastHoseOffset=cleaningOffset;hosePath.points[6].z=.75+cleaningOffset;hosePath.updateArcLengths();const shape=new THREE.TubeGeometry(hosePath,120,.088,9,false);hoseTube.mesh.geometry.attributes.position.copy(shape.attributes.position);hoseTube.mesh.geometry.attributes.position.needsUpdate=true;hoseTube.mesh.geometry.attributes.normal.copy(shape.attributes.normal);hoseTube.mesh.geometry.attributes.normal.needsUpdate=true;hoseTube.mesh.frustumCulled=false;shape.dispose();flowCurve.points[0].z=1.53+cleaningOffset;flowCurve.points[1].z=1.14+cleaningOffset;flowCurve.points[2].z=.75+cleaningOffset;flowCurve.updateArcLengths();staticFlow.geometry.setFromPoints(flowCurve.getPoints(110));staticFlow.computeLineDistances();hoseRibs.forEach((rib,index)=>{rib.position.copy(hosePath.getPointAt(index/95));rib.quaternion.setFromUnitVectors(ribOrientation,hosePath.getTangentAt(index/95).normalize());});}
 if(canPick){const from=previousNozzle?.active?previousNozzle.z:tool.position.z;pickupAt(tool.position.x,(from+tool.position.z)/2,.3+Math.abs(from-tool.position.z));}
 previousNozzle={z:tool.position.z,active:canPick};
 const shellSeeThrough=state.xray;for(const id of ['cover','tank'])groups[id].traverse(o=>{if(o.isMesh){o.material.transparent=shellSeeThrough;o.material.opacity=shellSeeThrough?.065:1;o.material.depthWrite=!shellSeeThrough;o.castShadow=!shellSeeThrough;}});
 flow.visible=state.air&&state.open===0;for(let i=0;i<dots.length;i++){dots[i].visible=state.running;dots[i].position.copy(flowCurve.getPointAt((i/dots.length+(reduced.matches?0:tick*.16))%1));}
 render();const moving=Math.abs(animated.open-state.open/100)>.0005||Math.abs(animated.plug-(state.connected?1:0))>.0005||singlePass||((state.running||(state.stroke&&state.open===0))&&!reduced.matches);if(moving)schedule();}
 function setState(next){state={...next};if(state.open>0&&floorView)cameraAction('reset');paintHighlights();schedule();}
 const resize=new ResizeObserver(()=>{tipId=null;const rect=canvas.parentElement.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();schedule();}});resize.observe(canvas.parentElement);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else clearHover();});observer.observe(canvas);
 controls.addEventListener('change',()=>{render();});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHover();else schedule();});reduced.addEventListener('change',schedule);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('viewer-fallback').hidden=false;});
 function cameraAction(action){const offset=camera.position.clone().sub(controls.target);if(action==='reset'){floorView=false;camera.position.set(4.8,3.6,7.4);controls.target.set(0,1.25,0);lastFraming=1;schedule();}else if(action==='floor'){floorView=true;camera.position.set(3.8,3.8,5.7);controls.target.set(.65,.75,.7);lastFraming=1;schedule();}else if(action.startsWith('rotate')){offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='rotate-left'?-.28:.28);camera.position.copy(controls.target).add(offset);}else{const distance=THREE.MathUtils.clamp(offset.length()*(action==='zoom-in'?.85:1.15),controls.minDistance,controls.maxDistance);offset.setLength(distance);camera.position.copy(controls.target).add(offset);}controls.update();render();}
 publishDust();controls.update();schedule();return {setState,cameraAction,clearHover,resetDust,makeCleaningPass};
}
