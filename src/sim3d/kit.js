import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small helpers every procedural model uses. Geometry and materials are handed to the lifecycle so teardown frees them.
export const lathe=(points,segments=56)=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),segments);
export const at=(x,y,z,rx=0,ry=0,rz=0,s=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'ZYX')),typeof s==='number'?new THREE.Vector3(s,s,s):new THREE.Vector3(...s));
// Merge parts that share a material into one geometry (one draw call). Each entry is [geometry, matrix-or-undefined].
// Primitives differ in whether they are indexed, so everything is normalised to non-indexed position/normal/uv first.
export function merge(entries){
 const list=entries.map(([geometry,matrix])=>{const c=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();for(const name of Object.keys(c.attributes))if(!['position','normal','uv'].includes(name))c.deleteAttribute(name);if(!c.attributes.uv)c.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(c.attributes.position.count*2),2));if(matrix)c.applyMatrix4(matrix);return c;});
 const merged=mergeGeometries(list);for(const g of list)g.dispose();return merged;
}
export function createKit(life,scene){
 const own=resource=>life.own(resource);
 const std=(color,roughness=0.5,metalness=0,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness,metalness,...extra}));
 const mesh=(geometry,material,parent=scene)=>{own(geometry);const m=new THREE.Mesh(geometry,material);parent.add(m);return m;};
 const group=(parent=scene)=>{const g=new THREE.Group();parent.add(g);return g;};
 const canvasTexture=(width,height,draw,{srgb=true,repeat=false}={})=>{
  const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);
  const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return own(t);
 };
 return {own,std,mesh,group,canvasTexture,merge,at,lathe,scene};
}
