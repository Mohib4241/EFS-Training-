import * as THREE from 'three';
import {anchorPoint,pose} from '../parts.js';
import {buildVacuum,buildPlug,buildSocket,buildCable,buildStool,PLUG} from '../models.js';

// What the vacuum-based tasks share: the machine with its head and retaining clips, the mains plug in a wall socket,
// and the stool the head is parked on. Positions are metres on the shared stage (the machine stands at the origin).
export const TANK={radius:0.185,height:0.4};
export const UNPLUG_DISTANCE=0.2;          // metres the plug must be pulled, measured on screen at the socket's depth
const WALL_PLUG_Z=-0.723;                  // plug centre when its pins are in a socket on the wall
export function vacuumParts({rest=[0.5,0.47,-0.02],socket=[-0.7,0.27],plugOut=pose([-0.36,0.016,-0.2],[Math.PI/2-0.15,0.6,0])}={}){
 return {
  head:{anchor:[0,0.22,0],places:{seated:pose([0,0.4,0]),rest:pose(rest,[0,0.18,0])}},
  clipLeft:{anchor:[0,0.07,0.004],places:{locked:pose([-TANK.radius-0.02,0.378,0]),released:pose([-TANK.radius-0.02,0.378,0],[0,0,0.72])}},
  clipRight:{anchor:[0,0.07,0.004],places:{locked:pose([TANK.radius+0.02,0.378,0]),released:pose([TANK.radius+0.02,0.378,0],[0,0,-0.72])}},
  plug:{anchor:[0,0,0],places:{in:pose([socket[0],socket[1],WALL_PLUG_Z]),out:plugOut}}
 };
}
// anchorAt(table)(part, place): world grip point of a part resting at a place (pure, used by demos and tests).
export const anchorsOf=table=>(part,place)=>anchorPoint(table[part].anchor,table[part].places[place]);
// Zone boxes around the stool top and the tank top, for parking and returning the head.
export const headZones=rest=>({rest:{min:[rest[0]-0.2,rest[1]-0.01,rest[2]-0.2],max:[rest[0]+0.2,rest[1]+0.28,rest[2]+0.18]},head:{min:[-0.22,0.4,-0.2],max:[0.22,0.75,0.2]}});
export const headRings=rest=>({rest:{x:rest[0],y:rest[1]+0.004,z:rest[2],rx:0.21,rz:0.21},head:{x:0,y:0.408,z:0,rx:0.215,rz:0.215}});
export const CLIPS=['clipLeft','clipRight'];
// Pressing a clip: release it while releasing, lock it while securing.
export const clipAction=(state,id)=>({type:state.phase==='secure'?'secure':'unclip',clip:id==='clipLeft'?'left':'right'});
export const clipUsable=(state,id)=>{const side=id==='clipLeft'?'left':'right';return state.phase==='release'&&state.clips[side]||state.phase==='secure'&&!state.clips[side];};
export const PART_LABELS={plug:'the plug',head:'the motor head',clipLeft:'the left clip',clipRight:'the right clip'};

// Builds the machine, plug, socket, lead and stool and registers the movable parts on the stage.
export function buildVacuumScene(stage,{label,table,rest,socket}){
 const {kit}=stage,machine=buildVacuum(kit,{label});
 stage.blob(0,0,0.78);
 buildStool(kit,{position:rest});stage.blob(rest[0],rest[2],0.5);
 buildSocket(kit,{position:[socket[0],socket[1],-0.744]});
 const plug=buildPlug(kit,{heatMark:false});
 const cable=buildCable(kit,{start:[0,0.2,-0.185]});
 stage.addPart('head',{group:machine.head,materials:machine.materials.head,places:table.head.places,anchor:table.head.anchor,shadow:0.46,initial:'seated'});
 stage.addPart('clipLeft',{group:machine.clips.left,materials:machine.materials.clip,places:table.clipLeft.places,anchor:table.clipLeft.anchor,initial:'locked'});
 stage.addPart('clipRight',{group:machine.clips.right,materials:machine.materials.clip,places:table.clipRight.places,anchor:table.clipRight.anchor,initial:'locked'});
 stage.addPart('plug',{group:plug.plug,materials:plug.materials,places:table.plug.places,anchor:table.plug.anchor,shadow:0.12,initial:'in'});
 const grip=new THREE.Vector3();
 stage.addUpdater(()=>{const g=stage.parts.plug.group;g.updateMatrixWorld(true);cable.update(grip.set(...PLUG.grip).applyMatrix4(g.matrixWorld));return false;});
 return {machine,plug};
}
// Demo choreography shared by the vacuum tasks.
export function vacuumScript(scripts,anchorAt,frame,places){
 const action=frame.actions[0],before=places(frame.from),after=places(frame.to);
 switch(action.type){
  case 'isolate':return scripts.carry({part:'plug',from:anchorAt('plug',before.plug),to:anchorAt('plug',after.plug),hands:[{side:'right',attach:[0,0,0]}],lift:0.03,straight:true});
  case 'unclip':return scripts.press({part:action.clip==='left'?'clipLeft':'clipRight',point:anchorAt(action.clip==='left'?'clipLeft':'clipRight','locked'),side:action.clip==='left'?'left':'right'});
  case 'secure':return scripts.press({part:action.clip==='left'?'clipLeft':'clipRight',point:anchorAt(action.clip==='left'?'clipLeft':'clipRight','released'),side:action.clip==='left'?'left':'right'});
  case 'open':case 'close':return scripts.carry({part:'head',from:anchorAt('head',before.head),to:anchorAt('head',after.head),pose:'grip',hands:[{side:'left',attach:[-0.17,-0.14,0.01]},{side:'right',attach:[0.17,-0.14,0.01]}],lift:0.12});
  default:return null;
 }
}
