import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/maintenance-lessons.js';
import {initialPractice,reducePractice,bagDropAction,BAG_ZONES} from '../src/maintenance-state.js';
import {targetPart,targetZone,canGrab,isPress,pressAction,dropAction,restingPlaces,PARTS} from '../src/sim3d/bag-task.js';
import {ZONES,inZone,PLACE} from '../src/sim3d/layout.js';
import {createOneEuro} from '../src/sim3d/oneeuro.js';

const centre=zone=>{const [x0,x1,y0,y1]=ZONES[zone];return [(x0+x1)/2,(y0+y1)/2];};
// A representative point of each 2D board zone (the 2D rules are defined on the 1000 x 625 board).
const boardCentre=zone=>{const z=BAG_ZONES[zone];return {x:z.x+z.width/2,y:z.y+z.height/2};};
const bagFrames=LESSONS.bag;

test('3D targets, grabs and drops reproduce every authored step of the 2D bag lesson',()=>{
 for(const [i,frame] of bagFrames.entries()){
  const state=frame.from,[action]=frame.actions,part=targetPart(state);
  assert.ok(PARTS.includes(part),`frame ${i} has a target part (${part})`);
  assert.equal(canGrab(state,part),true,`frame ${i}: ${part} can be used now`);
  const zone=targetZone(state);
  if(zone){const [x,y]=centre(zone);assert.deepEqual(dropAction(state,part,x,y),action,`frame ${i}: carrying ${part} to ${zone} performs ${action.type}`);assert.equal(isPress(part),false);}
  else if(isPress(part))assert.deepEqual(pressAction(state,part),action,`frame ${i}: pressing ${part}`);
  else assert.equal(part,'plug',`frame ${i}: the only other step is unplugging`);
 }
});

test('only the part for the current step can be used',()=>{
 for(const frame of bagFrames){
  const state=frame.from,usable=PARTS.filter(id=>canGrab(state,id));
  assert.ok(usable.includes(targetPart(state)));
  if(!['release','secure'].includes(state.phase))assert.equal(usable.length,1,`phase ${state.phase} offers exactly one part`);
 }
 assert.equal(targetPart({...initialPractice('bag'),complete:true}),null);
 assert.equal(canGrab({...initialPractice('bag'),complete:true},'plug'),false);
});

test('drop zones agree with the 2D board for every step, object and zone',()=>{
 const zones=Object.keys(BAG_ZONES);
 for(const frame of bagFrames)for(const id of ['head','used','fresh'])for(const zone of zones){
  const state=frame.from,twoD=bagDropAction(state,id,boardCentre(zone));
  const [x,y]=centre(zone==='head'?'head':zone),threeD=dropAction(state,id,x,y);
  assert.deepEqual(threeD,twoD,`phase ${state.phase}, ${id} dropped on ${zone}`);
 }
 // away from every zone nothing happens
 for(const frame of bagFrames)for(const id of ['head','used','fresh'])assert.equal(dropAction(frame.from,id,0.9,1.4),null);
});

test('overlapping zones are not confused: the clean bag enters the tank mouth, the head seats above it',()=>{
 assert.equal(inZone('head',0,0.5)&&inZone('machine',0,0.5),true,'they do overlap');
 const fit=frame=>frame.actions[0].type==='fit',closeFrame=bagFrames.find(frame=>frame.actions[0].type==='close'),fitFrame=bagFrames.find(fit);
 assert.deepEqual(dropAction(fitFrame.from,'fresh',0,0.5),{type:'fit',item:'new'});
 assert.deepEqual(dropAction(closeFrame.from,'head',0,0.5),{type:'close'});
 assert.equal(dropAction(closeFrame.from,'fresh',0,0.5),null);
});

test('resting places follow the practice state through the whole lesson',()=>{
 let state=initialPractice('bag');const seen=new Set();
 for(const frame of bagFrames){state=frame.from;const places=restingPlaces(state);seen.add(places.head+'/'+places.used+'/'+places.fresh+'/'+places.plug);}
 const end=restingPlaces(bagFrames.at(-1).to);
 assert.deepEqual(end,{plug:'out',clipLeft:'locked',clipRight:'locked',head:'seated',used:'bin',usedSealed:true,fresh:'tank',usedVisible:true});
 const start=restingPlaces(initialPractice('bag'));
 assert.deepEqual([start.plug,start.head,start.used,start.fresh],['in','seated','tank','shelf']);
 assert.ok(seen.size>=6,'the scene passes through distinct arrangements');
});

