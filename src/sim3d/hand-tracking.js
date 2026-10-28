import {createOneEuro} from './oneeuro.js';
import {describeHand,createPinchTracker,createClosedTracker,classifyDistance} from './tracking-math.js';

// Webcam hand tracking: asks for the camera, loads the self-hosted MediaPipe HandLandmarker, and turns every video frame into
// at most two smoothed hands. Video never leaves the page: it is read into the model locally and nothing is recorded or sent.
// The build injects where the model and WASM live (hashed, same origin); the fallbacks keep this importable in tests.
const WASM_BASE=typeof __MP_WASM_BASE__==='string'?__MP_WASM_BASE__:'/static/mediapipe';
const MODEL_URL=typeof __MP_MODEL__==='string'?__MP_MODEL__:'/static/hand_landmarker.task';

const CAMERA_ERRORS={NotAllowedError:'denied',PermissionDeniedError:'denied',SecurityError:'denied',NotFoundError:'no-camera',DevicesNotFoundError:'no-camera',NotReadableError:'busy',TrackStartError:'busy',AbortError:'busy',OverconstrainedError:'unsupported'};
export const cameraErrorCode=error=>CAMERA_ERRORS[error?.name]||(error?.code==='insecure'?'insecure':'failed');
export const CAMERA_MESSAGES={
 denied:'The camera was blocked. Allow it in your browser’s site settings to use your hands, or use the mouse.',
 'no-camera':'No camera was found on this device. You can use the mouse or touch instead.',
 busy:'The camera is being used by another app. Close it and try again, or use the mouse.',
 unsupported:'This camera cannot provide the video needed. You can use the mouse or touch instead.',
 insecure:'Camera access needs a secure (https) page.',
 failed:'The camera could not start. You can use the mouse or touch instead.',
 model:'Hand tracking could not load. You can use the mouse or touch instead.'
};
export async function openCamera(){
 if(!navigator.mediaDevices?.getUserMedia){const error=new Error('getUserMedia is unavailable');error.code=window.isSecureContext===false?'insecure':'failed';throw error;}
 return navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
}
async function loadLandmarker(onStatus){
 const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
 const files=await FilesetResolver.forVisionTasks(WASM_BASE);
 const options=delegate=>({baseOptions:{modelAssetPath:MODEL_URL,delegate},numHands:2,runningMode:'VIDEO',minHandDetectionConfidence:0.5,minHandPresenceConfidence:0.5,minTrackingConfidence:0.5});
 try{return {landmarker:await HandLandmarker.createFromOptions(files,options('GPU')),delegate:'GPU'};}
 catch(error){onStatus?.({state:'loading',detail:'GPU unavailable, using CPU'});return {landmarker:await HandLandmarker.createFromOptions(files,options('CPU')),delegate:'CPU'};}
}

