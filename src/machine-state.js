export function initialState(variant='junior-103'){return {variant,pickupMode:variant==='junior-429'?'wet':'dry',floorMode:'hard',part:'overview',open:0,connected:false,running:false,xray:false,air:false,callouts:true,condition:'clear',stroke:false};}
// Positive pixels reveal parts; wheel-up and outward pinch map to this direction.
export function openingFromPixels(open,pixels){
 if(!Number.isFinite(open)||open<0||open>100||!Number.isFinite(pixels))throw new RangeError('Invalid reveal gesture');
 return Math.max(0,Math.min(100,open+pixels*.12));
}
export function transition(state,action){
 const next={...state};let message='';
 switch(action.type){
 case 'plug':
  if(state.open>0){message='Assemble the machine before connecting the plug.';break;}
  next.connected=!state.connected;next.running=false;message=next.connected?'Plug connected. The motor is still off.':'Switched off and unplugged.';break;
 case 'power':
  if(!state.connected||state.open>0){message='Assemble the machine and connect the plug before switching on.';break;}
  next.running=!state.running;message=next.running?'Motor and fan running. Use See inside to view their motion.':'Motor switched off. The plug is still connected.';break;
 case 'open':
  if(!Number.isFinite(action.value)||action.value<0||action.value>100)throw new RangeError('Opening must be between 0 and 100');
  if(action.value===state.open)break;
  next.open=action.value;
  if(next.open>0){next.running=false;next.connected=false;message='Model isolated: switched off and unplugged for the exploded view.';}
  else message='Machine assembled. Connect the plug to try operation.';break;
 case 'floor':
  if(!['hard','soft'].includes(action.value))throw new RangeError('Unknown floor mode');
  next.floorMode=action.value;message=action.value==='hard'?'Hard-floor setting: bristles extended.':'Soft-floor setting: bristles retracted.';break;
 case 'pickup':
  if(state.variant!=='junior-429'||!['wet','dry'].includes(action.value))throw new RangeError('Unsupported pickup mode');
  next.pickupMode=action.value;next.running=false;next.connected=false;next.stroke=false;message='Virtual machine isolated for a configuration change. Confirm the correct fitted media and wet/dry setup in the exact manual.';break;
 case 'reset':return {state:initialState(state.variant),message:'View reset. Machine assembled, switched off and unplugged.'};
 default:throw new RangeError('Unsupported machine action');
 }
 return {state:next,message};
}
