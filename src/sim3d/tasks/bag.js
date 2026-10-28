import {pose} from '../parts.js';
import {buildTray,buildBin,buildShelf,buildTapeRoll,buildDustBag} from '../models.js';
import {vacuumParts,anchorsOf,headZones,headRings,CLIPS,clipAction,clipUsable,PART_LABELS,UNPLUG_DISTANCE,buildVacuumScene,vacuumScript} from './vacuum.js';

// Change the dust bag: unplug, open both clips, park the head on the stool, lift the used bag onto the tray, seal it,
// bin it, fit the clean bag from the shelf, return the head and lock the clips.
const REST=[0.5,0.47,-0.02],SOCKET=[-0.7,0.27];
const PLACE={inTank:[0,0.385,0],tray:[-0.52,0.05,-0.03],bin:[0.78,0.27,0.14],shelf:[-0.58,0.8,-0.4],tape:[-0.3,0.05,0.3]};
const bagPlaces={tank:pose(PLACE.inTank),shelf:pose(PLACE.shelf,[0,0.22,0]),tray:pose(PLACE.tray,[-Math.PI/2+0.08,0.35,0]),bin:pose(PLACE.bin,[0,0.5,0.08],0.7)};
export const PARTS={...vacuumParts({rest:REST,socket:SOCKET}),used:{anchor:[0,-0.004,0],places:bagPlaces},fresh:{anchor:[0,-0.004,0],places:bagPlaces},tape:{anchor:[0,0,0],places:{rest:pose(PLACE.tape)}}};
export const anchorAt=anchorsOf(PARTS);
export const ZONES={...headZones(REST),tray:{min:[-0.74,0.02,-0.06],max:[-0.3,0.3,0.3]},bin:{min:[0.64,0,0.0],max:[0.92,0.42,0.28]},machine:{min:[-0.19,0.3,-0.19],max:[0.19,0.6,0.19]}};
export const RINGS={...headRings(REST),machine:{x:0,y:0.408,z:0,rx:0.2,rz:0.2},tray:{x:-0.52,y:0.036,z:0.12,rx:0.22,rz:0.17},bin:{x:PLACE.bin[0],y:0.326,z:PLACE.bin[2],rx:0.15,rz:0.15}};
export const FOCUS={plug:{c:[-0.32,0.3],w:0.7,h:0.46},clips:{c:[0,0.36],w:0.5,h:0.4},stool:{c:[0.28,0.42],w:0.54,h:0.46},tray:{c:[-0.28,0.28],w:0.52,h:0.44},tape:{c:[-0.38,0.18],w:0.44,h:0.38},bin:{c:[0.12,0.27],w:1.0,h:0.46},shelf:{c:[-0.3,0.55],w:0.56,h:0.5},seat:{c:[0.28,0.5],w:0.56,h:0.46}};
const FOCUS_OF_PHASE={isolate:'plug',release:'clips',secure:'clips',open:'stool',remove:'tray',seal:'tape',dispose:'bin',fit:'shelf',close:'seat'};
export const STEPS=[['isolate','Switch off & unplug'],['release','Release both clips'],['open','Lift head to its rest'],['remove','Lift bag to the tray'],['seal','Seal the used bag'],['dispose','Put sealed bag in bin'],['fit','Fit the clean bag'],['close','Return the head'],['secure','Secure both clips']];
const LABELS={...PART_LABELS,used:'the used bag',fresh:'the clean bag',tape:'the sealing tape'};
const ZONE_LABELS={rest:'on the stool',tray:'on the tray',bin:'in the bin',machine:'into the machine',head:'back on the machine'};

