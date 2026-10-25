import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
let detector;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const vision=await FilesetResolver.forVisionTasks(data.base+'mediapipe/wasm');
      detector=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:data.base+'media/models/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
      self.postMessage({type:'ready'});
    }else if(data.type==='frame'){
      try{const result=detector.detectForVideo(data.bitmap,data.time);self.postMessage({type:'result',hands:result.landmarks,time:data.time});}
      finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
