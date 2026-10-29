import * as THREE from 'three';
import {pose,anchorPoint} from '../parts.js';
import {buildWorkbench,buildMarker,buildTag,buildPlug} from '../models.js';
import {vacuumParts,anchorsOf,PART_LABELS,buildVacuumScene,vacuumScript,UNPLUG_DISTANCE} from './vacuum.js';

// Connector inspection: unplug and lay the plug on the inspection mat, look at the three marked areas (pins and casing,
// cable entry, heat mark), then choose the safe response. External visual checks only: no testing, wiring or repair.
const SOCKET=[0.64,0.62],BENCH=[0.46,0.42,0.02];
// the plug propped on the mat with its pin face toward the viewer, tilted up so the face and the scorch can be seen
const MAT=pose([0.44,BENCH[1]+0.032,0.05],[0.61,Math.PI,0]);
// each marker sits beside the feature it points at (local plug coordinates), nudged toward the viewer and apart
const SPOTS={pins:{local:[0,0.006,-0.017],nudge:[-0.042,0.03,0.02]},cable:{local:[0,-0.045,0],nudge:[-0.04,-0.03,0.02]},heat:{local:[0.016,-0.008,-0.016],nudge:[0.046,0.012,0.02]}};
const AREAS=['pins','cable','heat'];
const spot=area=>{const [x,y,z]=anchorPoint(SPOTS[area].local,MAT),[dx,dy,dz]=SPOTS[area].nudge;return [x+dx,y+dy,z+dz];};
const vac=vacuumParts({socket:SOCKET});
export const PARTS={plug:{anchor:vac.plug.anchor,places:{in:vac.plug.places.in,out:MAT}},
 ...Object.fromEntries(AREAS.map(area=>[area,{anchor:[0,0,0],places:{on:pose(spot(area))}}]))};
const TABLE={...vac,plug:PARTS.plug};
const anchorAt=anchorsOf(PARTS);
const ZONES={mat:{min:[BENCH[0]-0.22,BENCH[1],BENCH[2]-0.15],max:[BENCH[0]+0.22,BENCH[1]+0.2,BENCH[2]+0.17]}};
const RINGS={mat:{x:MAT.p[0],y:BENCH[1]+0.006,z:MAT.p[2],rx:0.13,rz:0.1}};
const FOCUS={plug:{c:[0.3,0.42],w:0.56,h:0.36},mat:{c:[0.44,0.45],w:0.2,h:0.16},decide:{c:[0.44,0.43],w:0.24,h:0.2}};
const STEPS=[['isolate','Switch off & unplug'],['inspect','Inspect three areas'],['decide','Choose the safe response']];
const LABELS={...PART_LABELS,pins:'marker 1 · pins and casing',cable:'marker 2 · cable entry',heat:'marker 3 · heat mark'};
const ZONE_LABELS={mat:'on the inspection mat'};
const NAMES={pins:'Pins & casing',cable:'Cable entry',heat:'Heat mark'};

