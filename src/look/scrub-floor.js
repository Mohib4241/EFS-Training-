// The scrubber's floor pass: it drives forward (brush first) in overlapping lanes, turns at each end, and comes back round
// to the start. Behind it the floor is clean: the brush scrubs the dirt off and leaves it wet, the rear squeegee dries it.

// ---- the path (pure, so it can be tested) ----
// Lanes run along z; the machine faces its direction of travel. Lane spacing is less than the brush width, so passes overlap.
export const LANES=[-1.05,-.35,.35,1.05],LANE_END=.95,TURN=.35;
function buildPath(){
 const pieces=[],line=(a,b)=>pieces.push({kind:'line',a,b}),arc=(c,r,from,to)=>pieces.push({kind:'arc',c,r,from,to});
 LANES.forEach((x,i)=>{
  const up=i%2===0;line([x,up?-LANE_END:LANE_END],[x,up?LANE_END:-LANE_END]);
  if(i<LANES.length-1){const mid=(x+LANES[i+1])/2;arc([mid,up?LANE_END:-LANE_END],TURN,up?Math.PI:Math.PI,up?0:2*Math.PI);}
 });
 // back round to the start: a quarter turn, along the near edge, and a quarter turn into the first lane again
 const last=LANES.at(-1),first=LANES[0],edge=-LANE_END-TURN;
 arc([last-TURN,-LANE_END],TURN,0,-Math.PI/2);line([last-TURN,edge],[first+TURN,edge]);arc([first+TURN,-LANE_END],TURN,-Math.PI/2,-Math.PI);
 // sample every piece into points along the way
 const points=[];
 for(const p of pieces){
  const n=p.kind==='line'?Math.ceil(Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1])/.02):Math.ceil(Math.abs(p.to-p.from)*p.r/.02);
  for(let k=points.length?1:0;k<=n;k++){const t=k/n;points.push(p.kind==='line'?[p.a[0]+(p.b[0]-p.a[0])*t,p.a[1]+(p.b[1]-p.a[1])*t]:[p.c[0]+p.r*Math.cos(p.from+(p.to-p.from)*t),p.c[1]+p.r*Math.sin(p.from+(p.to-p.from)*t)]);}
 }
 const lengths=[0];for(let k=1;k<points.length;k++)lengths.push(lengths[k-1]+Math.hypot(points[k][0]-points[k-1][0],points[k][1]-points[k-1][1]));
 return {points,lengths,total:lengths.at(-1)};
}
export const SCRUB_PATH=buildPath();
// Where the machine is after travelling distance s along the loop: x, z and its heading (yaw about y; facing +z is 0).
export function scrubPose(s,path=SCRUB_PATH){
 const {points,lengths,total}=path,d=((s%total)+total)%total;
 let lo=0,hi=lengths.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(lengths[mid]<=d)lo=mid;else hi=mid;}
 const a=points[lo],b=points[hi],f=(d-lengths[lo])/((lengths[hi]-lengths[lo])||1);
 return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};
}
// The shortest turn from one heading to another, so easing never spins the long way round.
export const turnTo=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from));

