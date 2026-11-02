import test from 'node:test';
import assert from 'node:assert/strict';
import {hardList} from '../src/hard-content.js';
import {initialInspection,reduceInspection} from '../src/hard-models.js';
import {faultsFor} from '../src/look/faults.js';

const asModule=(module,list)=>({...module,checks:list.checks});

test('every Hard Services machine has three maintenance checklists, each a distinct observation exercise on real parts',()=>{
 assert.equal(hardList.length,6);
 for(const module of hardList){
  assert.equal(module.checklists.length,3,`${module.id} has three checklists`);
  assert.strictEqual(module.checklists[0].checks,module.checks,'the first checklist is the original inspection');
  assert.equal(new Set(module.checklists.map(l=>l.title)).size,3,`${module.id} titles differ`);
  const ids=module.checklists.map(l=>l.id);assert.equal(new Set(ids).size,3);
  for(const list of module.checklists){
   assert.ok(list.title&&list.summary,`${list.id} is described`);assert.equal(list.checks.length,3,`${list.id} has three areas`);
   for(const check of list.checks){assert.ok(module.parts.some(p=>p.id===check.part),`${list.id}: ${check.part} is a part of ${module.id}`);assert.ok(check.title&&check.body.length>20);}
   assert.equal(new Set(list.checks.map(c=>c.part)).size,3,`${list.id} never repeats a part`);
   assert.ok(list.checks.at(-1).finding,`${list.id} ends on a concern to report`);assert.ok(list.checks.slice(0,-1).every(c=>!c.finding),'only the last area carries the concern');
  }
 }
});

test('each checklist follows the same gates: review the lesson, isolate, observe in order, then report the concern',()=>{
 for(const module of hardList)for(const list of module.checklists){
  const m=asModule(module,list);let s=initialInspection();
  assert.equal(reduceInspection(s,{type:'practice'},m).state.phase,'lesson','practice waits for the lesson');
  for(let n=0;n<list.checks.length+2;n++)s=reduceInspection(s,{type:'step',direction:1},m).state;assert.equal(s.reviewed,true);
  s=reduceInspection(s,{type:'practice'},m).state;
  assert.equal(reduceInspection(s,{type:'check',id:list.checks[0].part},m).state.checked.length,0,'nothing is recorded before isolation');
  s=reduceInspection(s,{type:'isolate'},m).state;
  assert.equal(reduceInspection(s,{type:'check',id:list.checks[1].part},m).state.checked.length,0,'areas must be taken in order');
  for(const check of list.checks)s=reduceInspection(s,{type:'check',id:check.part},m).state;
  assert.equal(reduceInspection(s,{type:'report',choice:'clear'},m).state.complete,false,'the concern cannot be cleared');
  assert.equal(reduceInspection(s,{type:'report',choice:'report'},m).state.complete,true);
 }
});

test('checklist text is qualitative: no measured limits, torques, intervals or error codes, and no instruction to work on live equipment',()=>{
 const number=/\b\d+(?:\.\d+)?\s?(?:V|kV|mV|A|mA|Ω|ohms?|MΩ|Nm|N·m|°C|bar|kPa|rpm|Hz|kW|W|%|mm|hours?|days?|weeks?|months?)\b/i;
 for(const module of hardList)for(const list of module.checklists){
  const text=[list.title,list.summary,...list.checks.flatMap(c=>[c.title,c.body,c.finding||''])].join(' ');
  assert.doesNotMatch(text,number,`${list.id} has no measured value`);
  assert.doesNotMatch(text,/\b(?:error|fault) code\b|\bE-?\d{2,}\b/i,`${list.id} has no error codes`);
  assert.doesNotMatch(text,/(?<!\bnot )(?<!\bnever )(?<!\bdo not )\b(?:tighten|bypass|remove the cover|open the (?:real )?enclosure)\b/i,`${list.id} never tells the learner to work on real equipment`);
 }
});

test('the fault finder offers the inspection areas of every checklist',()=>{
 for(const module of hardList){
  const faults=faultsFor(module.id),total=module.checklists.reduce((n,l)=>n+l.checks.length,0);
  assert.equal(faults.length,total,`${module.id}: one condition per inspection area`);assert.equal(new Set(faults.map(f=>f.id)).size,total);
 }
});
