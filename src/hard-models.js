import {getHardModule} from './hard-content.js';

export function initialHardState(id){const module=getHardModule(id);return {id,part:'overview',open:0,xray:false,labels:true,connected:false,running:false,inputs:Object.fromEntries(module.inputs.map(p=>[p.key,p.value])),testPhase:'idle',residualV:0};}
const metric=(label,value,unit='',note='')=>({label,value,unit,note});
export function calculateHard(state){
 const module=getHardModule(state.id),i=state.inputs;
 if(['single','three'].includes(module.kind)){
  const synchronous=120*i.frequency/i.poles,slip=i.slip/100,speed=synchronous*(1-slip),rotorFrequency=slip*i.frequency;
  const canRun=module.kind==='single'?i.startCircuit==='healthy':i.supply==='healthy';
  const blocked=module.kind==='single'?'The start branch is open: this ideal motor cannot self-start from rest. A selected steady-state speed does not solve a starting fault.':'The virtual phase-loss protection has tripped. A real unprotected motor can behave differently; no fault current or coast-down is predicted.';
  const explanation=canRun?`At ${i.frequency} Hz and ${i.poles} poles the field turns at ${synchronous.toFixed(0)} rpm. The selected ${i.slip}% slip leaves the rotor ${ (synchronous-speed).toFixed(0)} rpm behind the field, sustaining induction. ${module.kind==='three'?'Rotor copper loss rises as a fraction of the assumed air-gap power when slip rises. Converted power excludes mechanical losses.':'The start branch establishes a preferred starting direction. This calculation describes the forward field after starting, not the full single-phase torque characteristic.'}`:blocked;
  const copper=module.kind==='three'?slip*i.airgap:null,converted=module.kind==='three'?(1-slip)*i.airgap:null;
  return {canRun,synchronous,speed:canRun?speed:0,rotorFrequency,copper,converted,direction:i.sequence==='ACB'?-1:1,display:canRun?`${speed.toFixed(0)} rpm`:'INHIBIT',explanation,metrics:[metric('Synchronous field',synchronous,'rpm'),metric('Selected steady rotor',canRun?speed:null,'rpm'),metric('Forward rotor frequency',canRun?rotorFrequency:null,'Hz'),...(module.kind==='three'?[metric('Rotor copper loss',canRun?copper:null,'W'),metric('Converted mechanical',canRun?converted:null,'W','Before mechanical losses')]:[])]};
 }
 if(module.kind==='alternator'){
  const frequency=4*i.speed/120,emfPU=i.speed/1500*i.flux;
  return {canRun:true,speed:i.speed,frequency,emfPU,display:`${frequency.toFixed(1)} Hz`,explanation:`Four poles at ${i.speed} rpm give ${frequency.toFixed(1)} Hz. With assumed flux ${i.flux.toFixed(2)} pu, open-circuit EMF is ${emfPU.toFixed(2)} pu relative to the arbitrary 1500 rpm / 1 pu flux reference. Excitation affects EMF; shaft speed sets frequency. No active AVR or loaded terminal-voltage model is included.`,metrics:[metric('Generated frequency',frequency,'Hz'),metric('Open-circuit EMF',emfPU,'pu','Relative to the teaching reference'),metric('Assumed shaft speed',i.speed,'rpm')]};
 }
 if(module.kind==='megger'){
  const leakage=i.testVoltage/i.resistance,canRun=i.isolated;
  return {canRun,leakage,display:state.testPhase==='discharging'?`${state.residualV.toFixed(1)} V`:state.running?`${i.resistance} MΩ`:'OFF',explanation:`The ideal steady leakage at ${i.testVoltage} V across ${i.resistance} MΩ is ${leakage.toFixed(2)} µA. Reducing resistance increases current. This is a calculated resistor example, not a measured insulation result or universal pass/fail threshold. ${!i.isolated?'The virtual test is inhibited until the item is isolated.':state.testPhase==='discharging'?'The separate illustrative RC path is removing stored charge; keep virtual leads connected.':'End a virtual test to observe the separate RC discharge model.'}`,metrics:[metric('Assumed insulation',i.resistance,'MΩ'),metric('Calculated steady leakage',leakage,'µA'),metric('Illustrative stored voltage',state.residualV,'V'),metric('Discharge time constant',1,'s','Authored 1 MΩ × 1 µF example')]};
 }
 if(module.kind==='multimeter'){
  const validJack=i.function==='A'?i.jack==='A':i.jack==='VΩ',validCircuit=i.function!=='Ω'||i.isolated,canRun=validJack&&validCircuit;
  const value=i.function==='V'?(i.isolated?0:i.sourceVoltage):i.function==='A'?(i.isolated?0:1000*i.sourceVoltage/i.loadResistance):i.loadResistance,unit=i.function==='A'?'mA':i.function==='V'?'V':'Ω';
  const issue=!validJack?'Input jack and selected function disagree. Move the virtual red lead to the correct input before measuring.':!validCircuit?'Resistance mode requires an isolated circuit. The model withholds the reading while the external source is on.':null;
  return {canRun,value:canRun?value:null,unit,display:issue?'CHECK':state.running?`${value.toFixed(i.function==='A'?1:0)} ${unit}`:'OFF',explanation:issue||`${i.function==='V'?'The voltmeter is connected in parallel across the resistor.':i.function==='A'?'The current path is inserted in series through the A input.':'The external source is isolated and the meter uses its own ideal resistance-test function.'} ${i.isolated&&i.function!=='Ω'?'The source is off, so the ideal DC voltage/current is zero.':`Ohm’s law links the assumed ${i.sourceVoltage} V source and ${i.loadResistance} Ω load.`} Real input impedance, burden voltage, accuracy and circuit safety are outside this example.`,metrics:[metric('Ideal meter reading',canRun?value:null,unit),metric('External DC source',i.isolated?0:i.sourceVoltage,'V'),metric('Assumed load',i.loadResistance,'Ω')]};
 }
 const hours=[120,70,95],available=[0,1,2].filter(n=>n+1!==i.unavailable);if(i.strategy==='hours')available.sort((a,b)=>hours[a]-hours[b]);
 const requested=i.flowProved?available.slice(0,Math.ceil(i.demand/40)):[],capacity=requested.length*40,delivered=Math.min(i.demand,capacity),unmet=i.demand-delivered,massFlow=delivered/(4.18*i.deltaT);
 return {canRun:i.flowProved,requested,available,capacity,delivered,unmet,massFlow,modulation:capacity?delivered/capacity:0,display:`${requested.length} / 3`,explanation:!i.flowProved?'Flow proof is absent. The teaching controller inhibits all heat-source requests; unmet demand is shown. Do not bypass a real flow interlock.':`${i.demand} kW demand requests ${requested.length} available stage${requested.length===1?'':'s'}${requested.length?` in order ${requested.map(n=>n+1).join(' → ')}`:''}. ${i.strategy==='hours'?'Example run-hours are 120, 70 and 95 h, so the least-used available unit leads.':'The available units follow a fixed numerical order.'} ${unmet>0?`${unmet.toFixed(0)} kW remains unmet: changing order cannot create capacity.`:`The ideal enabled stages modulate together to serve ${delivered.toFixed(0)} kW.`} The calculated water mass flow assumes ΔT = ${i.deltaT} K; it does not select a pump.`,metrics:[metric('Requested stages',requested.length,'of 3'),metric('Thermal duty served',delivered,'kW'),metric('Unmet demand',unmet,'kW'),metric('Calculated water mass flow',massFlow,'kg/s'),metric('Assumed stage utilisation',capacity?delivered/capacity*100:0,'%')]};
}
export function reduceHard(previous,action){
 const module=getHardModule(previous.id),s={...previous,inputs:{...previous.inputs}},result=message=>({state:s,message});
 if(action.type==='reset')return {state:initialHardState(s.id),message:'Example reset to its documented initial conditions.'};
 if(action.type==='input'){
  const spec=module.inputs.find(p=>p.key===action.key);if(!spec)throw new RangeError('Unknown input');
  const value=action.value;if(spec.type==='checkbox'){if(typeof value!=='boolean')throw new RangeError('Invalid checkbox value');}
  else if(spec.type==='select'){if(!spec.options.some(([v])=>v===value))throw new RangeError('Unsupported selection');}
  else if(!Number.isFinite(value)||value<spec.min||value>spec.max||Math.abs((value-spec.min)/spec.step-Math.round((value-spec.min)/spec.step))>1e-6)throw new RangeError('Input outside the documented range or step');
  if(s.testPhase!=='idle')return result('End the virtual test and wait for the illustrated discharge before changing its parameters.');
  s.inputs[action.key]=value;if(s.running&&!calculateHard(s).canRun)s.running=false;
  return result('Teaching input changed. Read the cause and effect below.');
 }
 if(action.type==='select'){if(action.id!=='overview'&&!module.parts.some(p=>p.id===action.id))throw new RangeError('Unknown equipment part');s.part=action.id;return result('');}
 if(action.type==='tick'){
  if(!Number.isFinite(action.dt)||action.dt<0||action.dt>1)throw new RangeError('Invalid simulation interval');
  if(s.testPhase==='discharging'){s.residualV*=Math.exp(-action.dt);if(s.residualV<.1){s.residualV=0;s.testPhase='idle';return result('Illustrative discharge finished. This display threshold is not a real safety criterion.');}}
  return result('');
 }
 if(action.type==='open'){
  if(!Number.isFinite(action.value)||action.value<0||action.value>100)throw new RangeError('Invalid opening');
  if(s.residualV>0)return result('End testing and wait for the illustrative stored voltage to reach zero before revealing this teaching model.');
  s.open=action.value;if(s.open>0){s.connected=false;s.running=false;}return result(s.open>0?'Virtual supply isolated. Exploded geometry teaches assemblies; it is not a real disassembly procedure.':'Model assembled. Connect the virtual supply or leads before running.');
 }
 if(action.type==='xray'||action.type==='labels'){s[action.type]=!s[action.type];return result('');}
 if(action.type==='connect'){
  if(s.open>0)return result('Assemble the model before connecting the virtual supply or test leads.');
  if(s.residualV>0)return result('Keep the virtual leads connected until the illustrative discharge finishes.');
  s.connected=!s.connected;if(!s.connected)s.running=false;return result(s.connected?'Virtual connection made. The demonstration is still off.':'Virtual supply or leads disconnected.');
 }
 if(action.type==='isolate'){
  s.running=false;if(s.residualV>0){s.testPhase='discharging';return result('Virtual test ended. Keep the leads connected during the illustrative discharge.');}s.connected=false;return result('Virtual energy source isolated. Real isolation requires the correct authorised procedure.');
 }
 if(action.type==='run'){
  if(s.running){s.running=false;if(module.kind==='megger')s.testPhase='discharging';return result(module.kind==='megger'?'Test ended. Illustrative RC discharge started.':'Demonstration stopped.');}
  if(s.testPhase==='discharging')return result('The illustrated discharge is still in progress.');
  if(!s.connected||s.open>0)return result('Assemble and connect the virtual model first.');
  const model=calculateHard(s);if(!model.canRun)return result(model.explanation);
  s.running=true;if(module.kind==='megger'){s.testPhase='testing';s.residualV=s.inputs.testVoltage;}
  return result(module.kind==='megger'?'Virtual test active. End the test to observe the separate illustrative discharge.':module.kind==='multimeter'?'Virtual DC measurement active. Trace the circuit and compare the function, jack and reading.':module.kind==='cascade'?'Steady staging illustration running. Only requested, available units animate.':'Shaft rotation is slowed for understanding; the animation is not a speed measurement.');
 }
 throw new RangeError('Unknown equipment action');
}

