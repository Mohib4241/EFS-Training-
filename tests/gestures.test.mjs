import test from 'node:test';
import assert from 'node:assert/strict';
import { Gestures } from '../src/interaction/gestures.js';
const hand=(x=.5,pinch=false)=>{
 const h=Array.from({length:21},()=>({x,y:.55,z:0}));h[0]={x,y:.9,z:0};
 for(let finger=0;finger<4;finger++){const b=5+finger*4;for(let j=0;j<4;j++)h[b+j]={x:x-.15+finger*.1,y:.65-j*.11,z:0};}
 h[4]={x:h[8].x+(pinch?.01:.18),y:h[8].y,z:0};return h;
};
test('quick pinch selects once, sustained motion or hand loss never clicks',()=>{
 const g=new Gestures();g.update([hand()],0);g.update([hand(.5,true)],100);
 assert.ok(g.update([hand()],200).select);assert.equal(g.update([hand()],210).select,undefined);
 g.update([hand(.5,true)],300);g.update([hand(.7,true)],400);assert.equal(g.update([hand(.7)],500).select,undefined);
 g.update([hand(.5,true)],600);g.update([],650);assert.equal(g.update([hand()],700).select,undefined);
});
test('two hands open the assembly continuously, clamp range, and suppress clicks',()=>{
 const g=new Gestures();g.update([hand(.3),hand(.7)],0,.3);
 const r=g.update([hand(.1),hand(.9)],100,.3);assert.equal(r.explode,1);assert.equal(r.select,undefined);
 g.update([],200);g.update([hand(.1),hand(.9)],300,.5);
 assert.equal(g.update([hand(.49),hand(.51)],400,.5).explode,0);
});
