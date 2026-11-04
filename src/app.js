import {hardServices,operatorChecks} from './content.js';
import {initialState,transition} from './machine-state.js';
import {hardList,hardModules} from './hard-content.js';
import {vacuumModules,vacuumPartList,scrubberModule} from './soft-content.js';
import {mountGuidance} from './guidance.js';
import {initLook} from './look/look.js';
import {isHidden} from './look/layers.js';
import {revealOpening,runView} from './look/motion.js';
import {layerOf} from './look/layers.js';
import {faultsFor} from './look/faults.js';
import {handHandle,stopHands} from './look/hand-lazy.js';
initLook();
const $=id=>document.getElementById(id),guidance=mountGuidance($('machine-guidance'));let machine=vacuumModules['junior-103'],parts=machine.parts,state=initialState(machine.id);let viewer,viewerReady,ui,uiReady,maintenance,hardLab,scrubber,partsKey,tourSnapshot,page='home',navToken=0;
// three.js and the labs are separate chunks: the home page and navigation never wait for them.
const modules={viewer:()=>import('./viewer.js'),maintenance3d:()=>import('./maintenance3d.js'),maintenanceText:()=>import('./maintenance-text.js'),hardLab:()=>import('./hard-lab.js'),scrubber:()=>import('./scrubber.js'),lookUi:()=>import('./look/ui.js')},pending={};
const loadModule=name=>pending[name]??=modules[name]().catch(error=>{delete pending[name];throw error;});
// A failed import() stays failed for that URL until the page reloads (which also picks up a newer deploy).
const note=(text,failed=false)=>{const box=document.createElement('div'),message=document.createElement('p');box.className=failed?'lab-error':'lab-loading';box.setAttribute('role',failed?'alert':'status');message.textContent=text;box.append(message);if(failed){const button=document.createElement('button');button.textContent='Reload page';button.addEventListener('click',()=>location.reload());box.append(button);}return box;};
// Resolves the module, or null when the learner already moved on or the chunk could not be fetched.
function loadLab(name,container,label,token){
 if(!container.firstElementChild||container.querySelector(':scope>.lab-error'))container.replaceChildren(note(`Loading ${label}…`));
 return loadModule(name).then(module=>token===navToken?module:null).catch(error=>{console.warn(`${label} could not be loaded:`,error.message);if(token===navToken)container.replaceChildren(note(`The ${label} could not be loaded. Check your connection, then reload the page.`,true));return null;});
}
const intents=[['[data-vacuum],#home-machine,#home-lab,#home-cleaning,[data-soft-entry="junior-429"]','viewer'],['[data-page="scrubber"],[data-soft-entry="hyper-2000b"]','scrubber'],['[data-hard-module],[data-page="catalogue"],[data-page="hard-checklist"]','hardLab'],['[data-step="maintenance"],#home-maintenance,#home-practice','maintenance3d']];
// Start downloading a page's code as soon as the pointer, focus or finger heads for its link.
function warm(event){const target=event.target.closest?.('button,a');if(!target||navigator.connection?.saveData)return;for(const [selector,name] of intents)if(target.matches(selector)){loadModule(name).catch(()=>{});return;}}
document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);document.addEventListener('touchstart',warm,{passive:true});
const withViewer=run=>viewer?run(viewer):viewerReady?.then(ready=>ready&&run(ready));
function ensureViewer(){
 if(viewer)return Promise.resolve(viewer);
 if(viewerReady)return viewerReady;
 $('viewer-loading').hidden=false;$('viewer-fallback').hidden=true;
 return viewerReady=loadModule('viewer').then(({createViewer})=>{
  viewer=createViewer($('machine'),selectPart,value=>action('open',value),progress=>{$('pickup-progress').textContent=`${progress.picked} / ${progress.total} markers picked up`;$('pickup-progress').classList.toggle('complete',progress.picked===progress.total);if(progress.picked===progress.total)$('operation-message').textContent='All virtual debris markers collected. Reset dust to practise again.';},{onHover:guidance.hover,onFloor:()=>action('floor',state.floorMode==='hard'?'soft':'hard'),onCallouts:(items,width,height)=>ui?.drawCallouts(items,width,height)});
  $('viewer-loading').hidden=true;viewer.setActive(page==='module');render();if(ui)vacuumAdapter.hand.attach();return viewer;
 }).catch(error=>{viewerReady=undefined;$('viewer-loading').hidden=true;$('viewer-fallback').hidden=false;console.warn('3D view unavailable:',error.message);return null;});
}
// ---- Maintenance checklist: every task is a 3D simulation (a lazy chunk). Without WebGL2 the written steps are shown instead. ----
let webgl2;
function hasWebGL2(){if(webgl2===undefined){const gl=document.createElement('canvas').getContext('webgl2');webgl2=Boolean(gl);gl?.getExtension('WEBGL_lose_context')?.loseContext();}return webgl2;}
function viewNotice(text=''){$('view-notice').textContent=text;$('view-notice').hidden=!text;}
let stepsText=null;
function writtenSteps(container,token,text){
 viewNotice(text);if(stepsText){stepsText.setMachine(machine.id);return;}
 loadLab('maintenanceText',container,'maintenance steps',token).then(module=>{if(module&&!stepsText)stepsText=module.mountMaintenanceText(container,{machine:machine.id,getLanguage:()=>guidance.language});});
}
function enterMaintenance(token){
 const container=$('maintenance-practice');
 if(!hasWebGL2()){writtenSteps(container,token,'This browser cannot show 3D (WebGL2 is missing), so the written steps are shown instead.');return;}
 if(maintenance){viewNotice();maintenance.setMachine(machine.id);return;}
 loadLab('maintenance3d',container,'3D maintenance practice',token).then(module=>{
  if(!module||maintenance)return;
  try{
   container.replaceChildren();viewNotice();
   maintenance=module.mountMaintenance3D(container,{machine:machine.id,getLanguage:()=>guidance.language,onProgress:guidance.clearNotice,onUnavailable:()=>{maintenance?.destroy();maintenance=null;writtenSteps(container,navToken,'The 3D view lost its graphics context, so the written steps are shown instead. Reload the page to try 3D again.');}});
  }catch(error){console.warn('3D maintenance unavailable:',error.message);maintenance=null;writtenSteps(container,token,'3D could not start on this device, so the written steps are shown instead.');}
 });
}
function enterHardLab(id,view,token,list){
 if(hardLab){hardLab.show(id,view,list);return;}
 loadLab('hardLab',$('hard-lab'),'equipment lab',token).then(module=>{if(!module)return;if(!hardLab)hardLab=module.mountHardLab($('hard-lab'),{guidance,onMachine:goMachine,onNavigate:(next,mode='explore')=>showPage('hardlab',[next,mode])});hardLab.show(id,view,list);});
}
function enterScrubber(view,token){
 loadLab('scrubber',$('scrubber-lab'),'equipment lab',token).then(module=>{
  if(!module)return;if(!scrubber)scrubber=module.mountScrubber($('scrubber-lab'),{guidance,onMachine:goMachine,onNavigate:next=>showPage('scrubber',[next])});scrubber.show(view);if(view==='maintenance')$('scrubber-lab').querySelector('[data-maintenance]')?.scrollIntoView({block:'nearest'});
  guidance.setMachine(scrubberModule,{maintenance:view==='maintenance',autoGuide:view!=='maintenance',toolbarHost:$('scrubber-lab').querySelector('.equipment-heading'),targets:scrubber.targets,onGuideOpen:scrubber.pauseLesson,onTourStart:view==='maintenance'?undefined:scrubber.tourStart,onTourFrame:view==='maintenance'?undefined:scrubber.tourFrame,onTourEnd:view==='maintenance'?undefined:scrubber.tourEnd,onAutoRotate:scrubber.setAutoRotate,onPanels:scrubber.setFocused,dock:true,focused:true});
 });
}
function action(type,value){const result=transition(state,{type,value});state=result.state;state.autoRotate=guidance.autoRotate;if(type==='pickup')viewer?.resetDust();if(result.message)$('operation-message').textContent=result.message;render();}
function selectPart(id){
 if(!parts.some(p=>p.id===id))return;if(machine.id==='junior-429'&&(['filter','collector'].includes(id)&&state.pickupMode==='wet'||id==='float'&&state.pickupMode==='dry')){state=transition(state,{type:'pickup',value:id==='float'?'wet':'dry'}).state;viewer?.resetDust();}state.part=id;
 if(isHidden(machine.id,id)){
  if(state.running)state.xray=true;else if(state.open<revealOpening(layerOf(machine.id,id))){const result=transition(state,{type:'open',value:revealOpening(layerOf(machine.id,id))});state=result.state;$('operation-message').textContent=result.message;}
 }
 render();
}
function render(){
 state=runView(state,'air');
 if(partsKey!==machine.id+state.pickupMode){buildVacuumContent();guidance.updateMachine({...machine,parts});ui?.refreshParts();}
 state.glowParts=faultsFor(machine.id).find(f=>f.id===state.fault)?.parts||[];
 for(const [id,key] of [['stroke-toggle','stroke'],['power-toggle','running']])$(id).setAttribute('aria-pressed',String(state[key]));
 $('plug-toggle').lastElementChild.textContent=state.connected?'Disconnect plug':'Connect plug';$('power-toggle').lastElementChild.textContent=state.running?'Switch off':'Switch on';
 $('power-status').textContent=state.running?'Running':state.connected?'Connected · off':'Unplugged';$('power-status').classList.toggle('running',state.running);
 $('stroke-toggle').textContent=state.stroke?'Pause floor tool':'Move floor tool';$('pickup-instruction').textContent=state.condition==='clear'?'Connect the plug, switch on, then move the floor tool over the dust.':'Choose Clear air path for this pickup exercise. Fault-specific cleaning performance is not modelled.';
 const wet=state.pickupMode==='wet';$('pickup-modes').hidden=machine.id!=='junior-429';$('floor-modes').hidden=wet;
 $('configuration-note').textContent=wet?'Wet configuration: wide rubber squeegee, no dry bag/filter in this illustration. Exact fitted setup follows the unit manual.':`${state.floorMode==='hard'?'Hard floor: bristles extended.':'Soft floor: bristles retracted.'} Clean, dry media shown for dry pickup.`;
 for(const b of document.querySelectorAll('[data-floor]'))b.setAttribute('aria-pressed',String(b.dataset.floor===state.floorMode));for(const b of document.querySelectorAll('[data-pickup]'))b.setAttribute('aria-pressed',String(b.dataset.pickup===state.pickupMode));
 if(wet)$('pickup-instruction').textContent='Assemble, connect and switch on. Move the wet squeegee over the virtual liquid markers. No recovery rate is predicted.';
 ui?.update();viewer?.setState(state);
}
function vacuumTourStart(){tourSnapshot={...state};state={...state,part:'overview',open:0,connected:false,running:false,stroke:false,xray:false,air:false};viewer?.clearHover();viewer?.cameraAction('reset');render();}
function vacuumTourFrame(frame){
 $('startup-panel').open=['connect','run','isolate'].includes(frame.id);
 if(frame.id==='inside')action('open',100);
 if(frame.id==='point'){state.part='cover';render();}
 if(frame.id==='outside'){state.part='overview';action('open',0);}
 if(frame.id==='connect'&&!state.connected)action('plug');
 if(frame.id==='run'){if(!state.connected)action('plug');if(!state.running)action('power');render();}
 if(frame.id==='isolate'){if(state.running)action('power');if(state.connected)action('plug');render();}
}
function vacuumTourEnd(preserve){if(!preserve)guidance.setFocused(true);if(!preserve&&tourSnapshot){state={...tourSnapshot,connected:false,running:false,stroke:false};$('startup-panel').open=false;viewer?.cameraAction('reset');render();}tourSnapshot=null;}
// Tour targets on the 3D checklist, looked up when the tour reaches them (the 3D view mounts after the page opens).
const inPractice=selector=>$('maintenance-practice').querySelector(selector)||$('maintenance-practice');
const maintenanceTargets={get canvas(){return inPractice('.s3-stage');},get tasks(){return inPractice('.s3-tabs');},get lesson(){return inPractice('.s3-modes');},get practice(){return inPractice('.s3-stage');}};
function configureVacuum(maintenanceView=false){guidance.setMachine({...machine,parts},{maintenance:maintenanceView,autoGuide:!maintenanceView,ready:maintenanceView?undefined:ensureViewer(),toolbarHost:$('vacuum-guides-host'),dock:!maintenanceView,focused:true,targets:maintenanceView?maintenanceTargets:{canvas:$('machine'),get camera(){return ui?.cameraGroup||$('viewport');},get inside(){return ui?.insideButton||$('machine');},startup:$('startup-panel'),get maintenance(){return ui?.slot.querySelector('[data-step=maintenance]')||$('viewport');}},onGuideOpen:()=>{if(maintenanceView)maintenance?.pause();},onTourStart:maintenanceView?undefined:vacuumTourStart,onTourFrame:maintenanceView?undefined:vacuumTourFrame,onTourEnd:maintenanceView?undefined:vacuumTourEnd,onAutoRotate:value=>{state.autoRotate=value;render();},onPanels:value=>ui?.setFocus(value)});}
function loadVacuum(id){if(!Object.hasOwn(vacuumModules,id))id='junior-103';if(machine.id!==id){machine=vacuumModules[id];parts=machine.parts;state=initialState(id);for(const input of document.querySelectorAll('#operator-checks input'))input.checked=false;updateChecks();viewer?.clearHover();viewer?.resetDust();viewer?.cameraAction('reset');}buildVacuumContent();render();}

