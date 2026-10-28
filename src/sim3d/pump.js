// Render-on-demand scheduler. Frames run only while something asked for one (invalidate) or the scene says it is still
// moving (draw returns true). Nothing is allocated per frame; hidden or offscreen views stop scheduling entirely.
export function createPump(draw,{raf=requestAnimationFrame,caf=cancelAnimationFrame}={}){
 let frame=0,running=true,visible=true,last=0;
 function tick(now){frame=0;if(!running||!visible)return;const dt=last?Math.min((now-last)/1000,.05):.016;last=now;if(draw(now,dt))schedule();else last=0;}
 function schedule(){if(!frame&&running&&visible)frame=raf(tick);}
 return {
  invalidate:schedule,
  setVisible(value){visible=Boolean(value);last=0;if(visible)schedule();else if(frame){caf(frame);frame=0;}},
  stop(){running=false;if(frame){caf(frame);frame=0;}},
  get scheduled(){return frame!==0;}
 };
}
