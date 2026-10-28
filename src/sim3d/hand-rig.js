import * as THREE from 'three';

// ---- Skeleton definition -------------------------------------------------------------------------------------------
// Hand-local space: wrist at the origin, +y along the fingers, +x toward the thumb, +z out of the palm (a right hand).
// Left hands use the mirrored rig (z negated) so no negative scales are ever needed. Indices are MediaPipe's 21 landmarks.
export const REST=[
 [0,0,0],
 [0.026,0.018,0.004],[0.047,0.047,0.01],[0.061,0.075,0.014],[0.07,0.099,0.016],
 [0.036,0.094,0],[0.039,0.137,0],[0.04,0.163,0],[0.04,0.185,0],
 [0.012,0.1,0],[0.013,0.147,0],[0.013,0.176,0],[0.013,0.2,0],
 [-0.012,0.095,0],[-0.013,0.138,0],[-0.013,0.165,0],[-0.013,0.187,0],
 [-0.036,0.088,0],[-0.038,0.121,0],[-0.038,0.142,0],[-0.038,0.16,0]
];
export const FINGER_NAMES=['thumb','index','middle','ring','pinky'];
export const CHAINS={thumb:[1,2,3,4],index:[5,6,7,8],middle:[9,10,11,12],ring:[13,14,15,16],pinky:[17,18,19,20]};
// One bone per phalanx: the joint sits at landmark `a` and points at landmark `b`.
export const BONES=[{name:'wrist',a:0,b:9,parent:-1}];
for(const finger of FINGER_NAMES)CHAINS[finger].slice(0,3).forEach((a,i)=>BONES.push({name:`${finger}${i+1}`,a,b:CHAINS[finger][i+1],parent:i===0?0:BONES.length-1,finger}));
const RADII={thumb:[0.0112,0.0078],index:[0.0098,0.0072],middle:[0.0102,0.0074],ring:[0.0094,0.0068],pinky:[0.0084,0.006]};
const SKIN=new THREE.Color('#d8a486'),SKIN_TIP=new THREE.Color('#d99a82'),NAIL=new THREE.Color('#f1d3c8'),SLEEVE=new THREE.Color('#1c4a52'),CUFF=new THREE.Color('#e9efec');

const v3=new THREE.Vector3(),va=new THREE.Vector3(),vb=new THREE.Vector3(),mat=new THREE.Matrix4(),qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),qc=new THREE.Quaternion();
const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t),clamp01=t=>Math.min(1,Math.max(0,t));
const boneOfJoint=new Map(BONES.map((bone,i)=>[bone.a,i]));

