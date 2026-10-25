import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { VacuumModel } from './vacmodel.js';
import { canvasTex } from './tex.js';
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const mat = (color, metalness=0, roughness=.62) => new THREE.MeshStandardMaterial({color,metalness,roughness});

export class LabModel {
  constructor(kind, materials) {
    this.kind=kind; this.root=new THREE.Group(); this.parts={}; this.explode=0; this.explodeTarget=0; this.flowOn=false; this.actions=new Set(); this.time=0;
    this.colors={dark:mat(0x252b33,.15), black:mat(0x101820), yellow:mat(0xf1c72e,.12), teal:mat(0x2ab8ad,.3), white:mat(0xe5eaf0,.1), silver:mat(0x8d9fab,.82,.25), copper:mat(0xb7773f,.8), blue:mat(0x418bf1,.25), red:mat(0xef5c4d)};
    if(kind==='vacuum') this._vacuum(materials); else if(kind==='drill') this._drill(); else if(kind==='mcb') this._mcb(); else this._hvac();
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.85,.04,64),mat(0xb5babd,0,.9)); floor.position.y=-.04; floor.receiveShadow=true;this.root.add(floor);
    this.flowGroup=new THREE.Group();this.root.add(this.flowGroup);this.particles=[];
    for(let i=0;i<28;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),new THREE.MeshBasicMaterial({color:i%2?0x76e9df:0xb3e2ff}));this.flowGroup.add(p);this.particles.push(p);}
    this.flowGroup.visible=false;
  }
  part(id, off=[0,0,0]) {const g=new THREE.Group();g.name=id;this.root.add(g);this.parts[id]={group:g,off:V(...off),base:V(),meshes:[]};return g;}
  mesh(parent,geo,material,x=0,y=0,z=0) {const m=new THREE.Mesh(geo,material.clone());m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);m.userData.part=parent.name;this.parts[parent.name]?.meshes.push(m);return m;}
  box(p,w,h,d,m,x=0,y=0,z=0,r=.035){return this.mesh(p,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),m,x,y,z);}
  cyl(p,ra,rb,h,m,x=0,y=0,z=0){return this.mesh(p,new THREE.CylinderGeometry(ra,rb,h,48),m,x,y,z);}
  label(parent,text,w,h,x,y,z,bg='#16202b',fg='#f5f7fa') {
    const tex=canvasTex(512,160,(ctx,cw,ch)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);ctx.fillStyle=fg;ctx.font='bold 45px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cw/2,ch/2);});
    return this.mesh(parent,new THREE.PlaneGeometry(w,h),tex?new THREE.MeshStandardMaterial({map:tex,roughness:.8}):this.colors.white,x,y,z);
  }
  _vacuum(M){
    const v=this.vacuum=new VacuumModel({...M,vacRed:this.colors.yellow,vacLid:this.colors.dark});v.root.scale.setScalar(2.2);v.root.position.set(-.05,0,-.3);this.root.add(v.root);
    this.parts=v.parts;
    // Brand inspiration is explicitly labelled in the UI; no model number or exact-machine claim.
    for(const p of Object.values(this.parts))p.base=p.group.position.clone();
    this.center=V(0,.85,.4);this.camera=V(3.4,2.65,4.5);
  }
  _drill(){
    const C=this.colors;
    let p=this.part('body',[0,.28,.0]);
    this.box(p,1.15,.48,.48,C.teal,-.06,1.13,0,.13);
    this.box(p,.4,.47,.49,C.dark,-.53,1.13,0,.09);
    this.box(p,.25,.73,.34,C.teal,-.15,.62,0,.08).rotation.z=.13;
    this.box(p,.19,.49,.35,C.dark,-.11,.62,.01,.06).rotation.z=.13;
    for(let i=0;i<6;i++)this.box(p,.04,.24,.012,C.black,-.59+i*.045,1.15,.25,.003);
    this.label(p,'EFS  •  DRILL',.54,.13,-.1,1.16,.247);
    this.cyl(p,.023,.023,.025,C.white,.24,.88,.19).rotation.x=Math.PI/2;
    p=this.part('chuck',[.44,.28,0]);const c=this.cyl(p,.19,.23,.32,C.dark,.65,1.13,0);c.rotation.z=Math.PI/2;
    this.cyl(p,.13,.16,.14,C.silver,.85,1.13,0).rotation.z=Math.PI/2;
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;this.box(p,.25,.018,.018,C.black,.66,1.13+Math.sin(a)*.195,Math.cos(a)*.195,.003);}
    p=this.part('bit',[.8,.28,0]);this.cyl(p,.028,.028,.65,C.silver,1.23,1.13,0).rotation.z=Math.PI/2;
    const pts=[];for(let i=0;i<=90;i++){let x=i/90;pts.push(V(1.0+x*.55,1.13+Math.cos(x*Math.PI*11)*.031,Math.sin(x*Math.PI*11)*.031));}
    this.mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),90,.012,6),C.dark);
    this.mesh(p,new THREE.ConeGeometry(.033,.12,24),C.silver,1.6,1.13,0).rotation.z=-Math.PI/2;
    for(const child of p.children)child.position.y-=1.13;p.position.y=1.13;this.parts.bit.base.y=1.13;
    p=this.part('battery',[-.5,-.16,.12]);this.box(p,.68,.24,.54,C.dark,-.2,.2,0,.06);this.box(p,.64,.07,.5,C.teal,-.2,.33,0,.025);this.label(p,'BATTERY · DEMO',.48,.1,-.2,.22,.276);
    for(let i=0;i<3;i++)this.box(p,.055,.025,.01,C.teal,-.32+i*.08,.115,.274,.003);
    p=this.part('trigger',[0,.1,.55]);this.box(p,.13,.15,.17,C.black,.08,.84,.02,.025);this.box(p,.14,.045,.5,C.red,-.02,.97,0,.015);
    p=this.part('workpiece',[.5,0,.3]);this.box(p,.1,1.6,1.0,mat(0xb7a27e),1.85,.84,0,.01);
    this.hole=this.cyl(p,.04,.04,.006,C.black,1.795,1.13,0);this.hole.rotation.z=Math.PI/2;this.hole.visible=false;
    // Explorer anatomy is enlarged; demonstrations bring the equipment to operator scale.
    this.toolRoot=new THREE.Group();this.root.add(this.toolRoot);
    for(const part of Object.values(this.parts))this.toolRoot.add(part.group);
    const support=this.drillSupport=new THREE.Group();this.root.add(support);support.visible=false;
    const top=new THREE.Mesh(new RoundedBoxGeometry(.65,.06,.85,2,.02),C.dark);top.position.set(1.03,.54,0);support.add(top);
    for(const z of [-.3,.3]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.52,.06),C.silver);leg.position.set(1.03,.26,z);support.add(leg);}
    this.center=V(.25,.85,0);this.camera=V(3.25,2.1,4.4);
  }
  _mcb(){
    const C=this.colors;
    let p=this.part('rail',[0,0,-.5]);this.box(p,2.25,.24,.13,C.silver,0,.63,-.34,.015);this.box(p,2.25,.045,.19,C.silver,0,.76,-.32,.005);this.box(p,2.25,.045,.19,C.silver,0,.5,-.32,.005);
    p=this.part('case',[-.65,.2,.2]);this.box(p,.78,1.5,.62,C.white,0,.85,0,.045);this.box(p,.8,.85,.13,C.white,0,.93,.365,.025);this.box(p,.68,.4,.1,C.dark,0,1.04,.45,.02);
    this.label(p,'MCB  •  DEMO',.59,.17,0,1.42,.321,'#e5eaf0','#273344');
    this.label(p,'TEACHING MODEL',.66,.12,0,.43,.44,'#e5eaf0','#637888');
    this.label(p,'OFF ≠ ISOLATED',.7,.12,0,.18,.325,'#f3c334','#20262b');
    for(let i=0;i<5;i++)this.box(p,.015,.4,.01,C.silver,-.3+i*.15,.62,.438,.002);
    p=this.part('toggle',[0,.18,.65]);this.toggle=this.box(p,.48,.18,.22,C.dark,0,1.03,.53,.025);this.label(p,'O / I',.3,.08,0,1.05,.65);
    p=this.part('terminals',[0,.48,0]);for(const y of [.23,1.5]){this.box(p,.45,.2,.28,C.silver,0,y,-.01,.02);const screw=this.cyl(p,.09,.09,.025,C.dark,0,y,.15);screw.rotation.x=Math.PI/2;this.box(p,.12,.018,.012,C.silver,0,y,.169,.002);}
    p=this.part('trip',[.55,.05,.25]);this.box(p,.07,.65,.08,C.copper,.12,.9,.1,.01);this.cyl(p,.15,.15,.36,C.copper,-.15,.82,.05);
    for(let i=0;i<9;i++)this.mesh(p,new THREE.TorusGeometry(.155,.018,8,28),C.copper,-.15,.65+i*.04,.05).rotation.x=Math.PI/2;
    this.box(p,.32,.045,.08,C.silver,0,1.18,.05,.008).rotation.z=-.3;
    p=this.part('lock',[.7,-.04,.8]);this.box(p,.24,.28,.12,C.red,.43,.63,.61,.025);this.mesh(p,new THREE.TorusGeometry(.084,.018,12,32,Math.PI),C.silver,.43,.82,.61);this.label(p,'LOCK',.2,.06,.43,.65,.676,'#ef5c4d');p.visible=false;
    this.center=V(0,.9,0);this.camera=V(2.9,2.0,4.1);
  }
  _hvac(){
    const C=this.colors;this.rotors=[];
    for(const [id,z]of [['lead',-.68],['lag',.68]]){
      const p=this.part(id,[0,.7,z*.65]);
      this.box(p,2.4,.12,.85,C.dark,0,.14,z,.025);
      const shell=this.cyl(p,.3,.3,2.1,C.white,0,.55,z);shell.rotation.z=Math.PI/2;
      for(const x of [-1.08,1.08]){this.cyl(p,.32,.32,.06,C.silver,x,.55,z).rotation.z=Math.PI/2;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.cyl(p,.022,.022,.04,C.dark,x+(x<0?-.04:.04),.55+Math.sin(a)*.27,z+Math.cos(a)*.27).rotation.z=Math.PI/2;}}
      for(const x of [-.75,.75])this.box(p,.16,.3,.6,C.dark,x,.25,z,.02);
      this.label(p,id==='lead'?'CH-01  •  LEAD':'CH-02  •  LAG',.8,.13,0,.58,z+.307,'#dce6ea','#354b59');
      for(const x of [-.35,.35]){this.box(p,.55,.55,.6,C.teal,x,1.05,z,.06);const fan=this.mesh(p,new THREE.TorusGeometry(.18,.024,8,32),C.dark,x,1.34,z);fan.rotation.x=Math.PI/2;const rotor=new THREE.Group();rotor.position.set(x,1.35,z);p.add(rotor);for(let k=0;k<4;k++){const blade=this.box(rotor,.29,.025,.065,C.silver,0,0,0,.012);blade.rotation.y=k*Math.PI/4;}this.rotors.push({rotor,id});}
    }
    const pipe=(p,points,color,r=.055)=>this.mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>V(...v))),40,r,12,false),color);
    let p=this.part('supply',[-.35,.12,.25]);pipe(p,[[1.1,.55,-.68],[1.4,.55,-.68],[1.4,.55,.68],[1.4,.55,1.3],[-1.5,.55,1.3]],C.blue);
    p=this.part('return',[.35,.18,-.25]);pipe(p,[[-1.1,.65,-.68],[-1.45,.65,-.68],[-1.45,.65,.68],[-1.45,.65,-1.35],[1.5,.65,-1.35]],C.red);
    for(const z of [-.68,.68]){pipe(this.parts.supply.group,[[1.08,.55,z],[1.4,.55,z]],C.blue);pipe(p,[[-1.08,.65,z],[-1.45,.65,z]],C.red);}
    p=this.part('pumps',[-.3,.15,.6]);
    for(const x of [-.6,.5]){this.box(p,.45,.08,.46,C.dark,x,.08,1.3,.02);this.cyl(p,.16,.16,.3,C.teal,x,.32,1.3);this.cyl(p,.14,.14,.25,C.blue,x,.55,1.3).rotation.z=Math.PI/2;}
    p=this.part('compressor',[0,.75,0]);for(const z of [-.68,.68]){this.cyl(p,.17,.17,.5,C.dark,.75,1.03,z);pipe(p,[[.75,1.3,z],[.95,1.25,z],[.95,.75,z]],C.copper,.026);}
    p=this.part('panel',[.6,.15,.4]);this.box(p,.48,.7,.18,C.white,1.65,1.12,.1,.035);this.box(p,.34,.24,.025,C.dark,1.65,1.25,.205,.01);this.label(p,'PLANT',.28,.07,1.65,1.28,.22);this.label(p,'AUTO / BMS',.34,.07,1.65,.9,.205,'#dfe7ec','#4c606f');
    this.led=this.cyl(p,.035,.035,.02,C.teal,1.65,1.04,.22);this.led.rotation.x=Math.PI/2;
    this.demand=40;this.center=V(0,.65,0);this.camera=V(4.5,3.5,5.5);
  }
  plantState(){
    const a=this.actions,flow=a.has('pumps')&&!a.has('finish')&&(!a.has('fault')||a.has('restore'));
    const lead=flow&&a.has('run'),lag=lead&&a.has('stage-lag')&&this.demand>60;
    return {flow,lead,lag,alarm:a.has('fault')&&!a.has('restore'),demand:this.demand,stages:Number(lead)+Number(lag)};
  }
  setHologram(on){
    this.root.traverse(o=>{if(!o.isMesh||!o.material?.color)return;const m=o.material;if(!m.userData.original)m.userData.original={color:m.color.clone(),wireframe:m.wireframe,transparent:m.transparent,opacity:m.opacity};const base=m.userData.original;if(on){m.color.setHex(0x526779);m.wireframe=true;m.transparent=false;m.opacity=1;}else{m.color.copy(base.color);m.wireframe=base.wireframe;m.transparent=base.transparent;m.opacity=base.opacity;}});
  }
  setDemonstration(on){
    if(!this.toolRoot)return;
    this.toolRoot.scale.setScalar(on?.45:1);this.toolRoot.position.set(on?.2:0,on?.55:0,0);
    this.drillSupport.visible=on;this.root.updateMatrixWorld(true);
  }
  setActions(actions){this.actions=new Set(actions);}
  setFocus(id){this.focus=id;for(const [key,p]of Object.entries(this.parts))for(const m of p.meshes||[])if(m.material.color){m.userData.selectionBase ||= m.material.color.clone();m.material.color.copy(m.userData.selectionBase);if(key===id)m.material.color.lerp(new THREE.Color(0x7694a6),.28);}if(this.vacuum)this.vacuum.setFocus(id);}
  anchor(id){const p=this.parts[id];if(!p)return this.center.clone();const b=new THREE.Box3().setFromObject(p.group);return b.getCenter(new THREE.Vector3());}
  update(dt,t){
    this.time=t;this.explode+=(this.explodeTarget-this.explode)*(1-Math.exp(-dt*5));const e=this.explode,A=this.actions;
    const opened=A.has('open')&&!A.has('close'),running=A.has('run')&&!A.has('finish');
    if(this.vacuum){const v=this.vacuum;v.setExplode(e);if(opened&&e<.1){v.parts.lid.group.position.y=.42;v.parts.switch.group.position.y=.42;v.parts.bag.group.position.y=A.has('bag')?.35:.08;}v.setOn(running);v.update(dt,t);}
    else {
      for(const [id,p] of Object.entries(this.parts))if(p.off){
        const target=p.base.clone().addScaledVector(p.off,e);
        if(this.kind==='drill'){
          if(id!=='workpiece'&&running)target.x+=.17;
          if(id==='battery'&&((A.has('isolate')&&!A.has('close'))||A.has('finish')))target.y-=.26;
        }
        
        p.group.position.lerp(target,1-Math.exp(-dt*5));
      }
      if(this.kind==='drill'){
        this.parts.bit.group.rotation.x=running?t*12:0;
        this.hole.visible=A.has('run')||A.has('drilled');
      }
      if(this.kind==='mcb'){
        this.parts.lock.group.visible=A.has('isolate')||e>.1;
        this.toggle.rotation.x=A.has('isolate')?.35:-.35;
        for(const m of this.parts.case.meshes){m.material.transparent=e>.05||opened;m.material.opacity=e>.05||opened?.22:1;m.material.depthWrite=!m.material.transparent;}
      }
      if(this.kind==='hvac'){
        const state=this.plantState();
        for(const {rotor,id}of this.rotors)if(state[id])rotor.rotation.y+=dt*8;
        this.led.material.color.setHex(state.alarm?0xef5c4d:state.lead?0x75eac0:0x46545a);
      }
    }
    this.flowGroup.visible=this.flowOn||(this.kind==='hvac'?this.plantState().flow:running&&this.kind==='vacuum');
    for(let i=0;i<this.particles.length;i++){
      let k=(t*.23+i/this.particles.length)%1,p=this.particles[i];
      if(this.kind==='hvac'){const supply=i%2===0;p.position.set(supply?1.4-k*2.9:-1.45+k*2.9,supply?.55:.65,supply?1.3:-1.35);p.material.color.setHex(supply?0x7cbcff:0xff9e8d);}
      else if(this.kind==='vacuum'){const pts=this.vacuum.airPath().pts,at=k*(pts.length-1),lo=Math.floor(at);p.position.copy(pts[lo]).lerp(pts[Math.min(lo+1,pts.length-1)],at-lo);this.root.worldToLocal(p.position);}
      else p.position.set(-1+k*2,.6,0);
      p.scale.setScalar(.5+Math.sin(k*Math.PI)*.7);
    }
  }
}
