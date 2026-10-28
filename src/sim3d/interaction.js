// Turns pointers (a tracked hand's pinch point and fingertip, or the mouse) into picking up, carrying, pressing and dropping,
// for any task. Everything is judged on screen, so webcam depth noise never decides what you touch. The task's rules say which
// parts can be used and what a drop or press means; the shared reducer decides whether the action is allowed.
//
// rules (from the task):
//   carry, press                       part ids that are carried / pressed
//   canGrab(state, id)                 whether the part can be used now
//   pressAction(state, id)             action for a press
//   release(state, id, ctx)            action for letting go, or null. ctx: {inZone(zone), pulled} (pulled: metres moved on screen)
//   targetPart(state), targetZone(state), label(id), zoneLabel(zone)
//   carryDepth                         depth (z) carried parts ride at, default 0.16
// world (from the scene):
//   anchorScreen(part) -> {nx, ny, z}  grip anchor in normalised screen coordinates, plus its world depth
//   anchorWorld(part)  -> [x, y, z]
//   pointAt(nx, ny, z) -> [x, y, z]    where the camera ray through (nx, ny) meets the plane at depth z
//   halfExtents(z)     -> {w, h}       half the visible width/height in metres at depth z
//   zoneRect(zone)     -> {x0, x1, y0, y1} the zone's outline on screen (normalised), zoneDepth(zone) -> z
//   hold(part, [x,y,z] | null)
export const GRAB_RADIUS=0.13,PRESS_RADIUS=0.075,DWELL=0.32,LOST_GRACE=0.3,RELEASE_AFTER=0.12,SAMPLES=2,SETTLE=0.35,COOLDOWN=0.7;

