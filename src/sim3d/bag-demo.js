import {restingPlaces,focusFor} from './bag-task.js';
import {placePose,anchorWorld} from './parts.js';
import {PLACE} from './layout.js';

// Deterministic demonstration of the dust-bag change. The authored lesson frames give the order, timing and the state before
// and after every step; this turns each one into hand motions. sampleDemo(demo, t) is a pure function of time, so any moment
// can be scrubbed to, backward or forward, and replays identically. Parts only move because a hand carries them.
export const DEMO_SCALE=1.4;                 // lesson frames are short; the hands need time to arrive, act and leave
const HAND_PACE=1250;                        // milliseconds per metre carried: a calm, readable pace (peak speed stays under 1.6 m/s)
const smoother=t=>t*t*t*(t*(t*6-15)+10);
const clamp01=t=>Math.min(1,Math.max(0,t));
const lerp=(a,b,t)=>a+(b-a)*t;
const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const OFFSCREEN={left:[-0.78,-0.42,0.35],right:[0.78,-0.42,0.35]};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// Catmull-Rom through waypoints, parameterised by distance travelled so the hand moves at an even pace for t in 0..1.
function spline(points,t){
 const n=points.length-1,cumulative=[0];for(let i=1;i<=n;i++)cumulative.push(cumulative[i-1]+Math.max(1e-6,distance(points[i-1],points[i])));
 const target=clamp01(t)*cumulative[n];let i=0;while(i<n-1&&target>cumulative[i+1])i++;
 const u=(target-cumulative[i])/(cumulative[i+1]-cumulative[i]);
 const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(n,i+2)];
 return [0,1,2].map(k=>0.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));
}
const anchorAt=(part,place)=>anchorWorld(part,placePose(part,place));

