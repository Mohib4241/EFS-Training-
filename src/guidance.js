const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Short utterances avoid the long-utterance limits of some system speech engines.
export function speechChunks(text){
 const words=String(text).trim().split(/\s+/),chunks=[];let chunk='';
 for(const word of words){if(chunk.length+word.length>260&&chunk){chunks.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}
 if(chunk)chunks.push(chunk);return chunks;
}
export function createNarrator({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{},delay=setTimeout,clearDelay=clearTimeout}={}){
 const supported=Boolean(synth&&Utterance);let enabled=false,token=0,timer=null,lastKey=null,current=null;
 function stop(){token++;if(timer!==null)clearDelay(timer);timer=null;current=null;if(supported)synth.cancel();}
 function speak(text,key='guide'){
  if(!enabled||!supported)return false;stop();lastKey=key;const run=token,chunks=speechChunks(text);let index=0;
  function next(){
   if(run!==token||!enabled)return;
   if(index===chunks.length){current=null;onStatus('Ready · hover a part to hear its guide.');return;}
   current=new Utterance(chunks[index++]);current.lang='en-GB';current.rate=.94;
   const voices=synth.getVoices?.()||[];current.voice=voices.find(v=>v.localService&&/^en[-_]/i.test(v.lang))||voices.find(v=>/^en[-_]/i.test(v.lang))||null;
   current.onstart=()=>{if(run===token)onStatus('Speaking · '+key);};
   current.onend=next;current.onerror=event=>{if(run!==token)return;current=null;if(!['canceled','interrupted'].includes(event.error))onStatus('Audio unavailable. Read the guide text or try Sound again.');};
   onStatus('Preparing voice · '+key);try{synth.resume?.();synth.speak(current);}catch{onStatus('Audio unavailable. The guide text is available.');}
  }
  next();return true;
 }
 function hover(text,key){
  if(!enabled||!supported||key===lastKey)return;
  stop();lastKey=key;if(!key){onStatus('Ready · hover a part to hear its guide.');return;}
  timer=delay(()=>{timer=null;speak(text,key);},450);
 }
 return {supported,get enabled(){return enabled;},speak,hover,stop(){stop();lastKey=null;onStatus(enabled?'Ready · hover a part to hear its guide.':'Sound off');},setEnabled(value){enabled=Boolean(value)&&supported;stop();lastKey=null;onStatus(!supported?'Voice is unavailable in this browser. Read the guides.':enabled?'Sound on · hover or focus a part.':'Sound off');return enabled;}};
}

export function mountGuidance(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let machine=null,callbacks={},autoRotate=!reduced.matches,focused=true,guide='machine',toastTimer=null;
 container.innerHTML=`<div class="machine-toolbar" hidden><div class="guide-context"><span class="eyebrow">LEARN WITH A GUIDE</span><span data-guide-status role="status">Sound off</span></div><div class="machine-guide-buttons"><button data-guide-command="sound" aria-pressed="false">♬ Sound off</button><button data-guide-command="rotate" aria-pressed="${autoRotate}">Auto rotate ${autoRotate?'on':'off'}</button><button data-guide-command="panels" aria-pressed="true">Show parts & details</button><button data-guide-command="machine">Machine Guide</button><button data-guide-command="page">Page Guide</button></div></div><dialog class="machine-guide-dialog" aria-labelledby="machine-guide-title"><div class="guide-dialog-top"><span class="eyebrow">EFS LEARNING ACADEMY</span><button data-guide-command="close" aria-label="Close guide">✕</button></div><h2 id="machine-guide-title"></h2><div class="guide-dialog-tabs"><button data-guide-command="machine">Machine Guide</button><button data-guide-command="page">Page Guide</button></div><div class="guide-audio-controls"><button data-guide-command="read">▶ Read this guide</button><button data-guide-command="stop">■ Stop audio</button></div><p data-dialog-status role="status">Sound off</p><p class="guide-voice-note">Uses your browser’s available voice. Turn Sound on for hover narration. All guidance is also written below.</p><div data-guide-body></div></dialog>`;
 const toolbar=container.querySelector('.machine-toolbar'),dialog=container.querySelector('dialog'),status=container.querySelector('[data-guide-status]');
 const narrator=createNarrator({onStatus:text=>{status.textContent=text;container.querySelector('[data-dialog-status]').textContent=text;}});
 const toast=document.createElement('div');toast.className='top-notification';toast.hidden=true;toast.setAttribute('role','alert');toast.innerHTML='<span></span><button aria-label="Dismiss notification">✕</button>';document.body.append(toast);
 function notify(message){clearTimeout(toastTimer);toast.querySelector('span').textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,7000);}
 toast.querySelector('button').addEventListener('click',()=>toast.hidden=true);
 const partSpeech=p=>`${p.name}. ${p.body} Why it matters: ${p.why} ${p.motion||''}`;
 function hover(id){if(dialog.open||!machine)return;const p=machine.parts.find(p=>p.id===id);narrator.hover(p?partSpeech(p):'',p?.name||null);}
 function pageCopy(){if(callbacks.maintenance)return [
 ['Choose a machine and task','Use Choose machine to switch between the dry vacuum, wet/dry vacuum and scrubber dryer. Choose a maintenance task, then watch its own lesson.'],
 ['Learn before practice','Use Play, Pause and Replay, or review every action with Next lesson step. Practice unlocks only after the lesson has been reviewed. Watching does not complete the practice.'],
 ['Hold, move and release','For a bag or filter task, isolate the cleaner and release both clips. Hold the head and move it to its rest. Move the bag or filter to the highlighted target and release. Wrong drops return the object. Use Keyboard / tap alternative for the same ordered actions.'],
 ['Complete each step in order','Follow the highlighted step. Trying a later step shows a top notification without advancing practice. Dust bags must be sealed before disposal. Filter service uses matching clean, dry media for dry pickup; wet pickup needs the exact approved configuration.'],
 ['Other essential checks','Handwashing practice requires every named hand area and a real 20-second scrub. Connector inspection is external and isolated: recognise visible damage and report it. Completion records this virtual sequence only.'],
 ['Explore the equipment','Open Machine Guide to read or hear any part. Show on model takes you to that machine’s 3D explorer, where you can rotate, zoom and reveal the assemblies.']
 ];return [
  ['Start with the machine','The model starts assembled with the side panels collapsed. Auto rotate slowly shows its outside. Hover or touch a part to identify it. Turn Sound on to hear the part guide; use the parts list and keyboard focus for the same narration.'],
  ['Rotate and zoom','Drag with one finger or the mouse to rotate. Use the minus and plus camera buttons to zoom out and in. Use the curved arrows to rotate in small steps and the target button to reset the camera. Auto rotate pauses while your cursor is over the model or you are dragging.'],
  ['Look inside','Scroll up over the model or pinch out to reveal the assemblies. Scroll down or pinch in to assemble it. The reveal slider and named view buttons do the same. With the canvas focused, Arrow Up and Down reveal, Home assembles and End explodes. Opening isolates the virtual machine.'],
  ['Learn what a part does','Choose Show parts & details to open the component list and explanations. Select a part in the list or on the model. Read what it does, why it matters and what moves. Machine Guide contains every component explanation.'],
  ['Try it, then practise','Follow the operation controls in order. Maintenance begins with an animated lesson or a step-by-step review. Then practise each task in order. A top notification explains any missed step. These are conceptual training models, not manufacturer service instructions.']
 ];}
 function guideText(){return guide==='page'?`${machine.name}. Page Guide. ${pageCopy().map(([title,body])=>title+'. '+body).join(' ')}`:`${machine.name}. ${machine.intro||''} ${machine.principle||''} ${machine.parts.filter(p=>p.id!=='overview').map(partSpeech).join(' ')}`;}
 function drawGuide(){
  container.querySelector('#machine-guide-title').textContent=`${machine.name} · ${guide==='machine'?'Machine Guide':'Page Guide'}`;
  for(const b of container.querySelectorAll('.guide-dialog-tabs button'))b.setAttribute('aria-pressed',String(b.dataset.guideCommand===guide));
  container.querySelector('[data-guide-body]').innerHTML=guide==='page'?pageCopy().map(([title,body])=>`<section><h3>${escape(title)}</h3><p>${escape(body)}</p></section>`).join(''):`<p>${escape(machine.intro||machine.principle||'Explore each assembly and understand its purpose.')}</p>${machine.parts.filter(p=>p.id!=='overview').map(p=>`<details><summary>${escape(p.name)}</summary><p>${escape(p.body)}</p><p><strong>Why:</strong> ${escape(p.why)}</p><p>${escape(p.motion||'')}</p><button data-read-part="${escape(p.id)}">Read ${escape(p.name)}</button><button data-find-part="${escape(p.id)}">Show on model →</button></details>`).join('')}`;
 }
 function sync(){
  for(const name of ['rotate','panels'])container.querySelector(`[data-guide-command=${name}]`).hidden=Boolean(callbacks.maintenance);
  const sound=container.querySelector('[data-guide-command=sound]');sound.textContent=narrator.enabled?'♬ Sound on':'♬ Sound off';sound.setAttribute('aria-pressed',String(narrator.enabled));
  const rotate=container.querySelector('[data-guide-command=rotate]');rotate.textContent=`Auto rotate ${autoRotate?'on':'off'}`;rotate.setAttribute('aria-pressed',String(autoRotate));
  const panels=container.querySelector('[data-guide-command=panels]');panels.textContent=focused?'Show parts & details':'Collapse parts & details';panels.setAttribute('aria-pressed',String(focused));callbacks.onAutoRotate?.(autoRotate&&!dialog.open);callbacks.onPanels?.(focused);
 }
 function close(){narrator.stop();dialog.close();sync();}
 container.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.readPart){narrator.setEnabled(true);sync();const p=machine.parts.find(p=>p.id===button.dataset.readPart);narrator.speak(partSpeech(p),p.name);return;}
  if(button.dataset.findPart){close();focused=false;sync();callbacks.onSelect?.(button.dataset.findPart);return;}
  const command=button.dataset.guideCommand;
  if(command==='sound'){const enabled=narrator.setEnabled(!narrator.enabled);sync();if(enabled)narrator.speak('Sound is on. Hover over a component, or focus its name in the parts list, to hear what it does.','Sound on');}
  if(command==='rotate'){autoRotate=!autoRotate;sync();}
  if(command==='panels'){focused=!focused;sync();}
  if(command==='machine'||command==='page'){guide=command;narrator.stop();drawGuide();if(!dialog.open){callbacks.onGuideOpen?.();dialog.showModal();}sync();}
  if(command==='close')close();
  if(command==='read'){narrator.setEnabled(true);sync();narrator.speak(guideText(),guide==='machine'?'Machine Guide':'Page Guide');}
  if(command==='stop')narrator.stop();
 });
 dialog.addEventListener('cancel',()=>{narrator.stop();queueMicrotask(sync);});dialog.addEventListener('close',()=>{narrator.stop();sync();});
 const partId=target=>target.closest('[data-part],[data-hl-part],[data-soft-part]');
 document.addEventListener('pointerover',e=>{const b=partId(e.target);if(b&&!b.contains(e.relatedTarget))hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});
 document.addEventListener('pointerout',e=>{const b=partId(e.target);if(b&&!b.contains(e.relatedTarget))hover(null);});
 document.addEventListener('focusin',e=>{const b=partId(e.target);if(b)hover(b.dataset.part||b.dataset.hlPart||b.dataset.softPart);});
 document.addEventListener('focusout',e=>{if(partId(e.target))hover(null);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)narrator.stop();});
 reduced.addEventListener('change',()=>{if(reduced.matches){autoRotate=false;sync();}});
 return {hover,notify,updateMachine(next){machine=next;narrator.stop();if(dialog.open)drawGuide();},clearNotice(){clearTimeout(toastTimer);toast.hidden=true;},narrator,get autoRotate(){return autoRotate;},get focused(){return focused;},setMachine(next,options={}){narrator.stop();if(dialog.open)dialog.close();machine=next;focused=options.focused??true;callbacks=options;toolbar.hidden=!next;toast.hidden=true;if(next)sync();},speakLesson(text,key){narrator.speak(text,key);},stop(){narrator.stop();},showDetails(){focused=false;sync();}};
}
