// Deterministic demonstrations for every task. The authored lesson frames give the order, timing and the state before and
// after each step; a task turns each frame into hand motions (a "script"). sampleDemo(demo, t) is a pure function of time,
// so any moment can be scrubbed to, backward or forward, and replays identically. Parts only move because a hand carries them.
export const DEMO_SCALE=1.4;                 // lesson frames are short; the hands need time to arrive, act and leave
const HAND_PACE=1250;                        // milliseconds per metre carried: a calm, readable pace
export const CAMERA_MS=900;
export const smoother=t=>t*t*t*(t*(t*6-15)+10);
export const clamp01=t=>Math.min(1,Math.max(0,t));
const lerp=(a,b,t)=>a+(b-a)*t;
export const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// Hands come in from below the frame, a little toward the viewer, on their own side.
export const offscreen=(side,near)=>[near[0]+(side==='left'?-0.26:0.26),near[1]-0.42,near[2]+0.24];
// Catmull-Rom through waypoints, parameterised by distance travelled so the hand moves at an even pace for t in 0..1.
export function spline(points,t){
 const n=points.length-1,cumulative=[0];for(let i=1;i<=n;i++)cumulative.push(cumulative[i-1]+Math.max(1e-6,distance(points[i-1],points[i])));
 const target=clamp01(t)*cumulative[n];let i=0;while(i<n-1&&target>cumulative[i+1])i++;
 const u=(target-cumulative[i])/(cumulative[i+1]-cumulative[i]);
 const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(n,i+2)];
 return [0,1,2].map(k=>0.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));
}
function pathLength(points){let sum=0,last=points[0];for(let i=1;i<=80;i++){const next=spline(points,i/80);sum+=distance(last,next);last=next;}return sum;}

// ---- script builders handed to tasks ----
export const scripts={
 // Carry a part from one point to another: rise toward the viewer, arc over, settle. hands: [{side, attach:[dx,dy,dz]}]
 carry({part,from,to,hands,pose='pinch',lift=0.14,depth=0.16,straight=false}){
  const a=from,b=to,mix=lerp3(a,b,0.5),z=(p,q,t)=>straight?lerp(p,q,t):lerp(p,depth,t);
  const path=[a,[a[0],a[1]+lift*0.5,z(a[2],b[2],0.5)],[mix[0],Math.max(a[1],b[1])+lift,straight?mix[2]:depth],[b[0],b[1]+lift*0.5,z(b[2],a[2],0.5)],b];
  return {kind:'carry',part,path,hands,pose,t:{grab:0.24,carryStart:0.3,carryEnd:0.72,release:0.78,effect:0.76}};
 },
 // Press a latch, a lever or a button with a fingertip.
 press({point,side='right',part=null,pose='point'}){return {kind:'press',part,point,hand:side,pose,t:{arrive:0.3,press:0.46,effect:0.46,release:0.62}};},
 // Point at something and hold (an inspection); `choice` names the answer card to highlight while pointing.
 look({point,side='right',choice=null}){return {kind:'look',point,hand:side,choice,t:{arrive:0.32,effect:0.7,release:0.82}};},
 // No hands: something happens by itself (the air-drying preview). `name` tells the scene which effect to show.
 effect({name,choice=null}){return {kind:'effect',name,choice,t:{effect:0.5}};},
 // Both hands follow a task-supplied motion. sample(p) -> {hands, held}; effects: fraction at which each action lands.
 pair({sample,effects,name=null}){return {kind:'pair',sample,name,t:{effects}};}
};

