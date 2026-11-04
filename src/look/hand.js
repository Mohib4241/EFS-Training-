import {createGestures,ndcToClient} from './gestures.js';
import {createHandOverlay} from './hand-overlay.js';
import {distanceAdvice} from '../sim3d/tracking-math.js';
import {getLook} from './look.js';

// Hand control for the equipment pages: the webcam, the on-device tracker (the same one the maintenance practice uses), the
// gesture engine and the 3D drawing of the hands. The camera is asked for only when the learner presses "Start camera"; the
// video is read by the on-device model and never uploaded or recorded, and its picture is never shown: only the hands are drawn. One session lives across machine changes: each page
// calls attach() when it has built its viewer, and the session moves over to it.
export let active=false;
let session=null;
const ACCENT={studio:'#0a8f9c',hologram:'#3de0ff'};
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,x));

// ctx: {host, ui, adapter, viewer(), nextMachine(direction)}
export function togglePanel(ctx){if(session){stop();return false;}open(ctx);return true;}
function open(ctx){
 session={ctx,running:false,card:null,label:null,overlay:null,tracker:null,life:null,video:null,prevFocus:ctx.ui.focus,starting:false,gestures:null};
 session.gestures=createGestures({getOpen:()=>session.ctx.adapter.get().open});
 active=true;mount();
}
// A page has rebuilt its viewer (or a different page took over): move the session onto it.
export function attach(ctx){
 const s=session;if(!s)return;
 const same=ctx.host===s.ctx.host&&ctx.viewer?.()===s.viewerRef;
 if(same){s.ctx=ctx;return;}
 // leaving a page: hand its panels back, then take over the new one
 if(s.ctx.ui!==ctx.ui){s.ctx.ui.setHandActive(false);if(s.running)s.ctx.ui.setFocus(s.prevFocus);s.prevFocus=ctx.ui.focus;}
 s.card?.remove();s.label?.remove();s.overlay?.dispose();s.overlay=null;s.ctx=ctx;mount();
 if(s.running)ctx.ui.setFocus(true);
}
function mount(){
 const s=session,{ctx}=s;
 s.card=document.createElement('div');s.card.className='lk-hand-card';
 s.card.innerHTML=`<div class="lk-hand-head"><strong>Hand control</strong><button type="button" data-hand="close" aria-label="Close hand control">×</button></div>
  <p class="lk-hand-status" role="status"></p><p class="lk-hand-coach"></p>
  <div class="lk-hand-actions"><button type="button" class="lk-hand-start" data-hand="start">Start camera</button></div>
  <ul class="lk-hand-keys"><li><b>Two hands apart or together</b> open or close it</li><li><b>Pinch and drag</b> orbit</li><li><b>Quick pinch</b> click</li><li><b>Fist, then open hand</b> open fully</li><li><b>Open hand, then fist</b> close</li><li><b>Sideways palm flick</b> next machine</li></ul>
  <small>Your camera is asked for only when you press Start. Only your hands appear on the model: the camera picture is never shown, uploaded or recorded.</small>`;
 s.label=document.createElement('div');s.label.className='lk-hand-label';s.label.hidden=true;s.label.setAttribute('aria-hidden','true');
 ctx.host.append(s.card,s.label);
 s.card.addEventListener('click',onCard);
 const v=viewer();s.viewerRef=v;if(v){s.overlay=createHandOverlay({scene:v.hands.scene,camera:v.hands.camera,target:v.hands.target,color:ACCENT[getLook()]});s.overlay.setLabel(s.label);v.hands.setOverlay(s.overlay);}
 ctx.ui.setHandActive(true);paintCard();
}
const viewer=()=>session?.ctx.viewer?.()||null;
function onCard(event){
 const button=event.target.closest('[data-hand]');if(!button)return;
 if(button.dataset.hand==='close')stop();
 else if(button.dataset.hand==='start')session.running?stopCamera():start();
}
function setStatus(text){const s=session;if(s?.card)s.card.querySelector('.lk-hand-status').textContent=text;}
function paintCard(info){
 const s=session;if(!s?.card)return;
 s.card.querySelector('.lk-hand-start').textContent=s.running?'Stop camera':s.starting?'Starting…':'Start camera';s.card.querySelector('.lk-hand-start').disabled=s.starting;
 s.card.classList.toggle('is-running',s.running);
 s.card.querySelector('.lk-hand-coach').textContent=s.running&&info?distanceAdvice(info.distance):'';
 if(!s.running&&!s.starting)setStatus('Control the model with your hands. Nothing starts until you press Start camera.');
}

