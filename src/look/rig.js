import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createQuality} from './motion.js';
import {getLook} from './look.js';

// The shared studio for every equipment page: one renderer, one image-based environment, one soft key light, fog matched to the
// stage colour, a floor that follows the lowest part and a contact shadow that fades as parts lift apart. Looks only change
// tokens (colours, light, floor, rim glow, bloom); the machines themselves are never rebuilt.
export const TOKENS={
 studio:{stops:['#ffffff','#ffffff','#f3f5f7'],fog:'#ffffff',density:.014,env:1,hemi:['#ffffff','#9fb0b9',.55],key:['#fff6ea',2.6],fill:['#cfe2ec',.7],accent:'#0a8f9c',rim:0,shadow:.2},
 hologram:{stops:['#08182a','#03080f','#02060b'],fog:'#03080f',density:.026,env:.42,hemi:['#3de0ff','#04101c',.5],key:['#bfeaff',1.5],fill:['#2aa6d4',1.1],accent:'#3de0ff',rim:.7,shadow:.5}
};

// ---- finishes: the four physical materials every part is dressed in --------------------------------------------------
const FINISH={
 lacquer:{roughness:.35,metalness:.04,clearcoat:.6,clearcoatRoughness:.12},
 glass:{roughness:.06,metalness:0,transparent:true,opacity:.42,color:'#0b161c',clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.3,depthWrite:false},
 rubber:{roughness:.9,metalness:0,color:'#15191c'},
 steel:{roughness:.35,metalness:1}
};
// A fresnel rim shared by every material (one uniform pair), switched on by the hologram look. Patched once, never recompiled.
const rimUniforms={uRimColor:{value:new THREE.Color(TOKENS.hologram.accent)},uRimAmount:{value:0}};
function withRim(material){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,rimUniforms);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uRimColor;uniform float uRimAmount;')
   .replace('#include <opaque_fragment>','#include <opaque_fragment>\n{float rim=pow(1.0-clamp(dot(normalize(vNormal),normalize(vViewPosition)),0.0,1.0),2.6);gl_FragColor.rgb+=uRimColor*rim*uRimAmount;}');
 };
 material.customProgramCacheKey=()=>'efs-rim';
 return material;
}
// kind: lacquer | glass | rubber | steel. Colour is the part's own (kept where it carries meaning); rubber stays near-black.
export function finish(kind,color,extra={}){
 const spec={...FINISH[kind]};if(color&&kind!=='rubber'&&kind!=='glass')spec.color=color;
 const material=new THREE.MeshPhysicalMaterial({...spec,...extra});
 material.userData.finish=kind;material.userData.baseOpacity=material.opacity;material.userData.baseTransparent=material.transparent;material.userData.baseDepthWrite=material.depthWrite;
 return withRim(material);
}
// Each mesh gets its own copy of a finish (so highlights stay per part); onBeforeCompile is not copied by clone().
export function cloneFinish(material){const copy=material.clone();copy.userData={...material.userData};return withRim(copy);}
// Turn a shell translucent (X-ray) and back, remembering each material's own opacity so glass stays glass.
export function ghost(object,on,opacity=.09){
 object.traverse(o=>{
  if(!o.isMesh||!o.material?.isMeshStandardMaterial)return;
  const m=o.material,u=m.userData;if(u.baseOpacity===undefined){u.baseOpacity=m.opacity;u.baseTransparent=m.transparent;u.baseDepthWrite=m.depthWrite;}
  m.transparent=on||u.baseTransparent;m.opacity=on?Math.min(u.baseOpacity,opacity):u.baseOpacity;m.depthWrite=on?false:u.baseDepthWrite;o.castShadow=!on;m.needsUpdate=true;
 });
}

// ---- small textures -------------------------------------------------------------------------------------------------
function gradientTexture(stops){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),w=512,h=512;
 // radial-gradient(120% 90% at 50% 58%, a, b 55%, c)
 ctx.save();ctx.translate(w*.5,h*.58);ctx.scale(w*1.2,h*.9);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,stops[0]);g.addColorStop(.55,stops[1]);g.addColorStop(1,stops[2]);ctx.fillStyle=g;ctx.fillRect(-2,-2,4,4);ctx.restore();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function blobTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,'rgba(0,0,0,.9)');g.addColorStop(.45,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 return new THREE.CanvasTexture(canvas);
}

