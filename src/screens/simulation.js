import * as THREE from 'three';
import { HandControl } from '../interaction/hands.js';
import { TaskPerformer } from '../scene/task-performer.js';
import { ICON } from '../icons.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LabModel } from '../scene/lab-models.js';
import { Worker } from '../scene/worker.js';
import { Presenter } from '../scene/presenter.js';
import { SIMULATIONS, readProgress, decide, progressKey } from '../data/simulations.js';
import { esc, store } from '../shell.js';
const playIcon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 4 11 8-11 8z"/></svg>';

export class SimulationScreen {
  constructor(app,kind){this.app=app;this.kind=kind;this.def=SIMULATIONS[kind];this.progress=readProgress(kind,store.get(progressKey(kind),'{}'));this.t=0;this.built=false;this.pending=false;this.feedback='';this.selected='';}
  title(){return this.def.title;}
  subtitle(){return 'Interactive simulation · EFS Learning Studio';}
  get wantsVoice(){return false;}
  build(){
    if(this.built)return;this.built=true;const a=this.app,d=this.def;
    this.group=new THREE.Group();this.group.visible=false;a.stage.scene.add(this.group);
    this.model=new LabModel(this.kind,a.M);this.group.add(this.model.root);
    this.worker=new Worker(a.M);this.worker.place(-1.85,1.35,0);this.group.add(this.worker.root);this.worker.setPPE('glasses',false);
    this.presenter=new Presenter(this.worker,()=>a.stage.camera.position.clone());this.worker.setPose?.('idle');
    const el=this.el=document.createElement('section');el.className='screen lab';el.lang='en';el.hidden=true;el.dataset.kind=this.kind;
    el.innerHTML=`<div class="lab-orbit" aria-label="Rotate the 3D equipment" tabindex="0"></div>
      <div class="lab-heading"><a class="lab-back" href="#/home">← Training studio</a><p class="eyebrow">${d.category} / INTERACTIVE LAB</p><h2>${esc(d.title)}</h2><p>${esc(d.subtitle)}</p><span class="lab-status">${esc(d.status)}</span></div>
      <div class="lab-toolbar"><button data-action="explode" aria-pressed="false">◇ Exploded view</button><button data-action="reset-view">↺ Reset view</button><button data-action="hands" aria-pressed="false">Start hand control</button><button data-action="hologram" aria-pressed="false">Hologram</button>${['vacuum','hvac'].includes(this.kind)?`<button data-action="airflow" aria-pressed="false">${this.kind==='hvac'?'≈ Water flow':'≈ Airflow'}</button>`:''}</div>
      <div class="lab-part-label" hidden></div><div class="lab-tasks"><div class="task-heading"><b>TASK ACTIONS</b><span>Choose an icon. Watch your trainer.</span></div><div class="task-icons"></div><p class="task-status" role="status"></p></div>
      <div class="lab-parts" aria-label="Inspect a component">${d.parts.map(([id,name])=>`<button data-part="${id}" aria-pressed="false">${esc(name)}</button>`).join('')}</div>
      <aside class="lab-panel" aria-label="Guided practice"><div class="lab-panel-top"><span>GUIDED PRACTICE</span><span class="lab-step-count"></span></div><progress class="lab-progress" max="${this.total}" value="0" aria-label="Simulation progress"></progress><div class="lab-content"></div>${this.kind==='hvac'?'<div class="plant-controls"><label>Simulated demand <output>40%</output><input aria-label="Simulated plant demand" type="range" min="0" max="100" value="40"></label><p class="plant-readout"></p><small>Illustrative capacity thresholds; not site setpoints.</small></div>':''}<div class="lab-feedback" role="status" aria-live="polite"></div><div class="lab-footer"><button data-action="narrate">${playIcon} Hear guidance</button><button data-action="restart">Restart</button></div><p class="lab-language" hidden>New simulation guidance is currently in English. The vacuum SOP lesson supports all three languages.</p><details class="lab-source"><summary>Safety & source notes</summary><p>${esc(d.safety)}</p>${d.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</details></aside>
      <div class="lab-caption"><span class="lab-live-dot"></span> LIVE 3D <span>Drag to rotate · Scroll to zoom</span><small>${esc(d.modelNote)}</small></div>`;
    a.shell.screensEl.appendChild(el);
    this.controls=new OrbitControls(a.stage.camera,el.querySelector('.lab-orbit'));this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=2.4;this.controls.maxDistance=8;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI*.83;this.controls.enabled=false;
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.task!==undefined){this.demonstrate(+b.dataset.task);return;}if(b.dataset.part){this.select(b.dataset.part);return;}if(b.dataset.choice!==undefined){this.choose(+b.dataset.choice);return;}this.action(b.dataset.action);});
    el.querySelector('.lab-orbit').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const delta=e.key==='ArrowLeft'?-.2:.2;const off=a.stage.camera.position.clone().sub(this.controls.target);off.applyAxisAngle(new THREE.Vector3(0,1,0),delta);a.stage.camera.position.copy(this.controls.target).add(off);this.controls.update();}});
    let down=null;const orbit=el.querySelector('.lab-orbit');orbit.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});orbit.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6)this.pickAt(e.clientX,e.clientY);down=null;});
    this.hands=new HandControl(this);this.performer=new TaskPerformer(this);
    this.sign=new THREE.Group();const signMesh=new THREE.Mesh(new THREE.BoxGeometry(.3,.55,.06),new THREE.MeshStandardMaterial({color:0xf3d442}));signMesh.position.y=.3;this.sign.add(signMesh);this.sign.position.set(-1.5,0,1.8);this.sign.visible=false;this.group.add(this.sign);
    el.querySelector('.plant-controls input')?.addEventListener('input',e=>{this.model.demand=+e.target.value;el.querySelector('.plant-controls output').textContent=e.target.value+'%';});
    this.restoreModel();this.paint();
  }
  setExplode(value){this.model.explodeTarget=THREE.MathUtils.clamp(value,0,1);this.el.querySelector('[data-action=explode]').setAttribute('aria-pressed',String(value>.05));}
  setTaskStatus(text){this.el.querySelector('.task-status').textContent=text;}
  paintTasks(){const current=Math.min(this.progress.index,this.def.steps.length-1);this.el.querySelector('.task-icons').innerHTML=this.def.steps.map((step,i)=>`<button type="button" data-task="${i}" title="${esc(step.title)}" aria-label="Demonstrate ${esc(step.title)}" ${i>current?'disabled':''} class="${i===current?'current':''}">${ICON[{prepare:'check',inspect:'search',isolate:'power',open:'apart',bag:'vacuum',close:'check',run:'play',finish:'check',pumps:'air','stage-lag':'snow',fault:'info',restore:'reset',bit:'drill',verify:'check'}[step.action]]||ICON.gear}<small>${String(i+1).padStart(2,'0')}</small></button>`).join('');}
  demonstrate(index){if(index<0||index>this.progress.index||index>=this.def.steps.length)return;this.performer.play(index);this.select(this.def.steps[index].focus);}
  pickAt(x,y){const bounds=this.app.host.getBoundingClientRect(),p=new THREE.Vector2((x-bounds.left)/bounds.width*2-1,-(y-bounds.top)/bounds.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,this.app.stage.camera);for(const hit of ray.intersectObject(this.model.root,true)){let o=hit.object;while(o){const id=o.userData.part||o.name;if(this.def.parts.some(p=>p[0]===id)){this.select(id);return;}o=o.parent;}}}
  get total(){return this.def.steps.length+this.def.quiz.length;}
  get complete(){return this.progress.index>=this.total;}
  get current(){return this.def.steps[this.progress.index]||this.def.quiz[this.progress.index-this.def.steps.length];}
  restoreModel(){this.model.setActions(this.def.steps.slice(0,Math.min(this.progress.index,this.def.steps.length)).map(s=>s.action));}
  enter(){this.restoreModel();this.group.visible=true;this.el.hidden=false;this.controls.enabled=true;this.app.stage.setLook({bg:new THREE.Color(0x0c1c28),fog:'none',hemi:.45,key:1.7,fill:.55,rim:1.2,env:.4,exposure:.85,bloom:0,keyPos:[-3,6,5],keyColor:0xfff7e7,rimColor:0x69d9cb,shift:innerWidth>850?-.13:0,shadow:[4,4]});this.resetView();this.paint();}
  leave(){this.hands.stop();this.performer.stop();this.group.visible=false;this.el.hidden=true;this.controls.enabled=false;this.app.narrator.stop();this.presenter.stop();}
  resetView(){const s=this.app.stage;s.camera.position.copy(this.model.camera);s.fov=38;s.camera.fov=38;this.controls.target.copy(this.model.center);if(innerWidth<850){this.controls.target.y-=.7;this.controls.target.x-=.3;s.camera.position.multiplyScalar(1.5);}s.camera.updateProjectionMatrix();this.controls.update();}
  onLang(){this.paint();this.app.narrator.stop();}
  onMute(){if(this.app.narrator.muted)this.app.narrator.stop();}
  pause(){this.app.narrator.stop();this.presenter.stop();this.performer.stop();this.hands.stop();}
  select(id){const p=this.def.parts.find(p=>p[0]===id);if(!p)return;this.selected=this.selected===id?'':id;this.model.setFocus(this.selected);const label=this.el.querySelector('.lab-part-label');label.hidden=!this.selected;label.innerHTML=this.selected?`<b>${esc(p[1])}</b><span>${esc(p[2])}</span>`:'';this.el.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===this.selected)));}
  action(name){
    if(name==='explode')this.setExplode(this.model.explodeTarget>.5?0:1);
    if(name==='hands'){if(this.hands.active||this.hands.loading)this.hands.stop();else this.hands.start();}
    if(name==='hologram'){this.hologram=!this.hologram;this.model.setHologram(this.hologram);this.el.querySelector('[data-action=hologram]').setAttribute('aria-pressed',String(this.hologram));}
    if(name==='airflow'){this.model.flowOn=!this.model.flowOn;this.el.querySelector('[data-action=airflow]').setAttribute('aria-pressed',String(this.model.flowOn));}
    if(name==='reset-view')this.resetView();
    if(name==='restart'){this.performer.stop();this.app.narrator.stop();this.presenter.stop();this.progress={index:0,mistakes:0};this.pending=false;this.feedback='New practice started. Your previous progress for this module has been reset.';this.model.explodeTarget=0;this.model.flowOn=false;this.restoreModel();this.persist();this.paint();}
    if(name==='narrate')this.speak();
    if(name==='continue'){this.performer.stop();this.restoreModel();this.pending=false;this.feedback='';this.paint();this.speak();}
  }
  choose(choice){
    if(this.pending||this.complete)return;const item=this.current,next=decide(this.kind,this.progress,choice);this.progress={index:next.index,mistakes:next.mistakes};
    this.feedback=next.accepted?(item.feedback||item.explanation):`Try again. ${item.feedback||item.explanation}`;
    this.pending=next.accepted&&!this.complete;this.model.explodeTarget=0;this.restoreModel();this.persist();this.paint();
    this.app.narrator.stop();if(this.app.canSpeak)this.app.narrator.speak(this.feedback,'en');if(next.accepted&&item.action)this.demonstrate(this.progress.index-1);else this.presenter.play('nod');
  }
  persist(){store.set(progressKey(this.kind),JSON.stringify(this.progress));window.dispatchEvent(new CustomEvent('efs-progress',{detail:{kind:this.kind,...this.progress}}));}
  speak(){this.app.unlock();const c=this.current,text=this.complete?'Practice complete. You can review the equipment or restart this module.':`${c.title||'Knowledge check'}. ${c.instruction||c.question}`;if(this.app.narrator.muted){this.feedback='Sound is muted. Use the sound button in the top bar to enable narration.';this.paint();return;}const h=this.app.narrator.speak(text,'en');this.handle=h;this.presenter.play('nod');if(h.silent){this.feedback='An English speech voice is unavailable. The full guidance is shown here.';this.paint();}}
  paint(){
    if(!this.built)return;const d=this.def,index=this.progress.index,c=this.current,quiz=index>=d.steps.length;
    this.el.querySelector('.lab-step-count').textContent=`${Math.min(index+1,this.total)} / ${this.total}`;
    this.el.querySelector('.lab-progress').value=index;
    let html;
    if(this.complete){html=`<div class="lab-complete-mark">✓</div><p class="eyebrow">PRACTICE COMPLETE</p><h3>Well practised.</h3><p>You completed ${d.steps.length} guided decisions and ${d.quiz.length} knowledge checks.</p><div class="lab-result"><b>${this.progress.mistakes===0?'First-time accuracy':'Learning through practice'}</b><span>${this.progress.mistakes} ${this.progress.mistakes===1?'retry':'retries'} · Saved on this device</span></div><p class="lab-instruction">This records simulation practice, not competence certification. A supervisor must verify practical skills.</p><a class="lab-return" href="#/home">Explore another module →</a>`;}
    else if(this.pending){const prev=index<=d.steps.length?d.steps[index-1]:d.quiz[index-d.steps.length-1];html=`<p class="eyebrow">DECISION CONFIRMED</p><h3>${esc(prev.title||'Knowledge checked')}</h3><p class="lab-instruction">${esc(prev.feedback||prev.explanation)}</p><div class="lab-actions"><button class="lab-primary" data-action="continue">${index===d.steps.length?'Begin knowledge check':'Continue'} →</button></div>`;}
    else {const choices=c.choices.map((label,i)=>({label,i}));if(index%2===1)choices.reverse();html=`<p class="eyebrow">${quiz?'KNOWLEDGE CHECK':'STEP '+String(index+1).padStart(2,'0')}</p><h3>${esc(c.title||c.question)}</h3><p class="lab-instruction">${esc(c.instruction||(quiz?'Choose the safest answer to complete your learning.':''))}</p><div class="lab-actions">${choices.map(({label,i})=>`<button data-choice="${i}"><span>${esc(label)}</span><span aria-hidden="true">→</span></button>`).join('')}</div>`;}
    this.el.querySelector('.lab-content').innerHTML=html;const feedback=this.el.querySelector('.lab-feedback');feedback.textContent=this.feedback;feedback.hidden=!this.feedback||this.pending;feedback.classList.toggle('is-error',this.feedback.startsWith('Try again'));
    this.paintTasks();
    this.el.querySelector('.lab-language').hidden=this.app.lang==='en';
    this.el.querySelector('[data-action=explode]').setAttribute('aria-pressed',String(!!this.model.explodeTarget));const airflow=this.el.querySelector('[data-action=airflow]');if(airflow)airflow.setAttribute('aria-pressed',String(this.model.flowOn));
  }
  update(dt){this.t+=dt;this.model.update(dt,this.t);this.controls.update();if(!this.performer.running)this.presenter.update(dt);this.performer.update(dt);if(this.kind==='hvac'){const p=this.model.plantState();this.el.querySelector('.plant-readout').textContent=p.alarm?'FLOW ALARM · compressors inhibited':`Flow ${p.flow?'verified':'not proven'} · ${p.stages} of 2 chillers running`; }this.worker.setMouth(this.app.narrator.lip.update(dt));this.worker.update(dt);}
}
