// Run against a built app: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/browser-audit.mjs baseline
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const label=process.argv[2]||'after',out=`tmp/audit-${label}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{window.__noAdapt=true;localStorage.setItem('efs-mute','1');});
const start=Date.now();await page.goto(process.env.AUDIT_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__app?.screen?.el&&!document.querySelector('#boot'),null,{timeout:120000});
const result={environment:'Headless Chromium on this Mac; software/browser rendering, not representative desktop or mobile GPU certification',startupMs:Date.now()-start,routes:[],errors,failed};
for(const route of ['home','library','vacuum/sop','vacuum/instructions','lab/vacuum','lab/drill','lab/mcb','lab/hvac','progress','labs']){
 const started=Date.now();await page.evaluate(r=>window.__app.go(r),route);await page.waitForFunction(r=>window.__app.route===r&&window.__app.screen?.el&&!window.__app.screen.el.hidden,route,{timeout:120000});
 const stats=await page.evaluate(()=>{const a=window.__app,s=a.stage; a.screen.pause?.();if(!s||a.host.style.visibility==='hidden')return {has3D:false};s.gov.setMode('high');s.setLevel(2);s.resize();s.renderer.info.autoReset=false;s.renderer.info.reset();const t=performance.now();s.render(1/60);const elapsed=performance.now()-t;const info=s.renderer.info;const gl=s.renderer.getContext();const ext=gl.getExtension('WEBGL_debug_renderer_info');const stats={has3D:true,renderSubmitMs:elapsed,drawCalls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};info.autoReset=true;return stats;});
 result.routes.push({route,enterMs:Date.now()-started,...stats});
 if(['home','vacuum/sop','lab/drill'].includes(route))await page.screenshot({path:`${out}/${route.replaceAll('/','-')}.png`});
 console.log(route,stats);
}
await page.setViewportSize({width:390,height:844});
for(const route of ['home','library','vacuum/sop','lab/drill']){await page.evaluate(r=>window.__app.go(r),route);await page.waitForFunction(r=>window.__app.route===r&&!window.__app.screen.el.hidden,route);await page.screenshot({path:`${out}/mobile-${route.replaceAll('/','-')}.png`});result.routes.push({route,mobile:true,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,screenOverflow:window.__app.screen.el.scrollWidth>window.__app.screen.el.clientWidth}))});}
result.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,bytes:r.transferSize,durationMs:Math.round(r.duration)})));
fs.writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();
if(errors.length||failed.some(x=>!x.includes('fonts.')))process.exitCode=1;
