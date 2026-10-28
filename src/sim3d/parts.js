import {PLACE,TANK} from './layout.js';
// Pure pose tables for every movable part: where each one rests for each place, and where the learner's fingers hold it.
// Positions are the part's origin; `anchor` is the grip point relative to that origin (head handle, bag collar, plug body...).
export const ANCHOR={
 head:[0,0.22,0],
 used:[0,-0.004,0],fresh:[0,-0.004,0],
 plug:[0,0,0],
 clipLeft:[0,0.07,0.004],clipRight:[0,0.07,0.004],
 tape:[0,0,0]
};
// Resting pose per part and place: { p: origin, r: [pitch, yaw, roll] radians, s: uniform scale }.
export function placePose(part,place){
 switch(part){
  case 'head':return place==='rest'?{p:PLACE.headRest,r:[0,0.18,0],s:1}:{p:PLACE.headSeated,r:[0,0,0],s:1};
  case 'used':case 'fresh':{
   if(place==='tank')return {p:PLACE.inTank,r:[0,0,0],s:1};
   if(place==='shelf')return {p:PLACE.shelf,r:[0,0.22,0],s:1};
   if(place==='tray')return {p:PLACE.tray,r:[-Math.PI/2+0.08,0.35,0],s:1};   // lying flat on the tray, collar toward the learner
   if(place==='bin')return {p:PLACE.bin,r:[0,0.5,0.08],s:0.7};
   throw new RangeError('Unknown place '+place);
  }
  case 'plug':return place==='out'?{p:PLACE.plugOut,r:[0.3,0.5,0.4],s:1}:{p:PLACE.plugIn,r:[0,0,0],s:1};
  case 'clipLeft':return {p:[-TANK.radius-0.02,0.378,0],r:[0,0,place==='locked'?0:0.72],s:1};
  case 'clipRight':return {p:[TANK.radius+0.02,0.378,0],r:[0,0,place==='locked'?0:-0.72],s:1};
  case 'tape':return {p:PLACE.tape,r:[0,0,0],s:1};
  default:throw new RangeError('Unknown part '+part);
 }
}
// World position of a part's grip anchor when the part sits at `origin` with yaw/pitch/roll `r` (anchors are small, so only
// the dominant rotations matter for picking): used to compare against zones and fingertips.
export function anchorWorld(part,pose,out=[0,0,0]){
 const [ax,ay,az]=ANCHOR[part],[rx,ry,rz]=pose.r,s=pose.s;
 // Euler XYZ rotation of the offset
 let x=ax,y=ay,z=az;
 let c=Math.cos(rx),sn=Math.sin(rx),y1=y*c-z*sn,z1=y*sn+z*c;y=y1;z=z1;
 c=Math.cos(ry);sn=Math.sin(ry);const x2=x*c+z*sn,z2=-x*sn+z*c;x=x2;z=z2;
 c=Math.cos(rz);sn=Math.sin(rz);const x3=x*c-y*sn,y3=x*sn+y*c;x=x3;y=y3;
 out[0]=pose.p[0]+x*s;out[1]=pose.p[1]+y*s;out[2]=pose.p[2]+z*s;return out;
}
