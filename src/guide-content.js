export const GUIDE_LANGUAGES=['english','hinglish'];
const frame=(id,target,gesture,en,hi,speech)=>({id,target,gesture,en,hi,speech});
const pageFrames=[
 frame('rotate','canvas','drag',['Drag to rotate','Hold the model and drag left or right.'],['Drag karke ghumao','Model ko hold karo aur left ya right drag karo.'],'Model को hold करो और left या right drag करो।'),
 frame('open','canvas','pinch-out',['Pinch out to open','Spread two fingers, or scroll up, to reveal the assemblies.'],['Pinch out karke kholo','Do fingers door karo, ya scroll up karo. Andar ke parts dikhenge.'],'दो fingers दूर करो, या scroll up करो। अंदर के parts दिखेंगे।'),
 frame('close','canvas','pinch-in',['Pinch in to close','Bring two fingers together, or scroll down, to assemble the machine.'],['Pinch in karke band karo','Do fingers paas lao, ya scroll down karo. Machine phir assemble hogi.'],'दो fingers पास लाओ, या scroll down करो। Machine फिर assemble होगी।'),
 frame('zoom-in','camera','zoom-in',['Zoom in','Use + to bring the camera closer. Pinch controls the opening.'],['Zoom in karo','Camera paas laane ke liye + dabao. Pinch se machine khulti hai.'],'Camera पास लाने के लिए plus दबाओ। Pinch से machine खुलती है।'),
 frame('zoom-out','camera','zoom-out',['Zoom out','Use − to see the whole machine. The target button resets the view.'],['Zoom out karo','Puri machine dekhne ke liye minus dabao. Target button se view reset hota hai.'],'पूरी machine देखने के लिए minus दबाओ। Target button से view reset होता है।'),
 frame('hover','sound','point',['Point to hear a part','Turn on the speaker, then hover over a part. Its name is spoken here.'],['Part par cursor rakho','Speaker on karo, phir part par cursor rakho. Usi part ka naam sunai dega.'],'Speaker on करो, फिर part पर cursor रखो। उसी part का नाम सुनाई देगा।')
];
const machineFrames=[
 frame('prepare','canvas','point',['Meet your machine','Start assembled and isolated. The side panels stay out of your way.'],['Machine ko samjho','Machine assembled aur isolated hai. Side panels band rahenge, focus machine par hai.'],'Machine assembled और isolated है। Side panels बंद रहेंगे, focus machine पर है।'),
 frame('connect','startup','tap',['Connect the virtual supply','Open “Start the machine”, then connect the plug or virtual supply.'],['Pehle supply connect karo','Start the machine kholo, phir plug ya virtual supply connect karo.'],'Start the machine खोलो, फिर plug या virtual supply connect करो।'),
 frame('run','startup','tap',['Switch on second','After connection, use Switch on or Run. Watch the operating parts.'],['Ab machine start karo','Supply connect hone ke baad Switch on ya Run dabao. Moving parts dekho.'],'Supply connect होने के बाद Switch on या Run दबाओ। Moving parts देखो।'),
 frame('identify','canvas','point',['Know the motor head','Point to the upper head to hear its name. It houses the drive and suction system.'],['Motor head ko pehchano','Upar wale head par cursor rakho. Isme motor aur suction system hota hai.'],'ऊपर वाले head पर cursor रखो। इसमें motor और suction system होता है।'),
 frame('mechanism','canvas','flow',['See how it works','The motor drives the fan. Air enters through the tool and hose.'],['Kaam kaise hota hai','Motor fan ko ghumati hai. Air floor tool aur hose se andar aati hai.'],'Motor fan को घुमाती है। Air floor tool और hose से अंदर आती है।'),
 frame('isolate','startup','tap',['Stop, then disconnect','Switch off before disconnecting. Opening the model also isolates it.'],['Band karo, phir disconnect','Pehle switch off karo, phir plug disconnect karo. Model kholne par bhi power isolate hoti hai.'],'पहले switch off करो, फिर plug disconnect करो। Model खोलने पर भी power isolate होती है।'),
 frame('maintenance','maintenance','point',['Practise maintenance next','Open the checklist for a separate animated lesson and hands-on practice.'],['Ab maintenance practise karo','Checklist kholo. Pehle animation dekho, phir task khud practise karo.'],'Checklist खोलो। पहले animation देखो, फिर task खुद practise करो।')
];
const maintenanceFrames=[
 frame('choose-task','tasks','point',['Choose your task','Choose the machine and task. Filter washing is separate from changing the dust bag.'],['Apna task choose karo','Machine aur task choose karo. Filter wash aur dust bag change alag tasks hain.'],'Machine और task choose करो। Filter wash और dust bag change अलग tasks हैं।'),
 frame('watch','lesson','tap',['Watch the demonstration','Play the animation, or review each action with the arrows.'],['Pehle animation dekho','Animation play karo, ya arrows se har action dekho.'],'Animation play करो, या arrows से हर action देखो।'),
 frame('practise','practice','drag',['Practise in 3D','After the demonstration, do each step yourself: pinch or click a part to pick it up, and put it on the highlighted target.'],['3D mein practise karo','Demonstration ke baad har step khud karo: part ko pinch ya click karke uthao aur highlighted jagah par rakho.'],'Demonstration के बाद हर step खुद करो: part को pinch या click करके उठाओ और highlighted जगह पर रखो।')
];
export function guideFrames(kind,machine,language='english',maintenance=false){
 if(!['page','machine'].includes(kind)||!GUIDE_LANGUAGES.includes(language))throw new RangeError('Unknown guide or language');
 const frames=maintenance?maintenanceFrames:kind==='page'?pageFrames:machineFrames;
 return frames.map(source=>{
  let f={...source};
  if(maintenance&&!machine.id?.startsWith('junior-')){
   if(f.id==='choose-task')f={...f,en:['Choose the equipment lesson','Review the observation lesson before starting its inspection practice.'],hi:['Equipment lesson choose karo','Inspection practice se pehle observation lesson ka sequence dekho.'],speech:'Inspection practice से पहले observation lesson का sequence देखो।'};
   if(f.id==='practise')f={...f,gesture:'point',en:['Identify, then explain','After the lesson, isolate the virtual equipment and identify the inspection areas in order.'],hi:['Pehchano aur explain karo','Lesson ke baad virtual equipment isolate karo aur inspection areas ko order mein identify karo.'],speech:'Lesson के बाद virtual equipment isolate करो और inspection areas को order में identify करो।'};
  }
  if(kind==='machine'&&!maintenance&&!machine.id?.startsWith('junior-')){
   if(f.id==='identify')f={...f,en:['Point to a component','Hover over the model to hear the component name without opening side panels.'],hi:['Component ko pehchano','Model ke part par cursor rakho. Naam yahin sunai dega; panels band rahenge.'],speech:'Model के part पर cursor रखो। नाम यहीं सुनाई देगा; panels बंद रहेंगे।'};
   if(f.id==='mechanism')f={...f,en:['Watch the working system',machine.kind==='scrubber'?'Solution loosens soil, the brush agitates it, and suction recovers the dirty water.':'The visible motion follows the virtual operating state. Explore the engineering relationship in Experiment.'],hi:['System ka kaam dekho',machine.kind==='scrubber'?'Solution dirt ko loosen karti hai, brush scrub karta hai aur suction dirty water recover karti hai.':'Motion virtual state ko follow karti hai. Experiment mein engineering relation try karo.'],speech:machine.kind==='scrubber'?'Solution dirt को loosen करती है, brush scrub करता है और suction dirty water recover करती है।':'Motion virtual state को follow करती है। Experiment में engineering relation try करो।'};
  }
  const [title,caption]=language==='hinglish'?f.hi:f.en;
  return {...f,title,caption,spokenHi:f.speech,duration:Math.max(5200,caption.split(/\s+/).length*360)};
 });
}
export function moveGuide(index,direction,total){
 if(!Number.isInteger(index)||index<0||index>=total||![-1,1].includes(direction)||!Number.isInteger(total)||total<1)throw new RangeError('Invalid guide position');
 const next=index+direction;return {index:Math.max(0,Math.min(total-1,next)),complete:next>=total};
}
export function partNameSpeech(part,language){
 if(!GUIDE_LANGUAGES.includes(language))throw new RangeError('Unknown language');
 return language==='hinglish'?{text:`Yeh ${part.name} hai.`,spokenHi:`यह ${part.name} है।`}:{text:part.name,spokenHi:null};
}
