import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true}),results=[];
for(const [label,port] of [['before',5174],['after',5173]]){
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 await page.addInitScript(()=>{window.__noAdapt=true;localStorage.setItem('efs-mute','1');const raf=requestAnimationFrame.bind(window);window.__frames=true;window.requestAnimationFrame=fn=>raf(t=>{if(window.__frames)fn(t);});});
 const started=Date.now();await page.goto(`http://127.0.0.1:${port}/`);await page.waitForFunction(()=>window.__app?.screen?.el,null,{timeout:120000,polling:100});
 const startupMs=Date.now()-started;
 for(const route of ['vacuum/sop','lab/drill','lab/mcb','lab/hvac']){
  const start=Date.now();await page.evaluate(r=>__app.go(r),route);await page.waitForFunction(r=>__app.route===r&&__app.screen?.el&&!__app.screen.el.hidden,route,{timeout:120000,polling:100});
  const readyMs=Date.now()-start;
  const sample=await page.evaluate(()=>{
   const a=__app,s=a.stage;a.screen.pause?.();a.stopFrames?.();window.__frames=false;
   // Same canvas/DPR in both builds. Submission timings are not GPU timings; frame cadence is measured separately below.
   Object.assign(a.host.style,{left:'0px',top:'0px',right:'auto',bottom:'auto',width:'800px',height:'600px'});
   s.gov.setMode('high');s.level=2;s.scale=1;s.setLevel(2);s.resize();
   const gl=s.renderer.getContext();for(let i=0;i<2;i++){s.render(1/60);gl.finish();}
   const samples=[];s.renderer.info.autoReset=false;let calls,triangles;
   for(let i=0;i<5;i++){s.renderer.info.reset();const t=performance.now();s.render(1/60);gl.finish();samples.push(performance.now()-t);calls=s.renderer.info.render.calls;triangles=s.renderer.info.render.triangles;}
   s.renderer.info.autoReset=true;samples.sort((a,b)=>a-b);
   return {renderSubmitSamplesMs:samples,medianSubmitMs:samples[2],drawCalls:calls,triangles,...s.renderer.info.memory,drawingBuffer:[s.renderer.domElement.width,s.renderer.domElement.height]};
  });
  const cadence=await page.evaluate(()=>new Promise(resolve=>{
   const app=__app;window.__frames=true;let previous,start,count=0;const intervals=[];
   function frame(now){if(previous!==undefined){const dt=(now-previous)/1000;app.frame(dt);intervals.push(dt);count++;}else start=now;previous=now;if(count<18)requestAnimationFrame(frame);else{window.__frames=false;resolve({animationFrameFps:count*1000/(now-start),frameIntervalsMs:intervals.map(t=>t*1000)});}}
   requestAnimationFrame(frame);
  }));
  results.push({label,route,startupMs,readyMs,...sample,...cadence});console.log(label,route,cadence.animationFrameFps.toFixed(2));
 }
 await page.close();
}
fs.mkdirSync('tmp/validation',{recursive:true});fs.writeFileSync('tmp/validation/render-benchmark.json',JSON.stringify(results,null,2));await browser.close();