// ---- Geometry ------------------------------------------------------------------------------------------------------
// Rings of vertices around a polyline, skinned across joints with smooth blends so fingers bend without creasing.
function buildGeometry(sign){
 const pos=[],col=[],skinIndex=[],skinWeight=[],index=[];
 const rest=REST.map(([x,y,z])=>new THREE.Vector3(x,y,z*sign));
 const push=(p,color,bones,alpha=1)=>{pos.push(p.x,p.y,p.z);col.push(color.r,color.g,color.b,alpha);const four=[...bones].sort((a,b)=>b[1]-a[1]).slice(0,4);while(four.length<4)four.push([0,0]);const total=four.reduce((s,b)=>s+b[1],0)||1;for(const [bone,weight] of four){skinIndex.push(bone);skinWeight.push(weight/total);}return pos.length/3-1;};
 // Tube through ring centres c[i] with radii (rx across, rz through), orientation fixed to the hand axes (rest pose is straight).
 function tube(rings,colorOf,radial=12,{capStart=false,capEnd=false}={}){
  // Rings must run in the +y direction so the winding below faces outward.
  const base=pos.length/3;
  for(const ring of rings)for(let k=0;k<radial;k++){const t=k/radial*Math.PI*2;va.set(ring.c.x+Math.cos(t)*ring.rx,ring.c.y,ring.c.z+Math.sin(t)*ring.rz*sign);push(va,colorOf(ring,t),ring.w,ring.alpha);}
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<radial;k++){const a=base+i*radial+k,b=base+i*radial+(k+1)%radial,c=a+radial,d=b+radial;if(sign>0)index.push(a,c,b,b,c,d);else index.push(a,b,c,b,d,c);}
  const cap=(ring,first,outward)=>{const m=push(va.set(ring.c.x,ring.c.y,ring.c.z),colorOf(ring,0),ring.w,ring.alpha);for(let k=0;k<radial;k++){const a=base+first+k,b=base+first+(k+1)%radial;const flip=(sign>0)===outward;if(flip)index.push(m,b,a);else index.push(m,a,b);}};
  if(capEnd)cap(rings[rings.length-1],(rings.length-1)*radial,true);
  if(capStart)cap(rings[0],0,false);
 }
 // Fingers
 for(const finger of FINGER_NAMES){
  const chain=CHAINS[finger],joints=chain.map(i=>rest[i]),[rBase,rTip]=RADII[finger],bonesOf=[0,1,2].map(i=>boneOfJoint.get(chain[i]));
  const rings=[],segments=3,steps=[3,3,3];
  // start inside the palm so the first knuckle ring blends from the wrist bone into the proximal phalanx
  const dir0=va.copy(joints[1]).sub(joints[0]).normalize().clone();
  const start=joints[0].clone().addScaledVector(dir0,-0.016);
  rings.push({c:start,rx:rBase*1.08,rz:rBase*0.95,w:[[0,1]],part:'palm',u:0});
  let length=0;const total=joints[0].distanceTo(joints[3]);
  for(let s=0;s<segments;s++)for(let k=0;k<steps[s];k++){
   const t=k/steps[s],c=joints[s].clone().lerp(joints[s+1],t),u=(length+joints[s].distanceTo(c))/total;
   // weights: bone s owns the middle of segment s; blend across each joint over ~40% of the neighbouring segments
   const w=[];const here=s,blendIn=s>0?smooth(clamp01((t)/0.45)):1,blendOut=s<2&&t>0.55?smooth(clamp01((t-0.55)/0.45)):0;
   if(s===0){const fromPalm=smooth(clamp01((u*total+0.016)/(0.016*2.2)));w.push([0,1-fromPalm],[bonesOf[0],fromPalm*(1-blendOut)]);if(blendOut>0)w.push([bonesOf[1],blendOut]);}
   else{const prev=1-blendIn;w.push([bonesOf[here-1],prev*0.5],[bonesOf[here],blendIn*(1-blendOut)+prev*0.5]);if(blendOut>0)w.push([bonesOf[here+1],blendOut]);}
   const knuckle=1+0.1*Math.exp(-((t*6)**2))*(s>0?1:0.6);
   const r=lerp(rBase,rTip,Math.pow(u,0.85))*knuckle;
   rings.push({c:c,rx:r,rz:r*0.88,w,part:'finger',u});
  }
  // rounded fingertip
  const tip=joints[3],dirEnd=va.copy(joints[3]).sub(joints[2]).normalize().clone();
  for(let k=0;k<4;k++){const a=k/3*Math.PI/2,r=rTip*Math.cos(a);rings.push({c:tip.clone().addScaledVector(dirEnd,rTip*Math.sin(a)*0.9),rx:Math.max(r,0.0004),rz:Math.max(r*0.88,0.0004),w:[[bonesOf[2],1]],part:'tip',u:1});}
  tube(rings,(ring,angle)=>{
   const tipness=ring.part==='tip'?1:clamp01((ring.u-0.82)/0.18);const back=Math.sin(angle)*sign<-0.55;
   const base=SKIN.clone().lerp(SKIN_TIP,tipness*0.7);
   // nail on the back of the finger over the last phalanx
   if(back&&ring.u>0.78)return NAIL.clone().lerp(base,0.12);
   return base;
  });
 }
 // Palm: lofted ring sections from wrist to knuckles
 const palmRings=[];
 const sections=[[0,0.031,0.0175],[0.022,0.037,0.0165],[0.05,0.0425,0.0155],[0.078,0.0455,0.0148],[0.097,0.0455,0.0138]];
 for(const [y,rx,rz] of sections)palmRings.push({c:new THREE.Vector3(y>0.05?0.0:0.002,y,0),rx,rz,w:[[0,1]]});
 tube(palmRings,()=>SKIN,16,{capEnd:true});
 // Thenar pad: thumb base bulge so the thumb does not sprout from a flat palm
 {const centre=new THREE.Vector3(0.03,0.04,0.012*sign),rings=[];for(let i=0;i<6;i++){const t=i/5,a=t*Math.PI,r=Math.sin(a)*0.016;rings.push({c:new THREE.Vector3(lerp(0.024,0.04,t),lerp(0.012,0.062,t),0.011*sign),rx:Math.max(r,0.0005),rz:Math.max(r*0.85,0.0005),w:[[0,0.6],[boneOfJoint.get(1),0.4]]});}tube(rings,()=>SKIN,10,{capStart:true,capEnd:true});}
 // Forearm and sleeve: a short cuffed sleeve that fades to nothing, so the hand reads as reaching in from below the frame
 {const rings=[];const spans=[[-0.34,0.04,0.036,0],[-0.27,0.039,0.035,0.28],[-0.2,0.038,0.034,0.62],[-0.14,0.037,0.033,0.9],[-0.09,0.036,0.032,1],[-0.0535,0.0355,0.0315,1],[-0.053,0.0335,0.0285,1],[-0.0265,0.0325,0.0255,1],[-0.026,0.0322,0.025,1],[0,0.031,0.0175,1]];
  for(const [y,rx,rz,alpha] of spans)rings.push({c:new THREE.Vector3(0,y,0),rx,rz,w:[[0,1]],alpha});
  tube(rings,(ring)=>ring.c.y>-0.0262?SKIN:ring.c.y>-0.0532?CUFF:SLEEVE,16,{capStart:true});}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(col,4));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius=0.45;
 return geometry;
}

