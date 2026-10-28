// One Euro filter (Casiez et al.): heavy smoothing when a landmark is still, almost none when it moves fast.
// Webcam landmarks jitter by a few millimetres; unfiltered, held objects would shake in the learner's fingers.
const alpha=(cutoff,dt)=>{const tau=1/(2*Math.PI*cutoff);return 1/(1+tau/dt);};
export function createOneEuro(size,{minCutoff=1.4,beta=0.03,derivativeCutoff=1}={}){
 const x=new Float64Array(size),dx=new Float64Array(size),out=new Float64Array(size);let last=0,primed=false;
 return {
  reset(){primed=false;},
  // Filters `values` (length `size`) observed at time t (seconds); returns a reused array.
  filter(values,t){
   if(!primed||t<=last){for(let i=0;i<size;i++){x[i]=values[i];dx[i]=0;out[i]=values[i];}primed=true;last=t;return out;}
   const dt=Math.max(1e-3,t-last);last=t;const ad=alpha(derivativeCutoff,dt);
   for(let i=0;i<size;i++){
    const rate=(values[i]-x[i])/dt;dx[i]=dx[i]+ad*(rate-dx[i]);
    const cutoff=minCutoff+beta*Math.abs(dx[i]),a=alpha(cutoff,dt);
    x[i]=x[i]+a*(values[i]-x[i]);out[i]=x[i];
   }
   return out;
  }
 };
}
