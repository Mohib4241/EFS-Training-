export function initialScrubber(){return {part:'overview',open:0,xray:false,labels:true,connected:false,running:false,inputs:{brush:true,suction:true,solution:true}};}
export function reduceScrubber(previous,action){
 const s={...previous,inputs:{...previous.inputs}},out=(message='',blocked=false)=>({state:s,message,blocked});
 if(action.type==='reset')return {state:initialScrubber(),message:'Reset. Virtual battery isolated and machine stopped.'};
 if(action.type==='isolate'){s.running=false;s.connected=false;return out('Virtual energy isolated. Real battery isolation follows the exact authorised procedure.');}
 if(action.type==='select'){s.part=action.id;return out();}
 if(action.type==='open'){
  if(!Number.isFinite(action.value)||action.value<0||action.value>100)throw new RangeError('Invalid reveal');s.open=action.value;if(s.open>0){s.running=false;s.connected=false;}return out(s.open?'Virtual machine isolated for the schematic reveal.':'Machine assembled.');
 }
 if(['xray','labels'].includes(action.type)){s[action.type]=!s[action.type];return out();}
 if(action.type==='input'){
  if(!Object.hasOwn(s.inputs,action.key)||typeof action.value!=='boolean')throw new RangeError('Invalid scrubber function');s.inputs[action.key]=action.value;return out('Brush, solution and suction are separate functions. Compare their visible roles.');
 }
 if(action.type==='connect'){
  if(s.open>0)return out('Assemble the model before enabling virtual battery power.',true);s.connected=!s.connected;s.running=false;return out(s.connected?'Virtual battery enabled. The machine remains stopped.':'Virtual battery isolated.');
 }
 if(action.type==='run'){
  if(!s.connected||s.open>0)return out('Assemble the machine and enable virtual battery power first.',true);s.running=!s.running;return out(s.running?'Demonstration running. The brush, solution and suction follow your function selections.':'Demonstration stopped.');
 }
 throw new RangeError('Unknown scrubber action');
}
export function scrubberResult(state){
 return {speed:150,direction:1,delivered:1,requested:Object.entries(state.inputs).filter(([,on])=>on).map(([key])=>key),explanation:!state.running?'Enable virtual battery power, then run the parked demonstration.':!state.inputs.suction?'Suction is off: brush agitation alone does not recover the dirty liquid.':!state.inputs.brush?'Brush is off: the recovery path can work, but mechanical agitation is absent.':!state.inputs.solution?'Solution is off: no cleaning liquid is being fed in this illustration.':'Solution reaches the brush; the brush agitates soil; the rear squeegee and suction recover dirty liquid into a separate tank. No measured cleaning result is predicted.'};
}
