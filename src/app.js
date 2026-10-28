import {airflowLesson,hardServices,operatorChecks} from './content.js';
import {initialState,transition} from './machine-state.js';
import {hardList,hardModules} from './hard-content.js';
import {vacuumModules,vacuumPartList,scrubberModule} from './soft-content.js';
import {mountGuidance} from './guidance.js';
const $=id=>document.getElementById(id),guidance=mountGuidance($('machine-guidance'));let machine=vacuumModules['junior-103'],parts=machine.parts,state=initialState(machine.id);let viewer,viewerReady,maintenance,maintenanceId,hardLab,scrubber,partsKey,tourSnapshot,page='home',navToken=0;
// three.js and the labs are separate chunks: the home page and navigation never wait for them.
const modules={viewer:()=>import('./viewer.js'),maintenance:()=>import('./maintenance.js'),hardLab:()=>import('./hard-lab.js'),scrubber:()=>import('./scrubber.js')},pending={};
const loadModule=name=>pending[name]??=modules[name]().catch(error=>{delete pending[name];throw error;});
// A failed import() stays failed for that URL until the page reloads (which also picks up a newer deploy).
const note=(text,failed=false)=>{const box=document.createElement('div'),message=document.createElement('p');box.className=failed?'lab-error':'lab-loading';box.setAttribute('role',failed?'alert':'status');message.textContent=text;box.append(message);if(failed){const button=document.createElement('button');button.textContent='Reload page';button.addEventListener('click',()=>location.reload());box.append(button);}return box;};
// Resolves the module, or null when the learner already moved on or the chunk could not be fetched.
function loadLab(name,container,label,token){
 if(!container.firstElementChild||container.querySelector(':scope>.lab-error'))container.replaceChildren(note(`Loading ${label}…`));
 return loadModule(name).then(module=>token===navToken?module:null).catch(error=>{console.warn(`${label} could not be loaded:`,error.message);if(token===navToken)container.replaceChildren(note(`The ${label} could not be loaded. Check your connection, then reload the page.`,true));return null;});
}
const intents=[['[data-vacuum],#home-machine,#home-lab,#home-cleaning,[data-soft-entry="junior-429"]','viewer'],['[data-page="scrubber"],[data-soft-entry="hyper-2000b"]','scrubber'],['[data-hard-module],[data-page="catalogue"],[data-page="hard-checklist"]','hardLab'],['[data-page="soft-checklist"],#home-maintenance,#home-practice,#open-checklist','maintenance']];
// Start downloading a page's code as soon as the pointer, focus or finger heads for its link.
function warm(event){const target=event.target.closest?.('button,a');if(!target||navigator.connection?.saveData)return;for(const [selector,name] of intents)if(target.matches(selector)){loadModule(name).catch(()=>{});return;}}
document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);document.addEventListener('touchstart',warm,{passive:true});
const withViewer=run=>viewer?run(viewer):viewerReady?.then(ready=>ready&&run(ready));
function ensureViewer(){
 if(viewer)return Promise.resolve(viewer);
 if(viewerReady)return viewerReady;
 $('viewer-loading').hidden=false;$('viewer-fallback').hidden=true;
 return viewerReady=loadModule('viewer').then(({createViewer})=>{
  viewer=createViewer($('machine'),selectPart,value=>action('open',value),progress=>{$('pickup-progress').textContent=`${progress.picked} / ${progress.total} markers picked up`;$('pickup-progress').classList.toggle('complete',progress.picked===progress.total);if(progress.picked===progress.total)$('operation-message').textContent='All virtual debris markers collected. Reset dust to practise again.';},{onHover:guidance.hover,onFloor:()=>action('floor',state.floorMode==='hard'?'soft':'hard')});
  $('viewer-loading').hidden=true;viewer.setActive(page==='module');render();return viewer;
 }).catch(error=>{viewerReady=undefined;$('viewer-loading').hidden=true;$('viewer-fallback').hidden=false;console.warn('3D view unavailable:',error.message);return null;});
}
function enterMaintenance(token){
 const container=$('maintenance-practice');
 if(maintenance&&maintenanceId===machine.id){maintenance.enter();return;}
 loadLab('maintenance',container,'maintenance practice',token).then(module=>{
  if(!module)return;if(maintenanceId!==machine.id){maintenance?.destroy();maintenance=module.mountMaintenance(container,{machine:machine.id,onNotify:guidance.notify,onProgress:guidance.clearNotice,getLanguage:()=>guidance.language});maintenanceId=machine.id;}maintenance.enter();
 });
}
function enterHardLab(id,view,token){
 if(hardLab){hardLab.show(id,view);return;}
 loadLab('hardLab',$('hard-lab'),'equipment lab',token).then(module=>{if(!module)return;if(!hardLab)hardLab=module.mountHardLab($('hard-lab'),{guidance,onNavigate:(next,mode='explore')=>showPage('hardlab',[next,mode])});hardLab.show(id,view);});
}
function enterScrubber(view,token){
 loadLab('scrubber',$('scrubber-lab'),'equipment lab',token).then(module=>{
  if(!module)return;if(!scrubber)scrubber=module.mountScrubber($('scrubber-lab'),{guidance,onNavigate:next=>showPage('scrubber',[next])});scrubber.show(view);
  guidance.setMachine(scrubberModule,{maintenance:view==='maintenance',autoGuide:view!=='maintenance',toolbarHost:$('scrubber-lab').querySelector('.equipment-heading'),targets:scrubber.targets,onGuideOpen:scrubber.pauseLesson,onTourStart:view==='maintenance'?undefined:scrubber.tourStart,onTourFrame:view==='maintenance'?undefined:scrubber.tourFrame,onTourEnd:view==='maintenance'?undefined:scrubber.tourEnd,onAutoRotate:scrubber.setAutoRotate,onPanels:scrubber.setFocused});
 });
}
function action(type,value){const result=transition(state,{type,value});state=result.state;state.autoRotate=guidance.autoRotate;if(type==='pickup')viewer?.resetDust();if(result.message)$('operation-message').textContent=result.message;render();}
function showInfo(which){$('learn-panel').hidden=which!=='learn';$('specs-panel').hidden=which!=='specs';for(const b of document.querySelectorAll('[data-info]'))b.setAttribute('aria-pressed',String(b.dataset.info===which));}
function selectPart(id){
 if(!parts.some(p=>p.id===id))return;if(machine.id==='junior-429'&&(['filter','collector'].includes(id)&&state.pickupMode==='wet'||id==='float'&&state.pickupMode==='dry')){state=transition(state,{type:'pickup',value:id==='float'?'wet':'dry'}).state;viewer?.resetDust();}state.part=id;showInfo('learn');
 if(['motor','fan','filter','collector','float'].includes(id)){
  if(state.running)state.xray=true;else if(state.open<65){const result=transition(state,{type:'open',value:70});state=result.state;$('operation-message').textContent=result.message;}
 }
 render();
}
function render(){
 if(partsKey!==machine.id+state.pickupMode){buildVacuumContent();guidance.updateMachine({...machine,parts});}
 const part=parts.find(p=>p.id===state.part)||parts[0];for(const [id,value] of [['part-tag',part.group.toUpperCase()],['part-title',part.title],['part-body',part.body],['part-why',part.why],['part-motion',part.motion],['part-evidence',part.evidence]])$(id).textContent=value;
 for(const b of document.querySelectorAll('[data-part]'))b.setAttribute('aria-pressed',String(b.dataset.part===state.part));
 $('scene-part-card').hidden=state.part==='overview';$('scene-part-name').textContent=part.name;$('scene-part-copy').textContent=guidance.language==='hinglish'?'Is part ka role dekhne ke liye Parts icon use karo.':part.body;
 $('whole-machine').setAttribute('aria-pressed',String(state.part==='overview'));
 $('explode').value=state.open;$('explode-value').textContent=`${Math.round(state.open)}%`;$('view-label').textContent=state.open===0?'Assembled':state.open<40?'Head open':state.open<85?'Inside':'Exploded';
 for(const [id,key] of [['xray-toggle','xray'],['air-toggle','air'],['callout-toggle','callouts'],['stroke-toggle','stroke'],['power-toggle','running']])$(id).setAttribute('aria-pressed',String(state[key]));
 $('plug-toggle').lastElementChild.textContent=state.connected?'Disconnect plug':'Connect plug';$('power-toggle').lastElementChild.textContent=state.running?'Switch off':'Switch on';
 $('power-status').textContent=state.running?'Running':state.connected?'Connected · off':'Unplugged';$('power-status').classList.toggle('running',state.running);
 $('stroke-toggle').textContent=state.stroke?'Pause floor tool':'Move floor tool';$('pickup-instruction').textContent=state.condition==='clear'?'Connect the plug, switch on, then move the floor tool over the dust.':'Choose Clear air path for this pickup exercise. Fault-specific cleaning performance is not modelled.';
 for(const b of document.querySelectorAll('[data-open]'))b.classList.toggle('active',Number(b.dataset.open)===state.open);
 $('condition').value=state.condition;const lesson=airflowLesson(state.condition);$('scenario-title').textContent=lesson.title;$('scenario-text').textContent=lesson.text;
 const wet=state.pickupMode==='wet';$('pickup-modes').hidden=machine.id!=='junior-429';$('floor-modes').hidden=wet;
 $('configuration-note').textContent=wet?'Wet configuration: wide rubber squeegee, no dry bag/filter in this illustration. Exact fitted setup follows the unit manual.':`${state.floorMode==='hard'?'Hard floor: bristles extended.':'Soft floor: bristles retracted.'} Clean, dry media shown for dry pickup.`;
 for(const b of document.querySelectorAll('[data-floor]'))b.setAttribute('aria-pressed',String(b.dataset.floor===state.floorMode));for(const b of document.querySelectorAll('[data-pickup]'))b.setAttribute('aria-pressed',String(b.dataset.pickup===state.pickupMode));
 if(wet)$('pickup-instruction').textContent='Assemble, connect and switch on. Move the wet squeegee over the virtual liquid markers. No recovery rate is predicted.';
 viewer?.setState(state);
}
function vacuumTourStart(){tourSnapshot={...state};state={...state,part:'overview',open:0,connected:false,running:false,stroke:false,xray:false,air:false};viewer?.clearHover();viewer?.cameraAction('reset');render();}
function vacuumTourFrame(frame,kind){
 const panel=$('startup-panel');panel.open=kind==='machine'&&['connect','run','isolate'].includes(frame.id);
 if(kind==='page'){
  if(frame.id==='rotate')viewer?.cameraAction('rotate-left',true);
  if(frame.id==='open')action('open',70);if(frame.id==='close')action('open',0);
  if(frame.id==='zoom-in'||frame.id==='zoom-out')viewer?.cameraAction(frame.id,true);
  if(frame.id==='hover'){state.part='cover';render();}
 }else{
  if(frame.id==='connect'&&!state.connected)action('plug');
  if(frame.id==='run'){if(!state.connected)action('plug');if(!state.running)action('power');state.xray=true;render();}
  if(frame.id==='identify'){state.part='cover';render();}
  if(frame.id==='mechanism'){state.air=true;state.xray=true;render();}
  if(frame.id==='isolate'){if(state.running)action('power');if(state.connected)action('plug');state.air=false;state.xray=false;render();}
 }
}
function vacuumTourEnd(preserve){if(!preserve&&tourSnapshot){state={...tourSnapshot,connected:false,running:false,stroke:false};$('startup-panel').open=false;viewer?.cameraAction('reset');render();}tourSnapshot=null;}
function configureVacuum(maintenanceView=false){guidance.setMachine({...machine,parts},{maintenance:maintenanceView,autoGuide:!maintenanceView,ready:maintenanceView?undefined:ensureViewer(),toolbarHost:maintenanceView?$('machine-guidance'):$('vacuum-guides-host'),targets:maintenanceView?{canvas:$('maintenance-practice'),tasks:$('maintenance-machine'),lesson:$('maintenance-practice'),practice:$('maintenance-practice')}:{canvas:$('machine'),camera:document.querySelector('#viewport .camera-buttons'),startup:$('startup-panel'),maintenance:$('open-checklist')},onGuideOpen:()=>{if(maintenanceView)maintenance?.pause();},onTourStart:maintenanceView?undefined:vacuumTourStart,onTourFrame:maintenanceView?undefined:vacuumTourFrame,onTourEnd:maintenanceView?undefined:vacuumTourEnd,onAutoRotate:value=>{state.autoRotate=value;viewer?.setState(state);},onPanels:value=>$('module').classList.toggle('machine-focused',value)});}
function loadVacuum(id){if(!Object.hasOwn(vacuumModules,id))id='junior-103';if(machine.id!==id){machine=vacuumModules[id];parts=machine.parts;state=initialState(id);for(const input of document.querySelectorAll('#operator-checks input'))input.checked=false;updateChecks();viewer?.clearHover();viewer?.resetDust();viewer?.cameraAction('reset');}buildVacuumContent();render();}