// Builds a demonstration from authored frames. task.script(frame) returns one of the scripts above;
// reduce(state, action) is the shared reducer, used to know the state between the actions of a multi-action frame.
export function buildDemo(frames,{script,reduce}){
 let start=0;
 const steps=frames.map(frame=>{
  const s=script(frame);let duration=frame.duration*DEMO_SCALE;
  // long carries take as long as they need, whatever the authored lesson timing says
  if(s.kind==='carry')duration=Math.max(duration,pathLength(s.path)*HAND_PACE/(s.t.carryEnd-s.t.carryStart));
  const effects=s.t.effects??frame.actions.map(()=>s.t.effect);
  const states=[frame.from];for(const action of frame.actions)states.push(reduce(states.at(-1),action).state);states[states.length-1]=frame.to;
  const step={frame,start,end:start+duration,duration,script:s,effects,states};start+=duration;return step;
 });
 return {steps,duration:start};
}
// Which authored frame a time falls in (the last frame at the very end).
export function frameAt(demo,t){
 const clamped=Math.min(Math.max(0,t),demo.duration-1e-9);
 const index=demo.steps.findIndex(step=>clamped<step.end);
 return index<0?demo.steps.length-1:index;
}
// What is on screen at time t (milliseconds from the start).
//   hands:  [{side, target:[x,y,z], pose:[[name,weight],...], visible, orient?}]
//   held:   {part, anchor:[x,y,z]} while a hand is carrying something, else null
//   state:  the practice state whose resting places apply right now
//   choice: the answer card the hand is pointing at (decision steps), effect: {name, progress} for hand-free steps
export function sampleDemo(demo,t){
 const index=frameAt(demo,t),step=demo.steps[index],p=clamp01((t-step.start)/step.duration),s=step.script;
 let hands=[],held=null,choice=null,effect=null;
 const done=step.effects.filter(e=>p>=e).length,state=step.states[Math.min(done,step.states.length-1)];
 if(s.kind==='carry'){
  const {grab,carryStart,carryEnd,release}=s.t,start=s.path[0],end=s.path.at(-1);
  const moving=p>=carryStart&&p<=carryEnd,after=p>carryEnd;
  const partAnchor=moving?spline(s.path,smoother((p-carryStart)/(carryEnd-carryStart))):(after?end:start);
  const gripWeight=smoother(clamp01((p-(grab-0.05))/0.1))*(1-smoother(clamp01((p-release)/0.08)));
  if(p>=grab&&p<release)held={part:s.part,anchor:partAnchor};
  for(const hand of s.hands){
   const attach=hand.attach,at=q=>[q[0]+attach[0],q[1]+attach[1],q[2]+attach[2]];
   let target;
   if(p<grab)target=lerp3(offscreen(hand.side,at(start)),at(start),smoother(p/grab));
   else if(p<=release)target=at(partAnchor);
   else target=lerp3(at(end),offscreen(hand.side,at(end)),smoother(clamp01((p-release)/(1-release))));
   hands.push({side:hand.side,target,pose:[['relaxed',1-gripWeight],[s.pose,gripWeight]],visible:true});
  }
 }else if(s.kind==='press'||s.kind==='look'){
  const {arrive,release}=s.t,point=s.point,hover=[point[0],point[1]+0.07,point[2]+0.05],far=offscreen(s.hand,point),pose=s.pose??'point';
  let target,blend;
  if(p<arrive){const u=smoother(p/arrive);target=lerp3(far,hover,u);blend=[['relaxed',1-u],[pose,u]];}
  else if(p<release){
   if(s.kind==='press'){const u=smoother(clamp01((p-arrive)/(s.t.press-arrive))),d=smoother(clamp01((p-s.t.press)/(release-s.t.press)));target=lerp3(lerp3(hover,point,u),hover,d);}
   else{const u=smoother(clamp01((p-arrive)/0.12)),wobble=0.004*Math.sin(p*40);target=lerp3(hover,[point[0]+wobble,point[1]+0.012,point[2]+0.02],u);}
   blend=[[pose,1]];
  }else{const u=smoother(clamp01((p-release)/(1-release)));target=lerp3(hover,far,u);blend=[[pose,1-u],['relaxed',u]];}
  hands.push({side:s.hand,target,pose:blend,visible:true});
  if(s.kind==='look'&&s.choice&&p>=arrive)choice=s.choice;
 }else if(s.kind==='effect'){
  effect={name:s.name,progress:p};if(s.choice&&p<s.t.effect)choice=s.choice;
 }else if(s.kind==='pair'){
  const out=s.sample(p);hands=out.hands;held=out.held??null;if(s.name)effect={name:s.name,progress:p};
 }
 // the hands not needed for this step rest out of view
 for(const side of ['left','right'])if(!hands.some(h=>h.side===side))hands.push({side,target:[0,-1,0.4],pose:[['relaxed',1]],visible:false});
 return {index,progress:p,hands,held,state,step,choice,effect};
}
// Camera for time t: it starts wide, then dollies to each step's framing over CAMERA_MS after the step begins.
// focusFor(state) gives a framing key; returns {from, to, k}.
export function cameraAt(demo,t,focusFor){
 const index=frameAt(demo,t),step=demo.steps[index],to=focusFor(step.frame.from),from=index===0?'wide':focusFor(demo.steps[index-1].frame.from);
 return {from,to,k:smoother(clamp01((t-step.start)/CAMERA_MS))};
}