// ---- the floor it cleans (needs three.js and a canvas) ----
// A grey floor with dirt on it; the brush rubs the dirt off and leaves a wet sheen, the squeegee wipes the sheen dry.
export function createScrubFloor(THREE,{width=4.6,depth=4.8,pixelsPerMetre=110}={}){
 const W=Math.round(width*pixelsPerMetre),H=Math.round(depth*pixelsPerMetre),toPx=(x,z)=>[(x+width/2)*pixelsPerMetre,(z+depth/2)*pixelsPerMetre];
 const layer=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
 const base=layer(),dirt=layer(),wet=layer(),b=base.getContext('2d'),d=dirt.getContext('2d'),w=wet.getContext('2d');
 // the floor itself: light vinyl tiles
 b.fillStyle='#c9d0cf';b.fillRect(0,0,W,H);const tile=.6*pixelsPerMetre;
 for(let y=0;y<H;y+=tile)for(let x=0;x<W;x+=tile){b.fillStyle=((x+y)/tile)%2?'#d6dcda':'#dde2df';b.fillRect(x+1,y+1,tile-2,tile-2);}
 const texture=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
 const baseTexture=texture(base),dirtTexture=texture(dirt),wetTexture=texture(wet);
 const group=new THREE.Group(),plane=(map,y,order,extra={})=>{const m=new THREE.Mesh(new THREE.CircleGeometry(.5,96),new THREE.MeshStandardMaterial({map,transparent:order>0,roughness:.9,depthWrite:order===0,...extra}));m.scale.set(width,depth,1);m.rotation.x=-Math.PI/2;m.position.y=y;m.renderOrder=order;m.receiveShadow=order===0;group.add(m);return m;};
 plane(baseTexture,.001,0);const dirtPlane=plane(dirtTexture,.002,1,{roughness:1});plane(wetTexture,.003,2,{roughness:.15,metalness:.1});
 // seeded dirt: scuffs, smudges and grit, the same every time
 function soil(){
  d.clearRect(0,0,W,H);let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let n=0;n<90;n++){const [x,y]=[rnd()*W,rnd()*H],r=(.05+rnd()*.17)*pixelsPerMetre;const g=d.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${96+rnd()*30|0},${74+rnd()*20|0},${48+rnd()*16|0},${.22+rnd()*.25})`);g.addColorStop(1,'rgba(96,74,48,0)');d.fillStyle=g;d.beginPath();d.ellipse(x,y,r,r*(.5+rnd()*.5),rnd()*3,0,Math.PI*2);d.fill();}
  for(let n=0;n<1400;n++){d.fillStyle=`rgba(70,52,34,${.35+rnd()*.45})`;d.fillRect(rnd()*W,rnd()*H,1+rnd()*2,1+rnd()*2);}
  // a few footprints of grey traffic dirt along a walkway
  for(let n=0;n<26;n++){d.fillStyle=`rgba(90,90,85,${.12+rnd()*.1})`;d.beginPath();d.ellipse(W*.2+n*W*.024,H*(.3+.4*Math.sin(n*.5)),9,5,.4,0,Math.PI*2);d.fill();}
  w.clearRect(0,0,W,H);dirtTexture.needsUpdate=wetTexture.needsUpdate=true;dirtPlane.material.opacity=1;
 }
 soil();
 // one step of cleaning: the brush disc (centre, radius) scrubs and wets; the squeegee blade (centre, heading, half width) dries
 // Which jobs are on follows the learner's function choices: no brush, no scrubbing; no solution, no wet film; no suction, it stays wet.
 function clean(brush,squeegee,{scrub=true,wetting=true,drying=true}={}){
  const [bx,by]=toPx(brush.x,brush.z),r=brush.r*pixelsPerMetre;
  if(scrub){d.globalCompositeOperation='destination-out';d.beginPath();d.arc(bx,by,r,0,Math.PI*2);d.fill();d.globalCompositeOperation='source-over';dirtTexture.needsUpdate=true;}
  if(wetting){w.fillStyle='rgba(120,190,215,.5)';w.beginPath();w.arc(bx,by,r*.96,0,Math.PI*2);w.fill();}
  if(drying){const [sx,sy]=toPx(squeegee.x,squeegee.z);w.save();w.translate(sx,sy);w.rotate(-squeegee.yaw);w.globalCompositeOperation='destination-out';w.fillRect(-squeegee.half*pixelsPerMetre,-.08*pixelsPerMetre,squeegee.half*2*pixelsPerMetre,.16*pixelsPerMetre);w.restore();}
  wetTexture.needsUpdate=true;
 }
 // a new lap starts on a fresh, dirty floor that fades in
 let fading=1;
 function relay(){soil();dirtPlane.material.opacity=0;fading=0;}
 function step(dt){if(fading<1){fading=Math.min(1,fading+dt/1.5);dirtPlane.material.opacity=fading;}return fading<1;}
 function dispose(){group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});group.removeFromParent();}
 return {group,clean,relay,step,reset:soil,dispose};
}
