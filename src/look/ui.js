import {getLook,setLook} from './look.js';
import {partRows,isHidden} from './layers.js';
import {STOPS,stageName} from './motion.js';
import {faultsFor} from './faults.js';

// The floating controls every equipment page shares: look switch, parts panel, detail sheet, staged teardown, layer dock,
// fault finder and keyboard shortcuts. It knows nothing about three.js; each page hands it an adapter:
//   machine {id,name,intro}, parts [{id,name,group,body,why,motion,evidence?}], safety, source,
//   get() -> {part,open,fault,flags:{xray,callouts,flow,guides,glow,orbit}}, select(id|null), setOpen(percent), setFlag(name,on),
//   camera(action), flyTo(id), setFault(id), hand? {toggle(), active}
const ICONS={
 xray:'<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/>',
 callouts:'<path d="M4 18l6-6h9"/><circle cx="4" cy="18" r="1.4"/><rect x="13" y="6" width="8" height="5" rx="1"/>',
 flow:'<path d="M3 8c3 0 3 3 6 3s3-3 6-3 3 3 6 3M3 15c3 0 3 3 6 3s3-3 6-3 3 3 6 3"/>',
 guides:'<path d="M5 3v18M19 3v18M5 7h14M5 17h14" stroke-dasharray="3 3"/>',
 glow:'<circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 orbit:'<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
 focus:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
 'zoom-out':'<circle cx="11" cy="11" r="6.5"/><path d="M8 11h6M16 16l5 5"/>',
 'zoom-in':'<circle cx="11" cy="11" r="6.5"/><path d="M8 11h6M11 8v6M16 16l5 5"/>',
 reset:'<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
 hand:'<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v7M14 10V5.5a1.5 1.5 0 0 1 3 0V13M17 11a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-3-5a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
 fault:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
 parts:'<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 detail:'<path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const LAYER_BUTTONS=[['xray','X-ray shell','See inside: the shell turns translucent'],['callouts','Callouts','Leader lines with part names'],['flow','Flow path','Show the conceptual flow path'],['guides','Guides','Dashed lines from each part to its resting place'],['glow','Glow','Highlight glow and bloom'],['orbit','Orbit','Slow auto-rotate that pauses on input'],['focus','Focus view','Hide all panels (F)']];
const CAMERA_BUTTONS=[['rotate-left','↶','Rotate left'],['rotate-right','↷','Rotate right']];

const element=(tag,className,html='')=>{const el=document.createElement(tag);if(className)el.className=className;if(html)el.innerHTML=html;return el;};
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountLookUI(host,adapter,{ids={},focus:startFocused=false}={}){
 const abort=new AbortController(),{signal}=abort;
 let rows=[],categories=[],filter='all',machineId=adapter.machine.id,faults=[],focus=false,last='',sheet='',handActive=false;
 host.classList.add('look-stage');
 const root=element('div','lk-root');
 root.innerHTML=`
  <div class="lk-top"><div class="lk-hint"><span>Drag to orbit</span><span>Scroll or pinch to open</span><span>Click a part</span><span><kbd>[</kbd><kbd>]</kbd> step parts</span><span><kbd>F</kbd> focus</span></div><div class="lk-banner" role="status" hidden></div></div>
  <aside class="lk-panel lk-parts" aria-label="Parts">
   <div class="lk-switch" role="group" aria-label="Look"><button type="button" data-look="studio">Studio</button><button type="button" data-look="hologram">Hologram</button></div>
   <div class="lk-heading"><h2>Parts</h2><code class="lk-count"></code></div>
   <div class="lk-chips" role="group" aria-label="Filter parts by category"></div>
   <ul class="lk-list"></ul>
  </aside>
  <div class="lk-right"><div class="lk-slot"></div><aside class="lk-panel lk-detail" aria-label="Part details" aria-live="polite"></aside></div>
  <div class="lk-bottom">
   <div class="lk-teardown"><div class="lk-readout"><output class="lk-percent"></output><span class="lk-stage"></span></div><div class="lk-track"><input class="lk-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Staged teardown"><div class="lk-stops"></div></div></div>
   <button type="button" class="lk-focus-pill" data-focus-exit aria-label="Show parts, details and controls (F)">${icon('parts')}<span>Parts &amp; controls</span></button>
   <div class="lk-sheet-tabs"><button type="button" data-sheet="parts">${icon('parts')}<span>Parts</span></button><button type="button" data-sheet="detail">${icon('detail')}<span>Details</span></button><button type="button" data-look-cycle>${icon('glow')}<span class="lk-look-name"></span></button></div>
   <div class="lk-dock" role="toolbar" aria-label="Layers and camera"></div>
  </div>
  <svg class="lk-leaders" aria-hidden="true"></svg><div class="lk-labels" aria-hidden="true"></div>`;
 host.append(root);
 const q=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
 const dock=q('.lk-dock');

 // ---- dock: layers, camera, hand control, fault finder ----
 const layerGroup=element('div','lk-group lk-layers');
 for(const [name,label,title] of LAYER_BUTTONS){const b=element('button','lk-tool',`${icon(name)}<span>${label}</span>`);b.type='button';b.dataset.tool=name;b.title=title;b.setAttribute('aria-pressed','false');layerGroup.append(b);}
 const cameraGroup=element('div','lk-group camera-buttons');cameraGroup.setAttribute('aria-label','Camera controls');
 for(const [action,glyph,label] of CAMERA_BUTTONS){const b=element('button','lk-tool lk-icon-only',`<b aria-hidden="true">${glyph}</b><span>${label}</span>`);b.type='button';b.dataset.camera=action;b.title=label;b.setAttribute('aria-label',label);if(ids[action])b.id=ids[action];cameraGroup.append(b);}
 for(const [action,label] of [['zoom-out','Zoom out'],['zoom-in','Zoom in'],['reset','Reset view (R)']]){const b=element('button','lk-tool',`${icon(action)}<span>${label.replace(/ \(R\)/,'')}</span>`);b.type='button';b.dataset.camera=action==='reset'?'reset':action;b.title=label;b.setAttribute('aria-label',label);const key=action==='reset'?'camera-reset':action;if(ids[key])b.id=ids[key];cameraGroup.append(b);}
 const extras=element('div','lk-group lk-extras');
 if(adapter.hand){const b=element('button','lk-tool',`${icon('hand')}<span>Hand control</span>`);b.type='button';b.dataset.tool='hand';b.title='Control the model with your hands and webcam';b.setAttribute('aria-pressed','false');extras.append(b);}
 const faultLabel=element('label','lk-fault',`${icon('fault')}<span>Fault finder</span><select aria-label="Fault finder"></select>`);extras.append(faultLabel);
 dock.append(layerGroup,cameraGroup,extras);

 // ---- teardown: four named stops, large percentage and stage name ----
 const slider=q('.lk-slider'),stops=q('.lk-stops');
 for(const stop of STOPS){const b=element('button','lk-stop',escape(stop.label));b.type='button';b.dataset.stop=stop.value;b.style.setProperty('--at',`${stop.value}%`);stops.append(b);}
 slider.addEventListener('input',()=>adapter.setOpen(Number(slider.value)),{signal});
 stops.addEventListener('click',e=>{const b=e.target.closest('[data-stop]');if(b)adapter.setOpen(Number(b.dataset.stop));},{signal});

 // ---- look switch ----
 const syncLook=()=>{for(const b of all('[data-look]'))b.setAttribute('aria-pressed',String(b.dataset.look===getLook()));q('.lk-look-name').textContent=getLook()==='studio'?'Studio':'Hologram';};
 q('.lk-switch').addEventListener('click',e=>{const b=e.target.closest('[data-look]');if(b){setLook(b.dataset.look);syncLook();}},{signal});
 q('[data-look-cycle]').addEventListener('click',()=>{setLook(getLook()==='studio'?'hologram':'studio');syncLook();},{signal});
 document.addEventListener('efs-look',syncLook,{signal});syncLook();

 // ---- parts panel ----
 function paintParts(){
  const built=partRows(machineId,adapter.parts);rows=built.rows;categories=built.categories;
  q('.lk-count').textContent=String(rows.length).padStart(2,'0');
  q('.lk-chips').innerHTML=`<button type="button" class="lk-chip" data-chip="all" aria-pressed="${filter==='all'}">All <b>${rows.length}</b></button>`+categories.map(c=>`<button type="button" class="lk-chip" data-chip="${c.id}" style="--c:${c.color}" aria-pressed="${filter===c.id}"><i></i>${escape(c.label)} <b>${c.count}</b></button>`).join('');
  paintList();
 }
 function visibleRows(){return rows.filter(r=>filter==='all'||r.category===filter);}
 function paintList(){
  q('.lk-list').innerHTML=`<li><button type="button" class="lk-part lk-whole" data-part="overview"><i class="lk-dot"></i><span class="lk-name">Whole machine</span><code class="lk-tag">ALL</code></button></li>`+visibleRows().map(r=>`<li><button type="button" class="lk-part" data-part="${r.id}" style="--c:${r.color}"${r.hidden?' data-hidden="true" title="Inside the shell: selecting it opens the model"':''}><i class="lk-dot"></i><span class="lk-name">${escape(r.name)}</span><code class="lk-tag">${r.tag}</code></button></li>`).join('');
  last='';update();
 }
 q('.lk-chips').addEventListener('click',e=>{const b=e.target.closest('[data-chip]');if(!b)return;filter=b.dataset.chip;for(const c of all('.lk-chip'))c.setAttribute('aria-pressed',String(c.dataset.chip===filter));paintList();},{signal});
 q('.lk-list').addEventListener('click',e=>{const b=e.target.closest('[data-part]');if(b)choose(b.dataset.part);},{signal});

 // Selecting asks the page to select (and reveal, if the part is hidden inside), then flies the camera to it.
 function choose(id){
  if(id==='overview'||!id){adapter.select(null);adapter.camera('reset');return;}
  adapter.select(id);adapter.flyTo(id);if(narrow.matches&&sheet!=='detail')setSheet('detail');
 }
 function step(direction){
  const list=visibleRows();if(!list.length)return;
  const current=list.findIndex(r=>r.id===adapter.get().part),next=current<0?(direction>0?0:list.length-1):(current+direction+list.length)%list.length;
  choose(list[next].id);q(`.lk-part[data-part="${list[next].id}"]`)?.scrollIntoView({block:'nearest'});
 }

 // ---- detail sheet ----
 function paintDetail(state){
  const part=adapter.parts.find(p=>p.id===state.part),box=q('.lk-detail');
  if(!part){
   box.innerHTML=`<code class="lk-eyebrow">WHOLE MACHINE</code><h2>${escape(adapter.machine.name)}</h2><p>${escape(adapter.machine.intro||'')}</p><p class="lk-muted">Select a part in the list or on the model to see what it is, what it does and how to isolate it.</p>${safetyBlock()}`;return;
  }
  const row=rows.find(r=>r.id===part.id),info=adapter.info?.(part.id)||{};
  box.innerHTML=`<div class="lk-detail-top"><code class="lk-eyebrow" style="--c:${row?.color||'currentColor'}"><i></i>${escape((part.group||'').toUpperCase())}${row?` · ${row.tag}`:''}</code><button type="button" class="lk-close" aria-label="Deselect part (Esc)" data-close>×</button></div><h2>${escape(part.name)}</h2>
   <section><h3>What it is</h3><p>${escape(info.what??part.body)}</p></section>
   <section><h3>What it does</h3><p>${escape(info.does??[part.motion,part.why].filter(Boolean).join(' '))}</p></section>
   <section class="lk-safety"><h3>Safety and isolation</h3><p>${escape(info.safety??adapter.safety)}</p></section>
   <section><h3>Source and fidelity</h3><p>${escape(info.source??part.evidence??adapter.source)}</p></section>`;
 }
 const safetyBlock=()=>`<section class="lk-safety"><h3>Safety and isolation</h3><p>${escape(adapter.safety)}</p></section>`;
 q('.lk-detail').addEventListener('click',e=>{if(e.target.closest('[data-close]'))adapter.select(null);},{signal});

 // ---- fault finder ----
 const select=q('.lk-fault select');
 function paintFaults(){faults=faultsFor(machineId);select.innerHTML=`<option value="">Fault finder…</option>`+faults.map(f=>`<option value="${f.id}">${escape(f.label)}</option>`).join('');select.value=adapter.get().fault||'';}
 // Choosing a condition shows its parts: X-ray if some are hidden inside the shell, then the camera goes to the first.
 select.addEventListener('change',()=>{
  adapter.setFault(select.value);
  const fault=faults.find(f=>f.id===select.value);if(!fault)return;
  if(fault.parts.some(id=>isHidden(machineId,id))&&!adapter.get().flags.xray)adapter.setFlag('xray',true);
  if(fault.parts.length===1)adapter.flyTo(fault.parts[0]);
 },{signal});
 function paintBanner(id){
  const banner=q('.lk-banner'),fault=faults.find(f=>f.id===id);banner.hidden=!fault;
  if(fault)banner.innerHTML=`<div><code>CONDITION</code><strong>${escape(fault.label)}</strong></div><p><b>Cause.</b> ${escape(fault.cause)}</p><p><b>Check.</b> ${escape(fault.check)}</p><button type="button" data-clear aria-label="Clear the condition">Clear</button>`;
 }
 q('.lk-banner').addEventListener('click',e=>{if(e.target.closest('[data-clear]'))adapter.setFault('');},{signal});

 // ---- dock actions ----
 dock.addEventListener('click',e=>{
  const tool=e.target.closest('[data-tool]'),cam=e.target.closest('[data-camera]');
  if(cam){adapter.camera(cam.dataset.camera,true);return;}
  if(!tool)return;
  if(tool.dataset.tool==='focus'){setFocus(!focus);return;}
  if(tool.dataset.tool==='hand'){adapter.hand.toggle();return;}
  adapter.setFlag(tool.dataset.tool,tool.getAttribute('aria-pressed')!=='true');
 },{signal});
 function setFocus(on){if(focus===on)return;focus=on;calloutKey='';host.classList.toggle('lk-focus',on);adapter.onFocus?.(on);update();}

 // ---- narrow screens: the panels become bottom sheets ----
 const narrow=matchMedia('(max-width:768px)');
 function setSheet(next){sheet=sheet===next?'':next;host.dataset.sheet=sheet;for(const b of all('[data-sheet]'))b.setAttribute('aria-pressed',String(b.dataset.sheet===sheet));}
 q('.lk-sheet-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-sheet]');if(b)setSheet(b.dataset.sheet);},{signal});
 narrow.addEventListener('change',()=>{if(!narrow.matches){sheet='';host.dataset.sheet='';}},{signal});

 // ---- keyboard: [ ] step parts, F focus, R reset, arrows orbit and open, Esc deselect ----
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||!host.offsetParent)return;
  // Shortcuts belong to the stage: they work when focus is inside it, or when nothing is focused and the stage is what is on screen,
  // so the arrow keys can still scroll the page when you are reading below it.
  const target=e.target,box=host.getBoundingClientRect(),onScreen=box.bottom>innerHeight*.3&&box.top<innerHeight*.7;
  if(target.closest?.('input,textarea,select,[contenteditable],dialog,[role=dialog]'))return;
  if(!host.contains(target)&&!(target===document.body&&onScreen))return;
  const key=e.key,state=adapter.get();let used=true;
  if(key==='['||key===']')step(key===']'?1:-1);
  else if(key==='f'||key==='F')setFocus(!focus);
  else if(key==='r'||key==='R'){adapter.select(null);adapter.camera('reset');}
  else if(key==='ArrowLeft'||key==='ArrowRight')adapter.camera(key==='ArrowLeft'?'rotate-left':'rotate-right',true);
  else if(key==='ArrowUp')adapter.setOpen(Math.min(100,state.open+10));
  else if(key==='ArrowDown')adapter.setOpen(Math.max(0,state.open-10));
  else if(key==='Escape'){if(state.part&&state.part!=='overview')adapter.select(null);else if(focus)setFocus(false);else if(sheet)setSheet(sheet);else used=false;}
  else used=false;
  if(used)e.preventDefault();
 },{signal});

 // ---- callouts: leader lines from each part to a name, spread so labels never overlap ----
 const leaders=q('.lk-leaders'),labels=q('.lk-labels');let calloutKey='';
 function drawCallouts(items,width,height){
  // the collapsed (focus) view is just the machine: no name tags until the controls are opened
  if(!items?.length||focus){if(calloutKey){leaders.replaceChildren();labels.replaceChildren();calloutKey='';}return;}
  const centre=width/2,sides=[[],[]];
  for(const item of items)sides[item.x<centre?0:1].push(item);
  const key=items.map(i=>`${i.id}${Math.round(i.x/3)}${Math.round(i.y/3)}`).join('');if(key===calloutKey)return;calloutKey=key;
  let svg='',html='';
  sides.forEach((side,s)=>{
   side.sort((a,b)=>a.y-b.y);let previous=-1e9;
   for(const item of side){
    const wide=item.name.length*6.3+20,y=Math.max(item.y,previous+24),x=s?Math.min(item.x+70,width-wide-8):Math.max(item.x-70,wide+8);previous=y;
    svg+=`<path d="M${item.x.toFixed(1)} ${item.y.toFixed(1)}L${(x+(s?-6:6)).toFixed(1)} ${y.toFixed(1)}"/><circle cx="${item.x.toFixed(1)}" cy="${item.y.toFixed(1)}" r="2.5"/>`;
    html+=`<span style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px" class="${s?'right':'left'}">${escape(item.name)}</span>`;
   }
  });
  leaders.setAttribute('viewBox',`0 0 ${width} ${height}`);leaders.innerHTML=svg;labels.innerHTML=html;
 }

 // ---- repaint what changed ----
 function update(){
  const state=adapter.get(),tick=JSON.stringify([state.part,Math.round(state.open*10),state.fault,state.flags,focus,handActive,filter,machineId]);
  if(tick===last)return;last=tick;
  slider.value=state.open;slider.style.setProperty('--p',`${state.open}%`);slider.setAttribute('aria-valuetext',`${Math.round(state.open)} percent, ${stageName(state.open)}`);
  q('.lk-percent').innerHTML=`${Math.round(state.open)}<small>%</small>`;q('.lk-stage').textContent=stageName(state.open);
  for(const b of all('.lk-stop')){b.classList.toggle('reached',state.open>=Number(b.dataset.stop));if(b.textContent===stageName(state.open))b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}
  for(const b of all('.lk-part'))b.setAttribute('aria-pressed',String(b.dataset.part===(state.part||'overview')));
  for(const b of all('[data-tool]')){const name=b.dataset.tool;if(name==='focus')b.setAttribute('aria-pressed',String(focus));else if(name==='hand')b.setAttribute('aria-pressed',String(handActive));else b.setAttribute('aria-pressed',String(Boolean(state.flags[name])));}
  select.value=state.fault||'';paintBanner(state.fault);paintDetail({...state,part:state.part==='overview'?null:state.part});
  for(const b of all('[data-part]'))b.toggleAttribute('data-related',Boolean(faults.find(f=>f.id===state.fault)?.parts.includes(b.dataset.part)));
 }

 q('[data-focus-exit]').addEventListener('click',()=>setFocus(false),{signal});
 paintParts();paintFaults();update();
 if(startFocused)setFocus(true);
 return {
  update,drawCallouts,setFocus,
  get focus(){return focus;},
  get slot(){return q('.lk-slot');},
  get dock(){return dock;},
  get cameraGroup(){return cameraGroup;},
  setHandActive(on){handActive=on;update();},
  setMachine(next){if(next&&next!==adapter)Object.assign(adapter,next);machineId=adapter.machine.id;filter='all';paintParts();paintFaults();last='';update();},
  refreshParts(){paintParts();last='';update();},
  destroy(){abort.abort();root.remove();host.classList.remove('look-stage','lk-focus');delete host.dataset.sheet;}
 };
}
