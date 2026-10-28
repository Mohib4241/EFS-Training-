import {canGrab,isPress,pressAction,dropAction,targetPart,targetZone,UNPLUG_DISTANCE} from './bag-task.js';
import {PLACE} from './layout.js';

// Turns pointers (a tracked hand's pinch point and fingertip, or the mouse) into picking up, carrying, pressing and dropping.
// Everything happens in screen space, so webcam depth noise never decides what you touch. The reducer from the 2D module
// decides what each action means; this layer only reports what the learner did.
//
// `world` is supplied by the scene:
//   anchorScreen(part) -> {nx, ny, z}   grip anchor of a part in normalised screen coordinates, plus its world depth
//   anchorWorld(part)  -> [x, y, z]
//   pointAt(nx, ny, z) -> [x, y, z]     where the camera ray through (nx, ny) meets the plane at depth z
//   halfExtents(z)     -> {w, h}        half the visible width/height in metres at depth z
//   hold(part, [x,y,z] | null)
const CARRY=['plug','head','used','fresh'],PRESS=['clipLeft','clipRight','tape'];
export const GRAB_RADIUS=0.13,PRESS_RADIUS=0.075,DWELL=0.32,LOST_GRACE=0.3,RELEASE_AFTER=0.12,SAMPLES=2,SETTLE=0.35,COOLDOWN=0.7;
const PART_LABEL={plug:'the plug',head:'the motor head',used:'the used bag',fresh:'the clean bag',clipLeft:'the left clip',clipRight:'the right clip',tape:'the sealing tape'};
const ZONE_LABEL={rest:'on the stool',tray:'on the tray',bin:'in the bin',machine:'into the machine',head:'back on the machine'};
export const labelOf=part=>PART_LABEL[part];

