export const GUIDE_LANGUAGES=['english','hinglish'];
// One guide now; 'page' and 'machine' are older names for it.
export const GUIDE_KINDS=['guide','page','machine'];
const frame=(id,target,gesture,en,hi,speech)=>({id,target,gesture,en,hi,speech});
// One guide for every equipment page: open the machine out and point to parts, then run it safely.
const guideSteps=[
 frame('inside','inside','tap',['View inside','Tap View inside. The machine opens out so every part can be seen, and it keeps turning.'],['Andar se dekho','View inside dabao. Machine khul jayegi, har part dikhega aur machine ghoomti rahegi.'],'View inside दबाओ। Machine खुल जाएगी, हर part दिखेगा और machine घूमती रहेगी।'),
 frame('point','canvas','point',['Point to a part','Move the cursor onto any part. Its name and what it does are shown and read out.'],['Cursor part par le jao','Cursor ko kisi bhi part par le jao. Us part ka naam aur kaam dikhega aur sunai dega.'],'Cursor को किसी भी part पर ले जाओ। उस part का नाम और काम दिखेगा और सुनाई देगा।'),
 frame('outside','inside','tap',['View outside','Tap View outside to put the machine back together.'],['Bahar se dekho','View outside dabao. Machine phir se jud jayegi.'],'View outside दबाओ। Machine फिर से जुड़ जाएगी।'),
 frame('connect','startup','tap',['Start the machine','Open Start the machine, then connect the plug or the virtual supply.'],['Machine start karo','Start the machine kholo, phir plug ya virtual supply connect karo.'],'Start the machine खोलो, फिर plug या virtual supply connect करो।'),
 frame('run','startup','tap',['Switch on','After connecting, switch on and watch the working parts.'],['Switch on karo','Connect karne ke baad switch on karo aur chalte hue parts dekho.'],'Connect करने के बाद switch on करो और चलते हुए parts देखो।'),
 frame('isolate','startup','tap',['Switch off, then unplug','Always switch off first, then disconnect.'],['Pehle band karo, phir plug nikalo','Hamesha pehle switch off karo, phir disconnect karo.'],'हमेशा पहले switch off करो, फिर disconnect करो।')
];
const maintenanceFrames=[
 frame('choose-task','tasks','point',['Choose your task','Choose a task. Filter washing is separate from changing the dust bag.'],['Apna task choose karo','Task choose karo. Filter wash aur dust bag change alag tasks hain.'],'Task choose करो। Filter wash और dust bag change अलग tasks हैं।'),
 frame('watch','lesson','tap',['Watch the demonstration','Play the animation, or review each action with the arrows.'],['Pehle animation dekho','Animation play karo, ya arrows se har action dekho.'],'Animation play करो, या arrows से हर action देखो।'),
 frame('practise','practice','drag',['Practise in 3D','After the demonstration, do each step yourself: pinch or click a part to pick it up, and put it on the highlighted target.'],['3D mein practise karo','Demonstration ke baad har step khud karo: part ko pinch ya click karke uthao aur highlighted jagah par rakho.'],'Demonstration के बाद हर step खुद करो: part को pinch या click करके उठाओ और highlighted जगह पर रखो।')
];
export function guideFrames(kind,machine,language='english',maintenance=false){
 if(!GUIDE_KINDS.includes(kind)||!GUIDE_LANGUAGES.includes(language))throw new RangeError('Unknown guide or language');
 const frames=maintenance?maintenanceFrames:guideSteps;
 return frames.map(source=>{
  let f={...source};
  if(maintenance&&!machine.id?.startsWith('junior-')){
   if(f.id==='choose-task')f={...f,en:['Choose the equipment lesson','Review the observation lesson before starting its inspection practice.'],hi:['Equipment lesson choose karo','Inspection practice se pehle observation lesson ka sequence dekho.'],speech:'Inspection practice से पहले observation lesson का sequence देखो।'};
   if(f.id==='practise')f={...f,gesture:'point',en:['Identify, then explain','After the lesson, isolate the virtual equipment and identify the inspection areas in order.'],hi:['Pehchano aur explain karo','Lesson ke baad virtual equipment isolate karo aur inspection areas ko order mein identify karo.'],speech:'Lesson के बाद virtual equipment isolate करो और inspection areas को order में identify करो।'};
  }
  const [title,caption]=language==='hinglish'?f.hi:f.en;
  return {...f,title,caption,spokenHi:f.speech,duration:Math.max(5200,caption.split(/\s+/).length*360)};
 });
}
export function moveGuide(index,direction,total){
 if(!Number.isInteger(index)||index<0||index>=total||![-1,1].includes(direction)||!Number.isInteger(total)||total<1)throw new RangeError('Invalid guide position');
 const next=index+direction;return {index:Math.max(0,Math.min(total-1,next)),complete:next>=total};
}
// What the voice says when the cursor rests on a part: its name, then the first sentence about it.
export function partNameSpeech(part,language){
 if(!GUIDE_LANGUAGES.includes(language))throw new RangeError('Unknown language');
 const about=partAbout(part);
 return language==='hinglish'?{text:`Yeh ${part.name} hai. ${about}`.trim(),spokenHi:`यह ${part.name} है। ${about}`.trim()}:{text:`${part.name}. ${about}`.trim(),spokenHi:null};
}
// The first sentence of a part's description: shown beside the cursor and read out.
export function partAbout(part){
 const text=String(part?.body??'').replace(/\s+/g,' ').trim(),first=text.match(/^[^.!?]+[.!?]/)?.[0]??text;
 return first.length>140?first.slice(0,139).replace(/[\s,;:]+\S*$/,'')+'…':first;
}
