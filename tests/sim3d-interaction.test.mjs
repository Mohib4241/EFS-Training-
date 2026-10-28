import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {task as bag} from '../src/sim3d/tasks/bag.js';
import {harness} from './helpers/task-world.mjs';

// Pointer positions are on screen (normalised device coordinates), exactly as the hand tracker and the mouse report them.
const screen=(h,part)=>{const a=h.world.anchorScreen(part);return [a.nx,a.ny];};
const run=(h,seconds,pointers)=>{for(let t=0;t<seconds;t+=1/30)h.frame(pointers());};
const unplug=h=>h.pull('r','plug');
const openClips=h=>{h.press('l','clipLeft');h.press('r','clipRight');};

test('wrong moves do nothing and say why: out-of-order grabs, wrong drops, the wrong part',()=>{
 const h=harness(bag);
 run(h,0.3,()=>[h.pointer('r',screen(h,'head'),true)]);h.frame([]);
 assert.equal(h.ix.holding.length,0);assert.ok(h.messages.some(m=>/first use the plug/i.test(m)),'it tells the learner what to do first: '+h.messages.join(' | '));
 run(h,1.4,()=>[]);
 h.pull('r','plug',[0.05,0]);assert.equal(h.state.isolated,false,'a short tug is not unplugging');assert.ok(h.messages.some(m=>/further out/i.test(m)));
 run(h,1.4,()=>[]);unplug(h);assert.equal(h.state.isolated,true,'a real pull works');
 openClips(h);run(h,1.4,()=>[]);
 h.carryTo('r','head','bin');assert.equal(h.state.headOpen,false,'dropping the head on the bin does not park it');assert.ok(h.messages.some(m=>/stool/i.test(m)),h.messages.at(-1));
 run(h,0.3,()=>[h.pointer('r',screen(h,'used'),true)]);h.frame([]);assert.equal(h.ix.holding.length,0,'the bag cannot be lifted while the head is on');
});

test('two hands can hold the head together; one hand letting go keeps it held',()=>{
 const h=harness(bag);unplug(h);openClips(h);
 const head=screen(h,'head');
 run(h,0.3,()=>[h.pointer('l',head,true),h.pointer('r',head,true)]);
 assert.deepEqual(h.ix.holding,['head','head'],'both hands are holding it');
 const r=h.world.zoneRect('rest'),mid=[(r.x0+r.x1)/2,(r.y0+r.y1)/2];
 for(let i=1;i<=30;i++){const u=i/30,p=[head[0]+(mid[0]-head[0])*u,head[1]+(mid[1]-head[1])*u];h.frame([h.pointer('l',p,true),h.pointer('r',p,true)]);}
 run(h,0.3,()=>[h.pointer('l',mid,false),h.pointer('r',mid,true)]);assert.equal(h.state.headOpen,false,'still held by one hand');assert.deepEqual(h.ix.holding,['head']);
 run(h,0.3,()=>[h.pointer('l',mid,false),h.pointer('r',mid,false)]);assert.equal(h.state.headOpen,true,'released by both: parked on the stool');
});

test('losing the hand for a moment does not drop things, losing it for longer does',()=>{
 const h=harness(bag),start=screen(h,'plug'),away=[start[0]+0.4,start[1]-0.05];
 run(h,0.2,()=>[h.pointer('r',start,true)]);
 for(let i=1;i<=20;i++){const u=i/20;h.frame([h.pointer('r',[start[0]+(away[0]-start[0])*u,start[1]+(away[1]-start[1])*u],true)]);}
 run(h,0.15,()=>[]);assert.deepEqual(h.ix.holding,['plug'],'a brief dropout keeps the grip');
 h.frame([h.pointer('r',away,true)]);assert.deepEqual(h.ix.holding,['plug'],'and the hand picks up where it left off');
 run(h,0.5,()=>[]);assert.equal(h.ix.holding.length,0,'a long dropout releases');assert.equal(h.state.isolated,true,'the drop is judged where the hand was last seen');
});

