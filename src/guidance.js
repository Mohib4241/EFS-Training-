import {GUIDE_LANGUAGES,guideFrames,moveGuide,partNameSpeech} from './guide-content.js';
import {findClip} from './guide-audio.js';
// Speech is sent in short pieces, split at sentence ends (then commas, then words): Chromium can stop a long utterance
// part-way (around 15 seconds), and a sentence boundary is a natural place to pause.
const CHUNK=180;
// how long the cursor rests on a part before its name is spoken (short, so it feels immediate, but not on every pass)
export const HOVER_MS=110;
export function speechChunks(text){
 const sentences=String(text).trim().replace(/\s+/g,' ').match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g)||[];
 const pieces=[];
 for(const sentence of sentences.map(s=>s.trim()).filter(Boolean)){
  if(sentence.length<=CHUNK){pieces.push(sentence);continue;}
  let part='';
  for(const word of sentence.split(' ')){if(part&&part.length+word.length+1>CHUNK){pieces.push(part);part='';}part+=(part?' ':'')+word;if(/[,;:]$/.test(word)&&part.length>CHUNK*0.6){pieces.push(part);part='';}}
  if(part)pieces.push(part);
 }
 // join short neighbours so the voice does not stop after every few words
 const chunks=[];for(const piece of pieces){const last=chunks.at(-1);if(last!==undefined&&last.length+piece.length+1<=CHUNK*0.75)chunks[chunks.length-1]=last+' '+piece;else chunks.push(piece);}
 return chunks;
}
export function voiceForLanguage(voices,language){
 const local=voices.filter(v=>v.localService),preferred=language==='hinglish'?[/^hi[-_]/i,/^en[-_]IN$/i,/^en[-_]/i]:[/^en[-_]GB$/i,/^en[-_]/i];
 for(const pattern of preferred){const voice=local.find(v=>pattern.test(v.lang))||voices.find(v=>pattern.test(v.lang));if(voice)return voice;}return null;
}
// Sound is on by default (English); a learner who turns it off stays off. Pure, so it can be tested.
export const soundPreference=storage=>{try{return storage?.getItem('efs-guide-sound')!=='off';}catch{return true;}};
export function createNarrator({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{},onBlocked=()=>{},delay=setTimeout,clearDelay=clearTimeout,AudioPlayer=globalThis.Audio,watchDelay=(fn,ms)=>{const id=setTimeout(fn,ms);id?.unref?.();return id;},watchClear=clearTimeout}={}){
 const supported=Boolean(synth&&Utterance);let enabled=false,blocked=false,language='english',token=0,timer=null,watch=null,lastKey=null,current=null,voicesSettled=false,activeDone=null,pending=null,cancelledAt=-1e9,player=null,dropVoiceWait=()=>{};
 const now=()=>Date.now();
 const setBlocked=value=>{if(blocked!==value){blocked=value;onBlocked(value);}};
 // done(true) = the whole text was spoken (or could not be); done(false) = it was cut off by newer speech, stop() or a sound-off.
 function stop(){token++;if(player){player.onended=player.onerror=player.onplaying=null;try{player.pause();}catch{}}dropVoiceWait();if(timer!==null)clearDelay(timer);timer=null;if(watch!==null)watchClear(watch);watch=null;current=null;if(supported){const busy=Boolean(synth.speaking||synth.pending);synth.cancel();if(busy)cancelledAt=now();}const a=activeDone,p=pending;activeDone=null;pending=null;a?.(false);p?.onDone(false);}
 // Chromium fills the voice list asynchronously. Wait briefly for it once; after that, never delay speech again.
 // Asking for the list once makes Chromium start loading it now, so it is usually ready before the first word.
 if(supported){try{synth.getVoices?.();}catch{}}
 function withVoices(run,ready){
  const list=synth.getVoices?.()||[];if(list.length||voicesSettled||!synth.addEventListener){ready(list);return;}
  const finish=()=>{dropVoiceWait();voicesSettled=true;if(run===token)ready(synth.getVoices?.()||[]);};
  dropVoiceWait=()=>{synth.removeEventListener('voiceschanged',finish);if(timer!==null){clearDelay(timer);timer=null;}dropVoiceWait=()=>{};};
  synth.addEventListener('voiceschanged',finish);timer=delay(()=>{timer=null;finish();},400);
 }
 // clip: the address of a recording of exactly these words; it is played instead of the browser voice, which reads them only if the recording cannot be played.
 // spokenIn: speak these words in this language's voice instead of the guide language's.
 function speak(text,key='guide',spokenHi=null,onDone=null,clip=null,spokenIn=null){
  const explicit=typeof onDone==='function',callback=explicit?onDone:()=>{};
  if(!enabled||!supported){callback(true);return false;}stop();lastKey=key;const run=token,tongue=spokenIn||language;let index=0,voice=null,chunks=[];
  const finish=ok=>{if(activeDone===callback)activeDone=null;callback(ok);};if(explicit)activeDone=callback;
  function begin(voices){voice=voiceForLanguage(voices,tongue);const useHindi=tongue==='hinglish'&&/^hi[-_]/i.test(voice?.lang||'');chunks=speechChunks(useHindi&&spokenHi?spokenHi:text);next();}
  function utter(chunk,attempt){
   const u=current=new Utterance(chunk);let started=false;u.lang=voice?.lang||(tongue==='hinglish'?'en-IN':'en-GB');u.rate=.96;u.voice=voice;
   u.onstart=()=>{started=true;if(watch!==null)watchClear(watch);watch=null;setBlocked(false);if(run===token)onStatus('Speaking · '+key);};
   u.onend=()=>{if(current===u)next();};
   u.onerror=e=>{if(run!==token||current!==u)return;current=null;
    if(e.error==='not-allowed'){activeDone=null;if(explicit)pending={text,key,spokenHi,onDone:callback,spokenIn};setBlocked(true);onStatus('Sound is on. The voice starts as soon as the browser allows it.');return;}
    if(!['canceled','interrupted'].includes(e.error)){onStatus('Audio unavailable. The visual guide still works.');finish(true);}};
   onStatus('Preparing voice · '+key);
   try{synth.resume?.();synth.speak(u);}catch{onStatus('Audio unavailable. The visual guide still works.');finish(true);return;}
   // a browser sometimes swallows a request made right after a cancel: if nothing starts, ask once more
   if(watch!==null)watchClear(watch);watch=watchDelay(()=>{watch=null;if(run!==token||started||current!==u||blocked||attempt>=2)return;try{synth.cancel();}catch{}cancelledAt=now();current=null;timer=delay(()=>{timer=null;if(run===token)utter(chunk,attempt+1);},150);},1500);
  }
  function next(){if(run!==token||!enabled)return;if(index===chunks.length){current=null;if(watch!==null)watchClear(watch);watch=null;onStatus('Ready · hover a part to hear its name.');finish(true);return;}utter(chunks[index++],0);}
  // right after a cancel the browser is still tidying up: starting at once can lose the first words, so give it a moment
  const go=()=>withVoices(run,begin),since=now()-cancelledAt,startVoice=()=>{if(synth.speaking||synth.pending||since<250){timer=delay(()=>{timer=null;if(run===token)go();},150);}else go();};
  if(clip&&AudioPlayer){
   const audio=player??=new AudioPlayer();let began=false;
   const unavailable=()=>{if(run!==token||began)return;began=true;if(watch!==null)watchClear(watch);watch=null;startVoice();};
   audio.onplaying=()=>{began=true;if(watch!==null)watchClear(watch);watch=null;setBlocked(false);if(run===token)onStatus('Speaking · '+key);};
   audio.onended=()=>{if(run!==token)return;onStatus('Ready · hover a part to hear its name.');finish(true);};
   audio.onerror=unavailable;
   onStatus('Preparing voice · '+key);
   try{audio.src=clip;const played=audio.play();played?.catch?.(error=>{if(run!==token)return;
    if(error?.name==='NotAllowedError'){activeDone=null;if(explicit)pending={text,key,spokenHi,onDone:callback,clip};setBlocked(true);onStatus('Sound is on. The voice starts as soon as the browser allows it.');return;}
    unavailable();});}catch{unavailable();return true;}
   // a recording that never starts (slow or broken connection) is replaced by the browser voice
   watch=watchDelay(()=>{watch=null;unavailable();},4000);
   return true;
  }
  startVoice();
  return true;
 }
 // Leaving a page: stop now, and check again a moment later, because some browsers keep the last words going after one cancel.
 // The later checks do nothing if something new has started speaking in the meantime.
 function silence(){stop();lastKey=null;const at=token;for(const ms of [120,450,1100])watchDelay(()=>{if(token!==at)return;if(player){try{player.pause();}catch{}}if(supported)try{synth.cancel();}catch{}},ms);}
 // after a click or key press the browser allows speech: say what was held back
 function retryBlocked(){if(!pending||!enabled||!supported)return false;const p=pending;pending=null;return speak(p.text,p.key,p.spokenHi,p.onDone,p.clip,p.spokenIn);}
 function hover(text,key,spokenIn=null){if(!enabled||!supported||key===lastKey)return;stop();lastKey=key;if(!key){onStatus('Ready · hover a part to hear its name.');return;}timer=delay(()=>{timer=null;speak(text,key,null,null,null,spokenIn);},HOVER_MS);}
 let warmed=false;
 function warmUp(){if(warmed||!enabled||!supported)return;warmed=true;try{const u=new Utterance(' ');u.volume=0;u.rate=2;synth.resume?.();synth.speak(u);}catch{}}
 return {supported,warmUp,retryBlocked,silence,get pending(){return Boolean(pending);},hoverEnd(){let dropped=false;if(timer!==null&&!current){token++;dropVoiceWait();if(timer!==null)clearDelay(timer);timer=null;dropped=true;}lastKey=null;return dropped;},get lastKey(){return lastKey;},get enabled(){return enabled;},get blocked(){return blocked;},get language(){return language;},speak,hover,stop(){stop();lastKey=null;onStatus(enabled?'Ready · hover a part to hear its name.':'Sound off');},setLanguage(value){if(!GUIDE_LANGUAGES.includes(value))throw new RangeError('Unknown guide language');stop();lastKey=null;language=value;},setEnabled(value){enabled=Boolean(value)&&supported;stop();if(enabled)synth.getVoices?.();lastKey=null;onStatus(!supported?'Voice unavailable in this browser. The visual guide still works.':enabled?'Sound on · point to a part.':'Sound off');if(!enabled)setBlocked(false);return enabled;}};
}
const icons={
 sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8q5 4 0 8M20 5q8 7 0 14"/>',
 muted:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6"/>',
 rotate:'<path d="M19 8A8 8 0 1 0 20 15M19 3v5h-5"/>'
};
const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</svg>`;
export function mountGuidance(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let machine=null,callbacks={},autoRotate=!reduced.matches,focused=true,language='english',tour=null,timer=null,entryTimer=null,toastTimer=null,opener=null,positionRAF=0,machineGen=0;
 try{const saved=localStorage.getItem('efs-guide-language');if(GUIDE_LANGUAGES.includes(saved))language=saved;}catch{}
 container.innerHTML=`<div class="equipment-toolbar" hidden aria-label="Machine guides and viewing controls"><button class="guide-icon" data-guide-command="sound" aria-label="Turn sound on" title="Turn sound on" aria-pressed="false">${icon('muted')}</button><label class="guide-language"><span class="sr-only">Guide language</span><select aria-label="Guide language"><option value="english">English</option><option value="hinglish">Hinglish</option></select></label><button class="guide-icon" data-guide-command="rotate" aria-label="Pause auto rotation" title="Pause auto rotation" aria-pressed="true">${icon('rotate')}</button><button data-guide-command="guide">Guide</button><span class="sr-only" data-guide-status role="status">Sound off</span></div><div class="guided-tour" hidden><div class="tour-spotlight" aria-hidden="true"></div></div>`;
 const toolbar=container.querySelector('.equipment-toolbar'),overlay=container.querySelector('.guided-tour'),spotlight=container.querySelector('.tour-spotlight'),status=toolbar.querySelector('[data-guide-status]');
  const narrator=createNarrator({onStatus:text=>{status.textContent=text;}});narrator.setLanguage(language);toolbar.querySelector('select').value=language;
 try{if(soundPreference(localStorage))narrator.setEnabled(true);}catch{}
 let clips={};try{clips=JSON.parse(document.getElementById('guide-audio')?.textContent||'{}');}catch{}
 const toast=document.createElement('div');toast.className='top-notification';toast.hidden=true;toast.setAttribute('role','alert');toast.innerHTML='<span></span><button aria-label="Dismiss notification">✕</button>';document.body.append(toast);
 function clearNotice(){clearTimeout(toastTimer);toast.hidden=true;}
 function notify(message){clearNotice();toast.querySelector('span').textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,7000);}
 toast.querySelector('button').addEventListener('click',clearNotice);
 function clearTimer(){clearTimeout(timer);timer=null;if(tour){clearTimeout(tour.cap);tour.cap=null;}}
 function sync(){
  const sound=toolbar.querySelector('[data-guide-command=sound]');sound.innerHTML=icon(narrator.enabled?'sound':'muted');sound.setAttribute('aria-pressed',String(narrator.enabled));sound.setAttribute('aria-label',narrator.enabled?'Turn sound off':'Turn sound on');sound.title=sound.getAttribute('aria-label');
  const rotate=toolbar.querySelector('[data-guide-command=rotate]');rotate.hidden=Boolean(callbacks.maintenance||callbacks.dock);rotate.setAttribute('aria-pressed',String(autoRotate));rotate.setAttribute('aria-label',autoRotate?'Pause auto rotation':'Resume auto rotation');rotate.title=rotate.getAttribute('aria-label');
  const guide=toolbar.querySelector('[data-guide-command=guide]');guide.textContent=tour?'Stop guide':'Guide';guide.setAttribute('aria-pressed',String(Boolean(tour)));
  callbacks.onAutoRotate?.(autoRotate&&!tour);callbacks.onPanels?.(focused);
 }
 function targetFor(frame){if(frame.target==='sound')return toolbar.querySelector('[data-guide-command=sound]');return callbacks.targets?.[frame.target]||callbacks.targets?.canvas;}
 // The guide has no box of its own: it is the voice, the actions on the machine and a ring around the control being used.
 function position(){
  positionRAF=0;if(!tour)return;const target=targetFor(guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index]);
  if(!target){spotlight.hidden=true;return;}
  const r=target.getBoundingClientRect(),padding=5;
  spotlight.hidden=!r.width||!r.height;Object.assign(spotlight.style,{left:`${Math.max(3,r.left-padding)}px`,top:`${Math.max(67,r.top-padding)}px`,width:`${Math.min(innerWidth-6,r.width+padding*2)}px`,height:`${Math.max(30,Math.min(innerHeight-72,r.height+padding*2))}px`});
 }
 function schedulePosition(){if(tour&&!positionRAF)positionRAF=requestAnimationFrame(position);}
 // A step moves on when its minimum time is up and the voice has finished the whole caption (never mid-sentence).
 // If a browser never reports the end of speech, a generous cap keeps the tour moving.
 function queue(){
  clearTimer();if(!tour?.playing||document.hidden)return;const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index],t=tour;
  // safety: if a browser never reports the end of speech, the step is still carried out and the tour moves on
  const words=(f.title+' '+(f.spokenHi||f.caption)).split(/\s+/).length;const seq=t.seq;const cap=()=>{if(tour!==t||t.seq!==seq)return;if(narrator.enabled&&(narrator.blocked||narrator.pending)){t.cap=setTimeout(cap,3000);return;}t.finish?.();};t.cap=setTimeout(cap,f.duration+words*480+4000);
 }
 function advanceWhenReady(){if(!tour?.playing||!tour.timeUp||!(tour.spoken||!narrator.enabled))return;clearTimer();timer=setTimeout(()=>{timer=null;move(1);},450);}
 // Each step first explains the step (shown, highlighted and read out); only then is the step carried out on the machine,
 // and the result stays on screen for a moment before the next one.
 function say(f){
  if(!tour)return;const t=tour,seq=t.seq=(t.seq||0)+1;t.spoken=false;t.timeUp=false;clearTimeout(t.hold);clearTimeout(t.quiet);let acted=false;
  const finish=t.finish=()=>{if(tour!==t||t.seq!==seq||acted)return;acted=true;t.spoken=true;callbacks.onTourFrame?.(f,t.kind,true);schedulePosition();
   t.hold=setTimeout(()=>{if(tour===t&&t.seq===seq){t.timeUp=true;advanceWhenReady();}},2800);};
  if(narrator.enabled)narrator.speak(f.title+'. '+f.caption,f.title,f.spokenHi,ok=>{if(ok!==false)finish();},findClip(clips,language,f));else t.quiet=setTimeout(finish,Math.max(2400,f.duration*.6));
 }
 function paintTour(apply=false){
  if(!tour||!machine)return;overlay.hidden=false;
  if(apply){const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];callbacks.onTourFrame?.(f,tour.kind,false);say(f);}
  schedulePosition();sync();queue();
 }
 function closeTour(restore=true){
  clearTimer();clearTimeout(entryTimer);entryTimer=null;if(positionRAF)cancelAnimationFrame(positionRAF);positionRAF=0;const active=tour;tour=null;overlay.hidden=true;narrator.stop();if(active)callbacks.onTourEnd?.(Boolean(active.interacted));sync();
  if(restore&&active){const focus=opener&&document.contains(opener)&&!opener.disabled?opener:callbacks.targets?.canvas;focus?.focus({preventScroll:true});}opener=null;
 }
 function startGuide(kind){
  if(!machine)return;machineGen++;if(tour)closeTour(false);clearTimeout(entryTimer);opener=document.activeElement;tour={kind,index:0,playing:!document.hidden};callbacks.onGuideOpen?.();callbacks.onTourStart?.(kind);clearNotice();
  paintTour(true);
 }
 function move(direction){if(!tour)return;const frames=guideFrames(tour.kind,machine,language,callbacks.maintenance),next=moveGuide(tour.index,direction,frames.length);if(next.complete){closeTour();return;}tour.index=next.index;paintTour(true);}
 // With nothing on screen to resume from, a hidden page only holds the guide; coming back says the current step again.
 function holdTour(){if(!tour)return;tour.playing=false;clearTimer();clearTimeout(tour.hold);clearTimeout(tour.quiet);tour.seq=(tour.seq||0)+1;}
 // the name last spoken, so a click right after hovering (or the hover that follows the click) does not repeat it
 let lastSaid={name:null,at:-1e9};
 function hover(id,user=true){if(!machine)return;const part=machine.parts.find(p=>p.id===id);if(!part){if(!tour&&narrator.hoverEnd())lastSaid={name:null,at:-1e9};return;}if(tour)return;const now=performance.now();if(lastSaid.name===part.name&&now-lastSaid.at<2500)return;lastSaid={name:part.name,at:now};const spoken=partNameSpeech(part,language);narrator.hover(spoken.text,part.name,spoken.voice);}
 // Tapping or clicking a part says its name only. With a mouse the name was usually just spoken on hover, so it is not repeated.
 const canHover=matchMedia('(hover:hover)');
 function sayPart(id){if(!machine||tour||id==='overview')return;const part=machine.parts.find(p=>p.id===id);if(!part)return;const now=performance.now();if(canHover.matches&&lastSaid.name===part.name&&now-lastSaid.at<2500)return;lastSaid={name:part.name,at:now};narrator.stop();const spoken=partNameSpeech(part,language);narrator.hover(spoken.text,part.name,spoken.voice);}
 function click(event){
  const b=event.target.closest('[data-guide-command]');if(!b)return;const command=b.dataset.guideCommand;
  if(command==='sound'){narrator.setEnabled(!narrator.enabled);narrator.warmUp();try{localStorage.setItem('efs-guide-sound',narrator.enabled?'on':'off');}catch{}sync();if(tour){const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];if(narrator.enabled){paintTour();say(f);}else tour.finish?.();}}
  if(command==='rotate'){autoRotate=!autoRotate;sync();}
  if(command==='guide'){if(tour)closeTour();else startGuide('guide');}
 }
 toolbar.addEventListener('click',e=>{e.stopPropagation();click(e);});
 toolbar.querySelector('select').addEventListener('change',event=>{language=event.target.value;narrator.setLanguage(language);try{localStorage.setItem('efs-guide-language',language);}catch{}document.dispatchEvent(new CustomEvent('efs-guide-language',{detail:{language}}));if(tour){paintTour();const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];say(f);}sync();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tour){e.preventDefault();closeTour();}});
 // Touching the page takes over from the guide: it stops and leaves the machine as it is. (The first touch only unblocks sound.)
 document.addEventListener('pointerdown',e=>{if(tour&&!toolbar.contains(e.target)){if(narrator.blocked||narrator.pending)return;tour.interacted=true;closeTour(false);}},{capture:true});
 const partButton=target=>target.closest('[data-part],[data-hl-part],[data-soft-part]');
 document.addEventListener('pointerover',e=>{const b=partButton(e.target);if(b&&!b.contains(e.relatedTarget))hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});document.addEventListener('pointerout',e=>{const b=partButton(e.target);if(b&&!b.contains(e.relatedTarget))hover(null);});
 document.addEventListener('focusin',e=>{const b=partButton(e.target);if(b)hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});document.addEventListener('focusout',e=>{if(partButton(e.target))hover(null);});
 addEventListener('pagehide',()=>narrator.silence());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){holdTour();narrator.stop();}else if(tour&&!tour.playing){tour.playing=true;paintTour(true);}});addEventListener('resize',schedulePosition);addEventListener('scroll',schedulePosition,{passive:true,capture:true});
 reduced.addEventListener('change',()=>{if(reduced.matches){autoRotate=false;sync();}});
 // The first click, tap or key press anywhere warms the voice up, so pointing at a part right after a reload is named at once.
 let lastTry=-1e9;const strong=new Set(['pointerdown','pointerup','click','keydown','touchend']);
 const warm=e=>{const now=performance.now();if(!strong.has(e.type)&&now-lastTry<500)return;lastTry=now;narrator.warmUp();if(narrator.pending)narrator.retryBlocked();};
 for(const type of ['pointerdown','pointerup','click','keydown','touchend','pointermove','wheel','touchmove','scroll'])addEventListener(type,warm,{capture:true,passive:true});
 // Spoken checklist steps never talk over the guide: while a guide is open, its voice is the only one.
 function speakStep(text,key,onDone){if(tour)return false;return narrator.speak(text,key,null,onDone);}
 return {hover,sayPart,speakStep,notify,clearNotice,narrator,get language(){return language;},get autoRotate(){return autoRotate&&!tour;},get focused(){return focused;},setAutoRotate(value){autoRotate=Boolean(value)&&!reduced.matches;sync();},setFocused(value){focused=Boolean(value);sync();},startGuide,updateMachine(next){machine=next;if(!tour)narrator.stop();else paintTour();},setOptions(options){closeTour(false);callbacks=options;clearNotice();sync();},setMachine(next,options={}){closeTour(false);machine=next;callbacks=options;focused=Boolean(options.focused);toolbar.hidden=!next;clearNotice();const generation=++machineGen;if(!next){narrator.silence();container.prepend(toolbar);return;}(options.toolbarHost||container).append(toolbar);sync();if(options.autoGuide!==false&&!options.maintenance)Promise.resolve(options.ready).then(()=>{if(generation===machineGen)entryTimer=setTimeout(()=>startGuide('guide'),160);});}};
}
