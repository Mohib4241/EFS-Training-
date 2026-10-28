import * as THREE from 'three';

// Procedural ceramic tile textures (colour, roughness and bump) drawn once on small canvases.
// Seeded so the pattern is identical on every load; nothing is downloaded.
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const hex=(r,g,b)=>`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

// layout: 'grid' = square tiles, 'brick' = offset subway tiles. Returns { map, roughnessMap, bumpMap, metersPerTexture }.
export function createTileTextures({layout='grid',tileMeters=0.3,size=1024,anisotropy=4,life}){
 const make=()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
 const colour=make(),rough=make(),bump=make(),cc=colour.getContext('2d'),rc=rough.getContext('2d'),bc=bump.getContext('2d');
 const random=rng(layout==='grid'?7:19),grout=Math.max(5,size/140);
 // texture covers `across` tiles horizontally and `down` vertically so it repeats seamlessly
 const across=layout==='grid'?2:2,down=layout==='grid'?2:4,tw=size/across,th=size/down;
 cc.fillStyle='#c5cfca';cc.fillRect(0,0,size,size);rc.fillStyle='#e6e6e6';rc.fillRect(0,0,size,size);bc.fillStyle='#000';bc.fillRect(0,0,size,size);
 for(let row=0;row<down;row++)for(let col=-1;col<across+1;col++){
  const offset=layout==='brick'&&row%2?tw/2:0,x=col*tw+offset,y=row*th,shade=(random()-0.5)*7;
  const x0=x+grout/2,y0=y+grout/2,w=tw-grout,h=th-grout,r=Math.min(w,h)*0.035;
  // glazed face: soft vertical gradient plus a faint diagonal sheen so each tile catches light differently
  const g=cc.createLinearGradient(x0,y0,x0+w*0.4,y0+h);g.addColorStop(0,hex(243+shade,246+shade,243+shade));g.addColorStop(1,hex(231+shade,236+shade,233+shade));
  for(const [ctx,fill] of [[cc,g],[rc,'#555'],[bc,'#fff']]){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x0,y0,w,h,r);ctx.fill();}
  // tiny speckle so large tiles do not look like flat colour
  for(let i=0;i<60;i++){cc.fillStyle=`rgba(${random()<0.5?'150,160,155':'255,255,255'},${0.05+random()*0.08})`;cc.fillRect(x0+random()*w,y0+random()*h,1+random()*2,1+random()*2);}
  // bevelled edge highlight
  cc.strokeStyle='rgba(255,255,255,0.55)';cc.lineWidth=2;cc.beginPath();cc.moveTo(x0+r,y0+1);cc.lineTo(x0+w-r,y0+1);cc.stroke();
  cc.strokeStyle='rgba(120,135,130,0.22)';cc.beginPath();cc.moveTo(x0+r,y0+h-1);cc.lineTo(x0+w-r,y0+h-1);cc.stroke();
 }
 // grout: slightly darker where it meets the tile, with dirt specks
 for(let i=0;i<400;i++){cc.fillStyle=`rgba(120,130,125,${0.04+random()*0.08})`;cc.fillRect(random()*size,random()*size,1+random()*2,1+random()*2);}
 const textures={map:new THREE.CanvasTexture(colour),roughnessMap:new THREE.CanvasTexture(rough),bumpMap:new THREE.CanvasTexture(bump)};
 for(const [name,texture] of Object.entries(textures)){
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.colorSpace=name==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;life?.own(texture);
 }
 return {...textures,metersPerTexture:[across*tileMeters,down*tileMeters*th/tw]};
}
// Soft round contact shadow used under every object (no shadow maps).
export function createBlobTexture(life){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,2,64,64,62);
 g.addColorStop(0,'rgba(0,0,0,0.62)');g.addColorStop(0.45,'rgba(0,0,0,0.34)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);life?.own(t);return t;
}
// Paper for the dust bags: cream fibres, fold lines, a printed label, and grime that gathers toward the bottom of a used bag.
export function createPaperTexture({label,used,life}){
 const w=512,h=768,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),random=rng(used?31:57);
 const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,used?'#e3d4ad':'#f7f1de');g.addColorStop(1,used?'#a98f63':'#ece3c6');x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<2600;i++){x.strokeStyle=`rgba(${used?'110,86,50':'170,150,110'},${0.05+random()*0.1})`;x.lineWidth=1;const px=random()*w,py=random()*h,len=4+random()*14,a=random()*Math.PI;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len);x.stroke();}
 if(used){const d=x.createLinearGradient(0,h*0.35,0,h);d.addColorStop(0,'rgba(80,58,32,0)');d.addColorStop(1,'rgba(80,58,32,0.55)');x.fillStyle=d;x.fillRect(0,0,w,h);for(let i=0;i<70;i++){x.fillStyle=`rgba(70,50,30,${0.05+random()*0.12})`;x.beginPath();x.arc(random()*w,h*0.45+random()*h*0.55,2+random()*7,0,7);x.fill();}}
 x.strokeStyle='rgba(120,100,70,0.35)';x.lineWidth=3;for(const fx of [0.18,0.82]){x.beginPath();x.moveTo(w*fx,0);x.lineTo(w*fx,h);x.stroke();}
 x.fillStyle=used?'#5b4630':'#47705f';x.font='bold 44px Arial';x.textAlign='center';x.fillText(label,w/2,h*0.84);x.fillRect(w*0.3,h*0.87,w*0.4,5);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;life?.own(t);return t;
}
// The band is about 12x wider than tall, so the canvas has the same proportions to keep letters undistorted.
export function createLabelTexture({text,life}){
 const w=2048,h=170,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 x.fillStyle='#e7efe9';x.fillRect(0,0,w,h);x.fillStyle='#2f6f66';x.font='bold 92px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+4);
 x.fillStyle='#2f6f66';x.fillRect(0,0,w,10);x.fillRect(0,h-10,w,10);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;life?.own(t);return t;
}
