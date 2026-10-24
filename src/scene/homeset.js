// The set on the home page: a glossy floor, a round platform with a blue light ring, a curved
// backdrop with the EFS mark and a few soft lights drifting behind. The person stands on the platform.
import * as THREE from 'three';
import { canvasTex, rng } from './tex.js';
import { BRAND } from './character.js';

export const PLATFORM_TOP = 0.09;

export function buildHomeSet() {
  const g = new THREE.Group();
  const set = { group: g, bokeh: null };

  // floor: bright in the middle, fading to the backdrop's blue-grey
  const floorTex = canvasTex(512, 512, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#3a6fd2'); gr.addColorStop(0.35, '#1f4a9c'); gr.addColorStop(1, '#0a1f48');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(160,200,255,0.16)'; c.lineWidth = 2;
    for (const r of [0.2, 0.3, 0.42, 0.56, 0.72, 0.9]) { c.beginPath(); c.arc(w / 2, h / 2, r * w / 2, 0, Math.PI * 2); c.stroke(); }
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(11, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTex, roughness: 0.22, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  // platform
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.5, PLATFORM_TOP, 72), new THREE.MeshStandardMaterial({ color: 0xc9d6ea, roughness: 0.3 }));
  plat.position.y = PLATFORM_TOP / 2; plat.castShadow = true; plat.receiveShadow = true; g.add(plat);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4f9bff).multiplyScalar(1.6), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.47, 0.02, 10, 96), glow); ring.rotation.x = Math.PI / 2; ring.position.y = PLATFORM_TOP; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.007, 8, 96), glow); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.004; g.add(ring2);

  // backdrop
  const wallTex = canvasTex(8, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#07173a'); gr.addColorStop(0.5, '#123a82'); gr.addColorStop(0.85, '#2257b3'); gr.addColorStop(1, '#0f2f6e');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }, { aniso: 1 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, 8, 96, 1, true, Math.PI - 1.25, 2.5), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, side: THREE.DoubleSide }));
  wall.position.y = 3.6; wall.receiveShadow = true; g.add(wall);
  // the EFS mark, large and faint, on the wall
  const logoTex = canvasTex(1024, 384, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = '900 300px "Noto Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(190,215,255,0.10)'; c.fillText('EFS', w / 2, h * 0.5);
    c.fillStyle = 'rgba(190,215,255,0.10)'; c.fillRect(w * 0.2, h * 0.9, w * 0.6, 14);
  }, { aniso: 4 });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false, toneMapped: false }));
  logo.position.set(0, 3.8, -7.0); g.add(logo);
  for (const [y, op] of [[0.5, 0.35], [0.62, 0.2]]) {       // thin blue bands low on the wall
    const band = new THREE.Mesh(new THREE.CylinderGeometry(7.15, 7.15, 0.04, 96, 1, true, Math.PI - 1.25, 2.5), new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: op, side: THREE.DoubleSide }));
    band.position.y = y; g.add(band);
  }

  // soft lights drifting behind
  const dot = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }, { aniso: 1 });
  const N = 46, r = rng(3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos.set([(r() - 0.5) * 14, 0.4 + r() * 6, -3.5 - r() * 3], i * 3);
    const c = new THREE.Color(r() < 0.5 ? 0x4f8fe8 : 0xbfd8ff).multiplyScalar(0.5 + r() * 0.5); col.set([c.r, c.g, c.b], i * 3);
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const bokeh = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.55, map: dot, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
  bokeh.frustumCulled = false; g.add(bokeh); set.bokeh = bokeh; set.ring = ring;
  return set;
}