const targetPart=state=>state.complete?null:state.phase==='isolate'?'plug':state.phase==='inspect'?AREAS.find(a=>!state.checks.includes(a)):null;
const targetZone=state=>state.phase==='isolate'&&!state.complete?'mat':null;
function canGrab(state,id){
 if(state.complete)return false;
 if(id==='plug')return state.phase==='isolate';
 return state.phase==='inspect'&&AREAS.includes(id)&&!state.checks.includes(id);
}
const places=state=>({plug:state.isolated?'out':'in',pins:'on',cable:'on',heat:'on'});
const COPY={
 isolate:['Switch off and unplug first.','Pull the plug out of the wall socket and lay it on the inspection mat. This is an external visual check only: no live testing.'],
 inspect:['Inspect all three marked areas.','Touch (or click) each numbered marker: 1 pins and casing, 2 cable entry, 3 heat mark.'],
 decide:['A visible concern needs a clear response.','The connector shows heat staining. Choose what should happen to the equipment next.'],
 done:['Fault recognised and reported.','Keep equipment with visible damage out of use until an authorised competent person assesses it. Appearance alone cannot certify electrical safety.']
};
export const task={
 kind:'terminals',
 title:()=>'Inspect the connector',
 steps:()=>STEPS,
 places,anchorAt,ZONES,RINGS,FOCUS,PARTS,
 // several markers can be used, in any order, during the inspection
 anyOrder:['inspect'],
 focusFor:state=>state.complete?'decide':state.phase==='isolate'?'plug':state.phase==='inspect'?'mat':'decide',
 rules:{carry:['plug'],press:AREAS,canGrab,pressAction:(state,id)=>({type:'inspect',area:id}),
  release:(state,id,ctx)=>id==='plug'&&state.phase==='isolate'&&ctx.inZone('mat')&&ctx.pulled>=UNPLUG_DISTANCE?{type:'isolate'}:null,
  targetPart,targetZone,label:id=>LABELS[id],zoneLabel:zone=>ZONE_LABELS[zone],partDepth:id=>id==='plug'?0.05:undefined,
  missHint:(state,id)=>id==='plug'&&state.phase==='isolate'?'Pull the plug out and lay it on the inspection mat.':undefined},
 instructions:state=>COPY[state.complete?'done':state.phase]??COPY.isolate,
 choices:state=>state.phase==='decide'&&!state.complete?[
  {id:'report',label:'Remove from use & report',hint:'Keep it out of use until a competent person assesses it',action:{type:'decide',choice:'report'},correct:true},
  {id:'clear',label:'No visible concern',hint:'Put it back into use',action:{type:'decide',choice:'clear'}}]:[],
 status:state=>state.phase==='isolate'?null:{chips:AREAS.map((area,i)=>({id:area,label:`${i+1} · ${NAMES[area]}`,done:state.checks.includes(area),current:state.activeCheck===area,action:state.phase==='inspect'&&!state.checks.includes(area)?{type:'inspect',area}:null}))},
 sources:'<strong>External visual checks only.</strong> No live test, wiring, tightening or repair is taught. Internal terminal inspection requires an authorised person with task-appropriate competence and the correct manual. <a href="https://www.hse.gov.uk/electricity/electricequip.htm" target="_blank" rel="noopener noreferrer">HSE equipment-check guidance ↗</a>',
 build(stage,{label}){
  const {kit}=stage;
  // the machine with a plug that carries a scorch mark (the defect this lesson is about)
  const scene=buildVacuumScene(stage,{label,table:TABLE,rest:[0.9,0.47,-0.4],socket:SOCKET,heatMark:true});
  buildWorkbench(kit,{position:BENCH,size:[0.5,0.34]});stage.blob(BENCH[0],BENCH[2],0.7,0.5);
  const markers={},green=new THREE.Color('#5fd6a3'),amber=new THREE.Color('#ffffff');
  for(const [i,area] of AREAS.entries()){
   const m=buildMarker(kit,{number:i+1}),g=kit.group();g.add(m.sprite);markers[area]={...m,group:g};
   stage.addPart(area,{group:g,materials:[],places:PARTS[area].places,anchor:[0,0,0],initial:'on'});
  }
  const tag=buildTag(kit,{});tag.position.set(MAT.p[0]+0.07,MAT.p[1]+0.012,MAT.p[2]+0.03);tag.rotation.set(-0.35,-0.25,-0.12);
  let state=null,pulse=0;
  stage.addUpdater((dt,time)=>{
   if(!state)return false;
   const target=targetPart(state);let busy=false;
   for(const area of AREAS){const m=markers[area],on=state.isolated;m.sprite.visible=on;if(!on)continue;
    const s=area===target?0.028*(1+0.14*Math.sin(time*6)):0.026;m.sprite.scale.set(s,s,1);if(area===target)busy=true;
    m.material.color.copy(state.checks.includes(area)?green:amber);}
   if(state.complete&&pulse<1){pulse=Math.min(1,pulse+dt*3);tag.scale.setScalar((0.3+0.7*pulse)*0.62);busy=true;}
   return busy;
  });
  return {apply(next,{instant}={}){state=next;tag.visible=next.complete;if(!next.complete){pulse=0;tag.scale.setScalar(0.2);}else if(instant){pulse=1;tag.scale.setScalar(0.62);}}};
 },
 script(frame,scripts){
  const action=frame.actions[0];
  switch(action.type){
   case 'isolate':return scripts.carry({part:'plug',from:anchorAt('plug','in'),to:anchorAt('plug','out'),hands:[{side:'right',attach:[0,0,0]}],lift:0.06});
   case 'inspect':return scripts.press({part:action.area,point:anchorAt(action.area,'on'),side:'right'});
   case 'decide':return scripts.look({point:anchorAt('heat','on'),side:'right',choice:'report'});
   default:return vacuumScript(scripts,anchorAt,frame,places)??(()=>{throw new RangeError('No choreography for '+action.type);})();
  }
 }
};
