// Shared neutral PBR renderer, lighting and camera. Direct rendering avoids postprocessing targets;
// adaptive resolution and shadow quality follow actual frame times (see ../quality.js).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { QualityGovernor, LEVEL_NAMES } from '../quality.js';
import { canvasTex } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Stage {
  constructor(host) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 90);
    this.camera.position.set(-1, 3.6, 7.6);
    this.look = V(0.2, 0.9, -0.4);
    this.fov = 40;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.gov = new QualityGovernor({ mode: window.__noAdapt ? 'high' : 'auto' });
    this.level = this.gov.level;
    this.scale = this.gov.scale;
    this.fps = 0; this._acc = 0; this._frames = 0;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);

    // reflections come from a small studio room
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;
    pm.dispose();

    // a soft grey gradient behind the room
    const bg = canvasTex(8, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#c7d2dc'); gr.addColorStop(0.6, '#dde3e8'); gr.addColorStop(1, '#e9edf0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { aniso: 1 });
    this.scene.background = bg || new THREE.Color(0xdde3e8);
    this.scene.fog = new THREE.Fog(0xdde3e8, 18, 48);

    // lights
    this.hemi = new THREE.HemisphereLight(0xe4edf6, 0x8b8272, 0.42);
    this.key = new THREE.DirectionalLight(0xfff0dc, 1.7);
    this.key.position.set(-4.5, 8.5, 6.5);
    this.key.castShadow = true;
    const sc = this.key.shadow.camera;
    sc.left = -6.5; sc.right = 6.5; sc.top = 5.5; sc.bottom = -5.5; sc.near = 1; sc.far = 24;
    this.key.shadow.bias = -0.00015; this.key.shadow.normalBias = 0.003; this.key.shadow.radius = 3.5;
    this.key.shadow.intensity = .3;
    this.key.target.position.set(0, 0, 0);
    this.fill = new THREE.DirectionalLight(0xbcd2ff, 0.3);
    this.fill.position.set(6, 3.5, 4);
    this.rim = new THREE.DirectionalLight(0x9cc4ff, 0);               // a back light, used by the studio looks
    this.rim.position.set(3, 4, -6);
    this.scene.add(this.hemi, this.key, this.key.target, this.fill, this.rim);
    this._lightBase = { hemi: 0.42, key: 1.7, fill: 0.3, env: 0.32, rim: 0 };
    this._room = { bg: this.scene.background, fog: this.scene.fog.clone() };
    this.viewShift = 0;                                               // moves the picture sideways (a fraction of the width), to make room for text
    this.lightsOn = 1; this._lightsNow = 1;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.observer = new ResizeObserver(this._onResize); this.observer.observe(host);
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); host.setAttribute('aria-label', '3D graphics interrupted. Written guidance remains available.'); window.__app?.screen?.pause?.(); window.__app?.shell.notice('3D graphics interrupted. Written guidance remains available; reload to retry.', 12000); });
    this.setLevel(this.level);
    this.resize();
  }

  setLevel(l) {
    this.level = l;
    const sh = this.key.shadow;
    r_disposeShadow(sh);
    this.key.castShadow = l > 0;
    sh.mapSize.set(l === 2 ? 2048 : 1024, l === 2 ? 2048 : 1024);
    this.renderer.shadowMap.enabled = l > 0;
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  /** Cycle Auto, High, Medium, Low (the G key). */
  cycleQuality() {
    const mode = this.gov.cycle();
    this.level = this.gov.level; this.scale = this.gov.scale;
    this.setLevel(this.level); this.resize();
    return this.gov.label;
  }

  resize() {
    const w = this.host.clientWidth || 800, h = this.host.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, this.level === 2 ? 1.5 : 1) * this.scale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    if (this.viewShift) this.camera.setViewOffset(w, h, -w * this.viewShift, 0, w, h); else this.camera.clearViewOffset();
    // a tall (phone) screen needs a wider field to keep the room in view
    this.camera.fov = this.fov * (this.camera.aspect < 0.9 ? 1.0 + (0.9 - this.camera.aspect) * 0.9 : 1);
    this.camera.updateProjectionMatrix();
  }

  /** 1 = lights on, 0 = lights off (the room goes dim). */
  setLights(v) { this.lightsOn = v; }

  /**
   * The look of the whole picture: background, fog, the lights and the exposure. A screen picks one when
   * it opens. `shadow` is how far the key light's shadow reaches, in metres: a small value keeps the
   * shadow sharp for a close subject.
   */
  setLook(look = {}) {
    const L = { bg: null, fog: null, hemi: 0.42, key: 1.7, fill: 0.3, rim: 0, env: 0.32, exposure: 0.92, bloom: 0.2, shadow: [6.5, 5.5], keyPos: [-4.5, 8.5, 6.5], keyTarget: [0, 0, 0], keyColor: 0xfff0dc, rimColor: 0x9cc4ff, shift: 0, ...look };
    this.scene.background = L.bg || this._room.bg;
    this.scene.fog = L.fog === 'none' ? null : (L.fog || this._room.fog.clone());
    this._lightBase = { hemi: L.hemi, key: L.key, fill: L.fill, env: L.env, rim: L.rim };
    this.renderer.toneMappingExposure = L.exposure;
    this.key.color.setHex(0xffffff); this.rim.color.setHex(0xffffff);
    this.fill.color.setHex(0xe9edf0); this.hemi.color.setHex(0xe9edf0); this.hemi.groundColor.setHex(0x9a9d9f);
    this.key.position.set(...L.keyPos); this.key.target.position.set(...L.keyTarget);
    this._shadowSetup = { position: V(...L.keyPos), target: V(...L.keyTarget), extents: L.shadow.slice() };
    const sc = this.key.shadow.camera; sc.left = -L.shadow[0]; sc.right = L.shadow[0]; sc.top = L.shadow[1]; sc.bottom = -L.shadow[1]; sc.updateProjectionMatrix();
    if (this.viewShift !== L.shift) { this.viewShift = L.shift; this.resize(); }
    this.lightsOn = 1; this._lightsNow = 1;
  }

  /** Move the camera towards a shot { pos, look, fov } with a soft ease; `snap` jumps there. */
  shot(s, dt, snap = false) {
    snap ||= !!this.reducedMotion?.matches;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.6);
    this.camera.position.lerp(s.pos, k);
    this.look.lerp(s.look, snap ? 1 : 1 - Math.exp(-dt * 3.2));
    this.fov += ((s.fov || 40) - this.fov) * (snap ? 1 : 1 - Math.exp(-dt * 2));
    this.camera.lookAt(this.look);
    if (this._shadowSetup) {
      // Concentrate the shadow map on the working hands or face during a close shot. Keeping the
      // light's direction fixed avoids a lighting jump while giving millimetre-scale contact detail.
      const base = this._shadowSetup, reach = this.camera.position.distanceTo(this.look) * .7;
      const sx = Math.min(base.extents[0], Math.max(.65, reach)), sy = Math.min(base.extents[1], Math.max(.65, reach));
      this.key.target.position.copy(this.look);
      this.key.position.copy(base.position).sub(base.target).add(this.look);
      const shadowCamera = this.key.shadow.camera;
      if (Math.abs(shadowCamera.right - sx) > .01 || Math.abs(shadowCamera.top - sy) > .01) {
        shadowCamera.left = -sx; shadowCamera.right = sx; shadowCamera.top = sy; shadowCamera.bottom = -sy; shadowCamera.updateProjectionMatrix();
      }
    }
    const f = this.fov * (this.camera.aspect < 0.9 ? 1.0 + (0.9 - this.camera.aspect) * 0.9 : 1);
    if (Math.abs(this.camera.fov - f) > 0.01) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
  }

  render(dtReal) {
    // the lights fade rather than jump
    this._lightsNow += (this.lightsOn - this._lightsNow) * (1 - Math.exp(-dtReal * 3));
    const L = 0.12 + 0.88 * this._lightsNow, b = this._lightBase;
    this.hemi.intensity = b.hemi * L; this.key.intensity = b.key * L; this.fill.intensity = b.fill * L; this.rim.intensity = b.rim * L;
    this.scene.environmentIntensity = b.env * (0.25 + 0.75 * this._lightsNow);

    // frame rate, and the quality that follows from it
    // Ignore suspension gaps, matching the quality governor; retain real slow-frame times.
    if (dtReal > 0 && dtReal <= 1) { this._acc += dtReal; this._frames++; }
    if (this._acc >= 0.5) { this.fps = this._frames / this._acc; this._acc = 0; this._frames = 0; }
    const lvl = this.gov.update(dtReal);
    if (lvl !== null) { this.level = lvl; this.setLevel(lvl); }
    if (this.gov.scale !== this.scale) { this.scale = this.gov.scale; this.resize(); }
    // Resizing clears the drawing buffer: apply quality changes before drawing this frame.
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize); this.observer.disconnect();
    r_disposeShadow(this.key.shadow); this.scene.environment?.dispose(); this._room.bg?.dispose?.(); this.renderer.dispose(); this.renderer.domElement.remove();
  }

  get qualityLabel() { return `${this.gov.label}${this.scale < 1 ? ` · ${Math.round(this.scale * 100)}%` : ''}`; }
}

function r_disposeShadow(sh) { if (sh.map) { sh.map.dispose(); sh.map = null; } }

export { LEVEL_NAMES };
