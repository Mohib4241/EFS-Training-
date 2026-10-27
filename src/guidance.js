import {GUIDE_LANGUAGES,guideFrames,moveGuide,partNameSpeech} from './guide-content.js';
export function speechChunks(text){const words=String(text).trim().split(/\s+/),chunks=[];let chunk='';for(const word of words){if(chunk.length+word.length>260&&chunk){chunks.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}if(chunk)chunks.push(chunk);return chunks;}
export function voiceForLanguage(voices,language){
 const local=voices.filter(v=>v.localService),preferred=language==='hinglish'?[/^hi[-_]/i,/^en[-_]IN$/i,/^en[-_]/i]:[/^en[-_]GB$/i,/^en[-_]/i];
 for(const pattern of preferred){const voice=local.find(v=>pattern.test(v.lang))||voices.find(v=>pattern.test(v.lang));if(voice)return voice;}return null;
}
export function createNarrator({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{},delay=setTimeout,clearDelay=clearTimeout}={}){
 const supported=Boolean(synth&&Utterance);let enabled=false,language='english',token=0,timer=null,lastKey=null,current=null;
 function stop(){token++;if(timer!==null)clearDelay(timer);timer=null;current=null;if(supported)synth.cancel();}
 function speak(text,key='guide',spokenHi=null){
  if(!enabled||!supported)return false;stop();lastKey=key;const run=token,voice=voiceForLanguage(synth.getVoices?.()||[],language),useHindi=language==='hinglish'&&/^hi[-_]/i.test(voice?.lang||''),chunks=speechChunks(useHindi&&spokenHi?spokenHi:text);let index=0;
  function next(){if(run!==token||!enabled)return;if(index===chunks.length){current=null;onStatus('Ready · hover a part to hear its name.');return;}
   current=new Utterance(chunks[index++]);current.lang=voice?.lang||(language==='hinglish'?'en-IN':'en-GB');current.rate=.96;current.voice=voice;
   current.onstart=()=>{if(run===token)onStatus('Speaking · '+key);};current.onend=next;current.onerror=e=>{if(run!==token)return;current=null;if(!['canceled','interrupted'].includes(e.error))onStatus('Audio unavailable. The visual guide still works.');};
   onStatus('Preparing voice · '+key);try{synth.resume?.();synth.speak(current);}catch{onStatus('Audio unavailable. The visual guide still works.');}
  }next();return true;
 }
 function hover(text,key,spokenHi=null){if(!enabled||!supported||key===lastKey)return;stop();lastKey=key;if(!key){onStatus('Ready · hover a part to hear its name.');return;}timer=delay(()=>{timer=null;speak(text,key,spokenHi);},220);}
 return {supported,get enabled(){return enabled;},get language(){return language;},speak,hover,stop(){stop();lastKey=null;onStatus(enabled?'Ready · hover a part to hear its name.':'Sound off');},setLanguage(value){if(!GUIDE_LANGUAGES.includes(value))throw new RangeError('Unknown guide language');stop();lastKey=null;language=value;},setEnabled(value){enabled=Boolean(value)&&supported;stop();lastKey=null;onStatus(!supported?'Voice unavailable in this browser. The visual guide still works.':enabled?'Sound on · point to a part.':'Sound off');return enabled;}};
}
const icons={
 sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8q5 4 0 8M20 5q8 7 0 14"/>',
 muted:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6"/>',
 rotate:'<path d="M19 8A8 8 0 1 0 20 15M19 3v5h-5"/>',panels:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/>'
};
const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</svg>`;
export function mountGuidance(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let machine=null,callbacks={},autoRotate=!reduced.matches,focused=true,language='english',tour=null,timer=null,entryTimer=null,toastTimer=null,opener=null,positionRAF=0;
 try{const saved=localStorage.getItem('efs-guide-language');if(GUIDE_LANGUAGES.includes(saved))language=saved;}catch{}
 container.innerHTML=`<div class="equipment-toolbar" hidden aria-label="Machine guides and viewing controls"><button class="guide-icon" data-guide-command="sound" aria-label="Turn sound on" title="Turn sound on" aria-pressed="false">${icon('muted')}</button><label class="guide-language"><span class="sr-only">Guide language</span><select aria-label="Guide language"><option value="english">English</option><option value="hinglish">Hinglish</option></select></label><button class="guide-icon" data-guide-command="rotate" aria-label="Pause auto rotation" title="Pause auto rotation" aria-pressed="true">${icon('rotate')}</button><button class="guide-icon" data-guide-command="panels" aria-label="Show parts and details" title="Show parts and details" aria-expanded="false">${icon('panels')}</button><button data-guide-command="machine">Machine Guide</button><button data-guide-command="page">Page Guide</button><span class="sr-only" data-guide-status role="status">Sound off</span></div><div class="guided-tour" hidden><div class="tour-spotlight" aria-hidden="true"></div><section class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-copy"><button class="tour-close" data-guide-command="close" aria-label="Close visual guide">×</button><div class="tour-main"><div class="tour-gesture" aria-hidden="true"><svg viewBox="0 0 90 58"><path class="gesture-track" d="M10 30H80"/><circle class="gesture-finger finger-a" cx="30" cy="29" r="9"/><circle class="gesture-finger finger-b" cx="60" cy="29" r="9"/><path class="gesture-arrow" d="m8 30 9-6m-9 6 9 6m65-6-9-6m9 6-9 6"/><text class="gesture-zoom" x="45" y="39" text-anchor="middle">+</text><path class="gesture-pointer" d="m35 9 1 31 9-9 9 17 7-4-9-17 13-1z"/></svg></div><div><span class="tour-kind"></span><h2 id="tour-title"></h2><p id="tour-copy"></p></div></div><div class="tour-controls"><button data-guide-command="previous" aria-label="Previous guide action">‹</button><div class="tour-dots" aria-label="Guide progress"></div><button data-guide-command="play" aria-label="Pause visual guide">Ⅱ</button><button data-guide-command="next" aria-label="Next guide action">›</button></div></section></div>`;
 const toolbar=container.querySelector('.equipment-toolbar'),overlay=container.querySelector('.guided-tour'),card=container.querySelector('.tour-card'),spotlight=container.querySelector('.tour-spotlight'),status=toolbar.querySelector('[data-guide-status]');
 const narrator=createNarrator({onStatus:text=>{status.textContent=text;}});narrator.setLanguage(language);toolbar.querySelector('select').value=language;
 const toast=document.createElement('div');toast.className='top-notification';toast.hidden=true;toast.setAttribute('role','alert');toast.innerHTML='<span></span><button aria-label="Dismiss notification">✕</button>';document.body.append(toast);
 function clearNotice(){clearTimeout(toastTimer);toast.hidden=true;}
 function notify(message){clearNotice();toast.querySelector('span').textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,7000);}
 toast.querySelector('button').addEventListener('click',clearNotice);
 function clearTimer(){clearTimeout(timer);timer=null;}
 function sync(){
  const sound=toolbar.querySelector('[data-guide-command=sound]');sound.innerHTML=icon(narrator.enabled?'sound':'muted');sound.setAttribute('aria-pressed',String(narrator.enabled));sound.setAttribute('aria-label',narrator.enabled?'Turn sound off':'Turn sound on');sound.title=sound.getAttribute('aria-label');
  const rotate=toolbar.querySelector('[data-guide-command=rotate]');rotate.hidden=Boolean(callbacks.maintenance);rotate.setAttribute('aria-pressed',String(autoRotate));rotate.setAttribute('aria-label',autoRotate?'Pause auto rotation':'Resume auto rotation');rotate.title=rotate.getAttribute('aria-label');
  const panels=toolbar.querySelector('[data-guide-command=panels]');panels.hidden=Boolean(callbacks.maintenance);panels.setAttribute('aria-expanded',String(!focused));panels.setAttribute('aria-label',focused?'Show parts and details':'Collapse parts and details');panels.title=panels.getAttribute('aria-label');
  callbacks.onAutoRotate?.(autoRotate&&!tour);callbacks.onPanels?.(focused);
 }
 function targetFor(frame){if(frame.target==='sound')return toolbar.querySelector('[data-guide-command=sound]');return callbacks.targets?.[frame.target]||callbacks.targets?.canvas;}
 function position(){
  positionRAF=0;if(!tour)return;const frames=guideFrames(tour.kind,machine,language,callbacks.maintenance),f=frames[tour.index],target=targetFor(f),canvas=callbacks.targets?.canvas||target;
  if(!target||!canvas){spotlight.hidden=true;card.style.left='20px';card.style.top='90px';return;}
  const r=target.getBoundingClientRect(),v=canvas.getBoundingClientRect(),padding=5,width=Math.min(390,innerWidth-28,Math.max(260,v.width-24));
  spotlight.hidden=!r.width||!r.height;Object.assign(spotlight.style,{left:`${Math.max(3,r.left-padding)}px`,top:`${Math.max(67,r.top-padding)}px`,width:`${Math.min(innerWidth-6,r.width+padding*2)}px`,height:`${Math.max(30,Math.min(innerHeight-72,r.height+padding*2))}px`});
  const left=Math.max(14,Math.min(innerWidth-width-14,f.target==='startup'||v.width>950?v.left+16:v.left+(v.width-width)/2));
  const height=card.getBoundingClientRect().height||140,top=f.target==='startup'?v.bottom-height-16:v.top+16;
  card.style.width=`${width}px`;card.style.left=`${left}px`;card.style.top=`${Math.max(76,Math.min(innerHeight-height-12,top))}px`;
 }
 function schedulePosition(){if(tour&&!positionRAF)positionRAF=requestAnimationFrame(position);}
 function queue(){clearTimer();if(!tour?.playing||document.hidden)return;const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];timer=setTimeout(()=>move(1),f.duration);}
 function paintTour(apply=false){
  if(!tour||!machine)return;const frames=guideFrames(tour.kind,machine,language,callbacks.maintenance),f=frames[tour.index];
  overlay.hidden=false;overlay.classList.toggle('tour-paused',!tour.playing);overlay.classList.toggle('tour-reduced',reduced.matches);card.lang=language==='hinglish'?'hi-Latn':'en';
  card.querySelector('.tour-kind').textContent=`${tour.kind==='machine'?'Machine Guide':'Page Guide'} · ${machine.name}`;card.querySelector('h2').textContent=f.title;card.querySelector('p').textContent=f.caption;card.querySelector('.tour-gesture').dataset.gesture=f.gesture;
  card.querySelector('.gesture-zoom').textContent=f.gesture==='zoom-out'?'−':'+';card.querySelector('[data-guide-command=previous]').disabled=tour.index===0;
  const play=card.querySelector('[data-guide-command=play]');play.textContent=tour.playing?'Ⅱ':'▶';play.setAttribute('aria-label',tour.playing?'Pause visual guide':'Play visual guide');
  card.querySelector('[data-guide-command=next]').textContent=tour.index===frames.length-1?'✓':'›';card.querySelector('[data-guide-command=next]').setAttribute('aria-label',tour.index===frames.length-1?'Finish visual guide':'Next guide action');
  card.querySelector('.tour-dots').innerHTML=frames.map((_,i)=>`<i class="${i===tour.index?'active':''}" aria-label="Action ${i+1}${i===tour.index?', current':''}"></i>`).join('');
  if(apply){callbacks.onTourFrame?.(f,tour.kind);narrator.speak(f.title+'. '+f.caption,f.title,f.spokenHi);}
  schedulePosition();sync();queue();
 }
 function closeTour(restore=true){
  clearTimer();clearTimeout(entryTimer);entryTimer=null;if(positionRAF)cancelAnimationFrame(positionRAF);positionRAF=0;const active=tour;tour=null;overlay.hidden=true;narrator.stop();if(active)callbacks.onTourEnd?.(Boolean(active.interacted));sync();
  if(restore&&active){const focus=opener&&document.contains(opener)&&!opener.disabled?opener:callbacks.targets?.canvas;focus?.focus({preventScroll:true});}opener=null;
 }
 function startGuide(kind){
  if(!machine)return;if(tour)closeTour(false);clearTimeout(entryTimer);opener=document.activeElement;tour={kind,index:0,playing:!reduced.matches&&!document.hidden,waitingForVisibility:!reduced.matches&&document.hidden};callbacks.onGuideOpen?.();callbacks.onTourStart?.(kind);clearNotice();
  paintTour(true);card.querySelector('.tour-close').focus({preventScroll:true});
 }
 function move(direction){if(!tour)return;const frames=guideFrames(tour.kind,machine,language,callbacks.maintenance),next=moveGuide(tour.index,direction,frames.length);if(next.complete){closeTour();return;}tour.index=next.index;paintTour(true);}
 function pauseTour(user=false){if(tour)tour.waitingForVisibility=false;if(tour&&user)tour.interacted=true;if(!tour||!tour.playing)return;tour.playing=false;narrator.stop();clearTimer();overlay.classList.add('tour-paused');const play=card.querySelector('[data-guide-command=play]');play.textContent='▶';play.setAttribute('aria-label','Play visual guide');}
 function hover(id){if(!machine)return;const part=machine.parts.find(p=>p.id===id);if(!part){if(!tour)narrator.hover('',null);return;}if(tour)pauseTour(true);const spoken=partNameSpeech(part,language);narrator.hover(spoken.text,part.name,spoken.spokenHi);}
 function click(event){
  const b=event.target.closest('[data-guide-command]');if(!b)return;const command=b.dataset.guideCommand;
  if(command==='sound'){narrator.setEnabled(!narrator.enabled);sync();if(narrator.enabled&&tour){const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];narrator.speak(f.title+'. '+f.caption,f.title,f.spokenHi);}}
  if(command==='rotate'){autoRotate=!autoRotate;sync();}
  if(command==='panels'){focused=!focused;sync();}
  if(command==='machine'||command==='page')startGuide(command);
  if(command==='close')closeTour();if(command==='next')move(1);if(command==='previous')move(-1);
  if(command==='play'&&tour){tour.playing=!tour.playing;tour.waitingForVisibility=false;if(!tour.playing)narrator.stop();paintTour();if(tour.playing){const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];narrator.speak(f.title+'. '+f.caption,f.title,f.spokenHi);}}
 }
 toolbar.addEventListener('click',e=>{e.stopPropagation();click(e);});container.addEventListener('click',click);
 toolbar.querySelector('select').addEventListener('change',event=>{language=event.target.value;narrator.setLanguage(language);try{localStorage.setItem('efs-guide-language',language);}catch{}document.dispatchEvent(new CustomEvent('efs-guide-language',{detail:{language}}));if(tour){paintTour();const f=guideFrames(tour.kind,machine,language,callbacks.maintenance)[tour.index];narrator.speak(f.title+'. '+f.caption,f.title,f.spokenHi);}sync();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tour){e.preventDefault();closeTour();}});
 document.addEventListener('pointerdown',e=>{if(tour&&!card.contains(e.target)&&!toolbar.contains(e.target))pauseTour(true);},{capture:true});
 const partButton=target=>target.closest('[data-part],[data-hl-part],[data-soft-part]');
 document.addEventListener('pointerover',e=>{const b=partButton(e.target);if(b&&!b.contains(e.relatedTarget))hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});document.addEventListener('pointerout',e=>{const b=partButton(e.target);if(b&&!b.contains(e.relatedTarget))hover(null);});
 document.addEventListener('focusin',e=>{const b=partButton(e.target);if(b)hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});document.addEventListener('focusout',e=>{if(partButton(e.target))hover(null);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseTour();narrator.stop();}else if(tour?.waitingForVisibility){tour.waitingForVisibility=false;tour.playing=!reduced.matches;paintTour(true);}});addEventListener('resize',schedulePosition);addEventListener('scroll',schedulePosition,{passive:true,capture:true});
 reduced.addEventListener('change',()=>{if(reduced.matches){autoRotate=false;pauseTour();overlay.classList.add('tour-reduced');sync();}});
 return {hover,notify,clearNotice,narrator,get language(){return language;},get autoRotate(){return autoRotate&&!tour;},get focused(){return focused;},get tourActive(){return Boolean(tour);},startGuide,updateMachine(next){machine=next;narrator.stop();if(tour)paintTour();},setMachine(next,options={}){closeTour(false);machine=next;callbacks=options;focused=true;toolbar.hidden=!next;clearNotice();if(!next){container.prepend(toolbar);return;}(options.toolbarHost||container).append(toolbar);sync();if(options.autoGuide!==false&&!options.maintenance)entryTimer=setTimeout(()=>startGuide('page'),160);},speakLesson(text,key,spokenHi){narrator.speak(text,key,spokenHi);},stop(){narrator.stop();},showDetails(){focused=false;sync();}};
}