export function createInteraction({world,getState,dispatch,onHint=()=>{},onEvent=()=>{}}){
 const holds=new Map();            // pointer id -> {part, z0, age}
 const lost=new Map();             // pointer id -> seconds since last seen
 const open=new Map();            // pointer id -> {time, samples, seq}: how long and over how many tracker results its pinch has been open while it holds something
 const dwell={part:null,time:0},wasPinching=new Map();let cooldown=0,hintAt=-9,clock=0;
 const holders=part=>[...holds.entries()].filter(([,h])=>h.part===part).map(([id])=>id);
 const distance=(nx,ny,part)=>{const a=world.anchorScreen(part),e=world.halfExtents(a.z);return Math.hypot((nx-a.nx)*e.w,(ny-a.ny)*e.h);};
 function hint(message){if(clock-hintAt>1.2){hintAt=clock;onHint(message);}}
 function nearest(nx,ny,parts,radius){let best=null,bestD=radius;for(const part of parts){const d=distance(nx,ny,part);if(d<bestD){best=part;bestD=d;}}return best;}
 function release(id){
  const hold=holds.get(id);if(!hold)return;holds.delete(id);
  const others=holders(hold.part);if(others.length)return;               // another hand still has it
  const state=getState(),anchor=world.anchorWorld(hold.part);let action=null;
  if(hold.part==='plug'){const e=world.halfExtents(PLACE.plugIn[2]),d=Math.hypot((hold.last.nx-hold.start.nx)*e.w,(hold.last.ny-hold.start.ny)*e.h);action=d>=UNPLUG_DISTANCE?{type:'isolate'}:null;}
  else action=dropAction(state,hold.part,anchor[0],anchor[1]);
  world.hold(hold.part,null);
  if(action){const out=dispatch(action);onEvent({type:'action',part:hold.part,action,blocked:out.blocked});if(out.blocked)hint(out.message);}
  else{onEvent({type:'dropped',part:hold.part});const zone=targetZone(state);hint(hold.part==='plug'?'Pull the plug further out of the wall socket.':zone&&targetPart(state)===hold.part?`Not quite — put ${PART_LABEL[hold.part]} ${ZONE_LABEL[zone]}.`:'That is not needed right now. It goes back.');}
 }
 return {
  // pointers: [{id, nx, ny, pinch, tipNx, tipNy, dwell?, crisp?}] — call every frame with whatever is currently tracked.
  // A mouse presses by clicking, so it passes dwell:false and crisp:true (no release debounce); a hand or fingertip presses by resting on the target.
  // tick: the tracker's result counter (omit it for a mouse). Hands are judged by results as well as by time, so a slow device never mistakes one stale reading for a decision.
  update(dt,pointers,tick){
   clock+=dt;cooldown=Math.max(0,cooldown-dt);
   const seen=new Set(pointers.map(p=>p.id)),state=getState(),report={hover:{},held:[],dwell:null};
   for(const id of holds.keys())if(!seen.has(id)){const gone=lost.get(id)||{time:0,from:tick};gone.time+=dt;lost.set(id,gone);if(gone.time>LOST_GRACE&&(tick===undefined||tick-gone.from>=SAMPLES)){release(id);lost.delete(id);}}
   for(const p of pointers){
    lost.delete(p.id);const holding=holds.get(p.id),was=wasPinching.get(p.id)||false;
    const candidate=nearest(p.nx,p.ny,CARRY.filter(part=>canGrab(state,part)),GRAB_RADIUS);report.hover[p.id]=candidate||nearest(p.nx,p.ny,[...CARRY,...PRESS].filter(part=>canGrab(state,part)),PRESS_RADIUS);
    if(p.pinch&&!holding){
     if(candidate){const z0=world.anchorScreen(candidate).z;holds.set(p.id,{part:candidate,z0,age:0,start:{nx:p.nx,ny:p.ny},last:{nx:p.nx,ny:p.ny}});onEvent({type:'grab',part:candidate});}
     else if(!was){
      const pressTarget=nearest(p.nx,p.ny,PRESS.filter(part=>canGrab(state,part)),PRESS_RADIUS);
      if(pressTarget&&cooldown===0){cooldown=COOLDOWN;const out=dispatch(pressAction(state,pressTarget));onEvent({type:'action',part:pressTarget,action:pressAction(state,pressTarget),blocked:out.blocked});if(out.blocked)hint(out.message);}
      else{const wrong=nearest(p.nx,p.ny,[...CARRY,...PRESS].filter(part=>!canGrab(state,part)),GRAB_RADIUS);if(wrong)hint(targetPart(state)?`Not yet — first use ${PART_LABEL[targetPart(state)]}.`:'The sequence is complete.');}
     }
    }
    // A tracked pinch flickers for a frame or two; only a hand that stays open over a few results lets go. A mouse button is exact (crisp).
    if(!p.pinch&&holding){
     if(p.crisp)release(p.id);
     else{const gap=open.get(p.id)||{time:0,samples:0,seq:undefined};gap.time+=dt;if(p.seq===undefined||p.seq!==gap.seq){gap.samples++;gap.seq=p.seq;}open.set(p.id,gap);if(gap.time>=RELEASE_AFTER&&gap.samples>=SAMPLES){open.delete(p.id);release(p.id);}}
    }else open.delete(p.id);
    wasPinching.set(p.id,p.pinch);
    // pressing with a fingertip: hold it on the target for a moment
    if(!p.pinch&&p.dwell!==false&&!holds.has(p.id)&&cooldown===0){
     const tip=p.tipNx===undefined?[p.nx,p.ny]:[p.tipNx,p.tipNy],target=nearest(tip[0],tip[1],PRESS.filter(part=>canGrab(state,part)),PRESS_RADIUS);
     if(target){if(dwell.part!==target){dwell.part=target;dwell.time=0;}dwell.time+=dt;report.dwell={part:target,progress:Math.min(1,dwell.time/DWELL)};
      if(dwell.time>=DWELL){cooldown=COOLDOWN;dwell.part=null;dwell.time=0;const action=pressAction(state,target),out=dispatch(action);onEvent({type:'action',part:target,action,blocked:out.blocked});if(out.blocked)hint(out.message);}}
     else if(dwell.part){dwell.part=null;dwell.time=0;}
    }
   }
   // move whatever is held: the part rides under the fingers, easing from its own depth to the carry depth
   const byPart=new Map();for(const [id,hold] of holds){hold.age+=dt;const p=pointers.find(q=>q.id===id);if(!p)continue;hold.last.nx=p.nx;hold.last.ny=p.ny;(byPart.get(hold.part)||byPart.set(hold.part,[]).get(hold.part)).push({p,hold});}
   for(const [part,list] of byPart){
    const nx=list.reduce((s,{p})=>s+p.nx,0)/list.length,ny=list.reduce((s,{p})=>s+p.ny,0)/list.length,hold=list[0].hold;
    const ease=Math.min(1,hold.age/SETTLE),k=ease*ease*(3-2*ease),z=hold.z0+(PLACE.carryZ-hold.z0)*(part==='plug'?0.5*k:k);
    world.hold(part,world.pointAt(nx,ny,z));report.held.push({part,hands:list.length});
   }
   return report;
  },
  // Forget everything (mode change, reset, teardown): parts return to their resting places.
  cancel(){for(const hold of holds.values())world.hold(hold.part,null);holds.clear();lost.clear();open.clear();wasPinching.clear();dwell.part=null;dwell.time=0;},
  get holding(){return [...holds.values()].map(h=>h.part);}
 };
}
