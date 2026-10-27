import {initialPractice,reducePractice,HAND_AREAS} from './maintenance-state.js';

// These are authored demonstrations. They never update the learner's practice state.
const scripts={
 bag:[
  ['Isolate the machine','Switch off and unplug before touching the clips or opening the cleaner.',1800,[{type:'isolate'}],{at:{x:110,y:535}}],
  ['Release the left clip','The retaining clips hold the head on the tank. Release the first clip.',1200,[{type:'unclip',clip:'left'}],{at:{x:350,y:305}}],
  ['Release the right clip','Release the second clip before lifting the head.',1200,[{type:'unclip',clip:'right'}],{at:{x:643,y:305}}],
  ['Lift and park the head','Hold the handle, lift the head away and place it on the marked head rest.',2600,[{type:'open'}],{object:'head'}],
  ['Lift out the used bag','Hold the bag and lift it onto the removal tray without emptying its contents.',2300,[{type:'remove'}],{object:'used'}],
  ['Seal the opening','Contain the dust before moving the used bag to the waste bin.',1400,[{type:'seal'}],{at:{x:265,y:365}}],
  ['Move the sealed bag to the bin','Hold the sealed bag, move it to the bottom-right bin and release it there.',2500,[{type:'dispose',item:'used'}],{object:'used'}],
  ['Fit a clean bag','Take the fresh bag from the top-left shelf and place it in the open tank.',2500,[{type:'fit',item:'new'}],{object:'fresh'}],
  ['Return the head','Pick up the parked head and return it to the top of the tank.',2600,[{type:'close'}],{object:'head'}],
  ['Secure the left clip','Secure the first retaining clip after the head has been seated.',1200,[{type:'secure',clip:'left'}],{at:{x:350,y:305}}],
  ['Secure the right clip','Secure the other clip. This practice finishes with the power still isolated.',1200,[{type:'secure',clip:'right'}],{at:{x:643,y:305}}]
 ],
 hands:[
  ['Turn on clean water','Begin with clean running water. The lesson shows only the hands and washing equipment.',1500,[{type:'tap'}],{at:{x:435,y:86}}],
  ['Wet both hands','Wet the hands before applying handwash.',1700,[{type:'wet'}],{at:{x:410,y:280}}],
  ['Turn off the tap','Save water while you lather and scrub.',1200,[{type:'tap'}],{at:{x:435,y:86}}],
  ['Apply soap','Use the handwash dispenser and cover the hands with lather.',1500,[{type:'soap'}],{at:{x:130,y:175}}],
  ['Scrub every surface','Palms, backs, between fingers and fingertips/nails. Preview is 4× speed: practice requires a real 20-second scrub.',5000,[...HAND_AREAS.map(area=>({type:'surface',area})),{type:'rub',now:0},{type:'tick',now:20_000}],{at:{x:410,y:295},scrub:true}],
  ['Rinse under running water','Turn the tap on and rinse the soap away.',2100,[{type:'tap'},{type:'rinse'}],{at:{x:455,y:260}}],
  ['Dry with a clean towel','Take a clean paper towel and dry the hands before touching the tap.',2000,[{type:'towel'},{type:'dry'}],{at:{x:640,y:380}}],
  ['Use the towel to turn off the tap','Use the towel as a barrier, then discard it. Do not dry again with its tap-contact area.',1600,[{type:'tap'}],{at:{x:435,y:86}}]
 ],
 terminals:[
  ['Isolate before checking','Switch off and unplug before this external visual observation.',1800,[{type:'isolate'}],{at:{x:260,y:310}}],
  ['Look at the pins and casing','Check for visible damage. Appearance does not prove terminal tightness or electrical safety.',1800,[{type:'inspect',area:'pins'}],{at:{x:440,y:210}}],
  ['Look at the cable entry','Notice sheath damage or exposed conductors. Internal work needs task-appropriate competence.',1800,[{type:'inspect',area:'cable'}],{at:{x:240,y:305}}],
  ['Recognise the heat mark','Dark staining is a visible warning sign. Do not treat the illustrated defect as a clear check.',2200,[{type:'inspect',area:'heat'}],{at:{x:340,y:220}}],
  ['Remove from use and report','Keep the equipment out of use and report the concern. This lesson does not teach live testing or repair.',1900,[{type:'decide',choice:'report'}],{at:{x:340,y:220}}]
 ]
};
const filterScript=wet=>[
 ['Isolate before filter care','Switch off, unplug and let the motor stop before touching the clips.',1600,[{type:'isolate'}],{at:{x:110,y:535}}],
 ['Release the first clip','Release the left retaining clip.',1100,[{type:'unclip',clip:'left'}],{at:{x:350,y:305}}],
 ['Release the second clip','Both clips must be free before lifting the head.',1100,[{type:'unclip',clip:'right'}],{at:{x:643,y:305}}],
 ['Park the motor head','Hold the handle and move the head to the rest.',2300,[{type:'open'}],{object:'head'}],
 ['Lift the filter by its rim',wet?'Lift the caged dry-filter illustration onto the inspection tray.':'Lift the textile basket filter onto the inspection tray.',2300,[{type:'remove'}],{object:'used'}],
 ['Inspect media, rim and seal','Look for dust loading, tears and a damaged seal. Do not assume the filter is washable or rated for liquids.',2100,[{type:'inspect'}],{at:{x:265,y:365}}],
 ['Select the matching dry filter',wet?'This task restores DRY pickup on the wet/dry unit. Liquid pickup needs the exact approved wet setup, with dry media removed as specified.':'Use a matching clean, dry textile basket. Exact fitment and care follow the correct manual.',2500,[{type:'choose',choice:'correct'}],{at:{x:110,y:135}}],
 ['Refit clean, dry media','Hold the clean filter, seat its rim correctly and check that the seal is not trapped.',2300,[{type:'fit'}],{object:'fresh'}],
 ['Return the head','Return the head without disturbing the seated filter.',2300,[{type:'close'}],{object:'head'}],
 ['Secure the first clip','Lock the left retaining clip.',1000,[{type:'secure',clip:'left'}],{at:{x:350,y:305}}],
 ['Secure the second clip','Lock the right clip. The practice finishes isolated, with dry media fitted for dry pickup.',1200,[{type:'secure',clip:'right'}],{at:{x:643,y:305}}]
];
scripts.filter=filterScript(false);scripts['wet-filter']=filterScript(true);
export function lessonFrames(kind){
 if(!Object.hasOwn(scripts,kind))throw new RangeError('Unknown lesson');
 let state=initialPractice(kind),start=0;
 return scripts[kind].map(([title,caption,duration,actions,gesture])=>{const from=state;for(const action of actions)state=reducePractice(state,action).state;const frame={title,caption,duration,start,end:start+duration,from,to:state,gesture,actions};start=frame.end;return frame;});
}
export const LESSONS=Object.fromEntries(Object.keys(scripts).map(kind=>[kind,lessonFrames(kind)]));
export function initialLesson(){return {elapsed:0,playing:false,started:false,complete:false};}
export function lessonPosition(kind,lesson){
 const frames=LESSONS[kind];if(!frames)throw new RangeError('Unknown lesson');const total=frames.at(-1).end;
 const index=Math.max(0,frames.findIndex(frame=>lesson.elapsed<frame.end));
 const step=lesson.elapsed>=total?frames.length-1:index,frame=frames[step];
 return {frame,step,total,progress:Math.max(0,Math.min(1,(lesson.elapsed-frame.start)/frame.duration))};
}
export function advanceLesson(kind,lesson,delta){
 if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid lesson interval');
 if(!lesson.playing)return lesson;
 const total=LESSONS[kind]?.at(-1).end;if(total===undefined)throw new RangeError('Unknown lesson');
 const elapsed=Math.min(total,lesson.elapsed+delta);return {...lesson,elapsed,complete:elapsed===total,playing:elapsed<total};
}
export function stepLesson(kind,lesson,direction){
 if(![-1,1].includes(direction))throw new RangeError('Invalid lesson direction');
 const {step,total}=lessonPosition(kind,lesson),frames=LESSONS[kind];
 const elapsed=direction===1?(step===frames.length-1?total:frames[step+1].start):frames[Math.max(0,step-1)].start;
 return {...lesson,elapsed,started:true,playing:false,complete:elapsed===total};
}
