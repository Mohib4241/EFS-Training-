import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpring,createLayerSprings,waveFactor,stageName,STOPS,revealOpening,createQuality,LAYER_WINDOWS,springEase,runView,zigzagPose,pingPong,ZIGZAG,createGlide} from '../src/look/motion.js';
import {brief,pushNote,NOTE_MS,MAX_NOTES} from '../src/look/info.js';
import {layerOf,isHidden,categorise,partRows} from '../src/look/layers.js';
import {faultsFor} from '../src/look/faults.js';
import {hardList} from '../src/hard-content.js';
import {vacuumModules,scrubberModule} from '../src/soft-content.js';

const machines=[...Object.values(vacuumModules).map(m=>[m.id,m.parts.slice(1)]),['hyper-2000b',scrubberModule.parts],...hardList.map(m=>[m.id,m.parts])];

test('a spring settles on its target with a little overshoot, never a linear tween',()=>{
 const spring=createSpring({stiffness:90,damping:.7});let peak=0,steps=0;
 while(spring.step(1/60,1)&&steps++<600)peak=Math.max(peak,spring.value);
 assert.equal(spring.value,1,'settles exactly on the target');assert.ok(peak>1&&peak<1.1,`overshoots slightly (peak ${peak.toFixed(3)})`);
 const reduced=createSpring();assert.equal(reduced.step(1/60,0.7,true),false);assert.equal(reduced.value,0.7,'reduced motion snaps to the state');
 const stable=createSpring({stiffness:400});for(let i=0;i<40;i++)stable.step(0.1,1);assert.ok(Math.abs(stable.value-1)<1e-3,'large frame times stay stable');
});

test('heavier layers are slower to settle than the shell',()=>{
 const settle=spring=>{let n=0;while(spring.step(1/60,1)&&n<900)n++;return n;},[shell,,,base]=createLayerSprings();
 assert.ok(settle(shell)<settle(base));
});

test('layers separate in waves: shell and covers, then tanks and filters, then deep internals',()=>{
 for(const [from,to] of LAYER_WINDOWS)assert.ok(from>=0&&to<=1&&to>from);
 assert.equal(waveFactor(0,0),0);for(let layer=0;layer<4;layer++){assert.equal(waveFactor(layer,0),0);assert.equal(waveFactor(layer,1),1);}
 for(let p=0;p<=1;p+=.05){const f=[0,1,2,3].map(l=>waveFactor(l,p));for(let l=1;l<4;l++)assert.ok(f[l]<=f[l-1]+1e-9,`layer ${l} never leads layer ${l-1} (progress ${p.toFixed(2)})`);}
 assert.equal(waveFactor(0,.35),1,'the shell is fully apart at "Head open"');assert.equal(waveFactor(2,.35),0,'deep internals have not moved yet');
 assert.ok(waveFactor(2,.7)>0&&waveFactor(2,.7)<1);
});

test('four named stops and a stage name for every opening',()=>{
 assert.deepEqual(STOPS.map(s=>s.label),['Assembled','Head open','Inside','Exploded']);assert.deepEqual(STOPS.map(s=>s.value),[0,35,70,100]);
 for(const s of STOPS)assert.equal(stageName(s.value),s.label);
 assert.equal(stageName(12),'Head open');assert.equal(stageName(55),'Inside');assert.equal(stageName(92),'Exploded');
 assert.equal(revealOpening(0),0);assert.equal(revealOpening(1),35);assert.equal(revealOpening(2),70);
});

test('quality drops bloom, then shadows, then pixels, and only when frames really are slow',()=>{
 const smooth=createQuality();for(let i=0;i<200;i++)assert.equal(smooth.sample(16),null);
 const slow=createQuality(),dropped=[];for(let i=0;i<1000;i++){const step=slow.sample(45);if(step)dropped.push(step);}
 assert.deepEqual(dropped,['bloom','shadows','pixels']);assert.deepEqual(slow.dropped,['bloom','shadows','pixels']);
 const stalls=createQuality();for(let i=0;i<200;i++)assert.equal(stalls.sample(i%2?16:900),null,'tab-switch stalls are ignored');
});

