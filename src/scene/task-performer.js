import * as THREE from 'three';
// A short, interruptible physical demonstration. Progress is awarded by the decisions, not playback.
export class TaskPerformer {
  constructor(screen){this.s=screen;this.running=false;this.elapsed=0;this.phase='idle';this.handTarget=new THREE.Vector3();this.leftTarget=new THREE.Vector3();}
  play(index){
    this.stop();const s=this.s,step=s.def.steps[index];if(!step)return;
    this.index=index;this.step=step;this.elapsed=0;this.phase='walk';this.running=true;
    const kind=s.model.kind, action=step.action;
    this.observing=['prepare','inspect','verify'].includes(action)||(kind==='mcb'&&action!=='isolate');
    this.contact=kind==='hvac'&&!this.observing?'panel':kind==='drill'&&action==='run'?'trigger':kind==='vacuum'&&action==='run'?'wand':step.focus;
    this.support=kind==='drill'&&action==='run'?'body':null;
    this.twoHands=!this.observing&&kind!=='hvac'&&['open','bag','close','bit','run'].includes(action);
    s.presenter.stop();const w=s.worker;w.setFolded(false);w.setPose('idle');
    s.model.explodeTarget=0;s.model.setActions(s.def.steps.slice(0,index).map(v=>v.action));s.model.root.updateMatrixWorld(true);
    const part=s.model.anchor(this.contact);
    // Approach from the accessible front face; keep the operator outside the equipment envelope.
    this.stand=new THREE.Vector3(THREE.MathUtils.clamp(part.x,-1.4,1.3),0,Math.min(2.0,Math.max(.8,part.z+.65)));
    if(kind==='hvac'){
      // Walk around the plant, never through its two chiller barrels or headers.
      this.stand.set(this.observing?-.3:2.15,0,this.observing?2.05:.65);
      const aisleZ=Math.max(2.05,w.pos.z);
      this.path=[new THREE.Vector3(w.pos.x,0,aisleZ),new THREE.Vector3(this.stand.x,0,aisleZ),this.stand];
    }else this.path=[new THREE.Vector3(w.pos.x,0,this.stand.z),this.stand];
    this.pathIndex=0;
    if(step.action==='prepare'){w.setPPE('glasses',true);s.sign.visible=true;}
    s.setTaskStatus(`Demonstrating: ${step.title}`);
  }
  stop(){const w=this.s.worker;if(!w)return;this.running=false;w.setIK('R',null);w.setIK('L',null);w.setGaze(null);w.arms.R.handRig.setPoint(false);w.arms.L.handRig.setPoint(false);w.setFolded(false);w.setPose('idle');w.speed=0;}
  update(dt){
    if(!this.running)return;const s=this.s,w=s.worker;
    this.elapsed+=dt;
    if(this.phase==='walk'){
      const destination=this.path[this.pathIndex];
      if(w.walkTo(destination.x,destination.z,dt,1.3)){
        if(++this.pathIndex<this.path.length)return;
        this.phase='reach';this.elapsed=0;w.setGaze(()=>s.model.anchor(this.contact));
      }
      if(this.elapsed>18){this.stop();s.setTaskStatus('Demonstration interrupted · select the task to try again');}
    }else if(this.phase==='reach'){
      this.updateTargets();const target=this.handTarget;
      const focus=s.model.anchor(this.contact);
      w.turnTo(Math.atan2(focus.x-w.pos.x,focus.z-w.pos.z),dt,4);
      if(!this.observing&&target.y<.8)w.adjust({crouch:.5,headPitch:.25});
      w.setIK('R',this.handTarget);w.setGrip('R',this.observing?.15:.5);
      w.arms.R.handRig.setPoint(this.observing);
      if(this.twoHands)w.setIK('L',this.leftTarget);
      if(this.elapsed>1.1){s.model.setActions(s.def.steps.slice(0,this.index+1).map(v=>v.action));this.phase='perform';this.elapsed=0;}
    }else if(this.phase==='perform'){
      this.updateTargets();
      if(this.step.action==='inspect')w.adjust({headPitch:.15+Math.sin(this.elapsed*2)*.1,headYaw:Math.sin(this.elapsed*2)*.2});
      if(this.elapsed>2.4){this.stop();s.setTaskStatus('Demonstration finished · make your decision to save progress');}
    }
  }
  updateTargets(){
    const s=this.s,w=s.worker,target=this.handTarget.copy(s.model.anchor(this.contact));
    if(this.observing){
      // Indicate the part from a distance; never put a bare hand on a terminal or moving part.
      const direction=target.clone().sub(new THREE.Vector3(w.pos.x,1.15,w.pos.z)).normalize();
      target.set(w.pos.x,1.15,w.pos.z).addScaledVector(direction,.42);
    }else{target.y=THREE.MathUtils.clamp(target.y,.35,1.5);target.z+=.12;}
    if(this.support){this.leftTarget.copy(s.model.anchor(this.support));this.leftTarget.y-=.1;this.leftTarget.z+=.15;}
    else{this.leftTarget.copy(target);this.leftTarget.x+=.19;}
  }

}
