import test from 'node:test';
import assert from 'node:assert/strict';
import { SIMULATIONS, readProgress, decide } from '../src/data/simulations.js';
import { LabModel } from '../src/scene/lab-models.js';
import { makeMaterials } from '../src/scene/mat.js';

test('every scenario requires all decisions and knowledge checks; wrong answers never advance',()=>{
  for(const [kind,d] of Object.entries(SIMULATIONS)){
    let p=readProgress(kind,'invalid');assert.equal(p.index,0);
    const first=decide(kind,p,1);assert.equal(first.index,0);assert.equal(first.mistakes,1);
    for(const item of [...d.steps,...d.quiz]){
      assert.ok(item.choices.length>=2);assert.ok(d.sources.length);assert.ok(d.safety.length>30);
      p=decide(kind,p,item.answer);assert.equal(p.accepted,true);
    }
    assert.equal(p.index,d.steps.length+d.quiz.length);
    assert.equal(decide(kind,p,0).accepted,false);
    assert.equal(readProgress(kind,'{"index":9999,"mistakes":-3}').index,p.index);
    assert.equal(readProgress(kind,'{"index":-5}').index,0);
    assert.equal(decide(kind,{index:0,mistakes:0},-1).index,0);
  }
});
test('every lab builds, includes all selectable parts and supports finite animated states',()=>{
  const materials=makeMaterials();
  for(const [kind,d]of Object.entries(SIMULATIONS)){
    const model=new LabModel(kind,materials);
    for(const [part]of d.parts)assert.ok(model.parts[part],`${kind}: missing ${part}`);
    model.explodeTarget=1;model.flowOn=true;
    for(let i=0;i<40;i++)model.update(1/30,i/30);
    for(const step of d.steps){model.setActions(d.steps.slice(0,d.steps.indexOf(step)+1).map(s=>s.action));model.update(.033,3);}
    model.root.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite),`${kind}: invalid position`);});
    assert.ok(model.anchor(d.parts[0][0]).toArray().every(Number.isFinite));
  }
});
test('chiller interlocks override demand; fault requires explicit restoration',()=>{
 const m=new LabModel('hvac',makeMaterials());m.demand=100;
 m.setActions(['run','stage-lag']);assert.equal(m.plantState().stages,0);
 m.setActions(['pumps','run','stage-lag']);assert.equal(m.plantState().stages,2);
 m.demand=40;assert.equal(m.plantState().stages,1);
 m.setActions(['pumps','run','stage-lag','fault']);assert.equal(m.plantState().stages,0);assert.equal(m.plantState().alarm,true);
 m.setActions(['pumps','run','stage-lag','fault','restore']);assert.equal(m.plantState().stages,1);
 m.setActions(['pumps','run','restore','finish']);assert.equal(m.plantState().stages,0);
});
