import {task as bag} from './bag.js';
import {filterTask} from './filter.js';
import {task as terminals} from './terminals.js';
import {task as hands} from './hands.js';

// Every maintenance task the checklist offers, in 3D. A task module supplies its scene, rules, framing and choreography.
export const TASKS={filter:filterTask('filter'),'wet-filter':filterTask('wet-filter'),bag,hands,terminals};
// The tasks a machine offers, in checklist order (filter care first, as on the checklist).
export function tasksFor(machine){
 const filterKind=machine==='junior-429'?'wet-filter':'filter';
 return [filterKind,'bag','hands','terminals'].filter(kind=>TASKS[kind]).map(kind=>({kind,title:TASKS[kind].title(machine)}));
}
export const MACHINE_LABELS={'junior-103':'JUNIOR 103','junior-429':'JUNIOR 429'};