async function start(){
 const s=session;if(!s||s.running||s.starting)return;s.starting=true;paintCard();setStatus('Asking for the camera… allow it in the browser prompt.');
 try{
  const [{createHandTracker},{createLifecycle}]=await Promise.all([import('../sim3d/hand-tracking.js'),import('../sim3d/lifecycle.js')]);
  s.video=document.createElement('video');s.video.setAttribute('aria-hidden','true');Object.assign(s.video.style,{position:'fixed',left:'0',top:'0',width:'2px',height:'2px',opacity:'0',pointerEvents:'none'});document.body.append(s.video);
  s.life=createLifecycle();
  s.tracker=await createHandTracker({video:s.video,life:s.life,onStatus:status=>{if(session!==s)return;if(status.state==='loading')setStatus('Loading the on-device hand model…');if(status.state==='error')setStatus(status.message);},onHands:(hands,info)=>ingest(hands,info)});
  await s.tracker.start();
  if(session!==s){s.tracker.stop();return;}
  s.running=true;s.starting=false;s.prevFocus=s.ctx.ui.focus;s.ctx.ui.setFocus(true);paintCard();setStatus('Show your hands to the camera. Everything runs on this device.');
 }catch(error){
  if(session!==s)return;
  s.starting=false;s.running=false;s.tracker?.stop();s.life?.dispose();s.life=null;s.video?.remove();s.video=null;paintCard();setStatus(error.message||'The camera could not start. You can use the mouse or touch instead.');
 }
}
function stopCamera(){
 const s=session;if(!s)return;
 s.tracker?.stop();s.life?.dispose();s.life=null;s.tracker=null;s.video?.remove();s.video=null;
 viewer()?.hands.setHover(null);s.overlay?.clear();
 if(s.running)s.ctx.ui.setFocus(s.prevFocus);
 s.running=false;paintCard();
}
// Ends the session and puts the page back as it was.
export function stop(){
 const s=session;if(!s)return;
 stopCamera();session=null;active=false;
 const v=s.ctx.viewer?.();v?.hands.setOverlay(null);s.overlay?.dispose();
 s.card?.remove();s.label?.remove();s.ctx.ui.setHandActive(false);
}

// One processed frame of tracked hands (the tracker calls this; so can a test).
export function ingest(hands,info={},time=performance.now()/1000){
 const s=session;if(!s)return null;
 const result=s.gestures.update(hands,time),{ctx}=s,v=viewer();
 for(const a of result.actions){
  // one failing action must never stop the tracker loop
  try{
   if(a.type==='open'){const now=ctx.adapter.get().open;if(Math.abs(a.value-now)>=.4)ctx.adapter.setOpen(Math.round(a.value*10)/10);}
   else if(a.type==='orbit')v?.hands.orbit(a.dx,a.dy);
   else if(a.type==='click')click(a.ndc);
   else if(a.type==='machine')ctx.nextMachine?.(a.direction);
  }catch(error){console.warn('Hand gesture failed:',error.message);}
 }
 // beam and hover: what the pointing hand is aimed at (a pinch is aimed at its own spot)
 const aimed=result.pointer&&result.mode!=='spread'?v?.hands.pick(result.pointer.ndc)||null:null;
 v?.hands.setHover(aimed?.id||null);
 s.overlay?.update({hands:result.hands,hit:aimed,pointerHand:result.pointer?.hand.id,tether:result.tether});
 v?.hands.wake();
 if(info&&Object.keys(info).length)paintCard(info);
 return result;
}
// A quick pinch is a click on whatever is under the pinch: a control in the stage, the slider, or a part of the machine.
function click(ndc){
 const {ctx}=session,rect=ctx.host.getBoundingClientRect(),p=ndcToClient(ndc,rect),target=document.elementFromPoint(p.x,p.y);
 if(!target||!ctx.host.contains(target))return;
 if(target.closest('.lk-slider,.lk-track')){
  const range=ctx.host.querySelector('.lk-slider'),box=range.getBoundingClientRect();
  range.value=clamp((p.x-box.left)/box.width)*100;range.dispatchEvent(new Event('input',{bubbles:true}));return;
 }
 const control=target.closest('button,summary,a,input[type=checkbox]');
 if(control){control.click();return;}
 const hit=viewer()?.hands.pick(ndc);
 if(hit){ctx.adapter.select(hit.id);ctx.adapter.flyTo(hit.id);}
}