const slotState=()=>({pinch:createPinchTracker(),closed:createClosedTracker(),world:createOneEuro(63,{minCutoff:1.1,beta:0.04}),norm:createOneEuro(63,{minCutoff:1.6,beta:0.09}),lastSeen:-1,present:false,x:0,vote:0,rawWorld:new Float64Array(63),rawNorm:new Float64Array(63)});
// life: lifecycle that owns the stream and the landmarker; onHands(hands, info) runs for every processed frame.
export async function createHandTracker({video,life,onStatus=()=>{},onHands=()=>{}}){
 let stream=null,landmarker=null,running=false,callback=0,lastTimestamp=0,seq=0,lastFrameTime=-1,failures=0,distance=NaN,fps=0,fpsClock=0,fpsCount=0,delegate='';
 const slots={L:slotState(),R:slotState()},hands=[];
 const stopStream=()=>{if(stream){for(const track of stream.getTracks())track.stop();stream=null;}video.srcObject=null;};
 function cancel(){if(callback){if(video.cancelVideoFrameCallback&&callback.kind==='video')video.cancelVideoFrameCallback(callback.id);else cancelAnimationFrame(callback.id);callback=0;}}
 function schedule(){if(!running)return;callback=video.requestVideoFrameCallback?{kind:'video',id:video.requestVideoFrameCallback(tick)}:{kind:'raf',id:requestAnimationFrame(tick)};}
 function toFlat(points,out,useZ=true){for(let i=0;i<21;i++){out[i*3]=points[i].x;out[i*3+1]=points[i].y;out[i*3+2]=useZ?points[i].z:0;}return out;}
 function tick(){
  callback=0;if(!running)return;
  const now=performance.now();
  if(video.readyState>=2&&!video.paused&&now-lastFrameTime>=30&&video.videoWidth>0){
   lastFrameTime=now;const stamp=Math.max(now,lastTimestamp+1);lastTimestamp=stamp;
   try{
    const started=performance.now(),result=landmarker.detectForVideo(video,stamp),inference=performance.now()-started;failures=0;
    process(result,stamp/1000,inference);
   }catch(error){
    failures++;if(failures>=5){running=false;onStatus({state:'error',code:'failed',message:CAMERA_MESSAGES.failed});console.warn('Hand tracking stopped:',error.message);return;}
   }
  }
  schedule();
 }
 function process(result,time,inference){
  const count=Math.min(2,result.landmarks.length),labels=result.handedness??result.handednesses??[];hands.length=0;seq++;
  // who is who: with two hands the one on the left of the screen is the left slot; with one, keep whichever slot was nearer
  const order=[];for(let i=0;i<count;i++)order.push({i,x:-(result.landmarks[i][9].x-0.5)});
  const taken=new Set();
  if(count===2){order.sort((a,b)=>a.x-b.x);order[0].slot='L';order[1].slot='R';}
  else if(count===1){const o=order[0],l=slots.L,r=slots.R;o.slot=l.present&&(!r.present||Math.abs(l.x-o.x)<=Math.abs(r.x-o.x))?'L':r.present?'R':(o.x<0?'L':'R');}
  for(const o of order){
   const slot=slots[o.slot];taken.add(o.slot);
   // a hand is new when it was absent from the previous result (counting results, not seconds, so slow devices keep their pinch state)
   const fresh=!slot.present||time-slot.lastSeen>2.5;
   if(fresh){slot.world.reset();slot.norm.reset();slot.pinch.reset();slot.closed.reset();}
   slot.lastSeen=time;slot.x=o.x;
   const world=slot.world.filter(toFlat(result.worldLandmarks[o.i],slot.rawWorld),time),norm=slot.norm.filter(toFlat(result.landmarks[o.i],slot.rawNorm),time);
   // The model's left/right call can flicker on a single frame; the drawn hand only changes sides after the call has been consistent for a few frames.
   const call=labels[o.i]?.[0],sign=call?.categoryName==='Left'?-1:1,weight=0.3+0.7*Math.min(1,call?.score??0.5);
   slot.vote=fresh?sign:Math.max(-1,Math.min(1,slot.vote*0.82+sign*weight*0.18));
   const label=slot.vote<0?'Left':'Right',d=describeHand({norm,world,label,video:{width:video.videoWidth,height:video.videoHeight}});
   const holding=slot.pinch.update(d.pinchRatio)|slot.closed.update(d.closedRatio);
   hands.push({id:o.slot,seq,...d,holding:Boolean(holding),norm:Float32Array.from({length:42},(_,k)=>norm[Math.floor(k/2)*3+(k%2)])});
   if(Number.isFinite(d.distance))distance=Number.isFinite(distance)?distance+(d.distance-distance)*0.15:d.distance;
  }
  for(const key of ['L','R'])if(!taken.has(key))slots[key].present=false;
  for(const key of taken)slots[key].present=true;
  if(!count)distance=NaN;
  fpsCount++;if(time-fpsClock>=1){fps=fpsCount/(time-fpsClock);fpsCount=0;fpsClock=time;}
  onHands(hands,{seq,count,distance,distanceClass:classifyDistance(distance),inference,fps,delegate});
 }
 const api={
  // Ask for the camera, then load the model. Rejects with {code} when either fails; anything opened is closed again.
  async start(){
   try{
    onStatus({state:'requesting'});stream=await openCamera();video.muted=true;video.playsInline=true;video.srcObject=stream;await video.play();
    onStatus({state:'loading'});const loaded=await loadLandmarker(onStatus);landmarker=loaded.landmarker;delegate=loaded.delegate;
    running=true;lastFrameTime=-1;onStatus({state:'ready',delegate});schedule();
   }catch(error){
    const code=stream||landmarker?(error?.name&&CAMERA_ERRORS[error.name]?cameraErrorCode(error):'model'):cameraErrorCode(error);
    api.stop();const e=new Error(CAMERA_MESSAGES[code]||CAMERA_MESSAGES.failed);e.code=code;onStatus({state:'error',code,message:e.message});throw e;
   }
  },
  stop(){running=false;cancel();try{landmarker?.close();}catch{}landmarker=null;stopStream();for(const slot of Object.values(slots)){slot.lastSeen=-1;slot.present=false;}},
  get running(){return running;}
 };
 life.onCleanup(api.stop);
 return api;
}
