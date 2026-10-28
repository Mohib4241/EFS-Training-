import {inZone,FOCUS_OF_PHASE} from './layout.js';
// Pure rules for the hand-controlled dust-bag change. They mirror the 2D board exactly (same phases, same grab and drop
// conditions) and never mutate state: the shared reducer from the 2D module decides what an action does.
// The sealing step is pressed on the tape roll, so the part is called `tape` everywhere (the phase is still `seal`).
export const PARTS=['plug','clipLeft','clipRight','head','used','fresh','tape'];

// The part the learner should act on now, or null when finished.
export function targetPart(state){
 if(state.complete)return null;
 switch(state.phase){
  case 'isolate':return 'plug';
  case 'release':return state.clips.left?'clipLeft':'clipRight';
  case 'open':case 'close':return 'head';
  case 'remove':case 'dispose':return 'used';
  case 'seal':return 'tape';
  case 'fit':return 'fresh';
  case 'secure':return !state.clips.left?'clipLeft':'clipRight';
  default:return null;
 }
}
// Zone the active object must reach, or null when the step is a press rather than a move.
export function targetZone(state){
 return ({open:'rest',remove:'tray',dispose:'bin',fit:'machine',close:'head'})[state.phase]??null;
}
// Which framing the camera should hold for this state: the area the current step is about, or the whole room when finished.
export const focusFor=state=>state.complete?'wide':FOCUS_OF_PHASE[state.phase]??'wide';
// Which parts can be picked up or pressed in the current phase (same rule as the 2D board).
export function canGrab(state,id){
 if(state.complete)return false;
 const phase=state.phase;
 switch(id){
  case 'plug':return phase==='isolate';
  case 'clipLeft':return phase==='release'&&state.clips.left||phase==='secure'&&!state.clips.left;
  case 'clipRight':return phase==='release'&&state.clips.right||phase==='secure'&&!state.clips.right;
  case 'head':return phase==='open'||phase==='close';
  case 'used':return phase==='remove'||phase==='dispose';
  case 'fresh':return phase==='fit';
  case 'tape':return phase==='seal';
  default:return false;
 }
}
// Parts that are pressed (a fingertip held on them) instead of carried.
export const isPress=id=>id==='clipLeft'||id==='clipRight'||id==='tape';
// Action a pressed part performs.
export function pressAction(state,id){
 if(id==='tape')return {type:'seal'};
 const clip=id==='clipLeft'?'left':'right';
 return {type:state.phase==='secure'?'secure':'unclip',clip};
}
// Action produced by releasing a carried part at (x, y) on the interaction plane (same table as the 2D `bagDropAction`), or null.
// Only the zone the current step needs is tested, so zones that overlap (tank mouth and head seat) cannot be confused.
export function dropAction(state,id,x,y){
 if(id==='head'&&state.phase==='open'&&inZone('rest',x,y))return {type:'open'};
 if(id==='head'&&state.phase==='close'&&inZone('head',x,y))return {type:'close'};
 if(id==='used'&&state.phase==='remove'&&inZone('tray',x,y))return {type:'remove'};
 if(id==='used'&&state.phase==='dispose'&&inZone('bin',x,y))return {type:'dispose',item:'used'};
 if(id==='fresh'&&state.phase==='fit'&&inZone('machine',x,y))return {type:'fit',item:'new'};
 return null;
}
// Unplugging is a carry with a distance rule: pulled this far (in metres, measured on screen at the socket's depth, which is what
// the learner sees) counts as switched off and unplugged. A 3D distance would grow by itself as the held plug comes toward the viewer.
export const UNPLUG_DISTANCE=0.2;
// Where every part rests for a given practice state. The 3D view eases towards these; it never teleports a part.
export function restingPlaces(state){
 const used=state.usedBag==='disposed'?'bin':state.usedBag==='fitted'?'tank':'tray';
 return {
  plug:state.isolated?'out':'in',
  clipLeft:state.clips.left?'locked':'released',
  clipRight:state.clips.right?'locked':'released',
  head:state.headOpen?'rest':'seated',
  used,
  usedSealed:state.usedBag==='sealed'||state.usedBag==='disposed',
  fresh:state.newBag==='fitted'?'tank':'shelf',
  usedVisible:true
 };
}
