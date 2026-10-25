import test from 'node:test';
import './human-setup.mjs';
import assert from 'node:assert/strict';
import { Worker } from '../src/scene/worker.js';
import { TaskPerformer } from '../src/scene/task-performer.js';
import { LabModel } from '../src/scene/lab-models.js';
import { makeMaterials } from '../src/scene/mat.js';
import { SIMULATIONS } from '../src/data/simulations.js';

test('demonstrations keep moving IK targets stable and release both hands when interrupted', () => {
  const materials = makeMaterials();
  const worker = new Worker(materials);
  const screen = { worker, def: SIMULATIONS.vacuum, model: new LabModel('vacuum', materials),
    presenter: { stop() {} }, sign: {}, setTaskStatus() {} };
  const performer = new TaskPerformer(screen);
  performer.play(3); // open lid with both hands
  for (let i = 0; i < 900 && performer.phase !== 'perform'; i++) {
    performer.update(1/60); screen.model.update(1/60, i/60); worker.update(1/60);
  }
  assert.equal(performer.phase, 'perform');
  const right = worker.ik.R, left = worker.ik.L;
  assert.ok(right && left);
  const before = right.clone();
  for (let i = 0; i < 30; i++) {
    screen.model.update(1/60, i/60); performer.update(1/60); worker.update(1/60);
    assert.equal(worker.ik.R, right); assert.equal(worker.ik.L, left);
  }
  assert.ok(right.distanceTo(before) > 0, 'the hand follows the opening lid');
  performer.stop();
  assert.equal(worker.ik.R, null); assert.equal(worker.ik.L, null);
  assert.equal(worker.gripT.R, .22); assert.equal(worker.gripT.L, .22);
  assert.equal(worker.gaze, null); assert.equal(performer.running, false);
});

test('task choreography uses operating controls and keeps observations clear of equipment', () => {
  const materials = makeMaterials();
  for (const [kind,index] of [['drill',5],['vacuum',6],['mcb',3],['hvac',3],['hvac',1]]) {
    const worker = new Worker(materials);worker.place(-1.85,1.35,0);
    const screen = { worker, def: SIMULATIONS[kind], model: new LabModel(kind,materials),
      presenter: { stop() {} }, sign: {}, setTaskStatus() {} };
    const performer = new TaskPerformer(screen);performer.play(index);
    for(let i=0;i<1200 && performer.running && performer.phase!=='perform';i++){
      performer.update(1/60);screen.model.update(1/60,i/60);worker.update(1/60);
      if(kind==='hvac')assert.ok(Math.abs(worker.pos.x)>1.7||worker.pos.z>1.8,'the guide must stay outside the plant footprint');
    }
    assert.equal(performer.phase,'perform',`${kind}: task reaches its demonstration phase`);
    if(kind==='drill'){
      assert.equal(performer.contact,'trigger');assert.equal(performer.support,'body');
      assert.ok(performer.handTarget.distanceTo(screen.model.anchor('bit'))>.5,'no hand at the rotating bit');
    }
    if(kind==='vacuum')assert.equal(performer.contact,'wand');
    if(performer.observing){
      assert.equal(worker.pointT.R,1);assert.equal(worker.ik.L,null);
      assert.ok(performer.handTarget.distanceTo(screen.model.anchor(performer.contact))>.25,'inspection does not touch the component');
    }else if(kind==='hvac'){
      assert.equal(performer.contact,'panel');assert.equal(worker.ik.L,null);
      assert.ok(worker.pos.distanceTo(screen.model.anchor('panel').setY(0))<.9,'controller is within approach distance');
    }
    performer.stop();assert.equal(worker.pointT.R,0);
  }
});
