import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice,reducePractice} from '../src/maintenance-state.js';
import {createInteraction,GRAB_RADIUS} from '../src/sim3d/bag-interaction.js';
import {restingPlaces,targetPart} from '../src/sim3d/bag-task.js';
import {placePose,anchorWorld} from '../src/sim3d/parts.js';
import {VIEW,PLACE} from '../src/sim3d/layout.js';

// A world without WebGL: real camera maths, parts at the resting places the state says, plus whatever a hand is holding.
function makeWorld(getState){
 const camera=new THREE.PerspectiveCamera(VIEW.fov,1.8,0.05,20);camera.position.set(...VIEW.eye);camera.lookAt(...VIEW.look);camera.updateMatrixWorld(true);
 const held=new Map(),v=new THREE.Vector3(),partsOf=state=>({plug:'plug',clipLeft:'clipLeft',clipRight:'clipRight',head:'head',used:'used',fresh:'fresh',tape:'tape'});
 const world={
  camera,held,
  anchorWorld(part){if(held.has(part))return held.get(part);const places=restingPlaces(getState());const place=part==='tape'?'rest':({clipLeft:places.clipLeft,clipRight:places.clipRight,head:places.head,used:places.used,fresh:places.fresh,plug:places.plug})[part];return anchorWorld(part,placePose(part,place));},
  anchorScreen(part){const w=world.anchorWorld(part);v.set(...w).project(camera);return {nx:v.x,ny:v.y,z:w[2]};},
  pointAt(nx,ny,z){v.set(nx,ny,0.5).unproject(camera).sub(camera.position).normalize();const t=(z-camera.position.z)/v.z;return [camera.position.x+v.x*t,camera.position.y+v.y*t,z];},
  halfExtents(z){const d=camera.position.z-z,h=d*Math.tan(THREE.MathUtils.degToRad(VIEW.fov/2));return {w:h*camera.aspect,h};},
  hold(part,anchor){if(anchor)held.set(part,anchor);else held.delete(part);}
 };
 return world;
}
function harness(){
 let state=initialPractice('bag');const messages=[];const events=[];
 const world=makeWorld(()=>state);
 const dispatch=action=>{const out=reducePractice(state,action);state=out.state;return out;};
 const ix=createInteraction({world,getState:()=>state,dispatch,onHint:m=>messages.push(m),onEvent:e=>events.push(e)});
 const ndc=pt=>{const v=new THREE.Vector3(...pt).project(world.camera);return [v.x,v.y];};
 const frame=(pointers,dt=1/30)=>ix.update(dt,pointers);
 const run=(seconds,pointers)=>{for(let t=0;t<seconds;t+=1/30)frame(pointers());};
 const pointerAt=(id,pt,pinch,tip)=>{const [nx,ny]=ndc(pt);const t=tip?ndc(tip):[nx,ny];return {id,nx,ny,pinch,tipNx:t[0],tipNy:t[1]};};
 return {get state(){return state;},messages,events,world,ix,ndc,frame,run,pointerAt};
}
// A learner's gesture: pinch on a part, carry to a place on the interaction plane, release.
function carry(h,id,part,destination,{seconds=1}={}){
 const start=h.world.anchorWorld(part);
 for(let t=0;t<0.2;t+=1/30)h.frame([h.pointerAt(id,start,true)]);                         // pinch and grab
 const steps=Math.ceil(seconds*30);for(let i=1;i<=steps;i++){const u=i/steps,p=start.map((s,k)=>s+(destination[k]-s)*u);h.frame([h.pointerAt(id,p,true)]);}
 h.frame([h.pointerAt(id,destination,true)]);for(let t=0;t<0.4;t+=1/30)h.frame([h.pointerAt(id,destination,true)]);
 for(let t=0;t<0.3;t+=1/30)h.frame([h.pointerAt(id,destination,false)]);                // open the hand and keep it open
}
const press=(h,id,part,seconds=1.3)=>{const a=h.world.anchorWorld(part);h.run(seconds,()=>[h.pointerAt(id,[a[0],a[1]-0.12,a[2]],false,a)]);h.frame([]);};

