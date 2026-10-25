import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationScreen } from '../src/screens/simulation.js';

test('hand selection activates available tasks but cannot click through controls or start a camera',()=>{
  const previous=globalThis.document;let hit,clicks=0,picks=0;
  const button={dataset:{task:'0'},disabled:false,click(){clicks++;}};
  const node={closest(){return button;},classList:{contains(){return false;}}};
  const screen={el:{contains:n=>n===hit},hands:{active:true},pickAt(){picks++;},handTargetAt:SimulationScreen.prototype.handTargetAt};
  globalThis.document={elementFromPoint(){return hit;}};
  try{
    hit=node;SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(clicks,1);assert.equal(picks,0);
    button.disabled=true;SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(clicks,1);assert.equal(picks,0);
    button.disabled=false;button.dataset={action:'hands'};screen.hands.active=false;
    SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(clicks,1,'gesture cannot start a camera');
    screen.hands.active=true;SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(clicks,2,'gesture can stop an active camera');
    hit={closest(){return null;},classList:{contains:name=>name==='lab-orbit'}};
    SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(picks,1);
    hit={closest(){return null;},classList:{contains(){return false;}}};
    SimulationScreen.prototype.handSelectAt.call(screen,100,200);assert.equal(picks,1,'foreground panels block geometry selection');
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('every demonstration is available before assessment and never awards progress',()=>{
  const progress={index:0,mistakes:0};let played=-1,selected;
  const screen={progress,def:{steps:Array.from({length:7},(_,i)=>({focus:`part-${i}`}))},performer:{play(i){played=i;}},select(id){selected=id;}};
  SimulationScreen.prototype.demonstrate.call(screen,5);
  assert.equal(played,5);assert.equal(selected,'part-5');assert.deepEqual(progress,{index:0,mistakes:0});
  SimulationScreen.prototype.demonstrate.call(screen,7);assert.equal(played,5);
});
