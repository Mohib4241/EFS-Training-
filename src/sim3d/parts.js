// World position of a part's grip anchor when the part sits at pose {p: origin, r: [pitch, yaw, roll], s: scale}.
// Same Euler order ('ZYX': pitch, then yaw, then roll) as the scene, so tests and the renderer agree.
export function anchorPoint(anchor,pose,out=[0,0,0]){
 const [ax,ay,az]=anchor,[rx,ry,rz]=pose.r,s=pose.s??1;
 let x=ax,y=ay,z=az;
 let c=Math.cos(rx),sn=Math.sin(rx),y1=y*c-z*sn,z1=y*sn+z*c;y=y1;z=z1;
 c=Math.cos(ry);sn=Math.sin(ry);const x2=x*c+z*sn,z2=-x*sn+z*c;x=x2;z=z2;
 c=Math.cos(rz);sn=Math.sin(rz);const x3=x*c-y*sn,y3=x*sn+y*c;x=x3;y=y3;
 out[0]=pose.p[0]+x*s;out[1]=pose.p[1]+y*s;out[2]=pose.p[2]+z*s;return out;
}
// A place table entry.
export const pose=(p,r=[0,0,0],s=1)=>({p,r,s});
