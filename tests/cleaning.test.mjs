import test from 'node:test';
import assert from 'node:assert/strict';
import {createDust,collectDust} from '../src/cleaning-state.js';

test('dust layout is deterministic and confined to the virtual tool lane',()=>{
 const dust=createDust();assert.equal(dust.length,40);assert.deepEqual(dust,createDust());
 assert.equal(new Set(dust.map(point=>point.id)).size,40);
 for(const point of dust){assert.ok(point.x>=1.05&&point.x<=1.51);assert.ok(point.z>=1&&point.z<=2.05);assert.equal(point.collected,false);}
});

test('an inactive nozzle never collects dust',()=>{
 const dust=createDust();assert.equal(collectDust(dust,{x:1.28,z:1.5,active:false}),dust);
 assert.ok(dust.every(point=>!point.collected));
});

test('pickup includes footprint edges and excludes points just outside',()=>{
 const x=1.28,z=1.5,width=.65,depth=.3;
 const dust=[
  {id:0,x:x-width/2,z:z-depth/2,collected:false},
  {id:1,x:x+width/2,z:z+depth/2,collected:false},
  {id:2,x:x+width/2+.000001,z,collected:false},
  {id:3,x,z:z-depth/2-.000001,collected:false}
 ];
 assert.deepEqual(collectDust(dust,{x,z,width,depth,active:true}).map(point=>point.collected),[true,true,false,false]);
 assert.ok(dust.every(point=>!point.collected));
});

test('pickup is cumulative, repeatable and does not mutate prior state',()=>{
 const initial=createDust();const snapshot=structuredClone(initial);
 const first=collectDust(initial,{x:1.28,z:1,active:true});
 const next=collectDust(first,{x:1.28,z:2.05,active:true});
 assert.ok(first.some(point=>point.collected));
 assert.ok(next.filter(point=>point.collected).length>first.filter(point=>point.collected).length);
 for(const point of first.filter(point=>point.collected))assert.equal(next[point.id].collected,true);
 assert.deepEqual(initial,snapshot);
 assert.equal(collectDust(next,{x:1.28,z:2.05,active:true}),next);
 assert.deepEqual(collectDust(initial,{x:1.28,z:1,active:true}),first);
});

test('invalid coordinates, dimensions, states and point data are rejected',()=>{
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>collectDust(createDust(),{x:value,z:1,active:true}),RangeError);
 for(const [width,depth] of [[0,.3],[-1,.3],[.65,0],[.65,-1],[NaN,.3],[.65,Infinity]])assert.throws(()=>collectDust(createDust(),{x:1,z:1,width,depth,active:true}),RangeError);
 assert.throws(()=>collectDust(createDust(),{x:1,z:1,active:'false'}),TypeError);
 assert.throws(()=>collectDust(null,{x:1,z:1,active:true}),TypeError);
 assert.throws(()=>collectDust([{x:NaN,z:1,collected:false}],{x:1,z:1,active:true}),TypeError);
});