test('a fingertip must rest on a latch for a moment; passing over it does nothing',()=>{
 const h=harness(bag);unplug(h);
 const a=screen(h,'clipLeft');
 run(h,0.1,()=>[h.pointer('l',[a[0],a[1]-0.1],false,a)]);h.frame([]);assert.equal(h.state.clips.left,true,'a brush is not a press');
 run(h,0.5,()=>[h.pointer('l',[a[0],a[1]-0.1],false,a)]);assert.equal(h.state.clips.left,false,'resting on it releases the clip');
 run(h,1,()=>[]);
 const right=screen(h,'clipRight');run(h,0.5,()=>[h.pointer('l',[right[0],right[1]-0.1],false,[right[0]+0.5,right[1]])]);assert.equal(h.state.clips.right,true,'a fingertip far away presses nothing');
 h.frame([h.pointer('r',right,true)]);assert.equal(h.state.clips.right,false,'a pinch on a latch also works');
});

test('one open reading does not drop a held part; an open hand over two readings lets go; a mouse button is exact',()=>{
 const h=harness(bag),plug=screen(h,'plug'),away=[plug[0]+0.05,plug[1]];
 const reading=(seq,pt,pinch,seconds)=>{for(let t=0;t<seconds;t+=1/30){h.world.frame();h.ix.update(1/30,[{...h.pointer('r',pt,pinch),seq}],seq);}};
 reading(1,plug,true,0.3);assert.deepEqual(h.ix.holding,['plug'],'grabbed');
 reading(2,away,false,1.0);assert.deepEqual(h.ix.holding,['plug'],'a single open reading, even a slow one, is only a flicker');
 reading(3,away,true,0.2);assert.deepEqual(h.ix.holding,['plug'],'the pinch returns and the carry carries on');
 reading(4,away,false,0.1);reading(5,away,false,0.1);assert.equal(h.ix.holding.length,0,'two open readings let go');
 const m=harness(bag),at=screen(m,'plug');run(m,0.2,()=>[{...m.pointer('mouse',at,true),crisp:true}]);assert.equal(m.ix.holding.length,1);
 m.frame([{...m.pointer('mouse',at,false),crisp:true}]);assert.equal(m.ix.holding.length,0,'released at once');
});

test('losing the hand needs more than one empty reading to drop a part',()=>{
 const h=harness(bag),plug=screen(h,'plug');
 for(let t=0;t<0.3;t+=1/30)h.ix.update(1/30,[{...h.pointer('r',plug,true),seq:1}],1);
 for(let t=0;t<1.0;t+=1/30)h.ix.update(1/30,[],2);assert.equal(h.ix.holding.length,1,'one empty reading, however long, is not a loss');
 for(let t=0;t<0.4;t+=1/30)h.ix.update(1/30,[],4);assert.equal(h.ix.holding.length,0,'empty over several readings and long enough: let go');
});

test('a mouse presses by clicking: resting the cursor on a latch does nothing',()=>{
 const h=harness(bag);unplug(h);
 const a=screen(h,'clipLeft'),hover={...h.pointer('mouse',a,false),dwell:false};
 run(h,1.5,()=>[hover]);assert.equal(h.state.clips.left,true,'hovering is not pressing');
 h.frame([{...h.pointer('mouse',a,true),dwell:false}]);assert.equal(h.state.clips.left,false,'a click releases the clip');
});

test('the held part stays under the fingers on screen, and settles to the destination depth over its target',()=>{
 const h=harness(bag);unplug(h);openClips(h);
 run(h,0.1,()=>[h.pointer('r',screen(h,'head'),true)]);
 const r=h.world.zoneRect('rest'),over=[(r.x0+r.x1)/2,(r.y0+r.y1)/2];
 run(h,1,()=>[h.pointer('r',over,true)]);
 const held=h.world.anchorWorld('head'),v=new THREE.Vector3(...held).project(h.world.camera);
 assert.ok(Math.hypot(v.x-over[0],v.y-over[1])<0.01,'the part is where the fingers are on screen');
 assert.ok(Math.abs(held[2]-h.world.zoneDepth('rest'))<0.03,`over the stool it sinks to the stool's depth (z ${held[2].toFixed(3)})`);
});