test('every part of all nine machines has a layer, a category and a row',()=>{
 assert.equal(machines.length,9);
 for(const [id,parts] of machines){
  const {categories,rows}=partRows(id,parts);
  assert.equal(rows.length,parts.length,`${id} rows`);assert.equal(categories.reduce((n,c)=>n+c.count,0),parts.length,`${id} category counts`);
  for(const row of rows){assert.ok([0,1,2,3].includes(row.layer));assert.match(row.tag,/^L[0-3] · \d\d$/);assert.ok(categories.some(c=>c.id===row.category));assert.match(row.color,/^#[0-9a-f]{6}$/i);}
  for(const p of parts)assert.ok(Number.isInteger(layerOf(id,p.id)),`${id}/${p.id}`);
  for(const layer of [0,1,2,3])assert.ok(parts.some(p=>layerOf(id,p.id)===layer),`${id} uses layer ${layer}`);
 }
});

test('shell and covers separate first on every machine',()=>{
 for(const [id,parts] of machines){const shell=parts.filter(p=>layerOf(id,p.id)===0);assert.ok(shell.length>0,id);}
 assert.equal(layerOf('junior-103','cover'),0);assert.equal(layerOf('junior-103','filter'),1);assert.equal(layerOf('junior-103','motor'),2);assert.equal(layerOf('motor-3ph','rotor'),3);
 assert.equal(isHidden('junior-103','motor'),true);assert.equal(isHidden('junior-103','cover'),false);assert.equal(isHidden('motor-3ph','rotor'),true);
});

test('the vacuums use the named categories, with their part counts',()=>{
 const {categories}=categorise('junior-429',vacuumModules['junior-429'].parts.slice(1));
 assert.deepEqual(categories.map(c=>c.label),['Shell and covers','Controls','Motor and air','Filtration','Power and cable','Base and wheels']);
 assert.deepEqual(categories.map(c=>c.count),[3,1,6,4,2,2]);
 const dry=categorise('junior-103',vacuumModules['junior-103'].parts.slice(1)).categories.find(c=>c.id==='filtration');assert.equal(dry.count,3);
});

test('fault finder offers qualitative conditions built from existing content, with no invented numbers',()=>{
 for(const [id,parts] of machines){
  const faults=faultsFor(id);assert.ok(faults.length>=3,`${id} has conditions`);
  for(const f of faults){
   assert.ok(f.label&&f.cause&&f.check,`${id}/${f.id} is explained`);assert.ok(f.parts.length>0&&f.parts.every(p=>parts.some(q=>q.id===p)),`${id}/${f.id} highlights real parts`);
   assert.doesNotMatch(`${f.label} ${f.cause} ${f.check}`,/\b(?:E|F|ERR)-?\d{2,}\b|\bcode\s*\d+\b/i,'no error codes');
  }
  assert.equal(new Set(faults.map(f=>f.id)).size,faults.length,`${id} condition ids are unique`);
 }
 assert.deepEqual(faultsFor('junior-103').map(f=>f.label),['Clear air path','Hose restriction','Loaded filter']);
 assert.match(faultsFor('motor-3ph').find(f=>f.label==='Recognise connection-area damage').cause,/terminal-box cover|Heat staining/);
 assert.ok(faultsFor('hyper-2000b').every(f=>/isolated from power/.test(f.check)));
});

test('camera moves ease like a spring: they start slowly, overshoot slightly and land exactly',()=>{
 assert.equal(springEase(0),0);assert.equal(springEase(1),1);assert.ok(springEase(.05)<.15,'a gentle start');
 let peak=0;for(let p=0;p<=1;p+=.01)peak=Math.max(peak,springEase(p));assert.ok(peak>1&&peak<1.06,`slight overshoot (${peak.toFixed(3)})`);
 assert.ok(springEase(.5)>.6,'most of the move is done by the middle');
});

test('starting a machine shows its flow path but keeps the outside: the shell is never made see-through, and stopping puts the flow back',()=>{
 const idle={running:false,xray:false,flow:false},run=runView({...idle,running:true});
 assert.equal(run.xray,false,'the shell stays closed while it runs');assert.equal(run.flow,true);assert.deepEqual(run.runView,{flow:false});
 assert.equal(runView(run),run,'idempotent: nothing changes on the next repaint');
 const stopped=runView({...run,running:false});assert.equal(stopped.xray,false);assert.equal(stopped.flow,false);assert.equal(stopped.runView,null);
 // "Show inside" is the learner's own choice: asked for while running, it stays; never asked for, it never appears
 const chose=runView({...run,xray:true,running:false});assert.equal(chose.xray,true,'a view the learner chose is kept');assert.equal(chose.flow,false);
 const kept=runView({...runView({running:true,xray:true,flow:true}),running:false});assert.equal(kept.xray,true);assert.equal(kept.flow,true,'a flow path they already had on stays on');
 const vacuum=runView({running:true,xray:false,air:false},'air');assert.equal(vacuum.air,true);assert.equal(vacuum.xray,false);assert.equal(runView({...vacuum,running:false},'air').air,false);
 assert.strictEqual(runView(idle),idle,'nothing happens while stopped');
});

test('the scrubber zigzag stays on its path, turns only a little and ping-pongs without jumps',()=>{
 for(let u=0;u<=1;u+=.05){const p=zigzagPose(u);assert.ok(Math.abs(p.x)<=1.0001&&p.z>=-1.31&&p.z<=1.26&&Math.abs(p.yaw)<.5,`u=${u.toFixed(2)}`);}
 assert.deepEqual([zigzagPose(0).x,zigzagPose(0).z],ZIGZAG[0]);assert.deepEqual([zigzagPose(1).x,zigzagPose(1).z],ZIGZAG[3]);
 assert.ok(zigzagPose(1/6).x>-1&&zigzagPose(1/3).x===1,'it really zigzags from side to side');
 assert.equal(pingPong(0),0);assert.equal(pingPong(1),1);assert.equal(pingPong(1.5),.5);assert.equal(pingPong(2),0);assert.equal(pingPong(-.25),.25);
});

test('a hand\'s orbit glides: steps that arrive in bursts come out as smooth shares, and nothing is lost',()=>{
 const glide=createGlide();assert.equal(glide.step(.016),null,'nothing owed, nothing moves');assert.equal(glide.pending,false);
 glide.push(.2,-.1);glide.push(.1,0);assert.equal(glide.pending,true);
 let sx=0,sy=0,previous=Infinity;
 for(let i=0;i<200&&glide.pending;i++){const [dx,dy]=glide.step(1/60);assert.ok(dx>=0&&dy<=0,'keeps its direction');assert.ok(dx<=previous+1e-4,'each share is no bigger than the last (bar the final crumb)');previous=dx;sx+=dx;sy+=dy;}
 assert.equal(glide.pending,false);assert.ok(Math.abs(sx-.3)<1e-9&&Math.abs(sy+.1)<1e-9,'the whole owed amount is delivered');
 glide.push(1,1);const [a]=glide.step(.1);assert.ok(a>0&&a<1,'a long frame never overshoots');glide.reset();assert.equal(glide.pending,false);
});

test('part notes are small: a sentence or two, cut cleanly, gone after ten seconds, and at most three at once',()=>{
 assert.equal(NOTE_MS,10000);assert.equal(MAX_NOTES,3);
 assert.equal(brief('It pulls air through the filter. It also cools the motor. A third sentence here.',60),'It pulls air through the filter. It also cools the motor.');
 assert.equal(brief('Short one.  Another short one.',150),'Short one. Another short one.');
 const long=brief('A very long sentence that keeps going without any full stop for much longer than a small note could ever hold on screen at one time',60);
 assert.ok(long.length<=60&&long.endsWith('…')&&!/\s…$/.test(long),'cut at a word, with an ellipsis');
 assert.equal(brief(undefined),'');assert.equal(brief('  '),'');
 assert.deepEqual(pushNote([],'a'),['a']);assert.deepEqual(pushNote(['b','a'],'c'),['c','b','a']);
 assert.deepEqual(pushNote(['c','b','a'],'d'),['d','c','b'],'the oldest note makes room');
 assert.deepEqual(pushNote(['c','b','a'],'a'),['a','c','b'],'showing a part again refreshes it instead of stacking a copy');
});

test('the Studio/Hologram switch is gone from every page, and the parts list has no chips or tags',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const ui=read('../src/look/ui.js'),html=read('../src/index.html'),app=read('../src/app.js'),look=read('../src/look/look.js');
 for(const [name,text] of [['ui.js',ui],['index.html',html],['app.js',app]])assert.ok(!/Hologram/i.test(text.replace(/<html[^>]*>/,'')),`${name} offers no Hologram button`);
 assert.ok(!/class="lk-switch|data-look-cycle|lk-chip|lk-tag|class="lk-detail/.test(ui),'no look switch, chips, tags or detail sheet in the controls');
 assert.match(look,/initLook\(\)\{.*setLook\('studio',false\)/,'the look is always Studio');
 assert.match(ui,/data-inside/,'a "Show inside" button exists');assert.match(ui,/lk-dock-toggle/,'the dock folds away');
});

test('the parts list, the side panel and the bottom controls each fold away on every equipment page',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const ui=read('../src/look/ui.js'),css=read('../src/look/look.css');
 assert.match(ui,/lk-parts-toggle[^>]*aria-expanded="true"/,'the parts list has a fold button');
 assert.match(ui,/lk-side-toggle[^>]*aria-expanded="true"/,'the side panel has a fold button');
 assert.match(ui,/PARTS_KEY='efs-parts',SIDE_KEY='efs-side'/,'each choice is remembered');
 assert.match(css,/\.lk-dock-closed \.lk-dock,\.look-stage\.lk-dock-closed \.lk-teardown\{display:none\}/,'"Hide controls" folds the opening slider as well as the tools');
 assert.match(css,/\.lk-parts-closed \.lk-parts \.lk-list\{display:none\}/,'a folded parts list shows only its heading');
 assert.match(css,/\.lk-side-closed \.lk-right>\.lk-slot,\.lk-side-closed \.lk-right>\.lk-notes\{display:none\}/,'a folded side panel hides the Start panel and notes');
 for(const page of ['../src/app.js','../src/hard-lab.js','../src/scrubber.js'])assert.match(read(page),/mountLookUI/,`${page} uses the shared controls, so it gets the fold buttons`);
});