function buildVacuumContent(){
 parts=vacuumPartList(machine.id,state.pickupMode);partsKey=machine.id+state.pickupMode;
$('vacuum-title').textContent=machine.name+'.';$('vacuum-intro').textContent=machine.intro;$('vacuum-category').textContent=machine.id==='junior-429'?'Wet & dry vacuum cleaner':'Dry vacuum cleaner';$('vacuum-specs-tag').textContent=`CLEANTECH · ${machine.name.toUpperCase()}`;$('vacuum-scope').textContent='Learn safely. Switch off and unplug before opening. '+machine.scope;
 $('machine').setAttribute('aria-label',`Interactive ${machine.name} schematic. Hover to identify, drag to rotate, scroll or pinch to reveal. Arrow Up and Down reveal, Home assembles, End explodes. Use plus and minus buttons to zoom.`);
 $('specs').replaceChildren();for(const [name,value,source] of machine.specs){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),small=document.createElement('small');dt.textContent=name;dd.textContent=value;small.textContent=source;dd.append(small);row.append(dt,dd);$('specs').append(row);}
 const links=$('vacuum-sources').querySelectorAll('a');links[0].href=machine.product;links[1].href=machine.sheet;$('vacuum-sources').querySelector('p').textContent='Nameplate and supplier values are separate. Geometry, exact fitted filters and usable collection limits remain unverified. A wet/dry model must use the correct configuration.';
}
for(const b of document.querySelectorAll('[data-floor]'))b.addEventListener('click',()=>action('floor',b.dataset.floor));
for(const b of document.querySelectorAll('[data-pickup]'))b.addEventListener('click',()=>action('pickup',b.dataset.pickup));
for(const [id,key] of [['stroke-toggle','stroke']])$(id).addEventListener('click',()=>{state[key]=!state[key];if(((key==='air'&&state.air)||(key==='stroke'&&state.stroke))&&state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;}if(key==='stroke'&&state.stroke){withViewer(ready=>ready.cameraAction('floor'));$('operation-message').textContent=state.running?'Move the powered tool over the markers to collect them.':'The tool can move by hand. Connect the plug and switch on for dust pickup.';}render();});
$('plug-toggle').addEventListener('click',()=>action('plug'));$('power-toggle').addEventListener('click',()=>action('power'));
$('reset').addEventListener('click',()=>{viewer?.clearHover();action('reset');viewer?.resetDust();viewer?.cameraAction('reset');});
$('floor-view').addEventListener('click',()=>viewer?.cameraAction('floor'));
$('reset-dust').addEventListener('click',()=>viewer?.resetDust());
$('single-pass').addEventListener('click',()=>{if(state.open>0||!state.connected||!state.running){$('operation-message').textContent='Assemble the machine, connect the plug and switch on before a pickup pass.';return;}if(state.condition!=='clear'){$('operation-message').textContent='Choose Clear air path for the pickup practice. Fault-specific pickup rates are not modelled.';return;}state.stroke=false;render();withViewer(ready=>{ready.cameraAction('floor');ready.makeCleaningPass();});$('operation-message').textContent='The tool is making a full practice pass. Markers are counted, not cleaning efficiency.';});
// ---- shared look-and-controls: the adapter lets the lazy UI module drive this page without knowing about it ----
const ELECTRICAL=['cable','plug','switch','motor','fan'];
// Flicking a palm (hand control) steps through all nine equipment pages in this order.
const MACHINE_ORDER=[['module','junior-103'],['module','junior-429'],['scrubber'],['hardlab','motor-1ph'],['hardlab','motor-3ph'],['hardlab','alternator'],['hardlab','megger'],['hardlab','multimeter'],['hardlab','cascade']];
function goMachine(direction){
 const route=readRoute(),here=Math.max(0,MACHINE_ORDER.findIndex(([kind,id])=>kind===route.page&&(kind==='scrubber'||id===route.path[0]))),next=MACHINE_ORDER[(here+direction+MACHINE_ORDER.length)%MACHINE_ORDER.length];
 showPage(next[0],next[1]?[next[1]]:[]);
}
function setFault(id){
 state.fault=id;state.condition=id||'clear';if(id)state.air=true;
 if(id&&state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;state.fault=id;state.condition=id;$('operation-message').textContent='Machine assembled for the airflow lesson. Connect the plug, then switch on.';}
 render();
}
function setFlag(name,on){
 if(name==='orbit'){guidance.setAutoRotate(on);return;}
 if(name==='flow'){state.air=on;if(on&&state.open>0)state=transition(state,{type:'open',value:0}).state;}
 else if(['xray','callouts','guides','glow'].includes(name))state[name]=on;
 render();
}
const vacuumAdapter={
 get machine(){return machine;},
 get parts(){return parts.slice(1);},
 safety:'Switch off and unplug before opening the machine or removing this part.',
 source:'Conceptual teaching model (Fidelity A), not a service drawing. Exact fitted parts are unverified.',
 get(){return {part:state.part,open:state.open,running:Boolean(state.running),fault:state.fault||'',flags:{xray:state.xray,callouts:state.callouts,flow:state.air,guides:Boolean(state.guides),glow:state.glow!==false,orbit:Boolean(state.autoRotate)}};},
 info:id=>ELECTRICAL.includes(id)?{safety:'Isolate first: switch off and unplug before touching or inspecting this part.'}:{},
 select:id=>selectPart(id||'overview'),
 setOpen:value=>action('open',value),
 setFlag,setFault,
 camera:(name,animate)=>viewer?.cameraAction(name,animate),
 flyTo:id=>viewer?.flyTo(id),
 onFocus:value=>{guidance.setFocused(value);viewer?.hands.invalidate();},
 hand:handHandle(()=>({host:$('viewport'),ui,adapter:vacuumAdapter,viewer:()=>viewer,nextMachine:goMachine}))
};
function ensureUi(){
 if(ui)return Promise.resolve(ui);
 return uiReady??=loadModule('lookUi').then(({mountLookUI})=>{
  ui=mountLookUI($('viewport'),vacuumAdapter,{focus:true,ids:{'rotate-left':'rotate-left','rotate-right':'rotate-right','zoom-out':'zoom-out','zoom-in':'zoom-in','camera-reset':'camera-reset'}});
  const checklist=document.createElement('button');checklist.type='button';checklist.className='lk-step';checklist.dataset.step='maintenance';checklist.innerHTML='<span class="lk-step-name">Maintenance checklist</span><small>Practise this machine’s tasks in 3D</small>';
  checklist.addEventListener('click',()=>showPage('soft-checklist',[machine.id]));
  ui.slot.append($('startup-panel'),checklist);render();if(viewer)vacuumAdapter.hand.attach();return ui;
 }).catch(error=>{uiReady=undefined;console.warn('Controls unavailable:',error.message);return null;});
}
const narrowNav=window.matchMedia('(max-width:1050px)');
function syncMenu(){const open=document.body.classList.contains('nav-open');document.querySelector('.sidebar').inert=narrowNav.matches&&!open;document.querySelector('.app').inert=narrowNav.matches&&open;$('nav-backdrop').hidden=!narrowNav.matches||!open;$('menu').setAttribute('aria-expanded',String(open));}
function closeMenu(){document.body.classList.remove('nav-open');syncMenu();}
narrowNav.addEventListener('change',()=>{if(!narrowNav.matches)document.body.classList.remove('nav-open');syncMenu();});syncMenu();
$('menu').addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');syncMenu();if(open)document.querySelector('.brand').focus();});$('nav-backdrop').addEventListener('click',closeMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('nav-open')){closeMenu();$('menu').focus();}});
for(const summary of document.querySelectorAll('.department>summary'))summary.addEventListener('click',e=>{if(document.body.classList.contains('nav-collapsed')&&!narrowNav.matches){e.preventDefault();document.body.classList.remove('nav-collapsed');summary.parentElement.open=true;$('collapse').setAttribute('aria-expanded','true');$('collapse').setAttribute('aria-label','Collapse navigation');}});
$('collapse').addEventListener('click',()=>{const collapsed=document.body.classList.toggle('nav-collapsed');$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');});
function makeNameTree(items,container,path=[]){for(const item of items){const current=[...path,item.name];if(item.children){const d=document.createElement('details');d.open=true;const s=document.createElement('summary');s.textContent=item.name;d.append(s);makeNameTree(item.children,d,current);container.append(d);}else{const b=document.createElement('button');b.className='nav-leaf';b.textContent=item.name;const module=hardList.find(m=>m.path.join('/')===current.join('/'));if(module){b.dataset.hardModule=module.id;const brand=document.createElement('small');brand.className='nav-equipment-brand';brand.textContent=module.brand;b.append(brand);}b.addEventListener('click',()=>showPage(module?'hardlab':'catalogue',module?[module.id]:current));container.append(b);}}}
makeNameTree(hardServices,$('hard-tree'));
function hardNames(container,inspection=false){container.replaceChildren();const grid=document.createElement('div');grid.className='hl-catalogue';for(const m of hardList){const card=document.createElement('article'),tag=document.createElement('span'),title=document.createElement('h2'),brand=document.createElement('strong'),body=document.createElement('p'),count=document.createElement('small'),button=document.createElement('button');tag.className='hl-catalogue-symbol';tag.textContent=m.symbol;title.textContent=m.name;brand.textContent=`${m.brand} · ${m.reference}`;body.textContent=inspection?'Three checklists. Watch each guided observation lesson, then identify the areas in order with the supply isolated and respond to the visible concern.':m.intro;count.textContent=inspection?`${m.checklists.length} maintenance checklists · ${m.parts.length} major assemblies`:`${m.parts.length} major assemblies · ${m.checklists.length} maintenance checklists`;card.append(tag,title,brand,body,count);
  if(inspection){const list=document.createElement('div');list.className='hl-checklist-links';m.checklists.forEach((c,n)=>{const link=document.createElement('button');link.textContent=`${n+1} · ${c.title} →`;link.addEventListener('click',()=>showPage('hardlab',[m.id,'maintenance',String(n)]));list.append(link);});card.append(list);}
  else{button.textContent='Open equipment lab →';button.addEventListener('click',()=>showPage('hardlab',[m.id,'explore']));card.append(button);}
  grid.append(card);}container.append(grid);}
const pageHashes={home:'home','soft-checklist':'maintenance',catalogue:'hard-services','hard-checklist':'hard-maintenance'};
function readRoute(){const [prefix,id,view,list]=location.hash.slice(1).split('/');if(Object.hasOwn(vacuumModules,prefix))return {page:id==='maintenance'?'soft-checklist':'module',path:[prefix]};if(prefix==='maintenance'&&id==='hyper-2000b')return {page:'scrubber',path:['maintenance']};if(prefix==='equipment'&&Object.hasOwn(hardModules,id))return {page:'hardlab',path:[id,view,list?String(Number(list)-1):undefined]};if(prefix==='hyper-2000b')return {page:'scrubber',path:[id||'explore']};return {page:Object.keys(pageHashes).find(p=>pageHashes[p]===prefix)||'home',path:id?[id]:[]};}
function setCollapsed(collapsed){document.body.classList.toggle('nav-collapsed',collapsed);$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');}
function showPage(next,path=[],historyMode='push'){
 page=next;const token=++navToken;
 if(next!=='hardlab')hardLab?.release();if(next!=='scrubber')scrubber?.release();if(next!=='soft-checklist')maintenance?.pause();
 viewer?.clearHover();if(next!=='module'){state.connected=false;state.running=false;state.stroke=false;}viewer?.setActive(next==='module');
 if(next!=='module'&&viewer){viewer.destroy();viewer=null;viewerReady=undefined;}
 if(next==='module'){ensureViewer();ensureUi();}
 guidance.setMachine(null);
 for(const [id,page] of [['home','home'],['hard-lab','hardlab'],['scrubber-lab','scrubber']])$(id).hidden=next!==page;
 // the maintenance checklist is part of the machine page: it takes the place of the machine view
 const checklistView=next==='soft-checklist';$('module').hidden=!['module','soft-checklist'].includes(next);
 for(const el of [$('viewport'),document.querySelector('#module .stage-below'),document.querySelector('#module .module-footer')])el.hidden=checklistView;$('module-maintenance').hidden=!checklistView;
 $('catalogue').hidden=!['catalogue','hard-checklist'].includes(next);setCollapsed(next!=='home');let title='EFS Learning Academy',hash=pageHashes[next]||'home',hardId=null;
 if(next==='module'||next==='soft-checklist'){
  loadVacuum(path[0]||machine.id);configureVacuum(next==='soft-checklist');
  if(next==='module'){state={...state,part:'overview',open:0,connected:false,running:false,stroke:false};$('startup-panel').open=false;for(const drawer of document.querySelectorAll('#module .module-options,#module .cleaning-practice'))drawer.open=false;render();$('breadcrumb').textContent=`Soft Services / Equipment / Vacuum Cleaner / ${machine.category} / CleanTech / ${machine.name}`;hash=machine.id;}
  else{
   $('breadcrumb').textContent=`Soft Services / Equipment / Vacuum Cleaner / ${machine.category} / CleanTech / ${machine.name} / Maintenance checklist`;hash=`${machine.id}/maintenance`;$('maintenance-title').textContent=machine.name;$('checklist-machine-name').textContent=machine.name;
   enterMaintenance(token);
  }
  title=next==='module'?machine.name:machine.name+' maintenance';
 }else if(next==='hardlab'){
  hardId=Object.hasOwn(hardModules,path[0])?path[0]:hardList[0].id;const view=['maintenance','experiment'].includes(path[1])?path[1]:'explore',list=view==='maintenance'&&path[2]!==undefined&&Number.isInteger(Number(path[2]))&&Number(path[2])>=0?Number(path[2]):undefined;
  $('breadcrumb').textContent=`Hard Services / Equipment / ${hardModules[hardId].path.join(' / ')} / ${hardModules[hardId].brand}`;
  enterHardLab(hardId,view,token,list);title=hardModules[hardId].name;hash=`equipment/${hardId}${view==='explore'?'':`/${view}`}${list===undefined?'':`/${list+1}`}`;
 }else if(next==='scrubber'){
  const view=path[0]==='maintenance'?'maintenance':'explore';enterScrubber(view,token);$('breadcrumb').textContent='Soft Services / Equipment / Scrubber Dryers / Lavor / HYPER 2000B';title='HYPER 2000B';hash=`hyper-2000b${view==='maintenance'?'/maintenance':''}`;
 }else if(next==='home')$('breadcrumb').textContent='Welcome to EFS Learning Academy';
 else{$('breadcrumb').textContent=`Hard Services / ${next==='hard-checklist'?'Maintenance Checklist':'Equipment'}`;$('catalogue-title').textContent=next==='hard-checklist'?'Maintenance learning':'Hard Services equipment';hardNames($('catalogue-names'),next==='hard-checklist');title='Hard Services';}
 for(const b of document.querySelectorAll('[data-vacuum]')){const selected=['module','soft-checklist'].includes(next)&&b.dataset.vacuum===machine.id;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 for(const b of document.querySelectorAll('[data-hard-module]')){const selected=next==='hardlab'&&b.dataset.hardModule===hardId;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 if(['hardlab','catalogue','hard-checklist'].includes(next))$('hard-nav').open=true;
 for(const b of document.querySelectorAll('[data-page]')){const selected=b.dataset.page===next;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 document.body.dataset.view=['module','hardlab','scrubber'].includes(next)?'equipment':next;
 if(document.body.dataset.view!=='equipment')stopHands();
 document.title=title==='EFS Learning Academy'?title:`${title} · EFS Learning Academy`;
 if(historyMode!=='none')history[historyMode==='replace'?'replaceState':'pushState']({page:next,path},'',`#${hash}`);
 closeMenu();window.scrollTo({top:0,behavior:'instant'});render();
}
for(const b of document.querySelectorAll('[data-vacuum]'))b.addEventListener('click',()=>showPage('module',[b.dataset.vacuum]));document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();showPage('home');});
for(const b of document.querySelectorAll('[data-page]'))b.addEventListener('click',()=>showPage(b.dataset.page));
for(const id of ['home-maintenance','home-practice'])$(id).addEventListener('click',()=>showPage('soft-checklist'));
$('machine-view').addEventListener('click',()=>showPage('module',[machine.id]));
for(const id of ['home-machine','home-lab'])$(id).addEventListener('click',()=>showPage('module',['junior-103']));
for(const b of document.querySelectorAll('[data-soft-entry]'))b.addEventListener('click',()=>b.dataset.softEntry==='hyper-2000b'?showPage('scrubber'):showPage('module',[b.dataset.softEntry]));
$('home-cleaning').addEventListener('click',()=>{showPage('module',['junior-103']);document.querySelector('#module .cleaning-practice').open=true;$('startup-panel').open=true;withViewer(ready=>ready.cameraAction('floor'));$('operation-message').textContent='Connect the plug, switch on and choose Move floor tool to pick up the virtual dust on tiles.';});
window.addEventListener('popstate',()=>{const route=readRoute();showPage(route.page,route.path,'none');});
for(const check of operatorChecks){const label=document.createElement('label');label.className='check-row';const input=document.createElement('input');input.type='checkbox';input.id=`check-${check.id}`;const text=document.createElement('span');const title=document.createElement('strong');title.textContent=check.name;const desc=document.createElement('small');desc.textContent=check.text;text.append(title,desc);label.append(input,text);$('operator-checks').append(label);input.addEventListener('change',()=>updateChecks(input));}
function updateChecks(changed){const inputs=[...document.querySelectorAll('#operator-checks input')],index=inputs.indexOf(changed);if(index>=0){if(changed.checked){const previous=inputs.slice(0,index).findIndex(input=>!input.checked);if(previous>=0){changed.checked=false;guidance.notify('See the checklist: '+operatorChecks[previous].name+' comes first.');}else guidance.clearNotice();}else{for(const input of inputs.slice(index+1))input.checked=false;guidance.clearNotice();}}$('check-progress').textContent=`${document.querySelectorAll('#operator-checks input:checked').length} / ${operatorChecks.length} checked`;}
$('clear-checks').addEventListener('click',()=>{for(const input of document.querySelectorAll('#operator-checks input'))input.checked=false;updateChecks();});
buildVacuumContent();
document.addEventListener('efs-guide-language',()=>render());
render();
const route=readRoute();showPage(route.page,route.path,'replace');