test('a learner can do the whole dust-bag change with their hands, one correct move after another',()=>{
 const h=harness(),at=(part,place)=>anchorWorld(part,placePose(part,place));
 carry(h,'r','plug',[PLACE.plugOut[0],PLACE.plugOut[1]+0.02,PLACE.plugOut[2]+0.3]);assert.equal(h.state.isolated,true,'unplugging switches the machine off');
 press(h,'l','clipLeft');assert.equal(h.state.clips.left,false);
 press(h,'r','clipRight');assert.equal(h.state.phase,'open');
 carry(h,'r','head',at('head','rest'));assert.equal(h.state.headOpen,true,'the head is lifted onto the stool');
 carry(h,'r','used',at('used','tray'));assert.equal(h.state.usedBag,'removed');
 press(h,'r','tape');assert.equal(h.state.usedBag,'sealed','pressing the tape seals the bag');
 carry(h,'r','used',at('used','bin'));assert.equal(h.state.usedBag,'disposed');
 carry(h,'r','fresh',at('fresh','tank'));assert.equal(h.state.newBag,'fitted');
 carry(h,'r','head',at('head','seated'));assert.equal(h.state.headOpen,false);
 press(h,'l','clipLeft');press(h,'r','clipRight');
 assert.equal(h.state.complete,true,'all nine steps done');
 assert.deepEqual(h.events.filter(e=>e.type==='action').map(e=>e.action.type),['isolate','unclip','unclip','open','remove','seal','dispose','fit','close','secure','secure']);
 assert.equal(h.events.some(e=>e.blocked),false,'nothing was ever blocked on the correct path');
});

test('wrong moves do nothing and say why: out-of-order grabs, wrong drops, the wrong part',()=>{
 const h=harness();
 // before unplugging, the head cannot be picked up
 const headAt=h.world.anchorWorld('head');h.run(0.3,()=>[h.pointerAt('r',headAt,true)]);h.frame([]);
 assert.equal(h.ix.holding.length,0);assert.ok(h.messages.some(m=>/first use the plug/i.test(m)),'it tells the learner what to do first: '+h.messages.join(' | '));
 // a short tug is not unplugging: the plug goes back
 const plug=h.world.anchorWorld('plug');carry(h,'r','plug',[plug[0]+0.04,plug[1],plug[2]+0.1]);assert.equal(h.state.isolated,false);assert.ok(h.messages.some(m=>/further out/i.test(m)));
 // a real pull works
 carry(h,'r','plug',[-0.3,0.08,0.16]);assert.equal(h.state.isolated,true);
 press(h,'l','clipLeft');press(h,'r','clipRight');
 // dropping the head in the bin does not park it
 carry(h,'r','head',[0.8,0.25,0.14]);assert.equal(h.state.headOpen,false);assert.ok(h.messages.some(m=>/stool/i.test(m)),h.messages.at(-1));
 // the bag cannot be lifted while the head is still on
 const bag=h.world.anchorWorld('used');h.run(0.3,()=>[h.pointerAt('r',bag,true)]);h.frame([]);assert.equal(h.ix.holding.length,0);
});

test('two hands can hold the head together, and it rides at their midpoint',()=>{
 const h=harness(),at=(part,place)=>anchorWorld(part,placePose(part,place));
 carry(h,'r','plug',[-0.3,0.08,0.16]);press(h,'l','clipLeft');press(h,'r','clipRight');
 const head=h.world.anchorWorld('head'),left=[head[0]-0.15,head[1]-0.1,head[2]],right=[head[0]+0.15,head[1]-0.1,head[2]];
 for(let t=0;t<0.3;t+=1/30)h.frame([h.pointerAt('l',head,true),h.pointerAt('r',head,true)]);
 assert.deepEqual(h.ix.holding,['head','head'],'both hands are holding it');
 const mid=at('head','rest');for(let i=1;i<=30;i++){const u=i/30,p=head.map((s,k)=>s+(mid[k]-s)*u);h.frame([h.pointerAt('l',p,true),h.pointerAt('r',p,true)]);}
 // letting go with one hand keeps it held; letting go with both drops it
 for(let t=0;t<0.3;t+=1/30)h.frame([h.pointerAt('l',mid,false),h.pointerAt('r',mid,true)]);assert.equal(h.state.headOpen,false,'still held by one hand');assert.deepEqual(h.ix.holding,['head']);
 for(let t=0;t<0.3;t+=1/30)h.frame([h.pointerAt('l',mid,false),h.pointerAt('r',mid,false)]);assert.equal(h.state.headOpen,true,'released by both: parked');
});

test('losing the hand for a moment does not drop things, losing it for longer does',()=>{
 const h=harness();const plug=h.world.anchorWorld('plug'),away=[-0.3,0.08,0.16];
 for(let t=0;t<0.2;t+=1/30)h.frame([h.pointerAt('r',plug,true)]);
 for(let i=1;i<=20;i++){const u=i/20;h.frame([h.pointerAt('r',plug.map((s,k)=>s+(away[k]-s)*u),true)]);}
 for(let t=0;t<0.15;t+=1/30)h.frame([]);                       // tracking drops out briefly
 assert.deepEqual(h.ix.holding,['plug'],'a brief dropout keeps the grip');
 h.frame([h.pointerAt('r',away,true)]);assert.deepEqual(h.ix.holding,['plug'],'and the hand picks up where it left off');
 for(let t=0;t<0.5;t+=1/30)h.frame([]);                         // gone for good
 assert.equal(h.ix.holding.length,0,'a long dropout releases');assert.equal(h.state.isolated,true,'the drop is judged where the hand was last seen');
});

