import {airflowLesson} from '../content.js';
import {getHardModule} from '../hard-content.js';
import {scrubberModule} from '../soft-content.js';

// Qualitative conditions only, built from text that already exists in the content files: the three air-path lessons for the
// vacuums, and the inspection findings of each machine. No error codes, pressures or other numbers are added here.
const VACUUM_PARTS={clear:['tool','wand','hose','inlet','collector','filter','fan'],hose:['tool','wand','hose','inlet'],filter:['filter','collector']};
const ISOLATED='Check with the machine switched off and isolated from power.';
const fromChecks=(module,partName)=>module.checks.map((check,index)=>({id:`${check.part}-${index}`,label:check.title,parts:[check.part],cause:check.finding||check.body,check:`${check.body} ${ISOLATED}`,partName:partName(check.part)}));

export function faultsFor(machineId){
 if(machineId.startsWith('junior-')){
  return ['clear','hose','filter'].map(id=>{const lesson=airflowLesson(id);return {id,label:lesson.label,parts:VACUUM_PARTS[id],cause:`${lesson.title} ${lesson.text}`,check:id==='clear'?'Nothing to find: this is the reference condition. Compare the other two with it.':ISOLATED};});
 }
 const module=machineId==='hyper-2000b'?scrubberModule:getHardModule(machineId);
 return module?fromChecks(module,id=>module.parts.find(p=>p.id===id)?.name).map(({partName,...fault})=>fault):[];
}
