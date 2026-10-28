import * as THREE from 'three';
import hudCss from './maintenance3d.hud';
import {buildSteps,currentStep,stateAfterStep} from './sim3d/steps.js';
import {createLifecycle} from './sim3d/lifecycle.js';
import {createPump} from './sim3d/pump.js';
import {createGovernor} from './sim3d/governor.js';
import {createBagScene} from './sim3d/bag-scene.js';
import {createHandRig,handMaterial} from './sim3d/hand-rig.js';
import {placeAtContact,orientationForBlend} from './sim3d/hand-placement.js';
import {buildDemo,sampleDemo,cameraAt} from './sim3d/bag-demo.js';
import {restingPlaces,targetPart,targetZone,focusFor} from './sim3d/bag-task.js';
import {createInteraction,labelOf} from './sim3d/bag-interaction.js';
import {createHandTracker,CAMERA_MESSAGES} from './sim3d/hand-tracking.js';
import {distanceAdvice,TARGET_DISTANCE,GOOD_BAND} from './sim3d/tracking-math.js';
import {PLACE} from './sim3d/layout.js';

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SKELETON=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const METER=[0.3,1.3];

// The hand-controlled 3D dust-bag change. `bridge` is filled by the 2D module and carries the one shared checklist state.
// Throws when WebGL2 is unavailable; calls onUnavailable(reason) if the context is lost later.
export function mountMaintenance3D(container,{bridge,machine='junior-103',onUnavailable=()=>{}}){
 const life=createLifecycle(),{signal}=life;
 const style=document.createElement('style');style.textContent=hudCss;document.head.append(style);life.onCleanup(()=>style.remove());
 const machineName=machine==='junior-429'?'JUNIOR 429':'JUNIOR 103';
 container.innerHTML=`<div class="s3" role="region" aria-label="Hand-controlled 3D dust bag change">
 <div class="s3-stage"><canvas class="s3-canvas" tabindex="0" aria-label="3D room with a ${machineName} vacuum cleaner. Use your hands in front of the camera, or the mouse or touch, to change the dust bag."></canvas>
  <div class="s3-panel s3-toast" role="status" data-s3="toast" hidden></div>
  <div class="s3-panel s3-done" data-s3="done" hidden><strong>Dust bag changed.</strong><span>The used bag is sealed and binned, the clean bag is fitted, the head is clipped on and the power stays isolated.</span></div>
  <div class="s3-dwell" data-s3="dwell" hidden></div>
  <div class="s3-preflight" data-s3="preflight"><section class="s3-panel s3-card" role="dialog" aria-labelledby="s3-pre-title"><span class="s3-eyebrow">3D · ${machineName} · dust bag</span><h3 id="s3-pre-title">Change the dust bag with your own hands</h3>
   <p>The machine will follow both of your hands through the same nine steps as the 2D simulation.</p>
   <ul><li>Stand about <b>${TARGET_DISTANCE} m</b> from the camera, a little further than arm's length, with both hands in view and good light.</li><li><b>Pinch</b> (thumb and index finger) or close your hand to pick things up; rest a <b>fingertip</b> on a latch or the tape to press it.</li></ul>
   <p class="s3-privacy"><span aria-hidden="true">🔒</span><span>Your camera video stays on this device. It is not recorded or uploaded.</span></p>
   <div class="s3-actions"><button type="button" class="s3-primary" data-s3="allow">Allow camera and use my hands</button><button type="button" data-s3="use-mouse">Use mouse or touch</button><button type="button" data-s3="watch-first">Watch how first</button></div><p class="s3-status" data-s3="status" role="status"></p></section></div>
 </div>
 <aside class="s3-side">
  <section class="s3-panel s3-coach" aria-live="polite"><span class="s3-eyebrow" data-s3="count"></span><strong data-s3="title"></strong><p data-s3="body"></p><p class="s3-use" data-s3="use" hidden></p></section>
  <nav class="s3-panel s3-steps-panel" aria-label="Checklist"><span class="s3-eyebrow">Dust bag · checklist</span><ol class="s3-steps" data-s3="steps"></ol></nav>
  <aside class="s3-panel s3-camera" data-s3="camera-panel" hidden aria-label="Camera view"><div class="s3-preview"><video muted playsinline></video><canvas width="160" height="120"></canvas></div><div class="s3-meter"><i data-s3="marker"></i></div><p class="s3-meter-text" data-s3="meter-text">Show your hands to the camera.</p></aside>
 </aside>
 <div class="s3-panel s3-controls" data-s3="controls">
  <div class="s3-group s3-modes" role="group" aria-label="Mode"><button type="button" data-s3="mode-demo" aria-pressed="false">Watch how</button><button type="button" data-s3="mode-practice" aria-pressed="false">Practise</button></div>
  <div class="s3-group" data-s3="demo-controls"><button type="button" data-s3="prev" aria-label="Previous step">‹</button><button type="button" data-s3="play" aria-label="Play or pause the demonstration">Play</button><button type="button" data-s3="next" aria-label="Next step">›</button><input type="range" min="0" max="1000" value="0" step="1" data-s3="scrub" aria-label="Scrub the demonstration"><span class="s3-time" data-s3="time">0:00</span><label class="sr-only" for="s3-speed">Speed</label><select id="s3-speed" data-s3="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button type="button" class="s3-primary" data-s3="try">Now you try</button></div>
  <div class="s3-group" data-s3="practice-controls"><button type="button" data-s3="assist">Do this step for me</button><button type="button" data-s3="reset">Reset</button><button type="button" data-s3="camera">Use camera</button></div>
  <span class="s3-spacer"></span><button type="button" data-s3="focus" aria-pressed="false" title="Hide the side panel (F)">Hide panel</button><button type="button" data-s3="full" aria-pressed="false" title="Full screen">Full screen</button>
 </div></div>`;
 life.onCleanup(()=>container.replaceChildren());
 const $=name=>container.querySelector(`[data-s3="${name}"]`),root=container.querySelector('.s3'),stage=container.querySelector('.s3-stage'),canvas=container.querySelector('canvas.s3-canvas'),video=container.querySelector('video'),overlay=container.querySelector('.s3-preview canvas');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

 // ---- renderer and scene ----
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,stencil:false,powerPreference:'high-performance'});}
 catch(error){life.dispose();throw error;}
 life.onCleanup(()=>{renderer.dispose();renderer.forceContextLoss();});
 const dprCap=Math.min(window.devicePixelRatio||1,1.75),governor=createGovernor();let dpr=Math.min(dprCap,governor.pixelRatio);
 renderer.setPixelRatio(dpr);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=false;
 const sim=createBagScene({renderer,life,machineName,reducedMotion:reduced}),camera=sim.camera;
 const handSkin=life.own(handMaterial()),rigs={left:createHandRig('left',handSkin),right:createHandRig('right',handSkin)};
 // Hands are drawn last with a fresh depth buffer, so they are never hidden behind the machine they are working on.
 let handsDrawn=false;
 for(const rig of Object.values(rigs)){sim.scene.add(rig.object);rig.object.visible=false;life.own(rig.mesh.geometry);life.own(rig.mesh.skeleton);rig.mesh.renderOrder=1000;rig.mesh.onBeforeRender=gl=>{if(!handsDrawn){handsDrawn=true;gl.clearDepth();}};}
 // a camera-space helper for the interaction layer
 const tmp=new THREE.Vector3(),ray=new THREE.Vector3();
 const world={
  anchorWorld:part=>{const held=sim.parts[part].held;return held?held.toArray():sim.anchor(part,tmp).toArray();},
  anchorScreen:part=>{const a=sim.anchor(part,tmp);const z=a.z;a.project(camera);return {nx:a.x,ny:a.y,z};},
  pointAt:(nx,ny,z)=>{ray.set(nx,ny,0.5).unproject(camera).sub(camera.position).normalize();const t=(z-camera.position.z)/ray.z;return [camera.position.x+ray.x*t,camera.position.y+ray.y*t,z];},
  halfExtents:z=>{const h=(camera.position.z-z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return {w:h*camera.aspect,h};},
  hold:(part,anchor)=>sim.hold(part,anchor)
 };

 // ---- shared checklist state ----
 const steps=buildSteps(bridge.stepsFor('bag'),bridge.frames.bag),demo=buildDemo(bridge.frames.bag),practice=()=>bridge.states.bag;
 let touched=false,view='ready',input='mouse',playing=false,speed=1,demoTime=0,shownState=null,toastTimer=0,hudKey='',frameAdjust=false,tracker=null,tracking=false,heldByDemo=null;
 const stepOfFrame=index=>steps.findIndex(step=>step.frames.includes(bridge.frames.bag[index]));
 function toast(text,error=false){clearTimeout(toastTimer);const el=$('toast');el.textContent=text;el.classList.toggle('is-error',error);el.hidden=!text;if(text)toastTimer=setTimeout(()=>{el.hidden=true;},error?7000:4200);}
 life.onCleanup(()=>clearTimeout(toastTimer));
 function commit(state){bridge.states.bag=state;touched=true;}
 function dispatch(action){const out=bridge.reduce(practice(),action);commit(out.state);if(out.message&&!out.blocked)toast(out.message);renderHud();pump.invalidate();return out;}
 const interaction=createInteraction({world,getState:practice,dispatch,onHint:message=>toast(message),onEvent:()=>pump.invalidate()});

 // ---- HUD ----
 function renderHud(){
  const state=practice(),inDemo=view==='demo',frameIndex=inDemo?sampleDemo(demo,demoTime).index:-1;
  const index=inDemo?stepOfFrame(frameIndex):currentStep(steps,state),done=!inDemo&&state.complete;
  const key=[view,index,done,inDemo?0:JSON.stringify(state.clips)+state.phase,input,tracking].join('|');
  root.dataset.view=view;
  for(const name of ['demo-controls'])$(name).hidden=!inDemo;$('practice-controls').hidden=view!=='practice';
  $('mode-demo').setAttribute('aria-pressed',String(inDemo));$('mode-practice').setAttribute('aria-pressed',String(view==='practice'));
  $('camera').textContent=tracking?'Stop camera':'Use camera';$('camera').setAttribute('aria-pressed',String(tracking));
  $('done').hidden=!done;
  if(key===hudKey)return;hudKey=key;
  const step=steps[Math.min(index,steps.length-1)],frame=inDemo?bridge.frames.bag[frameIndex]:step?.frames[0];
  $('count').textContent=done?'Complete':view==='ready'?'3D dust bag':`${inDemo?'Watch · ':''}Step ${Math.min(index+1,steps.length)} of ${steps.length}`;
  $('title').textContent=done?'All done':inDemo?frame.title:step.label;$('body').textContent=done?'Reset to try again, or watch how once more.':frame.caption;
  const part=!inDemo&&!done?targetPart(state):null;$('use').hidden=!part;if(part)$('use').textContent=`Use ${labelOf(part)}${targetZone(state)?' → '+({rest:'put it on the stool',tray:'put it on the tray',bin:'put it in the bin',machine:'lower it into the machine',head:'set it back on the machine'})[targetZone(state)]:''}`;
  $('steps').innerHTML=steps.map((s,i)=>`<li class="${(done||i<index)?'is-done':i===index?'is-current':''}"><button type="button" data-step="${i}" ${inDemo?'':'aria-disabled="true" tabindex="-1"'}${i===index&&!done?' aria-current="step"':''}>${done||i<index?'✓':i+1} · ${escape(s.label)}</button></li>`).join('');
 }
 function setDemoTime(ms,{pause=false}={}){demoTime=Math.max(0,Math.min(demo.duration-1,ms));if(pause)playing=false;$('scrub').value=String(Math.round(demoTime/demo.duration*1000));const s=Math.floor(demoTime/1000);$('time').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;$('play').textContent=playing?'Pause':(demoTime>=demo.duration-50?'Replay':'Play');renderHud();pump.invalidate();}
 const stepStart=i=>demo.steps.find(item=>steps[i].frames.includes(item.frame)).start;
 function jumpStep(delta){const current=stepOfFrame(sampleDemo(demo,demoTime).index);const target=Math.max(0,Math.min(steps.length-1,current+delta));frameAdjust=true;setDemoTime(reduced?stepEnd(target):stepStart(target),{pause:true});}
 const stepEnd=i=>{const frames=demo.steps.filter(item=>steps[i].frames.includes(item.frame));return frames.at(-1).end-1;};
 function beginDemo(){interaction.cancel();releaseHolds();view='demo';root.querySelector('[data-s3=preflight]').hidden=true;shownState=null;if(demoTime>=demo.duration-50)demoTime=0;playing=!reduced;setDemoTime(demoTime);toast('');}
 function beginPractice(){interaction.cancel();releaseHolds();view='practice';$('preflight').hidden=true;shownState=null;playing=false;hudKey='';renderHud();pump.invalidate();toast(input==='hands'?`Show both hands. Stand about ${TARGET_DISTANCE} m from the camera.`:'Drag the highlighted part with the mouse or your finger.');}
 function releaseHolds(){for(const part of ['plug','head','used','fresh'])if(sim.parts[part].held)sim.hold(part,null);heldByDemo=null;}

 // ---- camera and hand tracking ----
 let tracked=[],trackInfo={count:0,distance:NaN},overlayTime=0;
 const overlayContext=overlay.getContext('2d');
 function onHands(hands,info){tracked=hands.map(h=>({...h}));trackInfo=info;pump.invalidate();const now=performance.now();if(now-overlayTime>66){overlayTime=now;drawOverlay(hands,info);}}
 function drawOverlay(hands,info){
  const c=overlayContext,w=overlay.width,h=overlay.height;c.clearRect(0,0,w,h);c.lineWidth=2;
  for(const hand of hands){c.strokeStyle=hand.holding?'#ee8c45':'#46e3e8';c.fillStyle=c.strokeStyle;c.beginPath();for(const [a,b] of SKELETON){c.moveTo(hand.norm[a*2]*w,hand.norm[a*2+1]*h);c.lineTo(hand.norm[b*2]*w,hand.norm[b*2+1]*h);}c.stroke();for(let i=0;i<21;i++){c.beginPath();c.arc(hand.norm[i*2]*w,hand.norm[i*2+1]*h,2.2,0,7);c.fill();}}
  const d=info.distance,lo=(GOOD_BAND[0]-METER[0])/(METER[1]-METER[0]),hi=(GOOD_BAND[1]-METER[0])/(METER[1]-METER[0]);
  $('marker').style.left=Number.isFinite(d)?`${Math.max(0,Math.min(1,(d-METER[0])/(METER[1]-METER[0])))*100}%`:'50%';
  $('meter-text').innerHTML=Number.isFinite(d)?`<b>≈${d.toFixed(2)} m</b> · ${escape(distanceAdvice(d))}${info.count<2?' Show both hands.':''}`:escape(distanceAdvice(d));
  void lo;void hi;
 }
 const meter=container.querySelector('.s3-meter'),lo=(GOOD_BAND[0]-METER[0])/(METER[1]-METER[0])*100,hi=(GOOD_BAND[1]-METER[0])/(METER[1]-METER[0])*100;
 meter.style.background=`linear-gradient(90deg,#ff9b6a 0 ${lo-9}%,#f4d36a ${lo-9}% ${lo}%,#5fd6a3 ${lo}% ${hi}%,#f4d36a ${hi}% ${hi+9}%,#ff9b6a ${hi+9}%)`;
 function status(text,error=false){const el=$('status');el.textContent=text;el.style.color=error?'#ffb3a6':'';}
 async function startCamera(){
  status('Asking for your camera…');$('allow').disabled=true;
  try{
   tracker??=await createHandTracker({video,life,onHands,onStatus:s=>{if(s.state==='requesting')status('Asking for your camera…');else if(s.state==='loading')status('Loading hand tracking…');}});
   await tracker.start();tracking=true;input='hands';$('camera-panel').hidden=false;status('');beginPractice();canvas.focus({preventScroll:true});
  }catch(error){
   tracking=false;input='mouse';$('camera-panel').hidden=true;status(error.message||CAMERA_MESSAGES.failed,true);$('allow').disabled=false;
   if(view!=='ready'){toast(`${error.message||CAMERA_MESSAGES.failed}`,true);}
   else{beginPractice();toast(`${error.message||CAMERA_MESSAGES.failed} Using mouse or touch instead.`,true);}
  }
 }
 function stopCamera(){tracker?.stop();tracking=false;tracked=[];trackInfo={count:0,distance:NaN};$('camera-panel').hidden=true;input='mouse';if(view==='practice')toast('Camera off. Use the mouse or touch.');renderHud();pump.invalidate();}

 // ---- mouse / touch ----
 const mouse={nx:0,ny:0,down:false,clicked:false,released:false,touch:false,inside:false};   // clicked/released latch a press that began and ended between two frames
 function pointerNdc(event){const r=canvas.getBoundingClientRect();mouse.nx=((event.clientX-r.left)/r.width)*2-1;mouse.ny=-(((event.clientY-r.top)/r.height)*2-1);}
 canvas.addEventListener('pointerdown',e=>{if(view!=='practice'||input!=='mouse')return;canvas.setPointerCapture(e.pointerId);mouse.down=true;mouse.clicked=true;mouse.inside=true;pointerNdc(e);pump.invalidate();},{signal});
 canvas.addEventListener('pointermove',e=>{if(input!=='mouse')return;mouse.inside=true;pointerNdc(e);pump.invalidate();},{signal});
 for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{mouse.down=false;mouse.released=true;mouse.touch=e.pointerType!=='mouse';pump.invalidate();},{signal});
 canvas.addEventListener('pointerleave',()=>{if(!mouse.down)mouse.inside=false;pump.invalidate();},{signal});

 // ---- per-frame update ----
 const handZ=PLACE.carryZ,contact=new THREE.Vector3(),wrist=new THREE.Vector3(),offset=new THREE.Vector3();
 const dwellEl=$('dwell');
 function placeTracked(hand,used){
  let rig=rigs[hand.chirality];if(used.has(rig))rig=rigs[hand.chirality==='left'?'right':'left'];used.add(rig);
  rig.pose(hand.local);
  const z=handZ+Math.max(-0.12,Math.min(0.12,(TARGET_DISTANCE-(Number.isFinite(hand.distance)?hand.distance:TARGET_DISTANCE))*0.4)),target=world.pointAt(hand.pinchNdc[0],hand.pinchNdc[1],z);
  contact.set((hand.local[12]+hand.local[24])/2,(hand.local[13]+hand.local[25])/2,(hand.local[14]+hand.local[26])/2*(rig.chirality==='left'?-1:1));
  offset.copy(contact).multiplyScalar(hand.scale).applyQuaternion(hand.quaternion);wrist.set(target[0],target[1],target[2]).sub(offset);
  rig.place(wrist,hand.quaternion,hand.scale);rig.object.visible=true;
 }
 function drawDemo(dt){
  if(playing){setDemoTime(demoTime+dt*1000*speed);if(demoTime>=demo.duration-1){playing=false;setDemoTime(demo.duration-1);}}
  const sample=sampleDemo(demo,demoTime),state=reduced&&frameAdjust?sample.step.frame.to:sample.state,cam=cameraAt(demo,demoTime);
  sim.setFocusBlend(cam.from,cam.to,reduced?1:cam.k);
  if(state!==shownState){shownState=state;sim.setPlaces(restingPlaces(state),{instant:reduced});}
  if(sample.held&&!reduced){sim.hold(sample.held.part,sample.held.anchor);heldByDemo=sample.held.part;}else if(heldByDemo){sim.hold(heldByDemo,null);heldByDemo=null;}
  sim.setHighlight(null,null);
  const used=new Set();for(const side of ['left','right'])rigs[side].object.visible=false;
  if(!reduced)for(const h of sample.hands){if(!h.visible)continue;const rig=rigs[h.side];placeAtContact(rig,{blend:h.pose,target:h.target,orientation:orientationForBlend(h.side,h.pose)});rig.object.visible=true;used.add(rig);}
  renderHud();
 }
 function drawPractice(dt){
  const state=practice();
  if(state!==shownState){shownState=state;sim.setPlaces(restingPlaces(state));sim.setHighlight(targetPart(state),targetZone(state));sim.setFocus(focusFor(state));renderHud();}
  let pointers=[];const used=new Set();
  if(input==='hands'&&tracking)pointers=tracked.map(h=>({id:h.id,seq:h.seq,nx:h.pinchNdc[0],ny:h.pinchNdc[1],pinch:h.holding,tipNx:h.tipNdc[0],tipNy:h.tipNdc[1]}));
  else if(input==='mouse'&&(mouse.inside||mouse.down||mouse.clicked||mouse.released))pointers=[{id:'mouse',nx:mouse.nx,ny:mouse.ny,pinch:mouse.down||mouse.clicked,tipNx:mouse.nx,tipNy:mouse.ny,dwell:false,crisp:true}];
  const report=interaction.update(dt,pointers,input==='hands'&&tracking?trackInfo.seq:undefined);
  mouse.clicked=false;if(mouse.released){mouse.released=false;if(mouse.touch)mouse.inside=false;}
  for(const rig of Object.values(rigs))rig.object.visible=false;
  if(input==='hands'&&tracking)for(const h of tracked)placeTracked(h,used);
  else if(pointers.length){const p=pointers[0],blend=[[p.pinch?'pinch':'point',1]],rig=rigs.right,target=world.pointAt(p.nx,p.ny,handZ);placeAtContact(rig,{blend,target,orientation:orientationForBlend('right',blend)});rig.object.visible=true;}
  // press progress ring over the target
  if(report.dwell){const a=world.anchorScreen(report.dwell.part),r=canvas.getBoundingClientRect();dwellEl.hidden=false;dwellEl.style.left=`${(a.nx*0.5+0.5)*r.width}px`;dwellEl.style.top=`${(-a.ny*0.5+0.5)*r.height}px`;dwellEl.style.setProperty('--p',String(report.dwell.progress));}else dwellEl.hidden=true;
  const hover=Object.values(report.hover).find(Boolean);canvas.style.cursor=input==='mouse'?(mouse.down?'grabbing':hover?'grab':'default'):'default';
 }
 let width=0,height=0;
 const pump=createPump((now,_dt,wall)=>{
  if(view==='demo')drawDemo(wall);else drawPractice(wall);
  const moving=sim.update(wall,now/1000);handsDrawn=false;renderer.render(sim.scene,camera);
  const ratio=governor.sample(wall*1000,dprCap);if(ratio!==null){dpr=ratio;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
  return moving||(view==='demo'&&playing)||tracking||mouse.inside||mouse.down||interaction.holding.length>0;
 });
 life.onCleanup(()=>pump.stop());
 const resize=new ResizeObserver(()=>{const r=stage.getBoundingClientRect();width=Math.round(r.width);height=Math.round(r.height);if(width&&height){renderer.setSize(width,height,false);sim.resize(width,height);pump.invalidate();}});resize.observe(stage);life.onCleanup(()=>resize.disconnect());
 const watch=new IntersectionObserver(entries=>pump.setVisible(entries[0].isIntersecting&&!document.hidden));watch.observe(canvas);life.onCleanup(()=>watch.disconnect());
 document.addEventListener('visibilitychange',()=>pump.setVisible(!document.hidden),{signal});
const fullButton=$('full');fullButton.hidden=!document.fullscreenEnabled;
 document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===root;fullButton.setAttribute('aria-pressed',String(on));fullButton.textContent=on?'Exit full screen':'Full screen';},{signal});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onUnavailable('lost');},{signal});

 // ---- controls ----
 container.addEventListener('click',event=>{
  const button=event.target.closest('[data-s3],[data-step]');if(!button)return;
  if(button.dataset.step!==undefined){if(view==='demo'){frameAdjust=true;setDemoTime(reduced?stepEnd(Number(button.dataset.step)):stepStart(Number(button.dataset.step)),{pause:reduced});}return;}
  switch(button.dataset.s3){
   case 'allow':startCamera();break;
   case 'use-mouse':input='mouse';beginPractice();canvas.focus({preventScroll:true});break;
   case 'watch-first':beginDemo();break;
   case 'mode-demo':beginDemo();break;
   case 'mode-practice':if(view!=='practice')beginPractice();break;
   case 'play':if(playing)playing=false;else{if(demoTime>=demo.duration-50)demoTime=0;playing=true;frameAdjust=false;}setDemoTime(demoTime);break;
   case 'prev':jumpStep(-1);break;case 'next':jumpStep(1);break;
   case 'try':beginPractice();break;
   case 'camera':if(tracking)stopCamera();else{$('preflight').hidden=false;status('');$('allow').disabled=false;}break;
   case 'reset':interaction.cancel();commit(bridge.initial('bag'));shownState=null;toast('Practice reset.');renderHud();pump.invalidate();break;
   case 'assist':{if(practice().complete)break;const state=practice(),index=currentStep(steps,state);interaction.cancel();commit(stateAfterStep(steps,index));shownState=null;renderHud();pump.invalidate();break;}
   case 'focus':{const on=!root.classList.contains('s3-focus');root.classList.toggle('s3-focus',on);button.setAttribute('aria-pressed',String(on));button.textContent=on?'Show panel':'Hide panel';break;}
   case 'full':{if(document.fullscreenElement===root)document.exitFullscreen?.();else root.requestFullscreen?.().catch(()=>toast('Full screen is not available here.',true));break;}
  }
 },{signal});
 container.addEventListener('input',event=>{if(event.target.dataset.s3==='scrub'){frameAdjust=false;setDemoTime(Number(event.target.value)/1000*demo.duration,{pause:true});}},{signal});
 container.addEventListener('change',event=>{if(event.target.dataset.s3==='speed')speed=Number(event.target.value);},{signal});
 container.addEventListener('keydown',event=>{
  const typing=event.target.closest('button,input,select');
  if(event.key==='f'||event.key==='F'){if(!typing||event.target.dataset.s3==='focus'){$('focus').click();event.preventDefault();}return;}
  if(view!=='demo')return;
  if(event.key===' '&&!typing){$('play').click();event.preventDefault();}
  else if(event.key==='ArrowRight'&&event.target.type!=='range'){jumpStep(1);event.preventDefault();}
  else if(event.key==='ArrowLeft'&&event.target.type!=='range'){jumpStep(-1);event.preventDefault();}
 },{signal});

 // initial picture: the machine as it currently is, behind the camera prompt
 sim.setPlaces(restingPlaces(practice()),{instant:true});shownState=practice();renderHud();
 const r0=stage.getBoundingClientRect();width=Math.round(r0.width)||800;height=Math.round(r0.height)||600;renderer.setSize(width,height,false);sim.resize(width,height);
 pump.invalidate();$('allow').focus({preventScroll:true});

 return {
  // What the 2D view should adopt when 3D closes.
  summary:()=>({kind:'bag',touched}),
  destroy:()=>life.dispose()
 };
}
