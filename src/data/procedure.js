import {STEPS, PHASES} from './steps.js';
import {INSTR_CHECKS, INSTR_PHASES} from './instructions.js';

export const PROCEDURE_SOURCE = {
  title: 'BU3 · Vacuum cleaning', id: 'BICSc_EDU_D022', revision: '3.0', date: 'October 2020',
  status: 'Source-linked training · current site approval not supplied',
};
const verification = [
  ['You arrive at a corridor used by other people. What comes before cleaning?', 'Assess immediate risks and position warning signs.', 'Position a sign and start without assessing the area.'],
  ['You know how to use a vacuum, but this is a different site. What information is needed?', 'Review the task risk assessment, method statement/SOP and manufacturer instructions.', 'Rely on experience and read only the machine label.'],
  ['You notice a cut while preparing your hands. What follows the procedure?', 'Wash hands and cover the cut with a waterproof dressing.', 'Cover the cut with a dry cloth and skip hand washing.'],
  ['The trainer wears gloves and glasses. How do you decide your actual PPE?', 'Follow the task risk assessment and check PPE fit, suitability and condition.', 'Copy the animation even if the task risk assessment specifies different PPE.'],
  ['The dust bag is two-thirds full. How should it be handled?', 'Lift it carefully by one corner and change it without pressing down.', 'Press down on the bag to check whether more dust will fit.'],
  ['You find possible pest evidence in the cleaning store. What should you do?', 'Leave it undisturbed and report it under company policy.', 'Sweep away the evidence after taking a photograph.'],
  ['A carpet edge is already torn before your task. What follows the procedure?', 'Report the damage under company policy.', 'Leave it unreported because you did not cause it.'],
  ['Large debris and sticky soiling are present. What prepares the floor?', 'Remove them with the appropriate tools and keep the refuse bag out of the walking route.', 'Vacuum over everything and leave the refuse bag beside the walking route.'],
  ['You move from carpet to a hard floor. What changes at the floor head?', 'Use the brushes for the hard floor.', 'Keep the brushes retracted as for carpet.'],
  ['The plug and your hands are dry. What else matters before connection?', 'Use a switched-off socket behind the line of work, close to the exit.', 'Use any switched-on socket because your hands are dry.'],
  ['An open floor area has edges and a corner. Where does cleaning begin?', 'Use the appropriate accessories on edges and corners in manageable areas.', 'Clean the middle first and leave the edges for the floor head to reach later.'],
  ['A carpet entrance has a heavily used traffic lane. What coverage does BU3 describe?', 'Give it extra attention and clean in both directions, keeping the cable behind.', 'Use the same single pass as a lightly used area.'],
  ['Cleaning is finished and the bag needs changing. What prepares the equipment for storage?', 'Clean and recheck the equipment, change the bag as required and store with air circulation.', 'Coil the cable and store the equipment without the final checks.'],
  ['The work area is ready for signs to be removed. What happens before storage?', 'Clean the warning signs as required before storing them safely.', 'Stack used signs directly with clean equipment.'],
  ['You wore PPE throughout the task. What is still required at the end?', 'Remove PPE and wash hands under the company method.', 'Remove PPE; wearing gloves replaces the need to wash hands.'],
  ['You are the last person leaving the equipment store. What finishes the procedure?', 'Leave it clean, tidy and secure; turn off lights and air conditioning where applicable.', 'Secure the door but leave cleaning materials and equipment untidy.'],
];
export const sourcePages = n => n <= 4 ? [1] : n === 5 ? [1, 2] : n <= 11 ? [2] : n === 12 ? [2, 3] : [3];
export function guideFor(kind, index) {
  const step = (kind === 'sop' ? STEPS : INSTR_CHECKS)[index];
  if (!step) return null;
  return {...step, phaseLabel: (kind === 'sop' ? PHASES : INSTR_PHASES)[step.phase].label,
    pages: kind === 'sop' ? sourcePages(step.n) : [],
    objective: step.title,
    verification: kind === 'sop' ? {question: verification[index][0], choices: verification[index].slice(1), answer: 0, checks: step.checks.map(c=>c.id)} : null};
}
export function readReview(raw) {
  try { const values = JSON.parse(raw); return Array.isArray(values) ? [...new Set(values.filter(n => Number.isInteger(n) && n >= 1 && n <= STEPS.length))] : []; }
  catch { return []; }
}