// --- script builders: one per kind of step. Times are fractions (0..1) of the frame. ---
function carry({part,from,to,hands,pose='pinch',lift=0.14,straight=false}){
 const a=anchorAt(part,from),b=anchorAt(part,to);
 const carryZ=straight?null:PLACE.carryZ,mix=lerp3(a,b,0.5),depth=(from,to,t)=>straight?lerp(from,to,t):lerp(from,carryZ,t);
 // rise toward the viewer, arc over, then settle at the destination
 const path=[a,[a[0],a[1]+lift*0.5,depth(a[2],b[2],0.5)],[mix[0],Math.max(a[1],b[1])+lift,straight?mix[2]:carryZ],[b[0],b[1]+lift*0.5,depth(b[2],a[2],0.5)],b];
 return {kind:'carry',part,path,hands,pose,t:{grab:0.24,carryStart:0.3,carryEnd:0.72,release:0.78,effect:0.76}};
}
function press({part,place,side,target}){
 const point=target??anchorAt(part,place);
 return {kind:'press',part,point,hand:side,t:{arrive:0.3,press:0.46,effect:0.46,release:0.62}};
}
// Travelled distance along the actual curve (the spline wanders a little past its waypoints), by dense sampling.
function pathLength(points){let sum=0,last=points[0];for(let i=1;i<=80;i++){const next=spline(points,i/80);sum+=distance(last,next);last=next;}return sum;}
export function scriptFor(frame){
 const action=frame.actions[0],before=restingPlaces(frame.from),after=restingPlaces(frame.to);
 switch(action.type){
  case 'isolate':return carry({part:'plug',from:before.plug,to:after.plug,hands:[{side:'right',attach:[0,0,0]}],lift:0.03,straight:true});
  case 'unclip':return press({part:action.clip==='left'?'clipLeft':'clipRight',place:'locked',side:action.clip==='left'?'left':'right'});
  case 'secure':return press({part:action.clip==='left'?'clipLeft':'clipRight',place:'released',side:action.clip==='left'?'left':'right'});
  case 'open':case 'close':return carry({part:'head',from:before.head,to:after.head,pose:'grip',hands:[{side:'left',attach:[-0.17,-0.14,0.01]},{side:'right',attach:[0.17,-0.14,0.01]}],lift:0.12});
  case 'remove':case 'dispose':return carry({part:'used',from:before.used,to:after.used,hands:[{side:'right',attach:[0,0,0]}]});
  case 'fit':return carry({part:'fresh',from:before.fresh,to:after.fresh,hands:[{side:'right',attach:[0,0,0]}]});
  case 'seal':return press({part:'tape',place:'rest',side:'right'});
  default:throw new RangeError('No choreography for '+action.type);
 }
}
export function buildDemo(frames){
 let start=0;
 const steps=frames.map(frame=>{
  const script=scriptFor(frame);let duration=frame.duration*DEMO_SCALE;
  // long carries take as long as they need, whatever the authored lesson timing says
  if(script.kind==='carry')duration=Math.max(duration,pathLength(script.path)*HAND_PACE/(script.t.carryEnd-script.t.carryStart));
  const step={frame,start,end:start+duration,duration,script};start+=duration;return step;
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
//   hands: [{side, target:[x,y,z] contact point in the world, pose:[[name,weight],...], visible}]
//   held:  {part, anchor:[x,y,z]} while a hand is carrying something, else null
//   state: the practice state whose resting places apply right now (before the step's effect, or after it)
export function sampleDemo(demo,t){
 const index=frameAt(demo,t),step=demo.steps[index],p=clamp01((t-step.start)/step.duration),s=step.script;
 const hands=[];let held=null;
 const sides=s.kind==='carry'?s.hands.map(h=>h.side):[s.hand];
 const unused=['left','right'].filter(side=>!sides.includes(side));
 if(s.kind==='carry'){
  const {grab,carryStart,carryEnd,release,effect}=s.t,start=s.path[0],end=s.path.at(-1);
  const moving=p>=carryStart&&p<=carryEnd,after=p>carryEnd;
  const partAnchor=moving?spline(s.path,smoother((p-carryStart)/(carryEnd-carryStart))):(after?end:start);
  const gripWeight=smoother(clamp01((p-(grab-0.05))/0.1))*(1-smoother(clamp01((p-release)/0.08)));
  if(p>=grab&&p<release)held={part:s.part,anchor:partAnchor};
  for(const hand of s.hands){
   const attach=hand.attach,target=[partAnchor[0]+attach[0],partAnchor[1]+attach[1],partAnchor[2]+attach[2]];
   const startAt=[start[0]+attach[0],start[1]+attach[1],start[2]+attach[2]],endAt=[end[0]+attach[0],end[1]+attach[1],end[2]+attach[2]];
   let at;
   if(p<grab)at=lerp3(OFFSCREEN[hand.side],startAt,smoother(p/grab));
   else if(p<=release)at=target;
   else at=lerp3(endAt,OFFSCREEN[hand.side],smoother(clamp01((p-release)/(1-release))));
   hands.push({side:hand.side,target:at,pose:[['relaxed',1-gripWeight],[s.pose,gripWeight]],visible:true});
  }
  var state=p<effect?step.frame.from:step.frame.to;
 }else{
  const {arrive,press:pressAt,effect,release}=s.t;
  let at,pose;
  const hover=[s.point[0],s.point[1]+0.07,s.point[2]+0.05];
  if(p<arrive){at=lerp3(OFFSCREEN[s.hand],hover,smoother(p/arrive));pose=[['relaxed',1-smoother(p/arrive)],['point',smoother(p/arrive)]];}
  else if(p<release){const u=smoother(clamp01((p-arrive)/(pressAt-arrive))),d=smoother(clamp01((p-pressAt)/(release-pressAt)));at=lerp3(hover,s.point,u);at=lerp3(at,hover,d);pose=[['point',1]];}
  else{at=lerp3(hover,OFFSCREEN[s.hand],smoother(clamp01((p-release)/(1-release))));pose=[['point',1-smoother(clamp01((p-release)/(1-release)))],['relaxed',smoother(clamp01((p-release)/(1-release)))]];}
  hands.push({side:s.hand,target:at,pose,visible:true});
  state=p<effect?step.frame.from:step.frame.to;
 }
 // the hand not needed for this step rests out of view
 for(const side of unused)hands.push({side,target:OFFSCREEN[side],pose:[['relaxed',1]],visible:false});
 return {index,progress:p,hands,held,state,step};
}
// Camera for time t: it starts wide, then dollies to each step's framing over CAMERA_MS after the step begins.
// Returns {from, to, k}: blend focus `from` into `to` by k (0..1). A pure function of time, like everything else here.
export const CAMERA_MS=900;
export function cameraAt(demo,t){
 const index=frameAt(demo,t),step=demo.steps[index],to=focusFor(step.frame.from),from=index===0?'wide':focusFor(demo.steps[index-1].frame.from);
 return {from,to,k:smoother(clamp01((t-step.start)/CAMERA_MS))};
}
