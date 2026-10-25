import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true}),out='tmp/validation';fs.mkdirSync(out,{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('efs-mute','1');const raf=requestAnimationFrame.bind(window);window.__frames=true;window.requestAnimationFrame=fn=>raf(t=>{if(window.__frames)fn(t);});});
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__app?.screen?.el);
assert.equal(await page.evaluate(()=>window.__app.stage),null,'home must not allocate WebGL');
assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/human.bin'))),false);
assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'reduced motion pauses introduction');
const go=async route=>{await page.evaluate(r=>window.__app.go(r),route);await page.waitForFunction(r=>window.__app.route===r&&window.__app.screen?.el&&!window.__app.screen.el.hidden,route,{timeout:120000,polling:100});};
await go('vacuum/sop');assert.equal(await page.evaluate(()=>__app.screen.dir.playing),false);
await page.evaluate(()=>{__app.stopFrames();window.__frames=false;});
const chapters=[];
for(let i=0;i<16;i++)chapters.push(await page.evaluate(i=>{const s=__app.screen;s.dir.goto(i,{play:false});s.paint();const transcript=s.el.querySelector('.beat-transcript').textContent;return {step:s.dir.stepIdx+1,checks:s.el.querySelectorAll('.step-checks li').length,transcript:!!transcript,current:s.el.querySelector('[aria-current=step]')?.dataset.step};},i));
assert.ok(chapters.every((s,i)=>s.step===i+1&&s.checks>0&&s.transcript&&+s.current===i));
await page.evaluate(()=>{__app.screen.dir.goto(0,{play:false});__app.screen.paint();});
await page.locator('[data-verify="1"]').click();assert.equal(await page.evaluate(()=>__app.screen.review.length),0);
await page.locator('[data-verify="0"]').click();assert.equal(await page.evaluate(()=>__app.screen.review.length),1);
assert.equal(await page.locator('.verification-feedback').getAttribute('data-state'),'correct');
await page.locator('[data-act=reset]').click();
await page.evaluate(()=>{const s=__app.screen;s.dir.goto(3,{play:false});for(let i=0;i<100;i++){s.dir.playing=true;s.dir.update(1/30);s.world().update(1/30);}s.dir.pause();__app.stage.render(1/60);s.el.querySelector('.flash').classList.remove('go');});
await page.screenshot({path:`${out}/sop-workspace.png`});
const memory=[];
for(let i=0;i<6;i++)memory.push(await page.evaluate(()=>{const s=__app.screen;s.dir.goto(0,{play:false});__app.stage.render(1/60);__app.stage.renderer.getContext().finish();return {...__app.stage.renderer.info.memory};}));
assert.equal(memory[5].geometries,memory[2].geometries,'repeated resets retain stable geometry after warmup');assert.equal(memory[5].textures,memory[2].textures,'repeated resets retain stable textures after warmup');
const labs=[];
for(const kind of ['vacuum','drill','mcb','hvac']){
 await go('lab/'+kind);await page.evaluate(()=>__app.stopFrames());
 const check=await page.evaluate(()=>{const s=__app.screen;s.choose(1);const rejected=s.progress.index===0&&s.progress.mistakes===1;s.choose(0);const accepted=s.progress.index===1;s.performer.stop();s.model.setDemonstration(false);s.restoreModel();s.select(s.def.parts[0][0]);s.action('explode');for(let i=0;i<30;i++)s.update(1/30);const exploded=s.model.explode>.5;s.action('reset-view');s.resetView();__app.stage.render(1/60);return {rejected,accepted,exploded,selected:s.selected,finite:__app.stage.camera.position.toArray().every(Number.isFinite)};});
 assert.ok(check.rejected&&check.accepted&&check.exploded&&check.finite);labs.push({kind,...check});
 if(kind==='drill')await page.screenshot({path:`${out}/drill-workspace.png`});
}
// Both alias routes remain supported; cached route visits must not allocate another stage.
for(const route of ['vacuum/parts','chiller','library','progress','labs','home']){
 await go(route);assert.equal(await page.evaluate(()=>document.activeElement.id),'screens','route navigation focuses the workspace');
 if(route==='vacuum/parts'||route==='chiller')assert.equal(await page.evaluate(async r=>__app.screen===await __app.get(r==='chiller'?'lab/hvac':'lab/vacuum'),route),true,'aliases reuse the cached lab');
}
await page.reload();await page.waitForFunction(()=>window.__app?.screen?.el);
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('efs-sop-review-v1'))),[1]);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('efs-lab-drill')).index),1);
await page.setViewportSize({width:390,height:844});const mobile=[];
for(const route of ['home','library','vacuum/sop','lab/drill']){
 await go(route);const metrics=await page.evaluate(()=>{const el=__app.screen.el;return {overflow:el.scrollWidth>el.clientWidth,bodyOverflow:document.documentElement.scrollWidth>innerWidth,unlabelled:[...el.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length};});
 assert.ok(!metrics.overflow&&!metrics.bodyOverflow);assert.equal(metrics.unlabelled,0);mobile.push({route,...metrics});
 if(route==='vacuum/sop')await page.screenshot({path:`${out}/mobile-sop.png`});
}
await context.close();
const fallback=await browser.newPage();await fallback.route('**/human.bin',r=>r.fulfill({status:503,body:'Unavailable'}));
await fallback.goto('http://127.0.0.1:5173/#/vacuum/sop');await fallback.getByText('The 3D workspace could not load').waitFor();await fallback.locator('#route-loading a[href="#/library"]').click();await fallback.getByText('Vacuum cleaning procedures',{exact:true}).waitFor();
const fallbackPassed=true;await fallback.close();
assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({chapters,memory,labs,mobile,fallbackPassed,errors},null,2));await browser.close();console.log('Browser validation passed');
