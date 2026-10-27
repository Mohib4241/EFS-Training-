export const FILTER_CARE_INTERVAL={label:'Weekly',days:7,source:'User-provided site training schedule; not an OEM interval'};
export const FILTER_ZONES={rest:{x:675,y:55,width:310,height:175},tray:{x:190,y:330,width:150,height:220},sink:{x:20,y:315,width:165,height:235},rack:{x:35,y:55,width:165,height:190},machine:{x:350,y:300,width:300,height:235},head:{x:340,y:215,width:325,height:110}};
const steps=[['isolate','Switch off & unplug','Switch off aur unplug karo'],['release','Release both clips','Dono clips kholo'],['open','Lift head to its rest','Head ko rest par rakho'],['remove','Lift the filter to the tray','Filter ko tray par nikalo'],['inspect','Check media & washability','Media aur washability check karo'],['wash','Turn on water & rinse filter','Water on karke filter rinse karo'],['drain','Tap off, move to drying rack','Tap band karke drying rack par rakho'],['dry','Air-drying preview','Air-drying preview dekho'],['check-dry','Confirm completely dry','Puri tarah dry confirm karo'],['fit','Refit the same clean filter','Wahi clean filter wapas lagao'],['close','Return the head','Head wapas rakho'],['secure','Secure both clips','Dono clips lock karo']];
export function filterCareSteps(language='english'){return steps.map(([id,en,hi])=>[id,language==='hinglish'?hi:en]);}
export function initialFilterCare(kind){if(!['filter','wet-filter'].includes(kind))throw new RangeError('Unknown filter task');return {kind,phase:'isolate',isolated:false,clips:{left:true,right:true},headOpen:false,filter:'tank',washableConfirmed:false,waterOn:false,rinsed:false,wet:false,dryingPreview:false,dryConfirmed:false,complete:false};}
export function reduceFilterCare(previous,action){
 const s={...previous},out=message=>({state:s,message});
 if(s.complete)return out('Weekly filter-care sequence practised. The machine remains isolated.');
 const expected={isolate:'isolate',unclip:'release',open:'open',remove:'remove',inspect:'inspect',wash:'wash',rack:'drain',dry:'dry','confirm-dry':'check-dry',fit:'fit',close:'close',secure:'secure'};
 if(action.type==='tap'){
  if(!['wash','drain'].includes(s.phase))return out('Complete the previous step: remove and inspect the filter before using water.');
  if(s.phase==='drain'&&!s.waterOn)return out('Water is already off. Move the rinsed filter to the drying rack.');
  s.waterOn=!s.waterOn;return out(s.waterOn?'Clean water on. Hold the approved washable filter and move it under the stream.':'Water off. Move the rinsed filter to the drying rack.');
 }
 if(!Object.hasOwn(expected,action.type))throw new RangeError('Unsupported filter-care action');
 if(s.phase!==expected[action.type])return out('Complete the previous step first. Follow the highlighted filter-care action.');
 if(action.type==='isolate'){s.isolated=true;s.phase='release';return out('Power isolated. Release both retaining clips. Keep water away from the motor head.');}
 if(action.type==='unclip'||action.type==='secure'){
  if(!['left','right'].includes(action.clip))throw new RangeError('Unknown retaining clip');
  if(!s.isolated||action.type==='secure'&&(s.headOpen||s.wet||s.filter!=='tank'))return out('Complete refitting and closing with a dry filter before securing the clips.');
  s.clips={...s.clips,[action.clip]:action.type==='secure'};
  if(action.type==='unclip'&&!s.clips.left&&!s.clips.right)s.phase='open';
  if(action.type==='secure'&&s.clips.left&&s.clips.right){s.phase='done';s.complete=true;}
  return out(s.complete?'Weekly filter care practised: the same removable washable filter was rinsed, air-drying checked, refitted and secured. Power stays isolated.':s.phase==='open'?'Both clips released. Lift the head to its rest.':'Complete both retaining clips.');
 }
 if(action.type==='open'){s.headOpen=true;s.phase='remove';return out('Head parked. Hold the filter rim and lift the filter to its inspection tray.');}
 if(action.type==='remove'){s.filter='tray';s.phase='inspect';return out('The reusable filter is on the tray. This task does not remove or replace a dust bag.');}
 if(action.type==='inspect'){
  if(action.choice!=='washable')return out('Do not water-wash paper media or an unconfirmed filter. Check the exact fitted filter and approved care method first.');
  s.washableConfirmed=true;s.phase='wash';return out('Washable media confirmed for this site-training scenario. Turn on clean water, then move only the removable filter under the stream.');
 }
 if(action.type==='wash'){
  if(!s.washableConfirmed||!s.waterOn)return out('Complete the previous step: confirm washable media and turn on clean water before rinsing.');
  s.filter='sink';s.rinsed=true;s.wet=true;s.phase='drain';return out('Filter rinsed in the illustration. Turn off the tap before moving it to the drying rack. The motor head stays dry.');
 }
 if(action.type==='rack'){
  if(s.waterOn)return out('Complete the previous step: turn the tap off before moving the filter to the rack.');
  s.filter='rack';s.phase='dry';return out('Filter on the air-drying rack. Drying time depends on the real filter and conditions; this animation does not predict it.');
 }
 if(action.type==='dry'){s.dryingPreview=true;s.phase='check-dry';return out('Air-drying preview shown. Before real refitting, the approved filter must be completely dry. Check that condition now in the training scenario.');}
 if(action.type==='confirm-dry'){
  if(action.choice!=='dry')return out('Do not refit a wet filter. Allow it to air dry fully and check its condition before fitting.');
  s.wet=false;s.dryConfirmed=true;s.phase='fit';return out('Completely dry condition confirmed in this virtual exercise. Hold this same clean filter and refit it in the tank.');
 }
 if(action.type==='fit'){
  if(s.wet||!s.dryConfirmed||s.filter!=='rack'||s.waterOn)return out('Refitting is blocked until the rinsed filter is completely dry and the tap is off.');
  s.filter='tank';s.phase='close';return out('The same clean, dry filter is seated again. Check the rim seal, then return the head.');
 }
 if(action.type==='close'){s.headOpen=false;s.phase='secure';return out('Head seated. Secure both clips. Use the correct approved setup for the intended wet or dry mode.');}
}
export function filterObjectPose(state,id){
 if(id==='head')return {x:state.headOpen?680:350,y:state.headOpen?105:240,width:300,height:90,scale:1};
 if(id!=='filter')throw new RangeError('Unknown filter-care object');
 const [x,y]=({tank:[430,320],tray:[205,350],sink:[45,350],rack:[55,75]})[state.filter]||[];if(x===undefined)throw new RangeError('Unknown filter position');return {x,y,width:125,height:155,scale:1};
}
export function filterDropAction(state,id,point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new RangeError('Invalid filter drop');
 const inside=zone=>point.x>=zone.x&&point.x<=zone.x+zone.width&&point.y>=zone.y&&point.y<=zone.y+zone.height;
 if(id==='head'&&state.phase==='open'&&inside(FILTER_ZONES.rest))return {type:'open'};
 if(id==='head'&&state.phase==='close'&&inside(FILTER_ZONES.head))return {type:'close'};
 if(id==='filter'&&state.phase==='remove'&&inside(FILTER_ZONES.tray))return {type:'remove'};
 if(id==='filter'&&state.phase==='wash'&&inside(FILTER_ZONES.sink))return {type:'wash'};
 if(id==='filter'&&state.phase==='drain'&&inside(FILTER_ZONES.rack))return {type:'rack'};
 if(id==='filter'&&state.phase==='fit'&&inside(FILTER_ZONES.machine))return {type:'fit'};
 return null;
}
const copy={
 isolate:[['Isolate before filter care.','Switch off and unplug. Keep the motor head away from the washing area.'],['Filter care se pehle isolate karo.','Switch off aur unplug karo. Motor head ko washing area se door rakho.']],
 release:[['Release both clips.','Both retaining clips must be released before lifting the head.'],['Dono clips kholo.','Head uthane se pehle dono retaining clips release karo.']],
 open:[['Park the head on its rest.','Hold the handle and move the head to the top-right rest.'],['Head ko rest par rakho.','Handle hold karke head ko top-right rest par rakho.']],
 remove:[['Lift the filter to the tray.','Remove the reusable filter by its rim. The dust bag is a separate task.'],['Filter tray par nikalo.','Rim hold karke reusable filter nikalo. Dust bag ka task alag hai.']],
 inspect:[['Check the filter before water.','Inspect media, rim and seal. Continue only with a verified washable filter; paper and unsuitable media must not be rinsed.'],['Water se pehle filter check karo.','Media, rim aur seal inspect karo. Sirf verified washable filter rinse karo; paper filter ko water se mat dhona.']],
 wash:[['Turn water on and rinse.','Use the tap control, then hold this filter and move it under the clean-water stream.'],['Water on karke rinse karo.','Tap control use karo, phir isi filter ko hold karke clean-water stream ke neeche le jao.']],
 drain:[['Tap off, then move to the rack.','Turn off the tap and move the rinsed filter to the top-left drying rack.'],['Tap band, phir rack par rakho.','Tap band karo aur rinsed filter ko top-left drying rack par le jao.']],
 dry:[['Air dry before refitting.','Play the drying preview. Real drying has no fixed duration in this lesson.'],['Refit se pehle air dry karo.','Drying preview dekho. Real filter ka drying time is lesson mein fix nahi hai.']],
 'check-dry':[['Check: completely dry?','Damp media can restrict airflow and allow moisture toward the motor. Confirm the completely dry training condition before refitting.'],['Check karo: puri tarah dry?','Damp media se airflow restrict ho sakta hai aur moisture motor tak pahunch sakti hai. Refit se pehle completely dry condition confirm karo.']],
 fit:[['Refit this same clean filter.','Hold it on the drying rack and seat it in the tank, without trapping the seal.'],['Wahi clean filter wapas lagao.','Drying rack se isi filter ko hold karke tank mein seat karo. Seal ko trap mat karo.']],
 close:[['Return the head.','Move the parked head back onto the tank.'],['Head wapas rakho.','Parked head ko tank par wapas le aao.']],
 secure:[['Secure both clips.','Lock both clips. The virtual machine stays isolated.'],['Dono clips lock karo.','Dono retaining clips lock karo. Virtual machine isolated rahegi.']],
 done:[['Weekly filter wash practised.','The same washable filter was removed, rinsed, air-drying checked and refitted. Weekly is your site training schedule.'],['Weekly filter wash practise ho gaya.','Wahi washable filter nikala, rinse kiya, dryness check ki aur wapas lagaya. Weekly aapka site training schedule hai.']]
};
export function filterInstruction(state,language='english'){return copy[state.phase]?.[language==='hinglish'?1:0]||['Filter care','Follow the highlighted action.'];}
