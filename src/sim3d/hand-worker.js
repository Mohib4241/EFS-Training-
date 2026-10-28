// Hand landmark detection off the main thread, so the 3D view never waits for the model. A classic (non-module) worker:
// MediaPipe loads its WebAssembly runtime with importScripts. Frames arrive as ImageBitmaps and are closed after use.
import {FilesetResolver,HandLandmarker} from '@mediapipe/tasks-vision';

let landmarker=null;
const options=(model,delegate)=>({baseOptions:{modelAssetPath:model,delegate},numHands:2,runningMode:'VIDEO',minHandDetectionConfidence:0.5,minHandPresenceConfidence:0.5,minTrackingConfidence:0.5});
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const files=await FilesetResolver.forVisionTasks(data.wasm);let delegate='GPU';
   try{landmarker=await HandLandmarker.createFromOptions(files,options(data.model,'GPU'));}
   catch{delegate='CPU';landmarker=await HandLandmarker.createFromOptions(files,options(data.model,'CPU'));}
   self.postMessage({type:'ready',delegate});
  }catch(error){self.postMessage({type:'error',message:String(error?.message||error)});}
 }else if(data.type==='frame'){
  const {bitmap,timestamp}=data;
  try{const result=landmarker.detectForVideo(bitmap,timestamp);self.postMessage({type:'result',landmarks:result.landmarks,worldLandmarks:result.worldLandmarks,handedness:result.handedness??result.handednesses??[]});}
  catch(error){self.postMessage({type:'frame-error',message:String(error?.message||error)});}
  finally{bitmap.close();}
 }else if(data.type==='close'){try{landmarker?.close();}catch{}landmarker=null;self.close();}
};