test('a fingertip must rest on a latch for a moment; passing over it does nothing',()=>{
 const h=harness();carry(h,'r','plug',[-0.3,0.08,0.16]);
 const a=h.world.anchorWorld('clipLeft');
 h.run(0.1,()=>[h.pointerAt('l',[a[0],a[1]-0.1,a[2]],false,a)]);h.frame([]);assert.equal(h.state.clips.left,true,'a brush is not a press');
 h.run(0.5,()=>[h.pointerAt('l',[a[0],a[1]-0.1,a[2]],false,a)]);assert.equal(h.state.clips.left,false,'resting on it releases the clip');
 h.frame([]);for(let t=0;t<1;t+=1/30)h.frame([]);
 const right=h.world.anchorWorld('clipRight');h.run(0.5,()=>[h.pointerAt('l',[right[0],right[1]-0.1,right[2]],false,[right[0]+0.4,right[1],right[2]])]);assert.equal(h.state.clips.right,true,'a fingertip far away presses nothing');
 const pinchHit=h.pointerAt('r',right,true);h.frame([pinchHit]);assert.equal(h.state.clips.right,false,'a pinch on a latch also works');
});

test('one open reading does not drop a held part, however long it stays the latest; an open hand over two readings lets go',()=>{
 const h=harness(),plug=h.world.anchorWorld('plug'),away=[plug[0]+0.05,plug[1],plug[2]];
 const reading=(seq,pt,pinch,seconds)=>{for(let t=0;t<seconds;t+=1/30)h.ix.update(1/30,[{...h.pointerAt('r',pt,pinch),seq}],seq);};
 reading(1,plug,true,0.3);assert.deepEqual(h.ix.holding,['plug'],'grabbed');
 reading(2,away,false,1.0);assert.deepEqual(h.ix.holding,['plug'],'a single open reading, even a slow one, is only a flicker');
 reading(3,away,true,0.2);assert.deepEqual(h.ix.holding,['plug'],'the pinch returns and the carry carries on');
 reading(4,away,false,0.1);reading(5,away,false,0.1);assert.equal(h.ix.holding.length,0,'two open readings let go');
 // a mouse button is exact: it releases as soon as it is lifted
 const m=harness(),at=m.world.anchorWorld('plug');for(let t=0;t<0.2;t+=1/30)m.frame([{...m.pointerAt('mouse',at,true),crisp:true}]);assert.equal(m.ix.holding.length,1);
 m.frame([{...m.pointerAt('mouse',at,false),crisp:true}]);assert.equal(m.ix.holding.length,0,'released at once');
});

test('losing the hand needs more than one empty reading to drop a part',()=>{
 const h=harness(),plug=h.world.anchorWorld('plug');
 for(let t=0;t<0.3;t+=1/30)h.ix.update(1/30,[{...h.pointerAt('r',plug,true),seq:1}],1);
 for(let t=0;t<1.0;t+=1/30)h.ix.update(1/30,[],2);assert.equal(h.ix.holding.length,1,'one empty reading, however long, is not a loss');
 for(let t=0;t<0.4;t+=1/30)h.ix.update(1/30,[],4);assert.equal(h.ix.holding.length,0,'empty over several readings and long enough: let go');
});

test('a mouse presses by clicking: resting the cursor on a latch does nothing',()=>{
 const h=harness();carry(h,'r','plug',[-0.3,0.08,0.16]);
 const a=h.world.anchorWorld('clipLeft'),hover={...h.pointerAt('mouse',a,false),dwell:false};
 h.run(1.5,()=>[hover]);assert.equal(h.state.clips.left,true,'hovering is not pressing');
 h.frame([{...h.pointerAt('mouse',a,true),dwell:false}]);assert.equal(h.state.clips.left,false,'a click releases the clip');
});

test('the held part stays under the fingers on screen while its depth eases to the carry depth',()=>{
 const h=harness(),start=h.world.anchorWorld('plug');
 for(let t=0;t<0.1;t+=1/30)h.frame([h.pointerAt('r',start,true)]);
 const target=[-0.3,0.12,0.16],[nx,ny]=h.ndc(target);
 for(let t=0;t<0.6;t+=1/30)h.frame([{id:'r',nx,ny,pinch:true}]);
 const anchor=h.world.anchorWorld('plug'),shown=new THREE.Vector3(...anchor).project(h.world.camera);
 assert.ok(Math.hypot(shown.x-nx,shown.y-ny)<0.01,'the part is where the fingers are on screen');
});
