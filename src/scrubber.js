import {scrubberModule as machine} from './soft-content.js';
import {createHardViewer} from './hard-viewer.js';
import {initialScrubber,reduceScrubber,scrubberResult} from './scrubber-state.js';
import {initialInspection,reduceInspection} from './hard-models.js';
import {mountLookUI} from './look/ui.js';
import {faultsFor} from './look/faults.js';
import {isHidden,layerOf} from './look/layers.js';
import {revealOpening} from './look/motion.js';
import {handHandle} from './look/hand-lazy.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountScrubber(container,{guidance,onNavigate,onMachine}){
 let state=initialScrubber(),inspection=initialInspection(),mode='explore',viewer=null,ui=null,timer=null,active=false,autoRotate=true,tourSnapshot=null;
 const q=selector=>container.querySelector(selector),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const frames=[{part:'overview',title:'Isolate before inspection',body:'Stop the machine and isolate the virtual battery. Real isolation and stored energy checks need the exact authorised procedure.'},...machine.checks,{part:'filter',title:'Keep a visible defect out of service',body:'The training filter has a damaged rim. Keep the machine isolated and report it. Do not bypass a filter or float.'}];
 container.innerHTML=`<div class="page-heading equipment-heading"><div><span class="eyebrow">SOFT SERVICES · SCRUBBER DRYERS · LAVOR</span><h1>HYPER 2000B<span>.</span></h1><p>${machine.intro}</p></div><span class="module-badge">24 V DC<small>Battery capacity & charge unverified</small></span></div><div class="hl-mode-row"><button data-mode="explore" aria-pressed="true">Explore the parts</button><button data-mode="maintenance" aria-pressed="false">Maintenance lesson & practice</button></div>
 <div class="hl-layout"><div class="hl-centre"><section class="hl-explorer"><div class="hl-viewport"><canvas tabindex="0" aria-label="HYPER 2000B schematic model. Hover to identify, drag to rotate, scroll or pinch to reveal. Arrow Up and Down reveal; Home assembles; End explodes. Camera buttons zoom."></canvas><div class="hl-tooltip" hidden role="tooltip"><span></span><strong></strong></div><div class="hl-scene-note">CONCEPTUAL GEOMETRY · MOTION SLOWED</div><p class="hl-fallback" hidden>3D is unavailable. Use the component list, written guides and keyboard practice.</p></div><div class="hl-view-controls"><button data-action="reset">Reset machine</button></div><div class="hl-power"><div class="hl-power-buttons"><button data-action="connect">Enable virtual battery</button><button data-action="run">Run demonstration</button></div><p data-feedback role="status"></p></div></section>
 <section class="scrubber-functions"><span class="eyebrow">THREE DIFFERENT JOBS</span><h2>Loosen. Agitate. Recover.</h2><div>${[['solution','Solution feed'],['brush','Brush'],['suction','Suction recovery']].map(([key,label])=>`<label><input type="checkbox" data-function="${key}" checked> ${label}</label>`).join('')}</div><p data-cause></p><small>Parked conceptual demonstration · no predicted coverage, water use, runtime or battery percentage.</small></section>
 <section class="hl-maintenance" data-maintenance hidden><span class="eyebrow">LESSON → ORDERED OBSERVATION PRACTICE</span><h2 data-lesson-title></h2><p data-lesson-copy></p><div data-lesson-controls class="hl-lesson-controls"><button data-inspection="play">Play lesson</button><button data-inspection="previous" aria-label="Previous scrubber lesson step">‹</button><button data-inspection="next" aria-label="Next scrubber lesson step">›</button><button data-inspection="practice">Start practice →</button></div><div data-practice hidden><button data-inspection="isolate">Record virtual isolation</button><ol class="scrubber-inspection"></ol><button data-inspection="report">Remove from use & report</button><button data-inspection="clear">Return to use</button><button data-inspection="lesson">Watch lesson again</button></div><p data-inspection-feedback role="status"></p><small>Observation only. No battery terminal work, live testing or certified maintenance is taught.</small></section></div>
 <section class="hl-learn" aria-label="Reference and scope"><details open><summary>Nameplate & reference facts</summary><dl>${machine.facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></details><details><summary>Scope & sources</summary><p>Fidelity A: conceptual geometry and functional paths, not a service drawing. Initial state: assembled, isolated, stopped, all three functions selected. No quantitative performance calculation. The supplied photographs are reference evidence only. Filter and float fitment are unverified.</p>${machine.sources.map(s=>`<a target="_blank" rel="noopener noreferrer" href="${escape(s.url)}">${s.title} ↗</a>`).join('')}</details></section></div>`;
 const startup=document.createElement('details');startup.className='startup-panel';startup.innerHTML='<summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/></svg><span>Start the machine</span></summary>';q('.hl-viewport').append(startup);startup.append(q('.hl-power'));
 function tourStart(){tourSnapshot={...state,inputs:{...state.inputs}};stopLesson();state={...initialScrubber(),inputs:{...state.inputs}};viewer?.clearHover();viewer?.cameraAction('reset');render();}
 function tourFrame(frame,kind){
  startup.open=kind==='machine'&&['connect','run','isolate'].includes(frame.id);
  if(kind==='page'){
   if(frame.id==='rotate')viewer?.cameraAction('rotate-left',true);if(frame.id==='open')dispatch({type:'open',value:55});if(frame.id==='close')dispatch({type:'open',value:0});if(frame.id==='zoom-in'||frame.id==='zoom-out'){guidance.setFocused(false);viewer?.cameraAction(frame.id,true);}
  }else{
   if(frame.id==='connect'&&!state.connected)dispatch({type:'connect'});
   if(frame.id==='run'){if(!state.connected)dispatch({type:'connect'});if(!state.running)dispatch({type:'run'});}
   if(frame.id==='identify'){state.part='controls';render();}
   if(frame.id==='mechanism'){state.xray=true;render();}
   if(frame.id==='isolate')dispatch({type:'isolate'});
  }
 }
 function tourEnd(preserve){if(!preserve)guidance.setFocused(true);if(!preserve&&tourSnapshot){state={...tourSnapshot,connected:false,running:false};startup.open=false;viewer?.cameraAction('reset');render();}tourSnapshot=null;}
 function stopLesson(){clearInterval(timer);timer=null;inspection={...inspection,playing:false};}
 function part(id){if(id!=='overview'&&!machine.parts.some(p=>p.id===id))return;state={...state,part:id};if(isHidden('hyper-2000b',id)){if(state.running)state.xray=true;else{state=reduceScrubber(state,{type:'open',value:Math.max(state.open,revealOpening(layerOf('hyper-2000b',id)))}).state;state.xray=true;}}if(mode==='maintenance'&&inspection.phase==='practice'){const out=reduceInspection(inspection,{type:'check',id},machine);inspection=out.state;q('[data-inspection-feedback]').textContent=out.message;if(out.blocked)guidance.notify('Complete the previous step. '+out.message);else guidance.clearNotice();}render();}
 function render(){
  const result=scrubberResult(state);
  container.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  q('[data-action=connect]').textContent=state.connected?'Isolate virtual battery':'Enable virtual battery';q('[data-action=run]').textContent=state.running?'Stop demonstration':'Run demonstration';for(const key of ['connect','run'])q(`[data-action=${key}]`).disabled=mode==='maintenance';for(const input of container.querySelectorAll('[data-function]')){input.checked=state.inputs[input.dataset.function];input.disabled=mode==='maintenance';}q('[data-cause]').textContent=result.explanation;
  q('[data-maintenance]').hidden=mode!=='maintenance';const f=frames[inspection.step],lesson=inspection.phase==='lesson';q('[data-lesson-controls]').hidden=!lesson;q('[data-practice]').hidden=lesson;q('[data-inspection=practice]').disabled=!inspection.reviewed;
  q('[data-inspection=play]').textContent=inspection.playing?'Pause lesson':'Play lesson';q('[data-lesson-title]').textContent=lesson?`${inspection.step+1} / ${frames.length} · ${f.title}`:inspection.complete?'Practice complete':!inspection.isolated?'Record virtual isolation first':`${inspection.checked.length} / 3 observations`;
  q('[data-lesson-copy]').textContent=lesson?f.body:inspection.complete?'The damaged filter was reported. The machine stays isolated. This is not a maintenance certificate.':machine.checks[inspection.checked.length]?.body||'A damaged filter rim is shown. Remove from use and report it.';
  q('[data-inspection=isolate]').disabled=inspection.isolated;for(const command of ['report','clear'])q(`[data-inspection=${command}]`).disabled=inspection.complete;q('.scrubber-inspection').innerHTML=machine.checks.map((c,n)=>`<li><button data-observe="${c.part}" ${inspection.complete?'disabled':''} aria-current="${n===inspection.checked.length?'step':'false'}">${n<inspection.checked.length?'✓':n+1} · ${c.title}</button></li>`).join('');
  state.glowParts=faultsFor('hyper-2000b').find(f=>f.id===state.fault)?.parts||[];ui?.update();
  viewer?.setState({...state,autoRotate,targetPart:mode==='maintenance'?(lesson?f.part:inspection.isolated?machine.checks[inspection.checked.length]?.part:null):null,inspectionFault:mode==='maintenance'&&(inspection.phase==='practice'||inspection.step===frames.length-1),guidePlaying:mode==='maintenance'&&inspection.playing},result);
 }
 // ---- shared look-and-controls ----
 const patch=changes=>{state={...state,...changes};render();};
 const adapter={
  machine:{id:'hyper-2000b',name:machine.name,intro:machine.intro},
  parts:machine.parts,
  safety:'Stop the machine and isolate the virtual battery before inspecting. Real battery isolation and stored-energy checks follow the exact authorised procedure.',
  source:'Conceptual geometry and functional paths (Fidelity A), not a service drawing. Filter and float fitment are unverified. Lavor HYPER 2000B manufacturer sheet.',
  get(){return {part:state.part,open:state.open,fault:state.fault||'',flags:{xray:state.xray,callouts:state.labels,flow:Boolean(state.flow),guides:Boolean(state.guides),glow:state.glow!==false,orbit:autoRotate}};},
  select:id=>part(id||'overview'),
  setOpen:value=>dispatch({type:'open',value}),
  setFlag(name,on){if(name==='orbit'){guidance.setAutoRotate(on);return;}if(name==='xray'||name==='labels'||name==='callouts'){const key=name==='xray'?'xray':'labels';if(state[key]!==on)dispatch({type:key});return;}patch({[name]:on});},
  setFault:id=>patch({fault:id}),
  camera:(name,animate)=>viewer?.cameraAction(name,animate),
  flyTo:id=>viewer?.flyTo(id),
  onFocus:value=>{guidance.setFocused(value);viewer?.hands.invalidate();},
  hand:handHandle(()=>({host:q('.hl-viewport'),ui,adapter,viewer:()=>viewer,nextMachine:onMachine}))
 };
 function inspectionAction(type){
  if(type==='play'){if(timer){stopLesson();render();return;}inspection=reduceInspection(inspection,{type:'play'},machine).state;state={...state,part:frames[inspection.step].part};render();timer=setInterval(()=>{const atEnd=inspection.step===frames.length-1;inspection=reduceInspection(inspection,{type:'step',direction:1},machine).state;if(atEnd)stopLesson();else inspection={...inspection,playing:true};state={...state,part:frames[inspection.step].part};render();},2900);return;}
  stopLesson();const action=['next','previous'].includes(type)?{type:'step',direction:type==='next'?1:-1}:['report','clear'].includes(type)?{type:'report',choice:type}:{type};
  if(type==='isolate')state=reduceScrubber(state,{type:'isolate'}).state;
  const out=reduceInspection(inspection,action,machine);inspection=out.state;q('[data-inspection-feedback]').textContent=out.message;if(out.blocked)guidance.notify('Complete the previous step. '+out.message);else guidance.clearNotice();if(inspection.phase==='lesson')state={...state,part:frames[inspection.step].part};render();
 }
 function setMode(next){stopLesson();mode=next;if(mode==='maintenance'){state=reduceScrubber(state,{type:'isolate'}).state;state.open=0;}render();}
 function dispatch(action){const out=reduceScrubber(state,action);state=out.state;q('[data-feedback]').textContent=out.message;if(out.blocked)guidance.notify(out.message);else guidance.clearNotice();render();}
 container.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.observe)part(b.dataset.observe);if(b.dataset.mode){if(onNavigate)onNavigate(b.dataset.mode);else setMode(b.dataset.mode);}if(b.dataset.action){dispatch({type:b.dataset.action});if(b.dataset.action==='reset')viewer?.cameraAction('reset');}if(b.dataset.inspection)inspectionAction(b.dataset.inspection);});
 container.addEventListener('change',e=>{if(e.target.dataset.function)dispatch({type:'input',key:e.target.dataset.function,value:e.target.checked});});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopLesson();state=reduceScrubber(state,{type:'isolate'}).state;render();}});
 const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){stopLesson();if(active)render();}});observer.observe(container);
 return {targets:{canvas:q('canvas'),get camera(){return ui?.cameraGroup||q('.hl-viewport');},startup,maintenance:q('[data-mode=maintenance]'),tasks:q('.hl-mode-row'),lesson:q('[data-maintenance]'),practice:q('[data-maintenance]')},tourStart,tourFrame,tourEnd,show(view='explore'){active=true;if(!ui){ui=mountLookUI(q('.hl-viewport'),adapter,{focus:true});ui.slot.append(startup);}if(!viewer){try{viewer=createHardViewer(q('canvas'),{onSelect:part,onReveal:value=>dispatch({type:'open',value}),onHover:guidance.hover,tooltip:q('.hl-tooltip'),onCallouts:(items,width,height)=>ui?.drawCallouts(items,width,height)});viewer.load(machine);}catch(error){q('.hl-fallback').hidden=false;console.warn('Scrubber 3D unavailable:',error.message);}}adapter.hand.attach();viewer?.setActive(true);setMode(view);},pauseLesson(){stopLesson();render();},setAutoRotate(value){autoRotate=value;render();},setFocused(value){ui?.setFocus(value);},pause(){active=false;stopLesson();state=reduceScrubber(state,{type:'isolate'}).state;viewer?.setActive(false);},release(){this.pause();viewer?.destroy();viewer=null;}};
}