export function createRig({canvas,bounds={l:-7,r:7,t:7,b:-5},onChange=()=>{}}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 // Shader error checks read each program's log back the moment it is first used, which stalls the frame while the GPU
 // finishes compiling. Without them the browser can compile in the background, so a new effect does not cause a stutter.
 renderer.debug.checkShaderErrors=false;
 let pixelRatio=Math.min(window.devicePixelRatio||1,1.75);
 renderer.setPixelRatio(pixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;
 // In three 0.186 PCFShadowMap is the soft, filtered PCF; the separate "soft" mode was removed.
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const scene=new THREE.Scene(),fog=scene.fog=new THREE.FogExp2(TOKENS.studio.fog,TOKENS.studio.density);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),envTarget=pmrem.fromScene(room,.04);scene.environment=envTarget.texture;room.dispose();pmrem.dispose();
 const hemi=new THREE.HemisphereLight('#ffffff','#9fb0b9',.55),key=new THREE.DirectionalLight('#fff6ea',2.6),fill=new THREE.DirectionalLight('#cfe2ec',.7);
 key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:bounds.l,right:bounds.r,top:bounds.t,bottom:bounds.b});key.shadow.normalBias=.025;key.shadow.radius=4;
 fill.position.set(4,3,-4);scene.add(hemi,key,fill);

 // ---- floor: shadow catcher + contact shadow (studio) and a glowing perspective grid with rings and arcs (hologram) ----
 const floor=new THREE.Group();scene.add(floor);
 const catcher=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:TOKENS.studio.shadow}));catcher.rotation.x=-Math.PI/2;catcher.receiveShadow=true;floor.add(catcher);
 const blobMap=blobTexture(),blobMaterial=new THREE.MeshBasicMaterial({map:blobMap,transparent:true,depthWrite:false,opacity:.5,fog:false});
 const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),blobMaterial);blob.rotation.x=-Math.PI/2;blob.position.y=.004;blob.renderOrder=1;floor.add(blob);
 const holo=new THREE.Group();holo.visible=false;floor.add(holo);
 const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false};
 const gridMaterial=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(TOKENS.hologram.accent)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 uColor;varying vec2 vP;float grid(vec2 p,float s){vec2 q=p/s;vec2 g=abs(fract(q-.5)-.5)/fwidth(q);return 1.0-min(min(g.x,g.y),1.0);}void main(){float r=length(vP);float fade=smoothstep(15.0,1.5,r);float a=grid(vP,.5)*.22+grid(vP,2.5)*.5;gl_FragColor=vec4(uColor*1.6,a*fade);}'});
 const grid=new THREE.Mesh(new THREE.PlaneGeometry(40,40),gridMaterial);grid.rotation.x=-Math.PI/2;holo.add(grid);
 const ringMaterial=new THREE.MeshBasicMaterial({color:TOKENS.hologram.accent,opacity:.7,...additive});
 const rings=[[1.6,.014],[2.6,.05],[3.8,.012],[5.2,.03]].map(([r,t])=>{const m=new THREE.Mesh(new THREE.RingGeometry(r,r+t,160),ringMaterial);m.rotation.x=-Math.PI/2;m.position.y=.003;holo.add(m);return m;});
 const arcs=new THREE.Group();arcs.position.y=.006;holo.add(arcs);
 for(const [r,t,start,length] of [[3.2,.07,.2,1.6],[3.2,.07,3.6,1.1],[4.5,.045,1.5,2.2],[4.5,.045,5.2,.7],[6,.03,.4,1.2]]){const m=new THREE.Mesh(new THREE.RingGeometry(r,r+t,96,1,start,length),ringMaterial);m.rotation.x=-Math.PI/2;arcs.add(m);}

 // ---- the floor follows the lowest part; the contact shadow fades and widens as parts lift apart ----
 let tracked=[],footprint=2,floorY=0,lift=0;
 function track(groups,rootObject=scene){
  tracked=[];const box=new THREE.Box3(),size=new THREE.Vector3();
  rootObject.updateMatrixWorld(true);
  for(const group of groups){group.updateMatrixWorld(true);box.setFromObject(group);if(box.isEmpty())continue;tracked.push({group,bottom:box.min.y-group.position.y,rise:0});}
  box.makeEmpty();for(const group of groups)box.expandByObject(group);box.getSize(size);footprint=Math.max(1.6,Math.max(size.x,size.z)*.62);
  settleFloor();
 }
 function settleFloor(){
  if(!tracked.length)return;
  let lowest=Infinity,rise=0;
  for(const item of tracked){const g=item.group;lowest=Math.min(lowest,g.position.y+item.bottom);rise+=g.position.y-(g.userData.base?.y??g.position.y);}
  floorY=lowest;lift=Math.max(0,rise/tracked.length);
  floor.position.y=floorY;
  const s=footprint*(1+lift*.55);blob.scale.set(s*2,s*2,1);blobMaterial.opacity=.62/(1+lift*1.7);
 }

 // ---- looks ----
 let look=getLook(),background=null,bloom=null,bloomWanted=false,bloomAllowed=true,bloomBusy=false,glow=true,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const quality=createQuality(),size={width:1,height:1};
 function applyLook(next,notify=true){
  look=next;const t=TOKENS[look];
  background?.dispose();background=gradientTexture(t.stops);scene.background=background;
  fog.color.set(t.fog);fog.density=t.density;scene.environmentIntensity=t.env;
  hemi.color.set(t.hemi[0]);hemi.groundColor.set(t.hemi[1]);hemi.intensity=t.hemi[2];key.color.set(t.key[0]);key.intensity=t.key[1];fill.color.set(t.fill[0]);fill.intensity=t.fill[1];
  rimUniforms.uRimAmount.value=t.rim;catcher.material.opacity=t.shadow;holo.visible=look==='hologram';blob.visible=look==='studio';
  syncBloom();if(notify)onChange(look);
 }
 // The composer (and its three.js addons) is created lazily, only in the hologram look.
 function syncBloom(){
  bloomWanted=look==='hologram'&&bloomAllowed&&glow;
  if(!bloomWanted){bloom?.dispose();bloom=null;return;}
  if(bloom||bloomBusy)return;bloomBusy=true;
  import('./bloom.js').then(({createBloom})=>{bloomBusy=false;if(!bloomWanted||bloom||disposed)return;bloom=createBloom(renderer,scene,currentCamera,size.width,size.height,pixelRatio);onChange(look);}).catch(error=>{bloomBusy=false;bloomAllowed=false;console.warn('Bloom unavailable:',error.message);});
 }
 const abort=new AbortController(),listen=event=>applyLook(event.detail);document.addEventListener('efs-look',listen,{signal:abort.signal});
 let currentCamera=null,disposed=false,last=0,lastMoving=false,arcSpin=0,fitKey='';
 applyLook(look,false);

 return {
  renderer,scene,key,hemi,fill,floor,track,finish,ghost,
  get look(){return look;},get bloomActive(){return Boolean(bloom);},get pixelRatio(){return pixelRatio;},
  settleFloor,
  // The contact shadow follows a machine that travels (the scrubber's zigzag).
  moveContact(x,z){blob.position.x=x;blob.position.z=z;},
  // The controls cover the bottom of the stage: shift the picture up so the machine sits in the clear space above them.
  fit(camera,width,height,bottom=0){const key=`${width}|${height}|${bottom}`;if(key===fitKey)return;fitKey=key;if(bottom>0)camera.setViewOffset(width,height,0,Math.round(bottom/2),width,height);else camera.clearViewOffset();camera.updateProjectionMatrix();},
  setGlow(on){glow=on;syncBloom();},
  resize(width,height){size.width=width;size.height=height;renderer.setSize(width,height,false);bloom?.setSize(width,height,pixelRatio);},
  // Draw one frame. `moving` tells the quality governor whether frames are continuous, so idle gaps are never counted as slow.
  render(camera,time,moving){
   currentCamera=camera;
   if(look==='hologram'&&!reduced.matches){arcSpin=time*.00008;arcs.rotation.z=arcSpin;rings[1].material.opacity=.55+.15*Math.sin(time*.002);}
   settleFloor();
   if(bloom){bloom.camera=camera;bloom.render();}else renderer.render(scene,camera);
   const interval=time-last;last=time;
   if(moving&&lastMoving){
    const drop=quality.sample(interval);
    if(drop==='bloom'){bloomAllowed=false;syncBloom();}
    else if(drop==='shadows'){renderer.shadowMap.enabled=false;key.castShadow=false;scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});}
    else if(drop==='pixels'){pixelRatio=Math.max(1,pixelRatio*.75);renderer.setPixelRatio(pixelRatio);renderer.setSize(size.width,size.height,false);bloom?.setSize(size.width,size.height,pixelRatio);}
   }
   lastMoving=moving;
  },
  dispose(){
   disposed=true;abort.abort();bloom?.dispose();bloom=null;background?.dispose();blobMap.dispose();blobMaterial.dispose();catcher.geometry.dispose();catcher.material.dispose();blob.geometry.dispose();
   grid.geometry.dispose();gridMaterial.dispose();ringMaterial.dispose();for(const m of [...rings,...arcs.children])m.geometry.dispose();
   key.shadow.map?.dispose();envTarget.dispose();renderer.dispose();
  }
 };
}
