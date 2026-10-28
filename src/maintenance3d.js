import * as THREE from 'three';
import hudCss from './maintenance3d.hud';
import {LESSONS} from './maintenance-lessons.js';
import {initialPractice,reducePractice} from './maintenance-state.js';
import {buildSteps,currentStep,stateAfterStep} from './sim3d/steps.js';
import {createLifecycle} from './sim3d/lifecycle.js';
import {createPump} from './sim3d/pump.js';
import {createGovernor} from './sim3d/governor.js';
import {createStage} from './sim3d/stage.js';
import {createHandRig,handMaterial} from './sim3d/hand-rig.js';
import {placeAtContact,orientationForBlend,handOrientation} from './sim3d/hand-placement.js';
import {buildDemo,sampleDemo,cameraAt,scripts} from './sim3d/demo.js';
import {createInteraction} from './sim3d/interaction.js';
import {createHandTracker,CAMERA_MESSAGES} from './sim3d/hand-tracking.js';
import {distanceAdvice,TARGET_DISTANCE,GOOD_BAND} from './sim3d/tracking-math.js';
import {WIDE} from './sim3d/layout.js';
import {TASKS,tasksFor,MACHINE_LABELS} from './sim3d/tasks/index.js';

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SKELETON=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const METER=[0.3,1.3],UI_DWELL=0.8,UI_COOLDOWN=1.1,CLICK_MS=300,CLICK_PX=8;
// Progress for the page session: practice state and whether the demonstration was watched, per machine and task.
const store=new Map();
let chosenInput=null;   // 'hands' | 'mouse' once the learner chose; asked once per page session

