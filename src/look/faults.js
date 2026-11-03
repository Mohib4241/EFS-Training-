import {airflowLesson} from '../content.js';
import {getHardModule} from '../hard-content.js';
import {scrubberModule} from '../soft-content.js';

// Qualitative conditions only, built from text that already exists in the content files: the three air-path lessons for the
// vacuums, and the inspection findings of each machine. No error codes, pressures or other numbers are added here.
const VACUUM_PARTS={clear:['tool','wand','hose','inlet','collector','filter','fan'],hose:['tool','wand','hose','inlet'],filter:['filter','collector']};
const ISOLATED='Check with the machine switched off and isolated from power.';
// Every checklist of a machine contributes its inspection areas, so the dropdown covers all of them.
const fromChecks=(module,partName)=>(module.checklists?module.checklists.flatMap((list,l)=>list.checks.map(check=>({check,l}))):module.checks.map(check=>({check,l:0}))).map(({check,l},index)=>({id:`${check.part}-${l}-${index}`,label:check.title,parts:[check.part],cause:check.finding||check.body,check:`${check.body} ${ISOLATED}`,partName:partName(check.part)}));

// The conditions never change for a machine, and repaints ask for them often, so they are built once.
const cache=new Map();
export const faultsFor=machineId=>{if(!cache.has(machineId))cache.set(machineId,buildFaults(machineId));return cache.get(machineId);};
function buildFaults(machineId){
 if(machineId.startsWith('junior-')){
  return ['clear','hose','filter'].map(id=>{const lesson=airflowLesson(id);return {id,label:lesson.label,parts:VACUUM_PARTS[id],cause:`${lesson.title} ${lesson.text}`,check:id==='clear'?'Nothing to find: this is the reference condition. Compare the other two with it.':ISOLATED};});
 }
 const module=machineId==='hyper-2000b'?scrubberModule:getHardModule(machineId);
 return module?fromChecks(module,id=>module.parts.find(p=>p.id===id)?.name).map(({partName,...fault})=>fault):[];
}
