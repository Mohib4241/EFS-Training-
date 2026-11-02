import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Vector2} from 'three';

// UnrealBloom for the hologram look only. Created lazily by the rig and disposed as soon as the studio look returns or frames run slow.
export function createBloom(renderer,scene,camera,width,height,pixelRatio){
 const composer=new EffectComposer(renderer);composer.setPixelRatio(pixelRatio);composer.setSize(width,height);
 const pass=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new Vector2(width,height),.62,.7,.82);
 composer.addPass(pass);composer.addPass(bloom);composer.addPass(new OutputPass());
 return {
  set camera(next){pass.camera=next;},
  render(){composer.render();},
  setSize(w,h,ratio=pixelRatio){composer.setPixelRatio(ratio);composer.setSize(w,h);},
  dispose(){composer.dispose();}
 };
}
