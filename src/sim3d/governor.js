// Adaptive quality: watches a rolling window of frame times and steps the render resolution down when frames run long,
// and back up after a sustained stretch with headroom. Pure, so the policy is testable without a GPU.
export function createGovernor({levels=[1.75,1.25,1,0.8],slowMs=26,fastMs=15,window=90,upAfter=240}={}){
 const times=new Float32Array(window);let count=0,head=0,level=0,calm=0,cooldown=0;
 const p95=()=>{const n=Math.min(count,window),copy=Array.from(times.subarray(0,n)).sort((a,b)=>a-b);return copy[Math.max(0,Math.ceil(n*0.95)-1)]||0;};
 return {
  get level(){return level;},get pixelRatio(){return levels[level];},get p95(){return p95();},
  // Feed one frame time (ms). Returns the new pixel ratio when it should change, otherwise null.
  sample(ms,cap=Infinity){
   if(!Number.isFinite(ms)||ms<=0||ms>250)return null;                       // ignore stalls caused by hidden tabs and debugging
   times[head]=ms;head=(head+1)%window;count++;if(cooldown>0){cooldown--;return null;}
   if(count<window/2)return null;
   const slow=p95();
   if(slow>slowMs&&level<levels.length-1){level++;count=0;head=0;calm=0;cooldown=window/2;return Math.min(levels[level],cap);}
   if(slow<fastMs){calm++;if(calm>=upAfter&&level>0){level--;count=0;head=0;calm=0;cooldown=window/2;return Math.min(levels[level],cap);}}else calm=0;
   return null;
  }
 };
}
