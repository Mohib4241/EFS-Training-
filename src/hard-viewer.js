import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {openingFromPixels} from './machine-state.js';

// One renderer serves the six actual modules. Previous module GPU resources are released on load.
export function createHardViewer(canvas,{onSelect,onReveal,tooltip,labels}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0ee');
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 const camera=new THREE.PerspectiveCamera(37,1,.1,80),controls=new OrbitControls(camera,canvas);controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=false;controls.touches.TWO=null;controls.minDistance=3;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0xffffff,0x718e86,1.6));const sun=new THREE.DirectionalLight('#fff7e8',2.7);sun.position.set(-4,7,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-5});sun.shadow.normalBias=.025;scene.add(sun);const fill=new THREE.DirectionalLight('#c1dce7',1.5);fill.position.set(4,3,-4);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#e0e8e3',roughness:.92}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const root=new THREE.Group();scene.add(root);let groups={},pickables=[],spinners=[],flows=[],shells=[],leds=[],field,display,displayContext,displayTexture,displayText='',module,state,model,active=false,visible=true,frame=0,previous=0,opening=0,framing=1,hover=null,hoverPoint=null,leadKey='',faultMarker;
 const abort=new AbortController(),signal=abort.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const steel='#a7bbc0',dark='#223c44',copper='#c27b41',white='#edf0e8',teal='#178d8d';
 const group=(id,pos=[0,0,0],offset=[0,0,0])=>{const g=new THREE.Group();g.position.set(...pos);g.userData={id,base:g.position.clone(),offset:new THREE.Vector3(...offset)};groups[id]=g;root.add(g);return g;};
 function owner(g){for(let p=g;p;p=p.parent)if(p.userData.id)return p.userData.id;return null;}
 function mesh(g,geometry,color,pos=[0,0,0],rot=[0,0,0]){const material=new THREE.MeshStandardMaterial({color,metalness:[steel,copper].includes(color)?.72:.15,roughness:color===steel?.3:.5});const o=new THREE.Mesh(geometry,material);o.position.set(...pos);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;o.userData.part=owner(g);g.add(o);if(o.userData.part)pickables.push(o);return o;}
 const box=(g,size,color,pos=[0,0,0],radius=.035)=>mesh(g,new RoundedBoxGeometry(...size,2,radius),color,pos);
 const cyl=(g,r,length,color,pos=[0,0,0],axis='x')=>mesh(g,new THREE.CylinderGeometry(r,r,length,32),color,pos,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0]);
 const ring=(g,r,t,color,pos=[0,0,0],axis='x')=>mesh(g,new THREE.TorusGeometry(r,t,8,40),color,pos,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]);
 function pipe(g,points,color,r=.035){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const o=mesh(g,new THREE.TubeGeometry(curve,40,r,8,false),color);return {o,curve};}
 function spin(g,axis='x',unit=null){const o=new THREE.Group();g.add(o);spinners.push({o,axis,unit});return o;}
 function fan(g,x,r=.5,axis='x',unit=null){const hub=spin(g,axis,unit);hub.position.set(...(Array.isArray(x)?x:[x,0,0]));cyl(hub,.13,.15,dark,[0,0,0],axis);for(let n=0;n<6;n++){const blade=box(hub,[.07,r*.5,r*.22],steel,[0,Math.sin(n*Math.PI/3)*r*.55,Math.cos(n*Math.PI/3)*r*.55],.02);blade.rotation.x=-n*Math.PI/3+.35;}if(axis==='z'){for(const child of hub.children){const {x:cx,y:cy,z:cz}=child.position;child.position.set(cz,cy,cx);}hub.children.slice(1).forEach(o=>o.rotation.y=Math.PI/2);}return hub;}
 function brandPlate(g,text,pos){const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#e7eee9';ctx.fillRect(0,0,512,160);ctx.fillStyle='#254b53';ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,102);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(.8,.25),new THREE.MeshBasicMaterial({map:texture}));o.position.set(...pos);g.add(o);}
 function motor(single){
  const housing=group('frame',[0,1.05,0],[0,1.8,0]);shells.push('frame','cowl','terminal-box');cyl(housing,.78,1.9,module.color);for(let n=0;n<28;n++){const a=n/28*Math.PI*2;const fin=box(housing,[1.88,.08,.055],module.color,[0,Math.sin(a)*.79,Math.cos(a)*.79],.009);fin.rotation.x=-a;}brandPlate(housing,module.brand,[0,.13,.84]);
  const stator=group('stator',[0,1.05,0],[0,.6,0]);mesh(stator,new THREE.CylinderGeometry(.69,.69,1.76,48,1,true),steel,[0,0,0],[0,0,Math.PI/2]);for(const x of [-.88,.88])ring(stator,.58,.085,steel,[x,0,0]);
  const winding=group('windings',[0,1.05,0],[0,1.05,.1]);for(let n=0;n<6;n++){const a=n/6*Math.PI*2,y=Math.sin(a)*.54,z=Math.cos(a)*.54;pipe(winding,[[-1,y,z],[-.85,y*1.17,z*1.17],[.85,y*1.17,z*1.17],[1,y,z],[.85,y*.92,z*.92],[-.85,y*.92,z*.92],[-1,y,z]],single?copper:['#c57542','#aaa955','#527d9e'][n%3],.055);}
  const rotor=group('rotor',[0,1.05,0],[0,0,1.35]),rotating=spin(rotor);cyl(rotating,.4,1.7,steel);for(let n=0;n<18;n++){const a=n/18*Math.PI*2;const bar=box(rotating,[1.62,.045,.055],dark,[0,Math.sin(a)*.405,Math.cos(a)*.405],.007);bar.rotation.x=-a+.08;}for(const x of [-.84,.84])ring(rotating,.37,.045,steel,[x,0,0]);
  const shaft=group('shaft',[0,1.05,0],[-.7,0,1.35]),shaftSpin=spin(shaft);cyl(shaftSpin,.13,3.45,steel);box(shaftSpin,[.48,.055,.065],dark,[-1.42,.13,0],.004);
  const bearings=[['de-bearing',-1.02,-1.2],['nde-bearing',1.02,1.4]];for(const [id,x,off] of bearings){const g=group(id,[x,1.05,0],[off,.2,0]);ring(g,.24,.085,steel);ring(g,.24,.028,dark);for(let n=0;n<8;n++)mesh(g,new THREE.SphereGeometry(.044,10,8),steel,[0,Math.sin(n*Math.PI/4)*.24,Math.cos(n*Math.PI/4)*.24]);}
  const end=group('endshields',[0,1.05,0],[0,0,0]);end.userData.spread=true;for(const x of [-1.1,1.1]){const g=new THREE.Group();g.position.x=x;g.userData.homeX=x;end.add(g);ring(g,.58,.13,module.color);for(let n=0;n<4;n++){const a=n*Math.PI/2+.7;box(g,[.15,.15,.15],module.color,[0,Math.sin(a)*.48,Math.cos(a)*.48],.02);}}
  const cooling=group('fan',[1.4,1.05,0],[2.05,0,0]);fan(cooling,0,.6);const cowl=group('cowl',[1.7,1.05,0],[2.7,0,0]);mesh(cowl,new THREE.CylinderGeometry(.7,.7,.38,32,1,true),module.color,[0,0,0],[0,0,Math.PI/2]);for(let n=0;n<7;n++)box(cowl,[.04,.035,1.15-n%2*.1],dark,[.2,(n-3)*.15,0],.008);
  const terminal=group('terminal-box',[-.25,1.98,0],[-.45,1.65,-.2]);box(terminal,[.85,.38,.7],module.color);box(terminal,[.91,.06,.76],module.color,[0,.22,0]);
  const board=group('terminal-board',[-.25,1.98,0],[.3,1.05,.9]);box(board,[.65,.07,.47],dark);for(let x=0;x<3;x++)for(const z of [-.13,.13])cyl(board,.045,.13,copper,[(x-1)*.21,.09,z],'y');
  const earth=group('earth',[-.6,1.78,.35],[-1,1,.8]);cyl(earth,.055,.07,'#7ab46d',[0,0,0],'z');
  const feet=group('feet',[0,.18,0],[0,0,0]);for(const x of [-.65,.65])for(const z of [-.58,.58]){box(feet,[.5,.18,.33],module.color,[x,0,z]);cyl(feet,.045,.2,dark,[x,0,z],'y');}
  if(single){const aux=group('auxiliary',[0,1.05,0],[0,1.2,-.75]);for(const a of [Math.PI/2,Math.PI*1.5])pipe(aux,[[-.98,Math.sin(a)*.56,0],[-.8,Math.sin(a)*.68,.2],[.8,Math.sin(a)*.68,.2],[.98,Math.sin(a)*.56,0]],'#c99d58',.065);const caps=group('capacitors',[.1,1.15,-.85],[.3,1.4,-1.1]);for(const x of [-.25,.25])cyl(caps,.2,.5,white,[x,0,0],'y');const start=group('start-switch',[1.08,1.05,0],[1.8,.7,.6]);ring(start,.3,.03,copper);for(const y of [-.2,.2])box(start,[.1,.16,.08],steel,[0,y,0],.015);}
  field=new THREE.Group();field.position.set(0,1.05,0);root.add(field);ring(field,.95,.012,teal);const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-.65,0),1.3,'#189d98',.15,.12);field.add(arrow);
 }
 function alternator(){
  const f=group('frame',[0,1.12,0],[0,1.7,0]);shells.push('frame','cowl','terminal-box');cyl(f,.9,2.4,module.color);for(let n=0;n<16;n++){const a=n/16*Math.PI*2,fin=box(f,[2.35,.1,.06],module.color,[0,Math.sin(a)*.91,Math.cos(a)*.91],.01);fin.rotation.x=-a;}brandPlate(f,'STAMFORD',[0,.13,.97]);
  const stator=group('stator',[0,1.12,0],[0,.7,0]);mesh(stator,new THREE.CylinderGeometry(.8,.8,2.1,48,1,true),steel,[0,0,0],[0,0,Math.PI/2]);
  const winding=group('windings',[0,1.12,0],[0,1.1,.2]);for(let n=0;n<8;n++){let a=n*Math.PI/4;pipe(winding,[[-1.1,Math.sin(a)*.67,Math.cos(a)*.67],[0,Math.sin(a)*.73,Math.cos(a)*.73],[1.1,Math.sin(a)*.67,Math.cos(a)*.67]],copper,.07);}
  const rotor=group('rotor',[0,1.12,0],[0,0,1.55]),turn=spin(rotor);cyl(turn,.29,1.8,steel);for(let n=0;n<4;n++){const a=n*Math.PI/2;box(turn,[1.8,.22,.33],copper,[0,Math.sin(a)*.35,Math.cos(a)*.35],.05);const pole=box(turn,[1.9,.12,.37],steel,[0,Math.sin(a)*.48,Math.cos(a)*.48],.05);pole.rotation.x=-a;}
  const shaft=group('shaft',[0,1.12,0],[-.6,0,1.55]);cyl(spin(shaft),.12,3.6,steel);
  const coupling=group('coupling',[-1.5,1.12,0],[-1.5,0,0]),disc=spin(coupling);cyl(disc,.65,.08,steel);for(let n=0;n<8;n++)cyl(disc,.05,.11,dark,[0,Math.sin(n*Math.PI/4)*.5,Math.cos(n*Math.PI/4)*.5]);
  const bearing=group('bearing',[1.4,1.12,0],[1.8,.2,0]);ring(bearing,.25,.09,steel);
  const exciter=group('exciter-stator',[1.1,1.12,0],[2,1.2,0]);ring(exciter,.48,.12,copper);const er=group('exciter-rotor',[1.12,1.12,0],[2,0,1]);cyl(spin(er),.32,.22,steel);
  const rectifier=group('rectifier',[1.45,1.12,0],[2.5,0,.8]),rr=spin(rectifier);cyl(rr,.34,.045,dark);for(let n=0;n<6;n++)box(rr,[.13,.08,.08],n%2?copper:steel,[0,Math.sin(n*Math.PI/3)*.25,Math.cos(n*Math.PI/3)*.25],.01);
  const avr=group('avr',[.25,2.2,0],[0,1.4,1]);box(avr,[.8,.09,.55],'#3e7862');box(avr,[.25,.17,.25],dark,[.12,.12,0]);for(const x of [-.25,-.1,.05])cyl(avr,.045,.11,copper,[x,.09,.17],'y');
  const terminal=group('terminal-box',[0,2.22,0],[.1,1.9,-.4]);box(terminal,[1.25,.5,.9],module.color);box(terminal,[1.3,.05,.95],module.color,[0,.28,0]);const cooling=group('fan',[-1.2,1.12,0],[-1.5,0,0]);fan(cooling,0,.75);const cowl=group('cowl',[1.58,1.12,0],[3,0,0]);cyl(cowl,.8,.17,module.color);for(let n=0;n<7;n++)box(cowl,[.05,.035,1.2],dark,[.1,(n-3)*.15,0],.008);
  for(const x of [-.8,.8])box(f,[.55,.22,1.6],module.color,[x,-.92,0]);
 }
 function instrument(){
  const meter=module.kind==='multimeter',body=group(meter?'body':'case',[0,1.43,0],[-.8,.2,0]);shells.push(meter?'body':'case','back');box(body,[1.45,2.58,.4],meter?'#38464a':module.color,[0,0,0],.14);
  if(meter){const holster=group('case',[0,1.43,-.05],[-1.45,0,0]);box(holster,[1.63,2.76,.44],module.color,[0,0,0],.17);}
  const screen=group('screen',[0,2.08,.23],[0,1.1,.7]);box(screen,[1.16,.67,.07],dark,[0,0,0],.025);display=document.createElement('canvas');display.width=512;display.height=224;displayContext=display.getContext('2d');displayTexture=new THREE.CanvasTexture(display);displayTexture.colorSpace=THREE.SRGBColorSpace;const lcd=new THREE.Mesh(new THREE.PlaneGeometry(1.03,.49),new THREE.MeshBasicMaterial({map:displayTexture}));lcd.position.z=.041;screen.add(lcd);
  const dial=group('dial',[0,1.28,.26],[0,.35,.9]);cyl(dial,.35,.1,dark,[0,0,0],'z');box(dial,[.065,.26,.05],white,[0,.16,.07],.008);for(let n=0;n<8;n++){const a=n/8*Math.PI*2;const mark=box(body,[.027,.075,.02],white,[Math.sin(a)*.45,-.15+Math.cos(a)*.45,.23],.002);mark.rotation.z=-a;}
  if(!meter){const key=group('test-key',[.4,.84,.25],[.8,.2,.6]);cyl(key,.13,.09,white,[0,0,0],'z');}
  const terminals=group('terminals',[0,.42,.26],[0,-.12,.75]);for(const x of meter?[-.48,-.16,.16,.48]:[-.34,.34]){ring(terminals,.083,.03,x<0?'#343c43':'#bb4447',[x,0,0],'z');cyl(terminals,.056,.05,dark,[x,0,0],'z');}
  const pcb=group('pcb',[0,1.45,-.01],[1.05,.1,0]);box(pcb,[1.16,2.1,.055],'#327768');for(let n=0;n<8;n++)box(pcb,[.16,.2,.07],dark,[(n%3-1)*.3,Math.floor(n/3)*.3-.5,.065],.008);const chip=box(pcb,[.4,.4,.08],dark,[0,.5,.075],.01);chip.rotation.z=.2;
  const block=group(meter?'fuses':'discharge',[0,1,-.03],[1.4,-.2,.25]);for(const x of [-.25,.25]){cyl(block,.07,.54,meter?white:copper,[x,0,0],'y');for(const y of [-.27,.27])cyl(block,.073,.09,steel,[x,y,0],'y');}
  const battery=group('battery',[0,.6,-.18],[0,-.1,-1]);box(battery,[.7,.62,.21],'#496373');for(const x of [-.2,.2])cyl(battery,.05,.07,copper,[x,.34,0],'y');
  const back=group('back',[0,1.43,-.24],[0,0,-1.4]);box(back,[1.45,2.58,.12],dark,[0,0,0],.13);box(back,[.55,.9,.07],dark,[0,-.5,-.08]);brandPlate(body,meter?'FLUKE 87V':'Megger',[0,1.12,.235]);
  group('leads');const example=new THREE.Group();example.position.set(2,.23,.2);root.add(example);box(example,[1.5,.15,1.15],white);if(meter){box(example,[.7,.2,.25],copper,[0,.14,0]);for(const x of [-.55,.55])cyl(example,.07,.15,steel,[x,.12,0],'y');brandPlate(example,'IDEAL DC',[0,.6,.5]);}else{box(example,[.6,.65,.45],'#a4b6c5',[0,.4,0]);for(const x of [-.45,.45])cyl(example,.07,.2,copper,[x,.15,0],'y');brandPlate(example,'R + C',[0,1,.3]);}
 }
 function rebuildLeads(){
  const g=groups.leads;if(!g)return;const marked=module.checks.at(-1).part==='leads';if(marked)g.remove(faultMarker);const old=new Set();g.traverse(o=>{if(o.geometry)old.add(o.geometry);if(o.material)old.add(o.material);});g.clear();for(const resource of old)resource.dispose();pickables=pickables.filter(o=>o.userData.part!=='leads');
  const meter=module.kind==='multimeter',redX=meter?(state.inputs.jack==='A'?-.48:.48):.34,blackX=meter?-.16:-.34;
  const terminalY=.42;const targetA=state.connected?[1.45,.49,.2]:[.8,.12,1.1],targetB=state.connected?[2.55,.49,.2]:[1.2,.12,1.1];
  if(meter&&state.inputs.function==='A'&&state.connected)targetA[0]=2.0;
  for(const [x,target,color,bend] of [[blackX,targetA,dark,.3],[redX,targetB,'#be4346',-.1]]){pipe(g,[[x,terminalY,.33],[x-.25,.12,1.1],[1.4+bend,.08,1.3],target],color,.025);cyl(g,.052,.26,color,[target[0],target[1]+.08,target[2]],'y');}
  if(marked){faultMarker.position.set(1.1,.15,1.2);g.add(faultMarker);}
 }
 function cascade(){
  const base=group('base',[0,.12,0]);box(base,[6,.22,2.5],steel);shells.push('unit-1','unit-2','unit-3');
  for(let n=0;n<3;n++){const x=(n-1)*1.75,g=group(`unit-${n+1}`,[x,1.12,-.45],[(n-1)*.35,.7,-1]);box(g,[1.45,1.8,.75],white,[0,0,0],.07);box(g,[1.25,1.22,.05],dark,[0,.18,.41]);for(let y=0;y<14;y++)box(g,[1.19,.025,.035],steel,[0,-.37+y*.08,.45],.002);fan(g,[0,.25,.49],.68,'z',n);ring(g,.55,.025,dark,[0,.25,.52],'z');const led=cyl(g,.05,.04,teal,[.52,-.64,.42],'z');leds.push(led);brandPlate(g,`ECODAN · ${n+1}`,[0,-.66,.405]);}
  const headers=group('headers',[0,0,0],[0,0,1]);pipe(headers,[[-2.6,.65,.85],[2.8,.65,.85],[3.1,.65,.2]],'#ce6d55',.065);pipe(headers,[[-2.6,.35,1.15],[2.8,.35,1.15],[3.1,.35,.2]],'#527ea5',.065);
  for(let n=0;n<3;n++){const x=(n-1)*1.75;pipe(headers,[[x-.22,.35,1.15],[x-.22,.35,-.15],[x-.22,.6,-.15]],'#527ea5');pipe(headers,[[x+.22,.65,-.15],[x+.22,.65,.85]],'#ce6d55');const points=[[x-.22,.35,1.15],[x-.22,.35,-.15],[x,.65,-.15],[x+.22,.65,.85]];addFlow(points,'#31c4b2',n);}
  const pumps=group('pumps',[-2.45,.62,.8],[-.8,.5,.9]);cyl(pumps,.22,.3,'#388b70',[0,0,0],'y');const imp=spin(pumps,'y');box(imp,[.3,.03,.06],steel);box(pumps,[.18,.25,.2],dark,[0,.21,0]);
  const valves=group('valves',[0,0,0],[0,.3,.6]);for(let n=0;n<3;n++){const x=(n-1)*1.75;cyl(valves,.08,.15,copper,[x+.22,.65,.63],'z');box(valves,[.22,.04,.05],dark,[x+.22,.77,.63],.009);}
  const buffer=group('buffer',[3.0,.95,.2],[.65,.3,0]);cyl(buffer,.39,1.55,white,[0,0,0],'y');for(const y of [-.6,.6])ring(buffer,.38,.02,steel,[0,y,0],'y');
  const sensors=group('sensors',[1.8,.85,.83],[0,.9,.7]);for(const x of [0,.25]){cyl(sensors,.06,.18,steel,[x,0,0],'y');box(sensors,[.13,.12,.12],dark,[x,.1,0]);}
  const proof=group('flow-switch',[-1,.53,1],[0,.5,1]);box(proof,[.18,.18,.18],teal);const control=group('controls',[-3,.98,.1],[-.65,1,.5]);box(control,[.5,.8,.3],steel);box(control,[.34,.22,.035],dark,[0,.15,.18]);
  const load=group('load',[2.6,.12,1.85],[0,.4,1]);box(load,[1.7,.15,.5],white);for(let n=0;n<8;n++)cyl(load,.03,.8,steel,[(n-3.5)*.17,.17,0],'z');pipe(headers,[[3,.65,.2],[3.4,.65,1.85],[2.6,.32,1.85]],'#ce6d55');pipe(headers,[[2.2,.32,1.85],[2.2,.35,1.15]],'#527ea5');addFlow([[-2.5,.65,.85],[2.8,.65,.85],[3,.65,.2],[3.4,.65,1.85],[2.6,.32,1.85]],'#eeaf7e',null);
 }
 function addFlow(points,color,unit){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));for(let n=0;n<8;n++){const o=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color}));root.add(o);flows.push({o,curve,unit,phase:n/8});}}
 function disposeObject(object){const resources=new Set();object.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(m.map)resources.add(m.map);resources.add(m);}});for(const r of resources)r.dispose();}
 function load(next){
  clearHover();disposeObject(root);root.clear();groups={};pickables=[];spinners=[];flows=[];shells=[];leds=[];field=null;display=null;displayContext=null;displayTexture=null;displayText='';leadKey='';opening=0;framing=1;module=next;
  if(['single','three'].includes(module.kind))motor(module.kind==='single');else if(module.kind==='alternator')alternator();else if(module.kind==='cascade')cascade();else instrument();
  const faultPart=groups[module.checks.at(-1).part];faultMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.095),new THREE.MeshBasicMaterial({color:'#db873b'}));faultMarker.position.set(0,.16,.62);faultPart.add(faultMarker);faultMarker.visible=false;
  labels.replaceChildren();for(const p of module.parts){const span=document.createElement('span');span.dataset.label=p.id;span.textContent=p.name;labels.append(span);}resetCamera();resizeScene();schedule();
 }
 function resizeScene(){const r=canvas.parentElement.getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();schedule();}}
 function resetCamera(){const wide=module?.kind==='cascade',instrumentModel=['megger','multimeter'].includes(module?.kind);camera.position.set(wide?7:instrumentModel?4.2:-4.8,wide?4.5:3.3,wide?9:7);controls.target.set(instrumentModel?.7:0,1.15,0);framing=1;controls.update();}
 function cameraAction(action){if(action==='reset')resetCamera();else{const offset=camera.position.clone().sub(controls.target);if(action==='focus'&&groups[state?.part]){groups[state.part].getWorldPosition(controls.target);offset.setLength(4);}else if(action.startsWith('rotate'))offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='rotate-left'?-.3:.3);else offset.setLength(THREE.MathUtils.clamp(offset.length()*(action==='zoom-in'?.83:1.17),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}schedule();}
 const ray=new THREE.Raycaster(),point=new THREE.Vector2(),projected=new THREE.Vector3();
 function hitAt(p){const r=canvas.getBoundingClientRect();if(!r.width||!r.height||p.x<0||p.y<0||p.x>r.width||p.y>r.height)return null;point.set(p.x/r.width*2-1,-p.y/r.height*2+1);ray.setFromCamera(point,camera);return ray.intersectObjects(pickables,false).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return hit.object.material.opacity>.25;})?.object.userData.part;}
 function highlight(){for(const [id,g] of Object.entries(groups))g.traverse(o=>{if(o.material?.emissive){o.material.emissive.set(id===hover?'#279e8f':id===state?.targetPart?'#b78138':id===state?.part?'#126b70':'#000000');o.material.emissiveIntensity=(id===hover||id===state?.targetPart)? .45 : .25;}});}
 function clearHover(){hoverPoint=null;hover=null;tooltip.hidden=true;canvas.style.cursor='grab';if(state)highlight();schedule();}
 function updateHover(){const id=hoverPoint&&pointers.size===0?hitAt(hoverPoint):null;if(id!==hover){hover=id;highlight();}const part=module.parts.find(p=>p.id===id);tooltip.hidden=!part;canvas.style.cursor=pointers.size?'grabbing':part?'pointer':'grab';if(!part)return;tooltip.firstElementChild.textContent=part.group;tooltip.lastElementChild.textContent=part.name;const r=canvas.getBoundingClientRect();tooltip.style.left=`${Math.max(8,Math.min(hoverPoint.x+13,r.width-tooltip.offsetWidth-8))}px`;tooltip.style.top=`${Math.max(8,Math.min(hoverPoint.y+14,r.height-tooltip.offsetHeight-8))}px`;}
 function render(time){
  frame=0;if(!module||!state||!active||!visible||document.hidden)return;const dt=Math.min(previous?(time-previous)/1000:.016,.05);previous=time;const blend=reduced.matches?1:Math.min(1,dt*10);opening=THREE.MathUtils.lerp(opening,state.open/100,blend);
  for(const g of Object.values(groups)){g.position.copy(g.userData.base).addScaledVector(g.userData.offset,opening);if(g.userData.spread)for(const c of g.children)c.position.x=c.userData.homeX*(1+opening);}
  const nextFraming=1+opening*.3;camera.position.sub(controls.target).multiplyScalar(nextFraming/framing).add(controls.target);framing=nextFraming;
  const turning=state.running&&!reduced.matches;
  if(state.guidePlaying&&!reduced.matches){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.025);camera.position.copy(controls.target).add(offset);}
  for(const {o,axis,unit} of spinners){const enabled=unit===null?turning:turning&&model.requested?.includes(unit);if(enabled)o.rotation[axis]+=dt*(module.kind==='cascade'?3.2:(model.speed||1200)/60*Math.PI*2*.025)*(model.direction||1);}
  if(field){field.visible=state.xray&&state.running;if(turning)field.rotation.x+=dt*model.synchronous/60*Math.PI*2*.025;}
  for(const id of shells)groups[id]?.traverse(o=>{if(o.material?.isMeshStandardMaterial){o.material.transparent=state.xray;o.material.opacity=state.xray?.09:1;o.material.depthWrite=!state.xray;o.castShadow=!state.xray;}});
  for(let n=0;n<leds.length;n++)leds[n].material.color.set(state.inputs.unavailable===n+1?'#c17b40':state.running&&model.requested.includes(n)?'#3fab85':'#7c8d86');
  for(const f of flows){f.o.visible=state.running&&model.delivered>0&&(f.unit===null||model.requested.includes(f.unit))&&opening<.05;if(f.o.visible){if(!reduced.matches)f.phase=(f.phase+dt*.18)%1;f.o.position.copy(f.curve.getPointAt(f.phase));}}
  if(groups['start-switch'])groups['start-switch'].children.slice(1).forEach((arm,n)=>{arm.position.y=(n===0?-1:1)*(state.running?.32:.2);arm.rotation.z=(n===0?-1:1)*(state.running?.3:0);});
  if(displayTexture){const text=model.display;if(text!==displayText){displayText=text;displayContext.fillStyle='#b6c7ad';displayContext.fillRect(0,0,512,224);displayContext.fillStyle='#203c35';displayContext.font='bold 55px monospace';displayContext.textAlign='center';displayContext.fillText(text,256,133);displayTexture.needsUpdate=true;}}
  if(groups.dial)groups.dial.rotation.z=module.kind==='multimeter'?({V:-.65,A:.65,'Ω':1.4})[state.inputs.function]:Math.log2(state.inputs.testVoltage/50)*.4;
  faultMarker.visible=Boolean(state.inspectionFault);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const rect=canvas.getBoundingClientRect();for(const el of labels.children){const id=el.dataset.label,show=state.labels&&(id===state.part||id===state.targetPart||opening>.5&&['rotor','windings','avr','pcb','buffer','headers'].includes(id));el.hidden=!show;if(show){groups[id].getWorldPosition(projected);projected.y+=.3;projected.project(camera);el.style.left=`${(projected.x*.5+.5)*rect.width}px`;el.style.top=`${(-projected.y*.5+.5)*rect.height}px`;el.style.opacity=projected.z<1?'1':'0';}}
  updateHover();renderer.render(scene,camera);if(turning||state.guidePlaying&&!reduced.matches||Math.abs(opening-state.open/100)>.0005)schedule();
 }
 function schedule(){if(!frame&&active&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
 const pointers=new Map();let down=null,multiple=false,span=null;
 function cancelGesture(){pointers.clear();down=null;multiple=false;span=null;clearHover();}
 const local=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
 const reveal=pixels=>{if(state){const next=openingFromPixels(state.open,pixels);if(next!==state.open)onReveal(next);}};
 canvas.addEventListener('wheel',e=>{e.preventDefault();reveal(-e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1)*(e.ctrlKey?3:1));},{passive:false,signal});
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,local(e));down={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};clearHover();if(pointers.size>1){multiple=true;down=null;span=pointers.size===2?distance():null;}},{signal});
 canvas.addEventListener('pointermove',e=>{if(down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;if(pointers.has(e.pointerId)){pointers.set(e.pointerId,local(e));if(pointers.size===2){const next=distance();if(span!==null)reveal((next-span)*2);span=next;}}if(e.pointerType!=='touch'&&!e.buttons&&!pointers.size){hoverPoint=local(e);schedule();}},{signal});
 canvas.addEventListener('pointerup',e=>{const click=!multiple&&down?.id===e.pointerId&&!down.moved&&e.button===0;pointers.delete(e.pointerId);if(!pointers.size){multiple=false;down=null;span=null;}if(click){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const id=hitAt(local(e));if(id)onSelect(id);}if(e.pointerType!=='touch'){hoverPoint=local(e);schedule();}},{signal});
 canvas.addEventListener('pointerleave',clearHover,{signal});canvas.addEventListener('pointercancel',cancelGesture,{signal});window.addEventListener('blur',cancelGesture,{signal});
 canvas.addEventListener('keydown',e=>{if(e.key==='Escape')clearHover();if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();onReveal(e.key==='Home'?0:e.key==='End'?100:openingFromPixels(state.open,e.key==='ArrowUp'?100:-100));}},{signal});
 document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden)cancelGesture();else{clearHover();schedule();}},{signal});reduced.addEventListener('change',schedule,{signal});controls.addEventListener('change',schedule);
 const resize=new ResizeObserver(resizeScene);resize.observe(canvas.parentElement);const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;previous=0;if(visible)schedule();else clearHover();});observer.observe(canvas);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.dispatchEvent(new CustomEvent('viewer-unavailable'));},{signal});
 return {load,setState(next,result){state=next;model=result;const key=`${state.connected}:${state.inputs.function}:${state.inputs.jack}`;if(groups.leads&&key!==leadKey){leadKey=key;rebuildLeads();}highlight();schedule();},cameraAction,clearHover,setActive(value){active=value;previous=0;cancelGesture();if(!active&&frame){cancelAnimationFrame(frame);frame=0;}if(active){resizeScene();schedule();}},destroy(){active=false;if(frame)cancelAnimationFrame(frame);abort.abort();resize.disconnect();observer.disconnect();controls.dispose();disposeObject(root);floor.geometry.dispose();floor.material.dispose();environment.dispose();renderer.dispose();labels.replaceChildren();}};
}