// ---- Rig + retargeting ---------------------------------------------------------------------------------------------
const restDirRight=BONES.map(bone=>new THREE.Vector3(...REST[bone.b]).sub(new THREE.Vector3(...REST[bone.a])).normalize());
const AXIS_X=new THREE.Vector3(1,0,0),AXIS_Z=new THREE.Vector3(0,0,1);
// Orientation whose +y is `dir` and whose roll keeps +x as close to the hand's across-palm axis as possible.
function basisQuaternion(dir,out){
 va.copy(AXIS_X).addScaledVector(dir,-AXIS_X.dot(dir));
 if(va.lengthSq()<0.05)va.copy(AXIS_Z).addScaledVector(dir,-AXIS_Z.dot(dir));
 va.normalize();vb.crossVectors(va,dir);mat.makeBasis(va,dir,vb);return out.setFromRotationMatrix(mat);
}

export function createHandRig(chirality='right',material){
 const sign=chirality==='left'?-1:1;
 const geometry=buildGeometry(sign);
 // The mirrored rig has mirrored rest directions, so its rest orientations are computed from those.
 const restDir=restDirRight.map(v=>new THREE.Vector3(v.x,v.y,v.z*sign)),restQuat=restDir.map(dir=>basisQuaternion(dir,new THREE.Quaternion()).clone());
 const bones=BONES.map(bone=>{const b=new THREE.Bone();b.name=bone.name;return b;});
 const worldRest=REST.map(([x,y,z])=>new THREE.Vector3(x,y,z*sign));
 BONES.forEach((bone,i)=>{if(bone.parent<0)return;bones[bone.parent].add(bones[i]);bones[i].position.copy(worldRest[bone.a]).sub(worldRest[BONES[bone.parent].a]);});
 const skeleton=new THREE.Skeleton(bones);
 const mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(bones[0]);mesh.updateMatrixWorld(true);mesh.bind(skeleton);mesh.frustumCulled=false;mesh.castShadow=false;
 const root=new THREE.Group();root.add(mesh);
 const world=BONES.map(()=>new THREE.Quaternion()),target=new THREE.Vector3(),local=new THREE.Vector3(),handLength=Math.hypot(REST[9][0],REST[9][1],REST[9][2]);
 return {
  object:root,mesh,chirality,
  // Apply 21 hand-local landmarks (x across, y along the fingers, z out of the palm) given in the RIGHT-hand convention.
  // Left hands pass the same convention; the mirror is handled here so callers never branch on chirality.
  pose(landmarks){
   for(let i=1;i<BONES.length;i++){
    const bone=BONES[i];
    target.set(landmarks[bone.b*3]-landmarks[bone.a*3],landmarks[bone.b*3+1]-landmarks[bone.a*3+1],(landmarks[bone.b*3+2]-landmarks[bone.a*3+2])*sign);
    if(target.lengthSq()<1e-10)continue;target.normalize();
    // world rotation that carries the rest orientation onto the observed direction
    basisQuaternion(target,qa);qb.copy(restQuat[i]).invert();world[i].copy(qa).multiply(qb);
    // local = parentWorld^-1 * world; the wrist bone is the root, so first phalanges are already relative to it
    if(bone.parent>0){qc.copy(world[bone.parent]).invert();bones[i].quaternion.copy(qc).multiply(world[i]);}else bones[i].quaternion.copy(world[i]);
   }
  },
  // Place and scale the whole hand: wrist position, orientation, and a size factor.
  place(position,quaternion,scale=1){root.position.copy(position);root.quaternion.copy(quaternion);root.scale.setScalar(scale);},
  restLength:handLength,bones,
  // World position of a landmark under the current pose (joints are bone origins; tips extend the last phalanx).
  // Used by tests and debugging to compare the rig against the landmarks it was driven from.
  jointPosition(index,out=new THREE.Vector3()){
   root.updateMatrixWorld(true);const owner=BONES.findIndex(bone=>bone.a===index);
   if(owner>=0)return bones[owner].getWorldPosition(out);
   const last=BONES.findIndex(bone=>bone.b===index);bones[last].getWorldPosition(out);
   const length=Math.hypot(REST[index][0]-REST[BONES[last].a][0],REST[index][1]-REST[BONES[last].a][1],REST[index][2]-REST[BONES[last].a][2]);
   bones[last].getWorldQuaternion(qc);root.getWorldScale(va);
   // the bone's own rest orientation is the identity, so its rest direction is the rest-direction vector of that bone
   return out.addScaledVector(v3.copy(restDir[last]).applyQuaternion(qc),length*va.x);
  }
 };
}
export function handMaterial(){return new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,roughness:0.62,metalness:0,envMapIntensity:0.7});}
