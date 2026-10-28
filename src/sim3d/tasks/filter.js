import * as THREE from 'three';
import {pose} from '../parts.js';
import {buildTray,buildUtilitySink,buildStream,buildDryingRack,buildAirflow,buildFilter,buildDrips} from '../models.js';
import {vacuumParts,anchorsOf,headZones,headRings,CLIPS,clipAction,clipUsable,PART_LABELS,UNPLUG_DISTANCE,buildVacuumScene,vacuumScript} from './vacuum.js';
import {filterCareSteps,filterInstruction,filterGrabbable} from '../../filter-care.js';

// Weekly filter wash, for the Junior 103 textile basket filter and the Junior 429 caged filter: unplug, open the clips, park
// the head on the dry stool, lift the filter to the tray, check it is washable, run the tap, rinse it in the sink, tap off,
// stand it on the drying rack, watch the air-drying preview, confirm it is dry, refit it, return the head and lock the clips.
// The wet work is on the left (sink, rack, tray); the dry side on the right (stool, wall socket), away from the water.
const REST=[0.64,0.47,0.1],SOCKET=[0.33,0.27];
const TRAY=[-0.5,0,0.2],SINK=[-0.78,0.46,-0.55],SINK_SIZE=[0.48,0.36,0.19],TAP_RISE=[0.27,0.23],RACK=[-0.3,0.52,-0.6];
const SINK_FLOOR=SINK[1]-SINK_SIZE[2]+0.006,LEVER=[SINK[0],SINK[1]+TAP_RISE[0]+0.03,-0.71];
// rim (where it is held) to base, and the rim radius, for each filter
const SHAPE={filter:{depth:0.25,rim:0.162},'wet-filter':{depth:0.242,rim:0.12}};

function layout(kind){
 const {depth,rim}=SHAPE[kind];
 const filterPlaces={tank:pose([0,0.398,0]),tray:pose([TRAY[0],0.03+depth,TRAY[2]],[0,0.4,0]),sink:pose([SINK[0],SINK_FLOOR+depth,SINK[2]+0.01],[0,0.3,0]),rack:pose([RACK[0],RACK[1]+0.005+depth,RACK[2]],[0,0.2,0])};
 const parts={...vacuumParts({rest:REST,socket:SOCKET,plugOut:pose([0.38,0.016,-0.4],[Math.PI/2-0.15,0.5,0])}),
  // held by the front of the rim, so the filter hangs from the fingers
  filter:{anchor:[0,0,rim],places:filterPlaces},
  tap:{anchor:[0,0.018,0.062],places:{off:pose(LEVER),on:pose(LEVER,[0,0.95,0])}}};
 return {parts,depth,rim};
}
const ZONES={...headZones(REST),
 tray:{min:[-0.72,0,0.02],max:[-0.28,0.44,0.38]},
 sink:{min:[-1.02,0.3,-0.73],max:[-0.54,0.8,-0.37]},
 rack:{min:[-0.51,0.5,-0.74],max:[-0.09,0.88,-0.46]},
 machine:{min:[-0.19,0.3,-0.19],max:[0.19,0.62,0.19]}};
const RINGS={...headRings(REST),
 tray:{x:TRAY[0],y:0.036,z:TRAY[2],rx:0.2,rz:0.16},
 sink:{x:SINK[0],y:SINK_FLOOR+0.002,z:SINK[2],rx:0.18,rz:0.15},
 rack:{x:RACK[0],y:RACK[1]+0.006,z:RACK[2],rx:0.18,rz:0.12},
 machine:{x:0,y:0.408,z:0,rx:0.2,rz:0.2}};
const FOCUS={
 plug:{c:[0.3,0.26],w:0.5,h:0.42},clips:{c:[0,0.36],w:0.5,h:0.4},stool:{c:[0.32,0.42],w:0.54,h:0.46},
 tray:{c:[-0.26,0.28],w:0.56,h:0.44},inspect:{c:[-0.5,0.16],w:0.4,h:0.32},
 sink:{c:[-0.56,0.42],w:0.5,h:0.48},rack:{c:[-0.56,0.46],w:0.54,h:0.44},dry:{c:[-0.36,0.54],w:0.4,h:0.34},
 fit:{c:[-0.16,0.46],w:0.5,h:0.46},seat:{c:[0.32,0.5],w:0.54,h:0.46}};
const FOCUS_OF_PHASE={isolate:'plug',release:'clips',secure:'clips',open:'stool',remove:'tray',inspect:'inspect',wash:'sink',drain:'rack',dry:'dry','check-dry':'dry',fit:'fit',close:'seat'};
const LABELS={...PART_LABELS,filter:'the filter',tap:'the tap lever'};
const ZONE_LABELS={rest:'on the stool',tray:'on the tray',sink:'into the sink, under the water',rack:'on the drying rack',machine:'into the tank',head:'back on the machine'};

