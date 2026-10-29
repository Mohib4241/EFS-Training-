import * as THREE from 'three';
import {pose} from '../parts.js';
import {buildHandBasin,buildStream,buildSoapDispenser,buildTowelDispenser,buildTowelSheet,buildFoam} from '../models.js';
import {anchorsOf} from './vacuum.js';
import {HAND_AREAS,SCRUB_DURATION_MS} from '../../maintenance-state.js';
import {clamp01,smoother,lerp3,offscreen} from '../demo.js';

// Handwashing at a wall basin: tap on, wet both hands under the running water, tap off, soap, scrub every area for at least
// 20 seconds, tap on and rinse, take a paper towel and dry, then use the towel to turn the tap off. Only the hands and the
// washing equipment are shown. The timer teaches the sequence; it cannot verify real hand hygiene.
const BASIN=[0,0.62,-0.45],SOAP=[-0.38,0.84,-0.705],TOWEL=[0.42,0.86,-0.7];
const LEVER=[BASIN[0],BASIN[1]+0.1,-0.68],SPOUT=[BASIN[0],BASIN[1]+0.13,BASIN[2]-0.07],BOWL=BASIN[1]-0.14;
// under the water: both hands cupped below the spout; scrubbing: palms together in front of the basin
const UNDER=[SPOUT[0],SPOUT[1]-0.1,SPOUT[2]+0.04],RUB=[BASIN[0],BASIN[1]+0.06,BASIN[2]+0.12];
export const PARTS={
 tap:{anchor:[0,0.02,0.07],places:{off:pose(LEVER),on:pose(LEVER,[0,0.9,0])}},
 water:{anchor:[0,0,0],places:{on:pose([SPOUT[0],SPOUT[1]-0.07,SPOUT[2]])}},
 soap:{anchor:[0,0,0.012],places:{rest:pose([SOAP[0],SOAP[1]-0.045,SOAP[2]+0.045]),pressed:pose([SOAP[0],SOAP[1]-0.045,SOAP[2]+0.036])}},
 towel:{anchor:[0,-0.07,0],places:{rest:pose([TOWEL[0],TOWEL[1]-0.12,TOWEL[2]+0.045])}}
};
const anchorAt=anchorsOf(PARTS);
const FOCUS={basin:{c:[0.02,0.6],w:0.62,h:0.36},close:{c:[0,0.58],w:0.42,h:0.3}};
const STEPS=[['water','Turn on clean water'],['wet','Wet both hands'],['soap','Tap off, apply soap'],['scrub','Scrub every area · 20 seconds'],['rinse','Rinse under running water'],['dry','Dry with clean paper towel'],['tapoff','Use towel to turn tap off']];
const AREA_NAMES={palms:'Palms',backs:'Backs of hands',fingers:'Between fingers',nails:'Fingertips & nails'};
const LABELS={tap:'the tap lever',water:'the running water',soap:'the soap dispenser',towel:'a paper towel'};
const running=state=>state.rubStartedAt!==null&&state.rubStartedAt!==undefined;

function targetPart(state){
 if(state.complete)return null;
 switch(state.phase){
  case 'water':return 'tap';
  case 'wet':return 'water';
  case 'soap':return state.tapOn?'tap':'soap';
  case 'rinse':return state.tapOn?'water':'tap';
  case 'dry':return state.towel?null:'towel';
  case 'tapoff':return 'tap';
  default:return null;
 }
}
const canGrab=(state,id)=>!state.complete&&targetPart(state)===id;
function pressAction(state,id){
 if(id==='tap')return {type:'tap'};
 if(id==='water')return {type:state.phase==='wet'?'wet':'rinse'};
 if(id==='soap')return {type:'soap'};
 if(id==='towel')return {type:'towel'};
 return null;
}
function choices(state){
 if(state.complete)return [];
 if(state.phase==='dry'&&state.towel)return [{id:'dry',label:'Dry both hands with the towel',hint:'Palms, backs and between the fingers',action:{type:'dry'},correct:true}];
 if(state.phase!=='scrub')return [];
 const left=HAND_AREAS.filter(a=>!state.surfaces.includes(a)),cards=left.map((area,i)=>({id:area,label:AREA_NAMES[area],hint:'Practise this area',action:{type:'surface',area},correct:i===0}));
 if(!running(state)&&state.rubElapsedMs<SCRUB_DURATION_MS)cards.push({id:'timer',label:'Start the 20-second scrub timer',hint:'Or rub your hands together in front of the camera',action:{type:'rub'},correct:!left.length});
 return cards;
}
const COPY={
 water:['Turn the tap on.','Start with clean running water. Press the tap lever.'],
 wet:['Wet both hands.','Put both hands under the running water.'],
 soap:['Tap off, then apply soap.','Turn the tap off to save water, then press the soap dispenser.'],
 scrub:['Scrub every area for at least 20 seconds.','Practise palms, backs, between fingers and fingertips/nails. Start the timer, or rub your hands together in front of the camera.'],
 rinse:['Rinse well under running water.','Turn the tap on again and put both hands under the water to rinse the soap away.'],
 dry:['Dry with a clean paper towel.','Take a paper towel from the dispenser and dry both hands before the towel touches the tap.'],
 tapoff:['Use the towel to turn off the tap.','Your hands are dry. Use the towel as a barrier on the tap lever, then discard it.'],
 done:['Handwashing sequence practised.','The timer and actions teach the sequence. They cannot verify real-world technique or guarantee that hands are free from germs.']
};

