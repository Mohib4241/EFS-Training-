import {initialPractice,reducePractice} from './maintenance-state.js';

// These are authored demonstrations. They never update the learner's practice state.
const scripts={
 bag:[
  ['Isolate the machine','Switch off and unplug before touching the clips or opening the cleaner.',1800,[{type:'isolate'}],{at:{x:110,y:535}}],
  ['Release the left clip','The retaining clips hold the head on the tank. Release the first clip.',1200,[{type:'unclip',clip:'left'}],{at:{x:350,y:305}}],
  ['Release the right clip','Release the second clip before lifting the head.',1200,[{type:'unclip',clip:'right'}],{at:{x:643,y:305}}],
  ['Lift and park the head','Hold the handle, lift the head away and place it on the marked head rest.',2600,[{type:'open'}],{object:'head'}],
  ['Lift out the used bag','Hold the bag and lift it onto the removal tray without emptying its contents.',2300,[{type:'remove'}],{object:'used'}],
  ['Seal the opening','Contain the dust before moving the used bag to the waste bin.',1400,[{type:'seal'}],{at:{x:265,y:365}}],
  ['Move the sealed bag to the bin','Hold the sealed bag, move it to the bin and release it there.',2500,[{type:'dispose',item:'used'}],{object:'used'}],
  ['Fit a clean bag','Take the clean bag from the shelf and place it in the open tank.',2500,[{type:'fit',item:'new'}],{object:'fresh'}],
  ['Return the head','Pick up the parked head and return it to the top of the tank.',2600,[{type:'close'}],{object:'head'}],
  ['Secure the left clip','Secure the first retaining clip after the head has been seated.',1200,[{type:'secure',clip:'left'}],{at:{x:350,y:305}}],
  ['Secure the right clip','Secure the other clip. This practice finishes with the power still isolated.',1200,[{type:'secure',clip:'right'}],{at:{x:643,y:305}}]
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
 ['Isolate before weekly filter care','Switch off and unplug. Keep the motor head away from the wash area.',1600,[{type:'isolate'}],{at:{x:110,y:535}},'Weekly filter care se pehle isolate karo','Switch off aur unplug karo. Motor head ko wash area se door rakho.'],
 ['Release the first clip','Release the left retaining clip.',1100,[{type:'unclip',clip:'left'}],{at:{x:350,y:305}},'Pehla clip kholo','Left retaining clip release karo.'],
 ['Release the second clip','Both clips must be free before lifting the head.',1100,[{type:'unclip',clip:'right'}],{at:{x:643,y:305}},'Doosra clip kholo','Head uthane se pehle dono clips free hone chahiye.'],
 ['Park the motor head','Hold the handle and move the head to its dry rest.',2300,[{type:'open'}],{object:'head'},'Motor head ko rest par rakho','Handle hold karke head ko dry rest par rakho.'],
 ['Lift this filter by its rim',wet?'Lift the caged filter illustration to the tray. Exact washable media must be confirmed.':'Lift the textile basket filter to its inspection tray.',2300,[{type:'remove'}],{object:'filter'},'Isi filter ko rim se uthao','Filter ko hold karke inspection tray par le jao.'],
 ['Confirm washable media','Check the media, rim and seal. Only an approved washable removable filter is rinsed in this scenario; never paper media.',2600,[{type:'inspect',choice:'washable'}],{at:{x:265,y:365}},'Washable media confirm karo','Media, rim aur seal check karo. Sirf approved washable removable filter rinse karo; paper media ko water se mat dhona.'],
 ['Turn on clean water','Use the tap. Only the removed filter goes into the wash area.',1500,[{type:'tap'}],{at:{x:110,y:300}},'Clean water on karo','Tap on karo. Sirf nikala hua filter wash area mein jayega.'],
 ['Rinse the same filter','Hold the filter and move it under the stream. Keep water away from the motor head and electrical parts.',2500,[{type:'wash'}],{object:'filter'},'Isi filter ko rinse karo','Filter hold karke water stream ke neeche le jao. Motor head aur electrical parts ko dry rakho.'],
 ['Turn the tap off','Stop the water before moving the rinsed filter to the rack.',1400,[{type:'tap'}],{at:{x:110,y:300}},'Tap band karo','Rinsed filter ko rack par le jaane se pehle water off karo.'],
 ['Place it on the air-drying rack','Move this same filter to the drying rack.',2300,[{type:'rack'}],{object:'filter'},'Air-drying rack par rakho','Isi filter ko drying rack par le jao.'],
 ['Air-drying preview','This short animation illustrates air drying. It does not represent the real drying time.',2200,[{type:'dry'}],{at:{x:115,y:130}},'Air-drying preview dekho','Yeh chhoti animation air drying dikhati hai. Real drying time isse decide nahi hota.'],
 ['Check that it is completely dry','Do not refit damp media. Confirm a completely dry, undamaged filter before continuing.',2400,[{type:'confirm-dry',choice:'dry'}],{at:{x:115,y:130}},'Puri tarah dry check karo','Damp media wapas mat lagao. Completely dry aur undamaged filter confirm karo.'],
 ['Refit the same clean filter','Hold it on the rack and seat its rim in the tank without trapping the seal.',2300,[{type:'fit'}],{object:'filter'},'Wahi clean filter wapas lagao','Rack se filter hold karo aur tank mein rim seat karo. Seal ko trap mat karo.'],
 ['Return the head','Return the dry motor head without disturbing the seated filter.',2300,[{type:'close'}],{object:'head'},'Head wapas rakho','Dry motor head ko wapas rakho. Seated filter disturb mat karo.'],
 ['Secure the first clip','Lock the left retaining clip.',1000,[{type:'secure',clip:'left'}],{at:{x:350,y:305}},'Pehla clip lock karo','Left retaining clip lock karo.'],
 ['Secure the second clip','Lock the right clip. Weekly is the site training schedule; the machine stays isolated.',1500,[{type:'secure',clip:'right'}],{at:{x:643,y:305}},'Doosra clip lock karo','Right clip lock karo. Weekly site training schedule hai; machine isolated rahegi.']
];
scripts.filter=filterScript(false);scripts['wet-filter']=filterScript(true);
export function lessonFrames(kind){
 if(!Object.hasOwn(scripts,kind))throw new RangeError('Unknown lesson');
 let state=initialPractice(kind),start=0;
 return scripts[kind].map(([title,caption,duration,actions,gesture,titleHi,captionHi])=>{const from=state;for(const action of actions)state=reducePractice(state,action).state;const frame={title,caption,titleHi,captionHi,duration,start,end:start+duration,from,to:state,gesture,actions};start=frame.end;return frame;});
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