function targetPart(state){
 if(state.complete)return null;
 switch(state.phase){
  case 'isolate':return 'plug';
  case 'release':return state.clips.left?'clipLeft':'clipRight';
  case 'secure':return !state.clips.left?'clipLeft':'clipRight';
  case 'open':case 'close':return 'head';
  case 'remove':case 'fit':return 'filter';
  case 'wash':return state.waterOn?'filter':'tap';
  case 'drain':return state.waterOn?'tap':'filter';
  default:return null;   // inspect, dry, check-dry: answered on the cards
 }
}
function targetZone(state){
 if(state.complete)return null;
 if(state.phase==='wash')return state.waterOn?'sink':null;
 if(state.phase==='drain')return state.waterOn?null:'rack';
 return ({open:'rest',close:'head',remove:'tray',fit:'machine'})[state.phase]??null;
}
function canGrab(state,id){
 if(state.complete)return false;const phase=state.phase;
 switch(id){
  case 'plug':return phase==='isolate';
  case 'clipLeft':case 'clipRight':return clipUsable(state,id);
  case 'head':return phase==='open'||phase==='close';
  case 'filter':return filterGrabbable(state);
  case 'tap':return phase==='wash'&&!state.waterOn||phase==='drain'&&state.waterOn;
  default:return false;
 }
}
function releaseAction(state,id,ctx){
 if(id==='plug')return state.phase==='isolate'&&ctx.pulled>=UNPLUG_DISTANCE?{type:'isolate'}:null;
 if(id==='head'&&state.phase==='open'&&ctx.inZone('rest'))return {type:'open'};
 if(id==='head'&&state.phase==='close'&&ctx.inZone('head'))return {type:'close'};
 if(id!=='filter')return null;
 if(state.phase==='remove'&&ctx.inZone('tray'))return {type:'remove'};
 if(state.phase==='wash'&&ctx.inZone('sink'))return {type:'wash'};
 if(state.phase==='drain'&&ctx.inZone('rack'))return {type:'rack'};
 if(state.phase==='fit'&&ctx.inZone('machine'))return {type:'fit'};
 return null;
}
const places=state=>({plug:state.isolated?'out':'in',clipLeft:state.clips.left?'locked':'released',clipRight:state.clips.right?'locked':'released',head:state.headOpen?'rest':'seated',filter:state.filter,tap:state.waterOn?'on':'off'});
function choices(state,language,kind){
 const hi=language==='hinglish',t=(en,hin)=>hi?hin:en,caged=kind==='wet-filter';
 if(state.phase==='inspect')return [
  {id:'washable',label:t('Confirmed washable filter','Washable filter confirm hai'),hint:t(caged?'Approved washable caged media, rim and seal intact':'Approved washable textile, rim and seal intact',caged?'Approved washable caged media, rim aur seal theek':'Approved washable textile, rim aur seal theek'),action:{type:'inspect',choice:'washable'},correct:true},
  {id:'paper',label:t('Paper media / washability unknown','Paper media / washability pata nahi'),hint:t('Never rinse it','Isko kabhi water se mat dhona'),action:{type:'inspect',choice:'paper'}}];
 if(state.phase==='dry')return [{id:'dry',label:t('Play the air-drying preview','Air-drying preview dekho'),hint:t('A short illustration, not the real drying time','Chhoti animation, real drying time nahi'),action:{type:'dry'},correct:true}];
 if(state.phase==='check-dry')return [
  {id:'dry',label:t('Completely dry & undamaged','Completely dry aur undamaged hai'),hint:t('Ready to refit','Refit ke liye ready'),action:{type:'confirm-dry',choice:'dry'},correct:true},
  {id:'wet',label:t('Still damp','Abhi damp hai'),hint:t('Leave it to air dry','Air dry hone do'),action:{type:'confirm-dry',choice:'wet'}}];
 return [];
}
const SOURCES='<strong>Weekly reusable-filter wash scenario.</strong> Weekly is the user-provided site schedule, not a verified OEM interval. The two filter shapes are schematic references; exact fitment, media and wet rating remain unverified. Rinse only removable media confirmed washable for the exact unit. Never wash paper media or the motor head. A washed filter must air dry thoroughly before refitting; the short preview is not a physical drying-time model. For liquid pickup, use the exact approved wet configuration. <a href="https://www.ipcworldwide.com/us/wp-content/uploads/sites/7/2017/11/Wet-Dry-Vacuum-Parts-Operating-Instructions-1-2020-1.pdf" target="_blank" rel="noopener noreferrer">IPC generic filter-care guidance (not an exact Junior manual) ↗</a>';