// The 3D maintenance checklist: every task for the chosen machine, each first shown by two hands and then practised with the
// learner's own hands (webcam) or the mouse / touch. Throws when WebGL2 is unavailable; calls onUnavailable(reason) if the
// graphics context is lost later.
export function mountMaintenance3D(container,{machine='junior-103',getLanguage=()=> 'english',onUnavailable=()=>{},onProgress=()=>{}}={}){
 const life=createLifecycle(),{signal}=life;
 const style=document.createElement('style');style.textContent=hudCss;document.head.append(style);life.onCleanup(()=>style.remove());
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let machineId=MACHINE_LABELS[machine]?machine:'junior-103',language=getLanguage();
 const entry=(kind,m=machineId)=>{const key=m+'/'+kind;if(!store.has(key))store.set(key,{state:initialPractice(kind),watched:false});return store.get(key);};
 container.innerHTML=`<div class="s3" role="region" aria-label="3D maintenance practice">
 <nav class="s3-tabs" aria-label="Maintenance tasks" data-s3="tabs"></nav>
 <div class="s3-stage"><canvas class="s3-canvas" tabindex="0" aria-label="3D room with the selected machine. Use your hands in front of the camera, or the mouse or touch, to do the highlighted step."></canvas>
  <div class="s3-panel s3-toast" role="status" data-s3="toast" hidden></div>
  <div class="s3-choices" data-s3="choices" hidden></div>
  <div class="s3-panel s3-done" data-s3="done" hidden><strong data-s3="done-title"></strong><span data-s3="done-body"></span></div>
  <div class="s3-turn" data-s3="turn" hidden><button type="button" class="s3-primary" data-s3="turn-go" data-hand>Your turn — practise it →</button></div>
  <div class="s3-dwell" data-s3="dwell" hidden></div><div class="s3-dwell s3-dwell-ui" data-s3="ui-dwell" hidden></div>
  <div class="s3-preflight" data-s3="preflight" hidden><section class="s3-panel s3-card" role="dialog" aria-labelledby="s3-pre-title"><span class="s3-eyebrow" data-s3="pre-eyebrow">3D maintenance</span><h3 id="s3-pre-title">Practise with your own hands</h3>
   <p>Each task is shown first by two hands. Then it is your turn, with your hands in front of the camera or with the mouse or touch.</p>
   <ul><li>Stand about <b>${TARGET_DISTANCE} m</b> from the camera, a little further than arm's length, with both hands in view and good light.</li><li><b>Pinch</b> (thumb and index finger) or close your hand to pick things up; rest a <b>fingertip</b> on a button, latch or answer card to press it.</li><li>With the mouse: <b>click</b> a part to pick it up and click again to put it down, or drag it.</li></ul>
   <p class="s3-privacy"><span aria-hidden="true">🔒</span><span>Your camera video stays on this device. It is not recorded or uploaded.</span></p>
   <div class="s3-actions"><button type="button" class="s3-primary" data-s3="allow">Allow camera and use my hands</button><button type="button" data-s3="use-mouse">Use mouse or touch</button></div><p class="s3-status" data-s3="status" role="status"></p></section></div>
 </div>
 <aside class="s3-side">
  <aside class="s3-panel s3-camera" data-s3="camera-panel" hidden aria-label="Camera view"><div class="s3-preview"><video muted playsinline></video><canvas width="160" height="120"></canvas></div><div class="s3-meter"><i data-s3="marker"></i></div><p class="s3-meter-text" data-s3="meter-text">Show your hands to the camera.</p></aside>
  <section class="s3-panel s3-coach" aria-live="polite"><span class="s3-eyebrow" data-s3="count"></span><strong data-s3="title"></strong><p data-s3="body"></p><p class="s3-use" data-s3="use" hidden></p><div class="s3-status-box" data-s3="task-status" hidden></div></section>
  <nav class="s3-panel s3-steps-panel" aria-label="Checklist"><span class="s3-eyebrow" data-s3="steps-title"></span><ol class="s3-steps" data-s3="steps"></ol></nav>
  <details class="s3-panel s3-scope"><summary>Learning scope &amp; sources</summary><p data-s3="sources"></p><p>Machine parts are shown as teaching models. Completion records the virtual sequence only; it does not authorise servicing or certify real equipment or hygiene.</p></details>
 </aside>
 <div class="s3-panel s3-controls" data-s3="controls">
  <div class="s3-group s3-modes" role="group" aria-label="Mode"><button type="button" data-s3="mode-demo" aria-pressed="false">Watch how</button><button type="button" data-s3="mode-practice" aria-pressed="false">Practise</button></div>
  <div class="s3-group" data-s3="demo-controls"><button type="button" data-s3="prev" aria-label="Previous step">‹</button><button type="button" data-s3="play" aria-label="Play or pause the demonstration">Play</button><button type="button" data-s3="next" aria-label="Next step">›</button><input type="range" min="0" max="1000" value="0" step="1" data-s3="scrub" aria-label="Scrub the demonstration"><span class="s3-time" data-s3="time">0:00</span><label class="sr-only" for="s3-speed">Speed</label><select id="s3-speed" data-s3="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button type="button" class="s3-primary" data-s3="try">Now you try</button></div>
  <div class="s3-group" data-s3="practice-controls"><button type="button" data-s3="assist">Do this step for me</button><button type="button" data-s3="reset">Reset</button><button type="button" data-s3="timer" hidden>Start scrub timer</button><button type="button" data-s3="camera">Use camera</button></div>
  <span class="s3-spacer"></span><button type="button" data-s3="focus" aria-pressed="false" title="Hide the side panel (F)">Hide panel</button><button type="button" data-s3="full" aria-pressed="false" title="Full screen">Full screen</button>
 </div></div>`;
 life.onCleanup(()=>container.replaceChildren());
 const $=name=>container.querySelector(`[data-s3="${name}"]`),root=container.querySelector('.s3'),stageEl=container.querySelector('.s3-stage'),canvas=container.querySelector('canvas.s3-canvas'),video=container.querySelector('video'),overlay=container.querySelector('.s3-preview canvas');

 // ---- renderer (one for the whole page visit; each task brings its own scene) ----
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,stencil:false,powerPreference:'high-performance'});}
 catch(error){life.dispose();throw error;}
 life.onCleanup(()=>{renderer.dispose();renderer.forceContextLoss();});
 const dprCap=Math.min(window.devicePixelRatio||1,1.75),governor=createGovernor();let dpr=Math.min(dprCap,governor.pixelRatio);
 renderer.setPixelRatio(dpr);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=false;
 const handSkin=life.own(handMaterial()),rigs={left:createHandRig('left',handSkin),right:createHandRig('right',handSkin)};
 // hands are drawn last over a fresh depth buffer, so the machine never hides them
 let handsDrawn=false;
 for(const rig of Object.values(rigs)){rig.object.visible=false;life.own(rig.mesh.geometry);life.own(rig.mesh.skeleton);rig.mesh.renderOrder=1000;rig.mesh.onBeforeRender=gl=>{if(!handsDrawn){handsDrawn=true;gl.clearDepth();}};}

 // ---- the open task ----
 let S=null,view='ready',playing=false,speed=1,demoTime=0,shownState=null,frameAdjust=false,heldByDemo=null,hudKey='',choiceKey='',toastTimer=0,width=0,height=0;
 const tmp=new THREE.Vector3(),ray=new THREE.Vector3(),corner=new THREE.Vector3(),q=new THREE.Quaternion();
 const focusOf=key=>key==='wide'||!S?WIDE:S.task.FOCUS[key]||WIDE;
 const world={
  anchorWorld:part=>{const held=S.stage.parts[part].held;return held?held.toArray():S.stage.anchor(part,tmp).toArray();},
  anchorScreen:part=>{const a=S.stage.anchor(part,tmp),z=a.z;a.project(S.stage.camera);return {nx:a.x,ny:a.y,z};},
  pointAt:(nx,ny,z)=>{const camera=S.stage.camera;ray.set(nx,ny,0.5).unproject(camera).sub(camera.position).normalize();const t=(z-camera.position.z)/ray.z;return [camera.position.x+ray.x*t,camera.position.y+ray.y*t,z];},
  halfExtents:z=>{const camera=S.stage.camera,h=(camera.position.z-z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return {w:h*camera.aspect,h};},
  zoneRect:zone=>{const box=S.task.ZONES[zone];if(!box)return null;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]]){corner.set(x,y,z).project(S.stage.camera);x0=Math.min(x0,corner.x);x1=Math.max(x1,corner.x);y0=Math.min(y0,corner.y);y1=Math.max(y1,corner.y);}return {x0,x1,y0,y1};},
  zoneDepth:zone=>{const box=S.task.ZONES[zone];return box?(box.min[2]+box.max[2])/2:0;},
  hold:(part,anchor)=>S.stage.hold(part,anchor)
 };
 const practice=()=>entry(S.kind).state;
 function commit(state){entry(S.kind).state=state;}
 function dispatch(action){
  const out=reducePractice(practice(),{...action,now:action.now??performance.now()});commit(out.state);
  if(out.message&&!out.blocked&&!['tick','pause'].includes(action.type))toast(out.message);
  if(!out.blocked&&!['tick','pause'].includes(action.type))onProgress();
  renderHud();pump.invalidate();return out;
 }
 function toast(text,error=false){clearTimeout(toastTimer);const el=$('toast');el.textContent=text;el.classList.toggle('is-error',error);el.hidden=!text;if(text)toastTimer=setTimeout(()=>{el.hidden=true;},error?7000:4200);}
 life.onCleanup(()=>clearTimeout(toastTimer));

 function closeTask(){
  if(!S)return;S.interaction.cancel();pauseScrub();
  for(const rig of Object.values(rigs)){S.stage.scene.remove(rig.object);rig.object.visible=false;}
  S.life.dispose();S=null;
 }
 // Build a task's scene, demonstration, checklist and interaction. Keeps the learner's progress (per machine and task).
 function openTask(kind){
  closeTask();
  const task=TASKS[kind],taskLife=createLifecycle(),stage=createStage({renderer,life:taskLife,reducedMotion:reduced});
  const sceneView=task.build(stage,{label:MACHINE_LABELS[machineId],machine:machineId,language,rigs,reducedMotion:reduced})||{};
  for(const rig of Object.values(rigs))stage.scene.add(rig.object);
  const demo=buildDemo(LESSONS[kind],{script:frame=>task.script(frame,scripts),reduce:reducePractice});
  S={kind,task,stage,life:taskLife,view:sceneView,demo,steps:buildSteps(task.steps(language),LESSONS[kind]),interaction:null,gestures:null};
  S.interaction=createInteraction({rules:task.rules,world,getState:practice,dispatch,onHint:message=>toast(message),onEvent:()=>pump.invalidate()});
  S.gestures=task.gestures?.({world,getState:practice,dispatch,onHint:message=>toast(message)})??null;
  if(width&&height)stage.resize(width,height);
  shownState=null;hudKey='';choiceKey='';heldByDemo=null;demoTime=0;playing=false;frameAdjust=false;
  stage.setPlaces(task.places(practice()),{instant:true});stage.setFocus(WIDE,{instant:true});sceneView.apply?.(practice(),{instant:true});
  renderTabs();$('sources').innerHTML=task.sources;
  if(view!=='ready'){if(entry(kind).watched)beginPractice();else beginDemo();}else renderHud();
  pump.invalidate();
 }

 // ---- HUD ----
 function renderTabs(){
  const list=tasksFor(machineId);
  $('tabs').innerHTML=list.map((t,i)=>`<button type="button" data-task="${t.kind}" aria-pressed="${S?.kind===t.kind}"><span>0${i+1}</span>${escape(t.title)}${entry(t.kind).state.complete?' <b aria-label="practised">✓</b>':''}</button>`).join('');
 }
 function renderHud(){
  if(!S)return;
  const state=practice(),inDemo=view==='demo',sample=inDemo?sampleDemo(S.demo,demoTime):null,frameIndex=inDemo?sample.index:-1,steps=S.steps;
  const stepIndex=inDemo?steps.findIndex(step=>step.frames.includes(LESSONS[S.kind][frameIndex])):currentStep(steps,state),done=!inDemo&&state.complete,watched=entry(S.kind).watched;
  root.dataset.view=view;
  $('demo-controls').hidden=!inDemo;$('practice-controls').hidden=view!=='practice';
  $('mode-demo').setAttribute('aria-pressed',String(inDemo));$('mode-practice').setAttribute('aria-pressed',String(view==='practice'));
  $('mode-practice').disabled=!watched;$('mode-practice').textContent=watched?'Practise':'Practise 🔒';$('mode-practice').title=watched?'':'Watch the demonstration first';
  $('try').disabled=!watched;$('camera').textContent=tracking?'Stop camera':'Use camera';$('camera').setAttribute('aria-pressed',String(tracking));
  $('turn').hidden=!(inDemo&&watched&&demoTime>=S.demo.duration-60);
  const status=view==='ready'?null:S.task.status?.(state,{demo:inDemo?sample:null})??null;
  const timerLabel=view==='practice'&&!state.complete?S.task.timer?.(state):null;$('timer').hidden=!timerLabel;if(timerLabel)$('timer').textContent=timerLabel;
  $('done').hidden=!done;if(done){const [t,b]=S.task.instructions(state,language);$('done-title').textContent=t;$('done-body').textContent=b;}
  const key=[view,stepIndex,done,inDemo?frameIndex:JSON.stringify(state),input,tracking,language,watched,status?JSON.stringify(status):''].join('|');
  if(key===hudKey)return;hudKey=key;
  const frame=inDemo?LESSONS[S.kind][frameIndex]:null,hi=language==='hinglish';
  $('count').textContent=done?'Complete':view==='ready'?'3D maintenance':`${inDemo?'Watch · ':''}Step ${Math.min(stepIndex+1,steps.length)} of ${steps.length}${S.task.cadence?' · '+S.task.cadence(language):''}`;
  const [title,body]=inDemo?[hi?(frame.titleHi||frame.title):frame.title,hi?(frame.captionHi||frame.caption):frame.caption]:S.task.instructions(state,language);
  $('title').textContent=done?(hi?'Ho gaya':'All done'):title;$('body').textContent=done?(hi?'Dobara try karne ke liye Reset karo, ya demonstration phir dekho.':'Reset to try again, or watch how once more.'):body;
  const part=!inDemo&&!done&&view==='practice'?S.task.rules.targetPart(state):null,zone=part?S.task.rules.targetZone(state):null;
  $('use').hidden=!part;if(part)$('use').textContent=`Use ${S.task.rules.label(part)}${zone?' → '+S.task.rules.zoneLabel(zone):''}`;
  const box=$('task-status');box.hidden=!status;if(status)box.innerHTML=statusMarkup(status);
  $('steps-title').textContent=`${S.task.title(machineId)} · checklist`;
  $('steps').innerHTML=steps.map((s,i)=>`<li class="${(done||i<stepIndex)?'is-done':i===stepIndex?'is-current':''}"><button type="button" data-step="${i}" ${inDemo?'':'aria-disabled="true" tabindex="-1"'}${i===stepIndex&&!done?' aria-current="step"':''}>${done||i<stepIndex?'✓':i+1} · ${escape(s.label)}</button></li>`).join('');
 }
 function statusMarkup(status){
  let html='';
  if(status.timer){const {elapsed,total,running,label}=status.timer;html+=`<div class="s3-timer"><span>${escape(label)}</span><b>${Math.floor(elapsed/1000)} / ${Math.round(total/1000)} s</b><progress max="${total}" value="${elapsed}" aria-label="${escape(label)}"></progress>${running?'<i class="s3-live">● running</i>':''}</div>`;}
  if(status.chips)html+=`<div class="s3-chips">${status.chips.map(c=>`<button type="button" data-chip="${c.id}" class="${c.done?'is-done':c.current?'is-current':''}" ${c.action&&view==='practice'?'data-hand':'disabled'} aria-pressed="${Boolean(c.done)}">${c.done?'✓ ':''}${escape(c.label)}</button>`).join('')}</div>`;
  if(status.note)html+=`<p class="s3-note">${escape(status.note)}</p>`;
  return html;
 }
 // Answer cards for decision steps (in practice they act; in the demonstration they show which answer the hand picks).
 function renderChoices(state,demoChoice){
  const list=view==='practice'&&!state.complete?S.task.choices(state,language):view==='demo'&&demoChoice?S.task.choices(state,language):[];
  const key=view+'|'+list.map(c=>c.id+c.label).join('|')+'|'+(demoChoice||'');if(key===choiceKey)return;choiceKey=key;
  const el=$('choices');el.hidden=!list.length;
  el.innerHTML=list.map(c=>`<button type="button" class="s3-choice ${demoChoice===c.id?'is-picked':''}" data-choice="${c.id}" ${view==='practice'?'data-hand':'disabled'}>${escape(c.label)}${c.hint?`<small>${escape(c.hint)}</small>`:''}</button>`).join('');
 }

 // ---- demonstration ----
 function setDemoTime(ms,{pause=false}={}){
  demoTime=Math.max(0,Math.min(S.demo.duration-1,ms));if(pause)playing=false;
  if(demoTime>=S.demo.duration-60&&!entry(S.kind).watched){entry(S.kind).watched=true;renderTabs();}
  $('scrub').value=String(Math.round(demoTime/S.demo.duration*1000));const s=Math.floor(demoTime/1000);$('time').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  $('play').textContent=playing?'Pause':(demoTime>=S.demo.duration-60?'Replay':'Play');renderHud();pump.invalidate();
 }
 const stepFrames=i=>S.demo.steps.filter(item=>S.steps[i].frames.includes(item.frame));
 const stepStart=i=>stepFrames(i)[0].start,stepEnd=i=>stepFrames(i).at(-1).end-1;
 function jumpStep(delta){
  const current=S.steps.findIndex(step=>step.frames.includes(LESSONS[S.kind][sampleDemo(S.demo,demoTime).index])),target=current+delta;
  if(target>=S.steps.length){setDemoTime(S.demo.duration,{pause:true});return;}
  frameAdjust=true;setDemoTime(reduced?stepEnd(Math.max(0,target)):stepStart(Math.max(0,target)),{pause:true});
 }
 function beginDemo(){S.interaction.cancel();releaseHolds();pauseScrub();view='demo';$('preflight').hidden=true;shownState=null;if(demoTime>=S.demo.duration-60)demoTime=0;playing=!reduced;setDemoTime(demoTime);toast('');}
 function beginPractice(){
  if(!entry(S.kind).watched){beginDemo();return;}
  S.interaction.cancel();releaseHolds();view='practice';$('preflight').hidden=true;shownState=null;playing=false;hudKey='';choiceKey='';mouse.sticky=false;renderHud();pump.invalidate();
  toast(input==='hands'?`Show your hands. Stand about ${TARGET_DISTANCE} m from the camera.`:'Click the highlighted part to pick it up and click again to put it down, or drag it.');
 }
 function releaseHolds(){if(!S)return;for(const id of Object.keys(S.stage.parts))if(S.stage.parts[id].held)S.stage.hold(id,null);heldByDemo=null;}

 // ---- camera and hand tracking ----
 let tracker=null,tracking=false,input='mouse',tracked=[],trackInfo={count:0,distance:NaN,seq:0},overlayTime=0;
 const shown=new Map();   // smoothed copies of the tracked hands, eased toward each new result at the render rate
 const overlayContext=overlay.getContext('2d');
 function onHands(hands,info){tracked=hands;trackInfo=info;pump.invalidate();const now=performance.now();if(now-overlayTime>66){overlayTime=now;drawOverlay(hands,info);}}
 function drawOverlay(hands,info){
  const c=overlayContext,w=overlay.width,h=overlay.height;c.clearRect(0,0,w,h);c.lineWidth=2;
  for(const hand of hands){c.strokeStyle=hand.holding?'#ee8c45':'#46e3e8';c.fillStyle=c.strokeStyle;c.beginPath();for(const [a,b] of SKELETON){c.moveTo(hand.norm[a*2]*w,hand.norm[a*2+1]*h);c.lineTo(hand.norm[b*2]*w,hand.norm[b*2+1]*h);}c.stroke();for(let i=0;i<21;i++){c.beginPath();c.arc(hand.norm[i*2]*w,hand.norm[i*2+1]*h,2.2,0,7);c.fill();}}
  const d=info.distance;$('marker').style.left=Number.isFinite(d)?`${Math.max(0,Math.min(1,(d-METER[0])/(METER[1]-METER[0])))*100}%`:'50%';
  $('meter-text').innerHTML=Number.isFinite(d)?`<b>≈${d.toFixed(2)} m</b> · ${escape(distanceAdvice(d))}${info.count<2?' Show both hands.':''}`:escape(distanceAdvice(d));
 }
 {const meter=container.querySelector('.s3-meter'),lo=(GOOD_BAND[0]-METER[0])/(METER[1]-METER[0])*100,hi=(GOOD_BAND[1]-METER[0])/(METER[1]-METER[0])*100;meter.style.background=`linear-gradient(90deg,#ff9b6a 0 ${lo-9}%,#f4d36a ${lo-9}% ${lo}%,#5fd6a3 ${lo}% ${hi}%,#f4d36a ${hi}% ${hi+9}%,#ff9b6a ${hi+9}%)`;}
 function status(text,error=false){const el=$('status');el.textContent=text;el.style.color=error?'#ffb3a6':'';}
 async function startCamera(){
  status('Asking for your camera…');$('allow').disabled=true;
  try{
   tracker??=await createHandTracker({video,life,onHands,onStatus:s=>{if(s.state==='requesting')status('Asking for your camera…');else if(s.state==='loading')status('Loading hand tracking…');else if(s.state==='error'&&tracking){stopCamera();toast(s.message,true);}}});
   await tracker.start();tracking=true;input='hands';chosenInput='hands';$('camera-panel').hidden=false;status('');startTask();canvas.focus({preventScroll:true});
  }catch(error){
   tracking=false;input='mouse';$('camera-panel').hidden=true;status(error.message||CAMERA_MESSAGES.failed,true);$('allow').disabled=false;
   if(view!=='ready')toast(error.message||CAMERA_MESSAGES.failed,true);else{chosenInput='mouse';startTask();toast(`${error.message||CAMERA_MESSAGES.failed} Using mouse or touch instead.`,true);}
  }
 }
 function stopCamera(){tracker?.stop();tracking=false;tracked=[];shown.clear();trackInfo={count:0,distance:NaN,seq:0};$('camera-panel').hidden=true;input='mouse';if(view==='practice')toast('Camera off. Use the mouse or touch.');renderHud();pump.invalidate();}
 // After the input choice: watch first if this task was not watched yet, else carry on practising.
 function startTask(){if(entry(S.kind).watched)beginPractice();else beginDemo();}
 function smoothTracked(dt){
  const k=1-Math.exp(-dt*22);
  for(const h of tracked){
   let d=shown.get(h.id);
   if(!d||d.chirality!==h.chirality){d={id:h.id,local:Float64Array.from(h.local),quat:h.quaternion.clone(),scale:h.scale,pinch:[...h.pinchNdc],tip:[...h.tipNdc],palm:[...h.palmNdc],distance:h.distance};shown.set(h.id,d);}
   else{for(let i=0;i<63;i++)d.local[i]+=(h.local[i]-d.local[i])*k;d.quat.slerp(h.quaternion,k);d.scale+=(h.scale-d.scale)*k;for(const [a,b] of [[d.pinch,h.pinchNdc],[d.tip,h.tipNdc],[d.palm,h.palmNdc]]){a[0]+=(b[0]-a[0])*k;a[1]+=(b[1]-a[1])*k;}
    d.distance=Number.isFinite(h.distance)?(Number.isFinite(d.distance)?d.distance+(h.distance-d.distance)*k:h.distance):d.distance;}
   d.chirality=h.chirality;d.holding=h.holding;d.seq=h.seq;
  }
  for(const id of [...shown.keys()])if(!tracked.some(h=>h.id===id))shown.delete(id);
 }
 const contact=new THREE.Vector3(),wrist=new THREE.Vector3(),offset=new THREE.Vector3();
 function placeTracked(d,used){
  let rig=rigs[d.chirality];if(used.has(rig))rig=rigs[d.chirality==='left'?'right':'left'];used.add(rig);
  rig.pose(d.local);
  // first person: a hand reaching toward the screen goes deeper into the scene
  const base=S.task.rules.carryDepth??0.16,z=base+Math.max(-0.12,Math.min(0.12,((Number.isFinite(d.distance)?d.distance:TARGET_DISTANCE)-TARGET_DISTANCE)*0.4)),target=world.pointAt(d.pinch[0],d.pinch[1],z);
  contact.set((d.local[12]+d.local[24])/2,(d.local[13]+d.local[25])/2,(d.local[14]+d.local[26])/2*(rig.chirality==='left'?-1:1));
  offset.copy(contact).multiplyScalar(d.scale).applyQuaternion(d.quat);wrist.set(target[0],target[1],target[2]).sub(offset);
  rig.place(wrist,d.quat,d.scale);rig.object.visible=true;
 }

 // ---- mouse / touch: drag, or click to pick up and click again to put down ----
 const mouse={nx:0,ny:0,down:false,clicked:false,released:false,touch:false,inside:false,sticky:false,wasSticky:false,downAt:0,downX:0,downY:0,moved:0,pinchWeight:0};
 function pointerNdc(event){const r=canvas.getBoundingClientRect();mouse.nx=((event.clientX-r.left)/r.width)*2-1;mouse.ny=-(((event.clientY-r.top)/r.height)*2-1);}
 canvas.addEventListener('pointerdown',e=>{if(view!=='practice'||input!=='mouse')return;canvas.setPointerCapture(e.pointerId);mouse.down=true;mouse.clicked=true;mouse.inside=true;mouse.wasSticky=mouse.sticky;mouse.downAt=performance.now();mouse.downX=e.clientX;mouse.downY=e.clientY;mouse.moved=0;pointerNdc(e);pump.invalidate();},{signal});
 canvas.addEventListener('pointermove',e=>{if(input!=='mouse')return;mouse.inside=true;if(mouse.down)mouse.moved=Math.max(mouse.moved,Math.hypot(e.clientX-mouse.downX,e.clientY-mouse.downY));pointerNdc(e);pump.invalidate();},{signal});
 for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{
  if(input!=='mouse'||!mouse.down)return;mouse.down=false;mouse.released=true;mouse.touch=e.pointerType!=='mouse';
  const quick=performance.now()-mouse.downAt<CLICK_MS&&mouse.moved<CLICK_PX;
  // a quick click on a part keeps holding it until the next click; a second click puts it down
  if(mouse.wasSticky||type==='pointercancel')mouse.sticky=false;else if(quick&&S?.interaction.holding.length)mouse.sticky=true;
  pump.invalidate();
 },{signal});
 canvas.addEventListener('pointerleave',()=>{if(!mouse.down&&!mouse.sticky)mouse.inside=false;pump.invalidate();},{signal});

 // ---- hands-free buttons: rest a fingertip on an answer card or button inside the stage ----
 const uiDwell={el:null,time:0,cooldown:0},uiDwellEl=$('ui-dwell');
 function handTargets(dt){
  uiDwell.cooldown=Math.max(0,uiDwell.cooldown-dt);
  if(input!=='hands'||!tracking||!shown.size){uiDwell.el=null;uiDwellEl.hidden=true;return;}
  const r=stageEl.getBoundingClientRect();let found=null;
  for(const d of shown.values()){const x=r.left+(d.tip[0]*0.5+0.5)*r.width,y=r.top+(-d.tip[1]*0.5+0.5)*r.height,el=document.elementFromPoint(x,y)?.closest('[data-hand]');if(el&&stageEl.contains(el)&&!el.disabled&&!el.closest('[hidden]')){found=el;break;}}
  if(!found||uiDwell.cooldown>0){uiDwell.el=null;uiDwell.time=0;uiDwellEl.hidden=true;return;}
  if(found!==uiDwell.el){uiDwell.el=found;uiDwell.time=0;}uiDwell.time+=dt;
  const b=found.getBoundingClientRect();uiDwellEl.hidden=false;uiDwellEl.style.left=`${b.left-r.left+b.width/2}px`;uiDwellEl.style.top=`${b.top-r.top+b.height/2}px`;uiDwellEl.style.setProperty('--p',String(Math.min(1,uiDwell.time/UI_DWELL)));
  if(uiDwell.time>=UI_DWELL){uiDwell.cooldown=UI_COOLDOWN;uiDwell.el=null;uiDwellEl.hidden=true;found.click();}
 }

 // ---- per-frame drawing ----
 const dwellEl=$('dwell');
 function hideRigs(){for(const rig of Object.values(rigs))rig.object.visible=false;}
 function placeSample(h){const rig=rigs[h.side],blend=h.pose,orientation=h.orient?handOrientation(h.side,h.orient,q):orientationForBlend(h.side,blend,q);placeAtContact(rig,{blend,target:h.target,orientation});rig.object.visible=true;}
 function drawDemo(wall){
  if(playing){setDemoTime(demoTime+wall*1000*speed);if(demoTime>=S.demo.duration-1){playing=false;setDemoTime(S.demo.duration-1);}}
  const sample=sampleDemo(S.demo,demoTime),cam=cameraAt(S.demo,demoTime,S.task.focusFor);
  S.stage.setFocusBlend(focusOf(cam.from),focusOf(cam.to),reduced?1:cam.k);
  const state=reduced&&frameAdjust?sample.step.frame.to:sample.state;
  if(state!==shownState){shownState=state;S.stage.setPlaces(S.task.places(state),{instant:reduced});S.view.apply?.(state,{instant:reduced,demo:true});}
  if(sample.held&&!reduced){S.stage.hold(sample.held.part,sample.held.anchor);heldByDemo=sample.held.part;}else if(heldByDemo){S.stage.hold(heldByDemo,null);heldByDemo=null;}
  S.stage.setHighlight(null,null);hideRigs();
  if(!reduced)for(const h of sample.hands)if(h.visible)placeSample(h);
  S.view.frame?.({mode:'demo',sample,state,rigs,wall,reduced});
  renderChoices(state,sample.choice);renderHud();
 }
 function drawPractice(dt){
  const state=practice();
  if(state!==shownState){shownState=state;S.stage.setPlaces(S.task.places(state));const zone=S.task.rules.targetZone(state);S.stage.setHighlight(S.task.rules.targetPart(state),zone?S.task.RINGS?.[zone]??null:null);S.stage.setFocus(focusOf(S.task.focusFor(state)));S.view.apply?.(state,{});renderHud();}
  renderChoices(state,null);
  let pointers=[];const used=new Set(),camera=input==='hands'&&tracking;
  if(camera){smoothTracked(dt);for(const d of shown.values())pointers.push({id:d.id,seq:d.seq,nx:d.pinch[0],ny:d.pinch[1],pinch:d.holding,tipNx:d.tip[0],tipNy:d.tip[1]});}
  else if(input==='mouse'&&(mouse.inside||mouse.down||mouse.clicked||mouse.released||mouse.sticky))pointers=[{id:'mouse',nx:mouse.nx,ny:mouse.ny,pinch:mouse.down||mouse.clicked||mouse.sticky,tipNx:mouse.nx,tipNy:mouse.ny,dwell:false,crisp:true}];
  const report=S.interaction.update(dt,pointers,camera?trackInfo.seq:undefined);
  const gesture=S.gestures?.update(dt,{pointers,hands:camera?[...shown.values()]:null,mouse:camera?null:{down:mouse.down||mouse.sticky,nx:mouse.nx,ny:mouse.ny,active:pointers.length>0},now:performance.now()})??null;
  mouse.clicked=false;if(mouse.released){mouse.released=false;if(mouse.touch&&!mouse.sticky)mouse.inside=false;}
  hideRigs();
  if(camera)for(const d of shown.values())placeTracked(d,used);
  else if(pointers.length){
   const p=pointers[0],w=mouse.pinchWeight+=((p.pinch?1:0)-mouse.pinchWeight)*(1-Math.exp(-dt*16));
   const pair=S.task.mouseHands?.(world,p,{state,gesture,pinch:w});
   if(pair)for(const h of pair)placeSample(h);
   else placeSample({side:'right',target:world.pointAt(p.nx,p.ny,S.task.rules.carryDepth??0.16),pose:[['point',1-w],['pinch',w]]});
  }
  if(report.dwell){const a=world.anchorScreen(report.dwell.part),r=canvas.getBoundingClientRect();dwellEl.hidden=false;dwellEl.style.left=`${(a.nx*0.5+0.5)*r.width}px`;dwellEl.style.top=`${(-a.ny*0.5+0.5)*r.height}px`;dwellEl.style.setProperty('--p',String(report.dwell.progress));}else dwellEl.hidden=true;
  const hover=Object.values(report.hover).find(Boolean);canvas.style.cursor=input==='mouse'?(mouse.down||mouse.sticky&&S.interaction.holding.length?'grabbing':hover?'grab':'default'):'default';
  S.view.frame?.({mode:'practice',state,rigs,wall:dt,gesture,holding:S.interaction.holding});
  return Boolean(gesture?.active)||mouse.sticky;
 }
 const pump=createPump((now,_dt,wall)=>{
  if(!S)return false;let busy=false;
  if(view==='demo')drawDemo(wall);else busy=drawPractice(wall);
  handTargets(wall);
  const moving=S.stage.update(wall,now/1000);handsDrawn=false;renderer.render(S.stage.scene,S.stage.camera);
  const ratio=governor.sample(wall*1000,dprCap);if(ratio!==null){dpr=ratio;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
  return moving||busy||(view==='demo'&&playing)||tracking||mouse.inside||mouse.down||S.interaction.holding.length>0;
 });
 life.onCleanup(()=>pump.stop());
 // a running scrub timer advances in real time and pauses whenever the practice is left
 function pauseScrub(){if(!S)return;const s=practice();if(s.rubStartedAt!==null&&s.rubStartedAt!==undefined)dispatch({type:'pause'});}
 const ticker=setInterval(()=>{if(!S||view!=='practice')return;const s=practice();if(s.rubStartedAt!==null&&s.rubStartedAt!==undefined&&!s.complete)dispatch({type:'tick'});},200);life.onCleanup(()=>clearInterval(ticker));
 const resize=new ResizeObserver(()=>{const r=stageEl.getBoundingClientRect();width=Math.round(r.width);height=Math.round(r.height);if(width&&height){renderer.setSize(width,height,false);S?.stage.resize(width,height);pump.invalidate();}});resize.observe(stageEl);life.onCleanup(()=>resize.disconnect());
 const watch=new IntersectionObserver(entries=>{const visible=entries[0].isIntersecting&&!document.hidden;pump.setVisible(visible);if(!visible){playing=false;pauseScrub();}});watch.observe(canvas);life.onCleanup(()=>watch.disconnect());
 document.addEventListener('visibilitychange',()=>{pump.setVisible(!document.hidden);if(document.hidden){playing=false;pauseScrub();}},{signal});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onUnavailable('lost');},{signal});
 document.addEventListener('efs-guide-language',()=>{language=getLanguage();if(S){S.steps=buildSteps(S.task.steps(language),LESSONS[S.kind]);hudKey='';choiceKey='';renderTabs();renderHud();}},{signal});
 const fullButton=$('full');fullButton.hidden=!document.fullscreenEnabled;
 document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===root;fullButton.setAttribute('aria-pressed',String(on));fullButton.textContent=on?'Exit full screen':'Full screen';},{signal});

 // ---- controls ----
 container.addEventListener('click',event=>{
  const tab=event.target.closest('[data-task]');if(tab){if(tab.dataset.task!==S?.kind)openTask(tab.dataset.task);return;}
  const choice=event.target.closest('[data-choice]');if(choice){if(view==='practice'){const c=S.task.choices(practice(),language).find(x=>x.id===choice.dataset.choice);if(c)dispatch(c.action);}return;}
  const chip=event.target.closest('[data-chip]');if(chip){if(view==='practice'){const c=S.task.status?.(practice(),{})?.chips?.find(x=>x.id===chip.dataset.chip);if(c?.action)dispatch(c.action);}return;}
  const button=event.target.closest('[data-s3],[data-step]');if(!button||!S)return;
  if(button.dataset.step!==undefined){if(view==='demo'){frameAdjust=true;const i=Number(button.dataset.step);setDemoTime(reduced?stepEnd(i):stepStart(i),{pause:reduced});}return;}
  switch(button.dataset.s3){
   case 'allow':startCamera();break;
   case 'use-mouse':input='mouse';chosenInput='mouse';startTask();canvas.focus({preventScroll:true});break;
   case 'mode-demo':beginDemo();break;
   case 'mode-practice':if(view!=='practice')beginPractice();break;
   case 'play':if(playing)playing=false;else{if(demoTime>=S.demo.duration-60)demoTime=0;playing=true;frameAdjust=false;}setDemoTime(demoTime);break;
   case 'prev':jumpStep(-1);break;case 'next':jumpStep(1);break;
   case 'try':case 'turn-go':beginPractice();break;
   case 'camera':if(tracking)stopCamera();else{$('preflight').hidden=false;status('');$('allow').disabled=false;}break;
   case 'reset':S.interaction.cancel();pauseScrub();commit(initialPractice(S.kind));shownState=null;toast('Practice reset.');renderTabs();renderHud();pump.invalidate();break;
   case 'assist':{const state=practice();if(state.complete)break;S.interaction.cancel();pauseScrub();commit(stateAfterStep(S.steps,currentStep(S.steps,practice())));shownState=null;renderTabs();renderHud();pump.invalidate();break;}
   case 'timer':{const s=practice();dispatch(s.rubStartedAt!==null&&s.rubStartedAt!==undefined?{type:'pause'}:{type:'rub'});break;}
   case 'focus':{const on=!root.classList.contains('s3-focus');root.classList.toggle('s3-focus',on);button.setAttribute('aria-pressed',String(on));button.textContent=on?'Show panel':'Hide panel';break;}
   case 'full':{if(document.fullscreenElement===root)document.exitFullscreen?.();else root.requestFullscreen?.().catch(()=>toast('Full screen is not available here.',true));break;}
  }
 },{signal});
 container.addEventListener('input',event=>{if(event.target.dataset.s3==='scrub'){frameAdjust=false;setDemoTime(Number(event.target.value)/1000*S.demo.duration,{pause:true});}},{signal});
 container.addEventListener('change',event=>{if(event.target.dataset.s3==='speed')speed=Number(event.target.value);},{signal});
 container.addEventListener('keydown',event=>{
  const typing=event.target.closest('button,input,select');
  if(event.key==='f'||event.key==='F'){if(!typing||event.target.dataset.s3==='focus'){$('focus').click();event.preventDefault();}return;}
  if(event.key==='Escape'&&mouse.sticky){mouse.sticky=false;mouse.released=true;pump.invalidate();return;}
  if(view!=='demo')return;
  if(event.key===' '&&!typing){$('play').click();event.preventDefault();}
  else if(event.key==='ArrowRight'&&event.target.type!=='range'){jumpStep(1);event.preventDefault();}
  else if(event.key==='ArrowLeft'&&event.target.type!=='range'){jumpStep(-1);event.preventDefault();}
 },{signal});
 // completion ticks on the tabs follow the shared state
 let lastComplete=null;const tabWatch=setInterval(()=>{if(!S)return;const c=practice().complete;if(c!==lastComplete){lastComplete=c;renderTabs();}},400);life.onCleanup(()=>clearInterval(tabWatch));

 // ---- start ----
 const r0=stageEl.getBoundingClientRect();width=Math.round(r0.width)||800;height=Math.round(r0.height)||600;renderer.setSize(width,height,false);
 openTask(tasksFor(machineId)[0].kind);
 $('pre-eyebrow').textContent=`3D · ${MACHINE_LABELS[machineId]} · maintenance`;
 if(chosenInput==='mouse'){input='mouse';startTask();}
 else{$('preflight').hidden=false;$('allow').focus({preventScroll:true});}
 pump.invalidate();
 return {
  setMachine(id){if(!MACHINE_LABELS[id]||id===machineId)return;const kind=S?.kind;machineId=id;const list=tasksFor(id).map(t=>t.kind);openTask(list.includes(kind)?kind:kind==='filter'||kind==='wet-filter'?list[0]:list[0]);$('pre-eyebrow').textContent=`3D · ${MACHINE_LABELS[machineId]} · maintenance`;},
  pause(){playing=false;pauseScrub();if(S)renderHud();},
  destroy:()=>{closeTask();tracker?.stop();life.dispose();}
 };
}
