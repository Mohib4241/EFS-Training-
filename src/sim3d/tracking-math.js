import * as THREE from 'three';
import {worldToScene,handFrame,toLocal,frameQuaternion,handScale} from './hand-frame.js';

// Pure maths for webcam hand tracking (no camera, no MediaPipe), so it can be tested with synthetic landmarks.
// `norm` = MediaPipe image landmarks (x, y in 0..1, z relative), `world` = its metric hand-centred landmarks; both flat [x,y,z]*21.
export const PALM={width:0.078,length:0.098};          // typical adult palm, metres: knuckle to knuckle, wrist to middle knuckle
export const TARGET_DISTANCE=0.75;                      // the distance the learner is asked to stand at
export const GOOD_BAND=[0.62,0.9];
export const DEFAULT_HFOV=65;                           // degrees; most laptop webcams are 60-75

// Distance from the camera to the hand, from how large the palm looks. A hand turned edge-on shrinks in one dimension,
// so the dimension that looks larger (the less foreshortened one) gives the smaller, more accurate distance.
export function estimateDistance(norm,video,hfov=DEFAULT_HFOV){
 const f=(video.width/2)/Math.tan(hfov*Math.PI/360);
 const w=Math.hypot((norm[15]-norm[51])*video.width,(norm[16]-norm[52])*video.height);
 const l=Math.hypot((norm[27]-norm[0])*video.width,(norm[28]-norm[1])*video.height);
 const candidates=[];if(w>2)candidates.push(f*PALM.width/w);if(l>2)candidates.push(f*PALM.length/l);
 return candidates.length?Math.min(...candidates):NaN;
}
export const classifyDistance=d=>!Number.isFinite(d)?'unknown':d<GOOD_BAND[0]?'close':d>GOOD_BAND[1]?'far':'good';
export const distanceAdvice=d=>({unknown:'Show your hands to the camera.',close:'A little too close: move back toward 0.75 m.',far:'A little too far: come closer, toward 0.75 m.',good:'Good distance.'})[classifyDistance(d)];

// Thumb tip to index tip, relative to palm length (wrist to the knuckles, averaged over the four fingers). Palm length is used rather
// than palm width because a pinching hand is usually turned side-on, which squeezes the width but not the length. Small = pinching.
const palmLength=world=>{let sum=0;for(const k of [5,9,13,17])sum+=Math.hypot(world[k*3]-world[0],world[k*3+1]-world[1],world[k*3+2]-world[2]);return Math.max(1e-6,sum/4);};
export function pinchRatio(world){
 return Math.hypot(world[12]-world[24],world[13]-world[25],world[14]-world[26])/palmLength(world);
}
// How far the most extended fingertip is from the wrist, in palm lengths. A closed hand (grip, fist) has every finger curled, so
// even its longest finger is near (about 1.3); a pointing hand keeps one finger out (about 1.9); an open hand is about 2.
export function closedRatio(world){
 const d=(a,b)=>Math.hypot(world[a*3]-world[b*3],world[a*3+1]-world[b*3+1],world[a*3+2]-world[b*3+2]);
 const palm=(d(0,5)+d(0,9)+d(0,13)+d(0,17))/4;let far=0;for(const tip of [8,12,16,20])far=Math.max(far,d(0,tip));return far/Math.max(1e-6,palm);
}
// Schmitt trigger so a pinch does not flicker at the threshold.
export function createPinchTracker({on=0.34,off=0.6}={}){return schmitt(on,off);}
// The closed-hand twin: smaller is closed, so the thresholds are on below 1.45 and off above 1.75.
export function createClosedTracker({on=1.45,off=1.75}={}){return schmitt(on,off);}
function schmitt(on,off){let pinching=false;return {update(ratio){if(!pinching&&ratio<on)pinching=true;else if(pinching&&ratio>off)pinching=false;return pinching;},reset(){pinching=false;},get value(){return pinching;}};}

// Camera image to screen. Your right hand is on the screen's right (the raw image is flipped), and the middle ~75% of the camera
// frame covers the whole screen so nobody has to reach the very edge of the picture.
export const GAIN=1.35;
export const toNdc=(x,y,out=[0,0],gain=GAIN)=>{out[0]=Math.max(-1.25,Math.min(1.25,(0.5-x)*2*gain));out[1]=Math.max(-1.25,Math.min(1.25,(0.5-y)*2*gain));return out;};

const frame=handFrame(new Float64Array(63)),q=new THREE.Quaternion();
// Everything the scene needs about one tracked hand. `world` must already be smoothed (and is not modified).
// MediaPipe names a hand as if the picture were mirrored (a selfie). Our frames are raw, so its "Left" is the user's right hand.
export const handOfLabel=label=>String(label).toLowerCase()==='left'?'right':'left';
export function describeHand({norm,world,label,video,gain=GAIN}){
 const scene=worldToScene(world,new Float64Array(63)),chirality=handOfLabel(label);
 handFrame(scene,frame);const local=toLocal(scene,frame,chirality,new Float64Array(63));
 const pinch=toNdc((norm[12]+norm[24])/2,(norm[13]+norm[25])/2),tip=toNdc(norm[24],norm[25]),wrist=toNdc(norm[0],norm[1]),palm=toNdc((norm[0]+norm[27])/2,(norm[1]+norm[28])/2);
 return {chirality,local,quaternion:frameQuaternion(frame,q).clone(),scale:handScale(local),pinchRatio:pinchRatio(world),closedRatio:closedRatio(world),pinchNdc:pinch,tipNdc:tip,wristNdc:wrist,palmNdc:palm,distance:estimateDistance(norm,video)};
}
