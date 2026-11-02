// Which layer each part belongs to, how parts group into colour-coded categories, and which parts sit hidden inside the shell.
// Layers: 0 shell and covers, 1 tanks, filters and sensors, 2 deep internals, 3 base-level and innermost parts.
// Written as space-separated ids per layer so each machine reads at a glance.
const LAYERS={
 'junior-103':['cover handle clips switch','tank collector filter float inlet hose wand tool cable plug','motor fan','base wheels'],
 'junior-429':['cover handle clips switch','tank collector filter float inlet hose wand tool cable plug','motor fan','base wheels'],
 'hyper-2000b':['handle controls recovery','solution filter solution-filter valve','vacuum brush-motor battery recovery-hose drain','body wheels brush squeegee'],
 'motor-1ph':['frame cowl terminal-box endshields','fan terminal-board earth capacitors start-switch','stator windings auxiliary de-bearing nde-bearing','rotor shaft feet'],
 'motor-3ph':['frame cowl terminal-box endshields','fan terminal-board earth','stator windings de-bearing nde-bearing','rotor shaft feet'],
 'alternator':['frame cowl terminal-box','fan avr coupling','stator windings exciter-stator bearing rectifier','rotor shaft exciter-rotor'],
 'megger':['case back','screen dial test-key terminals leads','pcb battery','discharge'],
 'multimeter':['case body back','screen dial terminals leads','pcb battery','fuses'],
 'cascade':['unit-1 unit-2 unit-3','buffer pumps valves sensors flow-switch','headers controls','base load']
};
// Parts that cannot be seen or reached until the shell is open (the same ones the pages used to open the model for).
const HIDDEN='motor fan filter collector float stator windings rotor avr exciter-rotor rectifier pcb battery discharge fuses auxiliary terminal-board vacuum brush-motor solution-filter valve'.split(' ');

const lookup=Object.fromEntries(Object.entries(LAYERS).map(([id,layers])=>[id,Object.fromEntries(layers.flatMap((names,layer)=>names.split(' ').map(part=>[part,layer])))]));
export const layerOf=(machineId,partId)=>lookup[machineId]?.[partId]??0;
export const isHidden=(machineId,partId)=>HIDDEN.includes(partId)&&layerOf(machineId,partId)>0;

// Vacuums use the categories the learner would name; every other machine uses the groups already in its content.
const VACUUM={
 shell:{label:'Shell and covers',color:'#4f7fa8',parts:'cover handle clips'},
 controls:{label:'Controls',color:'#c98a1a',parts:'switch'},
 air:{label:'Motor and air',color:'#0a8f9c',parts:'motor fan inlet hose wand tool'},
 filtration:{label:'Filtration',color:'#7a62c4',parts:'filter collector tank float'},
 power:{label:'Power and cable',color:'#d4682f',parts:'cable plug'},
 base:{label:'Base and wheels',color:'#6d7b88',parts:'base wheels'}
};
const PALETTE=['#4f7fa8','#c98a1a','#0a8f9c','#7a62c4','#d4682f','#0f9d6e','#6d7b88','#b0517a'];

// parts: the machine's content parts, without the "overview" entry. Returns the categories with counts and a part -> category lookup.
export function categorise(machineId,parts){
 const vacuum=machineId.startsWith('junior-'),of={},categories=[];
 if(vacuum){for(const [id,c] of Object.entries(VACUUM)){const members=parts.filter(p=>c.parts.split(' ').includes(p.id));if(members.length){categories.push({id,label:c.label,color:c.color,count:members.length});for(const p of members)of[p.id]=id;}}}
 else for(const p of parts){let category=categories.find(c=>c.label===p.group);if(!category){category={id:p.group.toLowerCase().replace(/[^a-z0-9]+/g,'-'),label:p.group,color:PALETTE[categories.length%PALETTE.length],count:0};categories.push(category);}category.count++;of[p.id]=category.id;}
 return {categories,of};
}

// Rows for the parts panel: colour dot, name and a short mono tag (the layer, then the position in the list).
export function partRows(machineId,parts){
 const {categories,of}=categorise(machineId,parts);
 return {categories,rows:parts.map((p,i)=>{const category=categories.find(c=>c.id===of[p.id]);return {id:p.id,name:p.name,category:category.id,color:category.color,layer:layerOf(machineId,p.id),hidden:isHidden(machineId,p.id),tag:`L${layerOf(machineId,p.id)} · ${String(i+1).padStart(2,'0')}`};})};
}