function buildVacuumContent(){
 parts=vacuumPartList(machine.id,state.pickupMode);partsKey=machine.id+state.pickupMode;
 $('parts').replaceChildren();let groupName,groupContainer;
 for(const [i,p] of parts.slice(1).entries()){
  if(p.group!==groupName){groupName=p.group;const h=document.createElement('h3');h.textContent=groupName;$('parts').append(h);groupContainer=document.createElement('div');groupContainer.className='part-group';$('parts').append(groupContainer);}
  const b=document.createElement('button');b.dataset.part=p.id;b.setAttribute('aria-pressed','false');const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');b.append(num,document.createTextNode(p.name));b.addEventListener('click',()=>selectPart(p.id));groupContainer.append(b);
 }
 $('part-count').textContent=String(parts.length-1).padStart(2,'0');$('vacuum-title').textContent=machine.name+'.';$('vacuum-intro').textContent=machine.intro;$('vacuum-category').textContent=machine.id==='junior-429'?'Wet & dry vacuum cleaner':'Dry vacuum cleaner';$('vacuum-specs-tag').textContent=`CLEANTECH · ${machine.name.toUpperCase()}`;$('vacuum-scope').textContent='Learn safely. Switch off and unplug before opening. '+machine.scope;
 $('machine').setAttribute('aria-label',`Interactive ${machine.name} schematic. Hover to identify, drag to rotate, scroll or pinch to reveal. Arrow Up and Down reveal, Home assembles, End explodes. Use plus and minus buttons to zoom.`);
 $('specs').replaceChildren();for(const [name,value,source] of machine.specs){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),small=document.createElement('small');dt.textContent=name;dd.textContent=value;small.textContent=source;dd.append(small);row.append(dt,dd);$('specs').append(row);}
 const links=$('vacuum-sources').querySelectorAll('a');links[0].href=machine.product;links[1].href=machine.sheet;$('vacuum-sources').querySelector('p').textContent='Nameplate and supplier values are separate. Geometry, exact fitted filters and usable collection limits remain unverified. A wet/dry model must use the correct configuration.';
}
$('whole-machine').addEventListener('click',()=>selectPart('overview'));
for(const b of document.querySelectorAll('[data-floor]'))b.addEventListener('click',()=>action('floor',b.dataset.floor));
for(const b of document.querySelectorAll('[data-pickup]'))b.addEventListener('click',()=>action('pickup',b.dataset.pickup));
for(const b of document.querySelectorAll('[data-info]'))b.addEventListener('click',()=>showInfo(b.dataset.info));
$('explode').addEventListener('input',e=>action('open',Number(e.target.value)));
for(const b of document.querySelectorAll('[data-open]'))b.addEventListener('click',()=>action('open',Number(b.dataset.open)));
for(const [id,key] of [['xray-toggle','xray'],['air-toggle','air'],['callout-toggle','callouts'],['stroke-toggle','stroke']])$(id).addEventListener('click',()=>{state[key]=!state[key];if(((key==='air'&&state.air)||(key==='stroke'&&state.stroke))&&state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;}if(key==='stroke'&&state.stroke){withViewer(ready=>ready.cameraAction('floor'));$('operation-message').textContent=state.running?'Move the powered tool over the markers to collect them.':'The tool can move by hand. Connect the plug and switch on for dust pickup.';}render();});
$('plug-toggle').addEventListener('click',()=>action('plug'));$('power-toggle').addEventListener('click',()=>action('power'));
$('reset').addEventListener('click',()=>{viewer?.clearHover();action('reset');viewer?.resetDust();viewer?.cameraAction('reset');showInfo('learn');});
$('condition').addEventListener('change',e=>{state.condition=e.target.value;state.air=true;if(state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;$('operation-message').textContent='Machine assembled for the airflow lesson. Connect the plug, then switch on.';}render();});
for(const id of ['rotate-left','rotate-right','zoom-out','zoom-in'])$(id).addEventListener('click',()=>viewer?.cameraAction(id));$('camera-reset').addEventListener('click',()=>viewer?.cameraAction('reset'));
$('floor-view').addEventListener('click',()=>viewer?.cameraAction('floor'));
$('reset-dust').addEventListener('click',()=>viewer?.resetDust());
$('single-pass').addEventListener('click',()=>{if(state.open>0||!state.connected||!state.running){$('operation-message').textContent='Assemble the machine, connect the plug and switch on before a pickup pass.';return;}if(state.condition!=='clear'){$('operation-message').textContent='Choose Clear air path for the pickup practice. Fault-specific pickup rates are not modelled.';return;}state.stroke=false;render();withViewer(ready=>{ready.cameraAction('floor');ready.makeCleaningPass();});$('operation-message').textContent='The tool is making a full practice pass. Markers are counted, not cleaning efficiency.';});
const narrowNav=window.matchMedia('(max-width:1050px)');
function syncMenu(){const open=document.body.classList.contains('nav-open');document.querySelector('.sidebar').inert=narrowNav.matches&&!open;document.querySelector('.app').inert=narrowNav.matches&&open;$('nav-backdrop').hidden=!narrowNav.matches||!open;$('menu').setAttribute('aria-expanded',String(open));}
function closeMenu(){document.body.classList.remove('nav-open');syncMenu();}
narrowNav.addEventListener('change',()=>{if(!narrowNav.matches)document.body.classList.remove('nav-open');syncMenu();});syncMenu();
$('menu').addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');syncMenu();if(open)document.querySelector('.brand').focus();});$('nav-backdrop').addEventListener('click',closeMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('nav-open')){closeMenu();$('menu').focus();}});
for(const summary of document.querySelectorAll('.department>summary'))summary.addEventListener('click',e=>{if(document.body.classList.contains('nav-collapsed')&&!narrowNav.matches){e.preventDefault();document.body.classList.remove('nav-collapsed');summary.parentElement.open=true;$('collapse').setAttribute('aria-expanded','true');$('collapse').setAttribute('aria-label','Collapse navigation');}});
$('collapse').addEventListener('click',()=>{const collapsed=document.body.classList.toggle('nav-collapsed');$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');});
function makeNameTree(items,container,path=[]){for(const item of items){const current=[...path,item.name];if(item.children){const d=document.createElement('details');d.open=true;const s=document.createElement('summary');s.textContent=item.name;d.append(s);makeNameTree(item.children,d,current);container.append(d);}else{const b=document.createElement('button');b.className='nav-leaf';b.textContent=item.name;const module=hardList.find(m=>m.path.join('/')===current.join('/'));if(module){b.dataset.hardModule=module.id;const brand=document.createElement('small');brand.className='nav-equipment-brand';brand.textContent=module.brand;b.append(brand);}b.addEventListener('click',()=>showPage(module?'hardlab':'catalogue',module?[module.id]:current));container.append(b);}}}
makeNameTree(hardServices,$('hard-tree'));
function hardNames(container,inspection=false){container.replaceChildren();const grid=document.createElement('div');grid.className='hl-catalogue';for(const m of hardList){const card=document.createElement('article'),tag=document.createElement('span'),title=document.createElement('h2'),brand=document.createElement('strong'),body=document.createElement('p'),count=document.createElement('small'),button=document.createElement('button');tag.className='hl-catalogue-symbol';tag.textContent=m.symbol;title.textContent=m.name;brand.textContent=`${m.brand} · ${m.reference}`;body.textContent=inspection?'Watch the guided observation lesson, then identify the inspection areas and respond to a visible concern.':m.intro;count.textContent=`${m.parts.length} major assemblies · ${m.checks.length} guided inspection areas`;button.textContent=inspection?'Open lesson & practice →':'Open equipment lab →';button.addEventListener('click',()=>showPage('hardlab',[m.id,inspection?'maintenance':'explore']));card.append(tag,title,brand,body,count,button);grid.append(card);}container.append(grid);}
const pageHashes={home:'home','soft-checklist':'maintenance',catalogue:'hard-services','hard-checklist':'hard-maintenance'};
function readRoute(){const [prefix,id,view]=location.hash.slice(1).split('/');if(Object.hasOwn(vacuumModules,prefix))return {page:'module',path:[prefix]};if(prefix==='equipment'&&Object.hasOwn(hardModules,id))return {page:'hardlab',path:[id,view]};if(prefix==='hyper-2000b')return {page:'scrubber',path:[id||'explore']};return {page:Object.keys(pageHashes).find(p=>pageHashes[p]===prefix)||'home',path:id?[id]:[]};}
function setCollapsed(collapsed){document.body.classList.toggle('nav-collapsed',collapsed);$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');}
function showPage(next,path=[],historyMode='push'){
 page=next;const token=++navToken;
 if(next!=='hardlab')hardLab?.pause();if(next!=='scrubber')scrubber?.pause();if(next!=='soft-checklist')maintenance?.pause();
 viewer?.clearHover();if(next!=='module'){state.connected=false;state.running=false;state.stroke=false;}viewer?.setActive(next==='module');if(next==='module')ensureViewer();
 guidance.setMachine(null);
 for(const [id,page] of [['home','home'],['module','module'],['checklist','soft-checklist'],['hard-lab','hardlab'],['scrubber-lab','scrubber']])$(id).hidden=next!==page;
 $('catalogue').hidden=!['catalogue','hard-checklist'].includes(next);setCollapsed(next!=='home');let title='EFS Learning Academy',hash=pageHashes[next]||'home',hardId=null;
 if(next==='module'||next==='soft-checklist'){
  loadVacuum(path[0]||machine.id);configureVacuum(next==='soft-checklist');
  if(next==='module'){state={...state,part:'overview',open:0,connected:false,running:false,stroke:false};$('startup-panel').open=false;for(const drawer of document.querySelectorAll('#module .module-options,#module .cleaning-practice'))drawer.open=false;render();$('breadcrumb').textContent=`Soft Services / Equipment / Vacuum Cleaner / ${machine.category} / CleanTech / ${machine.name}`;hash=machine.id;}
  else{
   $('breadcrumb').textContent=`Soft Services / Maintenance Checklist / ${machine.name}`;hash=`maintenance/${machine.id}`;$('maintenance-machine').value=machine.id;$('checklist-machine-name').textContent=machine.name;
   enterMaintenance(token);
  }
  title=next==='module'?machine.name:machine.name+' maintenance';
 }else if(next==='hardlab'){
  hardId=Object.hasOwn(hardModules,path[0])?path[0]:hardList[0].id;const view=['maintenance','experiment'].includes(path[1])?path[1]:'explore';
  $('breadcrumb').textContent=`Hard Services / Equipment / ${hardModules[hardId].path.join(' / ')} / ${hardModules[hardId].brand}`;
  enterHardLab(hardId,view,token);title=hardModules[hardId].name;hash=`equipment/${hardId}${view==='explore'?'':`/${view}`}`;
 }else if(next==='scrubber'){
  const view=path[0]==='maintenance'?'maintenance':'explore';enterScrubber(view,token);$('breadcrumb').textContent='Soft Services / Equipment / Scrubber Dryers / Lavor / HYPER 2000B';title='HYPER 2000B';hash=`hyper-2000b${view==='maintenance'?'/maintenance':''}`;
 }else if(next==='home')$('breadcrumb').textContent='Welcome to EFS Learning Academy';
 else{$('breadcrumb').textContent=`Hard Services / ${next==='hard-checklist'?'Maintenance Checklist':'Equipment'}`;$('catalogue-title').textContent=next==='hard-checklist'?'Maintenance learning':'Hard Services equipment';hardNames($('catalogue-names'),next==='hard-checklist');title='Hard Services';}
 for(const b of document.querySelectorAll('[data-vacuum]')){const selected=next==='module'&&b.dataset.vacuum===machine.id;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 for(const b of document.querySelectorAll('[data-hard-module]')){const selected=next==='hardlab'&&b.dataset.hardModule===hardId;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 if(['hardlab','catalogue','hard-checklist'].includes(next))$('hard-nav').open=true;
 for(const b of document.querySelectorAll('[data-page]')){const selected=b.dataset.page===next;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 document.title=title==='EFS Learning Academy'?title:`${title} · EFS Learning Academy`;
 if(historyMode!=='none')history[historyMode==='replace'?'replaceState':'pushState']({page:next,path},'',`#${hash}`);
 closeMenu();window.scrollTo({top:0,behavior:'instant'});render();
}
for(const b of document.querySelectorAll('[data-vacuum]'))b.addEventListener('click',()=>showPage('module',[b.dataset.vacuum]));document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();showPage('home');});
for(const b of document.querySelectorAll('[data-page]'))b.addEventListener('click',()=>showPage(b.dataset.page));
for(const id of ['open-checklist','home-maintenance','home-practice'])$(id).addEventListener('click',()=>showPage('soft-checklist'));
for(const id of ['back-to-machine','practice-back'])$(id).addEventListener('click',()=>showPage('module'));
for(const id of ['home-machine','home-lab'])$(id).addEventListener('click',()=>showPage('module',['junior-103']));
for(const b of document.querySelectorAll('[data-soft-entry]'))b.addEventListener('click',()=>b.dataset.softEntry==='hyper-2000b'?showPage('scrubber'):showPage('module',[b.dataset.softEntry]));
$('home-cleaning').addEventListener('click',()=>{showPage('module',['junior-103']);document.querySelector('#module .cleaning-practice').open=true;$('startup-panel').open=true;withViewer(ready=>ready.cameraAction('floor'));$('operation-message').textContent='Connect the plug, switch on and choose Move floor tool to pick up the virtual dust on tiles.';});
window.addEventListener('popstate',()=>{const route=readRoute();showPage(route.page,route.path,'none');});
$('maintenance-machine').addEventListener('change',e=>{if(e.target.value==='hyper-2000b')showPage('scrubber',['maintenance']);else showPage('soft-checklist',[e.target.value]);});
for(const check of operatorChecks){const label=document.createElement('label');label.className='check-row';const input=document.createElement('input');input.type='checkbox';input.id=`check-${check.id}`;const text=document.createElement('span');const title=document.createElement('strong');title.textContent=check.name;const desc=document.createElement('small');desc.textContent=check.text;text.append(title,desc);label.append(input,text);$('operator-checks').append(label);input.addEventListener('change',()=>updateChecks(input));}
function updateChecks(changed){const inputs=[...document.querySelectorAll('#operator-checks input')],index=inputs.indexOf(changed);if(index>=0){if(changed.checked){const previous=inputs.slice(0,index).findIndex(input=>!input.checked);if(previous>=0){changed.checked=false;guidance.notify('Complete the previous step: '+operatorChecks[previous].name+'.');}else guidance.clearNotice();}else{for(const input of inputs.slice(index+1))input.checked=false;guidance.clearNotice();}}$('check-progress').textContent=`${document.querySelectorAll('#operator-checks input:checked').length} / ${operatorChecks.length} checked`;}
$('clear-checks').addEventListener('click',()=>{for(const input of document.querySelectorAll('#operator-checks input'))input.checked=false;updateChecks();});
buildVacuumContent();
document.addEventListener('efs-guide-language',()=>render());
render();
const route=readRoute();showPage(route.page,route.path,'replace');
