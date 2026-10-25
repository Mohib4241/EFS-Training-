import * as THREE from 'three';
import { Gestures, HAND_EDGES } from './gestures.js';
export class HandControl {
  constructor(screen){
    this.screen=screen;this.gestures=new Gestures();this.session=0;this.active=false;this.loading=false;
    const host=this.el=document.createElement('aside');host.className='hand-hud';host.hidden=true;
    host.innerHTML='<div class="hand-hud-top"><b>HAND LINK</b><button type="button" aria-label="Stop hand control">×</button></div><video muted playsinline></video><canvas width="240" height="150"></canvas><p class="hand-state" role="status">Preparing camera…</p><ul><li><b>Pinch + move</b> Rotate equipment</li><li><b>Quick pinch</b> Select a task or component</li><li><b>Two hands apart</b> Open the assembly</li><li><b>Fist → open palm</b> Toggle exploded view</li></ul><small>Camera frames stay on this device.</small>';
    screen.el.append(host);this.video=host.querySelector('video');this.canvas=host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
    host.querySelector('button').onclick=()=>this.stop();
    this.reticle=document.createElement('div');this.reticle.className='hand-reticle';this.reticle.hidden=true;screen.el.append(this.reticle);
    this.holograms=new THREE.Group();screen.group.add(this.holograms);this.lines=[];
    for(let i=0;i<2;i++){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(HAND_EDGES.length*6),3));
      const lines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x58f9ed,transparent:true,opacity:.8,depthTest:false}));lines.frustumCulled=false;lines.renderOrder=100;this.holograms.add(lines);this.lines.push(lines);
    }
    this.holograms.visible=false;
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  }
  status(text){this.el.querySelector('.hand-state').textContent=text;}
  async start(){
    if(this.active||this.loading)return;const token=++this.session;this.loading=true;this.el.hidden=false;this.status('Loading on-device hand tracking…');this.paintButton();
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.Worker)throw Error('Camera hand control needs HTTPS or localhost and a supported browser.');
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:400},facingMode:'user'},audio:false});
      if(token!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.video.srcObject=stream;await this.video.play();
      if(token!==this.session)return;
      const worker=this.worker=new Worker('hand-worker.js');
      worker.onerror=()=>{if(token===this.session)this.fail('Hand tracking could not start. Mouse and touch controls remain available.');};
      worker.onmessage=({data})=>{
        if(token!==this.session)return;
        if(data.type==='ready'){this.loading=false;this.active=true;this.paintButton();this.status('Show one or two hands to the camera.');this.frame();}
        else if(data.type==='error')this.fail('Hand tracking could not load. Reload and try again.');
        else if(data.type==='result'){this.busy=false;this.process(data.hands,data.time);}
      };
      worker.postMessage({type:'init',base:new URL('.',location.href).href});
    }catch(error){if(token===this.session)this.fail(error.name==='NotAllowedError'?'Camera permission was declined. You can still use mouse or touch.':error.name==='NotFoundError'?'No camera found. Mouse and touch controls remain available.':error.message);}
  }
  fail(message){this.stop();this.el.hidden=false;this.status(message);}
  stop(){
    ++this.session;this.active=false;this.loading=false;cancelAnimationFrame(this.raf);this.worker?.terminate();this.worker=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.busy=false;this.el.hidden=true;this.reticle.hidden=true;this.holograms.visible=false;this.gestures.reset();this.hovered?.classList.remove('hand-hover');this.hovered=null;this.paintButton();
  }
  paintButton(){const b=this.screen.el.querySelector('[data-action=hands]');if(b){b.textContent=this.loading?'Cancel hand control':this.active?'Stop hand control':'Start hand control';b.setAttribute('aria-pressed',String(this.active||this.loading));}}
  frame(){
    if(!this.active)return;this.raf=requestAnimationFrame(()=>this.frame());const now=performance.now();
    if(this.busy||now-(this.lastFrame||0)<65||this.video.readyState<2)return;
    this.lastFrame=now;this.busy=true;const token=this.session;
    createImageBitmap(this.video).then(bitmap=>{if(!this.active||token!==this.session){bitmap.close();return;}this.worker.postMessage({type:'frame',bitmap,time:now},[bitmap]);}).catch(()=>{this.busy=false;});
  }
  process(hands,time){
    const s=this.screen,result=this.gestures.update(hands,time,s.model.explodeTarget);this.status(result.mode);this.draw(hands);this.holograms.visible=hands.length>0;
    if(result.explode!=null)s.setExplode(result.explode);
    if(result.toggle)s.setExplode(s.model.explodeTarget>.5?0:1);
    if(result.orbit){const offset=s.app.stage.camera.position.clone().sub(s.controls.target),sp=new THREE.Spherical().setFromVector3(offset);sp.theta-=result.orbit.x*5;sp.phi=THREE.MathUtils.clamp(sp.phi+result.orbit.y*4,.2,Math.PI*.8);s.app.stage.camera.position.copy(s.controls.target).add(new THREE.Vector3().setFromSpherical(sp));s.controls.update();}
    if(result.pointer){
      const rect=s.el.querySelector('.lab-orbit').getBoundingClientRect(),root=s.el.getBoundingClientRect();
      const x=rect.left+result.pointer.x*rect.width,y=rect.top+result.pointer.y*rect.height;
      this.reticle.hidden=false;this.reticle.style.transform=`translate(${x-root.left+s.el.scrollLeft}px,${y-root.top+s.el.scrollTop}px)`;
      this.reticle.classList.toggle('pinching',!!result.pinched);
      this.hovered?.classList.remove('hand-hover');this.hovered=s.handTargetAt(x,y);this.hovered?.classList.add('hand-hover');
      if(this.hovered)this.status(`Quick pinch: ${this.hovered.getAttribute('aria-label')||this.hovered.textContent.trim()}`);
      if(result.select)s.handSelectAt(rect.left+result.select.x*rect.width,rect.top+result.select.y*rect.height);
    }else{this.reticle.hidden=true;this.hovered?.classList.remove('hand-hover');this.hovered=null;}

    const cam=s.app.stage.camera,dist=cam.position.distanceTo(s.controls.target)*.8;
    for(let j=0;j<this.lines.length;j++){
      const line=this.lines[j],hand=hands[j];line.visible=!!hand;if(!hand)continue;
      const out=line.geometry.attributes.position;
      HAND_EDGES.flat().forEach((idx,k)=>{const p=hand[idx],v=new THREE.Vector3((1-p.x)*2-1,1-p.y*2,.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(dist+p.z*.5).add(cam.position);s.group.worldToLocal(v);out.setXYZ(k,v.x,v.y,v.z);});out.needsUpdate=true;
    }
  }
  draw(hands){const c=this.ctx,w=240,h=150;c.clearRect(0,0,w,h);c.strokeStyle='#59fbe8';c.fillStyle='#d7fff6';c.lineWidth=1.6;for(const hand of hands){for(const [a,b]of HAND_EDGES){c.beginPath();c.moveTo((1-hand[a].x)*w,hand[a].y*h);c.lineTo((1-hand[b].x)*w,hand[b].y*h);c.stroke();}for(const p of hand){c.beginPath();c.arc((1-p.x)*w,p.y*h,2,0,Math.PI*2);c.fill();}}}
}