export function createInteraction({rules,world,getState,dispatch,onHint=()=>{},onEvent=()=>{}}){
 const CARRY=rules.carry,PRESS=rules.press,carryDepth=rules.carryDepth??0.16;
 const holds=new Map();            // pointer id -> {part, z0, age, start, last, depth}
 const lost=new Map();             // pointer id -> {time, from}: how long and since which tracker result it has been missing
 const open=new Map();             // pointer id -> {time, samples, seq}: how long and over how many results its pinch has been open
 const dwell={part:null,time:0},wasPinching=new Map();let cooldown=0,hintAt=-9,clock=0;
 const holders=part=>[...holds.entries()].filter(([,h])=>h.part===part).map(([id])=>id);
 const distance=(nx,ny,part)=>{const a=world.anchorScreen(part),e=world.halfExtents(a.z);return Math.hypot((nx-a.nx)*e.w,(ny-a.ny)*e.h);};
 const inRect=(r,nx,ny)=>Boolean(r)&&nx>=r.x0&&nx<=r.x1&&ny>=r.y0&&ny<=r.y1;
 function hint(message){if(message&&clock-hintAt>1.2){hintAt=clock;onHint(message);}}
 function nearest(nx,ny,parts,radius){let best=null,bestD=radius;for(const part of parts){const d=distance(nx,ny,part);if(d<bestD){best=part;bestD=d;}}return best;}
 function release(id){
  const hold=holds.get(id);if(!hold)return;holds.delete(id);
  if(holders(hold.part).length)return;                                     // another hand still has it
  const state=getState(),a=world.anchorScreen(hold.part),e=world.halfExtents(hold.z0);
  const ctx={inZone:zone=>inRect(world.zoneRect(zone),a.nx,a.ny),pulled:Math.hypot((hold.last.nx-hold.start.nx)*e.w,(hold.last.ny-hold.start.ny)*e.h)};
  const action=rules.release(state,hold.part,ctx);
  world.hold(hold.part,null);
  if(action){const out=dispatch(action);onEvent({type:'action',part:hold.part,action,blocked:out.blocked});if(out.blocked)hint(out.message);}
  else{
   onEvent({type:'dropped',part:hold.part});const zone=rules.targetZone(state);
   hint(rules.missHint?.(state,hold.part,ctx)??(zone&&rules.targetPart(state)===hold.part?`Not quite — put ${rules.label(hold.part)} ${rules.zoneLabel(zone)}.`:'That is not needed right now. It goes back.'));
  }
 }
 function press(state,part){cooldown=COOLDOWN;const action=rules.pressAction(state,part);if(!action)return;const out=dispatch(action);onEvent({type:'action',part,action,blocked:out.blocked});if(out.blocked)hint(out.message);}
 return {
  // pointers: [{id, nx, ny, pinch, tipNx, tipNy, seq?, dwell?, crisp?}] — call every frame with whatever is currently tracked.
  // A mouse passes dwell:false (it presses by clicking) and crisp:true (its button is exact, so no release debounce).
  // tick: the tracker's result counter (omit it for a mouse); hands are judged by results as well as time.
  update(dt,pointers,tick){
   clock+=dt;cooldown=Math.max(0,cooldown-dt);
   const seen=new Set(pointers.map(p=>p.id)),state=getState(),report={hover:{},held:[],dwell:null,target:null};
   for(const id of holds.keys())if(!seen.has(id)){const gone=lost.get(id)||{time:0,from:tick};gone.time+=dt;lost.set(id,gone);if(gone.time>LOST_GRACE&&(tick===undefined||tick-gone.from>=SAMPLES)){release(id);lost.delete(id);}}
   const carryable=CARRY.filter(part=>canUse(state,part)),pressable=PRESS.filter(part=>canUse(state,part));
   for(const p of pointers){
    lost.delete(p.id);const holding=holds.get(p.id),was=wasPinching.get(p.id)||false;
    const candidate=nearest(p.nx,p.ny,carryable,GRAB_RADIUS);report.hover[p.id]=candidate||nearest(p.nx,p.ny,[...carryable,...pressable],PRESS_RADIUS);
    if(p.pinch&&!holding){
     if(candidate){const z0=world.anchorScreen(candidate).z;holds.set(p.id,{part:candidate,z0,depth:z0,age:0,start:{nx:p.nx,ny:p.ny},last:{nx:p.nx,ny:p.ny}});onEvent({type:'grab',part:candidate});}
     else if(!was){
      const target=nearest(p.nx,p.ny,pressable,PRESS_RADIUS);
      if(target&&cooldown===0)press(state,target);
      else{const wrong=nearest(p.nx,p.ny,[...CARRY,...PRESS].filter(part=>!canUse(state,part)),GRAB_RADIUS);if(wrong){const next=rules.targetPart(state);hint(next?`Not yet — first use ${rules.label(next)}.`:'The sequence is complete.');}}
     }
    }
    if(!p.pinch&&holding){
     // a tracked pinch flickers for a frame or two; only a hand that stays open over a few results lets go
     if(p.crisp)release(p.id);
     else{const gap=open.get(p.id)||{time:0,samples:0,seq:undefined};gap.time+=dt;if(p.seq===undefined||p.seq!==gap.seq){gap.samples++;gap.seq=p.seq;}open.set(p.id,gap);if(gap.time>=RELEASE_AFTER&&gap.samples>=SAMPLES){open.delete(p.id);release(p.id);}}
    }else open.delete(p.id);
    wasPinching.set(p.id,p.pinch);
    // pressing with a fingertip: rest it on the target for a moment
    if(!p.pinch&&p.dwell!==false&&!holds.has(p.id)&&cooldown===0){
     const tip=p.tipNx===undefined?[p.nx,p.ny]:[p.tipNx,p.tipNy],target=nearest(tip[0],tip[1],pressable,PRESS_RADIUS);
     if(target){if(dwell.part!==target){dwell.part=target;dwell.time=0;}dwell.time+=dt;report.dwell={part:target,progress:Math.min(1,dwell.time/DWELL)};
      if(dwell.time>=DWELL){dwell.part=null;dwell.time=0;press(state,target);}}
     else if(dwell.part){dwell.part=null;dwell.time=0;}
    }
   }
   // move whatever is held: the part rides under the fingers; over its destination it sinks to the destination's depth
   const zone=rules.targetZone(state),rect=zone?world.zoneRect(zone):null,zoneZ=zone?world.zoneDepth(zone):null;
   const byPart=new Map();for(const [id,hold] of holds){hold.age+=dt;const p=pointers.find(q=>q.id===id);if(!p)continue;hold.last.nx=p.nx;hold.last.ny=p.ny;(byPart.get(hold.part)||byPart.set(hold.part,[]).get(hold.part)).push({p,hold});}
   for(const [part,list] of byPart){
    const nx=list.reduce((s,{p})=>s+p.nx,0)/list.length,ny=list.reduce((s,{p})=>s+p.ny,0)/list.length,hold=list[0].hold;
    const over=rect&&rules.targetPart(state)===part&&inRect(rect,nx,ny);report.target=over?zone:report.target;
    const ease=Math.min(1,hold.age/SETTLE),k=ease*ease*(3-2*ease),carry=hold.z0+((rules.partDepth?.(part)??carryDepth)-hold.z0)*k;
    hold.depth+=((over&&zoneZ!==null?zoneZ:carry)-hold.depth)*Math.min(1,dt*9);
    world.hold(part,world.pointAt(nx,ny,hold.depth));report.held.push({part,hands:list.length});
   }
   return report;
  },
  // Forget everything (mode change, reset, teardown): parts return to their resting places.
  cancel(){for(const hold of holds.values())world.hold(hold.part,null);holds.clear();lost.clear();open.clear();wasPinching.clear();dwell.part=null;dwell.time=0;},
  get holding(){return [...holds.values()].map(h=>h.part);}
 };
 function canUse(state,part){return rules.canGrab(state,part);}
}