// ---- demonstration: both hands, deterministic in time ----
const ORIENT={cup:{pitch:0.25,roll:1.15},rub:{pitch:0.15,roll:1.45},point:{pitch:0.12,roll:0,yawR:0.45},towel:{pitch:0.2,roll:1.3}};
const orient=(side,o)=>({pitch:o.pitch,roll:o.roll,yaw:o.yawR===undefined?(side==='right'?0.25:-0.25):(side==='right'?o.yawR:-o.yawR)});
function enterExit(p,enter,exit,place,from=null){const a=smoother(clamp01(p/enter)),b=smoother(clamp01((p-(1-exit))/exit));
 // a hand that is already in view (it just pressed something) comes over from there; it still leaves out of view
 if(from&&p<enter)return {inside:1,blend:()=>lerp3(from,place.at,a)};
 return {inside:a*(1-b),blend:t=>lerp3(offscreen(place.side,place.at),place.at,t)};}
// both hands at `centre`, apart by `gap`, with a gentle motion; returns the two hand samples for a pose
function pairAt(centre,{gap,poseName,o,wobble=0,phase=0,lift=0,enter,exit,p,towel=false,from={}}){
 const hands=[];
 for(const side of ['left','right']){
  const s=side==='left'?-1:1,w=wobble*Math.sin(p*Math.PI*2*phase+(side==='left'?0:Math.PI));
  const at=[centre[0]+s*gap/2+w*0.6,centre[1]+lift+w*0.4,centre[2]+w*0.3];
  const {inside,blend}=enterExit(p,enter,exit,{side,at},from[side]);
  hands.push({side,target:blend(inside),pose:[['relaxed',1-inside],[towel&&side==='right'?'claw':poseName,inside]],visible:true,orient:orient(side,o)});
 }
 return hands;
}
function reachThen(p,{press,point,side='right',after}){
 // one hand presses (press = fraction of the frame when the press lands), then both hands do `after`
 if(p<press+0.12){const u=smoother(clamp01(p/press)),back=smoother(clamp01((p-press)/0.12)),hover=[point[0],point[1]+0.05,point[2]+0.05],from=offscreen(side,point);
  const target=p<press?lerp3(from,lerp3(hover,point,u>0.7?(u-0.7)/0.3:0),u):lerp3(point,hover,back);
  return [{side,target,pose:[['point',1]],visible:true,orient:orient(side,ORIENT.point)}];}
 return after((p-press-0.12)/(1-press-0.12),{[side]:[point[0],point[1]+0.05,point[2]+0.05]});
}
function demoScript(frame,scripts){
 const types=frame.actions.map(a=>a.type).join(),ms=frame.duration*1.4,enter=Math.min(0.3,700/ms),exit=enter,e2=Math.min(0.3,700/(ms*0.6));
 if(types==='tap,rinse'){const point=anchorAt('tap','off');
  return scripts.pair({name:'water',effects:[0.25,0.7],sample:p=>({hands:reachThen(p,{press:0.25,point,after:(q,from)=>pairAt(UNDER,{gap:0.07,poseName:'cup',o:ORIENT.cup,wobble:0.014,phase:3,p:q,enter:e2,exit:e2,from})})})});}
 if(types==='towel,dry'){const point=anchorAt('towel','rest');
  return scripts.pair({name:'towel',effects:[0.25,0.8],sample:p=>({hands:reachThen(p,{press:0.25,point,after:(q,from)=>pairAt(RUB,{gap:0.05,poseName:'cup',o:ORIENT.towel,wobble:0.018,phase:5,p:q,enter:e2,exit:e2,towel:true,from})})})});}
 switch(frame.actions[0].type){
  case 'tap':return scripts.press({part:'tap',point:anchorAt('tap',frame.from.tapOn?'on':'off'),side:'right'});
  case 'soap':return scripts.press({part:'soap',point:anchorAt('soap','rest'),side:'right'});
  case 'wet':return scripts.pair({name:'water',effects:[0.55],sample:p=>({hands:pairAt(UNDER,{gap:0.07,poseName:'cup',o:ORIENT.cup,wobble:0.012,phase:2,p,enter,exit})})});
  case 'surface':return scripts.pair({name:'scrub',effects:[0.1,0.13,0.16,0.19,0.22,0.9],sample:p=>({hands:pairAt(RUB,{gap:0.035,poseName:'flat',o:ORIENT.rub,wobble:0.022,phase:14,p,enter:Math.min(0.12,enter),exit:Math.min(0.12,exit)})})});
  default:throw new RangeError('No choreography for '+types);
 }
}