test('blocked actions stay blocked: the reducer, not the 3D layer, enforces order',()=>{
 const start=initialPractice('bag');
 const early=reducePractice(start,{type:'open'});
 assert.equal(early.blocked,true);
 assert.deepEqual(early.state,start);
});

test('every part and zone sits inside the visible interaction area',()=>{
 for(const [name,[x,y]] of Object.entries({shelf:PLACE.shelf,tray:PLACE.tray,bin:PLACE.bin,rest:PLACE.headRest,socket:PLACE.socket}))assert.ok(Math.abs(x)<0.9&&y>=0&&y<1.1,name);
 for(const [name,[x0,x1,y0,y1]] of Object.entries(ZONES)){assert.ok(x0<x1&&y0<y1,name);assert.ok(x0>-0.95&&x1<0.95,name+' fits the screen width');}
});

test('one-euro filter calms jitter on a held hand but follows a real move',()=>{
 let seed=7;const noise=()=>{seed=(seed*16807)%2147483647;return (seed/2147483647-0.5)*0.01;};
 const filter=createOneEuro(1);const raw=[],smooth=[];
 for(let i=0;i<150;i++){const v=0.4+noise();raw.push(v);smooth.push(filter.filter([v],i/30)[0]);}
 const spread=a=>{const m=a.reduce((s,v)=>s+v,0)/a.length;return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length);};
 assert.ok(spread(smooth.slice(30))<spread(raw.slice(30))/2.5,'jitter is at least 2.5x smaller');
 const move=createOneEuro(1);let last=0;for(let i=0;i<60;i++){last=move.filter([i<20?0:1],i/30)[0];}
 assert.ok(last>0.97,'a step of 1 m is tracked within 2 seconds, got '+last);
 const first=createOneEuro(1).filter([5],10)[0];assert.equal(first,5,'the first sample passes straight through');
});

import {placePose,anchorWorld} from '../src/sim3d/parts.js';
test('every resting place puts the grip anchor inside the zone the 2D rules expect',()=>{
 const at=(part,place)=>anchorWorld(part,placePose(part,place));
 const inside=(zone,[x,y])=>inZone(zone,x,y);
 assert.ok(inside('head',at('head','seated')),'seated head handle is in the head zone');
 assert.ok(inside('rest',at('head','rest')),'parked head handle is in the rest zone');
 assert.ok(inside('machine',at('fresh','tank')),'a bag hanging in the tank is in the tank mouth zone');
 assert.ok(inside('machine',at('used','tank')));
 assert.ok(inside('tray',at('used','tray')),'a bag on the tray is in the tray zone');
 assert.ok(inside('bin',at('used','bin')),'a bag in the bin is in the bin zone');
 // and the reverse: those places do not satisfy the wrong step
 assert.equal(inside('rest',at('head','seated')),false);assert.equal(inside('head',at('head','rest')),false);
 assert.equal(inside('tray',at('used','tank')),false);assert.equal(inside('bin',at('used','tray')),false);
 for(const part of ['clipLeft','clipRight'])for(const place of ['locked','released']){const a=at(part,place);assert.ok(Number.isFinite(a[0]+a[1]+a[2]),part+' '+place);}
 assert.throws(()=>placePose('head','nowhere')&&placePose('used','nowhere'),RangeError);
});

test('dropping each carried part exactly at its destination performs the step the lesson expects',()=>{
 const frame=type=>bagFrames.find(f=>f.actions[0].type===type);
 const drop=(type,part,place)=>{const f=frame(type),[x,y]=anchorWorld(part,placePose(part,place));return dropAction(f.from,part,x,y);};
 assert.deepEqual(drop('open','head','rest'),{type:'open'});
 assert.deepEqual(drop('close','head','seated'),{type:'close'});
 assert.deepEqual(drop('remove','used','tray'),{type:'remove'});
 assert.deepEqual(drop('dispose','used','bin'),{type:'dispose',item:'used'});
 assert.deepEqual(drop('fit','fresh','tank'),{type:'fit',item:'new'});
});
