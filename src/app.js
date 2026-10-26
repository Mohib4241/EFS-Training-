import {parts,specs,airflowLesson,hardServices,operatorChecks} from './content.js';
import {initialState,transition} from './machine-state.js';
import {createViewer} from './viewer.js';
import {mountMaintenance} from './maintenance.js';
const $=id=>document.getElementById(id);let state=initialState();let viewer;let maintenance;
function action(type,value){const result=transition(state,{type,value});state=result.state;if(result.message)$('operation-message').textContent=result.message;render();}
function showInfo(which){$('learn-panel').hidden=which!=='learn';$('specs-panel').hidden=which!=='specs';for(const b of document.querySelectorAll('[data-info]'))b.setAttribute('aria-pressed',String(b.dataset.info===which));}
function selectPart(id){
 if(!parts.some(p=>p.id===id))return;state.part=id;showInfo('learn');
 if(['motor','fan','filter','collector'].includes(id)){
  if(state.running)state.xray=true;else if(state.open<65){const result=transition(state,{type:'open',value:70});state=result.state;$('operation-message').textContent=result.message;}
 }
 render();
}
function render(){
 const part=parts.find(p=>p.id===state.part);for(const [id,value] of [['part-tag',part.group.toUpperCase()],['part-title',part.title],['part-body',part.body],['part-why',part.why],['part-motion',part.motion],['part-evidence',part.evidence]])$(id).textContent=value;
 for(const b of document.querySelectorAll('[data-part]'))b.setAttribute('aria-pressed',String(b.dataset.part===state.part));
 $('whole-machine').setAttribute('aria-pressed',String(state.part==='overview'));
 $('explode').value=state.open;$('explode-value').textContent=`${Math.round(state.open)}%`;$('view-label').textContent=state.open===0?'Assembled':state.open<40?'Head open':state.open<85?'Inside':'Exploded';
 for(const [id,key] of [['xray-toggle','xray'],['air-toggle','air'],['callout-toggle','callouts'],['stroke-toggle','stroke'],['power-toggle','running']])$(id).setAttribute('aria-pressed',String(state[key]));
 $('plug-toggle').lastElementChild.textContent=state.connected?'Disconnect plug':'Connect plug';$('power-toggle').lastElementChild.textContent=state.running?'Switch off':'Switch on';
 $('power-status').textContent=state.running?'Running':state.connected?'Connected · off':'Unplugged';$('power-status').classList.toggle('running',state.running);
 $('stroke-toggle').textContent=state.stroke?'Pause floor tool':'Move floor tool';$('pickup-instruction').textContent=state.condition==='clear'?'Connect the plug, switch on, then move the floor tool over the dust.':'Choose Clear air path for this pickup exercise. Fault-specific cleaning performance is not modelled.';
 for(const b of document.querySelectorAll('[data-open]'))b.classList.toggle('active',Number(b.dataset.open)===state.open);
 $('condition').value=state.condition;const lesson=airflowLesson(state.condition);$('scenario-title').textContent=lesson.title;$('scenario-text').textContent=lesson.text;
 viewer?.setState(state);
}
let groupName;let groupContainer;
for(const [i,p] of parts.slice(1).entries()){
 if(p.group!==groupName){groupName=p.group;const h=document.createElement('h3');h.textContent=groupName;$('parts').append(h);groupContainer=document.createElement('div');groupContainer.className='part-group';$('parts').append(groupContainer);}
 const b=document.createElement('button');b.dataset.part=p.id;b.setAttribute('aria-pressed','false');const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');b.append(num,document.createTextNode(p.name));b.addEventListener('click',()=>selectPart(p.id));groupContainer.append(b);
}
$('part-count').textContent=String(parts.length-1).padStart(2,'0');$('whole-machine').addEventListener('click',()=>selectPart('overview'));
for(const [name,value,source] of specs){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),small=document.createElement('small');dt.textContent=name;dd.textContent=value;small.textContent=source;dd.append(small);row.append(dt,dd);$('specs').append(row);}
for(const b of document.querySelectorAll('[data-info]'))b.addEventListener('click',()=>showInfo(b.dataset.info));
$('explode').addEventListener('input',e=>action('open',Number(e.target.value)));
for(const b of document.querySelectorAll('[data-open]'))b.addEventListener('click',()=>action('open',Number(b.dataset.open)));
for(const [id,key] of [['xray-toggle','xray'],['air-toggle','air'],['callout-toggle','callouts'],['stroke-toggle','stroke']])$(id).addEventListener('click',()=>{state[key]=!state[key];if(((key==='air'&&state.air)||(key==='stroke'&&state.stroke))&&state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;}if(key==='stroke'&&state.stroke){viewer?.cameraAction('floor');$('operation-message').textContent=state.running?'Move the powered tool over the markers to collect them.':'The tool can move by hand. Connect the plug and switch on for dust pickup.';}render();});
$('plug-toggle').addEventListener('click',()=>action('plug'));$('power-toggle').addEventListener('click',()=>action('power'));
$('reset').addEventListener('click',()=>{viewer?.clearHover();action('reset');viewer?.resetDust();viewer?.cameraAction('reset');showInfo('learn');});
$('condition').addEventListener('change',e=>{state.condition=e.target.value;state.air=true;if(state.open>0){const result=transition(state,{type:'open',value:0});state=result.state;$('operation-message').textContent='Machine assembled for the airflow lesson. Connect the plug, then switch on.';}render();});
for(const id of ['rotate-left','rotate-right','zoom-out','zoom-in'])$(id).addEventListener('click',()=>viewer?.cameraAction(id));$('camera-reset').addEventListener('click',()=>viewer?.cameraAction('reset'));
$('floor-view').addEventListener('click',()=>viewer?.cameraAction('floor'));
$('reset-dust').addEventListener('click',()=>viewer?.resetDust());
$('single-pass').addEventListener('click',()=>{if(state.open>0||!state.connected||!state.running){$('operation-message').textContent='Assemble the machine, connect the plug and switch on before a pickup pass.';return;}if(state.condition!=='clear'){$('operation-message').textContent='Choose Clear air path for the pickup practice. Fault-specific pickup rates are not modelled.';return;}state.stroke=false;render();viewer?.cameraAction('floor');viewer?.makeCleaningPass();$('operation-message').textContent='The tool is making a full practice pass. Markers are counted, not cleaning efficiency.';});
const narrowNav=window.matchMedia('(max-width:1050px)');
function syncMenu(){const open=document.body.classList.contains('nav-open');document.querySelector('.sidebar').inert=narrowNav.matches&&!open;document.querySelector('.app').inert=narrowNav.matches&&open;$('nav-backdrop').hidden=!narrowNav.matches||!open;$('menu').setAttribute('aria-expanded',String(open));}
function closeMenu(){document.body.classList.remove('nav-open');syncMenu();}
narrowNav.addEventListener('change',()=>{if(!narrowNav.matches)document.body.classList.remove('nav-open');syncMenu();});syncMenu();
$('menu').addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');syncMenu();if(open)document.querySelector('.brand').focus();});$('nav-backdrop').addEventListener('click',closeMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('nav-open')){closeMenu();$('menu').focus();}});
for(const summary of document.querySelectorAll('.department>summary'))summary.addEventListener('click',e=>{if(document.body.classList.contains('nav-collapsed')&&!narrowNav.matches){e.preventDefault();document.body.classList.remove('nav-collapsed');summary.parentElement.open=true;$('collapse').setAttribute('aria-expanded','true');$('collapse').setAttribute('aria-label','Collapse navigation');}});
$('collapse').addEventListener('click',()=>{const collapsed=document.body.classList.toggle('nav-collapsed');$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');});
function makeNameTree(items,container,path=[]){for(const item of items){const current=[...path,item.name];if(item.children){const d=document.createElement('details');d.open=true;const s=document.createElement('summary');s.textContent=item.name;d.append(s);makeNameTree(item.children,d,current);container.append(d);}else{const b=document.createElement('button');b.className='nav-leaf';b.textContent=item.name;b.addEventListener('click',()=>showPage('catalogue',current));container.append(b);}}}
makeNameTree(hardServices,$('hard-tree'));
function hardNames(container){const ul=document.createElement('ul');ul.className='name-list';function branch(items,parent){for(const item of items){const li=document.createElement('li');const name=document.createElement('span');name.textContent=item.name;li.append(name);if(item.children){const children=document.createElement('ul');branch(item.children,children);li.append(children);}parent.append(li);}}branch(hardServices,ul);container.replaceChildren(ul);}
const pageHashes={home:'home',module:'junior-103','soft-checklist':'maintenance',catalogue:'hard-services','hard-checklist':'hard-maintenance'};
function pageFromHash(){return Object.keys(pageHashes).find(page=>pageHashes[page]===location.hash.slice(1))||'home';}
function setCollapsed(collapsed){document.body.classList.toggle('nav-collapsed',collapsed);$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');}
function showPage(next,path=[],historyMode='push'){
 viewer?.clearHover();if(next!=='soft-checklist')maintenance?.pause();else{state.connected=false;state.running=false;state.stroke=false;$('operation-message').textContent='Explorer switched off and unplugged for maintenance practice.';render();}
 $('home').hidden=next!=='home';$('module').hidden=next!=='module';$('catalogue').hidden=!['catalogue','hard-checklist'].includes(next);$('checklist').hidden=next!=='soft-checklist';
 setCollapsed(next!=='home');
 if(next==='module'){$('breadcrumb').textContent='Soft Services / Equipment / Vacuum Cleaner / CleanTech / Junior 103';$('vacuum-nav').setAttribute('aria-current','page');$('vacuum-nav').classList.add('selected');}
 else{$('vacuum-nav').removeAttribute('aria-current');$('vacuum-nav').classList.remove('selected');if(state.running){state.running=false;$('operation-message').textContent='Motor switched off when leaving the equipment explorer.';render();}if(next==='home')$('breadcrumb').textContent='Welcome to EFS Learning Academy';else if(next==='soft-checklist')$('breadcrumb').textContent='Soft Services / Maintenance Checklist / Junior 103';else{$('breadcrumb').textContent=`Hard Services / ${next==='hard-checklist'?'Maintenance Checklist':['Equipment',...path].join(' / ')}`;$('catalogue-title').textContent=next==='hard-checklist'?'Maintenance Checklist':path.at(-1)||'Equipment';if(next==='hard-checklist'||!path.length)hardNames($('catalogue-names'));else{const p=document.createElement('p');p.className='selected-name';p.textContent=path.join(' / ');$('catalogue-names').replaceChildren(p);}}}
 document.title=next==='home'?'EFS Learning Academy':`${next==='module'?'Junior 103':next==='soft-checklist'?'Maintenance practice':'Hard Services'} · EFS Learning Academy`;
 for(const b of document.querySelectorAll('[data-page]')){const selected=b.dataset.page===next;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 if(historyMode!=='none')history[historyMode==='replace'?'replaceState':'pushState']({page:next,path},'',`#${pageHashes[next]}`);
 closeMenu();window.scrollTo({top:0,behavior:'instant'});
}
$('vacuum-nav').addEventListener('click',()=>showPage('module'));document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();showPage('home');});
for(const b of document.querySelectorAll('[data-page]'))b.addEventListener('click',()=>showPage(b.dataset.page));
for(const id of ['open-checklist','home-maintenance','home-practice'])$(id).addEventListener('click',()=>showPage('soft-checklist'));
for(const id of ['back-to-machine','practice-back','home-machine','home-lab'])$(id).addEventListener('click',()=>showPage('module'));
$('home-cleaning').addEventListener('click',()=>{showPage('module');viewer?.cameraAction('floor');$('operation-message').textContent='Connect the plug, switch on and choose Move floor tool to pick up the virtual dust on tiles.';});
window.addEventListener('popstate',event=>showPage(event.state?.page||pageFromHash(),event.state?.path||[],'none'));
for(const check of operatorChecks){const label=document.createElement('label');label.className='check-row';const input=document.createElement('input');input.type='checkbox';input.id=`check-${check.id}`;const text=document.createElement('span');const title=document.createElement('strong');title.textContent=check.name;const desc=document.createElement('small');desc.textContent=check.text;text.append(title,desc);label.append(input,text);$('operator-checks').append(label);input.addEventListener('change',updateChecks);}
function updateChecks(){$('check-progress').textContent=`${document.querySelectorAll('#operator-checks input:checked').length} / ${operatorChecks.length} checked`;}
$('clear-checks').addEventListener('click',()=>{for(const input of document.querySelectorAll('#operator-checks input'))input.checked=false;updateChecks();});
maintenance=mountMaintenance($('maintenance-practice'));
try{viewer=createViewer($('machine'),selectPart,value=>action('open',value),progress=>{$('pickup-progress').textContent=`${progress.picked} / ${progress.total} markers picked up`;$('pickup-progress').classList.toggle('complete',progress.picked===progress.total);if(progress.picked===progress.total)$('operation-message').textContent='All virtual debris markers collected. Reset dust to practise again.';});$('viewer-loading').hidden=true;}catch(error){$('viewer-loading').hidden=true;$('viewer-fallback').hidden=false;console.warn('3D view unavailable:',error.message);}
render();
showPage(pageFromHash(),[],'replace');
