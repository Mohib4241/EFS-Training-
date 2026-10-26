// Scene coordinates and particle counts are illustrative, not measured pickup data.
export function createDust(){
 return Array.from({length:40},(_,id)=>({
  id,x:1.05+(id%5)*.115,z:1+Math.floor(id/5)*.15,collected:false
 }));
}

export function collectDust(dust,{x,z,width=.65,depth=.3,active=false}={}){
 if(!Array.isArray(dust))throw new TypeError('Dust must be an array');
 if(![x,z,width,depth].every(Number.isFinite)||width<=0||depth<=0)throw new RangeError('Invalid nozzle footprint');
 if(typeof active!=='boolean')throw new TypeError('Active must be a boolean');
 for(const point of dust)if(!point||![point.x,point.z].every(Number.isFinite)||typeof point.collected!=='boolean')throw new TypeError('Invalid dust point');
 if(!active)return dust;
 let changed=false;
 const next=dust.map(point=>{
  if(point.collected||point.x<x-width/2||point.x>x+width/2||point.z<z-depth/2||point.z>z+depth/2)return point;
  changed=true;return {...point,collected:true};
 });
 return changed?next:dust;
}