export function initialInspection(){return {phase:'lesson',step:0,reviewed:false,playing:false,isolated:false,checked:[],complete:false};}
export function reduceInspection(previous,action,module){
 const s={...previous,checked:[...previous.checked]},end=module.checks.length+1,result=message=>({state:s,message});
 if(action.type==='play'){if(s.step>=end&&s.reviewed)s.step=0;s.phase='lesson';s.playing=!s.playing;return result('');}
 if(action.type==='step'){
  if(![-1,1].includes(action.direction))throw new RangeError('Invalid lesson direction');s.playing=false;
  if(action.direction===1&&s.step===end){s.reviewed=true;return result('Lesson reviewed. Now practise the observations yourself.');}
  s.step=Math.max(0,Math.min(end,s.step+action.direction));return result('');
 }
 if(action.type==='practice'){
  if(!s.reviewed)return result('Review the animated lesson before starting practice.');
  return {state:{...s,phase:'practice',playing:false,isolated:false,checked:[],complete:false},message:'Your turn. Isolate the virtual model, then identify each highlighted inspection area.'};
 }
 if(action.type==='lesson'){s.phase='lesson';s.playing=false;return result('');}
 if(action.type==='isolate'&&s.phase==='practice'){s.isolated=true;return result('Virtual isolation recorded. Identify the first highlighted part.');}
 if(action.type==='check'&&s.phase==='practice'){
  if(!s.isolated)return result('Isolate the virtual equipment before recording observations.');
  const expected=module.checks[s.checked.length];if(!expected)return result('All areas reviewed. Choose the response to the observed concern.');
  if(action.id!==expected.part)return result(`Next, identify ${module.parts.find(p=>p.id===expected.part).name}. Follow the highlighted checklist order.`);
  s.checked.push(action.id);return result(expected.finding||`${expected.title} recorded. ${expected.body}`);
 }
 if(action.type==='report'&&s.phase==='practice'){
  if(s.checked.length!==module.checks.length)return result('Observe all highlighted areas first.');
  if(action.choice!=='report')return result('A visible concern was shown. Do not clear the equipment; remove it from use and report it for competent assessment.');
  s.complete=true;return result('Inspection sequence practised and concern reported. This is not a maintenance certificate.');
 }
 return result('Review the lesson before practising.');
}
