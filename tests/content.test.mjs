import test from 'node:test';import assert from 'node:assert/strict';
import {parts,specs,airflowLesson,hardServices,operatorChecks} from '../src/content.js';
import {initialState,transition,openingFromPixels} from '../src/machine-state.js';
test('every selectable assembly has role, movement, cause and evidence',()=>{assert.equal(new Set(parts.map(p=>p.id)).size,18);for(const p of parts)for(const k of ['id','name','title','body','why','motion','evidence'])assert.ok(p[k],`${p.id} missing ${k}`);});
test('unit ratings remain distinct from supplier data',()=>{assert.deepEqual(specs.find(s=>s[0]==='Power markings'),['Power markings','950 W / 1150 W max','Unit nameplate']);assert.equal(specs.find(s=>s[0]==='Tank capacity')[2],'Supplier catalogue');});
test('fault explanations avoid invented output data',()=>{for(const c of ['hose','filter']){assert.match(airflowLesson(c).text,/resistance/);assert.doesNotMatch(airflowLesson(c).text,/\d+\s*(Pa|m³|%|W)/);}assert.throws(()=>airflowLesson('bad'),RangeError);assert.throws(()=>airflowLesson('__proto__'),RangeError);});
test('hard-services catalogue contains the requested names only',()=>{const names=[];function read(items){for(const i of items){assert.ok(Object.keys(i).every(k=>['name','children'].includes(k)));names.push(i.name);if(i.children)read(i.children);}}read(hardServices);assert.deepEqual(names,['Motors','Induction','1 Phase','3 Phase','Alternator','Instruments','Megger','Multimeter','HVAC','Cascade']);});
test('operation requires connection and opening isolates the machine',()=>{let s=initialState();assert.equal(transition(s,{type:'power'}).state.running,false);s=transition(s,{type:'plug'}).state;assert.equal(s.connected,true);assert.equal(s.running,false);s=transition(s,{type:'power'}).state;assert.equal(s.running,true);const opened=transition(s,{type:'open',value:70}).state;assert.equal(opened.running,false);assert.equal(opened.connected,false);assert.equal(transition(opened,{type:'plug'}).state.connected,false);assert.equal(s.open,0);});
test('disconnect stops the motor and reset restores the full initial state',()=>{let s={...initialState(),running:true,connected:true,xray:true,condition:'filter'};assert.equal(transition(s,{type:'plug'}).state.running,false);assert.deepEqual(transition(s,{type:'reset'}).state,initialState());for(const value of [-1,101,NaN,Infinity])assert.throws(()=>transition(s,{type:'open',value}),RangeError);});
test('checklist contains distinct operator inspection items',()=>{assert.equal(operatorChecks.length,6);assert.equal(new Set(operatorChecks.map(c=>c.id)).size,6);assert.match(operatorChecks[0].text,/unplugged/);});
test('gesture reveal reverses and clamps at assembled and exploded limits',()=>{
 assert.equal(openingFromPixels(0,100),12);assert.equal(openingFromPixels(12,-100),0);
 assert.equal(openingFromPixels(90,1000),100);assert.equal(openingFromPixels(0,-1000),0);
 assert.equal(openingFromPixels(40,0),40);
 for(const pixels of [NaN,Infinity])assert.throws(()=>openingFromPixels(50,pixels),RangeError);
});
test('gesture reveal isolates power, while an unchanged assembled gesture does not misreport power',()=>{
 const running={...initialState(),running:true,connected:true};
 const unchanged=transition(running,{type:'open',value:openingFromPixels(0,-100)});
 assert.equal(unchanged.state.running,true);assert.equal(unchanged.message,'');
 const revealed=transition(running,{type:'open',value:openingFromPixels(0,100)});
 assert.equal(revealed.state.connected,false);assert.equal(revealed.state.running,false);
});
