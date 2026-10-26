export function initialState(){return {part:'overview',open:0,connected:false,running:false,xray:false,air:false,callouts:true,condition:'clear',stroke:false};}
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
 case 'reset':return {state:initialState(),message:'View reset. Machine assembled, switched off and unplugged.'};
 default:throw new RangeError('Unsupported machine action');
 }
 return {state:next,message};
}
