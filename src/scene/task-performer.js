import * as THREE from 'three';
// A short, interruptible physical demonstration. Progress is awarded by the decisions, not playback.
export class TaskPerformer {
  constructor(screen){this.s=screen;this.running=false;this.elapsed=0;this.phase='idle';}
  play(index){
    this.stop();const s=this.s,step=s.def.steps[index];if(!step)return;
    this.index=index;this.step=step;this.elapsed=0;this.phase='walk';this.running=true;
    s.presenter.stop();const w=s.worker;w.setFolded(false);w.setPose('idle');
    s.model.explodeTarget=0;s.model.setActions(s.def.steps.slice(0,index).map(v=>v.action));s.model.root.updateMatrixWorld(true);
    const part=s.model.anchor(step.focus);this.target=part.clone();
    // Approach from the accessible front face; keep the operator outside the equipment envelope.
    const box=new THREE.Box3().setFromObject(s.model.root);
    this.stand=new THREE.Vector3(THREE.MathUtils.clamp(part.x,-1.4,1.3),0,Math.min(2.0,Math.max(.8,part.z+.65)));
    this.waypoint=new THREE.Vector3(-1.85,0,this.stand.z);this.approached=false;
    if(step.action==='prepare'){w.setPPE('glasses',true);s.sign.visible=true;}
    s.setTaskStatus(`Demonstrating: ${step.title}`);
  }
  stop(){const w=this.s.worker;if(!w)return;this.running=false;w.setIK('R',null);w.setIK('L',null);w.setFolded(false);w.setPose('idle');w.speed=0;}
  update(dt){
    if(!this.running)return;const s=this.s,w=s.worker;
    this.elapsed+=dt;
    if(this.phase==='walk'){
      const destination=this.approached?this.stand:this.waypoint;
      if(w.walkTo(destination.x,destination.z,dt,1.3)){
        if(!this.approached){this.approached=true;return;}
        this.phase='reach';this.elapsed=0;w.setGaze(()=>s.model.anchor(this.step.focus));
      }
      if(this.elapsed>12){this.phase='reach';this.elapsed=0;}
    }else if(this.phase==='reach'){
      const target=s.model.anchor(this.step.focus);target.y=THREE.MathUtils.clamp(target.y,.35,1.45);
      const side=Math.sign(this.stand.z-target.z)||1;target.z+=side*.12;
      w.turnTo(Math.atan2(target.x-w.pos.x,target.z-w.pos.z),dt,4);
      if(target.y<.8)w.adjust({crouch:.5,headPitch:.25});
      w.setIK('R',()=>target.clone());w.setGrip('R',.5);
      if(['open','bag','close','bit','run'].includes(this.step.action))w.setIK('L',()=>target.clone().add(new THREE.Vector3(.19,0,0)));
      if(this.elapsed>1.1){s.model.setActions(s.def.steps.slice(0,this.index+1).map(v=>v.action));this.phase='perform';this.elapsed=0;}
    }else if(this.phase==='perform'){
      const target=s.model.anchor(this.step.focus);target.y=THREE.MathUtils.clamp(target.y,.35,1.5);
      w.setIK('R',()=>target.clone().add(new THREE.Vector3(0,0,.12)));
      if(this.step.action==='inspect')w.adjust({headPitch:.15+Math.sin(this.elapsed*2)*.1,headYaw:Math.sin(this.elapsed*2)*.2});
      if(this.elapsed>2.4){this.stop();s.setTaskStatus('Demonstration finished · make your decision to save progress');}
    }
  }
}
