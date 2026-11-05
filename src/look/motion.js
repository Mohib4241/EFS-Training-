// Motion and quality policy shared by every renderer. Pure, so the feel of the machines is testable without a GPU.
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,x));

// A damped spring with a little weight: it eases in, overshoots slightly and settles. Never a linear tween.
export function createSpring({stiffness=90,damping=.7,value=0}={}){
 let x=value,v=0;const c=2*damping*Math.sqrt(stiffness);
 return {
  get value(){return x;},
  // Advance by dt seconds toward target (sub-stepped for stability). Returns true while still moving.
  step(dt,target,snap=false){
   if(snap){x=target;v=0;return false;}
   for(let left=Math.min(dt,.1);left>0;left-=1/120){const h=Math.min(left,1/120);v+=(stiffness*(target-x)-c*v)*h;x+=v*h;}
   if(Math.abs(x-target)<5e-4&&Math.abs(v)<5e-3){x=target;v=0;return false;}
   return true;
  },
  reset(next=0){x=next;v=0;}
 };
}

// The exact step response of a damped spring, as an easing curve for camera moves: p in [0,1] -> position, with a slight overshoot
// that settles. Used instead of a cubic ease so every move in the viewer shares the same weight.
const SPRING={zeta:.72,omega:11,span:.9};
export function springEase(p){
 if(p<=0)return 0;if(p>=1)return 1;
 const {zeta,omega,span}=SPRING,t=p*span,wd=omega*Math.sqrt(1-zeta*zeta),decay=Math.exp(-zeta*omega*t);
 return 1-decay*(Math.cos(wd*t)+zeta*omega/wd*Math.sin(wd*t));
}

// Starting a machine shows the flow path, and the machine stays closed to the eye: the outside is the default while it runs, and
// "Show inside" (the x-ray flag) is the learner's own choice. Stopping puts the flow path back as it was. Idempotent, so it can run
// on every repaint.
// Cleaning machines (the vacuums and the scrubber) pass seeInside: while they run the shell turns see-through, so the dust
// reaching the bag and the water reaching the tanks can be seen; stopping puts the shell back as it was.
export function runView(state,flowKey='flow',{seeInside=false}={}){
 if(state.running&&!state.runView)return {...state,runView:{flow:Boolean(state[flowKey]),...(seeInside?{xray:Boolean(state.xray)}:{})},[flowKey]:true,...(seeInside?{xray:true}:{})};
 if(!state.running&&state.runView)return {...state,[flowKey]:state.runView.flow,...('xray' in state.runView?{xray:state.runView.xray}:{}),runView:null};
 return state;
}

// The scrubber travels in a zigzag while it runs, like a floor pass. u in [0,1] goes along the path; the result is where the
// machine is (x, z in scene units) and how far it turns toward its direction of travel (yaw, radians, kept small).
export const ZIGZAG=[[-1,-1.3],[1,-.45],[-1,.4],[1,1.25]];
export function zigzagPose(u){
 const t=clamp(u)*(ZIGZAG.length-1),i=Math.min(ZIGZAG.length-2,Math.floor(t)),f=t-i,a=ZIGZAG[i],b=ZIGZAG[i+1];
 return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])*.35};
}
// Ping-pong a steadily rising phase so the machine goes along the path and back again.
export const pingPong=phase=>{const p=((phase%2)+2)%2;return p<1?p:2-p;};

// Smooths a stream of small steps that arrive unevenly (a hand's orbit, a few dozen times a second) into movement at the
// display's own rate: each frame hands out a share of what is still owed, and the last crumbs all at once, so nothing is lost.
export function createGlide(tau=.06){
 let x=0,y=0;
 return {
  push(dx,dy){x+=dx;y+=dy;},
  step(dt){
   if(x===0&&y===0)return null;
   const f=1-Math.exp(-Math.max(0,dt)/tau);let dx=x*f,dy=y*f;
   if(Math.abs(x-dx)<1e-5&&Math.abs(y-dy)<1e-5){dx=x;dy=y;}
   x-=dx;y-=dy;return [dx,dy];
  },
  get pending(){return x!==0||y!==0;},
  reset(){x=y=0;}
 };
}

// Heavier layers are slower to start and settle, so a teardown reads as weight rather than a slide.
export const LAYER_STIFFNESS=[120,92,70,54];
export const createLayerSprings=()=>LAYER_STIFFNESS.map(stiffness=>createSpring({stiffness,damping:.72}));

// Staged teardown: every part has a layer 0-3 and each layer separates in its own window of the slider.
// 0 shell and covers, 1 tanks, filters and sensors, 2 deep internals, 3 base-level and innermost parts.
export const LAYER_WINDOWS=[[0,.35],[.18,.7],[.4,1],[.55,1]];
export function waveFactor(layer,progress){
 const [from,to]=LAYER_WINDOWS[clamp(Math.round(layer),0,3)],t=clamp((progress-from)/(to-from));
 return t*t*(3-2*t);
}
export const STOPS=[{label:'Assembled',value:0},{label:'Head open',value:35},{label:'Inside',value:70},{label:'Exploded',value:100}];
export const stageName=open=>open<=0?'Assembled':open<40?'Head open':open<85?'Inside':'Exploded';
// Where the slider must be for a part of this layer to be clear of the shell.
export const revealOpening=layer=>layer<=0?0:layer===1?35:70;

// Quality ladder: when frames run long, drop the costliest effects first and never bring them back mid-visit.
export const QUALITY_ORDER=['bloom','shadows','pixels'];
export function createQuality({slowMs=28,window=60}={}){
 const times=[];let step=0,cooldown=0;
 return {
  get dropped(){return QUALITY_ORDER.slice(0,step);},
  // Feed one frame time in ms. Returns the name of the effect to drop now, or null.
  sample(ms){
   if(!Number.isFinite(ms)||ms<=0||ms>250)return null;
   times.push(ms);if(times.length>window)times.shift();
   if(cooldown>0){cooldown--;return null;}
   if(times.length<window/2||step>=QUALITY_ORDER.length)return null;
   const mean=times.reduce((a,b)=>a+b,0)/times.length;
   if(mean>slowMs){const name=QUALITY_ORDER[step++];times.length=0;cooldown=window;return name;}
   return null;
  }
 };
}
