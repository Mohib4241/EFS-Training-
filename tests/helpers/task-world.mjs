// A WebGL-free world for task tests: real camera maths (the framing follows the practice state, as on screen), parts at the
// resting places the state names, zones projected to the screen, plus whatever a hand holds.
import * as THREE from 'three';
import {VIEW,WIDE,cameraPose} from '../../src/sim3d/layout.js';
import {createInteraction} from '../../src/sim3d/interaction.js';
import {initialPractice,reducePractice} from '../../src/maintenance-state.js';

export function makeWorld(task,getState,{aspect=1.5}={}){
 const camera=new THREE.PerspectiveCamera(VIEW.fov,aspect,0.05,30),held=new Map(),v=new THREE.Vector3();
 function frame(){const key=task.focusFor(getState()),pose=cameraPose(task.FOCUS[key]||WIDE,aspect);camera.position.set(...pose.eye);camera.lookAt(...pose.look);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();}
 const world={
  camera,held,frame,
  anchorWorld(part){if(held.has(part))return held.get(part);return task.anchorAt(part,task.places(getState())[part]);},
  anchorScreen(part){const w=world.anchorWorld(part);v.set(...w).project(camera);return {nx:v.x,ny:v.y,z:w[2]};},
  pointAt(nx,ny,z){v.set(nx,ny,0.5).unproject(camera).sub(camera.position).normalize();const t=(z-camera.position.z)/v.z;return [camera.position.x+v.x*t,camera.position.y+v.y*t,z];},
  halfExtents(z){const d=camera.position.z-z,h=d*Math.tan(THREE.MathUtils.degToRad(VIEW.fov/2));return {w:h*camera.aspect,h};},
  zoneRect(zone){const box=task.ZONES[zone];if(!box)return null;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]]){v.set(x,y,z).project(camera);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}return {x0,x1,y0,y1};},
  zoneDepth(zone){const box=task.ZONES[zone];return (box.min[2]+box.max[2])/2;},
  hold(part,anchor){if(anchor)held.set(part,anchor);else held.delete(part);},
  ndc(point){frame();v.set(...point).project(camera);return [v.x,v.y];}
 };
 frame();return world;
}
// A learner driving the task with one hand (or the mouse): everything goes through the interaction layer and the reducer.
export function harness(task,kind=task.kind){
 let state=initialPractice(kind);const messages=[],events=[],actions=[];
 const world=makeWorld(task,()=>state);
 const dispatch=action=>{const out=reducePractice(state,{...action,now:action.now??0});state=out.state;actions.push({...action,blocked:out.blocked});if(out.message)messages.push(out.message);return out;};
 const ix=createInteraction({rules:task.rules,world,getState:()=>state,dispatch,onHint:m=>messages.push(m),onEvent:e=>events.push(e)});
 const frame=(pointers,dt=1/30,tick)=>{world.frame();return ix.update(dt,pointers,tick);};
 const pointer=(id,ndc,pinch,tip)=>({id,nx:ndc[0],ny:ndc[1],pinch,tipNx:(tip??ndc)[0],tipNy:(tip??ndc)[1]});
 const h={get state(){return state;},set state(s){state=s;},messages,events,actions,world,ix,frame,dispatch,pointer};
 // pinch on a part, move to an on-screen point (or a zone's centre), hold there, open the hand
 h.carryTo=(id,part,destination,{seconds=1}={})=>{
  const start=world.anchorScreen(part);
  for(let t=0;t<0.2;t+=1/30)frame([pointer(id,[start.nx,start.ny],true)]);
  const end=typeof destination==='string'?zoneCentre(world,destination):destination;
  const steps=Math.ceil(seconds*30);for(let i=1;i<=steps;i++){const u=i/steps;frame([pointer(id,[start.nx+(end[0]-start.nx)*u,start.ny+(end[1]-start.ny)*u],true)]);}
  for(let t=0;t<0.4;t+=1/30)frame([pointer(id,end,true)]);
  for(let t=0;t<0.3;t+=1/30)frame([pointer(id,end,false)]);
 };
 // rest a fingertip on a part until it is pressed
 h.press=(id,part,seconds=1.3)=>{const a=world.anchorScreen(part);for(let t=0;t<seconds;t+=1/30)frame([pointer(id,[a.nx,a.ny-0.1],false,[a.nx,a.ny])]);frame([]);};
 // pull a part (the plug) this far on screen, in normalised units
 h.pull=(id,part,[dx,dy]=[0.35,-0.05])=>{const a=world.anchorScreen(part);h.carryTo(id,part,[a.nx+dx,a.ny+dy]);};
 return h;
}
export function zoneCentre(world,zone){const r=world.zoneRect(zone);return [(r.x0+r.x1)/2,(r.y0+r.y1)/2];}
// Do the current step the way a learner would: press, carry to the zone, pull the plug, or answer a choice card.
export function doStep(h,task,{id='r'}={}){
 const state=h.state,part=task.rules.targetPart(state),choices=task.choices(state,'english');
 if(choices.length){const pick=choices.find(c=>c.correct)??choices[0];h.dispatch(pick.action);return 'choice';}
 if(!part)throw new Error('No part for phase '+state.phase);
 if(task.rules.press.includes(part)){h.press(id,part);return 'press';}
 const zone=task.rules.targetZone(state);
 if(zone){h.carryTo(id,part,zone);return 'carry';}
 h.pull(id,part);return 'pull';
}
