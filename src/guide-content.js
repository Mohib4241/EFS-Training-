export const GUIDE_LANGUAGES=['english','hinglish'];
// One guide now; 'page' and 'machine' are older names for it.
export const GUIDE_KINDS=['guide','page','machine'];
const frame=(id,target,gesture,en,hi,speech)=>({id,target,gesture,en,hi,speech});
// One guide for every equipment page. It follows the numbered steps on the right, in order, and each card describes what
// the screen is showing at that moment: step 1 View inside, step 2 Start the machine, then the page's own steps.
const guideSteps=[
 frame('inside','inside','tap',['Step 1 · View inside','View inside opens the machine out so every part can be seen. It keeps turning.'],['Step 1 · View inside','View inside se machine khul jaati hai aur har part dikhta hai. Machine ghoomti rehti hai.'],'View inside से machine खुल जाती है और हर part दिखता है। Machine घूमती रहती है।'),
 frame('point','canvas','point',['Point to a part','Move the cursor onto any part. Its name is read out, and what it does is shown beside the cursor.'],['Cursor part par le jao','Cursor ko kisi bhi part par le jao. Part ka naam sunai dega aur uska kaam cursor ke paas dikhega.'],'Cursor को किसी भी part पर ले जाओ। Part का नाम सुनाई देगा और उसका काम cursor के पास दिखेगा।'),
 frame('outside','inside','tap',['View outside','The same button, now View outside, puts the machine back together.'],['View outside','Wahi button ab View outside hai. Isse machine phir se jud jaati hai.'],'वही button अब View outside है। इससे machine फिर से जुड़ जाती है।'),
 frame('connect','startup','tap',['Step 2 · Start the machine','First, button 1: {connect}. The badge shows it is connected but still off.'],['Step 2 · Start the machine','Pehle button 1: {connectHi}. Badge dikhata hai ki machine connected hai par abhi off hai.'],'पहले button 1 दबाओ। Badge दिखाता है कि machine connected है पर अभी off है।'),
 frame('run','startup','tap',['Then switch it on','Button 2 starts it. The shell turns see-through so the working parts can be seen.'],['Phir machine chalao','Button 2 se machine chalti hai. Shell see-through ho jaata hai aur andar ke parts dikhte hain.'],'Button 2 से machine चलती है। Shell see-through हो जाता है और अंदर के parts दिखते हैं।'),
 frame('see','inside','tap',['See outside, see inside','While it runs, step 1 becomes See outside. It closes the shell and the machine keeps running.'],['Bahar dekho, andar dekho','Chalte waqt step 1 See outside ban jaata hai. Shell band hota hai aur machine chalti rehti hai.'],'चलते वक़्त step 1 See outside बन जाता है। Shell बंद होता है और machine चलती रहती है।'),
 frame('isolate','startup','tap',['Switch off, then disconnect','Always stop it with button 2 first, then disconnect with button 1.'],['Pehle band karo, phir disconnect','Hamesha pehle button 2 se band karo, phir button 1 se disconnect karo.'],'हमेशा पहले button 2 से बंद करो, फिर button 1 से disconnect करो।'),
 frame('next','maintenance','point',['Step 3 · Maintenance checklist','Open it to watch each maintenance step, then do it yourself. Machine view brings you back here.'],['Step 3 · Maintenance checklist','Ise kholo, har maintenance step dekho, phir khud karo. Machine view se wapas yahan aao.'],'इसे खोलो, हर maintenance step देखो, फिर खुद करो। Machine view से वापस यहाँ आओ।')
];
// what button 1 does on this machine
function connectWords(machine){
 const id=machine?.id||'',kind=machine?.kind||'';
 if(id.startsWith('junior-'))return ['Connect plug','Connect plug'];
 if(kind==='scrubber'||id==='hyper-2000b')return ['Enable virtual battery','Enable virtual battery'];
 if(['megger','multimeter'].includes(kind))return ['Connect virtual leads','Connect virtual leads'];
 return ['Connect virtual supply','Connect virtual supply'];
}
const maintenanceFrames=[
 frame('choose-task','tasks','point',['Choose your task','Choose a task. Filter washing is separate from changing the dust bag.'],['Apna task choose karo','Task choose karo. Filter wash aur dust bag change alag tasks hain.'],'Task choose करो। Filter wash और dust bag change अलग tasks हैं।'),
 frame('watch','lesson','tap',['Watch the demonstration','Play the animation, or review each action with the arrows.'],['Pehle animation dekho','Animation play karo, ya arrows se har action dekho.'],'Animation play करो, या arrows से हर action देखो।'),
 frame('practise','practice','drag',['Practise in 3D','After the demonstration, do each step yourself: click a part to pick it up, and put it on the highlighted target. The voice tells you the step.'],['3D mein practise karo','Demonstration ke baad har step khud karo: part ko click karke uthao aur highlighted jagah par rakho. Voice step batayegi.'],'Demonstration के बाद हर step खुद करो: part को click करके उठाओ और highlighted जगह पर रखो। Voice step बताएगी।')
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
  if(!maintenance){
   const [connect,connectHi]=connectWords(machine),hard=!(machine.id||'').startsWith('junior-')&&machine.kind!=='scrubber'&&machine.id!=='hyper-2000b';
   if(f.id==='connect')f={...f,en:f.en.map(t=>t.replace('{connect}',connect)),hi:f.hi.map(t=>t.replace('{connectHi}',connectHi))};
   if(f.id==='next'&&hard)f={...f,en:['Steps 3 and 4 · Experiment, Maintenance','Experiment changes one input to show the result. Maintenance teaches the checks. Machine view brings you back.'],hi:['Step 3 aur 4 · Experiment, Maintenance','Experiment mein ek input badlo aur result dekho. Maintenance mein checks seekho. Machine view se wapas aao.'],speech:'Experiment में एक input बदलो और result देखो। Maintenance में checks सीखो। Machine view से वापस आओ।'};
  }
  const [title,caption]=language==='hinglish'?f.hi:f.en;
  return {...f,title,caption,spokenHi:f.speech,duration:Math.max(5200,caption.split(/\s+/).length*360)};
 });
}
export function moveGuide(index,direction,total){
 if(!Number.isInteger(index)||index<0||index>=total||![-1,1].includes(direction)||!Number.isInteger(total)||total<1)throw new RangeError('Invalid guide position');
 const next=index+direction;return {index:Math.max(0,Math.min(total-1,next)),complete:next>=total};
}
// What the voice says when the cursor rests on a part: only its name. What it does is shown beside the cursor, not read out.
export function partNameSpeech(part,language){
 if(!GUIDE_LANGUAGES.includes(language))throw new RangeError('Unknown language');
 return language==='hinglish'?{text:`Yeh ${part.name} hai.`,spokenHi:`यह ${part.name} है।`}:{text:part.name,spokenHi:null};
}
// The first sentence of a part's description: shown beside the cursor and read out.
export function partAbout(part){
 const text=String(part?.body??'').replace(/\s+/g,' ').trim(),first=text.match(/^[^.!?]+[.!?]/)?.[0]??text;
 return first.length>140?first.slice(0,139).replace(/[\s,;:]+\S*$/,'')+'…':first;
}