export function targetPart(state){
 if(state.complete)return null;
 return ({isolate:'plug',open:'head',close:'head',remove:'used',dispose:'used',seal:'tape',fit:'fresh'})[state.phase]??(state.phase==='release'?(state.clips.left?'clipLeft':'clipRight'):state.phase==='secure'?(!state.clips.left?'clipLeft':'clipRight'):null);
}
export const targetZone=state=>state.complete?null:({open:'rest',remove:'tray',dispose:'bin',fit:'machine',close:'head'})[state.phase]??null;
export function canGrab(state,id){
 if(state.complete)return false;const phase=state.phase;
 switch(id){
  case 'plug':return phase==='isolate';
  case 'clipLeft':case 'clipRight':return clipUsable(state,id);
  case 'head':return phase==='open'||phase==='close';
  case 'used':return phase==='remove'||phase==='dispose';
  case 'fresh':return phase==='fit';
  case 'tape':return phase==='seal';
  default:return false;
 }
}
export const pressAction=(state,id)=>id==='tape'?{type:'seal'}:clipAction(state,id);
export function releaseAction(state,id,ctx){
 if(id==='plug')return state.phase==='isolate'&&ctx.pulled>=UNPLUG_DISTANCE?{type:'isolate'}:null;
 if(id==='head'&&state.phase==='open'&&ctx.inZone('rest'))return {type:'open'};
 if(id==='head'&&state.phase==='close'&&ctx.inZone('head'))return {type:'close'};
 if(id==='used'&&state.phase==='remove'&&ctx.inZone('tray'))return {type:'remove'};
 if(id==='used'&&state.phase==='dispose'&&ctx.inZone('bin'))return {type:'dispose',item:'used'};
 if(id==='fresh'&&state.phase==='fit'&&ctx.inZone('machine'))return {type:'fit',item:'new'};
 return null;
}
export function places(state){
 return {plug:state.isolated?'out':'in',clipLeft:state.clips.left?'locked':'released',clipRight:state.clips.right?'locked':'released',head:state.headOpen?'rest':'seated',
  used:state.usedBag==='disposed'?'bin':state.usedBag==='fitted'?'tank':'tray',fresh:state.newBag==='fitted'?'tank':'shelf',tape:'rest'};
}
const COPY={
 isolate:['Switch off and unplug first.','Pull the plug out of the wall socket. Never open real equipment while it is connected.'],
 release:['Release both retaining clips.','Press each clip on the side of the tank. Both must be open before the head can be lifted.'],
 open:['Lift the head onto the stool.','Hold the head by its handle and carry it to the stool. Let go over the amber ring.'],
 remove:['Lift the used bag out.','The training bag is 80% full. Lift it out of the tank and put it on the tray.'],
 seal:['Seal the bag opening.','Press the tape roll beside the tray so the dust stays inside the bag.'],
 dispose:['Put the sealed bag in the bin.','Carry the sealed bag to the green bin and let go over it.'],
 fit:['Fit the clean bag.','Take the clean bag from the shelf and lower it into the open tank.'],
 close:['Return the head.','Carry the head from the stool back onto the tank.'],
 secure:['Secure both clips.','Press both clips closed. The machine stays unplugged at the end of this practice.'],
 done:['Dust bag changed.','The used bag is sealed and binned, the clean bag is fitted, the head is clipped on and the power stays isolated.']
};
export const task={
 kind:'bag',
 title:machine=>machine==='junior-429'?'Change dry dust bag':'Change the dust bag',
 steps:()=>STEPS,
 places,anchorAt,ZONES,RINGS,FOCUS,
 focusFor:state=>state.complete?'wide':FOCUS_OF_PHASE[state.phase]??'wide',
 rules:{carry:['plug','head','used','fresh'],press:[...CLIPS,'tape'],canGrab,pressAction,release:releaseAction,targetPart,targetZone,
  label:id=>LABELS[id],zoneLabel:zone=>ZONE_LABELS[zone],partDepth:id=>id==='plug'?-0.28:undefined,
  missHint:(state,id)=>id==='plug'&&state.phase==='isolate'?'Pull the plug further out of the wall socket.':undefined},
 instructions:state=>COPY[state.complete?'done':state.phase]??COPY.isolate,
 choices:()=>[],
 sources:'<strong>Scenario limit.</strong> The 70% trigger was supplied for this training exercise; it is not a verified Junior 103 service limit. The correct manual, fitted collection system and site waste procedure take precedence.',
 build(stage,{label}){
  const {kit}=stage;buildVacuumScene(stage,{label,table:PARTS,rest:REST,socket:SOCKET});
  buildTray(kit,{position:[-0.52,0,0.12]});stage.blob(-0.52,0.12,0.62,0.5);
  buildBin(kit,{position:PLACE.bin});stage.blob(PLACE.bin[0],PLACE.bin[2],0.4);
  buildShelf(kit,{position:[-0.58,0.485,-0.46]});
  const tape=buildTapeRoll(kit),used=buildDustBag(kit,{used:true}),fresh=buildDustBag(kit,{used:false});
  stage.addPart('used',{group:used.group,materials:used.materials,places:PARTS.used.places,anchor:PARTS.used.anchor,shadow:0.3,initial:'tank'});
  stage.addPart('fresh',{group:fresh.group,materials:fresh.materials,places:PARTS.fresh.places,anchor:PARTS.fresh.anchor,shadow:0.3,initial:'shelf'});
  stage.addPart('tape',{group:tape.group,materials:tape.materials,places:PARTS.tape.places,anchor:PARTS.tape.anchor});
  // the tape strip wraps the bag's opening once it is sealed
  let sealed=false;
  stage.addUpdater(dt=>{const seal=used.seal,want=sealed?1:0;if(Math.abs(seal.scale.x-want)<0.002){seal.scale.x=sealed?1:0.001;seal.visible=sealed;return false;}seal.scale.x+=((want||0.001)-seal.scale.x)*Math.min(1,dt*9);seal.visible=seal.scale.x>0.01;return true;});
  return {apply(state){sealed=state.usedBag==='sealed'||state.usedBag==='disposed';}};
 },
 script(frame,scripts){
  const shared=vacuumScript(scripts,anchorAt,frame,places);if(shared)return shared;
  const action=frame.actions[0],before=places(frame.from),after=places(frame.to);
  switch(action.type){
   case 'remove':case 'dispose':return scripts.carry({part:'used',from:anchorAt('used',before.used),to:anchorAt('used',after.used),hands:[{side:'right',attach:[0,0,0]}]});
   case 'fit':return scripts.carry({part:'fresh',from:anchorAt('fresh',before.fresh),to:anchorAt('fresh',after.fresh),hands:[{side:'right',attach:[0,0,0]}]});
   case 'seal':return scripts.press({part:'tape',point:anchorAt('tape','rest'),side:'right'});
   default:throw new RangeError('No choreography for '+action.type);
  }
 }
};
