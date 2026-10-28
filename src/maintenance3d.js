import * as THREE from 'three';
import hudCss from './maintenance3d.hud';
import {buildSteps,currentStep,stateBeforeStep,stateAfterStep} from './sim3d/steps.js';
import {createLifecycle} from './sim3d/lifecycle.js';
import {createPump} from './sim3d/pump.js';

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Mounts the lazy 3D view. `bridge` is filled by the 2D module and carries the one shared checklist state.
// Throws when a WebGL2 context cannot be created; calls onUnavailable(reason) if the context is lost later.
export function mountMaintenance3D(container,{bridge,onUnavailable=()=>{}}){
 const life=createLifecycle(),{signal}=life;
 const style=document.createElement('style');style.textContent=hudCss;document.head.append(style);life.onCleanup(()=>style.remove());
 container.innerHTML=`<div class="s3" role="region" aria-label="3D maintenance simulation"><canvas class="s3-canvas" tabindex="0" aria-label="3D simulation viewport"></canvas><div class="s3-hud"><div class="s3-tabs" role="tablist" aria-label="Maintenance task"></div><div><h3 class="s3-title">Checklist</h3><ol class="s3-steps" aria-label="Checklist steps"></ol></div><div class="s3-bar"><span class="s3-badge">3D SIMULATION · SHELL</span><span class="s3-status" role="status"></span><button type="button" data-s3="done">Mark step done</button></div></div></div>`;
 life.onCleanup(()=>container.replaceChildren());
 const canvas=container.querySelector('canvas'),tabs=container.querySelector('.s3-tabs'),list=container.querySelector('.s3-steps'),status=container.querySelector('.s3-status'),doneButton=container.querySelector('[data-s3=done]');

 // ---- renderer: linear workflow, sRGB output, ACES, DPR capped, no shadow maps ----
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,stencil:false,powerPreference:'high-performance'});}
 catch(error){life.dispose();throw error;}
 life.onCleanup(()=>{renderer.dispose();renderer.forceContextLoss();});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=false;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#050f12');
 const camera=new THREE.PerspectiveCamera(38,1,.1,60);camera.position.set(3.6,2.6,5.2);camera.lookAt(0,.9,0);
 const grid=life.own(new THREE.GridHelper(12,24,0x46e3e8,0x1a4a50));grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
 const pump=createPump(()=>{renderer.render(scene,camera);return false;});life.onCleanup(()=>pump.stop());
 const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();pump.invalidate();}});resize.observe(container);life.onCleanup(()=>resize.disconnect());
 const watch=new IntersectionObserver(entries=>pump.setVisible(entries[0].isIntersecting&&!document.hidden));watch.observe(canvas);life.onCleanup(()=>watch.disconnect());
 document.addEventListener('visibilitychange',()=>pump.setVisible(!document.hidden),{signal});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onUnavailable('lost');},{signal});

 // ---- shared checklist state: read from and written to the 2D module's own state objects ----
 let kind=bridge.getActive(),changed=null;
 const stepsOf=task=>buildSteps(bridge.stepsFor(task),bridge.frames[task]);
 function paint(){
  tabs.innerHTML=Object.entries(bridge.titles).map(([task,title])=>`<button type="button" role="tab" data-task="${task}" aria-selected="${task===kind}">${escape(title)}</button>`).join('');
  const state=bridge.states[kind],steps=stepsOf(kind),index=currentStep(steps,state);
  list.innerHTML=steps.map((step,i)=>`<li class="${state.complete||i<index?'is-done':i===index?'is-current':''}"><button type="button" data-step="${i}"${i===index&&!state.complete?' aria-current="step"':''}>${state.complete||i<index?'✓':i+1} · ${escape(step.label)}</button></li>`).join('');
  status.textContent=state.complete?'Sequence complete':`Step ${index+1} of ${steps.length}`;doneButton.disabled=state.complete;pump.invalidate();
 }
 function write(next){bridge.states[kind]=next;changed=kind;paint();}
 container.addEventListener('click',event=>{
  const tab=event.target.closest('[data-task]');if(tab){kind=tab.dataset.task;paint();return;}
  const step=event.target.closest('[data-step]');if(step){const steps=stepsOf(kind);write(stateBeforeStep(steps,Number(step.dataset.step),bridge.initial(kind)));return;}
  if(event.target.closest('[data-s3=done]')){const steps=stepsOf(kind),state=bridge.states[kind];if(!state.complete)write(stateAfterStep(steps,currentStep(steps,state)));}
 },{signal});
 document.addEventListener('efs-guide-language',paint,{signal});
 paint();

 return {
  // What the 2D view should adopt when 3D closes: the task last changed here, if any.
  summary:()=>({kind:changed??kind,touched:changed!==null}),
  destroy:()=>life.dispose()
 };
}