// ---- camera: rubbing the hands together runs the scrub timer ----
function gestures({getState,dispatch}){
 let together=0,apart=0,last=null;
 return {update(dt,{hands}){
  const state=getState();if(state.phase!=='scrub'||state.complete||!hands||hands.length<2){together=0;last=null;return {active:false};}
  const [a,b]=hands,d=Math.hypot(a.palm[0]-b.palm[0],a.palm[1]-b.palm[1]),mid=[(a.palm[0]+b.palm[0])/2,(a.palm[1]+b.palm[1])/2];
  const moving=last?Math.hypot(a.palm[0]-last[0],a.palm[1]-last[1])>0.004:false;last=[a.palm[0],a.palm[1],mid];
  if(d<0.24){together+=dt;apart=0;}else{apart+=dt;together=0;}
  if(!running(state)&&together>0.5&&moving&&state.rubElapsedMs<SCRUB_DURATION_MS)dispatch({type:'rub'});
  if(running(state)&&apart>1.2)dispatch({type:'pause'});
  return {active:running(state),rubbing:together>0.5};
 }};
}

export const task={
 kind:'hands',
 title:()=>'Wash hands',
 steps:()=>STEPS,
 places:state=>({tap:state.tapOn?'on':'off',water:'on',soap:'rest',towel:'rest'}),
 anchorAt,ZONES:{},RINGS:{},FOCUS,PARTS,
 focusFor:state=>state.phase==='scrub'&&!state.complete?'close':'basin',
 rules:{carry:[],press:['tap','water','soap','towel'],canGrab,pressAction,release:()=>null,targetPart,targetZone:()=>null,
  label:id=>LABELS[id],zoneLabel:()=>'',carryDepth:-0.2},
 instructions:state=>COPY[state.complete?'done':state.phase]??COPY.water,
 choices:state=>choices(state),
 timer:state=>state.phase==='scrub'&&!state.complete?(running(state)?'Pause scrub timer':'Start scrub timer'):null,
 status(state,{demo}={}){
  if(state.phase!=='scrub'&&!(demo&&demo.effect?.name==='scrub'))return null;
  let elapsed=state.rubElapsedMs,live=running(state);
  // the demonstration shows the timer at 4× speed while the hands scrub
  if(demo&&demo.effect?.name==='scrub'){elapsed=Math.round(clamp01((demo.progress-0.22)/0.68)*SCRUB_DURATION_MS);live=demo.progress>0.22&&demo.progress<0.9;}
  return {timer:{elapsed,total:SCRUB_DURATION_MS,running:live,label:demo?'Scrub timer · preview at 4× speed':'Scrub timer'},
   chips:HAND_AREAS.map(area=>({id:area,label:AREA_NAMES[area],done:state.surfaces.includes(area),action:state.phase==='scrub'&&!state.surfaces.includes(area)?{type:'surface',area}:null})),
   note:'Rub your hands together in front of the camera to run the timer; it pauses when they move apart.'};
 },
 gestures,
 // mouse: while the timer runs, both hands scrub at the basin
 mouseHands(world,pointer,{state}){
  if(state.phase==='scrub'&&running(state)){const t=performance.now()/1000;return pairAt(RUB,{gap:0.035,poseName:'flat',o:ORIENT.rub,wobble:0.022,phase:1,p:(t*2.2)%1,enter:0.0001,exit:0.0001});}
  return null;
 },
 sources:'<strong>Based on CDC community handwashing guidance:</strong> wet, soap/lather, scrub at least 20 seconds, rinse and dry. Drying before towel tap-off follows the WHO poster. The 20-second timer is for scrubbing only; WHO’s 40–60 seconds describes its entire procedure, which this simplified exercise does not time or certify. <a href="https://www.cdc.gov/clean-hands/about/index.html" target="_blank" rel="noopener noreferrer">CDC handwashing ↗</a> <a href="https://www.who.int/docs/default-source/patient-safety/how-to-handwash-poster.pdf" target="_blank" rel="noopener noreferrer">WHO drying and tap-off sequence ↗</a>',
 build(stage,{rigs,life}){
  const {kit}=stage;
  const tap=buildHandBasin(kit,{position:BASIN});stage.blob(BASIN[0],-0.62,0.3,0.18);
  stage.addPart('tap',{group:tap.lever,materials:tap.leverMaterials,places:PARTS.tap.places,anchor:PARTS.tap.anchor,initial:'off'});
  const stream=buildStream(kit,{top:tap.spoutTip,bottom:[tap.spoutTip[0],BOWL,tap.spoutTip[2]]});
  stage.addPart('water',{group:kit.group(),materials:[],places:PARTS.water.places,anchor:[0,0,0],initial:'on'});
  const soap=buildSoapDispenser(kit,{position:SOAP});
  stage.addPart('soap',{group:soap.push,materials:soap.materials,places:PARTS.soap.places,anchor:PARTS.soap.anchor,initial:'rest'});
  const towels=buildTowelDispenser(kit,{position:TOWEL});
  stage.addPart('towel',{group:towels.tab,materials:towels.materials,places:PARTS.towel.places,anchor:[0,-0.045,0],initial:'rest'});
  // lather and the towel are drawn after the hands (which draw over everything), so they show on the skin
  const sheet=buildTowelSheet(kit,{material:kit.std('#ffffff',0.95,0,{map:towels.paper.map,side:THREE.DoubleSide,transparent:true})}),foam=buildFoam(kit,{count:44});
  sheet.renderOrder=1001;foam.renderOrder=1001;
  // wet hands look glossy; the shared hand material is put back when the task closes
  const skin=rigs.right.mesh.material,dryRoughness=skin.roughness;life?.onCleanup(()=>{skin.roughness=dryRoughness;});
  let state=null,wet=0;const p=new THREE.Vector3(),q=new THREE.Vector3(),m=new THREE.Matrix4(),JOINTS=[0,1,2,5,6,9,10,13,14,17,18,3,7,11,15,19,9,5,13,1,0,17];
  stage.addUpdater((dt,time)=>{
   let busy=stream.update(dt,time);
   const goal=state?.wet?1:0;if(Math.abs(goal-wet)>0.01){wet+=(goal-wet)*Math.min(1,dt*3);busy=true;}else wet=goal;skin.roughness=dryRoughness-0.32*wet;
   return busy;
  });
  return {
   apply(next){state=next;stream.set(next.tapOn);},
   // lather clings to the hands while soap is on them; the towel is in the right hand from taking it until tap-off
   frame({state:s,rigs:r,wall}){
    let n=0;
    if(s.soap){for(const side of ['left','right']){const rig=r[side];if(!rig.object.visible)continue;for(let i=0;i<JOINTS.length&&n<foam.instanceMatrix.count;i++){rig.jointPosition(JOINTS[i],p);const k=(i*7919+n*104729)%1000/1000,size=0.009+0.009*k;q.set(Math.sin(i*12.9+k*6)*0.006,Math.cos(i*7.1)*0.004+0.003,Math.sin(i*3.7)*0.006);m.makeScale(size,size*0.85,size).setPosition(p.add(q));foam.setMatrixAt(n++,m);}}}
    foam.count=n;if(n)foam.instanceMatrix.needsUpdate=true;
    const rig=r.right,show=s.towel&&!s.complete&&rig.object.visible;sheet.visible=show;
    if(show){rig.jointPosition(9,p);rig.jointPosition(0,q);sheet.position.copy(p).lerp(q,0.3);sheet.position.z+=0.015;sheet.quaternion.copy(rig.object.quaternion);}
   }
  };
 },
 script:demoScript
};
