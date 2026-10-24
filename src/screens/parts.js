// "The vacuum cleaner": for now, the machine turning slowly and coming apart, with a note that the full
// page (every part, the air flow and hand control) is on its way.
import * as THREE from 'three';
import { SoonScreen } from './soon.js';
import { VacuumModel } from '../scene/vacmodel.js';

export class PartsScreen extends SoonScreen {
  constructor(app) {
    super(app, {
      titleKey: 'subParts', sectionKey: 'navVacuum', noteKey: 'soonParts', icon: 'vacuum',
      build3d: (a) => {
        const group = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.05, 64), new THREE.MeshStandardMaterial({ color: 0x1d3f80, roughness: 0.35, metalness: 0.2 }));
        disc.position.y = -0.025; disc.receiveShadow = true; group.add(disc);
        const vac = new VacuumModel(a.M); vac.root.position.set(0, 0, 0); group.add(vac.root);
        return {
          group, shot: { pos: new THREE.Vector3(1.6, 1.15, 2.0), look: new THREE.Vector3(0, 0.42, 0.2), fov: 38 },
          update: (dt, t) => { vac.root.rotation.y = t * 0.35; vac.setExplode(0.5 - 0.5 * Math.cos(t * 0.6)); vac.update(dt, t); },
        };
      },
    });
  }
}
