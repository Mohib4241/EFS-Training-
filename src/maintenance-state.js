export const SCRUB_DURATION_MS=20_000;
export const HAND_AREAS=['palms','backs','fingers','nails'];
export function initialPractice(kind){
 if(['filter','wet-filter'].includes(kind))return {...initialPractice('bag'),kind,fill:0,inspected:false,selectedFilter:false};
 if(kind==='bag')return {kind,phase:'isolate',isolated:false,clips:{left:true,right:true},headOpen:false,usedBag:'fitted',newBag:'shelf',selected:null,fill:80,complete:false};
 if(kind==='hands')return {kind,phase:'water',tapOn:false,wet:false,soap:false,surfaces:[],rubElapsedMs:0,rubBaseMs:0,rubStartedAt:null,towel:false,dried:false,complete:false};
 if(kind==='terminals')return {kind,phase:'isolate',isolated:false,checks:[],activeCheck:null,complete:false};
 throw new RangeError('Unknown maintenance practice');
}
function result(state,message){return {state,message};}
function timeOf(action){if(!Number.isFinite(action.now)||action.now<0)throw new RangeError('A monotonic timestamp is required');return action.now;}
function elapsed(state,now){return Math.min(SCRUB_DURATION_MS,state.rubBaseMs+(state.rubStartedAt===null?0:Math.max(0,now-state.rubStartedAt)));}
function advanceScrub(state){if(state.rubElapsedMs>=SCRUB_DURATION_MS&&HAND_AREAS.every(id=>state.surfaces.includes(id))){state.phase='rinse';state.rubStartedAt=null;state.rubBaseMs=SCRUB_DURATION_MS;return true;}return false;}
export function reducePractice(previous,action){
 const out=applyPractice(previous,action);
 const blocked=Boolean(out.message)&&!previous.complete&&!['tick','pause','select','reset'].includes(action.type)&&JSON.stringify(out.state)===JSON.stringify(previous);
 return {...out,blocked};
}
function applyPractice(previous,action){
 if(action.type==='reset')return result(initialPractice(previous.kind),'Practice reset. Start with the first step.');
 const s={...previous};
 if(['filter','wet-filter'].includes(s.kind)){
  const expected={isolate:'isolate',unclip:'release',open:'open',remove:'remove',inspect:'inspect',choose:'choose',fit:'fit',close:'close',secure:'secure'};
  if(!Object.hasOwn(expected,action.type))throw new RangeError('Unsupported filter action');
  if(s.complete)return result(s,'Filter practice complete. Power stays isolated. Reset to try again.');
  if(s.phase!==expected[action.type])return result(s,'Complete the previous step first. Follow the highlighted filter checklist before continuing.');
  if(action.type==='isolate'){s.isolated=true;s.phase='release';return result(s,'Power isolated. Release both clips before lifting the head.');}
  if(action.type==='unclip'||action.type==='secure'){
   if(!['left','right'].includes(action.clip))throw new RangeError('Unknown retaining clip');
   s.clips={...s.clips,[action.clip]:action.type==='secure'};
   if(action.type==='unclip'&&!s.clips.left&&!s.clips.right)s.phase='open';
   if(action.type==='secure'&&s.clips.left&&s.clips.right){s.phase='done';s.complete=true;}
   return result(s,s.complete?'Filter sequence practised: correct clean, dry media fitted for dry pickup; head and clips secured. Power stays isolated.':s.phase==='open'?'Both clips released. Lift the head to its rest.':'Complete both clip controls before continuing.');
  }
  if(action.type==='open'){s.headOpen=true;s.phase='remove';return result(s,'Head parked. Hold the filter by its rim and lift it onto the inspection tray.');}
  if(action.type==='remove'){s.usedBag='removed';s.phase='inspect';return result(s,'Filter removed. Inspect the media, rim and seal before choosing a replacement.');}
  if(action.type==='inspect'){s.inspected=true;s.phase='choose';return result(s,'The training filter is loaded with dust. Check for tears and seal damage too. Choose the correct clean, dry replacement; its care method and fitment must follow the exact manual.');}
  if(action.type==='choose'){
   if(action.choice!=='correct')return result(s,'Complete the filter selection correctly: use the matching clean, dry filter for dry pickup. A different shape or a wet medium is not an interchangeable replacement.');
   s.selectedFilter=true;s.phase='fit';return result(s,s.kind==='wet-filter'?'Caged dry filter selected for DRY pickup on the wet/dry unit. Do not fit dry media for liquid recovery.':'Textile basket filter selected. Hold the clean filter and seat it in the tank rim.');
  }
  if(action.type==='fit'){s.newBag='fitted';s.phase='close';return result(s,'Correct clean, dry filter seated in the teaching model. Return the head. No washing method or real spare-part compatibility is certified.');}
  if(action.type==='close'){s.headOpen=false;s.phase='secure';return result(s,'Head seated. Secure both clips.');}
 }
 if(s.kind==='bag'){
  if(action.type==='select'){
   if(!['used','new'].includes(action.item))throw new RangeError('Unknown bag');
   if(action.item==='used'&&s.usedBag==='disposed')return result(s,'The used bag is already in the bin.');
   if(action.item==='new'&&s.newBag==='fitted')return result(s,'The clean bag is already fitted.');
   s.selected=action.item;
   if(action.item==='new')return result(s,s.usedBag==='disposed'?'Clean bag selected. Place it in the open machine now.':'Clean bag selected. First remove, seal and dispose of the used bag, then fit this clean replacement.');
   if(s.usedBag==='sealed')return result(s,'Sealed used bag selected. Put it in the bottom-right bin.');
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
  if(action.type==='seal'){s.usedBag='sealed';s.phase='dispose';return result(s,'Used bag sealed. Drag it to the bin or use “Put used bag in bin”.');}
  if(action.type==='dispose'){
   if(action.item&&action.item!=='used')return result(s,'The bin is for the sealed used bag. Keep the clean bag for the machine.');
   s.usedBag='disposed';s.selected=null;s.phase='fit';return result(s,'Used bag is in the bin. Take the clean bag from the top left and place it in the machine.');
  }
  if(action.type==='fit'){
   if(action.item&&action.item!=='new')return result(s,'Fit the clean replacement bag, not the used bag.');
   s.newBag='fitted';s.fill=0;s.selected=null;s.phase='close';return result(s,'Clean bag fitted in the teaching model. Close and secure the head.');
  }
  s.headOpen=false;s.phase='secure';return result(s,'Head returned to the tank. Secure both retaining clips to finish the practice.');
 }
 if(s.kind==='hands'){
  if(action.type==='pause'){
   if(s.rubStartedAt!==null){s.rubElapsedMs=elapsed(s,timeOf(action));s.rubBaseMs=s.rubElapsedMs;s.rubStartedAt=null;advanceScrub(s);}
   return result(s,'Scrub timer paused. Resume when you return to the practice.');
  }
  if(s.complete)return result(s,'Handwashing practice is complete. Reset to try again.');
  if(action.type==='tap'){
   if(s.tapOn&&s.phase==='dry')return result(s,'Dry both hands with a clean paper towel before using the towel to turn off the tap.');
   if(s.tapOn&&s.phase==='tapoff'){
    if(!s.dried||!s.towel)return result(s,'Dry the hands with a clean paper towel first.');
    s.tapOn=false;s.phase='done';s.complete=true;return result(s,'Handwashing sequence practised: hands dried first, then the towel used to turn off the tap. This simulation cannot verify real hand hygiene.');
   }
   s.tapOn=!s.tapOn;if(s.phase==='water'&&s.tapOn)s.phase='wet';
   return result(s,s.tapOn?'Clean running water is on.':s.phase==='soap'?'Tap off. Apply soap to the wet hands.':'Tap off.');
  }
  if(action.type==='wet'){
   if(s.phase!=='wet'||!s.tapOn)return result(s,'Turn on the tap, then wet both hands under clean running water.');
   s.wet=true;s.phase='soap';return result(s,'Hands wet. Turn off the tap to save water, then apply soap.');
  }
  if(action.type==='soap'){
   if(s.phase!=='soap'||!s.wet)return result(s,'Wet the hands before applying soap.');
   if(s.tapOn)return result(s,'Turn off the tap before applying soap and scrubbing.');
   s.soap=true;s.phase='scrub';return result(s,'Soap applied. Cover every named area and run the scrub timer for at least 20 seconds.');
  }
  if(action.type==='surface'){
   if(s.phase!=='scrub')return result(s,'Wet the hands and apply soap before practising the scrub surfaces.');
   if(!HAND_AREAS.includes(action.area))throw new RangeError('Unknown hand surface');
   s.surfaces=[...new Set([...s.surfaces,action.area])];
   if(advanceScrub(s))return result(s,'All areas covered and at least 20 seconds elapsed. Turn the tap on and rinse well.');
   return result(s,s.rubElapsedMs>=SCRUB_DURATION_MS?'Time reached. Cover the remaining named hand areas before rinsing.':'Area practised. Continue scrubbing all areas for at least 20 seconds.');
  }
  if(action.type==='rub'){
   if(s.phase!=='scrub')return result(s,'Apply soap before starting the scrub timer.');
   if(s.rubStartedAt!==null)return result(s,'The scrub timer is already running.');
   if(s.rubElapsedMs>=SCRUB_DURATION_MS)return result(s,'Cover every named area before moving to the rinse step.');
   const now=timeOf(action);s.rubBaseMs=s.rubElapsedMs;s.rubStartedAt=now;return result(s,'Scrub timer running. Practise palms, backs, between fingers and fingertips/nails.');
  }
  if(action.type==='tick'){
   if(s.rubStartedAt===null)return result(s,'');
   s.rubElapsedMs=elapsed(s,timeOf(action));
   if(advanceScrub(s))return result(s,'At least 20 seconds elapsed and all areas covered. Turn the tap on, then rinse.');
   if(s.rubElapsedMs>=SCRUB_DURATION_MS){s.rubBaseMs=SCRUB_DURATION_MS;s.rubStartedAt=null;return result(s,'20 seconds reached. Practise every named hand area before rinsing.');}
   return result(s,'');
  }
  if(action.type==='rinse'){
   if(s.phase!=='rinse')return result(s,'Complete at least 20 seconds of scrubbing and cover every area before rinsing.');
   if(!s.tapOn)return result(s,'Turn on clean running water before rinsing.');
   s.soap=false;s.phase='dry';return result(s,'Soap rinsed away. Take a clean paper towel and dry both hands before using the towel to turn off the tap.');
  }
  if(action.type==='towel'){
   if(s.phase!=='dry')return result(s,'Complete scrubbing and rinsing before taking the drying towel.');
   s.towel=true;return result(s,'Clean paper towel ready. Dry both hands, then use the towel to turn off the tap.');
  }
  if(action.type==='dry'){
   if(s.phase!=='dry'||!s.towel)return result(s,'Rinse well, then take a clean towel to dry the hands.');
   s.wet=false;s.dried=true;s.phase='tapoff';return result(s,'Hands dried. Now use the towel as a barrier to turn off the tap; do not dry again with the tap-contact area.');
  }
  throw new RangeError('Unsupported handwashing action');
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

// Coordinates belong to the schematic game board, not the real machine.
export const BAG_ZONES={rest:{x:675,y:55,width:310,height:175},tray:{x:190,y:330,width:150,height:220},bin:{x:820,y:410,width:160,height:190},machine:{x:350,y:300,width:300,height:235},head:{x:340,y:215,width:325,height:110}};
export function bagObjectPose(state,id){
 if(id==='head')return {x:state.headOpen?680:350,y:state.headOpen?105:240,width:300,height:90,scale:1};
 if(id==='used'&&state.usedBag==='disposed')return {x:845,y:410,width:125,height:155,scale:.7};
 if(id==='used'){const removed=['removed','sealed'].includes(state.usedBag);return {x:removed?205:430,y:removed?350:320,width:125,height:155,scale:1};}
 if(id==='fresh')return {x:state.newBag==='fitted'?430:55,y:state.newBag==='fitted'?320:75,width:125,height:155,scale:1};
 throw new RangeError('Unknown bag-game object');
}
export function bagDropAction(state,id,point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new RangeError('Invalid drop position');
 const inside=zone=>point.x>=zone.x&&point.x<=zone.x+zone.width&&point.y>=zone.y&&point.y<=zone.y+zone.height;
 if(id==='head'&&state.phase==='open'&&inside(BAG_ZONES.rest))return {type:'open'};
 if(id==='head'&&state.phase==='close'&&inside(BAG_ZONES.head))return {type:'close'};
 if(id==='used'&&state.phase==='remove'&&inside(BAG_ZONES.tray))return {type:'remove'};
 if(id==='used'&&state.phase==='dispose'&&inside(BAG_ZONES.bin))return {type:'dispose',item:'used'};
 if(id==='fresh'&&state.phase==='fit'&&inside(BAG_ZONES.machine))return {type:'fit',item:'new'};
 return null;
}
