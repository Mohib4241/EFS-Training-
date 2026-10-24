// "Chiller Training": for now a note that the HVAC overview is on its way, over a simple chiller shape.
import * as THREE from 'three';
import { SoonScreen } from './soon.js';

export class ChillerScreen extends SoonScreen {
  constructor(app) {
    super(app, {
      titleKey: 'subHvac', sectionKey: 'navChiller', noteKey: 'soonHvac', icon: 'snow',
      build3d: (a) => {
        const group = new THREE.Group(), M = a.M;
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.05, 64), new THREE.MeshStandardMaterial({ color: 0x1d3f80, roughness: 0.4 }));
        floor.position.y = -0.025; floor.receiveShadow = true; group.add(floor);
        const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; group.add(m); return m; };
        const shell = new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.45, metalness: 0.3 });
        box(2.2, 0.12, 0.9, M.steel, 0, 0.06, 0);                                     // the frame
        for (const z of [-0.22, 0.22]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 32), shell); c.rotation.z = Math.PI / 2; c.position.set(0, 0.35, z); c.castShadow = true; group.add(c); }
        box(0.5, 0.45, 0.4, new THREE.MeshStandardMaterial({ color: 0x2e6fd0, roughness: 0.4 }), -0.4, 0.82, 0);   // the compressor
        box(0.45, 0.55, 0.12, new THREE.MeshStandardMaterial({ color: 0x8a96a3, roughness: 0.4 }), 0.75, 0.82, 0.3); // the control panel
        const pipe = (mat, z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 20), mat); p.position.set(1.15, 0.9, z); p.castShadow = true; group.add(p); };
        pipe(new THREE.MeshStandardMaterial({ color: 0x2f8cff, roughness: 0.4 }), -0.22); pipe(new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.4 }), 0.22);
        return { group, shot: { pos: new THREE.Vector3(2.4, 1.7, 3.0), look: new THREE.Vector3(0.1, 0.5, 0), fov: 40 }, update: (dt, t) => { group.rotation.y = Math.sin(t * 0.2) * 0.35; } };
      },
    });
  }
}
