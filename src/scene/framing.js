import {Vector3, MathUtils} from 'three';

/** Fit every bounding-box corner into a perspective camera, preserving the chosen viewing direction. */
export function frameBounds(camera, bounds, direction, padding = 1.08) {
  const center=bounds.getCenter(new Vector3()),forward=direction.clone().normalize();
  const right=new Vector3().crossVectors(camera.up,forward).normalize(),up=new Vector3().crossVectors(forward,right);
  const tanY=Math.tan(MathUtils.degToRad(camera.fov)*.5),tanX=tanY*camera.aspect;
  let distance=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new Vector3(x,y,z).sub(center),depth=p.dot(forward);
    distance=Math.max(distance,Math.abs(p.dot(right))*padding/tanX+depth,Math.abs(p.dot(up))*padding/tanY+depth);
  }
  camera.position.copy(center).addScaledVector(forward,distance);camera.lookAt(center);camera.updateMatrixWorld();
  return center;
}
