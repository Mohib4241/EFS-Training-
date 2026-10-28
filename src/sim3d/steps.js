// Pure, DOM-free helpers shared by the 3D view and its tests.
// The 2D checklist shows one row per phase; the authored lesson frames are finer-grained (e.g. one frame per clip).
// Frames belong to the step whose phase they start in, so both views describe the same checklist.
export function buildSteps(stepList,frames){
 const steps=stepList.map(([id,label])=>({id,label,frames:frames.filter(frame=>frame.from.phase===id)}));
 const covered=steps.reduce((sum,step)=>sum+step.frames.length,0);
 if(covered!==frames.length||steps.some(step=>step.frames.length===0))throw new RangeError('Lesson frames do not match the checklist steps');
 return steps;
}
// Index of the step a practice state is waiting on, the same rule the 2D list uses; steps.length when finished.
export const currentStep=(steps,state)=>state.complete?steps.length:Math.max(0,steps.findIndex(step=>step.id===state.phase));
// Deterministic checkpoints taken from the authored frames: no reducer replay, so they cannot drift.
export const stateBeforeStep=(steps,index,initial)=>clone(steps[index]?.frames[0].from??initial);
export const stateAfterStep=(steps,index)=>clone(steps[index].frames.at(-1).to);
export function clone(state){return structuredClone(state);}
