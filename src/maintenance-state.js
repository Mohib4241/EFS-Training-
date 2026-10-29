import {initialFilterCare,reduceFilterCare} from './filter-care.js';
export function initialPractice(kind){
 if(['filter','wet-filter'].includes(kind))return initialFilterCare(kind);
 if(kind==='bag')return {kind,phase:'isolate',isolated:false,clips:{left:true,right:true},headOpen:false,usedBag:'fitted',newBag:'shelf',selected:null,fill:80,complete:false};
 if(kind==='terminals')return {kind,phase:'isolate',isolated:false,checks:[],activeCheck:null,complete:false};
 throw new RangeError('Unknown maintenance practice');
}
function result(state,message){return {state,message};}
export function reducePractice(previous,action){
 const out=applyPractice(previous,action);
 const blocked=Boolean(out.message)&&!previous.complete&&!['select','reset'].includes(action.type)&&JSON.stringify(out.state)===JSON.stringify(previous);
 return {...out,blocked};
}
function applyPractice(previous,action){
 if(action.type==='reset')return result(initialPractice(previous.kind),'Practice reset. Start with the first step.');
 const s={...previous};
 if(['filter','wet-filter'].includes(s.kind))return reduceFilterCare(previous,action);
 if(s.kind==='bag'){
  if(action.type==='select'){
   if(!['used','new'].includes(action.item))throw new RangeError('Unknown bag');
   if(action.item==='used'&&s.usedBag==='disposed')return result(s,'The used bag is already in the bin.');
   if(action.item==='new'&&s.newBag==='fitted')return result(s,'The clean bag is already fitted.');
   s.selected=action.item;
   if(action.item==='new')return result(s,s.usedBag==='disposed'?'Clean bag selected. Place it in the open machine now.':'Clean bag selected. First remove, seal and dispose of the used bag, then fit this clean replacement.');
   if(s.usedBag==='sealed')return result(s,'Sealed used bag selected. Put it in the bin.');
   if(s.usedBag==='removed')return result(s,'Used bag selected. Seal its opening before putting it in the bin.');
   return result(s,s.headOpen?'Used bag selected. Lift it out, then seal its opening.':'Used bag selected. Isolate the machine and open the head before lifting it out.');
  }
  if(action.type==='transfer'&&!s.selected)return result(s,'Select a bag first, then choose the machine or bin.');
  if(action.type==='transfer')return reducePractice(s,{type:action.target==='bin'?'dispose':action.target==='machine'?'fit':'invalid-transfer',item:s.selected});
  if(s.complete)return result(s,'Bag replacement practice is complete. Reset to try again.');
  if(action.type==='unclip'||action.type==='secure'){
   if(!['left','right'].includes(action.clip))throw new RangeError('Unknown retaining clip');
   if(!s.isolated)return result(s,'Switch off and unplug before releasing the retaining clips.');
   if(action.type==='unclip'&&s.phase==='release'){
    s.clips={...s.clips,[action.clip]:false};if(!s.clips.left&&!s.clips.right)s.phase='open';
    return result(s,s.phase==='open'?'Both clips released. Hold the handle and lift the head onto the head-rest area.':'One clip released. Release the other clip before lifting.');
   }
   if(action.type==='secure'&&s.phase==='secure'){
    s.clips={...s.clips,[action.clip]:true};if(s.clips.left&&s.clips.right){s.phase='done';s.complete=true;}
    return result(s,s.complete?'Practice complete: used bag contained and binned, clean bag fitted, head closed and both clips secured. Power stays isolated.':'One clip secured. Secure the other to finish.');
   }
   return result(s,action.type==='secure'?'Fit the clean bag and return the head before securing the clips.':'Complete the current step before releasing clips.');
  }
  const expected={isolate:'isolate',open:'open',remove:'remove',seal:'seal',dispose:'dispose',fit:'fit',close:'close'};
  if(!Object.hasOwn(expected,action.type))throw new RangeError('Unsupported bag action');
  if(action.type!==s.phase){
   if(!s.isolated)return result(s,'Switch off and unplug the virtual machine before opening or changing the bag.');
   if(action.type==='fit'&&s.usedBag!=='disposed')return result(s,'Remove, seal and dispose of the used bag before fitting the clean bag.');
   if(action.type==='dispose'&&s.usedBag!=='sealed')return result(s,'Remove and seal the used bag before putting it in the bin.');
   return result(s,'Complete the highlighted step before continuing.');
  }
  if(action.type==='isolate'){s.isolated=true;s.phase='release';return result(s,'Virtual power isolated. Release the two retaining clips on the machine.');}
  if(action.type==='open'){s.headOpen=true;s.phase='remove';return result(s,'Head open. The training bag is 80% full, above this scenario’s 70% trigger.');}
  if(action.type==='remove'){s.usedBag='removed';s.selected='used';s.phase='seal';return result(s,'Used bag lifted out. Seal its opening to help contain dust.');}
  if(action.type==='seal'){s.usedBag='sealed';s.phase='dispose';return result(s,'Used bag sealed. Carry it to the bin.');}
  if(action.type==='dispose'){
   if(action.item&&action.item!=='used')return result(s,'The bin is for the sealed used bag. Keep the clean bag for the machine.');
   s.usedBag='disposed';s.selected=null;s.phase='fit';return result(s,'Used bag is in the bin. Take the clean bag from the shelf and place it in the machine.');
  }
  if(action.type==='fit'){
   if(action.item&&action.item!=='new')return result(s,'Fit the clean replacement bag, not the used bag.');
   s.newBag='fitted';s.fill=0;s.selected=null;s.phase='close';return result(s,'Clean bag fitted in the teaching model. Close and secure the head.');
  }
  s.headOpen=false;s.phase='secure';return result(s,'Head returned to the tank. Secure both retaining clips to finish the practice.');
 }
 if(s.kind==='terminals'){
  if(s.complete)return result(s,'Fault recognition practice is complete. Reset to try again.');
  if(action.type==='isolate'){s.isolated=true;s.phase='inspect';return result(s,'Virtual machine switched off and unplugged. Inspect the three marked external connector areas.');}
  if(!s.isolated)return result(s,'Switch off and unplug the virtual equipment before inspecting it.');
  if(action.type==='inspect'){
   if(!['pins','cable','heat'].includes(action.area))throw new RangeError('Unknown inspection area');
   s.checks=[...new Set([...s.checks,action.area])];s.activeCheck=action.area;if(s.checks.length===3)s.phase='decide';
   const findings={pins:'Pins and casing: look for visible damage or distortion. This view cannot establish terminal tightness or electrical safety.',cable:'Cable entry: the outer sheath should be secure with no internal conductors exposed. Internal terminal checks require an authorised competent person.',heat:'Heat marks: the dark staining shown is a warning sign. Remove the equipment from use and report it for competent assessment.'};return result(s,findings[action.area]);
  }
  if(action.type==='decide'){
   if(s.checks.length<3)return result(s,'Inspect all three highlighted areas before choosing the outcome.');
   if(action.choice!=='report')return result(s,'A heat mark is shown. Do not treat this as a clear inspection: remove the equipment from use and report the concern.');
   s.phase='done';s.complete=true;return result(s,'Correct response: keep the equipment out of use and report the visible heat damage. No repair or safety certification is performed here.');
  }
  throw new RangeError('Unsupported inspection action');
 }
 throw new RangeError('Unknown practice state');
}
