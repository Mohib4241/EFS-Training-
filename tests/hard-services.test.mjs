import test from 'node:test';
import assert from 'node:assert/strict';
import {hardList,getHardModule} from '../src/hard-content.js';
import {hardServices} from '../src/content.js';
import {initialHardState,calculateHard,reduceHard,initialInspection,reduceInspection} from '../src/hard-models.js';
const change=(s,key,value)=>reduceHard(s,{type:'input',key,value}).state;
const act=(s,type,extra={})=>reduceHard(s,{type,...extra}).state;
const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);

test('every existing Hard Services leaf resolves to a researched equipment module',()=>{
 const paths=[];function walk(items,path=[]){for(const item of items){const p=[...path,item.name];if(item.children)walk(item.children,p);else paths.push(p.join('/'));}}walk(hardServices);
 assert.equal(hardList.length,6);assert.deepEqual(hardList.map(m=>m.path.join('/')),paths);
 for(const module of hardList){assert.ok(module.parts.length>=10);assert.equal(new Set(module.parts.map(p=>p.id)).size,module.parts.length);for(const part of module.parts)for(const key of ['name','group','body','why','motion'])assert.ok(part[key],`${module.id}/${part.id}: ${key}`);assert.ok(module.equations.length>=2&&module.variables&&module.assumptions&&module.sources.length);for(const source of module.sources)assert.ok(source.url.startsWith('https://'));for(const check of module.checks)assert.ok(module.parts.some(p=>p.id===check.part));assert.ok(module.checks.at(-1).finding);assert.ok(module.quiz.answers[module.quiz.correct]);}
 assert.throws(()=>getHardModule('__proto__'),RangeError);
});
test('four-pole 50 Hz induction reference is 1500 rpm field, 1440 rpm rotor and 2 Hz slip frequency',()=>{
 for(const id of ['motor-1ph','motor-3ph']){const s=initialHardState(id),m=calculateHard(s);assert.equal(m.synchronous,1500);assert.equal(m.speed,1440);assert.equal(m.rotorFrequency,2);assert.equal(s.connected,false);assert.equal(s.running,false);}
 const single=getHardModule('motor-1ph');assert.equal(single.inputs.some(p=>p.key==='airgap'),false);assert.match(single.assumptions,/backward field/);
});
test('three-phase air-gap example conserves power and excludes mechanical losses',()=>{
 const m=calculateHard(initialHardState('motor-3ph'));assert.equal(m.copper,40);assert.equal(m.converted,960);
 for(const slip of [1,4,10])for(const watts of [100,1000,5000]){let s=change(initialHardState('motor-3ph'),'slip',slip);s=change(s,'airgap',watts);const result=calculateHard(s);close(result.copper+result.converted,watts);assert.ok(result.speed<result.synchronous&&result.speed>0);}
});
test('pole and frequency changes are kinematic; direction and fault interlocks are explicit',()=>{
 let s=change(initialHardState('motor-3ph'),'poles',2);s=change(s,'frequency',60);assert.equal(calculateHard(s).synchronous,3600);s=change(s,'sequence','ACB');assert.equal(calculateHard(s).direction,-1);
 s=act(act(s,'connect'),'run');assert.equal(s.running,true);s=change(s,'supply','lost');assert.equal(s.running,false);assert.equal(calculateHard(s).canRun,false);assert.equal(calculateHard(s).metrics[1].value,null);
 let single=change(initialHardState('motor-1ph'),'startCircuit','open');single=act(act(single,'connect'),'run');assert.equal(single.running,false);assert.equal(calculateHard(single).canRun,false);
});
test('open-circuit alternator reference separates frequency from excitation',()=>{
 let s=initialHardState('alternator');assert.equal(calculateHard(s).frequency,50);assert.equal(calculateHard(s).emfPU,1);s=change(s,'speed',1800);assert.equal(calculateHard(s).frequency,60);s=change(s,'flux',.5);close(calculateHard(s).emfPU,.6);assert.equal(calculateHard(s).frequency,60);
});
test('Megger example uses microamp units and rejects a non-isolated test',()=>{
 let s=initialHardState('megger');assert.equal(calculateHard(s).leakage,5);s=act(act(s,'connect'),'run');assert.equal(s.running,false);s=change(s,'isolated',true);s=act(s,'run');assert.equal(s.running,true);assert.equal(s.residualV,500);assert.equal(s.testPhase,'testing');
 assert.equal(act(s,'connect').connected,true);assert.equal(act(s,'open',{value:100}).open,0);assert.equal(change(s,'testVoltage',1000).inputs.testVoltage,500);
 s=act(s,'run');assert.equal(s.testPhase,'discharging');s=act(s,'tick',{dt:1});close(s.residualV,183.93972058572117);for(let n=0;n<8;n++)s=act(s,'tick',{dt:1});assert.equal(s.residualV,0);assert.equal(s.testPhase,'idle');s=change(s,'testVoltage',1000);assert.equal(calculateHard(s).leakage,10);
});
test('multimeter validates function, jack and source state before returning an ideal reading',()=>{
 let s=initialHardState('multimeter');assert.equal(calculateHard(s).value,24);s=change(s,'function','A');assert.equal(calculateHard(s).value,null);s=change(s,'jack','A');assert.equal(calculateHard(s).value,24);assert.equal(calculateHard(s).unit,'mA');s=change(s,'isolated',true);assert.equal(calculateHard(s).value,0);
 s=change(s,'function','Ω');assert.equal(calculateHard(s).canRun,false);s=change(s,'jack','VΩ');assert.equal(calculateHard(s).value,1000);s=change(s,'isolated',false);assert.equal(calculateHard(s).value,null);assert.match(calculateHard(s).explanation,/isolated/);
});
test('HVAC cascade requests stages, rotates by example hours and exposes insufficient capacity',()=>{
 let s=initialHardState('cascade'),m=calculateHard(s);assert.deepEqual(m.requested,[1,2]);assert.equal(m.delivered,60);assert.equal(m.unmet,0);close(m.massFlow,2.8708133971291865);
 s=change(s,'strategy','fixed');assert.deepEqual(calculateHard(s).requested,[0,1]);s=change(s,'demand',100);s=change(s,'unavailable',2);m=calculateHard(s);assert.deepEqual(m.requested,[0,2]);assert.equal(m.delivered,80);assert.equal(m.unmet,20);assert.equal(m.capacity,80);
 s=change(s,'flowProved',false);m=calculateHard(s);assert.deepEqual(m.requested,[]);assert.equal(m.delivered,0);assert.equal(m.unmet,100);assert.equal(m.canRun,false);
});
test('cascade thermal accounting holds at zero, stage thresholds and overload',()=>{
 for(const demand of [0,5,40,45,80,85,120,150]){let s=change(initialHardState('cascade'),'demand',demand);const m=calculateHard(s);assert.equal(m.delivered+m.unmet,demand);assert.ok(m.requested.length<=3);assert.ok(m.modulation>=0&&m.modulation<=1);if(demand===0){assert.equal(m.requested.length,0);assert.equal(m.massFlow,0);}}
});
test('opening isolates running equipment and reset restores defaults without mutating prior state',()=>{
 for(const id of ['motor-1ph','motor-3ph','alternator','multimeter','cascade']){const initial=initialHardState(id);let s=act(act(initial,'connect'),'run');assert.equal(s.running,true);s=act(s,'open',{value:70});assert.equal(s.running,false);assert.equal(s.connected,false);assert.equal(act(s,'connect').connected,false);assert.equal(initial.open,0);assert.deepEqual(act(s,'reset'),initial);}
});
test('unsupported input types, prototype keys, non-finite values and out-of-range inputs are rejected',()=>{
 const s=initialHardState('motor-3ph');for(const value of [NaN,Infinity,24,61,50.2])assert.throws(()=>change(s,'frequency',value),RangeError);assert.throws(()=>change(s,'poles',3),RangeError);assert.throws(()=>change(s,'__proto__',1),RangeError);assert.throws(()=>act(s,'open',{value:101}),RangeError);assert.throws(()=>change(initialHardState('cascade'),'flowProved','yes'),RangeError);assert.throws(()=>act(s,'tick',{dt:-1}),RangeError);
});
test('every inspection requires lesson review, isolation, ordered observations and reporting a concern',()=>{
 for(const module of hardList){let s=initialInspection();assert.equal(reduceInspection(s,{type:'practice'},module).state.phase,'lesson');for(let n=0;n<module.checks.length+2;n++)s=reduceInspection(s,{type:'step',direction:1},module).state;assert.equal(s.reviewed,true);assert.equal(s.complete,false);s=reduceInspection(s,{type:'practice'},module).state;assert.equal(reduceInspection(s,{type:'check',id:module.checks[0].part},module).state.checked.length,0);s=reduceInspection(s,{type:'isolate'},module).state;assert.equal(reduceInspection(s,{type:'check',id:module.checks[1].part},module).state.checked.length,0);for(const check of module.checks)s=reduceInspection(s,{type:'check',id:check.part},module).state;assert.equal(reduceInspection(s,{type:'report',choice:'clear'},module).state.complete,false);assert.equal(reduceInspection(s,{type:'report',choice:'report'},module).state.complete,true);}
});
