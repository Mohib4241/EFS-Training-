import {createPinchTracker,createClosedTracker} from '../sim3d/tracking-math.js';

// Hand gestures for the equipment pages, in mirror view (your right hand is on the right of the screen). Pure: it takes the
// smoothed hands the tracker produces and returns what to do; nothing here touches the camera, the DOM or three.js.
//   two open hands apart / together   -> open / close the machine (open = start + distance change * SPREAD_GAIN)
//   thumb-index pinch and drag        -> orbit
//   a quick pinch                     -> a click at that spot
//   fist, then open hand              -> open fully      (the fist is held first)
//   open hand, then fist              -> close           (the open hand is held first)
//   a sideways palm flick             -> next machine (right to left) or the previous one (left to right)
export const SPREAD_GAIN=70;              // percent of opening per screen-width-half (NDC unit) the hands move apart
export const CLICK={maxSeconds:.35,maxTravel:.07};
export const DWELL=.6;                    // seconds a posture is held before the opposite posture counts as a gesture
export const FLICK={window:.28,travel:.8,sideways:.35,rest:1.2};

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));

export function createGestures({getOpen=()=>0}={}){
 const slots={L:null,R:null};
 const blank=()=>({pinch:createPinchTracker(),closed:createClosedTracker(),posture:'open',since:0,pinching:false,pinchStart:null,pinchAt:0,travel:0,dragging:false,last:null,trail:[]});
 let spread=null,restUntil=0,triggerUntil=0;

 function update(hands,t){
  const actions=[],seen=new Set();
  for(const h of hands){
   const created=!slots[h.id],s=slots[h.id]??=blank();seen.add(h.id);
   const fist=s.closed.update(h.closedRatio),pinch=!fist&&s.pinch.update(h.pinchRatio),posture=fist?'fist':pinch?'pinch':'open';
   h.fist=fist;h.pinch=pinch;h.posture=posture;
   if(created){s.posture=posture;s.since=t;continue;}
   if(posture!==s.posture&&s.posture!=='pinch'&&posture!=='pinch'){
    // a fist-to-open or open-to-fist change counts when the first posture was held, and not again straight away
    const held=t-s.since>=DWELL&&t>=triggerUntil;
    if(held&&posture==='fist')actions.push({type:'open',value:0,why:'open hand, then fist'});
    if(held&&posture==='open')actions.push({type:'open',value:100,why:'fist, then open hand'});
    if(held)triggerUntil=t+1;
   }
   if(posture!==s.posture)s.since=t;
   s.posture=posture;
  }
  for(const id of ['L','R'])if(!seen.has(id)&&slots[id]){if(slots[id].pinching)actions.push(...endPinch(slots[id],t,false));slots[id]=null;}

  const present=hands.filter(h=>slots[h.id]);
  const open=present.filter(h=>h.posture==='open');
  let mode='idle',pointer=null,tether=null;

  // two open hands: the distance between the palms sets the opening
  if(open.length===2&&present.length===2){
   const d=dist(open[0].palmNdc,open[1].palmNdc),now=getOpen();
   if(!spread)spread={d,open:now};
   const value=clamp(spread.open+(d-spread.d)*SPREAD_GAIN,0,100);
   mode='spread';tether={from:open[0].palmNdc,to:open[1].palmNdc,value};
   actions.push({type:'open',value,why:'hands apart or together',continuous:true});
   for(const h of present)resetTrail(slots[h.id]);
  }else{
   spread=null;
   for(const h of present){
    const s=slots[h.id];
    if(h.posture==='pinch'){
     if(!s.pinching){s.pinching=true;s.pinchStart=[...h.pinchNdc];s.pinchAt=t;s.travel=0;s.dragging=false;s.last=[...h.pinchNdc];}
     else{
      const dx=h.pinchNdc[0]-s.last[0],dy=h.pinchNdc[1]-s.last[1];s.travel=dist(h.pinchNdc,s.pinchStart);
      if(s.travel>CLICK.maxTravel)s.dragging=true;
      if(s.dragging){actions.push({type:'orbit',dx,dy});mode='orbit';}
      s.last=[...h.pinchNdc];
     }
     pointer={ndc:h.pinchNdc,hand:h,pinching:true};
    }else{
     if(s.pinching)actions.push(...endPinch(s,t,true));
     if(!pointer)pointer={ndc:h.tipNdc,hand:h,pinching:false};
    }
    // sideways palm flick: only an open, lone hand, and not straight after another gesture
    if(h.posture==='open'&&present.length===1&&t>=restUntil){
     s.trail.push({t,x:h.palmNdc[0],y:h.palmNdc[1]});while(s.trail.length&&t-s.trail[0].t>FLICK.window)s.trail.shift();
     const a=s.trail[0],b=s.trail.at(-1);
     if(a&&b&&b.t-a.t>.08&&Math.abs(b.x-a.x)>=FLICK.travel&&Math.abs(b.y-a.y)<=FLICK.sideways){actions.push({type:'machine',direction:b.x<a.x?1:-1});restUntil=t+FLICK.rest;s.trail.length=0;}
    }else resetTrail(s);
   }
   if(mode==='idle'&&pointer)mode=pointer.pinching?'pinch':'point';
  }
  return {actions,mode,pointer,tether,hands:present};
 }
 function resetTrail(s){s.trail.length=0;}
 // A pinch that was short and barely moved is a click; a drag already orbited.
 function endPinch(s,t,visible){
  const out=[];
  if(visible&&!s.dragging&&t-s.pinchAt<=CLICK.maxSeconds&&s.travel<=CLICK.maxTravel)out.push({type:'click',ndc:[...s.pinchStart]});
  s.pinching=false;s.dragging=false;return out;
 }
 return {update,reset(){slots.L=slots.R=null;spread=null;restUntil=0;triggerUntil=0;}};
}

// Where a screen position (NDC, y up) lands in a stage element, in client pixels.
export const ndcToClient=(ndc,rect)=>({x:rect.left+(ndc[0]*.5+.5)*rect.width,y:rect.top+(-ndc[1]*.5+.5)*rect.height});