export function filterTask(kind){
 const {parts:PARTS,depth}=layout(kind),anchorAt=anchorsOf(PARTS);
 return {
  kind,
  title:()=>kind==='wet-filter'?'Weekly caged filter wash':'Weekly textile filter wash',
  steps:language=>filterCareSteps(language),
  cadence:language=>language==='hinglish'?'Weekly':'Weekly',
  places,anchorAt,ZONES,RINGS,FOCUS,PARTS,
  focusFor:state=>state.complete?'wide':FOCUS_OF_PHASE[state.phase]??'wide',
  rules:{carry:['plug','head','filter'],press:[...CLIPS,'tap'],canGrab,pressAction:(state,id)=>id==='tap'?{type:'tap'}:clipAction(state,id),release:releaseAction,targetPart,targetZone,
   label:id=>LABELS[id],zoneLabel:zone=>ZONE_LABELS[zone],partDepth:id=>id==='plug'?-0.28:undefined,
   missHint:(state,id)=>id==='plug'&&state.phase==='isolate'?'Pull the plug further out of the wall socket.':id==='filter'&&state.phase==='wash'?'Lower the filter into the sink, under the running water.':undefined},
  instructions:(state,language)=>state.complete?filterInstruction({...state,phase:'done'},language):filterInstruction(state,language),
  choices:(state,language)=>choices(state,language,kind),
  sources:SOURCES,
  build(stage,{label}){
   const {kit}=stage;buildVacuumScene(stage,{label,table:PARTS,rest:REST,socket:SOCKET});
   buildTray(kit,{position:TRAY,size:[0.38,0.32]});stage.blob(TRAY[0],TRAY[2],0.6,0.5);
   const tap=buildUtilitySink(kit,{position:SINK,size:SINK_SIZE,tap:TAP_RISE});
   stage.addPart('tap',{group:tap.lever,materials:tap.leverMaterials,places:PARTS.tap.places,anchor:PARTS.tap.anchor,initial:'off'});
   const stream=buildStream(kit,{top:tap.spoutTip,bottom:[tap.spoutTip[0],SINK_FLOOR,tap.spoutTip[2]]});
   const rack=buildDryingRack(kit,{position:RACK,size:[0.4,0.24]});
   const air=buildAirflow(kit,{position:[RACK[0],RACK[1]+0.04,RACK[2]+0.16]});
   const filter=buildFilter(kit,{caged:kind==='wet-filter'}),drips=buildDrips(kit);
   stage.addPart('filter',{group:filter.group,materials:filter.materials,places:PARTS.filter.places,anchor:PARTS.filter.anchor,shadow:0.32,initial:'tank'});
   // dust washes off in the sink; wet media is darker and drips until the drying preview; air moves over the rack while it dries
   const dryColor=filter.fabric.color.clone(),wetColor=dryColor.clone().multiplyScalar(0.7),base=new THREE.Vector3();
   let dust=1,dustGoal=1,wet=0,wetGoal=0,airGoal=0,dripping=false;
   stage.addUpdater((dt,time)=>{
    let busy=false;
    if(Math.abs(dust-dustGoal)>0.002){dust+=Math.sign(dustGoal-dust)*Math.min(Math.abs(dustGoal-dust),dt*(dustGoal<dust?0.75:2.5));busy=true;}else dust=dustGoal;
    filter.dust.opacity=dust;filter.dust.visible=dust>0.01;
    if(Math.abs(wet-wetGoal)>0.002){wet+=(wetGoal-wet)*Math.min(1,dt*(wetGoal>wet?3:0.9));busy=true;}else wet=wetGoal;
    filter.fabric.color.lerpColors(dryColor,wetColor,wet);filter.fabric.roughness=0.95-0.35*wet;
    if(stream.update(dt,time))busy=true;
    air.set(airGoal);if(air.update(dt,time))busy=true;
    let source=null;
    if(dripping&&wet>0.3){
     const part=stage.parts.filter,g=part.group;g.updateMatrixWorld(true);base.set(0,-depth,0).applyMatrix4(g.matrixWorld);
     source={at:[base.x,base.y,base.z],spread:SHAPE[kind].rim*0.55,floor:part.place==='sink'&&!part.held?SINK_FLOOR:(part.place==='rack'&&!part.held?rack.trayY:0),rate:part.held?1.6:1};
    }
    if(drips.update(dt,source))busy=true;
    return busy;
   });
   return {apply(state,{instant=false}={}){
    stream.set(state.waterOn);
    dustGoal=state.rinsed?0:1;wetGoal=state.wet&&!state.dryingPreview?1:0;airGoal=state.dryingPreview&&!state.dryConfirmed&&state.filter==='rack'?1:0;
    dripping=state.wet&&!state.dryingPreview&&state.filter!=='tank';
    if(instant){dust=dustGoal;wet=wetGoal;}
   }};
  },
  script(frame,scripts){
   const shared=vacuumScript(scripts,anchorAt,frame,places);if(shared)return shared;
   const action=frame.actions[0],before=places(frame.from),after=places(frame.to);
   switch(action.type){
    case 'remove':case 'wash':case 'rack':case 'fit':return scripts.carry({part:'filter',from:anchorAt('filter',before.filter),to:anchorAt('filter',after.filter),hands:[{side:action.type==='fit'?'right':'left',attach:[0,0,0]}],lift:action.type==='rack'?0.08:0.14});
    case 'tap':return scripts.press({part:'tap',point:anchorAt('tap',before.tap),side:'left'});
    case 'inspect':return scripts.look({point:anchorAt('filter','tray'),side:'right',choice:'washable'});
    case 'dry':return scripts.effect({name:'dry',choice:'dry'});
    case 'confirm-dry':return scripts.look({point:anchorAt('filter','rack'),side:'right',choice:'dry'});
    default:throw new RangeError('No choreography for '+action.type);
   }
  }
 };
}
